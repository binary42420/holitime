-- Document Management System Database Schema
-- This file contains the complete database schema for the document management system

-- Document Categories Table
CREATE TABLE IF NOT EXISTS document_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Templates Table
CREATE TABLE IF NOT EXISTS document_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500),
    file_size INTEGER DEFAULT 0,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    applicable_roles TEXT[] DEFAULT '{}', -- Array of role names
    expiration_days INTEGER, -- Days until document expires
    auto_assign_new_users BOOLEAN DEFAULT false,
    conditional_logic JSONB, -- JSON for conditional assignment rules
    category_id INTEGER REFERENCES document_categories(id),
    created_by VARCHAR(255), -- Store user ID as string to avoid FK issues
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Assignments Table
CREATE TABLE IF NOT EXISTS document_assignments (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Store user ID as string to avoid FK issues
    template_id INTEGER NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
    assigned_by VARCHAR(255), -- Store user ID as string to avoid FK issues
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    priority VARCHAR(20) DEFAULT 'normal',
    is_required BOOLEAN DEFAULT false,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'not_started',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, template_id) -- Prevent duplicate assignments
);

-- Document Submissions Table
CREATE TABLE IF NOT EXISTS document_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES document_assignments(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL, -- Store user ID as string to avoid FK issues
    template_id INTEGER NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
    submission_data JSONB, -- Form data as JSON
    file_path VARCHAR(500), -- Path to uploaded file
    file_size INTEGER DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    is_draft BOOLEAN DEFAULT false,
    signature_data JSONB, -- Digital signature information
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Approvals Table
CREATE TABLE IF NOT EXISTS document_approvals (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES document_submissions(id) ON DELETE CASCADE,
    assignment_id INTEGER NOT NULL REFERENCES document_assignments(id) ON DELETE CASCADE,
    reviewer_id VARCHAR(255) NOT NULL, -- Store user ID as string to avoid FK issues
    status VARCHAR(20) DEFAULT 'pending',
    comments TEXT,
    reviewed_at TIMESTAMP,
    approval_level INTEGER DEFAULT 1,
    is_final_approval BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Audit Trail Table
CREATE TABLE IF NOT EXISTS document_audit_trail (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- 'template', 'assignment', 'submission', 'approval'
    entity_id INTEGER NOT NULL,
    user_id VARCHAR(255), -- Store user ID as string to avoid FK issues
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'submitted', 'approved', etc.
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Reminders Table
CREATE TABLE IF NOT EXISTS document_reminders (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES document_assignments(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('due_soon', 'overdue', 'expiring')),
    scheduled_for TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    email_template_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Templates Table (Enhanced)
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT,
    template_type VARCHAR(50) NOT NULL,
    variables JSONB, -- Available template variables
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_document_assignments_user_id ON document_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_document_assignments_template_id ON document_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_document_assignments_status ON document_assignments(status);
CREATE INDEX IF NOT EXISTS idx_document_assignments_due_date ON document_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_document_assignments_assigned_at ON document_assignments(assigned_at);

CREATE INDEX IF NOT EXISTS idx_document_submissions_assignment_id ON document_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_document_submissions_user_id ON document_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_document_submissions_submitted_at ON document_submissions(submitted_at);

CREATE INDEX IF NOT EXISTS idx_document_approvals_submission_id ON document_approvals(submission_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_reviewer_id ON document_approvals(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_status ON document_approvals(status);

CREATE INDEX IF NOT EXISTS idx_document_templates_document_type ON document_templates(document_type);
CREATE INDEX IF NOT EXISTS idx_document_templates_is_active ON document_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_document_audit_trail_entity ON document_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_trail_user_id ON document_audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_trail_created_at ON document_audit_trail(created_at);

-- Triggers for Updated At Timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_document_categories_updated_at BEFORE UPDATE ON document_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_assignments_updated_at BEFORE UPDATE ON document_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_submissions_updated_at BEFORE UPDATE ON document_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_approvals_updated_at BEFORE UPDATE ON document_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert Default Document Categories
INSERT INTO document_categories (name, description, color, icon, sort_order) VALUES
('Employment Forms', 'Required employment and tax forms', '#3B82F6', 'FileText', 1),
('Safety & Training', 'Safety training and certification documents', '#EF4444', 'Shield', 2),
('Company Policies', 'Company policy acknowledgments', '#8B5CF6', 'BookOpen', 3),
('Background & Screening', 'Background checks and drug testing', '#F59E0B', 'Search', 4),
('Equipment & Tools', 'Equipment checkout and tool assignments', '#10B981', 'Wrench', 5),
('Timesheets', 'Time tracking and payroll documents', '#6B7280', 'Clock', 6)
ON CONFLICT DO NOTHING;

-- Insert Default Email Templates
INSERT INTO email_templates (name, subject, html_body, text_body, template_type, variables) VALUES
('document_assignment', 'New Document Assignment - {{documentName}}', 
'<h2>New Document Assignment</h2><p>Hello {{userName}},</p><p>You have been assigned a new document: <strong>{{documentName}}</strong></p><p>Due Date: {{dueDate}}</p><p>Priority: {{priority}}</p>', 
'New Document Assignment\n\nHello {{userName}},\n\nYou have been assigned a new document: {{documentName}}\n\nDue Date: {{dueDate}}\nPriority: {{priority}}', 
'document', 
'{"userName": "User name", "documentName": "Document name", "dueDate": "Due date", "priority": "Priority level"}'),

('document_reminder', 'Document Reminder - {{documentName}} Due Soon', 
'<h2>Document Reminder</h2><p>Hello {{userName}},</p><p>This is a reminder that the following document is due soon: <strong>{{documentName}}</strong></p><p>Due Date: {{dueDate}}</p>', 
'Document Reminder\n\nHello {{userName}},\n\nThis is a reminder that the following document is due soon: {{documentName}}\n\nDue Date: {{dueDate}}', 
'document', 
'{"userName": "User name", "documentName": "Document name", "dueDate": "Due date"}'),

('document_approved', 'Document Approved - {{documentName}}', 
'<h2>Document Approved</h2><p>Hello {{userName}},</p><p>Your document has been approved: <strong>{{documentName}}</strong></p><p>Approved by: {{reviewerName}}</p>', 
'Document Approved\n\nHello {{userName}},\n\nYour document has been approved: {{documentName}}\n\nApproved by: {{reviewerName}}', 
'document', 
'{"userName": "User name", "documentName": "Document name", "reviewerName": "Reviewer name"}'),

('document_rejected', 'Document Requires Revision - {{documentName}}', 
'<h2>Document Requires Revision</h2><p>Hello {{userName}},</p><p>Your document submission requires revision: <strong>{{documentName}}</strong></p><p>Comments: {{comments}}</p>', 
'Document Requires Revision\n\nHello {{userName}},\n\nYour document submission requires revision: {{documentName}}\n\nComments: {{comments}}', 
'document', 
'{"userName": "User name", "documentName": "Document name", "comments": "Reviewer comments"}')
ON CONFLICT DO NOTHING;
