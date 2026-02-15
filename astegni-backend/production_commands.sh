#!/bin/bash
# Commands to run ON PRODUCTION SERVER to get schema information

echo "========================================="
echo "PRODUCTION DATABASE SCHEMA EXTRACTION"
echo "========================================="

# Create script to get schema
cat > /tmp/get_prod_schema.py << 'EOF'
import psycopg
import json
from datetime import datetime

PROD_USER_DB = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"
PROD_ADMIN_DB = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db"

def get_database_schema(connection_string, db_name):
    try:
        conn = psycopg.connect(connection_string)
        cur = conn.cursor()

        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        tables = [row[0] for row in cur.fetchall()]

        schema = {}
        for table in tables:
            cur.execute("""
                SELECT
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = %s
                ORDER BY ordinal_position;
            """, (table,))

            columns = []
            for row in cur.fetchall():
                columns.append({
                    'name': row[0],
                    'type': row[1],
                    'max_length': row[2],
                    'nullable': row[3],
                    'default': row[4]
                })

            schema[table] = {'columns': columns}

        cur.close()
        conn.close()

        return schema, len(tables)
    except Exception as e:
        print(f"Error: {e}")
        return None, 0

user_schema, user_count = get_database_schema(PROD_USER_DB, "User DB")
admin_schema, admin_count = get_database_schema(PROD_ADMIN_DB, "Admin DB")

schemas = {
    'timestamp': datetime.now().isoformat(),
    'user_db': user_schema,
    'admin_db': admin_schema,
    'user_db_table_count': user_count,
    'admin_db_table_count': admin_count
}

output_file = f"production_schemas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
with open(output_file, 'w') as f:
    json.dump(schemas, f, indent=2, default=str)

print(f"Production schemas saved to: {output_file}")
print(f"User DB tables: {user_count}")
print(f"Admin DB tables: {admin_count}")
EOF

# Run the script
cd /var/www/astegni/astegni-backend
source venv/bin/activate
python /tmp/get_prod_schema.py

echo ""
echo "========================================="
echo "SIMPLE TABLE COUNT"
echo "========================================="

# Get table counts directly
echo "User DB tables:"
psql -U astegni_user -d astegni_user_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"

echo "Admin DB tables:"
psql -U astegni_user -d astegni_admin_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"

echo ""
echo "User DB table names:"
psql -U astegni_user -d astegni_user_db -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;"

echo ""
echo "Admin DB table names:"
psql -U astegni_user -d astegni_admin_db -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;"
