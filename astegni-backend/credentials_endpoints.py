"""
Tutor Credentials Endpoints

Credential management system for tutors and students:
- Upload academic credentials, awards and honors, and experience documents
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
DATABASE_URL = os.getenv('DATABASE_URL')  # astegni_user_db
ADMIN_DATABASE_URL = os.getenv('ADMIN_DATABASE_URL')  # astegni_admin_db

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
    """Model for tutor document response - maps from unified credentials table"""
    id: int
    tutor_id: int  # This is actually uploader_id from credentials table
    document_type: str
    title: str
    description: Optional[str] = None
    issued_by: Optional[str] = None
    date_of_issue: Optional[date] = None
    expiry_date: Optional[date] = None
    years: Optional[int] = None
    document_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    verification_status: str = 'pending'
    is_verified: bool = False
    verified_by_admin_id: Optional[int] = None
    status_reason: Optional[str] = None
    status_at: Optional[datetime] = None
    is_featured: bool = False


class DocumentVerificationUpdate(BaseModel):
    """Model for admin verification"""
    verification_status: str = Field(..., description="'verified' or 'rejected'")
    status_reason: Optional[str] = None


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_db_connection():
    """Get database connection to astegni_user_db with dict row factory"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def get_admin_db_connection():
    """Get database connection to astegni_admin_db with dict row factory"""
    return psycopg.connect(ADMIN_DATABASE_URL, row_factory=dict_row)


