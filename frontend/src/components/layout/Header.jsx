import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, LogOut, Bell, Search, User, Settings, ChevronDown, Command } from 'lucide-react';
import { useStore } from '../../store';
import { Avatar } from '../ui/Avatar';
import { ThemeToggle } from '../ui/ThemeToggle';

export default function Header({ user, onLogout }) {
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Generate page names from path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/dashboard') return ['Dashboard', 'Overview'];
    if (path === '/projects') return ['Projects', 'All Workspaces'];
    if (path === '/tasks') return ['Tasks', 'Kanban Board'];
    if (path === '/profile') return ['Settings', 'Profile Settings'];
    if (path === '/onboarding') return ['Onboarding', 'Welcome Setup'];
    return ['Platform', 'Home'];
  };

  const [parent, child] = getBreadcrumbs();

  const getAvatarUrl = (profileImage) => {
    if (!profileImage) return null;
    if (profileImage.startsWith('http')) return profileImage;
    const apiBase = import.meta.env.VITE_API_URL || '';
    const host = apiBase.replace(/\/api$/, '');
    return `${host}${profileImage}`;
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-100 dark:border-dark-border bg-white/80 dark:bg-dark-card/80 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile Sidebar Toggle */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden hover:bg-surface-50 dark:hover:bg-dark-hover rounded-lg transition-colors"
        onClick={toggleSidebar}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Breadcrumbs */}
      <div className="hidden sm:flex items-center gap-2 text-sm">
        <span className="text-surface-500 dark:text-surface-400 font-medium">{parent}</span>
        <span className="text-surface-300 dark:text-surface-600">/</span>
        <span className="text-gray-900 dark:text-white font-semibold">{child}</span>
      </div>

      {/* Action / Search / Profile Section */}
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end items-center">
        {/* Search Command Palette Trigger */}
        <div className="relative w-full max-w-xs hidden md:block">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <Search className="h-4 w-4 text-surface-400" aria-hidden="true" />
          </div>
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between rounded-lg border border-gray-200 dark:border-dark-border bg-surface-50 dark:bg-dark-hover/40 pl-10 pr-3 text-left text-xs text-surface-400 hover:bg-surface-100 dark:hover:bg-dark-hover transition-colors"
          >
            <span>Search workspace...</span>
            <span className="flex items-center gap-0.5 rounded border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card px-1.5 py-0.5 text-[10px] font-medium text-surface-400">
              <Command size={10} />K
            </span>
          </button>
        </div>

        <div className="flex items-center gap-x-3 md:gap-x-4">
          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Notifications Placeholder */}
          <button className="relative rounded-lg p-2 text-surface-500 hover:text-gray-900 hover:bg-surface-50 dark:text-surface-400 dark:hover:text-white dark:hover:bg-dark-hover transition-all duration-200">
            <span className="sr-only">View notifications</span>
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white dark:ring-dark-card" />
          </button>

          {/* Separator */}
          <div className="h-5 w-px bg-gray-200 dark:bg-dark-border" aria-hidden="true" />

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              className="-m-1.5 flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-50 dark:hover:bg-dark-hover/60 transition-colors"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span className="sr-only">Open user menu</span>
              <Avatar 
                src={getAvatarUrl(user?.profileImage)} 
                fallback={user?.name?.charAt(0)?.toUpperCase()} 
                className="h-8 w-8 ring-2 ring-white dark:ring-dark-card shadow-sm" 
              />
              <span className="hidden lg:flex lg:items-center">
                <span className="text-sm font-semibold text-gray-900 dark:text-white" aria-hidden="true">
                  {user?.name}
                </span>
                <ChevronDown className="ml-1 h-4 w-4 text-surface-400" />
              </span>
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 z-20 mt-2.5 w-48 origin-top-right rounded-xl bg-white dark:bg-dark-card py-2 shadow-float dark:shadow-dark-float border border-gray-200 dark:border-dark-border animate-scale-in">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-dark-border/60">
                    <p className="text-xs text-surface-400">Signed in as</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.email}</p>
                  </div>
                  
                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors"
                  >
                    <User size={15} />
                    My Profile
                  </Link>
                  
                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors"
                  >
                    <Settings size={15} />
                    Settings
                  </Link>

                  <div className="border-t border-gray-100 dark:border-dark-border/60 my-1" />

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
