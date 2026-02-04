# save the resume to the git repo and push
from backend.makeresume import BuildFromXML
import git

outputPath = "/Users/sheasmith/Documents/resumes/resume_from_xml.pdf"

BuildFromXML("resume.xml", outputPath)

repo = git.Repo("/Users/sheasmith/Documents/resumes/")
repo.index.add([outputPath])
repo.index.commit("Update resume_from_xml.pdf")
origin = repo.remote(name="origin")
origin.push()