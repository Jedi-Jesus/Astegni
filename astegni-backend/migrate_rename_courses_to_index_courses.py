"""
Migration: Rename courses table to index_courses
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Set UTF-8 encoding for console output
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    """Rename courses table to index_courses"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("Renaming 'courses' table to 'index_courses'...")
                conn.execute(text("ALTER TABLE courses RENAME TO index_courses"))

                print("✓ Table renamed successfully")

                # Commit transaction
                trans.commit()
                print("\n✓ Migration completed successfully!")

            except Exception as e:
                trans.rollback()
                print(f"✗ Error during migration: {e}")
                raise

    except Exception as e:
        print(f"✗ Migration failed: {e}")
        return

    finally:
        engine.dispose()

if __name__ == "__main__":
    migrate()
