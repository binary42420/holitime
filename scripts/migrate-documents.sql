-- Document Management System Database Migration
-- Extends existing workforce management platform with comprehensive document management

-- Document Templates Table
CREATE TABLE IF NOT EXISTS document_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(100) NOT NULL, -- 'I9', 'W4', 'DirectDeposit', 'EmergencyContact', etc.
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    applicable_roles TEXT[], -- Array of roles: ['Employee', 'Crew Chief', 'Manager/Admin', 'Client']
    expiration_days INTEGER, -- Days until document expires (null = no expiration)
    auto_assign_new_users BOOLEAN DEFAULT false,
    conditional_logic JSONB, -- JSON for conditional assignment rules
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, version)
);

-- Document Assignments Table
CREATE TABLE IF NOT EXISTS document_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    is_required BOOLEAN DEFAULT false,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'under_review', 'approved', 'rejected', 'expired'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, template_id)
);

-- Document Submissions Table
CREATE TABLE IF NOT EXISTS document_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES document_assignments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER NOT NULL REFERENCES document_templates(id),
    submission_data JSONB, -- Form field data
    file_path VARCHAR(500), -- Path to completed PDF
    file_size INTEGER,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    is_draft BOOLEAN DEFAULT true,
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
    reviewer_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL, -- 'pending', 'approved', 'rejected', 'needs_revision'
    comments TEXT,
    reviewed_at TIMESTAMP,
    approval_level INTEGER DEFAULT 1, -- For multi-level approval workflows
    is_final_approval BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL, -- 'user_management', 'shift_management', 'document_management'
    subject VARCHAR(500) NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT NOT NULL,
    variables JSONB, -- Available variables for template
    is_active BOOLEAN DEFAULT true,
    is_system_template BOOLEAN DEFAULT false, -- Cannot be deleted if true
    created_by INTEGER REFERENCES users(id),
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Audit Trail Table
CREATE TABLE IF NOT EXISTS document_audit_trail (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- 'template', 'assignment', 'submission', 'approval'
    entity_id INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'created', 'updated', 'deleted', 'submitted', 'approved', 'rejected'
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
    reminder_type VARCHAR(50) NOT NULL, -- 'due_soon', 'overdue', 'expiring'
    scheduled_for TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    email_template_id INTEGER REFERENCES email_templates(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Categories Table (for organization)
CREATE TABLE IF NOT EXISTS document_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    icon VARCHAR(50), -- Icon name for UI
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add category reference to document_templates
ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES document_categories(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_assignments_user_id ON document_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_document_assignments_status ON document_assignments(status);
CREATE INDEX IF NOT EXISTS idx_document_assignments_due_date ON document_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_document_submissions_user_id ON document_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_document_submissions_assignment_id ON document_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_reviewer_id ON document_approvals(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_status ON document_approvals(status);
CREATE INDEX IF NOT EXISTS idx_document_audit_trail_entity ON document_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_document_reminders_scheduled ON document_reminders(scheduled_for, is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category, is_active);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_assignments_updated_at BEFORE UPDATE ON document_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_submissions_updated_at BEFORE UPDATE ON document_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_approvals_updated_at BEFORE UPDATE ON document_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default document categories
INSERT INTO document_categories (name, description, color, icon, sort_order) VALUES
('Employment Forms', 'Essential employment documentation', '#3B82F6', 'FileText', 1),
('Tax Documents', 'Tax withholding and related forms', '#10B981', 'Calculator', 2),
('Safety & Training', 'Safety training and acknowledgments', '#F59E0B', 'Shield', 3),
('Company Policies', 'Company policy acknowledgments', '#8B5CF6', 'BookOpen', 4),
('Background Checks', 'Background check and consent forms', '#EF4444', 'UserCheck', 5),
('Skills Assessment', 'Skills and competency evaluations', '#06B6D4', 'Target', 6),
('Equipment', 'Equipment checkout and responsibility', '#84CC16', 'Package', 7),
('Timesheets', 'Timesheet templates and submissions', '#F97316', 'Clock', 8)
ON CONFLICT (name) DO NOTHING;

-- Insert default email templates
INSERT INTO email_templates (name, category, subject, html_body, text_body, variables, is_system_template) VALUES
('document_assignment', 'document_management', 'New Document Assignment - {{documentName}}', 
'<h2>New Document Assignment</h2><p>Hello {{userName}},</p><p>You have been assigned a new document to complete:</p><div style="background:#f5f5f5;padding:15px;border-radius:5px;margin:15px 0;"><strong>{{documentName}}</strong><br>Due Date: {{dueDate}}<br>Priority: {{priority}}</div><p>Please log in to complete this document.</p>',
'New Document Assignment\n\nHello {{userName}},\n\nYou have been assigned a new document to complete:\n\n{{documentName}}\nDue Date: {{dueDate}}\nPriority: {{priority}}\n\nPlease log in to complete this document.',
'{"userName": "User name", "documentName": "Document name", "dueDate": "Due date", "priority": "Priority level"}', true),

('document_reminder', 'document_management', 'Document Reminder - {{documentName}} Due Soon',
'<h2>Document Reminder</h2><p>Hello {{userName}},</p><p>This is a reminder that the following document is due soon:</p><div style="background:#fff3cd;padding:15px;border-radius:5px;margin:15px 0;"><strong>{{documentName}}</strong><br>Due Date: {{dueDate}}</div><p>Please complete it as soon as possible.</p>',
'Document Reminder\n\nHello {{userName}},\n\nThis is a reminder that the following document is due soon:\n\n{{documentName}}\nDue Date: {{dueDate}}\n\nPlease complete it as soon as possible.',
'{"userName": "User name", "documentName": "Document name", "dueDate": "Due date"}', true),

('document_approved', 'document_management', 'Document Approved - {{documentName}}',
'<h2>Document Approved</h2><p>Hello {{userName}},</p><p>Your document has been approved:</p><div style="background:#d1edff;padding:15px;border-radius:5px;margin:15px 0;"><strong>{{documentName}}</strong><br>Approved by: {{reviewerName}}<br>Approved on: {{approvalDate}}</div>{{#comments}}<p>Comments: {{comments}}</p>{{/comments}}',
'Document Approved\n\nHello {{userName}},\n\nYour document has been approved:\n\n{{documentName}}\nApproved by: {{reviewerName}}\nApproved on: {{approvalDate}}\n\nComments: {{comments}}',
'{"userName": "User name", "documentName": "Document name", "reviewerName": "Reviewer name", "approvalDate": "Approval date", "comments": "Reviewer comments"}', true),

('document_rejected', 'document_management', 'Document Requires Revision - {{documentName}}',
'<h2>Document Requires Revision</h2><p>Hello {{userName}},</p><p>Your document submission requires revision:</p><div style="background:#fee2e2;padding:15px;border-radius:5px;margin:15px 0;"><strong>{{documentName}}</strong><br>Reviewed by: {{reviewerName}}<br>Reviewed on: {{reviewDate}}</div><p>Comments: {{comments}}</p><p>Please make the necessary changes and resubmit.</p>',
'Document Requires Revision\n\nHello {{userName}},\n\nYour document submission requires revision:\n\n{{documentName}}\nReviewed by: {{reviewerName}}\nReviewed on: {{reviewDate}}\n\nComments: {{comments}}\n\nPlease make the necessary changes and resubmit.',
'{"userName": "User name", "documentName": "Document name", "reviewerName": "Reviewer name", "reviewDate": "Review date", "comments": "Reviewer comments"}', true)
ON CONFLICT (name) DO NOTHING;
