"""PDF generation utilities for invoices and receipts using ReportLab."""
import io
from calendar import month_name
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Colour palette ─────────────────────────────────────────────────────────────
PRIMARY = colors.HexColor('#1e40af')   # blue-800
LIGHT_BG = colors.HexColor('#eff6ff')  # blue-50
DARK_TEXT = colors.HexColor('#1e293b') # slate-800
MID_TEXT = colors.HexColor('#475569')  # slate-600
BORDER = colors.HexColor('#cbd5e1')    # slate-300
SUCCESS = colors.HexColor('#16a34a')   # green-600


def _styles():
    ss = getSampleStyleSheet()
    h1 = ParagraphStyle('H1', parent=ss['Heading1'], fontSize=18, textColor=PRIMARY, spaceAfter=4)
    h2 = ParagraphStyle('H2', parent=ss['Heading2'], fontSize=12, textColor=DARK_TEXT, spaceAfter=2)
    body = ParagraphStyle('Body', parent=ss['Normal'], fontSize=9, textColor=DARK_TEXT, leading=13)
    small = ParagraphStyle('Small', parent=ss['Normal'], fontSize=8, textColor=MID_TEXT, leading=11)
    label = ParagraphStyle('Label', parent=ss['Normal'], fontSize=8, textColor=MID_TEXT, leading=11)
    value = ParagraphStyle('Value', parent=ss['Normal'], fontSize=9, textColor=DARK_TEXT, leading=13)
    total = ParagraphStyle('Total', parent=ss['Normal'], fontSize=11, textColor=PRIMARY,
                            fontName='Helvetica-Bold', leading=14)
    return h1, h2, body, small, label, value, total


def _info_table(rows, col_widths):
    """Two-column label/value table."""
    style = TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ])
    return Table(rows, colWidths=col_widths, style=style)


