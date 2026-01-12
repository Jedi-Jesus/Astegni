"""
Chat System API Endpoints
=========================
Handles all chat/messaging functionality:
- Conversations (direct and group)
- Messages (text, media, files)
- Reactions, replies, pinning
- Read receipts
- Call logs
- Blocking

Contacts are fetched from the connections table (status='accepted').
Uses profile_id + profile_type for multi-role support.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Body
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import os
from dotenv import load_dotenv
from encryption_service import encrypt_message, decrypt_message, is_encrypted
from email_service import email_service
import threading

load_dotenv()

router = APIRouter(prefix="/api/chat", tags=["Chat"])

# =============================================
# IN-MEMORY TYPING STATUS STORE
# =============================================
# Stores typing status with timestamps for expiry
# Format: {conversation_id: {(profile_id, profile_type): {"is_typing": bool, "timestamp": datetime, "user_name": str, "avatar": str}}}
_typing_status: Dict[int, Dict[tuple, dict]] = {}
_typing_lock = threading.Lock()
TYPING_EXPIRY_SECONDS = 5  # Typing status expires after 5 seconds of no updates


def _clean_expired_typing():
    """Remove expired typing statuses"""
    now = datetime.now()
    with _typing_lock:
        for conv_id in list(_typing_status.keys()):
            for key in list(_typing_status[conv_id].keys()):
                if now - _typing_status[conv_id][key]["timestamp"] > timedelta(seconds=TYPING_EXPIRY_SECONDS):
                    del _typing_status[conv_id][key]
            if not _typing_status[conv_id]:
                del _typing_status[conv_id]

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


# =============================================
# PYDANTIC MODELS
# =============================================

class ProfileInfo(BaseModel):
    profile_id: int
    profile_type: str  # 'tutor', 'student', 'parent', 'advertiser'
    user_id: int

class CreateConversationRequest(BaseModel):
    type: str = "direct"  # 'direct' or 'group'
    name: Optional[str] = None  # For groups
    description: Optional[str] = None
    participants: List[ProfileInfo]  # List of participants

class SendMessageRequest(BaseModel):
    conversation_id: int
    message_type: str = "text"  # 'text', 'image', 'audio', 'video', 'file', 'system', 'location', 'gif'
    content: Optional[str] = None
    media_url: Optional[str] = None
    media_metadata: Optional[dict] = None
    reply_to_id: Optional[int] = None
    # Forwarded message fields (forwarder info comes from sender_profile_id/type)
    is_forwarded: Optional[bool] = False
    forwarded_from: Optional[str] = None  # Original sender's name
    forwarded_from_avatar: Optional[str] = None  # Original sender's avatar URL
    forwarded_from_profile_id: Optional[int] = None  # Original sender's profile ID
    forwarded_from_profile_type: Optional[str] = None  # Original sender's profile type

class UpdateMessageRequest(BaseModel):
    content: str

class ReactionRequest(BaseModel):
    reaction: str  # 'heart', 'thumbsup', 'laugh', 'wow', 'sad', 'angry'

class CreateGroupRequest(BaseModel):
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    participants: List[ProfileInfo]

class AddParticipantsRequest(BaseModel):
    participants: List[ProfileInfo]

class BlockContactRequest(BaseModel):
    blocked_profile_id: int
    blocked_profile_type: str
    blocked_user_id: int
    reason: Optional[str] = None


# =============================================
# HELPER FUNCTIONS
# =============================================

def get_profile_info_from_token(token_data: dict) -> ProfileInfo:
    """Extract profile info from JWT token data"""
    # This would normally come from your auth dependency
    # For now, we'll pass it directly
    return ProfileInfo(
        profile_id=token_data.get("profile_id"),
        profile_type=token_data.get("profile_type"),
        user_id=token_data.get("user_id")
    )

def get_user_display_info(conn, user_id: int, profile_type: str, profile_id: int) -> dict:
    """Get user display info (name, avatar) based on profile type"""
    cur = conn.cursor()

    # First get user basic info
    cur.execute("""
        SELECT first_name, father_name, profile_picture, email
        FROM users WHERE id = %s
    """, (user_id,))
    user = cur.fetchone()

    if not user:
        return {"name": "Unknown User", "avatar": None}

    full_name = f"{user['first_name']} {user['father_name']}"
    avatar = user['profile_picture']

    # Try to get profile-specific info
    profile_table = f"{profile_type}_profiles"
    try:
        cur.execute(f"""
            SELECT profile_picture, username
            FROM {profile_table}
            WHERE id = %s
        """, (profile_id,))
        profile = cur.fetchone()
        if profile:
            if profile.get('profile_picture'):
                avatar = profile['profile_picture']
            if profile.get('username'):
                full_name = profile['username']
    except:
        pass

    cur.close()
    return {
        "name": full_name,
        "avatar": avatar,
        "email": user.get('email')
    }


# =============================================
# PRIVACY SETTINGS HELPER FUNCTIONS
# =============================================

def get_user_privacy_settings(conn, profile_id: int, profile_type: str) -> dict:
    """Get privacy settings for a user profile"""
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT who_can_message, read_receipts, online_status, typing_indicators,
                   last_seen_visibility, block_screenshots, disable_forwarding,
                   allow_calls_from, allow_group_adds, allow_channel_adds
            FROM chat_settings
            WHERE profile_id = %s AND profile_type = %s
        """, (profile_id, profile_type))
        row = cur.fetchone()
        if row:
            return dict(row)
        # Return defaults
        return {
            "who_can_message": "everyone",
            "read_receipts": True,
            "online_status": True,
            "typing_indicators": True,
            "last_seen_visibility": "everyone",
            "block_screenshots": False,
            "disable_forwarding": False,
            "allow_calls_from": "everyone",
            "allow_group_adds": "everyone",
            "allow_channel_adds": "everyone"
        }
    finally:
        cur.close()


def are_users_connected(conn, profile1_id: int, profile1_type: str, profile2_id: int, profile2_type: str) -> bool:
    """Check if two users are connected (have an accepted connection)"""
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id FROM connections
            WHERE status = 'accepted'
            AND (
                (requester_profile_id = %s AND requester_type = %s
                 AND recipient_profile_id = %s AND recipient_type = %s)
                OR
                (requester_profile_id = %s AND requester_type = %s
                 AND recipient_profile_id = %s AND recipient_type = %s)
            )
            LIMIT 1
        """, (profile1_id, profile1_type, profile2_id, profile2_type,
              profile2_id, profile2_type, profile1_id, profile1_type))
        return cur.fetchone() is not None
    finally:
        cur.close()


def is_user_blocked(conn, blocker_profile_id: int, blocker_profile_type: str,
                    blocked_profile_id: int, blocked_profile_type: str) -> bool:
    """Check if a user has blocked another user"""
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id FROM blocked_chat_contacts
            WHERE blocker_profile_id = %s AND blocker_profile_type = %s
            AND blocked_profile_id = %s AND blocked_profile_type = %s
            LIMIT 1
        """, (blocker_profile_id, blocker_profile_type, blocked_profile_id, blocked_profile_type))
        return cur.fetchone() is not None
    finally:
        cur.close()


def check_can_message(conn, sender_profile_id: int, sender_profile_type: str,
                      recipient_profile_id: int, recipient_profile_type: str) -> tuple:
    """
    Check if sender can message recipient based on privacy settings.
    Returns (can_message: bool, reason: str or None)
    """
    # Check if blocked (either direction)
    if is_user_blocked(conn, recipient_profile_id, recipient_profile_type,
                       sender_profile_id, sender_profile_type):
        return False, "You have been blocked by this user"

    if is_user_blocked(conn, sender_profile_id, sender_profile_type,
                       recipient_profile_id, recipient_profile_type):
        return False, "You have blocked this user"

    # Get recipient's privacy settings
    settings = get_user_privacy_settings(conn, recipient_profile_id, recipient_profile_type)
    who_can_message = settings.get('who_can_message', 'everyone')

    if who_can_message == 'everyone':
        return True, None
    elif who_can_message == 'connections':
        if are_users_connected(conn, sender_profile_id, sender_profile_type,
                               recipient_profile_id, recipient_profile_type):
            return True, None
        return False, "This user only accepts messages from connections"
    elif who_can_message == 'none':
        return False, "This user has disabled messages"

    return True, None


def check_can_call(conn, caller_profile_id: int, caller_profile_type: str,
                   recipient_profile_id: int, recipient_profile_type: str) -> tuple:
    """
    Check if caller can call recipient based on privacy settings.
    Returns (can_call: bool, reason: str or None)
    """
    # Check if blocked
    if is_user_blocked(conn, recipient_profile_id, recipient_profile_type,
                       caller_profile_id, caller_profile_type):
        return False, "You have been blocked by this user"

    # Get recipient's privacy settings
    settings = get_user_privacy_settings(conn, recipient_profile_id, recipient_profile_type)
    allow_calls_from = settings.get('allow_calls_from', 'everyone')

    if allow_calls_from == 'everyone':
        return True, None
    elif allow_calls_from == 'connections':
        if are_users_connected(conn, caller_profile_id, caller_profile_type,
                               recipient_profile_id, recipient_profile_type):
            return True, None
        return False, "This user only accepts calls from connections"
    elif allow_calls_from == 'none':
        return False, "This user has disabled calls"

    return True, None


def check_can_add_to_group(conn, adder_profile_id: int, adder_profile_type: str,
                           target_profile_id: int, target_profile_type: str) -> tuple:
    """
    Check if adder can add target to a group based on privacy settings.
    Returns (can_add: bool, reason: str or None)
    """
    # Get target's privacy settings
    settings = get_user_privacy_settings(conn, target_profile_id, target_profile_type)
    allow_group_adds = settings.get('allow_group_adds', 'everyone')

    if allow_group_adds == 'everyone':
        return True, None
    elif allow_group_adds == 'connections':
        if are_users_connected(conn, adder_profile_id, adder_profile_type,
                               target_profile_id, target_profile_type):
            return True, None
        return False, "This user only allows connections to add them to groups"
    elif allow_group_adds == 'none':
        return False, "This user has disabled being added to groups"

    return True, None


def check_can_add_to_channel(conn, adder_profile_id: int, adder_profile_type: str,
                             target_profile_id: int, target_profile_type: str) -> tuple:
    """
    Check if adder can add target to a channel based on privacy settings.
    Returns (can_add: bool, reason: str or None)
    """
    # Get target's privacy settings
    settings = get_user_privacy_settings(conn, target_profile_id, target_profile_type)
    allow_channel_adds = settings.get('allow_channel_adds', 'everyone')

    if allow_channel_adds == 'everyone':
        return True, None
    elif allow_channel_adds == 'connections':
        if are_users_connected(conn, adder_profile_id, adder_profile_type,
                               target_profile_id, target_profile_type):
            return True, None
        return False, "This user only allows connections to add them to channels"
    elif allow_channel_adds == 'none':
        return False, "This user has disabled being added to channels"

    return True, None


def check_can_forward_message(conn, message_id: int) -> tuple:
    """
    Check if a message can be forwarded based on sender's disable_forwarding setting.
    Returns (can_forward: bool, reason: str or None)
    """
    cur = conn.cursor()
    try:
        # Get original message sender's profile
        cur.execute("""
            SELECT sender_profile_id, sender_profile_type
            FROM chat_messages
            WHERE id = %s
        """, (message_id,))
        msg = cur.fetchone()
        if not msg:
            return False, "Message not found"

        # Get sender's privacy settings
        settings = get_user_privacy_settings(conn, msg['sender_profile_id'], msg['sender_profile_type'])

        if settings.get('disable_forwarding', False):
            return False, "This message cannot be forwarded"

        return True, None
    finally:
        cur.close()


def should_show_read_receipts(conn, viewer_profile_id: int, viewer_profile_type: str) -> bool:
    """Check if read receipts should be shown for this user"""
    settings = get_user_privacy_settings(conn, viewer_profile_id, viewer_profile_type)
    return settings.get('read_receipts', True)


def should_show_typing_indicator(conn, typer_profile_id: int, typer_profile_type: str) -> bool:
    """Check if typing indicator should be shown for this user"""
    settings = get_user_privacy_settings(conn, typer_profile_id, typer_profile_type)
    return settings.get('typing_indicators', True)


def should_show_online_status(conn, user_profile_id: int, user_profile_type: str,
                              viewer_profile_id: int, viewer_profile_type: str) -> bool:
    """Check if online status should be shown to a specific viewer"""
    settings = get_user_privacy_settings(conn, user_profile_id, user_profile_type)

    if not settings.get('online_status', True):
        return False

    return True


def should_show_last_seen(conn, user_profile_id: int, user_profile_type: str,
                          viewer_profile_id: int, viewer_profile_type: str) -> bool:
    """Check if last seen should be shown to a specific viewer"""
    settings = get_user_privacy_settings(conn, user_profile_id, user_profile_type)
    last_seen_visibility = settings.get('last_seen_visibility', 'everyone')

    if last_seen_visibility == 'everyone':
        return True
    elif last_seen_visibility == 'connections':
        return are_users_connected(conn, user_profile_id, user_profile_type,
                                   viewer_profile_id, viewer_profile_type)
    elif last_seen_visibility == 'nobody':
        return False

    return True


def get_user_last_seen_info(conn, target_profile_id: int, target_profile_type: str,
                            viewer_profile_id: int, viewer_profile_type: str) -> dict:
    """
    Get last_seen and is_online info for a user, respecting privacy settings.
    Returns dict with: is_online, last_seen, online_hidden, last_seen_hidden
    """
    from datetime import datetime, timedelta

    cur = conn.cursor()
    result = {
        "is_online": False,
        "last_seen": None,
        "online_hidden": False,
        "last_seen_hidden": False
    }

    # Check privacy settings
    show_online = should_show_online_status(
        conn, target_profile_id, target_profile_type,
        viewer_profile_id, viewer_profile_type
    )
    show_last_seen = should_show_last_seen(
        conn, target_profile_id, target_profile_type,
        viewer_profile_id, viewer_profile_type
    )

    # Query last_active from chat_active_sessions
    cur.execute("""
        SELECT last_active FROM chat_active_sessions
        WHERE profile_id = %s AND profile_type = %s
        ORDER BY last_active DESC
        LIMIT 1
    """, (target_profile_id, target_profile_type))
    session = cur.fetchone()

    if session and session['last_active']:
        time_diff = datetime.now() - session['last_active']
        is_online = time_diff < timedelta(minutes=5)
        last_seen = session['last_active'].isoformat()

        if show_online:
            result['is_online'] = is_online
        else:
            result['online_hidden'] = True

        if show_last_seen:
            result['last_seen'] = last_seen
        else:
            result['last_seen_hidden'] = True
    else:
        # No session data
        if not show_online:
            result['online_hidden'] = True
        if not show_last_seen:
            result['last_seen_hidden'] = True

    return result


# =============================================
# CONTACTS ENDPOINTS (from connections table)
# =============================================

