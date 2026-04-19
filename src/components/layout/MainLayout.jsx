import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './layout.css';

export default function MainLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <div className="d-none d-lg-block app-shell-sidebar">
        <Sidebar />
      </div>

      <div className={`app-mobile-sidebar-backdrop ${mobileSidebarOpen ? 'show' : ''}`}>
        <button
          type="button"
          className="app-mobile-sidebar-close"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Menue kapat"
        />
        <div className={`app-mobile-sidebar ${mobileSidebarOpen ? 'show' : ''}`}>
          <Sidebar onNavigate={() => setMobileSidebarOpen(false)} />
        </div>
      </div>

      <div className="app-shell-main">
        <Header onOpenSidebar={() => setMobileSidebarOpen(true)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}