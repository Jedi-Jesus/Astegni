-- Migration: Add scheduling fields to tutoring_sessions table
-- Run this with: psql -U astegni_user -d astegni_db -f add_session_fields.sql

-- Add session_frequency column
ALTER TABLE tutoring_sessions
ADD COLUMN IF NOT EXISTS session_frequency VARCHAR(50);

UPDATE tutoring_sessions
SET session_frequency = 'one-time'
WHERE session_frequency IS NULL;

-- Add is_recurring column
ALTER TABLE tutoring_sessions
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN;

UPDATE tutoring_sessions
SET is_recurring = FALSE
WHERE is_recurring IS NULL;

-- Add recurring_pattern column (JSON)
ALTER TABLE tutoring_sessions
ADD COLUMN IF NOT EXISTS recurring_pattern JSON;

-- Add package_duration column
ALTER TABLE tutoring_sessions
ADD COLUMN IF NOT EXISTS package_duration INTEGER;

-- Add grade_level column
ALTER TABLE tutoring_sessions
ADD COLUMN IF NOT EXISTS grade_level VARCHAR(50);

-- Add comments
COMMENT ON COLUMN tutoring_sessions.session_frequency IS
'Frequency of the session: one-time, weekly, bi-weekly, monthly';

COMMENT ON COLUMN tutoring_sessions.is_recurring IS
'Whether this session is part of a recurring schedule';

COMMENT ON COLUMN tutoring_sessions.recurring_pattern IS
'JSON pattern for recurring sessions: {days: [], months: [], specific_dates: []}';

COMMENT ON COLUMN tutoring_sessions.package_duration IS
'Duration in weeks/months if this session is part of a package enrollment';

COMMENT ON COLUMN tutoring_sessions.grade_level IS
'Grade level of the student for this tutoring session';

-- Display results
SELECT 'Migration completed successfully!' AS status;
