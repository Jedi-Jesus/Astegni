"""
Stage 1 of advertiser self-contained auth.

Adds authentication columns directly onto advertiser_profiles (in
astegni_advertiser_db), making it the advertiser "users" table — analogous to
admin_profile being identity+auth in astegni_admin_db. Then backfills the
existing advertisers' login identity (email + bcrypt password_hash) by copying
from the matching users row (cross-DB, app-side, since Postgres can't join
across databases).

ADDITIVE + IDEMPOTENT: safe to run repeatedly. No existing behavior changes —
the old users-side /api/login + advertiser-role flow keeps working. user_id is
kept populated (still the legacy join key through Stage 2); it is only relaxed to
nullable so Stage 3 can register users-less advertisers.

Run:
    python migrate_advertiser_auth.py
"""

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "app.py modules"))

import psycopg
from config import DATABASE_URL, ADVERTISER_DATABASE_URL


def _libpq(url: str) -> str:
    """SQLAlchemy URL -> plain libpq DSN for psycopg."""
    return url.replace("postgresql+psycopg://", "postgresql://")


DDL = """
ALTER TABLE advertiser_profiles
    ADD COLUMN IF NOT EXISTS email           TEXT,
    ADD COLUMN IF NOT EXISTS password_hash   TEXT,
    ADD COLUMN IF NOT EXISTS has_password    BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS phone           TEXT,
    ADD COLUMN IF NOT EXISTS first_name      TEXT,
    ADD COLUMN IF NOT EXISTS father_name     TEXT,
    ADD COLUMN IF NOT EXISTS last_login      TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS advertiser_profiles_email_unique
    ON advertiser_profiles (LOWER(email)) WHERE email IS NOT NULL;

-- Allow future users-less advertisers (relax now; registration code flips in Stage 3).
ALTER TABLE advertiser_profiles ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE advertiser_profiles DROP CONSTRAINT IF EXISTS advertiser_profiles_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS advertiser_profiles_user_id_unique
    ON advertiser_profiles (user_id) WHERE user_id IS NOT NULL;

-- Advertiser-side OTP store (user_db and admin_db each have their own).
CREATE TABLE IF NOT EXISTS otps (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    contact TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    purpose TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otps_contact_purpose ON otps (contact, purpose, is_used);
"""


def apply_ddl(adv_conn):
    print("Applying DDL to advertiser_profiles + otps ...")
    with adv_conn.cursor() as cur:
        cur.execute(DDL)
    adv_conn.commit()
    print("  DDL applied.")


def backfill(adv_conn, usr_conn):
    """Copy email/password/name from users into advertiser_profiles for rows that
    don't yet have an email set. Idempotent."""
    with adv_conn.cursor() as cur:
        cur.execute(
            "SELECT id, user_id FROM advertiser_profiles WHERE email IS NULL"
        )
        rows = cur.fetchall()

    print(f"Backfilling {len(rows)} advertiser_profiles row(s) with NULL email ...")
    filled, skipped = 0, 0
    for adv_id, user_id in rows:
        if user_id is None:
            print(f"  advertiser_profiles.id={adv_id}: user_id is NULL — leaving for manual review")
            skipped += 1
            continue
        with usr_conn.cursor() as ucur:
            ucur.execute(
                """SELECT email, phone, first_name, father_name,
                          password_hash, email_verified
                   FROM users WHERE id = %s""",
                (user_id,),
            )
            u = ucur.fetchone()
        if not u:
            print(f"  advertiser_profiles.id={adv_id}: no users row for user_id={user_id} (orphan) — skipping")
            skipped += 1
            continue
        email, phone, first_name, father_name, password_hash, email_verified = u
        with adv_conn.cursor() as cur:
            cur.execute(
                """UPDATE advertiser_profiles
                   SET email = %s, phone = %s, first_name = %s, father_name = %s,
                       password_hash = %s, has_password = %s, email_verified = %s
                   WHERE id = %s AND email IS NULL""",
                (
                    email, phone, first_name, father_name,
                    password_hash, bool(password_hash), bool(email_verified),
                    adv_id,
                ),
            )
        print(f"  advertiser_profiles.id={adv_id} <- users.id={user_id} ({email}), has_password={bool(password_hash)}")
        filled += 1
    adv_conn.commit()
    print(f"Backfill done: {filled} filled, {skipped} skipped.")


def verify(adv_conn):
    print("\nVerification (advertiser_profiles auth state):")
    with adv_conn.cursor() as cur:
        cur.execute(
            """SELECT id, user_id, email, has_password, email_verified
               FROM advertiser_profiles ORDER BY id"""
        )
        for r in cur.fetchall():
            print(f"  id={r[0]} user_id={r[1]} email={r[2]} has_password={r[3]} email_verified={r[4]}")


def main():
    adv_conn = psycopg.connect(_libpq(ADVERTISER_DATABASE_URL))
    usr_conn = psycopg.connect(_libpq(DATABASE_URL))
    try:
        apply_ddl(adv_conn)
        backfill(adv_conn, usr_conn)
        verify(adv_conn)
        print("\nStage 1 migration complete.")
    finally:
        adv_conn.close()
        usr_conn.close()


if __name__ == "__main__":
    main()
