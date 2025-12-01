"""
Simple Migration: Update Connections Table Fields
"""

import psycopg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def run_migration():
    """Execute the migration to update connections table fields"""

    try:
        # Connect to PostgreSQL
        print("Connecting to database...")
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("\nStarting connections table migration...\n")

        # Step 1: Create backup
        print("1. Creating backup of connections table...")
        cursor.execute("DROP TABLE IF EXISTS connections_backup_20251121")
        cursor.execute("CREATE TABLE connections_backup_20251121 AS SELECT * FROM connections")
        conn.commit()

        backup_count = cursor.execute("SELECT COUNT(*) FROM connections_backup_20251121").fetchone()[0]
        print(f"   Backed up {backup_count} connection records\n")

        # Step 2: Rename requested_to to recipient_id
        print("2. Renaming 'requested_to' to 'recipient_id'...")
        cursor.execute("ALTER TABLE connections RENAME COLUMN requested_to TO recipient_id")
        conn.commit()
        print("   Column renamed: requested_to -> recipient_id\n")

        # Step 3: Rename requested_to_type to recipient_type
        print("3. Renaming 'requested_to_type' to 'recipient_type'...")
        cursor.execute("ALTER TABLE connections RENAME COLUMN requested_to_type TO recipient_type")
        conn.commit()
        print("   Column renamed: requested_to_type -> recipient_type\n")

        # Step 4: Drop connection_message column if exists
        print("4. Removing 'connection_message' field...")
        cursor.execute("ALTER TABLE connections DROP COLUMN IF EXISTS connection_message")
        conn.commit()
        print("   Column removed: connection_message\n")

        # Step 5: Verify
        print("5. Verifying data integrity...")
        cursor.execute("SELECT COUNT(*) FROM connections")
        current_count = cursor.fetchone()[0]

        if current_count == backup_count:
            print(f"   All {current_count} records preserved\n")
        else:
            print(f"   Warning: Record count mismatch! Before: {backup_count}, After: {current_count}\n")

        # Close connection
        cursor.close()
        conn.close()

        print("=" * 80)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print("\nSummary of Changes:")
        print("   1. Removed field: connection_message")
        print("   2. Renamed field: requested_to -> recipient_id")
        print("   3. Renamed field: requested_to_type -> recipient_type")
        print("\nBackup table created: connections_backup_20251121")
        print("\nPlease restart your backend server: python app.py")
        print()

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        print("\nRolling back changes...")
        conn.rollback()
        return False

    return True

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("CONNECTIONS TABLE MIGRATION")
    print("=" * 80)
    print("\nThis migration will:")
    print("  1. Remove the 'connection_message' field")
    print("  2. Rename 'requested_to' to 'recipient_id'")
    print("  3. Rename 'requested_to_type' to 'recipient_type'")
    print("\nA backup table will be created: connections_backup_20251121")
    print("=" * 80)

    response = input("\nProceed with migration? (yes/no): ").strip().lower()

    if response == 'yes':
        success = run_migration()
        if not success:
            print("\nMigration failed. Please check the error messages above.")
    else:
        print("\nMigration cancelled by user.")
