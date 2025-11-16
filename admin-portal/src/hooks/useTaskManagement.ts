import { useCallback, useState } from 'react';
import { apiV2 } from '../services/apiV2';
import { logger } from '../utils/logger';

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

interface TaskFormData {
  task_type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to_email: string;
  due_date: Date | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071/api';

const initialFormData: TaskFormData = {
  task_type: 'other',
  title: '',
  description: '',
  priority: 'medium',
  assigned_to_email: '',
  due_date: null,
};

export function useTaskManagement() {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AdminTask | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(initialFormData);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      logger.log('TasksGrid: Fetching tasks from API...');
      const response = await apiV2.getAdminTasks();
      logger.log(`TasksGrid: Loaded ${response.tasks.length} tasks`);
      setTasks(response.tasks);
    } catch (error) {
      logger.error('Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
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

      resetForm();
      await loadTasks();
      return true;
    } catch (error) {
      logger.error('Error creating task:', error);
      alert('Failed to create task');
      return false;
    }
  }, [formData, resetForm, loadTasks]);

  const handleUpdate = useCallback(
    async (status?: string) => {
      if (!selectedTask) return false;

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

        setSelectedTask(null);
        resetForm();
        await loadTasks();
        return true;
      } catch (error) {
        logger.error('Error updating task:', error);
        alert('Failed to update task');
        return false;
      }
    },
    [selectedTask, formData, resetForm, loadTasks]
  );

  const handleCompleteTask = useCallback(
    async (taskId: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/v1/admin/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        });

        if (!response.ok) throw new Error('Failed to complete task');

        await loadTasks();
        return true;
      } catch (error) {
        logger.error('Error completing task:', error);
        alert('Failed to complete task');
        return false;
      }
    },
    [loadTasks]
  );

  const populateFormWithTask = useCallback((task: AdminTask) => {
    setSelectedTask(task);
    setFormData({
      task_type: task.task_type,
      title: task.title,
      description: task.description,
      priority: task.priority,
      assigned_to_email: task.assigned_to_email || '',
      due_date: task.due_date ? new Date(task.due_date) : null,
    });
  }, []);

  return {
    tasks,
    selectedTask,
    formData,
    loading,
    setFormData,
    loadTasks,
    handleCreate,
    handleUpdate,
    handleCompleteTask,
    resetForm,
    populateFormWithTask,
  };
}
