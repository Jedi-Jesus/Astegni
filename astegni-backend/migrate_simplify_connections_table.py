"""
Migration: Simplify Connections Table Structure

WHAT THIS MIGRATION DOES:
=========================
This migration simplifies the connections table to a cleaner, more intuitive structure.

OLD STRUCTURE (Profile-Based, Complex):
- profile_id_1, profile_type_1 (tutor_profiles.id, student_profiles.id, etc.)
- profile_id_2, profile_type_2
- user_id_1, user_id_2 (for backwards compatibility)
- initiated_by
- connection_type, status
- connection_message
- created_at, connected_at, updated_at

NEW STRUCTURE (Simplified):
- id
- requested_by (user_id who initiated the connection request)
- requester_type (role: 'tutor', 'student', 'parent', 'advertiser')
- requested_to (user_id who received the connection request)
- requested_to_type (role: 'tutor', 'student', 'parent', 'advertiser')
- status ('pending', 'accepted', 'rejected', 'blocked')
- connection_message
- requested_at (when request was sent)
- connected_at (when request was accepted)
- updated_at

BENEFITS:
- Cleaner, more intuitive naming
- Simpler to understand (requested_by → requested_to)
- Keeps essential role tracking (requester_type, requested_to_type)
- Status values align with common terminology
"""

import psycopg
from datetime import datetime

