import os
from dotenv import load_dotenv
import psycopg

load_dotenv()

def test_connection():
    try:
        # Get database URL from .env
        database_url = os.getenv("DATABASE_URL")
        print(f"Testing connection to: {database_url}")
        
        # Parse the URL
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
        
        # Connect
        conn = psycopg.connect(
            dbname=db_name,
            user=user,
            password=password,
            host=host,
            port=port
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✅ SUCCESS! Connected to: {version[0]}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    test_connection()