@router.get("/contacts")
async def get_contacts(
    profile_id: int,
    profile_type: str,
    user_id: int,
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0
):
    """
    Get contacts from connections table (accepted connections only).
    Returns users that the current profile has an accepted connection with.
    Filters by profile_id to support multi-role users (same user can have different
    connections as tutor vs student vs parent).
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Build query to get accepted connections filtered by profile_id
        # This ensures tutor profile sees tutor connections, student sees student connections, etc.
        query = """
            SELECT DISTINCT
                c.id as connection_id,
                c.connected_at,
                CASE
                    WHEN c.requested_by = %(user_id)s AND c.requester_profile_id = %(profile_id)s THEN c.recipient_id
                    WHEN c.recipient_id = %(user_id)s AND c.recipient_profile_id = %(profile_id)s THEN c.requested_by
                END as contact_user_id,
                CASE
                    WHEN c.requested_by = %(user_id)s AND c.requester_profile_id = %(profile_id)s THEN c.recipient_type
                    WHEN c.recipient_id = %(user_id)s AND c.recipient_profile_id = %(profile_id)s THEN c.requester_type
                END as contact_profile_type,
                CASE
                    WHEN c.requested_by = %(user_id)s AND c.requester_profile_id = %(profile_id)s THEN c.recipient_profile_id
                    WHEN c.recipient_id = %(user_id)s AND c.recipient_profile_id = %(profile_id)s THEN c.requester_profile_id
                END as contact_profile_id,
                u.first_name,
                u.father_name,
                u.profile_picture,
                u.email,
                u.last_login
            FROM connections c
            JOIN users u ON u.id = CASE
                WHEN c.requested_by = %(user_id)s AND c.requester_profile_id = %(profile_id)s THEN c.recipient_id
                WHEN c.recipient_id = %(user_id)s AND c.recipient_profile_id = %(profile_id)s THEN c.requested_by
            END
            WHERE c.status = 'accepted'
            AND (
                (c.requested_by = %(user_id)s AND c.requester_profile_id = %(profile_id)s)
                OR
                (c.recipient_id = %(user_id)s AND c.recipient_profile_id = %(profile_id)s)
            )
        """

        params = {"user_id": user_id, "profile_id": profile_id}

        # Add search filter
        if search:
            query += """
                AND (
                    LOWER(u.first_name) LIKE LOWER(%(search)s)
                    OR LOWER(u.father_name) LIKE LOWER(%(search)s)
                    OR LOWER(u.email) LIKE LOWER(%(search)s)
                )
            """
            params["search"] = f"%{search}%"

        query += """
            ORDER BY c.connected_at DESC
            LIMIT %(limit)s OFFSET %(offset)s
        """
        params["limit"] = limit
        params["offset"] = offset

        cur.execute(query, params)
        contacts = cur.fetchall()

        # Get profile-specific info for each contact
        result = []
        for contact in contacts:
            contact_dict = dict(contact)

            # Get profile-specific avatar/username
            profile_info = get_user_display_info(
                conn,
                contact['contact_user_id'],
                contact['contact_profile_type'],
                contact['contact_profile_id']
            )

            contact_dict['display_name'] = profile_info['name']
            contact_dict['avatar'] = profile_info['avatar']
            contact_dict['is_online'] = False  # Would check with WebSocket in production

            # Check if there's an existing conversation
            cur.execute("""
                SELECT c.id, c.type, c.last_message_at
                FROM conversations c
                JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
                    AND cp1.profile_id = %(my_profile_id)s
                    AND cp1.profile_type = %(my_profile_type)s
                JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
                    AND cp2.profile_id = %(contact_profile_id)s
                    AND cp2.profile_type = %(contact_profile_type)s
                WHERE c.type = 'direct'
                LIMIT 1
            """, {
                "my_profile_id": profile_id,
                "my_profile_type": profile_type,
                "contact_profile_id": contact['contact_profile_id'],
                "contact_profile_type": contact['contact_profile_type']
            })
            existing_conv = cur.fetchone()

            if existing_conv:
                contact_dict['conversation_id'] = existing_conv['id']
                contact_dict['last_message_at'] = existing_conv['last_message_at']

            result.append(contact_dict)

        return {"contacts": result, "total": len(result)}

    finally:
        cur.close()
        conn.close()


@router.get("/connection-requests")
async def get_connection_requests(
    profile_id: int,
    profile_type: str,
    user_id: int,
    request_type: Optional[str] = None,  # 'sent', 'received', 'all'
    limit: int = Query(50, le=100),
    offset: int = 0
):
    """
    Get pending connection requests (sent and received).
    Returns requests that can be accepted/rejected in the chat interface.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        results = {"sent": [], "received": []}

        # Get SENT requests (pending) - filtered by profile_id
        # This ensures tutor profile only sees tutor requests, student sees student requests, etc.
        if request_type in ['sent', 'all', None]:
            cur.execute("""
                SELECT
                    c.id as connection_id,
                    c.requested_at,
                    c.status,
                    c.recipient_id as user_id,
                    c.recipient_type as profile_type,
                    c.recipient_profile_id as profile_id,
                    u.first_name,
                    u.father_name,
                    u.profile_picture,
                    u.email
                FROM connections c
                JOIN users u ON u.id = c.recipient_id
                WHERE c.requested_by = %(user_id)s
                AND c.requester_profile_id = %(profile_id)s
                AND c.status = 'pending'
                ORDER BY c.requested_at DESC
                LIMIT %(limit)s OFFSET %(offset)s
            """, {"user_id": user_id, "profile_id": profile_id, "limit": limit, "offset": offset})

            sent_requests = cur.fetchall()
            for req in sent_requests:
                req_dict = dict(req)
                # Get profile-specific info
                if req['profile_id']:
                    profile_info = get_user_display_info(
                        conn,
                        req['user_id'],
                        req['profile_type'],
                        req['profile_id']
                    )
                    req_dict['display_name'] = profile_info['name']
                    req_dict['avatar'] = profile_info['avatar']
                else:
                    req_dict['display_name'] = f"{req['first_name']} {req['father_name']}"
                    req_dict['avatar'] = req['profile_picture']
                req_dict['request_direction'] = 'sent'
                results['sent'].append(req_dict)

        # Get RECEIVED requests (pending) - filtered by profile_id
        # This ensures tutor profile only sees tutor requests, student sees student requests, etc.
        if request_type in ['received', 'all', None]:
            cur.execute("""
                SELECT
                    c.id as connection_id,
                    c.requested_at,
                    c.status,
                    c.requested_by as user_id,
                    c.requester_type as profile_type,
                    c.requester_profile_id as profile_id,
                    u.first_name,
                    u.father_name,
                    u.profile_picture,
                    u.email
                FROM connections c
                JOIN users u ON u.id = c.requested_by
                WHERE c.recipient_id = %(user_id)s
                AND c.recipient_profile_id = %(profile_id)s
                AND c.status = 'pending'
                ORDER BY c.requested_at DESC
                LIMIT %(limit)s OFFSET %(offset)s
            """, {"user_id": user_id, "profile_id": profile_id, "limit": limit, "offset": offset})

            received_requests = cur.fetchall()
            for req in received_requests:
                req_dict = dict(req)
                # Get profile-specific info
                if req['profile_id']:
                    profile_info = get_user_display_info(
                        conn,
                        req['user_id'],
                        req['profile_type'],
                        req['profile_id']
                    )
                    req_dict['display_name'] = profile_info['name']
                    req_dict['avatar'] = profile_info['avatar']
                else:
                    req_dict['display_name'] = f"{req['first_name']} {req['father_name']}"
                    req_dict['avatar'] = req['profile_picture']
                req_dict['request_direction'] = 'received'
                results['received'].append(req_dict)

        return {
            "sent_requests": results['sent'],
            "received_requests": results['received'],
            "sent_count": len(results['sent']),
            "received_count": len(results['received'])
        }

    finally:
        cur.close()
        conn.close()


@router.post("/connection-requests/{connection_id}/respond")
async def respond_to_connection_request(
    connection_id: int,
    profile_id: int,
    profile_type: str,
    user_id: int,
    action: str  # 'accept' or 'reject'
):
    """Accept or reject a connection request"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify the request exists and is for this user
        cur.execute("""
            SELECT * FROM connections
            WHERE id = %s AND recipient_id = %s AND status = 'pending'
        """, (connection_id, user_id))

        request = cur.fetchone()
        if not request:
            raise HTTPException(status_code=404, detail="Connection request not found")

        # Update status
        new_status = 'accepted' if action == 'accept' else 'rejected'
        connected_at = datetime.now() if action == 'accept' else None

        cur.execute("""
            UPDATE connections
            SET status = %s, connected_at = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (new_status, connected_at, connection_id))

        conn.commit()

        return {
            "message": f"Connection request {new_status}",
            "connection_id": connection_id,
            "status": new_status
        }

    finally:
        cur.close()
        conn.close()


# =============================================
# CONVERSATIONS ENDPOINTS
# =============================================

