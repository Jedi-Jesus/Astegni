"""
Teaching/Learning Documents Endpoints

Document management system for teaching and learning materials:
- Upload PDFs, worksheets, presentations, study guides
- Organized by folders/categories
- Supports tutors and students
- Students can view their own documents AND documents from their enrolled tutors

NOTE: This uses the 'documents' table (for teaching/learning materials)
      NOT the 'credentials' table (for achievements, certificates, experience)
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
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

class TeachingDocumentResponse(BaseModel):
    """Response model for teaching/learning documents"""
    id: int
    uploader_id: int
    uploader_role: str
    category: Optional[str] = None  # 'notes', 'assignments', 'study-guides', 'presentations', 'worksheets', 'other'
    title: str
    description: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    folder: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    view_count: int = 0
    download_count: int = 0
    # Additional fields for tutor/student info when viewing shared documents
    tutor_name: Optional[str] = None
    student_name: Optional[str] = None
    is_own_document: bool = True

    class Config:
        from_attributes = True


class TeachingDocumentStats(BaseModel):
    """Statistics for teaching documents"""
    total_documents: int
    by_type: dict
    total_size_bytes: int
    own_documents: int = 0
    tutor_documents: int = 0
    student_documents: int = 0


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_db_connection():
    """Get database connection with dict row factory"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def get_profile_id_from_user(user_id: int, role: str) -> Optional[int]:
    """Get profile id from user_id based on role"""
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
        print(f"Error getting profile_id: {e}")
        return None


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/api/teaching-documents", response_model=List[TeachingDocumentResponse])
async def get_teaching_documents(
    uploader_role: Optional[str] = Query(None, description="Filter by role: 'tutor' or 'student'"),
    category: Optional[str] = Query(None, description="Filter by category: 'notes', 'assignments', etc."),
    subject: Optional[str] = Query(None, description="Filter by subject"),
    folder: Optional[str] = Query(None, description="Filter by folder"),
    include_tutor_docs: bool = Query(True, description="For students: include documents from enrolled tutors"),
    include_student_docs: bool = Query(True, description="For tutors: include documents from enrolled students"),
    source: Optional[str] = Query(None, description="Filter by source: 'own', 'tutor', 'student', or None for all"),
    current_user = Depends(get_current_user)
):
    """
    Get teaching/learning documents for the current user.
    Reads from the 'documents' table (teaching materials, NOT credentials).

    For students:
    - Returns their own uploaded documents
    - Also returns documents from tutors they are enrolled with (if include_tutor_docs=True)
    - Use source='own' to get only own documents, source='tutor' for only tutor docs

    For tutors:
    - Returns their own uploaded documents
    - Also returns documents from students enrolled with them (if include_student_docs=True)
    - Use source='own' to get only own documents, source='student' for only student docs
    """
    try:
        user_id = current_user.id
        user_roles = current_user.roles if isinstance(current_user.roles, list) else []

        # Determine the role to use
        role = uploader_role
        if not role:
            if 'tutor' in user_roles:
                role = 'tutor'
            elif 'student' in user_roles:
                role = 'student'
            else:
                role = 'student'  # Default

        # Get profile ID
        profile_id = get_profile_id_from_user(user_id, role)
        if not profile_id:
            return []  # No profile, return empty list

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Check if documents table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'documents'
                    )
                """)
                if not cursor.fetchone()['exists']:
                    print("[Teaching Documents] 'documents' table does not exist")
                    return []

                all_documents = []

                # Get user's own documents (unless source='tutor' or source='student')
                if source not in ['tutor', 'student']:
                    query = """
                        SELECT d.id, d.uploader_id, d.uploader_role, d.category, d.title, d.description,
                               d.subject, d.grade_level, d.folder, d.file_url, d.file_name,
                               d.file_type, d.file_size, d.created_at, d.updated_at,
                               COALESCE(d.view_count, 0) as view_count, COALESCE(d.download_count, 0) as download_count,
                               NULL as tutor_name,
                               NULL as student_name,
                               TRUE as is_own_document
                        FROM documents d
                        WHERE d.uploader_id = %s AND d.uploader_role = %s
                    """
                    params = [profile_id, role]

                    if category:
                        query += " AND d.category = %s"
                        params.append(category)

                    if subject:
                        query += " AND d.subject = %s"
                        params.append(subject)

                    if folder:
                        query += " AND d.folder = %s"
                        params.append(folder)

                    cursor.execute(query, params)
                    own_documents = cursor.fetchall()
                    all_documents.extend(own_documents)
                    print(f"[Teaching Documents] Found {len(own_documents)} own documents for {role} profile {profile_id}")

                # For students: also get documents from enrolled tutors
                if role == 'student' and include_tutor_docs and source not in ['own', 'student']:
                    # Check if enrolled_courses table exists
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables
                            WHERE table_name = 'enrolled_courses'
                        )
                    """)
                    enrolled_exists = cursor.fetchone()['exists']

                    if enrolled_exists:
                        # Get documents from tutors the student is enrolled with
                        # students_id is an integer[] array, so use ANY to check membership
                        tutor_query = """
                            SELECT DISTINCT d.id, d.uploader_id, d.uploader_role, d.category, d.title, d.description,
                                   d.subject, d.grade_level, d.folder, d.file_url, d.file_name,
                                   d.file_type, d.file_size, d.created_at, d.updated_at,
                                   COALESCE(d.view_count, 0) as view_count, COALESCE(d.download_count, 0) as download_count,
                                   COALESCE(CONCAT(u.first_name, ' ', u.father_name), 'Tutor') as tutor_name,
                                   NULL as student_name,
                                   FALSE as is_own_document
                            FROM documents d
                            INNER JOIN enrolled_courses ec ON d.uploader_id = ec.tutor_id AND d.uploader_role = 'tutor'
                            LEFT JOIN tutor_profiles tp ON d.uploader_id = tp.id
                            LEFT JOIN users u ON tp.user_id = u.id
                            WHERE %s = ANY(ec.students_id)
                        """
                        tutor_params = [profile_id]

                        if category:
                            tutor_query += " AND d.category = %s"
                            tutor_params.append(category)

                        if subject:
                            tutor_query += " AND d.subject = %s"
                            tutor_params.append(subject)

                        if folder:
                            tutor_query += " AND d.folder = %s"
                            tutor_params.append(folder)

                        cursor.execute(tutor_query, tutor_params)
                        tutor_documents = cursor.fetchall()
                        all_documents.extend(tutor_documents)
                        print(f"[Teaching Documents] Found {len(tutor_documents)} tutor documents for student {profile_id}")

                # For tutors: also get documents from enrolled students
                if role == 'tutor' and include_student_docs and source not in ['own', 'tutor']:
                    # Check if enrolled_courses table exists
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables
                            WHERE table_name = 'enrolled_courses'
                        )
                    """)
                    enrolled_exists = cursor.fetchone()['exists']

                    if enrolled_exists:
                        # Get documents from students enrolled with this tutor
                        # students_id is an integer[] array, use unnest to expand it
                        student_query = """
                            SELECT DISTINCT d.id, d.uploader_id, d.uploader_role, d.category, d.title, d.description,
                                   d.subject, d.grade_level, d.folder, d.file_url, d.file_name,
                                   d.file_type, d.file_size, d.created_at, d.updated_at,
                                   COALESCE(d.view_count, 0) as view_count, COALESCE(d.download_count, 0) as download_count,
                                   NULL as tutor_name,
                                   COALESCE(CONCAT(u.first_name, ' ', u.father_name), 'Student') as student_name,
                                   FALSE as is_own_document
                            FROM documents d
                            INNER JOIN enrolled_courses ec ON ec.tutor_id = %s
                            INNER JOIN LATERAL unnest(ec.students_id) AS student_id ON d.uploader_id = student_id AND d.uploader_role = 'student'
                            LEFT JOIN student_profiles sp ON d.uploader_id = sp.id
                            LEFT JOIN users u ON sp.user_id = u.id
                            WHERE 1=1
                        """
                        student_params = [profile_id]

                        if category:
                            student_query += " AND d.category = %s"
                            student_params.append(category)

                        if subject:
                            student_query += " AND d.subject = %s"
                            student_params.append(subject)

                        if folder:
                            student_query += " AND d.folder = %s"
                            student_params.append(folder)

                        cursor.execute(student_query, student_params)
                        student_documents = cursor.fetchall()
                        all_documents.extend(student_documents)
                        print(f"[Teaching Documents] Found {len(student_documents)} student documents for tutor {profile_id}")

                # Sort all documents by created_at DESC
                all_documents.sort(key=lambda x: x['created_at'] or datetime.min, reverse=True)

                print(f"[Teaching Documents] Total: {len(all_documents)} documents for {role} profile {profile_id}")
                return all_documents

    except Exception as e:
        print(f"[Teaching Documents] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/teaching-documents/stats", response_model=TeachingDocumentStats)
async def get_teaching_document_stats(
    uploader_role: Optional[str] = Query(None),
    current_user = Depends(get_current_user)
):
    """Get statistics for teaching documents including tutor/student documents"""
    try:
        user_id = current_user.id
        user_roles = current_user.roles if isinstance(current_user.roles, list) else []

        role = uploader_role
        if not role:
            if 'tutor' in user_roles:
                role = 'tutor'
            elif 'student' in user_roles:
                role = 'student'
            else:
                role = 'student'

        profile_id = get_profile_id_from_user(user_id, role)
        if not profile_id:
            return {"total_documents": 0, "by_type": {}, "total_size_bytes": 0, "own_documents": 0, "tutor_documents": 0, "student_documents": 0}

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Check if table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'documents'
                    )
                """)
                if not cursor.fetchone()['exists']:
                    return {"total_documents": 0, "by_type": {}, "total_size_bytes": 0, "own_documents": 0, "tutor_documents": 0, "student_documents": 0}

                # Get counts by category for own documents
                cursor.execute("""
                    SELECT category, COUNT(*) as count, COALESCE(SUM(file_size), 0) as size
                    FROM documents
                    WHERE uploader_id = %s AND uploader_role = %s
                    GROUP BY category
                """, (profile_id, role))

                results = cursor.fetchall()

                by_type = {}
                own_documents = 0
                total_size = 0

                for row in results:
                    doc_type = row['category'] or 'other'
                    by_type[doc_type] = row['count']
                    own_documents += row['count']
                    total_size += row['size'] or 0

                tutor_documents = 0
                student_documents = 0

                # Check if enrolled_courses table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'enrolled_courses'
                    )
                """)
                enrolled_exists = cursor.fetchone()['exists']

                if enrolled_exists:
                    # For students: count tutor documents
                    # students_id is an integer[] array, use ANY to check membership
                    if role == 'student':
                        cursor.execute("""
                            SELECT COUNT(DISTINCT d.id) as count
                            FROM documents d
                            INNER JOIN enrolled_courses ec ON d.uploader_id = ec.tutor_id AND d.uploader_role = 'tutor'
                            WHERE %s = ANY(ec.students_id)
                        """, (profile_id,))
                        result = cursor.fetchone()
                        tutor_documents = result['count'] if result else 0

                    # For tutors: count student documents
                    # students_id is an integer[] array, use unnest to expand it
                    if role == 'tutor':
                        cursor.execute("""
                            SELECT COUNT(DISTINCT d.id) as count
                            FROM documents d
                            INNER JOIN enrolled_courses ec ON ec.tutor_id = %s
                            INNER JOIN LATERAL unnest(ec.students_id) AS student_id ON d.uploader_id = student_id AND d.uploader_role = 'student'
                        """, (profile_id,))
                        result = cursor.fetchone()
                        student_documents = result['count'] if result else 0

                return {
                    "total_documents": own_documents + tutor_documents + student_documents,
                    "by_type": by_type,
                    "total_size_bytes": total_size,
                    "own_documents": own_documents,
                    "tutor_documents": tutor_documents,
                    "student_documents": student_documents
                }

    except Exception as e:
        print(f"[Teaching Documents] Stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/teaching-documents/upload", response_model=TeachingDocumentResponse)
async def upload_teaching_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form(...),
    description: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    grade_level: Optional[str] = Form(None),
    folder: Optional[str] = Form(None),
    uploader_role: str = Form('student'),
    current_user = Depends(get_current_user)
):
    """Upload a new teaching/learning document"""
    try:
        user_id = current_user.id

        # Get profile ID
        profile_id = get_profile_id_from_user(user_id, uploader_role)
        if not profile_id:
            raise HTTPException(status_code=404, detail=f"{uploader_role.capitalize()} profile not found")

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Upload to Backblaze
        document_url = None
        try:
            upload_result = b2_service.upload_file(
                file_data=file_content,
                file_name=file.filename,
                file_type=file.content_type or 'application/octet-stream',
                user_id=profile_id
            )
            document_url = upload_result.get('url') if upload_result else None
        except Exception as upload_error:
            print(f"[Teaching Documents] Upload to B2 failed: {upload_error}")
            # Continue without URL - file will be stored later

        # Insert into database
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO documents (
                        uploader_id, uploader_role, category, title, description,
                        subject, grade_level, folder, file_url, file_name,
                        file_type, file_size, created_at, updated_at, view_count, download_count
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, 0
                    ) RETURNING *
                """, (
                    profile_id, uploader_role, category, title, description,
                    subject, grade_level, folder, document_url, file.filename,
                    file.content_type, file_size, datetime.now(), datetime.now()
                ))

                new_doc = cursor.fetchone()
                conn.commit()

                print(f"[Teaching Documents] Created document {new_doc['id']} for {uploader_role}")
                return new_doc

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Teaching Documents] Upload error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/teaching-documents/{document_id}")
async def delete_teaching_document(
    document_id: int,
    current_user = Depends(get_current_user)
):
    """Delete a teaching document"""
    try:
        user_id = current_user.id
        user_roles = current_user.roles if isinstance(current_user.roles, list) else []

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Get the document first
                cursor.execute("""
                    SELECT * FROM documents WHERE id = %s
                """, (document_id,))
                doc = cursor.fetchone()

                if not doc:
                    raise HTTPException(status_code=404, detail="Document not found")

                # Verify ownership
                role = doc['uploader_role']
                profile_id = get_profile_id_from_user(user_id, role)

                if doc['uploader_id'] != profile_id:
                    raise HTTPException(status_code=403, detail="Not authorized to delete this document")

                # Delete from database
                cursor.execute("DELETE FROM documents WHERE id = %s", (document_id,))
                conn.commit()

                # Try to delete from B2 if URL exists
                if doc.get('file_url'):
                    try:
                        b2_service.delete_file(doc['file_url'])
                    except Exception as b2_error:
                        print(f"[Teaching Documents] B2 delete failed (non-critical): {b2_error}")

                return {"message": "Document deleted successfully", "id": document_id}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Teaching Documents] Delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
