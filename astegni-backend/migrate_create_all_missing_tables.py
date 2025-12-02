"""
Migration: Create All Missing Tables
This is a comprehensive migration that creates all commonly missing tables
for a fresh production deployment.

Run: python migrate_create_all_missing_tables.py
"""

import sys
import os

# Fix encoding for Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

import psycopg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")


def table_exists(cur, table_name):
    """Check if a table exists"""
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = %s
        )
    """, (table_name,))
    return cur.fetchone()[0]


def create_tutor_packages(cur, conn):
    """Create tutor_packages table"""
    if table_exists(cur, 'tutor_packages'):
        print("  [SKIP] tutor_packages already exists")
        return

    print("  Creating tutor_packages...")
    cur.execute("""
        CREATE TABLE tutor_packages (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            grade_level VARCHAR(50),
            courses TEXT,
            description TEXT,
            hourly_rate DECIMAL(10, 2) NOT NULL CHECK (hourly_rate >= 0),
            days_per_week INTEGER CHECK (days_per_week >= 0 AND days_per_week <= 7),
            hours_per_day DECIMAL(4, 2) CHECK (hours_per_day >= 0 AND hours_per_day <= 24),
            payment_frequency VARCHAR(50) DEFAULT 'monthly',
            discount_1_month DECIMAL(5, 2) DEFAULT 0 CHECK (discount_1_month >= 0 AND discount_1_month <= 100),
            discount_3_month DECIMAL(5, 2) DEFAULT 0 CHECK (discount_3_month >= 0 AND discount_3_month <= 100),
            discount_6_month DECIMAL(5, 2) DEFAULT 0 CHECK (discount_6_month >= 0 AND discount_6_month <= 100),
            discount_12_month DECIMAL(5, 2) DEFAULT 0 CHECK (discount_12_month >= 0 AND discount_12_month <= 100),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_tutor_packages_tutor_id ON tutor_packages(tutor_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_tutor_packages_active ON tutor_packages(tutor_id, is_active);")
    conn.commit()
    print("  [OK] tutor_packages created")


def create_requested_sessions(cur, conn):
    """Create requested_sessions table (the final table name)"""
    if table_exists(cur, 'requested_sessions'):
        print("  [SKIP] requested_sessions already exists")
        return

    print("  Creating requested_sessions...")
    cur.execute("""
        CREATE TABLE requested_sessions (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            requester_type VARCHAR(20) NOT NULL CHECK (requester_type IN ('student', 'parent')),
            package_id INTEGER REFERENCES tutor_packages(id) ON DELETE SET NULL,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
            message TEXT,
            preferred_schedule TEXT,
            rejection_reason TEXT,
            tutor_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            responded_at TIMESTAMP
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_requested_sessions_tutor ON requested_sessions(tutor_id, status);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_requested_sessions_requester ON requested_sessions(requester_id);")
    conn.commit()
    print("  [OK] requested_sessions created")


def create_tutor_schedules(cur, conn):
    """Create tutor_schedules table"""
    if table_exists(cur, 'tutor_schedules'):
        print("  [SKIP] tutor_schedules already exists")
        return

    print("  Creating tutor_schedules...")
    cur.execute("""
        CREATE TABLE tutor_schedules (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            is_available BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tutor_id, day_of_week, start_time)
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_tutor_schedules_tutor_id ON tutor_schedules(tutor_id);")
    conn.commit()
    print("  [OK] tutor_schedules created")


def create_tutor_sessions(cur, conn):
    """Create tutor_sessions table (actual sessions, not requests)"""
    if table_exists(cur, 'tutor_sessions'):
        print("  [SKIP] tutor_sessions already exists")
        return

    print("  Creating tutor_sessions...")
    cur.execute("""
        CREATE TABLE tutor_sessions (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            student_ids INTEGER[] DEFAULT '{}',
            package_id INTEGER REFERENCES tutor_packages(id) ON DELETE SET NULL,
            title VARCHAR(255),
            description TEXT,
            session_type VARCHAR(50) DEFAULT 'one-on-one',
            status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
            scheduled_date DATE NOT NULL,
            scheduled_time TIME NOT NULL,
            duration_minutes INTEGER DEFAULT 60,
            meeting_link TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            started_at TIMESTAMP,
            ended_at TIMESTAMP
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_tutor_sessions_tutor_id ON tutor_sessions(tutor_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_tutor_sessions_status ON tutor_sessions(status);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_tutor_sessions_date ON tutor_sessions(scheduled_date);")
    conn.commit()
    print("  [OK] tutor_sessions created")


def create_connections(cur, conn):
    """Create connections table"""
    if table_exists(cur, 'connections'):
        print("  [SKIP] connections already exists")
        return

    print("  Creating connections...")
    cur.execute("""
        CREATE TABLE connections (
            id SERIAL PRIMARY KEY,
            requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            requester_role VARCHAR(20) NOT NULL,
            requester_profile_id INTEGER,
            target_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            target_role VARCHAR(20) NOT NULL,
            target_profile_id INTEGER,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            accepted_at TIMESTAMP,
            UNIQUE(requester_id, requester_role, target_id, target_role)
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id, requester_role);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_connections_target ON connections(target_id, target_role);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);")
    conn.commit()
    print("  [OK] connections created")


def create_events_clubs(cur, conn):
    """Create events and clubs tables"""
    if not table_exists(cur, 'events'):
        print("  Creating events...")
        cur.execute("""
            CREATE TABLE events (
                id SERIAL PRIMARY KEY,
                creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                creator_type VARCHAR(20) DEFAULT 'tutor',
                title VARCHAR(255) NOT NULL,
                description TEXT,
                event_type VARCHAR(50),
                event_date TIMESTAMP,
                end_date TIMESTAMP,
                location VARCHAR(255),
                is_online BOOLEAN DEFAULT FALSE,
                meeting_link TEXT,
                max_participants INTEGER,
                cover_image TEXT,
                status VARCHAR(20) DEFAULT 'upcoming',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_events_creator ON events(creator_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);")
        conn.commit()
        print("  [OK] events created")
    else:
        print("  [SKIP] events already exists")

    if not table_exists(cur, 'clubs'):
        print("  Creating clubs...")
        cur.execute("""
            CREATE TABLE clubs (
                id SERIAL PRIMARY KEY,
                creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                creator_type VARCHAR(20) DEFAULT 'tutor',
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                cover_image TEXT,
                is_public BOOLEAN DEFAULT TRUE,
                max_members INTEGER,
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_clubs_creator ON clubs(creator_id);")
        conn.commit()
        print("  [OK] clubs created")
    else:
        print("  [SKIP] clubs already exists")

    if not table_exists(cur, 'event_participants'):
        print("  Creating event_participants...")
        cur.execute("""
            CREATE TABLE event_participants (
                id SERIAL PRIMARY KEY,
                event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'registered',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(event_id, user_id)
            );
        """)
        conn.commit()
        print("  [OK] event_participants created")
    else:
        print("  [SKIP] event_participants already exists")

    if not table_exists(cur, 'club_members'):
        print("  Creating club_members...")
        cur.execute("""
            CREATE TABLE club_members (
                id SERIAL PRIMARY KEY,
                club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) DEFAULT 'member',
                status VARCHAR(20) DEFAULT 'active',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(club_id, user_id)
            );
        """)
        conn.commit()
        print("  [OK] club_members created")
    else:
        print("  [SKIP] club_members already exists")


def create_earnings_investments(cur, conn):
    """Create earnings and investments tables"""
    if not table_exists(cur, 'tutor_earnings'):
        print("  Creating tutor_earnings...")
        cur.execute("""
            CREATE TABLE tutor_earnings (
                id SERIAL PRIMARY KEY,
                tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                amount DECIMAL(12, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'ETB',
                source VARCHAR(50) NOT NULL,
                source_id INTEGER,
                description TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                paid_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_tutor_earnings_tutor_id ON tutor_earnings(tutor_id);")
        conn.commit()
        print("  [OK] tutor_earnings created")
    else:
        print("  [SKIP] tutor_earnings already exists")

    if not table_exists(cur, 'tutor_investments'):
        print("  Creating tutor_investments...")
        cur.execute("""
            CREATE TABLE tutor_investments (
                id SERIAL PRIMARY KEY,
                tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                amount DECIMAL(12, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'ETB',
                investment_type VARCHAR(50) NOT NULL,
                description TEXT,
                status VARCHAR(20) DEFAULT 'active',
                invested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_tutor_investments_tutor_id ON tutor_investments(tutor_id);")
        conn.commit()
        print("  [OK] tutor_investments created")
    else:
        print("  [SKIP] tutor_investments already exists")


def create_documents_credentials(cur, conn):
    """Create documents and credentials tables"""
    if not table_exists(cur, 'documents'):
        print("  Creating documents...")
        cur.execute("""
            CREATE TABLE documents (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                user_role VARCHAR(20) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                file_url TEXT NOT NULL,
                file_type VARCHAR(50),
                file_size INTEGER,
                category VARCHAR(50),
                is_public BOOLEAN DEFAULT FALSE,
                download_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);")
        conn.commit()
        print("  [OK] documents created")
    else:
        print("  [SKIP] documents already exists")

    if not table_exists(cur, 'credentials'):
        print("  Creating credentials...")
        cur.execute("""
            CREATE TABLE credentials (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                user_role VARCHAR(20) NOT NULL,
                credential_type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                issuer VARCHAR(255),
                issue_date DATE,
                expiry_date DATE,
                description TEXT,
                file_url TEXT,
                verification_status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);")
        conn.commit()
        print("  [OK] credentials created")
    else:
        print("  [SKIP] credentials already exists")


def create_student_reviews(cur, conn):
    """Create student_reviews table"""
    if table_exists(cur, 'student_reviews'):
        print("  [SKIP] student_reviews already exists")
        return

    print("  Creating student_reviews...")
    cur.execute("""
        CREATE TABLE student_reviews (
            id SERIAL PRIMARY KEY,
            student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            session_id INTEGER,
            rating_subject_matter INTEGER CHECK (rating_subject_matter >= 1 AND rating_subject_matter <= 5),
            rating_communication INTEGER CHECK (rating_communication >= 1 AND rating_communication <= 5),
            rating_discipline INTEGER CHECK (rating_discipline >= 1 AND rating_discipline <= 5),
            rating_punctuality INTEGER CHECK (rating_punctuality >= 1 AND rating_punctuality <= 5),
            overall_rating DECIMAL(3, 2),
            review_text TEXT,
            is_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, tutor_id, session_id)
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_student_reviews_tutor ON student_reviews(tutor_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_student_reviews_student ON student_reviews(student_id);")
    conn.commit()
    print("  [OK] student_reviews created")


def create_blog_tables(cur, conn):
    """Create blog_posts table"""
    if table_exists(cur, 'blog_posts'):
        print("  [SKIP] blog_posts already exists")
        return

    print("  Creating blog_posts...")
    cur.execute("""
        CREATE TABLE blog_posts (
            id SERIAL PRIMARY KEY,
            author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            author_role VARCHAR(20) DEFAULT 'tutor',
            title VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE,
            content TEXT NOT NULL,
            excerpt TEXT,
            cover_image TEXT,
            category VARCHAR(100),
            tags TEXT[],
            status VARCHAR(20) DEFAULT 'draft',
            views INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            published_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);")
    conn.commit()
    print("  [OK] blog_posts created")


def create_partner_requests(cur, conn):
    """Create partner_requests table"""
    if table_exists(cur, 'partner_requests'):
        print("  [SKIP] partner_requests already exists")
        return

    print("  Creating partner_requests...")
    cur.execute("""
        CREATE TABLE partner_requests (
            id SERIAL PRIMARY KEY,
            company_name VARCHAR(255) NOT NULL,
            contact_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            partnership_type VARCHAR(100),
            category VARCHAR(100),
            message TEXT,
            website VARCHAR(255),
            status VARCHAR(20) DEFAULT 'pending',
            admin_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            responded_at TIMESTAMP
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_partner_requests_status ON partner_requests(status);")
    conn.commit()
    print("  [OK] partner_requests created")


def run_migration():
    """Run all migrations"""
    print("=" * 60)
    print("COMPREHENSIVE TABLE MIGRATION")
    print("=" * 60)

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("\n[1/11] Tutor Packages...")
        create_tutor_packages(cur, conn)

        print("\n[2/11] Requested Sessions...")
        create_requested_sessions(cur, conn)

        print("\n[3/11] Tutor Schedules...")
        create_tutor_schedules(cur, conn)

        print("\n[4/11] Tutor Sessions...")
        create_tutor_sessions(cur, conn)

        print("\n[5/11] Connections...")
        create_connections(cur, conn)

        print("\n[6/11] Events & Clubs...")
        create_events_clubs(cur, conn)

        print("\n[7/11] Earnings & Investments...")
        create_earnings_investments(cur, conn)

        print("\n[8/11] Documents & Credentials...")
        create_documents_credentials(cur, conn)

        print("\n[9/11] Student Reviews...")
        create_student_reviews(cur, conn)

        print("\n[10/11] Blog Posts...")
        create_blog_tables(cur, conn)

        print("\n[11/11] Partner Requests...")
        create_partner_requests(cur, conn)

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)

        # Show all tables
        print("\nCurrent tables in database:")
        cur.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        for row in cur.fetchall():
            print(f"  - {row[0]}")

    except Exception as e:
        conn.rollback()
        print(f"\nMigration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
