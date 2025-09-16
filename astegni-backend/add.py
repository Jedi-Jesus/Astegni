"""
Add missing columns to existing tables
"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

def add_missing_columns():
    """Add missing columns to match the models"""
    
    # Get database connection details
    database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")
    
    # Parse connection string
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")
    
    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_name = host_db.split("/")
    
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
    
    print("➕ Adding missing columns...")
    
    # Add bio column to users table
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN bio TEXT")
        print("✅ Added 'bio' column to users table")
    except Exception as e:
        if "already exists" in str(e):
            print("ℹ️  'bio' column already exists in users table")
        else:
            print(f"❌ Error adding bio column: {e}")
    
    # Add date_of_birth to tutor_profiles if your model has it
    try:
        cursor.execute("ALTER TABLE tutor_profiles ADD COLUMN date_of_birth DATE")
        print("✅ Added 'date_of_birth' column to tutor_profiles table")
    except Exception as e:
        if "already exists" in str(e):
            print("ℹ️  'date_of_birth' column already exists in tutor_profiles table")
        else:
            print(f"❌ Error adding date_of_birth column: {e}")
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print("\n✨ Columns added successfully!")

if __name__ == "__main__":
    add_missing_columns()
    print("\nNow add initial data: python init_db.py")
    print("Then restart server: uvicorn app:app --reload")