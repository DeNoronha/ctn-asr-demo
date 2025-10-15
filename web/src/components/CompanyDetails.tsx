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

      <div className="detail-grid detail-grid-columns">
        <div className="detail-column">
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

            <div className="detail-row">
              <label>Domain:</label>
              <span>{company.domain || '-'}</span>
            </div>

            <div className="detail-row">
              <label>Status:</label>
              <span>{company.status || '-'}</span>
            </div>

            <div className="detail-row">
              <label>Membership Level:</label>
              <span>{company.membership_level || '-'}</span>
            </div>
          </div>

          {company.dt_modified && (
            <div className="detail-section">
              <h4>Record Information</h4>

              <div className="detail-row">
                <label>Created:</label>
                <span>
                  {company.dt_created ? new Date(company.dt_created).toLocaleString() : '-'}
                </span>
              </div>

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

        <div className="detail-column">
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

          {(company.direct_parent_legal_entity_id || company.ultimate_parent_legal_entity_id) && (
            <div className="detail-section">
              <h4>Corporate Structure</h4>

              {company.direct_parent_legal_entity_id && (
                <div className="detail-row">
                  <label>Direct Parent:</label>
                  <span>{company.direct_parent_legal_entity_id}</span>
                </div>
              )}

              {company.ultimate_parent_legal_entity_id && (
                <div className="detail-row">
                  <label>Ultimate Parent:</label>
                  <span>{company.ultimate_parent_legal_entity_id}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
