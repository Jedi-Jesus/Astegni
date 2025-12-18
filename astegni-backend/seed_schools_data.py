"""
Seed Schools Data for Testing
Creates sample schools in the schools table with different statuses:
- pending: Schools awaiting approval
- verified: Approved schools
- rejected: Schools that were rejected
- suspended: Schools that are suspended
"""

import os
import psycopg
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import json
import random

load_dotenv()

# Use USER database (astegni_user_db) for schools
DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

# Ethiopian school data
SCHOOL_TYPES = ['Private', 'Government', 'International', 'Religious']

ETHIOPIAN_CITIES = [
    'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Bahir Dar',
    'Hawassa', 'Adama', 'Jimma', 'Dessie', 'Harar'
]

# Schools data with different statuses
SCHOOLS_DATA = [
    # PENDING schools (awaiting approval)
    {
        'name': 'Bethel Academy',
        'type': 'Private',
        'level': ['Elementary', 'Middle School'],
        'location': {'city': 'Addis Ababa', 'subcity': 'Bole', 'address': 'Bole Road'},
        'email': ['info@bethelacademy.edu.et'],
        'phone': ['+251-11-661-1234'],
        'student_count': 450,
        'established_year': 2015,
        'principal': 'Ato Dawit Mengistu',
        'informant_fullname': 'Tigist Haile',
        'informant_phone': '+251-91-234-5678',
        'informant_occupation': 'School Administrator',
        'status': 'pending'
    },
    {
        'name': 'Friendship International School',
        'type': 'International',
        'level': ['High School'],
        'location': {'city': 'Addis Ababa', 'subcity': 'Kirkos', 'address': 'Africa Avenue'},
        'email': ['contact@friendship-intl.edu.et'],
        'phone': ['+251-11-551-9876'],
        'student_count': 620,
        'established_year': 2008,
        'principal': 'Dr. Michael Thompson',
        'informant_fullname': 'Selam Bekele',
        'informant_phone': '+251-92-345-6789',
        'informant_occupation': 'Registrar',
        'status': 'pending'
    },
    {
        'name': 'St. Gabriel Catholic School',
        'type': 'Religious',
        'level': ['Elementary'],
        'location': {'city': 'Gondar', 'subcity': 'Central', 'address': 'Near Fasilides Castle'},
        'email': ['stgabriel@catholicschools.et'],
        'phone': ['+251-58-111-2233'],
        'student_count': 380,
        'established_year': 1965,
        'principal': 'Sister Mary Emmanuel',
        'informant_fullname': 'Abebe Tadesse',
        'informant_phone': '+251-91-876-5432',
        'informant_occupation': 'Parish Representative',
        'status': 'pending'
    },
    {
        'name': 'Mekelle Preparatory Academy',
        'type': 'Private',
        'level': ['High School', 'Preparatory'],
        'location': {'city': 'Mekelle', 'subcity': 'Hawelti', 'address': 'Main Road'},
        'email': ['admin@mekelleprep.edu.et'],
        'phone': ['+251-34-440-5566'],
        'student_count': 890,
        'established_year': 2010,
        'principal': 'Ato Gebremedhin Hailu',
        'informant_fullname': 'Hiwot Berhe',
        'informant_phone': '+251-94-567-8901',
        'informant_occupation': 'Deputy Director',
        'status': 'pending'
    },

    # VERIFIED schools (approved)
    {
        'name': 'Sandford International School',
        'type': 'International',
        'level': ['Elementary', 'Middle School', 'High School'],
        'location': {'city': 'Addis Ababa', 'subcity': 'Old Airport', 'address': 'Sandford Campus'},
        'email': ['info@sandford.edu.et', 'admissions@sandford.edu.et'],
        'phone': ['+251-11-123-4567', '+251-11-123-4568'],
        'student_count': 1500,
        'rating': 4.8,
        'established_year': 1948,
        'principal': 'Dr. Sarah Mitchell',
        'informant_fullname': 'Rebecca Johnson',
        'informant_phone': '+251-91-111-2222',
        'informant_occupation': 'Head of Admissions',
        'status': 'verified',
        'status_reason': 'All documentation verified. Excellent facilities and qualified staff.'
    },
    {
        'name': 'Lycée Guebre-Mariam',
        'type': 'International',
        'level': ['Elementary', 'Middle School', 'High School'],
        'location': {'city': 'Addis Ababa', 'subcity': 'Kazanchis', 'address': 'Lycée Road'},
        'email': ['contact@lgm.edu.et'],
        'phone': ['+251-11-515-6789'],
        'student_count': 1200,
        'rating': 4.7,
        'established_year': 1947,
        'principal': 'Jean-Pierre Dubois',
        'informant_fullname': 'Marie Claire',
        'informant_phone': '+251-91-333-4444',
        'informant_occupation': 'School Secretary',
        'status': 'verified',
        'status_reason': 'French curriculum accredited. Long-standing institution.'
    },
    {
        'name': 'Unity University',
        'type': 'Private',
        'level': ['University'],
        'location': {'city': 'Addis Ababa', 'subcity': 'Gerji', 'address': 'Unity Campus'},
        'email': ['info@unity.edu.et', 'registrar@unity.edu.et'],
        'phone': ['+251-11-646-0000'],
        'student_count': 8500,
        'rating': 4.2,
        'established_year': 1998,
        'principal': 'Prof. Getachew Haile',
        'informant_fullname': 'Dr. Meseret Alemu',
        'informant_phone': '+251-91-555-6666',
        'informant_occupation': 'Academic Dean',
        'status': 'verified',
        'status_reason': 'Accredited by Ministry of Education. Multiple campuses.'
    },
    {
        'name': 'Bole Community Academy',
        'type': 'Private',
        'level': ['High School', 'Preparatory'],
        'location': {'city': 'Addis Ababa', 'subcity': 'Bole', 'address': 'Bole Medhanialem'},
        'email': ['admin@bolecommunity.edu.et'],
        'phone': ['+251-11-662-7890'],
        'student_count': 950,
        'rating': 4.4,
        'established_year': 2005,
        'principal': 'Ato Bekele Tadesse',
        'informant_fullname': 'Kidist Worku',
        'informant_phone': '+251-92-777-8888',
        'informant_occupation': 'Administrative Officer',
        'status': 'verified',
        'status_reason': 'Strong academic record. Good student outcomes.'
    },
    {
        'name': 'Dire Dawa Comprehensive School',
        'type': 'Government',
        'level': ['High School'],
        'location': {'city': 'Dire Dawa', 'subcity': 'Kezira', 'address': 'Government Road'},
        'email': ['ddcomprehensive@gov.edu.et'],
        'phone': ['+251-25-111-3344'],
        'student_count': 2200,
        'rating': 4.0,
        'established_year': 1965,
        'principal': 'Ato Mohammed Ali',
        'informant_fullname': 'Fatima Hassan',
        'informant_phone': '+251-25-999-0000',
        'informant_occupation': 'Vice Principal',
        'status': 'verified',
        'status_reason': 'Government school with excellent track record.'
    },
    {
        'name': 'Hawassa Kidane Mehret School',
        'type': 'Religious',
        'level': ['Elementary', 'Middle School'],
        'location': {'city': 'Hawassa', 'subcity': 'Tabor', 'address': 'Lake View Area'},
        'email': ['kidanemehret@orthodox.edu.et'],
        'phone': ['+251-46-220-5566'],
        'student_count': 650,
        'rating': 4.6,
        'established_year': 1978,
        'principal': 'Abba Daniel Mekonnen',
        'informant_fullname': 'Tesfaye Girma',
        'informant_phone': '+251-46-111-2222',
        'informant_occupation': 'Church Administrator',
        'status': 'verified',
        'status_reason': 'Orthodox church school. Well-maintained facilities.'
    },

    # REJECTED schools
    {
        'name': 'Quick Learn Academy',
        'type': 'Private',
        'level': ['Elementary'],
        'location': {'city': 'Addis Ababa', 'subcity': 'Yeka', 'address': 'Megenagna'},
        'email': ['info@quicklearn.edu.et'],
        'phone': ['+251-11-667-8899'],
        'student_count': 150,
        'established_year': 2020,
        'principal': 'Ato Yonas Kebede',
        'informant_fullname': 'Sara Tesfaye',
        'informant_phone': '+251-91-444-5555',
        'informant_occupation': 'Owner',
        'status': 'rejected',
        'status_reason': 'Incomplete documentation - missing accreditation certificates and facility inspection reports. Building does not meet safety standards.'
    },
    {
        'name': 'Global Excellence Institute',
        'type': 'Private',
        'level': ['College'],
        'location': {'city': 'Adama', 'subcity': 'Central', 'address': 'Main Street'},
        'email': ['contact@globalexcellence.edu.et'],
        'phone': ['+251-22-111-4455'],
        'student_count': 400,
        'established_year': 2018,
        'principal': 'Dr. Solomon Abera',
        'informant_fullname': 'Bethlehem Assefa',
        'informant_phone': '+251-22-666-7777',
        'informant_occupation': 'HR Manager',
        'status': 'rejected',
        'status_reason': 'Failed to meet minimum infrastructure requirements - inadequate classroom space and laboratory facilities. Staff qualifications not verified.'
    },
    {
        'name': 'New Dawn School',
        'type': 'Private',
        'level': ['High School'],
        'location': {'city': 'Mekelle', 'subcity': 'Ayder', 'address': 'University Road'},
        'email': ['newdawn@schools.et'],
        'phone': ['+251-34-441-2233'],
        'student_count': 280,
        'established_year': 2019,
        'principal': 'W/ro Almaz Berhe',
        'informant_fullname': 'Hagos Tekle',
        'informant_phone': '+251-34-888-9999',
        'informant_occupation': 'Finance Officer',
        'status': 'rejected',
        'status_reason': 'Unqualified teaching staff - 60% of teachers lack required certifications. Curriculum not aligned with national standards.'
    },

    # SUSPENDED schools
    {
        'name': 'Victory Preparatory School',
        'type': 'Private',
        'level': ['High School', 'Preparatory'],
        'location': {'city': 'Addis Ababa', 'subcity': 'Nifas Silk', 'address': 'Lafto Area'},
        'email': ['victory@prepschools.et'],
        'phone': ['+251-11-471-2345'],
        'student_count': 720,
        'rating': 3.2,
        'established_year': 2010,
        'principal': 'Ato Yohannes Girma',
        'informant_fullname': 'Meron Tadesse',
        'informant_phone': '+251-91-222-3333',
        'informant_occupation': 'Accountant',
        'status': 'suspended',
        'status_reason': 'Financial irregularities detected during audit - pending investigation. Student fee mismanagement reported.'
    },
    {
        'name': 'Bright Future Academy',
        'type': 'Private',
        'level': ['Elementary'],
        'location': {'city': 'Bahir Dar', 'subcity': 'Belay Zeleke', 'address': 'Lake Tana Road'},
        'email': ['brightfuture@academy.et'],
        'phone': ['+251-58-220-6677'],
        'student_count': 380,
        'rating': 3.5,
        'established_year': 2015,
        'principal': 'W/ro Tigist Alemayehu',
        'informant_fullname': 'Getnet Ayele',
        'informant_phone': '+251-58-333-4444',
        'informant_occupation': 'Board Member',
        'status': 'suspended',
        'status_reason': 'Safety violations - building failed structural safety inspection. Operations suspended until repairs completed.'
    },
]


