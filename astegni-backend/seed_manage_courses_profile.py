"""
Seed manage_courses_profile table with test data
"""
import psycopg
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import sys
import json

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def seed_manage_courses_profile():
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("Seeding manage_courses_profile table...")

        # Check if data already exists for admin_id 1
        cursor.execute("SELECT admin_id FROM manage_courses_profile WHERE admin_id = 1")
        existing = cursor.fetchone()

        if existing:
            print("Data already exists for admin_id 1, updating...")
            # Update existing record
            cursor.execute("""
                UPDATE manage_courses_profile
                SET
                    position = %s,
                    rating = %s,
                    total_reviews = %s,
                    badges = %s,
                    courses_created = %s,
                    courses_approved = %s,
                    courses_rejected = %s,
                    courses_archived = %s,
                    students_enrolled = %s,
                    avg_course_rating = %s,
                    permissions = %s,
                    joined_date = %s,
                    updated_at = %s
                WHERE admin_id = 1
            """, (
                'Senior Course Manager',
                4.8,
                127,
                json.dumps(['Expert Reviewer', 'Top Performer', 'Quality Champion']),
                156,
                142,
                8,
                6,
                3250,
                4.6,
                json.dumps({
                    "can_approve_courses": True,
                    "can_reject_courses": True,
                    "can_suspend_courses": True,
                    "can_view_analytics": True,
                    "can_manage_notifications": True
                }),
                (datetime.now() - timedelta(days=365)),
                datetime.now()
            ))
        else:
            print("Creating new record for admin_id 1...")
            # Insert new record
            cursor.execute("""
                INSERT INTO manage_courses_profile (
                    admin_id, username, position, rating, total_reviews, badges,
                    courses_created, courses_approved, courses_rejected, courses_archived,
                    students_enrolled, avg_course_rating, permissions, joined_date,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                1,
                'jediael_test1',
                'Senior Course Manager',
                4.8,
                127,
                json.dumps(['Expert Reviewer', 'Top Performer', 'Quality Champion']),
                156,
                142,
                8,
                6,
                3250,
                4.6,
                json.dumps({
                    "can_approve_courses": True,
                    "can_reject_courses": True,
                    "can_suspend_courses": True,
                    "can_view_analytics": True,
                    "can_manage_notifications": True
                }),
                (datetime.now() - timedelta(days=365)),
                datetime.now(),
                datetime.now()
            ))

        conn.commit()
        print("SUCCESS: manage_courses_profile seeded successfully!")

        # Display the seeded data
        cursor.execute("""
            SELECT admin_id, position, rating, total_reviews, courses_created,
                   courses_approved, courses_rejected, students_enrolled
            FROM manage_courses_profile
            WHERE admin_id = 1
        """)

        row = cursor.fetchone()
        if row:
            print("\nSeeded Profile Data:")
            print(f"   Admin ID: {row[0]}")
            print(f"   Position: {row[1]}")
            print(f"   Rating: {row[2]}")
            print(f"   Total Reviews: {row[3]}")
            print(f"   Courses Created: {row[4]}")
            print(f"   Courses Approved: {row[5]}")
            print(f"   Courses Rejected: {row[6]}")
            print(f"   Students Enrolled: {row[7]}")

    except Exception as e:
        print(f"ERROR: Error seeding data: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    seed_manage_courses_profile()
