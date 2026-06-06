"""
Migration: Add verification-escalation fields to company_profile.

When a company's KYC verification has been pending for more than 2 business days,
the advertiser can "notify admins" from the verification-in-progress modal. That
sets these flags so the company surfaces as escalated in manage-companies.

- verification_escalated:    advertiser pressed "Notify admins" while pending
- verification_escalated_at: when they pressed it

The rejection / suspension REASON reuses the existing verification_notes column
(written by admin reject/suspend, cleared by verify/restore/reinstate), so no
new reason column is added here.
"""

import psycopg2

DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"


def run_migration():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        print("Starting migration: Add company escalation fields...")

        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'company_profile'
        """)
        existing_columns = [row[0] for row in cur.fetchall()]

        new_columns = [
            ("verification_escalated", "BOOLEAN DEFAULT FALSE"),
            ("verification_escalated_at", "TIMESTAMP"),
        ]

        columns_added = 0
        for column_name, column_type in new_columns:
            if column_name not in existing_columns:
                cur.execute(f"ALTER TABLE company_profile ADD COLUMN {column_name} {column_type}")
                print(f"  [OK] Added column: {column_name} ({column_type})")
                columns_added += 1
            else:
                print(f"  [SKIP] Column already exists: {column_name}")

        conn.commit()
        print(f"\n[OK] Migration completed! Added {columns_added} new columns.")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
