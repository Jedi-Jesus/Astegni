"""
Seed sample school data for testing the school management system
"""

import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

# Import models from the app.py modules directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app.py modules'))
from models import RequestedSchool, School, RejectedSchool, SuspendedSchool

# Get database URL
database_url = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
if database_url.startswith('postgresql://'):
    database_url = database_url.replace('postgresql://', 'postgresql+psycopg://')

# Create engine and session
engine = create_engine(database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_schools():
    """Seed sample school data"""
    db = SessionLocal()

    try:
        print("Seeding school data...")

        # Sample Requested Schools
        requested_schools = [
            {
                "school_name": "Unity International School",
                "school_type": "International",
                "school_level": "Elementary",
                "location": "Hawassa",
                "email": "admin@unityschool.edu.et",
                "phone": "+251 92 345 6789",
                "students_count": 450,
                "documents": [
                    {"name": "School_License_Unity.pdf", "size": "3.2 MB", "uploadDate": "Jan 5, 2025", "url": "/uploads/schools/unity_license.pdf"},
                    {"name": "Tax_Clearance.pdf", "size": "1.1 MB", "uploadDate": "Jan 5, 2025", "url": "/uploads/schools/unity_tax.pdf"},
                    {"name": "Building_Permit.pdf", "size": "2.7 MB", "uploadDate": "Jan 5, 2025", "url": "/uploads/schools/unity_permit.pdf"}
                ],
                "status": "Pending"
            },
            {
                "school_name": "Horizon Academy",
                "school_type": "Private",
                "school_level": "High School",
                "location": "Mekelle",
                "email": "info@horizonacademy.edu.et",
                "phone": "+251 93 456 7890",
                "students_count": 680,
                "documents": [
                    {"name": "School_License.pdf", "size": "2.8 MB", "uploadDate": "Jan 6, 2025", "url": "/uploads/schools/horizon_license.pdf"},
                    {"name": "Registration_Cert.pdf", "size": "1.5 MB", "uploadDate": "Jan 6, 2025", "url": "/uploads/schools/horizon_cert.pdf"}
                ],
                "status": "Pending"
            }
        ]

        for school_data in requested_schools:
            school = RequestedSchool(**school_data)
            db.add(school)

        # Sample Verified Schools
        verified_schools = [
            {
                "school_name": "Addis Ababa Academy",
                "school_type": "Private",
                "school_level": "High School",
                "location": "Addis Ababa, Bole",
                "email": "info@addisacademy.edu.et",
                "phone": "+251 91 234 5678",
                "students_count": 1250,
                "rating": 4.8,
                "established_year": 2010,
                "principal": "Dr. Abebe Kebede",
                "documents": [
                    {"name": "School License.pdf", "size": "2.5 MB", "uploadDate": "Dec 15, 2024", "url": "/uploads/schools/addis_license.pdf"},
                    {"name": "Registration Certificate.pdf", "size": "1.8 MB", "uploadDate": "Dec 15, 2024", "url": "/uploads/schools/addis_cert.pdf"}
                ],
                "status": "Verified"
            },
            {
                "school_name": "Bethel International School",
                "school_type": "International",
                "school_level": "Elementary",
                "location": "Addis Ababa, Bole",
                "email": "contact@bethelschool.edu.et",
                "phone": "+251 91 765 4321",
                "students_count": 890,
                "rating": 4.6,
                "established_year": 2015,
                "principal": "Mrs. Sara Tesfaye",
                "documents": [
                    {"name": "School_License.pdf", "size": "2.1 MB", "uploadDate": "Nov 10, 2024", "url": "/uploads/schools/bethel_license.pdf"}
                ],
                "status": "Verified"
            }
        ]

        for school_data in verified_schools:
            school = School(**school_data)
            db.add(school)

        # Sample Rejected Schools
        rejected_schools = [
            {
                "school_name": "Excellence Academy",
                "school_type": "Private",
                "school_level": "Elementary",
                "location": "Dire Dawa",
                "email": "contact@excellence.edu.et",
                "phone": "+251 93 456 7890",
                "students_count": 0,
                "documents": [
                    {"name": "Partial_License.pdf", "size": "1.5 MB", "uploadDate": "Jan 3, 2025", "url": "/uploads/schools/excellence_partial.pdf"}
                ],
                "rejection_reason": "Incomplete Documentation - Missing building permit and tax clearance certificates",
                "rejected_date": datetime(2025, 1, 5),
                "status": "Rejected"
            }
        ]

        for school_data in rejected_schools:
            school = RejectedSchool(**school_data)
            db.add(school)

        # Sample Suspended Schools
        suspended_schools = [
            {
                "school_name": "Bright Future School",
                "school_type": "Private",
                "school_level": "High School",
                "location": "Bahir Dar",
                "email": "info@brightfuture.edu.et",
                "phone": "+251 94 567 8901",
                "students_count": 780,
                "rating": 3.2,
                "established_year": 2018,
                "principal": "Mr. Getachew Alemu",
                "documents": [
                    {"name": "School_License_BF.pdf", "size": "2.1 MB", "uploadDate": "Nov 10, 2024", "url": "/uploads/schools/bright_license.pdf"},
                    {"name": "Registration_Cert.pdf", "size": "1.9 MB", "uploadDate": "Nov 10, 2024", "url": "/uploads/schools/bright_cert.pdf"}
                ],
                "suspension_reason": "Multiple complaints regarding teaching standards and safety violations. Under investigation.",
                "suspended_date": datetime(2024, 12, 20),
                "status": "Suspended"
            }
        ]

        for school_data in suspended_schools:
            school = SuspendedSchool(**school_data)
            db.add(school)

        # Commit all changes
        db.commit()

        print(f"- {len(requested_schools)} requested schools added")
        print(f"- {len(verified_schools)} verified schools added")
        print(f"- {len(rejected_schools)} rejected schools added")
        print(f"- {len(suspended_schools)} suspended schools added")
        print("\nSchool data seeded successfully!")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_schools()
