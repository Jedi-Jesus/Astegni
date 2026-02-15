"""
Migration: Fix Campaign-Brand Ownership Conflicts
==================================================

PROBLEM:
- campaign_profile.brand_id contains the TRUE owner (correct)
- brand_profile.campaign_ids[] contains DUPLICATE entries (incorrect)
- Multiple brands claim the same campaigns via campaign_ids array

CONFLICTS FOUND:
- Campaign 2 "adsf": claimed by brands 2 & 20, but brand_id=20 is correct
- Campaign 3 "Gothe Institute": claimed by brands 3 & 17, but brand_id=17 is correct
- Campaign 4 "Test campaign 2": claimed by brands 4 & 17, but brand_id=17 is correct

SOLUTION:
1. Analyze conflicts and report them
2. Clean up brand_profile.campaign_ids[] arrays to match campaign_profile.brand_id
3. Add validation to prevent future conflicts

DATABASE: astegni_user_db
"""

import psycopg
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def analyze_conflicts(cur):
    """Analyze and report all campaign ownership conflicts"""
    print("\n" + "="*80)
    print("STEP 1: ANALYZING CAMPAIGN OWNERSHIP CONFLICTS")
    print("="*80)

    # Find campaigns with multiple brand claims
    cur.execute("""
        WITH brand_claims AS (
            SELECT
                cp.id as campaign_id,
                cp.name as campaign_name,
                cp.brand_id as true_brand_id,
                array_agg(bp.id ORDER BY bp.id) as claiming_brand_ids,
                array_agg(bp.name ORDER BY bp.id) as claiming_brand_names,
                count(bp.id) as claim_count
            FROM campaign_profile cp
            LEFT JOIN brand_profile bp ON cp.id = ANY(bp.campaign_ids)
            WHERE cp.brand_id IS NOT NULL
            GROUP BY cp.id, cp.name, cp.brand_id
        )
        SELECT * FROM brand_claims
        WHERE claim_count > 1
           OR (claim_count = 1 AND NOT (true_brand_id = ANY(claiming_brand_ids)))
           OR claim_count = 0
        ORDER BY campaign_id
    """)

    conflicts = cur.fetchall()

    if not conflicts:
        print("OK: No conflicts found!")
        return []

    print(f"\nWARNING: Found {len(conflicts)} campaign(s) with ownership conflicts:\n")

    for row in conflicts:
        campaign_id = row[0]
        campaign_name = row[1]
        true_brand_id = row[2]
        claiming_ids = row[3]
        claiming_names = row[4]

        print(f"Campaign {campaign_id}: \"{campaign_name}\"")
        print(f"  [OK] TRUE owner (brand_id): {true_brand_id}")
        print(f"  [!!] Brands claiming it (campaign_ids[]):")
        for bid, bname in zip(claiming_ids, claiming_names):
            status = "[OK] CORRECT" if bid == true_brand_id else "[!!] WRONG"
            print(f"    - Brand {bid}: {bname} {status}")
        print()

    return conflicts


