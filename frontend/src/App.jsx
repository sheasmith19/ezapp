import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Build from './components/build.jsx';
import Dashboard from './components/Dashboard.jsx';

function App() {
  return (
    <Router>
      <nav style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>
        <Link to="/" style={{ marginRight: "10px" }}>Dashboard</Link>
        <Link to="/build">Build Resume</Link>
      </nav>

      <div style={{ padding: "20px" }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/build" element={<Build />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;