"""
Test Tutor Profile Extensions Endpoints
Quick test to verify the new endpoints are working
"""

import os
from dotenv import load_dotenv

load_dotenv()

def test_import():
    """Test that the module imports correctly"""
    try:
        from tutor_profile_extensions_endpoints import router
        print("✅ SUCCESS: Module imported correctly")
        print(f"✅ Router has {len(router.routes)} routes")

        # List all routes
        print("\nRegistered routes:")
        for route in router.routes:
            print(f"  - {route.methods} {route.path}")

        return True
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_database_tables():
    """Test that the required tables exist"""
    import psycopg

    try:
        conn = psycopg.connect(os.getenv("DATABASE_URL"))
        cur = conn.cursor()

        tables = ['tutor_certificates', 'tutor_achievements', 'tutor_experience']

        for table in tables:
            cur.execute(f"""
                SELECT COUNT(*) FROM information_schema.tables
                WHERE table_name = '{table}'
            """)
            exists = cur.fetchone()[0] > 0

            if exists:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                print(f"✅ Table '{table}' exists ({count} rows)")
            else:
                print(f"❌ Table '{table}' does NOT exist")

        conn.close()
        return True
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    print("Testing Tutor Profile Extensions...")
    print("=" * 50)

    print("\n1. Testing Module Import:")
    test_import()

    print("\n2. Testing Database Tables:")
    test_database_tables()

    print("\n" + "=" * 50)
    print("Test complete! If all checks passed, the endpoints are ready to use.")
    print("\nNext steps:")
    print("1. Make sure backend server is running (python app.py)")
    print("2. Visit http://localhost:8000/docs to see endpoints")
    print("3. Test in UI at http://localhost:8080/profile-pages/tutor-profile.html")
