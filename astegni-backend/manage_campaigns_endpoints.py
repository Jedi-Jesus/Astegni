"""
Manage Campaigns Profile Endpoints
Handles profile data and statistics for campaign management administrators

ACCESS CONTROL:
- Only admins with "Campaign Management" OR "System Settings" in their departments array can access
- All endpoints verify department access before returning data
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List
import psycopg
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

router = APIRouter(prefix="/api/manage-campaigns", tags=["Manage Campaigns Profile"])

# Allowed departments for this module
# NOTE: Department names must match exactly as stored in admin_profile.departments
ALLOWED_DEPARTMENTS = ["manage-campaigns", "manage-system-settings"]

# ============================================
# PYDANTIC MODELS
# ============================================

class CampaignProfileResponse(BaseModel):
    # From admin_profile
    id: int
    email: str
    first_name: str
    father_name: str
    grandfather_name: Optional[str]
    phone_number: Optional[str]
    profile_picture: Optional[str]
    cover_picture: Optional[str]
    bio: Optional[str]
    quote: Optional[str]
    departments: List[str]
    username: Optional[str]

    # From manage_campaigns_profile
    position: str
    joined_date: str
    rating: float
    total_reviews: int
    badges: List[dict]
    campaigns_approved: int
    campaigns_rejected: int
    campaigns_suspended: int
    total_budget_managed: float
    avg_campaign_performance: float
    permissions: dict

class CampaignProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    father_name: Optional[str] = None
    grandfather_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    bio: Optional[str] = None
    quote: Optional[str] = None
    position: Optional[str] = None

class CampaignStatsResponse(BaseModel):
    total_campaigns: int
    verified_campaigns: int
    pending_campaigns: int
    rejected_campaigns: int
    suspended_campaigns: int
    archived_campaigns: int
    approval_rate: float
    avg_processing_time: float
    client_satisfaction: float

    # Breakdown by status
    status_breakdown: dict

    # Trend data
    recent_trend: dict

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL)

def verify_department_access(admin_id: int, allowed_departments: List[str] = ALLOWED_DEPARTMENTS):
    """
    Verify that the admin has access to this module based on their departments.

    Args:
        admin_id: The admin's ID
        allowed_departments: List of allowed department names

    Returns:
        tuple: (has_access: bool, admin_departments: List[str])

    Raises:
        HTTPException: If admin not found or access denied
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get admin's departments
        cursor.execute("""
            SELECT departments
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Admin not found")

        admin_departments = row[0] or []

        # Check if admin has any of the allowed departments
        has_access = any(dept in allowed_departments for dept in admin_departments)

        if not has_access:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. This page is restricted to admins in: {', '.join(allowed_departments)}. Your departments: {', '.join(admin_departments) if admin_departments else 'None'}"
            )

        return has_access, admin_departments

    finally:
        cursor.close()
        conn.close()

# ============================================
# ENDPOINTS
# ============================================

@router.get("/profile/{admin_id}")
async def get_campaign_admin_profile(admin_id: int, department: str = "Campaign Management"):
    """
    Get complete campaign admin profile (admin_profile + manage_campaigns_profile)

    ACCESS CONTROL: Only admins in 'Campaign Management' or 'System Settings' departments
    """
    # Verify department access
    verify_department_access(admin_id)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get combined profile data
        cursor.execute("""
            SELECT
                ap.id, ap.email, ap.first_name, ap.father_name, ap.grandfather_name,
                ap.phone_number, ap.profile_picture, ap.cover_picture, ap.bio, ap.quote,
                ap.departments, ap.username,
                mcp.position, mcp.joined_date, mcp.rating, mcp.total_reviews,
                mcp.badges, mcp.campaigns_approved, mcp.campaigns_rejected,
                mcp.campaigns_suspended, mcp.total_budget_managed,
                mcp.avg_campaign_performance, mcp.permissions
            FROM admin_profile ap
            LEFT JOIN manage_campaigns_profile mcp ON ap.id = mcp.admin_id
            WHERE ap.id = %s
        """, (admin_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        profile = {
            "id": row[0],
            "email": row[1],
            "first_name": row[2],
            "father_name": row[3],
            "grandfather_name": row[4],
            "phone_number": row[5],
            "profile_picture": row[6],
            "cover_picture": row[7],
            "bio": row[8],
            "quote": row[9],
            "departments": row[10] or [],
            "username": row[11],
            "position": row[12] or "Staff",
            "joined_date": row[13].isoformat() if row[13] else datetime.now().date().isoformat(),
            "rating": float(row[14]) if row[14] else 0.0,
            "total_reviews": row[15] or 0,
            "badges": row[16] or [],
            "campaigns_approved": row[17] or 0,
            "campaigns_rejected": row[18] or 0,
            "campaigns_suspended": row[19] or 0,
            "total_budget_managed": float(row[20]) if row[20] else 0.0,
            "avg_campaign_performance": float(row[21]) if row[21] else 0.0,
            "permissions": row[22] or {
                "can_approve": False,
                "can_reject": False,
                "can_suspend": False,
                "can_edit_budget": False
            }
        }

        cursor.close()
        conn.close()

        return profile

    except HTTPException:
        raise
    except Exception as e:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")

@router.put("/profile/{admin_id}")
async def update_campaign_admin_profile(admin_id: int, profile_data: CampaignProfileUpdate):
    """
    Update campaign admin profile

    ACCESS CONTROL: Only admins in 'Campaign Management' or 'System Settings' departments
    """
    # Verify department access
    verify_department_access(admin_id)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Update admin_profile fields
        admin_updates = []
        admin_params = []

        if profile_data.first_name is not None:
            admin_updates.append("first_name = %s")
            admin_params.append(profile_data.first_name)
        if profile_data.father_name is not None:
            admin_updates.append("father_name = %s")
            admin_params.append(profile_data.father_name)
        if profile_data.grandfather_name is not None:
            admin_updates.append("grandfather_name = %s")
            admin_params.append(profile_data.grandfather_name)
        if profile_data.email is not None:
            admin_updates.append("email = %s")
            admin_params.append(profile_data.email)
        if profile_data.phone_number is not None:
            admin_updates.append("phone_number = %s")
            admin_params.append(profile_data.phone_number)
        if profile_data.bio is not None:
            admin_updates.append("bio = %s")
            admin_params.append(profile_data.bio)
        if profile_data.quote is not None:
            admin_updates.append("quote = %s")
            admin_params.append(profile_data.quote)

        if admin_updates:
            admin_params.append(admin_id)
            cursor.execute(f"""
                UPDATE admin_profile
                SET {', '.join(admin_updates)}, updated_at = NOW()
                WHERE id = %s
            """, admin_params)

        # Update manage_campaigns_profile fields
        if profile_data.position is not None:
            cursor.execute("""
                UPDATE manage_campaigns_profile
                SET position = %s, updated_at = NOW()
                WHERE admin_id = %s
            """, (profile_data.position, admin_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "Profile updated successfully"}

    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

@router.get("/stats/{admin_id}")
async def get_campaign_stats(admin_id: Optional[int] = None):
    """
    Get campaign statistics for dashboard

    ACCESS CONTROL: Only admins in 'Campaign Management' or 'System Settings' departments
    """
    # Verify department access
    if admin_id:
        verify_department_access(admin_id)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get campaign counts by status
        cursor.execute("""
            SELECT
                verification_status,
                COUNT(*) as count,
                AVG(budget) as avg_budget,
                SUM(budget) as total_budget
            FROM ad_campaigns
            WHERE 1=1
            GROUP BY verification_status
        """)

        status_counts = {}
        total_campaigns = 0
        total_budget = 0

        for row in cursor.fetchall():
            status = row[0] or 'pending'
            count = row[1]
            avg_budget = float(row[2]) if row[2] else 0.0
            sum_budget = float(row[3]) if row[3] else 0.0

            status_counts[status] = {
                "count": count,
                "avg_budget": avg_budget,
                "total_budget": sum_budget
            }
            total_campaigns += count
            total_budget += sum_budget

        # Extract specific counts
        verified = status_counts.get('verified', {}).get('count', 0)
        pending = status_counts.get('pending', {}).get('count', 0)
        rejected = status_counts.get('rejected', {}).get('count', 0)
        suspended = status_counts.get('suspended', {}).get('count', 0)

        # Calculate archived campaigns (ended campaigns)
        cursor.execute("""
            SELECT COUNT(*)
            FROM ad_campaigns
            WHERE end_date < CURRENT_DATE
        """)
        archived = cursor.fetchone()[0] or 0

        # Calculate approval rate
        total_processed = verified + rejected
        approval_rate = (verified / total_processed * 100) if total_processed > 0 else 0

        # Calculate average processing time (simplified - using creation to verification)
        cursor.execute("""
            SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600)
            FROM ad_campaigns
            WHERE verification_status IN ('verified', 'rejected')
        """)
        avg_processing_time = cursor.fetchone()[0] or 0

        # Get recent trend (last 7 days vs previous 7 days)
        cursor.execute("""
            SELECT
                CASE
                    WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 'recent'
                    WHEN created_at >= CURRENT_DATE - INTERVAL '14 days' THEN 'previous'
                    ELSE 'older'
                END as period,
                COUNT(*) as count,
                AVG(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as approval_rate
            FROM ad_campaigns
            WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
            GROUP BY period
        """)

        trend_data = {"recent": 0, "previous": 0, "recent_approval": 0, "previous_approval": 0}
        for row in cursor.fetchall():
            period = row[0]
            count = row[1]
            approval = float(row[2]) if row[2] else 0

            if period == 'recent':
                trend_data['recent'] = count
                trend_data['recent_approval'] = approval * 100
            elif period == 'previous':
                trend_data['previous'] = count
                trend_data['previous_approval'] = approval * 100

        cursor.close()
        conn.close()

        return {
            "total_campaigns": total_campaigns,
            "verified_campaigns": verified,
            "pending_campaigns": pending,
            "rejected_campaigns": rejected,
            "suspended_campaigns": suspended,
            "archived_campaigns": archived,
            "approval_rate": round(approval_rate, 1),
            "avg_processing_time": round(avg_processing_time, 1),
            "client_satisfaction": 94.0,  # This could be calculated from ratings
            "status_breakdown": status_counts,
            "recent_trend": trend_data
        }

    except Exception as e:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")

@router.get("/campaigns")
async def get_campaigns(
    status: Optional[str] = None,
    search: Optional[str] = None,
    industry: Optional[str] = None,
    ad_type: Optional[str] = None,
    min_budget: Optional[float] = None,
    max_budget: Optional[float] = None,
    location: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    admin_id: Optional[int] = None
):
    """
    Get campaigns filtered by status with search and filters for panel views

    Query parameters:
    - status: Filter by verification_status (pending, verified, rejected, suspended)
    - search: Search in campaign name, description, or company
    - industry: Filter by industry
    - ad_type: Filter by ad type (image, video, carousel, text)
    - min_budget: Minimum budget filter
    - max_budget: Maximum budget filter
    - location: Filter by target location
    - limit: Number of results per page
    - offset: Pagination offset

    ACCESS CONTROL: Only admins in 'Campaign Management' or 'System Settings' departments
    """
    # Verify department access if admin_id provided
    if admin_id:
        verify_department_access(admin_id)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Base query with all needed fields including campaign_socials
        query = """
            SELECT
                ac.id, ac.name, ac.description, ac.verification_status, ac.budget,
                ac.start_date, ac.end_date, ac.created_at, ac.advertiser_id,
                ac.impressions, ac.clicks, ac.ctr, ac.ad_type, ac.creative_urls,
                ac.objective, ac.target_location, ac.target_audience, ac.spent,
                ap.company_name, ap.industry, ac.campaign_socials, ac.target_age_range
            FROM ad_campaigns ac
            LEFT JOIN advertiser_profiles ap ON ac.advertiser_id = ap.id
            WHERE 1=1
        """
        params = []

        # Status filter (main panel filter)
        if status:
            query += " AND ac.verification_status = %s"
            params.append(status)

        # Search filter (searches in name, description, company)
        if search:
            query += " AND (ac.name ILIKE %s OR ac.description ILIKE %s OR ap.company_name ILIKE %s)"
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        # Industry filter
        if industry:
            query += " AND ap.industry ILIKE %s"
            params.append(f"%{industry}%")

        # Ad type filter
        if ad_type:
            query += " AND ac.ad_type = %s"
            params.append(ad_type)

        # Budget range filters
        if min_budget is not None:
            query += " AND ac.budget >= %s"
            params.append(min_budget)

        if max_budget is not None:
            query += " AND ac.budget <= %s"
            params.append(max_budget)

        # Location filter (checks if location is in the target_location array)
        if location:
            query += " AND %s = ANY(ac.target_location)"
            params.append(location)

        # Order by most recent first
        query += " ORDER BY ac.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(query, params)

        campaigns = []
        for row in cursor.fetchall():
            campaigns.append({
                "id": row[0],
                "campaign_name": row[1],  # Changed from "name" to "campaign_name"
                "description": row[2],
                "verification_status": row[3],
                "budget": float(row[4]) if row[4] else 0.0,
                "start_date": row[5].isoformat() if row[5] else None,
                "end_date": row[6].isoformat() if row[6] else None,
                "created_at": row[7].isoformat() if row[7] else None,
                "advertiser_id": row[8],
                "impressions": row[9] or 0,
                "clicks": row[10] or 0,
                "ctr": float(row[11]) if row[11] else 0.0,
                "ad_type": row[12],
                "creative_urls": row[13] or [],
                "campaign_objective": row[14],  # Changed from "objective"
                "target_location": row[15] or [],  # Changed from "locations"
                "target_audience": row[16] or [],
                "spent": float(row[17]) if row[17] else 0.0,
                "company_name": row[18],
                "industry": row[19],
                "campaign_socials": row[20] or {},  # New field
                "target_age_range": row[21] or {},  # New field
                # Determine media type from creative_urls
                "has_video": any('video' in url.lower() or url.endswith('.mp4') for url in (row[13] or [])),
                "has_image": any('jpg' in url.lower() or 'jpeg' in url.lower() or 'png' in url.lower() for url in (row[13] or [])),
                "media_url": row[13][0] if row[13] and len(row[13]) > 0 else None
            })

        # Get total count with same filters
        count_query = """
            SELECT COUNT(*)
            FROM ad_campaigns ac
            LEFT JOIN advertiser_profiles ap ON ac.advertiser_id = ap.id
            WHERE 1=1
        """
        count_params = []

        if status:
            count_query += " AND ac.verification_status = %s"
            count_params.append(status)

        if search:
            count_query += " AND (ac.name ILIKE %s OR ac.description ILIKE %s OR ap.company_name ILIKE %s)"
            search_param = f"%{search}%"
            count_params.extend([search_param, search_param, search_param])

        if industry:
            count_query += " AND ap.industry ILIKE %s"
            count_params.append(f"%{industry}%")

        if ad_type:
            count_query += " AND ac.ad_type = %s"
            count_params.append(ad_type)

        if min_budget is not None:
            count_query += " AND ac.budget >= %s"
            count_params.append(min_budget)

        if max_budget is not None:
            count_query += " AND ac.budget <= %s"
            count_params.append(max_budget)

        if location:
            count_query += " AND %s = ANY(ac.target_location)"
            count_params.append(location)

        cursor.execute(count_query, count_params)
        total_count = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return {
            "campaigns": campaigns,
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "filters": {
                "status": status,
                "search": search,
                "industry": industry,
                "ad_type": ad_type,
                "min_budget": min_budget,
                "max_budget": max_budget,
                "location": location
            }
        }

    except Exception as e:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to fetch campaigns: {str(e)}")

@router.get("/campaigns/live-requests")
async def get_live_campaign_requests(
    limit: int = 20,
    admin_id: Optional[int] = None
):
    """
    Get recent campaign requests for the live widget
    Returns most recent campaigns across all statuses

    ACCESS CONTROL: Only admins in 'Campaign Management' or 'System Settings' departments
    """
    # Verify department access if admin_id provided
    if admin_id:
        verify_department_access(admin_id)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                ac.id, ac.name, ac.verification_status, ac.budget,
                ac.created_at, ac.ad_type, ac.objective,
                ap.company_name
            FROM ad_campaigns ac
            LEFT JOIN advertiser_profiles ap ON ac.advertiser_id = ap.id
            ORDER BY ac.created_at DESC
            LIMIT %s
        """, (limit,))

        requests = []
        for row in cursor.fetchall():
            # Calculate time ago
            created_at = row[4]
            time_diff = datetime.now() - created_at

            if time_diff.days > 0:
                time_ago = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
            elif time_diff.seconds >= 3600:
                hours = time_diff.seconds // 3600
                time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
            elif time_diff.seconds >= 60:
                minutes = time_diff.seconds // 60
                time_ago = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
            else:
                time_ago = "Just now"

            requests.append({
                "id": row[0],
                "name": row[1],
                "status": row[2],
                "budget": float(row[3]) if row[3] else 0.0,
                "created_at": row[4].isoformat(),
                "time_ago": time_ago,
                "ad_type": row[5],
                "objective": row[6],
                "company_name": row[7]
            })

        cursor.close()
        conn.close()

        return {
            "requests": requests,
            "total": len(requests)
        }

    except Exception as e:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to fetch live requests: {str(e)}")

