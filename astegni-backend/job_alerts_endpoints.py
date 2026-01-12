"""
Job Alerts and Notifications Endpoints
Handles job alert subscriptions, notifications, and email delivery
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy import text
from utils import get_current_user
import logging

# Import database connections
from models import engine

router = APIRouter()
logger = logging.getLogger(__name__)

# ============================================
# PYDANTIC SCHEMAS
# ============================================

class JobAlertCreate(BaseModel):
    alert_name: Optional[str] = None
    keywords: Optional[List[str]] = []
    job_categories: Optional[List[int]] = []
    job_type: Optional[str] = None
    location_type: Optional[str] = None
    locations: Optional[List[str]] = []
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None
    experience_level: Optional[str] = None
    notification_frequency: str = 'immediate'
    notify_via_email: bool = True
    notify_via_platform: bool = True

    @validator('notification_frequency')
    def validate_frequency(cls, v):
        if v not in ['immediate', 'daily', 'weekly']:
            raise ValueError('Invalid notification frequency')
        return v

class JobAlertUpdate(BaseModel):
    alert_name: Optional[str] = None
    is_active: Optional[bool] = None
    keywords: Optional[List[str]] = None
    job_categories: Optional[List[int]] = None
    job_type: Optional[str] = None
    location_type: Optional[str] = None
    locations: Optional[List[str]] = None
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None
    experience_level: Optional[str] = None
    notification_frequency: Optional[str] = None
    notify_via_email: Optional[bool] = None
    notify_via_platform: Optional[bool] = None

class NotificationPreferencesUpdate(BaseModel):
    email_job_alerts: Optional[bool] = None
    email_application_updates: Optional[bool] = None
    email_deadline_reminders: Optional[bool] = None
    email_marketing: Optional[bool] = None
    platform_job_alerts: Optional[bool] = None
    platform_application_updates: Optional[bool] = None
    platform_deadline_reminders: Optional[bool] = None
    platform_marketing: Optional[bool] = None
    digest_frequency: Optional[str] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    timezone: Optional[str] = None

# ============================================
# JOB ALERTS ENDPOINTS
# ============================================

@router.post("/api/jobs/alerts", status_code=status.HTTP_201_CREATED)
async def create_job_alert(
    alert_data: JobAlertCreate,
    current_user = Depends(get_current_user)
):
    """Create a new job alert subscription"""

    user_id = current_user.id

    with engine.connect() as conn:
        query = text("""
            INSERT INTO job_alerts (
                user_id, alert_name, keywords, job_categories, job_type,
                location_type, locations, min_salary, max_salary, experience_level,
                notification_frequency, notify_via_email, notify_via_platform
            )
            VALUES (
                :user_id, :alert_name, :keywords, :job_categories, :job_type,
                :location_type, :locations, :min_salary, :max_salary, :experience_level,
                :notification_frequency, :notify_via_email, :notify_via_platform
            )
            RETURNING id
        """)

        result = conn.execute(query, {
            "user_id": user_id,
            "alert_name": alert_data.alert_name,
            "keywords": alert_data.keywords,
            "job_categories": alert_data.job_categories,
            "job_type": alert_data.job_type,
            "location_type": alert_data.location_type,
            "locations": alert_data.locations,
            "min_salary": alert_data.min_salary,
            "max_salary": alert_data.max_salary,
            "experience_level": alert_data.experience_level,
            "notification_frequency": alert_data.notification_frequency,
            "notify_via_email": alert_data.notify_via_email,
            "notify_via_platform": alert_data.notify_via_platform
        })

        alert_id = result.fetchone()[0]
        conn.commit()

        logger.info(f"Job alert created: ID {alert_id} for user {user_id}")

        return {
            "id": alert_id,
            "message": "Job alert created successfully",
            "alert_name": alert_data.alert_name or f"Alert #{alert_id}"
        }


@router.get("/api/jobs/alerts")
async def get_user_job_alerts(
    current_user = Depends(get_current_user)
):
    """Get all job alerts for current user"""

    user_id = current_user.id

    with engine.connect() as conn:
        query = text("""
            SELECT
                id, user_id, alert_name, is_active, keywords, job_categories,
                job_type, location_type, locations, min_salary, max_salary,
                experience_level, notification_frequency, notify_via_email,
                notify_via_platform, total_jobs_sent, last_notified_at, created_at
            FROM job_alerts
            WHERE user_id = :user_id
            ORDER BY created_at DESC
        """)

        result = conn.execute(query, {"user_id": user_id})
        alerts = result.fetchall()

        return {
            "alerts": [
                {
                    "id": alert[0],
                    "user_id": alert[1],
                    "alert_name": alert[2],
                    "is_active": alert[3],
                    "keywords": alert[4] or [],
                    "job_categories": alert[5] or [],
                    "job_type": alert[6],
                    "location_type": alert[7],
                    "locations": alert[8] or [],
                    "min_salary": alert[9],
                    "max_salary": alert[10],
                    "experience_level": alert[11],
                    "notification_frequency": alert[12],
                    "notify_via_email": alert[13],
                    "notify_via_platform": alert[14],
                    "total_jobs_sent": alert[15],
                    "last_notified_at": alert[16],
                    "created_at": alert[17]
                }
                for alert in alerts
            ],
            "total": len(alerts)
        }


@router.put("/api/jobs/alerts/{alert_id}")
async def update_job_alert(
    alert_id: int,
    alert_data: JobAlertUpdate,
    current_user = Depends(get_current_user)
):
    """Update job alert settings"""

    user_id = current_user.id

    with engine.connect() as conn:
        # Verify ownership
        check_query = text("SELECT id FROM job_alerts WHERE id = :alert_id AND user_id = :user_id")
        result = conn.execute(check_query, {"alert_id": alert_id, "user_id": user_id})
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="Job alert not found")

        # Build dynamic update query
        update_fields = []
        params = {"alert_id": alert_id, "user_id": user_id}

        for field, value in alert_data.dict(exclude_unset=True).items():
            update_fields.append(f"{field} = :{field}")
            params[field] = value

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_fields.append("updated_at = CURRENT_TIMESTAMP")

        query = text(f"""
            UPDATE job_alerts
            SET {', '.join(update_fields)}
            WHERE id = :alert_id AND user_id = :user_id
        """)

        conn.execute(query, params)
        conn.commit()

        logger.info(f"Job alert updated: ID {alert_id}")

        return {"message": "Job alert updated successfully"}


@router.delete("/api/jobs/alerts/{alert_id}")
async def delete_job_alert(
    alert_id: int,
    current_user = Depends(get_current_user)
):
    """Delete a job alert"""

    user_id = current_user.id

    with engine.connect() as conn:
        query = text("""
            DELETE FROM job_alerts
            WHERE id = :alert_id AND user_id = :user_id
        """)

        result = conn.execute(query, {"alert_id": alert_id, "user_id": user_id})
        conn.commit()

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Job alert not found")

        logger.info(f"Job alert deleted: ID {alert_id}")

        return {"message": "Job alert deleted successfully"}


# ============================================
# NOTIFICATIONS ENDPOINTS
# ============================================

@router.get("/api/jobs/notifications")
async def get_user_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = False,
    current_user = Depends(get_current_user)
):
    """Get notifications for current user with pagination"""

    user_id = current_user.id
    offset = (page - 1) * limit

    with engine.connect() as conn:
        # Count total notifications
        count_query = text("""
            SELECT COUNT(*) FROM job_notifications
            WHERE user_id = :user_id
            """ + (" AND is_read = FALSE" if unread_only else ""))
        total = conn.execute(count_query, {"user_id": user_id}).fetchone()[0]

        # Get notifications
        query = text("""
            SELECT
                id, notification_type, title, message, action_url,
                is_read, read_at, created_at, job_id, metadata
            FROM job_notifications
            WHERE user_id = :user_id
            """ + (" AND is_read = FALSE" if unread_only else "") + """
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """)

        result = conn.execute(query, {
            "user_id": user_id,
            "limit": limit,
            "offset": offset
        })
        notifications = result.fetchall()

        return {
            "notifications": [
                {
                    "id": notif[0],
                    "notification_type": notif[1],
                    "title": notif[2],
                    "message": notif[3],
                    "action_url": notif[4],
                    "is_read": notif[5],
                    "read_at": notif[6],
                    "created_at": notif[7],
                    "job_id": notif[8],
                    "metadata": notif[9]
                }
                for notif in notifications
            ],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }


@router.put("/api/jobs/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user = Depends(get_current_user)
):
    """Mark notification as read"""

    user_id = current_user.id

    with engine.connect() as conn:
        query = text("""
            UPDATE job_notifications
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE id = :notification_id AND user_id = :user_id
        """)

        result = conn.execute(query, {"notification_id": notification_id, "user_id": user_id})
        conn.commit()

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Notification not found")

        return {"message": "Notification marked as read"}


@router.put("/api/jobs/notifications/read-all")
async def mark_all_notifications_read(
    current_user = Depends(get_current_user)
):
    """Mark all notifications as read for current user"""

    user_id = current_user.id

    with engine.connect() as conn:
        query = text("""
            UPDATE job_notifications
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE user_id = :user_id AND is_read = FALSE
        """)

        result = conn.execute(query, {"user_id": user_id})
        conn.commit()

        return {
            "message": f"{result.rowcount} notifications marked as read",
            "count": result.rowcount
        }


@router.get("/api/jobs/notifications/unread-count")
async def get_unread_count(
    current_user = Depends(get_current_user)
):
    """Get count of unread notifications"""

    user_id = current_user.id

    with engine.connect() as conn:
        query = text("""
            SELECT COUNT(*) FROM job_notifications
            WHERE user_id = :user_id AND is_read = FALSE
        """)

        count = conn.execute(query, {"user_id": user_id}).fetchone()[0]

        return {"unread_count": count}


# ============================================
# NOTIFICATION PREFERENCES ENDPOINTS
# ============================================

@router.get("/api/jobs/notification-preferences")
async def get_notification_preferences(
    current_user = Depends(get_current_user)
):
    """Get user's notification preferences"""

    user_id = current_user.id

    with engine.connect() as conn:
        query = text("""
            SELECT
                email_job_alerts, email_application_updates, email_deadline_reminders,
                email_marketing, platform_job_alerts, platform_application_updates,
                platform_deadline_reminders, platform_marketing, digest_frequency,
                quiet_hours_start, quiet_hours_end, timezone
            FROM user_notification_preferences
            WHERE user_id = :user_id
        """)

        result = conn.execute(query, {"user_id": user_id})
        prefs = result.fetchone()

        if not prefs:
            # Create default preferences
            insert_query = text("""
                INSERT INTO user_notification_preferences (user_id)
                VALUES (:user_id)
                RETURNING
                    email_job_alerts, email_application_updates, email_deadline_reminders,
                    email_marketing, platform_job_alerts, platform_application_updates,
                    platform_deadline_reminders, platform_marketing, digest_frequency,
                    quiet_hours_start, quiet_hours_end, timezone
            """)
            result = conn.execute(insert_query, {"user_id": user_id})
            conn.commit()
            prefs = result.fetchone()

        return {
            "email_job_alerts": prefs[0],
            "email_application_updates": prefs[1],
            "email_deadline_reminders": prefs[2],
            "email_marketing": prefs[3],
            "platform_job_alerts": prefs[4],
            "platform_application_updates": prefs[5],
            "platform_deadline_reminders": prefs[6],
            "platform_marketing": prefs[7],
            "digest_frequency": prefs[8],
            "quiet_hours_start": str(prefs[9]) if prefs[9] else None,
            "quiet_hours_end": str(prefs[10]) if prefs[10] else None,
            "timezone": prefs[11]
        }


