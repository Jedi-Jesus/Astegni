"""
Job Alerts and Notifications Migration
Creates tables for job alert subscriptions and notification preferences
"""

import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

def migrate():
    """Create job alerts and notifications tables"""

    print("🚀 Starting Job Alerts Migration...")
    print("=" * 60)

    with engine.connect() as conn:

        # ============================================
        # 1. JOB ALERTS TABLE
        # ============================================
        print("\n📋 Creating job_alerts table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS job_alerts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Alert Configuration
                alert_name VARCHAR(200),
                is_active BOOLEAN DEFAULT TRUE,

                -- Search Criteria (JSONB for flexibility)
                keywords TEXT[],  -- Array of keywords
                job_categories INTEGER[],  -- Array of category IDs
                job_type VARCHAR(50),  -- 'full-time', 'part-time', etc.
                location_type VARCHAR(50),  -- 'remote', 'on-site', 'hybrid'
                locations TEXT[],  -- Array of city/region names

                -- Salary Preferences
                min_salary INTEGER,
                max_salary INTEGER,

                -- Experience Level
                experience_level VARCHAR(50),  -- 'entry', 'mid', 'senior', 'executive'

                -- Notification Preferences
                notification_frequency VARCHAR(50) DEFAULT 'immediate',  -- 'immediate', 'daily', 'weekly'
                notify_via_email BOOLEAN DEFAULT TRUE,
                notify_via_platform BOOLEAN DEFAULT TRUE,

                -- Metadata
                last_notified_at TIMESTAMP,
                total_jobs_sent INTEGER DEFAULT 0,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Indexes
                CONSTRAINT valid_frequency CHECK (notification_frequency IN ('immediate', 'daily', 'weekly'))
            );

            CREATE INDEX IF NOT EXISTS idx_job_alerts_user_id ON job_alerts(user_id);
            CREATE INDEX IF NOT EXISTS idx_job_alerts_active ON job_alerts(is_active);
            CREATE INDEX IF NOT EXISTS idx_job_alerts_frequency ON job_alerts(notification_frequency);
        """))
        print("✅ job_alerts table created successfully")

        # ============================================
        # 2. JOB NOTIFICATIONS TABLE
        # ============================================
        print("\n📬 Creating job_notifications table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS job_notifications (
                id SERIAL PRIMARY KEY,

                -- Recipient
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Notification Type
                notification_type VARCHAR(50) NOT NULL,
                -- Types: 'new_job_match', 'application_received', 'application_status_change',
                --        'job_deadline_reminder', 'job_closed', 'job_expired'

                -- Related Entities
                job_id INTEGER REFERENCES job_posts(id) ON DELETE CASCADE,
                application_id INTEGER REFERENCES job_applications(id) ON DELETE CASCADE,
                alert_id INTEGER REFERENCES job_alerts(id) ON DELETE SET NULL,

                -- Notification Content
                title VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                action_url VARCHAR(500),  -- Deep link to relevant page

                -- Delivery Status
                is_read BOOLEAN DEFAULT FALSE,
                read_at TIMESTAMP,

                sent_via_email BOOLEAN DEFAULT FALSE,
                email_sent_at TIMESTAMP,
                email_opened BOOLEAN DEFAULT FALSE,
                email_clicked BOOLEAN DEFAULT FALSE,

                sent_via_platform BOOLEAN DEFAULT TRUE,

                -- Metadata
                metadata JSONB,  -- Additional context data

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Indexes
                CONSTRAINT valid_notification_type CHECK (notification_type IN (
                    'new_job_match', 'application_received', 'application_status_change',
                    'job_deadline_reminder', 'job_closed', 'job_expired', 'job_about_to_expire'
                ))
            );

            CREATE INDEX IF NOT EXISTS idx_job_notifications_user_id ON job_notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_job_notifications_type ON job_notifications(notification_type);
            CREATE INDEX IF NOT EXISTS idx_job_notifications_read ON job_notifications(is_read);
            CREATE INDEX IF NOT EXISTS idx_job_notifications_job_id ON job_notifications(job_id);
            CREATE INDEX IF NOT EXISTS idx_job_notifications_created ON job_notifications(created_at DESC);
        """))
        print("✅ job_notifications table created successfully")

        # ============================================
        # 3. EMAIL QUEUE TABLE
        # ============================================
        print("\n📧 Creating email_queue table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS email_queue (
                id SERIAL PRIMARY KEY,

                -- Recipient
                recipient_email VARCHAR(255) NOT NULL,
                recipient_name VARCHAR(255),
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

                -- Email Content
                subject VARCHAR(500) NOT NULL,
                body_html TEXT NOT NULL,
                body_text TEXT,  -- Plain text fallback

                -- Email Type
                email_type VARCHAR(50) NOT NULL,
                -- Types: 'job_alert', 'application_status', 'deadline_reminder', 'welcome', etc.

                -- Related Entities
                job_id INTEGER REFERENCES job_posts(id) ON DELETE SET NULL,
                notification_id INTEGER REFERENCES job_notifications(id) ON DELETE SET NULL,

                -- Delivery Status
                status VARCHAR(50) DEFAULT 'pending',
                -- Status: 'pending', 'sending', 'sent', 'failed', 'bounced'

                attempts INTEGER DEFAULT 0,
                max_attempts INTEGER DEFAULT 3,

                sent_at TIMESTAMP,
                failed_at TIMESTAMP,
                error_message TEXT,

                -- Tracking
                tracking_id UUID DEFAULT gen_random_uuid(),
                opened_at TIMESTAMP,
                clicked_at TIMESTAMP,

                -- Priority
                priority INTEGER DEFAULT 5,  -- 1 (highest) to 10 (lowest)

                -- Scheduling
                scheduled_for TIMESTAMP,  -- NULL = send immediately

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Indexes
                CONSTRAINT valid_email_status CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'bounced'))
            );

            CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
            CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority);
            CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for);
            CREATE INDEX IF NOT EXISTS idx_email_queue_tracking ON email_queue(tracking_id);
        """))
        print("✅ email_queue table created successfully")

        # ============================================
        # 4. USER NOTIFICATION PREFERENCES TABLE
        # ============================================
        print("\n⚙️ Creating user_notification_preferences table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_notification_preferences (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Email Notifications
                email_job_alerts BOOLEAN DEFAULT TRUE,
                email_application_updates BOOLEAN DEFAULT TRUE,
                email_deadline_reminders BOOLEAN DEFAULT TRUE,
                email_marketing BOOLEAN DEFAULT FALSE,

                -- Platform Notifications
                platform_job_alerts BOOLEAN DEFAULT TRUE,
                platform_application_updates BOOLEAN DEFAULT TRUE,
                platform_deadline_reminders BOOLEAN DEFAULT TRUE,
                platform_marketing BOOLEAN DEFAULT FALSE,

                -- Frequency Preferences
                digest_frequency VARCHAR(50) DEFAULT 'daily',  -- 'immediate', 'daily', 'weekly', 'never'

                -- Quiet Hours (UTC)
                quiet_hours_start TIME,  -- e.g., '22:00:00'
                quiet_hours_end TIME,    -- e.g., '08:00:00'

                -- Timezone
                timezone VARCHAR(100) DEFAULT 'Africa/Addis_Ababa',

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT valid_digest_frequency CHECK (digest_frequency IN ('immediate', 'daily', 'weekly', 'never'))
            );

            CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_user_id ON user_notification_preferences(user_id);
        """))
        print("✅ user_notification_preferences table created successfully")

        # ============================================
        # 5. JOB ALERT MATCHES TABLE (Cache)
        # ============================================
        print("\n🎯 Creating job_alert_matches table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS job_alert_matches (
                id SERIAL PRIMARY KEY,

                alert_id INTEGER NOT NULL REFERENCES job_alerts(id) ON DELETE CASCADE,
                job_id INTEGER NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,

                -- Match Quality
                match_score DECIMAL(5,2),  -- 0.00 to 100.00
                match_reasons JSONB,  -- Why this job matched

                -- Notification Status
                notified BOOLEAN DEFAULT FALSE,
                notified_at TIMESTAMP,
                notification_id INTEGER REFERENCES job_notifications(id) ON DELETE SET NULL,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Prevent duplicate matches
                UNIQUE(alert_id, job_id)
            );

            CREATE INDEX IF NOT EXISTS idx_job_alert_matches_alert_id ON job_alert_matches(alert_id);
            CREATE INDEX IF NOT EXISTS idx_job_alert_matches_job_id ON job_alert_matches(job_id);
            CREATE INDEX IF NOT EXISTS idx_job_alert_matches_notified ON job_alert_matches(notified);
        """))
        print("✅ job_alert_matches table created successfully")

        conn.commit()

    print("\n" + "=" * 60)
    print("✅ Job Alerts Migration completed successfully!")
    print("\n📊 Summary:")
    print("   ✓ job_alerts - User job alert subscriptions")
    print("   ✓ job_notifications - In-app notifications")
    print("   ✓ email_queue - Email sending queue")
    print("   ✓ user_notification_preferences - User preferences")
    print("   ✓ job_alert_matches - Cached job matches")
    print("\n🎉 5 new tables created for Job Alerts & Notifications!")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
