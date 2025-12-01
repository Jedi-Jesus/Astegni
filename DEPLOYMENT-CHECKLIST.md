# 🚀 Deployment Checklist - Smart Ranking System

## Pre-Deployment

### Database
- [x] Migration script created: `migrate_rename_premium_to_basic.py`
- [x] Migration executed successfully on local database
- [x] Verified: 40 tutors, 16 basic tutors
- [ ] **Run migration on production database**

### Backend Code
- [x] `models.py` updated (is_basic field)
- [x] `routes.py` updated (smart ranking algorithm)
- [x] All "premium" references renamed to "basic"
- [x] Default sort set to "smart"
- [ ] **Deploy updated backend to production**

### Frontend Code
- [x] `api-config-&-util.js` sends search history
- [x] `main-controller.js` records searches
- [x] `find-tutors.html` dropdown updated
- [ ] **Deploy updated frontend to production**

### Documentation
- [x] Technical docs: `SMART-RANKING-SYSTEM.md`
- [x] Testing guide: `TEST-SMART-RANKING.md`
- [x] Rename summary: `PREMIUM-TO-BASIC-RENAME-COMPLETE.md`
- [x] Implementation summary: `IMPLEMENTATION-COMPLETE-SUMMARY.md`
- [x] Deployment checklist: This file

---

## Deployment Steps

### Step 1: Backup Production Database ⚠️
```bash
# SSH into production server
ssh user@production-server

# Backup database
pg_dump astegni_db > backup_before_smart_ranking_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_before_smart_ranking_*.sql
```

### Step 2: Run Migration on Production
```bash
cd astegni-backend

# Run migration
python migrate_rename_premium_to_basic.py

# Expected output:
# [OK] tutor_profiles.is_premium → is_basic
# [OK] advertiser_profiles.is_premium → is_basic
# [OK] Migration completed successfully!
```

### Step 3: Deploy Backend
```bash
# Pull latest code
git pull origin main

# Restart backend service
sudo systemctl restart astegni-backend
# OR
pm2 restart astegni-backend

# Check logs
tail -f /var/log/astegni-backend.log
```

### Step 4: Deploy Frontend
```bash
# Pull latest code
git pull origin main

# Clear browser cache (optional)
# No build process needed (pure HTML/CSS/JS)

# Verify files updated
ls -la branch/find-tutors.html
ls -la js/find-tutors/
```

### Step 5: Mark Quality Tutors as Basic
```sql
-- Connect to production database
psql astegni_db

-- Mark top-rated tutors as basic
UPDATE tutor_profiles
SET is_basic = true
WHERE rating >= 4.5 AND is_verified = true;

-- Check results
SELECT
    COUNT(*) as total,
    SUM(CASE WHEN is_basic = true THEN 1 ELSE 0 END) as basic_count
FROM tutor_profiles
WHERE is_active = true;
```

---

## Post-Deployment Testing

### Test 1: API Endpoint
```bash
# Test smart ranking endpoint
curl "https://your-domain.com/api/tutors?sort_by=smart&limit=5"

# Should return: "is_basic": true/false
```

### Test 2: Find-Tutors Page
```
1. Open: https://your-domain.com/branch/find-tutors.html
2. Verify: Page loads without errors
3. Check: Sort dropdown shows "🎯 Smart Ranking (Recommended)"
4. Reload: Page 5 times, observe shuffling
```

### Test 3: Search History
```
1. Search: "mathematics"
2. Click: 2-3 tutor cards
3. Clear search and reload
4. Verify: Previously viewed tutors appear higher
```

### Test 4: Manual Sorting
```
1. Change dropdown to: "Highest Rating"
2. Verify: Smart ranking disabled
3. Check: Tutors sorted by rating only
```

---

## Monitoring

### Metrics to Watch

**Performance**:
- [ ] API response time < 500ms
- [ ] Database query time < 200ms
- [ ] No 500 errors in logs
- [ ] Memory usage stable

**User Engagement**:
- [ ] Search conversion rate
- [ ] Tutor profile click-through rate
- [ ] Session duration on find-tutors page
- [ ] Bounce rate

**Business Metrics**:
- [ ] Basic tutor visibility increase
- [ ] New tutor discovery rate
- [ ] User satisfaction (surveys/feedback)

---

## Rollback Plan (If Issues Occur)

