"""
Test imports from app.py modules
"""
import sys
import os

# Add the current directory to the path
sys.path.insert(0, os.path.dirname(__file__))

# Change to the 'app.py modules' directory for imports
modules_dir = os.path.join(os.path.dirname(__file__), "app.py modules")
sys.path.insert(0, modules_dir)

try:
    print("Testing models import...")
    from models import TutorProfile, User, StudentProfile
    print(f"  [OK] Successfully imported TutorProfile: {TutorProfile}")
    print(f"  [OK] Successfully imported User: {User}")
    print(f"  [OK] Successfully imported StudentProfile: {StudentProfile}")
except ImportError as e:
    print(f"  [FAIL] Failed to import models: {e}")

try:
    print("\nTesting utils import...")
    from utils import get_db, get_current_user
    print(f"  [OK]Successfully imported get_db: {get_db}")
    print(f"  [OK]Successfully imported get_current_user: {get_current_user}")
except ImportError as e:
    print(f"  [FAIL]Failed to import utils: {e}")

try:
    print("\nTesting config import...")
    from config import DATABASE_URL
    print(f"  [OK]Successfully imported DATABASE_URL")
except ImportError as e:
    print(f"  [FAIL]Failed to import config: {e}")