import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@progress/kendo-react-buttons';
import { Input, TextArea } from '@progress/kendo-react-inputs';
import axios from 'axios';

interface Booking {
  id: string;
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
  const [formData, setFormData] = useState<any>({});
  const [corrections, setCorrections] = useState<any[]>([]);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      const response = await axios.get(`/api/v1/bookings/${bookingId}`);
      setBooking(response.data);
      setFormData(response.data.dcsaPlusData);
    } catch (error) {
      console.error('Failed to load booking:', error);
      // Mock data for demo
      const mockBooking = {
        id: bookingId || '',
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
          <iframe src={booking.documentUrl} title="Document Preview" />
        </div>

        {/* Validation Form */}
        <div className="validation-form">
          <div className="form-section">
            <h3>Booking Information</h3>
            <div className="form-row">
              <div className="form-field">
                <label>Carrier Booking Reference</label>
                <Input
                  value={formData.carrierBookingReference || ''}
                  onChange={(e) => handleFieldChange('carrierBookingReference', e.value)}
                />
              </div>
              <div className="form-field">
                <label>Transport Document Reference</label>
                <Input
                  value={formData.transportDocumentReference || ''}
                  onChange={(e) => handleFieldChange('transportDocumentReference', e.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Shipment Details</h3>
            <div className="form-row">
              <div className="form-field">
                <label>Carrier</label>
                <Input value={formData.shipmentDetails?.carrierCode || ''} readOnly />
              </div>
              <div className="form-field">
                <label>Vessel Name</label>
                <Input
                  value={formData.shipmentDetails?.vesselName || ''}
                  onChange={(e) => handleFieldChange('shipmentDetails.vesselName', e.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Port of Loading</label>
                <Input
                  value={formData.shipmentDetails?.portOfLoading?.locationName || ''}
                  readOnly
                />
              </div>
              <div className="form-field">
                <label>Port of Discharge</label>
                <Input
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
                  <label>Container Number</label>
                  <Input value={container.containerNumber || ''} readOnly />
                </div>
                <div className="form-field">
                  <label>Seal Number</label>
                  <Input value={container.sealNumber || ''} readOnly />
                </div>
              </div>
            ))}
          </div>

          <div className="form-section">
            <h3>Pickup Details</h3>
            <div className="form-row">
              <div className="form-field">
                <label>Facility</label>
                <Input
                  value={formData.inlandExtensions?.pickupDetails?.facilityName || ''}
                  onChange={(e) => handleFieldChange('inlandExtensions.pickupDetails.facilityName', e.value)}
                />
              </div>
              <div className="form-field">
                <label>PIN Code</label>
                <Input
                  value={formData.inlandExtensions?.pickupDetails?.pinCode || ''}
                  onChange={(e) => handleFieldChange('inlandExtensions.pickupDetails.pinCode', e.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Delivery Details</h3>
            <div className="form-row">
              <div className="form-field">
                <label>Facility</label>
                <Input
                  value={formData.inlandExtensions?.deliveryDetails?.facilityName || ''}
                  onChange={(e) => handleFieldChange('inlandExtensions.deliveryDetails.facilityName', e.value)}
                />
              </div>
            </div>
            <div className="form-field">
              <label>Address</label>
              <TextArea
                value={formData.inlandExtensions?.deliveryDetails?.address || ''}
                onChange={(e) => handleFieldChange('inlandExtensions.deliveryDetails.address', e.value)}
                className={isFieldUncertain('dcsaPlusData.inlandExtensions.deliveryDetails.address') ? 'low-confidence' : ''}
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
            <Button
              themeColor="primary"
              onClick={() => handleSubmit('approved-with-corrections')}
              disabled={validating}
            >
              Approve with Corrections ({corrections.length})
            </Button>
            <Button
              onClick={() => handleSubmit('approved')}
              disabled={validating || corrections.length > 0}
            >
              Approve as-is
            </Button>
            <Button
              onClick={() => handleSubmit('rejected')}
              disabled={validating}
            >
              Reject
            </Button>
            <Button onClick={() => navigate('/bookings')}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Validation;
