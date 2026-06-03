import React from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../../store';
import { cn } from '../../lib/utils';
import { LayoutDashboard, FolderKanban, CheckSquare, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar } from '../ui/Avatar';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FolderKanban, label: 'Projects', path: '/projects' },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
];

export default function Sidebar() {
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const user = useStore((state) => state.user);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card transition-all duration-300 shadow-sm",
        isSidebarOpen ? "w-64" : "w-20 -translate-x-full lg:translate-x-0"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-gray-100 dark:border-dark-border/60">
        <div className="flex items-center gap-3 font-bold text-lg text-gray-900 dark:text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-primary-700 text-white shadow-md shadow-primary-500/20">
            <CheckSquare size={18} />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col animate-fade-in">
              <span className="font-bold tracking-tight text-gray-900 dark:text-white leading-none">TaskMaster</span>
              <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 mt-1">SaaS Platform</span>
            </div>
          )}
        </div>
        
        {/* Toggle Sidebar Button (Desktop only) */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative overflow-hidden",
                isActive
                  ? "bg-primary-50/80 text-primary-700 dark:bg-primary-950/40 dark:text-primary-400"
                  : "text-surface-600 hover:bg-surface-50 hover:text-gray-900 dark:text-surface-400 dark:hover:bg-dark-hover dark:hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  size={18} 
                  className={cn(
                    "transition-transform group-hover:scale-110 duration-200",
                    isActive ? "text-primary-600 dark:text-primary-400" : "text-surface-400 group-hover:text-surface-600 dark:text-surface-500 dark:group-hover:text-surface-300"
                  )} 
                />
                <span className={cn("transition-opacity duration-200", !isSidebarOpen && "lg:opacity-0 lg:w-0 overflow-hidden")}>
                  {item.label}
                </span>

                {/* Left Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-primary-600 dark:bg-primary-500 animate-slide-in-left" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* User Info / Settings Footer */}
      <div className="p-3 border-t border-gray-100 dark:border-dark-border/60 space-y-1">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative overflow-hidden",
              isActive
                ? "bg-primary-50/80 text-primary-700 dark:bg-primary-950/40 dark:text-primary-400"
                : "text-surface-600 hover:bg-surface-50 hover:text-gray-900 dark:text-surface-400 dark:hover:bg-dark-hover dark:hover:text-white"
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings 
                size={18} 
                className={cn(
                  "transition-transform group-hover:rotate-45 duration-200",
                  isActive ? "text-primary-600 dark:text-primary-400" : "text-surface-400 group-hover:text-surface-600 dark:text-surface-500"
                )} 
              />
              <span className={cn("transition-opacity duration-200", !isSidebarOpen && "lg:opacity-0 lg:w-0 overflow-hidden")}>
                Settings
              </span>
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-primary-600 dark:bg-primary-500 animate-slide-in-left" />
              )}
            </>
          )}
        </NavLink>

        {/* User Mini-Profile */}
        {user && isSidebarOpen && (() => {
          const getAvatarUrl = (profileImage) => {
            if (!profileImage) return null;
            if (profileImage.startsWith('http')) return profileImage;
            const apiBase = import.meta.env.VITE_API_URL || '';
            const host = apiBase.replace(/\/api$/, '');
            return `${host}${profileImage}`;
          };

          return (
            <div className="flex items-center gap-3 p-2 mt-2 rounded-lg bg-surface-50 dark:bg-dark-hover/40 border border-gray-100 dark:border-dark-border/40 animate-fade-in">
              <Avatar 
                src={getAvatarUrl(user.profileImage)} 
                fallback={user.name?.charAt(0)?.toUpperCase()} 
                className="h-9 w-9 ring-2 ring-white dark:ring-dark-card shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                <p className="text-[10px] text-surface-500 dark:text-surface-400 truncate capitalize">{user.role || 'Member'}</p>
              </div>
            </div>
          );
        })()}
      </div>
    </aside>
  );
}
