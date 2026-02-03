/**
 * German Registry Details Component
 * Displays company data from the German Handelsregister
 */

import { Card } from '@mantine/core';

import type React from 'react';
import { useEffect, useState } from 'react';
import { apiV2 } from '../services/api';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  MapPin,
  Users,
} from './icons';
import './GermanRegistryDetails.css';
import { formatDate } from '../utils/dateFormat';
import { LoadingState } from './shared/LoadingState';

// Representative (Geschäftsführer, Vorstand, etc.)
interface Representative {
  name: string;
  role: string;
  birthDate?: string;
  residence?: string;
  appointedDate?: string;
}

// Shareholder
interface Shareholder {
  name: string;
  share?: string;
  type?: string;
}

interface GermanRegistryData {
  registry_data_id: string;
  register_number: string;
  register_type: string; // HRA, HRB, etc.
  register_court: string;
  register_court_code?: string;
  euid?: string;
  company_name: string;
  legal_form?: string;
  legal_form_long?: string;
  company_status?: string;
  registration_date?: string;
  dissolution_date?: string;
  street?: string;
  house_number?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  full_address?: string;
  business_purpose?: string;
  share_capital?: string;
  share_capital_currency?: string;
  representatives?: Representative[];
  shareholders?: Shareholder[];
  is_main_establishment?: boolean;
  branch_count?: number;
  vat_number?: string;
  lei?: string;
  data_source: string;
  source_url?: string;
  fetched_at: string;
  last_verified_at?: string;
  // For empty state
  hasData?: boolean;
  message?: string;
}

interface GermanRegistryDetailsProps {
  legalEntityId: string;
}

