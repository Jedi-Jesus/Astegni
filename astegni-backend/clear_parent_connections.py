import psycopg2

conn = psycopg2.connect("postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")
cur = conn.cursor()

# Reset student 28 parent_id to empty
cur.execute("UPDATE student_profiles SET parent_id = '{}' WHERE id = 28")

# Reset all parent profiles children_ids and coparent_ids
cur.execute("UPDATE parent_profiles SET children_ids = '{}', coparent_ids = '{}', total_children = 0")

# Delete all parent invitations
cur.execute("DELETE FROM parent_invitations")

conn.commit()

print("Done! Verifying...")
print()

cur.execute("SELECT id, user_id, parent_id FROM student_profiles WHERE id = 28")
row = cur.fetchone()
print(f"Student 28: parent_id = {row[2]}")

cur.execute("SELECT id, user_id, children_ids, coparent_ids FROM parent_profiles")
print("\nParent profiles:")
for row in cur.fetchall():
    print(f"  id={row[0]}, user_id={row[1]}, children_ids={row[2]}, coparent_ids={row[3]}")

cur.execute("SELECT COUNT(*) FROM parent_invitations")
print(f"\nParent invitations count: {cur.fetchone()[0]}")

conn.close()
