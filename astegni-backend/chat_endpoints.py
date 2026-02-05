"""
Chat System API Endpoints - User-Based Architecture
===================================================
Handles all chat/messaging functionality:
- Conversations (direct and group)
- Messages (text, media, files)
- Reactions, replies, pinning
- Read receipts
- Call logs
- Blocking

MIGRATED TO USER-BASED: Uses user_id as primary identifier.
Profile fields (profile_id, profile_type) are nullable for backward compatibility.
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
from utils import get_current_user
import threading

# Import user-based helper functions
from chat_user_based_helpers import (
    get_user_display_info,
    get_user_privacy_settings,
    are_users_connected,
    is_user_blocked,
    check_can_message,
    check_can_call,
    check_can_add_to_group,
    get_user_contacts,
    get_or_create_direct_conversation
)

load_dotenv()

router = APIRouter(prefix="/api/chat", tags=["Chat"])

# =============================================
# IN-MEMORY TYPING STATUS STORE
# =============================================
# Stores typing status with timestamps for expiry
# Format: {conversation_id: {user_id: {"is_typing": bool, "timestamp": datetime, "user_name": str, "avatar": str}}}
_typing_status: Dict[int, Dict[int, dict]] = {}
_typing_lock = threading.Lock()
TYPING_EXPIRY_SECONDS = 5  # Typing status expires after 5 seconds of no updates


def _clean_expired_typing():
    """Remove expired typing statuses"""
    now = datetime.now()
    with _typing_lock:
        for conv_id in list(_typing_status.keys()):
            for user_id in list(_typing_status[conv_id].keys()):
                if now - _typing_status[conv_id][user_id]["timestamp"] > timedelta(seconds=TYPING_EXPIRY_SECONDS):
                    del _typing_status[conv_id][user_id]
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

class CreateConversationRequest(BaseModel):
    type: str = "direct"  # 'direct' or 'group'
    name: Optional[str] = None  # For groups
    description: Optional[str] = None
    participant_user_ids: List[int]  # List of participant user IDs

class SendMessageRequest(BaseModel):
    conversation_id: int
    message_type: str = "text"  # 'text', 'image', 'audio', 'video', 'file', 'system', 'location', 'gif'
    content: Optional[str] = None
    media_url: Optional[str] = None
    media_metadata: Optional[dict] = None
    reply_to_id: Optional[int] = None
    # Forwarded message fields
    is_forwarded: Optional[bool] = False
    forwarded_from: Optional[str] = None  # Original sender's name
    forwarded_from_avatar: Optional[str] = None  # Original sender's avatar URL
    forwarded_from_user_id: Optional[int] = None  # Original sender's user ID

class UpdateMessageRequest(BaseModel):
    content: str

class ReactionRequest(BaseModel):
    reaction: str  # 'heart', 'thumbsup', 'laugh', 'wow', 'sad', 'angry'

class CreateGroupRequest(BaseModel):
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    participant_user_ids: List[int]

class AddParticipantsRequest(BaseModel):
    participant_user_ids: List[int]

class BlockContactRequest(BaseModel):
    blocked_user_id: int
    reason: Optional[str] = None


# =============================================
# ENDPOINTS
# =============================================

@router.get("/contacts")
async def get_contacts(user_id: int = Query(...)):
    """
    Get all contacts for a user (accepted connections).

    Returns users that this user has any accepted connection with.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get contact user IDs
        contact_ids = get_user_contacts(conn, user_id)

        if not contact_ids:
            return {"contacts": []}

        # Get display info for each contact
        contacts = []
        for contact_id in contact_ids:
            display_info = get_user_display_info(conn, contact_id)

            # Check last message/conversation with this contact
            cur.execute("""
                SELECT c.id, c.updated_at, m.content, m.created_at as message_time
                FROM conversations c
                JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = %s
                JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = %s
                LEFT JOIN messages m ON m.conversation_id = c.id
                WHERE c.type = 'direct'
                AND cp1.is_active = true
                AND cp2.is_active = true
                ORDER BY COALESCE(m.created_at, c.updated_at) DESC
                LIMIT 1
            """, (user_id, contact_id))

            last_interaction = cur.fetchone()

            contacts.append({
                "user_id": contact_id,
                "name": display_info["name"],
                "avatar": display_info["avatar"],
                "email": display_info["email"],
                "last_message": last_interaction["content"] if last_interaction and last_interaction.get("content") else None,
                "last_interaction": last_interaction["message_time"].isoformat() if last_interaction and last_interaction.get("message_time") else None,
                "conversation_id": last_interaction["id"] if last_interaction else None
            })

        # Sort by last interaction
        contacts.sort(key=lambda x: x["last_interaction"] or "", reverse=True)

        return {"contacts": contacts}

    except Exception as e:
        print(f"[Chat API] Error fetching contacts for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch contacts: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/connection-requests")
