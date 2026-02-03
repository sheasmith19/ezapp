from reportlab.lib.colors import black, grey
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (HRFlowable, ListFlowable, Paragraph,
                                SimpleDocTemplate, Spacer, Table, TableStyle)

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

def StyledContactInfo(text: str):
    return [Paragraph(text, styles['Body']), 
            Spacer(1, 8)]

def StyledSectionHeader(text: str):
    return [Paragraph(text, styles["SectionHeader"]),
            HRFlowable(
                width="100%",
                thickness=0.75,
                color="#999999",
                spaceBefore=0,
                spaceAfter=8,
            )
    ]

def StyledJobHeader(title: str, meta: str, date: str, location: str):
    header = Table(
        [
            [
                [Paragraph(f"<b>{title}</b>", styles["JobTitle"]), Paragraph(meta, styles["JobMeta"])],
                Paragraph(f"{date}<br/>{location}", styles["DateLocation"]),
            ]
        ],
        colWidths=[None, 1.25 * inch],
    )
    header.setStyle(JOB_HEADER_TABLE_STYLE)
    return header
    
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

story = []

story.append(StyledName("Shea Smith"))

story.extend(StyledContactInfo("sheamcabesmith@gmail.com | +1 (802) 999-5285 | Evanston, IL"))

story.extend(StyledSectionHeader("Education"))

story.append(StyledJobHeader(
    title="Northwestern University",
    meta="ANTICIPATED 2028, BS IN MECHANICAL ENGINEERING (ROBOTICS CONCENTRATION) | 3.95 GPA",
    date="Anticipated June 2028",
    location="Evanston, IL"
))

story.extend(StyledSectionHeader("Experience"))

story.append(StyledJobHeader(
    title="Beta Technologies",
    meta="2021 – Present · Remote",
    date="July 2024 – Present",
    location="Burlington, VT"
))

story.append(StyledResponsibility(
    "Collaborate with a team of engineers to design and implement autonomous systems for electric vertical takeoff and landing (eVTOL) aircraft."
))

doc.build(story)
