#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration: Remove subject_type column from tutor_schedules table

This migration removes the subject_type field which is no longer needed.
The subject field now directly stores the subject name (or custom if 'Other').
"""

import psycopg
from dotenv import load_dotenv
import os
import sys

# Force UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    print("=" * 60)
    print("MIGRATION: Remove subject_type from tutor_schedules")
    print("=" * 60)

    try:
        conn = psycopg.connect(DATABASE_URL)
        cur = conn.cursor()

        print("\n1. Checking if subject_type column exists...")
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_schedules'
            AND column_name = 'subject_type'
        """)

        if cur.fetchone():
            print("   ✓ subject_type column found")

            print("\n2. Dropping subject_type column...")
            cur.execute("""
                ALTER TABLE tutor_schedules
                DROP COLUMN IF EXISTS subject_type
            """)

            conn.commit()
            print("   ✓ subject_type column removed successfully")

        else:
            print("   ℹ subject_type column does not exist (already removed)")

        print("\n3. Verifying table structure...")
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'tutor_schedules'
            ORDER BY ordinal_position
        """)

        columns = cur.fetchall()
        print("\n   Current columns in tutor_schedules:")
        for col_name, col_type in columns:
            print(f"   - {col_name}: {col_type}")

        cur.close()
        conn.close()

        print("\n" + "=" * 60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print("\nThe subject_type field has been removed from:")
        print("  ✓ Database: tutor_schedules table")
        print("  ✓ Backend: Pydantic models and all SQL queries")
        print("  ✓ Frontend: Schedule creation/update logic")
        print("\nNOTE: Please restart the backend server for changes to take effect.")

    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        if conn:
            conn.rollback()
        raise

if __name__ == "__main__":
    migrate()
