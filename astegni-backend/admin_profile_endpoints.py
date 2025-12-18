"""
Admin Profile Endpoints - UPDATED FOR NEW STRUCTURE
Handles CRUD operations for admin profiles with departments array

NEW STRUCTURE:
- admin_profile: shared data + departments array
- Department tables: department-specific data
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import psycopg
from psycopg.types.json import Json
from dotenv import load_dotenv
import os
import random
from datetime import datetime, timedelta

load_dotenv()
# Use ADMIN_DATABASE_URL for admin tables (astegni_admin_db)
ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

router = APIRouter(prefix="/api/admin", tags=["Admin Profile"])

# ============================================
# PYDANTIC MODELS
# ============================================

class AdminProfileResponse(BaseModel):
    id: int
    first_name: str
    father_name: str
    grandfather_name: Optional[str]
    email: List[str]  # Changed to array
    phone_number: List[str]  # Changed to array
    bio: Optional[str]
    quote: Optional[str]
    profile_picture: Optional[str]
    cover_picture: Optional[str]
    departments: List[str]
    created_at: str

class AdminProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    father_name: Optional[str] = None
    grandfather_name: Optional[str] = None
    email: Optional[List[str]] = None  # Changed to array
    phone_number: Optional[List[str]] = None  # Changed to array
    bio: Optional[str] = None
    quote: Optional[str] = None

class SystemSettingsProfileUpdate(BaseModel):
    # admin_profile fields
    username: Optional[str] = None
    first_name: Optional[str] = None
    father_name: Optional[str] = None
    grandfather_name: Optional[str] = None
    email: Optional[List[str]] = None  # Changed to array
    phone_number: Optional[List[str]] = None  # Changed to array
    bio: Optional[str] = None
    quote: Optional[str] = None
    # manage_system_settings_profile fields
    hero_title: Optional[List[str]] = None  # Array of titles
    hero_subtitle: Optional[str] = None
    location: Optional[List[str]] = None  # Array of locations
    languages: Optional[List[str]] = None  # Array of languages
    allow_location: Optional[bool] = None  # GPS location detection permission
    display_location: Optional[bool] = None  # Public location visibility
    # Note: position not in DB, removed from update model

class CredentialsProfileUpdate(BaseModel):
    # admin_profile fields
    first_name: Optional[str] = None
    father_name: Optional[str] = None
    grandfather_name: Optional[str] = None
    email: Optional[List[str]] = None  # Changed to array
    phone_number: Optional[List[str]] = None  # Changed to array
    # manage_credentials_profile fields
    username: Optional[str] = None
    bio: Optional[str] = None
    quote: Optional[str] = None
    hero_title: Optional[List[str]] = None  # Array of hero titles (JSONB)
    hero_subtitle: Optional[str] = None
    location: Optional[List[str]] = None  # Array of locations (JSONB)
    allow_location: Optional[bool] = None  # Allow system to access user's location
    display_location: Optional[bool] = None  # Whether to display location publicly
    languages: Optional[List[str]] = None  # Array of languages (JSONB)

# OTP Request Models for Profile Verification
class ProfileOTPSendRequest(BaseModel):
    admin_id: int
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    purpose: str = "verify_contact"  # verify_email, verify_phone, verify_contact

class ProfileOTPVerifyRequest(BaseModel):
    admin_id: int
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    otp_code: str

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_connection():
    """Get admin database connection (astegni_admin_db)"""
    return psycopg.connect(ADMIN_DATABASE_URL)

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

def save_otp_to_table(cursor, admin_id: int, contact: str, otp_code: str, purpose: str, expires_at: datetime):
    """Save OTP to otps table"""
    # First, mark any existing unused OTPs for this contact and purpose as used
    cursor.execute("""
        UPDATE otps SET is_used = TRUE
        WHERE contact = %s AND purpose = %s AND is_used = FALSE
    """, (contact, purpose))

    # Insert new OTP
    cursor.execute("""
        INSERT INTO otps (user_id, contact, otp_code, purpose, expires_at, is_used, created_at)
        VALUES (%s, %s, %s, %s, %s, FALSE, %s)
    """, (admin_id, contact, otp_code, purpose, expires_at, datetime.now()))

def verify_otp_from_table(cursor, contact: str, otp_code: str, purpose: str):
    """Verify OTP from otps table. Returns True if valid, raises HTTPException if invalid."""
    cursor.execute("""
        SELECT id, expires_at, is_used FROM otps
        WHERE contact = %s AND otp_code = %s AND purpose = %s
        ORDER BY created_at DESC LIMIT 1
    """, (contact, otp_code, purpose))

    result = cursor.fetchone()

    if not result:
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    otp_id, expires_at, is_used = result

    if is_used:
        raise HTTPException(status_code=400, detail="OTP has already been used")

    if datetime.now() > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired")

    # Mark OTP as used
    cursor.execute("UPDATE otps SET is_used = TRUE WHERE id = %s", (otp_id,))

    return True

def get_latest_otp_time(cursor, contact: str, purpose: str):
    """Get the creation time of the latest OTP for rate limiting"""
    cursor.execute("""
        SELECT created_at FROM otps
        WHERE contact = %s AND purpose = %s
        ORDER BY created_at DESC LIMIT 1
    """, (contact, purpose))
    result = cursor.fetchone()
    return result[0] if result else None

# ============================================
# ENDPOINTS
# ============================================

# ============================================
# OTP ENDPOINTS FOR PROFILE VERIFICATION
# ============================================

@router.post("/profile/send-otp")
async def send_profile_otp(request: ProfileOTPSendRequest):
    """
    Send OTP for email or phone verification when adding to profile.

    This endpoint is used by the verify-personal-info-modal to verify
    new email addresses or phone numbers before adding them to the profile.

    Rate limiting: 1 OTP per 2 minutes per contact
    OTP expires in 10 minutes
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Validate that admin exists
        cursor.execute("SELECT id, first_name FROM admin_profile WHERE id = %s", (request.admin_id,))
        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")

        admin_id, first_name = admin

        # Determine contact type
        contact = request.email or request.phone
        if not contact:
            raise HTTPException(status_code=400, detail="Either email or phone must be provided")

        contact_type = "email" if request.email else "phone"
        purpose = f"verify_{contact_type}"

        # Rate limiting: Check if OTP was requested in the last 2 minutes
        last_otp_time = get_latest_otp_time(cursor, contact, purpose)
        if last_otp_time:
            time_since_last = datetime.now() - last_otp_time
            if time_since_last < timedelta(minutes=2):
                remaining = int((timedelta(minutes=2) - time_since_last).total_seconds())
                return {
                    "success": False,
                    "message": f"Please wait {remaining} seconds before requesting another OTP",
                    "retry_after": remaining
                }

        # Generate OTP (10 min expiry for verification)
        otp_code = generate_otp()
        expires_at = datetime.now() + timedelta(minutes=10)

        # Save OTP
        save_otp_to_table(cursor, admin_id, contact, otp_code, purpose, expires_at)
        conn.commit()

        # Send OTP via email or SMS
        if contact_type == "email":
            try:
                from email_service import email_service
                email_sent = email_service.send_otp_email(
                    to_email=contact,
                    otp_code=otp_code,
                    purpose="Verify Email Address"
                )
                if email_sent:
                    print(f"[PROFILE OTP] Email OTP sent to {contact}")
                else:
                    print(f"[PROFILE OTP] Email failed but OTP stored: {otp_code}")
            except Exception as e:
                print(f"[PROFILE OTP] Email error: {e}")
                # Still return success - OTP is stored for testing
        else:
            # Phone SMS - placeholder for now
            print(f"[PROFILE OTP] Phone OTP for {contact}: {otp_code}")
            # TODO: Integrate SMS service

        return {
            "success": True,
            "message": f"OTP sent to {contact_type}",
            "contact_type": contact_type,
            "expires_in_minutes": 10
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[PROFILE OTP] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.post("/profile/verify-otp")
async def verify_profile_otp(request: ProfileOTPVerifyRequest):
    """
    Verify OTP for email or phone verification.

    After successful verification, the email/phone can be added to the profile.
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Validate that admin exists
        cursor.execute("SELECT id FROM admin_profile WHERE id = %s", (request.admin_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Admin not found")

        # Determine contact type
        contact = request.email or request.phone
        if not contact:
            raise HTTPException(status_code=400, detail="Either email or phone must be provided")

        contact_type = "email" if request.email else "phone"
        purpose = f"verify_{contact_type}"

        # Verify OTP
        verify_otp_from_table(cursor, contact, request.otp_code, purpose)
        conn.commit()

        return {
            "success": True,
            "message": f"{contact_type.capitalize()} verified successfully",
            "contact": contact,
            "contact_type": contact_type,
            "verified": True
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[PROFILE OTP VERIFY] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to verify OTP: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.get("/profile/{admin_id}")
async def get_admin_profile(admin_id: int):
    """
    Get admin profile with all department information

    NOTE: admin_profile table has:
    - email: TEXT[] (array)
    - phone_number: TEXT[] (array)
    - departments: TEXT[] (array)

    Fields like bio, quote, profile_image, cover_image are in the manage_*_profile tables
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get main profile from admin_profile (only columns that exist in this table)
        cursor.execute("""
            SELECT id, first_name, father_name, grandfather_name, email, phone_number,
                   departments, created_at
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # email, phone_number, departments are now arrays
        profile = {
            "id": row[0],
            "first_name": row[1],
            "father_name": row[2],
            "grandfather_name": row[3],
            "email": row[4] or [],  # TEXT[] array
            "phone_number": row[5] or [],  # TEXT[] array
            "departments": row[6] or [],  # TEXT[] array
            "created_at": row[7].isoformat() if row[7] else None,
            "bio": None,
            "quote": None,
            "profile_picture": None,
            "cover_picture": None
        }

        # Try to get bio, quote, profile_image, cover_image from the first department profile
        departments = profile["departments"]
        if departments:
            for dept in departments:
                try:
                    dept_table = dept.replace('-', '_') + '_profile'
                    cursor.execute(f"""
                        SELECT bio, quote, profile_image, cover_image
                        FROM {dept_table}
                        WHERE admin_id = %s
                    """, (admin_id,))
                    dept_row = cursor.fetchone()
                    if dept_row and (dept_row[0] or dept_row[1] or dept_row[2] or dept_row[3]):
                        profile["bio"] = dept_row[0]
                        profile["quote"] = dept_row[1]
                        profile["profile_picture"] = dept_row[2]
                        profile["cover_picture"] = dept_row[3]
                        break
                except Exception as e:
                    print(f"Error getting profile data from {dept}: {e}")
                    continue

        # Get department-specific data
        # Note: Department profile tables only have basic fields (username, bio, quote, etc.)
        # Stats like rating, reviews are calculated from admin_reviews table
        department_data = []
        for dept in (profile["departments"] or []):
            try:
                dept_table = dept.replace('-', '_') + '_profile'
                cursor.execute(f"""
                    SELECT created_at
                    FROM {dept_table}
                    WHERE admin_id = %s
                """, (admin_id,))

                dept_row = cursor.fetchone()
                if dept_row:
                    department_data.append({
                        "department": dept,
                        "created_at": dept_row[0].isoformat() if dept_row[0] else None
                    })
            except Exception as e:
                print(f"Error getting {dept} data: {e}")

        profile["department_details"] = department_data

        return profile

    finally:
        cursor.close()
        conn.close()

@router.put("/profile/{admin_id}")
async def update_admin_profile(admin_id: int, profile_data: AdminProfileUpdate):
    """Update admin profile (shared fields only)"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if profile exists
        cursor.execute("SELECT id FROM admin_profile WHERE id = %s", (admin_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # Build update query
        update_fields = []
        update_values = []

        if profile_data.first_name is not None:
            update_fields.append("first_name = %s")
            update_values.append(profile_data.first_name)

        if profile_data.father_name is not None:
            update_fields.append("father_name = %s")
            update_values.append(profile_data.father_name)

        if profile_data.grandfather_name is not None:
            update_fields.append("grandfather_name = %s")
            update_values.append(profile_data.grandfather_name)

        if profile_data.email is not None:
            update_fields.append("email = %s")
            update_values.append(profile_data.email)

        if profile_data.phone_number is not None:
            update_fields.append("phone_number = %s")
            update_values.append(profile_data.phone_number)

        # Note: bio and quote are stored in department-specific tables, not admin_profile
        # Skip them here - they should be updated via the department-specific endpoints

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Add updated_at
        update_fields.append("updated_at = %s")
        update_values.append(datetime.now())
        update_values.append(admin_id)

        # Execute update
        query = f"UPDATE admin_profile SET {', '.join(update_fields)} WHERE id = %s"
        cursor.execute(query, tuple(update_values))
        conn.commit()

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating admin profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")
    finally:
        cursor.close()
        conn.close()

    # Return updated profile (get fresh connection)
    return await get_admin_profile(admin_id)

@router.get("/system-settings-profile/by-email/{email}")
async def get_system_settings_profile_by_email(email: str):
    """
    Get admin profile by email for System Settings page
    Used when admin logs in and we have their email but not ID

    NOTE: email is now a TEXT[] array - use ANY() for lookup
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get admin_id from email (email is now an array)
        cursor.execute("SELECT id FROM admin_profile WHERE %s = ANY(email)", (email,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail=f"Admin with email {email} not found")

        admin_id = result[0]

        # Call the main endpoint with the admin_id
        return await get_system_settings_profile(admin_id)

    finally:
        cursor.close()
        conn.close()


@router.get("/system-settings-profile/{admin_id}")
async def get_system_settings_profile(admin_id: int):
    """
    Get admin profile merged with manage_system_settings_profile data

    NOTE: admin_profile has email, phone_number, departments as TEXT[] arrays
    Fields like username, bio, quote, profile_image, cover_image are in manage_system_settings_profile
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get main profile from admin_profile (only columns that exist)
        cursor.execute("""
            SELECT id, first_name, father_name, grandfather_name, email, phone_number,
                   departments, created_at
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # email, phone_number, departments are arrays
        profile = {
            "id": row[0],
            "first_name": row[1],
            "father_name": row[2],
            "grandfather_name": row[3],
            "email": row[4] or [],  # TEXT[] array
            "phone_number": row[5] or [],  # TEXT[] array
            "departments": row[6] or [],  # TEXT[] array
            "created_at": row[7].isoformat() if row[7] else None,
            "username": None,
            "bio": None,
            "quote": None,
            "profile_picture": None,
            "cover_picture": None
        }

        # Get username, bio, quote, profile_image, cover_image, and other fields from manage_system_settings_profile
        cursor.execute("""
            SELECT username, bio, quote, profile_image, cover_image,
                   hero_title, hero_subtitle, location, languages, allow_location, display_location
            FROM manage_system_settings_profile
            WHERE admin_id = %s
        """, (admin_id,))
        settings_profile_row = cursor.fetchone()
        if settings_profile_row:
            profile["username"] = settings_profile_row[0]
            profile["bio"] = settings_profile_row[1]
            profile["quote"] = settings_profile_row[2]
            profile["profile_picture"] = settings_profile_row[3]
            profile["cover_picture"] = settings_profile_row[4]
            profile["hero_title"] = settings_profile_row[5] or []
            profile["hero_subtitle"] = settings_profile_row[6]
            profile["location"] = settings_profile_row[7] or []
            profile["languages"] = settings_profile_row[8] or []
            profile["allow_location"] = settings_profile_row[9] if settings_profile_row[9] is not None else False
            profile["display_location"] = settings_profile_row[10] if settings_profile_row[10] is not None else True
        else:
            # Set defaults for new fields
            profile["hero_title"] = []
            profile["hero_subtitle"] = None
            profile["location"] = []
            profile["languages"] = []
            profile["allow_location"] = False
            profile["display_location"] = True

        # Calculate rating from admin_reviews table
        cursor.execute("""
            SELECT
                COALESCE(AVG(rating), 0) as avg_rating,
                COALESCE(AVG(response_time_rating), 0) as avg_response_time,
                COALESCE(AVG(accuracy_rating), 0) as avg_accuracy,
                COUNT(*) as total_reviews
            FROM admin_reviews
            WHERE admin_id = %s
        """, (admin_id,))
        reviews_row = cursor.fetchone()

        # Calculate overall rating as weighted average of all rating types
        avg_rating = float(reviews_row[0]) if reviews_row[0] else 0.0
        avg_response_time = float(reviews_row[1]) if reviews_row[1] else 0.0
        avg_accuracy = float(reviews_row[2]) if reviews_row[2] else 0.0
        total_reviews = reviews_row[3] if reviews_row[3] else 0

        # If we have reviews, calculate overall rating (weighted average)
        if total_reviews > 0:
            calculated_rating = round((avg_rating + avg_response_time + avg_accuracy) / 3, 1)
        else:
            calculated_rating = 0.0

        # Get manage_system_settings_profile data (only existing columns)
        cursor.execute("""
            SELECT badges, created_at
            FROM manage_system_settings_profile
            WHERE admin_id = %s
        """, (admin_id,))

        settings_row = cursor.fetchone()

        if settings_row:
            profile["system_settings"] = {
                "position": "System Administrator",  # Default position
                "rating": calculated_rating,
                "total_reviews": total_reviews,
                "avg_rating": round(avg_rating, 1),
                "avg_response_time_rating": round(avg_response_time, 1),
                "avg_accuracy_rating": round(avg_accuracy, 1),
                "badges": settings_row[0] or [],
                "total_actions": 0,  # Not stored in DB
                "system_changes_made": 0,  # Not stored in DB
                "admins_invited": 0,  # Not stored in DB
                "critical_alerts_resolved": 0,  # Not stored in DB
                "permissions": {
                    "full_access": True,
                    "can_manage_admins": True,
                    "can_change_settings": True,
                    "can_access_all_departments": True
                },
                "joined_date": settings_row[1].isoformat() if settings_row[1] else None,
                "created_at": settings_row[1].isoformat() if settings_row[1] else None
            }
        else:
            # Return default system settings if not found
            profile["system_settings"] = {
                "position": "System Administrator",
                "rating": calculated_rating,
                "total_reviews": total_reviews,
                "avg_rating": round(avg_rating, 1),
                "avg_response_time_rating": round(avg_response_time, 1),
                "avg_accuracy_rating": round(avg_accuracy, 1),
                "badges": [],
                "total_actions": 0,
                "system_changes_made": 0,
                "admins_invited": 0,
                "critical_alerts_resolved": 0,
                "permissions": {
                    "full_access": True,
                    "can_manage_admins": True,
                    "can_change_settings": True,
                    "can_access_all_departments": True
                },
                "joined_date": None,
                "created_at": None
            }

        return profile

    finally:
        cursor.close()
        conn.close()

@router.put("/system-settings-profile/{admin_id}")
async def update_system_settings_profile(admin_id: int, profile_data: SystemSettingsProfileUpdate):
    """Update admin profile and manage_system_settings_profile data

    NOTE: Field locations:
    - admin_profile: first_name, father_name, grandfather_name, email[], phone_number[]
    - manage_system_settings_profile: username, bio, quote, profile_image, cover_image
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if profile exists
        cursor.execute("SELECT id FROM admin_profile WHERE id = %s", (admin_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # Update admin_profile fields (only fields that exist in admin_profile table)
        admin_update_fields = []
        admin_update_values = []

        if profile_data.first_name is not None:
            admin_update_fields.append("first_name = %s")
            admin_update_values.append(profile_data.first_name)

        if profile_data.father_name is not None:
            admin_update_fields.append("father_name = %s")
            admin_update_values.append(profile_data.father_name)

        if profile_data.grandfather_name is not None:
            admin_update_fields.append("grandfather_name = %s")
            admin_update_values.append(profile_data.grandfather_name)

        if profile_data.email is not None:
            admin_update_fields.append("email = %s")
            admin_update_values.append(profile_data.email)

        if profile_data.phone_number is not None:
            admin_update_fields.append("phone_number = %s")
            admin_update_values.append(profile_data.phone_number)

        # Update admin_profile if there are fields to update
        if admin_update_fields:
            admin_update_fields.append("updated_at = %s")
            admin_update_values.append(datetime.now())
            admin_update_values.append(admin_id)

            query = f"UPDATE admin_profile SET {', '.join(admin_update_fields)} WHERE id = %s"
            cursor.execute(query, tuple(admin_update_values))

        # Check if manage_system_settings_profile exists for this admin
        cursor.execute("SELECT id FROM manage_system_settings_profile WHERE admin_id = %s", (admin_id,))
        settings_profile_exists = cursor.fetchone()

        # Update manage_system_settings_profile fields (username, bio, quote, hero_title, etc.)
        settings_update_fields = []
        settings_update_values = []

        if profile_data.username is not None:
            settings_update_fields.append("username = %s")
            settings_update_values.append(profile_data.username)

        if profile_data.bio is not None:
            settings_update_fields.append("bio = %s")
            settings_update_values.append(profile_data.bio)

        if profile_data.quote is not None:
            settings_update_fields.append("quote = %s")
            settings_update_values.append(profile_data.quote)

        if profile_data.hero_title is not None:
            settings_update_fields.append("hero_title = %s")
            settings_update_values.append(Json(profile_data.hero_title))  # JSONB array

        if profile_data.hero_subtitle is not None:
            settings_update_fields.append("hero_subtitle = %s")
            settings_update_values.append(profile_data.hero_subtitle)

        if profile_data.location is not None:
            settings_update_fields.append("location = %s")
            settings_update_values.append(Json(profile_data.location))  # JSONB array

        if profile_data.languages is not None:
            settings_update_fields.append("languages = %s")
            settings_update_values.append(Json(profile_data.languages))  # JSONB array

        if profile_data.allow_location is not None:
            settings_update_fields.append("allow_location = %s")
            settings_update_values.append(profile_data.allow_location)

        if profile_data.display_location is not None:
            settings_update_fields.append("display_location = %s")
            settings_update_values.append(profile_data.display_location)

        # Update or insert manage_system_settings_profile
        if settings_update_fields:
            if settings_profile_exists:
                # Update existing record
                settings_update_fields.append("updated_at = %s")
                settings_update_values.append(datetime.now())
                settings_update_values.append(admin_id)

                query = f"UPDATE manage_system_settings_profile SET {', '.join(settings_update_fields)} WHERE admin_id = %s"
                cursor.execute(query, tuple(settings_update_values))
            else:
                # Insert new record
                insert_fields = ['admin_id']
                insert_values = [admin_id]

                if profile_data.username is not None:
                    insert_fields.append('username')
                    insert_values.append(profile_data.username)

                if profile_data.bio is not None:
                    insert_fields.append('bio')
                    insert_values.append(profile_data.bio)

                if profile_data.quote is not None:
                    insert_fields.append('quote')
                    insert_values.append(profile_data.quote)

                if profile_data.hero_title is not None:
                    insert_fields.append('hero_title')
                    insert_values.append(Json(profile_data.hero_title))

                if profile_data.hero_subtitle is not None:
                    insert_fields.append('hero_subtitle')
                    insert_values.append(profile_data.hero_subtitle)

                if profile_data.location is not None:
                    insert_fields.append('location')
                    insert_values.append(Json(profile_data.location))

                if profile_data.languages is not None:
                    insert_fields.append('languages')
                    insert_values.append(Json(profile_data.languages))

                if profile_data.allow_location is not None:
                    insert_fields.append('allow_location')
                    insert_values.append(profile_data.allow_location)

                if profile_data.display_location is not None:
                    insert_fields.append('display_location')
                    insert_values.append(profile_data.display_location)

                insert_fields.extend(['created_at', 'updated_at'])
                insert_values.extend([datetime.now(), datetime.now()])

                placeholders = ', '.join(['%s'] * len(insert_values))
                columns = ', '.join(insert_fields)
                query = f"INSERT INTO manage_system_settings_profile ({columns}) VALUES ({placeholders})"
                cursor.execute(query, tuple(insert_values))

        conn.commit()

        # Return updated profile
        return await get_system_settings_profile(admin_id)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating system settings profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.get("/manage-courses-profile/by-email/{email}")
async def get_manage_courses_profile_by_email(email: str):
    """
    Get admin profile by email for Manage Courses page
    Used when admin logs in and we have their email but not ID

    NOTE: email is now a TEXT[] array - use ANY() for lookup
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get admin_id from email (email is now an array)
        cursor.execute("SELECT id FROM admin_profile WHERE %s = ANY(email)", (email,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail=f"Admin with email {email} not found")

        admin_id = result[0]

        # Call the main endpoint with the admin_id
        return await get_manage_courses_profile(admin_id)

    finally:
        cursor.close()
        conn.close()

@router.get("/manage-courses-profile/{admin_id}")
async def get_manage_courses_profile(admin_id: int):
    """
    Get admin profile merged with manage_courses_profile data for Manage Courses page

    Supports cross-department access:
    - manage-courses department: Full course management profile
    - manage-system-settings department: Viewing access with system admin badge
    - Other departments: View-only access

    NOTE: admin_profile has email, phone_number, departments as TEXT[] arrays
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get main profile from admin_profile (only columns that exist)
        cursor.execute("""
            SELECT id, first_name, father_name, grandfather_name, email, phone_number,
                   departments, created_at
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # email, phone_number, departments are arrays
        profile = {
            "id": row[0],
            "first_name": row[1],
            "father_name": row[2],
            "grandfather_name": row[3],
            "email": row[4] or [],  # TEXT[] array
            "phone_number": row[5] or [],  # TEXT[] array
            "departments": row[6] or [],  # TEXT[] array
            "created_at": row[7].isoformat() if row[7] else None,
            "username": None,
            "bio": None,
            "quote": None,
            "profile_picture": None,
            "cover_picture": None
        }

        # Get username, bio, quote, profile_image, cover_image from manage_courses_profile
        cursor.execute("""
            SELECT username, bio, quote, profile_image, cover_image
            FROM manage_courses_profile
            WHERE admin_id = %s
        """, (admin_id,))
        courses_profile_row = cursor.fetchone()
        if courses_profile_row:
            profile["username"] = courses_profile_row[0]
            profile["bio"] = courses_profile_row[1]
            profile["quote"] = courses_profile_row[2]
            profile["profile_picture"] = courses_profile_row[3]
            profile["cover_picture"] = courses_profile_row[4]

        # Calculate rating from admin_reviews table
        cursor.execute("""
            SELECT
                COALESCE(AVG(rating), 0) as avg_rating,
                COUNT(*) as total_reviews
            FROM admin_reviews
            WHERE admin_id = %s
        """, (admin_id,))
        reviews_row = cursor.fetchone()
        calculated_rating = round(float(reviews_row[0]), 1) if reviews_row[0] else 0.0
        total_reviews = reviews_row[1] if reviews_row[1] else 0

        # Get manage_courses_profile data (only existing columns)
        cursor.execute("""
            SELECT badges, created_at
            FROM manage_courses_profile
            WHERE admin_id = %s
        """, (admin_id,))

        courses_row = cursor.fetchone()
        departments = profile["departments"] or []

        # Get stats from admin_portfolio table
        cursor.execute("""
            SELECT courses_created, courses_verified, courses_rejected, courses_suspended, courses_reactivated
            FROM admin_portfolio
            WHERE admin_id = %s
        """, (admin_id,))
        portfolio_row = cursor.fetchone()

        if courses_row:
            # Admin has a manage_courses_profile record
            courses_created = portfolio_row[0] if portfolio_row else 0
            courses_verified = portfolio_row[1] if portfolio_row else 0
            courses_rejected = portfolio_row[2] if portfolio_row else 0
            courses_suspended = portfolio_row[3] if portfolio_row else 0
            courses_reactivated = portfolio_row[4] if portfolio_row else 0

            profile["courses_profile"] = {
                "position": "Course Manager",  # Default position
                "rating": calculated_rating,
                "total_reviews": total_reviews,
                "badges": courses_row[0] or [],
                "courses_created": courses_created,
                "courses_verified": courses_verified,
                "courses_rejected": courses_rejected,
                "courses_suspended": courses_suspended,
                "courses_reactivated": courses_reactivated,
                "total_courses_processed": courses_verified + courses_rejected + courses_suspended,
                "avg_course_rating": 0.0,  # Not stored in DB
                "permissions": {
                    "can_approve_courses": True,
                    "can_reject_courses": True,
                    "can_suspend_courses": True,
                    "can_view_analytics": True
                },
                "joined_date": courses_row[1].isoformat() if courses_row[1] else None,
                "created_at": courses_row[1].isoformat() if courses_row[1] else None,
                "has_profile": True
            }
        else:
            # Admin doesn't have manage_courses_profile - provide defaults based on their department
            is_system_admin = "manage-system-settings" in departments
            is_courses_admin = "manage-courses" in departments

            # Determine position and badges based on department
            if is_system_admin:
                position = "System Administrator (Viewing)"
                badges = ["System Admin", "Full Access"]
                permissions = {
                    "can_approve_courses": True,
                    "can_reject_courses": True,
                    "can_suspend_courses": True,
                    "can_view_analytics": True,
                    "can_manage_notifications": True,
                    "system_admin": True
                }
            elif is_courses_admin:
                position = "Course Manager"
                badges = []
                permissions = {
                    "can_approve_courses": True,
                    "can_reject_courses": True,
                    "can_suspend_courses": True,
                    "can_view_analytics": True
                }
            else:
                position = "Admin (View Only)"
                badges = []
                permissions = {
                    "can_view_analytics": True
                }

            profile["courses_profile"] = {
                "position": position,
                "rating": 0.0,
                "total_reviews": 0,
                "badges": badges,
                "courses_created": 0,
                "courses_verified": 0,
                "courses_rejected": 0,
                "courses_suspended": 0,
                "courses_reactivated": 0,
                "total_courses_processed": 0,
                "avg_course_rating": 0.0,
                "permissions": permissions,
                "joined_date": profile["created_at"],  # Use account creation date
                "created_at": None,
                "has_profile": False
            }

        return profile

    finally:
        cursor.close()
        conn.close()

class ManageCoursesProfileUpdate(BaseModel):
    """Update model for manage_courses_profile"""
    # admin_profile fields
    first_name: Optional[str] = None
    father_name: Optional[str] = None
    grandfather_name: Optional[str] = None
    phone_number: Optional[str] = None  # Single string, will be converted to array
    # manage_courses_profile fields
    username: Optional[str] = None
    bio: Optional[str] = None
    quote: Optional[str] = None
    hero_title: Optional[List[str]] = None  # Array of titles
    hero_subtitle: Optional[str] = None
    location: Optional[List[str]] = None  # Array of locations
    languages: Optional[List[str]] = None  # Array of languages
    allow_location: Optional[bool] = None  # GPS location detection permission
    display_location: Optional[bool] = None  # Public location visibility

@router.put("/manage-courses-profile/{admin_id}")
async def update_manage_courses_profile(admin_id: int, profile_data: ManageCoursesProfileUpdate):
    """
    Update admin profile and manage_courses_profile data
    Creates manage_courses_profile record if it doesn't exist
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if admin_profile exists
        cursor.execute("SELECT id FROM admin_profile WHERE id = %s", (admin_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # Update admin_profile fields (name, phone)
        admin_update_fields = []
        admin_update_values = []

        if profile_data.first_name is not None:
            admin_update_fields.append("first_name = %s")
            admin_update_values.append(profile_data.first_name)

        if profile_data.father_name is not None:
            admin_update_fields.append("father_name = %s")
            admin_update_values.append(profile_data.father_name)

        if profile_data.grandfather_name is not None:
            admin_update_fields.append("grandfather_name = %s")
            admin_update_values.append(profile_data.grandfather_name)

        if profile_data.phone_number is not None:
            # Convert single phone to array format
            admin_update_fields.append("phone_number = %s")
            admin_update_values.append([profile_data.phone_number] if profile_data.phone_number else [])

        # Update admin_profile if there are fields
        if admin_update_fields:
            admin_update_fields.append("updated_at = %s")
            admin_update_values.append(datetime.now())
            admin_update_values.append(admin_id)

            query = f"UPDATE admin_profile SET {', '.join(admin_update_fields)} WHERE id = %s"
            cursor.execute(query, tuple(admin_update_values))

        # Check if manage_courses_profile exists for this admin
        cursor.execute("SELECT id FROM manage_courses_profile WHERE admin_id = %s", (admin_id,))
        courses_profile_exists = cursor.fetchone()

        # Prepare manage_courses_profile fields (only existing DB columns)
        courses_fields = {}
        if profile_data.username is not None:
            courses_fields['username'] = profile_data.username
        if profile_data.bio is not None:
            courses_fields['bio'] = profile_data.bio
        if profile_data.quote is not None:
            courses_fields['quote'] = profile_data.quote
        if profile_data.hero_title is not None:
            courses_fields['hero_title'] = Json(profile_data.hero_title)  # JSONB field
        if profile_data.hero_subtitle is not None:
            courses_fields['hero_subtitle'] = profile_data.hero_subtitle
        if profile_data.location is not None:
            courses_fields['location'] = Json(profile_data.location)  # JSONB field
        if profile_data.languages is not None:
            courses_fields['languages'] = Json(profile_data.languages)  # JSONB field
        if profile_data.allow_location is not None:
            courses_fields['allow_location'] = profile_data.allow_location
        if profile_data.display_location is not None:
            courses_fields['display_location'] = profile_data.display_location

        if courses_fields:
            if courses_profile_exists:
                # Update existing record
                update_parts = [f"{k} = %s" for k in courses_fields.keys()]
                update_parts.append("updated_at = %s")
                values = list(courses_fields.values()) + [datetime.now(), admin_id]

                query = f"UPDATE manage_courses_profile SET {', '.join(update_parts)} WHERE admin_id = %s"
                cursor.execute(query, tuple(values))
            else:
                # Insert new record
                courses_fields['admin_id'] = admin_id
                courses_fields['created_at'] = datetime.now()
                courses_fields['updated_at'] = datetime.now()

                columns = ', '.join(courses_fields.keys())
                placeholders = ', '.join(['%s'] * len(courses_fields))
                values = list(courses_fields.values())

                query = f"INSERT INTO manage_courses_profile ({columns}) VALUES ({placeholders})"
                cursor.execute(query, tuple(values))

        conn.commit()

        # Return updated profile
        return await get_manage_courses_profile(admin_id)

    finally:
        cursor.close()
        conn.close()

@router.get("/manage-schools-profile/by-email/{email}")
async def get_manage_schools_profile_by_email(email: str):
    """
    Get admin profile by email for Manage Schools page
    Used when admin logs in and we have their email but not ID

    NOTE: email is now a TEXT[] array - use ANY() for lookup
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get admin_id from email (email is now an array)
        cursor.execute("SELECT id FROM admin_profile WHERE %s = ANY(email)", (email,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail=f"Admin with email {email} not found")

        admin_id = result[0]

        # Call the main endpoint with the admin_id
        return await get_manage_schools_profile(admin_id)

    finally:
        cursor.close()
        conn.close()

@router.get("/manage-schools-profile/{admin_id}")
async def get_manage_schools_profile(admin_id: int):
    """
    Get admin profile merged with manage_schools_profile data for Manage Schools page

    Supports cross-department access:
    - manage-schools department: Full school management profile
    - manage-system-settings department: Viewing access with system admin badge
    - Other departments: View-only access

    NOTE: admin_profile has email, phone_number, departments as TEXT[] arrays
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get main profile from admin_profile (only columns that exist)
        cursor.execute("""
            SELECT id, first_name, father_name, grandfather_name, email, phone_number,
                   departments, created_at
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # email, phone_number, departments are arrays
        profile = {
            "id": row[0],
            "first_name": row[1],
            "father_name": row[2],
            "grandfather_name": row[3],
            "email": row[4] or [],  # TEXT[] array
            "phone_number": row[5] or [],  # TEXT[] array
            "departments": row[6] or [],  # TEXT[] array
            "created_at": row[7].isoformat() if row[7] else None,
            "username": None,
            "bio": None,
            "quote": None,
            "profile_picture": None,
            "cover_picture": None
        }

        # Get username, bio, quote, profile_image, cover_image from manage_schools_profile
        cursor.execute("""
            SELECT username, bio, quote, profile_image, cover_image
            FROM manage_schools_profile
            WHERE admin_id = %s
        """, (admin_id,))
        schools_profile_row = cursor.fetchone()
        if schools_profile_row:
            profile["username"] = schools_profile_row[0]
            profile["bio"] = schools_profile_row[1]
            profile["quote"] = schools_profile_row[2]
            profile["profile_picture"] = schools_profile_row[3]
            profile["cover_picture"] = schools_profile_row[4]

        # Calculate rating from admin_reviews table
        cursor.execute("""
            SELECT
                COALESCE(AVG(rating), 0) as avg_rating,
                COUNT(*) as total_reviews
            FROM admin_reviews
            WHERE admin_id = %s
        """, (admin_id,))
        reviews_row = cursor.fetchone()
        calculated_rating = round(float(reviews_row[0]), 1) if reviews_row[0] else 0.0
        total_reviews = reviews_row[1] if reviews_row[1] else 0

        # Get manage_schools_profile data (only existing columns)
        cursor.execute("""
            SELECT badges, created_at
            FROM manage_schools_profile
            WHERE admin_id = %s
        """, (admin_id,))

        schools_row = cursor.fetchone()
        departments = profile["departments"] or []

        # Get stats from admin_portfolio table
        cursor.execute("""
            SELECT schools_added, schools_verified, schools_rejected, schools_suspended, schools_reactivated
            FROM admin_portfolio
            WHERE admin_id = %s
        """, (admin_id,))
        portfolio_row = cursor.fetchone()

        if schools_row:
            # Admin has a manage_schools_profile record
            schools_added = portfolio_row[0] if portfolio_row else 0
            schools_verified = portfolio_row[1] if portfolio_row else 0
            schools_rejected = portfolio_row[2] if portfolio_row else 0
            schools_suspended = portfolio_row[3] if portfolio_row else 0
            schools_reactivated = portfolio_row[4] if portfolio_row else 0

            profile["schools_profile"] = {
                "position": "School Registration Manager",  # Default position
                "rating": calculated_rating,
                "total_reviews": total_reviews,
                "badges": schools_row[0] or [],
                "schools_added": schools_added,
                "schools_verified": schools_verified,
                "schools_rejected": schools_rejected,
                "schools_suspended": schools_suspended,
                "schools_reactivated": schools_reactivated,
                "total_schools_processed": schools_verified + schools_rejected + schools_suspended,
                "permissions": {
                    "can_verify_schools": True,
                    "can_reject_schools": True,
                    "can_suspend_schools": True,
                    "can_view_analytics": True
                },
                "joined_date": schools_row[1].isoformat() if schools_row[1] else None,
                "created_at": schools_row[1].isoformat() if schools_row[1] else None,
                "has_profile": True
            }
        else:
            # Admin doesn't have manage_schools_profile - provide defaults based on their department
            is_system_admin = "manage-system-settings" in departments
            is_schools_admin = "manage-schools" in departments

            # Determine position and badges based on department
            if is_system_admin:
                position = "System Administrator (Viewing)"
                badges = [
                    {"text": "✔ System Administrator", "class": "verified"},
                    {"text": "Full Access", "class": "expert"}
                ]
                permissions = {
                    "can_verify_schools": True,
                    "can_reject_schools": True,
                    "can_suspend_schools": True,
                    "can_view_analytics": True,
                    "can_manage_notifications": True,
                    "system_admin": True
                }
            elif is_schools_admin:
                position = "School Registration Manager"
                badges = [
                    {"text": "🏫 School Management", "class": "school"}
                ]
                permissions = {
                    "can_verify_schools": True,
                    "can_reject_schools": True,
                    "can_suspend_schools": True,
                    "can_view_analytics": True
                }
            else:
                position = "Admin (View Only)"
                badges = []
                permissions = {
                    "can_view_analytics": True
                }

            profile["schools_profile"] = {
                "position": position,
                "rating": 0.0,
                "total_reviews": 0,
                "badges": badges,
                "schools_added": 0,
                "schools_verified": 0,
                "schools_rejected": 0,
                "schools_suspended": 0,
                "schools_reactivated": 0,
                "total_schools_processed": 0,
                "permissions": permissions,
                "joined_date": profile["created_at"],  # Use account creation date
                "created_at": None,
                "has_profile": False
            }

        return profile

    finally:
        cursor.close()
        conn.close()

class ManageSchoolsProfileUpdate(BaseModel):
    """Update model for manage_schools_profile"""
    # admin_profile fields
    first_name: Optional[str] = None
    father_name: Optional[str] = None
    grandfather_name: Optional[str] = None
    phone_number: Optional[str] = None  # Single string, will be converted to array
    # manage_schools_profile fields
    username: Optional[str] = None
    bio: Optional[str] = None
    quote: Optional[str] = None
    location: Optional[List[str]] = None  # Array of locations
    hero_title: Optional[List[str]] = None  # Array of hero titles
    hero_subtitle: Optional[str] = None
    languages: Optional[List[str]] = None  # Array of languages
    allow_location: Optional[bool] = None  # GPS location detection permission
    display_location: Optional[bool] = None  # Public location visibility

@router.put("/manage-schools-profile/{admin_id}")
async def update_manage_schools_profile(admin_id: int, profile_data: ManageSchoolsProfileUpdate):
    """
    Update admin profile and manage_schools_profile data
    Creates manage_schools_profile record if it doesn't exist
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if admin_profile exists
        cursor.execute("SELECT id FROM admin_profile WHERE id = %s", (admin_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # Update admin_profile fields (name, phone)
        admin_update_fields = []
        admin_update_values = []

        if profile_data.first_name is not None:
            admin_update_fields.append("first_name = %s")
            admin_update_values.append(profile_data.first_name)

        if profile_data.father_name is not None:
            admin_update_fields.append("father_name = %s")
            admin_update_values.append(profile_data.father_name)

        if profile_data.grandfather_name is not None:
            admin_update_fields.append("grandfather_name = %s")
            admin_update_values.append(profile_data.grandfather_name)

        if profile_data.phone_number is not None:
            # Convert single phone to array format
            admin_update_fields.append("phone_number = %s")
            admin_update_values.append([profile_data.phone_number] if profile_data.phone_number else [])

        # Update admin_profile if there are fields
        if admin_update_fields:
            admin_update_fields.append("updated_at = %s")
            admin_update_values.append(datetime.now())
            admin_update_values.append(admin_id)

            query = f"UPDATE admin_profile SET {', '.join(admin_update_fields)} WHERE id = %s"
            cursor.execute(query, tuple(admin_update_values))

        # Check if manage_schools_profile exists for this admin
        cursor.execute("SELECT id FROM manage_schools_profile WHERE admin_id = %s", (admin_id,))
        schools_profile_exists = cursor.fetchone()

        # Prepare manage_schools_profile fields (only existing DB columns)
        schools_fields = {}
        if profile_data.username is not None:
            schools_fields['username'] = profile_data.username
        if profile_data.bio is not None:
            schools_fields['bio'] = profile_data.bio
        if profile_data.quote is not None:
            schools_fields['quote'] = profile_data.quote
        if profile_data.hero_subtitle is not None:
            schools_fields['hero_subtitle'] = profile_data.hero_subtitle
        if profile_data.allow_location is not None:
            schools_fields['allow_location'] = profile_data.allow_location
        if profile_data.display_location is not None:
            schools_fields['display_location'] = profile_data.display_location

        # Handle JSONB array fields using psycopg Json adapter
        from psycopg.types.json import Json
        if profile_data.location is not None:
            schools_fields['location'] = Json(profile_data.location)
        if profile_data.hero_title is not None:
            schools_fields['hero_title'] = Json(profile_data.hero_title)
        if profile_data.languages is not None:
            schools_fields['languages'] = Json(profile_data.languages)

        if schools_fields:
            if schools_profile_exists:
                # Update existing record
                update_parts = [f"{k} = %s" for k in schools_fields.keys()]
                update_parts.append("updated_at = %s")
                values = list(schools_fields.values()) + [datetime.now(), admin_id]

                query = f"UPDATE manage_schools_profile SET {', '.join(update_parts)} WHERE admin_id = %s"
                cursor.execute(query, tuple(values))
            else:
                # Insert new record
                schools_fields['admin_id'] = admin_id
                schools_fields['created_at'] = datetime.now()
                schools_fields['updated_at'] = datetime.now()

                columns = ', '.join(schools_fields.keys())
                placeholders = ', '.join(['%s'] * len(schools_fields))
                values = list(schools_fields.values())

                query = f"INSERT INTO manage_schools_profile ({columns}) VALUES ({placeholders})"
                cursor.execute(query, tuple(values))

        conn.commit()

        # Return updated profile
        return await get_manage_schools_profile(admin_id)

    finally:
        cursor.close()
        conn.close()


# ============================================
# MANAGE CREDENTIALS PROFILE ENDPOINTS
# ============================================

@router.get("/manage-credentials-profile/by-email/{email}")
async def get_manage_credentials_profile_by_email(email: str):
    """
    Get admin profile by email for Manage Credentials page
    Used when admin logs in and we have their email but not ID

    NOTE: email is now a TEXT[] array - use ANY() for lookup
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get admin_id from email (email is now an array)
        cursor.execute("SELECT id FROM admin_profile WHERE %s = ANY(email)", (email,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail=f"Admin with email {email} not found")

        admin_id = result[0]

        # Call the main endpoint with the admin_id
        return await get_manage_credentials_profile(admin_id)

    finally:
        cursor.close()
        conn.close()


@router.get("/manage-credentials-profile/{admin_id}")
async def get_manage_credentials_profile(admin_id: int):
    """
    Get admin profile merged with manage_credentials_profile data for Manage Credentials page

    Supports cross-department access:
    - manage-credentials department: Full credentials management profile
    - manage-system-settings department: Viewing access with system admin badge
    - Other departments: Access denied

    NOTE: admin_profile has email, phone_number, departments as TEXT[] arrays
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get main profile from admin_profile (only columns that exist)
        cursor.execute("""
            SELECT id, first_name, father_name, grandfather_name, email, phone_number,
                   departments, created_at
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # email, phone_number, departments are arrays
        profile = {
            "id": row[0],
            "first_name": row[1],
            "father_name": row[2],
            "grandfather_name": row[3],
            "email": row[4] or [],  # TEXT[] array
            "phone_number": row[5] or [],  # TEXT[] array
            "departments": row[6] or [],  # TEXT[] array
            "created_at": row[7].isoformat() if row[7] else None,
            "username": None,
            "bio": None,
            "quote": None,
            "profile_picture": None,
            "cover_picture": None
        }

        departments = profile["departments"] or []

        # Check if admin has access to manage-credentials
        is_system_admin = "manage-system-settings" in departments
        is_credentials_admin = "manage-credentials" in departments

        if not is_system_admin and not is_credentials_admin:
            raise HTTPException(
                status_code=403,
                detail="Access denied. Only manage-credentials and manage-system-settings departments can access this page."
            )

        # Try to get all profile fields from manage_credentials_profile
        try:
            cursor.execute("""
                SELECT username, bio, quote, profile_image, cover_image,
                       hero_title, hero_subtitle, location, allow_location, display_location, languages
                FROM manage_credentials_profile
                WHERE admin_id = %s
            """, (admin_id,))
            credentials_profile_row = cursor.fetchone()
            if credentials_profile_row:
                profile["username"] = credentials_profile_row[0]
                profile["bio"] = credentials_profile_row[1]
                profile["quote"] = credentials_profile_row[2]
                profile["profile_picture"] = credentials_profile_row[3]
                profile["cover_picture"] = credentials_profile_row[4]
                profile["hero_title"] = credentials_profile_row[5] or []  # JSONB array
                profile["hero_subtitle"] = credentials_profile_row[6]
                profile["location"] = credentials_profile_row[7] or []  # JSONB array
                profile["allow_location"] = credentials_profile_row[8] if credentials_profile_row[8] is not None else False
                profile["display_location"] = credentials_profile_row[9] if credentials_profile_row[9] is not None else True
                profile["languages"] = credentials_profile_row[10] or []  # JSONB array
        except Exception as e:
            print(f"manage_credentials_profile table may not exist or missing columns: {e}")

        # Calculate rating from admin_reviews table
        cursor.execute("""
            SELECT
                COALESCE(AVG(rating), 0) as avg_rating,
                COUNT(*) as total_reviews
            FROM admin_reviews
            WHERE admin_id = %s
        """, (admin_id,))
        reviews_row = cursor.fetchone()
        calculated_rating = round(float(reviews_row[0]), 1) if reviews_row[0] else 0.0
        total_reviews = reviews_row[1] if reviews_row[1] else 0

        # Try to get manage_credentials_profile data (only existing columns)
        try:
            cursor.execute("""
                SELECT badges, created_at
                FROM manage_credentials_profile
                WHERE admin_id = %s
            """, (admin_id,))

            credentials_row = cursor.fetchone()
        except Exception as e:
            print(f"Error querying manage_credentials_profile: {e}")
            credentials_row = None

        # Get stats from admin_portfolio table
        cursor.execute("""
            SELECT credentials_verified, credentials_rejected, credentials_suspended, credentials_reactivated
            FROM admin_portfolio
            WHERE admin_id = %s
        """, (admin_id,))
        portfolio_row = cursor.fetchone()

        if credentials_row:
            # Admin has a manage_credentials_profile record
            credentials_verified = portfolio_row[0] if portfolio_row else 0
            credentials_rejected = portfolio_row[1] if portfolio_row else 0
            credentials_suspended = portfolio_row[2] if portfolio_row else 0
            credentials_reactivated = portfolio_row[3] if portfolio_row else 0
            total_processed = credentials_verified + credentials_rejected + credentials_suspended

            profile["credentials_profile"] = {
                "position": "Credentials Verification Specialist",  # Default position
                "rating": calculated_rating,
                "total_reviews": total_reviews,
                "badges": credentials_row[0] or [],
                "credentials_verified": credentials_verified,
                "credentials_rejected": credentials_rejected,
                "credentials_suspended": credentials_suspended,
                "credentials_reactivated": credentials_reactivated,
                "total_credentials_processed": total_processed,
                "avg_verification_time_hours": 24,  # Default value
                "verification_rate": round((credentials_verified / total_processed * 100), 1) if total_processed > 0 else 0.0,
                "permissions": {
                    "can_verify": True,
                    "can_reject": True,
                    "can_suspend": True,
                    "can_view_analytics": True
                },
                "joined_date": credentials_row[1].isoformat() if credentials_row[1] else None,
                "created_at": credentials_row[1].isoformat() if credentials_row[1] else None,
                "has_profile": True
            }
        else:
            # Admin doesn't have manage_credentials_profile - provide defaults based on their department
            if is_system_admin:
                position = "System Administrator (Viewing)"
                badges = [
                    {"text": "✔ System Administrator", "class": "verified"},
                    {"text": "Full Access", "class": "expert"}
                ]
                permissions = {
                    "can_verify": True,
                    "can_reject": True,
                    "can_suspend": True,
                    "can_view_analytics": True,
                    "can_manage_notifications": True,
                    "system_admin": True
                }
            else:  # is_credentials_admin
                position = "Credentials Verification Specialist"
                badges = [
                    {"text": "🎓 Credentials Management", "class": "school"}
                ]
                permissions = {
                    "can_verify": True,
                    "can_reject": True,
                    "can_suspend": True,
                    "can_view_analytics": True
                }

            profile["credentials_profile"] = {
                "position": position,
                "rating": 0.0,
                "total_reviews": 0,
                "badges": badges,
                "avg_verification_time_hours": 24,
                "permissions": permissions,
                "joined_date": profile["created_at"],
                "created_at": None,
                "has_profile": False
            }

        return profile

    finally:
        cursor.close()
        conn.close()


@router.put("/manage-credentials-profile/{admin_id}")
async def update_manage_credentials_profile(admin_id: int, profile_data: CredentialsProfileUpdate):
    """
    Update admin profile and manage_credentials_profile data for Manage Credentials page

    Updates:
    - admin_profile: first_name, father_name, grandfather_name, email, phone_number
    - manage_credentials_profile: username, bio, quote, hero_title, hero_subtitle, location, allow_location, display_location, languages
    """
    # Debug logging
    print(f"[DEBUG] Received profile update for admin_id: {admin_id}")
    print(f"[DEBUG] Profile data: {profile_data}")
    print(f"[DEBUG] hero_title: {profile_data.hero_title}")
    print(f"[DEBUG] hero_subtitle: {profile_data.hero_subtitle}")
    print(f"[DEBUG] location: {profile_data.location}")
    print(f"[DEBUG] bio: {profile_data.bio}")
    print(f"[DEBUG] allow_location: {profile_data.allow_location}")
    print(f"[DEBUG] display_location: {profile_data.display_location}")

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if profile exists
        cursor.execute("SELECT id FROM admin_profile WHERE id = %s", (admin_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # Update admin_profile fields
        admin_update_fields = []
        admin_update_values = []

        if profile_data.first_name is not None:
            admin_update_fields.append("first_name = %s")
            admin_update_values.append(profile_data.first_name)

        if profile_data.father_name is not None:
            admin_update_fields.append("father_name = %s")
            admin_update_values.append(profile_data.father_name)

        if profile_data.grandfather_name is not None:
            admin_update_fields.append("grandfather_name = %s")
            admin_update_values.append(profile_data.grandfather_name)

        if profile_data.email is not None:
            admin_update_fields.append("email = %s")
            admin_update_values.append(profile_data.email)

        if profile_data.phone_number is not None:
            admin_update_fields.append("phone_number = %s")
            admin_update_values.append(profile_data.phone_number)

        # Update admin_profile if there are fields to update
        if admin_update_fields:
            admin_update_fields.append("updated_at = %s")
            admin_update_values.append(datetime.now())
            admin_update_values.append(admin_id)

            query = f"UPDATE admin_profile SET {', '.join(admin_update_fields)} WHERE id = %s"
            cursor.execute(query, tuple(admin_update_values))

        # Update manage_credentials_profile fields
        credentials_update_fields = []
        credentials_update_values = []

        if profile_data.username is not None:
            credentials_update_fields.append("username = %s")
            credentials_update_values.append(profile_data.username)

        if profile_data.bio is not None:
            credentials_update_fields.append("bio = %s")
            credentials_update_values.append(profile_data.bio)

        if profile_data.quote is not None:
            credentials_update_fields.append("quote = %s")
            credentials_update_values.append(profile_data.quote)

        if profile_data.hero_title is not None:
            credentials_update_fields.append("hero_title = %s")
            credentials_update_values.append(Json(profile_data.hero_title))  # JSONB field

        if profile_data.hero_subtitle is not None:
            credentials_update_fields.append("hero_subtitle = %s")
            credentials_update_values.append(profile_data.hero_subtitle)

        if profile_data.location is not None:
            credentials_update_fields.append("location = %s")
            credentials_update_values.append(Json(profile_data.location))  # JSONB field

        if profile_data.allow_location is not None:
            credentials_update_fields.append("allow_location = %s")
            credentials_update_values.append(profile_data.allow_location)

        if profile_data.display_location is not None:
            credentials_update_fields.append("display_location = %s")
            credentials_update_values.append(profile_data.display_location)

        if profile_data.languages is not None:
            credentials_update_fields.append("languages = %s")
            credentials_update_values.append(Json(profile_data.languages))  # JSONB field

        # Update manage_credentials_profile if there are fields to update
        print(f"[DEBUG] credentials_update_fields: {credentials_update_fields}")
        print(f"[DEBUG] credentials_update_values: {credentials_update_values}")

        # Check if manage_credentials_profile record exists
        cursor.execute("SELECT id FROM manage_credentials_profile WHERE admin_id = %s", (admin_id,))
        credentials_record = cursor.fetchone()
        print(f"[DEBUG] credentials_record exists: {credentials_record is not None}")

        if credentials_record:
            # Update existing record if there are fields to update
            if credentials_update_fields:
                credentials_update_fields.append("updated_at = %s")
                credentials_update_values.append(datetime.now())
                credentials_update_values.append(admin_id)

                query = f"UPDATE manage_credentials_profile SET {', '.join(credentials_update_fields)} WHERE admin_id = %s"
                cursor.execute(query, tuple(credentials_update_values))
        else:
            # Insert new record with all provided fields
            cursor.execute("""
                INSERT INTO manage_credentials_profile (
                    admin_id, username, bio, quote, hero_title, hero_subtitle,
                    location, allow_location, display_location, languages, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                admin_id,
                profile_data.username or '',
                profile_data.bio or '',
                profile_data.quote or '',
                Json(profile_data.hero_title) if profile_data.hero_title else Json([]),
                profile_data.hero_subtitle or '',
                Json(profile_data.location) if profile_data.location else Json([]),
                profile_data.allow_location if profile_data.allow_location is not None else False,
                profile_data.display_location if profile_data.display_location is not None else True,
                Json(profile_data.languages) if profile_data.languages else Json([]),
                datetime.now(),
                datetime.now()
            ))

        conn.commit()
        print(f"[DEBUG] Successfully committed update for admin_id: {admin_id}")

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Error updating credentials profile: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")
    finally:
        cursor.close()
        conn.close()

    # Return updated profile (get fresh connection)
    print(f"[DEBUG] Fetching updated profile for admin_id: {admin_id}")
    return await get_manage_credentials_profile(admin_id)


# ========================================
# MANAGE ADMINS PROFILE ENDPOINTS
# ========================================

@router.get("/manage-admins-profile/by-email/{email}")
async def get_manage_admins_profile_by_email(email: str):
    """
    Get admin profile and manage_admins_profile data by email for Manage Admins page

    Returns combined data from:
    - admin_profile (id, name, email, phone_number, departments)
    - manage_admins_profile (username, bio, quote, badges)
    - admin_portfolio (admins_invited, admins_verified, admins_suspended, admins_removed stats)
    - admin_reviews (rating, total_reviews)
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get admin_id from email
        cursor.execute("SELECT id FROM admin_profile WHERE %s = ANY(email)", (email,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Admin not found with this email")

        admin_id = result[0]

        # Call the main function to get full profile
        return await get_manage_admins_profile(admin_id)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching admins profile by email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/manage-admins-profile/{admin_id}")
async def get_manage_admins_profile(admin_id: int):
    """
    Get admin profile and manage_admins_profile data for Manage Admins page

    Returns combined data from:
    - admin_profile (id, name, email, phone_number, departments)
    - manage_admins_profile (username, bio, quote, badges)
    - admin_portfolio (admins_invited, admins_verified, admins_suspended, admins_removed stats)
    - admin_reviews (rating, total_reviews)
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get basic admin info
        cursor.execute("""
            SELECT id, first_name, father_name, grandfather_name, email, phone_number, departments, created_at
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        admin_row = cursor.fetchone()

        if not admin_row:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        profile = {
            "id": admin_row[0],
            "first_name": admin_row[1],
            "father_name": admin_row[2],
            "grandfather_name": admin_row[3],
            "email": admin_row[4],
            "phone_number": admin_row[5],
            "departments": admin_row[6] or [],
            "created_at": admin_row[7].isoformat() if admin_row[7] else None
        }

        # Get manage_admins_profile data
        cursor.execute("""
            SELECT badges, created_at
            FROM manage_admins_profile
            WHERE admin_id = %s
        """, (admin_id,))

        admins_row = cursor.fetchone()

        # Get stats from admin_portfolio table
        cursor.execute("""
            SELECT admins_invited, admins_verified, admins_suspended, admins_removed,
                   admins_invited_ids, admins_verified_ids, admins_suspended_ids, admins_removed_ids,
                   admins_suspended_reasons, admins_removed_reasons
            FROM admin_portfolio
            WHERE admin_id = %s
        """, (admin_id,))
        portfolio_row = cursor.fetchone()

        # Get rating and reviews
        cursor.execute("""
            SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
            FROM admin_reviews
            WHERE admin_id = %s
        """, (admin_id,))
        review_row = cursor.fetchone()

        calculated_rating = float(review_row[0]) if review_row and review_row[0] else 0.0
        total_reviews = review_row[1] if review_row else 0

        if admins_row:
            # Extract stats from portfolio
            admins_invited = portfolio_row[0] if portfolio_row else 0
            admins_verified = portfolio_row[1] if portfolio_row else 0
            admins_suspended = portfolio_row[2] if portfolio_row else 0
            admins_removed = portfolio_row[3] if portfolio_row else 0
            admins_invited_ids = portfolio_row[4] if portfolio_row else []
            admins_verified_ids = portfolio_row[5] if portfolio_row else []
            admins_suspended_ids = portfolio_row[6] if portfolio_row else []
            admins_removed_ids = portfolio_row[7] if portfolio_row else []
            admins_suspended_reasons = portfolio_row[8] if portfolio_row else []
            admins_removed_reasons = portfolio_row[9] if portfolio_row else []

            profile["admins_profile"] = {
                "position": "Admin Manager",  # Default position
                "rating": round(calculated_rating, 1),
                "total_reviews": total_reviews,
                "badges": admins_row[0] or [],
                "admins_invited": admins_invited,
                "admins_verified": admins_verified,
                "admins_suspended": admins_suspended,
                "admins_removed": admins_removed,
                "admins_invited_ids": admins_invited_ids,
                "admins_verified_ids": admins_verified_ids,
                "admins_suspended_ids": admins_suspended_ids,
                "admins_removed_ids": admins_removed_ids,
                "admins_suspended_reasons": admins_suspended_reasons,
                "admins_removed_reasons": admins_removed_reasons,
                "created_at": admins_row[1].isoformat() if admins_row[1] else None
            }
        else:
            # No manage_admins_profile record exists - return defaults
            profile["admins_profile"] = {
                "position": "Admin Manager",
                "rating": 0.0,
                "total_reviews": 0,
                "badges": [],
                "admins_invited": 0,
                "admins_verified": 0,
                "admins_suspended": 0,
                "admins_removed": 0,
                "admins_invited_ids": [],
                "admins_verified_ids": [],
                "admins_suspended_ids": [],
                "admins_removed_ids": [],
                "admins_suspended_reasons": [],
                "admins_removed_reasons": [],
                "created_at": None
            }

        return profile

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching admins profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.put("/manage-admins-profile/{admin_id}")
async def update_manage_admins_profile(admin_id: int, profile_data: dict):
    """
    Update admin profile and manage_admins_profile data for Manage Admins page

    Updates:
    - admin_profile: first_name, father_name, grandfather_name, email, phone_number
    - manage_admins_profile: username, bio, quote
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if profile exists
        cursor.execute("SELECT id FROM admin_profile WHERE id = %s", (admin_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # Update admin_profile fields
        admin_update_fields = []
        admin_update_values = []

        if profile_data.get("first_name") is not None:
            admin_update_fields.append("first_name = %s")
            admin_update_values.append(profile_data["first_name"])

        if profile_data.get("father_name") is not None:
            admin_update_fields.append("father_name = %s")
            admin_update_values.append(profile_data["father_name"])

        if profile_data.get("grandfather_name") is not None:
            admin_update_fields.append("grandfather_name = %s")
            admin_update_values.append(profile_data["grandfather_name"])

        if profile_data.get("email") is not None:
            admin_update_fields.append("email = %s")
            admin_update_values.append(profile_data["email"])

        if profile_data.get("phone_number") is not None:
            admin_update_fields.append("phone_number = %s")
            admin_update_values.append(profile_data["phone_number"])

        # Update admin_profile if there are fields to update
        if admin_update_fields:
            admin_update_fields.append("updated_at = %s")
            admin_update_values.append(datetime.now())
            admin_update_values.append(admin_id)

            query = f"UPDATE admin_profile SET {', '.join(admin_update_fields)} WHERE id = %s"
            cursor.execute(query, tuple(admin_update_values))

        # Update manage_admins_profile fields
        admins_update_fields = []
        admins_update_values = []

        if profile_data.get("username") is not None:
            admins_update_fields.append("username = %s")
            admins_update_values.append(profile_data["username"])

        if profile_data.get("bio") is not None:
            admins_update_fields.append("bio = %s")
            admins_update_values.append(profile_data["bio"])

        if profile_data.get("quote") is not None:
            admins_update_fields.append("quote = %s")
            admins_update_values.append(profile_data["quote"])

        # Update manage_admins_profile if there are fields to update
        if admins_update_fields:
            # Check if manage_admins_profile record exists
            cursor.execute("SELECT id FROM manage_admins_profile WHERE admin_id = %s", (admin_id,))
            admins_record = cursor.fetchone()

            if admins_record:
                # Update existing record
                admins_update_fields.append("updated_at = %s")
                admins_update_values.append(datetime.now())
                admins_update_values.append(admin_id)

                query = f"UPDATE manage_admins_profile SET {', '.join(admins_update_fields)} WHERE admin_id = %s"
                cursor.execute(query, tuple(admins_update_values))
            else:
                # Insert new record with defaults
                cursor.execute("""
                    INSERT INTO manage_admins_profile (admin_id, username, bio, quote, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    admin_id,
                    profile_data.get("username", ""),
                    profile_data.get("bio", ""),
                    profile_data.get("quote", ""),
                    datetime.now(),
                    datetime.now()
                ))

        conn.commit()

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating admins profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")
    finally:
        cursor.close()
        conn.close()

    # Return updated profile (get fresh connection)
    return await get_manage_admins_profile(admin_id)