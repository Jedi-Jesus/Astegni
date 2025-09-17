# Fixed script to tag existing videos as ads
import psycopg
import json
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

def tag_videos_as_ads():
    """Tag sample videos as ads for the reels page"""
    
    # Database connection
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
    
    print("🏷️ Tagging videos as Ads...")
    
    # First, let's check the current state
    cursor.execute("SELECT COUNT(*) FROM video_reels WHERE is_active = true")
    total_videos = cursor.fetchone()[0]
    print(f"📊 Found {total_videos} active videos")
    
    # Method 1: Tag all existing videos as Ads (for testing)
    # Using proper JSON casting for PostgreSQL
    cursor.execute("""
        UPDATE video_reels 
        SET tags = CASE 
            WHEN tags IS NULL THEN '["Ad"]'::json
            WHEN NOT (tags::text LIKE '%"Ad"%') THEN 
                (COALESCE(tags::text, '[]')::jsonb || '["Ad"]'::jsonb)::json
            ELSE tags
        END,
        is_featured = true
        WHERE is_active = true
    """)
    
    conn.commit()
    
    # Get statistics
    cursor.execute("""
        SELECT COUNT(*) FROM video_reels 
        WHERE tags::text LIKE '%Ad%' OR is_featured = true
    """)
    ad_count = cursor.fetchone()[0]
    
    print(f"✅ Tagged {ad_count} out of {total_videos} videos as Ads")
    
    # Show sample of tagged videos
    cursor.execute("""
        SELECT id, title, tags, is_featured 
        FROM video_reels 
        WHERE tags::text LIKE '%Ad%' OR is_featured = true
        LIMIT 5
    """)
    
    print("\n📋 Sample of Ad-tagged videos:")
    for row in cursor.fetchall():
        print(f"  ID: {row[0]}, Title: {row[1]}, Tags: {row[2]}, Featured: {row[3]}")
    
    cursor.close()
    conn.close()
    print("\n✨ Done! Videos are now tagged for display on reels page.")

if __name__ == "__main__":
    tag_videos_as_ads()