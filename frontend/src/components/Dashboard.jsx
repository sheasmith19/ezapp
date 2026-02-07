import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiGet, apiDelete } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await apiGet('/list-resumes');
      const data = await res.json();
      setResumes(data.resumes);
    } catch (err) {
      console.error("Failed to fetch resumes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resumeName) => {
    try {
      const res = await apiDelete(`/delete-resume/${resumeName}`);

      const data = await res.json();

      if (res.ok) {
        fetchResumes();
      } else {
        alert(`Failed to delete resume: ${data.detail || 'Unknown error'}`);
      }
    } catch (err) {
      alert("Error deleting resume: " + err.message);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '2px solid #eee', marginBottom: '20px' }}>
        <h1>{user?.email}'s Dashboard</h1>
      </header>
      
      <section>
        {loading && <p>Loading resumes...</p>}
        
        {!loading && resumes.length === 0 && (
          <p>Welcome! You don't have any resumes yet.</p>
        )}

        {!loading && resumes.length > 0 && (
          <div>
            <h2>Your Resumes</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {resumes.map((resume, idx) => (
                <li key={idx} style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Link
                    to={`/build?resume=${resume}`}
                    style={{
                      flex: 1,
                      display: 'block',
                      padding: '10px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '5px',
                      textDecoration: 'none',
                      color: '#333',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                  >
                    {resume.replace('.pdf', '').replace(/_/g, ' ')}
                  </Link>
                  <button
                    onClick={() => handleDelete(resume)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <Link 
          to="/build" 
          style={{ 
            display: 'inline-block',
            backgroundColor: '#007bff', 
            color: 'white', 
            padding: '10px 20px', 
            borderRadius: '5px', 
            textDecoration: 'none',
            fontWeight: 'bold',
            marginTop: '20px'
          }}
        >
          + Create New Resume
        </Link>
      </section>
    </div>
  );
}