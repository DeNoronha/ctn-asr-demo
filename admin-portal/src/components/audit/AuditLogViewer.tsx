/**
 * Audit Log Viewer
 * View and filter all system activity logs with pagination and Mantine components
 */

import {
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { DataTable, type DataTableSortStatus, useDataTableColumns } from 'mantine-datatable';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleGuard } from '../../auth/ProtectedRoute';
import { UserRole } from '../../auth/authConfig';
import { useNotification } from '../../contexts/NotificationContext';
import { AuditAction, type AuditLog, auditLogService } from '../../services/auditLogService';
import { formatDateTimeGB } from '../../utils/dateFormat';
import { ErrorBoundary } from '../ErrorBoundary';
import { Activity, Clock, Download, FileText, RefreshCw, Shield } from '../icons';
import { defaultDataTableProps } from '../shared/DataTableConfig';
import { PageHeader } from '../shared/PageHeader';
import './AuditLogViewer.css';

const AuditLogViewer: React.FC = () => {
  const { t } = useTranslation();
  const notification = useNotification();

  // Data state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting state
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<AuditLog>>({
    columnAccessor: 'timestamp',
    direction: 'desc',
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      // Load last 500 logs (more recent entries, better performance)
      const allLogs = await auditLogService.getLogs(1, 500);
      setLogs(allLogs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      notification.showError(t('auditLogs.notifications.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [notification, t]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Apply sorting
  const sortedLogs = useMemo(() => {
    const sorted = [...logs];
    if (sortStatus.columnAccessor === 'timestamp') {
      sorted.sort((a, b) => {
        const aTime = new Date(a.timestamp).getTime();
        const bTime = new Date(b.timestamp).getTime();
        return sortStatus.direction === 'asc' ? aTime - bTime : bTime - aTime;
      });
    }
    return sorted;
  }, [logs, sortStatus]);

  // Calculate stats
  const todayCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return logs.filter((l) => l.timestamp >= today).length;
  }, [logs]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const json = await auditLogService.exportLogs();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notification.showSuccess(t('auditLogs.notifications.exportSuccess', { count: logs.length }));
    } catch (error) {
      console.error('Failed to export logs:', error);
      notification.showError(t('auditLogs.notifications.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  }, [logs.length, notification, t]);

  // mantine-datatable column definitions
  const { effectiveColumns } = useDataTableColumns<AuditLog>({
    key: 'audit-log-grid',
    columns: [
      {
        accessor: 'timestamp',
        title: t('auditLogs.columns.timestamp'),
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => <div>{formatDateTimeGB(record.timestamp)}</div>,
      },
      {
        accessor: 'action',
        title: t('auditLogs.columns.action'),
        width: 200,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => {
          const action = record.action;
          // Map actions to Mantine color names
          const colorMap: Record<string, string> = {
            ACCESS_GRANTED: 'green',
            ACCESS_DENIED: 'red',
            USER_INVITED: 'blue',
            USER_UPDATED: 'cyan',
            USER_ENABLED: 'green',
            USER_DISABLED: 'orange',
            TOKEN_CREATED: 'violet',
            TOKEN_REVOKED: 'red',
            M2M_CLIENT_CREATED: 'violet',
            M2M_SECRET_GENERATED: 'yellow',
            M2M_CLIENT_DELETED: 'red',
            MEMBER_CREATED: 'blue',
            MEMBER_UPDATED: 'cyan',
            MEMBER_DELETED: 'red',
          };
          const color = colorMap[action] || 'gray';
          return (
            <Badge color={color} variant="light" radius="sm" size="sm">
              {action.replace(/_/g, ' ')}
            </Badge>
          );
        },
      },
      {
        accessor: 'userName',
        title: t('auditLogs.columns.user'),
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'userRole',
        title: t('auditLogs.columns.role'),
        width: 150,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => {
          const roleColorMap: Record<string, string> = {
            SystemAdmin: 'red',
            AssociationAdmin: 'yellow',
            Member: 'blue',
          };
          const role = record.userRole;
          const color = roleColorMap[role] || 'gray';
          return (
            <Badge color={color} variant="light" radius="sm" size="sm">
              {role}
            </Badge>
          );
        },
      },
      {
        accessor: 'details',
        title: t('auditLogs.columns.details'),
        width: 300,
        toggleable: true,
        resizable: true,
        render: (record) => (
          <div className="details-cell">
            <div>{record.details}</div>
            {record.targetName && (
              <div className="target-info">
                {t('auditLogs.details.targetLabel')} <strong>{record.targetName}</strong>
              </div>
            )}
          </div>
        ),
      },
      {
        accessor: 'targetType',
        title: t('auditLogs.columns.targetType'),
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
    ],
  });

  return (
    <RoleGuard allowedRoles={[UserRole.SYSTEM_ADMIN]}>
      <Stack gap="lg">
        {/* Page Header */}
        <Group justify="space-between">
          <PageHeader titleKey="auditLogs" />
          <Group>
            <Button onClick={loadLogs} variant="outline" loading={loading}>
              <RefreshCw size={18} style={{ marginRight: 8 }} />
              {t('auditLogs.actions.refresh')}
            </Button>
            <Button color="blue" onClick={handleExport} loading={isExporting}>
              <Download size={18} style={{ marginRight: 8 }} />
              {t('auditLogs.actions.exportLogs')}
            </Button>
          </Group>
        </Group>

        {/* Stats Cards - Mantine Paper Components */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <div>
                <Text c="dimmed" tt="uppercase" fw={700} size="xs">
                  {t('auditLogs.stats.totalLogs')}
                </Text>
                <Text fw={700} size="xl" component="p" aria-live="polite">
                  {logs.length}
                </Text>
              </div>
              <ThemeIcon color="blue" variant="light" size={38} radius="md" aria-hidden="true">
                <FileText size={20} />
              </ThemeIcon>
            </Group>
            <Text c="dimmed" size="xs" mt="md">
              {t('auditLogs.stats.totalLogsDescription')}
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <div>
                <Text c="dimmed" tt="uppercase" fw={700} size="xs">
                  {t('auditLogs.stats.todaysActivity')}
                </Text>
                <Text fw={700} size="xl" component="p" aria-live="polite">
                  {todayCount}
                </Text>
              </div>
              <ThemeIcon color="green" variant="light" size={38} radius="md" aria-hidden="true">
                <Clock size={20} />
              </ThemeIcon>
            </Group>
            <Text c="dimmed" size="xs" mt="md">
              {t('auditLogs.stats.todaysActivityDescription')}
            </Text>
          </Paper>
        </SimpleGrid>

        <ErrorBoundary>
          {loading && logs.length === 0 ? (
            <Stack gap="xs">
              <Skeleton height={50} radius="md" />
              <Skeleton height={50} radius="md" />
              <Skeleton height={50} radius="md" />
              <Skeleton height={50} radius="md" />
              <Skeleton height={50} radius="md" />
              <Skeleton height={50} radius="md" />
            </Stack>
          ) : sortedLogs.length === 0 && !loading ? (
            <Paper p="xl" withBorder radius="md" style={{ textAlign: 'center' }}>
              <Stack align="center" gap="md">
                <Shield size={48} style={{ color: 'var(--mantine-color-gray-5)' }} />
                <div>
                  <Text size="lg" fw={600} mb="xs">
                    {t('auditLogs.emptyState.title')}
                  </Text>
                  <Text size="sm" c="dimmed" mb="lg">
                    {t('auditLogs.emptyState.description')}
                  </Text>
                </div>
                <Button
                  variant="outline"
                  onClick={loadLogs}
                  leftSection={<RefreshCw size={18} />}
                >
                  {t('auditLogs.emptyState.refresh')}
                </Button>
              </Stack>
            </Paper>
          ) : (
            <DataTable
              {...defaultDataTableProps}
              records={sortedLogs.slice((page - 1) * pageSize, page * pageSize)}
              columns={effectiveColumns}
              storeColumnsKey="audit-log-grid"
              totalRecords={sortedLogs.length}
              page={page}
              onPageChange={setPage}
              recordsPerPage={pageSize}
              onRecordsPerPageChange={setPageSize}
              recordsPerPageOptions={[10, 25, 50, 100]}
              sortStatus={sortStatus}
              onSortStatusChange={setSortStatus}
              fetching={loading}
              withTableBorder
              withColumnBorders
              striped
              highlightOnHover
            />
          )}
        </ErrorBoundary>
      </Stack>
    </RoleGuard>
  );
};

export default React.memo(AuditLogViewer);
