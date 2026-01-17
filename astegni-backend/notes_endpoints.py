"""
Notes API Endpoints
Comprehensive REST API for notes management with media support
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc, asc
from typing import List, Optional
from datetime import datetime, timedelta
import os
import uuid

from models import (
    SessionLocal, Note, NoteMedia, NoteExport,
    NoteCreate, NoteUpdate, NoteResponse, NoteListResponse,
    NoteMediaCreate, NoteMediaResponse,
    NoteExportCreate, NoteExportResponse,
    NotesStatsResponse
)
from utils import get_current_user
from backblaze_service import get_backblaze_service

router = APIRouter(prefix="/api/notes", tags=["notes"])

# ============================================
# DEPENDENCY
# ============================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================
# NOTES CRUD
# ============================================

@router.post("/", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    note_data: NoteCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new note"""

    # Create note
    db_note = Note(
        profile_id=current_user.profile_id,
        profile_type=current_user.profile_type,
        title=note_data.title,
        content=note_data.content,
        date=note_data.date or datetime.utcnow(),
        course=note_data.course,
        tutor=note_data.tutor,
        tags=note_data.tags,
        background=note_data.background,
        background_url=note_data.background_url,
        is_favorite=note_data.is_favorite,
        word_count=note_data.word_count,
        has_media=False
    )

    db.add(db_note)
    db.commit()
    db.refresh(db_note)

    return db_note

@router.get("/", response_model=List[NoteListResponse])
async def get_notes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    sort_by: str = Query("date_desc", regex="^(date_desc|date_asc|title|course|created)$"),
    filter_favorite: Optional[bool] = None,
    filter_course: Optional[str] = None,
    filter_has_media: Optional[bool] = None,
    search: Optional[str] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all notes for the current user with filtering and sorting"""

    query = db.query(Note).filter(Note.profile_id == current_user.profile_id,
        Note.profile_type == current_user.profile_type)

    # Apply filters
    if filter_favorite is not None:
        query = query.filter(Note.is_favorite == filter_favorite)

    if filter_course:
        query = query.filter(Note.course == filter_course)

    if filter_has_media is not None:
        query = query.filter(Note.has_media == filter_has_media)

    # Apply search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Note.title.ilike(search_term),
                Note.content.ilike(search_term),
                Note.course.ilike(search_term),
                Note.tutor.ilike(search_term),
                Note.tags.ilike(search_term)
            )
        )

    # Apply sorting
    if sort_by == "date_desc":
        query = query.order_by(desc(Note.last_modified))
    elif sort_by == "date_asc":
        query = query.order_by(asc(Note.last_modified))
    elif sort_by == "title":
        query = query.order_by(asc(Note.title))
    elif sort_by == "course":
        query = query.order_by(asc(Note.course))
    elif sort_by == "created":
        query = query.order_by(desc(Note.created_at))

    # Paginate
    notes = query.offset(skip).limit(limit).all()

    return notes

@router.get("/stats", response_model=NotesStatsResponse)
async def get_notes_stats(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get statistics about user's notes"""

    profile_id = current_user.profile_id
    profile_type = current_user.profile_type

    # Total notes
    total_notes = db.query(func.count(Note.id)).filter(
        Note.profile_id == profile_id,
        Note.profile_type == profile_type
    ).scalar()

    # Total words
    total_words = db.query(func.sum(Note.word_count)).filter(
        Note.profile_id == profile_id,
        Note.profile_type == profile_type
    ).scalar() or 0

    # Total unique courses
    total_courses = db.query(func.count(func.distinct(Note.course))).filter(
        Note.profile_id == profile_id,
        Note.profile_type == profile_type,
        Note.course.isnot(None),
        Note.course != ''
    ).scalar()

    # Recent notes (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_notes = db.query(func.count(Note.id)).filter(
        Note.profile_id == profile_id,
        Note.profile_type == profile_type,
        Note.last_modified >= week_ago
    ).scalar()

    # Favorite notes
    favorite_notes = db.query(func.count(Note.id)).filter(
        Note.profile_id == profile_id,
        Note.profile_type == profile_type,
        Note.is_favorite == True
    ).scalar()

    # Notes with media
    notes_with_media = db.query(func.count(Note.id)).filter(
        Note.profile_id == profile_id,
        Note.profile_type == profile_type,
        Note.has_media == True
    ).scalar()

    return {
        "total_notes": total_notes,
        "total_words": total_words,
        "total_courses": total_courses,
        "recent_notes": recent_notes,
        "favorite_notes": favorite_notes,
        "notes_with_media": notes_with_media
    }

