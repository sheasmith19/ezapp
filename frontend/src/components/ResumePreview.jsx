import './ResumePreview.css';

export default function ResumePreview({ resume, margins }) {
  const { personal, education, skills, experience } = resume;
  
  // Convert inches to CSS (96 DPI)
  const marginStyle = {
    paddingTop: `${margins.top}in`,
    paddingBottom: `${margins.bottom}in`,
    paddingLeft: `${margins.left}in`,
    paddingRight: `${margins.right}in`,
  };

  // Filter skills to only show those with content
  const validSkills = skills.filter(s => s.category && s.items.length > 0);

  return (
    <div className="preview-container">
      <div className="resume-page" style={marginStyle}>
        {/* Personal Info */}
        {personal.name && (
          <div className="resume-name">{personal.name}</div>
        )}
        <div className="resume-contact">
          {[personal.email, personal.phone, personal.location]
            .filter(Boolean)
            .join(' | ')}
        </div>

        {/* Education */}
        {education.length > 0 && (
          <>
            <div className="section-header">
              <span>EDUCATION</span>
              <div className="section-line"></div>
            </div>
            {education.map((edu, i) => (
              <div key={i} className="edu-entry">
                <div className="entry-header">
                  <div className="entry-left">
                    <div className="entry-title">{edu.institution}</div>
                    <div className="entry-meta">
                      {[edu.degree, edu.gpa ? `GPA: ${edu.gpa}` : null]
                        .filter(Boolean)
                        .join(' | ')}
                    </div>
                  </div>
                  <div className="entry-right">
                    <div>{edu.date}</div>
                    <div>{edu.location}</div>
                  </div>
                </div>
                {i < education.length - 1 && <div className="entry-spacer"></div>}
              </div>
            ))}
          </>
        )}

        {/* Skills */}
        {validSkills.length > 0 && (
          <>
            <div className="section-header">
              <span>SKILLS</span>
              <div className="section-line"></div>
            </div>
            {validSkills.map((skill, i) => (
              <div key={i} className={`skill-item ${i === 0 ? 'first' : ''}`}>
                <span className="skill-category">{skill.category}:</span>{' '}
                {skill.items.join(', ')}
              </div>
            ))}
            <div className="skills-spacer"></div>
          </>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <>
            <div className="section-header">
              <span>EXPERIENCE</span>
              <div className="section-line"></div>
            </div>
            {experience.map((job, i) => (
              <div key={i} className="job-entry">
                <div className="entry-header">
                  <div className="entry-left">
                    <div className="entry-title">{job.company}</div>
                    <div className="entry-meta">{job.position}</div>
                  </div>
                  <div className="entry-right">
                    <div>{job.duration}</div>
                    <div>{job.location}</div>
                  </div>
                </div>
                <ul className="responsibilities">
                  {job.responsibilities.map((resp, rIdx) => (
                    resp && <li key={rIdx}>{resp}</li>
                  ))}
                </ul>
                {i < experience.length - 1 && <div className="entry-spacer"></div>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
