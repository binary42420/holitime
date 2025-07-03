-- Migration 006: Add Company Logo Support
-- This migration adds logo_url field to the clients table to support company logos

-- Add logo_url field to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);

-- Add index for logo_url for better performance when querying
CREATE INDEX IF NOT EXISTS idx_clients_logo_url ON clients(logo_url);

-- Add comment to document the field
COMMENT ON COLUMN clients.logo_url IS 'URL or file path to the company logo image';
