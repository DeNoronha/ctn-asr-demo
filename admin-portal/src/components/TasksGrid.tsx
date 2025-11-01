import { useMsal } from '@azure/msal-react';
import { Button } from '@progress/kendo-react-buttons';
import { DatePicker } from '@progress/kendo-react-dateinputs';
import { Dialog } from '@progress/kendo-react-dialogs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Grid, type GridCellProps, GridColumn, GridToolbar } from '@progress/kendo-react-grid';
import { Input, TextArea } from '@progress/kendo-react-inputs';
import { TabStrip, TabStripTab } from '@progress/kendo-react-layout';
import axios from 'axios';
import type React from 'react';
import { useEffect, useState } from 'react';
import { logger } from '../utils/logger';
import { formatDate } from '../utils/dateUtils';
import './TasksGrid.css';

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
  const [activeTab, setActiveTab] = useState(0);

  const [formData, setFormData] = useState({
    task_type: 'other' as string,
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    assigned_to_email: '',
    due_date: null as Date | null,
  });

  const taskTypeOptions = [
    { text: 'KvK Verification', value: 'kvk_verification' },
    { text: 'Member Approval', value: 'member_approval' },
    { text: 'Document Review', value: 'document_review' },
    { text: 'Support Ticket', value: 'support_ticket' },
    { text: 'Token Renewal', value: 'token_renewal' },
    { text: 'Billing Issue', value: 'billing_issue' },
    { text: 'Compliance Check', value: 'compliance_check' },
    { text: 'Manual Review', value: 'manual_review' },
    { text: 'Other', value: 'other' },
  ];

  const priorityOptions = [
    { text: 'Low', value: 'low' },
    { text: 'Medium', value: 'medium' },
    { text: 'High', value: 'high' },
    { text: 'Urgent', value: 'urgent' },
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

  const loadTasks = async () => {
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
  };

  const loadReviewTasks = async () => {
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
        const axiosError = error as { response?: { status: number; statusText: string; data: any } };
        if (axiosError.response) {
          logger.error('TasksGrid: API error details:', {
            status: axiosError.response.status,
            statusText: axiosError.response.statusText,
            data: axiosError.response.data,
          });
        }
      }
    }
  };

  const handleCreate = async () => {
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
  };

  const handleUpdate = async (status?: string) => {
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
  };

  const handleCompleteTask = async (taskId: string) => {
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
  };

  const handleReviewDecision = async (decision: 'approve' | 'reject', notes?: string) => {
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
  };

  const openReviewDialog = (task: ReviewTask) => {
    setSelectedReviewTask(task);
    setShowReviewDialog(true);
  };

  const resetForm = () => {
    setFormData({
      task_type: 'other',
      title: '',
      description: '',
      priority: 'medium',
      assigned_to_email: '',
      due_date: null,
    });
  };

  const openEditDialog = (task: AdminTask) => {
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
  };

  const formatTaskDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDate(dateString);
  };

  const isOverdue = (task: AdminTask) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    return new Date(task.due_date) < new Date();
  };

  const PriorityCell = (props: GridCellProps) => {
    const priority = props.dataItem.priority;
    const priorityClass = `priority-badge priority-${priority}`;
    return (
      <td>
        <span className={priorityClass}>{priority.toUpperCase()}</span>
      </td>
    );
  };

  const StatusCell = (props: GridCellProps) => {
    const status = props.dataItem.status;
    const statusClass = `status-badge status-${status.replace('_', '-')}`;
    return (
      <td>
        <span className={statusClass}>{status.replace('_', ' ').toUpperCase()}</span>
      </td>
    );
  };

  const DueDateCell = (props: GridCellProps) => {
    const task = props.dataItem;
    const overdue = isOverdue(task);
    return (
      <td className={overdue ? 'overdue-date' : ''}>
        {formatTaskDate(task.due_date)}
        {overdue && <span className="overdue-badge">OVERDUE</span>}
      </td>
    );
  };

  const ActionsCell = (props: GridCellProps) => {
    const task = props.dataItem;
    return (
      <td>
        <Button icon="edit" fillMode="flat" onClick={() => openEditDialog(task)}>
          Edit
        </Button>
        {task.status !== 'completed' && task.status !== 'cancelled' && (
          <Button icon="check" fillMode="flat" onClick={() => handleCompleteTask(task.task_id)}>
            Complete
          </Button>
        )}
      </td>
    );
  };

  // Count tasks by status
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const overdueCount = tasks.filter((t) => isOverdue(t)).length;
  const reviewCount = reviewTasks.length;

  return (
    <div className="tasks-grid">
      <div className="grid-header">
        <h2>Admin Tasks & Reviews</h2>
        <Button icon="plus" themeColor="primary" onClick={() => setShowCreateDialog(true)}>
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

      <TabStrip selected={activeTab} onSelect={(e) => setActiveTab(e.selected)}>
        <TabStripTab title="My Tasks">
          <Grid data={tasks} style={{ height: '550px' }}>
            <GridToolbar>
              <span className="grid-toolbar-info">Total Tasks: {tasks.length}</span>
            </GridToolbar>

            <GridColumn field="title" title="Title" width="250px" />
            <GridColumn
              field="task_type"
              title="Type"
              width="150px"
              cells={{ data: (props) => <td>{props.dataItem.task_type.replace('_', ' ')}</td> }}
            />
            <GridColumn field="priority" title="Priority" width="100px" cells={{ data: PriorityCell }} />
            <GridColumn field="status" title="Status" width="120px" cells={{ data: StatusCell }} />
            <GridColumn
              field="assigned_to_email"
              title="Assigned To"
              width="200px"
              cells={{ data: (props) => <td>{props.dataItem.assigned_to_email || 'Unassigned'}</td> }}
            />
            <GridColumn
              field="related_entity_name"
              title="Related Entity"
              width="180px"
              cells={{ data: (props) => <td>{props.dataItem.related_entity_name || '-'}</td> }}
            />
            <GridColumn field="due_date" title="Due Date" width="130px" cells={{ data: DueDateCell }} />
            <GridColumn title="Actions" width="220px" cells={{ data: ActionsCell }} />
          </Grid>
        </TabStripTab>

        <TabStripTab title="Verify">
          <Grid data={reviewTasks} style={{ height: '550px' }}>
            <GridToolbar>
              <span className="grid-toolbar-info">Total Reviews: {reviewTasks.length}</span>
            </GridToolbar>

            <GridColumn field="entered_company_name" title="Company Name" width="250px" />
            <GridColumn field="entered_legal_id" title="Entered ID" width="120px" />
            <GridColumn field="extracted_legal_id" title="Extracted ID" width="130px" />
            <GridColumn
              field="kvk_mismatch_flags"
              title="Mismatches"
              width="150px"
              cells={{ data: (props) => (
                <td>
                  <span className="priority-badge priority-urgent">
                    {props.dataItem.kvk_mismatch_flags.length} Issues
                  </span>
                </td>
              ) }}
            />
            <GridColumn
              field="document_uploaded_at"
              title="Uploaded"
              width="150px"
              cells={{ data: (props) => <td>{formatTaskDate(props.dataItem.document_uploaded_at)}</td> }}
            />
            <GridColumn
              title="Actions"
              width="180px"
              cells={{ data: (props) => (
                <td>
                  <Button
                    icon="preview"
                    fillMode="flat"
                    onClick={() => openReviewDialog(props.dataItem)}
                  >
                    Review
                  </Button>
                </td>
              ) }}
            />
          </Grid>
        </TabStripTab>
      </TabStrip>

      {/* Create Dialog */}
      {showCreateDialog && (
        <Dialog title="Create Task" onClose={() => setShowCreateDialog(false)} width={600}>
          <div className="dialog-content">
            <div className="form-field">
              <label>Task Type</label>
              <DropDownList
                data={taskTypeOptions}
                textField="text"
                dataItemKey="value"
                value={taskTypeOptions.find((o) => o.value === formData.task_type)}
                onChange={(e) => setFormData({ ...formData, task_type: e.value.value })}
              />
            </div>

            <div className="form-field">
              <label>Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.value })}
                placeholder="Task title"
              />
            </div>

            <div className="form-field">
              <label>Description</label>
              <TextArea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.value })}
                placeholder="Task description..."
                rows={4}
              />
            </div>

            <div className="form-field">
              <label>Priority</label>
              <DropDownList
                data={priorityOptions}
                textField="text"
                dataItemKey="value"
                value={priorityOptions.find((o) => o.value === formData.priority)}
                onChange={(e) => setFormData({ ...formData, priority: e.value.value })}
              />
            </div>

            <div className="form-field">
              <label>Assign To (Email)</label>
              <Input
                value={formData.assigned_to_email}
                onChange={(e) => setFormData({ ...formData, assigned_to_email: e.value })}
                placeholder="admin@ctn.nl"
              />
            </div>

            <div className="form-field">
              <label>Due Date</label>
              <DatePicker
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.value })}
                format="dd/MM/yyyy"
              />
            </div>
          </div>

          <div className="dialog-actions">
            <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button themeColor="primary" onClick={handleCreate}>
              Create Task
            </Button>
          </div>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {showEditDialog && selectedTask && (
        <Dialog title="Edit Task" onClose={() => setShowEditDialog(false)} width={600}>
          <div className="dialog-content">
            <div className="form-field">
              <label>Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.value })}
              />
            </div>

            <div className="form-field">
              <label>Description</label>
              <TextArea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.value })}
                rows={4}
              />
            </div>

            <div className="form-field">
              <label>Priority</label>
              <DropDownList
                data={priorityOptions}
                textField="text"
                dataItemKey="value"
                value={priorityOptions.find((o) => o.value === formData.priority)}
                onChange={(e) => setFormData({ ...formData, priority: e.value.value })}
              />
            </div>

            <div className="form-field">
              <label>Assign To (Email)</label>
              <Input
                value={formData.assigned_to_email}
                onChange={(e) => setFormData({ ...formData, assigned_to_email: e.value })}
                placeholder="admin@ctn.nl"
              />
            </div>

            <div className="form-field">
              <label>Due Date</label>
              <DatePicker
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.value })}
                format="dd/MM/yyyy"
              />
            </div>
          </div>

          <div className="dialog-actions">
            <Button onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button themeColor="primary" onClick={() => handleUpdate()}>
              Update Task
            </Button>
          </div>
        </Dialog>
      )}

      {/* Review Dialog */}
      {showReviewDialog && selectedReviewTask && (
        <Dialog
          title={`Verify Registration - ${selectedReviewTask.entered_company_name}`}
          onClose={() => setShowReviewDialog(false)}
          width={800}
        >
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

          <div className="dialog-actions">
            <Button onClick={() => setShowReviewDialog(false)}>Cancel</Button>
            <Button themeColor="error" onClick={() => handleReviewDecision('reject')}>
              Reject
            </Button>
            <Button themeColor="primary" onClick={() => handleReviewDecision('approve')}>
              Approve
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default TasksGrid;
