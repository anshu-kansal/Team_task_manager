import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useStore } from '../../store';
import { cn } from '../../lib/utils';
import { useLocation } from 'react-router-dom';

export default function Layout({ user, onLogout, children }) {
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const location = useLocation();

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth < 1024 && isSidebarOpen) {
      toggleSidebar();
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      <Sidebar />
      
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-gray-900/80 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div className={cn("flex flex-col transition-all duration-300 min-h-screen", isSidebarOpen ? "lg:pl-64" : "lg:pl-20")}>
        <Header user={user} onLogout={onLogout} />
        
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
