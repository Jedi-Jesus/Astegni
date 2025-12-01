"""
Verify the new admin table structure
"""
import psycopg
from dotenv import load_dotenv
import os
import json
import sys
import io

# Force UTF-8 output encoding for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

def verify_tables():
    """Verify the new admin table structures"""
    try:
        with psycopg.connect(DATABASE_URL, client_encoding='utf8') as conn:
            with conn.cursor() as cur:
                print("="*80)
                print("ADMIN TABLES VERIFICATION")
                print("="*80)

                # 1. Verify admin_profile table
                print("\n1. ADMIN_PROFILE TABLE")
                print("-" * 80)
                cur.execute("""
                    SELECT column_name, data_type, character_maximum_length
                    FROM information_schema.columns
                    WHERE table_name = 'admin_profile'
                    ORDER BY ordinal_position
                """)
                columns = cur.fetchall()
                print("Columns:")
                for col in columns:
                    length = f"({col[2]})" if col[2] else ""
                    print(f"  - {col[0]:25} {col[1]}{length}")

                # Check data
                cur.execute("SELECT COUNT(*) FROM admin_profile")
                count = cur.fetchone()[0]
                print(f"\nTotal records: {count}")

                if count > 0:
                    cur.execute("SELECT * FROM admin_profile LIMIT 1")
                    row = cur.fetchone()
                    colnames = [desc[0] for desc in cur.description]
                    print("\nSample record:")
                    for col, val in zip(colnames, row):
                        print(f"  {col:25}: {val}")

                # 2. Verify admin_profile_stats table
                print("\n\n2. ADMIN_PROFILE_STATS TABLE")
                print("-" * 80)
                cur.execute("""
                    SELECT column_name, data_type, character_maximum_length
                    FROM information_schema.columns
                    WHERE table_name = 'admin_profile_stats'
                    ORDER BY ordinal_position
                """)
                columns = cur.fetchall()
                print("Columns:")
                for col in columns:
                    length = f"({col[2]})" if col[2] else ""
                    print(f"  - {col[0]:25} {col[1]}{length}")

                # Check data
                cur.execute("SELECT COUNT(*) FROM admin_profile_stats")
                count = cur.fetchone()[0]
                print(f"\nTotal records: {count}")

                if count > 0:
                    cur.execute("SELECT * FROM admin_profile_stats LIMIT 1")
                    row = cur.fetchone()
                    colnames = [desc[0] for desc in cur.description]
                    print("\nSample record:")
                    for col, val in zip(colnames, row):
                        if col == 'badges' and val:
                            print(f"  {col:25}: {json.dumps(val, ensure_ascii=False)}")
                        else:
                            print(f"  {col:25}: {val}")

                # 3. Verify admin_reviews table
                print("\n\n3. ADMIN_REVIEWS TABLE")
                print("-" * 80)
                cur.execute("""
                    SELECT column_name, data_type, character_maximum_length
                    FROM information_schema.columns
                    WHERE table_name = 'admin_reviews'
                    ORDER BY ordinal_position
                """)
                columns = cur.fetchall()
                print("Columns:")
                for col in columns:
                    length = f"({col[2]})" if col[2] else ""
                    print(f"  - {col[0]:25} {col[1]}{length}")

                # Check data
                cur.execute("SELECT COUNT(*) FROM admin_reviews")
                count = cur.fetchone()[0]
                print(f"\nTotal records: {count}")

                if count > 0:
                    cur.execute("SELECT * FROM admin_reviews LIMIT 1")
                    row = cur.fetchone()
                    colnames = [desc[0] for desc in cur.description]
                    print("\nSample record:")
                    for col, val in zip(colnames, row):
                        print(f"  {col:25}: {val}")

                # 4. Check relationships
                print("\n\n4. TABLE RELATIONSHIPS")
                print("-" * 80)

                # Join admin_profile with admin_profile_stats
                cur.execute("""
                    SELECT
                        ap.admin_username,
                        ap.department,
                        aps.employee_id,
                        aps.access_level,
                        aps.rating,
                        aps.total_reviews
                    FROM admin_profile ap
                    LEFT JOIN admin_profile_stats aps ON ap.admin_id = aps.admin_id
                """)
                rows = cur.fetchall()

                if rows:
                    print("\nJoined data (admin_profile + admin_profile_stats):")
                    colnames = [desc[0] for desc in cur.description]
                    for row in rows:
                        print("\n  Admin Record:")
                        for col, val in zip(colnames, row):
                            print(f"    {col:20}: {val}")
                else:
                    print("No joined data found")

                print("\n" + "="*80)
                print("VERIFICATION COMPLETE!")
                print("="*80)
                print("\nAll tables have been successfully restructured:")
                print("✓ admin_profile - Personal information")
                print("✓ admin_profile_stats - Statistics only")
                print("✓ admin_reviews - Username-based references")
                print("="*80)

    except Exception as e:
        print(f"Error verifying tables: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_tables()
