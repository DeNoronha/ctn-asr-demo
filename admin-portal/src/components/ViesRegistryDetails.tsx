/**
 * VIES Registry Details Component
 * Displays EU VAT Information Exchange System data for a legal entity
 */

import { Badge, Card } from '@mantine/core';
import type React from 'react';
import { useEffect, useState } from 'react';
import { apiV2 } from '../services/api';
import type { ViesRegistryData } from '../services/api/legalEntities';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ExternalLink,
  FileText,
  Globe,
  MapPin,
  XCircle,
} from './icons';
import './ViesRegistryDetails.css';
import { formatDate } from '../utils/dateFormat';
import { LoadingState } from './shared/LoadingState';

interface ViesRegistryDetailsProps {
  legalEntityId: string;
}

export const ViesRegistryDetails: React.FC<ViesRegistryDetailsProps> = ({ legalEntityId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registryData, setRegistryData] = useState<ViesRegistryData | null>(null);

  useEffect(() => {
    loadRegistryData();
  }, [legalEntityId]);

  const loadRegistryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiV2.getViesRegistryData(legalEntityId);
      if (response.hasData && response.data) {
        setRegistryData(response.data);
      } else {
        setRegistryData(null);
      }
    } catch (err: unknown) {
      console.error('Failed to load VIES registry data:', err);

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status: number } };
        if (axiosError.response?.status === 404) {
          setRegistryData(null);
        } else {
          setError('Failed to load VIES registry data');
        }
      } else {
        setError('Failed to load VIES registry data');
      }
    } finally {
      setLoading(false);
    }
  };

  const getMatchLabel = (matchValue?: number): { label: string; color: string } => {
    switch (matchValue) {
      case 1:
        return { label: 'Match', color: 'green' };
      case 2:
        return { label: 'No Match', color: 'red' };
      case 3:
      default:
        return { label: 'Not Processed', color: 'gray' };
    }
  };

  const parseAddress = (address?: string): string[] => {
    if (!address) return [];
    return address
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  return (
    <LoadingState loading={loading} minHeight={400}>
      {error ? (
        <div className="vies-registry-error">
          <AlertCircle size={48} />
          <p>{error}</p>
        </div>
      ) : !registryData ? (
        <div className="vies-registry-empty">
          <Globe size={48} />
          <h3>No VIES Registry Data</h3>
          <p>
            VIES registry data will appear here after the VAT number is validated through the EU
            VIES system. Use the "Fetch VIES" button in the Identifiers section to validate.
          </p>
          <a
            href="https://ec.europa.eu/taxation_customs/vies/"
            target="_blank"
            rel="noopener noreferrer"
            className="external-link"
          >
            <ExternalLink size={16} />
            Visit EU VIES Portal
          </a>
        </div>
      ) : (
        <div className="vies-registry-details">
          <div className="registry-header">
            <div>
              <h2>{registryData.trader_name || 'VAT Registered Entity'}</h2>
              <p className="vat-code">
                VAT: <span className="vat-value">{registryData.full_vat_number}</span>
              </p>
            </div>
            {registryData.is_valid ? (
              <span className="status-badge status-active">
                <CheckCircle size={14} />
                VAT Valid
              </span>
            ) : (
              <span className="status-badge status-inactive">
                <XCircle size={14} />
                VAT Invalid
              </span>
            )}
          </div>

          <div className="registry-grid">
            {/* VAT Information Card */}
            <Card withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <FileText size={20} />
                  VAT Information
                </div>
              </div>
              <div className="card-body">
                <div className="info-table">
                  <div className="info-row">
                    <span className="info-label">Country Code:</span>
                    <span className="info-value">{registryData.country_code}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">VAT Number:</span>
                    <span className="info-value vat-value">{registryData.vat_number}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Full VAT:</span>
                    <span className="info-value vat-value">{registryData.full_vat_number}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Validation Status:</span>
                    <span className="info-value">
                      <Badge color={registryData.is_valid ? 'green' : 'red'} variant="light">
                        {registryData.user_error || (registryData.is_valid ? 'VALID' : 'INVALID')}
                      </Badge>
                    </span>
                  </div>
                  {registryData.trader_name && (
                    <div className="info-row">
                      <span className="info-label">Trader Name:</span>
                      <span className="info-value">{registryData.trader_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Request Details Card */}
            <Card withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <Calendar size={20} />
                  Validation Details
                </div>
              </div>
              <div className="card-body">
                <div className="info-table">
                  {registryData.request_date && (
                    <div className="info-row">
                      <span className="info-label">Request Date:</span>
                      <span className="info-value">
                        {formatDate(registryData.request_date)}
                      </span>
                    </div>
                  )}
                  {registryData.request_identifier && (
                    <div className="info-row">
                      <span className="info-label">Request ID:</span>
                      <span className="info-value vat-value">
                        {registryData.request_identifier}
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
          </div>

          {/* Trader Address Section */}
          {registryData.trader_address && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <MapPin size={20} />
                  Registered Address
                </div>
              </div>
              <div className="card-body">
                <div className="address-card">
                  {parseAddress(registryData.trader_address).map((line, index) => (
                    <div key={index} className="address-line">{line}</div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Approximate Matching Section (if available) */}
          {(registryData.match_name !== undefined ||
            registryData.match_street !== undefined ||
            registryData.match_postal_code !== undefined ||
            registryData.match_city !== undefined) && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <CheckCircle size={20} />
                  Approximate Matching Results
                </div>
              </div>
              <div className="card-body">
                <p className="matching-explanation">
                  VIES approximate matching compares provided data against registered information.
                  Match values: 1 = Match, 2 = No Match, 3 = Not Processed.
                </p>
                <div className="matching-grid">
                  {registryData.match_name !== undefined && (
                    <div className="match-item">
                      <span className="match-label">Name</span>
                      <Badge color={getMatchLabel(registryData.match_name).color} variant="light">
                        {getMatchLabel(registryData.match_name).label}
                      </Badge>
                      {registryData.approx_name && registryData.approx_name !== '---' && (
                        <span className="match-value">{registryData.approx_name}</span>
                      )}
                    </div>
                  )}
                  {registryData.match_street !== undefined && (
                    <div className="match-item">
                      <span className="match-label">Street</span>
                      <Badge color={getMatchLabel(registryData.match_street).color} variant="light">
                        {getMatchLabel(registryData.match_street).label}
                      </Badge>
                      {registryData.approx_street && registryData.approx_street !== '---' && (
                        <span className="match-value">{registryData.approx_street}</span>
                      )}
                    </div>
                  )}
                  {registryData.match_postal_code !== undefined && (
                    <div className="match-item">
                      <span className="match-label">Postal Code</span>
                      <Badge color={getMatchLabel(registryData.match_postal_code).color} variant="light">
                        {getMatchLabel(registryData.match_postal_code).label}
                      </Badge>
                      {registryData.approx_postal_code && registryData.approx_postal_code !== '---' && (
                        <span className="match-value">{registryData.approx_postal_code}</span>
                      )}
                    </div>
                  )}
                  {registryData.match_city !== undefined && (
                    <div className="match-item">
                      <span className="match-label">City</span>
                      <Badge color={getMatchLabel(registryData.match_city).color} variant="light">
                        {getMatchLabel(registryData.match_city).label}
                      </Badge>
                      {registryData.approx_city && registryData.approx_city !== '---' && (
                        <span className="match-value">{registryData.approx_city}</span>
                      )}
                    </div>
                  )}
                  {registryData.match_company_type !== undefined && (
                    <div className="match-item">
                      <span className="match-label">Company Type</span>
                      <Badge color={getMatchLabel(registryData.match_company_type).color} variant="light">
                        {getMatchLabel(registryData.match_company_type).label}
                      </Badge>
                      {registryData.approx_company_type && registryData.approx_company_type !== '---' && (
                        <span className="match-value">{registryData.approx_company_type}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          <div className="external-links">
            <a
              href={`https://ec.europa.eu/taxation_customs/vies/#/vat-validation`}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link"
            >
              <ExternalLink size={16} />
              Validate on VIES Portal
            </a>
          </div>

          <div className="data-source-footer">
            <p>
              Data source:{' '}
              {registryData.data_source === 'vies_api'
                ? 'EU VIES (VAT Information Exchange System)'
                : registryData.data_source}
            </p>
          </div>
        </div>
      )}
    </LoadingState>
  );
};
