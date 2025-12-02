"""
Configuration settings for Astegni Educational Platform
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============================================
# DATABASE CONFIGURATION
# ============================================

# User Database (main application data - users, tutors, sessions, content, etc.)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"
)

# Admin Database (admin-only data - logs, settings, moderation, analytics, etc.)
ADMIN_DATABASE_URL = os.getenv(
    "ADMIN_DATABASE_URL",
    "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db"
)

# Convert DATABASE_URLs for psycopg3
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

if ADMIN_DATABASE_URL.startswith("postgresql://"):
    ADMIN_DATABASE_URL = ADMIN_DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

# ============================================
# SECURITY CONFIGURATION
# ============================================

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY", "your-refresh-secret-key-change-in-production")
ALGORITHM = "HS256"

# ============================================
# TOKEN EXPIRATION SETTINGS
# ============================================

ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
REMEMBER_ME_EXPIRE_DAYS = 30

# ============================================
# FILE UPLOAD SETTINGS
# ============================================

UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".wmv", ".flv"}
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt"}

# ============================================
# CORS SETTINGS
# ============================================

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "https://astegni.com",
    "https://www.astegni.com",
    "null"  # Allow file:// protocol for development
]

# ============================================
# RATE LIMITING
# ============================================

RATE_LIMIT_DEFAULT = "100/minute"
RATE_LIMIT_AUTH = "5/minute"
RATE_LIMIT_UPLOAD = "10/minute"