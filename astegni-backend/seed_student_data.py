"""
Seed data script for student-related tables
"""
import sys
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app import SessionLocal, engine, Base, User, get_password_hash
from init_student import (
    StudentProfile, TutorStudentEnrollment, TutoringSession,
    StudentProgress, StudentPayment, StudentResource
)
from tutor_models import TutorProfile

def create_sample_students(db: Session, count: int = 10):
    """Create sample student users and profiles"""
    students = []
    
    for i in range(count):
        # Create user account
        user = User(
            first_name=f"Student{i+1}",
            last_name=f"Test{i+1}",
            email=f"student{i+1}@test.com",
            phone=f"+25191234567{i}",
            password_hash=get_password_hash("Test@123"),
            roles=["student"],
            active_role="student",
            profile_picture=f"https://ui-avatars.com/api/?name=Student{i+1}&background=10b981&color=fff"
        )
        db.add(user)
        db.flush()  # Get the user ID
        
        # Create student profile
        student_profile = StudentProfile(
            user_id=user.id,
            date_of_birth=datetime(2005 + (i % 5), (i % 12) + 1, (i % 28) + 1).date(),
            grade_level=f"Grade {9 + (i % 4)}",
            school_name=random.choice(["Unity High School", "St. Joseph School", "International Community School"]),
            subjects=random.sample(["Mathematics", "Physics", "Chemistry", "Biology", "English", "History"], k=3),
            weak_subjects=random.sample(["Mathematics", "Physics", "Chemistry"], k=1),
            strong_subjects=random.sample(["Biology", "English", "History"], k=1),
            learning_style=random.choice(["Visual", "Auditory", "Kinesthetic", "Reading/Writing"]),
            guardian_name=f"Parent{i+1} Test",
            guardian_phone=f"+25192234567{i}",
            guardian_email=f"parent{i+1}@test.com",
            guardian_relationship=random.choice(["Father", "Mother", "Guardian"]),
            preferred_session_time=random.choice(["Morning", "Afternoon", "Evening"]),
            preferred_session_days=random.sample(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], k=3),
            preferred_learning_mode=random.choice(["online", "in-person", "hybrid"]),
            academic_goals="Improve grades and prepare for university entrance exams",
            profile_completion=85.0
        )
        db.add(student_profile)
        students.append(student_profile)
    
    db.commit()
    print(f"Created {count} sample students")
    return students

def create_sample_enrollments(db: Session, students: list, tutors: list):
    """Create sample enrollments - all students enrolled, some with multiple tutors"""
    enrollments = []
    
    for idx, student in enumerate(students):
        # Every student gets at least one enrollment
        primary_tutor = tutors[idx % len(tutors)]
        
        enrollment = TutorStudentEnrollment(
            tutor_id=primary_tutor.id,
            student_id=student.id,
            enrollment_date=datetime.utcnow() - timedelta(days=random.randint(30, 180)),
            status="active",
            subjects=random.sample(student.subjects, k=min(2, len(student.subjects))),
            session_frequency=random.choice(["Daily", "Weekly", "Bi-weekly"]),
            session_duration=random.choice([60, 90, 120]),
            total_sessions_planned=random.randint(20, 50),
            sessions_completed=random.randint(5, 20),
            hourly_rate=random.randint(200, 500),
            payment_terms=random.choice(["Per session", "Monthly", "Package"]),
            discount_percentage=random.choice([0, 5, 10, 15])
        )
        db.add(enrollment)
        enrollments.append(enrollment)
        
        # 30% chance of having a second tutor for different subjects
        if random.random() < 0.3 and len(tutors) > 1:
            secondary_tutor = random.choice([t for t in tutors if t.id != primary_tutor.id])
            remaining_subjects = [s for s in student.subjects if s not in enrollment.subjects]
            
            if remaining_subjects:
                secondary_enrollment = TutorStudentEnrollment(
                    tutor_id=secondary_tutor.id,
                    student_id=student.id,
                    enrollment_date=datetime.utcnow() - timedelta(days=random.randint(15, 90)),
                    status=random.choice(["active", "paused"]),  # Some might be paused
                    subjects=remaining_subjects[:1],
                    session_frequency="Weekly",
                    session_duration=60,
                    total_sessions_planned=random.randint(10, 30),
                    sessions_completed=random.randint(0, 10),
                    hourly_rate=random.randint(150, 400),
                    payment_terms="Per session",
                    discount_percentage=0
                )
                db.add(secondary_enrollment)
                enrollments.append(secondary_enrollment)
    
    db.commit()
    print(f"Created {len(enrollments)} enrollments for {len(students)} students")
    print(f"- Primary enrollments: {len(students)}")
    print(f"- Secondary enrollments: {len(enrollments) - len(students)}")
    return enrollments

