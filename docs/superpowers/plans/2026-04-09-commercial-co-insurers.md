# Commercial Coverage Co-Insurers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow each commercial coverage type **except workers compensation** to record a comma-separated list of co-insurer client names, editable in `CommercialModal` and rendered on the generated invoice PDF.

**Architecture:** Add 12 `*_co_insurers` TEXT columns to `commercial_insurance` (one per single-plan non-WC coverage) and 1 `co_insurers` TEXT column to `commercial_plans` (used per plan row by the four multi-plan coverages: umbrella, professional E&O, cyber, crime). Surface as a multi-select Autocomplete in CommercialModal driven by the existing `clients` prop. Propagate through `_collect_line_items` and render as a plain sub-line in `generate_invoice_pdf`.

**Tech Stack:** Flask + SQLAlchemy + sqlite3 (backend), ReportLab (PDF), React + MUI (frontend), pytest.

**Reference spec:** `docs/superpowers/specs/2026-04-09-commercial-co-insurers-design.md`

**Coverage prefixes:**
- **Single-plan, non-WC** (12, get a column on `commercial_insurance`): `general_liability`, `property`, `bop`, `auto`, `epli`, `nydbl`, `surety`, `product_liability`, `flood`, `directors_officers`, `fiduciary`, `inland_marine`
- **Multi-plan** (4, share the `co_insurers` column on `commercial_plans`): `umbrella`, `professional_eo`, `cyber`, `crime`
- **Excluded:** `workers_comp`

---

## File Structure

- **Create:** `services/db/migrate_co_insurers.py` — idempotent SQLite migration.
- **Modify:** `services/api/customer_api.py` — model columns, `to_dict`s, POST/PUT handlers, `save_commercial_plans`.
- **Modify:** `services/api/invoice.py` — propagate and render co-insurers.
- **Modify:** `services/tests/test_customer_api.py` — backend round-trip tests.
- **Create:** `services/tests/test_invoice.py` — line item propagation tests (new file; no existing invoice tests).
- **Modify:** `webapp/customer-app/src/components/CommercialModal.js` — default state, single-plan loop UI, multi-plan plan card UI.

---

## Task 1: Database migration

**Files:**
- Create: `services/db/migrate_co_insurers.py`

- [ ] **Step 1: Create the migration script**

Create `services/db/migrate_co_insurers.py`:

```python
"""
Migration: Add co-insurer columns to commercial coverage tables.

Adds:
- commercial_insurance.{prefix}_co_insurers TEXT for 12 single-plan non-WC types
- commercial_plans.co_insurers TEXT (used per plan row by multi-plan coverages)

Stores comma-separated client names. NULL/empty = no co-insurers.

Run: python migrate_co_insurers.py
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'customer.db')


def table_exists(cursor, table):
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None


def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


SINGLE_PLAN_NON_WC_PREFIXES = [
    'general_liability', 'property', 'bop', 'auto',
    'epli', 'nydbl', 'surety', 'product_liability', 'flood',
    'directors_officers', 'fiduciary', 'inland_marine',
]


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    if table_exists(cursor, 'commercial_insurance'):
        for prefix in SINGLE_PLAN_NON_WC_PREFIXES:
            col = f'{prefix}_co_insurers'
            if not column_exists(cursor, 'commercial_insurance', col):
                cursor.execute(f"ALTER TABLE commercial_insurance ADD COLUMN {col} TEXT")
                print(f"Added {col} to commercial_insurance")
    else:
        print("Skipping commercial_insurance (table does not exist yet — will be created by API)")

    if table_exists(cursor, 'commercial_plans'):
        if not column_exists(cursor, 'commercial_plans', 'co_insurers'):
            cursor.execute("ALTER TABLE commercial_plans ADD COLUMN co_insurers TEXT")
            print("Added co_insurers to commercial_plans")
    else:
        print("Skipping commercial_plans (table does not exist yet — will be created by API)")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == '__main__':
    migrate()
```

- [ ] **Step 2: Run the migration against the dev database**

Run: `cd services/db && python migrate_co_insurers.py`
Expected output: 13 "Added ... to ..." lines (12 commercial_insurance columns + 1 commercial_plans column), then `Migration complete.`

- [ ] **Step 3: Verify columns exist**

