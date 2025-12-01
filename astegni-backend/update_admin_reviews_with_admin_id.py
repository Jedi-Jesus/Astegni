"""
Update admin_reviews to properly link to specific admins
- Add foreign key constraint to admin_profile
- Update existing reviews to link to real admins
- Update endpoints to filter by admin_id
"""

import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")

    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_part = host_db.split("/")
    db_name = db_part.split("?")[0]

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    conn = psycopg.connect(
        dbname=db_name,
        user=user,
        password=password,
        host=host,
        port=port
    )
    return conn

def update_admin_reviews():
    """Update admin_reviews table structure and data"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print("=" * 80)
        print("UPDATING ADMIN_REVIEWS TO USE ADMIN_ID")
        print("=" * 80)

        # Step 1: Add foreign key constraint if not exists
        print("\n[1/4] Adding foreign key constraint to admin_profile...")

        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'admin_reviews_admin_id_fkey'
                AND table_name = 'admin_reviews'
            )
        """)
        fk_exists = cursor.fetchone()[0]

        if not fk_exists:
            cursor.execute("""
                ALTER TABLE admin_reviews
                ADD CONSTRAINT admin_reviews_admin_id_fkey
                FOREIGN KEY (admin_id) REFERENCES admin_profile(id) ON DELETE CASCADE
            """)
            print("   [OK] Foreign key constraint added")
        else:
            print("   [OK] Foreign key constraint already exists")

        # Step 2: Get existing admins
        print("\n[2/4] Getting existing admins...")
        cursor.execute("""
            SELECT id, email, first_name, father_name
            FROM admin_profile
            ORDER BY id
        """)
        admins = cursor.fetchall()

        if not admins:
            print("   [ERROR] No admins found in database!")
            return

        print(f"   [OK] Found {len(admins)} admins")
        for admin in admins:
            print(f"      - Admin ID {admin[0]}: {admin[2]} {admin[3]} ({admin[1]})")

        # Step 3: Clear old generic reviews
        print("\n[3/4] Clearing old generic reviews...")
        cursor.execute("DELETE FROM admin_reviews")
        print("   [OK] Old reviews cleared")

        # Step 4: Create reviews for first admin (the one currently logged in)
        print("\n[4/4] Creating admin-specific reviews...")

        # Use the first admin with a real email (jediael.s.abebe@gmail.com, id=4)
        target_admin = next((a for a in admins if 'jediael' in a[1].lower()), admins[0])
        admin_id = target_admin[0]
        admin_name = f"{target_admin[2]} {target_admin[3]}"
        admin_email = target_admin[1]

        print(f"   Creating reviews for: {admin_name} (ID: {admin_id}, Email: {admin_email})")

        sample_reviews = [
            {
                'review_id': 'REV-ADM-001',
                'admin_id': admin_id,
                'admin_name': admin_name,
                'reviewer_name': 'Marketing Director',
                'reviewer_role': 'Department Head',
                'rating': 4.8,
                'response_time_rating': 5.0,
                'accuracy_rating': 4.5,
                'comment': f'Outstanding course management by {admin_name}. Exceptional handling of course approvals. Course completion rate increased by 25% this quarter.',
                'review_type': 'performance',
                'metrics': '{"courses_approved": 245, "approval_time_avg": "45 minutes", "rejection_rate": 8}'
            },
            {
                'review_id': 'REV-ADM-002',
                'admin_id': admin_id,
                'admin_name': admin_name,
                'reviewer_name': 'Sales Team',
                'reviewer_role': 'Team Lead',
                'rating': 5.0,
                'response_time_rating': 5.0,
                'accuracy_rating': 5.0,
                'comment': 'Quick Approval Process. Course approvals are processed within hours. Great communication with instructors.',
                'review_type': 'efficiency',
                'metrics': '{"avg_response_time": "32 minutes", "same_day_approval_rate": 95}'
            },
            {
                'review_id': 'REV-ADM-003',
                'admin_id': admin_id,
                'admin_name': admin_name,
                'reviewer_name': 'Finance Department',
                'reviewer_role': 'Financial Controller',
                'rating': 4.2,
                'response_time_rating': 4.0,
                'accuracy_rating': 4.5,
                'comment': 'Course Revenue Growth Expert. Consistently meets course enrollment targets. Excellent instructor retention rate.',
                'review_type': 'financial',
                'metrics': '{"revenue_growth": 25, "retention_rate": 92}'
            },
            {
                'review_id': 'REV-ADM-004',
                'admin_id': admin_id,
                'admin_name': admin_name,
                'reviewer_name': 'Dr. Alemayehu Bekele',
                'reviewer_role': 'Senior Instructor',
                'rating': 4.9,
                'response_time_rating': 5.0,
                'accuracy_rating': 4.8,
                'comment': 'My course approval was handled professionally and quickly. The feedback on my course content was constructive and helpful.',
                'review_type': 'instructor_feedback',
                'related_course_id': 'CRS-001',
                'metrics': '{"approval_time": "28 minutes"}'
            },
            {
                'review_id': 'REV-ADM-005',
                'admin_id': admin_id,
                'admin_name': admin_name,
                'reviewer_name': 'Quality Assurance Team',
                'reviewer_role': 'QA Lead',
                'rating': 4.7,
                'response_time_rating': 4.5,
                'accuracy_rating': 5.0,
                'comment': 'Excellent attention to detail. Very few course approvals need revision. Rejection reasons are always clear and justified.',
                'review_type': 'quality',
                'metrics': '{"accuracy_score": 98, "revision_rate": 2}'
            },
            {
                'review_id': 'REV-ADM-006',
                'admin_id': admin_id,
                'admin_name': admin_name,
                'reviewer_name': 'Student Services',
                'reviewer_role': 'Service Director',
                'rating': 4.6,
                'response_time_rating': 4.3,
                'accuracy_rating': 4.8,
                'comment': 'Course quality has improved significantly. Students report high satisfaction with approved courses.',
                'review_type': 'student_impact',
                'metrics': '{"student_satisfaction": 96, "course_completion_rate": 87}'
            },
            {
                'review_id': 'REV-ADM-007',
                'admin_id': admin_id,
                'admin_name': admin_name,
                'reviewer_name': 'Technology Department',
                'reviewer_role': 'Tech Manager',
                'rating': 4.4,
                'response_time_rating': 4.2,
                'accuracy_rating': 4.6,
                'comment': 'Good coordination on technical course approvals. Would appreciate faster response on weekend submissions.',
                'review_type': 'operational',
                'metrics': '{"weekend_response_time": "4 hours"}'
            },
            {
                'review_id': 'REV-ADM-008',
                'admin_id': admin_id,
                'admin_name': admin_name,
                'reviewer_name': 'Prof. Tigist Haile',
                'reviewer_role': 'University Professor',
                'rating': 5.0,
                'response_time_rating': 5.0,
                'accuracy_rating': 5.0,
                'comment': 'Phenomenal support! My advanced chemistry course was approved in record time with excellent feedback.',
                'review_type': 'instructor_feedback',
                'related_course_id': 'CRS-002',
                'metrics': '{"approval_time": "15 minutes", "feedback_quality": "excellent"}'
            }
        ]

        for review in sample_reviews:
            cursor.execute("""
                INSERT INTO admin_reviews
                (review_id, admin_id, admin_name, reviewer_name, reviewer_role, rating,
                 response_time_rating, accuracy_rating, comment, review_type,
                 related_course_id, metrics, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb,
                        CURRENT_TIMESTAMP - (random() * interval '30 days'))
            """, (
                review['review_id'],
                review['admin_id'],
                review['admin_name'],
                review['reviewer_name'],
                review['reviewer_role'],
                review['rating'],
                review['response_time_rating'],
                review['accuracy_rating'],
                review['comment'],
                review['review_type'],
                review.get('related_course_id'),
                review['metrics']
            ))

        print(f"   [OK] Added {len(sample_reviews)} reviews for {admin_name}")

        # Show summary
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        cursor.execute("""
            SELECT
                ar.admin_id,
                ap.email,
                ap.first_name || ' ' || ap.father_name as admin_name,
                COUNT(*) as review_count,
                ROUND(AVG(ar.rating)::numeric, 2) as avg_rating
            FROM admin_reviews ar
            JOIN admin_profile ap ON ar.admin_id = ap.id
            GROUP BY ar.admin_id, ap.email, ap.first_name, ap.father_name
        """)

        results = cursor.fetchall()
        print("\nReviews by Admin:")
        for row in results:
            print(f"  - Admin ID {row[0]}: {row[2]} ({row[1]})")
            print(f"    Reviews: {row[3]}, Average Rating: {row[4]}")

        conn.commit()

        print("\n" + "=" * 80)
        print("UPDATE COMPLETE!")
        print("=" * 80)
        print("\nNext Steps:")
        print("  1. Update frontend to pass admin_id when fetching reviews")
        print("  2. Update endpoints to filter by admin_id")
        print("  3. If an admin has no reviews, show 'No reviews yet' message")
        print("=" * 80)

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Update failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    update_admin_reviews()
