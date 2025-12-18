"""
Astegni Connection Endpoints - Universal User Connection System (SIMPLIFIED)

This module provides API endpoints for managing user connections in Astegni.

Connection Status (Simplified):
- 'pending': Connection request sent, awaiting response
- 'accepted': Connection established and active
- 'rejected': Connection request was rejected
- 'blocked': User has blocked another user

Author: Astegni Development Team
Date: January 2025
Updated: January 2025 - Simplified Schema
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Optional
from datetime import datetime

# Import from modular structure (path already set up by app.py)
from models import (
    Connection, User, TutorProfile, StudentProfile, ParentProfile, AdvertiserProfile,
    ConnectionCreate, ConnectionUpdate, ConnectionResponse,
    SessionLocal
)
from utils import get_current_user

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_user_role(db: Session, user_id: int) -> Optional[str]:
    """
    Get the primary role for a user (prioritize: tutor > student > parent > advertiser)
    Returns the role type as string or None
    """
    # Check tutor
    if db.query(TutorProfile).filter(TutorProfile.user_id == user_id).first():
        return 'tutor'
    # Check student
    if db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first():
        return 'student'
    # Check parent
    if db.query(ParentProfile).filter(ParentProfile.user_id == user_id).first():
        return 'parent'
    # Check advertiser
    if db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user_id).first():
        return 'advertiser'
    return None


def get_all_user_roles(db: Session, user_id: int) -> List[str]:
    """
    Get all roles for a user (for users with multiple profiles)
    Returns list of role types the user has
    """
    roles = []
    if db.query(TutorProfile).filter(TutorProfile.user_id == user_id).first():
        roles.append('tutor')
    if db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first():
        roles.append('student')
    if db.query(ParentProfile).filter(ParentProfile.user_id == user_id).first():
        roles.append('parent')
    if db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user_id).first():
        roles.append('advertiser')
    return roles


# ============================================
# CONNECTION ENDPOINTS (SIMPLIFIED)
# ============================================

@router.post("/api/connections", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_connection(
    connection_data: ConnectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new connection request (Simplified)

    Request body:
    - recipient_id: User ID to send request to (references users.id) - DEPRECATED
    - recipient_profile_id: Profile ID of the recipient (e.g., tutor_profiles.id) - PREFERRED
    - recipient_type: Role of recipient ('tutor', 'student', 'parent', 'advertiser')
    - requester_type: (Optional) Role to connect as - uses active role if provided

    Note: Either recipient_id OR recipient_profile_id must be provided.
    If recipient_profile_id is provided, the user_id will be looked up from the profile.

    The backend automatically sets:
    - requested_by: Current user ID (from JWT)
    - requester_type: Uses provided requester_type or auto-determines from profile priority
    - status: 'pending'
    - requested_at: Current timestamp
    """
    user_id = current_user.id
    target_role = connection_data.recipient_type
    requested_role = connection_data.requester_type
    target_profile_id = connection_data.recipient_profile_id

    # Resolve user_id from profile_id if recipient_profile_id is provided
    if connection_data.recipient_profile_id:
        # Look up user_id from the appropriate profile table based on recipient_type
        if target_role == 'tutor':
            profile = db.query(TutorProfile).filter(TutorProfile.id == connection_data.recipient_profile_id).first()
        elif target_role == 'student':
            profile = db.query(StudentProfile).filter(StudentProfile.id == connection_data.recipient_profile_id).first()
        elif target_role == 'parent':
            profile = db.query(ParentProfile).filter(ParentProfile.id == connection_data.recipient_profile_id).first()
        elif target_role == 'advertiser':
            profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.id == connection_data.recipient_profile_id).first()
        else:
            profile = None

        if not profile:
            raise HTTPException(
                status_code=404,
                detail=f"{target_role.capitalize()} profile with ID {connection_data.recipient_profile_id} not found"
            )
        target_user_id = profile.user_id
    else:
        # Use the provided recipient_id (user_id) directly
        target_user_id = connection_data.recipient_id

    # Determine the requester's role
    if requested_role:
        # User specified which role they want to connect as
        # Verify they actually have that role
        user_roles = get_all_user_roles(db, user_id)
        if not user_roles:
            raise HTTPException(
                status_code=400,
                detail="You must have a profile (tutor/student/parent/advertiser) to create connections"
            )
        if requested_role not in user_roles:
            raise HTTPException(
                status_code=400,
                detail=f"You don't have a '{requested_role}' profile. Your roles: {', '.join(user_roles)}"
            )
        current_user_role = requested_role
    else:
        # Auto-determine role using priority system (backward compatibility)
        current_user_role = get_user_role(db, user_id)
        if not current_user_role:
            raise HTTPException(
                status_code=400,
                detail="You must have a profile (tutor/student/parent/advertiser) to create connections"
            )

    # Verify target user exists
    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    # Verify target user has the specified role (check all roles, not just primary)
    target_user_roles = get_all_user_roles(db, target_user_id)
    if target_role not in target_user_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Target user does not have '{target_role}' role. Available roles: {', '.join(target_user_roles) if target_user_roles else 'none'}"
        )

    # Prevent self-connection
    if user_id == target_user_id:
        raise HTTPException(status_code=400, detail="Cannot connect with yourself")

    # Check for existing connection (bidirectional)
    existing_connection = db.query(Connection).filter(
        or_(
            and_(
                Connection.requested_by == user_id,
                Connection.recipient_id == target_user_id
            ),
            and_(
                Connection.requested_by == target_user_id,
                Connection.recipient_id == user_id
            )
        )
    ).first()

    if existing_connection:
        status_msg = {
            'pending': 'pending response',
            'accepted': 'already connected',
            'rejected': 'rejected',
            'blocked': 'blocked'
        }.get(existing_connection.status, existing_connection.status)
        raise HTTPException(
            status_code=400,
            detail=f"Connection already exists with status: {status_msg}"
        )

    # Create new connection
    new_connection = Connection(
        requested_by=user_id,
        requester_type=current_user_role,
        recipient_id=target_user_id,
        recipient_type=target_role,
        status='pending',
        requested_at=datetime.utcnow()
    )

    db.add(new_connection)
    db.commit()
    db.refresh(new_connection)

    # Build response with user details
    response = ConnectionResponse.from_orm(new_connection)
    response.requester_name = f"{current_user.first_name} {current_user.father_name}"
    response.requester_email = current_user.email
    response.requester_profile_picture = current_user.profile_picture
    response.requester_roles = get_all_user_roles(db, current_user.id)  # Add all roles
    response.recipient_name = f"{target_user.first_name} {target_user.father_name}"
    response.recipient_email = target_user.email
    response.recipient_profile_picture = target_user.profile_picture
    response.recipient_roles = get_all_user_roles(db, target_user_id)  # Add all roles

    return response


