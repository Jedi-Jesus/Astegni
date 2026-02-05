"""
Quick check: Verify course and school trending data
"""
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os
import sys

# Set UTF-8 encoding for console output
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Load environment
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print("=" * 60)
print("CHECKING COURSE & SCHOOL TRENDING DATA")
print("=" * 60)

with engine.connect() as conn:
    # Check courses
    print("\n📚 COURSES:")
    print("-" * 60)

    # Check if columns exist
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'courses'
        AND column_name IN ('search_count', 'trending_score', 'last_search_increment')
        ORDER BY column_name
    """))
    columns = [row[0] for row in result.fetchall()]
    print(f"✓ Trending columns: {', '.join(columns)}")

    # Check courses with search activity
    result = conn.execute(text("""
        SELECT
            id,
            course_name,
            search_count,
            trending_score,
            last_search_increment
        FROM courses
        WHERE search_count > 0
        ORDER BY search_count DESC
        LIMIT 10
    """))
    courses = result.fetchall()

    if courses:
        print(f"\n✓ Found {len(courses)} courses with search activity:")
        for course in courses:
            print(f"  {course[1]}: {course[2]} searches, score={course[3]:.2f}")
    else:
        print("\n⚠ No courses tracked yet.")

    # Overall course stats
    result = conn.execute(text("""
        SELECT
            COUNT(*) as total,
            SUM(search_count) as total_searches,
            AVG(search_count) as avg_searches,
            MAX(search_count) as max_searches,
            COUNT(CASE WHEN search_count > 0 THEN 1 END) as with_searches
        FROM courses
    """))
    stats = result.fetchone()
    print(f"\n📊 Course Statistics:")
    print(f"  Total courses: {stats[0]}")
    print(f"  Total searches: {stats[1] or 0}")
    print(f"  Average: {stats[2] or 0:.2f}")
    print(f"  Max: {stats[3] or 0}")
    print(f"  With searches: {stats[4]}")

    # Check schools
    print("\n\n🏫 SCHOOLS:")
    print("-" * 60)

    # Check if columns exist
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'schools'
        AND column_name IN ('search_count', 'trending_score', 'last_search_increment')
        ORDER BY column_name
    """))
    columns = [row[0] for row in result.fetchall()]
    print(f"✓ Trending columns: {', '.join(columns)}")

    # Check schools with search activity
    result = conn.execute(text("""
        SELECT
            id,
            name,
            search_count,
            trending_score,
            last_search_increment,
            student_count
        FROM schools
        WHERE search_count > 0
        ORDER BY search_count DESC
        LIMIT 10
    """))
    schools = result.fetchall()

    if schools:
        print(f"\n✓ Found {len(schools)} schools with search activity:")
        for school in schools:
            print(f"  {school[1]}: {school[2]} searches, score={school[3]:.2f}, students={school[5]}")
    else:
        print("\n⚠ No schools tracked yet.")

    # Overall school stats
    result = conn.execute(text("""
        SELECT
            COUNT(*) as total,
            SUM(search_count) as total_searches,
            AVG(search_count) as avg_searches,
            MAX(search_count) as max_searches,
            COUNT(CASE WHEN search_count > 0 THEN 1 END) as with_searches
        FROM schools
    """))
    stats = result.fetchone()
    print(f"\n📊 School Statistics:")
    print(f"  Total schools: {stats[0]}")
    print(f"  Total searches: {stats[1] or 0}")
    print(f"  Average: {stats[2] or 0:.2f}")
    print(f"  Max: {stats[3] or 0}")
    print(f"  With searches: {stats[4]}")

print("\n" + "=" * 60)
print("Check complete!")
print("=" * 60)
