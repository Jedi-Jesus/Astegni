"""
Clubs and Events API Endpoints for Astegni Platform
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional
from datetime import datetime
import json

# Import database models and utilities
from models import Club, Event, ClubMember, EventAttendee, User
from config import get_db
from utils import get_current_user

# Create router
router = APIRouter()

# ============================================
# CLUBS ENDPOINTS
# ============================================

@router.get("/api/student/{student_id}/clubs")
def get_student_clubs(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all clubs created by or joined by a student"""
    try:
        # Get clubs created by the student
        created_clubs = db.query(Club).filter(
            Club.created_by == student_id,
            Club.creator_type == 'student'
        ).all()

        # Get clubs the student is a member of
        club_memberships = db.query(ClubMember).filter(
            ClubMember.user_id == student_id
        ).all()

        member_club_ids = [membership.club_id for membership in club_memberships]
        member_clubs = db.query(Club).filter(Club.id.in_(member_club_ids)).all() if member_club_ids else []

        # Combine and deduplicate
        all_clubs = {club.id: club for club in (created_clubs + member_clubs)}
        clubs_list = list(all_clubs.values())

        # Format response
        clubs_data = []
        for club in clubs_list:
            # Parse subjects JSON
            subjects = []
            if club.subjects:
                if isinstance(club.subjects, str):
                    subjects = json.loads(club.subjects)
                else:
                    subjects = club.subjects

            # Check if current user is a member
            is_member = db.query(ClubMember).filter(
                ClubMember.club_id == club.id,
                ClubMember.user_id == current_user.id
            ).first() is not None

            clubs_data.append({
                'id': club.id,
                'title': club.title,
                'category': club.category,
                'description': club.description,
                'club_picture': club.club_picture,
                'member_count': club.member_count,
                'member_limit': club.member_limit,
                'membership_type': club.membership_type,
                'is_paid': club.is_paid,
                'membership_fee': float(club.membership_fee) if club.membership_fee else 0,
                'subjects': subjects,
                'meeting_schedule': club.meeting_schedule,
                'meeting_location': club.meeting_location,
                'status': club.status,
                'created_by': club.created_by,
                'creator_type': club.creator_type,
                'created_at': club.created_at.isoformat() if club.created_at else None,
                'is_member': is_member,
                'is_creator': club.created_by == student_id and club.creator_type == 'student'
            })

        return {
            'success': True,
            'clubs': clubs_data,
            'total': len(clubs_data)
        }

    except Exception as e:
        print(f"Error fetching clubs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/clubs/{club_id}/join")
