"""
Migration: Create parent_invitations table

This table tracks parent invitation requests from students.
Students can invite existing users or create new users as parents.
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg

# Database connection
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"

def run_migration():
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("Creating parent_invitations table...")

        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'parent_invitations'
            )
        """)
        exists = cursor.fetchone()[0]

        if exists:
            print("Table 'parent_invitations' already exists. Skipping creation.")
            return

        # Create parent_invitations table
        cursor.execute("""
            CREATE TABLE parent_invitations (
                id SERIAL PRIMARY KEY,
                student_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                parent_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                relationship_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                responded_at TIMESTAMP,
                UNIQUE(student_user_id, parent_user_id)
            )
        """)
        print("Created parent_invitations table")

        # Create indexes
        cursor.execute("""
            CREATE INDEX idx_parent_invitations_student ON parent_invitations(student_user_id)
        """)
        print("Created index: idx_parent_invitations_student")

        cursor.execute("""
            CREATE INDEX idx_parent_invitations_parent ON parent_invitations(parent_user_id)
        """)
        print("Created index: idx_parent_invitations_parent")

        cursor.execute("""
            CREATE INDEX idx_parent_invitations_status ON parent_invitations(status)
        """)
        print("Created index: idx_parent_invitations_status")

        conn.commit()
        print("Successfully created 'parent_invitations' table with indexes!")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
