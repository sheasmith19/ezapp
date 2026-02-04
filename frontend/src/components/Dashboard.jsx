import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '2px solid #eee', marginBottom: '20px' }}>
        <h1>User Dashboard</h1>
      </header>
      
      <section>
        <p>Welcome! You don't have any resumes yet.</p>
        
        {/* This link takes you to the build page */}
        <Link 
          to="/build" 
          style={{ 
            display: 'inline-block',
            backgroundColor: '#007bff', 
            color: 'white', 
            padding: '10px 20px', 
            borderRadius: '5px', 
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          + Create New Resume
        </Link>
      </section>
    </div>
  );
}