import { Button, Select, Loader, Group, Text } from '@mantine/core';
import { MantineReactTable, type MRT_ColumnDef, useMantineReactTable } from 'mantine-react-table';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { AlertTriangle, CheckCircle, FileText, FolderOpen, XCircle } from './icons';
import type React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useApiError } from '../hooks/useApiError';
import type { LegalEntityIdentifier } from '../services/apiV2';
import { formatDateTime } from '../utils/dateUtils';
import { getVerificationColor } from '../utils/colors';
import { EmptyState } from './EmptyState';
import './IdentifierVerificationManager.css';

interface VerificationRecord {
  verification_id: string;
  identifier_type: string;
  identifier_value: string;
  document_url: string | null;
  verification_status: 'pending' | 'verified' | 'failed' | 'flagged';
  verified_at: string | null;
  verified_by: string | null;
  verification_notes: string | null;
  uploaded_at: string;
  extracted_data: Record<string, string> | null;
  mismatch_flags: string[] | null;
}

interface IdentifierVerificationManagerProps {
  legalEntityId: string;
  identifiers: LegalEntityIdentifier[];
  onUpdate?: () => void;
}

export const IdentifierVerificationManager: React.FC<IdentifierVerificationManagerProps> = ({
  legalEntityId,
  identifiers,
  onUpdate,
}) => {
  const [selectedIdentifier, setSelectedIdentifier] = useState<LegalEntityIdentifier | null>(null);
  const [verificationRecords, setVerificationRecords] = useState<VerificationRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const notification = useNotification();
  const { handleError } = useApiError();

  const _API_BASE =
    import.meta.env.VITE_API_URL || 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1';

  // Load verification records
  useEffect(() => {
    loadVerificationRecords();
  }, [legalEntityId]);

  const loadVerificationRecords = async () => {
    setLoading(true);
    try {
      // TODO: Backend API needed - Generic identifier verification history
      // Required endpoint: GET /v1/legal-entities/{legalEntityId}/verifications
      // Current backend only supports KvK-specific verification (legal_entity table columns)
      //
      // To implement:
      // 1. Create new table: identifier_verification_history
      // 2. Create GET endpoint to retrieve all verification records
      // 3. Update this call to: const response = await fetch(`${API_BASE}/v1/legal-entities/${legalEntityId}/verifications`);
      //
      // Placeholder: Empty array until backend is ready
      setVerificationRecords([]);
    } catch (error) {
      console.error('Failed to load verification records:', error);
      notification.showError('Failed to load verification history');
    } finally {
      setLoading(false);
    }
  };

  const handleIdentifierChange = (value: LegalEntityIdentifier | null) => {
    setSelectedIdentifier(value);
  };

  const handleUpload = async (files: File[]) => {
    if (!selectedIdentifier) {
      notification.showError('Please select an identifier first');
      return;
    }

    if (!files || files.length === 0) return;

    const file = files[0];

    // File type and size validation is handled by Dropzone props

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('identifier_type', selectedIdentifier.identifier_type);
      formData.append('identifier_value', selectedIdentifier.identifier_value || '');

      // TODO: Backend API needed - Generic identifier document upload & verification
      // Required endpoint: POST /v1/legal-entities/{legalEntityId}/verifications
      // Current backend only supports KvK verification via legal_entity table columns
      //
      // To implement:
      // 1. Create Azure Blob Storage upload endpoint for verification documents
      // 2. Create POST endpoint: /v1/legal-entities/{legalEntityId}/verifications
      // 3. Integrate with Azure Document Intelligence for PDF data extraction
      // 4. Store verification records in identifier_verification_history table
      // 5. Update this call to:
      //    const response = await fetch(`${API_BASE}/v1/legal-entities/${legalEntityId}/verifications`, {
      //      method: 'POST',
      //      body: formData,
      //    });
      //
      // Note: For KvK identifiers only, you can use the existing KvK verification endpoint:
      // POST /v1/legal-entities/{legalEntityId}/kvk-verification
      //
      // Placeholder notification until backend is ready
      notification.showWarning(
        'Document upload feature requires backend API implementation. See code comments for details.'
      );

      // Reload verification records
      setTimeout(() => {
        loadVerificationRecords();
        onUpdate?.();
      }, 2000);
    } catch (error: unknown) {
      handleError(error, 'uploading verification document');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: React.ReactNode; text: string }> = {
      verified: { icon: <CheckCircle size={14} />, text: 'Verified' },
      pending: { icon: <AlertTriangle size={14} />, text: 'Pending' },
      failed: { icon: <XCircle size={14} />, text: 'Failed' },
      flagged: { icon: <AlertTriangle size={14} />, text: 'Flagged for Review' },
    };

    const { icon, text } = config[status] || { icon: null, text: status };
    return (
      <span className="verification-status-badge" style={{ backgroundColor: getVerificationColor(status) }}>
        {icon}
        {text}
      </span>
    );
  };

  // Mantine React Table column definitions
  const columns = useMemo<MRT_ColumnDef<VerificationRecord>[]>(
    () => [
      {
        accessorKey: 'identifier_type',
        header: 'Identifier Type',
        size: 120,
      },
      {
        accessorKey: 'identifier_value',
        header: 'Identifier Value',
        size: 180,
      },
      {
        accessorKey: 'verification_status',
        header: 'Status',
        size: 140,
        Cell: ({ row }) => <div>{getStatusBadge(row.original.verification_status)}</div>,
      },
      {
        accessorKey: 'uploaded_at',
        header: 'Uploaded',
        size: 160,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          return <div>{value ? formatDateTime(value) : '-'}</div>;
        },
      },
      {
        accessorKey: 'verified_at',
        header: 'Verified',
        size: 160,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          return <div>{value ? formatDateTime(value) : '-'}</div>;
        },
      },
      {
        accessorKey: 'verified_by',
        header: 'Verified By',
        size: 150,
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 100,
        Cell: ({ row }) => (
          <div>
            {row.original.document_url && (
              <a href={row.original.document_url} target="_blank" rel="noopener noreferrer">
                <Button variant="subtle" size="sm" title="View document">
                  <FileText size={16} />
                </Button>
              </a>
            )}
          </div>
        ),
      },
    ],
    []
  );

  // Mantine React Table instance with standard features
  const table = useMantineReactTable({
    columns,
    data: verificationRecords,

    // Row Selection - disabled for read-only verification history
    enableRowSelection: false,

    // Column Features
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableHiding: true,
    enableColumnFilters: true,

    // Sorting & Filtering
    enableSorting: true,
    enableGlobalFilter: true,
    enableFilters: true,

    // Pagination
    enablePagination: true,

    // Table styling
    mantineTableProps: {
      striped: true,
      withColumnBorders: true,
      withTableBorder: true,
    },

    // Toolbar positioning
    positionGlobalFilter: 'left',
    positionToolbarAlertBanner: 'bottom',
    positionActionsColumn: 'last',
  });

  // Format identifiers for dropdown display
  const identifierOptions = identifiers.map((id) => ({
    ...id,
    displayText: `${id.identifier_type}: ${id.identifier_value}${id.country_code ? ` (${id.country_code})` : ''}`,
  }));

  return (
    <div className="identifier-verification-manager">
      <div className="section-header">
        <h3>Document Verification</h3>
      </div>

      {identifiers.length === 0 ? (
        <EmptyState
          icon={<FileText size={48} />}
          message="No identifiers registered yet"
          hint="Add identifiers in the Identifiers tab to enable document verification"
        />
      ) : (
        <>
          <div className="verification-upload-section">
            <div className="form-field">
              <label>Select Identifier to Verify</label>
              <Select
                data={identifierOptions.map((opt) => ({
                  value: opt.legal_entity_reference_id || '',
                  label: opt.displayText,
                }))}
                value={selectedIdentifier?.legal_entity_reference_id || null}
                onChange={(value) => {
                  const selected = identifierOptions.find(
                    (opt) => opt.legal_entity_reference_id === value
                  );
                  handleIdentifierChange(selected || null);
                }}
                style={{ width: '100%' }}
              />
            </div>

            {selectedIdentifier && (
              <div className="upload-area">
                <div className="upload-info">
                  <h4>
                    Upload Verification Document for {selectedIdentifier.identifier_type}:{' '}
                    {selectedIdentifier.identifier_value}
                  </h4>
                  <p className="upload-hint">
                    Upload an official document that verifies this identifier (e.g., chamber of
                    commerce extract, business registry certificate)
                  </p>
                </div>

                <Dropzone
                  onDrop={handleUpload}
                  onReject={(files) => {
                    if (files[0]?.errors[0]?.code === 'file-invalid-type') {
                      notification.showError('Only PDF files are allowed');
                    } else if (files[0]?.errors[0]?.code === 'file-too-large') {
                      notification.showError('File size must be less than 10MB');
                    }
                  }}
                  maxSize={10 * 1024 * 1024} // 10MB
                  accept={[MIME_TYPES.pdf]}
                  multiple={false}
                  disabled={uploading || !selectedIdentifier}
                >
                  <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
                    <Dropzone.Accept>
                      <CheckCircle size={52} style={{ color: 'var(--mantine-color-blue-6)' }} />
                    </Dropzone.Accept>
                    <Dropzone.Reject>
                      <XCircle size={52} style={{ color: 'var(--mantine-color-red-6)' }} />
                    </Dropzone.Reject>
                    <Dropzone.Idle>
                      <FileText size={52} style={{ color: 'var(--mantine-color-dimmed)' }} />
                    </Dropzone.Idle>

                    <div>
                      <Text size="xl" inline>
                        Drag PDF here or click to select
                      </Text>
                      <Text size="sm" c="dimmed" inline mt={7}>
                        File should not exceed 10MB
                      </Text>
                    </div>
                  </Group>
                </Dropzone>

                {uploading && (
                  <div className="upload-progress">
                    <Loader size="sm" />
                    <span>Uploading and verifying document...</span>
                  </div>
                )}

                <div className="upload-requirements">
                  <strong>Requirements:</strong>
                  <ul>
                    <li>PDF format only</li>
                    <li>Maximum file size: 10MB</li>
                    <li>Document must contain the identifier number and company name</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="verification-history">
            <h4>Verification History</h4>
            {loading ? (
              <div className="loading-state">
                <Loader size="md" />
              </div>
            ) : verificationRecords.length > 0 ? (
              <MantineReactTable table={table} />
            ) : (
              <EmptyState
                icon={<FolderOpen size={32} />}
                message="No verification records yet"
                hint="Upload documents to verify identifiers"
                size="small"
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};
