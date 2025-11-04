import { Button, Menu, Modal, Group, TextInput, Stack, Skeleton, CloseButton } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { DataTable, useDataTableColumns, type DataTableSortStatus } from 'mantine-datatable';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Workbook } from 'exceljs';
import { useNotification } from '../contexts/NotificationContext';
import { useGridState } from '../hooks/useGridState';
import { useApiError } from '../hooks/useApiError';
import type { Member } from '../services/api';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { sanitizeGridCell } from '../utils/sanitize';
import { getStatusColor, getMembershipColor } from '../utils/colors';
import { ErrorBoundary } from './ErrorBoundary';
import { defaultDataTableProps, defaultPaginationOptions } from './shared/DataTableConfig';
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
    defaultPageSize: 10, // Match DataTable's first recordsPerPageOptions value
    enableFilterPersistence: true,
    resetPageOnFilterChange: false,
  });

  const [gridData, setGridData] = useState<Member[]>(members);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [total, setTotal] = useState(totalMembers || members.length);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Member>>({
    columnAccessor: 'legal_name',
    direction: 'asc',
  });
  const [query, setQuery] = useState('');

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


  // Client-side sorting, filtering, and pagination (useMemo for sync calculation)
  const { sortedData, filteredCount } = useMemo(() => {
    let filtered = [...gridData];

    // Apply search filter
    if (query) {
      filtered = filtered.filter((member) =>
        member.legal_name?.toLowerCase().includes(query.toLowerCase()) ||
        member.status?.toLowerCase().includes(query.toLowerCase()) ||
        member.lei?.toLowerCase().includes(query.toLowerCase()) ||
        member.euid?.toLowerCase().includes(query.toLowerCase()) ||
        member.kvk?.toLowerCase().includes(query.toLowerCase()) ||
        member.org_id?.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply sorting
    if (sortStatus.columnAccessor) {
      const accessor = sortStatus.columnAccessor as keyof Member;
      filtered.sort((a, b) => {
        const aVal = a[accessor];
        const bVal = b[accessor];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortStatus.direction === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (aVal < bVal) return sortStatus.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortStatus.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const filteredCount = filtered.length;

    // Apply pagination - required when using controlled mode (page prop)
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const sortedData = filtered.slice(startIndex, endIndex);

    return { sortedData, filteredCount };
  }, [gridData, sortStatus, query, page, pageSize]);

  const handleBulkAction = useCallback((action: string) => {
    if (selectedIds.length === 0) {
      notification.showWarning('Please select members first');
      return;
    }

    setBulkAction(action);
    setShowBulkDialog(true);
  }, [selectedIds.length, notification]);

  const executeBulkAction = useCallback(async () => {
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
  }, [gridData, selectedIds, bulkAction, notification, handleError]);

  const handleCSVExport = useCallback(() => {
    const dataToExport =
      selectedIds.length > 0 ? gridData.filter((m) => selectedIds.includes(m.org_id)) : gridData;

    exportToCSV(dataToExport);
    notification.showSuccess(`Exported ${dataToExport.length} members to CSV`);
  }, [selectedIds, gridData, notification]);

  const handleExcelExport = useCallback(async () => {
    const dataToExport =
      selectedIds.length > 0 ? gridData.filter((m) => selectedIds.includes(m.org_id)) : gridData;

    // Create workbook and worksheet
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Members');

    // Define columns with headers and widths
    worksheet.columns = [
      { header: 'Legal Name', key: 'legalName', width: 30 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'LEI', key: 'lei', width: 20 },
      { header: 'EUID', key: 'euid', width: 20 },
      { header: 'KVK', key: 'kvk', width: 12 },
      { header: 'Organization ID', key: 'orgId', width: 25 },
      { header: 'Domain', key: 'domain', width: 20 },
      { header: 'Membership', key: 'membership', width: 12 },
      { header: 'Member Since', key: 'memberSince', width: 15 },
    ];

    // Add data rows
    dataToExport.forEach((member) => {
      worksheet.addRow({
        legalName: member.legal_name,
        status: member.status,
        lei: member.lei || '',
        euid: member.euid || '',
        kvk: member.kvk || '',
        orgId: member.org_id,
        domain: member.domain || '',
        membership: member.membership_level || '',
        memberSince: new Date(member.created_at).toLocaleDateString(),
      });
    });

    // Generate filename with timestamp
    const fileName = `CTN_Members_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write to buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);

    notification.showSuccess(`Exported ${dataToExport.length} members to ${fileName}`);
  }, [selectedIds, gridData, notification]);

  const handlePDFExport = useCallback(() => {
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
  }, [selectedIds, gridData, notification]);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleRowClick = useCallback(({ record }: { record: Member }) => {
    onViewDetails(record);
  }, [onViewDetails]);

  const handleSelectedRecordsChange = useCallback((records: Member[]) => {
    setSelectedIds(records.map((r) => r.org_id));
  }, []);

  const handleDialogClose = useCallback(() => {
    setShowBulkDialog(false);
  }, []);

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

  // Column definitions for mantine-datatable
  const { effectiveColumns, resetColumnsToggle } = useDataTableColumns<Member>({
    key: 'members-grid',
    columns: [
      {
        accessor: 'legal_name',
        title: getColumnTitle('legal_name'),
        width: 200,
        resizable: true,
        sortable: true,
        filter: (
          <TextInput
            placeholder="Search legal name..."
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            size="xs"
          />
        ),
        filtering: query !== '',
        render: (member) => (
          <div>{sanitizeGridCell(member.legal_name)}</div>
        ),
      },
      {
        accessor: 'status',
        title: getColumnTitle('status'),
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (member) => (
          <span
            className="status-badge"
            style={{ backgroundColor: getStatusColor(member.status) }}
            title={statusTooltips[member.status] || 'Member status'}
            role="status"
            aria-label={`Status: ${member.status}`}
          >
            {member.status}
          </span>
        ),
      },
      {
        accessor: 'lei',
        title: 'LEI',
        width: 150,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'euid',
        title: 'EUID',
        width: 150,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'kvk',
        title: 'KVK',
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'created_at',
        title: getColumnTitle('created_at'),
        width: 140,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (member) => <div>{new Date(member.created_at).toLocaleDateString()}</div>,
      },
      {
        accessor: 'org_id',
        title: getColumnTitle('org_id'),
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
        defaultToggle: false, // Hidden by default
      },
      {
        accessor: 'domain',
        title: getColumnTitle('domain'),
        width: 150,
        toggleable: true,
        resizable: true,
        sortable: true,
        defaultToggle: false, // Hidden by default
        render: (member) => (
          <div>{sanitizeGridCell(member.domain || '')}</div>
        ),
      },
      {
        accessor: 'membership_level',
        title: getColumnTitle('membership_level'),
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
        defaultToggle: false, // Hidden by default
        render: (member) => (
          <span
            className="membership-badge"
            style={{ backgroundColor: getMembershipColor(member.membership_level) }}
            title={membershipTooltips[member.membership_level] || 'Membership level'}
            role="status"
            aria-label={`Membership: ${member.membership_level}`}
          >
            {member.membership_level}
          </span>
        ),
      },
    ],
  });

  const bulkActions = [
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
      {/* Toolbar with Search, Export and Bulk Actions */}
      <div className="grid-toolbar">
        <div className="toolbar-left">
          {/* Search Input */}
          <TextInput
            placeholder="Search members..."
            leftSection={<IconSearch size={16} />}
            rightSection={
              query ? (
                <CloseButton
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                  size="sm"
                />
              ) : null
            }
            value={query}
            onChange={handleQueryChange}
            style={{ minWidth: '250px' }}
          />

          {/* Export Menu */}
          <Menu>
            <Menu.Target>
              <Button variant="outline" size="sm">
                {t('common.export', 'Export')}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={handleExcelExport}>
                Export to Excel (.xlsx)
              </Menu.Item>
              <Menu.Item onClick={handleCSVExport}>
                Export to CSV
              </Menu.Item>
              <Menu.Item onClick={handlePDFExport}>
                Export to PDF
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>

        {/* Toolbar Stats */}
        <div className="toolbar-stats">
          <span>Total: {total}</span>
          <span>Showing: {filteredCount}</span>
          <span>Page {page} of {Math.ceil(filteredCount / pageSize)}</span>
        </div>
      </div>

      {/* Bulk Action Confirmation Dialog */}
      <Modal
        opened={showBulkDialog}
        onClose={handleDialogClose}
        title="Confirm Bulk Action"
        size="md"
      >
        <p style={{ margin: '20px', fontSize: '16px' }}>{getBulkActionConfirmation()}</p>
        <Group mt="xl" justify="flex-end">
          <Button onClick={handleDialogClose} variant="default">Cancel</Button>
          <Button color="blue" onClick={executeBulkAction} disabled={isBulkProcessing}>
            {isBulkProcessing ? 'Processing...' : 'Confirm'}
          </Button>
        </Group>
      </Modal>

      {/* DataTable from mantine-datatable wrapped in ErrorBoundary */}
      <ErrorBoundary>
        {loading && sortedData.length === 0 ? (
          <Stack gap="xs">
            <Skeleton height={50} radius="md" />
            <Skeleton height={50} radius="md" />
            <Skeleton height={50} radius="md" />
            <Skeleton height={50} radius="md" />
            <Skeleton height={50} radius="md" />
            <Skeleton height={50} radius="md" />
            <Skeleton height={50} radius="md" />
            <Skeleton height={50} radius="md" />
          </Stack>
        ) : (
          <DataTable
            {...defaultDataTableProps}
            records={sortedData}
            columns={effectiveColumns}
            fetching={loading}
            totalRecords={filteredCount}
            recordsPerPage={pageSize}
            page={page}
            onPageChange={updatePage}
            recordsPerPageOptions={[...defaultPaginationOptions]}
            onRecordsPerPageChange={updatePageSize}
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
            selectedRecords={sortedData.filter((m) => selectedIds.includes(m.org_id))}
            onSelectedRecordsChange={handleSelectedRecordsChange}
            storeColumnsKey="members-grid"
            onRowClick={handleRowClick}
            rowStyle={() => ({ cursor: 'pointer' })}
          />
        )}
      </ErrorBoundary>
    </div>
  );
};

export default React.memo(MembersGrid);
