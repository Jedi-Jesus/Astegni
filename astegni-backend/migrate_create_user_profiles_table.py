"""
Migration: Create user_profiles table
Description: Creates a dedicated profile table for users with the 'user' role
Date: 2025-01-18
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

def run_migration():
    """Create user_profiles table"""

    print("=" * 60)
    print("Creating user_profiles table...")
    print("=" * 60)

    create_table_sql = text("""
    CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Profile Display Fields
        profile_picture VARCHAR(500),
        cover_image VARCHAR(500),
        username VARCHAR(100) UNIQUE,
        hero_title TEXT,
        hero_subtitle TEXT,
        quote TEXT,
        about TEXT,

        -- Personal Information
        interested_in TEXT[],  -- Array of interests
        location VARCHAR(200),
        languages TEXT[],  -- Array of languages
        hobbies TEXT[],  -- Array of hobbies
        social_links JSONB,  -- {twitter: "", linkedin: "", etc.}

        -- Status Fields
        is_active BOOLEAN DEFAULT TRUE,
        is_online BOOLEAN DEFAULT FALSE,
        last_seen TIMESTAMP,

        -- Two-Factor Authentication
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_method VARCHAR(50),  -- 'email', 'sms', 'authenticator', 'inapp'
        two_factor_secret VARCHAR(255),  -- For authenticator apps
        two_factor_inapp_password VARCHAR(255),  -- For in-app password
        two_factor_backup_codes TEXT,  -- JSON array of backup codes
        two_factor_temp_code VARCHAR(10),  -- Temporary code for email/sms
        two_factor_temp_expiry TIMESTAMP,  -- Expiry for temp code
        two_factor_verification_token VARCHAR(255),  -- Token for verification
        two_factor_verification_expiry TIMESTAMP,  -- Token expiry
        two_factor_protected_panels JSONB,  -- Which panels require 2FA

        -- Subscription Fields
        subscription_plan_id INTEGER,
        subscription_started_at TIMESTAMP,
        subscription_expires_at TIMESTAMP,

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Create index on user_id for faster lookups
    create_index_sql = text("""
    CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
    """)

    # Create index on username for faster username lookups
    create_username_index_sql = text("""
    CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
    """)

    # Create trigger to auto-update updated_at timestamp
    create_trigger_sql = text("""
    CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_update_user_profiles_updated_at ON user_profiles;

    CREATE TRIGGER trigger_update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();
    """)

    try:
        with engine.connect() as conn:
            # Create table
            conn.execute(create_table_sql)
            print("[OK] user_profiles table created successfully")

            # Create indexes
            conn.execute(create_index_sql)
            print("[OK] Index on user_id created")

            conn.execute(create_username_index_sql)
            print("[OK] Index on username created")

            # Create trigger
            conn.execute(create_trigger_sql)
            print("[OK] Auto-update trigger created")

            conn.commit()

            # Verify table creation
            result = conn.execute(text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'user_profiles'
                ORDER BY ordinal_position;
            """))

            print("\n" + "=" * 60)
            print("Table structure:")
            print("=" * 60)
            for row in result:
                print(f"  {row.column_name:<35} {row.data_type}")

            print("\n" + "=" * 60)
            print("[SUCCESS] Migration completed successfully!")
            print("=" * 60)

    except Exception as e:
        print(f"[ERROR] Error creating user_profiles table: {e}")
        raise

if __name__ == "__main__":
    run_migration()
