-- Migration 007: Add No Show Status Support
-- This migration adds 'no_show' status to the assigned_personnel table

-- Drop the existing check constraint
ALTER TABLE assigned_personnel DROP CONSTRAINT IF EXISTS assigned_personnel_status_check;

-- Add the new check constraint with 'no_show' status
ALTER TABLE assigned_personnel ADD CONSTRAINT assigned_personnel_status_check 
CHECK (status IN ('Clocked Out', 'Clocked In', 'On Break', 'Shift Ended', 'no_show', 'not_started'));

-- Add comment to document the new status
COMMENT ON COLUMN assigned_personnel.status IS 'Worker status: Clocked Out, Clocked In, On Break, Shift Ended, no_show, not_started';

-- Create shift_logs table if it doesn't exist (for logging no-show actions)
CREATE TABLE IF NOT EXISTS shift_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for shift logs
CREATE INDEX IF NOT EXISTS idx_shift_logs_shift_id ON shift_logs(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_logs_action ON shift_logs(action);
CREATE INDEX IF NOT EXISTS idx_shift_logs_created_at ON shift_logs(created_at);
