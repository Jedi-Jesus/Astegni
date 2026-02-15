"""
Backblaze B2 Service for file uploads with organized folder structure
"""

import os
from typing import Optional, Dict, Any
import logging
from datetime import datetime
import mimetypes
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

try:
    from b2sdk.v2 import InMemoryAccountInfo, B2Api
    B2_AVAILABLE = True
except ImportError:
    B2_AVAILABLE = False

logger = logging.getLogger(__name__)


class BackblazeService:
    """Backblaze B2 service with organized folder structure"""

    # File type to folder mapping
    FOLDER_MAPPING = {
        # General types
        'image': 'images/',
        'audio': 'audio/',
        'video': 'videos/',
        'document': 'documents/',

        # Image specific folders
        'post_image': 'images/posts/',
        'chat_image': 'images/chat/',
        'profile': 'images/profile/',
        'cover': 'images/cover/',
        'thumbnail': 'images/thumbnails/',
        'blog_image': 'images/blog/',
        'news_image': 'images/news/',
        'story_image': 'images/stories/',  # Image stories (profile-based separation)
        'campaign_image': 'images/campaigns/',  # Campaign ad images
        'brand_logo': 'images/brands/',  # Brand logos

        # Audio specific folders
        'lecture_audio': 'audio/lectures/',
        'podcast': 'audio/podcasts/',
        'chat_audio': 'audio/chat/',
        'voice_message': 'audio/chat/',

        # Video specific folders
        'ad': 'videos/ad/',
        'ad_video': 'videos/ad/',
        'lecture_video': 'videos/lectures/',
        'chat_video': 'videos/chat/',
        'program': 'videos/programs/',
        'program_video': 'videos/programs/',
        'story_video': 'videos/stories/',  # Video stories (profile-based separation)
        'story': 'videos/stories/',  # Default story type maps to video
        'user_story': 'videos/stories/',
        'campaign_video': 'videos/campaigns/',  # Campaign ad videos

        # Document specific folders
        'chat_document': 'documents/chat/',
        'resource': 'documents/resources/',
        'resource_document': 'documents/resources/',
        'files': 'documents/files/',  # Student files (achievements, certificates, extracurricular)
        'student_files': 'documents/files/',

        # KYC verification images
        'kyc_document': 'images/kyc/documents/',  # Digital ID, passport photos
        'kyc_selfie': 'images/kyc/selfies/',  # Selfie photos for face matching
        'kyc': 'images/kyc/',  # General KYC folder

        # Company verification documents (for advertisers)
        'business_license': 'documents/company/business_license/',  # Business license documents
        'tin_certificate': 'documents/company/tin_certificate/',  # TIN certificate documents
        'company_logo': 'images/company/logos/',  # Company logos
        'company_document': 'documents/company/',  # General company documents
        'additional_company_docs': 'documents/company/additional/'  # Additional company documents
    }

    def __init__(self):
        self.configured = False
        self.bucket = None
        self.b2_api = None

        if B2_AVAILABLE:
            self._initialize_b2()
        else:
            logger.warning("B2SDK not installed - using mock implementation")

    def _initialize_b2(self):
        """Initialize B2 connection"""
        try:
            key_id = os.getenv('BACKBLAZE_KEY_ID')
            app_key = os.getenv('BACKBLAZE_APPLICATION_KEY')
            bucket_name = os.getenv('BACKBLAZE_BUCKET_NAME', 'astegni-media')

            if key_id and app_key:
                info = InMemoryAccountInfo()
                self.b2_api = B2Api(info)
                self.b2_api.authorize_account("production", key_id, app_key)
                self.bucket = self.b2_api.get_bucket_by_name(bucket_name)
                self.configured = True
                logger.info(f"Connected to Backblaze B2 bucket: {bucket_name}")
            else:
                logger.warning("Backblaze credentials not found in environment")
        except Exception as e:
            logger.error(f"Failed to initialize Backblaze: {str(e)}")
            self.configured = False

    def _get_folder_path(self, file_type: str, file_name: str, user_id: str = None) -> str:
        """
        Determine the appropriate folder path based on file type and user

        Args:
            file_type: Type of file (e.g., 'profile', 'video', 'document')
            file_name: Original file name
            user_id: User ID for file organization

        Returns:
            Complete path with folder structure including user separation
        """
        # Get base folder from mapping
        folder = self.FOLDER_MAPPING.get(file_type, '')

        # If no specific type provided, determine from file extension
        if not folder:
            ext = os.path.splitext(file_name)[1].lower()
            if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']:
                folder = 'images/posts/'  # Default images to posts folder
            elif ext in ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']:
                folder = 'videos/programs/'  # Default videos to programs folder
            elif ext in ['.mp3', '.wav', '.ogg', '.m4a', '.flac']:
                folder = 'audio/lectures/'  # Default audio to lectures folder
            elif ext in ['.pdf', '.doc', '.docx', '.txt', '.odt', '.rtf']:
                folder = 'documents/resources/'  # Default documents to resources folder
            else:
                folder = 'documents/resources/'  # Default to resources

        # Add user ID to path if provided
        if user_id:
            # Create user-specific path: type/category/user_id/filename
            folder = f"{folder}user_{user_id}/"

        # Add timestamp to prevent naming conflicts
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        name_parts = os.path.splitext(file_name)

        # Create a clean filename
        clean_name = name_parts[0].replace(' ', '_').replace('/', '_').replace('\\', '_')
        unique_name = f"{clean_name}_{timestamp}{name_parts[1]}"

        return f"{folder}{unique_name}"

    def upload_file(
        self,
        file_data: bytes,
        file_name: str,
        file_type: str = None,
        content_type: str = None,
        user_id: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        Upload file to Backblaze B2 with organized folder structure

        Args:
            file_data: File content as bytes
            file_name: Original file name
            file_type: Type of file for folder organization
            content_type: MIME type of the file
            user_id: User ID for file organization

        Returns:
            Dict with file information or None on failure
        """
        if not content_type:
            content_type = mimetypes.guess_type(file_name)[0] or 'application/octet-stream'

        # Get organized path with user separation
        file_path = self._get_folder_path(file_type, file_name, user_id)

        if not self.configured or not B2_AVAILABLE:
            logger.warning(f"B2 not configured - would upload to: {file_path}")
            return {
                'fileId': 'mock_file_id',
                'fileName': file_path,
                'uploadTimestamp': datetime.now().isoformat(),
                'url': f'https://mock.backblazeb2.com/{file_path}',
                'folder': file_path.rsplit('/', 1)[0] + '/'
            }

        try:
            # Upload to B2
            file_info = self.bucket.upload_bytes(
                file_data,
                file_path,
                content_type=content_type
            )

            # Get public URL
            download_url = self.bucket.get_download_url(file_path)

            result = {
                'fileId': file_info.id_,
                'fileName': file_path,
                'uploadTimestamp': file_info.upload_timestamp,
                'url': download_url,
                'folder': file_path.rsplit('/', 1)[0] + '/',
                'size': file_info.size
            }

            logger.info(f"Successfully uploaded file to: {file_path}")
            return result

        except Exception as e:
            logger.error(f"Failed to upload file: {str(e)}")
            return None

    def upload_file_to_folder(
        self,
        file_data: bytes,
        file_name: str,
        folder_path: str,
        content_type: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        Upload file to a specific folder path in Backblaze B2

        Args:
            file_data: File content as bytes
            file_name: Original file name
            folder_path: Custom folder path (e.g., 'images/user_115/BrandName/CampaignName/')
            content_type: MIME type of the file

        Returns:
            Dict with file information or None on failure
        """
        if not content_type:
            content_type = mimetypes.guess_type(file_name)[0] or 'application/octet-stream'

        # Add timestamp to prevent naming conflicts
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        name_parts = os.path.splitext(file_name)

        # Create a clean filename
        clean_name = name_parts[0].replace(' ', '_').replace('/', '_').replace('\\', '_')
        unique_name = f"{clean_name}_{timestamp}{name_parts[1]}"

        # Ensure folder path ends with /
        if not folder_path.endswith('/'):
            folder_path += '/'

        # Build full path
        file_path = f"{folder_path}{unique_name}"

        if not self.configured or not B2_AVAILABLE:
            logger.warning(f"B2 not configured - would upload to: {file_path}")
            return {
                'fileId': 'mock_file_id',
                'fileName': file_path,
                'uploadTimestamp': datetime.now().isoformat(),
                'url': f'https://mock.backblazeb2.com/{file_path}',
                'folder': folder_path
            }

        try:
            # Upload to B2
            file_info = self.bucket.upload_bytes(
                file_data,
                file_path,
                content_type=content_type
            )

            # Get public URL
            download_url = self.bucket.get_download_url(file_path)

            result = {
                'fileId': file_info.id_,
                'fileName': file_path,
                'uploadTimestamp': file_info.upload_timestamp,
                'url': download_url,
                'folder': folder_path,
                'size': file_info.size
            }

            logger.info(f"Successfully uploaded file to: {file_path}")
            return result

        except Exception as e:
            logger.error(f"Failed to upload file to folder: {str(e)}")
            return None

    def download_file(self, file_path: str) -> Optional[bytes]:
        """Download file from B2"""
        if not self.configured or not B2_AVAILABLE:
            logger.warning("B2 not configured - download simulated")
            return None

        try:
            download = self.bucket.download_file_by_name(file_path)
            content = b''
            for chunk in download.response.iter_content(chunk_size=1024):
                content += chunk
            return content
        except Exception as e:
            logger.error(f"Failed to download file: {str(e)}")
            return None

    def delete_file(self, file_path: str, file_id: str = None) -> bool:
        """Delete file from B2"""
        if not self.configured or not B2_AVAILABLE:
            logger.warning("B2 not configured - deletion simulated")
            return True

        try:
            if not file_id:
                # Get file info if ID not provided
                file_info = self.bucket.get_file_info_by_name(file_path)
                file_id = file_info.id_

            self.bucket.delete_file_version(file_id, file_path)
            logger.info(f"Successfully deleted file: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file: {str(e)}")
            return False

    def list_user_files(self, user_id: str, file_type: str = None, limit: int = 100) -> list:
        """
        List files for a specific user

        Args:
            user_id: User ID to filter files
            file_type: Optional file type to filter (e.g., 'profile', 'video')
            limit: Maximum number of files to return

        Returns:
            List of file information dictionaries
        """
        if not self.configured or not B2_AVAILABLE:
            logger.warning("B2 not configured - listing simulated")
            return []

        try:
            # Build the folder path to search
            if file_type and file_type in self.FOLDER_MAPPING:
                base_folder = f"{self.FOLDER_MAPPING[file_type]}user_{user_id}/"
            else:
                # Search across all user folders
                base_folder = None

            files = []
            search_pattern = f"user_{user_id}/" if base_folder is None else base_folder

            for file_info, _ in self.bucket.ls(
                folder_to_list=base_folder,
                recursive=True if base_folder is None else False,
                fetch_count=limit
            ):
                # Filter for user's files if searching across all folders
                if search_pattern in file_info.file_name:
                    files.append({
                        'fileName': file_info.file_name,
                        'fileId': file_info.id_,
                        'size': file_info.size,
                        'uploadTimestamp': file_info.upload_timestamp,
                        'url': self.bucket.get_download_url(file_info.file_name)
                    })

            return files
        except Exception as e:
            logger.error(f"Failed to list user files: {str(e)}")
            return []

    def delete_user_file(self, user_id: str, file_path: str) -> bool:
        """
        Delete a specific user's file

        Args:
            user_id: User ID who owns the file
            file_path: Path to the file

        Returns:
            True if deleted successfully, False otherwise
        """
        if not self.configured or not B2_AVAILABLE:
            logger.warning("B2 not configured - deletion simulated")
            return True

        try:
            # Verify the file belongs to the user
            if f"user_{user_id}/" not in file_path:
                logger.error(f"User {user_id} does not own file {file_path}")
                return False

            file_info = self.bucket.get_file_info_by_name(file_path)
            self.bucket.delete_file_version(file_info.id_, file_path)
            logger.info(f"Successfully deleted user file: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete user file: {str(e)}")
            return False

    def get_user_storage_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get storage statistics for a specific user

        Args:
            user_id: User ID to get stats for

        Returns:
            Dictionary with storage statistics
        """
        if not self.configured or not B2_AVAILABLE:
            return {
                'totalFiles': 0,
                'totalSize': 0,
                'breakdown': {}
            }

        try:
            stats = {
                'totalFiles': 0,
                'totalSize': 0,
                'breakdown': {
                    'images': {'count': 0, 'size': 0},
                    'videos': {'count': 0, 'size': 0},
                    'audio': {'count': 0, 'size': 0},
                    'documents': {'count': 0, 'size': 0}
                }
            }

            search_pattern = f"user_{user_id}/"

            for file_info, _ in self.bucket.ls(recursive=True, fetch_count=10000):
                if search_pattern in file_info.file_name:
                    stats['totalFiles'] += 1
                    stats['totalSize'] += file_info.size

                    # Categorize by type
                    if '/images/' in file_info.file_name:
                        stats['breakdown']['images']['count'] += 1
                        stats['breakdown']['images']['size'] += file_info.size
                    elif '/videos/' in file_info.file_name:
                        stats['breakdown']['videos']['count'] += 1
                        stats['breakdown']['videos']['size'] += file_info.size
                    elif '/audio/' in file_info.file_name:
                        stats['breakdown']['audio']['count'] += 1
                        stats['breakdown']['audio']['size'] += file_info.size
                    elif '/documents/' in file_info.file_name:
                        stats['breakdown']['documents']['count'] += 1
                        stats['breakdown']['documents']['size'] += file_info.size

            # Convert sizes to human readable format
            stats['totalSizeFormatted'] = self._format_size(stats['totalSize'])
            for category in stats['breakdown']:
                size = stats['breakdown'][category]['size']
                stats['breakdown'][category]['sizeFormatted'] = self._format_size(size)

            return stats
        except Exception as e:
            logger.error(f"Failed to get user storage stats: {str(e)}")
            return {
                'totalFiles': 0,
                'totalSize': 0,
                'breakdown': {}
            }

    def _format_size(self, size_bytes: int) -> str:
        """Convert bytes to human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} PB"

    def list_files(self, folder: str = None, limit: int = 100) -> list:
        """List files in a specific folder"""
        if not self.configured or not B2_AVAILABLE:
            logger.warning("B2 not configured - listing simulated")
            return []

        try:
            files = []
            for file_info, _ in self.bucket.ls(
                folder_to_list=folder,
                recursive=False,
                fetch_count=limit
            ):
                files.append({
                    'fileName': file_info.file_name,
                    'fileId': file_info.id_,
                    'size': file_info.size,
                    'uploadTimestamp': file_info.upload_timestamp
                })
            return files
        except Exception as e:
            logger.error(f"Failed to list files: {str(e)}")
            return []

    def get_file_url(self, file_path: str) -> str:
        """Get public URL for a file"""
        if self.configured and self.bucket:
            return self.bucket.get_download_url(file_path)
        return f'https://mock.backblazeb2.com/{file_path}'


# Singleton instance
_backblaze_service = None


def get_backblaze_service() -> BackblazeService:
    """Get or create the Backblaze service instance"""
    global _backblaze_service
    if _backblaze_service is None:
        _backblaze_service = BackblazeService()
    return _backblaze_service