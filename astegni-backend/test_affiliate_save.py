"""Test script to debug the affiliate tier save endpoint"""
import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

def test_save():
    """Test saving an affiliate tier"""
    try:
        with psycopg.connect(ADMIN_DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Get program_id
                cur.execute("SELECT id FROM affiliate_program LIMIT 1")
                result = cur.fetchone()
                program_id = result[0] if result else 1
                print(f"Program ID: {program_id}")

                # Test data (matching what frontend sends)
                tier_data = {
                    'program_id': program_id,
                    'tier_level': 1,
                    'tier_name': 'level 1',
                    'commission_rate': 10,
                    'duration_months': 24,
                    'is_active': True,
                    'business_type': 'subscription'
                }

                print(f"\nTrying to insert: {tier_data}")

                # Execute the same query as the endpoint
                cur.execute("""
                    INSERT INTO affiliate_tiers (program_id, tier_level, tier_name, commission_rate, duration_months, is_active, business_type)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (program_id, tier_level, business_type) DO UPDATE SET
                        tier_name = EXCLUDED.tier_name,
                        commission_rate = EXCLUDED.commission_rate,
                        duration_months = EXCLUDED.duration_months,
                        is_active = EXCLUDED.is_active,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                """, (
                    tier_data['program_id'],
                    tier_data['tier_level'],
                    tier_data['tier_name'],
                    tier_data['commission_rate'],
                    tier_data['duration_months'],
                    tier_data['is_active'],
                    tier_data['business_type']
                ))

                result = cur.fetchone()
                print(f"\nResult: {dict(zip([desc.name for desc in cur.description], result))}")

                conn.commit()
                print("\n✓ Successfully saved tier!")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_save()
