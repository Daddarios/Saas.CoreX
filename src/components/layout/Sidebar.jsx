import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'bi-speedometer2', end: true },
  { to: '/kunden', label: 'Kunden', icon: 'bi-people' },
  { to: '/projekte', label: 'Projekte', icon: 'bi-kanban' },
  { to: '/tickets', label: 'Tickets', icon: 'bi-ticket-detailed' },
  { to: '/chat', label: 'Chat', icon: 'bi-chat-dots' },
];

export default function Sidebar({ onNavigate }) {
  return (
    <aside className="app-sidebar d-flex flex-column h-100">
      <div className="px-3 py-4 border-bottom border-light-subtle">
        <div className="small text-uppercase text-secondary fw-semibold">Vista Core</div>
        <h5 className="mb-0 text-dark fw-bold">CRM Workspace</h5>
      </div>

      <nav className="p-3 flex-grow-1">
        <ul className="nav nav-pills flex-column gap-2">
          {navItems.map((item) => (
            <li className="nav-item" key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-2 sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <i className={`bi ${item.icon}`} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-3 border-top border-light-subtle text-muted small">
        Mandant paneli
      </div>
    </aside>
  );
}