def update_admin_portfolio(admin_id: int, action: str, credential_id: int, reason: Optional[str] = None):
    """
    Update admin_portfolio table with credential verification action

    Args:
        admin_id: ID of the admin performing the action
        action: 'verified', 'rejected', 'suspended', or 'reactivated'
        credential_id: ID of the credential being acted upon
        reason: Optional reason for rejection/suspension
    """
    try:
        with get_admin_db_connection() as conn:
            with conn.cursor() as cursor:
                # Increment counter
                counter_field = f"credentials_{action}"

                # Add to ID array
                id_array_field = f"credentials_{action}_ids"

                # Prepare reason entry if applicable
                reason_field = f"credentials_{action}_reasons"

                if action in ['verified', 'reactivated']:
                    # No reason needed, just increment counter and add ID
                    cursor.execute(f"""
                        UPDATE admin_portfolio
                        SET
                            {counter_field} = COALESCE({counter_field}, 0) + 1,
                            {id_array_field} = array_append(COALESCE({id_array_field}, ARRAY[]::INTEGER[]), %s),
                            total_actions = COALESCE(total_actions, 0) + 1,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE admin_id = %s
                    """, (credential_id, admin_id))

                elif action in ['rejected', 'suspended']:
                    # Store reason in JSONB array
                    reason_entry = {
                        "id": credential_id,
                        "reason": reason or "No reason provided",
                        "date": datetime.now().isoformat()
                    }

                    cursor.execute(f"""
                        UPDATE admin_portfolio
                        SET
                            {counter_field} = COALESCE({counter_field}, 0) + 1,
                            {id_array_field} = array_append(COALESCE({id_array_field}, ARRAY[]::INTEGER[]), %s),
                            {reason_field} = COALESCE({reason_field}, '[]'::jsonb) || %s::jsonb,
                            total_actions = COALESCE(total_actions, 0) + 1,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE admin_id = %s
                    """, (credential_id, psycopg.types.json.Jsonb([reason_entry]), admin_id))

                conn.commit()

    except Exception as e:
        print(f"Error updating admin_portfolio: {e}")
        raise


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
                           status_reason, status_at, is_featured, years
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
                        'years': result.get('years'),
                        'document_url': result['document_url'],
                        'created_at': result['created_at'],
                        'updated_at': result['updated_at'],
                        'verification_status': result['verification_status'] or 'pending',
                        'is_verified': result['is_verified'] or False,
                        'verified_by_admin_id': result['verified_by_admin_id'],
                        'status_reason': result['status_reason'],
                        'status_at': result['status_at'],
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
    years: Optional[int] = Form(None),
    is_featured: Optional[str] = Form("false"),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a new tutor document (academic credentials, awards and honors, or experience)

    - Validates document type
    - Uploads file to Backblaze B2
    - Creates database record in unified 'credentials' table with pending verification status
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

        # USER-BASED: Use current_user.id directly (credentials belong to the person, not the role)
        print(f"   Using user_id: {current_user.id} (uploader_role: 'tutor')")

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
            user_id=current_user.id  # Use user_id instead of tutor_id
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
        print(f"   Years: {years}")
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO credentials (
                        uploader_id, uploader_role, document_type, title, description,
                        issued_by, date_of_issue, expiry_date, document_url, file_name,
                        file_type, file_size, verification_status, is_verified, is_featured, years
                    ) VALUES (%s, 'tutor', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', FALSE, %s, %s)
                    RETURNING id, uploader_id, document_type, title, description, issued_by,
                              date_of_issue, expiry_date, document_url, created_at, updated_at,
                              verification_status, is_verified, verified_by_admin_id,
                              status_reason, status_at, is_featured, years
                """, (current_user.id, document_type, title, description, issued_by, issue_date, exp_date,
                      file_url, file.filename, file.content_type, file_size, is_featured_bool, years))

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
            years=result.get('years'),
            document_url=result['document_url'],
            created_at=result['created_at'],
            updated_at=result['updated_at'],
            verification_status=result['verification_status'],
            is_verified=result['is_verified'],
            verified_by_admin_id=result['verified_by_admin_id'],
            status_reason=result['status_reason'],
            status_at=result['status_at'],
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
        # Verify tutor profile exists
        tutor_id = get_tutor_id_from_user(current_user.id)
        if not tutor_id:
            raise HTTPException(status_code=404, detail="Tutor profile not found")

        # FIX: Use user_id (not tutor_id) to query credentials table
        # credentials.uploader_id stores user_id, not tutor_profiles.id
        user_id = current_user.id

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                if document_type:
                    if document_type not in ['academic', 'achievement', 'experience']:
                        raise HTTPException(status_code=400, detail="Invalid document type")

                    cursor.execute("""
                        SELECT id, uploader_id, document_type, title, description, issued_by,
                               date_of_issue, expiry_date, document_url, created_at, updated_at,
                               verification_status, is_verified, verified_by_admin_id,
                               status_reason, status_at, is_featured, years
                        FROM credentials
                        WHERE uploader_id = %s AND uploader_role = 'tutor' AND document_type = %s
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (user_id, document_type))
                else:
                    cursor.execute("""
                        SELECT id, uploader_id, document_type, title, description, issued_by,
                               date_of_issue, expiry_date, document_url, created_at, updated_at,
                               verification_status, is_verified, verified_by_admin_id,
                               status_reason, status_at, is_featured, years
                        FROM credentials
                        WHERE uploader_id = %s AND uploader_role = 'tutor'
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (user_id,))

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
                years=row.get('years'),
                document_url=row['document_url'],
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                verification_status=row['verification_status'] or 'pending',
                is_verified=row['is_verified'] or False,
                verified_by_admin_id=row['verified_by_admin_id'],
                status_reason=row['status_reason'],
                status_at=row['status_at'],
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
    years: Optional[int] = Form(None),
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
        # USER-BASED: Use current_user.id directly
        user_id = current_user.id

        document = get_document_by_id(document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Check ownership: document.tutor_id is actually uploader_id (which is now user_id)
        if document['tutor_id'] != user_id:
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

        if years is not None:
            update_fields.append("years = %s")
            update_values.append(years)

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
                user_id=user_id  # Use user_id instead of tutor_id
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
                              status_reason, status_at, is_featured, years
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
            years=result.get('years'),
            document_url=result['document_url'],
            created_at=result['created_at'],
            updated_at=result['updated_at'],
            verification_status=result['verification_status'] or 'pending',
            is_verified=result['is_verified'] or False,
            verified_by_admin_id=result['verified_by_admin_id'],
            status_reason=result['status_reason'],
            status_at=result['status_at'],
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
        # USER-BASED: Use current_user.id directly
        user_id = current_user.id

        document = get_document_by_id(document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Check ownership: document.tutor_id is actually uploader_id (which is now user_id)
        if document['tutor_id'] != user_id:
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
# PUBLIC VIEW ENDPOINT (for view-tutor.html - no auth required)
# ============================================================================

@router.get("/api/view/tutor/{profile_id}/documents")
async def get_tutor_credentials_public(profile_id: int):
    """
    Public endpoint to get tutor credentials for view-tutor.html

    - No authentication required (public view)
    - Returns only featured AND verified credentials (is_featured = true AND is_verified = true)
    - Used by view-tutor-credentials.js
    - profile_id is tutor_profiles.id, needs to be converted to user_id
    """
    try:
        print(f"[Public Credentials] GET /api/view/tutor/{profile_id}/documents")

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Convert tutor profile_id to user_id
                cursor.execute("""
                    SELECT user_id FROM tutor_profiles WHERE id = %s
                """, (profile_id,))
                result = cursor.fetchone()
                if not result:
                    raise HTTPException(status_code=404, detail="Tutor profile not found")

                user_id = result['user_id']
                print(f"[Public Credentials] Converted tutor profile {profile_id} -> user {user_id}")

                # Fetch credentials using user_id
                cursor.execute("""
                    SELECT id, uploader_id, document_type, title, description, issued_by,
                           date_of_issue, expiry_date, document_url, created_at, updated_at,
                           verification_status, is_verified, is_featured
                    FROM credentials
                    WHERE uploader_id = %s
                      AND uploader_role = 'tutor'
                      AND is_featured = TRUE
                      AND is_verified = TRUE
                    ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                """, (user_id,))

                results = cursor.fetchall()
                print(f"[Public Credentials] Found {len(results)} credentials for tutor {profile_id}")

        credentials = []
        for row in results:
            credentials.append({
                "id": row['id'],
                "tutor_id": row['uploader_id'],
                "document_type": row['document_type'],
                "title": row['title'],
                "description": row['description'],
                "issued_by": row['issued_by'],
                "date_of_issue": row['date_of_issue'].isoformat() if row['date_of_issue'] else None,
                "expiry_date": row['expiry_date'].isoformat() if row['expiry_date'] else None,
                "document_url": row['document_url'],
                "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                "updated_at": row['updated_at'].isoformat() if row['updated_at'] else None,
                "verification_status": row['verification_status'] or 'pending',
                "is_verified": row['is_verified'] or False,
                "is_featured": row['is_featured'] or False
            })

        return credentials

    except Exception as e:
        print(f"[Public Credentials] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch credentials: {str(e)}")


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
    - Requires status_reason if rejecting
    """
    try:
        # Check if user is admin
        if 'admin' not in current_user.get('roles', []):
            raise HTTPException(status_code=403, detail="Admin access required")

        # Validate verification status
        if verification.verification_status not in ['verified', 'rejected']:
            raise HTTPException(status_code=400, detail="Status must be 'verified' or 'rejected'")

        # Require rejection reason if rejecting
        if verification.verification_status == 'rejected' and not verification.status_reason:
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
                            status_reason = NULL,
                            status_at = NULL,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s AND uploader_role = 'tutor'
                        RETURNING id, uploader_id, document_type, title, description, issued_by,
                                  date_of_issue, expiry_date, document_url, created_at, updated_at,
                                  verification_status, is_verified, verified_by_admin_id,
                                  status_reason, status_at, is_featured
                    """, (admin_id, document_id))
                else:  # rejected
                    cursor.execute("""
                        UPDATE credentials
                        SET verification_status = 'rejected',
                            is_verified = FALSE,
                            verified_by_admin_id = %s,
                            status_reason = %s,
                            status_at = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s AND uploader_role = 'tutor'
                        RETURNING id, uploader_id, document_type, title, description, issued_by,
                                  date_of_issue, expiry_date, document_url, created_at, updated_at,
                                  verification_status, is_verified, verified_by_admin_id,
                                  status_reason, status_at, is_featured
                    """, (admin_id, verification.status_reason, document_id))

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
            status_reason=result['status_reason'],
            status_at=result['status_at'],
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


# ============================================================================
# ADMIN DASHBOARD ENDPOINTS (for manage-credentials admin page)
# ============================================================================

@router.get("/api/admin/credentials/stats")
async def get_credentials_stats():
    """Get statistics for credentials dashboard - shows credentials from ALL user roles"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Get counts by verification status (removed uploader_role filter)
                cursor.execute("""
                    SELECT
                        COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
                        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
                        COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected,
                        COUNT(*) as total
                    FROM credentials
                """)
                stats = cursor.fetchone()

                return {
                    "pending": stats['pending'] or 0,
                    "verified": stats['verified'] or 0,
                    "rejected": stats['rejected'] or 0,
                    "total": stats['total'] or 0
                }
    except Exception as e:
        print(f"Error fetching credentials stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.get("/api/admin/credentials/pending")
async def get_pending_credentials():
    """Get all pending credentials for admin review - shows credentials from ALL user roles"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        c.id,
                        c.uploader_id,
                        c.uploader_role,
                        c.title,
                        c.description,
                        c.document_url,
                        c.document_type,
                        c.issued_by,
                        c.date_of_issue,
                        c.expiry_date,
                        c.verification_status,
                        c.created_at,
                        c.updated_at,
                        u.email,
                        u.first_name,
                        u.father_name
                    FROM credentials c
                    LEFT JOIN users u ON c.uploader_id = u.id
                    WHERE c.verification_status = 'pending'
                    ORDER BY c.created_at DESC
                """)

                credentials = cursor.fetchall()

                result = []
                for cred in credentials:
                    result.append({
                        "id": cred['id'],
                        "uploader_id": cred['uploader_id'],
                        "uploader_role": cred['uploader_role'],
                        "uploader_name": f"{cred['first_name'] or ''} {cred['father_name'] or ''}".strip() or "Unknown",
                        "uploader_email": cred['email'],
                        "title": cred['title'],
                        "description": cred['description'],
                        "document_url": cred['document_url'],
                        "document_type": cred['document_type'],
                        "issued_by": cred['issued_by'],
                        "date_of_issue": cred['date_of_issue'].isoformat() if cred['date_of_issue'] else None,
                        "expiry_date": cred['expiry_date'].isoformat() if cred['expiry_date'] else None,
                        "verification_status": cred['verification_status'],
                        "created_at": cred['created_at'].isoformat() if cred['created_at'] else None,
                        "updated_at": cred['updated_at'].isoformat() if cred['updated_at'] else None
                    })

                return result

    except Exception as e:
        print(f"Error fetching pending credentials: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch pending credentials: {str(e)}")


@router.get("/api/admin/credentials/verified")
async def get_verified_credentials():
    """Get all verified credentials - shows credentials from ALL user roles"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        c.id,
                        c.uploader_id,
                        c.uploader_role,
                        c.title,
                        c.description,
                        c.document_url,
                        c.document_type,
                        c.issued_by,
                        c.date_of_issue,
                        c.expiry_date,
                        c.verification_status,
                        c.created_at,
                        c.updated_at,
                        u.email,
                        u.first_name,
                        u.father_name
                    FROM credentials c
                    LEFT JOIN users u ON c.uploader_id = u.id
                    WHERE c.verification_status = 'verified'
                    ORDER BY c.updated_at DESC
                """)

                credentials = cursor.fetchall()

                result = []
                for cred in credentials:
                    result.append({
                        "id": cred['id'],
                        "uploader_id": cred['uploader_id'],
                        "uploader_role": cred['uploader_role'],
                        "uploader_name": f"{cred['first_name'] or ''} {cred['father_name'] or ''}".strip() or "Unknown",
                        "uploader_email": cred['email'],
                        "title": cred['title'],
                        "description": cred['description'],
                        "document_url": cred['document_url'],
                        "document_type": cred['document_type'],
                        "issued_by": cred['issued_by'],
                        "date_of_issue": cred['date_of_issue'].isoformat() if cred['date_of_issue'] else None,
                        "expiry_date": cred['expiry_date'].isoformat() if cred['expiry_date'] else None,
                        "verification_status": cred['verification_status'],
                        "created_at": cred['created_at'].isoformat() if cred['created_at'] else None,
                        "updated_at": cred['updated_at'].isoformat() if cred['updated_at'] else None
                    })

                return result

    except Exception as e:
        print(f"Error fetching verified credentials: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch verified credentials: {str(e)}")