Run: `cd services && python -c "import sqlite3; c = sqlite3.connect('customer.db').cursor(); c.execute('PRAGMA table_info(commercial_insurance)'); print([r[1] for r in c.fetchall() if 'co_insurers' in r[1]])"`
Expected: prints a list of 12 `*_co_insurers` column names.

Run: `cd services && python -c "import sqlite3; c = sqlite3.connect('customer.db').cursor(); c.execute('PRAGMA table_info(commercial_plans)'); print([r[1] for r in c.fetchall() if r[1] == 'co_insurers'])"`
Expected: `['co_insurers']`

- [ ] **Step 4: Confirm idempotency**

Run: `cd services/db && python migrate_co_insurers.py`
Expected: only `Migration complete.` (no "Added ..." lines because all columns already exist).

- [ ] **Step 5: Commit**

```bash
git add services/db/migrate_co_insurers.py
git commit -m "Add migration for commercial co-insurer columns"
```

---

## Task 2: Backend model + serialization

**Files:**
- Modify: `services/api/customer_api.py`

- [ ] **Step 1: Add columns to `CommercialInsurance` model**

In `services/api/customer_api.py`, locate `class CommercialInsurance(db.Model)` (around line 496). Find the existing block of `*_remarks` columns (around lines 692–704) and immediately after the last `inland_marine_remarks = db.Column(db.Text)` line, insert:

```python
    # Co-insurers (comma-separated client names) for non-WC single-plan coverages
    general_liability_co_insurers = db.Column(db.Text)
    property_co_insurers = db.Column(db.Text)
    bop_co_insurers = db.Column(db.Text)
    auto_co_insurers = db.Column(db.Text)
    epli_co_insurers = db.Column(db.Text)
    nydbl_co_insurers = db.Column(db.Text)
    surety_co_insurers = db.Column(db.Text)
    product_liability_co_insurers = db.Column(db.Text)
    flood_co_insurers = db.Column(db.Text)
    directors_officers_co_insurers = db.Column(db.Text)
    fiduciary_co_insurers = db.Column(db.Text)
    inland_marine_co_insurers = db.Column(db.Text)
```

- [ ] **Step 2: Add column to `CommercialPlan` model**

Locate `class CommercialPlan(db.Model)` (around line 936). After the `outstanding_item_due_date = db.Column(db.Date)` line (around line 953), insert:

```python
    co_insurers = db.Column(db.Text)
```

- [ ] **Step 3: Update `CommercialPlan.to_dict`**

In `CommercialPlan.to_dict` (around line 964), add `'co_insurers': self.co_insurers,` to the returned dict (place it just after `'outstanding_item_due_date'`):

```python
            'outstanding_item_due_date': self.outstanding_item_due_date.isoformat() if self.outstanding_item_due_date else None,
            'co_insurers': self.co_insurers,
```

- [ ] **Step 4: Update `CommercialInsurance.to_dict`**

Locate `CommercialInsurance.to_dict`. Find where the per-coverage `_remarks` fields are emitted. For each of the 12 single-plan non-WC prefixes, add a sibling line emitting `*_co_insurers`. Use this exact list (place each line adjacent to the matching `_remarks`):

```python
            'general_liability_co_insurers': self.general_liability_co_insurers,
            'property_co_insurers': self.property_co_insurers,
            'bop_co_insurers': self.bop_co_insurers,
            'auto_co_insurers': self.auto_co_insurers,
            'epli_co_insurers': self.epli_co_insurers,
            'nydbl_co_insurers': self.nydbl_co_insurers,
            'surety_co_insurers': self.surety_co_insurers,
            'product_liability_co_insurers': self.product_liability_co_insurers,
            'flood_co_insurers': self.flood_co_insurers,
            'directors_officers_co_insurers': self.directors_officers_co_insurers,
            'fiduciary_co_insurers': self.fiduciary_co_insurers,
            'inland_marine_co_insurers': self.inland_marine_co_insurers,
```

If `to_dict` is built via a loop over a prefix list (look for the existing `_remarks` pattern), extend that loop instead — keep the codebase's existing pattern. Otherwise add the explicit lines above.

- [ ] **Step 5: Quick smoke test**

Run: `cd services && python -c "from api.customer_api import CommercialInsurance, CommercialPlan; print(hasattr(CommercialInsurance, 'general_liability_co_insurers'), hasattr(CommercialPlan, 'co_insurers'))"`
Expected: `True True`

- [ ] **Step 6: Commit**

```bash
git add services/api/customer_api.py
git commit -m "Add co_insurers columns to commercial models"
```

