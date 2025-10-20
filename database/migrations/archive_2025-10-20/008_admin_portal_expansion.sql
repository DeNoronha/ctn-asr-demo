-- Admin Portal Expansion: Subscriptions, Newsletters, Tasks
-- Created: 2025-10-12
-- Part of TO DO 7: Admin Portal Menu Expansion

-- =============================================================================
-- 1. SUBSCRIPTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id UUID NOT NULL REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE,

  -- Subscription Details
  plan_name VARCHAR(100) NOT NULL,
  plan_description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended', 'trial')),

  -- Dates
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Auto-renewal
  auto_renew BOOLEAN DEFAULT true,
  next_billing_date TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_entity
ON subscriptions(legal_entity_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
ON subscriptions(status, next_billing_date);

CREATE INDEX IF NOT EXISTS idx_subscriptions_billing
ON subscriptions(next_billing_date) WHERE status = 'active';

-- Comments for subscriptions
COMMENT ON TABLE subscriptions IS 'Member subscription plans and billing information';
COMMENT ON COLUMN subscriptions.billing_cycle IS 'Billing frequency: monthly, quarterly, yearly';
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: active, cancelled, expired, suspended, trial';
COMMENT ON COLUMN subscriptions.auto_renew IS 'Automatic renewal on next billing date';
COMMENT ON COLUMN subscriptions.metadata IS 'Additional subscription data (payment method, discounts, etc.)';

-- =============================================================================
-- 2. INVOICES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
  legal_entity_id UUID NOT NULL REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE,

  -- Invoice Details
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),

  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,

  -- Payment
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),

  -- File Storage
  pdf_url TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  line_items JSONB DEFAULT '[]'::jsonb
);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_subscription
ON invoices(subscription_id);

