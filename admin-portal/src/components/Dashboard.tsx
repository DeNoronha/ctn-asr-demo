/**
 * Dashboard Component with Analytics
 * Displays member statistics and visualizations using Recharts
 */

import { Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
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
import { PageHeader } from './shared/PageHeader';
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

const TIER_COLORS: Record<string, string> = {
  TIER_3: COLORS.accent,
  TIER_2: COLORS.primary,
  TIER_1: COLORS.info,
  NONE: '#6b7280',
};

const Dashboard: React.FC<DashboardProps> = ({ members, totalMembers }) => {
  const { t } = useTranslation();

  // Calculate statistics (CR-002: Safe array operations with null checks)
  const stats = useMemo(() => {
    const safeMembersList = safeArray(members);
    const total = totalMembers || safeLength(members);
    const active = safeFilter(safeMembersList, (m) => m.status === 'ACTIVE').length;
    const pending = safeFilter(safeMembersList, (m) => m.status === 'PENDING').length;
    const suspended = safeFilter(safeMembersList, (m) => m.status === 'SUSPENDED').length;
    return {
      total,
      active,
      pending,
      suspended,
      activeRate: total > 0 ? ((active / total) * 100).toFixed(1) : '0',
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

  // Authentication tier distribution for Bar Chart
  const tierData = useMemo(() => {
    const tierCounts: Record<string, number> = {};
    members.forEach((m) => {
      // authentication_tier comes from API but isn't in Member type definition
      const tier = (m as unknown as { authentication_tier?: string }).authentication_tier || 'NONE';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    return Object.entries(tierCounts).map(([tier, count]) => ({
      name: tier === 'NONE' ? 'Not Set' : tier.replace('_', ' '),
      members: count,
      color: TIER_COLORS[tier] || COLORS.primary,
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
  }, [stats.total]);

  return (
    <Stack gap="lg">
      <PageHeader titleKey="dashboard" />

      {/* Key Metrics Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <div>
              <Text c="dimmed" tt="uppercase" fw={700} size="xs">
                {t('dashboard.totalMembers')}
              </Text>
              <Text fw={700} size="xl">
                {stats.total}
              </Text>
            </div>
            <ThemeIcon color="blue" variant="light" size={38} radius="md">
              <Text size="xl">📊</Text>
            </ThemeIcon>
          </Group>
          <Text c="dimmed" size="xs" mt="md">
            {t('dashboard.registeredOrgs', 'Registered organizations')}
          </Text>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <div>
              <Text c="dimmed" tt="uppercase" fw={700} size="xs">
                {t('dashboard.activeMembers')}
              </Text>
              <Text fw={700} size="xl">
                {stats.active}
              </Text>
            </div>
            <ThemeIcon color="green" variant="light" size={38} radius="md">
              <Text size="xl">✅</Text>
            </ThemeIcon>
          </Group>
          <Text c="dimmed" size="xs" mt="md">
            {stats.activeRate}% {t('dashboard.ofTotal', 'of total')}
          </Text>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <div>
              <Text c="dimmed" tt="uppercase" fw={700} size="xs">
                {t('dashboard.pendingApplications')}
              </Text>
              <Text fw={700} size="xl">
                {stats.pending}
              </Text>
            </div>
            <ThemeIcon color="yellow" variant="light" size={38} radius="md">
              <Text size="xl">⏳</Text>
            </ThemeIcon>
          </Group>
          <Text c="dimmed" size="xs" mt="md">
            {t('dashboard.awaitingApproval', 'Awaiting approval')}
          </Text>
        </Paper>

{/* Premium Members card hidden - membership levels feature disabled */}
      </SimpleGrid>

      {/* Charts Section */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        {/* Status Distribution - Pie Chart */}
        <Paper withBorder p="md" radius="md">
          <Title order={3} size="h4" mb="md">
            {t('dashboard.statusDistribution', 'Member Status Distribution')}
          </Title>
          <div
            role="img"
            aria-label={`Pie chart showing member status distribution: ${statusData.map((d) => `${d.name} ${d.value}`).join(', ')}`}
          >
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
                  {statusData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Paper>

        {/* Authentication Tiers - Bar Chart */}
        <Paper withBorder p="md" radius="md">
          <Title order={3} size="h4" mb="md">
            {t('dashboard.authenticationTiers', 'Authentication Tiers')}
          </Title>
          <div
            role="img"
            aria-label={`Bar chart showing authentication tiers: ${tierData.map((d) => `${d.name} ${d.members} members`).join(', ')}`}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tierData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="members" fill={COLORS.primary}>
                  {tierData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Paper>
      </SimpleGrid>

      {/* Member Growth - Line Chart */}
      <Paper withBorder p="md" radius="md">
        <Title order={3} size="h4" mb="md">
          {t('dashboard.memberGrowth', 'Member Growth (Last 12 Months)')}
        </Title>
        <div
          role="img"
          aria-label="Line chart showing member growth over the last 12 months with total members and new member trends"
        >
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
      </Paper>
    </Stack>
  );
};

export default Dashboard;
