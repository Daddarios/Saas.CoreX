import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import { dashboardApi } from '../api/dashboardApi';

function StatCard({ title, value, icon, color = 'primary' }) {
  return (
    <Col md={3} sm={6} className="mb-4">
      <Card className={`border-${color} h-100`}>
        <Card.Body className="d-flex align-items-center">
          <div className={`fs-1 me-3 text-${color}`}>{icon}</div>
          <div>
            <div className="text-muted small">{title}</div>
            <div className="fs-3 fw-bold">{value ?? '—'}</div>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getStats()
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner />
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Dashboard</h2>
      <Row>
        <StatCard title="Kunden" value={stats?.kundenAnzahl} icon="👥" color="primary" />
        <StatCard title="Projekte" value={stats?.projekteAnzahl} icon="📁" color="success" />
        <StatCard title="Tickets" value={stats?.ticketsAnzahl} icon="🎫" color="warning" />
        <StatCard title="Offene Tickets" value={stats?.offeneTickets} icon="📌" color="danger" />
      </Row>

      <Row className="mt-3">
        <StatCard title="Benutzer" value={stats?.benutzerAnzahl} icon="👤" color="info" />
        <StatCard title="Berichte" value={stats?.berichteAnzahl} icon="📄" color="secondary" />
        <StatCard
          title="Projekte (aktiv)"
          value={stats?.aktiveProjekte}
          icon="🚀"
          color="success"
        />
        <StatCard
          title="Tickets (kritisch)"
          value={stats?.kritischeTickets}
          icon="🔴"
          color="danger"
        />
      </Row>
    </Container>
  );
}
