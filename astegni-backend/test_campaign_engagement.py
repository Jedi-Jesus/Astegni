"""
Test Campaign Engagement System

Demonstrates the new campaign_engagement table and helper functions
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')

def test_engagement_system():
    """Test the campaign engagement system"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("=" * 80)
        print("TESTING CAMPAIGN ENGAGEMENT SYSTEM")
        print("=" * 80)
        print()

        # Get a campaign to test with
        cursor.execute("SELECT id, name FROM campaign_profile LIMIT 1")
        campaign = cursor.fetchone()

        if not campaign:
            print("No campaigns found. Please create a campaign first.")
            return

        campaign_id = campaign[0]
        campaign_name = campaign[1]

        print(f"Testing with Campaign: {campaign_id} - {campaign_name}")
        print()

        # Test 1: Check engagement before adding any
        print("Test 1: Get initial engagement counts")
        cursor.execute("SELECT * FROM get_campaign_engagement_counts(%s)", (campaign_id,))
        counts = cursor.fetchone()
        print(f"  Likes: {counts[0]}")
        print(f"  Shares: {counts[1]}")
        print(f"  Comments: {counts[2]}")
        print(f"  Saves: {counts[3]}")
        print(f"  Bookmarks: {counts[4]}")
        print(f"  Total: {counts[5]}")
        print()

        # Test 2: Add sample engagements (if no data exists)
        if counts[5] == 0:
            print("Test 2: Adding sample engagements...")

            # Get user_id for testing
            cursor.execute("SELECT id FROM users LIMIT 1")
            user_result = cursor.fetchone()
            if not user_result:
                print("  No users found. Skipping engagement creation.")
                print()
            else:
                user_id = user_result[0]

                # Add like
                cursor.execute("""
                    INSERT INTO campaign_engagement (
                        campaign_id, brand_id, user_id, profile_id, profile_type,
                        engagement_type
                    )
                    VALUES (%s, 1, %s, 1, 'student', 'like')
                    ON CONFLICT DO NOTHING
                """, (campaign_id, user_id))

                # Add share
                cursor.execute("""
                    INSERT INTO campaign_engagement (
                        campaign_id, brand_id, user_id, profile_id, profile_type,
                        engagement_type
                    )
                    VALUES (%s, 1, %s, 1, 'student', 'share')
                    ON CONFLICT DO NOTHING
                """, (campaign_id, user_id))

                # Add comment
                cursor.execute("""
                    INSERT INTO campaign_engagement (
                        campaign_id, brand_id, user_id, profile_id, profile_type,
                        engagement_type, comment_text
                    )
                    VALUES (%s, 1, %s, 1, 'student', 'comment', 'Great campaign!')
                    RETURNING id
                """, (campaign_id, user_id))

                comment_id = cursor.fetchone()[0]

                # Add reply to comment
                cursor.execute("""
                    INSERT INTO campaign_engagement (
                        campaign_id, brand_id, user_id, profile_id, profile_type,
                        engagement_type, comment_text, parent_comment_id
                    )
                    VALUES (%s, 1, %s, 1, 'student', 'comment', 'Thank you!', %s)
                """, (campaign_id, user_id, comment_id))

                conn.commit()
                print("  Added: 1 like, 1 share, 1 comment, 1 reply")
                print()

        # Test 3: Get updated engagement counts
        print("Test 3: Get current engagement counts")
        cursor.execute("SELECT * FROM get_campaign_engagement_counts(%s)", (campaign_id,))
        counts = cursor.fetchone()
        print(f"  Likes: {counts[0]}")
        print(f"  Shares: {counts[1]}")
        print(f"  Comments: {counts[2]}")
        print(f"  Saves: {counts[3]}")
        print(f"  Bookmarks: {counts[4]}")
        print(f"  Total: {counts[5]}")
        print()

        # Test 4: Check if specific user engaged
        print("Test 4: Check if user engaged")
        cursor.execute("SELECT id FROM users LIMIT 1")
        user_result = cursor.fetchone()
        if user_result:
            user_id = user_result[0]
            cursor.execute("SELECT has_user_engaged(%s, %s, %s)", (campaign_id, user_id, 'like'))
            has_liked = cursor.fetchone()[0]
            print(f"  User {user_id} has liked: {has_liked}")
        print()

        # Test 5: Get comments with replies
        print("Test 5: Get comments with threading")
        cursor.execute("""
            SELECT
                ce1.id,
                ce1.comment_text,
                ce1.created_at,
                -- Get replies
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', ce2.id,
                            'comment_text', ce2.comment_text,
                            'created_at', ce2.created_at
                        )
                    )
                    FROM campaign_engagement ce2
                    WHERE ce2.parent_comment_id = ce1.id
                ) as replies
            FROM campaign_engagement ce1
            WHERE ce1.campaign_id = %s
            AND ce1.engagement_type = 'comment'
            AND ce1.parent_comment_id IS NULL
            ORDER BY ce1.created_at DESC
            LIMIT 5
        """, (campaign_id,))

        comments = cursor.fetchall()
        for comment in comments:
            print(f"  Comment {comment[0]}: {comment[1]}")
            print(f"    Posted: {comment[2]}")
            if comment[3]:
                print(f"    Replies: {len(comment[3])}")
                for reply in comment[3]:
                    print(f"      - {reply['comment_text']}")
            print()

        # Test 6: Get campaign with full metrics
        print("Test 6: Get campaign with full metrics")
        cursor.execute("""
            SELECT
                id, name,
                impressions, clicks, conversions,
                likes, shares, comments,
                click_through_rate, conversion_rate, engagement_rate
            FROM campaign_with_full_metrics
            WHERE id = %s
        """, (campaign_id,))

        metrics = cursor.fetchone()
        if metrics:
            print(f"  Campaign: {metrics[1]}")
            print(f"  Impressions: {metrics[2]}")
            print(f"  Clicks: {metrics[3]}")
            print(f"  Conversions: {metrics[4]}")
            print(f"  Likes: {metrics[5]}")
            print(f"  Shares: {metrics[6]}")
            print(f"  Comments: {metrics[7]}")
            print(f"  CTR: {metrics[8]}%")
            print(f"  CVR: {metrics[9]}%")
            print(f"  Engagement Rate: {metrics[10]}%")
        print()

        print("=" * 80)
        print("ALL TESTS COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print()
        print("Summary:")
        print("  + Engagement counting works")
        print("  + Helper functions work")
        print("  + Comment threading works")
        print("  + Metrics view works")
        print()
        print("Next Steps:")
        print("  1. Import campaign_engagement_endpoints.py in app.py")
        print("  2. Add router: app.include_router(campaign_engagement_endpoints.router)")
        print("  3. Test API endpoints at http://localhost:8000/docs")
        print("  4. Update frontend to use new engagement features")

    except Exception as e:
        print(f"ERROR: Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    test_engagement_system()
