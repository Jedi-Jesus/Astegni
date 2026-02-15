"""
Campaign Engagement Endpoints

Handles social engagement with campaign ads:
- Like, share, comment, save, bookmark
- Comment threads and replies
- Engagement analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime
import psycopg
from app import get_current_user, get_db_connection

router = APIRouter()


# ============================================================================
# ENGAGEMENT ACTIONS
# ============================================================================

@router.post("/api/campaigns/{campaign_id}/engage")
async def engage_with_campaign(
    campaign_id: int,
    engagement_type: str,  # like, share, comment, save, bookmark
    comment_text: Optional[str] = None,
    impression_id: Optional[int] = None,
    parent_comment_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    User engages with campaign ad

    Engagement types:
    - like: Like the campaign ad
    - share: Share the campaign
    - comment: Comment on the campaign (requires comment_text)
    - save: Save campaign for later
    - bookmark: Bookmark the campaign
    """

    # Validate engagement type
    valid_types = ['like', 'share', 'comment', 'save', 'bookmark']
    if engagement_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid engagement type. Must be one of: {', '.join(valid_types)}")

    # Validate comment
    if engagement_type == 'comment' and not comment_text:
        raise HTTPException(status_code=400, detail="comment_text is required for comments")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get campaign details
        cursor.execute("""
            SELECT id, brand_id, status
            FROM campaign_profile
            WHERE id = %s
        """, (campaign_id,))

        campaign = cursor.fetchone()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        if campaign[2] != 'active':
            raise HTTPException(status_code=400, detail="Cannot engage with inactive campaign")

        brand_id = campaign[1]

        # For non-comment engagements, check if user already engaged
        if engagement_type != 'comment':
            cursor.execute("""
                SELECT has_user_engaged(%s, %s, %s)
            """, (campaign_id, current_user['user_id'], engagement_type))

            already_engaged = cursor.fetchone()[0]
            if already_engaged:
                raise HTTPException(status_code=400, detail=f"User already {engagement_type}d this campaign")

        # Get user's active profile
        user_id = current_user['user_id']
        active_role = current_user.get('active_role', 'student')

        # Get profile_id based on active role
        profile_id = current_user.get('student_id') or current_user.get('tutor_id') or current_user.get('parent_id')
        if not profile_id:
            raise HTTPException(status_code=400, detail="No active profile found")

        # Create engagement record
        cursor.execute("""
            INSERT INTO campaign_engagement (
                campaign_id, impression_id, brand_id,
                user_id, profile_id, profile_type,
                engagement_type, comment_text, parent_comment_id,
                created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            campaign_id, impression_id, brand_id,
            user_id, profile_id, active_role,
            engagement_type, comment_text, parent_comment_id,
            datetime.now(), datetime.now()
        ))

        result = cursor.fetchone()
        engagement_id = result[0]
        created_at = result[1]

        conn.commit()

        return {
            "success": True,
            "engagement_id": engagement_id,
            "engagement_type": engagement_type,
            "created_at": created_at
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.delete("/api/campaigns/{campaign_id}/engage/{engagement_type}")
async def remove_engagement(
    campaign_id: int,
    engagement_type: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove engagement (unlike, unshare, unsave, unbookmark)
    Note: Cannot remove comments this way (use delete_comment endpoint)
    """

    if engagement_type == 'comment':
        raise HTTPException(status_code=400, detail="Use DELETE /api/campaigns/{campaign_id}/comments/{comment_id} to delete comments")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = current_user['user_id']

        cursor.execute("""
            DELETE FROM campaign_engagement
            WHERE campaign_id = %s
            AND user_id = %s
            AND engagement_type = %s
            RETURNING id
        """, (campaign_id, user_id, engagement_type))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Engagement not found")

        conn.commit()

        return {
            "success": True,
            "message": f"{engagement_type} removed"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ============================================================================
# COMMENTS
# ============================================================================

@router.get("/api/campaigns/{campaign_id}/comments")
async def get_campaign_comments(
    campaign_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    parent_only: bool = Query(False, description="Get only top-level comments (no replies)")
):
    """
    Get comments for campaign with pagination
    """

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        offset = (page - 1) * limit

        # Build query
        parent_filter = "AND parent_comment_id IS NULL" if parent_only else ""

        cursor.execute(f"""
            SELECT
                ce.id,
                ce.user_id,
                ce.profile_id,
                ce.profile_type,
                ce.comment_text,
                ce.parent_comment_id,
                ce.created_at,
                ce.updated_at,
                u.email,
                -- Count replies
                (SELECT COUNT(*) FROM campaign_engagement
                 WHERE parent_comment_id = ce.id) as reply_count
            FROM campaign_engagement ce
            JOIN users u ON u.id = ce.user_id
            WHERE ce.campaign_id = %s
            AND ce.engagement_type = 'comment'
            {parent_filter}
            ORDER BY ce.created_at DESC
            LIMIT %s OFFSET %s
        """, (campaign_id, limit, offset))

        comments = cursor.fetchall()

        # Get total count
        cursor.execute(f"""
            SELECT COUNT(*)
            FROM campaign_engagement
            WHERE campaign_id = %s
            AND engagement_type = 'comment'
            {parent_filter}
        """, (campaign_id,))

        total = cursor.fetchone()[0]

        return {
            "comments": [
                {
                    "id": c[0],
                    "user_id": c[1],
                    "profile_id": c[2],
                    "profile_type": c[3],
                    "comment_text": c[4],
                    "parent_comment_id": c[5],
                    "created_at": c[6],
                    "updated_at": c[7],
                    "user_email": c[8],
                    "reply_count": c[9]
                }
                for c in comments
            ],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.get("/api/campaigns/{campaign_id}/comments/{comment_id}/replies")
async def get_comment_replies(
    campaign_id: int,
    comment_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get replies to a specific comment
    """

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        offset = (page - 1) * limit

        cursor.execute("""
            SELECT
                ce.id,
                ce.user_id,
                ce.profile_id,
                ce.profile_type,
                ce.comment_text,
                ce.created_at,
                ce.updated_at,
                u.email
            FROM campaign_engagement ce
            JOIN users u ON u.id = ce.user_id
            WHERE ce.parent_comment_id = %s
            AND ce.engagement_type = 'comment'
            ORDER BY ce.created_at ASC
            LIMIT %s OFFSET %s
        """, (comment_id, limit, offset))

        replies = cursor.fetchall()

        # Get total count
        cursor.execute("""
            SELECT COUNT(*)
            FROM campaign_engagement
            WHERE parent_comment_id = %s
            AND engagement_type = 'comment'
        """, (comment_id,))

        total = cursor.fetchone()[0]

        return {
            "replies": [
                {
                    "id": r[0],
                    "user_id": r[1],
                    "profile_id": r[2],
                    "profile_type": r[3],
                    "comment_text": r[4],
                    "created_at": r[5],
                    "updated_at": r[6],
                    "user_email": r[7]
                }
                for r in replies
            ],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.delete("/api/campaigns/{campaign_id}/comments/{comment_id}")
async def delete_comment(
    campaign_id: int,
    comment_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a comment (and all its replies via CASCADE)
    Only comment author can delete
    """

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = current_user['user_id']

        # Check if comment exists and belongs to user
        cursor.execute("""
            SELECT user_id
            FROM campaign_engagement
            WHERE id = %s AND campaign_id = %s AND engagement_type = 'comment'
        """, (comment_id, campaign_id))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Comment not found")

        if result[0] != user_id:
            raise HTTPException(status_code=403, detail="Cannot delete other users' comments")

        # Delete comment (CASCADE will delete replies)
        cursor.execute("""
            DELETE FROM campaign_engagement
            WHERE id = %s
        """, (comment_id,))

        conn.commit()

        return {
            "success": True,
            "message": "Comment deleted"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ============================================================================
# ENGAGEMENT ANALYTICS
# ============================================================================

@router.get("/api/campaigns/{campaign_id}/engagements")
async def get_campaign_engagements(
    campaign_id: int,
    engagement_type: Optional[str] = Query(None, description="Filter by type: like, share, comment, save, bookmark")
):
    """
    Get engagement counts and details for campaign
    """

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get engagement counts
        cursor.execute("""
            SELECT * FROM get_campaign_engagement_counts(%s)
        """, (campaign_id,))

        counts = cursor.fetchone()

        # Get recent engagements
        type_filter = "AND engagement_type = %s" if engagement_type else ""
        params = [campaign_id, engagement_type] if engagement_type else [campaign_id]

        cursor.execute(f"""
            SELECT
                engagement_type,
                COUNT(*) as count,
                COUNT(DISTINCT user_id) as unique_users
            FROM campaign_engagement
            WHERE campaign_id = %s
            {type_filter}
            GROUP BY engagement_type
            ORDER BY count DESC
        """, params)

        breakdown = cursor.fetchall()

        return {
            "campaign_id": campaign_id,
            "total_counts": {
                "likes": counts[0],
                "shares": counts[1],
                "comments": counts[2],
                "saves": counts[3],
                "bookmarks": counts[4],
                "total": counts[5]
            },
            "breakdown": [
                {
                    "type": b[0],
                    "count": b[1],
                    "unique_users": b[2]
                }
                for b in breakdown
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.get("/api/campaigns/{campaign_id}/engagements/check")
async def check_user_engagement(
    campaign_id: int,
    engagement_type: str = Query(..., description="Type to check: like, share, save, bookmark"),
    current_user: dict = Depends(get_current_user)
):
    """
    Check if current user has engaged with campaign
    """

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = current_user['user_id']

        cursor.execute("""
            SELECT has_user_engaged(%s, %s, %s)
        """, (campaign_id, user_id, engagement_type))

        has_engaged = cursor.fetchone()[0]

        return {
            "campaign_id": campaign_id,
            "engagement_type": engagement_type,
            "has_engaged": has_engaged
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.get("/api/campaigns/{campaign_id}/metrics")
async def get_campaign_metrics(campaign_id: int):
    """
    Get full campaign metrics including impressions and engagement
    """

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                id, name, status,
                cost_per_impression, total_impressions_planned,
                impressions, impressions_delivered, reach,
                clicks, conversions,
                likes, shares, comments, saves, bookmarks,
                viewability_rate, click_through_rate, conversion_rate, engagement_rate
            FROM campaign_with_full_metrics
            WHERE id = %s
        """, (campaign_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Campaign not found")

        return {
            "id": result[0],
            "name": result[1],
            "status": result[2],
            "config": {
                "cost_per_impression": float(result[3]) if result[3] else None,
                "total_impressions_planned": result[4]
            },
            "impressions": {
                "total": result[5],
                "delivered": result[6],
                "reach": result[7]
            },
            "actions": {
                "clicks": result[8],
                "conversions": result[9]
            },
            "engagement": {
                "likes": result[10],
                "shares": result[11],
                "comments": result[12],
                "saves": result[13],
                "bookmarks": result[14]
            },
            "rates": {
                "viewability_rate": float(result[15]) if result[15] else None,
                "click_through_rate": float(result[16]) if result[16] else None,
                "conversion_rate": float(result[17]) if result[17] else None,
                "engagement_rate": float(result[18]) if result[18] else None
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
