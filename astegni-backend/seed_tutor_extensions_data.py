"""
Seed script to populate tutor extensions (certifications, achievements, experience)
"""

import psycopg
import os
from datetime import datetime, date, timedelta
import random
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Ethiopian sample data
CERTIFICATES = [
    {
        "name": "Bachelor of Science in Mathematics",
        "organization": "Addis Ababa University",
        "type": "degree",
        "field": "Mathematics"
    },
    {
        "name": "Teaching Excellence Certificate",
        "organization": "Ministry of Education Ethiopia",
        "type": "certification",
        "field": "Education"
    },
    {
        "name": "Advanced Physics Teaching Certification",
        "organization": "Hawassa University",
        "type": "certification",
        "field": "Physics"
    },
    {
        "name": "English Language Teaching Certificate (TEFL)",
        "organization": "British Council Ethiopia",
        "type": "certification",
        "field": "English"
    },
    {
        "name": "Master of Education",
        "organization": "Bahir Dar University",
        "type": "degree",
        "field": "Education"
    }
]

ACHIEVEMENTS = [
    {
        "title": "Teacher of the Year 2023",
        "category": "award",
        "icon": "🏆",
        "color": "gold",
        "issuer": "Ethiopian Education Association"
    },
    {
        "title": "100+ Students Mentored",
        "category": "milestone",
        "icon": "🎓",
        "color": "blue",
        "issuer": "Astegni Platform"
    },
    {
        "title": "Outstanding Educator Award",
        "category": "honor",
        "icon": "⭐",
        "color": "purple",
        "issuer": "Ministry of Education"
    },
    {
        "title": "Perfect Attendance Record",
        "category": "milestone",
        "icon": "✅",
        "color": "green",
        "issuer": "Astegni Platform"
    },
    {
        "title": "Top Rated Tutor",
        "category": "award",
        "icon": "🌟",
        "color": "yellow",
        "issuer": "Astegni Platform"
    }
]

EXPERIENCES = [
    {
        "job_title": "Mathematics Teacher",
        "institution": "Menelik II School",
        "location": "Addis Ababa, Ethiopia",
        "employment_type": "full-time"
    },
    {
        "job_title": "Physics Lecturer",
        "institution": "Addis Ababa University",
        "location": "Addis Ababa, Ethiopia",
        "employment_type": "part-time"
    },
    {
        "job_title": "Private Tutor",
        "institution": "Self-Employed",
        "location": "Addis Ababa, Ethiopia",
        "employment_type": "contract"
    },
    {
        "job_title": "Head of Science Department",
        "institution": "International Community School",
        "location": "Addis Ababa, Ethiopia",
        "employment_type": "full-time"
    }
]

def seed_extensions_data():
    """Seed certifications, achievements, and experience for tutor profiles"""

    conn = psycopg.connect(DATABASE_URL)

    try:
        with conn.cursor() as cur:
            print("Seeding tutor profile extensions data...")

            # Get all tutor profiles
            cur.execute("SELECT id FROM tutor_profiles LIMIT 20")
            tutors = cur.fetchall()

            if not tutors:
                print("No tutor profiles found. Please run seed_tutor_data.py first.")
                return

            print(f"\nFound {len(tutors)} tutor profiles")

            for idx, (tutor_id,) in enumerate(tutors, 1):
                print(f"\n[{idx}/{len(tutors)}] Seeding data for tutor ID {tutor_id}...")

                # Add 2-3 certifications
                num_certs = random.randint(2, 3)
                selected_certs = random.sample(CERTIFICATES, num_certs)

                for cert in selected_certs:
                    issue_date = date.today() - timedelta(days=random.randint(365, 3650))

                    cur.execute("""
                        INSERT INTO tutor_certificates (
                            tutor_id, name, description, issuing_organization,
                            credential_id, issue_date, certificate_type, field_of_study,
                            is_verified, is_active
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                    """, (
                        tutor_id,
                        cert["name"],
                        f"Certified in {cert['field']} education and teaching methodologies.",
                        cert["organization"],
                        f"CERT-{random.randint(10000, 99999)}",
                        issue_date,
                        cert["type"],
                        cert["field"],
                        random.choice([True, False]),
                        True
                    ))

                print(f"  OK Added {num_certs} certifications")

                # Add 2-4 achievements
                num_achievements = random.randint(2, 4)
                selected_achievements = random.sample(ACHIEVEMENTS, num_achievements)

                for achievement in selected_achievements:
                    year = random.randint(2020, 2024)

                    cur.execute("""
                        INSERT INTO tutor_achievements (
                            tutor_id, title, description, category, icon, color,
                            year, issuer, is_featured
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                    """, (
                        tutor_id,
                        achievement["title"],
                        f"Recognized for excellence in {achievement['category']}.",
                        achievement["category"],
                        achievement["icon"],
                        achievement["color"],
                        year,
                        achievement["issuer"],
                        random.choice([True, False])
                    ))

                print(f"  OK Added {num_achievements} achievements")

                # Add 1-3 experience entries
                num_experiences = random.randint(1, 3)
                selected_experiences = random.sample(EXPERIENCES, num_experiences)

                for exp in selected_experiences:
                    # Random start date in the past
                    years_ago = random.randint(1, 10)
                    start_date = date.today() - timedelta(days=years_ago * 365)

                    # Some positions are current (no end date)
                    is_current = random.choice([True, False, False])
                    end_date = None if is_current else start_date + timedelta(days=random.randint(365, 1825))

                    cur.execute("""
                        INSERT INTO tutor_experience (
                            tutor_id, job_title, institution, location,
                            start_date, end_date, is_current, description,
                            responsibilities, employment_type
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                    """, (
                        tutor_id,
                        exp["job_title"],
                        exp["institution"],
                        exp["location"],
                        start_date,
                        end_date,
                        is_current,
                        f"Responsible for teaching and mentoring students in various subjects.",
                        "* Developed engaging lesson plans\n* Conducted assessments and evaluations\n* Mentored struggling students\n* Collaborated with colleagues",
                        exp["employment_type"]
                    ))

                print(f"  OK Added {num_experiences} experience entries")

            conn.commit()
            print(f"\nSUCCESS! Seeded extensions data for {len(tutors)} tutors!")
            print("\nData includes:")
            print("  - Certifications (degrees, certificates, licenses)")
            print("  - Achievements (awards, milestones, honors)")
            print("  - Work Experience (teaching positions, institutions)")

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    seed_extensions_data()
