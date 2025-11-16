import { useCallback, useState } from 'react';
import { type Application, apiV2 } from '../services/apiV2';
import { logger } from '../utils/logger';

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

export function useReviewTasks() {
  const [reviewTasks, setReviewTasks] = useState<ReviewTask[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  const loadReviewTasks = useCallback(async () => {
    try {
      logger.log('TasksGrid: Fetching review tasks from API...');
      const response = await apiV2.getKvkReviewTasks();
      logger.log(`TasksGrid: Loaded ${response.length} review tasks`, response);
      setReviewTasks(response);
    } catch (error: unknown) {
      logger.error('TasksGrid: Error loading review tasks:', error);
    }
  }, []);

  const loadApplications = useCallback(async () => {
    try {
      logger.log('TasksGrid: Fetching applications...');
      const response = await apiV2.getApplications('pending');
      logger.log(`TasksGrid: Loaded ${response.data.length} applications`, response.data);
      setApplications(response.data);
    } catch (error: unknown) {
      logger.error('TasksGrid: Error loading applications:', error);
    }
  }, []);

  const handleReviewDecision = useCallback(
    async (legalEntityId: string, decision: 'approve' | 'reject', notes?: string) => {
      try {
        await apiV2.reviewKvkVerification({
          legal_entity_id: legalEntityId,
          decision,
          reviewer_notes: notes || '',
        });

        await loadReviewTasks();
        return true;
      } catch (error) {
        logger.error('Error submitting review:', error);
        alert('Failed to submit review decision');
        return false;
      }
    },
    [loadReviewTasks]
  );

  const handleApplicationReview = useCallback(
    async (
      applicationId: string,
      decision: 'approve' | 'reject',
      notes: string
    ): Promise<boolean> => {
      if (decision === 'reject' && !notes.trim()) {
        alert('Please provide review notes for rejection.');
        return false;
      }

      try {
        logger.log(`TasksGrid: ${decision}ing application:`, applicationId);

        if (decision === 'approve') {
          await apiV2.approveApplication(applicationId, notes);
        } else {
          await apiV2.rejectApplication(applicationId, notes);
        }

        logger.log(`TasksGrid: Application ${decision}ed successfully`);
        await loadApplications();
        return true;
      } catch (error) {
        logger.error(`TasksGrid: Error ${decision}ing application:`, error);
        alert(`Failed to ${decision} application. Please try again.`);
        return false;
      }
    },
    [loadApplications]
  );

  return {
    reviewTasks,
    applications,
    loadReviewTasks,
    loadApplications,
    handleReviewDecision,
    handleApplicationReview,
  };
}
