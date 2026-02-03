import { Button, Group } from '@mantine/core';
// CompanyDetails.tsx - Display company/legal entity information
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
export const CompanyDetails: React.FC<CompanyDetailsProps> = ({
  company,
  identifiers = [],
  onEdit,
  onRefresh,
}) => {
  const { t } = useTranslation();
  // Find EUID from identifiers for EUID field display
  const euidIdentifier = identifiers.find((id) => id.identifier_type === 'EUID');
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
        <h3>{company.primary_legal_name || t('companyDetails.title')}</h3>
        <Group gap="sm">
          {onRefresh && (
            <Button color="gray" variant="light" onClick={handleRefresh} loading={isRefreshing}>
              {t('companyDetails.update')}
            </Button>
          )}
          <Button color="blue" onClick={onEdit}>
            {t('companyDetails.editCompany')}
          </Button>
        </Group>
      </div>

      <div className="detail-grid detail-grid-columns">
        <div className="detail-column">
          <div className="detail-section">
            <h4>{t('companyDetails.basicInformation')}</h4>

            <div className="detail-row">
              <div className="detail-label">{t('companyDetails.legalEntityId')}:</div>
              <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                {company.legal_entity_id || '-'}
              </span>
            </div>

            <div className="detail-row">
              <div className="detail-label">{t('companyDetails.legalName')}:</div>
              <span>{company.primary_legal_name || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">{t('companyDetails.legalForm')}:</div>
              <span>{company.entity_legal_form || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">{t('companyDetails.euid')}:</div>
              <span>{euidIdentifier?.identifier_value || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">{t('companyDetails.domain')}:</div>
              <span>{company.domain || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">{t('companyDetails.status')}:</div>
              <span>{company.status || '-'}</span>
            </div>

            {/* Membership Level field hidden - membership levels feature disabled */}
          </div>

          <div className="detail-section">
            <h4>{t('companyDetails.recordInformation')}</h4>

            <div className="detail-row">
              <div className="detail-label">{t('companyDetails.created')}:</div>
              <span>{formatDateTime(company.dt_created)}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">{t('companyDetails.lastModified')}:</div>
              <span>{formatDateTime(company.dt_modified)}</span>
            </div>

            {company.modified_by && (
              <div className="detail-row">
                <div className="detail-label">{t('companyDetails.modifiedBy')}:</div>
                <span>{company.modified_by}</span>
              </div>
            )}
          </div>
        </div>

        <div className="detail-column">
          <div className="detail-section">
            <h4>{t('companyDetails.address')}</h4>

            {/* Formatted address display according to country standards */}
            <div className="detail-row">
              <div className="detail-label">{t('companyDetails.street')}:</div>
              <span>{formatAddress(company).streetLine || '-'}</span>
            </div>

            <div className="detail-row">
              <div className="detail-label">{t('companyDetails.postalCodeCity')}:</div>
              <span>
                {formatPostalCodeCity(company.postal_code, company.city, company.country_code)}
              </span>
            </div>

            {company.province && (
              <div className="detail-row">
                <div className="detail-label">{t('companyDetails.provinceState')}:</div>
                <span>{company.province}</span>
              </div>
            )}

            <div className="detail-row">
              <div className="detail-label">{t('companyDetails.country')}:</div>
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
              <h4>{t('companyDetails.corporateStructure')}</h4>

              {company.direct_parent_legal_entity_id && (
                <div className="detail-row">
                  <div className="detail-label">{t('companyDetails.directParent')}:</div>
                  <span>{company.direct_parent_legal_entity_id}</span>
                </div>
              )}

              {company.ultimate_parent_legal_entity_id && (
                <div className="detail-row">
                  <div className="detail-label">{t('companyDetails.ultimateParent')}:</div>
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
