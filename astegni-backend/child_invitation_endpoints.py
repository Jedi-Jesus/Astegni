"""
Child Invitation Endpoints for Astegni Platform

INVITATION FLOW (Parent invites Child):
=======================================

1. SEARCH FOR EXISTING USER:
   - Parent searches users by name, email, or phone
   - Returns matching users with minimal info

2. INVITE EXISTING USER:
   - Parent selects user and provides child's DOB for security verification
   - Creates pending invitation in child_invitations table
   - User sees invitation in their notifications/profile
   - User can accept/reject

3. INVITE NEW USER (Not in system):
   - Parent fills: first_name, father_name, grandfather_name, email/phone, gender, dob
   - ALL information saved in child_invitations table (NO user created yet)
   - Temp password sent via email/SMS
   - When new child logs in with temp password:
     a) User account is created with student role
     b) Student profile is created
     c) invited_to_user_id is updated
     d) Invitation is auto-accepted
     e) Parent-child link is established

UPON ACCEPTANCE:
================
- Child's user gets 'student' role if not already present
- Student profile is created if doesn't exist
- Parent's children_ids array gets child's student_profile.id
- Student's parent_id array gets parent's parent_profile.id
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import secrets
import os
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Json
from dotenv import load_dotenv
import jwt
from jwt import PyJWTError
import bcrypt
from email_service import email_service

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY", "default-refresh-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter(tags=["child-invitations"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# ============================================
# DATABASE CONNECTION
# ============================================

def get_db_connection():
    """Get database connection with dict_row factory"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="Database URL not configured")
    return psycopg.connect(database_url, row_factory=dict_row)


# ============================================
# PASSWORD UTILITIES
# ============================================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)


