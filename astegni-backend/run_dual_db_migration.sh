#!/bin/bash
# =============================================================
# Dual Database Migration Script for Astegni
# Run this on the database server (128.140.122.215)
# =============================================================

set -e

# Configuration
DB_USER="astegni_user"
DB_PASSWORD="Astegni2025"
OLD_DB="astegni_db"
USER_DB="astegni_user_db"
ADMIN_DB="astegni_admin_db"

echo "=============================================="
echo "Astegni Dual Database Migration"
echo "=============================================="
echo ""
echo "This script will:"
echo "  1. Rename '$OLD_DB' to '$USER_DB'"
echo "  2. Create new database '$ADMIN_DB'"
echo "  3. Setup admin database schema"
echo ""

read -p "Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "----------------------------------------------"
echo "Step 1: Terminating connections to $OLD_DB..."
echo "----------------------------------------------"

sudo -u postgres psql -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$OLD_DB' AND pid <> pg_backend_pid();
"

echo ""
echo "----------------------------------------------"
echo "Step 2: Renaming $OLD_DB to $USER_DB..."
echo "----------------------------------------------"

# Check if old database exists
OLD_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$OLD_DB'")
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$USER_DB'")

if [ "$OLD_EXISTS" = "1" ] && [ "$USER_EXISTS" != "1" ]; then
    sudo -u postgres psql -c "ALTER DATABASE $OLD_DB RENAME TO $USER_DB;"
    echo "  ✓ Renamed $OLD_DB to $USER_DB"
elif [ "$USER_EXISTS" = "1" ]; then
    echo "  → $USER_DB already exists, skipping rename"
else
    echo "  ✗ ERROR: Neither $OLD_DB nor $USER_DB exists!"
    exit 1
fi

echo ""
echo "----------------------------------------------"
echo "Step 3: Creating $ADMIN_DB..."
echo "----------------------------------------------"

ADMIN_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$ADMIN_DB'")

if [ "$ADMIN_EXISTS" != "1" ]; then
    sudo -u postgres psql -c "
    CREATE DATABASE $ADMIN_DB
        WITH
        OWNER = $DB_USER
        ENCODING = 'UTF8'
        CONNECTION LIMIT = -1;
    GRANT ALL PRIVILEGES ON DATABASE $ADMIN_DB TO $DB_USER;
    "
    echo "  ✓ Created $ADMIN_DB"
else
    echo "  → $ADMIN_DB already exists, skipping creation"
fi

echo ""
echo "----------------------------------------------"
echo "Step 4: Setting up admin database schema..."
echo "----------------------------------------------"

# Check if create_admin_tables.sql exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/create_admin_tables.sql"

if [ -f "$SQL_FILE" ]; then
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $ADMIN_DB -f "$SQL_FILE"
    echo "  ✓ Admin schema created"
else
    echo "  → Warning: $SQL_FILE not found"
    echo "    Run 'python -c \"from admin_models import create_admin_tables; create_admin_tables()\"' manually"
fi

echo ""
echo "----------------------------------------------"
echo "Step 5: Verification..."
echo "----------------------------------------------"

echo "Databases:"
sudo -u postgres psql -c "\l" | grep -E "astegni|Name"

echo ""
echo "=============================================="
echo "Migration completed successfully!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Update your .env file:"
echo "     DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$USER_DB"
echo "     ADMIN_DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$ADMIN_DB"
echo ""
echo "  2. Restart your backend service:"
echo "     systemctl restart astegni"
echo ""
echo "  3. Test the application"
