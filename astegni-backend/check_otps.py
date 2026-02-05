"""
Quick script to check OTP records in database
"""
import psycopg
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
conn = psycopg.connect(DATABASE_URL)
cursor = conn.cursor()

print("\n=== All OTP Records ===")
cursor.execute("""
    SELECT id, user_id, otp_code, purpose, expires_at, is_used, created_at
    FROM otps
    ORDER BY created_at DESC
    LIMIT 10
""")

rows = cursor.fetchall()
if not rows:
    print("No OTP records found")
else:
    for row in rows:
        print(f"\nID: {row[0]}")
        print(f"User ID: {row[1]}")
        print(f"OTP Code: {row[2]}")
        print(f"Purpose: {row[3]}")
        print(f"Expires At: {row[4]}")
        print(f"Is Used: {row[5]}")
        print(f"Created At: {row[6]}")
        print(f"Expired: {datetime.now() > row[4] if row[4] else 'N/A'}")

print("\n=== Account Deletion OTPs (unused) ===")
cursor.execute("""
    SELECT id, user_id, otp_code, expires_at, is_used, created_at
    FROM otps
    WHERE purpose = 'account_deletion' AND is_used = FALSE
    ORDER BY created_at DESC
""")

rows = cursor.fetchall()
if not rows:
    print("No unused account deletion OTPs found")
else:
    for row in rows:
        print(f"\nID: {row[0]}, User ID: {row[1]}, OTP: {row[2]}")
        print(f"Created: {row[5]}, Expires: {row[3]}")
        print(f"Is Expired: {datetime.now() > row[3]}")

cursor.close()
conn.close()
