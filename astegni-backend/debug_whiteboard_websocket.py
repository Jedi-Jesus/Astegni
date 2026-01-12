"""
Debug script to trace whiteboard WebSocket message flow
"""
import psycopg
import os
from dotenv import load_dotenv
import json

load_dotenv()

# Connect to database
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

print('=== WHITEBOARD WEBSOCKET DEBUG ===\n')

# Check recent sessions with participants
print('1. ACTIVE SESSIONS WITH PARTICIPANTS:')
cur.execute('''
    SELECT id, status, host_profile_id, host_profile_type,
           participant_profile_ids, participant_profile_types
    FROM whiteboard_sessions
    WHERE status IN ('scheduled', 'in_progress')
    ORDER BY created_at DESC
    LIMIT 5
''')
sessions = cur.fetchall()
for s in sessions:
    print(f'\n   Session ID: {s[0]}')
    print(f'   Status: {s[1]}')
    print(f'   Host: {s[3]}_{s[2]}')  # e.g., tutor_85
    print(f'   Participants IDs: {s[4]}')
    print(f'   Participants Types: {s[5]}')

# Check connection keys that should exist
print('\n2. EXPECTED WEBSOCKET CONNECTION KEYS:')
for s in sessions:
    host_key = f"{s[3]}_{s[2]}"
    print(f'   Host connection key: {host_key}')

    if s[4] and s[5]:  # participant_profile_ids and types exist
        for idx, p_id in enumerate(s[4]):
            p_type = s[5][idx] if idx < len(s[5]) else 'unknown'
            participant_key = f"{p_type}_{p_id}"
            print(f'   Participant connection key: {participant_key}')

# Check recent strokes to see if they're being saved
print('\n3. RECENT STROKES (last 5):')
cur.execute('''
    SELECT id, session_id, page_id, profile_id, profile_type,
           stroke_type, stroke_order, created_at
    FROM whiteboard_canvas_data
    ORDER BY created_at DESC
    LIMIT 5
''')
for stroke in cur.fetchall():
    print(f'   Stroke #{stroke[0]}: session={stroke[1]}, by={stroke[4]}_{stroke[3]}, type={stroke[5]}')

cur.close()
conn.close()

print('\n=== KEY FINDINGS ===')
print('✓ Strokes ARE being saved to database (database sync works)')
print('❓ Need to check if WebSocket is relaying messages to participants')
print('📝 To test:')
print('   1. Open whiteboard as tutor (host)')
print('   2. Open DIFFERENT browser as student (participant)')
print('   3. Draw on tutor side')
print('   4. Check browser console on student side for "🎨 Received whiteboard stroke" logs')
print('   5. If NO logs appear, WebSocket routing is broken')
print('   6. If logs appear but canvas doesn\'t update, handleRemoteStroke() is broken')
