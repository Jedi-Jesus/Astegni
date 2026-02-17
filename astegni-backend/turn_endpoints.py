"""
TURN Server Credentials Endpoint
==================================
Generates time-limited HMAC-SHA1 credentials for the coturn TURN server.
Uses the RFC 5766 / coturn 'use-auth-secret' mechanism.
"""

import os
import time
import hmac
import hashlib
import base64
from fastapi import APIRouter, Depends
from utils import get_current_user

router = APIRouter()

TURN_SECRET = os.getenv('TURN_SECRET', '2b348e654f5ea2a565eda13d5289a35fbceba7806123c2099f50a24b1de6dc1e')
TURN_HOST = os.getenv('TURN_HOST', '128.140.122.215')
TURN_TTL = 86400  # credentials valid for 24 hours


@router.get("/api/turn-credentials")
async def get_turn_credentials(current_user: dict = Depends(get_current_user)):
    """
    Generate time-limited TURN credentials for WebRTC.
    Credentials are valid for 24 hours.
    """
    # username = "<expiry_timestamp>:<user_id>"
    expiry = int(time.time()) + TURN_TTL
    username = f"{expiry}:{current_user.id}"

    # HMAC-SHA1 of the username using the shared secret
    mac = hmac.new(TURN_SECRET.encode(), username.encode(), hashlib.sha1)
    password = base64.b64encode(mac.digest()).decode()

    return {
        "ttl": TURN_TTL,
        "iceServers": [
            # Google STUN (free, no auth needed)
            {"urls": "stun:stun.l.google.com:19302"},
            {"urls": "stun:stun1.l.google.com:19302"},
            # Our TURN server — UDP (fastest)
            {
                "urls": f"turn:{TURN_HOST}:3478?transport=udp",
                "username": username,
                "credential": password
            },
            # Our TURN server — TCP (fallback for UDP-blocked networks)
            {
                "urls": f"turn:{TURN_HOST}:3478?transport=tcp",
                "username": username,
                "credential": password
            },
            # Our TURN server — TLS (fallback for strict firewalls)
            {
                "urls": f"turns:{TURN_HOST}:5349?transport=tcp",
                "username": username,
                "credential": password
            },
        ]
    }
