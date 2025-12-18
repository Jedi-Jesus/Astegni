"""
Migration: Add program_id foreign key to affiliate_tiers table

This links each tier to its parent affiliate program.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

# Admin Database URL
ADMIN_DATABASE_URL = os.getenv('ADMIN_DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db')

def migrate():
    """Add program_id foreign key to affiliate_tiers"""
    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("=" * 60)
        print("Adding program_id to affiliate_tiers")
        print("=" * 60)

        # Check if program_id column already exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'affiliate_tiers' AND column_name = 'program_id'
            );
        """)
        has_program_id = cursor.fetchone()[0]

        if has_program_id:
            print("\n[INFO] program_id column already exists")
            print("[SKIP] Migration already completed")
            show_current_state(cursor)
            return

        # Get the default program ID
        cursor.execute("SELECT id FROM affiliate_program LIMIT 1")
        result = cursor.fetchone()
        if not result:
            print("\n[ERROR] No affiliate program found. Creating default program...")
            cursor.execute("""
                INSERT INTO affiliate_program (enabled, payout_threshold, payout_schedule)
                VALUES (TRUE, 1000.0, 'monthly')
                RETURNING id
            """)
            result = cursor.fetchone()
            conn.commit()

        default_program_id = result[0]
        print(f"\n[INFO] Default program ID: {default_program_id}")

        # Step 1: Add program_id column
        print("\n[1/3] Adding program_id column...")
        cursor.execute("""
            ALTER TABLE affiliate_tiers
            ADD COLUMN program_id INTEGER
        """)
        print("   [OK] Column added")

        # Step 2: Set default value for existing rows
        print("\n[2/3] Setting program_id for existing tiers...")
        cursor.execute("""
            UPDATE affiliate_tiers
            SET program_id = %s
            WHERE program_id IS NULL
        """, (default_program_id,))
        updated_count = cursor.rowcount
        print(f"   [OK] Updated {updated_count} tiers")

        # Step 3: Add NOT NULL constraint and foreign key
        print("\n[3/3] Adding constraints...")
        cursor.execute("""
            ALTER TABLE affiliate_tiers
            ALTER COLUMN program_id SET NOT NULL
        """)
        cursor.execute("""
            ALTER TABLE affiliate_tiers
            ADD CONSTRAINT fk_affiliate_tiers_program
            FOREIGN KEY (program_id) REFERENCES affiliate_program(id)
            ON DELETE CASCADE
        """)
        # Create index for faster lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_affiliate_tiers_program_id
            ON affiliate_tiers(program_id)
        """)
        # Update unique constraint to be per-program
        cursor.execute("""
            ALTER TABLE affiliate_tiers
            DROP CONSTRAINT IF EXISTS affiliate_tiers_tier_level_key
        """)
        cursor.execute("""
            ALTER TABLE affiliate_tiers
            ADD CONSTRAINT affiliate_tiers_program_tier_unique
            UNIQUE (program_id, tier_level)
        """)
        print("   [OK] Constraints added")

        conn.commit()
        print("\n" + "=" * 60)
        print("[SUCCESS] Migration completed!")
        print("=" * 60)

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
    cursor.execute("SELECT id, enabled, payout_threshold, payout_schedule FROM affiliate_program")
    programs = cursor.fetchall()
    print(f"\nAffiliate Programs ({len(programs)}):")
    for prog in programs:
        print(f"  - ID {prog[0]}: Enabled={prog[1]}, Threshold={prog[2]} ETB, Schedule={prog[3]}")

    # Show affiliate_tiers with program_id
    cursor.execute("""
        SELECT t.program_id, t.tier_level, t.tier_name, t.commission_rate, t.duration_months, t.is_active
        FROM affiliate_tiers t
        ORDER BY t.program_id, t.tier_level ASC
    """)
    tiers = cursor.fetchall()
    if tiers:
        print(f"\nAffiliate Tiers ({len(tiers)} tiers):")
        for tier in tiers:
            status = "Active" if tier[5] else "Inactive"
            print(f"  - Program {tier[0]}, Level {tier[1]}: {tier[2]} -> {tier[3]}% for {tier[4]} months [{status}]")

    # Show table structure
    print("\n" + "-" * 60)
    print("affiliate_tiers columns:")
    print("-" * 60)
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'affiliate_tiers'
        ORDER BY ordinal_position
    """)
    for col in cursor.fetchall():
        nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
        print(f"  - {col[0]}: {col[1]} {nullable}")


if __name__ == '__main__':
    migrate()
