import { useEffect, useState, useCallback } from 'react';
import { Alert, Container } from 'react-bootstrap';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area,
} from 'recharts';
import '../styles/Dashboard.css';
import { dashboardApi } from '../api/dashboardApi';
import { projektApi } from '../api/projektApi';
import { ticketApi } from '../api/ticketApi';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';

// ═══════════════════════════════════════════
// RENK PALETİ
// ═══════════════════════════════════════════
const COLORS = {
  primary: '#6366f1',
  primaryLight: '#818cf8',
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  danger: '#ef4444',
  dangerLight: '#f87171',
  info: '#06b6d4',
  infoLight: '#22d3ee',
  purple: '#8b5cf6',
  pink: '#ec4899',
  slate: '#64748b',
  gradient: {
    primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    danger: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
    info: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
    purple: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    pink: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
    dark: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
  },
};

const STATUS_COLORS = {
  NichtGestartet: COLORS.slate,
  InBearbeitung: COLORS.primary,
  Abgeschlossen: COLORS.success,
  Pausiert: COLORS.warning,
};

const TICKET_COLORS = {
  Offen: COLORS.primary,
  InBearbeitung: COLORS.warning,
  Geloest: COLORS.success,
  Geschlossen: COLORS.slate,
};

const PRIORITY_COLORS = {
  Niedrig: COLORS.info,
  Mittel: COLORS.warning,
  Hoch: COLORS.danger,
  Kritisch: COLORS.pink,
};

