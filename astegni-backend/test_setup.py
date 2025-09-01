print("Testing imports...")

try:
    import fastapi
    print("✅ FastAPI imported")
except ImportError as e:
    print(f"❌ FastAPI import failed: {e}")

try:
    import psycopg
    print("✅ psycopg imported")
except ImportError as e:
    print(f"❌ psycopg import failed: {e}")

try:
    import sqlalchemy
    print("✅ SQLAlchemy imported")
except ImportError as e:
    print(f"❌ SQLAlchemy import failed: {e}")

try:
    import pydantic
    print(f"✅ Pydantic imported (version {pydantic.__version__})")
except ImportError as e:
    print(f"❌ Pydantic import failed: {e}")

print("\nTesting database connection...")

import os
from dotenv import load_dotenv
import psycopg

# Load from main.env
load_dotenv('main.env')

# Get credentials
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "astegni_db")
DB_USER = os.getenv("DB_USER", "astegni_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Astegni2025")

conn_string = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}"

print(f"Connecting to database at {DB_HOST}:{DB_PORT}/{DB_NAME} as {DB_USER}...")

try:
    conn = psycopg.connect(conn_string)
    print("✅ Database connection successful!")
    
    # Test query
    cursor = conn.cursor()
    cursor.execute("SELECT version()")
    version = cursor.fetchone()[0]
    print(f"PostgreSQL version: {version}")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    print("\nMake sure:")
    print("1. PostgreSQL is running")
    print("2. Database 'astegni_db' exists")
    print("3. User 'astegni_user' exists with password '@Astegni2025'")