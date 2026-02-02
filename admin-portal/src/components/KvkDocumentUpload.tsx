import type React from 'react';
import { useKvkDocumentUpload } from '../hooks/useKvkDocumentUpload';
import { KvkDocumentDropzone } from './kvk/KvkDocumentDropzone';
import { KvkVerificationDisplay } from './kvk/KvkVerificationDisplay';
import { LoadingState } from './shared/LoadingState';

interface KvkDocumentUploadProps {
  legalEntityId: string;
  onVerificationComplete?: () => void;
}

export const KvkDocumentUpload: React.FC<KvkDocumentUploadProps> = ({
  legalEntityId,
  onVerificationComplete,
}) => {
  const {
    uploading,
    verificationStatus,
    verificationHistory,
    loading,
    reviewingStatus,
    handleUpload,
    resetVerificationStatus,
    reviewVerification,
    triggerReVerification,
  } = useKvkDocumentUpload({
    legalEntityId,
    onVerificationComplete,
  });

  return (
    <LoadingState loading={loading} minHeight={400}>
      <div className="kvk-document-upload">
        <h3>Chamber of Commerce Document Verification</h3>

        {verificationStatus?.kvk_document_url ? (
          <KvkVerificationDisplay
            verificationStatus={verificationStatus}
            verificationHistory={verificationHistory}
            onUploadNew={resetVerificationStatus}
            onReviewVerification={reviewVerification}
            onTriggerReVerification={triggerReVerification}
            reviewingStatus={reviewingStatus}
          />
        ) : (
          <KvkDocumentDropzone onUpload={handleUpload} uploading={uploading} />
        )}
      </div>
    </LoadingState>
  );
};
