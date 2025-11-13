/**
 * KvK Registry Details Component
 * Displays complete KvK registry data fetched from the Dutch Chamber of Commerce API
 */

import { Card, Loader } from '@mantine/core';

import type React from 'react';
import { useEffect, useState } from 'react';
import { apiV2 } from '../services/apiV2';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle,
  ExternalLink,
  FileText,
  MapPin,
  Users,
} from './icons';
import './KvkRegistryDetails.css';
import { formatDate } from '../utils/dateFormat';

interface KvkRegistryData {
  registry_data_id: string;
  legal_entity_id: string;
  kvk_number: string;
  company_name: string;
  legal_form?: string;
  trade_names?: {
    businessName: string;
    currentTradeNames: string[];
  };
  formal_registration_date?: string;
  material_registration_date?: string;
  company_status?: string;
  addresses?: Array<{
    type: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    country: string;
  }>;
  sbi_activities?: Array<{
    sbiCode: string;
    sbiOmschrijving: string;
    indHoofdactiviteit: string;
  }>;
  total_employees?: number;
  kvk_profile_url?: string;
  establishment_profile_url?: string;
  fetched_at: string;
  last_verified_at?: string;
  data_source: string;
}

interface KvkRegistryDetailsProps {
  legalEntityId: string;
}

export const KvkRegistryDetails: React.FC<KvkRegistryDetailsProps> = ({ legalEntityId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registryData, setRegistryData] = useState<KvkRegistryData | null>(null);

  useEffect(() => {
    loadRegistryData();
  }, [legalEntityId]);

  const loadRegistryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiV2.getKvkRegistryData(legalEntityId);
      setRegistryData(data);
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
        <span className="status-badge status-active">
          <CheckCircle size={14} />
          Active
        </span>
      );
    }

    if (status === 'Faillissement' || status === 'Ontbonden') {
      return (
        <span className="status-badge status-inactive">
          <AlertCircle size={14} />
          {status}
        </span>
      );
    }

    return <span className="status-badge">{status}</span>;
  };

  if (loading) {
    return (
      <div className="kvk-registry-loading">
        <Loader size="lg" />
        <p>Loading KvK registry data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kvk-registry-error">
        <AlertCircle size={48} />
        <p>{error}</p>
      </div>
    );
  }

  if (!registryData) {
    return (
      <div className="kvk-registry-empty">
        <FileText size={48} />
        <h3>No KvK Registry Data</h3>
        <p>
          KvK registry data will appear here after uploading and verifying a KvK document in the
          "Document Verification" tab.
        </p>
      </div>
    );
  }

  return (
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
              <div className="info-row">
                <span className="info-label">Official Name:</span>
                <span className="info-value">{registryData.company_name}</span>
              </div>
              {registryData.trade_names?.businessName && (
                <div className="info-row">
                  <span className="info-label">Trade Name:</span>
                  <span className="info-value">{registryData.trade_names.businessName}</span>
                </div>
              )}
              {registryData.legal_form && (
                <div className="info-row">
                  <span className="info-label">Legal Form:</span>
                  <span className="info-value">{registryData.legal_form}</span>
                </div>
              )}
              {registryData.total_employees !== null &&
                registryData.total_employees !== undefined && (
                  <div className="info-row">
                    <span className="info-label">Employees:</span>
                    <span className="info-value">
                      <Users size={14} />
                      {registryData.total_employees}
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
                  <span className="info-value">{formatDate(registryData.last_verified_at)}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
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
              {registryData.addresses.map((address, index) => (
                <div key={index} className="address-card">
                  <div className="address-type">{address.type}</div>
                  <div className="address-details">
                    <div>
                      {address.street} {address.houseNumber}
                    </div>
                    <div>
                      {address.postalCode} {address.city}
                    </div>
                    <div>{address.country}</div>
                  </div>
                </div>
              ))}
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
              {registryData.sbi_activities.map((activity, index) => (
                <div key={index} className="sbi-activity">
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
  );
};
