import { Button } from '@progress/kendo-react-buttons';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Grid, type GridCellProps, GridColumn } from '@progress/kendo-react-grid';
import { Loader } from '@progress/kendo-react-indicators';
import { Upload, type UploadOnAddEvent } from '@progress/kendo-react-upload';
import { AlertTriangle, CheckCircle, FileText, FolderOpen, XCircle } from './icons';
import type React from 'react';
import { useEffect, useState } from 'react';
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

  const handleUpload = async (event: UploadOnAddEvent) => {
    if (!selectedIdentifier) {
      notification.showError('Please select an identifier first');
      return;
    }

    const files = event.affectedFiles || event.newState || [];
    if (!files || files.length === 0) return;

    const fileInfo = files[0];
    const file = fileInfo.getRawFile ? fileInfo.getRawFile() : (fileInfo as File);

    // Type guard - ensure we have a File object
    if (!(file instanceof File)) {
      notification.showError('Invalid file');
      return;
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      notification.showError('Only PDF files are allowed');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      notification.showError('File size must be less than 10MB');
      return;
    }

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

  const StatusCell = (props: GridCellProps) => {
    return <td>{getStatusBadge(props.dataItem.verification_status)}</td>;
  };

  const DateCell = (props: GridCellProps) => {
    const { field, dataItem } = props;
    const value = field ? dataItem[field] : '';
    return <td>{value ? formatDateTime(value) : '-'}</td>;
  };

  const ActionsCell = (props: GridCellProps) => {
    return (
      <td>
        {props.dataItem.document_url && (
          <a href={props.dataItem.document_url} target="_blank" rel="noopener noreferrer">
            <Button fillMode="flat" size="small" title="View document">
              <FileText size={16} />
            </Button>
          </a>
        )}
      </td>
    );
  };

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
              <DropDownList
                data={identifierOptions}
                textField="displayText"
                dataItemKey="legal_entity_reference_id"
                value={identifierOptions.find(
                  (opt) =>
                    opt.legal_entity_reference_id === selectedIdentifier?.legal_entity_reference_id
                )}
                onChange={(e) => handleIdentifierChange(e.value)}
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

                <Upload
                  batch={false}
                  multiple={false}
                  autoUpload={false}
                  disabled={uploading}
                  restrictions={{
                    allowedExtensions: ['.pdf'],
                    maxFileSize: 10485760, // 10MB
                  }}
                  onAdd={handleUpload}
                  withCredentials={false}
                  saveUrl={''}
                  removeUrl={''}
                />

                {uploading && (
                  <div className="upload-progress">
                    <Loader size="small" />
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
                <Loader size="medium" />
              </div>
            ) : verificationRecords.length > 0 ? (
              <Grid data={verificationRecords} style={{ height: '400px' }}>
                <GridColumn field="identifier_type" title="Identifier Type" width="120px" />
                <GridColumn field="identifier_value" title="Identifier Value" width="180px" />
                <GridColumn
                  field="verification_status"
                  title="Status"
                  width="140px"
                  cell={StatusCell}
                />
                <GridColumn field="uploaded_at" title="Uploaded" width="160px" cell={DateCell} />
                <GridColumn field="verified_at" title="Verified" width="160px" cell={DateCell} />
                <GridColumn field="verified_by" title="Verified By" width="150px" />
                <GridColumn title="Actions" width="100px" cell={ActionsCell} />
              </Grid>
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
