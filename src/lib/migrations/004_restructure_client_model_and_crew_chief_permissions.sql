-- Migration 004: Restructure Client Data Model and Implement Crew Chief Permission System
-- This migration separates client companies from client contact persons and implements
-- a comprehensive crew chief permission system

-- PART 1: Create new clients table for client companies
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT,
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PART 2: Create crew chief permissions table
CREATE TABLE IF NOT EXISTS crew_chief_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_type VARCHAR(20) NOT NULL CHECK (permission_type IN ('client', 'job', 'shift')),
    target_id UUID NOT NULL, -- References clients.id, jobs.id, or shifts.id depending on permission_type
    granted_by_user_id UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, permission_type, target_id, revoked_at) -- Allow re-granting after revocation
);

-- PART 3: Add client_company_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_company_id UUID REFERENCES clients(id);

-- PART 4: Add crew chief eligibility fields to users table (if not already present)
ALTER TABLE users ADD COLUMN IF NOT EXISTS crew_chief_eligible BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fork_operator_eligible BOOLEAN DEFAULT false;

-- PART 5: Data Migration - Extract company data from users table and create client records
-- First, create client companies from existing client users
INSERT INTO clients (id, company_name, company_address, contact_phone, contact_email, notes)
SELECT 
    uuid_generate_v4() as id,
    COALESCE(company_name, name) as company_name,
    company_address,
    contact_phone,
    contact_email,
    'Migrated from user: ' || name as notes
FROM users 
WHERE role = 'Client' 
  AND COALESCE(company_name, name) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM clients c 
    WHERE c.company_name = COALESCE(users.company_name, users.name)
  );

-- PART 6: Update users table to reference client companies
-- Set client_company_id for existing client users
UPDATE users 
SET client_company_id = (
    SELECT c.id 
    FROM clients c 
    WHERE c.company_name = COALESCE(users.company_name, users.name)
    LIMIT 1
)
WHERE role = 'Client' AND client_company_id IS NULL;

-- PART 7: Update jobs table to reference client companies instead of users
-- First, add temporary column to store new client references
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS new_client_id UUID;

-- Update jobs to reference client companies
UPDATE jobs 
SET new_client_id = (
    SELECT u.client_company_id 
    FROM users u 
    WHERE u.id = jobs.client_id AND u.role = 'Client'
    LIMIT 1
)
WHERE new_client_id IS NULL;

-- Drop old foreign key constraint and rename columns
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_client_id_fkey;
ALTER TABLE jobs DROP COLUMN IF EXISTS client_id;
ALTER TABLE jobs RENAME COLUMN new_client_id TO client_id;

-- Add new foreign key constraint
ALTER TABLE jobs ADD CONSTRAINT jobs_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Make client_id NOT NULL
ALTER TABLE jobs ALTER COLUMN client_id SET NOT NULL;

-- PART 8: Update shifts table to ensure crew_chief_id is NOT NULL
-- First, let's see if we need to handle any NULL crew chiefs
-- For now, we'll add the constraint but allow existing NULLs to remain
-- The application logic will enforce this for new shifts

-- PART 9: Remove company fields from users table (after data migration)
-- We'll keep these for now to ensure data integrity, but they can be removed later
-- ALTER TABLE users DROP COLUMN IF EXISTS company_name;
-- ALTER TABLE users DROP COLUMN IF EXISTS company_address;
-- ALTER TABLE users DROP COLUMN IF EXISTS contact_person;
-- ALTER TABLE users DROP COLUMN IF EXISTS contact_email;
-- ALTER TABLE users DROP COLUMN IF EXISTS contact_phone;

-- PART 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_crew_chief_permissions_user_id ON crew_chief_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_chief_permissions_target ON crew_chief_permissions(permission_type, target_id);
CREATE INDEX IF NOT EXISTS idx_crew_chief_permissions_active ON crew_chief_permissions(user_id, permission_type, target_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_client_company ON users(client_company_id);
CREATE INDEX IF NOT EXISTS idx_users_crew_chief_eligible ON users(crew_chief_eligible) WHERE crew_chief_eligible = true;

-- PART 11: Add constraints to ensure data integrity
-- Note: PostgreSQL doesn't allow subqueries in check constraints
-- We'll enforce these constraints at the application level instead

-- Create a function to validate crew chief permissions (for future use)
CREATE OR REPLACE FUNCTION validate_crew_chief_permission()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user is an employee or crew chief (both can receive admin-granted permissions)
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id AND role IN ('Employee', 'Crew Chief')) THEN
        RAISE EXCEPTION 'Crew chief permissions can only be granted to employees and crew chiefs';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate crew chief permissions
DROP TRIGGER IF EXISTS trigger_validate_crew_chief_permission ON crew_chief_permissions;
CREATE TRIGGER trigger_validate_crew_chief_permission
    BEFORE INSERT OR UPDATE ON crew_chief_permissions
    FOR EACH ROW EXECUTE FUNCTION validate_crew_chief_permission();
