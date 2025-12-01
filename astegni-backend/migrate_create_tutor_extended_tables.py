"""
Create Extended Tutor Tables
Creates tables for: achievements, certificates, experience, videos
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def create_extended_tutor_tables():
    """Create tutor_achievements, tutor_certificates, tutor_experience, tutor_videos tables"""

    conn = psycopg.connect(DATABASE_URL)

    try:
        with conn.cursor() as cur:
            print("Creating extended tutor tables...")

            # 1. TUTOR ACHIEVEMENTS TABLE
            print("\n1. Creating tutor_achievements table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tutor_achievements (
                    id SERIAL PRIMARY KEY,
                    tutor_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,

                    -- Achievement Details
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    category VARCHAR(100),  -- award, milestone, certification, honor
                    icon VARCHAR(50),  -- emoji or icon class (e.g., '🏆', 'fa-trophy')
                    color VARCHAR(50),  -- UI display color (e.g., 'purple', 'gold', '#FFD700')

                    -- Achievement Metadata
                    year INTEGER,
                    date_achieved DATE,
                    issuer VARCHAR(255),  -- Organization/institution that gave the award
                    verification_url VARCHAR(500),  -- Link to verify achievement

                    -- Display Options
                    is_featured BOOLEAN DEFAULT FALSE,  -- Show on profile prominently
                    display_order INTEGER DEFAULT 0,  -- Order in which to display

                    -- Timestamps
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    -- Indexes
                    CONSTRAINT unique_tutor_achievement UNIQUE(tutor_id, title, year)
                );

                CREATE INDEX IF NOT EXISTS idx_tutor_achievements_tutor_id
                    ON tutor_achievements(tutor_id);
                CREATE INDEX IF NOT EXISTS idx_tutor_achievements_featured
                    ON tutor_achievements(is_featured) WHERE is_featured = TRUE;
            """)
            print("SUCCESS: tutor_achievements table created")

            # 2. TUTOR CERTIFICATES TABLE
            print("\n2. Creating tutor_certificates table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tutor_certificates (
                    id SERIAL PRIMARY KEY,
                    tutor_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,

                    -- Certificate Details
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    issuing_organization VARCHAR(255) NOT NULL,
                    credential_id VARCHAR(100),  -- Certificate ID/credential number
                    credential_url VARCHAR(500),  -- Link to verify certificate

                    -- Dates
                    issue_date DATE,
                    expiry_date DATE,  -- NULL for non-expiring certificates

                    -- Certificate Type
                    certificate_type VARCHAR(100),  -- degree, certification, license, training
                    field_of_study VARCHAR(255),  -- e.g., "Mathematics", "Physics"

                    -- Media
                    certificate_image_url VARCHAR(500),  -- Uploaded certificate image

                    -- Status
                    is_verified BOOLEAN DEFAULT FALSE,
                    is_active BOOLEAN DEFAULT TRUE,  -- FALSE if expired

                    -- Timestamps
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    -- Indexes
                    CONSTRAINT unique_tutor_certificate UNIQUE(tutor_id, name, issuing_organization, issue_date)
                );

                CREATE INDEX IF NOT EXISTS idx_tutor_certificates_tutor_id
                    ON tutor_certificates(tutor_id);
                CREATE INDEX IF NOT EXISTS idx_tutor_certificates_active
                    ON tutor_certificates(is_active) WHERE is_active = TRUE;
            """)
            print("SUCCESS: tutor_certificates table created")

            # 3. TUTOR EXPERIENCE TABLE
            print("\n3. Creating tutor_experience table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tutor_experience (
                    id SERIAL PRIMARY KEY,
                    tutor_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,

                    -- Position Details
                    job_title VARCHAR(255) NOT NULL,
                    institution VARCHAR(255) NOT NULL,
                    location VARCHAR(255),

                    -- Employment Period
                    start_date DATE NOT NULL,
                    end_date DATE,  -- NULL for current positions
                    is_current BOOLEAN DEFAULT FALSE,

                    -- Duration (calculated or manual)
                    duration_years INTEGER,  -- e.g., 2
                    duration_months INTEGER,  -- e.g., 6 (for 2 years 6 months)

                    -- Job Description
                    description TEXT,
                    responsibilities TEXT,  -- Key responsibilities
                    achievements TEXT,  -- Key achievements in this role

                    -- Employment Type
                    employment_type VARCHAR(50),  -- full-time, part-time, contract, volunteer

                    -- Display Options
                    display_order INTEGER DEFAULT 0,  -- Order in timeline

                    -- Timestamps
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_tutor_experience_tutor_id
                    ON tutor_experience(tutor_id);
                CREATE INDEX IF NOT EXISTS idx_tutor_experience_current
                    ON tutor_experience(is_current) WHERE is_current = TRUE;
                CREATE INDEX IF NOT EXISTS idx_tutor_experience_dates
                    ON tutor_experience(start_date DESC, end_date DESC);
            """)
            print("SUCCESS: tutor_experience table created")

            # 4. TUTOR VIDEOS TABLE
            print("\n4. Creating tutor_videos table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tutor_videos (
                    id SERIAL PRIMARY KEY,
                    tutor_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,

                    -- Video Details
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    video_url VARCHAR(500) NOT NULL,  -- B2 storage URL or YouTube/Vimeo URL
                    thumbnail_url VARCHAR(500),  -- Video thumbnail

                    -- Video Type
                    video_type VARCHAR(50) NOT NULL,  -- intro, sample_lesson, testimonial, tutorial, promotional

                    -- Video Metadata
                    duration_seconds INTEGER,  -- Video length in seconds
                    duration_display VARCHAR(20),  -- e.g., "5:30", "12:45"
                    file_size_mb DECIMAL(10, 2),  -- File size in MB

                    -- Subject/Topic
                    subject VARCHAR(255),  -- e.g., "Mathematics", "Physics"
                    grade_level VARCHAR(100),  -- e.g., "Grade 11-12", "University"
                    topics JSON,  -- Array of topics covered: ["Calculus", "Derivatives"]

                    -- Engagement Stats
                    view_count INTEGER DEFAULT 0,
                    like_count INTEGER DEFAULT 0,
                    share_count INTEGER DEFAULT 0,

                    -- Display Options
                    is_featured BOOLEAN DEFAULT FALSE,  -- Show on profile prominently
                    is_intro_video BOOLEAN DEFAULT FALSE,  -- Main introduction video
                    display_order INTEGER DEFAULT 0,

                    -- Status
                    is_published BOOLEAN DEFAULT TRUE,
                    is_processing BOOLEAN DEFAULT FALSE,  -- For video upload processing

                    -- Timestamps
                    published_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_tutor_videos_tutor_id
                    ON tutor_videos(tutor_id);
                CREATE INDEX IF NOT EXISTS idx_tutor_videos_type
                    ON tutor_videos(video_type);
                CREATE INDEX IF NOT EXISTS idx_tutor_videos_featured
                    ON tutor_videos(is_featured) WHERE is_featured = TRUE;
                CREATE INDEX IF NOT EXISTS idx_tutor_videos_intro
                    ON tutor_videos(is_intro_video) WHERE is_intro_video = TRUE;
                CREATE INDEX IF NOT EXISTS idx_tutor_videos_published
                    ON tutor_videos(published_at DESC) WHERE is_published = TRUE;
            """)
            print("SUCCESS: tutor_videos table created")

            conn.commit()
            print("\nSUCCESS! All extended tutor tables created successfully!")
            print("\nCreated tables:")
            print("  1. tutor_achievements - Track awards, milestones, honors")
            print("  2. tutor_certificates - Store educational certificates and licenses")
            print("  3. tutor_experience - Record work/teaching history")
            print("  4. tutor_videos - Manage tutor video content")

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_extended_tutor_tables()
