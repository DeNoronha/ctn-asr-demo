import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { DataTable, type DataTableColumn, useDataTableColumns } from 'mantine-datatable';
import type React from 'react';
import type { LegalEntityIdentifier } from '../../services/apiV2';
import { formatDate } from '../../utils/dateUtils';
import { sanitizeGridCell } from '../../utils/sanitize';
import { ErrorBoundary } from '../ErrorBoundary';
import { AlertCircle, AlertTriangle, CheckCircle, Pencil, Trash2, XCircle } from '../icons';

interface IdentifiersTableProps {
  identifiers: LegalEntityIdentifier[];
  kvkVerificationFlags: string[];
  hasKvkDocument: boolean;
  onEdit: (identifier: LegalEntityIdentifier) => void;
  onDelete: (identifier: LegalEntityIdentifier) => void;
}

const getValidationBadge = (status?: string) => {
  if (!status) return null;

  const config: Record<string, { color: string; icon: React.ReactNode; tooltip: string }> = {
    VALIDATED: {
      color: '#059669',
      icon: <CheckCircle size={14} />,
      tooltip: 'This identifier has been verified against the official registry',
    },
    PENDING: {
      color: '#b45309',
      icon: <AlertCircle size={14} />,
      tooltip: 'Validation pending - awaiting verification against registry',
    },
    FAILED: {
      color: '#dc2626',
      icon: <XCircle size={14} />,
      tooltip: 'Validation failed - identifier could not be verified in registry',
    },
    EXPIRED: {
      color: '#6b7280',
      icon: <XCircle size={14} />,
      tooltip: 'Validation expired - re-verification required',
    },
  };

  const { color, icon, tooltip } = config[status] || {
    color: '#6b7280',
    icon: null,
    tooltip: 'Unknown validation status',
  };
  return (
    <span
      className="validation-badge"
      style={{ backgroundColor: color }}
      // biome-ignore lint/a11y/useSemanticElements: Inline badge with styling - semantic equivalent not available
      role="status"
      aria-label={`Validation status: ${status}`}
      title={tooltip}
    >
      <span aria-hidden="true">{icon}</span>
      {status}
    </span>
  );
};

const getDocumentVerificationBadge = (
  identifierType: string,
  hasKvkDocument: boolean,
  kvkVerificationFlags: string[]
) => {
  // Only show for KvK identifiers with uploaded document
  if (identifierType !== 'KVK' || !hasKvkDocument) {
    return <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>—</span>;
  }

  const hasNameMismatch = kvkVerificationFlags.includes('entered_name_mismatch');
  const hasNumberMismatch = kvkVerificationFlags.includes('entered_kvk_mismatch');

  let color: string;
  let icon: React.ReactNode;
  let label: string;

  if (!hasNameMismatch && !hasNumberMismatch) {
    // Green: Both match
    color = '#059669'; // WCAG AA compliant
    icon = <CheckCircle size={14} />;
    label = 'MATCH';
  } else if (hasNameMismatch && hasNumberMismatch) {
    // Red: Neither match
    color = '#dc2626'; // WCAG AA compliant
    icon = <XCircle size={14} />;
    label = 'NO MATCH';
  } else {
    // Orange: Partial match
    color = '#b45309'; // WCAG AA compliant
    icon = <AlertTriangle size={14} />;
    label = 'PARTIAL';
  }

  return (
    <span
      className="validation-badge"
      style={{ backgroundColor: color }}
      // biome-ignore lint/a11y/useSemanticElements: Inline badge with styling - semantic equivalent not available
      role="status"
      aria-label={`Document verification: ${label}`}
      title={
        hasNameMismatch && hasNumberMismatch
          ? 'Company name and KvK number do not match uploaded document'
          : hasNameMismatch
            ? 'Company name does not match uploaded document'
            : hasNumberMismatch
              ? 'KvK number does not match uploaded document'
              : 'Company name and KvK number match uploaded document'
      }
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
};

export const IdentifiersTable: React.FC<IdentifiersTableProps> = ({
  identifiers,
  kvkVerificationFlags,
  hasKvkDocument,
  onEdit,
  onDelete,
}) => {
  // mantine-datatable column definitions
  const { effectiveColumns } = useDataTableColumns<LegalEntityIdentifier>({
    key: 'identifiers-grid',
    columns: [
      {
        accessor: 'identifier_type',
        title: 'Type',
        width: 100,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'identifier_value',
        title: 'Identifier Value',
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
        // SEC-007: Sanitize user-generated text fields in grid
        render: (record) => <div>{sanitizeGridCell(record.identifier_value || '')}</div>,
      },
      {
        accessor: 'country_code',
        title: 'Country',
        width: 100,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'registry_name',
        title: 'Registry',
        width: 220,
        toggleable: true,
        resizable: true,
        sortable: true,
        // SEC-007: Sanitize user-generated text fields in grid
        render: (record) => <div>{sanitizeGridCell(record.registry_name || '')}</div>,
      },
      {
        accessor: 'validation_status',
        title: 'Status',
        width: 140,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => <div>{getValidationBadge(record.validation_status)}</div>,
      },
      {
        accessor: 'document_verification' as unknown as string,
        title: 'Doc Verification',
        width: 160,
        toggleable: true,
        resizable: true,
        render: (record) => (
          <div>
            {getDocumentVerificationBadge(
              record.identifier_type,
              hasKvkDocument,
              kvkVerificationFlags
            )}
          </div>
        ),
      },
      {
        accessor: 'validation_date',
        title: 'Last Verified',
        width: 140,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => (
          <div>{record.validation_date ? formatDate(record.validation_date) : '-'}</div>
        ),
      },
      {
        accessor: 'dt_modified',
        title: 'Last Edited',
        width: 140,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => <div>{record.dt_modified ? formatDate(record.dt_modified) : '-'}</div>,
      },
      {
        accessor: 'actions' as unknown as string,
        title: 'Actions',
        width: '0%',
        toggleable: false,
        render: (record) => (
          <Group gap={4} wrap="nowrap">
            <Tooltip label={`Edit ${record.identifier_type} identifier`}>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onEdit(record);
                }}
                aria-label={`Edit ${record.identifier_type} identifier`}
              >
                <Pencil size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={`Delete ${record.identifier_type} identifier`}>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDelete(record);
                }}
                aria-label={`Delete ${record.identifier_type} identifier`}
              >
                <Trash2 size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
  });

  return (
    <ErrorBoundary>
      <DataTable
        records={identifiers}
        columns={effectiveColumns}
        storeColumnsKey="identifiers-grid"
        withTableBorder
        withColumnBorders
        striped
        highlightOnHover
      />
    </ErrorBoundary>
  );
};
