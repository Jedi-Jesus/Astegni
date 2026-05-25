"""
Migration: replace the standalone view_packages table with a JSONB column
`view_tier_premiums` on cpi_settings.

View tiers are now treated as another targeting dimension (alongside
audience / location / placement) rather than a separate purchasable
bundle. Each tier is {view_count, premium} where `premium` is added to
base CPI in ETB-per-impression.

Drops:
  - view_packages table (created by migrate_view_packages.py — superseded)

Adds:
  - cpi_settings.view_tier_premiums JSONB DEFAULT '[]'::jsonb
    Shape: [{"view_count": 10000, "premium": 0.0, "label": "10K"}, ...]

Idempotent. Safe to run on a database where view_packages was never
created (e.g. an environment that skipped migrate_view_packages.py).
"""

import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    "ADMIN_DATABASE_URL",
    "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db",
)


def migrate() -> None:
    print("Connecting to admin DB ...")
    with psycopg.connect(ADMIN_DATABASE_URL) as conn:
        with conn.cursor() as cur:
            print("Adding view_tier_premiums column to cpi_settings ...")
            cur.execute(
                """
                ALTER TABLE cpi_settings
                ADD COLUMN IF NOT EXISTS view_tier_premiums JSONB
                NOT NULL DEFAULT '[]'::jsonb;
                """
            )
            conn.commit()
            print("  cpi_settings.view_tier_premiums ready.")

            print("Dropping view_packages table (if present) ...")
            cur.execute("DROP TABLE IF EXISTS view_packages;")
            conn.commit()
            print("  view_packages removed.")

    print("Migration complete.")


if __name__ == "__main__":
    migrate()
