"""
Student Documents Endpoints
Handles achievements, academic certificates, and extracurricular activities
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import date, datetime
import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv
from utils import get_current_user
from backblaze_service import BackblazeService

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

# Initialize router
router = APIRouter()

# Initialize Backblaze service
b2_service = BackblazeService()

# ============================================
#   PYDANTIC MODELS
# ============================================

class DocumentResponse(BaseModel):
    id: int
    student_id: int
    document_type: str
    title: str
    description: Optional[str] = None
    issued_by: Optional[str] = None
    date_of_issue: Optional[date] = None
    expiry_date: Optional[date] = None
    document_url: Optional[str] = None
    file_name: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    verification_status: Optional[str] = 'pending'
    is_verified: Optional[bool] = False
    verified_by_admin_id: Optional[int] = None
    rejection_reason: Optional[str] = None
    rejected_at: Optional[datetime] = None
    is_featured: Optional[bool] = False

    class Config:
        from_attributes = True  # Allows Pydantic to work with ORM objects and dict-like objects

class DocumentStats(BaseModel):
    total_achievements: int
    total_academics: int
    total_extracurricular: int
    total_documents: int

# ============================================
#   HELPER FUNCTIONS
# ============================================

def get_db_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

def validate_file_type(filename: str) -> bool:
    """Validate file type"""
    allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}
    file_ext = os.path.splitext(filename)[1].lower()
    return file_ext in allowed_extensions

def validate_file_size(file_size: int, max_size_mb: int = 10) -> bool:
    """Validate file size (default max 10MB)"""
    max_size_bytes = max_size_mb * 1024 * 1024
    return file_size <= max_size_bytes

# ============================================
#   ENDPOINTS
# ============================================

@router.post("/api/student/documents/upload", response_model=DocumentResponse)
async def upload_student_document(
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
    """
    Upload a student document (achievement, academics, or extracurricular)
    """
    try:
        # Validate user is a student
        if 'student' not in current_user.roles:
            raise HTTPException(status_code=403, detail="Only students can upload documents")

        # Get student profile ID from role_ids or query database
        student_id = None
        if hasattr(current_user, 'role_ids') and current_user.role_ids:
            student_id = current_user.role_ids.get('student')

        # Fallback: Query student_profiles table if role_ids not available
        if not student_id:
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id FROM student_profiles WHERE user_id = %s
                    """, (current_user.id,))
                    result = cur.fetchone()
                    if result:
                        student_id = result['id']
            finally:
                conn.close()

        if not student_id:
            raise HTTPException(status_code=404, detail="Student profile not found")

        # Validate document type
        valid_types = ['achievement', 'academic_certificate', 'extracurricular']
        if document_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid document type. Must be one of: {', '.join(valid_types)}")

        # Validate file type
        if not validate_file_type(file.filename):
            raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX")

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Validate file size (10MB max)
        if not validate_file_size(file_size):
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

        # Upload to Backblaze B2
        file_type_folder = "files"  # All student documents go in files folder

        file_upload_result = b2_service.upload_file(
            file_data=file_content,
            file_name=file.filename,
            file_type=file_type_folder,
            user_id=student_id  # Use student profile ID instead of user table ID
        )

        # Extract URL from the result dictionary
        file_url = file_upload_result.get('url') if isinstance(file_upload_result, dict) else file_upload_result

        # Parse dates
        issue_date = None
        if date_of_issue:
            try:
                issue_date = datetime.strptime(date_of_issue, '%Y-%m-%d').date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date_of_issue format. Use YYYY-MM-DD")

        exp_date = None
        if expiry_date:
            try:
                exp_date = datetime.strptime(expiry_date, '%Y-%m-%d').date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid expiry_date format. Use YYYY-MM-DD")

        # Insert into database
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO student_documents
                    (student_id, document_type, title, description, issued_by, date_of_issue,
                     expiry_date, document_url, file_name, file_type, file_size, is_featured)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    student_id,
                    document_type,
                    title,
                    description,
                    issued_by,
                    issue_date,
                    exp_date,
                    file_url,
                    file.filename,
                    file.content_type,
                    file_size,
                    is_featured
                ))

                document = cur.fetchone()
                conn.commit()

        return DocumentResponse(**document)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")