def generate_invoice_pdf(invoice):
    """Return bytes of a PDF invoice for the given Invoice instance."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )
    h1, h2, body, small, label, value, total_style = _styles()
    W = A4[0] - 4*cm   # usable width
    story = []

    # Header
    story.append(Paragraph(invoice.unit.apartment.name, h1))
    story.append(Paragraph(invoice.unit.apartment.address, small))
    story.append(Paragraph(invoice.unit.apartment.city, small))
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(width='100%', thickness=1.5, color=PRIMARY))
    story.append(Spacer(1, 0.3*cm))

    # Invoice title + meta
    invoice_no = f'INV-{invoice.id:05d}'
    period = f'{month_name[invoice.month]} {invoice.year}'
    header_rows = [
        [Paragraph('INVOICE', ParagraphStyle('invtitle', fontSize=20, textColor=PRIMARY,
                                              fontName='Helvetica-Bold')),
         Paragraph(f'<b>{invoice_no}</b>', ParagraphStyle('invno', fontSize=10,
                                                           textColor=DARK_TEXT, alignment=2))],
    ]
    story.append(Table(header_rows, colWidths=[W*0.6, W*0.4],
                        style=TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE')])))
    story.append(Spacer(1, 0.4*cm))

    # Billed-to / Invoice details side-by-side
    l, v = label, value
    bill_rows = [
        [Paragraph('BILLED TO', l), Paragraph('INVOICE DATE', l)],
        [Paragraph(invoice.tenant.get_full_name(), v), Paragraph(str(invoice.invoice_date), v)],
        [Paragraph(f'Unit: {invoice.unit.unit_number}', v), Paragraph('DUE DATE', l)],
        [Paragraph(f'Period: {period}', v), Paragraph(str(invoice.due_date), v)],
        [Paragraph(f'Phone: {invoice.tenant.phone or "—"}', small), Paragraph('STATUS', l)],
        [Paragraph(invoice.tenant.email, small),
         Paragraph(invoice.get_status_display().upper(), v)],
    ]
    story.append(_info_table(bill_rows, [W*0.55, W*0.45]))
    story.append(Spacer(1, 0.5*cm))

    # Line-items table
    item_data = [
        [Paragraph('<b>Description</b>', body),
         Paragraph('<b>Amount (KES)</b>', ParagraphStyle('amt', parent=body, alignment=2))],
        [Paragraph('Base Rent', body),
         Paragraph(f'{invoice.base_rent:,.2f}', ParagraphStyle('amt', parent=body, alignment=2))],
    ]
    for item in invoice.line_items.all():
        item_data.append([
            Paragraph(item.description, body),
            Paragraph(f'{item.amount:,.2f}', ParagraphStyle('amt', parent=body, alignment=2)),
        ])

    item_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ])
    story.append(Table(item_data, colWidths=[W*0.65, W*0.35], style=item_style))
    story.append(Spacer(1, 0.3*cm))

    # Totals block
    totals_data = [
        ['Total Amount:', f'KES {invoice.total_amount:,.2f}'],
        ['Amount Paid:', f'KES {invoice.amount_paid:,.2f}'],
        ['Balance Due:', f'KES {invoice.remaining_balance:,.2f}'],
    ]
    totals_style = TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 2), (-1, 2), 11),
        ('TEXTCOLOR', (0, 2), (-1, 2), PRIMARY),
        ('LINEABOVE', (0, 2), (-1, 2), 1, PRIMARY),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ])
    story.append(Table(totals_data, colWidths=[W*0.65, W*0.35], style=totals_style))

    if invoice.notes:
        story.append(Spacer(1, 0.4*cm))
        story.append(Paragraph(f'<b>Notes:</b> {invoice.notes}', small))

    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph('Thank you for your tenancy.', small))

    doc.build(story)
    buf.seek(0)
    return buf.read()


def generate_receipt_pdf(payment):
    """Return bytes of a PDF receipt for the given Payment instance."""
    buf = io.BytesIO()
    invoice = payment.invoice
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )
    h1, h2, body, small, label, value, total_style = _styles()
    W = A4[0] - 4*cm
    story = []

    # Header
    story.append(Paragraph(invoice.unit.apartment.name, h1))
    story.append(Paragraph(invoice.unit.apartment.address, small))
    story.append(Paragraph(invoice.unit.apartment.city, small))
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(width='100%', thickness=1.5, color=SUCCESS))
    story.append(Spacer(1, 0.3*cm))

    # Receipt title
    story.append(Paragraph('PAYMENT RECEIPT', ParagraphStyle(
        'rctitle', fontSize=20, textColor=SUCCESS, fontName='Helvetica-Bold')))
    story.append(Paragraph(f'Receipt No: RCT-{payment.id:05d}', small))
    story.append(Spacer(1, 0.4*cm))

    # Details
    period = f'{month_name[invoice.month]} {invoice.year}'
    rows = [
        [Paragraph('RECEIVED FROM', label), Paragraph('PAYMENT DATE', label)],
        [Paragraph(invoice.tenant.get_full_name(), value), Paragraph(str(payment.payment_date), value)],
        [Paragraph(f'Unit: {invoice.unit.unit_number}', value), Paragraph('PAYMENT METHOD', label)],
        [Paragraph(f'Period: {period}', value), Paragraph(payment.get_method_display(), value)],
        [Paragraph(invoice.tenant.email, small),
         Paragraph(f'Ref: {payment.reference_number or "—"}', small)],
    ]
    story.append(_info_table(rows, [W*0.55, W*0.45]))
    story.append(Spacer(1, 0.5*cm))

    # Amount box
    amt_data = [
        ['AMOUNT PAID', f'KES {payment.amount:,.2f}'],
        ['Invoice Total', f'KES {invoice.total_amount:,.2f}'],
        ['Total Paid (invoice)', f'KES {invoice.amount_paid:,.2f}'],
        ['Remaining Balance', f'KES {invoice.remaining_balance:,.2f}'],
    ]
    amt_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SUCCESS),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ])
    story.append(Table(amt_data, colWidths=[W*0.6, W*0.4], style=amt_style))

    if payment.notes:
        story.append(Spacer(1, 0.4*cm))
        story.append(Paragraph(f'<b>Notes:</b> {payment.notes}', small))

    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph('This is an official payment receipt. Please retain for your records.', small))

    doc.build(story)
    buf.seek(0)
    return buf.read()