@router.put("/api/jobs/notification-preferences")
async def update_notification_preferences(
    prefs_data: NotificationPreferencesUpdate,
    current_user = Depends(get_current_user)
):
    """Update user's notification preferences"""

    user_id = current_user.id

    with engine.connect() as conn:
        # Ensure preferences exist
        check_query = text("SELECT id FROM user_notification_preferences WHERE user_id = :user_id")
        result = conn.execute(check_query, {"user_id": user_id})

        if not result.fetchone():
            # Create default preferences
            insert_query = text("INSERT INTO user_notification_preferences (user_id) VALUES (:user_id)")
            conn.execute(insert_query, {"user_id": user_id})
            conn.commit()

        # Build dynamic update query
        update_fields = []
        params = {"user_id": user_id}

        for field, value in prefs_data.dict(exclude_unset=True).items():
            update_fields.append(f"{field} = :{field}")
            params[field] = value

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_fields.append("updated_at = CURRENT_TIMESTAMP")

        query = text(f"""
            UPDATE user_notification_preferences
            SET {', '.join(update_fields)}
            WHERE user_id = :user_id
        """)

        conn.execute(query, params)
        conn.commit()

        logger.info(f"Notification preferences updated for user {user_id}")

        return {"message": "Notification preferences updated successfully"}


print("[OK] Job Alerts API endpoints loaded successfully")
