"""
Advertiser person-KYC schema (Stage 1 of advertiser dual KYC).

Person KYC identifies the human in charge of the ads (the advertiser account
owner): ID document + selfie face-match + liveness. It is decoupled from the
users table (standalone advertisers have no users row), so it lives entirely in
astegni_advertiser_db keyed on advertiser_id.

This migration adds:
  1a. identity columns on advertiser_profiles (what identity_profile_complete needs)
  1b. person-KYC status columns on advertiser_profiles
  1c. advertiser_kyc_verifications + advertiser_kyc_verification_attempts tables,
      column-for-column mirroring kyc_verifications/_attempts (models.py) but keyed
      on advertiser_id (no users FK).

ADDITIVE + IDEMPOTENT. No app code reads these yet (Stage 2 does).

Run (local):
    python migrate_advertiser_person_kyc.py

PROD: advertiser_profiles + advertiser-DB tables are owned by `postgres`, and
ALTER/CREATE need ownership. Run the DDL as the postgres OS user:
    python migrate_advertiser_person_kyc.py --print-ddl | sudo -u postgres psql -d astegni_advertiser_db
then GRANT to the app role (the migration's --grant prints the GRANT block):
    python migrate_advertiser_person_kyc.py --print-grants | sudo -u postgres psql -d astegni_advertiser_db
"""

import sys
import os
import argparse

sys.path.append(os.path.join(os.path.dirname(__file__), "app.py modules"))

import psycopg
from config import ADVERTISER_DATABASE_URL


def _libpq(url: str) -> str:
    return url.replace("postgresql+psycopg://", "postgresql://")


DDL = """
-- 1a. Identity columns the person-KYC identity check needs (parity with users).
ALTER TABLE advertiser_profiles
    ADD COLUMN IF NOT EXISTS grandfather_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name        TEXT,
    ADD COLUMN IF NOT EXISTS date_of_birth    DATE,
    ADD COLUMN IF NOT EXISTS gender           TEXT,
    ADD COLUMN IF NOT EXISTS naming_system    TEXT DEFAULT 'ethiopian',
    ADD COLUMN IF NOT EXISTS digital_id_no    TEXT;

-- 1b. Person-KYC status columns (distinct from company_profile.is_verified).
ALTER TABLE advertiser_profiles
    ADD COLUMN IF NOT EXISTS person_verified            BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS person_verification_status TEXT,
    ADD COLUMN IF NOT EXISTS person_verified_at         TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS person_verification_method TEXT,
    ADD COLUMN IF NOT EXISTS person_kyc_verification_id INTEGER;

-- 1c. Person-KYC tables keyed on advertiser_id (mirror kyc_verifications/_attempts).
CREATE TABLE IF NOT EXISTS advertiser_kyc_verifications (
    id SERIAL PRIMARY KEY,
    advertiser_id INTEGER NOT NULL REFERENCES advertiser_profiles(id) ON DELETE CASCADE,

    status TEXT NOT NULL DEFAULT 'pending',  -- pending|in_progress|passed|failed|expired|manual_review|pending_profile

    document_type TEXT DEFAULT 'digital_id',
    document_number TEXT,
    document_image_url TEXT,
    document_verified BOOLEAN DEFAULT FALSE,

    selfie_image_url TEXT,
    face_match_score DOUBLE PRECISION,
    face_match_passed BOOLEAN DEFAULT FALSE,
    face_match_threshold DOUBLE PRECISION DEFAULT 0.40,  -- compare_faces' real threshold

    liveliness_passed BOOLEAN DEFAULT FALSE,
    liveliness_score DOUBLE PRECISION,
    blink_detected BOOLEAN DEFAULT FALSE,
    smile_detected BOOLEAN DEFAULT FALSE,
    head_turn_detected BOOLEAN DEFAULT FALSE,

    challenge_type TEXT,
    challenge_completed BOOLEAN DEFAULT FALSE,

    verification_method TEXT DEFAULT 'automated',
    verified_by INTEGER,
    rejection_reason TEXT,
    notes TEXT,

    risk_score DOUBLE PRECISION,
    risk_flags JSONB DEFAULT '[]'::jsonb,

    device_fingerprint TEXT,
    ip_address TEXT,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,

    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    last_attempt_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_adv_kyc_advertiser ON advertiser_kyc_verifications (advertiser_id);
CREATE INDEX IF NOT EXISTS idx_adv_kyc_status ON advertiser_kyc_verifications (status);

CREATE TABLE IF NOT EXISTS advertiser_kyc_verification_attempts (
    id SERIAL PRIMARY KEY,
    verification_id INTEGER NOT NULL REFERENCES advertiser_kyc_verifications(id) ON DELETE CASCADE,
    advertiser_id INTEGER NOT NULL REFERENCES advertiser_profiles(id) ON DELETE CASCADE,

    attempt_number INTEGER NOT NULL,
    step TEXT NOT NULL,            -- document_capture|selfie_capture|liveliness_*|face_comparison
    image_url TEXT,
    image_type TEXT,              -- document_front|document_back|selfie|liveliness_frame
    analysis_result JSONB,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,

    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    processing_time_ms INTEGER,
    device_info JSONB
);
CREATE INDEX IF NOT EXISTS idx_adv_kyc_attempt_verification ON advertiser_kyc_verification_attempts (verification_id);
"""

GRANTS = """
GRANT ALL ON advertiser_kyc_verifications TO astegni_user;
GRANT ALL ON advertiser_kyc_verification_attempts TO astegni_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO astegni_user;
"""


def apply_ddl(conn):
    print("Applying person-KYC DDL ...")
    with conn.cursor() as cur:
        cur.execute(DDL)
    conn.commit()
    print("  DDL applied.")


def verify(conn):
    print("\nVerification:")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name='advertiser_profiles'
              AND column_name IN ('grandfather_name','last_name','date_of_birth','gender',
                                  'naming_system','digital_id_no','person_verified',
                                  'person_verification_status','person_verified_at',
                                  'person_verification_method','person_kyc_verification_id')
            ORDER BY column_name
        """)
        cols = [r[0] for r in cur.fetchall()]
        print(f"  advertiser_profiles new columns ({len(cols)}/11): {', '.join(cols)}")
        for t in ('advertiser_kyc_verifications', 'advertiser_kyc_verification_attempts'):
            cur.execute("SELECT to_regclass(%s)", (f'public.{t}',))
            print(f"  table {t}: {'OK' if cur.fetchone()[0] else 'MISSING'}")


def main():
    parser = argparse.ArgumentParser(description="Advertiser person-KYC Stage 1 migration")
    parser.add_argument("--print-ddl", action="store_true",
                        help="Print the DDL (pipe to `sudo -u postgres psql` on prod) and exit")
    parser.add_argument("--print-grants", action="store_true",
                        help="Print the GRANT block (run as postgres after DDL) and exit")
    parser.add_argument("--verify-only", action="store_true", help="Verify schema only")
    args = parser.parse_args()

    if args.print_ddl:
        print(DDL)
        return
    if args.print_grants:
        print(GRANTS)
        return

    conn = psycopg.connect(_libpq(ADVERTISER_DATABASE_URL))
    try:
        if not args.verify_only:
            apply_ddl(conn)
        verify(conn)
        print("\nStage 1 (person-KYC schema) complete.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
