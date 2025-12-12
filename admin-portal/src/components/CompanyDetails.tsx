import { Button } from '@mantine/core';
// CompanyDetails.tsx - Display company/legal entity information
import type React from 'react';

import type { LegalEntity, LegalEntityIdentifier } from '../services/api';
import { formatDateTime } from '../utils/dateFormat';
import './CompanyDetails.css';

interface CompanyDetailsProps {
  company: LegalEntity;
  identifiers?: LegalEntityIdentifier[];
  onEdit: () => void;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Display component renders comprehensive company details with many conditional fields
export const CompanyDetails: React.FC<CompanyDetailsProps> = ({ company, identifiers = [], onEdit }) => {
  // Find EUID from identifiers for Registration Number field
  const euidIdentifier = identifiers.find(id => id.identifier_type === 'EUID');

  return (
    <div className="company-details">
      <div className="detail-header">
        <h3>{company.primary_legal_name || 'Company Information'}</h3>
        <Button color="blue" onClick={onEdit}>
          Edit Company
        </Button>
      </div>

      <div className="detail-grid detail-grid-columns">
        <div className="detail-column">
          <div className="detail-section">
            <h4>Basic Information</h4>

            <div className="detail-row">
              <div className="detail-label">Legal Entity ID:</div>
              <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{company.legal_entity_id || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">Legal Name:</div>
              <span>{company.primary_legal_name || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">Legal Form:</div>
              <span>{company.entity_legal_form || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">Registration Number:</div>
              <span>{euidIdentifier?.identifier_value || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">Domain:</div>
              <span>{company.domain || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">Status:</div>
              <span>{company.status || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">Membership Level:</div>
              <span>{company.membership_level || '-'}</span>
            </div>
          </div>

          <div className="detail-section">
            <h4>Record Information</h4>

            <div className="detail-row">
              <div className="detail-label">Created:</div>
              <span>{formatDateTime(company.dt_created)}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">Last Modified:</div>
              <span>{formatDateTime(company.dt_modified)}</span>
            </div>

            {company.modified_by && (
              <div className="detail-row">
                <div className="detail-label">Modified By:</div>
                <span>{company.modified_by}</span>
              </div>
            )}
          </div>
        </div>

        <div className="detail-column">
          <div className="detail-section">
            <h4>Address</h4>

            <div className="detail-row">
              <div className="detail-label">Street:</div>
              <span>{company.address_line1 || '-'}</span>
            </div>

            {company.address_line2 && (
              <div className="detail-row">
                <div className="detail-label">Address Line 2:</div>
                <span>{company.address_line2}</span>
              </div>
            )}

            <div className="detail-row">
              <div className="detail-label">Postal Code:</div>
              <span>{company.postal_code || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">City:</div>
              <span>{company.city || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">Province/State:</div>
              <span>{company.province || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">Country:</div>
              <span>{company.country_code || '-'}</span>
            </div>
          </div>

          {(company.direct_parent_legal_entity_id || company.ultimate_parent_legal_entity_id) && (
            <div className="detail-section">
              <h4>Corporate Structure</h4>

              {company.direct_parent_legal_entity_id && (
                <div className="detail-row">
                  <div className="detail-label">Direct Parent:</div>
                  <span>{company.direct_parent_legal_entity_id}</span>
                </div>
              )}

              {company.ultimate_parent_legal_entity_id && (
                <div className="detail-row">
                  <div className="detail-label">Ultimate Parent:</div>
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
