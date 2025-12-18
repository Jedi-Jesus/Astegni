"""
Fix username '...' values in manage_schools_profile table
Sets username to NULL where it's '...' so the UI can fall back to first_name + father_name
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

def fix_username_dots():
    print("Connecting to admin database...")
    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        # First, show current usernames with '...'
        print("\nChecking for usernames with '...'...")
        cursor.execute("""
            SELECT id, admin_id, username
            FROM manage_schools_profile
            WHERE username = '...' OR username = '' OR username IS NULL
        """)
        rows = cursor.fetchall()

        if rows:
            print(f"Found {len(rows)} records with problematic usernames:")
            for row in rows:
                print(f"  - ID: {row[0]}, Admin ID: {row[1]}, Username: '{row[2]}'")
        else:
            print("No records with '...' username found.")

        # Update all '...' usernames to NULL
        print("\nUpdating '...' usernames to NULL...")
        cursor.execute("""
            UPDATE manage_schools_profile
            SET username = NULL
            WHERE username = '...'
        """)
        updated_count = cursor.rowcount
        print(f"Updated {updated_count} records.")

        conn.commit()
        print("\nDone! The UI will now fall back to displaying first_name + father_name.")

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    fix_username_dots()
