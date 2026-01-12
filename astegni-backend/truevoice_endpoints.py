"""
TrueVoice Endpoints - Voice-Personalized Messaging for Astegni
================================================================
TrueVoice allows users to hear chat messages in the sender's actual voice.

Endpoints:
- GET  /api/truevoice/profile         - Get current user's TrueVoice profile
- POST /api/truevoice/enroll          - Start voice enrollment
- POST /api/truevoice/upload-sample   - Upload voice sample
- POST /api/truevoice/complete-enrollment - Complete enrollment and create voice model
- PUT  /api/truevoice/settings        - Update TrueVoice settings
- DELETE /api/truevoice/profile       - Delete voice profile

- POST /api/truevoice/synthesize/{message_id} - Synthesize message audio
- GET  /api/truevoice/audio/{message_id}      - Get cached audio for message
- GET  /api/truevoice/check/{user_id}         - Check if user has TrueVoice enabled

Admin/Utility:
- POST /api/truevoice/cleanup-cache   - Clean up expired cache entries
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Header
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import hashlib
import httpx
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Router
router = APIRouter(prefix="/api/truevoice", tags=["TrueVoice"])

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

# ElevenLabs API (for voice synthesis)
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"

# Cache TTL (30 days default)
CACHE_TTL_DAYS = int(os.getenv("TRUEVOICE_CACHE_TTL_DAYS", "30"))


def get_db():
    """Get database connection"""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()


# =====================================================
# Pydantic Models
# =====================================================

class TrueVoiceProfileResponse(BaseModel):
    id: int
    user_id: int
    voice_model_id: Optional[str]
    voice_name: Optional[str]
    enrollment_status: str
    enrollment_progress: int
    is_active: bool
    consent_given: bool
    allow_students_to_hear: bool
    allow_parents_to_hear: bool
    allow_tutors_to_hear: bool
    allow_in_groups: bool
    total_syntheses: int
    created_at: Optional[str]


class TrueVoiceSettingsUpdate(BaseModel):
    is_active: Optional[bool] = None
    allow_students_to_hear: Optional[bool] = None
    allow_parents_to_hear: Optional[bool] = None
    allow_tutors_to_hear: Optional[bool] = None
    allow_in_groups: Optional[bool] = None
    allow_in_channels: Optional[bool] = None
    auto_play_for_recipients: Optional[bool] = None
    default_speed: Optional[float] = None


class EnrollmentStartRequest(BaseModel):
    voice_name: Optional[str] = None
    consent_given: bool = False


class SynthesisResponse(BaseModel):
    audio_url: str
    cached: bool
    duration_ms: Optional[int]
    message_id: int


# =====================================================
# Helper Functions
# =====================================================

def get_current_user_id(authorization: str = None) -> int:
    """Extract user ID from authorization token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization required")

    # Extract token from Bearer header
    try:
        token = authorization.replace("Bearer ", "").strip()
        SECRET_KEY = os.getenv('SECRET_KEY')

        if not SECRET_KEY:
            print("[TrueVoice] WARNING: SECRET_KEY not found in environment!")
            raise HTTPException(status_code=500, detail="Server configuration error")

        ALGORITHM = 'HS256'

        # Decode and verify token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        return int(user_id)
    except jwt.ExpiredSignatureError as e:
        print(f"[TrueVoice] Token expired: {e}")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        print(f"[TrueVoice] Invalid token error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except ValueError as e:
        print(f"[TrueVoice] ValueError: {e}")
        raise HTTPException(status_code=401, detail="Invalid user ID in token")
    except Exception as e:
        print(f"[TrueVoice] Unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")


def generate_content_hash(content: str, voice_id: str) -> str:
    """Generate a hash for cache lookup"""
    combined = f"{content}:{voice_id}"
    return hashlib.sha256(combined.encode()).hexdigest()


async def synthesize_with_elevenlabs(text: str, voice_id: str) -> tuple:
    """
    Synthesize text to speech using ElevenLabs API.
    Returns (audio_bytes, duration_ms)
    """
    if not ELEVENLABS_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="TrueVoice synthesis not configured. Please set ELEVENLABS_API_KEY."
        )

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{ELEVENLABS_API_URL}/text-to-speech/{voice_id}",
            headers={
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json"
            },
            json={
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            },
            timeout=30.0
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"ElevenLabs API error: {response.text}"
            )

        audio_bytes = response.content
        # Estimate duration (rough: 150 words/min, average 5 chars/word)
        estimated_duration = int(len(text) / 5 / 150 * 60 * 1000)

        return audio_bytes, estimated_duration


