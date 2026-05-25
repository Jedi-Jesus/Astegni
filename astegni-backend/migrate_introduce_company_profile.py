"""
Migration: Introduce company_profile between advertiser_profiles and brand_profile.

Phase 1 of the advertiser->company->brand->campaign restructure (see
DESIGN_company_profile_restructure.md at the repo root).

Before:
    User -> advertiser_profile (1) -> brand_profile (advertiser.brand_ids[]) -> campaign_profile

After:
    User -> advertiser_profile (1) -> company_profile (1+) -> brand_profile (brand.company_id) -> campaign_profile (campaign.company_id)

What this migration does (one transaction, atomic):

  1. CREATE TABLE company_profile with all the moved fields.
  2. ADD COLUMN company_id to brand_profile, campaign_profile,
     advertiser_transactions, advertiser_team_members.
  3. For each existing advertiser_profile:
       - INSERT one company_profile row, copying the company-level fields
         (company_name resolved via resolve_company_name() fallback chain),
         including the balance/wallet, KYC docs, verification flags carried
         from the user's verified status.
       - UPDATE every brand in advertiser.brand_ids to set company_id.
       - UPDATE every campaign where advertiser_id matches to set company_id.
       - UPDATE every transaction where advertiser_id matches to set company_id.
       - UPDATE every team member where advertiser_profile_id matches to set company_id.
  4. Verify counts: every brand/campaign/transaction/team row should now have
     company_id populated. Abort if any are NULL.
  5. ALTER columns to NOT NULL + ADD FK constraints with ON DELETE CASCADE.
  6. (NOT done here, deferred to migration 2) DROP the moved columns from
     advertiser_profiles + DROP the old advertiser_id columns + drop brand_ids.
     We keep both for now so a rollback during Phase 1.x deployment is possible.

Idempotency:
  - Re-running detects company_profile already exists and skips creation.
  - Detects rows already migrated (company_id populated) and skips backfill.
  - Safe to re-run after any failure.

Rollback:
  - DROP TABLE company_profile CASCADE removes the table and all FK columns
    that reference it. The legacy columns (advertiser.balance,
    campaign.advertiser_id, etc.) are still populated, so the old code path
    keeps working.
  - A separate rollback() function is provided below.

Usage:
    cd /var/www/astegni/astegni-backend && source venv/bin/activate
    python migrate_introduce_company_profile.py            # dry run (prints SQL, no changes)
    python migrate_introduce_company_profile.py --apply    # actually run
    python migrate_introduce_company_profile.py --rollback # tear it back down
"""

import argparse
import os
import sys

import psycopg
from dotenv import load_dotenv

load_dotenv()


# ----------------------------------------------------------------------
# Schema DDL
# ----------------------------------------------------------------------

DDL_CREATE_COMPANY_PROFILE = """
CREATE TABLE IF NOT EXISTS company_profile (
    id                                SERIAL PRIMARY KEY,
    advertiser_id                     INTEGER NOT NULL REFERENCES advertiser_profiles(id) ON DELETE CASCADE,

    -- Company identity
    company_name                      VARCHAR(255) NOT NULL,
    industry                          VARCHAR(100),
    company_size                      VARCHAR(50),
    business_reg_no                   VARCHAR(100),
    tin_number                        VARCHAR(50),
    website                           VARCHAR(500),
    address                           TEXT,
    city                              VARCHAR(100),
    company_description               TEXT,
    company_email                     JSONB DEFAULT '[]'::jsonb,
    company_phone                     JSONB DEFAULT '[]'::jsonb,

    -- KYC / verification documents
    company_logo                      VARCHAR(500),
    business_license_url              VARCHAR(500),
    tin_certificate_url               VARCHAR(500),
    additional_docs_urls              JSONB DEFAULT '[]'::jsonb,

    -- Verification status (per-company; replaces users.is_verified for advertiser purposes)
    is_verified                       BOOLEAN DEFAULT FALSE,
    verification_status               VARCHAR(20),
    verification_method               VARCHAR(20),
    verified_at                       TIMESTAMP,
    rejected_at                       TIMESTAMP,
    verification_submitted_at         TIMESTAMP,
    verification_reviewed_at          TIMESTAMP,
    verification_notes                TEXT,

    -- Billing / wallet (per-company)
    balance                           NUMERIC(12, 2) DEFAULT 0.00,
    currency                          VARCHAR(3) DEFAULT 'ETB',
    total_deposits                    NUMERIC(12, 2) DEFAULT 0.00,
    total_spent                       NUMERIC(12, 2) DEFAULT 0.00,
    last_transaction_at               TIMESTAMP,
    default_cancellation_fee_percent  NUMERIC(5, 2) DEFAULT 5.00,

    created_at                        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"""

