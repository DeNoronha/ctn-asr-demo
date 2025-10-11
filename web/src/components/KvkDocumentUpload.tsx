import React, { useState, useEffect } from 'react';
import { Upload } from '@progress/kendo-react-upload';
import { Button } from '@progress/kendo-react-buttons';
import { Notification, NotificationGroup } from '@progress/kendo-react-notification';
import { Loader } from '@progress/kendo-react-indicators';
import axios from 'axios';

interface KvkVerificationStatus {
  kvk_document_url: string | null;
  kvk_verification_status: string;
  kvk_verified_at: string | null;
  kvk_verified_by: string | null;
  kvk_verification_notes: string | null;
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
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:7071/api/v1';

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
      const response = await axios.get<KvkVerificationStatus>(
        `${API_BASE_URL}/legal-entities/${legalEntityId}/kvk-verification`
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

      const response = await axios.post(
        `${API_BASE_URL}/legal-entities/${legalEntityId}/kvk-document`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('Upload response:', response.data);
      setNotification({ type: 'success', message: 'Document uploaded successfully. Verification in progress...' });
      
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
        message: error.response?.data?.error || 'Failed to upload document' 
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

    return (
      <span className={`k-badge k-badge-${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getFlagDescription = (flag: string): string => {
    const descriptions: { [key: string]: string } = {
      company_name_mismatch: 'Company name does not match KvK registry',
      kvk_number_mismatch: 'KvK number mismatch',
      bankrupt: 'Company is bankrupt',
      dissolved: 'Company is dissolved',
      kvk_number_not_found: 'KvK number not found in registry',
      extraction_failed: 'Failed to extract data from document',
      processing_error: 'Error processing document',
      api_error: 'KvK API error',
    };

    return descriptions[flag] || flag;
  };

  if (loading) {
    return <Loader size="large" />;
  }

  return (
    <div className="kvk-document-upload">
      <h3>KvK Document Verification</h3>

      {notification && (
        <NotificationGroup style={{ right: 0, top: 0, alignItems: 'flex-end', flexWrap: 'wrap-reverse' }}>
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

          {verificationStatus.kvk_extracted_company_name && (
            <div style={{ marginTop: '10px' }}>
              <strong>Extracted Company Name:</strong> {verificationStatus.kvk_extracted_company_name}
            </div>
          )}

          {verificationStatus.kvk_extracted_number && (
            <div style={{ marginTop: '5px' }}>
              <strong>Extracted KvK Number:</strong> {verificationStatus.kvk_extracted_number}
            </div>
          )}

          {verificationStatus.kvk_mismatch_flags && verificationStatus.kvk_mismatch_flags.length > 0 && (
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
              <strong>Issues Detected:</strong>
              <ul style={{ marginTop: '5px', marginBottom: 0 }}>
                {verificationStatus.kvk_mismatch_flags.map((flag, idx) => (
                  <li key={idx}>{getFlagDescription(flag)}</li>
                ))}
              </ul>
            </div>
          )}

          {verificationStatus.kvk_verification_notes && (
            <div style={{ marginTop: '10px' }}>
              <strong>Admin Notes:</strong>
              <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px', marginTop: '5px' }}>
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
            <Button
              themeColor="primary"
              size="small"
              onClick={() => setVerificationStatus(null)}
            >
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
