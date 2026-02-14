import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost } from '../utils/api';
import ResumePreview from './ResumePreview';
import './BuildResume.css';

export default function BuildResume() {
  const [resume, setResume] = useState({
    save_name: "Resume 1",
    personal: { name: "", email: "", phone: "", location: "" },
    education: [],
    skills: [{ category: "", items: [] }],
    experience: []
  });
  const [margins, setMargins] = useState({
    top: 0.75,
    bottom: 0.75,
    left: 0.75,
    right: 0.75
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeName = searchParams.get('resume');

  // Load existing resume if resume name is provided
  useEffect(() => {
    if (resumeName) {
      const fetchResume = async () => {
        try {
          const res = await apiGet(`/get-resume/${resumeName}`);
          if (res.ok) {
            const data = await res.json();
            // Convert underscores back to spaces in the name
            data.save_name = data.save_name.replace(/_/g, ' ');
            // Normalize old-format responsibilities (plain strings → {text, active})
            if (data.experience) {
              data.experience = data.experience.map(job => ({
                ...job,
                responsibilities: (job.responsibilities || []).map(r =>
                  typeof r === 'string' ? { text: r, active: true } : r
                )
              }));
            }
            setResume(data);
            // Load margins if present
            if (data.margins) {
              setMargins(data.margins);
            }
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
    updatedExp[jobIdx].responsibilities[resIdx] = { ...updatedExp[jobIdx].responsibilities[resIdx], text: val };
    setResume({ ...resume, experience: updatedExp });
  };

  const toggleResponsibility = (jobIdx, resIdx) => {
    const updatedExp = [...resume.experience];
    const r = updatedExp[jobIdx].responsibilities[resIdx];
    updatedExp[jobIdx].responsibilities[resIdx] = { ...r, active: !r.active };
    setResume({ ...resume, experience: updatedExp });
  };

  const addResponsibility = (jobIdx) => {
    const updatedExp = [...resume.experience];
    updatedExp[jobIdx].responsibilities.push({ text: "", active: true });
    setResume({ ...resume, experience: updatedExp });
  };

  const removeResponsibility = (jobIdx, resIdx) => {
    const updatedExp = [...resume.experience];
    updatedExp[jobIdx].responsibilities = updatedExp[jobIdx].responsibilities.filter((_, i) => i !== resIdx);
    setResume({ ...resume, experience: updatedExp });
  };

  const reorderResponsibility = (jobIdx, fromIdx, toIdx) => {
    const updatedExp = [...resume.experience];
    const items = [...updatedExp[jobIdx].responsibilities];
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    updatedExp[jobIdx].responsibilities = items;
    setResume({ ...resume, experience: updatedExp });
  };

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const dragJobIdx = useRef(null);
  const [dropIndicator, setDropIndicator] = useState({ jobIdx: null, position: null });

  const skillDragItem = useRef(null);
  const skillDragOver = useRef(null);
  const [skillDropIndicator, setSkillDropIndicator] = useState(null);

  const reorderSection = (section, fromIdx, toIdx) => {
    const items = [...resume[section]];
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    setResume({ ...resume, [section]: items });
  };
  const [collapsed, setCollapsed] = useState({ education: {}, skills: {}, experience: {} });

  const toggleCollapse = (section, index) => {
    setCollapsed(prev => ({
      ...prev,
      [section]: { ...prev[section], [index]: !prev[section][index] }
    }));
  };

  const autoResize = useCallback((el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
    el.style.overflow = 'hidden';
  }, []);

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
                    ${job.responsibilities.map(res => `<responsibility${!res.active ? ' deactivated="true"' : ''}>${escapeXml(res.text)}</responsibility>`).join('')}
                  </responsibilities>
                </job>`).join('')}
              </experience>
              <margins>
                <top>${margins.top}</top>
                <bottom>${margins.bottom}</bottom>
                <left>${margins.left}</left>
                <right>${margins.right}</right>
              </margins>
            </resume>`;
  };

  const handleSave = async () => {
    const xml = generateXML();
    try {
      const res = await apiPost('/save-resume', {
        xml: xml,
        save_name: resume.save_name,
        margins: margins
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

  // Split screen resizing state
  const [formWidth, setFormWidth] = useState(450);
  const dragging = useRef(false);

  // Mouse event handlers for resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (dragging.current) {
        e.preventDefault();
        document.body.classList.add('no-select');
        const min = 300, max = 800;
        setFormWidth(Math.min(max, Math.max(min, e.clientX)));
      }
    };
    const handleMouseUp = () => {
      dragging.current = false;
      document.body.classList.remove('no-select');
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('no-select');
    };
  }, []);

  return (
    <div className="build-page">
      <div className="form-side" style={{ flex: `0 0 ${formWidth}px`, minWidth: 200, maxWidth: 900 }}>
        <h2>Resume Editor</h2>

        {/* RESUME NAME */}
        <div className="section">
          <h3>Resume Name</h3>
          <input placeholder="Resume Name" value={resume.save_name} onChange={e => updateName(e.target.value)} />
        </div>

        {/* MARGIN CONTROLS */}
        <div className="section">
          <h3>Page Margins (inches)</h3>
          <div className="margin-controls">
            <div className="margin-input">
              <label>Top</label>
              <input 
                type="number" 
                min="0" 
                max="2" 
                step="0.05" 
                value={margins.top} 
                onChange={e => setMargins({...margins, top: parseFloat(e.target.value) || 0})} 
              />
            </div>
            <div className="margin-input">
              <label>Bottom</label>
              <input 
                type="number" 
                min="0" 
                max="2" 
                step="0.05" 
                value={margins.bottom} 
                onChange={e => setMargins({...margins, bottom: parseFloat(e.target.value) || 0})} 
              />
            </div>
            <div className="margin-input">
              <label>Left</label>
              <input 
                type="number" 
                min="0" 
                max="2" 
                step="0.05" 
                value={margins.left} 
                onChange={e => setMargins({...margins, left: parseFloat(e.target.value) || 0})} 
              />
            </div>
            <div className="margin-input">
              <label>Right</label>
              <input 
                type="number" 
                min="0" 
                max="2" 
                step="0.05" 
                value={margins.right} 
                onChange={e => setMargins({...margins, right: parseFloat(e.target.value) || 0})} 
              />
            </div>
          </div>
        </div>

        {/* PERSONAL INFO */}
        <div className="section">
          <h3>Personal Info</h3>
          <input placeholder="Name" value={resume.personal.name} onChange={e => updatePersonal('name', e.target.value)} ref={autoResize} />
          <input placeholder="Email" value={resume.personal.email} onChange={e => updatePersonal('email', e.target.value)} ref={autoResize} />
          <input placeholder="Phone" value={resume.personal.phone} onChange={e => updatePersonal('phone', e.target.value)} ref={autoResize} />
          <input placeholder="Location" value={resume.personal.location} onChange={e => updatePersonal('location', e.target.value)} ref={autoResize} />
        </div>

        {/* EDUCATION */}
        <div className="section">
          <h3>Education</h3>
          {(() => {
            // Drag state for education
            const eduDragItem = useRef(null);
            const eduDragOver = useRef(null);
            const [eduDropIndicator, setEduDropIndicator] = useState(null);
            // Reorder function for education
            const reorderEducation = (fromIdx, toIdx) => {
              const items = [...resume.education];
              const [moved] = items.splice(fromIdx, 1);
              items.splice(toIdx, 0, moved);
              setResume({ ...resume, education: items });
            };
            // Render
            return resume.education.map((edu, i) => {
              const showDropAbove = eduDropIndicator && eduDropIndicator.idx === i && eduDropIndicator.dir === 'up';
              const showDropBelow = eduDropIndicator && eduDropIndicator.idx === i && eduDropIndicator.dir === 'down';
              const dropLineAbove = showDropAbove ? (
                <div key={`drop-above-edu-${i}`} className="drop-indicator-line" />
              ) : null;
              const dropLineBelow = showDropBelow ? (
                <div key={`drop-below-edu-${i}`} className="drop-indicator-line" />
              ) : null;
              return [
                dropLineAbove,
                <div
                  key={i}
                  className="item-group"
                  draggable
                  onDragStart={e => {
                    eduDragItem.current = i;
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={e => {
                    e.preventDefault();
                    let dir = 'up';
                    if (eduDragItem.current !== null && i > eduDragItem.current) dir = 'down';
                    eduDragOver.current = i;
                    setEduDropIndicator({ idx: i, dir });
                  }}
                  onDragLeave={() => {
                    if (eduDropIndicator && eduDropIndicator.idx === i) setEduDropIndicator(null);
                  }}
                  onDrop={() => {
                    if (
                      eduDragItem.current !== null &&
                      eduDragItem.current !== eduDragOver.current
                    ) {
                      let toIdx = eduDragOver.current;
                      if (eduDropIndicator && eduDropIndicator.dir === 'down') {
                        toIdx = eduDragOver.current + 1;
                      }
                      reorderEducation(eduDragItem.current, toIdx);
                    }
                    eduDragItem.current = null;
                    eduDragOver.current = null;
                    setEduDropIndicator(null);
                  }}
                  onDragEnd={() => {
                    eduDragItem.current = null;
                    eduDragOver.current = null;
                    setEduDropIndicator(null);
                  }}
                >
                  <div className="item-group-header" onClick={() => toggleCollapse('education', i)}>
                    <span className={`collapse-arrow ${collapsed.education[i] ? 'collapsed' : ''}`}>▾</span>
                    <span className="item-group-title">{edu.institution || 'Untitled School'}</span>
                  </div>
                  {!collapsed.education[i] && <>
                  {/* Top Row: Institution and Degree */}
                  <div className="input-grid">
                    <input 
                      placeholder="Institution" 
                      value={edu.institution} 
                      onChange={e => updateArrayItem('education', i, 'institution', e.target.value)} 
                      ref={autoResize}
                    />
                    <input 
                      placeholder="Degree" 
                      value={edu.degree} 
                      onChange={e => updateArrayItem('education', i, 'degree', e.target.value)} 
                      ref={autoResize}
                    />
                  </div>

                  {/* Bottom Row: GPA, Date, and Location */}
                  <div className="input-grid-triple">
                    <input 
                      placeholder="GPA" 
                      value={edu.gpa} 
                      onChange={e => updateArrayItem('education', i, 'gpa', e.target.value)} 
                      ref={autoResize}
                    />
                    <input 
                      placeholder="Graduation Date (e.g. June 2028)" 
                      value={edu.date} 
                      onChange={e => updateArrayItem('education', i, 'date', e.target.value)} 
                      ref={autoResize}
                    />
                    <input 
                      placeholder="Location" 
                      value={edu.location} 
                      onChange={e => updateArrayItem('education', i, 'location', e.target.value)} 
                      ref={autoResize}
                    />
                  </div>
                  
                  <button className="delete-btn" onClick={() => removeArrayItem('education', i)}>Remove School</button>
                  </>
                  }
                </div>,
                dropLineBelow
              ];
            });
          })()}
          {/* Drop indicator at end of education list */}
          {(() => {
            const [eduDropIndicator] = useState(null);
            return eduDropIndicator && eduDropIndicator.idx === resume.education.length && eduDropIndicator.dir === 'down' && (
              <div className="drop-indicator-line" key="drop-end-edu" />
            );
          })()}
              <button className="add-btn" onClick={() => addArrayItem('education', { institution: "", degree: "", gpa: "", date: "", location: "" })}>
                + Add School
            </button>
        </div>

        {/* SKILLS */}
        <div className="section">
          <h3>Skills</h3>
          {resume.skills.map((skillGroup, groupIdx) => {
            // Render drop indicator above or below
            const showDropAbove = skillDropIndicator && skillDropIndicator.idx === groupIdx && skillDropIndicator.dir === 'up';
            const showDropBelow = skillDropIndicator && skillDropIndicator.idx === groupIdx && skillDropIndicator.dir === 'down';
            const dropLineAbove = showDropAbove ? (
              <div key={`drop-above-${groupIdx}`} className="drop-indicator-line" />
            ) : null;
            const dropLineBelow = showDropBelow ? (
              <div key={`drop-below-${groupIdx}`} className="drop-indicator-line" />
            ) : null;
            return [
              dropLineAbove,
              <div
                key={groupIdx}
                className="item-group"
                draggable
                onDragStart={(e) => {
                  skillDragItem.current = groupIdx;
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  let dir = 'up';
                  if (skillDragItem.current !== null && groupIdx > skillDragItem.current) dir = 'down';
                  skillDragOver.current = groupIdx;
                  setSkillDropIndicator({ idx: groupIdx, dir });
                }}
                onDragLeave={() => {
                  if (skillDropIndicator && skillDropIndicator.idx === groupIdx) setSkillDropIndicator(null);
                }}
                onDrop={() => {
                  if (
                    skillDragItem.current !== null &&
                    skillDragItem.current !== skillDragOver.current
                  ) {
                    let toIdx = skillDragOver.current;
                    if (skillDropIndicator && skillDropIndicator.dir === 'down') {
                      toIdx = skillDragOver.current + 1;
                    }
                    reorderSection('skills', skillDragItem.current, toIdx);
                  }
                  skillDragItem.current = null;
                  skillDragOver.current = null;
                  setSkillDropIndicator(null);
                }}
                onDragEnd={() => {
                  skillDragItem.current = null;
                  skillDragOver.current = null;
                  setSkillDropIndicator(null);
                }}
              >
                <div className="item-group-header" onClick={() => toggleCollapse('skills', groupIdx)}>
                  <span className="drag-handle" onMouseDown={e => e.stopPropagation()}>⠿</span>
                  <span className={`collapse-arrow ${collapsed.skills[groupIdx] ? 'collapsed' : ''}`}>▾</span>
                  <span className="item-group-title">{skillGroup.category || 'Untitled Category'}</span>
                </div>
                {!collapsed.skills[groupIdx] && <>
                <input 
                  placeholder="Category (e.g. Software, Programming)" 
                  value={skillGroup.category}
                  onChange={e => {
                    const updated = [...resume.skills];
                    updated[groupIdx].category = e.target.value;
                    setResume({ ...resume, skills: updated });
                  }}
                  ref={autoResize}
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
                  ref={autoResize}
                />

                <button 
                  className="delete-btn" 
                  onClick={() => removeArrayItem('skills', groupIdx)}
                  style={{ marginTop: '8px' }}
                >
                  Remove Category
                </button>
                </>
                }
              </div>,
              dropLineBelow
            ];
          })}
          {/* Drop indicator at end of list */}
          {skillDropIndicator && skillDropIndicator.idx === resume.skills.length && skillDropIndicator.dir === 'down' && (
            <div className="drop-indicator-line" key="drop-end" />
          )}
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
              <div className="item-group-header" onClick={() => toggleCollapse('experience', jIdx)}>
                <span className={`collapse-arrow ${collapsed.experience[jIdx] ? 'collapsed' : ''}`}>▾</span>
                <span className="item-group-title">{job.company || 'Untitled Job'}</span>
              </div>
              {!collapsed.experience[jIdx] && <>
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
                  <div
                    key={rIdx}
                    className={`bullet-row${
                      dropIndicator.jobIdx === jIdx && dropIndicator.position === rIdx
                        ? dragItem.current !== null && rIdx > dragItem.current
                          ? ' drop-below'
                          : ' drop-above'
                        : ''
                    }`}
                    draggable
                    onDragStart={() => {
                      dragItem.current = rIdx;
                      dragJobIdx.current = jIdx;
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragJobIdx.current === jIdx) {
                        dragOverItem.current = rIdx;
                        setDropIndicator({ jobIdx: jIdx, position: rIdx });
                      }
                    }}
                    onDragLeave={() => {
                      if (dropIndicator.position === rIdx) {
                        setDropIndicator({ jobIdx: null, position: null });
                      }
                    }}
                    onDrop={() => {
                      if (dragJobIdx.current === jIdx && dragItem.current !== dragOverItem.current) {
                        reorderResponsibility(jIdx, dragItem.current, dragOverItem.current);
                      }
                      dragItem.current = null;
                      dragOverItem.current = null;
                      dragJobIdx.current = null;
                      setDropIndicator({ jobIdx: null, position: null });
                    }}
                    onDragEnd={() => {
                      setDropIndicator({ jobIdx: null, position: null });
                    }}
                  >
                    <span className="drag-handle">⠿</span>
                    <button
                      className={`toggle-btn ${res.active ? 'active' : 'inactive'}`}
                      onClick={() => toggleResponsibility(jIdx, rIdx)}
                      title={res.active ? 'Deactivate bullet' : 'Activate bullet'}
                    >
                      {res.active ? '●' : '○'}
                    </button>
                    <textarea
                      className={`bullet-textarea ${!res.active ? 'deactivated' : ''}`}
                      value={res.text}
                      rows={1}
                      ref={autoResize}
                      onChange={e => {
                        updateResponsibility(jIdx, rIdx, e.target.value);
                        autoResize(e.target);
                      }}
                    />
                    <button className="delete-btn" onClick={() => removeResponsibility(jIdx, rIdx)}>✕</button>
                  </div>
                ))}
                <button className="small-btn" onClick={() => addResponsibility(jIdx)}>+ Bullet</button>
              </div>

              <button className="delete-btn" onClick={() => removeArrayItem('experience', jIdx)}>Remove Job</button>
              </>
              }
            </div>
          ))}
          <button onClick={() => addArrayItem('experience', { company: "", location: "", duration: "", position: "", responsibilities: [{ text: "", active: true }] })}>+ Add Job</button>
        </div>

        <button className="save-btn" onClick={handleSave}>Save to Git & Backend</button>
        
      </div>
      <div
        className="split-divider"
        onMouseDown={() => { dragging.current = true; }}
        style={{ cursor: 'col-resize', width: 8, background: 'transparent', zIndex: 10 }}
        title="Drag to resize"
      />
      <ResumePreview xml={generateXML()} margins={margins} />
    </div>
  );
}