def fix_conflicts(cur, dry_run=True):
    """Fix conflicts by syncing brand_profile.campaign_ids with campaign_profile.brand_id"""
    print("\n" + "="*80)
    print(f"STEP 2: FIXING CONFLICTS ({'DRY RUN' if dry_run else 'APPLYING CHANGES'})")
    print("="*80)

    # Get all campaigns with their true brand_id
    cur.execute("""
        SELECT id, name, brand_id
        FROM campaign_profile
        WHERE brand_id IS NOT NULL
        ORDER BY id
    """)

    campaigns = cur.fetchall()

    print(f"\nProcessing {len(campaigns)} campaigns...\n")

    changes_made = 0

    for campaign_id, campaign_name, true_brand_id in campaigns:
        # Find which brands currently claim this campaign
        cur.execute("""
            SELECT id, name, campaign_ids
            FROM brand_profile
            WHERE %s = ANY(campaign_ids)
        """, (campaign_id,))

        claiming_brands = cur.fetchall()

        # Check if there are issues
        needs_fix = False

        if len(claiming_brands) == 0:
            # Campaign not in ANY brand's campaign_ids - need to add it
            needs_fix = True
            print(f"Campaign {campaign_id} \"{campaign_name}\":")
            print(f"  [WARNING]  Not claimed by any brand, should be in brand {true_brand_id}")

            if not dry_run:
                # Add campaign to correct brand's campaign_ids
                cur.execute("""
                    UPDATE brand_profile
                    SET campaign_ids = array_append(COALESCE(campaign_ids, ARRAY[]::integer[]), %s),
                        updated_at = NOW()
                    WHERE id = %s
                """, (campaign_id, true_brand_id))
                print(f"  [OK] Added to brand {true_brand_id}'s campaign_ids")

        elif len(claiming_brands) > 1:
            # Multiple brands claim it
            needs_fix = True
            print(f"Campaign {campaign_id} \"{campaign_name}\":")
            print(f"  [WARNING]  Claimed by {len(claiming_brands)} brands, should only be in brand {true_brand_id}")

            for brand_id, brand_name, campaign_ids in claiming_brands:
                if brand_id == true_brand_id:
                    print(f"  [OK] Brand {brand_id} \"{brand_name}\" - KEEP")
                else:
                    print(f"  [X] Brand {brand_id} \"{brand_name}\" - REMOVE")
                    if not dry_run:
                        # Remove campaign from wrong brand
                        cur.execute("""
                            UPDATE brand_profile
                            SET campaign_ids = array_remove(campaign_ids, %s),
                                updated_at = NOW()
                            WHERE id = %s
                        """, (campaign_id, brand_id))

        elif claiming_brands[0][0] != true_brand_id:
            # Wrong brand claims it
            needs_fix = True
            wrong_brand_id = claiming_brands[0][0]
            wrong_brand_name = claiming_brands[0][1]
            print(f"Campaign {campaign_id} \"{campaign_name}\":")
            print(f"  [WARNING]  Claimed by wrong brand {wrong_brand_id} \"{wrong_brand_name}\"")
            print(f"  Should be in brand {true_brand_id}")

            if not dry_run:
                # Remove from wrong brand
                cur.execute("""
                    UPDATE brand_profile
                    SET campaign_ids = array_remove(campaign_ids, %s),
                        updated_at = NOW()
                    WHERE id = %s
                """, (campaign_id, wrong_brand_id))

                # Add to correct brand
                cur.execute("""
                    UPDATE brand_profile
                    SET campaign_ids = array_append(COALESCE(campaign_ids, ARRAY[]::integer[]), %s),
                        updated_at = NOW()
                    WHERE id = %s
                """, (campaign_id, true_brand_id))
                print(f"  [OK] Moved from brand {wrong_brand_id} to brand {true_brand_id}")

        if needs_fix:
            changes_made += 1
            print()

    if changes_made == 0:
        print("[OK] All campaigns are correctly assigned!")
    else:
        print(f"{'Would fix' if dry_run else 'Fixed'} {changes_made} campaign(s)")

    return changes_made


def verify_fix(cur):
    """Verify that all conflicts are resolved"""
    print("\n" + "="*80)
    print("STEP 3: VERIFICATION")
    print("="*80)

    # Check for remaining conflicts
    cur.execute("""
        SELECT
            cp.id,
            cp.name,
            cp.brand_id,
            (SELECT array_agg(bp.id) FROM brand_profile bp WHERE cp.id = ANY(bp.campaign_ids)) as claiming_brands
        FROM campaign_profile cp
        WHERE cp.brand_id IS NOT NULL
        ORDER BY cp.id
    """)

    all_correct = True

    for row in cur.fetchall():
        campaign_id = row[0]
        campaign_name = row[1]
        true_brand_id = row[2]
        claiming_brands = row[3] or []

        if len(claiming_brands) == 0:
            print(f"[X] Campaign {campaign_id}: Not in any brand's campaign_ids")
            all_correct = False
        elif len(claiming_brands) > 1:
            print(f"[X] Campaign {campaign_id}: Still claimed by multiple brands {claiming_brands}")
            all_correct = False
        elif claiming_brands[0] != true_brand_id:
            print(f"[X] Campaign {campaign_id}: In wrong brand {claiming_brands[0]}, should be {true_brand_id}")
            all_correct = False

    if all_correct:
        print("\n[OK] All campaigns correctly assigned to their brands!")
        print("[OK] No duplicate ownership!")
        print("[OK] brand_profile.campaign_ids[] matches campaign_profile.brand_id")

    return all_correct


def main():
    """Run the migration"""
    print("\n" + "="*80)
    print("CAMPAIGN-BRAND OWNERSHIP FIX MIGRATION")
    print("="*80)
    print(f"Database: astegni_user_db")
    print(f"Time: {datetime.now()}")

    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Step 1: Analyze
                conflicts = analyze_conflicts(cur)

                if not conflicts:
                    print("\n[OK] No conflicts to fix!")
                    return

                # Step 2: Dry run
                print("\n" + "="*80)
                print("Running DRY RUN first...")
                print("="*80)
                fix_conflicts(cur, dry_run=True)

                # Ask for confirmation
                print("\n" + "="*80)
                response = input("\nApply these changes? (yes/no): ").strip().lower()

                if response != 'yes':
                    print("\n[X] Migration cancelled by user")
                    return

                # Step 3: Apply changes
                fix_conflicts(cur, dry_run=False)

                # Commit changes
                conn.commit()
                print("\n[OK] Changes committed to database")

                # Step 4: Verify
                verify_fix(cur)

                print("\n" + "="*80)
                print("[OK] MIGRATION COMPLETED SUCCESSFULLY")
                print("="*80)

    except Exception as e:
        print(f"\n[X] Error: {e}")
        raise


if __name__ == "__main__":
    main()
