"""
Query admin_profile_stats table with proper UTF-8 encoding
Handles Windows terminal encoding issues
"""
import psycopg
from dotenv import load_dotenv
import os
import json
import sys

# Force UTF-8 output encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

def safe_print(text):
    """Print text safely, replacing problematic characters"""
    try:
        print(text)
    except UnicodeEncodeError:
        # Replace Unicode characters that can't be displayed
        safe_text = text.encode('ascii', errors='replace').decode('ascii')
        print(safe_text)

def query_admin_stats():
    """Query admin_profile_stats with proper encoding"""
    try:
        # Connect with explicit UTF-8 encoding
        with psycopg.connect(DATABASE_URL, client_encoding='utf8') as conn:
            with conn.cursor() as cur:
                # Query all stats
                cur.execute("SELECT * FROM admin_profile_stats")
                rows = cur.fetchall()

                # Get column names
                colnames = [desc[0] for desc in cur.description]

                safe_print("\n" + "="*80)
                safe_print("ADMIN PROFILE STATS")
                safe_print("="*80 + "\n")

                if not rows:
                    safe_print("No data found in admin_profile_stats table.")
                    return

                # Print each row as JSON for readability
                for row in rows:
                    safe_print("-" * 80)
                    for col, val in zip(colnames, row):
                        # Handle None values
                        if val is None:
                            safe_print(f"{col:25}: NULL")
                            continue

                        # Handle JSON fields
                        if col in ['subjects_taught', 'grade_levels_taught', 'languages_supported', 'active_notifications']:
                            if val:
                                val_str = json.dumps(val, indent=2, ensure_ascii=True)
                                safe_print(f"{col:25}: {val_str}")
                            else:
                                safe_print(f"{col:25}: NULL")
                        else:
                            # Convert to string and handle special characters
                            val_str = str(val)
                            safe_print(f"{col:25}: {val_str}")
                    safe_print("")

                safe_print("="*80)
                safe_print(f"Total records: {len(rows)}")
                safe_print("="*80)

    except Exception as e:
        safe_print(f"Error querying admin_profile_stats: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    query_admin_stats()
