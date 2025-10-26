import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@progress/kendo-react-buttons';
import PDFViewer from '../components/PDFViewer';
import { TransportOrderForm } from '../components/validation/TransportOrderForm';
import Breadcrumb from '../components/Breadcrumb';
import { ConfidenceScore } from '../components/ConfidenceScore';

interface Booking {
  id: string;
  documentType: string;
  documentNumber: string;
  carrier: string;
  documentUrl: string;
  processingStatus: string;
  data: any;
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Define required fields based on document type
  const requiredFields = ['carrierBookingReference', 'shipmentDetails.vesselName', 'shipmentDetails.portOfLoading', 'shipmentDetails.portOfDischarge', 'containers'];

  // Block navigation with unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges &&
      corrections.length > 0 &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Warn on page unload with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && corrections.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, corrections]);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      const response = await axios.get<Booking>(`/api/v1/bookings/detail/${bookingId}`);
      const bookingData = response.data;
      setBooking(bookingData);
      setFormData(bookingData.data);

      // Fetch SAS URL for the document
      if (bookingData.id) {
        try {
          const sasResponse = await axios.get<{ sasUrl: string }>(`/api/v1/documents/${bookingData.id}/sas`);
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
        documentType: 'transport-order',
        documentNumber: 'MOCK123',
        carrier: 'OOCL',
        documentUrl: 'https://example.com/document.pdf',
        processingStatus: 'pending',
        data: {
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
          confidenceScore: 0.87,
          confidenceScores: {
            carrierBookingReference: 0.99,
            vesselName: 0.95,
            containerNumber: 0.98,
            deliveryAddress: 0.72
          },
          uncertainFields: ['data.inlandExtensions.deliveryDetails.address']
        }
      };
      setBooking(mockBooking);
      setFormData(mockBooking.data);
    }
  };

  const validateField = (fieldName: string, value: any) => {
    if (requiredFields.includes(fieldName)) {
      if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '')) {
        setErrors(prev => ({...prev, [fieldName]: 'This field is required'}));
        return false;
      } else {
        setErrors(prev => {
          const newErrors = {...prev};
          delete newErrors[fieldName];
          return newErrors;
        });
        return true;
      }
    }
    return true;
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

    // Validate field with 300ms debounce
    setTimeout(() => validateField(field, value), 300);

    // Track correction
    if (originalValue !== value) {
      addCorrection(field, originalValue, value);
      setHasUnsavedChanges(true);
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
      setHasUnsavedChanges(false); // Clear unsaved changes flag
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

    return <ConfidenceScore score={confidence} fieldName={field} />;
  };

  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'transport_order': 'Transport Order',
      'booking_confirmation': 'Booking Confirmation',
      'bill_of_lading': 'Bill of Lading',
      'delivery_order': 'Delivery Order'
    };
    return labels[type] || type;
  };

  return (
    <div>
      <Breadcrumb />

      {/* Unsaved Changes Dialog */}
      {blocker.state === 'blocked' && (
        <div
          role="dialog"
          aria-labelledby="unsaved-dialog-title"
          aria-describedby="unsaved-dialog-desc"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            zIndex: 1000,
            maxWidth: '400px'
          }}
        >
          <h3 id="unsaved-dialog-title" style={{ marginBottom: '12px', color: '#1e293b' }}>
            Unsaved Changes
          </h3>
          <p id="unsaved-dialog-desc" style={{ marginBottom: '24px', color: '#64748b' }}>
            You have {corrections.length} unsaved correction{corrections.length !== 1 ? 's' : ''}.
            Are you sure you want to leave without saving?
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button themeColor="base" onClick={() => blocker.reset()}>
              Stay
            </Button>
            <Button themeColor="error" onClick={() => {
              setHasUnsavedChanges(false);
              blocker.proceed();
            }}>
              Leave
            </Button>
          </div>
        </div>
      )}
      {blocker.state === 'blocked' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
          onClick={() => blocker.reset()}
        />
      )}

      <div className="card-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            padding: '6px 12px',
            background: '#dbeafe',
            color: '#1e40af',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.5px'
          }}>
            {getDocumentTypeLabel(booking.documentType)}
          </span>
          <h2 style={{ margin: 0 }}>Validate Booking</h2>
          {hasUnsavedChanges && corrections.length > 0 && (
            <span
              role="status"
              aria-live="polite"
              style={{
                color: '#f59e0b',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              (Unsaved changes)
            </span>
          )}
        </div>
        <div>
          <span style={{ marginRight: '16px', color: '#64748b' }}>
            Confidence: {((booking.extractionMetadata?.confidenceScore || 0) * 100).toFixed(1)}%
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
            <PDFViewer url={documentSasUrl} title={getDocumentTypeLabel(booking.documentType)} />
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

          {/* Dynamic form based on document type */}
          {formData.documentType === 'transport_order' ? (
            <TransportOrderForm
              formData={formData}
              handleFieldChange={handleFieldChange}
              renderConfidenceBadge={renderConfidenceBadge}
              getFieldConfidence={getFieldConfidence}
              isFieldUncertain={isFieldUncertain}
            />
          ) : (
            <>
              {/* Booking Confirmation / Bill of Lading form */}
              <div className="form-section">
                <h3>Booking Information</h3>
                <div className="form-row">
                  <div className="form-field">
                    <label>
                      Carrier Booking Reference <span style={{color: 'red'}}>*</span>
                      {renderConfidenceBadge('carrierBookingReference')}
                    </label>
                    <input
                      type="text"
                      value={formData.carrierBookingReference || ''}
                      onChange={(e) => handleFieldChange('carrierBookingReference', e.target.value)}
                      className={`form-input ${getFieldConfidence('carrierBookingReference') !== null && getFieldConfidence('carrierBookingReference')! < 0.8 ? 'low-confidence' : ''}`}
                      style={{borderColor: errors.carrierBookingReference ? 'red' : undefined}}
                    />
                    {errors.carrierBookingReference && (
                      <div style={{color: 'red', fontSize: '12px', marginTop: '4px'}}>
                        {errors.carrierBookingReference}
                      </div>
                    )}
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
                      Vessel Name <span style={{color: 'red'}}>*</span>
                      {renderConfidenceBadge('vesselName')}
                    </label>
                    <input
                      type="text"
                      value={formData.shipmentDetails?.vesselName || ''}
                      onChange={(e) => handleFieldChange('shipmentDetails.vesselName', e.target.value)}
                      className={`form-input ${getFieldConfidence('vesselName') !== null && getFieldConfidence('vesselName')! < 0.8 ? 'low-confidence' : ''}`}
                      style={{borderColor: errors['shipmentDetails.vesselName'] ? 'red' : undefined}}
                    />
                    {errors['shipmentDetails.vesselName'] && (
                      <div style={{color: 'red', fontSize: '12px', marginTop: '4px'}}>
                        {errors['shipmentDetails.vesselName']}
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Port of Loading <span style={{color: 'red'}}>*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.shipmentDetails?.portOfLoading?.locationName || ''}
                      onChange={(e) => handleFieldChange('shipmentDetails.portOfLoading', {...formData.shipmentDetails?.portOfLoading, locationName: e.target.value})}
                      style={{borderColor: errors['shipmentDetails.portOfLoading'] ? 'red' : undefined}}
                    />
                    {errors['shipmentDetails.portOfLoading'] && (
                      <div style={{color: 'red', fontSize: '12px', marginTop: '4px'}}>
                        {errors['shipmentDetails.portOfLoading']}
                      </div>
                    )}
                  </div>
                  <div className="form-field">
                    <label>Port of Discharge <span style={{color: 'red'}}>*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.shipmentDetails?.portOfDischarge?.locationName || ''}
                      onChange={(e) => handleFieldChange('shipmentDetails.portOfDischarge', {...formData.shipmentDetails?.portOfDischarge, locationName: e.target.value})}
                      style={{borderColor: errors['shipmentDetails.portOfDischarge'] ? 'red' : undefined}}
                    />
                    {errors['shipmentDetails.portOfDischarge'] && (
                      <div style={{color: 'red', fontSize: '12px', marginTop: '4px'}}>
                        {errors['shipmentDetails.portOfDischarge']}
                      </div>
                    )}
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
                    className={`form-input ${isFieldUncertain('data.inlandExtensions.deliveryDetails.address') ? 'low-confidence' : ''}`}
                    value={formData.inlandExtensions?.deliveryDetails?.address || ''}
                    onChange={(e) => handleFieldChange('inlandExtensions.deliveryDetails.address', e.target.value)}
                    rows={2}
                  />
                  {isFieldUncertain('data.inlandExtensions.deliveryDetails.address') && (
                    <div className="confidence-indicator">
                      ⚠️ Low confidence - Please verify
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
            <Button
              themeColor="primary"
              onClick={() => handleSubmit('approved-with-corrections')}
              disabled={validating}
              aria-label={`Approve with ${corrections.length} corrections`}
            >
              Approve with Corrections ({corrections.length})
            </Button>
            <Button
              themeColor="success"
              onClick={() => handleSubmit('approved')}
              disabled={validating || corrections.length > 0}
              aria-label="Approve booking as-is"
            >
              Approve as-is
            </Button>
            <Button
              themeColor="error"
              onClick={() => handleSubmit('rejected')}
              disabled={validating}
              aria-label="Reject booking"
            >
              Reject
            </Button>
            <Button
              themeColor="base"
              onClick={() => {
                if (hasUnsavedChanges && corrections.length > 0) {
                  if (window.confirm(`You have ${corrections.length} unsaved correction(s). Are you sure you want to cancel?`)) {
                    navigate('/bookings');
                  }
                } else {
                  navigate('/bookings');
                }
              }}
              aria-label="Cancel and return to bookings"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Validation;
