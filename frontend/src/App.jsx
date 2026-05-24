import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import { getMe } from './api';

function ProtectedRoute({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('ttm_token');
    if (!token) {
      setLoading(false);
      return;
    }

    // validate token with backend
    getMe().then((res) => {
      setUser(res.data.user);
    }).catch(() => {
      // invalid token
      localStorage.removeItem('ttm_user');
      localStorage.removeItem('ttm_token');
      setUser(null);
    }).finally(() => setLoading(false));
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('ttm_user', JSON.stringify(userData));
    localStorage.setItem('ttm_token', token);
    setUser(userData);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('ttm_user');
    localStorage.removeItem('ttm_token');
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="app-shell">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        <div className="page-body">
          <div className="routes-wrapper">
            <Routes>
              <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
              <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Auth onLogin={handleLogin} />} />
              <Route path="/signup" element={<Navigate to="/login" replace />} />
              <Route path="/dashboard" element={<ProtectedRoute user={user}><Dashboard user={user} /></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute user={user}><Projects user={user} /></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute user={user}><Tasks user={user} /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
