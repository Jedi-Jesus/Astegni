"""
Database Migration: Restructure Student Profile System
- Restructure student_profiles table with new fields
- Create student_overall_progress table for academic tracking
- Create student_guardian table for guardian information
- Create student_courses table for enrolled courses
"""

import psycopg
from psycopg.rows import dict_row
import os
import sys
from dotenv import load_dotenv

# Fix Unicode encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    """Execute the migration"""
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            print("🔄 Starting student profile system restructuring...")

            # Step 1: Create student_overall_progress table
            print("\n📊 Creating student_overall_progress table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS student_overall_progress (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    strong_subjects TEXT[] DEFAULT '{}',
                    weak_subjects TEXT[] DEFAULT '{}',
                    academic_goals TEXT[] DEFAULT '{}',
                    current_gpa DECIMAL(3,2),
                    target_gpa DECIMAL(3,2),
                    attendance_rate DECIMAL(5,2) DEFAULT 0.00,
                    total_study_hours DECIMAL(10,2) DEFAULT 0.00,
                    assignments_completed INTEGER DEFAULT 0,
                    assignments_pending INTEGER DEFAULT 0,
                    quiz_average DECIMAL(5,2) DEFAULT 0.00,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(student_id)
                )
            """)
            print("✅ student_overall_progress table created")

            # Step 2: Create student_guardian table
            print("\n👨‍👩‍👧 Creating student_guardian table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS student_guardian (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    guardian_name VARCHAR(255) NOT NULL,
                    guardian_phone VARCHAR(50),
                    guardian_email VARCHAR(255),
                    guardian_relationship VARCHAR(100),
                    is_primary BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("✅ student_guardian table created")

            # Step 3: Create student_courses table
            print("\n📚 Creating student_courses table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS student_courses (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    tutor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    course_name VARCHAR(255) NOT NULL,
                    course_subject VARCHAR(100),
                    session_title VARCHAR(255),
                    session_time TIMESTAMP,
                    total_sessions INTEGER DEFAULT 0,
                    completed_sessions INTEGER DEFAULT 0,
                    status VARCHAR(50) DEFAULT 'active',
                    progress DECIMAL(5,2) DEFAULT 0.00,
                    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_session_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("✅ student_courses table created")

            # Step 4: Backup existing student_profiles data
            print("\n💾 Backing up existing student_profiles data...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS student_profiles_backup_20251114 AS
                SELECT * FROM student_profiles
            """)
            print("✅ Backup created as student_profiles_backup_20251114")

            # Step 5: Migrate guardian data if exists
            print("\n🔄 Migrating guardian data...")
            cur.execute("""
                INSERT INTO student_guardian (student_id, guardian_name, guardian_phone, guardian_email, guardian_relationship, is_primary)
                SELECT user_id, guardian_name, guardian_phone, guardian_email, guardian_relationship, true
                FROM student_profiles
                WHERE guardian_name IS NOT NULL AND guardian_name != ''
                ON CONFLICT DO NOTHING
            """)
            print("✅ Guardian data migrated")

            # Step 6: Migrate academic progress data if exists
            print("\n🔄 Migrating academic progress data...")
            # Handle JSON to TEXT[] conversion
            cur.execute("""
                INSERT INTO student_overall_progress (
                    student_id, strong_subjects, weak_subjects, academic_goals,
                    current_gpa, target_gpa, attendance_rate
                )
                SELECT
                    user_id,
                    CASE
                        WHEN strong_subjects IS NULL THEN '{}'::TEXT[]
                        WHEN jsonb_typeof(strong_subjects::jsonb) = 'array' THEN
                            ARRAY(SELECT jsonb_array_elements_text(strong_subjects::jsonb))
                        ELSE '{}'::TEXT[]
                    END,
                    CASE
                        WHEN weak_subjects IS NULL THEN '{}'::TEXT[]
                        WHEN jsonb_typeof(weak_subjects::jsonb) = 'array' THEN
                            ARRAY(SELECT jsonb_array_elements_text(weak_subjects::jsonb))
                        ELSE '{}'::TEXT[]
                    END,
                    CASE
                        WHEN academic_goals IS NULL THEN '{}'::TEXT[]
                        WHEN academic_goals = '' THEN '{}'::TEXT[]
                        ELSE ARRAY[academic_goals]
                    END,
                    current_gpa,
                    target_gpa,
                    COALESCE(attendance_rate, 0.00)
                FROM student_profiles
                WHERE user_id IS NOT NULL
                ON CONFLICT (student_id) DO NOTHING
            """)
            print("✅ Academic progress data migrated")

            # Step 7: Restructure student_profiles table
            print("\n🔨 Restructuring student_profiles table...")

            # Drop old columns and rename existing ones
            columns_to_drop = [
                'date_of_birth', 'school_address', 'weak_subjects', 'strong_subjects',
                'preferred_session_time', 'preferred_learning_mode', 'academic_goals',
                'current_gpa', 'target_gpa', 'guardian_name', 'guardian_phone',
                'guardian_email', 'guardian_relationship', 'total_sessions',
                'total_hours', 'courses_enrolled', 'is_active', 'profile_complete',
                'profile_completion', 'rating', 'rating_count', 'gpa',
                'attendance_rate', 'total_connections'
            ]

            for column in columns_to_drop:
                try:
                    cur.execute(f"""
                        ALTER TABLE student_profiles
                        DROP COLUMN IF EXISTS {column} CASCADE
                    """)
                    print(f"  ✓ Dropped column: {column}")
                except Exception as e:
                    print(f"  ⚠️ Could not drop {column}: {str(e)}")

            # Rename and convert existing columns
            print("\n🔄 Renaming and converting columns...")

            # First, check if columns exist and need conversion
            json_to_array_columns = [
                ('subjects', 'interested_in'),
                ('interests', 'hobbies'),
                ('preferred_languages', 'languages')
            ]

            for old_name, new_name in json_to_array_columns:
                try:
                    # Check if old column exists
                    cur.execute(f"""
                        SELECT column_name, data_type
                        FROM information_schema.columns
                        WHERE table_name = 'student_profiles' AND column_name = '{old_name}'
                    """)
                    col_info = cur.fetchone()

                    if col_info:
                        # Add new TEXT[] column
                        cur.execute(f"""
                            ALTER TABLE student_profiles
                            ADD COLUMN IF NOT EXISTS {new_name} TEXT[] DEFAULT '{{}}'
                        """)

                        # Convert JSON to TEXT[] and copy data
                        if col_info['data_type'] == 'json':
                            cur.execute(f"""
                                UPDATE student_profiles
                                SET {new_name} = CASE
                                    WHEN {old_name} IS NULL THEN '{{}}'::TEXT[]
                                    WHEN jsonb_typeof({old_name}::jsonb) = 'array' THEN
                                        ARRAY(SELECT jsonb_array_elements_text({old_name}::jsonb))
                                    ELSE '{{}}'::TEXT[]
                                END
                            """)
                        else:
                            # Rename if not JSON
                            cur.execute(f"""
                                UPDATE student_profiles
                                SET {new_name} = COALESCE({old_name}, '{{}}'::TEXT[])
                            """)

                        # Drop old column
                        cur.execute(f"""
                            ALTER TABLE student_profiles
                            DROP COLUMN IF EXISTS {old_name} CASCADE
                        """)

                        print(f"  ✓ Converted and renamed {old_name} → {new_name}")
                    else:
                        # Just add the new column
                        cur.execute(f"""
                            ALTER TABLE student_profiles
                            ADD COLUMN IF NOT EXISTS {new_name} TEXT[] DEFAULT '{{}}'
                        """)
                        print(f"  ✓ Added new column {new_name}")
                except Exception as e:
                    print(f"  ⚠️ Could not convert {old_name}: {str(e)}")

            # Handle learning_style/learning_method specially (convert to array)
            try:
                cur.execute("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = 'student_profiles' AND column_name = 'learning_style'
                """)
                ls_col = cur.fetchone()

                if ls_col:
                    # Add new TEXT[] column
                    cur.execute("""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS learning_method TEXT[] DEFAULT '{}'
                    """)

                    # Convert single value to array
                    cur.execute("""
                        UPDATE student_profiles
                        SET learning_method = CASE
                            WHEN learning_style IS NULL OR learning_style = '' THEN '{}'::TEXT[]
                            ELSE ARRAY[learning_style]
                        END
                    """)

                    # Drop old column
                    cur.execute("""
                        ALTER TABLE student_profiles
                        DROP COLUMN IF EXISTS learning_style CASCADE
                    """)

                    print(f"  ✓ Converted learning_style → learning_method (as array)")
                else:
                    # Just add the new column
                    cur.execute("""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS learning_method TEXT[] DEFAULT '{}'
                    """)
                    print(f"  ✓ Added new column learning_method")
            except Exception as e:
                print(f"  ⚠️ Could not convert learning_style: {str(e)}")

            # Rename simple text columns
            simple_renames = [
                ('school_name', 'studying_at')
            ]

            for old_name, new_name in simple_renames:
                try:
                    cur.execute(f"""
                        ALTER TABLE student_profiles
                        RENAME COLUMN {old_name} TO {new_name}
                    """)
                    print(f"  ✓ Renamed {old_name} → {new_name}")
                except Exception as e:
                    print(f"  ⚠️ Could not rename {old_name}: {str(e)}")

            # Add new columns
            print("\n➕ Adding new columns...")
            new_columns = [
                ('hero_title', 'TEXT[] DEFAULT \'{}\''),
                ('hero_subtitle', 'TEXT[] DEFAULT \'{}\''),
                ('email', 'VARCHAR(255)'),
                ('phone', 'VARCHAR(50)'),
                ('username', 'VARCHAR(100) UNIQUE'),
                ('gender', 'VARCHAR(50)'),
                ('location', 'VARCHAR(255)'),
                ('quote', 'TEXT[] DEFAULT \'{}\''),
                ('about', 'TEXT')
            ]

            for col_name, col_type in new_columns:
                try:
                    cur.execute(f"""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS {col_name} {col_type}
                    """)
                    print(f"  ✓ Added column: {col_name}")
                except Exception as e:
                    print(f"  ⚠️ Could not add {col_name}: {str(e)}")

            # Ensure array columns are properly typed
            print("\n🔄 Ensuring array columns are properly typed...")
            array_columns = ['hero_title', 'hero_subtitle', 'interested_in', 'hobbies', 'languages', 'quote']
            for col in array_columns:
                try:
                    cur.execute(f"""
                        ALTER TABLE student_profiles
                        ALTER COLUMN {col} TYPE TEXT[] USING {col}::TEXT[]
                    """)
                    cur.execute(f"""
                        ALTER TABLE student_profiles
                        ALTER COLUMN {col} SET DEFAULT '{{}}'
                    """)
                    print(f"  ✓ Set {col} as TEXT[] array")
                except Exception as e:
                    print(f"  ⚠️ Could not set {col} type: {str(e)}")

            # Create indexes for better performance
            print("\n🚀 Creating indexes...")
            indexes = [
                ('idx_student_profiles_user_id', 'student_profiles', 'user_id'),
                ('idx_student_profiles_username', 'student_profiles', 'username'),
                ('idx_student_overall_progress_student_id', 'student_overall_progress', 'student_id'),
                ('idx_student_guardian_student_id', 'student_guardian', 'student_id'),
                ('idx_student_courses_student_id', 'student_courses', 'student_id'),
                ('idx_student_courses_tutor_id', 'student_courses', 'tutor_id'),
                ('idx_student_courses_status', 'student_courses', 'status')
            ]

            for idx_name, table_name, column_name in indexes:
                try:
                    cur.execute(f"""
                        CREATE INDEX IF NOT EXISTS {idx_name}
                        ON {table_name} ({column_name})
                    """)
                    print(f"  ✓ Created index: {idx_name}")
                except Exception as e:
                    print(f"  ⚠️ Could not create index {idx_name}: {str(e)}")

            conn.commit()

            print("\n" + "="*60)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
            print("="*60)
            print("\n📋 Summary:")
            print("  ✓ Created student_overall_progress table")
            print("  ✓ Created student_guardian table")
            print("  ✓ Created student_courses table")
            print("  ✓ Backup created: student_profiles_backup_20251114")
            print("  ✓ Restructured student_profiles table")
            print("  ✓ Migrated existing data")
            print("  ✓ Created performance indexes")
            print("\n📝 Next Steps:")
            print("  1. Verify data migration: SELECT * FROM student_profiles LIMIT 5;")
            print("  2. Check new tables: SELECT * FROM student_overall_progress;")
            print("  3. Update backend API endpoints")
            print("  4. Update frontend forms and displays")
            print("\n⚠️  Backup table available: student_profiles_backup_20251114")
            print("="*60 + "\n")

if __name__ == '__main__':
    try:
        migrate()
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
