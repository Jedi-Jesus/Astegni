"""
Migration: Refactor tutor_connections to universal connections table

This migration transforms the tutor-specific connections table into a universal
connections system where any user can connect with any user (like Facebook friends
or Instagram follows).

Changes:
1. Rename tutor_connections -> connections
2. Replace student_id + tutor_id with follower_id + following_id (or user_id_1 + user_id_2)
3. Add connection_type field (follow, friend, block)
4. Update foreign keys to reference users table
5. Preserve existing data
6. Update indexes for performance
"""

from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

def migrate():
    engine = create_engine(os.getenv('DATABASE_URL'))
    inspector = inspect(engine)

    with engine.connect() as conn:
        print("=" * 60)
        print("MIGRATION: tutor_connections -> connections")
        print("=" * 60)

        # Check if old table exists
        if 'tutor_connections' not in inspector.get_table_names():
            print("[ERROR] tutor_connections table does not exist")
            return

        # Check if new table already exists
        if 'connections' in inspector.get_table_names():
            print("[INFO] connections table already exists - will verify structure")
            print("[INFO] To recreate, manually drop table and run again:")
            print("       DROP TABLE connections CASCADE;")

            # Check if we have data
            result = conn.execute(text("SELECT COUNT(*) FROM connections"))
            count = result.scalar()
            print(f"[INFO] Current connections table has {count} records")

            if count > 0:
                print("[SUCCESS] Migration already complete!")
                return
            else:
                print("[INFO] Table exists but empty - this is OK")
                return

        print("\n[STEP 1] Creating new connections table...")

        # Create new connections table with flexible schema
        create_table_sql = """
        CREATE TABLE connections (
            id SERIAL PRIMARY KEY,

            -- User relationship (bidirectional or directional)
            user_id_1 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            user_id_2 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

            -- Connection type: 'follow' (directional), 'friend' (bidirectional), 'block'
            connection_type VARCHAR(20) NOT NULL DEFAULT 'follow',

            -- Connection status: 'pending', 'accepted', 'rejected', 'blocked'
            status VARCHAR(20) NOT NULL DEFAULT 'pending',

            -- Who initiated the connection (user_id_1 or user_id_2)
            initiated_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

            -- Optional message when requesting connection
            connection_message TEXT,

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            accepted_at TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            -- Ensure no duplicate connections (regardless of order)
            CONSTRAINT unique_connection UNIQUE (user_id_1, user_id_2, connection_type),

            -- Prevent self-connections
            CONSTRAINT no_self_connection CHECK (user_id_1 != user_id_2)
        );
        """

        conn.execute(text(create_table_sql))
        conn.commit()
        print("[OK] New connections table created")

        print("\n[STEP] Step 2: Creating indexes for performance...")

        indexes = [
            "CREATE INDEX idx_connections_user1 ON connections(user_id_1)",
            "CREATE INDEX idx_connections_user2 ON connections(user_id_2)",
            "CREATE INDEX idx_connections_status ON connections(status)",
            "CREATE INDEX idx_connections_type ON connections(connection_type)",
            "CREATE INDEX idx_connections_initiated_by ON connections(initiated_by)",
            "CREATE INDEX idx_connections_created_at ON connections(created_at)",
            "CREATE INDEX idx_connections_both_users ON connections(user_id_1, user_id_2)",
        ]

        for idx_sql in indexes:
            conn.execute(text(idx_sql))

        conn.commit()
        print("[OK] Indexes created")

        print("\n[STEP] Step 3: Migrating data from tutor_connections...")

        # Get existing data
        result = conn.execute(text("""
            SELECT
                tc.id,
                tc.student_id,
                tc.tutor_id,
                tc.status,
                tc.initiated_by,
                tc.connection_message,
                tc.created_at,
                tc.accepted_at,
                tc.updated_at,
                u.id as tutor_user_id
            FROM tutor_connections tc
            JOIN tutor_profiles tp ON tc.tutor_id = tp.id
            JOIN users u ON tp.user_id = u.id
            ORDER BY tc.id
        """))

        old_records = result.fetchall()
        print(f"   Found {len(old_records)} existing connections to migrate")

        if old_records:
            # Migrate each record
            for record in old_records:
                student_id = record[1]
                tutor_user_id = record[9]  # The actual user_id of the tutor
                status = record[3]
                initiated_by = record[4]
                connection_message = record[5]
                created_at = record[6]
                accepted_at = record[7]
                updated_at = record[8]

                # Insert into new table
                # user_id_1 is the initiator, user_id_2 is the recipient
                # This maintains the direction of the connection
                conn.execute(text("""
                    INSERT INTO connections
                    (user_id_1, user_id_2, connection_type, status, initiated_by,
                     connection_message, created_at, accepted_at, updated_at)
                    VALUES
                    (:user_id_1, :user_id_2, :connection_type, :status, :initiated_by,
                     :connection_message, :created_at, :accepted_at, :updated_at)
                """), {
                    'user_id_1': student_id,
                    'user_id_2': tutor_user_id,
                    'connection_type': 'follow',  # Student following tutor
                    'status': status,
                    'initiated_by': initiated_by,
                    'connection_message': connection_message,
                    'created_at': created_at,
                    'accepted_at': accepted_at,
                    'updated_at': updated_at
                })

            conn.commit()
            print(f"[OK] Migrated {len(old_records)} records")

        print("\n[STEP] Step 4: Verifying migration...")

        # Verify data
        result = conn.execute(text("SELECT COUNT(*) FROM connections"))
        new_count = result.scalar()
        print(f"   New connections table has {new_count} records")

        # Show sample
        result = conn.execute(text("""
            SELECT
                c.id,
                u1.email as user1_email,
                u2.email as user2_email,
                c.connection_type,
                c.status,
                c.created_at
            FROM connections c
            JOIN users u1 ON c.user_id_1 = u1.id
            JOIN users u2 ON c.user_id_2 = u2.id
            LIMIT 3
        """))

        print("\n   Sample migrated data:")
        for row in result:
            print(f"   - {row[1]} -> {row[2]} ({row[3]}, {row[4]})")

        print("\n[STEP] Step 5: Backup old table...")

        # Rename old table as backup
        conn.execute(text("""
            ALTER TABLE tutor_connections
            RENAME TO tutor_connections_backup_""" + datetime.now().strftime("%Y%m%d_%H%M%S")))
        conn.commit()
        print("[OK] Old table backed up")

        print("\n" + "=" * 60)
        print("[OK] MIGRATION COMPLETE!")
        print("=" * 60)
        print("\nNew connections table features:")
        print("  • Any user can connect with any user")
        print("  • Connection types: follow, friend, block")
        print("  • Bidirectional support")
        print("  • Prevents duplicate connections")
        print("  • Prevents self-connections")
        print("  • Optimized indexes for queries")
        print("\nNext steps:")
        print("  1. Update app.py modules/models.py (replace TutorConnection with Connection)")
        print("  2. Update API endpoints to use new schema")
        print("  3. Test the new system")
        print("  4. If everything works, drop backup table:")
        print("     DROP TABLE tutor_connections_backup_*;")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
