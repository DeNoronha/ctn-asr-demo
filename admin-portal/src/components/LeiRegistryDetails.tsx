/**
 * LEI Registry Details Component
 * Displays complete LEI registry data fetched from the GLEIF API
 */

import { Card } from '@mantine/core';
import type React from 'react';
import { useEffect, useState } from 'react';
import { apiV2 } from '../services/api';
import type { LeiRegistryResponse, LeiAddress } from '../services/api/legalEntities';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle,
  ExternalLink,
  FileText,
  MapPin,
} from './icons';
import './LeiRegistryDetails.css';
import { formatDate } from '../utils/dateFormat';
import { LoadingState } from './shared/LoadingState';

interface LeiRegistryDetailsProps {
  legalEntityId: string;
}

export const LeiRegistryDetails: React.FC<LeiRegistryDetailsProps> = ({ legalEntityId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registryData, setRegistryData] = useState<LeiRegistryResponse | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Load function is stable, depends only on legalEntityId
  useEffect(() => {
    loadRegistryData();
  }, [legalEntityId]);

  const loadRegistryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiV2.getLeiRegistryData(legalEntityId);
      setRegistryData(data);
    } catch (err: unknown) {
      console.error('Failed to load LEI registry data:', err);

      // 404 means no data available yet
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status: number } };
        if (axiosError.response?.status === 404) {
          setRegistryData(null);
        } else {
          setError('Failed to load LEI registry data');
        }
      } else {
        setError('Failed to load LEI registry data');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) {
      return null;
    }

    if (status === 'ISSUED' || status === 'ACTIVE') {
      return (
        <span className="validation-badge validation-valid">
          <CheckCircle size={14} />
          VALID
        </span>
      );
    }

    if (status === 'LAPSED' || status === 'RETIRED' || status === 'CANCELLED') {
      return (
        <span className="validation-badge validation-invalid">
          <AlertCircle size={14} />
          INVALID
        </span>
      );
    }

    return <span className="validation-badge">{status}</span>;
  };

  const formatAddress = (address?: LeiAddress) => {
    if (!address) return null;

    const parts: string[] = [];
    if (address.addressLines?.length) {
      parts.push(...address.addressLines);
    }
    if (address.city) {
      const cityLine = address.postalCode ? `${address.postalCode} ${address.city}` : address.city;
      parts.push(cityLine);
    }
    if (address.region) {
      parts.push(address.region);
    }
    if (address.country) {
      parts.push(address.country);
    }

    return parts;
  };

  return (
    <LoadingState loading={loading} minHeight={400}>
      {error ? (
        <div className="lei-registry-error">
          <AlertCircle size={48} />
          <p>{error}</p>
        </div>
      ) : !registryData ? (
        <div className="lei-registry-empty">
          <FileText size={48} />
          <h3>No LEI Registry Data</h3>
          <p>
            LEI (Legal Entity Identifier) registry data will appear here after an LEI is associated
            with this entity and verified through GLEIF.
          </p>
        </div>
      ) : !registryData.hasData ? (
        <div className="lei-registry-empty">
          <FileText size={48} />
          <h3>LEI Found: {registryData.lei}</h3>
          <p>{registryData.message || 'Detailed GLEIF registry data has not been fetched yet.'}</p>
          <a
            href={`https://search.gleif.org/#/record/${registryData.lei}`}
            target="_blank"
            rel="noopener noreferrer"
            className="external-link"
          >
            <ExternalLink size={16} />
            View on GLEIF Search
          </a>
        </div>
      ) : (
        <div className="lei-registry-details">
          <div className="registry-header">
            <div>
              <h2>{registryData.data?.legalName}</h2>
              <p className="lei-code">LEI: {registryData.lei}</p>
            </div>
            {getStatusBadge(registryData.data?.registrationStatus)}
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
                    <span className="info-label">LEI:</span>
                    <span className="info-value lei-value">{registryData.lei}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Legal Name:</span>
                    <span className="info-value">{registryData.data?.legalName}</span>
                  </div>
                  {registryData.data?.registrationAuthority && (
                    <div className="info-row">
                      <span className="info-label">Registration Authority:</span>
                      <span className="info-value">
                        {registryData.data.registrationAuthority}
                      </span>
                    </div>
                  )}
                  {registryData.data?.registrationNumber && (
                    <div className="info-row">
                      <span className="info-label">Registration Number:</span>
                      <span className="info-value">{registryData.data.registrationNumber}</span>
                    </div>
                  )}
                  {registryData.data?.entityStatus && (
                    <div className="info-row">
                      <span className="info-label">Entity Status:</span>
                      <span className="info-value">{registryData.data.entityStatus}</span>
                    </div>
                  )}
                  {registryData.data?.managingLou && (
                    <div className="info-row">
                      <span className="info-label">Managing LOU:</span>
                      <span className="info-value">{registryData.data.managingLou}</span>
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
                  {registryData.data?.initialRegistrationDate && (
                    <div className="info-row">
                      <span className="info-label">Initial Registration:</span>
                      <span className="info-value">
                        {formatDate(registryData.data.initialRegistrationDate)}
                      </span>
                    </div>
                  )}
                  {registryData.data?.lastUpdateDate && (
                    <div className="info-row">
                      <span className="info-label">Last Updated:</span>
                      <span className="info-value">
                        {formatDate(registryData.data.lastUpdateDate)}
                      </span>
                    </div>
                  )}
                  {registryData.data?.nextRenewalDate && (
                    <div className="info-row">
                      <span className="info-label">Next Renewal:</span>
                      <span className="info-value">
                        {formatDate(registryData.data.nextRenewalDate)}
                      </span>
                    </div>
                  )}
                  {registryData.fetchedAt && (
                    <div className="info-row">
                      <span className="info-label">Data Fetched:</span>
                      <span className="info-value">{formatDate(registryData.fetchedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Addresses Section */}
          {(registryData.data?.legalAddress || registryData.data?.headquartersAddress) && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <MapPin size={20} />
                  Addresses
                </div>
              </div>
              <div className="card-body">
                <div className="addresses-grid">
                  {registryData.data?.legalAddress && (
                    <div className="address-card">
                      <div className="address-type">Legal Address</div>
                      <div className="address-details">
                        {formatAddress(registryData.data.legalAddress)?.map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {registryData.data?.headquartersAddress && (
                    <div className="address-card">
                      <div className="address-type">Headquarters Address</div>
                      <div className="address-details">
                        {formatAddress(registryData.data.headquartersAddress)?.map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* External Links */}
          <div className="external-links">
            <a
              href={`https://search.gleif.org/#/record/${registryData.lei}`}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link"
            >
              <ExternalLink size={16} />
              View Full Record on GLEIF
            </a>
          </div>

          <div className="data-source-footer">
            <p>Data source: GLEIF API (Global Legal Entity Identifier Foundation)</p>
          </div>
        </div>
      )}
    </LoadingState>
  );
};
