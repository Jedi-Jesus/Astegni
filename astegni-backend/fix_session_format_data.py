"""
Fix session format data in tutor_packages table

Issues found:
1. Session formats stored as comma-separated string: "online, in-person"
2. Lowercase instead of proper case: "online" vs "Online"
3. Need to normalize to: "Online", "In-person", "Hybrid"

This script will:
1. Find all malformed session_format values
2. Normalize to proper case and format
3. Update the database
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
import re
import sys

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

def normalize_session_format(raw_format):
    """
    Normalize session format to standard values

    Input examples:
        "online, in-person" -> should be split into 2 packages
        "online" -> "Online"
        "in person" -> "In-person"
        "hybrid" -> "Hybrid"

    Returns: List of normalized formats
    """
    if not raw_format:
        return []

    # Split by comma if multiple formats
    formats = [f.strip().lower() for f in raw_format.split(',')]

    normalized = []
    for fmt in formats:
        if 'online' in fmt:
            normalized.append('Online')
        elif 'in-person' in fmt or 'in person' in fmt or 'inperson' in fmt:
            normalized.append('In-person')
        elif 'hybrid' in fmt:
            normalized.append('Hybrid')
        elif 'self' in fmt and 'pace' in fmt:
            normalized.append('Self-paced')

    return list(set(normalized))  # Remove duplicates

def main():
    with engine.connect() as conn:
        # Get all packages with session_format
        packages = conn.execute(text("""
            SELECT id, tutor_id, session_format, hourly_rate, grade_level, course_ids
            FROM tutor_packages
            ORDER BY tutor_id, id
        """)).fetchall()

        print(f"\n=== Found {len(packages)} packages ===\n")

        packages_to_fix = []
        packages_to_split = []

        for pkg in packages:
            if pkg.session_format:
                normalized = normalize_session_format(pkg.session_format)

                if len(normalized) == 0:
                    print(f"[!] Package {pkg.id}: Unknown format '{pkg.session_format}'")
                elif len(normalized) == 1 and normalized[0] != pkg.session_format:
                    print(f"[FIX] Package {pkg.id}: '{pkg.session_format}' -> '{normalized[0]}'")
                    packages_to_fix.append((pkg.id, normalized[0]))
                elif len(normalized) > 1:
                    print(f"[SPLIT] Package {pkg.id}: Split '{pkg.session_format}' -> {normalized}")
                    packages_to_split.append((pkg, normalized))
                else:
                    print(f"[OK] Package {pkg.id}: Already correct '{pkg.session_format}'")

        print(f"\n=== Summary ===")
        print(f"To fix (wrong case): {len(packages_to_fix)}")
        print(f"To split (multiple formats in one): {len(packages_to_split)}")

        if packages_to_fix or packages_to_split:
            # Check for --yes flag to auto-confirm
            if '--yes' in sys.argv:
                response = 'yes'
                print("\n[!] Auto-applying fixes (--yes flag provided)")
            else:
                response = input("\n[!] Apply fixes? (yes/no): ").lower()

            if response == 'yes':
                # Fix case issues
                for pkg_id, correct_format in packages_to_fix:
                    conn.execute(text("""
                        UPDATE tutor_packages
                        SET session_format = :format
                        WHERE id = :id
                    """), {'id': pkg_id, 'format': correct_format})
                    print(f"[OK] Fixed package {pkg_id}")

                # Split packages with multiple formats
                for old_pkg, formats in packages_to_split:
                    # Strategy: Update the first package, create new ones for the rest
                    first_format = True
                    first_package_id = None

                    for fmt in formats:
                        if first_format:
                            # Update the existing package instead of creating new one
                            # This preserves references from enrolled_students table
                            package_name = f"{fmt} Package"
                            conn.execute(text("""
                                UPDATE tutor_packages
                                SET name = :name, session_format = :format
                                WHERE id = :id
                            """), {
                                'id': old_pkg.id,
                                'name': package_name,
                                'format': fmt
                            })
                            first_package_id = old_pkg.id
                            print(f"[UPDATE] Updated package {old_pkg.id} to '{package_name}' (format: {fmt})")
                            first_format = False
                        else:
                            # Create new package for additional formats
                            package_name = f"{fmt} Package"
                            conn.execute(text("""
                                INSERT INTO tutor_packages (tutor_id, name, session_format, hourly_rate, grade_level, course_ids)
                                VALUES (:tutor_id, :name, :format, :rate, :grade, :courses)
                            """), {
                                'tutor_id': old_pkg.tutor_id,
                                'name': package_name,
                                'format': fmt,
                                'rate': old_pkg.hourly_rate,
                                'grade': old_pkg.grade_level,
                                'courses': old_pkg.course_ids or []
                            })
                            print(f"[OK] Created new package '{package_name}' for tutor {old_pkg.tutor_id}")

                conn.commit()
                print("\n[OK] All fixes applied!")

                # Show updated data
                print("\n=== Updated packages ===")
                updated = conn.execute(text("""
                    SELECT tutor_id,
                           ARRAY_AGG(DISTINCT session_format) as formats,
                           COUNT(*) as package_count
                    FROM tutor_packages
                    GROUP BY tutor_id
                    ORDER BY tutor_id
                """)).fetchall()

                for row in updated:
                    print(f"Tutor {row.tutor_id}: {row.formats} ({row.package_count} packages)")
            else:
                print("[CANCEL] Cancelled")
                conn.rollback()
        else:
            print("\n[OK] All packages already have correct format!")

if __name__ == "__main__":
    main()
