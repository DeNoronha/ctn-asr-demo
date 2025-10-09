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
import { 
  filterBy, 
  orderBy, 
  SortDescriptor, 
  CompositeFilterDescriptor 
} from '@progress/kendo-data-query';
import { Member } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
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

    switch (action) {
      case 'export':
        notification.showInfo(`Exporting ${selectedIds.length} selected members...`);
        break;
      case 'token':
        notification.showInfo(`Issuing tokens for ${selectedIds.length} members...`);
        break;
      case 'delete':
        notification.showWarning(`Delete action for ${selectedIds.length} members (not implemented)`);
        break;
    }
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
    { text: 'Export Selected', icon: 'file-excel', click: () => handleBulkAction('export') },
    { text: 'Issue Tokens', icon: 'key', click: () => handleBulkAction('token') },
    { text: 'Delete Selected', icon: 'trash', click: () => handleBulkAction('delete') },
  ];

  return (
    <div className="members-grid-container">
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
                  themeColor="primary"
                  fillMode="outline"
                  onClick={handleExcelExport}
                  icon="file-excel"
                >
                  Export to Excel
                </Button>
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
