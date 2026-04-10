# PoC Management: Commercial Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend PoC Management to cover both Employee Benefits and Commercial Insurance in a unified view, with dashboard-matching color coding (Benefits = orange/`warning`, Commercial = blue/`info`).

**Architecture:** Add two new Flask endpoints that mirror the existing benefits PoC endpoints but operate on `CommercialInsurance.assigned_to`. Update `PocManagement.js` to fetch both summaries in parallel, merge by PoC name, render a two-column count table, and submit reassignments to the correct endpoint(s) based on record source. No unified endpoint — the frontend composes.

**Tech Stack:** Flask + SQLAlchemy (backend), React + MUI + axios (frontend), pytest (backend tests), Jest + React Testing Library (frontend tests).

**Reference spec:** `docs/superpowers/specs/2026-04-08-poc-management-commercial-design.md`

---

## File Structure

- **Modify:** `services/api/customer_api.py` — add two new endpoints after line 4636 (right after `reassign_poc`).
- **Modify:** `services/tests/test_customer_api.py` — add tests for the two new endpoints.
- **Modify:** `webapp/customer-app/src/components/PocManagement.js` — rewrite summary loading, table, dialog, and submit.

---

## Task 1: Backend — commercial PoC summary endpoint

**Files:**
- Modify: `services/api/customer_api.py` (add new route after line 4636)
- Test: `services/tests/test_customer_api.py`

- [ ] **Step 1: Write the failing test**

Add to `services/tests/test_customer_api.py`:

```python
def test_commercial_poc_summary_empty(test_client):
    """Empty commercial table returns empty pocs list and zero unassigned."""
    res = test_client.get('/api/commercial/poc-summary')
    assert res.status_code == 200
    data = res.get_json()
    assert data['pocs'] == []
    assert data['unassigned_count'] == 0


def test_commercial_poc_summary_with_data(test_client):
    """Summary groups by assigned_to and counts rows; blank/null assigned_to rolls up into unassigned_count."""
    # Seed a client + 4 commercial rows: 2 Jane, 1 John, 1 unassigned
    from api.customer_api import Session, Client, CommercialInsurance
    session = Session()
    try:
        c = Client(tax_id='11-1111111', client_name='Acme')
        session.add(c)
        session.flush()
        session.add_all([
            CommercialInsurance(tax_id='11-1111111', assigned_to='Jane Doe'),
            CommercialInsurance(tax_id='11-1111111', assigned_to='Jane Doe'),
            CommercialInsurance(tax_id='11-1111111', assigned_to='John Smith'),
            CommercialInsurance(tax_id='11-1111111', assigned_to=None),
        ])
        session.commit()
    finally:
        session.close()

    res = test_client.get('/api/commercial/poc-summary')
    assert res.status_code == 200
    data = res.get_json()
    pocs = {p['poc']: p['count'] for p in data['pocs']}
    assert pocs == {'Jane Doe': 2, 'John Smith': 1}
    assert data['unassigned_count'] == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd services && pytest tests/test_customer_api.py::test_commercial_poc_summary_empty tests/test_customer_api.py::test_commercial_poc_summary_with_data -v`
Expected: FAIL (404 — route does not exist).

- [ ] **Step 3: Add the endpoint**

Insert in `services/api/customer_api.py` immediately after the existing `reassign_poc` function (after line 4636):

```python
@app.route('/api/commercial/poc-summary', methods=['GET'])
def get_commercial_poc_summary():
    """Get unique commercial assigned_to values with their record counts."""
    session = Session()
    try:
        results = (
            session.query(
                CommercialInsurance.assigned_to,
                func.count(CommercialInsurance.id).label('count')
            )
            .filter(
                CommercialInsurance.assigned_to.isnot(None),
                CommercialInsurance.assigned_to != ''
            )
            .group_by(CommercialInsurance.assigned_to)
            .order_by(CommercialInsurance.assigned_to)
            .all()
        )

        unassigned_count = (
            session.query(func.count(CommercialInsurance.id))
            .filter(
                or_(
                    CommercialInsurance.assigned_to.is_(None),
                    CommercialInsurance.assigned_to == ''
                )
            )
            .scalar()
        )

        poc_list = [{'poc': r[0], 'count': r[1]} for r in results]

        return jsonify({
            'pocs': poc_list,
            'unassigned_count': unassigned_count
        }), 200
    except Exception as e:
        logging.error(f"Error fetching commercial PoC summary: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd services && pytest tests/test_customer_api.py::test_commercial_poc_summary_empty tests/test_customer_api.py::test_commercial_poc_summary_with_data -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/api/customer_api.py services/tests/test_customer_api.py
git commit -m "Add /api/commercial/poc-summary endpoint"
```

