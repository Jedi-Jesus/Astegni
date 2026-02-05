"""
Test: Verify New User Default Appearance Settings
Checks that new users get Growth Mindset theme and Patrick Hand font by default.

Date: 2026-02-05
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app import engine

def test_defaults():
    """Test new user defaults"""
    print("\n" + "="*60)
    print("TEST: New User Default Appearance Settings")
    print("="*60)

    with engine.connect() as connection:
        try:
            print("\n[1/2] Checking schema defaults...")

            # Check color_palette default
            result = connection.execute(text("""
                SELECT column_default
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name = 'color_palette'
            """))
            color_default = result.fetchone()[0]
            print(f"  color_palette default: {color_default}")

            # Check font_family default
            result = connection.execute(text("""
                SELECT column_default
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name = 'font_family'
            """))
            font_default = result.fetchone()[0]
            print(f"  font_family default: {font_default}")

            print("\n[2/2] Verifying defaults are correct...")

            color_ok = "'emerald-gold-charcoal'" in color_default
            font_ok = "'patrick-hand'" in font_default

            if color_ok and font_ok:
                print("[OK] All defaults are correct!")
                print("\n  - Color Palette: emerald-gold-charcoal (Growth Mindset)")
                print("  - Font Family: patrick-hand (Natural Handwriting)")
            else:
                print("[ERROR] Defaults are incorrect!")
                if not color_ok:
                    print(f"  [ERROR] color_palette: expected 'emerald-gold-charcoal', got {color_default}")
                if not font_ok:
                    print(f"  [ERROR] font_family: expected 'patrick-hand', got {font_default}")
                return False

            print("\n[3/3] Checking existing users...")
            result = connection.execute(text("""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN color_palette = 'emerald-gold-charcoal' THEN 1 ELSE 0 END) as growth_mindset,
                    SUM(CASE WHEN font_family = 'patrick-hand' THEN 1 ELSE 0 END) as patrick_hand
                FROM users
            """))
            stats = result.fetchone()

            print(f"\n  Total users: {stats[0]}")
            print(f"  Users with Growth Mindset: {stats[1]} ({stats[1]/stats[0]*100:.1f}%)")
            print(f"  Users with Patrick Hand: {stats[2]} ({stats[2]/stats[0]*100:.1f}%)")

            print("\n" + "="*60)
            print("TEST PASSED - New users will have correct defaults")
            print("="*60 + "\n")
            return True

        except Exception as e:
            print(f"\n[ERROR] Test failed: {e}")
            return False

if __name__ == "__main__":
    try:
        success = test_defaults()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\nTest failed: {e}")
        sys.exit(1)
