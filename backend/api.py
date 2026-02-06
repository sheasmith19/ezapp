from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import git
from pydantic import BaseModel
from backend.makeresume import BuildFromXML
from fastapi.responses import FileResponse
import xml.etree.ElementTree as ET
import os

# Define the paths
RESUME_DIR = "resumes"
OUTPUT_DIR = "outputs"

class ResumeData(BaseModel):
    xml: str
    save_name: str
    
# Create folders if they don't exist
for folder in [RESUME_DIR, OUTPUT_DIR]:
    if not os.path.exists(folder):
        os.makedirs(folder)
        print(f"Created folder: {folder}")

app = FastAPI()

# Enable CORS so your React app (running on localhost:5173) can talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

RESUME_DIR = "/Users/sheasmith/Documents/resumes"
XML_DIR = os.path.join(RESUME_DIR, "xml")
PDF_DIR = os.path.join(RESUME_DIR, "pdf")

for folder in [RESUME_DIR, XML_DIR, PDF_DIR]:
    if not os.path.exists(folder):
        os.makedirs(folder)


@app.post("/save-resume")
async def save_resume(data: ResumeData):
    save_name = data.save_name.replace(" ", "_")
    
    # Save XML to xml subfolder
    xml_filename = os.path.join(XML_DIR, save_name + ".xml")
    
    # Save PDF to pdf subfolder
    pdf_filename = os.path.join(PDF_DIR, save_name + ".pdf")
    
    xml_data = data.xml.encode('utf-8')
    
    try:
        # Write the XML file
        with open(xml_filename, "wb") as f:
            f.write(xml_data)
        
        # Turn into PDF
        BuildFromXML(xml_filename, pdf_filename)
        
        # 2. Git Commit logic
        repo = git.Repo("/Users/sheasmith/Documents/resumes/")
        repo.index.add([os.path.abspath(pdf_filename), os.path.abspath(xml_filename)])
        repo.index.commit(f"Update resume: {os.path.basename(pdf_filename)}")
        
        return {"status": "success", "message": f"Saved and committed {pdf_filename}"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/list-resumes")
async def list_resumes():
    # Look for all .pdf files in the pdf subfolder
    try:
        files = [f for f in os.listdir(PDF_DIR) if f.endswith('.pdf')]
        return {"resumes": files}
    except Exception as e:
        return {"resumes": [], "error": str(e)}

@app.delete("/delete-resume/{resume_name}")
async def delete_resume(resume_name: str):
    try:
        # Delete both XML and PDF files from their subfolders
        xml_filename = os.path.join(XML_DIR, resume_name.replace('.pdf', '.xml'))
        pdf_filename = os.path.join(PDF_DIR, resume_name)
        
        print(f"DEBUG: Attempting to delete: {pdf_filename}")
        print(f"DEBUG: Also looking for: {xml_filename}")
        print(f"DEBUG: PDF exists: {os.path.exists(pdf_filename)}")
        print(f"DEBUG: XML exists: {os.path.exists(xml_filename)}")
        
        deleted_files = []
        errors = []
        
        if os.path.exists(xml_filename):
            try:
                os.remove(xml_filename)
                deleted_files.append(xml_filename)
                print(f"DEBUG: Deleted XML: {xml_filename}")
            except Exception as e:
                errors.append(f"Failed to delete XML: {str(e)}")
                print(f"ERROR deleting XML: {str(e)}")
        
        if os.path.exists(pdf_filename):
            try:
                os.remove(pdf_filename)
                deleted_files.append(pdf_filename)
                print(f"DEBUG: Deleted PDF: {pdf_filename}")
            except Exception as e:
                errors.append(f"Failed to delete PDF: {str(e)}")
                print(f"ERROR deleting PDF: {str(e)}")
        
        if not deleted_files:
            raise HTTPException(status_code=404, detail=f"Resume files not found. Looked for: {pdf_filename}")
        
        if errors:
            return {"status": "partial", "message": f"Deleted some files", "deleted_files": deleted_files, "errors": errors}
        
        return {"status": "success", "message": f"Deleted resume: {resume_name}", "deleted_files": deleted_files}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in delete_resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-resume/{resume_name}")
async def get_resume(resume_name: str):
    # Fetch the XML file for a specific resume
    try:
        # Try the exact match first
        xml_filename = os.path.join(XML_DIR, resume_name.replace('.pdf', '.xml'))
        
        print(f"DEBUG: Looking for resume at: {xml_filename}")
        print(f"DEBUG: Files in directory: {os.listdir(XML_DIR)}")
        
        # If not found, try to find any XML with similar name
        if not os.path.exists(xml_filename):
            xml_files = [f for f in os.listdir(XML_DIR) if f.endswith('.xml')]
            print(f"DEBUG: Available XML files: {xml_files}")
            if not xml_files:
                raise HTTPException(status_code=404, detail=f"No XML file found. Looking for: {xml_filename}. Only PDF exists?")
            # Use the first XML file if exact match not found
            xml_filename = os.path.join(XML_DIR, xml_files[0])
            print(f"DEBUG: Using fallback XML: {xml_filename}")
        
        with open(xml_filename, 'r') as f:
            xml_content = f.read()
        
        # Parse XML and convert to JSON structure
        root = ET.fromstring(xml_content)
        
        resume_data = {
            "save_name": resume_name.replace('.pdf', ''),
            "personal": {
                "name": root.findtext('personal_info/name', ''),
                "email": root.findtext('personal_info/email', ''),
                "phone": root.findtext('personal_info/phone', ''),
                "location": root.findtext('personal_info/location', '')
            },
            "education": [],
            "skills": [],
            "experience": []
        }
        
        # Parse education
        for edu in root.findall('education/institution'):
            resume_data["education"].append({
                "institution": edu.findtext('name', ''),
                "degree": edu.findtext('degree', ''),
                "gpa": edu.findtext('gpa', ''),
                "date": edu.findtext('graduation_date', ''),
                "location": edu.findtext('location', '')
            })
        
        # Parse skills
        skills = []
        for skillgroup in root.findall('skills/skillgroup'):
            category = skillgroup.findtext('category', '')
            items = [item.text for item in skillgroup.findall('items/item') if item.text]
            if category or items:
                skills.append({
                    "category": category,
                    "items": items
                })
        resume_data["skills"] = skills
        
        # Parse experience
        for job in root.findall('experience/job'):
            responsibilities = [res.text or '' for res in job.findall('responsibilities/responsibility')]
            resume_data["experience"].append({
                "company": job.findtext('company', ''),
                "location": job.findtext('location', ''),
                "duration": job.findtext('duration', ''),
                "position": job.findtext('position', ''),
                "responsibilities": responsibilities
            })
        
        print(f"DEBUG: Successfully parsed resume: {resume_name}")
        return resume_data
    
    except ET.ParseError as e:
        print(f"ERROR: XML Parse error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse XML: {str(e)}")
    except Exception as e:
        print(f"ERROR: General error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/resumes")
async def resumes():
    """Return a JSON array of available resume PDFs (filename only).
    The popup builds the download URL using the API base + `/download-resume/{filename}`.
    """
    try:
        files = [f for f in os.listdir(PDF_DIR) if f.endswith('.pdf')]
        items = [{"name": f, "filename": f} for f in files]
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download-resume/{resume_name}")
async def download_resume(resume_name: str):
    # Serve the PDF file for the requested resume
    pdf_filename = os.path.join(PDF_DIR, resume_name)
    if not os.path.exists(pdf_filename):
        raise HTTPException(status_code=404, detail="Resume not found")
    response = FileResponse(pdf_filename, media_type='application/pdf', filename=resume_name)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)