"""
Test script to verify switch-role endpoint actually updates the database
"""

import requests
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL

# Setup database connection
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

API_BASE_URL = 'http://localhost:8000'

def check_user_role_in_db(user_id):
    """Check what role is stored in the database"""
    db = SessionLocal()
    try:
        result = db.execute(
            text("SELECT id, active_role, roles FROM users WHERE id = :user_id"),
            {"user_id": user_id}
        ).first()

        if result:
            print(f"\n📊 Database State for User {user_id}:")
            print(f"  - active_role: {result.active_role}")
            print(f"  - roles: {result.roles}")
            return result.active_role, result.roles
        else:
            print(f"❌ User {user_id} not found in database")
            return None, None
    finally:
        db.close()

def test_switch_role(token, target_role):
    """Test switching to a role"""
    print(f"\n{'='*60}")
    print(f"🧪 Testing Role Switch to: {target_role}")
    print(f"{'='*60}")

    # Get user ID from token
    import jwt
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        current_role_from_token = payload.get("role")
        print(f"\n🔍 Current JWT Token Info:")
        print(f"  - User ID: {user_id}")
        print(f"  - Role in token: {current_role_from_token}")
    except Exception as e:
        print(f"❌ Failed to decode token: {e}")
        return

    # Check database BEFORE switch
    print(f"\n1️⃣ BEFORE Switch:")
    db_role_before, db_roles_before = check_user_role_in_db(user_id)

    # Call switch-role API
    print(f"\n2️⃣ Calling /api/switch-role...")
    response = requests.post(
        f"{API_BASE_URL}/api/switch-role",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={"role": target_role}
    )

    if response.status_code != 200:
        print(f"❌ API Error {response.status_code}: {response.text}")
        return

    data = response.json()
    print(f"✅ API Response:")
    print(f"  - active_role: {data.get('active_role')}")
    print(f"  - user_roles: {data.get('user_roles')}")
    print(f"  - New token provided: {bool(data.get('access_token'))}")

    # Check database AFTER switch
    print(f"\n3️⃣ AFTER Switch:")
    db_role_after, db_roles_after = check_user_role_in_db(user_id)

    # Verify the change
    print(f"\n4️⃣ Verification:")
    if db_role_after == target_role:
        print(f"✅ SUCCESS! Database updated to: {db_role_after}")
    else:
        print(f"❌ FAILURE! Database still shows: {db_role_after} (expected: {target_role})")
        print(f"\n🔍 Debugging Info:")
        print(f"  - API says active_role: {data.get('active_role')}")
        print(f"  - Database shows active_role: {db_role_after}")
        print(f"  - Database BEFORE: {db_role_before}")
        print(f"  - Database AFTER: {db_role_after}")

        if db_role_before == db_role_after:
            print(f"\n⚠️ DATABASE WAS NOT UPDATED!")
            print(f"  This indicates the db.commit() in switch-role endpoint failed or didn't happen.")

    # Return new token for next test
    return data.get('access_token')

def main():
    """Run the test"""
    print("="*60)
    print("🔬 Switch Role Database Update Test")
    print("="*60)

    # Get login credentials
    print("\n📝 Step 1: Login to get token")
    email = input("Enter email (default: jediael.s.abebe@gmail.com): ").strip()
    if not email:
        email = "jediael.s.abebe@gmail.com"

    password = input("Enter password: ").strip()
    if not password:
        password = "@JesusJediael1234"

    # Login
    login_response = requests.post(
        f"{API_BASE_URL}/api/login",
        json={"email": email, "password": password}
    )

    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.text}")
        return

    login_data = login_response.json()
    token = login_data.get("access_token")
    print(f"✅ Login successful!")
    print(f"  - Current role: {login_data.get('role')}")
    print(f"  - Available roles: {login_data.get('user', {}).get('roles')}")

    # Ask which role to switch to
    available_roles = login_data.get('user', {}).get('roles', [])
    current_role = login_data.get('role')

    print(f"\n📝 Step 2: Select target role")
    print(f"  Current role: {current_role}")
    print(f"  Available roles: {', '.join(available_roles)}")

    target_role = input(f"Enter role to switch to (e.g., tutor, student, parent): ").strip()

    if not target_role:
        print("❌ No role specified")
        return

    if target_role not in available_roles:
        print(f"❌ Role '{target_role}' not available for this user")
        return

    # Run the test
    new_token = test_switch_role(token, target_role)

    # Optional: Test switching back
    if new_token:
        print(f"\n\n{'='*60}")
        switch_back = input(f"\nTest switching back to {current_role}? (y/n): ").strip().lower()
        if switch_back == 'y':
            test_switch_role(new_token, current_role)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