@router.get("/conversations")
async def get_conversations(
    profile_id: int,
    profile_type: str,
    user_id: int,
    filter_type: Optional[str] = None,  # 'all', 'direct', 'groups', 'unread'
    limit: int = Query(50, le=100),
    offset: int = 0
):
    """Get all conversations for the current profile"""
    print(f"[Chat API] GET /conversations - user_id={user_id}, profile_id={profile_id}, profile_type={profile_type}")
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        query = """
            SELECT
                c.id,
                c.type,
                c.name,
                c.description,
                c.avatar_url,
                c.last_message_at,
                c.created_at,
                c.created_by_profile_id,
                c.created_by_profile_type,
                cp.is_muted,
                cp.is_pinned,
                cp.last_read_at,
                cp.last_read_message_id,
                cp.chat_cleared_at
            FROM conversations c
            JOIN conversation_participants cp ON cp.conversation_id = c.id
            WHERE cp.profile_id = %(profile_id)s
            AND cp.profile_type = %(profile_type)s
            AND cp.is_active = TRUE
            AND c.is_archived = FALSE
        """

        params = {
            "profile_id": profile_id,
            "profile_type": profile_type,
            "user_id": user_id
        }

        # Filter by type
        if filter_type == 'direct':
            query += " AND c.type = 'direct'"
        elif filter_type == 'groups':
            query += " AND c.type IN ('group', 'channel')"
        elif filter_type == 'channels':
            query += " AND c.type = 'channel'"

        query += """
            ORDER BY cp.is_pinned DESC, c.last_message_at DESC NULLS LAST
            LIMIT %(limit)s OFFSET %(offset)s
        """
        params["limit"] = limit
        params["offset"] = offset

        cur.execute(query, params)
        conversations = cur.fetchall()

        result = []
        for conv in conversations:
            conv_dict = dict(conv)

            # Convert datetime fields to ISO format strings
            for key in ['last_message_at', 'created_at', 'last_read_at', 'chat_cleared_at']:
                if key in conv_dict and conv_dict[key] and hasattr(conv_dict[key], 'isoformat'):
                    conv_dict[key] = conv_dict[key].isoformat()

            # For direct chats, get the other participant's info
            if conv['type'] == 'direct':
                cur.execute("""
                    SELECT
                        cp.profile_id,
                        cp.profile_type,
                        cp.user_id
                    FROM conversation_participants cp
                    WHERE cp.conversation_id = %s
                    AND NOT (cp.profile_id = %s AND cp.profile_type = %s)
                """, (conv['id'], profile_id, profile_type))
                other_participant = cur.fetchone()

                if other_participant:
                    user_info = get_user_display_info(
                        conn,
                        other_participant['user_id'],
                        other_participant['profile_type'],
                        other_participant['profile_id']
                    )
                    conv_dict['display_name'] = user_info['name']
                    conv_dict['avatar'] = user_info['avatar']
                    conv_dict['other_profile_id'] = other_participant['profile_id']
                    conv_dict['other_profile_type'] = other_participant['profile_type']
                    conv_dict['other_user_id'] = other_participant['user_id']

                    # Get last_seen and is_online for the other participant (respecting privacy)
                    # Check privacy settings first
                    show_online = should_show_online_status(
                        conn,
                        other_participant['profile_id'],
                        other_participant['profile_type'],
                        profile_id,
                        profile_type
                    )
                    show_last_seen = should_show_last_seen(
                        conn,
                        other_participant['profile_id'],
                        other_participant['profile_type'],
                        profile_id,
                        profile_type
                    )

                    cur.execute("""
                        SELECT last_active FROM chat_active_sessions
                        WHERE profile_id = %s AND profile_type = %s
                        ORDER BY last_active DESC
                        LIMIT 1
                    """, (other_participant['profile_id'], other_participant['profile_type']))
                    session = cur.fetchone()

                    if session and session['last_active']:
                        from datetime import datetime, timedelta
                        time_diff = datetime.now() - session['last_active']
                        is_online = time_diff < timedelta(minutes=5)
                        last_seen = session['last_active'].isoformat()

                        # Apply privacy filters
                        if show_online:
                            conv_dict['is_online'] = is_online
                        else:
                            conv_dict['is_online'] = False
                            conv_dict['online_hidden'] = True

                        if show_last_seen:
                            conv_dict['last_seen'] = last_seen
                        else:
                            conv_dict['last_seen'] = None
                            conv_dict['last_seen_hidden'] = True
                    else:
                        conv_dict['is_online'] = False
                        conv_dict['last_seen'] = None
                        # Still indicate if hidden by privacy
                        if not show_online:
                            conv_dict['online_hidden'] = True
                        if not show_last_seen:
                            conv_dict['last_seen_hidden'] = True
            else:
                # For groups/channels, use group/channel name
                default_name = 'Channel' if conv['type'] == 'channel' else 'Group Chat'
                conv_dict['display_name'] = conv['name'] or default_name
                conv_dict['avatar'] = conv['avatar_url']

                # Get participant count (for groups: "members", for channels: "subscribers")
                cur.execute("""
                    SELECT COUNT(*) as count
                    FROM conversation_participants
                    WHERE conversation_id = %s AND is_active = TRUE
                """, (conv['id'],))
                conv_dict['participant_count'] = cur.fetchone()['count']

                # Include creator info for channels (needed for posting restrictions)
                conv_dict['created_by_profile_id'] = conv.get('created_by_profile_id')
                conv_dict['created_by_profile_type'] = conv.get('created_by_profile_type')

            # Get last message
            cur.execute("""
                SELECT
                    m.id,
                    m.content,
                    m.message_type,
                    m.created_at,
                    m.sender_profile_id,
                    m.sender_profile_type
                FROM chat_messages m
                WHERE m.conversation_id = %s
                AND m.is_deleted = FALSE
                ORDER BY m.created_at DESC
                LIMIT 1
            """, (conv['id'],))
            last_msg = cur.fetchone()

            if last_msg:
                # Decrypt last message content for preview
                decrypted_content = decrypt_message(last_msg['content']) if last_msg['content'] else None
                conv_dict['last_message'] = {
                    "id": last_msg['id'],
                    "content": decrypted_content,
                    "type": last_msg['message_type'],
                    "time": last_msg['created_at'].isoformat() if last_msg['created_at'] else None,
                    "is_mine": (last_msg['sender_profile_id'] == profile_id and
                               last_msg['sender_profile_type'] == profile_type)
                }

            # Get unread count (respecting deleted messages and chat_cleared_at)
            chat_cleared_at = conv.get('chat_cleared_at')
            unread_query = """
                SELECT COUNT(*) as count
                FROM chat_messages m
                WHERE m.conversation_id = %s
                AND m.is_deleted = FALSE
                AND NOT (COALESCE(m.deleted_for_user_ids, '[]'::jsonb) @> %s::jsonb)
                AND m.created_at > COALESCE(%s, '1970-01-01'::timestamp)
                AND NOT (m.sender_profile_id = %s AND m.sender_profile_type = %s)
            """
            unread_params = [conv['id'], json.dumps([user_id]), conv['last_read_at'], profile_id, profile_type]

            # Also filter by chat_cleared_at if set
            if chat_cleared_at:
                unread_query += " AND m.created_at > %s"
                unread_params.append(chat_cleared_at)

            cur.execute(unread_query, unread_params)
            conv_dict['unread_count'] = cur.fetchone()['count']

            result.append(conv_dict)

        # If filter is 'unread', filter results
        if filter_type == 'unread':
            result = [c for c in result if c.get('unread_count', 0) > 0]

        # Also get accepted connections that don't have conversations yet
        # These are contacts the user can start chatting with
        if filter_type in ['all', 'direct', None]:
            # Get IDs of users we already have conversations with
            existing_conv_users = set()
            for conv in result:
                if conv.get('other_user_id'):
                    existing_conv_users.add(conv['other_user_id'])

            # Get accepted connections filtered by profile_id
            # This ensures tutor profile only sees tutor connections, student sees student connections, etc.
            cur.execute("""
                SELECT
                    c.id as connection_id,
                    c.connected_at,
                    CASE
                        WHEN c.requested_by = %(user_id)s AND c.requester_profile_id = %(profile_id)s THEN c.recipient_id
                        WHEN c.recipient_id = %(user_id)s AND c.recipient_profile_id = %(profile_id)s THEN c.requested_by
                    END as other_user_id,
                    CASE
                        WHEN c.requested_by = %(user_id)s AND c.requester_profile_id = %(profile_id)s THEN c.recipient_type
                        WHEN c.recipient_id = %(user_id)s AND c.recipient_profile_id = %(profile_id)s THEN c.requester_type
                    END as other_profile_type,
                    CASE
                        WHEN c.requested_by = %(user_id)s AND c.requester_profile_id = %(profile_id)s THEN c.recipient_profile_id
                        WHEN c.recipient_id = %(user_id)s AND c.recipient_profile_id = %(profile_id)s THEN c.requester_profile_id
                    END as other_profile_id,
                    u.first_name,
                    u.father_name,
                    u.profile_picture
                FROM connections c
                JOIN users u ON u.id = CASE
                    WHEN c.requested_by = %(user_id)s AND c.requester_profile_id = %(profile_id)s THEN c.recipient_id
                    WHEN c.recipient_id = %(user_id)s AND c.recipient_profile_id = %(profile_id)s THEN c.requested_by
                END
                WHERE c.status = 'accepted'
                AND (
                    (c.requested_by = %(user_id)s AND c.requester_profile_id = %(profile_id)s)
                    OR
                    (c.recipient_id = %(user_id)s AND c.recipient_profile_id = %(profile_id)s)
                )
                ORDER BY c.connected_at DESC
            """, {"user_id": user_id, "profile_type": profile_type, "profile_id": profile_id})

            accepted_connections = cur.fetchall()
            print(f"[Chat API] Found {len(accepted_connections)} accepted connections for user_id={user_id}, profile_id={profile_id}")
            print(f"[Chat API] Existing conversation user_ids: {existing_conv_users}")

            for conn_row in accepted_connections:
                # Skip if we already have a conversation with this user
                if conn_row['other_user_id'] in existing_conv_users:
                    continue

                # Get profile-specific display info
                if conn_row['other_profile_id']:
                    user_info = get_user_display_info(
                        conn,
                        conn_row['other_user_id'],
                        conn_row['other_profile_type'],
                        conn_row['other_profile_id']
                    )
                    display_name = user_info['name']
                    avatar = user_info['avatar']
                else:
                    display_name = f"{conn_row['first_name']} {conn_row['father_name']}"
                    avatar = conn_row['profile_picture']

                # Create a pseudo-conversation entry for this connection
                connected_at = conn_row['connected_at']
                if connected_at and hasattr(connected_at, 'isoformat'):
                    connected_at = connected_at.isoformat()

                # Get last_seen for this connection (same logic as for conversations)
                conn_is_online = False
                conn_last_seen = None
                conn_online_hidden = False
                conn_last_seen_hidden = False

                if conn_row['other_profile_id'] and conn_row['other_profile_type']:
                    # Check privacy settings
                    show_online = should_show_online_status(
                        conn,
                        conn_row['other_profile_id'],
                        conn_row['other_profile_type'],
                        profile_id,
                        profile_type
                    )
                    show_last_seen = should_show_last_seen(
                        conn,
                        conn_row['other_profile_id'],
                        conn_row['other_profile_type'],
                        profile_id,
                        profile_type
                    )

                    # Query last_active from chat_active_sessions
                    cur.execute("""
                        SELECT last_active FROM chat_active_sessions
                        WHERE profile_id = %s AND profile_type = %s
                        ORDER BY last_active DESC
                        LIMIT 1
                    """, (conn_row['other_profile_id'], conn_row['other_profile_type']))
                    session = cur.fetchone()

                    if session and session['last_active']:
                        from datetime import datetime, timedelta
                        time_diff = datetime.now() - session['last_active']
                        is_online = time_diff < timedelta(minutes=5)
                        last_seen = session['last_active'].isoformat()

                        if show_online:
                            conn_is_online = is_online
                        else:
                            conn_online_hidden = True

                        if show_last_seen:
                            conn_last_seen = last_seen
                        else:
                            conn_last_seen_hidden = True
                    else:
                        if not show_online:
                            conn_online_hidden = True
                        if not show_last_seen:
                            conn_last_seen_hidden = True

                result.append({
                    "id": f"connection-{conn_row['connection_id']}",
                    "type": "direct",
                    "display_name": display_name,
                    "avatar": avatar,
                    "other_profile_id": conn_row['other_profile_id'],
                    "other_profile_type": conn_row['other_profile_type'],
                    "other_user_id": conn_row['other_user_id'],
                    "last_message": None,
                    "last_message_at": connected_at,
                    "unread_count": 0,
                    "is_muted": False,
                    "is_pinned": False,
                    "is_connection": True,  # Flag to indicate this is a connection without conversation
                    "is_online": conn_is_online,
                    "last_seen": conn_last_seen,
                    "online_hidden": conn_online_hidden,
                    "last_seen_hidden": conn_last_seen_hidden
                })

        # Add linked family members (parents for students, children for parents)
        # These are implicit connections based on family relationships
        if filter_type in ['all', 'direct', None]:
            # Track which users we already have in the list
            existing_user_ids = set()
            for conv in result:
                if conv.get('other_user_id'):
                    existing_user_ids.add(conv['other_user_id'])

            # For STUDENTS: Add linked parents from parent_id array
            if profile_type == 'student':
                cur.execute("""
                    SELECT parent_id FROM student_profiles WHERE id = %s
                """, (profile_id,))
                student_row = cur.fetchone()

                if student_row and student_row['parent_id']:
                    parent_profile_ids = student_row['parent_id']  # This is an integer[]
                    print(f"[Chat API] Student {profile_id} has linked parents: {parent_profile_ids}")

                    for parent_profile_id in parent_profile_ids:
                        if parent_profile_id:
                            # Get parent profile and user info
                            cur.execute("""
                                SELECT pp.id, pp.user_id, pp.profile_picture, pp.username,
                                       u.first_name, u.father_name, u.profile_picture as user_picture
                                FROM parent_profiles pp
                                JOIN users u ON u.id = pp.user_id
                                WHERE pp.id = %s
                            """, (parent_profile_id,))
                            parent_row = cur.fetchone()

                            if parent_row and parent_row['user_id'] not in existing_user_ids:
                                display_name = parent_row['username'] or f"{parent_row['first_name']} {parent_row['father_name']}"
                                avatar = parent_row['profile_picture'] or parent_row['user_picture']

                                # Get last_seen info for this parent
                                last_seen_info = get_user_last_seen_info(
                                    conn, parent_profile_id, "parent",
                                    profile_id, profile_type
                                )

                                result.append({
                                    "id": f"family-parent-{parent_profile_id}",
                                    "type": "direct",
                                    "display_name": display_name,
                                    "avatar": avatar,
                                    "other_profile_id": parent_profile_id,
                                    "other_profile_type": "parent",
                                    "other_user_id": parent_row['user_id'],
                                    "last_message": None,
                                    "last_message_at": None,
                                    "unread_count": 0,
                                    "is_muted": False,
                                    "is_pinned": False,
                                    "is_family": True,  # Flag to indicate this is a family member
                                    "relationship": "Parent",
                                    **last_seen_info  # Add is_online, last_seen, online_hidden, last_seen_hidden
                                })
                                existing_user_ids.add(parent_row['user_id'])
                                print(f"[Chat API] Added linked parent: {display_name}")

            # For PARENTS: Add linked children from children_ids array
            elif profile_type == 'parent':
                cur.execute("""
                    SELECT children_ids FROM parent_profiles WHERE id = %s
                """, (profile_id,))
                parent_row = cur.fetchone()

                if parent_row and parent_row['children_ids']:
                    children_profile_ids = parent_row['children_ids']  # This is an integer[]
                    print(f"[Chat API] Parent {profile_id} has linked children: {children_profile_ids}")

                    for child_profile_id in children_profile_ids:
                        if child_profile_id:
                            # Get student profile and user info
                            cur.execute("""
                                SELECT sp.id, sp.user_id, sp.profile_picture, sp.username,
                                       u.first_name, u.father_name, u.profile_picture as user_picture
                                FROM student_profiles sp
                                JOIN users u ON u.id = sp.user_id
                                WHERE sp.id = %s
                            """, (child_profile_id,))
                            child_row = cur.fetchone()

                            if child_row and child_row['user_id'] not in existing_user_ids:
                                display_name = child_row['username'] or f"{child_row['first_name']} {child_row['father_name']}"
                                avatar = child_row['profile_picture'] or child_row['user_picture']

                                # Get last_seen info for this child
                                last_seen_info = get_user_last_seen_info(
                                    conn, child_profile_id, "student",
                                    profile_id, profile_type
                                )

                                result.append({
                                    "id": f"family-child-{child_profile_id}",
                                    "type": "direct",
                                    "display_name": display_name,
                                    "avatar": avatar,
                                    "other_profile_id": child_profile_id,
                                    "other_profile_type": "student",
                                    "other_user_id": child_row['user_id'],
                                    "last_message": None,
                                    "last_message_at": None,
                                    "unread_count": 0,
                                    "is_muted": False,
                                    "is_pinned": False,
                                    "is_family": True,  # Flag to indicate this is a family member
                                    "relationship": "Child",
                                    **last_seen_info  # Add is_online, last_seen, online_hidden, last_seen_hidden
                                })
                                existing_user_ids.add(child_row['user_id'])
                                print(f"[Chat API] Added linked child: {display_name}")

        # =============================================
        # ADD ENROLLED STUDENTS/TUTORS FROM enrolled_students TABLE
        # =============================================
        if filter_type in ['all', 'direct', None]:
            # For TUTORS: Add enrolled students and their parents
            if profile_type == 'tutor':
                cur.execute("""
                    SELECT DISTINCT
                        es.student_id,
                        sp.user_id as student_user_id,
                        sp.profile_picture as student_avatar,
                        sp.username as student_username,
                        sp.parent_id as parent_ids,
                        u.first_name, u.father_name,
                        u.profile_picture as user_avatar,
                        es.enrolled_at
                    FROM enrolled_students es
                    JOIN student_profiles sp ON sp.id = es.student_id
                    JOIN users u ON u.id = sp.user_id
                    WHERE es.tutor_id = %s
                    AND es.status = 'active'
                    ORDER BY es.enrolled_at DESC
                """, (profile_id,))
                enrolled_students = cur.fetchall()
                print(f"[Chat API] Found {len(enrolled_students)} enrolled students for tutor {profile_id}")

                for student in enrolled_students:
                    # Add student if not already in list
                    if student['student_user_id'] not in existing_user_ids:
                        display_name = student['student_username'] or f"{student['first_name']} {student['father_name']}"
                        avatar = student['student_avatar'] or student['user_avatar']
                        enrolled_at = student['enrolled_at']
                        if enrolled_at and hasattr(enrolled_at, 'isoformat'):
                            enrolled_at = enrolled_at.isoformat()

                        # Get last_seen info for this student
                        last_seen_info = get_user_last_seen_info(
                            conn, student['student_id'], "student",
                            profile_id, profile_type
                        )

                        result.append({
                            "id": f"enrolled-student-{student['student_id']}",
                            "type": "direct",
                            "display_name": display_name,
                            "avatar": avatar,
                            "other_profile_id": student['student_id'],
                            "other_profile_type": "student",
                            "other_user_id": student['student_user_id'],
                            "last_message": None,
                            "last_message_at": enrolled_at,
                            "unread_count": 0,
                            "is_muted": False,
                            "is_pinned": False,
                            "is_enrolled": True,
                            "relationship": "Enrolled Student",
                            **last_seen_info
                        })
                        existing_user_ids.add(student['student_user_id'])
                        print(f"[Chat API] Added enrolled student: {display_name}")

                    # Add student's parents if they exist
                    if student['parent_ids']:
                        for parent_profile_id in student['parent_ids']:
                            if parent_profile_id:
                                cur.execute("""
                                    SELECT pp.id, pp.user_id, pp.profile_picture, pp.username,
                                           u.first_name, u.father_name, u.profile_picture as user_picture
                                    FROM parent_profiles pp
                                    JOIN users u ON u.id = pp.user_id
                                    WHERE pp.id = %s
                                """, (parent_profile_id,))
                                parent_row = cur.fetchone()

                                if parent_row and parent_row['user_id'] not in existing_user_ids:
                                    parent_name = parent_row['username'] or f"{parent_row['first_name']} {parent_row['father_name']}"
                                    parent_avatar = parent_row['profile_picture'] or parent_row['user_picture']

                                    # Get last_seen info for this parent
                                    parent_last_seen = get_user_last_seen_info(
                                        conn, parent_profile_id, "parent",
                                        profile_id, profile_type
                                    )

                                    result.append({
                                        "id": f"enrolled-parent-{parent_profile_id}",
                                        "type": "direct",
                                        "display_name": parent_name,
                                        "avatar": parent_avatar,
                                        "other_profile_id": parent_profile_id,
                                        "other_profile_type": "parent",
                                        "other_user_id": parent_row['user_id'],
                                        "last_message": None,
                                        "last_message_at": enrolled_at,
                                        "unread_count": 0,
                                        "is_muted": False,
                                        "is_pinned": False,
                                        "is_enrolled": True,
                                        "relationship": "Student's Parent",
                                        **parent_last_seen
                                    })
                                    existing_user_ids.add(parent_row['user_id'])
                                    print(f"[Chat API] Added enrolled student's parent: {parent_name}")

            # For STUDENTS: Add enrolled tutors
            elif profile_type == 'student':
                cur.execute("""
                    SELECT DISTINCT
                        es.tutor_id,
                        tp.user_id as tutor_user_id,
                        tp.profile_picture as tutor_avatar,
                        tp.username as tutor_username,
                        u.first_name, u.father_name,
                        u.profile_picture as user_avatar,
                        es.enrolled_at
                    FROM enrolled_students es
                    JOIN tutor_profiles tp ON tp.id = es.tutor_id
                    JOIN users u ON u.id = tp.user_id
                    WHERE es.student_id = %s
                    AND es.status = 'active'
                    ORDER BY es.enrolled_at DESC
                """, (profile_id,))
                enrolled_tutors = cur.fetchall()
                print(f"[Chat API] Found {len(enrolled_tutors)} enrolled tutors for student {profile_id}")

                for tutor in enrolled_tutors:
                    if tutor['tutor_user_id'] not in existing_user_ids:
                        display_name = tutor['tutor_username'] or f"{tutor['first_name']} {tutor['father_name']}"
                        avatar = tutor['tutor_avatar'] or tutor['user_avatar']
                        enrolled_at = tutor['enrolled_at']
                        if enrolled_at and hasattr(enrolled_at, 'isoformat'):
                            enrolled_at = enrolled_at.isoformat()

                        # Get last_seen info for this tutor
                        tutor_last_seen = get_user_last_seen_info(
                            conn, tutor['tutor_id'], "tutor",
                            profile_id, profile_type
                        )

                        result.append({
                            "id": f"enrolled-tutor-{tutor['tutor_id']}",
                            "type": "direct",
                            "display_name": display_name,
                            "avatar": avatar,
                            "other_profile_id": tutor['tutor_id'],
                            "other_profile_type": "tutor",
                            "other_user_id": tutor['tutor_user_id'],
                            "last_message": None,
                            "last_message_at": enrolled_at,
                            "unread_count": 0,
                            "is_muted": False,
                            "is_pinned": False,
                            "is_enrolled": True,
                            "relationship": "My Tutor",
                            **tutor_last_seen
                        })
                        existing_user_ids.add(tutor['tutor_user_id'])
                        print(f"[Chat API] Added enrolled tutor: {display_name}")

            # For PARENTS: Add tutors their children are enrolled with
            elif profile_type == 'parent':
                # Get children IDs
                cur.execute("""
                    SELECT children_ids FROM parent_profiles WHERE id = %s
                """, (profile_id,))
                parent_row = cur.fetchone()

                if parent_row and parent_row['children_ids']:
                    children_ids = parent_row['children_ids']
                    print(f"[Chat API] Parent {profile_id} has children: {children_ids}")

                    # Get tutors for all children
                    cur.execute("""
                        SELECT DISTINCT
                            es.tutor_id,
                            tp.user_id as tutor_user_id,
                            tp.profile_picture as tutor_avatar,
                            tp.username as tutor_username,
                            u.first_name, u.father_name,
                            u.profile_picture as user_avatar,
                            es.enrolled_at
                        FROM enrolled_students es
                        JOIN tutor_profiles tp ON tp.id = es.tutor_id
                        JOIN users u ON u.id = tp.user_id
                        WHERE es.student_id = ANY(%s)
                        AND es.status = 'active'
                        ORDER BY es.enrolled_at DESC
                    """, (children_ids,))
                    children_tutors = cur.fetchall()
                    print(f"[Chat API] Found {len(children_tutors)} tutors for parent's children")

                    for tutor in children_tutors:
                        if tutor['tutor_user_id'] not in existing_user_ids:
                            display_name = tutor['tutor_username'] or f"{tutor['first_name']} {tutor['father_name']}"
                            avatar = tutor['tutor_avatar'] or tutor['user_avatar']
                            enrolled_at = tutor['enrolled_at']
                            if enrolled_at and hasattr(enrolled_at, 'isoformat'):
                                enrolled_at = enrolled_at.isoformat()

                            # Get last_seen info for this tutor
                            tutor_last_seen = get_user_last_seen_info(
                                conn, tutor['tutor_id'], "tutor",
                                profile_id, profile_type
                            )

                            result.append({
                                "id": f"child-tutor-{tutor['tutor_id']}",
                                "type": "direct",
                                "display_name": display_name,
                                "avatar": avatar,
                                "other_profile_id": tutor['tutor_id'],
                                "other_profile_type": "tutor",
                                "other_user_id": tutor['tutor_user_id'],
                                "last_message": None,
                                "last_message_at": enrolled_at,
                                "unread_count": 0,
                                "is_muted": False,
                                "is_pinned": False,
                                "is_enrolled": True,
                                "relationship": "Child's Tutor",
                                **tutor_last_seen
                            })
                            existing_user_ids.add(tutor['tutor_user_id'])
                            print(f"[Chat API] Added child's tutor: {display_name}")

        # =============================================
        # ADD SESSION REQUESTS FROM requested_sessions TABLE
        # =============================================
        if filter_type in ['all', 'direct', None]:
            # For TUTORS: Add users who have requested sessions
            if profile_type == 'tutor':
                cur.execute("""
                    SELECT DISTINCT
                        rs.requester_id,
                        rs.requester_type,
                        rs.status as request_status,
                        rs.created_at as requested_at,
                        u.first_name, u.father_name, u.profile_picture as user_avatar
                    FROM requested_sessions rs
                    JOIN users u ON u.id = rs.requester_id
                    WHERE rs.tutor_id = %s
                    ORDER BY rs.created_at DESC
                """, (profile_id,))
                session_requests = cur.fetchall()
                print(f"[Chat API] Found {len(session_requests)} session requests for tutor {profile_id}")

                for req in session_requests:
                    if req['requester_id'] not in existing_user_ids:
                        display_name = f"{req['first_name']} {req['father_name']}"
                        avatar = req['user_avatar']
                        requested_at = req['requested_at']
                        if requested_at and hasattr(requested_at, 'isoformat'):
                            requested_at = requested_at.isoformat()

                        # Get requester's profile info
                        requester_profile_id = None
                        if req['requester_type'] == 'student':
                            cur.execute("SELECT id, profile_picture, username FROM student_profiles WHERE user_id = %s", (req['requester_id'],))
                            profile_row = cur.fetchone()
                            if profile_row:
                                requester_profile_id = profile_row['id']
                                if profile_row['username']:
                                    display_name = profile_row['username']
                                if profile_row['profile_picture']:
                                    avatar = profile_row['profile_picture']
                        elif req['requester_type'] == 'parent':
                            cur.execute("SELECT id, profile_picture, username FROM parent_profiles WHERE user_id = %s", (req['requester_id'],))
                            profile_row = cur.fetchone()
                            if profile_row:
                                requester_profile_id = profile_row['id']
                                if profile_row['username']:
                                    display_name = profile_row['username']
                                if profile_row['profile_picture']:
                                    avatar = profile_row['profile_picture']

                        status_label = "Session Request"
                        if req['request_status'] == 'pending':
                            status_label = "Pending Request"
                        elif req['request_status'] == 'accepted':
                            status_label = "Accepted Request"

                        # Get last_seen info for this requester
                        req_last_seen = {}
                        if requester_profile_id:
                            req_last_seen = get_user_last_seen_info(
                                conn, requester_profile_id, req['requester_type'],
                                profile_id, profile_type
                            )

                        result.append({
                            "id": f"session-request-{req['requester_id']}-{req['requester_type']}",
                            "type": "direct",
                            "display_name": display_name,
                            "avatar": avatar,
                            "other_profile_id": requester_profile_id,
                            "other_profile_type": req['requester_type'],
                            "other_user_id": req['requester_id'],
                            "last_message": None,
                            "last_message_at": requested_at,
                            "unread_count": 0,
                            "is_muted": False,
                            "is_pinned": False,
                            "is_session_request": True,
                            "request_status": req['request_status'],
                            "relationship": status_label,
                            **req_last_seen
                        })
                        existing_user_ids.add(req['requester_id'])
                        print(f"[Chat API] Added session requester: {display_name} ({req['requester_type']})")

            # For STUDENTS and PARENTS: Add tutors they have requested sessions from
            elif profile_type in ['student', 'parent']:
                cur.execute("""
                    SELECT DISTINCT
                        rs.tutor_id,
                        rs.status as request_status,
                        rs.created_at as requested_at,
                        tp.user_id as tutor_user_id,
                        tp.profile_picture as tutor_avatar,
                        tp.username as tutor_username,
                        u.first_name, u.father_name,
                        u.profile_picture as user_avatar
                    FROM requested_sessions rs
                    JOIN tutor_profiles tp ON tp.id = rs.tutor_id
                    JOIN users u ON u.id = tp.user_id
                    WHERE rs.requester_id = %s
                    AND rs.requester_type = %s
                    ORDER BY rs.created_at DESC
                """, (user_id, profile_type))
                my_requests = cur.fetchall()
                print(f"[Chat API] Found {len(my_requests)} session requests by {profile_type} {profile_id}")

                for req in my_requests:
                    if req['tutor_user_id'] not in existing_user_ids:
                        display_name = req['tutor_username'] or f"{req['first_name']} {req['father_name']}"
                        avatar = req['tutor_avatar'] or req['user_avatar']
                        requested_at = req['requested_at']
                        if requested_at and hasattr(requested_at, 'isoformat'):
                            requested_at = requested_at.isoformat()

                        status_label = "Requested Tutor"
                        if req['request_status'] == 'pending':
                            status_label = "Pending Request"
                        elif req['request_status'] == 'accepted':
                            status_label = "Accepted Request"

                        # Get last_seen info for this tutor
                        tutor_last_seen = get_user_last_seen_info(
                            conn, req['tutor_id'], "tutor",
                            profile_id, profile_type
                        )

                        result.append({
                            "id": f"my-request-tutor-{req['tutor_id']}",
                            "type": "direct",
                            "display_name": display_name,
                            "avatar": avatar,
                            "other_profile_id": req['tutor_id'],
                            "other_profile_type": "tutor",
                            "other_user_id": req['tutor_user_id'],
                            "last_message": None,
                            "last_message_at": requested_at,
                            "unread_count": 0,
                            "is_muted": False,
                            "is_pinned": False,
                            "is_session_request": True,
                            "request_status": req['request_status'],
                            "relationship": status_label,
                            **tutor_last_seen
                        })
                        existing_user_ids.add(req['tutor_user_id'])
                        print(f"[Chat API] Added requested tutor: {display_name}")

        # =============================================
        # ADD PARENT INVITATIONS (co-parent invitations)
        # =============================================
        if filter_type in ['all', 'direct', None]:
            # For ALL USERS: Show parent invitations they've sent or received
            # Invitations SENT by this user
            cur.execute("""
                SELECT
                    pi.id as invitation_id,
                    pi.inviter_user_id,
                    pi.inviter_type,
                    pi.invited_to_user_id,
                    pi.relationship_type,
                    pi.requested_as,
                    pi.status,
                    pi.created_at,
                    pi.pending_first_name,
                    pi.pending_father_name,
                    pi.pending_email,
                    u.first_name, u.father_name, u.profile_picture
                FROM parent_invitations pi
                LEFT JOIN users u ON u.id = pi.invited_to_user_id
                WHERE pi.inviter_user_id = %s
                ORDER BY pi.created_at DESC
            """, (user_id,))
            sent_invitations = cur.fetchall()
            print(f"[Chat API] Found {len(sent_invitations)} parent invitations sent by user {user_id}")

            for inv in sent_invitations:
                invited_user_id = inv['invited_to_user_id']
                # Always show PENDING invitations, or new users not in existing conversations
                should_add = inv['status'] == 'pending' or (invited_user_id and invited_user_id not in existing_user_ids)
                if invited_user_id and should_add:
                    display_name = f"{inv['first_name']} {inv['father_name']}" if inv['first_name'] else f"{inv['pending_first_name']} {inv['pending_father_name']}"
                    avatar = inv['profile_picture']
                    created_at = inv['created_at']
                    if created_at and hasattr(created_at, 'isoformat'):
                        created_at = created_at.isoformat()

                    # Get invited user's parent profile
                    invited_profile_id = None
                    cur.execute("SELECT id, profile_picture, username FROM parent_profiles WHERE user_id = %s", (invited_user_id,))
                    profile_row = cur.fetchone()
                    if profile_row:
                        invited_profile_id = profile_row['id']
                        if profile_row['username']:
                            display_name = profile_row['username']
                        if profile_row['profile_picture']:
                            avatar = profile_row['profile_picture']

                    status_label = f"{inv['requested_as'].title()} Invitation Sent"
                    if inv['status'] == 'pending':
                        status_label = f"Pending {inv['requested_as'].title()} Invitation"
                    elif inv['status'] == 'accepted':
                        status_label = f"Accepted {inv['requested_as'].title()}"

                    # Get last_seen info
                    inv_last_seen = {}
                    if invited_profile_id:
                        inv_last_seen = get_user_last_seen_info(
                            conn, invited_profile_id, "parent",
                            profile_id, profile_type
                        )

                    result.append({
                        "id": f"parent-invitation-sent-{inv['invitation_id']}",
                        "type": "direct",
                        "display_name": display_name,
                        "avatar": avatar,
                        "other_profile_id": invited_profile_id,
                        "other_profile_type": "parent",
                        "other_user_id": invited_user_id,
                        "last_message": None,
                        "last_message_at": created_at,
                        "unread_count": 0,
                        "is_muted": False,
                        "is_pinned": False,
                        "is_parent_invitation": True,
                        "invitation_direction": "sent",
                        "request_status": inv['status'],
                        "relationship": status_label,
                        "relationship_type": inv['relationship_type'],
                        **inv_last_seen
                    })
                    existing_user_ids.add(invited_user_id)
                    print(f"[Chat API] Added sent parent invitation: {display_name}")
                elif not invited_user_id and inv['pending_email']:
                    # Invitation to a new user (not yet registered)
                    display_name = f"{inv['pending_first_name']} {inv['pending_father_name']}"
                    status_label = f"Pending {inv['requested_as'].title()} Invitation (New User)"

                    result.append({
                        "id": f"parent-invitation-pending-{inv['invitation_id']}",
                        "type": "direct",
                        "display_name": display_name,
                        "avatar": None,
                        "other_profile_id": None,
                        "other_profile_type": "parent",
                        "other_user_id": None,
                        "last_message": None,
                        "last_message_at": inv['created_at'].isoformat() if inv['created_at'] else None,
                        "unread_count": 0,
                        "is_muted": False,
                        "is_pinned": False,
                        "is_parent_invitation": True,
                        "invitation_direction": "sent",
                        "request_status": "pending",
                        "relationship": status_label,
                        "relationship_type": inv['relationship_type'],
                        "pending_email": inv['pending_email']
                    })
                    print(f"[Chat API] Added pending parent invitation to new user: {display_name}")

            # Invitations RECEIVED by this user
            cur.execute("""
                SELECT
                    pi.id as invitation_id,
                    pi.inviter_user_id,
                    pi.inviter_type,
                    pi.relationship_type,
                    pi.requested_as,
                    pi.status,
                    pi.created_at,
                    u.first_name, u.father_name, u.profile_picture
                FROM parent_invitations pi
                JOIN users u ON u.id = pi.inviter_user_id
                WHERE pi.invited_to_user_id = %s
                ORDER BY pi.created_at DESC
            """, (user_id,))
            received_invitations = cur.fetchall()
            print(f"[Chat API] Found {len(received_invitations)} parent invitations received by user {user_id}")

            for inv in received_invitations:
                inviter_user_id = inv['inviter_user_id']
                # Always show PENDING invitations, or new users not in existing conversations
                should_add = inv['status'] == 'pending' or inviter_user_id not in existing_user_ids
                if should_add:
                    display_name = f"{inv['first_name']} {inv['father_name']}"
                    avatar = inv['profile_picture']
                    created_at = inv['created_at']
                    if created_at and hasattr(created_at, 'isoformat'):
                        created_at = created_at.isoformat()

                    # Get inviter's parent profile
                    inviter_profile_id = None
                    cur.execute("SELECT id, profile_picture, username FROM parent_profiles WHERE user_id = %s", (inviter_user_id,))
                    profile_row = cur.fetchone()
                    if profile_row:
                        inviter_profile_id = profile_row['id']
                        if profile_row['username']:
                            display_name = profile_row['username']
                        if profile_row['profile_picture']:
                            avatar = profile_row['profile_picture']

                    status_label = f"{inv['requested_as'].title()} Invitation Received"
                    if inv['status'] == 'pending':
                        status_label = f"Pending {inv['requested_as'].title()} Request"
                    elif inv['status'] == 'accepted':
                        status_label = f"Accepted {inv['requested_as'].title()}"

                    # Get last_seen info
                    inv_last_seen = {}
                    if inviter_profile_id:
                        inv_last_seen = get_user_last_seen_info(
                            conn, inviter_profile_id, "parent",
                            profile_id, profile_type
                        )

                    result.append({
                        "id": f"parent-invitation-received-{inv['invitation_id']}",
                        "type": "direct",
                        "display_name": display_name,
                        "avatar": avatar,
                        "other_profile_id": inviter_profile_id,
                        "other_profile_type": "parent",
                        "other_user_id": inviter_user_id,
                        "last_message": None,
                        "last_message_at": created_at,
                        "unread_count": 0,
                        "is_muted": False,
                        "is_pinned": False,
                        "is_parent_invitation": True,
                        "invitation_direction": "received",
                        "request_status": inv['status'],
                        "relationship": status_label,
                        "relationship_type": inv['relationship_type'],
                        **inv_last_seen
                    })
                    existing_user_ids.add(inviter_user_id)
                    print(f"[Chat API] Added received parent invitation from: {display_name}")

        # =============================================
        # ADD CHILD INVITATIONS (parent-child invitations)
        # =============================================
        if filter_type in ['all', 'direct', None]:
            # Invitations SENT by this user (parent inviting child)
            cur.execute("""
                SELECT
                    ci.id as invitation_id,
                    ci.inviter_user_id,
                    ci.inviter_type,
                    ci.invited_to_user_id,
                    ci.relationship_type,
                    ci.status,
                    ci.created_at,
                    ci.pending_first_name,
                    ci.pending_father_name,
                    ci.pending_email,
                    u.first_name, u.father_name, u.profile_picture
                FROM child_invitations ci
                LEFT JOIN users u ON u.id = ci.invited_to_user_id
                WHERE ci.inviter_user_id = %s
                ORDER BY ci.created_at DESC
            """, (user_id,))
            sent_child_invitations = cur.fetchall()
            print(f"[Chat API] Found {len(sent_child_invitations)} child invitations sent by user {user_id}")

            for inv in sent_child_invitations:
                invited_user_id = inv['invited_to_user_id']
                # Always show PENDING invitations, or new users not in existing conversations
                should_add = inv['status'] == 'pending' or (invited_user_id and invited_user_id not in existing_user_ids)
                if invited_user_id and should_add:
                    display_name = f"{inv['first_name']} {inv['father_name']}" if inv['first_name'] else f"{inv['pending_first_name']} {inv['pending_father_name']}"
                    avatar = inv['profile_picture']
                    created_at = inv['created_at']
                    if created_at and hasattr(created_at, 'isoformat'):
                        created_at = created_at.isoformat()

                    # Get invited user's student profile
                    invited_profile_id = None
                    cur.execute("SELECT id, profile_picture, username FROM student_profiles WHERE user_id = %s", (invited_user_id,))
                    profile_row = cur.fetchone()
                    if profile_row:
                        invited_profile_id = profile_row['id']
                        if profile_row['username']:
                            display_name = profile_row['username']
                        if profile_row['profile_picture']:
                            avatar = profile_row['profile_picture']

                    status_label = "Child Invitation Sent"
                    if inv['status'] == 'pending':
                        status_label = "Pending Child Invitation"
                    elif inv['status'] == 'accepted':
                        status_label = "Accepted Child"

                    # Get last_seen info
                    inv_last_seen = {}
                    if invited_profile_id:
                        inv_last_seen = get_user_last_seen_info(
                            conn, invited_profile_id, "student",
                            profile_id, profile_type
                        )

                    result.append({
                        "id": f"child-invitation-sent-{inv['invitation_id']}",
                        "type": "direct",
                        "display_name": display_name,
                        "avatar": avatar,
                        "other_profile_id": invited_profile_id,
                        "other_profile_type": "student",
                        "other_user_id": invited_user_id,
                        "last_message": None,
                        "last_message_at": created_at,
                        "unread_count": 0,
                        "is_muted": False,
                        "is_pinned": False,
                        "is_child_invitation": True,
                        "invitation_direction": "sent",
                        "request_status": inv['status'],
                        "relationship": status_label,
                        "relationship_type": inv['relationship_type'],
                        **inv_last_seen
                    })
                    existing_user_ids.add(invited_user_id)
                    print(f"[Chat API] Added sent child invitation: {display_name}")

            # Invitations RECEIVED by this user (child receiving parent invitation)
            cur.execute("""
                SELECT
                    ci.id as invitation_id,
                    ci.inviter_user_id,
                    ci.inviter_type,
                    ci.relationship_type,
                    ci.status,
                    ci.created_at,
                    u.first_name, u.father_name, u.profile_picture
                FROM child_invitations ci
                JOIN users u ON u.id = ci.inviter_user_id
                WHERE ci.invited_to_user_id = %s
                ORDER BY ci.created_at DESC
            """, (user_id,))
            received_child_invitations = cur.fetchall()
            print(f"[Chat API] Found {len(received_child_invitations)} child invitations received by user {user_id}")

            for inv in received_child_invitations:
                inviter_user_id = inv['inviter_user_id']
                # Always show PENDING invitations, or new users not in existing conversations
                should_add = inv['status'] == 'pending' or inviter_user_id not in existing_user_ids
                if should_add:
                    display_name = f"{inv['first_name']} {inv['father_name']}"
                    avatar = inv['profile_picture']
                    created_at = inv['created_at']
                    if created_at and hasattr(created_at, 'isoformat'):
                        created_at = created_at.isoformat()

                    # Get inviter's parent profile
                    inviter_profile_id = None
                    cur.execute("SELECT id, profile_picture, username FROM parent_profiles WHERE user_id = %s", (inviter_user_id,))
                    profile_row = cur.fetchone()
                    if profile_row:
                        inviter_profile_id = profile_row['id']
                        if profile_row['username']:
                            display_name = profile_row['username']
                        if profile_row['profile_picture']:
                            avatar = profile_row['profile_picture']

                    status_label = "Parent Invitation Received"
                    if inv['status'] == 'pending':
                        status_label = "Pending Parent Request"
                    elif inv['status'] == 'accepted':
                        status_label = "Accepted Parent"

                    # Get last_seen info
                    inv_last_seen = {}
                    if inviter_profile_id:
                        inv_last_seen = get_user_last_seen_info(
                            conn, inviter_profile_id, "parent",
                            profile_id, profile_type
                        )

                    result.append({
                        "id": f"child-invitation-received-{inv['invitation_id']}",
                        "type": "direct",
                        "display_name": display_name,
                        "avatar": avatar,
                        "other_profile_id": inviter_profile_id,
                        "other_profile_type": "parent",
                        "other_user_id": inviter_user_id,
                        "last_message": None,
                        "last_message_at": created_at,
                        "unread_count": 0,
                        "is_muted": False,
                        "is_pinned": False,
                        "is_child_invitation": True,
                        "invitation_direction": "received",
                        "request_status": inv['status'],
                        "relationship": status_label,
                        "relationship_type": inv['relationship_type'],
                        **inv_last_seen
                    })
                    existing_user_ids.add(inviter_user_id)
                    print(f"[Chat API] Added received child invitation from: {display_name}")

        print(f"[Chat API] Returning {len(result)} conversations/connections for profile_id={profile_id}")
        return {"conversations": result}

    except Exception as e:
        print(f"[Chat API] ERROR in /conversations: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.post("/conversations")
async def create_conversation(request: CreateConversationRequest, profile_id: int, profile_type: str, user_id: int):
    """Create a new conversation (direct or group)"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # For direct chats, check if conversation already exists
        if request.type == 'direct' and len(request.participants) == 1:
            other = request.participants[0]

            # Prevent self-messaging (same profile_id and profile_type)
            if other.profile_id == profile_id and other.profile_type == profile_type:
                raise HTTPException(status_code=400, detail="You cannot start a conversation with yourself")

            # Also prevent self-messaging by user_id (same user, different roles)
            if other.user_id == user_id:
                raise HTTPException(status_code=400, detail="You cannot start a conversation with yourself")

            # Check if the recipient allows messages from this user (privacy setting)
            can_message, reason = check_can_message(conn, profile_id, profile_type, other.profile_id, other.profile_type)
            if not can_message:
                raise HTTPException(status_code=403, detail=reason)

            cur.execute("""
                SELECT c.id
                FROM conversations c
                JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
                    AND cp1.profile_id = %s AND cp1.profile_type = %s
                JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
                    AND cp2.profile_id = %s AND cp2.profile_type = %s
                WHERE c.type = 'direct'
            """, (profile_id, profile_type, other.profile_id, other.profile_type))
            existing = cur.fetchone()

            if existing:
                return {"conversation_id": existing['id'], "existing": True}

        # Create conversation
        cur.execute("""
            INSERT INTO conversations (type, name, description, created_by_profile_id, created_by_profile_type)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (request.type, request.name, request.description, profile_id, profile_type))
        conv_id = cur.fetchone()['id']

        # Add creator as participant (admin for groups and channels)
        role = 'admin' if request.type in ('group', 'channel') else 'member'
        cur.execute("""
            INSERT INTO conversation_participants
            (conversation_id, profile_id, profile_type, user_id, role)
            VALUES (%s, %s, %s, %s, %s)
        """, (conv_id, profile_id, profile_type, user_id, role))

        # Add other participants (with privacy checks for groups/channels)
        added_participants = []
        rejected_participants = []
        for participant in request.participants:
            # Check privacy settings for groups and channels
            if request.type == 'group':
                can_add, reason = check_can_add_to_group(
                    conn, profile_id, profile_type,
                    participant.profile_id, participant.profile_type
                )
                if not can_add:
                    rejected_participants.append({
                        "profile_id": participant.profile_id,
                        "profile_type": participant.profile_type,
                        "reason": reason
                    })
                    continue
            elif request.type == 'channel':
                can_add, reason = check_can_add_to_channel(
                    conn, profile_id, profile_type,
                    participant.profile_id, participant.profile_type
                )
                if not can_add:
                    rejected_participants.append({
                        "profile_id": participant.profile_id,
                        "profile_type": participant.profile_type,
                        "reason": reason
                    })
                    continue

            cur.execute("""
                INSERT INTO conversation_participants
                (conversation_id, profile_id, profile_type, user_id, role)
                VALUES (%s, %s, %s, %s, 'member')
                ON CONFLICT (conversation_id, profile_id, profile_type) DO NOTHING
            """, (conv_id, participant.profile_id, participant.profile_type, participant.user_id))
            added_participants.append({
                "profile_id": participant.profile_id,
                "profile_type": participant.profile_type
            })

        conn.commit()
        return {
            "conversation_id": conv_id,
            "existing": False,
            "added_participants": added_participants,
            "rejected_participants": rejected_participants
        }

    except HTTPException:
        # Re-raise HTTPExceptions (like self-messaging error) without wrapping
        cur.close()
        conn.close()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.get("/conversations/{conversation_id}")
