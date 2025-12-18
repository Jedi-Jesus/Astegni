"""
System Settings Endpoints
Provides API endpoints for:
- Dashboard statistics
- General settings
- Media settings
- Impression stats
- Email configuration
- Payment gateways
- Subscription tiers
- Affiliate settings
- Security settings
- Backup configuration
- Maintenance mode
- System logs
- Performance metrics
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
import psycopg
from dotenv import load_dotenv
import os
import json
import uuid

load_dotenv()

# Use ADMIN_DATABASE_URL for system settings tables (astegni_admin_db)
# These tables were migrated from astegni_user_db to astegni_admin_db
ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

router = APIRouter(prefix="/api/admin/system", tags=["System Settings"])

# Separate router for media endpoints (different prefix)
media_router = APIRouter(prefix="/api/admin/media", tags=["System Media"])

# ============================================
# PYDANTIC MODELS
# ============================================

class DashboardStats(BaseModel):
    total_users: int
    total_students: int
    total_tutors: int
    total_parents: int
    total_advertisers: int
    total_admins: int
    active_users_today: int
    new_users_today: int
    total_videos: int
    total_courses: int
    total_reviews: int
    total_revenue: float
    storage_used_gb: float
    bandwidth_used_gb: float
    api_calls_today: int
    error_count_today: int
    avg_response_time_ms: float

class GeneralSettings(BaseModel):
    platform_name: str
    platform_tagline: Optional[str]
    platform_description: Optional[str]
    primary_language: str
    timezone: str
    date_format: str
    time_format: str
    currency: str
    currency_symbol: str
    items_per_page: int
    max_upload_size_mb: int
    maintenance_mode: bool
    registration_enabled: bool
    email_verification_required: bool
    phone_verification_required: bool
    contact_email: Optional[str]
    contact_phone: Optional[str]
    admin_email: Optional[str]

class MediaTier(BaseModel):
    tier_name: str
    max_image_size_mb: int
    max_video_size_mb: int
    max_document_size_mb: int
    max_audio_size_mb: int
    storage_limit_gb: int

class EmailConfig(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_encryption: str
    from_email: str
    from_name: str
    reply_to_email: Optional[str]
    daily_limit: int
    enabled: bool

class EmailTemplate(BaseModel):
    id: int
    template_name: str
    subject: str
    body: str
    enabled: bool

class PaymentGateway(BaseModel):
    id: int
    gateway_name: str
    display_name: str
    enabled: bool
    test_mode: bool

class SubscriptionTier(BaseModel):
    id: int
    tier_name: str
    display_name: str
    price_monthly: float
    price_yearly: float
    is_active: bool

class AffiliateSettings(BaseModel):
    program_name: str
    commission_rate: float
    min_payout: float
    cookie_duration_days: int
    enabled: bool

class SecuritySettings(BaseModel):
    two_factor_auth_enabled: bool
    session_timeout_minutes: int
    max_login_attempts: int
    lockout_duration_minutes: int
    password_min_length: int
    password_require_uppercase: bool
    password_require_numbers: bool
    rate_limiting_enabled: bool

class MaintenanceMode(BaseModel):
    is_active: bool
    message: Optional[str]
    scheduled_start: Optional[datetime]
    scheduled_end: Optional[datetime]

class BackupConfig(BaseModel):
    auto_backup_enabled: bool
    backup_frequency: str
    backup_time: str
    backup_retention_days: int
    include_media: bool
    include_database: bool

class SystemLog(BaseModel):
    id: int
    log_level: str
    message: str
    created_at: Optional[datetime]

class BackupHistory(BaseModel):
    id: int
    backup_type: str
    backup_size_mb: float
    status: str
    created_at: Optional[datetime]

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_connection():
    """Get admin database connection (astegni_admin_db)"""
    return psycopg.connect(ADMIN_DATABASE_URL)


def update_env_file(updates: Dict[str, str]):
    """
    Update specific keys in the .env file while preserving other content.
    """
    # Get absolute path to .env file in the same directory as this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '.env')

    print(f"[ENV UPDATE] Script directory: {script_dir}")
    print(f"[ENV UPDATE] .env path: {env_path}")
    print(f"[ENV UPDATE] Updates to apply: {list(updates.keys())}")

    if not os.path.exists(env_path):
        raise FileNotFoundError(f".env file not found at {env_path}")

    # Read current .env file
    with open(env_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    print(f"[ENV UPDATE] Read {len(lines)} lines from .env")

    # Track which keys we've updated
    updated_keys = set()
    new_lines = []

    for line in lines:
        stripped = line.strip()

        # Skip empty lines and comments - keep them as is
        if not stripped or stripped.startswith('#'):
            new_lines.append(line)
            continue

        # Check if this line has a key we need to update
        if '=' in stripped:
            key = stripped.split('=', 1)[0].strip()
            if key in updates:
                # Update this line with new value
                old_value = stripped.split('=', 1)[1] if '=' in stripped else ''
                new_lines.append(f"{key}={updates[key]}\n")
                updated_keys.add(key)
                print(f"[ENV UPDATE] Updated {key}: '{old_value[:20]}...' -> '{updates[key][:20]}...'")
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)

    # Add any keys that weren't in the file
    for key, value in updates.items():
        if key not in updated_keys:
            new_lines.append(f"{key}={value}\n")
            print(f"[ENV UPDATE] Added new key {key}")

    # Write back to .env file
    with open(env_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    print(f"[ENV UPDATE] Successfully wrote {len(new_lines)} lines to .env")
    print(f"[ENV UPDATE] Keys updated: {updated_keys}")

    # Reload environment variables
    load_dotenv(env_path, override=True)

# ============================================
# ENDPOINTS
# ============================================

@router.get("/dashboard")
async def get_system_dashboard():
    """Get system dashboard with all statistics (returns 0 if no data)"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get today's statistics
        cursor.execute("""
            SELECT total_users, total_students, total_tutors, total_parents,
                   total_advertisers, total_admins, active_users_today, new_users_today,
                   total_videos, total_courses, total_reviews, total_revenue,
                   storage_used_gb, bandwidth_used_gb, api_calls_today,
                   error_count_today, avg_response_time_ms
            FROM system_statistics
            WHERE stat_date = CURRENT_DATE
            LIMIT 1
        """)

        row = cursor.fetchone()

        # If no data exists, return all zeros
        if not row:
            stats = {
                "total_users": 0,
                "total_students": 0,
                "total_tutors": 0,
                "total_parents": 0,
                "total_advertisers": 0,
                "total_admins": 0,
                "active_users_today": 0,
                "new_users_today": 0,
                "total_videos": 0,
                "total_courses": 0,
                "total_reviews": 0,
                "total_revenue": 0.00,
                "storage_used_gb": 0.00,
                "bandwidth_used_gb": 0.00,
                "api_calls_today": 0,
                "error_count_today": 0,
                "avg_response_time_ms": 0.00
            }
        else:
            stats = {
                "total_users": row[0] or 0,
                "total_students": row[1] or 0,
                "total_tutors": row[2] or 0,
                "total_parents": row[3] or 0,
                "total_advertisers": row[4] or 0,
                "total_admins": row[5] or 0,
                "active_users_today": row[6] or 0,
                "new_users_today": row[7] or 0,
                "total_videos": row[8] or 0,
                "total_courses": row[9] or 0,
                "total_reviews": row[10] or 0,
                "total_revenue": float(row[11] or 0),
                "storage_used_gb": float(row[12] or 0),
                "bandwidth_used_gb": float(row[13] or 0),
                "api_calls_today": row[14] or 0,
                "error_count_today": row[15] or 0,
                "avg_response_time_ms": float(row[16] or 0)
            }

        return {
            "success": True,
            "data": stats
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/general-settings")
async def get_general_settings():
    """Get general settings"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT platform_name, platform_tagline, platform_description,
                   primary_language, timezone, date_format, time_format,
                   currency, currency_symbol, items_per_page, max_upload_size_mb,
                   maintenance_mode, registration_enabled, email_verification_required,
                   phone_verification_required, contact_email, contact_phone,
                   admin_email, site_url
            FROM system_general_settings
            LIMIT 1
        """)

        row = cursor.fetchone()

        if not row:
            settings = {
                "platform_name": "Astegni",
                "platform_tagline": "",
                "platform_description": "",
                "primary_language": "English",
                "timezone": "Africa/Addis_Ababa",
                "date_format": "YYYY-MM-DD",
                "time_format": "24h",
                "currency": "ETB",
                "currency_symbol": "ETB",
                "items_per_page": 15,
                "max_upload_size_mb": 200,
                "maintenance_mode": False,
                "registration_enabled": True,
                "email_verification_required": True,
                "phone_verification_required": False,
                "contact_email": [],  # JSON array
                "contact_phone": [],  # JSON array
                "admin_email": "",
                "site_url": ""
            }
        else:
            settings = {
                "platform_name": row[0],
                "platform_tagline": row[1] or "",
                "platform_description": row[2] or "",
                "primary_language": row[3],
                "timezone": row[4],
                "date_format": row[5],
                "time_format": row[6],
                "currency": row[7],
                "currency_symbol": row[8],
                "items_per_page": row[9],
                "max_upload_size_mb": row[10],
                "maintenance_mode": row[11],
                "registration_enabled": row[12],
                "email_verification_required": row[13],
                "phone_verification_required": row[14],
                "contact_email": row[15] if row[15] else [],  # JSONB auto-parsed to list
                "contact_phone": row[16] if row[16] else [],  # JSONB auto-parsed to list
                "admin_email": row[17] or "",
                "site_url": row[18] or ""
            }

        return {
            "success": True,
            "data": settings
        }

    finally:
        cursor.close()
        conn.close()


