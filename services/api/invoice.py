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

MULTI_PLAN_TYPES = {'umbrella', 'professional_eo', 'cyber', 'crime'}


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
                        'insured_entities': plan.get('insured_entities') or '',
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
                    'insured_entities': commercial_data.get(f'{ptype}_insured_entities') or '',
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
        return f'{dt.month}/{dt.day}/{dt.strftime("%y")}'
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
    invoice_number, invoice_date, client_name, client_address, client_tax_id, line_items,
    is_binding=False,
):
    """Generate a PDF invoice matching the Edison General Insurance template."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter,
        leftMargin=0.5 * inch, rightMargin=0.5 * inch,
        topMargin=0.4 * inch, bottomMargin=0.4 * inch,
    )

    styles = getSampleStyleSheet()
    elements = []
    page_width = letter[0] - 1.0 * inch

    # --- HEADER ---
    invoice_title = 'BINDER INVOICE' if is_binding else 'INVOICE'
    header_data = [[
        Paragraph(f'<font color="white" size="16"><b>{COMPANY_NAME}</b></font>', styles['Normal']),
        Paragraph(f'<font color="white" size="18"><b>{invoice_title}</b></font>', styles['Normal']),
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
    if isinstance(invoice_date, str):
        try:
            dt = datetime.strptime(invoice_date[:10], '%Y-%m-%d')
            display_date = f'{dt.strftime("%B")} {dt.day}, {dt.year}'
        except ValueError:
            display_date = invoice_date
    else:
        display_date = f'{invoice_date.strftime("%B")} {invoice_date.day}, {invoice_date.year}'

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

    meta_data = [[Paragraph(left_text, style_small), Paragraph(right_text, style_right)]]
    meta_table = Table(meta_data, colWidths=[page_width * 0.55, page_width * 0.45])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(meta_table)

    elements.append(Paragraph(f'<b>Make checks payable to:</b> {COMPANY_NAME}', style_small))
    elements.append(Spacer(1, 10))

    # --- LINE ITEMS TABLE ---
    subtotal = sum(item['premium'] for item in line_items)
    table_data = [['Effective Date', 'DESCRIPTION', 'AMOUNT']]

    desc_style = ParagraphStyle('desc_cell', parent=styles['Normal'], fontSize=9, leading=11)

    for item in line_items:
        date_start = _format_date(item['renewal_date'])
        date_end = _end_date(item['renewal_date'])
        date_cell = f'{date_start}\nto\n{date_end}' if date_start else ''
        desc_parts = [item['label']]
        if item['policy_number']:
            desc_parts.append(f"Policy No. {item['policy_number']}")
        if item['carrier']:
            desc_parts.append(f"Carrier: {item['carrier']}")
        if item.get('insured_entities'):
            desc_parts.append(f"Insured Entities: {item['insured_entities']}")
        # Wrap in Paragraph so long lines (e.g., many co-insurers) wrap within the column
        desc_cell = Paragraph('<br/>'.join(desc_parts), desc_style)
        amount_cell = f"${item['premium']:,.2f}"
        table_data.append([date_cell, desc_cell, amount_cell])

    remit_text = (
        '\n\nPlease remit all payments to:\n\n'
        f'{COMPANY_NAME.upper()}\n'
        f'{COMPANY_ADDRESS_1.upper()}\n'
        f'{COMPANY_ADDRESS_2.upper()}'
    )
    table_data.append(['', remit_text, ''])
    subtotal_label = 'BINDER DEPOSIT (25% of Premium)' if is_binding else 'SUBTOTAL'
    table_data.append(['', subtotal_label, f'${subtotal:,.2f}'])

    col_widths = [page_width * 0.15, page_width * 0.6, page_width * 0.25]
    items_table = Table(table_data, colWidths=col_widths, repeatRows=1)

    num_rows = len(table_data)
    subtotal_row = num_rows - 1
    remit_row = num_rows - 2

    items_style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#C0C0C0')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, 0), 1, colors.black),
        ('LINEAFTER', (0, 1), (0, remit_row), 0.5, colors.grey),
        ('LINEAFTER', (1, 1), (1, remit_row), 0.5, colors.grey),
        ('BOX', (0, 0), (-1, remit_row), 1.5, colors.black),
        ('BACKGROUND', (0, subtotal_row), (-1, subtotal_row), colors.HexColor('#F0F0F0')),
        ('FONTNAME', (0, subtotal_row), (-1, subtotal_row), 'Helvetica-Bold'),
        ('LINEABOVE', (0, subtotal_row), (-1, subtotal_row), 1.5, colors.black),
        ('BOX', (0, subtotal_row), (-1, subtotal_row), 1.5, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]
    for i in range(1, remit_row):
        items_style.append(('LINEBELOW', (0, i), (-1, i), 0.5, colors.HexColor('#DDDDDD')))

    items_table.setStyle(TableStyle(items_style))
    elements.append(items_table)

    if is_binding:
        binding_style = ParagraphStyle('binding_note', parent=styles['Normal'], fontSize=9, leading=12, textColor=NAVY)
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(
            '<b>BINDER INVOICE</b> — This invoice represents 25% of the total annual premium '
            'due as a binder deposit to bind coverage. The remaining balance will be invoiced separately.',
            binding_style
        ))

    elements.append(Spacer(1, 16))

    # --- FOOTER ---
    style_footer = ParagraphStyle('footer', parent=styles['Normal'], fontSize=8, leading=11)
    style_pay = ParagraphStyle('pay_box', parent=styles['Normal'], fontSize=9, leading=12, alignment=TA_CENTER)

    footer_data = [[
        Paragraph(f'<b>DIRECT ALL INQUIRIES TO:</b><br/>Accounts Department<br/>{COMPANY_PHONE}<br/>email: {COMPANY_EMAIL}', style_footer),
        Paragraph(f'<b>MAKE ALL CHECKS PAYABLE TO:</b><br/>{COMPANY_NAME}<br/>{COMPANY_ADDRESS_1}<br/>{COMPANY_ADDRESS_2}', style_footer),
        Paragraph(f'<b>PAY THIS<br/>AMOUNT</b><br/><b>${subtotal:,.2f}</b>', style_pay),
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

    style_thanks = ParagraphStyle('thanks', parent=styles['Normal'], fontSize=11, leading=14, alignment=TA_CENTER)
    elements.append(Paragraph('<b><i>THANK YOU FOR YOUR BUSINESS!</i></b>', style_thanks))

    doc.build(elements)
    buf.seek(0)
    return buf