async def get_conversation_details(
    conversation_id: int,
    profile_id: int,
    profile_type: str
):
    """Get detailed information about a conversation"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify user is participant
        cur.execute("""
            SELECT * FROM conversation_participants
            WHERE conversation_id = %s AND profile_id = %s AND profile_type = %s AND is_active = TRUE
        """, (conversation_id, profile_id, profile_type))

        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Not a participant of this conversation")

        # Get conversation details
        cur.execute("""
            SELECT * FROM conversations WHERE id = %s
        """, (conversation_id,))
        conv = cur.fetchone()

        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conv_dict = dict(conv)

        # Get participants
        cur.execute("""
            SELECT
                cp.profile_id,
                cp.profile_type,
                cp.user_id,
                cp.role,
                cp.joined_at,
                cp.is_muted
            FROM conversation_participants cp
            WHERE cp.conversation_id = %s AND cp.is_active = TRUE
        """, (conversation_id,))
        participants = cur.fetchall()

        participants_info = []
        for p in participants:
            user_info = get_user_display_info(conn, p['user_id'], p['profile_type'], p['profile_id'])
            participants_info.append({
                "profile_id": p['profile_id'],
                "profile_type": p['profile_type'],
                "user_id": p['user_id'],
                "role": p['role'],
                "joined_at": p['joined_at'].isoformat() if p['joined_at'] else None,
                "display_name": user_info['name'],
                "avatar": user_info['avatar']
            })

        conv_dict['participants'] = participants_info

        # Get pinned messages
        cur.execute("""
            SELECT m.*, u.first_name, u.father_name
            FROM chat_messages m
            JOIN users u ON u.id = m.sender_user_id
            WHERE m.conversation_id = %s AND m.is_pinned = TRUE AND m.is_deleted = FALSE
            ORDER BY m.pinned_at DESC
        """, (conversation_id,))
        pinned_messages = []
        for msg in cur.fetchall():
            msg_dict = dict(msg)
            # Decrypt message content for pinned messages
            if msg_dict.get('content'):
                msg_dict['content'] = decrypt_message(msg_dict['content'])
            pinned_messages.append(msg_dict)
        conv_dict['pinned_messages'] = pinned_messages

        # Get shared media count
        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE message_type = 'image') as images,
                COUNT(*) FILTER (WHERE message_type IN ('file', 'video', 'audio')) as files
            FROM chat_messages
            WHERE conversation_id = %s AND is_deleted = FALSE
        """, (conversation_id,))
        media_counts = cur.fetchone()
        conv_dict['shared_media'] = dict(media_counts)

        return conv_dict

    finally:
        cur.close()
        conn.close()


