"""
Migration: Add canvas_snapshot and recording_url columns to whiteboard_call_history
Tracks canvas state at end of call and optional video recording URL
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

def run_migration():
    """Add canvas_snapshot and recording_url columns to whiteboard_call_history"""

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("[ERROR] DATABASE_URL not found in environment")
        return False

    # Convert postgresql:// to postgresql+psycopg:// if needed
    if database_url.startswith("postgresql://") and "+psycopg" not in database_url:
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    # Remove the +psycopg part for psycopg3 direct connection
    clean_url = database_url.replace("+psycopg", "")

    try:
        with psycopg.connect(clean_url) as conn:
            with conn.cursor() as cur:
                print("Adding canvas_snapshot and recording_url columns to whiteboard_call_history...")

                # Check if columns already exist
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'whiteboard_call_history'
                    AND column_name IN ('canvas_snapshot', 'recording_url')
                """)
                existing_cols = [row[0] for row in cur.fetchall()]

                if 'canvas_snapshot' not in existing_cols:
                    cur.execute("""
                        ALTER TABLE whiteboard_call_history
                        ADD COLUMN canvas_snapshot JSONB
                    """)
                    print("  [OK] Added canvas_snapshot column")
                else:
                    print("  [SKIP] canvas_snapshot column already exists")

                if 'recording_url' not in existing_cols:
                    cur.execute("""
                        ALTER TABLE whiteboard_call_history
                        ADD COLUMN recording_url TEXT
                    """)
                    print("  [OK] Added recording_url column")
                else:
                    print("  [SKIP] recording_url column already exists")

                conn.commit()
                print("[OK] Migration completed successfully!")

                # Verify columns
                cur.execute("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = 'whiteboard_call_history'
                    ORDER BY ordinal_position
                """)
                columns = cur.fetchall()

                print(f"\nTable now has {len(columns)} columns:")
                for col_name, col_type in columns:
                    marker = " (NEW)" if col_name in ['canvas_snapshot', 'recording_url'] else ""
                    print(f"  - {col_name}: {col_type}{marker}")

                return True

    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("ADD CANVAS_SNAPSHOT AND RECORDING_URL TO CALL HISTORY")
    print("=" * 60)
    run_migration()
