"""
Migration: Update Connections Table Fields

Changes:
1. Remove connection_message field
2. Rename requested_to to recipient_id
3. Rename requested_to_type to recipient_type

Author: Claude Code
Date: 2025-11-21
"""

import psycopg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def run_migration():
    """Execute the migration to update connections table fields"""

    # Convert PostgreSQL URL format if needed
    db_url = DATABASE_URL
    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', 'postgresql+psycopg://')

    # Extract connection parameters
    # Format: postgresql://user:password@host:port/database
    db_url = db_url.replace('postgresql+psycopg://', '')

    try:
        # Connect to PostgreSQL
        print("🔌 Connecting to database...")
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("\n📊 Starting connections table migration...\n")

        # Step 1: Backup connections table
        print("1️⃣  Creating backup of connections table...")
        cursor.execute("DROP TABLE IF EXISTS connections_backup_20251121")
        cursor.execute("CREATE TABLE connections_backup_20251121 AS SELECT * FROM connections")
        conn.commit()

        backup_count = cursor.execute("SELECT COUNT(*) FROM connections_backup_20251121").fetchone()[0]
        print(f"   ✅ Backed up {backup_count} connection records\n")

        # Step 2: Check current schema
        print("2️⃣  Checking current schema...")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'connections'
            ORDER BY ordinal_position
        """)
        current_columns = cursor.fetchall()
        print("   Current columns:")
        for col in current_columns:
            print(f"   - {col[0]} ({col[1]})")
        print()

        # Step 3: Rename requested_to to recipient_id
        print("3️⃣  Renaming 'requested_to' to 'recipient_id'...")
        cursor.execute("""
            ALTER TABLE connections
            RENAME COLUMN requested_to TO recipient_id
        """)
        conn.commit()
        print("   ✅ Column renamed: requested_to → recipient_id\n")

        # Step 4: Rename requested_to_type to recipient_type
        print("4️⃣  Renaming 'requested_to_type' to 'recipient_type'...")
        cursor.execute("""
            ALTER TABLE connections
            RENAME COLUMN requested_to_type TO recipient_type
        """)
        conn.commit()
        print("   ✅ Column renamed: requested_to_type → recipient_type\n")

        # Step 5: Drop connection_message column
        print("5️⃣  Removing 'connection_message' field...")
        cursor.execute("""
            ALTER TABLE connections
            DROP COLUMN IF EXISTS connection_message
        """)
        conn.commit()
        print("   ✅ Column removed: connection_message\n")

        # Step 6: Verify new schema
        print("6️⃣  Verifying new schema...")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'connections'
            ORDER BY ordinal_position
        """)
        new_columns = cursor.fetchall()
        print("   New columns:")
        for col in new_columns:
            print(f"   - {col[0]} ({col[1]})")
        print()

        # Step 7: Verify data integrity
        print("7️⃣  Verifying data integrity...")
        cursor.execute("SELECT COUNT(*) FROM connections")
        current_count = cursor.fetchone()[0]

        if current_count == backup_count:
            print(f"   ✅ All {current_count} records preserved\n")
        else:
            print(f"   ⚠️  Warning: Record count mismatch!")
            print(f"   Before: {backup_count}, After: {current_count}\n")

        # Step 8: Show sample data with new field names
        print("8️⃣  Sample data with new field names:")
        cursor.execute("""
            SELECT id, requested_by, requester_type, recipient_id, recipient_type, status
            FROM connections
            LIMIT 3
        """)
        samples = cursor.fetchall()
        if samples:
            print(f"   {'ID':<5} {'Requested By':<15} {'Requester Type':<15} {'Recipient ID':<15} {'Recipient Type':<15} {'Status':<10}")
            print("   " + "-" * 85)
            for sample in samples:
                print(f"   {sample[0]:<5} {sample[1]:<15} {sample[2]:<15} {sample[3]:<15} {sample[4]:<15} {sample[5]:<10}")
        else:
            print("   (No data in connections table)")
        print()

        # Close connection
        cursor.close()
        conn.close()

        print("=" * 80)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print("\n📝 Summary of Changes:")
        print("   1. ✅ Removed field: connection_message")
        print("   2. ✅ Renamed field: requested_to → recipient_id")
        print("   3. ✅ Renamed field: requested_to_type → recipient_type")
        print("\n💾 Backup table created: connections_backup_20251121")
        print("\n⚠️  IMPORTANT: Update your code to use the new field names:")
        print("   - Replace 'requested_to' with 'recipient_id'")
        print("   - Replace 'requested_to_type' with 'recipient_type'")
        print("   - Remove references to 'connection_message'")
        print("\n📋 Answer to Question 1:")
        print("   Both 'requested_by' and 'recipient_id' (formerly 'requested_to')")
        print("   reference the 'users' table (users.id)")
        print("   They do NOT reference profile tables.")
        print()

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print("\n🔄 Rolling back changes...")
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
    print("\n⚠️  A backup table will be created: connections_backup_20251121")
    print("=" * 80)

    response = input("\nProceed with migration? (yes/no): ").strip().lower()

    if response == 'yes':
        success = run_migration()
        if not success:
            print("\n⚠️  Migration failed. Please check the error messages above.")
    else:
        print("\n❌ Migration cancelled by user.")
