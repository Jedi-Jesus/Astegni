"""
Verify student enhancement tables and display sample data
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def verify_tables():
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("="*70)
    print("VERIFYING STUDENT ENHANCEMENT TABLES")
    print("="*70)

    # Check student_achievements
    print("\n1. STUDENT ACHIEVEMENTS")
    print("-" * 70)
    cursor.execute("SELECT COUNT(*) FROM student_achievements")
    count = cursor.fetchone()[0]
    print(f"Total achievements: {count}")

    cursor.execute("""
        SELECT title, achievement_type, verification_status, is_featured
        FROM student_achievements
        LIMIT 5
    """)
    print("\nSample achievements:")
    for row in cursor.fetchall():
        featured = " [FEATURED]" if row[3] else ""
        print(f"  - {row[0]} ({row[1]}, {row[2]}){featured}")

    # Check student_certifications
    print("\n2. STUDENT CERTIFICATIONS")
    print("-" * 70)
    cursor.execute("SELECT COUNT(*) FROM student_certifications")
    count = cursor.fetchone()[0]
    print(f"Total certifications: {count}")

    cursor.execute("""
        SELECT certification_name, issuing_organization, verification_status, is_featured
        FROM student_certifications
        LIMIT 5
    """)
    print("\nSample certifications:")
    for row in cursor.fetchall():
        featured = " [FEATURED]" if row[3] else ""
        print(f"  - {row[0]} by {row[1]} ({row[2]}){featured}")

    # Check student_extracurricular_activities
    print("\n3. STUDENT EXTRACURRICULAR ACTIVITIES")
    print("-" * 70)
    cursor.execute("SELECT COUNT(*) FROM student_extracurricular_activities")
    count = cursor.fetchone()[0]
    print(f"Total activities: {count}")

    cursor.execute("""
        SELECT activity_name, activity_type, role_position, is_currently_active, verification_status
        FROM student_extracurricular_activities
        LIMIT 5
    """)
    print("\nSample activities:")
    for row in cursor.fetchall():
        active = " [ACTIVE]" if row[3] else " [ENDED]"
        print(f"  - {row[0]} ({row[1]}) - {row[2]}{active} ({row[4]})")

    # Check verification status distribution
    print("\n4. VERIFICATION STATUS DISTRIBUTION")
    print("-" * 70)

    cursor.execute("""
        SELECT verification_status, COUNT(*)
        FROM student_achievements
        GROUP BY verification_status
    """)
    print("\nAchievements:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]}")

    cursor.execute("""
        SELECT verification_status, COUNT(*)
        FROM student_certifications
        GROUP BY verification_status
    """)
    print("\nCertifications:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]}")

    cursor.execute("""
        SELECT verification_status, COUNT(*)
        FROM student_extracurricular_activities
        GROUP BY verification_status
    """)
    print("\nExtracurricular Activities:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]}")

    # Check featured items
    print("\n5. FEATURED ITEMS")
    print("-" * 70)

    cursor.execute("SELECT COUNT(*) FROM student_achievements WHERE is_featured = TRUE")
    print(f"Featured achievements: {cursor.fetchone()[0]}")

    cursor.execute("SELECT COUNT(*) FROM student_certifications WHERE is_featured = TRUE")
    print(f"Featured certifications: {cursor.fetchone()[0]}")

    cursor.execute("SELECT COUNT(*) FROM student_extracurricular_activities WHERE is_featured = TRUE")
    print(f"Featured activities: {cursor.fetchone()[0]}")

    # Check a complete student profile
    print("\n6. SAMPLE COMPLETE STUDENT PROFILE")
    print("-" * 70)

    cursor.execute("""
        SELECT DISTINCT student_id
        FROM student_achievements
        LIMIT 1
    """)
    student_id = cursor.fetchone()[0]

    print(f"\nStudent ID: {student_id}")

    cursor.execute("""
        SELECT COUNT(*) FROM student_achievements WHERE student_id = %s
    """, (student_id,))
    print(f"  - Achievements: {cursor.fetchone()[0]}")

    cursor.execute("""
        SELECT COUNT(*) FROM student_certifications WHERE student_id = %s
    """, (student_id,))
    print(f"  - Certifications: {cursor.fetchone()[0]}")

    cursor.execute("""
        SELECT COUNT(*) FROM student_extracurricular_activities WHERE student_id = %s
    """, (student_id,))
    print(f"  - Extracurricular Activities: {cursor.fetchone()[0]}")

    print("\n" + "="*70)
    print("VERIFICATION COMPLETE - ALL TABLES WORKING!")
    print("="*70)

    cursor.close()
    conn.close()

if __name__ == "__main__":
    verify_tables()
