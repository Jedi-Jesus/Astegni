"""
Simple data migration: Copy tutor_connections data to connections table
"""

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

def migrate_data():
    engine = create_engine(os.getenv('DATABASE_URL'))

    with engine.connect() as conn:
        print("="  * 60)
        print("MIGRATING DATA: tutor_connections -> connections")
        print("=" * 60)

        # Get existing data from tutor_connections
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
                tp.user_id as tutor_user_id
            FROM tutor_connections tc
            JOIN tutor_profiles tp ON tc.tutor_id = tp.id
            ORDER BY tc.id
        """))

        old_records = result.fetchall()
        print(f"\n[INFO] Found {len(old_records)} records in tutor_connections")

        if not old_records:
            print("[INFO] No data to migrate")
            return

        # Migrate each record
        migrated_count = 0
        for record in old_records:
            student_id = record[1]
            tutor_user_id = record[9]  # The actual user_id of the tutor
            status = record[3]
            initiated_by = record[4]
            connection_message = record[5]
            created_at = record[6]
            accepted_at = record[7]
            updated_at = record[8]

            try:
                # Insert into connections table
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
                migrated_count += 1
                print(f"[OK] Migrated: student {student_id} -> tutor {tutor_user_id} (status: {status})")

            except Exception as e:
                print(f"[ERROR] Failed to migrate record: {e}")

        conn.commit()

        print(f"\n[SUCCESS] Migrated {migrated_count} of {len(old_records)} records")

        # Verify
        result = conn.execute(text("SELECT COUNT(*) FROM connections"))
        new_count = result.scalar()
        print(f"[INFO] connections table now has {new_count} records")

        # Show sample
        print("\nSample migrated data:")
        result = conn.execute(text("""
            SELECT
                c.id,
                u1.email as user1_email,
                u2.email as user2_email,
                c.connection_type,
                c.status
            FROM connections c
            JOIN users u1 ON c.user_id_1 = u1.id
            JOIN users u2 ON c.user_id_2 = u2.id
            LIMIT 3
        """))

        for row in result:
            print(f"  {row[1]} -> {row[2]} ({row[3]}, {row[4]})")

        print("\n" + "=" * 60)
        print("[SUCCESS] Migration complete!")
        print("=" * 60)

if __name__ == "__main__":
    try:
        migrate_data()
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