---

## Task 2: Backend — commercial PoC reassign endpoint

**Files:**
- Modify: `services/api/customer_api.py` (add new route after Task 1's addition)
- Test: `services/tests/test_customer_api.py`

- [ ] **Step 1: Write the failing tests**

Add to `services/tests/test_customer_api.py`:

```python
def _seed_commercial(n_jane=2, n_john=1):
    from api.customer_api import Session, Client, CommercialInsurance
    session = Session()
    try:
        session.add(Client(tax_id='11-1111111', client_name='Acme'))
        session.flush()
        ids = {'jane': [], 'john': []}
        for _ in range(n_jane):
            row = CommercialInsurance(tax_id='11-1111111', assigned_to='Jane Doe')
            session.add(row); session.flush()
            ids['jane'].append(row.id)
        for _ in range(n_john):
            row = CommercialInsurance(tax_id='11-1111111', assigned_to='John Smith')
            session.add(row); session.flush()
            ids['john'].append(row.id)
        session.commit()
        return ids
    finally:
        session.close()


def test_commercial_poc_reassign_by_from_poc(test_client):
    """Reassign all rows matching from_poc to to_poc."""
    _seed_commercial(n_jane=2, n_john=1)
    res = test_client.put('/api/commercial/poc-reassign', json={
        'from_poc': 'Jane Doe', 'to_poc': 'Jane D.'
    })
    assert res.status_code == 200
    assert res.get_json()['updated_count'] == 2

    summary = test_client.get('/api/commercial/poc-summary').get_json()
    pocs = {p['poc']: p['count'] for p in summary['pocs']}
    assert pocs == {'Jane D.': 2, 'John Smith': 1}


def test_commercial_poc_reassign_by_record_ids(test_client):
    """Reassign specific row IDs only."""
    ids = _seed_commercial(n_jane=2, n_john=0)
    res = test_client.put('/api/commercial/poc-reassign', json={
        'record_ids': [ids['jane'][0]], 'to_poc': 'Alice'
    })
    assert res.status_code == 200
    assert res.get_json()['updated_count'] == 1

    summary = test_client.get('/api/commercial/poc-summary').get_json()
    pocs = {p['poc']: p['count'] for p in summary['pocs']}
    assert pocs == {'Jane Doe': 1, 'Alice': 1}


def test_commercial_poc_reassign_missing_to_poc(test_client):
    res = test_client.put('/api/commercial/poc-reassign', json={'from_poc': 'Jane Doe'})
    assert res.status_code == 400
    assert 'to_poc' in res.get_json()['error']


def test_commercial_poc_reassign_same_source_target(test_client):
    _seed_commercial(n_jane=1, n_john=0)
    res = test_client.put('/api/commercial/poc-reassign', json={
        'from_poc': 'Jane Doe', 'to_poc': 'Jane Doe'
    })
    assert res.status_code == 400


def test_commercial_poc_reassign_requires_from_or_ids(test_client):
    res = test_client.put('/api/commercial/poc-reassign', json={'to_poc': 'X'})
    assert res.status_code == 400
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd services && pytest tests/test_customer_api.py -k "commercial_poc_reassign" -v`
Expected: FAIL (404).

- [ ] **Step 3: Add the endpoint**

Insert in `services/api/customer_api.py` immediately after `get_commercial_poc_summary` (the function added in Task 1):

```python
@app.route('/api/commercial/poc-reassign', methods=['PUT'])
def reassign_commercial_poc():
    """Bulk reassign CommercialInsurance.assigned_to. Supports full or partial reassignment via record_ids."""
    session = Session()
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        to_poc = data.get('to_poc')
        record_ids = data.get('record_ids')
        from_poc = data.get('from_poc')

        if not to_poc:
            return jsonify({'error': 'to_poc is required'}), 400

        if record_ids:
            query = session.query(CommercialInsurance).filter(
                CommercialInsurance.id.in_(record_ids)
            )
        elif from_poc:
            if from_poc == to_poc:
                return jsonify({'error': 'Source and target PoC cannot be the same'}), 400
            query = session.query(CommercialInsurance).filter(
                CommercialInsurance.assigned_to == from_poc
            )
        else:
            return jsonify({'error': 'Either from_poc or record_ids is required'}), 400

        updated_count = query.update(
            {CommercialInsurance.assigned_to: to_poc},
            synchronize_session=False,
        )
        session.commit()

        return jsonify({
            'message': f'Successfully reassigned {updated_count} record(s) to "{to_poc}"',
            'updated_count': updated_count
        }), 200
    except Exception as e:
        session.rollback()
        logging.error(f"Error reassigning commercial PoC: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd services && pytest tests/test_customer_api.py -k "commercial_poc" -v`
Expected: All PASS (including the summary tests from Task 1).

- [ ] **Step 5: Commit**

```bash
git add services/api/customer_api.py services/tests/test_customer_api.py
git commit -m "Add /api/commercial/poc-reassign endpoint"
```

---

## Task 3: Frontend — merge both summaries into the main table

**Files:**
- Modify: `webapp/customer-app/src/components/PocManagement.js`

- [ ] **Step 1: Replace summary state and fetcher**

In `PocManagement.js`, replace the state declarations (lines 13–23) and `fetchPocSummary` function (lines 25–37) with:

```js
const [pocList, setPocList] = useState([]); // [{poc, benefitsCount, commercialCount}]
const [unassignedBenefits, setUnassignedBenefits] = useState(0);
const [unassignedCommercial, setUnassignedCommercial] = useState(0);
const [loading, setLoading] = useState(true);
const [selectedItem, setSelectedItem] = useState(null);
const [targetPoc, setTargetPoc] = useState('');
const [reassigning, setReassigning] = useState(false);
const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
// Records for partial reassignment, split by source
const [benefitRecords, setBenefitRecords] = useState([]);
const [commercialRecords, setCommercialRecords] = useState([]);
const [selectedBenefitIds, setSelectedBenefitIds] = useState(new Set());
const [selectedCommercialIds, setSelectedCommercialIds] = useState(new Set());
const [loadingRecords, setLoadingRecords] = useState(false);

const fetchPocSummary = async () => {
  try {
    setLoading(true);
    const [benefitsRes, commercialRes] = await Promise.all([
      axios.get('/api/benefits/poc-summary'),
      axios.get('/api/commercial/poc-summary'),
    ]);

    const merged = new Map();
    (benefitsRes.data.pocs || []).forEach(({ poc, count }) => {
      merged.set(poc, { poc, benefitsCount: count, commercialCount: 0 });
    });
    (commercialRes.data.pocs || []).forEach(({ poc, count }) => {
      const existing = merged.get(poc);
      if (existing) existing.commercialCount = count;
      else merged.set(poc, { poc, benefitsCount: 0, commercialCount: count });
    });
    const list = Array.from(merged.values()).sort((a, b) => a.poc.localeCompare(b.poc));

    setPocList(list);
    setUnassignedBenefits(benefitsRes.data.unassigned_count || 0);
    setUnassignedCommercial(commercialRes.data.unassigned_count || 0);
  } catch (err) {
    console.error('Error fetching PoC summary:', err);
    setSnackbar({ open: true, message: 'Failed to load PoC summary', severity: 'error' });
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 2: Update the header copy and unassigned alert**

Replace the header `<Typography variant="body2" ...>` (line 125–127) with:

```jsx
<Typography variant="body2" color="text.secondary">
  View and bulk-reassign Assigned Tos across Employee Benefits and Commercial records
</Typography>
```

Replace the unassigned alert block (lines 130–134) with:

```jsx
{(unassignedBenefits > 0 || unassignedCommercial > 0) && (
  <Alert severity="info" sx={{ mb: 2 }}>
    {[
      unassignedBenefits > 0
        ? `${unassignedBenefits} benefit record${unassignedBenefits !== 1 ? 's' : ''}`
        : null,
      unassignedCommercial > 0
        ? `${unassignedCommercial} commercial record${unassignedCommercial !== 1 ? 's' : ''}`
        : null,
    ]
      .filter(Boolean)
      .join(' and ')}{' '}
    {(unassignedBenefits + unassignedCommercial) !== 1 ? 'have' : 'has'} no Assigned To assigned.
  </Alert>
)}
```

- [ ] **Step 3: Update the main table head and body**

Replace the `<TableHead>` and `<TableBody>` blocks (lines 145–171) with:

```jsx
<TableHead>
  <TableRow>
    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Assigned To</TableCell>
    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', width: 120 }}>Benefits</TableCell>
    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', width: 120 }}>Commercial</TableCell>
    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', width: 140 }}>Action</TableCell>
  </TableRow>
</TableHead>
<TableBody>
  {pocList.map((item) => (
    <TableRow key={item.poc} hover>
      <TableCell>{item.poc}</TableCell>
      <TableCell>
        {item.benefitsCount > 0 ? (
          <Chip label={item.benefitsCount} size="small" color="warning" variant="outlined" />
        ) : '—'}
      </TableCell>
      <TableCell>
        {item.commercialCount > 0 ? (
          <Chip label={item.commercialCount} size="small" color="info" variant="outlined" />
        ) : '—'}
      </TableCell>
      <TableCell>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SwapHorizIcon />}
          onClick={() => openReassignDialog(item)}
        >
          Reassign
        </Button>
      </TableCell>
    </TableRow>
  ))}
