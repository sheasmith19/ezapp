from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import git
from pydantic import BaseModel
from makeresume import BuildFromXML
from fastapi.responses import FileResponse
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
if not os.path.exists(RESUME_DIR):
    os.makedirs(RESUME_DIR)


@app.post("/save-resume")
async def save_resume(data: ResumeData):
    save_name = data.save_name.replace(" ", "_")
    
    # In a real app, you'd probably get a filename from a header or query param
    filename = os.path.join(RESUME_DIR, save_name + ".xml")
    
    pdf_filename = filename.replace(".xml", ".pdf")
    
    xml_data = data.xml.encode('utf-8')
    
    try:
        # Write the file
        with open(filename, "wb") as f:
            f.write(xml_data)
        
        # Turn into pdf
        BuildFromXML(filename, pdf_filename)
        
        # 2. Git Commit logic
        repo = git.Repo("/Users/sheasmith/Documents/resumes/")
        repo.index.add([os.path.abspath(pdf_filename)])
        repo.index.commit(f"Update resume: {os.path.basename(pdf_filename)}")
        
        return {"status": "success", "message": f"Saved and committed {pdf_filename}"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/list-resumes")
async def list_resumes():
    # Look for all .xml files in your resume directory
    files = [f for f in os.listdir(RESUME_DIR) if f.endswith('.xml')]
    return {"resumes": files}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)