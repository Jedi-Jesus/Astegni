"""
Tutor Profile Extensions Endpoints
Handles certifications, achievements, experience, and videos for tutor profiles
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.security import OAuth2PasswordBearer
from typing import Optional, List
import psycopg
from datetime import datetime, date
import os
import json
import jwt
from jwt import PyJWTError
from dotenv import load_dotenv
from backblaze_service import get_backblaze_service

load_dotenv()

# Initialize Backblaze service
b2_service = get_backblaze_service()

router = APIRouter()

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Get config from environment
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ALGORITHM = "HS256"

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not found in environment variables")
    return psycopg.connect(database_url)

def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current authenticated user - returns dict with user data"""
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

        # Convert string back to int
        user_id = int(user_id_str)
    except (PyJWTError, ValueError, TypeError) as e:
        print(f"JWT decode error: {e}")
        raise credentials_exception
    except Exception as e:
        print(f"Unexpected error in get_current_user: {e}")
        raise credentials_exception

    # Fetch user from database
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT u.id, u.username, u.email, u.phone, u.roles, u.active_role,
                       u.first_name, u.father_name, u.grandfather_name, u.profile_picture,
                       tp.id as tutor_id
                FROM users u
                LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
                WHERE u.id = %s
            """, (user_id,))
            row = cur.fetchone()

            if not row:
                raise credentials_exception

            return {
                'id': row[0],
                'username': row[1],
                'email': row[2],
                'phone': row[3],
                'roles': row[4] or [],
                'active_role': row[5],
                'first_name': row[6],
                'father_name': row[7],
                'grandfather_name': row[8],
                'profile_picture': row[9],
                'tutor_id': row[10]
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error in get_current_user: {e}")
        raise credentials_exception
    finally:
        conn.close()

# ============================================
# CERTIFICATIONS ENDPOINTS
# ============================================

@router.get("/api/tutor/certifications")
async def get_tutor_certifications(current_user: dict = Depends(get_current_user)):
    """Get all certifications for the current tutor"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    id, name, description, issuing_organization,
                    credential_id, credential_url, issue_date, expiry_date,
                    certificate_type, field_of_study, certificate_image_url,
                    is_verified, is_active, created_at
                FROM tutor_certificates
                WHERE tutor_id = %s AND is_active = TRUE
                ORDER BY issue_date DESC NULLS LAST, created_at DESC
            """, (tutor_id,))

            certifications = []
            for row in cur.fetchall():
                certifications.append({
                    'id': row[0],
                    'name': row[1],
                    'description': row[2],
                    'issuing_organization': row[3],
                    'credential_id': row[4],
                    'credential_url': row[5],
                    'issue_date': row[6].isoformat() if row[6] else None,
                    'expiry_date': row[7].isoformat() if row[7] else None,
                    'certificate_type': row[8],
                    'field_of_study': row[9],
                    'certificate_image_url': row[10],
                    'is_verified': row[11],
                    'is_active': row[12],
                    'created_at': row[13].isoformat() if row[13] else None
                })

            return {'certifications': certifications}
    finally:
        conn.close()


@router.post("/api/tutor/certifications")
async def create_certification(
    name: str = Form(...),
    issuing_organization: str = Form(...),
    description: Optional[str] = Form(None),
    credential_id: Optional[str] = Form(None),
    credential_url: Optional[str] = Form(None),
    issue_date: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    certificate_type: Optional[str] = Form("certification"),
    field_of_study: Optional[str] = Form(None),
    certificate_image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Create a new certification for the current tutor"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # Handle file upload if provided
    certificate_image_url = None
    if certificate_image:
        # TODO: Upload to Backblaze B2
        # For now, save locally or use placeholder
        certificate_image_url = f"/uploads/certificates/user_{current_user['id']}/{certificate_image.filename}"

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO tutor_certificates (
                    tutor_id, name, description, issuing_organization,
                    credential_id, credential_url, issue_date, expiry_date,
                    certificate_type, field_of_study, certificate_image_url,
                    is_active, is_verified, verification_status, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, FALSE, 'pending', NOW(), NOW())
                RETURNING id, name, issuing_organization, issue_date, verification_status
            """, (
                tutor_id, name, description, issuing_organization,
                credential_id, credential_url,
                issue_date if issue_date else None,
                expiry_date if expiry_date else None,
                certificate_type, field_of_study, certificate_image_url
            ))

            result = cur.fetchone()
            conn.commit()

            return {
                'message': 'Certification added successfully',
                'certification': {
                    'id': result[0],
                    'name': result[1],
                    'issuing_organization': result[2],
                    'issue_date': result[3].isoformat() if result[3] else None,
                    'verification_status': result[4]
                }
            }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create certification: {str(e)}")
    finally:
        conn.close()


@router.delete("/api/tutor/certifications/{certification_id}")
async def delete_certification(
    certification_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a certification (soft delete)"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Verify ownership
            cur.execute("""
                SELECT id FROM tutor_certificates
                WHERE id = %s AND tutor_id = %s
            """, (certification_id, tutor_id))

            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Certification not found or unauthorized")

            # Soft delete
            cur.execute("""
                UPDATE tutor_certificates
                SET is_active = FALSE, updated_at = NOW()
                WHERE id = %s
            """, (certification_id,))

            conn.commit()
            return {'message': 'Certification deleted successfully'}
    finally:
        conn.close()


# ============================================
# ACHIEVEMENTS ENDPOINTS
# ============================================

@router.get("/api/tutor/achievements")
async def get_tutor_achievements(current_user: dict = Depends(get_current_user)):
    """Get all achievements for the current tutor"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    id, title, description, category, icon, color,
                    year, date_achieved, issuer, verification_url,
                    is_featured, display_order, created_at, certificate_url,
                    is_verified, verification_status, rejection_reason, verified_at
                FROM tutor_achievements
                WHERE tutor_id = %s
                ORDER BY is_featured DESC, date_achieved DESC NULLS LAST, display_order ASC
            """, (tutor_id,))

            achievements = []
            for row in cur.fetchall():
                achievements.append({
                    'id': row[0],
                    'title': row[1],
                    'description': row[2],
                    'category': row[3],
                    'icon': row[4],
                    'color': row[5],
                    'year': row[6],
                    'date_achieved': row[7].isoformat() if row[7] else None,
                    'issuer': row[8],
                    'verification_url': row[9],
                    'is_featured': row[10],
                    'display_order': row[11],
                    'created_at': row[12].isoformat() if row[12] else None,
                    'certificate_url': row[13],
                    'is_verified': row[14],
                    'verification_status': row[15],
                    'rejection_reason': row[16],
                    'verified_at': row[17].isoformat() if row[17] else None
                })

            return {'achievements': achievements}
    finally:
        conn.close()


@router.post("/api/tutor/achievements")
async def create_achievement(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form("achievement"),
    icon: Optional[str] = Form("🏆"),
    color: Optional[str] = Form("gold"),
    year: Optional[int] = Form(None),
    date_achieved: Optional[str] = Form(None),
    issuer: Optional[str] = Form(None),
    verification_url: Optional[str] = Form(None),
    is_featured: Optional[str] = Form(None),
    certificate_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Create a new achievement for the current tutor"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # Convert checkbox value to boolean
    is_featured_bool = is_featured == 'on' if is_featured else False

    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if certificate_file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: JPG, PNG, PDF. Got: {certificate_file.content_type}"
        )

    # Validate file size (5MB max)
    file_content = await certificate_file.read()
    file_size_mb = len(file_content) / (1024 * 1024)
    if file_size_mb > 5:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is 5MB. Your file is {file_size_mb:.2f}MB"
        )

    # Upload to Backblaze B2
    certificate_url = None
    try:
        upload_result = b2_service.upload_file(
            file_data=file_content,
            file_name=certificate_file.filename,
            file_type='documents/certificates',
            content_type=certificate_file.content_type,
            user_id=str(current_user['id'])
        )
        if upload_result:
            certificate_url = upload_result.get('url') or upload_result.get('downloadUrl')
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload certificate: {str(e)}"
        )

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO tutor_achievements (
                    tutor_id, title, description, category, icon, color,
                    year, date_achieved, issuer, verification_url, is_featured,
                    certificate_url, display_order, created_at, updated_at,
                    is_verified, verification_status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, NOW(), NOW(), FALSE, 'pending')
                RETURNING id, title, category, date_achieved, certificate_url, verification_status
            """, (
                tutor_id, title, description, category, icon, color,
                year, date_achieved if date_achieved else None,
                issuer, verification_url, is_featured_bool, certificate_url
            ))

            result = cur.fetchone()
            conn.commit()

            return {
                'message': 'Achievement added successfully and pending verification',
                'achievement': {
                    'id': result[0],
                    'title': result[1],
                    'category': result[2],
                    'date_achieved': result[3].isoformat() if result[3] else None,
                    'certificate_url': result[4],
                    'verification_status': result[5]
                }
            }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create achievement: {str(e)}")
    finally:
        conn.close()


@router.delete("/api/tutor/achievements/{achievement_id}")
async def delete_achievement(
    achievement_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete an achievement"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Verify ownership
            cur.execute("""
                SELECT id FROM tutor_achievements
                WHERE id = %s AND tutor_id = %s
            """, (achievement_id, tutor_id))

            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Achievement not found or unauthorized")

            # Delete
            cur.execute("""
                DELETE FROM tutor_achievements
                WHERE id = %s
            """, (achievement_id,))

            conn.commit()
            return {'message': 'Achievement deleted successfully'}
    finally:
        conn.close()


# ============================================
# EXPERIENCE ENDPOINTS
# ============================================

@router.get("/api/tutor/experience")
async def get_tutor_experience(current_user: dict = Depends(get_current_user)):
    """Get all experience entries for the current tutor"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    id, job_title, institution, location,
                    start_date, end_date, is_current,
                    duration_years, duration_months,
                    description, responsibilities, achievements,
                    employment_type, display_order, created_at, certificate_url
                FROM tutor_experience
                WHERE tutor_id = %s
                ORDER BY is_current DESC, start_date DESC
            """, (tutor_id,))

            experiences = []
            for row in cur.fetchall():
                experiences.append({
                    'id': row[0],
                    'job_title': row[1],
                    'institution': row[2],
                    'location': row[3],
                    'start_date': row[4].isoformat() if row[4] else None,
                    'end_date': row[5].isoformat() if row[5] else None,
                    'is_current': row[6],
                    'duration_years': row[7],
                    'duration_months': row[8],
                    'description': row[9],
                    'responsibilities': row[10],
                    'achievements': row[11],
                    'employment_type': row[12],
                    'display_order': row[13],
                    'created_at': row[14].isoformat() if row[14] else None,
                    'certificate_url': row[15]
                })

            return {'experience': experiences}
    finally:
        conn.close()


@router.post("/api/tutor/experience")
async def create_experience(
    job_title: str = Form(...),
    institution: str = Form(...),
    start_date: str = Form(...),
    location: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    is_current: bool = Form(False),
    description: Optional[str] = Form(None),
    responsibilities: Optional[str] = Form(None),
    achievements: Optional[str] = Form(None),
    employment_type: Optional[str] = Form("full-time"),
    certificate_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Create a new experience entry for the current tutor"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if certificate_file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: JPG, PNG, PDF. Got: {certificate_file.content_type}"
        )

    # Validate file size (5MB max)
    file_content = await certificate_file.read()
    file_size_mb = len(file_content) / (1024 * 1024)
    if file_size_mb > 5:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is 5MB. Your file is {file_size_mb:.2f}MB"
        )

    # Upload to Backblaze B2
    certificate_url = None
    try:
        upload_result = b2_service.upload_file(
            file_data=file_content,
            file_name=certificate_file.filename,
            file_type='documents/certificates',
            content_type=certificate_file.content_type,
            user_id=str(current_user['id'])
        )
        if upload_result:
            certificate_url = upload_result.get('url') or upload_result.get('downloadUrl')
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload certificate: {str(e)}"
        )

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO tutor_experience (
                    tutor_id, job_title, institution, location,
                    start_date, end_date, is_current,
                    description, responsibilities, achievements,
                    employment_type, certificate_url, is_verified, verification_status,
                    display_order, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, FALSE, 'pending', 0, NOW(), NOW())
                RETURNING id, job_title, institution, start_date, certificate_url, verification_status
            """, (
                tutor_id, job_title, institution, location,
                start_date, end_date if end_date and not is_current else None,
                is_current, description, responsibilities, achievements,
                employment_type, certificate_url
            ))

            result = cur.fetchone()
            conn.commit()

            return {
                'message': 'Experience added successfully',
                'experience': {
                    'id': result[0],
                    'job_title': result[1],
                    'institution': result[2],
                    'start_date': result[3].isoformat() if result[3] else None,
                    'certificate_url': result[4],
                    'verification_status': result[5]
                }
            }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create experience: {str(e)}")
    finally:
        conn.close()


@router.delete("/api/tutor/experience/{experience_id}")
async def delete_experience(
    experience_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete an experience entry"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Verify ownership
            cur.execute("""
                SELECT id FROM tutor_experience
                WHERE id = %s AND tutor_id = %s
            """, (experience_id, tutor_id))

            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Experience not found or unauthorized")

            # Delete
            cur.execute("""
                DELETE FROM tutor_experience
                WHERE id = %s
            """, (experience_id,))

            conn.commit()
            return {'message': 'Experience deleted successfully'}
    finally:
        conn.close()


# ============================================
# INDIVIDUAL GET AND UPDATE ENDPOINTS
# ============================================

# Individual Certification Endpoints
@router.get("/api/tutor/certifications/{certification_id}")
async def get_certification(
    certification_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a single certification by ID"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    id, name, description, issuing_organization,
                    credential_id, credential_url, issue_date, expiry_date,
                    certificate_type, field_of_study, certificate_image_url,
                    is_verified, is_active, created_at, verification_status
                FROM tutor_certificates
                WHERE id = %s AND tutor_id = %s
            """, (certification_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Certification not found")

            return {
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'issuing_organization': row[3],
                'credential_id': row[4],
                'credential_url': row[5],
                'issue_date': row[6].isoformat() if row[6] else None,
                'expiry_date': row[7].isoformat() if row[7] else None,
                'certificate_type': row[8],
                'field_of_study': row[9],
                'certificate_image_url': row[10],
                'is_verified': row[11],
                'is_active': row[12],
                'created_at': row[13].isoformat() if row[13] else None,
                'verification_status': row[14]
            }
    finally:
        conn.close()


@router.put("/api/tutor/certifications/{certification_id}")
async def update_certification(
    certification_id: int,
    name: str = Form(...),
    issuing_organization: str = Form(...),
    description: Optional[str] = Form(None),
    credential_id: Optional[str] = Form(None),
    credential_url: Optional[str] = Form(None),
    issue_date: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    certificate_type: Optional[str] = Form("certification"),
    field_of_study: Optional[str] = Form(None),
    certificate_image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Update a certification"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Verify ownership and get existing data
            cur.execute("""
                SELECT id, certificate_image_url FROM tutor_certificates
                WHERE id = %s AND tutor_id = %s
            """, (certification_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Certification not found or unauthorized")

            # Handle file upload if provided
            certificate_image_url = row[1]  # Keep existing if no new file
            if certificate_image and certificate_image.filename:
                # Delete old file from Backblaze if exists
                if certificate_image_url:
                    try:
                        b2_service.delete_file(certificate_image_url)
                    except Exception as e:
                        print(f"Warning: Could not delete old file: {e}")

                # Upload new file
                try:
                    file_data = await certificate_image.read()
                    certificate_image_url = b2_service.upload_file(
                        file_data,
                        certificate_image.filename,
                        'certifications',
                        current_user['id']
                    )
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

            # Update certification
            cur.execute("""
                UPDATE tutor_certificates
                SET name = %s, issuing_organization = %s, description = %s,
                    credential_id = %s, credential_url = %s, issue_date = %s,
                    expiry_date = %s, certificate_type = %s, field_of_study = %s,
                    certificate_image_url = %s, updated_at = NOW()
                WHERE id = %s
            """, (
                name, issuing_organization, description, credential_id, credential_url,
                issue_date if issue_date else None,
                expiry_date if expiry_date else None,
                certificate_type, field_of_study, certificate_image_url,
                certification_id
            ))

            conn.commit()
            return {'message': 'Certification updated successfully'}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update certification: {str(e)}")
    finally:
        conn.close()


# Individual Achievement Endpoints
@router.get("/api/tutor/achievements/{achievement_id}")
async def get_achievement(
    achievement_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a single achievement by ID"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    id, title, description, category, icon, color,
                    year, date_achieved, issuer, verification_url,
                    is_featured, display_order, created_at, certificate_url,
                    is_verified, verification_status, rejection_reason, verified_at
                FROM tutor_achievements
                WHERE id = %s AND tutor_id = %s
            """, (achievement_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Achievement not found")

            return {
                'id': row[0],
                'title': row[1],
                'description': row[2],
                'category': row[3],
                'icon': row[4],
                'color': row[5],
                'year': row[6],
                'date_achieved': row[7].isoformat() if row[7] else None,
                'issuer': row[8],
                'verification_url': row[9],
                'is_featured': row[10],
                'display_order': row[11],
                'created_at': row[12].isoformat() if row[12] else None,
                'certificate_url': row[13],
                'is_verified': row[14],
                'verification_status': row[15],
                'rejection_reason': row[16],
                'verified_at': row[17].isoformat() if row[17] else None
            }
    finally:
        conn.close()


@router.put("/api/tutor/achievements/{achievement_id}")
async def update_achievement(
    achievement_id: int,
    title: str = Form(...),
    category: str = Form(...),
    description: Optional[str] = Form(None),
    icon: Optional[str] = Form(None),
    year: Optional[int] = Form(None),
    issuer: Optional[str] = Form(None),
    verification_url: Optional[str] = Form(None),
    certificate: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Update an achievement"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Verify ownership and get existing data
            cur.execute("""
                SELECT id, certificate_url FROM tutor_achievements
                WHERE id = %s AND tutor_id = %s
            """, (achievement_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Achievement not found or unauthorized")

            # Handle file upload if provided
            certificate_url = row[1]  # Keep existing if no new file
            if certificate and certificate.filename:
                # Delete old file from Backblaze if exists
                if certificate_url:
                    try:
                        b2_service.delete_file(certificate_url)
                    except Exception as e:
                        print(f"Warning: Could not delete old file: {e}")

                # Upload new file
                try:
                    file_data = await certificate.read()
                    certificate_url = b2_service.upload_file(
                        file_data,
                        certificate.filename,
                        'achievements',
                        current_user['id']
                    )
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

            # Update achievement
            cur.execute("""
                UPDATE tutor_achievements
                SET title = %s, category = %s, description = %s, icon = %s,
                    year = %s, issuer = %s, verification_url = %s,
                    certificate_url = %s, updated_at = NOW()
                WHERE id = %s
            """, (
                title, category, description, icon, year, issuer,
                verification_url, certificate_url, achievement_id
            ))

            conn.commit()
            return {'message': 'Achievement updated successfully'}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update achievement: {str(e)}")
    finally:
        conn.close()


# Individual Experience Endpoints
@router.get("/api/tutor/experience/{experience_id}")
async def get_experience(
    experience_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a single experience by ID"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    id, job_title, institution, location, description,
                    responsibilities, achievements, start_date, end_date,
                    is_current, employment_type, certificate_url, is_verified,
                    verification_status, created_at
                FROM tutor_experience
                WHERE id = %s AND tutor_id = %s
            """, (experience_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Experience not found")

            return {
                'id': row[0],
                'job_title': row[1],
                'institution': row[2],
                'location': row[3],
                'description': row[4],
                'responsibilities': row[5],
                'achievements': row[6],
                'start_date': row[7].isoformat() if row[7] else None,
                'end_date': row[8].isoformat() if row[8] else None,
                'is_current': row[9],
                'employment_type': row[10],
                'certificate_url': row[11],
                'is_verified': row[12],
                'verification_status': row[13],
                'created_at': row[14].isoformat() if row[14] else None
            }
    finally:
        conn.close()


@router.put("/api/tutor/experience/{experience_id}")
async def update_experience(
    experience_id: int,
    job_title: str = Form(...),
    institution: str = Form(...),
    start_date: str = Form(...),
    location: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    responsibilities: Optional[str] = Form(None),
    achievements: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    is_current: bool = Form(False),
    employment_type: Optional[str] = Form(None),
    certificate: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Update an experience"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Verify ownership and get existing data
            cur.execute("""
                SELECT id, certificate_url FROM tutor_experience
                WHERE id = %s AND tutor_id = %s
            """, (experience_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Experience not found or unauthorized")

            # Handle file upload if provided
            certificate_url = row[1]  # Keep existing if no new file
            if certificate and certificate.filename:
                # Delete old file from Backblaze if exists
                if certificate_url:
                    try:
                        b2_service.delete_file(certificate_url)
                    except Exception as e:
                        print(f"Warning: Could not delete old file: {e}")

                # Upload new file
                try:
                    file_data = await certificate.read()
                    certificate_url = b2_service.upload_file(
                        file_data,
                        certificate.filename,
                        'experience_certificates',
                        current_user['id']
                    )
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

            # Update experience
            cur.execute("""
                UPDATE tutor_experience
                SET job_title = %s, institution = %s, location = %s, description = %s,
                    responsibilities = %s, achievements = %s, start_date = %s,
                    end_date = %s, is_current = %s, employment_type = %s,
                    certificate_url = %s, updated_at = NOW()
                WHERE id = %s
            """, (
                job_title, institution, location, description, responsibilities,
                achievements, start_date, end_date if not is_current else None,
                is_current, employment_type, certificate_url, experience_id
            ))

            conn.commit()
            return {'message': 'Experience updated successfully'}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update experience: {str(e)}")
    finally:
        conn.close()
