"""
Seed database with tutors in different verification statuses:
- Pending/Requested tutors (waiting for admin review)
- Rejected tutors (with rejection reasons)
- Suspended tutors (temporarily disabled)
- Verified tutors (already approved)
"""

import sys
sys.path.append('.')

from datetime import datetime, timedelta
import random
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, TutorProfile
from utils import hash_password
from config import DATABASE_URL

# Ethiopian data for realistic tutors
ETHIOPIAN_FIRST_NAMES_MALE = [
    "Abebe", "Kebede", "Tadesse", "Bekele", "Getachew", "Tesfaye", "Mulugeta", "Desta",
    "Haile", "Yohannes", "Dawit", "Samuel", "Daniel", "Elias", "Biruk", "Yonas",
    "Ayele", "Girma", "Mesfin", "Worku", "Alemayehu", "Teshome", "Fikadu", "Negash"
]

ETHIOPIAN_FIRST_NAMES_FEMALE = [
    "Almaz", "Tigist", "Hanna", "Sara", "Marta", "Ruth", "Selamawit", "Bethlehem",
    "Rahel", "Eyerusalem", "Selam", "Tsion", "Mahlet", "Mekdes", "Senait", "Hiwot",
    "Fasika", "Kidist", "Meseret", "Aberash", "Yeshi", "Lула", "Addis", "Zenebech"
]

ETHIOPIAN_FATHER_NAMES = [
    "Tadesse", "Bekele", "Tesfaye", "Hailu", "Meles", "Solomon", "Kebede", "Worku",
    "Getachew", "Mulugeta", "Desta", "Ayele", "Teshome", "Negash", "Girma", "Mesfin"
]

ETHIOPIAN_GRANDFATHER_NAMES = [
    "Gebre", "Selassie", "Mariam", "Yohannes", "Kidane", "Wolde", "Amare", "Tekle",
    "Gebru", "Mengistu", "Haile", "Fisseha", "Zewde", "Berhe"
]

ETHIOPIAN_CITIES = [
    "Addis Ababa, Bole", "Addis Ababa, Kirkos", "Addis Ababa, Yeka", "Addis Ababa, Arada",
    "Bahir Dar", "Gondar", "Hawassa", "Mekelle", "Dire Dawa", "Jimma", "Adama", "Dessie",
    "Harar", "Shashemene", "Sodo", "Arba Minch", "Axum", "Lalibela", "Debre Birhan"
]

ETHIOPIAN_INSTITUTIONS = [
    "Addis Ababa University", "Bahir Dar University", "Hawassa University", "Jimma University",
    "Mekelle University", "Gondar University", "Arba Minch University", "Haramaya University",
    "St. Mary's School", "International Community School", "Bingham Academy", "Sandford International School",
    "Ras Desta Damtew School", "Menelik II School", "Kokebe Tsibah School", "Hope Enterprise University",
    "Unity University", "Admas University", "Alpha University College", "Ethiopian Civil Service University"
]

SUBJECTS = [
    "Mathematics", "Physics", "Chemistry", "Biology", "English", "Amharic",
    "History", "Geography", "Economics", "Computer Science", "Accounting",
    "French", "Civics", "Statistics", "Engineering", "Business Studies"
]

LANGUAGES = ["English", "Amharic", "Oromo", "Tigrinya", "Somali", "Gurage", "French"]

EDUCATION_LEVELS = [
    "Bachelor's Degree", "Master's Degree", "PhD", "Professional Certificate",
    "Diploma", "Associate Degree"
]

REJECTION_REASONS = [
    "Incomplete documentation - ID document is not clear enough to verify identity",
    "Missing required certifications for claimed education level",
    "Profile information does not match submitted documents",
    "Insufficient teaching experience for the subjects claimed",
    "Unable to verify institution affiliation",
    "Application contains inconsistent information",
    "Required background check pending",
    "Submitted documents are expired or invalid",
    "Teaching qualifications do not meet platform standards",
    "Unable to contact applicant for verification"
]

