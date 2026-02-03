import { Workbook } from 'exceljs';
import { useCallback, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import type { Member } from '../services/api';
import { apiV2, deleteLegalEntity } from '../services/api';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { useApiError } from './useApiError';

export interface UseBulkActionsOptions {
  gridData: Member[];
  selectedIds: string[];
  onRefresh?: () => Promise<void>;
  onComplete?: () => void;
}

export interface BulkActionResult {
  executeBulkAction: (action: string) => Promise<void>;
  isBulkProcessing: boolean;
}

/**
 * Custom hook for managing bulk actions on members
 * Extracted from MembersGrid to reduce cognitive complexity
 *
 * @param options - Configuration options for bulk actions
 * @returns Object with executeBulkAction function and processing state
 */
export function useBulkActions({
  gridData,
  selectedIds,
  onRefresh,
  onComplete,
}: UseBulkActionsOptions): BulkActionResult {
  const notification = useNotification();
  const { handleError } = useApiError();
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const executeBulkAction = useCallback(
    async (action: string) => {
      setIsBulkProcessing(true);

      try {
        const selectedMembers = gridData.filter((m) => selectedIds.includes(m.legal_entity_id));

        switch (action) {
          case 'export-pdf':
            await handlePdfExport(selectedMembers, selectedIds.length, notification);
            break;

          case 'export-csv':
            await handleCsvExport(selectedMembers, selectedIds.length, notification);
            break;

          case 'export-excel':
            await handleExcelExport(selectedMembers, notification);
            break;

          case 'approve':
            await handleApproveAction(selectedIds, notification, onRefresh);
            break;

          case 'suspend':
            await handleSuspendAction(selectedIds, notification, onRefresh);
            break;

          case 'delete':
            await handleDeleteAction(selectedIds, notification, onRefresh);
            break;

          default:
            notification.showWarning(`Unknown action: ${action}`);
        }

        onComplete?.();
      } catch (error: unknown) {
        handleError(error, 'performing bulk action');
      } finally {
        setIsBulkProcessing(false);
      }
    },
    [gridData, selectedIds, notification, handleError, onRefresh, onComplete]
  );

  return { executeBulkAction, isBulkProcessing };
}

/**
 * Handles PDF export for selected members
 */
async function handlePdfExport(
  selectedMembers: Member[],
  count: number,
  notification: ReturnType<typeof useNotification>
): Promise<void> {
  const pdfFileName = exportToPDF(selectedMembers, {
    title: `CTN Members Export (${count} records)`,
    orientation: 'landscape',
    includeTimestamp: true,
  });
  notification.showSuccess(`Exported ${count} members to ${pdfFileName}`);
}

/**
 * Handles CSV export for selected members
 */
async function handleCsvExport(
  selectedMembers: Member[],
  count: number,
  notification: ReturnType<typeof useNotification>
): Promise<void> {
  exportToCSV(selectedMembers, `CTN_Members_${new Date().toISOString().split('T')[0]}.csv`);
  notification.showSuccess(`Exported ${count} members to CSV`);
}

/**
 * Handles Excel export for selected members
 */
async function handleExcelExport(
  selectedMembers: Member[],
  notification: ReturnType<typeof useNotification>
): Promise<void> {
  const workbook = createMembersWorkbook(selectedMembers);
  const fileName = `CTN_Members_${new Date().toISOString().split('T')[0]}.xlsx`;

  await downloadWorkbook(workbook, fileName);
  notification.showSuccess(`Exported ${selectedMembers.length} members to ${fileName}`);
}

/**
 * Creates an Excel workbook from members data
 */
function createMembersWorkbook(members: Member[]): Workbook {
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
  ];

  // Add data rows
  members.forEach((member) => {
    worksheet.addRow({
      legalName: member.legal_name,
      status: member.status,
      lei: member.lei || '',
      euid: member.euid || '',
      kvk: member.kvk || '',
      legalEntityId: member.legal_entity_id,
      domain: member.domain || '',
      membership: member.membership_level || '',
    });
  });

  return workbook;
}

/**
 * Downloads a workbook as an Excel file
 */
async function downloadWorkbook(workbook: Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Handles bulk approve action
 */
async function handleApproveAction(
  selectedIds: string[],
  notification: ReturnType<typeof useNotification>,
  onRefresh?: () => Promise<void>
): Promise<void> {
  const approvePromises = selectedIds.map((legalEntityId) =>
    apiV2.updateMemberStatus(legalEntityId, 'ACTIVE', 'Bulk approved via admin portal')
  );
  await Promise.all(approvePromises);

  const count = selectedIds.length;
  notification.showSuccess(`Approved ${count} member${count > 1 ? 's' : ''}`);

  if (onRefresh) {
    await onRefresh();
  }
}

/**
 * Handles bulk suspend action
 */
async function handleSuspendAction(
  selectedIds: string[],
  notification: ReturnType<typeof useNotification>,
  onRefresh?: () => Promise<void>
): Promise<void> {
  const suspendPromises = selectedIds.map((legalEntityId) =>
    apiV2.updateMemberStatus(legalEntityId, 'SUSPENDED', 'Bulk suspended via admin portal')
  );
  await Promise.all(suspendPromises);

  const count = selectedIds.length;
  notification.showSuccess(`Suspended ${count} member${count > 1 ? 's' : ''}`);

  if (onRefresh) {
    await onRefresh();
  }
}

/**
 * Handles bulk delete action (soft delete)
 */
async function handleDeleteAction(
  selectedIds: string[],
  notification: ReturnType<typeof useNotification>,
  onRefresh?: () => Promise<void>
): Promise<void> {
  // Use actual delete endpoint which performs soft delete
  const deletePromises = selectedIds.map((legalEntityId) => deleteLegalEntity(legalEntityId));
  await Promise.all(deletePromises);

  const count = selectedIds.length;
  notification.showSuccess(`Deleted ${count} member${count > 1 ? 's' : ''}`);

  if (onRefresh) {
    await onRefresh();
  }
}
