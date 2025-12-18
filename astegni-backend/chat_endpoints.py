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
from typing import Optional, List
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import os
from dotenv import load_dotenv
from encryption_service import encrypt_message, decrypt_message, is_encrypted

load_dotenv()

router = APIRouter(prefix="/api/chat", tags=["Chat"])

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
            query += " AND c.type = 'group'"

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
            else:
                # For groups, use group name
                conv_dict['display_name'] = conv['name'] or 'Group Chat'
                conv_dict['avatar'] = conv['avatar_url']

                # Get participant count
                cur.execute("""
                    SELECT COUNT(*) as count
                    FROM conversation_participants
                    WHERE conversation_id = %s AND is_active = TRUE
                """, (conv['id'],))
                conv_dict['participant_count'] = cur.fetchone()['count']

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
                    "is_connection": True  # Flag to indicate this is a connection without conversation
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
                                    "relationship": "Parent"
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
                                    "relationship": "Child"
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
                            "relationship": "Enrolled Student"
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
                                        "relationship": "Student's Parent"
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
                            "relationship": "My Tutor"
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
                                "relationship": "Child's Tutor"
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
                            "relationship": status_label
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
                            "relationship": status_label
                        })
                        existing_user_ids.add(req['tutor_user_id'])
                        print(f"[Chat API] Added requested tutor: {display_name}")

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

        # Add creator as participant (admin for groups)
        role = 'admin' if request.type == 'group' else 'member'
        cur.execute("""
            INSERT INTO conversation_participants
            (conversation_id, profile_id, profile_type, user_id, role)
            VALUES (%s, %s, %s, %s, %s)
        """, (conv_id, profile_id, profile_type, user_id, role))

        # Add other participants
        for participant in request.participants:
            cur.execute("""
                INSERT INTO conversation_participants
                (conversation_id, profile_id, profile_type, user_id, role)
                VALUES (%s, %s, %s, %s, 'member')
                ON CONFLICT (conversation_id, profile_id, profile_type) DO NOTHING
            """, (conv_id, participant.profile_id, participant.profile_type, participant.user_id))

        conn.commit()
        return {"conversation_id": conv_id, "existing": False}

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
        conv_dict['pinned_messages'] = [dict(m) for m in cur.fetchall()]

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
    limit: int = Query(50, le=100)
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

        # Return in chronological order
        result.reverse()

        return {"messages": result, "has_more": len(result) == limit}

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

        # Encrypt message content before storing
        encrypted_content = encrypt_message(request.content) if request.content else None

        # Insert message with encrypted content
        cur.execute("""
            INSERT INTO chat_messages
            (conversation_id, sender_profile_id, sender_profile_type, sender_user_id,
             message_type, content, media_url, media_metadata, reply_to_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            request.reply_to_id
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

        # Return original (unencrypted) content to the sender
        return {
            "message_id": message_id,
            "conversation_id": request.conversation_id,
            "content": request.content,
            "message_type": request.message_type,
            "created_at": created_at.isoformat(),
            "sender_name": sender_info['name'],
            "sender_avatar": sender_info['avatar']
        }

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

        added = []
        for p in request.participants:
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
        return {"added": added}

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
                default_translation, auto_translate, tts_voice
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
                    "tts_voice": "default"
                }
            }

        return {"settings": dict(row)}

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
            cur.execute("SELECT user_id FROM students WHERE id = %s", (profile_id,))
        elif profile_type == 'tutor':
            cur.execute("SELECT user_id FROM tutors WHERE id = %s", (profile_id,))
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
                updated_at
            ) VALUES (
                %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s,
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
                updated_at = CURRENT_TIMESTAMP
        """, (
            user_id, profile_id, profile_type,
            who_can_message, read_receipts, online_status, typing_indicators,
            message_notifications, sound_alerts, mute_duration,
            bubble_style, font_size, message_density, enter_key,
            auto_download, image_quality,
            default_translation, auto_translate, tts_voice
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
