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
COMPANY_EMAIL = "tejal@njgroups.com"

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


def _parse_coverage_key(raw):
    """A coverage selection is either '<ptype>' (legacy: every plan of that
    type) or '<ptype>:<index>' (specific plan within a multi-plan coverage)."""
    s = str(raw)
    if ':' in s:
        ptype, _, idx_str = s.partition(':')
        try:
            return ptype, int(idx_str)
        except (TypeError, ValueError):
            return ptype, None
    return s, None


def _collect_line_items(commercial_data, policy_types):
    """Collect invoice line items from commercial data for the given coverage keys.

    Keys may be bare policy types (e.g. 'umbrella' = all umbrella plans) or
    indexed for multi-plan coverages (e.g. 'umbrella:0' = the first plan only)."""
    items = []
    plans = commercial_data.get('plans', {})

    for raw in policy_types:
        ptype, idx = _parse_coverage_key(raw)
        label = POLICY_LABELS.get(ptype, ptype.replace('_', ' ').title())

        if ptype in MULTI_PLAN_TYPES:
            entries = plans.get(ptype, [])
            targets = (
                [(idx, entries[idx])]
                if idx is not None and 0 <= idx < len(entries)
                else list(enumerate(entries))
            )
            for i, plan in targets:
                carrier = plan.get('carrier') or ''
                premium = plan.get('premium') or 0
                if carrier or premium:
                    suffix = f' #{i + 1}' if len(entries) > 1 else ''
                    items.append({
                        'label': f'{label}{suffix}',
                        'carrier': carrier,
                        'policy_number': plan.get('policy_number') or '',
                        'premium': float(premium) if premium else 0,
                        'renewal_date': plan.get('renewal_date') or '',
                        'insured_entities': plan.get('insured_entities') or '',
                    })
        else:
            carrier = commercial_data.get(f'{ptype}_carrier') or ''
            premium = commercial_data.get(f'{ptype}_premium') or 0
            if carrier or premium:
                items.append({
                    'label': label,
                    'carrier': carrier,
                    'policy_number': commercial_data.get(f'{ptype}_policy_number') or '',
                    'premium': float(premium) if premium else 0,
                    'renewal_date': commercial_data.get(f'{ptype}_renewal_date') or '',
                    'insured_entities': commercial_data.get(f'{ptype}_insured_entities') or '',
                })

    return items


def coverage_labels_for_key(raw, commercial_data):
    """Labels a given coverage key would resolve to, matching what ends up in
    policies_description. Used for the pending-invoice overlap check so the
    comparison stays exact even after per-plan selection landed."""
    ptype, idx = _parse_coverage_key(raw)
    base = POLICY_LABELS.get(ptype, ptype.replace('_', ' ').title())

    if ptype not in MULTI_PLAN_TYPES:
        return [base]

    entries = (commercial_data.get('plans') or {}).get(ptype, [])
    if idx is not None and 0 <= idx < len(entries):
        suffix = f' #{idx + 1}' if len(entries) > 1 else ''
        return [f'{base}{suffix}']
    # Bare key for a multi-plan type = every plan of that type
    return [f'{base}{(" #" + str(i + 1)) if len(entries) > 1 else ""}'
            for i in range(len(entries))]


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
    """Get date + 1 year for effective date range, formatted M/D/YY.

    Uses manual formatting rather than strftime('%-m/%-d/%y') because the
    Unix `%-` flag is not recognised on Windows and raises ValueError,
    which used to silently produce an empty end date on the Windows box.
    """
    if not date_str:
        return ''
    try:
        if isinstance(date_str, str):
            dt = datetime.strptime(date_str[:10], '%Y-%m-%d')
        else:
            dt = date_str
        end = dt.replace(year=dt.year + 1)
        return f'{end.month}/{end.day}/{end.strftime("%y")}'
    except (ValueError, TypeError):
        return ''


def _fmt(dt):
    """Format a date object as M/D/YY without leading zeros (cross-platform)."""
    return f'{dt.month}/{dt.day}/{dt.strftime("%y")}'


