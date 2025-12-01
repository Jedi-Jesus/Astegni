"""
Unified Credentials Endpoints

A single endpoint system for all credential types across all user roles:
- Tutors: academic, achievement, experience
- Students: achievement, academic_certificate, extracurricular
- Parents, Admins, etc. can be extended

Features:
- Role-based access control
- Verification workflow (pending -> verified/rejected)
- Admin verification with rejection reasons
- Featured credential support
- Public view endpoints for profile pages

Note: This file manages the 'credentials' table (achievements, experience, certificates).
      For teaching/learning documents (PDFs, worksheets), use documents table.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os
from utils import get_current_user
from backblaze_service import BackblazeService

load_dotenv()
router = APIRouter()
DATABASE_URL = os.getenv('DATABASE_URL')

# Initialize Backblaze service
b2_service = BackblazeService()


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class CredentialResponse(BaseModel):
    """Universal credential response model (achievements, experience, certificates)"""
    id: int
    uploader_id: int
    uploader_role: str
    document_type: str
    title: str
    description: Optional[str] = None
    issued_by: Optional[str] = None
    date_of_issue: Optional[date] = None
    expiry_date: Optional[date] = None
    document_url: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    verification_status: str = 'pending'
    is_verified: bool = False
    verified_by_admin_id: Optional[int] = None
    rejection_reason: Optional[str] = None
    rejected_at: Optional[datetime] = None
    is_featured: bool = False

    class Config:
        from_attributes = True

# Alias for backward compatibility
DocumentResponse = CredentialResponse


class CredentialStats(BaseModel):
    """Credential statistics"""
    total_credentials: int
    by_type: dict

# Alias for backward compatibility
DocumentStats = CredentialStats


class CredentialVerificationUpdate(BaseModel):
    """Model for admin verification"""
    verification_status: str = Field(..., description="'verified' or 'rejected'")
    rejection_reason: Optional[str] = None

# Alias for backward compatibility
DocumentVerificationUpdate = CredentialVerificationUpdate


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_db_connection():
    """Get database connection with dict row factory"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def get_profile_id_for_role(user_id: int, role: str) -> Optional[int]:
    """Get profile ID for a specific role"""
    table_map = {
        'tutor': 'tutor_profiles',
        'student': 'student_profiles',
        'parent': 'parent_profiles',
        'advertiser': 'advertiser_profiles'
    }

    table = table_map.get(role)
    if not table:
        return None

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(f"SELECT id FROM {table} WHERE user_id = %s", (user_id,))
                result = cur.fetchone()
                return result['id'] if result else None
    except Exception as e:
        print(f"Error getting profile ID: {e}")
        return None


def validate_file_type(filename: str) -> bool:
    """Validate file type"""
    allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}
    file_ext = os.path.splitext(filename)[1].lower()
    return file_ext in allowed_extensions


def validate_file_size(file_size: int, max_size_mb: int = 10) -> bool:
    """Validate file size (default max 10MB)"""
    max_size_bytes = max_size_mb * 1024 * 1024
    return file_size <= max_size_bytes


def get_valid_document_types(role: str) -> List[str]:
    """Get valid document types for a role"""
    role_types = {
        'tutor': ['academic', 'achievement', 'experience'],
        'student': ['achievement', 'academic_certificate', 'extracurricular', 'certification'],
        'parent': ['achievement', 'certification'],
        'admin': ['certification', 'identification']
    }
    return role_types.get(role, ['achievement', 'certification'])


# ============================================================================
# AUTHENTICATED ENDPOINTS
# ============================================================================

@router.post("/api/documents/upload", response_model=DocumentResponse)
async def upload_document(
    document_type: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    issued_by: Optional[str] = Form(None),
    date_of_issue: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    is_featured: Optional[str] = Form("false"),
    uploader_role: Optional[str] = Form(None),  # Optional: auto-detect from active_role
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """
    Upload a document for any role

    - Auto-detects role from user's active_role if not specified
    - Validates document type for the role
    - Uploads file to Backblaze B2
    - Creates database record
    """
    try:
        print(f"\n🔍 DEBUG: Upload document endpoint called")
        print(f"   User ID: {current_user.id}")
        print(f"   User roles: {current_user.roles}")
        print(f"   Active role: {current_user.active_role}")

        # Determine the role to use
        role = uploader_role or current_user.active_role
        if role not in current_user.roles:
            raise HTTPException(
                status_code=403,
                detail=f"You don't have the '{role}' role"
            )

        # Get profile ID for the role
        profile_id = get_profile_id_for_role(current_user.id, role)
        if not profile_id:
            raise HTTPException(
                status_code=404,
                detail=f"{role.capitalize()} profile not found"
            )

        # Validate document type for the role
        valid_types = get_valid_document_types(role)
        if document_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid document type for {role}. Must be one of: {', '.join(valid_types)}"
            )

        # Validate file type
        if not validate_file_type(file.filename):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX"
            )

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Validate file size
        if not validate_file_size(file_size):
            raise HTTPException(
                status_code=400,
                detail="File size exceeds 10MB limit"
            )

        # Upload to Backblaze B2
        print(f"   Uploading to Backblaze B2...")
        file_upload_result = b2_service.upload_file(
            file_data=file_content,
            file_name=file.filename,
            file_type="files",
            user_id=profile_id
        )

        file_url = file_upload_result.get('url') if isinstance(file_upload_result, dict) else file_upload_result
        print(f"   File URL: {file_url}")

        # Parse dates
        issue_date = None
        if date_of_issue:
            try:
                issue_date = datetime.strptime(date_of_issue, '%Y-%m-%d').date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date_of_issue format. Use YYYY-MM-DD")

        exp_date = None
        if expiry_date and expiry_date.strip():
            try:
                exp_date = datetime.strptime(expiry_date, '%Y-%m-%d').date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid expiry_date format. Use YYYY-MM-DD")

        # Parse is_featured
        is_featured_bool = is_featured.lower() == "true" if is_featured else False

        # Insert into database
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO credentials (
                        uploader_id, uploader_role, document_type, title, description,
                        issued_by, date_of_issue, expiry_date, document_url, file_name,
                        file_type, file_size, is_featured
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    profile_id, role, document_type, title, description,
                    issued_by, issue_date, exp_date, file_url, file.filename,
                    file.content_type, file_size, is_featured_bool
                ))

                document = cur.fetchone()
                conn.commit()

        print(f"   ✅ Document created with ID: {document['id']}")
        return DocumentResponse(**document)

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error uploading document: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")


@router.get("/api/documents", response_model=List[DocumentResponse])
async def get_my_documents(
    document_type: Optional[str] = None,
    uploader_role: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Get documents for the current user

    - Optional filter by document_type
    - Optional filter by uploader_role (if user has multiple roles)
    - Returns documents sorted by created_at DESC
    """
    try:
        # Determine role to query
        role = uploader_role or current_user.active_role
        if role not in current_user.roles:
            raise HTTPException(status_code=403, detail=f"You don't have the '{role}' role")

        # Get profile ID
        profile_id = get_profile_id_for_role(current_user.id, role)
        if not profile_id:
            raise HTTPException(status_code=404, detail=f"{role.capitalize()} profile not found")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if document_type:
                    cur.execute("""
                        SELECT * FROM credentials
                        WHERE uploader_id = %s AND uploader_role = %s AND document_type = %s
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (profile_id, role, document_type))
                else:
                    cur.execute("""
                        SELECT * FROM credentials
                        WHERE uploader_id = %s AND uploader_role = %s
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (profile_id, role))

                documents = cur.fetchall()

        return [DocumentResponse(**doc) for doc in documents]

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching documents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")


@router.get("/api/documents/stats", response_model=DocumentStats)
async def get_document_stats(
    uploader_role: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Get document statistics for the current user"""
    try:
        role = uploader_role or current_user.active_role
        if role not in current_user.roles:
            raise HTTPException(status_code=403, detail=f"You don't have the '{role}' role")

        profile_id = get_profile_id_for_role(current_user.id, role)
        if not profile_id:
            raise HTTPException(status_code=404, detail=f"{role.capitalize()} profile not found")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        document_type,
                        COUNT(*) as count
                    FROM credentials
                    WHERE uploader_id = %s AND uploader_role = %s
                    GROUP BY document_type
                """, (profile_id, role))

                type_counts = cur.fetchall()

                cur.execute("""
                    SELECT COUNT(*) as total
                    FROM credentials
                    WHERE uploader_id = %s AND uploader_role = %s
                """, (profile_id, role))

                total = cur.fetchone()['total']

        by_type = {tc['document_type']: tc['count'] for tc in type_counts}

        return DocumentStats(total_documents=total, by_type=by_type)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.get("/api/documents/{document_id}", response_model=DocumentResponse)
async def get_document_by_id(
    document_id: int,
    current_user = Depends(get_current_user)
):
    """Get a specific document by ID (must belong to current user)"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM credentials WHERE id = %s", (document_id,))
                document = cur.fetchone()

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Verify ownership
        role = document['uploader_role']
        profile_id = get_profile_id_for_role(current_user.id, role)

        if document['uploader_id'] != profile_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this document")

        return DocumentResponse(**document)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch document: {str(e)}")


@router.put("/api/documents/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: int,
    document_type: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    issued_by: Optional[str] = Form(None),
    date_of_issue: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    is_featured: Optional[bool] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user = Depends(get_current_user)
):
    """
    Update a document

    - Can only update own documents
    - File upload is optional - only replaces if provided
    """
    try:
        # Get existing document
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM credentials WHERE id = %s", (document_id,))
                document = cur.fetchone()

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Verify ownership
        role = document['uploader_role']
        profile_id = get_profile_id_for_role(current_user.id, role)

        if document['uploader_id'] != profile_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this document")

        # Build update query
        update_fields = []
        update_values = []

        if document_type is not None:
            valid_types = get_valid_document_types(role)
            if document_type not in valid_types:
                raise HTTPException(status_code=400, detail=f"Invalid document type for {role}")
            update_fields.append("document_type = %s")
            update_values.append(document_type)

        if title is not None:
            update_fields.append("title = %s")
            update_values.append(title)

        if description is not None:
            update_fields.append("description = %s")
            update_values.append(description)

        if issued_by is not None:
            update_fields.append("issued_by = %s")
            update_values.append(issued_by)

        if date_of_issue is not None:
            try:
                parsed_date = datetime.strptime(date_of_issue, '%Y-%m-%d').date()
                update_fields.append("date_of_issue = %s")
                update_values.append(parsed_date)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date_of_issue format")

        if expiry_date is not None:
            if expiry_date.strip():
                try:
                    parsed_expiry = datetime.strptime(expiry_date, '%Y-%m-%d').date()
                    update_fields.append("expiry_date = %s")
                    update_values.append(parsed_expiry)
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid expiry_date format")
            else:
                update_fields.append("expiry_date = %s")
                update_values.append(None)

        if is_featured is not None:
            update_fields.append("is_featured = %s")
            update_values.append(is_featured)

        # Handle file upload
        if file and file.filename:
            if not validate_file_type(file.filename):
                raise HTTPException(status_code=400, detail="Invalid file type")

            file_content = await file.read()
            file_size = len(file_content)

            if not validate_file_size(file_size):
                raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

            file_upload_result = b2_service.upload_file(
                file_data=file_content,
                file_name=file.filename,
                file_type="files",
                user_id=profile_id
            )

            file_url = file_upload_result.get('url') if isinstance(file_upload_result, dict) else file_upload_result
            update_fields.append("document_url = %s")
            update_values.append(file_url)
            update_fields.append("file_name = %s")
            update_values.append(file.filename)
            update_fields.append("file_type = %s")
            update_values.append(file.content_type)
            update_fields.append("file_size = %s")
            update_values.append(file_size)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        update_values.append(document_id)

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(f"""
                    UPDATE credentials
                    SET {', '.join(update_fields)}
                    WHERE id = %s
                    RETURNING *
                """, update_values)

                updated_doc = cur.fetchone()
                conn.commit()

        return DocumentResponse(**updated_doc)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update document: {str(e)}")


@router.delete("/api/documents/{document_id}")
async def delete_document(
    document_id: int,
    current_user = Depends(get_current_user)
):
    """Delete a document (must belong to current user)"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM credentials WHERE id = %s", (document_id,))
                document = cur.fetchone()

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Verify ownership
        role = document['uploader_role']
        profile_id = get_profile_id_for_role(current_user.id, role)

        if document['uploader_id'] != profile_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this document")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM credentials WHERE id = %s", (document_id,))
                conn.commit()

        return {"message": "Document deleted successfully", "document_id": document_id}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


# ============================================================================
# PUBLIC VIEW ENDPOINTS (for profile pages)
# ============================================================================

@router.get("/api/view/{role}/{profile_id}/documents", response_model=List[DocumentResponse])
async def get_public_documents(
    role: str,
    profile_id: int,
    document_type: Optional[str] = None
):
    """
    PUBLIC endpoint to get documents for a profile

    Used by view-tutor.html, view-student.html, etc.
    No authentication required.

    Args:
        role: 'tutor', 'student', 'parent', etc.
        profile_id: The profile ID (e.g., tutor_profiles.id, student_profiles.id)
        document_type: Optional filter by document type
    """
    try:
        print(f"[VIEW DOCUMENTS] Getting {role} documents for profile_id: {profile_id}")

        valid_roles = ['tutor', 'student', 'parent', 'advertiser']
        if role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if document_type:
                    cur.execute("""
                        SELECT * FROM credentials
                        WHERE uploader_id = %s AND uploader_role = %s AND document_type = %s
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (profile_id, role, document_type))
                else:
                    cur.execute("""
                        SELECT * FROM credentials
                        WHERE uploader_id = %s AND uploader_role = %s
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (profile_id, role))

                documents = cur.fetchall()
                print(f"[VIEW DOCUMENTS] Found {len(documents)} documents")

        return [DocumentResponse(**doc) for doc in documents]

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching public documents: {e}")
        return []  # Return empty list on error for graceful handling


# Legacy endpoint for backward compatibility with view-student.html
@router.get("/api/view-student/{user_id}/documents", response_model=List[DocumentResponse])
async def get_view_student_documents_legacy(
    user_id: int,
    document_type: Optional[str] = None
):
    """
    Legacy endpoint for backward compatibility

    Converts user_id to profile_id and calls the new unified endpoint
    """
    try:
        profile_id = get_profile_id_for_role(user_id, 'student')
        if not profile_id:
            return []

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Map 'certification' to 'academic_certificate' for backward compatibility
                db_doc_type = 'academic_certificate' if document_type == 'certification' else document_type

                if db_doc_type:
                    cur.execute("""
                        SELECT * FROM credentials
                        WHERE uploader_id = %s AND uploader_role = 'student' AND document_type = %s
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (profile_id, db_doc_type))
                else:
                    cur.execute("""
                        SELECT * FROM credentials
                        WHERE uploader_id = %s AND uploader_role = 'student'
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (profile_id,))

                documents = cur.fetchall()

        return [DocumentResponse(**doc) for doc in documents]

    except Exception as e:
        print(f"Error in legacy endpoint: {e}")
        return []


# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@router.put("/api/admin/documents/{document_id}/verify", response_model=DocumentResponse)
async def verify_document(
    document_id: int,
    verification: DocumentVerificationUpdate,
    current_user = Depends(get_current_user)
):
    """
    Admin endpoint to verify or reject documents

    - Requires admin role
    - Sets verification_status to 'verified' or 'rejected'
    - Records admin_id and timestamp
    """
    try:
        if 'admin' not in current_user.roles:
            raise HTTPException(status_code=403, detail="Admin access required")

        if verification.verification_status not in ['verified', 'rejected']:
            raise HTTPException(status_code=400, detail="Status must be 'verified' or 'rejected'")

        if verification.verification_status == 'rejected' and not verification.rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason required when rejecting")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM credentials WHERE id = %s", (document_id,))
                document = cur.fetchone()

                if not document:
                    raise HTTPException(status_code=404, detail="Document not found")

                # Get admin profile ID
                cur.execute("SELECT id FROM admin_profile WHERE user_id = %s", (current_user.id,))
                admin_result = cur.fetchone()
                admin_id = admin_result['id'] if admin_result else current_user.id

                if verification.verification_status == 'verified':
                    cur.execute("""
                        UPDATE credentials
                        SET verification_status = 'verified',
                            is_verified = TRUE,
                            verified_by_admin_id = %s,
                            rejection_reason = NULL,
                            rejected_at = NULL,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                        RETURNING *
                    """, (admin_id, document_id))
                else:
                    cur.execute("""
                        UPDATE credentials
                        SET verification_status = 'rejected',
                            is_verified = FALSE,
                            verified_by_admin_id = %s,
                            rejection_reason = %s,
                            rejected_at = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                        RETURNING *
                    """, (admin_id, verification.rejection_reason, document_id))

                result = cur.fetchone()
                conn.commit()

        return DocumentResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error verifying document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to verify document: {str(e)}")


@router.get("/api/admin/documents/pending", response_model=List[DocumentResponse])
async def get_pending_documents(
    role: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Admin endpoint to get all pending documents for verification"""
    try:
        if 'admin' not in current_user.roles:
            raise HTTPException(status_code=403, detail="Admin access required")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if role:
                    cur.execute("""
                        SELECT * FROM credentials
                        WHERE verification_status = 'pending' AND uploader_role = %s
                        ORDER BY created_at ASC
                    """, (role,))
                else:
                    cur.execute("""
                        SELECT * FROM credentials
                        WHERE verification_status = 'pending'
                        ORDER BY created_at ASC
                    """)

                documents = cur.fetchall()

        return [DocumentResponse(**doc) for doc in documents]

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching pending documents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch pending documents: {str(e)}")


# ============================================================================
# TUTOR-SPECIFIC LEGACY ENDPOINTS (for backward compatibility)
# ============================================================================

@router.post("/api/tutor/documents/upload", response_model=DocumentResponse)
async def upload_tutor_document_legacy(
    document_type: str = Form(...),
    title: str = Form(...),
    issued_by: str = Form(...),
    date_of_issue: str = Form(...),
    description: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    is_featured: Optional[str] = Form("false"),
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Legacy endpoint for tutor document uploads - redirects to unified endpoint"""
    return await upload_document(
        document_type=document_type,
        title=title,
        description=description,
        issued_by=issued_by,
        date_of_issue=date_of_issue,
        expiry_date=expiry_date,
        is_featured=is_featured,
        uploader_role="tutor",
        file=file,
        current_user=current_user
    )


@router.get("/api/tutor/documents", response_model=List[DocumentResponse])
async def get_tutor_documents_legacy(
    document_type: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Legacy endpoint for tutor documents"""
    return await get_my_documents(
        document_type=document_type,
        uploader_role="tutor",
        current_user=current_user
    )


# ============================================================================
# STUDENT-SPECIFIC LEGACY ENDPOINTS (for backward compatibility)
# ============================================================================

@router.post("/api/student/documents/upload", response_model=DocumentResponse)
async def upload_student_document_legacy(
    document_type: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    issued_by: Optional[str] = Form(None),
    date_of_issue: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    is_featured: Optional[bool] = Form(False),
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Legacy endpoint for student document uploads"""
    return await upload_document(
        document_type=document_type,
        title=title,
        description=description,
        issued_by=issued_by,
        date_of_issue=date_of_issue,
        expiry_date=expiry_date,
        is_featured=str(is_featured).lower() if is_featured else "false",
        uploader_role="student",
        file=file,
        current_user=current_user
    )


@router.get("/api/student/documents", response_model=List[DocumentResponse])
async def get_student_documents_legacy(
    document_type: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Legacy endpoint for student documents"""
    return await get_my_documents(
        document_type=document_type,
        uploader_role="student",
        current_user=current_user
    )
