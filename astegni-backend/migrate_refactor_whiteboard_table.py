"""
Migration: Refactor whiteboard_sessions table to whiteboard
- Renames whiteboard_sessions to whiteboard
- Updates schema with new fields:
  - session_id (foreign key to sessions table)
  - actual_start, actual_end (actual session timing)
  - coursework_id (reference to coursework)
  - canvas_id (reference to canvas data)
  - notes_id (reference to notes)
  - student_permission (JSON - permissions for student)
  - is_recording (boolean)
  - recording_id (reference to recording)
  - status (session status)
  - created_at, updated_at (timestamps)
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
            print("Starting whiteboard_sessions to whiteboard migration...")

            # Step 1: Create new whiteboard table with updated schema
            print("\n1. Creating new whiteboard table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS whiteboard (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
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
            print("✓ New whiteboard table created")

            # Step 2: Check if old table exists and migrate data
            print("\n2. Checking for existing whiteboard_sessions table...")
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'whiteboard_sessions'
                );
            """))
            table_exists = result.scalar()

            if table_exists:
                print("✓ Found whiteboard_sessions table, migrating data...")

                # Migrate data from old table to new table
                conn.execute(text("""
                    INSERT INTO whiteboard (
                        id,
                        session_id,
                        actual_start,
                        actual_end,
                        student_permission,
                        is_recording,
                        status,
                        created_at,
                        updated_at
                    )
                    SELECT
                        id,
                        CASE
                            WHEN booking_id IS NOT NULL THEN booking_id
                            ELSE NULL
                        END as session_id,
                        started_at as actual_start,
                        ended_at as actual_end,
                        COALESCE(student_permissions, '{"can_draw": false, "can_write": false, "can_erase": false}'::jsonb) as student_permission,
                        false as is_recording,
                        status,
                        created_at,
                        updated_at
                    FROM whiteboard_sessions
                    WHERE NOT EXISTS (
                        SELECT 1 FROM whiteboard WHERE whiteboard.id = whiteboard_sessions.id
                    );
                """))
                print("✓ Data migrated from whiteboard_sessions to whiteboard")

                # Drop old table
                print("\n3. Dropping old whiteboard_sessions table...")
                conn.execute(text("DROP TABLE IF EXISTS whiteboard_sessions CASCADE;"))
                print("✓ Old whiteboard_sessions table dropped")
            else:
                print("✓ No existing whiteboard_sessions table found, skipping migration")

            # Step 4: Create indexes for better query performance
            print("\n4. Creating indexes...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_whiteboard_session_id ON whiteboard(session_id);
                CREATE INDEX IF NOT EXISTS idx_whiteboard_status ON whiteboard(status);
                CREATE INDEX IF NOT EXISTS idx_whiteboard_created_at ON whiteboard(created_at);
                CREATE INDEX IF NOT EXISTS idx_whiteboard_coursework_id ON whiteboard(coursework_id);
                CREATE INDEX IF NOT EXISTS idx_whiteboard_canvas_id ON whiteboard(canvas_id);
                CREATE INDEX IF NOT EXISTS idx_whiteboard_notes_id ON whiteboard(notes_id);
            """))
            print("✓ Indexes created")

            # Step 5: Add trigger for updated_at
            print("\n5. Adding updated_at trigger...")
            conn.execute(text("""
                CREATE OR REPLACE FUNCTION update_whiteboard_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                DROP TRIGGER IF EXISTS trigger_update_whiteboard_updated_at ON whiteboard;

                CREATE TRIGGER trigger_update_whiteboard_updated_at
                BEFORE UPDATE ON whiteboard
                FOR EACH ROW
                EXECUTE FUNCTION update_whiteboard_updated_at();
            """))
            print("✓ Trigger added")

            # Commit transaction
            trans.commit()
            print("\n✅ Migration completed successfully!")

            # Display table info
            print("\n" + "="*60)
            print("NEW WHITEBOARD TABLE SCHEMA:")
            print("="*60)
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'whiteboard'
                ORDER BY ordinal_position;
            """))
            for row in result:
                print(f"  {row[0]:<25} {row[1]:<20} NULL: {row[2]:<5} DEFAULT: {row[3]}")

            # Show row count
            result = conn.execute(text("SELECT COUNT(*) FROM whiteboard;"))
            count = result.scalar()
            print(f"\n📊 Total records in whiteboard table: {count}")

        except Exception as e:
            trans.rollback()
            print(f"\n❌ Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    migrate()
