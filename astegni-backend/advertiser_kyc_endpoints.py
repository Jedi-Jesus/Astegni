"""
Advertiser person-KYC (Stage 2 of advertiser dual KYC).

Person KYC identifies the human in charge of the ads — the advertiser account
OWNER. It is self-contained in astegni_advertiser_db (keyed on advertiser_id, no
users row), and mounted at /api/advertiser/kyc/*.

The face-detection / face-match / liveliness / B2-storage logic is identical to
the user KYC flow, so the PURE byte-level helpers are imported straight from
kyc_endpoints.py — no duplication. Only the data layer differs (raw psycopg on
the advertiser DB vs SQLAlchemy ORM on the user DB).

On success this flips advertiser_profiles.person_verified (NOT users.is_verified
and NOT company_profile.is_verified — person and company are distinct axes).
"""

from fastapi import APIRouter, Depends, HTTPException, Form, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import base64
import json
import os
import sys

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Reuse the pure (byte-in) helpers from the user KYC module — zero duplication.
from kyc_endpoints import (
    detect_face_in_image, compare_faces,
    detect_blink_in_frame, detect_smile_in_frame, detect_head_turn_in_frames,
    save_image_to_storage,
    KYC_MAX_ATTEMPTS, KYC_RESET_HOURS,
)
from advertiser_auth_endpoints import resolve_advertiser

load_dotenv()

ADVERTISER_DATABASE_URL = os.getenv(
    'ADVERTISER_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_advertiser_db'
)

router = APIRouter(prefix="/api/advertiser/kyc", tags=["Advertiser KYC"])

CHALLENGE_INSTRUCTIONS = [
    "1. Hold your Digital ID clearly in front of the camera",
    "2. Take a clear photo of your ID document",
    "3. Position your face in the circle",
    "4. Follow the instructions: Blink, Smile, Turn head slowly",
    "5. Keep still for the final capture",
]


def _libpq(url: str) -> str:
    return url.replace("postgresql+psycopg://", "postgresql://")


def get_db():
    return psycopg.connect(_libpq(ADVERTISER_DATABASE_URL), row_factory=dict_row)


def _now():
    return datetime.now(timezone.utc)


# ============================================
# MODELS
# ============================================

class KYCStartRequest(BaseModel):
    document_type: str = "digital_id"


# ============================================
# HELPERS
# ============================================

def _nonempty(v):
    return v is not None and str(v).strip() != ""


def _identity_complete(adv: dict):
    """Port of kyc_endpoints.identity_profile_complete for an advertiser_profiles row."""
    missing = []
    naming = (adv.get('naming_system') or 'ethiopian').lower()
    if not _nonempty(adv.get('first_name')):
        missing.append("first name")
    if naming == 'international':
        if not _nonempty(adv.get('last_name')):
            missing.append("last name")
    else:
        if not _nonempty(adv.get('father_name')):
            missing.append("father name")
        if not _nonempty(adv.get('grandfather_name')):
            missing.append("grandfather name")
    if adv.get('date_of_birth') is None:
        missing.append("date of birth")
    if not _nonempty(adv.get('email')):
        missing.append("email address")
    if not _nonempty(adv.get('gender')):
        missing.append("gender")
    return (len(missing) == 0, missing)


