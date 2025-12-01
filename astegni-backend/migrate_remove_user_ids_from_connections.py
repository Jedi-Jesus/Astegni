"""
Migration: Remove user_id_1 and user_id_2 from connections table

WHY THIS MIGRATION:
- The connections table has BOTH user_id_1/user_id_2 AND profile_id_1/profile_id_2
- user_id_1/user_id_2 are REDUNDANT and CONFUSING
- profile_id_1/profile_id_2 + profile_type_1/profile_type_2 are the correct way
- This migration removes the redundant user_id columns

WHAT IS connection_type:
- 'connect' = Normal connection/friend request (requires acceptance)
- 'block' = Block a user (immediate, no acceptance needed)

Author: Zenna
Date: 2025-01-20
"""

import psycopg
from datetime import datetime

DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"

def migrate():
    """Remove user_id_1 and user_id_2 columns from connections table"""

    print("\n" + "="*80)
    print("MIGRATION: Remove user_id_1 and user_id_2 from connections table")
    print("="*80)

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # STEP 1: Check current schema
        print("\n[STEP 1] Checking current connections table schema...")
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'connections'
            ORDER BY ordinal_position
        """)

        columns = cur.fetchall()
        print("\nCurrent columns:")
        for col in columns:
            print(f"  - {col[0]:30} {col[1]:25} NULL={col[2]}")

        # Check if user_id_1 and user_id_2 exist
        column_names = [col[0] for col in columns]
        has_user_ids = 'user_id_1' in column_names and 'user_id_2' in column_names
        has_profile_ids = 'profile_id_1' in column_names and 'profile_id_2' in column_names

        if not has_user_ids:
            print("\n✅ user_id_1 and user_id_2 already removed. Migration not needed.")
            return

        if not has_profile_ids:
            print("\n❌ ERROR: profile_id_1 and profile_id_2 not found!")
            print("   Cannot remove user_id columns without profile_id columns.")
            return

        print("\n✅ Both user_id and profile_id columns found")

        # STEP 2: Verify data integrity (all rows have profile_id values)
        print("\n[STEP 2] Verifying data integrity...")
        cur.execute("""
            SELECT COUNT(*) FROM connections
            WHERE profile_id_1 IS NULL OR profile_id_2 IS NULL
        """)

        null_count = cur.fetchone()[0]
        if null_count > 0:
            print(f"\n❌ ERROR: Found {null_count} rows with NULL profile_id values")
            print("   Fix these rows before removing user_id columns")
            return

        print("✅ All rows have valid profile_id values")

        # STEP 3: Show sample data before migration
        print("\n[STEP 3] Sample data BEFORE migration:")
        cur.execute("""
            SELECT id, user_id_1, user_id_2, profile_id_1, profile_type_1,
                   profile_id_2, profile_type_2, status
            FROM connections
            LIMIT 3
        """)

        rows = cur.fetchall()
        if rows:
            print("\n  ID | user_id_1 | user_id_2 | profile_id_1 | profile_type_1 | profile_id_2 | profile_type_2 | status")
            print("  " + "-"*120)
            for row in rows:
                print(f"  {row[0]:3} | {row[1]:9} | {row[2]:9} | {row[3]:12} | {row[4]:14} | {row[5]:12} | {row[6]:14} | {row[7]}")
        else:
            print("  (No data in table)")

        # STEP 4: Drop initiated_by foreign key constraint (references users.id)
        print("\n[STEP 4] Checking for foreign key constraints on user_id columns...")

        cur.execute("""
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'connections'
            AND constraint_type = 'FOREIGN KEY'
        """)

        fk_constraints = cur.fetchall()
        print(f"\nFound {len(fk_constraints)} foreign key constraints:")
        for fk in fk_constraints:
            print(f"  - {fk[0]}")

        # Drop foreign keys that reference user_id_1, user_id_2, or initiated_by
        print("\nDropping foreign key constraints...")
        for fk in fk_constraints:
            constraint_name = fk[0]
            # Drop all FK constraints (we'll recreate only the needed ones)
            try:
                cur.execute(f"ALTER TABLE connections DROP CONSTRAINT IF EXISTS {constraint_name}")
                print(f"  ✅ Dropped: {constraint_name}")
            except Exception as e:
                print(f"  ⚠️  Could not drop {constraint_name}: {e}")

        conn.commit()

        # STEP 5: Drop user_id_1 and user_id_2 columns
        print("\n[STEP 5] Dropping user_id_1 and user_id_2 columns...")

        cur.execute("ALTER TABLE connections DROP COLUMN IF EXISTS user_id_1 CASCADE")
        print("  ✅ Dropped user_id_1")

        cur.execute("ALTER TABLE connections DROP COLUMN IF EXISTS user_id_2 CASCADE")
        print("  ✅ Dropped user_id_2")

        conn.commit()

        # STEP 6: Recreate necessary foreign key constraints
        print("\n[STEP 6] Recreating necessary foreign key constraints...")

        # initiated_by should reference users.id (this is still needed)
        cur.execute("""
            ALTER TABLE connections
            ADD CONSTRAINT fk_connections_initiated_by
            FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE CASCADE
        """)
        print("  ✅ Added: fk_connections_initiated_by → users(id)")

        conn.commit()

        # STEP 7: Verify final schema
        print("\n[STEP 7] Verifying final schema...")
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'connections'
            ORDER BY ordinal_position
        """)

        final_columns = cur.fetchall()
        print("\nFinal columns:")
        for col in final_columns:
            print(f"  - {col[0]:30} {col[1]:25} NULL={col[2]}")

        # Verify user_id columns are gone
        final_column_names = [col[0] for col in final_columns]
        if 'user_id_1' in final_column_names or 'user_id_2' in final_column_names:
            print("\n❌ ERROR: user_id columns still present!")
            conn.rollback()
            return

        print("\n✅ user_id_1 and user_id_2 successfully removed!")

        # STEP 8: Show sample data after migration
        print("\n[STEP 8] Sample data AFTER migration:")
        cur.execute("""
            SELECT id, profile_id_1, profile_type_1, profile_id_2, profile_type_2,
                   status, connection_type, initiated_by
            FROM connections
            LIMIT 3
        """)

        rows = cur.fetchall()
        if rows:
            print("\n  ID | profile_id_1 | profile_type_1 | profile_id_2 | profile_type_2 | status      | type    | initiated_by")
            print("  " + "-"*120)
            for row in rows:
                print(f"  {row[0]:3} | {row[1]:12} | {row[2]:14} | {row[3]:12} | {row[4]:14} | {row[5]:11} | {row[6]:7} | {row[7]}")
        else:
            print("  (No data in table)")

        print("\n" + "="*80)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("="*80)
        print("\nSummary:")
        print("  ✅ Removed user_id_1 column")
        print("  ✅ Removed user_id_2 column")
        print("  ✅ Kept profile_id_1, profile_type_1, profile_id_2, profile_type_2")
        print("  ✅ Kept initiated_by (references users.id)")
        print("  ✅ All foreign key constraints updated")
        print("\n" + "="*80)

    except Exception as e:
        print(f"\n❌ ERROR during migration: {e}")
        print("Rolling back changes...")
        conn.rollback()
        raise

    finally:
        cur.close()
        conn.close()

