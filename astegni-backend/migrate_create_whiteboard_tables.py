"""
Migration: Create Whiteboard System Tables

This migration creates tables for the collaborative digital whiteboard feature:
- tutor_student_bookings: Track student enrollments with tutors
- whiteboard_sessions: Individual class sessions with status tracking
- whiteboard_pages: Multi-page canvas support
- whiteboard_canvas_data: Store drawing/text strokes for real-time sync
- whiteboard_chat_messages: Session-specific chat messages
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg
from datetime import datetime

# Database connection
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("🎨 Creating Whiteboard System Tables...")

        # 1. Tutor-Student Bookings Table
        print("\n1️⃣ Creating tutor_student_bookings table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tutor_student_bookings (
                id SERIAL PRIMARY KEY,
                tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                subject VARCHAR(200) NOT NULL,
                grade_level VARCHAR(100),
                session_type VARCHAR(50) DEFAULT 'online', -- online, in-person, hybrid
                sessions_per_week INTEGER DEFAULT 1,
                session_duration INTEGER DEFAULT 60, -- minutes
                start_date DATE NOT NULL,
                end_date DATE,
                status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, cancelled
                price_per_session DECIMAL(10, 2),
                currency VARCHAR(10) DEFAULT 'ETB',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tutor_id, student_id, subject)
            );
        """)
        print("✅ tutor_student_bookings table created")

        # 2. Whiteboard Sessions Table
        print("\n2️⃣ Creating whiteboard_sessions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS whiteboard_sessions (
                id SERIAL PRIMARY KEY,
                booking_id INTEGER NOT NULL REFERENCES tutor_student_bookings(id) ON DELETE CASCADE,
                tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                session_title VARCHAR(300),
                session_description TEXT,
                scheduled_start TIMESTAMP,
                scheduled_end TIMESTAMP,
                actual_start TIMESTAMP,
                actual_end TIMESTAMP,
                status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in-progress, completed, cancelled
                student_permissions JSONB DEFAULT '{"can_draw": false, "can_write": false, "can_erase": false}'::jsonb,
                session_notes TEXT, -- Teacher's notes after session
                attendance_status VARCHAR(50) DEFAULT 'pending', -- pending, attended, absent, late
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("✅ whiteboard_sessions table created")

        # 3. Whiteboard Pages Table (Multi-page support)
        print("\n3️⃣ Creating whiteboard_pages table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS whiteboard_pages (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES whiteboard_sessions(id) ON DELETE CASCADE,
                page_number INTEGER NOT NULL DEFAULT 1,
                page_title VARCHAR(200),
                background_color VARCHAR(20) DEFAULT '#FFFFFF',
                background_image VARCHAR(500), -- Optional background image URL
                is_active BOOLEAN DEFAULT false, -- Current page being viewed
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(session_id, page_number)
            );
        """)
        print("✅ whiteboard_pages table created")

        # 4. Whiteboard Canvas Data (Drawing/Text strokes)
        print("\n4️⃣ Creating whiteboard_canvas_data table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS whiteboard_canvas_data (
                id SERIAL PRIMARY KEY,
                page_id INTEGER NOT NULL REFERENCES whiteboard_pages(id) ON DELETE CASCADE,
                session_id INTEGER NOT NULL REFERENCES whiteboard_sessions(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                stroke_type VARCHAR(50) NOT NULL, -- pen, eraser, line, rectangle, circle, text, arrow
                stroke_data JSONB NOT NULL, -- {points: [[x,y]...], color, width, text, fontSize, etc}
                stroke_order INTEGER NOT NULL, -- Order of strokes for replay
                is_deleted BOOLEAN DEFAULT false, -- Soft delete for undo functionality
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Create index for faster querying
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_canvas_page
            ON whiteboard_canvas_data(page_id, is_deleted, stroke_order);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_canvas_session
            ON whiteboard_canvas_data(session_id, created_at);
        """)

        print("✅ whiteboard_canvas_data table created with indexes")

        # 5. Whiteboard Chat Messages
        print("\n5️⃣ Creating whiteboard_chat_messages table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS whiteboard_chat_messages (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES whiteboard_sessions(id) ON DELETE CASCADE,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                message_text TEXT NOT NULL,
                message_type VARCHAR(50) DEFAULT 'text', -- text, system, file
                file_url VARCHAR(500), -- For file attachments
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_session
            ON whiteboard_chat_messages(session_id, created_at);
        """)

        print("✅ whiteboard_chat_messages table created with indexes")

        # 6. Create indexes for performance
        print("\n6️⃣ Creating additional indexes...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_bookings_tutor
            ON tutor_student_bookings(tutor_id, status);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_bookings_student
            ON tutor_student_bookings(student_id, status);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sessions_booking
            ON whiteboard_sessions(booking_id, status);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sessions_status
            ON whiteboard_sessions(status, scheduled_start);
        """)

        print("✅ Additional indexes created")

        conn.commit()
        print("\n" + "="*60)
        print("🎉 Whiteboard System Tables Created Successfully!")
        print("="*60)
        print("\nTables created:")
        print("  ✅ tutor_student_bookings - Student enrollments with tutors")
        print("  ✅ whiteboard_sessions - Individual class sessions")
        print("  ✅ whiteboard_pages - Multi-page canvas support")
        print("  ✅ whiteboard_canvas_data - Drawing/text stroke storage")
        print("  ✅ whiteboard_chat_messages - Session chat messages")
        print("\nNext steps:")
        print("  1. Run: python seed_whiteboard_data.py (to create sample bookings)")
        print("  2. Create whiteboard endpoints in backend")
        print("  3. Build frontend whiteboard modal")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error creating tables: {e}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
