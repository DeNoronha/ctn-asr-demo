import { Badge, Button, FileButton, Group, Text } from '@mantine/core';
import type React from 'react';
import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { ComponentProps } from '../types';
import { FileCheck, Upload } from './icons';
import { LoadingState } from './shared/LoadingState';

interface KvkVerificationStatus {
  kvk_document_url: string | null;
  kvk_verification_status: string;
  kvk_verified_at: string | null;
  kvk_verification_notes: string | null;
  entered_company_name: string | null;
  entered_kvk_number: string | null;
  kvk_extracted_company_name: string | null;
  kvk_extracted_number: string | null;
  kvk_mismatch_flags: string[] | null;
  document_uploaded_at: string | null;
}

export const KvKDocumentView: React.FC<ComponentProps> = ({
  memberData,
  onNotification,
  onDataChange,
}) => {
  const [verificationStatus, setVerificationStatus] = useState<KvkVerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadVerificationStatus();
  }, [memberData.legalEntityId]);

  const loadVerificationStatus = async () => {
    if (!memberData.legalEntityId) return;

    setLoading(true);
    try {
      const data = await apiClient.member.getKvkVerificationStatus(memberData.legalEntityId);
      setVerificationStatus(data);
    } catch (error) {
      console.error('Error loading KvK verification status:', error);
      onNotification('Failed to load KvK verification status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File | null) => {
    if (!file || !memberData.legalEntityId) return;

    setUploading(true);
    try {
      await apiClient.member.uploadKvkDocument(memberData.legalEntityId, file);
      onNotification('Document uploaded successfully. Verification in progress...', 'success');
      // Refresh status after a short delay
      setTimeout(() => {
        loadVerificationStatus();
        onDataChange();
      }, 2000);
    } catch (error) {
      console.error('Error uploading document:', error);
      onNotification('Failed to upload document', 'error');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'green';
      case 'pending':
        return 'yellow';
      case 'flagged':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <div className="kvk-document-view">
      <div className="page-header">
        <div>
          <h2>KvK Document Verification</h2>
          <p className="page-subtitle">Upload your Chamber of Commerce registration document</p>
        </div>
      </div>

      <div className="card">
        <LoadingState loading={loading} minHeight={300}>
          {verificationStatus?.kvk_document_url ? (
            <div>
              <Group gap="md" style={{ marginBottom: '24px' }}>
                <FileCheck size={48} style={{ color: '#2563eb' }} />
                <div>
                  <Text size="lg" fw={600}>
                    Document Uploaded
                  </Text>
                  <Text size="sm" c="dimmed">
                    {verificationStatus.document_uploaded_at
                      ? new Date(verificationStatus.document_uploaded_at).toLocaleDateString()
                      : 'Upload date unknown'}
                  </Text>
                </div>
                <Badge
                  color={getStatusColor(verificationStatus.kvk_verification_status)}
                  variant="light"
                  size="lg"
                  style={{ marginLeft: 'auto' }}
                >
                  {verificationStatus.kvk_verification_status?.toUpperCase() || 'UNKNOWN'}
                </Badge>
              </Group>

              {verificationStatus.kvk_extracted_number && (
                <div style={{ marginBottom: '16px' }}>
                  <Text size="sm" fw={600} style={{ marginBottom: '8px' }}>
                    Extracted Information
                  </Text>
                  <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                    <Text size="sm">
                      <strong>KvK Number:</strong> {verificationStatus.kvk_extracted_number}
                    </Text>
                    {verificationStatus.kvk_extracted_company_name && (
                      <Text size="sm" style={{ marginTop: '4px' }}>
                        <strong>Company Name:</strong>{' '}
                        {verificationStatus.kvk_extracted_company_name}
                      </Text>
                    )}
                  </div>
                </div>
              )}

              {verificationStatus.kvk_verification_status === 'pending' && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px',
                    background: '#fef3c7',
                    borderRadius: '8px',
                  }}
                >
                  <Text size="sm" fw={500} style={{ color: '#92400e' }}>
                    Your document is awaiting admin verification. You will be notified once it has been reviewed.
                  </Text>
                </div>
              )}

              {verificationStatus.kvk_verification_status === 'verified' &&
                verificationStatus.kvk_verified_at && (
                  <div style={{ marginBottom: '16px' }}>
                    <Text size="sm" c="dimmed">
                      Verified on{' '}
                      {new Date(verificationStatus.kvk_verified_at).toLocaleDateString()}
                    </Text>
                  </div>
                )}

              {verificationStatus.kvk_verification_notes && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px',
                    background: '#fef3c7',
                    borderRadius: '8px',
                  }}
                >
                  <Text size="sm" fw={600} style={{ marginBottom: '4px' }}>
                    Notes
                  </Text>
                  <Text size="sm">{verificationStatus.kvk_verification_notes}</Text>
                </div>
              )}

              {verificationStatus.kvk_mismatch_flags &&
                verificationStatus.kvk_mismatch_flags.length > 0 && (
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '12px',
                      background: '#fee2e2',
                      borderRadius: '8px',
                    }}
                  >
                    <Text size="sm" fw={600} style={{ marginBottom: '4px' }}>
                      Verification Issues
                    </Text>
                    {verificationStatus.kvk_mismatch_flags.map((flag: string, index: number) => (
                      <Text key={index} size="sm">
                        • {flag}
                      </Text>
                    ))}
                  </div>
                )}

              <FileButton onChange={handleUpload} accept="application/pdf,image/*">
                {(props) => (
                  <Button {...props} variant="outline" disabled={uploading}>
                    <Upload size={16} /> Upload New Document
                  </Button>
                )}
              </FileButton>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#f9fafb',
                borderRadius: '8px',
              }}
            >
              <FileCheck size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
              <p style={{ fontSize: '1.125rem', fontWeight: 500, margin: '8px 0' }}>
                No KvK Document Uploaded
              </p>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                Upload your Chamber of Commerce registration document to verify your organization
              </p>
              <FileButton onChange={handleUpload} accept="application/pdf,image/*">
                {(props) => (
                  <Button {...props} color="blue" disabled={uploading}>
                    <Upload size={16} />{' '}
                    {uploading ? 'Uploading...' : 'Upload KvK Document'}
                  </Button>
                )}
              </FileButton>
            </div>
          )}
        </LoadingState>
      </div>
    </div>
  );
};
