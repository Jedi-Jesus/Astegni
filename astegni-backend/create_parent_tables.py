"""
Migration script to create parent_profiles and child_profiles tables
Run this script to add parent/child functionality to the database
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import after path is set
from sqlalchemy import create_engine, text, inspect

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

def create_parent_tables():
    """Create parent_profiles and child_profiles tables"""

    print("=" * 60)
    print("MIGRATION: Create Parent and Child Profile Tables")
    print("=" * 60)

    # Create engine
    engine = create_engine(DATABASE_URL)

    try:
        # Check if tables already exist
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()

        print(f"\n📋 Existing tables: {len(existing_tables)}")

        if 'parent_profiles' in existing_tables:
            print("⚠️  parent_profiles table already exists!")
            response = input("Do you want to recreate it? This will DELETE all parent data! (yes/no): ")
            if response.lower() != 'yes':
                print("❌ Migration cancelled.")
                return

            with engine.connect() as conn:
                # Drop child_profiles first (foreign key dependency)
                print("\n🗑️  Dropping child_profiles table...")
                conn.execute(text("DROP TABLE IF EXISTS child_profiles CASCADE"))
                conn.commit()

                # Drop parent_profiles
                print("🗑️  Dropping parent_profiles table...")
                conn.execute(text("DROP TABLE IF EXISTS parent_profiles CASCADE"))
                conn.commit()

        # Create parent_profiles table
        print("\n✅ Creating parent_profiles table...")
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE parent_profiles (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                    -- Basic Info
                    username VARCHAR UNIQUE,
                    bio TEXT,
                    quote TEXT,
                    relationship_type VARCHAR DEFAULT 'Parent',

                    -- Contact & Location
                    location VARCHAR,
                    education_focus VARCHAR,

                    -- Children Statistics
                    total_children INTEGER DEFAULT 0,
                    active_children INTEGER DEFAULT 0,

                    -- Engagement Metrics
                    total_sessions_booked INTEGER DEFAULT 0,
                    total_amount_spent FLOAT DEFAULT 0.0,
                    currency VARCHAR DEFAULT 'ETB',

                    -- Ratings & Reviews
                    rating FLOAT DEFAULT 0.0,
                    rating_count INTEGER DEFAULT 0,

                    -- Status & Verification
                    is_verified BOOLEAN DEFAULT FALSE,
                    is_active BOOLEAN DEFAULT TRUE,
                    profile_complete BOOLEAN DEFAULT FALSE,
                    profile_completion FLOAT DEFAULT 0.0,

                    -- Media
                    profile_picture VARCHAR,
                    cover_image VARCHAR,

                    -- Timestamps
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()
            print("   ✓ parent_profiles table created")

        # Create child_profiles table
        print("\n✅ Creating child_profiles table...")
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE child_profiles (
                    id SERIAL PRIMARY KEY,
                    parent_id INTEGER NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,

                    -- Basic Info
                    name VARCHAR NOT NULL,
                    date_of_birth DATE,
                    gender VARCHAR,
                    grade INTEGER,

                    -- Academic Info
                    school_name VARCHAR,
                    courses JSON DEFAULT '[]',
                    progress FLOAT DEFAULT 0.0,

                    -- Tutor Assignment
                    current_tutor_id INTEGER REFERENCES tutor_profiles(id),
                    next_session TIMESTAMP,

                    -- Learning Stats
                    total_sessions INTEGER DEFAULT 0,
                    completed_sessions INTEGER DEFAULT 0,
                    total_hours FLOAT DEFAULT 0.0,
                    attendance_rate FLOAT DEFAULT 0.0,

                    -- Media
                    profile_picture VARCHAR,

                    -- Status
                    is_active BOOLEAN DEFAULT TRUE,

                    -- Timestamps
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()
            print("   ✓ child_profiles table created")

        # Create indexes
        print("\n✅ Creating indexes...")
        with engine.connect() as conn:
            conn.execute(text("CREATE INDEX idx_parent_user_id ON parent_profiles(user_id)"))
            conn.execute(text("CREATE INDEX idx_parent_username ON parent_profiles(username)"))
            conn.execute(text("CREATE INDEX idx_child_parent_id ON child_profiles(parent_id)"))
            conn.commit()
            print("   ✓ Indexes created")

        # Create trigger for updated_at
        print("\n✅ Creating update triggers...")
        with engine.connect() as conn:
            # Parent profiles trigger
            conn.execute(text("""
                CREATE OR REPLACE FUNCTION update_parent_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql
            """))

            conn.execute(text("""
                CREATE TRIGGER parent_updated_at_trigger
                BEFORE UPDATE ON parent_profiles
                FOR EACH ROW
                EXECUTE FUNCTION update_parent_updated_at()
            """))

            # Child profiles trigger
            conn.execute(text("""
                CREATE OR REPLACE FUNCTION update_child_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql
            """))

            conn.execute(text("""
                CREATE TRIGGER child_updated_at_trigger
                BEFORE UPDATE ON child_profiles
                FOR EACH ROW
                EXECUTE FUNCTION update_child_updated_at()
            """))

            conn.commit()
            print("   ✓ Update triggers created")

        print("\n" + "=" * 60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\n📊 Tables created:")
        print("   • parent_profiles")
        print("   • child_profiles")
        print("\n🔗 Relationships:")
        print("   • parent_profiles → users (user_id)")
        print("   • child_profiles → parent_profiles (parent_id)")
        print("   • child_profiles → tutor_profiles (current_tutor_id)")
        print("\n" + "=" * 60)

    except Exception as e:
        print(f"\n❌ ERROR during migration:")
        print(f"   {str(e)}")
        print("\n💡 Troubleshooting:")
        print("   1. Make sure PostgreSQL is running")
        print("   2. Check DATABASE_URL in .env file")
        print("   3. Ensure you have proper database permissions")
        return False

    return True

if __name__ == "__main__":
    print("\n🚀 Starting Parent Profile Tables Migration...\n")
    success = create_parent_tables()

    if success:
        print("\n✅ You can now:")
        print("   1. Start the backend server: python app.py")
        print("   2. Test parent profile endpoints")
        print("   3. Register children and manage profiles")
    else:
        print("\n❌ Migration failed. Please fix the errors and try again.")
        sys.exit(1)
