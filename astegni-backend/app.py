"""
Astegni Educational Platform - Refactored Main Application
"""

# CRITICAL: Configure multipart form max size BEFORE importing FastAPI/Starlette
# Default is 1MB per field, we need more for base64 encoded images (KYC uploads)
# This MUST happen FIRST before any other imports that use starlette internally
import starlette.formparsers
starlette.formparsers.MultiPartParser.max_part_size = 50 * 1024 * 1024  # 50MB per field
starlette.formparsers.MultiPartParser.max_file_size = 50 * 1024 * 1024  # 50MB for files

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
from starlette.requests import Request as StarletteRequest

# Load environment variables from .env file
load_dotenv()

# Add the modules directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from config import CORS_ORIGINS, RATE_LIMIT_DEFAULT
from models import Base, engine, SessionLocal
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

# CORS middleware - Allow production domains and localhost for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://astegni.com", "https://www.astegni.com", "https://admin.astegni.com", "http://localhost:8080", "http://localhost:8081", "http://localhost:8082"],
    allow_credentials=True,  # Allow cookies and auth headers
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# ============================================
# GOOGLE FEDCM SUPPORT (for Google OAuth)
# ============================================

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class FedCMMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add FedCM (Federated Credential Management) headers
    Required for Google Sign-In to work properly
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Add FedCM headers for Google OAuth endpoints
        if request.url.path.startswith("/api/oauth"):
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "*"

        return response

# Add FedCM middleware
app.add_middleware(FedCMMiddleware)

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
# Include Google OAuth routes (authentication)
from google_oauth_endpoints import router as google_oauth_router
app.include_router(google_oauth_router)

# Include Connected Accounts routes
from connected_accounts_endpoints import router as connected_accounts_router
app.include_router(connected_accounts_router)

# Include Two-Factor Authentication routes
from tfa_endpoints import router as tfa_router
app.include_router(tfa_router)

# Include tutor packages routes (must be before routes.py to avoid /api/tutor/{tutor_id} conflict)
from tutor_packages_endpoints import router as tutor_packages_router
app.include_router(tutor_packages_router)

# Include market pricing routes (AI-powered price suggestions based on real market data)
from market_pricing_endpoints import router as market_pricing_router
app.include_router(market_pricing_router)

# Include universal schedule routes (works for all roles)
from schedule_endpoints import router as schedule_router
app.include_router(schedule_router)

# Include tutor schedule routes (must be before routes.py to avoid /api/tutor/{tutor_id} conflict)
from tutor_schedule_endpoints import router as tutor_schedule_router
app.include_router(tutor_schedule_router)

# Include tutor sessions routes (actual tutoring sessions with students)
from tutor_sessions_endpoints import router as tutor_sessions_router
app.include_router(tutor_sessions_router)

# Tutor subscription endpoints (subscriptions with performance metrics)
from tutor_subscription_endpoints import router as tutor_subscription_router
app.include_router(tutor_subscription_router)

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

# Student subscription endpoints
from student_subscription_endpoints import router as student_subscription_router
app.include_router(student_subscription_router)

# IMPORTANT: Must be BEFORE routes.py to avoid /api/parent/{parent_id} conflict
# Parent invitation endpoints has /api/parent/pending-invitations which must come before
# the wildcard /api/parent/{parent_id} route in routes.py
from parent_invitation_endpoints import router as parent_invitation_router
app.include_router(parent_invitation_router)

# Child invitation endpoints (parent invites child)
from child_invitation_endpoints import router as child_invitation_router
app.include_router(child_invitation_router)

# Include parent profile routes (has wildcard /api/parent/{parent_id} - must come after specific routes)
from parent_endpoints import router as parent_router
app.include_router(parent_router)

# Include advertiser brands routes (MUST be BEFORE routes.py to avoid wildcard /api/advertiser/{id} conflict)
from advertiser_brands_endpoints import router as advertiser_brands_router
from campaign_cancellation_endpoints import router as campaign_cancellation_router
from campaign_cancellation_endpoints_enhanced import router as campaign_cancellation_enhanced_router
from campaign_deposit_endpoints import router as campaign_deposit_router
from campaign_stop_endpoints import router as campaign_stop_router
app.include_router(advertiser_brands_router)
app.include_router(campaign_cancellation_router)
app.include_router(campaign_cancellation_enhanced_router)
app.include_router(campaign_deposit_router)
app.include_router(campaign_stop_router)

