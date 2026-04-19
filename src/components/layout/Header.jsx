import { useEffect, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Header({ onOpenSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    const nextTheme = savedTheme || preferred;
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  return (
    <header className="app-header px-3 px-lg-4 py-2 d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary d-lg-none"
          onClick={onOpenSidebar}
          aria-label="Menue öffnen"
        >
          <i className="bi bi-list" />
        </button>
        <div>
          <div className="small text-secondary">Willkommen</div>
          <div className="fw-semibold">{user?.vorname || 'Benutzer'}</div>
        </div>
      </div>

      <div className="d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn theme-toggle-btn d-flex align-items-center gap-2"
          onClick={toggleTheme}
          aria-label="Dark Light Mod"
        >
          <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} />
          <span className="d-none d-sm-inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        <Dropdown align="end">
          <Dropdown.Toggle variant="light" className="border d-flex align-items-center gap-2 profile-toggle-btn">
            <i className="bi bi-person-circle" />
            <span className="d-none d-sm-inline">Profil</span>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Header>{user?.email || 'no-email'}</Dropdown.Header>
            <Dropdown.Divider />
            <Dropdown.Item onClick={handleLogout}>Abmelden</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </header>
  );
}