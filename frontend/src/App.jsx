import { Routes, Route, Link, Navigate } from 'react-router-dom';
import BuildResume from './components/BuildResume.jsx';
import Dashboard from './components/Dashboard.jsx';
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
import { useAuth } from './contexts/AuthContext.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const { user, loading, signOut } = useAuth();

  return (
    <>
      {user && (
        <nav style={{
          padding: '12px 20px',
          borderBottom: '1px solid #333',
          backgroundColor: '#16213e',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
        }}>
          <Link to="/" style={{ color: '#e94560', textDecoration: 'none', fontWeight: 'bold' }}>Dashboard</Link>
          <Link to="/build" style={{ color: '#eee', textDecoration: 'none' }}>Build Resume</Link>
          <div style={{ flex: 1 }} />
          <span style={{ color: '#aaa', fontSize: '14px' }}>{user.email}</span>
          <button
            onClick={signOut}
            style={{
              background: 'none',
              border: '1px solid #e94560',
              color: '#e94560',
              padding: '5px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Log out
          </button>
        </nav>
      )}

      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/build" element={<ProtectedRoute><BuildResume /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

export default App;