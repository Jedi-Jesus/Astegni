"""
Seed Manage Campaigns Profile Data
Creates sample admin profile and campaign management profile data for testing
"""

import psycopg
from dotenv import load_dotenv
import os
import sys
import json
from datetime import datetime, date

# Set console encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def get_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL)

def seed_campaigns_admin():
    """Seed campaign management admin profile"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        print("Seeding Campaign Management Admin Profile...")

        # Check if admin already exists
        cursor.execute("SELECT id FROM admin_profile WHERE email = %s", ('campaigns@astegni.et',))
        existing = cursor.fetchone()

        if existing:
            admin_id = existing[0]
            print(f"✓ Admin profile already exists (ID: {admin_id})")
        else:
            # Insert admin_profile
            cursor.execute("""
                INSERT INTO admin_profile
                (email, password_hash, first_name, father_name, grandfather_name,
                 phone_number, bio, quote, departments, username, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                'campaigns@astegni.et',
                '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5aDzqiS9U7jTW',  # hashed 'password123'
                'Abebe',
                'Kebede',
                'Tesfa',
                '+251911234567',
                'Senior System Administrator specializing in advertising campaign management and revenue optimization. Expert in advertiser relations and campaign performance analytics.',
                'Maximizing ROI through strategic campaign management and advertiser partnerships.',
                ['manage-campaigns'],  # NOTE: Use lowercase with hyphens
                'abebe_campaigns',
                datetime.now()
            ))

            admin_id = cursor.fetchone()[0]
            print(f"✓ Created admin_profile (ID: {admin_id})")

        # Check if manage_campaigns_profile exists
        cursor.execute("SELECT id FROM manage_campaigns_profile WHERE admin_id = %s", (admin_id,))
        existing_profile = cursor.fetchone()

        if existing_profile:
            print(f"✓ Campaign management profile already exists")
        else:
            # Insert manage_campaigns_profile
            badges_json = json.dumps([
                {"icon": "🏆", "name": "Top Performer", "description": "Q4 2024"},
                {"icon": "🥇", "name": "Excellence", "description": "Annual 2023"},
                {"icon": "⭐", "name": "5-Star Admin", "description": "200+ Reviews"}
            ])
            permissions_json = json.dumps({
                "can_approve": True,
                "can_reject": True,
                "can_suspend": True,
                "can_edit_budget": True
            })

            cursor.execute("""
                INSERT INTO manage_campaigns_profile
                (admin_id, position, joined_date, rating, total_reviews, badges,
                 campaigns_approved, campaigns_rejected, campaigns_suspended,
                 total_budget_managed, avg_campaign_performance, permissions, username)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s::jsonb, %s)
                RETURNING id
            """, (
                admin_id,
                'Marketing & Advertising Manager',
                date(2020, 2, 1),
                4.8,
                312,
                badges_json,
                125,  # campaigns_approved
                5,    # campaigns_rejected
                3,    # campaigns_suspended
                2500000.00,  # total_budget_managed (2.5M ETB)
                87.5,  # avg_campaign_performance
                permissions_json,
                'abebe_campaigns'
            ))

            profile_id = cursor.fetchone()[0]
            print(f"✓ Created manage_campaigns_profile (ID: {profile_id})")

        # Seed some admin reviews for this admin
        seed_campaign_reviews(cursor, admin_id)

        conn.commit()
        print("\n✅ Campaign Management Profile Seeding Complete!")

        # Print summary
        print("\n" + "="*50)
        print("CAMPAIGN ADMIN LOGIN CREDENTIALS:")
        print("="*50)
        print(f"Email: campaigns@astegni.et")
        print(f"Password: password123")
        print(f"Admin ID: {admin_id}")
        print(f"Department: Campaign Management")
        print("="*50)

    except Exception as e:
        conn.rollback()
        print(f"❌ Error seeding data: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def seed_campaign_reviews(cursor, admin_id):
    """Seed sample reviews for campaign admin"""
    print("Seeding campaign admin reviews...")

    # Check if reviews already exist
    cursor.execute("SELECT COUNT(*) FROM admin_reviews WHERE admin_id = %s", (admin_id,))
    count = cursor.fetchone()[0]

    if count > 0:
        print(f"✓ {count} reviews already exist")
        return

    # NOTE: Department names use lowercase with hyphens (e.g., "manage-campaigns")
    reviews = [
        {
            "reviewer_name": "Marketing Director",
            "reviewer_role": "Director",
            "rating": 5.0,
            "response_time_rating": 5.0,
            "accuracy_rating": 5.0,
            "comment": "Exceptional handling of campaign relationships. Revenue increased by 25% this quarter.",
            "review_type": "performance",
            "department": "manage-campaigns"
        },
        {
            "reviewer_name": "Sales Team Lead",
            "reviewer_role": "Team Lead",
            "rating": 5.0,
            "response_time_rating": 4.5,
            "accuracy_rating": 5.0,
            "comment": "Campaign approvals are processed within hours. Great communication with clients.",
            "review_type": "performance",
            "department": "manage-campaigns"
        },
        {
            "reviewer_name": "Finance Department",
            "reviewer_role": "Manager",
            "rating": 4.0,
            "response_time_rating": 4.0,
            "accuracy_rating": 4.5,
            "comment": "Consistently meets revenue targets. Excellent campaign retention rate.",
            "review_type": "performance",
            "department": "manage-campaigns"
        },
        {
            "reviewer_name": "Advertiser Client",
            "reviewer_role": "Client",
            "rating": 5.0,
            "response_time_rating": 5.0,
            "accuracy_rating": 5.0,
            "comment": "Professional service and quick turnaround on campaign approvals. Highly recommended!",
            "review_type": "client_feedback",
            "department": "manage-campaigns"
        },
        {
            "reviewer_name": "Content Team",
            "reviewer_role": "Staff",
            "rating": 4.5,
            "response_time_rating": 4.5,
            "accuracy_rating": 4.5,
            "comment": "Very responsive to campaign quality concerns. Maintains high standards.",
            "review_type": "internal",
            "department": "manage-campaigns"
        }
    ]

    for i, review in enumerate(reviews, 1):
        review_id = f"REV-CAM-{str(i).zfill(3)}"

        cursor.execute("""
            INSERT INTO admin_reviews
            (review_id, admin_id, admin_name, reviewer_name, reviewer_role,
             rating, response_time_rating, accuracy_rating, comment,
             review_type, department, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            review_id,
            admin_id,
            'Abebe Kebede',
            review['reviewer_name'],
            review['reviewer_role'],
            review['rating'],
            review['response_time_rating'],
            review['accuracy_rating'],
            review['comment'],
            review['review_type'],
            review['department'],
            datetime.now()
        ))

    print(f"✓ Created {len(reviews)} sample reviews")

if __name__ == "__main__":
    seed_campaigns_admin()
