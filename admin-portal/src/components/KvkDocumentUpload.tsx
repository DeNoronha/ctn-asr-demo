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
  const { uploading, verificationStatus, loading, handleUpload, resetVerificationStatus } =
    useKvkDocumentUpload({
      legalEntityId,
      onVerificationComplete,
    });

  return (
    <LoadingState loading={loading} minHeight={400}>
      <div className="kvk-document-upload">
        <h3>KvK Document Verification</h3>

        {verificationStatus?.kvk_document_url ? (
          <KvkVerificationDisplay
            verificationStatus={verificationStatus}
            onUploadNew={resetVerificationStatus}
          />
        ) : (
          <KvkDocumentDropzone onUpload={handleUpload} uploading={uploading} />
        )}
      </div>
    </LoadingState>
  );
};