export const GermanRegistryDetails: React.FC<GermanRegistryDetailsProps> = ({ legalEntityId }) => {
  const [registryData, setRegistryData] = useState<GermanRegistryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiV2.getGermanRegistryData(legalEntityId);
        if (response.hasData && response.data) {
          setRegistryData(response.data as GermanRegistryData);
        } else {
          setRegistryData({ hasData: false, message: response.message } as GermanRegistryData);
        }
      } catch (err: any) {
        console.error('Failed to fetch German registry data:', err);
        setError(err.message || 'Failed to load German registry data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [legalEntityId]);

  // Format address for display
  const formatAddress = (data: GermanRegistryData): string => {
    if (data.full_address) return data.full_address;

    const parts: string[] = [];
    if (data.street) {
      let streetLine = data.street;
      if (data.house_number) streetLine += ` ${data.house_number}`;
      parts.push(streetLine);
    }
    if (data.postal_code || data.city) {
      parts.push(`${data.postal_code || ''} ${data.city || ''}`.trim());
    }
    if (data.country && data.country !== 'Germany' && data.country !== 'DE') {
      parts.push(data.country);
    }
    return parts.join(', ') || 'Not available';
  };

  // Map status to badge color
  const _getStatusColor = (status?: string): string => {
    if (!status) return 'status-unknown';
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'dissolved':
      case 'liquidation':
      case 'in liquidation':
        return 'status-inactive';
      default:
        return 'status-unknown';
    }
  };

  // Map register type to full name
  const getRegisterTypeName = (type: string): string => {
    switch (type) {
      case 'HRB':
        return 'Handelsregister B (Corporations)';
      case 'HRA':
        return 'Handelsregister A (Partnerships)';
      case 'GnR':
        return 'Genossenschaftsregister (Cooperatives)';
      case 'PR':
        return 'Partnerschaftsregister (Partnerships)';
      case 'VR':
        return 'Vereinsregister (Associations)';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <LoadingState loading={true}>
        <div className="german-registry-loading">
          <p>Loading German registry data...</p>
        </div>
      </LoadingState>
    );
  }

  if (error) {
    return (
      <div className="german-registry-error">
        <AlertCircle size={48} />
        <p>{error}</p>
      </div>
    );
  }

  if (!registryData || registryData.hasData === false) {
    return (
      <div className="german-registry-empty">
        <Building2 size={48} />
        <h3>No German Registry Data</h3>
        <p>
          {registryData?.message ||
            'Click "Enrich" to fetch company data from the German Handelsregister.'}
        </p>
      </div>
    );
  }

  return (
    <LoadingState loading={loading}>
      {registryData && (
        <div className="german-registry-details">
          {/* Header with company name and status */}
          <div className="registry-header">
            <div>
              <h2>{registryData.company_name}</h2>
              <p className="register-number">
                {registryData.register_type} {registryData.register_number}
                {registryData.register_court && ` - ${registryData.register_court}`}
              </p>
            </div>
            <span
              className={`validation-badge ${registryData.company_status === 'Active' ? 'validation-valid' : 'validation-invalid'}`}
            >
              {registryData.company_status === 'Active' ? (
                <CheckCircle size={14} />
              ) : (
                <AlertCircle size={14} />
              )}
              {registryData.company_status === 'Active'
                ? 'VALID'
                : registryData.company_status || 'Unknown'}
            </span>
          </div>

          {/* Main content grid */}
          <div className="registry-grid">
            {/* Company Information Card */}
            <Card withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <Building2 size={20} />
                  Company Information
                </div>
              </div>
              <div className="card-body">
                <div className="info-table">
                  <div className="info-row">
                    <span className="info-label">Register Number:</span>
                    <span className="info-value">
                      {registryData.register_type} {registryData.register_number}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Register Type:</span>
                    <span className="info-value">
                      {getRegisterTypeName(registryData.register_type)}
                    </span>
                  </div>
                  {registryData.register_court && (
                    <div className="info-row">
                      <span className="info-label">Register Court:</span>
                      <span className="info-value">{registryData.register_court}</span>
                    </div>
                  )}
                  {registryData.euid && (
                    <div className="info-row">
                      <span className="info-label">EUID:</span>
                      <span className="info-value euid-value">{registryData.euid}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Company Name:</span>
                    <span className="info-value">{registryData.company_name}</span>
                  </div>
                  {registryData.legal_form && (
                    <div className="info-row">
                      <span className="info-label">Legal Form:</span>
                      <span className="info-value">{registryData.legal_form}</span>
                    </div>
                  )}
                  {registryData.legal_form_long &&
                    registryData.legal_form_long !== registryData.legal_form && (
                      <div className="info-row">
                        <span className="info-label">Legal Form (Full):</span>
                        <span className="info-value">{registryData.legal_form_long}</span>
                      </div>
                    )}
                </div>
              </div>
            </Card>

            {/* Registration Dates Card */}
            <Card withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <Calendar size={20} />
                  Registration Dates
                </div>
              </div>
              <div className="card-body">
                <div className="info-table">
                  {registryData.registration_date && (
                    <div className="info-row">
                      <span className="info-label">Registration Date:</span>
                      <span className="info-value">
                        {formatDate(registryData.registration_date)}
                      </span>
                    </div>
                  )}
                  {registryData.dissolution_date && (
                    <div className="info-row">
                      <span className="info-label">Dissolution Date:</span>
                      <span className="info-value">
                        {formatDate(registryData.dissolution_date)}
                      </span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Data Fetched:</span>
                    <span className="info-value">{formatDate(registryData.fetched_at)}</span>
                  </div>
                  {registryData.last_verified_at && (
                    <div className="info-row">
                      <span className="info-label">Last Verified:</span>
                      <span className="info-value">
                        {formatDate(registryData.last_verified_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Capital Information Card */}
            {registryData.share_capital && (
              <Card withBorder shadow="sm" padding="lg">
                <div className="card-header">
                  <div className="card-title">
                    <Hash size={20} />
                    Capital Information
                  </div>
                </div>
                <div className="card-body">
                  <div className="info-table">
                    <div className="info-row">
                      <span className="info-label">Share Capital:</span>
                      <span className="info-value">
                        {registryData.share_capital} {registryData.share_capital_currency || 'EUR'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Address Section */}
          {(registryData.street || registryData.city || registryData.full_address) && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <MapPin size={20} />
                  Registered Address
                </div>
              </div>
              <div className="card-body">
                <div className="address-display">
                  <p>{formatAddress(registryData)}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Business Purpose Section */}
          {registryData.business_purpose && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <FileText size={20} />
                  Business Purpose (Unternehmensgegenstand)
                </div>
              </div>
              <div className="card-body">
                <p className="business-purpose">{registryData.business_purpose}</p>
              </div>
            </Card>
          )}

          {/* Representatives Section */}
          {registryData.representatives && registryData.representatives.length > 0 && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <Users size={20} />
                  Representatives
                </div>
              </div>
              <div className="card-body">
                <div className="representatives-list">
                  {registryData.representatives.map((rep, index) => (
                    <div key={`rep-${index}`} className="representative-card">
                      <div className="rep-name">{rep.name}</div>
                      <div className="rep-role">{rep.role}</div>
                      {rep.residence && (
                        <div className="rep-detail">Residence: {rep.residence}</div>
                      )}
                      {rep.appointedDate && (
                        <div className="rep-detail">Appointed: {formatDate(rep.appointedDate)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Related Identifiers */}
          {(registryData.vat_number || registryData.lei) && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <Globe size={20} />
                  Related Identifiers
                </div>
              </div>
              <div className="card-body">
                <div className="info-table">
                  {registryData.vat_number && (
                    <div className="info-row">
                      <span className="info-label">VAT Number:</span>
                      <span className="info-value">{registryData.vat_number}</span>
                    </div>
                  )}
                  {registryData.lei && (
                    <div className="info-row">
                      <span className="info-label">LEI:</span>
                      <span className="info-value">{registryData.lei}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* External Links */}
          <div className="external-links">
            {registryData.source_url && (
              <a
                href={registryData.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="external-link"
              >
                <ExternalLink size={16} />
                View Source
              </a>
            )}
            <a
              href={'https://www.handelsregister.de/rp_web/search.xhtml'}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link"
            >
              <ExternalLink size={16} />
              Handelsregister Portal
            </a>
            {registryData.euid && (
              <a
                href={
                  'https://e-justice.europa.eu/489/EN/business_registers__search_for_a_company_in_the_eu.do'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="external-link"
              >
                <ExternalLink size={16} />
                EU Business Register (BRIS)
              </a>
            )}
          </div>

          {/* Data Source Footer */}
          <div className="data-source-footer">
            <p>
              Data source:{' '}
              {registryData.data_source === 'gleif'
                ? 'GLEIF (Global Legal Entity Identifier Foundation)'
                : registryData.data_source === 'handelsregister'
                  ? 'German Handelsregister'
                  : registryData.data_source}
            </p>
          </div>
        </div>
      )}
    </LoadingState>
  );
};
