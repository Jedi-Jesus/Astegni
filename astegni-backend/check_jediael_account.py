"""
Check jediael.s.abebe@gmail.com account details
"""
import sys
import os
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from models import SessionLocal, User, StudentProfile, TutorProfile, ParentProfile, AdvertiserProfile
from sqlalchemy import text

db = SessionLocal()

# Find user by email
user = db.query(User).filter(User.email == 'jediael.s.abebe@gmail.com').first()

if user:
    print('========== USER FOUND ==========')
    print(f'ID: {user.id}')
    print(f'Email: {user.email}')
    print(f'Phone: {user.phone}')
    print(f'First Name: {user.first_name}')
    print(f'Father Name: {user.father_name}')
    print(f'Grandfather Name: {user.grandfather_name}')
    print(f'Roles: {user.roles}')
    print(f'Active Role: {user.active_role}')
    print(f'Profile Picture: {user.profile_picture}')
    print(f'Email Verified: {user.email_verified}')
    print(f'Is Active: {user.is_active}')
    print(f'Created At: {user.created_at}')
    print()

    # Check role-specific profiles
    print('========== ROLE-SPECIFIC PROFILES ==========')

    # Student profile
    student = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if student:
        print(f'✅ STUDENT PROFILE (ID: {student.id})')
        print(f'   - Is Active: {student.is_active}')
        print(f'   - Username: {student.username}')
        print(f'   - Grade Level: {student.grade_level}')
        print(f'   - Enrolled At: {getattr(student, "enrolled_at", None)}')
    else:
        print('❌ No Student Profile')

    # Tutor profile
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
    if tutor:
        print(f'✅ TUTOR PROFILE (ID: {tutor.id})')
        print(f'   - Is Active: {tutor.is_active}')
        print(f'   - Username: {tutor.username}')
        print(f'   - Bio: {tutor.bio[:50] if tutor.bio else None}...')
        print(f'   - Hourly Rate: {tutor.hourly_rate}')
    else:
        print('❌ No Tutor Profile')

    # Parent profile
    parent = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
    if parent:
        print(f'✅ PARENT PROFILE (ID: {parent.id})')
        print(f'   - Is Active: {parent.is_active}')
        print(f'   - Children IDs: {parent.children_ids}')
        print(f'   - Total Children: {parent.total_children}')
    else:
        print('❌ No Parent Profile')

    # Advertiser profile
    advertiser = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user.id).first()
    if advertiser:
        print(f'✅ ADVERTISER PROFILE (ID: {advertiser.id})')
        print(f'   - Is Active: {advertiser.is_active}')
        print(f'   - Company Name: {advertiser.company_name}')
    else:
        print('❌ No Advertiser Profile')

    print()
    print('========== ROLE IDs MAP ==========')
    role_ids = {
        'student': student.id if student else None,
        'tutor': tutor.id if tutor else None,
        'parent': parent.id if parent else None,
        'advertiser': advertiser.id if advertiser else None
    }
    print(f'role_ids: {role_ids}')

else:
    print('❌ USER NOT FOUND')

db.close()
