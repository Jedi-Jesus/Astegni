"""
Migration: Add certificate_url columns to tutor_achievements and tutor_experience tables
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not found in environment variables")

    conn = psycopg.connect(database_url)

    try:
        with conn.cursor() as cur:
            print("Adding certificate_url column to tutor_achievements table...")

            # Add certificate_url to tutor_achievements
            cur.execute("""
                ALTER TABLE tutor_achievements
                ADD COLUMN IF NOT EXISTS certificate_url VARCHAR(500);
            """)

            print("SUCCESS: Added certificate_url to tutor_achievements")

            print("Adding certificate_url column to tutor_experience table...")

            # Add certificate_url to tutor_experience
            cur.execute("""
                ALTER TABLE tutor_experience
                ADD COLUMN IF NOT EXISTS certificate_url VARCHAR(500);
            """)

            print("SUCCESS: Added certificate_url to tutor_experience")

            # Commit changes
            conn.commit()
            print("\nSUCCESS: Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: Migration failed: {str(e)}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
