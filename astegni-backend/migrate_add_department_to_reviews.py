"""
Add department column to admin_reviews table
This allows filtering reviews by both admin_id AND department
since one admin can be in multiple departments
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

def migrate():
    # Parse DATABASE_URL
    if DATABASE_URL.startswith("postgresql://"):
        database_url = DATABASE_URL.replace("postgresql://", "")
    else:
        database_url = DATABASE_URL

    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_part = host_db.split("/")
    db_name = db_part.split("?")[0]

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    conn = psycopg.connect(
        dbname=db_name,
        user=user,
        password=password,
        host=host,
        port=port
    )
    cursor = conn.cursor()

    try:
        print("=" * 80)
        print("Adding 'department' column to admin_reviews table")
        print("=" * 80)

        # Step 1: Add department column
        print("\n[1/3] Adding department column (VARCHAR 100)...")
        cursor.execute("""
            ALTER TABLE admin_reviews
            ADD COLUMN IF NOT EXISTS department VARCHAR(100)
        """)
        conn.commit()
        print("[OK] Added department column")

        # Step 2: Create index for department filtering
        print("\n[2/3] Creating index on (admin_id, department)...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_admin_reviews_admin_dept
            ON admin_reviews(admin_id, department)
        """)
        conn.commit()
        print("[OK] Created index")

        # Step 3: Update existing reviews with default department
        print("\n[3/3] Updating existing reviews...")
        cursor.execute("""
            UPDATE admin_reviews
            SET department = 'manage-courses'
            WHERE department IS NULL
        """)
        rows_updated = cursor.rowcount
        conn.commit()
        print(f"[OK] Updated {rows_updated} existing reviews with default department")

        print("\n" + "=" * 80)
        print("[SUCCESS] Migration completed!")
        print("=" * 80)
        print("\nChanges made:")
        print("✓ Added 'department' VARCHAR(100) column to admin_reviews")
        print("✓ Created index on (admin_id, department) for fast filtering")
        print(f"✓ Updated {rows_updated} existing reviews with default department")
        print("\nNow reviews can be filtered by admin_id AND department:")
        print("  - manage-tutors reviews only show in Tutor Management panel")
        print("  - manage-courses reviews only show in Course Management panel")
        print("  - Each department's reviews are isolated")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] {e}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
