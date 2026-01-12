"""Check 2FA status in database"""
import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')
cur = conn.cursor(cursor_factory=RealDictCursor)

# Check chat_settings for 2FA enabled users - show ALL fields
cur.execute('''
    SELECT user_id, profile_id, profile_type, two_step_verification, two_step_email, two_step_password_hash
    FROM chat_settings
    WHERE two_step_verification = TRUE
''')
rows = cur.fetchall()
print('=== Users with 2FA Enabled ===')
if rows:
    for r in rows:
        pwd_hash = r['two_step_password_hash']
        print(f"  User {r['user_id']}: profile_id={r['profile_id']}, type={r['profile_type']}")
        print(f"    email: {r['two_step_email']}")
        print(f"    password_hash: {pwd_hash[:20] + '...' if pwd_hash else 'NULL/EMPTY'}")
else:
    print('  No users have 2FA enabled!')

# Show all settings
cur.execute('SELECT * FROM chat_settings WHERE two_step_verification = TRUE')
full_rows = cur.fetchall()
print(f'\n=== Full 2FA record ===')
for r in full_rows:
    for key, value in r.items():
        if 'two_step' in key or key in ['user_id', 'profile_id', 'profile_type']:
            print(f"  {key}: {value}")

cur.close()
conn.close()
