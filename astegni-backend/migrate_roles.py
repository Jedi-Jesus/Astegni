import psycopg
from dotenv import load_dotenv
import os
import json

load_dotenv('.env')

conn_string = f"host={os.getenv('DB_HOST')} dbname={os.getenv('DB_NAME')} user={os.getenv('DB_USER')} password={os.getenv('DB_PASSWORD')}"
conn = psycopg.connect(conn_string)
cursor = conn.cursor()

print("Starting migration...")

# Add all new columns
cursor.execute("""
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS roles JSON DEFAULT '[]'::json,
    ADD COLUMN IF NOT EXISTS active_role VARCHAR(50),
    ADD COLUMN IF NOT EXISTS profile_picture TEXT,
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
""")
print("✅ Added roles, active_role, profile_picture, last_login, and email_verified columns")

# Check if 'role' column exists (from old schema)
cursor.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='users' AND column_name='role';
""")
has_role_column = cursor.fetchone() is not None

if has_role_column:
    # Migrate existing single roles to array
    cursor.execute("""
        UPDATE users 
        SET roles = json_build_array(role),
            active_role = role
        WHERE (roles::text = '[]' OR roles IS NULL) AND role IS NOT NULL;
    """)
    print("✅ Migrated existing roles to new format")
else:
    print("ℹ️  No 'role' column found - using new schema")

# Set default avatars based on roles for existing users without profile pictures
cursor.execute("""
    UPDATE users 
    SET profile_picture = CASE 
        WHEN active_role = 'student' THEN 'https://ui-avatars.com/api/?name=Student&background=10b981&color=fff'
        WHEN active_role = 'tutor' THEN 'https://ui-avatars.com/api/?name=Tutor&background=f59e0b&color=fff'
        WHEN active_role = 'guardian' THEN 'https://ui-avatars.com/api/?name=Parent&background=ef4444&color=fff'
        WHEN active_role = 'bookstore' THEN 'https://ui-avatars.com/api/?name=Bookstore&background=8b5cf6&color=fff'
        WHEN active_role = 'delivery' THEN 'https://ui-avatars.com/api/?name=Delivery&background=06b6d4&color=fff'
        WHEN active_role = 'advertiser' THEN 'https://ui-avatars.com/api/?name=Advertiser&background=ec4899&color=fff'
        WHEN active_role = 'author' THEN 'https://ui-avatars.com/api/?name=Author&background=6366f1&color=fff'
        WHEN active_role = 'church' THEN 'https://ui-avatars.com/api/?name=Church&background=a855f7&color=fff'
        ELSE 'https://ui-avatars.com/api/?name=User&background=6366f1&color=fff'
    END
    WHERE profile_picture IS NULL;
""")
print("✅ Set default avatars for existing users")

# Drop old constraint if exists
cursor.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS _email_role_uc;")
cursor.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS email_role_unique;")

# Add unique constraint on email
cursor.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;")
cursor.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;")
cursor.execute("ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);")
print("✅ Updated email uniqueness constraint")

# Drop the old 'role' column if it exists
if has_role_column:
    cursor.execute("ALTER TABLE users DROP COLUMN IF EXISTS role;")
    print("✅ Dropped old 'role' column")

conn.commit()
print("\n🎉 Migration complete!")

# Show current users with their new schema
cursor.execute("""
    SELECT email, roles, active_role, profile_picture 
    FROM users 
    LIMIT 5
""")
users = cursor.fetchall()

if users:
    print("\n📊 Sample users after migration:")
    for user in users:
        profile_pic_preview = user[3][:50] + '...' if user[3] and len(user[3]) > 50 else user[3]
        print(f"  📧 {user[0]}")
        print(f"     Roles: {user[1]}")
        print(f"     Active: {user[2]}")
        print(f"     Avatar: {profile_pic_preview}")
        print()

# Show schema info
cursor.execute("""
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name IN ('roles', 'active_role', 'profile_picture', 'last_login', 'email_verified')
    ORDER BY ordinal_position;
""")
schema_info = cursor.fetchall()

print("📋 Updated schema for users table:")
for col in schema_info:
    nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
    print(f"  - {col[0]}: {col[1]} ({nullable})")

conn.close()