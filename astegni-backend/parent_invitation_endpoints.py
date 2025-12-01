"""
Parent Invitation Endpoints for Astegni Platform

INVITATION FLOW (Student invites Parent):
=========================================

1. SEARCH FOR EXISTING USER:
   - Student searches users by name, email, or phone
   - Returns matching users with minimal info (profile pic, name, contact, roles)

2. INVITE EXISTING USER:
   - Student selects user and provides relationship_type
   - Security verification: Student enters their father_name and grandfather_name
   - Creates pending invitation in parent_invitations table (just invitation_id, no parent_user_id yet)
   - Parent sees invitation in their profile (Requests > Parenting Invitations)
   - Parent can accept/reject

3. INVITE NEW USER (Not in system):
   - Student fills: first_name, father_name, grandfather_name, email/phone, relationship_type
   - Security verification: Student enters their father_name and grandfather_name
   - ALL information saved in parent_invitations table (NO user created yet)
   - Includes: pending_email, pending_phone, pending_first_name, pending_father_name,
     pending_grandfather_name, pending_gender, temp_password_hash, invitation_token
   - Temp password sent via email/SMS
   - When new parent logs in with temp password:
     a) User account is created in users table
     b) parent_user_id in invitation is updated
     c) Invitation is auto-accepted (login = acceptance)
     d) Parent-student link is established

4. ACCEPT INVITATION (Existing users only):
   - Parent views pending invitations in their profile
   - On accept: parent_id added to student's parent_id array
   - student's user_id added to parent's children_ids array
   - Invitation marked as accepted

5. REJECT INVITATION:
   - Parent rejects invitation
   - Invitation marked as rejected
   - No links created

6. NEW USER LOGIN (Temp password):
   - User logs in with temp password from email
   - User account created in users table
   - Invitation auto-accepted
   - Parent-student link established
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, text
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import secrets

from models import (
    Base, User, ParentProfile, StudentProfile,
    get_db
)
from utils import get_current_user, hash_password
from email_service import email_service

router = APIRouter()


# ============================================
# PYDANTIC SCHEMAS
# ============================================

class UserSearchResult(BaseModel):
    user_id: int
    first_name: str
    father_name: str
    grandfather_name: str
    email: Optional[str]
    phone: Optional[str]
    profile_picture: Optional[str]
    roles: List[str]
    has_parent_role: bool

    class Config:
        from_attributes = True


class InviteExistingUserRequest(BaseModel):
    target_user_id: int
    relationship_type: str  # Father, Mother, Guardian, Uncle, Aunt, etc.
    security_father_name: str
    security_grandfather_name: str


class InviteNewUserRequest(BaseModel):
    first_name: str
    father_name: str
    grandfather_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    relationship_type: str
    security_father_name: str
    security_grandfather_name: str


class ParentInvitationResponse(BaseModel):
    id: int
    student_user_id: int
    student_name: str
    student_profile_picture: Optional[str]
    parent_user_id: int
    parent_name: str
    parent_profile_picture: Optional[str]
    relationship_type: str
    status: str  # pending, accepted, rejected
    created_at: datetime
    responded_at: Optional[datetime]

    class Config:
        from_attributes = True


class LinkedParentResponse(BaseModel):
    user_id: int
    profile_id: Optional[int]
    first_name: str
    father_name: str
    grandfather_name: str
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    relationship_type: Optional[str]
    profile_picture: Optional[str]
    is_verified: bool
    linked_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============================================
# USER SEARCH ENDPOINT
# ============================================

@router.get("/api/users/search", response_model=List[UserSearchResult])
async def search_users(
    q: str = Query(..., min_length=2, description="Search query (name, email, or phone)"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for users by name, email, or phone.
    Used for inviting parents to connect with student.
    Search matches names that START WITH the query (not contains).
    """
    # Use "starts with" pattern (query%) instead of "contains" (%query%)
    starts_with_term = f"{q.lower()}%"

    # Search by first name, email, or phone (starts with)
    # Note: Only search first_name since father/grandfather names are for security verification
    users = db.query(User).filter(
        User.id != current_user.id,  # Exclude current user
        User.is_active == True,
        or_(
            func.lower(User.first_name).like(starts_with_term),
            func.lower(User.email).like(starts_with_term),
            User.phone.like(starts_with_term)
        )
    ).limit(limit).all()

    results = []
    for user in users:
        # Get profile picture from parent or other profile
        profile_picture = None
        if "parent" in (user.roles or []):
            parent_profile = db.query(ParentProfile).filter(
                ParentProfile.user_id == user.id
            ).first()
            if parent_profile:
                profile_picture = parent_profile.profile_picture

        if not profile_picture:
            # Try other profiles
            student_profile = db.query(StudentProfile).filter(
                StudentProfile.user_id == user.id
            ).first()
            if student_profile:
                profile_picture = student_profile.profile_picture

        results.append(UserSearchResult(
            user_id=user.id,
            first_name=user.first_name,
            father_name=user.father_name,
            grandfather_name=user.grandfather_name,
            email=user.email,
            phone=user.phone,
            profile_picture=profile_picture,
            roles=user.roles or [],
            has_parent_role="parent" in (user.roles or [])
        ))

    return results


