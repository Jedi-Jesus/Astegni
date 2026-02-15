"""
Simple Campaign Impression & Click Tracking
Lightweight tracking without complex billing logic
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import psycopg
import os
from dotenv import load_dotenv
import hashlib

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

router = APIRouter(prefix="/api/campaign", tags=["Campaign Tracking"])


class ImpressionTrack(BaseModel):
    campaign_id: int
    user_id: Optional[int] = None
    profile_id: Optional[int] = None
    profile_type: Optional[str] = None
    placement: str
    location: Optional[str] = None
    audience: Optional[str] = None
    region: Optional[str] = None
    device_type: Optional[str] = None


class ClickTrack(BaseModel):
    campaign_id: int
    impression_id: Optional[int] = None
    user_id: Optional[int] = None


def get_db():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL)


@router.post("/track-impression")
async def track_impression(request: Request, impression: ImpressionTrack):
    """
    Track a campaign impression (simplified version)

    Just logs that an ad was shown - no complex billing logic
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Verify campaign exists and is active
        cursor.execute("""
            SELECT id, name, campaign_status
            FROM campaign_profile
            WHERE id = %s
        """, (impression.campaign_id,))

        campaign = cursor.fetchone()

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        campaign_id = campaign[0]
        campaign_name = campaign[1]
        campaign_status = campaign[2]

        # Only track impressions for active campaigns
        if campaign_status != 'active':
            return {
                "success": False,
                "message": f"Campaign is {campaign_status}, impression not tracked"
            }

        # Get client IP for session tracking
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")

        # Generate session ID for unique impression tracking
        session_data = f"{impression.user_id}_{client_ip}_{user_agent}_{impression.placement}"
        session_id = hashlib.md5(session_data.encode()).hexdigest()[:32]

        # Log impression (simplified - just track that ad was shown)
        # You can extend this to log to a proper impressions table if needed
        print(f"[IMPRESSION] Campaign #{campaign_id} ({campaign_name}) | Placement: {impression.placement} | Session: {session_id[:8]}")

        # Return success
        return {
            "success": True,
            "campaign_id": campaign_id,
            "campaign_name": campaign_name,
            "placement": impression.placement,
            "message": "Impression tracked"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error tracking impression: {e}")
        # Don't fail the ad display if tracking fails
        return {
            "success": False,
            "message": f"Tracking error: {str(e)}"
        }
    finally:
        if conn:
            cursor.close()
            conn.close()


@router.post("/track-click")
async def track_click(click: ClickTrack):
    """
    Track a campaign click (simplified version)
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Verify campaign exists
        cursor.execute("""
            SELECT id, name
            FROM campaign_profile
            WHERE id = %s
        """, (click.campaign_id,))

        campaign = cursor.fetchone()

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        campaign_id = campaign[0]
        campaign_name = campaign[1]

        # Log click (simplified)
        print(f"[CLICK] Campaign #{campaign_id} ({campaign_name}) | User: {click.user_id}")

        return {
            "success": True,
            "campaign_id": campaign_id,
            "campaign_name": campaign_name,
            "message": "Click tracked"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error tracking click: {e}")
        return {
            "success": False,
            "message": f"Tracking error: {str(e)}"
        }
    finally:
        if conn:
            cursor.close()
            conn.close()
