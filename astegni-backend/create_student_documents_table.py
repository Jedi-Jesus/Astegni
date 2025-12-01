"""
Create student_documents table for storing achievements, certificates, and extracurricular activities.
Run this file to create the table: python create_student_documents_table.py
"""

import psycopg
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def create_student_documents_table():
    """Create the student_documents table"""

    try:
        # Connect to database
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Create student_documents table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS student_documents (
                        id SERIAL PRIMARY KEY,
                        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        document_type VARCHAR(50) NOT NULL,
                        title VARCHAR(255) NOT NULL,
                        description TEXT,
                        issued_by VARCHAR(255),
                        document_date DATE NOT NULL,
                        file_url TEXT NOT NULL,
                        file_name VARCHAR(255) NOT NULL,
                        file_type VARCHAR(50),
                        file_size INTEGER,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT valid_document_type CHECK (document_type IN ('achievement', 'academic_certificate', 'extracurricular'))
                    );
                """)

                # Create index for faster queries
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_student_documents_student_id
                    ON student_documents(student_id);
                """)

                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_student_documents_type
                    ON student_documents(student_id, document_type);
                """)

                conn.commit()
                print("✅ student_documents table created successfully!")
                print("✅ Indexes created successfully!")

    except Exception as e:
        print(f"❌ Error creating table: {e}")
        raise

if __name__ == "__main__":
    create_student_documents_table()
