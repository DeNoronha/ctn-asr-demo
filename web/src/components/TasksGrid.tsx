import React, { useState, useEffect } from 'react';
import { Grid, GridColumn, GridToolbar } from '@progress/kendo-react-grid';
import { Button } from '@progress/kendo-react-buttons';
import { Dialog } from '@progress/kendo-react-dialogs';
import { Input, TextArea } from '@progress/kendo-react-inputs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { DatePicker } from '@progress/kendo-react-dateinputs';
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

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:7071/api';

const TasksGrid: React.FC = () => {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AdminTask | null>(null);

  const [formData, setFormData] = useState({
    task_type: 'other' as string,
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    assigned_to_email: '',
    due_date: null as Date | null
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
    { text: 'Other', value: 'other' }
  ];

  const priorityOptions = [
    { text: 'Low', value: 'low' },
    { text: 'Medium', value: 'medium' },
    { text: 'High', value: 'high' },
    { text: 'Urgent', value: 'urgent' }
  ];

  const statusOptions = [
    { text: 'Pending', value: 'pending' },
    { text: 'In Progress', value: 'in_progress' },
    { text: 'Completed', value: 'completed' },
    { text: 'On Hold', value: 'on_hold' },
    { text: 'Cancelled', value: 'cancelled' }
  ];

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/admin/tasks?limit=100`);
      if (!response.ok) throw new Error('Failed to load tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/admin/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          due_date: formData.due_date ? formData.due_date.toISOString() : undefined
        })
      });

      if (!response.ok) throw new Error('Failed to create task');

      setShowCreateDialog(false);
      resetForm();
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    }
  };

  const handleUpdate = async (status?: string) => {
    if (!selectedTask) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/admin/tasks/${selectedTask.task_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            priority: formData.priority,
            status: status || selectedTask.status,
            assigned_to_email: formData.assigned_to_email,
            due_date: formData.due_date ? formData.due_date.toISOString() : undefined
          })
        }
      );

      if (!response.ok) throw new Error('Failed to update task');

      setShowEditDialog(false);
      setSelectedTask(null);
      resetForm();
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/admin/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });

      if (!response.ok) throw new Error('Failed to complete task');

      loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task');
    }
  };

  const resetForm = () => {
    setFormData({
      task_type: 'other',
      title: '',
      description: '',
      priority: 'medium',
      assigned_to_email: '',
      due_date: null
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
      due_date: task.due_date ? new Date(task.due_date) : null
    });
    setShowEditDialog(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('nl-NL');
  };

  const isOverdue = (task: AdminTask) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    return new Date(task.due_date) < new Date();
  };

  const PriorityCell = (props: any) => {
    const priority = props.dataItem.priority;
    const priorityClass = `priority-badge priority-${priority}`;
    return (
      <td>
        <span className={priorityClass}>{priority.toUpperCase()}</span>
      </td>
    );
  };

  const StatusCell = (props: any) => {
    const status = props.dataItem.status;
    const statusClass = `status-badge status-${status.replace('_', '-')}`;
    return (
      <td>
        <span className={statusClass}>{status.replace('_', ' ').toUpperCase()}</span>
      </td>
    );
  };

  const DueDateCell = (props: any) => {
    const task = props.dataItem;
    const overdue = isOverdue(task);
    return (
      <td className={overdue ? 'overdue-date' : ''}>
        {formatDate(task.due_date)}
        {overdue && <span className="overdue-badge">OVERDUE</span>}
      </td>
    );
  };

  const ActionsCell = (props: any) => {
    const task = props.dataItem;
    return (
      <td>
        <Button
          icon="edit"
          fillMode="flat"
          onClick={() => openEditDialog(task)}
        >
          Edit
        </Button>
        {task.status !== 'completed' && task.status !== 'cancelled' && (
          <Button
            icon="check"
            fillMode="flat"
            onClick={() => handleCompleteTask(task.task_id)}
          >
            Complete
          </Button>
        )}
      </td>
    );
  };

  // Count tasks by status
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const overdueCount = tasks.filter(t => isOverdue(t)).length;

  return (
    <div className="tasks-grid">
      <div className="grid-header">
        <h2>Admin Tasks</h2>
        <Button
          icon="plus"
          themeColor="primary"
          onClick={() => setShowCreateDialog(true)}
        >
          New Task
        </Button>
      </div>

      <div className="tasks-summary">
        <div className="summary-card">
          <div className="summary-value">{pendingCount}</div>
          <div className="summary-label">Pending</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{inProgressCount}</div>
          <div className="summary-label">In Progress</div>
        </div>
        <div className="summary-card urgent">
          <div className="summary-value">{overdueCount}</div>
          <div className="summary-label">Overdue</div>
        </div>
      </div>

      <Grid
        data={tasks}
        style={{ height: '550px' }}
      >
        <GridToolbar>
          <span className="grid-toolbar-info">
            Total Tasks: {tasks.length}
          </span>
        </GridToolbar>

        <GridColumn field="title" title="Title" width="250px" />
        <GridColumn
          field="task_type"
          title="Type"
          width="150px"
          cell={(props) => (
            <td>{props.dataItem.task_type.replace('_', ' ')}</td>
          )}
        />
        <GridColumn field="priority" title="Priority" width="100px" cell={PriorityCell} />
        <GridColumn field="status" title="Status" width="120px" cell={StatusCell} />
        <GridColumn
          field="assigned_to_email"
          title="Assigned To"
          width="200px"
          cell={(props) => (
            <td>{props.dataItem.assigned_to_email || 'Unassigned'}</td>
          )}
        />
        <GridColumn
          field="related_entity_name"
          title="Related Entity"
          width="180px"
          cell={(props) => (
            <td>{props.dataItem.related_entity_name || '-'}</td>
          )}
        />
        <GridColumn field="due_date" title="Due Date" width="130px" cell={DueDateCell} />
        <GridColumn title="Actions" width="220px" cell={ActionsCell} />
      </Grid>

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
                value={taskTypeOptions.find(o => o.value === formData.task_type)}
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
                value={priorityOptions.find(o => o.value === formData.priority)}
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
                value={priorityOptions.find(o => o.value === formData.priority)}
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
    </div>
  );
};

export default TasksGrid;
