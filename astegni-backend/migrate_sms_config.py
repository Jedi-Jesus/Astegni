"""
Migration: Create system_sms_config and system_sms_log tables
Run this migration to add SMS configuration support
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("Creating system_sms_config table...")

        # Create system_sms_config table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_sms_config (
                id INTEGER PRIMARY KEY DEFAULT 1,
                twilio_account_sid VARCHAR(255) NOT NULL DEFAULT '',
                twilio_auth_token VARCHAR(255) NOT NULL DEFAULT '',
                twilio_from_number VARCHAR(50) NOT NULL DEFAULT '',
                default_country_code VARCHAR(10) NOT NULL DEFAULT '+251',
                enabled BOOLEAN NOT NULL DEFAULT TRUE,
                daily_limit INTEGER NOT NULL DEFAULT 1000,
                otp_expiry_minutes INTEGER NOT NULL DEFAULT 5,
                otp_length INTEGER NOT NULL DEFAULT 6,
                otp_numeric_only BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT single_sms_config CHECK (id = 1)
            );
        """)

        print("✅ system_sms_config table created")

        print("Creating system_sms_log table...")

        # Create system_sms_log table for tracking SMS messages
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_sms_log (
                id SERIAL PRIMARY KEY,
                phone_number VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                twilio_sid VARCHAR(255),
                error_message TEXT,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                delivered_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        print("✅ system_sms_log table created")

        print("Creating indexes...")

        # Create indexes for better query performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sms_log_sent_at ON system_sms_log(sent_at);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sms_log_status ON system_sms_log(status);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sms_log_phone ON system_sms_log(phone_number);
        """)

        print("✅ Indexes created")

        # Insert default SMS configuration
        print("Inserting default SMS configuration...")
        cursor.execute("""
            INSERT INTO system_sms_config (
                id, twilio_account_sid, twilio_auth_token, twilio_from_number,
                default_country_code, enabled, daily_limit, otp_expiry_minutes,
                otp_length, otp_numeric_only
            ) VALUES (1, '', '', '', '+251', TRUE, 1000, 5, 6, TRUE)
            ON CONFLICT (id) DO NOTHING
        """)

        print("✅ Default SMS configuration inserted")

        conn.commit()
        print("\n✅ SMS configuration migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error during migration: {str(e)}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
