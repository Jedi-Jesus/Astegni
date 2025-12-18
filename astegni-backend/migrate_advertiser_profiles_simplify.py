"""
Migration: Simplify advertiser_profiles table
Removes unnecessary columns and adds new array/jsonb fields
"""

import psycopg2
from psycopg2.extras import Json

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'database': 'astegni_user_db',
    'user': 'astegni_user',
    'password': 'Astegni2025'
}

def migrate():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        print("Starting advertiser_profiles table migration...")

        # Step 1: Add new columns if they don't exist
        print("Adding new columns...")

        # Add socials as JSONB
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'advertiser_profiles' AND column_name = 'socials') THEN
                    ALTER TABLE advertiser_profiles ADD COLUMN socials JSONB DEFAULT '{}';
                END IF;
            END $$;
        """)

        # Add hero_title as TEXT[] array
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'advertiser_profiles' AND column_name = 'hero_title') THEN
                    ALTER TABLE advertiser_profiles ADD COLUMN hero_title TEXT[] DEFAULT '{}';
                END IF;
            END $$;
        """)

        # Add hero_subtitle as TEXT[] array
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'advertiser_profiles' AND column_name = 'hero_subtitle') THEN
                    ALTER TABLE advertiser_profiles ADD COLUMN hero_subtitle TEXT[] DEFAULT '{}';
                END IF;
            END $$;
        """)

        # Add joined_in (will use created_at data)
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'advertiser_profiles' AND column_name = 'joined_in') THEN
                    ALTER TABLE advertiser_profiles ADD COLUMN joined_in DATE;
                END IF;
            END $$;
        """)

        # Change location to TEXT[] array
        cur.execute("""
            DO $$
            BEGIN
                -- Check if location is not already an array type
                IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'advertiser_profiles'
                    AND column_name = 'location'
                    AND data_type = 'character varying') THEN

                    -- Create temp column
                    ALTER TABLE advertiser_profiles ADD COLUMN location_temp TEXT[];

                    -- Migrate data (wrap existing location in array)
                    UPDATE advertiser_profiles
                    SET location_temp = ARRAY[location]::TEXT[]
                    WHERE location IS NOT NULL AND location != '';

                    -- Drop old column
                    ALTER TABLE advertiser_profiles DROP COLUMN location;

                    -- Rename temp to location
                    ALTER TABLE advertiser_profiles RENAME COLUMN location_temp TO location;

                    -- Set default
                    ALTER TABLE advertiser_profiles ALTER COLUMN location SET DEFAULT '{}';
                END IF;
            END $$;
        """)

        conn.commit()
        print("New columns added successfully!")

        # Step 2: Migrate existing data
        print("Migrating existing data...")

        # Copy created_at to joined_in
        cur.execute("""
            UPDATE advertiser_profiles
            SET joined_in = created_at::DATE
            WHERE joined_in IS NULL AND created_at IS NOT NULL;
        """)

        # Migrate website to socials JSON if website exists
        cur.execute("""
            UPDATE advertiser_profiles
            SET socials = jsonb_build_object('website', website)
            WHERE website IS NOT NULL AND website != '' AND (socials IS NULL OR socials = '{}');
        """)

        conn.commit()
        print("Data migration complete!")

        # Step 3: Drop unnecessary columns
        print("Dropping unnecessary columns...")

        columns_to_drop = [
            'company_name',
            'website',
            'industry',
            'company_size',
            'logo',
            'total_campaigns',
            'active_campaigns',
            'total_impressions',
            'total_clicks',
            'total_conversions',
            'total_likes',
            'total_followers',
            'total_spent',
            'average_ctr',
            'average_conversion_rate',
            'success_rate',
            'rating',
            'rating_count',
            'is_basic',
            'profile_complete',
            'profile_completion',
            'total_budget',
            'available_budget',
            'currency',
            'created_at',
            'updated_at',
            'brand_ids'
        ]

        for col in columns_to_drop:
            try:
                cur.execute(f"""
                    DO $$
                    BEGIN
                        IF EXISTS (SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'advertiser_profiles' AND column_name = '{col}') THEN
                            ALTER TABLE advertiser_profiles DROP COLUMN {col};
                        END IF;
                    END $$;
                """)
                print(f"  Dropped column: {col}")
            except Exception as e:
                print(f"  Warning dropping {col}: {e}")
                conn.rollback()

        conn.commit()
        print("Columns dropped successfully!")

        # Step 4: Verify final structure
        print("\nFinal table structure:")
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'advertiser_profiles'
            ORDER BY ordinal_position;
        """)

        for row in cur.fetchall():
            print(f"  {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")

        print("\n✅ Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
