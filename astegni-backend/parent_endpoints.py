"""
Parent Profile and Review Endpoints for Astegni Platform

CORRECTED ARCHITECTURE:
======================

1. ADDING A CHILD:
   - Parent clicks "Add Child" button
   - Fills: first_name, father_name, grandfather_name, email/phone, gender, date_of_birth
   - System creates user account with role="student" and temp password
   - Temp password sent via email/SMS
   - Child's user_id added to parent's children_ids array
   - Parent's user_id added to child's student_profiles.parent_id array
   - Child logs in with temp password and completes their student profile

2. ADDING A CO-PARENT:
   - Parent clicks "Add Co-Parent" button
   - Fills: first_name, father_name, grandfather_name, email/phone, gender, relationship_type
   - System creates user account with role="parent" and temp password
   - Temp password sent via email/SMS
   - ALL children from parent's children_ids added to co-parent's children_ids
   - Co-parent's user_id added to ALL children's student_profiles.parent_id arrays
   - Co-parent logs in with temp password and completes their parent profile

3. MANY-TO-MANY RELATIONSHIP:
   - parent_profiles.children_ids = [child1_user_id, child2_user_id, ...]
   - student_profiles.parent_id = [parent1_user_id, parent2_user_id, ...]
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional
from datetime import datetime, date
import secrets

# Import models
from models import (
    Base, User, ParentProfile, StudentProfile, ParentReview, TutorProfile,
    get_db, ParentProfileUpdate, ParentProfileResponse,
    ParentReviewCreate, ParentReviewUpdate, ParentReviewResponse
)
from utils import get_current_user, hash_password

router = APIRouter()

# ============================================
# PARENT PROFILE ENDPOINTS
# ============================================

@router.get("/api/parent/profile", response_model=ParentProfileResponse)
async def get_parent_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's parent profile"""
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        # Create new parent profile
        parent_profile = ParentProfile(
            user_id=current_user.id,
            username=None
        )
        db.add(parent_profile)
        db.commit()
        db.refresh(parent_profile)

    # Build name based on naming convention
    # Ethiopian: first_name + father_name + grandfather_name
    # International: first_name + last_name
    if current_user.last_name:
        # International naming convention
        display_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip()
    else:
        # Ethiopian naming convention
        name_parts = [current_user.first_name, current_user.father_name, current_user.grandfather_name]
        display_name = " ".join(part for part in name_parts if part)

    # Return complete profile with data from both users and parent_profiles tables
    return {
        "id": parent_profile.id,
        "user_id": parent_profile.user_id,
        "username": parent_profile.username,
        "name": display_name or "Parent",
        # Individual name fields
        "first_name": current_user.first_name,
        "father_name": current_user.father_name,
        "grandfather_name": current_user.grandfather_name,
        "last_name": current_user.last_name,
        # Contact info
        "email": current_user.email,
        "phone": current_user.phone,
        # Profile data from parent_profiles table
        "bio": parent_profile.bio,
        "quote": parent_profile.quote,
        "relationship_type": parent_profile.relationship_type,
        "children_ids": parent_profile.children_ids or [],
        "coparent_ids": parent_profile.coparent_ids or [],
        "total_children": parent_profile.total_children or 0,
        "rating": parent_profile.rating or 0.0,
        "rating_count": parent_profile.rating_count or 0,
        # Data from users table
        "location": current_user.location,
        "social_links": current_user.social_links or {},
        "languages": current_user.languages or [],
        "is_verified": current_user.is_verified or False,
        "profile_picture": current_user.profile_picture,  # Fixed: Now fetching from users table
        "cover_image": parent_profile.cover_image,
        # Hero fields
        "hero_title": parent_profile.hero_title or [],
        "hero_subtitle": parent_profile.hero_subtitle,
        # Timestamps
        "created_at": parent_profile.created_at,
        "updated_at": parent_profile.updated_at
    }


