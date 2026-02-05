"""
Chat System - User-Based Helper Functions
==========================================

Helper functions for the user-based chat system.
These functions work with user_id instead of profile_id/profile_type.

Backward Compatible: Falls back to profile-based lookup if needed.
"""

from typing import Optional, Dict, Tuple
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor


def get_user_display_info(conn, user_id: int) -> dict:
    """
    Get user display info (name, avatar) based on user_id.

    Args:
        conn: Database connection
        user_id: User ID

    Returns:
        dict: {name: str, avatar: str, email: str, username: str}
    """
    cur = conn.cursor()
    try:
        # Get user basic info
        cur.execute("""
            SELECT first_name, father_name, last_name, profile_picture, email
            FROM users WHERE id = %s
        """, (user_id,))
        user = cur.fetchone()

        if not user:
            return {"name": "Unknown User", "avatar": None, "email": None, "username": None}

        # Build full name
        first_name = user.get('first_name') or ''
        father_name = user.get('father_name') or ''
        last_name = user.get('last_name') or ''

        if last_name:
            full_name = f"{first_name} {last_name}".strip()
        else:
            full_name = f"{first_name} {father_name}".strip()

        if not full_name:
            full_name = user.get('email', 'Unknown User').split('@')[0]

        return {
            "name": full_name,
            "avatar": user.get('profile_picture'),
            "email": user.get('email'),
            "username": full_name  # Can be enhanced with actual username field
        }
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error getting user display info for user_id {user_id}: {e}")
        return {"name": "Unknown User", "avatar": None, "email": None, "username": None}
    finally:
        cur.close()


def get_user_privacy_settings(conn, user_id: int) -> dict:
    """
    Get privacy settings for a user.

    Args:
        conn: Database connection
        user_id: User ID

    Returns:
        dict: Privacy settings with defaults
    """
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT who_can_message, read_receipts, online_status, typing_indicators,
                   last_seen_visibility, block_screenshots, disable_forwarding,
                   allow_calls_from, allow_group_adds, allow_channel_adds
            FROM chat_settings
            WHERE user_id = %s
        """, (user_id,))
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
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error getting privacy settings for user_id {user_id}: {e}")
        # Return defaults on error
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


def are_users_connected(conn, user1_id: int, user2_id: int) -> bool:
    """
    Check if two users are connected (have an accepted connection).

    Note: This checks ANY profile connection between the users.
    If user A's student profile is connected to user B's tutor profile,
    they are considered connected as users.

    Args:
        conn: Database connection
        user1_id: First user ID
        user2_id: Second user ID

    Returns:
        bool: True if connected
    """
    cur = conn.cursor()
    try:
        # Check for any accepted connection between the two users
        # This query looks for connections where either user is requester or recipient
        cur.execute("""
            SELECT 1 FROM connections c1
            JOIN connections c2 ON c1.id = c2.id
            WHERE c1.status = 'accepted'
            AND (
                (c1.requester_profile_id IN (
                    SELECT id FROM student_profiles WHERE user_id = %s
                    UNION SELECT id FROM tutor_profiles WHERE user_id = %s
                    UNION SELECT id FROM parent_profiles WHERE user_id = %s
                    UNION SELECT id FROM advertiser_profiles WHERE user_id = %s
                ) AND c1.recipient_profile_id IN (
                    SELECT id FROM student_profiles WHERE user_id = %s
                    UNION SELECT id FROM tutor_profiles WHERE user_id = %s
                    UNION SELECT id FROM parent_profiles WHERE user_id = %s
                    UNION SELECT id FROM advertiser_profiles WHERE user_id = %s
                ))
                OR
                (c1.recipient_profile_id IN (
                    SELECT id FROM student_profiles WHERE user_id = %s
                    UNION SELECT id FROM tutor_profiles WHERE user_id = %s
                    UNION SELECT id FROM parent_profiles WHERE user_id = %s
                    UNION SELECT id FROM advertiser_profiles WHERE user_id = %s
                ) AND c1.requester_profile_id IN (
                    SELECT id FROM student_profiles WHERE user_id = %s
                    UNION SELECT id FROM tutor_profiles WHERE user_id = %s
                    UNION SELECT id FROM parent_profiles WHERE user_id = %s
                    UNION SELECT id FROM advertiser_profiles WHERE user_id = %s
                ))
            )
            LIMIT 1
        """, (user1_id, user1_id, user1_id, user1_id,
              user2_id, user2_id, user2_id, user2_id,
              user1_id, user1_id, user1_id, user1_id,
              user2_id, user2_id, user2_id, user2_id))

        return cur.fetchone() is not None
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error checking connection between users {user1_id} and {user2_id}: {e}")
        return False
    finally:
        cur.close()


def is_user_blocked(conn, blocker_user_id: int, blocked_user_id: int) -> bool:
    """
    Check if a user has blocked another user.

    Args:
        conn: Database connection
        blocker_user_id: User who may have blocked
        blocked_user_id: User who may be blocked

    Returns:
        bool: True if blocked
    """
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 1 FROM blocked_chat_contacts
            WHERE blocker_user_id = %s
            AND blocked_user_id = %s
            AND is_active = true
            LIMIT 1
        """, (blocker_user_id, blocked_user_id))

        return cur.fetchone() is not None
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error checking block status: {e}")
        return False
    finally:
        cur.close()