def rollback():
    """Rollback migration - add user_id_1 and user_id_2 back (NOT RECOMMENDED)"""
    print("\n⚠️  ROLLBACK NOT IMPLEMENTED")
    print("   If you need to rollback, restore from database backup")
    print("   Reason: Cannot reliably reconstruct user_id values from profile_id values")

if __name__ == "__main__":
    print("\n" + "="*80)
    print("CONNECTION TABLE CLEANUP MIGRATION")
    print("="*80)
    print("\nThis migration will:")
    print("  1. Remove user_id_1 column (redundant)")
    print("  2. Remove user_id_2 column (redundant)")
    print("  3. Keep profile_id_1, profile_type_1, profile_id_2, profile_type_2")
    print("  4. Keep initiated_by (still references users.id)")
    print("\nWHY:")
    print("  - user_id_1 and user_id_2 are CONFUSING and REDUNDANT")
    print("  - profile_id + profile_type is the CORRECT way to identify users")
    print("  - Reduces table complexity and prevents bugs")
    print("\nCONNECTION_TYPE values:")
    print("  - 'connect' = Normal connection/friend request (requires acceptance)")
    print("  - 'block' = Block a user (immediate, no acceptance needed)")
    print("\n" + "="*80)

    response = input("\nProceed with migration? (yes/no): ")
    if response.lower() == 'yes':
        migrate()
    else:
        print("Migration cancelled.")
