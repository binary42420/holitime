-- Migration: Add timesheet export templates
-- This migration creates tables for managing Google Sheets export templates

-- Create export templates table
CREATE TABLE IF NOT EXISTS timesheet_export_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create template configurations table for flexible field mapping
CREATE TABLE IF NOT EXISTS template_field_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES timesheet_export_templates(id) ON DELETE CASCADE,
    field_type VARCHAR(50) NOT NULL, -- 'client_metadata' or 'employee_data'
    field_name VARCHAR(100) NOT NULL, -- e.g., 'client_company_name', 'employee_name'
    column_letter VARCHAR(10), -- Excel-style column (A, B, C, etc.)
    row_number INTEGER, -- Row number for insertion
    is_header BOOLEAN DEFAULT FALSE, -- Whether this is a header row
    display_name VARCHAR(255), -- Display name for the field
    data_type VARCHAR(50) DEFAULT 'text', -- text, number, date, time
    format_pattern VARCHAR(100), -- Optional formatting pattern
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create export history table for tracking exports
CREATE TABLE IF NOT EXISTS timesheet_export_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES timesheet_export_templates(id),
    exported_by UUID NOT NULL REFERENCES users(id),
    google_sheets_url TEXT,
    export_status VARCHAR(50) DEFAULT 'pending' CHECK (export_status IN ('pending', 'completed', 'failed')),
    error_message TEXT,
    exported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default template based on the client schedule template
INSERT INTO timesheet_export_templates (name, description, is_default, created_at) 
VALUES (
    'Default Client Schedule Template',
    'Standard template matching the existing client schedule format with configurable field positions',
    TRUE,
    NOW()
) ON CONFLICT DO NOTHING;

-- Get the default template ID for field mappings
DO $$
DECLARE
    default_template_id UUID;
BEGIN
    SELECT id INTO default_template_id 
    FROM timesheet_export_templates 
    WHERE name = 'Default Client Schedule Template' 
    LIMIT 1;

    -- Client Metadata Mappings (Row 11 based on template analysis)
    INSERT INTO template_field_mappings (template_id, field_type, field_name, column_letter, row_number, is_header, display_name, data_type) VALUES
    (default_template_id, 'client_metadata', 'hands_on_job_number', 'C', 11, FALSE, 'HANDS ON JOB #', 'text'),
    (default_template_id, 'client_metadata', 'client_po_number', 'D', 11, FALSE, 'CLIENT PO#', 'text'),
    (default_template_id, 'client_metadata', 'client_name', 'E', 11, FALSE, 'CLIENT NAME', 'text'),
    (default_template_id, 'client_metadata', 'client_contact', 'F', 11, FALSE, 'POC', 'text'),
    (default_template_id, 'client_metadata', 'job_location', 'G', 11, FALSE, 'LOCATION', 'text'),
    (default_template_id, 'client_metadata', 'job_notes', 'H', 11, FALSE, 'NOTES', 'text'),

    -- Job Details (Row 12)
    (default_template_id, 'client_metadata', 'job_name', 'B', 12, FALSE, 'JOB Name', 'text'),
    (default_template_id, 'client_metadata', 'shift_date', 'C', 12, FALSE, 'DATE/TIME', 'date'),
    (default_template_id, 'client_metadata', 'crew_requested', 'D', 12, FALSE, 'CREW REQUESTED', 'text'),

    -- Employee Data Table Headers (Row 18)
    (default_template_id, 'employee_data', 'date_time_header', 'A', 18, TRUE, 'DATE/TIME', 'text'),
    (default_template_id, 'employee_data', 'crew_requested_header', 'B', 18, TRUE, 'Crew Requested', 'text'),
    (default_template_id, 'employee_data', 'email_header', 'C', 18, TRUE, 'Email Address', 'text'),
    (default_template_id, 'employee_data', 'contact_header', 'D', 18, TRUE, 'Contact', 'text'),
    (default_template_id, 'employee_data', 'employee_name_header', 'E', 18, TRUE, 'EMPLOYEE NAME', 'text'),
    (default_template_id, 'employee_data', 'job_title_header', 'F', 18, TRUE, 'JT', 'text'),
    (default_template_id, 'employee_data', 'check_in_out_header', 'G', 18, TRUE, 'check in/out', 'text'),
    (default_template_id, 'employee_data', 'in_1_header', 'H', 18, TRUE, 'IN', 'text'),
    (default_template_id, 'employee_data', 'out_1_header', 'I', 18, TRUE, 'OUT', 'text'),
    (default_template_id, 'employee_data', 'in_2_header', 'J', 18, TRUE, 'IN', 'text'),
    (default_template_id, 'employee_data', 'out_2_header', 'K', 18, TRUE, 'OUT', 'text'),
    (default_template_id, 'employee_data', 'in_3_header', 'L', 18, TRUE, 'IN', 'text'),
    (default_template_id, 'employee_data', 'out_3_header', 'M', 18, TRUE, 'OUT', 'text'),
    (default_template_id, 'employee_data', 'notes_header', 'N', 18, TRUE, 'TIME CARD/SHIFT NOTES', 'text'),

    -- Employee Data Fields (Starting Row 19)
    (default_template_id, 'employee_data', 'shift_date', 'A', 19, FALSE, 'Date/Time', 'date'),
    (default_template_id, 'employee_data', 'crew_requested', 'B', 19, FALSE, 'Crew Requested', 'text'),
    (default_template_id, 'employee_data', 'employee_email', 'C', 19, FALSE, 'Email Address', 'text'),
    (default_template_id, 'employee_data', 'employee_contact', 'D', 19, FALSE, 'Contact', 'text'),
    (default_template_id, 'employee_data', 'employee_name', 'E', 19, FALSE, 'Employee Name', 'text'),
    (default_template_id, 'employee_data', 'job_title', 'F', 19, FALSE, 'Job Title', 'text'),
    (default_template_id, 'employee_data', 'check_in_out_status', 'G', 19, FALSE, 'Status', 'text'),
    (default_template_id, 'employee_data', 'clock_in_1', 'H', 19, FALSE, 'Clock In 1', 'time'),
    (default_template_id, 'employee_data', 'clock_out_1', 'I', 19, FALSE, 'Clock Out 1', 'time'),
    (default_template_id, 'employee_data', 'clock_in_2', 'J', 19, FALSE, 'Clock In 2', 'time'),
    (default_template_id, 'employee_data', 'clock_out_2', 'K', 19, FALSE, 'Clock Out 2', 'time'),
    (default_template_id, 'employee_data', 'clock_in_3', 'L', 19, FALSE, 'Clock In 3', 'time'),
    (default_template_id, 'employee_data', 'clock_out_3', 'M', 19, FALSE, 'Clock Out 3', 'time'),
    (default_template_id, 'employee_data', 'timecard_notes', 'N', 19, FALSE, 'Notes', 'text');
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_field_mappings_template_id ON template_field_mappings(template_id);
CREATE INDEX IF NOT EXISTS idx_template_field_mappings_field_type ON template_field_mappings(field_type);
CREATE INDEX IF NOT EXISTS idx_export_history_timesheet_id ON timesheet_export_history(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_export_history_exported_by ON timesheet_export_history(exported_by);

-- Add comments for documentation
COMMENT ON TABLE timesheet_export_templates IS 'Stores configurable templates for exporting timesheets to Google Sheets';
COMMENT ON TABLE template_field_mappings IS 'Defines field mappings and positions for each export template';
COMMENT ON TABLE timesheet_export_history IS 'Tracks export history and status for auditing purposes';
