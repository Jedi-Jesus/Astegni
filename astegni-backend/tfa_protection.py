"""
Two-Factor Authentication Protection Helper
ROLE-BASED: Checks 2FA status on the user's current role profile, not the user table
Provides manual 2FA verification for protected endpoints
PANEL-BASED: Users can choose which panels require 2FA protection
"""

from fastapi import HTTPException, Header
from typing import Optional
from datetime import datetime, timedelta
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

# Role to profile table mapping
ROLE_PROFILE_TABLES = {
    'student': 'student_profiles',
    'tutor': 'tutor_profiles',
    'parent': 'parent_profiles',
    'advertiser': 'advertiser_profiles'
}

# Default protected panels for each role (used if user hasn't customized)
DEFAULT_PROTECTED_PANELS = {
    'tutor': ['settings', 'packages', 'requests', 'earnings-investments'],
    'student': ['settings', 'credentials', 'earnings-investments'],
    'parent': ['settings', 'my-children', 'co-parents'],
    'advertiser': ['settings', 'team', 'brands'],
}


def check_2fa_protection(
    user_id: int,
    role: str,
    verification_token: Optional[str] = None
) -> bool:
    """
    Check if user has 2FA enabled for their CURRENT ROLE and verify token if needed

    ROLE-BASED: 2FA settings are stored on profile tables, not users table
    - Each role (student, tutor, parent, advertiser) has its own 2FA settings
    - User can have 2FA enabled for one role but not another

    ACTIVITY-BASED SLIDING WINDOW:
    - If token is valid, extends expiry by 10 minutes from now
    - User only needs to re-verify after 10 minutes of INACTIVITY
    - Each protected action resets the 10-minute timer

    Args:
        user_id: User ID from authentication
        role: Current active role (student, tutor, parent, advertiser)
        verification_token: X-2FA-Token header value

    Returns:
        True if access is granted

    Raises:
        HTTPException: 403 if 2FA required, 401 if token invalid/expired
    """
    # If role is not in the mapping, allow access (e.g., 'user', 'admin')
    if role not in ROLE_PROFILE_TABLES:
        return True

    profile_table = ROLE_PROFILE_TABLES[role]

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get role profile's 2FA status
        cur.execute(f"""
            SELECT two_factor_enabled, two_factor_verification_token,
                   two_factor_verification_expiry
            FROM {profile_table}
            WHERE user_id = %s
        """, (user_id,))

        row = cur.fetchone()

        if not row:
            # No profile for this role - allow access (profile might not exist yet)
            return True

        two_factor_enabled, stored_token, token_expiry = row

        # If 2FA is not enabled for this role, allow access
        if not two_factor_enabled:
            return True

        # If 2FA is enabled, require verification token
        if not verification_token:
            raise HTTPException(
                status_code=403,
                detail=f"2FA verification required for {role} role. Please verify your identity first."
            )

        # Check if verification token is valid
        if not stored_token or stored_token != verification_token:
            raise HTTPException(
                status_code=401,
                detail="Invalid verification token"
            )

        # Check if verification token has expired
        if token_expiry and token_expiry < datetime.utcnow():
            # Clear expired token
            cur.execute(f"""
                UPDATE {profile_table}
                SET two_factor_verification_token = NULL,
                    two_factor_verification_expiry = NULL
                WHERE user_id = %s
            """, (user_id,))
            conn.commit()

            raise HTTPException(
                status_code=401,
                detail="Verification token has expired. Please verify again."
            )

        # ACTIVITY-BASED SLIDING WINDOW
        # Token is valid - extend expiry by 10 minutes from now (user is active)
        new_expiry = datetime.utcnow() + timedelta(minutes=10)
        cur.execute(f"""
            UPDATE {profile_table}
            SET two_factor_verification_expiry = %s
            WHERE user_id = %s
        """, (new_expiry, user_id))
        conn.commit()

        # All checks passed
        return True

    finally:
        cur.close()
        conn.close()


def require_2fa(user_id: int, role: str, verification_token: Optional[str] = None):
    """
    Convenience wrapper for check_2fa_protection
    Use this in endpoint bodies for protection

    Usage:
        @router.get("/protected-endpoint")
        async def protected_endpoint(
            current_user = Depends(get_current_user),
            verification_token: Optional[str] = Header(default=None, alias="X-2FA-Token")
        ):
            # Get current role from token
            role = getattr(current_user, 'current_role', None) or current_user.active_role

            # Check 2FA protection for this role
            require_2fa(current_user.id, role, verification_token)

            # Your protected logic here
            ...
    """
    return check_2fa_protection(user_id, role, verification_token)


def is_2fa_enabled_for_role(user_id: int, role: str) -> bool:
    """
    Check if 2FA is enabled for a specific role without requiring verification

    Args:
        user_id: User ID
        role: Role to check (student, tutor, parent, advertiser)

    Returns:
        True if 2FA is enabled for this role, False otherwise
    """
    if role not in ROLE_PROFILE_TABLES:
        return False

    profile_table = ROLE_PROFILE_TABLES[role]

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute(f"""
            SELECT two_factor_enabled
            FROM {profile_table}
            WHERE user_id = %s
        """, (user_id,))

        row = cur.fetchone()

        if not row:
            return False

        return row[0] or False

    finally:
        cur.close()
        conn.close()


