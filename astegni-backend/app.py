"""
Astegni Educational Platform - Refactored Main Application
"""

import os
import sys
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
from contextlib import asynccontextmanager

# Load environment variables from .env file
load_dotenv()

# Add the modules directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from config import CORS_ORIGINS, RATE_LIMIT_DEFAULT
from models import Base, engine
from routes import router

# Add these imports to your app.py
from backblaze_service import get_backblaze_service
from typing import Optional, List
from fastapi import File, UploadFile

# ============================================
# APPLICATION LIFESPAN (Modern FastAPI approach)
# ============================================

@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    b2_service = get_backblaze_service()
    if b2_service.configured:
        print(f"[OK] Connected to Backblaze B2 bucket: {b2_service.bucket.name}")
    else:
        print("[WARNING] Backblaze B2 not configured - using mock implementation")

    yield

    # Shutdown (cleanup code goes here if needed in future)

# ============================================
# FASTAPI APP SETUP
# ============================================

app = FastAPI(
    title="Astegni API",
    version="2.1.0",
    description="Complete backend API for Astegni Educational Platform - Refactored Version",
    lifespan=lifespan  # Use modern lifespan instead of @app.on_event
)

# ============================================
# MIDDLEWARE SETUP
# ============================================

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware - DEVELOPMENT ONLY: Allow all origins including file:// protocol
# For production, restrict allow_origins to specific domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Must be False when using allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# ============================================
# STATIC FILES
# ============================================

# Mount static file directories
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
if os.path.exists("../videos"):
    app.mount("/videos", StaticFiles(directory="../videos"), name="videos")
if os.path.exists("../pictures"):
    app.mount("/pictures", StaticFiles(directory="../pictures"), name="pictures")

# ============================================
# INCLUDE ROUTERS
# ============================================

# IMPORTANT: Include specific routes BEFORE generic routes to avoid path conflicts
# Include tutor packages routes (must be before routes.py to avoid /api/tutor/{tutor_id} conflict)
from tutor_packages_endpoints import router as tutor_packages_router
app.include_router(tutor_packages_router)

# Include tutor schedule routes (must be before routes.py to avoid /api/tutor/{tutor_id} conflict)
from tutor_schedule_endpoints import router as tutor_schedule_router
app.include_router(tutor_schedule_router)

# Include tutor sessions routes (actual tutoring sessions with students)
from tutor_sessions_endpoints import router as tutor_sessions_router
app.include_router(tutor_sessions_router)

# Include view tutor routes (comprehensive endpoints for view-tutor.html)
from view_tutor_endpoints import router as view_tutor_router
app.include_router(view_tutor_router)

# Include tutor profile extensions routes (must be before routes.py to avoid /api/tutor/{tutor_id} conflict)
from tutor_profile_extensions_endpoints import router as tutor_extensions_router
app.include_router(tutor_extensions_router)

# Include unified credentials routes (handles achievements, experience, certificates for all roles)
# Note: 'credentials' table was renamed from 'documents' for clarity
# The 'documents' table now stores teaching/learning materials (PDFs, worksheets)
from credentials_endpoints import router as credentials_router
app.include_router(credentials_router)

# Include student requests panel routes (courses, schools, counts)
# IMPORTANT: Must be BEFORE routes.py to avoid /api/student/{student_id} conflict
from student_requests_endpoints import router as student_requests_router
app.include_router(student_requests_router)

# IMPORTANT: Must be BEFORE routes.py to avoid /api/parent/{parent_id} conflict
# Parent invitation endpoints has /api/parent/pending-invitations which must come before
# the wildcard /api/parent/{parent_id} route in routes.py
from parent_invitation_endpoints import router as parent_invitation_router
app.include_router(parent_invitation_router)

# Include parent profile routes (has wildcard /api/parent/{parent_id} - must come after specific routes)
from parent_endpoints import router as parent_router
app.include_router(parent_router)

# Include all routes from routes.py
app.include_router(router)

# Include course management routes
from course_management_endpoints import router as course_router
app.include_router(course_router)

# Include admin review routes
from admin_review_endpoints import router as review_router
app.include_router(review_router)

# Include admin dashboard routes
from admin_dashboard_endpoints import router as dashboard_router
app.include_router(dashboard_router)

# Include astegni reviews routes
from astegni_reviews_endpoints import router as astegni_reviews_router
app.include_router(astegni_reviews_router)

# Include student reviews routes
from student_reviews_endpoints import router as student_reviews_router
app.include_router(student_reviews_router)

