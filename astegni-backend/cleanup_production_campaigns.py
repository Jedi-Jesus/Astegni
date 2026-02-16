"""
Cleanup All Campaign Data from Production Database
CAUTION: This will DELETE all campaign-related data permanently!
"""

import psycopg
from datetime import datetime

# Production database
PROD_USER_DB = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def cleanup_campaigns():
    """Remove all campaign-related data from production"""

    print("="*80)
    print("CAMPAIGN DATA CLEANUP - PRODUCTION DATABASE")
    print("="*80)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    try:
        conn = psycopg.connect(PROD_USER_DB)
        cur = conn.cursor()

        # List of campaign-related tables in dependency order (children first)
        campaign_tables = [
            'campaign_engagement',
            'campaign_impressions',
            'campaign_invoices',
            'campaign_media',
            'campaign_profile',
            'brand_profile'
        ]

        print("Step 1: Checking current data counts...")
        print("-" * 80)

        total_rows = 0
        table_counts = {}

        for table in campaign_tables:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table};")
                count = cur.fetchone()[0]
                table_counts[table] = count
                total_rows += count
                print(f"  {table}: {count} rows")
            except Exception as e:
                print(f"  {table}: Table not found or error - {e}")
                table_counts[table] = 0

        print(f"\nTotal campaign-related rows: {total_rows}")

        if total_rows == 0:
            print("\n[INFO] No campaign data found. Database is already clean.")
            conn.close()
            return

        print("\n" + "="*80)
        print("WARNING: This will DELETE all campaign data!")
        print("="*80)
        print(f"Total rows to be deleted: {total_rows}")
        print("\nPress Ctrl+C within 10 seconds to cancel...")

        import time
        for i in range(10, 0, -1):
            print(f"{i}...", end=" ", flush=True)
            time.sleep(1)

        print("\n\nProceeding with deletion...\n")

        print("Step 2: Deleting data...")
        print("-" * 80)

        deleted_counts = {}

        for table in campaign_tables:
            if table_counts[table] > 0:
                try:
                    print(f"\nDeleting from {table}...")
                    cur.execute(f"DELETE FROM {table};")
                    deleted = cur.rowcount
                    deleted_counts[table] = deleted
                    print(f"  Deleted {deleted} rows from {table}")
                except Exception as e:
                    print(f"  Error deleting from {table}: {e}")
                    deleted_counts[table] = 0

        # Commit the transaction
        conn.commit()
        print("\n[SUCCESS] All deletions committed!")

        # Verify cleanup
        print("\nStep 3: Verifying cleanup...")
        print("-" * 80)

        remaining_total = 0
        for table in campaign_tables:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table};")
                count = cur.fetchone()[0]
                remaining_total += count
                status = "OK" if count == 0 else "WARNING"
                print(f"  {table}: {count} rows [{status}]")
            except Exception as e:
                print(f"  {table}: Error - {e}")

        print(f"\nTotal remaining rows: {remaining_total}")

        # Summary
        print("\n" + "="*80)
        print("CLEANUP SUMMARY")
        print("="*80)
        print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"\nRows deleted:")
        for table, count in deleted_counts.items():
            if count > 0:
                print(f"  - {table}: {count}")
        print(f"\nTotal deleted: {sum(deleted_counts.values())} rows")
        print(f"Remaining: {remaining_total} rows")

        if remaining_total == 0:
            print("\n[SUCCESS] All campaign data successfully removed!")
        else:
            print(f"\n[WARNING] {remaining_total} rows remaining. Manual intervention may be needed.")

        cur.close()
        conn.close()

    except KeyboardInterrupt:
        print("\n\n[CANCELLED] Cleanup cancelled by user.")
        try:
            conn.rollback()
            conn.close()
        except:
            pass
    except Exception as e:
        print(f"\n[ERROR] {e}")
        try:
            conn.rollback()
            conn.close()
        except:
            pass

if __name__ == "__main__":
    cleanup_campaigns()
