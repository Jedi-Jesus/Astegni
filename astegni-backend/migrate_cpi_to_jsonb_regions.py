"""
Migration: Convert CPI region exclusion premiums to JSONB for country-agnostic support

This migration:
1. Adds a new `region_exclusion_premiums` JSONB column
2. Migrates existing Ethiopian region data to the new JSONB format
3. Keeps old columns for backward compatibility (can be dropped later)

JSONB Structure:
{
    "ET": {  # Ethiopia (ISO 3166-1 alpha-2)
        "addis-ababa": 1.0,
        "oromia": 1.0,
        "amhara": 1.0,
        ...
    },
    "KE": {  # Kenya
        "nairobi": 1.5,
        "mombasa": 1.0,
        ...
    }
}

Benefits:
- Support any country's regions without schema changes
- Dynamic UI can render regions based on selected country
- Easy to add new countries via admin panel
- No code changes needed for new countries
"""

import psycopg
import json
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv("ADMIN_DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db")

# Country regions configuration
COUNTRY_REGIONS = {
    "ET": {  # Ethiopia
        "name": "Ethiopia",
        "currency": "ETB",
        "regions": [
            {"id": "addis-ababa", "name": "Addis Ababa", "icon": "fa-city"},
            {"id": "oromia", "name": "Oromia", "icon": "fa-mountain"},
            {"id": "amhara", "name": "Amhara", "icon": "fa-landmark"},
            {"id": "tigray", "name": "Tigray", "icon": "fa-monument"},
            {"id": "snnpr", "name": "SNNPR", "icon": "fa-tree"},
            {"id": "somali", "name": "Somali", "icon": "fa-sun"},
            {"id": "afar", "name": "Afar", "icon": "fa-temperature-high"},
            {"id": "benishangul-gumuz", "name": "Benishangul-Gumuz", "icon": "fa-water"},
            {"id": "gambela", "name": "Gambela", "icon": "fa-leaf"},
            {"id": "harari", "name": "Harari", "icon": "fa-mosque"},
            {"id": "dire-dawa", "name": "Dire Dawa", "icon": "fa-train"},
            {"id": "sidama", "name": "Sidama", "icon": "fa-coffee"}
        ]
    },
    "KE": {  # Kenya
        "name": "Kenya",
        "currency": "KES",
        "regions": [
            {"id": "nairobi", "name": "Nairobi", "icon": "fa-city"},
            {"id": "mombasa", "name": "Mombasa", "icon": "fa-anchor"},
            {"id": "kisumu", "name": "Kisumu", "icon": "fa-water"},
            {"id": "nakuru", "name": "Nakuru", "icon": "fa-mountain"},
            {"id": "eldoret", "name": "Eldoret", "icon": "fa-running"},
            {"id": "central", "name": "Central", "icon": "fa-map-marker"},
            {"id": "coast", "name": "Coast", "icon": "fa-umbrella-beach"},
            {"id": "eastern", "name": "Eastern", "icon": "fa-sun"},
            {"id": "western", "name": "Western", "icon": "fa-tree"},
            {"id": "rift-valley", "name": "Rift Valley", "icon": "fa-mountain"}
        ]
    },
    "NG": {  # Nigeria
        "name": "Nigeria",
        "currency": "NGN",
        "regions": [
            {"id": "lagos", "name": "Lagos", "icon": "fa-city"},
            {"id": "abuja", "name": "Abuja (FCT)", "icon": "fa-landmark"},
            {"id": "kano", "name": "Kano", "icon": "fa-mosque"},
            {"id": "rivers", "name": "Rivers", "icon": "fa-water"},
            {"id": "oyo", "name": "Oyo", "icon": "fa-university"},
            {"id": "kaduna", "name": "Kaduna", "icon": "fa-industry"},
            {"id": "delta", "name": "Delta", "icon": "fa-oil-can"},
            {"id": "anambra", "name": "Anambra", "icon": "fa-store"},
            {"id": "enugu", "name": "Enugu", "icon": "fa-gem"},
            {"id": "imo", "name": "Imo", "icon": "fa-leaf"}
        ]
    },
    "GH": {  # Ghana
        "name": "Ghana",
        "currency": "GHS",
        "regions": [
            {"id": "greater-accra", "name": "Greater Accra", "icon": "fa-city"},
            {"id": "ashanti", "name": "Ashanti", "icon": "fa-crown"},
            {"id": "western", "name": "Western", "icon": "fa-anchor"},
            {"id": "eastern", "name": "Eastern", "icon": "fa-mountain"},
            {"id": "central", "name": "Central", "icon": "fa-landmark"},
            {"id": "northern", "name": "Northern", "icon": "fa-sun"},
            {"id": "volta", "name": "Volta", "icon": "fa-water"},
            {"id": "brong-ahafo", "name": "Brong-Ahafo", "icon": "fa-tree"}
        ]
    },
    "ZA": {  # South Africa
        "name": "South Africa",
        "currency": "ZAR",
        "regions": [
            {"id": "gauteng", "name": "Gauteng", "icon": "fa-city"},
            {"id": "western-cape", "name": "Western Cape", "icon": "fa-mountain"},
            {"id": "kwazulu-natal", "name": "KwaZulu-Natal", "icon": "fa-umbrella-beach"},
            {"id": "eastern-cape", "name": "Eastern Cape", "icon": "fa-water"},
            {"id": "limpopo", "name": "Limpopo", "icon": "fa-tree"},
            {"id": "mpumalanga", "name": "Mpumalanga", "icon": "fa-leaf"},
            {"id": "north-west", "name": "North West", "icon": "fa-sun"},
            {"id": "free-state", "name": "Free State", "icon": "fa-wheat"},
            {"id": "northern-cape", "name": "Northern Cape", "icon": "fa-gem"}
        ]
    }
}

