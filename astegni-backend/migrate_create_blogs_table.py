"""
Migration: Create blogs table
Creates the blogs table with multi-role support
"""

import os
import sys
import psycopg
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')

def create_blogs_table():
    """Create blogs table"""

    # Connect to PostgreSQL
    conn = psycopg.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    try:
        print("=" * 70)
        print("Creating blogs table")
        print("=" * 70)

        # Create blogs table
        print("\n1. Creating blogs table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS blogs (
                id SERIAL PRIMARY KEY,
                profile_id INTEGER NOT NULL,
                role VARCHAR(50) NOT NULL CHECK (role IN ('tutor', 'student', 'parent', 'advertiser', 'institute')),
                blog_picture TEXT,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                blog_text TEXT NOT NULL,
                reading_time INTEGER DEFAULT 5,
                likes INTEGER DEFAULT 0,
                comments JSONB DEFAULT '[]'::jsonb,
                category VARCHAR(100) DEFAULT 'tutorial',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Blogs table created successfully")

        # Create indexes for better query performance
        print("\n2. Creating indexes...")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_blogs_profile_id
            ON blogs(profile_id)
        """)
        print("✅ Index on profile_id created")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_blogs_role
            ON blogs(role)
        """)
        print("✅ Index on role created")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_blogs_category
            ON blogs(category)
        """)
        print("✅ Index on category created")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_blogs_created_at
            ON blogs(created_at DESC)
        """)
        print("✅ Index on created_at created")

        # Create trigger to update updated_at timestamp
        print("\n3. Creating update trigger...")
        cur.execute("""
            CREATE OR REPLACE FUNCTION update_blogs_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)

        cur.execute("""
            DROP TRIGGER IF EXISTS blogs_updated_at_trigger ON blogs;
        """)

        cur.execute("""
            CREATE TRIGGER blogs_updated_at_trigger
            BEFORE UPDATE ON blogs
            FOR EACH ROW
            EXECUTE FUNCTION update_blogs_updated_at();
        """)
        print("✅ Update trigger created")

        print("\n" + "=" * 70)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 70)

        # Verify table structure
        print("\n4. Verifying table structure...")
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'blogs'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()

        print("\nBlogs table columns:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]} (nullable: {col[2]}, default: {col[3]})")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    create_blogs_table()
