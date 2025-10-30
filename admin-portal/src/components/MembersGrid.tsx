import {
  type CompositeFilterDescriptor,
  type SortDescriptor,
  filterBy,
  orderBy,
} from '@progress/kendo-data-query';
import { Button } from '@progress/kendo-react-buttons';
import { DropDownButton } from '@progress/kendo-react-buttons';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
// TEMPORARILY DISABLED: Excel export causes react-dom/server Node.js build issues
// import { ExcelExport } from '@progress/kendo-react-excel-export';
import {
  Grid,
  type GridCellProps,
  type GridPageChangeEvent,
  type GridSortChangeEvent,
  GridColumn,
  GridColumnMenuCheckboxFilter,
  GridColumnMenuFilter,
  GridColumnMenuSort,
  GridToolbar,
} from '@progress/kendo-react-grid';
import { Input, type InputChangeEvent } from '@progress/kendo-react-inputs';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../contexts/NotificationContext';
import { useGridState } from '../hooks/useGridState';
import { useApiError } from '../hooks/useApiError';
import type { Member } from '../services/api';
import {
  exportToCSV,
  exportToPDF,
  formatBulkOperationSummary,
  performBulkOperation,
} from '../utils/exportUtils';
import { sanitizeGridCell } from '../utils/sanitize';
import { getStatusColor, getMembershipColor } from '../utils/colors';
import { getGridActionLabel } from '../utils/aria';
import { Eye, Pencil } from './icons';
import AdvancedFilter from './AdvancedFilter';
import './MembersGrid.css';

interface MembersGridProps {
  members: Member[];
  totalMembers?: number;
  onViewDetails: (member: Member) => void;
  onPageChange?: (page: number, pageSize: number) => void;
  loading?: boolean;
}

interface ColumnSettings {
  field: string;
  title: string;
  show: boolean;
  width?: string;
  orderIndex: number;
}

