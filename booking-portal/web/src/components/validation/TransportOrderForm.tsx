import React from 'react';
import { TransportJourneyTimeline } from './TransportJourneyTimeline';

interface TransportOrderFormProps {
  formData: any;
  handleFieldChange: (field: string, value: any) => void;
  renderConfidenceBadge: (field: string) => React.ReactNode;
  getFieldConfidence: (field: string) => number | null;
  isFieldUncertain: (field: string) => boolean;
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
              Planned Pickup Date & Time
              {renderConfidenceBadge('plannedPickupDate')}
            </label>
            <input
              type="datetime-local"
              value={formData.plannedPickupDate || ''}
              onChange={(e) => handleFieldChange('plannedPickupDate', e.target.value)}
              className={`form-input ${getFieldConfidence('plannedPickupDate') !== null && getFieldConfidence('plannedPickupDate')! < 0.8 ? 'low-confidence' : ''}`}
            />
          </div>
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
          {isFieldUncertain('pickupLocation.terminalCode') && (
            <div className="confidence-indicator">
              ⚠️ Terminal code uncertain - Please verify
            </div>
          )}
        </div>
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
              Planned Delivery Date & Time
              {renderConfidenceBadge('plannedDeliveryDate')}
            </label>
            <input
              type="datetime-local"
              value={formData.plannedDeliveryDate || ''}
              onChange={(e) => handleFieldChange('plannedDeliveryDate', e.target.value)}
              className={`form-input ${getFieldConfidence('plannedDeliveryDate') !== null && getFieldConfidence('plannedDeliveryDate')! < 0.8 ? 'low-confidence' : ''}`}
            />
          </div>
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