</TableBody>
```

- [ ] **Step 4: Start the dev server and verify visually**

Run: `cd webapp/customer-app && npm start`
Navigate to the PoC Management tab. Expected:
- Table shows one row per unique PoC name across both types.
- Benefits column shows orange outlined chips, Commercial column shows blue outlined chips.
- Dash (`—`) appears where a PoC has no records of that type.
- Unassigned alert reflects both counts (or is hidden if both are 0).

- [ ] **Step 5: Commit**

```bash
git add webapp/customer-app/src/components/PocManagement.js
git commit -m "PocManagement: merge benefits + commercial in main table"
```

---

## Task 4: Frontend — two-section reassign dialog

**Files:**
- Modify: `webapp/customer-app/src/components/PocManagement.js`

- [ ] **Step 1: Replace openReassignDialog, closeReassignDialog, and selection helpers**

Replace the functions at lines 43–87 with:

```js
const openReassignDialog = async (item) => {
  setSelectedItem(item);
  setTargetPoc('');
  setSelectedBenefitIds(new Set());
  setSelectedCommercialIds(new Set());
  setLoadingRecords(true);
  try {
    const [benefitsRes, commercialRes] = await Promise.all([
      item.benefitsCount > 0 ? axios.get('/api/benefits') : Promise.resolve({ data: { benefits: [] } }),
      item.commercialCount > 0 ? axios.get('/api/commercial') : Promise.resolve({ data: { commercial: [] } }),
    ]);
    const bRecs = (benefitsRes.data.benefits || []).filter(b => b.enrollment_poc === item.poc);
    const cRecs = (commercialRes.data.commercial || []).filter(c => c.assigned_to === item.poc);
    setBenefitRecords(bRecs);
    setCommercialRecords(cRecs);
    setSelectedBenefitIds(new Set(bRecs.map(r => r.id)));
    setSelectedCommercialIds(new Set(cRecs.map(r => r.id)));
  } catch (err) {
    console.error('Error fetching records:', err);
    setBenefitRecords([]);
    setCommercialRecords([]);
  } finally {
    setLoadingRecords(false);
  }
};

