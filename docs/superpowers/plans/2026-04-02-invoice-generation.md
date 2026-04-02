# Invoice Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate PDF invoices for selected commercial policies and email them to clients via SMTP.

**Architecture:** Backend generates PDFs with reportlab and sends emails via Office365 SMTP. Frontend adds an InvoiceDialog component inside CommercialModal with policy checkboxes and email form. Invoice numbers auto-increment from a DB sequence.

**Tech Stack:** Python reportlab (PDF), smtplib (email), React/MUI (dialog), PostgreSQL (invoice sequence)

---

### Task 1: Install reportlab and add InvoiceSequence model

**Files:**
- Modify: `services/requirements.txt`
- Modify: `services/api/customer_api.py` (after line 1127, Feedback model)

- [ ] **Step 1: Add reportlab to requirements.txt**

Add `reportlab` to the end of `services/requirements.txt`:

```
reportlab==4.1.0
```

- [ ] **Step 2: Install reportlab**

Run: `pip install reportlab==4.1.0`

- [ ] **Step 3: Add InvoiceSequence model to customer_api.py**

Add after the Feedback model class (around line 1140) in `services/api/customer_api.py`:

```python
class InvoiceSequence(db.Model):
    __tablename__ = 'invoice_sequence'

    id = db.Column(db.Integer, primary_key=True)
    last_number = db.Column(db.Integer, nullable=False, default=536658)

    @staticmethod
    def next_number(session):
        """Get and increment the next invoice number. Thread-safe via DB."""
        seq = session.query(InvoiceSequence).first()
        if not seq:
            seq = InvoiceSequence(last_number=536658)
            session.add(seq)
            session.flush()
        seq.last_number += 1
        session.flush()
        return seq.last_number
```

- [ ] **Step 4: Create the table**

The table will be auto-created by SQLAlchemy on next app start since `db.create_all()` is called. Verify by restarting the API:

Run: `pkill -f customer_api.py; sleep 1; /usr/bin/python3 services/api/customer_api.py &`

- [ ] **Step 5: Commit**

```bash
git add services/requirements.txt services/api/customer_api.py
git commit -m "feat: add reportlab dependency and InvoiceSequence model"
```

---

### Task 2: Create PDF generation module

**Files:**
- Create: `services/api/invoice.py`

- [ ] **Step 1: Write the invoice PDF generator**

Create `services/api/invoice.py`:

```python
"""
Invoice PDF generation for Edison General Insurance Service.
Generates branded invoices matching the company template.
"""

import io
from datetime import datetime, timedelta
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER


COMPANY_NAME = "Edison General Insurance Service"
COMPANY_ADDRESS_1 = "22 Meridian Road, Suite 16"
COMPANY_ADDRESS_2 = "Edison, NJ 08820"
COMPANY_PHONE = "732-548-8700"
COMPANY_EMAIL = "info@njgroups.com"

NAVY = colors.HexColor("#000066")

# Human-readable labels for policy type prefixes
POLICY_LABELS = {
    'general_liability': 'Commercial General Liability',
    'property': 'Commercial Property',
    'bop': 'Business Owners Policy',
    'workers_comp': 'Workers Compensation',
    'auto': 'Commercial Auto',
    'epli': 'EPLI',
    'nydbl': 'NYDBL',
    'surety': 'Surety Bond',
    'product_liability': 'Product Liability',
    'flood': 'Flood',
    'directors_officers': 'Directors & Officers',
    'fiduciary': 'Fiduciary Bond',
    'inland_marine': 'Inland Marine',
    'umbrella': 'Umbrella Liability',
    'professional_eo': 'Professional or E&O',
    'cyber': 'Cyber Liability',
    'crime': 'Crime or Fidelity Bond',
}

# Multi-plan types are stored in CommercialPlan child records
MULTI_PLAN_TYPES = {'umbrella', 'professional_eo', 'cyber', 'crime'}


def _collect_line_items(commercial_data, policy_types):
    """
    Collect invoice line items from commercial data for the given policy types.

    Returns list of dicts: {label, carrier, policy_number, premium, renewal_date}
    """
    items = []
    plans = commercial_data.get('plans', {})

    for ptype in policy_types:
        label = POLICY_LABELS.get(ptype, ptype.replace('_', ' ').title())

        if ptype in MULTI_PLAN_TYPES:
            # Multi-plan: iterate child plan records
            for plan in plans.get(ptype, []):
                carrier = plan.get('carrier') or ''
                premium = plan.get('premium') or 0
                policy_number = plan.get('policy_number') or ''
                renewal_date = plan.get('renewal_date') or ''
                if carrier or premium:
                    items.append({
                        'label': label,
                        'carrier': carrier,
                        'policy_number': policy_number,
                        'premium': float(premium) if premium else 0,
                        'renewal_date': renewal_date,
                    })
        else:
            # Single-plan: read flat fields
            carrier = commercial_data.get(f'{ptype}_carrier') or ''
            premium = commercial_data.get(f'{ptype}_premium') or 0
            policy_number = commercial_data.get(f'{ptype}_policy_number') or ''
            renewal_date = commercial_data.get(f'{ptype}_renewal_date') or ''
            if carrier or premium:
                items.append({
                    'label': label,
                    'carrier': carrier,
                    'policy_number': policy_number,
                    'premium': float(premium) if premium else 0,
                    'renewal_date': renewal_date,
                })

    return items


def _format_date(date_str):
    """Format ISO date string to M/D/YY."""
    if not date_str:
        return ''
    try:
        if isinstance(date_str, str):
            dt = datetime.strptime(date_str[:10], '%Y-%m-%d')
        else:
            dt = date_str
        return dt.strftime('%-m/%-d/%y')
    except (ValueError, TypeError):
        return str(date_str)


def _end_date(date_str):
    """Get date + 1 year for effective date range."""
    if not date_str:
        return ''
    try:
        if isinstance(date_str, str):
            dt = datetime.strptime(date_str[:10], '%Y-%m-%d')
        else:
            dt = date_str
        end = dt.replace(year=dt.year + 1)
        return end.strftime('%-m/%-d/%y')
    except (ValueError, TypeError):
        return ''


def generate_invoice_pdf(
    invoice_number,
    invoice_date,
    client_name,
    client_address,
    client_tax_id,
    line_items,
):
    """
    Generate a PDF invoice matching the Edison General Insurance template.

    Args:
        invoice_number: int
        invoice_date: str (ISO date or display date)
        client_name: str
        client_address: str (multi-line address)
        client_tax_id: str
        line_items: list of dicts with keys: label, carrier, policy_number, premium, renewal_date

    Returns:
        BytesIO containing the PDF
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch,
        topMargin=0.4 * inch,
        bottomMargin=0.4 * inch,
    )

    styles = getSampleStyleSheet()
    elements = []

    page_width = letter[0] - 1.0 * inch  # usable width

    # --- HEADER ---
    header_data = [[
        Paragraph(f'<font color="white" size="16"><b>{COMPANY_NAME}</b></font>', styles['Normal']),
        Paragraph('<font color="white" size="20"><b>INVOICE</b></font>', styles['Normal']),
    ]]
    header_table = Table(header_data, colWidths=[page_width * 0.7, page_width * 0.3])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (0, 0), 12),
        ('RIGHTPADDING', (1, 0), (1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header_table)

    # --- COMPANY INFO ---
    company_info = [[
        Paragraph(f'{COMPANY_ADDRESS_1}<br/>{COMPANY_ADDRESS_2}', styles['Normal']),
        Paragraph(COMPANY_PHONE, styles['Normal']),
    ]]
    ci_table = Table(company_info, colWidths=[page_width * 0.5, page_width * 0.5])
    ci_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(ci_table)
    elements.append(Spacer(1, 8))

    # --- NAMED INSURED + INVOICE META ---
    # Format invoice date for display
    if isinstance(invoice_date, str):
        try:
            dt = datetime.strptime(invoice_date[:10], '%Y-%m-%d')
            display_date = dt.strftime('%B %-d, %Y')
        except ValueError:
            display_date = invoice_date
    else:
        display_date = invoice_date.strftime('%B %-d, %Y')

    left_text = f'<b>Named Insured:</b><br/>{client_name}<br/>{client_address}'
    right_text = (
        f'<font size="9">'
        f'INVOICE NUMBER &nbsp;&nbsp;<b>{invoice_number}</b><br/>'
        f'INVOICE DATE &nbsp;&nbsp;<b>{display_date}</b><br/>'
        f'Bill-To Code &nbsp;&nbsp;<b>{client_tax_id}</b>'
        f'</font>'
    )

    style_small = ParagraphStyle('small', parent=styles['Normal'], fontSize=9, leading=13)
    style_right = ParagraphStyle('right_aligned', parent=styles['Normal'], fontSize=9, leading=13, alignment=TA_RIGHT)

    meta_data = [[
        Paragraph(left_text, style_small),
        Paragraph(right_text, style_right),
    ]]
    meta_table = Table(meta_data, colWidths=[page_width * 0.55, page_width * 0.45])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(meta_table)

    # --- PAYABLE TO ---
    elements.append(Paragraph(
        f'<b>Make checks payable to:</b> {COMPANY_NAME}',
        style_small
    ))
    elements.append(Spacer(1, 10))

    # --- LINE ITEMS TABLE ---
    subtotal = sum(item['premium'] for item in line_items)

    # Table header
    table_data = [['Effective Date', 'DESCRIPTION', 'AMOUNT']]

    # Line items
    for item in line_items:
        date_start = _format_date(item['renewal_date'])
        date_end = _end_date(item['renewal_date'])
        date_cell = f'{date_start}\nto\n{date_end}' if date_start else ''

        desc_parts = [item['label']]
        if item['policy_number']:
            desc_parts.append(f"Policy No. {item['policy_number']}")
        if item['carrier']:
            desc_parts.append(f"Carrier: {item['carrier']}")
        desc_cell = '\n'.join(desc_parts)

        amount_cell = f"${item['premium']:,.2f}"

        table_data.append([date_cell, desc_cell, amount_cell])

    # Remit section (empty row with payment address)
    remit_text = (
        '\n\nPlease remit all payments to:\n\n'
        f'{COMPANY_NAME.upper()}\n'
        f'{COMPANY_ADDRESS_1.upper()}\n'
        f'{COMPANY_ADDRESS_2.upper()}'
    )
    table_data.append(['', remit_text, ''])

    # Subtotal row
    table_data.append(['', 'SUBTOTAL', f'${subtotal:,.2f}'])

    col_widths = [page_width * 0.15, page_width * 0.6, page_width * 0.25]
    items_table = Table(table_data, colWidths=col_widths, repeatRows=1)

    num_rows = len(table_data)
    subtotal_row = num_rows - 1
    remit_row = num_rows - 2

    items_style = [
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#C0C0C0')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, 0), 1, colors.black),
        # Item rows
        ('LINEAFTER', (0, 1), (0, remit_row), 0.5, colors.grey),
        ('LINEAFTER', (1, 1), (1, remit_row), 0.5, colors.grey),
        ('BOX', (0, 0), (-1, remit_row), 1.5, colors.black),
        # Subtotal
        ('BACKGROUND', (0, subtotal_row), (-1, subtotal_row), colors.HexColor('#F0F0F0')),
        ('FONTNAME', (0, subtotal_row), (-1, subtotal_row), 'Helvetica-Bold'),
        ('LINEABOVE', (0, subtotal_row), (-1, subtotal_row), 1.5, colors.black),
        ('BOX', (0, subtotal_row), (-1, subtotal_row), 1.5, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]

    # Add row separators for item rows
    for i in range(1, remit_row):
        items_style.append(('LINEBELOW', (0, i), (-1, i), 0.5, colors.HexColor('#DDDDDD')))

    items_table.setStyle(TableStyle(items_style))
    elements.append(items_table)
    elements.append(Spacer(1, 16))

    # --- FOOTER ---
    footer_left = (
        f'<b>DIRECT ALL INQUIRIES TO:</b><br/>'
        f'Accounts Department<br/>'
        f'{COMPANY_PHONE}<br/>'
        f'email: {COMPANY_EMAIL}'
    )
    footer_mid = (
        f'<b>MAKE ALL CHECKS PAYABLE TO:</b><br/>'
        f'{COMPANY_NAME}<br/>'
        f'{COMPANY_ADDRESS_1}<br/>'
        f'{COMPANY_ADDRESS_2}'
    )
    footer_right = (
        f'<b>PAY THIS<br/>AMOUNT</b><br/>'
        f'<b>${subtotal:,.2f}</b>'
    )

    style_footer = ParagraphStyle('footer', parent=styles['Normal'], fontSize=8, leading=11)
    style_pay = ParagraphStyle('pay_box', parent=styles['Normal'], fontSize=9, leading=12, alignment=TA_CENTER)

    footer_data = [[
        Paragraph(footer_left, style_footer),
        Paragraph(footer_mid, style_footer),
        Paragraph(footer_right, style_pay),
    ]]
    footer_table = Table(footer_data, colWidths=[page_width * 0.35, page_width * 0.38, page_width * 0.27])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEABOVE', (0, 0), (-1, 0), 1.5, colors.black),
        ('BOX', (2, 0), (2, 0), 1, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(footer_table)
    elements.append(Spacer(1, 12))

    # --- THANK YOU ---
    style_thanks = ParagraphStyle('thanks', parent=styles['Normal'], fontSize=11, leading=14, alignment=TA_CENTER)
    elements.append(Paragraph('<b><i>THANK YOU FOR YOUR BUSINESS!</i></b>', style_thanks))

    # Build PDF
    doc.build(elements)
    buf.seek(0)
    return buf
```