# ============================================
# PARENT INVITATION ENDPOINTS
# ============================================

@router.post("/api/student/invite-parent")
async def invite_existing_parent(
    request: InviteExistingUserRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Invite an existing user to be a parent.
    Security verification: student must know the TARGET USER's father and grandfather name.
    This proves the student actually knows this person (their real parent would know this).
    """
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only students can invite parents")

    # Check if target user exists FIRST (needed for security verification)
    target_user = db.query(User).filter(User.id == request.target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Security verification - check against TARGET USER's father/grandfather name
    # Student must prove they know this person by knowing their family names
    if (request.security_father_name.lower().strip() != (target_user.father_name or '').lower().strip() or
        request.security_grandfather_name.lower().strip() != (target_user.grandfather_name or '').lower().strip()):
        raise HTTPException(
            status_code=400,
            detail="Security verification failed. The names you entered don't match this person's records."
        )

    # Get student profile
    student_profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Check if already linked
    if student_profile.parent_id and request.target_user_id in student_profile.parent_id:
        raise HTTPException(status_code=400, detail="This parent is already linked to your profile")

    # Check for existing pending invitation
    existing_invitation = db.execute(
        text("""
        SELECT id FROM parent_invitations
        WHERE student_user_id = :student_id
        AND parent_user_id = :parent_id
        AND status = 'pending'
        """),
        {"student_id": current_user.id, "parent_id": request.target_user_id}
    ).fetchone()

    if existing_invitation:
        raise HTTPException(status_code=400, detail="A pending invitation already exists for this user")

    # Add parent role if not present
    if "parent" not in (target_user.roles or []):
        target_user.roles = (target_user.roles or []) + ["parent"]

        # Create parent profile if doesn't exist
        parent_profile = db.query(ParentProfile).filter(
            ParentProfile.user_id == target_user.id
        ).first()

        if not parent_profile:
            parent_profile = ParentProfile(
                user_id=target_user.id,
                relationship_type=request.relationship_type
            )
            db.add(parent_profile)

    # Create invitation
    db.execute(
        text("""
        INSERT INTO parent_invitations (student_user_id, parent_user_id, relationship_type, status, created_at)
        VALUES (:student_id, :parent_id, :relationship_type, 'pending', :created_at)
        """),
        {
            "student_id": current_user.id,
            "parent_id": request.target_user_id,
            "relationship_type": request.relationship_type,
            "created_at": datetime.utcnow()
        }
    )

    db.commit()

    return {
        "message": "Invitation sent successfully",
        "parent_user_id": request.target_user_id,
        "status": "pending"
    }


@router.post("/api/student/invite-new-parent")
async def invite_new_parent(
    request: InviteNewUserRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Invite a NEW user (not in system) as parent.
    DOES NOT create user account - stores all info in parent_invitations table.
    User account is created only when they log in with the temp password.

    Security: student must provide the new parent's father/grandfather name,
    which will become part of the new user's profile when they accept.
    """
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only students can invite parents")

    # Security verification - for new users, the security names should match the father_name provided
    # This confirms the student knows who they're inviting (their real parent's father = student's grandfather)
    if (request.security_father_name.lower().strip() != request.father_name.lower().strip() or
        request.security_grandfather_name.lower().strip() != request.grandfather_name.lower().strip()):
        raise HTTPException(
            status_code=400,
            detail="Security verification failed. The verification names must match the father and grandfather names you entered above."
        )

    # Validate email or phone
    if not request.email and not request.phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    # Check if user already exists in users table
    existing_user = None
    if request.email:
        existing_user = db.query(User).filter(User.email == request.email).first()
    if not existing_user and request.phone:
        existing_user = db.query(User).filter(User.phone == request.phone).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this email/phone already exists. Please search and invite them instead."
        )

    # Check for existing pending invitation for this email/phone
    existing_invitation = None
    if request.email:
        existing_invitation = db.execute(
            text("""
            SELECT id FROM parent_invitations
            WHERE student_user_id = :student_id
            AND pending_email = :email
            AND status = 'pending'
            """),
            {"student_id": current_user.id, "email": request.email}
        ).fetchone()

    if not existing_invitation and request.phone:
        existing_invitation = db.execute(
            text("""
            SELECT id FROM parent_invitations
            WHERE student_user_id = :student_id
            AND pending_phone = :phone
            AND status = 'pending'
            """),
            {"student_id": current_user.id, "phone": request.phone}
        ).fetchone()

    if existing_invitation:
        raise HTTPException(status_code=400, detail="A pending invitation already exists for this email/phone")

    # Get student profile (just to verify student exists)
    student_profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Generate temporary password and invitation token
    temp_password = secrets.token_urlsafe(12)
    invitation_token = secrets.token_urlsafe(32)

    # Hash the temp password for storage
    temp_password_hash = hash_password(temp_password)

    # Create invitation with ALL pending user info (NO user created yet!)
    db.execute(
        text("""
        INSERT INTO parent_invitations (
            student_user_id, parent_user_id, relationship_type, status, created_at,
            is_new_user, pending_email, pending_phone, pending_first_name,
            pending_father_name, pending_grandfather_name, pending_gender,
            temp_password_hash, invitation_token, token_expires_at
        )
        VALUES (
            :student_id, NULL, :relationship_type, 'pending', :created_at,
            TRUE, :email, :phone, :first_name,
            :father_name, :grandfather_name, :gender,
            :temp_password_hash, :invitation_token, :token_expires_at
        )
        """),
        {
            "student_id": current_user.id,
            "relationship_type": request.relationship_type,
            "created_at": datetime.utcnow(),
            "email": request.email,
            "phone": request.phone,
            "first_name": request.first_name,
            "father_name": request.father_name,
            "grandfather_name": request.grandfather_name,
            "gender": request.gender,
            "temp_password_hash": temp_password_hash,
            "invitation_token": invitation_token,
            "token_expires_at": datetime.utcnow() + timedelta(days=30)  # Token valid for 30 days
        }
    )

    db.commit()

    # Send temp password via email
    email_sent = False
    if request.email:
        student_name = f"{current_user.first_name} {current_user.father_name}"
        parent_name = f"{request.first_name} {request.father_name}"
        email_sent = email_service.send_parent_invitation_email(
            to_email=request.email,
            parent_name=parent_name,
            student_name=student_name,
            temp_password=temp_password,
            relationship_type=request.relationship_type
        )

    # TODO: Add SMS sending support for phone invitations
    # if request.phone and not email_sent:
    #     send_sms(request.phone, f"Your Astegni temporary password is: {temp_password}")

    return {
        "message": "Invitation sent!" + (" Email sent successfully." if email_sent else " Please share the temporary password manually."),
        "invitation_token": invitation_token,
        "email_sent": email_sent,
        "temp_password": temp_password,  # Remove in production - only send via email/SMS
        "email": request.email,
        "phone": request.phone,
        "status": "pending",
        "is_new_user": True
    }