# =============================================
# MESSAGES ENDPOINTS
# =============================================

@router.get("/messages/{conversation_id}")
async def get_messages(
    conversation_id: int,
    profile_id: int,
    profile_type: str,
    user_id: int,
    before_id: Optional[int] = None,
    after: Optional[str] = None,
    limit: int = Query(50, le=10000)
):
    """Get messages for a conversation"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify user is participant and get chat_cleared_at
        cur.execute("""
            SELECT chat_cleared_at FROM conversation_participants
            WHERE conversation_id = %s AND profile_id = %s AND profile_type = %s AND is_active = TRUE
        """, (conversation_id, profile_id, profile_type))

        participant = cur.fetchone()
        if not participant:
            raise HTTPException(status_code=403, detail="Not a participant of this conversation")

        # Get other participants' last_read_at to determine read status for sent messages
        # IMPORTANT: Only include participants who have read_receipts enabled in their privacy settings
        cur.execute("""
            SELECT cp.profile_id, cp.profile_type, cp.last_read_at
            FROM conversation_participants cp
            WHERE cp.conversation_id = %s AND cp.is_active = TRUE
            AND NOT (cp.profile_id = %s AND cp.profile_type = %s)
        """, (conversation_id, profile_id, profile_type))
        other_participants = cur.fetchall()

        # Get the minimum last_read_at only from participants who have read_receipts enabled
        other_last_read = None
        if other_participants:
            read_times = []
            for p in other_participants:
                if p['last_read_at']:
                    # Check if this participant has read_receipts enabled
                    if should_show_read_receipts(conn, p['profile_id'], p['profile_type']):
                        read_times.append(p['last_read_at'])
            if read_times:
                other_last_read = min(read_times)

        chat_cleared_at = participant.get('chat_cleared_at')

        query = """
            SELECT
                m.*,
                u.first_name,
                u.father_name,
                u.profile_picture as user_avatar
            FROM chat_messages m
            JOIN users u ON u.id = m.sender_user_id
            WHERE m.conversation_id = %s
            AND m.is_deleted = FALSE
            AND NOT (COALESCE(m.deleted_for_user_ids, '[]'::jsonb) @> %s::jsonb)
        """
        params = [conversation_id, json.dumps([user_id])]

        # Only show messages after chat was cleared (if cleared)
        if chat_cleared_at:
            query += " AND m.created_at > %s"
            params.append(chat_cleared_at)

        if before_id:
            query += " AND m.id < %s"
            params.append(before_id)

        # Filter messages after a specific timestamp (for polling new messages)
        if after:
            try:
                after_dt = datetime.fromisoformat(after.replace('Z', '+00:00'))
                query += " AND m.created_at > %s"
                params.append(after_dt)
            except (ValueError, TypeError):
                pass  # Invalid timestamp, ignore filter

        query += " ORDER BY m.created_at DESC LIMIT %s"
        params.append(limit)

        cur.execute(query, params)
        messages = cur.fetchall()

        result = []
        for msg in messages:
            msg_dict = dict(msg)

            # Decrypt message content
            if msg_dict.get('content'):
                msg_dict['content'] = decrypt_message(msg_dict['content'])

            # Get sender display info
            sender_info = get_user_display_info(
                conn, msg['sender_user_id'], msg['sender_profile_type'], msg['sender_profile_id']
            )
            msg_dict['sender_name'] = sender_info['name']
            msg_dict['sender_avatar'] = sender_info['avatar']
            msg_dict['is_mine'] = (msg['sender_profile_id'] == profile_id and
                                   msg['sender_profile_type'] == profile_type)

            # Determine read status for sent messages
            if msg_dict['is_mine']:
                if other_last_read and msg['created_at'] <= other_last_read:
                    msg_dict['status'] = 'read'
                else:
                    msg_dict['status'] = 'sent'
            else:
                msg_dict['status'] = None  # Received messages don't need status

            # Get reactions
            cur.execute("""
                SELECT reaction, COUNT(*) as count,
                    array_agg(profile_id) as profile_ids
                FROM message_reactions
                WHERE message_id = %s
                GROUP BY reaction
            """, (msg['id'],))
            msg_dict['reactions'] = [dict(r) for r in cur.fetchall()]

            # Get reply info if exists
            if msg['reply_to_id']:
                cur.execute("""
                    SELECT m.content, m.message_type, u.first_name, u.father_name
                    FROM chat_messages m
                    JOIN users u ON u.id = m.sender_user_id
                    WHERE m.id = %s
                """, (msg['reply_to_id'],))
                reply = cur.fetchone()
                if reply:
                    # Decrypt reply content as well
                    reply_content = decrypt_message(reply['content']) if reply['content'] else None
                    msg_dict['reply_to'] = {
                        "content": reply_content,
                        "type": reply['message_type'],
                        "sender_name": f"{reply['first_name']} {reply['father_name']}"
                    }

            # Add forwarded message info (rename columns for frontend consistency)
            if msg.get('is_forwarded'):
                msg_dict['is_forwarded'] = True
                msg_dict['forwarded_from'] = msg.get('forwarded_from_name')
                msg_dict['forwarded_from_avatar'] = msg.get('forwarded_from_avatar')
                msg_dict['forwarded_from_profile_id'] = msg.get('forwarded_from_profile_id')
                msg_dict['forwarded_from_profile_type'] = msg.get('forwarded_from_profile_type')
                # Forwarder info is already in sender_name/sender_avatar (the person who sent/forwarded the message)

            # For session_request messages, fetch package details
            if msg['message_type'] == 'session_request' and msg_dict.get('media_metadata'):
                metadata = msg_dict['media_metadata']
                if isinstance(metadata, str):
                    metadata = json.loads(metadata)

                package_id = metadata.get('package_id')
                session_request_id = metadata.get('session_request_id')

                if package_id:
                    # Fetch package details with course names
                    cur.execute("""
                        SELECT
                            tp.id, tp.name, tp.description, tp.hourly_rate,
                            tp.days_per_week, tp.hours_per_day, tp.payment_frequency,
                            tp.discount_3_month, tp.discount_6_month, tp.yearly_discount,
                            tp.session_format, tp.grade_level, tp.schedule_type,
                            tp.start_time, tp.end_time, tp.schedule_days, tp.course_ids,
                            t.id as tutor_profile_id,
                            u.first_name as tutor_first_name,
                            u.father_name as tutor_father_name,
                            u.profile_picture as tutor_avatar
                        FROM tutor_packages tp
                        JOIN tutor_profiles t ON tp.tutor_id = t.id
                        JOIN users u ON t.user_id = u.id
                        WHERE tp.id = %s
                    """, (package_id,))
                    package = cur.fetchone()

                    if package:
                        # Fetch course names for the course_ids
                        courses = []
                        course_ids = package.get('course_ids') or []
                        if course_ids:
                            cur.execute("""
                                SELECT id, course_name FROM courses WHERE id = ANY(%s)
                            """, (course_ids,))
                            courses = [{"id": c['id'], "name": c['course_name']} for c in cur.fetchall()]

                        # Parse schedule_days (stored as JSON string or comma-separated)
                        schedule_days = package.get('schedule_days') or ''
                        if schedule_days:
                            try:
                                schedule_days = json.loads(schedule_days) if schedule_days.startswith('[') else schedule_days.split(',')
                            except:
                                schedule_days = [schedule_days] if schedule_days else []
                        else:
                            schedule_days = []

                        msg_dict['package_details'] = {
                            "id": package['id'],
                            "name": package['name'],
                            "description": package['description'],
                            "hourly_rate": float(package['hourly_rate']) if package['hourly_rate'] else 0,
                            "days_per_week": package['days_per_week'],
                            "hours_per_day": float(package['hours_per_day']) if package['hours_per_day'] else 0,
                            "payment_frequency": package['payment_frequency'],
                            "discount_3_month": float(package['discount_3_month']) if package['discount_3_month'] else 0,
                            "discount_6_month": float(package['discount_6_month']) if package['discount_6_month'] else 0,
                            "yearly_discount": float(package['yearly_discount']) if package['yearly_discount'] else 0,
                            "session_format": package['session_format'],
                            "grade_level": package['grade_level'],
                            "schedule_type": package['schedule_type'],
                            "schedule_days": schedule_days,
                            "start_time": str(package['start_time']) if package['start_time'] else None,
                            "end_time": str(package['end_time']) if package['end_time'] else None,
                            "courses": courses,
                            "tutor": {
                                "id": package['tutor_profile_id'],
                                "name": f"{package['tutor_first_name']} {package['tutor_father_name']}",
                                "avatar": package['tutor_avatar']
                            }
                        }

                if session_request_id:
                    # Fetch current session request status and requested_to (student) info
                    cur.execute("""
                        SELECT
                            rs.status, rs.responded_at, rs.rejected_reason,
                            rs.requested_to_id,
                            CONCAT(u.first_name, ' ', u.father_name) as requested_to_name,
                            u.profile_picture as requested_to_avatar
                        FROM requested_sessions rs
                        LEFT JOIN student_profiles sp ON rs.requested_to_id = sp.id
                        LEFT JOIN users u ON sp.user_id = u.id
                        WHERE rs.id = %s
                    """, (session_request_id,))
                    session_req = cur.fetchone()
                    if session_req:
                        msg_dict['session_request_status'] = {
                            "status": session_req['status'],
                            "responded_at": session_req['responded_at'].isoformat() if session_req['responded_at'] else None,
                            "rejected_reason": session_req['rejected_reason']
                        }
                        # Add requested_to (student) info to the message
                        msg_dict['requested_to_id'] = session_req['requested_to_id']
                        msg_dict['requested_to_name'] = session_req['requested_to_name']
                        msg_dict['requested_to_avatar'] = session_req['requested_to_avatar']

            result.append(msg_dict)

        # Update last read
        cur.execute("""
            UPDATE conversation_participants
            SET last_read_at = CURRENT_TIMESTAMP,
                last_read_message_id = (
                    SELECT MAX(id) FROM chat_messages WHERE conversation_id = %s
                )
            WHERE conversation_id = %s AND profile_id = %s AND profile_type = %s
        """, (conversation_id, conversation_id, profile_id, profile_type))
        conn.commit()

        # Get total message count for this conversation (respecting deleted and cleared filters)
        count_query = """
            SELECT COUNT(*) as total
            FROM chat_messages m
            WHERE m.conversation_id = %s
            AND m.is_deleted = FALSE
            AND NOT (COALESCE(m.deleted_for_user_ids, '[]'::jsonb) @> %s::jsonb)
        """
        count_params = [conversation_id, json.dumps([user_id])]

        if chat_cleared_at:
            count_query += " AND m.created_at > %s"
            count_params.append(chat_cleared_at)

        cur.execute(count_query, count_params)
        total_count = cur.fetchone()['total']

        # Return in chronological order
        result.reverse()

        return {"messages": result, "has_more": len(result) == limit, "total_count": total_count}

    finally:
        cur.close()
        conn.close()


@router.post("/messages")
async def send_message(request: SendMessageRequest, profile_id: int, profile_type: str, user_id: int):
    """Send a message to a conversation (encrypted for security)"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify user is participant
        cur.execute("""
            SELECT * FROM conversation_participants
            WHERE conversation_id = %s AND profile_id = %s AND profile_type = %s AND is_active = TRUE
        """, (request.conversation_id, profile_id, profile_type))

        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Not a participant of this conversation")

        # === PRIVACY ENFORCEMENT: Check if sender can message recipient ===
        # Get conversation type to determine if privacy check is needed
        cur.execute("""
            SELECT type FROM conversations WHERE id = %s
        """, (request.conversation_id,))
        conv = cur.fetchone()

        if conv and conv['type'] == 'direct':
            # For direct conversations, get the other participant
            cur.execute("""
                SELECT profile_id, profile_type FROM conversation_participants
                WHERE conversation_id = %s AND is_active = TRUE
                AND NOT (profile_id = %s AND profile_type = %s)
            """, (request.conversation_id, profile_id, profile_type))
            recipient = cur.fetchone()

            if recipient:
                # Check if sender can message this recipient
                can_message, reason = check_can_message(
                    conn,
                    profile_id, profile_type,
                    recipient['profile_id'], recipient['profile_type']
                )
                if not can_message:
                    raise HTTPException(status_code=403, detail=reason)

        # === PRIVACY ENFORCEMENT: Check if forwarding is allowed ===
        if request.is_forwarded and request.forwarded_from_profile_id:
            # Check if the original sender allows forwarding
            # We need to check the original message sender's settings
            original_sender_settings = get_user_privacy_settings(
                conn,
                request.forwarded_from_profile_id,
                request.forwarded_from_profile_type or 'student'
            )
            if original_sender_settings.get('disable_forwarding', False):
                raise HTTPException(status_code=403, detail="This message cannot be forwarded - sender has disabled forwarding")

        # Encrypt message content before storing
        encrypted_content = encrypt_message(request.content) if request.content else None

        # Insert message with encrypted content (including forwarded message fields)
        # Note: forwarder info is derived from sender_profile_id/type, no need for separate columns
        cur.execute("""
            INSERT INTO chat_messages
            (conversation_id, sender_profile_id, sender_profile_type, sender_user_id,
             message_type, content, media_url, media_metadata, reply_to_id,
             is_forwarded, forwarded_from_name, forwarded_from_avatar,
             forwarded_from_profile_id, forwarded_from_profile_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            request.conversation_id,
            profile_id,
            profile_type,
            user_id,
            request.message_type,
            encrypted_content,
            request.media_url,
            json.dumps(request.media_metadata) if request.media_metadata else None,
            request.reply_to_id,
            request.is_forwarded or False,
            request.forwarded_from,
            request.forwarded_from_avatar,
            request.forwarded_from_profile_id,
            request.forwarded_from_profile_type
        ))
        result = cur.fetchone()
        message_id = result['id']
        created_at = result['created_at']

        # Update conversation last_message_at
        cur.execute("""
            UPDATE conversations
            SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (request.conversation_id,))

        conn.commit()

        # Get sender info for response
        sender_info = get_user_display_info(conn, user_id, profile_type, profile_id)

        # Build response with forwarded info if applicable
        response = {
            "message_id": message_id,
            "conversation_id": request.conversation_id,
            "content": request.content,
            "message_type": request.message_type,
            "created_at": created_at.isoformat(),
            "sender_name": sender_info['name'],
            "sender_avatar": sender_info['avatar']
        }

        # Add forwarded message fields if this is a forwarded message
        if request.is_forwarded:
            response["is_forwarded"] = True
            response["forwarded_from"] = request.forwarded_from
            response["forwarded_from_avatar"] = request.forwarded_from_avatar
            response["forwarded_from_profile_id"] = request.forwarded_from_profile_id
            response["forwarded_from_profile_type"] = request.forwarded_from_profile_type
            # Forwarder info comes from sender fields (already in response as sender_name/avatar)

        return response

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.put("/messages/{message_id}")
async def edit_message(message_id: int, request: UpdateMessageRequest, profile_id: int, profile_type: str):
    """Edit a message (only by sender, within time limit)"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify ownership
        cur.execute("""
            SELECT * FROM chat_messages
            WHERE id = %s AND sender_profile_id = %s AND sender_profile_type = %s
            AND is_deleted = FALSE
        """, (message_id, profile_id, profile_type))

        msg = cur.fetchone()
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found or not authorized")

        # Encrypt the new content before updating
        encrypted_content = encrypt_message(request.content) if request.content else None

        # Update message (original_content is already encrypted from initial save)
        cur.execute("""
            UPDATE chat_messages
            SET content = %s,
                is_edited = TRUE,
                edited_at = CURRENT_TIMESTAMP,
                original_content = COALESCE(original_content, %s)
            WHERE id = %s
        """, (encrypted_content, msg['content'], message_id))

        conn.commit()
        return {"success": True, "message_id": message_id}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    profile_id: int,
    profile_type: str,
    for_everyone: bool = False
):
    """Delete a message (soft delete)"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify ownership
        cur.execute("""
            SELECT * FROM chat_messages
            WHERE id = %s AND sender_profile_id = %s AND sender_profile_type = %s
        """, (message_id, profile_id, profile_type))

        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Message not found or not authorized")

        cur.execute("""
            UPDATE chat_messages
            SET is_deleted = TRUE,
                deleted_at = CURRENT_TIMESTAMP,
                deleted_for_everyone = %s
            WHERE id = %s
        """, (for_everyone, message_id))

        conn.commit()
        return {"success": True}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# =============================================
