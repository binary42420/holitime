-- Consolidated Schema for Holitime

-- Drop existing tables in reverse dependency order to ensure a clean slate
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS crew_chief_permissions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS worker_requirements CASCADE;
DROP TABLE IF EXISTS assigned_personnel CASCADE;
DROP TABLE IF EXISTS timesheets CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;


-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (consolidated for all user types)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Employee', 'Crew Chief', 'Manager/Admin', 'Client')),
    avatar VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    -- Employee-specific fields
    certifications TEXT[],
    performance DECIMAL(3,2) DEFAULT 0.0 CHECK (performance >= 0.0 AND performance <= 5.0),
    location VARCHAR(255),
    crew_chief_eligible BOOLEAN DEFAULT false,
    fork_operator_eligible BOOLEAN DEFAULT false,
    -- Client-specific fields
    client_company_id UUID, -- This will be a foreign key to the new clients table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Clients table (for client companies)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT,
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key from users to clients
ALTER TABLE users ADD CONSTRAINT fk_users_client_company FOREIGN KEY (client_company_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shifts table
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    crew_chief_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255),
    requested_workers INTEGER, -- Added missing column
    status VARCHAR(50) DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'In Progress', 'Completed', 'Cancelled', 'Pending Approval', 'Pending Client Approval')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Worker Requirements table
CREATE TABLE worker_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    role_code VARCHAR(10) NOT NULL CHECK (role_code IN ('CC', 'SH', 'FO', 'RFO', 'RG', 'GL')),
    required_count INTEGER NOT NULL DEFAULT 0 CHECK (required_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shift_id, role_code)
);

-- Assigned Personnel table
CREATE TABLE assigned_personnel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_on_shift VARCHAR(255),
    role_code VARCHAR(10) CHECK (role_code IN ('CC', 'SH', 'FO', 'RFO', 'RG', 'GL')),
    status VARCHAR(50) DEFAULT 'Clocked Out' CHECK (status IN ('Clocked Out', 'Clocked In', 'On Break', 'Shift Ended')),
    is_placeholder BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shift_id, employee_id)
);

-- Time Entries table
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assigned_personnel_id UUID NOT NULL REFERENCES assigned_personnel(id) ON DELETE CASCADE,
    entry_number INTEGER NOT NULL DEFAULT 1,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assigned_personnel_id, entry_number)
);

-- Timesheets table (final correct version)
CREATE TABLE timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_client_approval', 'pending_final_approval', 'completed', 'rejected')),
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    client_approved_by UUID REFERENCES users(id),
    client_approved_at TIMESTAMP WITH TIME ZONE,
    client_signature TEXT,
    manager_approved_by UUID REFERENCES users(id),
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    manager_signature TEXT,
    rejection_reason TEXT,
    pdf_file_path VARCHAR(500),
    pdf_generated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL CHECK (type IN ('Contract', 'Certification', 'Insurance', 'Training Record', 'Tax Form', 'Policy')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('Employee', 'Client', 'Company')),
    upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
    url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'Pending Submission' CHECK (status IN ('Pending Submission', 'Submitted', 'Approved', 'Rejected')),
    assignee_id UUID REFERENCES users(id),
    is_template BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements table
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crew Chief Permissions table
CREATE TABLE crew_chief_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_type VARCHAR(20) NOT NULL CHECK (permission_type IN ('client', 'job', 'shift')),
    target_id UUID NOT NULL,
    granted_by_user_id UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, permission_type, target_id, revoked_at)
);

-- Audit Log table
CREATE TABLE audit_log (
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

-- Notifications table
CREATE TABLE notifications (
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

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_client_company ON users(client_company_id);
CREATE INDEX idx_users_crew_chief_eligible ON users(crew_chief_eligible);
CREATE INDEX idx_clients_company_name ON clients(company_name);
CREATE INDEX idx_jobs_client_id ON jobs(client_id);
CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_shifts_crew_chief ON shifts(crew_chief_id);
CREATE INDEX idx_worker_requirements_shift ON worker_requirements(shift_id);
CREATE INDEX idx_assigned_personnel_shift ON assigned_personnel(shift_id);
CREATE INDEX idx_assigned_personnel_employee ON assigned_personnel(employee_id);
CREATE INDEX idx_time_entries_assigned_personnel ON time_entries(assigned_personnel_id);
CREATE INDEX idx_timesheets_shift ON timesheets(shift_id);
CREATE INDEX idx_documents_assignee ON documents(assignee_id);
CREATE INDEX idx_announcements_date ON announcements(date);
CREATE INDEX idx_crew_chief_permissions_user_id ON crew_chief_permissions(user_id);
CREATE INDEX idx_crew_chief_permissions_target ON crew_chief_permissions(permission_type, target_id);
CREATE INDEX idx_audit_log_performed_by ON audit_log(performed_by);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_worker_requirements_updated_at BEFORE UPDATE ON worker_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assigned_personnel_updated_at BEFORE UPDATE ON assigned_personnel FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON timesheets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
