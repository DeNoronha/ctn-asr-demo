/**
 * Dashboard Component with Analytics
 * Displays member statistics and visualizations using Recharts
 */

import type React from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Member } from '../services/api';
import { safeArray, safeFilter, safeLength } from '../utils/safeArray';
import './Dashboard.css';

interface DashboardProps {
  members: Member[];
  totalMembers?: number;
  loading?: boolean;
}

// CTN Brand Colors
const COLORS = {
  primary: '#0066B3',
  secondary: '#003366',
  accent: '#FF8C00',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: COLORS.success,
  PENDING: COLORS.warning,
  SUSPENDED: COLORS.danger,
  TERMINATED: '#6b7280',
};

const MEMBERSHIP_COLORS: Record<string, string> = {
  PREMIUM: COLORS.accent,
  STANDARD: COLORS.primary,
  BASIC: COLORS.info,
};

const Dashboard: React.FC<DashboardProps> = ({ members, totalMembers, loading = false }) => {
  const { t } = useTranslation();

  // Calculate statistics (CR-002: Safe array operations with null checks)
  const stats = useMemo(() => {
    const safeMembersList = safeArray(members);
    const total = totalMembers || safeLength(members);
    const active = safeFilter(safeMembersList, (m) => m.status === 'ACTIVE').length;
    const pending = safeFilter(safeMembersList, (m) => m.status === 'PENDING').length;
    const suspended = safeFilter(safeMembersList, (m) => m.status === 'SUSPENDED').length;
    const premium = safeFilter(safeMembersList, (m) => m.membership_level === 'PREMIUM').length;

    return {
      total,
      active,
      pending,
      suspended,
      premium,
      activeRate: total > 0 ? ((active / total) * 100).toFixed(1) : '0',
      premiumRate: total > 0 ? ((premium / total) * 100).toFixed(1) : '0',
    };
  }, [members, totalMembers]);

  // Status distribution data for Pie Chart
  const statusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    members.forEach((m) => {
      statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      color: STATUS_COLORS[status] || COLORS.info,
    }));
  }, [members]);

  // Membership level distribution for Bar Chart
  const membershipData = useMemo(() => {
    const levelCounts: Record<string, number> = {};
    members.forEach((m) => {
      const level = m.membership_level || 'STANDARD';
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    });

    return Object.entries(levelCounts).map(([level, count]) => ({
      name: level,
      members: count,
      color: MEMBERSHIP_COLORS[level] || COLORS.primary,
    }));
  }, [members]);

  // Member growth over time (simulated - last 12 months)
  const growthData = useMemo(() => {
    // In production, this would come from actual historical data
    // For now, we'll simulate growth based on creation dates
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // Simulate cumulative growth
    const data = months.map((month, index) => ({
      month,
      members: Math.floor((stats.total / 12) * (index + 1)),
      newMembers: Math.floor(stats.total / 12),
    }));

    // Adjust last month to match current total
    data[data.length - 1].members = stats.total;

    return data;
  }, [members, stats.total]);

  return (
    <div className="dashboard-view">
      <div className="dashboard-header">
        <h2>{t('dashboard.title')}</h2>
        <p className="dashboard-subtitle">{t('dashboard.overview')}</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">📊</div>
          <h3>{t('dashboard.totalMembers')}</h3>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">
            {t('dashboard.registeredOrgs', 'Registered organizations')}
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <h3>{t('dashboard.activeMembers')}</h3>
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">
            {stats.activeRate}% {t('dashboard.ofTotal', 'of total')}
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⏳</div>
          <h3>{t('dashboard.pendingApplications')}</h3>
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">{t('dashboard.awaitingApproval', 'Awaiting approval')}</div>
        </div>

        <div className="stat-card accent">
          <div className="stat-icon">⭐</div>
          <h3>{t('dashboard.premiumMembers', 'Premium Members')}</h3>
          <div className="stat-value">{stats.premium}</div>
          <div className="stat-label">
            {stats.premiumRate}% {t('dashboard.ofTotal', 'of total')}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Status Distribution - Pie Chart */}
        <div className="chart-card">
          <h3>{t('dashboard.statusDistribution', 'Member Status Distribution')}</h3>
          <div role="img" aria-label={`Pie chart showing member status distribution: ${statusData.map(d => `${d.name} ${d.value}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: { name?: string; percent?: number }) => {
                  const name = entry.name || '';
                  const percent = entry.percent || 0;
                  return `${name} ${(percent * 100).toFixed(0)}%`;
                }}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Membership Levels - Bar Chart */}
        <div className="chart-card">
          <h3>{t('dashboard.membershipLevels', 'Membership Levels')}</h3>
          <div role="img" aria-label={`Bar chart showing membership levels: ${membershipData.map(d => `${d.name} ${d.members} members`).join(', ')}`}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={membershipData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="members" fill={COLORS.primary}>
                {membershipData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Member Growth - Line Chart */}
        <div className="chart-card full-width">
          <h3>{t('dashboard.memberGrowth', 'Member Growth (Last 12 Months)')}</h3>
          <div role="img" aria-label="Line chart showing member growth over the last 12 months with total members and new member trends">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="members"
                stroke={COLORS.primary}
                strokeWidth={3}
                dot={{ fill: COLORS.primary, r: 5 }}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="newMembers"
                stroke={COLORS.accent}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Partner Logos */}
      <div className="partner-logos">
        <h3>{t('dashboard.partnersWith', 'In Partnership With')}</h3>
        <div className="logos-grid">
          <div className="logo-container">
            <img src="/assets/logos/DIL.png" alt="Data in Logistics" />
          </div>
          <div className="logo-container">
            <img src="/assets/logos/contargo.png" alt="Contargo" />
          </div>
          <div className="logo-container">
            <img src="/assets/logos/Inland Terminals Group.png" alt="Inland Terminals Group" />
          </div>
          <div className="logo-container">
            <img src="/assets/logos/VanBerkel.png" alt="Van Berkel" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