const closeReassignDialog = () => {
  setSelectedItem(null);
  setTargetPoc('');
  setBenefitRecords([]);
  setCommercialRecords([]);
  setSelectedBenefitIds(new Set());
  setSelectedCommercialIds(new Set());
};

const toggleBenefit = (id) => {
  setSelectedBenefitIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
};

const toggleCommercial = (id) => {
  setSelectedCommercialIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
};

const totalRecords = benefitRecords.length + commercialRecords.length;
const totalSelected = selectedBenefitIds.size + selectedCommercialIds.size;

const toggleAll = () => {
  if (totalSelected === totalRecords) {
    setSelectedBenefitIds(new Set());
    setSelectedCommercialIds(new Set());
  } else {
    setSelectedBenefitIds(new Set(benefitRecords.map(r => r.id)));
    setSelectedCommercialIds(new Set(commercialRecords.map(r => r.id)));
  }
};
```

Note: `totalRecords` and `totalSelected` are re-derived on every render by the declarations above inside the component body — move them to just above the `return` statement if the linter complains about them being redeclared (they are not hooks, so ordering is flexible).

- [ ] **Step 2: Replace the records table inside the dialog**

Replace the `<TableContainer>` block at lines 188–228 (the records table inside the Dialog) with:

```jsx
<TableContainer sx={{ maxHeight: 300, mb: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
  <Table stickyHeader size="small">
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox" sx={{ backgroundColor: '#f5f5f5' }}>
          <Checkbox
            checked={totalSelected === totalRecords && totalRecords > 0}
            indeterminate={totalSelected > 0 && totalSelected < totalRecords}
            onChange={toggleAll}
            size="small"
          />
        </TableCell>
        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Client Name</TableCell>
        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Status</TableCell>
        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Renewal Date</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {benefitRecords.length > 0 && (
        <>
          <TableRow>
            <TableCell colSpan={4} sx={{ backgroundColor: 'warning.light', fontWeight: 'bold', color: 'warning.contrastText' }}>
              Employee Benefits ({benefitRecords.length})
            </TableCell>
          </TableRow>
          {benefitRecords.map((record) => (
            <TableRow
              key={`b-${record.id}`}
              hover
              onClick={() => toggleBenefit(record.id)}
              sx={{ cursor: 'pointer' }}
              selected={selectedBenefitIds.has(record.id)}
            >
              <TableCell padding="checkbox">
                <Checkbox checked={selectedBenefitIds.has(record.id)} size="small" />
              </TableCell>
              <TableCell>{record.client_name || record.tax_id}</TableCell>
              <TableCell>
                {record.status ? (
                  <Chip label={record.status} size="small" color={record.status === 'Active' ? 'success' : 'warning'} />
                ) : '—'}
              </TableCell>
              <TableCell>{formatDate(record.renewal_date)}</TableCell>
            </TableRow>
          ))}
        </>
      )}
      {commercialRecords.length > 0 && (
        <>
          <TableRow>
            <TableCell colSpan={4} sx={{ backgroundColor: 'info.light', fontWeight: 'bold', color: 'info.contrastText' }}>
              Commercial ({commercialRecords.length})
            </TableCell>
          </TableRow>
          {commercialRecords.map((record) => (
            <TableRow
              key={`c-${record.id}`}
              hover
              onClick={() => toggleCommercial(record.id)}
              sx={{ cursor: 'pointer' }}
              selected={selectedCommercialIds.has(record.id)}
            >
              <TableCell padding="checkbox">
                <Checkbox checked={selectedCommercialIds.has(record.id)} size="small" />
              </TableCell>
              <TableCell>{record.client_name || record.tax_id}</TableCell>
              <TableCell>
                {record.status ? (
                  <Chip label={record.status} size="small" color={record.status === 'Active' ? 'success' : 'warning'} />
                ) : '—'}
              </TableCell>
              <TableCell>—</TableCell>
            </TableRow>
          ))}
        </>
      )}
    </TableBody>
  </Table>
</TableContainer>
```

- [ ] **Step 3: Update the selection counter line**

Replace the `<Typography>` at lines 231–233 with:

```jsx
<Typography variant="body2" sx={{ mb: 1 }}>
  <strong>{totalSelected}</strong> of {totalRecords} record{totalRecords !== 1 ? 's' : ''} selected
</Typography>
```

- [ ] **Step 4: Verify visually**

Reload the dev server. Click Reassign on a PoC that has both Benefits and Commercial records. Expected:
- Two colored section headers appear inside the dialog: orange "Employee Benefits (N)" and blue "Commercial (N)".
- Records grouped under their headers; empty sections hidden.
- All records selected by default; global select-all toggles everything.
- Row-click toggles individual rows.

- [ ] **Step 5: Commit**

```bash
git add webapp/customer-app/src/components/PocManagement.js
git commit -m "PocManagement: two-section reassign dialog"
```

---

## Task 5: Frontend — dispatch reassignment to correct endpoints

**Files:**
- Modify: `webapp/customer-app/src/components/PocManagement.js`

- [ ] **Step 1: Replace handleReassign**

Replace the `handleReassign` function (lines 89–109) with:

```js
const handleReassign = async () => {
  if (!selectedItem || !targetPoc.trim() || totalSelected === 0) return;

  setReassigning(true);
  try {
    const to_poc = targetPoc.trim();
    const calls = [];
    if (selectedBenefitIds.size > 0) {
      calls.push(axios.put('/api/benefits/poc-reassign', {
        record_ids: Array.from(selectedBenefitIds),
        to_poc,
      }).then(r => ({ type: 'benefits', count: r.data.updated_count })));
    }
    if (selectedCommercialIds.size > 0) {
      calls.push(axios.put('/api/commercial/poc-reassign', {
        record_ids: Array.from(selectedCommercialIds),
        to_poc,
      }).then(r => ({ type: 'commercial', count: r.data.updated_count })));
    }
    const results = await Promise.all(calls);

    const parts = results.map(r =>
      `${r.count} ${r.type === 'benefits' ? 'benefit' : 'commercial'} record${r.count !== 1 ? 's' : ''}`
    );
    setSnackbar({
      open: true,
      message: `Reassigned ${parts.join(' and ')} to "${to_poc}".`,
      severity: 'success',
    });
    closeReassignDialog();
    fetchPocSummary();
  } catch (err) {
    const msg = err.response?.data?.error || 'Failed to reassign PoC';
    setSnackbar({ open: true, message: msg, severity: 'error' });
  } finally {
    setReassigning(false);
  }
};
```

- [ ] **Step 2: Update the target PoC autocomplete options and submit button disabled state**

Replace the `<Autocomplete>` (lines 235–243) with:

```jsx
<Autocomplete
  freeSolo
  options={pocList.map(p => p.poc).filter(p => p !== selectedItem?.poc)}
  inputValue={targetPoc}
  onInputChange={(e, newValue) => setTargetPoc(newValue)}
  renderInput={(params) => (
    <TextField {...params} label="Target PoC" size="small" fullWidth />
  )}
/>
```

(No change to options since `pocList` is already the merged union — this step is just confirming the existing line still works.)

Replace the submit button's disabled prop and label (lines 247–254) with:

```jsx
<Button
  onClick={handleReassign}
  variant="contained"
  color="primary"
  disabled={!targetPoc.trim() || totalSelected === 0 || reassigning}
>
  {reassigning ? 'Reassigning...' : `Reassign ${totalSelected} Record${totalSelected !== 1 ? 's' : ''}`}
</Button>
```

- [ ] **Step 3: End-to-end manual verification**

With the dev server running:
1. Pick a PoC that has both benefits and commercial records. Reassign all → confirm success snackbar reads "Reassigned N benefit records and M commercial records to 'X'." and the summary refreshes.
2. Pick a PoC that has only benefits. Reassign → confirm only the benefits endpoint fires (check network tab); snackbar omits the commercial half.
3. Pick a PoC that has only commercial. Reassign → confirm only the commercial endpoint fires.
4. Deselect everything → Reassign button disabled.
5. Refresh browser → reassigned counts persisted.

- [ ] **Step 4: Commit**

```bash
git add webapp/customer-app/src/components/PocManagement.js
git commit -m "PocManagement: dispatch reassign to benefits + commercial endpoints"
```

---

## Task 6: Full regression run

- [ ] **Step 1: Run the full backend test suite**

Run: `cd services && pytest tests/ -v`
Expected: all tests pass (existing + 7 new commercial PoC tests).

- [ ] **Step 2: Run the frontend build**

Run: `cd webapp/customer-app && npm run build`
Expected: build succeeds with no new warnings from `PocManagement.js`.

- [ ] **Step 3: Run existing frontend tests**

Run: `cd webapp/customer-app && npm test -- --watchAll=false`
Expected: all existing tests still pass.

- [ ] **Step 4: Final commit (only if any lint/format fixes were needed)**

```bash
git add -A
git status  # verify nothing unintended
git commit -m "Lint/format fixes for PoC management" # only if needed
```

---

## Spec coverage checklist (self-review)

- ✅ `GET /api/commercial/poc-summary` — Task 1
- ✅ `PUT /api/commercial/poc-reassign` (both `from_poc` and `record_ids` paths, validation) — Task 2
- ✅ Parallel fetch + merge-by-name — Task 3
- ✅ Header copy updated — Task 3
- ✅ Two-column count table, warning/info chips — Task 3
- ✅ Unassigned alert covers both types — Task 3
- ✅ Dialog fetches benefits + commercial in parallel, filters by PoC — Task 4
- ✅ Grouped sub-sections with colored headers, section-hides-when-empty — Task 4
- ✅ Global select-all — Task 4
- ✅ Autocomplete options = merged list — Task 5
- ✅ Split dispatch to two endpoints via `record_ids` — Task 5
- ✅ Aggregated success message — Task 5
- ✅ Backend tests covering empty, populated, both reassign paths, validation errors — Tasks 1 & 2
- ✅ Frontend manual verification plan — Tasks 3, 4, 5
