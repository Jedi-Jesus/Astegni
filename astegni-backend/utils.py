"""
Utility functions for Astegni Educational Platform
"""

import os
import uuid
import jwt
import bcrypt
import aiofiles
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, status, Depends, UploadFile
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from models import User, get_db
from config import SECRET_KEY, REFRESH_SECRET_KEY, ALGORITHM

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ============================================
# AUTHENTICATION UTILITIES
# ============================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token with role-specific IDs

    Expected data structure:
    {
        'sub': users.id,
        'role': 'student'|'tutor'|'parent'|'advertiser',
        'role_ids': {
            'student': student_profiles.id,
            'tutor': tutor_profiles.id,
            'parent': parent_profiles.id
        }
    }

    Token Duration: 7 days (auto-refreshes weekly for 1 year)
    """
    to_encode = data.copy()

    # Convert user_id to string for PyJWT compatibility
    if 'sub' in to_encode and isinstance(to_encode['sub'], int):
        to_encode['sub'] = str(to_encode['sub'])

    # Convert role_ids integers to strings for PyJWT compatibility
    if 'role_ids' in to_encode and isinstance(to_encode['role_ids'], dict):
        to_encode['role_ids'] = {
            role: str(role_id) if isinstance(role_id, int) else role_id
            for role, role_id in to_encode['role_ids'].items()
        }

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # 7-day access token (balances security and convenience)
        expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT refresh token with unique identifier and role-specific IDs

    Token Duration: 365 days (1 year) - User logs in once per year
    """
    to_encode = data.copy()

    # Convert user_id to string for PyJWT compatibility
    if 'sub' in to_encode and isinstance(to_encode['sub'], int):
        to_encode['sub'] = str(to_encode['sub'])

    # Convert role_ids integers to strings for PyJWT compatibility
    if 'role_ids' in to_encode and isinstance(to_encode['role_ids'], dict):
        to_encode['role_ids'] = {
            role: str(role_id) if isinstance(role_id, int) else role_id
            for role, role_id in to_encode['role_ids'].items()
        }

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # 365-day refresh token (1 year) - User stays logged in for full academic year
        expire = datetime.utcnow() + timedelta(days=365)

    # Add unique identifier to prevent duplicate tokens when created in same second
    to_encode.update({
        "exp": expire,
        "jti": str(uuid.uuid4())  # JWT ID for uniqueness
    })
    encoded_jwt = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def get_first_active_role(user: User, db: Session) -> Optional[str]:
    """
    Get the first ACTIVE role for a user.
    Checks each role profile to verify it's active (is_active=True).

    Priority order: student, tutor, parent, advertiser, user

    Returns:
        - First active role found, or
        - None if no active roles exist
    """
    from models import StudentProfile, TutorProfile, ParentProfile, AdvertiserProfile, UserProfile

    # Define role priority order
    role_priority = ['student', 'tutor', 'parent', 'advertiser', 'user']

    for role in role_priority:
        if role not in user.roles:
            continue

        # Check if this role's profile is active
        is_active = False

        if role == 'student':
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
            is_active = profile and getattr(profile, 'is_active', True)
        elif role == 'tutor':
            profile = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
            is_active = profile and getattr(profile, 'is_active', True)
        elif role == 'parent':
            profile = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
            is_active = profile and getattr(profile, 'is_active', True)
        elif role == 'advertiser':
            profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user.id).first()
            is_active = profile and getattr(profile, 'is_active', True)
        elif role == 'user':
            profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
            is_active = profile and getattr(profile, 'is_active', True)

        # If role is active, return it
        if is_active:
            return role

    # No active roles found
    return None