def seed_schools():
    """Seed schools table with sample data"""
    print("Connecting to user database (astegni_user_db)...")
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Clear existing data
        print("\nClearing existing school data...")
        cursor.execute("DELETE FROM schools")

        # Also drop old tables if they exist
        print("Dropping old tables if they exist...")
        cursor.execute("DROP TABLE IF EXISTS requested_schools CASCADE")
        cursor.execute("DROP TABLE IF EXISTS rejected_schools CASCADE")
        cursor.execute("DROP TABLE IF EXISTS suspended_schools CASCADE")

        now = datetime.now(timezone.utc)

        # Seed schools
        print("\nSeeding schools...")

        pending_count = 0
        verified_count = 0
        rejected_count = 0
        suspended_count = 0

        for i, school in enumerate(SCHOOLS_DATA):
            status = school['status']

            # Set status_at based on status
            if status == 'pending':
                status_at = now - timedelta(days=random.randint(1, 14))
                pending_count += 1
            elif status == 'verified':
                status_at = now - timedelta(days=random.randint(30, 365))
                verified_count += 1
            elif status == 'rejected':
                status_at = now - timedelta(days=random.randint(7, 30))
                rejected_count += 1
            else:  # suspended
                status_at = now - timedelta(days=random.randint(7, 60))
                suspended_count += 1

            cursor.execute("""
                INSERT INTO schools
                (requester_id, name, type, level, location, email, phone, document_url,
                 rating, student_count, established_year, principal,
                 informant_fullname, informant_phone, informant_occupation,
                 status, status_by, status_at, status_reason, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                random.randint(1, 10),  # requester_id
                school['name'],
                school['type'],
                json.dumps(school['level']),
                json.dumps(school['location']),
                json.dumps(school['email']),
                json.dumps(school['phone']),
                f"/documents/schools/{school['name'].lower().replace(' ', '_')}/registration.pdf",
                school.get('rating', 0.0),
                school['student_count'],
                school['established_year'],
                school['principal'],
                school['informant_fullname'],
                school['informant_phone'],
                school['informant_occupation'],
                school['status'],
                1 if status != 'pending' else None,  # status_by (admin who changed status)
                status_at,
                school.get('status_reason', None),
                now - timedelta(days=random.randint(30, 400)),  # created_at
                now  # updated_at
            ))
            print(f"  + Added: {school['name']} ({status})")

        conn.commit()

        # Print summary
        print("\n" + "=" * 50)
        print("SCHOOLS SEEDING COMPLETE!")
        print("=" * 50)
        print(f"\nTotal schools seeded: {len(SCHOOLS_DATA)}")
        print(f"  - Pending: {pending_count}")
        print(f"  - Verified: {verified_count}")
        print(f"  - Rejected: {rejected_count}")
        print(f"  - Suspended: {suspended_count}")

    except Exception as e:
        print(f"\nError seeding schools: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    seed_schools()
