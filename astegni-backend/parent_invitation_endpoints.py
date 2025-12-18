"""
Parent Invitation Endpoints for Astegni Platform

INVITATION FLOW (Student invites Parent):
=========================================

1. SEARCH FOR EXISTING USER:
   - Student searches users by name, email, or phone
   - Returns matching users with minimal info (profile pic, name, contact, roles)

2. INVITE EXISTING USER:
   - Student selects user and provides relationship_type
   - Creates pending invitation in parent_invitations table
   - Parent sees invitation in their profile (Requests > Parenting Invitations)
   - Parent can accept/reject

3. INVITE NEW USER (Not in system):
   - Student fills: first_name, father_name, grandfather_name, email/phone, relationship_type
   - ALL information saved in parent_invitations table (NO user created yet)
   - Temp password sent via email/SMS
   - When new parent logs in with temp password:
     a) User account is created in users table
     b) invitee_id in invitation is updated
     c) Invitation is auto-accepted (login = acceptance)
     d) Parent-student link is established
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

router = APIRouter(tags=["parent-invitations"])
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

    print(f"[DEBUG get_current_user] Token received: {token[:50] if token else 'None'}...")
    print(f"[DEBUG get_current_user] SECRET_KEY: {SECRET_KEY[:20]}...")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        print(f"[DEBUG get_current_user] Decoded user_id: {user_id}")

        if user_id is None:
            print("[DEBUG get_current_user] user_id is None!")
            raise credentials_exception

        user_id = int(user_id)
        role_ids = payload.get("role_ids", {})
        print(f"[DEBUG get_current_user] User ID: {user_id}, Role IDs: {role_ids}")

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


class InviteExistingUserRequest(BaseModel):
    target_user_id: int
    relationship_type: str  # Father, Mother, Guardian, Uncle, Aunt, etc.
    security_father_name: str  # Parent's father name for verification
    security_grandfather_name: str  # Parent's grandfather name for verification


class InviteNewUserRequest(BaseModel):
    first_name: str
    father_name: str
    grandfather_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    relationship_type: str


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


# ============================================
# USER SEARCH ENDPOINT
# ============================================

@router.get("/api/users/search", response_model=List[UserSearchResult])
async def search_users(
    q: str,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """
    Search for users by name, email, or phone.
    Used for inviting parents to connect with student.
    Search matches names that START WITH the query (not contains).
    """
    if len(q) < 2:
        raise HTTPException(status_code=400, detail="Search query must be at least 2 characters")

    starts_with_term = f"{q.lower()}%"

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Search by first name, email, or phone (starts with)
            cur.execute("""
                SELECT id, first_name, father_name, grandfather_name, email, phone, roles
                FROM users
                WHERE id != %s
                AND is_active = TRUE
                AND (
                    LOWER(first_name) LIKE %s
                    OR LOWER(email) LIKE %s
                    OR phone LIKE %s
                )
                LIMIT %s
            """, (current_user['id'], starts_with_term, starts_with_term, starts_with_term, limit))

            users = cur.fetchall()

            results = []
            for user in users:
                # Get profile picture
                profile_picture = None
                user_roles = user['roles'] if isinstance(user['roles'], list) else []

                if "parent" in user_roles:
                    cur.execute("""
                        SELECT profile_picture FROM parent_profiles WHERE user_id = %s
                    """, (user['id'],))
                    pp = cur.fetchone()
                    if pp:
                        profile_picture = pp['profile_picture']

                if not profile_picture:
                    cur.execute("""
                        SELECT profile_picture FROM student_profiles WHERE user_id = %s
                    """, (user['id'],))
                    sp = cur.fetchone()
                    if sp:
                        profile_picture = sp['profile_picture']

                results.append(UserSearchResult(
                    user_id=user['id'],
                    first_name=user['first_name'],
                    father_name=user['father_name'],
                    grandfather_name=user['grandfather_name'] or '',
                    email=user['email'],
                    phone=user['phone'],
                    profile_picture=profile_picture,
                    roles=user_roles,
                    has_parent_role="parent" in user_roles
                ))

    return results


# ============================================
# PARENT INVITATION ENDPOINTS
# ============================================

@router.post("/api/student/invite-parent")
async def invite_existing_parent(
    request: InviteExistingUserRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Invite an existing user to be a parent.
    Requires security verification - student must know parent's father/grandfather names.
    Sends OTP to the existing user's email for verification.
    """
    if "student" not in current_user['roles']:
        raise HTTPException(status_code=403, detail="Only students can invite parents")

    target_user = None
    student_name = None
    otp_code = None
    invitation_id = None

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Check if target user exists and get their info for verification
            cur.execute("SELECT id, first_name, father_name, grandfather_name, email, phone, roles FROM users WHERE id = %s", (request.target_user_id,))
            target_user = cur.fetchone()

            if not target_user:
                raise HTTPException(status_code=404, detail="User not found")

            # Security verification - check if father_name and grandfather_name match
            target_father_name = (target_user['father_name'] or '').strip().lower()
            target_grandfather_name = (target_user['grandfather_name'] or '').strip().lower()
            provided_father_name = request.security_father_name.strip().lower()
            provided_grandfather_name = request.security_grandfather_name.strip().lower()

            if target_father_name != provided_father_name or target_grandfather_name != provided_grandfather_name:
                raise HTTPException(
                    status_code=400,
                    detail="Security verification failed. The father's name or grandfather's name does not match."
                )

            # Get student profile and name (inviter is always the student profile)
            cur.execute("""
                SELECT sp.id, sp.parent_id, u.first_name, u.father_name
                FROM student_profiles sp
                JOIN users u ON u.id = sp.user_id
                WHERE sp.user_id = %s
            """, (current_user['id'],))
            student_data = cur.fetchone()

            if not student_data:
                raise HTTPException(status_code=404, detail="Student profile not found")

            student_profile_id = student_data['id']  # This is the profile ID to use as inviter_id
            student_name = f"{student_data['first_name']} {student_data['father_name']}"

            # Check if already linked (parent_id stores parent profile IDs)
            parent_ids = student_data['parent_id'] if student_data['parent_id'] else []

            # Add parent role if not present and get/create parent profile
            target_roles = target_user['roles'] if isinstance(target_user['roles'], list) else []
            parent_profile_id = None

            if "parent" not in target_roles:
                target_roles = target_roles + ["parent"]
                cur.execute("UPDATE users SET roles = %s WHERE id = %s", (target_roles, request.target_user_id))

            # Get or create parent profile
            cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (request.target_user_id,))
            parent_profile = cur.fetchone()
            if parent_profile:
                parent_profile_id = parent_profile['id']
            else:
                cur.execute("""
                    INSERT INTO parent_profiles (user_id, relationship_type)
                    VALUES (%s, %s)
                    RETURNING id
                """, (request.target_user_id, request.relationship_type))
                parent_profile_id = cur.fetchone()['id']

            # Check if already linked using profile ID
            if parent_profile_id in parent_ids:
                raise HTTPException(status_code=400, detail="This parent is already linked to your profile")

            # Check for existing pending invitation using profile IDs
            cur.execute("""
                SELECT id FROM parent_invitations
                WHERE inviter_id = %s
                AND inviter_profile_type = 'student'
                AND invites_id = %s
                AND invites_profile_type = 'parent'
                AND status = 'pending'
            """, (student_profile_id, parent_profile_id))

            if cur.fetchone():
                raise HTTPException(status_code=400, detail="A pending invitation already exists for this user")

            # Generate OTP for existing user verification (7 days expiry)
            otp_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
            otp_expires_at = datetime.utcnow() + timedelta(days=7)

            # Create invitation with profile IDs
            cur.execute("""
                INSERT INTO parent_invitations (inviter_id, inviter_profile_type, invites_id, invites_profile_type, relationship_type, status, created_at)
                VALUES (%s, %s, %s, %s, %s, 'pending', %s)
                RETURNING id
            """, (student_profile_id, 'student', parent_profile_id, 'parent', request.relationship_type, datetime.utcnow()))
            invitation_id = cur.fetchone()['id']

            # Store OTP in otps table for existing user verification
            contact = target_user['email'] or target_user['phone']
            if contact:
                cur.execute("""
                    INSERT INTO otps (contact, otp_code, purpose, expires_at, is_used, created_at, is_otp_verified)
                    VALUES (%s, %s, %s, %s, FALSE, %s, FALSE)
                """, (
                    contact,
                    otp_code,
                    f'parent_invitation_existing_{invitation_id}',  # 'existing' indicates existing user
                    otp_expires_at,
                    datetime.utcnow()
                ))

            conn.commit()

    # Send OTP via email to existing user
    email_sent = False
    if target_user and target_user['email']:
        parent_name = f"{target_user['first_name']} {target_user['father_name']}"
        email_sent = email_service.send_existing_parent_otp_email(
            to_email=target_user['email'],
            parent_name=parent_name,
            student_name=student_name,
            otp_code=otp_code,
            relationship_type=request.relationship_type
        )

    return {
        "message": "Invitation sent successfully! An OTP has been sent to the parent's email.",
        "invites_id": parent_profile_id,
        "invites_profile_type": "parent",
        "status": "pending",
        "email_sent": email_sent,
        "expires_in_days": 7
    }


