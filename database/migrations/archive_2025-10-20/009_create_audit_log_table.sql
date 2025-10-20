-- ========================================
-- Migration 009: Create Audit Log Table
-- ========================================
-- Creates comprehensive audit logging for security and compliance
-- Run Date: 2025-10-13

-- Drop table if exists (for development/testing)
-- DROP TABLE IF EXISTS audit_log CASCADE;

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
    audit_log_id SERIAL PRIMARY KEY,

    -- Event information
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure')),

    -- User information
    user_id VARCHAR(255),
    user_email VARCHAR(255),

    -- Resource information
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action VARCHAR(100),

    -- Request information
    ip_address VARCHAR(45), -- IPv6 compatible
    user_agent TEXT,
    request_path TEXT,
    request_method VARCHAR(10),

    -- Additional details
    details JSONB,
    error_message TEXT,

    -- Timestamps
    dt_created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_user_email ON audit_log(user_email);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_severity ON audit_log(severity);
CREATE INDEX idx_audit_log_result ON audit_log(result);
CREATE INDEX idx_audit_log_dt_created ON audit_log(dt_created DESC);

-- Composite index for user activity queries
CREATE INDEX idx_audit_log_user_activity ON audit_log(user_id, dt_created DESC);

-- Composite index for failed events
CREATE INDEX idx_audit_log_failures ON audit_log(result, severity, dt_created DESC)
WHERE result = 'failure';

-- Add comments for documentation
COMMENT ON TABLE audit_log IS 'Comprehensive audit log for all sensitive operations';
COMMENT ON COLUMN audit_log.event_type IS 'Type of event (auth_success, member_created, etc.)';
COMMENT ON COLUMN audit_log.severity IS 'Event severity level (INFO, WARNING, ERROR, CRITICAL)';
COMMENT ON COLUMN audit_log.result IS 'Operation result (success or failure)';
COMMENT ON COLUMN audit_log.user_id IS 'ID of user who performed the action';
COMMENT ON COLUMN audit_log.user_email IS 'Email of user who performed the action';
COMMENT ON COLUMN audit_log.resource_type IS 'Type of resource affected (member, endpoint, etc.)';
COMMENT ON COLUMN audit_log.resource_id IS 'ID of affected resource';
COMMENT ON COLUMN audit_log.action IS 'Specific action performed';
COMMENT ON COLUMN audit_log.ip_address IS 'Client IP address';
COMMENT ON COLUMN audit_log.details IS 'Additional JSON details about the event';
COMMENT ON COLUMN audit_log.error_message IS 'Error message if result is failure';

-- Grant permissions (adjust role name as needed)
-- GRANT SELECT, INSERT ON audit_log TO api_user;
-- GRANT USAGE, SELECT ON SEQUENCE audit_log_audit_log_id_seq TO api_user;

-- Insert sample audit event to verify table creation
INSERT INTO audit_log (
    event_type,
    severity,
    result,
    details
) VALUES (
    'system_migration',
    'INFO',
    'success',
    '{"migration": "009_create_audit_log_table", "description": "Audit log table created"}'::jsonb
);

SELECT 'Audit log table created successfully' AS status;
