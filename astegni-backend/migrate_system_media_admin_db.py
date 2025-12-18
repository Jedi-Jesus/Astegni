"""
Migration Script: Create system_media table in astegni_admin_db

This table stores system-wide media files (images, videos, audio, documents)
uploaded by admins for logos, covers, ads, alerts, etc.

Run: python migrate_system_media_admin_db.py
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

def get_connection():
    """Get admin database connection"""
    return psycopg.connect(ADMIN_DATABASE_URL)

def create_system_media_table():
    """Create system_media table in astegni_admin_db"""

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        print("=" * 60)
        print("CREATING SYSTEM_MEDIA TABLE IN ASTEGNI_ADMIN_DB")
        print("=" * 60)

        # Check if table already exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'system_media'
            )
        """)

        if cursor.fetchone()[0]:
            print("[SKIP] Table system_media already exists")
        else:
            cursor.execute("""
                CREATE TABLE system_media (
                    id SERIAL PRIMARY KEY,
                    uploader_id INTEGER REFERENCES admin_profile(id),

                    -- Media Type: 'image', 'video', 'audio', 'document'
                    media_type VARCHAR(50) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,

                    -- Media URLs
                    file_url VARCHAR(500) NOT NULL,
                    thumbnail VARCHAR(500),

                    -- Category: tutorial, course, success-story, tips-tricks, entertainment, news, etc.
                    category VARCHAR(100),

                    -- Target pages/profiles (JSONB array: ['homepage', 'tutor', 'student', 'parent', etc.])
                    targets JSONB DEFAULT '[]'::jsonb,

                    -- Tags for filtering (JSONB array)
                    tags JSONB DEFAULT '[]'::jsonb,

                    -- Status and visibility
                    is_active BOOLEAN DEFAULT TRUE,

                    -- Engagement metrics
                    download_count INTEGER DEFAULT 0,
                    likes INTEGER DEFAULT 0,
                    dislikes INTEGER DEFAULT 0,
                    comments JSONB DEFAULT '[]'::jsonb,
                    shares INTEGER DEFAULT 0,
                    saves INTEGER DEFAULT 0,
                    is_favorite BOOLEAN DEFAULT FALSE,

                    -- Timestamps
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
                )
            """)
            print("[OK] Created table system_media")

            # Create index on uploader_id for faster lookups
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_system_media_uploader
                ON system_media(uploader_id)
            """)
            print("[OK] Created index on uploader_id")

            # Create index on media_type for filtering
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_system_media_type
                ON system_media(media_type)
            """)
            print("[OK] Created index on media_type")

            # Create index on category for filtering
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_system_media_category
                ON system_media(category)
            """)
            print("[OK] Created index on category")

        conn.commit()
        print("\n" + "=" * 60)
        print("[OK] system_media table ready in astegni_admin_db!")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Failed to create system_media: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

def verify_table():
    """Verify table structure"""

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        print("\n" + "=" * 60)
        print("VERIFYING TABLE STRUCTURE")
        print("=" * 60)

        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'system_media'
            ORDER BY ordinal_position
        """)

        columns = cursor.fetchall()
        print("\nColumns in system_media:")
        for col in columns:
            nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
            print(f"  - {col[0]}: {col[1]} ({nullable})")

        print("\n" + "=" * 60)
        print("[OK] Verification complete!")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Verification failed: {e}")
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("\nStarting system_media Table Migration to astegni_admin_db...\n")

    # Step 1: Create table
    create_system_media_table()

    # Step 2: Verify
    verify_table()

    print("\nMigration completed successfully!\n")
