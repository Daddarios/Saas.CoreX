import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-bootstrap';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie, ComposedChart, Line, Area,
  LineChart, AreaChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import '../styles/Dashboard.css';
import { dashboardApi } from '../api/dashboardApi';
import { projektApi } from '../api/projektApi';
import { ticketApi } from '../api/ticketApi';
import { kundeApi } from '../api/kundeApi';
import { benutzerApi } from '../api/benutzerApi';
import { berichtApi } from '../api/berichtApi';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';

const COLORS = {
  primary: '#0ea5e9',
  success: '#14b8a6',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#0f766e',
  slate: '#64748b',
  neutral: '#334155',
  gradient: {
    primary: 'linear-gradient(140deg, #0284c7 0%, #0ea5e9 100%)',
    success: 'linear-gradient(140deg, #0f766e 0%, #14b8a6 100%)',
    warning: 'linear-gradient(140deg, #d97706 0%, #f59e0b 100%)',
    danger: 'linear-gradient(140deg, #dc2626 0%, #ef4444 100%)',
    info: 'linear-gradient(140deg, #0369a1 0%, #0284c7 100%)',
    neutral: 'linear-gradient(140deg, #334155 0%, #475569 100%)',
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
  Kritisch: COLORS.neutral,
};

const REFRESH_INTERVAL_OPTIONS = [15, 30, 60, 120];
const LIVE_VARIANTS = ['default', 'line', 'area', 'bar'];
const TICKET_VARIANTS = ['default', 'bar', 'radar', 'line'];
const PROJECT_VARIANTS = ['default', 'line', 'area', 'radar'];

function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDayTs(dateString) {
  return new Date(`${dateString}T00:00:00`).getTime();
}

function endOfDayTs(dateString) {
  return new Date(`${dateString}T23:59:59.999`).getTime();
}

function createTrendPoint(ts, projekte, tickets) {
  const date = new Date(ts);
  return {
    ts,
    dateKey: toDateInputValue(date),
    dayLabel: date.toLocaleDateString([], { day: '2-digit', month: '2-digit' }),
    name: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    projekte: Number(projekte || 0),
    tickets: Number(tickets || 0),
  };
}

function createInitialTrendData() {
  const now = Date.now();
  const dayStepMs = 24 * 60 * 60 * 1000;
  const points = [
    { projekte: 4, tickets: 7 },
    { projekte: 6, tickets: 6 },
    { projekte: 5, tickets: 8 },
    { projekte: 8, tickets: 5 },
    { projekte: 7, tickets: 7 },
    { projekte: 9, tickets: 4 },
    { projekte: 6, tickets: 9 },
    { projekte: 10, tickets: 5 },
    { projekte: 8, tickets: 6 },
    { projekte: 11, tickets: 4 },
    { projekte: 9, tickets: 7 },
    { projekte: 12, tickets: 5 },
  ];

  return points.map((point, index) => {
    const pointTs = now - (points.length - 1 - index) * dayStepMs;
    return createTrendPoint(pointTs, point.projekte, point.tickets);
  });
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function totalFromResponse(response) {
  const data = response?.data;
  if (!data) return 0;
  const direct = firstFiniteNumber(data.totalCount, data.total, data.count);
  if (Number.isFinite(direct)) return direct;
  if (Array.isArray(data?.items)) return data.items.length;
  if (Array.isArray(data)) return data.length;
  return 0;
}

function ChartSkeleton({ bars = 4 }) {
  return (
    <div className="dashboard-chart-skeleton">
      {Array.from({ length: bars }).map((_, index) => (
        <span
          key={`bar-${index}`}
          className="dashboard-chart-skeleton-bar"
          style={{ width: `${48 + (index % 3) * 16}%`, animationDelay: `${index * 90}ms` }}
        />
      ))}
    </div>
  );
}

function StatCard({ title, value, icon, gradient, trend, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const numericValue = Number(value);
  const hasNumericValue = Number.isFinite(numericValue);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!visible || value == null) return;
    const target = typeof value === 'number' ? value : parseInt(value, 10);
    if (Number.isNaN(target)) return;
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
          <div className="stat-card-value">{hasNumericValue ? count : (value ?? '-')}</div>
          <div className="stat-card-title">{title}</div>
        </div>
        {trend != null && (
          <div className={`stat-card-trend ${trend >= 0 ? 'up' : 'down'}`}>
            <i className={`bi bi-arrow-${trend >= 0 ? 'up' : 'down'}-short`} />
            {Math.abs(trend)}%
          </div>
        )}
        <div className="stat-card-decoration" />
      </div>
    </div>
  );
}

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

function ChartCard({
  title,
  icon,
  iconColor,
  titleAddon,
  children,
  className = '',
  isRefreshing = false,
  onSelectVariant,
  variantOptions = [],
  activeVariant,
  variantLabel,
  variantIcon,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div className={`dashboard-chart-card ${className}`}>
      <div className="chart-card-header">
        <div className="chart-card-title">
          <i className={`bi ${icon}`} style={{ color: iconColor }} />
          <span>{title}</span>
          {titleAddon}
        </div>
        <div className="chart-card-actions">
          {onSelectVariant && variantOptions.length > 0 && (
            <div className="chart-variant-control" ref={menuRef}>
              <button
                type="button"
                className="chart-variant-toggle"
                onClick={() => setMenuOpen((current) => !current)}
                aria-expanded={menuOpen}
              >
                <i className="bi bi-toggles2" />
                <span>{variantLabel}</span>
                {variantIcon && <i className={`bi ${variantIcon}`} />}
                <i className={`bi ${menuOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
              </button>
              <div className={`chart-variant-menu ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
                {variantOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`chart-variant-item ${activeVariant === option.value ? 'active' : ''}`}
                    onClick={() => {
                      onSelectVariant(option.value);
                      setMenuOpen(false);
                    }}
                  >
                    <i className={`bi ${option.icon}`} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {isRefreshing && <span className="dashboard-chart-live-dot" />}
        </div>
      </div>
      <div className="chart-card-body">
        {children}
      </div>
    </div>
  );
}

function PanelState({ loading, error, empty, emptyText, errorText }) {
  if (loading) return <ChartSkeleton />;
  if (error) return <div className="dashboard-panel-state dashboard-panel-state-error">{errorText}</div>;
  if (empty) return <div className="dashboard-panel-state">{emptyText}</div>;
  return null;
}

function RecentTickets({ tickets, t }) {
  if (!tickets || tickets.length === 0) {
    return <div className="dashboard-panel-state">{t('dashboard.noRecentTickets')}</div>;
  }

  return (
    <div className="recent-list">
      {tickets.slice(0, 6).map((ticket, index) => (
        <div key={ticket.id || index} className="recent-item" style={{ animationDelay: `${index * 80}ms` }}>
          <div className="recent-item-indicator"
            style={{ background: PRIORITY_COLORS[ticket.prioritaet] || COLORS.slate }} />
          <div className="recent-item-content">
            <div className="recent-item-title">{ticket.titel}</div>
            <div className="recent-item-meta">
              <span className="recent-item-badge"
                style={{ background: `${TICKET_COLORS[ticket.status] || COLORS.slate}20`, color: TICKET_COLORS[ticket.status] || COLORS.slate }}>
                {ticket.status}
              </span>
              {ticket.faelligkeitsdatum && (
                <span className="recent-item-date">
                  <i className="bi bi-calendar3 me-1" />{ticket.faelligkeitsdatum.slice(0, 10)}
                </span>
              )}
            </div>
          </div>
          <div className="recent-item-priority"
            style={{ color: PRIORITY_COLORS[ticket.prioritaet] || COLORS.slate }}>
            <i className="bi bi-flag-fill" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PriorityBreakdown({ tickets, t: translate }) {
  const priorities = ['Niedrig', 'Mittel', 'Hoch', 'Kritisch'];
  const total = Math.max(tickets.length, 1);

  return (
    <div className="priority-breakdown">
      {priorities.map((priority) => {
        const count = tickets.filter((ticket) => ticket.prioritaet === priority).length;
        const pct = Math.round((count / total) * 100);
        return (
          <div key={priority} className="priority-row">
            <div className="priority-label">
              <span className="priority-dot" style={{ background: PRIORITY_COLORS[priority] }} />
              <span>{translate(`status.${priority}`, priority)}</span>
            </div>
            <div className="priority-bar-wrapper">
              <div className="priority-bar"
                style={{ width: `${pct}%`, background: PRIORITY_COLORS[priority], transition: 'width 1s ease' }} />
            </div>
            <span className="priority-count">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [chartData, setChartData] = useState([]);
  const [ticketChartData, setTicketChartData] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [trendData, setTrendData] = useState(() => createInitialTrendData());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [liveChartVariant, setLiveChartVariant] = useState('default');
  const [ticketChartVariant, setTicketChartVariant] = useState('default');
  const [projectChartVariant, setProjectChartVariant] = useState('default');
  const [showDateRange, setShowDateRange] = useState(false);
  const [rangeStart, setRangeStart] = useState(() => toDateInputValue(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)));
  const [rangeEnd, setRangeEnd] = useState(() => toDateInputValue(new Date()));
  const [themeMode, setThemeMode] = useState(() => (
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-theme') || 'light'
      : 'light'
  ));

  const hasData = useMemo(() => Boolean(stats), [stats]);
  const trendSeries = useMemo(
    () => trendData.map((point) => ({ ...point, total: Number(point.projekte || 0) + Number(point.tickets || 0) })),
    [trendData]
  );
  const filteredTrendSeries = useMemo(() => {
    const hasValidRange = rangeStart && rangeEnd;
    if (!hasValidRange) return trendSeries;

    const startTs = startOfDayTs(rangeStart);
    const endTs = endOfDayTs(rangeEnd);
    const safeStart = Math.min(startTs, endTs);
    const safeEnd = Math.max(startTs, endTs);
    const filtered = trendSeries.filter((point) => point.ts >= safeStart && point.ts <= safeEnd);
    const byDay = new Map();
    filtered.forEach((point) => {
      const existing = byDay.get(point.dateKey);
      if (!existing || point.ts > existing.ts) {
        byDay.set(point.dateKey, point);
      }
    });

    const dailySeries = [];
    for (let current = safeStart; current <= safeEnd; current += 24 * 60 * 60 * 1000) {
      const dayDate = new Date(current);
      const dayKey = toDateInputValue(dayDate);
      const existing = byDay.get(dayKey);
      const projekte = Number(existing?.projekte || 0);
      const tickets = Number(existing?.tickets || 0);
      dailySeries.push({
        ...(existing || {}),
        ts: current,
        dateKey: dayKey,
        dayLabel: dayDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' }),
        name: dayDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' }),
        projekte,
        tickets,
        total: projekte + tickets,
      });
    }

    return dailySeries;
  }, [trendSeries, rangeStart, rangeEnd]);
  const isDark = themeMode === 'dark';
  const axisTick = { fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' };
  const gridStroke = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.16)';
  const variantLabels = {
    default: t('dashboard.variantDefault', 'Default'),
    line: t('dashboard.variantLine', 'Line'),
    area: t('dashboard.variantArea', 'Area'),
    bar: t('dashboard.variantBar', 'Bar'),
    radar: t('dashboard.variantRadar', 'Radar'),
  };
  const variantIcons = {
    default: 'bi-grid-3x3-gap-fill',
    line: 'bi-graph-up',
    area: 'bi-layers-fill',
    bar: 'bi-bar-chart-fill',
    radar: 'bi-bullseye',
  };
  const liveVariantOptions = LIVE_VARIANTS.map((variant) => ({
    value: variant,
    label: variantLabels[variant],
    icon: variantIcons[variant],
  }));
  const ticketVariantOptions = TICKET_VARIANTS.map((variant) => ({
    value: variant,
    label: variantLabels[variant],
    icon: variantIcons[variant],
  }));
  const projectVariantOptions = PROJECT_VARIANTS.map((variant) => ({
    value: variant,
    label: variantLabels[variant],
    icon: variantIcons[variant],
  }));

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const updateTheme = () => {
      setThemeMode(document.documentElement.getAttribute('data-theme') || 'light');
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const [statsRes, projektRes, ticketRes, kundenRes, benutzerRes, berichtRes] = await Promise.all([
        dashboardApi.getStats(),
        projektApi.getAll(1, 100),
        ticketApi.getAll(1, 200),
        kundeApi.getAll(1, 1),
        benutzerApi.getAll(1, 1),
        berichtApi.getAll(1, 1),
      ]);

      const projekte = projektRes.data?.items || projektRes.data || [];
      const projekteTotal = totalFromResponse(projektRes);
      const projectGrouped = {};
      projekte.forEach((projekt) => {
        const status = projekt.status || 'NichtGestartet';
        projectGrouped[status] = (projectGrouped[status] || 0) + 1;
      });
      setChartData(Object.entries(projectGrouped).map(([status, count]) => ({
        name: t(`status.${status}`, status), count, status,
      })));

      const tickets = ticketRes.data?.items || ticketRes.data || [];
      const ticketsTotal = totalFromResponse(ticketRes);
      setAllTickets(tickets);
      setRecentTickets(tickets.slice(0, 6));

      const ticketGrouped = {};
      tickets.forEach((ticket) => {
        const status = ticket.status || 'Offen';
        ticketGrouped[status] = (ticketGrouped[status] || 0) + 1;
      });
      setTicketChartData(Object.entries(ticketGrouped).map(([status, count]) => ({
        name: t(`status.${status}`, status), value: count, status,
      })));

      const rawStats = statsRes.data || {};
      const offeneTicketsFallback = tickets.filter((ticket) => ticket.status === 'Offen').length;
      const kritischeTicketsFallback = tickets.filter((ticket) => ticket.prioritaet === 'Kritisch').length;
      const aktiveProjekteFallback = projekte.filter((projekt) => projekt.status === 'InBearbeitung').length;
      const kundenTotal = totalFromResponse(kundenRes);
      const benutzerTotal = totalFromResponse(benutzerRes);
      const berichteTotal = totalFromResponse(berichtRes);

      const normalizedStats = {
        kundenAnzahl: firstFiniteNumber(
          rawStats.kundenAnzahl, rawStats.kundenanzahl, rawStats.kunden, rawStats.customerCount, kundenTotal, 0
        ) ?? 0,
        projekteAnzahl: firstFiniteNumber(
          rawStats.projekteAnzahl, rawStats.projekteanzahl, rawStats.projekte, rawStats.projectCount, projekteTotal, 0
        ) ?? 0,
        ticketsAnzahl: firstFiniteNumber(
          rawStats.ticketsAnzahl, rawStats.ticketsanzahl, rawStats.tickets, rawStats.ticketCount, ticketsTotal, 0
        ) ?? 0,
        offeneTickets: firstFiniteNumber(
          rawStats.offeneTickets, rawStats.openTickets, rawStats.offene, offeneTicketsFallback, 0
        ) ?? 0,
        benutzerAnzahl: firstFiniteNumber(
          rawStats.benutzerAnzahl, rawStats.benutzeranzahl, rawStats.benutzer, rawStats.userCount, benutzerTotal, 0
        ) ?? 0,
        aktiveProjekte: firstFiniteNumber(
          rawStats.aktiveProjekte, rawStats.aktiveprojekte, rawStats.activeProjects, aktiveProjekteFallback, 0
        ) ?? 0,
        berichteAnzahl: firstFiniteNumber(
          rawStats.berichteAnzahl, rawStats.berichteanzahl, rawStats.berichte, rawStats.reportCount, berichteTotal, 0
        ) ?? 0,
        kritischeTickets: firstFiniteNumber(
          rawStats.kritischeTickets, rawStats.kritischetickets, rawStats.criticalTickets, kritischeTicketsFallback, 0
        ) ?? 0,
      };
      setStats(normalizedStats);

      setTrendData((current) => {
        const nextPoint = createTrendPoint(Date.now(), normalizedStats.aktiveProjekte, normalizedStats.offeneTickets);
        const withoutSameDay = current.filter((point) => point.dateKey !== nextPoint.dateKey);
        return [...withoutSameDay, nextPoint]
          .sort((a, b) => a.ts - b.ts)
          .slice(-30);
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.message || t('dashboard.error'));
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(() => loadAll(), 0);
    return () => clearTimeout(timer);
  }, [loadAll]);

  useEffect(() => {
    if (!autoRefreshEnabled) return undefined;
    const timer = setInterval(() => {
      loadAll({ silent: true });
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [autoRefreshEnabled, refreshInterval, loadAll]);

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? t('dashboard.goodMorning')
    : hour < 18
      ? t('dashboard.goodAfternoon')
      : t('dashboard.goodEvening');

  return (
    <div className="dashboard-root">
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div>
            <h1 className="dashboard-greeting">
              {greeting}, <span className="dashboard-username">{user?.vorname || t('dashboard.defaultUser')}</span>
            </h1>
            <p className="dashboard-subtitle">{t('dashboard.todayOverview')}</p>
            <div className="dashboard-updated-line">
              {t('dashboard.lastUpdated')}: {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}
            </div>
          </div>
          <div className="dashboard-header-actions">
            <label className="dashboard-switch">
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(event) => setAutoRefreshEnabled(event.target.checked)}
              />
              <span className="dashboard-switch-slider" />
              <span className="dashboard-switch-label">
                {autoRefreshEnabled ? t('dashboard.live') : t('dashboard.paused')}
              </span>
            </label>
            <label className="dashboard-interval">
              <span>{t('dashboard.refreshEvery')}</span>
              <select
                value={refreshInterval}
                onChange={(event) => setRefreshInterval(Number(event.target.value))}
                disabled={!autoRefreshEnabled}
              >
                {REFRESH_INTERVAL_OPTIONS.map((seconds) => (
                  <option key={seconds} value={seconds}>{seconds}{t('dashboard.secondsShort')}</option>
                ))}
              </select>
            </label>
            <button
              className="dashboard-refresh-btn"
              onClick={() => loadAll({ silent: true })}
              disabled={loading || isRefreshing}
            >
              <i className={`bi bi-arrow-clockwise ${isRefreshing ? 'spin' : ''}`} />
              <span>{t('dashboard.refresh')}</span>
            </button>
          </div>
        </div>
      </div>

      {error && <Alert variant="danger" className="mx-4">{error}</Alert>}

      <div className="dashboard-stats-grid">
        <StatCard title={t('dashboard.offeneTickets')} value={stats?.offeneTickets}
          icon="bi-exclamation-triangle-fill" gradient={COLORS.gradient.danger} delay={0} />
        <StatCard title={t('dashboard.kritischeTickets')} value={stats?.kritischeTickets}
          icon="bi-bell-fill" gradient={COLORS.gradient.neutral} delay={80} />
        <StatCard title={t('dashboard.aktiveProjekte')} value={stats?.aktiveProjekte}
          icon="bi-rocket-takeoff-fill" gradient={COLORS.gradient.success} delay={160} />
        <StatCard title={t('dashboard.ticketsAnzahl')} value={stats?.ticketsAnzahl}
          icon="bi-ticket-detailed-fill" gradient={COLORS.gradient.warning} delay={240} />
        <StatCard title={t('dashboard.kundenAnzahl')} value={stats?.kundenAnzahl}
          icon="bi-people-fill" gradient={COLORS.gradient.primary} delay={320} />
        <StatCard title={t('dashboard.projekteAnzahl')} value={stats?.projekteAnzahl}
          icon="bi-kanban-fill" gradient={COLORS.gradient.info} delay={400} />
        <StatCard title={t('dashboard.benutzerAnzahl')} value={stats?.benutzerAnzahl}
          icon="bi-person-gear" gradient={COLORS.gradient.success} delay={480} />
        <StatCard title={t('dashboard.berichteAnzahl')} value={stats?.berichteAnzahl}
          icon="bi-file-earmark-bar-graph-fill" gradient={COLORS.gradient.primary} delay={560} />
      </div>

      <div className="dashboard-charts-row">
        <ChartCard
          title={t('dashboard.weeklyOverview')}
          icon="bi-graph-up-arrow"
          iconColor={COLORS.primary}
          titleAddon={(
            <>
              <button
                className={`dashboard-calendar-toggle ${showDateRange ? 'active' : ''}`}
                onClick={() => setShowDateRange((current) => !current)}
                type="button"
              >
                <i className="bi bi-calendar3" />
                <span>{t('dashboard.dateRange')}</span>
              </button>
              <div className={`dashboard-date-range-panel ${showDateRange ? 'is-open' : ''}`} aria-hidden={!showDateRange}>
                <div className="dashboard-date-range " >
                  <label>
                    <span>{t('dashboard.startDate')}</span>
                    <input
                      type="date"
                      value={rangeStart}
                      max={rangeEnd || undefined}
                      onChange={(event) => setRangeStart(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>{t('dashboard.endDate')}</span>
                    <input
                      type="date"
                      value={rangeEnd}
                      min={rangeStart || undefined}
                      onChange={(event) => setRangeEnd(event.target.value)}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="dashboard-date-close"
                  onClick={() => setShowDateRange(false)}
                  aria-label={t('common.close')}
                >
                  <i className="bi bi-x-lg"/>
                </button>
              </div>
            </>
          )}
          isRefreshing={isRefreshing}
          className="dashboard-chart-wide"
          onSelectVariant={setLiveChartVariant}
          variantOptions={liveVariantOptions}
          activeVariant={liveChartVariant}
          variantLabel={variantLabels[liveChartVariant]}
          variantIcon={variantIcons[liveChartVariant]}
        >
          <PanelState
            loading={loading && !hasData}
            error={Boolean(error)}
            empty={!filteredTrendSeries.length}
            emptyText={t('dashboard.empty')}
            errorText={t('dashboard.error')}
          />
          {!(loading && !hasData) && !error && Boolean(filteredTrendSeries.length) && (
            <>
              {liveChartVariant === 'default' && (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={filteredTrendSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="stackedProjekte" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isDark ? '#fdba74' : '#ea580c'} stopOpacity={0.34} />
                        <stop offset="95%" stopColor={isDark ? '#fdba74' : '#ea580c'} stopOpacity={0.06} />
                      </linearGradient>
                      <linearGradient id="stackedTickets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.34} />
                        <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={26} wrapperStyle={{ fontSize: '12px' }} />
                    <Area
                      type="monotone"
                      dataKey="projekte"
                      name={t('dashboard.projectsLegend')}
                      stackId="load"
                      stroke={isDark ? '#fdba74' : '#ea580c'}
                      fill="url(#stackedProjekte)"
                      strokeWidth={1.8}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="tickets"
                      name={t('dashboard.ticketsLegend')}
                      stackId="load"
                      stroke={COLORS.warning}
                      fill="url(#stackedTickets)"
                      strokeWidth={1.8}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name={t('dashboard.totalLegend', 'Total')}
                      stroke={COLORS.primary}
                      strokeWidth={2.7}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              {liveChartVariant === 'line' && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredTrendSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={26} wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="projekte" name={t('dashboard.projectsLegend')} stroke={isDark ? '#fdba74' : '#ea580c'} strokeWidth={2.3} dot={false} />
                    <Line type="monotone" dataKey="tickets" name={t('dashboard.ticketsLegend')} stroke={COLORS.warning} strokeWidth={2.3} dot={false} />
                    <Line type="monotone" dataKey="total" name={t('dashboard.totalLegend', 'Total')} stroke={COLORS.primary} strokeWidth={2.8} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {liveChartVariant === 'area' && (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={filteredTrendSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="liveAreaProjects" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isDark ? '#fdba74' : '#ea580c'} stopOpacity={0.33} />
                        <stop offset="95%" stopColor={isDark ? '#fdba74' : '#ea580c'} stopOpacity={0.04} />
                      </linearGradient>
                      <linearGradient id="liveAreaTickets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.33} />
                        <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={26} wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="projekte" name={t('dashboard.projectsLegend')} stroke={isDark ? '#fdba74' : '#ea580c'} fill="url(#liveAreaProjects)" />
                    <Area type="monotone" dataKey="tickets" name={t('dashboard.ticketsLegend')} stroke={COLORS.warning} fill="url(#liveAreaTickets)" />
                    <Area type="monotone" dataKey="total" name={t('dashboard.totalLegend', 'Total')} stroke={COLORS.primary} fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {liveChartVariant === 'bar' && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredTrendSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={26} wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="projekte" name={t('dashboard.projectsLegend')} fill={isDark ? '#fdba74' : '#ea580c'} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="tickets" name={t('dashboard.ticketsLegend')} fill={COLORS.warning} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="total" name={t('dashboard.totalLegend', 'Total')} fill={COLORS.primary} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </ChartCard>

        <ChartCard
          title={t('dashboard.ticketsByStatus')}
          icon="bi-pie-chart-fill"
          iconColor={COLORS.warning}
          isRefreshing={isRefreshing}
          className="dashboard-chart-narrow"
          onSelectVariant={setTicketChartVariant}
          variantOptions={ticketVariantOptions}
          activeVariant={ticketChartVariant}
          variantLabel={variantLabels[ticketChartVariant]}
          variantIcon={variantIcons[ticketChartVariant]}
        >
          <PanelState
            loading={loading && !hasData}
            error={Boolean(error)}
            empty={!ticketChartData.length}
            emptyText={t('dashboard.empty')}
            errorText={t('dashboard.error')}
          />
          {!(loading && !hasData) && !error && Boolean(ticketChartData.length) && (
            <>
              {ticketChartVariant === 'default' && (
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
                    <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {ticketChartVariant === 'bar' && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ticketChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name={t('dashboard.ticketsLegend')} radius={[8, 8, 0, 0]}>
                      {ticketChartData.map((entry, idx) => (
                        <Cell key={idx} fill={TICKET_COLORS[entry.status] || COLORS.primary} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {ticketChartVariant === 'radar' && (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={ticketChartData}>
                    <PolarGrid stroke={gridStroke} />
                    <PolarAngleAxis dataKey="name" tick={{ fill: axisTick.fill, fontSize: 11 }} />
                    <PolarRadiusAxis tick={{ fill: axisTick.fill, fontSize: 10 }} />
                    <Radar dataKey="value" stroke={COLORS.warning} fill={COLORS.warning} fillOpacity={0.35} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
              {ticketChartVariant === 'line' && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={ticketChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="value" name={t('dashboard.ticketsLegend')} stroke={COLORS.warning} strokeWidth={2.6} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </ChartCard>
      </div>

      <div className="dashboard-charts-row">
        <ChartCard
          title={t('dashboard.projectsByStatus')}
          icon="bi-bar-chart-fill"
          iconColor={COLORS.success}
          isRefreshing={isRefreshing}
          className="dashboard-chart-half"
          onSelectVariant={setProjectChartVariant}
          variantOptions={projectVariantOptions}
          activeVariant={projectChartVariant}
          variantLabel={variantLabels[projectChartVariant]}
          variantIcon={variantIcons[projectChartVariant]}
        >
          <PanelState
            loading={loading && !hasData}
            error={Boolean(error)}
            empty={!chartData.length}
            emptyText={t('dashboard.empty')}
            errorText={t('dashboard.error')}
          />
          {!(loading && !hasData) && !error && Boolean(chartData.length) && (
            <>
              {projectChartVariant === 'default' && (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name={t('dashboard.projekteAnzahl')} radius={[8, 8, 0, 0]} barSize={44}>
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={STATUS_COLORS[entry.status] || COLORS.primary} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {projectChartVariant === 'line' && (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="count" name={t('dashboard.projekteAnzahl')} stroke={COLORS.success} strokeWidth={2.8} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {projectChartVariant === 'area' && (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="projectAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.38} />
                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="count" name={t('dashboard.projekteAnzahl')} stroke={COLORS.success} fill="url(#projectAreaGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {projectChartVariant === 'radar' && (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={chartData}>
                    <PolarGrid stroke={gridStroke} />
                    <PolarAngleAxis dataKey="name" tick={{ fill: axisTick.fill, fontSize: 11 }} />
                    <PolarRadiusAxis tick={{ fill: axisTick.fill, fontSize: 10 }} />
                    <Radar dataKey="count" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.35} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </ChartCard>

        <div className="dashboard-chart-half dashboard-split-col">
          <ChartCard title={t('dashboard.priorityDistribution')} icon="bi-flag-fill" iconColor={COLORS.danger} isRefreshing={isRefreshing}>
            <PanelState
              loading={loading && !hasData}
              error={Boolean(error)}
              empty={!allTickets.length}
              emptyText={t('dashboard.empty')}
              errorText={t('dashboard.error')}
            />
            {!(loading && !hasData) && !error && Boolean(allTickets.length) && (
              <PriorityBreakdown tickets={allTickets} t={t} />
            )}
          </ChartCard>
          <ChartCard title={t('dashboard.latestTickets')} icon="bi-clock-history" iconColor={COLORS.info} isRefreshing={isRefreshing}>
            <PanelState
              loading={loading && !hasData}
              error={Boolean(error)}
              empty={!recentTickets.length}
              emptyText={t('dashboard.noRecentTickets')}
              errorText={t('dashboard.error')}
            />
            {!(loading && !hasData) && !error && Boolean(recentTickets.length) && (
              <RecentTickets tickets={recentTickets} t={t} />
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