async def get_connection_requests(user_id: int = Query(...)):
    """
    Get pending connection requests for a user.

    Returns connection requests across all profiles of the user.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get all profile IDs for this user
        cur.execute("""
            SELECT id as profile_id, 'student' as profile_type FROM student_profiles WHERE user_id = %s
            UNION
            SELECT id as profile_id, 'tutor' as profile_type FROM tutor_profiles WHERE user_id = %s
            UNION
            SELECT id as profile_id, 'parent' as profile_type FROM parent_profiles WHERE user_id = %s
            UNION
            SELECT id as profile_id, 'advertiser' as profile_type FROM advertiser_profiles WHERE user_id = %s
        """, (user_id, user_id, user_id, user_id))

        user_profiles = cur.fetchall()

        if not user_profiles:
            return {"incoming": [], "outgoing": []}

        # Build profile conditions
        profile_conditions = " OR ".join([
            f"(recipient_profile_id = {p['profile_id']} AND recipient_type = '{p['profile_type']}')"
            for p in user_profiles
        ])

        requester_conditions = " OR ".join([
            f"(requester_profile_id = {p['profile_id']} AND requester_type = '{p['profile_type']}')"
            for p in user_profiles
        ])

        # Get incoming requests
        cur.execute(f"""
            SELECT c.id, c.requester_profile_id, c.requester_type,
                   c.recipient_profile_id, c.recipient_type,
                   c.status, c.requested_at as created_at
            FROM connections c
            WHERE ({profile_conditions})
            AND c.status = 'pending'
            ORDER BY c.requested_at DESC
        """)

        incoming_requests = []
        for req in cur.fetchall():
            # Get requester user_id
            requester_profile_table = f"{req['requester_type']}_profiles"
            cur.execute(f"""
                SELECT user_id FROM {requester_profile_table}
                WHERE id = %s
            """, (req['requester_profile_id'],))
            requester_user = cur.fetchone()

            if requester_user:
                requester_info = get_user_display_info(conn, requester_user['user_id'])
                incoming_requests.append({
                    "connection_id": req['id'],
                    "requester_user_id": requester_user['user_id'],
                    "requester_name": requester_info['name'],
                    "requester_avatar": requester_info['avatar'],
                    "created_at": req['created_at'].isoformat()
                })

        # Get outgoing requests
        cur.execute(f"""
            SELECT c.id, c.requester_profile_id, c.requester_type,
                   c.recipient_profile_id, c.recipient_type,
                   c.status, c.requested_at as created_at
            FROM connections c
            WHERE ({requester_conditions})
            AND c.status = 'pending'
            ORDER BY c.requested_at DESC
        """)

        outgoing_requests = []
        for req in cur.fetchall():
            # Get recipient user_id
            recipient_profile_table = f"{req['recipient_type']}_profiles"
            cur.execute(f"""
                SELECT user_id FROM {recipient_profile_table}
                WHERE id = %s
            """, (req['recipient_profile_id'],))
            recipient_user = cur.fetchone()

            if recipient_user:
                recipient_info = get_user_display_info(conn, recipient_user['user_id'])
                outgoing_requests.append({
                    "connection_id": req['id'],
                    "recipient_user_id": recipient_user['user_id'],
                    "recipient_name": recipient_info['name'],
                    "recipient_avatar": recipient_info['avatar'],
                    "created_at": req['created_at'].isoformat()
                })

        return {
            "incoming": incoming_requests,
            "outgoing": outgoing_requests
        }

    except Exception as e:
        print(f"[Chat API] Error fetching connection requests for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch connection requests: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/connection-requests/{connection_id}/respond")
async def respond_to_connection_request(
    connection_id: int,
    user_id: int = Query(...),
    action: str = Query(..., regex="^(accept|reject)$")
):
    """
    Respond to a connection request (accept or reject).
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify the connection request exists and user is the recipient
        cur.execute("""
            SELECT c.id, c.requester_profile_id, c.requester_type,
                   c.recipient_profile_id, c.recipient_type
            FROM connections c
            WHERE c.id = %s AND c.status = 'pending'
        """, (connection_id,))

        connection = cur.fetchone()

        if not connection:
            raise HTTPException(status_code=404, detail="Connection request not found")

        # Check if user owns the recipient profile
        recipient_profile_table = f"{connection['recipient_type']}_profiles"
        cur.execute(f"""
            SELECT user_id FROM {recipient_profile_table}
            WHERE id = %s
        """, (connection['recipient_profile_id'],))

        recipient_user = cur.fetchone()

        if not recipient_user or recipient_user['user_id'] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to respond to this request")

        # Update connection status
        new_status = 'accepted' if action == 'accept' else 'rejected'
        cur.execute("""
            UPDATE connections
            SET status = %s, updated_at = NOW()
            WHERE id = %s
        """, (new_status, connection_id))

        conn.commit()

        return {
            "message": f"Connection request {new_status}",
            "connection_id": connection_id,
            "status": new_status
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error responding to connection request {connection_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to respond to request: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/conversations")
async def get_conversations(
    user_id: int = Query(...),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Get all conversations for a user with pagination.

    Returns conversations ordered by most recent activity.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get conversations where user is a participant
        cur.execute("""
            SELECT
                c.id,
                c.type,
                c.name,
                c.description,
                c.avatar_url,
                c.created_by_user_id,
                c.created_at,
                c.updated_at,
                cp.is_muted,
                c.is_archived,
                cp.last_read_at,
                (
                    SELECT COUNT(*)
                    FROM chat_messages m
                    WHERE m.conversation_id = c.id
                    AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')
                    AND m.sender_user_id != %s
                    AND m.is_deleted = false
                ) as unread_count,
                (
                    SELECT m2.content
                    FROM chat_messages m2
                    WHERE m2.conversation_id = c.id
                    AND m2.is_deleted = false
                    ORDER BY m2.created_at DESC
                    LIMIT 1
                ) as last_message_content,
                (
                    SELECT m2.message_type
                    FROM chat_messages m2
                    WHERE m2.conversation_id = c.id
                    AND m2.is_deleted = false
                    ORDER BY m2.created_at DESC
                    LIMIT 1
                ) as last_message_type,
                (
                    SELECT m2.sender_user_id
                    FROM chat_messages m2
                    WHERE m2.conversation_id = c.id
                    AND m2.is_deleted = false
                    ORDER BY m2.created_at DESC
                    LIMIT 1
                ) as last_message_sender_user_id,
                (
                    SELECT m2.created_at
                    FROM chat_messages m2
                    WHERE m2.conversation_id = c.id
                    AND m2.is_deleted = false
                    ORDER BY m2.created_at DESC
                    LIMIT 1
                ) as last_message_time
            FROM conversations c
            JOIN conversation_participants cp ON cp.conversation_id = c.id
            WHERE cp.user_id = %s
            AND cp.is_active = true
            ORDER BY COALESCE(
                (SELECT m3.created_at FROM chat_messages m3
                 WHERE m3.conversation_id = c.id
                 AND m3.is_deleted = false
                 ORDER BY m3.created_at DESC LIMIT 1),
                c.updated_at
            ) DESC
            LIMIT %s OFFSET %s
        """, (user_id, user_id, limit, offset))

        conversations = []

        for conv in cur.fetchall():
            conv_dict = dict(conv)

            # Decrypt last message if encrypted
            if conv_dict.get('last_message_content'):
                try:
                    if is_encrypted(conv_dict['last_message_content']):
                        conv_dict['last_message_content'] = decrypt_message(conv_dict['last_message_content'])
                except Exception as e:
                    print(f"[Chat API] Error decrypting last message: {e}")
                    conv_dict['last_message_content'] = "[Encrypted message]"

            # For direct conversations, get the other participant's info
            if conv_dict['type'] == 'direct':
                cur.execute("""
                    SELECT user_id
                    FROM conversation_participants
                    WHERE conversation_id = %s
                    AND user_id != %s
                    AND is_active = true
                    LIMIT 1
                """, (conv_dict['id'], user_id))

                other_participant = cur.fetchone()

                if other_participant:
                    other_user_info = get_user_display_info(conn, other_participant['user_id'])
                    conv_dict['name'] = other_user_info['name']
                    conv_dict['avatar_url'] = other_user_info['avatar']
                    conv_dict['other_user_id'] = other_participant['user_id']

            # Get participant count
            cur.execute("""
                SELECT COUNT(*) as count
                FROM conversation_participants
                WHERE conversation_id = %s
                AND is_active = true
            """, (conv_dict['id'],))

            participant_count = cur.fetchone()
            conv_dict['participant_count'] = participant_count['count'] if participant_count else 0

            # Get last message sender info
            if conv_dict.get('last_message_sender_user_id'):
                sender_info = get_user_display_info(conn, conv_dict['last_message_sender_user_id'])
                conv_dict['last_message_sender_name'] = sender_info['name']

            # Format timestamps
            if conv_dict.get('last_message_time'):
                conv_dict['last_message_time'] = conv_dict['last_message_time'].isoformat()
            if conv_dict.get('created_at'):
                conv_dict['created_at'] = conv_dict['created_at'].isoformat()
            if conv_dict.get('updated_at'):
                conv_dict['updated_at'] = conv_dict['updated_at'].isoformat()
            if conv_dict.get('last_read_at'):
                conv_dict['last_read_at'] = conv_dict['last_read_at'].isoformat()

            conversations.append(conv_dict)

        return {
            "conversations": conversations,
            "total": len(conversations),
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        print(f"[Chat API] Error fetching conversations for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch conversations: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/conversations")
async def create_conversation(
    request: CreateConversationRequest,
    user_id: int = Query(...)
):
    """
    Create a new conversation (direct or group).

    For direct conversations, checks for existing conversation between the two users.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Validate participants
        if not request.participant_user_ids:
            raise HTTPException(status_code=400, detail="At least one participant is required")

        # For direct conversations
        if request.type == "direct":
            if len(request.participant_user_ids) != 1:
                raise HTTPException(status_code=400, detail="Direct conversations must have exactly one other participant")

            other_user_id = request.participant_user_ids[0]

            # Check if conversation already exists
            existing_conv_id = get_or_create_direct_conversation(conn, user_id, other_user_id)

            if existing_conv_id:
                # Return existing conversation
                cur.execute("""
                    SELECT id, type, name, description, avatar_url, created_at, updated_at
                    FROM conversations
                    WHERE id = %s
                """, (existing_conv_id,))

                existing_conv = cur.fetchone()

                if existing_conv:
                    conv_dict = dict(existing_conv)

                    # Get other user's info for direct conversation
                    other_user_info = get_user_display_info(conn, other_user_id)
                    conv_dict['name'] = other_user_info['name']
                    conv_dict['avatar_url'] = other_user_info['avatar']
                    conv_dict['other_user_id'] = other_user_id

                    if conv_dict.get('created_at'):
                        conv_dict['created_at'] = conv_dict['created_at'].isoformat()
                    if conv_dict.get('updated_at'):
                        conv_dict['updated_at'] = conv_dict['updated_at'].isoformat()

                    return {
                        "conversation": conv_dict,
                        "message": "Existing conversation returned"
                    }

            # If we get here, get_or_create_direct_conversation failed
            raise HTTPException(status_code=500, detail="Failed to create conversation")

        # For group conversations
        else:
            if not request.name:
                raise HTTPException(status_code=400, detail="Group conversations must have a name")

            # Check privacy settings for all participants
            for participant_id in request.participant_user_ids:
                can_add, reason = check_can_add_to_group(conn, user_id, participant_id)
                if not can_add:
                    raise HTTPException(status_code=403, detail=f"Cannot add user {participant_id}: {reason}")

            # Create group conversation
            cur.execute("""
                INSERT INTO conversations (type, name, description, avatar_url, created_by_user_id, created_at, updated_at)
                VALUES ('group', %s, %s, %s, %s, NOW(), NOW())
                RETURNING id, type, name, description, avatar_url, created_at, updated_at
            """, (request.name, request.description, request.avatar_url, user_id))

            new_conv = cur.fetchone()
            conv_id = new_conv['id']

            # Add creator as admin
            cur.execute("""
                INSERT INTO conversation_participants
                (conversation_id, user_id, role, is_active, joined_at, created_at, updated_at)
                VALUES (%s, %s, 'admin', true, NOW(), NOW(), NOW())
            """, (conv_id, user_id))

            # Add other participants
            for participant_id in request.participant_user_ids:
                if participant_id != user_id:  # Don't add creator twice
                    cur.execute("""
                        INSERT INTO conversation_participants
                        (conversation_id, user_id, role, is_active, joined_at, created_at, updated_at)
                        VALUES (%s, %s, 'member', true, NOW(), NOW(), NOW())
                    """, (conv_id, participant_id))

            conn.commit()

            conv_dict = dict(new_conv)
            if conv_dict.get('created_at'):
                conv_dict['created_at'] = conv_dict['created_at'].isoformat()
            if conv_dict.get('updated_at'):
                conv_dict['updated_at'] = conv_dict['updated_at'].isoformat()

            return {
                "conversation": conv_dict,
                "message": "Group conversation created successfully"
            }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error creating conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/conversations/{conversation_id}")
async def get_conversation_details(
    conversation_id: int,
    user_id: int = Query(...)
):
    """
    Get detailed information about a specific conversation.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if user is a participant
        cur.execute("""
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = %s
            AND user_id = %s
            AND is_active = true
        """, (conversation_id, user_id))

        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="You are not a participant in this conversation")

        # Get conversation details
        cur.execute("""
            SELECT id, type, name, description, avatar_url,
                   created_by_user_id, created_at, updated_at
            FROM conversations
            WHERE id = %s
        """, (conversation_id,))

        conv = cur.fetchone()

        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conv_dict = dict(conv)

        # Get participants
        cur.execute("""
            SELECT cp.user_id, cp.role, cp.joined_at,
                   cp.is_muted, cp.is_archived
            FROM conversation_participants cp
            WHERE cp.conversation_id = %s
            AND cp.is_active = true
        """, (conversation_id,))

        participants = []
        for p in cur.fetchall():
            user_info = get_user_display_info(conn, p['user_id'])
            participants.append({
                "user_id": p['user_id'],
                "name": user_info['name'],
                "avatar": user_info['avatar'],
                "role": p['role'],
                "joined_at": p['joined_at'].isoformat() if p.get('joined_at') else None,
                "is_muted": p['is_muted'],
                "is_archived": p['is_archived']
            })

        conv_dict['participants'] = participants

        # For direct conversations, set name and avatar from other participant
        if conv_dict['type'] == 'direct' and len(participants) == 2:
            other_participant = next((p for p in participants if p['user_id'] != user_id), None)
            if other_participant:
                conv_dict['name'] = other_participant['name']
                conv_dict['avatar_url'] = other_participant['avatar']
                conv_dict['other_user_id'] = other_participant['user_id']

        # Format timestamps
        if conv_dict.get('created_at'):
            conv_dict['created_at'] = conv_dict['created_at'].isoformat()
        if conv_dict.get('updated_at'):
            conv_dict['updated_at'] = conv_dict['updated_at'].isoformat()

        return {"conversation": conv_dict}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Chat API] Error fetching conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch conversation: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/messages/{conversation_id}")
async def get_messages(
    conversation_id: int,
    user_id: int = Query(...),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    before_message_id: Optional[int] = Query(None)
):
    """
    Get messages from a conversation with pagination.

    Messages are returned in reverse chronological order (newest first).
    Automatically decrypts encrypted messages.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if user is a participant
        cur.execute("""
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = %s
            AND user_id = %s
            AND is_active = true
        """, (conversation_id, user_id))

        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="You are not a participant in this conversation")

        # Build query based on pagination method
        if before_message_id:
            # Fetch messages before a specific message (for infinite scroll)
            cur.execute("""
                SELECT m.id, m.sender_user_id, m.message_type, m.content,
                       m.media_url, m.media_metadata, m.is_edited, m.is_deleted,
                       m.reply_to_id, m.is_forwarded, m.forwarded_from_id,
                       m.forwarded_from_avatar, m.forwarded_from_id,
                       m.created_at, m.updated_at,
                       (SELECT COUNT(*) FROM message_reactions mr WHERE mr.message_id = m.id) as reaction_count
                FROM chat_messages m
                WHERE m.conversation_id = %s
                AND m.id < %s
                ORDER BY m.created_at DESC
                LIMIT %s
            """, (conversation_id, before_message_id, limit))
        else:
            # Standard offset pagination
            cur.execute("""
                SELECT m.id, m.sender_user_id, m.message_type, m.content,
                       m.media_url, m.media_metadata, m.is_edited, m.is_deleted,
                       m.reply_to_id, m.is_forwarded, m.forwarded_from_id,
                       m.forwarded_from_avatar, m.forwarded_from_id,
                       m.created_at, m.updated_at,
                       (SELECT COUNT(*) FROM message_reactions mr WHERE mr.message_id = m.id) as reaction_count
                FROM chat_messages m
                WHERE m.conversation_id = %s
                ORDER BY m.created_at DESC
                LIMIT %s OFFSET %s
            """, (conversation_id, limit, offset))

        messages = []

        for msg in cur.fetchall():
            msg_dict = dict(msg)

            # Decrypt content if encrypted
            if msg_dict.get('content') and not msg_dict.get('is_deleted'):
                try:
                    if is_encrypted(msg_dict['content']):
                        msg_dict['content'] = decrypt_message(msg_dict['content'])
                except Exception as e:
                    print(f"[Chat API] Error decrypting message {msg_dict['id']}: {e}")
                    msg_dict['content'] = "[Failed to decrypt message]"

            # Get sender info
            if msg_dict.get('sender_user_id'):
                sender_info = get_user_display_info(conn, msg_dict['sender_user_id'])
                msg_dict['sender_name'] = sender_info['name']
                msg_dict['sender_avatar'] = sender_info['avatar']

            # Get reactions
            cur.execute("""
                SELECT mr.reaction, mr.user_id, mr.created_at
                FROM message_reactions mr
                WHERE mr.message_id = %s
                ORDER BY mr.created_at ASC
            """, (msg_dict['id'],))

            reactions = []
            for reaction in cur.fetchall():
                reactor_info = get_user_display_info(conn, reaction['user_id'])
                reactions.append({
                    "reaction": reaction['reaction'],
                    "user_id": reaction['user_id'],
                    "reactor_name": reactor_info['name'],
                    "created_at": reaction['created_at'].isoformat()
                })

            msg_dict['reactions'] = reactions

            # Get reply-to message if exists
            if msg_dict.get('reply_to_id'):
                cur.execute("""
                    SELECT id, sender_user_id, content, message_type
                    FROM chat_messages
                    WHERE id = %s
                """, (msg_dict['reply_to_id'],))

                reply_to = cur.fetchone()
                if reply_to:
                    reply_to_dict = dict(reply_to)

                    # Decrypt reply content if needed
                    if reply_to_dict.get('content'):
                        try:
                            if is_encrypted(reply_to_dict['content']):
                                reply_to_dict['content'] = decrypt_message(reply_to_dict['content'])
                        except:
                            reply_to_dict['content'] = "[Encrypted]"

                    # Get reply sender info
                    if reply_to_dict.get('sender_user_id'):
                        reply_sender_info = get_user_display_info(conn, reply_to_dict['sender_user_id'])
                        reply_to_dict['sender_name'] = reply_sender_info['name']

                    msg_dict['reply_to'] = reply_to_dict

            # Check if message is pinned
            cur.execute("""
                SELECT 1 FROM pinned_messages
                WHERE message_id = %s
                AND conversation_id = %s
            """, (msg_dict['id'], conversation_id))

            msg_dict['is_pinned'] = cur.fetchone() is not None

            # Add is_mine flag to indicate if current user sent this message
            msg_dict['is_mine'] = msg_dict.get('sender_user_id') == user_id

            # Format timestamps
            if msg_dict.get('created_at'):
                msg_dict['created_at'] = msg_dict['created_at'].isoformat()
            if msg_dict.get('updated_at'):
                msg_dict['updated_at'] = msg_dict['updated_at'].isoformat()

            messages.append(msg_dict)

        # Update last_read_at for user
        cur.execute("""
            UPDATE conversation_participants
            SET last_read_at = NOW(), updated_at = NOW()
            WHERE conversation_id = %s
            AND user_id = %s
        """, (conversation_id, user_id))

        conn.commit()

        return {
            "messages": messages,
            "total": len(messages),
            "limit": limit,
            "offset": offset
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Chat API] Error fetching messages for conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch messages: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/messages")
async def send_message(
    request: SendMessageRequest,
    user_id: int = Query(...)
):
    """
    Send a message in a conversation.

    Automatically encrypts the message content.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if user is a participant
        cur.execute("""
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = %s
            AND user_id = %s
            AND is_active = true
        """, (request.conversation_id, user_id))

        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="You are not a participant in this conversation")

        # Encrypt content if it's a text message
        encrypted_content = request.content
        if request.message_type == "text" and request.content:
            try:
                encrypted_content = encrypt_message(request.content)
            except Exception as e:
                print(f"[Chat API] Warning: Failed to encrypt message: {e}")
                # Continue with unencrypted content

        # Insert message
        cur.execute("""
            INSERT INTO chat_messages
            (conversation_id, sender_user_id, message_type, content, media_url,
             media_metadata, reply_to_id, is_forwarded, forwarded_from_name,
             forwarded_from_avatar, forwarded_from_id,
             created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, conversation_id, sender_user_id, message_type, content,
                      media_url, media_metadata, reply_to_id, is_forwarded,
                      forwarded_from_name, forwarded_from_avatar, forwarded_from_id,
                      created_at, updated_at
        """, (
            request.conversation_id,
            user_id,
            request.message_type,
            encrypted_content,
            request.media_url,
            json.dumps(request.media_metadata) if request.media_metadata else None,
            request.reply_to_id,
            request.is_forwarded,
            request.forwarded_from,
            request.forwarded_from_avatar,
            request.forwarded_from_user_id  # Fixed: was forwarded_from_id
        ))

        new_message = cur.fetchone()
        msg_dict = dict(new_message)

        # Update conversation's updated_at
        cur.execute("""
            UPDATE conversations
            SET updated_at = NOW()
            WHERE id = %s
        """, (request.conversation_id,))

        # Update sender's last_read_at
        cur.execute("""
            UPDATE conversation_participants
            SET last_read_at = NOW(), updated_at = NOW()
            WHERE conversation_id = %s
            AND user_id = %s
        """, (request.conversation_id, user_id))

        conn.commit()

        # Decrypt content for response
        if msg_dict.get('content'):
            try:
                if is_encrypted(msg_dict['content']):
                    msg_dict['content'] = decrypt_message(msg_dict['content'])
            except:
                pass

        # Get sender info
        sender_info = get_user_display_info(conn, user_id)
        msg_dict['sender_name'] = sender_info['name']
        msg_dict['sender_avatar'] = sender_info['avatar']

        # Format timestamps
        if msg_dict.get('created_at'):
            msg_dict['created_at'] = msg_dict['created_at'].isoformat()
        if msg_dict.get('updated_at'):
            msg_dict['updated_at'] = msg_dict['updated_at'].isoformat()

        return {
            "message": msg_dict,
            "status": "sent"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error sending message: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.put("/messages/{message_id}")
async def edit_message(
    message_id: int,
    request: UpdateMessageRequest,
    user_id: int = Query(...)
):
    """
    Edit a message (only sender can edit).
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if message exists and user is the sender
        cur.execute("""
            SELECT sender_user_id, conversation_id
            FROM chat_messages
            WHERE id = %s
        """, (message_id,))

        message = cur.fetchone()

        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        if message['sender_user_id'] != user_id:
            raise HTTPException(status_code=403, detail="You can only edit your own messages")

        # Encrypt new content
        encrypted_content = request.content
        try:
            encrypted_content = encrypt_message(request.content)
        except Exception as e:
            print(f"[Chat API] Warning: Failed to encrypt edited message: {e}")

        # Update message
        cur.execute("""
            UPDATE messages
            SET content = %s, is_edited = true, updated_at = NOW()
            WHERE id = %s
            RETURNING id, content, is_edited, updated_at
        """, (encrypted_content, message_id))

        updated_message = cur.fetchone()
        conn.commit()

        msg_dict = dict(updated_message)

        # Decrypt for response
        if msg_dict.get('content'):
            try:
                if is_encrypted(msg_dict['content']):
                    msg_dict['content'] = decrypt_message(msg_dict['content'])
            except:
                pass

        if msg_dict.get('updated_at'):
            msg_dict['updated_at'] = msg_dict['updated_at'].isoformat()

        return {
            "message": msg_dict,
            "status": "updated"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error editing message {message_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to edit message: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    user_id: int = Query(...)
):
    """
    Delete a message (only sender can delete).
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if message exists and user is the sender
        cur.execute("""
            SELECT sender_user_id
            FROM chat_messages
            WHERE id = %s
        """, (message_id,))

        message = cur.fetchone()

        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        if message['sender_user_id'] != user_id:
            raise HTTPException(status_code=403, detail="You can only delete your own messages")

        # Soft delete
        cur.execute("""
            UPDATE messages
            SET is_deleted = true, content = '[Message deleted]', updated_at = NOW()
            WHERE id = %s
        """, (message_id,))

        conn.commit()

        return {"message": "Message deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error deleting message {message_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete message: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/messages/{message_id}/reactions")
async def add_reaction(
    message_id: int,
    request: ReactionRequest,
    user_id: int = Query(...)
):
    """
    Add a reaction to a message.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if message exists
        cur.execute("""
            SELECT conversation_id FROM chat_messages WHERE id = %s
        """, (message_id,))

        message = cur.fetchone()

        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Check if user is a participant in the conversation
        cur.execute("""
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = %s
            AND user_id = %s
            AND is_active = true
        """, (message['conversation_id'], user_id))

        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="You are not a participant in this conversation")

        # Insert or update reaction
        cur.execute("""
            INSERT INTO message_reactions (message_id, user_id, reaction, created_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (message_id, user_id)
            DO UPDATE SET reaction = EXCLUDED.reaction, created_at = NOW()
        """, (message_id, user_id, request.reaction))

        conn.commit()

        return {"message": "Reaction added successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error adding reaction to message {message_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add reaction: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.delete("/messages/{message_id}/reactions/{reaction}")
async def remove_reaction(
    message_id: int,
    reaction: str,
    user_id: int = Query(...)
):
    """
    Remove a reaction from a message.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Delete reaction
        cur.execute("""
            DELETE FROM message_reactions
            WHERE message_id = %s
            AND user_id = %s
            AND reaction = %s
        """, (message_id, user_id, reaction))

        conn.commit()

        return {"message": "Reaction removed successfully"}

    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error removing reaction from message {message_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove reaction: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/messages/{message_id}/pin")
async def pin_message(
    message_id: int,
    user_id: int = Query(...)
):
    """
    Pin a message in a conversation (admin/creator only).
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get message conversation
        cur.execute("""
            SELECT conversation_id FROM chat_messages WHERE id = %s
        """, (message_id,))

        message = cur.fetchone()

        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Check if user is admin or creator
        cur.execute("""
            SELECT role FROM conversation_participants
            WHERE conversation_id = %s
            AND user_id = %s
            AND is_active = true
        """, (message['conversation_id'], user_id))

        participant = cur.fetchone()

        if not participant or participant['role'] not in ['admin', 'owner']:
            raise HTTPException(status_code=403, detail="Only admins can pin messages")

        # Pin message
        cur.execute("""
            INSERT INTO pinned_messages (message_id, conversation_id, pinned_by_user_id, pinned_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (message_id, conversation_id) DO NOTHING
        """, (message_id, message['conversation_id'], user_id))

        conn.commit()

        return {"message": "Message pinned successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error pinning message {message_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to pin message: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.delete("/messages/{message_id}/pin")
async def unpin_message(
    message_id: int,
    user_id: int = Query(...)
):
    """
    Unpin a message from a conversation (admin/creator only).
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get message conversation
        cur.execute("""
            SELECT conversation_id FROM chat_messages WHERE id = %s
        """, (message_id,))

        message = cur.fetchone()

        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Check if user is admin or creator
        cur.execute("""
            SELECT role FROM conversation_participants
            WHERE conversation_id = %s
            AND user_id = %s
            AND is_active = true
        """, (message['conversation_id'], user_id))

        participant = cur.fetchone()

        if not participant or participant['role'] not in ['admin', 'owner']:
            raise HTTPException(status_code=403, detail="Only admins can unpin messages")

        # Unpin message
        cur.execute("""
            DELETE FROM pinned_messages
            WHERE message_id = %s
            AND conversation_id = %s
        """, (message_id, message['conversation_id']))

        conn.commit()

        return {"message": "Message unpinned successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error unpinning message {message_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to unpin message: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/groups")
async def create_group(
    request: CreateGroupRequest,
    user_id: int = Query(...)
):
    """
    Create a new group conversation.
    """
    # Use the standard create_conversation endpoint
    conv_request = CreateConversationRequest(
        type="group",
        name=request.name,
        description=request.description,
        participant_user_ids=request.participant_user_ids
    )

    return await create_conversation(conv_request, user_id)


@router.post("/conversations/{conversation_id}/participants")
async def add_participants(
    conversation_id: int,
    request: AddParticipantsRequest,
    user_id: int = Query(...)
):
    """
    Add participants to a group conversation (admin only).
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if conversation is a group
        cur.execute("""
            SELECT type FROM conversations WHERE id = %s
        """, (conversation_id,))

        conv = cur.fetchone()

        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

        if conv['type'] != 'group':
            raise HTTPException(status_code=400, detail="Can only add participants to group conversations")

        # Check if user is admin
        cur.execute("""
            SELECT role FROM conversation_participants
            WHERE conversation_id = %s
            AND user_id = %s
            AND is_active = true
        """, (conversation_id, user_id))

        participant = cur.fetchone()

        if not participant or participant['role'] not in ['admin', 'owner']:
            raise HTTPException(status_code=403, detail="Only admins can add participants")

        # Check privacy settings for all new participants
        for new_participant_id in request.participant_user_ids:
            can_add, reason = check_can_add_to_group(conn, user_id, new_participant_id)
            if not can_add:
                raise HTTPException(status_code=403, detail=f"Cannot add user {new_participant_id}: {reason}")

        # Add participants
        added_count = 0
        for new_participant_id in request.participant_user_ids:
            # Check if already a participant
            cur.execute("""
                SELECT 1 FROM conversation_participants
                WHERE conversation_id = %s
                AND user_id = %s
            """, (conversation_id, new_participant_id))

            if not cur.fetchone():
                # Add as member
                cur.execute("""
                    INSERT INTO conversation_participants
                    (conversation_id, user_id, role, is_active, joined_at, created_at, updated_at)
                    VALUES (%s, %s, 'member', true, NOW(), NOW(), NOW())
                """, (conversation_id, new_participant_id))
                added_count += 1

        conn.commit()

        return {
            "message": f"Added {added_count} participant(s) successfully",
            "added_count": added_count
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error adding participants to conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add participants: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.delete("/conversations/{conversation_id}/participants/{participant_user_id}")
async def remove_participant(
    conversation_id: int,
    participant_user_id: int,
    user_id: int = Query(...)
):
    """
    Remove a participant from a group conversation (admin only or self-removal).
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if user is admin or removing themselves
        cur.execute("""
            SELECT role FROM conversation_participants
            WHERE conversation_id = %s
            AND user_id = %s
            AND is_active = true
        """, (conversation_id, user_id))

        participant = cur.fetchone()

        if not participant:
            raise HTTPException(status_code=403, detail="You are not a participant in this conversation")

        # Allow self-removal or admin removal
        if participant_user_id != user_id and participant['role'] not in ['admin', 'owner']:
            raise HTTPException(status_code=403, detail="Only admins can remove other participants")

        # Remove participant (soft delete)
        cur.execute("""
            UPDATE conversation_participants
            SET is_active = false, updated_at = NOW()
            WHERE conversation_id = %s
            AND user_id = %s
        """, (conversation_id, participant_user_id))

        conn.commit()

        return {"message": "Participant removed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error removing participant from conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove participant: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.put("/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: int,
    name: Optional[str] = Body(None),
    description: Optional[str] = Body(None),
    avatar_url: Optional[str] = Body(None),
    user_id: int = Query(...)
):
    """
    Update conversation details (admin only).
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if user is admin
        cur.execute("""
            SELECT role FROM conversation_participants
            WHERE conversation_id = %s
            AND user_id = %s
            AND is_active = true
        """, (conversation_id, user_id))

        participant = cur.fetchone()

        if not participant or participant['role'] not in ['admin', 'owner']:
            raise HTTPException(status_code=403, detail="Only admins can update conversation details")

        # Build update query
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

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        updates.append("updated_at = NOW()")
        params.append(conversation_id)

        # Update conversation
        cur.execute(f"""
            UPDATE conversations
            SET {', '.join(updates)}
            WHERE id = %s
            RETURNING id, type, name, description, avatar_url, updated_at
        """, params)

        updated_conv = cur.fetchone()
        conn.commit()

        conv_dict = dict(updated_conv)
        if conv_dict.get('updated_at'):
            conv_dict['updated_at'] = conv_dict['updated_at'].isoformat()

        return {
            "conversation": conv_dict,
            "message": "Conversation updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error updating conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update conversation: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/block")
async def block_contact(
    request: BlockContactRequest,
    user_id: int = Query(...)
):
    """
    Block a user.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Insert block record
        cur.execute("""
            INSERT INTO blocked_chat_contacts
            (blocker_user_id, blocked_user_id, reason, is_active, created_at)
            VALUES (%s, %s, %s, true, NOW())
            ON CONFLICT (blocker_user_id, blocked_user_id)
            DO UPDATE SET is_active = true, reason = EXCLUDED.reason, created_at = NOW()
        """, (user_id, request.blocked_user_id, request.reason))

        conn.commit()

        return {"message": "User blocked successfully"}

    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error blocking user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to block user: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.delete("/block/{blocked_user_id}")
async def unblock_contact(
    blocked_user_id: int,
    user_id: int = Query(...)
):
    """
    Unblock a user.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Update block record
        cur.execute("""
            UPDATE blocked_chat_contacts
            SET is_active = false
            WHERE blocker_user_id = %s
            AND blocked_user_id = %s
        """, (user_id, blocked_user_id))

        conn.commit()

        return {"message": "User unblocked successfully"}

    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error unblocking user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to unblock user: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/blocked")
async def get_blocked_contacts(user_id: int = Query(...)):
    """
    Get all blocked contacts for a user.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT blocked_user_id, reason, blocked_at
            FROM blocked_chat_contacts
            WHERE blocker_user_id = %s
            ORDER BY blocked_at DESC
        """, (user_id,))

        blocked_list = []

        for block in cur.fetchall():
            blocked_info = get_user_display_info(conn, block['blocked_user_id'])
            blocked_list.append({
                "user_id": block['blocked_user_id'],
                "name": blocked_info['name'],
                "avatar": blocked_info['avatar'],
                "reason": block['reason'],
                "blocked_at": block['blocked_at'].isoformat() if block['blocked_at'] else None
            })

        return {"blocked_contacts": blocked_list}

    except Exception as e:
        print(f"[Chat API] Error fetching blocked contacts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch blocked contacts: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/calls")
async def initiate_call(
    conversation_id: int = Body(...),
    call_type: str = Body(..., regex="^(audio|video)$"),
    user_id: int = Query(...)
):
    """
    Initiate a call in a conversation.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if user is a participant
        cur.execute("""
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = %s
            AND user_id = %s
            AND is_active = true
        """, (conversation_id, user_id))

        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="You are not a participant in this conversation")

        # For direct conversations, check call privacy
        cur.execute("""
            SELECT type FROM conversations WHERE id = %s
        """, (conversation_id,))

        conv = cur.fetchone()

        if conv and conv['type'] == 'direct':
            # Get other participant
            cur.execute("""
                SELECT user_id
                FROM conversation_participants
                WHERE conversation_id = %s
                AND user_id != %s
                AND is_active = true
                LIMIT 1
            """, (conversation_id, user_id))

            other_participant = cur.fetchone()

            if other_participant:
                can_call, reason = check_can_call(conn, user_id, other_participant['user_id'])
                if not can_call:
                    raise HTTPException(status_code=403, detail=reason)

        # Create call log
        cur.execute("""
            INSERT INTO call_logs
            (conversation_id, caller_user_id, call_type, status, started_at, created_at)
            VALUES (%s, %s, %s, 'initiated', NOW(), NOW())
            RETURNING id, conversation_id, caller_user_id, call_type, status, started_at
        """, (conversation_id, user_id, call_type))

        call = cur.fetchone()
        conn.commit()

        call_dict = dict(call)
        if call_dict.get('started_at'):
            call_dict['started_at'] = call_dict['started_at'].isoformat()

        return {
            "call": call_dict,
            "message": "Call initiated"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error initiating call: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate call: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.put("/calls/{call_id}")
async def update_call_status(
    call_id: int,
    status: str = Body(..., regex="^(answered|missed|declined|ended)$"),
    user_id: int = Query(...)
):
    """
    Update call status.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get call info
        cur.execute("""
            SELECT conversation_id, caller_user_id
            FROM call_logs
            WHERE id = %s
        """, (call_id,))

        call = cur.fetchone()

        if not call:
            raise HTTPException(status_code=404, detail="Call not found")

        # Check if user is a participant
        cur.execute("""
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = %s
            AND user_id = %s
            AND is_active = true
        """, (call['conversation_id'], user_id))

        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="You are not a participant in this conversation")

        # Update call status
        if status == 'ended':
            cur.execute("""
                UPDATE call_logs
                SET status = %s, ended_at = NOW()
                WHERE id = %s
                RETURNING id, status, ended_at
            """, (status, call_id))
        else:
            cur.execute("""
                UPDATE call_logs
                SET status = %s
                WHERE id = %s
                RETURNING id, status
            """, (status, call_id))

        updated_call = cur.fetchone()
        conn.commit()

        call_dict = dict(updated_call)
        if call_dict.get('ended_at'):
            call_dict['ended_at'] = call_dict['ended_at'].isoformat()

        return {
            "call": call_dict,
            "message": f"Call status updated to {status}"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error updating call status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update call status: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/calls")
async def get_call_history(
    user_id: int = Query(...),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Get call history for a user.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get calls from conversations where user is a participant
        cur.execute("""
            SELECT cl.id, cl.conversation_id, cl.caller_user_id,
                   cl.call_type, cl.status, cl.started_at, cl.ended_at,
                   c.type as conversation_type
            FROM call_logs cl
            JOIN conversations c ON c.id = cl.conversation_id
            JOIN conversation_participants cp ON cp.conversation_id = c.id
            WHERE cp.user_id = %s
            AND cp.is_active = true
            ORDER BY cl.started_at DESC
            LIMIT %s OFFSET %s
        """, (user_id, limit, offset))

        calls = []

        for call in cur.fetchall():
            call_dict = dict(call)

            # Get caller info
            caller_info = get_user_display_info(conn, call['caller_user_id'])
            call_dict['caller_name'] = caller_info['name']
            call_dict['caller_avatar'] = caller_info['avatar']

            # Format timestamps
            if call_dict.get('started_at'):
                call_dict['started_at'] = call_dict['started_at'].isoformat()
            if call_dict.get('ended_at'):
                call_dict['ended_at'] = call_dict['ended_at'].isoformat()

            calls.append(call_dict)

        return {
            "calls": calls,
            "total": len(calls),
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        print(f"[Chat API] Error fetching call history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch call history: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.delete("/conversations/{conversation_id}/history")
async def clear_chat_history(
    conversation_id: int,
    user_id: int = Query(...)
):
    """
    Clear chat history for a user in a conversation.

    This only affects the user's view - messages are not deleted for others.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if user is a participant
        cur.execute("""
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = %s
            AND user_id = %s
            AND is_active = true
        """, (conversation_id, user_id))

        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="You are not a participant in this conversation")

        # Update last_read_at to now (effectively hiding all previous messages)
        cur.execute("""
            UPDATE conversation_participants
            SET last_read_at = NOW(), updated_at = NOW()
            WHERE conversation_id = %s
            AND user_id = %s
        """, (conversation_id, user_id))

        conn.commit()

        return {"message": "Chat history cleared successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error clearing chat history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear chat history: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/conversations/{conversation_id}/read-status")
async def get_message_read_status(
    conversation_id: int,
    user_id: int = Query(...)
):
    """
    Get read status for messages in a conversation.

    Shows which participants have read which messages.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if user is a participant
        cur.execute("""
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = %s
            AND user_id = %s
            AND is_active = true
        """, (conversation_id, user_id))

        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="You are not a participant in this conversation")

        # Get all participants and their last_read_at times
        cur.execute("""
            SELECT cp.user_id, cp.last_read_at
            FROM conversation_participants cp
            WHERE cp.conversation_id = %s
            AND cp.is_active = true
        """, (conversation_id,))

        read_status = []

        for participant in cur.fetchall():
            user_info = get_user_display_info(conn, participant['user_id'])
            read_status.append({
                "user_id": participant['user_id'],
                "name": user_info['name'],
                "avatar": user_info['avatar'],
                "last_read_at": participant['last_read_at'].isoformat() if participant.get('last_read_at') else None
            })

        return {"read_status": read_status}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Chat API] Error fetching read status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch read status: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/conversations/{conversation_id}/typing-allowed")
async def check_typing_allowed(
    conversation_id: int,
    user_id: int = Query(...)
):
    """
    Check if typing indicators are allowed for this conversation.

    Returns allowed=false if any participant has disabled typing indicators.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get all participants
        cur.execute("""
            SELECT user_id
            FROM conversation_participants
            WHERE conversation_id = %s
            AND is_active = true
        """, (conversation_id,))

        participants = cur.fetchall()

        # Check if all participants allow typing indicators
        for p in participants:
            settings = get_user_privacy_settings(conn, p['user_id'])
            if not settings.get('typing_indicators', True):
                return {"allowed": False}

        return {"allowed": True}

    except Exception as e:
        print(f"[Chat API] Error checking typing indicators: {e}")
        return {"allowed": True}  # Default to allowed on error
    finally:
        cur.close()
        conn.close()


@router.post("/conversations/{conversation_id}/typing")
async def update_typing_status(
    conversation_id: int,
    user_id: int = Query(...),
    is_typing: bool = Body(..., embed=True)
):
    """
    Update typing status for a user in a conversation.
    """
    try:
        # Get user info
        conn = get_db_connection()
        user_info = get_user_display_info(conn, user_id)
        conn.close()

        with _typing_lock:
            if conversation_id not in _typing_status:
                _typing_status[conversation_id] = {}

            if is_typing:
                _typing_status[conversation_id][user_id] = {
                    "is_typing": True,
                    "timestamp": datetime.now(),
                    "user_name": user_info['name'],
                    "avatar": user_info['avatar']
                }
            else:
                # Remove typing status
                _typing_status[conversation_id].pop(user_id, None)

                # Clean up empty conversation entries
                if not _typing_status[conversation_id]:
                    del _typing_status[conversation_id]

        return {"message": "Typing status updated"}

    except Exception as e:
        print(f"[Chat API] Error updating typing status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update typing status: {str(e)}")


@router.get("/conversations/{conversation_id}/typing")
async def get_typing_status(
    conversation_id: int,
    user_id: int = Query(...)
):
    """
    Get typing status for a conversation.

    Returns list of users currently typing (excluding the requesting user).
    """
    try:
        # Clean expired statuses
        _clean_expired_typing()

        with _typing_lock:
            if conversation_id not in _typing_status:
                return {"typing_users": []}

            typing_users = []

            for typing_user_id, status in _typing_status[conversation_id].items():
                # Exclude the requesting user
                if typing_user_id != user_id and status["is_typing"]:
                    typing_users.append({
                        "user_id": typing_user_id,
                        "name": status["user_name"],
                        "avatar": status["avatar"]
                    })

            return {"typing_users": typing_users}

    except Exception as e:
        print(f"[Chat API] Error getting typing status: {e}")
        return {"typing_users": []}


@router.get("/users/{target_user_id}/status")
async def get_user_online_status(
    target_user_id: int,
    user_id: int = Query(...)
):
    """
    Get online status and last seen for a user.

    Respects privacy settings.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check privacy settings
        settings = get_user_privacy_settings(conn, target_user_id)
        online_status_visibility = settings.get('online_status', True)
        last_seen_visibility = settings.get('last_seen_visibility', 'everyone')

        # Get user's online status from active sessions
        cur.execute("""
            SELECT last_active_at, is_online
            FROM chat_active_sessions
            WHERE user_id = %s
            ORDER BY last_active_at DESC
            LIMIT 1
        """, (target_user_id,))

        session = cur.fetchone()

        response = {
            "user_id": target_user_id,
            "is_online": False,
            "last_seen": None
        }

        if session:
            # Check if should show online status
            if online_status_visibility:
                response['is_online'] = session.get('is_online', False)

            # Check if should show last seen
            if last_seen_visibility == 'everyone':
                response['last_seen'] = session['last_active_at'].isoformat() if session.get('last_active_at') else None
            elif last_seen_visibility == 'connections':
                # Check if users are connected
                if are_users_connected(conn, user_id, target_user_id):
                    response['last_seen'] = session['last_active_at'].isoformat() if session.get('last_active_at') else None

        return response

    except Exception as e:
        print(f"[Chat API] Error getting user status: {e}")
        return {
            "user_id": target_user_id,
            "is_online": False,
            "last_seen": None
        }
    finally:
        cur.close()
        conn.close()


@router.get("/users/online-status")
async def get_multiple_users_status(
    user_ids: str = Query(...),  # Comma-separated list
    user_id: int = Query(...)
):
    """
    Get online status for multiple users at once.
    """
    try:
        # Parse user IDs
        target_user_ids = [int(uid.strip()) for uid in user_ids.split(',')]

        statuses = []

        for target_user_id in target_user_ids:
            status = await get_user_online_status(target_user_id, user_id)
            statuses.append(status)

        return {"statuses": statuses}

    except Exception as e:
        print(f"[Chat API] Error getting multiple user statuses: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user statuses: {str(e)}")


@router.post("/users/status/update")
async def update_user_status(
    user_id: int = Query(...),
    device_name: str = Query(None),
    device_type: str = Query(None),
    browser: str = Query(None),
    os: str = Query(None),
    is_online: bool = Query(True)  # Default to true when heartbeat is sent
):
    """
    Update user's online status and active session info.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Update or insert active session in chat_active_sessions table
        cur.execute("""
            INSERT INTO chat_active_sessions (
                user_id, device_type, device_name, browser, os,
                is_online, last_active_at, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (user_id, device_name)
            DO UPDATE SET
                is_online = EXCLUDED.is_online,
                last_active_at = NOW(),
                browser = EXCLUDED.browser,
                os = EXCLUDED.os,
                device_type = EXCLUDED.device_type
        """, (user_id, device_type, device_name, browser, os, is_online))

        conn.commit()

        return {"message": "Status updated successfully"}

    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error updating user status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/sessions")
async def get_active_sessions(user_id: int = Query(...)):
    """
    Get all active sessions for a user.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id, user_id, device_type, device_name, ip_address,
                   last_active_at, is_online, created_at
            FROM user_sessions
            WHERE user_id = %s
            ORDER BY last_active_at DESC
        """, (user_id,))

        sessions = []

        for session in cur.fetchall():
            session_dict = dict(session)

            if session_dict.get('last_active_at'):
                session_dict['last_active_at'] = session_dict['last_active_at'].isoformat()
            if session_dict.get('created_at'):
                session_dict['created_at'] = session_dict['created_at'].isoformat()

            sessions.append(session_dict)

        return {"sessions": sessions}

    except Exception as e:
        print(f"[Chat API] Error fetching sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch sessions: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.delete("/sessions/{session_id}")
async def terminate_session(
    session_id: int,
    user_id: int = Query(...)
):
    """
    Terminate a specific session.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify session belongs to user
        cur.execute("""
            SELECT user_id FROM user_sessions WHERE id = %s
        """, (session_id,))

        session = cur.fetchone()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        if session['user_id'] != user_id:
            raise HTTPException(status_code=403, detail="Cannot terminate another user's session")

        # Delete session
        cur.execute("""
            DELETE FROM user_sessions WHERE id = %s
        """, (session_id,))

        conn.commit()

        return {"message": "Session terminated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error terminating session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to terminate session: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.delete("/sessions")
async def terminate_all_sessions(user_id: int = Query(...)):
    """
    Terminate all sessions except current one.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Delete all sessions for user
        cur.execute("""
            DELETE FROM user_sessions WHERE user_id = %s
        """, (user_id,))

        conn.commit()

        return {"message": "All sessions terminated successfully"}

    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error terminating all sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to terminate sessions: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/sessions/register")
async def register_session(
    device_type: str = Body(...),
    device_name: str = Body(...),
    ip_address: str = Body(...),
    user_id: int = Query(...)
):
    """
    Register a new session for a user.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO user_sessions
            (user_id, device_type, device_name, ip_address, is_online, last_active_at, created_at)
            VALUES (%s, %s, %s, %s, true, NOW(), NOW())
            RETURNING id, user_id, device_type, device_name, created_at
        """, (user_id, device_type, device_name, ip_address))

        session = cur.fetchone()
        conn.commit()

        session_dict = dict(session)
        if session_dict.get('created_at'):
            session_dict['created_at'] = session_dict['created_at'].isoformat()

        return {
            "session": session_dict,
            "message": "Session registered successfully"
        }

    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error registering session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to register session: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.put("/conversations/{conversation_id}/mute")
async def mute_conversation(
    conversation_id: int,
    is_muted: bool = Body(...),
    user_id: int = Query(...)
):
    """
    Mute or unmute a conversation.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE conversation_participants
            SET is_muted = %s, updated_at = NOW()
            WHERE conversation_id = %s
            AND user_id = %s
        """, (is_muted, conversation_id, user_id))

        conn.commit()

        action = "muted" if is_muted else "unmuted"
        return {"message": f"Conversation {action} successfully"}

    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error muting conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mute conversation: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.put("/conversations/{conversation_id}/archive")
async def archive_conversation(
    conversation_id: int,
    is_archived: bool = Body(...),
    user_id: int = Query(...)
):
    """
    Archive or unarchive a conversation.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE conversation_participants
            SET is_archived = %s, updated_at = NOW()
            WHERE conversation_id = %s
            AND user_id = %s
        """, (is_archived, conversation_id, user_id))

        conn.commit()

        action = "archived" if is_archived else "unarchived"
        return {"message": f"Conversation {action} successfully"}

    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error archiving conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to archive conversation: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/security/two-step")
async def get_two_step_settings(user_id: int = Query(...)):
    """
    Get two-step verification settings for user.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT is_enabled, recovery_email
            FROM chat_two_step_verification
            WHERE user_id = %s
        """, (user_id,))

        settings = cur.fetchone()

        if settings:
            return {
                "is_enabled": settings['is_enabled'],
                "has_recovery_email": bool(settings.get('recovery_email'))
            }

        return {
            "is_enabled": False,
            "has_recovery_email": False
        }

    except Exception as e:
        print(f"[Chat API] Error fetching two-step settings: {e}")
        return {
            "is_enabled": False,
            "has_recovery_email": False
        }
    finally:
        cur.close()
        conn.close()