def migrate_simplify_connections():
    """
    Restructure the connections table to the simplified schema
    """

    conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
    cursor = conn.cursor()

    try:
        print("=" * 70)
        print("CONNECTIONS TABLE: SIMPLIFICATION MIGRATION")
        print("=" * 70)

        # STEP 1: Check current state
        print("\n1. Checking current connections table...")
        cursor.execute("SELECT COUNT(*) FROM connections")
        total_connections = cursor.fetchone()[0]
        print(f"   Total connections: {total_connections}")

        # STEP 2: Create backup table
        print("\n2. Creating backup of connections table...")
        cursor.execute("DROP TABLE IF EXISTS connections_backup CASCADE")
        cursor.execute("CREATE TABLE connections_backup AS SELECT * FROM connections")
        conn.commit()
        print("   [OK] Backup created: connections_backup")

        # STEP 3: Drop old connections table
        print("\n3. Dropping old connections table...")
        cursor.execute("DROP TABLE IF EXISTS connections CASCADE")
        conn.commit()
        print("   [OK] Old table dropped")

        # STEP 4: Create new simplified connections table
        print("\n4. Creating new simplified connections table...")
        cursor.execute("""
            CREATE TABLE connections (
                id SERIAL PRIMARY KEY,

                -- Request initiator
                requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                requester_type VARCHAR(50) NOT NULL,  -- 'tutor', 'student', 'parent', 'advertiser'

                -- Request recipient
                requested_to INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                requested_to_type VARCHAR(50) NOT NULL,  -- 'tutor', 'student', 'parent', 'advertiser'

                -- Connection details
                status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending', 'accepted', 'rejected', 'blocked'
                connection_message TEXT,

                -- Timestamps
                requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                connected_at TIMESTAMP,  -- When status changed to 'accepted'
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                -- Constraints
                CONSTRAINT check_different_users CHECK (requested_by != requested_to),
                CONSTRAINT check_valid_requester_type CHECK (requester_type IN ('tutor', 'student', 'parent', 'advertiser')),
                CONSTRAINT check_valid_requested_to_type CHECK (requested_to_type IN ('tutor', 'student', 'parent', 'advertiser')),
                CONSTRAINT check_valid_status CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked'))
            )
        """)
        conn.commit()
        print("   [OK] New table created with simplified schema")

        # STEP 5: Create indexes
        print("\n5. Creating indexes for optimal performance...")

        cursor.execute("""
            CREATE INDEX idx_connections_requested_by
            ON connections (requested_by)
        """)

        cursor.execute("""
            CREATE INDEX idx_connections_requested_to
            ON connections (requested_to)
        """)

        cursor.execute("""
            CREATE INDEX idx_connections_status
            ON connections (status)
        """)

        cursor.execute("""
            CREATE INDEX idx_connections_both_users
            ON connections (requested_by, requested_to)
        """)

        cursor.execute("""
            CREATE INDEX idx_connections_requester_type
            ON connections (requester_type)
        """)

        cursor.execute("""
            CREATE INDEX idx_connections_requested_to_type
            ON connections (requested_to_type)
        """)

        conn.commit()
        print("   [OK] All indexes created")

        # STEP 6: Migrate data from backup
        if total_connections > 0:
            print(f"\n6. Migrating {total_connections} connections from backup...")

            # Check what columns exist in backup table
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'connections_backup'
                ORDER BY ordinal_position
            """)
            backup_columns = [row[0] for row in cursor.fetchall()]
            print(f"   Backup table columns: {', '.join(backup_columns)}")

            # Determine if backup has old or new structure
            has_old_structure = 'user_id_1' in backup_columns
            has_new_structure = 'requested_by' in backup_columns

            if has_new_structure:
                # Backup already has new structure, just copy data
                print("   Backup table already has new structure, copying data directly...")
                cursor.execute("""
                    INSERT INTO connections
                    (requested_by, requester_type, requested_to, requested_to_type,
                     status, connection_message, requested_at, connected_at, updated_at)
                    SELECT
                        requested_by, requester_type, requested_to, requested_to_type,
                        status, connection_message, requested_at, connected_at, updated_at
                    FROM connections_backup
                """)
                migrated = cursor.rowcount
                conn.commit()
                print(f"   [OK] Copied {migrated} connections")

            elif has_old_structure:
                # Backup has old structure, need to transform data
                print("   Backup table has old structure, transforming data...")

                # Map old statuses to new statuses
                status_mapping = {
                    'connecting': 'pending',
                    'connected': 'accepted',
                    'disconnect': 'rejected',
                    'connection_failed': 'rejected',
                    'blocked': 'blocked'
                }

                cursor.execute("""
                    SELECT
                        id,
                        user_id_1,
                        user_id_2,
                        profile_type_1,
                        profile_type_2,
                        initiated_by,
                        status,
                        connection_message,
                        created_at,
                        connected_at,
                        updated_at
                    FROM connections_backup
                """)

                old_connections = cursor.fetchall()
                migrated = 0
                skipped = 0

                for conn_data in old_connections:
                    (old_id, user_id_1, user_id_2, profile_type_1, profile_type_2,
                     initiated_by, old_status, msg, created_at, connected_at, updated_at) = conn_data

                    # Determine who requested and who received
                    if initiated_by == user_id_1:
                        requested_by = user_id_1
                        requester_type = profile_type_1 or 'student'  # Default to student if null
                        requested_to = user_id_2
                        requested_to_type = profile_type_2 or 'student'
                    else:
                        requested_by = user_id_2
                        requester_type = profile_type_2 or 'student'
                        requested_to = user_id_1
                        requested_to_type = profile_type_1 or 'student'

                    # Map status
                    new_status = status_mapping.get(old_status, 'pending')

                    # Insert into new table
                    try:
                        cursor.execute("""
                            INSERT INTO connections
                            (requested_by, requester_type, requested_to, requested_to_type,
                             status, connection_message, requested_at, connected_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (requested_by, requester_type, requested_to, requested_to_type,
                              new_status, msg, created_at, connected_at, updated_at))

                        migrated += 1
                        if migrated % 100 == 0:
                            print(f"   Migrated {migrated} connections...")
                            conn.commit()

                    except Exception as e:
                        print(f"   WARNING: Skipped connection ID {old_id}: {e}")
                        skipped += 1

                conn.commit()
                print(f"   [OK] Migrated {migrated} connections")
                if skipped > 0:
                    print(f"   [WARNING] Skipped {skipped} connections due to errors")

            else:
                print("   [WARNING] Could not determine backup table structure")
                print(f"   Columns found: {backup_columns}")

        else:
            print("\n6. No existing connections to migrate [OK]")

        # STEP 7: Update models.py schema info
        print("\n7. Verification...")
        cursor.execute("SELECT COUNT(*) FROM connections")
        final_count = cursor.fetchone()[0]

        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'connections'
            ORDER BY ordinal_position
        """)

        print(f"\n   Total connections after migration: {final_count}")
        print("\n   New connections table schema:")
        for col_name, data_type, is_nullable, col_default in cursor.fetchall():
            nullable_str = "NULL" if is_nullable == 'YES' else "NOT NULL"
            default_str = f" DEFAULT {col_default}" if col_default else ""
            print(f"      {col_name}: {data_type} ({nullable_str}){default_str}")

        # Count by status
        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM connections
            GROUP BY status
            ORDER BY count DESC
        """)

        print("\n   Connections by status:")
        for status, count in cursor.fetchall():
            print(f"      {status}: {count}")

        print("\n" + "=" * 70)
        print("[SUCCESS] MIGRATION COMPLETE!")
        print("=" * 70)
        print("\nCONNECTIONS TABLE SIMPLIFIED:")
        print("  [OK] Cleaner column names (requested_by, requested_to)")
        print("  [OK] Role tracking (requester_type, requested_to_type)")
        print("  [OK] Intuitive status values (pending, accepted, rejected, blocked)")
        print("  [OK] Clear timestamps (requested_at, connected_at, updated_at)")
        print("  [OK] Optimized indexes for fast queries")
        print("\nNEXT STEPS:")
        print("  1. Update models.py Connection model to match new schema")
        print("  2. Update connection endpoints in routes.py")
        print("  3. Update frontend connection requests to use new field names")
        print("  4. Test connection creation, acceptance, rejection, blocking")
        print("\nBACKUP:")
        print("  Old data backed up in 'connections_backup' table")
        print("  You can drop it after verifying everything works")

    except Exception as e:
        print(f"\n[ERROR] during migration: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    import sys

    print("\n" + "=" * 70)
    print("CONNECTIONS TABLE SIMPLIFICATION MIGRATION")
    print("=" * 70)
    print("\nThis will restructure the connections table to:")
    print("  - requested_by, requester_type")
    print("  - requested_to, requested_to_type")
    print("  - status (pending, accepted, rejected, blocked)")
    print("  - connection_message")
    print("  - requested_at, connected_at, updated_at")
    print("\nA backup will be created as 'connections_backup'")

    # Check for auto-confirm flag
    auto_confirm = '--yes' in sys.argv or '-y' in sys.argv

    if auto_confirm:
        print("\n[AUTO-CONFIRMED] Proceeding with migration...")
        migrate_simplify_connections()
    else:
        response = input("\nProceed with migration? (yes/no): ").strip().lower()

        if response == 'yes':
            migrate_simplify_connections()
        else:
            print("\n[CANCELLED] Migration cancelled by user")