def run_migration():
    print("Starting CPI JSONB regions migration...")
    print("=" * 50)

    conn = None
    try:
        conn = psycopg.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        # Step 1: Add JSONB column for region exclusion premiums
        print("\n1. Adding region_exclusion_premiums JSONB column...")
        try:
            cursor.execute("""
                ALTER TABLE cpi_settings
                ADD COLUMN IF NOT EXISTS region_exclusion_premiums JSONB DEFAULT '{}'
            """)
            print("   Added region_exclusion_premiums JSONB column")
        except Exception as e:
            print(f"   Column may already exist: {e}")

        # Step 2: Add country_regions configuration column
        print("\n2. Adding country_regions configuration JSONB column...")
        try:
            cursor.execute("""
                ALTER TABLE cpi_settings
                ADD COLUMN IF NOT EXISTS country_regions JSONB DEFAULT '{}'
            """)
            print("   Added country_regions JSONB column")
        except Exception as e:
            print(f"   Column may already exist: {e}")

        # Step 3: Migrate existing Ethiopian region data to JSONB
        print("\n3. Migrating existing Ethiopian region data to JSONB...")
        cursor.execute("""
            SELECT id,
                   addis_premium, oromia_premium, amhara_premium, tigray_premium,
                   snnpr_premium, somali_premium, afar_premium, benishangul_premium,
                   gambela_premium, harari_premium, diredawa_premium, sidama_premium
            FROM cpi_settings
            WHERE is_active = TRUE
            LIMIT 1
        """)

        row = cursor.fetchone()

        if row:
            setting_id = row[0]

            # Build Ethiopian region premiums from existing columns
            ethiopian_premiums = {
                "addis-ababa": float(row[1]) if row[1] else 0,
                "oromia": float(row[2]) if row[2] else 0,
                "amhara": float(row[3]) if row[3] else 0,
                "tigray": float(row[4]) if row[4] else 0,
                "snnpr": float(row[5]) if row[5] else 0,
                "somali": float(row[6]) if row[6] else 0,
                "afar": float(row[7]) if row[7] else 0,
                "benishangul-gumuz": float(row[8]) if row[8] else 0,
                "gambela": float(row[9]) if row[9] else 0,
                "harari": float(row[10]) if row[10] else 0,
                "dire-dawa": float(row[11]) if row[11] else 0,
                "sidama": float(row[12]) if row[12] else 0
            }

            # Create the full JSONB structure with Ethiopia data
            region_premiums_json = {
                "ET": ethiopian_premiums
            }

            # Update the JSONB column
            cursor.execute("""
                UPDATE cpi_settings
                SET region_exclusion_premiums = %s,
                    country_regions = %s
                WHERE id = %s
            """, (json.dumps(region_premiums_json), json.dumps(COUNTRY_REGIONS), setting_id))

            print(f"   Migrated Ethiopian data to JSONB for setting ID {setting_id}")
            print(f"   Ethiopian premiums: {ethiopian_premiums}")
        else:
            # Insert default settings with JSONB
            print("   No existing settings found, creating defaults...")

            default_premiums = {
                "ET": {region["id"]: 1.0 for region in COUNTRY_REGIONS["ET"]["regions"]}
            }

            cursor.execute("""
                INSERT INTO cpi_settings (
                    base_rate, currency, is_active,
                    region_exclusion_premiums, country_regions
                ) VALUES (0.05, 'ETB', TRUE, %s, %s)
            """, (json.dumps(default_premiums), json.dumps(COUNTRY_REGIONS)))

            print("   Created default CPI settings with JSONB regions")

        conn.commit()
        print("\n" + "=" * 50)
        print("Migration completed successfully!")

        # Show final structure
        print("\n4. Verifying migration...")
        cursor.execute("""
            SELECT region_exclusion_premiums, country_regions
            FROM cpi_settings
            WHERE is_active = TRUE
            LIMIT 1
        """)

        result = cursor.fetchone()
        if result:
            print(f"\n   Region Exclusion Premiums (sample):")
            premiums = result[0] if result[0] else {}
            for country, regions in premiums.items():
                print(f"   - {country}: {len(regions)} regions configured")

            print(f"\n   Country Regions Configuration:")
            countries = result[1] if result[1] else {}
            for code, data in countries.items():
                region_count = len(data.get('regions', []))
                print(f"   - {code} ({data.get('name', 'Unknown')}): {region_count} regions")

    except Exception as e:
        print(f"\nMigration failed: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    run_migration()
