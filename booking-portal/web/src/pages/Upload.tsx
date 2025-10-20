import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@progress/kendo-react-buttons';
import { Upload as KendoUpload, UploadOnAddEvent } from '@progress/kendo-react-upload';
import axios from 'axios';

const Upload: React.FC = () => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadedBooking, setUploadedBooking] = useState<any>(null);

  const handleUpload = async (event: UploadOnAddEvent) => {
    const files = event.affectedFiles;
    if (files.length === 0) return;

    setUploading(true);

    try {
      const file = files[0].getRawFile?.();
      const formData = new FormData();
      formData.append('file', file as File);

      const response = await axios.post('/api/v1/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadedBooking(response.data);
      alert('Document uploaded and processed successfully!');
    } catch (error: any) {
      console.error('Upload failed:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
      const errorDetails = error.response?.data?.details || '';

      alert(`Upload failed: ${errorMessage}\n${errorDetails}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h2>Upload Booking Document</h2>
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
          <KendoUpload
            batch={false}
            multiple={false}
            defaultFiles={[]}
            withCredentials={false}
            saveUrl="/api/v1/documents"
            removeUrl="/api/v1/documents"
            onAdd={handleUpload}
            restrictions={{
              allowedExtensions: ['.pdf', '.xlsx', '.msg', '.eml'],
              maxFileSize: 10485760
            }}
          />
        </div>

        {uploading && (
          <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
            Processing document with AI...
          </div>
        )}

        {uploadedBooking && (
          <div style={{ padding: '24px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
            <h4 style={{ color: '#065f46', marginBottom: '12px' }}>Document Processed Successfully!</h4>
            <p style={{ color: '#064e3b', marginBottom: '16px' }}>
              Booking ID: {uploadedBooking.id}<br />
              Confidence: {(uploadedBooking.overallConfidence * 100).toFixed(1)}%<br />
              Status: {uploadedBooking.processingStatus}
            </p>
            {uploadedBooking.processingStatus === 'pending' && (
              <Button
                themeColor="primary"
                onClick={() => navigate(`/validate/${uploadedBooking.id}`)}
              >
                Validate Now
              </Button>
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
