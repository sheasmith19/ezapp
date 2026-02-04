import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BuildResume() {
  const [resume, setResume] = useState({
    save_name: "Resume 1",
    personal: { name: "", email: "", phone: "", location: "" },
    education: [],
    experience: []
  });
  const navigate = useNavigate();

  // --- 1. Resume State Management ---
  const updateName = (val) => setResume({ ...resume, save_name: val });

  const updatePersonal = (field, val) => setResume({ ...resume, personal: { ...resume.personal, [field]: val } });

  const addArrayItem = (section, template) => setResume({ ...resume, [section]: [...resume[section], template] });

  const updateArrayItem = (section, index, field, val) => {
    const updated = [...resume[section]];
    updated[index][field] = val;
    setResume({ ...resume, [section]: updated });
  };

  const updateResponsibility = (jobIdx, resIdx, val) => {
    const updatedExp = [...resume.experience];
    updatedExp[jobIdx].responsibilities[resIdx] = val;
    setResume({ ...resume, experience: updatedExp });
  };

  const addResponsibility = (jobIdx) => {
    const updatedExp = [...resume.experience];
    updatedExp[jobIdx].responsibilities.push("");
    setResume({ ...resume, experience: updatedExp });
  };

  // --- The XML Generator ---
  const generateXML = () => {
    const { personal, education, experience } = resume;
    return `<?xml version="1.0" encoding="UTF-8"?>
            <resume>
              <personal_info>
                <name>${personal.name}</name>
                <email>${personal.email}</email>
                <phone>${personal.phone}</phone>
                <location>${personal.location}</location>
              </personal_info>
              <education>
                ${education.map(edu => `
                <institution>
                  <name>${edu.institution}</name>
                  <degree>${edu.degree}</degree>
                  <gpa>${edu.gpa}</gpa>
                  <graduation_date>${edu.date}</graduation_date>
                  <location>${edu.location}</location>
                </institution>`).join('')}
              </education>
              <experience>
                ${experience.map(job => `
                <job>
                  <company>${job.company}</company>
                  <location>${job.location}</location>
                  <duration>${job.duration}</duration>
                  <position>${job.position}</position>
                  <responsibilities>
                    ${job.responsibilities.map(res => `<responsibility>${res}</responsibility>`).join('')}
                  </responsibilities>
                </job>`).join('')}
              </experience>
            </resume>`;
  };

  const handleSave = async () => {
    const xml = generateXML();
    try {
      const res = await fetch('http://localhost:8000/save-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xml: xml,
          save_name: resume.save_name
        })
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message); // Success!
      } else {
        // This will show you the EXACT error from Python in an alert
        alert(`Error ${res.status}: ${data.detail || 'Unknown Error'}`);
      }

    } catch (err) { alert("Save failed. Is backend running?"); }
  };

  return (
    <div className="build-page">
      <div className="form-side">
        <h2>Resume Editor</h2>

        {/* RESUME NAME */}
        <div className="section">
          <h3>Resume Name</h3>
          <input placeholder="Resume Name" value={resume.save_name} onChange={e => updateName(e.target.value)} />
        </div>
        {/* PERSONAL INFO */}
        <div className="section">
          <h3>Personal Info</h3>
          <input placeholder="Name" value={resume.personal.name} onChange={e => updatePersonal('name', e.target.value)} />
          <input placeholder="Email" value={resume.personal.email} onChange={e => updatePersonal('email', e.target.value)} />
          <input placeholder="Phone" value={resume.personal.phone} onChange={e => updatePersonal('phone', e.target.value)} />
          <input placeholder="Location" value={resume.personal.location} onChange={e => updatePersonal('location', e.target.value)} />
        </div>

        {/* EDUCATION */}
        <div className="section">
          <h3>Education</h3>
          {resume.education.map((edu, i) => (
            <div key={i} className="item-group">
              {/* Top Row: Institution and Degree */}
              <div className="input-grid">
                <input 
                  placeholder="Institution" 
                  value={edu.institution} 
                  onChange={e => updateArrayItem('education', i, 'institution', e.target.value)} 
                />
                <input 
                  placeholder="Degree" 
                  value={edu.degree} 
                  onChange={e => updateArrayItem('education', i, 'degree', e.target.value)} 
                />
              </div>

              {/* Bottom Row: GPA, Date, and Location */}
              <div className="input-grid-triple">
                <input 
                  placeholder="GPA" 
                  value={edu.gpa} 
                  onChange={e => updateArrayItem('education', i, 'gpa', e.target.value)} 
                />
                <input 
                  placeholder="Graduation Date (e.g. June 2028)" 
                  value={edu.date} 
                  onChange={e => updateArrayItem('education', i, 'date', e.target.value)} 
                />
                <input 
                  placeholder="Location" 
                  value={edu.location} 
                  onChange={e => updateArrayItem('education', i, 'location', e.target.value)} 
                />
              </div>
              
              <button className="delete-btn" onClick={() => removeArrayItem('education', i)}>Remove School</button>
            </div>
              ))}
              <button className="add-btn" onClick={() => addArrayItem('education', { institution: "", degree: "", gpa: "", date: "", location: "" })}>
                + Add School
            </button>
        </div>

        {/* EXPERIENCE */}
        <div className="section">
          <h3>Experience</h3>
          {resume.experience.map((job, jIdx) => (
            <div key={jIdx} className="item-group">
              <input placeholder="Company" value={job.company} onChange={e => updateArrayItem('experience', jIdx, 'company', e.target.value)} />
              <input placeholder="Position" value={job.position} onChange={e => updateArrayItem('experience', jIdx, 'position', e.target.value)} />
              
              <div className="bullets">
                {job.responsibilities.map((res, rIdx) => (
                  <textarea key={rIdx} value={res} onChange={e => updateResponsibility(jIdx, rIdx, e.target.value)} />
                ))}
                <button className="small-btn" onClick={() => addResponsibility(jIdx)}>+ Bullet</button>
              </div>
            </div>
          ))}
          <button onClick={() => addArrayItem('experience', { company: "", location: "", duration: "", position: "", responsibilities: [""] })}>+ Add Job</button>
        </div>

        <button className="save-btn" onClick={handleSave}>Save to Git & Backend</button>
        
      </div>
    </div>
  );
}