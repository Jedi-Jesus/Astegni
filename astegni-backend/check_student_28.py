import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Check student_profile ID 28
cur.execute('SELECT id, user_id, grade_level, location, studying_at FROM student_profiles WHERE id = 28')
profile = cur.fetchone()

print('STUDENT_PROFILE ID 28:')
if profile:
    print(f'  Profile ID: {profile[0]}')
    print(f'  User ID: {profile[1]}')
    print(f'  Grade Level: {profile[2]}')
    print(f'  Subjects: {profile[3]}')
    print(f'  Location: {profile[4]}')

    # Get linked user
    cur.execute('SELECT id, first_name, father_name, email, roles, active_role FROM users WHERE id = %s', (profile[1],))
    user = cur.fetchone()

    if user:
        print(f'\n  Linked User:')
        print(f'    User ID: {user[0]}')
        print(f'    Name: {user[1]} {user[2]}')
        print(f'    Email: {user[3]}')
        print(f'    Roles: {user[4]}')
        print(f'    Active Role: {user[5]}')
else:
    print('  NOT FOUND')

# Check the document
print('\n\nDOCUMENT FOR STUDENT_PROFILE ID 28:')
cur.execute('SELECT id, student_id, document_type, title, date_of_issue FROM student_documents WHERE student_id = 28')
doc = cur.fetchone()
if doc:
    print(f'  Document ID: {doc[0]}')
    print(f'  Student Profile ID: {doc[1]}')
    print(f'  Type: {doc[2]}')
    print(f'  Title: {doc[3]}')
    print(f'  Date: {doc[4]}')
else:
    print('  No documents found')

cur.close()
conn.close()
