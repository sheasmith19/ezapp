import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function BuildResume() {
  const [resume, setResume] = useState({
    save_name: "Resume 1",
    personal: { name: "", email: "", phone: "", location: "" },
    education: [],
    skills: [{ category: "", items: [] }],
    experience: []
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeName = searchParams.get('resume');

  // Load existing resume if resume name is provided
  useEffect(() => {
    if (resumeName) {
      const fetchResume = async () => {
        try {
          const res = await fetch(`http://localhost:8000/get-resume/${resumeName}`);
          if (res.ok) {
            const data = await res.json();
            // Convert underscores back to spaces in the name
            data.save_name = data.save_name.replace(/_/g, ' ');
            setResume(data);
          } else {
            alert("Failed to load resume");
          }
        } catch (err) {
          alert("Error loading resume: " + err.message);
        }
      };
      fetchResume();
    }
  }, [resumeName]);

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

  const removeResponsibility = (jobIdx, resIdx) => {
    const updatedExp = [...resume.experience];
    updatedExp[jobIdx].responsibilities = updatedExp[jobIdx].responsibilities.filter((_, i) => i !== resIdx);
    setResume({ ...resume, experience: updatedExp });
  };

  const removeArrayItem = (section, index) => {
    const updated = resume[section].filter((_, i) => i !== index);
    setResume({ ...resume, [section]: updated });
  };

  // --- The XML Generator ---
  // Escape XML special characters
  const escapeXml = (str) => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const generateXML = () => {
    const { personal, education, skills, experience } = resume;
    return `<?xml version="1.0" encoding="UTF-8"?>
            <resume>
              <personal_info>
                <name>${escapeXml(personal.name)}</name>
                <email>${escapeXml(personal.email)}</email>
                <phone>${escapeXml(personal.phone)}</phone>
                <location>${escapeXml(personal.location)}</location>
              </personal_info>
              <education>
                ${education.map(edu => `
                <institution>
                  <name>${escapeXml(edu.institution)}</name>
                  <degree>${escapeXml(edu.degree)}</degree>
                  <gpa>${escapeXml(edu.gpa)}</gpa>
                  <graduation_date>${escapeXml(edu.date)}</graduation_date>
                  <location>${escapeXml(edu.location)}</location>
                </institution>`).join('')}
              </education>
              <skills>
                ${skills.map(skillGroup => `
                <skillgroup>
                  <category>${escapeXml(skillGroup.category)}</category>
                  <items>${skillGroup.items.map(item => `<item>${escapeXml(item)}</item>`).join('')}</items>
                </skillgroup>`).join('')}
              </skills>
              <experience>
                ${experience.map(job => `
                <job>
                  <company>${escapeXml(job.company)}</company>
                  <location>${escapeXml(job.location)}</location>
                  <duration>${escapeXml(job.duration)}</duration>
                  <position>${escapeXml(job.position)}</position>
                  <responsibilities>
                    ${job.responsibilities.map(res => `<responsibility>${escapeXml(res)}</responsibility>`).join('')}
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

        {/* SKILLS */}
        <div className="section">
          <h3>Skills</h3>
          {resume.skills.map((skillGroup, groupIdx) => (
            <div key={groupIdx} className="item-group">
              <input 
                placeholder="Category (e.g. Software, Programming)" 
                value={skillGroup.category}
                onChange={e => {
                  const updated = [...resume.skills];
                  updated[groupIdx].category = e.target.value;
                  setResume({ ...resume, skills: updated });
                }}
              />
              
              <textarea 
                placeholder="List skills (e.g. Onshape, SolidWorks, CATIA)"
                value={skillGroup.items.join(', ')}
                onChange={e => {
                  const updated = [...resume.skills];
                  updated[groupIdx].items = e.target.value.split(',').map(item => item.trim()).filter(item => item);
                  setResume({ ...resume, skills: updated });
                }}
                style={{ marginTop: '8px', minHeight: '60px', width: '100%' }}
              />

              <button 
                className="delete-btn" 
                onClick={() => removeArrayItem('skills', groupIdx)}
                style={{ marginTop: '8px' }}
              >
                Remove Category
              </button>
            </div>
          ))}
          <button 
            className="add-btn" 
            onClick={() => addArrayItem('skills', { category: "", items: [""] })}
          >
            + Add Skill Category
          </button>
        </div>

        {/* EXPERIENCE */}
        <div className="section">
          <h3>Experience</h3>
          {resume.experience.map((job, jIdx) => (
            <div key={jIdx} className="item-group">
              <input placeholder="Company" value={job.company} onChange={e => updateArrayItem('experience', jIdx, 'company', e.target.value)} />
              <input placeholder="Position" value={job.position} onChange={e => updateArrayItem('experience', jIdx, 'position', e.target.value)} />
              
              <div className="input-grid">
                <input 
                  placeholder="Duration (e.g. June 2022 - Present)" 
                  value={job.duration} 
                  onChange={e => updateArrayItem('experience', jIdx, 'duration', e.target.value)} 
                />
                <input 
                  placeholder="Location" 
                  value={job.location} 
                  onChange={e => updateArrayItem('experience', jIdx, 'location', e.target.value)} 
                />
              </div>
              
              <div className="bullets">
                {job.responsibilities.map((res, rIdx) => (
                  <div key={rIdx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <textarea value={res} onChange={e => updateResponsibility(jIdx, rIdx, e.target.value)} />
                    <button className="delete-btn" onClick={() => removeResponsibility(jIdx, rIdx)}>✕</button>
                  </div>
                ))}
                <button className="small-btn" onClick={() => addResponsibility(jIdx)}>+ Bullet</button>
              </div>

              <button className="delete-btn" onClick={() => removeArrayItem('experience', jIdx)}>Remove Job</button>
            </div>
          ))}
          <button onClick={() => addArrayItem('experience', { company: "", location: "", duration: "", position: "", responsibilities: [""] })}>+ Add Job</button>
        </div>

        <button className="save-btn" onClick={handleSave}>Save to Git & Backend</button>
        
      </div>
    </div>
  );
}