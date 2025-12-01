"""
Migration to create course_requests and requested_schools tables
"""
import psycopg
import os
from dotenv import load_dotenv
import sys

# Set UTF-8 encoding for console output
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

def create_tables():
    """Create course_requests and requested_schools tables"""
    database_url = os.getenv('DATABASE_URL')

    # Convert postgresql:// to postgresql+psycopg://
    if database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgresql+psycopg://', 1)

    # Remove the +psycopg for direct psycopg connection
    conn_url = database_url.replace('postgresql+psycopg://', 'postgresql://')

    try:
        with psycopg.connect(conn_url) as conn:
            with conn.cursor() as cur:
                # Drop existing tables if they exist (to recreate with proper constraints)
                print("Dropping existing tables if they exist...")
                cur.execute("DROP TABLE IF EXISTS course_requests CASCADE;")
                cur.execute("DROP TABLE IF EXISTS requested_schools CASCADE;")
                print("✓ Existing tables dropped")

                # Create course_requests table
                print("Creating course_requests table...")
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS course_requests (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        course_title VARCHAR(255) NOT NULL,
                        category VARCHAR(100) NOT NULL,
                        level VARCHAR(100) NOT NULL,
                        description TEXT,
                        status VARCHAR(50) DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                print("✓ course_requests table created successfully")

                # Create requested_schools table
                print("Creating requested_schools table...")
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS requested_schools (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        school_name VARCHAR(255) NOT NULL,
                        school_type VARCHAR(100) NOT NULL,
                        level VARCHAR(100) NOT NULL,
                        location VARCHAR(255),
                        school_email VARCHAR(255),
                        school_phone VARCHAR(50),
                        status VARCHAR(50) DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                print("✓ requested_schools table created successfully")

                # Create indexes for better query performance
                print("Creating indexes...")
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_course_requests_user_id
                    ON course_requests(user_id);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_course_requests_status
                    ON course_requests(status);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_requested_schools_user_id
                    ON requested_schools(user_id);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_requested_schools_status
                    ON requested_schools(status);
                """)
                print("✓ Indexes created successfully")

                conn.commit()
                print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"❌ Error during migration: {e}")
        raise

if __name__ == "__main__":
    create_tables()
