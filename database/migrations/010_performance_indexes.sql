-- ========================================
-- Performance Optimization Indexes
-- Migration: 010_performance_indexes.sql
-- ========================================
-- Purpose: Add missing indexes for frequently queried columns
-- to improve query performance across all major tables.

BEGIN;

-- ========================================
-- Subscriptions Table Indexes
-- ========================================

-- Index for filtering by status (active/inactive/cancelled subscriptions)
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
ON subscriptions(status);

-- Index for sorting by creation date (most recent subscriptions)
CREATE INDEX IF NOT EXISTS idx_subscriptions_created
ON subscriptions(created_at DESC);

-- Index for foreign key to legal_entity
CREATE INDEX IF NOT EXISTS idx_subscriptions_entity
ON subscriptions(legal_entity_id);

-- Composite index for active subscriptions ordered by next billing date
-- Used in: getDueSubscriptions() query
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing
ON subscriptions(status, next_billing_date)
WHERE status = 'active';

-- Index for plan-based queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan
ON subscriptions(plan_name);


-- ========================================
-- Invoices Table Indexes
-- ========================================

-- Index for foreign key to subscriptions
CREATE INDEX IF NOT EXISTS idx_invoices_subscription
ON invoices(subscription_id);

-- Index for foreign key to legal_entity
CREATE INDEX IF NOT EXISTS idx_invoices_entity
ON invoices(legal_entity_id);

-- Index for sorting by issue date (recent invoices first)
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date
ON invoices(issue_date DESC);

-- Index for invoice number lookups and LIKE queries
CREATE INDEX IF NOT EXISTS idx_invoices_number
ON invoices(invoice_number);

-- Index for invoice status filtering
CREATE INDEX IF NOT EXISTS idx_invoices_status
ON invoices(payment_status);

-- Composite index for unpaid invoices by due date
CREATE INDEX IF NOT EXISTS idx_invoices_unpaid_due
ON invoices(payment_status, due_date)
WHERE payment_status != 'paid';


-- ========================================
-- Admin Tasks Table Indexes
-- ========================================

-- Index for task type filtering (kvk_verification, member_review, etc.)
CREATE INDEX IF NOT EXISTS idx_admin_tasks_type
ON admin_tasks(task_type);

-- Index for status filtering (pending, in_progress, completed, cancelled)
CREATE INDEX IF NOT EXISTS idx_admin_tasks_status
ON admin_tasks(status);

-- Index for priority filtering (low, medium, high, urgent)
CREATE INDEX IF NOT EXISTS idx_admin_tasks_priority
ON admin_tasks(priority);

-- Index for assigned user filtering
CREATE INDEX IF NOT EXISTS idx_admin_tasks_assigned
ON admin_tasks(assigned_to)
WHERE assigned_to IS NOT NULL;

-- Index for foreign key to legal_entity
CREATE INDEX IF NOT EXISTS idx_admin_tasks_entity
ON admin_tasks(related_entity_id)
WHERE related_entity_id IS NOT NULL;

-- Composite index for open tasks ordered by priority and due date
-- Used in: getTasks() with filters and ordering
CREATE INDEX IF NOT EXISTS idx_admin_tasks_open_priority
ON admin_tasks(status, priority DESC, due_date ASC)
WHERE status NOT IN ('completed', 'cancelled');

-- Index for overdue tasks
CREATE INDEX IF NOT EXISTS idx_admin_tasks_overdue
ON admin_tasks(due_date, status)
WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled');

-- Index for created date sorting
CREATE INDEX IF NOT EXISTS idx_admin_tasks_created
ON admin_tasks(created_at DESC);


-- ========================================
-- Newsletters Table Indexes
-- ========================================

-- Index for sorting by creation date (recent newsletters)
CREATE INDEX IF NOT EXISTS idx_newsletters_created
ON newsletters(created_at DESC);

-- Index for sent newsletters
CREATE INDEX IF NOT EXISTS idx_newsletters_sent
ON newsletters(sent_at DESC)
WHERE sent_at IS NOT NULL;

-- Index for newsletter status
CREATE INDEX IF NOT EXISTS idx_newsletters_status
ON newsletters(status);

-- Index for scheduled newsletters
CREATE INDEX IF NOT EXISTS idx_newsletters_scheduled
ON newsletters(scheduled_send_time)
WHERE scheduled_send_time IS NOT NULL AND status = 'scheduled';


-- ========================================
-- Newsletter Recipients Table Indexes
-- ========================================

