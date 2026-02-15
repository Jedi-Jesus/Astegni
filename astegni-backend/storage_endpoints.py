"""
Storage Usage API Endpoints
Provides storage quota and usage information to frontend
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from pydantic import BaseModel

# Import models using importlib to handle space in directory name
import importlib.util
spec = importlib.util.spec_from_file_location("models", "app.py modules/models.py")
models_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(models_module)
SessionLocal = models_module.SessionLocal
User = models_module.User

from utils import get_current_user
from storage_service import StorageService

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class StorageUsageResponse(BaseModel):
    """Response model for storage usage"""
    # Usage (in bytes)
    images_size: int
    videos_size: int
    documents_size: int
    audios_size: int
    total_size: int

    # File counts
    images_count: int
    videos_count: int
    documents_count: int
    audios_count: int

    # Limits (from subscription)
    max_image_size_mb: float
    max_video_size_mb: float
    max_document_size_mb: float
    max_audio_size_mb: float
    storage_limit_gb: float
    max_image_storage_mb: float
    max_video_storage_mb: float

    # Calculated values
    usage_percentage: float
    remaining_bytes: int
    can_upload: bool

    # Subscription info
    subscription_plan: Any

    class Config:
        from_attributes = True


@router.get("/api/storage/usage", response_model=Dict)
async def get_storage_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive storage usage information for current user

    Returns:
        - Current storage usage by type (images, videos, documents, audios)
        - Storage limits based on subscription plan
        - Usage percentage
        - Remaining storage available
        - Whether user can upload more files
    """
    try:
        summary = StorageService.get_storage_summary(db, current_user.id)

        # Convert bytes to more readable units
        total_mb = summary['usage']['total_size'] / (1024 * 1024)
        remaining_mb = summary['remaining_bytes'] / (1024 * 1024)
        remaining_gb = remaining_mb / 1024

        return {
            "success": True,
            "usage": {
                "images_size": summary['usage']['images_size'],
                "videos_size": summary['usage']['videos_size'],
                "documents_size": summary['usage']['documents_size'],
                "audios_size": summary['usage']['audios_size'],
                "total_size": summary['usage']['total_size'],
                "images_count": summary['usage']['images_count'],
                "videos_count": summary['usage']['videos_count'],
                "documents_count": summary['usage']['documents_count'],
                "audios_count": summary['usage']['audios_count']
            },
            "limits": summary['limits'],
            "summary": {
                "total_used_mb": round(total_mb, 2),
                "total_used_gb": round(total_mb / 1024, 2),
                "storage_limit_gb": summary['limits']['storage_limit_gb'],
                "usage_percentage": summary['usage_percentage'],
                "remaining_mb": round(remaining_mb, 2),
                "remaining_gb": round(remaining_gb, 2),
                "can_upload": summary['can_upload']
            },
            "subscription_plan": summary['limits']['subscription_plan']
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/storage/validate")
async def validate_storage_before_upload(
    file_size_mb: float,
    file_type: str,  # 'image', 'video', 'document', 'audio'
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validate if a file can be uploaded before actually uploading

    Args:
        file_size_mb: Size of file in megabytes
        file_type: Type of file ('image', 'video', 'document', 'audio')

    Returns:
        - is_allowed: Boolean indicating if upload is allowed
        - error_message: Error message if upload not allowed
        - remaining_storage: Remaining storage in bytes
    """
    try:
        file_size_bytes = int(file_size_mb * 1024 * 1024)

        is_allowed, error_message = StorageService.validate_file_upload(
            db=db,
            user_id=current_user.id,
            file_size_bytes=file_size_bytes,
            file_type=file_type
        )

        # Get remaining storage
        summary = StorageService.get_storage_summary(db, current_user.id)

        return {
            "success": True,
            "is_allowed": is_allowed,
            "error_message": error_message,
            "remaining_storage_bytes": summary['remaining_bytes'],
            "remaining_storage_mb": round(summary['remaining_bytes'] / (1024 * 1024), 2),
            "usage_percentage": summary['usage_percentage']
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/storage/limits")
async def get_storage_limits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get storage limits for current user based on subscription plan

    Returns file size limits and total storage quota
    """
    try:
        limits = StorageService.get_user_subscription_limits(db, current_user.id)

        return {
            "success": True,
            "limits": limits
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/storage/breakdown")
async def get_storage_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed storage breakdown by media type

    Useful for displaying storage usage charts/graphs
    """
    try:
        usage = StorageService.get_user_storage_usage(db, current_user.id)
        limits = StorageService.get_user_subscription_limits(db, current_user.id)

        # Calculate percentages for each media type
        total_limit_bytes = limits['storage_limit_gb'] * 1024 * 1024 * 1024

        breakdown = {
            "images": {
                "size_bytes": usage['images_size'],
                "size_mb": round(usage['images_size'] / (1024 * 1024), 2),
                "count": usage['images_count'],
                "percentage_of_total": round((usage['images_size'] / total_limit_bytes * 100), 2) if total_limit_bytes > 0 else 0,
                "limit_mb": limits.get('max_image_storage_mb', 2560)
            },
            "videos": {
                "size_bytes": usage['videos_size'],
                "size_mb": round(usage['videos_size'] / (1024 * 1024), 2),
                "count": usage['videos_count'],
                "percentage_of_total": round((usage['videos_size'] / total_limit_bytes * 100), 2) if total_limit_bytes > 0 else 0,
                "limit_mb": limits.get('max_video_storage_mb', 2560)
            },
            "documents": {
                "size_bytes": usage['documents_size'],
                "size_mb": round(usage['documents_size'] / (1024 * 1024), 2),
                "count": usage['documents_count'],
                "percentage_of_total": round((usage['documents_size'] / total_limit_bytes * 100), 2) if total_limit_bytes > 0 else 0
            },
            "audios": {
                "size_bytes": usage['audios_size'],
                "size_mb": round(usage['audios_size'] / (1024 * 1024), 2),
                "count": usage['audios_count'],
                "percentage_of_total": round((usage['audios_size'] / total_limit_bytes * 100), 2) if total_limit_bytes > 0 else 0
            },
            "total": {
                "size_bytes": usage['total_size'],
                "size_mb": round(usage['total_size'] / (1024 * 1024), 2),
                "size_gb": round(usage['total_size'] / (1024 * 1024 * 1024), 2),
                "limit_gb": limits['storage_limit_gb'],
                "percentage": round((usage['total_size'] / total_limit_bytes * 100), 2) if total_limit_bytes > 0 else 0
            }
        }

        return {
            "success": True,
            "breakdown": breakdown
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
