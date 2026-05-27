import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const firstLinkRef = useRef(null);

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

  // Mobile menu: outside clicks, Escape to close, focus and body scroll lock
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setIsMobileOpen(false);
      // focus trap handling
      if (e.key === 'Tab' && mobileMenuRef.current) {
        const focusable = mobileMenuRef.current.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    }

    function handleClickOutside(e) {
      if (isMobileOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setIsMobileOpen(false);
      }
    }

    if (isMobileOpen) {
      document.addEventListener('keydown', onKey);
      document.addEventListener('mousedown', handleClickOutside);
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setTimeout(() => firstLinkRef.current?.focus(), 50);
      return () => {
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('mousedown', handleClickOutside);
        document.body.style.overflow = prev;
      };
    }

    return undefined;
  }, [isMobileOpen]);

  return (
    <nav className="nav-bar">
      <div className="brand">🚀 Team Task Manager</div>

      <button
        className="mobile-toggle"
        aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMobileOpen}
        aria-controls="main-nav"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isMobileOpen ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <>
              <path d="M3 12h18" />
              <path d="M3 6h18" />
              <path d="M3 18h18" />
            </>
          )}
        </svg>
      </button>

      <div id="main-nav" ref={mobileMenuRef} className={`nav-links ${isMobileOpen ? 'mobile-open' : ''}`}>
        <NavLink to="/dashboard" onClick={() => setIsMobileOpen(false)} ref={firstLinkRef}>📊 Dashboard</NavLink>
        <NavLink to="/projects" onClick={() => setIsMobileOpen(false)}>📁 Projects</NavLink>
        <NavLink to="/tasks" onClick={() => setIsMobileOpen(false)}>✅ Tasks</NavLink>
        <NavLink to="/profile" onClick={() => setIsMobileOpen(false)}>👤 Profile</NavLink>
        <button className="link-button" onClick={() => { setIsMobileOpen(false); handleLogout(); }}>Sign out</button>
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
