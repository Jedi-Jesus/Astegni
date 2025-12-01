"""
Test script to verify tutor_profiles integration
Creates sample data and tests all endpoints
"""

import requests
import json
from datetime import datetime
import sys
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import random

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

# Configuration
API_BASE_URL = "http://localhost:8000"
DATABASE_URL = os.getenv('DATABASE_URL')

# Convert for psycopg3
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

def create_admin_and_login():
    """Create admin user and get auth token"""
    print("\n1. Creating admin user and logging in...")

    # First, try to login with existing admin
    login_data = {
        "username": "admin_test",
        "password": "admin123"
    }

    # Use form data for login
    response = requests.post(f"{API_BASE_URL}/api/login", data=login_data)

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Logged in as existing admin user")
        return data['access_token']

    # If login failed, create new admin
    print("Creating new admin user...")

    # Register new admin user
    register_data = {
        "username": "admin_test",
        "email": "admin_test@astegni.com",
        "password": "admin123",
        "first_name": "Admin",
        "father_name": "Test",
        "grandfather_name": "User"
    }

    response = requests.post(f"{API_BASE_URL}/api/register", json=register_data)

    if response.status_code != 200:
        print(f"⚠️  Registration failed (user might exist): {response.json().get('detail', response.text)}")
        # Try to login anyway
        print("Attempting to login with existing user...")
        response = requests.post(f"{API_BASE_URL}/api/login", data=login_data)

    if response.status_code != 200:
        print(f"❌ Failed to login: {response.text}")
        return None

    data = response.json()
    token = data['access_token']
    user_id = data['user']['id']

    # Add admin role via direct database update
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # Update user roles to include admin
            conn.execute(text("""
                UPDATE users
                SET roles = '["admin", "tutor"]'::jsonb
                WHERE id = :user_id
            """), {"user_id": user_id})
            trans.commit()
            print(f"✅ Admin role added to user")
        except Exception as e:
            trans.rollback()
            print(f"⚠️ Error adding admin role: {e}")

    return token

def create_sample_tutors(token):
    """Create sample tutors with different verification statuses"""
    print("\n2. Creating sample tutors with different statuses...")

    headers = {"Authorization": f"Bearer {token}"}

    # Sample Ethiopian names and data
    sample_tutors = [
        {
            "name": "Abebe Tadesse",
            "status": "pending",
            "courses": ["Mathematics", "Physics"],
            "location": "Addis Ababa"
        },
        {
            "name": "Marta Bekele",
            "status": "pending",
            "courses": ["English", "Biology"],
            "location": "Bahir Dar"
        },
        {
            "name": "Solomon Haile",
            "status": "rejected",
            "courses": ["Chemistry", "Mathematics"],
            "location": "Hawassa",
            "rejection_reason": "Incomplete documentation"
        },
        {
            "name": "Tigist Mengistu",
            "status": "suspended",
            "courses": ["History", "Geography"],
            "location": "Mekelle",
            "suspension_reason": "Policy violation"
        }
    ]

    # Direct database insertion for tutor profiles
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            for tutor in sample_tutors:
                # First create a user
                result = conn.execute(text("""
                    INSERT INTO users (username, email, password, first_name, father_name, roles, created_at)
                    VALUES (:username, :email, :password, :first_name, :father_name, :roles, :created_at)
                    ON CONFLICT (username) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
                    RETURNING id
                """), {
                    "username": tutor['name'].replace(" ", "_").lower(),
                    "email": f"{tutor['name'].replace(' ', '.').lower()}@example.com",
                    "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lcy0pMWqKM8s0xCeK",  # hashed "password"
                    "first_name": tutor['name'].split()[0],
                    "father_name": tutor['name'].split()[1],
                    "roles": '["tutor"]',
                    "created_at": datetime.utcnow()
                })

                user_id = result.fetchone()[0]

                # Create tutor profile
                conn.execute(text("""
                    INSERT INTO tutor_profiles (
                        user_id, teaches_at, location, courses,
                        verification_status, rejection_reason, suspension_reason,
                        languages, experience, education_level, rating,
                        created_at, updated_at
                    )
                    VALUES (
                        :user_id, :teaches_at, :location, :courses,
                        :status, :rejection_reason, :suspension_reason,
                        :languages, :experience, :education_level, :rating,
                        :created_at, :updated_at
                    )
                    ON CONFLICT (user_id) DO UPDATE SET
                        verification_status = :status,
                        rejection_reason = :rejection_reason,
                        suspension_reason = :suspension_reason,
                        updated_at = :updated_at
                """), {
                    "user_id": user_id,
                    "teaches_at": f"{tutor['location']} University",
                    "location": tutor['location'],
                    "courses": json.dumps(tutor['courses']),
                    "status": tutor['status'],
                    "rejection_reason": tutor.get('rejection_reason'),
                    "suspension_reason": tutor.get('suspension_reason'),
                    "languages": json.dumps(["English", "Amharic"]),
                    "experience": f"{random.randint(1, 10)} years",
                    "education_level": "Master's Degree",
                    "rating": round(random.uniform(3.5, 5.0), 1),
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                })

                print(f"✅ Created tutor: {tutor['name']} with status: {tutor['status']}")

            trans.commit()
        except Exception as e:
            trans.rollback()
            print(f"❌ Error creating sample tutors: {e}")

