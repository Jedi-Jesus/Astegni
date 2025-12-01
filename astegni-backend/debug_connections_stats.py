"""
Debug script to check the /api/connections/stats 422 error
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, inspect, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("DATABASE_URL not found in .env file")
    sys.exit(1)

# Convert to psycopg format
if DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://', 1)

print("Connecting to database...")
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("\nConnected to database!")

        # Check if connections table exists
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if 'connections' in tables:
            print("\n'connections' table exists")

            # Get columns
            columns = inspector.get_columns('connections')
            print("\nColumns in 'connections' table:")
            for col in columns:
                print(f"  - {col['name']}: {col['type']}")

            # Count total rows
            result = conn.execute(text("SELECT COUNT(*) FROM connections"))
            count = result.scalar()
            print(f"\nTotal connections in database: {count}")

            # Check for user_id 115 (the logged in user from logs)
            result = conn.execute(text("""
                SELECT COUNT(*) FROM connections
                WHERE user_id_1 = 115 OR user_id_2 = 115
            """))
            user_connections = result.scalar()
            print(f"Connections for user_id 115: {user_connections}")

            # Show sample data
            result = conn.execute(text("""
                SELECT id, user_id_1, user_id_2, connection_type, status, created_at
                FROM connections
                WHERE user_id_1 = 115 OR user_id_2 = 115
                LIMIT 5
            """))
            rows = result.fetchall()

            if rows:
                print("\nSample connections for user 115:")
                for row in rows:
                    print(f"  - ID: {row[0]}, User1: {row[1]}, User2: {row[2]}, Type: {row[3]}, Status: {row[4]}")
            else:
                print("\nNo connections found for user 115")

        else:
            print("\n'connections' table does NOT exist")
            print("\nAvailable tables:")
            for table in tables:
                print(f"  - {table}")

        # Check if Connection model is defined properly
        print("\n\nChecking if model imports work...")
        try:
            # Import models from the app.py modules directory
            sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.py modules'))
            from models import Connection, User
            print("Models imported successfully")
            print(f"   Connection model: {Connection}")
            print(f"   User model: {User}")
        except Exception as e:
            print(f"Failed to import models: {e}")

except Exception as e:
    print(f"\nDatabase error: {e}")
    import traceback
    traceback.print_exc()

print("\nDebug complete!")
