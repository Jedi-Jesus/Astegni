"""
Verification script to check username field setup
"""
import psycopg
from dotenv import load_dotenv
import os
import sys
import io

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def verify():
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("=" * 80)
    print("USERNAME FIELD VERIFICATION")
    print("=" * 80)

    # 1. Check admin_profile table
    print("\n[1/3] Checking admin_profile table...")
    cursor.execute("""
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'admin_profile' AND column_name = 'username'
    """)
    row = cursor.fetchone()
    if row:
        print(f"✅ Username column exists:")
        print(f"   - Type: {row[1]}")
        print(f"   - Max Length: {row[2]}")
        print(f"   - Nullable: {row[3]}")
    else:
        print("❌ Username column NOT found in admin_profile")
        return

    # 2. Check usernames populated
    print("\n[2/3] Checking usernames populated...")
    cursor.execute("SELECT COUNT(*) FROM admin_profile WHERE username IS NOT NULL")
    count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM admin_profile")
    total = cursor.fetchone()[0]
    print(f"✅ {count} out of {total} admins have usernames")

    # 3. Check all department tables
    print("\n[3/3] Checking department tables...")
    department_tables = [
        'manage_campaigns_profile',
        'manage_courses_profile',
        'manage_schools_profile',
        'manage_tutors_profile',
        'manage_customers_profile',
        'manage_contents_profile',
        'manage_system_settings_profile'
    ]

    for table in department_tables:
        cursor.execute(f"""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = '{table}' AND column_name = 'username'
        """)
        if cursor.fetchone():
            cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE username IS NOT NULL")
            count = cursor.fetchone()[0]
            print(f"✅ {table}: {count} usernames populated")
        else:
            print(f"❌ {table}: username column NOT found")

    print("\n" + "=" * 80)
    print("VERIFICATION COMPLETE!")
    print("=" * 80)
    print("\nSample usernames generated:")
    cursor.execute("SELECT id, username, email FROM admin_profile LIMIT 5")
    for row in cursor.fetchall():
        print(f"  ID {row[0]}: {row[1]} ({row[2]})")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    verify()
