-- Admin Database Schema (astegni_admin_db)
-- This database stores admin/system-level data separate from user data

-- ============================================================
-- Admin Users Table
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',  -- super_admin, admin, moderator, support
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Admin Activity Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admin_users(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),  -- user, tutor, content, etc.
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- System Settings
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string',  -- string, json, boolean, number
    category VARCHAR(100),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Content Moderation Queue
-- ============================================================
CREATE TABLE IF NOT EXISTS moderation_queue (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(100) NOT NULL,  -- video, blog, comment, profile
    content_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,  -- from user_db
    reason VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, rejected, flagged
    reviewed_by INTEGER REFERENCES admin_users(id),
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP
);

-- ============================================================
-- User Reports
-- ============================================================
CREATE TABLE IF NOT EXISTS user_reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL,  -- from user_db
    reported_user_id INTEGER NOT NULL,  -- from user_db
    report_type VARCHAR(100) NOT NULL,  -- spam, harassment, inappropriate, fraud
    description TEXT,
    evidence JSONB,  -- screenshots, message ids, etc.
    status VARCHAR(50) DEFAULT 'open',  -- open, investigating, resolved, dismissed
    assigned_to INTEGER REFERENCES admin_users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- ============================================================
-- Platform Analytics (Aggregated)
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    dimensions JSONB,  -- country, role, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, metric_name, dimensions)
);

-- ============================================================
-- Feature Flags
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flags (
    id SERIAL PRIMARY KEY,
    flag_name VARCHAR(100) UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 0,
    target_users JSONB,  -- specific user ids or roles
    description TEXT,
    created_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Announcements
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_audience JSONB DEFAULT '["all"]',  -- all, students, tutors, parents
    priority VARCHAR(50) DEFAULT 'normal',  -- low, normal, high, urgent
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Email Templates
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables JSONB,  -- expected variables like {{user_name}}
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Scheduled Tasks / Jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    job_type VARCHAR(100) NOT NULL,  -- email, cleanup, report, sync
    schedule VARCHAR(100),  -- cron expression
    parameters JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    status VARCHAR(50) DEFAULT 'idle',  -- idle, running, failed
    last_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Audit Trail
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_trail (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,  -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by INTEGER,  -- admin_id or user_id
    changed_by_type VARCHAR(20),  -- admin, user, system
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Support Tickets
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,  -- from user_db
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),  -- technical, billing, content, other
    priority VARCHAR(50) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'open',  -- open, in_progress, waiting, resolved, closed
    assigned_to INTEGER REFERENCES admin_users(id),
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- ============================================================
-- Support Ticket Messages
-- ============================================================
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL,  -- user, admin
    sender_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Indexes for Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON admin_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_moderation_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON platform_analytics(date);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_trail(table_name, record_id);

-- ============================================================
-- Insert Default Admin User
-- ============================================================
-- Password: Admin@Astegni2025 (hashed with bcrypt)
INSERT INTO admin_users (email, password_hash, full_name, role, permissions)
VALUES (
    'admin@astegni.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYcVwDYqKqWa',
    'System Administrator',
    'super_admin',
    '["all"]'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- Insert Default System Settings
-- ============================================================
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public)
VALUES
    ('site_name', 'Astegni Educational Platform', 'string', 'general', 'Platform name', true),
    ('maintenance_mode', 'false', 'boolean', 'system', 'Enable maintenance mode', false),
    ('registration_enabled', 'true', 'boolean', 'auth', 'Allow new user registrations', false),
    ('max_upload_size_mb', '200', 'number', 'uploads', 'Maximum file upload size in MB', false),
    ('default_language', 'en', 'string', 'localization', 'Default platform language', true),
    ('supported_languages', '["en", "am", "or", "ti"]', 'json', 'localization', 'Supported languages', true),
    ('default_currency', 'ETB', 'string', 'payment', 'Default currency', true),
    ('min_tutor_rate', '50', 'number', 'tutors', 'Minimum hourly rate in ETB', true),
    ('max_tutor_rate', '500', 'number', 'tutors', 'Maximum hourly rate in ETB', true),
    ('session_duration_minutes', '60', 'number', 'sessions', 'Default session duration', true)
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- Insert Default Email Templates
-- ============================================================
INSERT INTO email_templates (template_name, subject, body_html, body_text, variables, category)
VALUES
    ('welcome_email', 'Welcome to Astegni!', '<h1>Welcome {{user_name}}!</h1><p>Thank you for joining Astegni.</p>', 'Welcome {{user_name}}! Thank you for joining Astegni.', '["user_name"]', 'onboarding'),
    ('password_reset', 'Reset Your Password', '<h1>Password Reset</h1><p>Click <a href="{{reset_link}}">here</a> to reset your password.</p>', 'Reset your password: {{reset_link}}', '["reset_link"]', 'auth'),
    ('session_reminder', 'Upcoming Session Reminder', '<h1>Session Reminder</h1><p>Your session with {{tutor_name}} starts in {{time_until}}.</p>', 'Reminder: Session with {{tutor_name}} in {{time_until}}', '["tutor_name", "time_until"]', 'sessions')
ON CONFLICT (template_name) DO NOTHING;

COMMIT;
