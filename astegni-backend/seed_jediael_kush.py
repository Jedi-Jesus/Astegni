"""
Seed Earnings and Investments Data for Jediael and Kush Studios
Seeds data for tutor_profile_id 85 (Jediael) and 86 (Kush Studios)
"""

import psycopg
from datetime import datetime, timedelta
import random

DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"

# Ethiopian names for affiliates/students
ETHIOPIAN_NAMES = [
    "Abebe Bekele", "Almaz Tadesse", "Biniam Haile", "Chaltu Desalegn",
    "Dawit Tesfaye", "Eyerusalem Kebede", "Fikir Alemayehu", "Getachew Mengistu",
    "Hirut Worku", "Yonas Amare", "Kalkidan Girma", "Lemlem Assefa",
    "Meron Abate", "Natnael Solomon", "Rahel Mulugeta", "Selamawit Yilma",
    "Tadesse Negussie", "Tigist Hailu", "Wondimu Desta", "Yemisrach Fekadu",
    "Zewdu Gebre", "Amanuel Kidane", "Beza Teshome", "Dagmawi Berhe",
    "Elsa Mesele", "Fasika Mekonnen", "Getnet Ayele", "Hana Zenebe"
]

SUBJECTS = [
    "Mathematics", "Physics", "Chemistry", "Biology", "English",
    "Amharic", "History", "Geography", "Economics", "Computer Science"
]

SESSION_TYPES = [
    "One-on-One Online", "Group Session", "In-Person",
    "Hybrid", "Workshop", "Intensive Course"
]