def check_can_message(conn, sender_user_id: int, recipient_user_id: int) -> Tuple[bool, Optional[str]]:
    """
    Check if sender can message recipient based on privacy settings.

    Args:
        conn: Database connection
        sender_user_id: Sender user ID
        recipient_user_id: Recipient user ID

    Returns:
        tuple: (can_message: bool, reason: str or None)
    """
    # Check if blocked (either direction)
    if is_user_blocked(conn, recipient_user_id, sender_user_id):
        return False, "You have been blocked by this user"

    if is_user_blocked(conn, sender_user_id, recipient_user_id):
        return False, "You have blocked this user"

    # Get recipient's privacy settings
    settings = get_user_privacy_settings(conn, recipient_user_id)
    who_can_message = settings.get('who_can_message', 'everyone')

    if who_can_message == 'everyone':
        return True, None
    elif who_can_message == 'connections':
        if are_users_connected(conn, sender_user_id, recipient_user_id):
            return True, None
        return False, "This user only accepts messages from connections"
    elif who_can_message == 'none':
        return False, "This user has disabled messages"

    return True, None


def check_can_call(conn, caller_user_id: int, recipient_user_id: int) -> Tuple[bool, Optional[str]]:
    """
    Check if caller can call recipient based on privacy settings.

    Args:
        conn: Database connection
        caller_user_id: Caller user ID
        recipient_user_id: Recipient user ID

    Returns:
        tuple: (can_call: bool, reason: str or None)
    """
    # Check if blocked
    if is_user_blocked(conn, recipient_user_id, caller_user_id):
        return False, "You have been blocked by this user"

    if is_user_blocked(conn, caller_user_id, recipient_user_id):
        return False, "You have blocked this user"

    # Get recipient's privacy settings
    settings = get_user_privacy_settings(conn, recipient_user_id)
    allow_calls_from = settings.get('allow_calls_from', 'everyone')

    if allow_calls_from == 'everyone':
        return True, None
    elif allow_calls_from == 'connections':
        if are_users_connected(conn, caller_user_id, recipient_user_id):
            return True, None
        return False, "This user only accepts calls from connections"
    elif allow_calls_from == 'none':
        return False, "This user has disabled calls"

    return True, None


def check_can_add_to_group(conn, adder_user_id: int, target_user_id: int) -> Tuple[bool, Optional[str]]:
    """
    Check if adder can add target to a group based on privacy settings.

    Args:
        conn: Database connection
        adder_user_id: User trying to add
        target_user_id: User being added

    Returns:
        tuple: (can_add: bool, reason: str or None)
    """
    # Check if blocked
    if is_user_blocked(conn, target_user_id, adder_user_id):
        return False, "You have been blocked by this user"

    # Get target's privacy settings
    settings = get_user_privacy_settings(conn, target_user_id)
    allow_group_adds = settings.get('allow_group_adds', 'everyone')

    if allow_group_adds == 'everyone':
        return True, None
    elif allow_group_adds == 'connections':
        if are_users_connected(conn, adder_user_id, target_user_id):
            return True, None
        return False, "This user only allows connections to add them to groups"
    elif allow_group_adds == 'none':
        return False, "This user has disabled group adds"

    return True, None