# =====================================================
# Profile Endpoints
# =====================================================

@router.get("/profile")
async def get_truevoice_profile(
    authorization: str = Header(None, alias="Authorization"),
    conn = Depends(get_db)
):
    """Get current user's TrueVoice profile"""
    user_id = get_current_user_id(authorization)

    cur = conn.cursor()
    cur.execute("""
        SELECT * FROM truevoice_profiles WHERE user_id = %s
    """, (user_id,))

    profile = cur.fetchone()
    cur.close()

    if not profile:
        return {
            "has_profile": False,
            "message": "No TrueVoice profile. Start enrollment to create one."
        }

    return {
        "has_profile": True,
        "profile": dict(profile)
    }


@router.post("/enroll")
async def start_enrollment(
    request: EnrollmentStartRequest,
    authorization: str = Header(None, alias="Authorization"),
    conn = Depends(get_db)
):
    """Start TrueVoice enrollment process"""
    user_id = get_current_user_id(authorization)

    if not request.consent_given:
        raise HTTPException(
            status_code=400,
            detail="You must give consent to use TrueVoice"
        )

    cur = conn.cursor()

    # Check if profile already exists
    cur.execute("SELECT id, enrollment_status FROM truevoice_profiles WHERE user_id = %s", (user_id,))
    existing = cur.fetchone()

    if existing:
        if existing['enrollment_status'] == 'active':
            raise HTTPException(
                status_code=400,
                detail="You already have an active TrueVoice profile"
            )
        # Reset existing profile for re-enrollment
        cur.execute("""
            UPDATE truevoice_profiles
            SET enrollment_status = 'pending',
                enrollment_progress = 0,
                consent_given = TRUE,
                consent_given_at = CURRENT_TIMESTAMP,
                voice_name = %s,
                sample_urls = '[]',
                sample_texts = '[]',
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            RETURNING id
        """, (request.voice_name or "My Voice", user_id))
    else:
        # Create new profile
        cur.execute("""
            INSERT INTO truevoice_profiles (
                user_id, voice_name, consent_given, consent_given_at,
                enrollment_status, enrollment_progress
            )
            VALUES (%s, %s, TRUE, CURRENT_TIMESTAMP, 'pending', 0)
            RETURNING id
        """, (user_id, request.voice_name or "My Voice"))

    profile_id = cur.fetchone()['id']
    conn.commit()
    cur.close()

    # Sample texts for voice enrollment (diverse phonemes)
    sample_texts = [
        "Hello, I'm excited to use TrueVoice to connect with my students.",
        "The quick brown fox jumps over the lazy dog near the riverbank.",
        "Mathematics helps us understand patterns in nature and solve real-world problems.",
        "Learning a new language opens doors to different cultures and perspectives.",
        "Science experiments teach us to observe, hypothesize, and discover truth."
    ]

    return {
        "success": True,
        "profile_id": profile_id,
        "message": "Enrollment started. Please record the sample texts.",
        "sample_texts": sample_texts,
        "instructions": [
            "Record yourself reading each text clearly",
            "Use a quiet environment with minimal background noise",
            "Speak at your natural pace",
            "Total recording time should be 2-5 minutes"
        ]
    }


