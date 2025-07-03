-- Add worker requirements table to store individual role requirements per shift
CREATE TABLE IF NOT EXISTS worker_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    role_code VARCHAR(10) NOT NULL CHECK (role_code IN ('CC', 'SH', 'FO', 'RFO', 'RG', 'GL')),
    required_count INTEGER NOT NULL DEFAULT 0 CHECK (required_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shift_id, role_code)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_worker_requirements_shift ON worker_requirements(shift_id);
CREATE INDEX IF NOT EXISTS idx_worker_requirements_role ON worker_requirements(role_code);

-- Create trigger for updated_at column
CREATE TRIGGER update_worker_requirements_updated_at 
    BEFORE UPDATE ON worker_requirements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing data: create default worker requirements for existing shifts
INSERT INTO worker_requirements (shift_id, role_code, required_count)
SELECT 
    s.id as shift_id,
    role_code,
    CASE 
        WHEN role_code = 'CC' THEN 1
        WHEN role_code = 'SH' THEN GREATEST(0, COALESCE(s.requested_workers, 1) - 1)
        ELSE 0
    END as required_count
FROM shifts s
CROSS JOIN (VALUES ('CC'), ('SH'), ('FO'), ('RFO'), ('RG'), ('GL')) AS roles(role_code)
ON CONFLICT (shift_id, role_code) DO NOTHING;