@router.post("/api/student/invite-new-parent")
async def invite_new_parent(
    request: InviteNewUserRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Invite a NEW user (not in system) as parent.
    DOES NOT create user account - stores all info in parent_invitations table.
    User account is created only when they log in with the temp password.
    No security verification required.
    """
    if "student" not in current_user['roles']:
        raise HTTPException(status_code=403, detail="Only students can invite parents")

    # Validate email or phone
    if not request.email and not request.phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Check if user already exists in users table
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

            # Get student profile first (inviter is always the student profile)
            cur.execute("""
                SELECT sp.id, u.first_name, u.father_name
                FROM student_profiles sp
                JOIN users u ON u.id = sp.user_id
                WHERE sp.user_id = %s
            """, (current_user['id'],))
            student_data = cur.fetchone()
            if not student_data:
                raise HTTPException(status_code=404, detail="Student profile not found")

            student_profile_id = student_data['id']  # This is the profile ID to use as inviter_id
            student_name = f"{student_data['first_name']} {student_data['father_name']}"

            # Check for existing pending invitation for this email/phone using profile ID
            if request.email:
                cur.execute("""
                    SELECT id FROM parent_invitations
                    WHERE inviter_id = %s AND inviter_profile_type = 'student' AND pending_email = %s AND status = 'pending'
                """, (student_profile_id, request.email))
                if cur.fetchone():
                    raise HTTPException(status_code=400, detail="A pending invitation already exists for this email")

            if request.phone:
                cur.execute("""
                    SELECT id FROM parent_invitations
                    WHERE inviter_id = %s AND inviter_profile_type = 'student' AND pending_phone = %s AND status = 'pending'
                """, (student_profile_id, request.phone))
                if cur.fetchone():
                    raise HTTPException(status_code=400, detail="A pending invitation already exists for this phone")

            # Generate 6-digit OTP and invitation token
            otp_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
            invitation_token = secrets.token_urlsafe(32)
            otp_expires_at = datetime.utcnow() + timedelta(days=7)  # OTP valid for 7 days

            # Create invitation with profile ID (NO user created yet for invitee!)
            cur.execute("""
                INSERT INTO parent_invitations (
                    inviter_id, inviter_profile_type, invites_id, invites_profile_type,
                    relationship_type, status, created_at,
                    is_new_user, pending_email, pending_phone, pending_first_name,
                    pending_father_name, pending_grandfather_name, pending_gender,
                    invitation_token, token_expires_at
                )
                VALUES (
                    %s, 'student', NULL, 'parent',
                    %s, 'pending', %s,
                    TRUE, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s
                )
                RETURNING id
            """, (
                student_profile_id,
                request.relationship_type,
                datetime.utcnow(),
                request.email,
                request.phone,
                request.first_name,
                request.father_name,
                request.grandfather_name,
                request.gender,
                invitation_token,
                otp_expires_at  # Token expires same time as OTP (7 days)
            ))
            invitation_id = cur.fetchone()['id']

            # Store OTP in otps table (astegni_user_db)
            contact = request.email or request.phone
            cur.execute("""
                INSERT INTO otps (contact, otp_code, purpose, expires_at, is_used, created_at, is_otp_verified)
                VALUES (%s, %s, %s, %s, FALSE, %s, FALSE)
            """, (
                contact,
                otp_code,
                f'parent_invitation_new_{invitation_id}',  # 'new' indicates new user invitation
                otp_expires_at,
                datetime.utcnow()
            ))

            conn.commit()

    # Send invitation link with OTP via email (for NEW users)
    # Link opens index.html with register modal in parent invitation mode
    email_sent = False
    invitation_link = f"http://localhost:8081/index.html?action=parent-register&token={invitation_token}"

    if request.email:
        parent_name = f"{request.first_name} {request.father_name}"
        email_sent = email_service.send_parent_invitation_link_email(
            to_email=request.email,
            parent_name=parent_name,
            student_name=student_name,
            otp_code=otp_code,
            invitation_link=invitation_link,
            relationship_type=request.relationship_type
        )

    return {
        "message": "Invitation created! An invitation link with OTP has been sent to the parent's email.",
        "invitation_token": invitation_token,
        "invitation_link": invitation_link,
        "email_sent": email_sent,
        "email": request.email,
        "phone": request.phone,
        "status": "pending",
        "is_new_user": True,
        "expires_in_days": 7
    }


@router.get("/api/student/parent-invitations")
async def get_student_invitations(
    current_user: dict = Depends(get_current_user)
):
    """Get all parent invitations sent by current student (both existing and new users)"""
    if "student" not in current_user['roles']:
        raise HTTPException(status_code=403, detail="Only students can view their invitations")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Get student profile ID first
            cur.execute("SELECT id FROM student_profiles WHERE user_id = %s", (current_user['id'],))
            student_profile = cur.fetchone()
            if not student_profile:
                return {"invitations": []}

            student_profile_id = student_profile['id']

            # Query using profile ID and join with parent_profiles for invitee info
            cur.execute("""
                SELECT pi.*,
                       pp.id as parent_profile_id,
                       u.first_name as parent_first_name,
                       u.father_name as parent_father_name,
                       pp.profile_picture as parent_profile_picture
                FROM parent_invitations pi
                LEFT JOIN parent_profiles pp ON pi.invites_id = pp.id AND pi.invites_profile_type = 'parent'
                LEFT JOIN users u ON pp.user_id = u.id
                WHERE pi.inviter_id = %s AND pi.inviter_profile_type = 'student'
                ORDER BY pi.created_at DESC
            """, (student_profile_id,))

            invitations = cur.fetchall()

    result_invitations = []
    for inv in invitations:
        is_new_user = inv['is_new_user'] or inv['invites_id'] is None

        if is_new_user:
            parent_name = f"{inv['pending_first_name'] or ''} {inv['pending_father_name'] or ''}".strip() or "Pending User"
            parent_email = inv['pending_email']
            parent_phone = inv['pending_phone']
            parent_profile_picture = None
            invites_id = None
        else:
            parent_name = f"{inv['parent_first_name'] or ''} {inv['parent_father_name'] or ''}".strip()
            parent_email = None
            parent_phone = None
            parent_profile_picture = inv['parent_profile_picture']
            invites_id = inv['invites_id']

        result_invitations.append({
            "id": inv['id'],
            "invites_id": invites_id,
            "invites_profile_type": inv['invites_profile_type'],
            "parent_name": parent_name,
            "parent_email": parent_email,
            "parent_phone": parent_phone,
            "parent_profile_picture": parent_profile_picture,
            "relationship_type": inv['relationship_type'],
            "status": inv['status'],
            "is_new_user": is_new_user,
            "created_at": inv['created_at'].isoformat() if inv['created_at'] else None,
            "responded_at": inv['responded_at'].isoformat() if inv['responded_at'] else None
        })

    return {"invitations": result_invitations}


@router.get("/api/parent/pending-invitations")
async def get_parent_pending_invitations(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all pending invitations for current user to accept/reject.
    Works for ANY user (tutor, student, parent, etc.) - if they have a pending invitation, they can see it.
    When accepted, the 'parent' role will be added to their account.
    Now uses profile IDs - checks all profile types the user might have.
    """
    # No role restriction - any user can receive parent invitations

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Get all profile IDs for the current user
            profile_conditions = []
            profile_params = []

            # Check parent profile
            cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (current_user['id'],))
            parent_profile = cur.fetchone()
            if parent_profile:
                profile_conditions.append("(pi.invites_id = %s AND pi.invites_profile_type = 'parent')")
                profile_params.append(parent_profile['id'])

            # Check tutor profile
            cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (current_user['id'],))
            tutor_profile = cur.fetchone()
            if tutor_profile:
                profile_conditions.append("(pi.invites_id = %s AND pi.invites_profile_type = 'tutor')")
                profile_params.append(tutor_profile['id'])

            # Check student profile (in case students can be invited as parents)
            cur.execute("SELECT id FROM student_profiles WHERE user_id = %s", (current_user['id'],))
            student_profile = cur.fetchone()
            if student_profile:
                profile_conditions.append("(pi.invites_id = %s AND pi.invites_profile_type = 'student')")
                profile_params.append(student_profile['id'])

            if not profile_conditions:
                return {"invitations": []}

            # Build the query with all possible profile matches
            where_clause = " OR ".join(profile_conditions)
            query = f"""
                SELECT pi.*,
                       sp.id as student_profile_id,
                       u.first_name as student_first_name,
                       u.father_name as student_father_name,
                       u.email as student_email,
                       u.phone as student_phone,
                       sp.profile_picture as student_profile_picture,
                       sp.grade_level,
                       sp.studying_at
                FROM parent_invitations pi
                JOIN student_profiles sp ON pi.inviter_id = sp.id AND pi.inviter_profile_type = 'student'
                JOIN users u ON sp.user_id = u.id
                WHERE ({where_clause}) AND pi.status = 'pending'
                ORDER BY pi.created_at DESC
            """
            cur.execute(query, profile_params)
            invitations = cur.fetchall()

    return {
        "invitations": [
            {
                "id": inv['id'],
                "inviter_id": inv['inviter_id'],
                "inviter_profile_type": inv['inviter_profile_type'],
                "student_profile_id": inv['student_profile_id'],
                "student_name": f"{inv['student_first_name']} {inv['student_father_name']}",
                "student_email": inv['student_email'],
                "student_phone": inv['student_phone'],
                "student_profile_picture": inv['student_profile_picture'],
                "grade_level": inv['grade_level'],
                "studying_at": inv['studying_at'],
                "relationship_type": inv['relationship_type'],
                "status": inv['status'],
                "created_at": inv['created_at'].isoformat() if inv['created_at'] else None
            }
            for inv in invitations
        ]
    }