const MembersGrid: React.FC<MembersGridProps> = ({
  members,
  totalMembers,
  onViewDetails,
  onPageChange,
  loading = false,
}) => {
  const { t } = useTranslation();
  const notification = useNotification();
  const { handleError } = useApiError();

  // Use grid state hook for URL-based pagination persistence
  const { page, pageSize, skip, updatePage, updatePageSize } = useGridState('members-grid', {
    defaultPage: 1,
    defaultPageSize: 20,
  });

  const [gridData, setGridData] = useState<Member[]>(members);
  const [sort, setSort] = useState<SortDescriptor[]>([]);
  const [filter, setFilter] = useState<CompositeFilterDescriptor>({
    logic: 'and',
    filters: [],
  });
  const [searchValue, setSearchValue] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  // TEMPORARILY DISABLED
  // const excelExportRef = useRef<ExcelExport | null>(null);
  const [total, setTotal] = useState(totalMembers || members.length);

  // Column visibility state - Default shows: Legal Name, Status, LEI, EUID, KVK, Member Since, Actions
  const [columns, setColumns] = useState<ColumnSettings[]>([
    { field: 'legal_name', title: 'Legal Name', show: true, width: '200px', orderIndex: 0 },
    { field: 'status', title: 'Status', show: true, width: '120px', orderIndex: 1 },
    { field: 'lei', title: 'LEI', show: true, width: '150px', orderIndex: 2 },
    { field: 'euid', title: 'EUID', show: true, width: '150px', orderIndex: 3 },
    { field: 'kvk', title: 'KVK', show: true, width: '120px', orderIndex: 4 },
    { field: 'created_at', title: 'Member Since', show: true, width: '140px', orderIndex: 5 },
    { field: 'org_id', title: 'Organization ID', show: false, width: '180px', orderIndex: 6 },
    { field: 'domain', title: 'Domain', show: false, width: '150px', orderIndex: 7 },
    { field: 'membership_level', title: 'Membership', show: false, width: '120px', orderIndex: 8 },
  ]);

  // Helper function to get translated column title
  const getColumnTitle = (field: string) => {
    const titleMap: Record<string, string> = {
      legal_name: t('members.legalName'),
      status: t('common.status'),
      lei: 'LEI',
      euid: 'EUID',
      kvk: 'KVK',
      org_id: t('members.orgId', 'Organization ID'),
      domain: t('members.domain', 'Domain'),
      membership_level: t('members.membership', 'Membership'),
      created_at: t('members.memberSince', 'Member Since'),
    };
    return titleMap[field] || field;
  };

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

  // Update total when totalMembers prop changes
  useEffect(() => {
    setTotal(totalMembers || members.length);
  }, [totalMembers, members.length]);

  // Update grid data when members change
  useEffect(() => {
    let data = [...members];

    // Only apply client-side filtering/sorting if no server-side pagination
    if (!onPageChange) {
      if (filter.filters.length > 0) {
        data = filterBy(data, filter);
      }

      if (sort.length > 0) {
        data = orderBy(data, sort);
      }
    }

    setGridData(data);
  }, [members, filter, sort, onPageChange]);

  // Trigger data load when page/pageSize changes
  useEffect(() => {
    if (onPageChange) {
      onPageChange(page, pageSize);
    }
  }, [page, pageSize, onPageChange]);

  // Page change handler for server-side pagination
  const handlePageChange = (event: GridPageChangeEvent) => {
    const newSkip = event.page.skip;
    const newTake = event.page.take;

    // Calculate new page number (1-based)
    const newPage = Math.floor(newSkip / newTake) + 1;

    // Update page size if it changed
    if (newTake !== pageSize) {
      updatePageSize(newTake);
    } else if (newPage !== page) {
      // Only update page if pageSize didn't change (to avoid double API call)
      updatePage(newPage);
    }
  };

  const handleSearchChange = (e: InputChangeEvent) => {
    const value = e.value;
    setSearchValue(value);

    if (value) {
      setFilter({
        logic: 'or',
        filters: [
          { field: 'legal_name', operator: 'contains', value },
          { field: 'org_id', operator: 'contains', value },
          { field: 'domain', operator: 'contains', value },
          { field: 'lei', operator: 'contains', value },
          { field: 'euid', operator: 'contains', value },
          { field: 'kvk', operator: 'contains', value },
        ],
      });
    } else {
      setFilter({ logic: 'and', filters: [] });
    }
  };

  const handleSortChange = (e: GridSortChangeEvent) => {
    setSort(e.sort);
    saveGridState();
  };

  // TEMPORARILY DISABLED
  const handleExcelExport = () => {
    alert('Excel export temporarily disabled');
    // notification.showInfo('Excel export temporarily disabled');
    // if (excelExportRef.current) {
    //   excelExportRef.current.save();
    //   notification.showSuccess(`Exported ${gridData.length} members to Excel`);
    // }
  };

  const toggleColumn = (field: string) => {
    const updatedColumns = columns.map((col) =>
      col.field === field ? { ...col, show: !col.show } : col
    );
    setColumns(updatedColumns);
    saveGridState();
    notification.showInfo(
      `Column "${columns.find((c) => c.field === field)?.title}" ${updatedColumns.find((c) => c.field === field)?.show ? 'shown' : 'hidden'}`
    );
  };

  const resetColumns = () => {
    const defaultColumns: ColumnSettings[] = [
      { field: 'legal_name', title: 'Legal Name', show: true, width: '200px', orderIndex: 0 },
      { field: 'status', title: 'Status', show: true, width: '120px', orderIndex: 1 },
      { field: 'lei', title: 'LEI', show: true, width: '150px', orderIndex: 2 },
      { field: 'euid', title: 'EUID', show: true, width: '150px', orderIndex: 3 },
      { field: 'kvk', title: 'KVK', show: true, width: '120px', orderIndex: 4 },
      { field: 'created_at', title: 'Member Since', show: true, width: '140px', orderIndex: 5 },
      { field: 'org_id', title: 'Organization ID', show: false, width: '180px', orderIndex: 6 },
      { field: 'domain', title: 'Domain', show: false, width: '150px', orderIndex: 7 },
      {
        field: 'membership_level',
        title: 'Membership',
        show: false,
        width: '120px',
        orderIndex: 8,
      },
    ];
    setColumns(defaultColumns);
    setSort([]);
    localStorage.removeItem('gridColumns');
    localStorage.removeItem('gridSort');
    notification.showSuccess('Grid layout reset to defaults');
  };

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(gridData.map((m) => m.org_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (orgId: string) => {
    if (selectedIds.includes(orgId)) {
      setSelectedIds(selectedIds.filter((id) => id !== orgId));
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
      const selectedMembers = gridData.filter((m) => selectedIds.includes(m.org_id));

      switch (bulkAction) {
        case 'export-pdf': {
          const pdfFileName = exportToPDF(selectedMembers, {
            title: `CTN Members Export (${selectedIds.length} records)`,
            orientation: 'landscape',
            includeTimestamp: true,
          });
          notification.showSuccess(`Exported ${selectedIds.length} members to ${pdfFileName}`);
          break;
        }

        case 'export-csv':
          exportToCSV(selectedMembers, `CTN_Members_${new Date().toISOString().split('T')[0]}.csv`);
          notification.showSuccess(`Exported ${selectedIds.length} members to CSV`);
          break;

        case 'suspend':
          notification.showInfo(
            `Suspend action for ${selectedIds.length} members (requires API implementation)`
          );
          break;

        case 'delete':
          notification.showWarning(
            `Delete action for ${selectedIds.length} members (requires API implementation)`
          );
          break;
      }

      setSelectedIds([]);
    } catch (error: unknown) {
      handleError(error, 'performing bulk action');
    } finally {
      setIsBulkProcessing(false);
      setShowBulkDialog(false);
    }
  };

  const handlePDFExport = () => {
    const dataToExport =
      selectedIds.length > 0 ? gridData.filter((m) => selectedIds.includes(m.org_id)) : gridData;

    const fileName = exportToPDF(dataToExport, {
      title:
        selectedIds.length > 0
          ? `CTN Members Export (${selectedIds.length} selected)`
          : `CTN Members Export (All ${gridData.length} records)`,
      orientation: 'landscape',
      includeTimestamp: true,
    });

    notification.showSuccess(`Exported to ${fileName}`);
  };

  const handleCSVExport = () => {
    const dataToExport =
      selectedIds.length > 0 ? gridData.filter((m) => selectedIds.includes(m.org_id)) : gridData;

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

  const StatusCell = (props: GridCellProps) => {
    const statusTooltips: Record<string, string> = {
      ACTIVE: 'Member is active and in good standing',
      PENDING: 'Membership application pending approval',
      SUSPENDED: 'Member temporarily suspended - access restricted',
      TERMINATED: 'Membership terminated - no longer active',
      FLAGGED: 'Member flagged for review'
    };

    return (
      <td>
        <span
          className="status-badge"
          style={{ backgroundColor: getStatusColor(props.dataItem.status) }}
          title={statusTooltips[props.dataItem.status] || 'Member status'}
          role="status"
          aria-label={`Status: ${props.dataItem.status}`}
        >
          {props.dataItem.status}
        </span>
      </td>
    );
  };

  const MembershipCell = (props: GridCellProps) => {
    const membershipTooltips: Record<string, string> = {
      PREMIUM: 'Premium membership - full access to all services and priority support',
      FULL: 'Full membership - access to all standard services',
      BASIC: 'Basic membership - limited access to essential services'
    };

    return (
      <td>
        <span
          className="membership-badge"
          style={{ backgroundColor: getMembershipColor(props.dataItem.membership_level) }}
          title={membershipTooltips[props.dataItem.membership_level] || 'Membership level'}
          role="status"
          aria-label={`Membership: ${props.dataItem.membership_level}`}
        >
          {props.dataItem.membership_level}
        </span>
      </td>
    );
  };

  const DateCell = (props: GridCellProps) => {
    return <td>{new Date(props.dataItem[props.field || '']).toLocaleDateString()}</td>;
  };

  // SEC-007: Sanitize user-generated text fields in grid
  const TextCell = (props: GridCellProps) => {
    const value = props.dataItem[props.field || ''];
    return <td dangerouslySetInnerHTML={{ __html: sanitizeGridCell(value) }} />;
  };

  const SelectionCell = (props: GridCellProps) => {
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
        <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />
      </th>
    );
  };

  const ActionCell = (props: GridCellProps) => {
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent row click from also firing
      onViewDetails(props.dataItem);
    };

    return (
      <td onClick={handleClick} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Eye size={16} />
          <span style={{ fontSize: '12px' }}>View</span>
        </div>
      </td>
    );
  };

  const columnMenuItems = columns.map((col) => ({
    text: col.title,
    icon: col.show ? 'check' : '',
    click: () => toggleColumn(col.field),
  }));

  const bulkActions = [
    { text: 'Export to PDF', icon: 'file-pdf', click: () => handleBulkAction('export-pdf') },
    { text: 'Export to CSV', icon: 'file-txt', click: () => handleBulkAction('export-csv') },
    { text: 'Suspend Selected', icon: 'pause', click: () => handleBulkAction('suspend') },
    { text: 'Delete Selected', icon: 'trash', click: () => handleBulkAction('delete') },
  ];

  const exportMenuItems = [
    { text: 'Export to Excel (Coming Soon)', icon: 'file-excel', click: () => {} },
    { text: 'Export to PDF', icon: 'file-pdf', click: handlePDFExport },
    { text: 'Export to CSV', icon: 'file-txt', click: handleCSVExport },
  ];

  const getBulkActionConfirmation = () => {
    switch (bulkAction) {
      case 'export-pdf':
        return `Export ${selectedIds.length} members to PDF?`;
      case 'export-csv':
        return `Export ${selectedIds.length} members to CSV?`;
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
        <AdvancedFilter onApply={handleAdvancedFilterApply} onClear={handleAdvancedFilterClear} />
      )}

      {/* Bulk Action Confirmation Dialog */}
      {showBulkDialog && (
        <Dialog title="Confirm Bulk Action" onClose={() => setShowBulkDialog(false)} width={500}>
          <p style={{ margin: '20px', fontSize: '16px' }}>{getBulkActionConfirmation()}</p>
          <DialogActionsBar>
            <Button onClick={() => setShowBulkDialog(false)}>Cancel</Button>
            <Button themeColor="primary" onClick={executeBulkAction} disabled={isBulkProcessing}>
              {isBulkProcessing ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogActionsBar>
        </Dialog>
      )}

      {/* TEMP DISABLED: Excel Export */}
      {/* <ExcelExport
        data={
          selectedIds.length > 0 ? gridData.filter((m) => selectedIds.includes(m.org_id)) : gridData
        }
        fileName="CTN_Members.xlsx"
        ref={excelExportRef}
      > */}
        <Grid
          data={gridData}
          sortable={true}
          sort={sort}
          onSortChange={handleSortChange}
          filterable={!onPageChange} // Disable client-side filtering if server-side pagination enabled
          filter={filter}
          onFilterChange={(e) => setFilter(e.filter)}
          pageable={{
            buttonCount: 5,
            info: true,
            type: 'numeric',
            pageSizes: [10, 20, 50, 100],
            previousNext: true,
          }}
          skip={skip}
          take={pageSize}
          total={total}
          onPageChange={handlePageChange}
          style={{ height: '600px' }}
          resizable={true}
          onRowClick={(e) => {
            onViewDetails(e.dataItem);
          }}
        >
          <GridToolbar>
            <div className="grid-toolbar">
              <div className="toolbar-left">
                <Input
                  value={searchValue}
                  onChange={handleSearchChange}
                  placeholder={t('members.searchMembers')}
                  style={{ width: '300px' }}
                />
                <Button
                  themeColor={showAdvancedFilter ? 'primary' : 'base'}
                  fillMode={showAdvancedFilter ? 'solid' : 'outline'}
                  onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                  icon="filter"
                >
                  {showAdvancedFilter ? t('common.hide', 'Hide') : t('common.advanced', 'Advanced')}{' '}
                  {t('common.filter')}
                </Button>
                <DropDownButton
                  text={t('common.export')}
                  icon="download"
                  items={exportMenuItems}
                  themeColor="primary"
                  fillMode="outline"
                />
                {selectedIds.length > 0 && (
                  <DropDownButton
                    text={`${t('members.bulkActions')} (${selectedIds.length})`}
                    items={bulkActions}
                    themeColor="info"
                  />
                )}
                <DropDownButton
                  text={t('grid.columns', 'Columns')}
                  icon="columns"
                  items={columnMenuItems}
                />
                <Button
                  fillMode="flat"
                  onClick={resetColumns}
                  title={t('grid.resetLayout', 'Reset layout')}
                >
                  {t('grid.resetLayout', 'Reset Layout')}
                </Button>
              </div>
              <div className="toolbar-stats">
                <span>
                  {t('grid.total', 'Total')}: {total}
                </span>
                <span>
                  {t('grid.showing', 'Showing')}: {gridData.length}
                </span>
                {selectedIds.length > 0 && (
                  <span>
                    {t('grid.selected', 'Selected')}: {selectedIds.length}
                  </span>
                )}
                {loading && <span className="loading-indicator">⏳ {t('common.loading')}</span>}
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

          {columns
            .filter((col) => col.show)
            .map((col) => {
              const columnProps: Partial<React.ComponentProps<typeof GridColumn>> = {
                field: col.field,
                title: getColumnTitle(col.field),
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
              } else if (col.field === 'legal_name' || col.field === 'domain') {
                // SEC-007: Sanitize user-generated text fields
                columnProps.cell = TextCell;
              }

              return <GridColumn key={col.field} {...columnProps} />;
            })}

          <GridColumn
            title={t('common.actions')}
            width="180px"
            cell={ActionCell}
            sortable={false}
            filterable={false}
          />
        </Grid>
      {/* </ExcelExport> */}
    </div>
  );
};

export default MembersGrid;