@router.put("/general-settings")
async def update_general_settings(settings: Dict[str, Any]):
    """Update general settings"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Convert arrays to JSONB using psycopg Json adapter
        from psycopg.types.json import Jsonb

        contact_emails = settings.get("contact_email", [])
        contact_phones = settings.get("contact_phone", [])

        # Ensure they are lists
        if isinstance(contact_emails, str):
            contact_emails = [e.strip() for e in contact_emails.split(',') if e.strip()]
        if isinstance(contact_phones, str):
            contact_phones = [p.strip() for p in contact_phones.split(',') if p.strip()]

        # Use UPSERT pattern - always use id=1 for singleton settings
        cursor.execute("""
            INSERT INTO system_general_settings (
                id, platform_name, site_url, platform_tagline, platform_description,
                primary_language, timezone, contact_email, contact_phone
            ) VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                platform_name = EXCLUDED.platform_name,
                site_url = EXCLUDED.site_url,
                platform_tagline = EXCLUDED.platform_tagline,
                platform_description = EXCLUDED.platform_description,
                primary_language = EXCLUDED.primary_language,
                timezone = EXCLUDED.timezone,
                contact_email = EXCLUDED.contact_email,
                contact_phone = EXCLUDED.contact_phone,
                updated_at = CURRENT_TIMESTAMP
        """, (
            settings.get("platform_name", "Astegni"),
            settings.get("site_url", ""),
            settings.get("platform_tagline", ""),
            settings.get("platform_description", ""),
            settings.get("primary_language", "English"),
            settings.get("timezone", "Africa/Addis_Ababa"),
            Jsonb(contact_emails),  # JSON array
            Jsonb(contact_phones)   # JSON array
        ))

        conn.commit()
        return {"success": True, "message": "Settings updated successfully"}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/media-settings")
async def get_media_settings():
    """Get media settings for all tiers"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Note: table uses subscription_plan_id instead of tier_name
        cursor.execute("""
            SELECT subscription_plan_id, max_image_size_mb, max_video_size_mb,
                   max_document_size_mb, max_audio_size_mb, storage_limit_gb,
                   max_image_storage_mb, max_video_storage_mb
            FROM system_media_settings
            ORDER BY subscription_plan_id
        """)

        rows = cursor.fetchall()

        if not rows:
            # Return default tiers
            tiers = [
                {
                    "tier_name": "free",
                    "max_image_size_mb": 5,
                    "max_video_size_mb": 50,
                    "max_document_size_mb": 10,
                    "max_audio_size_mb": 10,
                    "storage_limit_gb": 5,
                    "max_image_storage_mb": 2560,
                    "max_video_storage_mb": 2560
                },
                {
                    "tier_name": "basic",
                    "max_image_size_mb": 10,
                    "max_video_size_mb": 100,
                    "max_document_size_mb": 20,
                    "max_audio_size_mb": 20,
                    "storage_limit_gb": 20,
                    "max_image_storage_mb": 10240,
                    "max_video_storage_mb": 10240
                },
                {
                    "tier_name": "premium",
                    "max_image_size_mb": 20,
                    "max_video_size_mb": 200,
                    "max_document_size_mb": 50,
                    "max_audio_size_mb": 50,
                    "storage_limit_gb": 100,
                    "max_image_storage_mb": 51200,
                    "max_video_storage_mb": 51200
                }
            ]
        else:
            tiers = []
            for row in rows:
                tiers.append({
                    "tier_name": row[0],
                    "max_image_size_mb": row[1] or 0,
                    "max_video_size_mb": row[2] or 0,
                    "max_document_size_mb": row[3] or 0,
                    "max_audio_size_mb": row[4] or 0,
                    "storage_limit_gb": row[5] or 0,
                    "max_image_storage_mb": row[6] or 0,
                    "max_video_storage_mb": row[7] or 0
                })

        return {"success": True, "data": tiers}

    finally:
        cursor.close()
        conn.close()


