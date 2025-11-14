import { Button, Group, Loader, Text } from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import axios from 'axios';
import type React from 'react';
import { useEffect, useState } from 'react';
import { msalInstance } from '../auth/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useApiError } from '../hooks/useApiError';
import { TEXT_COLORS } from '../utils/colors';
import { formatDate, formatDateTime } from '../utils/dateFormat';
import { logger } from '../utils/logger';
import { CheckCircle, FileText, XCircle } from './icons';
import { LoadingState } from './shared/LoadingState';

interface KvkApiResponse {
  kvkNumber: string;
  statutoryName: string;
  status?: string;
  tradeNames?: {
    businessName: string;
  };
}

interface KvkVerificationStatus {
  kvk_document_url: string | null;
  kvk_verification_status: string;
  kvk_verified_at: string | null;
  kvk_verified_by: string | null;
  kvk_verification_notes: string | null;
  entered_company_name: string | null;
  entered_kvk_number: string | null;
  kvk_extracted_company_name: string | null;
  kvk_extracted_number: string | null;
  kvk_api_response: KvkApiResponse | string | null;
  kvk_mismatch_flags: string[] | null;
  document_uploaded_at: string | null;
}

interface KvkDocumentUploadProps {
  legalEntityId: string;
  onVerificationComplete?: () => void;
}

