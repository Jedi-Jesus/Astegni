"""
Quick script to fix existing tutor data
Run this to clean up your current data without re-seeding
"""

import os
import random
import json
from dotenv import load_dotenv
import psycopg

# Load environment variables
load_dotenv()

# Ethiopian schools
ETHIOPIAN_SCHOOLS = [
    "Addis Ababa University",
    "Ethiopian Civil Service University",
    "St. Mary's University",
    "Unity University",
    "Rift Valley University",
    "Hawassa University",
    "Jimma University",
    "Bahir Dar University",
    "St. Joseph School, Addis Ababa",
    "Lycée Guebre-Mariam, Addis Ababa",
    "Sandford International School",
    "School of Tomorrow, Addis Ababa",
    "Nazareth School, Addis Ababa"
]

def fix_tutor_data():
    """Fix existing tutor data"""
    try:
        # Get database connection
        database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "")
        
        auth, host_db = database_url.split("@")
        user, password = auth.split(":")
        host_port, db_name = host_db.split("/")
        
        if ":" in host_port:
            host, port = host_port.split(":")
        else:
            host = host_port
            port = "5432"
        
        conn = psycopg.connect(
            dbname=db_name,
            user=user,
            password=password,
            host=host,
            port=port
        )
        cursor = conn.cursor()
        
        print("🔧 Fixing existing tutor data...")
        
        # 1. Fix NULL learning_method
        cursor.execute("""
            UPDATE tutor_profiles 
            SET learning_method = CASE 
                WHEN random() < 0.33 THEN 'In-Person'
                WHEN random() < 0.66 THEN 'Online'
                ELSE 'Hybrid'
            END
            WHERE learning_method IS NULL OR learning_method = 'null'
        """)
        print("  ✅ Fixed learning methods")
        
        # 2. Remove school names from bio
        cursor.execute("""
            UPDATE tutor_profiles 
            SET bio = TRIM(SPLIT_PART(bio, 'Currently teaching at', 1))
            WHERE bio LIKE '%Currently teaching at%'
        """)
        print("  ✅ Cleaned bio text")
        
        # 3. Set teaches_at for tutors that don't have it
        cursor.execute("SELECT id FROM tutor_profiles WHERE teaches_at IS NULL OR teaches_at = ''")
        tutor_ids = cursor.fetchall()
        
        for (tutor_id,) in tutor_ids:
            school = random.choice(ETHIOPIAN_SCHOOLS)
            cursor.execute(
                "UPDATE tutor_profiles SET teaches_at = %s WHERE id = %s",
                (school, tutor_id)
            )
        print(f"  ✅ Set teaches_at for {len(tutor_ids)} tutors")
        
        # 4. Ensure all required fields have values
        cursor.execute("""
            UPDATE tutor_profiles 
            SET 
                gender = CASE 
                    WHEN random() < 0.5 THEN 'Male' 
                    ELSE 'Female'
                END
            WHERE gender IS NULL OR gender = 'Not specified'
        """)
        print("  ✅ Set gender for tutors")
        
        # 5. Fix course_type to be either 'academic' or 'certifications'
        cursor.execute("""
            UPDATE tutor_profiles 
            SET course_type = CASE 
                WHEN courses::text LIKE '%Programming%' 
                    OR courses::text LIKE '%Video Editing%'
                    OR courses::text LIKE '%Web Development%'
                THEN 'certifications'
                ELSE 'academic'
            END
            WHERE course_type IS NULL
        """)
        print("  ✅ Fixed course types")
        
        conn.commit()
        
        # Verify the fixes
        print("\n📊 Verification:")
        
        cursor.execute("SELECT COUNT(*) FROM tutor_profiles WHERE learning_method IS NOT NULL")
        count = cursor.fetchone()[0]
        print(f"  • Tutors with learning_method: {count}")
        
        cursor.execute("SELECT COUNT(*) FROM tutor_profiles WHERE teaches_at IS NOT NULL")
        count = cursor.fetchone()[0]
        print(f"  • Tutors with teaches_at: {count}")
        
        cursor.execute("SELECT COUNT(*) FROM tutor_profiles WHERE bio NOT LIKE '%Currently teaching at%'")
        count = cursor.fetchone()[0]
        print(f"  • Tutors with clean bio: {count}")
        
        # Show sample data
        print("\n📋 Sample tutor data:")
        cursor.execute("""
            SELECT 
                teaches_at, 
                learning_method,
                SUBSTRING(bio, 1, 50) as bio_preview
            FROM tutor_profiles 
            LIMIT 3
        """)
        
        for row in cursor.fetchall():
            print(f"\n  Teaches at: {row[0]}")
            print(f"  Method: {row[1]}")
            print(f"  Bio: {row[2]}...")
        
        cursor.close()
        conn.close()
        
        print("\n✨ Data fixed successfully!")
        print("Restart your backend server: uvicorn app:app --reload")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_tutor_data()