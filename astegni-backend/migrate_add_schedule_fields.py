"""
Migration: Add schedule fields to requested_sessions table

Fields:
- schedule_type: 'recurring' or 'specific_dates'
- year_range: JSON array of years [2024, 2025]
- months: JSON array of months ['January', 'February', ...]
- days: JSON array of weekdays ['Monday', 'Wednesday', 'Friday']
- specific_dates: JSON array of specific dates ['2024-12-25', '2024-12-26']
- start_time: Time (e.g., '09:00')
- end_time: Time (e.g., '17:00')

Run: python migrate_add_schedule_fields.py
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 60)
        print("MIGRATION: Add schedule fields to requested_sessions")
        print("=" * 60)

        # Check if table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'requested_sessions'
            )
        """)
        table_exists = cur.fetchone()[0]

        if not table_exists:
            print("ERROR: Table 'requested_sessions' does not exist.")
            return

        # Check current columns
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'requested_sessions'
        """)
        existing_columns = [row[0] for row in cur.fetchall()]
        print(f"\nExisting columns: {', '.join(existing_columns)}")

        # Define new columns to add
        new_columns = [
            ("schedule_type", "VARCHAR(50)", "Type: 'recurring' or 'specific_dates'"),
            ("year_range", "JSONB", "Array of years e.g. [2024, 2025]"),
            ("months", "JSONB", "Array of months e.g. ['January', 'March']"),
            ("days", "JSONB", "Array of weekdays e.g. ['Monday', 'Wednesday']"),
            ("specific_dates", "JSONB", "Array of specific dates e.g. ['2024-12-25']"),
            ("start_time", "TIME", "Start time e.g. 09:00"),
            ("end_time", "TIME", "End time e.g. 17:00"),
        ]

        print("\nAdding new columns...")
        for col_name, col_type, description in new_columns:
            if col_name not in existing_columns:
                print(f"  Adding {col_name} ({col_type}) - {description}")
                cur.execute(f"""
                    ALTER TABLE requested_sessions
                    ADD COLUMN {col_name} {col_type}
                """)
                conn.commit()
                print(f"  OK - Added {col_name}")
            else:
                print(f"  SKIP - {col_name} already exists")

        # Show updated table structure
        print("\n" + "-" * 40)
        print("Updated table structure:")
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'requested_sessions'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
        for col in columns:
            print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nSchedule Types:")
        print("  - 'recurring': Use year_range, months, days, start_time, end_time")
        print("  - 'specific_dates': Use specific_dates, start_time, end_time")

    except Exception as e:
        conn.rollback()
        print(f"\nMigration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    migrate()