@router.get("/campaigns/{campaign_id}")
async def get_campaign_details(
    campaign_id: int,
    admin_id: Optional[int] = None
):
    """
    Get detailed information about a specific campaign

    Returns:
    - All campaign fields including verification status, dates, reasons, media, etc.

    ACCESS CONTROL: Only admins in 'Campaign Management' or 'System Settings' departments
    """
    # Verify department access if admin_id provided
    if admin_id:
        verify_department_access(admin_id)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                ac.id, ac.name, ac.description, ac.verification_status, ac.budget,
                ac.start_date, ac.end_date, ac.created_at, ac.updated_at, ac.advertiser_id,
                ac.impressions, ac.clicks, ac.ctr, ac.ad_type, ac.creative_urls,
                ac.objective, ac.target_location, ac.target_audience, ac.spent,
                ac.submitted_date,
                ac.rejected_date, ac.rejected_reason,
                ac.suspended_date, ac.suspended_reason,
                ac.verified_date, ac.campaign_socials, ac.target_age_range,
                ap.company_name, ap.industry
            FROM ad_campaigns ac
            LEFT JOIN advertiser_profiles ap ON ac.advertiser_id = ap.id
            WHERE ac.id = %s
        """, (campaign_id,))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Campaign not found")

        campaign = {
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "verification_status": row[3],
            "budget": float(row[4]) if row[4] else 0.0,
            "start_date": row[5].isoformat() if row[5] else None,
            "end_date": row[6].isoformat() if row[6] else None,
            "created_at": row[7].isoformat() if row[7] else None,
            "updated_at": row[8].isoformat() if row[8] else None,
            "advertiser_id": row[9],
            "impressions": row[10] or 0,
            "clicks": row[11] or 0,
            "ctr": float(row[12]) if row[12] else 0.0,
            "ad_type": row[13],
            "creative_urls": row[14] or [],
            "campaign_objective": row[15],
            "target_location": row[16] or [],  # Changed from target_region
            "target_audience": row[17] or [],
            "spent": float(row[18]) if row[18] else 0.0,
            "submitted_date": row[19].isoformat() if row[19] else None,
            "rejected_date": row[20].isoformat() if row[20] else None,
            "rejected_reason": row[21],
            "suspended_date": row[22].isoformat() if row[22] else None,
            "suspended_reason": row[23],
            "verified_date": row[24].isoformat() if row[24] else None,
            "campaign_socials": row[25] or {},
            "target_age_range": row[26] or {},  # New field
            "company_name": row[27],
            "industry": row[28]
        }

        cursor.close()
        conn.close()

        return campaign

    except HTTPException:
        raise
    except Exception as e:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to fetch campaign details: {str(e)}")

class CampaignStatusUpdate(BaseModel):
    new_status: str
    reason: Optional[str] = None
    admin_id: Optional[int] = None

@router.put("/campaigns/{campaign_id}/status")
async def update_campaign_status(
    campaign_id: int,
    status_update: CampaignStatusUpdate
):
    """
    Update campaign verification status (approve, reject, suspend, reinstate, reconsider)

    Parameters:
    - new_status: One of: verified, rejected, suspended, pending
    - reason: Required if status is rejected or suspended
    - admin_id: ID of admin performing the action

    Status Transitions:
    - pending -> verified (approve): Sets verified_date
    - pending -> rejected (reject): Sets rejected_date and rejected_reason
    - verified -> suspended (suspend): Sets suspended_date and suspended_reason
    - verified -> rejected (reject): Sets rejected_date and rejected_reason
    - rejected -> pending (reconsider): Clears rejected_reason, sets submitted_date
    - suspended -> verified (reinstate): Clears suspended fields
    - suspended -> rejected (reject): Sets rejected_date and rejected_reason, clears suspended fields

    ACCESS CONTROL: Only admins in 'Campaign Management' or 'System Settings' departments
    """
    # Extract values from request body
    new_status = status_update.new_status
    reason = status_update.reason
    admin_id = status_update.admin_id

    # Verify department access
    if admin_id:
        verify_department_access(admin_id)

    # Validate status
    valid_statuses = ["pending", "verified", "rejected", "suspended"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Validate reason requirement
    if new_status in ["rejected", "suspended"] and not reason:
        raise HTTPException(
            status_code=400,
            detail=f"Reason is required when setting status to {new_status}"
        )

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if campaign exists
        cursor.execute("SELECT id, verification_status FROM ad_campaigns WHERE id = %s", (campaign_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Campaign not found")

        old_status = row[1]

        # Build update query based on new status
        if new_status == "verified":
            # Approve/Reinstate campaign
            cursor.execute("""
                UPDATE ad_campaigns
                SET verification_status = %s,
                    is_verified = TRUE,
                    verified_date = NOW(),
                    suspended_date = NULL,
                    suspended_reason = NULL,
                    updated_at = NOW()
                WHERE id = %s
            """, (new_status, campaign_id))

        elif new_status == "rejected":
            # Reject campaign (can be from pending, verified, or suspended)
            cursor.execute("""
                UPDATE ad_campaigns
                SET verification_status = %s,
                    is_verified = FALSE,
                    rejected_date = NOW(),
                    rejected_reason = %s,
                    suspended_date = NULL,
                    suspended_reason = NULL,
                    updated_at = NOW()
                WHERE id = %s
            """, (new_status, reason, campaign_id))

        elif new_status == "suspended":
            # Suspend campaign (from verified)
            cursor.execute("""
                UPDATE ad_campaigns
                SET verification_status = %s,
                    is_verified = FALSE,
                    suspended_date = NOW(),
                    suspended_reason = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (new_status, reason, campaign_id))

        elif new_status == "pending":
            # Reconsider campaign (from rejected)
            cursor.execute("""
                UPDATE ad_campaigns
                SET verification_status = %s,
                    is_verified = FALSE,
                    submitted_date = NOW(),
                    rejected_date = NULL,
                    rejected_reason = NULL,
                    suspended_date = NULL,
                    suspended_reason = NULL,
                    updated_at = NOW()
                WHERE id = %s
            """, (new_status, campaign_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": f"Campaign status updated from {old_status} to {new_status}",
            "campaign_id": campaign_id,
            "old_status": old_status,
            "new_status": new_status,
            "reason": reason,
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to update campaign status: {str(e)}")
