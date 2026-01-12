"""
Poll API endpoints for chat system.
Handles poll creation, voting, and retrieval.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/chat/polls", tags=["Polls"])

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

# Convert URL format if needed
if DATABASE_URL.startswith("postgresql://"):
    db_url = DATABASE_URL.replace("postgresql://", "postgres://", 1)
else:
    db_url = DATABASE_URL


def get_db_connection():
    """Get database connection."""
    return psycopg2.connect(db_url, cursor_factory=RealDictCursor)


# Pydantic models
class PollOptionCreate(BaseModel):
    text: str


class PollCreate(BaseModel):
    conversation_id: int
    question: str
    options: List[str]
    multiple_choice: bool = False
    anonymous: bool = False
    end_time_hours: Optional[int] = 24  # Hours until poll ends, 0 = no end


class PollVote(BaseModel):
    option_id: int


class PollOptionResponse(BaseModel):
    id: int
    text: str
    votes: int
    voters: List[dict] = []
    percentage: float = 0


class PollResponse(BaseModel):
    id: int
    conversation_id: int
    question: str
    options: List[PollOptionResponse]
    multiple_choice: bool
    anonymous: bool
    status: str
    total_votes: int
    end_time: Optional[str]
    time_remaining: Optional[str]
    created_at: str
    created_by: dict
    user_votes: List[int] = []  # Option IDs the current user voted for


# Helper functions
def calculate_time_remaining(end_time: datetime) -> Optional[str]:
    """Calculate human-readable time remaining."""
    if not end_time:
        return None

    now = datetime.now(timezone.utc)
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)

    diff = end_time - now
    if diff.total_seconds() <= 0:
        return None

    hours = int(diff.total_seconds() // 3600)
    minutes = int((diff.total_seconds() % 3600) // 60)

    if hours >= 24:
        days = hours // 24
        return f"{days}d left"
    elif hours > 0:
        return f"{hours}h {minutes}m left"
    else:
        return f"{minutes}m left"


def get_profile_name(profile_id: int, profile_type: str, cur) -> str:
    """Get display name from profile tables, falling back to users table."""
    # Map profile_type to table name
    table_map = {
        'tutor': 'tutor_profiles',
        'student': 'student_profiles',
        'parent': 'parent_profiles',
        'advertiser': 'advertiser_profiles'
    }

    table_name = table_map.get(profile_type)
    if not table_name:
        return "Unknown"

    try:
        # First try to get username from profile table
        cur.execute(f"""
            SELECT p.username, p.user_id, u.first_name, u.father_name
            FROM {table_name} p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.id = %s
        """, (profile_id,))
        result = cur.fetchone()

        if result:
            # Prefer username if set, otherwise use first_name + father_name
            if result.get('username'):
                return result['username']
            first_name = result.get('first_name') or ''
            father_name = result.get('father_name') or ''
            return f"{first_name} {father_name}".strip() or "Unknown"
        return "Unknown"
    except Exception:
        return "Unknown"


def check_poll_ended(poll_id: int, conn) -> bool:
    """Check if poll has ended and update status if needed."""
    cur = conn.cursor()
    cur.execute("""
        SELECT status, end_time FROM polls WHERE id = %s
    """, (poll_id,))
    poll = cur.fetchone()

    if not poll:
        return True

    if poll['status'] == 'ended':
        return True

    if poll['end_time']:
        end_time = poll['end_time']
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) >= end_time:
            # Update poll status to ended
            cur.execute("""
                UPDATE polls SET status = 'ended' WHERE id = %s
            """, (poll_id,))
            conn.commit()
            return True

    return False


# API Endpoints

@router.post("", response_model=dict)
async def create_poll(
    poll: PollCreate,
    user_id: int = Query(...),
    profile_id: int = Query(...),
    profile_type: str = Query(...)
):
    """Create a new poll in a conversation."""
    if len(poll.options) < 2:
        raise HTTPException(status_code=400, detail="Poll must have at least 2 options")
    if len(poll.options) > 10:
        raise HTTPException(status_code=400, detail="Poll cannot have more than 10 options")
    if not poll.question.strip():
        raise HTTPException(status_code=400, detail="Poll question is required")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Calculate end time
        end_time = None
        if poll.end_time_hours and poll.end_time_hours > 0:
            from datetime import timedelta
            end_time = datetime.now(timezone.utc) + timedelta(hours=poll.end_time_hours)

        # Create poll
        cur.execute("""
            INSERT INTO polls (
                conversation_id, created_by_user_id, created_by_profile_id,
                created_by_profile_type, question, multiple_choice, anonymous, end_time
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            poll.conversation_id, user_id, profile_id, profile_type,
            poll.question.strip(), poll.multiple_choice, poll.anonymous, end_time
        ))
        result = cur.fetchone()
        poll_id = result['id']
        created_at = result['created_at']

        # Create options
        for i, option_text in enumerate(poll.options):
            if option_text.strip():
                cur.execute("""
                    INSERT INTO poll_options (poll_id, option_text, option_order)
                    VALUES (%s, %s, %s)
                """, (poll_id, option_text.strip(), i))

        conn.commit()

        # Fetch created poll with options
        poll_data = get_poll_data(poll_id, profile_id, conn)

        return {
            "success": True,
            "message": "Poll created successfully",
            "poll": poll_data
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


def get_poll_data(poll_id: int, profile_id: int, conn=None):
    """Helper function to get poll data. Can use existing connection or create new one."""
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True

    cur = conn.cursor()

    try:
        # Check if poll ended
        check_poll_ended(poll_id, conn)

        # Get poll (no need to join users table anymore)
        cur.execute("""
            SELECT * FROM polls WHERE id = %s
        """, (poll_id,))
        poll = cur.fetchone()

        if not poll:
            return None

        # Get creator name from profile table
        creator_name = get_profile_name(
            poll['created_by_profile_id'],
            poll['created_by_profile_type'],
            cur
        )

        # Get options with vote counts
        cur.execute("""
            SELECT
                po.id,
                po.option_text,
                po.option_order,
                COUNT(pv.id) as votes
            FROM poll_options po
            LEFT JOIN poll_votes pv ON po.id = pv.option_id
            WHERE po.poll_id = %s
            GROUP BY po.id, po.option_text, po.option_order
            ORDER BY po.option_order
        """, (poll_id,))
        options = cur.fetchall()

        # Get total votes
        total_votes = sum(opt['votes'] for opt in options)

        # Get current user's votes by profile_id
        cur.execute("""
            SELECT option_id FROM poll_votes
            WHERE poll_id = %s AND profile_id = %s
        """, (poll_id, profile_id))
        user_votes = [row['option_id'] for row in cur.fetchall()]

        # Get voters if not anonymous
        voters_by_option = {}
        if not poll['anonymous']:
            cur.execute("""
                SELECT
                    pv.option_id,
                    pv.profile_id,
                    pv.profile_type
                FROM poll_votes pv
                WHERE pv.poll_id = %s
            """, (poll_id,))
            for voter in cur.fetchall():
                opt_id = voter['option_id']
                if opt_id not in voters_by_option:
                    voters_by_option[opt_id] = []
                # Get voter name from profile
                voter_name = get_profile_name(voter['profile_id'], voter['profile_type'], cur)
                voters_by_option[opt_id].append({
                    "profile_id": voter['profile_id'],
                    "name": voter_name,
                    "profile_type": voter['profile_type']
                })

        # Build options response
        options_response = []
        for opt in options:
            percentage = round((opt['votes'] / total_votes * 100) if total_votes > 0 else 0, 1)
            options_response.append({
                "id": opt['id'],
                "text": opt['option_text'],
                "votes": opt['votes'],
                "percentage": percentage,
                "voters": voters_by_option.get(opt['id'], []) if not poll['anonymous'] else []
            })

        # Calculate time remaining
        time_remaining = calculate_time_remaining(poll['end_time']) if poll['end_time'] else None

        return {
            "id": poll['id'],
            "conversation_id": poll['conversation_id'],
            "question": poll['question'],
            "options": options_response,
            "multiple_choice": poll['multiple_choice'],
            "anonymous": poll['anonymous'],
            "status": poll['status'],
            "total_votes": total_votes,
            "end_time": poll['end_time'].isoformat() if poll['end_time'] else None,
            "time_remaining": time_remaining,
            "created_at": poll['created_at'].isoformat(),
            "created_by": {
                "profile_id": poll['created_by_profile_id'],
                "profile_type": poll['created_by_profile_type'],
                "name": creator_name
            },
            "user_votes": user_votes
        }

    finally:
        cur.close()
        if should_close:
            conn.close()


@router.get("/{poll_id}", response_model=dict)
async def get_poll(
    poll_id: int,
    profile_id: int = Query(...),
    profile_type: str = Query(...)
):
    """Get a single poll with its options and vote counts."""
    poll_data = get_poll_data(poll_id, profile_id)
    if not poll_data:
        raise HTTPException(status_code=404, detail="Poll not found")
    return poll_data


@router.get("/conversation/{conversation_id}", response_model=dict)
async def get_conversation_polls(
    conversation_id: int,
    profile_id: int = Query(...),
    profile_type: str = Query(...)
):
    """Get all polls in a conversation."""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get all polls in conversation
        cur.execute("""
            SELECT id FROM polls
            WHERE conversation_id = %s
            ORDER BY created_at DESC
        """, (conversation_id,))
        poll_ids = [row['id'] for row in cur.fetchall()]

        polls = []
        for poll_id in poll_ids:
            poll_data = get_poll_data(poll_id, profile_id, conn)
            if poll_data:
                polls.append(poll_data)

        return {
            "polls": polls,
            "count": len(polls)
        }

    finally:
        cur.close()
        conn.close()


@router.post("/{poll_id}/vote", response_model=dict)
async def vote_on_poll(
    poll_id: int,
    vote: PollVote,
    user_id: int = Query(...),
    profile_id: int = Query(...),
    profile_type: str = Query(...)
):
    """Vote on a poll option."""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if poll exists and is active
        if check_poll_ended(poll_id, conn):
            cur.execute("SELECT status FROM polls WHERE id = %s", (poll_id,))
            poll = cur.fetchone()
            if not poll:
                raise HTTPException(status_code=404, detail="Poll not found")
            if poll['status'] == 'ended':
                raise HTTPException(status_code=400, detail="Poll has ended")

        # Get poll settings
        cur.execute("""
            SELECT multiple_choice FROM polls WHERE id = %s
        """, (poll_id,))
        poll = cur.fetchone()

        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")

        # Verify option belongs to poll
        cur.execute("""
            SELECT id FROM poll_options WHERE id = %s AND poll_id = %s
        """, (vote.option_id, poll_id))
        if not cur.fetchone():
            raise HTTPException(status_code=400, detail="Invalid option for this poll")

        # Check existing votes by profile_id
        cur.execute("""
            SELECT option_id FROM poll_votes
            WHERE poll_id = %s AND profile_id = %s
        """, (poll_id, profile_id))
        existing_votes = [row['option_id'] for row in cur.fetchall()]

        if vote.option_id in existing_votes:
            # Remove vote (toggle off)
            cur.execute("""
                DELETE FROM poll_votes
                WHERE poll_id = %s AND option_id = %s AND profile_id = %s
            """, (poll_id, vote.option_id, profile_id))
            conn.commit()
            action = "removed"
        else:
            if not poll['multiple_choice'] and existing_votes:
                # Single choice - remove previous vote
                cur.execute("""
                    DELETE FROM poll_votes
                    WHERE poll_id = %s AND profile_id = %s
                """, (poll_id, profile_id))

            # Add new vote
            cur.execute("""
                INSERT INTO poll_votes (poll_id, option_id, user_id, profile_id, profile_type)
                VALUES (%s, %s, %s, %s, %s)
            """, (poll_id, vote.option_id, user_id, profile_id, profile_type))
            conn.commit()
            action = "added"

        # Get updated poll data
        poll_data = get_poll_data(poll_id, profile_id, conn)

        return {
            "success": True,
            "action": action,
            "message": f"Vote {action} successfully",
            "poll": poll_data
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.delete("/{poll_id}/vote", response_model=dict)
async def remove_vote(
    poll_id: int,
    option_id: int = Query(...),
    profile_id: int = Query(...),
    profile_type: str = Query(...)
):
    """Remove a vote from a poll option."""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            DELETE FROM poll_votes
            WHERE poll_id = %s AND option_id = %s AND profile_id = %s
            RETURNING id
        """, (poll_id, option_id, profile_id))

        deleted = cur.fetchone()
        conn.commit()

        if not deleted:
            raise HTTPException(status_code=404, detail="Vote not found")

        poll_data = get_poll_data(poll_id, profile_id, conn)

        return {
            "success": True,
            "message": "Vote removed successfully",
            "poll": poll_data
        }

    finally:
        cur.close()
        conn.close()


@router.put("/{poll_id}/end", response_model=dict)
async def end_poll(
    poll_id: int,
    profile_id: int = Query(...),
    profile_type: str = Query(...)
):
    """End a poll early (only by creator)."""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if profile is the creator
        cur.execute("""
            SELECT created_by_profile_id, created_by_profile_type, status FROM polls WHERE id = %s
        """, (poll_id,))
        poll = cur.fetchone()

        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")
        if poll['created_by_profile_id'] != profile_id or poll['created_by_profile_type'] != profile_type:
            raise HTTPException(status_code=403, detail="Only the poll creator can end the poll")
        if poll['status'] == 'ended':
            raise HTTPException(status_code=400, detail="Poll has already ended")

        # End the poll
        cur.execute("""
            UPDATE polls SET status = 'ended', end_time = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (poll_id,))
        conn.commit()

        poll_data = get_poll_data(poll_id, profile_id, conn)

        return {
            "success": True,
            "message": "Poll ended successfully",
            "poll": poll_data
        }

    finally:
        cur.close()
        conn.close()


@router.delete("/{poll_id}", response_model=dict)
async def delete_poll(
    poll_id: int,
    profile_id: int = Query(...),
    profile_type: str = Query(...)
):
    """Delete a poll (only by creator)."""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if profile is the creator
        cur.execute("""
            SELECT created_by_profile_id, created_by_profile_type FROM polls WHERE id = %s
        """, (poll_id,))
        poll = cur.fetchone()

        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")
        if poll['created_by_profile_id'] != profile_id or poll['created_by_profile_type'] != profile_type:
            raise HTTPException(status_code=403, detail="Only the poll creator can delete the poll")

        # Delete poll (cascade will delete options and votes)
        cur.execute("DELETE FROM polls WHERE id = %s", (poll_id,))
        conn.commit()

        return {
            "success": True,
            "message": "Poll deleted successfully"
        }

    finally:
        cur.close()
        conn.close()