# Include advertiser team management routes
from advertiser_team_endpoints import router as advertiser_team_router
app.include_router(advertiser_team_router)

# Include job board routes (advertiser job posting system)
from job_board_endpoints import router as job_board_router
app.include_router(job_board_router)

# Include job alerts and notifications routes
from job_alerts_endpoints import router as job_alerts_router
app.include_router(job_alerts_router)

# Include all routes from routes.py
app.include_router(router)

# Include course management routes
from course_management_endpoints import router as course_router
app.include_router(course_router)

# Include user profile routes
from user_profile_endpoints import router as user_profile_router
app.include_router(user_profile_router)

# Include admin review routes
from admin_review_endpoints import router as review_router
app.include_router(review_router)

# Include admin dashboard routes
from admin_dashboard_endpoints import router as dashboard_router
app.include_router(dashboard_router)

# Include astegni reviews routes
from astegni_reviews_endpoints import router as astegni_reviews_router
app.include_router(astegni_reviews_router)

# Include platform reviews routes (user reviews of Astegni)
from platform_reviews_endpoints import router as platform_reviews_router
app.include_router(platform_reviews_router)

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

# Include base price rules routes (starting prices for new tutors)
from base_price_endpoints import router as base_price_router
app.include_router(base_price_router)

# Include campaign packages routes
from campaign_packages_endpoints import router as campaign_packages_router
app.include_router(campaign_packages_router)

# Include CPI (Cost Per Impression) settings routes
from cpi_settings_endpoints import router as cpi_settings_router
app.include_router(cpi_settings_router)

# Include advertiser balance and CPM billing routes
from advertiser_balance_endpoints import router as advertiser_balance_router
app.include_router(advertiser_balance_router)

# Include campaign impression tracking routes (simplified version)
from simple_impression_tracking import router as campaign_impression_router
app.include_router(campaign_impression_router)

# Include campaign launch and ad serving routes
from campaign_launch_endpoints import router as campaign_launch_router
app.include_router(campaign_launch_router)

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

# Include affiliate earnings routes (Advertisement, Subscription, Commission)
from affiliate_earnings_endpoints import router as affiliate_earnings_router
app.include_router(affiliate_earnings_router)

# Include content management routes
from content_management_endpoints import router as content_management_router
app.include_router(content_management_router)

# Include coursework management routes
from coursework_endpoints import router as coursework_router
app.include_router(coursework_router)

# Include whiteboard system routes
from whiteboard_endpoints import router as whiteboard_router
app.include_router(whiteboard_router)

# Include whiteboard connection tracking routes (WebSocket-based attendance tracking)
from whiteboard_connection_tracking_endpoints import router as whiteboard_tracking_router
app.include_router(whiteboard_tracking_router)

# Include attendance suggestion and marking routes (AI-powered attendance)
from attendance_suggestion_endpoints import router as attendance_router
app.include_router(attendance_router)

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

# Include referral system routes (share tracking and analytics)
from referral_endpoints import router as referral_router
app.include_router(referral_router)

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

# Include subscription features endpoints (role-based features for subscription plans)
from subscription_features_endpoints import router as subscription_features_router
app.include_router(subscription_features_router)

# Include admin subscription plan endpoints (create/update plans with features)
from admin_subscription_plan_endpoints import router as admin_subscription_plan_router
app.include_router(admin_subscription_plan_router)

# Include admin courses routes (dual database: admin_db for profile/reviews, user_db for courses)
from admin_courses_endpoints import router as admin_courses_router
app.include_router(admin_courses_router)

# Include admin schools routes (dual database: admin_db for profile/reviews, user_db for schools)
from admin_schools_endpoints import router as admin_schools_router
app.include_router(admin_schools_router)

# Include admin recommended topics routes (reads from user_db: courses and schools)
from admin_recommended_topics_endpoints import router as admin_recommended_topics_router
app.include_router(admin_recommended_topics_router)

# Include admin advertisers routes (brands and campaigns from user_db)
from admin_advertisers_endpoints import router as admin_advertisers_router
app.include_router(admin_advertisers_router)

