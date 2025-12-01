"""
Seed manage_uploads table with a system admin for content management
Then update existing events/clubs to be created by this system admin
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def seed_manage_uploads():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # First, check if there's an admin user
        cur.execute("""
            SELECT id, first_name, father_name FROM users
            WHERE roles::jsonb ? 'admin' OR roles::jsonb ? 'super_admin'
            LIMIT 1
        """)

        admin_user = cur.fetchone()

        if not admin_user:
            print("[INFO] No admin user found. Creating one...")
            # Create a system admin user
            cur.execute("""
                INSERT INTO users (
                    first_name, father_name, grandfather_name, email,
                    password_hash, roles, is_verified, created_at
                ) VALUES (
                    'System', 'Admin', 'Astegni',
                    'system@astegni.et',
                    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lfDx.B51TQSS',  -- 'password123'
                    '["admin", "super_admin"]'::jsonb,
                    true,
                    CURRENT_TIMESTAMP
                )
                RETURNING id, first_name, father_name
            """)
            admin_user = cur.fetchone()
            print(f"[OK] Created system admin user (ID: {admin_user[0]})")

        admin_id = admin_user[0]
        admin_name = f"{admin_user[1]} {admin_user[2]}"
        print(f"[OK] Using admin user: {admin_name} (ID: {admin_id})")

        # Check if already exists in manage_uploads
        cur.execute("""
            SELECT id FROM manage_uploads WHERE admin_id = %s
        """, (admin_id,))

        if cur.fetchone():
            print(f"[INFO] Admin {admin_id} already exists in manage_uploads")
        else:
            # Insert into manage_uploads
            cur.execute("""
                INSERT INTO manage_uploads (
                    admin_id, position, joined_date, rating, total_reviews,
                    badges, events_created, clubs_created,
                    events_moderated, clubs_moderated, avg_moderation_time_hours,
                    permissions, username
                ) VALUES (
                    %s, 'System Content Manager', CURRENT_DATE, 5.00, 0,
                    '["System Admin", "Content Creator"]'::jsonb,
                    0, 0, 0, 0, 24,
                    '{
                        "can_create_events": true,
                        "can_create_clubs": true,
                        "can_moderate_events": true,
                        "can_moderate_clubs": true,
                        "can_delete_events": true,
                        "can_delete_clubs": true
                    }'::jsonb,
                    'system_admin'
                )
            """, (admin_id,))
            print(f"[OK] Added admin {admin_id} to manage_uploads table")

        # Now update all existing events and clubs to be created by this admin
        cur.execute("""
            UPDATE events SET created_by = %s
        """, (admin_id,))
        events_updated = cur.rowcount
        print(f"[OK] Updated {events_updated} events to be created by system admin")

        cur.execute("""
            UPDATE clubs SET created_by = %s
        """, (admin_id,))
        clubs_updated = cur.rowcount
        print(f"[OK] Updated {clubs_updated} clubs to be created by system admin")

        # Update stats in manage_uploads
        cur.execute("""
            UPDATE manage_uploads
            SET events_created = (SELECT COUNT(*) FROM events WHERE created_by = %s),
                clubs_created = (SELECT COUNT(*) FROM clubs WHERE created_by = %s)
            WHERE admin_id = %s
        """, (admin_id, admin_id, admin_id))

        conn.commit()
        print("\n[SUCCESS] manage_uploads seeded and events/clubs updated!")

        # Show summary
        cur.execute("""
            SELECT admin_id, position, events_created, clubs_created, username
            FROM manage_uploads WHERE admin_id = %s
        """, (admin_id,))
        result = cur.fetchone()
        print("\n=== Manage Uploads Summary ===")
        print(f"Admin ID: {result[0]}")
        print(f"Position: {result[1]}")
        print(f"Events Created: {result[2]}")
        print(f"Clubs Created: {result[3]}")
        print(f"Username: {result[4]}")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    print("=" * 50)
    print("Seeding manage_uploads and updating events/clubs")
    print("=" * 50)
    seed_manage_uploads()
