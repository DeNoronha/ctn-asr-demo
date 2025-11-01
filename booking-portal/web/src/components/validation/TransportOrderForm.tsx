import React from 'react';
import { TransportJourneyTimeline } from './TransportJourneyTimeline';

interface TransportOrderFormProps {
  formData: any;
  handleFieldChange: (field: string, value: any) => void;
  renderConfidenceBadge: (field: string) => React.ReactNode;
  getFieldConfidence: (field: string) => number | null;
  isFieldUncertain: (field: string) => boolean;
}

/**
 * Normalize datetime value to HTML5 datetime-local format (YYYY-MM-DDTHH:mm)
 * Supports multiple input formats:
 * - ISO 8601: 2020-12-08T14:30:00Z → 2020-12-08T14:30
 * - European: 08-12-2020 14:30 → 2020-12-08T14:30
 * - US: 12/08/2020 14:30 → 2020-12-08T14:30
 * - Date only: 2020-12-08 → 2020-12-08T00:00
 */
function normalizeDatetime(value: string | null | undefined): string {
  if (!value) return '';

  try {
    // Already in correct format (YYYY-MM-DDTHH:mm)?
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
      return value;
    }

    // Try parsing as ISO 8601 (from PDF extraction)
    if (value.includes('T') || value.includes('Z')) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
      }
    }

    // European format: dd-mm-yyyy hh:mm or dd/mm/yyyy hh:mm
    const europeanMatch = value.match(/^(\d{2})[-/](\d{2})[-/](\d{4})\s*(\d{2}):(\d{2})/);
    if (europeanMatch) {
      const [, day, month, year, hour, minute] = europeanMatch;
      return `${year}-${month}-${day}T${hour}:${minute}`;
    }

    // US format: mm/dd/yyyy hh:mm
    const usMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})/);
    if (usMatch) {
      const [, month, day, year, hour, minute] = usMatch;
      return `${year}-${month}-${day}T${hour}:${minute}`;
    }

    // Date only formats (add midnight time)
    // ISO: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return `${value}T00:00`;
    }

    // European: dd-mm-yyyy
    const europeanDateMatch = value.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (europeanDateMatch) {
      const [, day, month, year] = europeanDateMatch;
      return `${year}-${month}-${day}T00:00`;
    }

    // Fallback: try native Date parsing
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 16);
    }

    console.warn('Failed to parse datetime:', value);
    return value; // Return original if can't parse
  } catch (error) {
    console.error('Date parsing error:', error);
    return value;
  }
}

