/**
 * Audit Log Viewer
 * View and filter all system activity logs
 */

import { type State, process } from '@progress/kendo-data-query';
import { Button, Select } from '@mantine/core';


import {
  Grid,
  GridColumn,
  type GridCellProps,
  type GridFilterChangeEvent,
  type GridPageChangeEvent,
  type GridSortChangeEvent,
} from '@progress/kendo-react-grid';
import { Download, FileText, RefreshCw } from '../icons';
import type React from 'react';
import { useEffect, useState } from 'react';
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

  // Grid state
  const [dataState, setDataState] = useState<State>({
    skip: 0,
    take: 20,
    sort: [{ field: 'timestamp', dir: 'desc' }],
    filter: undefined,
  });

  const [processedData, setProcessedData] = useState<any>({ data: [], total: 0 });

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    applyFiltersAndProcess();
  }, [logs, selectedAction, selectedTargetType, dataState]);

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

  const applyFiltersAndProcess = () => {
    let filtered = [...logs];

    if (selectedAction !== 'All') {
      filtered = filtered.filter((log) => log.action === selectedAction);
    }

    if (selectedTargetType !== 'All') {
      filtered = filtered.filter((log) => log.targetType === selectedTargetType);
    }

    const processed = process(filtered, dataState);
    setProcessedData(processed);
  };

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

  const handleSortChange = (event: GridSortChangeEvent) => {
    setDataState({ ...dataState, sort: event.sort });
  };

  const handleFilterChange = (event: GridFilterChangeEvent) => {
    setDataState({ ...dataState, filter: event.filter });
  };

  const handlePageChange = (event: GridPageChangeEvent) => {
    setDataState({ ...dataState, skip: event.page.skip, take: event.page.take });
  };

  const RoleCell = (props: GridCellProps) => {
    const roleClasses: Record<string, string> = {
      SystemAdmin: 'role-system-admin',
      AssociationAdmin: 'role-association-admin',
      Member: 'role-member',
    };

    const role = props.dataItem.userRole;
    const roleClass = roleClasses[role] || 'role-member';

    return (
      <td>
        <span className={`role-badge ${roleClass}`}>{role}</span>
      </td>
    );
  };

  const ActionCell = (props: GridCellProps) => {
    const action = props.dataItem.action;
    const color = getAuditActionColor(action);

    return (
      <td>
        <span className="action-badge" style={{ backgroundColor: `${color}20`, color }}>
          {action.replace(/_/g, ' ')}
        </span>
      </td>
    );
  };

  const DetailsCell = (props: GridCellProps) => {
    return (
      <td>
        <div className="details-cell">
          <div>{props.dataItem.details}</div>
          {props.dataItem.targetName && (
            <div className="target-info">
              Target: <strong>{props.dataItem.targetName}</strong>
            </div>
          )}
        </div>
      </td>
    );
  };

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
            <span className="stat-value">{processedData.total}</span>
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
              onChange={(value) => setSelectedAction(value)}
            />
          </div>
          <div className="filter-group">
            <label>Target Type</label>
            <Select
              data={targetTypes}
              value={selectedTargetType}
              onChange={(value) => setSelectedTargetType(value)}
            />
          </div>
          <div className="filter-actions">
            <Button onClick={handleClearFilters} variant="subtle">
              Clear Filters
            </Button>
          </div>
        </div>

        <Grid
          data={processedData}
          sortable={true}
          filterable={true}
          resizable={true}
          pageable={{
            buttonCount: 5,
            info: true,
            pageSizes: [10, 20, 50, 100],
          }}
          skip={dataState.skip}
          take={dataState.take}
          total={processedData.total}
          sort={dataState.sort}
          filter={dataState.filter}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
          style={{ height: '500px' }}
        >
          <GridColumn
            field="timestamp"
            title="Timestamp"
            width="180px"
            format="{0:dd/MM/yyyy HH:mm:ss}"
            filter="date"
          />
          <GridColumn field="action" title="Action" width="200px" cells={{ data: ActionCell }} />
          <GridColumn field="userName" title="User" width="180px" />
          <GridColumn field="userRole" title="Role" width="150px" cells={{ data: RoleCell }} />
          <GridColumn field="details" title="Details" cells={{ data: DetailsCell }} />
          <GridColumn field="targetType" title="Target Type" width="120px" />
        </Grid>
      </div>
    </RoleGuard>
  );
};

export default AuditLogViewer;