def seed_tutor_earnings(tutor_profile_id, tutor_name, student_users):
    """Seed earnings and investments for a specific tutor"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print(f"\n{'='*70}")
        print(f"Seeding data for {tutor_name} (Tutor Profile ID: {tutor_profile_id})")
        print(f"{'='*70}")

        # 1. SEED DIRECT AFFILIATE EARNINGS (12 referrals over 6 months)
        print("Seeding direct affiliate earnings...")
        direct_total = 0
        for i in range(12):
            student_id = student_users[i % len(student_users)][0]
            amount = random.uniform(50, 300)  # ETB
            direct_total += amount

            days_ago = random.randint(0, 180)
            earned_date = datetime.now() - timedelta(days=days_ago)

            cur.execute("""
                INSERT INTO direct_affiliate_earnings
                (tutor_profile_id, referred_user_id, referred_user_name,
                 referred_user_profile_picture, amount, commission_percentage,
                 source, description, status, earned_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                tutor_profile_id,
                student_id,
                ETHIOPIAN_NAMES[i % len(ETHIOPIAN_NAMES)],
                f"uploads/system_images/system_profile_pictures/student-college-{'girl' if i % 2 else 'boy'}.jpg",
                round(amount, 2),
                10.00,
                "Student Subscription",
                "Referral commission from student subscription package",
                "completed" if i < 10 else "pending",
                earned_date
            ))

        # 2. SEED INDIRECT AFFILIATE EARNINGS (8 second-level referrals)
        print("Seeding indirect affiliate earnings...")
        indirect_total = 0
        for i in range(8):
            referrer_id = student_users[i % len(student_users)][0]
            end_user_id = student_users[(i + 5) % len(student_users)][0]
            amount = random.uniform(25, 150)  # ETB
            indirect_total += amount

            days_ago = random.randint(0, 180)
            earned_date = datetime.now() - timedelta(days=days_ago)

            cur.execute("""
                INSERT INTO indirect_affiliate_earnings
                (tutor_profile_id, referred_by_user_id, referred_by_name,
                 end_user_id, end_user_name, amount, commission_percentage,
                 levels_deep, source, description, status, earned_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                tutor_profile_id,
                referrer_id,
                ETHIOPIAN_NAMES[i % len(ETHIOPIAN_NAMES)],
                end_user_id,
                ETHIOPIAN_NAMES[(i + 10) % len(ETHIOPIAN_NAMES)],
                round(amount, 2),
                5.00,
                random.choice([1, 2]),
                "Indirect Referral",
                "Second-level referral commission",
                "completed" if i < 6 else "pending",
                earned_date
            ))

        # 3. SEED TUTORING EARNINGS (25 sessions over 6 months)
        print("Seeding tutoring earnings...")
        tutoring_total = 0
        for i in range(25):
            student_id = student_users[i % len(student_users)][0]
            amount = random.uniform(100, 500)  # ETB per session
            tutoring_total += amount

            days_ago = random.randint(0, 180)
            earned_date = datetime.now() - timedelta(days=days_ago)

            cur.execute("""
                INSERT INTO tutoring_earnings
                (tutor_profile_id, student_user_id, student_name,
                 student_profile_picture, session_id, amount, session_duration,
                 session_type, subject, payment_method, status, earned_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                tutor_profile_id,
                student_id,
                ETHIOPIAN_NAMES[i % len(ETHIOPIAN_NAMES)],
                f"uploads/system_images/system_profile_pictures/student-teenage-{'girl' if i % 2 else 'boy'}.jpg",
                3000 + (tutor_profile_id * 100) + i,
                round(amount, 2),
                random.choice([60, 90, 120, 180]),
                random.choice(SESSION_TYPES),
                random.choice(SUBJECTS),
                random.choice(["Telebirr", "CBE Birr", "Cash", "Bank Transfer"]),
                "completed" if i < 22 else "pending",
                earned_date
            ))

        # 4. SEED INVESTMENTS (6 different investments)
        print("Seeding tutor investments...")
        investments_data = [
            {
                "type": "Educational Platform Stock",
                "name": "Coursera Inc.",
                "amount": 5000,
                "current_value": 5750,
                "roi": 15.0,
                "days_ago": 120,
                "maturity_days": 365,
                "risk": "Medium",
                "status": "active"
            },
            {
                "type": "Cryptocurrency",
                "name": "Bitcoin (BTC)",
                "amount": 3000,
                "current_value": 3600,
                "roi": 20.0,
                "days_ago": 90,
                "maturity_days": None,
                "risk": "High",
                "status": "active"
            },
            {
                "type": "Real Estate",
                "name": "Addis Ababa Apartment Share",
                "amount": 10000,
                "current_value": 11200,
                "roi": 12.0,
                "days_ago": 180,
                "maturity_days": 730,
                "risk": "Low",
                "status": "active"
            },
            {
                "type": "Government Bonds",
                "name": "Ethiopian Treasury Bond",
                "amount": 8000,
                "current_value": 8480,
                "roi": 6.0,
                "days_ago": 150,
                "maturity_days": 1095,
                "risk": "Very Low",
                "status": "active"
            },
            {
                "type": "Online Course Creation",
                "name": "Udemy Course Portfolio",
                "amount": 2000,
                "current_value": 2800,
                "roi": 40.0,
                "days_ago": 60,
                "maturity_days": None,
                "risk": "Medium",
                "status": "active"
            },
            {
                "type": "EdTech Startup",
                "name": "Local EdTech Venture",
                "amount": 15000,
                "current_value": 14500,
                "roi": -3.33,
                "days_ago": 200,
                "maturity_days": 1825,
                "risk": "High",
                "status": "active"
            }
        ]

        for inv in investments_data:
            investment_date = datetime.now() - timedelta(days=inv["days_ago"])
            maturity_date = (investment_date + timedelta(days=inv["maturity_days"])) if inv["maturity_days"] else None

            cur.execute("""
                INSERT INTO tutor_investments
                (tutor_profile_id, investment_type, investment_name, amount,
                 current_value, roi_percentage, investment_date, maturity_date,
                 status, description, risk_level)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                tutor_profile_id,
                inv["type"],
                inv["name"],
                inv["amount"],
                inv["current_value"],
                inv["roi"],
                investment_date.date(),
                maturity_date.date() if maturity_date else None,
                inv["status"],
                f"Investment in {inv['name']} - {inv['risk']} risk",
                inv["risk"]
            ))

        # 5. SEED MONTHLY SUMMARY DATA (last 6 months)
        print("Seeding monthly earnings summary...")
        for months_ago in range(6):
            target_date = datetime.now() - timedelta(days=months_ago * 30)
            year = target_date.year
            month = target_date.month

            direct_monthly = direct_total / 6 * random.uniform(0.7, 1.3)
            indirect_monthly = indirect_total / 6 * random.uniform(0.7, 1.3)
            tutoring_monthly = tutoring_total / 6 * random.uniform(0.7, 1.3)
            total_monthly = direct_monthly + indirect_monthly + tutoring_monthly

            cur.execute("""
                INSERT INTO monthly_earnings_summary
                (tutor_profile_id, year, month, direct_affiliate_earnings,
                 indirect_affiliate_earnings, tutoring_earnings, total_earnings)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (tutor_profile_id, year, month) DO UPDATE
                SET direct_affiliate_earnings = EXCLUDED.direct_affiliate_earnings,
                    indirect_affiliate_earnings = EXCLUDED.indirect_affiliate_earnings,
                    tutoring_earnings = EXCLUDED.tutoring_earnings,
                    total_earnings = EXCLUDED.total_earnings
            """, (
                tutor_profile_id,
                year,
                month,
                round(direct_monthly, 2),
                round(indirect_monthly, 2),
                round(tutoring_monthly, 2),
                round(total_monthly, 2)
            ))

        conn.commit()
        print(f"\nSUCCESS: Data seeded for {tutor_name}!")
        print(f"Total Direct Affiliate: {direct_total:.2f} ETB")
        print(f"Total Indirect Affiliate: {indirect_total:.2f} ETB")
        print(f"Total Tutoring: {tutoring_total:.2f} ETB")
        print(f"Total Investments: {sum(inv['amount'] for inv in investments_data):.2f} ETB")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        cur.close()
        conn.close()

def main():
    """Seed data for Jediael (85) and Kush Studios (86)"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get student users for earnings
        cur.execute("SELECT id FROM users WHERE roles::text LIKE '%student%' LIMIT 15")
        student_users = cur.fetchall()

        if not student_users:
            print("Creating student users...")
            for i in range(15):
                name = ETHIOPIAN_NAMES[i]
                email = f"student{i+200}@astegni.et"
                cur.execute("""
                    INSERT INTO users (email, password_hash, roles)
                    VALUES (%s, %s, %s)
                    RETURNING id
                """, (email, "hashed_password", ["student"]))
                student_users.append(cur.fetchone())
            conn.commit()

        # Get tutor profiles 85 and 86
        cur.execute("""
            SELECT tp.id as tutor_profile_id, u.email
            FROM tutor_profiles tp
            JOIN users u ON u.id = tp.user_id
            WHERE tp.id IN (85, 86)
            ORDER BY tp.id
        """)
        tutors = cur.fetchall()

        if not tutors or len(tutors) < 2:
            print("ERROR: Could not find tutor_profile_id 85 and 86")
            return

        print("\n" + "="*70)
        print("SEEDING EARNINGS & INVESTMENTS FOR JEDIAEL AND KUSH STUDIOS")
        print("="*70)
        print(f"\nFound tutors:")
        print(f"  - Tutor Profile 85: {tutors[0][1]} (Jediael)")
        print(f"  - Tutor Profile 86: {tutors[1][1]} (Kush Studios)")

        # Seed data for Jediael (tutor_profile_id 85)
        seed_tutor_earnings(85, "Jediael", student_users)

        # Seed data for Kush Studios (tutor_profile_id 86)
        seed_tutor_earnings(86, "Kush Studios", student_users)

        print("\n" + "="*70)
        print("ALL DONE! Earnings and investments seeded!")
        print("="*70)
        print("\nLogin credentials:")
        print(f"  Jediael: {tutors[0][1]}")
        print(f"  Kush Studios: {tutors[1][1]}")
        print("\nAccess at: http://localhost:8080/profile-pages/tutor-profile.html")
        print("Click 'E Earnings & Investments' in sidebar to view!")
        print("="*70)

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
