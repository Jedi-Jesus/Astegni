"""
Script to add missing columns to tutor_profiles table
Run this before running init_db.py
"""

import os
import psycopg
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def add_missing_columns():
    """Add missing columns to tutor_profiles table"""
    try:
        # Get database URL
        database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")
        
        # Parse connection string
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
        
        print(f"🔄 Connecting to database {db_name}...")
        
        conn = psycopg.connect(
            dbname=db_name,
            user=user,
            password=password,
            host=host,
            port=port
        )
        cursor = conn.cursor()
        
        print("✅ Connected to database")
        print("\n📝 Adding missing columns to tutor_profiles table...")
        
        # List of columns to add with their SQL definitions
        columns_to_add = [
            ("teaches_at", "VARCHAR(255)", None, "School/University name"),
            ("teaching_methods", "JSONB", "'[]'::jsonb", "Teaching methods array"),
            ("rating_breakdown", "JSONB", "'{\"discipline\": 4.0, \"punctuality\": 4.0, \"communication_skills\": 4.0, \"knowledge_level\": 4.0, \"retention\": 4.0}'::jsonb", "Detailed rating breakdown"),
            ("students_taught", "INTEGER", "0", "Number of students taught"),
            ("response_time", "VARCHAR(50)", "'Within 24 hours'", "Average response time"),
            ("completion_rate", "INTEGER", "85", "Course completion rate percentage")
        ]
        
        # Add each column
        for column_name, data_type, default_value, description in columns_to_add:
            try:
                if default_value:
                    sql = f"ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS {column_name} {data_type} DEFAULT {default_value}"
                else:
                    sql = f"ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS {column_name} {data_type}"
                
                cursor.execute(sql)
                print(f"  ✅ Added column: {column_name} ({description})")
            except Exception as e:
                if "already exists" in str(e):
                    print(f"  ℹ️  Column {column_name} already exists")
                else:
                    print(f"  ❌ Error adding {column_name}: {e}")
        
        # Commit the changes
        conn.commit()
        print("\n✅ All columns added successfully!")
        
        # Verify the columns were added
        print("\n📊 Verifying columns in tutor_profiles table:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'tutor_profiles' 
            AND column_name IN ('teaches_at', 'teaching_methods', 'rating_breakdown', 'students_taught', 'response_time', 'completion_rate')
            ORDER BY column_name
        """)
        
        columns = cursor.fetchall()
        for col in columns:
            print(f"  • {col[0]}: {col[1]} (nullable: {col[2]}, default: {col[3] if col[3] else 'None'})")
        
        # Also check all columns in the table
        print("\n📋 All columns in tutor_profiles table:")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'tutor_profiles'
            ORDER BY ordinal_position
        """)
        
        all_columns = cursor.fetchall()
        for col in all_columns:
            print(f"  • {col[0]}: {col[1]}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "="*50)
        print("✨ Database modification complete!")
        print("You can now run: python init_db.py --clear")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Error modifying database: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main function"""
    print("🚀 Astegni Database Column Addition Script")
    print("=" * 50)
    
    # Test connection first
    try:
        add_missing_columns()
    except Exception as e:
        print(f"\n❌ Failed to add columns: {e}")
        print("\nPlease ensure:")
        print("1. PostgreSQL is running")
        print("2. The database 'astegni_db' exists")
        print("3. Your credentials in .env are correct")

if __name__ == "__main__":
    main()