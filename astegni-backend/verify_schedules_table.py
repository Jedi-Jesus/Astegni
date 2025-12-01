"""
Verify the new schedules table structure
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def verify_schedules_table():
    database_url = os.getenv("DATABASE_URL")
    conn = psycopg.connect(database_url)

    try:
        with conn.cursor() as cur:
            # Get table structure
            print("=" * 80)
            print("SCHEDULES TABLE STRUCTURE")
            print("=" * 80)

            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'schedules'
                ORDER BY ordinal_position
            """)

            columns = cur.fetchall()

            print(f"\n{'Column Name':<25} {'Data Type':<20} {'Nullable':<10} {'Default'}")
            print("-" * 80)

            for col in columns:
                col_name = col[0]
                data_type = col[1]
                nullable = col[2]
                default = col[3] or ""
                print(f"{col_name:<25} {data_type:<20} {nullable:<10} {default}")

            # Get sample data
            print("\n" + "=" * 80)
            print("SAMPLE DATA (First 3 records)")
            print("=" * 80)

            cur.execute("""
                SELECT id, scheduler_id, scheduler_role, title, priority_level, year, status
                FROM schedules
                ORDER BY created_at DESC
                LIMIT 3
            """)

            records = cur.fetchall()

            if records:
                print(f"\n{'ID':<5} {'Scheduler ID':<15} {'Role':<10} {'Title':<30} {'Priority':<10} {'Year':<6} {'Status'}")
                print("-" * 80)
                for rec in records:
                    print(f"{rec[0]:<5} {rec[1]:<15} {rec[2]:<10} {rec[3]:<30} {rec[4]:<10} {rec[5]:<6} {rec[6]}")
            else:
                print("\nNo records found in schedules table.")

            # Get count
            cur.execute("SELECT COUNT(*) FROM schedules")
            count = cur.fetchone()[0]
            print(f"\nTotal records in schedules table: {count}")

            print("\n" + "=" * 80)
            print("VERIFICATION COMPLETE")
            print("=" * 80)

    finally:
        conn.close()

if __name__ == "__main__":
    verify_schedules_table()
