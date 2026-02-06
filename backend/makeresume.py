from reportlab.lib.colors import black, grey
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (HRFlowable, ListFlowable, Paragraph,
                                SimpleDocTemplate, Spacer, Table, TableStyle)
import xml.etree.ElementTree as ET
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# get the root direcotry of the project
import os
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 1. Register the font
# RegisterFont(internal_name, font_file_path)
pdfmetrics.registerFont(TTFont('Garamond', os.path.join(ROOT_DIR, 'backend/EB_Garamond/EBGaramond-VariableFont_wght.ttf')))
pdfmetrics.registerFont(TTFont('Garamond-I', os.path.join(ROOT_DIR, 'backend/EB_Garamond/EBGaramond-Italic-VariableFont_wght.ttf')))

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    name="Name",
    fontName="Garamond",
    fontSize=24,
    spaceAfter=18,
))

styles.add(ParagraphStyle(
    name="SectionHeader",
    fontName="Garamond",
    fontSize=14,
    textColor=black,
    spaceBefore=0,
    spaceAfter=6,
))

styles.add(ParagraphStyle(
    name="JobTitle",
    fontName="Garamond",
    fontSize=12,
))

styles.add(ParagraphStyle(
    name="DateLocation",
    fontName="Garamond",
    fontSize=12,
    alignment=TA_RIGHT
))

styles.add(ParagraphStyle(
    name="JobMeta",
    fontName="Garamond-I",
    fontSize=12,
    textColor=grey,
    spaceAfter=4,
))

styles.add(ParagraphStyle(
    name="Body",
    fontName="Garamond",
    fontSize=12,
    leading=14,
    spaceAfter=0,
))

styles.add(ParagraphStyle(
    name="Skills",
    fontName="Garamond-I",
    fontSize=12,
))


SECTION_SPACING = 8  # Spacing before section content and between sections