---

## Task 3: Backend POST/PUT/save_commercial_plans wiring

**Files:**
- Modify: `services/api/customer_api.py`

- [ ] **Step 1: Wire single-plan co_insurers into `create_commercial`**

Locate `create_commercial` (around line 2003). Inside the `for product in single_plan_products:` loop (around lines 2026–2036), add at the end of the loop body, immediately after the `_outstanding_item_due_date` setattr:

```python
            setattr(commercial, f'{product}_co_insurers', data.get(f'{product}_co_insurers') or None)
```

Note: workers_comp is in `single_plan_products` and has no co_insurers column. Skip it explicitly:

```python
            if product != 'workers_comp':
                setattr(commercial, f'{product}_co_insurers', data.get(f'{product}_co_insurers') or None)
```

- [ ] **Step 2: Wire single-plan co_insurers into `update_commercial`**

Locate `update_commercial` (around line 2082). Inside the `for product in single_plan_products:` loop (around lines 2105–2125), add after the `_outstanding_item_due_date` block:

```python
            if product != 'workers_comp' and f'{product}_co_insurers' in data:
                setattr(commercial, f'{product}_co_insurers', data.get(f'{product}_co_insurers') or None)
```

- [ ] **Step 3: Wire `co_insurers` into `save_commercial_plans`**

Locate `save_commercial_plans` (around line 1246). Inside the `CommercialPlan(...)` constructor call (around line 1260), add `co_insurers=plan_info.get('co_insurers') or None,` as the last keyword argument before the closing paren:

```python
                plan = CommercialPlan(
                    commercial_insurance_id=commercial.id,
                    plan_type=plan_type,
                    plan_number=idx,
                    carrier=carrier,
                    agency=agency,
                    policy_number=policy_number or None,
                    coverage_occ_limit=occ_limit_val,
                    coverage_agg_limit=agg_limit_val,
                    premium=parse_premium(premium_val),
                    renewal_date=parse_date(renewal),
                    remarks=plan_info.get('remarks') or None,
                    outstanding_item=plan_info.get('outstanding_item') or None,
                    outstanding_item_due_date=parse_date(plan_info.get('outstanding_item_due_date')),
                    endorsement_tech_eo=bool(plan_info.get('endorsement_tech_eo')),
                    endorsement_allied_healthcare=bool(plan_info.get('endorsement_allied_healthcare')),
                    endorsement_staffing=bool(plan_info.get('endorsement_staffing')),
                    endorsement_medical_malpractice=bool(plan_info.get('endorsement_medical_malpractice')),
                    co_insurers=plan_info.get('co_insurers') or None,
                )
```

- [ ] **Step 4: Quick app boot smoke test**

Run: `cd services && python -c "from api.customer_api import app; print('app imported')"`
Expected: `app imported` (no exceptions).

- [ ] **Step 5: Commit**

```bash
git add services/api/customer_api.py
git commit -m "Persist co_insurers in commercial create/update/save_plans"
```

---

## Task 4: Backend round-trip test

**Files:**
- Modify: `services/tests/test_customer_api.py`

- [ ] **Step 1: Write the failing tests**

Add to `services/tests/test_customer_api.py`:

```python
def test_commercial_co_insurers_round_trip(test_client):
    """Single-plan co_insurers persist through POST → GET."""
    # Seed a client (FK target)
    from api.customer_api import Session, Client
    session = Session()
    try:
        session.add(Client(tax_id='22-2222222', client_name='Primary Co'))
        session.commit()
    finally:
        session.close()

    payload = {
        'tax_id': '22-2222222',
        'general_liability_carrier': 'CarrierA',
        'general_liability_co_insurers': 'Acme Corp, Beta LLC',
        'flood_co_insurers': 'Gamma Inc',
    }
    res = test_client.post('/api/commercial', json=payload)
    assert res.status_code == 201
    commercial_id = res.get_json()['commercial']['id']

    res = test_client.get(f'/api/commercial/{commercial_id}')
    assert res.status_code == 200
    body = res.get_json()['commercial']
    assert body['general_liability_co_insurers'] == 'Acme Corp, Beta LLC'
    assert body['flood_co_insurers'] == 'Gamma Inc'
    # Workers comp has no co_insurers field
    assert 'workers_comp_co_insurers' not in body


def test_commercial_co_insurers_update(test_client):
    """PUT updates co_insurers values."""
    from api.customer_api import Session, Client
    session = Session()
    try:
        session.add(Client(tax_id='33-3333333', client_name='Primary Co'))
        session.commit()
    finally:
        session.close()

    res = test_client.post('/api/commercial', json={
        'tax_id': '33-3333333',
        'bop_co_insurers': 'Old Co',
    })
    cid = res.get_json()['commercial']['id']

    res = test_client.put(f'/api/commercial/{cid}', json={
        'bop_co_insurers': 'New Co A, New Co B',
    })
    assert res.status_code == 200

    res = test_client.get(f'/api/commercial/{cid}')
    assert res.get_json()['commercial']['bop_co_insurers'] == 'New Co A, New Co B'


def test_commercial_plan_co_insurers_round_trip(test_client):
    """Multi-plan co_insurers persist through POST → GET."""
    from api.customer_api import Session, Client
    session = Session()
    try:
        session.add(Client(tax_id='44-4444444', client_name='Primary Co'))
        session.commit()
    finally:
        session.close()

    payload = {
        'tax_id': '44-4444444',
        'plans': {
            'umbrella': [
                {'carrier': 'UmbrellaCo', 'premium': 1200, 'co_insurers': 'Joint Co X'},
            ],
        },
    }
    res = test_client.post('/api/commercial', json=payload)
    assert res.status_code == 201
    commercial_id = res.get_json()['commercial']['id']

    res = test_client.get(f'/api/commercial/{commercial_id}')
    body = res.get_json()['commercial']
    umbrella_plans = body.get('plans', {}).get('umbrella', [])
    assert len(umbrella_plans) == 1
    assert umbrella_plans[0]['co_insurers'] == 'Joint Co X'
```

- [ ] **Step 2: Run tests to verify they fail (or pass — after Tasks 2 & 3 they should pass)**

Run: `cd services && pytest tests/test_customer_api.py -k "co_insurers" -v`
Expected: PASS (Tasks 2 & 3 already implemented the persistence).

If any test fails, the failure points to a gap in Task 2 or 3 — fix the production code, not the test.

- [ ] **Step 3: Commit**

```bash
git add services/tests/test_customer_api.py
git commit -m "Test commercial co_insurers round-trip"
```

---

## Task 5: Invoice line item propagation

**Files:**
- Modify: `services/api/invoice.py`
- Create: `services/tests/test_invoice.py`

- [ ] **Step 1: Write the failing tests**

Create `services/tests/test_invoice.py`:

```python
"""Tests for invoice line item collection and rendering."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.invoice import _collect_line_items


def test_collect_line_items_single_plan_includes_co_insurers():
    commercial_data = {
        'general_liability_carrier': 'CarrierA',
        'general_liability_premium': 1000,
        'general_liability_policy_number': 'GL-1',
        'general_liability_renewal_date': '2026-01-01',
        'general_liability_co_insurers': 'Acme Corp, Beta LLC',
        'plans': {},
    }
    items = _collect_line_items(commercial_data, ['general_liability'])
    assert len(items) == 1
    assert items[0]['co_insurers'] == 'Acme Corp, Beta LLC'


def test_collect_line_items_single_plan_empty_co_insurers():
    commercial_data = {
        'general_liability_carrier': 'CarrierA',
        'general_liability_premium': 1000,
        'general_liability_policy_number': 'GL-1',
        'general_liability_renewal_date': '2026-01-01',
        'plans': {},
    }
    items = _collect_line_items(commercial_data, ['general_liability'])
    assert items[0].get('co_insurers') in (None, '')


def test_collect_line_items_multi_plan_includes_co_insurers():
    commercial_data = {
        'plans': {
            'umbrella': [
                {
                    'carrier': 'UmbrellaCo',
                    'premium': 2000,
                    'policy_number': 'UMB-1',
                    'renewal_date': '2026-02-01',
                    'co_insurers': 'Joint Co X',
                },
            ],
        },
    }
    items = _collect_line_items(commercial_data, ['umbrella'])
    assert len(items) == 1
    assert items[0]['co_insurers'] == 'Joint Co X'
```

Run: `cd services && pytest tests/test_invoice.py -v`
Expected: FAIL — `_collect_line_items` does not yet attach `co_insurers`.

- [ ] **Step 2: Update `_collect_line_items` to propagate `co_insurers`**

In `services/api/invoice.py`, modify `_collect_line_items` (lines 47–81). Replace the function body with:

