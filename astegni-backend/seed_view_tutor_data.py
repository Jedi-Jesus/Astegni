"""
Seed data for view-tutor.html extended tables
Creates realistic Ethiopian tutor data for achievements, certificates, experience, videos
"""

import psycopg
import os
import json
from datetime import date, datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def seed_view_tutor_data():
    """Seed achievements, certificates, experience, and videos for existing tutors"""

    conn = psycopg.connect(DATABASE_URL)

    try:
        with conn.cursor() as cur:
            print("Seeding view-tutor extended data...")

            # Get first 10 tutors to seed data for
            cur.execute("SELECT id FROM tutor_profiles ORDER BY id LIMIT 10")
            tutor_ids = [row[0] for row in cur.fetchall()]

            if not tutor_ids:
                print("No tutors found. Please seed tutor data first.")
                return

            print(f"\nFound {len(tutor_ids)} tutors to seed data for")

            # ============================================
            # 1. SEED ACHIEVEMENTS
            # ============================================
            print("\n1. Seeding tutor_achievements...")

            achievements_data = [
                # Tutor 1 - Excellence in teaching
                (tutor_ids[0], "Best Tutor Award 2023", "Awarded for excellence in Mathematics education", "award", "🏆", "gold", 2023, date(2023, 12, 15), "Astegni Platform", None, True, 1),
                (tutor_ids[0], "2,500+ Students Taught", "Successfully taught over 2,500 students", "milestone", "👥", "blue", 2024, date(2024, 1, 10), "Astegni Platform", None, True, 2),
                (tutor_ids[0], "5,000+ Sessions Completed", "Completed over 5,000 teaching sessions", "milestone", "📚", "green", 2024, date(2024, 3, 1), "Astegni Platform", None, True, 3),
                (tutor_ids[0], "95% Success Rate", "Achieved 95% student success rate", "milestone", "✨", "purple", 2023, date(2023, 11, 20), "Astegni Platform", None, False, 4),
                (tutor_ids[0], "Teaching Excellence Award", "Recognition for innovative teaching methods", "honor", "🎓", "indigo", 2022, date(2022, 9, 10), "Ethiopian Education Association", None, False, 5),
                (tutor_ids[0], "Innovation in Teaching", "Developed new STEM teaching methodology", "honor", "💡", "orange", 2023, date(2023, 6, 5), "Addis Ababa University", None, False, 6),

                # Tutor 2 - Physics specialist
                (tutor_ids[1], "Physics Olympiad Coach", "Trained 15 students for National Olympiad", "honor", "🥇", "gold", 2023, date(2023, 8, 12), "Ethiopian Physics Society", None, True, 1),
                (tutor_ids[1], "1,500+ Students Taught", "Taught over 1,500 physics students", "milestone", "👥", "blue", 2023, date(2023, 10, 5), "Astegni Platform", None, True, 2),
                (tutor_ids[1], "Research Publication", "Published paper on physics education", "honor", "📄", "purple", 2022, date(2022, 11, 20), "Journal of Education", None, False, 3),

                # Tutor 3 - Chemistry expert
                (tutor_ids[2], "Best Chemistry Tutor 2024", "Top-rated chemistry educator", "award", "🏆", "gold", 2024, date(2024, 1, 15), "Astegni Platform", None, True, 1),
                (tutor_ids[2], "1,000+ Students Taught", "Reached 1,000 students milestone", "milestone", "👥", "blue", 2023, date(2023, 12, 1), "Astegni Platform", None, True, 2),
                (tutor_ids[2], "Laboratory Safety Certification", "Certified in lab safety procedures", "certification", "⚗️", "green", 2021, date(2021, 5, 10), "Ethiopian Science Academy", None, False, 3),
            ]

            # Add more achievements for remaining tutors
            for i, tutor_id in enumerate(tutor_ids[3:7], start=4):
                achievements_data.extend([
                    (tutor_id, f"Teaching Excellence {2024-i}", "Recognized for outstanding teaching", "award", "🏆", "gold", 2024-i, date(2024-i, 6, 15), "Astegni Platform", None, True, 1),
                    (tutor_id, f"{500 * i}+ Students Taught", f"Successfully taught {500 * i} students", "milestone", "👥", "blue", 2023, date(2023, 8, 10), "Astegni Platform", None, False, 2),
                ])

            cur.executemany("""
                INSERT INTO tutor_achievements
                (tutor_id, title, description, category, icon, color, year, date_achieved, issuer, verification_url, is_featured, display_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (tutor_id, title, year) DO NOTHING
            """, achievements_data)

            print(f"  - Inserted {len(achievements_data)} achievements")

            # ============================================
            # 2. SEED CERTIFICATES
            # ============================================
            print("\n2. Seeding tutor_certificates...")

            certificates_data = [
                # Tutor 1 - Math specialist
                (tutor_ids[0], "PhD in Mathematics", "Doctorate in Pure Mathematics", "Addis Ababa University", "PhD-MATH-2024-001", None, date(2020, 9, 1), date(2024, 6, 30), "degree", "Mathematics", None, True, True),
                (tutor_ids[0], "Teaching Excellence Certificate", "Advanced Teaching Methods", "Ethiopian Education Ministry", "TEC-2023-456", None, date(2023, 1, 15), None, "certification", "Education", None, True, True),
                (tutor_ids[0], "MSc in Physics", "Master of Science in Physics", "Addis Ababa University", "MSC-PHY-2020-789", None, date(2018, 9, 1), date(2020, 6, 30), "degree", "Physics", None, True, True),

                # Tutor 2 - Physics specialist
                (tutor_ids[1], "PhD in Physics", "Doctorate in Theoretical Physics", "Hawassa University", "PhD-PHY-2022-002", None, date(2018, 9, 1), date(2022, 7, 15), "degree", "Physics", None, True, True),
                (tutor_ids[1], "Online Teaching Certification", "Certified Online Educator", "International Teaching Institute", "OTC-2021-123", None, date(2021, 3, 10), None, "certification", "Education Technology", None, True, True),

                # Tutor 3 - Chemistry expert
                (tutor_ids[2], "MSc in Chemistry", "Master of Science in Organic Chemistry", "Bahir Dar University", "MSC-CHEM-2019-333", None, date(2017, 9, 1), date(2019, 6, 30), "degree", "Chemistry", None, True, True),
                (tutor_ids[2], "Laboratory Safety Certificate", "Advanced Lab Safety Training", "Ethiopian Science Academy", "LSC-2020-444", None, date(2020, 2, 5), date(2025, 2, 5), "license", "Chemistry Safety", None, True, True),
            ]

            # Add basic certificates for remaining tutors
            for i, tutor_id in enumerate(tutor_ids[3:7], start=4):
                field = ["Mathematics", "Biology", "English", "History"][i % 4]
                certificates_data.append(
                    (tutor_id, f"MSc in {field}", f"Master of Science in {field}", "Ethiopian University", f"MSC-{i}-555", None, date(2015+i, 9, 1), date(2017+i, 6, 30), "degree", field, None, True, True)
                )

            cur.executemany("""
                INSERT INTO tutor_certificates
                (tutor_id, name, description, issuing_organization, credential_id, credential_url,
                 issue_date, expiry_date, certificate_type, field_of_study,
                 certificate_image_url, is_verified, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (tutor_id, name, issuing_organization, issue_date) DO NOTHING
            """, certificates_data)

            print(f"  - Inserted {len(certificates_data)} certificates")

            # ============================================
            # 3. SEED EXPERIENCE
            # ============================================
            print("\n3. Seeding tutor_experience...")

            experiences_data = [
                # Tutor 1 - Math specialist
                (tutor_ids[0], "Senior Mathematics Teacher", "Addis Ababa International School", "Addis Ababa, Ethiopia",
                 date(2020, 9, 1), None, True, 4, 3, "Teaching advanced mathematics to grades 11-12",
                 "Curriculum development, Student assessment, Parent communication", "Improved pass rate by 35%, Developed innovative teaching materials", "full-time", 1),

                (tutor_ids[0], "Private Tutor", "Independent Practice", "Addis Ababa, Ethiopia",
                 date(2018, 1, 1), date(2020, 8, 31), False, 2, 8, "Providing personalized math tutoring",
                 "One-on-one sessions, Homework help, Exam preparation", "Helped 150+ students improve grades, 90% university admission rate", "part-time", 2),

                (tutor_ids[0], "Graduate Teaching Assistant", "Addis Ababa University", "Addis Ababa, Ethiopia",
                 date(2016, 9, 1), date(2018, 6, 30), False, 2, 0, "Assisted professors with undergraduate courses",
                 "Grading assignments, Leading tutorial sessions, Lab supervision", "Received outstanding TA award", "part-time", 3),

                # Tutor 2 - Physics specialist
                (tutor_ids[1], "Head of Physics Department", "Bole High School", "Addis Ababa, Ethiopia",
                 date(2021, 1, 1), None, True, 3, 9, "Leading physics department and teaching",
                 "Department management, Curriculum planning, Teacher mentoring", "Established physics lab, Increased enrollment by 40%", "full-time", 1),

                (tutor_ids[1], "Physics Teacher", "Merkato Secondary School", "Addis Ababa, Ethiopia",
                 date(2017, 9, 1), date(2020, 12, 31), False, 3, 4, "Teaching physics to grades 9-12",
                 "Classroom instruction, Lab experiments, Student mentoring", "Best teacher award 2019", "full-time", 2),

                # Tutor 3 - Chemistry expert
                (tutor_ids[2], "Chemistry Teacher", "St. Joseph School", "Addis Ababa, Ethiopia",
                 date(2019, 9, 1), None, True, 5, 3, "Teaching chemistry to high school students",
                 "Lecture delivery, Lab management, Safety protocols", "Developed safe chemistry experiments curriculum", "full-time", 1),
            ]

            # Add basic experience for remaining tutors
            for i, tutor_id in enumerate(tutor_ids[3:7], start=4):
                subject = ["Mathematics", "Biology", "English", "History"][i % 4]
                experiences_data.append(
                    (tutor_id, f"{subject} Teacher", f"School {i}", "Addis Ababa, Ethiopia",
                     date(2018, 9, 1), None, True, 6, 0, f"Teaching {subject} to students",
                     "Teaching, Grading, Mentoring", "Excellent student outcomes", "full-time", 1)
                )

            cur.executemany("""
                INSERT INTO tutor_experience
                (tutor_id, job_title, institution, location, start_date, end_date, is_current,
                 duration_years, duration_months, description, responsibilities, achievements, employment_type, display_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, experiences_data)

            print(f"  - Inserted {len(experiences_data)} experience records")

            # ============================================
            # 4. SEED VIDEOS
            # ============================================
            print("\n4. Seeding tutor_videos...")

            videos_data = [
                # Tutor 1 - Math videos
                (tutor_ids[0], "Introduction Video", "Welcome to my mathematics classes! Learn about my teaching approach.",
                 "/uploads/system_videos/tutor_intro_1.mp4", "/uploads/system_images/thumbnails/tutor_intro_1.jpg",
                 "intro", 90, "1:30", 15.5, "Mathematics", "All Levels", json.dumps(["Introduction", "Teaching Style"]),
                 245, 89, 34, True, True, 1, datetime.now() - timedelta(days=30)),

                (tutor_ids[0], "Advanced Calculus - Derivatives", "Comprehensive lesson on calculating derivatives",
                 "/uploads/system_videos/calculus_derivatives.mp4", "/uploads/system_images/thumbnails/calculus_thumb.jpg",
                 "sample_lesson", 1200, "20:00", 45.2, "Mathematics", "Grade 11-12", json.dumps(["Calculus", "Derivatives", "Functions"]),
                 1523, 234, 67, True, False, 2, datetime.now() - timedelta(days=15)),

                (tutor_ids[0], "Student Success Story - Grade Improvement", "My student Alem improved from C to A+",
                 "/uploads/system_videos/success_alem.mp4", "/uploads/system_images/thumbnails/success_thumb.jpg",
                 "testimonial", 120, "2:00", 18.3, "Mathematics", "Grade 10", json.dumps(["Success Story", "Testimonial"]),
                 892, 156, 45, False, False, 3, datetime.now() - timedelta(days=20)),

                # Tutor 2 - Physics videos
                (tutor_ids[1], "Physics Tutor Introduction", "Discover physics in an exciting way!",
                 "/uploads/system_videos/tutor_intro_2.mp4", "/uploads/system_images/thumbnails/tutor_intro_2.jpg",
                 "intro", 75, "1:15", 12.8, "Physics", "All Levels", json.dumps(["Introduction"]),
                 189, 67, 23, True, True, 1, datetime.now() - timedelta(days=25)),

                (tutor_ids[1], "Newton's Laws of Motion", "Understanding the three laws of motion with real examples",
                 "/uploads/system_videos/newtons_laws.mp4", "/uploads/system_images/thumbnails/newton_thumb.jpg",
                 "sample_lesson", 900, "15:00", 38.7, "Physics", "Grade 9-10", json.dumps(["Mechanics", "Newton's Laws"]),
                 1105, 178, 52, True, False, 2, datetime.now() - timedelta(days=10)),

                # Tutor 3 - Chemistry videos
                (tutor_ids[2], "Chemistry Made Easy", "Join me for exciting chemistry lessons!",
                 "/uploads/system_videos/tutor_intro_3.mp4", "/uploads/system_images/thumbnails/tutor_intro_3.jpg",
                 "intro", 85, "1:25", 14.1, "Chemistry", "All Levels", json.dumps(["Introduction"]),
                 167, 54, 19, True, True, 1, datetime.now() - timedelta(days=28)),
            ]

            # Add intro videos for remaining tutors
            for i, tutor_id in enumerate(tutor_ids[3:7], start=4):
                subject = ["Mathematics", "Biology", "English", "History"][i % 4]
                videos_data.append(
                    (tutor_id, f"{subject} Tutor - Introduction", f"Welcome to my {subject} classes!",
                     f"/uploads/system_videos/tutor_intro_{i}.mp4", f"/uploads/system_images/thumbnails/tutor_intro_{i}.jpg",
                     "intro", 80, "1:20", 13.5, subject, "All Levels", json.dumps(["Introduction"]),
                     120+i*10, 40+i*5, 15+i*2, True, True, 1, datetime.now() - timedelta(days=20+i))
                )

            cur.executemany("""
                INSERT INTO tutor_videos
                (tutor_id, title, description, video_url, thumbnail_url, video_type,
                 duration_seconds, duration_display, file_size_mb, subject, grade_level, topics,
                 view_count, like_count, share_count, is_featured, is_intro_video, display_order, published_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, videos_data)

            print(f"  - Inserted {len(videos_data)} videos")

            conn.commit()
            print("\nSUCCESS! All view-tutor extended data seeded successfully!")
            print(f"\nSeeded for {len(tutor_ids)} tutors:")
            print(f"  - {len(achievements_data)} achievements")
            print(f"  - {len(certificates_data)} certificates")
            print(f"  - {len(experiences_data)} experience records")
            print(f"  - {len(videos_data)} videos")

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    seed_view_tutor_data()
