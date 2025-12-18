"""
Migration Script: Link Advertisers -> Brands -> Campaigns

This script populates the relationship arrays:
- advertiser_profiles.brand_ids[] - contains IDs of brands owned by the advertiser
- brand_profile.campaign_ids[] - contains IDs of campaigns under the brand

Relationship Logic:
- Match advertisers to brands by company_name similarity
- Distribute campaigns across brands evenly
"""

import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')

def migrate_relationships():
    print("=" * 60)
    print("MIGRATING ADVERTISER -> BRAND -> CAMPAIGN RELATIONSHIPS")
    print("=" * 60)

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            # Get all advertisers
            cur.execute("SELECT id, company_name FROM advertiser_profiles ORDER BY id")
            advertisers = cur.fetchall()
            print(f"\nFound {len(advertisers)} advertisers")

            # Get all brands
            cur.execute("SELECT id, name FROM brand_profile ORDER BY id")
            brands = cur.fetchall()
            print(f"Found {len(brands)} brands")

            # Get all campaigns
            cur.execute("SELECT id, name FROM campaign_profile ORDER BY id")
            campaigns = cur.fetchall()
            print(f"Found {len(campaigns)} campaigns")

            if not advertisers or not brands or not campaigns:
                print("\nError: Need at least one advertiser, brand, and campaign to create relationships")
                return

            # Step 1: Assign brands to advertisers
            print("\n" + "-" * 40)
            print("STEP 1: Linking Brands to Advertisers")
            print("-" * 40)

            # Try to match by name first, then distribute remaining
            brand_to_advertiser = {}
            used_brands = set()

            # First pass: Match by similar names
            for adv in advertisers:
                adv_name_lower = adv['company_name'].lower() if adv['company_name'] else ''
                for brand in brands:
                    brand_name_lower = brand['name'].lower()
                    # Check if names match or are similar
                    if (brand_name_lower in adv_name_lower or
                        adv_name_lower in brand_name_lower or
                        any(word in brand_name_lower for word in adv_name_lower.split() if len(word) > 3)):
                        if brand['id'] not in used_brands:
                            brand_to_advertiser[brand['id']] = adv['id']
                            used_brands.add(brand['id'])
                            print(f"  Matched: Brand '{brand['name']}' -> Advertiser '{adv['company_name']}'")
                            break

            # Second pass: Distribute remaining brands evenly
            remaining_brands = [b for b in brands if b['id'] not in used_brands]
            if remaining_brands:
                print(f"\n  Distributing {len(remaining_brands)} remaining brands...")
                for i, brand in enumerate(remaining_brands):
                    adv = advertisers[i % len(advertisers)]
                    brand_to_advertiser[brand['id']] = adv['id']
                    print(f"  Assigned: Brand '{brand['name']}' -> Advertiser '{adv['company_name']}'")

            # Build advertiser -> brand_ids mapping
            advertiser_brands = {}
            for brand_id, adv_id in brand_to_advertiser.items():
                if adv_id not in advertiser_brands:
                    advertiser_brands[adv_id] = []
                advertiser_brands[adv_id].append(brand_id)

            # Update advertiser_profiles with brand_ids
            print("\n  Updating advertiser_profiles.brand_ids...")
            for adv_id, brand_ids in advertiser_brands.items():
                cur.execute("""
                    UPDATE advertiser_profiles
                    SET brand_ids = %s
                    WHERE id = %s
                """, (brand_ids, adv_id))
                print(f"    Advertiser {adv_id}: brand_ids = {brand_ids}")

            # Step 2: Assign campaigns to brands
            print("\n" + "-" * 40)
            print("STEP 2: Linking Campaigns to Brands")
            print("-" * 40)

            # Distribute campaigns evenly across brands
            brand_campaigns = {b['id']: [] for b in brands}
            for i, campaign in enumerate(campaigns):
                brand = brands[i % len(brands)]
                brand_campaigns[brand['id']].append(campaign['id'])
                print(f"  Assigned: Campaign '{campaign['name']}' -> Brand '{brand['name']}'")

            # Update brand_profile with campaign_ids
            print("\n  Updating brand_profile.campaign_ids...")
            for brand_id, campaign_ids in brand_campaigns.items():
                if campaign_ids:  # Only update if there are campaigns
                    cur.execute("""
                        UPDATE brand_profile
                        SET campaign_ids = %s
                        WHERE id = %s
                    """, (campaign_ids, brand_id))
                    brand_name = next(b['name'] for b in brands if b['id'] == brand_id)
                    print(f"    Brand '{brand_name}' (ID {brand_id}): campaign_ids = {campaign_ids}")

            # Commit changes
            conn.commit()
            print("\n" + "=" * 60)
            print("MIGRATION COMPLETE!")
            print("=" * 60)

            # Verify the changes
            print("\n" + "-" * 40)
            print("VERIFICATION")
            print("-" * 40)

            # Check advertiser -> brands
            cur.execute("""
                SELECT ap.id, ap.company_name, ap.brand_ids,
                       array_agg(bp.name) as brand_names
                FROM advertiser_profiles ap
                LEFT JOIN brand_profile bp ON bp.id = ANY(ap.brand_ids)
                WHERE ap.brand_ids IS NOT NULL AND array_length(ap.brand_ids, 1) > 0
                GROUP BY ap.id, ap.company_name, ap.brand_ids
                ORDER BY ap.id
                LIMIT 10
            """)
            print("\nAdvertisers with Brands:")
            for row in cur.fetchall():
                print(f"  {row['company_name']}: {row['brand_names']}")

            # Check brands -> campaigns
            cur.execute("""
                SELECT bp.id, bp.name, bp.campaign_ids,
                       array_agg(cp.name) as campaign_names
                FROM brand_profile bp
                LEFT JOIN campaign_profile cp ON cp.id = ANY(bp.campaign_ids)
                WHERE bp.campaign_ids IS NOT NULL AND array_length(bp.campaign_ids, 1) > 0
                GROUP BY bp.id, bp.name, bp.campaign_ids
                ORDER BY bp.id
            """)
            print("\nBrands with Campaigns:")
            for row in cur.fetchall():
                print(f"  {row['name']}: {row['campaign_names']}")

            # Test the join that the frontend uses
            print("\n" + "-" * 40)
            print("TESTING FRONTEND JOIN QUERY")
            print("-" * 40)
            cur.execute("""
                SELECT cp.id, cp.name as campaign_name, bp.name as brand_name
                FROM campaign_profile cp
                LEFT JOIN brand_profile bp ON cp.id = ANY(bp.campaign_ids)
                ORDER BY cp.id
            """)
            print("\nCampaigns with Brand Names (what frontend will see):")
            for row in cur.fetchall():
                campaign_name = row['campaign_name']
                brand_name = row['brand_name']
                print(f"  Campaign: {campaign_name} -> Brand: {brand_name}")


if __name__ == "__main__":
    migrate_relationships()