def get_profile_id_for_role(db: Session, user_id: int, role: str) -> Optional[int]:
    """Get the profile ID for a user's specific role"""
    if role == 'tutor':
        profile = db.query(TutorProfile).filter(TutorProfile.user_id == user_id).first()
        return profile.id if profile else None
    elif role == 'student':
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        return profile.id if profile else None
    elif role == 'parent':
        profile = db.query(ParentProfile).filter(ParentProfile.user_id == user_id).first()
        return profile.id if profile else None
    elif role == 'advertiser':
        profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user_id).first()
        return profile.id if profile else None
    return None


@router.get("/api/connections", response_model=List[ConnectionResponse])
async def get_my_connections(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: pending, accepted, rejected, blocked"),
    direction: Optional[str] = Query("all", description="Filter by direction: outgoing, incoming, all"),
    role: Optional[str] = Query(None, description="Filter by role: tutor, student, parent, advertiser. If provided, filters by profile_id for that role."),
    search: Optional[str] = Query(None, description="Search by user name or email"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's connections (Simplified)

    Query parameters:
    - status: Filter by status (pending, accepted, rejected, blocked)
    - direction: Filter by direction (outgoing, incoming, all)
    - role: Filter by specific role (tutor, student, parent, advertiser).
            When provided, queries by profile_id and role type instead of user_id.
    - search: Search by user name or email
    """
    user_id = current_user.id

    # If role is specified, filter by profile_id and role type
    if role:
        profile_id = get_profile_id_for_role(db, user_id, role)
        if not profile_id:
            return []  # User doesn't have this role profile

        # Build query based on direction using profile_id and role type
        if direction == "outgoing":
            query = db.query(Connection).filter(
                and_(
                    Connection.requester_profile_id == profile_id,
                    Connection.requester_type == role
                )
            )
        elif direction == "incoming":
            query = db.query(Connection).filter(
                and_(
                    Connection.recipient_profile_id == profile_id,
                    Connection.recipient_type == role
                )
            )
        else:
            # All connections for this role
            query = db.query(Connection).filter(
                or_(
                    and_(
                        Connection.requester_profile_id == profile_id,
                        Connection.requester_type == role
                    ),
                    and_(
                        Connection.recipient_profile_id == profile_id,
                        Connection.recipient_type == role
                    )
                )
            )
    else:
        # Legacy behavior: filter by user_id (for backward compatibility)
        if direction == "outgoing":
            query = db.query(Connection).filter(
                Connection.requested_by == user_id
            )
        elif direction == "incoming":
            query = db.query(Connection).filter(
                Connection.recipient_id == user_id
            )
        else:
            query = db.query(Connection).filter(
                or_(
                    Connection.requested_by == user_id,
                    Connection.recipient_id == user_id
                )
            )

    # Apply status filter
    if status_filter:
        query = query.filter(Connection.status == status_filter)

    # Apply search filter (need to join with users)
    if search:
        search_pattern = f"%{search}%"
        query = query.join(
            User,
            or_(
                Connection.requested_by == User.id,
                Connection.recipient_id == User.id
            )
        ).filter(
            or_(
                User.first_name.ilike(search_pattern),
                User.father_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                func.concat(User.first_name, ' ', User.father_name).ilike(search_pattern)
            ),
            User.id != user_id  # Exclude current user from search
        )

    connections = query.order_by(Connection.requested_at.desc()).all()

    # Enrich with user details
    result = []
    for conn in connections:
        requester = db.query(User).filter(User.id == conn.requested_by).first()
        recipient = db.query(User).filter(User.id == conn.recipient_id).first()

        response = ConnectionResponse.from_orm(conn)
        if requester:
            response.requester_name = f"{requester.first_name} {requester.father_name}"
            response.requester_email = requester.email
            response.requester_profile_picture = requester.profile_picture
            response.requester_roles = get_all_user_roles(db, requester.id)  # Add all roles
        if recipient:
            response.recipient_name = f"{recipient.first_name} {recipient.father_name}"
            response.recipient_email = recipient.email
            response.recipient_profile_picture = recipient.profile_picture
            response.recipient_roles = get_all_user_roles(db, recipient.id)  # Add all roles

        result.append(response)

    return result


@router.get("/api/connections/stats", response_model=dict)
async def get_connection_stats(
    role: Optional[str] = Query(None, description="Filter by role: tutor, student, parent, advertiser. If provided, filters by profile_id for that role."),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get connection statistics for current user (Simplified)

    Query parameters:
    - role: Filter by specific role (tutor, student, parent, advertiser).
            When provided, counts connections by profile_id and role type instead of user_id.

    Returns:
    - total_connections: Number of accepted connections
    - pending_count: Number of pending connections (sent + received)
    - accepted_count: Number of accepted connections
    - incoming_requests: Number of incoming pending requests
    - outgoing_requests: Number of outgoing pending requests
    - rejected_count: Number of rejected connections
    - blocked_count: Number of blocked users
    """
    user_id = current_user.id

    # If role is specified, filter by profile_id and role type
    if role:
        profile_id = get_profile_id_for_role(db, user_id, role)
        if not profile_id:
            # User doesn't have this role, return zeros
            return {
                "total_connections": 0,
                "pending_count": 0,
                "accepted_count": 0,
                "connected_count": 0,
                "incoming_requests": 0,
                "outgoing_requests": 0,
                "rejected_count": 0,
                "blocked_count": 0
            }

        # Accepted connections for this role
        accepted_count = db.query(func.count(Connection.id)).filter(
            or_(
                and_(
                    Connection.requester_profile_id == profile_id,
                    Connection.requester_type == role
                ),
                and_(
                    Connection.recipient_profile_id == profile_id,
                    Connection.recipient_type == role
                )
            ),
            Connection.status == 'accepted'
        ).scalar()

        # Pending requests - incoming for this role
        incoming_requests = db.query(func.count(Connection.id)).filter(
            Connection.recipient_profile_id == profile_id,
            Connection.recipient_type == role,
            Connection.status == 'pending'
        ).scalar()

        # Pending requests - outgoing for this role
        outgoing_requests = db.query(func.count(Connection.id)).filter(
            Connection.requester_profile_id == profile_id,
            Connection.requester_type == role,
            Connection.status == 'pending'
        ).scalar()

        # Total pending
        pending_count = incoming_requests + outgoing_requests

        # Rejected connections for this role
        rejected_count = db.query(func.count(Connection.id)).filter(
            or_(
                and_(
                    Connection.requester_profile_id == profile_id,
                    Connection.requester_type == role
                ),
                and_(
                    Connection.recipient_profile_id == profile_id,
                    Connection.recipient_type == role
                )
            ),
            Connection.status == 'rejected'
        ).scalar()

        # Blocked users for this role
        blocked_count = db.query(func.count(Connection.id)).filter(
            Connection.requester_profile_id == profile_id,
            Connection.requester_type == role,
            Connection.status == 'blocked'
        ).scalar()

    else:
        # Legacy behavior: filter by user_id (for backward compatibility)
        # Accepted connections
        accepted_count = db.query(func.count(Connection.id)).filter(
            or_(
                Connection.requested_by == user_id,
                Connection.recipient_id == user_id
            ),
            Connection.status == 'accepted'
        ).scalar()

        # Pending requests - incoming
        incoming_requests = db.query(func.count(Connection.id)).filter(
            Connection.recipient_id == user_id,
            Connection.status == 'pending'
        ).scalar()

        # Pending requests - outgoing
        outgoing_requests = db.query(func.count(Connection.id)).filter(
            Connection.requested_by == user_id,
            Connection.status == 'pending'
        ).scalar()

        # Total pending
        pending_count = incoming_requests + outgoing_requests

        # Rejected connections
        rejected_count = db.query(func.count(Connection.id)).filter(
            or_(
                Connection.requested_by == user_id,
                Connection.recipient_id == user_id
            ),
            Connection.status == 'rejected'
        ).scalar()

        # Blocked users
        blocked_count = db.query(func.count(Connection.id)).filter(
            Connection.requested_by == user_id,
            Connection.status == 'blocked'
        ).scalar()

    return {
        "total_connections": accepted_count,
        "pending_count": pending_count,
        "accepted_count": accepted_count,
        "connected_count": accepted_count,  # Alias for frontend compatibility
        "incoming_requests": incoming_requests,
        "outgoing_requests": outgoing_requests,
        "rejected_count": rejected_count,
        "blocked_count": blocked_count
    }


@router.get("/api/connections/{connection_id}", response_model=ConnectionResponse)
async def get_connection(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific connection by ID"""
    user_id = current_user.id

    connection = db.query(Connection).filter(Connection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Verify user is part of this connection
    if connection.requested_by != user_id and connection.recipient_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this connection")

    # Enrich with user details
    requester = db.query(User).filter(User.id == connection.requested_by).first()
    recipient = db.query(User).filter(User.id == connection.recipient_id).first()

    response = ConnectionResponse.from_orm(connection)
    if requester:
        response.requester_name = f"{requester.first_name} {requester.father_name}"
        response.requester_email = requester.email
        response.requester_profile_picture = requester.profile_picture
    if recipient:
        response.recipient_name = f"{recipient.first_name} {recipient.father_name}"
        response.recipient_email = recipient.email
        response.recipient_profile_picture = recipient.profile_picture

    return response


@router.put("/api/connections/{connection_id}", response_model=ConnectionResponse)
async def update_connection(
    connection_id: int,
    update_data: ConnectionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update connection status (Simplified)

    Status updates:
    - 'accepted': Accept the connection request (recipient only)
    - 'rejected': Reject the connection request (recipient only)
    - 'blocked': Block the user (either party)

    Authorization rules:
    - Only the recipient (recipient_id) can accept/reject
    - Either party can block
    """
    user_id = current_user.id

    connection = db.query(Connection).filter(Connection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Authorization rules
    if update_data.status in ['accepted', 'rejected']:
        # Only recipient can accept/reject
        if connection.recipient_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Only the recipient can accept or reject connection requests"
            )
    elif update_data.status == 'blocked':
        # Either party can block
        if connection.requested_by != user_id and connection.recipient_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="You must be part of this connection to block"
            )

    # Update status
    connection.status = update_data.status
    connection.updated_at = datetime.utcnow()

    # Set connected_at when accepting
    if update_data.status == 'accepted':
        connection.connected_at = datetime.utcnow()

    db.commit()
    db.refresh(connection)

    # Enrich with user details
    requester = db.query(User).filter(User.id == connection.requested_by).first()
    recipient = db.query(User).filter(User.id == connection.recipient_id).first()

    response = ConnectionResponse.from_orm(connection)
    if requester:
        response.requester_name = f"{requester.first_name} {requester.father_name}"
        response.requester_email = requester.email
        response.requester_profile_picture = requester.profile_picture
    if recipient:
        response.recipient_name = f"{recipient.first_name} {recipient.father_name}"
        response.recipient_email = recipient.email
        response.recipient_profile_picture = recipient.profile_picture

    return response


@router.delete("/api/connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a connection (remove from database)

    Note: For most cases, use PUT with status='rejected' or 'blocked' instead.
    This DELETE endpoint permanently removes the connection record.

    Either party can delete the connection.
    """
    user_id = current_user.id

    connection = db.query(Connection).filter(Connection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Verify user is part of this connection
    if connection.requested_by != user_id and connection.recipient_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this connection")

    db.delete(connection)
    db.commit()

    return None


@router.get("/api/users/{user_id}/connections", response_model=List[ConnectionResponse])
async def get_user_connections(
    user_id: int,
    status_filter: Optional[str] = Query("accepted", alias="status", description="Filter by status"),
    db: Session = Depends(get_db)
):
    """
    Get public connections for a specific user (Simplified)

    Only shows 'accepted' connections by default.
    """
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Build query
    query = db.query(Connection).filter(
        or_(
            Connection.requested_by == user_id,
            Connection.recipient_id == user_id
        ),
        Connection.status == status_filter
    )

    connections = query.order_by(Connection.requested_at.desc()).all()

    # Enrich with user details
    result = []
    for conn in connections:
        requester = db.query(User).filter(User.id == conn.requested_by).first()
        recipient = db.query(User).filter(User.id == conn.recipient_id).first()

        response = ConnectionResponse.from_orm(conn)
        if requester:
            response.requester_name = f"{requester.first_name} {requester.father_name}"
            response.requester_email = requester.email
            response.requester_profile_picture = requester.profile_picture
            response.requester_roles = get_all_user_roles(db, requester.id)  # Add all roles
        if recipient:
            response.recipient_name = f"{recipient.first_name} {recipient.father_name}"
            response.recipient_email = recipient.email
            response.recipient_profile_picture = recipient.profile_picture
            response.recipient_roles = get_all_user_roles(db, recipient.id)  # Add all roles

        result.append(response)

    return result


@router.post("/api/connections/check", response_model=dict)
async def check_connection_status(
    request_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check connection status between current user and target user (Simplified)

    Request body: { "target_user_id": int }

    Returns:
    - is_connected: Boolean (true if status is 'accepted')
    - status: Connection status (pending, accepted, rejected, blocked)
    - direction: Who initiated the connection (outgoing/incoming)
    - connection_id: ID of the connection (if exists)
    """
    user_id = current_user.id
    target_user_id = request_data.get('target_user_id')

    if not target_user_id:
        raise HTTPException(status_code=400, detail="target_user_id is required")

    # Check for connection in either direction
    connection = db.query(Connection).filter(
        or_(
            and_(Connection.requested_by == user_id, Connection.recipient_id == target_user_id),
            and_(Connection.requested_by == target_user_id, Connection.recipient_id == user_id)
        )
    ).first()

    if not connection:
        return {
            "is_connected": False,
            "status": None,
            "direction": None,
            "connection_id": None
        }

    # Determine direction
    if connection.requested_by == user_id:
        direction = "outgoing"  # Current user initiated
    else:
        direction = "incoming"  # Target user initiated

    return {
        "is_connected": connection.status == 'accepted',
        "status": connection.status,
        "direction": direction,
        "connection_id": connection.id,
        "requested_at": connection.requested_at,
        "connected_at": connection.connected_at
    }


@router.post("/api/connections/check-batch", response_model=dict)
async def check_connection_status_batch(
    request_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check connection status between current user and multiple target users (batch)

    Request body: { "target_profile_ids": [int], "target_type": "tutor" }

    Returns a dict mapping profile_id to connection status:
    {
        "connections": {
            "85": {
                "is_connected": true,
                "status": "accepted",
                "direction": "outgoing",
                "connection_id": 123
            },
            "86": {
                "is_connected": false,
                "status": "pending",
                "direction": "incoming",
                "connection_id": 124
            }
        }
    }
    """
    user_id = current_user.id
    target_profile_ids = request_data.get('target_profile_ids', [])
    target_type = request_data.get('target_type', 'tutor')

    if not target_profile_ids:
        return {"connections": {}}

    # Look up user_ids from profile_ids based on target_type
    profile_to_user = {}
    if target_type == 'tutor':
        profiles = db.query(TutorProfile).filter(TutorProfile.id.in_(target_profile_ids)).all()
        profile_to_user = {p.id: p.user_id for p in profiles}
    elif target_type == 'student':
        profiles = db.query(StudentProfile).filter(StudentProfile.id.in_(target_profile_ids)).all()
        profile_to_user = {p.id: p.user_id for p in profiles}
    elif target_type == 'parent':
        profiles = db.query(ParentProfile).filter(ParentProfile.id.in_(target_profile_ids)).all()
        profile_to_user = {p.id: p.user_id for p in profiles}
    elif target_type == 'advertiser':
        profiles = db.query(AdvertiserProfile).filter(AdvertiserProfile.id.in_(target_profile_ids)).all()
        profile_to_user = {p.id: p.user_id for p in profiles}

    if not profile_to_user:
        return {"connections": {}}

    target_user_ids = list(profile_to_user.values())

    # Fetch all connections with these users in a single query
    connections = db.query(Connection).filter(
        or_(
            and_(Connection.requested_by == user_id, Connection.recipient_id.in_(target_user_ids)),
            and_(Connection.requested_by.in_(target_user_ids), Connection.recipient_id == user_id)
        )
    ).all()

    # Build a map of user_id -> connection
    user_to_connection = {}
    for conn in connections:
        if conn.requested_by == user_id:
            user_to_connection[conn.recipient_id] = conn
        else:
            user_to_connection[conn.requested_by] = conn

    # Build the response mapping profile_id -> status
    result = {}
    for profile_id, target_user_id in profile_to_user.items():
        conn = user_to_connection.get(target_user_id)
        if conn:
            direction = "outgoing" if conn.requested_by == user_id else "incoming"
            result[str(profile_id)] = {
                "is_connected": conn.status == 'accepted',
                "status": conn.status,
                "direction": direction,
                "connection_id": conn.id
            }
        else:
            result[str(profile_id)] = {
                "is_connected": False,
                "status": None,
                "direction": None,
                "connection_id": None
            }

    return {"connections": result}
