import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

print('ASTEGNI ROLE STRUCTURE:')
print('=' * 60)

print('\n1. USERS TABLE (Base table for all users):')
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'roles'")
has_roles = cur.fetchone() is not None
print(f'  - Has "roles" column: {has_roles}')

if has_roles:
    cur.execute("SELECT id, first_name, father_name, roles FROM users WHERE id = 115")
    user = cur.fetchone()
    if user:
        print(f'\n  User 115 in users table:')
        print(f'    ID: {user[0]}')
        print(f'    Name: {user[1]} {user[2]}')
        print(f'    Roles stored in users table: {user[3]}')
        print(f'    \n    NOTE: This is CORRECT! The "roles" array indicates which')
        print(f'          profile tables the user has records in.')

print('\n\n2. ROLE-SPECIFIC PROFILE TABLES:')
print('   (Each role has its own table with detailed info)')
print('-' * 60)

# Check each profile table
tables = {
    'student_profiles': 'Student-specific data (grade, subjects, etc.)',
    'tutor_profiles': 'Tutor-specific data (expertise, rates, etc.)',
    'parent_profiles': 'Parent-specific data (children, etc.)',
    'admin_profile': 'Admin-specific data (department, permissions, etc.)',
    'advertiser_profiles': 'Advertiser-specific data (campaigns, etc.)'
}

for table, description in tables.items():
    cur.execute(f"SELECT table_name FROM information_schema.tables WHERE table_name = '{table}'")
    exists = cur.fetchone() is not None

    print(f'\n  {table}:')
    print(f'    Exists: {exists}')
    print(f'    Purpose: {description}')

    if exists and table != 'advertiser_profiles':
        # Check if user 115 has a profile in this table
        if table == 'admin_profile':
            cur.execute(f"SELECT id, user_id FROM {table} WHERE user_id = 115")
        else:
            cur.execute(f"SELECT id, user_id FROM {table} WHERE user_id = 115")

        profile = cur.fetchone()
        if profile:
            print(f'    User 115 profile ID: {profile[0]}')
        else:
            print(f'    User 115 profile: NOT FOUND')

print('\n\n3. HOW IT WORKS:')
print('=' * 60)
print("""
The "roles" array in the users table is just a LIST of roles.
It does NOT store role data - it's just a reference!

Example: User 115 has roles: ['admin', 'tutor', 'student', 'parent']

This means:
  ✓ User 115 has a record in student_profiles table
  ✓ User 115 has a record in tutor_profiles table
  ✓ User 115 has a record in admin_profile table
  ✓ User 115 has a record in parent_profiles table

Each profile table stores role-specific data:
  - student_profiles: grade_level, studying_at, etc.
  - tutor_profiles: teaching_experience, subjects, rates, etc.
  - admin_profile: department, position, permissions, etc.
  - parent_profiles: children_ids, etc.

So you're correct: The "admin" role data is NOT in users table,
it's in the admin_profile table!
""")

print('\n4. USER 115 COMPLETE PROFILE:')
print('=' * 60)

cur.execute("SELECT id, first_name, father_name, email, roles, active_role FROM users WHERE id = 115")
user = cur.fetchone()

if user:
    print(f'\nBase User Info (from users table):')
    print(f'  ID: {user[0]}')
    print(f'  Name: {user[1]} {user[2]}')
    print(f'  Email: {user[3]}')
    print(f'  Roles: {user[4]}')
    print(f'  Active Role: {user[5]}')

    # Check each profile
    print(f'\nRole-Specific Profiles:')

    # Student
    cur.execute("SELECT id, grade_level FROM student_profiles WHERE user_id = 115")
    student = cur.fetchone()
    if student:
        print(f'  ✓ Student Profile (ID {student[0]}): Grade {student[1]}')

    # Tutor
    cur.execute("SELECT id FROM tutor_profiles WHERE user_id = 115")
    tutor = cur.fetchone()
    if tutor:
        print(f'  ✓ Tutor Profile (ID {tutor[0]})')

    # Admin
    cur.execute("SELECT id, department FROM admin_profile WHERE user_id = 115")
    admin = cur.fetchone()
    if admin:
        print(f'  ✓ Admin Profile (ID {admin[0]}): Department {admin[1] if admin[1] else "Not set"}')

    # Parent
    cur.execute("SELECT id FROM parent_profiles WHERE user_id = 115")
    parent = cur.fetchone()
    if parent:
        print(f'  ✓ Parent Profile (ID {parent[0]})')

cur.close()
conn.close()
