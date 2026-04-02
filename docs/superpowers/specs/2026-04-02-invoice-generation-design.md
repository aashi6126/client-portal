# Invoice Generation for Commercial Policies

## Overview

Add the ability to generate PDF invoices for selected commercial insurance policies and email them directly to clients from within the Commercial Modal.

## User Flow

1. User opens a commercial record in the CommercialModal (edit mode)
2. Clicks "Generate Invoice" button in the modal
3. An invoice dialog opens showing all active policies with checkboxes
4. User selects which policies to include on the invoice
5. Email fields are pre-filled (To: client's email, Subject: auto-generated)
6. User can click "Preview PDF" to see the invoice before sending
7. User clicks "Send Invoice" — PDF is generated and emailed via SMTP
8. Success confirmation shown

## Invoice Dialog (Frontend)

Located inside CommercialModal as a sub-dialog/overlay. Contains:

### Policy Selection
- Checkbox list of all active policies (those with a carrier set)
- Each row shows: policy type name, carrier, policy number, premium
- Running subtotal updates as policies are checked/unchecked
- All policies checked by default

### Email Form
- **To:** Pre-filled with client's email from the Client record
- **CC:** Optional, empty by default
- **Subject:** Auto-generated: `Invoice #<number> — Edison General Insurance Service`

### Actions
- **Preview PDF** — calls backend, opens PDF in new tab
- **Send Invoice** — generates PDF + emails it, shows success message
- **Cancel** — closes dialog

## PDF Layout

Matches the Edison General Insurance Service template exactly:

### Header
- Dark navy (#000066) background
- "Edison General Insurance Service" (left), "INVOICE" (right)

### Company Info
- 22 Meridian Road, Suite 16
- Edison, NJ 08820
- 732-548-8700

### Invoice Details
- **Named Insured:** Client name + address from Client record
- **Invoice Number:** Auto-incrementing sequence
- **Invoice Date:** Current date
- **Bill-To Code:** Client's tax_id

### Line Items Table
- Columns: Effective Date | Description | Amount
- Each selected policy is a line item:
  - Effective Date: renewal_date to renewal_date + 1 year
  - Description: policy type label, policy number, carrier
  - Amount: premium

### Remit Section (inside table body)
- "Please remit all payments to:"
- EDISON GENERAL INSURANCE SERVICE, 22 MERIDIAN ROAD, SUITE 16, EDISON, NJ 08820

### Subtotal Row
- Sum of all line item amounts

### Footer
- **DIRECT ALL INQUIRIES TO:** Accounts Department, 732-548-8700, email: info@njgroups.com
- **MAKE ALL CHECKS PAYABLE TO:** Edison General Insurance Service, 22 Meridian Road, Suite 16, Edison, NJ 08820
- **PAY THIS AMOUNT** box with subtotal

### Bottom
- "THANK YOU FOR YOUR BUSINESS!" centered, bold, italic

## API Endpoints

### POST /api/invoice/preview
Generates a PDF and returns it for browser preview.

**Request body:**
```json
{
  "commercial_id": 123,
  "policy_types": ["general_liability", "auto"],
  "invoice_date": "2026-04-02"
}
```

**Response:** PDF file (application/pdf)

### POST /api/invoice/send
Generates a PDF and emails it to the client.

**Request body:**
```json
{
  "commercial_id": 123,
  "policy_types": ["general_liability", "auto"],
  "invoice_date": "2026-04-02",
  "to_email": "john@acmecorp.com",
  "cc_email": "",
  "subject": "Invoice #536659 — Edison General Insurance Service"
}
```

**Response:**
```json
{
  "message": "Invoice sent successfully",
  "invoice_number": 536659
}
```

## Invoice Number Sequence

- New DB model `InvoiceSequence` with a single row tracking the last used number
- Starting value: 536658 (matching the example)
- Auto-increments on each invoice generation (both preview and send)
- Thread-safe: uses DB-level increment

## Email Configuration

- **SMTP Server:** smtp.office365.com
- **Port:** 587 (STARTTLS)
- **From:** clientsupport@njgroups.com
- **Auth:** Required — Microsoft 365 credentials
- **Credentials via environment variables:**
  - `SMTP_USERNAME` — email address for auth
  - `SMTP_PASSWORD` — password or app password
- Email body: brief professional message with PDF attached
- PDF filename: `Invoice_<number>_<ClientName>.pdf`

## PDF Generation

- Python `reportlab` library on the backend
- Generates PDF matching the Edison General template
- All styling hardcoded to match the brand (navy header, layout, fonts)

## Data Sources

For a given commercial_id, the invoice pulls:
- **Client info:** name, address, email, tax_id — from the Client record (via tax_id FK)
- **Policy details:** for each selected policy type, reads carrier, policy_number, premium, renewal_date from the CommercialInsurance record (single-plan types) or CommercialPlan records (multi-plan types)

## Error Handling

- SMTP connection failure: return 500 with clear error message
- Missing client email: frontend prevents sending (To field required)
- No policies selected: frontend prevents generating (at least one required)
- PDF generation failure: return 500 with error details

## Files to Create/Modify

### New Files
- `services/api/invoice.py` — PDF generation + email sending logic
- `webapp/customer-app/src/components/InvoiceDialog.js` — invoice dialog component

### Modified Files
- `services/api/customer_api.py` — add invoice API endpoints, InvoiceSequence model
- `webapp/customer-app/src/components/CommercialModal.js` — add "Generate Invoice" button + dialog integration
