import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Select,
  Tabs,
  TextInput,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconCheck, IconEdit, IconEye } from '@tabler/icons-react';
import { DataTable, useDataTableColumns } from 'mantine-datatable';
import React, { useEffect, useState, useCallback } from 'react';
import { formatDate } from '../utils/dateUtils';
import { defaultDataTableProps } from './shared/DataTableConfig';
import { PageHeader } from './shared/PageHeader';
import './TasksGrid.css';
import { useReviewTasks } from '../hooks/useReviewTasks';
import { useTaskDialogs } from '../hooks/useTaskDialogs';
import { useTaskManagement } from '../hooks/useTaskManagement';
import type { Application } from '../services/api';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingState } from './shared/LoadingState';

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

const TasksGrid: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>('my-tasks');

  // Use custom hooks for state management
  const taskManagement = useTaskManagement();
  const reviewTasksState = useReviewTasks();
  const dialogs = useTaskDialogs();

  const taskTypeOptions = [
    { label: 'KvK Verification', value: 'kvk_verification' },
    { label: 'Member Approval', value: 'member_approval' },
    { label: 'Document Review', value: 'document_review' },
    { label: 'Support Ticket', value: 'support_ticket' },
    { label: 'Token Renewal', value: 'token_renewal' },
    { label: 'Billing Issue', value: 'billing_issue' },
    { label: 'Compliance Check', value: 'compliance_check' },
    { label: 'Manual Review', value: 'manual_review' },
    { label: 'Other', value: 'other' },
  ];

  const priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ];

  const _statusOptions = [
    { text: 'Pending', value: 'pending' },
    { text: 'In Progress', value: 'in_progress' },
    { text: 'Completed', value: 'completed' },
    { text: 'On Hold', value: 'on_hold' },
    { text: 'Cancelled', value: 'cancelled' },
  ];

  // Load data on mount
  useEffect(() => {
    taskManagement.loadTasks();
    reviewTasksState.loadReviewTasks();
    reviewTasksState.loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler wrappers that integrate with dialogs
  const handleCreateTask = useCallback(async () => {
    const success = await taskManagement.handleCreate();
    if (success) {
      dialogs.closeCreateDialog();
    }
  }, [taskManagement, dialogs]);

  const handleUpdateTask = useCallback(async () => {
    const success = await taskManagement.handleUpdate();
    if (success) {
      dialogs.closeEditDialog();
    }
  }, [taskManagement, dialogs]);

  const handleEditDialogOpen = useCallback(
    (task: AdminTask) => {
      taskManagement.populateFormWithTask(task);
      dialogs.openEditDialog(task);
    },
    [taskManagement, dialogs]
  );

  const handleReviewDecision = useCallback(
    async (decision: 'approve' | 'reject', notes?: string) => {
      if (!dialogs.selectedReviewTask) return;

      const success = await reviewTasksState.handleReviewDecision(
        dialogs.selectedReviewTask.legal_entity_id,
        decision,
        notes
      );

      if (success) {
        dialogs.closeReviewDialog();
      }
    },
    [dialogs, reviewTasksState]
  );

  const handleApplicationApprove = useCallback(async () => {
    if (!dialogs.selectedApplication) return;

    const success = await reviewTasksState.handleApplicationReview(
      dialogs.selectedApplication.application_id,
      'approve',
      dialogs.applicationReviewNotes
    );

    if (success) {
      dialogs.closeApplicationDialog();
    }
  }, [dialogs, reviewTasksState]);

  const handleApplicationReject = useCallback(async () => {
    if (!dialogs.selectedApplication) return;

    const success = await reviewTasksState.handleApplicationReview(
      dialogs.selectedApplication.application_id,
      'reject',
      dialogs.applicationReviewNotes
    );

    if (success) {
      dialogs.closeApplicationDialog();
    }
  }, [dialogs, reviewTasksState]);

  // Utility functions
  const formatTaskDate = useCallback((dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDate(dateString);
  }, []);

  const isOverdue = useCallback((task: AdminTask) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    return new Date(task.due_date) < new Date();
  }, []);

  // Task counts
  const pendingCount = taskManagement.tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = taskManagement.tasks.filter((t) => t.status === 'in_progress').length;
  const overdueCount = taskManagement.tasks.filter((t) => isOverdue(t)).length;
  const reviewCount = reviewTasksState.reviewTasks.length;
  const applicationsCount = reviewTasksState.applications.length;

  // Column definitions for "My Tasks" grid using mantine-datatable
  const { effectiveColumns: tasksEffectiveColumns } = useDataTableColumns<AdminTask>({
    key: 'tasks-grid',
    columns: [
      {
        accessor: 'title',
        title: 'Title',
        width: 250,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'task_type',
        title: 'Type',
        width: 150,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (task) => <div>{task.task_type.replace('_', ' ')}</div>,
      },
      {
        accessor: 'priority',
        title: 'Priority',
        width: 100,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (task) => {
          const priorityClass = `priority-badge priority-${task.priority}`;
          return (
            <div>
              <span className={priorityClass}>{task.priority.toUpperCase()}</span>
            </div>
          );
        },
      },
      {
        accessor: 'status',
        title: 'Status',
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (task) => {
          const statusClass = `status-badge status-${task.status.replace('_', '-')}`;
          return (
            <div>
              <span className={statusClass}>{task.status.replace('_', ' ').toUpperCase()}</span>
            </div>
          );
        },
      },
      {
        accessor: 'assigned_to_email',
        title: 'Assigned To',
        width: 200,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (task) => <div>{task.assigned_to_email || 'Unassigned'}</div>,
      },
      {
        accessor: 'related_entity_name',
        title: 'Related Entity',
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (task) => <div>{task.related_entity_name || '-'}</div>,
      },
      {
        accessor: 'due_date',
        title: 'Due Date',
        width: 130,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (task) => {
          const overdue = isOverdue(task);
          return (
            <div className={overdue ? 'overdue-date' : ''}>
              {formatTaskDate(task.due_date)}
              {overdue && <span className="overdue-badge">OVERDUE</span>}
            </div>
          );
        },
      },
      {
        accessor: 'task_id',
        title: 'Actions',
        width: '0%',
        toggleable: false,
        sortable: false,
        render: (task) => (
          <Group gap={4} wrap="nowrap">
            <Tooltip label="Edit task">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleEditDialogOpen(task);
                }}
              >
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
            {task.status !== 'completed' && task.status !== 'cancelled' && (
              <Tooltip label="Complete task">
                <ActionIcon
                  variant="subtle"
                  color="green"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    taskManagement.handleCompleteTask(task.task_id);
                  }}
                >
                  <IconCheck size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        ),
      },
    ],
  });

  // Column definitions for "Verify" grid using mantine-datatable
  const { effectiveColumns: reviewEffectiveColumns } = useDataTableColumns<ReviewTask>({
    key: 'review-tasks-grid',
    columns: [
      {
        accessor: 'entered_company_name',
        title: 'Company Name',
        width: 250,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'entered_legal_id',
        title: 'Entered ID',
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'extracted_legal_id',
        title: 'Extracted ID',
        width: 130,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'kvk_mismatch_flags',
        title: 'Mismatches',
        width: 150,
        toggleable: true,
        resizable: true,
        render: (task) => (
          <div>
            <span className="priority-badge priority-urgent">
              {task.kvk_mismatch_flags.length} Issues
            </span>
          </div>
        ),
      },
      {
        accessor: 'document_uploaded_at',
        title: 'Uploaded',
        width: 150,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (task) => <div>{formatTaskDate(task.document_uploaded_at)}</div>,
      },
      {
        accessor: 'legal_entity_id',
        title: 'Actions',
        width: '0%',
        toggleable: false,
        sortable: false,
        render: (task) => (
          <Group gap={4} wrap="nowrap">
            <Tooltip label="Review verification">
              <ActionIcon
                variant="subtle"
                color="blue"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  dialogs.openReviewDialog(task);
                }}
              >
                <IconEye size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
  });

  // Column definitions for "Applications" grid using mantine-datatable
  const { effectiveColumns: applicationsEffectiveColumns } = useDataTableColumns<Application>({
    key: 'applications-grid',
    columns: [
      {
        accessor: 'legal_name',
        title: 'Company Name',
        width: 250,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'applicant_name',
        title: 'Contact',
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'applicant_email',
        title: 'Email',
        width: 200,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'kvk_number',
        title: 'KvK',
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (app) => app.kvk_number || '-',
      },
      {
        accessor: 'membership_type',
        title: 'Type',
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (app) => app.membership_type.toUpperCase(),
      },
      {
        accessor: 'submitted_at',
        title: 'Submitted',
        width: 150,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (app) => formatTaskDate(app.submitted_at),
      },
      {
        accessor: 'application_id',
        title: 'Actions',
        width: '0%',
        toggleable: false,
        sortable: false,
        render: (app) => (
          <Group gap={4} wrap="nowrap">
            <Tooltip label="Review application">
              <ActionIcon
                variant="subtle"
                color="blue"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  dialogs.openApplicationDialog(app);
                }}
              >
                <IconEye size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
  });

  return (
    <div className="tasks-grid">
      <div className="grid-header">
        <PageHeader titleKey="tasks" />
        <Button leftSection="plus" color="blue" onClick={dialogs.openCreateDialog}>
          New Task
        </Button>
      </div>

      <div className="tasks-summary">
        <div className="summary-card card-pending">
          <div className="summary-value">{pendingCount}</div>
          <div className="summary-label">Pending</div>
        </div>
        <div className="summary-card card-in-progress">
          <div className="summary-value">{inProgressCount}</div>
          <div className="summary-label">In Progress</div>
        </div>
        <div className="summary-card card-overdue">
          <div className="summary-value">{overdueCount}</div>
          <div className="summary-label">Overdue</div>
        </div>
        <div className="summary-card card-verify">
          <div className="summary-value">{reviewCount}</div>
          <div className="summary-label">Verify</div>
        </div>
        <div className="summary-card card-pending">
          <div className="summary-value">{applicationsCount}</div>
          <div className="summary-label">Applications</div>
        </div>
      </div>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="my-tasks">My Tasks</Tabs.Tab>
          <Tabs.Tab value="verify">Verify</Tabs.Tab>
          <Tabs.Tab value="applications">Applications</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="my-tasks" pt="md">
          <div className="grid-toolbar-info" style={{ marginBottom: '10px' }}>
            Total Tasks: {taskManagement.tasks.length}
          </div>
          <ErrorBoundary>
            <LoadingState
              loading={taskManagement.loading && taskManagement.tasks.length === 0}
              minHeight={400}
            >
              <DataTable
                {...defaultDataTableProps}
                records={taskManagement.tasks}
                columns={tasksEffectiveColumns}
                storeColumnsKey="tasks-grid"
              />
            </LoadingState>
          </ErrorBoundary>
        </Tabs.Panel>

        <Tabs.Panel value="verify" pt="md">
          <div className="grid-toolbar-info" style={{ marginBottom: '10px' }}>
            Total Reviews: {reviewTasksState.reviewTasks.length}
          </div>
          <ErrorBoundary>
            <LoadingState
              loading={taskManagement.loading && reviewTasksState.reviewTasks.length === 0}
              minHeight={400}
            >
              <DataTable
                {...defaultDataTableProps}
                records={reviewTasksState.reviewTasks}
                columns={reviewEffectiveColumns}
                storeColumnsKey="review-tasks-grid"
              />
            </LoadingState>
          </ErrorBoundary>
        </Tabs.Panel>

        <Tabs.Panel value="applications" pt="md">
          <div className="grid-toolbar-info" style={{ marginBottom: '10px' }}>
            Total Applications: {reviewTasksState.applications.length}
          </div>
          <ErrorBoundary>
            <LoadingState
              loading={taskManagement.loading && reviewTasksState.applications.length === 0}
              minHeight={400}
            >
              <DataTable
                {...defaultDataTableProps}
                records={reviewTasksState.applications}
                columns={applicationsEffectiveColumns}
                storeColumnsKey="applications-grid"
              />
            </LoadingState>
          </ErrorBoundary>
        </Tabs.Panel>
      </Tabs>

      {/* Create Dialog */}
      <Modal
        opened={dialogs.showCreateDialog}
        onClose={dialogs.closeCreateDialog}
        title="Create Task"
        size="lg"
        trapFocus
      >
        <div className="dialog-content">
          <div className="form-field">
            <Select
              label="Task Type"
              data={taskTypeOptions}
              value={taskManagement.formData.task_type}
              onChange={(value) =>
                taskManagement.setFormData({ ...taskManagement.formData, task_type: value || '' })
              }
            />
          </div>

          <div className="form-field">
            <TextInput
              label="Title"
              value={taskManagement.formData.title}
              onChange={(e) =>
                taskManagement.setFormData({ ...taskManagement.formData, title: e.target.value })
              }
              placeholder="Task title"
            />
          </div>

          <div className="form-field">
            <Textarea
              label="Description"
              value={taskManagement.formData.description}
              onChange={(e) =>
                taskManagement.setFormData({
                  ...taskManagement.formData,
                  description: e.target.value,
                })
              }
              placeholder="Task description..."
              rows={4}
            />
          </div>

          <div className="form-field">
            <Select
              label="Priority"
              data={priorityOptions}
              value={taskManagement.formData.priority}
              onChange={(value) =>
                taskManagement.setFormData({
                  ...taskManagement.formData,
                  priority: (value as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
                })
              }
            />
          </div>

          <div className="form-field">
            <TextInput
              label="Assign To (Email)"
              value={taskManagement.formData.assigned_to_email}
              onChange={(e) =>
                taskManagement.setFormData({
                  ...taskManagement.formData,
                  assigned_to_email: e.target.value,
                })
              }
              placeholder="admin@ctn.nl"
            />
          </div>

          <div className="form-field">
            <DatePickerInput
              label="Due Date"
              value={taskManagement.formData.due_date}
              onChange={(value) =>
                taskManagement.setFormData({
                  ...taskManagement.formData,
                  due_date: value ? new Date(value) : null,
                })
              }
              valueFormat="DD/MM/YYYY"
            />
          </div>
        </div>

        <Group mt="xl" justify="flex-end">
          <Button onClick={dialogs.closeCreateDialog} variant="default">
            Cancel
          </Button>
          <Button color="blue" onClick={handleCreateTask}>
            Create Task
          </Button>
        </Group>
      </Modal>

      {/* Edit Dialog */}
      <Modal
        opened={dialogs.showEditDialog && !!dialogs.selectedTask}
        onClose={dialogs.closeEditDialog}
        title="Edit Task"
        size="lg"
        trapFocus
      >
        {dialogs.selectedTask && (
          <>
            <div className="dialog-content">
              <div className="form-field">
                <TextInput
                  label="Title"
                  value={taskManagement.formData.title}
                  onChange={(e) =>
                    taskManagement.setFormData({
                      ...taskManagement.formData,
                      title: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-field">
                <Textarea
                  label="Description"
                  value={taskManagement.formData.description}
                  onChange={(e) =>
                    taskManagement.setFormData({
                      ...taskManagement.formData,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                />
              </div>

              <div className="form-field">
                <Select
                  label="Priority"
                  data={priorityOptions}
                  value={taskManagement.formData.priority}
                  onChange={(value) =>
                    taskManagement.setFormData({
                      ...taskManagement.formData,
                      priority: (value as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
                    })
                  }
                />
              </div>

              <div className="form-field">
                <TextInput
                  label="Assign To (Email)"
                  value={taskManagement.formData.assigned_to_email}
                  onChange={(e) =>
                    taskManagement.setFormData({
                      ...taskManagement.formData,
                      assigned_to_email: e.target.value,
                    })
                  }
                  placeholder="admin@ctn.nl"
                />
              </div>

              <div className="form-field">
                <DatePickerInput
                  label="Due Date"
                  value={taskManagement.formData.due_date}
                  onChange={(value) =>
                    taskManagement.setFormData({
                      ...taskManagement.formData,
                      due_date: value ? new Date(value) : null,
                    })
                  }
                  valueFormat="DD/MM/YYYY"
                />
              </div>
            </div>

            <Group mt="xl" justify="flex-end">
              <Button onClick={dialogs.closeEditDialog} variant="default">
                Cancel
              </Button>
              <Button color="blue" onClick={handleUpdateTask}>
                Update Task
              </Button>
            </Group>
          </>
        )}
      </Modal>

      {/* Review Dialog */}
      <Modal
        opened={dialogs.showReviewDialog && !!dialogs.selectedReviewTask}
        onClose={dialogs.closeReviewDialog}
        title={
          dialogs.selectedReviewTask
            ? `Verify Registration - ${dialogs.selectedReviewTask.entered_company_name}`
            : 'Verify Registration'
        }
        size="xl"
        trapFocus
      >
        {dialogs.selectedReviewTask && (
          <>
            <div className="dialog-content">
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#003366', marginBottom: '15px' }}>Comparison Details</h3>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '12px', textAlign: 'left', width: '30%' }}>Field</th>
                      <th style={{ padding: '12px', textAlign: 'left', width: '35%' }}>
                        Entered (Database)
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', width: '35%' }}>
                        Extracted (Document)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>Company Name</td>
                      <td
                        style={{
                          padding: '12px',
                          background: dialogs.selectedReviewTask.kvk_mismatch_flags.includes(
                            'company_name'
                          )
                            ? '#fee2e2'
                            : 'transparent',
                        }}
                      >
                        {dialogs.selectedReviewTask.entered_company_name}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          background: dialogs.selectedReviewTask.kvk_mismatch_flags.includes(
                            'company_name'
                          )
                            ? '#dcfce7'
                            : 'transparent',
                        }}
                      >
                        {dialogs.selectedReviewTask.extracted_company_name}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>Registry Number</td>
                      <td
                        style={{
                          padding: '12px',
                          background: dialogs.selectedReviewTask.kvk_mismatch_flags.includes(
                            'legal_id'
                          )
                            ? '#fee2e2'
                            : 'transparent',
                        }}
                      >
                        {dialogs.selectedReviewTask.entered_legal_id || 'Not provided'}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          background: dialogs.selectedReviewTask.kvk_mismatch_flags.includes(
                            'legal_id'
                          )
                            ? '#dcfce7'
                            : 'transparent',
                        }}
                      >
                        {dialogs.selectedReviewTask.extracted_legal_id}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px', fontWeight: 600 }}>Registry Type</td>
                      <td style={{ padding: '12px' }} colSpan={2}>
                        {dialogs.selectedReviewTask.registry_type} (
                        {dialogs.selectedReviewTask.country_code || 'NL'})
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ marginTop: '20px' }}>
                  <p style={{ fontWeight: 600, marginBottom: '8px' }}>Mismatch Flags:</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {dialogs.selectedReviewTask.kvk_mismatch_flags.map((flag) => (
                      <span
                        key={flag}
                        className="priority-badge priority-urgent"
                        style={{ textTransform: 'capitalize' }}
                      >
                        {flag.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <p style={{ fontWeight: 600, marginBottom: '8px' }}>Document:</p>
                  <a
                    href={dialogs.selectedReviewTask.kvk_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#0066b3', textDecoration: 'underline' }}
                  >
                    View Uploaded Document
                  </a>
                </div>
              </div>
            </div>

            <Group mt="xl" justify="flex-end">
              <Button onClick={dialogs.closeReviewDialog} variant="default">
                Cancel
              </Button>
              <Button color="red" onClick={() => handleReviewDecision('reject')}>
                Reject
              </Button>
              <Button color="blue" onClick={() => handleReviewDecision('approve')}>
                Approve
              </Button>
            </Group>
          </>
        )}
      </Modal>

      {/* Application Review Dialog */}
      <Modal
        opened={dialogs.showApplicationDialog && !!dialogs.selectedApplication}
        onClose={dialogs.closeApplicationDialog}
        title={
          dialogs.selectedApplication
            ? `Review Application - ${dialogs.selectedApplication.legal_name}`
            : 'Review Application'
        }
        size="lg"
        trapFocus
      >
        {dialogs.selectedApplication && (
          <>
            <div className="dialog-content">
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#003366', marginBottom: '15px' }}>Application Details</h3>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 600, width: '30%' }}>
                        Company Name
                      </td>
                      <td style={{ padding: '12px' }}>{dialogs.selectedApplication.legal_name}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>KvK Number</td>
                      <td style={{ padding: '12px' }}>
                        {dialogs.selectedApplication.kvk_number || 'Not provided'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>Address</td>
                      <td style={{ padding: '12px' }}>
                        {dialogs.selectedApplication.company_address}
                        <br />
                        {dialogs.selectedApplication.postal_code} {dialogs.selectedApplication.city}
                        <br />
                        {dialogs.selectedApplication.country}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>Contact Name</td>
                      <td style={{ padding: '12px' }}>
                        {dialogs.selectedApplication.applicant_name}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>Contact Email</td>
                      <td style={{ padding: '12px' }}>
                        {dialogs.selectedApplication.applicant_email}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>Contact Phone</td>
                      <td style={{ padding: '12px' }}>
                        {dialogs.selectedApplication.applicant_phone || 'Not provided'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>Job Title</td>
                      <td style={{ padding: '12px' }}>
                        {dialogs.selectedApplication.job_title || 'Not provided'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>Membership Type</td>
                      <td style={{ padding: '12px' }}>
                        <span className="priority-badge priority-medium">
                          {dialogs.selectedApplication.membership_type.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px', fontWeight: 600 }}>Submitted</td>
                      <td style={{ padding: '12px' }}>
                        {formatTaskDate(dialogs.selectedApplication.submitted_at)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ marginTop: '20px' }}>
                  <Textarea
                    label={
                      <>
                        Review Notes{' '}
                        <span style={{ color: '#999', fontWeight: 400 }}>
                          (optional for approval, required for rejection)
                        </span>
                      </>
                    }
                    value={dialogs.applicationReviewNotes}
                    onChange={(e) => dialogs.setApplicationReviewNotes(e.target.value)}
                    placeholder="Add notes about your decision..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <Group mt="xl" justify="flex-end">
              <Button onClick={dialogs.closeApplicationDialog} variant="default">
                Cancel
              </Button>
              <Button color="red" onClick={handleApplicationReject}>
                Reject
              </Button>
              <Button color="blue" onClick={handleApplicationApprove}>
                Approve
              </Button>
            </Group>
          </>
        )}
      </Modal>
    </div>
  );
};

export default React.memo(TasksGrid);