```python
def _collect_line_items(commercial_data, policy_types):
    """Collect invoice line items from commercial data for the given policy types."""
    items = []
    plans = commercial_data.get('plans', {})

    for ptype in policy_types:
        label = POLICY_LABELS.get(ptype, ptype.replace('_', ' ').title())

        if ptype in MULTI_PLAN_TYPES:
            for plan in plans.get(ptype, []):
                carrier = plan.get('carrier') or ''
                premium = plan.get('premium') or 0
                policy_number = plan.get('policy_number') or ''
                renewal_date = plan.get('renewal_date') or ''
                if carrier or premium:
                    items.append({
                        'label': label, 'carrier': carrier,
                        'policy_number': policy_number,
                        'premium': float(premium) if premium else 0,
                        'renewal_date': renewal_date,
                        'co_insurers': plan.get('co_insurers') or '',
                    })
        else:
            carrier = commercial_data.get(f'{ptype}_carrier') or ''
            premium = commercial_data.get(f'{ptype}_premium') or 0
            policy_number = commercial_data.get(f'{ptype}_policy_number') or ''
            renewal_date = commercial_data.get(f'{ptype}_renewal_date') or ''
            if carrier or premium:
                items.append({
                    'label': label, 'carrier': carrier,
                    'policy_number': policy_number,
                    'premium': float(premium) if premium else 0,
                    'renewal_date': renewal_date,
                    'co_insurers': commercial_data.get(f'{ptype}_co_insurers') or '',
                })

    return items
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd services && pytest tests/test_invoice.py -v`
Expected: 3 PASS.

- [ ] **Step 4: Commit**

```bash
git add services/api/invoice.py services/tests/test_invoice.py
git commit -m "Propagate co_insurers in invoice _collect_line_items"
```

---

## Task 6: Invoice PDF rendering

**Files:**
- Modify: `services/api/invoice.py`

- [ ] **Step 1: Render co_insurers in `generate_invoice_pdf`**

In `services/api/invoice.py`, locate the line items loop in `generate_invoice_pdf` (around lines 199–210). Replace the `for item in line_items:` block with:

```python
    for item in line_items:
        date_start = _format_date(item['renewal_date'])
        date_end = _end_date(item['renewal_date'])
        date_cell = f'{date_start}\nto\n{date_end}' if date_start else ''
        desc_parts = [item['label']]
        if item['policy_number']:
            desc_parts.append(f"Policy No. {item['policy_number']}")
        if item['carrier']:
            desc_parts.append(f"Carrier: {item['carrier']}")
        if item.get('co_insurers'):
            desc_parts.append(f"Co-insured with: {item['co_insurers']}")
        desc_cell = '\n'.join(desc_parts)
        amount_cell = f"${item['premium']:,.2f}"
        table_data.append([date_cell, desc_cell, amount_cell])
```

(The line items table cells are plain strings — no italics. The sub-line appears beneath Carrier in the description column.)

- [ ] **Step 2: Smoke test PDF generation**

Run: `cd services && python -c "
from api.invoice import generate_invoice_pdf
buf = generate_invoice_pdf(
    invoice_number='TEST-001',
    invoice_date='2026-04-09',
    client_name='Acme',
    client_address='123 Main St',
    client_tax_id='11-1111111',
    line_items=[{
        'label': 'General Liability',
        'carrier': 'CarrierA',
        'policy_number': 'GL-1',
        'premium': 1000.0,
        'renewal_date': '2026-01-01',
        'co_insurers': 'Beta LLC, Gamma Inc',
    }],
)
data = buf.read()
print(f'PDF generated: {len(data)} bytes')
assert data.startswith(b'%PDF')
"`
Expected: `PDF generated: NNNN bytes` and no traceback.

- [ ] **Step 3: Run all backend tests for regression**

Run: `cd services && pytest tests/ -v`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add services/api/invoice.py
git commit -m "Render co-insurers beneath line item in invoice PDF"
```

---

## Task 7: Frontend — form state defaults and CSV helpers

**Files:**
- Modify: `webapp/customer-app/src/components/CommercialModal.js`

- [ ] **Step 1: Add CSV helpers near the top of the file**

In `webapp/customer-app/src/components/CommercialModal.js`, add at the top of the file (after imports, before the `CommercialModal` component declaration):

```js
const parseCsv = (s) =>
  s ? s.split(',').map((x) => x.trim()).filter(Boolean) : [];
