import {
  ActionIcon,
  Badge,
  Button,
  CloseButton,
  Group,
  Menu,
  Modal,
  Pill,
  Stack,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconBolt,
  IconCheck,
  IconEdit,
  IconEye,
  IconFileSpreadsheet,
  IconFileTypeCsv,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { DataTable, type DataTableSortStatus, useDataTableColumns } from 'mantine-datatable';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../contexts/NotificationContext';
import { useBulkActions } from '../hooks/useBulkActions';
import { useGridState } from '../hooks/useGridState';
import type { Member } from '../services/api';
import { deleteLegalEntity } from '../services/api';
import { getMembershipColor, getStatusColor } from '../utils/colors';
import { sortMembers } from '../utils/memberSorting';
import { sanitizeGridCell } from '../utils/sanitize';
import { ErrorBoundary } from './ErrorBoundary';
import { defaultDataTableProps, defaultPaginationOptions } from './shared/DataTableConfig';
import { LoadingState } from './shared/LoadingState';
import './MembersGrid.css';

interface MembersGridProps {
  members: Member[];
  totalMembers?: number;
  onViewDetails: (member: Member) => void;
  onPageChange?: (page: number, pageSize: number) => void;
  loading?: boolean;
  onRefresh?: () => Promise<void>;
}

const MembersGrid: React.FC<MembersGridProps> = ({
  members,
  totalMembers,
  onViewDetails,
  loading = false,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const notification = useNotification();

  // Use grid state hook for URL-based pagination persistence
  const { page, pageSize, updatePage, updatePageSize } = useGridState('members-grid', {
    defaultPage: 1,
    defaultPageSize: 10, // Match DataTable's first recordsPerPageOptions value
    enableFilterPersistence: true,
    resetPageOnFilterChange: false,
  });

  const [gridData, setGridData] = useState<Member[]>(members);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [total, setTotal] = useState(totalMembers || members.length);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Member>>({
    columnAccessor: 'legal_name',
    direction: 'asc',
  });
  const [query, setQuery] = useState('');

  // Use bulk actions hook
  const { executeBulkAction: performBulkAction, isBulkProcessing } = useBulkActions({
    gridData,
    selectedIds,
    onRefresh,
    onComplete: () => {
      setSelectedIds([]);
      setShowBulkDialog(false);
    },
  });

  // Helper function to get translated column title
  const getColumnTitle = (field: string) => {
    const titleMap: Record<string, string> = {
      legal_name: t('members.legalName'),
      status: t('common.status'),
      lei: 'LEI',
      euid: 'EUID',
      kvk: 'KVK',
      legal_entity_id: t('members.legalEntityId', 'Legal Entity ID'),
      domain: t('members.domain', 'Domain'),
      membership_level: t('members.membership', 'Membership'),
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
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (member) =>
          member.legal_name?.toLowerCase().includes(lowerQuery) ||
          member.city?.toLowerCase().includes(lowerQuery) ||
          member.status?.toLowerCase().includes(lowerQuery) ||
          member.lei?.toLowerCase().includes(lowerQuery) ||
          member.euid?.toLowerCase().includes(lowerQuery) ||
          member.kvk?.toLowerCase().includes(lowerQuery) ||
          member.vat?.toLowerCase().includes(lowerQuery) ||
          member.eori?.toLowerCase().includes(lowerQuery) ||
          member.duns?.toLowerCase().includes(lowerQuery) ||
          member.legal_entity_id?.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply sorting using extracted utility
    const sorted = sortMembers(filtered, sortStatus);
    const filteredCount = sorted.length;

    // Apply pagination - required when using controlled mode (page prop)
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const sortedData = sorted.slice(startIndex, endIndex);

    return { sortedData, filteredCount };
  }, [gridData, sortStatus, query, page, pageSize]);

  const handleBulkAction = useCallback(
    (action: string) => {
      if (selectedIds.length === 0) {
        notification.showWarning('Please select members first');
        return;
      }

      setBulkAction(action);
      setShowBulkDialog(true);
    },
    [selectedIds.length, notification]
  );

  const executeBulkAction = useCallback(async () => {
    await performBulkAction(bulkAction);
  }, [performBulkAction, bulkAction]);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleRowClick = useCallback(
    ({ record }: { record: Member }) => {
      onViewDetails(record);
    },
    [onViewDetails]
  );

  const handleSelectedRecordsChange = useCallback((records: Member[]) => {
    setSelectedIds(records.map((r) => r.legal_entity_id));
  }, []);

  const handleDialogClose = useCallback(() => {
    setShowBulkDialog(false);
  }, []);

  const handleDeleteClick = useCallback((member: Member) => {
    setMemberToDelete(member);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!memberToDelete) return;

    setIsDeleting(true);
    try {
      await deleteLegalEntity(memberToDelete.legal_entity_id);
      notification.showSuccess(`Successfully deleted ${memberToDelete.legal_name}`);
      setShowDeleteDialog(false);
      setMemberToDelete(null);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error: unknown) {
      console.error('Failed to delete member:', error);
      notification.showError('Failed to delete member. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [memberToDelete, notification, onRefresh]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteDialog(false);
    setMemberToDelete(null);
  }, []);

  const statusTooltips: Record<string, string> = {
    ACTIVE: 'Member is active and in good standing',
    PENDING: 'Membership application pending approval',
    SUSPENDED: 'Member temporarily suspended - access restricted',
    TERMINATED: 'Membership terminated - no longer active',
    FLAGGED: 'Member flagged for review',
  };

  const membershipTooltips: Record<string, string> = {
    PREMIUM: 'Premium membership - full access to all services and priority support',
    FULL: 'Full membership - access to all standard services',
    BASIC: 'Basic membership - limited access to essential services',
  };

  // Render identifier pills for a member
  // Show EUID, PEPPOL, VIES, EORI pills; hide KVK, DUNS, and VAT (VAT redundant with VIES)
  const renderIdentifierPills = (member: Member) => {
    const identifiers = [
      { key: 'EUID', value: member.euid, label: 'EUID' },
      { key: 'PEPPOL', value: member.peppol, label: 'PEPPOL' },
      { key: 'VIES', value: member.vat, label: 'VIES' }, // VIES uses VAT for validation
      { key: 'EORI', value: member.eori, label: 'EORI' },
    ];

    return (
      <Group gap={3} wrap="nowrap">
        {identifiers.map(({ key, value, label }) => {
          const hasValue = !!value;
          return (
            <Tooltip
              key={key}
              label={hasValue ? `${label}: ${value}` : `${label}: Not available`}
              position="top"
            >
              <Pill
                size="xs"
                c={hasValue ? 'white' : 'gray.6'}
                bg={hasValue ? 'teal.6' : 'gray.2'}
                style={{ cursor: 'default', fontWeight: 500, fontSize: '0.6rem', padding: '1px 4px' }}
              >
                {label}
              </Pill>
            </Tooltip>
          );
        })}
      </Group>
    );
  };

  // Column definitions for mantine-datatable
  // Task 08: ID, Official Name, City (narrower), Country Code (new), EUID, LEI, Identifiers (pills), Status (wider), Actions
  const { effectiveColumns } = useDataTableColumns<Member>({
    key: 'members-grid-v5',
    columns: [
      {
        accessor: 'legal_entity_id',
        title: 'ID',
        width: 75,
        toggleable: false,
        draggable: false,
        resizable: true,
        sortable: true,
        render: (member) => (
          <span
            title={member.legal_entity_id}
            style={{ fontFamily: 'monospace', fontSize: '0.75em', cursor: 'help' }}
          >
            {member.legal_entity_id?.substring(0, 7)}…
          </span>
        ),
      },
      {
        accessor: 'legal_name',
        title: 'Official Name',
        width: 200,
        toggleable: false,
        draggable: true,
        resizable: true,
        sortable: true,
        render: (member) => <div style={{ fontWeight: 500, fontSize: '0.9em' }}>{sanitizeGridCell(member.legal_name)}</div>,
      },
      {
        accessor: 'city',
        title: 'City',
        width: 90,
        toggleable: true,
        draggable: true,
        resizable: true,
        sortable: true,
        render: (member) => <div style={{ fontSize: '0.9em' }}>{sanitizeGridCell(member.city || '—')}</div>,
      },
      {
        accessor: 'country_code',
        title: 'CC',
        width: 45,
        toggleable: true,
        draggable: true,
        resizable: true,
        sortable: true,
        render: (member) => <div style={{ textAlign: 'center' }}>{member.country_code || '—'}</div>,
      },
      {
        accessor: 'euid',
        title: 'EUID',
        width: 120,
        toggleable: true,
        draggable: true,
        resizable: true,
        sortable: true,
        render: (member) => (
          <span style={{ fontFamily: 'monospace', fontSize: '0.75em' }}>
            {member.euid || '—'}
          </span>
        ),
      },
      {
        accessor: 'lei',
        title: 'LEI',
        width: 175,
        toggleable: true,
        draggable: true,
        resizable: true,
        sortable: true,
        defaultToggle: false, // Hidden by default per user request
        render: (member) => (
          <span style={{ fontFamily: 'monospace', fontSize: '0.8em' }}>
            {member.lei || '—'}
          </span>
        ),
      },
      {
        accessor: 'identifiers',
        title: 'Identifiers',
        width: 170,
        toggleable: true,
        draggable: true,
        resizable: true,
        sortable: false,
        render: renderIdentifierPills,
      },
      {
        accessor: 'status',
        title: 'Status',
        width: 80,
        toggleable: true,
        draggable: true,
        resizable: true,
        sortable: true,
        render: (member) => (
          <output
            className="status-badge"
            style={{
              backgroundColor: getStatusColor(member.status),
              fontSize: '0.65rem',
              padding: '2px 5px'
            }}
            title={statusTooltips[member.status] || 'Member status'}
            aria-label={`Status: ${member.status}`}
          >
            {member.status}
          </output>
        ),
      },
      {
        accessor: 'domain',
        title: getColumnTitle('domain'),
        width: 130,
        toggleable: true,
        draggable: true,
        resizable: true,
        sortable: true,
        defaultToggle: false,
        render: (member) => <div style={{ fontSize: '0.85em' }}>{sanitizeGridCell(member.domain || '')}</div>,
      },
      {
        accessor: 'actions',
        title: 'Actions',
        width: 100,
        toggleable: false,
        draggable: false,
        sortable: false,
        resizable: false,
        render: (member) => (
          <Group gap={4} wrap="nowrap">
            <Tooltip label="View details">
              <ActionIcon
                variant="subtle"
                color="blue"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onViewDetails(member);
                }}
              >
                <IconEye size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Edit member">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onViewDetails(member);
                }}
              >
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete member">
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleDeleteClick(member);
                }}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
  });

  const getBulkActionConfirmation = () => {
    const count = selectedIds.length;
    const plural = count > 1 ? 's' : '';

    switch (bulkAction) {
      case 'export-pdf':
        return `Export ${count} member${plural} to PDF?`;
      case 'export-csv':
        return `Export ${count} member${plural} to CSV?`;
      case 'export-excel':
        return `Export ${count} member${plural} to Excel?`;
      case 'approve':
        return `Approve ${count} member${plural}? They will gain full access to CTN services.`;
      case 'suspend':
        return `Suspend ${count} member${plural}? They will lose access to CTN services.`;
      case 'delete':
        return `Delete ${count} member${plural}? This action cannot be undone!`;
      default:
        return `Perform action on ${count} member${plural}?`;
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
                <Tooltip label="Clear search" position="bottom">
                  <CloseButton aria-label="Clear search" onClick={() => setQuery('')} size="sm" />
                </Tooltip>
              ) : null
            }
            value={query}
            onChange={handleQueryChange}
            style={{ minWidth: '250px' }}
          />

          {/* Bulk Actions Menu */}
          {selectedIds.length > 0 && (
            <Menu>
              <Menu.Target>
                <Button
                  variant="filled"
                  color="blue"
                  size="sm"
                  leftSection={<IconBolt size={16} />}
                >
                  Bulk Actions ({selectedIds.length})
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  Actions for {selectedIds.length} selected member
                  {selectedIds.length > 1 ? 's' : ''}
                </Menu.Label>
                <Menu.Item
                  leftSection={<IconCheck size={16} />}
                  color="green"
                  onClick={() => handleBulkAction('approve')}
                >
                  Approve Selected
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFileSpreadsheet size={16} />}
                  onClick={() => handleBulkAction('export-excel')}
                >
                  Export to Excel
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFileTypeCsv size={16} />}
                  onClick={() => handleBulkAction('export-csv')}
                >
                  Export to CSV
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconTrash size={16} />}
                  color="red"
                  onClick={() => handleBulkAction('delete')}
                >
                  Delete Selected
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </div>

        {/* Toolbar Stats */}
        <div className="toolbar-stats">
          <span>Total: {total}</span>
          <span>Showing: {filteredCount}</span>
          <span>
            Page {page} of {Math.ceil(filteredCount / pageSize)}
          </span>
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
          <Button onClick={handleDialogClose} variant="default">
            Cancel
          </Button>
          <Button color="blue" onClick={executeBulkAction} disabled={isBulkProcessing}>
            {isBulkProcessing ? 'Processing...' : 'Confirm'}
          </Button>
        </Group>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        opened={showDeleteDialog}
        onClose={handleDeleteCancel}
        title="Delete Member"
        size="md"
      >
        <Stack gap="md" p="md">
          <p style={{ fontSize: '16px' }}>
            Are you sure you want to delete <strong>{memberToDelete?.legal_name}</strong>?
          </p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            This will also delete all associated records:
          </p>
          <ul style={{ fontSize: '14px', color: '#666', margin: '0 0 0 20px', padding: 0 }}>
            <li>Contacts</li>
            <li>Identifiers (KvK, LEI, EUID, etc.)</li>
            <li>Endpoints</li>
            <li>Registry data</li>
            <li>Verification history</li>
          </ul>
          <Badge color="red" size="lg">This action cannot be undone!</Badge>
        </Stack>
        <Group mt="xl" justify="flex-end">
          <Button onClick={handleDeleteCancel} variant="default" disabled={isDeleting}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDeleteConfirm} loading={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Member'}
          </Button>
        </Group>
      </Modal>

      {/* DataTable from mantine-datatable wrapped in ErrorBoundary */}
      <ErrorBoundary>
        <LoadingState loading={loading && sortedData.length === 0} minHeight={500}>
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
            selectedRecords={sortedData.filter((m) => selectedIds.includes(m.legal_entity_id))}
            onSelectedRecordsChange={handleSelectedRecordsChange}
            idAccessor="legal_entity_id"
            storeColumnsKey="members-grid-v5"
            onRowClick={handleRowClick}
            rowStyle={() => ({ cursor: 'pointer' })}
            rowBackgroundColor={(member) =>
              selectedIds.includes(member.legal_entity_id)
                ? { light: '#e7f5ff', dark: '#1c2a35' }
                : undefined
            }
            allRecordsSelectionCheckboxProps={{ 'aria-label': 'Select all members on this page' }}
            getRecordSelectionCheckboxProps={(member) => ({
              'aria-label': `Select ${member.legal_name}`,
            })}
            pinLastColumn
          />
        </LoadingState>
      </ErrorBoundary>
    </div>
  );
};

export default React.memo(MembersGrid);
