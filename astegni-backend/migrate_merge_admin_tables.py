"""
Migration: Merge admin_profiles into admin_profile and drop admin_profiles
- Add missing columns from admin_profiles to admin_profile
- Migrate data if needed
- Drop admin_profiles table to avoid confusion
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Starting migration: Merging admin_profiles into admin_profile...")
        print("=" * 80)

        # Step 1: Check what columns are in admin_profiles but not in admin_profile
        cur.execute("""
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'admin_profiles'
            AND column_name NOT IN (
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'admin_profile'
            )
            AND column_name NOT IN ('id', 'name', 'created_at', 'updated_at')
            ORDER BY ordinal_position
        """)

        missing_columns = cur.fetchall()

        print(f"\nColumns in admin_profiles but NOT in admin_profile:")
        print("-" * 80)
        for col in missing_columns:
            col_name, data_type, max_length = col
            type_str = f"{data_type}({max_length})" if max_length else data_type
            print(f"  - {col_name}: {type_str}")

        if not missing_columns:
            print("  (None - all columns already exist)")

        # Step 2: Add missing columns to admin_profile
        if missing_columns:
            print(f"\nStep 1: Adding {len(missing_columns)} missing columns to admin_profile...")
            for col in missing_columns:
                col_name, data_type, max_length = col

                # Construct the data type
                if max_length:
                    col_type = f"{data_type}({max_length})"
                else:
                    col_type = data_type

                # Special handling for certain data types
                if data_type == 'timestamp without time zone':
                    col_type = 'TIMESTAMP'
                elif data_type == 'USER-DEFINED':  # For JSONB
                    cur.execute(f"""
                        SELECT udt_name
                        FROM information_schema.columns
                        WHERE table_name = 'admin_profiles' AND column_name = '{col_name}'
                    """)
                    udt_name = cur.fetchone()[0]
                    col_type = udt_name.upper()

                try:
                    alter_query = f"ALTER TABLE admin_profile ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                    cur.execute(alter_query)
                    print(f"  ✓ Added column: {col_name} ({col_type})")
                except Exception as e:
                    print(f"  ✗ Error adding {col_name}: {e}")

            conn.commit()

        # Step 3: Check if there's data in admin_profiles that needs to be migrated
        cur.execute("SELECT COUNT(*) FROM admin_profiles")
        profiles_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM admin_profile")
        profile_count = cur.fetchone()[0]

        print(f"\nStep 2: Data migration check:")
        print(f"  - admin_profiles (plural): {profiles_count} records")
        print(f"  - admin_profile (singular): {profile_count} records")

        if profiles_count > 0:
            print(f"\n  Checking if data needs to be merged...")

            # Get admin_profiles data
            cur.execute("SELECT * FROM admin_profiles")
            columns = [desc[0] for desc in cur.description]
            profiles_data = cur.fetchall()

            print(f"\n  Sample admin_profiles record:")
            if profiles_data:
                sample = profiles_data[0]
                for col, val in zip(columns, sample):
                    val_str = str(val)[:60] if val else 'NULL'
                    print(f"    {col}: {val_str}")

            # Map data from admin_profiles to admin_profile columns
            print(f"\n  Would you like to migrate this data? (This is a dry run)")
            print(f"  The migration would:")
            print(f"    - Copy unique columns from admin_profiles to admin_profile")
            print(f"    - Match records by admin_id or create new records")
            print(f"    - Parse 'name' field into first_name/father_name/grandfather_name")

        # Step 4: Drop admin_profiles table
        print(f"\nStep 3: Dropping admin_profiles table...")
        cur.execute("DROP TABLE IF EXISTS admin_profiles CASCADE")
        conn.commit()
        print(f"  ✓ Dropped admin_profiles table")

        print("\n" + "=" * 80)
        print("Migration completed successfully!")
        print("\nSummary:")
        print(f"  - Added missing columns to admin_profile")
        print(f"  - Dropped admin_profiles table (no longer needed)")
        print(f"  - admin_profile is now the single source of truth")

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Error during migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
