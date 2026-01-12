"""
View Tutor Profile API Endpoints
Comprehensive endpoints for displaying tutor profile data in view-tutor.html
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

router = APIRouter(prefix="/api/view-tutor", tags=["view-tutor"])

def get_db_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL)

# ============================================
# GET COMPLETE TUTOR PROFILE (Main endpoint)
# ============================================

@router.get("/{tutor_id}")
async def get_complete_tutor_profile(tutor_id: int, by_user_id: bool = Query(False)):
    """
    Get complete tutor profile with all related data for view-tutor.html
    Returns: profile, stats, reviews, achievements, certificates, experience, videos, packages, schedules

    Args:
        tutor_id: Can be either tutor_profile.id or user.id (depending on by_user_id parameter)
        by_user_id: If True, treats tutor_id as user.id instead of tutor_profile.id
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # 1. GET TUTOR PROFILE + USER DATA
            # Support both tutor_profile.id and user.id lookups
            where_clause = "tp.user_id = %s" if by_user_id else "tp.id = %s"

            cur.execute(f"""
                SELECT
                    tp.id, tp.user_id, tp.username, tp.bio, tp.quote,
                    tp.location, tp.languages,
                    tp.hero_titles, tp.hero_subtitle,
                    tp.is_verified, tp.verification_status, tp.profile_picture, tp.cover_image,
                    tp.social_links,
                    u.first_name, u.father_name, u.grandfather_name, u.email, u.phone, u.gender,
                    tp.expertise_badge, tp.is_suspended, tp.suspension_reason,
                    tp.is_active, tp.created_at, tp.updated_at
                FROM tutor_profiles tp
                JOIN users u ON tp.user_id = u.id
                WHERE {where_clause}
            """, (tutor_id,))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Tutor not found")

            # Build full name (Ethiopian convention)
            # Handle NULL values gracefully
            # New column order after removing courses, grades, course_type, teaches_at, sessionFormat, experience, courses_created
            first_name = row[14] or ""
            father_name = row[15] or ""
            grandfather_name = row[16] or ""
            full_name = " ".join(filter(None, [first_name, father_name, grandfather_name]))

            profile = {
                "id": row[0],                                           # 0: tp.id
                "user_id": row[1],                                      # 1: tp.user_id
                "username": row[2],                                     # 2: tp.username
                "full_name": full_name,
                "first_name": first_name,                               # 14: u.first_name
                "father_name": father_name,                             # 15: u.father_name
                "grandfather_name": grandfather_name,                   # 16: u.grandfather_name
                "bio": row[3],                                          # 3: tp.bio
                "quote": row[4],                                        # 4: tp.quote
                "courses": [],                                          # Column removed
                "grades": [],                                           # Column removed
                "course_type": None,                                    # Column removed
                "location": row[5],                                     # 5: tp.location
                "teaches_at": None,                                     # Column removed
                "session_format": None,                                 # Column removed
                "languages": row[6] or [],                              # 6: tp.languages
                "experience": None,                                     # Column removed
                "hero_titles": row[7] or ["Excellence in Education, Delivered with Passion"],  # 7: tp.hero_titles (JSONB array)
                "hero_subtitle": row[8],                                # 8: tp.hero_subtitle
                "courses_created": 0,                                   # Column removed
                "is_verified": row[9],                                  # 9: tp.is_verified
                "verification_status": row[10],                         # 10: tp.verification_status
                "profile_picture": row[11],                             # 11: tp.profile_picture
                "cover_image": row[12],                                 # 12: tp.cover_image
                "social_links": row[13] or {},                          # 13: tp.social_links
                "email": row[17],                                       # 17: u.email
                "phone": row[18],                                       # 18: u.phone
                "gender": row[19],                                      # 19: u.gender
                "expertise_badge": row[20],                             # 20: tp.expertise_badge
                "is_suspended": row[21],                                # 21: tp.is_suspended
                "suspension_reason": row[22],                           # 22: tp.suspension_reason
                "is_active": row[23],                                   # 23: tp.is_active
                "created_at": row[24].isoformat() if row[24] else None, # 24: tp.created_at
                "updated_at": row[25].isoformat() if row[25] else None, # 25: tp.updated_at

                # Default values for fields not in database
                "rating": 0.0,
                "rating_count": 0,
                "rating_breakdown": {},
                "students_taught": 0,
                "total_students": 0,
                "total_sessions": 0,
                "success_rate": 0,
                "response_time_hours": 24,
                "total_connections": 0
            }

            # 2. GET QUICK STATS (calculated from various tables)
            # Use enrolled_courses and sessions tables
            stats = {
                "active_students": 0,
                "total_sessions_count": profile["total_sessions"],
                "completion_rate": 98,
                "response_time": f"< {profile['response_time_hours']}hrs",
                "session_format": profile["session_format"],
                "students_taught": profile["students_taught"],
                "success_rate": profile["success_rate"]
            }

            # Try to get stats from enrolled_courses and sessions tables
            try:
                # Get active students from enrolled_courses
                cur.execute("""
                    SELECT
                        COALESCE(SUM(array_length(students_id, 1)), 0) as total_students
                    FROM enrolled_courses
                    WHERE tutor_id = %s AND status = 'active'
                """, (profile["id"],))
                students_row = cur.fetchone()
                if students_row:
                    stats["active_students"] = students_row[0] or 0
                    stats["students_taught"] = students_row[0] or 0

                # Get session stats
                cur.execute("""
                    SELECT
                        COUNT(s.id) as total_sessions_count,
                        ROUND(AVG(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) * 100, 0) as completion_rate
                    FROM sessions s
                    JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                    WHERE ec.tutor_id = %s
                """, (profile["id"],))
                stats_row = cur.fetchone()
                if stats_row:
                    stats["total_sessions_count"] = stats_row[0] or profile["total_sessions"]
                    stats["completion_rate"] = float(stats_row[1]) if stats_row[1] else 98
            except Exception as e:
                print(f"Error fetching stats: {e}")
                pass  # Table might not exist, use defaults

            return {
                "profile": profile,
                "stats": stats
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching tutor profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================
# GET TUTOR REVIEWS
# ============================================

@router.get("/{tutor_id}/reviews")
async def get_tutor_reviews(
    tutor_id: int,
    limit: int = Query(default=10, le=50),
    offset: int = Query(default=0, ge=0),
    featured_only: bool = False
):
    """Get tutor reviews with pagination"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            where_clause = "WHERE tr.tutor_id = %s"
            params = [tutor_id]

            if featured_only:
                where_clause += " AND tr.is_featured = TRUE"

            # Fixed: use reviewer_id instead of student_id
            # Fixed: use subject_understanding_rating instead of subject_matter_rating
            # Removed: retention_rating (doesn't exist)
            cur.execute(f"""
                SELECT
                    tr.id, tr.rating, tr.title, tr.review_text,
                    tr.discipline_rating, tr.punctuality_rating,
                    tr.subject_understanding_rating, tr.communication_rating,
                    tr.is_verified, tr.helpful_count, tr.is_featured,
                    tr.created_at, tr.user_role,
                    u.first_name, u.father_name, u.grandfather_name,
                    sp.profile_picture, sp.grade_level
                FROM tutor_reviews tr
                JOIN users u ON tr.reviewer_id = u.id
                LEFT JOIN student_profiles sp ON u.id = sp.user_id
                {where_clause}
                ORDER BY tr.is_featured DESC, tr.created_at DESC
                LIMIT %s OFFSET %s
            """, params + [limit, offset])

            reviews = []
            for row in cur.fetchall():
                first_name = row[13] or ""
                father_name = row[14] or ""
                grandfather_name = row[15] or ""
                reviewer_name = " ".join(filter(None, [first_name, father_name, grandfather_name]))

                reviews.append({
                    "id": row[0],
                    "rating": float(row[1]) if row[1] else 0,
                    "title": row[2],
                    "review_text": row[3],
                    "discipline_rating": float(row[4]) if row[4] else 0,
                    "punctuality_rating": float(row[5]) if row[5] else 0,
                    "subject_understanding_rating": float(row[6]) if row[6] else 0,
                    "communication_rating": float(row[7]) if row[7] else 0,
                    "is_verified": row[8],
                    "helpful_count": row[9] or 0,
                    "is_featured": row[10],
                    "created_at": row[11].isoformat() if row[11] else None,
                    "user_role": row[12],
                    "reviewer_name": reviewer_name or "Anonymous",
                    "reviewer_picture": row[16],
                    "reviewer_grade": row[17]
                })

            # Get total count
            cur.execute(f"""
                SELECT COUNT(*) FROM tutor_reviews tr {where_clause}
            """, params)
            total = cur.fetchone()[0]

            return {
                "reviews": reviews,
                "total": total,
                "limit": limit,
                "offset": offset
            }

    except Exception as e:
        print(f"Error fetching reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================
# GET TUTOR ACHIEVEMENTS
# ============================================

@router.get("/{tutor_id}/achievements")
async def get_tutor_achievements(tutor_id: int, featured_only: bool = False):
    """Get tutor achievements from credentials table"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # First get user_id from tutor_profiles
            cur.execute("SELECT user_id FROM tutor_profiles WHERE id = %s", (tutor_id,))
            row = cur.fetchone()
            if not row:
                return {"achievements": []}
            user_id = row[0]

            where_clause = "WHERE uploader_id = %s AND uploader_role = 'tutor' AND document_type = 'achievement'"
            params = [user_id]
            if featured_only:
                where_clause += " AND is_featured = TRUE"

            # Use credentials table for achievements
            cur.execute(f"""
                SELECT id, title, description, issued_by, date_of_issue,
                       document_url, is_verified, is_featured, created_at
                FROM credentials
                {where_clause}
                ORDER BY is_featured DESC, date_of_issue DESC NULLS LAST
            """, params)

            achievements = []
            for row in cur.fetchall():
                year = row[4].year if row[4] else None
                achievements.append({
                    "id": row[0],
                    "title": row[1],
                    "description": row[2],
                    "category": "achievement",
                    "icon": "🏆",
                    "color": "#FFD700",
                    "year": year,
                    "date_achieved": row[4].isoformat() if row[4] else None,
                    "issuer": row[5],
                    "verification_url": row[6],
                    "is_verified": row[7],
                    "is_featured": row[8],
                    "display_order": 0
                })

            return {"achievements": achievements}

    except Exception as e:
        print(f"Error fetching achievements: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================
# GET TUTOR CERTIFICATES
# ============================================

@router.get("/{tutor_id}/certificates")
async def get_tutor_certificates(tutor_id: int, active_only: bool = True):
    """Get tutor certificates from credentials table"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # First get user_id from tutor_profiles
            cur.execute("SELECT user_id FROM tutor_profiles WHERE id = %s", (tutor_id,))
            row = cur.fetchone()
            if not row:
                return {"certificates": []}
            user_id = row[0]

            # Use credentials table for certificates (academic type)
            where_clause = "WHERE uploader_id = %s AND uploader_role = 'tutor' AND document_type IN ('certificate', 'academic')"
            params = [user_id]

            cur.execute(f"""
                SELECT id, title, description, issued_by, date_of_issue, expiry_date,
                       document_url, file_name, file_type, is_verified, is_featured,
                       verification_status, created_at
                FROM credentials
                {where_clause}
                ORDER BY is_featured DESC, date_of_issue DESC NULLS LAST
            """, params)

            certificates = []
            for row in cur.fetchall():
                certificates.append({
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "issuing_organization": row[3],
                    "credential_id": None,
                    "credential_url": row[6],
                    "issue_date": row[4].isoformat() if row[4] else None,
                    "expiry_date": row[5].isoformat() if row[5] else None,
                    "certificate_type": "academic",
                    "field_of_study": None,
                    "certificate_image_url": row[6],
                    "is_verified": row[9],
                    "is_featured": row[10],
                    "verification_status": row[11],
                    "is_active": True
                })

            return {"certificates": certificates}

    except Exception as e:
        print(f"Error fetching certificates: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================
# GET TUTOR EXPERIENCE
# ============================================

@router.get("/{tutor_id}/experience")
async def get_tutor_experience(tutor_id: int):
    """Get tutor work experience from credentials table"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # First get user_id from tutor_profiles
            cur.execute("SELECT user_id FROM tutor_profiles WHERE id = %s", (tutor_id,))
            row = cur.fetchone()
            if not row:
                return {"experience": []}
            user_id = row[0]

            # Use credentials table for experience
            cur.execute("""
                SELECT id, title, description, issued_by, date_of_issue, expiry_date,
                       document_url, is_verified, is_featured, created_at
                FROM credentials
                WHERE uploader_id = %s AND uploader_role = 'tutor' AND document_type = 'experience'
                ORDER BY is_featured DESC, date_of_issue DESC NULLS LAST
            """, (user_id,))

            experiences = []
            for row in cur.fetchall():
                # Calculate duration if dates are available
                duration_years = None
                duration_months = None
                is_current = row[5] is None  # No expiry date means current

                if row[4]:  # date_of_issue (start_date)
                    from datetime import date as dt_date
                    end = row[5] if row[5] else dt_date.today()
                    start = row[4]
                    diff_months = (end.year - start.year) * 12 + (end.month - start.month)
                    duration_years = diff_months // 12
                    duration_months = diff_months % 12

                experiences.append({
                    "id": row[0],
                    "job_title": row[1],
                    "institution": row[3],  # issued_by = company/institution
                    "location": None,
                    "start_date": row[4].isoformat() if row[4] else None,
                    "end_date": row[5].isoformat() if row[5] else None,
                    "is_current": is_current,
                    "duration_years": duration_years,
                    "duration_months": duration_months,
                    "description": row[2],
                    "responsibilities": None,
                    "achievements": None,
                    "employment_type": "Full-time",
                    "display_order": 0,
                    "document_url": row[6],
                    "is_verified": row[7],
                    "is_featured": row[8]
                })

            return {"experience": experiences}

    except Exception as e:
        print(f"Error fetching experience: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================
# GET TUTOR VIDEOS
# ============================================

@router.get("/{tutor_id}/videos")
async def get_tutor_videos(tutor_id: int, video_type: Optional[str] = None):
    """Get tutor videos"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            where_clause = "WHERE tutor_id = %s AND is_published = TRUE"
            params = [tutor_id]

            if video_type:
                where_clause += " AND video_type = %s"
                params.append(video_type)

            cur.execute(f"""
                SELECT id, title, description, video_url, thumbnail_url,
                       video_type, duration_seconds, duration_display, file_size_mb,
                       subject, grade_level, topics,
                       view_count, like_count, share_count,
                       is_featured, is_intro_video, published_at, created_at
                FROM tutor_videos
                {where_clause}
                ORDER BY is_intro_video DESC, is_featured DESC, published_at DESC
            """, params)

            videos = []
            for row in cur.fetchall():
                videos.append({
                    "id": row[0],
                    "title": row[1],
                    "description": row[2],
                    "video_url": row[3],
                    "thumbnail_url": row[4],
                    "video_type": row[5],
                    "duration_seconds": row[6],
                    "duration_display": row[7],
                    "file_size_mb": float(row[8]) if row[8] else 0,
                    "subject": row[9],
                    "grade_level": row[10],
                    "topics": row[11] or [],
                    "view_count": row[12],
                    "like_count": row[13],
                    "share_count": row[14],
                    "is_featured": row[15],
                    "is_intro_video": row[16],
                    "published_at": row[17].isoformat() if row[17] else None
                })

            return {"videos": videos}

    except Exception as e:
        print(f"Error fetching videos: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================
# GET TUTOR PACKAGES
# ============================================

@router.get("/{tutor_id}/packages")
async def get_tutor_packages(tutor_id: int):
    """Get tutor packages with course names"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Query actual columns from tutor_packages table
            cur.execute("""
                SELECT id, name, grade_level, course_ids, description,
                       session_format, schedule_type, schedule_days,
                       start_time, end_time, session_duration,
                       hourly_rate, days_per_week, hours_per_day,
                       payment_frequency,
                       discount_1_month, discount_3_month, discount_6_month, yearly_discount,
                       is_active, created_at
                FROM tutor_packages
                WHERE tutor_id = %s AND is_active = TRUE
                ORDER BY hourly_rate ASC NULLS LAST
            """, (tutor_id,))

            packages = []
            for row in cur.fetchall():
                # Calculate package price from hourly_rate * hours
                hourly_rate = float(row[11]) if row[11] else 0
                days_per_week = row[12] or 0
                hours_per_day = float(row[13]) if row[13] else 1
                session_duration = float(row[10]) if row[10] else hours_per_day

                # Estimate monthly price (4 weeks)
                session_price = hourly_rate * hours_per_day
                package_price = hourly_rate * hours_per_day * days_per_week * 4

                # course_ids is an array - fetch course names
                course_ids = row[3] if row[3] else []
                courses_with_names = []

                if course_ids:
                    cur.execute("""
                        SELECT id, course_name FROM courses WHERE id = ANY(%s)
                    """, (course_ids,))
                    course_rows = cur.fetchall()
                    courses_with_names = [{"id": c[0], "course_name": c[1]} for c in course_rows]

                packages.append({
                    "id": row[0],
                    "name": row[1],
                    "grade_level": row[2],
                    "course_ids": course_ids,
                    "courses": courses_with_names,  # Now includes course names
                    "description": row[4],
                    "session_format": row[5],
                    "schedule_type": row[6],
                    "recurring_days": row[7].split(',') if row[7] else [],  # schedule_days
                    "start_time": str(row[8]) if row[8] else None,
                    "end_time": str(row[9]) if row[9] else None,
                    "session_duration": session_duration,
                    "duration_minutes": int(session_duration * 60) if session_duration else 60,
                    "hours_per_day": hours_per_day,
                    "days_per_week": days_per_week,
                    "payment_frequency": row[14],  # payment_frequency
                    "total_sessions": days_per_week * 4 if days_per_week else 0,
                    "session_price": session_price,
                    "package_price": package_price,
                    "discount_1_month": float(row[15]) if row[15] else 0,
                    "discount_3_month": float(row[16]) if row[16] else 0,
                    "discount_6_month": float(row[17]) if row[17] else 0,
                    "yearly_discount": float(row[18]) if row[18] else 0,
                    "is_active": row[19]
                })

            return {"packages": packages}

    except Exception as e:
        print(f"Error fetching packages: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================
# GET THIS WEEK AVAILABILITY
# ============================================

@router.get("/{tutor_id}/availability/week")
async def get_week_availability(tutor_id: int):
    """Get this week's availability status for each day"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # First get user_id from tutor_profiles
            cur.execute("SELECT user_id FROM tutor_profiles WHERE id = %s", (tutor_id,))
            row = cur.fetchone()
            if not row:
                # Return default availability if tutor not found
                weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                return {"availability": [{"day": d, "status": "unavailable", "schedule": None} for d in weekdays]}
            user_id = row[0]

            # Use schedules table - check for recurring schedules (days array contains weekday names)
            # schedules table has: scheduler_id, scheduler_role, days (text array), start_time, end_time, status
            cur.execute("""
                SELECT days, start_time, end_time, status
                FROM schedules
                WHERE scheduler_id = %s AND scheduler_role = 'tutor' AND status = 'active'
            """, (user_id,))

            # Build a set of available days from all schedules
            available_days = set()
            day_schedules = {}

            for row in cur.fetchall():
                days_array = row[0]  # This is a text array like ['Monday', 'Wednesday']
                start_time = row[1]
                end_time = row[2]

                if days_array:
                    for day in days_array:
                        available_days.add(day)
                        if day not in day_schedules:
                            day_schedules[day] = []
                        day_schedules[day].append({
                            "start_time": str(start_time) if start_time else None,
                            "end_time": str(end_time) if end_time else None,
                            "is_available": True
                        })

            # Also check enrolled_courses for schedule info
            cur.execute("""
                SELECT days, start_time, end_time, status
                FROM enrolled_courses
                WHERE tutor_id = %s AND status = 'active'
            """, (tutor_id,))

            for row in cur.fetchall():
                days_json = row[0]  # This is a jsonb field
                start_time = row[1]
                end_time = row[2]

                if days_json and isinstance(days_json, dict):
                    # days might be structured as {"Monday": true, "Wednesday": true}
                    for day, is_active in days_json.items():
                        if is_active:
                            available_days.add(day)
                            if day not in day_schedules:
                                day_schedules[day] = []
                            day_schedules[day].append({
                                "start_time": str(start_time) if start_time else None,
                                "end_time": str(end_time) if end_time else None,
                                "is_available": True
                            })
                elif days_json and isinstance(days_json, list):
                    # days might be an array of day names
                    for day in days_json:
                        available_days.add(day)
                        if day not in day_schedules:
                            day_schedules[day] = []
                        day_schedules[day].append({
                            "start_time": str(start_time) if start_time else None,
                            "end_time": str(end_time) if end_time else None,
                            "is_available": True
                        })

            # Calculate status for each day
            weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            availability = []

            for day in weekdays:
                # Check if this day has any schedules
                day_schedule_list = day_schedules.get(day)

                # Default status
                if day in available_days:
                    status = "available"
                else:
                    status = "unavailable"

                availability.append({
                    "day": day,
                    "status": status,  # available, limited, booked, unavailable
                    "schedule": day_schedule_list[0] if day_schedule_list else None
                })

            return {"availability": availability}

    except Exception as e:
        print(f"Error fetching availability: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================
# GET SIMILAR TUTORS
# ============================================

@router.get("/{tutor_id}/similar")
async def get_similar_tutors(
    tutor_id: int,
    limit: int = Query(default=8, le=20),
    by_user_id: bool = Query(False)
):
    """
    Get similar tutors based on courses, subjects, location, and languages.
    Returns tutors who teach similar subjects or are in the same location.

    Args:
        tutor_id: Can be either tutor_profile.id or user.id (depending on by_user_id)
        limit: Maximum number of similar tutors to return (default 8)
        by_user_id: If True, treats tutor_id as user.id instead of tutor_profile.id
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # First, get the current tutor's profile to find matching criteria
            where_clause = "tp.user_id = %s" if by_user_id else "tp.id = %s"

            cur.execute(f"""
                SELECT tp.id, tp.user_id, tp.location, tp.languages
                FROM tutor_profiles tp
                WHERE {where_clause}
            """, (tutor_id,))

            current_tutor = cur.fetchone()
            if not current_tutor:
                raise HTTPException(status_code=404, detail="Tutor not found")

            current_tutor_profile_id = current_tutor[0]
            current_location = current_tutor[2]
            current_languages = current_tutor[3] or []

            # Get courses/subjects from tutor's packages
            cur.execute("""
                SELECT DISTINCT unnest(course_ids) as course_id
                FROM tutor_packages
                WHERE tutor_id = %s AND is_active = TRUE
            """, (current_tutor_profile_id,))
            current_courses = [row[0] for row in cur.fetchall()]

            # Build query to find similar tutors
            # Priority: 1) Same courses, 2) Same location, 3) Same languages
            # Exclude the current tutor

            # Convert languages list to a format suitable for JSON comparison
            languages_json = current_languages if current_languages else []

            cur.execute("""
                WITH tutor_scores AS (
                    SELECT
                        tp.id,
                        tp.user_id,
                        tp.username,
                        tp.profile_picture,
                        tp.location,
                        tp.languages,
                        tp.is_verified,
                        tp.expertise_badge,
                        u.first_name,
                        u.father_name,
                        u.grandfather_name,
                        -- Calculate similarity score
                        (
                            -- Score for matching courses (highest priority)
                            CASE WHEN EXISTS (
                                SELECT 1 FROM tutor_packages pkg
                                WHERE pkg.tutor_id = tp.id
                                AND pkg.is_active = TRUE
                                AND pkg.course_ids && %s::integer[]
                            ) THEN 50 ELSE 0 END
                            +
                            -- Score for same location
                            CASE WHEN tp.location = %s THEN 30 ELSE 0 END
                            +
                            -- Score for overlapping languages (tp.languages is JSON/JSONB)
                            CASE WHEN EXISTS (
                                SELECT 1 FROM jsonb_array_elements_text(
                                    CASE WHEN tp.languages IS NOT NULL AND tp.languages::text != 'null'
                                         THEN tp.languages::jsonb
                                         ELSE '[]'::jsonb
                                    END
                                ) AS lang
                                WHERE lang = ANY(%s::text[])
                            ) THEN 20 ELSE 0 END
                        ) as similarity_score,
                        -- Get average rating from reviews
                        COALESCE(
                            (SELECT AVG(rating) FROM tutor_reviews tr WHERE tr.tutor_id = tp.id),
                            0
                        ) as avg_rating,
                        -- Get review count
                        COALESCE(
                            (SELECT COUNT(*) FROM tutor_reviews tr WHERE tr.tutor_id = tp.id),
                            0
                        ) as review_count,
                        -- Get total students from enrolled_courses
                        COALESCE(
                            (SELECT SUM(array_length(students_id, 1))
                             FROM enrolled_courses ec
                             WHERE ec.tutor_id = tp.id AND ec.status = 'active'),
                            0
                        ) as total_students
                    FROM tutor_profiles tp
                    JOIN users u ON tp.user_id = u.id
                    WHERE tp.id != %s
                    AND tp.is_active = TRUE
                    AND (tp.is_suspended IS NULL OR tp.is_suspended = FALSE)
                )
                SELECT
                    id, user_id, username, profile_picture, location, languages,
                    is_verified, expertise_badge,
                    first_name, father_name, grandfather_name,
                    similarity_score, avg_rating, review_count, total_students
                FROM tutor_scores
                WHERE similarity_score > 0
                ORDER BY similarity_score DESC, avg_rating DESC, review_count DESC
                LIMIT %s
            """, (current_courses if current_courses else [],
                  current_location,
                  current_languages if current_languages else [],
                  current_tutor_profile_id,
                  limit))

            similar_tutors = []
            for row in cur.fetchall():
                # Build full name
                first_name = row[8] or ""
                father_name = row[9] or ""
                grandfather_name = row[10] or ""
                full_name = " ".join(filter(None, [first_name, father_name, grandfather_name]))

                # Get tutor's main subjects from packages
                cur.execute("""
                    SELECT DISTINCT c.course_name
                    FROM tutor_packages pkg
                    JOIN courses c ON c.id = ANY(pkg.course_ids)
                    WHERE pkg.tutor_id = %s AND pkg.is_active = TRUE
                    LIMIT 3
                """, (row[0],))
                subjects = [r[0] for r in cur.fetchall()]

                similar_tutors.append({
                    "id": row[0],
                    "user_id": row[1],
                    "username": row[2],
                    "full_name": full_name or row[2] or "Tutor",
                    "profile_picture": row[3],
                    "location": row[4],
                    "languages": row[5] or [],
                    "is_verified": row[6],
                    "expertise_badge": row[7],
                    "subjects": subjects,
                    "subjects_display": ", ".join(subjects) if subjects else "Various Subjects",
                    "similarity_score": row[11],
                    "rating": round(float(row[12]), 1) if row[12] else 0.0,
                    "review_count": row[13] or 0,
                    "total_students": row[14] or 0
                })

            # If we don't have enough similar tutors, fill with random active tutors
            if len(similar_tutors) < limit:
                remaining = limit - len(similar_tutors)
                existing_ids = [t["id"] for t in similar_tutors]
                existing_ids.append(current_tutor_profile_id)

                cur.execute("""
                    SELECT
                        tp.id, tp.user_id, tp.username, tp.profile_picture,
                        tp.location, tp.languages, tp.is_verified, tp.expertise_badge,
                        u.first_name, u.father_name, u.grandfather_name,
                        COALESCE(
                            (SELECT AVG(rating) FROM tutor_reviews tr WHERE tr.tutor_id = tp.id),
                            0
                        ) as avg_rating,
                        COALESCE(
                            (SELECT COUNT(*) FROM tutor_reviews tr WHERE tr.tutor_id = tp.id),
                            0
                        ) as review_count,
                        COALESCE(
                            (SELECT SUM(array_length(students_id, 1))
                             FROM enrolled_courses ec
                             WHERE ec.tutor_id = tp.id AND ec.status = 'active'),
                            0
                        ) as total_students
                    FROM tutor_profiles tp
                    JOIN users u ON tp.user_id = u.id
                    WHERE tp.id != ALL(%s)
                    AND tp.is_active = TRUE
                    AND (tp.is_suspended IS NULL OR tp.is_suspended = FALSE)
                    ORDER BY avg_rating DESC, review_count DESC
                    LIMIT %s
                """, (existing_ids, remaining))

                for row in cur.fetchall():
                    first_name = row[8] or ""
                    father_name = row[9] or ""
                    grandfather_name = row[10] or ""
                    full_name = " ".join(filter(None, [first_name, father_name, grandfather_name]))

                    # Get tutor's main subjects
                    cur.execute("""
                        SELECT DISTINCT c.course_name
                        FROM tutor_packages pkg
                        JOIN courses c ON c.id = ANY(pkg.course_ids)
                        WHERE pkg.tutor_id = %s AND pkg.is_active = TRUE
                        LIMIT 3
                    """, (row[0],))
                    subjects = [r[0] for r in cur.fetchall()]

                    similar_tutors.append({
                        "id": row[0],
                        "user_id": row[1],
                        "username": row[2],
                        "full_name": full_name or row[2] or "Tutor",
                        "profile_picture": row[3],
                        "location": row[4],
                        "languages": row[5] or [],
                        "is_verified": row[6],
                        "expertise_badge": row[7],
                        "subjects": subjects,
                        "subjects_display": ", ".join(subjects) if subjects else "Various Subjects",
                        "similarity_score": 0,
                        "rating": round(float(row[11]), 1) if row[11] else 0.0,
                        "review_count": row[12] or 0,
                        "total_students": row[13] or 0
                    })

            return {
                "similar_tutors": similar_tutors,
                "total": len(similar_tutors),
                "current_tutor_id": current_tutor_profile_id
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching similar tutors: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
