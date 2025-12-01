#!/usr/bin/env python3
"""
Add manage-schools department to admin
"""
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

def add_manage_schools_department(admin_email):
    """Add manage-schools department to specified admin"""

    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Get current admin
        result = session.execute(
            text("SELECT id, email, departments FROM admin_profile WHERE email = :email"),
            {"email": admin_email}
        ).fetchone()

        if not result:
            print(f"[X] Admin with email '{admin_email}' not found")
            return

        admin_id, email, departments = result
        print(f"[OK] Found admin: {email} (ID: {admin_id})")
        print(f"  Current departments: {departments}")

        # Add manage-schools if not present
        if departments is None:
            departments = []

        if "manage-schools" not in departments:
            departments.append("manage-schools")

            # Update the admin
            session.execute(
                text("UPDATE admin_profile SET departments = :departments WHERE id = :admin_id"),
                {"departments": departments, "admin_id": admin_id}
            )
            session.commit()

            print(f"[OK] Updated departments: {departments}")
            print(f"[OK] Successfully added 'manage-schools' department to {email}")
        else:
            print(f"[i] Admin already has 'manage-schools' department")

    except Exception as e:
        print(f"[X] Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    # Use the email from the token
    admin_email = "jediael.s.abebe@gmail.com"

    if len(sys.argv) > 1:
        admin_email = sys.argv[1]

    print(f"Adding 'manage-schools' department to: {admin_email}\n")
    add_manage_schools_department(admin_email)
