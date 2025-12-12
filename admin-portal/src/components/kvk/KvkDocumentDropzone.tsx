import { Group, Loader, Text } from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import type React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { TEXT_COLORS } from '../../utils/colors';
import { CheckCircle, FileText, XCircle } from '../icons';

interface KvkDocumentDropzoneProps {
  onUpload: (files: File[]) => void;
  uploading: boolean;
}

export const KvkDocumentDropzone: React.FC<KvkDocumentDropzoneProps> = ({
  onUpload,
  uploading,
}) => {
  const notification = useNotification();

  return (
    <div>
      <p>Upload a Chamber of Commerce (CoC) statement to verify company details.</p>

      <Dropzone
        onDrop={onUpload}
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
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Loader size="sm" />
          <span>Uploading and verifying document...</span>
        </div>
      )}

      <div style={{ marginTop: '15px', fontSize: '0.9em', color: TEXT_COLORS.muted }}>
        <strong>Requirements:</strong>
        <ul>
          <li>PDF format only</li>
          <li>Maximum file size: 10MB</li>
          <li>Must contain CoC registration number and company name</li>
        </ul>
      </div>
    </div>
  );
};
