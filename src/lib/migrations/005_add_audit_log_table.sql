-- Migration 005: Add audit log table for tracking deletion operations
-- This migration creates an audit log table to track cascade deletion operations

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    entity_name VARCHAR(255),
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB,
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at ON audit_log(performed_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON audit_log(entity_id);

-- Add comments for documentation
COMMENT ON TABLE audit_log IS 'Audit trail for tracking important system operations, especially cascade deletions';
COMMENT ON COLUMN audit_log.action IS 'Type of action performed (e.g., DELETE_CASCADE, CREATE, UPDATE)';
COMMENT ON COLUMN audit_log.entity_type IS 'Type of entity affected (e.g., client_company, job, shift)';
COMMENT ON COLUMN audit_log.entity_id IS 'ID of the entity that was affected';
COMMENT ON COLUMN audit_log.entity_name IS 'Human-readable name of the entity for easier identification';
COMMENT ON COLUMN audit_log.performed_by IS 'User ID who performed the action';
COMMENT ON COLUMN audit_log.details IS 'JSON object containing additional details about the operation';
COMMENT ON COLUMN audit_log.ip_address IS 'IP address from which the action was performed';
COMMENT ON COLUMN audit_log.user_agent IS 'User agent string of the client that performed the action';
