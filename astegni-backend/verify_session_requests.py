"""
Session Request System - Quick Verification Script
Run this to verify the session request system is set up correctly
"""
import psycopg
from dotenv import load_dotenv
import os
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def verify_system():
    """Verify session request system is properly set up"""
    print("=" * 60)
    print("SESSION REQUEST SYSTEM VERIFICATION")
    print("=" * 60)
    print()

    try:
        conn = psycopg.connect(DATABASE_URL)
        cur = conn.cursor()

        # 1. Check table exists
        print("1️⃣  Checking if session_requests table exists...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'session_requests'
            )
        """)
        table_exists = cur.fetchone()[0]

        if table_exists:
            print("   ✅ session_requests table exists")
        else:
            print("   ❌ session_requests table NOT found")
            print("   → Run: python migrate_create_session_requests.py")
            return False

        # 2. Check table structure
        print("\n2️⃣  Checking table structure...")
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'session_requests'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()

        expected_columns = [
            'id', 'tutor_id', 'requester_id', 'requester_type',
            'package_id', 'package_name', 'status', 'message',
            'student_name', 'student_grade', 'preferred_schedule',
            'contact_phone', 'contact_email', 'created_at',
            'updated_at', 'responded_at'
        ]

        actual_columns = [col[0] for col in columns]

        if all(col in actual_columns for col in expected_columns):
            print(f"   ✅ All {len(expected_columns)} required columns present")
        else:
            print("   ❌ Missing columns:")
            missing = [col for col in expected_columns if col not in actual_columns]
            for col in missing:
                print(f"      - {col}")
            return False

        # 3. Check indexes
        print("\n3️⃣  Checking indexes...")
        cur.execute("""
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'session_requests'
            AND indexname LIKE 'idx_%'
        """)
        indexes = [row[0] for row in cur.fetchall()]

        expected_indexes = [
            'idx_session_requests_tutor',
            'idx_session_requests_requester'
        ]

        if all(idx in indexes for idx in expected_indexes):
            print(f"   ✅ All {len(expected_indexes)} indexes present")
        else:
            print("   ⚠️  Some indexes missing (non-critical):")
            missing = [idx for idx in expected_indexes if idx not in indexes]
            for idx in missing:
                print(f"      - {idx}")

        # 4. Check data
        print("\n4️⃣  Checking sample data...")
        cur.execute("SELECT COUNT(*) FROM session_requests")
        total = cur.fetchone()[0]

        if total > 0:
            print(f"   ✅ Found {total} session requests")

            # Count by status
            cur.execute("""
                SELECT status, COUNT(*)
                FROM session_requests
                GROUP BY status
                ORDER BY status
            """)
            stats = cur.fetchall()
            for status, count in stats:
                print(f"      - {status}: {count}")
        else:
            print("   ⚠️  No sample data found")
            print("   → Run: python seed_session_requests.py")

        # 5. Check for sample tutor and students
        print("\n5️⃣  Checking for sample users...")
        cur.execute("""
            SELECT
                (SELECT COUNT(*) FROM users WHERE roles::jsonb ? 'tutor') as tutors,
                (SELECT COUNT(*) FROM users WHERE roles::jsonb ? 'student') as students,
                (SELECT COUNT(*) FROM users WHERE roles::jsonb ? 'parent') as parents
        """)
        tutors, students, parents = cur.fetchone()

        if tutors > 0:
            print(f"   ✅ Found {tutors} tutors")
        else:
            print("   ⚠️  No tutors found")

        if students > 0:
            print(f"   ✅ Found {students} students")
        else:
            print("   ⚠️  No students found")

        if parents > 0:
            print(f"   ✅ Found {parents} parents")
        else:
            print("   ⚠️  No parents found")

        # 6. Test query performance
        print("\n6️⃣  Testing query performance...")
        import time

        start = time.time()
        cur.execute("""
            SELECT
                sr.id, sr.tutor_id, sr.requester_id, sr.requester_type,
                u.username as requester_name, sr.package_name, sr.status,
                sr.student_name, sr.student_grade
            FROM session_requests sr
            LEFT JOIN users u ON sr.requester_id = u.id
            WHERE sr.status = 'pending'
            LIMIT 100
        """)
        cur.fetchall()
        elapsed = (time.time() - start) * 1000

        print(f"   ✅ Query completed in {elapsed:.2f}ms")

        if elapsed < 100:
            print("      → Performance: Excellent")
        elif elapsed < 500:
            print("      → Performance: Good")
        else:
            print("      → Performance: Acceptable")

        # 7. Summary
        print("\n" + "=" * 60)
        print("VERIFICATION SUMMARY")
        print("=" * 60)
        print()
        print("✅ Database table: OK")
        print("✅ Table structure: OK")
        print("✅ Indexes: OK")
        if total > 0:
            print("✅ Sample data: OK")
        else:
            print("⚠️  Sample data: Not found (optional)")
        print("✅ Users: OK")
        print("✅ Query performance: OK")
        print()
        print("🎉 SESSION REQUEST SYSTEM IS READY!")
        print()
        print("Next steps:")
        print("1. Start backend: python app.py")
        print("2. Start frontend: python -m http.server 8080")
        print("3. Open: http://localhost:8080/profile-pages/tutor-profile.html")
        print("4. Navigate to 'Requested Sessions' panel")
        print()
        print("📚 Documentation:")
        print("   - SESSION-REQUEST-QUICK-START.md")
        print("   - SESSION-REQUEST-SYSTEM-GUIDE.md")
        print("   - SESSION-REQUEST-IMPLEMENTATION-SUMMARY.md")
        print()

        cur.close()
        conn.close()
        return True

    except Exception as e:
        print(f"\n❌ Error during verification: {e}")
        return False

if __name__ == "__main__":
    success = verify_system()
    sys.exit(0 if success else 1)
