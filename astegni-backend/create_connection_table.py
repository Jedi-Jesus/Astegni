# Save this as create_connection_table.py and run it

import psycopg
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def create_connection_table():
    """Create the tutor_connections table for the new connection system"""
    
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
    
    print("🔄 Creating connection system tables...")
    
    # Drop old follow table if exists
    cursor.execute("DROP TABLE IF EXISTS tutor_follows CASCADE")
    print("✅ Removed old follow system")
    
    # Create new connections table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tutor_connections (
            id SERIAL PRIMARY KEY,
            student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            tutor_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
            status VARCHAR(50) DEFAULT 'pending',
            initiated_by INTEGER REFERENCES users(id),
            connection_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            accepted_at TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, tutor_id)
        )
    """)
    
    print("✅ Created tutor_connections table")
    
    # Create indexes for performance
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_connections_student ON tutor_connections(student_id);
        CREATE INDEX IF NOT EXISTS idx_connections_tutor ON tutor_connections(tutor_id);
        CREATE INDEX IF NOT EXISTS idx_connections_status ON tutor_connections(status);
    """)
    
    print("✅ Created indexes")
    
    # Clear any default engagements (ensure no videos are liked/saved by default)
    cursor.execute("""
        DELETE FROM video_engagements 
        WHERE created_at < '2025-01-01'::timestamp
    """)
    print("✅ Cleared any default engagements")
    
    # Reset engagement counters to actual counts
    cursor.execute("""
        UPDATE video_reels vr
        SET 
            likes = COALESCE((
                SELECT COUNT(*) 
                FROM video_engagements ve 
                WHERE ve.video_id = vr.id AND ve.engagement_type = 'like'
            ), 0),
            dislikes = COALESCE((
                SELECT COUNT(*) 
                FROM video_engagements ve 
                WHERE ve.video_id = vr.id AND ve.engagement_type = 'dislike'
            ), 0),
            saves = COALESCE((
                SELECT COUNT(*) 
                FROM video_engagements ve 
                WHERE ve.video_id = vr.id AND ve.engagement_type = 'save'
            ), 0)
    """)
    print("✅ Reset engagement counters to actual values")
    
    conn.commit()
    
    # Show statistics
    cursor.execute("SELECT COUNT(*) FROM tutor_connections")
    connection_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM video_engagements")
    engagement_count = cursor.fetchone()[0]
    
    print(f"\n📊 Statistics:")
    print(f"  - Connections: {connection_count}")
    print(f"  - Video engagements: {engagement_count}")
    
    cursor.close()
    conn.close()
    print("\n✨ Connection system setup complete!")

if __name__ == "__main__":
    create_connection_table()