@router.get("/api/admin/credentials/rejected")
async def get_rejected_credentials():
    """Get all rejected credentials - shows credentials from ALL user roles"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        c.id,
                        c.uploader_id,
                        c.uploader_role,
                        c.title,
                        c.description,
                        c.document_url,
                        c.document_type,
                        c.issued_by,
                        c.date_of_issue,
                        c.expiry_date,
                        c.verification_status,
                        c.status_reason,
                        c.status_at,
                        c.created_at,
                        c.updated_at,
                        u.email,
                        u.first_name,
                        u.father_name
                    FROM credentials c
                    LEFT JOIN users u ON c.uploader_id = u.id
                    WHERE c.verification_status = 'rejected'
                    ORDER BY c.status_at DESC
                """)

                credentials = cursor.fetchall()

                result = []
                for cred in credentials:
                    result.append({
                        "id": cred['id'],
                        "uploader_id": cred['uploader_id'],
                        "uploader_role": cred['uploader_role'],
                        "uploader_name": f"{cred['first_name'] or ''} {cred['father_name'] or ''}".strip() or "Unknown",
                        "uploader_email": cred['email'],
                        "title": cred['title'],
                        "description": cred['description'],
                        "document_url": cred['document_url'],
                        "document_type": cred['document_type'],
                        "issued_by": cred['issued_by'],
                        "date_of_issue": cred['date_of_issue'].isoformat() if cred['date_of_issue'] else None,
                        "expiry_date": cred['expiry_date'].isoformat() if cred['expiry_date'] else None,
                        "verification_status": cred['verification_status'],
                        "status_reason": cred['status_reason'],
                        "status_at": cred['status_at'].isoformat() if cred['status_at'] else None,
                        "created_at": cred['created_at'].isoformat() if cred['created_at'] else None,
                        "updated_at": cred['updated_at'].isoformat() if cred['updated_at'] else None
                    })

                return result

    except Exception as e:
        print(f"Error fetching rejected credentials: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch rejected credentials: {str(e)}")


