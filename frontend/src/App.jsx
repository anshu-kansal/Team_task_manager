import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Layout from './components/layout/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import { getProfile } from './api';
import { useStore } from './store';

function ProtectedRoute({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  const { user, setUser } = useStore();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('ttm_token');
    if (!token) {
      setLoading(false);
      return;
    }

    // validate token with backend
    getProfile().then((res) => {
      setUser(res.data.user);
    }).catch(() => {
      // invalid token
      localStorage.removeItem('ttm_token');
      localStorage.removeItem('ttm_refresh_token');
      setUser(null);
    }).finally(() => setLoading(false));
  }, []);

  const handleLogin = (userData, token, refreshToken) => {
    localStorage.setItem('ttm_token', token);
    if (refreshToken) {
      localStorage.setItem('ttm_refresh_token', refreshToken);
    }
    setUser(userData);
    navigate(userData.onboardingCompleted ? '/dashboard' : '/onboarding');
  };

  const handleLogout = () => {
    localStorage.removeItem('ttm_token');
    localStorage.removeItem('ttm_refresh_token');
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        
        {/* Auth routes don't have the layout */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Auth onLogin={handleLogin} />} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />
        
        {/* Onboarding doesn't have the layout but is protected */}
        <Route path="/onboarding" element={<ProtectedRoute user={user}><Onboarding user={user} /></ProtectedRoute>} />
        
        {/* Protected routes wrapped in Layout */}
        <Route path="/dashboard" element={<ProtectedRoute user={user}><Layout user={user} onLogout={handleLogout}><Dashboard user={user} /></Layout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute user={user}><Layout user={user} onLogout={handleLogout}><Profile user={user} /></Layout></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute user={user}><Layout user={user} onLogout={handleLogout}><Projects user={user} /></Layout></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute user={user}><Layout user={user} onLogout={handleLogout}><Tasks user={user} /></Layout></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
