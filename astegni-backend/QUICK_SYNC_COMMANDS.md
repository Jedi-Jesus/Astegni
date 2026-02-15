# Quick Database Sync Commands

## 🚀 Fast Track (Copy & Paste)

### 1. Upload to Production (LOCAL)
```bash
scp "database_backups\local_user_db_20260215_172411.sql" root@128.140.122.215:/tmp/
scp "database_backups\local_admin_db_20260215_172411.sql" root@128.140.122.215:/tmp/
```
Password: `UVgkFmAsh4N4`

---

### 2. Backup & Restore (PRODUCTION)
```bash
# SSH into production
ssh root@128.140.122.215

# One-line backup + restore
BACKUP_DATE=$(date +%Y%m%d_%H%M%S) && \
mkdir -p /var/backups/postgres && \
pg_dump -U astegni_user -d astegni_user_db > /var/backups/postgres/prod_user_db_$BACKUP_DATE.sql && \
pg_dump -U astegni_user -d astegni_admin_db > /var/backups/postgres/prod_admin_db_$BACKUP_DATE.sql && \
export PGPASSWORD=Astegni2025 && \
psql -U astegni_user -d astegni_user_db < /tmp/local_user_db_20260215_172411.sql && \
psql -U astegni_user -d astegni_admin_db < /tmp/local_admin_db_20260215_172411.sql && \
systemctl restart astegni-backend && \
echo "✓ Sync complete!"
```

---

### 3. Verify (PRODUCTION)
```bash
# Check table counts
psql -U astegni_user -d astegni_user_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"

psql -U astegni_user -d astegni_admin_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"

# Expected: 144 tables (user_db), 49 tables (admin_db)

# Check service
systemctl status astegni-backend
```

---

## 📊 Database Stats

**Local:**
- User DB: 144 tables (1.16 MB dump)
- Admin DB: 49 tables (0.17 MB dump)
- Total: 193 tables

**Files:**
- database_backups\local_user_db_20260215_172411.sql
- database_backups\local_admin_db_20260215_172411.sql

---

## 🔄 Rollback
```bash
# If something goes wrong, restore production backup
ls -lh /var/backups/postgres/
export PGPASSWORD=Astegni2025
psql -U astegni_user -d astegni_user_db < /var/backups/postgres/prod_user_db_[TIMESTAMP].sql
psql -U astegni_user -d astegni_admin_db < /var/backups/postgres/prod_admin_db_[TIMESTAMP].sql
systemctl restart astegni-backend
```

---

## 📝 Notes
- Always backup production first!
- Password for production: UVgkFmAsh4N4
- Database password: Astegni2025
- Service logs: `journalctl -u astegni-backend -f`
