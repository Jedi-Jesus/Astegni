"""Final verification that everything is working"""

print("=" * 60)
print("FINAL VERIFICATION - Schedule & Sessions Implementation")
print("=" * 60)
print()

# Test 1: Import tutor_sessions_endpoints
try:
    from tutor_sessions_endpoints import router
    print("[PASS] tutor_sessions_endpoints.py imports successfully")
    print(f"       Router has {len(router.routes)} routes:")
    for route in router.routes:
        print(f"       - {list(route.methods)} {route.path}")
except Exception as e:
    print(f"[FAIL] tutor_sessions_endpoints.py import failed: {e}")

print()

# Test 2: Check app.py includes the router
try:
    with open('app.py', 'r', encoding='utf-8') as f:
        content = f.read()
        if 'tutor_sessions_endpoints' in content and 'tutor_sessions_router' in content:
            print("[PASS] app.py includes tutor_sessions_router")
        else:
            print("[FAIL] app.py does not include tutor_sessions_router")
except Exception as e:
    print(f"[FAIL] Could not check app.py: {e}")

print()

# Test 3: Verify database columns
try:
    import psycopg
    import os
    from dotenv import load_dotenv

    load_dotenv()
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()

    cur.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'tutoring_sessions'
        AND column_name IN ('session_frequency', 'is_recurring', 'recurring_pattern', 'package_duration', 'grade_level')
        ORDER BY column_name
    """)

    columns = [row[0] for row in cur.fetchall()]

    expected = ['grade_level', 'is_recurring', 'package_duration', 'recurring_pattern', 'session_frequency']

    if set(columns) == set(expected):
        print("[PASS] All 5 new columns exist in tutoring_sessions table:")
        for col in sorted(columns):
            print(f"       - {col}")
    else:
        print(f"[FAIL] Missing columns. Found: {columns}")

    conn.close()
except Exception as e:
    print(f"[FAIL] Database check failed: {e}")

print()
print("=" * 60)
print("VERIFICATION COMPLETE")
print("=" * 60)
print()
print("Next steps:")
print("1. Start backend: python app.py")
print("2. Visit API docs: http://localhost:8000/docs")
print("3. Test endpoints: /api/tutor/sessions")
print()