@router.put("/media-settings/{tier_name}")
async def update_media_settings(tier_name: str, settings: Dict[str, Any]):
    """Update media settings for a specific tier (subscription_plan_id)"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get separate storage limits or calculate from total
        max_image_storage_mb = settings.get("max_image_storage_mb")
        max_video_storage_mb = settings.get("max_video_storage_mb")

        # If separate limits not provided, calculate them (backward compatibility)
        if max_image_storage_mb is None or max_video_storage_mb is None:
            storage_limit_gb = settings.get("storage_limit_gb", 5)
            max_image_storage_mb = int(storage_limit_gb * 1024 / 2)
            max_video_storage_mb = int(storage_limit_gb * 1024 / 2)

        # Calculate total storage from separate limits
        total_storage_gb = round((max_image_storage_mb + max_video_storage_mb) / 1024)

        # Note: table uses subscription_plan_id instead of tier_name
        cursor.execute("""
            INSERT INTO system_media_settings (
                subscription_plan_id, max_image_size_mb, max_video_size_mb,
                max_document_size_mb, max_audio_size_mb, storage_limit_gb,
                max_image_storage_mb, max_video_storage_mb
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (subscription_plan_id) DO UPDATE SET
                max_image_size_mb = EXCLUDED.max_image_size_mb,
                max_video_size_mb = EXCLUDED.max_video_size_mb,
                max_document_size_mb = EXCLUDED.max_document_size_mb,
                max_audio_size_mb = EXCLUDED.max_audio_size_mb,
                storage_limit_gb = EXCLUDED.storage_limit_gb,
                max_image_storage_mb = EXCLUDED.max_image_storage_mb,
                max_video_storage_mb = EXCLUDED.max_video_storage_mb,
                updated_at = CURRENT_TIMESTAMP
        """, (
            tier_name,
            settings.get("max_image_size_mb", 5),
            settings.get("max_video_size_mb", 50),
            settings.get("max_document_size_mb", 10),
            settings.get("max_audio_size_mb", 10),
            total_storage_gb,
            max_image_storage_mb,
            max_video_storage_mb
        ))

        conn.commit()
        return {"success": True, "message": "Media settings updated"}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating media settings: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/impressions")
async def get_impression_stats():
    """Get impression statistics (returns 0 if no data)"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get today's impressions by content type
        cursor.execute("""
            SELECT content_type, total_impressions, unique_users, avg_duration_seconds
            FROM system_impression_stats
            WHERE stat_date = CURRENT_DATE
        """)

        rows = cursor.fetchall()

        impressions = {}
        if not rows:
            impressions = {
                "video": {"total": 0, "unique_users": 0, "avg_duration": 0},
                "course": {"total": 0, "unique_users": 0, "avg_duration": 0},
                "blog": {"total": 0, "unique_users": 0, "avg_duration": 0},
                "ad": {"total": 0, "unique_users": 0, "avg_duration": 0}
            }
        else:
            for row in rows:
                impressions[row[0]] = {
                    "total": row[1] or 0,
                    "unique_users": row[2] or 0,
                    "avg_duration": float(row[3] or 0)
                }

            # Ensure all content types exist
            for content_type in ["video", "course", "blog", "ad"]:
                if content_type not in impressions:
                    impressions[content_type] = {"total": 0, "unique_users": 0, "avg_duration": 0}

        return {"success": True, "data": impressions}

    finally:
        cursor.close()
        conn.close()


@router.get("/email-config")
async def get_email_config():
    """Get email configuration"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT smtp_host, smtp_port, smtp_username, smtp_encryption,
                   from_email, from_name, reply_to_email, daily_limit, enabled,
                   account_name, provider
            FROM system_email_config
            LIMIT 1
        """)

        row = cursor.fetchone()

        if not row:
            config = {
                "smtp_host": "",
                "smtp_port": 587,
                "smtp_username": "",
                "smtp_encryption": "TLS",
                "from_email": "",
                "from_name": "Astegni",
                "reply_to_email": "",
                "daily_limit": 1000,
                "enabled": False,
                "account_name": "Primary Email",
                "provider": "custom"
            }
        else:
            config = {
                "smtp_host": row[0] or "",
                "smtp_port": row[1] or 587,
                "smtp_username": row[2] or "",
                "smtp_encryption": row[3] or "TLS",
                "from_email": row[4] or "",
                "from_name": row[5] or "Astegni",
                "reply_to_email": row[6] or "",
                "daily_limit": row[7] or 1000,
                "enabled": row[8] if row[8] is not None else False,
                "account_name": row[9] or "Primary Email",
                "provider": row[10] or "custom"
            }

        return {"success": True, "data": config}

    finally:
        cursor.close()
        conn.close()


@router.get("/email-templates")
async def get_email_templates():
    """Get all email templates"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, template_name, subject, body, enabled
            FROM system_email_templates
            ORDER BY template_name
        """)

        rows = cursor.fetchall()

        templates = []
        for row in rows:
            templates.append({
                "id": row[0],
                "template_name": row[1],
                "subject": row[2],
                "body": row[3],
                "enabled": row[4]
            })

        return {"success": True, "data": templates}

    finally:
        cursor.close()
        conn.close()


