import pdfplumber

def extract_pages(pdf_path):
    pages_text = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            pages_text.append(text or "")
    return pages_text

from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

def rebuild_pdf(pages_text, output_path):
    c = canvas.Canvas(output_path, pagesize=LETTER)
    width, height = LETTER

    for page_text in pages_text:
        text_obj = c.beginText()
        text_obj.setTextOrigin(1 * inch, height - 1 * inch)
        text_obj.setFont("Helvetica", 11)

        for line in page_text.split("\n"):
            text_obj.textLine(line)

        c.drawText(text_obj)
        c.showPage()

    c.save()

input_pdf = "A-resume.pdf"
output_pdf = "output.pdf"

pages = extract_pages(input_pdf)
rebuild_pdf(pages, output_pdf)