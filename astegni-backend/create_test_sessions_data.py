"""
Create test data for sessions panel testing
- Creates student profiles with and without parents
- Creates enrolled_courses
- Creates sessions
"""

import psycopg
import os
import json
import sys
from dotenv import load_dotenv
from datetime import datetime, date, time, timedelta

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

def main():
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()

    try:
        print("=" * 60)
        print("CREATING TEST DATA FOR SESSIONS PANEL")
        print("=" * 60)

        # Step 1: Get or create test tutor
        print("\n1. Setting up test tutor...")
        cur.execute("""
            SELECT id FROM users WHERE email = 'jediael.s.abebe@gmail.com'
        """)
        user_row = cur.fetchone()
        if not user_row:
            print("   ERROR: Test user not found!")
            return

        user_id = user_row[0]
        print(f"   ✓ Found user ID: {user_id}")

        # Get tutor profile
        cur.execute("""
            SELECT id FROM tutor_profiles WHERE user_id = %s
        """, (user_id,))
        tutor_row = cur.fetchone()
        if not tutor_row:
            print("   ERROR: Tutor profile not found!")
            return

        tutor_profile_id = tutor_row[0]
        print(f"   ✓ Found tutor profile ID: {tutor_profile_id}")

        # Step 2: Get or create tutor package
        print("\n2. Setting up test package...")
        cur.execute("""
            SELECT id FROM tutor_packages
            WHERE tutor_id = %s
            LIMIT 1
        """, (tutor_profile_id,))
        package_row = cur.fetchone()

        if not package_row:
            # Create a test package
            cur.execute("""
                INSERT INTO tutor_packages (
                    tutor_id, name, description, price, duration,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING id
            """, (
                tutor_profile_id,
                'Test Math Package',
                'Test package for sessions testing',
                500.00,
                60
            ))
            package_id = cur.fetchone()[0]
            print(f"   ✓ Created test package ID: {package_id}")
        else:
            package_id = package_row[0]
            print(f"   ✓ Found existing package ID: {package_id}")

        # Step 3: Create test students (2 with parent, 2 without parent)
        print("\n3. Creating test students...")
        student_profiles = []

        # Create 2 students WITHOUT parents (direct enrollment)
        for i in range(1, 3):
            # Create user
            email = f'test_student_{i}@example.com'
            cur.execute("""
                INSERT INTO users (
                    first_name, father_name, email, password_hash,
                    roles, active_role, is_active, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, true, NOW())
                ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
                RETURNING id
            """, (
                f'Student{i}',
                'TestFather',
                email,
                'hashed_password',
                json.dumps(['student']),
                'student'
            ))
            student_user_id = cur.fetchone()[0]

            # Create student profile WITHOUT parent
            cur.execute("""
                INSERT INTO student_profiles (
                    user_id, grade_level, parent_id, is_active,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, true, NOW(), NOW())
                RETURNING id
            """, (student_user_id, 'Grade 10', None))  # parent_id = NULL
            student_profile_id = cur.fetchone()[0]
            student_profiles.append({
                'id': student_profile_id,
                'name': f'Student{i} TestFather',
                'has_parent': False
            })
            print(f"   ✓ Created student {i} (NO PARENT) - ID: {student_profile_id}")

        # Create 2 students WITH parents (parent enrollment)
        for i in range(3, 5):
            # Create user
            email = f'test_student_{i}@example.com'
            cur.execute("""
                INSERT INTO users (
                    first_name, father_name, email, password_hash,
                    roles, active_role, is_active, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, true, NOW())
                ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
                RETURNING id
            """, (
                f'Student{i}',
                'TestFather',
                email,
                'hashed_password',
                json.dumps(['student']),
                'student'
            ))
            student_user_id = cur.fetchone()[0]

            # Create parent
            parent_email = f'test_parent_{i}@example.com'
            cur.execute("""
                INSERT INTO users (
                    first_name, father_name, email, password_hash,
                    roles, active_role, is_active, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, true, NOW())
                ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
                RETURNING id
            """, (
                f'Parent{i}',
                'TestParent',
                parent_email,
                'hashed_password',
                json.dumps(['parent']),
                'parent'
            ))
            parent_user_id = cur.fetchone()[0]

            # Create parent profile
            cur.execute("""
                INSERT INTO parent_profiles (
                    user_id, is_active, created_at, updated_at
                ) VALUES (%s, true, NOW(), NOW())
                RETURNING id
            """, (parent_user_id,))
            parent_profile_id = cur.fetchone()[0]

            # Create student profile WITH parent
            cur.execute("""
                INSERT INTO student_profiles (
                    user_id, grade_level, parent_id, is_active,
                    created_at, updated_at
                ) VALUES (%s, %s, ARRAY[%s]::INTEGER[], true, NOW(), NOW())
                RETURNING id
            """, (student_user_id, 'Grade 10', parent_profile_id))  # parent_id as PostgreSQL array
            student_profile_id = cur.fetchone()[0]
            student_profiles.append({
                'id': student_profile_id,
                'name': f'Student{i} TestFather',
                'has_parent': True,
                'parent_id': parent_profile_id
            })
            print(f"   ✓ Created student {i} (WITH PARENT) - ID: {student_profile_id}, Parent: {parent_profile_id}")

        # Step 4: Create enrolled_courses for each student
        print("\n4. Creating enrolled courses...")
        enrolled_course_ids = []
        for student in student_profiles:
            cur.execute("""
                INSERT INTO enrolled_courses (
                    tutor_id, package_id, students_id, enrolled_at,
                    status, created_at, updated_at
                ) VALUES (%s, %s, ARRAY[%s]::INTEGER[], NOW(), 'active', NOW(), NOW())
                RETURNING id
            """, (
                tutor_profile_id,
                package_id,
                student['id']  # students_id as PostgreSQL array
            ))
            enrolled_course_id = cur.fetchone()[0]
            enrolled_course_ids.append({
                'id': enrolled_course_id,
                'student': student
            })
            parent_info = f" (Parent: {student.get('parent_id')})" if student['has_parent'] else " (Direct)"
            print(f"   ✓ Created enrollment {enrolled_course_id} for {student['name']}{parent_info}")

        # Step 5: Create sessions for each enrollment
        print("\n5. Creating test sessions...")
        session_count = 0
        today = date.today()

        for enrollment in enrolled_course_ids:
            # Create 3 sessions per enrollment (different dates)
            for day_offset in [0, 3, 7]:
                session_date = today + timedelta(days=day_offset)
                start_time_obj = time(14, 0)  # 2:00 PM
                end_time_obj = time(15, 30)   # 3:30 PM

                cur.execute("""
                    INSERT INTO sessions (
                        enrolled_courses_id, session_date, start_time, end_time,
                        duration, topics, session_mode, status,
                        notification_enabled, alarm_enabled, alarm_before_minutes,
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    RETURNING id
                """, (
                    enrollment['id'],
                    session_date,
                    start_time_obj,
                    end_time_obj,
                    90,  # 90 minutes
                    json.dumps(['Algebra', 'Geometry']),
                    'online',
                    'scheduled',
                    False,
                    False,
                    15
                ))
                session_id = cur.fetchone()[0]
                session_count += 1
                parent_info = " (Parent)" if enrollment['student']['has_parent'] else " (Direct)"
                print(f"   ✓ Created session {session_id} for {session_date}{parent_info}")

        conn.commit()

        print("\n" + "=" * 60)
        print("✅ TEST DATA CREATED SUCCESSFULLY!")
        print("=" * 60)
        print(f"  - Created {len(student_profiles)} students")
        print(f"    └─ {sum(1 for s in student_profiles if not s['has_parent'])} without parents (direct enrollment)")
        print(f"    └─ {sum(1 for s in student_profiles if s['has_parent'])} with parents (parent enrollment)")
        print(f"  - Created {len(enrolled_course_ids)} enrollments")
        print(f"  - Created {session_count} sessions")
        print("\nNow test the sessions panel with role filters!")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    main()
