"""
Migration: Create student_achievements, student_certifications, and student_extracurricular_activities tables

This migration adds three new tables to enhance student profiles with:
1. Achievements (awards, honors, academic achievements)
2. Certifications (professional certificates, course completions)
3. Extracurricular Activities (clubs, sports, volunteering, leadership)

Run this migration:
    cd astegni-backend
    python migrate_create_student_enhancement_tables.py
"""

import psycopg
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')

def create_student_enhancement_tables():
    """Create student_achievements, student_certifications, and student_extracurricular_activities tables"""

    try:
        # Connect to database
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("Creating student enhancement tables...")

        # 1. Create student_achievements table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS student_achievements (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                achievement_type VARCHAR(50) NOT NULL,  -- 'academic', 'competition', 'honor', 'award', 'other'
                issuing_organization VARCHAR(255),
                date_received DATE,
                verification_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'verified', 'rejected'
                verification_document_url TEXT,  -- Backblaze B2 URL
                is_featured BOOLEAN DEFAULT FALSE,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT valid_achievement_type CHECK (
                    achievement_type IN ('academic', 'competition', 'honor', 'award', 'other')
                ),
                CONSTRAINT valid_verification_status CHECK (
                    verification_status IN ('pending', 'verified', 'rejected')
                )
            );
        """)
        print("Created table: student_achievements")

        # 2. Create student_certifications table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS student_certifications (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                certification_name VARCHAR(255) NOT NULL,
                issuing_organization VARCHAR(255) NOT NULL,
                issue_date DATE,
                expiration_date DATE,  -- NULL if no expiration
                credential_id VARCHAR(255),  -- Certificate ID/credential number
                credential_url TEXT,  -- Link to verify certificate online
                certificate_document_url TEXT,  -- Backblaze B2 URL for uploaded certificate
                skills TEXT[],  -- Array of skills gained
                description TEXT,
                verification_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'verified', 'rejected'
                is_featured BOOLEAN DEFAULT FALSE,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT valid_verification_status CHECK (
                    verification_status IN ('pending', 'verified', 'rejected')
                )
            );
        """)
        print("Created table: student_certifications")

        # 3. Create student_extracurricular_activities table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS student_extracurricular_activities (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                activity_name VARCHAR(255) NOT NULL,
                activity_type VARCHAR(50) NOT NULL,  -- 'club', 'sport', 'volunteer', 'leadership', 'arts', 'music', 'drama', 'debate', 'other'
                organization_name VARCHAR(255),
                role_position VARCHAR(255),  -- e.g., "President", "Team Captain", "Member"
                start_date DATE,
                end_date DATE,  -- NULL if currently active
                is_currently_active BOOLEAN DEFAULT TRUE,
                hours_per_week DECIMAL(4,1),  -- Hours commitment per week
                description TEXT,
                achievements TEXT[],  -- Array of notable achievements in this activity
                skills_gained TEXT[],  -- Array of skills developed
                verification_document_url TEXT,  -- Backblaze B2 URL
                verification_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'verified', 'rejected'
                is_featured BOOLEAN DEFAULT FALSE,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT valid_activity_type CHECK (
                    activity_type IN ('club', 'sport', 'volunteer', 'leadership', 'arts', 'music', 'drama', 'debate', 'other')
                ),
                CONSTRAINT valid_verification_status CHECK (
                    verification_status IN ('pending', 'verified', 'rejected')
                )
            );
        """)
        print("Created table: student_extracurricular_activities")

        # Create indexes for better query performance
        print("\nCreating indexes...")

        # Indexes for student_achievements
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_achievements_student_id
            ON student_achievements(student_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_achievements_type
            ON student_achievements(achievement_type);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_achievements_verification
            ON student_achievements(verification_status);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_achievements_featured
            ON student_achievements(is_featured) WHERE is_featured = TRUE;
        """)
        print("Created indexes for student_achievements")

        # Indexes for student_certifications
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_certifications_student_id
            ON student_certifications(student_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_certifications_verification
            ON student_certifications(verification_status);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_certifications_featured
            ON student_certifications(is_featured) WHERE is_featured = TRUE;
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_certifications_expiration
            ON student_certifications(expiration_date) WHERE expiration_date IS NOT NULL;
        """)
        print("Created indexes for student_certifications")

        # Indexes for student_extracurricular_activities
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_extracurricular_student_id
            ON student_extracurricular_activities(student_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_extracurricular_type
            ON student_extracurricular_activities(activity_type);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_extracurricular_verification
            ON student_extracurricular_activities(verification_status);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_extracurricular_active
            ON student_extracurricular_activities(is_currently_active) WHERE is_currently_active = TRUE;
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_extracurricular_featured
            ON student_extracurricular_activities(is_featured) WHERE is_featured = TRUE;
        """)
        print("Created indexes for student_extracurricular_activities")

        # Commit changes
        conn.commit()

        print("\n" + "="*70)
        print("MIGRATION COMPLETE!")
        print("="*70)
        print("\nCreated tables:")
        print("  1. student_achievements - Track academic awards, honors, competitions")
        print("  2. student_certifications - Track professional certificates and credentials")
        print("  3. student_extracurricular_activities - Track clubs, sports, volunteering")
        print("\nAll tables include:")
        print("  • Verification system (pending/verified/rejected)")
        print("  • Document upload support (Backblaze B2)")
        print("  • Featured items capability")
        print("  • Display ordering")
        print("  • Timestamps for auditing")
        print("\nIndexes created for optimal query performance.")
        print("\nNext steps:")
        print("  1. Run: python seed_student_enhancements.py (to add sample data)")
        print("  2. Create API endpoints in student_enhancement_endpoints.py")
        print("  3. Update student-profile.html to display these sections")
        print("="*70)

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    create_student_enhancement_tables()
