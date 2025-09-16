# seed_videos.py - Fixed version checking actual schema
from app import app, get_db
from sqlalchemy import text
from datetime import datetime
import random

def check_schema():
    """Check the actual schema of tutor_profiles and video_reels"""
    db = next(get_db())
    
    try:
        # Check tutor_profiles columns
        print("📋 Checking tutor_profiles columns:")
        result = db.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tutor_profiles'
            ORDER BY ordinal_position
        """)).fetchall()
        
        tutor_columns = {}
        for col_name, data_type in result:
            tutor_columns[col_name] = data_type
            print(f"  - {col_name}: {data_type}")
        
        # Check existing tutor profiles
        print("\n📋 Existing tutor profiles:")
        profiles = db.execute(text("""
            SELECT user_id, bio FROM tutor_profiles LIMIT 5
        """)).fetchall()
        
        for user_id, bio in profiles:
            print(f"  - User ID {user_id}: {bio[:50]}...")
        
        return tutor_columns, len(profiles)
        
    except Exception as e:
        print(f"Error checking schema: {e}")
        return {}, 0
    finally:
        db.close()

def create_or_get_tutor_profile():
    """Create a tutor profile or get existing one"""
    db = next(get_db())
    
    try:
        # First check if we have any tutor profiles
        result = db.execute(text("""
            SELECT user_id FROM tutor_profiles LIMIT 1
        """)).first()
        
        if result:
            print(f"✅ Found existing tutor profile with user_id: {result[0]}")
            return result[0]
        
        # If not, create one for any user with tutor role
        user_result = db.execute(text("""
            SELECT id FROM users 
            WHERE roles::text LIKE '%tutor%' 
            AND id NOT IN (SELECT user_id FROM tutor_profiles)
            LIMIT 1
        """)).first()
        
        if not user_result:
            # Just get any user
            user_result = db.execute(text("""
                SELECT id FROM users LIMIT 1
            """)).first()
        
        if user_result:
            user_id = user_result[0]
            
            # Get actual columns in tutor_profiles
            cols_result = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'tutor_profiles'
                AND column_name NOT IN ('created_at', 'updated_at')
            """)).fetchall()
            
            columns = [row[0] for row in cols_result]
            
            # Build minimal insert with only required fields
            if 'bio' in columns:
                db.execute(text("""
                    INSERT INTO tutor_profiles (user_id, bio)
                    VALUES (:user_id, :bio)
                """), {
                    'user_id': user_id,
                    'bio': 'Experienced tutor'
                })
            else:
                # Just user_id
                db.execute(text("""
                    INSERT INTO tutor_profiles (user_id)
                    VALUES (:user_id)
                """), {'user_id': user_id})
            
            db.commit()
            print(f"✅ Created tutor profile for user_id: {user_id}")
            return user_id
            
        return None
        
    except Exception as e:
        print(f"❌ Error with tutor profile: {e}")
        db.rollback()
        return None
    finally:
        db.close()

def seed_videos(count=60):
    """Seed videos using existing tutor profiles"""
    db = next(get_db())
    
    try:
        # Get or create a valid tutor profile
        tutor_id = create_or_get_tutor_profile()
        
        if not tutor_id:
            print("❌ Could not find or create tutor profile")
            return
        
        print(f"\n🎬 Seeding {count} videos with tutor_id: {tutor_id}")
        
        # Sample data
        subjects = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "History"]
        grade_levels = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"]
        
        for i in range(count):
            subject = subjects[i % len(subjects)]
            grade = grade_levels[i % len(grade_levels)]
            
            video_data = {
                'tutor_id': tutor_id,
                'title': f'{subject} Tutorial - Lesson {i+1}',
                'description': f'Educational video for {grade} - {subject}. Part {i+1} of our series.',
                'video_url': f'/uploads/videos/sample_{i+1}.mp4',
                'thumbnail_url': f'https://picsum.photos/seed/vid{i+1}/400/300',
                'duration': random.randint(300, 1800),
                'category': 'Educational',
                'subject': subject,
                'grade_level': grade,
                'tags': None,
                'views': random.randint(100, 10000),
                'likes': random.randint(10, 1000),
                'dislikes': random.randint(0, 50),
                'shares': random.randint(0, 200),
                'saves': random.randint(0, 300),
                'is_active': True,
                'is_featured': (i % 10 == 0),
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
            
            db.execute(text("""
                INSERT INTO video_reels 
                (tutor_id, title, description, video_url, thumbnail_url, duration,
                 category, subject, grade_level, tags, views, likes, dislikes,
                 shares, saves, is_active, is_featured, created_at, updated_at)
                VALUES 
                (:tutor_id, :title, :description, :video_url, :thumbnail_url, :duration,
                 :category, :subject, :grade_level, :tags, :views, :likes, :dislikes,
                 :shares, :saves, :is_active, :is_featured, :created_at, :updated_at)
            """), video_data)
            
            if (i + 1) % 10 == 0:
                print(f"  ✅ Added {i + 1} videos...")
        
        db.commit()
        print(f"\n🎉 Successfully seeded {count} videos!")
        
        # Verify
        total = db.execute(text("SELECT COUNT(*) FROM video_reels")).scalar()
        print(f"📊 Total videos in database: {total}")
        
    except Exception as e:
        print(f"❌ Error seeding videos: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🌱 Video Seeding Script\n")
    print("=" * 50)
    
    # Step 1: Check schema
    columns, profile_count = check_schema()
    
    print(f"\n📊 Found {profile_count} existing tutor profiles")
    print("=" * 50)
    
    # Step 2: Seed videos
    seed_videos(60)