def _get_advertiser(cur, advertiser_id: int):
    cur.execute("SELECT * FROM advertiser_profiles WHERE id = %s", (advertiser_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Advertiser not found")
    return row


def _reset_attempts_if_window_expired(cur, verification: dict) -> bool:
    """If max attempts hit but KYC_RESET_HOURS has elapsed, reset the counter."""
    if (verification.get('attempt_count') or 0) < KYC_MAX_ATTEMPTS:
        return False
    last = verification.get('last_attempt_at')
    if last is not None:
        hours_since = (_now() - last).total_seconds() / 3600
        if hours_since < KYC_RESET_HOURS:
            return False
    cur.execute(
        "UPDATE advertiser_kyc_verifications SET attempt_count = 0, max_attempts = %s WHERE id = %s",
        (KYC_MAX_ATTEMPTS, verification['id']),
    )
    verification['attempt_count'] = 0
    return True


def _attempts_exceeded_detail(verification: dict) -> str:
    last = verification.get('last_attempt_at')
    hours_since = (_now() - last).total_seconds() / 3600 if last else 0
    hours_remaining = max(0, KYC_RESET_HOURS - hours_since)
    return f"Maximum attempts exceeded. Try again in {int(hours_remaining)}h {int((hours_remaining % 1) * 60)}m."


def _insert_attempt(cur, verification_id, advertiser_id, attempt_number, step,
                    image_type=None, image_url=None, status='pending',
                    error_message=None, analysis_result=None, completed=False):
    cur.execute(
        """INSERT INTO advertiser_kyc_verification_attempts
               (verification_id, advertiser_id, attempt_number, step, image_url,
                image_type, analysis_result, status, error_message, completed_at)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (verification_id, advertiser_id, attempt_number, step, image_url, image_type,
         psycopg.types.json.Json(analysis_result) if analysis_result is not None else None,
         status, error_message, _now() if completed else None),
    )


# ============================================
# ENDPOINTS
# ============================================

@router.post("/start")
async def start_kyc(request: KYCStartRequest, current_user = Depends(resolve_advertiser)):
    advertiser_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None
    if not advertiser_id:
        raise HTTPException(status_code=403, detail="Not authorized as advertiser")

    conn = get_db()
    try:
        cur = conn.cursor()
        adv = _get_advertiser(cur, advertiser_id)
        identity_ok, missing = _identity_complete(adv)
        if not identity_ok:
            raise HTTPException(status_code=400, detail={
                "code": "PROFILE_INCOMPLETE",
                "message": "Complete your profile before verifying your identity: " + ", ".join(missing) + ".",
                "missing_fields": missing,
            })

        cur.execute(
            """SELECT * FROM advertiser_kyc_verifications
               WHERE advertiser_id = %s AND status IN ('pending','in_progress','passed')
               ORDER BY id DESC LIMIT 1""",
            (advertiser_id,),
        )
        existing = cur.fetchone()
        if existing:
            if existing['status'] == 'passed':
                raise HTTPException(status_code=400, detail="You are already verified")
            conn.commit()
            return {
                "verification_id": existing['id'],
                "status": existing['status'],
                "challenge_type": existing['challenge_type'] or "blink_smile_turn",
                "challenge_instructions": CHALLENGE_INSTRUCTIONS,
                "expires_at": (existing['expires_at'] or (_now() + timedelta(hours=1))).isoformat(),
            }

        cur.execute(
            """INSERT INTO advertiser_kyc_verifications
                   (advertiser_id, status, document_type, challenge_type, expires_at, max_attempts)
               VALUES (%s, 'pending', %s, 'blink_smile_turn', %s, %s)
               RETURNING id, status, challenge_type, expires_at""",
            (advertiser_id, request.document_type, _now() + timedelta(hours=1), KYC_MAX_ATTEMPTS),
        )
        v = cur.fetchone()
        conn.commit()
        return {
            "verification_id": v['id'],
            "status": v['status'],
            "challenge_type": v['challenge_type'],
            "challenge_instructions": CHALLENGE_INSTRUCTIONS,
            "expires_at": v['expires_at'].isoformat(),
        }
    except HTTPException:
        conn.rollback(); raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error starting verification: {str(e)}")
    finally:
        conn.close()


def _load_verification(cur, verification_id, advertiser_id):
    cur.execute(
        "SELECT * FROM advertiser_kyc_verifications WHERE id = %s AND advertiser_id = %s",
        (verification_id, advertiser_id),
    )
    v = cur.fetchone()
    if not v:
        raise HTTPException(status_code=404, detail="Verification not found")
    return v


@router.post("/upload-document")
async def upload_document(
    verification_id: int = Form(...),
    image_data: str = Form(...),
    document_type: str = Form("digital_id"),
    current_user = Depends(resolve_advertiser),
):
    advertiser_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None
    if not advertiser_id:
        raise HTTPException(status_code=403, detail="Not authorized as advertiser")

    conn = get_db()
    try:
        cur = conn.cursor()
        v = _load_verification(cur, verification_id, advertiser_id)
        if v['status'] == 'passed':
            raise HTTPException(status_code=400, detail="Verification already completed")
        _reset_attempts_if_window_expired(cur, v)
        if (v.get('attempt_count') or 0) >= KYC_MAX_ATTEMPTS:
            raise HTTPException(status_code=400, detail=_attempts_exceeded_detail(v))

        image_bytes = base64.b64decode(image_data.split(',')[1] if ',' in image_data else image_data)
        face_result = detect_face_in_image(image_bytes)

        if not face_result.get("face_detected"):
            _insert_attempt(cur, v['id'], advertiser_id, (v['attempt_count'] or 0) + 1,
                            'document_capture', image_type='document_front', status='failed',
                            error_message="No face detected in document", analysis_result=face_result)
            cur.execute("UPDATE advertiser_kyc_verifications SET attempt_count = attempt_count + 1, last_attempt_at = %s WHERE id = %s",
                        (_now(), v['id']))
            conn.commit()
            raise HTTPException(status_code=400, detail="No face detected in document. Please upload a clear photo of your ID.")

        image_url = save_image_to_storage(image_bytes, advertiser_id, "document")
        cur.execute(
            """UPDATE advertiser_kyc_verifications
               SET document_image_url = %s, document_type = %s, document_verified = TRUE,
                   status = 'in_progress', last_attempt_at = %s, updated_at = %s
               WHERE id = %s""",
            (image_url, document_type, _now(), _now(), v['id']),
        )
        _insert_attempt(cur, v['id'], advertiser_id, (v['attempt_count'] or 0) + 1,
                        'document_capture', image_type='document_front', image_url=image_url,
                        status='passed', analysis_result=face_result, completed=True)
        conn.commit()
        return {"success": True, "message": "Document uploaded successfully",
                "document_verified": True, "face_detected": True, "next_step": "selfie_capture"}
    except HTTPException:
        conn.rollback(); raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
    finally:
        conn.close()


@router.post("/verify-liveliness")
async def verify_liveliness(
    verification_id: int = Form(...),
    challenge_type: str = Form(...),
    frame_data: str = Form(...),
    extra_frames: str = Form(None),
    current_user = Depends(resolve_advertiser),
):
    advertiser_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None
    if not advertiser_id:
        raise HTTPException(status_code=403, detail="Not authorized as advertiser")

    conn = get_db()
    try:
        cur = conn.cursor()
        v = _load_verification(cur, verification_id, advertiser_id)
        frame_bytes = base64.b64decode(frame_data.split(',')[1] if ',' in frame_data else frame_data)

        if challenge_type == 'blink':
            result = detect_blink_in_frame(frame_bytes)
            challenge_passed = bool(result.get("detected", False))
            if not challenge_passed and extra_frames:
                try:
                    for ef in json.loads(extra_frames):
                        ef_data = ef.split(',')[1] if ',' in ef else ef
                        r = detect_blink_in_frame(base64.b64decode(ef_data))
                        if r.get("detected"):
                            challenge_passed, result = True, r; break
                except Exception:
                    pass
        elif challenge_type == 'smile':
            result = detect_smile_in_frame(frame_bytes)
            challenge_passed = bool(result.get("detected", False))
            if not challenge_passed and extra_frames:
                try:
                    for ef in json.loads(extra_frames):
                        ef_data = ef.split(',')[1] if ',' in ef else ef
                        r = detect_smile_in_frame(base64.b64decode(ef_data))
                        if r.get("detected"):
                            challenge_passed, result = True, r; break
                except Exception:
                    pass
        elif challenge_type in ['turn', 'turn_left', 'turn_right']:
            all_frames = [frame_bytes]
            if extra_frames:
                try:
                    for ef in json.loads(extra_frames):
                        ef_data = ef.split(',')[1] if ',' in ef else ef
                        all_frames.append(base64.b64decode(ef_data))
                except Exception:
                    pass
            result = detect_head_turn_in_frames(all_frames)
            challenge_passed = bool(result.get("detected", False))
        else:
            raise HTTPException(status_code=400, detail=f"Unknown challenge type: {challenge_type}")

        col = {'blink': 'blink_detected', 'smile': 'smile_detected'}.get(challenge_type, 'head_turn_detected')
        cur.execute(f"UPDATE advertiser_kyc_verifications SET {col} = %s, updated_at = %s WHERE id = %s",
                    (challenge_passed, _now(), v['id']))
        _insert_attempt(cur, v['id'], advertiser_id, (v['attempt_count'] or 0) + 1,
                        f'liveliness_{challenge_type}', image_type='liveliness_frame',
                        status='passed' if challenge_passed else 'failed',
                        analysis_result={"challenge_type": challenge_type, "passed": challenge_passed, "detail": result},
                        completed=True)
        conn.commit()
        return {"success": challenge_passed, "challenge_type": challenge_type,
                "message": "Challenge passed!" if challenge_passed else "Please try again — make sure your face is well lit and clearly visible"}
    except HTTPException:
        conn.rollback(); raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error verifying challenge: {str(e)}")
    finally:
        conn.close()


@router.post("/upload-selfie")
async def upload_selfie(
    request: Request,
    verification_id: int = Form(...),
    image_data: str = Form(..., max_length=10 * 1024 * 1024),
    liveliness_frames: str = Form(None, max_length=50 * 1024 * 1024),
    current_user = Depends(resolve_advertiser),
):
    advertiser_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None
    if not advertiser_id:
        raise HTTPException(status_code=403, detail="Not authorized as advertiser")

    conn = get_db()
    try:
        cur = conn.cursor()
        v = _load_verification(cur, verification_id, advertiser_id)
        if v['status'] == 'passed':
            raise HTTPException(status_code=400, detail="Verification already completed")
        _reset_attempts_if_window_expired(cur, v)
        if not v['document_verified']:
            raise HTTPException(status_code=400, detail="Please upload document first")
        if (v.get('attempt_count') or 0) >= KYC_MAX_ATTEMPTS:
            raise HTTPException(status_code=400, detail=_attempts_exceeded_detail(v))

        selfie_bytes = base64.b64decode(image_data.split(',')[1] if ',' in image_data else image_data)
        face_result = detect_face_in_image(selfie_bytes)
        if not face_result.get("face_detected"):
            _insert_attempt(cur, v['id'], advertiser_id, (v['attempt_count'] or 0) + 1,
                            'selfie_capture', image_type='selfie', status='failed',
                            error_message="No face detected in selfie", analysis_result=face_result)
            cur.execute("UPDATE advertiser_kyc_verifications SET attempt_count = attempt_count + 1, last_attempt_at = %s WHERE id = %s",
                        (_now(), v['id']))
            conn.commit()
            raise HTTPException(status_code=400, detail="No face detected in selfie. Please position your face clearly.")

        selfie_url = save_image_to_storage(selfie_bytes, advertiser_id, "selfie")

        # Re-download the document image from B2 to compare against the selfie.
        document_bytes = None
        doc_url = v['document_image_url']
        try:
            from backblaze_service import get_backblaze_service
            b2 = get_backblaze_service()
            if doc_url and '/file/' in doc_url:
                after_file = doc_url.split('/file/', 1)[1]
                file_path = after_file.split('/', 1)[1] if '/' in after_file else after_file
                document_bytes = b2.download_file(file_path)
        except Exception as e:
            print(f"[ADV-KYC] Error downloading document from B2: {e}")

        if not document_bytes:
            raise HTTPException(status_code=500, detail="Could not retrieve document image from storage for face comparison. Please try again.")

        comparison_result = compare_faces(document_bytes, selfie_bytes)

        challenges_passed = bool(v['blink_detected'] and v['smile_detected'] and v['head_turn_detected'])
        challenges_completed = sum([bool(v['blink_detected']), bool(v['smile_detected']), bool(v['head_turn_detected'])])
        liveliness_score = challenges_completed / 3.0
        face_match_passed = comparison_result.get("match", False)

        new_status = None
        rejection_reason = None
        person_flip = False
        if face_match_passed and challenges_passed:
            adv = _get_advertiser(cur, advertiser_id)
            identity_ok, missing = _identity_complete(adv)
            if not identity_ok:
                new_status = 'pending_profile'
                rejection_reason = "Identity check passed, but complete your profile to finish verification: " + ", ".join(missing) + "."
            else:
                new_status = 'passed'
                person_flip = True
        elif not face_match_passed:
            new_status = 'failed'
            rejection_reason = "Face in selfie does not match document photo"
        else:
            new_status = 'failed'
            rejection_reason = "Liveliness check failed. Please complete all challenges."

        cur.execute(
            """UPDATE advertiser_kyc_verifications
               SET selfie_image_url = %s, face_match_score = %s, face_match_passed = %s,
                   liveliness_passed = %s, liveliness_score = %s, status = %s,
                   rejection_reason = %s, verified_at = %s, last_attempt_at = %s,
                   attempt_count = attempt_count + 1, updated_at = %s
               WHERE id = %s""",
            (selfie_url, comparison_result.get("score", 0), face_match_passed,
             challenges_passed, liveliness_score, new_status, rejection_reason,
             _now() if new_status == 'passed' else v.get('verified_at'),
             _now(), _now(), v['id']),
        )

        if person_flip:
            cur.execute(
                """UPDATE advertiser_profiles
                   SET person_verified = TRUE, person_verification_status = 'passed',
                       person_verified_at = %s, person_verification_method = 'kyc',
                       person_kyc_verification_id = %s
                   WHERE id = %s""",
                (_now(), v['id'], advertiser_id),
            )

        _insert_attempt(cur, v['id'], advertiser_id, (v['attempt_count'] or 0) + 1,
                        'selfie_capture', image_type='selfie', image_url=selfie_url,
                        status='passed' if new_status == 'passed' else 'failed',
                        analysis_result={
                            "face_detection": face_result,
                            "face_comparison": comparison_result,
                            "liveliness": {
                                "blink_detected": bool(v['blink_detected']),
                                "smile_detected": bool(v['smile_detected']),
                                "head_turn_detected": bool(v['head_turn_detected']),
                                "liveliness_score": float(liveliness_score),
                                "passed": bool(challenges_passed),
                                "method": "challenge_verification",
                            },
                        }, completed=True)
        conn.commit()
        return {
            "success": new_status == 'passed',
            "status": new_status,
            "face_match_passed": bool(face_match_passed),
            "face_match_score": float(comparison_result.get("score") or 0.0),
            "liveliness_passed": bool(challenges_passed),
            "liveliness_score": float(liveliness_score),
            "blink_detected": bool(v['blink_detected']),
            "smile_detected": bool(v['smile_detected']),
            "head_turn_detected": bool(v['head_turn_detected']),
            "rejection_reason": rejection_reason,
            "attempts_remaining": KYC_MAX_ATTEMPTS - ((v['attempt_count'] or 0) + 1),
        }
    except HTTPException:
        conn.rollback(); raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing selfie: {str(e)}")
    finally:
        conn.close()


@router.get("/status")
async def get_status(current_user = Depends(resolve_advertiser)):
    advertiser_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None
    if not advertiser_id:
        raise HTTPException(status_code=403, detail="Not authorized as advertiser")
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM advertiser_kyc_verifications WHERE advertiser_id = %s ORDER BY created_at DESC LIMIT 1",
                    (advertiser_id,))
        v = cur.fetchone()
        if not v:
            raise HTTPException(status_code=404, detail="No verification found. Please start a new verification.")
        return {
            "verification_id": v['id'], "status": v['status'],
            "document_verified": bool(v['document_verified']),
            "face_match_passed": bool(v['face_match_passed']),
            "face_match_score": v['face_match_score'],
            "liveliness_passed": bool(v['liveliness_passed']),
            "liveliness_score": v['liveliness_score'],
            "blink_detected": bool(v['blink_detected']),
            "smile_detected": bool(v['smile_detected']),
            "head_turn_detected": bool(v['head_turn_detected']),
            "attempt_count": v['attempt_count'] or 0,
            "max_attempts": KYC_MAX_ATTEMPTS,
            "rejection_reason": v['rejection_reason'],
            "created_at": v['created_at'].isoformat() if v['created_at'] else None,
            "verified_at": v['verified_at'].isoformat() if v['verified_at'] else None,
        }
    finally:
        conn.close()


@router.post("/reset")
async def reset_kyc(current_user = Depends(resolve_advertiser)):
    advertiser_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None
    if not advertiser_id:
        raise HTTPException(status_code=403, detail="Not authorized as advertiser")
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM advertiser_kyc_verifications WHERE advertiser_id = %s AND status = 'failed' ORDER BY created_at DESC LIMIT 1",
                    (advertiser_id,))
        v = cur.fetchone()
        if not v:
            raise HTTPException(status_code=404, detail="No failed verification found")
        _reset_attempts_if_window_expired(cur, v)
        if (v.get('attempt_count') or 0) >= KYC_MAX_ATTEMPTS:
            raise HTTPException(status_code=400, detail=_attempts_exceeded_detail(v))
        cur.execute(
            """UPDATE advertiser_kyc_verifications
               SET status='pending', document_verified=FALSE, face_match_passed=FALSE,
                   liveliness_passed=FALSE, rejection_reason=NULL,
                   expires_at=%s, updated_at=%s WHERE id=%s""",
            (_now() + timedelta(hours=1), _now(), v['id']),
        )
        conn.commit()
        return {"success": True, "message": "Verification reset. You can try again.",
                "attempts_remaining": KYC_MAX_ATTEMPTS - (v['attempt_count'] or 0)}
    except HTTPException:
        conn.rollback(); raise
    finally:
        conn.close()


@router.get("/check")
async def check_kyc(current_user = Depends(resolve_advertiser)):
    """Tell the modal whether the advertiser owner still needs person-KYC."""
    advertiser_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None
    if not advertiser_id:
        raise HTTPException(status_code=403, detail="Not authorized as advertiser")
    conn = get_db()
    try:
        cur = conn.cursor()
        adv = _get_advertiser(cur, advertiser_id)
        cur.execute("SELECT document_image_url, selfie_image_url FROM advertiser_kyc_verifications WHERE advertiser_id = %s ORDER BY created_at DESC LIMIT 1",
                    (advertiser_id,))
        last = cur.fetchone() or {}
        person_verified = bool(adv.get('person_verified'))
        return {
            "kyc_required": not person_verified,
            "person_verified": person_verified,
            "is_verified": person_verified,  # alias for the shared modal
            "verification_status": adv.get('person_verification_status'),
            "verified_at": adv.get('person_verified_at').isoformat() if adv.get('person_verified_at') else None,
            "digital_id_no": adv.get('digital_id_no'),
            "document_image_url": last.get('document_image_url'),
            "selfie_image_url": last.get('selfie_image_url'),
        }
    finally:
        conn.close()
