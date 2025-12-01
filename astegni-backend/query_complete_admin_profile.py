"""
Query complete admin profile (joining admin_profile + admin_profile_stats)
"""
import psycopg
from dotenv import load_dotenv
import os
import json
import sys
import io

# Force UTF-8 output encoding for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

def query_complete_admin():
    """Query complete admin profile with stats"""
    try:
        with psycopg.connect(DATABASE_URL, client_encoding='utf8') as conn:
            with conn.cursor() as cur:
                print("="*80)
                print("COMPLETE ADMIN PROFILE")
                print("="*80)

                # Query joined data
                cur.execute("""
                    SELECT
                        ap.id as profile_id,
                        ap.admin_id,
                        ap.first_name,
                        ap.father_name,
                        ap.grandfather_name,
                        ap.admin_username,
                        ap.quote,
                        ap.bio,
                        ap.phone_number,
                        ap.email,
                        ap.department,
                        ap.profile_picture_url,
                        ap.cover_picture_url,
                        aps.access_level,
                        aps.responsibilities,
                        aps.employee_id,
                        aps.last_login,
                        aps.joined_date,
                        aps.rating,
                        aps.total_reviews,
                        aps.badges,
                        aps.total_actions,
                        aps.courses_managed,
                        aps.tutors_verified,
                        aps.reviews_moderated,
                        ap.created_at,
                        ap.updated_at
                    FROM admin_profile ap
                    LEFT JOIN admin_profile_stats aps ON ap.admin_id = aps.admin_id
                    ORDER BY ap.id
                """)

                rows = cur.fetchall()
                colnames = [desc[0] for desc in cur.description]

                if not rows:
                    print("\nNo admin profiles found.")
                    return

                for row in rows:
                    print("\n" + "-"*80)

                    # Personal Information Section
                    print("PERSONAL INFORMATION")
                    print("-"*80)
                    print(f"Full Name (Ethiopian): {row[2]} {row[3]} {row[4]}")  # first + father + grandfather
                    print(f"Username            : {row[5]}")
                    print(f"Email               : {row[9] or 'Not provided'}")
                    print(f"Phone               : {row[8] or 'Not provided'}")
                    print(f"Quote               : {row[6]}")
                    print(f"Bio                 : {row[7]}")
                    print(f"Profile Picture     : {row[11] or 'Not set'}")
                    print(f"Cover Picture       : {row[12] or 'Not set'}")

                    # Administrative Information Section
                    print("\n" + "-"*80)
                    print("ADMINISTRATIVE INFORMATION")
                    print("-"*80)
                    print(f"Department          : {row[10]}")
                    print(f"Access Level        : {row[13]}")
                    print(f"Responsibilities    : {row[14]}")
                    print(f"Employee ID         : {row[15]}")
                    print(f"Joined Date         : {row[17]}")
                    print(f"Last Login          : {row[16] or 'Never'}")

                    # Statistics Section
                    print("\n" + "-"*80)
                    print("STATISTICS")
                    print("-"*80)
                    print(f"Rating              : {row[18]} ⭐ ({row[19]} reviews)")
                    print(f"Total Actions       : {row[21]}")
                    print(f"Courses Managed     : {row[22]}")
                    print(f"Tutors Verified     : {row[23]}")
                    print(f"Reviews Moderated   : {row[24]}")

                    # Badges Section
                    if row[20]:  # badges
                        print("\n" + "-"*80)
                        print("BADGES")
                        print("-"*80)
                        badges = row[20]
                        for badge in badges:
                            print(f"  • {badge['text']} [{badge['class']}]")

                    # Timestamps
                    print("\n" + "-"*80)
                    print("TIMESTAMPS")
                    print("-"*80)
                    print(f"Created             : {row[25]}")
                    print(f"Updated             : {row[26]}")

                    print("-"*80)

                print("\n" + "="*80)
                print(f"Total Admin Profiles: {len(rows)}")
                print("="*80)

    except Exception as e:
        print(f"Error querying admin profiles: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    query_complete_admin()
