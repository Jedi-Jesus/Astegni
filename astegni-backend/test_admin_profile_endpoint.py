import os
from dotenv import load_dotenv
import psycopg

load_dotenv()

def test_admin_profile_query():
    try:
        # Get database URL from .env
        database_url = os.getenv("DATABASE_URL")

        # Parse the URL
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "")

        # Remove URL parameters (like ?sslmode=disable)
        if "?" in database_url:
            database_url = database_url.split("?")[0]

        auth, host_db = database_url.split("@")
        user, password = auth.split(":")
        host_port, db_name = host_db.split("/")

        if ":" in host_port:
            host, port = host_port.split(":")
        else:
            host = host_port
            port = "5432"

        # Connect
        conn = psycopg.connect(
            dbname=db_name,
            user=user,
            password=password,
            host=host,
            port=port
        )

        cursor = conn.cursor()

        # Test the exact query from the endpoint
        print("Testing JOIN query...")
        cursor.execute("""
            SELECT
                ap.id, ap.admin_id, ap.first_name, ap.father_name, ap.grandfather_name,
                ap.admin_username, ap.quote, ap.bio, ap.phone_number, ap.email,
                ap.department, ap.profile_picture_url, ap.cover_picture_url,
                aps.employee_id, aps.access_level, aps.last_login, aps.responsibilities
            FROM admin_profile ap
            LEFT JOIN admin_profile_stats aps ON ap.admin_id = aps.admin_id
            WHERE ap.admin_id = %s
        """, (1,))

        row = cursor.fetchone()

        if row:
            print("\n=== QUERY RETURNED DATA ===")
            print(f"  ID: {row[0]}")
            print(f"  Admin ID: {row[1]}")
            print(f"  First Name: {row[2]}")
            print(f"  Father Name: {row[3]}")
            print(f"  Grandfather Name: {row[4]}")
            print(f"  Admin Username: {row[5]} <-- THIS SHOULD APPEAR IN PROFILE HEADER")
            print(f"  Quote: {row[6]}")
            print(f"  Bio: {row[7]}")
            print(f"  Phone: {row[8]}")
            print(f"  Email: {row[9]}")
            print(f"  Department: {row[10]}")
            print(f"  Profile Picture URL: {row[11]}")
            print(f"  Cover Picture URL: {row[12]}")
            print(f"  Employee ID (from stats): {row[13]}")
            print(f"  Access Level (from stats): {row[14]}")
            print(f"  Last Login (from stats): {row[15]}")
            print(f"  Responsibilities (from stats): {row[16]}")
            print("\n=== SUCCESS: All fields retrieved correctly! ===")
        else:
            print("\nNo data found for admin_id = 1")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_admin_profile_query()
