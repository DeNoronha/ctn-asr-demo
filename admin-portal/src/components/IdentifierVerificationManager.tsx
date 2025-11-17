import { Button, Group, Loader, Select, Text } from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { DataTable, type DataTableColumn, useDataTableColumns } from 'mantine-datatable';
import React, { useEffect, useState, useMemo } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useApiError } from '../hooks/useApiError';
import { type LegalEntityIdentifier, type VerificationRecord, apiV2 } from "../services/api";
import { getVerificationColor } from '../utils/colors';
import { formatDateTime } from '../utils/dateUtils';
import { EmptyState } from './EmptyState';
import { AlertTriangle, CheckCircle, FileText, FolderOpen, XCircle } from './icons';
import './IdentifierVerificationManager.css';
import { ErrorBoundary } from './ErrorBoundary';

interface IdentifierVerificationManagerProps {
  legalEntityId: string;
  identifiers: LegalEntityIdentifier[];
  onUpdate?: () => void;
}

const IdentifierVerificationManagerComponent: React.FC<IdentifierVerificationManagerProps> = ({
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

  // Load verification records
  // biome-ignore lint/correctness/useExhaustiveDependencies: Load function is stable, depends only on legalEntityId
  useEffect(() => {
    loadVerificationRecords();
  }, [legalEntityId]);

  const loadVerificationRecords = async () => {
    setLoading(true);
    try {
      const data = await apiV2.getVerificationRecords(legalEntityId);
      setVerificationRecords(data.verifications || []);
    } catch (error) {
      console.error('Failed to load verification records:', error);
      notification.showError('Failed to load verification history');
      setVerificationRecords([]);
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

    setUploading(true);

    try {
      await apiV2.uploadVerificationDocument(
        legalEntityId,
        file,
        selectedIdentifier.identifier_type,
        selectedIdentifier.identifier_value || '',
        selectedIdentifier.legal_entity_reference_id || ''
      );

      notification.showSuccess(
        `${selectedIdentifier.identifier_type} document uploaded successfully`
      );

      // Reload verification records
      await loadVerificationRecords();
      onUpdate?.();
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
      <span
        className="verification-status-badge"
        style={{ backgroundColor: getVerificationColor(status) }}
      >
        {icon}
        {text}
      </span>
    );
  };

  // mantine-datatable column definitions
  const { effectiveColumns } = useDataTableColumns<VerificationRecord>({
    key: 'verification-grid',
    columns: [
      {
        accessor: 'identifier_type',
        title: 'Identifier Type',
        width: 120,
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
      },
      {
        accessor: 'verification_status',
        title: 'Status',
        width: 140,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => <div>{getStatusBadge(record.verification_status)}</div>,
      },
      {
        accessor: 'uploaded_at',
        title: 'Uploaded',
        width: 160,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => (
          <div>{record.uploaded_at ? formatDateTime(record.uploaded_at) : '-'}</div>
        ),
      },
      {
        accessor: 'verified_at',
        title: 'Verified',
        width: 160,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => (
          <div>{record.verified_at ? formatDateTime(record.verified_at) : '-'}</div>
        ),
      },
      {
        accessor: 'verified_by',
        title: 'Verified By',
        width: 150,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'actions' as unknown as string,
        title: 'Actions',
        width: 100,
        toggleable: false,
        render: (record) => (
          <div>
            {record.document_url && (
              <a href={record.document_url} target="_blank" rel="noopener noreferrer">
                <Button variant="subtle" size="sm" title="View document">
                  <FileText size={16} />
                </Button>
              </a>
            )}
          </div>
        ),
      },
    ],
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
              <Select
                label="Select Identifier to Verify"
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
              <ErrorBoundary>
                <DataTable
                  records={verificationRecords}
                  columns={effectiveColumns}
                  storeColumnsKey="verification-grid"
                  withTableBorder
                  withColumnBorders
                  striped
                  highlightOnHover
                />
              </ErrorBoundary>
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

export const IdentifierVerificationManager = React.memo(IdentifierVerificationManagerComponent);