DDL_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_company_profile_advertiser_id ON company_profile(advertiser_id);",
    "CREATE INDEX IF NOT EXISTS idx_company_profile_company_name ON company_profile(company_name);",
    "CREATE INDEX IF NOT EXISTS idx_company_profile_is_verified ON company_profile(is_verified) WHERE is_verified = TRUE;",
]

# Add nullable company_id to dependent tables (will be made NOT NULL after backfill)
DDL_ADD_FK_COLUMNS = [
    "ALTER TABLE brand_profile             ADD COLUMN IF NOT EXISTS company_id INTEGER;",
    "ALTER TABLE campaign_profile          ADD COLUMN IF NOT EXISTS company_id INTEGER;",
    "ALTER TABLE advertiser_transactions   ADD COLUMN IF NOT EXISTS company_id INTEGER;",
    "ALTER TABLE advertiser_team_members   ADD COLUMN IF NOT EXISTS company_id INTEGER;",
]

DDL_ADD_FK_CONSTRAINTS = [
    # brand_profile.company_id NOT NULL + FK
    """DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE constraint_name = 'fk_brand_company' AND table_name = 'brand_profile') THEN
            ALTER TABLE brand_profile ALTER COLUMN company_id SET NOT NULL;
            ALTER TABLE brand_profile ADD CONSTRAINT fk_brand_company
                FOREIGN KEY (company_id) REFERENCES company_profile(id) ON DELETE CASCADE;
            CREATE INDEX IF NOT EXISTS idx_brand_profile_company_id ON brand_profile(company_id);
        END IF;
    END $$;""",
    # campaign_profile.company_id NOT NULL + FK
    """DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE constraint_name = 'fk_campaign_company' AND table_name = 'campaign_profile') THEN
            ALTER TABLE campaign_profile ALTER COLUMN company_id SET NOT NULL;
            ALTER TABLE campaign_profile ADD CONSTRAINT fk_campaign_company
                FOREIGN KEY (company_id) REFERENCES company_profile(id) ON DELETE CASCADE;
            CREATE INDEX IF NOT EXISTS idx_campaign_profile_company_id ON campaign_profile(company_id);
        END IF;
    END $$;""",
    # advertiser_transactions.company_id NOT NULL + FK
    """DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE constraint_name = 'fk_transaction_company' AND table_name = 'advertiser_transactions') THEN
            ALTER TABLE advertiser_transactions ALTER COLUMN company_id SET NOT NULL;
            ALTER TABLE advertiser_transactions ADD CONSTRAINT fk_transaction_company
                FOREIGN KEY (company_id) REFERENCES company_profile(id) ON DELETE CASCADE;
            CREATE INDEX IF NOT EXISTS idx_advertiser_transactions_company_id ON advertiser_transactions(company_id);
        END IF;
    END $$;""",
    # advertiser_team_members.company_id NOT NULL + FK
    """DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE constraint_name = 'fk_team_company' AND table_name = 'advertiser_team_members') THEN
            ALTER TABLE advertiser_team_members ALTER COLUMN company_id SET NOT NULL;
            ALTER TABLE advertiser_team_members ADD CONSTRAINT fk_team_company
                FOREIGN KEY (company_id) REFERENCES company_profile(id) ON DELETE CASCADE;
            CREATE INDEX IF NOT EXISTS idx_advertiser_team_members_company_id ON advertiser_team_members(company_id);
        END IF;
    END $$;""",
]


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------

