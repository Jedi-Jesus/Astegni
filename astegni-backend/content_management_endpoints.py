"""
Content Management Endpoints for Manage Contents Admin Panel
Handles CRUD operations for educational content (images/videos)
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

# Pydantic models
class ContentBase(BaseModel):
    title: str
    content_type: str  # 'image' or 'video'
    description: Optional[str] = None
    grade_level: Optional[str] = None
    course_type: Optional[str] = None

class ContentCreate(ContentBase):
    uploader_id: int
    uploader_name: str
    file_size: int
    file_path: str
    thumbnail_path: Optional[str] = None
    duration: Optional[int] = None

class ContentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    grade_level: Optional[str] = None
    course_type: Optional[str] = None

class ContentVerificationUpdate(BaseModel):
    verification_status: str  # 'pending', 'verified', 'rejected', 'suspended'
    reason: Optional[str] = None
    verified_by: int

class ContentResponse(BaseModel):
    id: int
    title: str
    content_type: str
    uploader_id: Optional[int]
    uploader_name: Optional[str]
    file_size: int
    file_path: str
    uploaded_at: datetime
    description: Optional[str]
    grade_level: Optional[str]
    course_type: Optional[str]
    is_verified: bool
    verification_status: str
    verified_at: Optional[datetime]
    rejected_at: Optional[datetime]
    rejected_reason: Optional[str]
    suspended_at: Optional[datetime]
    suspended_reason: Optional[str]
    thumbnail_path: Optional[str]
    duration: Optional[int]
    views_count: int

    class Config:
        from_attributes = True

class ContentStatsResponse(BaseModel):
    total_contents: int
    pending_contents: int
    verified_contents: int
    rejected_contents: int
    suspended_contents: int
    total_videos: int
    total_images: int
    total_storage_mb: float

def get_db_connection():
    """Get database connection"""
    db_url = DATABASE_URL

    # Remove postgresql:// prefix
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "")

    # Split into user:pass@host:port/dbname
    parts = db_url.split('@')
    user_pass = parts[0].split(':')
    host_db = parts[1].split('/')

    # Clean database name from query parameters
    dbname = host_db[1].split('?')[0]
    host_port = host_db[0].split(':')

    return psycopg.connect(
        dbname=dbname,
        user=user_pass[0],
        password=user_pass[1],
        host=host_port[0],
        port=host_port[1] if len(host_port) > 1 else "5432"
    )

# ========================================
# GET ENDPOINTS
# ========================================

@router.get("/api/admin/contents/stats", response_model=ContentStatsResponse)
async def get_content_stats():
    """Get dashboard statistics for content management"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Total contents
        cursor.execute("SELECT COUNT(*) FROM contents")
        total_contents = cursor.fetchone()[0]

        # Count by verification status
        cursor.execute("SELECT COUNT(*) FROM contents WHERE verification_status = 'pending'")
        pending_contents = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM contents WHERE verification_status = 'verified'")
        verified_contents = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM contents WHERE verification_status = 'rejected'")
        rejected_contents = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM contents WHERE verification_status = 'suspended'")
        suspended_contents = cursor.fetchone()[0]

        # Count by content type
        cursor.execute("SELECT COUNT(*) FROM contents WHERE content_type = 'video'")
        total_videos = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM contents WHERE content_type = 'image'")
        total_images = cursor.fetchone()[0]

        # Total storage (in MB)
        cursor.execute("SELECT COALESCE(SUM(file_size), 0) FROM contents")
        total_storage_bytes = cursor.fetchone()[0]
        total_storage_mb = round(total_storage_bytes / (1024 * 1024), 2)

        cursor.close()
        conn.close()

        return {
            "total_contents": total_contents,
            "pending_contents": pending_contents,
            "verified_contents": verified_contents,
            "rejected_contents": rejected_contents,
            "suspended_contents": suspended_contents,
            "total_videos": total_videos,
            "total_images": total_images,
            "total_storage_mb": total_storage_mb
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch content stats: {str(e)}")

@router.get("/api/admin/contents", response_model=List[ContentResponse])
async def get_contents(
    verification_status: Optional[str] = None,
    content_type: Optional[str] = None,
    grade_level: Optional[str] = None,
    course_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Get contents with optional filtering"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Build query with filters
        query = """
            SELECT id, title, content_type, uploader_id, uploader_name, file_size,
                   file_path, uploaded_at, description, grade_level, course_type,
                   is_verified, verification_status, verified_at, rejected_at,
                   rejected_reason, suspended_at, suspended_reason, thumbnail_path,
                   duration, views_count
            FROM contents
            WHERE 1=1
        """
        params = []

        if verification_status:
            query += " AND verification_status = %s"
            params.append(verification_status)

        if content_type:
            query += " AND content_type = %s"
            params.append(content_type)

        if grade_level:
            query += " AND grade_level = %s"
            params.append(grade_level)

        if course_type:
            query += " AND course_type = %s"
            params.append(course_type)

        query += " ORDER BY uploaded_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(query, params)
        rows = cursor.fetchall()

        contents = []
        for row in rows:
            contents.append({
                "id": row[0],
                "title": row[1],
                "content_type": row[2],
                "uploader_id": row[3],
                "uploader_name": row[4],
                "file_size": row[5],
                "file_path": row[6],
                "uploaded_at": row[7],
                "description": row[8],
                "grade_level": row[9],
                "course_type": row[10],
                "is_verified": row[11],
                "verification_status": row[12],
                "verified_at": row[13],
                "rejected_at": row[14],
                "rejected_reason": row[15],
                "suspended_at": row[16],
                "suspended_reason": row[17],
                "thumbnail_path": row[18],
                "duration": row[19],
                "views_count": row[20]
            })

        cursor.close()
        conn.close()

        return contents

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch contents: {str(e)}")

@router.get("/api/admin/contents/{content_id}", response_model=ContentResponse)
async def get_content_by_id(content_id: int):
    """Get a specific content by ID"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, title, content_type, uploader_id, uploader_name, file_size,
                   file_path, uploaded_at, description, grade_level, course_type,
                   is_verified, verification_status, verified_at, rejected_at,
                   rejected_reason, suspended_at, suspended_reason, thumbnail_path,
                   duration, views_count
            FROM contents
            WHERE id = %s
        """, (content_id,))

        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Content not found")

        return {
            "id": row[0],
            "title": row[1],
            "content_type": row[2],
            "uploader_id": row[3],
            "uploader_name": row[4],
            "file_size": row[5],
            "file_path": row[6],
            "uploaded_at": row[7],
            "description": row[8],
            "grade_level": row[9],
            "course_type": row[10],
            "is_verified": row[11],
            "verification_status": row[12],
            "verified_at": row[13],
            "rejected_at": row[14],
            "rejected_reason": row[15],
            "suspended_at": row[16],
            "suspended_reason": row[17],
            "thumbnail_path": row[18],
            "duration": row[19],
            "views_count": row[20]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch content: {str(e)}")

@router.get("/api/admin/contents/recent/uploads", response_model=List[ContentResponse])
async def get_recent_uploads(limit: int = 10):
    """Get recent uploads for live feed widget"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, title, content_type, uploader_id, uploader_name, file_size,
                   file_path, uploaded_at, description, grade_level, course_type,
                   is_verified, verification_status, verified_at, rejected_at,
                   rejected_reason, suspended_at, suspended_reason, thumbnail_path,
                   duration, views_count
            FROM contents
            ORDER BY uploaded_at DESC
            LIMIT %s
        """, (limit,))

        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        contents = []
        for row in rows:
            contents.append({
                "id": row[0],
                "title": row[1],
                "content_type": row[2],
                "uploader_id": row[3],
                "uploader_name": row[4],
                "file_size": row[5],
                "file_path": row[6],
                "uploaded_at": row[7],
                "description": row[8],
                "grade_level": row[9],
                "course_type": row[10],
                "is_verified": row[11],
                "verification_status": row[12],
                "verified_at": row[13],
                "rejected_at": row[14],
                "rejected_reason": row[15],
                "suspended_at": row[16],
                "suspended_reason": row[17],
                "thumbnail_path": row[18],
                "duration": row[19],
                "views_count": row[20]
            })

        return contents

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch recent uploads: {str(e)}")

# ========================================
# POST ENDPOINTS
# ========================================

@router.post("/api/admin/contents", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
async def create_content(content: ContentCreate):
    """Create a new content entry"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO contents (
                title, content_type, uploader_id, uploader_name, file_size,
                file_path, description, grade_level, course_type,
                thumbnail_path, duration
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, title, content_type, uploader_id, uploader_name,
                      file_size, file_path, uploaded_at, description,
                      grade_level, course_type, is_verified, verification_status,
                      verified_at, rejected_at, rejected_reason, suspended_at,
                      suspended_reason, thumbnail_path, duration, views_count
        """, (
            content.title,
            content.content_type,
            content.uploader_id,
            content.uploader_name,
            content.file_size,
            content.file_path,
            content.description,
            content.grade_level,
            content.course_type,
            content.thumbnail_path,
            content.duration
        ))

        row = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()

        return {
            "id": row[0],
            "title": row[1],
            "content_type": row[2],
            "uploader_id": row[3],
            "uploader_name": row[4],
            "file_size": row[5],
            "file_path": row[6],
            "uploaded_at": row[7],
            "description": row[8],
            "grade_level": row[9],
            "course_type": row[10],
            "is_verified": row[11],
            "verification_status": row[12],
            "verified_at": row[13],
            "rejected_at": row[14],
            "rejected_reason": row[15],
            "suspended_at": row[16],
            "suspended_reason": row[17],
            "thumbnail_path": row[18],
            "duration": row[19],
            "views_count": row[20]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create content: {str(e)}")

# ========================================
# PUT ENDPOINTS
# ========================================

@router.put("/api/admin/contents/{content_id}", response_model=ContentResponse)
async def update_content(content_id: int, content: ContentUpdate):
    """Update content details"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Build update query dynamically
        update_fields = []
        params = []

        if content.title is not None:
            update_fields.append("title = %s")
            params.append(content.title)

        if content.description is not None:
            update_fields.append("description = %s")
            params.append(content.description)

        if content.grade_level is not None:
            update_fields.append("grade_level = %s")
            params.append(content.grade_level)

        if content.course_type is not None:
            update_fields.append("course_type = %s")
            params.append(content.course_type)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        params.append(content_id)

        query = f"""
            UPDATE contents
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, title, content_type, uploader_id, uploader_name,
                      file_size, file_path, uploaded_at, description,
                      grade_level, course_type, is_verified, verification_status,
                      verified_at, rejected_at, rejected_reason, suspended_at,
                      suspended_reason, thumbnail_path, duration, views_count
        """

        cursor.execute(query, params)
        row = cursor.fetchone()

        if not row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Content not found")

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "id": row[0],
            "title": row[1],
            "content_type": row[2],
            "uploader_id": row[3],
            "uploader_name": row[4],
            "file_size": row[5],
            "file_path": row[6],
            "uploaded_at": row[7],
            "description": row[8],
            "grade_level": row[9],
            "course_type": row[10],
            "is_verified": row[11],
            "verification_status": row[12],
            "verified_at": row[13],
            "rejected_at": row[14],
            "rejected_reason": row[15],
            "suspended_at": row[16],
            "suspended_reason": row[17],
            "thumbnail_path": row[18],
            "duration": row[19],
            "views_count": row[20]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update content: {str(e)}")

@router.put("/api/admin/contents/{content_id}/verify")
async def update_content_verification(content_id: int, verification: ContentVerificationUpdate):
    """Update content verification status (verify/reject/suspend/pending)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Determine which fields to update based on status
        if verification.verification_status == "verified":
            cursor.execute("""
                UPDATE contents
                SET verification_status = %s,
                    is_verified = TRUE,
                    verified_at = CURRENT_TIMESTAMP,
                    verified_by = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
            """, (verification.verification_status, verification.verified_by, content_id))

        elif verification.verification_status == "rejected":
            cursor.execute("""
                UPDATE contents
                SET verification_status = %s,
                    is_verified = FALSE,
                    rejected_at = CURRENT_TIMESTAMP,
                    rejected_reason = %s,
                    verified_by = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
            """, (verification.verification_status, verification.reason, verification.verified_by, content_id))

        elif verification.verification_status == "suspended":
            cursor.execute("""
                UPDATE contents
                SET verification_status = %s,
                    is_verified = FALSE,
                    suspended_at = CURRENT_TIMESTAMP,
                    suspended_reason = %s,
                    verified_by = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
            """, (verification.verification_status, verification.reason, verification.verified_by, content_id))

        elif verification.verification_status == "pending":
            # Reconsider: Move back to pending status (clear rejection/suspension)
            cursor.execute("""
                UPDATE contents
                SET verification_status = %s,
                    is_verified = FALSE,
                    verified_by = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
            """, (verification.verification_status, verification.verified_by, content_id))

        else:
            raise HTTPException(status_code=400, detail="Invalid verification status. Must be one of: verified, rejected, suspended, pending")

        row = cursor.fetchone()

        if not row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Content not found")

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": f"Content {verification.verification_status} successfully", "content_id": content_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update verification status: {str(e)}")

# ========================================
# DELETE ENDPOINTS
# ========================================

@router.delete("/api/admin/contents/{content_id}")
async def delete_content(content_id: int):
    """Delete a content entry"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM contents WHERE id = %s RETURNING id", (content_id,))
        row = cursor.fetchone()

        if not row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Content not found")

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "Content deleted successfully", "content_id": content_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete content: {str(e)}")
