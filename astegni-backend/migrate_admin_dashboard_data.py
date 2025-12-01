"""
Migration: Create admin dashboard data tables
Creates tables for:
1. Daily quota tracking
2. Achievements system
3. Fire streak tracking
4. Admin profile stats
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    """Create admin dashboard data tables"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("Creating admin dashboard data tables...")

        # 1. Admin Daily Quotas Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_daily_quotas (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                date DATE NOT NULL DEFAULT CURRENT_DATE,
                category VARCHAR(50) NOT NULL,  -- 'active', 'pending', 'rejected', 'suspended', 'archived'
                current_count INTEGER DEFAULT 0,
                quota_limit INTEGER DEFAULT 0,
                percentage DECIMAL(5, 2) DEFAULT 0.0,  -- Calculated percentage
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(admin_id, date, category)
            );
        """)

        # Index for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_admin_daily_quotas_admin_date
            ON admin_daily_quotas(admin_id, date);
        """)

        print("[OK] Created admin_daily_quotas table")

        # 2. Admin Achievements Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_achievements (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                achievement_type VARCHAR(100) NOT NULL,  -- 'top_performer', 'excellence', 'five_star', etc.
                title VARCHAR(200) NOT NULL,
                description TEXT,
                icon VARCHAR(50),  -- Emoji or icon class
                earned_date DATE,
                earned_period VARCHAR(100),  -- 'Q4 2024', 'Annual 2023', etc.
                metadata JSONB DEFAULT '{}'::jsonb,  -- Additional data like milestone numbers
                display_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Index for quick retrieval
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_admin_achievements_admin
            ON admin_achievements(admin_id, is_active, display_order);
        """)

        print("[OK] Created admin_achievements table")

        # 3. Admin Fire Streaks Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_fire_streaks (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0,
                last_activity_date DATE,
                streak_started_date DATE,
                weekly_pattern JSONB DEFAULT '[]'::jsonb,  -- Array of 7 booleans for week view
                total_active_days INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(admin_id)
            );
        """)

        print("[OK] Created admin_fire_streaks table")

        # 4. Admin Profile Stats Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_profile_stats (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                display_name VARCHAR(200),
                department VARCHAR(200),
                employee_id VARCHAR(100),
                joined_date DATE,
                rating DECIMAL(3, 2) DEFAULT 0.0,
                total_reviews INTEGER DEFAULT 0,
                profile_quote TEXT,
                bio TEXT,
                location VARCHAR(300),
                badges JSONB DEFAULT '[]'::jsonb,  -- Array of badge objects
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(admin_id)
            );
        """)

        print("[OK] Created admin_profile_stats table")

        # 5. Admin Panel Statistics Table (for each panel's stats)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_panel_statistics (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                panel_name VARCHAR(100) NOT NULL,  -- 'dashboard', 'verified', 'requested', 'rejected', 'suspended'
                stat_key VARCHAR(100) NOT NULL,  -- 'total_active', 'academic_courses', 'approval_rate', etc.
                stat_value VARCHAR(200),
                stat_type VARCHAR(50) DEFAULT 'number',  -- 'number', 'percentage', 'duration', 'text'
                display_label VARCHAR(200),
                display_order INTEGER DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(admin_id, panel_name, stat_key)
            );
        """)

        # Index for quick panel stats retrieval
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_admin_panel_stats
            ON admin_panel_statistics(admin_id, panel_name, display_order);
        """)

        print("[OK] Created admin_panel_statistics table")

        # 6. Create trigger to update timestamps
        cursor.execute("""
            CREATE OR REPLACE FUNCTION update_admin_dashboard_timestamp()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)

        # Apply triggers to all tables
        tables = [
            'admin_daily_quotas',
            'admin_achievements',
            'admin_fire_streaks',
            'admin_profile_stats',
            'admin_panel_statistics'
        ]

        for table in tables:
            cursor.execute(f"""
                DROP TRIGGER IF EXISTS update_{table}_timestamp ON {table};
                CREATE TRIGGER update_{table}_timestamp
                BEFORE UPDATE ON {table}
                FOR EACH ROW
                EXECUTE FUNCTION update_admin_dashboard_timestamp();
            """)

        print("[OK] Created update timestamp triggers")

        conn.commit()
        print("\n[SUCCESS] Admin dashboard data tables created successfully!")
        print("\nCreated tables:")
        print("  - admin_daily_quotas: Track daily quota progress")
        print("  - admin_achievements: Store admin achievements/badges")
        print("  - admin_fire_streaks: Track activity streaks")
        print("  - admin_profile_stats: Admin profile information")
        print("  - admin_panel_statistics: Dynamic stats for each panel")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Error creating tables: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
