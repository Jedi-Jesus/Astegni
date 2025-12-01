"""
Check actual counts in profile tables
"""

import os
import sys
from dotenv import load_dotenv
import psycopg

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

def check_counts():
    """Check actual profile counts"""
    try:
        # Get database URL
        database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

        # Parse connection string
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "")

        auth, host_db = database_url.split("@")
        user, password = auth.split(":")
        host_port, db_part = host_db.split("/")
        db_name = db_part.split("?")[0]

        if ":" in host_port:
            host, port = host_port.split(":")
        else:
            host = host_port
            port = "5432"

        print(f"🔄 Connecting to {host}:{port}/{db_name}")

        conn = psycopg.connect(
            dbname=db_name,
            user=user,
            password=password,
            host=host,
            port=port
        )

        cursor = conn.cursor()

        print("\n📊 Profile Counts:")
        print("=" * 60)

        # Parent profiles
        cursor.execute("SELECT COUNT(*) FROM parent_profiles;")
        parent_count = cursor.fetchone()[0]
        print(f"  Parent Profiles:  {parent_count:,}")

        # Student profiles
        cursor.execute("SELECT COUNT(*) FROM student_profiles;")
        student_count = cursor.fetchone()[0]
        print(f"  Student Profiles: {student_count:,}")

        # Tutor profiles
        cursor.execute("SELECT COUNT(*) FROM tutor_profiles;")
        tutor_count = cursor.fetchone()[0]
        print(f"  Tutor Profiles:   {tutor_count:,}")

        print("=" * 60)
        print(f"  TOTAL PROFILES:   {(parent_count + student_count + tutor_count):,}")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"\n❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("CHECK PROFILE COUNTS")
    print("=" * 60)
    check_counts()
