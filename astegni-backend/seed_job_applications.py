"""
Seed sample job applications for user 115's job posts
"""
import psycopg2
from datetime import datetime, timedelta
import random

# Database connection
conn = psycopg2.connect(
    host="localhost",
    database="astegni_user_db",
    user="astegni_user",
    password="Astegni2025"
)

# Sample Ethiopian names for applicants
first_names = [
    "Abebe", "Kebede", "Tesfaye", "Girma", "Dawit", "Yohannes", "Solomon", "Henok",
    "Meron", "Tigist", "Bethlehem", "Sara", "Hanna", "Rahel", "Birtukan", "Selamawit",
    "Fasil", "Biniam", "Ermias", "Yared", "Eyob", "Teddy", "Getachew", "Dereje"
]

last_names = [
    "Bekele", "Tadesse", "Assefa", "Haile", "Gebre", "Tesfay", "Mengistu", "Kebede",
    "Girma", "Alemayehu", "Desta", "Woldemariam", "Negash", "Hailu", "Bogale", "Mekonnen"
]

# Sample cover letters
cover_letters = [
    "I am excited to apply for this position. With 5 years of teaching experience in Ethiopian schools, I believe I am well-suited for this role. I am passionate about education and have a proven track record of improving student outcomes.",
    "As a dedicated educator with a Master's degree in Education from Addis Ababa University, I am eager to contribute to your institution. My innovative teaching methods have consistently resulted in high student engagement and achievement.",
    "I am writing to express my strong interest in this position. My background in curriculum development and classroom management aligns perfectly with the requirements outlined in your job posting.",
    "With over 7 years of experience in the education sector, I have developed a comprehensive skill set that I believe would be valuable to your team. I am particularly drawn to your institution's commitment to quality education.",
    "I am a highly motivated professional seeking to advance my career in education. My experience includes developing engaging lesson plans, mentoring junior teachers, and implementing technology in the classroom."
]

# Application statuses with weights
statuses = [
    ("new", 40),
    ("reviewing", 25),
    ("shortlisted", 15),
    ("interviewed", 10),
    ("offered", 5),
    ("hired", 3),
    ("rejected", 2)
]

def get_weighted_status():
    """Get a random status based on weights"""
    total = sum(weight for _, weight in statuses)
    r = random.randint(1, total)
    cumulative = 0
    for status, weight in statuses:
        cumulative += weight
        if r <= cumulative:
            return status
    return "new"

def seed_applications():
    cursor = conn.cursor()

    # Get job posts for user 115
    cursor.execute("SELECT id, title FROM job_posts WHERE user_id = 115")
    jobs = cursor.fetchall()

    if not jobs:
        print("No jobs found for user 115")
        return

    print(f"Found {len(jobs)} jobs for user 115")

    # Get some existing users to use as applicants (excluding user 115)
    cursor.execute("SELECT id, email, CONCAT(first_name, ' ', father_name) as full_name FROM users WHERE id != 115 LIMIT 20")
    existing_users = cursor.fetchall()

    applications_created = 0

    for job_id, job_title in jobs:
        # Create 3-8 applications per job
        num_applications = random.randint(3, 8)

        for i in range(num_applications):
            # Generate applicant info
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            full_name = f"{first_name} {last_name}"
            email = f"{first_name.lower()}.{last_name.lower()}{random.randint(1, 999)}@gmail.com"
            phone = f"+2519{random.randint(10000000, 99999999)}"

            # Always use existing users
            if existing_users:
                user = random.choice(existing_users)
                applicant_user_id = user[0]
                email = user[1]
                if user[2]:
                    full_name = user[2]
            else:
                print("No existing users found, skipping")
                continue

            status = get_weighted_status()
            cover_letter = random.choice(cover_letters)

            # Random application date within last 30 days
            days_ago = random.randint(0, 30)
            applied_at = datetime.now() - timedelta(days=days_ago)

            # Expected salary (random between 8000-25000 ETB)
            expected_salary = random.randint(8000, 25000)

            # Rating for reviewed applications
            rating = random.randint(1, 5) if status not in ["new", "reviewing"] else None

            try:
                cursor.execute("""
                    INSERT INTO job_applications (
                        job_id, applicant_user_id, applicant_name, applicant_email,
                        applicant_phone, cover_letter, status, expected_salary,
                        rating, applied_at, source
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (job_id, applicant_user_id) DO NOTHING
                """, (
                    job_id, applicant_user_id, full_name, email,
                    phone, cover_letter, status, expected_salary,
                    rating, applied_at, "direct"
                ))

                if cursor.rowcount > 0:
                    applications_created += 1
                    print(f"  Created application: {full_name} for '{job_title}' (status: {status})")

            except Exception as e:
                print(f"  Error creating application: {e}")
                conn.rollback()
                continue

    # Update applications_count in job_posts
    cursor.execute("""
        UPDATE job_posts jp
        SET applications_count = (
            SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = jp.id
        )
        WHERE user_id = 115
    """)

    conn.commit()
    print(f"\nCreated {applications_created} applications for user 115's jobs")

    # Show summary
    cursor.execute("""
        SELECT jp.title, COUNT(ja.id) as app_count
        FROM job_posts jp
        LEFT JOIN job_applications ja ON jp.id = ja.job_id
        WHERE jp.user_id = 115
        GROUP BY jp.id, jp.title
        ORDER BY jp.id
    """)

    print("\nApplications per job:")
    for title, count in cursor.fetchall():
        print(f"  {title}: {count} applications")

    cursor.close()

if __name__ == "__main__":
    try:
        seed_applications()
    finally:
        conn.close()