# REACTIONS ENDPOINTS
# =============================================

@router.post("/messages/{message_id}/reactions")
async def add_reaction(message_id: int, request: ReactionRequest, profile_id: int, profile_type: str, user_id: int):
    """Add a reaction to a message"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO message_reactions (message_id, profile_id, profile_type, user_id, reaction)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (message_id, profile_id, profile_type, reaction) DO NOTHING
            RETURNING id
        """, (message_id, profile_id, profile_type, user_id, request.reaction))

        conn.commit()
        return {"success": True}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.delete("/messages/{message_id}/reactions/{reaction}")
async def remove_reaction(message_id: int, reaction: str, profile_id: int, profile_type: str):
    """Remove a reaction from a message"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            DELETE FROM message_reactions
            WHERE message_id = %s AND profile_id = %s AND profile_type = %s AND reaction = %s
        """, (message_id, profile_id, profile_type, reaction))

        conn.commit()
        return {"success": True}

    finally:
        cur.close()
        conn.close()


# =============================================
# PIN MESSAGE ENDPOINT
# =============================================

@router.post("/messages/{message_id}/pin")
async def pin_message(message_id: int, profile_id: int, profile_type: str):
    """Pin a message in a conversation"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE chat_messages
            SET is_pinned = TRUE,
                pinned_at = CURRENT_TIMESTAMP,
                pinned_by_profile_id = %s,
                pinned_by_profile_type = %s
            WHERE id = %s
        """, (profile_id, profile_type, message_id))

        conn.commit()
        return {"success": True}

    finally:
        cur.close()
        conn.close()


@router.delete("/messages/{message_id}/pin")
async def unpin_message(message_id: int):
    """Unpin a message"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE chat_messages
            SET is_pinned = FALSE, pinned_at = NULL, pinned_by_profile_id = NULL, pinned_by_profile_type = NULL
            WHERE id = %s
        """, (message_id,))

        conn.commit()
        return {"success": True}

    finally:
        cur.close()
        conn.close()


# =============================================
# GROUP MANAGEMENT ENDPOINTS
# =============================================

@router.post("/groups")
async def create_group(request: CreateGroupRequest, profile_id: int, profile_type: str, user_id: int):
    """Create a new group chat"""
    return await create_conversation(
        CreateConversationRequest(
            type="group",
            name=request.name,
            description=request.description,
            participants=request.participants
        ),
        profile_id, profile_type, user_id
    )


@router.post("/conversations/{conversation_id}/participants")
async def add_participants(conversation_id: int, request: AddParticipantsRequest, profile_id: int, profile_type: str):
    """Add participants to a group chat"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify user is admin
        cur.execute("""
            SELECT role FROM conversation_participants
            WHERE conversation_id = %s AND profile_id = %s AND profile_type = %s AND is_active = TRUE
        """, (conversation_id, profile_id, profile_type))

        participant = cur.fetchone()
        if not participant or participant['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Only admins can add participants")

        # Get conversation type to determine which privacy setting to check
        cur.execute("""
            SELECT type FROM conversations WHERE id = %s
        """, (conversation_id,))
        conv = cur.fetchone()
        conv_type = conv['type'] if conv else 'group'

        added = []
        rejected = []
        for p in request.participants:
            # === PRIVACY ENFORCEMENT: Check if user allows being added ===
            if conv_type == 'channel':
                can_add, reason = check_can_add_to_channel(
                    conn,
                    profile_id, profile_type,
                    p.profile_id, p.profile_type
                )
            else:  # group
                can_add, reason = check_can_add_to_group(
                    conn,
                    profile_id, profile_type,
                    p.profile_id, p.profile_type
                )

            if not can_add:
                rejected.append({"profile_id": p.profile_id, "profile_type": p.profile_type, "reason": reason})
                continue

            cur.execute("""
                INSERT INTO conversation_participants
                (conversation_id, profile_id, profile_type, user_id, role)
                VALUES (%s, %s, %s, %s, 'member')
                ON CONFLICT (conversation_id, profile_id, profile_type)
                DO UPDATE SET is_active = TRUE, left_at = NULL
                RETURNING id
            """, (conversation_id, p.profile_id, p.profile_type, p.user_id))
            if cur.fetchone():
                added.append(p.dict())

        conn.commit()
        return {"added": added, "rejected": rejected}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.delete("/conversations/{conversation_id}/participants/{participant_profile_id}/{participant_profile_type}")
async def remove_participant(
    conversation_id: int,
    participant_profile_id: int,
    participant_profile_type: str,
    profile_id: int,
    profile_type: str
):
    """Remove a participant from a group chat"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if removing self or if admin
        is_self = (participant_profile_id == profile_id and participant_profile_type == profile_type)

        if not is_self:
            cur.execute("""
                SELECT role FROM conversation_participants
                WHERE conversation_id = %s AND profile_id = %s AND profile_type = %s AND is_active = TRUE
            """, (conversation_id, profile_id, profile_type))

            participant = cur.fetchone()
            if not participant or participant['role'] != 'admin':
                raise HTTPException(status_code=403, detail="Only admins can remove participants")

        cur.execute("""
            UPDATE conversation_participants
            SET is_active = FALSE, left_at = CURRENT_TIMESTAMP
            WHERE conversation_id = %s AND profile_id = %s AND profile_type = %s
        """, (conversation_id, participant_profile_id, participant_profile_type))

        conn.commit()
        return {"success": True}

    finally:
        cur.close()
        conn.close()


@router.put("/conversations/{conversation_id}")
async def update_group(
    conversation_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    avatar_url: Optional[str] = None,
    profile_id: int = None,
    profile_type: str = None
):
    """Update group chat details"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify admin
        cur.execute("""
            SELECT role FROM conversation_participants
            WHERE conversation_id = %s AND profile_id = %s AND profile_type = %s AND is_active = TRUE
        """, (conversation_id, profile_id, profile_type))

        participant = cur.fetchone()
        if not participant or participant['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Only admins can update group")

        updates = []
        params = []

        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if description is not None:
            updates.append("description = %s")
            params.append(description)
        if avatar_url is not None:
            updates.append("avatar_url = %s")
            params.append(avatar_url)

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            query = f"UPDATE conversations SET {', '.join(updates)} WHERE id = %s"
            params.append(conversation_id)
            cur.execute(query, params)

        conn.commit()
        return {"success": True}

    finally:
        cur.close()
        conn.close()


# =============================================
# BLOCKING ENDPOINTS
# =============================================

@router.post("/block")
async def block_contact(request: BlockContactRequest, profile_id: int, profile_type: str, user_id: int):
    """Block a contact"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO blocked_chat_contacts
            (blocker_profile_id, blocker_profile_type, blocker_user_id,
             blocked_profile_id, blocked_profile_type, blocked_user_id, reason)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (
            profile_id, profile_type, user_id,
            request.blocked_profile_id, request.blocked_profile_type,
            request.blocked_user_id, request.reason
        ))

        conn.commit()
        return {"success": True}

    finally:
        cur.close()
        conn.close()


@router.delete("/block/{blocked_profile_id}/{blocked_profile_type}")
async def unblock_contact(blocked_profile_id: int, blocked_profile_type: str, profile_id: int, profile_type: str):
    """Unblock a contact"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            DELETE FROM blocked_chat_contacts
            WHERE blocker_profile_id = %s AND blocker_profile_type = %s
            AND blocked_profile_id = %s AND blocked_profile_type = %s
        """, (profile_id, profile_type, blocked_profile_id, blocked_profile_type))

        conn.commit()
        return {"success": True}

    finally:
        cur.close()
        conn.close()


@router.get("/blocked")
async def get_blocked_contacts(profile_id: int, profile_type: str):
    """Get list of blocked contacts"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                b.*,
                u.first_name,
                u.father_name,
                u.profile_picture
            FROM blocked_chat_contacts b
            JOIN users u ON u.id = b.blocked_user_id
            WHERE b.blocker_profile_id = %s AND b.blocker_profile_type = %s
        """, (profile_id, profile_type))

        return {"blocked": [dict(b) for b in cur.fetchall()]}

    finally:
        cur.close()
        conn.close()


# =============================================
# CALL LOGS ENDPOINTS
# =============================================

@router.post("/calls")
async def log_call(
    conversation_id: int,
    call_type: str,
    profile_id: int,
    profile_type: str,
    user_id: int
):
    """Log a new call"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # === PRIVACY ENFORCEMENT: Check if caller can call recipient ===
        # Get conversation type
        cur.execute("""
            SELECT type FROM conversations WHERE id = %s
        """, (conversation_id,))
        conv = cur.fetchone()

        if conv and conv['type'] == 'direct':
            # For direct conversations, get the other participant
            cur.execute("""
                SELECT profile_id, profile_type FROM conversation_participants
                WHERE conversation_id = %s AND is_active = TRUE
                AND NOT (profile_id = %s AND profile_type = %s)
            """, (conversation_id, profile_id, profile_type))
            recipient = cur.fetchone()

            if recipient:
                # Check if caller can call this recipient
                can_call, reason = check_can_call(
                    conn,
                    profile_id, profile_type,
                    recipient['profile_id'], recipient['profile_type']
                )
                if not can_call:
                    raise HTTPException(status_code=403, detail=reason)

        cur.execute("""
            INSERT INTO call_logs
            (conversation_id, caller_profile_id, caller_profile_type, caller_user_id, call_type)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (conversation_id, profile_id, profile_type, user_id, call_type))

        call_id = cur.fetchone()['id']
        conn.commit()
        return {"call_id": call_id}

    finally:
        cur.close()
        conn.close()