export const KvkDocumentUpload: React.FC<KvkDocumentUploadProps> = ({
  legalEntityId,
  onVerificationComplete,
}) => {
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<KvkVerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const notification = useNotification();
  const { getError } = useApiError();

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071/api/v1';

  // Helper function to get access token
  async function getAccessToken(): Promise<string | null> {
    try {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
        const response = await msalInstance.acquireTokenSilent({
          scopes: [`api://${clientId}/access_as_user`],
          account: accounts[0],
        });
        return response.accessToken;
      }
    } catch (error) {
      logger.error('Failed to acquire token:', error);
    }
    return null;
  }

  // Create authenticated axios instance
  async function getAuthenticatedAxios() {
    const token = await getAccessToken();
    return axios.create({
      baseURL: API_BASE_URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  useEffect(() => {
    fetchVerificationStatus();
    // Poll for status updates every 5 seconds if verification is pending
    const interval = setInterval(() => {
      if (verificationStatus?.kvk_verification_status === 'pending') {
        fetchVerificationStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [legalEntityId]);

  const fetchVerificationStatus = async () => {
    try {
      const axiosInstance = await getAuthenticatedAxios();
      const response = await axiosInstance.get<KvkVerificationStatus>(
        `/legal-entities/${legalEntityId}/kvk-verification`
      );

      // Parse kvk_api_response if it's a JSON string
      const data = response.data;
      if (data.kvk_api_response && typeof data.kvk_api_response === 'string') {
        try {
          data.kvk_api_response = JSON.parse(data.kvk_api_response);
        } catch (e) {
          logger.warn('Failed to parse kvk_api_response:', e);
        }
      }

      setVerificationStatus(data);
      setLoading(false);
    } catch (error) {
      logger.error('Failed to fetch verification status:', error);
      setLoading(false);
    }
  };

  const handleUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // File type and size validation is handled by Dropzone props
    // This is a fallback check

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file, file.name);

      const axiosInstance = await getAuthenticatedAxios();
      const response = await axiosInstance.post(
        `/legal-entities/${legalEntityId}/kvk-document`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      logger.log('Upload response:', response.data);
      notification.showSuccess('Document uploaded successfully. Verification in progress...');

      // Refresh status after a short delay
      setTimeout(() => {
        fetchVerificationStatus();
      }, 2000);

      if (onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (error: unknown) {
      notification.showError(getError(error, 'uploading document'));
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { color: string; text: string } } = {
      pending: { color: 'warning', text: 'Pending Verification' },
      verified: { color: 'success', text: 'Verified' },
      failed: { color: 'error', text: 'Verification Failed' },
      flagged: { color: 'warning', text: 'Flagged for Review' },
    };

    const badge = badges[status] || { color: 'info', text: status };

    return <span className={`k-badge k-badge-${badge.color}`}>{badge.text}</span>;
  };

  // Type guard for KvK API response
  const getKvkApiData = (): KvkApiResponse | null => {
    const response = verificationStatus?.kvk_api_response;
    if (!response || typeof response === 'string') {
      return null;
    }
    return response;
  };

  const getCompanyStatus = (): { text: string; color: string; icon: string } => {
    const kvkData = getKvkApiData();
    if (!kvkData?.status) {
      return { text: 'Active', color: TEXT_COLORS.success, icon: '✓' };
    }

    if (kvkData.status === 'Faillissement') {
      return { text: 'Bankrupt', color: TEXT_COLORS.error, icon: '⚠' };
    }
    if (kvkData.status === 'Ontbonden') {
      return { text: 'Dissolved', color: TEXT_COLORS.error, icon: '⚠' };
    }
    return { text: 'Active', color: TEXT_COLORS.success, icon: '✓' };
  };

  const getFlagDescription = (flag: string): string => {
    const descriptions: { [key: string]: string } = {
      // Entered vs Extracted comparison flags
      entered_kvk_mismatch: 'Entered KvK number does not match extracted number from document',
      entered_name_mismatch: 'Entered company name does not match extracted name from document',

      // KvK API validation flags
      company_name_mismatch: 'Company name does not match KvK registry',
      kvk_number_mismatch: 'KvK number mismatch with registry',
      bankrupt: 'Company is bankrupt according to KvK',
      dissolved: 'Company is dissolved according to KvK',
      kvk_number_not_found: 'KvK number not found in registry',
      api_key_missing: 'KvK API key not configured',

      // Processing flags
      extraction_failed: 'Failed to extract data from document',
      processing_error: 'Error processing document',
      api_error: 'Failed to connect to KvK API',
    };

    return descriptions[flag] || flag;
  };

  const isEnteredDataMismatch = (flag: string): boolean => {
    return flag === 'entered_kvk_mismatch' || flag === 'entered_name_mismatch';
  };

  return (
    <LoadingState loading={loading} minHeight={400}>
      <div className="kvk-document-upload">
        <h3>KvK Document Verification</h3>

        {verificationStatus?.kvk_document_url ? (
          <div className="verification-status" style={{ marginBottom: '20px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}
            >
              <strong>Status:</strong> {getStatusBadge(verificationStatus.kvk_verification_status)}
            </div>

            {verificationStatus.kvk_verification_status === 'pending' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: TEXT_COLORS.muted,
                  marginBottom: '15px',
                }}
              >
                <Loader size="sm" />
                <span>Verifying document...</span>
              </div>
            )}

            {/* KvK Company Status - Prominent Display */}
            {getKvkApiData() && (
              <div
                style={{
                  marginBottom: '20px',
                  padding: '15px',
                  backgroundColor:
                    getCompanyStatus().color === TEXT_COLORS.success ? '#f0fdf4' : '#fef2f2',
                  border: `2px solid ${getCompanyStatus().color}`,
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.5em' }}>{getCompanyStatus().icon}</span>
                  <div>
                    <strong style={{ fontSize: '1.1em' }}>
                      Company Status (KvK Registry):{' '}
                      <span style={{ color: getCompanyStatus().color }}>
                        {getCompanyStatus().text}
                      </span>
                    </strong>
                    <div style={{ fontSize: '0.9em', color: TEXT_COLORS.muted, marginTop: '5px' }}>
                      {getKvkApiData()?.statutoryName}
                      {verificationStatus?.kvk_verified_at && (
                        <span style={{ marginLeft: '10px', fontSize: '0.95em' }}>
                          • Last verified: {formatDate(verificationStatus.kvk_verified_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3-Column Comparison Grid */}
            {(verificationStatus.kvk_extracted_company_name ||
              verificationStatus.kvk_extracted_number) && (
              <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <strong style={{ marginBottom: '10px', display: 'block', fontSize: '1.05em' }}>
                  Verification Details:
                </strong>

                {/* Legend - positioned ABOVE the table */}
                <div style={{ marginBottom: '12px', fontSize: '0.85em', color: TEXT_COLORS.muted }}>
                  <strong>Legend:</strong>{' '}
                  <span
                    style={{
                      backgroundColor: '#d4edda',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      marginRight: '10px',
                    }}
                  >
                    Data matches
                  </span>
                  <span
                    style={{
                      backgroundColor: '#fee2e2',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      marginRight: '10px',
                    }}
                  >
                    PDF doesn't match entered data
                  </span>
                  <span
                    style={{ backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '3px' }}
                  >
                    KvK doesn't match PDF
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th
                        style={{
                          padding: '10px',
                          textAlign: 'left',
                          fontWeight: 600,
                          width: '15%',
                        }}
                      >
                        Field
                      </th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>
                        Entered by User
                      </th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>
                        From PDF
                      </th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>
                        KvK Registry
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Company Name Row */}
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px', fontWeight: 500, backgroundColor: '#fafafa' }}>
                        Company Name
                      </td>
                      <td style={{ padding: '10px' }}>
                        {verificationStatus.entered_company_name || (
                          <span style={{ color: TEXT_COLORS.muted, fontStyle: 'italic' }}>—</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '10px',
                          backgroundColor: verificationStatus.kvk_mismatch_flags?.includes(
                            'entered_name_mismatch'
                          )
                            ? '#fee2e2' // Red for mismatch
                            : verificationStatus.kvk_extracted_company_name &&
                                verificationStatus.entered_company_name
                              ? '#d4edda' // Green for match
                              : 'inherit',
                        }}
                      >
                        {verificationStatus.kvk_extracted_company_name || (
                          <span style={{ color: TEXT_COLORS.muted, fontStyle: 'italic' }}>—</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '10px',
                          backgroundColor: verificationStatus.kvk_mismatch_flags?.includes(
                            'company_name_mismatch'
                          )
                            ? '#fef3c7' // Yellow for KvK mismatch
                            : getKvkApiData()?.statutoryName &&
                                verificationStatus.kvk_extracted_company_name
                              ? '#d4edda' // Green for match
                              : 'inherit',
                        }}
                      >
                        {getKvkApiData()?.statutoryName || (
                          <span style={{ color: TEXT_COLORS.muted, fontStyle: 'italic' }}>—</span>
                        )}
                      </td>
                    </tr>

                    {/* KvK Number Row */}
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px', fontWeight: 500, backgroundColor: '#fafafa' }}>
                        KvK Number
                      </td>
                      <td style={{ padding: '10px' }}>
                        {verificationStatus.entered_kvk_number || (
                          <span style={{ color: TEXT_COLORS.muted, fontStyle: 'italic' }}>—</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '10px',
                          backgroundColor: verificationStatus.kvk_mismatch_flags?.includes(
                            'entered_kvk_mismatch'
                          )
                            ? '#fee2e2' // Red for mismatch
                            : verificationStatus.kvk_extracted_number &&
                                verificationStatus.entered_kvk_number
                              ? '#d4edda' // Green for match
                              : 'inherit',
                        }}
                      >
                        {verificationStatus.kvk_extracted_number || (
                          <span style={{ color: TEXT_COLORS.muted, fontStyle: 'italic' }}>—</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '10px',
                          backgroundColor: verificationStatus.kvk_mismatch_flags?.includes(
                            'kvk_number_mismatch'
                          )
                            ? '#fef3c7' // Yellow for KvK mismatch
                            : getKvkApiData()?.kvkNumber && verificationStatus.kvk_extracted_number
                              ? '#d4edda' // Green for match
                              : 'inherit',
                        }}
                      >
                        {getKvkApiData()?.kvkNumber || (
                          <span style={{ color: TEXT_COLORS.muted, fontStyle: 'italic' }}>—</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Issues Summary - Only show if there are validation flags */}
            {verificationStatus.kvk_mismatch_flags &&
              verificationStatus.kvk_mismatch_flags.length > 0 && (
                <div style={{ marginTop: '15px', marginBottom: '15px' }}>
                  <strong style={{ display: 'block', marginBottom: '8px', fontSize: '1.05em' }}>
                    ⚠️ Validation Issues:
                  </strong>
                  <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                    {verificationStatus.kvk_mismatch_flags.map((flag, idx) => (
                      <li
                        key={idx}
                        style={{ color: isEnteredDataMismatch(flag) ? '#dc2626' : '#f59e0b' }}
                      >
                        {getFlagDescription(flag)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {verificationStatus.kvk_verification_notes && (
              <div style={{ marginTop: '10px' }}>
                <strong>Admin Notes:</strong>
                <div
                  style={{
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    marginTop: '5px',
                  }}
                >
                  {verificationStatus.kvk_verification_notes}
                </div>
              </div>
            )}

            {verificationStatus.kvk_verified_at && (
              <div style={{ marginTop: '10px', fontSize: '0.9em', color: TEXT_COLORS.muted }}>
                Verified: {formatDateTime(verificationStatus.kvk_verified_at)}
                {verificationStatus.kvk_verified_by && ` by ${verificationStatus.kvk_verified_by}`}
              </div>
            )}

            <div style={{ marginTop: '15px' }}>
              <a
                href={verificationStatus.kvk_document_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button color="cyan" size="sm">
                  View Uploaded Document
                </Button>
              </a>
            </div>

            <div style={{ marginTop: '10px' }}>
              <Button color="blue" size="sm" onClick={() => setVerificationStatus(null)}>
                Upload New Document
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p>Upload a KvK (Chamber of Commerce) statement to verify company details.</p>

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
              disabled={uploading}
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
              <div
                style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <Loader size="sm" />
                <span>Uploading and verifying document...</span>
              </div>
            )}

            <div style={{ marginTop: '15px', fontSize: '0.9em', color: TEXT_COLORS.muted }}>
              <strong>Requirements:</strong>
              <ul>
                <li>PDF format only</li>
                <li>Maximum file size: 10MB</li>
                <li>Must contain KvK number and company name</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </LoadingState>
  );
};
