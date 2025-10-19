import { Button } from '@progress/kendo-react-buttons';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Loader } from '@progress/kendo-react-indicators';
import { TextArea } from '@progress/kendo-react-inputs';
import axios from 'axios';
import { AlertCircle, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { msalInstance } from '../auth/AuthContext';

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

export const ReviewTasks: React.FC = () => {
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

  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:7071/api/v1';

  // Helper function to get access token
  async function getAccessToken(): Promise<string | null> {
    try {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        const clientId = process.env.VITE_AZURE_CLIENT_ID;
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
      <span
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
        role="status"
        aria-label={`Document verification: ${label}`}
      >
        <span aria-hidden="true">{icon}</span>
        {label}
      </span>
    );
  };

  const IssuesCell = (props: any) => {
    const flags = props.dataItem.kvk_mismatch_flags || [];
    return (
      <td>
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
      </td>
    );
  };

  const DocVerificationCell = (props: any) => {
    return <td>{getDocumentVerificationBadge(props.dataItem.kvk_mismatch_flags || [])}</td>;
  };

  const ActionCell = (props: any) => {
    return (
      <td>
        <Button themeColor="primary" size="small" onClick={() => handleReview(props.dataItem)}>
          Review
        </Button>
      </td>
    );
  };

  if (loading) {
    return <Loader size="large" />;
  }

  return (
    <div className="review-tasks">
      <h2>Review Tasks</h2>
      <p>Document verification tasks requiring manual review ({tasks.length})</p>

      <Grid data={tasks} style={{ marginTop: '20px' }}>
        <GridColumn field="entered_company_name" title="Entered Name" width="180px" />
        <GridColumn
          field="entered_legal_id"
          title="Entered Legal ID"
          width="140px"
          cell={(props) => (
            <td>{props.dataItem.entered_legal_id || <span style={{ color: '#999' }}>—</span>}</td>
          )}
        />
        <GridColumn field="extracted_company_name" title="Extracted Name" width="180px" />
        <GridColumn field="extracted_legal_id" title="Extracted Legal ID" width="140px" />
        <GridColumn
          field="registry_type"
          title="Registry"
          width="100px"
          cell={(props) => <td>{props.dataItem.registry_type || 'KVK'}</td>}
        />
        <GridColumn
          field="country_code"
          title="Country"
          width="90px"
          cell={(props) => (
            <td>{props.dataItem.country_code || <span style={{ color: '#999' }}>—</span>}</td>
          )}
        />
        <GridColumn field="kvk_mismatch_flags" title="Issues" cell={IssuesCell} width="280px" />
        <GridColumn title="Doc Verification" cell={DocVerificationCell} width="160px" />
        <GridColumn
          field="document_uploaded_at"
          title="Upload Date"
          width="120px"
          cell={(props) => (
            <td>{new Date(props.dataItem.document_uploaded_at).toLocaleDateString()}</td>
          )}
        />
        <GridColumn title="Actions" cell={ActionCell} width="100px" />
      </Grid>

      {reviewDialog.visible && reviewDialog.task && (
        <Dialog
          title="Review Document Verification"
          onClose={() => setReviewDialog({ visible: false, task: null })}
          width={600}
        >
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
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                      Company Name
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      {reviewDialog.task.entered_company_name}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      {reviewDialog.task.extracted_company_name}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                      {reviewDialog.task.kvk_mismatch_flags.includes('entered_name_mismatch') ? (
                        <span style={{ color: '#d32f2f', fontSize: '1.2em' }}>✗</span>
                      ) : (
                        <span style={{ color: '#4caf50', fontSize: '1.2em' }}>✓</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>
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
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
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
                {reviewDialog.task.kvk_mismatch_flags.map((flag, idx) => (
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
                href={reviewDialog.task.kvk_document_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button themeColor="info" size="small">
                  📄 View Uploaded Document
                </Button>
              </a>
            </div>

            {/* Review Notes */}
            <div style={{ marginBottom: '15px' }}>
              <label>
                <strong>Review Notes:</strong>
              </label>
              <TextArea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.value || '')}
                rows={4}
                style={{ width: '100%', marginTop: '5px' }}
                placeholder="Enter your review notes here (optional)..."
              />
            </div>
          </div>

          <DialogActionsBar>
            <Button onClick={() => submitReview(false)} disabled={submitting} themeColor="error">
              Reject
            </Button>
            <Button onClick={() => submitReview(true)} disabled={submitting} themeColor="success">
              Approve
            </Button>
            <Button
              onClick={() => setReviewDialog({ visible: false, task: null })}
              disabled={submitting}
            >
              Cancel
            </Button>
          </DialogActionsBar>
        </Dialog>
      )}
    </div>
  );
};
