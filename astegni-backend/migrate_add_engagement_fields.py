"""
Migration: Add Engagement Fields to Media Tables

Adds likes, dislikes, shares, saves, comments to:
- documents (teaching/learning materials)
- videos
- images
- audios
- blogs (only dislikes, shares, saves - already has likes and comments)

Note: credentials table does NOT need these fields -
      it stores certificates/achievements which aren't "liked" or "shared"
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
    """Add engagement fields to media tables"""

    print("=" * 60)
    print("MIGRATION: Add Engagement Fields to Media Tables")
    print("=" * 60)

    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    cur = conn.cursor()

    try:
        # Tables that need full engagement fields
        media_tables = ['documents', 'videos', 'images', 'audios']
        engagement_fields = [
            ('likes', 'INTEGER', '0'),
            ('dislikes', 'INTEGER', '0'),
            ('shares', 'INTEGER', '0'),
            ('saves', 'INTEGER', '0'),
            ('comments', 'JSONB', "'[]'::jsonb"),  # JSON array for comments
        ]

        # Step 1: Add engagement fields to media tables
        print("\n[1/2] Adding engagement fields to media tables...")

        for table in media_tables:
            print(f"\n   Processing '{table}' table:")

            for field_name, field_type, default_value in engagement_fields:
                # Check if column exists
                cur.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns
                        WHERE table_name = '{table}' AND column_name = '{field_name}'
                    )
                """)
                exists = cur.fetchone()['exists']

                if exists:
                    print(f"      - {field_name}: already exists [SKIP]")
                else:
                    cur.execute(f"""
                        ALTER TABLE {table}
                        ADD COLUMN {field_name} {field_type} DEFAULT {default_value}
                    """)
                    print(f"      - {field_name}: added [OK]")

        # Step 2: Add missing fields to blogs table
        print("\n[2/2] Adding missing engagement fields to 'blogs' table...")

        blogs_fields = [
            ('dislikes', 'INTEGER', '0'),
            ('shares', 'INTEGER', '0'),
            ('saves', 'INTEGER', '0'),
        ]

        for field_name, field_type, default_value in blogs_fields:
            cur.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'blogs' AND column_name = '{field_name}'
                )
            """)
            exists = cur.fetchone()['exists']

            if exists:
                print(f"      - {field_name}: already exists [SKIP]")
            else:
                cur.execute(f"""
                    ALTER TABLE blogs
                    ADD COLUMN {field_name} {field_type} DEFAULT {default_value}
                """)
                print(f"      - {field_name}: added [OK]")

        # Commit changes
        conn.commit()

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nEngagement fields added:")
        print("  - documents, videos, images, audios: likes, dislikes, shares, saves, comments")
        print("  - blogs: dislikes, shares, saves (already had likes, comments)")
        print("\nNote: credentials table unchanged (doesn't need engagement fields)")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
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
        tables = ['documents', 'videos', 'images', 'audios', 'blogs']
        fields_to_check = ['likes', 'dislikes', 'shares', 'saves']

        for table in tables:
            print(f"\n{table}:")
            for field in fields_to_check:
                cur.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns
                        WHERE table_name = '{table}' AND column_name = '{field}'
                    )
                """)
                exists = cur.fetchone()['exists']
                status = "[OK]" if exists else "[MISSING]"
                print(f"   {status} {field}")

            # Check comments field (only for media tables, not blogs)
            if table != 'blogs':
                cur.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns
                        WHERE table_name = '{table}' AND column_name = 'comments'
                    )
                """)
                exists = cur.fetchone()['exists']
                status = "[OK]" if exists else "[MISSING]"
                print(f"   {status} comments")

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
    verify_migration()
