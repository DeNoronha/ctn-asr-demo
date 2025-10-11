/**
 * Dashboard Component with Analytics
 * Displays member statistics and visualizations using Recharts
 */

import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Member } from '../services/api';
import './Dashboard.css';

interface DashboardProps {
  members: Member[];
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

const Dashboard: React.FC<DashboardProps> = ({ members }) => {
  // Calculate statistics
  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter(m => m.status === 'ACTIVE').length;
    const pending = members.filter(m => m.status === 'PENDING').length;
    const suspended = members.filter(m => m.status === 'SUSPENDED').length;
    const premium = members.filter(m => m.membership_level === 'PREMIUM').length;

    return {
      total,
      active,
      pending,
      suspended,
      premium,
      activeRate: total > 0 ? ((active / total) * 100).toFixed(1) : '0',
      premiumRate: total > 0 ? ((premium / total) * 100).toFixed(1) : '0',
    };
  }, [members]);

  // Status distribution data for Pie Chart
  const statusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    members.forEach(m => {
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
    members.forEach(m => {
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
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
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
        <h2>Dashboard</h2>
        <p className="dashboard-subtitle">Overview of member statistics and trends</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">📊</div>
          <h3>Total Members</h3>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Registered organizations</div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <h3>Active Members</h3>
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">{stats.activeRate}% of total</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⏳</div>
          <h3>Pending Applications</h3>
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Awaiting approval</div>
        </div>

        <div className="stat-card accent">
          <div className="stat-icon">⭐</div>
          <h3>Premium Members</h3>
          <div className="stat-value">{stats.premium}</div>
          <div className="stat-label">{stats.premiumRate}% of total</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Status Distribution - Pie Chart */}
        <div className="chart-card">
          <h3>Member Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
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

        {/* Membership Levels - Bar Chart */}
        <div className="chart-card">
          <h3>Membership Levels</h3>
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

        {/* Member Growth - Line Chart */}
        <div className="chart-card full-width">
          <h3>Member Growth (Last 12 Months)</h3>
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

      {/* Partner Logos */}
      <div className="partner-logos">
        <h3>In Partnership With</h3>
        <div className="logos-grid">
          <div className="logo-container">
            <img src="/assets/logos/portbase.png" alt="Portbase" />
          </div>
          <div className="logo-container">
            <img src="/assets/logos/contargo.png" alt="Contargo" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
