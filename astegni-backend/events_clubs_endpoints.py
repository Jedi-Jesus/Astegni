"""
Events and Clubs Endpoints
Handles CRUD operations for events and clubs
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from utils import get_current_user
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

router = APIRouter()

# ============================================
# PYDANTIC MODELS
# ============================================

class EventCreate(BaseModel):
    event_picture: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1)
    location: str = Field(..., min_length=1, max_length=255)
    is_online: bool = False
    start_datetime: datetime
    end_datetime: datetime
    available_seats: int = Field(..., gt=0)
    price: float = Field(default=0.00, ge=0)
    subjects: List[str] = Field(default_factory=list)
    grade_levels: List[str] = Field(default_factory=list)
    requirements: Optional[str] = None

class EventUpdate(BaseModel):
    event_picture: Optional[str] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    type: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1)
    location: Optional[str] = Field(None, min_length=1, max_length=255)
    is_online: Optional[bool] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    available_seats: Optional[int] = Field(None, gt=0)
    price: Optional[float] = Field(None, ge=0)
    subjects: Optional[List[str]] = None
    grade_levels: Optional[List[str]] = None
    requirements: Optional[str] = None
    status: Optional[str] = None

class ClubCreate(BaseModel):
    club_picture: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1)
    member_limit: int = Field(..., gt=0)
    membership_type: str = Field(default='open')
    is_paid: bool = False
    membership_fee: float = Field(default=0.00, ge=0)
    subjects: List[str] = Field(default_factory=list)
    meeting_schedule: Optional[str] = None
    meeting_location: Optional[str] = None
    rules: Optional[str] = None

class ClubUpdate(BaseModel):
    club_picture: Optional[str] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1)
    member_limit: Optional[int] = Field(None, gt=0)
    membership_type: Optional[str] = None
    is_paid: Optional[bool] = None
    membership_fee: Optional[float] = Field(None, ge=0)
    subjects: Optional[List[str]] = None
    meeting_schedule: Optional[str] = None
    meeting_location: Optional[str] = None
    rules: Optional[str] = None
    status: Optional[str] = None

# ============================================
# EVENT ENDPOINTS
# ============================================

@router.post("/api/events", status_code=status.HTTP_201_CREATED)
async def create_event(event: EventCreate, current_user: dict = Depends(get_current_user)):
    """Create a new event"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Validate datetime
        if event.end_datetime <= event.start_datetime:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End datetime must be after start datetime"
            )

        # Determine creator type and get appropriate profile ID
        creator_type = None
        creator_id = None

        # Check if user is an admin (admin_profile is a separate auth system)
        # For admins, current_user['email'] would be used if they authenticated via admin system
        # For now, check if user is a tutor since events/clubs are primarily tutor-created
        cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (current_user['id'],))
        tutor_profile = cur.fetchone()

        if tutor_profile:
            creator_type = 'tutor'
            creator_id = tutor_profile[0]  # tutor_profiles.id
        else:
            # Note: Admin-created events should use admin authentication endpoints
            # which would set current_user differently. For now, only tutors can create events via this endpoint.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User must be a tutor to create events"
            )

        cur.execute("""
            INSERT INTO events (
                created_by, creator_type, event_picture, title, type, description, location,
                is_online, start_datetime, end_datetime, available_seats,
                price, subjects, grade_levels, requirements
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            creator_id, creator_type, event.event_picture, event.title, event.type,
            event.description, event.location, event.is_online,
            event.start_datetime, event.end_datetime, event.available_seats,
            event.price, event.subjects, event.grade_levels, event.requirements
        ))

        result = cur.fetchone()
        conn.commit()

        return {
            "message": "Event created successfully",
            "event_id": result[0],
            "created_at": result[1]
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

from fastapi import Header

@router.get("/api/events")
async def get_events(
    status_filter: Optional[str] = None,
    type_filter: Optional[str] = None,
    search: Optional[str] = None,
    role: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    authorization: Optional[str] = Header(None)
):
    """Get events - current user's events, system events, or joined events

    Query parameters:
    - role: Filter by specific role (tutor, student, parent, advertiser).
            When provided, uses the corresponding profile_id for filtering.
    """
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    # Try to get current user from token (optional)
    current_user_id = None
    current_role = None
    if authorization and authorization.startswith('Bearer '):
        try:
            from utils import verify_token
            token = authorization.split(' ')[1]
            payload = verify_token(token)
            current_user_id = payload.get('id')
            current_role = role or payload.get('role')  # Use provided role or from token
        except:
            pass  # Token invalid, just show system events

    try:
        # Build base query based on role
        if current_user_id:
            profile_id = None
            profile_type = current_role or 'tutor'  # Default to tutor for backward compatibility

            # Get profile ID based on role
            if profile_type == 'tutor':
                cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (current_user_id,))
                result = cur.fetchone()
                profile_id = result[0] if result else None
            elif profile_type == 'student':
                cur.execute("SELECT id FROM student_profiles WHERE user_id = %s", (current_user_id,))
                result = cur.fetchone()
                profile_id = result[0] if result else None
            elif profile_type == 'parent':
                cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (current_user_id,))
                result = cur.fetchone()
                profile_id = result[0] if result else None
            elif profile_type == 'advertiser':
                cur.execute("SELECT id FROM advertiser_profiles WHERE user_id = %s", (current_user_id,))
                result = cur.fetchone()
                profile_id = result[0] if result else None

            # Logged in: show user's events + system events + joined events
            query = """
                SELECT DISTINCT e.*,
                       CASE WHEN e.creator_type = 'admin' THEN true ELSE false END as is_system
                FROM events e
                WHERE (
                    (e.creator_type = %s AND e.created_by = %s)  -- Current user's events by role
                    OR e.creator_type = 'admin'  -- System events (admin_profile.id in created_by)
                    OR e.joined_status = true  -- Joined events
                )
            """
            params = [profile_type, profile_id] if profile_id else [profile_type, -1]
        else:
            # Not logged in: show only system events
            query = """
                SELECT e.*,
                       true as is_system
                FROM events e
                WHERE e.creator_type = 'admin'
            """
            params = []

        if status_filter:
            query += " AND e.status = %s"
            params.append(status_filter)

        if type_filter:
            query += " AND e.type = %s"
            params.append(type_filter)

        if search:
            query += " AND (e.title ILIKE %s OR e.description ILIKE %s OR e.location ILIKE %s)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern])

        query += " ORDER BY e.start_datetime ASC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cur.execute(query, params)
        rows = cur.fetchall()

        events = []
        for row in rows:
            # Database column order: id, created_by, event_picture, title, type, description, location,
            # is_online, start_datetime, end_datetime, available_seats, registered_count, price,
            # subjects, grade_levels, requirements, status, created_at, updated_at, joined_status, creator_type
            # Plus the computed is_system column at the end
            events.append({
                "id": row[0],
                "created_by": row[1],
                "event_picture": row[2],
                "title": row[3],
                "type": row[4],
                "description": row[5],
                "location": row[6],
                "is_online": row[7],
                "start_datetime": row[8].isoformat() if row[8] else None,
                "end_datetime": row[9].isoformat() if row[9] else None,
                "available_seats": row[10],
                "registered_count": row[11],
                "price": float(row[12]) if row[12] else 0.00,
                "subjects": row[13] or [],
                "grade_levels": row[14] or [],
                "requirements": row[15],
                "status": row[16],
                "created_at": row[17].isoformat() if row[17] else None,
                "updated_at": row[18].isoformat() if row[18] else None,
                "joined_status": row[19] if row[19] else False,
                "creator_type": row[20],  # 'tutor' or 'admin'
                "is_system": row[21] if len(row) > 21 else False
            })

        return {"events": events, "count": len(events)}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@router.get("/api/events/{event_id}")
async def get_event(event_id: int):
    """Get a specific event by ID"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get event with creator info from either tutor_profiles or admin_profile
        cur.execute("""
            SELECT e.*,
                   CASE
                       WHEN e.creator_type = 'tutor' THEN tp.bio
                       WHEN e.creator_type = 'admin' THEN ap.bio
                   END as creator_bio,
                   CASE
                       WHEN e.creator_type = 'tutor' THEN u.first_name
                       WHEN e.creator_type = 'admin' THEN ap.first_name
                   END as creator_first_name,
                   CASE
                       WHEN e.creator_type = 'tutor' THEN u.father_name
                       WHEN e.creator_type = 'admin' THEN ap.father_name
                   END as creator_father_name,
                   CASE
                       WHEN e.creator_type = 'tutor' THEN u.profile_picture  -- NOTE: profile_picture now read from users table
                       WHEN e.creator_type = 'admin' THEN ap.profile_picture
                   END as creator_profile_picture
            FROM events e
            LEFT JOIN tutor_profiles tp ON e.creator_type = 'tutor' AND e.created_by = tp.id
            LEFT JOIN users u ON tp.user_id = u.id
            LEFT JOIN admin_profile ap ON e.creator_type = 'admin' AND e.created_by = ap.id
            WHERE e.id = %s
        """, (event_id,))

        row = cur.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )

        return {
            "id": row[0],
            "created_by": row[1],
            "creator_type": row[2],
            "event_picture": row[3],
            "title": row[4],
            "type": row[5],
            "description": row[6],
            "location": row[7],
            "is_online": row[8],
            "start_datetime": row[9].isoformat() if row[9] else None,
            "end_datetime": row[10].isoformat() if row[10] else None,
            "available_seats": row[11],
            "registered_count": row[12],
            "price": float(row[13]) if row[13] else 0.00,
            "subjects": row[14] or [],
            "grade_levels": row[15] or [],
            "requirements": row[16],
            "status": row[17],
            "created_at": row[18].isoformat() if row[18] else None,
            "updated_at": row[19].isoformat() if row[19] else None,
            "joined_status": row[20] if row[20] else False,
            "creator": {
                "bio": row[21],
                "first_name": row[22],
                "father_name": row[23],
                "profile_picture": row[24]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@router.put("/api/events/{event_id}")
async def update_event(
    event_id: int,
    event_update: EventUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an event (only creator can update)"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Check ownership
        cur.execute("SELECT created_by FROM events WHERE id = %s", (event_id,))
        result = cur.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )

        if result[0] != current_user['id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this event"
            )

        # Build update query
        update_fields = []
        params = []

        for field, value in event_update.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = %s")
                params.append(value)

        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        params.append(event_id)

        query = f"UPDATE events SET {', '.join(update_fields)} WHERE id = %s"
        cur.execute(query, params)
        conn.commit()

        return {"message": "Event updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@router.delete("/api/events/{event_id}")
async def delete_event(event_id: int, current_user: dict = Depends(get_current_user)):
    """Delete an event (only creator can delete)"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Check ownership
        cur.execute("SELECT created_by FROM events WHERE id = %s", (event_id,))
        result = cur.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )

        if result[0] != current_user['id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this event"
            )

        cur.execute("DELETE FROM events WHERE id = %s", (event_id,))
        conn.commit()

        return {"message": "Event deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@router.get("/api/events/my/created")
async def get_my_events(current_user: dict = Depends(get_current_user)):
    """Get events created by current user"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT * FROM events
            WHERE created_by = %s
            ORDER BY start_datetime DESC
        """, (current_user['id'],))

        rows = cur.fetchall()

        events = []
        for row in rows:
            events.append({
                "id": row[0],
                "created_by": row[1],
                "event_picture": row[2],
                "title": row[3],
                "type": row[4],
                "description": row[5],
                "location": row[6],
                "is_online": row[7],
                "start_datetime": row[8].isoformat() if row[8] else None,
                "end_datetime": row[9].isoformat() if row[9] else None,
                "available_seats": row[10],
                "registered_count": row[11],
                "price": float(row[12]) if row[12] else 0.00,
                "subjects": row[13] or [],
                "grade_levels": row[14] or [],
                "requirements": row[15],
                "status": row[16],
                "created_at": row[17].isoformat() if row[17] else None,
                "updated_at": row[18].isoformat() if row[18] else None
            })

        return {"events": events, "count": len(events)}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@router.get("/api/events/by-parent/{parent_id}")
async def get_events_by_parent(parent_id: int):
    """Get events created by a specific parent (by parent_profiles.id)"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Verify parent exists
        cur.execute("SELECT id FROM parent_profiles WHERE id = %s", (parent_id,))
        if not cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent not found"
            )

        # Get events where created_by = parent_id and creator_type = 'parent'
        # NOTE: profile_picture now read from users table
        cur.execute("""
            SELECT e.*,
                   COALESCE(u.first_name || ' ' || COALESCE(u.father_name, ''), pp.username, 'Unknown') as creator_name,
                   u.profile_picture as creator_picture
            FROM events e
            LEFT JOIN parent_profiles pp ON e.created_by = pp.id AND e.creator_type = 'parent'
            LEFT JOIN users u ON pp.user_id = u.id
            WHERE e.creator_type = 'parent' AND e.created_by = %s
            ORDER BY e.start_datetime DESC
        """, (parent_id,))

        rows = cur.fetchall()

        events = []
        for row in rows:
            events.append({
                "id": row[0],
                "created_by": row[1],
                "event_picture": row[2],
                "title": row[3],
                "type": row[4],
                "description": row[5],
                "location": row[6],
                "is_online": row[7],
                "start_datetime": row[8].isoformat() if row[8] else None,
                "end_datetime": row[9].isoformat() if row[9] else None,
                "available_seats": row[10],
                "registered_count": row[11],
                "price": float(row[12]) if row[12] else 0.00,
                "subjects": row[13] or [],
                "grade_levels": row[14] or [],
                "requirements": row[15],
                "status": row[16],
                "created_at": row[17].isoformat() if row[17] else None,
                "updated_at": row[18].isoformat() if row[18] else None,
                "creator_name": row[19],
                "creator_picture": row[20]
            })

        return {"events": events, "count": len(events)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

# ============================================
# CLUB ENDPOINTS
# ============================================

@router.post("/api/clubs", status_code=status.HTTP_201_CREATED)
async def create_club(club: ClubCreate, current_user: dict = Depends(get_current_user)):
    """Create a new club"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Determine creator type and get appropriate profile ID
        creator_type = None
        creator_id = None

        # Check if user is a tutor
        cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (current_user['id'],))
        tutor_profile = cur.fetchone()

        if tutor_profile:
            creator_type = 'tutor'
            creator_id = tutor_profile[0]  # tutor_profiles.id
        else:
            # Check if user is a parent
            cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (current_user['id'],))
            parent_profile = cur.fetchone()

            if parent_profile:
                creator_type = 'parent'
                creator_id = parent_profile[0]  # parent_profiles.id
            else:
                # Note: Admin-created clubs should use admin authentication endpoints
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User must be a tutor or parent to create clubs"
                )

        cur.execute("""
            INSERT INTO clubs (
                created_by, creator_type, club_picture, title, category, description,
                member_limit, membership_type, is_paid, membership_fee,
                subjects, meeting_schedule, meeting_location, rules
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            creator_id, creator_type, club.club_picture, club.title, club.category,
            club.description, club.member_limit, club.membership_type,
            club.is_paid, club.membership_fee, club.subjects,
            club.meeting_schedule, club.meeting_location, club.rules
        ))

        result = cur.fetchone()

        # Auto-join creator as admin
        cur.execute("""
            INSERT INTO club_memberships (user_id, club_id, role, status)
            VALUES (%s, %s, 'admin', 'active')
        """, (current_user['id'], result[0]))

        # Update member count
        cur.execute("""
            UPDATE clubs SET member_count = 1 WHERE id = %s
        """, (result[0],))

        conn.commit()

        return {
            "message": "Club created successfully",
            "club_id": result[0],
            "created_at": result[1]
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@router.get("/api/clubs")
async def get_clubs(
    status_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    search: Optional[str] = None,
    role: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    authorization: Optional[str] = Header(None)
):
    """Get clubs - current user's clubs, system clubs, or joined clubs

    Query parameters:
    - role: Filter by specific role (tutor, student, parent, advertiser).
            When provided, uses the corresponding profile_id for filtering.
    """
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    # Try to get current user from token (optional)
    current_user_id = None
    current_role = None
    if authorization and authorization.startswith('Bearer '):
        try:
            from utils import verify_token
            token = authorization.split(' ')[1]
            payload = verify_token(token)
            current_user_id = payload.get('id')
            current_role = role or payload.get('role')  # Use provided role or from token
        except:
            pass  # Token invalid, just show system clubs

    try:
        # Build base query based on role
        if current_user_id:
            profile_id = None
            profile_type = current_role or 'tutor'  # Default to tutor for backward compatibility

            # Get profile ID based on role
            if profile_type == 'tutor':
                cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (current_user_id,))
                result = cur.fetchone()
                profile_id = result[0] if result else None
            elif profile_type == 'student':
                cur.execute("SELECT id FROM student_profiles WHERE user_id = %s", (current_user_id,))
                result = cur.fetchone()
                profile_id = result[0] if result else None
            elif profile_type == 'parent':
                cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (current_user_id,))
                result = cur.fetchone()
                profile_id = result[0] if result else None
            elif profile_type == 'advertiser':
                cur.execute("SELECT id FROM advertiser_profiles WHERE user_id = %s", (current_user_id,))
                result = cur.fetchone()
                profile_id = result[0] if result else None

            # Logged in: show user's clubs + system clubs + joined clubs
            query = """
                SELECT DISTINCT c.*,
                       CASE WHEN c.creator_type = 'admin' THEN true ELSE false END as is_system
                FROM clubs c
                WHERE (
                    (c.creator_type = %s AND c.created_by = %s)  -- Current user's clubs by role
                    OR c.creator_type = 'admin'  -- System clubs
                    OR c.joined_status = true  -- Joined clubs
                )
            """
            params = [profile_type, profile_id] if profile_id else [profile_type, -1]
        else:
            # Not logged in: show only system clubs
            query = """
                SELECT c.*,
                       true as is_system
                FROM clubs c
                WHERE c.creator_type = 'admin'
            """
            params = []

        if status_filter:
            query += " AND c.status = %s"
            params.append(status_filter)

        if category_filter:
            query += " AND c.category = %s"
            params.append(category_filter)

        if search:
            query += " AND (c.title ILIKE %s OR c.description ILIKE %s OR c.category ILIKE %s)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern])

        query += " ORDER BY c.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cur.execute(query, params)
        rows = cur.fetchall()

        clubs = []
        for row in rows:
            # Database column order: id, created_by, club_picture, title, category, description,
            # member_limit, member_count, membership_type, is_paid, membership_fee, subjects,
            # meeting_schedule, meeting_location, rules, status, created_at, updated_at, joined_status, creator_type
            # Plus the computed is_system column at the end
            clubs.append({
                "id": row[0],
                "created_by": row[1],
                "club_picture": row[2],
                "title": row[3],
                "category": row[4],
                "description": row[5],
                "member_limit": row[6],
                "member_count": row[7],
                "membership_type": row[8],
                "is_paid": row[9],
                "membership_fee": float(row[10]) if row[10] else 0.00,
                "subjects": row[11] or [],
                "meeting_schedule": row[12],
                "meeting_location": row[13],
                "rules": row[14],
                "status": row[15],
                "created_at": row[16].isoformat() if row[16] else None,
                "updated_at": row[17].isoformat() if row[17] else None,
                "joined_status": row[18] if row[18] else False,
                "creator_type": row[19],  # 'tutor' or 'admin'
                "is_system": row[20] if len(row) > 20 else False
            })

        return {"clubs": clubs, "count": len(clubs)}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@router.get("/api/clubs/{club_id}")
async def get_club(club_id: int):
    """Get a specific club by ID"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get club with creator info from either tutor_profiles or admin_profile
        cur.execute("""
            SELECT c.*,
                   CASE
                       WHEN c.creator_type = 'tutor' THEN tp.bio
                       WHEN c.creator_type = 'admin' THEN ap.bio
                   END as creator_bio,
                   CASE
                       WHEN c.creator_type = 'tutor' THEN u.first_name
                       WHEN c.creator_type = 'admin' THEN ap.first_name
                   END as creator_first_name,
                   CASE
                       WHEN c.creator_type = 'tutor' THEN u.father_name
                       WHEN c.creator_type = 'admin' THEN ap.father_name
                   END as creator_father_name,
                   CASE
                       WHEN c.creator_type = 'tutor' THEN u.profile_picture  -- NOTE: profile_picture now read from users table
                       WHEN c.creator_type = 'admin' THEN ap.profile_picture
                   END as creator_profile_picture
            FROM clubs c
            LEFT JOIN tutor_profiles tp ON c.creator_type = 'tutor' AND c.created_by = tp.id
            LEFT JOIN users u ON tp.user_id = u.id
            LEFT JOIN admin_profile ap ON c.creator_type = 'admin' AND c.created_by = ap.id
            WHERE c.id = %s
        """, (club_id,))

        row = cur.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Club not found"
            )

        return {
            "id": row[0],
            "created_by": row[1],
            "creator_type": row[2],
            "club_picture": row[3],
            "title": row[4],
            "category": row[5],
            "description": row[6],
            "member_limit": row[7],
            "member_count": row[8],
            "membership_type": row[9],
            "is_paid": row[10],
            "membership_fee": float(row[11]) if row[11] else 0.00,
            "subjects": row[12] or [],
            "meeting_schedule": row[13],
            "meeting_location": row[14],
            "rules": row[15],
            "status": row[16],
            "created_at": row[17].isoformat() if row[17] else None,
            "updated_at": row[18].isoformat() if row[18] else None,
            "joined_status": row[19] if row[19] else False,
            "creator": {
                "bio": row[20],
                "first_name": row[21],
                "father_name": row[22],
                "profile_picture": row[23]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@router.put("/api/clubs/{club_id}")
async def update_club(
    club_id: int,
    club_update: ClubUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a club (only creator can update)"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Check ownership
        cur.execute("SELECT created_by FROM clubs WHERE id = %s", (club_id,))
        result = cur.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Club not found"
            )

        if result[0] != current_user['id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this club"
            )

        # Build update query
        update_fields = []
        params = []

        for field, value in club_update.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = %s")
                params.append(value)

        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        params.append(club_id)

        query = f"UPDATE clubs SET {', '.join(update_fields)} WHERE id = %s"
        cur.execute(query, params)
        conn.commit()

        return {"message": "Club updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@router.delete("/api/clubs/{club_id}")
async def delete_club(club_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a club (only creator can delete)"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Check ownership
        cur.execute("SELECT created_by FROM clubs WHERE id = %s", (club_id,))
        result = cur.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Club not found"
            )

        if result[0] != current_user['id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this club"
            )

        cur.execute("DELETE FROM clubs WHERE id = %s", (club_id,))
        conn.commit()

        return {"message": "Club deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@router.get("/api/clubs/my/created")
async def get_my_clubs(current_user: dict = Depends(get_current_user)):
    """Get clubs created by current user"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT * FROM clubs
            WHERE created_by = %s
            ORDER BY created_at DESC
        """, (current_user['id'],))

        rows = cur.fetchall()

        clubs = []
        for row in rows:
            clubs.append({
                "id": row[0],
                "created_by": row[1],
                "club_picture": row[2],
                "title": row[3],
                "category": row[4],
                "description": row[5],
                "member_limit": row[6],
                "member_count": row[7],
                "membership_type": row[8],
                "is_paid": row[9],
                "membership_fee": float(row[10]) if row[10] else 0.00,
                "subjects": row[11] or [],
                "meeting_schedule": row[12],
                "meeting_location": row[13],
                "rules": row[14],
                "status": row[15],
                "created_at": row[16].isoformat() if row[16] else None,
                "updated_at": row[17].isoformat() if row[17] else None
            })

        return {"clubs": clubs, "count": len(clubs)}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@router.get("/api/clubs/by-parent/{parent_id}")
async def get_clubs_by_parent(parent_id: int):
    """Get clubs created by a specific parent (by parent_profiles.id)"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Verify parent exists
        cur.execute("SELECT id FROM parent_profiles WHERE id = %s", (parent_id,))
        if not cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent not found"
            )

        # Get clubs where created_by = parent_id and creator_type = 'parent'
        cur.execute("""
            -- NOTE: profile_picture now read from users table
            SELECT c.*,
                   pp.bio as creator_bio,
                   u.first_name as creator_first_name,
                   u.father_name as creator_father_name,
                   u.profile_picture as creator_profile_picture
            FROM clubs c
            LEFT JOIN parent_profiles pp ON c.created_by = pp.id AND c.creator_type = 'parent'
            LEFT JOIN users u ON pp.user_id = u.id
            WHERE c.creator_type = 'parent' AND c.created_by = %s
            ORDER BY c.created_at DESC
        """, (parent_id,))

        rows = cur.fetchall()

        clubs = []
        for row in rows:
            clubs.append({
                "id": row[0],
                "created_by": row[1],
                "club_picture": row[2],
                "title": row[3],
                "category": row[4],
                "description": row[5],
                "member_limit": row[6],
                "member_count": row[7],
                "membership_type": row[8],
                "is_paid": row[9],
                "membership_fee": float(row[10]) if row[10] else 0.00,
                "subjects": row[11] or [],
                "meeting_schedule": row[12],
                "meeting_location": row[13],
                "rules": row[14],
                "status": row[15],
                "created_at": row[16].isoformat() if row[16] else None,
                "updated_at": row[17].isoformat() if row[17] else None,
                "joined_status": row[18] if row[18] else False,
                "creator_type": row[19],
                "creator": {
                    "bio": row[20],
                    "first_name": row[21],
                    "father_name": row[22],
                    "profile_picture": row[23]
                }
            })

        return {"clubs": clubs, "count": len(clubs)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()


# ============================================
# STUDENT-SPECIFIC ENDPOINTS
# ============================================

@router.get("/api/student/{student_id}/clubs")
async def get_student_clubs(student_id: int, current_user: dict = Depends(get_current_user)):
    """Get all clubs created by or joined by a specific student"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get clubs created by the student OR joined by the student
        query = """
            SELECT
                c.id, c.created_by, c.club_picture, c.title, c.category,
                c.description, c.member_limit, c.member_count, c.membership_type,
                c.is_paid, c.membership_fee, c.subjects, c.meeting_schedule,
                c.meeting_location, c.rules, c.status, c.created_at, c.updated_at,
                c.joined_status, c.creator_type,
                CASE
                    WHEN cm.user_id IS NOT NULL THEN true
                    ELSE false
                END as is_member,
                CASE
                    WHEN c.created_by = %s AND c.creator_type = 'student' THEN true
                    ELSE false
                END as is_creator
            FROM clubs c
            LEFT JOIN club_members cm ON c.id = cm.club_id AND cm.user_id = %s
            WHERE (c.created_by = %s AND c.creator_type = 'student')
               OR cm.user_id = %s
            GROUP BY c.id, c.created_by, c.club_picture, c.title, c.category,
                c.description, c.member_limit, c.member_count, c.membership_type,
                c.is_paid, c.membership_fee, c.subjects, c.meeting_schedule,
                c.meeting_location, c.rules, c.status, c.created_at, c.updated_at,
                c.joined_status, c.creator_type, cm.user_id
            ORDER BY c.created_at DESC
        """
        cur.execute(query, (student_id, student_id, student_id, student_id))
        rows = cur.fetchall()

        clubs = []
        for row in rows:
            clubs.append({
                "id": row[0],
                "created_by": row[1],
                "club_picture": row[2],
                "title": row[3],
                "category": row[4],
                "description": row[5],
                "member_limit": row[6],
                "member_count": row[7],
                "membership_type": row[8],
                "is_paid": row[9],
                "membership_fee": float(row[10]) if row[10] else 0.00,
                "subjects": row[11] or [],
                "meeting_schedule": row[12],
                "meeting_location": row[13],
                "rules": row[14],
                "status": row[15],
                "created_at": row[16].isoformat() if row[16] else None,
                "updated_at": row[17].isoformat() if row[17] else None,
                "joined_status": row[18] if row[18] else False,
                "creator_type": row[19],
                "is_member": row[20],
                "is_creator": row[21]
            })

        return {"success": True, "clubs": clubs, "total": len(clubs)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()


@router.get("/api/student/{student_id}/events")
async def get_student_events(student_id: int, current_user: dict = Depends(get_current_user)):
    """Get all events created by or registered by a specific student"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get events created by the student OR registered by the student
        query = """
            SELECT
                e.id, e.created_by, e.event_picture, e.title, e.type,
                e.description, e.location, e.is_online, e.start_datetime,
                e.end_datetime, e.available_seats, e.registered_count,
                e.price, e.subjects, e.grade_levels, e.requirements,
                e.status, e.created_at, e.updated_at, e.joined_status,
                e.creator_type,
                CASE
                    WHEN ea.user_id IS NOT NULL THEN true
                    ELSE false
                END as is_registered,
                CASE
                    WHEN e.created_by = %s AND e.creator_type = 'student' THEN true
                    ELSE false
                END as is_creator
            FROM events e
            LEFT JOIN event_attendees ea ON e.id = ea.event_id AND ea.user_id = %s
            WHERE (e.created_by = %s AND e.creator_type = 'student')
               OR ea.user_id = %s
            GROUP BY e.id, e.created_by, e.event_picture, e.title, e.type,
                e.description, e.location, e.is_online, e.start_datetime,
                e.end_datetime, e.available_seats, e.registered_count,
                e.price, e.subjects, e.grade_levels, e.requirements,
                e.status, e.created_at, e.updated_at, e.joined_status,
                e.creator_type, ea.user_id
            ORDER BY e.start_datetime ASC
        """
        cur.execute(query, (student_id, student_id, student_id, student_id))
        rows = cur.fetchall()

        events = []
        for row in rows:
            events.append({
                "id": row[0],
                "created_by": row[1],
                "event_picture": row[2],
                "title": row[3],
                "type": row[4],
                "description": row[5],
                "location": row[6],
                "is_online": row[7],
                "start_datetime": row[8].isoformat() if row[8] else None,
                "end_datetime": row[9].isoformat() if row[9] else None,
                "available_seats": row[10],
                "registered_count": row[11],
                "price": float(row[12]) if row[12] else 0.00,
                "subjects": row[13] or [],
                "grade_levels": row[14] or [],
                "requirements": row[15],
                "status": row[16],
                "created_at": row[17].isoformat() if row[17] else None,
                "updated_at": row[18].isoformat() if row[18] else None,
                "joined_status": row[19] if row[19] else False,
                "creator_type": row[20],
                "is_registered": row[21],
                "is_creator": row[22]
            })

        return {"success": True, "events": events, "total": len(events)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()