@router.get("/api/student/parent-invitations")
async def get_student_invitations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all parent invitations sent by current student (both existing and new users)"""
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only students can view their invitations")

    # Get all invitations - both for existing users (parent_user_id set) and new users (pending_* fields)
    invitations = db.execute(
        text("""
        SELECT pi.*,
               u.first_name as parent_first_name,
               u.father_name as parent_father_name,
               pp.profile_picture as parent_profile_picture
        FROM parent_invitations pi
        LEFT JOIN users u ON pi.parent_user_id = u.id
        LEFT JOIN parent_profiles pp ON pp.user_id = u.id
        WHERE pi.student_user_id = :student_id
        ORDER BY pi.created_at DESC
        """),
        {"student_id": current_user.id}
    ).fetchall()

    result_invitations = []
    for inv in invitations:
        # Determine if this is for an existing user or new user
        is_new_user = inv.is_new_user or inv.parent_user_id is None

        if is_new_user:
            # New user invitation - use pending_* fields
            parent_name = f"{inv.pending_first_name or ''} {inv.pending_father_name or ''}".strip() or "Pending User"
            parent_email = inv.pending_email
            parent_phone = inv.pending_phone
            parent_profile_picture = None
            parent_user_id = None
        else:
            # Existing user invitation
            parent_name = f"{inv.parent_first_name or ''} {inv.parent_father_name or ''}".strip()
            parent_email = None
            parent_phone = None
            parent_profile_picture = inv.parent_profile_picture
            parent_user_id = inv.parent_user_id

        result_invitations.append({
            "id": inv.id,
            "parent_user_id": parent_user_id,
            "parent_name": parent_name,
            "parent_email": parent_email,
            "parent_phone": parent_phone,
            "parent_profile_picture": parent_profile_picture,
            "relationship_type": inv.relationship_type,
            "status": inv.status,
            "is_new_user": is_new_user,
            "created_at": inv.created_at,
            "responded_at": inv.responded_at
        })

    return {"invitations": result_invitations}


@router.get("/api/parent/pending-invitations")
async def get_parent_pending_invitations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pending invitations for current parent to accept/reject"""
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only parents can view their invitations")

    invitations = db.execute(
        text("""
        SELECT pi.*,
               u.first_name as student_first_name,
               u.father_name as student_father_name,
               sp.profile_picture as student_profile_picture,
               sp.grade_level,
               sp.studying_at
        FROM parent_invitations pi
        JOIN users u ON pi.student_user_id = u.id
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        WHERE pi.parent_user_id = :parent_id AND pi.status = 'pending'
        ORDER BY pi.created_at DESC
        """),
        {"parent_id": current_user.id}
    ).fetchall()

    return {
        "invitations": [
            {
                "id": inv.id,
                "student_user_id": inv.student_user_id,
                "student_name": f"{inv.student_first_name} {inv.student_father_name}",
                "student_profile_picture": inv.student_profile_picture,
                "grade_level": inv.grade_level,
                "studying_at": inv.studying_at,
                "relationship_type": inv.relationship_type,
                "status": inv.status,
                "created_at": inv.created_at
            }
            for inv in invitations
        ]
    }


