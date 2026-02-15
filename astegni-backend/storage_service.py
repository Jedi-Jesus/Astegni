"""
Storage Service for managing user storage limits and validation
Enforces subscription-based storage quotas
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Tuple, Optional
from datetime import datetime


class StorageService:
    """Service for managing user storage limits and usage tracking"""

    # Default file size limits (in MB) when no subscription found
    DEFAULT_LIMITS = {
        'max_image_size_mb': 5,
        'max_video_size_mb': 50,
        'max_document_size_mb': 10,
        'max_audio_size_mb': 10,
        'storage_limit_gb': 5  # 5GB default
    }

    @staticmethod
    def get_user_subscription_limits(db: Session, user_id: int) -> Dict:
        """
        Get storage limits for a user based on their subscription plan

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Dictionary with storage limits:
            {
                'max_image_size_mb': float,
                'max_video_size_mb': float,
                'max_document_size_mb': float,
                'max_audio_size_mb': float,
                'storage_limit_gb': float,
                'max_image_storage_mb': float,
                'max_video_storage_mb': float,
                'subscription_plan': str or None
            }
        """
        # Import models using importlib to handle space in directory name
        import importlib.util

        # Load User model
        spec_user = importlib.util.spec_from_file_location("models", "app.py modules/models.py")
        models_module = importlib.util.module_from_spec(spec_user)
        spec_user.loader.exec_module(models_module)
        User = models_module.User

        # Load admin models
        spec_admin = importlib.util.spec_from_file_location("admin_models", "app.py modules/admin_models.py")
        admin_module = importlib.util.module_from_spec(spec_admin)
        spec_admin.loader.exec_module(admin_module)
        AdminSessionLocal = admin_module.AdminSessionLocal
        SystemMediaSettings = admin_module.SystemMediaSettings

        # Get user's subscription plan ID
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.subscription_plan_id:
            # Return default limits for users without subscription
            return {
                **StorageService.DEFAULT_LIMITS,
                'max_image_storage_mb': 2560,  # 2.5 GB
                'max_video_storage_mb': 2560,  # 2.5 GB
                'subscription_plan': None
            }

        # Query admin database for subscription limits
        admin_db = AdminSessionLocal()
        try:
            media_settings = admin_db.query(SystemMediaSettings).filter(
                SystemMediaSettings.subscription_plan_id == user.subscription_plan_id
            ).first()

            if not media_settings:
                # No settings found, use defaults
                return {
                    **StorageService.DEFAULT_LIMITS,
                    'max_image_storage_mb': 2560,
                    'max_video_storage_mb': 2560,
                    'subscription_plan': user.subscription_plan_id
                }

            return {
                'max_image_size_mb': media_settings.max_image_size_mb or 5,
                'max_video_size_mb': media_settings.max_video_size_mb or 50,
                'max_document_size_mb': media_settings.max_document_size_mb or 10,
                'max_audio_size_mb': media_settings.max_audio_size_mb or 10,
                'storage_limit_gb': media_settings.storage_limit_gb or 5,
                'max_image_storage_mb': media_settings.max_image_storage_mb or 2560,
                'max_video_storage_mb': media_settings.max_video_storage_mb or 2560,
                'subscription_plan': user.subscription_plan_id
            }
        finally:
            admin_db.close()

    @staticmethod
    def get_user_storage_usage(db: Session, user_id: int) -> Dict:
        """
        Get current storage usage for a user

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Dictionary with storage usage:
            {
                'images_size': int (bytes),
                'videos_size': int (bytes),
                'documents_size': int (bytes),
                'audios_size': int (bytes),
                'total_size': int (bytes),
                'images_count': int,
                'videos_count': int,
                'documents_count': int,
                'audios_count': int
            }
        """
        # Import models using importlib
        import importlib.util
        spec = importlib.util.spec_from_file_location("models", "app.py modules/models.py")
        models_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(models_module)
        UserStorageUsage = models_module.UserStorageUsage

        usage = db.query(UserStorageUsage).filter(
            UserStorageUsage.user_id == user_id
        ).first()

        if not usage:
            # Create initial storage record
            usage = UserStorageUsage(
                user_id=user_id,
                images_size=0,
                videos_size=0,
                documents_size=0,
                audios_size=0,
                total_size=0,
                images_count=0,
                videos_count=0,
                documents_count=0,
                audios_count=0
            )
            db.add(usage)
            db.commit()
            db.refresh(usage)

        return {
            'images_size': usage.images_size,
            'videos_size': usage.videos_size,
            'documents_size': usage.documents_size,
            'audios_size': usage.audios_size,
            'total_size': usage.total_size,
            'images_count': usage.images_count,
            'videos_count': usage.videos_count,
            'documents_count': usage.documents_count,
            'audios_count': usage.audios_count
        }

    @staticmethod
    def validate_file_upload(
        db: Session,
        user_id: int,
        file_size_bytes: int,
        file_type: str  # 'image', 'video', 'document', 'audio'
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate if a file upload is allowed based on subscription limits

        Args:
            db: Database session
            user_id: User ID
            file_size_bytes: Size of file in bytes
            file_type: Type of file ('image', 'video', 'document', 'audio')

        Returns:
            Tuple of (is_allowed: bool, error_message: str or None)
        """
        # Get user's subscription limits
        limits = StorageService.get_user_subscription_limits(db, user_id)

        # Get current storage usage
        usage = StorageService.get_user_storage_usage(db, user_id)

        # Convert file size to MB
        file_size_mb = file_size_bytes / (1024 * 1024)

        # Check individual file size limit
        file_type_key = f'max_{file_type}_size_mb'
        max_file_size = limits.get(file_type_key, 10)

        if file_size_mb > max_file_size:
            return False, f"File size ({file_size_mb:.2f} MB) exceeds maximum allowed size ({max_file_size} MB) for {file_type}s"

        # Check total storage limit
        storage_limit_bytes = limits['storage_limit_gb'] * 1024 * 1024 * 1024  # Convert GB to bytes
        total_after_upload = usage['total_size'] + file_size_bytes

        if total_after_upload > storage_limit_bytes:
            used_gb = usage['total_size'] / (1024 * 1024 * 1024)
            limit_gb = limits['storage_limit_gb']
            return False, f"Storage limit exceeded. You've used {used_gb:.2f} GB of {limit_gb} GB. Upgrade your subscription for more storage."

        # Check type-specific storage limits (for images and videos)
        if file_type == 'image':
            max_image_storage_bytes = limits.get('max_image_storage_mb', 2560) * 1024 * 1024
            images_after_upload = usage['images_size'] + file_size_bytes
            if images_after_upload > max_image_storage_bytes:
                used_mb = usage['images_size'] / (1024 * 1024)
                limit_mb = limits.get('max_image_storage_mb', 2560)
                return False, f"Image storage limit exceeded. You've used {used_mb:.2f} MB of {limit_mb} MB for images."

        elif file_type == 'video':
            max_video_storage_bytes = limits.get('max_video_storage_mb', 2560) * 1024 * 1024
            videos_after_upload = usage['videos_size'] + file_size_bytes
            if videos_after_upload > max_video_storage_bytes:
                used_mb = usage['videos_size'] / (1024 * 1024)
                limit_mb = limits.get('max_video_storage_mb', 2560)
                return False, f"Video storage limit exceeded. You've used {used_mb:.2f} MB of {limit_mb} MB for videos."

        # All checks passed
        return True, None

    @staticmethod
    def update_storage_usage(
        db: Session,
        user_id: int,
        file_size_bytes: int,
        file_type: str,  # 'image', 'video', 'document', 'audio'
        operation: str = 'add'  # 'add' or 'remove'
    ):
        """
        Update user's storage usage after upload or deletion

        Args:
            db: Database session
            user_id: User ID
            file_size_bytes: Size of file in bytes
            file_type: Type of file ('image', 'video', 'document', 'audio')
            operation: 'add' for upload, 'remove' for deletion
        """
        # Import models using importlib
        import importlib.util
        spec = importlib.util.spec_from_file_location("models", "app.py modules/models.py")
        models_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(models_module)
        UserStorageUsage = models_module.UserStorageUsage

        # Get or create storage usage record
        usage = db.query(UserStorageUsage).filter(
            UserStorageUsage.user_id == user_id
        ).first()

        if not usage:
            usage = UserStorageUsage(user_id=user_id)
            db.add(usage)

        # Calculate delta (positive for add, negative for remove)
        delta = file_size_bytes if operation == 'add' else -file_size_bytes
        count_delta = 1 if operation == 'add' else -1

        # Update appropriate fields based on file type
        if file_type == 'image':
            usage.images_size = max(0, (usage.images_size or 0) + delta)
            usage.images_count = max(0, (usage.images_count or 0) + count_delta)
        elif file_type == 'video':
            usage.videos_size = max(0, (usage.videos_size or 0) + delta)
            usage.videos_count = max(0, (usage.videos_count or 0) + count_delta)
        elif file_type == 'document':
            usage.documents_size = max(0, (usage.documents_size or 0) + delta)
            usage.documents_count = max(0, (usage.documents_count or 0) + count_delta)
        elif file_type == 'audio':
            usage.audios_size = max(0, (usage.audios_size or 0) + delta)
            usage.audios_count = max(0, (usage.audios_count or 0) + count_delta)

        # Update total
        usage.total_size = max(0, (
            (usage.images_size or 0) +
            (usage.videos_size or 0) +
            (usage.documents_size or 0) +
            (usage.audios_size or 0)
        ))

        usage.last_calculated_at = datetime.utcnow()

        db.commit()
        db.refresh(usage)

    @staticmethod
    def get_storage_summary(db: Session, user_id: int) -> Dict:
        """
        Get comprehensive storage summary for user including limits and usage

        Returns:
            {
                'limits': {...},
                'usage': {...},
                'usage_percentage': float,
                'remaining_bytes': int,
                'can_upload': bool
            }
        """
        limits = StorageService.get_user_subscription_limits(db, user_id)
        usage = StorageService.get_user_storage_usage(db, user_id)

        storage_limit_bytes = limits['storage_limit_gb'] * 1024 * 1024 * 1024
        usage_percentage = (usage['total_size'] / storage_limit_bytes * 100) if storage_limit_bytes > 0 else 0
        remaining_bytes = max(0, storage_limit_bytes - usage['total_size'])

        return {
            'limits': limits,
            'usage': usage,
            'usage_percentage': round(usage_percentage, 2),
            'remaining_bytes': remaining_bytes,
            'can_upload': remaining_bytes > 0
        }
