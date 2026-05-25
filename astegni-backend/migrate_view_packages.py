"""
Migration: Create view_packages table in astegni_admin_db.

Background
----------
Advertiser pricing is moving from continuous CPI (rate x impressions) to
discrete view packages. Advertisers buy a fixed bundle of impressions for
a fixed base price; targeting (audience / location / placement) multiplies
that base price.

The existing premium columns on `cpi_settings` are reinterpreted as
multiplier *deltas* (e.g. `tutor_premium = 0.4` => +40%) rather than
additive per-impression costs. Existing CPI calculator endpoints are
deprecated in cpi_settings_endpoints.py — see notes there.

Schema
------
view_packages
  id            SERIAL PK
  name          TEXT     (e.g. "Starter 10K")
  view_count    INTEGER  (impressions delivered)
  base_price    NUMERIC  (untargeted / international / no placement)
  currency      VARCHAR  (defaults to 'ETB')
  description   TEXT     NULL
  display_order INTEGER
  is_active     BOOLEAN
  created_at    TIMESTAMP
  updated_at    TIMESTAMP

Run once: python migrate_view_packages.py
"""

import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    "ADMIN_DATABASE_URL",
    "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db",
)


DEFAULT_PACKAGES = [
    # (name, view_count, base_price, description, display_order)
    ("Starter",     10_000,    500.00,  "Good for testing a creative.",       1),
    ("Growth",      50_000,    2_250.00,"Standard launch package.",           2),
    ("Scale",      100_000,    4_000.00,"Recommended for ongoing campaigns.", 3),
    ("Reach",      500_000,   18_000.00,"Multi-week broad reach.",            4),
    ("Saturate", 1_000_000,   32_000.00,"Maximum exposure across placements.",5),
]


def migrate() -> None:
    print(f"Connecting to admin DB ...")
    with psycopg.connect(ADMIN_DATABASE_URL) as conn:
        with conn.cursor() as cur:
            print("Creating view_packages table ...")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS view_packages (
                    id            SERIAL PRIMARY KEY,
                    name          VARCHAR(120) NOT NULL,
                    view_count    INTEGER      NOT NULL CHECK (view_count > 0),
                    base_price    NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
                    currency      VARCHAR(8)   NOT NULL DEFAULT 'ETB',
                    description   TEXT,
                    display_order INTEGER      NOT NULL DEFAULT 0,
                    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
                    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_view_packages_order "
                "ON view_packages(display_order);"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_view_packages_active "
                "ON view_packages(is_active);"
            )
            cur.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_view_packages_name "
                "ON view_packages(LOWER(name));"
            )
            conn.commit()
            print("  view_packages table ready.")

            cur.execute("SELECT COUNT(*) FROM view_packages;")
            existing = cur.fetchone()[0]
            if existing == 0:
                print("Seeding default packages ...")
                for name, view_count, base_price, description, order in DEFAULT_PACKAGES:
                    cur.execute(
                        """
                        INSERT INTO view_packages
                            (name, view_count, base_price, description, display_order)
                        VALUES (%s, %s, %s, %s, %s);
                        """,
                        (name, view_count, base_price, description, order),
                    )
                conn.commit()
                print(f"  Seeded {len(DEFAULT_PACKAGES)} default packages.")
            else:
                print(f"  Skipping seed; {existing} packages already exist.")

    print("Migration complete.")


if __name__ == "__main__":
    migrate()