@router.get("/api/student/documents/test")
async def test_endpoint(current_user = Depends(get_current_user)):
    """Test endpoint to debug authentication"""
    return {
        "user_id": current_user.id,
        "roles": current_user.roles,
        "has_role_ids": hasattr(current_user, 'role_ids'),
        "role_ids": getattr(current_user, 'role_ids', None)
    }

@router.get("/api/student/documents/debug")
async def debug_endpoint(
    document_type: Optional[str] = None
):
    """Debug endpoint WITHOUT authentication to test routing"""
    print(f"[DEBUG ENDPOINT] ===== DEBUG ENDPOINT HIT =====")
    print(f"[DEBUG ENDPOINT] document_type parameter: {document_type}")
    return {
        "message": "Debug endpoint reached!",
        "document_type": document_type,
        "status": "success"
    }

@router.get("/api/student/documents/raw")
async def get_documents_raw(document_type: Optional[str] = None, current_user = Depends(get_current_user)):
    """Get documents without response model validation - for debugging"""
    print(f"[RAW] Starting raw endpoint")
    print(f"[RAW] document_type: {document_type}")
    print(f"[RAW] current_user.id: {current_user.id}")
    print(f"[RAW] current_user.roles: {current_user.roles}")
    print(f"[RAW] has role_ids: {hasattr(current_user, 'role_ids')}")
    if hasattr(current_user, 'role_ids'):
        print(f"[RAW] role_ids: {current_user.role_ids}")

    # Try to actually fetch documents
    try:
        student_id = current_user.role_ids.get('student') if hasattr(current_user, 'role_ids') else None
        print(f"[RAW] student_id: {student_id}")

        if student_id:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    if document_type:
                        cur.execute("""
                            SELECT * FROM student_documents
                            WHERE student_id = %s AND document_type = %s
                        """, (student_id, document_type))
                    else:
                        cur.execute("""
                            SELECT * FROM student_documents
                            WHERE student_id = %s
                        """, (student_id,))

                    documents = cur.fetchall()
                    print(f"[RAW] Found {len(documents)} documents")
                    print(f"[RAW] First doc: {documents[0] if documents else None}")

                    # Return raw dict instead of Pydantic model
                    return {"status": "ok", "count": len(documents), "documents": documents}
    except Exception as e:
        print(f"[RAW] Error: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

    return {"status": "ok", "message": "Endpoint reached successfully"}

@router.get("/api/student/documents/stats", response_model=DocumentStats)
async def get_document_stats(
    current_user = Depends(get_current_user)
):
    """
    Get document statistics for a student
    """
    try:
        print("[STATS ENDPOINT] ====== STATS ENDPOINT REACHED! ======")
        print(f"[STATS ENDPOINT] User: {current_user.id}, Roles: {current_user.roles}")
        # Validate user is a student
        if 'student' not in current_user.roles:
            raise HTTPException(status_code=403, detail="Only students can view stats")

        # Get student profile ID from role_ids or query database
        student_id = None
        if hasattr(current_user, 'role_ids') and current_user.role_ids:
            student_id = current_user.role_ids.get('student')

        # Fallback: Query student_profiles table if role_ids not available
        if not student_id:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id FROM student_profiles WHERE user_id = %s
                    """, (current_user.id,))
                    result = cur.fetchone()
                    if result:
                        student_id = result['id']

        if not student_id:
            raise HTTPException(status_code=404, detail="Student profile not found")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        COUNT(*) FILTER (WHERE document_type = 'achievement') as total_achievements,
                        COUNT(*) FILTER (WHERE document_type = 'academic_certificate') as total_academics,
                        COUNT(*) FILTER (WHERE document_type = 'extracurricular') as total_extracurricular,
                        COUNT(*) as total_documents
                    FROM student_documents
                    WHERE student_id = %s
                """, (student_id,))

                stats = cur.fetchone()

        return DocumentStats(**stats)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.get("/api/student/documents/{document_id}", response_model=DocumentResponse)
