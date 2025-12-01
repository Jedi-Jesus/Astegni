"""
Migration: Remove support_email column from system_general_settings
The support_email field is redundant since there's an "Add Email" button for contact emails.
This migration removes it from the database schema.
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

def remove_support_email_column():
    """Remove support_email column from system_general_settings table"""

    print("Removing support_email column from system_general_settings...")

    try:
        # Check if column exists first
        session.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'system_general_settings'
                    AND column_name = 'support_email'
                ) THEN
                    ALTER TABLE system_general_settings DROP COLUMN support_email;
                    RAISE NOTICE 'Column support_email has been removed';
                ELSE
                    RAISE NOTICE 'Column support_email does not exist, skipping';
                END IF;
            END $$;
        """))

        session.commit()
        print("SUCCESS: support_email column removed successfully!")

    except Exception as e:
        session.rollback()
        print(f"ERROR: Failed to remove support_email column: {e}")
        raise

if __name__ == "__main__":
    try:
        remove_support_email_column()
        print("\nMigration completed successfully!")
    except Exception as e:
        print(f"\nMigration failed: {e}")
    finally:
        session.close()
