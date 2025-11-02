import { Button, TextInput, Menu } from '@mantine/core';
import { Modal, Group } from '@mantine/core';
import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  type MRT_SortingState,
  type MRT_ColumnFiltersState,
  type MRT_RowSelectionState,
  useMantineReactTable,
} from 'mantine-react-table';
import React, { useEffect, useRef, useState, useMemo } from 'react';
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
    enableFilterPersistence: true,
    resetPageOnFilterChange: false,
  });

  const [gridData, setGridData] = useState<Member[]>(members);
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

  }, []);

  // Save grid state to localStorage
  const saveGridState = () => {
    localStorage.setItem('gridColumns', JSON.stringify(columns));
  };

  // Update total when totalMembers prop changes
  useEffect(() => {
    setTotal(totalMembers || members.length);
  }, [totalMembers, members.length]);

  // Update grid data when members change
  useEffect(() => {
    setGridData(members);
  }, [members]);

  // Trigger data load when page/pageSize changes
  useEffect(() => {
    if (onPageChange) {
      onPageChange(page, pageSize);
    }
  }, [page, pageSize, onPageChange]);

  // Guard: if current page exceeds max pages after data/total change, snap to last page
  useEffect(() => {
    if (!onPageChange) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) {
      updatePage(maxPage);
    }
  }, [total, pageSize, page, onPageChange, updatePage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    setGlobalFilter(value);
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
    localStorage.removeItem('gridColumns');
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

  const handleAdvancedFilterApply = (advancedFilter: any) => {
    // TODO: Implement advanced filter with Mantine column filters
    setSearchValue(''); // Clear simple search when applying advanced filter
    notification.showSuccess('Advanced filters applied');
  };

  const handleAdvancedFilterClear = () => {
    // TODO: Implement advanced filter clear with Mantine column filters
    setGlobalFilter('');
    setColumnFilters([]);
    notification.showInfo('Filters cleared');
  };

  // Mantine React Table state
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: page - 1,
    pageSize: pageSize,
  });
  const [sorting, setSorting] = useState<MRT_SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState<string>('');

  // Sync pagination with useGridState hook
  useEffect(() => {
    setPagination({ pageIndex: page - 1, pageSize });
  }, [page, pageSize]);

  // Sync row selection with selectedIds
  useEffect(() => {
    const selection: MRT_RowSelectionState = {};
    selectedIds.forEach(id => {
      const index = gridData.findIndex(m => m.org_id === id);
      if (index >= 0) selection[index] = true;
    });
    setRowSelection(selection);
  }, [selectedIds, gridData]);

  // Mantine React Table column definitions
  const mantineColumns = useMemo<MRT_ColumnDef<Member>[]>(() => {
    const statusTooltips: Record<string, string> = {
      ACTIVE: 'Member is active and in good standing',
      PENDING: 'Membership application pending approval',
      SUSPENDED: 'Member temporarily suspended - access restricted',
      TERMINATED: 'Membership terminated - no longer active',
      FLAGGED: 'Member flagged for review'
    };

    const membershipTooltips: Record<string, string> = {
      PREMIUM: 'Premium membership - full access to all services and priority support',
      FULL: 'Full membership - access to all standard services',
      BASIC: 'Basic membership - limited access to essential services'
    };

    const visibleColumns = columns.filter(col => col.show);

    return visibleColumns.map(col => {
      const baseColumn: MRT_ColumnDef<Member> = {
        accessorKey: col.field as any,
        header: getColumnTitle(col.field),
        size: col.width ? parseInt(col.width) : 150,
      };

      // Add custom cell renderers based on field type
      if (col.field === 'status') {
        baseColumn.Cell = ({ row }) => (
          <div>
            <span
              className="status-badge"
              style={{ backgroundColor: getStatusColor(row.original.status) }}
              title={statusTooltips[row.original.status] || 'Member status'}
              role="status"
              aria-label={`Status: ${row.original.status}`}
            >
              {row.original.status}
            </span>
          </div>
        );
      } else if (col.field === 'membership_level') {
        baseColumn.Cell = ({ row }) => (
          <div>
            <span
              className="membership-badge"
              style={{ backgroundColor: getMembershipColor(row.original.membership_level) }}
              title={membershipTooltips[row.original.membership_level] || 'Membership level'}
              role="status"
              aria-label={`Membership: ${row.original.membership_level}`}
            >
              {row.original.membership_level}
            </span>
          </div>
        );
      } else if (col.field === 'created_at') {
        baseColumn.Cell = ({ cell }) => {
          const value = cell.getValue<string>();
          return <div>{new Date(value).toLocaleDateString()}</div>;
        };
      } else if (col.field === 'legal_name' || col.field === 'domain') {
        // SEC-007: Sanitize user-generated text fields
        baseColumn.Cell = ({ cell }) => {
          const value = cell.getValue<string>();
          return <div dangerouslySetInnerHTML={{ __html: sanitizeGridCell(value) }} />;
        };
      }

      return baseColumn;
    });
  }, [columns]);

  // Mantine React Table instance
  const table = useMantineReactTable({
    columns: mantineColumns,
    data: gridData,
    enableRowSelection: true,
    enableColumnResizing: true,
    enableSorting: !onPageChange, // Disable client-side sorting if server-side pagination
    enableColumnFilters: !onPageChange, // Disable client-side filtering if server-side
    enableGlobalFilter: !onPageChange, // Enable global filter for client-side only
    enablePagination: true,
    manualPagination: !!onPageChange, // Use manual pagination if server-side
    pageCount: onPageChange ? Math.ceil(total / pageSize) : undefined,
    state: {
      pagination,
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    mantineTableProps: {
      striped: true,
      style: { height: '600px' },
    },
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => onViewDetails(row.original),
      style: { cursor: 'pointer' },
    }),
    renderTopToolbarCustomActions: () => (
      <div className="grid-toolbar">
        <div className="toolbar-left">
          {!onPageChange && (
            <>
              <TextInput
                value={searchValue}
                onChange={handleSearchChange}
                placeholder={t('members.searchMembers')}
                style={{ width: '300px' }}
              />
              <Button
                color="blue"
                variant={showAdvancedFilter ? 'filled' : 'outline'}
                onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
              >
                {showAdvancedFilter ? t('common.hide', 'Hide') : t('common.advanced', 'Advanced')}{' '}
                {t('common.filter')}
              </Button>
            </>
          )}
          <Menu>
            <Menu.Target>
              <Button variant="outline" color="blue">
                {t('common.export')}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {exportMenuItems.map((item, index) => (
                <Menu.Item key={index} onClick={item.click}>
                  {item.text}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
          {Object.keys(rowSelection).length > 0 && (
            <Menu>
              <Menu.Target>
                <Button color="cyan">
                  {`${t('members.bulkActions')} (${Object.keys(rowSelection).length})`}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {bulkActions.map((item, index) => (
                  <Menu.Item key={index} onClick={item.click}>
                    {item.text}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
        </div>
        <div className="toolbar-right">
          <Menu>
            <Menu.Target>
              <Button variant="outline">{t('common.columns')}</Button>
            </Menu.Target>
            <Menu.Dropdown>
              {columnMenuItems.map((item, index) => (
                <Menu.Item key={index} onClick={item.click}>
                  {item.icon && '✓ '}{item.text}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </div>
      </div>
    ),
  });

  // Sync row selection changes back to selectedIds
  useEffect(() => {
    const selected = Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(key => gridData[parseInt(key)]?.org_id)
      .filter(Boolean);
    if (JSON.stringify(selected) !== JSON.stringify(selectedIds)) {
      setSelectedIds(selected);
    }
  }, [rowSelection, gridData]);

  // Handle pagination changes
  useEffect(() => {
    if (onPageChange && pagination.pageIndex !== page - 1) {
      updatePage(pagination.pageIndex + 1);
      onPageChange(pagination.pageIndex + 1, pagination.pageSize);
    }
    if (pagination.pageSize !== pageSize) {
      updatePageSize(pagination.pageSize);
    }
  }, [pagination]);

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
      <Modal
        opened={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        title="Confirm Bulk Action"
        size="md"
      >
        <p style={{ margin: '20px', fontSize: '16px' }}>{getBulkActionConfirmation()}</p>
        <Group mt="xl" justify="flex-end">
          <Button onClick={() => setShowBulkDialog(false)} variant="default">Cancel</Button>
          <Button color="blue" onClick={executeBulkAction} disabled={isBulkProcessing}>
            {isBulkProcessing ? 'Processing...' : 'Confirm'}
          </Button>
        </Group>
      </Modal>

      <MantineReactTable table={table} />
    </div>
  );
};

export default MembersGrid;