JOB_HEADER_TABLE_STYLE = (TableStyle(
    [("VALIGN", (0, 0), (-1, -1), "TOP"),
     ("LEFTPADDING", (0, 0), (-1, -1), 0),
     ("RIGHTPADDING", (0, 0), (-1, -1), 0),
     ("TOPPADDING", (0, 0), (-1, -1), 0),
     ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))

doc = SimpleDocTemplate(
    "resume.pdf",
    pagesize=LETTER,
    rightMargin=0.75 * inch,
    leftMargin=0.75 * inch,
    topMargin=0.75 * inch,
    bottomMargin=0.75 * inch,
)

def StyledName(text: str):
    return Paragraph(f"<b>{text}</b>", styles["Name"])

def StyledContactInfo(email: str, phone: str, location: str):
    # Build contact info only with non-empty fields
    contact_parts = []
    if email:
        contact_parts.append(email)
    if phone:
        contact_parts.append(phone)
    if location:
        contact_parts.append(location)
    
    contact_text = " | ".join(contact_parts) if contact_parts else ""
    return [Paragraph(contact_text, styles['Body']), 
            Spacer(1, 4)]

def StyledSectionHeader(text: str):
    return [Spacer(1, SECTION_SPACING), Paragraph(text, styles["SectionHeader"]),
            HRFlowable(
                width="100%",
                thickness=0.75,
                color="#999999",
                spaceBefore=0,
                spaceAfter=0,
            )
    ]

def StyledEduHeader(name: str, degree: str, gpa: str, graduation_date: str, location: str):
    header = Table(
        [
            [
                [Paragraph(f"<b>{name}</b>", styles["JobTitle"]), Paragraph(f"{degree} | GPA: {gpa}", styles["JobMeta"])],
                Paragraph(f"{graduation_date}<br/>{location}", styles["DateLocation"]),
            ]
        ],
        colWidths=[None, 1.5 * inch],
    )
    header.setStyle(JOB_HEADER_TABLE_STYLE)
    return [Spacer(1, SECTION_SPACING), header]

def StyledSkillItem(category: str, items: str, is_first: bool = False):
    spacing = SECTION_SPACING if is_first else 3
    skill_text = f"<font name=\"Garamond-I\">{category}:</font> {items}"
    return [Spacer(1, spacing), Paragraph(skill_text, styles["Body"])]

def StyledJobHeader(company: str, location: str, duration: str, position: str):
    header = Table(
        [
            [
                [Paragraph(f"<b>{company}</b>", styles["JobTitle"]), Paragraph(position, styles["JobMeta"])],
                Paragraph(f"{duration}<br/>{location}", styles["DateLocation"]),
            ]
        ],
        colWidths=[None, 1.25 * inch],
    )
    header.setStyle(JOB_HEADER_TABLE_STYLE)
    return [Spacer(1, SECTION_SPACING), header]
    
    
def StyledResponsibility(text: str):
    return ListFlowable(
            [
                Paragraph(
                    text,
                    styles["Body"],
                )
            ],
            bulletType="bullet",
            bulletFontName="Helvetica",
            bulletFontSize=14,   # 👈 smaller bullet
            leftIndent=12,     # controls hanging indent
        )

def get_txt(el, tag, default=""):
    """Safely extracts text or returns an empty string."""
    found = el.find(tag)
    if found is not None and found.text is not None:
        return found.text.strip()
    return default

def BuildFromXML(xml_path: str, output_path: str):
    doc = SimpleDocTemplate(
    output_path,
    pagesize=LETTER,
    rightMargin=0.75 * inch,
    leftMargin=0.75 * inch,
    topMargin=0.75 * inch,
    bottomMargin=0.75 * inch,
)
    story = []
    
    tree = ET.parse(xml_path)
    root = tree.getroot()
    for child in root:
        if child.tag == "personal_info":
            name = get_txt(child, "name", "")
            email = get_txt(child, "email", "")
            phone = get_txt(child, "phone", "")
            location = get_txt(child, "location", "")
            story.append(StyledName(name))
            story.extend(StyledContactInfo(email, phone, location))
        elif child.tag == "education":
            for institution in child.findall("institution"):
                story.extend(StyledSectionHeader("Education"))
                name = get_txt(institution, "name", "")
                degree = get_txt(institution, "degree", "")
                gpa = get_txt(institution, "gpa", "")
                graduation_date = get_txt(institution, "graduation_date", "")
                location = get_txt(institution, "location", "")
                story.extend(StyledEduHeader(name, degree, gpa, graduation_date, location))
        elif child.tag == "skills":
            skillgroups = child.findall("skillgroup")
            # Only add Skills section if there are skillgroups with content
            has_skills = False
            skill_items = []
            is_first_skill = True
            
            for skillgroup in skillgroups:
                category = get_txt(skillgroup, "category", "")
                items_elem = skillgroup.find("items")
                items = [item.text for item in items_elem.findall("item") if item.text] if items_elem is not None else []
                
                if category and items:
                    has_skills = True
                    items_str = ", ".join(items)
                    skill_items.extend(StyledSkillItem(category, items_str, is_first=is_first_skill))
                    is_first_skill = False
            
            if has_skills:
                story.extend(StyledSectionHeader("Skills"))
                story.extend(skill_items)
        elif child.tag == "experience":
            jobs = child.findall("job")
            # Only add Experience section if there are jobs
            if jobs:
                story.extend(StyledSectionHeader("Experience"))
                for job in jobs:
                    company = get_txt(job, "company", "")
                    location = get_txt(job, "location", "")
                    duration = get_txt(job, "duration", "")
                    position = get_txt(job, "position", "")
                    story.extend(StyledJobHeader(company, location, duration, position))
                    responsibilities = job.find("responsibilities")
                    for resp in responsibilities.findall("responsibility"):
                        story.append(StyledResponsibility(resp.text))
    
    doc.build(story)
            