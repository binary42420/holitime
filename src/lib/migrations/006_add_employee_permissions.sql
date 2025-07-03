-- Add employee permission columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS crew_chief_eligible BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fork_operator_eligible BOOLEAN DEFAULT false;

-- Update existing crew chiefs to be eligible for crew chief role
UPDATE users 
SET crew_chief_eligible = true 
WHERE role = 'Crew Chief' OR role = 'Manager/Admin';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_crew_chief_eligible ON users(crew_chief_eligible);
CREATE INDEX IF NOT EXISTS idx_users_fork_operator_eligible ON users(fork_operator_eligible);

-- Add comments for documentation
COMMENT ON COLUMN users.crew_chief_eligible IS 'Whether this user is eligible to be assigned as a crew chief on shifts';
COMMENT ON COLUMN users.fork_operator_eligible IS 'Whether this user is eligible to be assigned as a fork operator on shifts';
