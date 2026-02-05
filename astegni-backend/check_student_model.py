import sys
sys.path.insert(0, 'app.py modules')

from sqlalchemy import inspect
from models import StudentProfile

mapper = inspect(StudentProfile)
print('StudentProfile columns:')
for col in mapper.columns:
    print(f'  {col.name}')
