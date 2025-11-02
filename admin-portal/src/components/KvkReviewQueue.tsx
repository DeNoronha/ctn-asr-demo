import { Button, Textarea, Loader, Modal, Group } from '@mantine/core';
import { DataTable, useDataTableColumns, type DataTableColumn } from 'mantine-datatable';
import axios from 'axios';
import React, { useEffect, useState, useMemo } from 'react';
import { msalInstance } from '../auth/AuthContext';
import { ErrorBoundary } from './ErrorBoundary';
import { formatDate } from '../utils/dateFormat';
import { defaultDataTableProps, defaultPaginationOptions } from './shared/DataTableConfig';

interface FlaggedEntity {
  legal_entity_id: string;
  entered_company_name: string;
  entered_kvk_number: string | null;
  kvk_extracted_company_name: string;
  kvk_extracted_number: string;
  kvk_mismatch_flags: string[];
  kvk_document_url: string;
  document_uploaded_at: string;
}

const KvkReviewQueueComponent: React.FC = () => {
  const [entities, setEntities] = useState<FlaggedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState<{
    visible: boolean;
    entity: FlaggedEntity | null;
  }>({
    visible: false,
    entity: null,
  });
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071/api/v1';

  // Helper function to get access token
  async function getAccessToken(): Promise<string | null> {
    try {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
        const response = await msalInstance.acquireTokenSilent({
          scopes: [`api://${clientId}/access_as_user`],
          account: accounts[0],
        });
        return response.accessToken;
      }
    } catch (error) {
      console.error('Failed to acquire token:', error);
    }
    return null;
  }

  // Create authenticated axios instance
  async function getAuthenticatedAxios() {
    const token = await getAccessToken();
    return axios.create({
      baseURL: API_BASE_URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  useEffect(() => {
    fetchFlaggedEntities();
  }, []);

  const fetchFlaggedEntities = async () => {
    try {
      const axiosInstance = await getAuthenticatedAxios();
      const response = await axiosInstance.get<FlaggedEntity[]>('/kvk-verification/flagged');
      setEntities(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch flagged entities:', error);
      setLoading(false);
    }
  };

  const handleReview = (entity: FlaggedEntity) => {
    setReviewDialog({ visible: true, entity });
    setReviewNotes('');
  };

  const submitReview = async (approved: boolean) => {
    if (!reviewDialog.entity) return;

    setSubmitting(true);

    try {
      const axiosInstance = await getAuthenticatedAxios();
      await axiosInstance.put(
        `/legal-entities/${reviewDialog.entity.legal_entity_id}/kvk-verification/review`,
        {
          status: approved ? 'verified' : 'failed',
          notes: reviewNotes,
          reviewedBy: 'ADMIN', // TODO: Get from auth context
        }
      );

      // Remove from list
      setEntities(
        entities.filter((e) => e.legal_entity_id !== reviewDialog.entity?.legal_entity_id)
      );
      setReviewDialog({ visible: false, entity: null });
      setReviewNotes('');
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const getFlagDescription = (flag: string): string => {
    const descriptions: { [key: string]: string } = {
      // Entered vs Extracted comparison flags (highest priority)
      entered_kvk_mismatch: '⚠️ Entered KvK ≠ Extracted',
      entered_name_mismatch: '⚠️ Entered Name ≠ Extracted',

      // KvK API validation flags
      company_name_mismatch: 'Name mismatch (KvK API)',
      kvk_number_mismatch: 'Number mismatch (KvK API)',
      bankrupt: 'Bankrupt',
      dissolved: 'Dissolved',
      kvk_number_not_found: 'Not found in KvK',

      // Processing flags
      extraction_failed: 'Extraction failed',
      processing_error: 'Processing error',
      api_error: 'KvK API error',
    };

    return descriptions[flag] || flag;
  };

  const isEnteredDataMismatch = (flag: string): boolean => {
    return flag === 'entered_kvk_mismatch' || flag === 'entered_name_mismatch';
  };

  // mantine-datatable column definitions
  const { effectiveColumns } = useDataTableColumns<FlaggedEntity>({
    key: 'kvk-review-grid',
    columns: [
      {
        accessor: 'entered_company_name',
        title: 'Entered Company',
        width: 200,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'entered_kvk_number',
        title: 'Entered KvK',
        width: 110,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => <div>{record.entered_kvk_number || <span style={{ color: '#999' }}>—</span>}</div>,
      },
      {
        accessor: 'kvk_extracted_company_name',
        title: 'Extracted Company',
        width: 200,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'kvk_extracted_number',
        title: 'Extracted KvK',
        width: 110,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'kvk_mismatch_flags',
        title: 'Issues',
        width: 280,
        toggleable: true,
        resizable: true,
        render: (record) => {
          const flags = record.kvk_mismatch_flags || [];
          return (
            <div>
              {flags.map((flag: string, idx: number) => (
                <span
                  key={idx}
                  className={`k-badge k-badge-${isEnteredDataMismatch(flag) ? 'error' : 'warning'}`}
                  style={{
                    marginRight: '5px',
                    fontWeight: isEnteredDataMismatch(flag) ? 'bold' : 'normal',
                  }}
                >
                  {getFlagDescription(flag)}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        accessor: 'document_uploaded_at',
        title: 'Upload Date',
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => <div>{formatDate(record.document_uploaded_at)}</div>,
      },
      {
        accessor: 'actions' as any,
        title: 'Actions',
        width: 100,
        toggleable: false,
        render: (record) => (
          <div>
            <Button color="blue" size="sm" onClick={() => handleReview(record)}>
              Review
            </Button>
          </div>
        ),
      },
    ],
  });

  if (loading) {
    return <Loader size="lg" />;
  }

  return (
    <div className="kvk-review-queue">
      <h2>KvK Verification Review Queue</h2>
      <p>Entities flagged for manual review ({entities.length})</p>

      <ErrorBoundary>
        <DataTable
          records={entities}
          columns={effectiveColumns}
          storeColumnsKey="kvk-review-grid"
          withTableBorder
          withColumnBorders
          striped
          highlightOnHover
        />
      </ErrorBoundary>

      <Modal
        opened={reviewDialog.visible && !!reviewDialog.entity}
        onClose={() => setReviewDialog({ visible: false, entity: null })}
        title="Review KvK Verification"
        size="lg"
      >
        {reviewDialog.entity && (
          <>
            <div style={{ padding: '20px' }}>
              {/* Issues section at top for visibility */}
              {reviewDialog.entity.kvk_mismatch_flags.some(isEnteredDataMismatch) && (
                <div
                  style={{
                    marginBottom: '20px',
                    padding: '12px',
                    backgroundColor: '#ffe5e5',
                    border: '2px solid #ff9999',
                    borderRadius: '4px',
                  }}
                >
                  <strong style={{ color: '#d32f2f' }}>⚠️ Data Entry Mismatch Detected</strong>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>
                    The data entered manually does not match what was extracted from the document.
                  </p>
                </div>
              )}

              {/* Comparison Table */}
              <div style={{ marginBottom: '20px' }}>
                <strong>Data Comparison:</strong>
                <table style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>
                        Field
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>
                        Entered Value
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>
                        Extracted from Document
                      </th>
                      <th
                        style={{
                          padding: '8px',
                          textAlign: 'center',
                          border: '1px solid #ddd',
                          width: '60px',
                        }}
                      >
                        Match
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                        Company Name
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                        {reviewDialog.entity.entered_company_name}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                        {reviewDialog.entity.kvk_extracted_company_name}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                        {reviewDialog.entity.kvk_mismatch_flags.includes('entered_name_mismatch') ? (
                          <span style={{ color: '#d32f2f', fontSize: '1.2em' }}>✗</span>
                        ) : (
                          <span style={{ color: '#4caf50', fontSize: '1.2em' }}>✓</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                        KvK Number
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                        {reviewDialog.entity.entered_kvk_number || (
                          <span style={{ color: '#999' }}>Not entered</span>
                        )}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                        {reviewDialog.entity.kvk_extracted_number}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                        {reviewDialog.entity.kvk_mismatch_flags.includes('entered_kvk_mismatch') ? (
                          <span style={{ color: '#d32f2f', fontSize: '1.2em' }}>✗</span>
                        ) : (
                          <span style={{ color: '#4caf50', fontSize: '1.2em' }}>✓</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* All Issues */}
              <div style={{ marginBottom: '15px' }}>
                <strong>All Validation Issues:</strong>
                <ul style={{ marginTop: '5px' }}>
                  {reviewDialog.entity.kvk_mismatch_flags.map((flag, idx) => (
                    <li
                      key={idx}
                      style={{
                        color: isEnteredDataMismatch(flag) ? '#d32f2f' : 'inherit',
                        fontWeight: isEnteredDataMismatch(flag) ? 'bold' : 'normal',
                      }}
                    >
                      {getFlagDescription(flag)}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Document link */}
              <div style={{ marginBottom: '15px' }}>
                <a
                  href={reviewDialog.entity.kvk_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button color="cyan" size="sm">
                    📄 View Uploaded Document
                  </Button>
                </a>
              </div>

              {/* Review Notes */}
              <div style={{ marginBottom: '15px' }}>
                <label>
                  <strong>Review Notes:</strong>
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value || '')}
                  rows={4}
                  style={{ width: '100%', marginTop: '5px' }}
                  placeholder="Enter your review notes here (optional)..."
                />
              </div>
            </div>

            <Group mt="xl" justify="flex-end">
              <Button
                onClick={() => setReviewDialog({ visible: false, entity: null })}
                disabled={submitting}
                variant="default"
              >
                Cancel
              </Button>
              <Button onClick={() => submitReview(false)} disabled={submitting} color="red">
                Reject
              </Button>
              <Button onClick={() => submitReview(true)} disabled={submitting} color="green">
                Approve
              </Button>
            </Group>
          </>
        )}
      </Modal>
    </div>
  );
};

export const KvkReviewQueue = React.memo(KvkReviewQueueComponent);
