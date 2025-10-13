import { Button } from '@progress/kendo-react-buttons';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Loader } from '@progress/kendo-react-indicators';
import { TextArea } from '@progress/kendo-react-inputs';
import axios from 'axios';
import type React from 'react';
import { useEffect, useState } from 'react';

interface FlaggedEntity {
  legal_entity_id: string;
  primary_legal_name: string;
  kvk_extracted_company_name: string;
  kvk_extracted_number: string;
  kvk_mismatch_flags: string[];
  kvk_document_url: string;
  document_uploaded_at: string;
}

export const KvkReviewQueue: React.FC = () => {
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

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:7071/api/v1';

  useEffect(() => {
    fetchFlaggedEntities();
  }, []);

  const fetchFlaggedEntities = async () => {
    try {
      const response = await axios.get<FlaggedEntity[]>(`${API_BASE_URL}/kvk-verification/flagged`);
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
      await axios.put(
        `${API_BASE_URL}/legal-entities/${reviewDialog.entity.legal_entity_id}/kvk-verification/review`,
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
      company_name_mismatch: 'Name mismatch',
      kvk_number_mismatch: 'Number mismatch',
      bankrupt: 'Bankrupt',
      dissolved: 'Dissolved',
      kvk_number_not_found: 'Not found',
    };

    return descriptions[flag] || flag;
  };

  const FlagsCell = (props: any) => {
    const flags = props.dataItem.kvk_mismatch_flags || [];
    return (
      <td>
        {flags.map((flag: string, idx: number) => (
          <span key={idx} className="k-badge k-badge-warning" style={{ marginRight: '5px' }}>
            {getFlagDescription(flag)}
          </span>
        ))}
      </td>
    );
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
    <div className="kvk-review-queue">
      <h2>KvK Verification Review Queue</h2>
      <p>Entities flagged for manual review ({entities.length})</p>

      <Grid data={entities} style={{ marginTop: '20px' }}>
        <GridColumn field="primary_legal_name" title="Company Name" width="250px" />
        <GridColumn field="kvk_extracted_number" title="Extracted KvK" width="120px" />
        <GridColumn field="kvk_extracted_company_name" title="Extracted Name" width="200px" />
        <GridColumn field="kvk_mismatch_flags" title="Issues" cell={FlagsCell} width="250px" />
        <GridColumn
          field="document_uploaded_at"
          title="Upload Date"
          width="150px"
          cell={(props) => (
            <td>{new Date(props.dataItem.document_uploaded_at).toLocaleDateString()}</td>
          )}
        />
        <GridColumn title="Actions" cell={ActionCell} width="120px" />
      </Grid>

      {reviewDialog.visible && reviewDialog.entity && (
        <Dialog
          title="Review KvK Verification"
          onClose={() => setReviewDialog({ visible: false, entity: null })}
          width={600}
        >
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <strong>Company:</strong> {reviewDialog.entity.primary_legal_name}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <strong>Extracted KvK:</strong> {reviewDialog.entity.kvk_extracted_number}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <strong>Extracted Name:</strong> {reviewDialog.entity.kvk_extracted_company_name}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <strong>Issues:</strong>
              <ul>
                {reviewDialog.entity.kvk_mismatch_flags.map((flag, idx) => (
                  <li key={idx}>{getFlagDescription(flag)}</li>
                ))}
              </ul>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <a
                href={reviewDialog.entity.kvk_document_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button themeColor="info" size="small">
                  View Document
                </Button>
              </a>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>
                <strong>Review Notes:</strong>
              </label>
              <TextArea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.value || '')}
                rows={4}
                style={{ width: '100%', marginTop: '5px' }}
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
              onClick={() => setReviewDialog({ visible: false, entity: null })}
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
