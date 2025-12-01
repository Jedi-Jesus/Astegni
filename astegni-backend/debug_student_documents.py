"""
STUDENT DOCUMENTS DEBUG SCRIPT - TERMINAL
Run this in the backend directory to check database and API
"""

import psycopg
from dotenv import load_dotenv
import os
import json
from datetime import datetime
import sys

# Fix encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

print("STUDENT DOCUMENTS DEBUG SCRIPT")
print("=" * 60)

try:
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    # ============================================
    # 1. CHECK TABLE EXISTS
    # ============================================
    print("\n📋 1. TABLE CHECK:")
    print("-" * 60)

    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'student_documents'
    """)
    result = cur.fetchone()

    if result:
        print(f"✅ Table 'student_documents' exists")
    else:
        print(f"❌ Table 'student_documents' NOT FOUND!")
        exit(1)

    # ============================================
    # 2. CHECK TABLE SCHEMA
    # ============================================
    print("\n📋 2. TABLE SCHEMA:")
    print("-" * 60)

    cur.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'student_documents'
        ORDER BY ordinal_position
    """)

    columns = cur.fetchall()
    print(f"Total columns: {len(columns)}\n")
    for col in columns:
        print(f"  - {col[0]:<25} {col[1]:<20} Nullable: {col[2]}")

    # ============================================
    # 3. CHECK DATA COUNT
    # ============================================
    print("\n📋 3. DATA COUNT:")
    print("-" * 60)

    cur.execute("SELECT COUNT(*) FROM student_documents")
    total_count = cur.fetchone()[0]
    print(f"Total documents: {total_count}")

    cur.execute("""
        SELECT document_type, COUNT(*)
        FROM student_documents
        GROUP BY document_type
        ORDER BY document_type
    """)
    type_counts = cur.fetchall()
    print(f"\nBy document type:")
    for type_name, count in type_counts:
        print(f"  - {type_name}: {count}")

    # ============================================
    # 4. CHECK ALL DOCUMENTS
    # ============================================
    print("\n📋 4. ALL DOCUMENTS:")
    print("-" * 60)

    cur.execute("""
        SELECT
            id,
            student_id,
            document_type,
            title,
            description,
            issued_by,
            date_of_issue,
            document_url,
            file_name,
            created_at
        FROM student_documents
        ORDER BY created_at DESC
    """)

    documents = cur.fetchall()

    if not documents:
        print("⚠️  No documents found in database!")
    else:
        for doc in documents:
            print(f"\nDocument ID: {doc[0]}")
            print(f"  Student ID: {doc[1]}")
            print(f"  Type: {doc[2]}")
            print(f"  Title: {doc[3]}")
            print(f"  Description: {doc[4][:50] + '...' if doc[4] and len(doc[4]) > 50 else doc[4]}")
            print(f"  Issued By: {doc[5]}")
            print(f"  Date of Issue: {doc[6]}")
            print(f"  Document URL: {doc[7][:50] + '...' if doc[7] and len(doc[7]) > 50 else doc[7]}")
            print(f"  File Name: {doc[8]}")
            print(f"  Created At: {doc[9]}")

    # ============================================
    # 5. CHECK USERS TABLE
    # ============================================
    print("\n\n📋 5. USERS CHECK (to match student_id):")
    print("-" * 60)

    cur.execute("""
        SELECT id, first_name, father_name, email, roles, active_role
        FROM users
        ORDER BY id
        LIMIT 10
    """)

    users = cur.fetchall()
    print(f"First 10 users:\n")
    for user in users:
        roles = user[4] if isinstance(user[4], list) else json.loads(user[4]) if user[4] else []
        print(f"  ID: {user[0]:<5} Name: {user[1]} {user[2]:<20} Email: {user[3]:<30} Roles: {roles} Active: {user[5]}")

    # ============================================
    # 6. CHECK STUDENT_PROFILES TABLE
    # ============================================
    print("\n\n📋 6. STUDENT_PROFILES CHECK:")
    print("-" * 60)

    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name = 'student_profiles'")
    if cur.fetchone():
        cur.execute("""
            SELECT id, user_id, grade_level, bio
            FROM student_profiles
            ORDER BY id
            LIMIT 10
        """)

        profiles = cur.fetchall()
        print(f"First 10 student profiles:\n")
        for profile in profiles:
            print(f"  Profile ID: {profile[0]:<5} User ID: {profile[1]:<5} Grade: {profile[2]:<15} Bio: {profile[3][:30] + '...' if profile[3] else 'N/A'}")
    else:
        print("⚠️  student_profiles table not found")

    # ============================================
    # 7. MATCH DOCUMENTS TO USERS
    # ============================================
    print("\n\n📋 7. DOCUMENT-USER MATCH:")
    print("-" * 60)

    cur.execute("""
        SELECT
            sd.id,
            sd.student_id,
            u.first_name,
            u.father_name,
            u.email,
            sd.document_type,
            sd.title
        FROM student_documents sd
        JOIN users u ON sd.student_id = u.id
        ORDER BY sd.created_at DESC
    """)

    matches = cur.fetchall()

    if not matches:
        print("⚠️  No documents with matching users found!")
    else:
        print(f"Found {len(matches)} document(s) with user info:\n")
        for match in matches:
            print(f"  Doc ID: {match[0]}")
            print(f"    Student ID: {match[1]}")
            print(f"    Student Name: {match[2]} {match[3]}")
            print(f"    Student Email: {match[4]}")
            print(f"    Document Type: {match[5]}")
            print(f"    Document Title: {match[6]}")
            print()

    # ============================================
    # 8. TEST API RESPONSE FORMAT
    # ============================================
    print("\n📋 8. API RESPONSE SIMULATION:")
    print("-" * 60)

    cur.execute("""
        SELECT
            id,
            student_id,
            document_type,
            title,
            description,
            issued_by,
            date_of_issue,
            expiry_date,
            document_url,
            file_name,
            file_type,
            file_size,
            created_at,
            updated_at,
            verification_status,
            is_verified,
            is_featured
        FROM student_documents
        WHERE document_type = 'achievement'
        LIMIT 1
    """)

    sample_doc = cur.fetchone()

    if sample_doc:
        print("Sample document as it would be returned by API:\n")

        doc_dict = {
            'id': sample_doc[0],
            'student_id': sample_doc[1],
            'document_type': sample_doc[2],
            'title': sample_doc[3],
            'description': sample_doc[4],
            'issued_by': sample_doc[5],
            'date_of_issue': str(sample_doc[6]) if sample_doc[6] else None,
            'expiry_date': str(sample_doc[7]) if sample_doc[7] else None,
            'document_url': sample_doc[8],
            'file_name': sample_doc[9],
            'file_type': sample_doc[10],
            'file_size': sample_doc[11],
            'created_at': str(sample_doc[12]) if sample_doc[12] else None,
            'updated_at': str(sample_doc[13]) if sample_doc[13] else None,
            'verification_status': sample_doc[14],
            'is_verified': sample_doc[15],
            'is_featured': sample_doc[16]
        }

        print(json.dumps(doc_dict, indent=2))
    else:
        print("⚠️  No achievement documents found to simulate")

    # ============================================
    # 9. SUMMARY
    # ============================================
    print("\n\n📋 9. SUMMARY:")
    print("=" * 60)

    print(f"\n✅ Database connection: OK")
    print(f"✅ Table exists: YES")
    print(f"✅ Total documents: {total_count}")

    if total_count > 0:
        print(f"✅ Documents have data: YES")
        if matches:
            print(f"✅ Documents linked to users: YES ({len(matches)} documents)")
        else:
            print(f"⚠️  Documents linked to users: NO - student_id may not match any user!")
    else:
        print(f"❌ NO DOCUMENTS IN DATABASE!")
        print(f"\n   To add sample data, run:")
        print(f"   python seed_student_documents.py")

    print("\n" + "=" * 60)

    cur.close()
    conn.close()

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