SUSPENSION_REASONS = [
    "Multiple student complaints requiring investigation",
    "Violation of platform code of conduct",
    "Irregular session attendance patterns",
    "Payment dispute under review",
    "Quality assurance review in progress",
    "Profile information accuracy investigation",
    "Temporary suspension pending credential reverification"
]

def create_engine_and_session():
    """Create database engine and session"""
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine, SessionLocal()

def create_tutor_user(db, first_name, father_name, grandfather_name, gender, status_type, index):
    """Create a user account for a tutor"""

    # Create unique username
    username = f"{first_name.lower()}{father_name.lower()}{index}"
    email = f"{username}@example.com"
    phone = f"+25191{random.randint(1000000, 9999999)}"

    # Check if user already exists
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        return existing_user

    user = User(
        first_name=first_name,
        father_name=father_name,
        grandfather_name=grandfather_name,
        username=username,
        email=email,
        phone=phone,
        password_hash=hash_password("password123"),
        roles=["tutor"],
        active_role="tutor",
        gender=gender,
        is_active=True if status_type != "suspended" else False,
        email_verified=True,
        phone_verified=True,
        created_at=datetime.utcnow() - timedelta(days=random.randint(1, 90)),
        last_login=datetime.utcnow() - timedelta(days=random.randint(0, 30))
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user

def create_tutor_profile(db, user, status_type):
    """Create a tutor profile with specific verification status"""

    # Random professional data
    num_subjects = random.randint(1, 3)
    subjects = random.sample(SUBJECTS, num_subjects)
    num_languages = random.randint(2, 4)
    languages = random.sample(LANGUAGES, num_languages)
    education = random.choice(EDUCATION_LEVELS)
    experience = random.randint(1, 15)
    teaches_at = random.choice(ETHIOPIAN_INSTITUTIONS)
    location = random.choice(ETHIOPIAN_CITIES)

    # Bio variations
    bios = [
        f"Experienced {subjects[0]} teacher with {experience} years of teaching at {teaches_at}. Passionate about student success.",
        f"Dedicated educator specializing in {', '.join(subjects[:2])}. Committed to excellence in education.",
        f"{education} graduate with {experience} years of teaching experience. Strong focus on student understanding.",
        f"Professional tutor at {teaches_at}. Expert in {subjects[0]} with proven track record.",
        f"Passionate about education. {experience} years helping students achieve their academic goals."
    ]

    # Set verification status based on type
    if status_type == "pending":
        is_verified = False
        verification_status = "pending"
        rejection_reason = None
        verified_at = None
        verified_by = None
    elif status_type == "rejected":
        is_verified = False
        verification_status = "rejected"
        rejection_reason = random.choice(REJECTION_REASONS)
        verified_at = None
        verified_by = 1  # Admin ID 1 (would need to exist)
    elif status_type == "suspended":
        is_verified = True  # They were verified before suspension
        verification_status = "verified"
        rejection_reason = random.choice(SUSPENSION_REASONS)  # Using as suspension reason
        verified_at = datetime.utcnow() - timedelta(days=random.randint(30, 180))
        verified_by = 1
    else:  # verified
        is_verified = True
        verification_status = "verified"
        rejection_reason = None
        verified_at = datetime.utcnow() - timedelta(days=random.randint(30, 365))
        verified_by = 1

    tutor_profile = TutorProfile(
        user_id=user.id,
        username=user.username,
        bio=random.choice(bios),
        quote=f"Empowering students through {subjects[0]} education",
        courses=subjects,
        grades=random.sample(["Grade 7-8", "Grade 9-10", "Grade 11-12", "University Level"],
                           random.randint(1, 3)),
        location=location,
        teaches_at=teaches_at,
        sessionFormat=random.choice(["Online", "In-person", "Hybrid"]),
        languages=languages,
        experience=experience,
        education_level=education,
        certifications=[f"{education} in {subjects[0]}", "Teaching Certificate"],
        price=random.choice([50, 100, 150, 200, 250, 300, 350, 400, 450, 500]),
        currency="ETB",
        rating=round(random.uniform(3.5, 5.0), 1) if status_type == "verified" else 0.0,
        rating_count=random.randint(0, 100) if status_type == "verified" else 0,
        total_students=random.randint(0, 50) if status_type == "verified" else 0,
        total_sessions=random.randint(0, 200) if status_type == "verified" else 0,
        is_verified=is_verified,
        verification_status=verification_status,
        rejection_reason=rejection_reason,
        verified_at=verified_at,
        verified_by=verified_by,
        is_active=True if status_type != "suspended" else False,
        profile_complete=True,
        profile_completion=85.0 + random.randint(0, 15),
        created_at=user.created_at,
        updated_at=datetime.utcnow()
    )

    db.add(tutor_profile)
    db.commit()
    db.refresh(tutor_profile)

    return tutor_profile

def seed_tutors_by_status():
    """Main function to seed tutors in different statuses"""

    engine, db = create_engine_and_session()

    print("🌱 Starting tutor status seeding...\n")

    # Counts for each status
    counts = {
        "pending": 12,    # Pending/Requested tutors
        "rejected": 8,    # Rejected tutors
        "suspended": 5,   # Suspended tutors
        "verified": 15    # Additional verified tutors
    }

    total_created = 0

    for status_type, count in counts.items():
        print(f"📝 Creating {count} {status_type.upper()} tutors...")

        for i in range(count):
            # Random gender selection
            gender = random.choice(["Male", "Female"])

            if gender == "Male":
                first_name = random.choice(ETHIOPIAN_FIRST_NAMES_MALE)
            else:
                first_name = random.choice(ETHIOPIAN_FIRST_NAMES_FEMALE)

            father_name = random.choice(ETHIOPIAN_FATHER_NAMES)
            grandfather_name = random.choice(ETHIOPIAN_GRANDFATHER_NAMES)

            # Create user
            user = create_tutor_user(
                db,
                first_name,
                father_name,
                grandfather_name,
                gender,
                status_type,
                total_created + i + 1
            )

            # Create tutor profile
            tutor = create_tutor_profile(db, user, status_type)

            print(f"  ✓ Created {status_type} tutor: {first_name} {father_name} (ID: {tutor.id})")

        total_created += count
        print(f"✅ Completed {count} {status_type} tutors\n")

    print(f"🎉 Successfully created {total_created} tutors across all statuses!\n")

    # Print summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)

    for status in ["pending", "rejected", "verified"]:
        count = db.query(TutorProfile).filter(
            TutorProfile.verification_status == status
        ).count()
        print(f"  {status.upper()}: {count} tutors")

    suspended_count = db.query(TutorProfile).filter(
        TutorProfile.is_active == False,
        TutorProfile.verification_status == "verified"
    ).count()
    print(f"  SUSPENDED: {suspended_count} tutors")

    print("=" * 60)

    # Show some examples
    print("\n📋 Sample Pending Tutors:")
    pending = db.query(TutorProfile, User).join(User).filter(
        TutorProfile.verification_status == "pending"
    ).limit(3).all()

    for tutor, user in pending:
        print(f"  • {user.first_name} {user.father_name} - {tutor.location}")

    print("\n📋 Sample Rejected Tutors (with reasons):")
    rejected = db.query(TutorProfile, User).join(User).filter(
        TutorProfile.verification_status == "rejected"
    ).limit(3).all()

    for tutor, user in rejected:
        print(f"  • {user.first_name} {user.father_name}")
        print(f"    Reason: {tutor.rejection_reason[:60]}...")

    print("\n📋 Sample Suspended Tutors:")
    suspended = db.query(TutorProfile, User).join(User).filter(
        TutorProfile.is_active == False,
        TutorProfile.verification_status == "verified"
    ).limit(3).all()

    for tutor, user in suspended:
        print(f"  • {user.first_name} {user.father_name}")
        print(f"    Reason: {tutor.rejection_reason[:60]}...")

    db.close()
    print("\n✨ Seeding complete!")

if __name__ == "__main__":
    seed_tutors_by_status()
