"""Quick verification script for tutor tables"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
url = os.getenv('DATABASE_URL').replace('postgresql://', 'postgresql+psycopg://')
engine = create_engine(url)

with engine.connect() as conn:
    students = conn.execute(text('SELECT COUNT(*) FROM tutor_students')).scalar()
    analysis = conn.execute(text('SELECT COUNT(*) FROM tutor_analysis')).scalar()
    resources = conn.execute(text('SELECT COUNT(*) FROM tutor_resources')).scalar()

    print('\nTutor Tables Data Summary:')
    print('=' * 60)
    print(f'  tutor_students: {students} records')
    print(f'  tutor_analysis: {analysis} records')
    print(f'  tutor_resources: {resources} records')
    print('=' * 60)

    # Sample data from each table
    print('\nSample from tutor_students:')
    result = conn.execute(text('SELECT id, tutor_id, student_id, student_type, status FROM tutor_students LIMIT 3'))
    for row in result:
        print(f'  ID: {row[0]}, Tutor: {row[1]}, Student: {row[2]}, Type: {row[3]}, Status: {row[4]}')

    print('\nSample from tutor_analysis:')
    result = conn.execute(text('SELECT tutor_id, total_students, success_rate, average_rating FROM tutor_analysis LIMIT 3'))
    for row in result:
        print(f'  Tutor: {row[0]}, Students: {row[1]}, Success Rate: {row[2]}%, Rating: {row[3]}')

    print('\nSample from tutor_resources:')
    result = conn.execute(text('SELECT id, tutor_id, title, resource_type FROM tutor_resources LIMIT 3'))
    for row in result:
        print(f'  ID: {row[0]}, Tutor: {row[1]}, Title: {row[2]}, Type: {row[3]}')

    print()
