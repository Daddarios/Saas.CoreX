import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { languageOptions, useLanguage } from '../../hooks/useLanguage';
import ThemeSettingsPanel from './ThemeSettingsPanel';

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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    onThemeModeChange(nextTheme);
  };

  const activeLanguage = languageOptions.find((option) => option.code === language) || languageOptions[1];
  const isDarkMode = resolvedTheme === 'dark';

  return (
    <header className="app-header px-3 px-lg-4 py-2 d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-center gap-2">
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
        <Dropdown align="end">
          <Dropdown.Toggle variant="light" className="header-action-btn language-toggle-btn">
            <span className={`fi fi-${activeLanguage.countryCode}`} style={{ fontSize: '1.1rem' }} />
          </Dropdown.Toggle>
          <Dropdown.Menu className="language-dropdown-menu">
            {languageOptions.map((option) => (
              <Dropdown.Item key={option.code} active={language === option.code} onClick={() => setLanguage(option.code)}>
                <span className={`fi fi-${option.countryCode} me-2`} style={{ fontSize: '1.1rem' }} />
                {option.label}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>

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

        <Dropdown align="end">
          <Dropdown.Toggle variant="light" className="header-action-btn profile-toggle-btn">
            <i className="bi bi-person-circle" />
            <span className="d-none d-sm-inline">{t('common.profile')}</span>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Header>{user?.email || 'no-email'}</Dropdown.Header>
            <Dropdown.Divider />
            <Dropdown.Item onClick={handleLogout}>{t('common.logout')}</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
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