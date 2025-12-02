-- Migration Script: Setup Dual Database System
-- Database 1: astegni_user_db (renamed from astegni_db) - User-facing data
-- Database 2: astegni_admin_db - Admin/system data
--
-- IMPORTANT: Run this script as postgres superuser
-- Execute on the database server (128.140.122.215)

-- ============================================================
-- STEP 1: Disconnect all users from astegni_db
-- ============================================================

-- First, prevent new connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'astegni_db' AND pid <> pg_backend_pid();

-- ============================================================
-- STEP 2: Rename astegni_db to astegni_user_db
-- ============================================================

-- NOTE: You must run this command while NOT connected to astegni_db
-- Connect to 'postgres' database first, then run:
ALTER DATABASE astegni_db RENAME TO astegni_user_db;

-- ============================================================
-- STEP 3: Create new astegni_admin_db database
-- ============================================================

CREATE DATABASE astegni_admin_db
    WITH
    OWNER = astegni_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0
    CONNECTION LIMIT = -1;

-- Grant privileges to astegni_user
GRANT ALL PRIVILEGES ON DATABASE astegni_admin_db TO astegni_user;

-- ============================================================
-- STEP 4: Connect to astegni_admin_db and create admin tables
-- ============================================================

-- After creating the database, connect to it:
-- \c astegni_admin_db

-- Then run the admin schema (in separate file: create_admin_tables.sql)

-- ============================================================
-- VERIFICATION
-- ============================================================

-- List all databases to verify:
-- \l

-- Expected output should show:
--   astegni_user_db  (renamed from astegni_db)
--   astegni_admin_db (newly created)