@router.get("/api/admin/credentials/suspended")
async def get_suspended_credentials():
    """Get all suspended credentials - shows credentials from ALL user roles"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        c.id,
                        c.uploader_id,
                        c.uploader_role,
                        c.title,
                        c.description,
                        c.document_url,
                        c.document_type,
                        c.issued_by,
                        c.date_of_issue,
                        c.expiry_date,
                        c.verification_status,
                        c.status_reason,
                        c.status_at,
                        c.created_at,
                        c.updated_at,
                        u.email,
                        u.first_name,
                        u.father_name
                    FROM credentials c
                    LEFT JOIN users u ON c.uploader_id = u.id
                    WHERE c.verification_status = 'suspended'
                    ORDER BY c.status_at DESC
                """)

                credentials = cursor.fetchall()

                result = []
                for cred in credentials:
                    result.append({
                        "id": cred['id'],
                        "uploader_id": cred['uploader_id'],
                        "uploader_role": cred['uploader_role'],
                        "uploader_name": f"{cred['first_name'] or ''} {cred['father_name'] or ''}".strip() or "Unknown",
                        "uploader_email": cred['email'],
                        "title": cred['title'],
                        "description": cred['description'],
                        "document_url": cred['document_url'],
                        "document_type": cred['document_type'],
                        "issued_by": cred['issued_by'],
                        "date_of_issue": cred['date_of_issue'].isoformat() if cred['date_of_issue'] else None,
                        "expiry_date": cred['expiry_date'].isoformat() if cred['expiry_date'] else None,
                        "verification_status": cred['verification_status'],
                        "status_reason": cred['status_reason'],
                        "status_at": cred['status_at'].isoformat() if cred['status_at'] else None,
                        "created_at": cred['created_at'].isoformat() if cred['created_at'] else None,
                        "updated_at": cred['updated_at'].isoformat() if cred['updated_at'] else None
                    })

                return result

    except Exception as e:
        print(f"Error fetching suspended credentials: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch suspended credentials: {str(e)}")