@router.get("/api/parent/sent-invitations")
async def get_parent_sent_invitations(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all invitations sent by the current user (inviting others to be parents).
    This is for students who have invited someone to be their parent.
    Now uses profile IDs.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Get student profile ID first
            cur.execute("SELECT id FROM student_profiles WHERE user_id = %s", (current_user['id'],))
            student_profile = cur.fetchone()
            if not student_profile:
                return {"invitations": []}

            student_profile_id = student_profile['id']

            # Build query based on status filter using profile ID
            if status and status != 'all':
                cur.execute("""
                    SELECT pi.*,
                           pp.id as parent_profile_id,
                           u.first_name as invitee_first_name,
                           u.father_name as invitee_father_name,
                           u.email as invitee_email,
                           u.phone as invitee_phone,
                           pp.profile_picture as invitee_profile_picture
                    FROM parent_invitations pi
                    LEFT JOIN parent_profiles pp ON pi.invites_id = pp.id AND pi.invites_profile_type = 'parent'
                    LEFT JOIN users u ON pp.user_id = u.id
                    WHERE pi.inviter_id = %s AND pi.inviter_profile_type = 'student' AND pi.status = %s
                    ORDER BY pi.created_at DESC
                """, (student_profile_id, status))
            else:
                cur.execute("""
                    SELECT pi.*,
                           pp.id as parent_profile_id,
                           u.first_name as invitee_first_name,
                           u.father_name as invitee_father_name,
                           u.email as invitee_email,
                           u.phone as invitee_phone,
                           pp.profile_picture as invitee_profile_picture
                    FROM parent_invitations pi
                    LEFT JOIN parent_profiles pp ON pi.invites_id = pp.id AND pi.invites_profile_type = 'parent'
                    LEFT JOIN users u ON pp.user_id = u.id
                    WHERE pi.inviter_id = %s AND pi.inviter_profile_type = 'student'
                    ORDER BY pi.created_at DESC
                """, (student_profile_id,))

            invitations = cur.fetchall()

    return {
        "invitations": [
            {
                "id": inv['id'],
                "invites_id": inv['invites_id'],
                "invites_profile_type": inv['invites_profile_type'],
                "invitee_name": f"{inv['invitee_first_name'] or inv['pending_first_name'] or ''} {inv['invitee_father_name'] or inv['pending_father_name'] or ''}".strip() or "Pending User",
                "invitee_email": inv['invitee_email'] or inv['pending_email'],
                "invitee_phone": inv['invitee_phone'] or inv['pending_phone'],
                "invitee_profile_picture": inv['invitee_profile_picture'],
                "relationship_type": inv['relationship_type'],
                "status": inv['status'],
                "is_new_user": inv['is_new_user'],
                "created_at": inv['created_at'].isoformat() if inv['created_at'] else None,
                "responded_at": inv['responded_at'].isoformat() if inv['responded_at'] else None
            }
            for inv in invitations
        ]
    }


@router.delete("/api/parent/cancel-invitation/{invitation_id}")
async def cancel_parent_invitation(
    invitation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancel a pending invitation that the current user sent.
    Only the inviter can cancel their own pending invitations.
    Now uses profile IDs.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Get student profile ID
            cur.execute("SELECT id FROM student_profiles WHERE user_id = %s", (current_user['id'],))
            student_profile = cur.fetchone()
            if not student_profile:
                raise HTTPException(status_code=404, detail="Student profile not found")

            student_profile_id = student_profile['id']

            # Check if invitation exists and belongs to current user's student profile
            cur.execute("""
                SELECT * FROM parent_invitations
                WHERE id = %s AND inviter_id = %s AND inviter_profile_type = 'student' AND status = 'pending'
            """, (invitation_id, student_profile_id))

            invitation = cur.fetchone()
            if not invitation:
                raise HTTPException(status_code=404, detail="Invitation not found or already processed")

            # Delete the invitation
            cur.execute("DELETE FROM parent_invitations WHERE id = %s", (invitation_id,))
            conn.commit()

    return {"success": True, "message": "Invitation cancelled successfully"}


@router.post("/api/parent/respond-invitation/{invitation_id}")
async def respond_to_invitation(
    invitation_id: int,
    accept: bool,
    current_user: dict = Depends(get_current_user)
):
    """
    Accept or reject a parent invitation.
    Works for ANY user - when accepting, 'parent' role is added to their account.
    Now uses profile IDs.
    """
    # No role restriction - any user can respond to parent invitations

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Get all profile IDs for the current user to check if they're the invitee
            profile_conditions = []
            profile_params = [invitation_id]

            # Check parent profile
            cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (current_user['id'],))
            parent_profile = cur.fetchone()
            if parent_profile:
                profile_conditions.append("(invites_id = %s AND invites_profile_type = 'parent')")
                profile_params.append(parent_profile['id'])

            # Check tutor profile
            cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (current_user['id'],))
            tutor_profile = cur.fetchone()
            if tutor_profile:
                profile_conditions.append("(invites_id = %s AND invites_profile_type = 'tutor')")
                profile_params.append(tutor_profile['id'])

            if not profile_conditions:
                raise HTTPException(status_code=404, detail="No profile found for current user")

            # Get invitation
            where_clause = " OR ".join(profile_conditions)
            cur.execute(f"""
                SELECT * FROM parent_invitations
                WHERE id = %s AND ({where_clause}) AND status = 'pending'
            """, profile_params)

            invitation = cur.fetchone()
            if not invitation:
                raise HTTPException(status_code=404, detail="Invitation not found or already processed")

            if accept:
                # Add 'parent' role to user if they don't have it
                user_roles = current_user['roles'] or []
                if 'parent' not in user_roles:
                    new_roles = user_roles + ['parent']
                    cur.execute("""
                        UPDATE users SET roles = %s WHERE id = %s
                    """, (Json(new_roles), current_user['id']))

                # Get student profile using profile ID from invitation
                cur.execute("SELECT id, user_id, parent_id FROM student_profiles WHERE id = %s", (invitation['inviter_id'],))
                student_profile = cur.fetchone()

                # Get or create parent profile
                cur.execute("SELECT id, children_ids FROM parent_profiles WHERE user_id = %s", (current_user['id'],))
                current_parent_profile = cur.fetchone()

                if not current_parent_profile:
                    cur.execute("""
                        INSERT INTO parent_profiles (user_id, relationship_type)
                        VALUES (%s, %s)
                        RETURNING id
                    """, (current_user['id'], invitation['relationship_type']))
                    current_parent_profile = {'id': cur.fetchone()['id'], 'children_ids': []}

                # Link parent profile ID to student (parent_id stores parent profile IDs)
                if student_profile:
                    parent_ids = student_profile['parent_id'] if student_profile['parent_id'] else []
                    if current_parent_profile['id'] not in parent_ids:
                        parent_ids = parent_ids + [current_parent_profile['id']]
                        cur.execute("""
                            UPDATE student_profiles SET parent_id = %s WHERE id = %s
                        """, (parent_ids, invitation['inviter_id']))

                # Link student profile ID to parent (children_ids stores student profile IDs)
                children_ids = current_parent_profile['children_ids'] if current_parent_profile.get('children_ids') else []
                if invitation['inviter_id'] not in children_ids:
                    children_ids = children_ids + [invitation['inviter_id']]
                    cur.execute("""
                        UPDATE parent_profiles SET children_ids = %s, total_children = %s WHERE id = %s
                    """, (children_ids, len(children_ids), current_parent_profile['id']))

                # Update invitation status
                cur.execute("""
                    UPDATE parent_invitations SET status = 'accepted', responded_at = %s WHERE id = %s
                """, (datetime.utcnow(), invitation_id))

                conn.commit()
                return {"message": "Invitation accepted. You are now linked as parent.", "status": "accepted", "role_added": 'parent' not in user_roles}
            else:
                # Reject invitation
                cur.execute("""
                    UPDATE parent_invitations SET status = 'rejected', responded_at = %s WHERE id = %s
                """, (datetime.utcnow(), invitation_id))

                conn.commit()
                return {"message": "Invitation rejected.", "status": "rejected"}


