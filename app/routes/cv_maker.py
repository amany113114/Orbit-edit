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
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

logger = logging.getLogger("orbit.cv_maker")
router = APIRouter(prefix="/api/generate-cv", tags=["CV Maker"])

TEMP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../storage/temp"))
os.makedirs(TEMP_DIR, exist_ok=True)

class CVExperienceItem(BaseModel):
    title: str = "Senior Fullstack Engineer"
    company: str = "TechCorp Solutions"
    dates: str = "2023 - Present"
    location: str = "Gurugram, India"
    description: str = "Led architecture and development of high-throughput web applications using FastAPI, React, and Python."

class CVEducationItem(BaseModel):
    degree: str = "B.Tech in Computer Science"
    school: str = "Indian Institute of Technology (IIT)"
    dates: str = "2019 - 2023"
    location: str = "New Delhi, India"

class CVRequest(BaseModel):
    full_name: str = "Aman Sharma"
    job_title: str = "Senior Software & AI Engineer"
    email: str = "aman.sharma@example.com"
    phone: str = "+91 98765 43210"
    location: str = "New Delhi, India"
    website: Optional[str] = "https://github.com/aman-sharma"
    summary: str = "Results-driven Senior Software Engineer with 5+ years of experience designing scalable web platforms, AI models, and cloud microservices."
    skills: List[str] = ["Python", "FastAPI", "React.js", "Node.js", "Docker", "AWS", "SQL", "Git"]
    template: str = "modern" # modern, executive, minimal
    experience: List[CVExperienceItem]
    education: List[CVEducationItem]

def cleanup_file(filepath: str):
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        logger.error(f"Error removing temp file {filepath}: {e}")

@router.post("")
async def generate_cv_pdf(req: CVRequest):
    if not req.full_name.strip():
        raise HTTPException(status_code=400, detail="Full name is required.")

    file_id = uuid.uuid4().hex[:8]
    clean_name = req.full_name.replace(" ", "_")
    output_filename = f"orbit_cv_{clean_name}_{file_id}.pdf"
    output_filepath = os.path.join(TEMP_DIR, output_filename)

    doc = SimpleDocTemplate(output_filepath, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []

    styles = getSampleStyleSheet()

    # Template Color Scheme
    if req.template == "executive":
        primary_color = colors.HexColor("#1A365D") # Navy
        accent_color = colors.HexColor("#2B6CB0")
    elif req.template == "minimal":
        primary_color = colors.HexColor("#2D3748") # Slate
        accent_color = colors.HexColor("#4A5568")
    else: # modern
        primary_color = colors.HexColor("#00F0FF") # Neon Cyan / Indigo
        accent_color = colors.HexColor("#7000FF")

    title_style = ParagraphStyle(
        'CVTitle',
        parent=styles['Heading1'],
        fontSize=24,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=2
    )
    subtitle_style = ParagraphStyle(
        'CVSubtitle',
        parent=styles['Heading2'],
        fontSize=12,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#0284C7"),
        spaceAfter=8
    )
    contact_style = ParagraphStyle(
        'CVContact',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor("#475569"),
        leading=13
    )
    section_heading = ParagraphStyle(
        'CVSection',
        parent=styles['Heading2'],
        fontSize=12,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=10,
        spaceAfter=4
    )
    body_bold = ParagraphStyle(
        'CVBodyBold',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#1E293B")
    )
    body_style = ParagraphStyle(
        'CVBody',
        parent=styles['Normal'],
        fontSize=9.5,
        textColor=colors.HexColor("#334155"),
        leading=13.5
    )

    # 1. Header Section
    story.append(Paragraph(req.full_name, title_style))
    story.append(Paragraph(req.job_title, subtitle_style))

    contact_parts = [req.email, req.phone, req.location]
    if req.website:
        contact_parts.append(req.website)
    contact_line = " | ".join(contact_parts)
    story.append(Paragraph(contact_line, contact_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284C7"), spaceAfter=12))

    # 2. Executive Summary
    if req.summary.strip():
        story.append(Paragraph("PROFESSIONAL SUMMARY", section_heading))
        story.append(Paragraph(req.summary, body_style))
        story.append(Spacer(1, 10))

    # 3. Work Experience
    if req.experience:
        story.append(Paragraph("WORK EXPERIENCE", section_heading))
        story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E1"), spaceAfter=8))

        for exp in req.experience:
            header_table = Table([
                [Paragraph(f"<b>{exp.title}</b> — {exp.company}", body_bold), Paragraph(f"<i>{exp.dates} | {exp.location}</i>", ParagraphStyle('RightText', parent=contact_style, alignment=2))]
            ], colWidths=[360, 180])
            header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
            story.append(header_table)
            if exp.description.strip():
                story.append(Paragraph(exp.description, body_style))
            story.append(Spacer(1, 8))

    # 4. Education
    if req.education:
        story.append(Paragraph("EDUCATION", section_heading))
        story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E1"), spaceAfter=8))

        for edu in req.education:
            edu_table = Table([
                [Paragraph(f"<b>{edu.degree}</b> — {edu.school}", body_bold), Paragraph(f"<i>{edu.dates} | {edu.location}</i>", ParagraphStyle('RightText2', parent=contact_style, alignment=2))]
            ], colWidths=[360, 180])
            edu_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
            story.append(edu_table)
            story.append(Spacer(1, 6))

    # 5. Technical Skills
    if req.skills:
        story.append(Paragraph("SKILLS & TECHNOLOGIES", section_heading))
        story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E1"), spaceAfter=8))
        skills_str = ", ".join(req.skills)
        story.append(Paragraph(skills_str, body_style))

    doc.build(story)

    return FileResponse(
        path=output_filepath,
        filename=f"CV_{clean_name}.pdf",
        media_type="application/pdf",
        background=BackgroundTask(cleanup_file, output_filepath)
    )
