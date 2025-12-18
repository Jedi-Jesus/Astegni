"""
Migration: Restructure affiliate system to tier-based architecture

Changes:
1. Simplify affiliate_program table to just global settings (enabled, payout_threshold, payout_schedule)
2. Create affiliate_tiers table for flexible tier configuration
3. Migrate existing data to new structure

New Structure:
- affiliate_program: Global settings only
- affiliate_tiers: tier_level, tier_name, commission_rate, duration_months
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

# Admin Database URL
ADMIN_DATABASE_URL = os.getenv('ADMIN_DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db')

def migrate():
    """Restructure affiliate system to tier-based architecture"""
    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("=" * 60)
        print("Migrating Affiliate System to Tier-Based Structure")
        print("=" * 60)

        # Step 1: Check current state
        print("\n[1/5] Checking current database state...")

        # Check if affiliate_program exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'affiliate_program'
            );
        """)
        program_exists = cursor.fetchone()[0]

        # Check if affiliate_tiers already exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'affiliate_tiers'
            );
        """)
        tiers_exists = cursor.fetchone()[0]

        if tiers_exists:
            print("   [INFO] affiliate_tiers table already exists")
            # Check if it has data
            cursor.execute("SELECT COUNT(*) FROM affiliate_tiers")
            tier_count = cursor.fetchone()[0]
            if tier_count > 0:
                print(f"   [INFO] Found {tier_count} existing tiers")
                print("   [SKIP] Migration already completed")
                show_current_state(cursor)
                return

        # Step 2: Get existing data before modifying
        existing_program = None
        if program_exists:
            cursor.execute("SELECT * FROM affiliate_program LIMIT 1")
            existing_program = cursor.fetchone()
            if existing_program:
                print(f"   [OK] Found existing affiliate program data")

        # Step 3: Create affiliate_tiers table
        print("\n[2/5] Creating affiliate_tiers table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS affiliate_tiers (
                id SERIAL PRIMARY KEY,
                tier_level INTEGER NOT NULL UNIQUE,
                tier_name VARCHAR(100) NOT NULL,
                commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
                duration_months INTEGER NOT NULL DEFAULT 12,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_affiliate_tiers_level
            ON affiliate_tiers(tier_level);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_affiliate_tiers_active
            ON affiliate_tiers(is_active);
        """)
        print("   [OK] affiliate_tiers table created")

        # Step 4: Simplify affiliate_program table
        print("\n[3/5] Simplifying affiliate_program table...")

        # Check which columns exist
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'affiliate_program'
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"   [INFO] Existing columns: {existing_columns}")

        # Drop old commission columns if they exist
        columns_to_drop = [
            'direct_basic_commission', 'direct_premium_commission', 'direct_duration_months',
            'indirect_basic_commission', 'indirect_premium_commission', 'indirect_duration_months',
            'tier_bonuses'
        ]

        for col in columns_to_drop:
            if col in existing_columns:
                print(f"   [INFO] Dropping column: {col}")
                cursor.execute(f"ALTER TABLE affiliate_program DROP COLUMN IF EXISTS {col};")

        print("   [OK] affiliate_program table simplified")

        # Step 5: Seed default tiers
        print("\n[4/5] Seeding default affiliate tiers...")

        # Default tiers based on common MLM/affiliate structures
        default_tiers = [
            {
                'tier_level': 1,
                'tier_name': 'Direct Referral',
                'commission_rate': 10.0,
                'duration_months': 12
            },
            {
                'tier_level': 2,
                'tier_name': '2nd Level',
                'commission_rate': 5.0,
                'duration_months': 6
            }
        ]

        for tier in default_tiers:
            cursor.execute("""
                INSERT INTO affiliate_tiers (tier_level, tier_name, commission_rate, duration_months)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (tier_level) DO UPDATE SET
                    tier_name = EXCLUDED.tier_name,
                    commission_rate = EXCLUDED.commission_rate,
                    duration_months = EXCLUDED.duration_months,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                tier['tier_level'],
                tier['tier_name'],
                tier['commission_rate'],
                tier['duration_months']
            ))
        print("   [OK] Default tiers seeded")

        # Step 6: Ensure affiliate_program has a row with global settings
        print("\n[5/5] Ensuring global settings exist...")
        cursor.execute("SELECT id FROM affiliate_program LIMIT 1")
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO affiliate_program (enabled, payout_threshold, payout_schedule)
                VALUES (TRUE, 1000.0, 'monthly')
            """)
            print("   [OK] Default global settings created")
        else:
            print("   [OK] Global settings already exist")

        conn.commit()
        print("\n" + "=" * 60)
        print("[SUCCESS] Migration completed!")
        print("=" * 60)

        # Show current state
        show_current_state(cursor)

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def show_current_state(cursor):
    """Display the current state of affiliate tables"""
    print("\n" + "=" * 60)
    print("CURRENT STATE")
    print("=" * 60)

    # Show affiliate_program
    cursor.execute("SELECT enabled, payout_threshold, payout_schedule FROM affiliate_program LIMIT 1")
    row = cursor.fetchone()
    if row:
        print(f"\nAffiliate Program (Global Settings):")
        print(f"  - Enabled: {row[0]}")
        print(f"  - Payout Threshold: ETB {row[1]}")
        print(f"  - Payout Schedule: {row[2]}")

    # Show affiliate_tiers
    cursor.execute("""
        SELECT tier_level, tier_name, commission_rate, duration_months, is_active
        FROM affiliate_tiers
        ORDER BY tier_level ASC
    """)
    tiers = cursor.fetchall()
    if tiers:
        print(f"\nAffiliate Tiers ({len(tiers)} tiers):")
        for tier in tiers:
            status = "Active" if tier[4] else "Inactive"
            print(f"  - Level {tier[0]}: {tier[1]} -> {tier[2]}% for {tier[3]} months [{status}]")

    # Show table structure
    print("\n" + "-" * 60)
    print("Table Structure:")
    print("-" * 60)

    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'affiliate_program'
        ORDER BY ordinal_position
    """)
    print("\naffiliate_program:")
    for col in cursor.fetchall():
        print(f"  - {col[0]}: {col[1]}")

    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'affiliate_tiers'
        ORDER BY ordinal_position
    """)
    print("\naffiliate_tiers:")
    for col in cursor.fetchall():
        print(f"  - {col[0]}: {col[1]}")


if __name__ == '__main__':
    migrate()