class CredentialVerificationRequest(BaseModel):
    """Model for credential verification action"""
    action: str = Field(..., description="'verify', 'reject', 'suspend', 'reactivate', or 'reconsider'")
    reason: Optional[str] = Field(None, description="Reason for rejection or suspension")
    admin_id: int = Field(..., description="ID of the admin performing the action")


@router.put("/api/admin/credentials/{credential_id}/verify")
async def verify_credential(
    credential_id: int,
    request: CredentialVerificationRequest
):
    """
    Admin endpoint to verify, reject, suspend, reactivate, or reconsider a credential

    Updates both:
    1. credentials table in astegni_user_db (verification_status)
    2. admin_portfolio table in astegni_admin_db (stats tracking)
    """
    try:
        action = request.action
        admin_id = request.admin_id
        reason = request.reason

        # Validate action
        if action not in ['verify', 'reject', 'suspend', 'reactivate', 'reconsider']:
            raise HTTPException(status_code=400, detail="Invalid action. Must be 'verify', 'reject', 'suspend', 'reactivate', or 'reconsider'")

        # Map action to verification_status
        status_map = {
            'verify': 'verified',
            'reject': 'rejected',
            'suspend': 'suspended',
            'reactivate': 'verified',  # Reactivating sets status back to verified
            'reconsider': 'pending'    # Reconsider moves credential back to pending
        }
        new_status = status_map[action]

        # Map action to admin_portfolio field names (reconsider doesn't track to portfolio)
        portfolio_action_map = {
            'verify': 'verified',
            'reject': 'rejected',
            'suspend': 'suspended',
            'reactivate': 'reactivated'
        }
        portfolio_action = portfolio_action_map.get(action)  # Will be None for 'reconsider'

        # Update credentials table in astegni_user_db
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                if action in ['reject', 'suspend']:
                    # Reject/suspend: set is_verified = FALSE, add reason and timestamp
                    cursor.execute("""
                        UPDATE credentials
                        SET
                            verification_status = %s,
                            is_verified = FALSE,
                            status_reason = %s,
                            status_at = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                        RETURNING id, title, verification_status, is_verified
                    """, (new_status, reason, credential_id))
                elif action in ['verify', 'reactivate']:
                    # Verify/reactivate: set is_verified = TRUE, clear reason
                    cursor.execute("""
                        UPDATE credentials
                        SET
                            verification_status = %s,
                            is_verified = TRUE,
                            status_reason = NULL,
                            status_at = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                        RETURNING id, title, verification_status, is_verified
                    """, (new_status, credential_id))
                else:
                    # Reconsider: set is_verified = FALSE, clear reason, back to pending
                    cursor.execute("""
                        UPDATE credentials
                        SET
                            verification_status = %s,
                            is_verified = FALSE,
                            status_reason = NULL,
                            status_at = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                        RETURNING id, title, verification_status, is_verified
                    """, (new_status, credential_id))

                result = cursor.fetchone()
                if not result:
                    raise HTTPException(status_code=404, detail="Credential not found")

                conn.commit()

        # Update admin_portfolio table in astegni_admin_db (skip for 'reconsider')
        if portfolio_action:
            update_admin_portfolio(admin_id, portfolio_action, credential_id, reason)

        return {
            "success": True,
            "message": f"Credential {action}ed successfully",
            "credential_id": credential_id,
            "new_status": new_status,
            "action": action
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating credential verification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update credential: {str(e)}")


# ============================================================================
# UNIFIED CREDENTIALS ENDPOINTS (for both tutors AND students)
# These endpoints use the 'credentials' table with uploader_role filtering
# ============================================================================

class UnifiedCredentialResponse(BaseModel):
    """Response model for unified credentials (works for tutors and students)"""
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
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    verification_status: str = 'pending'
    is_verified: bool = False
    verified_by_admin_id: Optional[int] = None
    status_reason: Optional[str] = None
    status_at: Optional[datetime] = None
    is_featured: bool = False
    is_current: bool = False  # For tutors: marks as current workplace for "Currently Teaches At"


class UnifiedCredentialStats(BaseModel):
    """Statistics for unified credentials"""
    total_credentials: int
    by_type: dict


def get_profile_id_for_role(user_id: int, role: str) -> Optional[int]:
    """Get profile ID from user_id based on role"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                if role == 'tutor':
                    cursor.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (user_id,))
                elif role == 'student':
                    cursor.execute("SELECT id FROM student_profiles WHERE user_id = %s", (user_id,))
                else:
                    return None
                result = cursor.fetchone()
                return result['id'] if result else None
    except Exception as e:
        print(f"Error getting profile_id for {role}: {e}")
        return None


@router.get("/api/documents", response_model=List[UnifiedCredentialResponse])
async def get_unified_documents(
    document_type: Optional[str] = None,
    uploader_role: str = 'student',
    current_user: dict = Depends(get_current_user)
):
    """
    Get credentials for the current user (works for both tutors and students)

    - uploader_role: 'student' or 'tutor' (defaults to 'student')
    - document_type: optional filter by type (achievement, academic_certificate, extracurricular, academic, experience)
    - Returns credentials from the unified 'credentials' table
    """
    try:
        print(f"[Unified Documents] GET /api/documents - user_id: {current_user.id}, role: {uploader_role}, type: {document_type}")

        # Validate role
        if uploader_role not in ['student', 'tutor']:
            raise HTTPException(status_code=400, detail="Invalid uploader_role. Must be 'student' or 'tutor'")

        # USER-BASED: Query by user_id and uploader_role
        print(f"[Unified Documents] Querying by user_id: {current_user.id}, uploader_role: {uploader_role}")

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                if document_type:
                    cursor.execute("""
                        SELECT id, uploader_id, uploader_role, document_type, title, description,
                               issued_by, date_of_issue, expiry_date, document_url, file_name,
                               file_type, file_size, created_at, updated_at,
                               verification_status, is_verified, verified_by_admin_id,
                               status_reason, status_at, is_featured
                        FROM credentials
                        WHERE uploader_id = %s AND uploader_role = %s AND document_type = %s
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (current_user.id, uploader_role, document_type))
                else:
                    cursor.execute("""
                        SELECT id, uploader_id, uploader_role, document_type, title, description,
                               issued_by, date_of_issue, expiry_date, document_url, file_name,
                               file_type, file_size, created_at, updated_at,
                               verification_status, is_verified, verified_by_admin_id,
                               status_reason, status_at, is_featured
                        FROM credentials
                        WHERE uploader_id = %s AND uploader_role = %s
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (current_user.id, uploader_role))

                results = cursor.fetchall()
                print(f"[Unified Documents] Found {len(results)} credentials")

        credentials = []
        for row in results:
            credentials.append(UnifiedCredentialResponse(
                id=row['id'],
                uploader_id=row['uploader_id'],
                uploader_role=row['uploader_role'],
                document_type=row['document_type'],
                title=row['title'],
                description=row['description'],
                issued_by=row['issued_by'],
                date_of_issue=row['date_of_issue'],
                expiry_date=row['expiry_date'],
                document_url=row['document_url'],
                file_name=row['file_name'],
                file_type=row['file_type'],
                file_size=row['file_size'],
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                verification_status=row['verification_status'] or 'pending',
                is_verified=row['is_verified'] or False,
                verified_by_admin_id=row['verified_by_admin_id'],
                status_reason=row['status_reason'],
                status_at=row['status_at'],
                is_featured=row['is_featured'] or False
            ))

        return credentials

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Unified Documents] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch credentials: {str(e)}")


@router.get("/api/documents/stats", response_model=UnifiedCredentialStats)
async def get_unified_document_stats(
    uploader_role: str = 'student',
    current_user: dict = Depends(get_current_user)
):
    """
    Get credential statistics for the current user (works for both tutors and students)

    - uploader_role: 'student' or 'tutor' (defaults to 'student')
    - Returns counts by document type
    """
    try:
        print(f"[Unified Documents Stats] GET /api/documents/stats - user_id: {current_user.id}, role: {uploader_role}")

        # Validate role
        if uploader_role not in ['student', 'tutor']:
            raise HTTPException(status_code=400, detail="Invalid uploader_role. Must be 'student' or 'tutor'")

        # USER-BASED: Query by user_id and uploader_role
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT document_type, COUNT(*) as count
                    FROM credentials
                    WHERE uploader_id = %s AND uploader_role = %s
                    GROUP BY document_type
                """, (current_user.id, uploader_role))

                results = cursor.fetchall()

        by_type = {}
        total = 0
        for row in results:
            by_type[row['document_type']] = row['count']
            total += row['count']

        print(f"[Unified Documents Stats] Total: {total}, By type: {by_type}")
        return UnifiedCredentialStats(total_credentials=total, by_type=by_type)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Unified Documents Stats] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.post("/api/documents/upload", response_model=UnifiedCredentialResponse)
