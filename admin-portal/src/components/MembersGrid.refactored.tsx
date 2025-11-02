import { Stack, Skeleton } from '@mantine/core';
import { DataTable, useDataTableColumns } from 'mantine-datatable';
import React, { useCallback } from 'react';
import { Workbook } from 'exceljs';
import { useNotification } from '../contexts/NotificationContext';
import type { Member } from '../services/api';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { ErrorBoundary } from './ErrorBoundary';
import { defaultDataTableProps, defaultPaginationOptions } from './shared/DataTableConfig';
import { MembersGridToolbar } from './members/MembersGridToolbar';
import { MembersGridActions } from './members/MembersGridActions';
import { useMembersGridColumns } from './members/MembersGridColumns';
import { useMembersGridState } from '../hooks/useMembersGridState';
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
  const notification = useNotification();

  // Use custom hook for state management
  const {
    gridData,
    selectedIds,
    total,
    sortStatus,
    query,
    page,
    pageSize,
    sortedData,
    filteredCount,
    setSortStatus,
    setQuery,
    updatePage,
    updatePageSize,
    handleQueryChange,
    handleSelectedRecordsChange,
    clearSelection,
  } = useMembersGridState({ members, totalMembers });

  // Export handlers
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

  const handleRowClick = useCallback(({ record }: { record: Member }) => {
    onViewDetails(record);
  }, [onViewDetails]);

  // Get column definitions
  const columnDefinitions = useMembersGridColumns({
    query,
    onQueryChange: setQuery,
  });

  const { effectiveColumns, resetColumnsToggle } = useDataTableColumns<Member>({
    key: 'members-grid',
    columns: columnDefinitions,
  });

  return (
    <div className="members-grid-container">
      {/* Toolbar with Search, Export and Stats */}
      <MembersGridToolbar
        query={query}
        onQueryChange={handleQueryChange}
        onExcelExport={handleExcelExport}
        onCSVExport={handleCSVExport}
        onPDFExport={handlePDFExport}
        total={total}
        filteredCount={filteredCount}
        page={page}
        pageSize={pageSize}
      />

      {/* Bulk Action Modal */}
      <MembersGridActions
        gridData={gridData}
        selectedIds={selectedIds}
        onSelectionClear={clearSelection}
      />

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
