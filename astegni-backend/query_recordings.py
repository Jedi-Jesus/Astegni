"""
Query whiteboard_session_recordings table safely (handles UTF-8)

This script displays the table data without encoding errors
"""

import psycopg
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"
    return psycopg.connect(database_url)

def query_recordings():
    """Query and display all recordings"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Query all recordings
        cursor.execute("""
            SELECT
                r.id,
                r.session_id,
                r.student_id,
                r.recording_title,
                r.recording_type,
                r.file_url,
                r.duration_seconds,
                r.recording_date,
                r.is_processing,
                r.is_available,
                r.created_at
            FROM whiteboard_session_recordings r
            ORDER BY r.id
        """)

        rows = cursor.fetchall()

        print("\n" + "=" * 100)
        print("WHITEBOARD SESSION RECORDINGS")
        print("=" * 100)
        print(f"\nTotal records: {len(rows)}\n")

        if not rows:
            print("No recordings found.")
            return

        # Display data
        for i, row in enumerate(rows, 1):
            student_ids = row[2] if row[2] else []

            # Get student names for all IDs
            student_names = []
            if student_ids:
                cursor.execute("""
                    SELECT CONCAT(first_name, ' ', father_name, ' ', grandfather_name) as full_name
                    FROM users
                    WHERE id = ANY(%s)
                    ORDER BY id
                """, (student_ids,))
                student_names = [name[0] for name in cursor.fetchall()]

            print(f"Recording #{i}")
            print("-" * 100)
            print(f"  ID:               {row[0]}")
            print(f"  Session ID:       {row[1]}")
            print(f"  Student IDs:      {student_ids if student_ids else 'N/A'}")
            print(f"  Student Names:    {', '.join(student_names) if student_names else 'N/A'}")
            print(f"  Title:            {row[3]}")
            print(f"  Type:             {row[4]}")
            print(f"  File URL:         {row[5] if row[5] else 'N/A'}")
            print(f"  Duration (sec):   {row[6] if row[6] else 0}")
            print(f"  Recording Date:   {row[7].strftime('%Y-%m-%d %H:%M:%S') if row[7] else 'N/A'}")
            print(f"  Is Processing:    {row[8]}")
            print(f"  Is Available:     {row[9]}")
            print(f"  Created At:       {row[10].strftime('%Y-%m-%d %H:%M:%S') if row[10] else 'N/A'}")
            print()

        print("=" * 100)

        # Summary statistics
        print("\nSummary:")
        print("-" * 100)

        cursor.execute("""
            SELECT
                recording_type,
                COUNT(*) as count,
                AVG(duration_seconds) as avg_duration
            FROM whiteboard_session_recordings
            GROUP BY recording_type
        """)

        stats = cursor.fetchall()
        print("\nBy Recording Type:")
        for stat in stats:
            print(f"  {stat[0]}: {stat[1]} recordings (avg duration: {stat[2] if stat[2] else 0:.0f}s)")

        cursor.execute("""
            SELECT COUNT(*) FROM whiteboard_session_recordings
            WHERE is_available = true
        """)
        available = cursor.fetchone()[0]
        print(f"\nAvailable recordings: {available}")

        cursor.execute("""
            SELECT COUNT(*) FROM whiteboard_session_recordings
            WHERE is_processing = true
        """)
        processing = cursor.fetchone()[0]
        print(f"Processing recordings: {processing}")

        print("\n" + "=" * 100)

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

    finally:
        cursor.close()
        conn.close()

def query_by_session(session_id):
    """Query recordings for a specific session"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                id,
                recording_title,
                recording_type,
                duration_seconds,
                recording_date,
                is_available
            FROM whiteboard_session_recordings
            WHERE session_id = %s
            ORDER BY recording_date DESC
        """, (session_id,))

        rows = cursor.fetchall()

        print(f"\n=== Recordings for Session {session_id} ===")
        print(f"Found {len(rows)} recording(s)\n")

        for row in rows:
            print(f"ID: {row[0]} | Title: {row[1]} | Type: {row[2]} | Duration: {row[3]}s | Available: {row[5]}")

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        # Query by session ID
        session_id = int(sys.argv[1])
        query_by_session(session_id)
    else:
        # Query all recordings
        query_recordings()
