"""
Migration script to move tables from astegni_user_db to astegni_admin_db:
- astegni_reviews
- otps
- payment_gateways
"""

import psycopg2
from psycopg2 import sql
from psycopg2.extras import Json
import json

# Database connection settings
USER_DB = {
    'host': 'localhost',
    'database': 'astegni_user_db',
    'user': 'astegni_user',
    'password': 'Astegni2025'
}

ADMIN_DB = {
    'host': 'localhost',
    'database': 'astegni_admin_db',
    'user': 'astegni_user',
    'password': 'Astegni2025'
}


def migrate_tables():
    """Move tables from user_db to admin_db"""

    user_conn = None
    admin_conn = None

    try:
        # Connect to both databases
        print("Connecting to databases...")
        user_conn = psycopg2.connect(**USER_DB)
        admin_conn = psycopg2.connect(**ADMIN_DB)

        user_cur = user_conn.cursor()
        admin_cur = admin_conn.cursor()

        # =====================================================
        # 1. CREATE TABLES IN ADMIN_DB
        # =====================================================
        print("\n" + "="*60)
        print("STEP 1: Creating tables in astegni_admin_db")
        print("="*60)

        # Create astegni_reviews table
        print("\n[1/3] Creating astegni_reviews table...")
        admin_cur.execute("""
            CREATE TABLE IF NOT EXISTS astegni_reviews (
                id SERIAL PRIMARY KEY,
                reviewer_id INTEGER NOT NULL,
                reviewer_role VARCHAR(50),
                customer_service INTEGER CHECK (customer_service >= 1 AND customer_service <= 5),
                employee_satisfaction INTEGER CHECK (employee_satisfaction >= 1 AND employee_satisfaction <= 5),
                rating NUMERIC(2,1) CHECK (rating >= 1 AND rating <= 5),
                review_text TEXT,
                is_featured BOOLEAN DEFAULT FALSE,
                count INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                platform_satisfaction INTEGER CHECK (platform_satisfaction >= 1 AND platform_satisfaction <= 5)
            )
        """)
        print("   [OK] astegni_reviews table created")

        # Create otps table (without foreign key since users table is in user_db)
        print("\n[2/3] Creating otps table...")
        admin_cur.execute("""
            CREATE TABLE IF NOT EXISTS otps (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                otp_code VARCHAR(6) NOT NULL,
                purpose VARCHAR NOT NULL,
                expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                is_used BOOLEAN,
                created_at TIMESTAMP WITHOUT TIME ZONE,
                contact VARCHAR(255)
            )
        """)
        admin_cur.execute("CREATE INDEX IF NOT EXISTS idx_otps_contact ON otps(contact)")
        admin_cur.execute("CREATE INDEX IF NOT EXISTS ix_otps_id ON otps(id)")
        print("   [OK] otps table created")

        # Create payment_gateways table
        print("\n[3/3] Creating payment_gateways table...")
        admin_cur.execute("""
            CREATE TABLE IF NOT EXISTS payment_gateways (
                id SERIAL PRIMARY KEY,
                gateway_name VARCHAR(100) NOT NULL UNIQUE,
                enabled BOOLEAN DEFAULT FALSE,
                api_key TEXT,
                secret_key TEXT,
                webhook_url TEXT,
                test_mode BOOLEAN DEFAULT TRUE,
                settings JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("   [OK] payment_gateways table created")

        admin_conn.commit()
        print("\n[OK] All tables created successfully in admin_db")

        # =====================================================
        # 2. COPY DATA FROM USER_DB TO ADMIN_DB
        # =====================================================
        print("\n" + "="*60)
        print("STEP 2: Copying data from astegni_user_db to astegni_admin_db")
        print("="*60)

        # Copy astegni_reviews data
        print("\n[1/3] Copying astegni_reviews data...")
        user_cur.execute("SELECT * FROM astegni_reviews")
        reviews = user_cur.fetchall()
        if reviews:
            for row in reviews:
                admin_cur.execute("""
                    INSERT INTO astegni_reviews
                    (id, reviewer_id, reviewer_role, customer_service, employee_satisfaction,
                     rating, review_text, is_featured, count, created_at, updated_at, platform_satisfaction)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, row)
            # Reset sequence
            admin_cur.execute("SELECT setval('astegni_reviews_id_seq', COALESCE((SELECT MAX(id) FROM astegni_reviews), 1))")
            print(f"   [OK] Copied {len(reviews)} rows")
        else:
            print("   [OK] No data to copy (table is empty)")

        # Copy otps data
        print("\n[2/3] Copying otps data...")
        user_cur.execute("SELECT * FROM otps")
        otps = user_cur.fetchall()
        if otps:
            for row in otps:
                admin_cur.execute("""
                    INSERT INTO otps
                    (id, user_id, otp_code, purpose, expires_at, is_used, created_at, contact)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, row)
            # Reset sequence
            admin_cur.execute("SELECT setval('otps_id_seq', COALESCE((SELECT MAX(id) FROM otps), 1))")
            print(f"   [OK] Copied {len(otps)} rows")
        else:
            print("   [OK] No data to copy (table is empty)")

        # Copy payment_gateways data
        print("\n[3/3] Copying payment_gateways data...")
        user_cur.execute("SELECT * FROM payment_gateways")
        gateways = user_cur.fetchall()
        if gateways:
            for row in gateways:
                # Convert dict to Json for JSONB column (index 7 is settings)
                row_list = list(row)
                if row_list[7] is not None and isinstance(row_list[7], dict):
                    row_list[7] = Json(row_list[7])
                admin_cur.execute("""
                    INSERT INTO payment_gateways
                    (id, gateway_name, enabled, api_key, secret_key, webhook_url, test_mode, settings, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (gateway_name) DO NOTHING
                """, tuple(row_list))
            # Reset sequence
            admin_cur.execute("SELECT setval('payment_gateways_id_seq', COALESCE((SELECT MAX(id) FROM payment_gateways), 1))")
            print(f"   [OK] Copied {len(gateways)} rows")
        else:
            print("   [OK] No data to copy (table is empty)")

        admin_conn.commit()
        print("\n[OK] All data copied successfully")

        # =====================================================
        # 3. DROP TABLES FROM USER_DB
        # =====================================================
        print("\n" + "="*60)
        print("STEP 3: Dropping tables from astegni_user_db")
        print("="*60)

        print("\n[1/3] Dropping otps table (has foreign key)...")
        user_cur.execute("DROP TABLE IF EXISTS otps CASCADE")
        print("   [OK] otps table dropped")

        print("\n[2/3] Dropping astegni_reviews table...")
        user_cur.execute("DROP TABLE IF EXISTS astegni_reviews CASCADE")
        print("   [OK] astegni_reviews table dropped")

        print("\n[3/3] Dropping payment_gateways table...")
        user_cur.execute("DROP TABLE IF EXISTS payment_gateways CASCADE")
        print("   [OK] payment_gateways table dropped")

        user_conn.commit()
        print("\n[OK] All tables dropped from user_db")

        # =====================================================
        # VERIFICATION
        # =====================================================
        print("\n" + "="*60)
        print("VERIFICATION")
        print("="*60)

        # Verify tables exist in admin_db
        admin_cur.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('astegni_reviews', 'otps', 'payment_gateways')
        """)
        admin_tables = [row[0] for row in admin_cur.fetchall()]
        print(f"\n[OK] Tables in astegni_admin_db: {admin_tables}")

        # Verify tables don't exist in user_db
        user_cur.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('astegni_reviews', 'otps', 'payment_gateways')
        """)
        user_tables = [row[0] for row in user_cur.fetchall()]
        if user_tables:
            print(f"[WARNING] Tables still in astegni_user_db: {user_tables}")
        else:
            print("[OK] Tables successfully removed from astegni_user_db")

        # Count rows in admin_db
        admin_cur.execute("SELECT COUNT(*) FROM astegni_reviews")
        reviews_count = admin_cur.fetchone()[0]
        admin_cur.execute("SELECT COUNT(*) FROM otps")
        otps_count = admin_cur.fetchone()[0]
        admin_cur.execute("SELECT COUNT(*) FROM payment_gateways")
        gateways_count = admin_cur.fetchone()[0]

        print(f"\n[OK] Row counts in astegni_admin_db:")
        print(f"   - astegni_reviews: {reviews_count}")
        print(f"   - otps: {otps_count}")
        print(f"   - payment_gateways: {gateways_count}")

        print("\n" + "="*60)
        print("MIGRATION COMPLETE!")
        print("="*60)

    except Exception as e:
        print(f"\n[ERROR] Error during migration: {e}")
        if user_conn:
            user_conn.rollback()
        if admin_conn:
            admin_conn.rollback()
        raise
    finally:
        if user_conn:
            user_conn.close()
        if admin_conn:
            admin_conn.close()


if __name__ == "__main__":
    migrate_tables()