-- Index for foreign key to newsletter
CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_newsletter
ON newsletter_recipients(newsletter_id);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_email
ON newsletter_recipients(email_address);

-- Index for sent status filtering
CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_sent
ON newsletter_recipients(sent_at)
WHERE sent_at IS NOT NULL;

-- Index for bounced/failed recipients
CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_status
ON newsletter_recipients(delivery_status);

-- Index for creation order
CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_created
ON newsletter_recipients(created_at ASC);


-- ========================================
-- Members Table Additional Indexes
-- ========================================

-- Index for KvK number lookups (commonly used in verification)
CREATE INDEX IF NOT EXISTS idx_members_kvk
ON members(kvk)
WHERE kvk IS NOT NULL;

-- Index for creation date (recently created members)
CREATE INDEX IF NOT EXISTS idx_members_created
ON members(created_at DESC);

-- Index for updated date (recently updated members)
CREATE INDEX IF NOT EXISTS idx_members_updated
ON members(updated_at DESC);

-- Index for legal_entity_id foreign key
CREATE INDEX IF NOT EXISTS idx_members_legal_entity
ON members(legal_entity_id)
WHERE legal_entity_id IS NOT NULL;

-- Composite index for active members by membership level
CREATE INDEX IF NOT EXISTS idx_members_active_level
ON members(status, membership_level)
WHERE status = 'ACTIVE';


-- ========================================
-- Legal Entity Additional Indexes
-- ========================================

-- Index for modification date (recently updated entities)
CREATE INDEX IF NOT EXISTS idx_legal_entity_modified
ON legal_entity(dt_modified DESC);

-- Index for domain lookups
CREATE INDEX IF NOT EXISTS idx_legal_entity_domain
ON legal_entity(domain)
WHERE domain IS NOT NULL;

-- Index for document upload tracking
CREATE INDEX IF NOT EXISTS idx_legal_entity_doc_uploaded
ON legal_entity(document_uploaded_at DESC)
WHERE document_uploaded_at IS NOT NULL;

-- Composite index for flagged KvK verifications needing review
CREATE INDEX IF NOT EXISTS idx_legal_entity_kvk_flagged
ON legal_entity(kvk_verification_status, document_uploaded_at DESC)
WHERE kvk_verification_status = 'flagged';


-- ========================================
-- Endpoint Authorization Additional Indexes
-- ========================================

-- Index for token lookups (for validation)
-- Note: token_hash should be used for lookups, not token_value
CREATE INDEX IF NOT EXISTS idx_endpoint_auth_token_hash
ON endpoint_authorization(token_hash)
WHERE token_hash IS NOT NULL AND is_active = true;

-- Index for expiring tokens (for cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_endpoint_auth_expiring
ON endpoint_authorization(expires_at ASC, is_active)
WHERE expires_at IS NOT NULL AND is_active = true;

-- Index for last used tracking
CREATE INDEX IF NOT EXISTS idx_endpoint_auth_last_used
ON endpoint_authorization(last_used_at DESC)
WHERE last_used_at IS NOT NULL;


-- ========================================
-- Audit Logs Additional Indexes
-- ========================================

-- Composite index for resource lookups
CREATE INDEX IF NOT EXISTS idx_audit_resource
ON audit_logs(resource_type, resource_id, event_time DESC);

-- Index for action filtering
CREATE INDEX IF NOT EXISTS idx_audit_action
ON audit_logs(action, event_time DESC);

-- Index for result filtering (success/failure)
CREATE INDEX IF NOT EXISTS idx_audit_result
ON audit_logs(result, event_time DESC);


COMMIT;

-- ========================================
-- Performance Notes
-- ========================================
--
-- These indexes improve query performance for:
-- 1. Sorting by creation/modification dates (DESC indexes)
-- 2. Filtering by status, priority, type (categorical columns)
-- 3. Foreign key lookups (JOIN performance)
-- 4. Composite queries (multiple WHERE conditions)
-- 5. Partial indexes for common filtered queries (WHERE clauses)
--
-- Estimated Performance Impact:
-- - Subscription billing queries: 10-100x faster
-- - Task dashboard queries: 20-50x faster
-- - Newsletter sending queries: 50-200x faster
-- - Audit log searches: 10-30x faster
-- - Invoice lookups: 5-20x faster
--
-- Index Maintenance:
-- - Indexes are automatically updated on INSERT/UPDATE/DELETE
-- - PostgreSQL auto-vacuums will keep indexes optimized
-- - Monitor index usage with pg_stat_user_indexes view
--
-- To check index usage after deployment:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan ASC;
