"""
Comprehensive orphaned data cleanup script
Checks and fixes all tables with foreign key-like references
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
print("COMPREHENSIVE ORPHANED DATA CLEANUP")
print("="*80)

total_fixes = 0

# ============================================================================
# 1. STUDENT PROFILE ORPHANS
# ============================================================================
print("\n[1/8] Checking student_profiles references...")

cur.execute("SELECT id FROM student_profiles")
valid_student_ids = [row[0] for row in cur.fetchall()]
print(f"   Valid student IDs: {len(valid_student_ids)} profiles")

# Fix parent_profiles.children_ids
cur.execute("SELECT id, children_ids FROM parent_profiles WHERE children_ids IS NOT NULL")
for parent_id, children_ids in cur.fetchall():
    valid_children = [cid for cid in children_ids if cid in valid_student_ids]
    if valid_children != children_ids:
        if valid_children:
            cur.execute("UPDATE parent_profiles SET children_ids = %s WHERE id = %s", (valid_children, parent_id))
            print(f"   Fixed parent {parent_id}: {children_ids} -> {valid_children}")
        else:
            cur.execute("UPDATE parent_profiles SET children_ids = NULL WHERE id = %s", (parent_id,))
            print(f"   Cleared parent {parent_id}: {children_ids} -> NULL")
        total_fixes += 1

# Fix enrolled_courses.students_id
cur.execute("SELECT id, students_id FROM enrolled_courses WHERE students_id IS NOT NULL")
for enrollment_id, students_id in cur.fetchall():
    valid_students = [sid for sid in students_id if sid in valid_student_ids]
    if valid_students != students_id:
        if valid_students:
            cur.execute("UPDATE enrolled_courses SET students_id = %s WHERE id = %s", (valid_students, enrollment_id))
            print(f"   Fixed enrollment {enrollment_id}: {students_id} -> {valid_students}")
        else:
            cur.execute("DELETE FROM enrolled_courses WHERE id = %s", (enrollment_id,))
            print(f"   Deleted enrollment {enrollment_id} (no valid students)")
        total_fixes += 1

# ============================================================================
# 2. TUTOR PROFILE ORPHANS
# ============================================================================
print("\n[2/8] Checking tutor_profiles references...")

cur.execute("SELECT id FROM tutor_profiles")
valid_tutor_ids = [row[0] for row in cur.fetchall()]
print(f"   Valid tutor IDs: {len(valid_tutor_ids)} profiles")

# Fix enrolled_courses.tutor_id
cur.execute("SELECT id, tutor_id FROM enrolled_courses WHERE tutor_id IS NOT NULL")
orphaned_enrollments = []
for enrollment_id, tutor_id in cur.fetchall():
    if tutor_id not in valid_tutor_ids:
        orphaned_enrollments.append(enrollment_id)

if orphaned_enrollments:
    for enrollment_id in orphaned_enrollments:
        cur.execute("DELETE FROM enrolled_courses WHERE id = %s", (enrollment_id,))
        print(f"   Deleted enrollment {enrollment_id} (orphaned tutor)")
        total_fixes += 1

# ============================================================================
# 3. PARENT PROFILE ORPHANS
# ============================================================================
print("\n[3/8] Checking parent_profiles references...")

cur.execute("SELECT id FROM parent_profiles")
valid_parent_ids = [row[0] for row in cur.fetchall()]
print(f"   Valid parent IDs: {len(valid_parent_ids)} profiles")

# Check any tables that might reference parent_profiles (add if needed)
# Currently no other tables reference parent_profiles directly

# ============================================================================
# 4. USER ORPHANS
# ============================================================================
print("\n[4/8] Checking users references...")

cur.execute("SELECT id FROM users")
valid_user_ids = [row[0] for row in cur.fetchall()]
print(f"   Valid user IDs: {len(valid_user_ids)} users")

# Check student_profiles.user_id
cur.execute("SELECT id, user_id FROM student_profiles WHERE user_id NOT IN (SELECT id FROM users)")
orphaned_students = cur.fetchall()
if orphaned_students:
    for student_id, user_id in orphaned_students:
        cur.execute("DELETE FROM student_profiles WHERE id = %s", (student_id,))
        print(f"   Deleted student profile {student_id} (orphaned user {user_id})")
        total_fixes += 1

# Check tutor_profiles.user_id
cur.execute("SELECT id, user_id FROM tutor_profiles WHERE user_id NOT IN (SELECT id FROM users)")
orphaned_tutors = cur.fetchall()
if orphaned_tutors:
    for tutor_id, user_id in orphaned_tutors:
        cur.execute("DELETE FROM tutor_profiles WHERE id = %s", (tutor_id,))
        print(f"   Deleted tutor profile {tutor_id} (orphaned user {user_id})")
        total_fixes += 1

# Check parent_profiles.user_id
cur.execute("SELECT id, user_id FROM parent_profiles WHERE user_id NOT IN (SELECT id FROM users)")
orphaned_parents = cur.fetchall()
if orphaned_parents:
    for parent_id, user_id in orphaned_parents:
        cur.execute("DELETE FROM parent_profiles WHERE id = %s", (parent_id,))
        print(f"   Deleted parent profile {parent_id} (orphaned user {user_id})")
        total_fixes += 1

# Check advertiser_profiles.user_id
cur.execute("SELECT id, user_id FROM advertiser_profiles WHERE user_id NOT IN (SELECT id FROM users)")
orphaned_advertisers = cur.fetchall()
if orphaned_advertisers:
    for advertiser_id, user_id in orphaned_advertisers:
        cur.execute("DELETE FROM advertiser_profiles WHERE id = %s", (advertiser_id,))
        print(f"   Deleted advertiser profile {advertiser_id} (orphaned user {user_id})")
        total_fixes += 1

# ============================================================================
# 5. COURSE ORPHANS
# ============================================================================
print("\n[5/8] Checking courses references...")

cur.execute("SELECT id FROM courses")
valid_course_ids = [row[0] for row in cur.fetchall()]
print(f"   Valid course IDs: {len(valid_course_ids)} courses")

# Fix enrolled_courses.course_id (array field)
cur.execute("SELECT id, course_id FROM enrolled_courses WHERE course_id IS NOT NULL")
for enrollment_id, course_ids in cur.fetchall():
    if course_ids:  # Check if array is not empty
        valid_courses = [cid for cid in course_ids if cid in valid_course_ids]
        if valid_courses != course_ids:
            cur.execute("UPDATE enrolled_courses SET course_id = %s WHERE id = %s", (valid_courses if valid_courses else None, enrollment_id))
            print(f"   Fixed enrollment {enrollment_id} courses: {course_ids} -> {valid_courses if valid_courses else 'NULL'}")
            total_fixes += 1

# ============================================================================
# 6. PACKAGE ORPHANS
# ============================================================================
print("\n[6/8] Checking tutor_packages references...")

cur.execute("SELECT id FROM tutor_packages")
valid_package_ids = [row[0] for row in cur.fetchall()]
print(f"   Valid package IDs: {len(valid_package_ids)} packages")

# Fix enrolled_courses.package_id
cur.execute("SELECT id, package_id FROM enrolled_courses WHERE package_id IS NOT NULL AND package_id NOT IN (SELECT id FROM tutor_packages)")
orphaned_package_refs = cur.fetchall()
if orphaned_package_refs:
    for enrollment_id, package_id in orphaned_package_refs:
        cur.execute("UPDATE enrolled_courses SET package_id = NULL WHERE id = %s", (enrollment_id,))
        print(f"   Cleared enrollment {enrollment_id} package_id (orphaned package {package_id})")
        total_fixes += 1

# ============================================================================
# 7. ENROLLED_COURSES ORPHANS IN SESSIONS
# ============================================================================
print("\n[7/8] Checking sessions.enrolled_courses_id...")

cur.execute("SELECT id FROM enrolled_courses")
valid_enrollment_ids = [row[0] for row in cur.fetchall()]
print(f"   Valid enrollment IDs: {len(valid_enrollment_ids)} enrollments")

cur.execute("SELECT id, enrolled_courses_id FROM sessions WHERE enrolled_courses_id IS NOT NULL AND enrolled_courses_id NOT IN (SELECT id FROM enrolled_courses)")
orphaned_sessions = cur.fetchall()
if orphaned_sessions:
    for session_id, enrollment_id in orphaned_sessions:
        cur.execute("DELETE FROM sessions WHERE id = %s", (session_id,))
        print(f"   Deleted session {session_id} (orphaned enrollment {enrollment_id})")
        total_fixes += 1

# ============================================================================
# 8. WHITEBOARD SESSION ORPHANS
# ============================================================================
print("\n[8/8] Checking whiteboard_sessions references...")

cur.execute("SELECT id FROM whiteboard_sessions")
valid_whiteboard_ids = [row[0] for row in cur.fetchall()]
print(f"   Valid whiteboard session IDs: {len(valid_whiteboard_ids)} sessions")

# Fix sessions.whiteboard_id
cur.execute("SELECT id, whiteboard_id FROM sessions WHERE whiteboard_id IS NOT NULL AND whiteboard_id NOT IN (SELECT id FROM whiteboard_sessions)")
orphaned_whiteboard_refs = cur.fetchall()
if orphaned_whiteboard_refs:
    for session_id, whiteboard_id in orphaned_whiteboard_refs:
        cur.execute("UPDATE sessions SET whiteboard_id = NULL WHERE id = %s", (session_id,))
        print(f"   Cleared session {session_id} whiteboard_id (orphaned {whiteboard_id})")
        total_fixes += 1

# ============================================================================
# COMMIT CHANGES
# ============================================================================
print("\n" + "="*80)
print(f"SUMMARY: {total_fixes} orphaned references fixed")
print("="*80)

if total_fixes > 0:
    conn.commit()
    print("✅ All changes committed to database")
else:
    print("✅ Database is clean - no orphaned data found")

conn.close()
print("\nDone!")