# Note: advertiser_brands_router moved BEFORE routes.py to avoid wildcard /api/advertiser/{id} conflict

# Include admin admins routes (manage-admins page profile and reviews)
from admin_admins_endpoints import router as admin_admins_router
app.include_router(admin_admins_router)

# Include admin leave request routes
from admin_leave_endpoints import router as admin_leave_router
app.include_router(admin_leave_router)

# Include chat routes
from chat_endpoints import router as chat_router
app.include_router(chat_router)

# Include call log routes
from call_log_endpoints import router as call_log_router
app.include_router(call_log_router)

# Include TURN credentials route
from turn_endpoints import router as turn_router
app.include_router(turn_router)

# Include poll routes
from poll_endpoints import router as poll_router
app.include_router(poll_router)

# Include KYC (Know Your Customer) liveliness verification routes
from kyc_endpoints import router as kyc_router
app.include_router(kyc_router)

# Include TrueVoice (voice-personalized messaging) routes
from truevoice_endpoints import router as truevoice_router
app.include_router(truevoice_router)

# Include Translation (Google Translate API) routes
from translation_endpoints import router as translation_router
app.include_router(translation_router)

# Include User Settings routes (2FA, Sessions, Connected Accounts, Data Export, Reviews, Appearance)
from user_settings_endpoints import router as user_settings_router
app.include_router(user_settings_router)

# Include Appearance Settings routes (Theme, Color Palette, Font Size, Display Density)
from appearance_settings_endpoints import router as appearance_settings_router
app.include_router(appearance_settings_router, tags=["Appearance Settings"])

# Include Account Deletion routes (Leave Astegni flow with 90-day grace period)
from account_deletion_endpoints import router as account_deletion_router
app.include_router(account_deletion_router)

# Include Payment Methods routes (Bank, TeleBirr, Mobile Money, CBE Birr)
from payment_methods_endpoints import router as payment_methods_router
app.include_router(payment_methods_router)

# Include Notes routes (rich text notes with voice/video recording support)
from notes_endpoints import router as notes_router
app.include_router(notes_router)

# Include Trending/Popularity Tracking routes
from trending_endpoints import router as trending_router
app.include_router(trending_router)

from course_school_trending_endpoints import router as course_school_trending_router
app.include_router(course_school_trending_router)

from schools_public_endpoints import router as schools_public_router
app.include_router(schools_public_router)

from payment_endpoints import router as payment_router
app.include_router(payment_router)

# Role Management Routes
from role_management_endpoints import router as role_management_router
app.include_router(role_management_router)

# Storage endpoints
from storage_endpoints import router as storage_router
app.include_router(storage_router)

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
@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    from datetime import datetime
    return {
        "status": "healthy",
        "version": "2.1.0",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/api/footer-stats")
def footer_stats():
    """Public endpoint: live counts shown in the site footer."""
    from models import SessionLocal, User
    from sqlalchemy import text
    db = SessionLocal()
    try:
        active_users = db.query(User).count()
        total_courses = db.execute(text("SELECT COUNT(*) FROM courses WHERE status = 'verified'")).scalar() or 0
        return {
            "active_users": active_users,
            "total_courses": total_courses,
        }
    finally:
        db.close()

# ============================================
# WEBSOCKET ENDPOINT FOR REAL-TIME COMMUNICATION
# ============================================

from fastapi import WebSocket, WebSocketDisconnect
from websocket_manager import manager, handle_chat_message, handle_session_message, handle_video_call_message, handle_get_online_users, handle_whiteboard_message
import json

@app.websocket("/ws/{user_id}")
async def websocket_endpoint_user_based(websocket: WebSocket, user_id: int):
    """
    User-based WebSocket endpoint for real-time communication.

    Args:
        user_id: The user ID from the users table

    Handles: chat messages, session updates, video call signaling, online status
    """
    # Create a unique connection key using user_id
    connection_key = f"user_{user_id}"

    # Get database session for online status tracking
    db = SessionLocal()

    try:
        # Connect and mark user online
        await manager.connect(websocket, connection_key, db)
        print(f"🔌 WebSocket connected: user {user_id} (key: {connection_key})")

        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                message_type = message.get("type", "")

                # Route to appropriate handler based on message type
                if message_type in ["private_message", "room_message", "typing"]:
                    await handle_chat_message(message, connection_key, None)

                elif message_type in ["join_session", "leave_session", "screen_share", "whiteboard_update"]:
                    await handle_session_message(message, connection_key, None)

                elif message_type in ["video_call_invitation", "video_offer", "video_answer",
                                      "ice_candidate", "video_call_declined", "video_call_ended",
                                      "video_call_cancelled", "video_call_participant_left",
                                      "call_invitation", "call_answer", "call_declined", "call_ended", "call_cancelled",
                                      "call_mode_switched", "webrtc_offer"]:
                    await handle_video_call_message(message, connection_key, db)

                elif message_type == "get_online_users":
                    # Get list of online users
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "online_users",
                            "users": list(manager.active_connections.keys())
                        }),
                        connection_key
                    )

                else:
                    print(f"⚠️ Unknown message type: {message_type}")

            except json.JSONDecodeError:
                print(f"❌ Invalid JSON received: {data}")
            except Exception as e:
                print(f"❌ Error handling WebSocket message: {e}")

    except WebSocketDisconnect:
        await manager.disconnect(connection_key, db)
        print(f"🔌 WebSocket disconnected: user {user_id}")
    except Exception as e:
        print(f"❌ WebSocket error for user {user_id}: {e}")
        await manager.disconnect(connection_key, db)
    finally:
        db.close()


