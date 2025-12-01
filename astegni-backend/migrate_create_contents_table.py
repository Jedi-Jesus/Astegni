"""
Migration: Create contents table for manage-contents feature
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

def migrate():
    """Create contents table with all required fields"""
    try:
        # Parse DATABASE_URL properly
        db_url = DATABASE_URL

        # Remove postgresql:// prefix
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "")

        # Split into user:pass@host:port/dbname
        parts = db_url.split('@')
        user_pass = parts[0].split(':')
        host_db = parts[1].split('/')

        # Clean database name from query parameters
        dbname = host_db[1].split('?')[0]
        host_port = host_db[0].split(':')

        conn = psycopg.connect(
            dbname=dbname,
            user=user_pass[0],
            password=user_pass[1],
            host=host_port[0],
            port=host_port[1] if len(host_port) > 1 else "5432"
        )

        cursor = conn.cursor()

        print("Creating contents table...")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS contents (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('image', 'video')),
                uploader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                uploader_name VARCHAR(255),
                file_size BIGINT NOT NULL,
                file_path TEXT NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                description TEXT,
                grade_level VARCHAR(100),
                course_type VARCHAR(100),
                is_verified BOOLEAN DEFAULT FALSE,
                verification_status VARCHAR(20) DEFAULT 'pending' CHECK (
                    verification_status IN ('pending', 'verified', 'rejected', 'suspended')
                ),
                verified_at TIMESTAMP,
                verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                rejected_at TIMESTAMP,
                rejected_reason TEXT,
                suspended_at TIMESTAMP,
                suspended_reason TEXT,
                thumbnail_path TEXT,
                duration INTEGER,
                views_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Create indexes for better query performance
        print("Creating indexes...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_contents_verification_status
            ON contents(verification_status);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_contents_uploader_id
            ON contents(uploader_id);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_contents_content_type
            ON contents(content_type);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_contents_grade_level
            ON contents(grade_level);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_contents_course_type
            ON contents(course_type);
        """)

        conn.commit()
        print("Contents table created successfully!")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Migration failed: {e}")
        raise

if __name__ == "__main__":
    migrate()
