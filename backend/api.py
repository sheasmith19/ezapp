from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import git
from pydantic import BaseModel
from typing import Optional
from makeresume import BuildFromXML
from fastapi.responses import FileResponse
import xml.etree.ElementTree as ET
import jwt
from jwt import PyJWKClient
from dotenv import load_dotenv
import ssl
import certifi

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

# Fix macOS SSL certificate issue
ssl_context = ssl.create_default_context(cafile=certifi.where())

# Supabase JWKS endpoint for ES256 token verification
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://yypvpoqstsfrfgenjmyo.supabase.co")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
jwks_client = PyJWKClient(JWKS_URL, ssl_context=ssl_context)
print(f"[DEBUG] JWKS URL: {JWKS_URL}")

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Verify the Supabase JWT and return the user ID (sub claim)."""
    token = credentials.credentials
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no user ID")
        return user_id
    except Exception as e:
        print(f"[DEBUG] JWT decode failed: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# Define the paths
RESUME_DIR = "resumes"
OUTPUT_DIR = "outputs"

class MarginSettings(BaseModel):
    top: Optional[float] = 0.75
    bottom: Optional[float] = 0.75
    left: Optional[float] = 0.75
    right: Optional[float] = 0.75

class ResumeData(BaseModel):
    xml: str
    save_name: str
    margins: Optional[MarginSettings] = None
    
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

# Base resumes directory
BASE_RESUME_DIR = os.path.join(os.path.expanduser("~"), "Documents", "resumes")
os.makedirs(BASE_RESUME_DIR, exist_ok=True)


def user_dirs(user_id: str):
    """Return (xml_dir, pdf_dir) for a given Supabase user, creating them if needed."""
    user_dir = os.path.join(BASE_RESUME_DIR, user_id)
    xml_dir = os.path.join(user_dir, "xml")
    pdf_dir = os.path.join(user_dir, "pdf")
    os.makedirs(xml_dir, exist_ok=True)
    os.makedirs(pdf_dir, exist_ok=True)
    return xml_dir, pdf_dir


@app.post("/save-resume")
async def save_resume(data: ResumeData, user_id: str = Depends(get_current_user)):
    xml_dir, pdf_dir = user_dirs(user_id)
    save_name = data.save_name.replace(" ", "_")

    xml_filename = os.path.join(xml_dir, save_name + ".xml")
    pdf_filename = os.path.join(pdf_dir, save_name + ".pdf")

    xml_data = data.xml.encode('utf-8')

    try:
        with open(xml_filename, "wb") as f:
            f.write(xml_data)

        # Prepare margins dict for BuildFromXML
        margins_dict = None
        if data.margins:
            margins_dict = {
                'top': data.margins.top,
                'bottom': data.margins.bottom,
                'left': data.margins.left,
                'right': data.margins.right
            }
        
        BuildFromXML(xml_filename, pdf_filename, margins=margins_dict)

        # Git commit (optional – skip if not a repo)
        try:
            repo = git.Repo(BASE_RESUME_DIR)
            repo.index.add([os.path.abspath(pdf_filename), os.path.abspath(xml_filename)])
            repo.index.commit(f"Update resume: {save_name}")
        except git.InvalidGitRepositoryError:
            pass

        return {"status": "success", "message": f"Saved {save_name}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/list-resumes")
async def list_resumes(user_id: str = Depends(get_current_user)):
    _, pdf_dir = user_dirs(user_id)
    try:
        files = [f for f in os.listdir(pdf_dir) if f.endswith('.pdf')]
        return {"resumes": files}
    except Exception as e:
        return {"resumes": [], "error": str(e)}

@app.delete("/delete-resume/{resume_name}")
async def delete_resume(resume_name: str, user_id: str = Depends(get_current_user)):
    xml_dir, pdf_dir = user_dirs(user_id)
    try:
        xml_filename = os.path.join(xml_dir, resume_name.replace('.pdf', '.xml'))
        pdf_filename = os.path.join(pdf_dir, resume_name)

        deleted_files = []
        for path in [xml_filename, pdf_filename]:
            if os.path.exists(path):
                os.remove(path)
                deleted_files.append(path)

        if not deleted_files:
            raise HTTPException(status_code=404, detail="Resume files not found")

        return {"status": "success", "message": f"Deleted resume: {resume_name}", "deleted_files": deleted_files}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-resume/{resume_name}")
async def get_resume(resume_name: str, user_id: str = Depends(get_current_user)):
    xml_dir, _ = user_dirs(user_id)
    try:
        xml_filename = os.path.join(xml_dir, resume_name.replace('.pdf', '.xml'))

        if not os.path.exists(xml_filename):
            raise HTTPException(status_code=404, detail="Resume XML not found")

        with open(xml_filename, 'r', encoding='utf-8') as f:
            xml_content = f.read()

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
            "experience": [],
            "margins": {
                "top": float(root.findtext('margins/top', '0.75')),
                "bottom": float(root.findtext('margins/bottom', '0.75')),
                "left": float(root.findtext('margins/left', '0.75')),
                "right": float(root.findtext('margins/right', '0.75'))
            }
        }

        for edu in root.findall('education/institution'):
            resume_data["education"].append({
                "institution": edu.findtext('name', ''),
                "degree": edu.findtext('degree', ''),
                "gpa": edu.findtext('gpa', ''),
                "date": edu.findtext('graduation_date', ''),
                "location": edu.findtext('location', '')
            })

        for skillgroup in root.findall('skills/skillgroup'):
            category = skillgroup.findtext('category', '')
            items = [item.text for item in skillgroup.findall('items/item') if item.text]
            if category or items:
                resume_data["skills"].append({"category": category, "items": items})

        for job in root.findall('experience/job'):
            responsibilities = [res.text or '' for res in job.findall('responsibilities/responsibility')]
            resume_data["experience"].append({
                "company": job.findtext('company', ''),
                "location": job.findtext('location', ''),
                "duration": job.findtext('duration', ''),
                "position": job.findtext('position', ''),
                "responsibilities": responsibilities
            })

        return resume_data

    except ET.ParseError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse XML: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/resumes")
async def resumes(user_id: str = Depends(get_current_user)):
    """Return JSON array of the current user's resume PDFs."""
    _, pdf_dir = user_dirs(user_id)
    try:
        files = [f for f in os.listdir(pdf_dir) if f.endswith('.pdf')]
        return [{"name": f, "filename": f} for f in files]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download-resume/{resume_name}")
async def download_resume(resume_name: str, user_id: str = Depends(get_current_user)):
    _, pdf_dir = user_dirs(user_id)
    pdf_filename = os.path.join(pdf_dir, resume_name)
    if not os.path.exists(pdf_filename):
        raise HTTPException(status_code=404, detail="Resume not found")
    response = FileResponse(pdf_filename, media_type='application/pdf', filename=resume_name)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)