def test_endpoints(token):
    """Test all tutor management endpoints"""
    print("\n3. Testing tutor management endpoints...")

    headers = {"Authorization": f"Bearer {token}"}

    endpoints = [
        ("Statistics", "GET", "/api/admin/tutors/statistics"),
        ("Pending Tutors", "GET", "/api/admin/tutors/pending"),
        ("Verified Tutors", "GET", "/api/admin/tutors/verified"),
        ("Rejected Tutors", "GET", "/api/admin/tutors/rejected"),
        ("Suspended Tutors", "GET", "/api/admin/tutors/suspended"),
        ("Recent Activity", "GET", "/api/admin/tutors/recent-activity")
    ]

    for name, method, endpoint in endpoints:
        try:
            response = requests.request(method, f"{API_BASE_URL}{endpoint}", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if 'tutors' in data:
                    count = len(data['tutors'])
                    print(f"✅ {name}: {count} tutors")
                    # Show first tutor if exists
                    if count > 0 and 'tutors' in data:
                        first_tutor = data['tutors'][0]
                        print(f"   - Example: {first_tutor.get('name', 'Unknown')} - Status: {first_tutor.get('verification_status', 'N/A')}")
                elif 'activities' in data:
                    count = len(data['activities'])
                    print(f"✅ {name}: {count} activities")
                else:
                    # Statistics endpoint
                    print(f"✅ {name}:")
                    print(f"   - Pending: {data.get('pending', 0)}")
                    print(f"   - Verified: {data.get('verified', 0)}")
                    print(f"   - Rejected: {data.get('rejected', 0)}")
                    print(f"   - Suspended: {data.get('suspended', 0)}")
            else:
                print(f"❌ {name}: Status {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ {name}: Error - {e}")

def verify_database_data():
    """Verify data in tutor_profiles table"""
    print("\n4. Verifying database data...")

    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Count by verification_status
        result = conn.execute(text("""
            SELECT verification_status, COUNT(*) as count
            FROM tutor_profiles
            GROUP BY verification_status
            ORDER BY verification_status
        """))

        print("📊 Tutor profiles by verification_status:")
        for row in result:
            status = row[0] if row[0] else 'NULL'
            print(f"   - {status}: {row[1]} tutors")

        # Show some sample data
        result = conn.execute(text("""
            SELECT tp.id, u.first_name, u.father_name, tp.verification_status, tp.location
            FROM tutor_profiles tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.verification_status != 'verified' OR tp.verification_status IS NULL
            ORDER BY tp.verification_status, tp.created_at DESC
            LIMIT 5
        """))

        print("\n📋 Sample non-verified tutors:")
        for row in result:
            name = f"{row[1]} {row[2]}" if row[1] and row[2] else f"Tutor #{row[0]}"
            print(f"   - {name}: {row[3]} ({row[4]})")

def test_status_changes(token):
    """Test changing tutor statuses"""
    print("\n5. Testing status change operations...")

    headers = {"Authorization": f"Bearer {token}"}

    # Get a pending tutor
    response = requests.get(f"{API_BASE_URL}/api/admin/tutors/pending", headers=headers)
    if response.status_code == 200:
        data = response.json()
        if data['tutors']:
            tutor_id = data['tutors'][0]['id']
            tutor_name = data['tutors'][0]['name']

            # Test approve
            print(f"   Testing approve for {tutor_name}...")
            response = requests.post(f"{API_BASE_URL}/api/admin/tutor/{tutor_id}/verify", headers=headers)
            if response.status_code == 200:
                print(f"   ✅ Successfully approved tutor")
            else:
                print(f"   ❌ Failed to approve: {response.text}")

def main():
    print("=" * 60)
    print("TUTOR PROFILES INTEGRATION TEST")
    print("=" * 60)

    # Check if backend is running
    try:
        response = requests.get(f"{API_BASE_URL}/docs")
        if response.status_code != 200:
            print("❌ Backend server is not running on http://localhost:8000")
            print("   Please start it with: cd astegni-backend && python app.py")
            return
    except:
        print("❌ Cannot connect to backend server at http://localhost:8000")
        print("   Please start it with: cd astegni-backend && python app.py")
        return

    # Run tests
    token = create_admin_and_login()
    if not token:
        print("❌ Failed to get auth token")
        return

    create_sample_tutors(token)
    verify_database_data()
    test_endpoints(token)
    test_status_changes(token)

    print("\n" + "=" * 60)
    print("TEST COMPLETE!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Open http://localhost:8080/admin-pages/manage-tutors.html")
    print("2. Login with: username=admin_test, password=admin123")
    print("3. You should see tutors with different statuses in each panel")
    print("4. Try suspend/reinstate/reconsider actions on the tutors")

if __name__ == "__main__":
    main()