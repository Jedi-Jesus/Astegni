"""
Restructure admin tables:
1. Create admin_profile table for personal information
2. Update admin_profile_stats to only contain statistics
3. Update admin_reviews to use username references
"""
import psycopg
from dotenv import load_dotenv
import os
from datetime import datetime
import sys
import io

# Force UTF-8 output encoding for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

def migrate_admin_tables():
    """Restructure admin tables"""
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                print("Starting admin tables restructure...\n")

                # Step 1: Create new admin_profile table
                print("Step 1: Creating admin_profile table...")
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS admin_profile (
                        id SERIAL PRIMARY KEY,
                        admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                        first_name VARCHAR(100),
                        father_name VARCHAR(100),
                        grandfather_name VARCHAR(100),
                        admin_username VARCHAR(100) UNIQUE,
                        quote TEXT,
                        bio TEXT,
                        phone_number VARCHAR(20),
                        email VARCHAR(255),
                        department VARCHAR(100),  -- e.g., 'manage-courses', 'manage-tutors', 'manage-reviews', etc.
                        profile_picture_url TEXT,
                        cover_picture_url TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                print("✓ admin_profile table created successfully\n")

                # Step 2: Backup existing admin_profile_stats
                print("Step 2: Backing up existing admin_profile_stats...")
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS admin_profile_stats_backup AS
                    SELECT * FROM admin_profile_stats
                """)
                print("✓ Backup created: admin_profile_stats_backup\n")

                # Step 3: Drop old admin_profile_stats table
                print("Step 3: Dropping old admin_profile_stats table...")
                cur.execute("DROP TABLE IF EXISTS admin_profile_stats CASCADE")
                print("✓ Old admin_profile_stats table dropped\n")

                # Step 4: Create new admin_profile_stats table (stats only)
                print("Step 4: Creating new admin_profile_stats table...")
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS admin_profile_stats (
                        id SERIAL PRIMARY KEY,
                        admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                        access_level VARCHAR(50) DEFAULT 'Admin',  -- 'Admin', 'Super Admin', 'Moderator'
                        responsibilities TEXT,  -- e.g., 'Course Creation & Management', 'Tutor Verification & Management'
                        employee_id VARCHAR(50) UNIQUE,
                        last_login TIMESTAMP,
                        joined_date DATE,
                        rating DECIMAL(3,2) DEFAULT 0.00,
                        total_reviews INTEGER DEFAULT 0,
                        badges JSONB,  -- Array of badge objects: [{"text": "✔ Verified", "class": "verified"}]
                        total_actions INTEGER DEFAULT 0,  -- Total admin actions performed
                        courses_managed INTEGER DEFAULT 0,
                        tutors_verified INTEGER DEFAULT 0,
                        reviews_moderated INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                print("✓ New admin_profile_stats table created successfully\n")

                # Step 5: Migrate data from backup to new tables
                print("Step 5: Migrating data from backup...")

                # Check if backup has data
                cur.execute("SELECT COUNT(*) FROM admin_profile_stats_backup")
                count = cur.fetchone()[0]

                if count > 0:
                    print(f"Found {count} records to migrate\n")

                    # Migrate to admin_profile
                    cur.execute("""
                        INSERT INTO admin_profile (
                            admin_id, admin_username, quote, bio, department, created_at, updated_at
                        )
                        SELECT
                            admin_id,
                            display_name,  -- Using display_name as admin_username for now
                            profile_quote,
                            bio,
                            department,
                            created_at,
                            updated_at
                        FROM admin_profile_stats_backup
                    """)
                    print("✓ Migrated profile data to admin_profile\n")

                    # Migrate to admin_profile_stats
                    cur.execute("""
                        INSERT INTO admin_profile_stats (
                            admin_id, employee_id, joined_date, rating, total_reviews, badges, created_at, updated_at
                        )
                        SELECT
                            admin_id,
                            employee_id,
                            joined_date,
                            rating,
                            total_reviews,
                            badges,
                            created_at,
                            updated_at
                        FROM admin_profile_stats_backup
                    """)
                    print("✓ Migrated stats data to admin_profile_stats\n")
                else:
                    print("No data to migrate from backup\n")

                # Step 6: Update admin_reviews table
                print("Step 6: Updating admin_reviews table...")

                # Check if admin_reviews exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'admin_reviews'
                    )
                """)
                table_exists = cur.fetchone()[0]

                if table_exists:
                    # Backup admin_reviews
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS admin_reviews_backup AS
                        SELECT * FROM admin_reviews
                    """)
                    print("✓ Backup created: admin_reviews_backup\n")

                    # Drop old table
                    cur.execute("DROP TABLE IF EXISTS admin_reviews CASCADE")

                    # Create new admin_reviews table
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS admin_reviews (
                            id SERIAL PRIMARY KEY,
                            admin_username VARCHAR(100) NOT NULL,  -- References admin_profile.admin_username
                            reviewer_username VARCHAR(100) NOT NULL,  -- Username from any profile (tutor/student/parent/advertiser)
                            reviewer_role VARCHAR(50) NOT NULL,  -- 'tutor', 'student', 'parent', 'advertiser'
                            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                            review_text TEXT,
                            is_featured BOOLEAN DEFAULT FALSE,
                            helpful_count INTEGER DEFAULT 0,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT unique_admin_reviewer UNIQUE(admin_username, reviewer_username)
                        )
                    """)
                    print("✓ New admin_reviews table created successfully\n")

                    # Create index for performance
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_admin_reviews_admin
                        ON admin_reviews(admin_username)
                    """)
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_admin_reviews_reviewer
                        ON admin_reviews(reviewer_username)
                    """)
                    print("✓ Indexes created for admin_reviews\n")

                else:
                    # Create admin_reviews table from scratch
                    print("admin_reviews table doesn't exist, creating new one...")
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS admin_reviews (
                            id SERIAL PRIMARY KEY,
                            admin_username VARCHAR(100) NOT NULL,  -- References admin_profile.admin_username
                            reviewer_username VARCHAR(100) NOT NULL,  -- Username from any profile (tutor/student/parent/advertiser)
                            reviewer_role VARCHAR(50) NOT NULL,  -- 'tutor', 'student', 'parent', 'advertiser'
                            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                            review_text TEXT,
                            is_featured BOOLEAN DEFAULT FALSE,
                            helpful_count INTEGER DEFAULT 0,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT unique_admin_reviewer UNIQUE(admin_username, reviewer_username)
                        )
                    """)

                    # Create indexes
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_admin_reviews_admin
                        ON admin_reviews(admin_username)
                    """)
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_admin_reviews_reviewer
                        ON admin_reviews(reviewer_username)
                    """)
                    print("✓ admin_reviews table created successfully\n")

                # Commit all changes
                conn.commit()

                print("="*80)
                print("MIGRATION COMPLETED SUCCESSFULLY!")
                print("="*80)
                print("\nNew table structure:")
                print("\n1. admin_profile (Personal Information):")
                print("   - admin_id, first_name, father_name, grandfather_name")
                print("   - admin_username, quote, bio, phone_number, email")
                print("   - department, profile_picture_url, cover_picture_url")

                print("\n2. admin_profile_stats (Statistics Only):")
                print("   - admin_id, access_level, responsibilities, employee_id")
                print("   - last_login, joined_date, rating, total_reviews")
                print("   - badges, total_actions, courses_managed, tutors_verified, reviews_moderated")

                print("\n3. admin_reviews (Updated):")
                print("   - admin_username (instead of admin_name)")
                print("   - reviewer_username (instead of reviewer_name)")
                print("   - reviewer_role (tutor/student/parent/advertiser)")

                print("\nBackup tables created:")
                print("   - admin_profile_stats_backup")
                print("   - admin_reviews_backup (if admin_reviews existed)")
                print("="*80)

    except Exception as e:
        print(f"Error during migration: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    migrate_admin_tables()
