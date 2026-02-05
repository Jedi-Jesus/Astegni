"""
Call Log Endpoints - Voice & Video Call History
================================================
Endpoints for logging and retrieving call history in conversations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from models import CallLog, ConversationParticipant, Conversation, User
from utils import get_current_user


# Database dependency
def get_db():
    from models import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter()


# ============================================
# REQUEST/RESPONSE MODELS
# ============================================

class CallLogCreate(BaseModel):
    """Create a new call log (USER-BASED - profile fields optional for backward compatibility)"""
    conversation_id: int
    call_type: str  # 'voice', 'video'
    status: str  # 'initiated', 'ringing', 'answered', 'missed', 'declined', 'ended', 'failed'
    caller_user_id: Optional[int] = None  # NEW: User-based (preferred)
    caller_profile_id: Optional[int] = None  # Legacy: Profile-based
    caller_profile_type: Optional[str] = None  # Legacy: 'tutor', 'student', 'parent', 'advertiser'
    started_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    participants: Optional[dict] = None


class CallLogUpdate(BaseModel):
    """Update an existing call log"""
    status: Optional[str] = None
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None


# ============================================
# ENDPOINTS
# ============================================

@router.post("/api/call-logs")
async def create_call_log(
    call_data: CallLogCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new call log entry

    Called when a call is initiated, answered, or ended.
    """
    try:
        # Verify user has access to this conversation
        participant = db.query(ConversationParticipant).filter(
            and_(
                ConversationParticipant.conversation_id == call_data.conversation_id,
                ConversationParticipant.user_id == current_user.id
            )
        ).first()

        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a participant in this conversation"
            )

        # Create call log (USER-BASED with legacy support)
        call_log = CallLog(
            conversation_id=call_data.conversation_id,
            caller_user_id=call_data.caller_user_id or current_user.id,  # Prefer provided, fallback to current user
            caller_profile_id=call_data.caller_profile_id,  # Optional (legacy)
            caller_profile_type=call_data.caller_profile_type,  # Optional (legacy)
            call_type=call_data.call_type,
            status=call_data.status,
            started_at=call_data.started_at or datetime.utcnow(),
            answered_at=call_data.answered_at,
            ended_at=call_data.ended_at,
            duration_seconds=call_data.duration_seconds,
            participants=call_data.participants
        )

        db.add(call_log)
        db.commit()
        db.refresh(call_log)

        return {
            "success": True,
            "call_log_id": call_log.id,
            "message": "Call log created"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error creating call log: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create call log: {str(e)}"
        )


@router.put("/api/call-logs/{call_log_id}")
async def update_call_log(
    call_log_id: int,
    update_data: CallLogUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing call log

    Used to update call status (answered, ended) and duration.
    """
    try:
        call_log = db.query(CallLog).filter(CallLog.id == call_log_id).first()

        if not call_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call log not found"
            )

        # Verify user is the caller
        if call_log.caller_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this call log"
            )

        # Update fields
        if update_data.status:
            call_log.status = update_data.status
        if update_data.answered_at:
            call_log.answered_at = update_data.answered_at
        if update_data.ended_at:
            call_log.ended_at = update_data.ended_at
        if update_data.duration_seconds is not None:
            call_log.duration_seconds = update_data.duration_seconds

        db.commit()

        return {
            "success": True,
            "message": "Call log updated"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating call log: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update call log: {str(e)}"
        )


@router.get("/api/call-logs/{conversation_id}")
async def get_call_logs(
    conversation_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all call logs for a conversation

    Returns call history to display in chat area.
    """
    try:
        # Verify user has access to this conversation
        participant = db.query(ConversationParticipant).filter(
            and_(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == current_user.id
            )
        ).first()

        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a participant in this conversation"
            )

        # Get call logs with caller info
        call_logs = db.query(CallLog).filter(
            CallLog.conversation_id == conversation_id
        ).order_by(desc(CallLog.started_at)).all()

        # Format response
        result = []
        for log in call_logs:
            # Get caller info
            caller = db.query(User).filter(User.id == log.caller_user_id).first()
            caller_name = f"{caller.first_name} {caller.father_name}".strip() if caller else "Unknown"

            # Determine if current user is the caller
            is_caller = log.caller_user_id == current_user.id

            result.append({
                "id": log.id,
                "conversation_id": log.conversation_id,
                "caller_profile_id": log.caller_profile_id,
                "caller_profile_type": log.caller_profile_type,
                "caller_user_id": log.caller_user_id,
                "caller_name": caller_name,
                "is_caller": is_caller,  # True if current user initiated the call
                "call_type": log.call_type,
                "status": log.status,
                "started_at": log.started_at.isoformat() if log.started_at else None,
                "answered_at": log.answered_at.isoformat() if log.answered_at else None,
                "ended_at": log.ended_at.isoformat() if log.ended_at else None,
                "duration_seconds": log.duration_seconds,
                "participants": log.participants,
                "created_at": log.created_at.isoformat() if log.created_at else None
            })

        return {
            "success": True,
            "call_logs": result
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching call logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch call logs: {str(e)}"
        )
