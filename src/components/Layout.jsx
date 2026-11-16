import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ActionFeedback from './ActionFeedback';

const shellStyles = {
  layout: 'relative flex h-screen min-h-screen overflow-hidden bg-[#f1f4f9]',
  backdrop: 'fixed inset-0 z-[90] bg-[rgba(15,23,42,0.45)] backdrop-blur-[2px]',
  main: 'flex h-screen min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-transparent p-0 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] max-[768px]:w-full',
  content: 'box-border w-full min-w-0 flex-[1_1_auto] p-[0.85rem]',
};

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={shellStyles.layout}>
      {/* Darkened backdrop for mobile overlay */}
      {mobileOpen && (
        <motion.div
          className={shellStyles.backdrop}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      )}
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <main className={shellStyles.main}>
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <ActionFeedback />
        <div className={`view-content ${shellStyles.content}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