@router.post("/upload-sample")
async def upload_voice_sample(
    sample_index: int = Form(...),
    sample_text: str = Form(...),
    audio_file: UploadFile = File(...),
    authorization: str = Header(None, alias="Authorization"),
    conn = Depends(get_db)
):
    """Upload a voice sample for enrollment"""
    user_id = get_current_user_id(authorization)

    cur = conn.cursor()
    cur.execute("""
        SELECT id, sample_urls, sample_texts, enrollment_status
        FROM truevoice_profiles
        WHERE user_id = %s
    """, (user_id,))

    profile = cur.fetchone()
    if not profile:
        raise HTTPException(status_code=404, detail="No enrollment in progress")

    if profile['enrollment_status'] == 'active':
        raise HTTPException(status_code=400, detail="Enrollment already complete")

    # Read audio file
    audio_content = await audio_file.read()

    # Upload to Backblaze (using existing service)
    try:
        from backblaze_service import upload_file
        file_url = upload_file(
            audio_content,
            f"truevoice_sample_{user_id}_{sample_index}.wav",
            "audio",
            user_id
        )
    except Exception as e:
        # Fallback: store locally for development
        import base64
        file_url = f"data:audio/wav;base64,{base64.b64encode(audio_content).decode()}"

    # Update sample arrays
    sample_urls = profile['sample_urls'] or []
    sample_texts_arr = profile['sample_texts'] or []

    # Ensure arrays are the right size
    while len(sample_urls) <= sample_index:
        sample_urls.append(None)
    while len(sample_texts_arr) <= sample_index:
        sample_texts_arr.append(None)

    sample_urls[sample_index] = file_url
    sample_texts_arr[sample_index] = sample_text

    # Calculate progress (assuming 5 samples needed)
    filled_samples = sum(1 for url in sample_urls if url)
    progress = min(100, int(filled_samples / 5 * 100))

    cur.execute("""
        UPDATE truevoice_profiles
        SET sample_urls = %s,
            sample_texts = %s,
            enrollment_progress = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = %s
    """, (
        psycopg2.extras.Json(sample_urls),
        psycopg2.extras.Json(sample_texts_arr),
        progress,
        user_id
    ))

    conn.commit()
    cur.close()

    return {
        "success": True,
        "sample_index": sample_index,
        "progress": progress,
        "message": f"Sample {sample_index + 1} uploaded. Progress: {progress}%"
    }


@router.post("/complete-enrollment")
async def complete_enrollment(
    authorization: str = Header(None, alias="Authorization"),
    conn = Depends(get_db)
):
    """Complete enrollment and create voice model"""
    user_id = get_current_user_id(authorization)

    cur = conn.cursor()
    cur.execute("""
        SELECT * FROM truevoice_profiles WHERE user_id = %s
    """, (user_id,))

    profile = cur.fetchone()
    if not profile:
        raise HTTPException(status_code=404, detail="No enrollment in progress")

    if profile['enrollment_status'] == 'active':
        raise HTTPException(status_code=400, detail="Already enrolled")

    sample_urls = profile['sample_urls'] or []
    filled_samples = sum(1 for url in sample_urls if url)

    if filled_samples < 3:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 3 samples. You have {filled_samples}."
        )

    # Create voice model with ElevenLabs (or mock for dev)
    voice_model_id = None

    if ELEVENLABS_API_KEY:
        try:
            # In production, you would:
            # 1. Download all samples
            # 2. Send to ElevenLabs voice cloning API
            # 3. Get back a voice_id
            # For now, we'll use a placeholder
            voice_model_id = f"tv_{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        except Exception as e:
            cur.execute("""
                UPDATE truevoice_profiles
                SET enrollment_status = 'failed',
                    enrollment_error = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
            """, (str(e), user_id))
            conn.commit()
            raise HTTPException(status_code=500, detail=f"Voice model creation failed: {e}")
    else:
        # Development mode: create mock voice ID
        voice_model_id = f"mock_voice_{user_id}"

    # Activate profile
    cur.execute("""
        UPDATE truevoice_profiles
        SET enrollment_status = 'active',
            enrollment_progress = 100,
            voice_model_id = %s,
            is_active = TRUE,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = %s
    """, (voice_model_id, user_id))

    conn.commit()
    cur.close()

    return {
        "success": True,
        "message": "TrueVoice enrollment complete! Your voice is now active.",
        "voice_model_id": voice_model_id
    }


