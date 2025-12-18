"""
Migration: Rename affiliate_settings to affiliate_program
- Rename table: affiliate_settings -> affiliate_program
- Rename column: minimum_payout -> payout_threshold
- Drop column: cookie_duration_days
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

# Admin Database URL
ADMIN_DATABASE_URL = os.getenv('ADMIN_DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db')

def migrate():
    """Rename affiliate_settings table and update columns"""
    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("=" * 60)
        print("Migrating affiliate_settings -> affiliate_program")
        print("=" * 60)

        # Check if old table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'affiliate_settings'
            );
        """)
        old_table_exists = cursor.fetchone()[0]

        # Check if new table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'affiliate_program'
            );
        """)
        new_table_exists = cursor.fetchone()[0]

        if new_table_exists:
            print("\n[INFO] affiliate_program table already exists")

            # Check if payout_threshold column exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'affiliate_program' AND column_name = 'payout_threshold'
                );
            """)
            has_payout_threshold = cursor.fetchone()[0]

            if has_payout_threshold:
                print("[INFO] payout_threshold column already exists")
                print("[SKIP] Migration already completed")
                return
            else:
                # Need to rename minimum_payout to payout_threshold
                print("\n[1/2] Renaming minimum_payout -> payout_threshold...")
                cursor.execute("""
                    ALTER TABLE affiliate_program
                    RENAME COLUMN minimum_payout TO payout_threshold;
                """)
                print("   [OK] Column renamed")

                # Drop cookie_duration_days if exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns
                        WHERE table_name = 'affiliate_program' AND column_name = 'cookie_duration_days'
                    );
                """)
                has_cookie_duration = cursor.fetchone()[0]

                if has_cookie_duration:
                    print("\n[2/2] Dropping cookie_duration_days column...")
                    cursor.execute("""
                        ALTER TABLE affiliate_program
                        DROP COLUMN cookie_duration_days;
                    """)
                    print("   [OK] Column dropped")
                else:
                    print("\n[2/2] cookie_duration_days column doesn't exist, skipping")

                conn.commit()
                print("\n[SUCCESS] Migration completed")
                return

        if old_table_exists:
            print("\n[1/3] Renaming table affiliate_settings -> affiliate_program...")
            cursor.execute("""
                ALTER TABLE affiliate_settings RENAME TO affiliate_program;
            """)
            print("   [OK] Table renamed")

            print("\n[2/3] Renaming column minimum_payout -> payout_threshold...")
            cursor.execute("""
                ALTER TABLE affiliate_program
                RENAME COLUMN minimum_payout TO payout_threshold;
            """)
            print("   [OK] Column renamed")

            # Check if cookie_duration_days exists before dropping
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'affiliate_program' AND column_name = 'cookie_duration_days'
                );
            """)
            has_cookie_duration = cursor.fetchone()[0]

            if has_cookie_duration:
                print("\n[3/3] Dropping cookie_duration_days column...")
                cursor.execute("""
                    ALTER TABLE affiliate_program
                    DROP COLUMN cookie_duration_days;
                """)
                print("   [OK] Column dropped")
            else:
                print("\n[3/3] cookie_duration_days column doesn't exist, skipping")

            conn.commit()
            print("\n" + "=" * 60)
            print("[SUCCESS] Migration completed!")
            print("=" * 60)

        else:
            print("\n[INFO] affiliate_settings table doesn't exist")
            print("[INFO] Creating new affiliate_program table...")

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS affiliate_program (
                    id SERIAL PRIMARY KEY,
                    enabled BOOLEAN DEFAULT FALSE,
                    payout_threshold DECIMAL(10, 2) DEFAULT 1000.0,
                    payout_schedule VARCHAR(50) DEFAULT 'monthly',
                    direct_basic_commission DECIMAL(5, 2) DEFAULT 10.0,
                    direct_premium_commission DECIMAL(5, 2) DEFAULT 15.0,
                    direct_duration_months INTEGER DEFAULT 12,
                    indirect_basic_commission DECIMAL(5, 2) DEFAULT 5.0,
                    indirect_premium_commission DECIMAL(5, 2) DEFAULT 7.5,
                    indirect_duration_months INTEGER DEFAULT 6,
                    tier_bonuses JSONB DEFAULT '{}'::jsonb,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # Seed default data
            cursor.execute("""
                INSERT INTO affiliate_program (
                    enabled, payout_threshold, payout_schedule,
                    direct_basic_commission, direct_premium_commission, direct_duration_months,
                    indirect_basic_commission, indirect_premium_commission, indirect_duration_months
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (
                True, 1000.0, 'monthly',
                10.0, 15.0, 12,
                5.0, 7.5, 6
            ))

            conn.commit()
            print("   [OK] affiliate_program table created with default data")

        # Show current state
        print("\n" + "=" * 60)
        print("CURRENT STATE")
        print("=" * 60)

        cursor.execute("SELECT enabled, payout_threshold, payout_schedule FROM affiliate_program LIMIT 1")
        row = cursor.fetchone()
        if row:
            print(f"\nAffiliate Program:")
            print(f"  - Enabled: {row[0]}")
            print(f"  - Payout Threshold: ETB {row[1]}")
            print(f"  - Payout Schedule: {row[2]}")
        else:
            print("\nNo affiliate program data found")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    migrate()
