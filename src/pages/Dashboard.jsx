import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Container, Row } from 'react-bootstrap';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { dashboardApi } from '../api/dashboardApi';
import { projektApi } from '../api/projektApi';
import { ticketApi } from '../api/ticketApi';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { useLanguage } from '../hooks/useLanguage';

const STATUS_COLORS = {
  NichtGestartet: '#6c757d',
  InBearbeitung: '#0d6efd',
  Abgeschlossen: '#198754',
  Pausiert: '#ffc107',
};

const TICKET_COLORS = {
  Offen: '#0d6efd',
  InBearbeitung: '#ffc107',
  Geloest: '#198754',
  Geschlossen: '#6c757d',
};

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
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [ticketChartData, setTicketChartData] = useState([]);
  const [ticketChartLoading, setTicketChartLoading] = useState(true);

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

  const loadChartData = async () => {
    setChartLoading(true);
    try {
      const res = await projektApi.getAll(1, 100);
      const projekte = res.data?.items || res.data || [];

      // Duruma göre grupla
      const grouped = {};
      projekte.forEach((p) => {
        const status = p.status || 'NichtGestartet';
        grouped[status] = (grouped[status] || 0) + 1;
      });

      const data = Object.entries(grouped).map(([status, count]) => ({
        name: t(`status.${status}`, status),
        count,
        status,
      }));

      setChartData(data);
    } catch {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  const loadTicketChart = async () => {
    setTicketChartLoading(true);
    try {
      const res = await ticketApi.getAll(1, 200);
      const tickets = res.data?.items || res.data || [];

      const grouped = {};
      tickets.forEach((tk) => {
        const status = tk.status || 'Offen';
        grouped[status] = (grouped[status] || 0) + 1;
      });

      const data = Object.entries(grouped).map(([status, count]) => ({
        name: t(`status.${status}`, status),
        value: count,
        status,
      }));

      setTicketChartData(data);
    } catch {
      setTicketChartData([]);
    } finally {
      setTicketChartLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadChartData();
    loadTicketChart();
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
          <Button size="sm" variant="outline-dark" onClick={() => { loadStats(); loadChartData(); loadTicketChart(); }}>
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

      {/* ── Grafikler Yan Yana ── */}
      <Row className="mt-2">
        <Col lg={8} className="mb-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0">
                  <i className="bi bi-bar-chart-fill me-2 text-primary" />
                  {t('dashboard.projekteAnzahl')} — {t('common.status')}
                </h5>
              </div>
              {chartLoading ? (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm me-2" />
                  {t('common.loading')}
                </div>
              ) : chartData.length === 0 ? (
                <div className="text-center py-5 text-muted">{t('common.noData')}</div>
              ) : (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 13 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,.12)',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="count"
                      name={t('dashboard.projekteAnzahl')}
                      radius={[6, 6, 0, 0]}
                      barSize={56}
                    >
                      {chartData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={STATUS_COLORS[entry.status] || '#0d6efd'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* ── Ticket Donut Chart ── */}
        <Col lg={4} className="mb-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <h5 className="mb-0">
                  <i className="bi bi-pie-chart-fill me-2 text-warning" />
                  {t('dashboard.ticketsAnzahl')} — {t('common.status')}
                </h5>
              </div>
              {ticketChartLoading ? (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm me-2" />
                  {t('common.loading')}
                </div>
              ) : ticketChartData.length === 0 ? (
                <div className="text-center py-5 text-muted">{t('common.noData')}</div>
              ) : (
                <ResponsiveContainer width="100%" height={360}>
                  <PieChart>
                    <Pie
                      data={ticketChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {ticketChartData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={TICKET_COLORS[entry.status] || '#0d6efd'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,.12)',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
