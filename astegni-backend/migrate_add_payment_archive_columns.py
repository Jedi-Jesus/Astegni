"""
Migration: Add archive columns for old payment records
Allows soft-deletion of payment records older than X years while maintaining history
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    engine = create_engine(os.getenv('DATABASE_URL'))

    with engine.begin() as conn:
        print("Adding archive columns to enrolled_students...")

        # Add is_archived column
        conn.execute(text("""
            ALTER TABLE enrolled_students
            ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
        """))

        # Add archived_at column
        conn.execute(text("""
            ALTER TABLE enrolled_students
            ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
        """))

        # Add archived_reason column
        conn.execute(text("""
            ALTER TABLE enrolled_students
            ADD COLUMN IF NOT EXISTS archived_reason VARCHAR(255);
        """))

        print("✅ Added is_archived, archived_at, archived_reason to enrolled_students")

        print("\nAdding archive columns to user_investments...")

        conn.execute(text("""
            ALTER TABLE user_investments
            ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
        """))

        conn.execute(text("""
            ALTER TABLE user_investments
            ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
        """))

        conn.execute(text("""
            ALTER TABLE user_investments
            ADD COLUMN IF NOT EXISTS archived_reason VARCHAR(255);
        """))

        print("✅ Added is_archived, archived_at, archived_reason to user_investments")

        # Create index for better query performance
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_enrolled_students_archived
            ON enrolled_students(is_archived, archived_at);
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_investments_archived
            ON user_investments(is_archived, archived_at);
        """))

        print("✅ Created indexes for archived columns")

        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
