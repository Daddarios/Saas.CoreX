import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLanguage } from '../../hooks/useLanguage';
import VikaChat from '../shared/VikaChat/VikaChat';

export default function MainLayout() {
  const { t } = useLanguage();
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === 'undefined') {
      return 'system';
    }

    const savedTheme = localStorage.getItem('theme-mode');
    return savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system' ? savedTheme : 'system';
  });
  const [resolvedTheme, setResolvedTheme] = useState('light');
  const [sidebarStyle, setSidebarStyle] = useState(() => {
    if (typeof window === 'undefined') {
      return 'sidebar';
    }

    const savedStyle = localStorage.getItem('app-sidebar-style');
    return savedStyle === 'inset' || savedStyle === 'floating' || savedStyle === 'sidebar'
      ? savedStyle
      : 'sidebar';
  });
  const [layoutStyle, setLayoutStyle] = useState(() => {
    if (typeof window === 'undefined') {
      return 'default';
    }

    const savedLayoutStyle = localStorage.getItem('app-layout-style');
    return savedLayoutStyle === 'compact' || savedLayoutStyle === 'full' || savedLayoutStyle === 'default'
      ? savedLayoutStyle
      : 'default';
  });
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return localStorage.getItem('desktop-sidebar-collapsed') === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isVikaOpen, setIsVikaOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const nextTheme = themeMode === 'system' ? (media.matches ? 'dark' : 'light') : themeMode;
      setResolvedTheme(nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    };

    applyTheme();

    if (themeMode !== 'system') {
      return undefined;
    }

    const listener = () => applyTheme();
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem('app-sidebar-style', sidebarStyle);
  }, [sidebarStyle]);

  useEffect(() => {
    localStorage.setItem('app-layout-style', layoutStyle);
  }, [layoutStyle]);

  const handleThemeModeChange = (nextMode) => {
    setThemeMode(nextMode);
    localStorage.setItem('theme-mode', nextMode);
  };

  const resetSettings = () => {
    setThemeMode('system');
    localStorage.setItem('theme-mode', 'system');

    setSidebarStyle('sidebar');
    localStorage.setItem('app-sidebar-style', 'sidebar');

    setLayoutStyle('default');
    localStorage.setItem('app-layout-style', 'default');

    setDesktopSidebarCollapsed(false);
    localStorage.setItem('desktop-sidebar-collapsed', 'false');
  };

  const toggleDesktopSidebar = () => {
    setDesktopSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem('desktop-sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <div className={`app-shell app-sidebar-style-${sidebarStyle} app-layout-${layoutStyle}`}>
      <div className={`d-none d-lg-block app-shell-sidebar${desktopSidebarCollapsed ? ' collapsed' : ''}`}>
        <Sidebar collapsed={desktopSidebarCollapsed} />
      </div>

      <div className={`app-mobile-sidebar-backdrop ${mobileSidebarOpen ? 'show' : ''}`}>
        <button
          type="button"
          className="app-mobile-sidebar-close"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label={t('common.closeMenu')}
        />
        <div className={`app-mobile-sidebar ${mobileSidebarOpen ? 'show' : ''}`}>
          <Sidebar onNavigate={() => setMobileSidebarOpen(false)} />
        </div>
      </div>

      <div className="app-shell-main">
        <Header
          isSidebarCollapsed={desktopSidebarCollapsed}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          onToggleDesktopSidebar={toggleDesktopSidebar}
          themeMode={themeMode}
          resolvedTheme={resolvedTheme}
          onThemeModeChange={handleThemeModeChange}
          sidebarStyle={sidebarStyle}
          onSidebarStyleChange={setSidebarStyle}
          layoutStyle={layoutStyle}
          onLayoutStyleChange={setLayoutStyle}
          onSidebarCollapsedChange={(nextState) => {
            setDesktopSidebarCollapsed(nextState);
            localStorage.setItem('desktop-sidebar-collapsed', String(nextState));
          }}
          onResetSettings={resetSettings}
        />
        <main className="app-content">
          <div className="app-content-inner">
            <Outlet />
          </div>
        </main>

        {/* VIKA AI Assistant Floating Widget */}
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
          {isVikaOpen && (
            <div style={{ position: 'absolute', bottom: '80px', right: '0', width: '380px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', borderRadius: '12px' }}>
              <VikaChat />
            </div>
          )}
          <button 
            onClick={() => setIsVikaOpen(!isVikaOpen)}
            style={{ 
              width: '60px', height: '60px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
              color: 'white', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <i className={isVikaOpen ? "bi bi-x-lg" : "bi bi-robot"}></i>
          </button>
        </div>
      </div>
    </div>
  );
}