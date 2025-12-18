"""
Migration script to restructure system_media table with new fields:
- id, uploader_id, media_type, title, description, thumbnail, category,
- target[], tag[], is_active, download_count, likes, dislikes, comments[], shares, saves, is_favorite
"""

import psycopg
from psycopg.rows import dict_row

# Database connection - system_media is now in admin_db
ADMIN_DB_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db"

def migrate():
    print("=" * 70)
    print("RESTRUCTURE system_media TABLE")
    print("=" * 70)

    conn = psycopg.connect(ADMIN_DB_URL, row_factory=dict_row)
    cur = conn.cursor()

    try:
        # Check if table exists and get current data
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'system_media'
            )
        """)
        table_exists = cur.fetchone()['exists']

        if table_exists:
            cur.execute("SELECT COUNT(*) as cnt FROM system_media")
            count = cur.fetchone()['cnt']
            print(f"\n[1] Found existing system_media table with {count} rows")

            if count > 0:
                print("    Backing up existing data...")
                cur.execute("SELECT * FROM system_media")
                backup_data = cur.fetchall()
                print(f"    Backed up {len(backup_data)} rows")
            else:
                backup_data = []

            # Drop the old table
            print("\n[2] Dropping old system_media table...")
            cur.execute("DROP TABLE IF EXISTS system_media CASCADE")
            conn.commit()
            print("    [OK] Dropped")
        else:
            print("\n[1] system_media table does not exist, creating new...")
            backup_data = []

        # Create new table structure
        print("\n[3] Creating new system_media table structure...")
        cur.execute("""
            CREATE TABLE system_media (
                id SERIAL PRIMARY KEY,
                uploader_id INTEGER NOT NULL,
                media_type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                file_url VARCHAR(500) NOT NULL,
                thumbnail VARCHAR(500),
                category VARCHAR(100),
                targets JSONB DEFAULT '[]'::jsonb,
                tags JSONB DEFAULT '[]'::jsonb,
                is_active BOOLEAN DEFAULT true,
                download_count INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                dislikes INTEGER DEFAULT 0,
                comments JSONB DEFAULT '[]'::jsonb,
                shares INTEGER DEFAULT 0,
                saves INTEGER DEFAULT 0,
                is_favorite BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        print("    [OK] Created new table")

        # Create indexes for better performance
        print("\n[4] Creating indexes...")
        cur.execute("CREATE INDEX idx_system_media_uploader ON system_media(uploader_id)")
        cur.execute("CREATE INDEX idx_system_media_media_type ON system_media(media_type)")
        cur.execute("CREATE INDEX idx_system_media_category ON system_media(category)")
        cur.execute("CREATE INDEX idx_system_media_is_active ON system_media(is_active)")
        conn.commit()
        print("    [OK] Created indexes")

        # Migrate old data if any
        if backup_data:
            print(f"\n[5] Migrating {len(backup_data)} rows from backup...")
            for row in backup_data:
                cur.execute("""
                    INSERT INTO system_media (
                        uploader_id, media_type, title, description, file_url,
                        thumbnail, category, targets, tags, is_active
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    row.get('uploaded_by', 1),  # Map uploaded_by to uploader_id
                    row.get('media_type', 'image'),
                    row.get('title', 'Untitled'),
                    row.get('description'),
                    row.get('file_url', ''),
                    row.get('thumbnail_url'),  # Map thumbnail_url to thumbnail
                    row.get('classification'),  # Map classification to category
                    row.get('targets', []),
                    [],  # tags - new field
                    row.get('is_active', True)
                ))
            conn.commit()
            print(f"    [OK] Migrated {len(backup_data)} rows")

        # Verify new structure
        print("\n[6] Verifying new table structure...")
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'system_media'
            ORDER BY ordinal_position
        """)

        print("\n    New system_media structure:")
        print("    " + "-" * 66)
        for row in cur.fetchall():
            col = row['column_name']
            dtype = row['data_type']
            nullable = 'NULL' if row['is_nullable'] == 'YES' else 'NOT NULL'
            default = str(row['column_default'])[:25] if row['column_default'] else ''
            print(f"    {col:20} {dtype:15} {nullable:8} {default}")

        print("\n" + "=" * 70)
        print("MIGRATION COMPLETE!")
        print("=" * 70)
        print("\nNew fields:")
        print("  - id: Primary key")
        print("  - uploader_id: Admin who uploaded (was 'uploaded_by')")
        print("  - media_type: 'image', 'video', 'audio', 'document'")
        print("  - title: Media title")
        print("  - description: Optional description")
        print("  - file_url: URL to the media file")
        print("  - thumbnail: Thumbnail URL (was 'thumbnail_url')")
        print("  - category: Ad category (was 'classification')")
        print("  - targets[]: Target pages/profiles (JSONB array)")
        print("  - tags[]: Tags for filtering (NEW)")
        print("  - is_active: Visibility flag")
        print("  - download_count: Number of downloads (NEW)")
        print("  - likes: Like count (NEW)")
        print("  - dislikes: Dislike count (NEW)")
        print("  - comments[]: Comments array (NEW)")
        print("  - shares: Share count (NEW)")
        print("  - saves: Save count (NEW)")
        print("  - is_favorite: Favorite flag (NEW)")
        print("  - created_at, updated_at: Timestamps")

    except Exception as e:
        print(f"\n[ERROR] {e}")
        conn.rollback()
        import traceback
        traceback.print_exc()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
