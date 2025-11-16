import { useCallback, useState } from 'react';
import type { Application } from '../services/apiV2';

interface AdminTask {
  task_id: string;
  task_type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  assigned_to?: string;
  assigned_to_email?: string;
  related_entity_name?: string;
  related_entity_org_id?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
}

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

export function useTaskDialogs() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);

  const [selectedTask, setSelectedTask] = useState<AdminTask | null>(null);
  const [selectedReviewTask, setSelectedReviewTask] = useState<ReviewTask | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [applicationReviewNotes, setApplicationReviewNotes] = useState('');

  const openCreateDialog = useCallback(() => {
    setShowCreateDialog(true);
  }, []);

  const closeCreateDialog = useCallback(() => {
    setShowCreateDialog(false);
  }, []);

  const openEditDialog = useCallback((task: AdminTask) => {
    setSelectedTask(task);
    setShowEditDialog(true);
  }, []);

  const closeEditDialog = useCallback(() => {
    setShowEditDialog(false);
    setSelectedTask(null);
  }, []);

  const openReviewDialog = useCallback((task: ReviewTask) => {
    setSelectedReviewTask(task);
    setShowReviewDialog(true);
  }, []);

  const closeReviewDialog = useCallback(() => {
    setShowReviewDialog(false);
    setSelectedReviewTask(null);
  }, []);

  const openApplicationDialog = useCallback((application: Application) => {
    setSelectedApplication(application);
    setApplicationReviewNotes('');
    setShowApplicationDialog(true);
  }, []);

  const closeApplicationDialog = useCallback(() => {
    setShowApplicationDialog(false);
    setSelectedApplication(null);
    setApplicationReviewNotes('');
  }, []);

  return {
    // Dialog states
    showCreateDialog,
    showEditDialog,
    showReviewDialog,
    showApplicationDialog,

    // Selected items
    selectedTask,
    selectedReviewTask,
    selectedApplication,
    applicationReviewNotes,

    // Setters
    setApplicationReviewNotes,

    // Dialog controls
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openReviewDialog,
    closeReviewDialog,
    openApplicationDialog,
    closeApplicationDialog,
  };
}
