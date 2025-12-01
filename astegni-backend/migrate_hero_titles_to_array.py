#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration: Convert hero_title from Text to JSON array
This allows tutors to have multiple hero titles that can be cycled through
"""

import psycopg
import json
import os
import sys
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

# Convert URL for psycopg3 compatibility
if DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://', 1)
if DATABASE_URL.startswith('postgresql+psycopg://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql+psycopg://', 'postgresql://', 1)

def migrate_hero_titles():
    """Convert hero_title from Text to JSON array"""
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                print("🔄 Starting migration: hero_title Text → JSON array...")

                # Step 1: Create a temporary column to store the JSON array
                print("1️⃣ Creating temporary column hero_titles_array...")
                cur.execute("""
                    ALTER TABLE tutor_profiles
                    ADD COLUMN IF NOT EXISTS hero_titles_array JSONB DEFAULT '[]'::jsonb;
                """)
                conn.commit()
                print("✅ Temporary column created")

                # Step 2: Migrate existing data
                print("2️⃣ Migrating existing hero_title data to array format...")
                cur.execute("""
                    UPDATE tutor_profiles
                    SET hero_titles_array =
                        CASE
                            WHEN hero_title IS NOT NULL AND hero_title != ''
                            THEN jsonb_build_array(hero_title)
                            ELSE '["Excellence in Education, Delivered with Passion"]'::jsonb
                        END
                    WHERE hero_titles_array = '[]'::jsonb OR hero_titles_array IS NULL;
                """)
                rows_updated = cur.rowcount
                conn.commit()
                print(f"✅ Migrated {rows_updated} rows")

                # Step 3: Drop old column
                print("3️⃣ Dropping old hero_title column...")
                cur.execute("""
                    ALTER TABLE tutor_profiles
                    DROP COLUMN IF EXISTS hero_title;
                """)
                conn.commit()
                print("✅ Old column dropped")

                # Step 4: Rename new column
                print("4️⃣ Renaming hero_titles_array to hero_titles...")
                cur.execute("""
                    ALTER TABLE tutor_profiles
                    RENAME COLUMN hero_titles_array TO hero_titles;
                """)
                conn.commit()
                print("✅ Column renamed")

                # Step 5: Set default value for new rows
                print("5️⃣ Setting default value for hero_titles...")
                cur.execute("""
                    ALTER TABLE tutor_profiles
                    ALTER COLUMN hero_titles SET DEFAULT '["Excellence in Education, Delivered with Passion"]'::jsonb;
                """)
                conn.commit()
                print("✅ Default value set")

                print("\n✅ Migration completed successfully!")
                print("📊 Hero titles are now stored as JSON arrays")
                print("💡 Tutors can now have multiple hero titles that cycle on their profile page")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    migrate_hero_titles()
