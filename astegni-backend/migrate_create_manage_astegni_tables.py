"""
Migration: create the three tables backing the admin "Manage Astegni" page.

  - partners              : org logos shown in index.html "Trusted Partners"
  - featured_videos       : admin-uploaded videos for the "Featured Content" carousel
  - astegni_testimonials  : public professional testimonials (index.html "Success Stories")

All three live in the USER database (astegni_user_db) because they are read by
public/front-of-site endpoints. Run once:

    python migrate_create_manage_astegni_tables.py
"""

import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

DDL = """
CREATE TABLE IF NOT EXISTS partners (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    logo_url    VARCHAR(1000),
    website     VARCHAR(1000),
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_by  INTEGER,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS featured_videos (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    category      VARCHAR(100) DEFAULT 'all',
    video_url     VARCHAR(1000) NOT NULL,
    thumbnail_url VARCHAR(1000),
    duration      VARCHAR(20),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    views         INTEGER NOT NULL DEFAULT 0,
    created_by    INTEGER,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS astegni_testimonials (
    id            SERIAL PRIMARY KEY,
    reviewer_name VARCHAR(255) NOT NULL,
    title         VARCHAR(255),
    organization  VARCHAR(255),
    expertise     VARCHAR(100),
    review        TEXT NOT NULL,
    rating        INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    avatar_url    VARCHAR(1000),
    is_verified   BOOLEAN NOT NULL DEFAULT TRUE,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured   BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_by    INTEGER,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


def main():
    if not DATABASE_URL:
        raise SystemExit("DATABASE_URL is not set in .env")

    print(f"Connecting to user database...")
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(DDL)
        conn.commit()

    print("Created tables: partners, featured_videos, astegni_testimonials")


if __name__ == "__main__":
    main()
