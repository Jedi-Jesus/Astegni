"""
Admin Management API Endpoints
Handles admin profile and management operations for manage-admins page

Tables:
- admin_profile (astegni_admin_db): Core admin data (name, email, phone, departments)
- manage_admins_profile (astegni_admin_db): Profile display data (username, bio, quote, images, badges)
- admin_reviews (astegni_admin_db): Admin reviews (rating, total_reviews calculated from here)
"""

import os
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
import psycopg
from psycopg.types.json import Json
from dotenv import load_dotenv
import jwt

# Load environment variables
load_dotenv()

# Create router
router = APIRouter(prefix="/api/admin/admins", tags=["admin-admins"])

# Database URLs
ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)
SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key_here')

# ============================================
# PYDANTIC MODELS
# ============================================

class AdminsProfileUpdate(BaseModel):
    """Update model for manage_admins_profile"""
    # admin_profile fields
    first_name: Optional[str] = None
    father_name: Optional[str] = None
    grandfather_name: Optional[str] = None
    phone_number: Optional[str] = None
    # manage_admins_profile fields
    username: Optional[str] = None
    bio: Optional[str] = None
    quote: Optional[str] = None
    location: Optional[List[str]] = None  # Array of locations
    hero_title: Optional[List[str]] = None  # Array of titles
    hero_subtitle: Optional[str] = None
    languages: Optional[List[str]] = None  # Array of languages
    allow_location: Optional[bool] = None  # GPS location detection permission
    display_location: Optional[bool] = None  # Public location visibility

# ============================================
# DATABASE CONNECTION HELPERS
# ============================================

def parse_database_url(database_url):
    """Parse database URL into connection parameters"""
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")

    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_part = host_db.split("/")
    db_name = db_part.split("?")[0]

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    return {
        "dbname": db_name,
        "user": user,
        "password": password,
        "host": host,
        "port": port
    }

def get_admin_db_connection():
    """Get admin database connection (astegni_admin_db)"""
    params = parse_database_url(ADMIN_DATABASE_URL)
    return psycopg.connect(**params)

def get_admin_id_from_token(authorization: str):
    """Extract admin_id from JWT token"""
    if not authorization or not authorization.startswith('Bearer '):
        return None

    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload.get('admin_id') or payload.get('user_id') or payload.get('sub')
    except:
        return None

# ============================================
# PROFILE ENDPOINTS
# ============================================

