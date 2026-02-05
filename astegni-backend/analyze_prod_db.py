"""
Production Database Schema Analysis - Run this on the production server
"""

import psycopg
from psycopg.rows import dict_row
import json

# Production database configs (local on production server)
PROD_USER_DB = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"
PROD_ADMIN_DB = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db"

def get_database_schema(connection_string, db_name):
    """Get complete database schema"""
    with psycopg.connect(connection_string, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            # Get all tables
            cur.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """)
            tables = [row['table_name'] for row in cur.fetchall()]

            schema = {}
            for table in tables:
                # Get columns
                cur.execute(f"""
                    SELECT
                        column_name,
                        data_type,
                        is_nullable,
                        column_default
                    FROM information_schema.columns
                    WHERE table_name = '{table}'
                    ORDER BY ordinal_position;
                """)
                columns = cur.fetchall()

                # Get row count
                cur.execute(f'SELECT COUNT(*) as count FROM "{table}"')
                row_count = cur.fetchone()['count']

                schema[table] = {
                    'columns': columns,
                    'row_count': row_count
                }

            return {
                'database': db_name,
                'table_count': len(tables),
                'tables': sorted(tables),
                'schema': schema
            }

def main():
    print("Analyzing Production Databases...")

    user_db_schema = get_database_schema(PROD_USER_DB, "Production User DB")
    admin_db_schema = get_database_schema(PROD_ADMIN_DB, "Production Admin DB")

    result = {
        'user_db': user_db_schema,
        'admin_db': admin_db_schema
    }

    # Save to file
    with open('/tmp/prod_db_schema.json', 'w') as f:
        json.dump(result, f, indent=2, default=str)

    print(f"\n[User DB] Tables: {user_db_schema['table_count']}")
    for table in user_db_schema['tables']:
        row_count = user_db_schema['schema'][table]['row_count']
        col_count = len(user_db_schema['schema'][table]['columns'])
        print(f"  * {table}: {row_count} rows, {col_count} columns")

    print(f"\n[Admin DB] Tables: {admin_db_schema['table_count']}")
    for table in admin_db_schema['tables']:
        row_count = admin_db_schema['schema'][table]['row_count']
        col_count = len(admin_db_schema['schema'][table]['columns'])
        print(f"  * {table}: {row_count} rows, {col_count} columns")

    print("\nSchema saved to: /tmp/prod_db_schema.json")

if __name__ == "__main__":
    main()
