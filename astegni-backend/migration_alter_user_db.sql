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
