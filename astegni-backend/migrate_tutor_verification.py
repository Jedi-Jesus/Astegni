"""
Migration to add verification fields to tutor_profiles table
"""

import sys
sys.path.append('.')

from sqlalchemy import create_engine, text
from config import DATABASE_URL

def migrate():
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        print("Adding verification fields to tutor_profiles table...")

        try:
            # Add verification_status column
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN IF NOT EXISTS verification_status VARCHAR DEFAULT 'pending'
            """))
            conn.commit()
            print("✓ Added verification_status column")

            # Add rejection_reason column
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN IF NOT EXISTS rejection_reason TEXT
            """))
            conn.commit()
            print("✓ Added rejection_reason column")

            # Add verified_at column
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
            """))
            conn.commit()
            print("✓ Added verified_at column")

            # Add verified_by column
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN IF NOT EXISTS verified_by INTEGER
            """))
            conn.commit()
            print("✓ Added verified_by column")

            # Add id_document_url column
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN IF NOT EXISTS id_document_url VARCHAR
            """))
            conn.commit()
            print("✓ Added id_document_url column")

            # Update existing records where is_verified is True
            conn.execute(text("""
                UPDATE tutor_profiles
                SET verification_status = 'verified'
                WHERE is_verified = TRUE AND verification_status = 'pending'
            """))
            conn.commit()
            print("✓ Updated existing verified tutors")

            print("\n✅ Migration completed successfully!")

        except Exception as e:
            print(f"❌ Error during migration: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    migrate()