# ============================================
# OTP-VERIFIED ACCEPT INVITATION (For Existing Users)
# ============================================

class AcceptInvitationWithOTPRequest(BaseModel):
    invitation_id: int
    otp_code: str


@router.post("/api/parent/accept-invitation-otp")
async def accept_invitation_with_otp(
    request: AcceptInvitationWithOTPRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Accept a parent invitation with OTP verification.
    This is for ANY existing user who received an OTP via email.
    The OTP was generated when the student invited them.
    When accepted, 'parent' role is added to the user's account.

    NOTE: invites_id stores the profile ID (not user ID) with invites_profile_type indicating which profile table.
    """
    # No role restriction - any user can accept parent invitations

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Get all profile IDs for current user to check if invitation is for them
            profile_conditions = []
            profile_params = []

            # Check parent profile
            cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (current_user['id'],))
            parent_profile = cur.fetchone()
            if parent_profile:
                profile_conditions.append("(pi.invites_id = %s AND pi.invites_profile_type = 'parent')")
                profile_params.append(parent_profile['id'])

            # Check tutor profile
            cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (current_user['id'],))
            tutor_profile = cur.fetchone()
            if tutor_profile:
                profile_conditions.append("(pi.invites_id = %s AND pi.invites_profile_type = 'tutor')")
                profile_params.append(tutor_profile['id'])

            # Check student profile
            cur.execute("SELECT id FROM student_profiles WHERE user_id = %s", (current_user['id'],))
            student_profile_check = cur.fetchone()
            if student_profile_check:
                profile_conditions.append("(pi.invites_id = %s AND pi.invites_profile_type = 'student')")
                profile_params.append(student_profile_check['id'])

            if not profile_conditions:
                raise HTTPException(status_code=404, detail="No profile found for current user")

            # Get the invitation using profile IDs
            where_clause = " OR ".join(profile_conditions)
            query = f"""
                SELECT pi.* FROM parent_invitations pi
                WHERE pi.id = %s AND ({where_clause}) AND pi.status = 'pending'
            """
            cur.execute(query, [request.invitation_id] + profile_params)
            invitation = cur.fetchone()

            if not invitation:
                raise HTTPException(status_code=404, detail="Invitation not found or already processed")

            # Get user's contact (email or phone)
            cur.execute("SELECT email, phone FROM users WHERE id = %s", (current_user['id'],))
            user = cur.fetchone()
            contact = user['email'] or user['phone']

            if not contact:
                raise HTTPException(status_code=400, detail="No contact information found for verification")

            # Verify OTP from otps table (for existing user invitations)
            cur.execute("""
                SELECT id, otp_code, expires_at, is_used FROM otps
                WHERE contact = %s
                AND purpose = %s
                AND is_used = FALSE
                AND expires_at > %s
                ORDER BY created_at DESC
                LIMIT 1
            """, (contact, f'parent_invitation_existing_{invitation["id"]}', datetime.utcnow()))
            otp_record = cur.fetchone()

            if not otp_record:
                raise HTTPException(status_code=401, detail="OTP not found or expired. Please ask the student to resend the invitation.")

            if otp_record['otp_code'] != request.otp_code:
                raise HTTPException(status_code=401, detail="Invalid OTP code")

            # OTP verified! Now accept the invitation

            # Add 'parent' role to user if they don't have it
            user_roles = current_user['roles'] or []
            role_added = False
            if 'parent' not in user_roles:
                new_roles = user_roles + ['parent']
                cur.execute("""
                    UPDATE users SET roles = %s WHERE id = %s
                """, (Json(new_roles), current_user['id']))
                role_added = True

            # Get student profile using inviter_id (which is now a profile ID)
            # inviter_profile_type tells us which table to look up
            inviter_user_id = None
            if invitation['inviter_profile_type'] == 'student':
                cur.execute("SELECT id, user_id, parent_id FROM student_profiles WHERE id = %s", (invitation['inviter_id'],))
                student_profile = cur.fetchone()
                if student_profile:
                    inviter_user_id = student_profile['user_id']
            elif invitation['inviter_profile_type'] == 'tutor':
                cur.execute("SELECT id, user_id FROM tutor_profiles WHERE id = %s", (invitation['inviter_id'],))
                tutor_profile_inviter = cur.fetchone()
                if tutor_profile_inviter:
                    inviter_user_id = tutor_profile_inviter['user_id']
                    # Also get student profile if tutor has one
                    cur.execute("SELECT id, parent_id FROM student_profiles WHERE user_id = %s", (inviter_user_id,))
                    student_profile = cur.fetchone()

            # Get or create parent profile for current user
            cur.execute("SELECT id, children_ids FROM parent_profiles WHERE user_id = %s", (current_user['id'],))
            parent_profile_current = cur.fetchone()

            if not parent_profile_current:
                cur.execute("""
                    INSERT INTO parent_profiles (user_id, relationship_type)
                    VALUES (%s, %s)
                    RETURNING id
                """, (current_user['id'], invitation['relationship_type']))
                parent_profile_current = {'id': cur.fetchone()['id'], 'children_ids': []}

            # Link parent profile to student (store parent profile ID, not user ID)
            if student_profile:
                parent_profile_ids = student_profile['parent_id'] if student_profile['parent_id'] else []
                if parent_profile_current['id'] not in parent_profile_ids:
                    parent_profile_ids = parent_profile_ids + [parent_profile_current['id']]
                    cur.execute("""
                        UPDATE student_profiles SET parent_id = %s WHERE id = %s
                    """, (parent_profile_ids, student_profile['id']))

            # Link student profile to parent (store student profile ID, not user ID)
            children_ids = parent_profile_current['children_ids'] if parent_profile_current.get('children_ids') else []
            if invitation['inviter_id'] not in children_ids:
                children_ids = children_ids + [invitation['inviter_id']]
                cur.execute("""
                    UPDATE parent_profiles SET children_ids = %s, total_children = %s WHERE id = %s
                """, (children_ids, len(children_ids), parent_profile_current['id']))

            # Update invitation status
            cur.execute("""
                UPDATE parent_invitations SET status = 'accepted', responded_at = %s WHERE id = %s
            """, (datetime.utcnow(), request.invitation_id))

            # Mark OTP as used
            cur.execute("""
                UPDATE otps SET is_used = TRUE, is_otp_verified = TRUE WHERE id = %s
            """, (otp_record['id'],))

            conn.commit()

    return {
        "message": "Invitation accepted successfully! You are now linked as this student's parent.",
        "status": "accepted",
        "role_added": role_added
    }


@router.get("/api/student/linked-parents")
async def get_linked_parents(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all parents linked to current student.
    NOTE: parent_id in student_profiles now stores parent_profile IDs (not user IDs).
    """
    if "student" not in current_user['roles']:
        raise HTTPException(status_code=403, detail="Only students can view their linked parents")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, parent_id FROM student_profiles WHERE user_id = %s", (current_user['id'],))
            student_profile = cur.fetchone()

            if not student_profile:
                raise HTTPException(status_code=404, detail="Student profile not found")

            parents = []
            # parent_ids now contains parent_profile IDs (not user IDs)
            parent_profile_ids = student_profile['parent_id'] if student_profile['parent_id'] else []

            for parent_profile_id in parent_profile_ids:
                # Look up parent profile by ID
                cur.execute("""
                    SELECT pp.id, pp.user_id, pp.profile_picture, pp.relationship_type, pp.is_verified
                    FROM parent_profiles pp
                    WHERE pp.id = %s
                """, (parent_profile_id,))
                parent_profile = cur.fetchone()

                if parent_profile:
                    # Get user info from users table
                    cur.execute("""
                        SELECT id, first_name, father_name, grandfather_name, email, phone
                        FROM users WHERE id = %s
                    """, (parent_profile['user_id'],))
                    parent_user = cur.fetchone()

                    if parent_user:
                        parents.append({
                            "user_id": parent_user['id'],
                            "profile_id": parent_profile['id'],
                            "first_name": parent_user['first_name'],
                            "father_name": parent_user['father_name'],
                            "grandfather_name": parent_user['grandfather_name'] or '',
                            "full_name": f"{parent_user['first_name']} {parent_user['father_name']} {parent_user['grandfather_name'] or ''}".strip(),
                            "email": parent_user['email'],
                            "phone": parent_user['phone'],
                            "relationship_type": parent_profile['relationship_type'],
                            "profile_picture": parent_profile['profile_picture'],
                            "is_verified": parent_profile['is_verified'],
                            "linked_at": None
                        })

    return {"parents": parents, "total": len(parents)}


@router.delete("/api/student/unlink-parent/{parent_profile_id}")
async def unlink_parent(
    parent_profile_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove a parent from student's linked parents.
    NOTE: parent_profile_id is now the parent_profiles.id (not user ID).
    """
    if "student" not in current_user['roles']:
        raise HTTPException(status_code=403, detail="Only students can unlink parents")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, parent_id FROM student_profiles WHERE user_id = %s", (current_user['id'],))
            student_profile = cur.fetchone()

            if not student_profile:
                raise HTTPException(status_code=404, detail="Student profile not found")

            # parent_id now stores parent_profile IDs (not user IDs)
            parent_profile_ids = student_profile['parent_id'] if student_profile['parent_id'] else []
            if parent_profile_id not in parent_profile_ids:
                raise HTTPException(status_code=404, detail="Parent not linked to your profile")

            # Remove parent profile ID from student's parent_id array
            parent_profile_ids = [p for p in parent_profile_ids if p != parent_profile_id]
            cur.execute("UPDATE student_profiles SET parent_id = %s WHERE id = %s", (parent_profile_ids, student_profile['id']))

            # Remove student profile ID from parent's children_ids array
            cur.execute("SELECT id, children_ids FROM parent_profiles WHERE id = %s", (parent_profile_id,))
            parent_profile = cur.fetchone()

            if parent_profile and parent_profile['children_ids']:
                # children_ids now stores student_profile IDs (not user IDs)
                children_ids = [c for c in parent_profile['children_ids'] if c != student_profile['id']]
                cur.execute("""
                    UPDATE parent_profiles SET children_ids = %s, total_children = %s WHERE id = %s
                """, (children_ids, len(children_ids), parent_profile_id))

            conn.commit()

    return {"message": "Parent unlinked successfully"}


# ============================================
# GET INVITATION BY TOKEN (For New Parents to view invitation)
# ============================================

@router.get("/api/parent/invitation/{token}")
async def get_invitation_by_token(token: str):
    """
    Get invitation details by invitation token.
    This is used when a new parent clicks the invitation link in their email.
    Returns the invitation details (name, email, student name, etc.) for the registration form.
    Does NOT require authentication.

    NOTE: inviter_id is now a profile ID with inviter_profile_type indicating which profile table.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Find the invitation by token
            cur.execute("""
                SELECT
                    pi.id, pi.inviter_id, pi.inviter_profile_type, pi.relationship_type, pi.status,
                    pi.pending_email, pi.pending_phone, pi.pending_first_name,
                    pi.pending_father_name, pi.pending_grandfather_name, pi.pending_gender,
                    pi.token_expires_at, pi.is_new_user
                FROM parent_invitations pi
                WHERE pi.invitation_token = %s
            """, (token,))
            invitation = cur.fetchone()

            if not invitation:
                raise HTTPException(status_code=404, detail="Invitation not found")

            # Check if invitation has expired
            if invitation['token_expires_at'] and invitation['token_expires_at'] < datetime.utcnow():
                raise HTTPException(status_code=400, detail="This invitation has expired")

            # Check if invitation was already accepted
            if invitation['status'] == 'accepted':
                raise HTTPException(status_code=400, detail="This invitation has already been accepted")

            if invitation['status'] == 'rejected':
                raise HTTPException(status_code=400, detail="This invitation has been rejected")

            # Get inviter's name based on profile type
            student_first_name = ""
            student_father_name = ""

            if invitation['inviter_profile_type'] == 'student':
                cur.execute("""
                    SELECT u.first_name, u.father_name
                    FROM student_profiles sp
                    JOIN users u ON u.id = sp.user_id
                    WHERE sp.id = %s
                """, (invitation['inviter_id'],))
                inviter = cur.fetchone()
                if inviter:
                    student_first_name = inviter['first_name']
                    student_father_name = inviter['father_name']
            elif invitation['inviter_profile_type'] == 'tutor':
                cur.execute("""
                    SELECT u.first_name, u.father_name
                    FROM tutor_profiles tp
                    JOIN users u ON u.id = tp.user_id
                    WHERE tp.id = %s
                """, (invitation['inviter_id'],))
                inviter = cur.fetchone()
                if inviter:
                    student_first_name = inviter['first_name']
                    student_father_name = inviter['father_name']

            # Return invitation details for the registration form
            student_name = f"{student_first_name} {student_father_name}".strip()

            return {
                "id": invitation['id'],
                "email": invitation['pending_email'],
                "phone": invitation['pending_phone'],
                "first_name": invitation['pending_first_name'],
                "father_name": invitation['pending_father_name'],
                "grandfather_name": invitation['pending_grandfather_name'],
                "gender": invitation['pending_gender'],
                "relationship_type": invitation['relationship_type'],
                "student_name": student_name,
                "is_new_user": invitation['is_new_user']
            }


# ============================================
# OTP VERIFICATION LOGIN ENDPOINT (For New Parents)
# ============================================

class OTPLoginRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    otp_code: str
    new_password: str  # User sets their own password during registration


@router.post("/api/parent/otp-login")
async def login_with_otp(
    request: OTPLoginRequest
):
    """
    Login endpoint for new parents invited via OTP.
    When logging in with OTP:
    1. Find the pending invitation with matching email/phone
    2. Verify the OTP from otps table
    3. Create the user account in users table with user's chosen password
    4. Create the parent profile
    5. Update invitation with invites_id (parent profile ID)
    6. Auto-accept the invitation (login = acceptance)
    7. Link parent and student using profile IDs
    8. Mark OTP as used

    Returns JWT tokens for the newly created user.

    NOTE: inviter_id is a profile ID with inviter_profile_type indicating which profile table.
    invites_id will store the new parent's profile ID.
    """
    if not request.email and not request.phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    contact = request.email or request.phone

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Find pending invitation with this email/phone
            invitation = None
            if request.email:
                cur.execute("""
                    SELECT * FROM parent_invitations
                    WHERE pending_email = %s
                    AND status = 'pending'
                    AND is_new_user = TRUE
                    AND token_expires_at > %s
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (request.email, datetime.utcnow()))
                invitation = cur.fetchone()

            if not invitation and request.phone:
                cur.execute("""
                    SELECT * FROM parent_invitations
                    WHERE pending_phone = %s
                    AND status = 'pending'
                    AND is_new_user = TRUE
                    AND token_expires_at > %s
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (request.phone, datetime.utcnow()))
                invitation = cur.fetchone()

            if not invitation:
                raise HTTPException(
                    status_code=404,
                    detail="No pending invitation found for this email/phone, or invitation has expired"
                )

            # Verify OTP from otps table (for NEW user invitations)
            cur.execute("""
                SELECT id, otp_code, expires_at, is_used FROM otps
                WHERE contact = %s
                AND purpose = %s
                AND is_used = FALSE
                AND expires_at > %s
                ORDER BY created_at DESC
                LIMIT 1
            """, (contact, f'parent_invitation_new_{invitation["id"]}', datetime.utcnow()))
            otp_record = cur.fetchone()

            if not otp_record:
                raise HTTPException(status_code=401, detail="OTP not found or expired. Please request a new invitation.")

            if otp_record['otp_code'] != request.otp_code:
                raise HTTPException(status_code=401, detail="Invalid OTP code")

            # Hash the user's chosen password
            password_hash = hash_password(request.new_password)

            # Create the user account NOW with user's chosen password
            cur.execute("""
                INSERT INTO users (
                    first_name, father_name, grandfather_name, email, phone, gender,
                    password_hash, roles, active_role, is_active
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'parent', TRUE)
                RETURNING id
            """, (
                invitation['pending_first_name'],
                invitation['pending_father_name'],
                invitation['pending_grandfather_name'],
                invitation['pending_email'],
                invitation['pending_phone'],
                invitation['pending_gender'],
                password_hash,
                Json(['parent'])
            ))
            new_user_id = cur.fetchone()['id']

            # Create parent profile
            cur.execute("""
                INSERT INTO parent_profiles (user_id, relationship_type)
                VALUES (%s, %s)
                RETURNING id
            """, (new_user_id, invitation['relationship_type']))
            parent_profile_id = cur.fetchone()['id']

            # Get student profile using inviter_id (which is now a profile ID)
            # inviter_profile_type tells us which table to look up
            student_profile = None
            if invitation['inviter_profile_type'] == 'student':
                cur.execute("SELECT id, parent_id FROM student_profiles WHERE id = %s", (invitation['inviter_id'],))
                student_profile = cur.fetchone()
            elif invitation['inviter_profile_type'] == 'tutor':
                # If inviter is a tutor, try to find their student profile
                cur.execute("SELECT user_id FROM tutor_profiles WHERE id = %s", (invitation['inviter_id'],))
                tutor_profile = cur.fetchone()
                if tutor_profile:
                    cur.execute("SELECT id, parent_id FROM student_profiles WHERE user_id = %s", (tutor_profile['user_id'],))
                    student_profile = cur.fetchone()

            # Link parent profile to student (store parent profile ID, not user ID)
            if student_profile:
                parent_profile_ids = student_profile['parent_id'] if student_profile['parent_id'] else []
                if parent_profile_id not in parent_profile_ids:
                    parent_profile_ids = parent_profile_ids + [parent_profile_id]
                    cur.execute("UPDATE student_profiles SET parent_id = %s WHERE id = %s",
                              (parent_profile_ids, student_profile['id']))

            # Link student profile to parent (store student profile ID, not user ID)
            # inviter_id is already a student profile ID if inviter_profile_type is 'student'
            student_profile_id_for_parent = invitation['inviter_id'] if invitation['inviter_profile_type'] == 'student' else (student_profile['id'] if student_profile else None)
            if student_profile_id_for_parent:
                # Get existing children_ids to append (in case parent already has children)
                cur.execute("SELECT children_ids FROM parent_profiles WHERE id = %s", (parent_profile_id,))
                parent_profile_row = cur.fetchone()
                existing_children_ids = parent_profile_row['children_ids'] if parent_profile_row and parent_profile_row['children_ids'] else []

                if student_profile_id_for_parent not in existing_children_ids:
                    existing_children_ids = existing_children_ids + [student_profile_id_for_parent]

                cur.execute("""
                    UPDATE parent_profiles SET children_ids = %s, total_children = %s WHERE id = %s
                """, (existing_children_ids, len(existing_children_ids), parent_profile_id))

            # Update invitation: set invites_id (parent profile ID) and mark as accepted
            cur.execute("""
                UPDATE parent_invitations
                SET invites_id = %s, invites_profile_type = 'parent', status = 'accepted', responded_at = %s
                WHERE id = %s
            """, (parent_profile_id, datetime.utcnow(), invitation['id']))

            # Mark OTP as used
            cur.execute("""
                UPDATE otps SET is_used = TRUE, is_otp_verified = TRUE WHERE id = %s
            """, (otp_record['id'],))

            conn.commit()

    # Generate JWT tokens for the new user
    access_token = create_access_token(data={"sub": str(new_user_id)})
    refresh_token = create_refresh_token(data={"sub": str(new_user_id)})

    return {
        "message": "Account created and invitation accepted successfully!",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": new_user_id,
            "first_name": invitation['pending_first_name'],
            "father_name": invitation['pending_father_name'],
            "grandfather_name": invitation['pending_grandfather_name'],
            "email": invitation['pending_email'],
            "phone": invitation['pending_phone'],
            "roles": ["parent"],
            "active_role": "parent"
        },
        "linked_student_profile_id": invitation['inviter_id'] if invitation['inviter_profile_type'] == 'student' else (student_profile['id'] if student_profile else None)
    }


@router.post("/api/parent/change-temp-password")
async def change_temp_password(
    new_password: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Allow parent to change their temporary password after first login.
    """
    if "parent" not in current_user['roles']:
        raise HTTPException(status_code=403, detail="Only parents can use this endpoint")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET password_hash = %s WHERE id = %s",
                       (hash_password(new_password), current_user['id']))
            conn.commit()

    return {"message": "Password changed successfully"}