@router.put("/calls/{call_id}")
async def update_call(
    call_id: int,
    status: str,
    duration_seconds: Optional[int] = None
):
    """Update call status"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        updates = ["status = %s"]
        params = [status]

        if status == 'answered':
            updates.append("answered_at = CURRENT_TIMESTAMP")
        elif status in ('ended', 'missed', 'declined', 'failed'):
            updates.append("ended_at = CURRENT_TIMESTAMP")
            if duration_seconds:
                updates.append("duration_seconds = %s")
                params.append(duration_seconds)

        query = f"UPDATE call_logs SET {', '.join(updates)} WHERE id = %s"
        params.append(call_id)
        cur.execute(query, params)

        conn.commit()
        return {"success": True}

    finally:
        cur.close()
        conn.close()


@router.get("/calls")
async def get_call_history(
    profile_id: int,
    profile_type: str,
    limit: int = Query(20, le=50)
):
    """Get call history"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                cl.*,
                c.type as conversation_type,
                c.name as conversation_name
            FROM call_logs cl
            JOIN conversations c ON c.id = cl.conversation_id
            JOIN conversation_participants cp ON cp.conversation_id = c.id
            WHERE cp.profile_id = %s AND cp.profile_type = %s
            ORDER BY cl.started_at DESC
            LIMIT %s
        """, (profile_id, profile_type, limit))

        calls = cur.fetchall()

        result = []
        for call in calls:
            call_dict = dict(call)
            # Get other participant info for direct calls
            if call['conversation_type'] == 'direct':
                cur.execute("""
                    SELECT cp.profile_id, cp.profile_type, cp.user_id
                    FROM conversation_participants cp
                    WHERE cp.conversation_id = %s
                    AND NOT (cp.profile_id = %s AND cp.profile_type = %s)
                """, (call['conversation_id'], profile_id, profile_type))
                other = cur.fetchone()
                if other:
                    user_info = get_user_display_info(conn, other['user_id'], other['profile_type'], other['profile_id'])
                    call_dict['other_participant'] = user_info

            result.append(call_dict)

        return {"calls": result}

    finally:
        cur.close()
        conn.close()


# =============================================
# DELETE CHAT HISTORY ENDPOINTS
# =============================================

@router.delete("/conversations/{conversation_id}/history")
async def delete_chat_history(
    conversation_id: int,
    profile_id: int,
    profile_type: str,
    user_id: int
):
    """
    Delete chat history for the requesting user only.
    This is a soft delete - messages are marked as deleted for this user,
    but remain visible to other participants.
    Uses deleted_for_user_ids JSON array to track per-user deletion.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify user is participant
        cur.execute("""
            SELECT * FROM conversation_participants
            WHERE conversation_id = %s AND profile_id = %s AND profile_type = %s AND is_active = TRUE
        """, (conversation_id, profile_id, profile_type))

        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Not a participant of this conversation")

        # Mark all messages in this conversation as deleted for this user
        # We use a JSON array to track which users have deleted each message
        cur.execute("""
            UPDATE chat_messages
            SET deleted_for_user_ids = COALESCE(deleted_for_user_ids, '[]'::jsonb) || %s::jsonb
            WHERE conversation_id = %s
            AND NOT (COALESCE(deleted_for_user_ids, '[]'::jsonb) @> %s::jsonb)
        """, (json.dumps([user_id]), conversation_id, json.dumps([user_id])))

        # Update the participant's deleted_at timestamp
        cur.execute("""
            UPDATE conversation_participants
            SET chat_cleared_at = CURRENT_TIMESTAMP
            WHERE conversation_id = %s AND profile_id = %s AND profile_type = %s
        """, (conversation_id, profile_id, profile_type))

        conn.commit()

        return {
            "success": True,
            "message": "Chat history deleted for your account only"
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# =============================================
# READ RECEIPTS & TYPING INDICATORS (Privacy-Enforced)
# =============================================

@router.get("/conversations/{conversation_id}/read-status")
async def get_conversation_read_status(
    conversation_id: int,
    profile_id: int,
    profile_type: str
):
    """
    Get read status of messages in a conversation.
    Respects privacy settings - only returns read status if the reader has read_receipts enabled.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get conversation type
        cur.execute("""
            SELECT type FROM conversations WHERE id = %s
        """, (conversation_id,))
        conv = cur.fetchone()

        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # For direct conversations, get the other participant's read status
        if conv['type'] == 'direct':
            # Get the other participant
            cur.execute("""
                SELECT cp.profile_id, cp.profile_type, cp.last_read_at, cp.last_read_message_id
                FROM conversation_participants cp
                WHERE cp.conversation_id = %s AND cp.is_active = TRUE
                AND NOT (cp.profile_id = %s AND cp.profile_type = %s)
            """, (conversation_id, profile_id, profile_type))
            other = cur.fetchone()

            if not other:
                return {"read_status": None, "reason": "No other participant"}

            # Check if the other user has read receipts enabled
            if not should_show_read_receipts(conn, other['profile_id'], other['profile_type']):
                return {
                    "read_status": None,
                    "hidden": True,
                    "reason": "User has disabled read receipts"
                }

            return {
                "read_status": {
                    "last_read_at": other['last_read_at'].isoformat() if other['last_read_at'] else None,
                    "last_read_message_id": other['last_read_message_id']
                },
                "hidden": False
            }
        else:
            # For group/channel, return list of who has read (respecting privacy)
            cur.execute("""
                SELECT cp.profile_id, cp.profile_type, cp.last_read_at, cp.last_read_message_id, cp.user_id
                FROM conversation_participants cp
                WHERE cp.conversation_id = %s AND cp.is_active = TRUE
                AND NOT (cp.profile_id = %s AND cp.profile_type = %s)
            """, (conversation_id, profile_id, profile_type))

            readers = []
            for participant in cur.fetchall():
                # Only include if they have read receipts enabled
                if should_show_read_receipts(conn, participant['profile_id'], participant['profile_type']):
                    user_info = get_user_display_info(conn, participant['user_id'], participant['profile_type'], participant['profile_id'])
                    readers.append({
                        "profile_id": participant['profile_id'],
                        "profile_type": participant['profile_type'],
                        "name": user_info['name'],
                        "avatar": user_info['avatar'],
                        "last_read_at": participant['last_read_at'].isoformat() if participant['last_read_at'] else None,
                        "last_read_message_id": participant['last_read_message_id']
                    })

            return {"readers": readers}

    finally:
        cur.close()
        conn.close()


@router.get("/conversations/{conversation_id}/typing-allowed")
async def check_typing_allowed(
    conversation_id: int,
    profile_id: int,
    profile_type: str
):
    """
    Check if the current user's typing indicator should be broadcast.
    Returns whether this user has typing indicators enabled.
    Frontend should call this before broadcasting typing status.
    """
    conn = get_db_connection()
    try:
        # Check if this user has typing indicators enabled
        can_broadcast = should_show_typing_indicator(conn, profile_id, profile_type)
        return {"can_broadcast_typing": can_broadcast}
    finally:
        conn.close()


@router.post("/conversations/{conversation_id}/typing")
async def broadcast_typing(
    conversation_id: int,
    profile_id: int,
    profile_type: str,
    is_typing: bool = True
):
    """
    Indicate that user is typing (respects privacy settings).
    Only broadcasts if user has typing_indicators enabled.
    Stores typing status in memory for other users to poll.
    """
    conn = get_db_connection()
    try:
        # Check if this user allows typing indicator broadcast
        if not should_show_typing_indicator(conn, profile_id, profile_type):
            return {"broadcasted": False, "reason": "Typing indicators disabled in settings"}

        # Get user display info for the typing indicator
        cur = conn.cursor()
        cur.execute("""
            SELECT u.id as user_id, u.first_name, u.father_name, u.profile_picture
            FROM users u
            JOIN conversation_participants cp ON cp.user_id = u.id
            WHERE cp.conversation_id = %s AND cp.profile_id = %s AND cp.profile_type = %s
        """, (conversation_id, profile_id, profile_type))
        user_row = cur.fetchone()
        cur.close()

        user_name = ""
        avatar = ""
        if user_row:
            user_name = f"{user_row['first_name'] or ''} {user_row['father_name'] or ''}".strip()
            avatar = user_row['profile_picture'] or ""

        # Store typing status in memory
        with _typing_lock:
            if conversation_id not in _typing_status:
                _typing_status[conversation_id] = {}

            key = (profile_id, profile_type)
            if is_typing:
                _typing_status[conversation_id][key] = {
                    "is_typing": True,
                    "timestamp": datetime.now(),
                    "user_name": user_name,
                    "avatar": avatar,
                    "profile_id": profile_id,
                    "profile_type": profile_type
                }
            else:
                # Remove typing status when user stops typing
                if key in _typing_status[conversation_id]:
                    del _typing_status[conversation_id][key]

        return {
            "broadcasted": True,
            "conversation_id": conversation_id,
            "profile_id": profile_id,
            "profile_type": profile_type,
            "is_typing": is_typing
        }
    finally:
        conn.close()


@router.get("/conversations/{conversation_id}/typing")
async def get_typing_status(
    conversation_id: int,
    profile_id: int,
    profile_type: str
):
    """
    Get who is currently typing in a conversation.
    Only returns typing status for users who have typing_indicators enabled.
    Excludes the requesting user from the result.
    """
    # Clean expired typing statuses first
    _clean_expired_typing()

    conn = get_db_connection()
    try:
        typing_users = []

        with _typing_lock:
            if conversation_id in _typing_status:
                for key, status in _typing_status[conversation_id].items():
                    typer_profile_id, typer_profile_type = key

                    # Skip self
                    if typer_profile_id == profile_id and typer_profile_type == profile_type:
                        continue

                    # Check if this typer has typing indicators enabled
                    if should_show_typing_indicator(conn, typer_profile_id, typer_profile_type):
                        typing_users.append({
                            "profile_id": status["profile_id"],
                            "profile_type": status["profile_type"],
                            "user_name": status["user_name"],
                            "avatar": status["avatar"]
                        })

        return {
            "typing_users": typing_users,
            "is_someone_typing": len(typing_users) > 0
        }
    finally:
        conn.close()


# =============================================
# ONLINE STATUS & LAST SEEN (Privacy-Enforced)
# =============================================

@router.get("/users/{target_profile_id}/{target_profile_type}/status")
async def get_user_status(
    target_profile_id: int,
    target_profile_type: str,
    profile_id: int,
    profile_type: str
):
    """
    Get a user's online status and last seen.
    Respects privacy settings:
    - online_status: if False, always shows as offline
    - last_seen_visibility: 'everyone', 'connections', 'nobody'
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check online status visibility
        show_online = should_show_online_status(conn, target_profile_id, target_profile_type,
                                                 profile_id, profile_type)
        # Check last seen visibility
        show_last_seen = should_show_last_seen(conn, target_profile_id, target_profile_type,
                                                profile_id, profile_type)

        # Get the user's actual status
        # Check if they have any active sessions
        cur.execute("""
            SELECT last_active FROM chat_active_sessions
            WHERE profile_id = %s AND profile_type = %s
            ORDER BY last_active DESC
            LIMIT 1
        """, (target_profile_id, target_profile_type))
        session = cur.fetchone()

        # Determine if user is "online" (active within last 5 minutes)
        from datetime import datetime, timedelta
        is_online = False
        last_seen = None

        if session and session['last_active']:
            time_diff = datetime.now() - session['last_active']
            is_online = time_diff < timedelta(minutes=5)
            last_seen = session['last_active']

        # Apply privacy filters
        result = {}

        if show_online:
            result["is_online"] = is_online
        else:
            result["is_online"] = None
            result["online_hidden"] = True

        if show_last_seen and last_seen:
            result["last_seen"] = last_seen.isoformat()
        else:
            result["last_seen"] = None
            if not show_last_seen:
                result["last_seen_hidden"] = True

        return result

    finally:
        cur.close()
        conn.close()


@router.get("/users/online-status")
async def get_bulk_online_status(
    profile_id: int,
    profile_type: str,
    user_id: int,
    profile_ids: str = None  # Comma-separated list of "profile_type_profile_id"
):
    """
    Get online/last_seen status for multiple users in bulk.
    Used for silent polling updates without reloading the entire conversation list.

    profile_ids format: "tutor_123,student_456,parent_789"
    """
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        statuses = {}

        # If no profile_ids provided, return empty
        if not profile_ids:
            return {"statuses": statuses}

        # Parse the profile_ids
        profile_list = []
        for pid in profile_ids.split(','):
            pid = pid.strip()
            if '_' in pid:
                parts = pid.rsplit('_', 1)
                if len(parts) == 2:
                    ptype, pid_num = parts
                    try:
                        profile_list.append((ptype, int(pid_num)))
                    except ValueError:
                        continue

        # Get status for each profile
        for target_profile_type, target_profile_id in profile_list:
            status_info = get_user_last_seen_info(
                conn, target_profile_id, target_profile_type,
                profile_id, profile_type
            )
            key = f"{target_profile_type}_{target_profile_id}"
            statuses[key] = status_info

        return {"statuses": statuses}

    finally:
        cur.close()
        conn.close()


@router.post("/users/status/update")
async def update_my_status(
    profile_id: int,
    profile_type: str,
    user_id: int,
    device_name: str = None,
    device_type: str = "desktop",
    browser: str = None,
    os: str = None
):
    """
    Update the current user's last active time and device info.
    Call this periodically (e.g., every 30 seconds) to maintain online status.
    Also captures device information for the Active Sessions feature.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        session_token = f"web-{user_id}-{profile_id}-{profile_type}"

        # Check if session exists
        cur.execute("""
            SELECT id FROM chat_active_sessions WHERE session_token = %s
        """, (session_token,))
        existing = cur.fetchone()

        if existing:
            # Update existing session with device info and last_active
            cur.execute("""
                UPDATE chat_active_sessions
                SET last_active = CURRENT_TIMESTAMP,
                    device_name = COALESCE(%s, device_name),
                    device_type = COALESCE(%s, device_type),
                    browser = COALESCE(%s, browser),
                    os = COALESCE(%s, os),
                    is_current = TRUE
                WHERE session_token = %s
            """, (device_name, device_type, browser, os, session_token))
        else:
            # Insert new session with device info
            cur.execute("""
                INSERT INTO chat_active_sessions
                (user_id, profile_id, profile_type, session_token, device_name, device_type, browser, os, last_active, is_current)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, TRUE)
            """, (user_id, profile_id, profile_type, session_token, device_name, device_type, browser, os))

        conn.commit()
        return {"success": True, "last_active": "now"}

    finally:
        cur.close()
        conn.close()


# =============================================
# ACTIVE SESSIONS MANAGEMENT
# =============================================

@router.get("/sessions")
async def get_active_sessions(
    profile_id: int,
    profile_type: str,
    user_id: int
):
    """
    Get all active sessions for the current user.
    Shows devices/browsers where the user is logged in.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id, device_name, device_type, browser, os, ip_address, location,
                   is_current, last_active, created_at
            FROM chat_active_sessions
            WHERE user_id = %s AND profile_id = %s AND profile_type = %s
            ORDER BY last_active DESC
        """, (user_id, profile_id, profile_type))

        sessions = []
        for row in cur.fetchall():
            # Determine if session is active (within last 5 minutes)
            from datetime import datetime, timedelta
            is_active = False
            if row['last_active']:
                time_diff = datetime.now() - row['last_active']
                is_active = time_diff < timedelta(minutes=5)

            sessions.append({
                "id": row['id'],
                "device_name": row['device_name'] or "Unknown Device",
                "device_type": row['device_type'] or "unknown",
                "browser": row['browser'] or "Unknown Browser",
                "os": row['os'] or "Unknown OS",
                "ip_address": row['ip_address'],
                "location": row['location'] or "Unknown Location",
                "is_current": row['is_current'] or False,
                "is_active": is_active,
                "last_active": row['last_active'].isoformat() if row['last_active'] else None,
                "created_at": row['created_at'].isoformat() if row['created_at'] else None
            })

        return {"sessions": sessions}

    finally:
        cur.close()
        conn.close()


@router.delete("/sessions/{session_id}")
async def terminate_session(
    session_id: int,
    profile_id: int,
    profile_type: str,
    user_id: int
):
    """
    Terminate a specific session (log out that device).
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify ownership of the session
        cur.execute("""
            DELETE FROM chat_active_sessions
            WHERE id = %s AND user_id = %s AND profile_id = %s AND profile_type = %s
            RETURNING id
        """, (session_id, user_id, profile_id, profile_type))

        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Session not found or not authorized")

        conn.commit()
        return {"success": True, "terminated_session_id": session_id}

    finally:
        cur.close()
        conn.close()


@router.delete("/sessions")
async def terminate_all_other_sessions(
    profile_id: int,
    profile_type: str,
    user_id: int,
    current_session_token: str = None
):
    """
    Terminate all sessions except the current one.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        if current_session_token:
            # Keep only the current session
            cur.execute("""
                DELETE FROM chat_active_sessions
                WHERE user_id = %s AND profile_id = %s AND profile_type = %s
                AND session_token != %s
            """, (user_id, profile_id, profile_type, current_session_token))
        else:
            # If no current session token provided, terminate all except marked as current
            cur.execute("""
                DELETE FROM chat_active_sessions
                WHERE user_id = %s AND profile_id = %s AND profile_type = %s
                AND is_current = FALSE
            """, (user_id, profile_id, profile_type))

        terminated_count = cur.rowcount
        conn.commit()

        return {"success": True, "terminated_count": terminated_count}

    finally:
        cur.close()
        conn.close()


@router.post("/sessions/register")
async def register_session(
    profile_id: int,
    profile_type: str,
    user_id: int,
    device_name: str = None,
    device_type: str = "desktop",
    browser: str = None,
    os: str = None
):
    """
    Register a new session when user logs in.
    Called automatically on login or can be called to register device info.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        import uuid
        session_token = str(uuid.uuid4())

        # Mark all other sessions as not current
        cur.execute("""
            UPDATE chat_active_sessions
            SET is_current = FALSE
            WHERE user_id = %s AND profile_id = %s AND profile_type = %s
        """, (user_id, profile_id, profile_type))

        # Insert new session
        cur.execute("""
            INSERT INTO chat_active_sessions
            (user_id, profile_id, profile_type, session_token, device_name, device_type, browser, os, is_current, last_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP)
            RETURNING id
        """, (user_id, profile_id, profile_type, session_token, device_name, device_type, browser, os))

        session_id = cur.fetchone()['id']
        conn.commit()

        return {
            "success": True,
            "session_id": session_id,
            "session_token": session_token
        }

    finally:
        cur.close()
        conn.close()


# =============================================
# MUTE/ARCHIVE ENDPOINTS
# =============================================

@router.put("/conversations/{conversation_id}/mute")
async def toggle_mute(conversation_id: int, muted: bool, profile_id: int, profile_type: str):
    """Mute/unmute a conversation"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE conversation_participants
            SET is_muted = %s
            WHERE conversation_id = %s AND profile_id = %s AND profile_type = %s
        """, (muted, conversation_id, profile_id, profile_type))

        conn.commit()
        return {"success": True, "muted": muted}

    finally:
        cur.close()
        conn.close()