@router.post("/api/parent/respond-invitation/{invitation_id}")
async def respond_to_invitation(
    invitation_id: int,
    accept: bool,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept or reject a parent invitation"""
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only parents can respond to invitations")

    # Get invitation
    invitation = db.execute(
        text("""
        SELECT * FROM parent_invitations
        WHERE id = :id AND parent_user_id = :parent_id AND status = 'pending'
        """),
        {"id": invitation_id, "parent_id": current_user.id}
    ).fetchone()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or already processed")

    if accept:
        # Get student profile
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == invitation.student_user_id
        ).first()

        # Get parent profile
        parent_profile = db.query(ParentProfile).filter(
            ParentProfile.user_id == current_user.id
        ).first()

        if not parent_profile:
            parent_profile = ParentProfile(
                user_id=current_user.id,
                relationship_type=invitation.relationship_type
            )
            db.add(parent_profile)
            db.flush()

        # Link parent to student
        if student_profile:
            if not student_profile.parent_id:
                student_profile.parent_id = []
            if current_user.id not in student_profile.parent_id:
                student_profile.parent_id = student_profile.parent_id + [current_user.id]

        # Link student to parent
        if not parent_profile.children_ids:
            parent_profile.children_ids = []
        if invitation.student_user_id not in parent_profile.children_ids:
            parent_profile.children_ids = parent_profile.children_ids + [invitation.student_user_id]
            parent_profile.total_children = len(parent_profile.children_ids)

        # Update invitation status
        db.execute(
            text("""
            UPDATE parent_invitations
            SET status = 'accepted', responded_at = :now
            WHERE id = :id
            """),
            {"id": invitation_id, "now": datetime.utcnow()}
        )

        db.commit()

        return {"message": "Invitation accepted. You are now linked as parent.", "status": "accepted"}
    else:
        # Reject invitation
        db.execute(
            text("""
            UPDATE parent_invitations
            SET status = 'rejected', responded_at = :now
            WHERE id = :id
            """),
            {"id": invitation_id, "now": datetime.utcnow()}
        )

        db.commit()

        return {"message": "Invitation rejected.", "status": "rejected"}


@router.get("/api/student/linked-parents")
async def get_linked_parents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all parents linked to current student"""
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only students can view their linked parents")

    student_profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    parents = []
    if student_profile.parent_id:
        for parent_user_id in student_profile.parent_id:
            parent_user = db.query(User).filter(User.id == parent_user_id).first()
            if parent_user:
                parent_profile = db.query(ParentProfile).filter(
                    ParentProfile.user_id == parent_user_id
                ).first()

                parents.append(LinkedParentResponse(
                    user_id=parent_user.id,
                    profile_id=parent_profile.id if parent_profile else None,
                    first_name=parent_user.first_name,
                    father_name=parent_user.father_name,
                    grandfather_name=parent_user.grandfather_name,
                    full_name=f"{parent_user.first_name} {parent_user.father_name} {parent_user.grandfather_name}",
                    email=parent_user.email,
                    phone=parent_user.phone,
                    relationship_type=parent_profile.relationship_type if parent_profile else None,
                    profile_picture=parent_profile.profile_picture if parent_profile else None,
                    is_verified=parent_profile.is_verified if parent_profile else False,
                    linked_at=None  # Could add this to invitation table if needed
                ))

    return {"parents": parents, "total": len(parents)}


@router.delete("/api/student/unlink-parent/{parent_user_id}")
async def unlink_parent(
    parent_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a parent from student's linked parents"""
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only students can unlink parents")

    student_profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    if not student_profile.parent_id or parent_user_id not in student_profile.parent_id:
        raise HTTPException(status_code=404, detail="Parent not linked to your profile")

    # Remove parent from student
    student_profile.parent_id = [p for p in student_profile.parent_id if p != parent_user_id]

    # Remove student from parent
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == parent_user_id
    ).first()

    if parent_profile and parent_profile.children_ids:
        parent_profile.children_ids = [c for c in parent_profile.children_ids if c != current_user.id]
        parent_profile.total_children = len(parent_profile.children_ids)

    db.commit()

    return {"message": "Parent unlinked successfully"}


# ============================================
# TEMP PASSWORD LOGIN ENDPOINT (For New Parents)
# ============================================

class TempPasswordLoginRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    temp_password: str


@router.post("/api/parent/temp-login")
async def login_with_temp_password(
    request: TempPasswordLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login endpoint for new parents invited via temp password.
    When logging in with temp password:
    1. Find the pending invitation with matching email/phone
    2. Verify the temp password
    3. Create the user account in users table
    4. Create the parent profile
    5. Update invitation with parent_user_id
    6. Auto-accept the invitation (login = acceptance)
    7. Link parent and student

    Returns JWT tokens for the newly created user.
    """
    from utils import verify_password, create_access_token, create_refresh_token

    if not request.email and not request.phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    # Find pending invitation with this email/phone
    invitation = None
    if request.email:
        invitation = db.execute(
            text("""
            SELECT * FROM parent_invitations
            WHERE pending_email = :email
            AND status = 'pending'
            AND is_new_user = TRUE
            AND token_expires_at > :now
            ORDER BY created_at DESC
            LIMIT 1
            """),
            {"email": request.email, "now": datetime.utcnow()}
        ).fetchone()

    if not invitation and request.phone:
        invitation = db.execute(
            text("""
            SELECT * FROM parent_invitations
            WHERE pending_phone = :phone
            AND status = 'pending'
            AND is_new_user = TRUE
            AND token_expires_at > :now
            ORDER BY created_at DESC
            LIMIT 1
            """),
            {"phone": request.phone, "now": datetime.utcnow()}
        ).fetchone()

    if not invitation:
        raise HTTPException(
            status_code=404,
            detail="No pending invitation found for this email/phone, or invitation has expired"
        )

    # Verify temp password
    if not verify_password(request.temp_password, invitation.temp_password_hash):
        raise HTTPException(status_code=401, detail="Invalid temporary password")

    # Create the user account NOW
    new_user = User(
        first_name=invitation.pending_first_name,
        father_name=invitation.pending_father_name,
        grandfather_name=invitation.pending_grandfather_name,
        email=invitation.pending_email,
        phone=invitation.pending_phone,
        gender=invitation.pending_gender,
        password_hash=invitation.temp_password_hash,  # Keep same password for now
        roles=["parent"],
        active_role="parent",
        is_active=True
    )
    db.add(new_user)
    db.flush()

    # Create parent profile
    parent_profile = ParentProfile(
        user_id=new_user.id,
        relationship_type=invitation.relationship_type
    )
    db.add(parent_profile)
    db.flush()

    # Get student profile
    student_profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == invitation.student_user_id
    ).first()

    # Link parent to student
    if student_profile:
        if not student_profile.parent_id:
            student_profile.parent_id = []
        if new_user.id not in student_profile.parent_id:
            student_profile.parent_id = student_profile.parent_id + [new_user.id]

    # Link student to parent
    if not parent_profile.children_ids:
        parent_profile.children_ids = []
    if invitation.student_user_id not in parent_profile.children_ids:
        parent_profile.children_ids = parent_profile.children_ids + [invitation.student_user_id]
        parent_profile.total_children = len(parent_profile.children_ids)

    # Update invitation: set parent_user_id and mark as accepted
    db.execute(
        text("""
        UPDATE parent_invitations
        SET parent_user_id = :parent_id,
            status = 'accepted',
            responded_at = :now
        WHERE id = :invitation_id
        """),
        {
            "parent_id": new_user.id,
            "invitation_id": invitation.id,
            "now": datetime.utcnow()
        }
    )

    db.commit()

    # Generate JWT tokens for the new user
    access_token = create_access_token(data={"sub": str(new_user.id)})
    refresh_token = create_refresh_token(data={"sub": str(new_user.id)})

    return {
        "message": "Account created and invitation accepted successfully!",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "first_name": new_user.first_name,
            "father_name": new_user.father_name,
            "grandfather_name": new_user.grandfather_name,
            "email": new_user.email,
            "phone": new_user.phone,
            "roles": new_user.roles,
            "active_role": new_user.active_role
        },
        "linked_student_id": invitation.student_user_id
    }


@router.post("/api/parent/change-temp-password")
async def change_temp_password(
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allow parent to change their temporary password after first login.
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only parents can use this endpoint")

    # Update password
    current_user.password_hash = hash_password(new_password)
    db.commit()

    return {"message": "Password changed successfully"}


# ============================================
# CO-PARENT INVITATION ENDPOINTS
# ============================================

class InviteCoParentRequest(BaseModel):
    """Request model for inviting an existing user as co-parent"""
    target_user_id: int
    relationship_type: str  # Father, Mother, Guardian, etc.


class InviteNewCoParentRequest(BaseModel):
    """Request model for inviting a new user as co-parent"""
    first_name: str
    father_name: str
    grandfather_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    relationship_type: str


@router.post("/api/parent/invite-existing-coparent")
async def invite_existing_coparent(
    request: InviteCoParentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Invite an EXISTING user to be a co-parent.
    Creates a pending invitation that the target user can accept/reject.
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only parents can invite co-parents")

    # Get current parent's profile
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    if not parent_profile.children_ids or len(parent_profile.children_ids) == 0:
        raise HTTPException(status_code=400, detail="You have no children to share parenting with")

    # Get the target user
    target_user = db.query(User).filter(User.id == request.target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    # Check if they're already a co-parent (share any children)
    target_parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == target_user.id
    ).first()

    if target_parent_profile and target_parent_profile.children_ids:
        shared_children = set(parent_profile.children_ids) & set(target_parent_profile.children_ids)
        if shared_children:
            raise HTTPException(status_code=400, detail="This user is already a co-parent of your children")

    # Check for existing pending invitation
    existing_invitation = db.execute(
        text("""
        SELECT id FROM coparent_invitations
        WHERE inviter_user_id = :inviter_id
        AND invitee_user_id = :invitee_id
        AND status = 'pending'
        """),
        {"inviter_id": current_user.id, "invitee_id": target_user.id}
    ).fetchone()

    if existing_invitation:
        raise HTTPException(status_code=400, detail="A pending invitation already exists for this user")

    # Create the invitation
    db.execute(
        text("""
        INSERT INTO coparent_invitations (
            inviter_user_id, invitee_user_id, relationship_type, status,
            is_new_user, created_at
        )
        VALUES (
            :inviter_id, :invitee_id, :relationship_type, 'pending',
            FALSE, :created_at
        )
        """),
        {
            "inviter_id": current_user.id,
            "invitee_id": target_user.id,
            "relationship_type": request.relationship_type,
            "created_at": datetime.utcnow()
        }
    )

    db.commit()

    return {
        "message": "Co-parent invitation sent successfully!",
        "invitee_name": f"{target_user.first_name} {target_user.father_name}",
        "relationship_type": request.relationship_type,
        "status": "pending"
    }


@router.post("/api/parent/invite-new-coparent")
async def invite_new_coparent(
    request: InviteNewCoParentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Invite a NEW user (not in system) to be a co-parent.
    Does NOT create user account - stores all info in coparent_invitations table.
    User account is created only when they log in with the temp password.
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only parents can invite co-parents")

    # Get current parent's profile
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    if not parent_profile.children_ids or len(parent_profile.children_ids) == 0:
        raise HTTPException(status_code=400, detail="You have no children to share parenting with")

    # Validate email or phone
    if not request.email and not request.phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    # Check if user already exists
    existing_user = None
    if request.email:
        existing_user = db.query(User).filter(User.email == request.email).first()
    if not existing_user and request.phone:
        existing_user = db.query(User).filter(User.phone == request.phone).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this email/phone already exists. Please search and invite them instead."
        )

    # Check for existing pending invitation
    existing_invitation = None
    if request.email:
        existing_invitation = db.execute(
            text("""
            SELECT id FROM coparent_invitations
            WHERE inviter_user_id = :inviter_id
            AND pending_email = :email
            AND status = 'pending'
            """),
            {"inviter_id": current_user.id, "email": request.email}
        ).fetchone()

    if not existing_invitation and request.phone:
        existing_invitation = db.execute(
            text("""
            SELECT id FROM coparent_invitations
            WHERE inviter_user_id = :inviter_id
            AND pending_phone = :phone
            AND status = 'pending'
            """),
            {"inviter_id": current_user.id, "phone": request.phone}
        ).fetchone()

    if existing_invitation:
        raise HTTPException(status_code=400, detail="A pending invitation already exists for this email/phone")

    # Generate temporary password and invitation token
    temp_password = secrets.token_urlsafe(12)
    invitation_token = secrets.token_urlsafe(32)
    temp_password_hash = hash_password(temp_password)

    # Create invitation with ALL pending user info
    db.execute(
        text("""
        INSERT INTO coparent_invitations (
            inviter_user_id, invitee_user_id, relationship_type, status, created_at,
            is_new_user, pending_email, pending_phone, pending_first_name,
            pending_father_name, pending_grandfather_name, pending_gender,
            temp_password_hash, invitation_token, token_expires_at
        )
        VALUES (
            :inviter_id, NULL, :relationship_type, 'pending', :created_at,
            TRUE, :email, :phone, :first_name,
            :father_name, :grandfather_name, :gender,
            :temp_password_hash, :invitation_token, :token_expires_at
        )
        """),
        {
            "inviter_id": current_user.id,
            "relationship_type": request.relationship_type,
            "created_at": datetime.utcnow(),
            "email": request.email,
            "phone": request.phone,
            "first_name": request.first_name,
            "father_name": request.father_name,
            "grandfather_name": request.grandfather_name,
            "gender": request.gender,
            "temp_password_hash": temp_password_hash,
            "invitation_token": invitation_token,
            "token_expires_at": datetime.utcnow() + timedelta(days=30)
        }
    )

    db.commit()

    # Send temp password via email
    email_sent = False
    if request.email:
        inviter_name = f"{current_user.first_name} {current_user.father_name}"
        email_sent = email_service.send_coparent_invitation_email(
            to_email=request.email,
            inviter_name=inviter_name,
            temp_password=temp_password,
            relationship_type=request.relationship_type
        )

    return {
        "message": "Co-parent invitation sent!" + (" Email sent successfully." if email_sent else " Please share the temporary password manually."),
        "invitation_token": invitation_token,
        "email_sent": email_sent,
        "temp_password": temp_password,  # Remove in production
        "email": request.email,
        "phone": request.phone,
        "status": "pending",
        "is_new_user": True
    }


@router.get("/api/parent/coparent-invitations-sent")
async def get_coparent_invitations_sent(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all co-parent invitations SENT by current parent"""
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only parents can view their invitations")

    invitations = db.execute(
        text("""
        SELECT ci.*,
               u.first_name as invitee_first_name,
               u.father_name as invitee_father_name,
               pp.profile_picture as invitee_profile_picture
        FROM coparent_invitations ci
        LEFT JOIN users u ON ci.invitee_user_id = u.id
        LEFT JOIN parent_profiles pp ON pp.user_id = u.id
        WHERE ci.inviter_user_id = :inviter_id
        ORDER BY ci.created_at DESC
        """),
        {"inviter_id": current_user.id}
    ).fetchall()

    result_invitations = []
    for inv in invitations:
        is_new_user = inv.is_new_user or inv.invitee_user_id is None

        if is_new_user:
            invitee_name = f"{inv.pending_first_name or ''} {inv.pending_father_name or ''}".strip() or "Pending User"
            invitee_email = inv.pending_email
            invitee_phone = inv.pending_phone
            invitee_profile_picture = None
            invitee_user_id = None
        else:
            invitee_name = f"{inv.invitee_first_name or ''} {inv.invitee_father_name or ''}".strip()
            invitee_email = None
            invitee_phone = None
            invitee_profile_picture = inv.invitee_profile_picture
            invitee_user_id = inv.invitee_user_id

        result_invitations.append({
            "id": inv.id,
            "invitee_user_id": invitee_user_id,
            "invitee_name": invitee_name,
            "invitee_email": invitee_email,
            "invitee_phone": invitee_phone,
            "invitee_profile_picture": invitee_profile_picture,
            "relationship_type": inv.relationship_type,
            "status": inv.status,
            "is_new_user": is_new_user,
            "created_at": inv.created_at,
            "responded_at": inv.responded_at
        })

    return {"invitations": result_invitations}


@router.get("/api/parent/coparent-invitations-received")
async def get_coparent_invitations_received(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all co-parent invitations RECEIVED by current parent (pending ones)"""
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only parents can view their invitations")

    invitations = db.execute(
        text("""
        SELECT ci.*,
               u.first_name as inviter_first_name,
               u.father_name as inviter_father_name,
               pp.profile_picture as inviter_profile_picture
        FROM coparent_invitations ci
        JOIN users u ON ci.inviter_user_id = u.id
        LEFT JOIN parent_profiles pp ON pp.user_id = u.id
        WHERE ci.invitee_user_id = :invitee_id
        ORDER BY ci.created_at DESC
        """),
        {"invitee_id": current_user.id}
    ).fetchall()

    result_invitations = []
    for inv in invitations:
        inviter_name = f"{inv.inviter_first_name or ''} {inv.inviter_father_name or ''}".strip()

        result_invitations.append({
            "id": inv.id,
            "inviter_user_id": inv.inviter_user_id,
            "inviter_name": inviter_name,
            "inviter_profile_picture": inv.inviter_profile_picture,
            "relationship_type": inv.relationship_type,
            "status": inv.status,
            "created_at": inv.created_at,
            "responded_at": inv.responded_at
        })

    return {"invitations": result_invitations}


@router.post("/api/parent/coparent-invitation/{invitation_id}/accept")
async def accept_coparent_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a co-parent invitation - links children from inviter to invitee"""
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only parents can accept co-parent invitations")

    # Get the invitation
    invitation = db.execute(
        text("""
        SELECT * FROM coparent_invitations
        WHERE id = :invitation_id AND invitee_user_id = :invitee_id
        """),
        {"invitation_id": invitation_id, "invitee_id": current_user.id}
    ).fetchone()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.status != 'pending':
        raise HTTPException(status_code=400, detail="Invitation has already been responded to")

    # Get inviter's parent profile
    inviter_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == invitation.inviter_user_id
    ).first()

    if not inviter_profile or not inviter_profile.children_ids:
        raise HTTPException(status_code=400, detail="Inviter has no children to share")

    # Get current user's parent profile
    current_parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not current_parent_profile:
        # Create parent profile if doesn't exist
        current_parent_profile = ParentProfile(
            user_id=current_user.id,
            relationship_type=invitation.relationship_type,
            children_ids=[],
            total_children=0
        )
        db.add(current_parent_profile)
        db.flush()

    # Link children to the accepting co-parent
    if not current_parent_profile.children_ids:
        current_parent_profile.children_ids = []

    for child_id in inviter_profile.children_ids:
        if child_id not in current_parent_profile.children_ids:
            current_parent_profile.children_ids = current_parent_profile.children_ids + [child_id]

            # Also update the child's parent_id array
            student_profile = db.query(StudentProfile).filter(
                StudentProfile.user_id == child_id
            ).first()

            if student_profile:
                if not student_profile.parent_id:
                    student_profile.parent_id = []
                if current_user.id not in student_profile.parent_id:
                    student_profile.parent_id = student_profile.parent_id + [current_user.id]

    current_parent_profile.total_children = len(current_parent_profile.children_ids)

    # Update invitation status
    db.execute(
        text("""
        UPDATE coparent_invitations
        SET status = 'accepted', responded_at = :now
        WHERE id = :invitation_id
        """),
        {"invitation_id": invitation_id, "now": datetime.utcnow()}
    )

    db.commit()

    return {
        "message": "Co-parent invitation accepted! You are now linked to the children.",
        "children_linked": len(inviter_profile.children_ids)
    }


@router.post("/api/parent/coparent-invitation/{invitation_id}/reject")
async def reject_coparent_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a co-parent invitation"""
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only parents can reject co-parent invitations")

    # Get the invitation
    invitation = db.execute(
        text("""
        SELECT * FROM coparent_invitations
        WHERE id = :invitation_id AND invitee_user_id = :invitee_id
        """),
        {"invitation_id": invitation_id, "invitee_id": current_user.id}
    ).fetchone()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.status != 'pending':
        raise HTTPException(status_code=400, detail="Invitation has already been responded to")

    # Update invitation status
    db.execute(
        text("""
        UPDATE coparent_invitations
        SET status = 'rejected', responded_at = :now
        WHERE id = :invitation_id
        """),
        {"invitation_id": invitation_id, "now": datetime.utcnow()}
    )

    db.commit()

    return {"message": "Co-parent invitation rejected"}
