import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLanguage } from '../../hooks/useLanguage';
import VikaChat from '../shared/VikaChat/VikaChat';
import { useAuth } from '../../hooks/useAuth';
import { useSignalR } from '../../hooks/useSignalR';
import { chatApi } from '../../api/chatApi';
import { getAvatarUrl } from '../../api/axiosClient';

const initials = (text = '') =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

export default function MainLayout() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
  const [chatNotice, setChatNotice] = useState(null);
  const [chatNoticeKey, setChatNoticeKey] = useState(0);

  const notificationReceive = useMemo(() => ({
    ReceiveMessage: (message) => {
      if (!message) return;
      if (location.pathname === '/chat') return;
      if (!message.absenderId || !user?.id) return;
      if (String(message.absenderId) === String(user.id)) return;

      const sender = [message.absender?.vorname, message.absender?.nachname].filter(Boolean).join(' ').trim()
        || message.absenderName
        || t('chat.user', 'User');
      const bild = message.absender?.bild ? getAvatarUrl(message.absender.bild) : null;
      setChatNotice((prev) => {
        if (prev && prev.sender === sender) {
          return { sender, bild: prev.bild || bild, count: (prev.count || 1) + 1 };
        }
        return { sender, bild, count: 1 };
      });
      setChatNoticeKey((k) => k + 1);
    },
  }), [location.pathname, t, user?.id]);

  const isChatPage = location.pathname === '/chat';

  const { connected: chatNoticeConnected, invoke: chatNoticeInvoke } = useSignalR('/hubs/chat', {
    onReceive: notificationReceive,
    autoStart: !isChatPage,
  });

  useEffect(() => {
    if (isChatPage || !chatNoticeConnected || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await chatApi.getRaeume();
        const rooms = Array.isArray(res.data) ? res.data : [];
        for (const room of rooms) {
          if (cancelled || !room?.id) continue;
          await chatNoticeInvoke('JoinRoom', String(room.id)).catch(() => {});
        }
      } catch {
        // ignore: notification-only yardımcı akış
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isChatPage, chatNoticeConnected, user?.id]);

  useEffect(() => {
    if (isChatPage) setChatNotice(null);
  }, [isChatPage]);

  useEffect(() => {
    if (!chatNotice) return undefined;
    const tid = setTimeout(() => setChatNotice(null), 4500);
    return () => clearTimeout(tid);
  }, [chatNoticeKey, chatNotice]);

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

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (!mobileSidebarOpen) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileSidebarOpen]);

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

  const canOpenVika = Boolean(user?.mandantId && String(user.mandantId).trim());
  const handleToggleVika = async () => {
    if (!canOpenVika) {
      try { await logout(); } catch { /* ignore */ }
      window.location.href = '/login';
      return;
    }
    setIsVikaOpen(!isVikaOpen);
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
        <div className="vika-fab-wrapper">
          {/* Panel her zaman mount — kapatma sadece gizler, sohbet ve baglanti korunur */}
          <div className={`vika-fab-panel ${isVikaOpen ? 'is-open' : ''}`} aria-hidden={!isVikaOpen}>
            <VikaChat />
          </div>
          <button
            type="button"
            className={`vika-fab ${isVikaOpen ? 'is-open' : ''}`}
            onClick={handleToggleVika}
            aria-label={isVikaOpen ? 'Close ViKA' : 'Open ViKA'}
          >
            <span className="vika-fab-halo" aria-hidden="true"></span>
            <span className="vika-fab-ring" aria-hidden="true"></span>
            <span className="vika-fab-core">
              <i className={isVikaOpen ? 'bi bi-x-lg' : 'bi bi-stars'}></i>
            </span>
            {!isVikaOpen && <span className="vika-fab-pulse-dot" aria-hidden="true"></span>}
          </button>
        </div>

        {chatNotice && (
          <button
            type="button"
            className="global-chat-notice"
            key={chatNoticeKey}
            onClick={() => {
              setChatNotice(null);
              navigate('/chat');
            }}
            title={t('chat.open', 'Open chat')}
          >
            <span className={`global-chat-notice-dot ${chatNoticeConnected ? 'online' : 'offline'}`} />
            {chatNotice.bild ? (
              <img className="global-chat-notice-avatar" src={chatNotice.bild} alt={chatNotice.sender} />
            ) : (
              <span className="global-chat-notice-avatar global-chat-notice-avatar-fallback">
                {initials(chatNotice.sender)}
              </span>
            )}
            <span className="global-chat-notice-text">{chatNotice.sender}</span>
            <span className="global-chat-notice-count">{chatNotice.count || 1}</span>
          </button>
        )}
      </div>
    </div>
  );
}
