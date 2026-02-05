"""
Migration: Update astegni_reviews table
1. Remove reviewer_role column (review should be user-based, not role-based)
2. Rename overall_value to pricing (consistent with other category ratings)
Database: astegni_admin_db
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

def migrate():
    """Update astegni_reviews table: remove reviewer_role, rename overall_value to pricing"""
    try:
        with psycopg.connect(ADMIN_DATABASE_URL) as conn:
            with conn.cursor() as cur:
                print("Starting migration: Update astegni_reviews table...")
                print("=" * 80)

                # Check if table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'astegni_reviews'
                    );
                """)
                table_exists = cur.fetchone()[0]

                if not table_exists:
                    print("ERROR: astegni_reviews table does not exist!")
                    return

                print("\n[TABLE] Current table structure:")
                cur.execute("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = 'astegni_reviews'
                    ORDER BY ordinal_position;
                """)
                columns = cur.fetchall()
                for col in columns:
                    print(f"  {col[0]:<25} {col[1]:<20} nullable={col[2]:<5} default={col[3]}")

                # Step 1: Remove reviewer_role column if it exists
                print("\n[STEP 1] Removing reviewer_role column...")
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns
                        WHERE table_name = 'astegni_reviews'
                        AND column_name = 'reviewer_role'
                    );
                """)
                reviewer_role_exists = cur.fetchone()[0]

                if reviewer_role_exists:
                    cur.execute("""
                        ALTER TABLE astegni_reviews
                        DROP COLUMN reviewer_role;
                    """)
                    print("  [OK] Removed reviewer_role column")
                else:
                    print("  [INFO] reviewer_role column does not exist, skipping")

                # Step 2: Rename overall_value to pricing if it exists
                print("\n[STEP 2] Renaming overall_value to pricing...")
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns
                        WHERE table_name = 'astegni_reviews'
                        AND column_name = 'overall_value'
                    );
                """)
                overall_value_exists = cur.fetchone()[0]

                if overall_value_exists:
                    # Check if pricing already exists
                    cur.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns
                            WHERE table_name = 'astegni_reviews'
                            AND column_name = 'pricing'
                        );
                    """)
                    pricing_exists = cur.fetchone()[0]

                    if pricing_exists:
                        print("  [WARNING] pricing column already exists, cannot rename overall_value")
                    else:
                        cur.execute("""
                            ALTER TABLE astegni_reviews
                            RENAME COLUMN overall_value TO pricing;
                        """)
                        print("  [OK] Renamed overall_value to pricing")
                else:
                    print("  [INFO] overall_value column does not exist, skipping")

                # Commit changes
                conn.commit()
                print("\n[SUCCESS] Migration completed successfully!")

                # Show updated table structure
                print("\n[TABLE] Updated table structure:")
                print("-" * 80)
                cur.execute("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = 'astegni_reviews'
                    ORDER BY ordinal_position;
                """)
                columns = cur.fetchall()
                for col in columns:
                    print(f"  {col[0]:<25} {col[1]:<20} nullable={col[2]:<5} default={col[3]}")
                print("-" * 80)

                # Show sample data
                print("\n[DATA] Sample data (first 3 reviews):")
                cur.execute("""
                    SELECT id, reviewer_id, rating, ease_of_use, features_quality,
                           support_quality, pricing, would_recommend, created_at
                    FROM astegni_reviews
                    ORDER BY created_at DESC
                    LIMIT 3;
                """)
                reviews = cur.fetchall()
                if reviews:
                    for review in reviews:
                        print(f"  ID: {review[0]}, Reviewer: {review[1]}, Rating: {review[2]}, "
                              f"Ease: {review[3]}, Features: {review[4]}, Support: {review[5]}, "
                              f"Pricing: {review[6]}, Recommend: {review[7]}")
                else:
                    print("  (No reviews found)")

    except Exception as e:
        print(f"\n[ERROR] ERROR during migration: {str(e)}")
        raise

if __name__ == "__main__":
    migrate()
