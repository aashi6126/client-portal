# PoC Management: Add Commercial Support

**Date:** 2026-04-08
**Status:** Approved

## Problem

`PocManagement.js` only manages Employee Benefits PoCs (`enrollment_poc`). Commercial Insurance also has a PoC field (`assigned_to`) but is not represented in the UI, so users cannot view or reassign commercial PoCs in bulk.

## Goal

Extend PoC Management to cover both Employee Benefits and Commercial Insurance in a single unified view, with color coding that matches the dashboard (Benefits = orange/`warning`, Commercial = blue/`info`). Individuals are out of scope.

## Backend Changes

File: `services/api/customer_api.py`

Add two endpoints that mirror the existing benefits endpoints but operate on `CommercialInsurance.assigned_to`:

### `GET /api/commercial/poc-summary`

Returns unique values of `CommercialInsurance.assigned_to` with counts.

Response:
```json
{
  "pocs": [{"poc": "Jane Doe", "count": 3}, ...],
  "unassigned_count": 2
}
```

Implementation mirrors `get_poc_summary` (customer_api.py:4550) but queries `CommercialInsurance.assigned_to` instead of `EmployeeBenefit.enrollment_poc`.

### `PUT /api/commercial/poc-reassign`

Bulk reassign `assigned_to` on commercial records. Accepts either:
- `{from_poc, to_poc}` — reassign all rows with `assigned_to == from_poc`
- `{record_ids: [...], to_poc}` — reassign specific commercial row IDs

Response: `{message, updated_count}`.

Implementation mirrors `reassign_poc` (customer_api.py:4593) but on `CommercialInsurance.assigned_to`. Same validation (target required, source != target on full reassign).

## Frontend Changes

File: `webapp/customer-app/src/components/PocManagement.js`

### Summary loading

On mount and when `dataVersion` changes, fetch in parallel:
- `/api/benefits/poc-summary`
- `/api/commercial/poc-summary`

Merge results into a map keyed by PoC name:
```js
{ "Jane Doe": { poc: "Jane Doe", benefitsCount: 5, commercialCount: 3 }, ... }
```

Sort rows alphabetically by PoC name. Track merged `unassignedBenefits` and `unassignedCommercial` counts separately.

### Main table

Update header copy to: *"View and bulk-reassign Assigned Tos across Employee Benefits and Commercial records"*.

Columns:

| Assigned To | Benefits | Commercial | Action |
|---|---|---|---|

- **Benefits** cell: `<Chip color="warning" variant="outlined" size="small" label={n} />` when `benefitsCount > 0`, else `—`.
- **Commercial** cell: `<Chip color="info" variant="outlined" size="small" label={n} />` when `commercialCount > 0`, else `—`.
- **Action**: same "Reassign" button as today.
- The `Chip label={ '${pocList.length} unique' }` in the title reflects the merged count.

Unassigned alert: show if either count > 0. Copy: *"N benefit record(s) and M commercial record(s) have no Assigned To assigned."* (suppress each side if that count is 0).

### Reassign dialog

When the user clicks Reassign on a PoC row, fetch in parallel:
- `/api/benefits` → filter locally by `b.enrollment_poc === item.poc`
- `/api/commercial` → filter locally by `c.assigned_to === item.poc`

Record list is grouped into two sub-sections inside the existing `TableContainer`. Each section has a colored subheader row and its own records:

1. **Employee Benefits (N)** — orange subheader (`backgroundColor: theme.palette.warning.light` or equivalent light-orange tint). Columns: checkbox / Client Name / Status / Renewal Date (same as today).
2. **Commercial (N)** — blue subheader (`info.light`). Columns: checkbox / Client Name / Status / Renewal Date. Renewal date shows `—` for commercial rows because commercial records have per-coverage renewal dates, not a single row-level date.

Hide a section entirely if it has zero matching records.

Track selected IDs as two sets: `selectedBenefitIds` and `selectedCommercialIds`. Provide:
- Global select-all checkbox (toggles both sets at once).
- Implicit per-row toggle by clicking the row (existing behavior).
- Default on open: all records in both sections selected.

Selection counter: *"X of Y records selected"* where X = sum of both set sizes, Y = total records.

**Target PoC Autocomplete options:** union of all PoC names across both types, minus the currently selected PoC name. Deduplicated.

### Submit

Always use the `record_ids` path (drop the `from_poc` full-reassign shortcut; the simplification is worth the negligible payload increase). Behavior:

```
const calls = [];
if (selectedBenefitIds.size > 0) {
  calls.push(axios.put('/api/benefits/poc-reassign', {
    record_ids: Array.from(selectedBenefitIds),
    to_poc: targetPoc.trim()
  }));
}
if (selectedCommercialIds.size > 0) {
  calls.push(axios.put('/api/commercial/poc-reassign', {
    record_ids: Array.from(selectedCommercialIds),
    to_poc: targetPoc.trim()
  }));
}
const results = await Promise.all(calls);
```

Aggregate the two `updated_count` values into a single snackbar message, e.g. *"Reassigned 5 benefits and 3 commercial records to 'John Smith'."* (omit a side if its count is 0).

On success: close dialog, re-run the merged summary fetch. On failure of either call: show the first error in the snackbar; state of the other call is reported in server logs as-is (no partial rollback — each endpoint commits independently).

## Data Flow Summary

```
PocManagement mount
  ├─ GET /api/benefits/poc-summary      ─┐
  └─ GET /api/commercial/poc-summary    ─┴─ merge by name → table rows

User clicks Reassign on "Jane Doe"
  ├─ GET /api/benefits  → filter enrollment_poc == "Jane Doe"    ─┐
  └─ GET /api/commercial → filter assigned_to == "Jane Doe"      ─┴─ dialog sections

User selects records + target, clicks Reassign
  ├─ PUT /api/benefits/poc-reassign   {record_ids, to_poc}   (if any benefits selected)
  └─ PUT /api/commercial/poc-reassign {record_ids, to_poc}   (if any commercial selected)
  → aggregate message → refresh summary
```

## Testing

- Backend: add tests in `services/tests/test_customer_api.py` for the two new commercial endpoints covering: empty state, summary with/without unassigned, reassign by `record_ids`, reassign by `from_poc`, validation errors (missing `to_poc`, same source/target).
- Frontend: extend or add component tests covering:
  - Merged summary rendering with a PoC that has only benefits, only commercial, and both.
  - Reassign dialog shows both sections when applicable, hides empty sections.
  - Submit dispatches to the correct endpoint(s) based on selection.

## Out of Scope

- Individual records (no PoC management for the Individuals table).
- Per-coverage PoC on commercial — `assigned_to` remains row-level.
- DB schema or field-name changes.
- Joint ownership of coverages (separate in-flight design, deferred).
