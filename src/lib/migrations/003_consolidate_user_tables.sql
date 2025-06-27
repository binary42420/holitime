-- Migration to consolidate employees, clients, and users tables into a single users table
-- This eliminates redundancy and simplifies the schema

-- Step 1: Add new columns to existing users table for employee and client data
ALTER TABLE users ADD COLUMN IF NOT EXISTS certifications TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS performance DECIMAL(3,2) DEFAULT 0.0 CHECK (performance >= 0.0 AND performance <= 5.0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

-- Step 2: Migrate employee data into users table
UPDATE users
SET
    certifications = e.certifications,
    performance = e.performance,
    location = e.location
FROM employees e
WHERE users.id = e.user_id;

-- Step 3: Migrate client data into users table
UPDATE users
SET
    company_name = c.name,
    company_address = c.address,
    contact_person = c.contact_person,
    contact_email = c.contact_email,
    contact_phone = c.contact_phone
FROM clients c
JOIN client_user_links cul ON c.id = cul.client_id
WHERE users.id = cul.user_id;

-- Step 4: Create mapping table to preserve relationships
CREATE TABLE temp_client_mapping (
    old_client_id UUID,
    new_user_id UUID
);

INSERT INTO temp_client_mapping (old_client_id, new_user_id)
SELECT c.id, cul.user_id
FROM clients c
JOIN client_user_links cul ON c.id = cul.client_id;

-- Step 5: Update jobs table to reference users instead of clients
ALTER TABLE jobs ADD COLUMN client_user_id UUID;

UPDATE jobs
SET client_user_id = tcm.new_user_id
FROM temp_client_mapping tcm
WHERE jobs.client_id = tcm.old_client_id;

-- Drop old client_id constraint and column, rename new one
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_client_id_fkey;
ALTER TABLE jobs DROP COLUMN client_id;
ALTER TABLE jobs RENAME COLUMN client_user_id TO client_id;
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_client_id FOREIGN KEY (client_id) REFERENCES users(id);

-- Step 6: Update assigned_personnel to reference users directly
-- The employee_id in assigned_personnel should already reference users.id based on the employees.user_id
-- But we need to update it to reference users directly instead of through employees table

-- Create temporary column
ALTER TABLE assigned_personnel ADD COLUMN user_id UUID;

-- Update with user_id from employees table
UPDATE assigned_personnel
SET user_id = e.user_id
FROM employees e
WHERE assigned_personnel.employee_id = e.id;

-- Drop old constraint and column, rename new one
ALTER TABLE assigned_personnel DROP CONSTRAINT IF EXISTS assigned_personnel_employee_id_fkey;
ALTER TABLE assigned_personnel DROP COLUMN employee_id;
ALTER TABLE assigned_personnel RENAME COLUMN user_id TO employee_id;
ALTER TABLE assigned_personnel ADD CONSTRAINT fk_assigned_personnel_employee_id FOREIGN KEY (employee_id) REFERENCES users(id);

-- Step 7: Drop old tables
DROP TABLE IF EXISTS client_user_links CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Clean up temporary table
DROP TABLE temp_client_mapping;

-- Step 8: Create new indexes
CREATE INDEX IF NOT EXISTS idx_users_company_name ON users(company_name);

-- Note: Other indexes and triggers already exist from the original users table
