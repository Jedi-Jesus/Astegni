
# ============================================
# websocket_manager.py - WebSocket management for real-time features
# ============================================

"""
websocket_manager.py - WebSocket management for Astegni Platform
Handles real-time chat, notifications, and live sessions
"""

from typing import Dict, List, Set, Union, Optional, Tuple
from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException
from datetime import datetime
import json
import asyncio
from sqlalchemy.orm import Session
from sqlalchemy import text

# Connection key type: can be string (profile-based) like "tutor_123" or int (legacy user_id)
ConnectionKey = Union[str, int]


def parse_connection_key(connection_key: ConnectionKey) -> Tuple[Optional[str], Optional[int]]:
    """
    Parse a connection key into (profile_type, profile_id).
    Returns (None, None) for legacy integer keys.

    Examples:
        "tutor_123" -> ("tutor", 123)
        "student_456" -> ("student", 456)
        123 -> (None, None)
    """
    if isinstance(connection_key, str) and "_" in connection_key:
        parts = connection_key.split("_", 1)
        if len(parts) == 2 and parts[1].isdigit():
            return parts[0], int(parts[1])
    return None, None


def update_profile_online_status(db: Session, profile_type: str, profile_id: int, is_online: bool):
    """
    Update the is_online and last_seen fields in the profile table.

    Args:
        db: Database session
        profile_type: 'tutor', 'student', 'parent', or 'advertiser'
        profile_id: The profile ID
        is_online: Whether the user is online
    """
    table_map = {
        "tutor": "tutor_profiles",
        "student": "student_profiles",
        "parent": "parent_profiles",
        "advertiser": "advertiser_profiles"
    }

    table_name = table_map.get(profile_type)
    if not table_name:
        print(f"⚠️ Unknown profile type: {profile_type}")
        return

    try:
        if is_online:
            # Set online and update last_seen
            db.execute(
                text(f"""
                    UPDATE {table_name}
                    SET is_online = TRUE, last_seen = NOW()
                    WHERE id = :profile_id
                """),
                {"profile_id": profile_id}
            )
        else:
            # Set offline and update last_seen
            db.execute(
                text(f"""
                    UPDATE {table_name}
                    SET is_online = FALSE, last_seen = NOW()
                    WHERE id = :profile_id
                """),
                {"profile_id": profile_id}
            )
        db.commit()
        status = "online" if is_online else "offline"
        print(f"📊 Updated {profile_type} {profile_id} status: {status}")
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to update online status for {profile_type} {profile_id}: {e}")

