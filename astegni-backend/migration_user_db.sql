-- USER DATABASE MIGRATION
-- Generated: $(date +%Y-%m-%d)
-- IMPORTANT: Review this file before running on production!

-- CREATE NEW TABLES

-- chat_two_step_verification
CREATE TABLE IF NOT EXISTS "chat_two_step_verification" (
    "id" integer NOT NULL DEFAULT nextval('chat_two_step_verification_id_seq'::regclass),
    "user_id" integer NOT NULL,
    "is_enabled" boolean NOT NULL DEFAULT false,
    "secret_key" character varying(255),
    "backup_codes" ARRAY,
    "created_at" timestamp without time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
    "last_verified_at" timestamp without time zone,
    "password_hash" character varying(255),
    "recovery_email" character varying(255),
    FOREIGN KEY ("user_id") REFERENCES "users"("id"),
    PRIMARY KEY ("id")
);


-- credentials_backup_role_based
CREATE TABLE IF NOT EXISTS "credentials_backup_role_based" (
    "id" integer,
    "uploader_id" integer,
    "uploader_role" character varying(50),
    "document_type" character varying(100),
    "title" character varying(255),
    "description" text,
    "issued_by" character varying(255),
    "date_of_issue" date,
    "expiry_date" date,
    "document_url" text,
    "file_name" character varying(255),
    "file_type" character varying(100),
    "file_size" integer,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "verification_status" character varying(50),
    "is_verified" boolean,
    "is_featured" boolean,
    "status_by" integer,
    "status_reason" text,
    "status_at" timestamp with time zone,
    "verified_by_admin_id" integer,
    "is_current" boolean,
    "years" integer
);


-- enrollment_payments
CREATE TABLE IF NOT EXISTS "enrollment_payments" (
    "enrollment_id" integer,
    "tutor_id" integer,
    "tutor_user_id" integer,
    "student_id" integer,
    "student_user_id" integer,
    "package_id" integer,
    "package_name" character varying,
    "package_hourly_rate" numeric,
    "agreed_price" numeric,
    "payment_status" character varying(20),
    "payment_due_date" date,
    "payment_received_date" timestamp without time zone,
    "total_sessions" integer,
    "completed_sessions" integer,
    "cancelled_sessions" integer,
    "enrolled_at" timestamp without time zone,
    "is_overdue" boolean,
    "days_overdue" integer
);


-- overdue_payments
CREATE TABLE IF NOT EXISTS "overdue_payments" (
    "id" integer,
    "user_id" integer,
    "first_name" character varying,
    "father_name" character varying,
    "roles" json,
    "investment_type" character varying(100),
    "subscription_plan_id" integer,
    "student_payment_id" integer,
    "amount" numeric,
    "due_date" date,
    "payment_status" character varying(20),
    "days_overdue" integer,
    "late_fee" numeric,
    "actual_days_overdue" integer
);


-- pinned_messages
CREATE TABLE IF NOT EXISTS "pinned_messages" (
    "id" integer NOT NULL DEFAULT nextval('pinned_messages_id_seq'::regclass),
    "message_id" integer NOT NULL,
    "conversation_id" integer NOT NULL,
    "pinned_by_user_id" integer NOT NULL,
    "pinned_at" timestamp without time zone NOT NULL DEFAULT now(),
    FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id"),
    FOREIGN KEY ("pinned_by_user_id") REFERENCES "users"("id"),
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id"),
    PRIMARY KEY ("id")
);


-- price_suggestion_analytics
CREATE TABLE IF NOT EXISTS "price_suggestion_analytics" (
    "id" integer NOT NULL DEFAULT nextval('price_suggestion_analytics_id_seq'::regclass),
    "tutor_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "suggested_price" numeric NOT NULL,
    "market_average" numeric NOT NULL,
    "tutor_rating" numeric,
    "tutor_experience_years" integer,
    "tutor_student_count" integer,
    "time_period_months" integer NOT NULL DEFAULT 3,
    "filters_applied" text,
    "accepted" boolean DEFAULT false,
    "accepted_price" numeric,
    "accepted_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("tutor_id") REFERENCES "tutor_profiles"("id"),
    FOREIGN KEY ("user_id") REFERENCES "users"("id"),
    PRIMARY KEY ("id")
);


