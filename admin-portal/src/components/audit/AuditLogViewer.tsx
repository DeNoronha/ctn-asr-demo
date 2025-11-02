/**
 * Audit Log Viewer
 * View and filter all system activity logs
 */

import { Button, Select, Stack, Skeleton } from '@mantine/core';
import { DataTable, useDataTableColumns, type DataTableColumn } from 'mantine-datatable';
import { Download, FileText, RefreshCw } from '../icons';
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { RoleGuard } from '../../auth/ProtectedRoute';
import { UserRole } from '../../auth/authConfig';
import { AuditAction, type AuditLog, auditLogService } from '../../services/auditLogService';
import { getAuditActionColor } from '../../utils/colors';
import './AuditLogViewer.css';
import { formatDateTimeGB } from '../../utils/dateFormat';
import { ErrorBoundary } from '../ErrorBoundary';
import { defaultDataTableProps, defaultPaginationOptions } from '../shared/DataTableConfig';

const AuditLogViewer: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [_loading, setLoading] = useState(false);

  // Filters
  const [selectedAction, setSelectedAction] = useState<string>('All');
  const [selectedTargetType, setSelectedTargetType] = useState<string>('All');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await auditLogService.getLogs(1, 1000);
      setLogs(allLogs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply dropdown filters to logs
  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== 'All' && log.action !== selectedAction) return false;
    if (selectedTargetType !== 'All' && log.targetType !== selectedTargetType) return false;
    return true;
  });

  const handleExport = async () => {
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
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const handleClearFilters = () => {
    setSelectedAction('All');
    setSelectedTargetType('All');
  };

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
          const color = getAuditActionColor(action);
          return (
            <div>
              <span className="action-badge" style={{ backgroundColor: `${color}20`, color }}>
                {action.replace(/_/g, ' ')}
              </span>
            </div>
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
          const roleClasses: Record<string, string> = {
            SystemAdmin: 'role-system-admin',
            AssociationAdmin: 'role-association-admin',
            Member: 'role-member',
          };
          const role = record.userRole;
          const roleClass = roleClasses[role] || 'role-member';
          return (
            <div>
              <span className={`role-badge ${roleClass}`}>{role}</span>
            </div>
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

  const actions = ['All', ...Object.values(AuditAction)];
  const targetTypes = ['All', 'user', 'member', 'token', 'system'];

  return (
    <RoleGuard allowedRoles={[UserRole.SYSTEM_ADMIN]}>
      <div className="audit-log-viewer">
        <div className="view-header">
          <div className="header-content">
            <FileText size={32} className="header-icon" />
            <div>
              <h2>Audit Logs</h2>
              <p className="header-description">System activity and security logs</p>
            </div>
          </div>
          <div className="header-actions">
            <Button onClick={loadLogs} variant="outline">
              <RefreshCw size={18} style={{ marginRight: 8 }} />
              Refresh
            </Button>
            <Button color="blue" onClick={handleExport}>
              <Download size={18} style={{ marginRight: 8 }} />
              Export Logs
            </Button>
          </div>
        </div>

        <div className="audit-stats">
          <div className="stat-item">
            <span className="stat-label">Total Logs</span>
            <span className="stat-value">{logs.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Filtered</span>
            <span className="stat-value">{filteredLogs.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Today</span>
            <span className="stat-value">
              {
                logs.filter((l) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return l.timestamp >= today;
                }).length
              }
            </span>
          </div>
        </div>

        <div className="filters-panel">
          <div className="filter-group">
            <label>Action Type</label>
            <Select
              data={actions}
              value={selectedAction}
              onChange={(value) => setSelectedAction(value || '')}
            />
          </div>
          <div className="filter-group">
            <label>Target Type</label>
            <Select
              data={targetTypes}
              value={selectedTargetType}
              onChange={(value) => setSelectedTargetType(value || '')}
            />
          </div>
          <div className="filter-actions">
            <Button onClick={handleClearFilters} variant="subtle">
              Clear Filters
            </Button>
          </div>
        </div>

        <ErrorBoundary>
          {_loading && filteredLogs.length === 0 ? (
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
              records={filteredLogs}
              columns={effectiveColumns}
              storeColumnsKey="audit-log-grid"
              withTableBorder
              withColumnBorders
              striped
              highlightOnHover
            />
          )}
        </ErrorBoundary>
      </div>
    </RoleGuard>
  );
};

export default React.memo(AuditLogViewer);
