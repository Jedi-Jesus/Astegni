"""
Quick check: Verify trending data is being recorded
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
print("CHECKING TRENDING DATA")
print("=" * 60)

with engine.connect() as conn:
    # Check if columns exist
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'tutor_profiles'
        AND column_name IN ('search_count', 'trending_score', 'last_search_increment')
        ORDER BY column_name
    """))

    columns = [row[0] for row in result.fetchall()]
    print(f"\n✓ Trending columns in database: {', '.join(columns)}")

    # Check tutors with search activity
    result = conn.execute(text("""
        SELECT
            tp.id,
            u.first_name,
            u.father_name,
            tp.search_count,
            tp.trending_score,
            tp.last_search_increment
        FROM tutor_profiles tp
        JOIN users u ON tp.user_id = u.id
        WHERE tp.search_count > 0
        ORDER BY tp.search_count DESC
        LIMIT 10
    """))

    tutors = result.fetchall()

    if tutors:
        print(f"\n✓ Found {len(tutors)} tutors with search activity:")
        print("\nTop Searched Tutors:")
        for tutor in tutors:
            print(f"  {tutor[1]} {tutor[2]}: "
                  f"{tutor[3]} searches, "
                  f"score={tutor[4]:.2f}, "
                  f"last_searched={tutor[5]}")
    else:
        print("\n⚠ No tutors tracked yet. Search for some tutors to generate data!")

    # Overall stats
    result = conn.execute(text("""
        SELECT
            COUNT(*) as total_tutors,
            SUM(search_count) as total_searches,
            AVG(search_count) as avg_searches,
            MAX(search_count) as max_searches,
            COUNT(CASE WHEN search_count > 0 THEN 1 END) as tutors_with_searches
        FROM tutor_profiles
    """))

    stats = result.fetchone()
    print(f"\n📊 Overall Statistics:")
    print(f"  Total tutors: {stats[0]}")
    print(f"  Total searches tracked: {stats[1] or 0}")
    print(f"  Average searches per tutor: {stats[2] or 0:.2f}")
    print(f"  Max searches (single tutor): {stats[3] or 0}")
    print(f"  Tutors with at least 1 search: {stats[4]}")

print("\n" + "=" * 60)
print("Check complete!")
print("=" * 60)
