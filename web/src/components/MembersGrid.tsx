import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  GridColumn,
  GridToolbar,
  GridColumnMenuFilter,
  GridColumnMenuSort,
  GridColumnMenuCheckboxFilter
} from '@progress/kendo-react-grid';
import { ExcelExport } from '@progress/kendo-react-excel-export';
import { Input } from '@progress/kendo-react-inputs';
import { Button } from '@progress/kendo-react-buttons';
import { DropDownButton } from '@progress/kendo-react-buttons';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import {
  filterBy,
  orderBy,
  SortDescriptor,
  CompositeFilterDescriptor
} from '@progress/kendo-data-query';
import { Member } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import AdvancedFilter from './AdvancedFilter';
import { exportToPDF, exportToCSV, performBulkOperation, formatBulkOperationSummary } from '../utils/exportUtils';
import './MembersGrid.css';

interface MembersGridProps {
  members: Member[];
  onIssueToken: (orgId: string) => void;
  onViewDetails: (member: Member) => void;
  loading?: boolean;
}

interface ColumnSettings {
  field: string;
  title: string;
  show: boolean;
  width?: string;
  orderIndex: number;
}

const MembersGrid: React.FC<MembersGridProps> = ({ members, onIssueToken, onViewDetails, loading = false }) => {
  const notification = useNotification();
  const [gridData, setGridData] = useState<Member[]>(members);
  const [sort, setSort] = useState<SortDescriptor[]>([]);
  const [filter, setFilter] = useState<CompositeFilterDescriptor>({
    logic: 'and',
    filters: []
  });
  const [searchValue, setSearchValue] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const excelExportRef = useRef<ExcelExport | null>(null);

  // Column visibility state
  const [columns, setColumns] = useState<ColumnSettings[]>([
    { field: 'legal_name', title: 'Legal Name', show: true, width: '200px', orderIndex: 0 },
    { field: 'org_id', title: 'Organization ID', show: true, width: '180px', orderIndex: 1 },
    { field: 'domain', title: 'Domain', show: true, width: '150px', orderIndex: 2 },
    { field: 'status', title: 'Status', show: true, width: '120px', orderIndex: 3 },
    { field: 'membership_level', title: 'Membership', show: true, width: '120px', orderIndex: 4 },
    { field: 'lei', title: 'LEI', show: true, width: '150px', orderIndex: 5 },
    { field: 'kvk', title: 'KVK', show: true, width: '120px', orderIndex: 6 },
    { field: 'created_at', title: 'Joined', show: true, width: '120px', orderIndex: 7 },
  ]);

  // Load saved grid state from localStorage
  useEffect(() => {
    const savedColumns = localStorage.getItem('gridColumns');
    const savedSort = localStorage.getItem('gridSort');
    
    if (savedColumns) {
      try {
        setColumns(JSON.parse(savedColumns));
      } catch (e) {
        console.error('Failed to load column settings', e);
      }
    }
    
    if (savedSort) {
      try {
        setSort(JSON.parse(savedSort));
      } catch (e) {
        console.error('Failed to load sort settings', e);
      }
    }
  }, []);

  // Save grid state to localStorage
  const saveGridState = () => {
    localStorage.setItem('gridColumns', JSON.stringify(columns));
    localStorage.setItem('gridSort', JSON.stringify(sort));
  };

  useEffect(() => {
    let data = [...members];
    
    if (filter.filters.length > 0) {
      data = filterBy(data, filter);
    }
    
    if (sort.length > 0) {
      data = orderBy(data, sort);
    }
    
    setGridData(data);
  }, [members, filter, sort]);

  const handleSearchChange = (e: any) => {
    const value = e.target.value;
    setSearchValue(value);

    if (value) {
      setFilter({
        logic: 'or',
        filters: [
          { field: 'legal_name', operator: 'contains', value },
          { field: 'org_id', operator: 'contains', value },
          { field: 'domain', operator: 'contains', value },
          { field: 'lei', operator: 'contains', value },
          { field: 'kvk', operator: 'contains', value },
        ]
      });
    } else {
      setFilter({ logic: 'and', filters: [] });
    }
  };

  const handleSortChange = (e: any) => {
    setSort(e.sort);
    saveGridState();
  };

  const handleExcelExport = () => {
    if (excelExportRef.current) {
      excelExportRef.current.save();
      notification.showSuccess(`Exported ${gridData.length} members to Excel`);
    }
  };

  const toggleColumn = (field: string) => {
    const updatedColumns = columns.map(col => 
      col.field === field ? { ...col, show: !col.show } : col
    );
    setColumns(updatedColumns);
    saveGridState();
    notification.showInfo(`Column "${columns.find(c => c.field === field)?.title}" ${updatedColumns.find(c => c.field === field)?.show ? 'shown' : 'hidden'}`);
  };

  const resetColumns = () => {
    const defaultColumns: ColumnSettings[] = [
      { field: 'legal_name', title: 'Legal Name', show: true, width: '200px', orderIndex: 0 },
      { field: 'org_id', title: 'Organization ID', show: true, width: '180px', orderIndex: 1 },
      { field: 'domain', title: 'Domain', show: true, width: '150px', orderIndex: 2 },
      { field: 'status', title: 'Status', show: true, width: '120px', orderIndex: 3 },
      { field: 'membership_level', title: 'Membership', show: true, width: '120px', orderIndex: 4 },
      { field: 'lei', title: 'LEI', show: true, width: '150px', orderIndex: 5 },
      { field: 'kvk', title: 'KVK', show: true, width: '120px', orderIndex: 6 },
      { field: 'created_at', title: 'Joined', show: true, width: '120px', orderIndex: 7 },
    ];
    setColumns(defaultColumns);
    setSort([]);
    localStorage.removeItem('gridColumns');
    localStorage.removeItem('gridSort');
    notification.showSuccess('Grid layout reset to defaults');
  };

  // Selection handlers
  const handleSelectAll = (e: any) => {
    if (e.target.checked) {
      setSelectedIds(gridData.map(m => m.org_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (orgId: string) => {
    if (selectedIds.includes(orgId)) {
      setSelectedIds(selectedIds.filter(id => id !== orgId));
    } else {
      setSelectedIds([...selectedIds, orgId]);
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedIds.length === 0) {
      notification.showWarning('Please select members first');
      return;
    }

    setBulkAction(action);
    setShowBulkDialog(true);
  };

  const executeBulkAction = async () => {
    setIsBulkProcessing(true);

    try {
      const selectedMembers = gridData.filter(m => selectedIds.includes(m.org_id));

      switch (bulkAction) {
        case 'export-pdf':
          const pdfFileName = exportToPDF(selectedMembers, {
            title: `CTN Members Export (${selectedIds.length} records)`,
            orientation: 'landscape',
            includeTimestamp: true
          });
          notification.showSuccess(`Exported ${selectedIds.length} members to ${pdfFileName}`);
          break;

        case 'export-csv':
          exportToCSV(selectedMembers, `CTN_Members_${new Date().toISOString().split('T')[0]}.csv`);
          notification.showSuccess(`Exported ${selectedIds.length} members to CSV`);
          break;

        case 'token':
          const tokenResult = await performBulkOperation(
            selectedIds,
            'token',
            async (id) => {
              await onIssueToken(id);
              return Promise.resolve();
            }
          );
          notification.showSuccess(formatBulkOperationSummary(tokenResult, 'token issuance'));

          if (tokenResult.errors.length > 0) {
            console.error('Token issuance errors:', tokenResult.errors);
          }
          break;

        case 'suspend':
          notification.showInfo(`Suspend action for ${selectedIds.length} members (requires API implementation)`);
          break;

        case 'delete':
          notification.showWarning(`Delete action for ${selectedIds.length} members (requires API implementation)`);
          break;
      }

      setSelectedIds([]);
    } catch (error: any) {
      notification.showError(`Bulk action failed: ${error.message}`);
    } finally {
      setIsBulkProcessing(false);
      setShowBulkDialog(false);
    }
  };

  const handlePDFExport = () => {
    const dataToExport = selectedIds.length > 0
      ? gridData.filter(m => selectedIds.includes(m.org_id))
      : gridData;

    const fileName = exportToPDF(dataToExport, {
      title: selectedIds.length > 0
        ? `CTN Members Export (${selectedIds.length} selected)`
        : `CTN Members Export (All ${gridData.length} records)`,
      orientation: 'landscape',
      includeTimestamp: true
    });

    notification.showSuccess(`Exported to ${fileName}`);
  };

  const handleCSVExport = () => {
    const dataToExport = selectedIds.length > 0
      ? gridData.filter(m => selectedIds.includes(m.org_id))
      : gridData;

    exportToCSV(dataToExport);
    notification.showSuccess(`Exported ${dataToExport.length} members to CSV`);
  };

  const handleAdvancedFilterApply = (advancedFilter: CompositeFilterDescriptor) => {
    setFilter(advancedFilter);
    setSearchValue(''); // Clear simple search when applying advanced filter
    notification.showSuccess('Advanced filters applied');
  };

  const handleAdvancedFilterClear = () => {
    setFilter({ logic: 'and', filters: [] });
    notification.showInfo('Filters cleared');
  };

  // Column menu
  const ColumnMenu = (props: any) => {
    return (
      <div>
        <GridColumnMenuSort {...props} />
        <GridColumnMenuFilter {...props} />
      </div>
    );
  };

  const StatusCell = (props: any) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'ACTIVE': return '#10b981';
        case 'PENDING': return '#f59e0b';
        case 'SUSPENDED': return '#ef4444';
        default: return '#6b7280';
      }
    };

    return (
      <td>
        <span
          className="status-badge"
          style={{ backgroundColor: getStatusColor(props.dataItem.status) }}
        >
          {props.dataItem.status}
        </span>
      </td>
    );
  };

  const MembershipCell = (props: any) => {
    const getMembershipColor = (level: string) => {
      switch (level) {
        case 'PREMIUM': return '#8b5cf6';
        case 'FULL': return '#3b82f6';
        case 'BASIC': return '#6b7280';
        default: return '#9ca3af';
      }
    };

    return (
      <td>
        <span
          className="membership-badge"
          style={{ backgroundColor: getMembershipColor(props.dataItem.membership_level) }}
        >
          {props.dataItem.membership_level}
        </span>
      </td>
    );
  };

  const DateCell = (props: any) => {
    return (
      <td>
        {new Date(props.dataItem[props.field || '']).toLocaleDateString()}
      </td>
    );
  };

  const SelectionCell = (props: any) => {
    const isSelected = selectedIds.includes(props.dataItem.org_id);
    return (
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => handleSelectRow(props.dataItem.org_id)}
        />
      </td>
    );
  };

  const SelectionHeaderCell = () => {
    const allSelected = gridData.length > 0 && selectedIds.length === gridData.length;
    return (
      <th>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={handleSelectAll}
        />
      </th>
    );
  };

  const ActionCell = (props: any) => {
    const isActive = props.dataItem.status === 'ACTIVE';
    
    return (
      <td>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="small"
            onClick={() => onViewDetails(props.dataItem)}
          >
            View
          </Button>
          <Button
            themeColor="primary"
            size="small"
            disabled={!isActive}
            onClick={() => onIssueToken(props.dataItem.org_id)}
          >
            Token
          </Button>
        </div>
      </td>
    );
  };

  const columnMenuItems = columns.map(col => ({
    text: col.title,
    icon: col.show ? 'check' : '',
    click: () => toggleColumn(col.field)
  }));

  const bulkActions = [
    { text: 'Export to PDF', icon: 'file-pdf', click: () => handleBulkAction('export-pdf') },
    { text: 'Export to CSV', icon: 'file-txt', click: () => handleBulkAction('export-csv') },
    { text: 'Issue Tokens', icon: 'key', click: () => handleBulkAction('token') },
    { text: 'Suspend Selected', icon: 'pause', click: () => handleBulkAction('suspend') },
    { text: 'Delete Selected', icon: 'trash', click: () => handleBulkAction('delete') },
  ];

  const exportMenuItems = [
    { text: 'Export to Excel', icon: 'file-excel', click: handleExcelExport },
    { text: 'Export to PDF', icon: 'file-pdf', click: handlePDFExport },
    { text: 'Export to CSV', icon: 'file-txt', click: handleCSVExport },
  ];

  const getBulkActionConfirmation = () => {
    switch (bulkAction) {
      case 'export-pdf':
        return `Export ${selectedIds.length} members to PDF?`;
      case 'export-csv':
        return `Export ${selectedIds.length} members to CSV?`;
      case 'token':
        return `Issue tokens for ${selectedIds.length} members? This action will generate new BVAD tokens.`;
      case 'suspend':
        return `Suspend ${selectedIds.length} members? They will lose access to CTN services.`;
      case 'delete':
        return `Delete ${selectedIds.length} members? This action cannot be undone!`;
      default:
        return `Perform action on ${selectedIds.length} members?`;
    }
  };

  return (
    <div className="members-grid-container">
      {/* Advanced Filter Panel */}
      {showAdvancedFilter && (
        <AdvancedFilter
          onApply={handleAdvancedFilterApply}
          onClear={handleAdvancedFilterClear}
        />
      )}

      {/* Bulk Action Confirmation Dialog */}
      {showBulkDialog && (
        <Dialog
          title="Confirm Bulk Action"
          onClose={() => setShowBulkDialog(false)}
          width={500}
        >
          <p style={{ margin: '20px', fontSize: '16px' }}>
            {getBulkActionConfirmation()}
          </p>
          <DialogActionsBar>
            <Button onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button
              themeColor="primary"
              onClick={executeBulkAction}
              disabled={isBulkProcessing}
            >
              {isBulkProcessing ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogActionsBar>
        </Dialog>
      )}

      <ExcelExport
        data={selectedIds.length > 0 ? gridData.filter(m => selectedIds.includes(m.org_id)) : gridData}
        fileName="CTN_Members.xlsx"
        ref={excelExportRef}
      >
        <Grid
          data={gridData}
          sortable={true}
          sort={sort}
          onSortChange={handleSortChange}
          filterable={true}
          filter={filter}
          onFilterChange={(e) => setFilter(e.filter)}
          pageable={true}
          pageSize={10}
          style={{ height: '600px' }}
          resizable={true}
        >
          <GridToolbar>
            <div className="grid-toolbar">
              <div className="toolbar-left">
                <Input
                  value={searchValue}
                  onChange={handleSearchChange}
                  placeholder="Search members..."
                  style={{ width: '300px' }}
                />
                <Button
                  themeColor={showAdvancedFilter ? 'primary' : 'base'}
                  fillMode={showAdvancedFilter ? 'solid' : 'outline'}
                  onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                  icon="filter"
                >
                  {showAdvancedFilter ? 'Hide' : 'Advanced'} Filters
                </Button>
                <DropDownButton
                  text="Export"
                  icon="download"
                  items={exportMenuItems}
                  themeColor="primary"
                  fillMode="outline"
                />
                {selectedIds.length > 0 && (
                  <DropDownButton
                    text={`Bulk Actions (${selectedIds.length})`}
                    items={bulkActions}
                    themeColor="info"
                  />
                )}
                <DropDownButton
                  text="Columns"
                  icon="columns"
                  items={columnMenuItems}
                />
                <Button
                  fillMode="flat"
                  onClick={resetColumns}
                  title="Reset layout"
                >
                  Reset Layout
                </Button>
              </div>
              <div className="toolbar-stats">
                <span>Total: {members.length}</span>
                <span>Showing: {gridData.length}</span>
                {selectedIds.length > 0 && <span>Selected: {selectedIds.length}</span>}
              </div>
            </div>
          </GridToolbar>
          
          <GridColumn 
            field="selected" 
            width="50px" 
            cell={SelectionCell}
            headerCell={SelectionHeaderCell}
            sortable={false}
            filterable={false}
          />
          
          {columns.filter(col => col.show).map(col => {
            const columnProps: any = {
              key: col.field,
              field: col.field,
              title: col.title,
              width: col.width,
              columnMenu: ColumnMenu,
            };

            if (col.field === 'status') {
              columnProps.cell = StatusCell;
            } else if (col.field === 'membership_level') {
              columnProps.cell = MembershipCell;
            } else if (col.field === 'created_at') {
              columnProps.cell = DateCell;
              columnProps.filter = 'date';
            }

            return <GridColumn {...columnProps} />;
          })}
          
          <GridColumn 
            title="Actions" 
            width="180px" 
            cell={ActionCell}
            sortable={false}
            filterable={false}
          />
        </Grid>
      </ExcelExport>
    </div>
  );
};

export default MembersGrid;
