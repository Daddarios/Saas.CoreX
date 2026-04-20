import { Offcanvas } from 'react-bootstrap';

const themeOptions = [
  {
    value: 'light',
    icon: 'bi-sun',
    titleKey: 'header.light',
    fallback: 'Light',
    descriptionKey: 'header.themeLightDesc',
    descriptionFallback: 'Bright and clear interface',
  },
  {
    value: 'dark',
    icon: 'bi-moon-stars',
    titleKey: 'header.dark',
    fallback: 'Dark',
    descriptionKey: 'header.themeDarkDesc',
    descriptionFallback: 'Low-light friendly interface',
  },
  {
    value: 'system',
    icon: 'bi-circle-half',
    titleKey: 'header.system',
    fallback: 'System',
    descriptionKey: 'header.themeSystemDesc',
    descriptionFallback: 'Follow operating system',
  },
];

const sidebarOptions = [
  {
    value: 'sidebar',
    icon: 'bi-layout-sidebar',
    titleKey: 'header.sidebarStyleSidebar',
    fallback: 'Sidebar',
  },
  {
    value: 'inset',
    icon: 'bi-layout-sidebar-inset',
    titleKey: 'header.sidebarStyleInset',
    fallback: 'Inset',
  },
  {
    value: 'floating',
    icon: 'bi-layout-sidebar-reverse',
    titleKey: 'header.sidebarStyleFloating',
    fallback: 'Floating',
  },
];

const layoutOptions = [
  {
    value: 'default',
    icon: 'bi-square',
    titleKey: 'header.layoutDefault',
    fallback: 'Default',
  },
  {
    value: 'compact',
    icon: 'bi-grid-3x3-gap',
    titleKey: 'header.layoutCompact',
    fallback: 'Compact',
  },
  {
    value: 'full',
    icon: 'bi-arrows-fullscreen',
    titleKey: 'header.layoutFull',
    fallback: 'Full',
  },
];

function SettingsSection({ title, description, children }) {
  return (
    <section className="settings-section-card">
      <div className="settings-section-head">
        <h6 className="settings-section-title mb-1">{title}</h6>
        <p className="settings-section-subtitle mb-0">{description}</p>
      </div>
      <div className="settings-section-body">{children}</div>
    </section>
  );
}

