"""
Fix orphaned student IDs in parent_profiles.children_ids and enrolled_courses.students_id
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    return psycopg.connect(database_url)

conn = get_db_connection()
cur = conn.cursor()

print("="*80)
print("FIXING ORPHANED STUDENT IDS")
print("="*80)

# 1. Find all valid student profile IDs
cur.execute("SELECT id FROM student_profiles ORDER BY id")
valid_student_ids = [row[0] for row in cur.fetchall()]
print(f"\nValid student profile IDs: {valid_student_ids}")

# 2. Check parent_profiles for orphaned children_ids
print("\n" + "-"*80)
print("Checking parent_profiles.children_ids...")
print("-"*80)

cur.execute("""
    SELECT pp.id, pp.user_id, u.email, pp.children_ids
    FROM parent_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE pp.children_ids IS NOT NULL AND array_length(pp.children_ids, 1) > 0
""")

parents_to_fix = []
for row in cur.fetchall():
    parent_id, user_id, email, children_ids = row
    orphaned = [cid for cid in children_ids if cid not in valid_student_ids]

    if orphaned:
        print(f"\nParent ID {parent_id} ({email}):")
        print(f"  Current children_ids: {children_ids}")
        print(f"  Orphaned IDs: {orphaned}")

        valid_children = [cid for cid in children_ids if cid in valid_student_ids]
        print(f"  After cleanup: {valid_children if valid_children else '[]'}")

        parents_to_fix.append((parent_id, valid_children if valid_children else None))

# 3. Check enrolled_courses for orphaned students_id
print("\n" + "-"*80)
print("Checking enrolled_courses.students_id...")
print("-"*80)

cur.execute("""
    SELECT id, tutor_id, students_id
    FROM enrolled_courses
    WHERE students_id IS NOT NULL AND array_length(students_id, 1) > 0
""")

enrollments_to_fix = []
for row in cur.fetchall():
    enrollment_id, tutor_id, students_id = row
    orphaned = [sid for sid in students_id if sid not in valid_student_ids]

    if orphaned:
        print(f"\nEnrollment ID {enrollment_id} (tutor={tutor_id}):")
        print(f"  Current students_id: {students_id}")
        print(f"  Orphaned IDs: {orphaned}")

        valid_students = [sid for sid in students_id if sid in valid_student_ids]
        print(f"  After cleanup: {valid_students if valid_students else '[]'}")

        enrollments_to_fix.append((enrollment_id, valid_students if valid_students else None))

# 4. Ask for confirmation
print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"Parent profiles to fix: {len(parents_to_fix)}")
print(f"Enrollments to fix: {len(enrollments_to_fix)}")

if not parents_to_fix and not enrollments_to_fix:
    print("\nNo orphaned IDs found. Database is clean!")
    conn.close()
    exit(0)

print("\n" + "="*80)
response = input("Apply fixes? (yes/no): ")

if response.lower() != 'yes':
    print("Aborted.")
    conn.close()
    exit(0)

# 5. Apply fixes
print("\nApplying fixes...")

# Fix parent_profiles
for parent_id, new_children_ids in parents_to_fix:
    if new_children_ids is None:
        cur.execute("""
            UPDATE parent_profiles
            SET children_ids = NULL
            WHERE id = %s
        """, (parent_id,))
        print(f"  Set parent_profiles.children_ids = NULL for parent ID {parent_id}")
    else:
        cur.execute("""
            UPDATE parent_profiles
            SET children_ids = %s
            WHERE id = %s
        """, (new_children_ids, parent_id))
        print(f"  Updated parent_profiles.children_ids = {new_children_ids} for parent ID {parent_id}")

# Fix enrolled_courses
for enrollment_id, new_students_id in enrollments_to_fix:
    if new_students_id is None or len(new_students_id) == 0:
        # Delete enrollment if no valid students
        cur.execute("""
            DELETE FROM enrolled_courses
            WHERE id = %s
        """, (enrollment_id,))
        print(f"  Deleted enrollment ID {enrollment_id} (no valid students)")
    else:
        cur.execute("""
            UPDATE enrolled_courses
            SET students_id = %s
            WHERE id = %s
        """, (new_students_id, enrollment_id))
        print(f"  Updated enrolled_courses.students_id = {new_students_id} for enrollment ID {enrollment_id}")

conn.commit()
print("\nDone! All fixes applied.")

conn.close()
