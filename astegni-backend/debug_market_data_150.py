"""
Debug script to find where 150 ETB is coming from
This will trace all data sources that could show 150 ETB
"""

import psycopg
from datetime import datetime, timedelta
import sys
import io

# Fix encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Database connection
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def debug_150_etb_source():
    """Find all sources of 150 ETB price in the database"""

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    print("=" * 80)
    print("DEBUGGING: WHERE IS 150 ETB COMING FROM?")
    print("=" * 80)
    print()

    # 1. Check all enrolled_students with 150 ETB
    print("1. CHECKING ENROLLED_STUDENTS TABLE FOR 150 ETB")
    print("-" * 80)
    cur.execute("""
        SELECT
            es.id as enrollment_id,
            es.package_id,
            es.student_id,
            es.agreed_price,
            es.enrolled_at,
            pkg.session_format,
            pkg.tutor_id,
            tp.user_id as tutor_user_id,
            u.email as tutor_email
        FROM enrolled_students es
        INNER JOIN tutor_packages pkg ON es.package_id = pkg.id
        INNER JOIN tutor_profiles tp ON pkg.tutor_id = tp.id
        INNER JOIN users u ON tp.user_id = u.id
        WHERE es.agreed_price = 150.0
        ORDER BY es.enrolled_at DESC
    """)

    rows = cur.fetchall()
    if rows:
        print(f"Found {len(rows)} enrollments with 150 ETB:")
        for row in rows:
            print(f"  Enrollment ID: {row[0]}")
            print(f"  Package ID: {row[1]}")
            print(f"  Student ID: {row[2]}")
            print(f"  Price: {row[3]} ETB")
            print(f"  Enrolled At: {row[4]}")
            print(f"  Session Format: {row[5]}")
            print(f"  Tutor ID: {row[6]}")
            print(f"  Tutor Email: {row[8]}")
            print()
    else:
        print("❌ No enrollments found with 150 ETB")
        print()

    # 2. Check all agreed prices in database
    print("2. ALL AGREED PRICES IN DATABASE")
    print("-" * 80)
    cur.execute("""
        SELECT
            es.agreed_price,
            COUNT(*) as count,
            pkg.session_format,
            es.enrolled_at
        FROM enrolled_students es
        INNER JOIN tutor_packages pkg ON es.package_id = pkg.id
        WHERE es.agreed_price > 0
        GROUP BY es.agreed_price, pkg.session_format, es.enrolled_at
        ORDER BY es.agreed_price
    """)

    rows = cur.fetchall()
    print(f"Found {len(rows)} unique price records:")
    for row in rows:
        print(f"  {row[0]} ETB ({row[2]}) - {row[1]} enrollments - Enrolled: {row[3]}")
    print()

    # 3. Simulate the market_tutors API call for YOUR profile
    print("3. SIMULATING /api/market-pricing/market-tutors API CALL")
    print("-" * 80)

    # Get requester profile (Tutor ID 1)
    cur.execute("""
        SELECT
            tp.id,
            COALESCE(ta.average_rating, 3.5) as rating,
            COALESCE(ta.success_rate, 0.0) as completion_rate,
            COALESCE(ta.total_students, 0) as student_count,
            COALESCE(
                (SELECT COUNT(*) FROM credentials WHERE user_id = tp.user_id),
                0
            ) as credentials_count,
            tp.created_at,
            u.email
        FROM tutor_profiles tp
        LEFT JOIN tutor_analysis ta ON tp.id = ta.tutor_id
        INNER JOIN users u ON tp.user_id = u.id
        WHERE u.email = 'jediael.s.abebe@gmail.com'
    """)

    requester = cur.fetchone()
    if not requester:
        print("❌ Requester not found")
        conn.close()
        return

    req_id, req_rating, req_comp, req_students, req_cred, req_created, req_email = requester
    req_age_days = (datetime.now() - req_created).days
    req_exp = min(100, req_cred * 5)

    print(f"YOUR PROFILE (Requester):")
    print(f"  Tutor ID: {req_id}")
    print(f"  Email: {req_email}")
    print(f"  Rating: {req_rating}")
    print(f"  Completion: {req_comp}")
    print(f"  Students: {req_students}")
    print(f"  Experience: {req_exp}")
    print(f"  Age: {req_age_days} days")
    print()

    # Get market tutors (Online, last 3 months)
    cutoff_date = datetime.now() - timedelta(days=90)

    cur.execute("""
        SELECT DISTINCT ON (tp.id)
            tp.id,
            COALESCE(ta.average_rating, 3.5) as rating,
            COALESCE(ta.success_rate, 0.0) as completion_rate,
            COALESCE(ta.total_students, 0) as student_count,
            COALESCE(
                (SELECT COUNT(*) FROM credentials WHERE user_id = tp.user_id),
                0
            ) as credentials_count,
            tp.created_at,
            AVG(es.agreed_price) as avg_agreed_price,
            pkg.session_format,
            u.email as tutor_email
        FROM tutor_profiles tp
        INNER JOIN tutor_packages pkg ON tp.id = pkg.tutor_id
        INNER JOIN enrolled_students es ON pkg.id = es.package_id
        LEFT JOIN tutor_analysis ta ON tp.id = ta.tutor_id
        INNER JOIN users u ON tp.user_id = u.id
        WHERE pkg.is_active = TRUE
          AND es.agreed_price > 0
          AND es.enrolled_at >= %s
          AND tp.id != %s
          AND pkg.session_format = 'Online'
        GROUP BY tp.id, ta.average_rating, ta.success_rate, ta.total_students, tp.created_at, pkg.session_format, u.email
        ORDER BY tp.id, ta.average_rating DESC NULLS LAST
    """, (cutoff_date, req_id))

    market_tutors = cur.fetchall()

    print(f"MARKET TUTORS (Online, last 3 months, excluding you):")
    print(f"Total found: {len(market_tutors)}")
    print()

    if not market_tutors:
        print("❌ NO MARKET TUTORS FOUND!")
        print("This means the API should return empty array.")
        print("If you're seeing 150 ETB, it's NOT from the database.")
        conn.close()
        return

    # Calculate similarity for each tutor
    similar_tutors = []

    for row in market_tutors:
        tutor_id, rating, comp, students, cred, created, price, session_fmt, email = row
        age_days = (datetime.now() - created).days
        exp = min(100, cred * 5)

        # Calculate similarity
        rating_sim = 1 - min(abs(rating - req_rating) / 5.0, 1.0)
        comp_sim = 1 - abs(comp - req_comp)
        student_sim = 1 - min(abs(students - req_students) / max(req_students, students, 100), 1.0)
        exp_sim = 1 - min(abs(exp - req_exp) / max(req_exp, exp, 100), 1.0)
        age_sim = 1 - min(abs(age_days - req_age_days) / max(req_age_days, age_days, 1095), 1.0)
        session_sim = 1.0 if session_fmt == 'Online' else 0.5

        similarity = (
            rating_sim * 0.25 +
            comp_sim * 0.20 +
            student_sim * 0.18 +
            session_sim * 0.17 +
            exp_sim * 0.12 +
            age_sim * 0.08
        )

        print(f"Tutor {tutor_id} ({email}):")
        print(f"  Rating: {rating} (sim: {rating_sim:.3f})")
        print(f"  Completion: {comp} (sim: {comp_sim:.3f})")
        print(f"  Students: {students} (sim: {student_sim:.3f})")
        print(f"  Experience: {exp} (sim: {exp_sim:.3f})")
        print(f"  Age: {age_days} days (sim: {age_sim:.3f})")
        print(f"  Session: {session_fmt} (sim: {session_sim:.3f})")
        print(f"  Price: {price} ETB")
        print(f"  SIMILARITY: {similarity:.3f} {'✅ PASSES (>0.65)' if similarity > 0.65 else '❌ FAILS (<0.65)'}")
        print()

        if similarity > 0.65:
            similar_tutors.append({
                'id': tutor_id,
                'email': email,
                'rating': rating,
                'price': price,
                'similarity': similarity
            })

    print("=" * 80)
    print(f"SIMILAR TUTORS (>65% similarity): {len(similar_tutors)}")
    print("=" * 80)

    if similar_tutors:
        for t in similar_tutors:
            print(f"Tutor {t['id']} ({t['email']}): {t['price']} ETB (similarity: {t['similarity']:.3f})")
        print()

        # Calculate what frontend should display
        print("=" * 80)
        print("WHAT FRONTEND SHOULD DISPLAY:")
        print("=" * 80)

        # Group by rating (like aggregateDataByRating function)
        from collections import defaultdict
        rating_groups = defaultdict(list)

        for t in similar_tutors:
            rating_key = round(t['rating'] * 2) / 2  # Round to nearest 0.5
            rating_groups[rating_key].append(t)

        print(f"Number of rating groups: {len(rating_groups)}")
        print()

        for rating, tutors in sorted(rating_groups.items()):
            avg_price = sum(t['price'] for t in tutors) / len(tutors)
            print(f"{rating}⭐ - {len(tutors)} tutor(s) - Avg Price: {avg_price:.2f} ETB")
            for t in tutors:
                print(f"  → Tutor {t['id']}: {t['price']} ETB")

    else:
        print("❌ NO SIMILAR TUTORS FOUND!")
        print("Frontend should show: 'No similar tutors found' message")

    print()
    print("=" * 80)
    print("CONCLUSION:")
    print("=" * 80)

    if len(similar_tutors) == 0:
        print("❌ If you're seeing 150 ETB, it's NOT from the database!")
        print("   Possible sources:")
        print("   1. Hardcoded value still in frontend JavaScript")
        print("   2. Browser cache showing old JavaScript")
        print("   3. Wrong API endpoint being called")
        print()
        print("   ACTION: Hard refresh browser (Ctrl+Shift+R) to clear cache")
    else:
        prices = [t['price'] for t in similar_tutors]
        if 150.0 in prices:
            print("✅ 150 ETB IS in the database!")
            print(f"   Found in {len([p for p in prices if p == 150.0])} similar tutor(s)")
        else:
            print("❌ 150 ETB is NOT in similar tutors!")
            print(f"   Similar tutors have prices: {prices}")
            print("   If you're seeing 150 ETB, check browser cache or frontend code")

    conn.close()

if __name__ == "__main__":
    debug_150_etb_source()