# ============================================
# AUTHENTICATION
# ============================================

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")

        if user_id is None:
            raise credentials_exception

        user_id = int(user_id)
        role_ids = payload.get("role_ids", {})

    except (PyJWTError, ValueError) as e:
        print(f"[DEBUG get_current_user] JWT decode error: {e}")
        raise credentials_exception

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, first_name, father_name, grandfather_name, email, phone, roles, active_role
                FROM users WHERE id = %s
            """, (user_id,))
            row = cur.fetchone()

            if not row:
                raise credentials_exception

            return {
                "id": row['id'],
                "first_name": row['first_name'],
                "father_name": row['father_name'],
                "grandfather_name": row['grandfather_name'],
                "email": row['email'],
                "phone": row['phone'],
                "roles": row['roles'] if isinstance(row['roles'], list) else [],
                "active_role": row['active_role'],
                "role_ids": role_ids
            }


# ============================================
# PYDANTIC SCHEMAS
# ============================================

class InviteExistingChildRequest(BaseModel):
    target_user_id: int
    security_dob: str  # Child's date of birth for verification (YYYY-MM-DD format)


class InviteNewChildRequest(BaseModel):
    first_name: str
    father_name: str
    grandfather_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None  # YYYY-MM-DD format


class RespondToInvitationRequest(BaseModel):
    action: str  # "accept" or "reject"


class ChildInvitationResponse(BaseModel):
    id: int
    inviter_user_id: int
    inviter_name: str
    inviter_profile_picture: Optional[str]
    status: str
    created_at: datetime
    is_new_user: bool


# ============================================
# INVITE EXISTING USER AS CHILD
# ============================================

@router.post("/api/parent/invite-child")
async def invite_existing_child(
    request: InviteExistingChildRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Invite an existing user to be a child.
    Requires security verification - parent must know child's date of birth.
    """
    if "parent" not in current_user['roles']:
        raise HTTPException(status_code=403, detail="Only parents can invite children")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Get parent profile
            cur.execute("""
                SELECT id, children_ids FROM parent_profiles WHERE user_id = %s
            """, (current_user['id'],))
            parent_profile = cur.fetchone()

            if not parent_profile:
                raise HTTPException(status_code=404, detail="Parent profile not found")

            parent_profile_id = parent_profile['id']

            # Check if target user exists and get their info
            cur.execute("""
                SELECT id, first_name, father_name, grandfather_name, email, phone, roles, date_of_birth
                FROM users WHERE id = %s
            """, (request.target_user_id,))
            target_user = cur.fetchone()

            if not target_user:
                raise HTTPException(status_code=404, detail="User not found")

            # Security verification - check if date of birth matches
            target_dob = target_user.get('date_of_birth')
            if target_dob:
                target_dob_str = target_dob.strftime('%Y-%m-%d') if hasattr(target_dob, 'strftime') else str(target_dob)
                if target_dob_str != request.security_dob:
                    raise HTTPException(
                        status_code=400,
                        detail="Security verification failed. The date of birth does not match."
                    )
            else:
                # If target user has no DOB set, require it to be set first
                raise HTTPException(
                    status_code=400,
                    detail="Cannot verify identity. The user has not set their date of birth in their profile."
                )

            # Check if already linked
            # First, get or check student profile for target user
            cur.execute("SELECT id, parent_id FROM student_profiles WHERE user_id = %s", (request.target_user_id,))
            student_profile = cur.fetchone()

            if student_profile:
                student_parent_ids = student_profile['parent_id'] if student_profile['parent_id'] else []
                if parent_profile_id in student_parent_ids:
                    raise HTTPException(status_code=400, detail="This user is already linked as your child")

            # Check for existing pending invitation
            cur.execute("""
                SELECT id, status FROM child_invitations
                WHERE inviter_user_id = %s AND invited_to_user_id = %s
            """, (current_user['id'], request.target_user_id))
            existing = cur.fetchone()

            if existing:
                if existing['status'] == 'pending':
                    raise HTTPException(status_code=400, detail="A pending invitation already exists for this user")
                elif existing['status'] == 'accepted':
                    raise HTTPException(status_code=400, detail="This user has already accepted your invitation")

            # Check for reverse invitation (child already invited this parent)
            cur.execute("""
                SELECT id, status FROM parent_invitations
                WHERE inviter_user_id = %s AND invited_to_user_id = %s AND status = 'accepted'
            """, (request.target_user_id, current_user['id']))
            reverse = cur.fetchone()

            if reverse:
                raise HTTPException(
                    status_code=400,
                    detail="This user has already sent you a parent invitation which was accepted."
                )

            # Create the invitation
            cur.execute("""
                INSERT INTO child_invitations (
                    inviter_user_id, inviter_type, invited_to_user_id,
                    relationship_type, status, created_at, is_new_user
                )
                VALUES (%s, 'parent', %s, 'child', 'pending', %s, FALSE)
                RETURNING id
            """, (current_user['id'], request.target_user_id, datetime.utcnow()))
            invitation_id = cur.fetchone()['id']

            conn.commit()

            # Get parent name for response
            parent_name = f"{current_user['first_name']} {current_user['father_name']}"

    return {
        "message": "Invitation sent successfully!",
        "invitation_id": invitation_id,
        "invited_to_user_id": request.target_user_id,
        "status": "pending"
    }


# ============================================
# INVITE NEW USER AS CHILD
# ============================================

