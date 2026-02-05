"""
Migration: Remove Extracurricular Type from Student Credentials

This migration converts all student 'extracurricular' credentials to 'achievement' type.

Rationale:
- Students only need two credential types: 'achievement' and 'academic_certificate'
- Extracurricular activities (clubs, volunteer work) are better suited as achievements
- This aligns backend data with frontend UI which only shows achievements and academic certificates

Changes:
1. Convert all credentials WHERE uploader_role='student' AND document_type='extracurricular'
   TO document_type='achievement'
2. No data loss - just reclassification

Safe to run multiple times (idempotent)
"""

import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    """Migrate student extracurricular credentials to achievements"""

    print("=" * 70)
    print("MIGRATION: Remove Student Extracurricular Type")
    print("=" * 70)
    print()

    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)

    try:
        with conn.cursor() as cur:
            # Step 1: Check current state
            print("Step 1: Checking current state...")
            cur.execute("""
                SELECT
                    document_type,
                    COUNT(*) as count
                FROM credentials
                WHERE uploader_role = 'student'
                GROUP BY document_type
                ORDER BY document_type
            """)

            current_state = cur.fetchall()
            print("Current student credential types:")
            for row in current_state:
                print(f"  {row['document_type']:25s}: {row['count']:3d} credentials")
            print()

            # Step 2: Find extracurricular credentials to migrate
            print("Step 2: Finding extracurricular credentials to migrate...")
            cur.execute("""
                SELECT id, uploader_id, title, created_at
                FROM credentials
                WHERE uploader_role = 'student' AND document_type = 'extracurricular'
                ORDER BY id
            """)

            to_migrate = cur.fetchall()

            if not to_migrate:
                print("[OK] No extracurricular credentials found. Database already clean!")
                print()
                return

            print(f"Found {len(to_migrate)} extracurricular credential(s) to convert:")
            for cred in to_migrate:
                print(f"  ID {cred['id']:3d} | User {cred['uploader_id']:3d} | {cred['title']}")
            print()

            # Step 3: Perform migration
            print("Step 3: Converting extracurricular to achievement...")
            cur.execute("""
                UPDATE credentials
                SET document_type = 'achievement'
                WHERE uploader_role = 'student' AND document_type = 'extracurricular'
            """)

            updated_count = cur.rowcount
            print(f"[OK] Updated {updated_count} credential(s)")
            print()

            # Step 4: Verify final state
            print("Step 4: Verifying final state...")
            cur.execute("""
                SELECT
                    document_type,
                    COUNT(*) as count
                FROM credentials
                WHERE uploader_role = 'student'
                GROUP BY document_type
                ORDER BY document_type
            """)

            final_state = cur.fetchall()
            print("Final student credential types:")
            for row in final_state:
                print(f"  {row['document_type']:25s}: {row['count']:3d} credentials")
            print()

            # Step 5: Double-check no extracurricular remain
            cur.execute("""
                SELECT COUNT(*) as count
                FROM credentials
                WHERE uploader_role = 'student' AND document_type = 'extracurricular'
            """)

            remaining = cur.fetchone()['count']

            if remaining > 0:
                print(f"[WARNING]  WARNING: {remaining} extracurricular credential(s) still remain!")
                conn.rollback()
                return

            # Commit the transaction
            conn.commit()

            print("=" * 70)
            print("[OK] MIGRATION COMPLETED SUCCESSFULLY")
            print("=" * 70)
            print()
            print("Summary:")
            print(f"  • Converted {updated_count} extracurricular credential(s) to achievement type")
            print(f"  • 0 extracurricular credentials remain")
            print(f"  • Student credentials now only use: achievement, academic_certificate")
            print()

    except Exception as e:
        print(f"[ERROR] ERROR during migration: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        raise

    finally:
        conn.close()

def rollback():
    """
    Rollback function (manual - requires knowing which credentials were converted)

    Note: This migration is generally safe and doesn't need rollback because:
    1. Extracurricular activities are semantically achievements
    2. No data is lost, just reclassified
    3. Frontend already treats them similarly

    If rollback is truly needed, you would need to manually identify which
    achievement credentials were originally extracurricular (by timestamp, title, etc.)
    """
    print("[WARNING]  Rollback not implemented")
    print("This migration is safe and intended to be permanent.")
    print("Extracurricular credentials are now achievements.")

if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == '--rollback':
        rollback()
    else:
        migrate()
