import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    onLogout();
    setIsDropdownOpen(false);
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  return (
    <nav className="nav-bar">
      <div className="brand">🚀 Team Task Manager</div>
      <div className="nav-links">
        <NavLink to="/dashboard">📊 Dashboard</NavLink>
        <NavLink to="/projects">📁 Projects</NavLink>
        <NavLink to="/tasks">✅ Tasks</NavLink>
      </div>
      <div className="profile-container" ref={dropdownRef}>
        <button 
          className="user-badge"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          title="Profile menu"
        >
          <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>{user?.name}</div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.role}</div>
          </div>
          <svg className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {isDropdownOpen && (
          <div className="profile-dropdown">
            <div className="dropdown-header">
              <div className="dropdown-user-info">
                <div className="dropdown-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="dropdown-name">{user?.name}</div>
                  <div className="dropdown-email">{user?.email}</div>
                </div>
              </div>
            </div>
            <div className="dropdown-divider"></div>
            <button className="dropdown-item logout-item" onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 2H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M10 11L14 7M14 7L10 3M14 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
