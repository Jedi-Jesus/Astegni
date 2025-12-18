"""
Check advertiser tables structure in astegni_db
"""
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db'
)

def check_tables():
    print(f"Connecting to: {DATABASE_URL}")
    print("=" * 60)

    try:
        with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                # Check if brand_profile table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_schema = 'public'
                        AND table_name = 'brand_profile'
                    )
                """)
                brand_exists = cur.fetchone()['exists']
                print(f"brand_profile table exists: {brand_exists}")

                # Check if campaign_profile table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_schema = 'public'
                        AND table_name = 'campaign_profile'
                    )
                """)
                campaign_exists = cur.fetchone()['exists']
                print(f"campaign_profile table exists: {campaign_exists}")

                print("\n" + "=" * 60)
                print("ALL TABLES IN DATABASE:")
                print("=" * 60)

                cur.execute("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """)
                tables = cur.fetchall()
                for t in tables:
                    print(f"  - {t['table_name']}")

                # If brand_profile exists, show its structure
                if brand_exists:
                    print("\n" + "=" * 60)
                    print("brand_profile TABLE STRUCTURE:")
                    print("=" * 60)
                    cur.execute("""
                        SELECT column_name, data_type, is_nullable, column_default
                        FROM information_schema.columns
                        WHERE table_name = 'brand_profile'
                        ORDER BY ordinal_position
                    """)
                    columns = cur.fetchall()
                    for col in columns:
                        print(f"  {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']})")

                # If campaign_profile exists, show its structure
                if campaign_exists:
                    print("\n" + "=" * 60)
                    print("campaign_profile TABLE STRUCTURE:")
                    print("=" * 60)
                    cur.execute("""
                        SELECT column_name, data_type, is_nullable, column_default
                        FROM information_schema.columns
                        WHERE table_name = 'campaign_profile'
                        ORDER BY ordinal_position
                    """)
                    columns = cur.fetchall()
                    for col in columns:
                        print(f"  {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']})")

                # Check for any advertiser-related tables
                print("\n" + "=" * 60)
                print("ADVERTISER-RELATED TABLES:")
                print("=" * 60)
                cur.execute("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND (table_name LIKE '%brand%'
                         OR table_name LIKE '%campaign%'
                         OR table_name LIKE '%advertiser%')
                    ORDER BY table_name
                """)
                adv_tables = cur.fetchall()
                if adv_tables:
                    for t in adv_tables:
                        print(f"  - {t['table_name']}")
                else:
                    print("  No advertiser-related tables found")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_tables()
