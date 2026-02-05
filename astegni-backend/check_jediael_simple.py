"""
Check jediael.s.abebe@gmail.com account details - Simplified
"""
import sys
import os
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from models import SessionLocal, User, StudentProfile, TutorProfile, ParentProfile, AdvertiserProfile

db = SessionLocal()

# Find user by email
user = db.query(User).filter(User.email == 'jediael.s.abebe@gmail.com').first()

if user:
    print('=' * 60)
    print('USER ACCOUNT DETAILS')
    print('=' * 60)
    print(f'ID: {user.id}')
    print(f'Email: {user.email}')
    print(f'Name: {user.first_name} {user.father_name} {user.grandfather_name}')
    print(f'Phone: {user.phone}')
    print(f'Roles Array: {user.roles}')
    print(f'Active Role: {user.active_role}')
    print(f'Email Verified: {user.email_verified}')
    print(f'Is Active: {user.is_active}')
    print(f'Created At: {user.created_at}')
    print()

    print('=' * 60)
    print('ROLE-SPECIFIC PROFILES')
    print('=' * 60)

    # Student profile
    student = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if student:
        print(f'✅ STUDENT PROFILE EXISTS (ID: {student.id}, is_active: {student.is_active})')
    else:
        print('❌ No Student Profile')

    # Tutor profile
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
    if tutor:
        print(f'✅ TUTOR PROFILE EXISTS (ID: {tutor.id}, is_active: {tutor.is_active})')
    else:
        print('❌ No Tutor Profile')

    # Parent profile
    parent = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
    if parent:
        print(f'✅ PARENT PROFILE EXISTS (ID: {parent.id}, is_active: {parent.is_active})')
    else:
        print('❌ No Parent Profile')

    # Advertiser profile
    advertiser = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user.id).first()
    if advertiser:
        print(f'✅ ADVERTISER PROFILE EXISTS (ID: {advertiser.id}, is_active: {advertiser.is_active})')
    else:
        print('❌ No Advertiser Profile')

    print()
    print('=' * 60)
    print('ROLE_IDS MAPPING (for JWT token)')
    print('=' * 60)
    role_ids = {
        'student': student.id if student else None,
        'tutor': tutor.id if tutor else None,
        'parent': parent.id if parent else None,
        'advertiser': advertiser.id if advertiser else None
    }
    for role, role_id in role_ids.items():
        status = f'ID: {role_id}' if role_id else 'Not found'
        print(f'{role.ljust(15)}: {status}')

else:
    print('❌ USER NOT FOUND')

db.close()

print()
print('=' * 60)
print('SUMMARY')
print('=' * 60)
print(f'User has {len(user.roles)} roles: {", ".join(user.roles)}')
print(f'Currently active as: {user.active_role}')
print(f'Can switch to: {", ".join([r for r in user.roles if r != user.active_role])}')
