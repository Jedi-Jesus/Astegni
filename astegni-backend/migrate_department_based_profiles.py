"""
Migration: Department-Based Admin Profile Architecture

OLD DESIGN (confusing):
- admin_profile: multiple rows per email (one per department)
- admin_profile_stats: shared stats (unclear relationship)

NEW DESIGN (clean):
- admin_profile: ONE row per admin (unique email)
- manage_campaigns_profile: department-specific data + stats
- manage_courses_profile: department-specific data + stats
- manage_schools_profile: department-specific data + stats
- manage_tutors_profile: department-specific data + stats
- manage_customers_profile: department-specific data + stats
- manage_contents_profile: department-specific data + stats
- manage_system_settings_profile: super admin data + stats
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("=" * 80)
        print("MIGRATION: Department-Based Admin Profiles")
        print("=" * 80)

        # ============================================
        # STEP 1: Rename old table to backup
        # ============================================
        print("\n[1/10] Backing up old admin_profile table...")
        cursor.execute("""
            ALTER TABLE IF EXISTS admin_profile
            RENAME TO admin_profile_old_backup
        """)
        print("[OK] Renamed admin_profile -> admin_profile_old_backup")

        # ============================================
        # STEP 2: Create new admin_profile (one per person)
        # ============================================
        print("\n[2/10] Creating new admin_profile table (one row per admin)...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_profile (
                id SERIAL PRIMARY KEY,

                -- Authentication
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255),

                -- Personal Info (Ethiopian naming convention)
                first_name VARCHAR(100) NOT NULL,
                father_name VARCHAR(100) NOT NULL,
                grandfather_name VARCHAR(100),

                -- Contact
                phone_number VARCHAR(50),

                -- Profile Media
                profile_picture TEXT,
                cover_picture TEXT,

                -- Bio
                bio TEXT,
                quote TEXT,

                -- OTP for registration/password reset
                otp_code VARCHAR(6),
                otp_expires_at TIMESTAMP,
                is_otp_verified BOOLEAN DEFAULT FALSE,

                -- Timestamps
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                last_login TIMESTAMP
            )
        """)
        print("[OK] Created admin_profile table")

        # ============================================
        # STEP 3: Create manage_campaigns_profile
        # ============================================
        print("\n[3/10] Creating manage_campaigns_profile table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manage_campaigns_profile (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES admin_profile(id) ON DELETE CASCADE,

                -- Department Info
                position VARCHAR(100) DEFAULT 'Staff',
                joined_date DATE DEFAULT CURRENT_DATE,

                -- Stats
                rating DECIMAL(3,2) DEFAULT 0.0,
                total_reviews INTEGER DEFAULT 0,
                badges JSONB DEFAULT '[]'::jsonb,

                -- Campaign-Specific Metrics
                campaigns_approved INTEGER DEFAULT 0,
                campaigns_rejected INTEGER DEFAULT 0,
                campaigns_suspended INTEGER DEFAULT 0,
                total_budget_managed DECIMAL(15,2) DEFAULT 0.0,
                avg_campaign_performance DECIMAL(5,2) DEFAULT 0.0,

                -- Permissions
                permissions JSONB DEFAULT '{
                    "can_approve": false,
                    "can_reject": false,
                    "can_suspend": false,
                    "can_edit_budget": false
                }'::jsonb,

                -- Timestamps
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),

                UNIQUE(admin_id)  -- One admin can only have one campaigns profile
            )
        """)
        print("[OK] Created manage_campaigns_profile table")

        # ============================================
        # STEP 4: Create manage_courses_profile
        # ============================================
        print("\n[4/10] Creating manage_courses_profile table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manage_courses_profile (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES admin_profile(id) ON DELETE CASCADE,

                -- Department Info
                position VARCHAR(100) DEFAULT 'Staff',
                joined_date DATE DEFAULT CURRENT_DATE,

                -- Stats
                rating DECIMAL(3,2) DEFAULT 0.0,
                total_reviews INTEGER DEFAULT 0,
                badges JSONB DEFAULT '[]'::jsonb,

                -- Course-Specific Metrics
                courses_created INTEGER DEFAULT 0,
                courses_approved INTEGER DEFAULT 0,
                courses_rejected INTEGER DEFAULT 0,
                courses_archived INTEGER DEFAULT 0,
                students_enrolled INTEGER DEFAULT 0,
                avg_course_rating DECIMAL(3,2) DEFAULT 0.0,

                -- Permissions
                permissions JSONB DEFAULT '{
                    "can_create": false,
                    "can_approve": false,
                    "can_reject": false,
                    "can_archive": false
                }'::jsonb,

                -- Timestamps
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),

                UNIQUE(admin_id)
            )
        """)
        print("[OK] Created manage_courses_profile table")

        # ============================================
        # STEP 5: Create manage_schools_profile
        # ============================================
        print("\n[5/10] Creating manage_schools_profile table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manage_schools_profile (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES admin_profile(id) ON DELETE CASCADE,

                -- Department Info
                position VARCHAR(100) DEFAULT 'Staff',
                joined_date DATE DEFAULT CURRENT_DATE,

                -- Stats
                rating DECIMAL(3,2) DEFAULT 0.0,
                total_reviews INTEGER DEFAULT 0,
                badges JSONB DEFAULT '[]'::jsonb,

                -- School-Specific Metrics
                schools_verified INTEGER DEFAULT 0,
                schools_rejected INTEGER DEFAULT 0,
                schools_suspended INTEGER DEFAULT 0,
                total_students_managed INTEGER DEFAULT 0,
                accreditation_reviews INTEGER DEFAULT 0,

                -- Permissions
                permissions JSONB DEFAULT '{
                    "can_verify": false,
                    "can_reject": false,
                    "can_suspend": false
                }'::jsonb,

                -- Timestamps
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),

                UNIQUE(admin_id)
            )
        """)
        print("[OK] Created manage_schools_profile table")

        # ============================================
        # STEP 6: Create manage_tutors_profile
        # ============================================
        print("\n[6/10] Creating manage_tutors_profile table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manage_tutors_profile (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES admin_profile(id) ON DELETE CASCADE,

                -- Department Info
                position VARCHAR(100) DEFAULT 'Staff',
                joined_date DATE DEFAULT CURRENT_DATE,

                -- Stats
                rating DECIMAL(3,2) DEFAULT 0.0,
                total_reviews INTEGER DEFAULT 0,
                badges JSONB DEFAULT '[]'::jsonb,

                -- Tutor-Specific Metrics
                tutors_verified INTEGER DEFAULT 0,
                tutors_rejected INTEGER DEFAULT 0,
                tutors_suspended INTEGER DEFAULT 0,
                verification_requests_pending INTEGER DEFAULT 0,
                avg_verification_time_hours INTEGER DEFAULT 24,

                -- Permissions
                permissions JSONB DEFAULT '{
                    "can_verify": false,
                    "can_reject": false,
                    "can_suspend": false
                }'::jsonb,

                -- Timestamps
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),

                UNIQUE(admin_id)
            )
        """)
        print("[OK] Created manage_tutors_profile table")

        # ============================================
        # STEP 7: Create manage_customers_profile
        # ============================================
        print("\n[7/10] Creating manage_customers_profile table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manage_customers_profile (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES admin_profile(id) ON DELETE CASCADE,

                -- Department Info
                position VARCHAR(100) DEFAULT 'Staff',
                joined_date DATE DEFAULT CURRENT_DATE,

                -- Stats
                rating DECIMAL(3,2) DEFAULT 0.0,
                total_reviews INTEGER DEFAULT 0,
                badges JSONB DEFAULT '[]'::jsonb,

                -- Customer-Specific Metrics
                customers_managed INTEGER DEFAULT 0,
                support_tickets_resolved INTEGER DEFAULT 0,
                avg_response_time_hours INTEGER DEFAULT 24,
                customer_satisfaction_rate DECIMAL(5,2) DEFAULT 0.0,

                -- Permissions
                permissions JSONB DEFAULT '{
                    "can_suspend": false,
                    "can_delete": false,
                    "can_refund": false
                }'::jsonb,

                -- Timestamps
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),

                UNIQUE(admin_id)
            )
        """)
        print("[OK] Created manage_customers_profile table")

        # ============================================
        # STEP 8: Create manage_contents_profile
        # ============================================
        print("\n[8/10] Creating manage_contents_profile table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manage_contents_profile (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES admin_profile(id) ON DELETE CASCADE,

                -- Department Info
                position VARCHAR(100) DEFAULT 'Staff',
                joined_date DATE DEFAULT CURRENT_DATE,

                -- Stats
                rating DECIMAL(3,2) DEFAULT 0.0,
                total_reviews INTEGER DEFAULT 0,
                badges JSONB DEFAULT '[]'::jsonb,

                -- Content-Specific Metrics
                videos_uploaded INTEGER DEFAULT 0,
                blogs_published INTEGER DEFAULT 0,
                media_moderated INTEGER DEFAULT 0,
                total_views INTEGER DEFAULT 0,
                avg_engagement_rate DECIMAL(5,2) DEFAULT 0.0,

                -- Permissions
                permissions JSONB DEFAULT '{
                    "can_upload": false,
                    "can_publish": false,
                    "can_delete": false,
                    "can_feature": false
                }'::jsonb,

                -- Timestamps
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),

                UNIQUE(admin_id)
            )
        """)
        print("[OK] Created manage_contents_profile table")

        # ============================================
        # STEP 9: Create manage_system_settings_profile
        # ============================================
        print("\n[9/10] Creating manage_system_settings_profile (Super Admin)...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manage_system_settings_profile (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES admin_profile(id) ON DELETE CASCADE,

                -- Department Info
                position VARCHAR(100) DEFAULT 'Super Admin',
                joined_date DATE DEFAULT CURRENT_DATE,

                -- Stats
                rating DECIMAL(3,2) DEFAULT 0.0,
                total_reviews INTEGER DEFAULT 0,
                badges JSONB DEFAULT '[]'::jsonb,

                -- System-Wide Metrics
                total_actions INTEGER DEFAULT 0,
                system_changes_made INTEGER DEFAULT 0,
                admins_invited INTEGER DEFAULT 0,
                critical_alerts_resolved INTEGER DEFAULT 0,

                -- Full Access Permissions
                permissions JSONB DEFAULT '{
                    "full_access": true,
                    "can_manage_admins": true,
                    "can_change_settings": true,
                    "can_access_all_departments": true
                }'::jsonb,

                -- Timestamps
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),

                UNIQUE(admin_id)
            )
        """)
        print("[OK] Created manage_system_settings_profile table")

        # ============================================
        # STEP 10: Migrate existing data
        # ============================================
        print("\n[10/10] Migrating existing data from old structure...")

        # Get all unique emails from old table
        cursor.execute("""
            SELECT DISTINCT email FROM admin_profile_old_backup
            WHERE email IS NOT NULL
        """)
        unique_emails = cursor.fetchall()

        print(f"   Found {len(unique_emails)} unique admin emails")

        for (email,) in unique_emails:
            # Get first occurrence of this email to extract basic info
            cursor.execute("""
                SELECT first_name, father_name, grandfather_name, phone_number,
                       password_hash, profile_picture, cover_picture, bio, quote,
                       otp_code, otp_expires_at, is_otp_verified, created_at, last_login
                FROM admin_profile_old_backup
                WHERE email = %s
                LIMIT 1
            """, (email,))

            admin_data = cursor.fetchone()
            if not admin_data:
                continue

            # Insert into new admin_profile
            cursor.execute("""
                INSERT INTO admin_profile (
                    email, first_name, father_name, grandfather_name, phone_number,
                    password_hash, profile_picture, cover_picture, bio, quote,
                    otp_code, otp_expires_at, is_otp_verified, created_at, last_login
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (email,) + admin_data)

            admin_id = cursor.fetchone()[0]
            print(f"   [OK] Migrated admin: {email} (id={admin_id})")

            # Get all departments for this email
            cursor.execute("""
                SELECT department, position, created_at
                FROM admin_profile_old_backup
                WHERE email = %s
            """, (email,))

            departments = cursor.fetchall()

            for dept, position, dept_created_at in departments:
                dept_table_map = {
                    'manage-campaigns': 'manage_campaigns_profile',
                    'manage-courses': 'manage_courses_profile',
                    'manage-schools': 'manage_schools_profile',
                    'manage-tutors': 'manage_tutors_profile',
                    'manage-customers': 'manage_customers_profile',
                    'manage-contents': 'manage_contents_profile',
                    'manage-system-settings': 'manage_system_settings_profile'
                }

                dept_table = dept_table_map.get(dept)
                if dept_table:
                    cursor.execute(f"""
                        INSERT INTO {dept_table} (admin_id, position, created_at)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (admin_id) DO NOTHING
                    """, (admin_id, position or 'Staff', dept_created_at))
                    print(f"      -> Added to {dept_table}")

        conn.commit()

        print("\n" + "=" * 80)
        print("[SUCCESS] MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print("\nSUMMARY:")
        print("- Old admin_profile -> admin_profile_old_backup")
        print("- New admin_profile: ONE row per admin (unique email)")
        print("- Department tables: Separate table for each department with stats")
        print("\nNEXT STEPS:")
        print("1. Update backend endpoints to use new structure")
        print("2. Test registration and login flows")
        print("3. Once verified, you can drop admin_profile_old_backup")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] {e}")
        print("Rolling back changes...")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
