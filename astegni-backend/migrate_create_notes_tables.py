"""
Migration: Create Notes Tables
Creates comprehensive notes system with media support
"""

import psycopg2
from datetime import datetime
import sys
import io

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Database connection
DB_CONFIG = {
    "host": "localhost",
    "database": "astegni_user_db",
    "user": "astegni_user",
    "password": "Astegni2025"
}

def run_migration():
    """Create notes tables in user database"""
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        print("=" * 70)
        print("Migration: Create Notes Tables")
        print("=" * 70)

        # ============================================
        # Table 1: notes (Main notes table)
        # ============================================
        print("\n1️⃣ Creating notes table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Core note fields
                title VARCHAR(500) NOT NULL,
                content TEXT,  -- Rich HTML content
                date TIMESTAMP WITH TIME ZONE,  -- User-specified note date

                -- Metadata
                course VARCHAR(200),  -- Course/subject name
                tutor VARCHAR(200),  -- Tutor/instructor name
                tags TEXT,  -- Comma-separated tags

                -- Visual customization
                background VARCHAR(50),  -- Background theme (math, physics, etc) or 'custom'
                background_url TEXT,  -- Custom background image URL

                -- Status
                is_favorite BOOLEAN DEFAULT FALSE,
                word_count INTEGER DEFAULT 0,
                has_media BOOLEAN DEFAULT FALSE,

                -- Timestamps
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

                -- Indexing for search
                search_vector tsvector
            );
        """)
        print("   ✓ notes table created")

        # Create indexes for notes table
        print("\n2️⃣ Creating indexes for notes table...")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
        """)
        print("   ✓ idx_notes_user_id created")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_notes_favorite ON notes(user_id, is_favorite) WHERE is_favorite = TRUE;
        """)
        print("   ✓ idx_notes_favorite created")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
        """)
        print("   ✓ idx_notes_created_at created")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_notes_course ON notes(course) WHERE course IS NOT NULL;
        """)
        print("   ✓ idx_notes_course created")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_notes_search ON notes USING gin(search_vector);
        """)
        print("   ✓ idx_notes_search created (GIN index)")

        # ============================================
        # Table 2: note_media (Voice/video recordings)
        # ============================================
        print("\n3️⃣ Creating note_media table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS note_media (
                id SERIAL PRIMARY KEY,
                note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

                -- Media details
                media_type VARCHAR(20) NOT NULL,  -- 'audio' or 'video'
                file_url TEXT NOT NULL,  -- URL to media file in storage (Backblaze B2)
                file_size INTEGER,  -- File size in bytes
                duration INTEGER,  -- Duration in seconds
                mime_type VARCHAR(100),  -- e.g., 'audio/webm', 'video/webm'

                -- Metadata
                recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

                -- Optional transcription
                transcription TEXT,  -- Transcribed text from audio/video
                transcription_language VARCHAR(10),  -- e.g., 'en-US', 'am-ET'

                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("   ✓ note_media table created")

        # Create indexes for note_media
        print("\n4️⃣ Creating indexes for note_media table...")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_note_media_note_id ON note_media(note_id);
        """)
        print("   ✓ idx_note_media_note_id created")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_note_media_type ON note_media(media_type);
        """)
        print("   ✓ idx_note_media_type created")

        # ============================================
        # Table 3: note_exports (Export tracking)
        # ============================================
        print("\n5️⃣ Creating note_exports table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS note_exports (
                id SERIAL PRIMARY KEY,
                note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Export details
                export_format VARCHAR(20) NOT NULL,  -- 'pdf', 'word', 'markdown', 'html'
                file_url TEXT,  -- Optional: store exported file

                -- Timestamps
                exported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("   ✓ note_exports table created")

        # Create indexes for note_exports
        print("\n6️⃣ Creating indexes for note_exports table...")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_note_exports_note_id ON note_exports(note_id);
        """)
        print("   ✓ idx_note_exports_note_id created")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_note_exports_user_id ON note_exports(user_id);
        """)
        print("   ✓ idx_note_exports_user_id created")

        # ============================================
        # Triggers
        # ============================================
        print("\n7️⃣ Creating triggers...")

        # Trigger 1: Update search_vector automatically
        cur.execute("""
            CREATE OR REPLACE FUNCTION notes_search_vector_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector :=
                    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
                    setweight(to_tsvector('english', COALESCE(NEW.course, '')), 'C') ||
                    setweight(to_tsvector('english', COALESCE(NEW.tutor, '')), 'C') ||
                    setweight(to_tsvector('english', COALESCE(NEW.tags, '')), 'D');
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)
        print("   ✓ notes_search_vector_update() function created")

        cur.execute("""
            DROP TRIGGER IF EXISTS notes_search_vector_trigger ON notes;
        """)
        cur.execute("""
            CREATE TRIGGER notes_search_vector_trigger
            BEFORE INSERT OR UPDATE ON notes
            FOR EACH ROW EXECUTE FUNCTION notes_search_vector_update();
        """)
        print("   ✓ notes_search_vector_trigger created")

        # Trigger 2: Update timestamps automatically
        cur.execute("""
            CREATE OR REPLACE FUNCTION update_notes_timestamp() RETURNS trigger AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                NEW.last_modified = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)
        print("   ✓ update_notes_timestamp() function created")

        cur.execute("""
            DROP TRIGGER IF EXISTS update_notes_timestamp_trigger ON notes;
        """)
        cur.execute("""
            CREATE TRIGGER update_notes_timestamp_trigger
            BEFORE UPDATE ON notes
            FOR EACH ROW EXECUTE FUNCTION update_notes_timestamp();
        """)
        print("   ✓ update_notes_timestamp_trigger created")

        # Commit all changes
        conn.commit()

        # ============================================
        # Summary
        # ============================================
        print("\n" + "=" * 70)
        print("✅ Migration completed successfully!")
        print("=" * 70)

        # Get counts
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_name IN ('notes', 'note_media', 'note_exports')
        """)
        tables_count = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM pg_indexes
            WHERE tablename IN ('notes', 'note_media', 'note_exports')
        """)
        indexes_count = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM pg_trigger
            WHERE tgname LIKE '%notes%'
        """)
        triggers_count = cur.fetchone()[0]

        print(f"\n📊 Summary:")
        print(f"   • Tables created: {tables_count}")
        print(f"   • Indexes created: {indexes_count}")
        print(f"   • Triggers created: {triggers_count}")
        print(f"\n🎉 Notes system is ready to use!")
        print("\n📝 Next steps:")
        print("   1. Start backend: python app.py")
        print("   2. Test API: http://localhost:8000/docs")
        print("   3. Update frontend: See NOTES_BACKEND_DOCUMENTATION.md")
        print("=" * 70)

    except psycopg2.Error as e:
        print(f"\n❌ Migration failed with error:")
        print(f"   {e}")
        if conn:
            conn.rollback()
        sys.exit(1)

    except Exception as e:
        print(f"\n❌ Unexpected error:")
        print(f"   {e}")
        if conn:
            conn.rollback()
        sys.exit(1)

    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    run_migration()
