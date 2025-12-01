"""
Migration Script: Remove Redundant Fields from tutor_profiles Table
Removes fields that are no longer needed or are duplicated elsewhere
"""

import os
import sys
from dotenv import load_dotenv
import psycopg

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

    # Parse connection string
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")

    # Remove query parameters (e.g., ?sslmode=disable)
    if "?" in database_url:
        database_url = database_url.split("?")[0]

    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_name = host_db.split("/")

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    return psycopg.connect(
        dbname=db_name,
        user=user,
        password=password,
        host=host,
        port=port
    )

def main():
    """Main migration function"""
    print("Migration: Remove Redundant Fields from tutor_profiles Table")
    print("=" * 70)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # List of fields to remove
        fields_to_remove = [
            'certifications',
            'achievements',
            'price',
            'currency',
            'availability',
            'rating',
            'rating_count',
            'rating_breakdown',
            'total_students',
            'total_sessions',
            'profile_complete',
            'profile_completion',
            'intro_video_url',
            'portfolio_urls',
            'date_of_birth',
            'students_taught',
            'response_time',
            'completion_rate',
            'retention_score',
            'discipline_score',
            'punctuality_score',
            'subject_matter_score',
            'communication_score',
            'current_students',
            'success_rate',
            'monthly_earnings',
            'total_hours_taught',
            'response_time_hours',
            'sessions_this_week',
            'hours_this_week',
            'attendance_rate',
            'teaching_streak_days',
            'weekly_goal_progress',
            'total_connections',
            'total_colleagues'
        ]

        print(f"\nFields to remove: {len(fields_to_remove)}")
        print("-" * 70)

        # Check which fields actually exist in the table
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
            AND column_name = ANY(%s)
        """, (fields_to_remove,))

        existing_fields = [row[0] for row in cursor.fetchall()]

        if not existing_fields:
            print("No fields to remove - all fields already removed or never existed")
            cursor.close()
            conn.close()
            return

        print(f"Found {len(existing_fields)} existing fields to remove")

        # Remove each field
        removed_count = 0
        failed_fields = []

        for field in existing_fields:
            try:
                print(f"\nRemoving column: {field}")
                cursor.execute(f"ALTER TABLE tutor_profiles DROP COLUMN IF EXISTS {field}")
                conn.commit()
                print(f"   Removed: {field}")
                removed_count += 1
            except Exception as e:
                print(f"   Failed to remove {field}: {e}")
                failed_fields.append(field)
                conn.rollback()

        print("\n" + "=" * 70)
        print(f"Migration Complete!")
        print(f"   - Successfully removed: {removed_count} fields")

        if failed_fields:
            print(f"   - Failed to remove: {len(failed_fields)} fields")
            print(f"     Failed fields: {', '.join(failed_fields)}")

        # Show remaining columns
        print("\nRemaining columns in tutor_profiles table:")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
            ORDER BY ordinal_position
        """)

        remaining_columns = cursor.fetchall()
        for col_name, col_type in remaining_columns:
            print(f"   - {col_name} ({col_type})")

        print(f"\nTotal remaining columns: {len(remaining_columns)}")

        cursor.close()
        conn.close()

        print("\n" + "=" * 70)
        print("Migration completed successfully!")
        print("\nIMPORTANT: Update the SQLAlchemy model in app.py modules/models.py")
        print("Remove these fields from the TutorProfile class definition")

    except Exception as e:
        print(f"\nMigration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