# Include system settings routes
from system_settings_endpoints import router as system_settings_router, media_router as system_media_router
app.include_router(system_settings_router)
app.include_router(system_media_router)

# Include admin profile routes
from admin_profile_endpoints import router as admin_profile_router
app.include_router(admin_profile_router)

# Include admin management routes (for managing admin users)
from admin_management_endpoints import router as admin_management_router
app.include_router(admin_management_router)

# Include admin authentication and authorization routes
from admin_auth_endpoints import router as admin_auth_router
app.include_router(admin_auth_router)

# Include pricing settings routes
from pricing_settings_endpoints import router as pricing_router
app.include_router(pricing_router)

# Include campaign packages routes
from campaign_packages_endpoints import router as campaign_packages_router
app.include_router(campaign_packages_router)

# Tutor packages routes already included above (before routes.py to avoid conflicts)

# Include affiliate performance routes
from affiliate_performance_endpoints import router as affiliate_performance_router
app.include_router(affiliate_performance_router)

# Include manage campaigns profile routes
from manage_campaigns_endpoints import router as manage_campaigns_router
app.include_router(manage_campaigns_router)

# Include manage contents profile routes
from manage_contents_endpoints import router as manage_contents_router
app.include_router(manage_contents_router)

# Include earnings and investments routes
from earnings_investments_endpoints import router as earnings_investments_router
app.include_router(earnings_investments_router)

# Include content management routes
from content_management_endpoints import router as content_management_router
app.include_router(content_management_router)

# Include coursework management routes
from coursework_endpoints import router as coursework_router
app.include_router(coursework_router)

# Include whiteboard system routes
from whiteboard_endpoints import router as whiteboard_router
app.include_router(whiteboard_router)

# Include session request routes
from session_request_endpoints import router as session_request_router
app.include_router(session_request_router)

# Include course and school request routes
from course_school_request_endpoints import router as course_school_request_router
app.include_router(course_school_request_router)

# Include universal connections routes (replaces old tutor_connections)
from connection_endpoints import router as connection_router
app.include_router(connection_router)

# Include events and clubs routes
from events_clubs_endpoints import router as events_clubs_router
app.include_router(events_clubs_router)

# Include partner request routes
from partner_request_endpoints import router as partner_request_router
app.include_router(partner_request_router)

# student_requests_router already included above (before routes.py to avoid /api/student/{student_id} conflict)

# Include student profile routes
from student_profile_endpoints import router as student_profile_router
app.include_router(student_profile_router)

# Include student credentials routes (achievements, certifications, extracurricular)
from student_credentials_endpoints import router as student_credentials_router
app.include_router(student_credentials_router)

# Include blog routes
from blog_endpoints import router as blog_router
app.include_router(blog_router)

# NOTE: parent_invitation_router and parent_router are now included earlier in the file
# (before routes.py) to avoid wildcard route conflicts

# Include teaching/learning documents routes (documents table, NOT credentials)
from documents_endpoints import router as teaching_documents_router
app.include_router(teaching_documents_router)

# Include admin database routes (reads from astegni_admin_db)
from admin_db_endpoints import router as admin_db_router
app.include_router(admin_db_router)

# Include admin courses routes (dual database: admin_db for profile/reviews, user_db for courses)
from admin_courses_endpoints import router as admin_courses_router
app.include_router(admin_courses_router)

# Include admin schools routes (dual database: admin_db for profile/reviews, user_db for schools)
from admin_schools_endpoints import router as admin_schools_router
app.include_router(admin_schools_router)

# Include admin advertisers routes (brands and campaigns from user_db)
from admin_advertisers_endpoints import router as admin_advertisers_router
app.include_router(admin_advertisers_router)

# Include admin admins routes (manage-admins page profile and reviews)
from admin_admins_endpoints import router as admin_admins_router
app.include_router(admin_admins_router)

# Include admin leave request routes
from admin_leave_endpoints import router as admin_leave_router
app.include_router(admin_leave_router)

# Include chat routes
from chat_endpoints import router as chat_router
app.include_router(chat_router)

# Student documents routes already included above (before student reviews to avoid route conflicts)

# Tutor schedule endpoints already included above (before routes.py to avoid conflicts)
# Tutor profile extensions routes already included above (before routes.py to avoid conflicts)

# ============================================
# DATABASE INITIALIZATION
# ============================================

# Create all tables
Base.metadata.create_all(bind=engine)

# ============================================
# ROOT ENDPOINT
# ============================================

@app.get("/")
def read_root():
    """Root endpoint"""
    return {
        "message": "Welcome to Astegni Educational Platform API",
        "version": "2.1.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)