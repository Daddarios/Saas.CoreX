import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { languageOptions, useLanguage } from '../../hooks/useLanguage';
import ThemeSettingsPanel from './ThemeSettingsPanel';
import { getAvatarUrl } from '../../api/axiosClient';

// Rol bazlı renk — SuperAdmin/Admin: kırmızı, Manager: mavi, Standard/NurLesen: yeşil
const rolleColor = (rolle) => {
  if (!rolle) return 'var(--bs-secondary)';
  if (['SuperAdmin', 'Admin'].includes(rolle)) return '#dc3545';
  if (rolle === 'Manager') return '#0d6efd';
  return '#198754'; // Standard, NurLesen
};

function PortalMenu({ triggerRef, open, onClose, children, minWidth = 180, offset = 6 }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + window.scrollY + offset,
        right: window.innerWidth - rect.right,
      });
      setClosing(false);
      setMounted(true);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, 260);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          triggerRef.current && !triggerRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose, triggerRef]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`portal-dropdown-menu${closing ? ' closing' : ''}`}
      style={{
        position: 'absolute',
        top: pos.top,
        right: pos.right,
        minWidth,
        zIndex: 99999,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

export default function Header({
  isSidebarCollapsed,
  onOpenSidebar,
  onToggleDesktopSidebar,
  themeMode,
  resolvedTheme,
  onThemeModeChange,
  sidebarStyle,
  onSidebarStyleChange,
  layoutStyle,
  onLayoutStyleChange,
  onSidebarCollapsedChange,
  onResetSettings,
}) {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false); // Görsel yüklenemezse fallback göster
  const profileRef = useRef(null);
  const langRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeAll = useCallback(() => {
    setProfileOpen(false);
    setLangOpen(false);
    document.body.style.overflow = '';
  }, []);

  // Reset avatar error when user changes (login/logout)
  useEffect(() => {
    console.log('[Header] User changed, resetting avatar error. User:', user?.email, 'has bild:', !!user?.bild);
    setAvatarError(false);
  }, [user, user?.bild]);

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    onThemeModeChange(nextTheme);
  };

  const activeLanguage = languageOptions.find((option) => option.code === language) || languageOptions[1];
  const isDarkMode = resolvedTheme === 'dark';

  return (
    <header className="app-header px-3 px-lg-4 py-3 d-flex align-items-center justify-content-between mb-5">
    
      <div className="d-flex align-items-center gap-2 ">   
        <button
          type="button"
          className="btn btn-outline-secondary d-lg-none"
          onClick={onOpenSidebar}
          aria-label={t('header.openMenu')}
        >
          <i className="bi bi-list" />
        </button>
        <button  
          type="button"
          className="header-action-btn sidebar-desktop-toggle d-none d-lg-inline-flex"
          onClick={onToggleDesktopSidebar}
          aria-label={isSidebarCollapsed ? t('header.expandMenu') : t('header.collapseMenu')}
        >
          <i className={`bi ${isSidebarCollapsed ? 'bi-layout-sidebar-inset' : 'bi-layout-sidebar'}`} />
        </button>
        <div>
          <div className="small text-secondary">{t('header.welcome')}</div>
          <div className="fw-semibold">{user?.vorname || t('sidebar.benutzer')}</div>
        </div>
      </div>

      <div className="d-flex align-items-center gap-2">
        {/* Dil Dropdown */}
        <button
          ref={langRef}
          type="button"
          className="header-action-btn language-toggle-btn "
          onClick={() => { setLangOpen(v => !v); setProfileOpen(false); }}
          aria-label={t('header.language', 'Language')}
        >
          <span className={`fi fi-${activeLanguage.countryCode}`} style={{ fontSize: '1.1rem' }} />
        </button>
        <PortalMenu triggerRef={langRef} open={langOpen} onClose={() => setLangOpen(false)} minWidth={90} offset={5}>
          {languageOptions.map((option) => (
            <button
             
              key={option.code}
              className={`portal-dropdown-item${language === option.code ? ' active' : ''}` }
              onClick={() => { setLanguage(option.code); setLangOpen(false); }}
            >
              <span className={`fi fi-${option.countryCode} me-3`} style={{ fontSize: '1.1rem' }} />
              {option.label}
            </button>
          ))}
        </PortalMenu>

        <button
          type="button"
          className="header-action-btn"
          onClick={toggleTheme}
          aria-label={`${t('header.themeMode', 'Theme mode')}: ${t(`header.${themeMode}`, themeMode)}`}
        >
          <i className={`bi ${isDarkMode ? 'bi-moon-stars-fill' : 'bi bi-brightness-high'}`} />
        </button>

        <button
          type="button"
          className="header-action-btn"
          aria-label={t('header.themeSettings', 'Theme settings')}
          onClick={() => setSettingsOpen(true)}
        >
          <i className="bi bi-sliders" />
        </button>

        {/* Profil Avatar — ref her zaman wrapper'da, içeriği avatarUrl'e göre değişir */}
        <div
          ref={profileRef}
          className="d-flex align-items-center justify-content-center"
          onClick={() => { setProfileOpen(v => !v); setLangOpen(false); }}
          style={{ cursor: 'pointer', borderRadius: '50%' }}
        >
          {getAvatarUrl(user?.bild) && !avatarError ? (
            <img
              src={getAvatarUrl(user.bild)}
              alt="Profile"
              onError={() => setAvatarError(true)} // URL geçersizse fallback'e düş
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid var(--bs-border-color)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                display: 'block',
              }}
            />
          ) : (
            <div
              className="d-flex align-items-center justify-content-center bg-secondary-subtle"
              style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--bs-border-color)' }}
            >
              <i className="bi bi-person-fill text-secondary" style={{ fontSize: '20px' }} />
            </div>
          )}
        </div>
        <PortalMenu triggerRef={profileRef} open={profileOpen} onClose={() => setProfileOpen(false)} minWidth={200}>
          <div className="portal-dropdown-header d-flex flex-column align-items-center gap-3">
            <div className="fw-semibold fs-4 fw-bold ">{user?.vorname} {user?.nachname}</div>
            <div className="text-muted small fw-light ">{user?.email} |  
               <small className="small fw-semibold " style={{ color: rolleColor(user?.rolle) }}> {user?.rolle}</small></div>
           
          </div>
          <div className="portal-dropdown-divider" />
          <button className="portal-dropdown-item" onClick={() => { navigate('/profil'); closeAll(); }}>
            <i className="bi bi-person me-2" />{t('common.profile')}
          </button>
          <button className="portal-dropdown-item" onClick={() => { navigate('/settings'); closeAll(); }}>
            <i className="bi bi-gear me-2" />{t('common.settings')}
          </button>
          <div className="portal-dropdown-divider" />
          <button className="portal-dropdown-item text-danger fw-bold justify-content-center" onClick={() => { handleLogout(); closeAll(); }}>
            <i className="bi bi-box-arrow-right me-2 fw-bold" />{t('common.logout')}
          </button>
        </PortalMenu>
      </div>

      <ThemeSettingsPanel
        show={settingsOpen}
        onHide={() => setSettingsOpen(false)}
        t={t}
        themeMode={themeMode}
        resolvedTheme={resolvedTheme}
        onThemeModeChange={onThemeModeChange}
        sidebarStyle={sidebarStyle}
        onSidebarStyleChange={onSidebarStyleChange}
        layoutStyle={layoutStyle}
        onLayoutStyleChange={onLayoutStyleChange}
        sidebarCollapsed={isSidebarCollapsed}
        onSidebarCollapsedChange={onSidebarCollapsedChange}
        onResetSettings={onResetSettings}
      />
    </header>
  );
}