- [ ] **Step 2: Verify the module imports correctly**

Run: `/usr/bin/python3 -c "from api.invoice import generate_invoice_pdf, POLICY_LABELS; print('OK')"` from the `services/` directory.

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add services/api/invoice.py
git commit -m "feat: add invoice PDF generation module"
```

---

### Task 3: Add invoice API endpoints

**Files:**
- Modify: `services/api/customer_api.py` (add routes after commercial routes, around line 2131)

- [ ] **Step 1: Add email imports at top of customer_api.py**

Add after the existing imports (line 14):

```python
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
```

- [ ] **Step 2: Add import for invoice module**

Add after the email imports:

```python
from api.invoice import generate_invoice_pdf, _collect_line_items, POLICY_LABELS
```

- [ ] **Step 3: Add SMTP configuration constants**

Add after the LAN_ONLY config (around line 53):

```python
# SMTP Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.office365.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM = os.environ.get('SMTP_FROM', 'clientsupport@njgroups.com')
```

- [ ] **Step 4: Add the invoice preview endpoint**

Add after the commercial clone route (around line 2131) in `customer_api.py`:

```python
# ===========================================================================
# INVOICE ENDPOINTS
# ===========================================================================

@app.route('/api/invoice/preview', methods=['POST'])
def invoice_preview():
    """Generate an invoice PDF and return it for preview."""
    session = Session()
    try:
        data = request.get_json()
        commercial_id = data.get('commercial_id')
        policy_types = data.get('policy_types', [])
        invoice_date = data.get('invoice_date', datetime.now().strftime('%Y-%m-%d'))

        if not commercial_id or not policy_types:
            return jsonify({'error': 'commercial_id and policy_types are required'}), 400

        commercial = session.query(CommercialInsurance).filter_by(id=commercial_id).first()
        if not commercial:
            return jsonify({'error': 'Commercial record not found'}), 404

        client = commercial.client
        if not client:
            return jsonify({'error': 'Client not found for this commercial record'}), 404

        commercial_data = commercial.to_dict()
        line_items = _collect_line_items(commercial_data, policy_types)

        if not line_items:
            return jsonify({'error': 'No active policies found for selected types'}), 400

        invoice_number = InvoiceSequence.next_number(session)

        # Build client address
        addr_parts = [client.address_line_1 or '']
        if client.address_line_2:
            addr_parts.append(client.address_line_2)
        city_state_zip = ', '.join(filter(None, [client.city, client.state]))
        if client.zip_code:
            city_state_zip += f' {client.zip_code}'
        addr_parts.append(city_state_zip)
        client_address = '\n'.join(filter(None, addr_parts))

        pdf_buf = generate_invoice_pdf(
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            client_name=client.client_name or '',
            client_address=client_address,
            client_tax_id=client.tax_id or '',
            line_items=line_items,
        )

        session.commit()

        return send_file(
            pdf_buf,
            mimetype='application/pdf',
            as_attachment=False,
            download_name=f'Invoice_{invoice_number}_{(client.client_name or "Client").replace(" ", "_")}.pdf'
        )
    except Exception as e:
        session.rollback()
        logging.error(f"Error generating invoice preview: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/invoice/send', methods=['POST'])
def invoice_send():
    """Generate an invoice PDF and email it to the client."""
    session = Session()
    try:
        data = request.get_json()
        commercial_id = data.get('commercial_id')
        policy_types = data.get('policy_types', [])
        invoice_date = data.get('invoice_date', datetime.now().strftime('%Y-%m-%d'))
        to_email = data.get('to_email')
        cc_email = data.get('cc_email', '')
        subject = data.get('subject', '')

        if not commercial_id or not policy_types:
            return jsonify({'error': 'commercial_id and policy_types are required'}), 400
        if not to_email:
            return jsonify({'error': 'to_email is required'}), 400

        commercial = session.query(CommercialInsurance).filter_by(id=commercial_id).first()
        if not commercial:
            return jsonify({'error': 'Commercial record not found'}), 404

        client = commercial.client
        if not client:
            return jsonify({'error': 'Client not found for this commercial record'}), 404

        commercial_data = commercial.to_dict()
        line_items = _collect_line_items(commercial_data, policy_types)

        if not line_items:
            return jsonify({'error': 'No active policies found for selected types'}), 400

        invoice_number = InvoiceSequence.next_number(session)

        if not subject:
            subject = f'Invoice #{invoice_number} — Edison General Insurance Service'

        # Build client address
        addr_parts = [client.address_line_1 or '']
        if client.address_line_2:
            addr_parts.append(client.address_line_2)
        city_state_zip = ', '.join(filter(None, [client.city, client.state]))
        if client.zip_code:
            city_state_zip += f' {client.zip_code}'
        addr_parts.append(city_state_zip)
        client_address = '\n'.join(filter(None, addr_parts))

        pdf_buf = generate_invoice_pdf(
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            client_name=client.client_name or '',
            client_address=client_address,
            client_tax_id=client.tax_id or '',
            line_items=line_items,
        )

        # Send email
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            return jsonify({'error': 'SMTP credentials not configured. Set SMTP_USERNAME and SMTP_PASSWORD environment variables.'}), 500

        client_name_clean = (client.client_name or 'Client').replace(' ', '_')
        filename = f'Invoice_{invoice_number}_{client_name_clean}.pdf'

        msg = MIMEMultipart()
        msg['From'] = SMTP_FROM
        msg['To'] = to_email
        if cc_email:
            msg['Cc'] = cc_email
        msg['Subject'] = subject

        body = (
            f"Dear {client.client_name or 'Valued Client'},\n\n"
            f"Please find attached your invoice #{invoice_number} from Edison General Insurance Service.\n\n"
            f"If you have any questions regarding this invoice, please contact us at {COMPANY_PHONE} "
            f"or email {COMPANY_EMAIL}.\n\n"
            f"Thank you for your business.\n\n"
            f"Best regards,\n"
            f"Edison General Insurance Service\n"
            f"{COMPANY_ADDRESS_1}\n"
            f"{COMPANY_ADDRESS_2}"
        )
        msg.attach(MIMEText(body, 'plain'))

        # Attach PDF
        pdf_data = pdf_buf.read()
        attachment = MIMEBase('application', 'pdf')
        attachment.set_payload(pdf_data)
        encoders.encode_base64(attachment)
        attachment.add_header('Content-Disposition', f'attachment; filename="{filename}"')
        msg.attach(attachment)

        # Send via SMTP
        recipients = [to_email]
        if cc_email:
            recipients.append(cc_email)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, recipients, msg.as_string())

        session.commit()

        return jsonify({
            'message': 'Invoice sent successfully',
            'invoice_number': invoice_number
        }), 200

    except smtplib.SMTPException as e:
        session.rollback()
        logging.error(f"SMTP error sending invoice: {e}")
        return jsonify({'error': f'Email sending failed: {str(e)}'}), 500
    except Exception as e:
        session.rollback()
        logging.error(f"Error sending invoice: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()
```

- [ ] **Step 5: Add COMPANY_PHONE and COMPANY_EMAIL imports**

Add at the top of customer_api.py after the invoice import:

```python
from api.invoice import generate_invoice_pdf, _collect_line_items, POLICY_LABELS, COMPANY_PHONE, COMPANY_EMAIL, COMPANY_ADDRESS_1, COMPANY_ADDRESS_2
```

Actually, since the email body in the route uses these constants, just define them inline in the route or import them. The simplest approach: use the constants directly in the `invoice_send` function body since they're hardcoded strings. Replace the references with string literals in the email body:

```python
body = (
    f"Dear {client.client_name or 'Valued Client'},\n\n"
    f"Please find attached your invoice #{invoice_number} from Edison General Insurance Service.\n\n"
    f"If you have any questions regarding this invoice, please contact us at 732-548-8700 "
    f"or email info@njgroups.com.\n\n"
    f"Thank you for your business.\n\n"
    f"Best regards,\n"
    f"Edison General Insurance Service\n"
    f"22 Meridian Road, Suite 16\n"
    f"Edison, NJ 08820"
)
```

- [ ] **Step 6: Verify the API starts without errors**

Run: `pkill -f customer_api.py; sleep 1; /usr/bin/python3 services/api/customer_api.py &`

Wait 3 seconds, then: `curl -s http://127.0.0.1:5001/api/health`

Expected: 200 OK

- [ ] **Step 7: Commit**

```bash
git add services/api/customer_api.py
git commit -m "feat: add invoice preview and send API endpoints"
```

---

### Task 4: Create InvoiceDialog React component

**Files:**
- Create: `webapp/customer-app/src/components/InvoiceDialog.js`

- [ ] **Step 1: Create the InvoiceDialog component**

Create `webapp/customer-app/src/components/InvoiceDialog.js`:

```jsx
import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Typography,
  Box,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import axios from 'axios';

const POLICY_LABELS = {
  general_liability: 'Commercial General Liability',
  property: 'Commercial Property',
  bop: 'Business Owners Policy',
  workers_comp: 'Workers Compensation',
  auto: 'Commercial Auto',
  epli: 'EPLI',
  nydbl: 'NYDBL',
  surety: 'Surety Bond',
  product_liability: 'Product Liability',
  flood: 'Flood',
  directors_officers: 'Directors & Officers',
  fiduciary: 'Fiduciary Bond',
  inland_marine: 'Inland Marine',
  umbrella: 'Umbrella Liability',
  professional_eo: 'Professional or E&O',
  cyber: 'Cyber Liability',
  crime: 'Crime or Fidelity Bond',
};

const SINGLE_PLAN_TYPES = [
  'general_liability', 'property', 'bop', 'workers_comp', 'auto',
  'epli', 'nydbl', 'surety', 'product_liability', 'flood',
  'directors_officers', 'fiduciary', 'inland_marine'
];

const MULTI_PLAN_TYPES = ['umbrella', 'professional_eo', 'cyber', 'crime'];

function getActivePolicies(commercial) {
  const policies = [];

  // Single-plan types
  for (const ptype of SINGLE_PLAN_TYPES) {
    const carrier = commercial[`${ptype}_carrier`];
    const premium = commercial[`${ptype}_premium`];
    const policyNumber = commercial[`${ptype}_policy_number`];
    const renewalDate = commercial[`${ptype}_renewal_date`];
    if (carrier || premium) {
      policies.push({
        type: ptype,
        label: POLICY_LABELS[ptype],
        carrier: carrier || '',
        policyNumber: policyNumber || '',
        premium: parseFloat(premium) || 0,
        renewalDate: renewalDate || '',
      });
    }
  }

  // Multi-plan types
  const plans = commercial.plans || {};
  for (const ptype of MULTI_PLAN_TYPES) {
    for (const plan of (plans[ptype] || [])) {
      if (plan.carrier || plan.premium) {
        policies.push({
          type: ptype,
          label: POLICY_LABELS[ptype],
          carrier: plan.carrier || '',
          policyNumber: plan.policy_number || '',
          premium: parseFloat(plan.premium) || 0,
          renewalDate: plan.renewal_date || '',
          planNumber: plan.plan_number,
        });
      }
    }
  }

  return policies;
}

export default function InvoiceDialog({ open, onClose, commercial, clientEmail }) {
  const activePolicies = useMemo(() => getActivePolicies(commercial || {}), [commercial]);
  const [selectedTypes, setSelectedTypes] = useState(() => activePolicies.map(p => p.type));
  const [toEmail, setToEmail] = useState(clientEmail || '');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedTypes(activePolicies.map(p => p.type));
      setToEmail(clientEmail || '');
      setCcEmail('');
      setSubject('');
      setError('');
      setSuccess('');
      setSending(false);
    }
  }, [open, activePolicies, clientEmail]);

  // Get unique selected types for API
  const uniqueSelectedTypes = [...new Set(selectedTypes)];

  const selectedPolicies = activePolicies.filter(p => selectedTypes.includes(p.type));
  const subtotal = selectedPolicies.reduce((sum, p) => sum + p.premium, 0);

  const handleToggle = (ptype) => {
    setSelectedTypes(prev => {
      if (prev.includes(ptype)) {
        return prev.filter(t => t !== ptype);
      }
      return [...prev, ptype];
    });
  };

  const handlePreview = async () => {
    if (uniqueSelectedTypes.length === 0) return;
    setError('');
    try {
      const response = await axios.post('/api/invoice/preview', {
        commercial_id: commercial.id,
        policy_types: uniqueSelectedTypes,
        invoice_date: new Date().toISOString().split('T')[0],
      }, { responseType: 'blob' });

      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData instanceof Blob) {
        const text = await errorData.text();
        try {
          setError(JSON.parse(text).error || 'Failed to generate preview');
        } catch {
          setError('Failed to generate preview');
        }
      } else {
        setError(errorData?.error || 'Failed to generate preview');
      }
    }
  };

  const handleSend = async () => {
    if (uniqueSelectedTypes.length === 0 || !toEmail) return;
    setError('');
    setSuccess('');
    setSending(true);
    try {
      const response = await axios.post('/api/invoice/send', {
        commercial_id: commercial.id,
        policy_types: uniqueSelectedTypes,
        invoice_date: new Date().toISOString().split('T')[0],
        to_email: toEmail,
        cc_email: ccEmail,
        subject: subject,
      });
      setSuccess(`Invoice #${response.data.invoice_number} sent successfully to ${toEmail}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Generate Invoice — {commercial?.client_name || 'Client'}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* Policy Selection */}
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          Select Policies to Invoice
        </Typography>
        <Box sx={{ border: '1px solid #ddd', borderRadius: 1, mb: 2 }}>
          {activePolicies.length === 0 ? (
            <Typography sx={{ p: 2, color: '#999' }}>No active policies found</Typography>
          ) : (
            activePolicies.map((policy, idx) => (
              <Box
                key={`${policy.type}-${policy.planNumber || idx}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  borderBottom: idx < activePolicies.length - 1 ? '1px solid #f0f0f0' : 'none',
                  bgcolor: selectedTypes.includes(policy.type) ? '#e3f2fd' : 'transparent',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: selectedTypes.includes(policy.type) ? '#bbdefb' : '#f5f5f5' },
                }}
                onClick={() => handleToggle(policy.type)}
              >
                <Checkbox
                  checked={selectedTypes.includes(policy.type)}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {policy.label}
                    {policy.planNumber > 1 ? ` (Plan ${policy.planNumber})` : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {policy.carrier}{policy.policyNumber ? ` — ${policy.policyNumber}` : ''}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 80, textAlign: 'right' }}>
                  ${policy.premium.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            ))
          )}
        </Box>

        <Box sx={{ textAlign: 'right', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Subtotal: ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Email Fields */}
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          Email Details
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            label="To"
            size="small"
            fullWidth
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            required
          />
          <TextField
            label="CC"
            size="small"
            fullWidth
            value={ccEmail}
            onChange={(e) => setCcEmail(e.target.value)}
            placeholder="Optional"
          />
          <TextField
            label="Subject"
            size="small"
            fullWidth
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Auto-generated if left blank"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={handlePreview} disabled={uniqueSelectedTypes.length === 0}>
          Preview PDF
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button
            onClick={handleSend}
            variant="contained"
            disabled={uniqueSelectedTypes.length === 0 || !toEmail || sending}
            startIcon={sending ? <CircularProgress size={16} /> : null}
          >
            {sending ? 'Sending...' : 'Send Invoice'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify it compiles**

The React dev server should auto-reload. Check the terminal for compilation errors.

- [ ] **Step 3: Commit**

```bash
git add webapp/customer-app/src/components/InvoiceDialog.js
git commit -m "feat: add InvoiceDialog component with policy picker and email form"
```

---

### Task 5: Integrate InvoiceDialog into CommercialModal

**Files:**
- Modify: `webapp/customer-app/src/components/CommercialModal.js`

- [ ] **Step 1: Add InvoiceDialog import**

Add at the top of `CommercialModal.js` after the existing imports (around line 29):

```javascript
import InvoiceDialog from './InvoiceDialog';
```

- [ ] **Step 2: Add invoice dialog state**

Add inside the CommercialModal component, after the existing state declarations (around line 100):

```javascript
const [invoiceOpen, setInvoiceOpen] = useState(false);
```

- [ ] **Step 3: Add "Generate Invoice" button in DialogActions**

Replace the DialogActions block (lines 929-936) in `CommercialModal.js`:

```jsx
<DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
  <Button
    onClick={() => setInvoiceOpen(true)}
    disabled={!commercial}
    variant="outlined"
    size="small"
  >
    Generate Invoice
  </Button>
  <Box sx={{ display: 'flex', gap: 1 }}>
    <Button onClick={onClose} color="inherit">
      Cancel
    </Button>
    <Button onClick={handleSave} variant="contained" color="primary">
      Save
    </Button>
  </Box>
</DialogActions>
```

Note: Import `Box` is already imported at the top of CommercialModal.js.

- [ ] **Step 4: Add InvoiceDialog render**

Add just before the closing `</Dialog>` tag (around line 937):

```jsx
<InvoiceDialog
  open={invoiceOpen}
  onClose={() => setInvoiceOpen(false)}
  commercial={commercial}
  clientEmail={selectedClient?.email || selectedClient?.contacts?.[0]?.email || ''}
/>
```

Where `selectedClient` is the client object found by `clients.find(c => c.tax_id === formData.tax_id)`. This is already computed in the component (around line 308). If it's computed inside the render, move the variable declaration before the return statement or use it inline.

- [ ] **Step 5: Verify the app compiles and the button appears**

Open http://localhost:3000, go to Commercial Insurance tab, edit a commercial record. The "Generate Invoice" button should appear in the bottom-left of the modal footer. It should be disabled for new records (when `commercial` prop is null).

- [ ] **Step 6: Commit**

```bash
git add webapp/customer-app/src/components/CommercialModal.js
git commit -m "feat: integrate InvoiceDialog into CommercialModal"
```

---

### Task 6: Write tests for invoice functionality

**Files:**
- Create: `services/tests/test_invoice.py`

- [ ] **Step 1: Write tests for PDF generation and API endpoints**

Create `services/tests/test_invoice.py`:

```python
"""Tests for invoice generation and sending."""

import pytest
import json
import io
import os
import sys

os.environ['DATABASE_URI'] = 'sqlite:///:memory:'
os.environ['LAN_ONLY'] = 'false'

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.customer_api import app, db, InvoiceSequence
from api import customer_api
from api.invoice import generate_invoice_pdf, _collect_line_items, POLICY_LABELS


@pytest.fixture(scope='function')
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.app_context():
        customer_api.Session = customer_api.sessionmaker(bind=db.engine)
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


@pytest.fixture
def setup_commercial(client):
    """Create a client + commercial record for testing."""
    client_data = {
        'tax_id': '12-3456789',
        'client_name': 'Test Corp',
        'status': 'Active',
        'contacts': [{
            'contact_person': 'John',
            'email': 'john@testcorp.com',
            'address_line_1': '100 Main St',
            'city': 'Edison',
            'state': 'NJ',
            'zip_code': '08820',
        }]
    }
    client.post('/api/clients', data=json.dumps(client_data), content_type='application/json')

    comm_data = {
        'tax_id': '12-3456789',
        'general_liability_carrier': 'Hartford',
        'general_liability_premium': 5000.0,
        'general_liability_renewal_date': '2026-06-01',
        'general_liability_policy_number': 'GL-001',
        'property_carrier': 'Zurich',
        'property_premium': 3000.0,
        'property_renewal_date': '2026-07-01',
        'auto_carrier': 'Travelers',
        'auto_premium': 2500.0,
        'auto_renewal_date': '2026-08-01',
    }
    resp = client.post('/api/commercial', data=json.dumps(comm_data), content_type='application/json')
    return json.loads(resp.data)['commercial']


class TestPDFGeneration:
    """Tests for invoice PDF generation."""

    def test_generate_pdf_returns_bytes(self):
        items = [
            {'label': 'General Liability', 'carrier': 'Hartford', 'policy_number': 'GL-001',
             'premium': 5000.0, 'renewal_date': '2026-06-01'},
        ]
        result = generate_invoice_pdf(
            invoice_number=100001,
            invoice_date='2026-04-02',
            client_name='Test Corp',
            client_address='100 Main St\nEdison, NJ 08820',
            client_tax_id='12-3456789',
            line_items=items,
        )
        assert isinstance(result, io.BytesIO)
        pdf_data = result.read()
        assert len(pdf_data) > 0
        assert pdf_data[:5] == b'%PDF-'

    def test_generate_pdf_multiple_items(self):
        items = [
            {'label': 'General Liability', 'carrier': 'Hartford', 'policy_number': 'GL-001',
             'premium': 5000.0, 'renewal_date': '2026-06-01'},
            {'label': 'Commercial Property', 'carrier': 'Zurich', 'policy_number': 'PR-001',
             'premium': 3000.0, 'renewal_date': '2026-07-01'},
        ]
        result = generate_invoice_pdf(
            invoice_number=100002,
            invoice_date='2026-04-02',
            client_name='Multi Policy Corp',
            client_address='200 Oak Ave\nNewark, NJ 07102',
            client_tax_id='99-8888888',
            line_items=items,
        )
        pdf_data = result.read()
        assert pdf_data[:5] == b'%PDF-'


class TestCollectLineItems:
    """Tests for _collect_line_items helper."""

    def test_single_plan_types(self):
        data = {
            'general_liability_carrier': 'Hartford',
            'general_liability_premium': 5000.0,
            'general_liability_policy_number': 'GL-001',
            'general_liability_renewal_date': '2026-06-01',
            'property_carrier': 'Zurich',
            'property_premium': 3000.0,
            'property_policy_number': 'PR-001',
            'property_renewal_date': '2026-07-01',
            'plans': {},
        }
        items = _collect_line_items(data, ['general_liability', 'property'])
        assert len(items) == 2
        assert items[0]['label'] == 'Commercial General Liability'
        assert items[0]['premium'] == 5000.0
        assert items[1]['label'] == 'Commercial Property'

    def test_multi_plan_types(self):
        data = {
            'plans': {
                'umbrella': [
                    {'carrier': 'Chubb', 'premium': 2000.0, 'policy_number': 'UMB-1', 'renewal_date': '2026-06-01'},
                ],
            },
        }
        items = _collect_line_items(data, ['umbrella'])
        assert len(items) == 1
        assert items[0]['label'] == 'Umbrella Liability'
        assert items[0]['premium'] == 2000.0

    def test_empty_policies_excluded(self):
        data = {'general_liability_carrier': '', 'general_liability_premium': None, 'plans': {}}
        items = _collect_line_items(data, ['general_liability'])
        assert len(items) == 0

    def test_unselected_types_excluded(self):
        data = {
            'general_liability_carrier': 'Hartford',
            'general_liability_premium': 5000.0,
            'property_carrier': 'Zurich',
            'property_premium': 3000.0,
            'plans': {},
        }
        items = _collect_line_items(data, ['general_liability'])
        assert len(items) == 1
        assert items[0]['label'] == 'Commercial General Liability'


class TestInvoiceSequence:
    """Tests for auto-incrementing invoice numbers."""

    def test_sequence_auto_increments(self, client):
        with app.app_context():
            session = customer_api.Session()
            n1 = InvoiceSequence.next_number(session)
            n2 = InvoiceSequence.next_number(session)
            session.commit()
            session.close()
            assert n2 == n1 + 1

    def test_sequence_starts_from_default(self, client):
        with app.app_context():
            session = customer_api.Session()
            n1 = InvoiceSequence.next_number(session)
            session.commit()
            session.close()
            assert n1 == 536659  # default 536658 + 1


class TestInvoicePreviewEndpoint:
    """Tests for POST /api/invoice/preview."""

    def test_preview_returns_pdf(self, client, setup_commercial):
        resp = client.post('/api/invoice/preview',
                          data=json.dumps({
                              'commercial_id': setup_commercial['id'],
                              'policy_types': ['general_liability'],
                          }),
                          content_type='application/json')
        assert resp.status_code == 200
        assert resp.content_type == 'application/pdf'
        assert resp.data[:5] == b'%PDF-'

    def test_preview_multiple_policies(self, client, setup_commercial):
        resp = client.post('/api/invoice/preview',
                          data=json.dumps({
                              'commercial_id': setup_commercial['id'],
                              'policy_types': ['general_liability', 'property', 'auto'],
                          }),
                          content_type='application/json')
        assert resp.status_code == 200
        assert resp.data[:5] == b'%PDF-'

    def test_preview_missing_commercial_id(self, client):
        resp = client.post('/api/invoice/preview',
                          data=json.dumps({'policy_types': ['general_liability']}),
                          content_type='application/json')
        assert resp.status_code == 400

    def test_preview_nonexistent_commercial(self, client):
        resp = client.post('/api/invoice/preview',
                          data=json.dumps({
                              'commercial_id': 99999,
                              'policy_types': ['general_liability'],
                          }),
                          content_type='application/json')
        assert resp.status_code == 404

    def test_preview_no_active_policies(self, client, setup_commercial):
        resp = client.post('/api/invoice/preview',
                          data=json.dumps({
                              'commercial_id': setup_commercial['id'],
                              'policy_types': ['flood'],  # not populated
                          }),
                          content_type='application/json')
        assert resp.status_code == 400


class TestInvoiceSendEndpoint:
    """Tests for POST /api/invoice/send."""

    def test_send_missing_email(self, client, setup_commercial):
        resp = client.post('/api/invoice/send',
                          data=json.dumps({
                              'commercial_id': setup_commercial['id'],
                              'policy_types': ['general_liability'],
                          }),
                          content_type='application/json')
        assert resp.status_code == 400
        assert 'to_email' in json.loads(resp.data)['error']

    def test_send_no_smtp_credentials(self, client, setup_commercial):
        """Without SMTP credentials, sending should fail gracefully."""
        resp = client.post('/api/invoice/send',
                          data=json.dumps({
                              'commercial_id': setup_commercial['id'],
                              'policy_types': ['general_liability'],
                              'to_email': 'test@example.com',
                          }),
                          content_type='application/json')
        assert resp.status_code == 500
        assert 'SMTP' in json.loads(resp.data)['error']
```

- [ ] **Step 2: Run the tests**

Run: `cd services && /usr/bin/python3 -m pytest tests/test_invoice.py -v`

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add services/tests/test_invoice.py
git commit -m "test: add comprehensive tests for invoice generation and API"
```

---

### Task 7: Final integration test

**Files:** None (manual verification)

- [ ] **Step 1: Restart the API**

Run: `pkill -f customer_api.py; sleep 1; /usr/bin/python3 services/api/customer_api.py &`

- [ ] **Step 2: Verify invoice preview works end-to-end**

Open http://localhost:3000, go to Commercial Insurance, edit a record that has active policies. Click "Generate Invoice" → select policies → click "Preview PDF". A PDF should open in a new tab matching the Edison General template.

- [ ] **Step 3: Run the full test suite**

Run: `cd services && /usr/bin/python3 -m pytest tests/test_core_functionality.py tests/test_schema_export_import_sync.py tests/test_invoice.py -v`

Expected: All tests pass.

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "feat: invoice generation for commercial policies with PDF and email"
git push
```