def resolve_company_name(row) -> str:
    """row: psycopg dict-row with company_name, first_name, last_name, father_name, grandfather_name."""
    cn = (row.get("company_name") or "").strip()
    if cn:
        return cn
    first = (row.get("first_name") or "").strip()
    last = (row.get("last_name") or "").strip()
    if first and last:
        return f"{first} {last}"
    father = (row.get("father_name") or "").strip()
    grandfather = (row.get("grandfather_name") or "").strip()
    parts = [p for p in (first, father, grandfather) if p]
    if parts:
        return " ".join(parts)
    raise RuntimeError(
        f"Cannot resolve company name for advertiser_id={row.get('advertiser_id')}: "
        f"no company_name set and user has no first_name/last_name/father_name."
    )


def connect():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        sys.exit("ERROR: DATABASE_URL not set")
    return psycopg.connect(db_url, row_factory=psycopg.rows.dict_row)


# ----------------------------------------------------------------------
# Apply
# ----------------------------------------------------------------------

def apply_migration(dry_run: bool) -> None:
    print("=" * 70)
    print("Introduce company_profile migration")
    print(f"  mode: {'DRY RUN' if dry_run else 'APPLY'}")
    print("=" * 70)

    with connect() as conn:
        with conn.cursor() as cur:
            # --- 1) Schema additions ----------------------------------------
            print("\n[1] Creating company_profile table + adding company_id columns...")
            if not dry_run:
                cur.execute(DDL_CREATE_COMPANY_PROFILE)
                for stmt in DDL_INDEXES:
                    cur.execute(stmt)
                for stmt in DDL_ADD_FK_COLUMNS:
                    cur.execute(stmt)
                print("    schema additions applied.")
            else:
                print("    (DRY RUN: would create company_profile + add 4 nullable company_id columns)")

            # --- 2) Backfill: one company per advertiser ---------------------
            print("\n[2] Backfilling company_profile from existing advertisers...")
            cur.execute("""
                SELECT
                    ap.id AS advertiser_id,
                    ap.user_id,
                    ap.brand_ids,
                    ap.company_name, ap.industry, ap.company_size, ap.business_reg_no, ap.tin_number,
                    ap.website, ap.address, ap.city, ap.company_description,
                    ap.company_email, ap.company_phone,
                    ap.company_logo, ap.business_license_url, ap.tin_certificate_url, ap.additional_docs_urls,
                    ap.verification_submitted_at, ap.verification_reviewed_at, ap.verification_notes,
                    ap.balance, ap.currency, ap.total_deposits, ap.total_spent, ap.last_transaction_at,
                    ap.default_cancellation_fee_percent,
                    u.first_name, u.last_name, u.father_name, u.grandfather_name,
                    u.is_verified AS user_is_verified,
                    u.verification_status AS user_verification_status,
                    u.verification_method AS user_verification_method,
                    u.verified_at AS user_verified_at,
                    u.rejected_at AS user_rejected_at
                FROM advertiser_profiles ap
                JOIN users u ON u.id = ap.user_id
                ORDER BY ap.id;
            """)
            advertisers = cur.fetchall()
            print(f"    {len(advertisers)} advertiser(s) to process.")

            for ap in advertisers:
                advertiser_id = ap["advertiser_id"]
                # Skip if a company already exists for this advertiser (idempotency).
                # In dry-run, the table doesn't exist yet, so skip the check.
                existing = None
                if not dry_run:
                    cur.execute(
                        "SELECT id, company_name FROM company_profile WHERE advertiser_id = %s ORDER BY id LIMIT 1",
                        (advertiser_id,),
                    )
                    existing = cur.fetchone()
                if existing:
                    print(f"    [advertiser {advertiser_id}] already has company_id={existing['id']} ({existing['company_name']!r}) - skipping insert")
                    company_id = existing["id"]
                else:
                    company_name = resolve_company_name(ap)
                    print(f"    [advertiser {advertiser_id}] creating company: {company_name!r}  (balance={ap['balance']} {ap['currency']})")
                    if dry_run:
                        company_id = -1
                    else:
                        cur.execute("""
                            INSERT INTO company_profile (
                                advertiser_id,
                                company_name, industry, company_size, business_reg_no, tin_number,
                                website, address, city, company_description,
                                company_email, company_phone,
                                company_logo, business_license_url, tin_certificate_url, additional_docs_urls,
                                is_verified, verification_status, verification_method, verified_at, rejected_at,
                                verification_submitted_at, verification_reviewed_at, verification_notes,
                                balance, currency, total_deposits, total_spent, last_transaction_at,
                                default_cancellation_fee_percent
                            ) VALUES (
                                %s,
                                %s, %s, %s, %s, %s,
                                %s, %s, %s, %s,
                                %s, %s,
                                %s, %s, %s, %s,
                                %s, %s, %s, %s, %s,
                                %s, %s, %s,
                                %s, %s, %s, %s, %s,
                                %s
                            )
                            RETURNING id;
                        """, (
                            advertiser_id,
                            company_name, ap["industry"], ap["company_size"], ap["business_reg_no"], ap["tin_number"],
                            ap["website"], ap["address"], ap["city"], ap["company_description"],
                            ap["company_email"], ap["company_phone"],
                            ap["company_logo"], ap["business_license_url"], ap["tin_certificate_url"], ap["additional_docs_urls"],
                            # Carry the user-level verification onto the auto-created first company.
                            ap["user_is_verified"], ap["user_verification_status"], ap["user_verification_method"],
                            ap["user_verified_at"], ap["user_rejected_at"],
                            ap["verification_submitted_at"], ap["verification_reviewed_at"], ap["verification_notes"],
                            ap["balance"], ap["currency"], ap["total_deposits"], ap["total_spent"], ap["last_transaction_at"],
                            ap["default_cancellation_fee_percent"] if ap["default_cancellation_fee_percent"] is not None else 5.00,
                        ))
                        company_id = cur.fetchone()["id"]
                        print(f"        -> company_profile.id = {company_id}")

                # --- Backfill FKs on dependent tables ---
                brand_ids = ap.get("brand_ids") or []
                if brand_ids:
                    if dry_run:
                        print(f"        (DRY RUN: would UPDATE brand_profile SET company_id={company_id} WHERE id IN {tuple(brand_ids)})")
                    else:
                        cur.execute(
                            "UPDATE brand_profile SET company_id = %s WHERE id = ANY(%s) AND company_id IS NULL",
                            (company_id, brand_ids),
                        )
                        print(f"        brands: {cur.rowcount} row(s) re-linked to company_id={company_id}")

                if dry_run:
                    print(f"        (DRY RUN: would UPDATE campaign_profile SET company_id={company_id} WHERE advertiser_id={advertiser_id})")
                    print(f"        (DRY RUN: would UPDATE advertiser_transactions SET company_id={company_id} WHERE advertiser_id={advertiser_id})")
                    print(f"        (DRY RUN: would UPDATE advertiser_team_members SET company_id={company_id} WHERE advertiser_profile_id={advertiser_id})")
                else:
                    cur.execute(
                        "UPDATE campaign_profile SET company_id = %s WHERE advertiser_id = %s AND company_id IS NULL",
                        (company_id, advertiser_id),
                    )
                    print(f"        campaigns: {cur.rowcount} row(s) re-linked")
                    cur.execute(
                        "UPDATE advertiser_transactions SET company_id = %s WHERE advertiser_id = %s AND company_id IS NULL",
                        (company_id, advertiser_id),
                    )
                    print(f"        transactions: {cur.rowcount} row(s) re-linked")
                    cur.execute(
                        "UPDATE advertiser_team_members SET company_id = %s WHERE advertiser_profile_id = %s AND company_id IS NULL",
                        (company_id, advertiser_id),
                    )
                    print(f"        team members: {cur.rowcount} row(s) re-linked")

            # --- 3) Verify no NULL company_ids remain ------------------------
            print("\n[3] Verifying all dependent rows have company_id set...")
            if dry_run:
                print("    (DRY RUN: would verify and add NOT NULL + FK constraints)")
            else:
                for tbl in ("brand_profile", "campaign_profile", "advertiser_transactions", "advertiser_team_members"):
                    cur.execute(f"SELECT COUNT(*) AS n FROM {tbl} WHERE company_id IS NULL")
                    n = cur.fetchone()["n"]
                    if n > 0:
                        raise RuntimeError(
                            f"{tbl} still has {n} row(s) with NULL company_id. "
                            f"Backfill incomplete - aborting before NOT NULL/FK constraints."
                        )
                    print(f"    {tbl}: OK (0 NULL company_id)")

                # --- 4) Apply NOT NULL + FK constraints -----------------------
                print("\n[4] Applying NOT NULL + FK constraints...")
                for stmt in DDL_ADD_FK_CONSTRAINTS:
                    cur.execute(stmt)
                print("    constraints applied.")

            if dry_run:
                print("\nDRY RUN complete. No changes committed.")
                conn.rollback()
                return

            conn.commit()
            print("\n" + "=" * 70)
            print("MIGRATION SUCCESSFUL")
            print("=" * 70)
            print("\nLegacy columns NOT yet dropped (kept for rollback safety):")
            print("  - advertiser_profiles: company_name, industry, ..., balance, etc.")
            print("  - brand_profile: (advertiser.brand_ids[] still populated)")
            print("  - campaign_profile.advertiser_id")
            print("  - advertiser_transactions.advertiser_id")
            print("  - advertiser_team_members.advertiser_profile_id")
            print("\nThese will be dropped in a follow-up migration after the application")
            print("code has been updated to read exclusively from company_profile and the")
            print("new company_id columns. Until then both schemas are valid.")