def _effective_range(date_str):
    """Return (start_str, end_str) for the invoice effective-date cell.

    The rule is anchored on the renewal date:
      * renewal_date in the future  -> the current policy period is
        (renewal_date - 1 year) to renewal_date; invoice covers that period.
      * renewal_date today or past  -> the new policy period is
        renewal_date to (renewal_date + 1 year); invoice covers that period.

    Returns ('', '') if the date can't be parsed.
    """
    if not date_str:
        return '', ''
    try:
        if isinstance(date_str, str):
            dt = datetime.strptime(date_str[:10], '%Y-%m-%d').date()
        else:
            dt = date_str
            if hasattr(dt, 'date'):
                dt = dt.date()
        today = datetime.now().date()
        if dt > today:
            start = dt.replace(year=dt.year - 1)
            end = dt
        else:
            start = dt
            end = dt.replace(year=dt.year + 1)
        return _fmt(start), _fmt(end)
    except (ValueError, TypeError):
        return '', ''


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
        date_start, date_end = _effective_range(item['renewal_date'])
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
        Paragraph(f'<b>DIRECT ALL INQUIRIES TO:</b><br/>email: {COMPANY_EMAIL}<br/>{COMPANY_PHONE}', style_footer),
        Paragraph(f'<b>MAKE ALL CHECKS PAYABLE TO:</b><br/>{COMPANY_NAME}<br/>{COMPANY_ADDRESS_1}<br/>{COMPANY_ADDRESS_2}<br/><br/><i>For ACH, please fill and return the attached form.</i>', style_footer),
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

    # --- ACH PAYMENT AUTHORIZATION FORM (new page) ---
    from reportlab.platypus import PageBreak
    elements.append(PageBreak())

    FORM_GREY = colors.HexColor('#F0F0F0')

    ach_label_style = ParagraphStyle('ach_label', parent=styles['Normal'], fontSize=9, leading=12, fontName='Helvetica-Bold')
    ach_body_style = ParagraphStyle('ach_body', parent=styles['Normal'], fontSize=9, leading=12)
    ach_section_style = ParagraphStyle('ach_section', parent=styles['Normal'], fontSize=9, leading=12, fontName='Helvetica-Bold')
    ach_note_style = ParagraphStyle('ach_note', parent=styles['Normal'], fontSize=8, leading=11, textColor=colors.HexColor('#c0392b'), fontName='Helvetica-Bold')

    # Title — same navy banner as invoice header
    ach_header_data = [[
        Paragraph(f'<font color="white" size="14"><b>ACH PAYMENT AUTHORIZATION FORM</b></font>', styles['Normal']),
        Paragraph(f'<font color="white" size="8">{COMPANY_NAME}<br/>{COMPANY_PHONE} &bull; {COMPANY_EMAIL}</font>', styles['Normal']),
    ]]
    ach_header_table = Table(ach_header_data, colWidths=[page_width * 0.6, page_width * 0.4])
    ach_header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (0, 0), 12),
        ('RIGHTPADDING', (1, 0), (1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(ach_header_table)
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(
        '&#9654; Complete all fields and attach a voided check or bank letter. Information is kept strictly confidential.',
        ParagraphStyle('ach_note_top', parent=styles['Normal'], fontSize=8, leading=11, textColor=colors.grey)
    ))
    elements.append(Spacer(1, 10))

    # Section: BANK ACCOUNT INFORMATION — same grey header as invoice table
    section_bar = Table([[Paragraph('BANK ACCOUNT INFORMATION', ach_section_style)]], colWidths=[page_width])
    section_bar.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#C0C0C0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(section_bar)
    elements.append(Spacer(1, 8))

    # Helper: form field row (label + blank box, label + blank box)
    def _form_row(label1, label2=None):
        half = page_width * 0.48
        box_w = half * 0.6
        data = [[
            Paragraph(f'<b>{label1}</b>', ach_label_style), '',
        ]]
        if label2:
            data[0].extend([Paragraph(f'<b>{label2}</b>', ach_label_style), ''])
            cols = [half * 0.35, box_w, half * 0.35, box_w]
        else:
            cols = [half * 0.35, box_w + half + box_w * 0.35]
        t = Table(data, colWidths=cols, rowHeights=[28])
        style_cmds = [
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (1, 0), (1, 0), FORM_GREY),
            ('BOX', (1, 0), (1, 0), 0.5, colors.HexColor('#c0c0c0')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]
        if label2:
            style_cmds.extend([
                ('BACKGROUND', (3, 0), (3, 0), FORM_GREY),
                ('BOX', (3, 0), (3, 0), 0.5, colors.HexColor('#c0c0c0')),
            ])
        t.setStyle(TableStyle(style_cmds))
        return t

    elements.append(_form_row('Bank Name:', 'Bank Phone:'))
    elements.append(Spacer(1, 4))
    elements.append(_form_row('Account Holder\nName:', 'Routing Number:'))
    elements.append(Spacer(1, 4))
    elements.append(_form_row('Account Number:', 'Confirm Account\nNumber:'))
    elements.append(Spacer(1, 6))

    # Account Type row
    acct_type_data = [[
        Paragraph('<b>Account Type:</b>', ach_label_style),
        Paragraph(
            '<font name="Courier" size="11">[ ]</font> Checking &nbsp;&nbsp;'
            '<font name="Courier" size="11">[ ]</font> Savings &nbsp;&nbsp;'
            '<font name="Courier" size="11">[ ]</font> Business Checking &nbsp;&nbsp;'
            '<font name="Courier" size="11">[ ]</font> Business Savings',
            ach_body_style
        ),
    ]]
    acct_type_table = Table(acct_type_data, colWidths=[page_width * 0.17, page_width * 0.83], rowHeights=[28])
    acct_type_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(acct_type_table)
    elements.append(Spacer(1, 10))

    # Section: AUTHORIZATION AGREEMENT — same grey header
    auth_bar = Table([[Paragraph('AUTHORIZATION AGREEMENT', ach_section_style)]], colWidths=[page_width])
    auth_bar.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#C0C0C0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(auth_bar)
    elements.append(Spacer(1, 6))

    elements.append(Paragraph(
        f'By signing below, I/we authorize <b>{COMPANY_NAME}</b> to initiate ACH entries to/from the account above. '
        f'This authorization remains in effect until written notice of revocation is received with reasonable time to act.',
        ach_body_style
    ))
    elements.append(Spacer(1, 6))

    # ACH Type row
    ach_type_data = [[
        Paragraph('<b>ACH Type:</b>', ach_label_style),
        Paragraph(
            '<font name="Courier" size="11">[ ]</font> Withdrawal (Debit) &nbsp;&nbsp;'
            '<font name="Courier" size="11">[ ]</font> Deposit (Credit) &nbsp;&nbsp;'
            '<font name="Courier" size="11">[ ]</font> Both',
            ach_body_style
        ),
    ]]
    ach_type_table = Table(ach_type_data, colWidths=[page_width * 0.17, page_width * 0.83], rowHeights=[28])
    ach_type_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(ach_type_table)
    elements.append(Spacer(1, 10))

    # Signature row
    elements.append(_form_row('Authorized\nSignature:', 'Date:'))
    elements.append(Spacer(1, 6))
    elements.append(_form_row('Print Name:', 'Title:'))
    elements.append(Spacer(1, 12))

    # Attach note — same box style as invoice subtotal row
    attach_bar = Table([[Paragraph(
        '<b>ATTACH:</b> Voided check &mdash;or&mdash; bank letter &mdash;or&mdash; '
        'bank statement showing name, routing &amp; account number',
        ParagraphStyle('attach', parent=styles['Normal'], fontSize=8, leading=11, fontName='Helvetica-Bold')
    )]], colWidths=[page_width])
    attach_bar.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), FORM_GREY),
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(attach_bar)

    doc.build(elements)
    buf.seek(0)
    return buf
