/**
 * Audit Log Viewer
 * View and filter all system activity logs with pagination and Mantine components
 */

import {
  ActionIcon,
  Badge,
  Button,
  Collapse,
  Group,
  Menu,
  MultiSelect,
  Paper,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDebouncedValue } from '@mantine/hooks';
import { DataTable, type DataTableSortStatus, useDataTableColumns } from 'mantine-datatable';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleGuard } from '../../auth/ProtectedRoute';
import { UserRole } from '../../auth/authConfig';
import { useNotification } from '../../contexts/NotificationContext';
import { AuditAction, type AuditLog, auditLogService, type AuditLogFilters } from '../../services/auditLogService';
import { formatDateTimeGB } from '../../utils/dateFormat';
import { exportAuditLogsAsCSV, exportAuditLogsAsExcel, exportAuditLogsAsJSON } from '../../utils/export';
import { ErrorBoundary } from '../ErrorBoundary';
import { Activity, ChevronDown, ChevronUp, Clock, Download, FileSpreadsheet, FileJson, FileText, RefreshCw, Shield, X } from '../icons';
import { defaultDataTableProps } from '../shared/DataTableConfig';
import { PageHeader } from '../shared/PageHeader';
import './AuditLogViewer.css';

// Event type options for filter (matching backend AuditEventType enum)
const EVENT_TYPE_OPTIONS = [
  { value: 'auth_success', label: 'Auth Success' },
  { value: 'auth_failure', label: 'Auth Failure' },
  { value: 'token_issued', label: 'Token Issued' },
  { value: 'token_revoked', label: 'Token Revoked' },
  { value: 'member_created', label: 'Member Created' },
  { value: 'member_updated', label: 'Member Updated' },
  { value: 'member_deleted', label: 'Member Deleted' },
  { value: 'member_activated', label: 'Member Activated' },
  { value: 'member_suspended', label: 'Member Suspended' },
  { value: 'contact_created', label: 'Contact Created' },
  { value: 'contact_updated', label: 'Contact Updated' },
  { value: 'contact_deleted', label: 'Contact Deleted' },
  { value: 'endpoint_created', label: 'Endpoint Created' },
  { value: 'endpoint_updated', label: 'Endpoint Updated' },
  { value: 'endpoint_deleted', label: 'Endpoint Deleted' },
  { value: 'endpoint_token_issued', label: 'Endpoint Token Issued' },
  { value: 'identifier_created', label: 'Identifier Created' },
  { value: 'identifier_updated', label: 'Identifier Updated' },
  { value: 'identifier_deleted', label: 'Identifier Deleted' },
  { value: 'document_uploaded', label: 'Document Uploaded' },
  { value: 'document_approved', label: 'Document Approved' },
  { value: 'document_rejected', label: 'Document Rejected' },
  { value: 'admin_approval', label: 'Admin Approval' },
  { value: 'admin_rejection', label: 'Admin Rejection' },
  { value: 'admin_review', label: 'Admin Review' },
  { value: 'application_submitted', label: 'Application Submitted' },
  { value: 'subscription_created', label: 'Subscription Created' },
  { value: 'subscription_updated', label: 'Subscription Updated' },
  { value: 'subscription_cancelled', label: 'Subscription Cancelled' },
  { value: 'newsletter_created', label: 'Newsletter Created' },
  { value: 'newsletter_sent', label: 'Newsletter Sent' },
  { value: 'task_created', label: 'Task Created' },
  { value: 'task_updated', label: 'Task Updated' },
  { value: 'task_completed', label: 'Task Completed' },
  { value: 'access_granted', label: 'Access Granted' },
  { value: 'access_denied', label: 'Access Denied' },
  { value: 'permission_violation', label: 'Permission Violation' },
  { value: 'data_exported', label: 'Data Exported' },
];

// Resource type options (matching backend ALLOWED_RESOURCE_TYPES)
const RESOURCE_TYPE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'legal_entity', label: 'Legal Entity' },
  { value: 'legal_entity_contact', label: 'Contact' },
  { value: 'legal_entity_endpoint', label: 'Endpoint' },
  { value: 'legal_entity_identifier', label: 'Identifier' },
  { value: 'endpoint_authorization', label: 'Endpoint Authorization' },
  { value: 'euid', label: 'EUID' },
  { value: 'lei', label: 'LEI' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'task', label: 'Task' },
  { value: 'document', label: 'Document' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'event', label: 'Event' },
  { value: 'party', label: 'Party' },
];

// Severity options
const SEVERITY_OPTIONS = [
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
  { value: 'CRITICAL', label: 'Critical' },
];

