import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useTheme } from '../../contexts/ThemeContext';

export default function AppLayout({
  children,
  sections,
  activeSection,
  setActiveSection,
  dbStatus,
  fonteAtiva,
  setFonteAtiva,
  periodo,
  recarregar,
  userProfile,
  user,
  isAdmin,
  onLogout,
  onToggleUserMgmt,
}) {
  const { darkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <Sidebar
        sections={sections}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main area: shifted right on desktop for collapsed sidebar (64px) */}
      <div className="lg:pl-16 flex flex-col min-h-screen transition-all duration-300">
        {/* Header */}
        <Header
          dbStatus={dbStatus}
          fonteAtiva={fonteAtiva}
          setFonteAtiva={setFonteAtiva}
          periodo={periodo}
          recarregar={recarregar}
          userProfile={userProfile}
          user={user}
          isAdmin={isAdmin}
          onLogout={onLogout}
          onToggleUserMgmt={onToggleUserMgmt}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        {/* Main content */}
        <main className="flex-1 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
