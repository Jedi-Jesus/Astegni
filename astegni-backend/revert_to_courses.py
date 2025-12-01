"""
Revert: Rename index_courses table back to courses
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

def revert():
    """Rename index_courses table back to courses"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("Renaming 'index_courses' table back to 'courses'...")
                conn.execute(text("ALTER TABLE index_courses RENAME TO courses"))

                print("✓ Table renamed successfully")

                # Commit transaction
                trans.commit()
                print("\n✓ Revert completed successfully!")

            except Exception as e:
                trans.rollback()
                print(f"✗ Error during revert: {e}")
                raise

    except Exception as e:
        print(f"✗ Revert failed: {e}")
        return

    finally:
        engine.dispose()

if __name__ == "__main__":
    revert()
