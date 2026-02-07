# save the resume to the git repo and push
import os
from makeresume import BuildFromXML
import git

# Use Documents/resumes folder (cross-platform)
RESUME_DIR = os.path.join(os.path.expanduser("~"), "Documents", "resumes")
PDF_DIR = os.path.join(RESUME_DIR, "pdf")

outputPath = os.path.join(PDF_DIR, "resume_from_xml.pdf")

BuildFromXML("resume.xml", outputPath)

repo = git.Repo(RESUME_DIR)
repo.index.add([outputPath])
repo.index.commit("Update resume_from_xml.pdf")
origin = repo.remote(name="origin")
origin.push()