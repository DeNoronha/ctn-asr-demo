-- Migration: Make assigned_by nullable in admin_tasks
-- Date: November 6, 2025
-- Description: TaskService doesn't populate assigned_by, only created_by
--              Making assigned_by nullable since tasks can be created without assignment

-- Make assigned_by nullable (tasks don't have to be assigned when created)
ALTER TABLE admin_tasks
ALTER COLUMN assigned_by DROP NOT NULL;

COMMENT ON COLUMN admin_tasks.assigned_by IS 'User ID who assigned the task (nullable - can be assigned later)';
