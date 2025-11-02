import { Button, Group, Modal } from '@mantine/core';
import { useCallback, useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useApiError } from '../../hooks/useApiError';
import type { Member } from '../../services/api';
import { exportToCSV, exportToPDF } from '../../utils/exportUtils';

interface MembersGridActionsProps {
  gridData: Member[];
  selectedIds: string[];
  onSelectionClear: () => void;
}

export const MembersGridActions: React.FC<MembersGridActionsProps> = ({
  gridData,
  selectedIds,
  onSelectionClear,
}) => {
  const notification = useNotification();
  const { handleError } = useApiError();
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

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

      onSelectionClear();
    } catch (error: unknown) {
      handleError(error, 'performing bulk action');
    } finally {
      setIsBulkProcessing(false);
      setShowBulkDialog(false);
    }
  }, [gridData, selectedIds, bulkAction, notification, handleError, onSelectionClear]);

  const handleDialogClose = useCallback(() => {
    setShowBulkDialog(false);
  }, []);

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
  );
};