@router.put("/settings")
async def update_truevoice_settings(
    settings: TrueVoiceSettingsUpdate,
    authorization: str = Header(None, alias="Authorization"),
    conn = Depends(get_db)
):
    """Update TrueVoice settings"""
    user_id = get_current_user_id(authorization)

    cur = conn.cursor()

    # Build dynamic update query
    updates = []
    values = []

    if settings.is_active is not None:
        updates.append("is_active = %s")
        values.append(settings.is_active)
    if settings.allow_students_to_hear is not None:
        updates.append("allow_students_to_hear = %s")
        values.append(settings.allow_students_to_hear)
    if settings.allow_parents_to_hear is not None:
        updates.append("allow_parents_to_hear = %s")
        values.append(settings.allow_parents_to_hear)
    if settings.allow_tutors_to_hear is not None:
        updates.append("allow_tutors_to_hear = %s")
        values.append(settings.allow_tutors_to_hear)
    if settings.allow_in_groups is not None:
        updates.append("allow_in_groups = %s")
        values.append(settings.allow_in_groups)
    if settings.allow_in_channels is not None:
        updates.append("allow_in_channels = %s")
        values.append(settings.allow_in_channels)
    if settings.auto_play_for_recipients is not None:
        updates.append("auto_play_for_recipients = %s")
        values.append(settings.auto_play_for_recipients)
    if settings.default_speed is not None:
        updates.append("default_speed = %s")
        values.append(settings.default_speed)

    if not updates:
        raise HTTPException(status_code=400, detail="No settings to update")

    updates.append("updated_at = CURRENT_TIMESTAMP")
    values.append(user_id)

    cur.execute(f"""
        UPDATE truevoice_profiles
        SET {', '.join(updates)}
        WHERE user_id = %s
        RETURNING *
    """, values)

    updated = cur.fetchone()
    conn.commit()
    cur.close()

    if not updated:
        raise HTTPException(status_code=404, detail="TrueVoice profile not found")

    return {
        "success": True,
        "message": "Settings updated",
        "profile": dict(updated)
    }


@router.delete("/profile")
async def delete_truevoice_profile(
    authorization: str = Header(None, alias="Authorization"),
    conn = Depends(get_db)
):
    """Delete TrueVoice profile and all cached audio"""
    user_id = get_current_user_id(authorization)

    cur = conn.cursor()

    # Get profile for cleanup
    cur.execute("SELECT id, voice_model_id FROM truevoice_profiles WHERE user_id = %s", (user_id,))
    profile = cur.fetchone()

    if not profile:
        raise HTTPException(status_code=404, detail="No TrueVoice profile found")

    # Delete cached audio first (cascade should handle this, but being explicit)
    cur.execute("""
        DELETE FROM truevoice_audio_cache
        WHERE voice_profile_id = %s
    """, (profile['id'],))

    # Delete profile
    cur.execute("DELETE FROM truevoice_profiles WHERE user_id = %s", (user_id,))

    conn.commit()
    cur.close()

    # TODO: Delete voice model from ElevenLabs if using their API

    return {
        "success": True,
        "message": "TrueVoice profile deleted successfully"
    }


# =====================================================
# Synthesis & Playback Endpoints
# =====================================================