const AuditLogViewer: React.FC = () => {
  const { t } = useTranslation();
  const notification = useNotification();

  // Data state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
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
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [debouncedUserEmail] = useDebouncedValue(userEmail, 500);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [severity, setSeverity] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // Build filter object from current filter state
  const activeFilters = useMemo((): AuditLogFilters => {
    const filters: AuditLogFilters = {
      page,
      limit: pageSize,
    };

    // Only add filters that have values
    if (eventTypes.length > 0) {
      // API only supports single event_type, but we'll apply client-side filtering for multiple
      filters.event_type = eventTypes[0];
    }
    if (debouncedUserEmail.trim()) {
      filters.user_email = debouncedUserEmail.trim();
    }
    if (startDate) {
      filters.start_date = startDate.toISOString();
    }
    if (endDate) {
      filters.end_date = endDate.toISOString();
    }
    if (resourceTypes.length > 0) {
      filters.resource_type = resourceTypes[0];
    }
    if (severity) {
      filters.severity = severity as 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    }
    if (result) {
      filters.result = result as 'success' | 'failure';
    }

    return filters;
  }, [page, pageSize, eventTypes, debouncedUserEmail, startDate, endDate, resourceTypes, severity, result]);

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (eventTypes.length > 0) count++;
    if (debouncedUserEmail.trim()) count++;
    if (startDate) count++;
    if (endDate) count++;
    if (resourceTypes.length > 0) count++;
    if (severity) count++;
    if (result) count++;
    return count;
  }, [eventTypes, debouncedUserEmail, startDate, endDate, resourceTypes, severity, result]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await auditLogService.fetchLogs(activeFilters);
      const transformedLogs = response.data.map((log) => auditLogService.transformToFrontendFormat(log));

      // Client-side filtering for multiple event types (API only supports one)
      let filteredLogs = transformedLogs;
      if (eventTypes.length > 1) {
        filteredLogs = transformedLogs.filter((log) => eventTypes.includes(log.action));
      }
      if (resourceTypes.length > 1) {
        filteredLogs = filteredLogs.filter((log) => resourceTypes.includes(log.targetType));
      }

      setLogs(filteredLogs);
      setTotalLogs(response.pagination.totalItems);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      notification.showError(t('auditLogs.notifications.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [activeFilters, eventTypes, resourceTypes, notification, t]);

  // Reload when filters change
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Calculate stats from loaded logs
  const todayCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return logs.filter((l) => l.timestamp >= today).length;
  }, [logs]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setEventTypes([]);
    setUserEmail('');
    setStartDate(null);
    setEndDate(null);
    setResourceTypes([]);
    setSeverity(null);
    setResult(null);
    setPage(1);
  }, []);

  const handleExportCSV = useCallback(() => {
    setIsExporting(true);
    try {
      if (logs.length === 0) {
        notification.showError(t('auditLogs.export.noData'));
        return;
      }
      exportAuditLogsAsCSV(logs);
      notification.showSuccess(t('auditLogs.export.success'));
    } catch (error) {
      console.error('Failed to export CSV:', error);
      notification.showError(t('auditLogs.notifications.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  }, [logs, notification, t]);

  const handleExportExcel = useCallback(() => {
    setIsExporting(true);
    try {
      if (logs.length === 0) {
        notification.showError(t('auditLogs.export.noData'));
        return;
      }
      exportAuditLogsAsExcel(logs);
      notification.showSuccess(t('auditLogs.export.success'));
    } catch (error) {
      console.error('Failed to export Excel:', error);
      notification.showError(t('auditLogs.notifications.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  }, [logs, notification, t]);

  const handleExportJSON = useCallback(() => {
    setIsExporting(true);
    try {
      if (logs.length === 0) {
        notification.showError(t('auditLogs.export.noData'));
        return;
      }
      exportAuditLogsAsJSON(logs);
      notification.showSuccess(t('auditLogs.export.success'));
    } catch (error) {
      console.error('Failed to export JSON:', error);
      notification.showError(t('auditLogs.notifications.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  }, [logs, notification, t]);

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
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <Button color="blue" loading={isExporting}>
                  <Download size={18} style={{ marginRight: 8 }} />
                  {t('auditLogs.actions.exportLogs')}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{t('auditLogs.export.selectFormat')}</Menu.Label>
                <Menu.Item
                  leftSection={<FileText size={16} />}
                  onClick={handleExportCSV}
                  disabled={isExporting || logs.length === 0}
                >
                  {t('auditLogs.export.csv')}
                </Menu.Item>
                <Menu.Item
                  leftSection={<FileSpreadsheet size={16} />}
                  onClick={handleExportExcel}
                  disabled={isExporting || logs.length === 0}
                >
                  {t('auditLogs.export.excel')}
                </Menu.Item>
                <Menu.Item
                  leftSection={<FileJson size={16} />}
                  onClick={handleExportJSON}
                  disabled={isExporting || logs.length === 0}
                >
                  {t('auditLogs.export.json')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        {/* Filter Section */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb={filtersVisible ? 'md' : 0}>
            <Group>
              <Button
                variant="light"
                onClick={() => setFiltersVisible(!filtersVisible)}
                rightSection={filtersVisible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              >
                {filtersVisible ? t('auditLogs.actions.hideFilters') : t('auditLogs.actions.showFilters')}
              </Button>
              {activeFilterCount > 0 && (
                <Badge color="blue" variant="filled" size="lg">
                  {t('auditLogs.filters.activeFilters', { count: activeFilterCount })}
                </Badge>
              )}
            </Group>
            {activeFilterCount > 0 && (
              <Button variant="subtle" color="red" onClick={handleClearFilters} leftSection={<X size={16} />}>
                {t('auditLogs.actions.clearFilters')}
              </Button>
            )}
          </Group>

          <Collapse in={filtersVisible}>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {/* Event Type Filter */}
                <MultiSelect
                  label={t('auditLogs.filters.eventType')}
                  placeholder={t('auditLogs.filters.eventTypePlaceholder')}
                  data={EVENT_TYPE_OPTIONS}
                  value={eventTypes}
                  onChange={setEventTypes}
                  searchable
                  clearable
                  maxDropdownHeight={300}
                />

                {/* User Email Filter */}
                <TextInput
                  label={t('auditLogs.filters.userEmail')}
                  placeholder={t('auditLogs.filters.userEmailPlaceholder')}
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.currentTarget.value)}
                  rightSection={userEmail && <ActionIcon size="sm" variant="subtle" onClick={() => setUserEmail('')}><X size={14} /></ActionIcon>}
                />

                {/* Resource Type Filter */}
                <MultiSelect
                  label={t('auditLogs.filters.resourceType')}
                  placeholder={t('auditLogs.filters.resourceTypePlaceholder')}
                  data={RESOURCE_TYPE_OPTIONS}
                  value={resourceTypes}
                  onChange={setResourceTypes}
                  searchable
                  clearable
                  maxDropdownHeight={300}
                />

                {/* Start Date Filter */}
                <DatePickerInput
                  label={t('auditLogs.filters.startDate')}
                  placeholder="Select start date"
                  value={startDate}
                  onChange={(value) => setStartDate(value ? new Date(value) : null)}
                  clearable
                  maxDate={endDate || undefined}
                />

                {/* End Date Filter */}
                <DatePickerInput
                  label={t('auditLogs.filters.endDate')}
                  placeholder="Select end date"
                  value={endDate}
                  onChange={(value) => setEndDate(value ? new Date(value) : null)}
                  clearable
                  minDate={startDate || undefined}
                />

                {/* Severity Filter */}
                <Select
                  label={t('auditLogs.filters.severity')}
                  placeholder={t('auditLogs.filters.severityPlaceholder')}
                  data={SEVERITY_OPTIONS}
                  value={severity}
                  onChange={setSeverity}
                  clearable
                />

                {/* Result Filter */}
                <Select
                  label={t('auditLogs.filters.result')}
                  placeholder={t('auditLogs.filters.resultPlaceholder')}
                  data={[
                    { value: 'success', label: t('auditLogs.filters.success') },
                    { value: 'failure', label: t('auditLogs.filters.failure') },
                  ]}
                  value={result}
                  onChange={setResult}
                  clearable
                />
              </SimpleGrid>
            </Stack>
          </Collapse>
        </Paper>

        {/* Stats Cards - Mantine Paper Components */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <div>
                <Text c="dimmed" tt="uppercase" fw={700} size="xs">
                  {t('auditLogs.stats.totalLogs')}
                </Text>
                <Text fw={700} size="xl" component="p" aria-live="polite">
                  {totalLogs}
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
          ) : logs.length === 0 && !loading ? (
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
              records={logs}
              columns={effectiveColumns}
              storeColumnsKey="audit-log-grid"
              totalRecords={totalLogs}
              page={page}
              onPageChange={setPage}
              recordsPerPage={pageSize}
              onRecordsPerPageChange={setPageSize}
              recordsPerPageOptions={[10, 25, 50, 100]}
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
