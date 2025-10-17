import { Button } from '@progress/kendo-react-buttons';
import { Loader } from '@progress/kendo-react-indicators';
import { Notification, NotificationGroup } from '@progress/kendo-react-notification';
import { Upload } from '@progress/kendo-react-upload';
import axios from 'axios';
import type React from 'react';
import { useEffect, useState } from 'react';
import { msalInstance } from '../auth/AuthContext';

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

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:7071/api/v1';

  // Helper function to get access token
  async function getAccessToken(): Promise<string | null> {
    try {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        const clientId = process.env.REACT_APP_AZURE_CLIENT_ID;
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
      setVerificationStatus(response.data);
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

      // Processing flags
      extraction_failed: 'Failed to extract data from document',
      processing_error: 'Error processing document',
      api_error: 'KvK API error',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <strong>Status:</strong> {getStatusBadge(verificationStatus.kvk_verification_status)}
          </div>

          {verificationStatus.kvk_verification_status === 'pending' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#666' }}>
              <Loader size="small" />
              <span>Verifying document...</span>
            </div>
          )}

          {/* Comparison Grid */}
          {(verificationStatus.kvk_extracted_company_name ||
            verificationStatus.kvk_extracted_number) && (
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <strong style={{ marginBottom: '10px', display: 'block' }}>Data Comparison:</strong>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95em' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Field</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>
                      Entered Value
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>
                      Extracted Value
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: 600,
                        width: '100px',
                      }}
                    >
                      Match
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Company Name Row */}
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>Company Name</td>
                    <td style={{ padding: '12px' }}>
                      {verificationStatus.entered_company_name || (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>Not entered</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {verificationStatus.kvk_extracted_company_name || (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>Not extracted</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {verificationStatus.kvk_mismatch_flags?.includes('entered_name_mismatch') ? (
                        <span style={{ color: '#dc2626', fontSize: '1.5em', fontWeight: 'bold' }}>
                          ✗
                        </span>
                      ) : (
                        <span style={{ color: '#10b981', fontSize: '1.5em', fontWeight: 'bold' }}>
                          ✓
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* KvK Number Row */}
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>KvK Number</td>
                    <td style={{ padding: '12px' }}>
                      {verificationStatus.entered_kvk_number || (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>Not entered</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {verificationStatus.kvk_extracted_number || (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>Not extracted</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {verificationStatus.kvk_mismatch_flags?.includes('entered_kvk_mismatch') ? (
                        <span style={{ color: '#dc2626', fontSize: '1.5em', fontWeight: 'bold' }}>
                          ✗
                        </span>
                      ) : (
                        <span style={{ color: '#10b981', fontSize: '1.5em', fontWeight: 'bold' }}>
                          ✓
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {verificationStatus.kvk_extracted_company_name && (
            <div style={{ marginTop: '10px' }}>
              <strong>Extracted Company Name:</strong>{' '}
              {verificationStatus.kvk_extracted_company_name}
            </div>
          )}

          {verificationStatus.kvk_extracted_number && (
            <div style={{ marginTop: '5px' }}>
              <strong>Extracted KvK Number:</strong> {verificationStatus.kvk_extracted_number}
            </div>
          )}

          {verificationStatus.kvk_mismatch_flags &&
            verificationStatus.kvk_mismatch_flags.length > 0 && (
              <div
                style={{
                  marginTop: '15px',
                  padding: '10px',
                  backgroundColor: verificationStatus.kvk_mismatch_flags.some(isEnteredDataMismatch)
                    ? '#ffe5e5' // Red tint for entered data mismatches
                    : '#fff3cd', // Yellow for other issues
                  borderRadius: '4px',
                  border: verificationStatus.kvk_mismatch_flags.some(isEnteredDataMismatch)
                    ? '2px solid #ff9999'
                    : '1px solid #ffc107',
                }}
              >
                <strong>
                  {verificationStatus.kvk_mismatch_flags.some(isEnteredDataMismatch)
                    ? '⚠️ Entered Data Mismatch Detected:'
                    : 'Issues Detected:'}
                </strong>
                <ul style={{ marginTop: '5px', marginBottom: 0 }}>
                  {verificationStatus.kvk_mismatch_flags.map((flag, idx) => (
                    <li
                      key={idx}
                      style={{
                        fontWeight: isEnteredDataMismatch(flag) ? 'bold' : 'normal',
                        color: isEnteredDataMismatch(flag) ? '#d32f2f' : 'inherit',
                      }}
                    >
                      {getFlagDescription(flag)}
                    </li>
                  ))}
                </ul>
                {verificationStatus.kvk_mismatch_flags.some(isEnteredDataMismatch) && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      fontSize: '0.9em',
                    }}
                  >
                    <strong>ℹ️ What this means:</strong>
                    <p style={{ margin: '5px 0 0 0' }}>
                      The KvK number or company name you entered manually does not match what was
                      extracted from the uploaded document. Please verify the information is correct
                      or contact an administrator for review.
                    </p>
                  </div>
                )}
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