# ----------------------------------------------------------------------
# Rollback
# ----------------------------------------------------------------------

def rollback_migration() -> None:
    print("=" * 70)
    print("ROLLBACK: dropping company_profile + dependent FK columns")
    print("=" * 70)
    with connect() as conn:
        with conn.cursor() as cur:
            # Drop FK constraints first
            for stmt in [
                "ALTER TABLE brand_profile             DROP CONSTRAINT IF EXISTS fk_brand_company;",
                "ALTER TABLE campaign_profile          DROP CONSTRAINT IF EXISTS fk_campaign_company;",
                "ALTER TABLE advertiser_transactions   DROP CONSTRAINT IF EXISTS fk_transaction_company;",
                "ALTER TABLE advertiser_team_members   DROP CONSTRAINT IF EXISTS fk_team_company;",
                "ALTER TABLE brand_profile             DROP COLUMN IF EXISTS company_id;",
                "ALTER TABLE campaign_profile          DROP COLUMN IF EXISTS company_id;",
                "ALTER TABLE advertiser_transactions   DROP COLUMN IF EXISTS company_id;",
                "ALTER TABLE advertiser_team_members   DROP COLUMN IF EXISTS company_id;",
                "DROP TABLE IF EXISTS company_profile CASCADE;",
            ]:
                print(f"  > {stmt}")
                cur.execute(stmt)
            conn.commit()
            print("\nRollback complete. Legacy schema is the only valid path again.")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--apply", action="store_true", help="Actually run the migration (default: dry run)")
    p.add_argument("--rollback", action="store_true", help="Drop company_profile + FK columns (data loss for new table)")
    args = p.parse_args()

    if args.rollback:
        rollback_migration()
        return

    apply_migration(dry_run=not args.apply)


if __name__ == "__main__":
    main()