@router.post("/api/parent/invite-new-child")
async def invite_new_child(
    request: InviteNewChildRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Invite a NEW user (not in system) as child.
    Creates invitation with pending info. User account created when they login with temp password.
    """
    if "parent" not in current_user['roles']:
        raise HTTPException(status_code=403, detail="Only parents can invite children")

    if not request.email and not request.phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Get parent profile
            cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (current_user['id'],))
            parent_profile = cur.fetchone()

            if not parent_profile:
                raise HTTPException(status_code=404, detail="Parent profile not found")

            # Check if user already exists
            if request.email:
                cur.execute("SELECT id FROM users WHERE email = %s", (request.email,))
                if cur.fetchone():
                    raise HTTPException(
                        status_code=400,
                        detail="User with this email already exists. Please search and invite them instead."
                    )

            if request.phone:
                cur.execute("SELECT id FROM users WHERE phone = %s", (request.phone,))
                if cur.fetchone():
                    raise HTTPException(
                        status_code=400,
                        detail="User with this phone already exists. Please search and invite them instead."
                    )

            # Check for existing pending invitation to same email/phone
            if request.email:
                cur.execute("""
                    SELECT id FROM child_invitations
                    WHERE inviter_user_id = %s AND pending_email = %s AND status = 'pending'
                """, (current_user['id'], request.email))
                if cur.fetchone():
                    raise HTTPException(status_code=400, detail="A pending invitation already exists for this email")

            if request.phone:
                cur.execute("""
                    SELECT id FROM child_invitations
                    WHERE inviter_user_id = %s AND pending_phone = %s AND status = 'pending'
                """, (current_user['id'], request.phone))
                if cur.fetchone():
                    raise HTTPException(status_code=400, detail="A pending invitation already exists for this phone")

            # Generate temp password and invitation token
            temp_password = secrets.token_urlsafe(12)
            temp_password_hash = hash_password(temp_password)
            invitation_token = secrets.token_urlsafe(32)
            token_expires_at = datetime.utcnow() + timedelta(days=30)

            # Parse DOB if provided
            pending_dob = None
            if request.date_of_birth:
                try:
                    pending_dob = datetime.strptime(request.date_of_birth, '%Y-%m-%d').date()
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

            # Create invitation
            cur.execute("""
                INSERT INTO child_invitations (
                    inviter_user_id, inviter_type, relationship_type,
                    status, created_at, is_new_user,
                    pending_email, pending_phone, pending_first_name,
                    pending_father_name, pending_grandfather_name, pending_gender, pending_dob,
                    invitation_token, token_expires_at, temp_password_hash
                )
                VALUES (%s, 'parent', 'child', 'pending', %s, TRUE, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                current_user['id'], datetime.utcnow(),
                request.email, request.phone, request.first_name,
                request.father_name, request.grandfather_name, request.gender, pending_dob,
                invitation_token, token_expires_at, temp_password_hash
            ))
            invitation_id = cur.fetchone()['id']

            conn.commit()

    # Send email with temp password
    email_sent = False
    parent_name = f"{current_user['first_name']} {current_user['father_name']}"
    child_name = f"{request.first_name} {request.father_name}"

    if request.email:
        try:
            email_sent = email_service.send_child_invitation_email(
                to_email=request.email,
                child_name=child_name,
                parent_name=parent_name,
                temp_password=temp_password
            )
        except Exception as e:
            print(f"[WARNING] Failed to send email: {e}")

    return {
        "message": "Invitation created successfully!",
        "invitation_id": invitation_id,
        "is_new_user": True,
        "email_sent": email_sent,
        "temp_password": temp_password,  # Only in dev mode - remove in production
        "expires_in_days": 30
    }


# ============================================
# GET RECEIVED CHILD INVITATIONS (for user receiving invitation)
# ============================================

