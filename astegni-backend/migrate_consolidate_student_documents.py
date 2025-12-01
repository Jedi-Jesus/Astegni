"""
Consolidate student_achievements, student_certifications, and student_extracurricular_activities
into a single student_documents table with document_type field.
"""

import psycopg
from datetime import datetime
import os
import sys
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

def migrate():
    try:
        # Connect to PostgreSQL
        conn = psycopg.connect(DATABASE_URL)
        cur = conn.cursor()

        print("=" * 60)
        print("STUDENT DOCUMENTS TABLE CONSOLIDATION")
        print("=" * 60)

        # Step 1: Drop old tables if they exist
        print("\n[1/3] Dropping old tables...")
        old_tables = [
            'student_achievements',
            'student_certifications',
            'student_extracurricular_activities'
        ]

        for table in old_tables:
            try:
                cur.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
                print(f"  ✓ Dropped {table}")
            except Exception as e:
                print(f"  ⚠ Warning dropping {table}: {e}")

        conn.commit()

        # Step 2: Create new student_documents table
        print("\n[2/3] Creating student_documents table...")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS student_documents (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('achievement', 'academics', 'extracurricular')),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                issued_by VARCHAR(255),
                date_of_issue DATE,
                expiry_date DATE,
                document_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
                is_verified BOOLEAN DEFAULT FALSE,
                verified_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
                rejection_reason TEXT,
                rejected_at TIMESTAMP,
                is_featured BOOLEAN DEFAULT FALSE
            )
        """)

        print("  ✓ Created student_documents table with schema:")
        print("    - id, student_id, document_type, title, description")
        print("    - issued_by, date_of_issue, expiry_date, document_url")
        print("    - created_at, updated_at")
        print("    - verification_status, is_verified, verified_by_admin_id")
        print("    - rejection_reason, rejected_at, is_featured")

        conn.commit()

        # Step 3: Create indexes for performance
        print("\n[3/3] Creating indexes...")

        indexes = [
            ("idx_student_documents_student_id", "student_id"),
            ("idx_student_documents_type", "document_type"),
            ("idx_student_documents_status", "verification_status"),
            ("idx_student_documents_featured", "is_featured")
        ]

        for index_name, column in indexes:
            try:
                cur.execute(f"""
                    CREATE INDEX IF NOT EXISTS {index_name}
                    ON student_documents({column})
                """)
                print(f"  ✓ Created index: {index_name}")
            except Exception as e:
                print(f"  ⚠ Warning creating index {index_name}: {e}")

        conn.commit()

        # Verify table structure
        print("\n" + "=" * 60)
        print("VERIFICATION")
        print("=" * 60)

        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'student_documents'
            ORDER BY ordinal_position
        """)

        columns = cur.fetchall()
        print(f"\n✓ Table 'student_documents' created successfully with {len(columns)} columns:")
        for col in columns:
            nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
            default = f" DEFAULT {col[3]}" if col[3] else ""
            print(f"  - {col[0]}: {col[1]} ({nullable}){default}")

        # Count rows
        cur.execute("SELECT COUNT(*) FROM student_documents")
        count = cur.fetchone()[0]
        print(f"\n✓ Current rows in student_documents: {count}")

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Run backend: cd astegni-backend && python app.py")
        print("2. Open student-profile.html and test document upload")
        print("3. Documents will be categorized by document_type:")
        print("   - 'achievement' for achievements")
        print("   - 'academics' for academic certificates")
        print("   - 'extracurricular' for extracurricular activities")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        raise

if __name__ == "__main__":
    migrate()
