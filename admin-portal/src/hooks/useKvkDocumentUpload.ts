import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useApiError } from '../hooks/useApiError';
import { getAccessToken } from '../utils/auth';
import { logger } from '../utils/logger';

interface KvkApiResponse {
  kvkNumber: string;
  statutoryName: string;
  status?: string;
  tradeNames?: {
    businessName: string;
  };
}

export interface KvkVerificationStatus {
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

interface UseKvkDocumentUploadOptions {
  legalEntityId: string;
  onVerificationComplete?: () => void;
}

export const useKvkDocumentUpload = ({
  legalEntityId,
  onVerificationComplete,
}: UseKvkDocumentUploadOptions) => {
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<KvkVerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const notification = useNotification();
  const { getError } = useApiError();

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071/api/v1';

  // Create authenticated axios instance
  async function getAuthenticatedAxios() {
    const token = await getAccessToken();
    return axios.create({
      baseURL: API_BASE_URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

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

  const resetVerificationStatus = () => {
    setVerificationStatus(null);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: Fetch function and status check are stable, polling interval should run on mount
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

  return {
    uploading,
    verificationStatus,
    loading,
    handleUpload,
    fetchVerificationStatus,
    resetVerificationStatus,
  };
};
