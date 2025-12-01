"""
Cleanup Script: Fix Invalid Session Format Values
This script cleans up any tutor_profiles records that have invalid session_format values.
Valid values are: 'online', 'in-person', 'both', or NULL
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def cleanup_session_format():
    """
    Clean up invalid session_format values in tutor_profiles table
    - Set 'Both' (capitalized) to 'both' (lowercase)
    - Set any other invalid values to NULL
    """
    conn = psycopg.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            # First, check what values currently exist
            print("📊 Checking current session_format values...")
            cur.execute("""
                SELECT "sessionFormat", COUNT(*)
                FROM tutor_profiles
                GROUP BY "sessionFormat"
                ORDER BY COUNT(*) DESC
            """)

            print("\nCurrent session_format distribution:")
            for row in cur.fetchall():
                value = row[0] if row[0] else 'NULL'
                count = row[1]
                print(f"  {value}: {count} records")

            # Update 'Both' to 'both'
            print("\n🔧 Fixing capitalization issues...")
            cur.execute("""
                UPDATE tutor_profiles
                SET "sessionFormat" = 'both'
                WHERE "sessionFormat" = 'Both'
            """)
            both_fixed = cur.rowcount
            print(f"  ✓ Fixed {both_fixed} records with 'Both' → 'both'")

            # Update invalid values to NULL
            print("\n🔧 Clearing invalid values...")
            cur.execute("""
                UPDATE tutor_profiles
                SET "sessionFormat" = NULL
                WHERE "sessionFormat" NOT IN ('online', 'in-person', 'both')
                AND "sessionFormat" IS NOT NULL
            """)
            invalid_cleared = cur.rowcount
            print(f"  ✓ Cleared {invalid_cleared} records with invalid values → NULL")

            conn.commit()

            # Show final distribution
            print("\n✅ Final session_format distribution:")
            cur.execute("""
                SELECT "sessionFormat", COUNT(*)
                FROM tutor_profiles
                GROUP BY "sessionFormat"
                ORDER BY COUNT(*) DESC
            """)

            for row in cur.fetchall():
                value = row[0] if row[0] else 'NULL'
                count = row[1]
                print(f"  {value}: {count} records")

            print("\n✅ Session format cleanup completed successfully!")

    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("SESSION FORMAT CLEANUP SCRIPT")
    print("=" * 60)
    print("\nThis will clean up invalid session_format values in tutor_profiles")
    print("Valid values: 'online', 'in-person', 'both', or NULL\n")

    response = input("Continue? (y/n): ")
    if response.lower() == 'y':
        cleanup_session_format()
    else:
        print("Cleanup cancelled.")
