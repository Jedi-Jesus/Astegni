"""
View admin data from database (handles UTF-8 encoding properly)
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import json

load_dotenv()

# Database connection
db_url = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
if db_url.startswith('postgresql://'):
    db_url = db_url.replace('postgresql://', 'postgresql+psycopg://')

engine = create_engine(db_url)

print("=" * 60)
print("ADMIN DATA VIEWER")
print("=" * 60)
print()

with engine.connect() as conn:
    # 1. Main admin user
    print("1. ADMIN USER (users table)")
    print("-" * 60)
    result = conn.execute(text("""
        SELECT id, first_name, father_name, grandfather_name,
               email, phone, username, roles, email_verified, created_at
        FROM users
        WHERE roles::text LIKE '%admin%'
        LIMIT 1
    """))

    admin = result.fetchone()
    if admin:
        print(f"ID: {admin[0]}")
        print(f"Name: {admin[1]} {admin[2]} {admin[3] or ''}")
        print(f"Email: {admin[4]}")
        print(f"Phone: {admin[5]}")
        print(f"Username: {admin[6] or 'None'}")
        print(f"Roles: {admin[7]}")
        print(f"Email Verified: {admin[8]}")
        print(f"Created: {admin[9]}")
        admin_id = admin[0]
    else:
        print("No admin user found!")
        admin_id = None

    print()

    # 2. Admin profile stats
    if admin_id:
        print("2. ADMIN PROFILE STATS (admin_profile_stats table)")
        print("-" * 60)
        result = conn.execute(text("""
            SELECT id, admin_id, display_name, department, employee_id,
                   joined_date, rating, total_reviews, profile_quote, bio
            FROM admin_profile_stats
            WHERE admin_id = :admin_id
        """), {'admin_id': admin_id})

        profile = result.fetchone()
        if profile:
            print(f"ID: {profile[0]}")
            print(f"Display Name: {profile[2]}")
            print(f"Department: {profile[3]}")
            print(f"Employee ID: {profile[4]}")
            print(f"Joined Date: {profile[5]}")
            print(f"Rating: {profile[6]}")
            print(f"Total Reviews: {profile[7]}")
            print(f"Quote: {profile[8] or 'None'}")
            print(f"Bio: {profile[9][:100] if profile[9] else 'None'}...")
        else:
            print("No profile stats found")

        print()

        # 3. Admin panel statistics
        print("3. ADMIN PANEL STATISTICS (admin_panel_statistics table)")
        print("-" * 60)
        result = conn.execute(text("""
            SELECT panel_name, stat_key, stat_value, display_label
            FROM admin_panel_statistics
            WHERE admin_id = :admin_id
            ORDER BY panel_name, display_order
            LIMIT 10
        """), {'admin_id': admin_id})

        stats = result.fetchall()
        if stats:
            current_panel = None
            for stat in stats:
                if stat[0] != current_panel:
                    print(f"\n  Panel: {stat[0]}")
                    current_panel = stat[0]
                print(f"    {stat[3]}: {stat[2]}")
        else:
            print("No panel statistics found")

        print()

        # 4. Admin achievements
        print("4. ADMIN ACHIEVEMENTS (admin_achievements table)")
        print("-" * 60)
        result = conn.execute(text("""
            SELECT achievement_type, title, earned_date, earned_period
            FROM admin_achievements
            WHERE admin_id = :admin_id
            ORDER BY display_order
            LIMIT 5
        """), {'admin_id': admin_id})

        achievements = result.fetchall()
        if achievements:
            for ach in achievements:
                # Avoid printing emoji icons
                print(f"  - {ach[1]} ({ach[3]})")
        else:
            print("No achievements found")

        print()

        # 5. Admin reviews
        print("5. ADMIN REVIEWS (admin_reviews table)")
        print("-" * 60)
        result = conn.execute(text("""
            SELECT reviewer_name, reviewer_role, rating, comment, created_at
            FROM admin_reviews
            WHERE admin_id = :admin_id
            ORDER BY created_at DESC
            LIMIT 3
        """), {'admin_id': admin_id})

        reviews = result.fetchall()
        if reviews:
            for rev in reviews:
                print(f"  From: {rev[0]} ({rev[1]})")
                print(f"  Rating: {rev[2]}/5.0")
                print(f"  Comment: {rev[3][:80]}...")
                print(f"  Date: {rev[4]}")
                print()
        else:
            print("No reviews found")

        print()

        # 6. Check all admin tables for data
        print("6. TABLE DATA COUNT")
        print("-" * 60)

        tables = [
            'admin_profile_stats',
            'admin_panel_statistics',
            'admin_achievements',
            'admin_reviews',
            'admin_daily_quotas',
            'admin_fire_streaks'
        ]

        for table in tables:
            result = conn.execute(text(f"""
                SELECT COUNT(*) FROM {table} WHERE admin_id = :admin_id
            """), {'admin_id': admin_id})
            count = result.fetchone()[0]
            print(f"  {table}: {count} records")

    conn.commit()

print()
print("=" * 60)
print("Done!")
print("=" * 60)
