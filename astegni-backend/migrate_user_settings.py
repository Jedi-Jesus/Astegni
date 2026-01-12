"""
Migration: User Settings Tables
Creates tables and columns for:
- Two-Factor Authentication
- User Sessions (login activity)
- Login History
- User Settings (appearance, language)
- Platform Reviews
"""

import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

load_dotenv()

def get_connection(use_remote=False):
    """
    Get database connection.

    Args:
        use_remote: If True, connects to production server (DB_HOST from .env)
                   If False, connects to localhost for local development
    """
    # Determine host based on environment
    if use_remote:
        host = os.getenv("DB_HOST", "128.140.122.215")  # Production server
    else:
        host = "localhost"  # Local development

    port = os.getenv("DB_PORT", "5432")
    user = os.getenv("DB_USER", "astegni_user")
    password = os.getenv("DB_PASSWORD", "Astegni2025")
    dbname = os.getenv("DB_NAME", "astegni_user_db")

    print(f"Connecting to: {host}:{port}/{dbname} as {user}")

    return psycopg2.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=dbname
    )

def run_migration(use_remote=False):
    conn = get_connection(use_remote=use_remote)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()

    print("Starting User Settings Migration...")

    # ==========================================
    # 1. Add 2FA columns to users table
    # ==========================================
    print("\n1. Adding 2FA columns to users table...")

    two_fa_columns = [
        ("two_factor_enabled", "BOOLEAN DEFAULT FALSE"),
        ("two_factor_method", "VARCHAR(20)"),  # 'sms', 'email', 'authenticator'
        ("two_factor_secret", "VARCHAR(100)"),  # For authenticator apps
        ("two_factor_backup_codes", "TEXT"),  # JSON array of backup codes
        ("two_factor_temp_code", "VARCHAR(10)"),  # Temporary OTP code
        ("two_factor_temp_expiry", "TIMESTAMP"),  # OTP expiry time
        ("has_password", "BOOLEAN DEFAULT TRUE"),  # For OAuth users
    ]

    for col_name, col_type in two_fa_columns:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type}")
            print(f"  - Added column: {col_name}")
        except Exception as e:
            print(f"  - Column {col_name} might already exist: {e}")

    # ==========================================
    # 2. Create user_sessions table
    # ==========================================
    print("\n2. Creating user_sessions table...")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            token_jti VARCHAR(100) UNIQUE,
            device_type VARCHAR(20),
            device_name VARCHAR(100),
            os VARCHAR(50),
            browser VARCHAR(50),
            ip_address VARCHAR(50),
            location VARCHAR(100),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        )
    """)
    print("  - Created user_sessions table")

    # Create index for faster lookups
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
        ON user_sessions(user_id)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_sessions_token
        ON user_sessions(token_jti)
    """)
    print("  - Created indexes for user_sessions")

    # ==========================================
    # 3. Create login_history table
    # ==========================================
    print("\n3. Creating login_history table...")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS login_history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            success BOOLEAN DEFAULT TRUE,
            device VARCHAR(100),
            os VARCHAR(50),
            browser VARCHAR(50),
            ip_address VARCHAR(50),
            location VARCHAR(100),
            failure_reason VARCHAR(200),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("  - Created login_history table")

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_login_history_user_id
        ON login_history(user_id)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_login_history_timestamp
        ON login_history(timestamp)
    """)
    print("  - Created indexes for login_history")

    # ==========================================
    # 4. Create user_settings table
    # ==========================================
    print("\n4. Creating user_settings table...")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_settings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            appearance TEXT,  -- JSON: theme, fontSize, density, accentColor, animations, reduceMotion, sidebarPosition
            language TEXT,  -- JSON: ui_language, auto_translate, translate_posts, translate_reviews, translate_messages
            notifications TEXT,  -- JSON: email_notifications, push_notifications, etc.
            privacy TEXT,  -- JSON: profile_visibility, search_visibility, etc.
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("  - Created user_settings table")

    # ==========================================
    # 5. Create platform_reviews table
    # ==========================================
    print("\n5. Creating platform_reviews table...")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS platform_reviews (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
            category_ratings TEXT,  -- JSON: ease, features, support, value
            text TEXT,
            feature_suggestions TEXT,  -- JSON array
            recommends BOOLEAN,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        )
    """)
    print("  - Created platform_reviews table")

    # ==========================================
    # 6. Add export-related columns to users
    # ==========================================
    print("\n6. Adding data export columns to users table...")

    export_columns = [
        ("export_verification_code", "VARCHAR(10)"),
        ("export_verification_expiry", "TIMESTAMP"),
    ]

    for col_name, col_type in export_columns:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type}")
            print(f"  - Added column: {col_name}")
        except Exception as e:
            print(f"  - Column {col_name} might already exist: {e}")

    # ==========================================
    # Summary
    # ==========================================
    print("\n" + "="*50)
    print("Migration completed successfully!")
    print("="*50)
    print("\nTables created/updated:")
    print("  - users (added 2FA and export columns)")
    print("  - user_sessions (new)")
    print("  - login_history (new)")
    print("  - user_settings (new)")
    print("  - platform_reviews (new)")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    import sys

    # Check for --remote flag
    use_remote = "--remote" in sys.argv or "-r" in sys.argv

    if use_remote:
        print("=" * 50)
        print("PRODUCTION MODE - Connecting to remote server")
        print("=" * 50)
        confirm = input("Are you sure you want to run migration on PRODUCTION? (yes/no): ")
        if confirm.lower() != "yes":
            print("Migration cancelled.")
            sys.exit(0)

    run_migration(use_remote=use_remote)