-- referral_clicks
CREATE TABLE IF NOT EXISTS "referral_clicks" (
    "id" integer NOT NULL DEFAULT nextval('referral_clicks_id_seq'::regclass),
    "referral_code" character varying(20) NOT NULL,
    "clicked_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "ip_address" character varying(45),
    "user_agent" text,
    "converted" boolean DEFAULT false,
    "converted_user_id" integer,
    FOREIGN KEY ("converted_user_id") REFERENCES "users"("id"),
    PRIMARY KEY ("id")
);


-- referral_registrations
CREATE TABLE IF NOT EXISTS "referral_registrations" (
    "id" integer NOT NULL DEFAULT nextval('referral_registrations_id_seq'::regclass),
    "referrer_user_id" integer NOT NULL,
    "referrer_profile_type" character varying(20) NOT NULL,
    "referral_code" character varying(20) NOT NULL,
    "referred_user_id" integer NOT NULL,
    "referred_user_email" character varying(255) NOT NULL,
    "referred_user_name" character varying(255),
    "registration_date" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "is_active" boolean DEFAULT true,
    "last_activity" timestamp without time zone,
    "notes" text,
    FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id"),
    FOREIGN KEY ("referred_user_id") REFERENCES "users"("id"),
    PRIMARY KEY ("id")
);


-- student_investments
CREATE TABLE IF NOT EXISTS "student_investments" (
    "id" integer NOT NULL DEFAULT nextval('student_investments_id_seq'::regclass),
    "student_profile_id" integer NOT NULL,
    "investment_type" character varying(50) NOT NULL,
    "investment_name" character varying(255) NOT NULL,
    "amount" numeric NOT NULL,
    "current_value" numeric DEFAULT 0,
    "roi_percentage" numeric DEFAULT 0,
    "investment_date" date NOT NULL,
    "maturity_date" date,
    "status" character varying(50) DEFAULT 'active'::character varying,
    "description" text,
    "payment_method" character varying(100),
    "transaction_id" character varying(255),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id"),
    PRIMARY KEY ("id")
);


-- subscription_metrics
CREATE TABLE IF NOT EXISTS "subscription_metrics" (
    "id" integer NOT NULL DEFAULT nextval('subscription_metrics_id_seq'::regclass),
    "investment_id" integer NOT NULL,
    "tutor_profile_id" integer NOT NULL,
    "total_impressions" integer DEFAULT 0,
    "profile_views" integer DEFAULT 0,
    "clicks" integer DEFAULT 0,
    "click_through_rate" numeric DEFAULT 0.00,
    "student_connections" integer DEFAULT 0,
    "connection_rate" numeric DEFAULT 0.00,
    "cost_per_impression" numeric DEFAULT 0.0000,
    "cost_per_click" numeric DEFAULT 0.00,
    "cost_per_connection" numeric DEFAULT 0.00,
    "period_start" timestamp without time zone NOT NULL,
    "period_end" timestamp without time zone,
    "recorded_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("tutor_profile_id") REFERENCES "tutor_profiles"("id"),
    FOREIGN KEY ("investment_id") REFERENCES "user_investments"("id"),
    PRIMARY KEY ("id")
);


-- user_investments
CREATE TABLE IF NOT EXISTS "user_investments" (
    "id" integer NOT NULL DEFAULT nextval('tutor_investments_id_seq'::regclass),
    "investment_type" character varying(100) NOT NULL,
    "investment_name" character varying(255) NOT NULL,
    "amount" numeric,
    "current_value" numeric,
    "roi_percentage" numeric,
    "investment_date" date NOT NULL,
    "maturity_date" date,
    "status" character varying(50) DEFAULT 'active'::character varying,
    "description" text,
    "risk_level" character varying(50),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "user_id" integer NOT NULL,
    "student_payment_id" integer,
    "due_date" date,
    "paid_date" timestamp without time zone,
    "payment_status" character varying(20) DEFAULT 'pending'::character varying,
    "days_overdue" integer DEFAULT 0,
    "late_fee" numeric DEFAULT 0.00,
    "payment_method" character varying(50),
    "transaction_id" character varying(100),
    "payment_gateway" character varying(50),
    "billing_cycle" character varying(20),
    "is_recurring" boolean DEFAULT false,
    "next_billing_date" date,
    "auto_renew" boolean DEFAULT false,
    "subscription_plan_id" integer,
    FOREIGN KEY ("user_id") REFERENCES "users"("id"),
    FOREIGN KEY ("student_payment_id") REFERENCES "enrolled_students"("id"),
    PRIMARY KEY ("id")
);


