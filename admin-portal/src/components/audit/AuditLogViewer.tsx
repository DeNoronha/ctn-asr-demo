/**
 * Audit Log Viewer
 * View and filter all system activity logs
 */

import { Button, Select } from '@mantine/core';

import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  type MRT_SortingState,
  type MRT_ColumnFiltersState,
  useMantineReactTable,
} from 'mantine-react-table';
import { Download, FileText, RefreshCw } from '../icons';
import type React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { RoleGuard } from '../../auth/ProtectedRoute';
import { UserRole } from '../../auth/authConfig';
import { AuditAction, type AuditLog, auditLogService } from '../../services/auditLogService';
import { getAuditActionColor } from '../../utils/colors';
import './AuditLogViewer.css';

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

  // Column definitions
  const columns = useMemo<MRT_ColumnDef<AuditLog>[]>(
    () => [
      {
        accessorKey: 'timestamp',
        header: 'Timestamp',
        size: 180,
        Cell: ({ cell }) => {
          const value = cell.getValue<Date>();
          return <div>{new Date(value).toLocaleString('en-GB')}</div>;
        },
      },
      {
        accessorKey: 'action',
        header: 'Action',
        size: 200,
        Cell: ({ row }) => {
          const action = row.original.action;
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
        accessorKey: 'userName',
        header: 'User',
        size: 180,
      },
      {
        accessorKey: 'userRole',
        header: 'Role',
        size: 150,
        Cell: ({ row }) => {
          const roleClasses: Record<string, string> = {
            SystemAdmin: 'role-system-admin',
            AssociationAdmin: 'role-association-admin',
            Member: 'role-member',
          };
          const role = row.original.userRole;
          const roleClass = roleClasses[role] || 'role-member';
          return (
            <div>
              <span className={`role-badge ${roleClass}`}>{role}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'details',
        header: 'Details',
        size: 300,
        Cell: ({ row }) => (
          <div className="details-cell">
            <div>{row.original.details}</div>
            {row.original.targetName && (
              <div className="target-info">
                Target: <strong>{row.original.targetName}</strong>
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'targetType',
        header: 'Target Type',
        size: 120,
      },
    ],
    []
  );

  // Mantine React Table instance with standard features
  const table = useMantineReactTable({
    columns,
    data: filteredLogs,

    // Row Selection - disabled for read-only audit logs
    enableRowSelection: false,

    // Column Features
    enableColumnResizing: true,
    columnResizeMode: 'onChange', // Shows resize preview while dragging
    enableColumnOrdering: true,
    enableHiding: true,
    enableColumnFilters: true,

    // Sorting & Filtering
    enableSorting: true,
    enableGlobalFilter: true,
    enableFilters: true,

    // Pagination
    enablePagination: true,

    // Initial state
    initialState: {
      sorting: [{ id: 'timestamp', desc: true }],
      pagination: { pageIndex: 0, pageSize: 20 },
    },

    // Table styling
    mantineTableProps: {
      striped: true,
      withColumnBorders: true,
      withTableBorder: true,
    },

    // Toolbar positioning
    positionGlobalFilter: 'left',
    positionToolbarAlertBanner: 'bottom',
    positionActionsColumn: 'last',
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

        <MantineReactTable table={table} />
      </div>
    </RoleGuard>
  );
};

export default AuditLogViewer;
