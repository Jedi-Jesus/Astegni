"""
Migration: Update connections table to use Astegni's terminology

Changes:
1. Rename column: accepted_at -> connected_at
2. Update connection_type values: 'follow'/'friend' -> 'connect'
3. Update status values to Astegni terminology:
   - 'pending' -> 'connecting'
   - 'accepted' -> 'connected'
   - 'rejected' -> 'connection_failed'
   - 'blocked' stays 'blocked'
"""

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

def migrate():
    engine = create_engine(os.getenv('DATABASE_URL'))

    with engine.connect() as conn:
        print("=" * 60)
        print("MIGRATION: Astegni Connect Terminology")
        print("=" * 60)

        # Step 1: Check current state
        print("\n[STEP 1] Checking current database state...")
        result = conn.execute(text("SELECT COUNT(*) FROM connections"))
        count = result.scalar()
        print(f"   Found {count} connections in database")

        # Show current data
        if count > 0:
            result = conn.execute(text("""
                SELECT
                    id,
                    connection_type,
                    status,
                    accepted_at
                FROM connections
                LIMIT 5
            """))
            print("\n   Current data (sample):")
            for row in result:
                print(f"   - ID={row[0]}, type={row[1]}, status={row[2]}, accepted_at={row[3]}")

        # Step 2: Rename column accepted_at -> connected_at
        print("\n[STEP 2] Renaming column: accepted_at -> connected_at...")
        try:
            conn.execute(text("""
                ALTER TABLE connections
                RENAME COLUMN accepted_at TO connected_at
            """))
            conn.commit()
            print("   [OK] Column renamed")
        except Exception as e:
            if "does not exist" in str(e) or "already exists" in str(e):
                print("   [INFO] Column already renamed or doesn't exist")
            else:
                raise e

        # Step 3: Update connection_type to Astegni terminology
        print("\n[STEP 3] Updating connection_type values...")

        # Update 'follow' and 'friend' to 'connect'
        result = conn.execute(text("""
            UPDATE connections
            SET connection_type = 'connect'
            WHERE connection_type IN ('follow', 'friend')
        """))
        conn.commit()
        print(f"   [OK] Updated {result.rowcount} connection_type values to 'connect'")

        # Step 4: Update status to Astegni terminology
        print("\n[STEP 4] Updating status values to Astegni terminology...")

        # pending -> connecting
        result = conn.execute(text("""
            UPDATE connections
            SET status = 'connecting'
            WHERE status = 'pending'
        """))
        count_connecting = result.rowcount

        # accepted -> connected
        result = conn.execute(text("""
            UPDATE connections
            SET status = 'connected'
            WHERE status = 'accepted'
        """))
        count_connected = result.rowcount

        # rejected -> connection_failed
        result = conn.execute(text("""
            UPDATE connections
            SET status = 'connection_failed'
            WHERE status = 'rejected'
        """))
        count_failed = result.rowcount

        conn.commit()

        print(f"   [OK] Updated statuses:")
        print(f"       - 'pending' -> 'connecting': {count_connecting} rows")
        print(f"       - 'accepted' -> 'connected': {count_connected} rows")
        print(f"       - 'rejected' -> 'connection_failed': {count_failed} rows")

        # Step 5: Verify migration
        print("\n[STEP 5] Verifying migration...")
        result = conn.execute(text("""
            SELECT
                connection_type,
                status,
                COUNT(*) as count
            FROM connections
            GROUP BY connection_type, status
            ORDER BY connection_type, status
        """))

        print("\n   Current data summary:")
        for row in result:
            print(f"   - Type={row[0]}, Status={row[1]}, Count={row[2]}")

        # Show sample migrated data
        result = conn.execute(text("""
            SELECT
                id,
                connection_type,
                status,
                connected_at
            FROM connections
            LIMIT 5
        """))

        print("\n   Sample migrated data:")
        for row in result:
            print(f"   - ID={row[0]}, type={row[1]}, status={row[2]}, connected_at={row[3]}")

        print("\n" + "=" * 60)
        print("[SUCCESS] Migration complete - Astegni terminology applied!")
        print("=" * 60)
        print("\nAstegni Connection Terminology:")
        print("  Connection Types:")
        print("    • 'connect' - Standard Astegni connection")
        print("    • 'block' - User blocking")
        print("\n  Connection Status:")
        print("    • 'connecting' - Request pending")
        print("    • 'connected' - Connection active")
        print("    • 'disconnect' - Connection terminated")
        print("    • 'connection_failed' - Request rejected")
        print("    • 'blocked' - User blocked")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
