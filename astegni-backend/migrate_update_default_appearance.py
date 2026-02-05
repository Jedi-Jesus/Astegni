"""
Migration: Update Default Appearance Settings
Updates default color palette to 'emerald-gold-charcoal' (Growth Mindset)
and default font to 'patrick-hand' for new and existing users.

Date: 2026-02-05
"""

import sys
import os

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app import engine

def migrate():
    """Update default appearance settings"""
    print("\n" + "="*60)
    print("MIGRATION: Update Default Appearance Settings")
    print("="*60)

    with engine.connect() as connection:
        try:
            print("\n[1/3] Updating default color_palette in schema...")
            # Update the default value in the database schema
            connection.execute(text("""
                ALTER TABLE users
                ALTER COLUMN color_palette SET DEFAULT 'emerald-gold-charcoal'
            """))
            print("[OK] Schema default for color_palette updated to 'emerald-gold-charcoal'")

            print("\n[2/3] Updating default font_family in schema...")
            connection.execute(text("""
                ALTER TABLE users
                ALTER COLUMN font_family SET DEFAULT 'patrick-hand'
            """))
            print("[OK] Schema default for font_family updated to 'patrick-hand'")

            print("\n[3/3] Updating existing users with old defaults...")
            # Update existing users who have the old defaults to the new defaults
            result = connection.execute(text("""
                UPDATE users
                SET color_palette = 'emerald-gold-charcoal'
                WHERE color_palette = 'astegni-classic'
            """))
            updated_palette = result.rowcount
            print(f"[OK] Updated {updated_palette} users from 'astegni-classic' to 'emerald-gold-charcoal'")

            result = connection.execute(text("""
                UPDATE users
                SET font_family = 'patrick-hand'
                WHERE font_family = 'system'
            """))
            updated_font = result.rowcount
            print(f"[OK] Updated {updated_font} users from 'system' to 'patrick-hand'")

            connection.commit()

            print("\n" + "="*60)
            print("MIGRATION COMPLETE")
            print("="*60)
            print("\nNew defaults:")
            print("  - Color Palette: emerald-gold-charcoal (Growth Mindset)")
            print("  - Font Family: patrick-hand (Natural Handwriting)")
            print("\nAll new users will have these defaults.")
            print(f"Updated {updated_palette} existing users' color palettes.")
            print(f"Updated {updated_font} existing users' fonts.")
            print("\n")

        except Exception as e:
            print(f"\n[ERROR] Error during migration: {e}")
            connection.rollback()
            raise

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\nMigration failed: {e}")
        sys.exit(1)
