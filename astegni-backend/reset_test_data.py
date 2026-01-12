"""
Reset test data for parent/coparent invitations testing.
This script:
1. Deletes all parent_invitations
2. Resets parent_profiles (children_ids, coparent_ids, total_children)
3. Resets student_profiles (parent_id)
"""
import psycopg2

conn = psycopg2.connect("postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")
cur = conn.cursor()

print("=== RESETTING TEST DATA ===")

# Delete all parent invitations
cur.execute("DELETE FROM parent_invitations")
print(f"Deleted all parent_invitations")

# Reset parent_profiles
cur.execute("UPDATE parent_profiles SET children_ids = '{}', coparent_ids = '{}', total_children = 0")
print(f"Reset all parent_profiles (children_ids, coparent_ids, total_children)")

# Reset student_profiles
cur.execute("UPDATE student_profiles SET parent_id = '{}'")
print(f"Reset all student_profiles (parent_id)")

conn.commit()
print("\n=== DONE ===")

# Verify the reset
print("\n=== VERIFICATION ===")
cur.execute("SELECT COUNT(*) FROM parent_invitations")
print(f"parent_invitations count: {cur.fetchone()[0]}")

cur.execute("SELECT id, user_id, children_ids, coparent_ids, total_children FROM parent_profiles")
print("\nparent_profiles:")
for row in cur.fetchall():
    print(f"  id={row[0]}, user_id={row[1]}, children_ids={row[2]}, coparent_ids={row[3]}, total={row[4]}")

cur.execute("SELECT id, user_id, parent_id FROM student_profiles WHERE user_id IN (115, 141, 143)")
print("\nstudent_profiles (key users):")
for row in cur.fetchall():
    print(f"  id={row[0]}, user_id={row[1]}, parent_id={row[2]}")

conn.close()
