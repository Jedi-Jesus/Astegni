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

        # Everything is read from the advertiser DB — advertiser identity is
        # self-contained, no users-table lookups.
        with get_adv_db() as adv_conn:
            with adv_conn.cursor() as adv_cur:
                # Account owner: the advertiser themselves.
                adv_cur.execute("""
                    SELECT email, company_name, first_name, father_name,
                           company_logo, created_at
                    FROM advertiser_profiles WHERE id = %s
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
                        tm.member_advertiser_id,
                        ap.company_logo AS member_logo
                    FROM advertiser_team_members tm
                    LEFT JOIN advertiser_profiles ap ON ap.id = tm.member_advertiser_id
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

        # --- merge ----------------------------------------------------------
        result = []

        # Owner = the advertiser account itself.
        if owner_row:
            owner_person = " ".join(p for p in [owner_row.get('first_name'),
                                                owner_row.get('father_name')] if p).strip()
            result.append({
                "id": 0,  # Special ID for owner
                "email": owner_row['email'],
                "full_name": owner_row.get('company_name') or owner_person or owner_row['email'],
                "role": "owner",  # Special role for account creator
                "status": "active",
                "invited_at": None,
                "accepted_at": owner_row['created_at'].isoformat() if owner_row.get('created_at') else None,
                "last_active": None,
                "permissions": {"full_access": True},
                "profile_picture": owner_row.get('company_logo'),
                "is_owner": True
            })

        # Other team members (Brand Managers). Identity (email/full_name) is stored
        # on the team row; profile picture comes from the member's advertiser
        # account when they've accepted.
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
                "profile_picture": m.get('member_logo'),
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

                # Inviter identity + brand name, read entirely from the advertiser
                # DB. Advertiser auth is self-contained, so the inviter's name lives
                # on advertiser_profiles (no users lookup).
                adv_cur.execute("""
                    SELECT ap.company_name, ap.first_name, ap.father_name,
                           bp.name as brand_name
                    FROM advertiser_profiles ap
                    LEFT JOIN brand_profile bp ON bp.id = ap.brand_ids[1]
                    WHERE ap.id = %s
                """, (advertiser_profile_id,))
                inviter_info = adv_cur.fetchone()
                _person = " ".join(p for p in [
                    (inviter_info or {}).get('first_name'),
                    (inviter_info or {}).get('father_name')] if p).strip()
                inviter_name = ((inviter_info or {}).get('company_name')
                                or _person or "A team member")
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
                        """, (psycopg.types.json.Json(permissions), invitation_token, advertiser_profile_id, invite.full_name, invite.dob, existing['id']))
                        member_id = adv_cur.fetchone()['id']
                else:
                    # Invitees are identified by email only. user_id is legacy and
                    # left NULL — a team member accepts as an advertiser-portal user,
                    # not a platform users row.
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
                        None,
                        invite.email,
                        invite.full_name,
                        invite.dob,
                        invitation_token,
                        advertiser_profile_id,
                        psycopg.types.json.Json(permissions)
                    ))
                    member_id = adv_cur.fetchone()['id']

                adv_conn.commit()

        # inviter_name was resolved above from advertiser_profiles.

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
async def accept_invitation(token: str, current_user = Depends(resolve_advertiser)):
    """Accept a team invitation. The invitee accepts as an advertiser-portal user
    whose advertiser account email matches the invited email."""
    try:
        invitee_advertiser_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None
        invitee_email = (current_user.email or "").lower()
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

                # The accepting advertiser's email must match the invited email.
                if invitation['email'].lower() != invitee_email:
                    raise HTTPException(status_code=403, detail="This invitation was sent to a different email")

                # Record the accepting advertiser as member_advertiser_id (user_id
                # is legacy/NULL — membership is keyed by advertiser_profile_id + email).
                cur.execute("""
                    UPDATE advertiser_team_members
                    SET status = 'active',
                        member_advertiser_id = %s,
                        accepted_at = CURRENT_TIMESTAMP,
                        invitation_token = NULL
                    WHERE id = %s
                """, (invitee_advertiser_id, invitation['id']))

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
                # Inviter name + brand, read entirely from the advertiser DB.
                cur.execute("""
                    SELECT ap.company_name, ap.first_name, ap.father_name,
                           bp.name as brand_name
                    FROM advertiser_profiles ap
                    LEFT JOIN brand_profile bp ON bp.id = ap.brand_ids[1]
                    WHERE ap.id = %s
                """, (advertiser_profile_id,))
                inviter_info = cur.fetchone()
                _person = " ".join(p for p in [
                    (inviter_info or {}).get('first_name'),
                    (inviter_info or {}).get('father_name')] if p).strip()
                inviter_name = ((inviter_info or {}).get('company_name')
                                or _person or "A team member")
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

        # inviter_name resolved above from advertiser_profiles.

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

        # Search existing ADVERTISER accounts to invite (advertisers are a separate
        # identity; team invitees are advertiser-portal users, not platform users).
        # Everything stays within the advertiser DB. Exclude already-invited emails
        # and the inviter's own account.
        with get_adv_db() as adv_conn:
            with adv_conn.cursor() as adv_cur:
                adv_cur.execute("""
                    SELECT email FROM advertiser_team_members
                    WHERE advertiser_profile_id = %s
                    AND status IN ('pending', 'active')
                """, (advertiser_profile_id,))
                excluded_emails = [r['email'] for r in adv_cur.fetchall()]

                adv_cur.execute("""
                    SELECT
                        ap.id,
                        ap.email,
                        ap.first_name,
                        ap.father_name,
                        ap.company_name,
                        ap.company_logo,
                        CONCAT_WS(' ', ap.first_name, ap.father_name) as full_name
                    FROM advertiser_profiles ap
                    WHERE ap.email IS NOT NULL
                    AND ap.is_active = TRUE
                    AND (
                        LOWER(ap.email) LIKE LOWER(%s)
                        OR LOWER(ap.first_name) LIKE LOWER(%s)
                        OR LOWER(ap.father_name) LIKE LOWER(%s)
                        OR LOWER(ap.company_name) LIKE LOWER(%s)
                        OR LOWER(CONCAT_WS(' ', ap.first_name, ap.father_name)) LIKE LOWER(%s)
                    )
                    AND ap.id != %s
                    AND ap.email <> ALL(%s)
                    ORDER BY
                        CASE WHEN LOWER(ap.email) LIKE LOWER(%s) THEN 0 ELSE 1 END,
                        ap.first_name, ap.father_name
                    LIMIT 10
                """, (
                    f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%",
                    advertiser_profile_id,
                    excluded_emails,
                    f"{q}%",
                ))
                advertisers = adv_cur.fetchall()

        result = [{
            "id": a['id'],
            "email": a['email'],
            "first_name": a['first_name'],
            "father_name": a['father_name'],
            "grandfather_name": None,
            "full_name": a['company_name'] or a['full_name'],
            "profile_picture": a['company_logo'],
            "roles": ['advertiser'],
        } for a in advertisers]

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
                # invited_by is the inviting advertiser_profiles.id, so the inviter
                # name comes from advertiser_profiles (all within the advertiser DB).
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
                        bp.thumbnail as brand_logo,
                        inviter.company_name AS inviter_company,
                        inviter.first_name  AS inviter_first,
                        inviter.father_name AS inviter_father
                    FROM advertiser_team_members tm
                    JOIN advertiser_profiles ap ON tm.advertiser_profile_id = ap.id
                    LEFT JOIN brand_profile bp ON bp.id = ap.brand_ids[1]
                    LEFT JOIN advertiser_profiles inviter ON inviter.id = tm.invited_by
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

        _inviter_person = " ".join(p for p in [invitation.get('inviter_first'),
                                               invitation.get('inviter_father')] if p).strip()
        inviter_name = invitation.get('inviter_company') or _inviter_person or None

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
async def accept_invitation_by_token(token: str, current_user = Depends(resolve_advertiser)):
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

                # The accepting advertiser's email must match the invited email.
                invitee_advertiser_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None
                if invitation['email'].lower() != (current_user.email or "").lower():
                    raise HTTPException(
                        status_code=403,
                        detail=f"This invitation was sent to {invitation['email']}. Please log in with that email address."
                    )

                # Accept invitation. The invitee is already an advertiser-portal
                # user (they logged in to accept), so there is no users-table role
                # to grant. user_id is legacy/NULL; record member_advertiser_id.
                cur.execute("""
                    UPDATE advertiser_team_members
                    SET status = 'active',
                        member_advertiser_id = %s,
                        accepted_at = CURRENT_TIMESTAMP,
                        invitation_token = NULL
                    WHERE id = %s
                """, (invitee_advertiser_id, invitation['id']))

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
async def decline_invitation_by_token(token: str, current_user = Depends(resolve_advertiser)):
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
                if invitation['email'].lower() != (current_user.email or "").lower():
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