export default function ThemeSettingsPanel({
  show,
  onHide,
  t,
  themeMode,
  resolvedTheme,
  onThemeModeChange,
  sidebarStyle,
  onSidebarStyleChange,
  layoutStyle,
  onLayoutStyleChange,
  sidebarCollapsed,
  onSidebarCollapsedChange,
  onResetSettings,
}) {
  const hasCustomSettings =
    themeMode !== 'system' ||
    sidebarStyle !== 'sidebar' ||
    layoutStyle !== 'default' ||
    sidebarCollapsed;

  return (
    <Offcanvas show={show} onHide={onHide} placement="end" className="theme-settings-offcanvas">
      <Offcanvas.Header closeButton className="theme-settings-header">
        <div>
          <Offcanvas.Title>{t('header.themeSettings', 'Theme Settings')}</Offcanvas.Title>
          <div className="settings-header-subtitle">{t('header.themeSettingsDesc', 'Tune appearance and layout behavior.')}</div>
        </div>
        <button
          type="button"
          className="btn settings-reset-btn"
          onClick={onResetSettings}
          disabled={!hasCustomSettings}
        >
          <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
          <span>{t('common.reset', 'Reset')}</span>
        </button>
      </Offcanvas.Header>
      <Offcanvas.Body className="d-flex flex-column gap-3 theme-settings-body">
        <SettingsSection
          title={t('header.themeMode', 'Theme mode')}
          description={t('header.themeModeDesc', 'Choose the visual mode for your workspace.')}
        >
          <div className="settings-visual-grid">
            {themeOptions.map((option) => {
              const isActive = themeMode === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`settings-visual-option${isActive ? ' active' : ''}`}
                  onClick={() => onThemeModeChange(option.value)}
                  aria-pressed={isActive}
                >
                  <span className={`settings-mini-preview settings-mini-theme settings-mini-theme-${option.value}`}>
                    <span className="settings-mini-dot" />
                    <span className="settings-mini-line" />
                    <span className="settings-mini-line short" />
                  </span>
                  <span className="settings-visual-title-row">
                    <i className={`bi ${option.icon} settings-visual-icon`} aria-hidden="true" />
                    <span className="settings-option-title">{t(option.titleKey, option.fallback)}</span>
                  </span>
                  {isActive ? <i className="bi bi-check2-circle settings-option-check" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>

          <div className="settings-inline-note mt-3">
            {t('header.activeTheme', 'Active theme')}: {t(`header.${resolvedTheme}`, resolvedTheme)}
          </div>
        </SettingsSection>

        <SettingsSection
          title={t('header.sidebarStyle', 'Sidebar style')}
          description={t('header.sidebarStyleDesc', 'Switch between Sidebar, Inset, and Floating navigation.')}
        >
          <div className="settings-visual-grid">
            {sidebarOptions.map((option) => {
              const isActive = sidebarStyle === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`settings-visual-option${isActive ? ' active' : ''}`}
                  onClick={() => onSidebarStyleChange(option.value)}
                  aria-pressed={isActive}
                >
                  <span className={`settings-mini-preview settings-mini-sidebar settings-mini-sidebar-${option.value}`}>
                    <span className="settings-mini-sidebar-nav" />
                    <span className="settings-mini-sidebar-content" />
                  </span>
                  <span className="settings-visual-title-row">
                    <i className={`bi ${option.icon} settings-visual-icon`} aria-hidden="true" />
                    <span className="settings-option-title">{t(option.titleKey, option.fallback)}</span>
                  </span>
                  {isActive ? <i className="bi bi-check2-circle settings-option-check" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </SettingsSection>

        <SettingsSection
          title={t('header.layoutMode', 'Layout mode')}
          description={t('header.layoutModeDesc', 'Choose Default, Compact, or Full layout density.')}
        >
          <div className="settings-visual-grid">
            {layoutOptions.map((option) => {
              const isActive = layoutStyle === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`settings-visual-option${isActive ? ' active' : ''}`}
                  onClick={() => onLayoutStyleChange(option.value)}
                  aria-pressed={isActive}
                >
                  <span className={`settings-mini-preview settings-mini-layout settings-mini-layout-${option.value}`}>
                    <span className="settings-mini-layout-bar" />
                    <span className="settings-mini-layout-body" />
                  </span>
                  <span className="settings-visual-title-row">
                    <i className={`bi ${option.icon} settings-visual-icon`} aria-hidden="true" />
                    <span className="settings-option-title">{t(option.titleKey, option.fallback)}</span>
                  </span>
                  {isActive ? <i className="bi bi-check2-circle settings-option-check" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </SettingsSection>

        <SettingsSection
          title={t('header.sidebar', 'Sidebar')}
          description={t('header.sidebarDesc', 'Control how navigation appears by default.')}
        >
          <button
            type="button"
            className={`settings-toggle-row${sidebarCollapsed ? ' active' : ''}`}
            onClick={() => onSidebarCollapsedChange(!sidebarCollapsed)}
            aria-pressed={sidebarCollapsed}
          >
            <span>
              <span className="settings-toggle-title">{t('header.sidebarCollapsed', 'Collapsed sidebar')}</span>
              <span className="settings-toggle-subtitle">{t('header.sidebarCollapsedDesc', 'Show icon-only sidebar on desktop')}</span>
            </span>
            <span className={`settings-toggle-dot${sidebarCollapsed ? ' active' : ''}`} />
          </button>
        </SettingsSection>
      </Offcanvas.Body>
    </Offcanvas>
  );
}
