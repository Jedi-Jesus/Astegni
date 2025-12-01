"""
Fix encoding issue when querying whiteboard_session_recordings table

This script helps identify and fix any problematic characters in the table data
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"
    return psycopg.connect(database_url)

def check_encoding_issues():
    """Check for encoding issues in whiteboard_session_recordings"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print("Checking whiteboard_session_recordings table...")
        print("=" * 80)

        # Get column names
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'whiteboard_session_recordings'
            ORDER BY ordinal_position
        """)

        columns = cursor.fetchall()
        print(f"\nTable has {len(columns)} columns:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]}")

        # Count rows
        cursor.execute("SELECT COUNT(*) FROM whiteboard_session_recordings")
        row_count = cursor.fetchone()[0]
        print(f"\nTotal rows: {row_count}")

        # Try to fetch data with ASCII-only output
        print("\nFetching data (problematic characters replaced with '?')...")
        print("=" * 80)

        cursor.execute("""
            SELECT
                id,
                session_id,
                recording_title,
                recording_type,
                duration_seconds,
                recording_date,
                is_available
            FROM whiteboard_session_recordings
            ORDER BY id
        """)

        rows = cursor.fetchall()

        if not rows:
            print("No data found in table.")
            return

        print(f"\n{'ID':<5} {'Session':<10} {'Title':<30} {'Type':<10} {'Duration':<10} {'Available'}")
        print("-" * 80)

        for row in rows:
            # Safely encode to ASCII, replacing problematic characters
            title = row[2] if row[2] else ''
            # Remove or replace problematic Unicode characters
            safe_title = title.encode('ascii', 'replace').decode('ascii')

            print(f"{row[0]:<5} {row[1]:<10} {safe_title[:28]:<30} {row[3] if row[3] else 'N/A':<10} {row[4] if row[4] else 0:<10} {row[6]}")

        print("\n" + "=" * 80)
        print("SUCCESS: Data retrieved successfully!")
        print("\nNote: Any '?' characters indicate UTF-8 characters that can't display in Windows CMD.")
        print("This is a display issue only - the data in the database is fine.")

        # Check for specific problematic characters
        print("\n" + "=" * 80)
        print("Checking for problematic characters...")

        cursor.execute("""
            SELECT id, recording_title
            FROM whiteboard_session_recordings
            WHERE recording_title ~ '[^\x00-\x7F]'
        """)

        problematic_rows = cursor.fetchall()

        if problematic_rows:
            print(f"\nFound {len(problematic_rows)} rows with non-ASCII characters:")
            for row in problematic_rows:
                safe_title = row[1].encode('ascii', 'replace').decode('ascii')
                print(f"  - ID {row[0]}: {safe_title}")
        else:
            print("\nNo non-ASCII characters found in recording_title.")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

    finally:
        cursor.close()
        conn.close()

def fix_encoding_in_psql():
    """Print instructions for viewing data in psql"""
    print("\n" + "=" * 80)
    print("SOLUTION: How to view the data without encoding errors")
    print("=" * 80)

    print("\nOption 1: Set client encoding in psql")
    print("-" * 40)
    print("In psql, run:")
    print("  SET client_encoding = 'UTF8';")
    print("  SELECT * FROM whiteboard_session_recordings;")

    print("\nOption 2: Use this Python script")
    print("-" * 40)
    print("This script displays the data with problematic characters replaced.")

    print("\nOption 3: Use pgAdmin or DBeaver")
    print("-" * 40)
    print("GUI tools handle UTF-8 encoding automatically.")

    print("\nOption 4: Query from Python (recommended)")
    print("-" * 40)
    print("Use Python scripts to query data - Python handles UTF-8 natively.")

    print("\n" + "=" * 80)

if __name__ == "__main__":
    check_encoding_issues()
    fix_encoding_in_psql()
