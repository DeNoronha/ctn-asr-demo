/**
 * Audit Log Viewer
 * View and filter all system activity logs with pagination and Mantine components
 */

import {
  Badge,
  Button,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { DataTable, type DataTableSortStatus, useDataTableColumns } from 'mantine-datatable';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RoleGuard } from '../../auth/ProtectedRoute';
import { UserRole } from '../../auth/authConfig';
import { useNotification } from '../../contexts/NotificationContext';
import { AuditAction, type AuditLog, auditLogService } from '../../services/auditLogService';
import { formatDateTimeGB } from '../../utils/dateFormat';
import { ErrorBoundary } from '../ErrorBoundary';
import { Activity, Clock, Download, Search, FileText, RefreshCw } from '../icons';
import { defaultDataTableProps } from '../shared/DataTableConfig';
import { PageHeader } from '../shared/PageHeader';
import './AuditLogViewer.css';

const AuditLogViewer: React.FC = () => {
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

  // Filter state
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedTargetType, setSelectedTargetType] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      // Load all logs for now (will be filtered client-side)
      // TODO: Implement server-side filtering in API
      const allLogs = await auditLogService.getLogs(1, 1000);
      setLogs(allLogs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      notification.showError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Apply filters
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedAction && log.action !== selectedAction) return false;
      if (selectedTargetType && log.targetType !== selectedTargetType) return false;
      return true;
    });
  }, [logs, selectedAction, selectedTargetType]);

  // Apply sorting
  const sortedLogs = useMemo(() => {
    const sorted = [...filteredLogs];
    if (sortStatus.columnAccessor === 'timestamp') {
      sorted.sort((a, b) => {
        const aTime = new Date(a.timestamp).getTime();
        const bTime = new Date(b.timestamp).getTime();
        return sortStatus.direction === 'asc' ? aTime - bTime : bTime - aTime;
      });
    }
    return sorted;
  }, [filteredLogs, sortStatus]);

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
      notification.showSuccess(`Exported ${logs.length} audit logs successfully`);
    } catch (error) {
      console.error('Failed to export logs:', error);
      notification.showError('Failed to export audit logs');
    } finally {
      setIsExporting(false);
    }
  }, [logs.length, notification]);

  const handleClearFilters = useCallback(() => {
    setSelectedAction(null);
    setSelectedTargetType(null);
    setPage(1); // Reset to first page when clearing filters
  }, []);

  // mantine-datatable column definitions
  const { effectiveColumns } = useDataTableColumns<AuditLog>({
    key: 'audit-log-grid',
    columns: [
      {
        accessor: 'timestamp',
        title: 'Timestamp',
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => <div>{formatDateTimeGB(record.timestamp)}</div>,
      },
      {
        accessor: 'action',
        title: 'Action',
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
        title: 'User',
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'userRole',
        title: 'Role',
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
        title: 'Details',
        width: 300,
        toggleable: true,
        resizable: true,
        render: (record) => (
          <div className="details-cell">
            <div>{record.details}</div>
            {record.targetName && (
              <div className="target-info">
                Target: <strong>{record.targetName}</strong>
              </div>
            )}
          </div>
        ),
      },
      {
        accessor: 'targetType',
        title: 'Target Type',
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
    ],
  });

  // Filter options
  const actionOptions = useMemo(
    () => [{ value: '', label: 'All Actions' }, ...Object.values(AuditAction).map((a) => ({ value: a, label: a.replace(/_/g, ' ') }))],
    []
  );
  const targetTypeOptions = useMemo(
    () => [
      { value: '', label: 'All Types' },
      { value: 'user', label: 'User' },
      { value: 'member', label: 'Member' },
      { value: 'token', label: 'Token' },
      { value: 'm2m_client', label: 'M2M Client' },
      { value: 'legal_entity', label: 'Legal Entity' },
      { value: 'system', label: 'System' },
    ],
    []
  );

  return (
    <RoleGuard allowedRoles={[UserRole.SYSTEM_ADMIN]}>
      <Stack gap="lg">
        {/* Page Header */}
        <Group justify="space-between">
          <PageHeader titleKey="auditLogs" />
          <Group>
            <Button onClick={loadLogs} variant="outline" loading={loading}>
              <RefreshCw size={18} style={{ marginRight: 8 }} />
              Refresh
            </Button>
            <Button color="blue" onClick={handleExport} loading={isExporting}>
              <Download size={18} style={{ marginRight: 8 }} />
              Export Logs
            </Button>
          </Group>
        </Group>

        {/* Stats Cards - Mantine Paper Components */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <div>
                <Text c="dimmed" tt="uppercase" fw={700} size="xs">
                  Total Logs
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
              All audit entries
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <div>
                <Text c="dimmed" tt="uppercase" fw={700} size="xs">
                  Filtered Results
                </Text>
                <Text fw={700} size="xl" component="p" aria-live="polite">
                  {filteredLogs.length}
                </Text>
              </div>
              <ThemeIcon color="cyan" variant="light" size={38} radius="md" aria-hidden="true">
                <Search size={20} />
              </ThemeIcon>
            </Group>
            <Text c="dimmed" size="xs" mt="md">
              Matching current filters
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <div>
                <Text c="dimmed" tt="uppercase" fw={700} size="xs">
                  Today's Activity
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
              Logs from last 24 hours
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Filters Panel - Mantine Paper */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Group grow align="flex-end">
              <Select
                label="Action Type"
                placeholder="All actions"
                data={actionOptions}
                value={selectedAction || ''}
                onChange={(value) => {
                  setSelectedAction(value || null);
                  setPage(1);
                }}
                clearable
                searchable
                aria-label="Filter by action type"
              />
              <Select
                label="Target Type"
                placeholder="All targets"
                data={targetTypeOptions}
                value={selectedTargetType || ''}
                onChange={(value) => {
                  setSelectedTargetType(value || null);
                  setPage(1);
                }}
                clearable
                searchable
                aria-label="Filter by target type"
              />
            </Group>
            <Group justify="flex-end">
              <Button onClick={handleClearFilters} variant="subtle" size="sm" aria-label="Clear all filters">
                Clear All Filters
              </Button>
            </Group>
          </Stack>
        </Paper>

        <ErrorBoundary>
          {loading && filteredLogs.length === 0 ? (
            <Stack gap="xs">
              <Skeleton height={50} radius="md" />
              <Skeleton height={50} radius="md" />
              <Skeleton height={50} radius="md" />
              <Skeleton height={50} radius="md" />
              <Skeleton height={50} radius="md" />
              <Skeleton height={50} radius="md" />
            </Stack>
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