-- user_referral_codes
CREATE TABLE IF NOT EXISTS "user_referral_codes" (
    "id" integer NOT NULL DEFAULT nextval('user_referral_codes_id_seq'::regclass),
    "user_id" integer NOT NULL,
    "referral_code" character varying(20) NOT NULL,
    "profile_type" character varying(20) NOT NULL,
    "total_referrals" integer DEFAULT 0,
    "active_referrals" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("user_id") REFERENCES "users"("id"),
    PRIMARY KEY ("id")
);


-- whiteboard_sessions_legacy_backup_20260110_101940
CREATE TABLE IF NOT EXISTS "whiteboard_sessions_legacy_backup_20260110_101940" (
    "id" integer,
    "tutor_id" integer,
    "student_id" ARRAY,
    "created_at" timestamp without time zone
);


-- ALTER EXISTING TABLES

-- advertiser_profiles
ALTER TABLE "advertiser_profiles" ADD COLUMN IF NOT EXISTS brand_ids TEXT;
ALTER TABLE "advertiser_profiles" ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP;
-- ALTER TABLE "advertiser_profiles" DROP COLUMN IF EXISTS "location";  -- COMMENTED: Manual review required
-- ALTER TABLE "advertiser_profiles" DROP COLUMN IF EXISTS "profile_picture";  -- COMMENTED: Manual review required
-- ALTER TABLE "advertiser_profiles" DROP COLUMN IF EXISTS "socials";  -- COMMENTED: Manual review required

-- campaign_profile
ALTER TABLE "campaign_profile" ADD COLUMN IF NOT EXISTS target_audiences JSONB;
ALTER TABLE "campaign_profile" ADD COLUMN IF NOT EXISTS target_placements JSONB;
ALTER TABLE "campaign_profile" ADD COLUMN IF NOT EXISTS target_regions JSONB;
-- ALTER TABLE "campaign_profile" DROP COLUMN IF EXISTS "daily_budget";  -- COMMENTED: Manual review required

-- chat_active_sessions
ALTER TABLE "chat_active_sessions" ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT TRUE;
ALTER TABLE "chat_active_sessions" ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;
-- ALTER TABLE "chat_active_sessions" DROP COLUMN IF EXISTS "last_active";  -- COMMENTED: Manual review required

-- conversations
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER;

-- courses
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS last_search_increment TIMESTAMP;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS trending_score NUMERIC(10,2);

-- credentials
ALTER TABLE "credentials" ADD COLUMN IF NOT EXISTS years VARCHAR(20);

-- enrolled_students
ALTER TABLE "enrolled_students" ADD COLUMN IF NOT EXISTS agreed_price NUMERIC(10,2);
ALTER TABLE "enrolled_students" ADD COLUMN IF NOT EXISTS cancelled_sessions INTEGER DEFAULT 0;
ALTER TABLE "enrolled_students" ADD COLUMN IF NOT EXISTS completed_sessions INTEGER DEFAULT 0;
ALTER TABLE "enrolled_students" ADD COLUMN IF NOT EXISTS payment_due_date DATE;
ALTER TABLE "enrolled_students" ADD COLUMN IF NOT EXISTS payment_received_date DATE;
ALTER TABLE "enrolled_students" ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20);
ALTER TABLE "enrolled_students" ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0;

-- notes
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- requested_sessions
ALTER TABLE "requested_sessions" ADD COLUMN IF NOT EXISTS counter_offer_price NUMERIC(10,2);

-- schools
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS last_search_increment TIMESTAMP;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS trending_score NUMERIC(10,2);

-- sessions
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS attendance_marked_at TIMESTAMP;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS attendance_marked_by INTEGER;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS attendance_notes TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS attendance_source VARCHAR(20);

-- student_profiles
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP;
-- ALTER TABLE "student_profiles" DROP COLUMN IF EXISTS "hobbies";  -- COMMENTED: Manual review required
-- ALTER TABLE "student_profiles" DROP COLUMN IF EXISTS "languages";  -- COMMENTED: Manual review required
-- ALTER TABLE "student_profiles" DROP COLUMN IF EXISTS "location";  -- COMMENTED: Manual review required
-- ALTER TABLE "student_profiles" DROP COLUMN IF EXISTS "profile_picture";  -- COMMENTED: Manual review required