@router.put("/api/parent/profile")
async def update_parent_profile(
    profile_data: ParentProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update parent profile"""
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Get the user object to update user-level fields
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update fields
    update_data = profile_data.dict(exclude_unset=True)

    # Fields that belong to users table
    user_fields = ['location', 'display_location', 'profile_picture', 'social_links', 'languages']

    for key, value in update_data.items():
        if key in user_fields:
            # Update user table
            if hasattr(user, key):
                setattr(user, key, value)
        elif hasattr(parent_profile, key):
            # Update parent_profile table
            setattr(parent_profile, key, value)

    # Calculate profile completion
    total_fields = 7
    completion = 0
    if parent_profile.username: completion += 1
    if parent_profile.bio: completion += 1
    if parent_profile.quote: completion += 1
    if parent_profile.relationship_type: completion += 1
    if user.location: completion += 1  # Read from users table
    if user.profile_picture: completion += 1  # Read from users table
    if parent_profile.cover_image: completion += 1

    parent_profile.profile_completion = (completion / total_fields) * 100
    parent_profile.profile_complete = parent_profile.profile_completion >= 80

    db.commit()
    db.refresh(parent_profile)
    db.refresh(user)

    return {"message": "Profile updated successfully", "profile": parent_profile}


# ============================================
# CHILDREN ENDPOINTS (must be before {parent_id} routes to avoid route conflicts)
# ============================================

@router.get("/api/parent/children")
async def get_parent_children(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all children of current parent.

    Note: parent_profiles.children_ids stores student_profile.id values (not user_id).
    This endpoint returns enriched child data including user info and student profile data.
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    children = []
    if parent_profile.children_ids:
        for student_profile_id in parent_profile.children_ids:
            # children_ids now stores student_profile.id, not user_id
            student_profile = db.query(StudentProfile).filter(
                StudentProfile.id == student_profile_id
            ).first()

            if student_profile:
                # Get user info for this student
                child_user = db.query(User).filter(User.id == student_profile.user_id).first()

                if child_user:
                    # Build full name
                    name_parts = [
                        child_user.first_name or '',
                        child_user.father_name or '',
                        child_user.grandfather_name or ''
                    ]
                    full_name = ' '.join(part for part in name_parts if part).strip()

                    children.append({
                        "id": student_profile.id,  # student_profile.id
                        "user_id": child_user.id,
                        "name": full_name or "Unknown",
                        "first_name": child_user.first_name,
                        "father_name": child_user.father_name,
                        "email": child_user.email,
                        "phone": child_user.phone,
                        "gender": child_user.gender,
                        "profile_picture": child_user.profile_picture,  # From users table (centralized)
                        "cover_image": student_profile.cover_image,  # From student_profiles table (role-specific)
                        "username": student_profile.username,
                        "grade_level": student_profile.grade_level,
                        "studying_at": student_profile.studying_at,
                        "location": child_user.location,  # From users table (centralized)
                        "about": student_profile.about,
                        "career_aspirations": student_profile.career_aspirations,
                        "interested_in": student_profile.interested_in or [],
                        "hobbies": child_user.hobbies or [],  # From users table (centralized)
                        "languages": child_user.languages or [],  # From users table (centralized)
                        "learning_method": student_profile.learning_method or [],
                        "created_at": student_profile.created_at,
                        "updated_at": student_profile.updated_at
                    })

    return {"children": children, "total": len(children)}


# ============================================
# CO-PARENT ENDPOINTS (Must be before {parent_id} route)
# ============================================

@router.get("/api/parent/coparents")
async def get_coparents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get ONLY accepted/linked co-parents from:
    1. Directly linked via coparent_ids in parent_profiles
    2. Derived from children's parent_id arrays (co-parents who share children)

    NOTE: Pending invitations are NOT shown here. They should be viewed via
    the parenting invitations panel (My Requests > Parenting Invitations > Sent tab).
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    coparent_user_ids = set()

    # Source 1: Direct coparent_ids (stores PARENT PROFILE IDs, not user IDs)
    if parent_profile.coparent_ids:
        for coparent_profile_id in parent_profile.coparent_ids:
            # Look up the user_id from the parent profile
            coparent_parent_profile = db.query(ParentProfile).filter(
                ParentProfile.id == coparent_profile_id
            ).first()
            if coparent_parent_profile and coparent_parent_profile.user_id != current_user.id:
                coparent_user_ids.add(coparent_parent_profile.user_id)

    # Source 2: Derive co-parents from children's parent_id arrays
    # children_ids stores STUDENT PROFILE IDs, not user IDs
    if parent_profile.children_ids:
        for child_profile_id in parent_profile.children_ids:
            # Query by student profile ID, not user_id
            student_profile = db.query(StudentProfile).filter(
                StudentProfile.id == child_profile_id
            ).first()

            if student_profile and student_profile.parent_id:
                # parent_id stores PARENT PROFILE IDs, not user IDs
                for parent_profile_id in student_profile.parent_id:
                    # Look up the user_id from the parent profile
                    other_parent_profile = db.query(ParentProfile).filter(
                        ParentProfile.id == parent_profile_id
                    ).first()
                    if other_parent_profile and other_parent_profile.user_id != current_user.id:
                        coparent_user_ids.add(other_parent_profile.user_id)

    # Fetch co-parent details (ONLY accepted/linked co-parents)
    coparents = []
    for coparent_user_id in coparent_user_ids:
        parent_user = db.query(User).filter(User.id == coparent_user_id).first()
        if parent_user:
            coparent_profile = db.query(ParentProfile).filter(
                ParentProfile.user_id == coparent_user_id
            ).first()

            # Build name based on naming convention
            if parent_user.last_name:
                coparent_name = f"{parent_user.first_name or ''} {parent_user.last_name or ''}".strip()
            else:
                name_parts = [parent_user.first_name, parent_user.father_name, parent_user.grandfather_name]
                coparent_name = " ".join(part for part in name_parts if part)

            coparents.append({
                "user_id": parent_user.id,
                "parent_id": coparent_profile.id if coparent_profile else None,
                "name": coparent_name or "Parent",
                "email": parent_user.email,
                "phone": parent_user.phone,
                "gender": parent_user.gender,
                "relationship_type": coparent_profile.relationship_type if coparent_profile else None,
                "profile_picture": parent_user.profile_picture,  # Read from users table
                "created_at": parent_user.created_at,
                "status": "accepted"
            })

    return {"coparents": coparents, "total": len(coparents)}


# ============================================
# PARENT SCHEDULES ENDPOINTS
# NOTE: Must be BEFORE the wildcard /api/parent/{parent_id} route
# ============================================

@router.get("/api/parent/schedules")
async def get_parent_schedules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all schedules for the parent.
    Reads from schedules table where scheduler_id = user_id and scheduler_role = 'parent'.
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Query schedules for this parent
    schedules = db.execute(text("""
        SELECT
            s.id,
            s.scheduler_id,
            s.scheduler_role,
            s.title,
            s.description,
            s.year,
            s.schedule_type,
            s.months,
            s.days,
            s.specific_dates,
            s.start_time,
            s.end_time,
            s.notes,
            s.priority_level,
            s.status,
            s.alarm_enabled,
            s.alarm_before_minutes,
            s.notification_browser,
            s.notification_sound,
            s.is_featured,
            s.created_at,
            s.updated_at
        FROM schedules s
        WHERE s.scheduler_id = :user_id
        AND s.scheduler_role = 'parent'
        ORDER BY s.created_at DESC
    """), {"user_id": current_user.id}).fetchall()

    result = []
    for row in schedules:
        result.append({
            "id": row.id,
            "scheduler_id": row.scheduler_id,
            "scheduler_role": row.scheduler_role,
            "title": row.title,
            "description": row.description,
            "year": row.year,
            "schedule_type": row.schedule_type,
            "months": list(row.months) if row.months else [],
            "days": list(row.days) if row.days else [],
            "specific_dates": list(row.specific_dates) if row.specific_dates else [],
            "start_time": str(row.start_time) if row.start_time else None,
            "end_time": str(row.end_time) if row.end_time else None,
            "notes": row.notes,
            "priority_level": row.priority_level,
            "status": row.status,
            "alarm_enabled": row.alarm_enabled,
            "alarm_before_minutes": row.alarm_before_minutes,
            "notification_browser": row.notification_browser,
            "notification_sound": row.notification_sound,
            "is_featured": row.is_featured,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None
        })

    return result


@router.patch("/api/parent/schedules/{schedule_id}/toggle-alarm")
async def toggle_parent_schedule_alarm(
    schedule_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle alarm setting for a parent schedule."""
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Verify ownership
    schedule = db.execute(text("""
        SELECT id FROM schedules
        WHERE id = :schedule_id AND scheduler_id = :user_id AND scheduler_role = 'parent'
    """), {"schedule_id": schedule_id, "user_id": current_user.id}).fetchone()

    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found or access denied")

    alarm_enabled = data.get("alarm_enabled", False)

    db.execute(text("""
        UPDATE schedules
        SET alarm_enabled = :alarm_enabled, updated_at = NOW()
        WHERE id = :schedule_id
    """), {"alarm_enabled": alarm_enabled, "schedule_id": schedule_id})
    db.commit()

    return {"message": "Alarm setting updated", "alarm_enabled": alarm_enabled}


@router.patch("/api/parent/schedules/{schedule_id}/toggle-notification")
async def toggle_parent_schedule_notification(
    schedule_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle browser notification setting for a parent schedule."""
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Verify ownership
    schedule = db.execute(text("""
        SELECT id FROM schedules
        WHERE id = :schedule_id AND scheduler_id = :user_id AND scheduler_role = 'parent'
    """), {"schedule_id": schedule_id, "user_id": current_user.id}).fetchone()

    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found or access denied")

    notification_browser = data.get("notification_browser", False)

    db.execute(text("""
        UPDATE schedules
        SET notification_browser = :notification_browser, updated_at = NOW()
        WHERE id = :schedule_id
    """), {"notification_browser": notification_browser, "schedule_id": schedule_id})
    db.commit()

    return {"message": "Notification setting updated", "notification_browser": notification_browser}


# ============================================
# PARENT SESSIONS ENDPOINTS
# NOTE: Must be BEFORE the wildcard /api/parent/{parent_id} route
# ============================================

@router.get("/api/parent/sessions")
async def get_parent_sessions(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all sessions for the parent's children.
    Reads from sessions table via enrolled_courses to find sessions for the parent's children.
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    if not parent_profile.children_ids or len(parent_profile.children_ids) == 0:
        return []

    # Build the query - sessions are linked through enrolled_courses which has students_id array
    # We need to find sessions where any of the parent's children are enrolled
    base_query = """
        SELECT
            s.id,
            s.enrolled_courses_id,
            s.topics,
            s.topics_covered,
            s.session_date,
            s.start_time,
            s.end_time,
            s.duration,
            s.session_mode,
            s.location,
            s.status,
            s.priority_level,
            s.notification_enabled,
            s.alarm_enabled,
            s.alarm_before_minutes,
            s.is_featured,
            s.tutor_attendance_status,
            s.student_attendance_status,
            s.created_at,
            s.updated_at,
            ec.tutor_id,
            ec.students_id,
            tp.username as tutor_username,
            u_tutor.first_name as tutor_first_name,
            u_tutor.father_name as tutor_father_name,
            c.course_name as course_name
        FROM sessions s
        LEFT JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
        LEFT JOIN tutor_profiles tp ON ec.tutor_id = tp.id
        LEFT JOIN users u_tutor ON tp.user_id = u_tutor.id
        LEFT JOIN courses c ON c.id = ANY(ec.course_id)
        WHERE ec.students_id && CAST(:children_ids AS integer[])
    """

    if status_filter:
        base_query += " AND s.status = :status_filter"

    base_query += " ORDER BY s.session_date DESC, s.start_time DESC"

    params = {"children_ids": parent_profile.children_ids}
    if status_filter:
        params["status_filter"] = status_filter

    sessions = db.execute(text(base_query), params).fetchall()

    # Get student names for the children
    children_map = {}
    if parent_profile.children_ids:
        children_info = db.execute(text("""
            SELECT sp.id, sp.username, u.first_name, u.father_name
            FROM student_profiles sp
            JOIN users u ON sp.user_id = u.id
            WHERE sp.id = ANY(CAST(:children_ids AS integer[]))
        """), {"children_ids": parent_profile.children_ids}).fetchall()

        for child in children_info:
            children_map[child.id] = {
                "username": child.username,
                "name": f"{child.first_name or ''} {child.father_name or ''}".strip() or child.username
            }

    result = []
    for row in sessions:
        # Find which child is in this session
        student_name = "Unknown Child"
        if row.students_id:
            for child_id in row.students_id:
                if child_id in children_map:
                    student_name = children_map[child_id]["name"]
                    break

        # Get tutor name
        tutor_name = f"{row.tutor_first_name or ''} {row.tutor_father_name or ''}".strip()
        if not tutor_name:
            tutor_name = row.tutor_username or "Unknown Tutor"

        # Parse topics
        topics = []
        if row.topics:
            try:
                import json
                topics = json.loads(row.topics) if isinstance(row.topics, str) else row.topics
            except:
                topics = [row.topics] if row.topics else []

        result.append({
            "id": row.id,
            "enrolled_courses_id": row.enrolled_courses_id,
            "student_name": student_name,
            "tutor_name": tutor_name,
            "course_name": row.course_name or "Unknown Course",
            "topics": topics,
            "topics_covered": row.topics_covered,
            "session_date": row.session_date.isoformat() if row.session_date else None,
            "start_time": str(row.start_time) if row.start_time else None,
            "end_time": str(row.end_time) if row.end_time else None,
            "duration": row.duration,
            "session_mode": row.session_mode,
            "location": row.location,
            "status": row.status,
            "priority_level": row.priority_level,
            "notification_enabled": row.notification_enabled,
            "alarm_enabled": row.alarm_enabled,
            "alarm_before_minutes": row.alarm_before_minutes,
            "is_featured": row.is_featured,
            "tutor_attendance_status": row.tutor_attendance_status,
            "student_attendance_status": row.student_attendance_status,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None
        })

    return result


# ============================================
# PARENT TUTORS ENDPOINTS (from enrolled_students)
# NOTE: Must be BEFORE the wildcard /api/parent/{parent_id} route
# ============================================

@router.get("/api/parent/tutors")
async def get_parent_tutors(
    student_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all tutors teaching the parent's children.

    Reads from enrolled_students table to find tutors connected to the parent's children.
    Returns detailed tutor information with enrollment status.

    Optional query parameter:
    - student_id: Filter tutors for a specific child (student_profile.id)
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    if not parent_profile.children_ids or len(parent_profile.children_ids) == 0:
        return {"tutors": [], "total": 0, "message": "No children found. Add children to see their tutors."}

    # If student_id is provided, verify it's one of the parent's children
    if student_id:
        if student_id not in parent_profile.children_ids:
            raise HTTPException(status_code=403, detail="This child is not linked to your account")
        children_to_query = [student_id]
    else:
        children_to_query = parent_profile.children_ids

    # Get all tutors for the specified children via enrolled_students
    # children_ids stores student_profile.id values
    tutors_data = db.execute(text("""
        SELECT DISTINCT ON (tp.id)
            tp.id as tutor_profile_id,
            tp.user_id as tutor_user_id,
            tp.username as tutor_username,
            tp.bio,
            tp.quote,
            u.location,  -- NOTE: location now read from users table
            u.is_verified,
            u.verification_status,  -- NOTE: verification_status now read from users table
            u.profile_picture as tp_profile_picture,  -- NOTE: profile_picture now read from users table
            tp.cover_image,
            u.languages,  -- NOTE: languages now read from users table
            tp.expertise_badge,
            tp.hero_titles,
            tp.hero_subtitle,
            u.first_name,
            u.father_name,
            u.grandfather_name,
            u.gender,
            u.email as tutor_email,
            u.currency,
            es.status as enrollment_status,
            es.enrolled_at,
            es.student_id,
            pkg.id as package_id,
            pkg.name as package_name,
            pkg.hourly_rate,
            pkg.session_format,
            pkg.grade_level,
            pkg.course_ids,
            sp.username as student_username,
            sp_user.first_name as student_first_name,
            sp_user.father_name as student_father_name,
            (
                SELECT COALESCE(AVG(tr.rating), 0)
                FROM tutor_reviews tr
                WHERE tr.tutor_id = tp.id
            ) as avg_rating,
            (
                SELECT COUNT(*)
                FROM tutor_reviews tr
                WHERE tr.tutor_id = tp.id
            ) as rating_count
        FROM enrolled_students es
        JOIN tutor_profiles tp ON es.tutor_id = tp.id
        JOIN users u ON tp.user_id = u.id
        LEFT JOIN tutor_packages pkg ON es.package_id = pkg.id
        JOIN student_profiles sp ON es.student_id = sp.id
        JOIN users sp_user ON sp.user_id = sp_user.id
        WHERE es.student_id = ANY(:children_ids)
        ORDER BY tp.id, es.enrolled_at DESC
    """), {"children_ids": children_to_query}).fetchall()

    # Group tutors and their students
    tutors_map = {}
    for row in tutors_data:
        tutor_id = row.tutor_profile_id

        if tutor_id not in tutors_map:
            # Build tutor name
            name_parts = [row.first_name or '', row.father_name or '', row.grandfather_name or '']
            full_name = ' '.join(part for part in name_parts if part).strip()

            # Parse languages (JSON field)
            languages = []
            if row.languages:
                try:
                    import json
                    languages = json.loads(row.languages) if isinstance(row.languages, str) else row.languages
                except:
                    languages = []

            # Parse course_ids from package (to get subjects later if needed)
            course_ids = []
            if row.course_ids:
                try:
                    import json
                    course_ids = json.loads(row.course_ids) if isinstance(row.course_ids, str) else row.course_ids
                except:
                    course_ids = row.course_ids if isinstance(row.course_ids, list) else []

            # Parse grade_level from package (single value, not array)
            grade_level = row.grade_level if row.grade_level else None

            tutors_map[tutor_id] = {
                "id": tutor_id,
                "user_id": row.tutor_user_id,
                "username": row.tutor_username,
                "name": full_name or "Unknown Tutor",
                "first_name": row.first_name,
                "father_name": row.father_name,
                "bio": row.bio,
                "quote": row.quote,
                "location": row.location,
                "is_verified": row.is_verified,
                "verification_status": row.verification_status,
                "profile_picture": row.tp_profile_picture,
                "cover_image": row.cover_image,
                "gender": row.gender,
                "email": row.tutor_email,
                "languages": languages,
                "expertise_badge": row.expertise_badge,
                "rating": float(row.avg_rating) if row.avg_rating else 0.0,
                "rating_count": row.rating_count or 0,
                "course_ids": course_ids,
                "hourly_rate": float(row.hourly_rate) if row.hourly_rate else None,
                "currency": row.currency or "ETB",
                "session_format": row.session_format,
                "grade_level": grade_level,
                "package_name": row.package_name,
                "students": []
            }

        # Add student info to this tutor
        student_name = f"{row.student_first_name or ''} {row.student_father_name or ''}".strip()
        tutors_map[tutor_id]["students"].append({
            "student_id": row.student_id,
            "student_username": row.student_username,
            "student_name": student_name or "Unknown Student",
            "enrollment_status": row.enrollment_status,
            "enrolled_at": row.enrolled_at.isoformat() if row.enrolled_at else None
        })

    tutors_list = list(tutors_map.values())

    return {"tutors": tutors_list, "total": len(tutors_list)}


# ============================================
# GET TUTORS FOR A SPECIFIC STUDENT (by student_profile_id)
# ============================================

@router.get("/api/student/{student_profile_id}/tutors")
async def get_tutors_for_specific_student(
    student_profile_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all tutors for a specific student by their profile ID.

    Reads from enrolled_students table to find tutors connected to the student.
    Returns detailed tutor information with enrollment status.
    This endpoint is public (used by parent-profile to view children's tutors).
    """
    # Get all tutors for this student via enrolled_students
    tutors_data = db.execute(text("""
        SELECT DISTINCT ON (tp.id)
            tp.id as tutor_profile_id,
            tp.user_id as tutor_user_id,
            tp.username as tutor_username,
            tp.bio,
            tp.quote,
            u.location,  -- NOTE: location now read from users table
            u.is_verified,
            u.verification_status,  -- NOTE: verification_status now read from users table
            u.profile_picture as tp_profile_picture,  -- NOTE: profile_picture now read from users table
            tp.cover_image,
            u.languages,  -- NOTE: languages now read from users table
            tp.expertise_badge,
            tp.hero_titles,
            tp.hero_subtitle,
            u.first_name,
            u.father_name,
            u.grandfather_name,
            u.gender,
            u.email as tutor_email,
            u.phone as tutor_phone,
            es.status as enrollment_status,
            es.enrolled_at,
            pkg.id as package_id,
            pkg.name as package_name,
            pkg.hourly_rate,
            pkg.session_format,
            pkg.grade_level,
            pkg.course_ids,
            (
                SELECT COALESCE(AVG(tr.rating), 0)
                FROM tutor_reviews tr
                WHERE tr.tutor_id = tp.id
            ) as avg_rating,
            (
                SELECT COUNT(*)
                FROM tutor_reviews tr
                WHERE tr.tutor_id = tp.id
            ) as rating_count
        FROM enrolled_students es
        JOIN tutor_profiles tp ON es.tutor_id = tp.id
        JOIN users u ON tp.user_id = u.id
        LEFT JOIN tutor_packages pkg ON es.package_id = pkg.id
        WHERE es.student_id = :student_id
        ORDER BY tp.id, es.enrolled_at DESC
    """), {"student_id": student_profile_id}).fetchall()

    # Build tutors list
    tutors_list = []
    for row in tutors_data:
        # Build tutor name
        name_parts = [row.first_name or '', row.father_name or '', row.grandfather_name or '']
        full_name = ' '.join(part for part in name_parts if part).strip()

        # Parse languages (JSON field)
        languages = []
        if row.languages:
            try:
                import json
                languages = json.loads(row.languages) if isinstance(row.languages, str) else row.languages
            except:
                languages = []

        # Parse course_ids from package
        course_ids = []
        if row.course_ids:
            try:
                import json
                course_ids = json.loads(row.course_ids) if isinstance(row.course_ids, str) else row.course_ids
            except:
                course_ids = row.course_ids if isinstance(row.course_ids, list) else []

        tutors_list.append({
            "id": row.tutor_profile_id,
            "user_id": row.tutor_user_id,
            "username": row.tutor_username,
            "name": full_name or "Unknown Tutor",
            "first_name": row.first_name,
            "father_name": row.father_name,
            "grandfather_name": row.grandfather_name,
            "bio": row.bio,
            "quote": row.quote,
            "location": row.location,
            "is_verified": row.is_verified,
            "verification_status": row.verification_status,
            "profile_picture": row.tp_profile_picture,
            "cover_image": row.cover_image,
            "gender": row.gender,
            "email": row.tutor_email,
            "phone": row.tutor_phone,
            "languages": languages,
            "expertise_badge": row.expertise_badge,
            "rating": float(row.avg_rating) if row.avg_rating else 0.0,
            "rating_count": row.rating_count or 0,
            "course_ids": course_ids,
            "hourly_rate": float(row.hourly_rate) if row.hourly_rate else None,
            "session_format": row.session_format,
            "grade_level": row.grade_level,
            "package_id": row.package_id,
            "package_name": row.package_name,
            "enrollment_status": row.enrollment_status,
            "enrolled_at": row.enrolled_at.isoformat() if row.enrolled_at else None
        })

    return {"tutors": tutors_list, "total": len(tutors_list)}


# ============================================
# CHILD MANAGEMENT (NEW ARCHITECTURE)
# ============================================

@router.post("/api/parent/add-child")
async def add_child(
    first_name: str,
    father_name: str,
    grandfather_name: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    gender: Optional[str] = None,
    date_of_birth: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a child to parent's profile

    Creates a new user account with STUDENT role and temp password.
    Child will complete their student profile after logging in.
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Get parent profile
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Validate email or phone
    if not email and not phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    # Check if user already exists
    existing_user = None
    if email:
        existing_user = db.query(User).filter(User.email == email).first()
    if not existing_user and phone:
        existing_user = db.query(User).filter(User.phone == phone).first()

    if existing_user:
        if "student" not in existing_user.roles:
            raise HTTPException(status_code=400, detail="User exists but is not a student")

        # Get student profile first (needed for both linking operations)
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == existing_user.id
        ).first()

        if not student_profile:
            raise HTTPException(status_code=404, detail="Student profile not found for this user")

        # Link existing student to parent (use student_profile.id, NOT user.id)
        if not parent_profile.children_ids:
            parent_profile.children_ids = []
        if student_profile.id not in parent_profile.children_ids:
            parent_profile.children_ids = parent_profile.children_ids + [student_profile.id]
            parent_profile.total_children = len(parent_profile.children_ids)

        # Update student's parent_id array (use parent_profile.id, NOT user.id)
        if not student_profile.parent_id:
            student_profile.parent_id = []
        if parent_profile.id not in student_profile.parent_id:
            student_profile.parent_id = student_profile.parent_id + [parent_profile.id]

        db.commit()

        return {
            "message": "Child linked successfully",
            "user_id": existing_user.id,
            "existing": True
        }

    # Create new student user with temporary password
    temp_password = secrets.token_urlsafe(12)

    new_user = User(
        first_name=first_name,
        father_name=father_name,
        grandfather_name=grandfather_name,
        email=email,
        phone=phone,
        gender=gender,
        password_hash=hash_password(temp_password),
        roles=["student"],  # STUDENT ROLE
        active_role="student"
    )
    db.add(new_user)
    db.flush()

    # Create basic student profile
    student_profile = StudentProfile(
        user_id=new_user.id,
        parent_id=[parent_profile.id]  # Add parent_profile.id (NOT user.id) to student's parent_id array
    )
    db.add(student_profile)
    db.flush()  # Flush to get student_profile.id

    # Update parent's children_ids array (use student_profile.id, NOT user.id)
    if not parent_profile.children_ids:
        parent_profile.children_ids = []
    parent_profile.children_ids = parent_profile.children_ids + [student_profile.id]
    parent_profile.total_children = len(parent_profile.children_ids)

    db.commit()

    # TODO: Send temp password via email/SMS
    # send_email(email, "Your Astegni Account", f"Your temporary password is: {temp_password}")
    # send_sms(phone, f"Your Astegni temporary password is: {temp_password}")

    return {
        "message": "Child created successfully. Temporary password sent via email/SMS.",
        "user_id": new_user.id,
        "temp_password": temp_password,  # Remove in production - only send via email/SMS
        "email": email,
        "phone": phone,
        "existing": False
    }


# ============================================
# CO-PARENT MANAGEMENT
# ============================================

@router.post("/api/parent/add-coparent")
async def add_coparent(
    first_name: str,
    father_name: str,
    grandfather_name: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    gender: Optional[str] = None,
    relationship_type: str = "Co-parent",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Invite a co-parent (mother/father/guardian)

    Creates a PENDING invitation in coparent_invitations table.
    Sends email/SMS with temporary password.
    The invitation must be accepted by the co-parent before linking.

    For existing users: Creates invitation with invited_to_user_id set
    For new users: Creates invitation with pending_* fields and creates user account
    """
    from email_service import email_service

    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Get parent profile
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Check if the inviter has children - you can only invite a co-parent if you have children to share
    inviter_children_ids = parent_profile.children_ids if parent_profile.children_ids else []
    if not inviter_children_ids or len(inviter_children_ids) == 0:
        raise HTTPException(
            status_code=400,
            detail="You need to have at least one child linked to your parent profile before you can invite a co-parent. Please add children to your profile first."
        )

    # Validate email or phone
    if not email and not phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    # Get inviter's full name
    inviter_name = f"{current_user.first_name} {current_user.father_name or ''}".strip()

    # Check if user already exists
    existing_user = None
    if email:
        existing_user = db.query(User).filter(User.email == email).first()
    if not existing_user and phone:
        existing_user = db.query(User).filter(User.phone == phone).first()

    # Check if there's already ANY invitation (pending, accepted, rejected) in parent_invitations table
    existing_invitation = db.execute(text("""
        SELECT id, status, relationship_type FROM parent_invitations
        WHERE inviter_user_id = :inviter_user_id
        AND (
            (invited_to_user_id = :invitee_id AND :invitee_id IS NOT NULL)
            OR (pending_email = :email AND :email IS NOT NULL)
            OR (pending_phone = :phone AND :phone IS NOT NULL)
        )
    """), {
        "inviter_user_id": current_user.id,
        "invitee_id": existing_user.id if existing_user else None,
        "email": email,
        "phone": phone
    }).fetchone()

    if existing_invitation:
        status = existing_invitation[1]
        rel_type = existing_invitation[2]
        if status == 'pending':
            raise HTTPException(status_code=400, detail=f"A pending invitation already exists for this person (as {rel_type})")
        elif status == 'accepted':
            raise HTTPException(status_code=400, detail="This person has already accepted a previous invitation")
        elif status == 'rejected':
            raise HTTPException(status_code=400, detail="This person previously rejected your invitation")

    # Check for REVERSE invitation (target user already invited current user)
    if existing_user:
        reverse_invitation = db.execute(text("""
            SELECT id, status, relationship_type FROM parent_invitations
            WHERE inviter_user_id = :invitee_id
            AND invited_to_user_id = :inviter_user_id
        """), {
            "invitee_id": existing_user.id,
            "inviter_user_id": current_user.id
        }).fetchone()

        if reverse_invitation:
            rev_status = reverse_invitation[1]
            if rev_status == 'pending':
                raise HTTPException(status_code=400, detail="This user has already sent you an invitation. Check your received invitations to accept or reject it.")
            elif rev_status == 'accepted':
                raise HTTPException(status_code=400, detail="You have already accepted an invitation from this user")
            elif rev_status == 'rejected':
                raise HTTPException(status_code=400, detail="You previously rejected an invitation from this user")

    # Generate temporary password and invitation token
    temp_password = secrets.token_urlsafe(12)
    invitation_token = secrets.token_urlsafe(32)

    if existing_user:
        # Existing user - create invitation with USER IDs (NEW SYSTEM)
        # Get parent profiles for old columns (backward compatibility)
        inviter_parent_result = db.execute(text("SELECT id FROM parent_profiles WHERE user_id = :user_id"), {"user_id": current_user.id}).fetchone()
        invitee_parent_result = db.execute(text("SELECT id FROM parent_profiles WHERE user_id = :user_id"), {"user_id": existing_user.id}).fetchone()

        inviter_parent_id = inviter_parent_result[0] if inviter_parent_result else None
        invitee_parent_id = invitee_parent_result[0] if invitee_parent_result else None

        db.execute(text("""
            INSERT INTO parent_invitations (
                inviter_user_id, inviter_type, invited_to_user_id,
                relationship_type, status,
                invitation_token, token_expires_at, created_at, requested_as
            ) VALUES (
                :inviter_user_id, 'parent', :invited_to_user_id,
                :relationship_type, 'pending',
                :invitation_token, NOW() + INTERVAL '7 days', NOW(), 'coparent'
            )
        """), {
            "inviter_user_id": current_user.id,
            "invited_to_user_id": existing_user.id,
            "relationship_type": relationship_type,
            "invitation_token": invitation_token
        })
        db.commit()

        # Send notification email to existing user
        if existing_user.email:
            email_service.send_coparent_invitation_email(
                to_email=existing_user.email,
                inviter_name=inviter_name,
                temp_password="(Use your existing password)",
                relationship_type=relationship_type
            )

        return {
            "message": "Invitation sent to existing user",
            "user_id": existing_user.id,
            "status": "pending",
            "existing": True
        }

    else:
        # New user - create user account and invitation
        new_user = User(
            first_name=first_name,
            father_name=father_name,
            grandfather_name=grandfather_name,
            email=email,
            phone=phone,
            gender=gender,
            password_hash=hash_password(temp_password),
            roles=["parent"],
            active_role="parent"
        )
        db.add(new_user)
        db.flush()

        # Create parent profile for co-parent (but NOT linked yet)
        coparent_profile = ParentProfile(
            user_id=new_user.id,
            relationship_type=relationship_type,
            children_ids=[],  # Will be populated when invitation is accepted
            total_children=0,
            coparent_ids=[]  # Will be populated when invitation is accepted
        )
        db.add(coparent_profile)

        # Create invitation in parent_invitations with USER IDs (NEW SYSTEM)
        # Get parent profiles for old columns (backward compatibility)
        inviter_parent_result = db.execute(text("SELECT id FROM parent_profiles WHERE user_id = :user_id"), {"user_id": current_user.id}).fetchone()
        inviter_parent_id = inviter_parent_result[0] if inviter_parent_result else None

        db.execute(text("""
            INSERT INTO parent_invitations (
                inviter_user_id, inviter_type, invited_to_user_id,
                relationship_type, status,
                is_new_user, pending_email, pending_phone, pending_first_name,
                pending_father_name, pending_grandfather_name, pending_gender,
                temp_password_hash, invitation_token, token_expires_at, created_at, requested_as
            ) VALUES (
                :inviter_user_id, 'parent', :invited_to_user_id,
                :relationship_type, 'pending',
                TRUE, :email, :phone, :first_name,
                :father_name, :grandfather_name, :gender,
                :temp_password_hash, :invitation_token, NOW() + INTERVAL '7 days', NOW(), 'coparent'
            )
        """), {
            "inviter_user_id": current_user.id,
            "invited_to_user_id": new_user.id,
            "relationship_type": relationship_type,
            "email": email,
            "phone": phone,
            "first_name": first_name,
            "father_name": father_name,
            "grandfather_name": grandfather_name,
            "gender": gender,
            "temp_password_hash": hash_password(temp_password),
            "invitation_token": invitation_token
        })
        db.commit()

        # Send email with temp password
        if email:
            email_sent = email_service.send_coparent_invitation_email(
                to_email=email,
                inviter_name=inviter_name,
                temp_password=temp_password,
                relationship_type=relationship_type
            )
            if not email_sent:
                print(f"[COPARENT] Email not sent. Temp password for {email}: {temp_password}")

        return {
            "message": "Co-parent invitation sent. Temporary password sent via email/SMS.",
            "user_id": new_user.id,
            "temp_password": temp_password,  # Show in console for development
            "email": email,
            "phone": phone,
            "status": "pending",
            "existing": False
        }


# ============================================
# CO-PARENT INVITATION MANAGEMENT
# ============================================

@router.post("/api/parent/resend-coparent-invitation/{invitation_id}")
async def resend_coparent_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resend a co-parent invitation email.
    Only the inviter can resend the invitation.
    """
    from email_service import email_service

    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Get the invitation from parent_invitations table
    invitation = db.execute(text("""
        SELECT
            pi.id, pi.inviter_user_id, pi.invited_to_user_id, pi.relationship_type,
            pi.status, pi.is_new_user, pi.pending_email,
            u.email as user_email, u.first_name, u.father_name
        FROM parent_invitations pi
        LEFT JOIN users u ON pi.invited_to_user_id = u.id
        WHERE pi.id = :invitation_id
        AND pi.inviter_type = 'parent'
    """), {"invitation_id": invitation_id}).fetchone()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.inviter_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only resend your own invitations")

    if invitation.status != 'pending':
        raise HTTPException(status_code=400, detail="Can only resend pending invitations")

    # Get email to send to
    email = invitation.user_email or invitation.pending_email
    if not email:
        raise HTTPException(status_code=400, detail="No email address available for this invitation")

    # Get inviter name
    inviter_name = f"{current_user.first_name} {current_user.father_name or ''}".strip()

    # Generate new temp password if needed
    temp_password = "(Use your existing password)"
    if invitation.is_new_user:
        temp_password = secrets.token_urlsafe(12)
        # Update the user's password
        db.execute(text("""
            UPDATE users SET password_hash = :password_hash
            WHERE id = :user_id
        """), {
            "password_hash": hash_password(temp_password),
            "user_id": invitation.invited_to_user_id
        })
        db.commit()

    # Send email
    email_sent = email_service.send_coparent_invitation_email(
        to_email=email,
        inviter_name=inviter_name,
        temp_password=temp_password,
        relationship_type=invitation.relationship_type
    )

    if email_sent:
        return {
            "message": "Invitation email resent successfully",
            "email": email
        }
    else:
        # Return temp password for development purposes
        return {
            "message": "Email service unavailable. Please share the temp password manually.",
            "email": email,
            "temp_password": temp_password if invitation.is_new_user else None
        }


@router.delete("/api/parent/cancel-coparent-invitation/{invitation_id}")
async def cancel_coparent_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a pending co-parent invitation.
    Only the inviter can cancel the invitation.
    If the invitation created a new user, that user account remains (they can still use the platform).
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Get the invitation from parent_invitations table
    invitation = db.execute(text("""
        SELECT id, inviter_user_id, status
        FROM parent_invitations
        WHERE id = :invitation_id
        AND inviter_type = 'parent'
    """), {"invitation_id": invitation_id}).fetchone()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.inviter_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only cancel your own invitations")

    if invitation.status != 'pending':
        raise HTTPException(status_code=400, detail="Can only cancel pending invitations")

    # Update invitation status to cancelled
    db.execute(text("""
        UPDATE parent_invitations
        SET status = 'cancelled', responded_at = NOW()
        WHERE id = :invitation_id
    """), {"invitation_id": invitation_id})
    db.commit()

    return {"message": "Invitation cancelled successfully"}


@router.delete("/api/parent/remove-coparent/{coparent_user_id}")
async def remove_coparent(
    coparent_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a co-parent from the current parent's coparent_ids array.
    Also removes the current parent from the co-parent's coparent_ids array.
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Get current parent's profile
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Check if coparent is in the list
    if not parent_profile.coparent_ids or coparent_user_id not in parent_profile.coparent_ids:
        raise HTTPException(status_code=400, detail="This person is not in your co-parents list")

    # Remove coparent from current parent's list
    new_coparent_ids = [cid for cid in parent_profile.coparent_ids if cid != coparent_user_id]
    parent_profile.coparent_ids = new_coparent_ids

    # Also remove current user from the co-parent's coparent_ids list (bidirectional)
    coparent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == coparent_user_id
    ).first()

    if coparent_profile and coparent_profile.coparent_ids:
        coparent_profile.coparent_ids = [cid for cid in coparent_profile.coparent_ids if cid != current_user.id]

    db.commit()

    return {"message": "Co-parent removed successfully"}


# ============================================
# PARENT REVIEW ENDPOINTS
# ============================================

@router.post("/api/parent/{parent_id}/review", response_model=ParentReviewResponse)
async def create_parent_review(
    parent_id: int,
    review_data: ParentReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a review for a parent (by tutors) - 4-Factor Rating System"""
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.id == parent_id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can review parents")

    # Check for existing review
    existing_review = db.query(ParentReview).filter(
        ParentReview.parent_id == parent_id,
        ParentReview.reviewer_id == current_user.id
    ).first()

    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this parent")

    review = ParentReview(
        parent_id=parent_id,
        reviewer_id=current_user.id,
        user_role="tutor",
        **review_data.dict()
    )
    db.add(review)

    # Update parent's average rating
    reviews = db.query(ParentReview).filter(ParentReview.parent_id == parent_id).all()
    total_rating = sum(r.rating for r in reviews) + review_data.rating
    parent_profile.rating = total_rating / (len(reviews) + 1)
    parent_profile.rating_count = len(reviews) + 1

    db.commit()
    db.refresh(review)

    return review


@router.get("/api/parent/{parent_id}/reviews")
async def get_parent_reviews(
    parent_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get all reviews for a parent with reviewer information"""
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.id == parent_id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    reviews = db.query(ParentReview).filter(
        ParentReview.parent_id == parent_id
    ).order_by(ParentReview.created_at.desc()).offset(skip).limit(limit).all()

    # Enrich reviews with reviewer information
    enriched_reviews = []
    for review in reviews:
        review_dict = {
            "id": review.id,
            "parent_id": review.parent_id,
            "reviewer_id": review.reviewer_id,
            "user_role": review.user_role,
            "rating": review.rating,
            "title": review.title,
            "review_text": review.review_text,
            "engagement_with_tutor_rating": review.engagement_with_tutor_rating,
            "engagement_with_child_rating": review.engagement_with_child_rating,
            "responsiveness_rating": review.responsiveness_rating,
            "payment_consistency_rating": review.payment_consistency_rating,
            "is_verified": review.is_verified,
            "helpful_count": review.helpful_count,
            "is_featured": review.is_featured,
            "created_at": review.created_at,
            "updated_at": review.updated_at,
            "reviewer_name": None,
            "reviewer_profile_picture": None
        }

        # Get reviewer info based on role
        if review.user_role == 'tutor':
            tutor = db.query(TutorProfile).filter(TutorProfile.id == review.reviewer_id).first()
            if tutor:
                # Get user info for the tutor
                user = db.query(User).filter(User.id == tutor.user_id).first()
                if user:
                    review_dict["reviewer_name"] = f"{user.first_name or ''} {user.father_name or ''}".strip() or "Tutor"
                review_dict["reviewer_profile_picture"] = tutor.profile_picture

        enriched_reviews.append(review_dict)

    return enriched_reviews


# ============================================
# PARENT MY-REQUESTS ENDPOINTS (Courses, Schools)
# ============================================

@router.get("/api/parent/my-courses")
async def get_parent_requested_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all courses requested/uploaded by the parent (user-based).
    Reads from the courses table where uploader_id matches the user's ID.
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    courses = db.execute(text("""
        SELECT
            c.id, c.uploader_id, c.course_name, c.course_category, c.course_description,
            c.course_level, c.thumbnail, c.duration, c.lessons, c.lesson_title,
            c.language, c.rating, c.rating_count, c.created_at, c.updated_at,
            c.status, c.status_by, c.status_reason, c.status_at
        FROM courses c
        WHERE c.uploader_id = :user_id
        ORDER BY c.created_at DESC
    """), {"user_id": current_user.id}).fetchall()

    result = []
    for course in courses:
        result.append({
            "id": course.id,
            "uploader_id": course.uploader_id,
            "course_name": course.course_name,
            "course_category": course.course_category,
            "course_description": course.course_description,
            "course_level": course.course_level,
            "thumbnail": course.thumbnail,
            "duration": course.duration,
            "lessons": course.lessons,
            "lesson_title": course.lesson_title,
            "language": course.language,
            "rating": float(course.rating) if course.rating else None,
            "rating_count": course.rating_count,
            "created_at": course.created_at.isoformat() if course.created_at else None,
            "updated_at": course.updated_at.isoformat() if course.updated_at else None,
            "status": course.status,
            "status_by": course.status_by,
            "status_reason": course.status_reason,
            "status_at": course.status_at.isoformat() if course.status_at else None
        })

    return {"courses": result, "total": len(result)}


@router.get("/api/parent/my-schools")
async def get_parent_requested_schools(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all schools requested by the parent (user-based).
    Reads from the schools table where requester_id matches the user's ID.
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    schools = db.execute(text("""
        SELECT
            s.id, s.requester_id, s.name, s.type, s.level, s.location,
            s.email, s.phone, s.document_url, s.rating, s.student_count,
            s.established_year, s.principal, s.informant_fullname,
            s.informant_phone, s.informant_occupation,
            s.status, s.status_by, s.status_at, s.status_reason,
            s.created_at, s.updated_at
        FROM schools s
        WHERE s.requester_id = :user_id
        ORDER BY s.created_at DESC
    """), {"user_id": current_user.id}).fetchall()

    result = []
    for school in schools:
        result.append({
            "id": school.id,
            "requester_id": school.requester_id,
            "name": school.name,
            "type": school.type,
            "level": school.level,
            "location": school.location,
            "email": school.email,
            "phone": school.phone,
            "document_url": school.document_url,
            "rating": float(school.rating) if school.rating else None,
            "student_count": school.student_count,
            "established_year": school.established_year,
            "principal": school.principal,
            "informant_fullname": school.informant_fullname,
            "informant_phone": school.informant_phone,
            "informant_occupation": school.informant_occupation,
            "status": school.status,
            "status_by": school.status_by,
            "status_at": school.status_at.isoformat() if school.status_at else None,
            "status_reason": school.status_reason,
            "created_at": school.created_at.isoformat() if school.created_at else None,
            "updated_at": school.updated_at.isoformat() if school.updated_at else None
        })

    return {"schools": result, "total": len(result)}


# ============================================
# PARENT DASHBOARD STATS ENDPOINT
# ============================================

@router.get("/api/parent/dashboard-stats")
async def get_parent_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all dashboard statistics for parent profile.

    Returns:
    - children_enrolled: Count of children linked to parent
    - active_tutors: Count of distinct tutors teaching the parent's children
    - total_study_hours: Sum of completed session durations (in hours)
    - sessions_this_month: Count of sessions scheduled/completed this month
    - tutor_satisfaction: Average rating from parent_reviews (parent's rating from tutors)
    - attendance_rate: Percentage of sessions where children were present (0-100%)
    - family_progress: Coming soon (no data source available)
    - monthly_investment: Coming soon (implementation pending)
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    children_ids = parent_profile.children_ids if parent_profile.children_ids else []

    # 1. Children Enrolled (already tracked)
    children_enrolled = len(children_ids)

    # 2. Active Tutors (from enrolled_students)
    active_tutors = 0
    if children_ids:
        result = db.execute(text("""
            SELECT COUNT(DISTINCT tutor_id)
            FROM enrolled_students
            WHERE student_id = ANY(:children_ids)
        """), {"children_ids": children_ids}).fetchone()
        active_tutors = result[0] if result else 0

    # 3. Total Study Hours (from sessions table)
    total_study_hours = 0.0
    if children_ids:
        result = db.execute(text("""
            SELECT COALESCE(SUM(s.duration), 0)
            FROM sessions s
            JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
            WHERE ec.students_id && CAST(:children_ids AS integer[])
            AND s.status = 'completed'
        """), {"children_ids": children_ids}).fetchone()
        total_minutes = result[0] if result else 0
        total_study_hours = round(total_minutes / 60.0, 1)  # Convert minutes to hours

    # 4. Sessions This Month (from sessions table)
    sessions_this_month = 0
    if children_ids:
        result = db.execute(text("""
            SELECT COUNT(*)
            FROM sessions s
            JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
            WHERE ec.students_id && CAST(:children_ids AS integer[])
            AND EXTRACT(MONTH FROM s.session_date) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM s.session_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        """), {"children_ids": children_ids}).fetchone()
        sessions_this_month = result[0] if result else 0

    # 5. Tutor Satisfaction (parent's rating from tutors in parent_reviews)
    tutor_satisfaction = parent_profile.rating if parent_profile.rating else 0.0

    # 6. Attendance Rate (from sessions table)
    attendance_rate = 0.0
    if children_ids:
        result = db.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE s.student_attendance_status = 'present') as present_count,
                COUNT(*) as total_sessions
            FROM sessions s
            JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
            WHERE ec.students_id && CAST(:children_ids AS integer[])
            AND s.status IN ('completed', 'in-progress')
            AND s.student_attendance_status IS NOT NULL
        """), {"children_ids": children_ids}).fetchone()

        if result and result[1] > 0:  # total_sessions > 0
            present_count = result[0] if result[0] else 0
            total_sessions = result[1]
            attendance_rate = round((present_count / total_sessions) * 100, 1)

    # 7. Family Progress - Coming Soon (no proper data source)
    family_progress = None  # Will show "Coming Soon" in UI

    # 8. Monthly Investment - Coming Soon (implementation pending)
    monthly_investment = None  # Will show "Coming Soon" in UI

    return {
        "children_enrolled": children_enrolled,
        "active_tutors": active_tutors,
        "total_study_hours": total_study_hours,
        "sessions_this_month": sessions_this_month,
        "tutor_satisfaction": tutor_satisfaction,
        "attendance_rate": attendance_rate,
        "family_progress": family_progress,
        "monthly_investment": monthly_investment
    }


# ============================================
# PARENT REVIEW STATS ENDPOINT
# ============================================

@router.get("/api/parent/reviews/stats/{parent_id}")
async def get_parent_review_stats(
    parent_id: int,
    db: Session = Depends(get_db)
):
    """Get aggregated review statistics for a parent"""
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.id == parent_id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    reviews = db.query(ParentReview).filter(
        ParentReview.parent_id == parent_id
    ).all()

    if not reviews:
        return {
            "total_reviews": 0,
            "average_rating": 0.0,
            "engagement_with_tutor_avg": 0.0,
            "engagement_with_child_avg": 0.0,
            "responsiveness_avg": 0.0,
            "payment_consistency_avg": 0.0
        }

    return {
        "total_reviews": len(reviews),
        "average_rating": parent_profile.rating,
        "engagement_with_tutor_avg": sum(r.engagement_with_tutor_rating for r in reviews) / len(reviews),
        "engagement_with_child_avg": sum(r.engagement_with_child_rating for r in reviews) / len(reviews),
        "responsiveness_avg": sum(r.responsiveness_rating for r in reviews) / len(reviews),
        "payment_consistency_avg": sum(r.payment_consistency_rating for r in reviews) / len(reviews)
    }


# ============================================
# WILDCARD PARENT ID ROUTE - MUST BE LAST
# This route catches /api/parent/{any_integer}
# It MUST be defined after all specific routes like:
# - /api/parent/my-courses
# - /api/parent/my-schools
# - /api/parent/add-child
# - /api/parent/profile
# Otherwise FastAPI will try to parse "my-courses" as an integer
# ============================================

@router.get("/api/parent/{parent_id}")
async def get_parent_by_id(
    parent_id: int,
    by_user_id: bool = False,
    db: Session = Depends(get_db)
):
    """Get specific parent profile (public view)"""
    if by_user_id:
        parent_profile = db.query(ParentProfile).filter(
            ParentProfile.user_id == parent_id
        ).first()
    else:
        parent_profile = db.query(ParentProfile).filter(
            ParentProfile.id == parent_id
        ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    user = db.query(User).filter(User.id == parent_profile.user_id).first()

    # Get children info - children_ids stores student_profile.id (not user_id)
    children_info = []
    if parent_profile.children_ids:
        for student_profile_id in parent_profile.children_ids:
            # Look up by student_profile.id
            child_student = db.query(StudentProfile).filter(
                StudentProfile.id == student_profile_id
            ).first()
            if child_student:
                # Get user info for this student
                child_user = db.query(User).filter(User.id == child_student.user_id).first()
                if child_user:
                    children_info.append({
                        "id": child_student.id,  # student_profile.id
                        "user_id": child_user.id,
                        "name": f"{child_user.first_name or ''} {child_user.father_name or ''}".strip() or "Student",
                        "first_name": child_user.first_name,
                        "father_name": child_user.father_name,
                        "profile_picture": child_user.profile_picture,
                        "cover_image": child_student.cover_image,
                        "grade_level": child_student.grade_level,
                        "studying_at": child_student.studying_at,
                        "location": child_user.location,
                        "username": child_student.username,
                        "gender": child_user.gender,
                        "about": child_student.about,
                        "interested_in": child_student.interested_in or [],
                        "hobbies": child_user.hobbies or [],
                        "languages": child_user.languages or []
                    })

    # Build name based on naming convention
    # Ethiopian: first_name + father_name + grandfather_name
    # International: first_name + last_name
    if user.last_name:
        # International naming convention
        display_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    else:
        # Ethiopian naming convention
        name_parts = [user.first_name, user.father_name, user.grandfather_name]
        display_name = " ".join(part for part in name_parts if part)

    return {
        "id": parent_profile.id,
        "user_id": parent_profile.user_id,
        "username": parent_profile.username,
        "name": display_name or "Parent",
        "first_name": user.first_name,
        "father_name": user.father_name,
        "grandfather_name": user.grandfather_name,
        "last_name": user.last_name,
        "bio": parent_profile.bio,
        "quote": parent_profile.quote,
        "relationship_type": parent_profile.relationship_type,
        "location": user.location,  # Read from users table
        "social_links": user.social_links or {},  # Read from users table
        "languages": user.languages or [],  # Read from users table
        "hobbies": user.hobbies or [],  # Read from users table
        "gender": user.gender,  # Read from users table
        "children_ids": parent_profile.children_ids or [],
        "children_info": children_info,
        "rating": parent_profile.rating,
        "rating_count": parent_profile.rating_count,
        "is_verified": user.is_verified if user else False,
        "profile_picture": user.profile_picture,  # Read from users table
        "cover_image": parent_profile.cover_image,
        "total_children": parent_profile.total_children,
        "total_sessions_booked": parent_profile.total_sessions_booked,
        "total_amount_spent": parent_profile.total_amount_spent,
        "created_at": parent_profile.created_at,
        # Include user contact info for parent cards
        "email": user.email if user else None,
        "phone": user.phone if user else None
    }
