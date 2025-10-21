import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PDFViewer from '../components/PDFViewer';

interface Booking {
  id: string;
  documentId: string;
  documentUrl: string;
  processingStatus: string;
  overallConfidence: number;
  dcsaPlusData: any;
  extractionMetadata: any;
}

const Validation: React.FC = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [documentSasUrl, setDocumentSasUrl] = useState<string>('');
  const [formData, setFormData] = useState<any>({});
  const [corrections, setCorrections] = useState<any[]>([]);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      const response = await axios.get<Booking>(`/api/v1/bookings/detail/${bookingId}`);
      const bookingData = response.data;
      setBooking(bookingData);
      setFormData(bookingData.dcsaPlusData);

      // Fetch SAS URL for the document
      if (bookingData.documentId) {
        try {
          const sasResponse = await axios.get<{ sasUrl: string }>(`/api/v1/documents/${bookingData.documentId}/sas`);
          setDocumentSasUrl(sasResponse.data.sasUrl);
        } catch (sasError) {
          console.error('Failed to get SAS URL:', sasError);
          // Fallback to direct URL (may not work for private containers)
          setDocumentSasUrl(bookingData.documentUrl);
        }
      }
    } catch (error) {
      console.error('Failed to load booking:', error);
      // Mock data for demo
      const mockBooking = {
        id: bookingId || '',
        documentId: 'doc-mock',
        documentUrl: 'https://example.com/document.pdf',
        processingStatus: 'pending',
        overallConfidence: 0.87,
        dcsaPlusData: {
          carrierBookingReference: 'OOLU2649906690',
          transportDocumentReference: '911357426',
          shipmentDetails: {
            carrierCode: 'OOCL',
            vesselName: 'APL LION CITY',
            voyageNumber: '044W',
            portOfLoading: { UNLocationCode: 'MYPGU', locationName: 'Pasir Gudang' },
            portOfDischarge: { UNLocationCode: 'NLRTM', locationName: 'Rotterdam' }
          },
          containers: [{
            containerNumber: 'OOLU3703895',
            sealNumber: 'OOLEWP9715',
            containerSize: '20',
            containerType: 'GP'
          }],
          inlandExtensions: {
            pickupDetails: {
              facilityName: 'Rotterdam World Gateway',
              pickupDate: '2020-12-04',
              pinCode: '23836032'
            },
            deliveryDetails: {
              facilityName: 'Nestinox BV',
              address: 'Hallenweg 5/6/7, Best',
              deliveryDate: '2020-12-08'
            }
          }
        },
        extractionMetadata: {
          confidenceScores: {
            carrierBookingReference: 0.99,
            vesselName: 0.95,
            containerNumber: 0.98,
            deliveryAddress: 0.72
          },
          uncertainFields: ['dcsaPlusData.inlandExtensions.deliveryDetails.address']
        }
      };
      setBooking(mockBooking);
      setFormData(mockBooking.dcsaPlusData);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    const newFormData = { ...formData };
    const parts = field.split('.');
    let current = newFormData;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }

    const originalValue = current[parts[parts.length - 1]];
    current[parts[parts.length - 1]] = value;
    setFormData(newFormData);

    // Track correction
    if (originalValue !== value) {
      addCorrection(field, originalValue, value);
    }
  };

  const addCorrection = (field: string, originalValue: any, correctedValue: any) => {
    const existing = corrections.find(c => c.field === field);
    if (existing) {
      existing.correctedValue = correctedValue;
      setCorrections([...corrections]);
    } else {
      setCorrections([
        ...corrections,
        {
          field,
          originalValue,
          correctedValue,
          originalConfidence: booking?.extractionMetadata?.confidenceScores[field] || 0,
          correctionReason: 'manual-correction'
        }
      ]);
    }
  };

  const handleSubmit = async (action: string) => {
    setValidating(true);
    try {
      const validation = {
        action,
        corrections,
        timeSpentSeconds: 120, // Track in production
        comments: ''
      };

      await axios.post(`/api/v1/bookings/${bookingId}/validate`, validation);
      alert('Validation submitted successfully!');
      navigate('/bookings');
    } catch (error) {
      console.error('Validation failed:', error);
      alert('Validation failed. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  if (!booking) {
    return <div>Loading...</div>;
  }

  const isFieldUncertain = (field: string) => {
    return booking.extractionMetadata?.uncertainFields?.includes(field);
  };

  const getFieldConfidence = (field: string): number | null => {
    const confidence = booking?.extractionMetadata?.confidenceScores?.[field];
    return typeof confidence === 'number' ? confidence : null;
  };

  const renderConfidenceBadge = (field: string) => {
    const confidence = getFieldConfidence(field);
    if (confidence === null) return null;

    const percentage = Math.round(confidence * 100);
    let badgeClass = 'status-badge ';

    if (percentage >= 90) badgeClass += 'status-validated';
    else if (percentage >= 80) badgeClass += 'status-pending';
    else badgeClass += 'status-processing';

    return (
      <span className={badgeClass} style={{ marginLeft: '8px', fontSize: '11px' }}>
        {percentage}% confidence
      </span>
    );
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h2>Validate Booking</h2>
        <div>
          <span style={{ marginRight: '16px', color: '#64748b' }}>
            Confidence: {(booking.overallConfidence * 100).toFixed(1)}%
          </span>
          <span style={{ marginRight: '16px', color: '#64748b' }}>
            Corrections: {corrections.length}
          </span>
        </div>
      </div>

      <div className="validation-container">
        {/* Document Viewer */}
        <div className="document-viewer">
          {documentSasUrl ? (
            <PDFViewer url={documentSasUrl} title="Booking Document" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
              Loading document...
            </div>
          )}
        </div>

        {/* Validation Form */}
        <div className="validation-form">
          {/* Corrections Summary */}
          {corrections.length > 0 && (
            <div style={{
              background: '#fffbeb',
              border: '2px solid #f59e0b',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#92400e' }}>
                📝 Pending Corrections ({corrections.length})
              </h4>
              {corrections.map((correction, idx) => (
                <div key={idx} style={{
                  fontSize: '13px',
                  padding: '8px',
                  background: 'white',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  borderLeft: '3px solid #f59e0b'
                }}>
                  <strong>{correction.field}:</strong>
                  <div style={{ marginTop: '4px', color: '#64748b' }}>
                    <span style={{ textDecoration: 'line-through' }}>{String(correction.originalValue)}</span>
                    {' → '}
                    <span style={{ color: '#10b981', fontWeight: 500 }}>{String(correction.correctedValue)}</span>
                  </div>
                  {correction.originalConfidence && (
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Original confidence: {Math.round(correction.originalConfidence * 100)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="form-section">
            <h3>Booking Information</h3>
            <div className="form-row">
              <div className="form-field">
                <label>
                  Carrier Booking Reference
                  {renderConfidenceBadge('carrierBookingReference')}
                </label>
                <input
                  type="text"
                  value={formData.carrierBookingReference || ''}
                  onChange={(e) => handleFieldChange('carrierBookingReference', e.target.value)}
                  className={`form-input ${getFieldConfidence('carrierBookingReference') !== null && getFieldConfidence('carrierBookingReference')! < 0.8 ? 'low-confidence' : ''}`}
                />
              </div>
              <div className="form-field">
                <label>
                  Transport Document Reference
                  {renderConfidenceBadge('transportDocumentReference')}
                </label>
                <input
                  type="text"
                  value={formData.transportDocumentReference || ''}
                  onChange={(e) => handleFieldChange('transportDocumentReference', e.target.value)}
                  className={`form-input ${getFieldConfidence('transportDocumentReference') !== null && getFieldConfidence('transportDocumentReference')! < 0.8 ? 'low-confidence' : ''}`}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Shipment Details</h3>
            <div className="form-row">
              <div className="form-field">
                <label>Carrier</label>
                <input type="text" className="form-input" value={formData.shipmentDetails?.carrierCode || ''} readOnly />
              </div>
              <div className="form-field">
                <label>
                  Vessel Name
                  {renderConfidenceBadge('vesselName')}
                </label>
                <input
                  type="text"
                  value={formData.shipmentDetails?.vesselName || ''}
                  onChange={(e) => handleFieldChange('shipmentDetails.vesselName', e.target.value)}
                  className={`form-input ${getFieldConfidence('vesselName') !== null && getFieldConfidence('vesselName')! < 0.8 ? 'low-confidence' : ''}`}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Port of Loading</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.shipmentDetails?.portOfLoading?.locationName || ''}
                  readOnly
                />
              </div>
              <div className="form-field">
                <label>Port of Discharge</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.shipmentDetails?.portOfDischarge?.locationName || ''}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Container Information</h3>
            {formData.containers?.map((container: any, index: number) => (
              <div key={index} className="form-row">
                <div className="form-field">
                  <label>
                    Container Number
                    {renderConfidenceBadge('containerNumber')}
                  </label>
                  <input type="text" className="form-input" value={container.containerNumber || ''} readOnly />
                </div>
                <div className="form-field">
                  <label>Seal Number</label>
                  <input type="text" className="form-input" value={container.sealNumber || ''} readOnly />
                </div>
              </div>
            ))}
          </div>

          <div className="form-section">
            <h3>Pickup Details</h3>
            <div className="form-row">
              <div className="form-field">
                <label>Facility</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.inlandExtensions?.pickupDetails?.facilityName || ''}
                  onChange={(e) => handleFieldChange('inlandExtensions.pickupDetails.facilityName', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>PIN Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.inlandExtensions?.pickupDetails?.pinCode || ''}
                  onChange={(e) => handleFieldChange('inlandExtensions.pickupDetails.pinCode', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Delivery Details</h3>
            <div className="form-row">
              <div className="form-field">
                <label>Facility</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.inlandExtensions?.deliveryDetails?.facilityName || ''}
                  onChange={(e) => handleFieldChange('inlandExtensions.deliveryDetails.facilityName', e.target.value)}
                />
              </div>
            </div>
            <div className="form-field">
              <label>Address</label>
              <textarea
                className={`form-input ${isFieldUncertain('dcsaPlusData.inlandExtensions.deliveryDetails.address') ? 'low-confidence' : ''}`}
                value={formData.inlandExtensions?.deliveryDetails?.address || ''}
                onChange={(e) => handleFieldChange('inlandExtensions.deliveryDetails.address', e.target.value)}
                rows={2}
              />
              {isFieldUncertain('dcsaPlusData.inlandExtensions.deliveryDetails.address') && (
                <div className="confidence-indicator">
                  ⚠️ Low confidence - Please verify
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
            <button
              className="btn-primary"
              onClick={() => handleSubmit('approved-with-corrections')}
              disabled={validating}
            >
              Approve with Corrections ({corrections.length})
            </button>
            <button
              className="btn-secondary"
              onClick={() => handleSubmit('approved')}
              disabled={validating || corrections.length > 0}
            >
              Approve as-is
            </button>
            <button
              className="btn-secondary"
              onClick={() => handleSubmit('rejected')}
              disabled={validating}
            >
              Reject
            </button>
            <button className="btn-secondary" onClick={() => navigate('/bookings')}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Validation;
