"""
Seed Credentials Data

Seeds sample credentials for testing the credentials panel:
- Academic certificates (degrees, diplomas)
- Achievements (awards, honors)
- Experience (work history, teaching experience)

Run: python seed_credentials_data.py
"""

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os
import sys
from datetime import date, datetime, timedelta
import random

# Fix Windows encoding issue
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')


def get_db_connection():
    """Get database connection with dict row factory"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def seed_credentials():
    """Seed sample credentials data"""

    print("=" * 60)
    print("SEEDING: Credentials Data")
    print("=" * 60)

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Step 1: Check if credentials table exists
        print("\n[1/4] Checking credentials table...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'credentials'
            )
        """)
        table_exists = cur.fetchone()['exists']

        if not table_exists:
            print("   [ERROR] 'credentials' table does not exist!")
            print("   Run migration first: python migrate_create_unified_documents.py")
            print("   Then run: python migrate_rename_documents_credentials.py")
            return

        print("   [OK] credentials table exists")

        # Step 2: Get tutor profile IDs
        print("\n[2/4] Getting tutor profile IDs...")
        cur.execute("SELECT id, user_id FROM tutor_profiles LIMIT 5")
        tutors = cur.fetchall()

        if not tutors:
            print("   [WARNING] No tutor profiles found. Creating sample credentials for tutor_id=1")
            tutors = [{'id': 1, 'user_id': 1}]
        else:
            print(f"   Found {len(tutors)} tutor profiles")

        # Step 3: Prepare sample credentials data
        print("\n[3/4] Preparing sample credentials...")

        # Sample credentials for different types
        academic_credentials = [
            {
                'title': 'Bachelor of Science in Computer Science',
                'description': 'Graduated with honors from Addis Ababa University with a focus on software engineering and algorithms.',
                'issued_by': 'Addis Ababa University',
                'date_of_issue': date(2018, 7, 15),
            },
            {
                'title': 'Master of Education (M.Ed)',
                'description': 'Specialized in curriculum development and educational technology.',
                'issued_by': 'Bahir Dar University',
                'date_of_issue': date(2021, 6, 20),
            },
            {
                'title': 'Teaching Certificate - Secondary Education',
                'description': 'Certified to teach grades 9-12 in Mathematics and Physics.',
                'issued_by': 'Ethiopian Ministry of Education',
                'date_of_issue': date(2019, 9, 1),
                'expiry_date': date(2024, 9, 1),
            },
            {
                'title': 'TEFL Certification',
                'description': 'Teaching English as a Foreign Language certification - 120 hours.',
                'issued_by': 'International TEFL Academy',
                'date_of_issue': date(2020, 3, 15),
            },
        ]

        achievement_credentials = [
            {
                'title': 'Best Teacher Award 2023',
                'description': 'Recognized for outstanding dedication to student success and innovative teaching methods.',
                'issued_by': 'Astegni Education Platform',
                'date_of_issue': date(2023, 12, 1),
            },
            {
                'title': 'Top Rated Tutor - Mathematics',
                'description': 'Achieved 4.9+ rating with over 500 completed sessions in Mathematics.',
                'issued_by': 'Astegni Education Platform',
                'date_of_issue': date(2024, 1, 15),
            },
            {
                'title': 'Academic Excellence Award',
                'description': 'First place in the National Mathematics Olympiad.',
                'issued_by': 'Ethiopian Mathematics Society',
                'date_of_issue': date(2017, 5, 20),
            },
            {
                'title': 'Community Service Recognition',
                'description': 'Volunteered 200+ hours teaching underprivileged students.',
                'issued_by': 'Hope for Ethiopia Foundation',
                'date_of_issue': date(2022, 8, 10),
            },
        ]

        experience_credentials = [
            {
                'title': 'Senior Mathematics Teacher',
                'description': 'Taught advanced mathematics to grades 11-12 students. Developed curriculum materials and mentored junior teachers.',
                'issued_by': 'Sandford International School',
                'date_of_issue': date(2019, 9, 1),
            },
            {
                'title': 'Private Tutor - 5+ Years Experience',
                'description': 'Provided one-on-one tutoring to over 200 students in Mathematics, Physics, and Chemistry.',
                'issued_by': 'Self-Employed',
                'date_of_issue': date(2018, 1, 1),
            },
            {
                'title': 'Online Course Instructor',
                'description': 'Created and taught online courses on Calculus and Linear Algebra with 10,000+ enrolled students.',
                'issued_by': 'Udemy',
                'date_of_issue': date(2021, 4, 1),
            },
            {
                'title': 'Educational Content Developer',
                'description': 'Developed educational materials and assessment tools for Ethiopian National Curriculum.',
                'issued_by': 'Ethiopian Curriculum Development Institute',
                'date_of_issue': date(2020, 6, 15),
            },
        ]

        # Step 4: Insert credentials
        print("\n[4/4] Inserting credentials...")

        inserted_count = 0
        verification_statuses = ['pending', 'verified', 'verified', 'verified']  # More verified than pending

        for tutor in tutors:
            tutor_id = tutor['id']

            # Insert academic credentials
            for cred in random.sample(academic_credentials, min(2, len(academic_credentials))):
                cur.execute("""
                    INSERT INTO credentials (
                        uploader_id, uploader_role, document_type, title, description,
                        issued_by, date_of_issue, expiry_date, verification_status,
                        is_verified, is_featured, created_at, updated_at
                    ) VALUES (
                        %s, 'tutor', 'academic', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    tutor_id,
                    cred['title'],
                    cred['description'],
                    cred['issued_by'],
                    cred['date_of_issue'],
                    cred.get('expiry_date'),
                    random.choice(verification_statuses),
                    random.choice([True, True, False]),  # More verified
                    random.choice([False, False, True]),  # Some featured
                    datetime.now(),
                    datetime.now()
                ))
                inserted_count += 1

            # Insert achievement credentials
            for cred in random.sample(achievement_credentials, min(2, len(achievement_credentials))):
                cur.execute("""
                    INSERT INTO credentials (
                        uploader_id, uploader_role, document_type, title, description,
                        issued_by, date_of_issue, verification_status, is_verified,
                        is_featured, created_at, updated_at
                    ) VALUES (
                        %s, 'tutor', 'achievement', %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    tutor_id,
                    cred['title'],
                    cred['description'],
                    cred['issued_by'],
                    cred['date_of_issue'],
                    random.choice(verification_statuses),
                    random.choice([True, True, False]),
                    random.choice([False, False, True]),
                    datetime.now(),
                    datetime.now()
                ))
                inserted_count += 1

            # Insert experience credentials
            for cred in random.sample(experience_credentials, min(2, len(experience_credentials))):
                cur.execute("""
                    INSERT INTO credentials (
                        uploader_id, uploader_role, document_type, title, description,
                        issued_by, date_of_issue, verification_status, is_verified,
                        is_featured, created_at, updated_at
                    ) VALUES (
                        %s, 'tutor', 'experience', %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    tutor_id,
                    cred['title'],
                    cred['description'],
                    cred['issued_by'],
                    cred['date_of_issue'],
                    random.choice(verification_statuses),
                    random.choice([True, True, False]),
                    random.choice([False, False, True]),
                    datetime.now(),
                    datetime.now()
                ))
                inserted_count += 1

        conn.commit()
        print(f"   [OK] Inserted {inserted_count} credentials")

        # Summary
        print("\n" + "=" * 60)
        print("SEEDING COMPLETED!")
        print("=" * 60)

        # Show counts
        cur.execute("""
            SELECT document_type, COUNT(*) as count
            FROM credentials
            WHERE uploader_role = 'tutor'
            GROUP BY document_type
        """)
        counts = cur.fetchall()

        print("\nCredentials by type:")
        for c in counts:
            print(f"  - {c['document_type']}: {c['count']}")

        cur.execute("SELECT COUNT(*) as total FROM credentials WHERE uploader_role = 'tutor'")
        total = cur.fetchone()['total']
        print(f"\nTotal tutor credentials: {total}")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Seeding failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    seed_credentials()