def join_club(
    club_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Join a club"""
    try:
        # Check if club exists
        club = db.query(Club).filter(Club.id == club_id).first()
        if not club:
            raise HTTPException(status_code=404, detail="Club not found")

        # Check if already a member
        existing_member = db.query(ClubMember).filter(
            ClubMember.club_id == club_id,
            ClubMember.user_id == current_user.id
        ).first()

        if existing_member:
            raise HTTPException(status_code=400, detail="Already a member of this club")

        # Check if club is full
        if club.member_limit and club.member_count >= club.member_limit:
            raise HTTPException(status_code=400, detail="Club is full")

        # Create membership
        new_member = ClubMember(
            club_id=club_id,
            user_id=current_user.id,
            role='member'
        )
        db.add(new_member)

        # Update member count
        club.member_count = club.member_count + 1
        db.commit()

        return {
            'success': True,
            'message': 'Successfully joined the club'
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error joining club: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/clubs/{club_id}/leave")
def leave_club(
    club_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Leave a club"""
    try:
        # Check if member exists
        member = db.query(ClubMember).filter(
            ClubMember.club_id == club_id,
            ClubMember.user_id == current_user.id
        ).first()

        if not member:
            raise HTTPException(status_code=404, detail="Not a member of this club")

        # Delete membership
        db.delete(member)

        # Update member count
        club = db.query(Club).filter(Club.id == club_id).first()
        if club:
            club.member_count = max(0, club.member_count - 1)

        db.commit()

        return {
            'success': True,
            'message': 'Successfully left the club'
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error leaving club: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# EVENTS ENDPOINTS
# ============================================

@router.get("/api/student/{student_id}/events")
def get_student_events(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all events created by or registered by a student"""
    try:
        # Get events created by the student
        created_events = db.query(Event).filter(
            Event.created_by == student_id,
            Event.creator_type == 'student'
        ).all()

        # Get events the student is registered for
        event_registrations = db.query(EventAttendee).filter(
            EventAttendee.user_id == student_id
        ).all()

        registered_event_ids = [reg.event_id for reg in event_registrations]
        registered_events = db.query(Event).filter(Event.id.in_(registered_event_ids)).all() if registered_event_ids else []

        # Combine and deduplicate
        all_events = {event.id: event for event in (created_events + registered_events)}
        events_list = list(all_events.values())

        # Sort by event date
        events_list.sort(key=lambda x: x.start_datetime if x.start_datetime else datetime.max)

        # Format response
        events_data = []
        for event in events_list:
            # Parse subjects and grade_levels JSON
            subjects = []
            grade_levels = []

            if event.subjects:
                if isinstance(event.subjects, str):
                    subjects = json.loads(event.subjects)
                else:
                    subjects = event.subjects

            if event.grade_levels:
                if isinstance(event.grade_levels, str):
                    grade_levels = json.loads(event.grade_levels)
                else:
                    grade_levels = event.grade_levels

            # Check if current user is registered
            is_registered = db.query(EventAttendee).filter(
                EventAttendee.event_id == event.id,
                EventAttendee.user_id == current_user.id
            ).first() is not None

            # Determine event status
            event_status = event.status
            if event.start_datetime:
                if event.start_datetime > datetime.now():
                    event_status = 'upcoming'
                elif event.end_datetime and event.end_datetime < datetime.now():
                    event_status = 'completed'
                else:
                    event_status = 'ongoing'

            events_data.append({
                'id': event.id,
                'title': event.title,
                'type': event.type,
                'description': event.description,
                'event_picture': event.event_picture,
                'location': event.location,
                'is_online': event.is_online,
                'start_datetime': event.start_datetime.isoformat() if event.start_datetime else None,
                'end_datetime': event.end_datetime.isoformat() if event.end_datetime else None,
                'available_seats': event.available_seats,
                'registered_count': event.registered_count,
                'price': float(event.price) if event.price else 0,
                'subjects': subjects,
                'grade_levels': grade_levels,
                'requirements': event.requirements,
                'status': event_status,
                'created_by': event.created_by,
                'creator_type': event.creator_type,
                'created_at': event.created_at.isoformat() if event.created_at else None,
                'is_registered': is_registered,
                'is_creator': event.created_by == student_id and event.creator_type == 'student'
            })

        return {
            'success': True,
            'events': events_data,
            'total': len(events_data)
        }

    except Exception as e:
        print(f"Error fetching events: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/events/{event_id}/register")
def register_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register for an event"""
    try:
        # Check if event exists
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        # Check if already registered
        existing_registration = db.query(EventAttendee).filter(
            EventAttendee.event_id == event_id,
            EventAttendee.user_id == current_user.id
        ).first()

        if existing_registration:
            raise HTTPException(status_code=400, detail="Already registered for this event")

        # Check if event is full
        if event.available_seats and event.registered_count >= event.available_seats:
            raise HTTPException(status_code=400, detail="Event is full")

        # Check if registration deadline has passed
        if event.registration_deadline and datetime.now() > event.registration_deadline:
            raise HTTPException(status_code=400, detail="Registration deadline has passed")

        # Create registration
        new_attendee = EventAttendee(
            event_id=event_id,
            user_id=current_user.id,
            status='registered'
        )
        db.add(new_attendee)

        # Update registered count
        event.registered_count = event.registered_count + 1
        db.commit()

        return {
            'success': True,
            'message': 'Successfully registered for the event'
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error registering for event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/events/{event_id}/unregister")
def unregister_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unregister from an event"""
    try:
        # Check if registration exists
        attendee = db.query(EventAttendee).filter(
            EventAttendee.event_id == event_id,
            EventAttendee.user_id == current_user.id
        ).first()

        if not attendee:
            raise HTTPException(status_code=404, detail="Not registered for this event")

        # Delete registration
        db.delete(attendee)

        # Update registered count
        event = db.query(Event).filter(Event.id == event_id).first()
        if event:
            event.registered_count = max(0, event.registered_count - 1)

        db.commit()

        return {
            'success': True,
            'message': 'Successfully unregistered from the event'
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error unregistering from event: {e}")
        raise HTTPException(status_code=500, detail=str(e))
