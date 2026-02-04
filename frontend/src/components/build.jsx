import { Link } from 'react-router-dom';

export default function Build() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Build Your Resume</h1>
      <p>This is the Build page. If you can see this, your routing is working!</p>
      
      <Link to="/" style={{ color: 'blue', textDecoration: 'underline' }}>
        ← Go back to Dashboard
      </Link>
    </div>
  );
}