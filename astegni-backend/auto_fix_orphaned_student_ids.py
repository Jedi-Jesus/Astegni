"""
Auto-fix orphaned student IDs (no confirmation needed)
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

print("Fixing orphaned student IDs...")

# Get valid student IDs
cur.execute("SELECT id FROM student_profiles")
valid_ids = [row[0] for row in cur.fetchall()]

# Fix parent_profiles
cur.execute("SELECT id, children_ids FROM parent_profiles WHERE children_ids IS NOT NULL")
for parent_id, children_ids in cur.fetchall():
    valid_children = [cid for cid in children_ids if cid in valid_ids]
    if valid_children != children_ids:
        if valid_children:
            cur.execute("UPDATE parent_profiles SET children_ids = %s WHERE id = %s", (valid_children, parent_id))
            print(f"Updated parent {parent_id}: {children_ids} -> {valid_children}")
        else:
            cur.execute("UPDATE parent_profiles SET children_ids = NULL WHERE id = %s", (parent_id,))
            print(f"Cleared parent {parent_id}: {children_ids} -> NULL")

# Fix enrolled_courses
cur.execute("SELECT id, students_id FROM enrolled_courses WHERE students_id IS NOT NULL")
for enrollment_id, students_id in cur.fetchall():
    valid_students = [sid for sid in students_id if sid in valid_ids]
    if valid_students != students_id:
        if valid_students:
            cur.execute("UPDATE enrolled_courses SET students_id = %s WHERE id = %s", (valid_students, enrollment_id))
            print(f"Updated enrollment {enrollment_id}: {students_id} -> {valid_students}")
        else:
            cur.execute("DELETE FROM enrolled_courses WHERE id = %s", (enrollment_id,))
            print(f"Deleted enrollment {enrollment_id} (no valid students)")

conn.commit()
print("Done!")
conn.close()
