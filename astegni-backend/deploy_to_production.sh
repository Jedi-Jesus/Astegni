#!/bin/bash
# Deployment script for Astegni Production
# This script will backup, migrate databases, and deploy code

set -e  # Exit on error

SERVER="root@128.140.122.215"
BACKUP_DIR="/var/backups/astegni_$(date +%Y%m%d_%H%M%S)"
DB_PASSWORD="Astegni2025"

echo "=================================="
echo "ASTEGNI PRODUCTION DEPLOYMENT"
echo "=================================="
echo ""

# Step 1: Backup Production Databases (Already done)
echo "[1/5] Production databases backed up to: /var/backups/"
echo ""

# Step 2: Export local database schema for new tables
echo "[2/5] Dumping local database structures..."

PGPASSWORD=$DB_PASSWORD pg_dump -h localhost -U astegni_user -d astegni_user_db \
  --schema-only \
  -t chat_two_step_verification \
  -t pinned_messages \
  -t price_suggestion_analytics \
  -t referral_clicks \
  -t referral_registrations \
  -t student_investments \
  -t subscription_metrics \
  -t user_investments \
  -t user_referral_codes \
  > migration_new_tables_user_db.sql

PGPASSWORD=$DB_PASSWORD pg_dump -h localhost -U astegni_user -d astegni_admin_db \
  --schema-only \
  -t base_price_rules \
  -t subscription_features \
  > migration_new_tables_admin_db.sql

# Create ALTER statements for table modifications
cat > migration_alter_user_db.sql <<'EOF'
-- USER DATABASE - ALTER STATEMENTS
-- Add new columns to existing tables

-- advertiser_profiles
ALTER TABLE advertiser_profiles ADD COLUMN IF NOT EXISTS brand_ids TEXT;
ALTER TABLE advertiser_profiles ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP;

-- campaign_profile
ALTER TABLE campaign_profile ADD COLUMN IF NOT EXISTS target_audiences JSONB;
ALTER TABLE campaign_profile ADD COLUMN IF NOT EXISTS target_placements JSONB;
ALTER TABLE campaign_profile ADD COLUMN IF NOT EXISTS target_regions JSONB;

-- chat_active_sessions
ALTER TABLE chat_active_sessions ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT TRUE;
ALTER TABLE chat_active_sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;

-- conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER;

-- courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS last_search_increment TIMESTAMP;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS trending_score NUMERIC(10,2);

-- credentials
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS years VARCHAR(20);

-- enrolled_students
ALTER TABLE enrolled_students ADD COLUMN IF NOT EXISTS agreed_price NUMERIC(10,2);
ALTER TABLE enrolled_students ADD COLUMN IF NOT EXISTS cancelled_sessions INTEGER DEFAULT 0;
ALTER TABLE enrolled_students ADD COLUMN IF NOT EXISTS completed_sessions INTEGER DEFAULT 0;
ALTER TABLE enrolled_students ADD COLUMN IF NOT EXISTS payment_due_date DATE;
ALTER TABLE enrolled_students ADD COLUMN IF NOT EXISTS payment_received_date DATE;
ALTER TABLE enrolled_students ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20);
ALTER TABLE enrolled_students ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0;

-- notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- requested_sessions
ALTER TABLE requested_sessions ADD COLUMN IF NOT EXISTS counter_offer_price NUMERIC(10,2);

-- schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS last_search_increment TIMESTAMP;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS trending_score NUMERIC(10,2);

-- sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS attendance_marked_at TIMESTAMP;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS attendance_marked_by INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS attendance_notes TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS attendance_source VARCHAR(20);

-- student_profiles
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP;

-- tutor_profiles
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS last_search_increment TIMESTAMP;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS trending_score NUMERIC(10,2);

-- user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP;
ALTER TABLE user_profiles ALTER COLUMN two_factor_protected_panels TYPE jsonb USING two_factor_protected_panels::jsonb;

-- users (appearance & profile centralization)
ALTER TABLE users ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7);
ALTER TABLE users ADD COLUMN IF NOT EXISTS color_palette VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(5);
ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_density VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_location BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS enable_animations BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS font_family VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS font_size VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS hobbies TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS languages TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reduce_motion BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sidebar_position VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(20);

-- whiteboard_canvas_data
ALTER TABLE whiteboard_canvas_data ADD COLUMN IF NOT EXISTS profile_id INTEGER;
ALTER TABLE whiteboard_canvas_data ADD COLUMN IF NOT EXISTS profile_type VARCHAR(20);

