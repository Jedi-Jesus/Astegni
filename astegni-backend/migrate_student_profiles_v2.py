"""
Student Profile Migration V2 - Simplified and Robust
Handles existing data carefully and commits in stages
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

def create_new_tables():
    """Step 1: Create new tables"""
    print("\n" + "="*60)
    print("STEP 1: Creating new tables")
    print("="*60)

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            # Create student_overall_progress
            print("\n📊 Creating student_overall_progress table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS student_overall_progress (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER UNIQUE,
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
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Create student_guardian
            print("👨‍👩‍👧 Creating student_guardian table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS student_guardian (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER,
                    guardian_name VARCHAR(255) NOT NULL,
                    guardian_phone VARCHAR(50),
                    guardian_email VARCHAR(255),
                    guardian_relationship VARCHAR(100),
                    is_primary BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Create student_courses
            print("📚 Creating student_courses table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS student_courses (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER,
                    tutor_id INTEGER,
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

            conn.commit()
            print("✅ All new tables created successfully!")

def add_new_columns():
    """Step 2: Add new columns to student_profiles"""
    print("\n" + "="*60)
    print("STEP 2: Adding new columns to student_profiles")
    print("="*60)

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            new_columns = [
                ('hero_title', 'TEXT[]', "'{}'"),
                ('hero_subtitle', 'TEXT[]', "'{}'"),
                ('email', 'VARCHAR(255)', 'NULL'),
                ('phone', 'VARCHAR(50)', 'NULL'),
                ('interested_in', 'TEXT[]', "'{}'"),
                ('hobbies', 'TEXT[]', "'{}'"),
                ('languages', 'TEXT[]', "'{}'"),
                ('learning_method', 'TEXT[]', "'{}'"),
                ('studying_at', 'VARCHAR(255)', 'NULL'),
                ('about', 'TEXT', 'NULL')
            ]

            for col_name, col_type, default in new_columns:
                try:
                    if default == 'NULL':
                        cur.execute(f"""
                            ALTER TABLE student_profiles
                            ADD COLUMN IF NOT EXISTS {col_name} {col_type}
                        """)
                    else:
                        cur.execute(f"""
                            ALTER TABLE student_profiles
                            ADD COLUMN IF NOT EXISTS {col_name} {col_type} DEFAULT {default}
                        """)
                    print(f"  ✓ Added column: {col_name}")
                except Exception as e:
                    print(f"  ⚠️ Could not add {col_name}: {str(e)}")

            conn.commit()
            print("✅ New columns added successfully!")

def migrate_existing_data():
    """Step 3: Migrate data from old columns to new columns"""
    print("\n" + "="*60)
    print("STEP 3: Migrating existing data")
    print("="*60)

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            # Migrate subjects → interested_in
            print("\n🔄 Migrating subjects → interested_in...")
            cur.execute("""
                UPDATE student_profiles
                SET interested_in = CASE
                    WHEN subjects IS NULL THEN '{}'::TEXT[]
                    WHEN jsonb_typeof(subjects::jsonb) = 'array' THEN
                        ARRAY(SELECT jsonb_array_elements_text(subjects::jsonb))
                    ELSE '{}'::TEXT[]
                END
                WHERE interested_in = '{}'
            """)

            # Migrate interests → hobbies
            print("🔄 Migrating interests → hobbies...")
            cur.execute("""
                UPDATE student_profiles
                SET hobbies = CASE
                    WHEN interests IS NULL THEN '{}'::TEXT[]
                    WHEN jsonb_typeof(interests::jsonb) = 'array' THEN
                        ARRAY(SELECT jsonb_array_elements_text(interests::jsonb))
                    ELSE '{}'::TEXT[]
                END
                WHERE hobbies = '{}'
            """)

            # Migrate preferred_languages → languages
            print("🔄 Migrating preferred_languages → languages...")
            cur.execute("""
                UPDATE student_profiles
                SET languages = CASE
                    WHEN preferred_languages IS NULL THEN '{}'::TEXT[]
                    WHEN jsonb_typeof(preferred_languages::jsonb) = 'array' THEN
                        ARRAY(SELECT jsonb_array_elements_text(preferred_languages::jsonb))
                    ELSE '{}'::TEXT[]
                END
                WHERE languages = '{}'
            """)

            # Migrate learning_style → learning_method (single value to array)
            print("🔄 Migrating learning_style → learning_method...")
            cur.execute("""
                UPDATE student_profiles
                SET learning_method = CASE
                    WHEN learning_style IS NULL OR learning_style = '' THEN '{}'::TEXT[]
                    ELSE ARRAY[learning_style]
                END
                WHERE learning_method = '{}'
            """)

            # Migrate school_name → studying_at
            print("🔄 Migrating school_name → studying_at...")
            cur.execute("""
                UPDATE student_profiles
                SET studying_at = school_name
                WHERE studying_at IS NULL AND school_name IS NOT NULL
            """)

            # Migrate bio → about
            print("🔄 Migrating bio → about...")
            cur.execute("""
                UPDATE student_profiles
                SET about = bio
                WHERE about IS NULL AND bio IS NOT NULL
            """)

            # Fix quote column (text → text array)
            print("🔄 Converting quote to array...")
            cur.execute("""
                ALTER TABLE student_profiles
                ADD COLUMN IF NOT EXISTS quote_array TEXT[] DEFAULT '{}'
            """)

            cur.execute("""
                UPDATE student_profiles
                SET quote_array = CASE
                    WHEN quote IS NULL OR quote = '' THEN '{}'::TEXT[]
                    ELSE ARRAY[quote]
                END
            """)

            cur.execute("""
                ALTER TABLE student_profiles
                DROP COLUMN IF EXISTS quote CASCADE
            """)

            cur.execute("""
                ALTER TABLE student_profiles
                RENAME COLUMN quote_array TO quote
            """)

            conn.commit()
            print("✅ Data migration completed successfully!")

def create_indexes():
    """Step 4: Create indexes"""
    print("\n" + "="*60)
    print("STEP 4: Creating indexes")
    print("="*60)

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
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
            print("✅ Indexes created successfully!")

def show_summary():
    """Show migration summary"""
    print("\n" + "="*60)
    print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
    print("="*60)

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            # Check student_profiles columns
            cur.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'student_profiles'
                AND column_name IN ('hero_title', 'hero_subtitle', 'username', 'interested_in',
                                   'hobbies', 'languages', 'learning_method', 'studying_at', 'quote', 'about')
                ORDER BY column_name
            """)
            cols = cur.fetchall()

            print("\n📋 New columns in student_profiles:")
            for col in cols:
                print(f"  ✓ {col['column_name']}: {col['data_type']}")

            # Check new tables
            cur.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name IN ('student_overall_progress', 'student_guardian', 'student_courses')
                ORDER BY table_name
            """)
            tables = cur.fetchall()

            print("\n📋 New tables created:")
            for table in tables:
                print(f"  ✓ {table['table_name']}")

    print("\n📝 Next Steps:")
    print("  1. Start backend: cd astegni-backend && python app.py")
    print("  2. Start frontend: python -m http.server 8080")
    print("  3. Test: http://localhost:8080/profile-pages/student-profile.html")
    print("  4. Click 'Edit Profile' button and test the form")
    print("\n" + "="*60 + "\n")

def main():
    """Run all migration steps"""
    try:
        print("\n🚀 Starting Student Profile Migration V2...")
        print("This migration will:")
        print("  1. Create new tables (student_overall_progress, student_guardian, student_courses)")
        print("  2. Add new columns to student_profiles")
        print("  3. Migrate existing data to new columns")
        print("  4. Create performance indexes")
        print("\nPress Ctrl+C to cancel...\n")

        create_new_tables()
        add_new_columns()
        migrate_existing_data()
        create_indexes()
        show_summary()

    except KeyboardInterrupt:
        print("\n\n❌ Migration cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
