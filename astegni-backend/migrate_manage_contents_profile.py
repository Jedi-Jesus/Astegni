"""
Migration: Create manage_contents_profile table
Stores department-specific data for Content Management admins
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

def migrate():
    """Create manage_contents_profile table"""
    with engine.connect() as conn:
        # Create manage_contents_profile table
        create_table_query = text("""
            CREATE TABLE IF NOT EXISTS manage_contents_profile (
                profile_id SERIAL PRIMARY KEY,
                admin_id INTEGER UNIQUE REFERENCES admin_profile(id) ON DELETE CASCADE,

                -- Position and role
                position VARCHAR(100) DEFAULT 'Content Management',

                -- Performance metrics
                rating DECIMAL(2,1) DEFAULT 4.5,
                total_reviews INTEGER DEFAULT 0,

                -- Badges (JSON array)
                badges JSONB DEFAULT '[
                    {"text": "✔ System Administrator", "class": "verified"},
                    {"text": "📁 Content Management", "class": "school"},
                    {"text": "📊 Content Expert", "class": "expert"}
                ]'::jsonb,

                -- Employee information
                employee_id VARCHAR(50) DEFAULT 'ADM-2024-001',
                joined_date VARCHAR(50) DEFAULT 'January 2020',
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Content statistics
                verified_contents INTEGER DEFAULT 0,
                requested_contents INTEGER DEFAULT 0,
                rejected_contents INTEGER DEFAULT 0,
                flagged_contents INTEGER DEFAULT 0,

                -- Storage metrics
                total_storage_gb DECIMAL(10,2) DEFAULT 0.00,

                -- Performance metrics
                approval_rate DECIMAL(5,2) DEFAULT 93.00,
                avg_processing_hours DECIMAL(5,2) DEFAULT 2.00,
                user_satisfaction DECIMAL(5,2) DEFAULT 96.00,

                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.execute(create_table_query)
        conn.commit()
        print("[OK] Created manage_contents_profile table")

        # Create index on admin_id
        create_index_query = text("""
            CREATE INDEX IF NOT EXISTS idx_manage_contents_profile_admin_id
            ON manage_contents_profile(admin_id)
        """)

        conn.execute(create_index_query)
        conn.commit()
        print("[OK] Created index on admin_id")

        # Insert sample data for test admin
        insert_sample_query = text("""
            INSERT INTO manage_contents_profile (
                admin_id,
                position,
                rating,
                total_reviews,
                employee_id,
                joined_date,
                verified_contents,
                requested_contents,
                rejected_contents,
                flagged_contents,
                total_storage_gb,
                approval_rate,
                avg_processing_hours,
                user_satisfaction
            )
            SELECT
                id,
                'Content Management Specialist',
                4.9,
                156,
                'ADM-CNT-2024',
                'January 2020',
                1245,
                48,
                87,
                12,
                470.00,
                93.00,
                2.00,
                96.00
            FROM admin_profile
            WHERE email = 'test1@example.com'
            ON CONFLICT (admin_id) DO UPDATE SET
                position = EXCLUDED.position,
                rating = EXCLUDED.rating,
                total_reviews = EXCLUDED.total_reviews,
                verified_contents = EXCLUDED.verified_contents,
                requested_contents = EXCLUDED.requested_contents,
                rejected_contents = EXCLUDED.rejected_contents,
                flagged_contents = EXCLUDED.flagged_contents,
                total_storage_gb = EXCLUDED.total_storage_gb,
                approval_rate = EXCLUDED.approval_rate,
                avg_processing_hours = EXCLUDED.avg_processing_hours,
                user_satisfaction = EXCLUDED.user_satisfaction
        """)

        conn.execute(insert_sample_query)
        conn.commit()
        print("[OK] Inserted sample data for test admin")

        print("\n[SUCCESS] Migration completed successfully!")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        raise
