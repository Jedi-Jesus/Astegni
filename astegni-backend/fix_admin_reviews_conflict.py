"""
Fix admin_reviews table conflict
Rename existing table to astegni_platform_reviews and create new admin performance reviews table
"""

import os
import psycopg
from dotenv import load_dotenv
from datetime import datetime, timezone

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

def fix_admin_reviews_conflict():
    """Fix the admin_reviews table conflict"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print("=" * 80)
        print("FIXING ADMIN_REVIEWS TABLE CONFLICT")
        print("=" * 80)

        # Step 1: Check if old admin_reviews table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'admin_reviews'
            )
        """)
        old_table_exists = cursor.fetchone()[0]

        if old_table_exists:
            print("\n[1/3] Renaming existing admin_reviews to astegni_platform_reviews...")

            # Check if astegni_platform_reviews already exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'astegni_platform_reviews'
                )
            """)
            platform_table_exists = cursor.fetchone()[0]

            if platform_table_exists:
                print("   [WARNING] astegni_platform_reviews already exists, dropping old admin_reviews...")
                cursor.execute("DROP TABLE admin_reviews CASCADE")
            else:
                cursor.execute("ALTER TABLE admin_reviews RENAME TO astegni_platform_reviews")
                print("   [OK] Table renamed successfully")
        else:
            print("\n[1/3] No existing admin_reviews table found")

        # Step 2: Create new admin performance reviews table
        print("\n[2/3] Creating new admin performance reviews table...")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_reviews (
                id SERIAL PRIMARY KEY,
                review_id VARCHAR(50) UNIQUE NOT NULL,
                admin_id INTEGER,
                admin_name VARCHAR(255) NOT NULL,
                reviewer_name VARCHAR(255) NOT NULL,
                reviewer_role VARCHAR(50),
                rating DECIMAL(2,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
                response_time_rating DECIMAL(2,1) CHECK (response_time_rating >= 1.0 AND response_time_rating <= 5.0),
                accuracy_rating DECIMAL(2,1) CHECK (accuracy_rating >= 1.0 AND accuracy_rating <= 5.0),
                comment TEXT,
                review_type VARCHAR(50) DEFAULT 'general',
                related_course_id VARCHAR(50),
                metrics JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("   [OK] admin_reviews table created")

        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_admin_reviews_admin_id
            ON admin_reviews(admin_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_admin_reviews_rating
            ON admin_reviews(rating)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_admin_reviews_created_at
            ON admin_reviews(created_at DESC)
        """)
        print("   [OK] Indexes created")

        # Step 3: Seed sample data
        print("\n[3/3] Seeding sample admin performance reviews...")

        cursor.execute("SELECT COUNT(*) FROM admin_reviews")
        count = cursor.fetchone()[0]

        if count > 0:
            print(f"   [WARNING] Table already has {count} reviews, skipping seed")
        else:
            sample_reviews = [
                {
                    'review_id': 'REV-ADM-001',
                    'admin_name': 'Course Management',
                    'reviewer_name': 'Marketing Director',
                    'reviewer_role': 'Department Head',
                    'rating': 4.8,
                    'response_time_rating': 5.0,
                    'accuracy_rating': 4.5,
                    'comment': 'Outstanding campaign management. Exceptional handling of advertiser relationships. Revenue increased by 25% this quarter.',
                    'review_type': 'performance',
                    'metrics': '{"courses_approved": 245, "approval_time_avg": "45 minutes", "rejection_rate": 8}'
                },
                {
                    'review_id': 'REV-ADM-002',
                    'admin_name': 'Course Management',
                    'reviewer_name': 'Sales Team',
                    'reviewer_role': 'Team Lead',
                    'rating': 5.0,
                    'response_time_rating': 5.0,
                    'accuracy_rating': 5.0,
                    'comment': 'Quick Approval Process. Campaign approvals are processed within hours. Great communication with clients.',
                    'review_type': 'efficiency',
                    'metrics': '{"avg_response_time": "32 minutes", "same_day_approval_rate": 95}'
                },
                {
                    'review_id': 'REV-ADM-003',
                    'admin_name': 'Course Management',
                    'reviewer_name': 'Finance Department',
                    'reviewer_role': 'Financial Controller',
                    'rating': 4.2,
                    'response_time_rating': 4.0,
                    'accuracy_rating': 4.5,
                    'comment': 'Revenue Growth Expert. Consistently meets revenue targets. Excellent advertiser retention rate.',
                    'review_type': 'financial',
                    'metrics': '{"revenue_growth": 25, "retention_rate": 92}'
                },
                {
                    'review_id': 'REV-ADM-004',
                    'admin_name': 'Course Management',
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
                    'admin_name': 'Course Management',
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
                    'admin_name': 'Course Management',
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
                    'admin_name': 'Course Management',
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
                    'admin_name': 'Course Management',
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
                    (review_id, admin_name, reviewer_name, reviewer_role, rating,
                     response_time_rating, accuracy_rating, comment, review_type,
                     related_course_id, metrics, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb,
                            CURRENT_TIMESTAMP - (random() * interval '30 days'))
                """, (
                    review['review_id'],
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

            print(f"   [OK] Added {len(sample_reviews)} sample reviews")

        conn.commit()

        print("\n" + "=" * 80)
        print("MIGRATION COMPLETE!")
        print("=" * 80)
        print("\nSummary:")
        print("  - Old table renamed: admin_reviews → astegni_platform_reviews")
        print("  - New table created: admin_reviews (for admin performance reviews)")
        print("  - Sample data: 8 performance reviews added")
        print("\nThe manage-courses page should now load reviews successfully!")
        print("=" * 80)

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    fix_admin_reviews_conflict()