@router.get("/profile/{admin_id}")
async def get_admin_admins_profile(admin_id: int):
    """
    Get admin profile with admins profile data from astegni_admin_db

    - admin_profile: name, email, phone, departments
    - manage_admins_profile: username, bio, quote, location, images, badges
    - admin_reviews: rating and total_reviews calculated live
    """
    try:
        conn = get_admin_db_connection()
        cursor = conn.cursor()

        # Get admin_profile data
        cursor.execute("""
            SELECT id, email, first_name, father_name, grandfather_name,
                   phone_number, departments, created_at
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        admin_row = cursor.fetchone()
        if not admin_row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # Get manage_admins_profile data (with allow_location and display_location)
        cursor.execute("""
            SELECT id, username, bio, quote, location, cover_image, profile_image,
                   languages, hero_title, hero_subtitle, badges, created_at, updated_at,
                   allow_location, display_location
            FROM manage_admins_profile
            WHERE admin_id = %s
        """, (admin_id,))

        admins_profile_row = cursor.fetchone()

        # Get live rating stats from admin_reviews table
        cursor.execute("""
            SELECT COUNT(*) as total_reviews,
                   COALESCE(AVG(rating), 0) as average_rating
            FROM admin_reviews
            WHERE admin_id = %s
        """, (admin_id,))
        reviews_stats = cursor.fetchone()
        total_reviews = reviews_stats[0] or 0
        rating = round(float(reviews_stats[1]), 1) if reviews_stats[1] else 0.0

        cursor.close()
        conn.close()

        # Build response
        profile = {
            "id": admin_row[0],
            "email": admin_row[1] or [],
            "first_name": admin_row[2],
            "father_name": admin_row[3],
            "grandfather_name": admin_row[4],
            "phone_number": admin_row[5] or [],
            "departments": admin_row[6] if admin_row[6] else [],
            "created_at": admin_row[7].isoformat() if admin_row[7] else None,
            # From manage_admins_profile
            "username": admins_profile_row[1] if admins_profile_row else None,
            "bio": admins_profile_row[2] if admins_profile_row else None,
            "quote": admins_profile_row[3] if admins_profile_row else None,
            "location": admins_profile_row[4] if admins_profile_row else None,
            "cover_picture": admins_profile_row[5] if admins_profile_row else None,
            "profile_picture": admins_profile_row[6] if admins_profile_row else None,
            "languages": admins_profile_row[7] if admins_profile_row else [],
            "hero_title": admins_profile_row[8] if admins_profile_row else None,
            "hero_subtitle": admins_profile_row[9] if admins_profile_row else None,
            "badges": admins_profile_row[10] if admins_profile_row else [],
            "allow_location": admins_profile_row[13] if admins_profile_row else False,
            "display_location": admins_profile_row[14] if admins_profile_row and len(admins_profile_row) > 14 else True,
            # From admin_reviews (live calculation)
            "rating": rating,
            "total_reviews": total_reviews
        }

        return profile

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch admin profile: {str(e)}")

@router.get("/profile/by-email/{email}")
async def get_admin_admins_profile_by_email(email: str):
    """
    Get admin profile with admins profile data by email from astegni_admin_db
    """
    try:
        conn = get_admin_db_connection()
        cursor = conn.cursor()

        # Get admin_profile data by email (email is an array)
        cursor.execute("""
            SELECT id, email, first_name, father_name, grandfather_name,
                   phone_number, departments, created_at
            FROM admin_profile
            WHERE %s = ANY(email)
        """, (email,))

        admin_row = cursor.fetchone()
        if not admin_row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Admin profile not found")

        admin_id = admin_row[0]

        # Get manage_admins_profile data (with allow_location and display_location)
        cursor.execute("""
            SELECT id, username, bio, quote, location, cover_image, profile_image,
                   languages, hero_title, hero_subtitle, badges, created_at, updated_at,
                   allow_location, display_location
            FROM manage_admins_profile
            WHERE admin_id = %s
        """, (admin_id,))

        admins_profile_row = cursor.fetchone()

        # Get live rating stats from admin_reviews table
        cursor.execute("""
            SELECT COUNT(*) as total_reviews,
                   COALESCE(AVG(rating), 0) as average_rating
            FROM admin_reviews
            WHERE admin_id = %s
        """, (admin_id,))
        reviews_stats = cursor.fetchone()
        total_reviews = reviews_stats[0] or 0
        rating = round(float(reviews_stats[1]), 1) if reviews_stats[1] else 0.0

        cursor.close()
        conn.close()

        # Build response
        profile = {
            "id": admin_row[0],
            "email": admin_row[1] or [],
            "first_name": admin_row[2],
            "father_name": admin_row[3],
            "grandfather_name": admin_row[4],
            "phone_number": admin_row[5] or [],
            "departments": admin_row[6] if admin_row[6] else [],
            "created_at": admin_row[7].isoformat() if admin_row[7] else None,
            # From manage_admins_profile
            "username": admins_profile_row[1] if admins_profile_row else None,
            "bio": admins_profile_row[2] if admins_profile_row else None,
            "quote": admins_profile_row[3] if admins_profile_row else None,
            "location": admins_profile_row[4] if admins_profile_row else None,
            "cover_picture": admins_profile_row[5] if admins_profile_row else None,
            "profile_picture": admins_profile_row[6] if admins_profile_row else None,
            "languages": admins_profile_row[7] if admins_profile_row else [],
            "hero_title": admins_profile_row[8] if admins_profile_row else None,
            "hero_subtitle": admins_profile_row[9] if admins_profile_row else None,
            "badges": admins_profile_row[10] if admins_profile_row else [],
            "allow_location": admins_profile_row[13] if admins_profile_row else False,
            "display_location": admins_profile_row[14] if admins_profile_row and len(admins_profile_row) > 14 else True,
            # From admin_reviews (live calculation)
            "rating": rating,
            "total_reviews": total_reviews
        }

        return profile

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch admin profile by email: {str(e)}")

@router.put("/profile/update")
async def update_admin_admins_profile(profile_data: AdminsProfileUpdate, authorization: str = Header(None)):
    """
    Update admin profile and manage_admins_profile data
    Creates manage_admins_profile record if it doesn't exist
    """
    admin_id = get_admin_id_from_token(authorization)
    if not admin_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    conn = get_admin_db_connection()
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
            admin_update_fields.append("phone_number = %s")
            admin_update_values.append([profile_data.phone_number] if profile_data.phone_number else [])

        if admin_update_fields:
            admin_update_fields.append("updated_at = %s")
            admin_update_values.append(datetime.now())
            admin_update_values.append(admin_id)
            query = f"UPDATE admin_profile SET {', '.join(admin_update_fields)} WHERE id = %s"
            cursor.execute(query, tuple(admin_update_values))

        # Check if manage_admins_profile exists
        cursor.execute("SELECT id FROM manage_admins_profile WHERE admin_id = %s", (admin_id,))
        profile_exists = cursor.fetchone()

        # Prepare manage_admins_profile fields
        profile_fields = {}
        if profile_data.username is not None:
            profile_fields['username'] = profile_data.username
        if profile_data.bio is not None:
            profile_fields['bio'] = profile_data.bio
        if profile_data.quote is not None:
            profile_fields['quote'] = profile_data.quote
        if profile_data.location is not None:
            profile_fields['location'] = Json(profile_data.location)  # JSONB array
        if profile_data.hero_title is not None:
            profile_fields['hero_title'] = Json(profile_data.hero_title)  # JSONB array
        if profile_data.hero_subtitle is not None:
            profile_fields['hero_subtitle'] = profile_data.hero_subtitle
        if profile_data.languages is not None:
            profile_fields['languages'] = Json(profile_data.languages)  # JSONB array
        if profile_data.allow_location is not None:
            profile_fields['allow_location'] = profile_data.allow_location
        if profile_data.display_location is not None:
            profile_fields['display_location'] = profile_data.display_location

        if profile_fields:
            if profile_exists:
                update_parts = [f"{k} = %s" for k in profile_fields.keys()]
                update_parts.append("updated_at = %s")
                values = list(profile_fields.values()) + [datetime.now(), admin_id]
                query = f"UPDATE manage_admins_profile SET {', '.join(update_parts)} WHERE admin_id = %s"
                cursor.execute(query, tuple(values))
            else:
                profile_fields['admin_id'] = admin_id
                profile_fields['created_at'] = datetime.now()
                profile_fields['updated_at'] = datetime.now()
                columns = ', '.join(profile_fields.keys())
                placeholders = ', '.join(['%s'] * len(profile_fields))
                values = list(profile_fields.values())
                query = f"INSERT INTO manage_admins_profile ({columns}) VALUES ({placeholders})"
                cursor.execute(query, tuple(values))

        conn.commit()
        cursor.close()
        conn.close()

        return await get_admin_admins_profile(admin_id)

    except HTTPException:
        raise
    except Exception as e:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

# ============================================
# REVIEWS ENDPOINTS
# ============================================

@router.get("/reviews/{admin_id}")
async def get_admin_reviews(admin_id: int, limit: int = 10):
    """Get admin reviews from admin_reviews table"""
    try:
        conn = get_admin_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, review_id, admin_id, admin_name, reviewer_name, reviewer_role,
                   rating, response_time_rating, accuracy_rating, comment, review_type,
                   related_course_id, metrics, created_at, department
            FROM admin_reviews
            WHERE admin_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (admin_id, limit))

        reviews = []
        for row in cursor.fetchall():
            reviews.append({
                "id": row[0],
                "review_id": row[1],
                "admin_id": row[2],
                "admin_name": row[3],
                "reviewer_name": row[4],
                "reviewer_role": row[5],
                "rating": float(row[6]) if row[6] else 0.0,
                "response_time_rating": float(row[7]) if row[7] else None,
                "accuracy_rating": float(row[8]) if row[8] else None,
                "comment": row[9],
                "review_type": row[10],
                "related_course_id": row[11],
                "metrics": row[12] if row[12] else {},
                "created_at": row[13].isoformat() if row[13] else None,
                "department": row[14]
            })

        cursor.close()
        conn.close()

        return {"reviews": reviews, "count": len(reviews)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch admin reviews: {str(e)}")

@router.get("/reviews/by-email/{email}")
async def get_admin_reviews_by_email(email: str, limit: int = 10):
    """Get admin reviews by email from admin_reviews table"""
    try:
        conn = get_admin_db_connection()
        cursor = conn.cursor()

        # Get admin_id from email
        cursor.execute("SELECT id FROM admin_profile WHERE %s = ANY(email)", (email,))
        result = cursor.fetchone()

        if not result:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail=f"Admin with email {email} not found")

        admin_id = result[0]

        cursor.execute("""
            SELECT id, review_id, admin_id, admin_name, reviewer_name, reviewer_role,
                   rating, response_time_rating, accuracy_rating, comment, review_type,
                   related_course_id, metrics, created_at, department
            FROM admin_reviews
            WHERE admin_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (admin_id, limit))

        reviews = []
        for row in cursor.fetchall():
            reviews.append({
                "id": row[0],
                "review_id": row[1],
                "admin_id": row[2],
                "admin_name": row[3],
                "reviewer_name": row[4],
                "reviewer_role": row[5],
                "rating": float(row[6]) if row[6] else 0.0,
                "response_time_rating": float(row[7]) if row[7] else None,
                "accuracy_rating": float(row[8]) if row[8] else None,
                "comment": row[9],
                "review_type": row[10],
                "related_course_id": row[11],
                "metrics": row[12] if row[12] else {},
                "created_at": row[13].isoformat() if row[13] else None,
                "department": row[14]
            })

        cursor.close()
        conn.close()

        return {"reviews": reviews, "count": len(reviews)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch admin reviews: {str(e)}")

@router.get("/reviews/stats/{admin_id}")
async def get_admin_review_stats(admin_id: int):
    """Get admin review statistics from admin_reviews table"""
    try:
        conn = get_admin_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                COUNT(*) as total_reviews,
                COALESCE(AVG(rating), 0) as average_rating,
                COALESCE(AVG(response_time_rating), 0) as avg_response_time,
                COALESCE(AVG(accuracy_rating), 0) as avg_accuracy
            FROM admin_reviews
            WHERE admin_id = %s
        """, (admin_id,))

        row = cursor.fetchone()
        cursor.close()
        conn.close()

        return {
            "total_reviews": row[0] or 0,
            "average_rating": round(float(row[1]), 1) if row[1] else 0.0,
            "avg_response_time": round(float(row[2]), 1) if row[2] else 0.0,
            "avg_accuracy": round(float(row[3]), 1) if row[3] else 0.0
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch review stats: {str(e)}")

# ============================================
# PROFILE PICTURE UPLOAD ENDPOINTS
# ============================================

@router.post("/profile/upload-picture")
async def upload_profile_picture(authorization: str = Header(None)):
    """Upload profile picture for admin"""
    admin_id = get_admin_id_from_token(authorization)
    if not admin_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    # TODO: Implement actual file upload with Backblaze B2
    return {"message": "Profile picture upload endpoint - implement with file upload"}

@router.post("/profile/upload-cover")
async def upload_cover_picture(authorization: str = Header(None)):
    """Upload cover picture for admin"""
    admin_id = get_admin_id_from_token(authorization)
    if not admin_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    # TODO: Implement actual file upload with Backblaze B2
    return {"message": "Cover picture upload endpoint - implement with file upload"}

# ============================================
# ADMIN STATS ENDPOINTS
# ============================================

@router.get("/stats")
async def get_admin_stats():
    """Get admin statistics for dashboard"""
    try:
        conn = get_admin_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM admin_profile")
        total_admins = cursor.fetchone()[0] or 0

        cursor.execute("""
            SELECT unnest(departments) as dept, COUNT(*) as count
            FROM admin_profile
            WHERE departments IS NOT NULL
            GROUP BY dept
        """)
        dept_counts = {}
        for row in cursor.fetchall():
            dept_counts[row[0]] = row[1]

        cursor.close()
        conn.close()

        return {
            "total_admins": total_admins,
            "active_admins": total_admins,
            "pending_invitations": 0,
            "suspended_admins": 0,
            "by_department": dept_counts
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch admin stats: {str(e)}")
