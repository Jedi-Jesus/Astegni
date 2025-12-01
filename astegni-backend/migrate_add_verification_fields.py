"""
Add verification fields to tutor_achievements, tutor_certificates, and tutor_experiences tables
- is_verified: boolean (default False)
- verification_status: text (pending/approved/rejected) (default 'pending')
- rejection_reason: text (nullable)
"""

import psycopg

def migrate():
    conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
    cur = conn.cursor()

    try:
        print("Adding verification fields to tutor_achievements...")
        cur.execute("""
            ALTER TABLE tutor_achievements
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS verified_by_admin_id INTEGER
        """)
        print("SUCCESS: tutor_achievements updated")

        print("Adding verification fields to tutor_certificates...")
        cur.execute("""
            ALTER TABLE tutor_certificates
            ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS verified_by_admin_id INTEGER
        """)
        print("SUCCESS: tutor_certificates updated (already has is_verified)")

        print("Adding verification fields to tutor_experience...")
        cur.execute("""
            ALTER TABLE tutor_experience
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS verified_by_admin_id INTEGER
        """)
        print("SUCCESS: tutor_experience updated")

        # Create indexes for faster queries
        print("Creating indexes...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_achievements_verification_status ON tutor_achievements(verification_status);
            CREATE INDEX IF NOT EXISTS idx_certificates_verification_status ON tutor_certificates(verification_status);
            CREATE INDEX IF NOT EXISTS idx_experiences_verification_status ON tutor_experience(verification_status);
        """)
        print("SUCCESS: Indexes created")

        conn.commit()
        print("\nSUCCESS: Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate()
