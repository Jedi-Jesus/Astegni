"""
Database migration to enhance tutor profile with comprehensive data fields
Adds hero section, detailed stats, metrics, and related tables for reviews, activities, and schedules
"""

import sys
import os

# Add the modules directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from sqlalchemy import (
    Column, Integer, String, DateTime, Float, Boolean, Text, JSON,
    ForeignKey, Date, Time, create_engine, text
)
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from config import DATABASE_URL

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_migration():
    """Run the migration to add new tutor profile fields and tables"""
    db = SessionLocal()

    try:
        print("Starting tutor profile enhancement migration...")

        # Add new columns to tutor_profiles table
        print("\n1. Adding hero section fields to tutor_profiles...")
        hero_fields = [
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS hero_title TEXT DEFAULT 'Excellence in Education, Delivered with Passion'",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS hero_subtitle TEXT DEFAULT 'Empowering students through personalized learning and expert guidance'",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS students_taught INTEGER DEFAULT 0",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS courses_created INTEGER DEFAULT 0"
        ]

        for query in hero_fields:
            db.execute(text(query))
            print(f"  ✓ {query.split('ADD COLUMN IF NOT EXISTS')[1].split()[0]}")

        # Add detailed rating metrics
        print("\n2. Adding rating metrics to tutor_profiles...")
        metrics_fields = [
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS retention_score FLOAT DEFAULT 0.0",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS discipline_score FLOAT DEFAULT 0.0",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS punctuality_score FLOAT DEFAULT 0.0",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS subject_matter_score FLOAT DEFAULT 0.0",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS communication_score FLOAT DEFAULT 0.0"
        ]

        for query in metrics_fields:
            db.execute(text(query))
            print(f"  ✓ {query.split('ADD COLUMN IF NOT EXISTS')[1].split()[0]}")

        # Add dashboard statistics
        print("\n3. Adding dashboard statistics to tutor_profiles...")
        stats_fields = [
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS current_students INTEGER DEFAULT 0",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS success_rate FLOAT DEFAULT 0.0",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS monthly_earnings FLOAT DEFAULT 0.0",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS total_hours_taught FLOAT DEFAULT 0.0",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS response_time_hours INTEGER DEFAULT 24"
        ]

        for query in stats_fields:
            db.execute(text(query))
            print(f"  ✓ {query.split('ADD COLUMN IF NOT EXISTS')[1].split()[0]}")

        # Add weekly and streak stats
        print("\n4. Adding weekly stats and streaks to tutor_profiles...")
        weekly_fields = [
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS sessions_this_week INTEGER DEFAULT 0",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS hours_this_week FLOAT DEFAULT 0.0",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS attendance_rate FLOAT DEFAULT 0.0",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS teaching_streak_days INTEGER DEFAULT 0",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS weekly_goal_progress FLOAT DEFAULT 0.0"
        ]

        for query in weekly_fields:
            db.execute(text(query))
            print(f"  ✓ {query.split('ADD COLUMN IF NOT EXISTS')[1].split()[0]}")

        # Add connection stats
        print("\n5. Adding connection statistics to tutor_profiles...")
        connection_fields = [
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS total_connections INTEGER DEFAULT 0",
            "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS total_colleagues INTEGER DEFAULT 0"
        ]

        for query in connection_fields:
            db.execute(text(query))
            print(f"  ✓ {query.split('ADD COLUMN IF NOT EXISTS')[1].split()[0]}")

        # Create tutor_reviews table
        print("\n6. Creating tutor_reviews table...")
        create_reviews_table = """
        CREATE TABLE IF NOT EXISTS tutor_reviews (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
            student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            session_id INTEGER REFERENCES tutoring_sessions(id) ON DELETE SET NULL,

            -- Review Details
            rating FLOAT NOT NULL CHECK (rating >= 0 AND rating <= 5),
            title VARCHAR(255),
            review_text TEXT NOT NULL,

            -- Detailed Ratings
            retention_rating FLOAT DEFAULT 0.0 CHECK (retention_rating >= 0 AND retention_rating <= 5),
            discipline_rating FLOAT DEFAULT 0.0 CHECK (discipline_rating >= 0 AND discipline_rating <= 5),
            punctuality_rating FLOAT DEFAULT 0.0 CHECK (punctuality_rating >= 0 AND punctuality_rating <= 5),
            subject_matter_rating FLOAT DEFAULT 0.0 CHECK (subject_matter_rating >= 0 AND subject_matter_rating <= 5),
            communication_rating FLOAT DEFAULT 0.0 CHECK (communication_rating >= 0 AND communication_rating <= 5),

            -- Metadata
            is_verified BOOLEAN DEFAULT FALSE,
            helpful_count INTEGER DEFAULT 0,
            is_featured BOOLEAN DEFAULT FALSE,

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        db.execute(text(create_reviews_table))
        print("  ✓ tutor_reviews table created")

        # Create indexes for reviews
        print("  ✓ Creating indexes for tutor_reviews...")
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_tutor_reviews_tutor_id ON tutor_reviews(tutor_id)"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_tutor_reviews_student_id ON tutor_reviews(student_id)"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_tutor_reviews_created_at ON tutor_reviews(created_at DESC)"))

        # Create tutor_activities table
        print("\n7. Creating tutor_activities table...")
        create_activities_table = """
        CREATE TABLE IF NOT EXISTS tutor_activities (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,

            -- Activity Details
            activity_type VARCHAR(50) NOT NULL,  -- enrollment, review, payment, session_request, etc.
            title VARCHAR(255) NOT NULL,
            description TEXT,
            icon VARCHAR(50),  -- emoji or icon class
            color VARCHAR(50),  -- for UI display

            -- Related Entity (optional)
            related_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            related_session_id INTEGER REFERENCES tutoring_sessions(id) ON DELETE SET NULL,

            -- Metadata
            amount FLOAT,  -- for payment activities
            is_read BOOLEAN DEFAULT FALSE,

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        db.execute(text(create_activities_table))
        print("  ✓ tutor_activities table created")

        # Create indexes for activities
        print("  ✓ Creating indexes for tutor_activities...")
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_tutor_activities_tutor_id ON tutor_activities(tutor_id)"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_tutor_activities_created_at ON tutor_activities(created_at DESC)"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_tutor_activities_type ON tutor_activities(activity_type)"))

        # Create tutor_schedules table
        print("\n8. Creating tutor_schedules table...")
        create_schedules_table = """
        CREATE TABLE IF NOT EXISTS tutor_schedules (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,

            -- Schedule Details
            schedule_date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            subject VARCHAR(100),
            grade_level VARCHAR(50),
            session_format VARCHAR(50),  -- Online, In-person, Hybrid

            -- Student Info (if session is booked)
            student_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            student_name VARCHAR(255),

            -- Session Details
            meeting_link VARCHAR(500),
            location VARCHAR(255),
            notes TEXT,

            -- Status
            status VARCHAR(50) DEFAULT 'scheduled',  -- scheduled, completed, cancelled, in_progress
            is_recurring BOOLEAN DEFAULT FALSE,
            recurrence_pattern VARCHAR(100),  -- e.g., "weekly", "daily"

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        db.execute(text(create_schedules_table))
        db.commit()  # Commit table creation before adding indexes
        print("  ✓ tutor_schedules table created")

        # Create indexes for schedules
        print("  ✓ Creating indexes for tutor_schedules...")
        try:
            db.execute(text("CREATE INDEX IF NOT EXISTS idx_tutor_schedules_tutor_id ON tutor_schedules(tutor_id)"))
            db.execute(text("CREATE INDEX IF NOT EXISTS idx_tutor_schedules_date ON tutor_schedules(schedule_date)"))
            db.execute(text("CREATE INDEX IF NOT EXISTS idx_tutor_schedules_status ON tutor_schedules(status)"))
            db.commit()
        except Exception as idx_error:
            print(f"  ⚠ Warning: Could not create some indexes: {idx_error}")
            db.rollback()

        # Final commit
        db.commit()
        print("\n✅ Migration completed successfully!")
        print("\nNew tables created:")
        print("  - tutor_reviews (for student reviews and ratings)")
        print("  - tutor_activities (for activity tracking)")
        print("  - tutor_schedules (for daily schedule management)")
        print("\nNew fields added to tutor_profiles:")
        print("  - Hero section: hero_title, hero_subtitle, students_taught, courses_created")
        print("  - Rating metrics: retention_score, discipline_score, punctuality_score, subject_matter_score, communication_score")
        print("  - Dashboard stats: current_students, success_rate, monthly_earnings, total_hours_taught")
        print("  - Weekly stats: sessions_this_week, hours_this_week, attendance_rate, teaching_streak_days")
        print("  - Connection stats: total_connections, total_colleagues")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Migration failed: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
