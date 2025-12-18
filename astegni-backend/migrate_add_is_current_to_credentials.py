"""
Migration script to add is_current field to credentials table.
This field indicates if this is the tutor's current workplace/position.
Used to populate "Currently Teaches At" in the tutor card.
"""

import psycopg2
from psycopg2 import sql

# Database connection settings
DB_CONFIG = {
    "host": "localhost",
    "database": "astegni_user_db",
    "user": "astegni_user",
    "password": "Astegni2025"
}

def migrate():
    """Add is_current column to credentials table"""
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        print("=" * 60)
        print("Migration: Add is_current field to credentials table")
        print("=" * 60)

        # Check if column already exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'credentials' AND column_name = 'is_current'
        """)

        if cursor.fetchone():
            print("\n[SKIP] Column 'is_current' already exists in credentials table")
        else:
            # Add the is_current column
            print("\n[1/3] Adding 'is_current' column to credentials table...")
            cursor.execute("""
                ALTER TABLE credentials
                ADD COLUMN is_current BOOLEAN DEFAULT false
            """)
            print("      Column added successfully!")

            # Create index for faster queries
            print("\n[2/3] Creating index on is_current column...")
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_credentials_is_current
                ON credentials(uploader_id, is_current)
                WHERE is_current = true
            """)
            print("      Index created successfully!")

            # Add a comment to describe the column
            print("\n[3/3] Adding column description...")
            cursor.execute("""
                COMMENT ON COLUMN credentials.is_current IS
                'Indicates if this is the current workplace/position for the tutor. Used for Currently Teaches At display.'
            """)
            print("      Description added successfully!")

        conn.commit()

        # Verify the change
        print("\n" + "=" * 60)
        print("Verification: credentials table structure")
        print("=" * 60)
        cursor.execute("""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'credentials'
            ORDER BY ordinal_position
        """)

        columns = cursor.fetchall()
        for col in columns:
            print(f"  {col[0]}: {col[1]} (default: {col[2]}, nullable: {col[3]})")

        print("\n" + "=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Tutors can now mark their credentials with is_current=true")
        print("2. The 'Currently Teaches At' field will show the title of credentials where is_current=true")
        print("3. Update credentials_endpoints.py to handle is_current field")

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {str(e)}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate()
