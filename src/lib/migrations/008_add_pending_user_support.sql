-- Migration 008: Add Pending User Support
-- This migration adds support for pending user accounts that require manager approval

-- Add new columns to users table for pending account management
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'pending_activation', 'inactive'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing users to have 'active' status
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Add comments to document the new columns
COMMENT ON COLUMN users.status IS 'User account status: active, pending_activation, inactive';
COMMENT ON COLUMN users.created_by IS 'ID of the user who created this pending account';
COMMENT ON COLUMN users.requires_approval IS 'Whether this account requires manager approval before activation';
COMMENT ON COLUMN users.approval_notes IS 'Notes added during the approval process';
COMMENT ON COLUMN users.approved_by IS 'ID of the manager who approved this account';
COMMENT ON COLUMN users.approved_at IS 'Timestamp when the account was approved';
COMMENT ON COLUMN users.rejected_by IS 'ID of the manager who rejected this account';
COMMENT ON COLUMN users.rejected_at IS 'Timestamp when the account was rejected';
COMMENT ON COLUMN users.rejection_reason IS 'Reason for account rejection';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
CREATE INDEX IF NOT EXISTS idx_users_requires_approval ON users(requires_approval);

-- Create a view for pending employees that need approval
CREATE OR REPLACE VIEW pending_employees AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.created_at,
    u.created_by,
    creator.name as created_by_name,
    u.approval_notes,
    COUNT(ap.id) as assigned_shifts_count
FROM users u
LEFT JOIN users creator ON u.created_by = creator.id
LEFT JOIN assigned_personnel ap ON u.id = ap.employee_id
WHERE u.status = 'pending_activation' AND u.requires_approval = true
GROUP BY u.id, u.name, u.email, u.role, u.created_at, u.created_by, creator.name, u.approval_notes
ORDER BY u.created_at DESC;
