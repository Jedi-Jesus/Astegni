"""
Migration: Clean Up Connections Table - Remove ALL Redundant Columns

REMOVES 3 REDUNDANT COLUMNS:
1. user_id_1 - Redundant (we have profile_id_1 + profile_type_1)
2. user_id_2 - Redundant (we have profile_id_2 + profile_type_2)
3. connection_type - Redundant (can infer from status)

KEEPS ESSENTIAL COLUMNS:
- profile_id_1, profile_type_1, profile_id_2, profile_type_2 (identifies who)
- status (single source of truth for connection state)
- initiated_by (who sent the request)
- connection_message, timestamps

Author: Zenna
Date: 2025-01-20
"""

import psycopg
from datetime import datetime

DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"

def migrate():
    """Remove user_id_1, user_id_2, and connection_type columns from connections table"""

    print("\n" + "="*80)
    print("MIGRATION: Clean Up Connections Table - Remove Redundant Columns")
    print("="*80)

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # ========================================
        # STEP 1: Check current schema
        # ========================================
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

        # Check which columns exist
        column_names = [col[0] for col in columns]
        has_user_id_1 = 'user_id_1' in column_names
        has_user_id_2 = 'user_id_2' in column_names
        has_connection_type = 'connection_type' in column_names
        has_profile_ids = 'profile_id_1' in column_names and 'profile_id_2' in column_names
        has_status = 'status' in column_names

        # Determine what needs to be removed
        columns_to_remove = []
        if has_user_id_1:
            columns_to_remove.append('user_id_1')
        if has_user_id_2:
            columns_to_remove.append('user_id_2')
        if has_connection_type:
            columns_to_remove.append('connection_type')

        if not columns_to_remove:
            print("\n✅ All redundant columns already removed. Migration not needed.")
            return

        print(f"\n✅ Found {len(columns_to_remove)} redundant columns to remove:")
        for col in columns_to_remove:
            print(f"  ❌ {col}")

        # Verify essential columns exist
        if not has_profile_ids:
            print("\n❌ ERROR: profile_id_1 and profile_id_2 not found!")
            print("   Cannot remove user_id columns without profile_id columns.")
            return

        if not has_status:
            print("\n❌ ERROR: status column not found!")
            print("   Cannot remove connection_type without status column.")
            return

        print("\n✅ Essential columns verified:")
        print("  ✅ profile_id_1, profile_type_1, profile_id_2, profile_type_2")
        print("  ✅ status")

        # ========================================
        # STEP 2: Verify data integrity
        # ========================================
        print("\n[STEP 2] Verifying data integrity...")

        # Check for NULL profile_id values
        cur.execute("""
            SELECT COUNT(*) FROM connections
            WHERE profile_id_1 IS NULL OR profile_id_2 IS NULL
        """)
        null_profile_count = cur.fetchone()[0]

        if null_profile_count > 0:
            print(f"\n❌ ERROR: Found {null_profile_count} rows with NULL profile_id values")
            print("   Fix these rows before removing user_id columns")
            return

        # Check for NULL status values
        cur.execute("SELECT COUNT(*) FROM connections WHERE status IS NULL")
        null_status_count = cur.fetchone()[0]

        if null_status_count > 0:
            print(f"\n❌ ERROR: Found {null_status_count} rows with NULL status values")
            print("   Fix these rows before removing connection_type column")
            return

        print("✅ All rows have valid profile_id and status values")

        # ========================================
        # STEP 3: Show sample data BEFORE migration
        # ========================================
        print("\n[STEP 3] Sample data BEFORE migration:")

        # Build dynamic query based on which columns exist
        select_cols = ['id']
        if has_user_id_1:
            select_cols.append('user_id_1')
        if has_user_id_2:
            select_cols.append('user_id_2')
        select_cols.extend(['profile_id_1', 'profile_type_1', 'profile_id_2', 'profile_type_2'])
        if has_connection_type:
            select_cols.append('connection_type')
        select_cols.append('status')

        cur.execute(f"""
            SELECT {', '.join(select_cols)}
            FROM connections
            LIMIT 3
        """)

        rows = cur.fetchall()
        if rows:
            # Print header
            header = ' | '.join([f'{col:14}' for col in select_cols])
            print(f"\n  {header}")
            print("  " + "-"*150)

            # Print rows
            for row in rows:
                row_str = ' | '.join([f'{str(val):14}' for val in row])
                print(f"  {row_str}")
        else:
            print("  (No data in table)")

        # ========================================
        # STEP 4: Verify connection_type and status consistency
        # ========================================
        if has_connection_type:
            print("\n[STEP 4] Verifying connection_type and status consistency...")

            # Check for invalid combinations
            cur.execute("""
                SELECT connection_type, status, COUNT(*)
                FROM connections
                GROUP BY connection_type, status
                ORDER BY connection_type, status
            """)

            combinations = cur.fetchall()
            print("\nCurrent connection_type vs status combinations:")
            print("  connection_type | status         | count")
            print("  " + "-"*45)
            for combo in combinations:
                print(f"  {combo[0]:15} | {combo[1]:14} | {combo[2]}")

            # Check for invalid combinations
            cur.execute("""
                SELECT COUNT(*) FROM connections
                WHERE (connection_type = 'block' AND status != 'blocked')
                OR (connection_type = 'connect' AND status = 'blocked')
            """)
            invalid_count = cur.fetchone()[0]

            if invalid_count > 0:
                print(f"\n⚠️  WARNING: Found {invalid_count} rows with inconsistent connection_type/status")
                print("   These will be preserved (only connection_type column will be removed)")
            else:
                print("\n✅ All connection_type and status combinations are consistent")

        # ========================================
        # STEP 5: Drop foreign key constraints
        # ========================================
        print("\n[STEP 5] Dropping foreign key constraints on columns to be removed...")

        cur.execute("""
            SELECT constraint_name, column_name
            FROM information_schema.key_column_usage
            WHERE table_name = 'connections'
            AND constraint_name IN (
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_name = 'connections'
                AND constraint_type = 'FOREIGN KEY'
            )
        """)

        fk_info = cur.fetchall()

        # Track which FKs to drop and recreate
        fk_to_drop = set()
        fk_to_recreate = []

        for fk_name, col_name in fk_info:
            if col_name in ['user_id_1', 'user_id_2']:
                fk_to_drop.add(fk_name)
                print(f"  ✅ Will drop: {fk_name} (references {col_name})")
            elif col_name == 'initiated_by':
                fk_to_drop.add(fk_name)
                fk_to_recreate.append(('initiated_by', 'users', 'id'))
                print(f"  ♻️  Will drop and recreate: {fk_name} (initiated_by)")

        # Drop all foreign keys
        for fk_name in fk_to_drop:
            try:
                cur.execute(f"ALTER TABLE connections DROP CONSTRAINT IF EXISTS {fk_name}")
                print(f"  ✅ Dropped: {fk_name}")
            except Exception as e:
                print(f"  ⚠️  Could not drop {fk_name}: {e}")

        conn.commit()

        # ========================================
        # STEP 6: Remove redundant columns
        # ========================================
        print("\n[STEP 6] Removing redundant columns...")

        for col in columns_to_remove:
            try:
                cur.execute(f"ALTER TABLE connections DROP COLUMN IF EXISTS {col} CASCADE")
                print(f"  ✅ Removed: {col}")
            except Exception as e:
                print(f"  ❌ Error removing {col}: {e}")
                conn.rollback()
                raise

        conn.commit()

        # ========================================
        # STEP 7: Recreate necessary foreign keys
        # ========================================
        print("\n[STEP 7] Recreating necessary foreign key constraints...")

        for col, ref_table, ref_col in fk_to_recreate:
            try:
                fk_name = f"fk_connections_{col}"
                cur.execute(f"""
                    ALTER TABLE connections
                    ADD CONSTRAINT {fk_name}
                    FOREIGN KEY ({col}) REFERENCES {ref_table}({ref_col}) ON DELETE CASCADE
                """)
                print(f"  ✅ Created: {fk_name} → {ref_table}({ref_col})")
            except Exception as e:
                print(f"  ⚠️  Could not create FK for {col}: {e}")

        conn.commit()

        # ========================================
        # STEP 8: Verify final schema
        # ========================================
        print("\n[STEP 8] Verifying final schema...")
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

        # Verify redundant columns are gone
        final_column_names = [col[0] for col in final_columns]
        still_present = [col for col in columns_to_remove if col in final_column_names]

        if still_present:
            print(f"\n❌ ERROR: These columns are still present: {still_present}")
            conn.rollback()
            return

        print("\n✅ All redundant columns successfully removed!")

        # ========================================
        # STEP 9: Show sample data AFTER migration
        # ========================================
        print("\n[STEP 9] Sample data AFTER migration:")
        cur.execute("""
            SELECT id, profile_id_1, profile_type_1, profile_id_2, profile_type_2,
                   status, initiated_by, created_at
            FROM connections
            LIMIT 3
        """)

        rows = cur.fetchall()
        if rows:
            print("\n  ID  | profile_id_1 | profile_type_1 | profile_id_2 | profile_type_2 | status      | initiated_by | created_at")
            print("  " + "-"*130)
            for row in rows:
                created = row[7].strftime('%Y-%m-%d') if row[7] else 'NULL'
                print(f"  {row[0]:3} | {row[1]:12} | {row[2]:14} | {row[3]:12} | {row[4]:14} | {row[5]:11} | {row[6]:12} | {created}")
        else:
            print("  (No data in table)")

        # ========================================
        # STEP 10: Show migration summary
        # ========================================
        print("\n" + "="*80)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("="*80)
        print("\nREMOVED (Redundant):")
        for col in columns_to_remove:
            print(f"  ❌ {col}")

        print("\nKEPT (Essential):")
        print("  ✅ profile_id_1, profile_type_1")
        print("  ✅ profile_id_2, profile_type_2")
        print("  ✅ status (single source of truth)")
        print("  ✅ initiated_by (references users.id)")
        print("  ✅ connection_message, timestamps")

        print("\n" + "="*80)
        print("NEXT STEPS:")
        print("="*80)
        print("\n1. Update connection_endpoints.py:")
        print("   - Remove all references to user_id_1, user_id_2")
        print("   - Remove all references to connection_type")
        print("   - Update queries to use profile_id + profile_type")
        print("   - Update queries to use status only (no connection_type filter)")
        print("\n2. Update models.py:")
        print("   - Remove user_id_1, user_id_2, connection_type from Connection model")
        print("\n3. Update frontend:")
        print("   - Remove connection_type from API requests")
        print("   - Use status alone to determine connection type")
        print("\n4. Test all connection-related features:")
        print("   - Create connection request")
        print("   - Accept/reject request")
        print("   - Block user")
        print("   - View connections")
        print("\n" + "="*80)

    except Exception as e:
        print(f"\n❌ ERROR during migration: {e}")
        print("Rolling back changes...")
        conn.rollback()
        import traceback
        traceback.print_exc()
        raise

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    print("\n" + "="*80)
    print("CONNECTION TABLE CLEANUP MIGRATION")
    print("="*80)
    print("\nThis migration will REMOVE 3 redundant columns:")
    print("\n  1. ❌ user_id_1")
    print("     WHY: Redundant - we have profile_id_1 + profile_type_1")
    print("     EXAMPLE: profile_id_1=12, profile_type_1='tutor' is clearer than user_id_1=5")
    print("\n  2. ❌ user_id_2")
    print("     WHY: Redundant - we have profile_id_2 + profile_type_2")
    print("     EXAMPLE: profile_id_2=45, profile_type_2='student' is clearer than user_id_2=10")
    print("\n  3. ❌ connection_type")
    print("     WHY: Redundant - can infer from status")
    print("     EXAMPLE: status='blocked' → it's a block (no need for connection_type='block')")
    print("              status='connected' → it's a connection (no need for connection_type='connect')")
    print("\n" + "="*80)
    print("This will KEEP:")
    print("\n  ✅ profile_id_1, profile_type_1 (identifies who)")
    print("  ✅ profile_id_2, profile_type_2 (identifies who)")
    print("  ✅ status (single source of truth)")
    print("  ✅ initiated_by (who sent request)")
    print("  ✅ connection_message, timestamps")
    print("\n" + "="*80)
    print("BENEFITS:")
    print("  ✅ Cleaner, simpler schema")
    print("  ✅ Less confusing (no redundant fields)")
    print("  ✅ Easier to maintain")
    print("  ✅ Clearer queries (no duplicate filters)")
    print("\n" + "="*80)

    response = input("\nProceed with migration? (yes/no): ")
    if response.lower() == 'yes':
        migrate()
    else:
        print("\nMigration cancelled.")
