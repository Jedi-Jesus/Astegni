-- Fix grade_level column type in tutor_packages
-- Convert VARCHAR to TEXT[] (array)

-- First, add a temporary column
ALTER TABLE tutor_packages ADD COLUMN IF NOT EXISTS grade_level_array TEXT[];

-- Convert existing VARCHAR data to array format
-- Handle various formats: 'Grade 10', 'Grade 10, Grade 11', etc.
UPDATE tutor_packages
SET grade_level_array =
    CASE
        WHEN grade_level IS NULL OR grade_level = '' THEN NULL
        WHEN grade_level LIKE '%,%' THEN string_to_array(grade_level, ',')
        ELSE ARRAY[grade_level]
    END
WHERE grade_level_array IS NULL;

-- Drop the old VARCHAR column
ALTER TABLE tutor_packages DROP COLUMN IF EXISTS grade_level;

-- Rename the array column to grade_level
ALTER TABLE tutor_packages RENAME COLUMN grade_level_array TO grade_level;

-- Verify the change
SELECT tutor_id, package_name, grade_level
FROM tutor_packages
LIMIT 5;