def get_role_ids_from_user(user: User, db: Session) -> dict:
    """Get all role-specific IDs for a user from the database

    Returns:
    {
        'student': student_profiles.id or None,
        'tutor': tutor_profiles.id or None,
        'parent': parent_profiles.id or None,
        'advertiser': advertiser_profiles.id or None
    }

    Note: Admin authentication is separate and uses admin_profile table directly,
    not linked to users table. Admins don't have role_ids in this function.
    """
    from models import StudentProfile, TutorProfile, ParentProfile, AdvertiserProfile

    role_ids = {}

    # Get student profile ID if exists
    if 'student' in user.roles:
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == user.id
        ).first()
        role_ids['student'] = student_profile.id if student_profile else None

    # Get tutor profile ID if exists
    if 'tutor' in user.roles:
        tutor_profile = db.query(TutorProfile).filter(
            TutorProfile.user_id == user.id
        ).first()
        role_ids['tutor'] = tutor_profile.id if tutor_profile else None

    # Get parent profile ID if exists
    if 'parent' in user.roles:
        parent_profile = db.query(ParentProfile).filter(
            ParentProfile.user_id == user.id
        ).first()
        role_ids['parent'] = parent_profile.id if parent_profile else None

    # Get advertiser profile ID if exists
    if 'advertiser' in user.roles:
        advertiser_profile = db.query(AdvertiserProfile).filter(
            AdvertiserProfile.user_id == user.id
        ).first()
        role_ids['advertiser'] = advertiser_profile.id if advertiser_profile else None

    # Note: Admin role is NOT included here because admin_profile table
    # is separate from users table and has its own authentication system

    return role_ids


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception

        # Convert string back to int (PyJWT requires string, but our DB uses int)
        user_id = int(user_id_str)
    except jwt.PyJWTError as e:
        print(f"[get_current_user] JWT decode error: {e}")
        raise credentials_exception
    except (ValueError, TypeError) as e:
        print(f"[get_current_user] Value/Type error: {e}")
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        print(f"[get_current_user] User not found: {user_id}")
        raise credentials_exception

    # CRITICAL FIX: Expire and refresh user object to get fresh data from database
    # This prevents SQLAlchemy session cache from returning stale active_role data
    # after role switches (fixes role reversion bug after grace period expires)
    db.expire(user)
    db.refresh(user)
    print(f"[get_current_user] Refreshed user {user.id} from database - active_role: {user.active_role}")

    # Attach role_ids to user object for easy access
    user.role_ids = payload.get("role_ids", {})

    # Attach current active role from token (the role user is currently logged in as)
    user.current_role = payload.get("role", user.active_role)
    print(f"[get_current_user] User {user.id} current_role from token: {user.current_role}")
    print(f"[get_current_user] User {user.id} role_ids from token: {user.role_ids}")

    # Convert string IDs back to integers
    if user.role_ids:
        try:
            user.role_ids = {
                role: int(role_id) if role_id and isinstance(role_id, str) and role_id.isdigit() else None
                for role, role_id in user.role_ids.items()
            }
            print(f"[get_current_user] Converted role_ids: {user.role_ids}")
        except Exception as e:
            print(f"[get_current_user] Error converting role_ids: {e}")
            user.role_ids = {}

    # Attach profile_id and profile_type based on current active role
    user.profile_type = user.current_role
    user.profile_id = user.role_ids.get(user.current_role) if user.role_ids else None
    print(f"[get_current_user] Profile context: profile_type={user.profile_type}, profile_id={user.profile_id}")

    return user

def get_current_user_optional(
    authorization: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            return None

        # Convert string back to int
        user_id = int(user_id_str)

        user = db.query(User).filter(User.id == user_id).first()
        return user
    except (jwt.PyJWTError, ValueError, TypeError):
        return None

# ============================================
# FILE HANDLING UTILITIES
# ============================================

async def save_uploaded_file(file: UploadFile, folder: str) -> str:
    """Save uploaded file and return URL"""
    os.makedirs(f"uploads/{folder}", exist_ok=True)

    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = f"uploads/{folder}/{unique_filename}"

    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)

    return f"/{file_path}"

def validate_file_type(filename: str, allowed_extensions: set) -> bool:
    """Validate file type based on extension"""
    if not filename:
        return False

    file_extension = f".{filename.split('.')[-1].lower()}"
    return file_extension in allowed_extensions

def get_file_size(file_path: str) -> int:
    """Get file size in bytes"""
    return os.path.getsize(file_path) if os.path.exists(file_path) else 0

# ============================================
# PROFILE UTILITIES
# ============================================

def calculate_profile_completion(profile) -> float:
    """Calculate profile completion percentage"""
    fields = ['bio', 'gender', 'date_of_birth', 'school_name', 'grade_level',
              'subjects', 'learning_style', 'guardian_name']
    completed = sum(1 for field in fields if getattr(profile, field, None))
    return (completed / len(fields)) * 100

def calculate_tutor_profile_completion(profile) -> float:
    """Calculate tutor profile completion percentage"""
    required_fields = [
        'bio', 'gender', 'courses', 'grades', 'subjects_expertise',
        'location', 'teaches_at', 'learning_method', 'experience',
        'price', 'availability'
    ]
    completed = sum(1 for field in required_fields if getattr(profile, field, None))
    return (completed / len(required_fields)) * 100

# ============================================
# VALIDATION UTILITIES
# ============================================

