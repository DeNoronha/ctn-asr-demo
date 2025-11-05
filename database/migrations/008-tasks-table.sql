-- ================================================================================================
-- Task Management System
-- ================================================================================================
-- Creates tasks table for tracking administrative and review tasks
-- Supports task assignment, priority levels, and status tracking

CREATE TABLE IF NOT EXISTS tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL, -- 'review', 'approval', 'verification', 'general'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'

  -- Assignment
  assigned_to UUID, -- References Azure AD user ID
  assigned_by UUID NOT NULL, -- References Azure AD user ID
  assigned_at TIMESTAMP DEFAULT NOW(),

  -- Related entities
  related_entity_type VARCHAR(50), -- 'application', 'member', 'legal_entity', etc.
  related_entity_id UUID,

  -- Dates
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Metadata
  metadata JSONB, -- Additional task-specific data

  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_task_type CHECK (task_type IN ('review', 'approval', 'verification', 'general'))
);

-- Indexes for common queries
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_related_entity ON tasks(related_entity_type, related_entity_id);

-- Updated at trigger
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tasks IS 'Administrative and review tasks for CTN staff';
COMMENT ON COLUMN tasks.task_type IS 'Type of task: review, approval, verification, general';
COMMENT ON COLUMN tasks.status IS 'Current status: pending, in_progress, completed, cancelled';
COMMENT ON COLUMN tasks.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN tasks.metadata IS 'Additional task-specific data (JSON)';