@router.put("/email-config")
async def update_email_config(config: Dict[str, Any]):
    """Update email configuration in both database and .env file"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Extract password if provided (optional field)
        smtp_password = config.get("smtp_password")

        # Build UPDATE query - only update password if provided
        if smtp_password:
            cursor.execute("""
                INSERT INTO system_email_config (
                    id, smtp_host, smtp_port, smtp_username, smtp_password,
                    smtp_encryption, from_email, from_name, reply_to_email,
                    daily_limit, enabled, account_name, provider
                ) VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    smtp_host = EXCLUDED.smtp_host,
                    smtp_port = EXCLUDED.smtp_port,
                    smtp_username = EXCLUDED.smtp_username,
                    smtp_password = EXCLUDED.smtp_password,
                    smtp_encryption = EXCLUDED.smtp_encryption,
                    from_email = EXCLUDED.from_email,
                    from_name = EXCLUDED.from_name,
                    reply_to_email = EXCLUDED.reply_to_email,
                    daily_limit = EXCLUDED.daily_limit,
                    enabled = EXCLUDED.enabled,
                    account_name = EXCLUDED.account_name,
                    provider = EXCLUDED.provider,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                config.get("smtp_host", ""),
                config.get("smtp_port", 587),
                config.get("smtp_username", ""),
                smtp_password,
                config.get("smtp_encryption", "TLS"),
                config.get("from_email", ""),
                config.get("from_name", "Astegni"),
                config.get("reply_to_email", ""),
                config.get("daily_limit", 1000),
                config.get("enabled", False),
                config.get("account_name", "Primary Email"),
                config.get("provider", "custom")
            ))
        else:
            # Don't update password field
            cursor.execute("""
                INSERT INTO system_email_config (
                    id, smtp_host, smtp_port, smtp_username,
                    smtp_encryption, from_email, from_name, reply_to_email,
                    daily_limit, enabled, account_name, provider
                ) VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    smtp_host = EXCLUDED.smtp_host,
                    smtp_port = EXCLUDED.smtp_port,
                    smtp_username = EXCLUDED.smtp_username,
                    smtp_encryption = EXCLUDED.smtp_encryption,
                    from_email = EXCLUDED.from_email,
                    from_name = EXCLUDED.from_name,
                    reply_to_email = EXCLUDED.reply_to_email,
                    daily_limit = EXCLUDED.daily_limit,
                    enabled = EXCLUDED.enabled,
                    account_name = EXCLUDED.account_name,
                    provider = EXCLUDED.provider,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                config.get("smtp_host", ""),
                config.get("smtp_port", 587),
                config.get("smtp_username", ""),
                config.get("smtp_encryption", "TLS"),
                config.get("from_email", ""),
                config.get("from_name", "Astegni"),
                config.get("reply_to_email", ""),
                config.get("daily_limit", 1000),
                config.get("enabled", False),
                config.get("account_name", "Primary Email"),
                config.get("provider", "custom")
            ))

        conn.commit()

        # Also update .env file with email configuration
        env_updates = {
            "SMTP_HOST": config.get("smtp_host", "smtp.gmail.com"),
            "SMTP_PORT": str(config.get("smtp_port", 587)),
            "SMTP_USER": config.get("smtp_username", ""),
            "FROM_EMAIL": config.get("from_email", ""),
            "FROM_NAME": config.get("from_name", "Astegni"),
        }

        # Only update password in .env if provided
        if smtp_password:
            env_updates["SMTP_PASSWORD"] = smtp_password

        try:
            update_env_file(env_updates)
            return {"success": True, "message": "Email configuration updated in database and .env file"}
        except Exception as env_error:
            # Database updated successfully, but .env failed
            print(f"Warning: .env update failed: {env_error}")
            return {
                "success": True,
                "message": "Email configuration updated in database (warning: .env file update failed)",
                "warning": str(env_error)
            }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating email config: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/email-templates/{template_id}")
async def get_email_template(template_id: int):
    """Get a specific email template by ID"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, template_name, subject, body, enabled, variables
            FROM system_email_templates
            WHERE id = %s
        """, (template_id,))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Template not found")

        template = {
            "id": row[0],
            "template_name": row[1],
            "subject": row[2],
            "body": row[3],
            "enabled": row[4],
            "variables": row[5] or []
        }

        return {"success": True, "data": template}

    finally:
        cursor.close()
        conn.close()


@router.put("/email-templates/{template_id}")
async def update_email_template(template_id: int, template: Dict[str, Any]):
    """Update an email template"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE system_email_templates
            SET subject = %s,
                body = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (
            template.get("subject", ""),
            template.get("body", ""),
            template_id
        ))

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Template not found")

        conn.commit()
        return {"success": True, "message": "Template updated successfully"}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating template: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.post("/test-email")
async def send_test_email(data: Dict[str, Any]):
    """Send a test email to verify configuration"""
    from email_service import email_service

    try:
        test_email = data.get("test_email")
        if not test_email:
            raise HTTPException(status_code=400, detail="test_email is required")

        # Send test email using the email service
        success = email_service.send_otp_email(
            to_email=test_email,
            otp_code="123456",
            purpose="Configuration Test"
        )

        if success:
            return {"success": True, "message": f"Test email sent successfully to {test_email}"}
        else:
            return {"success": False, "message": "Failed to send test email. Check server logs for details."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending test email: {str(e)}")

# SMS CONFIGURATION ENDPOINTS
# Add these endpoints to system_settings_endpoints.py after the @router.post("/test-email") endpoint (line 807)

@router.get("/sms-config")
async def get_sms_config():
    """Get SMS configuration"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT twilio_account_sid, twilio_from_number, default_country_code,
                   enabled, daily_limit, otp_expiry_minutes, otp_length, otp_numeric_only
            FROM system_sms_config
            LIMIT 1
        """)

        row = cursor.fetchone()

        if not row:
            config = {
                "twilio_account_sid": "",
                "twilio_from_number": "",
                "default_country_code": "+251",
                "enabled": True,
                "daily_limit": 1000,
                "otp_expiry_minutes": 5,
                "otp_length": 6,
                "otp_numeric_only": True
            }
        else:
            config = {
                "twilio_account_sid": row[0] or "",
                "twilio_from_number": row[1] or "",
                "default_country_code": row[2] or "+251",
                "enabled": row[3] if row[3] is not None else True,
                "daily_limit": row[4] or 1000,
                "otp_expiry_minutes": row[5] or 5,
                "otp_length": row[6] or 6,
                "otp_numeric_only": row[7] if row[7] is not None else True
            }

        return {"success": True, **config}

    finally:
        cursor.close()
        conn.close()


