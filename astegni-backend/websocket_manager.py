
# ============================================
# websocket_manager.py - WebSocket management for real-time features
# ============================================

"""
websocket_manager.py - WebSocket management for Astegni Platform
Handles real-time chat, notifications, and live sessions
"""

from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException
from datetime import datetime
import json
import asyncio
from sqlalchemy.orm import Session

class ConnectionManager:
    """Manages WebSocket connections for real-time features"""
    
    def __init__(self):
        # Active connections by user ID
        self.active_connections: Dict[int, List[WebSocket]] = {}
        
        # Room-based connections (for group chats, live sessions)
        self.room_connections: Dict[str, Set[int]] = {}
        
        # User to rooms mapping
        self.user_rooms: Dict[int, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        
        # Send connection confirmation
        await self.send_personal_message(
            {"type": "connection", "status": "connected", "user_id": user_id},
            user_id
        )
        
        print(f"User {user_id} connected via WebSocket")
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        """Remove a WebSocket connection"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            
            # Remove user if no more connections
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                
                # Leave all rooms
                if user_id in self.user_rooms:
                    for room in self.user_rooms[user_id]:
                        if room in self.room_connections:
                            self.room_connections[room].discard(user_id)
                    del self.user_rooms[user_id]
        
        print(f"User {user_id} disconnected from WebSocket")
    
    async def send_personal_message(self, message: dict, user_id: int):
        """Send a message to a specific user"""
        if user_id in self.active_connections:
            message_text = json.dumps(message)
            
            # Send to all connections of this user
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message_text)
                except:
                    # Remove dead connections
                    self.active_connections[user_id].remove(connection)
    
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