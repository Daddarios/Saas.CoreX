// ============================================================================
// === IMPORTS ===
// ============================================================================
import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// ============================================================================
// === MAIN COMPONENT: APP NAVBAR ===
// ============================================================================
export default function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ---------- HANDLERS ----------
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // ---------- RENDER ----------
  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top">
      <Container fluid>
        <Navbar.Brand as={Link} to="/">
          🏢 Vista CoreX
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/kunden">Kunden</Nav.Link>
            <Nav.Link as={Link} to="/projekte">Projekte</Nav.Link>
            <Nav.Link as={Link} to="/tickets">Tickets</Nav.Link>
            <Nav.Link as={Link} to="/chat">Chat</Nav.Link>
          </Nav>
          <Nav>
            <NavDropdown title={user?.vorname || 'Benutzer'} align="end">
              <NavDropdown.Item disabled className="text-muted small">
                {user?.email}
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>Abmelden</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
