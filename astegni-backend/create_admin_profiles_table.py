"""
Create admin_profiles table for admin management
"""

import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")

    # Parse the URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")

    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_full = host_db.split("/")

    # Remove query parameters (like ?sslmode=disable)
    if "?" in db_full:
        db_name = db_full.split("?")[0]
    else:
        db_name = db_full

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    # Connect
    return psycopg.connect(
        dbname=db_name,
        user=user,
        password=password,
        host=host,
        port=port
    )

def create_table():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        print("Creating admin_profiles table...")

        # Create admin_profiles table with all necessary fields
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_profiles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(50),
                role VARCHAR(100) DEFAULT 'admin',
                permissions JSONB DEFAULT '[]'::jsonb,
                password_hash TEXT,
                profile_picture VARCHAR(500),
                cover_picture VARCHAR(500),
                bio TEXT,
                location VARCHAR(255),
                department VARCHAR(100),
                position VARCHAR(100),
                status VARCHAR(50) DEFAULT 'active',
                suspended_until TIMESTAMP,
                suspension_reason TEXT,
                requires_password_change BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                social_links JSONB DEFAULT '{}'::jsonb,
                contact_info JSONB DEFAULT '{}'::jsonb,
                settings JSONB DEFAULT '{}'::jsonb
            )
        """)

        # Create indexes for better performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_admin_profiles_email
            ON admin_profiles(email)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_admin_profiles_status
            ON admin_profiles(status)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_admin_profiles_role
            ON admin_profiles(role)
        """)

        conn.commit()
        print("[SUCCESS] admin_profiles table created successfully!")

        # Check if table was created
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'admin_profiles'
            ORDER BY ordinal_position
        """)

        print("\nTable structure:")
        print("-" * 80)
        for col in cursor.fetchall():
            print(f"  {col[0]:<25} {col[1]:<20} NULL: {col[2]:<5} DEFAULT: {col[3] or 'None'}")

        # Create a default admin account if none exists
        cursor.execute("SELECT COUNT(*) FROM admin_profiles")
        count = cursor.fetchone()[0]

        if count == 0:
            print("\nNo admin accounts found. Creating default admin...")

            # Use bcrypt directly
            import bcrypt
            password_hash = bcrypt.hashpw('Admin@2025'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            cursor.execute("""
                INSERT INTO admin_profiles (
                    name, email, role, permissions, password_hash, status
                ) VALUES (
                    %s, %s, %s, %s, %s, %s
                )
            """, (
                'Super Admin',
                'admin@astegni.com',
                'super_admin',
                '["all"]',
                password_hash,
                'active'
            ))

            conn.commit()
            print("[SUCCESS] Default admin created!")
            print("  Email: admin@astegni.com")
            print("  Password: Admin@2025")
            print("  [IMPORTANT] Change this password after first login!")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"[ERROR] Failed to create table: {e}")
        return False
    finally:
        if conn:
            cursor.close()
            conn.close()

    return True

if __name__ == "__main__":
    if create_table():
        print("\n[SUCCESS] Admin profiles table is ready!")
    else:
        print("\n[FAILED] Failed to create admin profiles table.")