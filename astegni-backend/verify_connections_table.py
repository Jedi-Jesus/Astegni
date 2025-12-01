"""
Quick verification script for connections table
"""
import psycopg

conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
cursor = conn.cursor()

print("\n" + "=" * 70)
print("CONNECTIONS TABLE VERIFICATION")
print("=" * 70)

# Check schema
print("\nTable Schema:")
print("-" * 70)
cursor.execute("""
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'connections'
    ORDER BY ordinal_position
""")

for col, dtype, nullable, default in cursor.fetchall():
    nullable_str = "NULL" if nullable == 'YES' else "NOT NULL"
    default_str = f" (default: {default})" if default else ""
    print(f"{col:25} {dtype:25} {nullable_str:10} {default_str}")

# Check indexes
print("\nIndexes:")
print("-" * 70)
cursor.execute("""
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'connections'
    ORDER BY indexname
""")

for idx_name, idx_def in cursor.fetchall():
    print(f"{idx_name}")

# Check constraints
print("\nConstraints:")
print("-" * 70)
cursor.execute("""
    SELECT conname, contype, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'connections'::regclass
    ORDER BY conname
""")

for constraint_name, constraint_type, constraint_def in cursor.fetchall():
    type_map = {'p': 'PRIMARY KEY', 'f': 'FOREIGN KEY', 'c': 'CHECK', 'u': 'UNIQUE'}
    type_str = type_map.get(constraint_type, constraint_type)
    print(f"{constraint_name:35} {type_str:15}")
    print(f"  -> {constraint_def}")

# Check data count
print("\nData Summary:")
print("-" * 70)
cursor.execute("SELECT COUNT(*) FROM connections")
total = cursor.fetchone()[0]
print(f"Total connections: {total}")

if total > 0:
    cursor.execute("""
        SELECT status, COUNT(*) as count
        FROM connections
        GROUP BY status
        ORDER BY count DESC
    """)
    print("\nBy status:")
    for status, count in cursor.fetchall():
        print(f"  {status}: {count}")

print("\n" + "=" * 70)
print("VERIFICATION COMPLETE!")
print("=" * 70)

cursor.close()
conn.close()
