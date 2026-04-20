import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Container, Row } from 'react-bootstrap';
import { dashboardApi } from '../api/dashboardApi';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { useLanguage } from '../hooks/useLanguage';

function StatCard({ title, value, icon, color = 'primary' }) {
  return (
    <Col md={3} sm={6} className="mb-4">
      <Card className={`h-100 border-0 shadow-sm stat-card stat-card-${color}`}>
        <Card.Body className="d-flex align-items-center">
          <div className={`fs-3 me-3 text-${color}`}>
            <i className={`bi ${icon}`} />
          </div>
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
  const { t } = useLanguage();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const statItems = [
    { key: 'kundenAnzahl', title: t('dashboard.kundenAnzahl'), icon: 'bi-people', color: 'primary', group: 'core' },
    { key: 'projekteAnzahl', title: t('dashboard.projekteAnzahl'), icon: 'bi-kanban', color: 'success', group: 'core' },
    { key: 'ticketsAnzahl', title: t('dashboard.ticketsAnzahl'), icon: 'bi-ticket-detailed', color: 'warning', group: 'ops' },
    { key: 'offeneTickets', title: t('dashboard.offeneTickets'), icon: 'bi-exclamation-circle', color: 'danger', group: 'ops' },
    { key: 'benutzerAnzahl', title: t('dashboard.benutzerAnzahl'), icon: 'bi-person-gear', color: 'info', group: 'core' },
    { key: 'berichteAnzahl', title: t('dashboard.berichteAnzahl'), icon: 'bi-file-earmark-text', color: 'secondary', group: 'ops' },
    { key: 'aktiveProjekte', title: t('dashboard.aktiveProjekte'), icon: 'bi-rocket-takeoff', color: 'success', group: 'core' },
    { key: 'kritischeTickets', title: t('dashboard.kritischeTickets'), icon: 'bi-bell', color: 'danger', group: 'ops' },
  ];

  const visibleStats = filter === 'all'
    ? statItems
    : statItems.filter((item) => item.group === filter);

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardApi.getStats();
      setStats(res.data || {});
    } catch (err) {
      setError(err.response?.data?.message || t('dashboard.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <Container className="py-4">
        <LoadingSpinner text={t('dashboard.loading')} />
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <h2 className="mb-0">{t('dashboard.title')}</h2>
        <div className="d-flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'primary' : 'outline-primary'}
            onClick={() => setFilter('all')}
          >
            {t('dashboard.all')}
          </Button>
          <Button
            size="sm"
            variant={filter === 'core' ? 'primary' : 'outline-primary'}
            onClick={() => setFilter('core')}
          >
            Core
          </Button>
          <Button
            size="sm"
            variant={filter === 'ops' ? 'primary' : 'outline-primary'}
            onClick={() => setFilter('ops')}
          >
            Ops
          </Button>
          <Button size="sm" variant="outline-dark" onClick={loadStats}>
            <i className="bi bi-arrow-clockwise me-1" /> {t('dashboard.refresh')}
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {!error && visibleStats.length === 0 && (
        <Alert variant="light" className="border">{t('dashboard.empty')}</Alert>
      )}

      <Row>
        {visibleStats.map((item) => (
          <StatCard
            key={item.key}
            title={item.title}
            value={stats[item.key]}
            icon={item.icon}
            color={item.color}
          />
        ))}
      </Row>
    </Container>
  );
}
