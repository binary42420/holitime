-- Migration 009: Add OSHA Compliant Trait
-- This migration adds the osha_compliant trait to the users table

-- Add OSHA compliant column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS osha_compliant BOOLEAN DEFAULT false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_osha_compliant ON users(osha_compliant);

-- Add comment for documentation
COMMENT ON COLUMN users.osha_compliant IS 'Whether this user is OSHA compliant and certified';

-- Update existing users based on role (optional - you can customize this logic)
-- For now, we'll leave all users as not OSHA compliant by default
-- Managers can manually update this field for each employee
