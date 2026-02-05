"""
Migration: Add appearance settings columns to users table
Adds columns for storing user's appearance preferences including color palette
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv('DATABASE_URL')

# Create engine
engine = create_engine(DATABASE_URL)

def run_migration():
    """Add appearance settings columns to users table"""

    print("Starting migration: Add appearance settings to users table...")

    with engine.connect() as conn:
        try:
            # Add appearance settings columns
            print("Adding appearance settings columns...")

            # Theme (light/dark/system)
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'light'
            """))
            conn.commit()
            print("OK - Added 'theme' column")

            # Color palette
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS color_palette VARCHAR(50) DEFAULT 'emerald-gold-charcoal'
            """))
            conn.commit()
            print("OK - Added 'color_palette' column")

            # Font size
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS font_size INTEGER DEFAULT 16
            """))
            conn.commit()
            print("OK - Added 'font_size' column")

            # Display density
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS display_density VARCHAR(20) DEFAULT 'comfortable'
            """))
            conn.commit()
            print("OK - Added 'display_density' column")

            # Accent color
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT 'indigo'
            """))
            conn.commit()
            print("OK - Added 'accent_color' column")

            # Enable animations
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS enable_animations BOOLEAN DEFAULT TRUE
            """))
            conn.commit()
            print("OK - Added 'enable_animations' column")

            # Reduce motion
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS reduce_motion BOOLEAN DEFAULT FALSE
            """))
            conn.commit()
            print("OK - Added 'reduce_motion' column")

            # Sidebar position
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS sidebar_position VARCHAR(20) DEFAULT 'left'
            """))
            conn.commit()
            print("OK - Added 'sidebar_position' column")

            print("\nSUCCESS - Migration completed successfully!")
            print("\nNew columns added to users table:")
            print("  - theme (VARCHAR): light/dark/system")
            print("  - color_palette (VARCHAR): 23 palette options")
            print("  - font_size (INTEGER): 12-20px")
            print("  - display_density (VARCHAR): compact/comfortable/spacious")
            print("  - accent_color (VARCHAR): color name")
            print("  - enable_animations (BOOLEAN): true/false")
            print("  - reduce_motion (BOOLEAN): true/false")
            print("  - sidebar_position (VARCHAR): left/right")

        except Exception as e:
            print(f"\nERROR - Migration failed: {str(e)}")
            conn.rollback()
            raise

def verify_migration():
    """Verify the migration was successful"""

    print("\nVerifying migration...")

    with engine.connect() as conn:
        # Check if columns exist
        result = conn.execute(text("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name IN (
                'theme', 'color_palette', 'font_size',
                'display_density', 'accent_color',
                'enable_animations', 'reduce_motion', 'sidebar_position'
            )
            ORDER BY column_name
        """))

        columns = result.fetchall()

        if len(columns) == 8:
            print("\nSUCCESS - Verification successful! All columns present:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]} (default: {col[2]})")
        else:
            print(f"\nWARNING - Expected 8 columns, found {len(columns)}")
            for col in columns:
                print(f"  - {col[0]}: {col[1]}")

if __name__ == "__main__":
    print("=" * 60)
    print("APPEARANCE SETTINGS MIGRATION")
    print("=" * 60)
    print()

    run_migration()
    verify_migration()

    print("\n" + "=" * 60)
    print("Next steps:")
    print("1. Restart the backend server")
    print("2. Test appearance settings in the UI")
    print("3. Verify settings persist after login")
    print("=" * 60)