@app.websocket("/ws/{profile_id}/{role}")
async def websocket_endpoint(websocket: WebSocket, profile_id: int, role: str):
    """
    WebSocket endpoint for real-time communication using profile IDs.

    Args:
        profile_id: The profile ID (tutor_profile_id or student_profile_id)
        role: The role type ("tutor" or "student")

    Handles: chat messages, session updates, video call signaling, online status
    """
    # Normalize role to lowercase to ensure consistent connection keys
    role = role.lower()

    # Create a unique connection key using profile_id and role
    connection_key = f"{role}_{profile_id}"

    # Get database session for online status tracking
    db = SessionLocal()

    try:
        # Connect and mark user online in profile table
        await manager.connect(websocket, connection_key, db)
        print(f"🔌 WebSocket connected: {role} profile {profile_id} (key: {connection_key})")

        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                message_type = message.get("type", "")

                # Route to appropriate handler based on message type
                if message_type in ["private_message", "room_message", "typing"]:
                    await handle_chat_message(message, connection_key, None)

                elif message_type in ["join_session", "leave_session", "screen_share", "whiteboard_update"]:
                    await handle_session_message(message, connection_key, None)

                elif message_type in ["video_call_invitation", "video_offer", "video_answer",
                                      "ice_candidate", "video_call_declined", "video_call_ended",
                                      "video_call_cancelled", "video_call_participant_left",
                                      "call_invitation", "call_answer", "call_declined", "call_ended", "call_cancelled",
                                      "call_mode_switched", "webrtc_offer"]:
                    await handle_video_call_message(message, connection_key, db)

                elif message_type == "get_online_users":
                    # Get list of online users from database
                    profile_types = message.get("profile_types")  # Optional filter
                    await handle_get_online_users(db, connection_key, profile_types)

                elif message_type in ["whiteboard_stroke", "whiteboard_cursor",
                                      "whiteboard_text_typing", "whiteboard_tool_change",
                                      "whiteboard_permission_request", "whiteboard_permission_granted",
                                      "whiteboard_permission_denied", "whiteboard_permission_revoked",
                                      "whiteboard_page_change", "whiteboard_clear", "whiteboard_undo"]:
                    await handle_whiteboard_message(message, connection_key, db)

                elif message_type == "ping":
                    # Heartbeat to keep connection alive
                    await websocket.send_text(json.dumps({"type": "pong"}))

                else:
                    print(f"Unknown WebSocket message type: {message_type}")

            except json.JSONDecodeError:
                print(f"Invalid JSON received from {connection_key}")

    except WebSocketDisconnect:
        # Disconnect and mark user offline in profile table
        await manager.disconnect(websocket, connection_key, db)
        print(f"🔌 WebSocket disconnected: {role} profile {profile_id}")
    finally:
        db.close()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)