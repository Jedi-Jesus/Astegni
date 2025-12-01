"""
Analyze which fields should be in admin_profile vs admin_profile_stats
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

# Get admin_profile columns
cur.execute("""
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'admin_profile'
    AND column_name NOT IN ('id', 'admin_id', 'created_at', 'updated_at')
    ORDER BY ordinal_position
""")
profile_cols = [row[0] for row in cur.fetchall()]

# Get admin_profile_stats columns
cur.execute("""
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'admin_profile_stats'
    AND column_name NOT IN ('id', 'admin_id', 'created_at', 'updated_at')
    ORDER BY ordinal_position
""")
stats_cols = [row[0] for row in cur.fetchall()]

print("=" * 80)
print("FIELD CATEGORIZATION ANALYSIS")
print("=" * 80)

# Profile fields (basic identity info)
profile_fields = [
    'first_name', 'father_name', 'grandfather_name', 'admin_username',
    'email', 'phone_number', 'password_hash',
    'profile_picture_url', 'cover_picture_url', 'profile_picture', 'cover_picture',
    'bio', 'quote', 'department', 'position', 'location'
]

# Stats fields (tracking, permissions, status)
stats_fields = [
    'role', 'permissions', 'status', 'suspended_until', 'suspension_reason',
    'requires_password_change', 'last_login',
    'social_links', 'contact_info', 'settings',
    'employee_id', 'access_level', 'responsibilities'
]

print("\nFIELDS THAT SHOULD BE IN admin_profile (Basic Identity):")
print("-" * 80)
for field in profile_fields:
    in_profile = "[OK]" if field in profile_cols else "[MISSING]"
    print(f"  {in_profile} {field}")

print("\nFIELDS THAT SHOULD BE IN admin_profile_stats (Stats/Tracking):")
print("-" * 80)
for field in stats_fields:
    in_stats = "[OK]" if field in stats_cols else "[MISSING]"
    in_profile = "(currently in admin_profile)" if field in profile_cols else ""
    print(f"  {in_stats} {field} {in_profile}")

print("\n" + "=" * 80)
print("RECOMMENDATION:")
print("=" * 80)
print("Move these fields FROM admin_profile TO admin_profile_stats:")
print("-" * 80)

fields_to_move = []
for field in stats_fields:
    if field in profile_cols and field not in stats_cols:
        fields_to_move.append(field)
        print(f"  - {field}")

if not fields_to_move:
    print("  (All fields are already in the correct tables)")

print("\n")

cur.close()
conn.close()