-- tutor_profiles
ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS last_search_increment TIMESTAMP;
ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP;
ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;
ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS trending_score NUMERIC(10,2);
-- ALTER TABLE "tutor_profiles" DROP COLUMN IF EXISTS "languages";  -- COMMENTED: Manual review required
-- ALTER TABLE "tutor_profiles" DROP COLUMN IF EXISTS "location";  -- COMMENTED: Manual review required
-- ALTER TABLE "tutor_profiles" DROP COLUMN IF EXISTS "profile_picture";  -- COMMENTED: Manual review required
-- ALTER TABLE "tutor_profiles" DROP COLUMN IF EXISTS "social_links";  -- COMMENTED: Manual review required
-- ALTER TABLE "tutor_profiles" DROP COLUMN IF EXISTS "subscription_expires_at";  -- COMMENTED: Manual review required
-- ALTER TABLE "tutor_profiles" DROP COLUMN IF EXISTS "subscription_plan_id";  -- COMMENTED: Manual review required
-- ALTER TABLE "tutor_profiles" DROP COLUMN IF EXISTS "subscription_started_at";  -- COMMENTED: Manual review required

-- user_profiles
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP;
-- ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "languages";  -- COMMENTED: Manual review required
-- ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "location";  -- COMMENTED: Manual review required
-- ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "profile_picture";  -- COMMENTED: Manual review required
-- ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "social_links";  -- COMMENTED: Manual review required

-- users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS color_palette VARCHAR(20);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS country_code VARCHAR(5);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS display_density VARCHAR(20);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS display_location BOOLEAN DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS enable_animations BOOLEAN DEFAULT TRUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS font_family VARCHAR(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS font_size VARCHAR(20);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS google_email VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS hobbies TEXT[];
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS languages TEXT[];
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS reduce_motion BOOLEAN DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS sidebar_position VARCHAR(20);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS social_links JSONB;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS subscription_plan_id INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS theme VARCHAR(20);

-- whiteboard_canvas_data
ALTER TABLE "whiteboard_canvas_data" ADD COLUMN IF NOT EXISTS profile_id INTEGER;
ALTER TABLE "whiteboard_canvas_data" ADD COLUMN IF NOT EXISTS profile_type VARCHAR(20);

-- whiteboard_sessions
ALTER TABLE "whiteboard_sessions" ADD COLUMN IF NOT EXISTS connection_logs JSONB;
ALTER TABLE "whiteboard_sessions" ADD COLUMN IF NOT EXISTS participant_profile_ids INTEGER[];
ALTER TABLE "whiteboard_sessions" ADD COLUMN IF NOT EXISTS participant_profile_types VARCHAR(20)[];
ALTER TABLE "whiteboard_sessions" ADD COLUMN IF NOT EXISTS student_connected_at TIMESTAMP;
ALTER TABLE "whiteboard_sessions" ADD COLUMN IF NOT EXISTS student_disconnected_at TIMESTAMP;
ALTER TABLE "whiteboard_sessions" ADD COLUMN IF NOT EXISTS student_last_activity_at TIMESTAMP;
ALTER TABLE "whiteboard_sessions" ADD COLUMN IF NOT EXISTS student_profile_ids INTEGER[];
ALTER TABLE "whiteboard_sessions" ADD COLUMN IF NOT EXISTS student_total_active_seconds INTEGER DEFAULT 0;
ALTER TABLE "whiteboard_sessions" ADD COLUMN IF NOT EXISTS tutor_connected_at TIMESTAMP;
ALTER TABLE "whiteboard_sessions" ADD COLUMN IF NOT EXISTS tutor_disconnected_at TIMESTAMP;
ALTER TABLE "whiteboard_sessions" ADD COLUMN IF NOT EXISTS tutor_last_activity_at TIMESTAMP;
ALTER TABLE "whiteboard_sessions" ADD COLUMN IF NOT EXISTS tutor_total_active_seconds INTEGER DEFAULT 0;
-- ALTER TABLE "whiteboard_sessions" DROP COLUMN IF EXISTS "attendance_status";  -- COMMENTED: Manual review required
-- ALTER TABLE "whiteboard_sessions" DROP COLUMN IF EXISTS "student_id";  -- COMMENTED: Manual review required
-- ALTER TABLE "whiteboard_sessions" DROP COLUMN IF EXISTS "tutor_id";  -- COMMENTED: Manual review required

-- DROP DEPRECATED TABLES
-- DROP TABLE IF EXISTS tutor_investments;  -- COMMENTED: Manual review required
