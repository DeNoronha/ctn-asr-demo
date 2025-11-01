-- Migration: Remove newsletter and subscription functionality
-- Date: 2025-01-11
-- Description: Complete removal of newsletter and subscription tables, views, indexes, and foreign keys
-- These features were never used in production and are being removed to simplify the codebase

BEGIN;

-- Drop dependent foreign keys from admin_tasks table
ALTER TABLE IF EXISTS public.admin_tasks
  DROP CONSTRAINT IF EXISTS admin_tasks_related_subscription_id_fkey;

ALTER TABLE IF EXISTS public.admin_tasks
  DROP CONSTRAINT IF EXISTS admin_tasks_related_newsletter_id_fkey;

-- Drop views
DROP VIEW IF EXISTS public.newsletter_performance_view CASCADE;

-- Drop foreign keys from child tables
ALTER TABLE IF EXISTS public.newsletter_recipients
  DROP CONSTRAINT IF EXISTS newsletter_recipients_newsletter_id_fkey;

ALTER TABLE IF EXISTS public.newsletter_recipients
  DROP CONSTRAINT IF EXISTS newsletter_recipients_legal_entity_id_fkey;

ALTER TABLE IF EXISTS public.subscription_history
  DROP CONSTRAINT IF EXISTS subscription_history_subscription_id_fkey;

ALTER TABLE IF EXISTS public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_legal_entity_id_fkey;

ALTER TABLE IF EXISTS public.invoices
  DROP CONSTRAINT IF EXISTS invoices_subscription_id_fkey;

ALTER TABLE IF EXISTS public.invoices
  DROP CONSTRAINT IF EXISTS invoices_legal_entity_id_fkey;

-- Drop tables in correct order (children first)
DROP TABLE IF EXISTS public.newsletter_recipients CASCADE;
DROP TABLE IF EXISTS public.newsletters CASCADE;
DROP TABLE IF EXISTS public.subscription_history CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- Drop indexes (if they still exist after CASCADE)
DROP INDEX IF EXISTS public.idx_newsletter_recipients_entity;
DROP INDEX IF EXISTS public.idx_newsletter_recipients_newsletter;
DROP INDEX IF EXISTS public.idx_newsletter_recipients_status;
DROP INDEX IF EXISTS public.idx_newsletters_created;
DROP INDEX IF EXISTS public.idx_newsletters_sent;
DROP INDEX IF EXISTS public.idx_newsletters_status;
DROP INDEX IF EXISTS public.idx_subscription_history_event;
DROP INDEX IF EXISTS public.idx_subscription_history_subscription;
DROP INDEX IF EXISTS public.idx_subscriptions_billing;
DROP INDEX IF EXISTS public.idx_subscriptions_entity;
DROP INDEX IF EXISTS public.idx_subscriptions_status;
DROP INDEX IF EXISTS public.idx_invoices_entity;
DROP INDEX IF EXISTS public.idx_invoices_number;
DROP INDEX IF EXISTS public.idx_invoices_status;
DROP INDEX IF EXISTS public.idx_invoices_subscription;
DROP INDEX IF EXISTS public.invoices_invoice_number_key;

-- Remove columns from admin_tasks table that referenced newsletters/subscriptions
ALTER TABLE IF EXISTS public.admin_tasks
  DROP COLUMN IF EXISTS related_subscription_id;

ALTER TABLE IF EXISTS public.admin_tasks
  DROP COLUMN IF EXISTS related_newsletter_id;

COMMIT;

-- Note: No rollback migration needed as these features were never used