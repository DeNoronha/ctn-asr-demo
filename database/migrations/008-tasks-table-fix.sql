-- Migration: Add missing columns to admin_tasks table
-- Date: November 6, 2025
-- Description: Add assigned_to_email, created_by, and tags columns

-- Add assigned_to_email column
ALTER TABLE admin_tasks
ADD COLUMN IF NOT EXISTS assigned_to_email VARCHAR(255);

-- Add created_by column (maps to assigned_by for now)
ALTER TABLE admin_tasks
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Add tags column (array of strings)
ALTER TABLE admin_tasks
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add index on assigned_to_email for lookups
CREATE INDEX IF NOT EXISTS idx_admin_tasks_assigned_to_email
ON admin_tasks(assigned_to_email);

-- Add index on created_by
CREATE INDEX IF NOT EXISTS idx_admin_tasks_created_by
ON admin_tasks(created_by);

-- Add comments
COMMENT ON COLUMN admin_tasks.assigned_to_email IS 'Email address of person assigned to task (alternative to assigned_to UUID)';
COMMENT ON COLUMN admin_tasks.created_by IS 'User ID who created the task';
COMMENT ON COLUMN admin_tasks.tags IS 'Array of tag strings for categorization';
