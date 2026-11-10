import os
import io
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from starlette.background import BackgroundTask
from fastapi.responses import FileResponse
from pydantic import BaseModel

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

logger = logging.getLogger("orbit.invoice")
router = APIRouter(prefix="/api/generate-invoice", tags=["Indian GST Invoice Generator"])

TEMP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../storage/temp"))
os.makedirs(TEMP_DIR, exist_ok=True)

class GSTInvoiceItem(BaseModel):
    description: str = "Web Application Development Service"
    hsn_sac: str = "998314" # HSN/SAC Code
    quantity: float = 1.0
    unit: str = "NOS"
    unit_price: float = 50000.0

class GSTInvoiceRequest(BaseModel):
    invoice_number: str = "GST/2026-27/089"
    invoice_date: str = "2026-09-18"
    due_date: str = "2026-10-18"
    
    # Supplier Details
    supplier_name: str = "ORBIT Digital Technologies Pvt. Ltd."
    supplier_address: str = "Plot 42, Cyber City, Sector 24, Gurugram, Haryana - 122002"
    supplier_gstin: str = "06AAAAA0000A1Z5"
    supplier_pan: str = "AAAAA0000A"
    supplier_state: str = "Haryana"
    supplier_state_code: str = "06"
    
    # Recipient Details
    recipient_name: str = "Apex Tech Enterprises India Pvt. Ltd."
    recipient_address: str = "BKC Complex, Bandra East, Mumbai, Maharashtra - 400051"
    recipient_gstin: str = "27BBBBB1111B1Z2"
    recipient_state: str = "Maharashtra"
    recipient_state_code: str = "27"
    
    # GST Parameters
    gst_rate: float = 18.0 # Total GST percentage (e.g. 18%)
    is_interstate: bool = True # True => IGST, False => CGST + SGST
    place_of_supply: str = "27 - Maharashtra"
    notes: Optional[str] = "Bank Account: HDFC Bank • Account No: 50200012345678 • IFSC: HDFC0000123"
    
    items: List[GSTInvoiceItem]

def cleanup_file(filepath: str):
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        logger.error(f"Error removing temp file {filepath}: {e}")

