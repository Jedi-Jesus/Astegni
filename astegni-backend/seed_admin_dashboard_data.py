"""
Seed Admin Dashboard Data
Populates the admin dashboard tables with sample data
"""

import psycopg
from dotenv import load_dotenv
import os
from datetime import date, timedelta
import json

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def seed_data():
    """Seed admin dashboard with sample data"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Assume admin user ID is 1 (or first user with admin role)
        admin_id = 1

        print("Seeding admin dashboard data...")

        # 1. Seed Achievements
        print("\n[1/5] Seeding achievements...")
        achievements = [
            {
                'type': 'top_performer',
                'title': 'Top Performer',
                'description': 'Achieved top performance in Q4 2024',
                'icon': '🏆',
                'earned_date': date(2024, 12, 15),
                'period': 'Q4 2024',
                'order': 1
            },
            {
                'type': 'excellence',
                'title': 'Excellence',
                'description': 'Annual excellence award for outstanding service',
                'icon': '🥇',
                'earned_date': date(2023, 12, 31),
                'period': 'Annual 2023',
                'order': 2
            },
            {
                'type': 'five_star',
                'title': '5-Star Admin',
                'description': 'Maintained 5-star rating across 1000+ reviews',
                'icon': '⭐',
                'earned_date': date(2024, 10, 1),
                'period': '1000+ Reviews',
                'metadata': json.dumps({'review_count': 1000, 'avg_rating': 4.8}),
                'order': 3
            },
            {
                'type': 'content_master',
                'title': 'Content Master',
                'description': 'Successfully managed 500+ courses',
                'icon': '📚',
                'earned_date': date(2024, 8, 15),
                'period': '500+ Courses',
                'metadata': json.dumps({'total_courses': 500}),
                'order': 4
            },
            {
                'type': 'goal_achiever',
                'title': 'Goal Achiever',
                'description': '100% success rate on all assigned goals',
                'icon': '🎯',
                'earned_date': date(2024, 6, 30),
                'period': '100% Success',
                'metadata': json.dumps({'success_rate': 100}),
                'order': 5
            },
            {
                'type': 'premium_admin',
                'title': 'Premium Admin',
                'description': 'Reached Level 10 Premium Administrator status',
                'icon': '💎',
                'earned_date': date(2024, 5, 1),
                'period': 'Level 10',
                'metadata': json.dumps({'level': 10}),
                'order': 6
            }
        ]

        for ach in achievements:
            cursor.execute("""
                INSERT INTO admin_achievements
                (admin_id, achievement_type, title, description, icon, earned_date, earned_period, metadata, display_order, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, true)
                ON CONFLICT DO NOTHING
            """, (
                admin_id, ach['type'], ach['title'], ach.get('description'),
                ach['icon'], ach['earned_date'], ach['period'],
                ach.get('metadata', '{}'), ach['order']
            ))

        print(f"  Seeded {len(achievements)} achievements")

        # 2. Seed Fire Streak
        print("\n[2/5] Seeding fire streak...")
        cursor.execute("""
            INSERT INTO admin_fire_streaks
            (admin_id, current_streak, longest_streak, last_activity_date, streak_started_date, weekly_pattern, total_active_days)
            VALUES (%s, 21, 45, %s, %s, %s, 150)
            ON CONFLICT (admin_id) DO UPDATE SET
                current_streak = EXCLUDED.current_streak,
                longest_streak = EXCLUDED.longest_streak,
                last_activity_date = EXCLUDED.last_activity_date,
                weekly_pattern = EXCLUDED.weekly_pattern
        """, (
            admin_id,
            date.today(),
            date.today() - timedelta(days=20),
            json.dumps([True, True, True, False, False, False, False])  # 3 active days this week
        ))

        print("  Seeded fire streak data")

        # 3. Seed Profile Stats
        print("\n[3/5] Seeding profile stats...")
        badges = [
            {'text': '✔ System Administrator', 'class': 'verified'},
            {'text': '📚 Course Management', 'class': 'course'},
            {'text': '🎓 Curriculum Expert', 'class': 'expert'}
        ]

        cursor.execute("""
            INSERT INTO admin_profile_stats
            (admin_id, display_name, department, employee_id, joined_date, rating, total_reviews, profile_quote, bio, location, badges)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (admin_id) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                rating = EXCLUDED.rating,
                total_reviews = EXCLUDED.total_reviews
        """, (
            admin_id,
            'Course Management',
            'Educational Services',
            'ADM-2024-003',
            date(2019, 6, 1),
            4.8,
            189,
            'Developing comprehensive educational curricula for transformative learning experiences.',
            'Senior System Administrator specializing in curriculum development and course management. Expert in educational content creation and quality assurance.',
            'Astegni Admin Panel | Course Creation & Management',
            json.dumps(badges)
        ))

        print("  Seeded profile stats")

        # 4. Seed Daily Quotas (for today)
        print("\n[4/5] Seeding daily quotas...")
        today = date.today()
        quotas = [
            ('active', 245, 250, 98.0),
            ('pending', 18, 20, 90.0),
            ('rejected', 12, 15, 80.0),
            ('suspended', 8, 10, 80.0),
            ('archived', 89, 100, 89.0)
        ]

        for category, current, limit, percentage in quotas:
            cursor.execute("""
                INSERT INTO admin_daily_quotas
                (admin_id, date, category, current_count, quota_limit, percentage)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (admin_id, date, category) DO UPDATE SET
                    current_count = EXCLUDED.current_count,
                    percentage = EXCLUDED.percentage
            """, (admin_id, today, category, current, limit, percentage))

        print(f"  Seeded {len(quotas)} daily quota entries")

        # 5. Seed Panel Statistics
        print("\n[5/5] Seeding panel statistics...")

        # Dashboard panel stats
        dashboard_stats = [
            ('active_courses', '245', 'number', 'Active Courses', 1),
            ('pending_courses', '18', 'number', 'Pending Courses', 2),
            ('rejected_courses', '12', 'number', 'Rejected Courses', 3),
            ('suspended_courses', '8', 'number', 'Suspended Courses', 4),
            ('archived_courses', '89', 'number', 'Archived Courses', 5),
            ('approval_rate', '92%', 'percentage', 'Approval Rate', 6),
            ('avg_processing', '< 1hr', 'duration', 'Avg Processing', 7),
            ('client_satisfaction', '96%', 'percentage', 'Client Satisfaction', 8)
        ]

        for stat_key, value, stype, label, order in dashboard_stats:
            cursor.execute("""
                INSERT INTO admin_panel_statistics
                (admin_id, panel_name, stat_key, stat_value, stat_type, display_label, display_order)
                VALUES (%s, 'dashboard', %s, %s, %s, %s, %s)
                ON CONFLICT (admin_id, panel_name, stat_key) DO UPDATE SET
                    stat_value = EXCLUDED.stat_value
            """, (admin_id, stat_key, value, stype, label, order))

        # Verified panel stats
        verified_stats = [
            ('total_active', '245', 'number', 'Total Active', 1),
            ('academic_courses', '178', 'number', 'Academic Courses', 2),
            ('professional_courses', '67', 'number', 'Professional Courses', 3),
            ('average_rating', '4.6/5', 'text', 'Average Rating', 4)
        ]

        for stat_key, value, stype, label, order in verified_stats:
            cursor.execute("""
                INSERT INTO admin_panel_statistics
                (admin_id, panel_name, stat_key, stat_value, stat_type, display_label, display_order)
                VALUES (%s, 'verified', %s, %s, %s, %s, %s)
                ON CONFLICT (admin_id, panel_name, stat_key) DO UPDATE SET
                    stat_value = EXCLUDED.stat_value
            """, (admin_id, stat_key, value, stype, label, order))

        # Requested panel stats
        requested_stats = [
            ('new_requests', '18', 'number', 'New Requests', 1),
            ('under_review', '5', 'number', 'Under Review', 2),
            ('approved_today', '3', 'number', 'Approved Today', 3),
            ('average_processing', '2.5 days', 'duration', 'Average Processing', 4)
        ]

        for stat_key, value, stype, label, order in requested_stats:
            cursor.execute("""
                INSERT INTO admin_panel_statistics
                (admin_id, panel_name, stat_key, stat_value, stat_type, display_label, display_order)
                VALUES (%s, 'requested', %s, %s, %s, %s, %s)
                ON CONFLICT (admin_id, panel_name, stat_key) DO UPDATE SET
                    stat_value = EXCLUDED.stat_value
            """, (admin_id, stat_key, value, stype, label, order))

        # Rejected panel stats
        rejected_stats = [
            ('total_rejected', '12', 'number', 'Total Rejected', 1),
            ('this_month', '4', 'number', 'This Month', 2),
            ('reconsidered', '2', 'number', 'Reconsidered', 3),
            ('main_reason', 'Quality Issues', 'text', 'Main Reason', 4)
        ]

        for stat_key, value, stype, label, order in rejected_stats:
            cursor.execute("""
                INSERT INTO admin_panel_statistics
                (admin_id, panel_name, stat_key, stat_value, stat_type, display_label, display_order)
                VALUES (%s, 'rejected', %s, %s, %s, %s, %s)
                ON CONFLICT (admin_id, panel_name, stat_key) DO UPDATE SET
                    stat_value = EXCLUDED.stat_value
            """, (admin_id, stat_key, value, stype, label, order))

        # Suspended panel stats
        suspended_stats = [
            ('currently_suspended', '8', 'number', 'Currently Suspended', 1),
            ('quality_issues', '3', 'number', 'Quality Issues', 2),
            ('under_investigation', '5', 'number', 'Under Investigation', 3),
            ('reinstated_this_year', '12', 'number', 'Reinstated This Year', 4)
        ]

        for stat_key, value, stype, label, order in suspended_stats:
            cursor.execute("""
                INSERT INTO admin_panel_statistics
                (admin_id, panel_name, stat_key, stat_value, stat_type, display_label, display_order)
                VALUES (%s, 'suspended', %s, %s, %s, %s, %s)
                ON CONFLICT (admin_id, panel_name, stat_key) DO UPDATE SET
                    stat_value = EXCLUDED.stat_value
            """, (admin_id, stat_key, value, stype, label, order))

        total_stats = len(dashboard_stats) + len(verified_stats) + len(requested_stats) + len(rejected_stats) + len(suspended_stats)
        print(f"  Seeded {total_stats} panel statistics across 5 panels")

        conn.commit()
        print("\n[SUCCESS] Admin dashboard data seeded successfully!")
        print("\nSeeded data:")
        print(f"  - {len(achievements)} achievements")
        print("  - 1 fire streak record")
        print("  - 1 profile stats record")
        print(f"  - {len(quotas)} daily quota entries")
        print(f"  - {total_stats} panel statistics")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Error seeding data: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    seed_data()
