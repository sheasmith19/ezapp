import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>EzApp</h1>
        <h2 style={styles.subtitle}>Sign In</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={styles.linkText}>
          Don't have an account? <Link to="/register" style={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    fontFamily: 'sans-serif',
  },
  card: {
    backgroundColor: '#16213e',
    padding: '40px',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  title: {
    color: '#e94560',
    textAlign: 'center',
    margin: '0 0 5px 0',
    fontSize: '28px',
  },
  subtitle: {
    color: '#eee',
    textAlign: 'center',
    margin: '0 0 25px 0',
    fontWeight: 'normal',
    fontSize: '18px',
  },
  error: {
    backgroundColor: '#e94560',
    color: 'white',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '15px',
    textAlign: 'center',
    fontSize: '14px',
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    border: '1px solid #333',
    borderRadius: '6px',
    backgroundColor: '#0f3460',
    color: '#eee',
    fontSize: '15px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#e94560',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  linkText: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: '20px',
    fontSize: '14px',
  },
  link: {
    color: '#e94560',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
};