@router.get("/api/child-invitations/received")
async def get_received_child_invitations(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all child invitations received by the current user.
    These are invitations from parents wanting to add this user as their child.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # NOTE: profile_picture now read from users table
            cur.execute("""
                SELECT ci.*, u.first_name, u.father_name, u.profile_picture
                FROM child_invitations ci
                JOIN users u ON u.id = ci.inviter_user_id
                LEFT JOIN parent_profiles pp ON pp.user_id = ci.inviter_user_id
                WHERE ci.invited_to_user_id = %s
                ORDER BY ci.created_at DESC
            """, (current_user['id'],))

            invitations = cur.fetchall()

            result = []
            for inv in invitations:
                result.append({
                    "id": inv['id'],
                    "inviter_user_id": inv['inviter_user_id'],
                    "inviter_name": f"{inv['first_name']} {inv['father_name']}",
                    "inviter_profile_picture": inv['profile_picture'],
                    "status": inv['status'],
                    "created_at": inv['created_at'].isoformat() if inv['created_at'] else None,
                    "is_new_user": inv['is_new_user']
                })

    return {"invitations": result}


# ============================================
# GET SENT CHILD INVITATIONS (for parent who sent)
# ============================================

@router.get("/api/parent/child-invitations/sent")
async def get_sent_child_invitations(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all child invitations sent by the current parent.
    """
    if "parent" not in current_user['roles']:
        raise HTTPException(status_code=403, detail="Only parents can view sent child invitations")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # NOTE: profile_picture now read from users table
            cur.execute("""
                SELECT ci.*,
                       u.first_name as child_first_name,
                       u.father_name as child_father_name,
                       u.profile_picture as child_profile_picture
                FROM child_invitations ci
                LEFT JOIN users u ON u.id = ci.invited_to_user_id
                LEFT JOIN student_profiles sp ON sp.user_id = ci.invited_to_user_id
                WHERE ci.inviter_user_id = %s
                ORDER BY ci.created_at DESC
            """, (current_user['id'],))

            invitations = cur.fetchall()

            result = []
            for inv in invitations:
                # For new users, use pending info
                if inv['is_new_user'] and not inv['invited_to_user_id']:
                    child_name = f"{inv['pending_first_name']} {inv['pending_father_name']}"
                    profile_picture = None
                else:
                    child_name = f"{inv['child_first_name']} {inv['child_father_name']}" if inv['child_first_name'] else "Unknown"
                    profile_picture = inv['child_profile_picture']

                result.append({
                    "id": inv['id'],
                    "child_name": child_name,
                    "child_profile_picture": profile_picture,
                    "invited_to_user_id": inv['invited_to_user_id'],
                    "status": inv['status'],
                    "created_at": inv['created_at'].isoformat() if inv['created_at'] else None,
                    "is_new_user": inv['is_new_user'],
                    "pending_email": inv['pending_email'],
                    "pending_phone": inv['pending_phone']
                })

    return {"invitations": result}


# ============================================
# RESPOND TO CHILD INVITATION
# ============================================

@router.post("/api/child-invitations/{invitation_id}/respond")
async def respond_to_child_invitation(
    invitation_id: int,
    request: RespondToInvitationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Accept or reject a child invitation.
    When accepted:
    - Add 'student' role to user if not present
    - Create student profile if doesn't exist
    - Add parent's parent_profile.id to student's parent_id array
    - Add student's student_profile.id to parent's children_ids array
    """
    if request.action not in ["accept", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Get the invitation
            cur.execute("""
                SELECT * FROM child_invitations WHERE id = %s
            """, (invitation_id,))
            invitation = cur.fetchone()

            if not invitation:
                raise HTTPException(status_code=404, detail="Invitation not found")

            if invitation['invited_to_user_id'] != current_user['id']:
                raise HTTPException(status_code=403, detail="This invitation is not for you")

            if invitation['status'] != 'pending':
                raise HTTPException(status_code=400, detail=f"Invitation already {invitation['status']}")

            if request.action == "reject":
                cur.execute("""
                    UPDATE child_invitations
                    SET status = 'rejected', responded_at = %s
                    WHERE id = %s
                """, (datetime.utcnow(), invitation_id))
                conn.commit()
                return {"message": "Invitation rejected", "status": "rejected"}

            # ACCEPT - Link parent and child
            parent_user_id = invitation['inviter_user_id']

            # Get parent profile
            cur.execute("SELECT id, children_ids FROM parent_profiles WHERE user_id = %s", (parent_user_id,))
            parent_profile = cur.fetchone()

            if not parent_profile:
                raise HTTPException(status_code=404, detail="Parent profile not found")

            parent_profile_id = parent_profile['id']
            children_ids = parent_profile['children_ids'] if parent_profile['children_ids'] else []

            # Add 'student' role to user if not present
            user_roles = current_user['roles']
            if "student" not in user_roles:
                user_roles = user_roles + ["student"]
                cur.execute("UPDATE users SET roles = %s WHERE id = %s", (user_roles, current_user['id']))

            # Get or create student profile
            cur.execute("SELECT id, parent_id FROM student_profiles WHERE user_id = %s", (current_user['id'],))
            student_profile = cur.fetchone()

            if student_profile:
                student_profile_id = student_profile['id']
                parent_ids = student_profile['parent_id'] if student_profile['parent_id'] else []
            else:
                # Create student profile
                cur.execute("""
                    INSERT INTO student_profiles (user_id, parent_id, created_at)
                    VALUES (%s, %s, %s)
                    RETURNING id
                """, (current_user['id'], [parent_profile_id], datetime.utcnow()))
                student_profile_id = cur.fetchone()['id']
                parent_ids = [parent_profile_id]

            # Update parent_id in student profile if not already linked
            if parent_profile_id not in parent_ids:
                parent_ids.append(parent_profile_id)
                cur.execute("""
                    UPDATE student_profiles SET parent_id = %s WHERE id = %s
                """, (parent_ids, student_profile_id))

            # Update children_ids in parent profile if not already linked
            if student_profile_id not in children_ids:
                children_ids.append(student_profile_id)
                cur.execute("""
                    UPDATE parent_profiles SET children_ids = %s, total_children = %s WHERE id = %s
                """, (children_ids, len(children_ids), parent_profile_id))

            # Update invitation status
            cur.execute("""
                UPDATE child_invitations
                SET status = 'accepted', responded_at = %s
                WHERE id = %s
            """, (datetime.utcnow(), invitation_id))

            conn.commit()

    return {
        "message": "Invitation accepted! You are now linked as a child.",
        "status": "accepted",
        "parent_profile_id": parent_profile_id,
        "student_profile_id": student_profile_id
    }


# ============================================
# CANCEL CHILD INVITATION (for parent)
# ============================================

@router.delete("/api/parent/child-invitations/{invitation_id}")
async def cancel_child_invitation(
    invitation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancel a pending child invitation.
    Only the parent who sent it can cancel.
    """
    if "parent" not in current_user['roles']:
        raise HTTPException(status_code=403, detail="Only parents can cancel child invitations")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, inviter_user_id, status FROM child_invitations WHERE id = %s
            """, (invitation_id,))
            invitation = cur.fetchone()

            if not invitation:
                raise HTTPException(status_code=404, detail="Invitation not found")

            if invitation['inviter_user_id'] != current_user['id']:
                raise HTTPException(status_code=403, detail="You can only cancel your own invitations")

            if invitation['status'] != 'pending':
                raise HTTPException(status_code=400, detail=f"Cannot cancel - invitation already {invitation['status']}")

            cur.execute("DELETE FROM child_invitations WHERE id = %s", (invitation_id,))
            conn.commit()

    return {"message": "Invitation cancelled successfully"}


# ============================================
# NEW USER LOGIN WITH TEMP PASSWORD
# ============================================

@router.post("/api/child-invitation/login")
async def login_with_child_invitation(
    email: Optional[str] = None,
    phone: Optional[str] = None,
    password: str = None
):
    """
    Login for new users invited as children.
    Creates user account and student profile on first login.
    """
    if not email and not phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Find pending invitation
            if email:
                cur.execute("""
                    SELECT * FROM child_invitations
                    WHERE pending_email = %s AND status = 'pending' AND is_new_user = TRUE
                    ORDER BY created_at DESC LIMIT 1
                """, (email,))
            else:
                cur.execute("""
                    SELECT * FROM child_invitations
                    WHERE pending_phone = %s AND status = 'pending' AND is_new_user = TRUE
                    ORDER BY created_at DESC LIMIT 1
                """, (phone,))

            invitation = cur.fetchone()

            if not invitation:
                raise HTTPException(status_code=404, detail="No pending invitation found for this email/phone")

            # Check token expiry
            if invitation['token_expires_at'] and invitation['token_expires_at'] < datetime.utcnow():
                raise HTTPException(status_code=400, detail="Invitation has expired")

            # Verify temp password
            if not verify_password(password, invitation['temp_password_hash']):
                raise HTTPException(status_code=401, detail="Invalid password")

            # Get parent info
            parent_user_id = invitation['inviter_user_id']
            cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (parent_user_id,))
            parent_profile = cur.fetchone()

            if not parent_profile:
                raise HTTPException(status_code=500, detail="Parent profile not found")

            parent_profile_id = parent_profile['id']

            # Create user account
            cur.execute("""
                INSERT INTO users (
                    first_name, father_name, grandfather_name, email, phone, gender,
                    date_of_birth, password_hash, roles, is_active, has_password, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, TRUE, %s)
                RETURNING id
            """, (
                invitation['pending_first_name'],
                invitation['pending_father_name'],
                invitation['pending_grandfather_name'],
                invitation['pending_email'],
                invitation['pending_phone'],
                invitation['pending_gender'],
                invitation['pending_dob'],
                invitation['temp_password_hash'],  # Keep same password
                ["student"],
                datetime.utcnow()
            ))
            new_user_id = cur.fetchone()['id']

            # Create student profile
            cur.execute("""
                INSERT INTO student_profiles (user_id, parent_id, created_at)
                VALUES (%s, %s, %s)
                RETURNING id
            """, (new_user_id, [parent_profile_id], datetime.utcnow()))
            student_profile_id = cur.fetchone()['id']

            # Update parent's children_ids
            cur.execute("SELECT children_ids FROM parent_profiles WHERE id = %s", (parent_profile_id,))
            parent = cur.fetchone()
            children_ids = parent['children_ids'] if parent['children_ids'] else []
            children_ids.append(student_profile_id)

            cur.execute("""
                UPDATE parent_profiles SET children_ids = %s, total_children = %s WHERE id = %s
            """, (children_ids, len(children_ids), parent_profile_id))

            # Update invitation
            cur.execute("""
                UPDATE child_invitations
                SET invited_to_user_id = %s, status = 'accepted', responded_at = %s
                WHERE id = %s
            """, (new_user_id, datetime.utcnow(), invitation['id']))

            conn.commit()

            # Create tokens
            role_ids = {"student": str(student_profile_id)}
            access_token = create_access_token({"sub": str(new_user_id), "role": "student", "role_ids": role_ids})
            refresh_token = create_refresh_token({"sub": str(new_user_id)})

    return {
        "message": "Account created and linked successfully!",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": new_user_id,
            "first_name": invitation['pending_first_name'],
            "father_name": invitation['pending_father_name'],
            "roles": ["student"],
            "active_role": "student"
        }
    }


# ============================================
# RESEND INVITATION (for new users)
# ============================================

@router.post("/api/parent/child-invitations/{invitation_id}/resend")
async def resend_child_invitation(
    invitation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Resend invitation email/SMS for new users.
    Generates new temp password.
    """
    if "parent" not in current_user['roles']:
        raise HTTPException(status_code=403, detail="Only parents can resend invitations")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT * FROM child_invitations WHERE id = %s
            """, (invitation_id,))
            invitation = cur.fetchone()

            if not invitation:
                raise HTTPException(status_code=404, detail="Invitation not found")

            if invitation['inviter_user_id'] != current_user['id']:
                raise HTTPException(status_code=403, detail="You can only resend your own invitations")

            if not invitation['is_new_user']:
                raise HTTPException(status_code=400, detail="Cannot resend - this is for an existing user")

            if invitation['status'] != 'pending':
                raise HTTPException(status_code=400, detail=f"Cannot resend - invitation already {invitation['status']}")

            # Generate new temp password
            temp_password = secrets.token_urlsafe(12)
            temp_password_hash = hash_password(temp_password)
            token_expires_at = datetime.utcnow() + timedelta(days=30)

            cur.execute("""
                UPDATE child_invitations
                SET temp_password_hash = %s, token_expires_at = %s
                WHERE id = %s
            """, (temp_password_hash, token_expires_at, invitation_id))

            conn.commit()

    # Send email
    email_sent = False
    parent_name = f"{current_user['first_name']} {current_user['father_name']}"
    child_name = f"{invitation['pending_first_name']} {invitation['pending_father_name']}"

    if invitation['pending_email']:
        try:
            email_sent = email_service.send_child_invitation_email(
                to_email=invitation['pending_email'],
                child_name=child_name,
                parent_name=parent_name,
                temp_password=temp_password
            )
        except Exception as e:
            print(f"[WARNING] Failed to send email: {e}")

    return {
        "message": "Invitation resent successfully!",
        "email_sent": email_sent,
        "temp_password": temp_password,  # Dev only
        "expires_in_days": 30
    }
