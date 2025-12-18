"""Fix JSON data in admin tables - the tables exist but some data with JSON fields failed"""
import psycopg
from psycopg.rows import dict_row
import json

USER_DB_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"
ADMIN_DB_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db"

print("Checking admin_db tables...")

admin_conn = psycopg.connect(ADMIN_DB_URL, row_factory=dict_row)
admin_cur = admin_conn.cursor()

# Check row counts
tables = [
    'admin_credentials',
    'admin_profile',
    'admin_profile_stats',
    'admin_reviews',
    'manage_campaigns_profile',
    'manage_contents_profile',
    'manage_courses_profile',
    'manage_customers_profile',
    'manage_schools_profile',
    'manage_system_settings_profile',
    'manage_tutors_profile',
    'manage_uploads',
]

print("\nRow counts in admin_db:")
for table in tables:
    admin_cur.execute(f"SELECT COUNT(*) as count FROM {table}")
    count = admin_cur.fetchone()['count']
    print(f"   {table}: {count} rows")

admin_cur.close()
admin_conn.close()
print("\nDone!")
