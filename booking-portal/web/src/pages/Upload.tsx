import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

type ProcessingStage = 'queued' | 'uploading' | 'extracting_text' | 'classifying' | 'analyzing_with_claude' | 'storing' | 'completed' | 'failed';

interface ProcessingJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stage: ProcessingStage;
  progress: number;
  result?: any;
  error?: {
    message: string;
    stage: ProcessingStage;
  };
}

const Upload: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedBooking, setUploadedBooking] = useState<any>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('queued');
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Poll job status
  useEffect(() => {
    if (!jobId) {
      return;
    }

    const pollJobStatus = async () => {
      try {
        const response = await axios.get<ProcessingJob>(`/api/v1/jobs/${jobId}`);
        const job = response.data;

        setProcessingStage(job.stage);
        setProgress(job.progress);

        if (job.status === 'completed' && job.result) {
          // Processing completed successfully
          setUploading(false);
          setUploadedBooking(job.result.documents?.[0] || job.result);

          // Stop polling
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          setJobId(null);

          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else if (job.status === 'failed' && job.error) {
          // Processing failed
          setUploading(false);
          alert(`Processing failed: ${job.error.message}`);

          // Stop polling
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          setJobId(null);
        }
      } catch (error: any) {
        console.error('Failed to fetch job status:', error);

        // If job not found or error, stop polling
        if (error.response?.status === 404) {
          setUploading(false);
          alert('Processing job not found. Please try uploading again.');

          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          setJobId(null);
        }
      }
    };

    // Poll immediately
    pollJobStatus();

    // Then poll every 2 seconds
    const interval = setInterval(pollJobStatus, 2000);
    setPollingInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [jobId]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    const allowedExtensions = ['.pdf', '.xlsx', '.msg', '.eml'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      alert(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
      event.target.value = ''; // Reset input
      return;
    }

    // Validate file size (10MB max)
    const maxFileSize = 10485760; // 10MB in bytes
    if (file.size > maxFileSize) {
      alert(`File size exceeds maximum of 10MB. File size: ${(file.size / 1048576).toFixed(2)}MB`);
      event.target.value = ''; // Reset input
      return;
    }

    setUploading(true);
    setProgress(0);
    setProcessingStage('queued');
    setUploadedBooking(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Upload and get jobId
      const response = await axios.post('/api/v1/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { jobId: newJobId } = response.data;

      if (!newJobId) {
        throw new Error('No jobId returned from upload');
      }

      // Start polling for job status
      setJobId(newJobId);

    } catch (error: any) {
      console.error('Upload failed:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
      const errorDetails = error.response?.data?.details || '';

      alert(`Upload failed: ${errorMessage}\n${errorDetails}`);
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h2>Upload Transport Document</h2>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Upload Instructions</h3>
        <ul style={{ marginLeft: '24px', marginBottom: '24px', color: '#64748b' }}>
          <li>Supported formats: PDF, Excel (.xlsx), Email (.msg, .eml)</li>
          <li>Maximum file size: 10MB</li>
          <li>The system will automatically extract booking data using AI</li>
          <li>Review and validate the extracted data after upload</li>
        </ul>

        <div style={{ marginBottom: '24px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,.msg,.eml"
            onChange={handleUpload}
            disabled={uploading}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px',
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              backgroundColor: uploading ? '#f1f5f9' : 'white'
            }}
          />
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
            Select a file to upload (PDF, Excel, Email - max 10MB)
          </p>
        </div>

        {uploading && (
          <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                  {processingStage === 'queued' && 'Queued for processing...'}
                  {processingStage === 'uploading' && 'Uploading document...'}
                  {processingStage === 'extracting_text' && 'Extracting text from PDF...'}
                  {processingStage === 'classifying' && 'Classifying document type...'}
                  {processingStage === 'analyzing_with_claude' && 'AI Analysis - Understanding content with Claude...'}
                  {processingStage === 'storing' && 'Storing results...'}
                  {processingStage === 'completed' && 'Processing complete!'}
                  {processingStage === 'failed' && 'Processing failed'}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e2e8f0',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div
                  className={processingStage !== 'completed' ? 'progress-bar-animated' : ''}
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: '#3b82f6',
                    transition: 'width 0.3s ease',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
              This usually takes about 1-2 minutes...
            </div>
          </div>
        )}

        {uploadedBooking && (
          <div className="success-message" style={{ padding: '24px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div className="checkmark-container" style={{ flexShrink: 0, marginTop: '4px' }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ color: '#065f46', marginBottom: '8px', marginTop: 0 }}>Document Processed Successfully!</h4>
                <div style={{ fontSize: '13px', color: '#064e3b' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Booking ID:</strong> {uploadedBooking.id || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Document Type:</strong>{' '}
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      background: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500
                    }}>
                      {uploadedBooking.documentType === 'transport_order' && 'Transport Order'}
                      {uploadedBooking.documentType === 'booking_confirmation' && 'Booking Confirmation'}
                      {uploadedBooking.documentType === 'bill_of_lading' && 'Bill of Lading'}
                      {uploadedBooking.documentType === 'delivery_order' && 'Delivery Order'}
                      {!uploadedBooking.documentType && 'Unknown'}
                    </span>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Confidence:</strong>{' '}
                    <span style={{ color: uploadedBooking.extractionMetadata?.confidenceScore >= 0.8 ? '#10b981' : '#f59e0b' }}>
                      {uploadedBooking.extractionMetadata?.confidenceScore
                        ? (uploadedBooking.extractionMetadata.confidenceScore * 100).toFixed(1)
                        : (uploadedBooking.overallConfidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <span style={{
                      color: uploadedBooking.processingStatus === 'pending' ? '#f59e0b' : '#10b981'
                    }}>
                      {uploadedBooking.processingStatus || 'pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {uploadedBooking.processingStatus === 'pending' && (
              <button
                className="btn-primary"
                onClick={() => navigate(`/validate/${uploadedBooking.id}`)}
              >
                Validate Now
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Supported Carriers</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {['Maersk', 'OOCL', 'MSC', 'Hapag-Lloyd', 'CMA CGM', 'ONE'].map(carrier => (
            <div
              key={carrier}
              style={{
                padding: '12px 24px',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              {carrier}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Upload;
