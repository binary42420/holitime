-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_announcements_date ON announcements(date);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);

-- Insert some sample announcements
INSERT INTO announcements (title, content, created_by) 
SELECT 
  'Welcome to Holitime',
  'Welcome to the new timecard and shift management system. Please familiarize yourself with the new features.',
  u.id
FROM users u 
WHERE u.role = 'Manager/Admin' 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO announcements (title, content, created_by) 
SELECT 
  'System Update',
  'The timesheet management system has been updated with new features including PDF generation and digital approval workflow.',
  u.id
FROM users u 
WHERE u.role = 'Manager/Admin' 
LIMIT 1
ON CONFLICT DO NOTHING;
