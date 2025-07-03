-- Add is_active column to time_entries table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_entries' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE time_entries ADD COLUMN is_active BOOLEAN DEFAULT false;
        COMMENT ON COLUMN time_entries.is_active IS 'true if currently clocked in';
    END IF;
END $$;
