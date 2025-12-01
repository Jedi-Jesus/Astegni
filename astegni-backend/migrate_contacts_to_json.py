"""
Migration: Convert Contact Fields to JSON Arrays
Converts contact_phone and contact_email from comma-separated VARCHAR to JSONB arrays
"""

import psycopg
from dotenv import load_dotenv
import os
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate_to_json():
    """Migrate contact fields to JSON arrays"""
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("Starting migration to JSON arrays...")

        # Step 1: Add new JSONB columns
        print("\n1. Adding new JSONB columns...")
        cursor.execute("""
            ALTER TABLE system_general_settings
            ADD COLUMN IF NOT EXISTS contact_phone_json JSONB,
            ADD COLUMN IF NOT EXISTS contact_email_json JSONB
        """)
        conn.commit()
        print("   ✓ New JSONB columns added")

        # Step 2: Migrate existing data from VARCHAR to JSONB
        print("\n2. Migrating existing data...")

        # Get current data
        cursor.execute("""
            SELECT id, contact_phone, contact_email
            FROM system_general_settings
        """)
        rows = cursor.fetchall()

        for row in rows:
            record_id, phone_csv, email_csv = row

            # Convert comma-separated to arrays
            phones = []
            if phone_csv:
                phones = [p.strip() for p in phone_csv.split(',') if p.strip()]

            emails = []
            if email_csv:
                emails = [e.strip() for e in email_csv.split(',') if e.strip()]

            # Update with JSON arrays
            cursor.execute("""
                UPDATE system_general_settings
                SET contact_phone_json = %s,
                    contact_email_json = %s
                WHERE id = %s
            """, (psycopg.types.json.Jsonb(phones),
                  psycopg.types.json.Jsonb(emails),
                  record_id))

            print(f"   ✓ Record {record_id}: {len(phones)} phones, {len(emails)} emails migrated")

        conn.commit()
        print("\n3. Data migration completed")

        # Step 3: Verify migration
        print("\n4. Verifying migration...")
        cursor.execute("""
            SELECT id, contact_phone, contact_phone_json, contact_email, contact_email_json
            FROM system_general_settings
        """)
        rows = cursor.fetchall()

        all_good = True
        for row in rows:
            record_id, old_phones, new_phones, old_emails, new_emails = row

            old_phone_count = len([p for p in (old_phones or '').split(',') if p.strip()])
            new_phone_count = len(new_phones) if new_phones else 0

            old_email_count = len([e for e in (old_emails or '').split(',') if e.strip()])
            new_email_count = len(new_emails) if new_emails else 0

            if old_phone_count == new_phone_count and old_email_count == new_email_count:
                print(f"   ✓ Record {record_id}: Verification passed")
            else:
                print(f"   ✗ Record {record_id}: Mismatch detected!")
                all_good = False

        if not all_good:
            print("\n⚠ Verification failed! Rolling back...")
            conn.rollback()
            return False

        # Step 4: Drop old columns and rename new ones
        print("\n5. Replacing old columns with new ones...")

        # Rename old columns to _backup
        cursor.execute("""
            ALTER TABLE system_general_settings
            RENAME COLUMN contact_phone TO contact_phone_backup;

            ALTER TABLE system_general_settings
            RENAME COLUMN contact_email TO contact_email_backup;
        """)

        # Rename new columns to production names
        cursor.execute("""
            ALTER TABLE system_general_settings
            RENAME COLUMN contact_phone_json TO contact_phone;

            ALTER TABLE system_general_settings
            RENAME COLUMN contact_email_json TO contact_email;
        """)

        conn.commit()
        print("   ✓ Column replacement completed")

        print("\n✅ Migration completed successfully!")
        print("\n📝 Next steps:")
        print("   1. Test the application thoroughly")
        print("   2. If everything works, run cleanup script to drop backup columns")
        print("   3. Update backend and frontend code to use JSON arrays")

        cursor.close()
        conn.close()
        return True

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        if conn:
            conn.rollback()
        return False

def rollback_migration():
    """Rollback to original VARCHAR columns"""
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("Rolling back migration...")

        # Check if backup columns exist
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'system_general_settings'
            AND column_name IN ('contact_phone_backup', 'contact_email_backup')
        """)
        backups = cursor.fetchall()

        if len(backups) == 2:
            # Drop JSON columns
            cursor.execute("""
                ALTER TABLE system_general_settings
                DROP COLUMN IF EXISTS contact_phone;

                ALTER TABLE system_general_settings
                DROP COLUMN IF EXISTS contact_email;
            """)

            # Restore backup columns
            cursor.execute("""
                ALTER TABLE system_general_settings
                RENAME COLUMN contact_phone_backup TO contact_phone;

                ALTER TABLE system_general_settings
                RENAME COLUMN contact_email_backup TO contact_email;
            """)

            conn.commit()
            print("✓ Rollback completed successfully")
        else:
            print("⚠ Backup columns not found. Nothing to rollback.")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Rollback failed: {e}")

def cleanup_backup_columns():
    """Drop backup columns after successful testing"""
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        response = input("Are you sure you want to drop backup columns? This cannot be undone. (yes/no): ")
        if response.lower() != 'yes':
            print("Cleanup cancelled")
            return

        print("Dropping backup columns...")

        cursor.execute("""
            ALTER TABLE system_general_settings
            DROP COLUMN IF EXISTS contact_phone_backup,
            DROP COLUMN IF EXISTS contact_email_backup
        """)

        conn.commit()
        print("✓ Backup columns dropped successfully")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Cleanup failed: {e}")

def view_current_schema():
    """View current table schema"""
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'system_general_settings'
            AND column_name LIKE '%contact%'
            ORDER BY ordinal_position
        """)

        columns = cursor.fetchall()

        print("\nCurrent contact-related columns:")
        print("-" * 50)
        for col_name, col_type in columns:
            print(f"  {col_name:30} {col_type}")
        print("-" * 50)

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "migrate":
            migrate_to_json()
        elif command == "rollback":
            rollback_migration()
        elif command == "cleanup":
            cleanup_backup_columns()
        elif command == "schema":
            view_current_schema()
        else:
            print("Unknown command. Use: migrate, rollback, cleanup, or schema")
    else:
        print("Contact Fields Migration Tool")
        print("=" * 50)
        print("\nCommands:")
        print("  python migrate_contacts_to_json.py migrate   - Migrate to JSON")
        print("  python migrate_contacts_to_json.py rollback  - Rollback migration")
        print("  python migrate_contacts_to_json.py cleanup   - Drop backup columns")
        print("  python migrate_contacts_to_json.py schema    - View current schema")
        print("\nRecommended workflow:")
        print("  1. python migrate_contacts_to_json.py schema")
        print("  2. python migrate_contacts_to_json.py migrate")
        print("  3. Test application thoroughly")
        print("  4. python migrate_contacts_to_json.py cleanup (after testing)")