def get_user_contacts(conn, user_id: int) -> list:
    """
    Get all contacts (accepted connections) for a user.
    Returns users that this user has any accepted connection with.

    Args:
        conn: Database connection
        user_id: User ID

    Returns:
        list: List of contact user IDs
    """
    cur = conn.cursor()
    try:
        # Get all users that have any accepted connection with this user
        cur.execute("""
            WITH user_profiles AS (
                SELECT id as profile_id, 'student' as profile_type FROM student_profiles WHERE user_id = %s
                UNION
                SELECT id as profile_id, 'tutor' as profile_type FROM tutor_profiles WHERE user_id = %s
                UNION
                SELECT id as profile_id, 'parent' as profile_type FROM parent_profiles WHERE user_id = %s
                UNION
                SELECT id as profile_id, 'advertiser' as profile_type FROM advertiser_profiles WHERE user_id = %s
            ),
            connections_out AS (
                SELECT DISTINCT c.recipient_profile_id, c.recipient_type
                FROM connections c
                JOIN user_profiles up ON c.requester_profile_id = up.profile_id
                                      AND c.requester_type = up.profile_type
                WHERE c.status = 'accepted'
            ),
            connections_in AS (
                SELECT DISTINCT c.requester_profile_id as recipient_profile_id,
                               c.requester_type as recipient_type
                FROM connections c
                JOIN user_profiles up ON c.recipient_profile_id = up.profile_id
                                      AND c.recipient_type = up.profile_type
                WHERE c.status = 'accepted'
            ),
            all_connections AS (
                SELECT * FROM connections_out
                UNION
                SELECT * FROM connections_in
            )
            SELECT DISTINCT
                CASE ac.recipient_type
                    WHEN 'student' THEN sp.user_id
                    WHEN 'tutor' THEN tp.user_id
                    WHEN 'parent' THEN pp.user_id
                    WHEN 'advertiser' THEN ap.user_id
                END as contact_user_id
            FROM all_connections ac
            LEFT JOIN student_profiles sp ON ac.recipient_type = 'student' AND ac.recipient_profile_id = sp.id
            LEFT JOIN tutor_profiles tp ON ac.recipient_type = 'tutor' AND ac.recipient_profile_id = tp.id
            LEFT JOIN parent_profiles pp ON ac.recipient_type = 'parent' AND ac.recipient_profile_id = pp.id
            LEFT JOIN advertiser_profiles ap ON ac.recipient_type = 'advertiser' AND ac.recipient_profile_id = ap.id
            WHERE CASE ac.recipient_type
                WHEN 'student' THEN sp.user_id
                WHEN 'tutor' THEN tp.user_id
                WHEN 'parent' THEN pp.user_id
                WHEN 'advertiser' THEN ap.user_id
            END IS NOT NULL
        """, (user_id, user_id, user_id, user_id))

        results = cur.fetchall()
        return [row['contact_user_id'] for row in results]
    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error getting contacts for user {user_id}: {e}")
        return []
    finally:
        cur.close()


def get_or_create_direct_conversation(conn, user1_id: int, user2_id: int) -> Optional[int]:
    """
    Get or create a direct conversation between two users.

    Args:
        conn: Database connection
        user1_id: First user ID
        user2_id: Second user ID

    Returns:
        int: Conversation ID or None
    """
    cur = conn.cursor()
    try:
        # First, try to find an existing direct conversation
        cur.execute("""
            SELECT c.id
            FROM conversations c
            WHERE c.type = 'direct'
            AND EXISTS (
                SELECT 1 FROM conversation_participants cp1
                WHERE cp1.conversation_id = c.id
                AND cp1.user_id = %s
                AND cp1.is_active = true
            )
            AND EXISTS (
                SELECT 1 FROM conversation_participants cp2
                WHERE cp2.conversation_id = c.id
                AND cp2.user_id = %s
                AND cp2.is_active = true
            )
            AND (
                SELECT COUNT(*) FROM conversation_participants
                WHERE conversation_id = c.id
                AND is_active = true
            ) = 2
            LIMIT 1
        """, (user1_id, user2_id))

        existing = cur.fetchone()
        if existing:
            return existing['id']

        # Create new conversation
        cur.execute("""
            INSERT INTO conversations (type, created_by_user_id, created_at, updated_at)
            VALUES ('direct', %s, NOW(), NOW())
            RETURNING id
        """, (user1_id,))

        conv_id = cur.fetchone()['id']

        # Add both participants
        cur.execute("""
            INSERT INTO conversation_participants
            (conversation_id, user_id, role, is_active, joined_at, created_at, updated_at)
            VALUES
            (%s, %s, 'member', true, NOW(), NOW(), NOW()),
            (%s, %s, 'member', true, NOW(), NOW(), NOW())
        """, (conv_id, user1_id, conv_id, user2_id))

        conn.commit()
        return conv_id

    except Exception as e:
        conn.rollback()
        print(f"[Chat API] Error creating conversation: {e}")
        return None
    finally:
        cur.close()
