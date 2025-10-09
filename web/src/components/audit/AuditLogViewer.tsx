/**
 * Audit Log Viewer
 * View and filter all system activity logs
 */

import React, { useState, useEffect } from 'react';
import {
  Grid,
  GridColumn,
  GridSortChangeEvent,
  GridFilterChangeEvent,
  GridPageChangeEvent,
} from '@progress/kendo-react-grid';
import { Button } from '@progress/kendo-react-buttons';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { process, State } from '@progress/kendo-data-query';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { auditLogService, AuditLog, AuditAction } from '../../services/auditLogService';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '../../auth/authConfig';
import { RoleGuard } from '../../auth/ProtectedRoute';
import './AuditLogViewer.css';

const AuditLogViewer: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  
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

  const loadLogs = () => {
    setLoading(true);
    try {
      const allLogs = auditLogService.getLogs();
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
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    if (selectedTargetType !== 'All') {
      filtered = filtered.filter(log => log.targetType === selectedTargetType);
    }

    const processed = process(filtered, dataState);
    setProcessedData(processed);
  };

  const handleExport = () => {
    const json = auditLogService.exportLogs();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const RoleCell = (props: any) => {
    const roleClasses: Record<string, string> = {
      'SystemAdmin': 'role-system-admin',
      'AssociationAdmin': 'role-association-admin',
      'Member': 'role-member',
    };

    const role = props.dataItem.userRole;
    const roleClass = roleClasses[role] || 'role-member';

    return (
      <td>
        <span className={`role-badge ${roleClass}`}>
          {role}
        </span>
      </td>
    );
  };

  const ActionCell = (props: any) => {
    const actionColors: Record<string, string> = {
      USER_INVITED: '#3b82f6',
      USER_UPDATED: '#8b5cf6',
      USER_ENABLED: '#10b981',
      USER_DISABLED: '#ef4444',
      USER_ROLE_CHANGED: '#f59e0b',
      MEMBER_CREATED: '#10b981',
      MEMBER_UPDATED: '#3b82f6',
      MEMBER_DELETED: '#ef4444',
      TOKEN_ISSUED: '#10b981',
      USER_LOGIN: '#6366f1',
      USER_LOGOUT: '#64748b',
    };

    const action = props.dataItem.action;
    const color = actionColors[action] || '#64748b';

    return (
      <td>
        <span className="action-badge" style={{ backgroundColor: `${color}20`, color }}>
          {action.replace(/_/g, ' ')}
        </span>
      </td>
    );
  };

  const DetailsCell = (props: any) => {
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
            <Button
              onClick={loadLogs}
              fillMode="outline"
            >
              <RefreshCw size={18} style={{ marginRight: 8 }} />
              Refresh
            </Button>
            <Button
              themeColor="primary"
              onClick={handleExport}
            >
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
              {logs.filter(l => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return l.timestamp >= today;
              }).length}
            </span>
          </div>
        </div>

        <div className="filters-panel">
          <div className="filter-group">
            <label>Action Type</label>
            <DropDownList
              data={actions}
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.value)}
            />
          </div>
          <div className="filter-group">
            <label>Target Type</label>
            <DropDownList
              data={targetTypes}
              value={selectedTargetType}
              onChange={(e) => setSelectedTargetType(e.value)}
            />
          </div>
          <div className="filter-actions">
            <Button
              onClick={handleClearFilters}
              fillMode="flat"
            >
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
          <GridColumn
            field="action"
            title="Action"
            width="200px"
            cell={ActionCell}
          />
          <GridColumn
            field="userName"
            title="User"
            width="180px"
          />
          <GridColumn
            field="userRole"
            title="Role"
            width="150px"
            cell={RoleCell}
          />
          <GridColumn
            field="details"
            title="Details"
            cell={DetailsCell}
          />
          <GridColumn
            field="targetType"
            title="Target Type"
            width="120px"
          />
        </Grid>
      </div>
    </RoleGuard>
  );
};

export default AuditLogViewer;
