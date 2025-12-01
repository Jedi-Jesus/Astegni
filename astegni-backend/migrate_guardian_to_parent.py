"""
Migration script to rename 'guardian' role to 'parent' in the database.
This updates both the roles JSON array and active_role field in the users table.
"""

import sys
import os

# Add the modules directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL
import json

def migrate_guardian_to_parent():
    """Update all 'guardian' role references to 'parent' in the users table"""

    print("=" * 60)
    print("MIGRATION: Rename 'guardian' role to 'parent'")
    print("=" * 60)

    # Create database connection
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # First, check how many users have 'guardian' in their roles
        check_query = text("""
            SELECT id, first_name, father_name, roles, active_role
            FROM users
            WHERE roles::text LIKE '%guardian%' OR active_role = 'guardian'
        """)

        users_to_update = db.execute(check_query).fetchall()

        if not users_to_update:
            print("\n✓ No users found with 'guardian' role. Migration not needed.")
            return

        print(f"\n📊 Found {len(users_to_update)} user(s) with 'guardian' role:")
        for user in users_to_update:
            print(f"   - User ID {user[0]}: {user[1]} {user[2]}")
            print(f"     Roles: {user[3]}")
            print(f"     Active Role: {user[4]}")

        # Ask for confirmation
        print("\n⚠️  This will update all 'guardian' references to 'parent'")
        response = input("Proceed with migration? (yes/no): ").lower().strip()

        if response != 'yes':
            print("\n❌ Migration cancelled by user.")
            return

        # Update active_role from 'guardian' to 'parent'
        print("\n🔄 Updating active_role field...")
        update_active_role = text("""
            UPDATE users
            SET active_role = 'parent'
            WHERE active_role = 'guardian'
        """)
        result = db.execute(update_active_role)
        print(f"   ✓ Updated {result.rowcount} user(s) active_role")

        # Update roles JSON array
        # PostgreSQL approach: use jsonb_replace for JSON manipulation
        print("\n🔄 Updating roles JSON array...")

        # Get all users with guardian in roles
        select_users = text("""
            SELECT id, roles FROM users
            WHERE roles::text LIKE '%guardian%'
        """)
        users_with_guardian = db.execute(select_users).fetchall()

        updated_count = 0
        for user_id, roles_json in users_with_guardian:
            # Parse JSON, replace 'guardian' with 'parent', update
            roles = json.loads(roles_json) if isinstance(roles_json, str) else roles_json
            if 'guardian' in roles:
                roles = ['parent' if role == 'guardian' else role for role in roles]
                update_roles = text("""
                    UPDATE users
                    SET roles = :roles
                    WHERE id = :user_id
                """)
                db.execute(update_roles, {"roles": json.dumps(roles), "user_id": user_id})
                updated_count += 1

        print(f"   ✓ Updated {updated_count} user(s) roles array")

        # Commit the changes
        db.commit()

        # Verify the changes
        print("\n🔍 Verifying migration...")
        verify_query = text("""
            SELECT COUNT(*) FROM users
            WHERE roles::text LIKE '%guardian%' OR active_role = 'guardian'
        """)
        remaining = db.execute(verify_query).scalar()

        if remaining == 0:
            print("   ✓ Migration successful! No 'guardian' references remaining.")
        else:
            print(f"   ⚠️  Warning: {remaining} user(s) still have 'guardian' references.")

        # Show updated users
        print("\n📊 Updated users:")
        updated_users_query = text("""
            SELECT id, first_name, father_name, roles, active_role
            FROM users
            WHERE roles::text LIKE '%parent%' OR active_role = 'parent'
        """)
        updated_users = db.execute(updated_users_query).fetchall()

        for user in updated_users:
            print(f"   - User ID {user[0]}: {user[1]} {user[2]}")
            print(f"     Roles: {user[3]}")
            print(f"     Active Role: {user[4]}")

        print("\n" + "=" * 60)
        print("✅ MIGRATION COMPLETE")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        db.rollback()
        raise

    finally:
        db.close()

if __name__ == "__main__":
    migrate_guardian_to_parent()
