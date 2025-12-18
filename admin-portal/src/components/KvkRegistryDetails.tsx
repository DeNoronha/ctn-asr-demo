/**
 * KvK Registry Details Component
 * Displays complete KvK registry data fetched from the Dutch Chamber of Commerce API
 */

import { Card } from '@mantine/core';

import type React from 'react';
import { useEffect, useState } from 'react';
import { apiV2 } from "../services/api";
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
import './KvkRegistryDetails.css';
import { formatDate } from '../utils/dateFormat';
import { LoadingState } from './shared/LoadingState';

// Address format from KvK API (Dutch field names)
interface KvkAddress {
  type: string;
  // Dutch field names from KvK API
  straatnaam?: string;
  huisnummer?: number | string;
  postcode?: string;
  plaats?: string;
  land?: string;
  volledigAdres?: string;
  postbusnummer?: number;
  // English field names (for backwards compatibility)
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

// Trade name format from KvK API
interface KvkTradeName {
  naam: string;
  volgorde: number;
}

interface KvkRegistryData {
  registry_data_id: string;
  legal_entity_id?: string;
  kvk_number: string;
  company_name: string;
  legal_form?: string;
  trade_names?: KvkTradeName[] | {
    businessName: string;
    currentTradeNames: string[];
  };
  formal_registration_date?: string;
  material_registration_date?: string;
  material_end_date?: string;
  company_status?: string;
  addresses?: KvkAddress[];
  sbi_activities?: Array<{
    sbiCode: string;
    sbiOmschrijving: string;
    indHoofdactiviteit: string;
  }>;
  total_employees?: number;
  fulltime_employees?: number;
  parttime_employees?: number;
  kvk_profile_url?: string;
  establishment_profile_url?: string;
  fetched_at: string;
  last_verified_at?: string;
  data_source: string;
  // Additional fields from expanded schema
  statutory_name?: string;
  rsin?: string;
  vestigingsnummer?: string;
  primary_trade_name?: string;
  rechtsvorm?: string;
  total_branches?: number;
  commercial_branches?: number;
  non_commercial_branches?: number;
  ind_hoofdvestiging?: string;
  ind_commerciele_vestiging?: string;
  ind_non_mailing?: string;
  websites?: string[];
  geo_data?: {
    latitude?: number;
    longitude?: number;
  };
}

interface KvkRegistryDetailsProps {
  legalEntityId: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: KVK registry display requires extensive conditional rendering for nested data
export const KvkRegistryDetails: React.FC<KvkRegistryDetailsProps> = ({ legalEntityId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registryData, setRegistryData] = useState<KvkRegistryData | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Load function is stable, depends only on legalEntityId
  useEffect(() => {
    loadRegistryData();
  }, [legalEntityId]);

  const loadRegistryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiV2.getKvkRegistryData(legalEntityId);

      // Handle both response formats:
      // 1. Direct data from kvk_registry_data table (has kvk_number field)
      // 2. Wrapped data from verification history (has hasData field)
      if (data && 'kvk_number' in data) {
        // Direct data from kvk_registry_data table
        setRegistryData(data);
      } else if (data && 'hasData' in data) {
        // Wrapped data from verification history
        if (data.hasData && data.data) {
          setRegistryData(data.data);
        } else {
          setRegistryData(null);
        }
      } else {
        setRegistryData(null);
      }
    } catch (err: unknown) {
      console.error('Failed to load KvK registry data:', err);

      // 404 means no data available yet
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status: number } };
        if (axiosError.response?.status === 404) {
          setRegistryData(null);
        } else {
          setError('Failed to load KvK registry data');
        }
      } else {
        setError('Failed to load KvK registry data');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status || status === 'Active') {
      return (
        <span className="validation-badge validation-valid">
          <CheckCircle size={14} />
          VALID
        </span>
      );
    }

    if (status === 'Faillissement' || status === 'Ontbonden') {
      return (
        <span className="validation-badge validation-invalid">
          <AlertCircle size={14} />
          {status}
        </span>
      );
    }

    return <span className="validation-badge">{status}</span>;
  };

  return (
    <LoadingState loading={loading} minHeight={400}>
      {error ? (
        <div className="kvk-registry-error">
          <AlertCircle size={48} />
          <p>{error}</p>
        </div>
      ) : !registryData ? (
        <div className="kvk-registry-empty">
          <FileText size={48} />
          <h3>No KvK Registry Data</h3>
          <p>
            KvK registry data will appear here after uploading and verifying a KvK document in the
            "Document Verification" tab.
          </p>
        </div>
      ) : (
        <div className="kvk-registry-details">
          <div className="registry-header">
            <div>
              <h2>{registryData.company_name}</h2>
              <p className="kvk-number">KvK {registryData.kvk_number}</p>
            </div>
            {getStatusBadge(registryData.company_status)}
          </div>

          <div className="registry-grid">
            {/* Basic Information Card */}
            <Card withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <Building2 size={20} />
                  Basic Information
                </div>
              </div>
              <div className="card-body">
                <div className="info-table">
                  <div className="info-row">
                    <span className="info-label">KvK Number:</span>
                    <span className="info-value">{registryData.kvk_number}</span>
                  </div>
                  {registryData.vestigingsnummer && (
                    <div className="info-row">
                      <span className="info-label">Vestigingsnummer:</span>
                      <span className="info-value">{registryData.vestigingsnummer}</span>
                    </div>
                  )}
                  {registryData.rsin && (
                    <div className="info-row">
                      <span className="info-label">RSIN:</span>
                      <span className="info-value">{registryData.rsin}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Official Name:</span>
                    <span className="info-value">{registryData.company_name}</span>
                  </div>
                  {registryData.statutory_name && registryData.statutory_name !== registryData.company_name && (
                    <div className="info-row">
                      <span className="info-label">Statutory Name:</span>
                      <span className="info-value">{registryData.statutory_name}</span>
                    </div>
                  )}
                  {/* Support both Dutch array format and English object format for trade names */}
                  {registryData.trade_names && (
                    Array.isArray(registryData.trade_names) ? (
                      registryData.trade_names.length > 0 && (
                        <div className="info-row">
                          <span className="info-label">Trade Name{registryData.trade_names.length > 1 ? 's' : ''}:</span>
                          <span className="info-value">
                            {(registryData.trade_names as KvkTradeName[]).map(tn => tn.naam).join(', ')}
                          </span>
                        </div>
                      )
                    ) : (
                      registryData.trade_names.businessName && (
                        <div className="info-row">
                          <span className="info-label">Trade Name:</span>
                          <span className="info-value">{registryData.trade_names.businessName}</span>
                        </div>
                      )
                    )
                  )}
                  {registryData.legal_form && (
                    <div className="info-row">
                      <span className="info-label">Legal Form:</span>
                      <span className="info-value">{registryData.legal_form}</span>
                    </div>
                  )}
                  {registryData.rechtsvorm && registryData.rechtsvorm !== registryData.legal_form && (
                    <div className="info-row">
                      <span className="info-label">Rechtsvorm:</span>
                      <span className="info-value">{registryData.rechtsvorm}</span>
                    </div>
                  )}
                  {registryData.ind_hoofdvestiging && (
                    <div className="info-row">
                      <span className="info-label">Main Establishment:</span>
                      <span className="info-value">
                        {registryData.ind_hoofdvestiging === 'Ja' ? 'Yes' : 'No'}
                      </span>
                    </div>
                  )}
                  {registryData.ind_commerciele_vestiging && (
                    <div className="info-row">
                      <span className="info-label">Commercial:</span>
                      <span className="info-value">
                        {registryData.ind_commerciele_vestiging === 'Ja' ? 'Yes' : 'No'}
                      </span>
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
                  Registration
                </div>
              </div>
              <div className="card-body">
                <div className="info-table">
                  {registryData.formal_registration_date && (
                    <div className="info-row">
                      <span className="info-label">Formal Registration:</span>
                      <span className="info-value">
                        {formatDate(registryData.formal_registration_date)}
                      </span>
                    </div>
                  )}
                  {registryData.material_registration_date && (
                    <div className="info-row">
                      <span className="info-label">Material Registration:</span>
                      <span className="info-value">
                        {formatDate(registryData.material_registration_date)}
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

            {/* Employees & Branches Card - only show if data available */}
            {(registryData.total_employees !== null && registryData.total_employees !== undefined) ||
             registryData.fulltime_employees || registryData.parttime_employees ||
             registryData.total_branches ? (
              <Card withBorder shadow="sm" padding="lg">
                <div className="card-header">
                  <div className="card-title">
                    <Users size={20} />
                    Employees & Branches
                  </div>
                </div>
                <div className="card-body">
                  <div className="info-table">
                    {registryData.total_employees !== null && registryData.total_employees !== undefined && (
                      <div className="info-row">
                        <span className="info-label">Total Employees:</span>
                        <span className="info-value">{registryData.total_employees}</span>
                      </div>
                    )}
                    {registryData.fulltime_employees !== null && registryData.fulltime_employees !== undefined && (
                      <div className="info-row">
                        <span className="info-label">Full-time:</span>
                        <span className="info-value">{registryData.fulltime_employees}</span>
                      </div>
                    )}
                    {registryData.parttime_employees !== null && registryData.parttime_employees !== undefined && (
                      <div className="info-row">
                        <span className="info-label">Part-time:</span>
                        <span className="info-value">{registryData.parttime_employees}</span>
                      </div>
                    )}
                    {registryData.total_branches !== null && registryData.total_branches !== undefined && (
                      <div className="info-row">
                        <span className="info-label">Total Branches:</span>
                        <span className="info-value">{registryData.total_branches}</span>
                      </div>
                    )}
                    {registryData.commercial_branches !== null && registryData.commercial_branches !== undefined && (
                      <div className="info-row">
                        <span className="info-label">Commercial:</span>
                        <span className="info-value">{registryData.commercial_branches}</span>
                      </div>
                    )}
                    {registryData.non_commercial_branches !== null && registryData.non_commercial_branches !== undefined && (
                      <div className="info-row">
                        <span className="info-label">Non-commercial:</span>
                        <span className="info-value">{registryData.non_commercial_branches}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ) : null}
          </div>

          {/* Addresses Section */}
          {registryData.addresses && registryData.addresses.length > 0 && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <MapPin size={20} />
                  Addresses
                </div>
              </div>
              <div className="card-body">
                <div className="addresses-grid">
                  {registryData.addresses.map((address, index) => {
                    // Support both Dutch (KvK API) and English field names
                    const street = address.straatnaam || address.street;
                    const houseNumber = address.huisnummer || address.houseNumber;
                    const postalCode = address.postcode || address.postalCode;
                    const city = address.plaats || address.city;
                    const country = address.land || address.country;
                    const fullAddress = address.volledigAdres;

                    return (
                      <div
                        key={`${address.type}-${postalCode}-${houseNumber}-${index}`}
                        className="address-card"
                      >
                        <div className="address-type">{address.type}</div>
                        <div className="address-details">
                          {fullAddress ? (
                            // Use full address if available (from KvK API)
                            <div style={{ whiteSpace: 'pre-line' }}>
                              {fullAddress.split(' ').join('\n').replace(/\n([0-9]{4}[A-Z]{2})/g, '\n$1 ')}
                            </div>
                          ) : (
                            // Fall back to individual fields
                            <>
                              {(street || houseNumber) && (
                                <div>
                                  {street} {houseNumber}
                                </div>
                              )}
                              {(postalCode || city) && (
                                <div>
                                  {postalCode} {city}
                                </div>
                              )}
                              {country && <div>{country}</div>}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Business Activities Section */}
          {registryData.sbi_activities && registryData.sbi_activities.length > 0 && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <FileText size={20} />
                  Business Activities (SBI Codes)
                </div>
              </div>
              <div className="card-body">
                <div className="sbi-activities">
                  {registryData.sbi_activities.map((activity) => (
                    <div key={activity.sbiCode} className="sbi-activity">
                      <div className="sbi-code">
                        {activity.sbiCode}
                        {activity.indHoofdactiviteit === 'Ja' && (
                          <span className="primary-badge">Primary</span>
                        )}
                      </div>
                      <div className="sbi-description">{activity.sbiOmschrijving}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Company Websites */}
          {registryData.websites && registryData.websites.length > 0 && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <Globe size={20} />
                  Company Websites
                </div>
              </div>
              <div className="card-body">
                <div className="websites-list">
                  {registryData.websites.map((website, index) => (
                    <a
                      key={`website-${index}`}
                      href={website.startsWith('http') ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="website-link"
                    >
                      <Globe size={14} />
                      {website}
                    </a>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* External Links */}
          {(registryData.kvk_profile_url || registryData.establishment_profile_url) && (
            <div className="external-links">
              {registryData.kvk_profile_url && (
                <a
                  href={registryData.kvk_profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  <ExternalLink size={16} />
                  View Full Profile on KvK.nl
                </a>
              )}
              {registryData.establishment_profile_url && (
                <a
                  href={registryData.establishment_profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  <ExternalLink size={16} />
                  View Establishment Profile
                </a>
              )}
            </div>
          )}

          <div className="data-source-footer">
            <p>
              Data source:{' '}
              {registryData.data_source === 'kvk_api'
                ? 'KvK API (Dutch Chamber of Commerce)'
                : registryData.data_source}
            </p>
          </div>
        </div>
      )}
    </LoadingState>
  );
};
