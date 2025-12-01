"""
Seed whiteboard table with sample data
Creates sample whiteboard sessions with different statuses
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")
engine = create_engine(DATABASE_URL)

def seed_data():
    with engine.connect() as conn:
        trans = conn.begin()

        try:
            print("Seeding whiteboard table with sample data...")
            print("=" * 60)

            # Clear existing data
            print("\n1. Clearing existing whiteboard data...")
            conn.execute(text("DELETE FROM whiteboard;"))
            print("   Data cleared")

            print("\n2. Inserting sample whiteboard sessions...")

            # Sample whiteboard sessions with different statuses
            whiteboards = [
                {
                    'session_id': 1,
                    'actual_start': datetime.now() - timedelta(hours=2),
                    'actual_end': datetime.now() - timedelta(hours=1),
                    'coursework_id': 101,
                    'canvas_id': 201,
                    'notes_id': 301,
                    'lab_id': 401,
                    'student_permission': '{"can_draw": true, "can_write": true, "can_erase": false}',
                    'is_recording': True,
                    'recording_id': 1001,
                    'status': 'completed'
                },
                {
                    'session_id': 2,
                    'actual_start': datetime.now() - timedelta(minutes=30),
                    'actual_end': None,
                    'coursework_id': 102,
                    'canvas_id': 202,
                    'notes_id': 302,
                    'lab_id': 402,
                    'student_permission': '{"can_draw": true, "can_write": true, "can_erase": true}',
                    'is_recording': True,
                    'recording_id': 1002,
                    'status': 'in_progress'
                },
                {
                    'session_id': 3,
                    'actual_start': None,
                    'actual_end': None,
                    'coursework_id': 103,
                    'canvas_id': 203,
                    'notes_id': 303,
                    'lab_id': None,
                    'student_permission': '{"can_draw": false, "can_write": false, "can_erase": false}',
                    'is_recording': False,
                    'recording_id': None,
                    'status': 'scheduled'
                },
                {
                    'session_id': 4,
                    'actual_start': datetime.now() - timedelta(days=1, hours=3),
                    'actual_end': datetime.now() - timedelta(days=1, hours=2),
                    'coursework_id': 104,
                    'canvas_id': 204,
                    'notes_id': 304,
                    'lab_id': 403,
                    'student_permission': '{"can_draw": true, "can_write": false, "can_erase": false}',
                    'is_recording': False,
                    'recording_id': None,
                    'status': 'completed'
                },
                {
                    'session_id': 5,
                    'actual_start': None,
                    'actual_end': None,
                    'coursework_id': 105,
                    'canvas_id': 205,
                    'notes_id': 305,
                    'lab_id': None,
                    'student_permission': '{"can_draw": false, "can_write": false, "can_erase": false}',
                    'is_recording': False,
                    'recording_id': None,
                    'status': 'scheduled'
                },
                {
                    'session_id': 6,
                    'actual_start': datetime.now() - timedelta(hours=5),
                    'actual_end': datetime.now() - timedelta(hours=4),
                    'coursework_id': 106,
                    'canvas_id': 206,
                    'notes_id': 306,
                    'lab_id': 404,
                    'student_permission': '{"can_draw": true, "can_write": true, "can_erase": true}',
                    'is_recording': True,
                    'recording_id': 1003,
                    'status': 'completed'
                },
                {
                    'session_id': 7,
                    'actual_start': datetime.now() - timedelta(minutes=15),
                    'actual_end': None,
                    'coursework_id': 107,
                    'canvas_id': 207,
                    'notes_id': 307,
                    'lab_id': 405,
                    'student_permission': '{"can_draw": true, "can_write": true, "can_erase": false}',
                    'is_recording': False,
                    'recording_id': None,
                    'status': 'in_progress'
                },
                {
                    'session_id': 8,
                    'actual_start': None,
                    'actual_end': None,
                    'coursework_id': 108,
                    'canvas_id': 208,
                    'notes_id': 308,
                    'lab_id': None,
                    'student_permission': '{"can_draw": false, "can_write": false, "can_erase": false}',
                    'is_recording': False,
                    'recording_id': None,
                    'status': 'scheduled'
                },
                {
                    'session_id': 9,
                    'actual_start': datetime.now() - timedelta(days=2, hours=1),
                    'actual_end': datetime.now() - timedelta(days=2),
                    'coursework_id': 109,
                    'canvas_id': 209,
                    'notes_id': 309,
                    'lab_id': 406,
                    'student_permission': '{"can_draw": true, "can_write": false, "can_erase": false}',
                    'is_recording': True,
                    'recording_id': 1004,
                    'status': 'completed'
                },
                {
                    'session_id': 10,
                    'actual_start': datetime.now() - timedelta(minutes=45),
                    'actual_end': None,
                    'coursework_id': 110,
                    'canvas_id': 210,
                    'notes_id': 310,
                    'lab_id': 407,
                    'student_permission': '{"can_draw": true, "can_write": true, "can_erase": true}',
                    'is_recording': True,
                    'recording_id': 1005,
                    'status': 'in_progress'
                }
            ]

            for i, wb in enumerate(whiteboards, 1):
                conn.execute(text("""
                    INSERT INTO whiteboard (
                        session_id, actual_start, actual_end, coursework_id, canvas_id,
                        notes_id, lab_id, student_permission, is_recording, recording_id, status
                    ) VALUES (
                        :session_id, :actual_start, :actual_end, :coursework_id, :canvas_id,
                        :notes_id, :lab_id, CAST(:student_permission AS jsonb), :is_recording, :recording_id, :status
                    )
                """), wb)
                status_emoji = {
                    'completed': 'DONE',
                    'in_progress': 'ACTIVE',
                    'scheduled': 'PENDING'
                }
                print(f"   [{status_emoji.get(wb['status'], '-')}] Session {i}: {wb['status']} (session_id: {wb['session_id']})")

            trans.commit()

            print("\n" + "=" * 60)
            print("Seed data inserted successfully!")
            print("=" * 60)

            # Show summary
            print("\nSUMMARY:")
            print("-" * 60)
            result = conn.execute(text("""
                SELECT status, COUNT(*) as count
                FROM whiteboard
                GROUP BY status
                ORDER BY status;
            """))

            total = 0
            for row in result:
                print(f"  {row[0]:<20} {row[1]:>3} sessions")
                total += row[1]

            print(f"  {'TOTAL':<20} {total:>3} sessions")

            # Show recording stats
            result = conn.execute(text("""
                SELECT
                    COUNT(*) FILTER (WHERE is_recording = true) as recording_count,
                    COUNT(*) FILTER (WHERE is_recording = false) as not_recording_count
                FROM whiteboard;
            """))
            row = result.fetchone()
            print(f"\n  Recording enabled:   {row[0]:>3} sessions")
            print(f"  Recording disabled:  {row[1]:>3} sessions")

            print("\n" + "=" * 60)

        except Exception as e:
            trans.rollback()
            print(f"\nSeeding failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    seed_data()