export const TransportOrderForm: React.FC<TransportOrderFormProps> = ({
  formData,
  handleFieldChange,
  renderConfidenceBadge,
  getFieldConfidence,
  isFieldUncertain
}) => {
  return (
    <>
      {/* Transport Journey Timeline */}
      <TransportJourneyTimeline formData={formData} />

      {/* Order Information */}
      <div className="form-section">
        <h3>Order Information</h3>
        <div className="form-row">
          <div className="form-field">
            <label>
              Transport Order Number
              {renderConfidenceBadge('transportOrderNumber')}
            </label>
            <input
              type="text"
              value={formData.transportOrderNumber || ''}
              onChange={(e) => handleFieldChange('transportOrderNumber', e.target.value)}
              className={`form-input ${getFieldConfidence('transportOrderNumber') !== null && getFieldConfidence('transportOrderNumber')! < 0.8 ? 'low-confidence' : ''}`}
            />
          </div>
          <div className="form-field">
            <label>
              Delivery Order Number
              {renderConfidenceBadge('deliveryOrderNumber')}
            </label>
            <input
              type="text"
              value={formData.deliveryOrderNumber || ''}
              onChange={(e) => handleFieldChange('deliveryOrderNumber', e.target.value)}
              className={`form-input ${getFieldConfidence('deliveryOrderNumber') !== null && getFieldConfidence('deliveryOrderNumber')! < 0.8 ? 'low-confidence' : ''}`}
            />
          </div>
        </div>
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
              Order Date
              {renderConfidenceBadge('orderDate')}
            </label>
            <input
              type="date"
              value={formData.orderDate || ''}
              onChange={(e) => handleFieldChange('orderDate', e.target.value)}
              className={`form-input ${getFieldConfidence('orderDate') !== null && getFieldConfidence('orderDate')! < 0.8 ? 'low-confidence' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Transport Companies */}
      <div className="form-section">
        <h3>Transport Details</h3>
        <div className="form-row">
          <div className="form-field">
            <label>
              Carrier
              {renderConfidenceBadge('carrier')}
            </label>
            <input
              type="text"
              value={formData.carrier || ''}
              onChange={(e) => handleFieldChange('carrier', e.target.value)}
              className={`form-input ${getFieldConfidence('carrier') !== null && getFieldConfidence('carrier')! < 0.8 ? 'low-confidence' : ''}`}
            />
          </div>
          <div className="form-field">
            <label>
              Trucking Company
              {renderConfidenceBadge('truckingCompany')}
            </label>
            <input
              type="text"
              value={formData.truckingCompany || ''}
              onChange={(e) => handleFieldChange('truckingCompany', e.target.value)}
              className={`form-input ${getFieldConfidence('truckingCompany') !== null && getFieldConfidence('truckingCompany')! < 0.8 ? 'low-confidence' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Consignee */}
      <div className="form-section">
        <h3>Consignee</h3>
        <div className="form-row">
          <div className="form-field">
            <label>
              Company Name
              {renderConfidenceBadge('consignee.name')}
            </label>
            <input
              type="text"
              value={formData.consignee?.name || ''}
              onChange={(e) => handleFieldChange('consignee.name', e.target.value)}
              className={`form-input ${getFieldConfidence('consignee.name') !== null && getFieldConfidence('consignee.name')! < 0.8 ? 'low-confidence' : ''}`}
            />
          </div>
        </div>
        <div className="form-field">
          <label>
            Address
            {renderConfidenceBadge('consignee.address')}
          </label>
          <input
            type="text"
            value={formData.consignee?.address || ''}
            onChange={(e) => handleFieldChange('consignee.address', e.target.value)}
            className={`form-input ${getFieldConfidence('consignee.address') !== null && getFieldConfidence('consignee.address')! < 0.8 ? 'low-confidence' : ''}`}
          />
        </div>
      </div>

      {/* Pickup Location */}
      <div className="form-section">
        <h3>Pickup Details</h3>
        <div className="form-row">
          <div className="form-field">
            <label>
              Facility Name
              {renderConfidenceBadge('pickupLocation.name')}
            </label>
            <input
              type="text"
              value={formData.pickupLocation?.name || ''}
              onChange={(e) => handleFieldChange('pickupLocation.name', e.target.value)}
              className={`form-input ${getFieldConfidence('pickupLocation.name') !== null && getFieldConfidence('pickupLocation.name')! < 0.8 ? 'low-confidence' : ''}`}
            />
          </div>
          <div className="form-field">
            <label>
              DCSA Location Code (UNLOCODE)
              {renderConfidenceBadge('pickupLocation.UNLocationCode')}
            </label>
            <input
              type="text"
              value={formData.pickupLocation?.UNLocationCode || formData.pickupLocation?.terminalCode || ''}
              onChange={(e) => handleFieldChange('pickupLocation.UNLocationCode', e.target.value)}
              className={`form-input ${getFieldConfidence('pickupLocation.UNLocationCode') !== null && getFieldConfidence('pickupLocation.UNLocationCode')! < 0.8 ? 'low-confidence' : ''}`}
              placeholder="e.g., NLRTM"
              maxLength={5}
              style={{ textTransform: 'uppercase' }}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>
              Planned Pickup Date & Time
              {renderConfidenceBadge('plannedPickupDate')}
            </label>
            <input
              type="datetime-local"
              value={normalizeDatetime(formData.plannedPickupDate)}
              onChange={(e) => handleFieldChange('plannedPickupDate', e.target.value)}
              className={`form-input ${getFieldConfidence('plannedPickupDate') !== null && getFieldConfidence('plannedPickupDate')! < 0.8 ? 'low-confidence' : ''}`}
            />
          </div>
          <div className="form-field">
            <label>
              Address
              {renderConfidenceBadge('pickupLocation.address')}
            </label>
            <input
              type="text"
              value={formData.pickupLocation?.address || ''}
              onChange={(e) => handleFieldChange('pickupLocation.address', e.target.value)}
              className={`form-input ${getFieldConfidence('pickupLocation.address') !== null && getFieldConfidence('pickupLocation.address')! < 0.8 ? 'low-confidence' : ''}`}
            />
          </div>
        </div>
        {isFieldUncertain('pickupLocation.terminalCode') && (
          <div className="confidence-indicator" style={{ marginTop: '8px' }}>
            ⚠️ Terminal code uncertain - Please verify
          </div>
        )}
      </div>

      {/* Delivery Location */}
      <div className="form-section">
        <h3>Delivery Details</h3>
        <div className="form-row">
          <div className="form-field">
            <label>
              Facility Name
              {renderConfidenceBadge('deliveryLocation.name')}
            </label>
            <input
              type="text"
              value={formData.deliveryLocation?.name || ''}
              onChange={(e) => handleFieldChange('deliveryLocation.name', e.target.value)}
              className={`form-input ${getFieldConfidence('deliveryLocation.name') !== null && getFieldConfidence('deliveryLocation.name')! < 0.8 ? 'low-confidence' : ''}`}
            />
          </div>
          <div className="form-field">
            <label>
              DCSA Location Code (UNLOCODE)
              {renderConfidenceBadge('deliveryLocation.UNLocationCode')}
            </label>
            <input
              type="text"
              value={formData.deliveryLocation?.UNLocationCode || formData.deliveryLocation?.terminalCode || ''}
              onChange={(e) => handleFieldChange('deliveryLocation.UNLocationCode', e.target.value)}
              className={`form-input ${getFieldConfidence('deliveryLocation.UNLocationCode') !== null && getFieldConfidence('deliveryLocation.UNLocationCode')! < 0.8 ? 'low-confidence' : ''}`}
              placeholder="e.g., NLRTM"
              maxLength={5}
              style={{ textTransform: 'uppercase' }}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>
              Planned Delivery Date & Time
              {renderConfidenceBadge('plannedDeliveryDate')}
            </label>
            <input
              type="datetime-local"
              value={normalizeDatetime(formData.plannedDeliveryDate)}
              onChange={(e) => handleFieldChange('plannedDeliveryDate', e.target.value)}
              className={`form-input ${getFieldConfidence('plannedDeliveryDate') !== null && getFieldConfidence('plannedDeliveryDate')! < 0.8 ? 'low-confidence' : ''}`}
            />
          </div>
          <div className="form-field">
            <label>
              Address
              {renderConfidenceBadge('deliveryLocation.address')}
            </label>
            <input
              type="text"
              value={formData.deliveryLocation?.address || ''}
              onChange={(e) => handleFieldChange('deliveryLocation.address', e.target.value)}
              className={`form-input ${getFieldConfidence('deliveryLocation.address') !== null && getFieldConfidence('deliveryLocation.address')! < 0.8 ? 'low-confidence' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Container Information */}
      <div className="form-section">
        <h3>Container Information</h3>
        {formData.containers?.map((container: any, index: number) => (
          <div key={index} className="form-row">
            <div className="form-field">
              <label>
                Container Number
                {renderConfidenceBadge('containerNumber')}
              </label>
              <input
                type="text"
                className="form-input"
                value={container.containerNumber || ''}
                onChange={(e) => {
                  const newContainers = [...formData.containers];
                  newContainers[index].containerNumber = e.target.value;
                  handleFieldChange('containers', newContainers);
                }}
              />
            </div>
            <div className="form-field">
              <label>
                Container Type
                {renderConfidenceBadge('containerType')}
              </label>
              <input
                type="text"
                className="form-input"
                value={container.containerType || ''}
                onChange={(e) => {
                  const newContainers = [...formData.containers];
                  newContainers[index].containerType = e.target.value;
                  handleFieldChange('containers', newContainers);
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Cargo & Special Instructions */}
      <div className="form-section">
        <h3>Cargo Information</h3>
        <div className="form-field">
          <label>
            Cargo Description
            {renderConfidenceBadge('cargoDescription')}
          </label>
          <textarea
            className={`form-input ${getFieldConfidence('cargoDescription') !== null && getFieldConfidence('cargoDescription')! < 0.8 ? 'low-confidence' : ''}`}
            value={formData.cargoDescription || ''}
            onChange={(e) => handleFieldChange('cargoDescription', e.target.value)}
            rows={3}
          />
        </div>
        <div className="form-field">
          <label>
            Special Instructions
            {renderConfidenceBadge('specialInstructions')}
          </label>
          <textarea
            className={`form-input ${getFieldConfidence('specialInstructions') !== null && getFieldConfidence('specialInstructions')! < 0.8 ? 'low-confidence' : ''}`}
            value={formData.specialInstructions || ''}
            onChange={(e) => handleFieldChange('specialInstructions', e.target.value)}
            rows={4}
          />
        </div>
      </div>
    </>
  );
};
