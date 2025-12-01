"""
Migration: Create whiteboard table with new schema
Fields:
  - id (PRIMARY KEY)
  - session_id (foreign key to sessions table)
  - actual_start (actual start time)
  - actual_end (actual end time)
  - coursework_id (reference to coursework)
  - canvas_id (reference to canvas data)
  - notes_id (reference to notes)
  - student_permission (JSON - permissions for student)
  - is_recording (boolean)
  - recording_id (reference to recording)
  - status (session status)
  - created_at (timestamp)
  - updated_at (timestamp)
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()

        try:
            print("Creating whiteboard table with new schema...")
            print("=" * 60)

            # Drop old table if exists
            print("\n1. Checking for existing whiteboard table...")
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'whiteboard'
                );
            """))
            table_exists = result.scalar()

            if table_exists:
                print("   Found existing whiteboard table, dropping it...")
                conn.execute(text("DROP TABLE IF EXISTS whiteboard CASCADE;"))
                print("   Old table dropped")
            else:
                print("   No existing table found")

            # Create new whiteboard table
            print("\n2. Creating new whiteboard table...")
            conn.execute(text("""
                CREATE TABLE whiteboard (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER,
                    actual_start TIMESTAMP,
                    actual_end TIMESTAMP,
                    coursework_id INTEGER,
                    canvas_id INTEGER,
                    notes_id INTEGER,
                    student_permission JSONB DEFAULT '{"can_draw": false, "can_write": false, "can_erase": false}'::jsonb,
                    is_recording BOOLEAN DEFAULT false,
                    recording_id INTEGER,
                    status VARCHAR(50) DEFAULT 'scheduled',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            print("   Table created successfully")

            # Create indexes
            print("\n3. Creating indexes...")
            conn.execute(text("""
                CREATE INDEX idx_whiteboard_session_id ON whiteboard(session_id);
                CREATE INDEX idx_whiteboard_status ON whiteboard(status);
                CREATE INDEX idx_whiteboard_created_at ON whiteboard(created_at);
                CREATE INDEX idx_whiteboard_coursework_id ON whiteboard(coursework_id);
                CREATE INDEX idx_whiteboard_canvas_id ON whiteboard(canvas_id);
                CREATE INDEX idx_whiteboard_notes_id ON whiteboard(notes_id);
                CREATE INDEX idx_whiteboard_recording_id ON whiteboard(recording_id);
            """))
            print("   Indexes created")

            # Add trigger for updated_at
            print("\n4. Adding updated_at trigger...")
            conn.execute(text("""
                CREATE OR REPLACE FUNCTION update_whiteboard_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER trigger_update_whiteboard_updated_at
                BEFORE UPDATE ON whiteboard
                FOR EACH ROW
                EXECUTE FUNCTION update_whiteboard_updated_at();
            """))
            print("   Trigger added")

            # Commit transaction
            trans.commit()
            print("\n" + "=" * 60)
            print("Migration completed successfully!")
            print("=" * 60)

            # Display table info
            print("\nWHITEBOARD TABLE SCHEMA:")
            print("-" * 60)
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'whiteboard'
                ORDER BY ordinal_position;
            """))

            for row in result:
                nullable = "NULL" if row[2] == "YES" else "NOT NULL"
                default = row[3] if row[3] else "None"
                print(f"  {row[0]:<25} {row[1]:<20} {nullable:<10} DEFAULT: {default}")

            print("\n" + "=" * 60)

        except Exception as e:
            trans.rollback()
            print(f"\nMigration failed: {str(e)}")
            raise

if __name__ == "__main__":
    migrate()