def get_2fa_method_for_role(user_id: int, role: str) -> Optional[str]:
    """
    Get the 2FA method configured for a specific role

    Args:
        user_id: User ID
        role: Role to check (student, tutor, parent, advertiser)

    Returns:
        The 2FA method ('email', 'authenticator', 'inapp') or None if not enabled
    """
    if role not in ROLE_PROFILE_TABLES:
        return None

    profile_table = ROLE_PROFILE_TABLES[role]

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute(f"""
            SELECT two_factor_enabled, two_factor_method
            FROM {profile_table}
            WHERE user_id = %s
        """, (user_id,))

        row = cur.fetchone()

        if not row or not row[0]:
            return None

        return row[1]

    finally:
        cur.close()
        conn.close()


def is_panel_protected(user_id: int, role: str, panel_id: str) -> bool:
    """
    Check if a specific panel is protected by 2FA for a user's role.

    Args:
        user_id: User ID
        role: Role to check (student, tutor, parent, advertiser)
        panel_id: The panel ID to check (e.g., 'settings', 'packages')

    Returns:
        True if the panel requires 2FA verification, False otherwise
    """
    if role not in ROLE_PROFILE_TABLES:
        return False

    profile_table = ROLE_PROFILE_TABLES[role]

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute(f"""
            SELECT two_factor_enabled, two_factor_protected_panels
            FROM {profile_table}
            WHERE user_id = %s
        """, (user_id,))

        row = cur.fetchone()

        if not row:
            return False

        two_factor_enabled, protected_panels = row

        # If 2FA is not enabled, no panels are protected
        if not two_factor_enabled:
            return False

        # Use protected panels from profile, or defaults if not set
        if protected_panels is None:
            protected_panels = DEFAULT_PROTECTED_PANELS.get(role, [])

        return panel_id in protected_panels

    finally:
        cur.close()
        conn.close()


def check_panel_2fa_protection(
    user_id: int,
    role: str,
    panel_id: str,
    verification_token: Optional[str] = None
) -> bool:
    """
    Check if user can access a specific panel.
    If panel is protected and 2FA is enabled, verifies the token.

    ACTIVITY-BASED SLIDING WINDOW:
    - If token is valid, extends expiry by 10 minutes from now
    - User only needs to re-verify after 10 minutes of INACTIVITY

    Args:
        user_id: User ID from authentication
        role: Current active role (student, tutor, parent, advertiser)
        panel_id: The panel being accessed
        verification_token: X-2FA-Token header value

    Returns:
        True if access is granted

    Raises:
        HTTPException: 403 if 2FA required, 401 if token invalid/expired
    """
    if role not in ROLE_PROFILE_TABLES:
        return True

    profile_table = ROLE_PROFILE_TABLES[role]

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute(f"""
            SELECT two_factor_enabled, two_factor_protected_panels,
                   two_factor_verification_token, two_factor_verification_expiry
            FROM {profile_table}
            WHERE user_id = %s
        """, (user_id,))

        row = cur.fetchone()

        if not row:
            return True

        two_factor_enabled, protected_panels, stored_token, token_expiry = row

        # If 2FA is not enabled, allow access
        if not two_factor_enabled:
            return True

        # Use protected panels from profile, or defaults if not set
        if protected_panels is None:
            protected_panels = DEFAULT_PROTECTED_PANELS.get(role, [])

        # Check if this panel is protected
        if panel_id not in protected_panels:
            return True

        # Panel is protected - require verification token
        if not verification_token:
            raise HTTPException(
                status_code=403,
                detail=f"2FA verification required to access {panel_id} panel. Please verify your identity first."
            )

        # Check if verification token is valid
        if not stored_token or stored_token != verification_token:
            raise HTTPException(
                status_code=401,
                detail="Invalid verification token"
            )

        # Check if verification token has expired
        if token_expiry and token_expiry < datetime.utcnow():
            cur.execute(f"""
                UPDATE {profile_table}
                SET two_factor_verification_token = NULL,
                    two_factor_verification_expiry = NULL
                WHERE user_id = %s
            """, (user_id,))
            conn.commit()

            raise HTTPException(
                status_code=401,
                detail="Verification token has expired. Please verify again."
            )

        # ACTIVITY-BASED SLIDING WINDOW
        # Token is valid - extend expiry by 10 minutes (user is active)
        new_expiry = datetime.utcnow() + timedelta(minutes=10)
        cur.execute(f"""
            UPDATE {profile_table}
            SET two_factor_verification_expiry = %s
            WHERE user_id = %s
        """, (new_expiry, user_id))
        conn.commit()

        return True

    finally:
        cur.close()
        conn.close()


def get_protected_panels_for_role(user_id: int, role: str) -> list:
    """
    Get the list of protected panels for a user's role.

    Args:
        user_id: User ID
        role: Role to check (student, tutor, parent, advertiser)

    Returns:
        List of protected panel IDs
    """
    if role not in ROLE_PROFILE_TABLES:
        return []

    profile_table = ROLE_PROFILE_TABLES[role]

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute(f"""
            SELECT two_factor_enabled, two_factor_protected_panels
            FROM {profile_table}
            WHERE user_id = %s
        """, (user_id,))

        row = cur.fetchone()

        if not row:
            return []

        two_factor_enabled, protected_panels = row

        # If 2FA is not enabled, return empty list
        if not two_factor_enabled:
            return []

        # Use protected panels from profile, or defaults if not set
        if protected_panels is None:
            return DEFAULT_PROTECTED_PANELS.get(role, [])

        return protected_panels

    finally:
        cur.close()
        conn.close()


print("[OK] TFA Protection (Role-Based + Panel-Based): Loaded")
