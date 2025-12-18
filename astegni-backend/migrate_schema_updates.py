"""
Schema Updates Migration
1. Rename student_id/parent_id to inviter_id/invitee_id in parent_invitations table
2. Update courses table: add status fields, remove approved fields
3. Remove requested_courses table
"""
import psycopg
from psycopg.rows import dict_row

USER_DB_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

print("=" * 70)
print("SCHEMA UPDATES MIGRATION")
print("=" * 70)

conn = psycopg.connect(USER_DB_URL, row_factory=dict_row)
cur = conn.cursor()

# ============================================================
# 1. Rename columns in parent_invitations table
# ============================================================
print("\n[1] Updating parent_invitations table...")

try:
    # Check if table exists
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'parent_invitations'
        )
    """)
    if cur.fetchone()['exists']:
        # Check current columns
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'parent_invitations'
        """)
        columns = [row['column_name'] for row in cur.fetchall()]
        print(f"   Current columns: {columns}")

        # Rename student_user_id to inviter_id if exists
        if 'student_user_id' in columns and 'inviter_id' not in columns:
            cur.execute("ALTER TABLE parent_invitations RENAME COLUMN student_user_id TO inviter_id")
            print("   [OK] Renamed student_user_id -> inviter_id")
        elif 'inviter_id' in columns:
            print("   - inviter_id already exists")

        # Rename parent_user_id to invitee_id if exists
        if 'parent_user_id' in columns and 'invitee_id' not in columns:
            cur.execute("ALTER TABLE parent_invitations RENAME COLUMN parent_user_id TO invitee_id")
            print("   [OK] Renamed parent_user_id -> invitee_id")
        elif 'invitee_id' in columns:
            print("   - invitee_id already exists")

        conn.commit()
        print("   [OK] parent_invitations table updated")
    else:
        print("   [SKIP] parent_invitations table does not exist")
except Exception as e:
    print(f"   [ERROR] {e}")
    conn.rollback()

# ============================================================
# 2. Update courses table
# ============================================================
print("\n[2] Updating courses table...")

try:
    # Check if table exists
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'courses'
        )
    """)
    if cur.fetchone()['exists']:
        # Check current columns
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'courses'
        """)
        columns = [row['column_name'] for row in cur.fetchall()]
        print(f"   Current columns: {columns}")

        # Add new status columns if they don't exist
        new_columns = [
            ("status", "VARCHAR(50) DEFAULT 'pending'"),
            ("status_by", "INTEGER"),
            ("status_reason", "TEXT"),
            ("status_at", "TIMESTAMP WITH TIME ZONE")
        ]

        for col_name, col_type in new_columns:
            if col_name not in columns:
                cur.execute(f"ALTER TABLE courses ADD COLUMN {col_name} {col_type}")
                print(f"   [OK] Added column: {col_name}")
            else:
                print(f"   - Column {col_name} already exists")

        # Remove old approved columns if they exist
        old_columns = ['approved_by', 'approved_at']
        for col_name in old_columns:
            if col_name in columns:
                cur.execute(f"ALTER TABLE courses DROP COLUMN {col_name}")
                print(f"   [OK] Dropped column: {col_name}")
            else:
                print(f"   - Column {col_name} doesn't exist (already removed)")

        conn.commit()
        print("   [OK] courses table updated")
    else:
        print("   [SKIP] courses table does not exist")
except Exception as e:
    print(f"   [ERROR] {e}")
    conn.rollback()

# ============================================================
# 3. Remove requested_courses table
# ============================================================
print("\n[3] Removing requested_courses table...")

try:
    cur.execute("DROP TABLE IF EXISTS requested_courses CASCADE")
    conn.commit()
    print("   [OK] requested_courses table dropped (if existed)")
except Exception as e:
    print(f"   [ERROR] {e}")
    conn.rollback()

# ============================================================
# Verify changes
# ============================================================
print("\n" + "=" * 70)
print("VERIFICATION")
print("=" * 70)

# Verify parent_invitations
print("\n[parent_invitations columns]")
try:
    cur.execute("""
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'parent_invitations'
        ORDER BY ordinal_position
    """)
    for row in cur.fetchall():
        print(f"   - {row['column_name']}: {row['data_type']}")
except:
    print("   Table does not exist")

# Verify courses
print("\n[courses columns]")
try:
    cur.execute("""
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'courses'
        ORDER BY ordinal_position
    """)
    for row in cur.fetchall():
        print(f"   - {row['column_name']}: {row['data_type']}")
except:
    print("   Table does not exist")

# Verify requested_courses is gone
print("\n[requested_courses table]")
cur.execute("""
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'requested_courses'
    )
""")
exists = cur.fetchone()['exists']
print(f"   Exists: {exists}")

cur.close()
conn.close()

print("\n" + "=" * 70)
print("MIGRATION COMPLETE!")
print("=" * 70)
