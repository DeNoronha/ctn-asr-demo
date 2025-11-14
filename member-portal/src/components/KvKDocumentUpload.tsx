/**
 * KvK Document Upload Component
 * Drag-and-drop file upload for KvK extracts
 */

import { Button } from '@mantine/core';
import type React from 'react';
import { useRef, useState } from 'react';

import { AlertTriangle, CheckCircle, FileText, Upload, XCircle } from './icons';

interface KvKDocumentUploadProps {
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const ACCEPTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

export const KvKDocumentUpload: React.FC<KvKDocumentUploadProps> = ({
  onFileSelect,
  disabled = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Invalid file type. Please upload a PDF or image file (${ACCEPTED_EXTENSIONS.join(', ')})`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 10MB. Please upload a smaller file.';
    }

    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      onFileSelect(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
    onFileSelect(file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    if (disabled) return;

    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleButtonClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    onFileSelect(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <div className="kvk-document-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        onChange={handleChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {!selectedFile ? (
        <div
          className={`upload-dropzone ${dragActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <Upload size={48} />
          <h4>Drag and drop your KvK extract here</h4>
          <p>or click to browse</p>
          <p className="file-types">Accepted: PDF, PNG, JPG (max 10MB)</p>
        </div>
      ) : (
        <div className="file-preview">
          <div className="file-info">
            <div className="file-icon">
              {selectedFile.type === 'application/pdf' ? (
                <FileText size={32} />
              ) : (
                preview && <img src={preview} alt="Document preview" className="image-preview" />
              )}
            </div>
            <div className="file-details">
              <div className="file-name">{selectedFile.name}</div>
              <div className="file-meta">
                {formatFileSize(selectedFile.size)} •{' '}
                {selectedFile.type.split('/')[1].toUpperCase()}
              </div>
              <div className="file-status">
                <CheckCircle size={16} />
                <span>Ready to upload</span>
              </div>
            </div>
            <Button variant="subtle" onClick={handleClear} disabled={disabled} title="Remove file">
              <XCircle size={20} />
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="upload-error">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <style>{`
        .kvk-document-upload {
          width: 100%;
        }

        .upload-dropzone {
          border: 2px dashed #cbd5e0;
          border-radius: 8px;
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .upload-dropzone:hover:not(.disabled) {
          border-color: #667eea;
          background: #f7fafc;
        }

        .upload-dropzone.active {
          border-color: #667eea;
          background: #edf2ff;
        }

        .upload-dropzone.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .upload-dropzone h4 {
          margin: 16px 0 8px 0;
          color: #333;
          font-size: 16px;
          font-weight: 500;
        }

        .upload-dropzone p {
          margin: 4px 0;
          color: #666;
          font-size: 14px;
        }

        .upload-dropzone .file-types {
          font-size: 12px;
          color: #999;
          margin-top: 12px;
        }

        .file-preview {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          background: white;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .file-icon {
          flex-shrink: 0;
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f4ff;
          border-radius: 8px;
          color: #667eea;
        }

        .image-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 4px;
        }

        .file-details {
          flex: 1;
        }

        .file-name {
          font-size: 14px;
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
          word-break: break-word;
        }

        .file-meta {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }

        .file-status {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #10b981;
          font-size: 12px;
        }

        .upload-error {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 12px;
          background: #fee2e2;
          border-radius: 6px;
          color: #dc2626;
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .upload-dropzone {
            padding: 32px 16px;
          }

          .upload-dropzone h4 {
            font-size: 14px;
          }

          .file-info {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};