def create_sample_sessions(db: Session, enrollments: list):
    """Create sample tutoring sessions"""
    sessions = []
    
    for enrollment in enrollments:
        # Create past and future sessions
        for i in range(enrollment.sessions_completed):
            session_date = datetime.utcnow() - timedelta(days=random.randint(1, 30))
            session = TutoringSession(
                enrollment_id=enrollment.id,
                student_id=enrollment.student_id,
                tutor_id=enrollment.tutor_id,
                subject=random.choice(enrollment.subjects),
                topic=random.choice([
                    "Algebra Basics", "Quadratic Equations", "Trigonometry",
                    "Newton's Laws", "Thermodynamics", "Organic Chemistry"
                ]),
                session_date=session_date,
                duration=enrollment.session_duration,
                status="completed",
                mode=random.choice(["online", "in-person"]),
                location="Online via Zoom" if random.random() > 0.5 else "Tutor's Office",
                student_attended=True,
                tutor_attended=True,
                topics_covered=["Introduction", "Practice Problems", "Q&A"],
                homework_assigned="Complete exercises 1-10 from textbook",
                student_rating=random.uniform(4.0, 5.0),
                tutor_rating=random.uniform(3.5, 5.0)
            )
            db.add(session)
            sessions.append(session)
        
        # Create upcoming sessions
        for i in range(3):
            session_date = datetime.utcnow() + timedelta(days=random.randint(1, 14))
            session = TutoringSession(
                enrollment_id=enrollment.id,
                student_id=enrollment.student_id,
                tutor_id=enrollment.tutor_id,
                subject=random.choice(enrollment.subjects),
                session_date=session_date,
                duration=enrollment.session_duration,
                status="scheduled",
                mode=random.choice(["online", "in-person"]),
                location="TBD"
            )
            db.add(session)
            sessions.append(session)
    
    db.commit()
    print(f"Created {len(sessions)} sample sessions")
    return sessions

def create_sample_progress_reports(db: Session, students: list, tutors: list):
    """Create sample progress reports"""
    reports = []
    
    for student in students[:6]:  # Create reports for some students
        for subject in student.subjects[:2]:
            report = StudentProgress(
                student_id=student.id,
                tutor_id=random.choice(tutors).id,
                subject=subject,
                assessment_date=datetime.utcnow() - timedelta(days=random.randint(7, 30)),
                assessment_type=random.choice(["Quiz", "Test", "Assignment", "Project"]),
                score=random.uniform(60, 95),
                max_score=100,
                percentage=random.uniform(60, 95),
                grade=random.choice(["A", "A-", "B+", "B", "B-"]),
                topics_mastered=["Basic Concepts", "Problem Solving"],
                topics_need_improvement=["Advanced Applications"],
                skill_level=random.choice(["Beginner", "Intermediate", "Advanced"]),
                improvement_rate=random.uniform(5, 25),
                tutor_recommendations="Continue practicing daily exercises",
                short_term_goals=["Complete chapter exercises", "Improve problem-solving speed"],
                long_term_goals=["Master advanced concepts", "Score above 90% in finals"]
            )
            db.add(report)
            reports.append(report)
    
    db.commit()
    print(f"Created {len(reports)} sample progress reports")
    return reports

def create_sample_payments(db: Session, enrollments: list):
    """Create sample payment records"""
    payments = []
    
    for enrollment in enrollments:
        # Create past payments
        for month in range(3):
            payment_date = datetime.utcnow() - timedelta(days=30 * (month + 1))
            payment = StudentPayment(
                student_id=enrollment.student_id,
                enrollment_id=enrollment.id,
                amount=enrollment.hourly_rate * 4,  # Assuming 4 sessions per month
                payment_date=payment_date,
                due_date=payment_date - timedelta(days=5),
                status="paid",
                payment_method=random.choice(["Bank Transfer", "Mobile Money", "Cash"]),
                transaction_id=f"TXN{random.randint(100000, 999999)}",
                billing_period_start=payment_date - timedelta(days=30),
                billing_period_end=payment_date,
                sessions_covered=4,
                total_amount=enrollment.hourly_rate * 4
            )
            db.add(payment)
            payments.append(payment)
    
    db.commit()
    print(f"Created {len(payments)} sample payments")
    return payments

def get_or_create_tutors(db: Session, count: int = 5):
    """Get existing tutors or create new ones"""
    tutors = db.query(TutorProfile).all()
    
    if len(tutors) < count:
        # Create sample tutors if not enough exist
        for i in range(count - len(tutors)):
            user = User(
                first_name=f"Tutor{i+1}",
                last_name=f"Teacher{i+1}",
                email=f"tutor{i+1}@test.com",
                phone=f"+25193234567{i}",
                password_hash=get_password_hash("Test@123"),
                roles=["tutor"],
                active_role="tutor"
            )
            db.add(user)
            db.flush()
            
            tutor_profile = TutorProfile(
                user_id=user.id,
                bio="Experienced tutor with passion for teaching",
                subjects=["Mathematics", "Physics", "Chemistry"],
                experience_years=random.randint(2, 10),
                hourly_rate=random.randint(200, 500),
                rating=random.uniform(4.0, 5.0)
            )
            db.add(tutor_profile)
            tutors.append(tutor_profile)
        
        db.commit()
        print(f"Created {count - len(tutors)} sample tutors")
    
    return tutors

def seed_all():
    """Main function to seed all student-related data"""
    db = SessionLocal()
    
    try:
        print("Starting data seeding...")
        
        # Create tables if they don't exist
        Base.metadata.create_all(bind=engine)
        
        # Get or create tutors first
        tutors = get_or_create_tutors(db, count=5)
        
        # Create students
        students = create_sample_students(db, count=10)
        
        # Create enrollments
        enrollments = create_sample_enrollments(db, students, tutors)
        
        # Create sessions
        sessions = create_sample_sessions(db, enrollments)
        
        # Create progress reports
        progress_reports = create_sample_progress_reports(db, students, tutors)
        
        # Create payments
        payments = create_sample_payments(db, enrollments)
        
        print("\n✅ Data seeding completed successfully!")
        print(f"Summary:")
        print(f"- Students: {len(students)}")
        print(f"- Tutors: {len(tutors)}")
        print(f"- Enrollments: {len(enrollments)}")
        print(f"- Sessions: {len(sessions)}")
        print(f"- Progress Reports: {len(progress_reports)}")
        print(f"- Payments: {len(payments)}")
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_all()