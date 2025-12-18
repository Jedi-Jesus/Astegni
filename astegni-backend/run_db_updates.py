"""Run database updates - drop backup tables and create admin_credentials"""
import psycopg
from psycopg.rows import dict_row

# Direct connection to local database (renamed to astegni_user_db)
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

print("Connecting to local database...")
conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
cur = conn.cursor()

try:
    # Drop backup tables
    print("\n1. Dropping backup tables...")
    cur.execute("""
        DROP TABLE IF EXISTS
            admin_profile_old_backup,
            admin_profile_stats_backup,
            admin_reviews_backup,
            connections_backup,
            connections_backup_20251121,
            courses_backup,
            student_tutors_backup,
            tutor_students_backup,
            admin_achievements,
            admin_daily_quotas,
            admin_fire_streaks,
            admin_panel_statistics
        CASCADE
    """)
    print("   [OK] Backup tables dropped")

    # Create admin_credentials table
    print("\n2. Creating admin_credentials table...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS admin_credentials (
            id SERIAL PRIMARY KEY,
            uploader_id INTEGER NOT NULL,
            uploader_role VARCHAR(50) NOT NULL,
            document_type VARCHAR(100) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            issued_by VARCHAR(255),
            date_of_issue DATE,
            expiry_date DATE,
            document_url TEXT,
            file_name VARCHAR(255),
            file_type VARCHAR(100),
            file_size INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            verification_status VARCHAR(50) DEFAULT 'pending',
            is_verified BOOLEAN DEFAULT FALSE,
            verified_by_admin_id INTEGER,
            rejection_reason TEXT,
            rejected_at TIMESTAMP WITH TIME ZONE,
            is_featured BOOLEAN DEFAULT FALSE
        )
    """)
    print("   [OK] admin_credentials table created")

    # Create indexes
    print("\n3. Creating indexes...")
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_admin_credentials_uploader_id ON admin_credentials(uploader_id)",
        "CREATE INDEX IF NOT EXISTS idx_admin_credentials_uploader_role ON admin_credentials(uploader_role)",
        "CREATE INDEX IF NOT EXISTS idx_admin_credentials_document_type ON admin_credentials(document_type)",
        "CREATE INDEX IF NOT EXISTS idx_admin_credentials_verification_status ON admin_credentials(verification_status)",
        "CREATE INDEX IF NOT EXISTS idx_admin_credentials_created_at ON admin_credentials(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_admin_credentials_is_featured ON admin_credentials(is_featured)"
    ]
    for idx in indexes:
        cur.execute(idx)
    print("   [OK] Indexes created")

    conn.commit()
    print("\n" + "=" * 50)
    print("ALL UPDATES COMPLETED SUCCESSFULLY!")
    print("=" * 50)

    # Verify - count tables
    cur.execute("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'")
    count = cur.fetchone()['count']
    print(f"\nTotal tables in database: {count}")

except Exception as e:
    conn.rollback()
    print(f"\n[ERROR] {e}")
    import traceback
    traceback.print_exc()
finally:
    cur.close()
    conn.close()
