import psycopg2

conn = psycopg2.connect("postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")
cur = conn.cursor()

print("=== PARENT PROFILES ===")
cur.execute("SELECT id, user_id, children_ids, coparent_ids, total_children FROM parent_profiles")
for row in cur.fetchall():
    print(f"id={row[0]}, user_id={row[1]}, children_ids={row[2]}, coparent_ids={row[3]}, total={row[4]}")

print()
print("=== STUDENT PROFILES ===")
cur.execute("SELECT id, user_id, parent_id FROM student_profiles")
for row in cur.fetchall():
    print(f"id={row[0]}, user_id={row[1]}, parent_id={row[2]}")

print()
print("=== RECENT INVITATIONS ===")
cur.execute("SELECT id, inviter_user_id, invited_to_user_id, status, requested_as, relationship_type FROM parent_invitations ORDER BY id DESC LIMIT 10")
for row in cur.fetchall():
    print(f"id={row[0]}, inviter={row[1]}, invited_to={row[2]}, status={row[3]}, requested_as={row[4]}, rel={row[5]}")

print()
print("=== USERS (key ones) ===")
cur.execute("SELECT id, first_name, father_name, roles FROM users WHERE id IN (115, 141, 143)")
for row in cur.fetchall():
    print(f"id={row[0]}, name={row[1]} {row[2]}, roles={row[3]}")

conn.close()