async def get_document_by_id(
    document_id: int,
    current_user = Depends(get_current_user)
):
    """
    Get a specific document by ID
    """
    try:
        # Get student profile ID from role_ids or query database
        student_id = None
        if hasattr(current_user, 'role_ids') and current_user.role_ids:
            student_id = current_user.role_ids.get('student')

        # Fallback: Query student_profiles table if role_ids not available
        if not student_id:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id FROM student_profiles WHERE user_id = %s
                    """, (current_user.id,))
                    result = cur.fetchone()
                    if result:
                        student_id = result['id']

        if not student_id:
            raise HTTPException(status_code=404, detail="Student profile not found")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM student_documents
                    WHERE id = %s AND student_id = %s
                """, (document_id, student_id))

                document = cur.fetchone()

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        return DocumentResponse(**document)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch document: {str(e)}")


@router.get("/api/student/documents", response_model=List[DocumentResponse])
async def get_student_documents(
    document_type: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Get all documents for a student, optionally filtered by type
    """
    print(f"[DEBUG GET DOCS] ===== ENDPOINT FUNCTION CALLED =====")
    print(f"[DEBUG GET DOCS] document_type: {document_type}")
    print(f"[DEBUG GET DOCS] current_user: {current_user.id if current_user else 'None'}")
    try:
        print(f"[DEBUG GET DOCS] ===== START =====")
        print(f"[DEBUG GET DOCS] User ID: {current_user.id}, Roles: {current_user.roles}")
        print(f"[DEBUG GET DOCS] Has role_ids attr: {hasattr(current_user, 'role_ids')}")
        if hasattr(current_user, 'role_ids'):
            print(f"[DEBUG GET DOCS] role_ids: {current_user.role_ids}")
            print(f"[DEBUG GET DOCS] role_ids type: {type(current_user.role_ids)}")

        # Validate user is a student
        if 'student' not in current_user.roles:
            print(f"[DEBUG GET DOCS] ERROR: User is not a student")
            raise HTTPException(status_code=403, detail="Only students can view documents")

        # Get student profile ID from role_ids or query database
        student_id = None
        if hasattr(current_user, 'role_ids') and current_user.role_ids:
            student_id = current_user.role_ids.get('student')
            print(f"[DEBUG GET DOCS] Got student_id from role_ids: {student_id}")

        # Fallback: Query student_profiles table if role_ids not available
        if not student_id:
            print(f"[DEBUG GET DOCS] Querying database for student profile with user_id={current_user.id}")
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id FROM student_profiles WHERE user_id = %s
                    """, (current_user.id,))
                    result = cur.fetchone()
                    print(f"[DEBUG GET DOCS] Database query result: {result}")
                    if result:
                        student_id = result['id']
                        print(f"[DEBUG GET DOCS] Got student_id from database: {student_id}")

        if not student_id:
            raise HTTPException(status_code=404, detail="Student profile not found")

        print(f"[DEBUG] Final student_id: {student_id}, document_type: {document_type}")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if document_type:
                    # Validate document type
                    valid_types = ['achievement', 'academic_certificate', 'extracurricular']
                    if document_type not in valid_types:
                        raise HTTPException(status_code=400, detail=f"Invalid document type")

                    cur.execute("""
                        SELECT * FROM student_documents
                        WHERE student_id = %s AND document_type = %s
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (student_id, document_type))
                else:
                    cur.execute("""
                        SELECT * FROM student_documents
                        WHERE student_id = %s
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (student_id,))

                documents = cur.fetchall()
                print(f"[DEBUG] Found {len(documents)} documents")

        if not documents:
            return []

        print(f"[DEBUG GET DOCS] First document: {documents[0] if documents else 'None'}")
        print(f"[DEBUG GET DOCS] Document keys: {list(documents[0].keys()) if documents else 'None'}")
        print(f"[DEBUG GET DOCS] About to create DocumentResponse objects...")

        try:
            result = []
            for i, doc in enumerate(documents):
                print(f"[DEBUG GET DOCS] Processing document {i+1}/{len(documents)}")
                try:
                    doc_response = DocumentResponse(**doc)
                    result.append(doc_response)
                    print(f"[DEBUG GET DOCS] Document {i+1} validated successfully")
                except Exception as e:
                    print(f"[DEBUG GET DOCS] ERROR validating document {i+1}: {e}")
                    print(f"[DEBUG GET DOCS] Document data: {doc}")
                    raise

            print(f"[DEBUG GET DOCS] Returning {len(result)} documents")
            return result
        except Exception as e:
            print(f"[DEBUG GET DOCS] ERROR creating response objects: {e}")
            import traceback
            traceback.print_exc()
            raise

    except HTTPException as he:
        print(f"[ERROR GET DOCS] HTTPException: {he.status_code} - {he.detail}")
        raise
    except Exception as e:
        print(f"[ERROR GET DOCS] Unexpected Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")


