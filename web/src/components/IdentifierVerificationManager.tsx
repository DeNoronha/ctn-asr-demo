import { Button } from '@progress/kendo-react-buttons';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Loader } from '@progress/kendo-react-indicators';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Upload } from '@progress/kendo-react-upload';
import { CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import type React from 'react';
import { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import type { LegalEntityIdentifier } from '../services/apiV2';
import { formatDateTime } from '../utils/dateUtils';
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

  const API_BASE = process.env.REACT_APP_API_URL || 'https://func-ctn-demo-asr-dev.azurewebsites.net/api';

  // Load verification records
  useEffect(() => {
    loadVerificationRecords();
  }, [legalEntityId]);

  const loadVerificationRecords = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API endpoint when backend is ready
      // const response = await fetch(`${API_BASE}/v1/legal-entities/${legalEntityId}/verifications`);
      // const data = await response.json();
      // setVerificationRecords(data);

      // Placeholder: Empty array for now
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

  const handleUpload = async (event: any) => {
    if (!selectedIdentifier) {
      notification.showError('Please select an identifier first');
      return;
    }

    const files = event.affectedFiles || event.newState || [];
    if (!files || files.length === 0) return;

    event.preventDefault?.();

    const fileInfo = files[0];
    const file = fileInfo.getRawFile ? fileInfo.getRawFile() : fileInfo;

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

      // TODO: Replace with actual API endpoint when backend is ready
      // const response = await fetch(
      //   `${API_BASE}/v1/legal-entities/${legalEntityId}/verifications`,
      //   {
      //     method: 'POST',
      //     body: formData,
      //   }
      // );

      notification.showSuccess('Document uploaded successfully. Verification in progress...');

      // Reload verification records
      setTimeout(() => {
        loadVerificationRecords();
        onUpdate?.();
      }, 2000);
    } catch (error: any) {
      console.error('Upload failed:', error);
      notification.showError(error.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      verified: { color: '#10b981', icon: <CheckCircle size={14} />, text: 'Verified' },
      pending: { color: '#f59e0b', icon: <AlertTriangle size={14} />, text: 'Pending' },
      failed: { color: '#ef4444', icon: <XCircle size={14} />, text: 'Failed' },
      flagged: { color: '#f59e0b', icon: <AlertTriangle size={14} />, text: 'Flagged for Review' },
    };

    const { color, icon, text } = config[status] || { color: '#6b7280', icon: null, text: status };
    return (
      <span className="verification-status-badge" style={{ backgroundColor: color }}>
        {icon}
        {text}
      </span>
    );
  };

  const StatusCell = (props: any) => {
    return <td>{getStatusBadge(props.dataItem.verification_status)}</td>;
  };

  const DateCell = (props: any) => {
    const { field, dataItem } = props;
    const value = dataItem[field];
    return (
      <td>
        {value ? formatDateTime(value) : '-'}
      </td>
    );
  };

  const ActionsCell = (props: any) => {
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
        <div className="empty-state">
          <p>No identifiers registered yet</p>
          <p className="hint">Add identifiers in the Identifiers tab to enable document verification</p>
        </div>
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
                <GridColumn
                  field="uploaded_at"
                  title="Uploaded"
                  width="160px"
                  cell={DateCell}
                />
                <GridColumn field="verified_at" title="Verified" width="160px" cell={DateCell} />
                <GridColumn field="verified_by" title="Verified By" width="150px" />
                <GridColumn title="Actions" width="100px" cell={ActionsCell} />
              </Grid>
            ) : (
              <div className="empty-state-small">
                <p>No verification records yet</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