@router.post("/security/two-step/enable")
async def enable_two_step_verification(
    password: str = Body(...),
    recovery_email: Optional[str] = Body(None),
    user_id: int = Query(...)
):
    """
    Enable two-step verification.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Hash password (you should use bcrypt or similar)
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        cur.execute("""
            INSERT INTO chat_two_step_verification
            (user_id, password_hash, recovery_email, is_enabled, created_at)
            VALUES (%s, %s, %s, true, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                recovery_email = EXCLUDED.recovery_email,
                is_enabled = true,
                updated_at = NOW()
        """, (user_id, password_hash, recovery_email))

        conn.commit()

        return {"message": "Two-step verification enabled successfully"}

    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error enabling two-step verification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to enable two-step verification: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/security/two-step/disable")
async def disable_two_step_verification(
    password: str = Body(...),
    user_id: int = Query(...)
):
    """
    Disable two-step verification.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify password
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        cur.execute("""
            SELECT password_hash FROM chat_two_step_verification
            WHERE user_id = %s AND is_enabled = true
        """, (user_id,))

        settings = cur.fetchone()

        if not settings:
            raise HTTPException(status_code=404, detail="Two-step verification not enabled")

        if settings['password_hash'] != password_hash:
            raise HTTPException(status_code=403, detail="Incorrect password")

        # Disable two-step verification
        cur.execute("""
            UPDATE chat_two_step_verification
            SET is_enabled = false, updated_at = NOW()
            WHERE user_id = %s
        """, (user_id,))

        conn.commit()

        return {"message": "Two-step verification disabled successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error disabling two-step verification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disable two-step verification: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/security/two-step/change-password")
async def change_two_step_password(
    current_password: str = Body(...),
    new_password: str = Body(...),
    user_id: int = Query(...)
):
    """
    Change two-step verification password.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        import hashlib
        current_hash = hashlib.sha256(current_password.encode()).hexdigest()
        new_hash = hashlib.sha256(new_password.encode()).hexdigest()

        # Verify current password
        cur.execute("""
            SELECT password_hash FROM chat_two_step_verification
            WHERE user_id = %s AND is_enabled = true
        """, (user_id,))

        settings = cur.fetchone()

        if not settings:
            raise HTTPException(status_code=404, detail="Two-step verification not enabled")

        if settings['password_hash'] != current_hash:
            raise HTTPException(status_code=403, detail="Incorrect current password")

        # Update password
        cur.execute("""
            UPDATE chat_two_step_verification
            SET password_hash = %s, updated_at = NOW()
            WHERE user_id = %s
        """, (new_hash, user_id))

        conn.commit()

        return {"message": "Password changed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error changing password: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/security/two-step/change-email")
async def change_recovery_email(
    password: str = Body(...),
    new_email: str = Body(...),
    user_id: int = Query(...)
):
    """
    Change recovery email for two-step verification.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        # Verify password
        cur.execute("""
            SELECT password_hash FROM chat_two_step_verification
            WHERE user_id = %s AND is_enabled = true
        """, (user_id,))

        settings = cur.fetchone()

        if not settings:
            raise HTTPException(status_code=404, detail="Two-step verification not enabled")

        if settings['password_hash'] != password_hash:
            raise HTTPException(status_code=403, detail="Incorrect password")

        # Update email
        cur.execute("""
            UPDATE chat_two_step_verification
            SET recovery_email = %s, updated_at = NOW()
            WHERE user_id = %s
        """, (new_email, user_id))

        conn.commit()

        return {"message": "Recovery email updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error changing recovery email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to change recovery email: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/security/two-step/verify")
async def verify_two_step_password(
    password: str = Body(...),
    user_id: int = Query(...)
):
    """
    Verify two-step verification password.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        cur.execute("""
            SELECT password_hash FROM chat_two_step_verification
            WHERE user_id = %s AND is_enabled = true
        """, (user_id,))

        settings = cur.fetchone()

        if not settings:
            raise HTTPException(status_code=404, detail="Two-step verification not enabled")

        if settings['password_hash'] == password_hash:
            return {"verified": True}
        else:
            return {"verified": False}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Chat API] Error verifying password: {e}")
        return {"verified": False}
    finally:
        cur.close()
        conn.close()


@router.post("/security/two-step/forgot")
async def forgot_two_step_password(
    user_id: int = Query(...)
):
    """
    Send recovery email for two-step verification.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get recovery email
        cur.execute("""
            SELECT recovery_email FROM chat_two_step_verification
            WHERE user_id = %s AND is_enabled = true
        """, (user_id,))

        settings = cur.fetchone()

        if not settings or not settings.get('recovery_email'):
            raise HTTPException(status_code=404, detail="No recovery email configured")

        # Generate reset token (you should implement proper token generation)
        import secrets
        reset_token = secrets.token_urlsafe(32)

        # Store reset token with expiry
        cur.execute("""
            INSERT INTO chat_password_reset_tokens
            (user_id, reset_token, expires_at, created_at)
            VALUES (%s, %s, NOW() + INTERVAL '1 hour', NOW())
        """, (user_id, reset_token))

        conn.commit()

        # Send email (implement email sending logic)
        # email_service.send_password_reset(settings['recovery_email'], reset_token)

        return {
            "message": "Recovery email sent",
            "email": settings['recovery_email'][:3] + "***"  # Partially hide email
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error sending recovery email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send recovery email: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/security/two-step/reset")
async def reset_two_step_password(
    reset_token: str = Body(...),
    new_password: str = Body(...),
    user_id: int = Query(...)
):
    """
    Reset two-step verification password using recovery token.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify reset token
        cur.execute("""
            SELECT user_id FROM chat_password_reset_tokens
            WHERE user_id = %s
            AND reset_token = %s
            AND expires_at > NOW()
            AND used_at IS NULL
        """, (user_id, reset_token))

        token_record = cur.fetchone()

        if not token_record:
            raise HTTPException(status_code=403, detail="Invalid or expired reset token")

        # Hash new password
        import hashlib
        new_hash = hashlib.sha256(new_password.encode()).hexdigest()

        # Update password
        cur.execute("""
            UPDATE chat_two_step_verification
            SET password_hash = %s, updated_at = NOW()
            WHERE user_id = %s
        """, (new_hash, user_id))

        # Mark token as used
        cur.execute("""
            UPDATE chat_password_reset_tokens
            SET used_at = NOW()
            WHERE reset_token = %s
        """, (reset_token,))

        conn.commit()

        return {"message": "Password reset successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error resetting password: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset password: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/settings")
async def get_chat_settings(user_id: int = Query(...)):
    """
    Get all chat settings for a user.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        settings = get_user_privacy_settings(conn, user_id)

        return {"settings": settings}

    except Exception as e:
        print(f"[Chat API] Error fetching chat settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch settings: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.put("/settings")
async def update_chat_settings(
    who_can_message: Optional[str] = Body(None),
    read_receipts: Optional[bool] = Body(None),
    online_status: Optional[bool] = Body(None),
    typing_indicators: Optional[bool] = Body(None),
    last_seen_visibility: Optional[str] = Body(None),
    block_screenshots: Optional[bool] = Body(None),
    disable_forwarding: Optional[bool] = Body(None),
    allow_calls_from: Optional[str] = Body(None),
    allow_group_adds: Optional[str] = Body(None),
    allow_channel_adds: Optional[str] = Body(None),
    user_id: int = Query(...)
):
    """
    Update chat settings for a user.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Build update query
        updates = []
        params = []

        if who_can_message is not None:
            updates.append("who_can_message = %s")
            params.append(who_can_message)

        if read_receipts is not None:
            updates.append("read_receipts = %s")
            params.append(read_receipts)

        if online_status is not None:
            updates.append("online_status = %s")
            params.append(online_status)

        if typing_indicators is not None:
            updates.append("typing_indicators = %s")
            params.append(typing_indicators)

        if last_seen_visibility is not None:
            updates.append("last_seen_visibility = %s")
            params.append(last_seen_visibility)

        if block_screenshots is not None:
            updates.append("block_screenshots = %s")
            params.append(block_screenshots)

        if disable_forwarding is not None:
            updates.append("disable_forwarding = %s")
            params.append(disable_forwarding)

        if allow_calls_from is not None:
            updates.append("allow_calls_from = %s")
            params.append(allow_calls_from)

        if allow_group_adds is not None:
            updates.append("allow_group_adds = %s")
            params.append(allow_group_adds)

        if allow_channel_adds is not None:
            updates.append("allow_channel_adds = %s")
            params.append(allow_channel_adds)

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        updates.append("updated_at = NOW()")
        params.append(user_id)

        # Update or insert settings
        cur.execute(f"""
            INSERT INTO chat_settings (user_id, {', '.join([u.split(' = ')[0] for u in updates if 'updated_at' not in u])}, updated_at)
            VALUES (%s, {', '.join(['%s'] * (len(params) - 1))}, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET {', '.join(updates)}
            WHERE chat_settings.user_id = %s
            RETURNING *
        """, [user_id] + params[:-1] + [user_id])

        updated_settings = cur.fetchone()
        conn.commit()

        return {
            "settings": dict(updated_settings),
            "message": "Settings updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error updating chat settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.delete("/data")
async def delete_all_chat_data(
    user_id: int = Query(...),
    confirm: bool = Query(...)
):
    """
    Delete all chat data for a user (GDPR compliance).

    This is irreversible and will delete:
    - All messages sent by the user
    - All conversations created by the user
    - All participant records
    - All blocked contacts
    - All settings
    - All two-step verification data
    """
    if not confirm:
        raise HTTPException(status_code=400, detail="Must confirm deletion")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Delete messages
        cur.execute("""
            DELETE FROM chat_messages WHERE sender_user_id = %s
        """, (user_id,))

        # Delete conversation participants
        cur.execute("""
            DELETE FROM conversation_participants WHERE user_id = %s
        """, (user_id,))

        # Delete conversations created by user
        cur.execute("""
            DELETE FROM conversations WHERE created_by_user_id = %s
        """, (user_id,))

        # Delete blocked contacts
        cur.execute("""
            DELETE FROM blocked_chat_contacts
            WHERE blocker_user_id = %s OR blocked_user_id = %s
        """, (user_id, user_id))

        # Delete settings
        cur.execute("""
            DELETE FROM chat_settings WHERE user_id = %s
        """, (user_id,))

        # Delete two-step verification
        cur.execute("""
            DELETE FROM chat_two_step_verification WHERE user_id = %s
        """, (user_id,))

        # Delete sessions
        cur.execute("""
            DELETE FROM user_sessions WHERE user_id = %s
        """, (user_id,))

        conn.commit()

        return {"message": "All chat data deleted successfully"}

    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error deleting chat data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete chat data: {str(e)}")
    finally:
        cur.close()
        conn.close()


# ============================================================================
# POLLS ENDPOINTS (Stubs - Not Yet Implemented)
# ============================================================================

@router.get("/polls/conversation/{conversation_id}")
async def get_conversation_polls(
    conversation_id: int,
    user_id: int = Query(...),
    current_user=Depends(get_current_user)
):
    """Get all polls in a conversation (stub - returns empty list)"""
    return {"polls": []}


@router.post("/polls")
async def create_poll(
    user_id: int = Query(...),
    conversation_id: int = Body(...),
    question: str = Body(...),
    options: List[str] = Body(...),
    current_user=Depends(get_current_user)
):
    """Create a new poll (stub - not implemented)"""
    raise HTTPException(
        status_code=501,
        detail="Polls feature is not yet implemented"
    )


@router.post("/polls/{poll_id}/vote")
async def vote_on_poll(
    poll_id: int,
    user_id: int = Query(...),
    option_index: int = Body(...),
    current_user=Depends(get_current_user)
):
    """Vote on a poll (stub - not implemented)"""
    raise HTTPException(
        status_code=501,
        detail="Polls feature is not yet implemented"
    )


@router.delete("/polls/{poll_id}")
async def delete_poll(
    poll_id: int,
    user_id: int = Query(...),
    current_user=Depends(get_current_user)
):
    """Delete a poll (stub - not implemented)"""
    raise HTTPException(
        status_code=501,
        detail="Polls feature is not yet implemented"
    )
