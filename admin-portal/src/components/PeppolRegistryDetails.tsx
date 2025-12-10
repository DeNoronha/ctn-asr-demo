/**
 * Peppol Registry Details Component
 * Displays Peppol Directory data for a legal entity
 */

import { Badge, Card } from '@mantine/core';
import type React from 'react';
import { useEffect, useState } from 'react';
import { apiV2 } from '../services/api';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ExternalLink,
  FileText,
  Globe,
  User,
} from './icons';
import './PeppolRegistryDetails.css';
import { formatDate } from '../utils/dateFormat';
import { LoadingState } from './shared/LoadingState';

interface PeppolRegistryData {
  registry_data_id: string;
  participant_id: string;
  participant_scheme: string;
  participant_value: string;
  entity_name?: string;
  country_code?: string;
  registration_date?: string;
  additional_identifiers?: Array<{ scheme: string; value: string }>;
  document_types?: Array<{ scheme: string; value: string }>;
  websites?: string[];
  contacts?: Array<{
    type?: string;
    name?: string;
    phone?: string;
    email?: string;
  }>;
  geo_info?: string;
  additional_info?: string;
  fetched_at: string;
  last_verified_at?: string;
  data_source: string;
}

interface PeppolRegistryDetailsProps {
  legalEntityId: string;
}

export const PeppolRegistryDetails: React.FC<PeppolRegistryDetailsProps> = ({ legalEntityId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registryData, setRegistryData] = useState<PeppolRegistryData | null>(null);

  useEffect(() => {
    loadRegistryData();
  }, [legalEntityId]);

  const loadRegistryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiV2.getPeppolRegistryData(legalEntityId);
      if (response.hasData && response.data) {
        setRegistryData(response.data);
      } else {
        setRegistryData(null);
      }
    } catch (err: unknown) {
      console.error('Failed to load Peppol registry data:', err);

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status: number } };
        if (axiosError.response?.status === 404) {
          setRegistryData(null);
        } else {
          setError('Failed to load Peppol registry data');
        }
      } else {
        setError('Failed to load Peppol registry data');
      }
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeName = (docType: { scheme: string; value: string }) => {
    // Simplify long document type IDs to readable names
    const value = docType.value;
    if (value.includes('invoice')) return 'Invoice';
    if (value.includes('creditnote')) return 'Credit Note';
    if (value.includes('order')) return 'Order';
    if (value.includes('despatch')) return 'Despatch Advice';
    if (value.includes('catalogue')) return 'Catalogue';
    // Return shortened version
    const parts = value.split('::');
    return parts[parts.length - 1] || value;
  };

  return (
    <LoadingState loading={loading} minHeight={400}>
      {error ? (
        <div className="peppol-registry-error">
          <AlertCircle size={48} />
          <p>{error}</p>
        </div>
      ) : !registryData ? (
        <div className="peppol-registry-empty">
          <Globe size={48} />
          <h3>No Peppol Registry Data</h3>
          <p>
            Peppol registry data will appear here after the company is found in the Peppol Directory.
            Use the "Fetch Peppol" button in the Identifiers section to look up this entity.
          </p>
        </div>
      ) : (
        <div className="peppol-registry-details">
          <div className="registry-header">
            <div>
              <h2>{registryData.entity_name || 'Peppol Participant'}</h2>
              <p className="participant-id">{registryData.participant_id}</p>
            </div>
            <span className="status-badge status-active">
              <CheckCircle size={14} />
              Registered
            </span>
          </div>

          <div className="registry-grid">
            {/* Participant Information Card */}
            <Card withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <Globe size={20} />
                  Participant Information
                </div>
              </div>
              <div className="card-body">
                <div className="info-table">
                  <div className="info-row">
                    <span className="info-label">Participant ID:</span>
                    <span className="info-value participant-id-value">
                      {registryData.participant_id}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Scheme:</span>
                    <span className="info-value">{registryData.participant_scheme}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Value:</span>
                    <span className="info-value">{registryData.participant_value}</span>
                  </div>
                  {registryData.entity_name && (
                    <div className="info-row">
                      <span className="info-label">Entity Name:</span>
                      <span className="info-value">{registryData.entity_name}</span>
                    </div>
                  )}
                  {registryData.country_code && (
                    <div className="info-row">
                      <span className="info-label">Country:</span>
                      <span className="info-value">{registryData.country_code}</span>
                    </div>
                  )}
                  {registryData.geo_info && (
                    <div className="info-row">
                      <span className="info-label">Location:</span>
                      <span className="info-value">{registryData.geo_info}</span>
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
                  {registryData.registration_date && (
                    <div className="info-row">
                      <span className="info-label">Registration Date:</span>
                      <span className="info-value">
                        {formatDate(registryData.registration_date)}
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

          {/* Supported Document Types */}
          {registryData.document_types && registryData.document_types.length > 0 && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <FileText size={20} />
                  Supported Document Types ({registryData.document_types.length})
                </div>
              </div>
              <div className="card-body">
                <div className="document-types">
                  {registryData.document_types.map((docType, index) => (
                    <Badge
                      key={`${docType.scheme}-${index}`}
                      variant="light"
                      color="blue"
                      size="lg"
                      className="doc-type-badge"
                    >
                      {getDocumentTypeName(docType)}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Additional Identifiers */}
          {registryData.additional_identifiers && registryData.additional_identifiers.length > 0 && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <FileText size={20} />
                  Additional Identifiers
                </div>
              </div>
              <div className="card-body">
                <div className="info-table">
                  {registryData.additional_identifiers.map((identifier, index) => (
                    <div key={`${identifier.scheme}-${index}`} className="info-row">
                      <span className="info-label">{identifier.scheme}:</span>
                      <span className="info-value">{identifier.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Contacts */}
          {registryData.contacts && registryData.contacts.length > 0 && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <User size={20} />
                  Contacts
                </div>
              </div>
              <div className="card-body">
                <div className="contacts-grid">
                  {registryData.contacts.map((contact, index) => (
                    <div key={index} className="contact-card">
                      {contact.type && <div className="contact-type">{contact.type}</div>}
                      {contact.name && <div className="contact-name">{contact.name}</div>}
                      {contact.email && (
                        <div className="contact-detail">
                          <a href={`mailto:${contact.email}`}>{contact.email}</a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="contact-detail">
                          {contact.phone}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Websites */}
          {registryData.websites && registryData.websites.length > 0 && (
            <div className="external-links">
              {registryData.websites.map((website, index) => (
                <a
                  key={index}
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  <ExternalLink size={16} />
                  {website}
                </a>
              ))}
            </div>
          )}

          {/* Additional Info */}
          {registryData.additional_info && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <FileText size={20} />
                  Additional Information
                </div>
              </div>
              <div className="card-body">
                <p>{registryData.additional_info}</p>
              </div>
            </Card>
          )}

          <div className="external-links">
            <a
              href={`https://directory.peppol.eu/public/locale-en_US/menuitem-search?participant=${encodeURIComponent(registryData.participant_id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link"
            >
              <ExternalLink size={16} />
              View in Peppol Directory
            </a>
          </div>

          <div className="data-source-footer">
            <p>
              Data source:{' '}
              {registryData.data_source === 'peppol_directory'
                ? 'Peppol Directory'
                : registryData.data_source}
            </p>
          </div>
        </div>
      )}
    </LoadingState>
  );
};