@router.put("/api/student/documents/{document_id}", response_model=DocumentResponse)
async def update_student_document(
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
    Update student document with optional file replacement

    - Can only update own documents
    - File upload is optional - only replaces if provided
    - Supports is_featured toggle
    """
    try:
        # Validate user is a student
        if 'student' not in current_user.roles:
            raise HTTPException(status_code=403, detail="Only students can update documents")

        # Get student profile ID
        student_id = None
        if hasattr(current_user, 'role_ids') and current_user.role_ids:
            student_id = current_user.role_ids.get('student')

        if not student_id:
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id FROM student_profiles WHERE user_id = %s
                    """, (current_user.id,))
                    result = cur.fetchone()
                    if result:
                        student_id = result['id']
            finally:
                conn.close()

        if not student_id:
            raise HTTPException(status_code=404, detail="Student profile not found")

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
            try:
                parsed_date = datetime.strptime(date_of_issue, '%Y-%m-%d').date()
                update_fields.append("date_of_issue = %s")
                update_values.append(parsed_date)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date_of_issue format. Use YYYY-MM-DD")

        if expiry_date is not None:
            try:
                parsed_expiry = datetime.strptime(expiry_date, '%Y-%m-%d').date()
                update_fields.append("expiry_date = %s")
                update_values.append(parsed_expiry)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid expiry_date format. Use YYYY-MM-DD")

        if is_featured is not None:
            update_fields.append("is_featured = %s")
            update_values.append(is_featured)

        # Handle optional file upload
        if file and file.filename:
            # Validate file type
            if not validate_file_type(file.filename):
                raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX")

            # Read and validate file
            file_content = await file.read()
            file_size = len(file_content)

            if not validate_file_size(file_size):
                raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

            # Upload to B2
            file_upload_result = b2_service.upload_file(
                file_data=file_content,
                file_name=file.filename,
                file_type="files",
                user_id=student_id
            )

            file_url = file_upload_result.get('url') if isinstance(file_upload_result, dict) else file_upload_result
            update_fields.append("document_url = %s")
            update_values.append(file_url)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Always update the updated_at timestamp
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        update_values.extend([document_id, student_id])

        # Update document
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Check ownership
                cur.execute("""
                    SELECT id FROM student_documents
                    WHERE id = %s AND student_id = %s
                """, (document_id, student_id))

                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Document not found or access denied")

                # Perform update
                cur.execute(f"""
                    UPDATE student_documents
                    SET {', '.join(update_fields)}
                    WHERE id = %s AND student_id = %s
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


@router.get("/api/view-student/{student_profile_id}/credentials")
async def get_view_student_credentials(
    student_profile_id: int,
    document_type: Optional[str] = None
):
    """
    PUBLIC endpoint to get student credentials for view-student.html

    - Used by view-student.html to display student's achievements, certifications, extracurricular
    - No authentication required (public profile view)
    - Uses the 'credentials' table with uploader_role='student'
    - uploader_id in credentials table = student_profiles.id (NOT user_id)
    - Optional filter by document_type: 'achievement', 'academic_certificate', 'extracurricular'
    - Returns empty list if student not found (graceful handling)
    """
    try:
        print(f"[VIEW STUDENT CREDENTIALS] Getting credentials for student_profile_id: {student_profile_id}, type: {document_type}")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Fetch credentials from the credentials table
                # uploader_id = student_profiles.id (student profile ID, NOT user_id)
                if document_type:
                    valid_types = ['achievement', 'academic_certificate', 'extracurricular', 'certification']
                    if document_type not in valid_types:
                        raise HTTPException(status_code=400, detail=f"Invalid document type")

                    # Map 'certification' to 'academic_certificate' for backwards compatibility
                    db_doc_type = 'academic_certificate' if document_type == 'certification' else document_type

                    cur.execute("""
                        SELECT id, uploader_id, document_type, title, description,
                               issued_by, date_of_issue, expiry_date, document_url,
                               file_name, file_type, file_size, created_at, updated_at,
                               verification_status, is_verified, is_featured
                        FROM credentials
                        WHERE uploader_id = %s AND uploader_role = 'student' AND document_type = %s
                              AND is_featured = true
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (student_profile_id, db_doc_type))
                else:
                    cur.execute("""
                        SELECT id, uploader_id, document_type, title, description,
                               issued_by, date_of_issue, expiry_date, document_url,
                               file_name, file_type, file_size, created_at, updated_at,
                               verification_status, is_verified, is_featured
                        FROM credentials
                        WHERE uploader_id = %s AND uploader_role = 'student'
                              AND is_featured = true
                        ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                    """, (student_profile_id,))

                documents = cur.fetchall()
                print(f"[VIEW STUDENT CREDENTIALS] Found {len(documents)} credentials")

        if not documents:
            return []

        # Return as list of dicts (already dict_row from psycopg)
        return list(documents)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[VIEW STUDENT CREDENTIALS] Error fetching credentials: {e}")
        import traceback
        traceback.print_exc()
        # Return empty list on error instead of raising exception (graceful handling)
        return []


