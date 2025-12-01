"""
Seed sample admin profiles with Ethiopian names
"""
import psycopg
from dotenv import load_dotenv
import os
import json
from datetime import datetime, timedelta
import random
import sys
import io

# Force UTF-8 output encoding for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

# Ethiopian admin data
ADMIN_PROFILES = [
    {
        "first_name": "Abebe",
        "father_name": "Kebede",
        "grandfather_name": "Tesfa",
        "admin_username": "abebe_kebede",
        "quote": "Empowering tutors to deliver excellence in education.",
        "bio": "Experienced administrator specializing in tutor management and verification. Dedicated to maintaining high educational standards.",
        "phone_number": "+251911234567",
        "email": "abebe.kebede@astegni.et",
        "department": "manage-tutors",
        "access_level": "Admin",
        "responsibilities": "Tutor Verification & Management",
        "employee_id": "ADM-2024-001",
        "badges": [
            {"text": "✔ Tutor Specialist", "class": "verified"},
            {"text": "👨‍🏫 Verification Expert", "class": "expert"}
        ]
    },
    {
        "first_name": "Tigist",
        "father_name": "Hailu",
        "grandfather_name": "Alemayehu",
        "admin_username": "tigist_hailu",
        "quote": "Creating exceptional learning experiences through quality content.",
        "bio": "Senior administrator focused on course creation, curriculum development, and educational content quality assurance.",
        "phone_number": "+251922345678",
        "email": "tigist.hailu@astegni.et",
        "department": "manage-courses",
        "access_level": "Admin",
        "responsibilities": "Course Creation & Management",
        "employee_id": "ADM-2024-002",
        "badges": [
            {"text": "✔ Course Manager", "class": "verified"},
            {"text": "📚 Curriculum Expert", "class": "course"},
            {"text": "🎓 Quality Assurance", "class": "expert"}
        ]
    },
    {
        "first_name": "Yohannes",
        "father_name": "Girma",
        "grandfather_name": "Bekele",
        "admin_username": "yohannes_girma",
        "quote": "Building trust through authentic reviews and feedback.",
        "bio": "Administrator specializing in review moderation, community trust, and ensuring authentic feedback across the platform.",
        "phone_number": "+251933456789",
        "email": "yohannes.girma@astegni.et",
        "department": "manage-reviews",
        "access_level": "Admin",
        "responsibilities": "Review Moderation & Trust Management",
        "employee_id": "ADM-2024-004",
        "badges": [
            {"text": "✔ Review Moderator", "class": "verified"},
            {"text": "⭐ Trust Guardian", "class": "expert"}
        ]
    },
    {
        "first_name": "Selam",
        "father_name": "Tesfaye",
        "grandfather_name": "Wolde",
        "admin_username": "selam_tesfaye",
        "quote": "Connecting schools with educational excellence.",
        "bio": "Administrator managing school partnerships, institutional relationships, and educational institution verification.",
        "phone_number": "+251944567890",
        "email": "selam.tesfaye@astegni.et",
        "department": "manage-schools",
        "access_level": "Admin",
        "responsibilities": "School Partnership & Management",
        "employee_id": "ADM-2024-005",
        "badges": [
            {"text": "✔ School Liaison", "class": "verified"},
            {"text": "🏫 Partnership Manager", "class": "expert"}
        ]
    },
    {
        "first_name": "Dawit",
        "father_name": "Mulugeta",
        "grandfather_name": "Getachew",
        "admin_username": "dawit_mulugeta",
        "quote": "Ensuring platform integrity and user safety.",
        "bio": "Super Administrator with full system access. Oversees all administrative functions, system security, and platform operations.",
        "phone_number": "+251955678901",
        "email": "dawit.mulugeta@astegni.et",
        "department": "super-admin",
        "access_level": "Super Admin",
        "responsibilities": "Full System Administration & Security",
        "employee_id": "SADM-2024-001",
        "badges": [
            {"text": "✔ Super Admin", "class": "verified"},
            {"text": "🛡️ System Security", "class": "expert"},
            {"text": "⚙️ Platform Operations", "class": "admin"}
        ]
    }
]

def seed_admin_data():
    """Seed admin profiles and stats"""
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                print("="*80)
                print("SEEDING ADMIN PROFILES")
                print("="*80)

                # Note: In production, you would create actual user accounts first
                # For this demo, we'll update the existing admin (admin_id=1) and add comments

                for idx, profile in enumerate(ADMIN_PROFILES, start=1):
                    print(f"\n{idx}. Processing: {profile['first_name']} {profile['father_name']}")
                    print("-" * 80)

                    # For the first profile, update existing admin_id=1
                    if idx == 1:
                        admin_id = 1
                        print(f"Updating existing admin (admin_id={admin_id})...")

                        # Update admin_profile
                        cur.execute("""
                            UPDATE admin_profile
                            SET first_name = %s,
                                father_name = %s,
                                grandfather_name = %s,
                                admin_username = %s,
                                quote = %s,
                                bio = %s,
                                phone_number = %s,
                                email = %s,
                                department = %s,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE admin_id = %s
                        """, (
                            profile['first_name'],
                            profile['father_name'],
                            profile['grandfather_name'],
                            profile['admin_username'],
                            profile['quote'],
                            profile['bio'],
                            profile['phone_number'],
                            profile['email'],
                            profile['department'],
                            admin_id
                        ))

                        # Update admin_profile_stats
                        cur.execute("""
                            UPDATE admin_profile_stats
                            SET access_level = %s,
                                responsibilities = %s,
                                employee_id = %s,
                                badges = %s,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE admin_id = %s
                        """, (
                            profile['access_level'],
                            profile['responsibilities'],
                            profile['employee_id'],
                            json.dumps(profile['badges']),
                            admin_id
                        ))

                        print(f"✓ Updated admin profile for {profile['admin_username']}")

                    else:
                        # For demonstration, we'll just show the data that would be inserted
                        # In production, you would first create the user account, then insert profiles
                        print(f"Demo data for {profile['admin_username']}:")
                        print(f"  Department: {profile['department']}")
                        print(f"  Access Level: {profile['access_level']}")
                        print(f"  Responsibilities: {profile['responsibilities']}")
                        print(f"  Employee ID: {profile['employee_id']}")
                        print(f"  Badges: {len(profile['badges'])} badge(s)")
                        print("  Note: Requires user account creation first")

                conn.commit()

                print("\n" + "="*80)
                print("SEEDING COMPLETE!")
                print("="*80)
                print("\nAdmin profiles have been prepared.")
                print("Updated existing admin (admin_id=1) with full data.")
                print("\nTo add more admins:")
                print("1. Create user accounts first (with role 'admin')")
                print("2. Then insert corresponding admin_profile and admin_profile_stats records")
                print("="*80)

    except Exception as e:
        print(f"Error seeding admin data: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    seed_admin_data()
