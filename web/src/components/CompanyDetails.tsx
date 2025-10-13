import { Button } from '@progress/kendo-react-buttons';
// CompanyDetails.tsx - Display company/legal entity information
import type React from 'react';
import type { LegalEntity } from '../services/api';
import './CompanyDetails.css';

interface CompanyDetailsProps {
  company: LegalEntity;
  onEdit: () => void;
}

export const CompanyDetails: React.FC<CompanyDetailsProps> = ({ company, onEdit }) => {
  return (
    <div className="company-details">
      <div className="detail-header">
        <h3>{company.primary_legal_name || 'Company Information'}</h3>
        <Button themeColor="primary" onClick={onEdit}>
          Edit Company
        </Button>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h4>Basic Information</h4>

          <div className="detail-row">
            <label>Legal Name:</label>
            <span>{company.primary_legal_name || '-'}</span>
          </div>

          <div className="detail-row">
            <label>Legal Form:</label>
            <span>{company.entity_legal_form || '-'}</span>
          </div>

          <div className="detail-row">
            <label>Registration Number:</label>
            <span>{company.registered_at || '-'}</span>
          </div>
        </div>

        <div className="detail-section">
          <h4>Address</h4>

          <div className="detail-row">
            <label>Street:</label>
            <span>{company.address_line1 || '-'}</span>
          </div>

          {company.address_line2 && (
            <div className="detail-row">
              <label>Address Line 2:</label>
              <span>{company.address_line2}</span>
            </div>
          )}

          <div className="detail-row">
            <label>Postal Code:</label>
            <span>{company.postal_code || '-'}</span>
          </div>

          <div className="detail-row">
            <label>City:</label>
            <span>{company.city || '-'}</span>
          </div>

          <div className="detail-row">
            <label>Province/State:</label>
            <span>{company.province || '-'}</span>
          </div>

          <div className="detail-row">
            <label>Country:</label>
            <span>{company.country_code || '-'}</span>
          </div>
        </div>

        {company.dt_modified && (
          <div className="detail-section">
            <h4>Record Information</h4>

            <div className="detail-row">
              <label>Last Modified:</label>
              <span>{new Date(company.dt_modified).toLocaleString()}</span>
            </div>

            {company.modified_by && (
              <div className="detail-row">
                <label>Modified By:</label>
                <span>{company.modified_by}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
