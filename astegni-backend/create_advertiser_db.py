"""
Create the advertiser database (astegni_advertiser_db) and all its tables.

Mirrors how the user/admin databases are bootstrapped. Safe to re-run:
    - CREATE DATABASE is skipped if the DB already exists.
    - create_all() only creates missing tables (won't alter/drop existing ones).

Usage:
    cd astegni-backend
    python create_advertiser_db.py

Then copy existing rows from astegni_user_db with:
    python migrate_advertiser_db_split.py
"""

import sys
import os

# Make 'config' and the advertiser models importable (same shim app.py uses).
sys.path.append(os.path.join(os.path.dirname(__file__), "app.py modules"))

import psycopg
from config import ADVERTISER_DATABASE_URL
from advertiser_models import AdvertiserBase, advertiser_engine


def _parse_target_db(url: str):
    """Return (admin_dsn_to_postgres_db, target_db_name) from a SQLAlchemy URL.

    config rewrites postgresql:// -> postgresql+psycopg://; psycopg.connect needs
    the plain libpq form, so strip the +psycopg and the SQLAlchemy-only query bits.
    """
    plain = url.replace("postgresql+psycopg://", "postgresql://")
    # strip query string (e.g. ?sslmode=disable) for parsing the db name
    base, _, _query = plain.partition("?")
    target_db = base.rsplit("/", 1)[-1]
    # connect to the maintenance 'postgres' db on the same server to run CREATE DATABASE
    admin_dsn = plain.rsplit("/", 1)[0] + "/postgres"
    return admin_dsn, target_db


def create_database_if_missing():
    admin_dsn, target_db = _parse_target_db(ADVERTISER_DATABASE_URL)
    print(f"Target advertiser database: {target_db}")

    # CREATE DATABASE cannot run inside a transaction -> autocommit.
    conn = psycopg.connect(admin_dsn, autocommit=True)
    try:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (target_db,))
        exists = cur.fetchone() is not None
        if exists:
            print(f"Database '{target_db}' already exists - skipping CREATE DATABASE.")
        else:
            # Identifier can't be parameterized; target_db comes from our own config.
            cur.execute(f'CREATE DATABASE "{target_db}"')
            print(f"Created database '{target_db}'.")
    finally:
        conn.close()


def create_tables():
    print("Creating advertiser tables (create_all)...")
    AdvertiserBase.metadata.create_all(bind=advertiser_engine)
    created = sorted(AdvertiserBase.metadata.tables.keys())
    print(f"Tables ensured ({len(created)}):")
    for t in created:
        print(f"  - {t}")


if __name__ == "__main__":
    print("=" * 60)
    print("Astegni :: create advertiser database")
    print("=" * 60)
    create_database_if_missing()
    create_tables()
    print("=" * 60)
    print("Done. Next: python migrate_advertiser_db_split.py")
    print("=" * 60)