@router.get("/courses", response_model=List[str])
async def get_user_courses(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all unique courses from user's notes for autocomplete"""

    courses = db.query(Note.course).filter(
        Note.profile_id == current_user.profile_id,
        Note.profile_type == current_user.profile_type,
        Note.course.isnot(None),
        Note.course != ''
    ).distinct().all()

    return [course[0] for course in courses]

@router.get("/tutors", response_model=List[str])
async def get_user_tutors(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all unique tutors from user's notes for autocomplete"""

    tutors = db.query(Note.tutor).filter(
        Note.profile_id == current_user.profile_id,
        Note.profile_type == current_user.profile_type,
        Note.tutor.isnot(None),
        Note.tutor != ''
    ).distinct().all()

    return [tutor[0] for tutor in tutors]

@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific note by ID"""

    note = db.query(Note).filter(
        Note.id == note_id,
        Note.profile_id == current_user.profile_id,
        Note.profile_type == current_user.profile_type
    ).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    return note

@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    note_data: NoteUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a note"""

    note = db.query(Note).filter(
        Note.id == note_id,
        Note.profile_id == current_user.profile_id,
        Note.profile_type == current_user.profile_type
    ).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    # Update fields
    update_data = note_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(note, field, value)

    note.last_modified = datetime.utcnow()

    db.commit()
    db.refresh(note)

    return note

@router.patch("/{note_id}/favorite", response_model=NoteResponse)
async def toggle_favorite(
    note_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle note favorite status"""

    note = db.query(Note).filter(
        Note.id == note_id,
        Note.profile_id == current_user.profile_id,
        Note.profile_type == current_user.profile_type
    ).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    note.is_favorite = not note.is_favorite
    note.last_modified = datetime.utcnow()

    db.commit()
    db.refresh(note)

    return note

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a note"""

    note = db.query(Note).filter(
        Note.id == note_id,
        Note.profile_id == current_user.profile_id,
        Note.profile_type == current_user.profile_type
    ).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    db.delete(note)
    db.commit()

    return None

@router.post("/{note_id}/duplicate", response_model=NoteResponse)
async def duplicate_note(
    note_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Duplicate an existing note"""

    original = db.query(Note).filter(
        Note.id == note_id,
        Note.profile_id == current_user.profile_id,
        Note.profile_type == current_user.profile_type
    ).first()

    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    # Create duplicate
    duplicate = Note(
        profile_id=current_user.profile_id,
        profile_type=current_user.profile_type,
        title=f"{original.title} (Copy)",
        content=original.content,
        date=datetime.utcnow(),
        course=original.course,
        tutor=original.tutor,
        tags=original.tags,
        background=original.background,
        background_url=original.background_url,
        is_favorite=False,
        word_count=original.word_count,
        has_media=False
    )

    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)

    return duplicate

# ============================================
# NOTE MEDIA ENDPOINTS
# ============================================

@router.post("/{note_id}/media", response_model=NoteMediaResponse, status_code=status.HTTP_201_CREATED)
async def upload_note_media(
    note_id: int,
    media_type: str = Query(..., regex="^(audio|video)$"),
    file: UploadFile = File(...),
    transcription: Optional[str] = None,
    transcription_language: Optional[str] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload voice or video recording to a note"""

    # Verify note ownership
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.profile_id == current_user.profile_id,
        Note.profile_type == current_user.profile_type
    ).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    # Validate file type
    allowed_audio = ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg']
    allowed_video = ['video/webm', 'video/mp4', 'video/mov']

    if media_type == 'audio' and file.content_type not in allowed_audio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid audio file type"
        )

    if media_type == 'video' and file.content_type not in allowed_video:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid video file type"
        )

    # Read file
    file_content = await file.read()
    file_size = len(file_content)

    # Upload to Backblaze B2
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'webm'
    unique_filename = f"notes/{media_type}/{current_user.id}/{uuid.uuid4()}.{file_extension}"

    try:
        b2_service = get_backblaze_service()
        file_url = b2_service.upload_file(file_content, unique_filename, file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )

    # Create media record
    media = NoteMedia(
        note_id=note_id,
        media_type=media_type,
        file_url=file_url,
        file_size=file_size,
        mime_type=file.content_type,
        transcription=transcription,
        transcription_language=transcription_language
    )

    db.add(media)

    # Update note has_media flag
    note.has_media = True
    note.last_modified = datetime.utcnow()

    db.commit()
    db.refresh(media)

    return media

@router.get("/{note_id}/media", response_model=List[NoteMediaResponse])
async def get_note_media(
    note_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all media for a note"""

    # Verify note ownership
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.profile_id == current_user.profile_id,
        Note.profile_type == current_user.profile_type
    ).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    media = db.query(NoteMedia).filter(NoteMedia.note_id == note_id).all()

    return media

@router.delete("/{note_id}/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note_media(
    note_id: int,
    media_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a media file from a note"""

    # Verify note ownership
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.profile_id == current_user.profile_id,
        Note.profile_type == current_user.profile_type
    ).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    media = db.query(NoteMedia).filter(
        NoteMedia.id == media_id,
        NoteMedia.note_id == note_id
    ).first()

    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )

    db.delete(media)

    # Update note has_media flag if no more media
    remaining_media = db.query(NoteMedia).filter(NoteMedia.note_id == note_id).count()
    if remaining_media == 0:
        note.has_media = False

    note.last_modified = datetime.utcnow()

    db.commit()

    return None

# ============================================
# NOTE EXPORT ENDPOINTS
# ============================================

@router.post("/{note_id}/export", response_model=NoteExportResponse, status_code=status.HTTP_201_CREATED)
async def track_note_export(
    note_id: int,
    export_data: NoteExportCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Track note export (for analytics)"""

    # Verify note ownership
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.profile_id == current_user.profile_id,
        Note.profile_type == current_user.profile_type
    ).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    # Create export record
    export = NoteExport(
        note_id=note_id,
        profile_id=current_user.profile_id,
        profile_type=current_user.profile_type,
        export_format=export_data.export_format,
        file_url=export_data.file_url
    )

    db.add(export)
    db.commit()
    db.refresh(export)

    return export

@router.get("/{note_id}/exports", response_model=List[NoteExportResponse])
async def get_note_exports(
    note_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get export history for a note"""

    # Verify note ownership
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.profile_id == current_user.profile_id,
        Note.profile_type == current_user.profile_type
    ).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    exports = db.query(NoteExport).filter(NoteExport.note_id == note_id).order_by(desc(NoteExport.exported_at)).all()

    return exports