### Quick Rollback
```bash
# 1. Restore previous backend code
git checkout HEAD~1

# 2. Restart backend
sudo systemctl restart astegni-backend

# 3. Database rollback (if needed)
psql astegni_db
ALTER TABLE tutor_profiles RENAME COLUMN is_basic TO is_premium;
ALTER TABLE advertiser_profiles RENAME COLUMN is_basic TO is_premium;
```

### Full Database Restore
```bash
# Use backup from Step 1
psql astegni_db < backup_before_smart_ranking_YYYYMMDD_HHMMSS.sql
```

---

## Configuration Tuning

### If Shuffling Too Frequent (>80%)
**File**: `routes.py` line 567
```python
# Reduce to 50%
if page == 1 and random.random() < 0.5:
```

### If New Tutor Period Too Long (>30 days)
**File**: `routes.py` line 528
```python
# Reduce to 14 days
if days_old <= 14:
```

### If Basic Boost Too High
**File**: `routes.py` line 522
```python
# Reduce from 100 to 75
score += 75
```

---

## Support Resources

### Documentation
- `SMART-RANKING-SYSTEM.md` - Technical reference
- `TEST-SMART-RANKING.md` - Testing procedures
- `IMPLEMENTATION-COMPLETE-SUMMARY.md` - Feature overview

### Code Locations
- Backend logic: `astegni-backend/app.py modules/routes.py` (lines 405-613)
- Database models: `astegni-backend/app.py modules/models.py`
- Frontend API: `js/find-tutors/api-config-&-util.js`
- Main controller: `js/find-tutors/main-controller.js`

### Database Schema
- `tutor_profiles.is_basic` - Boolean (default: false)
- `advertiser_profiles.is_basic` - Boolean (default: false)

---

## Success Criteria

Deployment is successful if:
- [x] Migration completes without errors
- [ ] Backend starts without errors
- [ ] `/api/tutors` endpoint returns `is_basic` field
- [ ] Find-tutors page loads correctly
- [ ] Smart ranking works (basic tutors first)
- [ ] Search history records properly
- [ ] Shuffling occurs on ~80% of reloads
- [ ] Manual sorting still functional
- [ ] No increase in error rate
- [ ] Performance remains acceptable

---

## Communication Plan

### Internal Team
```
Subject: Smart Ranking System Deployed to Production

The new smart ranking system is now live on the find-tutors page.

Key Features:
- Basic tutors get priority placement
- Search history creates personalized results
- New tutors get discovery boost
- 80% shuffling adds variety

Changes:
- "premium" renamed to "basic" throughout codebase
- Default sort changed to "Smart Ranking"
- Search history automatically recorded

Impact:
- 16 tutors currently marked as "basic"
- Improved user experience with personalization
- Better visibility for new tutors

Questions? See: SMART-RANKING-SYSTEM.md
```

### Users (Optional Announcement)
```
📢 New Feature: Smarter Tutor Recommendations!

We've upgraded the find-tutors page to show you:
✨ Tutors you've viewed before (personalized)
🆕 New tutors on the platform (discover fresh talent)
⭐ Quality tutors first (verified & highly rated)

Plus, results refresh on each visit for variety!

Try it now: yoursite.com/branch/find-tutors.html
```

---

## Timeline

### Development (Complete)
- [x] Algorithm design
- [x] Backend implementation
- [x] Frontend integration
- [x] Database migration
- [x] Testing & documentation

### Deployment (In Progress)
- [ ] Database backup
- [ ] Production migration
- [ ] Code deployment
- [ ] Post-deployment testing
- [ ] Monitoring setup

### Post-Launch (Week 1)
- [ ] Monitor metrics daily
- [ ] Collect user feedback
- [ ] Tune parameters if needed
- [ ] Mark additional tutors as basic

---

## Contacts

**Technical Issues**:
- Backend: [Backend Team]
- Frontend: [Frontend Team]
- Database: [DevOps Team]

**Business Questions**:
- Product: [Product Manager]
- Analytics: [Data Team]

---

## Final Checklist

Before marking deployment complete:
- [ ] Database backup created
- [ ] Migration executed successfully
- [ ] Backend deployed and running
- [ ] Frontend deployed
- [ ] API endpoint tested
- [ ] Find-tutors page tested
- [ ] Search history tested
- [ ] Basic tutors marked
- [ ] Monitoring configured
- [ ] Team notified
- [ ] Documentation accessible

---

**Status**: Ready for Production Deployment

**Risk Level**: Low (backward compatible, reversible)

**Expected Impact**: Improved user engagement, better tutor discovery

**Rollback Time**: < 10 minutes

---

Good luck with the deployment! 🚀
