import { useMsal } from '@azure/msal-react';
import { Button, TextInput, Textarea, Select, Modal, Group, Tabs, Stack, Skeleton } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { DataTable, useDataTableColumns } from 'mantine-datatable';
import axios from 'axios';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { logger } from '../utils/logger';
import { formatDate } from '../utils/dateUtils';
import { defaultDataTableProps } from './shared/DataTableConfig';
import './TasksGrid.css';
import { ErrorBoundary } from './ErrorBoundary';

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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071/api';

const TasksGrid: React.FC = () => {
  const { instance, accounts } = useMsal();
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [reviewTasks, setReviewTasks] = useState<ReviewTask[]>([]);
  const [_loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AdminTask | null>(null);
  const [selectedReviewTask, setSelectedReviewTask] = useState<ReviewTask | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('my-tasks');

  const [formData, setFormData] = useState({
    task_type: 'other' as string,
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    assigned_to_email: '',
    due_date: null as Date | null,
  });

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

  useEffect(() => {
    loadTasks();
    loadReviewTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/admin/tasks?limit=100`);
      if (!response.ok) throw new Error('Failed to load tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      logger.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReviewTasks = useCallback(async () => {
    try {
      const account = accounts[0];
      if (!account) {
        logger.log('TasksGrid: No MSAL account available for review tasks');
        return;
      }

      logger.log('TasksGrid: Acquiring token for review tasks...');
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['api://5c0c3b9e-0e4b-47b8-8e4f-9b0e6c0c3b9e/.default'],
        account: account,
      });

      const axiosInstance = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      logger.log('TasksGrid: Fetching review tasks from API...');
      const response = await axiosInstance.get<ReviewTask[]>(
        '/v1/admin/kvk-verification/flagged-entities'
      );
      logger.log(`TasksGrid: Loaded ${response.data.length} review tasks`, response.data);
      setReviewTasks(response.data);
    } catch (error: unknown) {
      logger.error('TasksGrid: Error loading review tasks:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status: number; statusText: string; data: unknown } };
        if (axiosError.response) {
          logger.error('TasksGrid: API error details:', {
            status: axiosError.response.status,
            statusText: axiosError.response.statusText,
            data: axiosError.response.data,
          });
        }
      }
    }
  }, [accounts, instance]);

  const resetForm = useCallback(() => {
    setFormData({
      task_type: 'other',
      title: '',
      description: '',
      priority: 'medium',
      assigned_to_email: '',
      due_date: null,
    });
  }, []);

  const handleCreate = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/admin/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          due_date: formData.due_date ? formData.due_date.toISOString() : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to create task');

      setShowCreateDialog(false);
      resetForm();
      loadTasks();
    } catch (error) {
      logger.error('Error creating task:', error);
      alert('Failed to create task');
    }
  }, [formData, resetForm, loadTasks]);

  const handleUpdate = useCallback(async (status?: string) => {
    if (!selectedTask) return;

    try {
      const response = await fetch(`${API_BASE_URL}/v1/admin/tasks/${selectedTask.task_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          status: status || selectedTask.status,
          assigned_to_email: formData.assigned_to_email,
          due_date: formData.due_date ? formData.due_date.toISOString() : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update task');

      setShowEditDialog(false);
      setSelectedTask(null);
      resetForm();
      loadTasks();
    } catch (error) {
      logger.error('Error updating task:', error);
      alert('Failed to update task');
    }
  }, [selectedTask, formData, resetForm, loadTasks]);

  const handleCompleteTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/admin/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (!response.ok) throw new Error('Failed to complete task');

      loadTasks();
    } catch (error) {
      logger.error('Error completing task:', error);
      alert('Failed to complete task');
    }
  }, [loadTasks]);

  const handleReviewDecision = useCallback(async (decision: 'approve' | 'reject', notes?: string) => {
    if (!selectedReviewTask) return;

    try {
      const account = accounts[0];
      if (!account) return;

      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['api://5c0c3b9e-0e4b-47b8-8e4f-9b0e6c0c3b9e/.default'],
        account: account,
      });

      const axiosInstance = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      await axiosInstance.post('/v1/admin/kvk-verification/review', {
        legal_entity_id: selectedReviewTask.legal_entity_id,
        decision,
        reviewer_notes: notes || '',
      });

      setShowReviewDialog(false);
      setSelectedReviewTask(null);
      loadReviewTasks();
    } catch (error) {
      logger.error('Error submitting review:', error);
      alert('Failed to submit review decision');
    }
  }, [selectedReviewTask, accounts, instance, loadReviewTasks]);

  const openReviewDialog = useCallback((task: ReviewTask) => {
    setSelectedReviewTask(task);
    setShowReviewDialog(true);
  }, []);

  const openEditDialog = useCallback((task: AdminTask) => {
    setSelectedTask(task);
    setFormData({
      task_type: task.task_type,
      title: task.title,
      description: task.description,
      priority: task.priority,
      assigned_to_email: task.assigned_to_email || '',
      due_date: task.due_date ? new Date(task.due_date) : null,
    });
    setShowEditDialog(true);
  }, []);

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
        width: 220,
        toggleable: false,
        sortable: false,
        render: (task) => (
          <div>
            <Button leftSection="edit" variant="subtle" onClick={() => openEditDialog(task)}>
              Edit
            </Button>
            {task.status !== 'completed' && task.status !== 'cancelled' && (
              <Button leftSection="check" variant="subtle" onClick={() => handleCompleteTask(task.task_id)}>
                Complete
              </Button>
            )}
          </div>
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
        width: 180,
        toggleable: false,
        sortable: false,
        render: (task) => (
          <div>
            <Button
              leftSection="preview"
              variant="subtle"
              onClick={() => openReviewDialog(task)}
            >
              Review
            </Button>
          </div>
        ),
      },
    ],
  });

  // Count tasks by status
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const overdueCount = tasks.filter((t) => isOverdue(t)).length;
  const reviewCount = reviewTasks.length;

  return (
    <div className="tasks-grid">
      <div className="grid-header">
        <h2>Admin Tasks & Reviews</h2>
        <Button leftSection="plus" color="blue" onClick={() => setShowCreateDialog(true)}>
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
      </div>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="my-tasks">My Tasks</Tabs.Tab>
          <Tabs.Tab value="verify">Verify</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="my-tasks" pt="md">
          <div className="grid-toolbar-info" style={{ marginBottom: '10px' }}>
            Total Tasks: {tasks.length}
          </div>
          <ErrorBoundary>
            {_loading && tasks.length === 0 ? (
              <Stack gap="xs">
                <Skeleton height={50} radius="md" />
                <Skeleton height={50} radius="md" />
                <Skeleton height={50} radius="md" />
                <Skeleton height={50} radius="md" />
                <Skeleton height={50} radius="md" />
              </Stack>
            ) : (
              <DataTable
            {...defaultDataTableProps}
            records={tasks}
                columns={tasksEffectiveColumns}
                storeColumnsKey="tasks-grid"
              />
            )}
          </ErrorBoundary>
        </Tabs.Panel>

        <Tabs.Panel value="verify" pt="md">
          <div className="grid-toolbar-info" style={{ marginBottom: '10px' }}>
            Total Reviews: {reviewTasks.length}
          </div>
          <ErrorBoundary>
            {_loading && reviewTasks.length === 0 ? (
              <Stack gap="xs">
                <Skeleton height={50} radius="md" />
                <Skeleton height={50} radius="md" />
                <Skeleton height={50} radius="md" />
                <Skeleton height={50} radius="md" />
                <Skeleton height={50} radius="md" />
              </Stack>
            ) : (
              <DataTable
            {...defaultDataTableProps}
            records={reviewTasks}
                columns={reviewEffectiveColumns}
                storeColumnsKey="review-tasks-grid"
              />
            )}
          </ErrorBoundary>
        </Tabs.Panel>
      </Tabs>

      {/* Create Dialog */}
      <Modal
        opened={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="Create Task"
        size="lg"
      >
        <div className="dialog-content">
          <div className="form-field">
            <label>Task Type</label>
            <Select
              data={taskTypeOptions}
              value={formData.task_type}
              onChange={(value) => setFormData({ ...formData, task_type: value || '' })}
            />
          </div>

          <div className="form-field">
            <label>Title</label>
            <TextInput
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Task title"
            />
          </div>

          <div className="form-field">
            <label>Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description..."
              rows={4}
            />
          </div>

          <div className="form-field">
            <label>Priority</label>
            <Select
              data={priorityOptions}
              value={formData.priority}
              onChange={(value) => setFormData({ ...formData, priority: (value as 'low' | 'medium' | 'high' | 'urgent') || 'medium' })}
            />
          </div>

          <div className="form-field">
            <label>Assign To (Email)</label>
            <TextInput
              value={formData.assigned_to_email}
              onChange={(e) => setFormData({ ...formData, assigned_to_email: e.target.value })}
              placeholder="admin@ctn.nl"
            />
          </div>

          <div className="form-field">
            <label>Due Date</label>
            <DatePickerInput
              value={formData.due_date}
              onChange={(value) => setFormData({ ...formData, due_date: value ? new Date(value) : null })}
              valueFormat="DD/MM/YYYY"
            />
          </div>
        </div>

        <Group mt="xl" justify="flex-end">
          <Button onClick={() => setShowCreateDialog(false)} variant="default">Cancel</Button>
          <Button color="blue" onClick={handleCreate}>
            Create Task
          </Button>
        </Group>
      </Modal>

      {/* Edit Dialog */}
      <Modal
        opened={showEditDialog && !!selectedTask}
        onClose={() => setShowEditDialog(false)}
        title="Edit Task"
        size="lg"
      >
        {selectedTask && (
          <>
            <div className="dialog-content">
              <div className="form-field">
                <label>Title</label>
                <TextInput
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="form-field">
                <label>Priority</label>
                <Select
                  data={priorityOptions}
                  value={formData.priority}
                  onChange={(value) => setFormData({ ...formData, priority: (value as 'low' | 'medium' | 'high' | 'urgent') || 'medium' })}
                />
              </div>

              <div className="form-field">
                <label>Assign To (Email)</label>
                <TextInput
                  value={formData.assigned_to_email}
                  onChange={(e) => setFormData({ ...formData, assigned_to_email: e.target.value })}
                  placeholder="admin@ctn.nl"
                />
              </div>

              <div className="form-field">
                <label>Due Date</label>
                <DatePickerInput
                  value={formData.due_date}
                  onChange={(value) => setFormData({ ...formData, due_date: value ? new Date(value) : null })}
                  valueFormat="DD/MM/YYYY"
                />
              </div>
            </div>

            <Group mt="xl" justify="flex-end">
              <Button onClick={() => setShowEditDialog(false)} variant="default">Cancel</Button>
              <Button color="blue" onClick={() => handleUpdate()}>
                Update Task
              </Button>
            </Group>
          </>
        )}
      </Modal>

      {/* Review Dialog */}
      <Modal
        opened={showReviewDialog && !!selectedReviewTask}
        onClose={() => setShowReviewDialog(false)}
        title={selectedReviewTask ? `Verify Registration - ${selectedReviewTask.entered_company_name}` : 'Verify Registration'}
        size="xl"
      >
        {selectedReviewTask && (
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
                          background: selectedReviewTask.kvk_mismatch_flags.includes('company_name')
                            ? '#fee2e2'
                            : 'transparent',
                        }}
                      >
                        {selectedReviewTask.entered_company_name}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          background: selectedReviewTask.kvk_mismatch_flags.includes('company_name')
                            ? '#dcfce7'
                            : 'transparent',
                        }}
                      >
                        {selectedReviewTask.extracted_company_name}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>Registry Number</td>
                      <td
                        style={{
                          padding: '12px',
                          background: selectedReviewTask.kvk_mismatch_flags.includes('legal_id')
                            ? '#fee2e2'
                            : 'transparent',
                        }}
                      >
                        {selectedReviewTask.entered_legal_id || 'Not provided'}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          background: selectedReviewTask.kvk_mismatch_flags.includes('legal_id')
                            ? '#dcfce7'
                            : 'transparent',
                        }}
                      >
                        {selectedReviewTask.extracted_legal_id}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px', fontWeight: 600 }}>Registry Type</td>
                      <td style={{ padding: '12px' }} colSpan={2}>
                        {selectedReviewTask.registry_type} ({selectedReviewTask.country_code || 'NL'})
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ marginTop: '20px' }}>
                  <p style={{ fontWeight: 600, marginBottom: '8px' }}>Mismatch Flags:</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedReviewTask.kvk_mismatch_flags.map((flag) => (
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
                    href={selectedReviewTask.kvk_document_url}
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
              <Button onClick={() => setShowReviewDialog(false)} variant="default">Cancel</Button>
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
    </div>
  );
};

export default React.memo(TasksGrid);