@router.put("/conversations/{conversation_id}/archive")
async def archive_conversation(conversation_id: int, archived: bool, profile_id: int, profile_type: str):
    """Archive/unarchive a conversation for the current user"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # For now, we archive at conversation level
        # Could be per-user if needed
        cur.execute("""
            UPDATE conversations
            SET is_archived = %s
            WHERE id = %s
        """, (archived, conversation_id))

        conn.commit()
        return {"success": True, "archived": archived}

    finally:
        cur.close()
        conn.close()


# =============================================
# TWO-STEP VERIFICATION
# =============================================

@router.get("/security/two-step")
async def get_two_step_status(
    profile_id: int,
    profile_type: str
):
    """
    Get current two-step verification status.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT two_step_verification, two_step_email
            FROM chat_settings
            WHERE profile_id = %s AND profile_type = %s
        """, (profile_id, profile_type))

        row = cur.fetchone()
        if not row:
            return {
                "enabled": False,
                "email": None,
                "has_password": False
            }

        return {
            "enabled": row['two_step_verification'] or False,
            "email": row['two_step_email'],
            "has_password": row['two_step_verification'] or False
        }

    finally:
        cur.close()
        conn.close()


@router.post("/security/two-step/enable")
async def enable_two_step_verification(
    profile_id: int,
    profile_type: str,
    user_id: int,
    password: str,
    recovery_email: str = None
):
    """
    Enable two-step verification with a password.
    The password is hashed and stored securely.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        import hashlib
        # Hash the password (in production, use bcrypt or similar)
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        # First, check if chat_settings row exists
        cur.execute("""
            SELECT id FROM chat_settings
            WHERE profile_id = %s AND profile_type = %s
        """, (profile_id, profile_type))

        if cur.fetchone():
            # Update existing row
            cur.execute("""
                UPDATE chat_settings
                SET two_step_verification = TRUE,
                    two_step_email = %s,
                    two_step_password_hash = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE profile_id = %s AND profile_type = %s
            """, (recovery_email, password_hash, profile_id, profile_type))
        else:
            # Insert new row
            cur.execute("""
                INSERT INTO chat_settings (user_id, profile_id, profile_type, two_step_verification, two_step_email, two_step_password_hash)
                VALUES (%s, %s, %s, TRUE, %s, %s)
            """, (user_id, profile_id, profile_type, recovery_email, password_hash))

        conn.commit()
        return {"success": True, "message": "Two-step verification enabled"}

    finally:
        cur.close()
        conn.close()


@router.post("/security/two-step/disable")
async def disable_two_step_verification(
    profile_id: int,
    profile_type: str,
    password: str
):
    """
    Disable two-step verification.
    Requires the current password for security.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        # Verify password first
        cur.execute("""
            SELECT two_step_password_hash
            FROM chat_settings
            WHERE profile_id = %s AND profile_type = %s
        """, (profile_id, profile_type))

        row = cur.fetchone()
        if not row or row['two_step_password_hash'] != password_hash:
            raise HTTPException(status_code=403, detail="Incorrect password")

        # Disable two-step verification
        cur.execute("""
            UPDATE chat_settings
            SET two_step_verification = FALSE,
                two_step_password_hash = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE profile_id = %s AND profile_type = %s
        """, (profile_id, profile_type))

        conn.commit()
        return {"success": True, "message": "Two-step verification disabled"}

    finally:
        cur.close()
        conn.close()


@router.post("/security/two-step/change-password")
async def change_two_step_password(
    profile_id: int,
    profile_type: str,
    current_password: str,
    new_password: str
):
    """
    Change the two-step verification password.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        import hashlib
        current_hash = hashlib.sha256(current_password.encode()).hexdigest()
        new_hash = hashlib.sha256(new_password.encode()).hexdigest()

        # Verify current password
        cur.execute("""
            SELECT two_step_password_hash
            FROM chat_settings
            WHERE profile_id = %s AND profile_type = %s AND two_step_verification = TRUE
        """, (profile_id, profile_type))

        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Two-step verification not enabled")
        if row['two_step_password_hash'] != current_hash:
            raise HTTPException(status_code=403, detail="Incorrect current password")

        # Update password
        cur.execute("""
            UPDATE chat_settings
            SET two_step_password_hash = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE profile_id = %s AND profile_type = %s
        """, (new_hash, profile_id, profile_type))

        conn.commit()
        return {"success": True, "message": "Password changed successfully"}

    finally:
        cur.close()
        conn.close()


@router.post("/security/two-step/change-email")
async def change_two_step_email(
    profile_id: int,
    profile_type: str,
    password: str,
    new_email: str
):
    """
    Change the recovery email for two-step verification.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        # Verify password
        cur.execute("""
            SELECT two_step_password_hash
            FROM chat_settings
            WHERE profile_id = %s AND profile_type = %s AND two_step_verification = TRUE
        """, (profile_id, profile_type))

        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Two-step verification not enabled")
        if row['two_step_password_hash'] != password_hash:
            raise HTTPException(status_code=403, detail="Incorrect password")

        # Update email
        cur.execute("""
            UPDATE chat_settings
            SET two_step_email = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE profile_id = %s AND profile_type = %s
        """, (new_email, profile_id, profile_type))

        conn.commit()
        return {"success": True, "message": "Recovery email updated"}

    finally:
        cur.close()
        conn.close()


class TwoStepVerifyRequest(BaseModel):
    password: str


@router.post("/security/two-step/verify")
async def verify_two_step_password(
    request: TwoStepVerifyRequest,
    profile_id: int,
    profile_type: str
):
    """
    Verify the two-step password.
    Called during sensitive operations that require additional verification.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        import hashlib
        password_hash = hashlib.sha256(request.password.encode()).hexdigest()

        cur.execute("""
            SELECT two_step_password_hash
            FROM chat_settings
            WHERE profile_id = %s AND profile_type = %s AND two_step_verification = TRUE
        """, (profile_id, profile_type))

        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Two-step verification not enabled")

        if row['two_step_password_hash'] == password_hash:
            return {"verified": True}
        else:
            return {"verified": False, "error": "Incorrect password"}

    finally:
        cur.close()
        conn.close()


@router.post("/security/two-step/forgot")
async def forgot_two_step_password(
    profile_id: int,
    profile_type: str,
    user_id: int
):
    """
    Send a password reset OTP to the user's account email (from users table).
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify 2FA is enabled for this profile
        cur.execute("""
            SELECT user_id
            FROM chat_settings
            WHERE profile_id = %s AND profile_type = %s AND two_step_verification = TRUE
        """, (profile_id, profile_type))

        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="Two-step verification is not enabled for this account")

        # Get user's email from the users table (primary account email)
        cur.execute("""
            SELECT email FROM users WHERE id = %s
        """, (user_id,))

        user_row = cur.fetchone()
        if not user_row or not user_row['email']:
            raise HTTPException(status_code=400, detail="No email found for this account")

        user_email = user_row['email']

        # Generate OTP
        import random
        otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])

        # Store OTP in database (expires in 10 minutes)
        from datetime import datetime, timedelta
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        # Delete any existing OTPs for this user/purpose
        cur.execute("""
            DELETE FROM otps
            WHERE user_id = %s AND purpose = 'two_step_reset'
        """, (user_id,))

        # Insert new OTP
        cur.execute("""
            INSERT INTO otps (user_id, contact, otp_code, purpose, expires_at)
            VALUES (%s, %s, %s, 'two_step_reset', %s)
        """, (user_id, user_email, otp, expires_at))

        conn.commit()

        # Send email with OTP using email service
        email_sent = email_service.send_two_step_reset_email(user_email, otp)

        if email_sent:
            print(f"[2FA Reset] OTP sent successfully to {user_email}")
        else:
            # Email service logs the OTP as fallback - also log OTP for dev testing
            print(f"[2FA Reset] Email not configured. OTP for {user_email}: {otp}")

        return {
            "success": True,
            "message": "Reset code sent to your account email",
            "email_masked": user_email[0] + "***@" + user_email.split("@")[1] if "@" in user_email else "***"
        }

    finally:
        cur.close()
        conn.close()


class TwoStepResetRequest(BaseModel):
    otp: str
    new_password: str


@router.post("/security/two-step/reset")
async def reset_two_step_password(
    request: TwoStepResetRequest,
    profile_id: int,
    profile_type: str,
    user_id: int
):
    """
    Reset the two-step verification password using OTP.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        from datetime import datetime

        # Verify OTP
        cur.execute("""
            SELECT id, expires_at, is_used
            FROM otps
            WHERE user_id = %s AND otp_code = %s AND purpose = 'two_step_reset'
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id, request.otp))

        otp_row = cur.fetchone()

        if not otp_row:
            raise HTTPException(status_code=400, detail="Invalid reset code")

        if otp_row['is_used']:
            raise HTTPException(status_code=400, detail="This code has already been used")

        if otp_row['expires_at'] < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")

        # Validate new password
        if len(request.new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

        # Hash new password
        import hashlib
        new_password_hash = hashlib.sha256(request.new_password.encode()).hexdigest()

        # Update password
        cur.execute("""
            UPDATE chat_settings
            SET two_step_password_hash = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE profile_id = %s AND profile_type = %s
        """, (new_password_hash, profile_id, profile_type))

        # Mark OTP as used
        cur.execute("""
            UPDATE otps
            SET is_used = TRUE
            WHERE id = %s
        """, (otp_row['id'],))

        conn.commit()

        return {
            "success": True,
            "message": "Password reset successfully"
        }

    finally:
        cur.close()
        conn.close()


# =============================================
# CHAT SETTINGS ENDPOINTS
# =============================================

@router.get("/settings")
async def get_chat_settings(profile_id: int, profile_type: str):
    """Get chat settings for a user profile"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                who_can_message, read_receipts, online_status, typing_indicators,
                message_notifications, sound_alerts, mute_duration, mute_until,
                bubble_style, font_size, message_density, enter_key,
                auto_download, image_quality,
                default_translation, auto_translate, tts_voice,
                last_seen_visibility, block_screenshots, disable_forwarding,
                two_step_verification, two_step_email,
                allow_calls_from, allow_group_adds, allow_channel_adds
            FROM chat_settings
            WHERE profile_id = %s AND profile_type = %s
        """, (profile_id, profile_type))

        row = cur.fetchone()

        if not row:
            # Return defaults if no settings exist
            return {
                "settings": {
                    "who_can_message": "everyone",
                    "read_receipts": True,
                    "online_status": True,
                    "typing_indicators": True,
                    "message_notifications": True,
                    "sound_alerts": True,
                    "mute_duration": "off",
                    "bubble_style": "rounded",
                    "font_size": "medium",
                    "message_density": "comfortable",
                    "enter_key": "send",
                    "auto_download": "wifi",
                    "image_quality": "compressed",
                    "default_translation": "none",
                    "auto_translate": False,
                    "tts_voice": "default",
                    "last_seen_visibility": "everyone",
                    "block_screenshots": False,
                    "disable_forwarding": False,
                    "two_step_verification": False,
                    "two_step_email": None,
                    "allow_calls_from": "everyone",
                    "allow_group_adds": "everyone",
                    "allow_channel_adds": "everyone"
                }
            }

        return {"settings": dict(row)}

    except Exception as e:
        print(f"[GET /settings ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.put("/settings")
async def update_chat_settings(
    profile_id: int = Body(...),
    profile_type: str = Body(...),
    settings: dict = Body(...)
):
    """Update chat settings for a user profile"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get user_id from profile
        if profile_type == 'student':
            cur.execute("SELECT user_id FROM student_profiles WHERE id = %s", (profile_id,))
        elif profile_type == 'tutor':
            cur.execute("SELECT user_id FROM tutor_profiles WHERE id = %s", (profile_id,))
        elif profile_type == 'parent':
            cur.execute("SELECT user_id FROM parent_profiles WHERE id = %s", (profile_id,))
        elif profile_type == 'advertiser':
            cur.execute("SELECT user_id FROM advertiser_profiles WHERE id = %s", (profile_id,))
        else:
            raise HTTPException(status_code=400, detail="Invalid profile type")

        user_row = cur.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail="Profile not found")

        user_id = user_row['user_id']

        # Extract settings with defaults
        who_can_message = settings.get('who_can_message', 'everyone')
        read_receipts = settings.get('read_receipts', True)
        online_status = settings.get('online_status', True)
        typing_indicators = settings.get('typing_indicators', True)
        message_notifications = settings.get('message_notifications', True)
        sound_alerts = settings.get('sound_alerts', True)
        mute_duration = settings.get('mute_duration', 'off')
        bubble_style = settings.get('bubble_style', 'rounded')
        font_size = settings.get('font_size', 'medium')
        message_density = settings.get('message_density', 'comfortable')
        enter_key = settings.get('enter_key', 'send')
        auto_download = settings.get('auto_download', 'wifi')
        image_quality = settings.get('image_quality', 'compressed')
        default_translation = settings.get('default_translation', 'none')
        auto_translate = settings.get('auto_translate', False)
        tts_voice = settings.get('tts_voice', 'default')

        # New privacy settings
        last_seen_visibility = settings.get('last_seen_visibility', 'everyone')
        block_screenshots = settings.get('block_screenshots', False)
        disable_forwarding = settings.get('disable_forwarding', False)
        two_step_verification = settings.get('two_step_verification', False)
        two_step_email = settings.get('two_step_email')
        allow_calls_from = settings.get('allow_calls_from', 'everyone')
        allow_group_adds = settings.get('allow_group_adds', 'everyone')
        allow_channel_adds = settings.get('allow_channel_adds', 'everyone')

        # Calculate mute_until if mute_duration is set
        mute_until = None
        if mute_duration == '1h':
            mute_until = "CURRENT_TIMESTAMP + INTERVAL '1 hour'"
        elif mute_duration == '8h':
            mute_until = "CURRENT_TIMESTAMP + INTERVAL '8 hours'"
        elif mute_duration == '24h':
            mute_until = "CURRENT_TIMESTAMP + INTERVAL '24 hours'"

        # Upsert settings
        cur.execute("""
            INSERT INTO chat_settings (
                user_id, profile_id, profile_type,
                who_can_message, read_receipts, online_status, typing_indicators,
                message_notifications, sound_alerts, mute_duration,
                bubble_style, font_size, message_density, enter_key,
                auto_download, image_quality,
                default_translation, auto_translate, tts_voice,
                last_seen_visibility, block_screenshots, disable_forwarding,
                two_step_verification, two_step_email,
                allow_calls_from, allow_group_adds, allow_channel_adds,
                updated_at
            ) VALUES (
                %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, profile_id, profile_type)
            DO UPDATE SET
                who_can_message = EXCLUDED.who_can_message,
                read_receipts = EXCLUDED.read_receipts,
                online_status = EXCLUDED.online_status,
                typing_indicators = EXCLUDED.typing_indicators,
                message_notifications = EXCLUDED.message_notifications,
                sound_alerts = EXCLUDED.sound_alerts,
                mute_duration = EXCLUDED.mute_duration,
                bubble_style = EXCLUDED.bubble_style,
                font_size = EXCLUDED.font_size,
                message_density = EXCLUDED.message_density,
                enter_key = EXCLUDED.enter_key,
                auto_download = EXCLUDED.auto_download,
                image_quality = EXCLUDED.image_quality,
                default_translation = EXCLUDED.default_translation,
                auto_translate = EXCLUDED.auto_translate,
                tts_voice = EXCLUDED.tts_voice,
                last_seen_visibility = EXCLUDED.last_seen_visibility,
                block_screenshots = EXCLUDED.block_screenshots,
                disable_forwarding = EXCLUDED.disable_forwarding,
                two_step_verification = EXCLUDED.two_step_verification,
                two_step_email = EXCLUDED.two_step_email,
                allow_calls_from = EXCLUDED.allow_calls_from,
                allow_group_adds = EXCLUDED.allow_group_adds,
                allow_channel_adds = EXCLUDED.allow_channel_adds,
                updated_at = CURRENT_TIMESTAMP
        """, (
            user_id, profile_id, profile_type,
            who_can_message, read_receipts, online_status, typing_indicators,
            message_notifications, sound_alerts, mute_duration,
            bubble_style, font_size, message_density, enter_key,
            auto_download, image_quality,
            default_translation, auto_translate, tts_voice,
            last_seen_visibility, block_screenshots, disable_forwarding,
            two_step_verification, two_step_email,
            allow_calls_from, allow_group_adds, allow_channel_adds
        ))

        conn.commit()

        return {
            "success": True,
            "message": "Settings updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.delete("/data")
async def delete_all_chat_data(profile_id: int, profile_type: str, user_id: int):
    """
    Delete all chat data for a user (one-sided deletion).
    This marks all messages as deleted for this user and clears all conversations.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get all conversation IDs where user is a participant
        cur.execute("""
            SELECT conversation_id FROM conversation_participants
            WHERE profile_id = %s AND profile_type = %s AND is_active = TRUE
        """, (profile_id, profile_type))

        conversation_ids = [row['conversation_id'] for row in cur.fetchall()]

        if conversation_ids:
            # Mark all messages in these conversations as deleted for this user
            for conv_id in conversation_ids:
                cur.execute("""
                    UPDATE chat_messages
                    SET deleted_for_user_ids = COALESCE(deleted_for_user_ids, '[]'::jsonb) || %s::jsonb
                    WHERE conversation_id = %s
                    AND NOT (COALESCE(deleted_for_user_ids, '[]'::jsonb) @> %s::jsonb)
                """, (json.dumps([user_id]), conv_id, json.dumps([user_id])))

            # Update chat_cleared_at for all participations
            cur.execute("""
                UPDATE conversation_participants
                SET chat_cleared_at = CURRENT_TIMESTAMP
                WHERE profile_id = %s AND profile_type = %s
            """, (profile_id, profile_type))

        # Delete chat settings
        cur.execute("""
            DELETE FROM chat_settings
            WHERE profile_id = %s AND profile_type = %s
        """, (profile_id, profile_type))

        conn.commit()

        return {
            "success": True,
            "message": "All chat data deleted for your account",
            "conversations_cleared": len(conversation_ids)
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
