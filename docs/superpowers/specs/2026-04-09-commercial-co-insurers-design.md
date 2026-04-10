# Commercial Coverage Co-Insurers

**Date:** 2026-04-09
**Status:** Approved

## Problem

Commercial policies are sometimes co-insured with one or more other clients in the system. There is currently no way to record this. Users need to capture, edit, and display the list of co-insurers per coverage on a commercial record.

## Goal

Allow each commercial coverage type **except workers compensation** to store a list of co-insurers (other clients in the system). The list is editable in `CommercialModal`, persisted, and shown on the generated invoice PDF beneath the relevant line item.

## Storage Format

- Stored as a single nullable `TEXT` column per coverage, value = comma-separated client **names** (not IDs).
- Empty string or `NULL` = no co-insurers.
- Example: `"Acme Corp, Beta LLC"`.
- Trade-off accepted: if a client is renamed later, existing co-insurer entries do not auto-update. Out of scope for this spec.

## Schema Changes

### `commercial_insurance` table — add 12 columns

One column per single-plan non-WC coverage:

```
general_liability_co_insurers   TEXT
property_co_insurers            TEXT
bop_co_insurers                 TEXT
auto_co_insurers                TEXT
epli_co_insurers                TEXT
nydbl_co_insurers               TEXT
surety_co_insurers              TEXT
product_liability_co_insurers   TEXT
flood_co_insurers               TEXT
directors_officers_co_insurers  TEXT
fiduciary_co_insurers           TEXT
inland_marine_co_insurers       TEXT
```

No column on `workers_comp_*` (per requirement).

### `commercial_plans` table — add 1 column

```
co_insurers   TEXT
```

Used by the four multi-plan coverages (umbrella, professional E&O, cyber, crime). Each plan row carries its own co-insurer list — Umbrella Plan #1 may differ from Umbrella Plan #2.

### Migration

New script in `services/db/` that mirrors the existing migration pattern: read `pragma table_info`, conditionally `ALTER TABLE ADD COLUMN` for any missing column. Idempotent so it can be re-run safely.

## Backend Changes

### `services/api/customer_api.py`

1. **Model** — add the 13 column declarations on `CommercialInsurance` and `CommercialPlan`.
2. **`CommercialInsurance.to_dict`** — emit the 12 new fields.
3. **`CommercialPlan.to_dict`** — emit `co_insurers`.
4. **POST `/api/commercial`** and **PUT `/api/commercial/<id>`** — accept the new fields from the JSON body and persist them on the row.
5. **`save_commercial_plans`** (around line 1246) — read `co_insurers` from each incoming plan dict and write it to the new column on `CommercialPlan`.
6. No backend validation: the field is plain text. The frontend constrains values to existing client names.

### `services/api/invoice.py`

1. **`_collect_line_items`** — for each line item, attach `co_insurers`:
   - Single-plan: `commercial_data.get(f'{ptype}_co_insurers')`
   - Multi-plan: `plan.get('co_insurers')`
2. **`generate_invoice_pdf`** — when rendering each line item, if `co_insurers` is non-empty, append a small italicized sub-line beneath the carrier/policy info reading *"Co-insured with: <names>"*.

## Frontend Changes

### `webapp/customer-app/src/components/CommercialModal.js`

For each of the 16 non-WC coverage sections (and inside each plan card for the four multi-plan coverages), add a multi-select Autocomplete:

```jsx
<Autocomplete
  multiple
  options={clientOptions}                                // all client names except the modal's current client
  value={parseCsv(formData[`${prefix}_co_insurers`])}
  onChange={(_, newValue) =>
    setField(`${prefix}_co_insurers`, newValue.join(', '))
  }
  renderTags={(value, getTagProps) =>
    value.map((name, i) => (
      <Chip label={name} size="small" {...getTagProps({ index: i })} />
    ))
  }
  renderInput={(params) => (
    <TextField {...params} label="Co-insurers" size="small" />
  )}
/>
```

Helpers:
- `parseCsv(s)` = `s ? s.split(',').map(x => x.trim()).filter(Boolean) : []`
- `clientOptions` = list of all client names from the parent's already-loaded client list, with the current client filtered out.

For multi-plan plan cards, the same control lives inside each plan card and is bound to that plan's local state, not the parent commercial record state.

**Layout:** place the control directly below the existing Remarks / Outstanding-item controls within each coverage section.

## Data Flow Summary

```
User opens CommercialModal
  → loads client list (existing behavior) → builds clientOptions

User picks co-insurers in any coverage section
  → Autocomplete onChange → setField('<prefix>_co_insurers', "Acme Corp, Beta LLC")

User saves
  → POST/PUT /api/commercial → persists *_co_insurers columns and per-plan co_insurers

User generates invoice
  → _collect_line_items reads co_insurers from row / plan
  → generate_invoice_pdf renders "Co-insured with: …" beneath each line item
```

## Testing

- **Backend pytest** in `services/tests/test_customer_api.py`:
  - Round-trip: POST a commercial record with `general_liability_co_insurers="Acme Corp, Beta LLC"` and a multi-plan umbrella plan with `co_insurers="Gamma Inc"`; GET it back; assert both fields persist.
  - PUT update: change the co-insurer list and confirm the new value is saved.
- **Backend pytest** in a new `services/tests/test_invoice.py` (or existing if present):
  - `_collect_line_items` propagates `co_insurers` for both single-plan and multi-plan paths.
- **Frontend:** manual verification — pick co-insurers in a single-plan and a multi-plan section, save, reopen, confirm chips display, generate invoice PDF, confirm sub-line appears.

## Out of Scope

- Auto-syncing co-insurer entries when a client is renamed.
- Free-form / typed-in co-insurers not present in the client list.
- Workers compensation co-insurers.
- Joint ownership / split premium billing across two clients (separate deferred design).
- Normalized junction table — explicitly chose CSV per requirements.