@router.get("/api/view-student/{student_profile_id}/parents")
async def get_view_student_parents(student_profile_id: int):
    """
    PUBLIC endpoint to get student's parents for view-student.html

    - Reads parent_id array from student_profiles table
    - Fetches parent details from parent_profiles joined with users table
    - No authentication required (public profile view)
    - Returns empty list if student has no parents linked
    """
    try:
        print(f"[VIEW STUDENT PARENTS] Getting parents for student_profile_id: {student_profile_id}")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # First get the parent_id array from student_profiles
                cur.execute("""
                    SELECT parent_id FROM student_profiles WHERE id = %s
                """, (student_profile_id,))

                result = cur.fetchone()
                if not result or not result.get('parent_id'):
                    print(f"[VIEW STUDENT PARENTS] No parents found for student {student_profile_id}")
                    return []

                parent_ids = result['parent_id']
                print(f"[VIEW STUDENT PARENTS] Found parent_ids: {parent_ids}")

                if not parent_ids:
                    return []

                # Fetch parent details with user info
                cur.execute("""
                    SELECT
                        p.id,
                        p.user_id,
                        p.username,
                        p.bio,
                        p.quote,
                        p.relationship_type,
                        p.location,
                        p.total_children,
                        u.is_verified,
                        p.is_active,
                        p.profile_picture,
                        p.cover_image,
                        u.first_name,
                        u.father_name,
                        u.email,
                        u.phone
                    FROM parent_profiles p
                    JOIN users u ON p.user_id = u.id
                    WHERE p.id = ANY(%s)
                    ORDER BY p.id
                """, (parent_ids,))

                parents = cur.fetchall()
                print(f"[VIEW STUDENT PARENTS] Found {len(parents)} parent records")

        return list(parents)

    except Exception as e:
        print(f"[VIEW STUDENT PARENTS] Error: {e}")
        import traceback
        traceback.print_exc()
        return []


@router.delete("/api/student/documents/{document_id}")
async def delete_document(
    document_id: int,
    current_user = Depends(get_current_user)
):
    """
    Delete a student document
    """
    try:
        # Get student profile ID from role_ids or query database
        student_id = None
        if hasattr(current_user, 'role_ids') and current_user.role_ids:
            student_id = current_user.role_ids.get('student')

        # Fallback: Query student_profiles table if role_ids not available
        if not student_id:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id FROM student_profiles WHERE user_id = %s
                    """, (current_user.id,))
                    result = cur.fetchone()
                    if result:
                        student_id = result['id']

        if not student_id:
            raise HTTPException(status_code=404, detail="Student profile not found")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get document info before deleting
                cur.execute("""
                    SELECT document_url FROM student_documents
                    WHERE id = %s AND student_id = %s
                """, (document_id, student_id))

                document = cur.fetchone()

                if not document:
                    raise HTTPException(status_code=404, detail="Document not found")

                # Delete from database
                cur.execute("""
                    DELETE FROM student_documents
                    WHERE id = %s AND student_id = %s
                """, (document_id, student_id))

                conn.commit()

                # Optionally delete from Backblaze (you can implement this later)
                # b2_service.delete_file(document['document_url'])

        return {"message": "Document deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")
