"""
View courses table with proper UTF-8 encoding
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

def view_courses():
    """View all courses with proper UTF-8 encoding"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM courses ORDER BY id"))
            courses = result.fetchall()

            if not courses:
                print("No courses found in database.")
                return

            print(f"\n{'='*100}")
            print(f"Total Courses: {len(courses)}")
            print(f"{'='*100}\n")

            for course in courses:
                print(f"ID: {course.id}")
                print(f"Title: {course.title}")
                print(f"Icon: {course.icon}")
                print(f"Category: {course.category}")
                print(f"Level: {course.level}")
                print(f"Students: {course.students}")
                print(f"Rating: {course.rating}")
                print(f"Instructor: {course.instructor}")
                print(f"Price: {course.price} {course.currency}")
                print(f"Language: {course.language}")
                print(f"Duration: {course.duration}")
                print(f"Lessons: {course.lessons}")
                print(f"Featured: {course.featured}")
                print(f"Description: {course.description[:100]}..." if len(course.description) > 100 else f"Description: {course.description}")
                print(f"Created: {course.created_at}")
                print("-" * 100)
                print()

    except Exception as e:
        print(f"Error: {e}")
        return

    finally:
        engine.dispose()

if __name__ == "__main__":
    view_courses()
