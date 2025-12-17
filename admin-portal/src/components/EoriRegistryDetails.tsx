/**
 * EORI Registry Details Component
 * Displays EU EORI (Economic Operators Registration and Identification) data for a legal entity
 */

import { Badge, Card } from '@mantine/core';
import type React from 'react';
import { useEffect, useState } from 'react';
import { apiV2 } from '../services/api';
import type { EoriRegistryData } from '../services/api/legalEntities';
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
import './ViesRegistryDetails.css'; // Reuse VIES styling
import { formatDate } from '../utils/dateFormat';
import { LoadingState } from './shared/LoadingState';

interface EoriRegistryDetailsProps {
  legalEntityId: string;
}

export const EoriRegistryDetails: React.FC<EoriRegistryDetailsProps> = ({ legalEntityId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registryData, setRegistryData] = useState<EoriRegistryData | null>(null);

  useEffect(() => {
    loadRegistryData();
  }, [legalEntityId]);

  const loadRegistryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiV2.getEoriRegistryData(legalEntityId);
      if (response.hasData && response.data) {
        setRegistryData(response.data);
      } else {
        setRegistryData(null);
      }
    } catch (err: unknown) {
      console.error('Failed to load EORI registry data:', err);

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status: number } };
        if (axiosError.response?.status === 404) {
          setRegistryData(null);
        } else {
          setError('Failed to load EORI registry data');
        }
      } else {
        setError('Failed to load EORI registry data');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '0':
        return { label: 'Valid', color: 'green', icon: <CheckCircle size={14} /> };
      case '1':
        return { label: 'Invalid', color: 'red', icon: <XCircle size={14} /> };
      case '2':
      default:
        return { label: 'Error', color: 'orange', icon: <AlertCircle size={14} /> };
    }
  };

  const isValid = registryData?.status === '0';

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
          <h3>No EORI Registry Data</h3>
          <p>
            EORI registry data will appear here after the EORI number is validated through the EU
            customs system. Use the "Fetch EORI" button in the Identifiers section to validate.
          </p>
          <a
            href="https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp"
            target="_blank"
            rel="noopener noreferrer"
            className="external-link"
          >
            <ExternalLink size={16} />
            Visit EU EORI Validation Portal
          </a>
        </div>
      ) : (
        <div className="vies-registry-details">
          <div className="registry-header">
            <div>
              <h2>{registryData.trader_name || 'EORI Registered Operator'}</h2>
              <p className="vat-code">
                EORI: <span className="vat-value">{registryData.eori_number}</span>
              </p>
            </div>
            <span className={`status-badge ${isValid ? 'status-active' : 'status-inactive'}`}>
              {getStatusBadge(registryData.status).icon}
              {getStatusBadge(registryData.status).label}
            </span>
          </div>

          <div className="registry-grid">
            {/* EORI Information Card */}
            <Card withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <Globe size={20} />
                  EORI Information
                </div>
              </div>
              <div className="card-body">
                <div className="info-table">
                  <div className="info-row">
                    <span className="info-label">EORI Number:</span>
                    <span className="info-value vat-value">{registryData.eori_number}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Country Code:</span>
                    <span className="info-value">{registryData.country_code}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Validation Status:</span>
                    <span className="info-value">
                      <Badge color={getStatusBadge(registryData.status).color} variant="light">
                        {registryData.status_description || getStatusBadge(registryData.status).label}
                      </Badge>
                    </span>
                  </div>
                  {registryData.error_reason && (
                    <div className="info-row">
                      <span className="info-label">Error Reason:</span>
                      <span className="info-value" style={{ color: '#e03131' }}>
                        {registryData.error_reason}
                      </span>
                    </div>
                  )}
                  {registryData.trader_name && (
                    <div className="info-row">
                      <span className="info-label">Trader Name:</span>
                      <span className="info-value">{registryData.trader_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Validation Details Card */}
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
          {(registryData.trader_address || registryData.street || registryData.city) && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <MapPin size={20} />
                  Registered Address
                </div>
              </div>
              <div className="card-body">
                <div className="address-card">
                  {registryData.trader_address ? (
                    <div className="address-line">{registryData.trader_address}</div>
                  ) : (
                    <>
                      {registryData.street && (
                        <div className="address-line">{registryData.street}</div>
                      )}
                      {(registryData.postal_code || registryData.city) && (
                        <div className="address-line">
                          {[registryData.postal_code, registryData.city]
                            .filter(Boolean)
                            .join(' ')}
                        </div>
                      )}
                      {registryData.country && (
                        <div className="address-line">{registryData.country}</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* What is EORI explanation */}
          <Card className="full-width-card" withBorder shadow="sm" padding="lg">
            <div className="card-header">
              <div className="card-title">
                <FileText size={20} />
                About EORI
              </div>
            </div>
            <div className="card-body">
              <p style={{ color: '#495057', lineHeight: 1.6 }}>
                The <strong>Economic Operators Registration and Identification (EORI)</strong> number
                is a unique identifier used for customs purposes in the European Union. It is required
                for businesses engaged in import/export activities with non-EU countries. The EORI number
                is validated against the EU's central EORI database maintained by DG TAXUD.
              </p>
            </div>
          </Card>

          <div className="external-links">
            <a
              href="https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp"
              target="_blank"
              rel="noopener noreferrer"
              className="external-link"
            >
              <ExternalLink size={16} />
              Validate on EU EORI Portal
            </a>
          </div>

          <div className="data-source-footer">
            <p>
              Data source:{' '}
              {registryData.data_source === 'ec_eori_soap'
                ? 'EU EORI Validation Service (DG TAXUD)'
                : registryData.data_source}
            </p>
          </div>
        </div>
      )}
    </LoadingState>
  );
};
