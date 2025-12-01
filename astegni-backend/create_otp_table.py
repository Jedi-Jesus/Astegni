"""
Create OTP table for add-role functionality
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from models import Base, engine, OTP
from sqlalchemy import inspect

def create_otp_table():
    """Create OTP table if it doesn't exist"""

    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    if 'otps' in existing_tables:
        print("OTP table already exists")
        return

    print("Creating OTP table...")

    # Create only the OTP table
    OTP.__table__.create(engine)

    print("OTP table created successfully")

if __name__ == "__main__":
    create_otp_table()