def number_to_words_indian(num: float) -> str:
    """Converts a number to Indian Rupee Words (Lakhs & Crores format)."""
    units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
             "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def convert_below_thousand(n):
        res = ""
        if n >= 100:
            res += units[n // 100] + " Hundred "
            n %= 100
        if n >= 20:
            res += tens[n // 10] + " "
            n %= 10
        if n > 0:
            res += units[n] + " "
        return res

    rupees = int(num)
    paise = int(round((num - rupees) * 100))

    if rupees == 0:
        words = "Zero Rupees"
    else:
        crores = rupees // 10000000
        rupees %= 10000000
        lakhs = rupees // 100000
        rupees %= 100000
        thousands = rupees // 1000
        rupees %= 1000

        parts = []
        if crores > 0:
            parts.append(convert_below_thousand(crores) + "Crore")
        if lakhs > 0:
            parts.append(convert_below_thousand(lakhs) + "Lakh")
        if thousands > 0:
            parts.append(convert_below_thousand(thousands) + "Thousand")
        if rupees > 0:
            parts.append(convert_below_thousand(rupees))

        words = "Rupees " + " ".join(parts).strip()

    if paise > 0:
        words += f" and {convert_below_thousand(paise).strip()} Paise"
    
    return words + " Only"

@router.post("")
async def generate_gst_invoice_pdf(req: GSTInvoiceRequest):
    if not req.items:
        raise HTTPException(status_code=400, detail="Invoice must contain at least one item.")

    file_id = uuid.uuid4().hex[:8]
    clean_num = req.invoice_number.replace("/", "_").replace("\\", "_")
    output_filename = f"orbit_gst_invoice_{clean_num}_{file_id}.pdf"
    output_filepath = os.path.join(TEMP_DIR, output_filename)

    doc = SimpleDocTemplate(output_filepath, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    story = []

    styles = getSampleStyleSheet()
    
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#111111'),
        leading=13
    )
    bold_style = ParagraphStyle(
        'BoldStyle',
        parent=header_style,
        fontName='Helvetica-Bold'
    )
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#00F0FF'),
        alignment=1,
        spaceAfter=10
    )

    # Title
    story.append(Paragraph("<b>TAX INVOICE</b>", title_style))
    story.append(Spacer(1, 10))

    # Supplier & Invoice Metadata Table
    supplier_info = f"<b>{req.supplier_name}</b><br/>{req.supplier_address}<br/><b>GSTIN:</b> {req.supplier_gstin} | <b>PAN:</b> {req.supplier_pan}<br/><b>State:</b> {req.supplier_state} (Code: {req.supplier_state_code})"
    invoice_meta = f"<b>Invoice No:</b> {req.invoice_number}<br/><b>Invoice Date:</b> {req.invoice_date}<br/><b>Due Date:</b> {req.due_date}<br/><b>Place of Supply:</b> {req.place_of_supply}"

    meta_table = Table([
        [Paragraph(supplier_info, header_style), Paragraph(invoice_meta, header_style)]
    ], colWidths=[310, 240])
    meta_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#151932')),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP')
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # Recipient Details Table
    recipient_info = f"<b>Details of Receiver / Billed To:</b><br/><b>{req.recipient_name}</b><br/>{req.recipient_address}<br/><b>GSTIN:</b> {req.recipient_gstin}<br/><b>State:</b> {req.recipient_state} (Code: {req.recipient_state_code})"
    
    rec_table = Table([[Paragraph(recipient_info, header_style)]], colWidths=[550])
    rec_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFFFFF')),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(rec_table)
    story.append(Spacer(1, 15))

    # Items Table
    headers = ["Item Description", "HSN/SAC", "Qty", "Unit", "Rate (₹)", "Amount (₹)"]
    table_data = [[Paragraph(f"<b>{h}</b>", bold_style) for h in headers]]

    taxable_subtotal = 0.0
    for item in req.items:
        row_total = item.quantity * item.unit_price
        taxable_subtotal += row_total
        table_data.append([
            Paragraph(item.description, header_style),
            Paragraph(item.hsn_sac, header_style),
            Paragraph(str(item.quantity), header_style),
            Paragraph(item.unit, header_style),
            Paragraph(f"₹ {item.unit_price:,.2f}", header_style),
            Paragraph(f"₹ {row_total:,.2f}", header_style)
        ])

    # Calculate GST Tax Split
    if req.is_interstate:
        igst_pct = req.gst_rate
        igst_amt = (taxable_subtotal * igst_pct) / 100.0
        cgst_amt = 0.0
        sgst_amt = 0.0
        total_tax = igst_amt
    else:
        cgst_pct = req.gst_rate / 2.0
        sgst_pct = req.gst_rate / 2.0
        cgst_amt = (taxable_subtotal * cgst_pct) / 100.0
        sgst_amt = (taxable_subtotal * sgst_pct) / 100.0
        igst_amt = 0.0
        total_tax = cgst_amt + sgst_amt

    grand_total = taxable_subtotal + total_tax

    # Add Subtotal & GST Rows
    table_data.append(["", "", "", "", Paragraph("<b>Taxable Value:</b>", header_style), Paragraph(f"₹ {taxable_subtotal:,.2f}", header_style)])
    
    if req.is_interstate:
        table_data.append(["", "", "", "", Paragraph(f"<b>IGST ({req.gst_rate:.1f}%):</b>", header_style), Paragraph(f"₹ {igst_amt:,.2f}", header_style)])
    else:
        table_data.append(["", "", "", "", Paragraph(f"<b>CGST ({req.gst_rate/2.0:.1f}%):</b>", header_style), Paragraph(f"₹ {cgst_amt:,.2f}", header_style)])
        table_data.append(["", "", "", "", Paragraph(f"<b>SGST ({req.gst_rate/2.0:.1f}%):</b>", header_style), Paragraph(f"₹ {sgst_amt:,.2f}", header_style)])

    table_data.append(["", "", "", "", Paragraph("<b>Grand Total:</b>", bold_style), Paragraph(f"<b>₹ {grand_total:,.2f}</b>", bold_style)])

    items_table = Table(table_data, colWidths=[200, 65, 45, 45, 95, 100])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#151932')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (2,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-len(table_data)+len(req.items)), 0.5, colors.HexColor('#CBD5E1')),
        ('LINEBELOW', (-2,-1), (-1,-1), 1.5, colors.HexColor('#00F0FF')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 15))

    # Amount in Words Box
    words_str = number_to_words_indian(grand_total)
    words_box = Table([[Paragraph(f"<b>Amount in Words:</b> {words_str}", header_style)]], colWidths=[550])
    words_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(words_box)
    story.append(Spacer(1, 15))

    # Notes & Authorised Signatory
    notes_p = Paragraph(f"<b>Notes & Terms:</b><br/>{req.notes or 'Payment due within 30 days.'}", header_style)
    sign_p = Paragraph(f"<b>For {req.supplier_name}</b><br/><br/><br/><b>Authorised Signatory</b>", ParagraphStyle('Sign', parent=header_style, alignment=2))

    footer_table = Table([[notes_p, sign_p]], colWidths=[350, 200])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP')
    ]))
    story.append(footer_table)

    doc.build(story)

    return FileResponse(
        path=output_filepath,
        filename=f"GST_Invoice_{clean_num}.pdf",
        media_type="application/pdf",
        background=BackgroundTask(cleanup_file, output_filepath)
    )
