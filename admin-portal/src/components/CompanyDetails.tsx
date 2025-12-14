import { Button, Group } from '@mantine/core';
// CompanyDetails.tsx - Display company/legal entity information
import type React from 'react';
import { useState } from 'react';

import type { LegalEntity, LegalEntityIdentifier } from '../services/api';
import { formatAddress, formatPostalCodeCity, getCountryName } from '../utils/addressFormat';
import { formatDateTime } from '../utils/dateFormat';
import { AddressMap } from './AddressMap';
import './CompanyDetails.css';

interface CompanyDetailsProps {
  company: LegalEntity;
  identifiers?: LegalEntityIdentifier[];
  onEdit: () => void;
  onRefresh?: () => Promise<void>;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Display component renders comprehensive company details with many conditional fields
export const CompanyDetails: React.FC<CompanyDetailsProps> = ({ company, identifiers = [], onEdit, onRefresh }) => {
  // Find EUID from identifiers for EUID field display
  const euidIdentifier = identifiers.find(id => id.identifier_type === 'EUID');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="company-details">
      <div className="detail-header">
        <h3>{company.primary_legal_name || 'Company Information'}</h3>
        <Group gap="sm">
          {onRefresh && (
            <Button color="gray" variant="light" onClick={handleRefresh} loading={isRefreshing}>
              Update
            </Button>
          )}
          <Button color="blue" onClick={onEdit}>
            Edit Company
          </Button>
        </Group>
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
              <div className="detail-label">EUID:</div>
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

            {/* Membership Level field hidden - membership levels feature disabled */}
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

            {/* Formatted address display according to country standards */}
            <div className="detail-row">
              <div className="detail-label">Street:</div>
              <span>{formatAddress(company).streetLine || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">Postal Code / City:</div>
              <span>{formatPostalCodeCity(company.postal_code, company.city, company.country_code)}</span>
            </div>

            {company.province && (
              <div className="detail-row">
                <div className="detail-label">Province/State:</div>
                <span>{company.province}</span>
              </div>
            )}

            <div className="detail-row">
              <div className="detail-label">Country:</div>
              <span>{getCountryName(company.country_code)}</span>
            </div>

            {/* Google Maps showing company location */}
            {(company.address_line1 || company.city) && (
              <div className="detail-row" style={{ marginTop: '16px' }}>
                <AddressMap
                  address={company.address_line1 || ''}
                  city={company.city}
                  postalCode={company.postal_code}
                  country={getCountryName(company.country_code)}
                />
              </div>
            )}
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
