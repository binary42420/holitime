-- Migration 006: Comprehensive Timesheet Approval Workflow
-- This migration adds support for the complete timesheet approval workflow

-- Step 1: Update shifts table status constraint to include "Pending Client Approval"
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_status_check;
ALTER TABLE shifts 
ADD CONSTRAINT shifts_status_check 
CHECK (status IN ('Upcoming', 'In Progress', 'Completed', 'Cancelled', 'Pending Approval', 'Pending Client Approval'));

-- Step 2: Update timesheets table status constraint to match requirements
ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_status_check;
ALTER TABLE timesheets 
ADD CONSTRAINT timesheets_status_check 
CHECK (status IN ('draft', 'pending_client_approval', 'pending_final_approval', 'completed', 'rejected'));

-- Step 3: Add PDF storage fields to timesheets table
ALTER TABLE timesheets 
ADD COLUMN IF NOT EXISTS pdf_file_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMP WITH TIME ZONE;

-- Step 4: Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('timesheet_ready_for_approval', 'timesheet_approved', 'timesheet_rejected', 'shift_assigned')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_timesheet_id UUID REFERENCES timesheets(id) ON DELETE CASCADE,
  related_shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_timesheet ON notifications(related_timesheet_id);
CREATE INDEX IF NOT EXISTS idx_notifications_shift ON notifications(related_shift_id);

-- Step 6: Add update trigger for notifications
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at 
BEFORE UPDATE ON notifications 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Add comments for documentation
COMMENT ON TABLE notifications IS 'Stores user notifications for timesheet approval workflow and other system events';
COMMENT ON COLUMN timesheets.pdf_file_path IS 'File path or URL to the generated timesheet PDF';
COMMENT ON COLUMN timesheets.pdf_generated_at IS 'Timestamp when the PDF was generated';
