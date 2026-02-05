"""
Check if scheduled_deletion_at column exists in profile tables
"""
import psycopg

DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def check_columns():
    """Check if scheduled_deletion_at exists in all profile tables"""

    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    profile_tables = [
        'student_profiles',
        'tutor_profiles',
        'parent_profiles',
        'advertiser_profiles',
        'user_profiles'
    ]

    print("=" * 80)
    print("Checking scheduled_deletion_at column in profile tables")
    print("=" * 80)
    print()

    all_exist = True

    for table in profile_tables:
        cursor.execute(f"""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = '{table}'
            AND column_name = 'scheduled_deletion_at'
        """)

        result = cursor.fetchone()
        if result:
            print(f"[OK] {table:25} - scheduled_deletion_at exists")
            print(f"  Type: {result[1]}, Nullable: {result[2]}")
        else:
            print(f"[MISSING] {table:25} - scheduled_deletion_at MISSING")
            all_exist = False
        print()

    print("=" * 80)
    if all_exist:
        print("[OK] All profile tables have scheduled_deletion_at column")
        print("\nThe 90-day grace period system is ready to use!")
    else:
        print("[ERROR] Some tables are missing scheduled_deletion_at column")
        print("\nTo fix this, run:")
        print("  python migrate_add_scheduled_deletion_to_profiles.py")
    print("=" * 80)

    cursor.close()
    conn.close()

if __name__ == "__main__":
    check_columns()