class ConnectionManager:
    """
    Manages WebSocket connections for real-time features.

    Connection keys can be:
    - Profile-based (string): "tutor_123", "student_456" for whiteboard video calls
    - User ID (int): Legacy support for chat and other features
    """

    def __init__(self):
        # Active connections by connection key (string or int)
        self.active_connections: Dict[ConnectionKey, List[WebSocket]] = {}

        # Room-based connections (for group chats, live sessions)
        self.room_connections: Dict[str, Set[ConnectionKey]] = {}

        # Connection key to rooms mapping
        self.user_rooms: Dict[ConnectionKey, Set[str]] = {}

    async def connect(self, websocket: WebSocket, connection_key: ConnectionKey, db: Session = None):
        """Accept a new WebSocket connection and update online status in DB"""
        await websocket.accept()

        if connection_key not in self.active_connections:
            self.active_connections[connection_key] = []

        self.active_connections[connection_key].append(websocket)

        # Update online status in database (profile tables)
        if db:
            profile_type, profile_id = parse_connection_key(connection_key)
            if profile_type and profile_id:
                update_profile_online_status(db, profile_type, profile_id, is_online=True)
                # Broadcast online status to other connected users
                await self.broadcast_online_status(profile_type, profile_id, is_online=True)

        # Send connection confirmation
        await self.send_personal_message(
            {"type": "connection", "status": "connected", "connection_key": str(connection_key)},
            connection_key
        )

        # Check for missed calls and notify user
        if db:
            profile_type, profile_id = parse_connection_key(connection_key)
            if profile_type and profile_id:
                missed_calls = get_missed_calls_for_user(db, profile_type, profile_id)
                if missed_calls:
                    print(f"📞 User {connection_key} has {len(missed_calls)} missed call(s) - sending notification")
                    await self.send_personal_message(
                        {
                            "type": "missed_calls_notification",
                            "count": len(missed_calls),
                            "calls": missed_calls
                        },
                        connection_key
                    )

        print(f"🔌 Connection {connection_key} established via WebSocket")

    async def disconnect(self, websocket: WebSocket, connection_key: ConnectionKey, db: Session = None):
        """Remove a WebSocket connection and update online status in DB"""
        should_mark_offline = False

        if connection_key in self.active_connections:
            if websocket in self.active_connections[connection_key]:
                self.active_connections[connection_key].remove(websocket)

            # Remove connection key if no more connections
            if not self.active_connections[connection_key]:
                del self.active_connections[connection_key]
                should_mark_offline = True  # Only mark offline when last connection closes

                # Leave all rooms
                if connection_key in self.user_rooms:
                    for room in self.user_rooms[connection_key]:
                        if room in self.room_connections:
                            self.room_connections[room].discard(connection_key)
                    del self.user_rooms[connection_key]

        # Update online status in database (profile tables)
        if should_mark_offline and db:
            profile_type, profile_id = parse_connection_key(connection_key)
            if profile_type and profile_id:
                update_profile_online_status(db, profile_type, profile_id, is_online=False)
                # Broadcast offline status to other connected users
                await self.broadcast_online_status(profile_type, profile_id, is_online=False)

        print(f"🔌 Connection {connection_key} disconnected from WebSocket")

    async def send_personal_message(self, message: dict, connection_key: ConnectionKey) -> bool:
        """
        Send a message to a specific connection (by profile key or user ID).
        Returns True if message was sent, False if user is offline.
        """
        if connection_key in self.active_connections:
            message_text = json.dumps(message)

            # Send to all connections of this key
            sent = False
            for connection in self.active_connections[connection_key]:
                try:
                    await connection.send_text(message_text)
                    sent = True
                except:
                    # Remove dead connections
                    self.active_connections[connection_key].remove(connection)
            return sent
        else:
            print(f"⚠️ No active connection for {connection_key}")
            print(f"📋 Active connections: {list(self.active_connections.keys())}")
            return False

    def is_user_online(self, connection_key: ConnectionKey) -> bool:
        """Check if a user is currently connected via WebSocket"""
        return connection_key in self.active_connections and len(self.active_connections[connection_key]) > 0
    
    async def broadcast(self, message: dict, exclude_user: int = None):
        """Broadcast a message to all connected users"""
        message_text = json.dumps(message)

        for user_id, connections in self.active_connections.items():
            if user_id != exclude_user:
                for connection in connections:
                    try:
                        await connection.send_text(message_text)
                    except:
                        # Remove dead connections
                        connections.remove(connection)

    async def broadcast_online_status(self, profile_type: str, profile_id: int, is_online: bool):
        """
        Broadcast online/offline status to all connected users.
        Uses profile-based message format for frontend compatibility.
        """
        message = {
            "type": "user_online" if is_online else "user_offline",
            "profile_type": profile_type,
            f"{profile_type}_profile_id": profile_id,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Don't send to the user who just came online/offline
        exclude_key = f"{profile_type}_{profile_id}"
        await self.broadcast(message, exclude_user=exclude_key)

        status = "online" if is_online else "offline"
        print(f"📡 Broadcast {profile_type} {profile_id} is now {status}")

    async def join_room(self, room_id: str, user_id: int):
        """Join a room for group communication"""
        if room_id not in self.room_connections:
            self.room_connections[room_id] = set()
        
        self.room_connections[room_id].add(user_id)
        
        if user_id not in self.user_rooms:
            self.user_rooms[user_id] = set()
        
        self.user_rooms[user_id].add(room_id)
        
        # Notify room members
        await self.send_room_message(
            room_id,
            {"type": "user_joined", "user_id": user_id, "room": room_id},
            exclude_user=user_id
        )
    
    async def leave_room(self, room_id: str, user_id: int):
        """Leave a room"""
        if room_id in self.room_connections:
            self.room_connections[room_id].discard(user_id)
            
            # Notify room members
            await self.send_room_message(
                room_id,
                {"type": "user_left", "user_id": user_id, "room": room_id}
            )
            
            # Clean up empty rooms
            if not self.room_connections[room_id]:
                del self.room_connections[room_id]
        
        if user_id in self.user_rooms:
            self.user_rooms[user_id].discard(room_id)
    
    async def send_room_message(self, room_id: str, message: dict, exclude_user: int = None):
        """Send a message to all users in a room"""
        if room_id in self.room_connections:
            for user_id in self.room_connections[room_id]:
                if user_id != exclude_user and user_id in self.active_connections:
                    await self.send_personal_message(message, user_id)
    
    def get_room_users(self, room_id: str) -> List[int]:
        """Get list of users in a room"""
        return list(self.room_connections.get(room_id, set()))
    
    def get_user_rooms(self, user_id: int) -> List[str]:
        """Get list of rooms a user is in"""
        return list(self.user_rooms.get(user_id, set()))
    
    def is_user_online(self, user_id: int) -> bool:
        """Check if a user is online"""
        return user_id in self.active_connections

# Create global manager instance
manager = ConnectionManager()

# WebSocket message handlers

async def handle_chat_message(data: dict, user_id: int, db: Session):
    """Handle chat messages"""
    message_type = data.get("type")
    
    if message_type == "private_message":
        recipient_id = data.get("recipient_id")
        message = data.get("message")
        
        # Save message to database (implement chat model)
        # ...
        
        # Send to recipient
        await manager.send_personal_message({
            "type": "private_message",
            "sender_id": user_id,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }, recipient_id)
        
    elif message_type == "room_message":
        room_id = data.get("room_id")
        message = data.get("message")
        
        # Check if user is in room
        if room_id in manager.get_user_rooms(user_id):
            # Save message to database
            # ...
            
            # Broadcast to room
            await manager.send_room_message(room_id, {
                "type": "room_message",
                "sender_id": user_id,
                "message": message,
                "room_id": room_id,
                "timestamp": datetime.utcnow().isoformat()
            }, exclude_user=user_id)
    
    elif message_type == "typing":
        recipient_id = data.get("recipient_id")
        is_typing = data.get("is_typing", False)
        
        await manager.send_personal_message({
            "type": "typing",
            "user_id": user_id,
            "is_typing": is_typing
        }, recipient_id)

async def handle_session_message(data: dict, user_id: int, db: Session):
    """Handle tutoring session messages"""
    action = data.get("action")
    session_id = data.get("session_id")
    
    if action == "join_session":
        room_id = f"session_{session_id}"
        await manager.join_room(room_id, user_id)
        
    elif action == "leave_session":
        room_id = f"session_{session_id}"
        await manager.leave_room(room_id, user_id)
        
    elif action == "screen_share":
        room_id = f"session_{session_id}"
        is_sharing = data.get("is_sharing", False)
        
        await manager.send_room_message(room_id, {
            "type": "screen_share",
            "user_id": user_id,
            "is_sharing": is_sharing
        })
        
    elif action == "whiteboard_update":
        room_id = f"session_{session_id}"
        whiteboard_data = data.get("whiteboard_data")
        
        await manager.send_room_message(room_id, {
            "type": "whiteboard_update",
            "user_id": user_id,
            "data": whiteboard_data
        }, exclude_user=user_id)

async def send_notification(user_id: int, notification: dict):
    """Send a real-time notification to a user"""
    await manager.send_personal_message({
        "type": "notification",
        "notification": notification,
        "timestamp": datetime.utcnow().isoformat()
    }, user_id)

# Utility functions for notifications

async def notify_session_reminder(session_id: int, user_ids: List[int], minutes_before: int):
    """Send session reminder notifications"""
    for user_id in user_ids:
        await send_notification(user_id, {
            "title": "Session Reminder",
            "message": f"Your tutoring session starts in {minutes_before} minutes",
            "session_id": session_id,
            "type": "session_reminder"
        })

async def notify_new_message(sender_id: int, recipient_id: int, message_preview: str):
    """Send new message notification"""
    await send_notification(recipient_id, {
        "title": "New Message",
        "message": message_preview[:100],
        "sender_id": sender_id,
        "type": "new_message"
    })

async def notify_payment_received(tutor_id: int, amount: float, student_name: str):
    """Send payment notification to tutor"""
    await send_notification(tutor_id, {
        "title": "Payment Received",
        "message": f"You received {amount} ETB from {student_name}",
        "type": "payment_received"
    })


# ============================================
# MISSED CALL / CALL HISTORY HELPERS
# ============================================

def store_missed_call(db: Session, caller_data: dict, callee_data: dict, call_context: dict = None) -> int:
    """
    Store a missed call in whiteboard_call_history table.

    Args:
        db: Database session
        caller_data: Dict with caller_profile_id, caller_profile_type, caller_user_id, caller_name, caller_avatar
        callee_data: Dict with callee_profile_id, callee_profile_type, callee_user_id, callee_name, callee_avatar
        call_context: Optional dict with whiteboard_session_id, tutor_package_name, tutor_package_id, enrollment_id

    Returns:
        The ID of the created call history record
    """
    try:
        context = call_context or {}
        result = db.execute(
            text("""
                INSERT INTO whiteboard_call_history (
                    caller_profile_id, caller_profile_type, caller_user_id, caller_name, caller_avatar,
                    callee_profile_id, callee_profile_type, callee_user_id, callee_name, callee_avatar,
                    status, call_type, whiteboard_session_id, tutor_package_name, tutor_package_id,
                    enrollment_id, is_multi_party, callee_seen
                ) VALUES (
                    :caller_profile_id, :caller_profile_type, :caller_user_id, :caller_name, :caller_avatar,
                    :callee_profile_id, :callee_profile_type, :callee_user_id, :callee_name, :callee_avatar,
                    'offline', 'video', :whiteboard_session_id, :tutor_package_name, :tutor_package_id,
                    :enrollment_id, :is_multi_party, FALSE
                ) RETURNING id
            """),
            {
                "caller_profile_id": caller_data.get("caller_profile_id"),
                "caller_profile_type": caller_data.get("caller_profile_type"),
                "caller_user_id": caller_data.get("caller_user_id"),
                "caller_name": caller_data.get("caller_name"),
                "caller_avatar": caller_data.get("caller_avatar"),
                "callee_profile_id": callee_data.get("callee_profile_id"),
                "callee_profile_type": callee_data.get("callee_profile_type"),
                "callee_user_id": callee_data.get("callee_user_id"),
                "callee_name": callee_data.get("callee_name"),
                "callee_avatar": callee_data.get("callee_avatar"),
                "whiteboard_session_id": context.get("whiteboard_session_id"),
                "tutor_package_name": context.get("tutor_package_name"),
                "tutor_package_id": context.get("tutor_package_id"),
                "enrollment_id": context.get("enrollment_id"),
                "is_multi_party": context.get("is_multi_party", False)
            }
        )
        call_id = result.fetchone()[0]
        db.commit()
        print(f"📞 Stored missed call #{call_id}: {caller_data.get('caller_name')} -> {callee_data.get('callee_name')} (offline)")
        return call_id
    except Exception as e:
        db.rollback()
        print(f"❌ Error storing missed call: {e}")
        return None


def get_profile_info(db: Session, profile_type: str, profile_id: int) -> dict:
    """
    Get profile information (user_id, name, avatar) for a given profile.

    Returns:
        Dict with user_id, name, avatar or None if not found
    """
    table_map = {
        'tutor': 'tutor_profiles',
        'student': 'student_profiles',
        'parent': 'parent_profiles',
        'advertiser': 'advertiser_profiles'
    }

    table_name = table_map.get(profile_type)
    if not table_name:
        return None

    try:
        result = db.execute(
            text(f"""
                SELECT
                    p.user_id,
                    COALESCE(
                        NULLIF(TRIM(CONCAT(u.first_name, ' ', COALESCE(u.father_name, ''))), ''),
                        '{profile_type.title()} ' || p.id::text
                    ) as name,
                    p.profile_picture as avatar
                FROM {table_name} p
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.id = :profile_id
            """),
            {"profile_id": profile_id}
        )
        row = result.fetchone()
        if row:
            return {
                "user_id": row[0],
                "name": row[1],
                "avatar": row[2]
            }
    except Exception as e:
        print(f"❌ Error getting profile info: {e}")

    return None


def get_missed_calls_for_user(db: Session, profile_type: str, profile_id: int) -> list:
    """
    Get unseen missed calls for a user.

    Args:
        db: Database session
        profile_type: 'tutor', 'student', 'parent', or 'advertiser'
        profile_id: The profile ID

    Returns:
        List of missed call records
    """
    try:
        result = db.execute(
            text("""
                SELECT
                    id, caller_profile_id, caller_profile_type, caller_name, caller_avatar,
                    callee_profile_id, callee_profile_type, callee_name, callee_avatar,
                    status, tutor_package_name, initiated_at
                FROM whiteboard_call_history
                WHERE callee_profile_id = :profile_id
                AND callee_profile_type = :profile_type
                AND callee_seen = FALSE
                AND status IN ('offline', 'missed', 'no_answer')
                ORDER BY initiated_at DESC
                LIMIT 10
            """),
            {"profile_id": profile_id, "profile_type": profile_type}
        )

        missed_calls = []
        for row in result.fetchall():
            missed_calls.append({
                "id": row[0],
                "caller_profile_id": row[1],
                "caller_profile_type": row[2],
                "caller_name": row[3],
                "caller_avatar": row[4],
                "callee_profile_id": row[5],
                "callee_profile_type": row[6],
                "callee_name": row[7],
                "callee_avatar": row[8],
                "status": row[9],
                "tutor_package_name": row[10],
                "initiated_at": row[11].isoformat() if row[11] else None
            })

        return missed_calls
    except Exception as e:
        print(f"❌ Error getting missed calls: {e}")
        return []


# ============================================
# VIDEO CALL SIGNALING HANDLERS (Profile-Based)
# ============================================

def get_recipient_connection_key(data: dict) -> str:
    """
    Get the recipient's connection key from message data.
    Connection keys are formatted as:
    - User-based (PREFERRED): "user_{user_id}" (e.g., "user_123")
    - Legacy profile-based: "{role}_{profile_id}" (e.g., "student_123", "tutor_456")

    Supports both approaches for backward compatibility.
    """
    # Check for user-based recipient (PREFERRED - new chat system)
    to_user_id = data.get("to_user_id")
    if to_user_id:
        return f"user_{to_user_id}"

    # Legacy: Check for generic profile recipient (role-agnostic)
    to_profile_id = data.get("to_profile_id")
    to_profile_type = data.get("to_profile_type")
    if to_profile_id and to_profile_type:
        return f"{to_profile_type}_{to_profile_id}"

    # Legacy: Check for student recipient
    to_student_profile_id = data.get("to_student_profile_id")
    if to_student_profile_id:
        return f"student_{to_student_profile_id}"

    # Legacy: Check for tutor recipient
    to_tutor_profile_id = data.get("to_tutor_profile_id")
    if to_tutor_profile_id:
        return f"tutor_{to_tutor_profile_id}"

    return None


async def handle_video_call_message(data: dict, sender_key: str, db: Session = None):
    """
    Handle video call signaling messages for WebRTC.

    Args:
        data: The message data containing call information
        sender_key: The sender's connection key (e.g., "tutor_123" or "student_456")
        db: Optional database session for storing missed calls
    """
    message_type = data.get("type")
    recipient_key = get_recipient_connection_key(data)

    print(f"🔔 DEBUG: handle_video_call_message called")
    print(f"🔔 DEBUG: message_type={message_type}, sender_key={sender_key}, recipient_key={recipient_key}")
    print(f"🔔 DEBUG: data={data}")

    if not recipient_key:
        print(f"⚠️ No recipient specified in video call message from {sender_key}")
        print(f"⚠️ DEBUG: to_student_profile_id={data.get('to_student_profile_id')}, to_tutor_profile_id={data.get('to_tutor_profile_id')}")
        return

    if message_type == "video_call_invitation":
        # Check if recipient is online before sending invitation
        is_recipient_online = manager.is_user_online(recipient_key)

        if not is_recipient_online:
            print(f"📞 Recipient {recipient_key} is OFFLINE - storing missed call and notifying caller")

            # Parse sender and recipient info
            sender_profile_type, sender_profile_id = parse_connection_key(sender_key)
            recipient_profile_type, recipient_profile_id = parse_connection_key(recipient_key)

            # Store missed call in database if db session available
            call_id = None
            if db and sender_profile_type and recipient_profile_type:
                # Get caller info
                caller_info = get_profile_info(db, sender_profile_type, sender_profile_id)
                callee_info = get_profile_info(db, recipient_profile_type, recipient_profile_id)

                if caller_info and callee_info:
                    caller_data = {
                        "caller_profile_id": sender_profile_id,
                        "caller_profile_type": sender_profile_type,
                        "caller_user_id": caller_info["user_id"],
                        "caller_name": data.get("caller_name") or caller_info["name"],
                        "caller_avatar": caller_info["avatar"]
                    }
                    callee_data = {
                        "callee_profile_id": recipient_profile_id,
                        "callee_profile_type": recipient_profile_type,
                        "callee_user_id": callee_info["user_id"],
                        "callee_name": callee_info["name"],
                        "callee_avatar": callee_info["avatar"]
                    }
                    call_context = {
                        "whiteboard_session_id": data.get("session_id"),
                        "tutor_package_name": data.get("tutor_package_name"),
                        "tutor_package_id": data.get("tutor_package_id"),
                        "enrollment_id": data.get("enrollment_id"),
                        "is_multi_party": data.get("is_multi_party", False)
                    }
                    call_id = store_missed_call(db, caller_data, callee_data, call_context)

            # Send user_offline response back to caller
            await manager.send_personal_message({
                "type": "user_offline",
                "offline_user_profile_id": recipient_profile_id,
                "offline_user_profile_type": recipient_profile_type,
                "offline_user_name": callee_info["name"] if callee_info else None,
                "offline_user_avatar": callee_info["avatar"] if callee_info else None,
                "call_id": call_id,
                "original_message_type": "video_call_invitation",
                "timestamp": datetime.utcnow().isoformat()
            }, sender_key)
            print(f"📞 Sent user_offline response to {sender_key} - call #{call_id} stored")
            return

        # Recipient is online - forward call invitation
        sent = await manager.send_personal_message({
            "type": "video_call_invitation",
            "from_student_profile_id": data.get("from_student_profile_id"),
            "from_tutor_profile_id": data.get("from_tutor_profile_id"),
            "from_role": data.get("from_role"),
            "caller_name": data.get("caller_name"),
            "session_id": data.get("session_id"),
            "is_multi_party": data.get("is_multi_party", False),
            "participant_count": data.get("participant_count", 1),
            "timestamp": datetime.utcnow().isoformat()
        }, recipient_key)

        if sent:
            print(f"📞 Video call invitation sent from {sender_key} to {recipient_key}")
        else:
            print(f"📞 Failed to send invitation to {recipient_key} - may have disconnected")

    elif message_type == "video_offer":
        # Forward WebRTC offer to recipient
        await manager.send_personal_message({
            "type": "video_offer",
            "offer": data.get("offer"),
            "from_tutor_profile_id": data.get("from_tutor_profile_id"),
            "from_student_profile_id": data.get("from_student_profile_id"),
            "from_role": data.get("from_role")
        }, recipient_key)
        print(f"📹 Video offer sent from {sender_key} to {recipient_key}")

    elif message_type == "video_answer":
        # Forward WebRTC answer to caller
        print(f"🔔 DEBUG: Processing video_answer - forwarding to {recipient_key}")
        await manager.send_personal_message({
            "type": "video_answer",
            "answer": data.get("answer"),
            "from_role": data.get("from_role"),
            "from_student_profile_id": data.get("from_student_profile_id"),
            "from_tutor_profile_id": data.get("from_tutor_profile_id"),
            "is_multi_party": data.get("is_multi_party", False)
        }, recipient_key)
        print(f"📹 Video answer sent from {sender_key} to {recipient_key}")

    elif message_type == "ice_candidate":
        # Forward ICE candidate to peer (supports both user-based and profile-based)
        await manager.send_personal_message({
            "type": "ice_candidate",
            "candidate": data.get("candidate"),
            "from_user_id": data.get("from_user_id"),  # User-based (chat calls)
            "from_student_profile_id": data.get("from_student_profile_id"),  # Legacy (whiteboard)
            "from_tutor_profile_id": data.get("from_tutor_profile_id"),  # Legacy (whiteboard)
            "is_multi_party": data.get("is_multi_party", False)
        }, recipient_key)
        # Don't log every ICE candidate as there are many

    elif message_type == "video_call_declined":
        # Notify caller that call was declined
        await manager.send_personal_message({
            "type": "video_call_declined",
            "declined_by": sender_key
        }, recipient_key)
        print(f"📞 Video call declined by {sender_key}")

    elif message_type == "video_call_ended":
        # Notify peer that call ended
        await manager.send_personal_message({
            "type": "video_call_ended",
            "ended_by": sender_key,
            "session_id": data.get("session_id")
        }, recipient_key)
        print(f"📞 Video call ended by {sender_key}")

    elif message_type == "video_call_cancelled":
        # Notify recipient that call was cancelled (before it was answered)
        print(f"🔔 DEBUG: Processing video_call_cancelled - forwarding to {recipient_key}")
        print(f"🔔 DEBUG: Active connections: {list(manager.active_connections.keys())}")
        await manager.send_personal_message({
            "type": "video_call_cancelled",
            "cancelled_by": sender_key,
            "session_id": data.get("session_id"),
            "is_multi_party": data.get("is_multi_party", False)
        }, recipient_key)
        print(f"📞 Video call cancelled by {sender_key} - sent to {recipient_key}")

    elif message_type == "video_call_participant_left":
        # Notify other participants that someone left (call continues for others)
        await manager.send_personal_message({
            "type": "video_call_participant_left",
            "left_participant_id": data.get("left_participant_id"),
            "left_participant_role": data.get("left_participant_role"),
            "left_participant_name": data.get("left_participant_name"),
            "session_id": data.get("session_id"),
            "is_multi_party": data.get("is_multi_party", False)
        }, recipient_key)
        print(f"📞 Participant {data.get('left_participant_name', sender_key)} left the call - notified {recipient_key}")

    # Handle chat modal call messages
    elif message_type == "call_invitation":
        # Chat modal call invitation - forward to recipient
        print(f"📞 Chat call invitation: {data.get('call_type')} from {sender_key} to {recipient_key}")

        # Check if recipient is online
        is_recipient_online = manager.is_user_online(recipient_key)

        if not is_recipient_online:
            # Recipient is offline - notify caller
            await manager.send_personal_message({
                "type": "call_declined",
                "reason": "offline",
                "conversation_id": data.get("conversation_id")
            }, sender_key)
            print(f"📞 Recipient {recipient_key} is offline - sent decline to caller")
            return

        # Forward invitation to recipient (USER-BASED)
        await manager.send_personal_message({
            "type": "call_invitation",
            "call_type": data.get("call_type"),
            "conversation_id": data.get("conversation_id"),
            "from_user_id": data.get("from_user_id"),
            "from_name": data.get("from_name"),
            "from_avatar": data.get("from_avatar"),
            "offer": data.get("offer"),
            "timestamp": datetime.utcnow().isoformat()
        }, recipient_key)
        print(f"📞 Call invitation forwarded from {sender_key} to {recipient_key}")

    elif message_type == "call_answer":
        # Forward call answer to caller (USER-BASED)
        await manager.send_personal_message({
            "type": "call_answer",
            "conversation_id": data.get("conversation_id"),
            "from_user_id": data.get("from_user_id"),
            "answer": data.get("answer")
        }, recipient_key)
        print(f"📞 Call answer forwarded from {sender_key} to {recipient_key}")

    elif message_type == "call_declined":
        # Forward call decline to caller
        await manager.send_personal_message({
            "type": "call_declined",
            "conversation_id": data.get("conversation_id")
        }, recipient_key)
        print(f"📞 Call declined by {sender_key} - notified {recipient_key}")

    elif message_type == "call_ended":
        # Forward call ended to peer
        await manager.send_personal_message({
            "type": "call_ended",
            "conversation_id": data.get("conversation_id")
        }, recipient_key)
        print(f"📞 Call ended by {sender_key} - notified {recipient_key}")

    elif message_type == "call_cancelled":
        # Forward call cancelled to recipient (caller hung up before answer)
        await manager.send_personal_message({
            "type": "call_cancelled",
            "conversation_id": data.get("conversation_id"),
            "call_type": data.get("call_type", "voice")
        }, recipient_key)
        print(f"📞 Call cancelled by {sender_key} - notified {recipient_key}")

    else:
        print(f"⚠️ Unknown video call message type: {message_type}")


def get_online_users_from_db(db: Session, profile_types: list = None) -> list:
    """
    Query the profile tables for online users.
    Joins with users table to get the full name (first_name + father_name).

    Args:
        db: Database session
        profile_types: List of profile types to query (e.g., ['tutor', 'student'])
                      If None, queries all profile types

    Returns:
        List of online user objects with profile_type, profile_id, and name
    """
    if profile_types is None:
        profile_types = ['tutor', 'student', 'parent', 'advertiser']

    # Profile tables - all have user_id FK to users table and profile_picture
    profile_tables = {
        'tutor': 'tutor_profiles',
        'student': 'student_profiles',
        'parent': 'parent_profiles',
        'advertiser': 'advertiser_profiles'
    }

    online_users = []

    for profile_type in profile_types:
        table_name = profile_tables.get(profile_type)
        if not table_name:
            continue

        try:
            # Join with users table to get full name (first_name + father_name)
            result = db.execute(
                text(f"""
                    SELECT
                        p.id,
                        COALESCE(
                            NULLIF(TRIM(CONCAT(u.first_name, ' ', COALESCE(u.father_name, ''))), ''),
                            p.username,
                            '{profile_type.title()} ' || p.id::text
                        ) as full_name,
                        p.profile_picture
                    FROM {table_name} p
                    LEFT JOIN users u ON p.user_id = u.id
                    WHERE p.is_online = TRUE
                """)
            )

            for row in result.fetchall():
                online_users.append({
                    'profile_type': profile_type,
                    'profile_id': row[0],
                    f'{profile_type}_profile_id': row[0],
                    'name': row[1],
                    'avatar': row[2],
                    'is_online': True
                })
        except Exception as e:
            print(f"❌ Error querying online {profile_type}s: {e}")

    return online_users


async def handle_get_online_users(db: Session, sender_key: str, profile_types: list = None):
    """
    Handle request to get list of online users from database.

    Args:
        db: Database session
        sender_key: The sender's connection key
        profile_types: Optional list of profile types to filter
    """
    online_users = get_online_users_from_db(db, profile_types)

    # Send the list back to the requester
    await manager.send_personal_message({
        "type": "online_users_list",
        "users": online_users,
        "count": len(online_users),
        "timestamp": datetime.utcnow().isoformat()
    }, sender_key)

    print(f"📋 Sent online users list ({len(online_users)} users) to {sender_key}")


# ============================================
# WHITEBOARD REAL-TIME COLLABORATION HANDLERS
# ============================================

async def handle_whiteboard_message(data: dict, sender_key: str, db: Session = None):
    """
    Handle whiteboard collaboration messages for real-time sync.

    Message types:
    - whiteboard_stroke: Drawing strokes to sync across participants
    - whiteboard_cursor: Cursor position updates
    - whiteboard_text_typing: Real-time text typing preview
    - whiteboard_permission_request: Student requesting drawing permission
    - whiteboard_permission_granted: Host granting permission
    - whiteboard_permission_denied: Host denying permission
    - whiteboard_page_change: Page navigation sync
    - whiteboard_clear: Clear canvas action

    Args:
        data: The message data
        sender_key: The sender's connection key (e.g., "tutor_123" or "student_456")
        db: Optional database session
    """
    message_type = data.get("type")
    session_id = data.get("session_id")
    recipient_key = get_recipient_connection_key(data)

    print(f"🎨 Whiteboard message: type={message_type}, sender={sender_key}, recipient={recipient_key}")

    if not recipient_key:
        print(f"⚠️ No recipient specified in whiteboard message from {sender_key}")
        return

    if message_type == "whiteboard_stroke":
        # Forward stroke data to recipient for real-time canvas sync
        # IMPORTANT: Frontend sends stroke data nested in a "stroke" object
        stroke = data.get("stroke", {})

        await manager.send_personal_message({
            "type": "whiteboard_stroke",
            "session_id": session_id,
            "page_id": data.get("page_id"),
            # Send complete stroke object (frontend expects data.stroke)
            "stroke": stroke,
            # Also include sender info for handleRemoteStroke()
            "sender_id": data.get("sender_id"),
            "sender_role": data.get("sender_role"),
            "sender_name": data.get("sender_name"),
            # Legacy fields for backwards compatibility
            "stroke_type": stroke.get("stroke_type"),
            "stroke_data": stroke.get("stroke_data"),
            "user_id": data.get("user_id"),
            "from_student_profile_id": data.get("from_student_profile_id"),
            "from_tutor_profile_id": data.get("from_tutor_profile_id"),
            "timestamp": datetime.utcnow().isoformat()
        }, recipient_key)
        # Log stroke relay for debugging
        print(f"🎨 Relayed stroke: {stroke.get('stroke_type')} from {sender_key} to {recipient_key}")

    elif message_type == "whiteboard_cursor":
        # Forward cursor position for collaborative awareness
        await manager.send_personal_message({
            "type": "whiteboard_cursor",
            "session_id": session_id,
            "page_id": data.get("page_id"),
            "x": data.get("x"),
            "y": data.get("y"),
            "sender_id": data.get("sender_id"),
            "sender_name": data.get("sender_name"),
            "sender_role": data.get("sender_role"),
            # Legacy fields for backwards compatibility
            "user_id": data.get("user_id"),
            "user_name": data.get("user_name"),
            "from_student_profile_id": data.get("from_student_profile_id"),
            "from_tutor_profile_id": data.get("from_tutor_profile_id"),
            "timestamp": datetime.utcnow().isoformat()
        }, recipient_key)
        # Don't log cursor movements as they're very frequent

    elif message_type == "whiteboard_text_typing":
        # Forward real-time text typing to recipient
        await manager.send_personal_message({
            "type": "whiteboard_text_typing",
            "session_id": session_id,
            "page_id": data.get("page_id"),
            "text": data.get("text"),
            "x": data.get("x"),
            "y": data.get("y"),
            "color": data.get("color"),
            "fontSize": data.get("fontSize"),
            "sender_id": data.get("sender_id"),
            "sender_name": data.get("sender_name"),
            "sender_role": data.get("sender_role"),
            "from_student_profile_id": data.get("from_student_profile_id"),
            "from_tutor_profile_id": data.get("from_tutor_profile_id"),
            "timestamp": datetime.utcnow().isoformat()
        }, recipient_key)
        # Log text typing for debugging
        print(f"⌨️ Relayed text typing from {sender_key} to {recipient_key}: \"{data.get('text', '')[:30]}...\"")

    elif message_type == "whiteboard_permission_request":
        # Student requesting drawing permission from host
        await manager.send_personal_message({
            "type": "whiteboard_permission_request",
            "session_id": session_id,
            "requester_id": data.get("requester_id"),
            "requester_name": data.get("requester_name"),
            "requester_avatar": data.get("requester_avatar"),
            "requester_profile_type": data.get("requester_profile_type"),
            "from_student_profile_id": data.get("from_student_profile_id"),
            "from_tutor_profile_id": data.get("from_tutor_profile_id"),
            "timestamp": datetime.utcnow().isoformat()
        }, recipient_key)
        print(f"✋ Permission request from {sender_key} to {recipient_key}")

    elif message_type == "whiteboard_permission_granted":
        # Host granting drawing permission to participant
        await manager.send_personal_message({
            "type": "whiteboard_permission_granted",
            "session_id": session_id,
            "target_id": data.get("target_id"),
            "permissions": data.get("permissions", {"can_draw": True, "can_write": True, "can_erase": True}),
            "from_student_profile_id": data.get("from_student_profile_id"),
            "from_tutor_profile_id": data.get("from_tutor_profile_id"),
            "timestamp": datetime.utcnow().isoformat()
        }, recipient_key)
        print(f"✅ Permission granted by {sender_key} to {recipient_key}")

    elif message_type == "whiteboard_permission_denied":
        # Host denying drawing permission
        await manager.send_personal_message({
            "type": "whiteboard_permission_denied",
            "session_id": session_id,
            "target_id": data.get("target_id"),
            "from_student_profile_id": data.get("from_student_profile_id"),
            "from_tutor_profile_id": data.get("from_tutor_profile_id"),
            "timestamp": datetime.utcnow().isoformat()
        }, recipient_key)
        print(f"❌ Permission denied by {sender_key} to {recipient_key}")

    elif message_type == "whiteboard_permission_revoked":
        # Host revoking previously granted permission
        await manager.send_personal_message({
            "type": "whiteboard_permission_revoked",
            "session_id": session_id,
            "target_id": data.get("target_id"),
            "from_student_profile_id": data.get("from_student_profile_id"),
            "from_tutor_profile_id": data.get("from_tutor_profile_id"),
            "timestamp": datetime.utcnow().isoformat()
        }, recipient_key)
        print(f"🚫 Permission revoked by {sender_key} for {recipient_key}")

    elif message_type == "whiteboard_page_change":
        # Sync page navigation across participants
        await manager.send_personal_message({
            "type": "whiteboard_page_change",
            "session_id": session_id,
            "action": data.get("action"),  # 'add', 'navigate', 'delete'
            "page": data.get("page"),  # Full page object
            "sender_id": data.get("sender_id"),
            "sender_name": data.get("sender_name"),
            "sender_role": data.get("sender_role"),
            "from_profile_id": data.get("from_profile_id"),
            "from_profile_type": data.get("from_profile_type"),
            # Legacy fields for backward compatibility
            "page_id": data.get("page_id") or (data.get("page", {}).get("id") if data.get("page") else None),
            "page_number": data.get("page_number") or (data.get("page", {}).get("page_number") if data.get("page") else None),
            "from_student_profile_id": data.get("from_student_profile_id"),
            "from_tutor_profile_id": data.get("from_tutor_profile_id"),
            "timestamp": datetime.utcnow().isoformat()
        }, recipient_key)
        print(f"📄 Page change synced from {sender_key} to {recipient_key}: action={data.get('action')}")

    elif message_type == "whiteboard_clear":
        # Sync clear canvas action
        await manager.send_personal_message({
            "type": "whiteboard_clear",
            "session_id": session_id,
            "page_id": data.get("page_id"),
            "from_student_profile_id": data.get("from_student_profile_id"),
            "from_tutor_profile_id": data.get("from_tutor_profile_id"),
            "timestamp": datetime.utcnow().isoformat()
        }, recipient_key)
        print(f"🗑️ Canvas clear synced from {sender_key} to {recipient_key}")

    elif message_type == "whiteboard_undo":
        # Sync undo action
        await manager.send_personal_message({
            "type": "whiteboard_undo",
            "session_id": session_id,
            "page_id": data.get("page_id"),
            "stroke_id": data.get("stroke_id"),
            "from_student_profile_id": data.get("from_student_profile_id"),
            "from_tutor_profile_id": data.get("from_tutor_profile_id"),
            "timestamp": datetime.utcnow().isoformat()
        }, recipient_key)
        print(f"↩️ Undo synced from {sender_key} to {recipient_key}")

    elif message_type == "whiteboard_tool_change":
        # Sync tool selection across participants (bidirectional)
        # Broadcast tool change to recipient for real-time toolbar synchronization
        await manager.send_personal_message({
            "type": "whiteboard_tool_change",
            "session_id": session_id,
            "tool": data.get("tool"),
            "sender_id": data.get("sender_id"),
            "sender_role": data.get("sender_role"),
            "sender_name": data.get("sender_name"),
            "timestamp": data.get("timestamp", datetime.utcnow().isoformat())
        }, recipient_key)
        print(f"🔧 Tool change synced from {sender_key} to {recipient_key}: {data.get('tool')}")

    elif message_type == "whiteboard_color_change":
        # Sync color selection across participants (bidirectional)
        await manager.send_personal_message({
            "type": "whiteboard_color_change",
            "session_id": session_id,
            "color": data.get("color"),
            "sender_id": data.get("sender_id"),
            "sender_role": data.get("sender_role"),
            "sender_name": data.get("sender_name"),
            "timestamp": data.get("timestamp", datetime.utcnow().isoformat())
        }, recipient_key)
        print(f"🎨 Color change synced from {sender_key} to {recipient_key}: {data.get('color')}")

    else:
        print(f"⚠️ Unknown whiteboard message type: {message_type}")