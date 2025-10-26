import { Button } from '@progress/kendo-react-buttons';
import { Loader } from '@progress/kendo-react-indicators';
import { Notification, NotificationGroup } from '@progress/kendo-react-notification';
import { Upload } from '@progress/kendo-react-upload';
import axios from 'axios';
import type React from 'react';
import { useEffect, useState } from 'react';
import { msalInstance } from '../auth/AuthContext';

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
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

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
      console.error('Failed to acquire token:', error);
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
          console.warn('Failed to parse kvk_api_response:', e);
        }
      }

      setVerificationStatus(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch verification status:', error);
      setLoading(false);
    }
  };

  const handleUpload = async (event: any) => {
    const files = event.affectedFiles || event.newState || [];
    if (!files || files.length === 0) return;

    // Prevent default upload behavior
    event.preventDefault?.();

    const fileInfo = files[0];
    const file = fileInfo.getRawFile ? fileInfo.getRawFile() : fileInfo;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setNotification({ type: 'error', message: 'Only PDF files are allowed' });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setNotification({ type: 'error', message: 'File size must be less than 10MB' });
      return;
    }

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

      console.log('Upload response:', response.data);
      setNotification({
        type: 'success',
        message: 'Document uploaded successfully. Verification in progress...',
      });

      // Refresh status after a short delay
      setTimeout(() => {
        fetchVerificationStatus();
      }, 2000);

      if (onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      console.error('Error response:', error.response?.data);
      setNotification({
        type: 'error',
        message: error.response?.data?.error || 'Failed to upload document',
      });
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
      return { text: 'Active', color: '#10b981', icon: '✓' };
    }

    if (kvkData.status === 'Faillissement') {
      return { text: 'Bankrupt', color: '#dc2626', icon: '⚠' };
    }
    if (kvkData.status === 'Ontbonden') {
      return { text: 'Dissolved', color: '#dc2626', icon: '⚠' };
    }
    return { text: 'Active', color: '#10b981', icon: '✓' };
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

  if (loading) {
    return <Loader size="large" />;
  }

  return (
    <div className="kvk-document-upload">
      <h3>KvK Document Verification</h3>

      {notification && (
        <NotificationGroup
          style={{ right: 0, top: 0, alignItems: 'flex-end', flexWrap: 'wrap-reverse' }}
        >
          <Notification
            type={{ style: notification.type, icon: true }}
            closable={true}
            onClose={() => setNotification(null)}
          >
            <span>{notification.message}</span>
          </Notification>
        </NotificationGroup>
      )}

      {verificationStatus?.kvk_document_url ? (
        <div className="verification-status" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <strong>Status:</strong> {getStatusBadge(verificationStatus.kvk_verification_status)}
          </div>

          {verificationStatus.kvk_verification_status === 'pending' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#666', marginBottom: '15px' }}>
              <Loader size="small" />
              <span>Verifying document...</span>
            </div>
          )}

          {/* KvK Company Status - Prominent Display */}
          {getKvkApiData() && (
            <div
              style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: getCompanyStatus().color === '#10b981' ? '#f0fdf4' : '#fef2f2',
                border: `2px solid ${getCompanyStatus().color}`,
                borderRadius: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.5em' }}>{getCompanyStatus().icon}</span>
                <div>
                  <strong style={{ fontSize: '1.1em' }}>
                    Company Status (KvK Registry):{' '}
                    <span style={{ color: getCompanyStatus().color }}>{getCompanyStatus().text}</span>
                  </strong>
                  <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                    {getKvkApiData()?.statutoryName}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3-Column Comparison Grid */}
          {(verificationStatus.kvk_extracted_company_name || verificationStatus.kvk_extracted_number) && (
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <strong style={{ marginBottom: '10px', display: 'block', fontSize: '1.05em' }}>
                Verification Details:
              </strong>

              {/* Legend - positioned ABOVE the table */}
              <div style={{ marginBottom: '12px', fontSize: '0.85em', color: '#666' }}>
                <strong>Legend:</strong>{' '}
                <span style={{ backgroundColor: '#d4edda', padding: '2px 6px', borderRadius: '3px', marginRight: '10px' }}>
                  Data matches
                </span>
                <span style={{ backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '3px', marginRight: '10px' }}>
                  PDF doesn't match entered data
                </span>
                <span style={{ backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '3px' }}>
                  KvK doesn't match PDF
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, width: '15%' }}>
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
                        <span style={{ color: '#999', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        backgroundColor:
                          verificationStatus.kvk_mismatch_flags?.includes('entered_name_mismatch')
                            ? '#fee2e2'  // Red for mismatch
                            : verificationStatus.kvk_extracted_company_name && verificationStatus.entered_company_name
                            ? '#d4edda'  // Green for match
                            : 'inherit',
                      }}
                    >
                      {verificationStatus.kvk_extracted_company_name || (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        backgroundColor:
                          verificationStatus.kvk_mismatch_flags?.includes('company_name_mismatch')
                            ? '#fef3c7'  // Yellow for KvK mismatch
                            : getKvkApiData()?.statutoryName && verificationStatus.kvk_extracted_company_name
                            ? '#d4edda'  // Green for match
                            : 'inherit',
                      }}
                    >
                      {getKvkApiData()?.statutoryName || (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>—</span>
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
                        <span style={{ color: '#999', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        backgroundColor:
                          verificationStatus.kvk_mismatch_flags?.includes('entered_kvk_mismatch')
                            ? '#fee2e2'  // Red for mismatch
                            : verificationStatus.kvk_extracted_number && verificationStatus.entered_kvk_number
                            ? '#d4edda'  // Green for match
                            : 'inherit',
                      }}
                    >
                      {verificationStatus.kvk_extracted_number || (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        backgroundColor:
                          verificationStatus.kvk_mismatch_flags?.includes('kvk_number_mismatch')
                            ? '#fef3c7'  // Yellow for KvK mismatch
                            : getKvkApiData()?.kvkNumber && verificationStatus.kvk_extracted_number
                            ? '#d4edda'  // Green for match
                            : 'inherit',
                      }}
                    >
                      {getKvkApiData()?.kvkNumber || (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Issues Summary - Only show if there are validation flags */}
          {verificationStatus.kvk_mismatch_flags && verificationStatus.kvk_mismatch_flags.length > 0 && (
            <div style={{ marginTop: '15px', marginBottom: '15px' }}>
              <strong style={{ display: 'block', marginBottom: '8px', fontSize: '1.05em' }}>
                ⚠️ Validation Issues:
              </strong>
              <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                {verificationStatus.kvk_mismatch_flags.map((flag, idx) => (
                  <li key={idx} style={{ color: isEnteredDataMismatch(flag) ? '#dc2626' : '#f59e0b' }}>
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
            <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
              Verified: {new Date(verificationStatus.kvk_verified_at).toLocaleString()}
              {verificationStatus.kvk_verified_by && ` by ${verificationStatus.kvk_verified_by}`}
            </div>
          )}

          <div style={{ marginTop: '15px' }}>
            <a href={verificationStatus.kvk_document_url} target="_blank" rel="noopener noreferrer">
              <Button themeColor="info" size="small">
                View Uploaded Document
              </Button>
            </a>
          </div>

          <div style={{ marginTop: '10px' }}>
            <Button themeColor="primary" size="small" onClick={() => setVerificationStatus(null)}>
              Upload New Document
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p>Upload a KvK (Chamber of Commerce) statement to verify company details.</p>

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
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Loader size="small" />
              <span>Uploading and verifying document...</span>
            </div>
          )}

          <div style={{ marginTop: '15px', fontSize: '0.9em', color: '#666' }}>
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
  );
};
