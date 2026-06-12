"""
Migration: extend the partner application flow.

  - partner_requests gains: logo_url, website, social_link, applicant identity
    (naming_system, first_name, father_name, grandfather_name, last_name,
    date_of_birth, personal_email, gender), business ownership proof, and a
    kyc_status summary column.
  - partners gains: is_featured (so admins can feature a partner on the homepage).
  - new table partner_kyc_verifications: identity (ID + selfie) verification for a
    partnership application, mirroring advertiser_kyc_verifications but keyed on
    partner_request_id (applications are anonymous — there is no users row).

partner_requests + partners live in the USER db. Run once:

    python migrate_partner_application_kyc.py
"""

import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

DDL = """
-- Partner application: contact + branding + applicant identity
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS logo_url            VARCHAR(1000);
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS website             VARCHAR(1000);
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS social_link         VARCHAR(1000);
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS naming_system       VARCHAR(20) DEFAULT 'ethiopian';
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS applicant_first_name        VARCHAR(255);
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS applicant_father_name       VARCHAR(255);
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS applicant_grandfather_name  VARCHAR(255);
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS applicant_last_name         VARCHAR(255);
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS date_of_birth       DATE;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS personal_email      VARCHAR(255);
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS ownership_proof_url VARCHAR(1000);
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS kyc_status          VARCHAR(30) DEFAULT 'pending';

-- Featured partners on the homepage
ALTER TABLE partners ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- Identity (ID + selfie) verification for a partnership application.
CREATE TABLE IF NOT EXISTS partner_kyc_verifications (
    id                 SERIAL PRIMARY KEY,
    partner_request_id INTEGER NOT NULL REFERENCES partner_requests(id) ON DELETE CASCADE,
    status             VARCHAR(30) NOT NULL DEFAULT 'pending',  -- pending|in_progress|passed|failed
    document_type      VARCHAR(50) DEFAULT 'digital_id',
    document_image_url VARCHAR(1000),
    document_verified  BOOLEAN DEFAULT FALSE,
    selfie_image_url   VARCHAR(1000),
    face_match_score   DOUBLE PRECISION,
    face_match_passed  BOOLEAN,
    liveliness_passed  BOOLEAN,
    blink_detected     BOOLEAN,
    smile_detected     BOOLEAN,
    head_turn_detected BOOLEAN,
    challenge_type     VARCHAR(50) DEFAULT 'blink_smile_turn',
    rejection_reason   TEXT,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at         TIMESTAMP,
    verified_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_kyc_request ON partner_kyc_verifications(partner_request_id);
CREATE INDEX IF NOT EXISTS idx_partners_featured ON partners(is_featured);
"""


def main():
    if not DATABASE_URL:
        raise SystemExit("DATABASE_URL is not set in .env")
    print("Connecting to user database...")
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(DDL)
        conn.commit()
    print("Extended partner_requests + partners; created partner_kyc_verifications.")


if __name__ == "__main__":
    main()
