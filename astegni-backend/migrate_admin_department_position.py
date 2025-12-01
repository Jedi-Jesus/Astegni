"""
Migration: Replace role/permissions with department/position in admin_profiles table
Also add Ethiopian name fields and remove username
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")

    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")

    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_full = host_db.split("/")

    if "?" in db_full:
        db_name = db_full.split("?")[0]
    else:
        db_name = db_full

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    return psycopg.connect(
        dbname=db_name,
        user=user,
        password=password,
        host=host,
        port=port
    )

def migrate():
    """Run migration"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        print("Starting migration: admin_profiles department/position update...")

        # Check if columns already exist
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'admin_profiles'
            AND column_name IN ('department', 'position', 'first_name', 'father_name')
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]

        if 'department' in existing_columns:
            print("Migration already applied. Skipping...")
            return

        # Step 1: Add new columns
        print("Adding new columns...")
        cursor.execute("""
            ALTER TABLE admin_profiles
            ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
            ADD COLUMN IF NOT EXISTS father_name VARCHAR(100),
            ADD COLUMN IF NOT EXISTS grandfather_name VARCHAR(100),
            ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
            ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE,
            ADD COLUMN IF NOT EXISTS department VARCHAR(100),
            ADD COLUMN IF NOT EXISTS position VARCHAR(100);
        """)

        # Step 2: Migrate existing data
        print("Migrating existing data...")

        # Get all existing admins
        cursor.execute("SELECT id, name, role FROM admin_profiles WHERE name IS NOT NULL")
        admins = cursor.fetchall()

        for admin_id, name, role in admins:
            # Split name into Ethiopian name components
            name_parts = name.split(' ') if name else ['', '']
            first_name = name_parts[0] if len(name_parts) > 0 else ''
            father_name = name_parts[1] if len(name_parts) > 1 else ''
            grandfather_name = name_parts[2] if len(name_parts) > 2 else ''

            # Map old role to new department
            department_map = {
                'admin': 'manage-system-settings',
                'moderator': 'manage-contents',
                'support': 'manage-customers',
                'content': 'manage-contents'
            }
            department = department_map.get(role, 'manage-system-settings')

            # Set default position
            position = 'Administrator' if role == 'admin' else 'Manager'

            # Generate employee_id
            dept_code = department.replace('manage-', '').replace('-', '')[:4].upper()
            employee_id = f"ASTEG-{dept_code}-{str(admin_id).zfill(4)}"

            # Update admin record
            cursor.execute("""
                UPDATE admin_profiles
                SET first_name = %s,
                    father_name = %s,
                    grandfather_name = %s,
                    department = %s,
                    position = %s,
                    employee_id = %s
                WHERE id = %s
            """, (first_name, father_name, grandfather_name, department, position, employee_id, admin_id))

            print(f"  Migrated admin {admin_id}: {name} -> {first_name} {father_name}, dept: {department}")

        # Step 3: Make new columns NOT NULL after data migration
        print("Setting NOT NULL constraints...")
        cursor.execute("""
            ALTER TABLE admin_profiles
            ALTER COLUMN first_name SET NOT NULL,
            ALTER COLUMN father_name SET NOT NULL,
            ALTER COLUMN department SET NOT NULL,
            ALTER COLUMN position SET NOT NULL;
        """)

        # Step 4: Drop old columns (optional - keep for now for safety)
        print("Keeping old columns (role, permissions, name) for safety...")
        # Uncomment to drop:
        # cursor.execute("""
        #     ALTER TABLE admin_profiles
        #     DROP COLUMN IF EXISTS role,
        #     DROP COLUMN IF EXISTS permissions,
        #     DROP COLUMN IF EXISTS name,
        #     DROP COLUMN IF EXISTS admin_username;
        # """)

        conn.commit()
        print("✓ Migration completed successfully!")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"✗ Migration failed: {e}")
        raise
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    migrate()
