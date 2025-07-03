-- Add missing constraints and indexes to shifts table
ALTER TABLE shifts
  ADD CONSTRAINT shifts_time_check CHECK (start_time < end_time),
  ADD CONSTRAINT shifts_requested_workers_check CHECK (requested_workers > 0),
  ADD CONSTRAINT shifts_crew_chief_role_check 
    CHECK (crew_chief_id IS NULL OR 
           EXISTS (
             SELECT 1 FROM users 
             WHERE id = crew_chief_id AND role = 'Crew Chief'
           ));

-- Add missing indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_job_id ON shifts(job_id);
CREATE INDEX IF NOT EXISTS idx_shifts_crew_chief_id ON shifts(crew_chief_id);

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to shifts table
DROP TRIGGER IF EXISTS update_shifts_updated_at ON shifts;
CREATE TRIGGER update_shifts_updated_at
    BEFORE UPDATE ON shifts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger to assigned_personnel table
DROP TRIGGER IF EXISTS update_assigned_personnel_updated_at ON assigned_personnel;
CREATE TRIGGER update_assigned_personnel_updated_at
    BEFORE UPDATE ON assigned_personnel
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create materialized view for shift statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS shift_statistics AS
SELECT 
    s.job_id,
    j.name as job_name,
    COUNT(*) as total_shifts,
    COUNT(CASE WHEN s.status = 'Completed' THEN 1 END) as completed_shifts,
    AVG(EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time))/3600) as avg_shift_duration,
    COUNT(DISTINCT s.crew_chief_id) as unique_crew_chiefs,
    AVG(s.requested_workers) as avg_requested_workers
FROM shifts s
JOIN jobs j ON s.job_id = j.id
GROUP BY s.job_id, j.name
WITH DATA;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_statistics_job_id ON shift_statistics(job_id);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_shift_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY shift_statistics;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh materialized view when shifts table changes
CREATE OR REPLACE FUNCTION trigger_refresh_shift_statistics()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM refresh_shift_statistics();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_shift_statistics_trigger ON shifts;
CREATE TRIGGER refresh_shift_statistics_trigger
    AFTER INSERT OR UPDATE OR DELETE ON shifts
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_shift_statistics();

-- Add business hours validation function
CREATE OR REPLACE FUNCTION validate_shift_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- Example: Validate shifts are between 6 AM and 10 PM
    IF NEW.start_time < '06:00:00'::time OR NEW.end_time > '22:00:00'::time THEN
        RAISE EXCEPTION 'Shifts must be scheduled between 6 AM and 10 PM';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add business hours validation trigger
DROP TRIGGER IF EXISTS validate_shift_hours_trigger ON shifts;
CREATE TRIGGER validate_shift_hours_trigger
    BEFORE INSERT OR UPDATE ON shifts
    FOR EACH ROW
    EXECUTE FUNCTION validate_shift_hours();

-- Create view for shift assignments with role validation
CREATE OR REPLACE VIEW validated_shift_assignments AS
SELECT 
    ap.*,
    u.role as employee_role,
    CASE 
        WHEN ap.role_code = 'CC' AND u.role != 'Crew Chief' THEN false
        WHEN ap.role_code IN ('SH', 'FO', 'RFO', 'RG', 'GL') AND u.role != 'Employee' THEN false
        ELSE true
    END as is_valid_assignment
FROM assigned_personnel ap
JOIN users u ON ap.employee_id = u.id;

-- Add function to validate shift assignments
CREATE OR REPLACE FUNCTION validate_shift_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate employee role matches assignment role
    IF NEW.role_code = 'CC' AND NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = NEW.employee_id AND role = 'Crew Chief'
    ) THEN
        RAISE EXCEPTION 'Only Crew Chiefs can be assigned as CC';
    END IF;

    -- Validate employee is not double-booked
    IF EXISTS (
        SELECT 1 FROM shifts s1
        JOIN shifts s2 ON s1.date = s2.date
        JOIN assigned_personnel ap ON ap.shift_id = s1.id
        WHERE s2.id = NEW.shift_id
        AND ap.employee_id = NEW.employee_id
        AND (
            (s1.start_time, s1.end_time) OVERLAPS (s2.start_time, s2.end_time)
        )
    ) THEN
        RAISE EXCEPTION 'Employee is already assigned to another shift during this time';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add assignment validation trigger
DROP TRIGGER IF EXISTS validate_shift_assignment_trigger ON assigned_personnel;
CREATE TRIGGER validate_shift_assignment_trigger
    BEFORE INSERT OR UPDATE ON assigned_personnel
    FOR EACH ROW
    EXECUTE FUNCTION validate_shift_assignment();

-- Create indexes for shift queries optimization
CREATE INDEX IF NOT EXISTS idx_shifts_upcoming ON shifts(date, start_time)
WHERE status = 'Upcoming';

CREATE INDEX IF NOT EXISTS idx_shifts_date_range ON shifts(date, start_time, end_time);

-- Add partial index for active shifts
CREATE INDEX IF NOT EXISTS idx_shifts_active ON shifts(date, start_time, end_time)
WHERE status IN ('Upcoming', 'In Progress');

COMMENT ON TABLE shifts IS 'Stores shift information with validated time ranges and crew chief assignments';
COMMENT ON TABLE assigned_personnel IS 'Stores shift personnel assignments with role validation';
