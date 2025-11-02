import { Button, Menu, Modal, Group } from '@mantine/core';
import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  type MRT_SortingState,
  type MRT_ColumnFiltersState,
  type MRT_RowSelectionState,
  useMantineReactTable,
} from 'mantine-react-table';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../contexts/NotificationContext';
import { useGridState } from '../hooks/useGridState';
import { useApiError } from '../hooks/useApiError';
import type { Member } from '../services/api';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { sanitizeGridCell } from '../utils/sanitize';
import { getStatusColor, getMembershipColor } from '../utils/colors';
import './MembersGrid.css';

interface MembersGridProps {
  members: Member[];
  totalMembers?: number;
  onViewDetails: (member: Member) => void;
  onPageChange?: (page: number, pageSize: number) => void;
  loading?: boolean;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [total, setTotal] = useState(totalMembers || members.length);

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

  // Mantine React Table column definitions - ALL columns defined, visibility controlled by table
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

    return [
      {
        accessorKey: 'legal_name',
        header: getColumnTitle('legal_name'),
        size: 200,
        enableHiding: false, // Always visible
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          return <div dangerouslySetInnerHTML={{ __html: sanitizeGridCell(value) }} />;
        },
      },
      {
        accessorKey: 'status',
        header: getColumnTitle('status'),
        size: 120,
        Cell: ({ row }) => (
          <span
            className="status-badge"
            style={{ backgroundColor: getStatusColor(row.original.status) }}
            title={statusTooltips[row.original.status] || 'Member status'}
            role="status"
            aria-label={`Status: ${row.original.status}`}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: 'lei',
        header: 'LEI',
        size: 150,
      },
      {
        accessorKey: 'euid',
        header: 'EUID',
        size: 150,
      },
      {
        accessorKey: 'kvk',
        header: 'KVK',
        size: 120,
      },
      {
        accessorKey: 'created_at',
        header: getColumnTitle('created_at'),
        size: 140,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          return <div>{new Date(value).toLocaleDateString()}</div>;
        },
      },
      {
        accessorKey: 'org_id',
        header: getColumnTitle('org_id'),
        size: 180,
      },
      {
        accessorKey: 'domain',
        header: getColumnTitle('domain'),
        size: 150,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          return <div dangerouslySetInnerHTML={{ __html: sanitizeGridCell(value) }} />;
        },
      },
      {
        accessorKey: 'membership_level',
        header: getColumnTitle('membership_level'),
        size: 120,
        Cell: ({ row }) => (
          <span
            className="membership-badge"
            style={{ backgroundColor: getMembershipColor(row.original.membership_level) }}
            title={membershipTooltips[row.original.membership_level] || 'Membership level'}
            role="status"
            aria-label={`Membership: ${row.original.membership_level}`}
          >
            {row.original.membership_level}
          </span>
        ),
      },
    ];
  }, []);

  // Mantine React Table instance with ONLY standard features
  const table = useMantineReactTable({
    columns: mantineColumns,
    data: gridData,

    // Row Selection - Standard feature
    enableRowSelection: true,

    // Column Features - All standard
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableHiding: true, // Enable column show/hide via column menu
    enableColumnFilters: !onPageChange,

    // Sorting & Filtering - Standard features
    enableSorting: !onPageChange,
    enableGlobalFilter: !onPageChange,
    enableFilters: !onPageChange,

    // Pagination - Standard feature
    enablePagination: true,
    manualPagination: !!onPageChange,
    pageCount: onPageChange ? Math.ceil(total / pageSize) : undefined,

    // Initial state - Set default column visibility
    initialState: {
      columnVisibility: {
        org_id: false, // Hidden by default
        domain: false, // Hidden by default
        membership_level: false, // Hidden by default
      },
    },

    // State management
    state: {
      pagination,
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },

    // State change handlers
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,

    // Table styling
    mantineTableProps: {
      striped: true,
      withColumnBorders: true,
      withTableBorder: true,
    },

    // Row click handler
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => onViewDetails(row.original),
      style: { cursor: 'pointer' },
    }),

    // Top toolbar - Only essential custom actions, use built-in features for rest
    renderTopToolbarCustomActions: () => (
      <Group gap="sm">
        {Object.keys(rowSelection).length > 0 && (
          <Menu>
            <Menu.Target>
              <Button color="cyan" size="sm">
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
      </Group>
    ),

    // Position toolbar icons consistently
    positionToolbarAlertBanner: 'bottom',
    positionGlobalFilter: 'left', // Search on left
    positionActionsColumn: 'last',
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

  const bulkActions = [
    { text: 'Export to PDF', icon: 'file-pdf', click: () => handleBulkAction('export-pdf') },
    { text: 'Export to CSV', icon: 'file-txt', click: () => handleBulkAction('export-csv') },
    { text: 'Suspend Selected', icon: 'pause', click: () => handleBulkAction('suspend') },
    { text: 'Delete Selected', icon: 'trash', click: () => handleBulkAction('delete') },
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
