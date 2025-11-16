import { Button, Group, Modal, Textarea } from '@mantine/core';
import axios from 'axios';
import { DataTable, type DataTableColumn, useDataTableColumns } from 'mantine-datatable';
import React, { useEffect, useState, useMemo } from 'react';
import { msalInstance } from '../auth/AuthContext';
import { formatDate } from '../utils/dateFormat';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertCircle, AlertTriangle, CheckCircle, XCircle } from './icons';
import { defaultDataTableProps, defaultPaginationOptions } from './shared/DataTableConfig';
import { LoadingState } from './shared/LoadingState';

interface ReviewTask {
  legal_entity_id: string;
  entered_company_name: string;
  entered_legal_id: string | null;
  extracted_company_name: string;
  extracted_legal_id: string;
  registry_type: string;
  country_code: string | null;
  kvk_mismatch_flags: string[];
  kvk_document_url: string;
  document_uploaded_at: string;
}

const ReviewTasksComponent: React.FC = () => {
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState<{
    visible: boolean;
    task: ReviewTask | null;
  }>({
    visible: false,
    task: null,
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
    fetchReviewTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReviewTasks = async () => {
    try {
      const axiosInstance = await getAuthenticatedAxios();
      const response = await axiosInstance.get<ReviewTask[]>('/kvk-verification/flagged');
      setTasks(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch review tasks:', error);
      setLoading(false);
    }
  };

  const handleReview = (task: ReviewTask) => {
    setReviewDialog({ visible: true, task });
    setReviewNotes('');
  };

  const submitReview = async (approved: boolean) => {
    if (!reviewDialog.task) return;

    setSubmitting(true);

    try {
      const axiosInstance = await getAuthenticatedAxios();
      const accounts = msalInstance.getAllAccounts();
      const reviewedBy = accounts.length > 0 ? accounts[0].username : 'ADMIN';

      await axiosInstance.put(
        `/legal-entities/${reviewDialog.task.legal_entity_id}/kvk-verification/review`,
        {
          status: approved ? 'verified' : 'failed',
          notes: reviewNotes,
          reviewedBy,
        }
      );

      // Remove from list
      setTasks(tasks.filter((t) => t.legal_entity_id !== reviewDialog.task?.legal_entity_id));
      setReviewDialog({ visible: false, task: null });
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
      entered_kvk_mismatch: '⚠️ Entered ID ≠ Extracted',
      entered_name_mismatch: '⚠️ Entered Name ≠ Extracted',

      // Registry API validation flags
      company_name_mismatch: 'Name mismatch (Registry API)',
      kvk_number_mismatch: 'Number mismatch (Registry API)',
      bankrupt: 'Bankrupt',
      dissolved: 'Dissolved',
      kvk_number_not_found: 'Not found in Registry',

      // Processing flags
      extraction_failed: 'Extraction failed',
      processing_error: 'Processing error',
      api_error: 'Registry API error',
    };

    return descriptions[flag] || flag;
  };

  const isEnteredDataMismatch = (flag: string): boolean => {
    return flag === 'entered_kvk_mismatch' || flag === 'entered_name_mismatch';
  };

  const getDocumentVerificationBadge = (flags: string[]) => {
    const hasNameMismatch = flags.includes('entered_name_mismatch');
    const hasIdMismatch = flags.includes('entered_kvk_mismatch');

    let color: string;
    let icon: React.ReactNode;
    let label: string;

    if (!hasNameMismatch && !hasIdMismatch) {
      // Green: Both match
      color = '#059669';
      icon = <CheckCircle size={14} />;
      label = 'MATCH';
    } else if (hasNameMismatch && hasIdMismatch) {
      // Red: Neither match
      color = '#dc2626';
      icon = <XCircle size={14} />;
      label = 'NO MATCH';
    } else {
      // Orange: Partial match
      color = '#b45309';
      icon = <AlertTriangle size={14} />;
      label = 'PARTIAL';
    }

    return (
      <output
        className="validation-badge"
        style={{
          backgroundColor: color,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '12px',
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
        aria-label={`Document verification: ${label}`}
      >
        <span aria-hidden="true">{icon}</span>
        {label}
      </output>
    );
  };

  // mantine-datatable column definitions
  const { effectiveColumns } = useDataTableColumns<ReviewTask>({
    key: 'review-tasks-grid',
    columns: [
      {
        accessor: 'entered_company_name',
        title: 'Entered Name',
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'entered_legal_id',
        title: 'Entered Legal ID',
        width: 140,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => (
          <div>{record.entered_legal_id || <span style={{ color: '#999' }}>—</span>}</div>
        ),
      },
      {
        accessor: 'extracted_company_name',
        title: 'Extracted Name',
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'extracted_legal_id',
        title: 'Extracted Legal ID',
        width: 140,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'registry_type',
        title: 'Registry',
        width: 100,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => <div>{record.registry_type || 'KVK'}</div>,
      },
      {
        accessor: 'country_code',
        title: 'Country',
        width: 90,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => (
          <div>{record.country_code || <span style={{ color: '#999' }}>—</span>}</div>
        ),
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
              {flags.map((flag: string) => (
                <span
                  key={flag}
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
        // biome-ignore lint/suspicious/noExplicitAny: mantine-datatable requires any for custom accessors not in base type
        accessor: 'doc_verification' as any,
        title: 'Doc Verification',
        width: 160,
        toggleable: true,
        resizable: true,
        render: (record) => (
          <div>{getDocumentVerificationBadge(record.kvk_mismatch_flags || [])}</div>
        ),
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
        // biome-ignore lint/suspicious/noExplicitAny: mantine-datatable requires any for custom accessors not in base type
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

  return (
    <LoadingState loading={loading} minHeight={400}>
      <div className="review-tasks">
        <h2>Review Tasks</h2>
        <p>Document verification tasks requiring manual review ({tasks.length})</p>

        <ErrorBoundary>
          <DataTable
            records={tasks}
            columns={effectiveColumns}
            storeColumnsKey="review-tasks-grid"
            withTableBorder
            withColumnBorders
            striped
            highlightOnHover
          />
        </ErrorBoundary>

        <Modal
          opened={reviewDialog.visible && !!reviewDialog.task}
          onClose={() => setReviewDialog({ visible: false, task: null })}
          title="Review Document Verification"
          size="lg"
        >
          {reviewDialog.task && (
            <>
              <div style={{ padding: '20px' }}>
                {/* Issues section at top for visibility */}
                {reviewDialog.task.kvk_mismatch_flags.some(isEnteredDataMismatch) && (
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
                        <td
                          style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}
                        >
                          Company Name
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {reviewDialog.task.entered_company_name}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {reviewDialog.task.extracted_company_name}
                        </td>
                        <td
                          style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}
                        >
                          {reviewDialog.task.kvk_mismatch_flags.includes(
                            'entered_name_mismatch'
                          ) ? (
                            <span style={{ color: '#d32f2f', fontSize: '1.2em' }}>✗</span>
                          ) : (
                            <span style={{ color: '#4caf50', fontSize: '1.2em' }}>✓</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}
                        >
                          Legal ID ({reviewDialog.task.registry_type || 'KVK'})
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {reviewDialog.task.entered_legal_id || (
                            <span style={{ color: '#999' }}>Not entered</span>
                          )}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {reviewDialog.task.extracted_legal_id}
                        </td>
                        <td
                          style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}
                        >
                          {reviewDialog.task.kvk_mismatch_flags.includes('entered_kvk_mismatch') ? (
                            <span style={{ color: '#d32f2f', fontSize: '1.2em' }}>✗</span>
                          ) : (
                            <span style={{ color: '#4caf50', fontSize: '1.2em' }}>✓</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Registry and Country */}
                <div style={{ marginBottom: '15px', display: 'flex', gap: '20px' }}>
                  <div>
                    <strong>Registry:</strong> {reviewDialog.task.registry_type || 'KVK'}
                  </div>
                  <div>
                    <strong>Country:</strong> {reviewDialog.task.country_code || '—'}
                  </div>
                </div>

                {/* All Issues */}
                <div style={{ marginBottom: '15px' }}>
                  <strong>All Validation Issues:</strong>
                  <ul style={{ marginTop: '5px' }}>
                    {reviewDialog.task.kvk_mismatch_flags.map((flag) => (
                      <li
                        key={flag}
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
                    href={reviewDialog.task.kvk_document_url}
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
                  <Textarea
                    label={<strong>Review Notes:</strong>}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value || '')}
                    rows={4}
                    style={{ width: '100%' }}
                    placeholder="Enter your review notes here (optional)..."
                  />
                </div>
              </div>

              <Group mt="xl" justify="flex-end">
                <Button
                  onClick={() => setReviewDialog({ visible: false, task: null })}
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
    </LoadingState>
  );
};

export const ReviewTasks = React.memo(ReviewTasksComponent);