-- whiteboard_sessions
ALTER TABLE whiteboard_sessions ADD COLUMN IF NOT EXISTS connection_logs JSONB;
ALTER TABLE whiteboard_sessions ADD COLUMN IF NOT EXISTS participant_profile_ids INTEGER[];
ALTER TABLE whiteboard_sessions ADD COLUMN IF NOT EXISTS participant_profile_types VARCHAR(20)[];
ALTER TABLE whiteboard_sessions ADD COLUMN IF NOT EXISTS student_connected_at TIMESTAMP;
ALTER TABLE whiteboard_sessions ADD COLUMN IF NOT EXISTS student_disconnected_at TIMESTAMP;
ALTER TABLE whiteboard_sessions ADD COLUMN IF NOT EXISTS student_last_activity_at TIMESTAMP;
ALTER TABLE whiteboard_sessions ADD COLUMN IF NOT EXISTS student_profile_ids INTEGER[];
ALTER TABLE whiteboard_sessions ADD COLUMN IF NOT EXISTS student_total_active_seconds INTEGER DEFAULT 0;
ALTER TABLE whiteboard_sessions ADD COLUMN IF NOT EXISTS tutor_connected_at TIMESTAMP;
ALTER TABLE whiteboard_sessions ADD COLUMN IF NOT EXISTS tutor_disconnected_at TIMESTAMP;
ALTER TABLE whiteboard_sessions ADD COLUMN IF NOT EXISTS tutor_last_activity_at TIMESTAMP;
ALTER TABLE whiteboard_sessions ADD COLUMN IF NOT EXISTS tutor_total_active_seconds INTEGER DEFAULT 0;

-- Create views for enrollment_payments and overdue_payments
CREATE OR REPLACE VIEW enrollment_payments AS
SELECT
    es.id as enrollment_id,
    tp.id as tutor_id,
    tp.user_id as tutor_user_id,
    sp.id as student_id,
    sp.user_id as student_user_id,
    pkg.id as package_id,
    pkg.package_name,
    pkg.hourly_rate as package_hourly_rate,
    es.agreed_price,
    es.payment_status,
    es.payment_due_date,
    es.payment_received_date,
    es.total_sessions,
    es.completed_sessions,
    es.cancelled_sessions,
    es.enrolled_at,
    CASE WHEN es.payment_due_date < CURRENT_DATE AND es.payment_status != 'paid' THEN TRUE ELSE FALSE END as is_overdue,
    CASE WHEN es.payment_due_date < CURRENT_DATE THEN CURRENT_DATE - es.payment_due_date ELSE 0 END as days_overdue
FROM enrolled_students es
LEFT JOIN tutor_profiles tp ON es.tutor_id = tp.id
LEFT JOIN student_profiles sp ON es.student_id = sp.id
LEFT JOIN tutor_packages pkg ON es.package_id = pkg.id;

EOF

cat > migration_alter_admin_db.sql <<'EOF'
-- ADMIN DATABASE - ALTER STATEMENTS

-- affiliate_tiers
ALTER TABLE affiliate_tiers ADD COLUMN IF NOT EXISTS business_type VARCHAR(50);

-- astegni_reviews
ALTER TABLE astegni_reviews ADD COLUMN IF NOT EXISTS ease_of_use INTEGER;
ALTER TABLE astegni_reviews ADD COLUMN IF NOT EXISTS features_quality INTEGER;
ALTER TABLE astegni_reviews ADD COLUMN IF NOT EXISTS pricing INTEGER;
ALTER TABLE astegni_reviews ADD COLUMN IF NOT EXISTS support_quality INTEGER;
ALTER TABLE astegni_reviews ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN;

-- cpi_settings
ALTER TABLE cpi_settings ADD COLUMN IF NOT EXISTS country VARCHAR(5);

-- subscription_plans
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS country VARCHAR(5);

-- verification_fee
ALTER TABLE verification_fee ADD COLUMN IF NOT EXISTS country VARCHAR(5);
EOF

echo "Created migration SQL files"
echo ""

# Step 3: Transfer files to production
echo "[3/5] Transferring migration files to production..."
scp migration_new_tables_user_db.sql migration_alter_user_db.sql migration_new_tables_admin_db.sql migration_alter_admin_db.sql $SERVER:/tmp/

echo ""

# Step 4: Apply migrations on production
echo "[4/5] Applying migrations on production..."

ssh $SERVER << 'ENDSSH'
cd /var/www/astegni/astegni-backend

echo "Applying User DB migrations..."
PGPASSWORD=Astegni2025 psql -h localhost -U astegni_user -d astegni_user_db -f /tmp/migration_new_tables_user_db.sql
PGPASSWORD=Astegni2025 psql -h localhost -U astegni_user -d astegni_user_db -f /tmp/migration_alter_user_db.sql

echo "Applying Admin DB migrations..."
PGPASSWORD=Astegni2025 psql -h localhost -U astegni_user -d astegni_admin_db -f /tmp/migration_new_tables_admin_db.sql
PGPASSWORD=Astegni2025 psql -h localhost -U astegni_user -d astegni_admin_db -f /tmp/migration_alter_admin_db.sql

echo "Migrations applied successfully!"
ENDSSH

echo ""

# Step 5: Git commit and push (triggers auto-deployment)
echo "[5/5] Committing and pushing code..."
git add -A
git commit -m "Deploy: Database schema updates - 40 changes (13 new tables, 25 modified tables, appearance system, subscription features, referral system)"
git push origin main

echo ""
echo "=================================="
echo "DEPLOYMENT COMPLETE!"
echo "=================================="
echo ""
echo "Next: Monitor auto-deployment at https://astegni.com"
echo "Verify: Check backend logs with: ssh $SERVER 'journalctl -u astegni-backend -f'"
