/**
 * Belgium Registry Details Component
 * Displays Belgian KBO (Kruispuntbank van Ondernemingen) data for a legal entity
 */

import { Badge, Card, Table } from '@mantine/core';
import type React from 'react';
import { useEffect, useState } from 'react';
import { apiV2 } from '../services/api';
import type { BelgiumRegistryData } from '../services/api/legalEntities';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle,
  ExternalLink,
  FileText,
  Globe,
  MapPin,
  Users,
  XCircle,
} from './icons';
import './ViesRegistryDetails.css'; // Reuse VIES styling
import { formatDate } from '../utils/dateFormat';
import { LoadingState } from './shared/LoadingState';

interface BelgiumRegistryDetailsProps {
  legalEntityId: string;
}

export const BelgiumRegistryDetails: React.FC<BelgiumRegistryDetailsProps> = ({ legalEntityId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registryData, setRegistryData] = useState<BelgiumRegistryData | null>(null);

  useEffect(() => {
    loadRegistryData();
  }, [legalEntityId]);

  const loadRegistryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiV2.getBelgiumRegistryData(legalEntityId);
      if (response.hasData && response.data) {
        setRegistryData(response.data);
      } else {
        setRegistryData(null);
      }
    } catch (err: unknown) {
      console.error('Failed to load Belgium registry data:', err);

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status: number } };
        if (axiosError.response?.status === 404) {
          setRegistryData(null);
        } else {
          setError('Failed to load Belgian KBO registry data');
        }
      } else {
        setError('Failed to load Belgian KBO registry data');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return { label: 'Unknown', color: 'gray' };
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'actief' || normalizedStatus === 'active') {
      return { label: 'Active', color: 'green' };
    }
    if (normalizedStatus === 'stopgezet' || normalizedStatus === 'stopped') {
      return { label: 'Stopped', color: 'red' };
    }
    return { label: status, color: 'gray' };
  };

  const isActive = registryData?.company_status?.toLowerCase() === 'actief' ||
                   registryData?.company_status?.toLowerCase() === 'active';

  return (
    <LoadingState loading={loading} minHeight={400}>
      {error ? (
        <div className="vies-registry-error">
          <AlertCircle size={48} />
          <p>{error}</p>
        </div>
      ) : !registryData ? (
        <div className="vies-registry-empty">
          <Building2 size={48} />
          <h3>No Belgian KBO Registry Data</h3>
          <p>
            Belgian KBO registry data will appear here after the company is enriched through the KBO
            (Kruispuntbank van Ondernemingen) system. Use the "Enrich" button to fetch data.
          </p>
          <a
            href="https://kbopub.economie.fgov.be/kbopub/zoekwoordenaliasaliasaliasaliasalias.html"
            target="_blank"
            rel="noopener noreferrer"
            className="external-link"
          >
            <ExternalLink size={16} />
            Visit KBO Public Search
          </a>
        </div>
      ) : (
        <div className="vies-registry-details">
          <div className="registry-header">
            <div>
              <h2>{registryData.company_name || 'Belgian Company'}</h2>
              <p className="vat-code">
                KBO: <span className="vat-value">{registryData.kbo_number}</span>
              </p>
            </div>
            <span className={`status-badge ${isActive ? 'status-active' : 'status-inactive'}`}>
              {isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {getStatusBadge(registryData.company_status).label}
            </span>
          </div>

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
                    <span className="info-label">KBO Number:</span>
                    <span className="info-value vat-value">{registryData.kbo_number}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Company Name:</span>
                    <span className="info-value">{registryData.company_name}</span>
                  </div>
                  {registryData.legal_form && (
                    <div className="info-row">
                      <span className="info-label">Legal Form:</span>
                      <span className="info-value">
                        <Badge color="blue" variant="light">
                          {registryData.legal_form}
                        </Badge>
                        {registryData.legal_form_full && (
                          <span style={{ marginLeft: 8, color: '#868e96', fontSize: '0.85em' }}>
                            ({registryData.legal_form_full})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {registryData.enterprise_type && (
                    <div className="info-row">
                      <span className="info-label">Enterprise Type:</span>
                      <span className="info-value">{registryData.enterprise_type}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Status:</span>
                    <span className="info-value">
                      <Badge color={getStatusBadge(registryData.company_status).color} variant="light">
                        {getStatusBadge(registryData.company_status).label}
                      </Badge>
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* VAT & Registration Card */}
            <Card withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <FileText size={20} />
                  VAT & Registration
                </div>
              </div>
              <div className="card-body">
                <div className="info-table">
                  {registryData.vat_number && (
                    <div className="info-row">
                      <span className="info-label">VAT Number:</span>
                      <span className="info-value vat-value">{registryData.vat_number}</span>
                    </div>
                  )}
                  {registryData.vat_status && (
                    <div className="info-row">
                      <span className="info-label">VAT Status:</span>
                      <span className="info-value">
                        <Badge color={registryData.vat_status.toLowerCase() === 'active' ? 'green' : 'gray'} variant="light">
                          {registryData.vat_status}
                        </Badge>
                      </span>
                    </div>
                  )}
                  {registryData.start_date && (
                    <div className="info-row">
                      <span className="info-label">Start Date:</span>
                      <span className="info-value">{formatDate(registryData.start_date)}</span>
                    </div>
                  )}
                  {registryData.end_date && (
                    <div className="info-row">
                      <span className="info-label">End Date:</span>
                      <span className="info-value">{formatDate(registryData.end_date)}</span>
                    </div>
                  )}
                  {registryData.lei && (
                    <div className="info-row">
                      <span className="info-label">LEI:</span>
                      <span className="info-value vat-value">{registryData.lei}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Address Section */}
          {(registryData.full_address || registryData.street || registryData.city) && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <MapPin size={20} />
                  Registered Address
                </div>
              </div>
              <div className="card-body">
                <div className="address-card">
                  {registryData.full_address ? (
                    <div className="address-line">{registryData.full_address}</div>
                  ) : (
                    <>
                      {registryData.street && (
                        <div className="address-line">
                          {registryData.street}
                          {registryData.house_number && ` ${registryData.house_number}`}
                          {registryData.bus_number && ` bus ${registryData.bus_number}`}
                        </div>
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

          {/* NACE Activities Section */}
          {registryData.nace_codes && registryData.nace_codes.length > 0 && (
            <Card className="full-width-card" withBorder shadow="sm" padding="lg">
              <div className="card-header">
                <div className="card-title">
                  <Globe size={20} />
                  Business Activities (NACE)
                </div>
              </div>
              <div className="card-body">
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Code</Table.Th>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>Main</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {registryData.nace_codes.map((nace, index) => (
                      <Table.Tr key={index}>
                        <Table.Td>
                          <Badge color="blue" variant="light">{nace.code}</Badge>
                        </Table.Td>
                        <Table.Td>{nace.description}</Table.Td>
                        <Table.Td>
                          {nace.isMain && (
                            <Badge color="green" variant="light">Main</Badge>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
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
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Role</Table.Th>
                      <Table.Th>Start Date</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {registryData.representatives.map((rep, index) => (
                      <Table.Tr key={index}>
                        <Table.Td>{rep.name}</Table.Td>
                        <Table.Td>
                          <Badge color="gray" variant="light">{rep.role}</Badge>
                        </Table.Td>
                        <Table.Td>
                          {rep.startDate ? formatDate(rep.startDate) : '-'}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
            </Card>
          )}

          {/* Metadata Section */}
          <Card className="full-width-card" withBorder shadow="sm" padding="lg">
            <div className="card-header">
              <div className="card-title">
                <Calendar size={20} />
                Data Source Information
              </div>
            </div>
            <div className="card-body">
              <div className="info-table">
                <div className="info-row">
                  <span className="info-label">Data Source:</span>
                  <span className="info-value">
                    {registryData.data_source === 'kbo_api'
                      ? 'KBO API (kbodata.app)'
                      : registryData.data_source === 'kbo_public'
                        ? 'KBO Public Search'
                        : registryData.data_source}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Fetched At:</span>
                  <span className="info-value">{formatDate(registryData.fetched_at)}</span>
                </div>
                {registryData.last_verified_at && (
                  <div className="info-row">
                    <span className="info-label">Last Verified:</span>
                    <span className="info-value">{formatDate(registryData.last_verified_at)}</span>
                  </div>
                )}
                {registryData.establishment_count !== undefined && registryData.establishment_count > 0 && (
                  <div className="info-row">
                    <span className="info-label">Establishments:</span>
                    <span className="info-value">{registryData.establishment_count}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="external-links">
            <a
              href={registryData.source_url || `https://kbopub.economie.fgov.be/kbopub/zoeknummeraliasaliasaliasalias.html?onderession_number=${registryData.kbo_number_clean}`}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link"
            >
              <ExternalLink size={16} />
              View on KBO Public
            </a>
          </div>

          <div className="data-source-footer">
            <p>
              Data source: KBO - Kruispuntbank van Ondernemingen (Belgian Business Register)
            </p>
          </div>
        </div>
      )}
    </LoadingState>
  );
};