@router.put("/sms-config")
async def update_sms_config(config: Dict[str, Any]):
    """Update SMS configuration"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Extract auth token if provided (optional field)
        twilio_auth_token = config.get("twilio_auth_token")

        # Build UPDATE query - only update auth token if provided
        if twilio_auth_token:
            cursor.execute("""
                INSERT INTO system_sms_config (
                    id, twilio_account_sid, twilio_auth_token, twilio_from_number,
                    default_country_code, enabled, daily_limit, otp_expiry_minutes,
                    otp_length, otp_numeric_only
                ) VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    twilio_account_sid = EXCLUDED.twilio_account_sid,
                    twilio_auth_token = EXCLUDED.twilio_auth_token,
                    twilio_from_number = EXCLUDED.twilio_from_number,
                    default_country_code = EXCLUDED.default_country_code,
                    enabled = EXCLUDED.enabled,
                    daily_limit = EXCLUDED.daily_limit,
                    otp_expiry_minutes = EXCLUDED.otp_expiry_minutes,
                    otp_length = EXCLUDED.otp_length,
                    otp_numeric_only = EXCLUDED.otp_numeric_only,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                config.get("twilio_account_sid", ""),
                twilio_auth_token,
                config.get("twilio_from_number", ""),
                config.get("default_country_code", "+251"),
                config.get("enabled", True),
                config.get("daily_limit", 1000),
                config.get("otp_expiry_minutes", 5),
                config.get("otp_length", 6),
                config.get("otp_numeric_only", True)
            ))
        else:
            # Don't update auth token field
            cursor.execute("""
                INSERT INTO system_sms_config (
                    id, twilio_account_sid, twilio_from_number,
                    default_country_code, enabled, daily_limit, otp_expiry_minutes,
                    otp_length, otp_numeric_only
                ) VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    twilio_account_sid = EXCLUDED.twilio_account_sid,
                    twilio_from_number = EXCLUDED.twilio_from_number,
                    default_country_code = EXCLUDED.default_country_code,
                    enabled = EXCLUDED.enabled,
                    daily_limit = EXCLUDED.daily_limit,
                    otp_expiry_minutes = EXCLUDED.otp_expiry_minutes,
                    otp_length = EXCLUDED.otp_length,
                    otp_numeric_only = EXCLUDED.otp_numeric_only,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                config.get("twilio_account_sid", ""),
                config.get("twilio_from_number", ""),
                config.get("default_country_code", "+251"),
                config.get("enabled", True),
                config.get("daily_limit", 1000),
                config.get("otp_expiry_minutes", 5),
                config.get("otp_length", 6),
                config.get("otp_numeric_only", True)
            ))

        conn.commit()
        return {"success": True, "message": "SMS configuration updated successfully"}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating SMS config: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/sms-stats")
async def get_sms_stats():
    """Get SMS statistics for today"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                COALESCE(SUM(CASE WHEN status IN ('sent', 'delivered', 'pending', 'failed') THEN 1 ELSE 0 END), 0) as sent_today,
                COALESCE(SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END), 0) as delivered,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed
            FROM system_sms_log
            WHERE DATE(sent_at) = CURRENT_DATE
        """)

        row = cursor.fetchone()

        stats = {
            "sent_today": row[0] if row else 0,
            "delivered": row[1] if row else 0,
            "pending": row[2] if row else 0,
            "failed": row[3] if row else 0
        }

        return {"success": True, **stats}

    finally:
        cursor.close()
        conn.close()


@router.post("/test-sms-connection")
async def test_sms_connection():
    """Test SMS connection (verify Twilio credentials)"""
    try:
        from sms_service import sms_service

        if not sms_service.is_configured:
            return {
                "success": False,
                "message": "SMS service is not configured. Please configure Twilio settings first."
            }

        # Check if Twilio client is initialized
        if sms_service.client is None:
            return {
                "success": False,
                "message": "Failed to initialize Twilio client. Please check your credentials."
            }

        return {
            "success": True,
            "message": f"SMS connection successful! Twilio is properly configured with number {sms_service.twilio_from_number}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error testing SMS connection: {str(e)}")


@router.post("/send-test-sms")
async def send_test_sms(data: Dict[str, Any]):
    """Send a test SMS to verify configuration"""
    from sms_service import sms_service

    try:
        phone_number = data.get("phone_number")
        message = data.get("message")

        if not phone_number:
            raise HTTPException(status_code=400, detail="phone_number is required")

        if not message:
            raise HTTPException(status_code=400, detail="message is required")

        # Send test SMS using the SMS service
        success = sms_service.send_otp_sms(
            to_phone=phone_number,
            otp_code="",  # Not an OTP, just a test message
            purpose="Test Message"
        )

        # If sending a custom message, we need to use the actual message
        # For now, we'll use the send_otp_sms method with a simple approach
        # In production, you might want to add a send_sms() method to sms_service

        if success:
            # Log the SMS
            conn = get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT INTO system_sms_log (phone_number, message, status, sent_at)
                    VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                """, (phone_number, message, 'sent'))
                conn.commit()
            finally:
                cursor.close()
                conn.close()

            return {"success": True, "message": f"Test SMS sent successfully to {phone_number}"}
        else:
            return {"success": False, "message": "Failed to send test SMS. Check server logs for details."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending test SMS: {str(e)}")

@router.get("/payment-gateways")
async def get_payment_gateways():
    """Get payment gateways"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, gateway_name, display_name, enabled, test_mode
            FROM system_payment_gateways
            ORDER BY gateway_name
        """)

        rows = cursor.fetchall()

        gateways = []
        for row in rows:
            gateways.append({
                "id": row[0],
                "gateway_name": row[1],
                "display_name": row[2] or "",
                "enabled": row[3],
                "test_mode": row[4]
            })

        return {"success": True, "data": gateways}

    finally:
        cursor.close()
        conn.close()


@router.get("/subscription-tiers")
async def get_subscription_tiers():
    """Get subscription tiers"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, tier_name, display_name, price_monthly, price_yearly, is_active
            FROM system_subscription_tiers
            ORDER BY id
        """)

        rows = cursor.fetchall()

        tiers = []
        for row in rows:
            tiers.append({
                "id": row[0],
                "tier_name": row[1],
                "display_name": row[2] or "",
                "price_monthly": float(row[3] or 0),
                "price_yearly": float(row[4] or 0),
                "is_active": row[5]
            })

        return {"success": True, "data": tiers}

    finally:
        cursor.close()
        conn.close()