def validate_email_format(email: str) -> bool:
    """Basic email format validation"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_phone_format(phone: str) -> bool:
    """Basic phone format validation for Ethiopian numbers"""
    import re
    # Ethiopian phone format: +251xxxxxxxxx or 09xxxxxxxx
    pattern = r'^(\+251|0)[0-9]{9}$'
    return re.match(pattern, phone) is not None

def sanitize_text(text: str) -> str:
    """Basic text sanitization"""
    if not text:
        return ""

    # Remove potential HTML/script tags
    import re
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)

    return text.strip()

# ============================================
# SEARCH AND FILTERING UTILITIES
# ============================================

def build_search_query(search_term: str, fields: list):
    """Build search query for multiple fields"""
    from sqlalchemy import or_, func

    if not search_term:
        return None

    search_conditions = []
    for field in fields:
        search_conditions.append(func.lower(field).contains(search_term.lower()))

    return or_(*search_conditions)

def paginate_query(query, page: int = 1, limit: int = 10):
    """Apply pagination to SQLAlchemy query"""
    offset = (page - 1) * limit
    return query.offset(offset).limit(limit)

# ============================================
# DATE AND TIME UTILITIES
# ============================================

def format_datetime(dt: datetime) -> str:
    """Format datetime to standard string"""
    return dt.strftime("%Y-%m-%d %H:%M:%S") if dt else ""

def parse_date(date_string: str):
    """Parse date string to date object"""
    from datetime import datetime
    try:
        return datetime.strptime(date_string, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None

def is_business_hours(hour: int) -> bool:
    """Check if hour is within business hours (8 AM - 8 PM)"""
    return 8 <= hour <= 20

# ============================================
# ERROR HANDLING UTILITIES
# ============================================

def create_error_response(message: str, status_code: int = 400):
    """Create standardized error response"""
    return HTTPException(status_code=status_code, detail=message)

def log_error(error: Exception, context: str = ""):
    """Log error with context (basic implementation)"""
    import logging
    logging.error(f"Error in {context}: {str(error)}")

# ============================================
# RATING AND STATISTICS UTILITIES
# ============================================

def calculate_average_rating(rating_breakdown: dict) -> float:
    """Calculate average rating from breakdown"""
    if not rating_breakdown:
        return 0.0

    total_ratings = sum(rating_breakdown.values())
    if total_ratings == 0:
        return 0.0

    weighted_sum = sum(int(rating) * count for rating, count in rating_breakdown.items())
    return round(weighted_sum / total_ratings, 2)

def update_rating_breakdown(breakdown: dict, new_rating: int):
    """Update rating breakdown with new rating"""
    if not breakdown:
        breakdown = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}

    breakdown[str(new_rating)] = breakdown.get(str(new_rating), 0) + 1
    return breakdown


# ============================================
# TWO-FACTOR AUTHENTICATION UTILITIES
# ============================================

def require_2fa_verification(verification_token: Optional[str] = None):
    """
    Dependency to require 2FA verification for protected actions

    Usage in endpoints:
        @router.post("/protected-action")
        async def protected_action(
            current_user: User = Depends(get_current_user),
            verified: bool = Depends(require_2fa_verification),
            db: Session = Depends(get_db)
        ):
            # Your protected action here
            ...

    Returns True if verification is valid, raises HTTPException otherwise
    """
    def check_verification(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        token: Optional[str] = verification_token
    ) -> bool:
        # Check if user has 2FA enabled
        user = db.query(User).filter(User.id == current_user.id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # If 2FA is not enabled, allow action
        if not user.two_factor_enabled:
            return True

        # If 2FA is enabled, require verification token
        if not token:
            raise HTTPException(
                status_code=403,
                detail="2FA verification required. Please verify your identity first."
            )

        # Check if verification token is valid
        if not user.two_factor_verification_token or user.two_factor_verification_token != token:
            raise HTTPException(
                status_code=401,
                detail="Invalid verification token"
            )

        # Check if verification token has expired
        if user.two_factor_verification_expiry and user.two_factor_verification_expiry < datetime.utcnow():
            # Clear expired token
            user.two_factor_verification_token = None
            user.two_factor_verification_expiry = None
            db.commit()
            raise HTTPException(
                status_code=401,
                detail="Verification token expired. Please verify again."
            )

        return True

    return check_verification


# Admin authentication dependency
async def get_current_admin(token: str = Depends(oauth2_scheme)):
    """
    Dependency to verify admin user from token
    For now, checks if user is admin based on email or role
    TODO: Implement proper admin table authentication
    """
    try:
        # Decode token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )

        # Get user from database
        db = get_db().__next__()
        try:
            user = db.query(User).filter(User.id == user_id).first()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            # Check if user is admin
            # TODO: Replace with proper admin_users table check
            admin_emails = [
                "jediael.s.abebe@gmail.com",
                "admin@astegni.com"
            ]

            if user.email not in admin_emails:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin access required"
                )

            return user

        finally:
            db.close()

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )