"""
Tutor Credentials Endpoints

Credential management system for tutors:
- Upload academic certificates, achievements, and experience documents
- Verification workflow (pending -> verified/rejected)
- Admin verification with rejection reasons
- Featured credential support

NOTE: This uses the 'credentials' table (renamed from 'documents')
      The 'documents' table now stores teaching/learning materials (PDFs, worksheets)
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
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

class TutorDocumentCreate(BaseModel):
    """Model for creating a new tutor document"""
    document_type: str = Field(..., description="Type: 'academic', 'achievement', or 'experience'")
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    issued_by: str = Field(..., max_length=255)
    date_of_issue: date
    expiry_date: Optional[date] = None


class TutorDocumentUpdate(BaseModel):
    """Model for updating tutor document"""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    issued_by: Optional[str] = Field(None, max_length=255)
    date_of_issue: Optional[date] = None
    expiry_date: Optional[date] = None


class TutorDocumentResponse(BaseModel):
    """Model for tutor document response - maps from unified documents table"""
    id: int
    tutor_id: int  # This is actually uploader_id from documents table
    document_type: str
    title: str
    description: Optional[str] = None
    issued_by: Optional[str] = None
    date_of_issue: Optional[date] = None
    expiry_date: Optional[date] = None
    document_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    verification_status: str = 'pending'
    is_verified: bool = False
    verified_by_admin_id: Optional[int] = None
    rejection_reason: Optional[str] = None
    rejected_at: Optional[datetime] = None
    is_featured: bool = False


class DocumentVerificationUpdate(BaseModel):
    """Model for admin verification"""
    verification_status: str = Field(..., description="'verified' or 'rejected'")
    rejection_reason: Optional[str] = None


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_db_connection():
    """Get database connection with dict row factory"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def get_tutor_id_from_user(user_id: int) -> Optional[int]:
    """Get tutor profile id from user_id via tutor_profiles table"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (user_id,))
                result = cursor.fetchone()
                return result['id'] if result else None
    except Exception as e:
        print(f"Error getting tutor_id: {e}")
        return None


def get_document_by_id(document_id: int) -> Optional[dict]:
    """Get document by ID from unified documents table"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT id, uploader_id, uploader_role, document_type, title, description,
                           issued_by, date_of_issue, expiry_date, document_url, file_name,
                           file_type, file_size, created_at, updated_at,
                           verification_status, is_verified, verified_by_admin_id,
                           rejection_reason, rejected_at, is_featured
                    FROM credentials
                    WHERE id = %s AND uploader_role = 'tutor'
                """, (document_id,))
                result = cursor.fetchone()

                if result:
                    # Map to response format (tutor_id = uploader_id for compatibility)
                    return {
                        'id': result['id'],
                        'tutor_id': result['uploader_id'],
                        'document_type': result['document_type'],
                        'title': result['title'],
                        'description': result['description'],
                        'issued_by': result['issued_by'],
                        'date_of_issue': result['date_of_issue'],
                        'expiry_date': result['expiry_date'],
                        'document_url': result['document_url'],
                        'created_at': result['created_at'],
                        'updated_at': result['updated_at'],
                        'verification_status': result['verification_status'] or 'pending',
                        'is_verified': result['is_verified'] or False,
                        'verified_by_admin_id': result['verified_by_admin_id'],
                        'rejection_reason': result['rejection_reason'],
                        'rejected_at': result['rejected_at'],
                        'is_featured': result['is_featured'] or False
                    }
                return None
    except Exception as e:
        print(f"Error getting document: {e}")
        return None


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/api/tutor/documents/upload", response_model=TutorDocumentResponse)
async def upload_tutor_document(
    document_type: str = Form(...),
    title: str = Form(...),
    issued_by: str = Form(...),
    date_of_issue: str = Form(...),
    description: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    is_featured: Optional[str] = Form("false"),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a new tutor document (academic certificate, achievement, or experience)

    - Validates document type
    - Uploads file to Backblaze B2
    - Creates database record in unified 'documents' table with pending verification status
    - Returns document details
    """
    try:
        print(f"\n🔍 DEBUG: Upload tutor document endpoint called")
        print(f"   Document type: {document_type}")
        print(f"   Title: {title}")
        print(f"   Current user ID: {current_user.id}")

        # Validate document type
        if document_type not in ['academic', 'achievement', 'experience']:
            raise HTTPException(status_code=400, detail="Invalid document type. Must be 'academic', 'achievement', or 'experience'")

        # Get tutor profile id
        print(f"   Getting tutor_id for user_id: {current_user.id}")
        tutor_id = get_tutor_id_from_user(current_user.id)
        print(f"   Found tutor_id: {tutor_id}")
        if not tutor_id:
            raise HTTPException(status_code=404, detail="Tutor profile not found")

        # Validate file type
        allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX")

        # Upload file to Backblaze B2
        print(f"   Reading file: {file.filename}")
        file_content = await file.read()
        file_size = len(file_content)
        print(f"   File size: {file_size} bytes")

        # Validate file size (10MB limit)
        if file_size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

        print(f"   Uploading to Backblaze...")
        file_upload_result = b2_service.upload_file(
            file_data=file_content,
            file_name=file.filename,
            file_type="files",
            user_id=tutor_id
        )
        print(f"   File upload result: {file_upload_result}")

        # Extract URL from the result dictionary
        file_url = file_upload_result.get('url') if isinstance(file_upload_result, dict) else file_upload_result
        print(f"   Extracted file URL: {file_url}")

        # Parse dates
        print(f"   Parsing dates...")
        issue_date = datetime.strptime(date_of_issue, "%Y-%m-%d").date()
        exp_date = datetime.strptime(expiry_date, "%Y-%m-%d").date() if expiry_date and expiry_date.strip() else None
        print(f"   Issue date: {issue_date}, Expiry: {exp_date}")

        # Parse is_featured (convert string to boolean)
        is_featured_bool = is_featured.lower() == "true" if is_featured else False
        print(f"   Is featured: {is_featured_bool}")

        # Insert into unified documents table
        print(f"   Inserting into documents table...")
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO credentials (
                        uploader_id, uploader_role, document_type, title, description,
                        issued_by, date_of_issue, expiry_date, document_url, file_name,
                        file_type, file_size, verification_status, is_verified, is_featured
                    ) VALUES (%s, 'tutor', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', FALSE, %s)
                    RETURNING id, uploader_id, document_type, title, description, issued_by,
                              date_of_issue, expiry_date, document_url, created_at, updated_at,
                              verification_status, is_verified, verified_by_admin_id,
                              rejection_reason, rejected_at, is_featured
                """, (tutor_id, document_type, title, description, issued_by, issue_date, exp_date,
                      file_url, file.filename, file.content_type, file_size, is_featured_bool))

                result = cursor.fetchone()
                print(f"   ✅ Document inserted with ID: {result['id']}")
                conn.commit()

        return TutorDocumentResponse(
            id=result['id'],
            tutor_id=result['uploader_id'],  # Map uploader_id to tutor_id for compatibility
            document_type=result['document_type'],
            title=result['title'],
            description=result['description'],
            issued_by=result['issued_by'],
            date_of_issue=result['date_of_issue'],
            expiry_date=result['expiry_date'],
            document_url=result['document_url'],
            created_at=result['created_at'],
            updated_at=result['updated_at'],
            verification_status=result['verification_status'],
            is_verified=result['is_verified'],
            verified_by_admin_id=result['verified_by_admin_id'],
            rejection_reason=result['rejection_reason'],
            rejected_at=result['rejected_at'],
            is_featured=result['is_featured']
        )

    except HTTPException as he:
        print(f"❌ HTTP Exception: {he.status_code} - {he.detail}")
        raise
    except Exception as e:
        print(f"❌ ERROR uploading tutor document: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")


@router.get("/api/tutor/documents", response_model=List[TutorDocumentResponse])
async def get_tutor_documents(
    document_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all documents for the current tutor from unified documents table

    - Optional filter by document_type ('academic', 'achievement', 'experience')
    - Returns list of documents sorted by date_of_issue DESC, then created_at DESC
    """
    try:
        tutor_id = get_tutor_id_from_user(current_user.id)
        if not tutor_id:
            raise HTTPException(status_code=404, detail="Tutor profile not found")

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                if document_type:
                    if document_type not in ['academic', 'achievement', 'experience']:
                        raise HTTPException(status_code=400, detail="Invalid document type")

                    cursor.execute("""
                        SELECT id, uploader_id, document_type, title, description, issued_by,
                               date_of_issue, expiry_date, document_url, created_at, updated_at,
                               verification_status, is_verified, verified_by_admin_id,
                               rejection_reason, rejected_at, is_featured
                        FROM credentials
                        WHERE uploader_id = %s AND uploader_role = 'tutor' AND document_type = %s
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (tutor_id, document_type))
                else:
                    cursor.execute("""
                        SELECT id, uploader_id, document_type, title, description, issued_by,
                               date_of_issue, expiry_date, document_url, created_at, updated_at,
                               verification_status, is_verified, verified_by_admin_id,
                               rejection_reason, rejected_at, is_featured
                        FROM credentials
                        WHERE uploader_id = %s AND uploader_role = 'tutor'
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (tutor_id,))

                results = cursor.fetchall()

        documents = []
        for row in results:
            documents.append(TutorDocumentResponse(
                id=row['id'],
                tutor_id=row['uploader_id'],  # Map uploader_id to tutor_id
                document_type=row['document_type'],
                title=row['title'],
                description=row['description'],
                issued_by=row['issued_by'],
                date_of_issue=row['date_of_issue'],
                expiry_date=row['expiry_date'],
                document_url=row['document_url'],
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                verification_status=row['verification_status'] or 'pending',
                is_verified=row['is_verified'] or False,
                verified_by_admin_id=row['verified_by_admin_id'],
                rejection_reason=row['rejection_reason'],
                rejected_at=row['rejected_at'],
                is_featured=row['is_featured'] or False
            ))

        return documents

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching tutor documents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")


@router.get("/api/tutor/documents/{document_id}", response_model=TutorDocumentResponse)
async def get_single_document(
    document_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a single document by ID (must belong to current tutor)"""
    try:
        tutor_id = get_tutor_id_from_user(current_user.id)
        if not tutor_id:
            raise HTTPException(status_code=404, detail="Tutor profile not found")

        document = get_document_by_id(document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        if document['tutor_id'] != tutor_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this document")

        return TutorDocumentResponse(**document)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch document: {str(e)}")


@router.put("/api/tutor/documents/{document_id}", response_model=TutorDocumentResponse)
async def update_tutor_document(
    document_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    issued_by: Optional[str] = Form(None),
    date_of_issue: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    is_featured: Optional[bool] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Update document details with optional file replacement in unified documents table

    - Can only update own documents
    - Cannot update if already verified
    - File upload is optional - only replaces if provided
    - Supports is_featured toggle
    """
    try:
        tutor_id = get_tutor_id_from_user(current_user.id)
        if not tutor_id:
            raise HTTPException(status_code=404, detail="Tutor profile not found")

        document = get_document_by_id(document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        if document['tutor_id'] != tutor_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this document")

        if document['verification_status'] == 'verified':
            raise HTTPException(status_code=400, detail="Cannot update verified documents")

        # Build update query dynamically
        update_fields = []
        update_values = []

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
                raise HTTPException(status_code=400, detail="Invalid date_of_issue format. Use YYYY-MM-DD")

        if expiry_date is not None and expiry_date.strip():
            try:
                parsed_expiry = datetime.strptime(expiry_date, '%Y-%m-%d').date()
                update_fields.append("expiry_date = %s")
                update_values.append(parsed_expiry)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid expiry_date format. Use YYYY-MM-DD")
        elif expiry_date is not None and not expiry_date.strip():
            update_fields.append("expiry_date = %s")
            update_values.append(None)

        if is_featured is not None:
            update_fields.append("is_featured = %s")
            update_values.append(is_featured)

        # Handle optional file upload
        if file and file.filename:
            allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}
            file_ext = os.path.splitext(file.filename)[1].lower()
            if file_ext not in allowed_extensions:
                raise HTTPException(status_code=400, detail="Invalid file type")

            file_content = await file.read()
            file_size = len(file_content)

            if file_size > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

            file_upload_result = b2_service.upload_file(
                file_data=file_content,
                file_name=file.filename,
                file_type="files",
                user_id=tutor_id
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

        # Always update the updated_at timestamp
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        update_values.append(document_id)

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(f"""
                    UPDATE credentials
                    SET {', '.join(update_fields)}
                    WHERE id = %s AND uploader_role = 'tutor'
                    RETURNING id, uploader_id, document_type, title, description, issued_by,
                              date_of_issue, expiry_date, document_url, created_at, updated_at,
                              verification_status, is_verified, verified_by_admin_id,
                              rejection_reason, rejected_at, is_featured
                """, update_values)

                result = cursor.fetchone()
                conn.commit()

        return TutorDocumentResponse(
            id=result['id'],
            tutor_id=result['uploader_id'],
            document_type=result['document_type'],
            title=result['title'],
            description=result['description'],
            issued_by=result['issued_by'],
            date_of_issue=result['date_of_issue'],
            expiry_date=result['expiry_date'],
            document_url=result['document_url'],
            created_at=result['created_at'],
            updated_at=result['updated_at'],
            verification_status=result['verification_status'] or 'pending',
            is_verified=result['is_verified'] or False,
            verified_by_admin_id=result['verified_by_admin_id'],
            rejection_reason=result['rejection_reason'],
            rejected_at=result['rejected_at'],
            is_featured=result['is_featured'] or False
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update document: {str(e)}")


@router.delete("/api/tutor/documents/{document_id}")
async def delete_tutor_document(
    document_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a document from unified documents table

    - Can only delete own documents
    - Cannot delete verified documents
    """
    try:
        tutor_id = get_tutor_id_from_user(current_user.id)
        if not tutor_id:
            raise HTTPException(status_code=404, detail="Tutor profile not found")

        document = get_document_by_id(document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        if document['tutor_id'] != tutor_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this document")

        if document['verification_status'] == 'verified':
            raise HTTPException(status_code=400, detail="Cannot delete verified documents")

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM credentials WHERE id = %s AND uploader_role = 'tutor'", (document_id,))
                conn.commit()

        return {"message": "Document deleted successfully", "document_id": document_id}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


# ============================================================================
# ADMIN ENDPOINTS (for verification workflow)
# ============================================================================

@router.put("/api/admin/tutor-documents/{document_id}/verify", response_model=TutorDocumentResponse)
async def verify_tutor_document(
    document_id: int,
    verification: DocumentVerificationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Admin endpoint to verify or reject tutor documents in unified documents table

    - Requires admin role
    - Sets verification_status to 'verified' or 'rejected'
    - Records admin_id and timestamp
    - Requires rejection_reason if rejecting
    """
    try:
        # Check if user is admin
        if 'admin' not in current_user.get('roles', []):
            raise HTTPException(status_code=403, detail="Admin access required")

        # Validate verification status
        if verification.verification_status not in ['verified', 'rejected']:
            raise HTTPException(status_code=400, detail="Status must be 'verified' or 'rejected'")

        # Require rejection reason if rejecting
        if verification.verification_status == 'rejected' and not verification.rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason required when rejecting")

        document = get_document_by_id(document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Get admin profile ID
                cursor.execute("SELECT id FROM admin_profile WHERE user_id = %s", (current_user.id,))
                admin_result = cursor.fetchone()

                if not admin_result:
                    raise HTTPException(status_code=404, detail="Admin profile not found")

                admin_id = admin_result['id']

                # Update document verification
                if verification.verification_status == 'verified':
                    cursor.execute("""
                        UPDATE credentials
                        SET verification_status = 'verified',
                            is_verified = TRUE,
                            verified_by_admin_id = %s,
                            rejection_reason = NULL,
                            rejected_at = NULL,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s AND uploader_role = 'tutor'
                        RETURNING id, uploader_id, document_type, title, description, issued_by,
                                  date_of_issue, expiry_date, document_url, created_at, updated_at,
                                  verification_status, is_verified, verified_by_admin_id,
                                  rejection_reason, rejected_at, is_featured
                    """, (admin_id, document_id))
                else:  # rejected
                    cursor.execute("""
                        UPDATE credentials
                        SET verification_status = 'rejected',
                            is_verified = FALSE,
                            verified_by_admin_id = %s,
                            rejection_reason = %s,
                            rejected_at = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s AND uploader_role = 'tutor'
                        RETURNING id, uploader_id, document_type, title, description, issued_by,
                                  date_of_issue, expiry_date, document_url, created_at, updated_at,
                                  verification_status, is_verified, verified_by_admin_id,
                                  rejection_reason, rejected_at, is_featured
                    """, (admin_id, verification.rejection_reason, document_id))

                result = cursor.fetchone()
                conn.commit()

        return TutorDocumentResponse(
            id=result['id'],
            tutor_id=result['uploader_id'],
            document_type=result['document_type'],
            title=result['title'],
            description=result['description'],
            issued_by=result['issued_by'],
            date_of_issue=result['date_of_issue'],
            expiry_date=result['expiry_date'],
            document_url=result['document_url'],
            created_at=result['created_at'],
            updated_at=result['updated_at'],
            verification_status=result['verification_status'] or 'pending',
            is_verified=result['is_verified'] or False,
            verified_by_admin_id=result['verified_by_admin_id'],
            rejection_reason=result['rejection_reason'],
            rejected_at=result['rejected_at'],
            is_featured=result['is_featured'] or False
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error verifying document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to verify document: {str(e)}")


@router.put("/api/admin/tutor-documents/{document_id}/feature")
async def toggle_document_featured(
    document_id: int,
    is_featured: bool,
    current_user: dict = Depends(get_current_user)
):
    """
    Admin endpoint to toggle featured status in unified documents table

    - Requires admin role
    - Featured documents appear prominently in tutor profiles
    """
    try:
        # Check if user is admin
        if 'admin' not in current_user.get('roles', []):
            raise HTTPException(status_code=403, detail="Admin access required")

        document = get_document_by_id(document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE credentials
                    SET is_featured = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s AND uploader_role = 'tutor'
                """, (is_featured, document_id))
                conn.commit()

        return {
            "message": f"Document {'featured' if is_featured else 'unfeatured'} successfully",
            "document_id": document_id,
            "is_featured": is_featured
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error toggling featured status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to toggle featured: {str(e)}")