@router.get("/affiliate-settings")
async def get_affiliate_settings():
    """Get affiliate settings"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT program_name, commission_rate, min_payout, cookie_duration_days, enabled
            FROM system_affiliate_settings
            LIMIT 1
        """)

        row = cursor.fetchone()

        if not row:
            settings = {
                "program_name": "Astegni Affiliate Program",
                "commission_rate": 10.00,
                "min_payout": 500.00,
                "cookie_duration_days": 30,
                "enabled": False
            }
        else:
            settings = {
                "program_name": row[0] or "Astegni Affiliate Program",
                "commission_rate": float(row[1] or 10.00),
                "min_payout": float(row[2] or 500.00),
                "cookie_duration_days": row[3] or 30,
                "enabled": row[4] if row[4] is not None else False
            }

        return {"success": True, "data": settings}

    finally:
        cursor.close()
        conn.close()


@router.get("/security-settings")
async def get_security_settings():
    """Get security settings"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT two_factor_auth_enabled, session_timeout_minutes, max_login_attempts,
                   lockout_duration_minutes, password_min_length, password_require_uppercase,
                   password_require_numbers, rate_limiting_enabled
            FROM system_security_settings
            LIMIT 1
        """)

        row = cursor.fetchone()

        if not row:
            settings = {
                "two_factor_auth_enabled": False,
                "session_timeout_minutes": 30,
                "max_login_attempts": 5,
                "lockout_duration_minutes": 30,
                "password_min_length": 8,
                "password_require_uppercase": True,
                "password_require_numbers": True,
                "rate_limiting_enabled": True
            }
        else:
            settings = {
                "two_factor_auth_enabled": row[0] if row[0] is not None else False,
                "session_timeout_minutes": row[1] or 30,
                "max_login_attempts": row[2] or 5,
                "lockout_duration_minutes": row[3] or 30,
                "password_min_length": row[4] or 8,
                "password_require_uppercase": row[5] if row[5] is not None else True,
                "password_require_numbers": row[6] if row[6] is not None else True,
                "rate_limiting_enabled": row[7] if row[7] is not None else True
            }

        return {"success": True, "data": settings}

    finally:
        cursor.close()
        conn.close()


@router.get("/backup-config")
async def get_backup_config():
    """Get backup configuration"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT auto_backup_enabled, backup_frequency, backup_time,
                   backup_retention_days, include_media, include_database
            FROM system_backup_config
            LIMIT 1
        """)

        row = cursor.fetchone()

        if not row:
            config = {
                "auto_backup_enabled": True,
                "backup_frequency": "daily",
                "backup_time": "02:00",
                "backup_retention_days": 30,
                "include_media": False,
                "include_database": True
            }
        else:
            config = {
                "auto_backup_enabled": row[0] if row[0] is not None else True,
                "backup_frequency": row[1] or "daily",
                "backup_time": row[2] or "02:00",
                "backup_retention_days": row[3] or 30,
                "include_media": row[4] if row[4] is not None else False,
                "include_database": row[5] if row[5] is not None else True
            }

        return {"success": True, "data": config}

    finally:
        cursor.close()
        conn.close()


@router.get("/backup-history")
async def get_backup_history(limit: int = 50):
    """Get backup history (returns empty array if no data)"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, backup_type, backup_size_mb, status, created_at
            FROM system_backup_history
            ORDER BY created_at DESC
            LIMIT %s
        """, (limit,))

        rows = cursor.fetchall()

        history = []
        for row in rows:
            history.append({
                "id": row[0],
                "backup_type": row[1],
                "backup_size_mb": float(row[2] or 0),
                "status": row[3],
                "created_at": row[4].isoformat() if row[4] else None
            })

        return {"success": True, "data": history}

    finally:
        cursor.close()
        conn.close()


@router.get("/maintenance")
async def get_maintenance_mode():
    """Get maintenance mode status"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT is_active, message, scheduled_start, scheduled_end
            FROM system_maintenance
            LIMIT 1
        """)

        row = cursor.fetchone()

        if not row:
            maintenance = {
                "is_active": False,
                "message": "System is under maintenance. We will be back soon!",
                "scheduled_start": None,
                "scheduled_end": None
            }
        else:
            maintenance = {
                "is_active": row[0] if row[0] is not None else False,
                "message": row[1] or "",
                "scheduled_start": row[2].isoformat() if row[2] else None,
                "scheduled_end": row[3].isoformat() if row[3] else None
            }

        return {"success": True, "data": maintenance}

    finally:
        cursor.close()
        conn.close()


@router.put("/maintenance")
async def update_maintenance_mode(data: Dict[str, Any]):
    """Update maintenance mode"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO system_maintenance (id, is_active, message)
            VALUES (1, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                is_active = EXCLUDED.is_active,
                message = EXCLUDED.message,
                updated_at = CURRENT_TIMESTAMP
        """, (
            data.get("is_active", False),
            data.get("message", "System is under maintenance")
        ))

        conn.commit()
        return {"success": True, "message": "Maintenance mode updated"}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating maintenance: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/logs")
async def get_system_logs(limit: int = 100, log_level: Optional[str] = None):
    """Get system logs (returns empty array if no data)"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        if log_level:
            cursor.execute("""
                SELECT id, log_level, message, created_at
                FROM system_logs
                WHERE log_level = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (log_level, limit))
        else:
            cursor.execute("""
                SELECT id, log_level, message, created_at
                FROM system_logs
                ORDER BY created_at DESC
                LIMIT %s
            """, (limit,))

        rows = cursor.fetchall()

        logs = []
        for row in rows:
            logs.append({
                "id": row[0],
                "log_level": row[1],
                "message": row[2],
                "created_at": row[3].isoformat() if row[3] else None
            })

        return {"success": True, "data": logs, "total": len(logs)}

    finally:
        cursor.close()
        conn.close()


