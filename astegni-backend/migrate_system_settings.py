"""
Migration: Create System Settings Tables
Creates comprehensive database schema for manage-system-settings.html
All settings panels will read from database with 0 values if no data exists
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

# Convert postgresql:// to postgresql+psycopg://
if DATABASE_URL and DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://', 1)

# Create engine
engine = create_engine(DATABASE_URL, echo=True)
Session = sessionmaker(bind=engine)
session = Session()

def create_system_settings_tables():
    """Create all system settings tables"""

    print("Creating System Settings Tables...")

    # 1. GENERAL SETTINGS TABLE
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_general_settings (
            id SERIAL PRIMARY KEY,
            platform_name VARCHAR(255) DEFAULT 'Astegni',
            platform_tagline VARCHAR(500),
            platform_description TEXT,
            primary_language VARCHAR(50) DEFAULT 'English',
            timezone VARCHAR(100) DEFAULT 'Africa/Addis_Ababa',
            date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD',
            time_format VARCHAR(50) DEFAULT '24h',
            currency VARCHAR(10) DEFAULT 'ETB',
            currency_symbol VARCHAR(10) DEFAULT 'ETB',
            items_per_page INTEGER DEFAULT 15,
            max_upload_size_mb INTEGER DEFAULT 200,
            allowed_file_types JSON DEFAULT '["jpg", "jpeg", "png", "gif", "mp4", "mov", "pdf", "doc", "docx"]'::jsonb,
            maintenance_mode BOOLEAN DEFAULT false,
            registration_enabled BOOLEAN DEFAULT true,
            email_verification_required BOOLEAN DEFAULT true,
            phone_verification_required BOOLEAN DEFAULT false,
            contact_email JSONB DEFAULT '[]'::jsonb,
            contact_phone JSONB DEFAULT '[]'::jsonb,
            admin_email VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 2. MEDIA MANAGEMENT SETTINGS
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_media_settings (
            id SERIAL PRIMARY KEY,
            tier_name VARCHAR(100) UNIQUE NOT NULL,
            max_image_size_mb INTEGER DEFAULT 5,
            max_video_size_mb INTEGER DEFAULT 200,
            max_document_size_mb INTEGER DEFAULT 10,
            max_audio_size_mb INTEGER DEFAULT 50,
            storage_limit_gb INTEGER DEFAULT 10,
            allowed_video_formats JSON DEFAULT '["mp4", "mov", "avi", "webm"]'::jsonb,
            allowed_image_formats JSON DEFAULT '["jpg", "jpeg", "png", "gif", "webp"]'::jsonb,
            allowed_document_formats JSON DEFAULT '["pdf", "doc", "docx", "txt"]'::jsonb,
            allowed_audio_formats JSON DEFAULT '["mp3", "wav", "ogg", "m4a"]'::jsonb,
            video_quality_max VARCHAR(50) DEFAULT '1080p',
            auto_optimize_images BOOLEAN DEFAULT true,
            auto_generate_thumbnails BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 3. EMAIL CONFIGURATION
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_email_config (
            id SERIAL PRIMARY KEY,
            smtp_host VARCHAR(255),
            smtp_port INTEGER DEFAULT 587,
            smtp_username VARCHAR(255),
            smtp_password VARCHAR(255),
            smtp_encryption VARCHAR(10) DEFAULT 'TLS',
            from_email VARCHAR(255),
            from_name VARCHAR(255) DEFAULT 'Astegni',
            reply_to_email VARCHAR(255),
            daily_limit INTEGER DEFAULT 1000,
            enabled BOOLEAN DEFAULT true,
            test_mode BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 4. EMAIL TEMPLATES
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_email_templates (
            id SERIAL PRIMARY KEY,
            template_name VARCHAR(100) UNIQUE NOT NULL,
            subject VARCHAR(500) NOT NULL,
            body TEXT NOT NULL,
            variables JSON DEFAULT '[]'::jsonb,
            enabled BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 5. PAYMENT GATEWAYS
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_payment_gateways (
            id SERIAL PRIMARY KEY,
            gateway_name VARCHAR(100) UNIQUE NOT NULL,
            display_name VARCHAR(200),
            gateway_type VARCHAR(50),
            api_key VARCHAR(500),
            api_secret VARCHAR(500),
            webhook_secret VARCHAR(500),
            test_mode BOOLEAN DEFAULT true,
            enabled BOOLEAN DEFAULT false,
            supported_currencies JSON DEFAULT '["ETB"]'::jsonb,
            config JSON DEFAULT '{}'::jsonb,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 6. SUBSCRIPTION TIERS
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_subscription_tiers (
            id SERIAL PRIMARY KEY,
            tier_name VARCHAR(100) UNIQUE NOT NULL,
            display_name VARCHAR(200),
            description TEXT,
            price_monthly DECIMAL(10, 2) DEFAULT 0.00,
            price_yearly DECIMAL(10, 2) DEFAULT 0.00,
            features JSON DEFAULT '[]'::jsonb,
            limits JSON DEFAULT '{}'::jsonb,
            is_active BOOLEAN DEFAULT true,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 7. AFFILIATE SETTINGS
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_affiliate_settings (
            id SERIAL PRIMARY KEY,
            program_name VARCHAR(200) DEFAULT 'Astegni Affiliate Program',
            commission_rate DECIMAL(5, 2) DEFAULT 10.00,
            commission_type VARCHAR(50) DEFAULT 'percentage',
            min_payout DECIMAL(10, 2) DEFAULT 500.00,
            cookie_duration_days INTEGER DEFAULT 30,
            enabled BOOLEAN DEFAULT false,
            auto_approve BOOLEAN DEFAULT false,
            payment_method VARCHAR(100),
            payment_schedule VARCHAR(50) DEFAULT 'monthly',
            terms_and_conditions TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 8. SECURITY SETTINGS
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_security_settings (
            id SERIAL PRIMARY KEY,
            two_factor_auth_enabled BOOLEAN DEFAULT false,
            two_factor_required_for_admins BOOLEAN DEFAULT true,
            session_timeout_minutes INTEGER DEFAULT 30,
            max_login_attempts INTEGER DEFAULT 5,
            lockout_duration_minutes INTEGER DEFAULT 30,
            password_min_length INTEGER DEFAULT 8,
            password_require_uppercase BOOLEAN DEFAULT true,
            password_require_lowercase BOOLEAN DEFAULT true,
            password_require_numbers BOOLEAN DEFAULT true,
            password_require_special BOOLEAN DEFAULT true,
            password_expiry_days INTEGER DEFAULT 90,
            ip_whitelist JSON DEFAULT '[]'::jsonb,
            ip_blacklist JSON DEFAULT '[]'::jsonb,
            allowed_domains JSON DEFAULT '[]'::jsonb,
            csrf_protection BOOLEAN DEFAULT true,
            rate_limiting_enabled BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 9. BACKUP CONFIGURATION
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_backup_config (
            id SERIAL PRIMARY KEY,
            auto_backup_enabled BOOLEAN DEFAULT true,
            backup_frequency VARCHAR(50) DEFAULT 'daily',
            backup_time VARCHAR(10) DEFAULT '02:00',
            backup_retention_days INTEGER DEFAULT 30,
            backup_location VARCHAR(500),
            include_media BOOLEAN DEFAULT false,
            include_database BOOLEAN DEFAULT true,
            include_logs BOOLEAN DEFAULT false,
            compression_enabled BOOLEAN DEFAULT true,
            encryption_enabled BOOLEAN DEFAULT false,
            last_backup_at TIMESTAMP,
            next_backup_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 10. BACKUP HISTORY
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_backup_history (
            id SERIAL PRIMARY KEY,
            backup_type VARCHAR(50),
            backup_size_mb DECIMAL(10, 2),
            backup_location VARCHAR(500),
            status VARCHAR(50) DEFAULT 'completed',
            error_message TEXT,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 11. API SETTINGS
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_api_settings (
            id SERIAL PRIMARY KEY,
            api_enabled BOOLEAN DEFAULT true,
            rate_limit_per_minute INTEGER DEFAULT 100,
            rate_limit_per_hour INTEGER DEFAULT 5000,
            require_api_key BOOLEAN DEFAULT true,
            cors_enabled BOOLEAN DEFAULT true,
            allowed_origins JSON DEFAULT '["*"]'::jsonb,
            webhook_enabled BOOLEAN DEFAULT false,
            webhook_secret VARCHAR(500),
            api_version VARCHAR(20) DEFAULT 'v1',
            documentation_url VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 12. API KEYS
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_api_keys (
            id SERIAL PRIMARY KEY,
            key_name VARCHAR(200) NOT NULL,
            api_key VARCHAR(500) UNIQUE NOT NULL,
            api_secret VARCHAR(500),
            user_id INTEGER REFERENCES users(id),
            permissions JSON DEFAULT '[]'::jsonb,
            rate_limit_override INTEGER,
            is_active BOOLEAN DEFAULT true,
            expires_at TIMESTAMP,
            last_used_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 13. THIRD-PARTY INTEGRATIONS
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_integrations (
            id SERIAL PRIMARY KEY,
            service_name VARCHAR(100) UNIQUE NOT NULL,
            display_name VARCHAR(200),
            service_type VARCHAR(50),
            api_key VARCHAR(500),
            api_secret VARCHAR(500),
            config JSON DEFAULT '{}'::jsonb,
            enabled BOOLEAN DEFAULT false,
            last_sync_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 14. MAINTENANCE MODE
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_maintenance (
            id SERIAL PRIMARY KEY,
            is_active BOOLEAN DEFAULT false,
            message TEXT,
            allowed_ips JSON DEFAULT '[]'::jsonb,
            bypass_roles JSON DEFAULT '["super_admin"]'::jsonb,
            scheduled_start TIMESTAMP,
            scheduled_end TIMESTAMP,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 15. SYSTEM LOGS
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_logs (
            id SERIAL PRIMARY KEY,
            log_level VARCHAR(20) DEFAULT 'info',
            log_type VARCHAR(50),
            message TEXT,
            user_id INTEGER REFERENCES users(id),
            ip_address VARCHAR(50),
            user_agent TEXT,
            request_method VARCHAR(10),
            request_url TEXT,
            response_code INTEGER,
            duration_ms INTEGER,
            metadata JSON DEFAULT '{}'::jsonb,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 16. PERFORMANCE METRICS
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_performance_metrics (
            id SERIAL PRIMARY KEY,
            metric_type VARCHAR(50),
            metric_name VARCHAR(200),
            metric_value DECIMAL(15, 2),
            unit VARCHAR(50),
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata JSON DEFAULT '{}'::jsonb
        );
    """))

    # 17. SYSTEM STATISTICS
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_statistics (
            id SERIAL PRIMARY KEY,
            stat_date DATE UNIQUE DEFAULT CURRENT_DATE,
            total_users INTEGER DEFAULT 0,
            total_students INTEGER DEFAULT 0,
            total_tutors INTEGER DEFAULT 0,
            total_parents INTEGER DEFAULT 0,
            total_advertisers INTEGER DEFAULT 0,
            total_admins INTEGER DEFAULT 0,
            active_users_today INTEGER DEFAULT 0,
            new_users_today INTEGER DEFAULT 0,
            total_videos INTEGER DEFAULT 0,
            total_courses INTEGER DEFAULT 0,
            total_reviews INTEGER DEFAULT 0,
            total_revenue DECIMAL(15, 2) DEFAULT 0.00,
            storage_used_gb DECIMAL(10, 2) DEFAULT 0.00,
            bandwidth_used_gb DECIMAL(10, 2) DEFAULT 0.00,
            api_calls_today INTEGER DEFAULT 0,
            error_count_today INTEGER DEFAULT 0,
            avg_response_time_ms DECIMAL(10, 2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 18. IMPRESSIONS TRACKING
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_impressions (
            id SERIAL PRIMARY KEY,
            content_type VARCHAR(50),
            content_id INTEGER,
            user_id INTEGER REFERENCES users(id),
            session_id VARCHAR(255),
            ip_address VARCHAR(50),
            user_agent TEXT,
            referer TEXT,
            page_url TEXT,
            view_duration_seconds INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 19. IMPRESSION STATISTICS
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS system_impression_stats (
            id SERIAL PRIMARY KEY,
            stat_date DATE DEFAULT CURRENT_DATE,
            content_type VARCHAR(50),
            total_impressions INTEGER DEFAULT 0,
            unique_users INTEGER DEFAULT 0,
            avg_duration_seconds DECIMAL(10, 2) DEFAULT 0.00,
            total_duration_seconds BIGINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(stat_date, content_type)
        );
    """))

    # Create indexes for better performance
    print("Creating indexes...")

    session.execute(text("CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);"))
    session.execute(text("CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);"))
    session.execute(text("CREATE INDEX IF NOT EXISTS idx_system_logs_log_level ON system_logs(log_level);"))
    session.execute(text("CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON system_performance_metrics(metric_type);"))
    session.execute(text("CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON system_performance_metrics(recorded_at DESC);"))
    session.execute(text("CREATE INDEX IF NOT EXISTS idx_impressions_content ON system_impressions(content_type, content_id);"))
    session.execute(text("CREATE INDEX IF NOT EXISTS idx_impressions_created_at ON system_impressions(created_at);"))
    session.execute(text("CREATE INDEX IF NOT EXISTS idx_impression_stats_date ON system_impression_stats(stat_date DESC);"))
    session.execute(text("CREATE INDEX IF NOT EXISTS idx_backup_history_created_at ON system_backup_history(created_at DESC);"))

    session.commit()
    print("SUCCESS: All system settings tables created successfully!")

def insert_default_data():
    """Insert default configuration data"""

    print("\nInserting default data...")

    # Default general settings
    session.execute(text("""
        INSERT INTO system_general_settings (
            platform_name, platform_tagline, platform_description,
            primary_language, timezone, contact_email
        ) VALUES (
            'Astegni',
            'Educational Excellence for Ethiopia',
            'Connecting Ethiopian students with quality tutors and educational resources',
            'English',
            'Africa/Addis_Ababa',
            '["contact@astegni.com"]'::jsonb
        ) ON CONFLICT DO NOTHING;
    """))

    # Default media tiers
    session.execute(text("""
        INSERT INTO system_media_settings (tier_name, max_video_size_mb, storage_limit_gb) VALUES
        ('free', 50, 5),
        ('basic', 100, 20),
        ('premium', 200, 100),
        ('enterprise', 500, 500)
        ON CONFLICT (tier_name) DO NOTHING;
    """))

    # Default subscription tiers
    session.execute(text("""
        INSERT INTO system_subscription_tiers (
            tier_name, display_name, price_monthly, price_yearly, features
        ) VALUES
        ('free', 'Free', 0.00, 0.00, '["Basic access", "5GB storage", "Up to 50MB videos"]'::jsonb),
        ('basic', 'Basic', 499.00, 4999.00, '["All free features", "20GB storage", "Up to 100MB videos", "Priority support"]'::jsonb),
        ('premium', 'Premium', 999.00, 9999.00, '["All basic features", "100GB storage", "Up to 200MB videos", "Advanced analytics"]'::jsonb),
        ('enterprise', 'Enterprise', 2999.00, 29999.00, '["All premium features", "500GB storage", "Unlimited videos", "Dedicated support"]'::jsonb)
        ON CONFLICT (tier_name) DO NOTHING;
    """))

    # Default security settings
    session.execute(text("""
        INSERT INTO system_security_settings (id) VALUES (1)
        ON CONFLICT DO NOTHING;
    """))

    # Default backup config
    session.execute(text("""
        INSERT INTO system_backup_config (id) VALUES (1)
        ON CONFLICT DO NOTHING;
    """))

    # Default API settings
    session.execute(text("""
        INSERT INTO system_api_settings (id) VALUES (1)
        ON CONFLICT DO NOTHING;
    """))

    # Default affiliate settings
    session.execute(text("""
        INSERT INTO system_affiliate_settings (id) VALUES (1)
        ON CONFLICT DO NOTHING;
    """))

    # Default maintenance mode (disabled)
    session.execute(text("""
        INSERT INTO system_maintenance (id, is_active, message) VALUES (
            1, false, 'System is under maintenance. We will be back soon!'
        ) ON CONFLICT DO NOTHING;
    """))

    # Initialize today's statistics with 0 values
    session.execute(text("""
        INSERT INTO system_statistics (stat_date) VALUES (CURRENT_DATE)
        ON CONFLICT (stat_date) DO NOTHING;
    """))

    # Default email templates
    session.execute(text("""
        INSERT INTO system_email_templates (template_name, subject, body, variables) VALUES
        ('welcome', 'Welcome to Astegni!', 'Hello {{name}}, welcome to Astegni platform!', '["name"]'::jsonb),
        ('verification', 'Verify Your Email', 'Please verify your email: {{verification_link}}', '["verification_link"]'::jsonb),
        ('password_reset', 'Reset Your Password', 'Click here to reset: {{reset_link}}', '["reset_link"]'::jsonb)
        ON CONFLICT (template_name) DO NOTHING;
    """))

    session.commit()
    print("SUCCESS: Default data inserted successfully!")

if __name__ == "__main__":
    try:
        create_system_settings_tables()
        insert_default_data()
        print("\nSUCCESS: Migration completed successfully!")
        print("All system settings tables are ready with default 0 values where no data exists.")
    except Exception as e:
        print(f"\nERROR: Migration failed: {e}")
        session.rollback()
    finally:
        session.close()
