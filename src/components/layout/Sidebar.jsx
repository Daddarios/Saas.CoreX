import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';

const navItems = [
  { to: '/', labelKey: 'sidebar.dashboard', icon: 'bi-speedometer2', end: true },
  { to: '/kunden', labelKey: 'sidebar.kunden', icon: 'bi-people' },
  { to: '/projekte', labelKey: 'sidebar.projekte', icon: 'bi-kanban' },
  { to: '/tickets', labelKey: 'sidebar.tickets', icon: 'bi-ticket-detailed' },
  { to: '/benutzer', labelKey: 'sidebar.benutzer', icon: 'bi-person-gear' },
  { to: '/chat', labelKey: 'sidebar.chat', icon: 'bi-chat-dots' },
];

export default function Sidebar({ collapsed = false, onNavigate }) {
  const { t } = useLanguage();

  return (
    <aside className={`app-sidebar d-flex flex-column h-100${collapsed ? ' collapsed' : ''}`}>
      <div className="app-sidebar-brand px-2 py-2 border-bottom border-light-subtle">
        <div className="app-sidebar-eyebrow small text-uppercase text-secondary fw-semibold">{t('sidebar.eyebrow')}</div>
        <h5 className="app-sidebar-title mb-0 text-dark fw-bold">{t('sidebar.title')}</h5>
      </div>

      <nav className="p-2 flex-grow-1">
        <ul className="nav nav-pills flex-column gap-1">
          {navItems.map((item) => (
            <li className="nav-item" key={item.to}>
              {(() => {
                const label = t(item.labelKey);

                return (
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-2 sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <i className={`bi ${item.icon} sidebar-link-icon`} />
                <span className="sidebar-link-label">{label}</span>
              </NavLink>
                );
              })()}
            </li>
          ))}
        </ul>
      </nav>

      <div className="app-sidebar-footer p-2 border-top border-light-subtle text-muted small">
        <span className="app-sidebar-footer-label">{t('sidebar.footer')}</span>
      </div>
    </aside>
  );
}