"""
Advertiser Team Management Endpoints
Allows advertisers to invite and manage Brand Managers
Brand Managers can edit campaigns but cannot access Team or Settings panels
Owner has full access to everything
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import psycopg
from psycopg.rows import dict_row
import os
import secrets
from datetime import datetime, date
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

router = APIRouter(prefix="/api/advertiser", tags=["Advertiser Team"])

# Pydantic models
class TeamMemberInvite(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    dob: Optional[date] = None  # Date of birth for security verification
    can_set_price: bool = False  # Permission to set campaign prices

class TeamMemberUpdate(BaseModel):
    can_set_price: Optional[bool] = None

class TeamMemberResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str  # "owner" or "brand_manager"
    status: str
    invited_at: Optional[str]
    accepted_at: Optional[str]
    last_active: Optional[str]
    can_set_price: bool
    permissions: dict

# Database connection
def get_db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

# Auth dependency (simplified - use your actual auth)
from utils import get_current_user
from email_service import email_service

# Base URL for invitation links
BASE_URL = os.getenv("BASE_URL", "https://astegni.com")

# ============================================
# TEAM MEMBER ENDPOINTS
# ============================================

@router.get("/team")
async def get_team_members(current_user = Depends(get_current_user)):
    """Get all team members for the current advertiser"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # First, get the account owner (advertiser profile creator)
                cur.execute("""
                    SELECT ap.user_id, u.email,
                           CONCAT_WS(' ', u.first_name, u.father_name, u.grandfather_name) as full_name,
                           u.profile_picture, u.created_at
                    FROM advertiser_profiles ap
                    JOIN users u ON ap.user_id = u.id
                    WHERE ap.id = %s
                """, (advertiser_profile_id,))

                owner = cur.fetchone()

                # Get team members (excluding removed)
                cur.execute("""
                    SELECT
                        tm.id,
                        tm.email,
                        tm.full_name,
                        tm.role,
                        tm.status,
                        tm.invited_at,
                        tm.accepted_at,
                        tm.last_active,
                        tm.permissions,
                        tm.user_id,
                        u.profile_picture
                    FROM advertiser_team_members tm
                    LEFT JOIN users u ON tm.user_id = u.id
                    WHERE tm.advertiser_profile_id = %s
                    AND tm.status != 'removed'
                    ORDER BY
                        CASE tm.role
                            WHEN 'owner' THEN 1
                            WHEN 'brand_manager' THEN 2
                            ELSE 3
                        END,
                        tm.created_at DESC
                """, (advertiser_profile_id,))

                members = cur.fetchall()

                # Format response - start with owner as first member
                result = []

                # Add owner as the first member (admin/owner)
                if owner:
                    result.append({
                        "id": 0,  # Special ID for owner
                        "email": owner['email'],
                        "full_name": owner['full_name'],
                        "role": "owner",  # Special role for account creator
                        "status": "active",
                        "invited_at": None,
                        "accepted_at": owner['created_at'].isoformat() if owner['created_at'] else None,
                        "last_active": None,
                        "permissions": {"full_access": True},
                        "profile_picture": owner['profile_picture'],
                        "is_owner": True
                    })

                # Add other team members (all are Brand Managers now)
                for m in members:
                    perms = m['permissions'] or {}
                    result.append({
                        "id": m['id'],
                        "email": m['email'],
                        "full_name": m['full_name'],
                        "role": "brand_manager",  # All invited members are Brand Managers
                        "status": m['status'],
                        "invited_at": m['invited_at'].isoformat() if m['invited_at'] else None,
                        "accepted_at": m['accepted_at'].isoformat() if m['accepted_at'] else None,
                        "last_active": m['last_active'].isoformat() if m['last_active'] else None,
                        "can_set_price": perms.get('can_set_price', False),
                        "permissions": perms,
                        "profile_picture": m['profile_picture'],
                        "is_owner": False
                    })

                return {
                    "success": True,
                    "members": result,
                    "total": len(result)
                }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching team members: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/team/invite")
