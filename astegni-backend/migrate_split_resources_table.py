"""
Migration: Split Resources Table into Separate Media Tables

This migration:
1. Renames 'resources' table to 'learning_materials' (for teaching documents/materials)
2. Removes the 'resource_type' field from learning_materials
3. Creates new tables: 'videos', 'images', 'audios' with same structure

Table Structure Summary:
- documents: For credentials (achievements, experience, certificates)
- learning_materials: For teaching/learning documents (PDFs, worksheets, assignments)
- videos: For video content
- images: For image content
- audios: For audio content (lectures, podcasts)

All new tables have the same fields for consistency and easy debugging.
"""

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os
import sys

# Fix Windows encoding issue
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')


def run_migration():
    """Run the migration to split resources table"""

    print("=" * 60)
    print("MIGRATION: Split Resources Table into Media Tables")
    print("=" * 60)

    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    cur = conn.cursor()

    try:
        # Step 1: Check if resources table exists
        print("\n[1/5] Checking current table structure...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'resources'
            )
        """)
        resources_exists = cur.fetchone()['exists']

        if resources_exists:
            print("   ✓ 'resources' table exists")

            # Check if it has resource_type column
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'resources' AND column_name = 'resource_type'
            """)
            has_resource_type = cur.fetchone() is not None
            print(f"   ✓ Has 'resource_type' column: {has_resource_type}")
        else:
            print("   ✗ 'resources' table does not exist - will create learning_materials fresh")

        # Step 2: Rename resources to learning_materials (if exists)
        print("\n[2/5] Renaming 'resources' to 'learning_materials'...")

        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'learning_materials'
            )
        """)
        learning_materials_exists = cur.fetchone()['exists']

        if learning_materials_exists:
            print("   ✓ 'learning_materials' table already exists - skipping rename")
        elif resources_exists:
            cur.execute("ALTER TABLE resources RENAME TO learning_materials")
            print("   ✓ Renamed 'resources' to 'learning_materials'")

            # Remove resource_type column if it exists
            if has_resource_type:
                cur.execute("ALTER TABLE learning_materials DROP COLUMN IF EXISTS resource_type")
                print("   ✓ Removed 'resource_type' column from learning_materials")
        else:
            # Create learning_materials table fresh
            print("   Creating 'learning_materials' table fresh...")
            cur.execute("""
                CREATE TABLE learning_materials (
                    id SERIAL PRIMARY KEY,
                    uploader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    uploader_role VARCHAR(50) NOT NULL,

                    -- Material details
                    title VARCHAR(255) NOT NULL,
                    subject VARCHAR(100),
                    category VARCHAR(100),
                    grade_level VARCHAR(50),
                    description TEXT,

                    -- File details (Backblaze B2)
                    file_url VARCHAR(500) NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    file_size INTEGER,
                    file_type VARCHAR(100),
                    thumbnail VARCHAR(500),

                    -- Timestamps
                    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    modification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    -- Metadata
                    tags JSONB,

                    -- Access control
                    visibility VARCHAR(20) DEFAULT 'private',
                    download_count INTEGER DEFAULT 0,
                    view_count INTEGER DEFAULT 0,

                    -- Status
                    status VARCHAR(20) DEFAULT 'active'
                )
            """)
            cur.execute("CREATE INDEX idx_learning_materials_uploader ON learning_materials(uploader_id)")
            cur.execute("CREATE INDEX idx_learning_materials_role ON learning_materials(uploader_role)")
            cur.execute("CREATE INDEX idx_learning_materials_subject ON learning_materials(subject)")
            cur.execute("CREATE INDEX idx_learning_materials_category ON learning_materials(category)")
            cur.execute("CREATE INDEX idx_learning_materials_status ON learning_materials(status)")
            print("   ✓ Created 'learning_materials' table")

        # Step 3: Create videos table
        print("\n[3/5] Creating 'videos' table...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'videos'
            )
        """)
        videos_exists = cur.fetchone()['exists']

        if videos_exists:
            print("   ✓ 'videos' table already exists - skipping")
        else:
            cur.execute("""
                CREATE TABLE videos (
                    id SERIAL PRIMARY KEY,
                    uploader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    uploader_role VARCHAR(50) NOT NULL,

                    -- Video details
                    title VARCHAR(255) NOT NULL,
                    subject VARCHAR(100),
                    category VARCHAR(100),
                    grade_level VARCHAR(50),
                    description TEXT,
                    duration INTEGER,  -- Duration in seconds

                    -- File details (Backblaze B2)
                    file_url VARCHAR(500) NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    file_size INTEGER,
                    file_type VARCHAR(100),
                    thumbnail VARCHAR(500),

                    -- Timestamps
                    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    modification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    -- Metadata
                    tags JSONB,

                    -- Access control
                    visibility VARCHAR(20) DEFAULT 'private',
                    download_count INTEGER DEFAULT 0,
                    view_count INTEGER DEFAULT 0,

                    -- Status
                    status VARCHAR(20) DEFAULT 'active'
                )
            """)
            cur.execute("CREATE INDEX idx_videos_uploader ON videos(uploader_id)")
            cur.execute("CREATE INDEX idx_videos_role ON videos(uploader_role)")
            cur.execute("CREATE INDEX idx_videos_subject ON videos(subject)")
            cur.execute("CREATE INDEX idx_videos_category ON videos(category)")
            cur.execute("CREATE INDEX idx_videos_status ON videos(status)")
            print("   ✓ Created 'videos' table")

        # Step 4: Create images table
        print("\n[4/5] Creating 'images' table...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'images'
            )
        """)
        images_exists = cur.fetchone()['exists']

        if images_exists:
            print("   ✓ 'images' table already exists - skipping")
        else:
            cur.execute("""
                CREATE TABLE images (
                    id SERIAL PRIMARY KEY,
                    uploader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    uploader_role VARCHAR(50) NOT NULL,

                    -- Image details
                    title VARCHAR(255) NOT NULL,
                    subject VARCHAR(100),
                    category VARCHAR(100),
                    grade_level VARCHAR(50),
                    description TEXT,
                    width INTEGER,   -- Image width in pixels
                    height INTEGER,  -- Image height in pixels

                    -- File details (Backblaze B2)
                    file_url VARCHAR(500) NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    file_size INTEGER,
                    file_type VARCHAR(100),
                    thumbnail VARCHAR(500),

                    -- Timestamps
                    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    modification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    -- Metadata
                    tags JSONB,

                    -- Access control
                    visibility VARCHAR(20) DEFAULT 'private',
                    download_count INTEGER DEFAULT 0,
                    view_count INTEGER DEFAULT 0,

                    -- Status
                    status VARCHAR(20) DEFAULT 'active'
                )
            """)
            cur.execute("CREATE INDEX idx_images_uploader ON images(uploader_id)")
            cur.execute("CREATE INDEX idx_images_role ON images(uploader_role)")
            cur.execute("CREATE INDEX idx_images_subject ON images(subject)")
            cur.execute("CREATE INDEX idx_images_category ON images(category)")
            cur.execute("CREATE INDEX idx_images_status ON images(status)")
            print("   ✓ Created 'images' table")

        # Step 5: Create audios table
        print("\n[5/5] Creating 'audios' table...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'audios'
            )
        """)
        audios_exists = cur.fetchone()['exists']

        if audios_exists:
            print("   ✓ 'audios' table already exists - skipping")
        else:
            cur.execute("""
                CREATE TABLE audios (
                    id SERIAL PRIMARY KEY,
                    uploader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    uploader_role VARCHAR(50) NOT NULL,

                    -- Audio details
                    title VARCHAR(255) NOT NULL,
                    subject VARCHAR(100),
                    category VARCHAR(100),
                    grade_level VARCHAR(50),
                    description TEXT,
                    duration INTEGER,  -- Duration in seconds

                    -- File details (Backblaze B2)
                    file_url VARCHAR(500) NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    file_size INTEGER,
                    file_type VARCHAR(100),
                    thumbnail VARCHAR(500),  -- Cover art

                    -- Timestamps
                    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    modification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    -- Metadata
                    tags JSONB,

                    -- Access control
                    visibility VARCHAR(20) DEFAULT 'private',
                    download_count INTEGER DEFAULT 0,
                    view_count INTEGER DEFAULT 0,

                    -- Status
                    status VARCHAR(20) DEFAULT 'active'
                )
            """)
            cur.execute("CREATE INDEX idx_audios_uploader ON audios(uploader_id)")
            cur.execute("CREATE INDEX idx_audios_role ON audios(uploader_role)")
            cur.execute("CREATE INDEX idx_audios_subject ON audios(subject)")
            cur.execute("CREATE INDEX idx_audios_category ON audios(category)")
            cur.execute("CREATE INDEX idx_audios_status ON audios(status)")
            print("   ✓ Created 'audios' table")

        # Commit all changes
        conn.commit()

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nTable Structure Summary:")
        print("  • documents        - Credentials (achievements, experience, certificates)")
        print("  • learning_materials - Teaching/learning documents (PDFs, worksheets)")
        print("  • videos           - Video content")
        print("  • images           - Image content")
        print("  • audios           - Audio content (lectures, podcasts)")
        print("\nAll tables have consistent structure for easy maintenance.")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cur.close()
        conn.close()


def verify_migration():
    """Verify the migration was successful"""
    print("\n" + "=" * 60)
    print("VERIFYING MIGRATION...")
    print("=" * 60)

    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    cur = conn.cursor()

    try:
        tables_to_check = ['learning_materials', 'videos', 'images', 'audios']

        for table in tables_to_check:
            cur.execute(f"""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = '{table}'
                ORDER BY ordinal_position
            """)
            columns = cur.fetchall()

            if columns:
                print(f"\n✓ {table} table ({len(columns)} columns):")
                for col in columns[:5]:  # Show first 5 columns
                    print(f"    - {col['column_name']}: {col['data_type']}")
                if len(columns) > 5:
                    print(f"    ... and {len(columns) - 5} more columns")
            else:
                print(f"\n✗ {table} table NOT FOUND")

        # Check that resources table no longer exists (or was renamed)
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'resources'
            )
        """)
        resources_exists = cur.fetchone()['exists']

        if resources_exists:
            print("\n⚠ Note: 'resources' table still exists (may have data)")
        else:
            print("\n✓ 'resources' table successfully renamed to 'learning_materials'")

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
    verify_migration()
