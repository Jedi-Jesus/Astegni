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
ADVERTISER_DATABASE_URL = os.getenv("ADVERTISER_DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_advertiser_db")

router = APIRouter(prefix="/api/advertiser", tags=["Advertiser Team"])

# Pydantic models
class TeamMemberInvite(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    dob: Optional[date] = None  # Date of birth for security verification
    can_set_price: bool = False  # Permission to set campaign prices
    # Company restructure (Phase 1.9): team membership is per-company.
    # Optional for backwards compatibility — falls back to advertiser's only company.
    company_id: Optional[int] = None

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

# Database connections
# get_db() -> USER DB (users reads/writes)
def get_db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

# get_adv_db() -> ADVERTISER DB (advertiser_profiles, advertiser_team_members,
# company_profile, brand_profile). Postgres cannot join across these two DBs,
# so cross-DB joins are split into two queries and merged in Python.
def get_adv_db():
    return psycopg.connect(ADVERTISER_DATABASE_URL, row_factory=dict_row)

# Auth dependency (simplified - use your actual auth)
from utils import get_current_user
from advertiser_auth_endpoints import resolve_advertiser
from email_service import email_service

# Base URL for invitation links
BASE_URL = os.getenv("BASE_URL", "https://astegni.com")

# ============================================
# TEAM MEMBER ENDPOINTS
# ============================================

@router.get("/team")
async def get_team_members(current_user = Depends(resolve_advertiser)):
    """Get all team members for the current advertiser"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        # --- Step 1: advertiser DB reads (profile + team members) -----------
        with get_adv_db() as adv_conn:
            with adv_conn.cursor() as adv_cur:
                # Account owner: advertiser profile creator's user_id
                adv_cur.execute("""
                    SELECT ap.user_id
                    FROM advertiser_profiles ap
                    WHERE ap.id = %s
                """, (advertiser_profile_id,))
                owner_row = adv_cur.fetchone()

                # Team members (excluding removed)
                adv_cur.execute("""
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
                        tm.user_id
                    FROM advertiser_team_members tm
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
                members = adv_cur.fetchall()

        # --- Step 2: user DB reads (resolve user_ids -> user info) ----------
        # Collect all user_ids we need from the user DB.
        user_ids = set()
        if owner_row and owner_row['user_id'] is not None:
            user_ids.add(owner_row['user_id'])
        for m in members:
            if m['user_id'] is not None:
                user_ids.add(m['user_id'])

        users_by_id = {}
        if user_ids:
            with get_db() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id, email,
                               CONCAT_WS(' ', first_name, father_name, grandfather_name) as full_name,
                               profile_picture, created_at
                        FROM users
                        WHERE id = ANY(%s)
                    """, (list(user_ids),))
                    for u in cur.fetchall():
                        users_by_id[u['id']] = u

        # --- Step 3: merge in Python ----------------------------------------
        result = []

        # Add owner as the first member (admin/owner)
        owner = users_by_id.get(owner_row['user_id']) if owner_row and owner_row['user_id'] is not None else None
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
            user_info = users_by_id.get(m['user_id']) if m['user_id'] is not None else None
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
                "profile_picture": user_info['profile_picture'] if user_info else None,
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
async def invite_team_member(invite: TeamMemberInvite, current_user = Depends(resolve_advertiser)):
    """Invite a new Brand Manager to the team"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        # Prepare permissions JSON with can_set_price
        permissions = {"can_set_price": invite.can_set_price}

        invitation_token = None  # set when an invite/re-invite row is written

        with get_adv_db() as adv_conn:
            with adv_conn.cursor() as adv_cur:
                # --- Resolve which company this invitation is for -----------
                # Per-company team membership (Phase 1.9 of the restructure).
                if invite.company_id is not None:
                    adv_cur.execute(
                        "SELECT id FROM company_profile WHERE id = %s AND advertiser_id = %s",
                        (invite.company_id, advertiser_profile_id),
                    )
                    if not adv_cur.fetchone():
                        raise HTTPException(status_code=403, detail="You don't own this company")
                    company_id = invite.company_id
                else:
                    # Legacy fallback: advertiser must own exactly 1 company.
                    adv_cur.execute(
                        "SELECT id FROM company_profile WHERE advertiser_id = %s ORDER BY id",
                        (advertiser_profile_id,),
                    )
                    company_rows = adv_cur.fetchall()
                    if len(company_rows) == 0:
                        raise HTTPException(
                            status_code=400,
                            detail="You must create a company before inviting team members.",
                        )
                    if len(company_rows) > 1:
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                "You own multiple companies. Specify company_id in the "
                                "invitation to choose which one the team member belongs to."
                            ),
                        )
                    company_id = company_rows[0]['id']

                # Get inviter's user_id + brand name for the email.
                # SPLIT cross-DB join: advertiser_profiles/brand_profile are on the
                # advertiser DB; the inviter's name lives in users on the user DB.
                adv_cur.execute("""
                    SELECT ap.user_id,
                           bp.name as brand_name
                    FROM advertiser_profiles ap
                    LEFT JOIN brand_profile bp ON bp.id = ap.brand_ids[1]
                    WHERE ap.id = %s
                """, (advertiser_profile_id,))
                inviter_info = adv_cur.fetchone()
                inviter_user_id = inviter_info['user_id'] if inviter_info else None
                brand_name = inviter_info['brand_name'] if inviter_info else "an advertiser"

                # Check if already invited (scoped to the same company)
                adv_cur.execute("""
                    SELECT id, status FROM advertiser_team_members
                    WHERE company_id = %s AND email = %s
                """, (company_id, invite.email))

                existing = adv_cur.fetchone()

                if existing:
                    if existing['status'] == 'active':
                        raise HTTPException(status_code=400, detail="This user is already a team member")
                    elif existing['status'] == 'pending':
                        raise HTTPException(status_code=400, detail="An invitation is already pending for this email")
                    elif existing['status'] == 'removed':
                        # Re-invite removed member as Brand Manager
                        invitation_token = secrets.token_urlsafe(32)
                        adv_cur.execute("""
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
                        member_id = adv_cur.fetchone()['id']
                else:
                    # Check if email belongs to existing user (USER DB).
                    with get_db() as conn:
                        with conn.cursor() as cur:
                            cur.execute("""
                                SELECT id, CONCAT_WS(' ', first_name, father_name, grandfather_name) as full_name
                                FROM users WHERE email = %s
                            """, (invite.email,))
                            user = cur.fetchone()

                    invitation_token = secrets.token_urlsafe(32)

                    adv_cur.execute("""
                        INSERT INTO advertiser_team_members (
                            advertiser_profile_id, company_id, user_id, email, full_name, dob, role,
                            status, invitation_token, invited_by, permissions
                        ) VALUES (%s, %s, %s, %s, %s, %s, 'brand_manager', 'pending', %s, %s, %s)
                        RETURNING id
                    """, (
                        advertiser_profile_id,
                        company_id,
                        user['id'] if user else None,
                        invite.email,
                        invite.full_name or (user['full_name'] if user else None),
                        invite.dob,
                        invitation_token,
                        current_user.id,
                        psycopg.types.json.Json(permissions)
                    ))
                    member_id = adv_cur.fetchone()['id']

                adv_conn.commit()

        # Resolve inviter's name from the user DB (split cross-DB join).
        inviter_name = "A team member"
        if inviter_user_id is not None:
            with get_db() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT CONCAT_WS(' ', first_name, father_name, grandfather_name) as inviter_name
                        FROM users WHERE id = %s
                    """, (inviter_user_id,))
                    name_row = cur.fetchone()
                    if name_row and name_row['inviter_name']:
                        inviter_name = name_row['inviter_name']

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
        with get_adv_db() as conn:
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
async def update_team_member(member_id: int, update: TeamMemberUpdate, current_user = Depends(resolve_advertiser)):
    """Update a Brand Manager's permissions (can_set_price)"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        # Cannot update owner (id = 0)
        if member_id == 0:
            raise HTTPException(status_code=403, detail="Cannot modify owner's permissions")

        with get_adv_db() as conn:
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
async def remove_team_member(member_id: int, current_user = Depends(resolve_advertiser)):
    """Remove a Brand Manager from the team"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        # Cannot remove owner (id = 0)
        if member_id == 0:
            raise HTTPException(status_code=403, detail="Cannot remove account owner")

        with get_adv_db() as conn:
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
async def resend_invitation(member_id: int, current_user = Depends(resolve_advertiser)):
    """Resend invitation to a pending team member"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_adv_db() as conn:
            with conn.cursor() as cur:
                # Get inviter's user_id + brand name for the email.
                # SPLIT cross-DB join: advertiser_profiles/brand_profile on the
                # advertiser DB; inviter's name in users on the user DB.
                cur.execute("""
                    SELECT ap.user_id,
                           bp.name as brand_name
                    FROM advertiser_profiles ap
                    LEFT JOIN brand_profile bp ON bp.id = ap.brand_ids[1]
                    WHERE ap.id = %s
                """, (advertiser_profile_id,))
                inviter_info = cur.fetchone()
                inviter_user_id = inviter_info['user_id'] if inviter_info else None
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

        # Resolve inviter's name from the user DB (split cross-DB join).
        inviter_name = "A team member"
        if inviter_user_id is not None:
            with get_db() as user_conn:
                with user_conn.cursor() as user_cur:
                    user_cur.execute("""
                        SELECT CONCAT_WS(' ', first_name, father_name, grandfather_name) as inviter_name
                        FROM users WHERE id = %s
                    """, (inviter_user_id,))
                    name_row = user_cur.fetchone()
                    if name_row and name_row['inviter_name']:
                        inviter_name = name_row['inviter_name']

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
async def search_users_for_invite(q: str, current_user = Depends(resolve_advertiser)):
    """Search for existing users to invite to the team"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        if not q or len(q) < 2:
            return {"success": True, "users": []}

        # SPLIT cross-DB subquery: the "already invited" emails live in
        # advertiser_team_members on the advertiser DB. Fetch them first, then
        # exclude them from the users search on the user DB.
        with get_adv_db() as adv_conn:
            with adv_conn.cursor() as adv_cur:
                adv_cur.execute("""
                    SELECT email FROM advertiser_team_members
                    WHERE advertiser_profile_id = %s
                    AND status IN ('pending', 'active')
                """, (advertiser_profile_id,))
                excluded_emails = [r['email'] for r in adv_cur.fetchall()]

        with get_db() as conn:
            with conn.cursor() as cur:
                # Search users by email, first_name, father_name, or grandfather_name.
                # Exclude already-invited members via email <> ALL(%s) (empty list
                # is a no-op exclusion).
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
                    AND u.email <> ALL(%s)
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
                    excluded_emails,  # email <> ALL(...)
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
        # SPLIT cross-DB join: invitation + brand live on the advertiser DB;
        # the inviter's name (invited_by) lives in users on the user DB.
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        tm.id,
                        tm.email,
                        tm.full_name as invitee_name,
                        tm.status,
                        tm.permissions,
                        tm.invited_at,
                        tm.invited_by,
                        bp.name as brand_name,
                        bp.thumbnail as brand_logo
                    FROM advertiser_team_members tm
                    JOIN advertiser_profiles ap ON tm.advertiser_profile_id = ap.id
                    LEFT JOIN brand_profile bp ON bp.id = ap.brand_ids[1]
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

        # Resolve inviter's name from the user DB.
        inviter_name = None
        if invitation['invited_by'] is not None:
            with get_db() as user_conn:
                with user_conn.cursor() as user_cur:
                    user_cur.execute("""
                        SELECT CONCAT_WS(' ', first_name, father_name, grandfather_name) as inviter_name
                        FROM users WHERE id = %s
                    """, (invitation['invited_by'],))
                    name_row = user_cur.fetchone()
                    if name_row:
                        inviter_name = name_row['inviter_name']

        permissions = invitation['permissions'] or {}

        return {
            "success": True,
            "email": invitation['email'],
            "invitee_name": invitation['invitee_name'],
            "inviter_name": inviter_name or "A team member",
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
        # Advertiser-DB read + write of the team membership.
        with get_adv_db() as conn:
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

        # Check if user already has advertiser role
        existing_advertiser_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        # If user doesn't have advertiser role, add it (USER DB write).
        # (This allows them to access the advertiser dashboard.)
        if not existing_advertiser_id:
            with get_db() as user_conn:
                with user_conn.cursor() as user_cur:
                    user_cur.execute("SELECT roles FROM users WHERE id = %s", (current_user.id,))
                    user = user_cur.fetchone()
                    roles = user['roles'] or {}

                    # Add advertiser role if not present
                    if 'advertiser' not in roles:
                        roles['advertiser'] = True
                        user_cur.execute("""
                            UPDATE users
                            SET roles = %s
                            WHERE id = %s
                        """, (psycopg.types.json.Json(roles), current_user.id))
                        user_conn.commit()

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
        with get_adv_db() as conn:
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
async def get_team_stats(current_user = Depends(resolve_advertiser)):
    """Get team statistics"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_adv_db() as conn:
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