async def invite_team_member(invite: TeamMemberInvite, current_user = Depends(get_current_user)):
    """Invite a new Brand Manager to the team"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        # Prepare permissions JSON with can_set_price
        permissions = {"can_set_price": invite.can_set_price}

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get inviter's name and brand name for the email
                cur.execute("""
                    SELECT CONCAT_WS(' ', u.first_name, u.father_name, u.grandfather_name) as inviter_name,
                           bp.name as brand_name
                    FROM advertiser_profiles ap
                    JOIN users u ON ap.user_id = u.id
                    LEFT JOIN brand_profile bp ON bp.id = ap.brand_ids[1]
                    WHERE ap.id = %s
                """, (advertiser_profile_id,))
                inviter_info = cur.fetchone()
                inviter_name = inviter_info['inviter_name'] if inviter_info else "A team member"
                brand_name = inviter_info['brand_name'] if inviter_info else "an advertiser"

                # Check if already invited
                cur.execute("""
                    SELECT id, status FROM advertiser_team_members
                    WHERE advertiser_profile_id = %s AND email = %s
                """, (advertiser_profile_id, invite.email))

                existing = cur.fetchone()

                if existing:
                    if existing['status'] == 'active':
                        raise HTTPException(status_code=400, detail="This user is already a team member")
                    elif existing['status'] == 'pending':
                        raise HTTPException(status_code=400, detail="An invitation is already pending for this email")
                    elif existing['status'] == 'removed':
                        # Re-invite removed member as Brand Manager
                        invitation_token = secrets.token_urlsafe(32)
                        cur.execute("""
                            UPDATE advertiser_team_members
                            SET status = 'pending',
                                role = 'brand_manager',
                                permissions = %s,
                                invitation_token = %s,
                                invited_at = CURRENT_TIMESTAMP,
                                invited_by = %s,
                                full_name = COALESCE(%s, full_name),
                                dob = COALESCE(%s, dob)
                            WHERE id = %s
                            RETURNING id
                        """, (psycopg.types.json.Json(permissions), invitation_token, current_user.id, invite.full_name, invite.dob, existing['id']))
                        member_id = cur.fetchone()['id']
                else:
                    # Check if email belongs to existing user
                    cur.execute("""
                        SELECT id, CONCAT_WS(' ', first_name, father_name, grandfather_name) as full_name
                        FROM users WHERE email = %s
                    """, (invite.email,))
                    user = cur.fetchone()

                    invitation_token = secrets.token_urlsafe(32)

                    cur.execute("""
                        INSERT INTO advertiser_team_members (
                            advertiser_profile_id, user_id, email, full_name, dob, role,
                            status, invitation_token, invited_by, permissions
                        ) VALUES (%s, %s, %s, %s, %s, 'brand_manager', 'pending', %s, %s, %s)
                        RETURNING id
                    """, (
                        advertiser_profile_id,
                        user['id'] if user else None,
                        invite.email,
                        invite.full_name or (user['full_name'] if user else None),
                        invite.dob,
                        invitation_token,
                        current_user.id,
                        psycopg.types.json.Json(permissions)
                    ))
                    member_id = cur.fetchone()['id']

                conn.commit()

                # Send invitation email with link
                email_sent = email_service.send_team_invitation_email(
                    to_email=invite.email,
                    invitee_name=invite.full_name,
                    inviter_name=inviter_name,
                    brand_name=brand_name or "Astegni Advertiser",
                    invitation_token=invitation_token,
                    base_url=BASE_URL
                )

                return {
                    "success": True,
                    "message": f"Invitation sent to {invite.email}",
                    "member_id": member_id,
                    "can_set_price": invite.can_set_price,
                    "email_sent": email_sent
                }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error inviting team member: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/team/accept/{token}")
async def accept_invitation(token: str, current_user = Depends(get_current_user)):
    """Accept a team invitation"""
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                # Find invitation
                cur.execute("""
                    SELECT id, advertiser_profile_id, email
                    FROM advertiser_team_members
                    WHERE invitation_token = %s AND status = 'pending'
                """, (token,))

                invitation = cur.fetchone()

                if not invitation:
                    raise HTTPException(status_code=404, detail="Invalid or expired invitation")

                # Verify email matches (optional - could allow any logged in user)
                if invitation['email'].lower() != current_user.email.lower():
                    raise HTTPException(status_code=403, detail="This invitation was sent to a different email")

                # Accept invitation
                cur.execute("""
                    UPDATE advertiser_team_members
                    SET status = 'active',
                        user_id = %s,
                        accepted_at = CURRENT_TIMESTAMP,
                        invitation_token = NULL
                    WHERE id = %s
                """, (current_user.id, invitation['id']))

                conn.commit()

                return {
                    "success": True,
                    "message": "You have joined the team!"
                }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error accepting invitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/team/{member_id}")
async def update_team_member(member_id: int, update: TeamMemberUpdate, current_user = Depends(get_current_user)):
    """Update a Brand Manager's permissions (can_set_price)"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        # Cannot update owner (id = 0)
        if member_id == 0:
            raise HTTPException(status_code=403, detail="Cannot modify owner's permissions")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Verify ownership and get current permissions
                cur.execute("""
                    SELECT id, permissions FROM advertiser_team_members
                    WHERE id = %s AND advertiser_profile_id = %s
                """, (member_id, advertiser_profile_id))

                member = cur.fetchone()
                if not member:
                    raise HTTPException(status_code=404, detail="Team member not found")

                # Update can_set_price permission
                if update.can_set_price is not None:
                    current_perms = member['permissions'] or {}
                    current_perms['can_set_price'] = update.can_set_price

                    cur.execute("""
                        UPDATE advertiser_team_members
                        SET permissions = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (psycopg.types.json.Json(current_perms), member_id))

                    conn.commit()

                return {
                    "success": True,
                    "message": "Brand Manager permissions updated",
                    "can_set_price": update.can_set_price
                }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating team member: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/team/{member_id}")
async def remove_team_member(member_id: int, current_user = Depends(get_current_user)):
    """Remove a Brand Manager from the team"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        # Cannot remove owner (id = 0)
        if member_id == 0:
            raise HTTPException(status_code=403, detail="Cannot remove account owner")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Verify ownership and get member info
                cur.execute("""
                    SELECT id, email FROM advertiser_team_members
                    WHERE id = %s AND advertiser_profile_id = %s
                """, (member_id, advertiser_profile_id))

                member = cur.fetchone()
                if not member:
                    raise HTTPException(status_code=404, detail="Team member not found")

                # Soft delete - mark as removed
                cur.execute("""
                    UPDATE advertiser_team_members
                    SET status = 'removed', updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (member_id,))

                conn.commit()

                return {
                    "success": True,
                    "message": f"Removed {member['email']} from team"
                }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error removing team member: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/team/{member_id}/resend")
async def resend_invitation(member_id: int, current_user = Depends(get_current_user)):
    """Resend invitation to a pending team member"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get inviter's name and brand name for the email
                cur.execute("""
                    SELECT CONCAT_WS(' ', u.first_name, u.father_name, u.grandfather_name) as inviter_name,
                           bp.name as brand_name
                    FROM advertiser_profiles ap
                    JOIN users u ON ap.user_id = u.id
                    LEFT JOIN brand_profile bp ON bp.id = ap.brand_ids[1]
                    WHERE ap.id = %s
                """, (advertiser_profile_id,))
                inviter_info = cur.fetchone()
                inviter_name = inviter_info['inviter_name'] if inviter_info else "A team member"
                brand_name = inviter_info['brand_name'] if inviter_info else "an advertiser"

                # Verify ownership and status
                cur.execute("""
                    SELECT id, email, full_name, status FROM advertiser_team_members
                    WHERE id = %s AND advertiser_profile_id = %s
                """, (member_id, advertiser_profile_id))

                member = cur.fetchone()
                if not member:
                    raise HTTPException(status_code=404, detail="Team member not found")

                if member['status'] != 'pending':
                    raise HTTPException(status_code=400, detail="Can only resend to pending invitations")

                # Generate new token
                new_token = secrets.token_urlsafe(32)

                cur.execute("""
                    UPDATE advertiser_team_members
                    SET invitation_token = %s, invited_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (new_token, member_id))

                conn.commit()

                # Send invitation email with link
                email_sent = email_service.send_team_invitation_email(
                    to_email=member['email'],
                    invitee_name=member['full_name'],
                    inviter_name=inviter_name,
                    brand_name=brand_name or "Astegni Advertiser",
                    invitation_token=new_token,
                    base_url=BASE_URL
                )

                return {
                    "success": True,
                    "message": f"Invitation resent to {member['email']}",
                    "email_sent": email_sent
                }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error resending invitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# USER SEARCH ENDPOINT (for invite autocomplete)
# ============================================

@router.get("/team/search-users")
async def search_users_for_invite(q: str, current_user = Depends(get_current_user)):
    """Search for existing users to invite to the team"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        if not q or len(q) < 2:
            return {"success": True, "users": []}

        with get_db() as conn:
            with conn.cursor() as cur:
                # Search users by email, first_name, father_name, or grandfather_name
                # Exclude already invited members
                cur.execute("""
                    SELECT
                        u.id,
                        u.email,
                        u.first_name,
                        u.father_name,
                        u.grandfather_name,
                        CONCAT_WS(' ', u.first_name, u.father_name, u.grandfather_name) as full_name,
                        u.profile_picture,
                        u.roles
                    FROM users u
                    WHERE (
                        LOWER(u.email) LIKE LOWER(%s)
                        OR LOWER(u.first_name) LIKE LOWER(%s)
                        OR LOWER(u.father_name) LIKE LOWER(%s)
                        OR LOWER(u.grandfather_name) LIKE LOWER(%s)
                        OR LOWER(CONCAT_WS(' ', u.first_name, u.father_name, u.grandfather_name)) LIKE LOWER(%s)
                    )
                    AND u.id != %s
                    AND u.email NOT IN (
                        SELECT email FROM advertiser_team_members
                        WHERE advertiser_profile_id = %s
                        AND status IN ('pending', 'active')
                    )
                    ORDER BY
                        CASE WHEN LOWER(u.email) LIKE LOWER(%s) THEN 0 ELSE 1 END,
                        u.first_name,
                        u.father_name
                    LIMIT 10
                """, (
                    f"%{q}%",  # email
                    f"%{q}%",  # first_name
                    f"%{q}%",  # father_name
                    f"%{q}%",  # grandfather_name
                    f"%{q}%",  # full name combined
                    current_user.id,
                    advertiser_profile_id,
                    f"{q}%"    # for ordering
                ))

                users = cur.fetchall()

                result = []
                for user in users:
                    # roles is stored as a JSON array like ["parent", "tutor", "student"]
                    roles = user['roles'] or []
                    # Handle both array format and legacy dict format
                    if isinstance(roles, list):
                        role_list = roles
                    elif isinstance(roles, dict):
                        role_list = [role for role, enabled in roles.items() if enabled]
                    else:
                        role_list = []

                    result.append({
                        "id": user['id'],
                        "email": user['email'],
                        "first_name": user['first_name'],
                        "father_name": user['father_name'],
                        "grandfather_name": user['grandfather_name'],
                        "full_name": user['full_name'],
                        "profile_picture": user['profile_picture'],
                        "roles": role_list
                    })

                return {
                    "success": True,
                    "users": result
                }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error searching users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# PUBLIC INVITATION ENDPOINTS (for accepting from email link)
# ============================================

@router.get("/team/invitation/{token}")
async def get_invitation_details(token: str):
    """Get invitation details by token (public endpoint - no auth required)"""
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                # Find invitation and get brand details
                cur.execute("""
                    SELECT
                        tm.id,
                        tm.email,
                        tm.full_name as invitee_name,
                        tm.status,
                        tm.permissions,
                        tm.invited_at,
                        bp.name as brand_name,
                        bp.thumbnail as brand_logo,
                        CONCAT_WS(' ', u.first_name, u.father_name, u.grandfather_name) as inviter_name
                    FROM advertiser_team_members tm
                    JOIN advertiser_profiles ap ON tm.advertiser_profile_id = ap.id
                    LEFT JOIN brand_profile bp ON bp.id = ap.brand_ids[1]
                    LEFT JOIN users u ON tm.invited_by = u.id
                    WHERE tm.invitation_token = %s
                """, (token,))

                invitation = cur.fetchone()

                if not invitation:
                    raise HTTPException(status_code=404, detail="Invalid or expired invitation link")

                if invitation['status'] != 'pending':
                    if invitation['status'] == 'active':
                        raise HTTPException(status_code=400, detail="This invitation has already been accepted")
                    else:
                        raise HTTPException(status_code=400, detail="This invitation is no longer valid")

                permissions = invitation['permissions'] or {}

                return {
                    "success": True,
                    "email": invitation['email'],
                    "invitee_name": invitation['invitee_name'],
                    "inviter_name": invitation['inviter_name'] or "A team member",
                    "brand_name": invitation['brand_name'] or "Brand",
                    "brand_logo": invitation['brand_logo'],
                    "can_set_price": permissions.get('can_set_price', False),
                    "invited_at": invitation['invited_at'].isoformat() if invitation['invited_at'] else None
                }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting invitation details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/team/invitation/{token}/accept")
async def accept_invitation_by_token(token: str, current_user = Depends(get_current_user)):
    """Accept a team invitation using the token from email link"""
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                # Find invitation
                cur.execute("""
                    SELECT id, advertiser_profile_id, email
                    FROM advertiser_team_members
                    WHERE invitation_token = %s AND status = 'pending'
                """, (token,))

                invitation = cur.fetchone()

                if not invitation:
                    raise HTTPException(status_code=404, detail="Invalid or expired invitation")

                # Verify email matches
                if invitation['email'].lower() != current_user.email.lower():
                    raise HTTPException(
                        status_code=403,
                        detail=f"This invitation was sent to {invitation['email']}. Please log in with that email address."
                    )

                # Check if user already has advertiser profile for a different brand
                existing_advertiser_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

                # Accept invitation
                cur.execute("""
                    UPDATE advertiser_team_members
                    SET status = 'active',
                        user_id = %s,
                        accepted_at = CURRENT_TIMESTAMP,
                        invitation_token = NULL
                    WHERE id = %s
                """, (current_user.id, invitation['id']))

                # If user doesn't have advertiser role, add it
                # (This allows them to access the advertiser dashboard)
                if not existing_advertiser_id:
                    # Get user's current roles
                    cur.execute("SELECT roles FROM users WHERE id = %s", (current_user.id,))
                    user = cur.fetchone()
                    roles = user['roles'] or {}

                    # Add advertiser role if not present
                    if 'advertiser' not in roles:
                        roles['advertiser'] = True
                        cur.execute("""
                            UPDATE users
                            SET roles = %s
                            WHERE id = %s
                        """, (psycopg.types.json.Json(roles), current_user.id))

                conn.commit()

                return {
                    "success": True,
                    "message": "You have joined the team!",
                    "advertiser_profile_id": invitation['advertiser_profile_id']
                }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error accepting invitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/team/invitation/{token}/decline")
async def decline_invitation_by_token(token: str, current_user = Depends(get_current_user)):
    """Decline a team invitation"""
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                # Find invitation
                cur.execute("""
                    SELECT id, email
                    FROM advertiser_team_members
                    WHERE invitation_token = %s AND status = 'pending'
                """, (token,))

                invitation = cur.fetchone()

                if not invitation:
                    raise HTTPException(status_code=404, detail="Invalid or expired invitation")

                # Verify email matches
                if invitation['email'].lower() != current_user.email.lower():
                    raise HTTPException(
                        status_code=403,
                        detail="This invitation was sent to a different email address"
                    )

                # Mark as declined (using removed status)
                cur.execute("""
                    UPDATE advertiser_team_members
                    SET status = 'declined',
                        invitation_token = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (invitation['id'],))

                conn.commit()

                return {
                    "success": True,
                    "message": "Invitation declined"
                }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error declining invitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/stats")
async def get_team_stats(current_user = Depends(get_current_user)):
    """Get team statistics"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        COUNT(*) FILTER (WHERE status = 'active') as active_count,
                        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                        COUNT(*) FILTER (WHERE status = 'active' AND permissions->>'can_set_price' = 'true') as can_set_price_count
                    FROM advertiser_team_members
                    WHERE advertiser_profile_id = %s AND status != 'removed'
                """, (advertiser_profile_id,))

                stats = cur.fetchone()

                return {
                    "success": True,
                    "stats": {
                        "active": stats['active_count'] + 1,  # +1 for owner
                        "pending": stats['pending_count'],
                        "brand_managers": stats['active_count'],  # All non-owners are Brand Managers
                        "can_set_price": stats['can_set_price_count'],
                        "total": stats['active_count'] + stats['pending_count'] + 1  # +1 for owner
                    }
                }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching team stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