CREATE INDEX IF NOT EXISTS idx_invoices_entity
ON invoices(legal_entity_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status
ON invoices(status, due_date);

CREATE INDEX IF NOT EXISTS idx_invoices_number
ON invoices(invoice_number);

-- Comments for invoices
COMMENT ON TABLE invoices IS 'Subscription invoices and payment tracking';
COMMENT ON COLUMN invoices.invoice_number IS 'Unique invoice number (e.g., INV-2025-0001)';
COMMENT ON COLUMN invoices.line_items IS 'Array of invoice line items with description, quantity, price';

-- =============================================================================
-- 3. NEWSLETTERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS newsletters (
  newsletter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  title VARCHAR(255) NOT NULL,
  subject_line VARCHAR(255) NOT NULL,
  preview_text VARCHAR(150),
  content TEXT NOT NULL,
  html_content TEXT NOT NULL,

  -- Targeting
  recipient_filter VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (recipient_filter IN ('all', 'by_level', 'by_status', 'custom')),
  membership_levels TEXT[], -- e.g., ['PREMIUM', 'STANDARD']
  entity_statuses TEXT[], -- e.g., ['ACTIVE', 'PENDING']
  custom_recipient_ids UUID[], -- Specific entity IDs

  -- Status & Scheduling
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  -- Analytics
  recipient_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  unsubscribe_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for newsletters
CREATE INDEX IF NOT EXISTS idx_newsletters_status
ON newsletters(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_newsletters_sent
ON newsletters(sent_at DESC) WHERE sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_newsletters_created
ON newsletters(created_at DESC);

-- Comments for newsletters
COMMENT ON TABLE newsletters IS 'Email newsletters and campaigns sent to members';
COMMENT ON COLUMN newsletters.recipient_filter IS 'Target audience: all, by_level, by_status, custom';
COMMENT ON COLUMN newsletters.html_content IS 'Full HTML email content with styling';
COMMENT ON COLUMN newsletters.metadata IS 'Additional campaign data (A/B test variants, UTM params, etc.)';

-- =============================================================================
-- 4. NEWSLETTER RECIPIENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS newsletter_recipients (
  recipient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(newsletter_id) ON DELETE CASCADE,
  legal_entity_id UUID NOT NULL REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE,

  -- Contact Info (snapshot at send time)
  email_address VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),

  -- Delivery Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,

  -- Tracking
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  last_opened_at TIMESTAMPTZ,
  last_clicked_at TIMESTAMPTZ,

  -- Error Handling
  error_message TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for newsletter_recipients
CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_newsletter
ON newsletter_recipients(newsletter_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_entity
ON newsletter_recipients(legal_entity_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_status
ON newsletter_recipients(newsletter_id, status);

-- Comments for newsletter_recipients
COMMENT ON TABLE newsletter_recipients IS 'Individual recipient tracking for newsletters';
COMMENT ON COLUMN newsletter_recipients.email_address IS 'Email snapshot at send time (for historical tracking)';

-- =============================================================================
-- 5. ADMIN TASKS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Task Type
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN (
    'kvk_verification',
    'member_approval',
    'document_review',
    'support_ticket',
    'token_renewal',
    'billing_issue',
    'compliance_check',
    'manual_review',
    'other'
  )),

  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Priority & Status
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),

  -- Assignment
  assigned_to UUID, -- Could reference a user table (future)
  assigned_to_email VARCHAR(255),
  assigned_at TIMESTAMPTZ,

  -- Related Entities
  related_entity_id UUID REFERENCES legal_entity(legal_entity_id) ON DELETE SET NULL,
  related_subscription_id UUID REFERENCES subscriptions(subscription_id) ON DELETE SET NULL,
  related_newsletter_id UUID REFERENCES newsletters(newsletter_id) ON DELETE SET NULL,

  -- Dates
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by VARCHAR(100),

  -- Resolution
  resolution TEXT,
  resolution_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for admin_tasks
CREATE INDEX IF NOT EXISTS idx_admin_tasks_status
ON admin_tasks(status, priority, due_date);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_assigned
ON admin_tasks(assigned_to, status) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_tasks_entity
ON admin_tasks(related_entity_id) WHERE related_entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_tasks_type
ON admin_tasks(task_type, status);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_due
ON admin_tasks(due_date) WHERE status IN ('pending', 'in_progress');

-- Comments for admin_tasks
COMMENT ON TABLE admin_tasks IS 'Admin task management and workflow tracking';
COMMENT ON COLUMN admin_tasks.task_type IS 'Type of task: kvk_verification, member_approval, support_ticket, etc.';
COMMENT ON COLUMN admin_tasks.priority IS 'Task priority: low, medium, high, urgent';
COMMENT ON COLUMN admin_tasks.metadata IS 'Additional task data (links, attachments, context)';

-- =============================================================================
-- 6. SUBSCRIPTION HISTORY TABLE (Audit Log)
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscription_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,

  -- Change Details
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'created',
    'updated',
    'activated',
    'cancelled',
    'expired',
    'suspended',
    'renewed',
    'upgraded',
    'downgraded'
  )),

  -- Old and New Values
  old_values JSONB,
  new_values JSONB,

  -- Actor
  changed_by VARCHAR(100),
  change_reason TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for subscription_history
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription
ON subscription_history(subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_history_event
ON subscription_history(event_type, created_at DESC);

-- Comments for subscription_history
COMMENT ON TABLE subscription_history IS 'Audit log of subscription changes';
COMMENT ON COLUMN subscription_history.old_values IS 'Previous subscription state as JSON';
COMMENT ON COLUMN subscription_history.new_values IS 'New subscription state as JSON';

-- =============================================================================
-- 7. UPDATE TRIGGERS
-- =============================================================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to invoices
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to newsletters
DROP TRIGGER IF EXISTS update_newsletters_updated_at ON newsletters;
CREATE TRIGGER update_newsletters_updated_at
  BEFORE UPDATE ON newsletters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to admin_tasks
DROP TRIGGER IF EXISTS update_admin_tasks_updated_at ON admin_tasks;
CREATE TRIGGER update_admin_tasks_updated_at
  BEFORE UPDATE ON admin_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to newsletter_recipients
DROP TRIGGER IF EXISTS update_newsletter_recipients_updated_at ON newsletter_recipients;
CREATE TRIGGER update_newsletter_recipients_updated_at
  BEFORE UPDATE ON newsletter_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 8. VIEWS FOR REPORTING
-- =============================================================================

-- Active Subscriptions View
CREATE OR REPLACE VIEW active_subscriptions_view AS
SELECT
  s.subscription_id,
  s.legal_entity_id,
  le.legal_name,
  le.org_id,
  s.plan_name,
  s.price,
  s.currency,
  s.billing_cycle,
  s.status,
  s.start_date,
  s.next_billing_date,
  s.auto_renew,
  CASE
    WHEN s.next_billing_date < NOW() + INTERVAL '7 days' THEN true
    ELSE false
  END AS renewal_upcoming,
  CASE
    WHEN s.next_billing_date < NOW() THEN true
    ELSE false
  END AS renewal_overdue
FROM subscriptions s
JOIN legal_entity le ON s.legal_entity_id = le.legal_entity_id
WHERE s.status = 'active';

COMMENT ON VIEW active_subscriptions_view IS 'Active subscriptions with renewal alerts';

-- Task Dashboard View
CREATE OR REPLACE VIEW admin_tasks_dashboard_view AS
SELECT
  t.task_id,
  t.task_type,
  t.title,
  t.priority,
  t.status,
  t.assigned_to,
  t.assigned_to_email,
  t.due_date,
  t.created_at,
  CASE
    WHEN t.due_date < NOW() AND t.status NOT IN ('completed', 'cancelled') THEN true
    ELSE false
  END AS is_overdue,
  CASE
    WHEN t.due_date < NOW() + INTERVAL '24 hours'
         AND t.due_date > NOW()
         AND t.status NOT IN ('completed', 'cancelled')
    THEN true
    ELSE false
  END AS is_due_soon,
  le.legal_name AS related_entity_name,
  le.org_id AS related_entity_org_id
FROM admin_tasks t
LEFT JOIN legal_entity le ON t.related_entity_id = le.legal_entity_id;

COMMENT ON VIEW admin_tasks_dashboard_view IS 'Admin tasks with overdue and due-soon flags';

-- Newsletter Performance View
CREATE OR REPLACE VIEW newsletter_performance_view AS
SELECT
  n.newsletter_id,
  n.title,
  n.status,
  n.sent_at,
  n.recipient_count,
  n.delivered_count,
  n.open_count,
  n.click_count,
  n.bounce_count,
  CASE
    WHEN n.recipient_count > 0
    THEN ROUND((n.delivered_count::numeric / n.recipient_count) * 100, 2)
    ELSE 0
  END AS delivery_rate,
  CASE
    WHEN n.delivered_count > 0
    THEN ROUND((n.open_count::numeric / n.delivered_count) * 100, 2)
    ELSE 0
  END AS open_rate,
  CASE
    WHEN n.open_count > 0
    THEN ROUND((n.click_count::numeric / n.open_count) * 100, 2)
    ELSE 0
  END AS click_through_rate
FROM newsletters n
WHERE n.status = 'sent';

COMMENT ON VIEW newsletter_performance_view IS 'Newsletter analytics with calculated rates';

-- =============================================================================
-- 9. AUDIT LOG ENTRY
-- =============================================================================

INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)
VALUES (
  'SCHEMA_MIGRATION',
  'SYSTEM',
  'DATABASE',
  NULL,
  'CREATE_TABLES',
  'SUCCESS',
  jsonb_build_object(
    'migration', '008_admin_portal_expansion',
    'description', 'Created tables for Subscriptions, Newsletters, Admin Tasks',
    'tables', jsonb_build_array(
      'subscriptions',
      'invoices',
      'newsletters',
      'newsletter_recipients',
      'admin_tasks',
      'subscription_history'
    ),
    'views', jsonb_build_array(
      'active_subscriptions_view',
      'admin_tasks_dashboard_view',
      'newsletter_performance_view'
    )
  )
);

-- =============================================================================
-- 10. SAMPLE DATA (Optional - for development/testing)
-- =============================================================================

-- Insert sample subscription plans
-- COMMENT: Uncomment below for development environments

/*
INSERT INTO subscriptions (legal_entity_id, plan_name, plan_description, price, billing_cycle, status, start_date, next_billing_date)
SELECT
  legal_entity_id,
  'Standard Plan',
  'Standard membership with basic features',
  99.00,
  'monthly',
  'active',
  NOW() - INTERVAL '30 days',
  NOW() + INTERVAL '30 days'
FROM legal_entity
WHERE status = 'ACTIVE'
LIMIT 5;
*/

-- =============================================================================
-- Migration Complete
-- =============================================================================

-- Final verification query
SELECT
  'Migration 008 completed successfully' AS status,
  COUNT(*) FILTER (WHERE table_name = 'subscriptions') AS subscriptions_table_exists,
  COUNT(*) FILTER (WHERE table_name = 'invoices') AS invoices_table_exists,
  COUNT(*) FILTER (WHERE table_name = 'newsletters') AS newsletters_table_exists,
  COUNT(*) FILTER (WHERE table_name = 'newsletter_recipients') AS newsletter_recipients_table_exists,
  COUNT(*) FILTER (WHERE table_name = 'admin_tasks') AS admin_tasks_table_exists,
  COUNT(*) FILTER (WHERE table_name = 'subscription_history') AS subscription_history_table_exists
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('subscriptions', 'invoices', 'newsletters', 'newsletter_recipients', 'admin_tasks', 'subscription_history');
