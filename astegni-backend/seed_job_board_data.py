"""
Seed Data: Job Board Sample Data
Populates database with sample job postings and related data
"""

import psycopg
import json
from datetime import datetime, timedelta
import sys

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Database connection parameters
DB_PARAMS = {
    'dbname': 'astegni_user_db',
    'user': 'astegni_user',
    'password': 'Astegni2025',
    'host': 'localhost',
    'port': 5432
}

def seed_data():
    """Seed job board with sample data"""

    conn = psycopg.connect(**DB_PARAMS)
    cur = conn.cursor()

    try:
        print("=" * 60)
        print("SEEDING JOB BOARD DATA")
        print("=" * 60)

        # Get a sample advertiser (user 115's advertiser profile ID 23)
        cur.execute("SELECT id FROM advertiser_profiles WHERE user_id = 115 LIMIT 1")
        result = cur.fetchone()
        if not result:
            print("❌ No advertiser found with user_id 115. Please create one first.")
            return

        advertiser_id = result[0]
        user_id = 115
        print(f"\n✅ Found advertiser profile: ID {advertiser_id}, User ID {user_id}")

        # 1. Seed Job Categories
        print("\n1. Seeding job categories...")
        categories = [
            ('Education', 'Teaching and educational roles', '🎓', None),
            ('Primary Education', 'Elementary school teaching', '📚', 1),
            ('Secondary Education', 'High school teaching', '🏫', 1),
            ('Higher Education', 'University and college teaching', '🎓', 1),
            ('STEM Education', 'Science, Technology, Engineering, Math', '🔬', 1),
            ('Technology', 'IT and software development', '💻', None),
            ('Marketing', 'Marketing and advertising roles', '📢', None),
            ('Administration', 'Administrative and support roles', '📋', None),
        ]

        category_ids = {}
        for name, description, icon, parent_id in categories:
            cur.execute("""
                INSERT INTO job_categories (name, description, icon, parent_id)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (name) DO NOTHING
                RETURNING id
            """, (name, description, icon, parent_id))
            result = cur.fetchone()
            if result:
                category_ids[name] = result[0]
                print(f"  ✅ Created category: {name}")

        # Re-fetch category IDs if they already existed
        cur.execute("SELECT id, name FROM job_categories")
        for row in cur.fetchall():
            category_ids[row[1]] = row[0]

        # 2. Seed Job Posts
        print("\n2. Seeding job posts...")

        jobs = [
            {
                'title': 'Senior Mathematics Teacher',
                'description': '''We are seeking a passionate and experienced Mathematics Teacher to join our growing educational institution in Addis Ababa. The ideal candidate will have a deep understanding of mathematical concepts and the ability to inspire students.

Key Responsibilities:
- Teach mathematics to high school students (Grades 9-12)
- Develop engaging lesson plans aligned with the Ethiopian curriculum
- Assess student progress and provide constructive feedback
- Participate in departmental meetings and professional development
- Mentor junior teachers and contribute to curriculum development''',
                'requirements': '''Required Qualifications:
- Bachelor's degree in Mathematics or Mathematics Education (Master's preferred)
- 5+ years of teaching experience in secondary education
- Strong knowledge of the Ethiopian education curriculum
- Excellent communication and classroom management skills
- Proficiency in English and Amharic

Desired Skills:
- Experience with digital teaching tools and platforms
- Published research or educational materials
- Track record of student achievement
- Ability to teach multiple grade levels''',
                'job_type': 'full-time',
                'location_type': 'on-site',
                'location': 'Addis Ababa, Ethiopia',
                'salary_min': 25000,
                'salary_max': 40000,
                'salary_visibility': 'public',
                'skills': ['Teaching', 'Mathematics', 'Curriculum Development', 'Student Assessment', 'Classroom Management'],
                'experience_level': 'senior',
                'education_level': "Bachelor's Degree (Master's preferred)",
                'application_deadline': (datetime.now() + timedelta(days=30)).date(),
                'status': 'active',
                'published_at': datetime.now(),
                'views': 127,
                'applications_count': 23,
                'category': 'Secondary Education'
            },
            {
                'title': 'English Language Tutor',
                'description': '''Join our team of dedicated English language instructors! We're looking for a creative and enthusiastic tutor to help students master English language skills.

About the Role:
This position offers flexible hours and the opportunity to make a real impact on students' lives. You'll work with students of varying proficiency levels, from beginners to advanced learners.

What You'll Do:
- Conduct one-on-one and group English lessons
- Create customized learning materials for students
- Track student progress and adjust teaching methods
- Prepare students for standardized English tests (TOEFL, IELTS)
- Provide homework assistance and academic support''',
                'requirements': '''Requirements:
- Bachelor's degree in English, Education, or related field
- 2+ years of tutoring or teaching experience
- Native or near-native English proficiency
- TEFL/TESOL certification (preferred)
- Patient, encouraging teaching style

Additional Preferences:
- Experience teaching test preparation
- Familiarity with online teaching platforms
- Availability for evening and weekend sessions''',
                'job_type': 'part-time',
                'location_type': 'hybrid',
                'location': 'Addis Ababa, Ethiopia',
                'salary_min': 15000,
                'salary_max': 25000,
                'salary_visibility': 'public',
                'skills': ['English', 'Teaching', 'Communication', 'Test Preparation', 'Curriculum Design'],
                'experience_level': 'mid',
                'education_level': "Bachelor's Degree",
                'application_deadline': (datetime.now() + timedelta(days=25)).date(),
                'status': 'active',
                'published_at': datetime.now() - timedelta(days=5),
                'views': 89,
                'applications_count': 15,
                'category': 'Education'
            },
            {
                'title': 'Physics & Chemistry Lab Instructor',
                'description': '''Exciting opportunity for a hands-on science educator! We're expanding our laboratory program and need an experienced instructor to lead practical science sessions.

Position Overview:
This role focuses on delivering engaging laboratory experiences for students studying Physics and Chemistry. You'll manage lab equipment, ensure safety protocols, and inspire the next generation of scientists.

Responsibilities:
- Conduct laboratory sessions for Grades 9-12
- Demonstrate scientific experiments and principles
- Maintain and manage laboratory equipment and supplies
- Ensure compliance with safety regulations
- Collaborate with classroom teachers to align practical work with theory
- Document experimental results and student performance''',
                'requirements': '''Essential Requirements:
- Degree in Physics, Chemistry, or related scientific field
- 3+ years of laboratory teaching experience
- Strong knowledge of laboratory safety procedures
- Excellent practical and demonstration skills
- Ability to explain complex concepts clearly

Preferred Qualifications:
- Master's degree in Education or Science
- Experience with modern laboratory equipment
- First aid certification
- Research background''',
                'job_type': 'full-time',
                'location_type': 'on-site',
                'location': 'Bahir Dar, Ethiopia',
                'salary_min': 20000,
                'salary_max': 35000,
                'salary_visibility': 'negotiable',
                'skills': ['Physics', 'Chemistry', 'Laboratory Safety', 'Science Education', 'Equipment Management'],
                'experience_level': 'mid',
                'education_level': "Bachelor's Degree (Master's preferred)",
                'application_deadline': (datetime.now() + timedelta(days=20)).date(),
                'status': 'active',
                'published_at': datetime.now() - timedelta(days=10),
                'views': 64,
                'applications_count': 12,
                'category': 'STEM Education'
            },
            {
                'title': 'Computer Science Teacher',
                'description': '''We're looking for a tech-savvy educator to teach Computer Science and Programming to high school students. This is an excellent opportunity for someone passionate about technology education.

About Us:
Our institution is committed to preparing students for the digital future. We've recently upgraded our computer labs and are expanding our CS curriculum.

Your Role:
- Teach programming fundamentals (Python, JavaScript)
- Introduce students to web development and databases
- Guide students in computer science projects
- Organize coding competitions and hackathons
- Stay current with technology trends and update curriculum''',
                'requirements': '''Required:
- Computer Science or Software Engineering degree
- 2+ years teaching or industry experience
- Strong programming skills (Python, JavaScript, Java)
- Passion for education and technology
- Excellent problem-solving abilities

Nice to Have:
- Professional software development experience
- Experience with educational technology platforms
- Certifications in programming languages or frameworks
- GitHub portfolio or open-source contributions''',
                'job_type': 'full-time',
                'location_type': 'on-site',
                'location': 'Addis Ababa, Ethiopia',
                'salary_min': 30000,
                'salary_max': 50000,
                'salary_visibility': 'public',
                'skills': ['Programming', 'Computer Science', 'Python', 'JavaScript', 'Teaching', 'Web Development'],
                'experience_level': 'mid',
                'education_level': "Bachelor's Degree",
                'application_deadline': (datetime.now() + timedelta(days=35)).date(),
                'status': 'active',
                'published_at': datetime.now() - timedelta(days=3),
                'views': 156,
                'applications_count': 31,
                'category': 'STEM Education'
            },
            {
                'title': 'Elementary School Teacher',
                'description': '''Join our warm and nurturing elementary school! We're seeking a dedicated teacher who loves working with young learners and creating a positive classroom environment.

Position Highlights:
- Small class sizes (maximum 25 students)
- Supportive administration and collaborative team
- Modern teaching resources and facilities
- Professional development opportunities

Duties:
- Teach core subjects to elementary students (Grades 1-6)
- Create engaging and age-appropriate lesson plans
- Foster a safe and inclusive learning environment
- Communicate regularly with parents about student progress
- Participate in school events and activities''',
                'requirements': '''Qualifications:
- Degree in Elementary Education or related field
- 1-3 years of elementary teaching experience
- Understanding of child development principles
- Creative and patient teaching approach
- Strong classroom management skills

Additional:
- First aid and CPR certification (or willing to obtain)
- Experience with differentiated instruction
- Proficiency in both English and Amharic
- Commitment to ongoing professional development''',
                'job_type': 'full-time',
                'location_type': 'on-site',
                'location': 'Hawassa, Ethiopia',
                'salary_min': 18000,
                'salary_max': 28000,
                'salary_visibility': 'public',
                'skills': ['Elementary Education', 'Classroom Management', 'Child Development', 'Lesson Planning', 'Parent Communication'],
                'experience_level': 'entry',
                'education_level': "Bachelor's Degree",
                'application_deadline': (datetime.now() + timedelta(days=28)).date(),
                'status': 'active',
                'published_at': datetime.now() - timedelta(days=7),
                'views': 98,
                'applications_count': 19,
                'category': 'Primary Education'
            },
            {
                'title': 'University Lecturer - Economics',
                'description': '''Our Economics Department is expanding! We're recruiting an accomplished lecturer to teach undergraduate and graduate courses in Economics.

Academic Position:
This tenure-track position offers opportunities for research, publication, and academic leadership. You'll be part of a dynamic department committed to excellence in teaching and research.

Teaching Responsibilities:
- Deliver lectures in microeconomics, macroeconomics, and specialized topics
- Supervise undergraduate and graduate student research
- Develop innovative course materials and curricula
- Contribute to departmental assessment and accreditation efforts

Research Expectations:
- Maintain active research agenda with peer-reviewed publications
- Pursue external funding opportunities
- Present at academic conferences
- Mentor student researchers''',
                'requirements': '''Required Qualifications:
- PhD in Economics or related field (ABD considered)
- Strong record of teaching excellence
- Published research in reputable journals
- Expertise in econometrics and quantitative methods
- Commitment to student success

Preferred:
- 3+ years of university teaching experience
- Experience with online/hybrid teaching
- International research collaborations
- Grant writing experience
- Fluency in multiple languages''',
                'job_type': 'full-time',
                'location_type': 'on-site',
                'location': 'Addis Ababa, Ethiopia',
                'salary_min': 45000,
                'salary_max': 70000,
                'salary_visibility': 'negotiable',
                'skills': ['Economics', 'Research', 'Econometrics', 'Academic Writing', 'Teaching', 'Data Analysis'],
                'experience_level': 'senior',
                'education_level': 'PhD',
                'application_deadline': (datetime.now() + timedelta(days=45)).date(),
                'status': 'active',
                'published_at': datetime.now() - timedelta(days=2),
                'views': 203,
                'applications_count': 8,
                'category': 'Higher Education'
            },
            {
                'title': 'Special Education Teacher',
                'description': '''Make a difference in the lives of students with special needs! We're looking for a compassionate and skilled special education teacher.

Our Mission:
We provide inclusive education and support for students with diverse learning needs. Our school is committed to ensuring every child reaches their full potential.

Your Impact:
- Work with students with various learning disabilities
- Develop Individualized Education Programs (IEPs)
- Adapt curriculum and teaching methods to meet individual needs
- Collaborate with general education teachers and parents
- Track student progress and adjust interventions
- Advocate for student accommodations and support services''',
                'requirements': '''Essential Requirements:
- Special Education degree or certification
- Experience working with students with disabilities
- Knowledge of IEP development and implementation
- Patient, empathetic, and creative approach
- Strong communication and advocacy skills

Preferred:
- Training in specific disabilities (autism, dyslexia, ADHD, etc.)
- Behavior management certification
- Assistive technology experience
- Bilingual (English/Amharic)
- 2+ years in special education settings''',
                'job_type': 'full-time',
                'location_type': 'on-site',
                'location': 'Addis Ababa, Ethiopia',
                'salary_min': 22000,
                'salary_max': 35000,
                'salary_visibility': 'public',
                'skills': ['Special Education', 'IEP Development', 'Behavior Management', 'Differentiated Instruction', 'Assistive Technology'],
                'experience_level': 'mid',
                'education_level': "Bachelor's Degree with Special Ed Certification",
                'application_deadline': (datetime.now() + timedelta(days=40)).date(),
                'status': 'active',
                'published_at': datetime.now() - timedelta(days=1),
                'views': 72,
                'applications_count': 14,
                'category': 'Education'
            },
            {
                'title': 'Online Course Developer',
                'description': '''Remote opportunity! We're building Ethiopia's leading e-learning platform and need an experienced instructional designer to create engaging online courses.

About the Role:
This fully remote position allows you to work from anywhere while creating educational content that reaches thousands of students across Ethiopia and beyond.

What You'll Create:
- Design and develop interactive online courses
- Create video lessons, quizzes, and assessments
- Write engaging course scripts and materials
- Collaborate with subject matter experts
- Implement best practices in online pedagogy
- Analyze learner data to improve course effectiveness''',
                'requirements': '''Required Skills:
- 3+ years in instructional design or e-learning development
- Experience with LMS platforms (Moodle, Canvas, etc.)
- Video editing and multimedia production skills
- Understanding of online learning principles
- Excellent writing and communication skills

Technical Requirements:
- Proficiency with e-learning authoring tools (Articulate, Captivate)
- Basic graphic design skills (Canva, Photoshop)
- Familiarity with SCORM and xAPI standards
- Self-motivated and able to work independently

Bonus:
- Experience teaching online courses
- Knowledge of Ethiopian education system
- Animation or motion graphics skills''',
                'job_type': 'contract',
                'location_type': 'remote',
                'location': 'Remote (Ethiopia)',
                'salary_min': 35000,
                'salary_max': 55000,
                'salary_visibility': 'public',
                'skills': ['Instructional Design', 'E-Learning', 'Video Production', 'LMS', 'Content Creation', 'Multimedia'],
                'experience_level': 'mid',
                'education_level': "Bachelor's Degree",
                'application_deadline': (datetime.now() + timedelta(days=15)).date(),
                'status': 'active',
                'published_at': datetime.now() - timedelta(days=12),
                'views': 145,
                'applications_count': 27,
                'category': 'Technology'
            },
        ]

        job_ids = []
        for job in jobs:
            cur.execute("""
                INSERT INTO job_posts (
                    advertiser_id, user_id, title, description, requirements,
                    job_type, location_type, location, salary_min, salary_max,
                    salary_visibility, skills, experience_level, education_level,
                    application_deadline, status, published_at, views, applications_count
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
            """, (
                advertiser_id, user_id, job['title'], job['description'], job['requirements'],
                job['job_type'], job['location_type'], job['location'], job['salary_min'], job['salary_max'],
                job['salary_visibility'], json.dumps(job['skills']), job['experience_level'], job['education_level'],
                job['application_deadline'], job['status'], job['published_at'], job['views'], job['applications_count']
            ))
            job_id = cur.fetchone()[0]
            job_ids.append((job_id, job['title'], job['category']))
            print(f"  ✅ Created job: {job['title']}")

        # 3. Link jobs to categories
        print("\n3. Linking jobs to categories...")
        for job_id, job_title, category_name in job_ids:
            if category_name in category_ids:
                cur.execute("""
                    INSERT INTO job_post_categories (job_id, category_id)
                    VALUES (%s, %s)
                """, (job_id, category_ids[category_name]))
                print(f"  ✅ Linked '{job_title}' to '{category_name}'")

        # 4. Add some job analytics
        print("\n4. Adding job analytics...")
        for job_id, job_title, _ in job_ids[:3]:  # Add analytics for first 3 jobs
            for days_ago in range(7):
                date = (datetime.now() - timedelta(days=days_ago)).date()
                cur.execute("""
                    INSERT INTO job_analytics (
                        job_id, date, views, unique_views, applications,
                        saves, avg_time_on_page, bounce_rate
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    job_id, date,
                    45 + (days_ago * 5),  # views
                    38 + (days_ago * 4),  # unique views
                    3 if days_ago < 5 else 0,  # applications
                    2,  # saves
                    125.5,  # avg time on page (seconds)
                    42.3  # bounce rate (percentage)
                ))
            print(f"  ✅ Added 7 days of analytics for '{job_title}'")

        # Commit all changes
        conn.commit()

        print("\n" + "=" * 60)
        print("✅ JOB BOARD DATA SEEDED SUCCESSFULLY!")
        print("=" * 60)
        print(f"\nSeeded:")
        print(f"  - {len(categories)} job categories")
        print(f"  - {len(jobs)} job posts")
        print(f"  - {len(jobs)} category mappings")
        print(f"  - 21 analytics records (7 days × 3 jobs)")
        print("\n" + "=" * 60)

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error seeding data: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    seed_data()
