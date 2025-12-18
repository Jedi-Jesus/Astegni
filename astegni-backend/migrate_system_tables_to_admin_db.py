"""
Migrate all system tables from astegni_user_db to astegni_admin_db

This script:
1. Lists all tables starting with 'system' in astegni_user_db
2. Creates the same tables in astegni_admin_db
3. Copies all data from user_db to admin_db
4. Drops the tables from user_db after successful migration
"""

import psycopg
from psycopg.rows import dict_row
from psycopg import sql
from psycopg.types.json import Jsonb, Json
import json
import os

# Change to script directory for log file
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Write output to file for visibility
log_file = open('migration_log.txt', 'w', encoding='utf-8')
def log(msg):
    print(msg)
    log_file.write(msg + '\n')
    log_file.flush()

# Database connection strings
USER_DB_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"
ADMIN_DB_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db"

def get_system_tables(cur):
    """Get all tables that start with 'system'"""
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'system%%'
        ORDER BY table_name
    """)
    return [row['table_name'] for row in cur.fetchall()]

def get_column_types(cur, table_name):
    """Get column types for a table"""
    cur.execute(sql.SQL("""
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = {}
        ORDER BY ordinal_position
    """).format(sql.Literal(table_name)))
    return {row['column_name']: row['udt_name'] for row in cur.fetchall()}

def get_create_table_sql(cur, table_name):
    """Get CREATE TABLE SQL using pg_get_tabledef approach"""
    # Get column definitions with proper handling of serial columns
    cur.execute(sql.SQL("""
        SELECT
            a.attname as column_name,
            pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
            CASE
                WHEN a.attnotnull THEN 'NOT NULL'
                ELSE 'NULL'
            END as nullable,
            CASE
                WHEN pg_get_expr(d.adbin, d.adrelid) LIKE 'nextval%%' THEN NULL
                ELSE pg_get_expr(d.adbin, d.adrelid)
            END as column_default,
            CASE
                WHEN pg_get_expr(d.adbin, d.adrelid) LIKE 'nextval%%' THEN TRUE
                ELSE FALSE
            END as is_serial
        FROM pg_attribute a
        LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
        WHERE a.attrelid = {}::regclass
        AND a.attnum > 0
        AND NOT a.attisdropped
        ORDER BY a.attnum
    """).format(sql.Literal(table_name)))

    columns = cur.fetchall()

    # Get primary key columns
    cur.execute(sql.SQL("""
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = {}::regclass AND i.indisprimary
    """).format(sql.Literal(table_name)))
    pk_columns = [row['attname'] for row in cur.fetchall()]

    # Build CREATE TABLE SQL
    col_defs = []
    for col in columns:
        col_name = col['column_name']
        data_type = col['data_type']
        nullable = col['nullable']
        default = col['column_default']
        is_serial = col['is_serial']

        # Handle serial columns - use SERIAL instead of INTEGER with sequence
        if is_serial:
            if 'bigint' in data_type:
                col_type = 'BIGSERIAL'
            elif 'smallint' in data_type:
                col_type = 'SMALLSERIAL'
            else:
                col_type = 'SERIAL'
            col_defs.append(f"    {col_name} {col_type} {nullable}")
        else:
            default_str = f" DEFAULT {default}" if default else ""
            col_defs.append(f"    {col_name} {data_type} {nullable}{default_str}")

    if pk_columns:
        col_defs.append(f"    PRIMARY KEY ({', '.join(pk_columns)})")

    return f"CREATE TABLE IF NOT EXISTS {table_name} (\n" + ",\n".join(col_defs) + "\n)"

def convert_value(value, col_type):
    """Convert Python value to proper type for psycopg"""
    if value is None:
        return None

    # Handle JSON/JSONB types
    if col_type in ('json', 'jsonb'):
        if isinstance(value, (dict, list)):
            return Json(value) if col_type == 'json' else Jsonb(value)
        elif isinstance(value, str):
            # Already a JSON string, wrap it
            try:
                parsed = json.loads(value)
                return Json(parsed) if col_type == 'json' else Jsonb(parsed)
            except:
                return value
        elif isinstance(value, set):
            return Json(list(value)) if col_type == 'json' else Jsonb(list(value))

    # Handle arrays that might come as sets
    if isinstance(value, set):
        return list(value)

    return value

def main():
    log("=" * 70)
    log("MIGRATE SYSTEM TABLES FROM astegni_user_db TO astegni_admin_db")
    log("=" * 70)

    # Connect to both databases
    log("\n[1] Connecting to databases...")
    try:
        user_conn = psycopg.connect(USER_DB_URL, row_factory=dict_row)
        user_cur = user_conn.cursor()
        log("    [OK] Connected to astegni_user_db")
    except Exception as e:
        log(f"    [ERROR] Failed to connect to user_db: {e}")
        log_file.close()
        return

    try:
        admin_conn = psycopg.connect(ADMIN_DB_URL, row_factory=dict_row)
        admin_cur = admin_conn.cursor()
        log("    [OK] Connected to astegni_admin_db")
    except Exception as e:
        log(f"    [ERROR] Failed to connect to admin_db: {e}")
        user_conn.close()
        log_file.close()
        return

    # Get all system tables
    log("\n[2] Finding system tables in astegni_user_db...")
    system_tables = get_system_tables(user_cur)

    if not system_tables:
        log("    [INFO] No system tables found!")
        user_conn.close()
        admin_conn.close()
        log_file.close()
        return

    log(f"    Found {len(system_tables)} system tables:")
    for table in system_tables:
        user_cur.execute(sql.SQL("SELECT COUNT(*) as cnt FROM {}").format(sql.Identifier(table)))
        count = user_cur.fetchone()['cnt']
        log(f"      - {table} ({count} rows)")

    # Migrate each table
    log("\n[3] Migrating tables...")
    migrated_tables = []

    for table in system_tables:
        log(f"\n    Processing: {table}")

        try:
            # Check if table already exists in admin_db with data
            admin_cur.execute(sql.SQL("""
                SELECT EXISTS(
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = {}
                )
            """).format(sql.Literal(table)))
            table_exists = admin_cur.fetchone()['exists']

            if table_exists:
                admin_cur.execute(sql.SQL("SELECT COUNT(*) as cnt FROM {}").format(sql.Identifier(table)))
                existing_count = admin_cur.fetchone()['cnt']
                if existing_count > 0:
                    log(f"      [SKIP] Table already exists with {existing_count} rows in admin_db")
                    migrated_tables.append(table)
                    continue

            # Get CREATE TABLE SQL with proper serial handling
            create_sql = get_create_table_sql(user_cur, table)
            log(f"      Creating table in admin_db...")
            # Execute raw SQL (no placeholders)
            admin_cur.execute(create_sql)
            admin_conn.commit()

            # Get column types for proper value conversion
            col_types = get_column_types(user_cur, table)

            # Get all data from user_db
            user_cur.execute(sql.SQL("SELECT * FROM {}").format(sql.Identifier(table)))
            rows = user_cur.fetchall()

            if rows:
                # Insert data into admin_db
                col_names = list(rows[0].keys())

                log(f"      Copying {len(rows)} rows...")
                for row in rows:
                    # Convert values based on column types
                    values = [convert_value(row[col], col_types.get(col, '')) for col in col_names]

                    # Build insert using sql module for proper escaping
                    insert_query = sql.SQL("INSERT INTO {} ({}) VALUES ({}) ON CONFLICT DO NOTHING").format(
                        sql.Identifier(table),
                        sql.SQL(', ').join(map(sql.Identifier, col_names)),
                        sql.SQL(', ').join(sql.Placeholder() * len(col_names))
                    )
                    admin_cur.execute(insert_query, values)

                admin_conn.commit()

                # Update sequence to max id + 1 if table has id column
                if 'id' in col_names:
                    admin_cur.execute(sql.SQL("SELECT MAX(id) FROM {}").format(sql.Identifier(table)))
                    max_id = admin_cur.fetchone()['max']
                    if max_id:
                        try:
                            admin_cur.execute(sql.SQL("SELECT setval(pg_get_serial_sequence({}, 'id'), {}, false)").format(
                                sql.Literal(table),
                                sql.Literal(max_id + 1)
                            ))
                            admin_conn.commit()
                        except:
                            pass  # Ignore sequence errors
            else:
                log(f"      No data to copy (table is empty)")

            migrated_tables.append(table)
            log(f"      [OK] Migrated successfully")

        except Exception as e:
            log(f"      [ERROR] {e}")
            admin_conn.rollback()
            import traceback
            log(f"      {traceback.format_exc()}")

    # Drop tables from user_db
    log("\n[4] Dropping migrated tables from astegni_user_db...")
    for table in migrated_tables:
        try:
            user_cur.execute(sql.SQL("DROP TABLE IF EXISTS {} CASCADE").format(sql.Identifier(table)))
            user_conn.commit()
            log(f"    [OK] Dropped: {table}")
        except Exception as e:
            log(f"    [ERROR] Failed to drop {table}: {e}")
            user_conn.rollback()

    # Verify migration
    log("\n[5] Verification...")

    # Check tables in admin_db
    admin_cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'system%%'
        ORDER BY table_name
    """)
    admin_tables = [row['table_name'] for row in admin_cur.fetchall()]
    log(f"\n    System tables in astegni_admin_db ({len(admin_tables)}):")
    for table in admin_tables:
        admin_cur.execute(sql.SQL("SELECT COUNT(*) as cnt FROM {}").format(sql.Identifier(table)))
        count = admin_cur.fetchone()['cnt']
        log(f"      - {table} ({count} rows)")

    # Check remaining in user_db
    remaining = get_system_tables(user_cur)
    if remaining:
        log(f"\n    [WARNING] System tables still in astegni_user_db: {remaining}")
    else:
        log(f"\n    [OK] No system tables remaining in astegni_user_db")

    # Close connections
    user_cur.close()
    user_conn.close()
    admin_cur.close()
    admin_conn.close()

    log("\n" + "=" * 70)
    log("MIGRATION COMPLETE!")
    log("=" * 70)
    log(f"\nMigrated {len(migrated_tables)} tables: {', '.join(migrated_tables)}")
    log_file.close()

if __name__ == "__main__":
    main()
