"""
Get production database schema
Run this script ON the production server
"""

import psycopg
from psycopg import sql
import json
from datetime import datetime

# Production database URLs
PROD_USER_DB = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"
PROD_ADMIN_DB = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db"


def get_database_schema(connection_string, db_name):
    """Get complete schema information for a database"""
    try:
        conn = psycopg.connect(connection_string)
        cur = conn.cursor()

        # Get all tables
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
            # Get columns for each table
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

            schema[table] = {
                'columns': columns,
                'table_count': len(tables)
            }

        cur.close()
        conn.close()

        return schema

    except Exception as e:
        print(f"Error connecting to {db_name}: {e}")
        return None


def main():
    print("Getting PRODUCTION database schemas...")

    prod_user_schema = get_database_schema(PROD_USER_DB, "Production User DB")
    prod_admin_schema = get_database_schema(PROD_ADMIN_DB, "Production Admin DB")

    if not all([prod_user_schema, prod_admin_schema]):
        print("[ERROR] Failed to fetch schemas.")
        return

    # Save schemas
    schemas = {
        'timestamp': datetime.now().isoformat(),
        'user_db': prod_user_schema,
        'admin_db': prod_admin_schema,
        'user_db_table_count': len(prod_user_schema),
        'admin_db_table_count': len(prod_admin_schema)
    }

    output_file = f"production_schemas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(schemas, f, indent=2, default=str)

    print(f"[SUCCESS] Production schemas saved to: {output_file}")
    print(f"User DB tables: {len(prod_user_schema)}")
    print(f"Admin DB tables: {len(prod_admin_schema)}")


if __name__ == "__main__":
    main()