async def upload_unified_document(
    document_type: str = Form(...),
    title: str = Form(...),
    uploader_role: str = Form('student'),
    description: Optional[str] = Form(None),
    issued_by: Optional[str] = Form(None),
    date_of_issue: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    is_featured: Optional[str] = Form("false"),
    is_current: Optional[str] = Form("false"),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a credential (works for both tutors and students)

    - uploader_role: 'student' or 'tutor' (defaults to 'student')
    - document_type: For students: 'achievement', 'academic'
                     For tutors: 'academic', 'achievement', 'experience'
    - is_current: For tutors only - marks this as their current workplace (for "Currently Teaches At")
    """
    try:
        print(f"[Unified Documents Upload] POST /api/documents/upload")
        print(f"   User ID: {current_user.id}, Role: {uploader_role}, Type: {document_type}")

        # Validate role
        if uploader_role not in ['student', 'tutor']:
            raise HTTPException(status_code=400, detail="Invalid uploader_role. Must be 'student' or 'tutor'")

        # Validate document type based on role
        valid_types_student = ['achievement', 'academic']
        valid_types_tutor = ['academic', 'achievement', 'experience']

        if uploader_role == 'student' and document_type not in valid_types_student:
            raise HTTPException(status_code=400, detail=f"Invalid document type for student. Must be one of: {', '.join(valid_types_student)}")
        if uploader_role == 'tutor' and document_type not in valid_types_tutor:
            raise HTTPException(status_code=400, detail=f"Invalid document type for tutor. Must be one of: {', '.join(valid_types_tutor)}")

        # USER-BASED: Use current_user.id directly (credentials belong to the user, not the profile)
        # The uploader_role field indicates which role uploaded it
        print(f"   Using user_id: {current_user.id} (uploader_role: '{uploader_role}')")

        # Validate file type
        allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX")

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Validate file size (10MB limit)
        if file_size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

        # Upload to Backblaze B2
        print(f"   Uploading to Backblaze...")
        file_upload_result = b2_service.upload_file(
            file_data=file_content,
            file_name=file.filename,
            file_type="files",
            user_id=current_user.id  # Use user_id instead of profile_id
        )

        file_url = file_upload_result.get('url') if isinstance(file_upload_result, dict) else file_upload_result
        print(f"   File URL: {file_url}")

        # Parse dates
        issue_date = None
        if date_of_issue and date_of_issue.strip():
            try:
                issue_date = datetime.strptime(date_of_issue, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date_of_issue format. Use YYYY-MM-DD")

        exp_date = None
        if expiry_date and expiry_date.strip():
            try:
                exp_date = datetime.strptime(expiry_date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid expiry_date format. Use YYYY-MM-DD")

        # Parse is_featured and is_current
        is_featured_bool = is_featured.lower() == "true" if is_featured else False
        is_current_bool = is_current.lower() == "true" if is_current else False

        # If marking as current, first unmark any existing current credentials for this user
        # (only one credential can be current at a time for "Currently Teaches At")
        if is_current_bool and uploader_role == 'tutor' and document_type == 'experience':
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        UPDATE credentials
                        SET is_current = FALSE
                        WHERE uploader_id = %s
                        AND uploader_role = 'tutor'
                        AND document_type = 'experience'
                        AND is_current = TRUE
                    """, (current_user.id,))
                    conn.commit()

        # Insert into credentials table
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO credentials (
                        uploader_id, uploader_role, document_type, title, description,
                        issued_by, date_of_issue, expiry_date, document_url, file_name,
                        file_type, file_size, verification_status, is_verified, is_featured, is_current
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', FALSE, %s, %s)
                    RETURNING id, uploader_id, uploader_role, document_type, title, description,
                              issued_by, date_of_issue, expiry_date, document_url, file_name,
                              file_type, file_size, created_at, updated_at,
                              verification_status, is_verified, verified_by_admin_id,
                              status_reason, status_at, is_featured, is_current
                """, (current_user.id, uploader_role, document_type, title, description,
                      issued_by, issue_date, exp_date, file_url, file.filename,
                      file.content_type, file_size, is_featured_bool, is_current_bool))

                result = cursor.fetchone()
                print(f"   ✅ Credential inserted with ID: {result['id']}")
                conn.commit()

        return UnifiedCredentialResponse(
            id=result['id'],
            uploader_id=result['uploader_id'],
            uploader_role=result['uploader_role'],
            document_type=result['document_type'],
            title=result['title'],
            description=result['description'],
            issued_by=result['issued_by'],
            date_of_issue=result['date_of_issue'],
            expiry_date=result['expiry_date'],
            document_url=result['document_url'],
            file_name=result['file_name'],
            file_type=result['file_type'],
            file_size=result['file_size'],
            created_at=result['created_at'],
            updated_at=result['updated_at'],
            verification_status=result['verification_status'] or 'pending',
            is_verified=result['is_verified'] or False,
            verified_by_admin_id=result['verified_by_admin_id'],
            status_reason=result['status_reason'],
            status_at=result['status_at'],
            is_featured=result['is_featured'] or False,
            is_current=result['is_current'] or False
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Unified Documents Upload] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload credential: {str(e)}")


@router.put("/api/documents/{document_id}", response_model=UnifiedCredentialResponse)
async def update_unified_document(
    document_id: int,
    document_type: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    uploader_role: str = Form('student'),
    description: Optional[str] = Form(None),
    issued_by: Optional[str] = Form(None),
    date_of_issue: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    is_featured: Optional[str] = Form(None),
    is_current: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Update a credential (works for both tutors and students)

    - Can only update own credentials
    - Cannot update verified credentials (for tutors)
    - File upload is optional - only replaces if provided
    - is_current: For tutors only - marks this as their current workplace
    """
    try:
        print(f"[Unified Documents Update] PUT /api/documents/{document_id}")
        print(f"   User ID: {current_user.id}, Role: {uploader_role}")

        # Validate role
        if uploader_role not in ['student', 'tutor']:
            raise HTTPException(status_code=400, detail="Invalid uploader_role. Must be 'student' or 'tutor'")

        # USER-BASED: Get existing document and verify ownership by user_id
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT * FROM credentials
                    WHERE id = %s AND uploader_id = %s AND uploader_role = %s
                """, (document_id, current_user.id, uploader_role))

                existing = cursor.fetchone()
                if not existing:
                    raise HTTPException(status_code=404, detail="Credential not found or access denied")

                # For tutors, check if already verified (students can always edit)
                if uploader_role == 'tutor' and existing['verification_status'] == 'verified':
                    raise HTTPException(status_code=400, detail="Cannot update verified credentials")

        # Build update query dynamically
        update_fields = []
        update_values = []

        if document_type is not None:
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
            if date_of_issue.strip():
                try:
                    parsed_date = datetime.strptime(date_of_issue, '%Y-%m-%d').date()
                    update_fields.append("date_of_issue = %s")
                    update_values.append(parsed_date)
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid date_of_issue format. Use YYYY-MM-DD")
            else:
                update_fields.append("date_of_issue = %s")
                update_values.append(None)

        if expiry_date is not None:
            if expiry_date.strip():
                try:
                    parsed_expiry = datetime.strptime(expiry_date, '%Y-%m-%d').date()
                    update_fields.append("expiry_date = %s")
                    update_values.append(parsed_expiry)
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid expiry_date format. Use YYYY-MM-DD")
            else:
                update_fields.append("expiry_date = %s")
                update_values.append(None)

        if is_featured is not None:
            is_featured_bool = is_featured.lower() == "true" if isinstance(is_featured, str) else is_featured
            update_fields.append("is_featured = %s")
            update_values.append(is_featured_bool)

        # Handle is_current for tutors (only one credential can be current at a time)
        if is_current is not None:
            is_current_bool = is_current.lower() == "true" if isinstance(is_current, str) else is_current

            # If marking as current, first unmark any existing current credentials
            if is_current_bool and uploader_role == 'tutor':
                with get_db_connection() as conn:
                    with conn.cursor() as cursor:
                        cursor.execute("""
                            UPDATE credentials
                            SET is_current = FALSE
                            WHERE uploader_id = %s
                            AND uploader_role = 'tutor'
                            AND document_type = 'experience'
                            AND is_current = TRUE
                            AND id != %s
                        """, (current_user.id, document_id))
                        conn.commit()

            update_fields.append("is_current = %s")
            update_values.append(is_current_bool)

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
                user_id=current_user.id  # Use user_id instead of profile_id
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
        update_values.extend([document_id, current_user.id, uploader_role])

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(f"""
                    UPDATE credentials
                    SET {', '.join(update_fields)}
                    WHERE id = %s AND uploader_id = %s AND uploader_role = %s
                    RETURNING id, uploader_id, uploader_role, document_type, title, description,
                              issued_by, date_of_issue, expiry_date, document_url, file_name,
                              file_type, file_size, created_at, updated_at,
                              verification_status, is_verified, verified_by_admin_id,
                              status_reason, status_at, is_featured, is_current
                """, update_values)

                result = cursor.fetchone()
                conn.commit()

        print(f"   ✅ Credential {document_id} updated successfully")

        return UnifiedCredentialResponse(
            id=result['id'],
            uploader_id=result['uploader_id'],
            uploader_role=result['uploader_role'],
            document_type=result['document_type'],
            title=result['title'],
            description=result['description'],
            issued_by=result['issued_by'],
            date_of_issue=result['date_of_issue'],
            expiry_date=result['expiry_date'],
            document_url=result['document_url'],
            file_name=result['file_name'],
            file_type=result['file_type'],
            file_size=result['file_size'],
            created_at=result['created_at'],
            updated_at=result['updated_at'],
            verification_status=result['verification_status'] or 'pending',
            is_verified=result['is_verified'] or False,
            verified_by_admin_id=result['verified_by_admin_id'],
            status_reason=result['status_reason'],
            status_at=result['status_at'],
            is_featured=result['is_featured'] or False,
            is_current=result['is_current'] or False
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Unified Documents Update] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update credential: {str(e)}")


@router.delete("/api/documents/{document_id}")
async def delete_unified_document(
    document_id: int,
    uploader_role: str = 'student',
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a credential (works for both tutors and students)

    - Can only delete own credentials
    - For tutors: cannot delete verified credentials
    """
    try:
        print(f"[Unified Documents Delete] DELETE /api/documents/{document_id}")
        print(f"   User ID: {current_user.id}, Role: {uploader_role}")

        # Validate role
        if uploader_role not in ['student', 'tutor']:
            raise HTTPException(status_code=400, detail="Invalid uploader_role. Must be 'student' or 'tutor'")

        # USER-BASED: Verify ownership by user_id
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Get existing document and verify ownership
                cursor.execute("""
                    SELECT id, verification_status FROM credentials
                    WHERE id = %s AND uploader_id = %s AND uploader_role = %s
                """, (document_id, current_user.id, uploader_role))

                existing = cursor.fetchone()
                if not existing:
                    raise HTTPException(status_code=404, detail="Credential not found or access denied")

                # For tutors, check if already verified
                if uploader_role == 'tutor' and existing['verification_status'] == 'verified':
                    raise HTTPException(status_code=400, detail="Cannot delete verified credentials")

                # Delete the credential
                cursor.execute("""
                    DELETE FROM credentials
                    WHERE id = %s AND uploader_id = %s AND uploader_role = %s
                """, (document_id, current_user.id, uploader_role))

                conn.commit()

        print(f"   ✅ Credential {document_id} deleted successfully")
        return {"message": "Credential deleted successfully", "id": document_id}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Unified Documents Delete] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete credential: {str(e)}")