// ═══════════════════════════════════════════
// STAT KART BİLEŞENİ — Premium Glassmorphism
// ═══════════════════════════════════════════
function StatCard({ title, value, icon, gradient, trend, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Sayaç animasyonu
  useEffect(() => {
    if (!visible || value == null) return;
    const target = typeof value === 'number' ? value : parseInt(value, 10);
    if (isNaN(target)) { setCount(value); return; }
    const duration = 800;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [visible, value]);

  return (
    <div
      className="dashboard-stat-card"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `all 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
      }}
    >
      <div className="stat-card-inner" style={{ background: gradient }}>
        <div className="stat-card-icon">
          <i className={`bi ${icon}`} />
        </div>
        <div className="stat-card-content">
          <div className="stat-card-value">{count ?? '—'}</div>
          <div className="stat-card-title">{title}</div>
        </div>
        {trend != null && (
          <div className={`stat-card-trend ${trend >= 0 ? 'up' : 'down'}`}>
            <i className={`bi bi-arrow-${trend >= 0 ? 'up' : 'down'}-short`} />
            {Math.abs(trend)}%
          </div>
        )}
        {/* Dekoratif daire */}
        <div className="stat-card-decoration" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// CUSTOM TOOLTIP
// ═══════════════════════════════════════════
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dashboard-tooltip">
      <div className="dashboard-tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="dashboard-tooltip-item">
          <span className="dashboard-tooltip-dot" style={{ background: p.color || p.fill }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// CHART KART WRAPPER
// ═══════════════════════════════════════════
function ChartCard({ title, icon, iconColor, children, className = '' }) {
  return (
    <div className={`dashboard-chart-card ${className}`}>
      <div className="chart-card-header">
        <div className="chart-card-title">
          <i className={`bi ${icon}`} style={{ color: iconColor }} />
          <span>{title}</span>
        </div>
      </div>
      <div className="chart-card-body">
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SON AKTİVİTELER (Son Ticketlar)
// ═══════════════════════════════════════════
function RecentTickets({ tickets }) {
  if (!tickets || tickets.length === 0) return (
    <div className="text-center py-4 text-muted">Keine aktuellen Tickets</div>
  );

  return (
    <div className="recent-list">
      {tickets.slice(0, 6).map((t, i) => (
        <div key={t.id || i} className="recent-item" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="recent-item-indicator"
            style={{ background: PRIORITY_COLORS[t.prioritaet] || COLORS.slate }} />
          <div className="recent-item-content">
            <div className="recent-item-title">{t.titel}</div>
            <div className="recent-item-meta">
              <span className="recent-item-badge"
                style={{ background: `${TICKET_COLORS[t.status] || COLORS.slate}20`, color: TICKET_COLORS[t.status] || COLORS.slate }}>
                {t.status}
              </span>
              {t.faelligkeitsdatum && (
                <span className="recent-item-date">
                  <i className="bi bi-calendar3 me-1" />{t.faelligkeitsdatum.slice(0, 10)}
                </span>
              )}
            </div>
          </div>
          <div className="recent-item-priority"
            style={{ color: PRIORITY_COLORS[t.prioritaet] || COLORS.slate }}>
            <i className="bi bi-flag-fill" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// PRIORITY BREAKDOWN
// ═══════════════════════════════════════════
function PriorityBreakdown({ tickets, t: translate }) {
  const priorities = ['Niedrig', 'Mittel', 'Hoch', 'Kritisch'];
  const total = tickets.length || 1;

  return (
    <div className="priority-breakdown">
      {priorities.map((p) => {
        const count = tickets.filter((tk) => tk.prioritaet === p).length;
        const pct = Math.round((count / total) * 100);
        return (
          <div key={p} className="priority-row">
            <div className="priority-label">
              <span className="priority-dot" style={{ background: PRIORITY_COLORS[p] }} />
              <span>{translate(`status.${p}`, p)}</span>
            </div>
            <div className="priority-bar-wrapper">
              <div className="priority-bar"
                style={{ width: `${pct}%`, background: PRIORITY_COLORS[p], transition: 'width 1s ease' }} />
            </div>
            <span className="priority-count">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// ANA DASHBOARD
// ═══════════════════════════════════════════
export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartData, setChartData] = useState([]);
  const [ticketChartData, setTicketChartData] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, projektRes, ticketRes] = await Promise.all([
        dashboardApi.getStats(),
        projektApi.getAll(1, 100),
        ticketApi.getAll(1, 200),
      ]);

      // Stats
      setStats(statsRes.data || {});

      // Projekte chart
      const projekte = projektRes.data?.items || projektRes.data || [];
      const pGrouped = {};
      projekte.forEach((p) => {
        const status = p.status || 'NichtGestartet';
        pGrouped[status] = (pGrouped[status] || 0) + 1;
      });
      setChartData(Object.entries(pGrouped).map(([status, count]) => ({
        name: t(`status.${status}`, status), count, status,
      })));

      // Tickets
      const tickets = ticketRes.data?.items || ticketRes.data || [];
      setAllTickets(tickets);
      setRecentTickets(tickets.slice(0, 6));

      // Ticket chart
      const tGrouped = {};
      tickets.forEach((tk) => {
        const status = tk.status || 'Offen';
        tGrouped[status] = (tGrouped[status] || 0) + 1;
      });
      setTicketChartData(Object.entries(tGrouped).map(([status, count]) => ({
        name: t(`status.${status}`, status), value: count, status,
      })));
    } catch (err) {
      setError(err.response?.data?.message || t('dashboard.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Saat selamlama
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  if (loading) {
    return (
      <Container className="py-4">
        <LoadingSpinner text={t('dashboard.loading')} />
      </Container>
    );
  }

  // Fake trend verisi (gerçek veri yoksa)
  const trendData = [
    { name: 'Mo', projekte: 4, tickets: 7 },
    { name: 'Di', projekte: 6, tickets: 5 },
    { name: 'Mi', projekte: 5, tickets: 8 },
    { name: 'Do', projekte: 8, tickets: 6 },
    { name: 'Fr', projekte: 7, tickets: 4 },
    { name: 'Sa', projekte: 3, tickets: 2 },
    { name: 'So', projekte: 2, tickets: 1 },
  ];

  return (
    <div className="dashboard-root">
      {/* ── HEADER ── */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div>
            <h1 className="dashboard-greeting">
              {greeting}, <span className="dashboard-username">{user?.vorname || 'Admin'}</span>
            </h1>
            <p className="dashboard-subtitle">Hier ist Ihr Überblick für heute</p>
          </div>
          <button className="dashboard-refresh-btn" onClick={loadAll}>
            <i className="bi bi-arrow-clockwise" />
            <span>{t('dashboard.refresh')}</span>
          </button>
        </div>
      </div>

      {error && <Alert variant="danger" className="mx-4">{error}</Alert>}

      {/* ── STAT KARTEN ── */}
      <div className="dashboard-stats-grid">
        <StatCard title={t('dashboard.kundenAnzahl')} value={stats.kundenAnzahl}
          icon="bi-people-fill" gradient={COLORS.gradient.primary} delay={0} />
        <StatCard title={t('dashboard.projekteAnzahl')} value={stats.projekteAnzahl}
          icon="bi-kanban-fill" gradient={COLORS.gradient.success} delay={80} />
        <StatCard title={t('dashboard.ticketsAnzahl')} value={stats.ticketsAnzahl}
          icon="bi-ticket-detailed-fill" gradient={COLORS.gradient.warning} delay={160} />
        <StatCard title={t('dashboard.offeneTickets')} value={stats.offeneTickets}
          icon="bi-exclamation-triangle-fill" gradient={COLORS.gradient.danger} delay={240} />
        <StatCard title={t('dashboard.benutzerAnzahl')} value={stats.benutzerAnzahl}
          icon="bi-person-gear" gradient={COLORS.gradient.info} delay={320} />
        <StatCard title={t('dashboard.aktiveProjekte')} value={stats.aktiveProjekte}
          icon="bi-rocket-takeoff-fill" gradient={COLORS.gradient.purple} delay={400} />
        <StatCard title={t('dashboard.berichteAnzahl')} value={stats.berichteAnzahl}
          icon="bi-file-earmark-bar-graph-fill" gradient={COLORS.gradient.pink} delay={480} />
        <StatCard title={t('dashboard.kritischeTickets')} value={stats.kritischeTickets}
          icon="bi-bell-fill" gradient={COLORS.gradient.dark} delay={560} />
      </div>

      {/* ── CHARTS ROW 1 ── */}
      <div className="dashboard-charts-row">
        {/* Wochenübersicht — Area Chart */}
        <ChartCard title="Wochenübersicht" icon="bi-graph-up-arrow" iconColor={COLORS.primary}
          className="dashboard-chart-wide">
          {trendData.length === 0 ? (
            <div className="text-center py-5 text-muted">{t('common.noData')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradProjekte" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="projekte" name="Projekte" stroke={COLORS.primary}
                  fill="url(#gradProjekte)" strokeWidth={2.5} dot={{ r: 4, fill: COLORS.primary }} />
                <Area type="monotone" dataKey="tickets" name="Tickets" stroke={COLORS.warning}
                  fill="url(#gradTickets)" strokeWidth={2.5} dot={{ r: 4, fill: COLORS.warning }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Ticket Status — Donut */}
        <ChartCard title={`${t('dashboard.ticketsAnzahl')} — Status`} icon="bi-pie-chart-fill" iconColor={COLORS.warning}
          className="dashboard-chart-narrow">
          {ticketChartData.length === 0 ? (
            <div className="text-center py-5 text-muted">{t('common.noData')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={ticketChartData} cx="50%" cy="50%" innerRadius={65} outerRadius={105}
                  paddingAngle={4} dataKey="value" strokeWidth={0}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}>
                  {ticketChartData.map((entry, idx) => (
                    <Cell key={idx} fill={TICKET_COLORS[entry.status] || COLORS.primary} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── CHARTS ROW 2 ── */}
      <div className="dashboard-charts-row">
        {/* Projekte Bar Chart */}
        <ChartCard title={`${t('dashboard.projekteAnzahl')} — Status`} icon="bi-bar-chart-fill" iconColor={COLORS.success}
          className="dashboard-chart-half">
          {chartData.length === 0 ? (
            <div className="text-center py-5 text-muted">{t('common.noData')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name={t('dashboard.projekteAnzahl')} radius={[8, 8, 0, 0]} barSize={48}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={STATUS_COLORS[entry.status] || COLORS.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Priorität Breakdown + Recent Tickets */}
        <div className="dashboard-chart-half dashboard-split-col">
          <ChartCard title="Prioritätsverteilung" icon="bi-flag-fill" iconColor={COLORS.danger}>
            <PriorityBreakdown tickets={allTickets} t={t} />
          </ChartCard>
          <ChartCard title="Neueste Tickets" icon="bi-clock-history" iconColor={COLORS.info}>
            <RecentTickets tickets={recentTickets} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