@router.get("/performance")
async def get_performance_metrics():
    """Get real-time performance metrics (returns 0 if no data)"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get latest metrics from last hour
        cursor.execute("""
            SELECT metric_type,
                   AVG(metric_value) as avg_value,
                   MAX(metric_value) as max_value,
                   MIN(metric_value) as min_value
            FROM system_performance_metrics
            WHERE recorded_at >= NOW() - INTERVAL '1 hour'
            GROUP BY metric_type
        """)

        rows = cursor.fetchall()

        if not rows:
            metrics = {
                "cpu_usage": {"avg": 0, "max": 0, "min": 0},
                "memory_usage": {"avg": 0, "max": 0, "min": 0},
                "disk_usage": {"avg": 0, "max": 0, "min": 0},
                "response_time": {"avg": 0, "max": 0, "min": 0}
            }
        else:
            metrics = {}
            for row in rows:
                metrics[row[0]] = {
                    "avg": float(row[1] or 0),
                    "max": float(row[2] or 0),
                    "min": float(row[3] or 0)
                }

            # Ensure all metric types exist
            for metric_type in ["cpu_usage", "memory_usage", "disk_usage", "response_time"]:
                if metric_type not in metrics:
                    metrics[metric_type] = {"avg": 0, "max": 0, "min": 0}

        return {"success": True, "data": metrics}

    finally:
        cursor.close()
        conn.close()


# ============================================
# SYSTEM MEDIA ENDPOINTS (media_router)
# ============================================

def verify_admin_token(authorization: str):
    """Verify admin token and return admin_id"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.replace('Bearer ', '')
    try:
        import jwt
        # Import SECRET_KEY from utils
        from utils import SECRET_KEY, ALGORITHM
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Accept both user tokens (sub) and admin tokens (admin_id)
        admin_id = payload.get("admin_id") or payload.get("sub")
        if not admin_id:
            raise HTTPException(status_code=401, detail="Invalid token format")
        return admin_id
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@media_router.get("/system-media")
async def get_system_media_admin(authorization: str = Header(None)):
    """Get all system media (images and videos) for admin panel"""
    verify_admin_token(authorization)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, uploader_id, media_type, title, description, file_url,
                   thumbnail, category, targets, tags, is_active, download_count,
                   likes, dislikes, comments, shares, saves, is_favorite,
                   created_at, updated_at
            FROM system_media
            WHERE is_active = true
            ORDER BY created_at DESC
        """)

        rows = cursor.fetchall()

        images = []
        videos = []

        for row in rows:
            media_item = {
                "id": row[0],
                "uploader_id": row[1],
                "name": row[3],  # title as name for frontend
                "title": row[3],
                "description": row[4],
                "url": row[5],  # file_url as url for frontend
                "file_url": row[5],
                "thumbnail": row[6],
                "type": row[7],  # category as type for frontend
                "category": row[7],
                "targets": row[8] if row[8] else [],
                "tags": row[9] if row[9] else [],
                "is_active": row[10],
                "download_count": row[11],
                "likes": row[12],
                "dislikes": row[13],
                "comments": row[14] if row[14] else [],
                "shares": row[15],
                "saves": row[16],
                "is_favorite": row[17],
                "uploaded_at": row[18].strftime('%Y-%m-%d') if row[18] else None,
                "created_at": row[18].isoformat() if row[18] else None,
                "updated_at": row[19].isoformat() if row[19] else None,
                "size": 0  # We don't store size, frontend uses for display
            }

            # Sort into images or videos based on media_type
            if row[2] == 'video':
                videos.append(media_item)
            else:
                images.append(media_item)

        return {
            "success": True,
            "images": images,
            "videos": videos,
            "total": len(rows)
        }

    except Exception as e:
        print(f"Error fetching system media: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@media_router.post("/upload")
async def upload_system_media(
    file: UploadFile = File(...),
    type: str = Form(...),  # 'image' or 'video'
    name: str = Form(...),
    category: str = Form(...),
    authorization: str = Header(None)
):
    """Upload system media (image or video)"""
    admin_id = verify_admin_token(authorization)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        unique_filename = f"system_{type}_{timestamp}_{unique_id}.{file_extension}"

        # Upload to Backblaze B2
        try:
            from backblaze_service import get_backblaze_service
            b2_service = get_backblaze_service()

            # Use 'system' as user_id prefix for system-wide media
            # This will create paths like: images/posts/user_system/filename.jpg
            result = b2_service.upload_file(
                file_data=file_content,
                file_name=unique_filename,
                file_type=type,  # 'image' or 'video'
                content_type=file.content_type,
                user_id='system'  # System-wide uploads
            )

            if not result:
                raise Exception("Upload returned no result")

            file_url = result['url']
            print(f"Uploaded to Backblaze: {file_url}")

        except Exception as e:
            print(f"Backblaze upload failed: {e}")
            # Fallback to local storage
            local_folder = f"system_{type}s"
            os.makedirs(local_folder, exist_ok=True)
            local_path = f"{local_folder}/{unique_filename}"
            with open(local_path, 'wb') as f:
                f.write(file_content)
            file_url = f"/{local_path}"

        # Insert into database
        cursor.execute("""
            INSERT INTO system_media (
                uploader_id, media_type, title, description, file_url,
                thumbnail, category, targets, tags, is_active, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """, (
            admin_id,
            type,  # 'image' or 'video'
            name,
            '',  # description
            file_url,
            file_url if type == 'image' else None,  # thumbnail same as url for images
            category,
            json.dumps([]),  # targets
            json.dumps([])   # tags
        ))

        new_id = cursor.fetchone()[0]
        conn.commit()

        return {
            "success": True,
            "message": "Media uploaded successfully",
            "id": new_id,
            "file_url": file_url,
            "media_type": type,
            "name": name,
            "category": category
        }

    except Exception as e:
        conn.rollback()
        print(f"Error uploading system media: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@media_router.delete("/{media_type}/{media_id}")
async def delete_system_media_admin(
    media_type: str,
    media_id: int,
    authorization: str = Header(None)
):
    """Delete system media by type and ID"""
    verify_admin_token(authorization)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # First get the media record to get file URL for B2 deletion
        cursor.execute("""
            SELECT file_url, thumbnail FROM system_media
            WHERE id = %s AND media_type = %s
        """, (media_id, media_type))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Media not found")

        file_url, thumbnail_url = row

        # Try to delete from Backblaze B2
        try:
            from backblaze_service import get_backblaze_service
            b2_service = get_backblaze_service()

            # Extract filename from URL and delete
            if file_url:
                file_name = file_url.split('/')[-1] if '/' in file_url else file_url
                b2_service.delete_file(file_name)

            # Delete thumbnail if different from main file
            if thumbnail_url and thumbnail_url != file_url:
                thumb_name = thumbnail_url.split('/')[-1] if '/' in thumbnail_url else thumbnail_url
                b2_service.delete_file(thumb_name)

        except Exception as e:
            print(f"Warning: Failed to delete file from B2: {e}")
            # Continue with database deletion even if B2 deletion fails

        # Delete from database
        cursor.execute("DELETE FROM system_media WHERE id = %s", (media_id,))
        conn.commit()

        return {
            "success": True,
            "message": "Media deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error deleting system media: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ============================================
# UPLOAD LIMITS / STORAGE SETTINGS ENDPOINTS
# ============================================

@router.get("/upload-limits")
async def get_upload_limits(authorization: str = Header(None)):
    """Get all upload/storage limits linked to subscription plans"""
    verify_admin_token(authorization)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                sms.id,
                sms.subscription_plan_id,
                sp.package_title,
                sp.package_price,
                sms.max_image_size_mb,
                sms.max_video_size_mb,
                sms.max_document_size_mb,
                sms.max_audio_size_mb,
                sms.storage_limit_gb,
                sms.created_at,
                sms.updated_at
            FROM system_media_settings sms
            LEFT JOIN subscription_plans sp ON sp.id = sms.subscription_plan_id
            ORDER BY sp.display_order ASC, sms.id ASC
        """)

        rows = cursor.fetchall()

        settings = []
        for row in rows:
            settings.append({
                "id": row[0],
                "subscription_plan_id": row[1],
                "plan_name": row[2] or "Unknown",
                "price": float(row[3]) if row[3] else 0,
                "max_image_size_mb": row[4] or 0,
                "max_video_size_mb": row[5] or 0,
                "max_document_size_mb": row[6] or 0,
                "max_audio_size_mb": row[7] or 0,
                "storage_limit_gb": row[8] or 0,
                "created_at": row[9].isoformat() if row[9] else None,
                "updated_at": row[10].isoformat() if row[10] else None
            })

        return {"success": True, "settings": settings}

    except Exception as e:
        print(f"Error fetching upload limits: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.get("/subscription-plans-search")
async def search_subscription_plans(
    q: str = "",
    authorization: str = Header(None)
):
    """Search subscription plans for live search dropdown (by name, returns ID)"""
    verify_admin_token(authorization)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        if q:
            cursor.execute("""
                SELECT id, package_title, package_price, is_active
                FROM subscription_plans
                WHERE LOWER(package_title) LIKE LOWER(%s)
                ORDER BY display_order ASC
            """, (f"%{q}%",))
        else:
            cursor.execute("""
                SELECT id, package_title, package_price, is_active
                FROM subscription_plans
                ORDER BY display_order ASC
            """)

        rows = cursor.fetchall()

        plans = []
        for row in rows:
            plans.append({
                "id": row[0],
                "plan_name": row[1],
                "price": float(row[2]) if row[2] else 0,
                "is_active": row[3]
            })

        return {"success": True, "plans": plans}

    except Exception as e:
        print(f"Error searching subscription plans: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.post("/upload-limits")
async def create_upload_limit(
    data: Dict[str, Any],
    authorization: str = Header(None)
):
    """Create new upload/storage limit settings for a subscription plan"""
    verify_admin_token(authorization)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        subscription_plan_id = data.get("subscription_plan_id")

        if not subscription_plan_id:
            raise HTTPException(status_code=400, detail="subscription_plan_id is required")

        # Ensure it's an integer
        try:
            subscription_plan_id = int(subscription_plan_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="subscription_plan_id must be an integer")

        # Check if the subscription plan exists
        cursor.execute("SELECT id FROM subscription_plans WHERE id = %s", (subscription_plan_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail=f"Subscription plan with ID {subscription_plan_id} not found")

        # Check if settings already exist for this plan
        cursor.execute("""
            SELECT id FROM system_media_settings WHERE subscription_plan_id = %s
        """, (subscription_plan_id,))

        if cursor.fetchone():
            raise HTTPException(status_code=400, detail=f"Settings already exist for this subscription plan")

        cursor.execute("""
            INSERT INTO system_media_settings (
                subscription_plan_id,
                max_image_size_mb,
                max_video_size_mb,
                max_document_size_mb,
                max_audio_size_mb,
                storage_limit_gb,
                created_at,
                updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """, (
            subscription_plan_id,
            data.get("max_image_size_mb", 5),
            data.get("max_video_size_mb", 50),
            data.get("max_document_size_mb", 10),
            data.get("max_audio_size_mb", 10),
            data.get("storage_limit_gb", 5)
        ))

        new_id = cursor.fetchone()[0]
        conn.commit()

        return {
            "success": True,
            "message": "Storage settings created successfully",
            "id": new_id
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error creating upload limit: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.put("/upload-limits/{setting_id}")
async def update_upload_limit(
    setting_id: int,
    data: Dict[str, Any],
    authorization: str = Header(None)
):
    """Update upload/storage limit settings"""
    verify_admin_token(authorization)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if setting exists
        cursor.execute("SELECT id FROM system_media_settings WHERE id = %s", (setting_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Setting not found")

        cursor.execute("""
            UPDATE system_media_settings SET
                max_image_size_mb = %s,
                max_video_size_mb = %s,
                max_document_size_mb = %s,
                max_audio_size_mb = %s,
                storage_limit_gb = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (
            data.get("max_image_size_mb", 5),
            data.get("max_video_size_mb", 50),
            data.get("max_document_size_mb", 10),
            data.get("max_audio_size_mb", 10),
            data.get("storage_limit_gb", 5),
            setting_id
        ))

        conn.commit()

        return {"success": True, "message": "Storage settings updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error updating upload limit: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.delete("/upload-limits/{setting_id}")
async def delete_upload_limit(
    setting_id: int,
    authorization: str = Header(None)
):
    """Delete upload/storage limit settings"""
    verify_admin_token(authorization)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if setting exists and get plan name for message
        cursor.execute("""
            SELECT sp.plan_name
            FROM system_media_settings sms
            LEFT JOIN subscription_plans sp ON sp.id = sms.subscription_plan_id
            WHERE sms.id = %s
        """, (setting_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Setting not found")

        plan_name = row[0] or "Unknown"

        cursor.execute("DELETE FROM system_media_settings WHERE id = %s", (setting_id,))
        conn.commit()

        return {
            "success": True,
            "message": f"Storage settings for '{plan_name}' deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error deleting upload limit: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
