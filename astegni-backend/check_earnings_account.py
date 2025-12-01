"""
Check which tutor account has earnings and investments data
"""

import psycopg

DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"

def check_earnings_account():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Check which tutor profiles have earnings data
        print("=" * 70)
        print("TUTORS WITH EARNINGS DATA")
        print("=" * 70)

        cur.execute("""
            SELECT DISTINCT
                tp.id as tutor_profile_id,
                u.id as user_id,
                u.email,
                (SELECT COUNT(*) FROM direct_affiliate_earnings WHERE tutor_profile_id = tp.id) as direct_count,
                (SELECT COUNT(*) FROM indirect_affiliate_earnings WHERE tutor_profile_id = tp.id) as indirect_count,
                (SELECT COUNT(*) FROM tutoring_earnings WHERE tutor_profile_id = tp.id) as tutoring_count,
                (SELECT COUNT(*) FROM tutor_investments WHERE tutor_profile_id = tp.id) as investment_count
            FROM tutor_profiles tp
            JOIN users u ON u.id = tp.user_id
            WHERE EXISTS (
                SELECT 1 FROM direct_affiliate_earnings WHERE tutor_profile_id = tp.id
            )
            OR EXISTS (
                SELECT 1 FROM indirect_affiliate_earnings WHERE tutor_profile_id = tp.id
            )
            OR EXISTS (
                SELECT 1 FROM tutoring_earnings WHERE tutor_profile_id = tp.id
            )
            OR EXISTS (
                SELECT 1 FROM tutor_investments WHERE tutor_profile_id = tp.id
            )
            ORDER BY tp.id
        """)

        tutors = cur.fetchall()

        if not tutors:
            print("\nNo tutors have earnings data yet.")
            print("\nTo seed data, run:")
            print("  python seed_earnings_investments.py")
            return

        for tutor in tutors:
            print(f"\nTutor Profile ID: {tutor[0]}")
            print(f"User ID: {tutor[1]}")
            print(f"Email: {tutor[2]}")
            print(f"  - Direct Affiliate Earnings: {tutor[3]} records")
            print(f"  - Indirect Affiliate Earnings: {tutor[4]} records")
            print(f"  - Tutoring Earnings: {tutor[5]} records")
            print(f"  - Investments: {tutor[6]} records")

            # Get total earnings
            cur.execute("""
                SELECT
                    COALESCE((SELECT SUM(amount) FROM direct_affiliate_earnings WHERE tutor_profile_id = %s), 0) as direct,
                    COALESCE((SELECT SUM(amount) FROM indirect_affiliate_earnings WHERE tutor_profile_id = %s), 0) as indirect,
                    COALESCE((SELECT SUM(amount) FROM tutoring_earnings WHERE tutor_profile_id = %s), 0) as tutoring,
                    COALESCE((SELECT SUM(amount) FROM tutor_investments WHERE tutor_profile_id = %s), 0) as invested
            """, (tutor[0], tutor[0], tutor[0], tutor[0]))

            totals = cur.fetchone()
            print(f"  - Total Direct Affiliate: {float(totals[0]):.2f} ETB")
            print(f"  - Total Indirect Affiliate: {float(totals[1]):.2f} ETB")
            print(f"  - Total Tutoring: {float(totals[2]):.2f} ETB")
            print(f"  - Total Invested: {float(totals[3]):.2f} ETB")
            print(f"  - GRAND TOTAL EARNINGS: {float(totals[0]) + float(totals[1]) + float(totals[2]):.2f} ETB")

        print("\n" + "=" * 70)
        print("LOGIN INSTRUCTIONS")
        print("=" * 70)
        print(f"\nTo view this data in the UI:")
        print(f"1. Go to: http://localhost:8080/profile-pages/tutor-profile.html")
        print(f"2. Login with: {tutors[0][2]}")
        print(f"3. Click 'ℰ Earnings & Investments' in sidebar")
        print(f"4. Enjoy your beautiful earnings dashboard!")
        print("=" * 70)

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    check_earnings_account()