@router.post("/synthesize/{message_id}")
async def synthesize_message(
    message_id: int,
    authorization: str = Header(None, alias="Authorization"),
    conn = Depends(get_db)
):
    """
    Synthesize a message using the sender's TrueVoice.
    Returns cached audio if available, otherwise generates new audio.
    """
    user_id = get_current_user_id(authorization)
    cur = conn.cursor()

    # Get message
    cur.execute("""
        SELECT cm.*, u.first_name, u.father_name
        FROM chat_messages cm
        JOIN users u ON cm.sender_user_id = u.id
        WHERE cm.id = %s
    """, (message_id,))

    message = cur.fetchone()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if not message['content']:
        raise HTTPException(status_code=400, detail="Message has no text content")

    # Get sender's TrueVoice profile
    cur.execute("""
        SELECT * FROM truevoice_profiles
        WHERE user_id = %s AND is_active = TRUE AND enrollment_status = 'active'
    """, (message['sender_user_id'],))

    voice_profile = cur.fetchone()
    if not voice_profile:
        raise HTTPException(
            status_code=404,
            detail="Sender does not have TrueVoice enabled"
        )

    # Check if recipient is allowed to hear this voice
    # (You would check the recipient's role against allow_* settings)

    # Check cache first
    content_hash = generate_content_hash(message['content'], voice_profile['voice_model_id'])

    cur.execute("""
        SELECT * FROM truevoice_audio_cache
        WHERE content_hash = %s AND voice_profile_id = %s
    """, (content_hash, voice_profile['id']))

    cached = cur.fetchone()

    if cached:
        # Update access stats
        cur.execute("""
            UPDATE truevoice_audio_cache
            SET access_count = access_count + 1,
                last_accessed_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (cached['id'],))
        conn.commit()
        cur.close()

        return {
            "success": True,
            "cached": True,
            "audio_url": cached['audio_url'],
            "duration_ms": cached['audio_duration'],
            "message_id": message_id,
            "speaker_name": f"{message['first_name']} {message['father_name']}"
        }

    # Generate new audio
    start_time = datetime.now()

    try:
        if ELEVENLABS_API_KEY and voice_profile['voice_model_id'].startswith('tv_'):
            # Real ElevenLabs synthesis
            audio_bytes, duration_ms = await synthesize_with_elevenlabs(
                message['content'],
                voice_profile['voice_model_id']
            )

            # Upload to Backblaze
            from backblaze_service import upload_file
            audio_url = upload_file(
                audio_bytes,
                f"truevoice_{message_id}_{voice_profile['id']}.mp3",
                "audio",
                user_id
            )
        else:
            # Development mode: use browser TTS or return placeholder
            audio_url = f"/api/truevoice/tts-fallback?text={message['content'][:200]}"
            duration_ms = int(len(message['content']) / 5 / 150 * 60 * 1000)

    except Exception as e:
        cur.close()
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {e}")

    generation_time = int((datetime.now() - start_time).total_seconds() * 1000)

    # Cache the audio
    cur.execute("""
        INSERT INTO truevoice_audio_cache (
            message_id, voice_profile_id, content_hash, audio_url,
            audio_duration, characters_used, generation_time_ms,
            expires_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (message_id, voice_profile_id) DO UPDATE
        SET audio_url = EXCLUDED.audio_url,
            audio_duration = EXCLUDED.audio_duration,
            access_count = truevoice_audio_cache.access_count + 1,
            last_accessed_at = CURRENT_TIMESTAMP
    """, (
        message_id,
        voice_profile['id'],
        content_hash,
        audio_url,
        duration_ms,
        len(message['content']),
        generation_time,
        datetime.now() + timedelta(days=CACHE_TTL_DAYS)
    ))

    # Update voice profile usage stats
    cur.execute("""
        UPDATE truevoice_profiles
        SET total_syntheses = total_syntheses + 1,
            total_characters_used = total_characters_used + %s,
            last_used_at = CURRENT_TIMESTAMP
        WHERE id = %s
    """, (len(message['content']), voice_profile['id']))

    conn.commit()
    cur.close()

    return {
        "success": True,
        "cached": False,
        "audio_url": audio_url,
        "duration_ms": duration_ms,
        "message_id": message_id,
        "speaker_name": f"{message['first_name']} {message['father_name']}",
        "generation_time_ms": generation_time
    }


@router.get("/audio/{message_id}")
async def get_cached_audio(
    message_id: int,
    authorization: str = Header(None, alias="Authorization"),
    conn = Depends(get_db)
):
    """Get cached audio URL for a message (if available)"""
    user_id = get_current_user_id(authorization)
    cur = conn.cursor()

    cur.execute("""
        SELECT tac.*, tp.voice_name, u.first_name, u.father_name
        FROM truevoice_audio_cache tac
        JOIN truevoice_profiles tp ON tac.voice_profile_id = tp.id
        JOIN chat_messages cm ON tac.message_id = cm.id
        JOIN users u ON cm.sender_user_id = u.id
        WHERE tac.message_id = %s
    """, (message_id,))

    cached = cur.fetchone()
    cur.close()

    if not cached:
        return {
            "has_audio": False,
            "message": "No cached audio for this message"
        }

    return {
        "has_audio": True,
        "audio_url": cached['audio_url'],
        "duration_ms": cached['audio_duration'],
        "voice_name": cached['voice_name'],
        "speaker_name": f"{cached['first_name']} {cached['father_name']}"
    }


@router.get("/check/{user_id}")
async def check_truevoice_status(
    user_id: int,
    conn = Depends(get_db)
):
    """Check if a user has TrueVoice enabled (public endpoint)"""
    cur = conn.cursor()

    cur.execute("""
        SELECT is_active, voice_name, allow_students_to_hear,
               allow_parents_to_hear, allow_tutors_to_hear
        FROM truevoice_profiles
        WHERE user_id = %s AND enrollment_status = 'active'
    """, (user_id,))

    profile = cur.fetchone()
    cur.close()

    if not profile or not profile['is_active']:
        return {
            "has_truevoice": False
        }

    return {
        "has_truevoice": True,
        "voice_name": profile['voice_name'],
        "permissions": {
            "students": profile['allow_students_to_hear'],
            "parents": profile['allow_parents_to_hear'],
            "tutors": profile['allow_tutors_to_hear']
        }
    }


# =====================================================
# Utility Endpoints
# =====================================================

@router.post("/cleanup-cache")
async def cleanup_expired_cache(
    authorization: str = Header(None, alias="Authorization"),
    conn = Depends(get_db)
):
    """Clean up expired cache entries (admin only)"""
    # TODO: Add admin check

    cur = conn.cursor()

    cur.execute("""
        DELETE FROM truevoice_audio_cache
        WHERE expires_at < CURRENT_TIMESTAMP
        RETURNING id
    """)

    deleted = cur.fetchall()
    conn.commit()
    cur.close()

    return {
        "success": True,
        "deleted_count": len(deleted),
        "message": f"Cleaned up {len(deleted)} expired cache entries"
    }


@router.get("/stats")
async def get_truevoice_stats(
    authorization: str = Header(None, alias="Authorization"),
    conn = Depends(get_db)
):
    """Get TrueVoice usage statistics for current user"""
    user_id = get_current_user_id(authorization)
    cur = conn.cursor()

    cur.execute("""
        SELECT
            tp.*,
            (SELECT COUNT(*) FROM truevoice_audio_cache WHERE voice_profile_id = tp.id) as cached_audio_count,
            (SELECT SUM(audio_size) FROM truevoice_audio_cache WHERE voice_profile_id = tp.id) as total_cache_size
        FROM truevoice_profiles tp
        WHERE tp.user_id = %s
    """, (user_id,))

    profile = cur.fetchone()
    cur.close()

    if not profile:
        return {"has_profile": False}

    return {
        "has_profile": True,
        "enrollment_status": profile['enrollment_status'],
        "is_active": profile['is_active'],
        "total_syntheses": profile['total_syntheses'],
        "total_characters_used": profile['total_characters_used'],
        "cached_audio_count": profile['cached_audio_count'] or 0,
        "total_cache_size_bytes": profile['total_cache_size'] or 0,
        "last_used_at": profile['last_used_at']
    }


# =====================================================
# TTS Fallback (for development without ElevenLabs)
# =====================================================

@router.get("/tts-fallback")
async def tts_fallback(text: str = Query(..., max_length=500)):
    """
    Fallback TTS using browser's speechSynthesis.
    Returns a simple JSON response that frontend can use with Web Speech API.
    """
    return {
        "type": "browser_tts",
        "text": text,
        "instructions": "Use browser's speechSynthesis API to speak this text"
    }
