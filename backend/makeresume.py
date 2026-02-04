from reportlab.lib.colors import black, grey
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (HRFlowable, ListFlowable, Paragraph,
                                SimpleDocTemplate, Spacer, Table, TableStyle)
import xml.etree.ElementTree as ET

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    name="Name",
    fontName="Times",
    fontSize=18,
    spaceAfter=12,
))

styles.add(ParagraphStyle(
    name="SectionHeader",
    fontName="Times",
    fontSize=12,
    textColor=black,
    spaceBefore=0,
    spaceAfter=6,
))

styles.add(ParagraphStyle(
    name="JobTitle",
    fontName="Times",
    fontSize=10,
))

styles.add(ParagraphStyle(
    name="DateLocation",
    fontName="Times",
    fontSize=10,
    alignment=TA_RIGHT
))

styles.add(ParagraphStyle(
    name="JobMeta",
    fontName="Times-Italic",
    fontSize=9,
    textColor=grey,
    spaceAfter=4,
))

styles.add(ParagraphStyle(
    name="Body",
    fontName="Times",
    fontSize=10,
    leading=14,
    spaceAfter=0,
))

styles.add(ParagraphStyle(
    name="Skills",
    fontName="Times-Italic",
    fontSize=10,
))


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
    return Paragraph(text, styles["Name"])

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
            Spacer(1, 8)]

def StyledSectionHeader(text: str):
    return [Paragraph(text, styles["SectionHeader"]),
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
        colWidths=[None, 1.25 * inch],
    )
    header.setStyle(JOB_HEADER_TABLE_STYLE)
    return [Spacer(1, 8), header]

def StyledSkills(skills: str):
    return Paragraph(skills, styles["Skills"])

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
    return [Spacer(1, 8), header]
    
    
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
            
            for skillgroup in skillgroups:
                category = get_txt(skillgroup, "category", "")
                items_elem = skillgroup.find("items")
                items = [item.text for item in items_elem.findall("item") if item.text] if items_elem is not None else []
                
                if category and items:
                    has_skills = True
                    items_str = ", ".join(items)
                    skill_text = f"<i>{category}:</i> {items_str}"
                    skill_items.append(Paragraph(skill_text, styles["Body"]))
            
            if has_skills:
                story.extend(StyledSectionHeader("Skills"))
                story.extend(skill_items)
                story.append(Spacer(1, 8))
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
            