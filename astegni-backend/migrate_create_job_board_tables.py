"""
Database Migration: Create Job Board Tables
Creates comprehensive tables for advertiser job posting system
"""

import psycopg
from datetime import datetime
import sys

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Database connection parameters
DB_PARAMS = {
    'dbname': 'astegni_user_db',
    'user': 'astegni_user',
    'password': 'Astegni2025',
    'host': 'localhost',
    'port': 5432
}

def migrate():
    """Create job board tables"""

    conn = psycopg.connect(**DB_PARAMS)
    cur = conn.cursor()

    try:
        print("=" * 60)
        print("CREATING JOB BOARD TABLES")
        print("=" * 60)

        # Table 1: job_posts
        print("\n1. Creating 'job_posts' table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS job_posts (
                id SERIAL PRIMARY KEY,
                advertiser_id INTEGER NOT NULL REFERENCES advertiser_profiles(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Job Details
                title VARCHAR(200) NOT NULL,
                description TEXT NOT NULL,
                requirements TEXT NOT NULL,

                -- Job Type & Format
                job_type VARCHAR(50) NOT NULL, -- full-time, part-time, contract, internship, freelance
                location_type VARCHAR(50) NOT NULL, -- remote, on-site, hybrid
                location VARCHAR(200) NOT NULL, -- City, Region, Country

                -- Salary Information
                salary_min INTEGER,
                salary_max INTEGER,
                salary_currency VARCHAR(10) DEFAULT 'ETB',
                salary_visibility VARCHAR(20) DEFAULT 'public', -- public, private, negotiable

                -- Skills & Requirements
                skills JSONB DEFAULT '[]', -- Array of required skills
                experience_level VARCHAR(50), -- entry, mid, senior, expert
                education_level VARCHAR(100), -- High School, Bachelor's, Master's, PhD, etc.

                -- Application Details
                application_deadline DATE NOT NULL,
                application_email VARCHAR(255),
                application_url VARCHAR(500),
                application_instructions TEXT,

                -- Status & Visibility
                status VARCHAR(20) DEFAULT 'draft', -- draft, active, paused, closed, expired
                visibility VARCHAR(20) DEFAULT 'public', -- public, private, unlisted
                featured BOOLEAN DEFAULT FALSE,
                urgent BOOLEAN DEFAULT FALSE,

                -- Analytics
                views INTEGER DEFAULT 0,
                applications_count INTEGER DEFAULT 0,

                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                published_at TIMESTAMP,
                closed_at TIMESTAMP,

                -- Metadata
                expires_at TIMESTAMP,
                auto_renew BOOLEAN DEFAULT FALSE,

                CONSTRAINT valid_salary_range CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max),
                CONSTRAINT valid_deadline CHECK (application_deadline >= CURRENT_DATE)
            );

            CREATE INDEX IF NOT EXISTS idx_job_posts_advertiser ON job_posts(advertiser_id);
            CREATE INDEX IF NOT EXISTS idx_job_posts_status ON job_posts(status);
            CREATE INDEX IF NOT EXISTS idx_job_posts_location ON job_posts(location);
            CREATE INDEX IF NOT EXISTS idx_job_posts_job_type ON job_posts(job_type);
            CREATE INDEX IF NOT EXISTS idx_job_posts_created_at ON job_posts(created_at DESC);
        """)
        print("✅ 'job_posts' table created successfully")

        # Table 2: job_applications
        print("\n2. Creating 'job_applications' table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS job_applications (
                id SERIAL PRIMARY KEY,
                job_id INTEGER NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
                applicant_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Applicant Details
                applicant_name VARCHAR(200) NOT NULL,
                applicant_email VARCHAR(255) NOT NULL,
                applicant_phone VARCHAR(50),

                -- Application Content
                cover_letter TEXT,
                resume_url VARCHAR(500),
                portfolio_url VARCHAR(500),
                linkedin_url VARCHAR(500),

                -- Additional Information
                expected_salary INTEGER,
                available_from DATE,
                notice_period VARCHAR(100), -- Immediate, 2 weeks, 1 month, etc.

                -- Custom Questions Answers
                custom_answers JSONB DEFAULT '{}', -- Stores answers to custom application questions

                -- Application Status
                status VARCHAR(50) DEFAULT 'new', -- new, reviewing, shortlisted, interviewed, offered, hired, rejected
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                notes TEXT, -- Internal notes by recruiter

                -- Interview Information
                interview_scheduled_at TIMESTAMP,
                interview_notes TEXT,

                -- Hiring Information
                hire_date DATE,
                rejection_reason TEXT,
                feedback TEXT, -- Feedback given to candidate

                -- Timestamps
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP,
                status_updated_at TIMESTAMP,

                -- Metadata
                source VARCHAR(100), -- direct, referral, job_board, social_media, etc.
                referrer_id INTEGER REFERENCES users(id),

                UNIQUE(job_id, applicant_user_id)
            );

            CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_id);
            CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications(applicant_user_id);
            CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
            CREATE INDEX IF NOT EXISTS idx_job_applications_applied_at ON job_applications(applied_at DESC);
        """)
        print("✅ 'job_applications' table created successfully")

        # Table 3: job_custom_questions
        print("\n3. Creating 'job_custom_questions' table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS job_custom_questions (
                id SERIAL PRIMARY KEY,
                job_id INTEGER NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,

                -- Question Details
                question_text TEXT NOT NULL,
                question_type VARCHAR(50) NOT NULL, -- text, textarea, multiple_choice, yes_no, number, date
                required BOOLEAN DEFAULT FALSE,

                -- Multiple Choice Options
                options JSONB DEFAULT '[]', -- Array of options for multiple_choice questions

                -- Validation
                min_length INTEGER,
                max_length INTEGER,
                min_value NUMERIC,
                max_value NUMERIC,

                -- Display Order
                display_order INTEGER DEFAULT 0,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_job_custom_questions_job ON job_custom_questions(job_id);
        """)
        print("✅ 'job_custom_questions' table created successfully")

        # Table 4: job_views
        print("\n4. Creating 'job_views' table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS job_views (
                id SERIAL PRIMARY KEY,
                job_id INTEGER NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
                viewer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

                -- Viewer Information
                viewer_ip VARCHAR(50),
                viewer_user_agent TEXT,

                -- View Details
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                session_id VARCHAR(100),
                referrer_url TEXT,

                -- Analytics
                time_on_page INTEGER, -- seconds
                clicked_apply BOOLEAN DEFAULT FALSE
            );

            CREATE INDEX IF NOT EXISTS idx_job_views_job ON job_views(job_id);
            CREATE INDEX IF NOT EXISTS idx_job_views_viewer ON job_views(viewer_user_id);
            CREATE INDEX IF NOT EXISTS idx_job_views_viewed_at ON job_views(viewed_at DESC);
        """)
        print("✅ 'job_views' table created successfully")

        # Table 5: job_saved
        print("\n5. Creating 'job_saved' table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS job_saved (
                id SERIAL PRIMARY KEY,
                job_id INTEGER NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Save Details
                saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT, -- Personal notes about why they saved this job

                -- Notifications
                notify_on_deadline BOOLEAN DEFAULT TRUE,
                notify_on_changes BOOLEAN DEFAULT FALSE,

                UNIQUE(job_id, user_id)
            );

            CREATE INDEX IF NOT EXISTS idx_job_saved_job ON job_saved(job_id);
            CREATE INDEX IF NOT EXISTS idx_job_saved_user ON job_saved(user_id);
        """)
        print("✅ 'job_saved' table created successfully")

        # Table 6: job_categories
        print("\n6. Creating 'job_categories' table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS job_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                icon VARCHAR(50),
                parent_id INTEGER REFERENCES job_categories(id) ON DELETE SET NULL,

                -- Display
                display_order INTEGER DEFAULT 0,
                active BOOLEAN DEFAULT TRUE,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_job_categories_parent ON job_categories(parent_id);
        """)
        print("✅ 'job_categories' table created successfully")

        # Table 7: job_post_categories
        print("\n7. Creating 'job_post_categories' table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS job_post_categories (
                job_id INTEGER NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
                category_id INTEGER NOT NULL REFERENCES job_categories(id) ON DELETE CASCADE,

                PRIMARY KEY (job_id, category_id)
            );

            CREATE INDEX IF NOT EXISTS idx_job_post_categories_job ON job_post_categories(job_id);
            CREATE INDEX IF NOT EXISTS idx_job_post_categories_category ON job_post_categories(category_id);
        """)
        print("✅ 'job_post_categories' table created successfully")

        # Table 8: job_analytics
        print("\n8. Creating 'job_analytics' table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS job_analytics (
                id SERIAL PRIMARY KEY,
                job_id INTEGER NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
                date DATE NOT NULL,

                -- Daily Metrics
                views INTEGER DEFAULT 0,
                unique_views INTEGER DEFAULT 0,
                applications INTEGER DEFAULT 0,
                saves INTEGER DEFAULT 0,
                shares INTEGER DEFAULT 0,

                -- Application Funnel
                started_applications INTEGER DEFAULT 0,
                completed_applications INTEGER DEFAULT 0,

                -- Performance Metrics
                avg_time_on_page NUMERIC(10, 2), -- seconds
                bounce_rate NUMERIC(5, 2), -- percentage

                -- Sources
                source_direct INTEGER DEFAULT 0,
                source_search INTEGER DEFAULT 0,
                source_referral INTEGER DEFAULT 0,
                source_social INTEGER DEFAULT 0,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                UNIQUE(job_id, date)
            );

            CREATE INDEX IF NOT EXISTS idx_job_analytics_job ON job_analytics(job_id);
            CREATE INDEX IF NOT EXISTS idx_job_analytics_date ON job_analytics(date DESC);
        """)
        print("✅ 'job_analytics' table created successfully")

        # Commit all changes
        conn.commit()

        print("\n" + "=" * 60)
        print("✅ ALL JOB BOARD TABLES CREATED SUCCESSFULLY!")
        print("=" * 60)
        print("\nTables created:")
        print("  1. job_posts - Main job postings table")
        print("  2. job_applications - Job applications from candidates")
        print("  3. job_custom_questions - Custom application questions")
        print("  4. job_views - Job view tracking and analytics")
        print("  5. job_saved - Saved jobs by users")
        print("  6. job_categories - Job categories/industries")
        print("  7. job_post_categories - Job-to-category mapping")
        print("  8. job_analytics - Daily analytics per job")
        print("\n" + "=" * 60)

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error creating tables: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate()
