"""
Migration: Create KYC (Know Your Customer) Liveliness Verification Tables
=========================================================================

This migration creates tables for:
1. kyc_verifications - Main verification records
2. kyc_verification_attempts - Individual verification attempts with images

The system verifies users by:
1. Capturing their Digital ID document photo
2. Capturing live selfie with liveliness checks (blink, smile, head turn)
3. Comparing face in document with live selfie
4. Storing verification status and confidence scores

Run: python migrate_create_kyc_tables.py
"""

import psycopg2
from datetime import datetime

# Database connection
DB_CONFIG = {
    "host": "localhost",
    "database": "astegni_user_db",
    "user": "astegni_user",
    "password": "Astegni2025"
}

def run_migration():
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        print("=" * 70)
        print("Migration: Create KYC Liveliness Verification Tables")
        print("=" * 70)

        # ============================================
        # Table 1: kyc_verifications (Main verification record)
        # ============================================
        print("\n1. Creating kyc_verifications table...")

        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'kyc_verifications'
            )
        """)

        if cur.fetchone()[0]:
            print("   [OK] Table 'kyc_verifications' already exists")
        else:
            cur.execute("""
                CREATE TABLE kyc_verifications (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                    -- Verification Status
                    status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    -- Status values: pending, in_progress, passed, failed, expired, manual_review

                    -- Document Information
                    document_type VARCHAR(50) DEFAULT 'digital_id',
                    -- Types: digital_id, passport, national_id, drivers_license
                    document_number VARCHAR(100),
                    document_image_url TEXT,
                    document_verified BOOLEAN DEFAULT FALSE,

                    -- Face Verification
                    selfie_image_url TEXT,
                    face_match_score FLOAT,
                    face_match_passed BOOLEAN DEFAULT FALSE,
                    face_match_threshold FLOAT DEFAULT 0.85,

                    -- Liveliness Check Results
                    liveliness_passed BOOLEAN DEFAULT FALSE,
                    liveliness_score FLOAT,
                    blink_detected BOOLEAN DEFAULT FALSE,
                    smile_detected BOOLEAN DEFAULT FALSE,
                    head_turn_detected BOOLEAN DEFAULT FALSE,

                    -- Challenge-Response (for advanced liveliness)
                    challenge_type VARCHAR(50),
                    -- Types: blink, smile, turn_left, turn_right, nod, random_sequence
                    challenge_completed BOOLEAN DEFAULT FALSE,

                    -- Verification Details
                    verification_method VARCHAR(50) DEFAULT 'automated',
                    -- Methods: automated, manual, hybrid
                    verified_by INTEGER,
                    -- Admin user ID if manually verified
                    rejection_reason TEXT,
                    notes TEXT,

                    -- Risk Assessment
                    risk_score FLOAT,
                    risk_flags JSON DEFAULT '[]',
                    -- Flags: multiple_faces, poor_lighting, blur_detected, mismatch_warning, etc.

                    -- Device/Session Info
                    device_fingerprint VARCHAR(255),
                    ip_address VARCHAR(45),
                    user_agent TEXT,

                    -- Timestamps
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    verified_at TIMESTAMP,

                    -- Retry tracking
                    attempt_count INTEGER DEFAULT 0,
                    max_attempts INTEGER DEFAULT 3,
                    last_attempt_at TIMESTAMP,

                    -- Unique constraint: One active verification per user
                    CONSTRAINT unique_active_verification UNIQUE (user_id, status)
                )
            """)
            print("   [OK] Table 'kyc_verifications' created")

            # Create indexes
            cur.execute("CREATE INDEX idx_kyc_user_id ON kyc_verifications(user_id)")
            cur.execute("CREATE INDEX idx_kyc_status ON kyc_verifications(status)")
            cur.execute("CREATE INDEX idx_kyc_created_at ON kyc_verifications(created_at)")
            print("   [OK] Indexes created")

        # ============================================
        # Table 2: kyc_verification_attempts (Individual attempts)
        # ============================================
        print("\n2. Creating kyc_verification_attempts table...")

        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'kyc_verification_attempts'
            )
        """)

        if cur.fetchone()[0]:
            print("   [OK] Table 'kyc_verification_attempts' already exists")
        else:
            cur.execute("""
                CREATE TABLE kyc_verification_attempts (
                    id SERIAL PRIMARY KEY,
                    verification_id INTEGER NOT NULL REFERENCES kyc_verifications(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                    -- Attempt Info
                    attempt_number INTEGER NOT NULL,
                    step VARCHAR(50) NOT NULL,
                    -- Steps: document_capture, selfie_capture, liveliness_blink,
                    --        liveliness_smile, liveliness_turn, face_comparison

                    -- Captured Data
                    image_url TEXT,
                    image_type VARCHAR(50),
                    -- Types: document_front, document_back, selfie, liveliness_frame

                    -- Analysis Results
                    analysis_result JSON,
                    -- Contains: confidence, landmarks, quality_score, face_detected, etc.

                    -- Step Status
                    status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    -- Status: pending, processing, passed, failed
                    error_message TEXT,

                    -- Timing
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP,
                    processing_time_ms INTEGER,

                    -- Device Info
                    device_info JSON
                )
            """)
            print("   [OK] Table 'kyc_verification_attempts' created")

            # Create indexes
            cur.execute("CREATE INDEX idx_kyc_attempts_verification_id ON kyc_verification_attempts(verification_id)")
            cur.execute("CREATE INDEX idx_kyc_attempts_user_id ON kyc_verification_attempts(user_id)")
            cur.execute("CREATE INDEX idx_kyc_attempts_step ON kyc_verification_attempts(step)")
            print("   [OK] Indexes created")

        # ============================================
        # Add kyc_verified field to users table
        # ============================================
        print("\n3. Adding kyc_verified field to users table...")

        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'kyc_verified'
        """)

        if cur.fetchone():
            print("   [OK] Column 'kyc_verified' already exists in users table")
        else:
            cur.execute("""
                ALTER TABLE users
                ADD COLUMN kyc_verified BOOLEAN DEFAULT FALSE
            """)
            print("   [OK] Column 'kyc_verified' added to users table")

            cur.execute("""
                ALTER TABLE users
                ADD COLUMN kyc_verified_at TIMESTAMP
            """)
            print("   [OK] Column 'kyc_verified_at' added to users table")

            cur.execute("""
                ALTER TABLE users
                ADD COLUMN kyc_verification_id INTEGER REFERENCES kyc_verifications(id)
            """)
            print("   [OK] Column 'kyc_verification_id' added to users table")

        conn.commit()

        # ============================================
        # Verification
        # ============================================
        print("\n" + "=" * 70)
        print("Verification")
        print("=" * 70)

        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name IN ('kyc_verifications', 'kyc_verification_attempts')
            ORDER BY table_name
        """)
        tables = cur.fetchall()
        print(f"\nCreated tables: {[t[0] for t in tables]}")

        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name LIKE 'kyc%'
            ORDER BY column_name
        """)
        columns = cur.fetchall()
        print(f"\nKYC columns in users table:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]} (nullable: {col[2]})")

        print("\n[OK] Migration completed successfully!")
        print("\nKYC Verification System Ready:")
        print("  - kyc_verifications: Main verification records")
        print("  - kyc_verification_attempts: Individual step attempts")
        print("  - users.kyc_verified: Quick verification status check")

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    run_migration()