const stringifyCsv = (arr) => (arr && arr.length ? arr.join(', ') : '');
```

- [ ] **Step 2: Add `*_co_insurers` keys to default formData**

Locate the default `formData` object (around lines 89–101). For each line that contains a non-WC single-plan prefix's fields (e.g. the line that begins with `general_liability_carrier:`), append `, <prefix>_co_insurers: ''` to the same line. Workers comp (line 92) does NOT get one.

After the change, line 89 (general_liability) should end with `..., general_liability_co_insurers: '',` and similarly for `property`, `bop`, `auto`, `epli`, `nydbl`, `surety`, `product_liability`, `flood`, `directors_officers`, `fiduciary`, `inland_marine`. Line 92 (workers_comp) is unchanged.

- [ ] **Step 3: Verify the build still compiles**

Run: `cd webapp/customer-app && npm run build`
Expected: build succeeds with no new errors.

- [ ] **Step 4: Commit**

```bash
git add webapp/customer-app/src/components/CommercialModal.js
git commit -m "CommercialModal: add co_insurers form state and CSV helpers"
```

---

## Task 8: Frontend — single-plan coverage section UI

**Files:**
- Modify: `webapp/customer-app/src/components/CommercialModal.js`

- [ ] **Step 1: Add Autocomplete import if not already present**

Check that `Autocomplete` and `Chip` are imported from `@mui/material` at the top of `CommercialModal.js`. If either is missing, add them to the existing `@mui/material` import line.

- [ ] **Step 2: Add the co-insurers Autocomplete to the single-plan coverage loop**

Locate the single-plan section render code that contains the `Remarks` `TextField` (around lines 1083–1094). Immediately after the closing `</Grid>` of the Remarks `Grid item xs={12}` (i.e., after line 1094), insert a new conditional `<Grid item>` that renders only when the prefix is not workers_comp:

```jsx
                                {prefix !== 'workers_comp' && (
                                  <Grid item xs={12}>
                                    <Autocomplete
                                      multiple
                                      options={(clients || [])
                                        .map((c) => c.client_name)
                                        .filter((name) => name && name !== formData.client_name)}
                                      value={parseCsv(formData[`${prefix}_co_insurers`])}
                                      onChange={(_, newValue) =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          [`${prefix}_co_insurers`]: stringifyCsv(newValue),
                                        }))
                                      }
                                      renderTags={(value, getTagProps) =>
                                        value.map((name, i) => (
                                          <Chip
                                            label={name}
                                            size="small"
                                            {...getTagProps({ index: i })}
                                          />
                                        ))
                                      }
                                      renderInput={(params) => (
                                        <TextField
                                          {...params}
                                          label="Co-insurers"
                                          size="small"
                                          placeholder="Select clients"
                                        />
                                      )}
                                    />
                                  </Grid>
                                )}
```

Two notes:
1. **State setter:** confirm the surrounding code uses `setFormData((prev) => ...)` style. If it uses a different setter helper (e.g., `handleChange`), wrap accordingly. Search for how `_remarks` writes back to state in the same file and mirror that pattern. The functional setter form above is the standard fallback.
2. **Self-exclusion:** the filter `name !== formData.client_name` excludes the current client. If the surrounding component holds the current client name under a different key (e.g., `selectedClient?.client_name`), use that variable. Search for how `selectedClient` is computed in this file (line 379 has `const selectedClient = clients.find(...)`) and use `selectedClient?.client_name` for the filter:

```jsx
                                        .filter((name) => name && name !== selectedClient?.client_name)}
```

- [ ] **Step 3: Verify build compiles**

Run: `cd webapp/customer-app && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual visual check**

Run: `cd webapp/customer-app && npm start` (if not already running). Open a commercial record. Expected:
- A "Co-insurers" multi-select Autocomplete appears beneath Remarks in every coverage section EXCEPT workers comp.
- The dropdown lists every client except the current one.
- Picking entries shows them as chips.

- [ ] **Step 5: Commit**

```bash
git add webapp/customer-app/src/components/CommercialModal.js
git commit -m "CommercialModal: co-insurers UI for single-plan coverages"
```

---

## Task 9: Frontend — multi-plan plan card UI

**Files:**
- Modify: `webapp/customer-app/src/components/CommercialModal.js`

- [ ] **Step 1: Add the co-insurers Autocomplete inside each plan card**

