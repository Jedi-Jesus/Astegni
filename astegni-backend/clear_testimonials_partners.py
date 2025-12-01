"""
Clear testimonials and partners data from database
"""

import os
import sys
from dotenv import load_dotenv
import psycopg

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

def clear_testimonials_and_partners():
    """Clear testimonials and partners data"""
    try:
        # Get database URL
        database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

        # Parse connection string
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "")

        auth, host_db = database_url.split("@")
        user, password = auth.split(":")
        host_port, db_part = host_db.split("/")
        db_name = db_part.split("?")[0]

        if ":" in host_port:
            host, port = host_port.split(":")
        else:
            host = host_port
            port = "5432"

        print(f"🔄 Connecting to {host}:{port}/{db_name}")

        conn = psycopg.connect(
            dbname=db_name,
            user=user,
            password=password,
            host=host,
            port=port
        )

        cursor = conn.cursor()

        print("\n🗑️  Clearing testimonials and partners data...")

        # Check and clear testimonials table
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'testimonials'
            );
        """)
        if cursor.fetchone()[0]:
            cursor.execute("DELETE FROM testimonials;")
            cursor.execute("SELECT COUNT(*) FROM testimonials;")
            count = cursor.fetchone()[0]
            print(f"  ✅ Cleared testimonials table (now has {count} records)")
        else:
            print("  ℹ️  No testimonials table found")

        # Check and clear partners table
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'partners'
            );
        """)
        if cursor.fetchone()[0]:
            cursor.execute("DELETE FROM partners;")
            cursor.execute("SELECT COUNT(*) FROM partners;")
            count = cursor.fetchone()[0]
            print(f"  ✅ Cleared partners table (now has {count} records)")
        else:
            print("  ℹ️  No partners table found")

        conn.commit()
        print("\n✅ Data cleared successfully!")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"\n❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("CLEAR TESTIMONIALS AND PARTNERS DATA")
    print("=" * 60)
    clear_testimonials_and_partners()
