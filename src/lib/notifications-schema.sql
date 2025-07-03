-- Notification System and User Profiles Database Schema
-- This file contains the database schema for notifications and enhanced user profiles

-- User Profiles Table (Enhanced user information)
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL, -- References users.id
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    date_of_birth DATE,
    hire_date DATE,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(100),
    profile_picture_url VARCHAR(500),
    bio TEXT,
    skills TEXT[], -- Array of skills
    languages TEXT[], -- Array of languages spoken
    availability_notes TEXT,
    preferred_shift_types TEXT[], -- Array of preferred shift types
    transportation_method VARCHAR(100),
    has_own_tools BOOLEAN DEFAULT false,
    safety_certifications TEXT[], -- Array of safety certifications
    work_authorization_status VARCHAR(50),
    tax_id_last_four VARCHAR(4),
    bank_account_last_four VARCHAR(4),
    notification_preferences JSONB DEFAULT '{}', -- JSON for notification settings
    privacy_settings JSONB DEFAULT '{}', -- JSON for privacy settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- References users.id
    type VARCHAR(50) NOT NULL, -- 'shift_assignment', 'document_reminder', 'system_message', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data specific to notification type
    is_read BOOLEAN DEFAULT false,
    is_email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP,
    action_url VARCHAR(500), -- URL for action buttons
    action_text VARCHAR(100), -- Text for action button
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    expires_at TIMESTAMP, -- When notification expires
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Responses Table (For shift confirmations, etc.)
CREATE TABLE IF NOT EXISTS notification_responses (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL, -- References users.id
    response_type VARCHAR(50) NOT NULL, -- 'accept', 'decline', 'maybe', 'acknowledged'
    response_data JSONB, -- Additional response data
    response_message TEXT, -- Optional message from user
    responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Shift Assignment Notifications Table (Specific to shift assignments)
CREATE TABLE IF NOT EXISTS shift_assignment_notifications (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    shift_id INTEGER NOT NULL, -- References shifts.id
    assigned_by VARCHAR(255) NOT NULL, -- References users.id (who assigned)
    assignment_type VARCHAR(50) DEFAULT 'direct', -- 'direct', 'invitation', 'replacement'
    response_deadline TIMESTAMP,
    auto_accept_after TIMESTAMP, -- Auto-accept if no response by this time
    requires_confirmation BOOLEAN DEFAULT true,
    confirmation_token VARCHAR(255) UNIQUE, -- For email confirmation links
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Templates Table (Enhanced)
CREATE TABLE IF NOT EXISTS email_templates_enhanced (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    subject VARCHAR(500) NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT,
    template_type VARCHAR(50) NOT NULL, -- 'shift_assignment', 'document_reminder', etc.
    variables JSONB, -- Available template variables
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- System templates cannot be deleted
    created_by VARCHAR(255), -- References users.id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Queue Table (For reliable email delivery)
CREATE TABLE IF NOT EXISTS email_queue (
    id SERIAL PRIMARY KEY,
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    from_email VARCHAR(255),
    from_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    html_body TEXT,
    text_body TEXT,
    template_id INTEGER REFERENCES email_templates_enhanced(id),
    template_variables JSONB,
    priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
    max_attempts INTEGER DEFAULT 3,
    attempts INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'failed', 'cancelled'
    error_message TEXT,
    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL, -- References users.id
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    shift_assignments BOOLEAN DEFAULT true,
    shift_reminders BOOLEAN DEFAULT true,
    document_reminders BOOLEAN DEFAULT true,
    system_messages BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    quiet_hours_start TIME, -- Start of quiet hours (no notifications)
    quiet_hours_end TIME, -- End of quiet hours
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

CREATE INDEX IF NOT EXISTS idx_notification_responses_notification_id ON notification_responses(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_responses_user_id ON notification_responses(user_id);

CREATE INDEX IF NOT EXISTS idx_shift_assignment_notifications_shift_id ON shift_assignment_notifications(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignment_notifications_confirmation_token ON shift_assignment_notifications(confirmation_token);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_for ON email_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Triggers for Updated At Timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_enhanced_updated_at BEFORE UPDATE ON email_templates_enhanced FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_queue_updated_at BEFORE UPDATE ON email_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert Default Email Templates
INSERT INTO email_templates_enhanced (name, subject, html_body, text_body, template_type, variables, is_system) VALUES
('shift_assignment', 'New Shift Assignment - {{shiftDate}}', 
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>New Shift Assignment</h2>
  <p>Hello {{workerName}},</p>
  <p>You have been assigned to a new shift:</p>
  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
    <strong>{{jobName}}</strong><br>
    Client: {{clientName}}<br>
    Date: {{shiftDate}}<br>
    Time: {{shiftTime}}<br>
    Location: {{location}}<br>
    Role: {{role}}
  </div>
  <p>Please confirm your availability:</p>
  <div style="text-align: center; margin: 20px 0;">
    <a href="{{acceptUrl}}" style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 0 10px;">Accept Shift</a>
    <a href="{{declineUrl}}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 0 10px;">Decline Shift</a>
  </div>
  <p>Please respond by {{responseDeadline}}.</p>
  <hr>
  <p><small>HoliTime Workforce Management System</small></p>
</div>', 
'New Shift Assignment\n\nHello {{workerName}},\n\nYou have been assigned to a new shift:\n\n{{jobName}}\nClient: {{clientName}}\nDate: {{shiftDate}}\nTime: {{shiftTime}}\nLocation: {{location}}\nRole: {{role}}\n\nPlease confirm your availability by visiting: {{confirmUrl}}\n\nPlease respond by {{responseDeadline}}.\n\nHoliTime Workforce Management System', 
'shift_assignment', 
'{"workerName": "Worker name", "jobName": "Job name", "clientName": "Client name", "shiftDate": "Shift date", "shiftTime": "Shift time", "location": "Location", "role": "Role", "acceptUrl": "Accept URL", "declineUrl": "Decline URL", "confirmUrl": "Confirm URL", "responseDeadline": "Response deadline"}', 
true),

('shift_reminder', 'Shift Reminder - Tomorrow at {{shiftTime}}', 
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Shift Reminder</h2>
  <p>Hello {{workerName}},</p>
  <p>This is a reminder about your upcoming shift:</p>
  <div style="background: #dbeafe; padding: 15px; border-radius: 5px; margin: 15px 0;">
    <strong>{{jobName}}</strong><br>
    Client: {{clientName}}<br>
    Date: {{shiftDate}}<br>
    Time: {{shiftTime}}<br>
    Location: {{location}}<br>
    Role: {{role}}
  </div>
  <p>Please arrive on time and bring any required equipment.</p>
  <hr>
  <p><small>HoliTime Workforce Management System</small></p>
</div>', 
'Shift Reminder\n\nHello {{workerName}},\n\nThis is a reminder about your upcoming shift:\n\n{{jobName}}\nClient: {{clientName}}\nDate: {{shiftDate}}\nTime: {{shiftTime}}\nLocation: {{location}}\nRole: {{role}}\n\nPlease arrive on time and bring any required equipment.\n\nHoliTime Workforce Management System', 
'shift_reminder', 
'{"workerName": "Worker name", "jobName": "Job name", "clientName": "Client name", "shiftDate": "Shift date", "shiftTime": "Shift time", "location": "Location", "role": "Role"}', 
true),

('notification_digest', 'Daily Notification Summary', 
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Daily Notification Summary</h2>
  <p>Hello {{userName}},</p>
  <p>Here are your notifications for today:</p>
  {{#notifications}}
  <div style="background: #f9fafb; padding: 10px; border-left: 4px solid #3b82f6; margin: 10px 0;">
    <strong>{{title}}</strong><br>
    {{message}}
  </div>
  {{/notifications}}
  <p><a href="{{dashboardUrl}}">View all notifications in your dashboard</a></p>
  <hr>
  <p><small>HoliTime Workforce Management System</small></p>
</div>', 
'Daily Notification Summary\n\nHello {{userName}},\n\nHere are your notifications for today:\n\n{{notificationsList}}\n\nView all notifications in your dashboard: {{dashboardUrl}}\n\nHoliTime Workforce Management System', 
'notification_digest', 
'{"userName": "User name", "notifications": "Notifications array", "notificationsList": "Notifications list", "dashboardUrl": "Dashboard URL"}', 
true)
ON CONFLICT (name) DO NOTHING;

-- Insert Default Notification Preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM notification_preferences WHERE user_id = users.id
);