Locate the multi-plan plan card render that contains the per-plan `Remarks` `TextField` (around lines 627–637). Immediately after the closing `</Grid>` of the Remarks `Grid item sm={4}` (i.e., after line 637), insert:

```jsx
                    <Grid item xs={12}>
                      <Autocomplete
                        multiple
                        options={(clients || [])
                          .map((c) => c.client_name)
                          .filter((name) => name && name !== selectedClient?.client_name)}
                        value={parseCsv(plan.co_insurers)}
                        onChange={(_, newValue) =>
                          updatePlan(planType, idx, 'co_insurers', stringifyCsv(newValue))
                        }
                        renderTags={(value, getTagProps) =>
                          value.map((name, i) => (
                            <Chip
                              label={name}
                              size="small"
                              {...getTagProps({ index: i })}
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Co-insurers"
                            size="small"
                            placeholder="Select clients"
                          />
                        )}
                      />
                    </Grid>
```

This applies to all four multi-plan coverages (umbrella, professional E&O, cyber, crime) because they all render through the same plan card template.

- [ ] **Step 2: Verify build compiles**

Run: `cd webapp/customer-app && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual visual check**

In the running app, open a commercial record and view an umbrella / professional E&O / cyber / crime section. Add a plan if none exists. Expected:
- A "Co-insurers" multi-select Autocomplete appears at the bottom of each plan card.
- Each plan card has its own independent value (Umbrella Plan #1 vs Umbrella Plan #2 are independent).

- [ ] **Step 4: Commit**

```bash
git add webapp/customer-app/src/components/CommercialModal.js
git commit -m "CommercialModal: co-insurers UI for multi-plan plan cards"
```

---

## Task 10: End-to-end manual verification

- [ ] **Step 1: Save and reload**

In the running app:
1. Open a commercial record.
2. In the General Liability section, pick two clients as co-insurers.
3. In an Umbrella plan card, pick one client as a co-insurer.
4. Click Save.
5. Close and reopen the modal.

Expected: Both selections are preserved and rendered as chips.

- [ ] **Step 2: Generate an invoice and inspect the PDF**

Click "Generate Invoice" in the modal. In the dialog, include General Liability and Umbrella. Generate the PDF.

Expected: Each line item's description column shows a "Co-insured with: <names>" sub-line beneath the carrier line.

- [ ] **Step 3: Verify workers comp has no co-insurers UI**

In the same modal, scroll to the Workers Compensation section.
Expected: no "Co-insurers" Autocomplete is visible.

- [ ] **Step 4: Run full backend test suite**

Run: `cd services && pytest tests/ -v`
Expected: all tests pass.

- [ ] **Step 5: Run frontend tests**

Run: `cd webapp/customer-app && npm test -- --watchAll=false`
Expected: no new failures.

- [ ] **Step 6: Final commit (only if any lint/format fixes were needed)**

```bash
git add -A
git status  # verify nothing unintended
git commit -m "Lint/format fixes for co-insurers feature"  # only if needed
```

---

## Spec coverage checklist (self-review)

- ✅ 12 `*_co_insurers` columns on `commercial_insurance` (Task 1, Task 2)
- ✅ `co_insurers` column on `commercial_plans` (Task 1, Task 2)
- ✅ No column on workers_comp (Task 1 prefix list, Task 3 explicit skip, Task 8 conditional render)
- ✅ Idempotent migration (Task 1 column_exists guard + Step 4)
- ✅ Model declarations (Task 2 Steps 1–2)
- ✅ to_dict updates (Task 2 Steps 3–4)
- ✅ POST persistence (Task 3 Step 1)
- ✅ PUT persistence (Task 3 Step 2)
- ✅ save_commercial_plans persistence (Task 3 Step 3)
- ✅ Backend round-trip tests, single-plan + multi-plan + update (Task 4)
- ✅ `_collect_line_items` propagation, single + multi-plan (Task 5)
- ✅ PDF rendering of "Co-insured with: ..." sub-line (Task 6)
- ✅ Form state defaults (Task 7)
- ✅ CSV parse/serialize helpers (Task 7)
- ✅ Single-plan coverage Autocomplete UI, WC excluded (Task 8)
- ✅ Multi-plan plan card Autocomplete UI (Task 9)
- ✅ Self-exclusion of current client from options (Task 8 Step 2 note 2, Task 9)
- ✅ End-to-end manual verification (Task 10)
