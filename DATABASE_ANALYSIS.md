# Deep Database Analysis: Local vs Production (Hetzner)

**Analysis Date:** 2026-01-16

---

## Executive Summary

### Critical Findings:
1. **USERS TABLE SCHEMA**: Identical in both local and production
2. **TABLE COUNT DISCREPANCY**: Local has **126 tables**, Production has **121 tables** (5 tables missing in production)
3. **DATA DISCREPANCY**: All production users show `is_verified=False` and `kyc_verified=False` despite having the fields
4. **INDEX MISSING**: Production is missing `idx_users_account_status` index
5. **FOREIGN KEY MISSING**: Production is missing FK constraint on `kyc_verification_id`

---

## 1. USERS TABLE COMPARISON

### Schema (IDENTICAL in both environments)

Both local and production have **38 fields** in the users table:

```sql
-- Core Identity Fields
id                          INTEGER         NOT NULL  (PK, auto-increment)
first_name                  VARCHAR         NOT NULL
father_name                 VARCHAR         NOT NULL
grandfather_name            VARCHAR         NOT NULL
email                       VARCHAR         NOT NULL  (UNIQUE)
phone                       VARCHAR         NULL
gender                      VARCHAR(20)     NULL
date_of_birth               DATE            NULL

-- Authentication Fields
password_hash               VARCHAR         NOT NULL
has_password                BOOLEAN         NULL      DEFAULT true
roles                       JSON            NULL      DEFAULT '["user"]'
active_role                 VARCHAR         NULL      DEFAULT 'user'

-- Profile Fields
profile_picture             VARCHAR         NULL
bio                         TEXT            NULL
digital_id_no               VARCHAR(50)     NULL

-- Status Fields
is_active                   BOOLEAN         NULL      DEFAULT true
email_verified              BOOLEAN         NULL      DEFAULT false
phone_verified              BOOLEAN         NULL      DEFAULT false
account_status              VARCHAR(20)     NULL      DEFAULT 'active'
is_suspended                BOOLEAN         NULL      DEFAULT false

-- Verification Fields (CRITICAL - See Data Discrepancy)
is_verified                 BOOLEAN         NOT NULL  DEFAULT false
kyc_verified                BOOLEAN         NULL      DEFAULT false
verified_at                 TIMESTAMP       NULL
kyc_verified_at             TIMESTAMP       NULL
verification_method         VARCHAR(20)     NULL
verification_status         VARCHAR(20)     NULL
rejected_at                 TIMESTAMP       NULL
kyc_verification_id         INTEGER         NULL      (FK to kyc_verifications in LOCAL only)

-- Suspension/Moderation Fields
suspended_at                TIMESTAMP       NULL
suspension_reason           TEXT            NULL
suspended_by                INTEGER         NULL

-- Account Management Fields
deactivated_at              TIMESTAMP       NULL
scheduled_deletion_at       TIMESTAMP       NULL
export_verification_code    VARCHAR(10)     NULL
export_verification_expiry  TIMESTAMP       NULL

-- Financial Fields
account_balance             NUMERIC(10, 2)  NULL      DEFAULT 0.00

-- Timestamps
created_at                  TIMESTAMP       NULL      DEFAULT CURRENT_TIMESTAMP
updated_at                  TIMESTAMP       NULL      DEFAULT CURRENT_TIMESTAMP
last_login                  TIMESTAMP       NULL
```

### Indexes Comparison

**LOCAL:**
```sql
users_email_key                 UNIQUE on (email)
idx_users_account_status        INDEX on (account_status)  ← MISSING IN PRODUCTION
```

**PRODUCTION:**
```sql
users_email_key                 UNIQUE on (email)
```

**Impact:** Production queries filtering by `account_status` will be slower.

### Foreign Keys Comparison

**LOCAL:**
```sql
kyc_verification_id → kyc_verifications.id
```

**PRODUCTION:**
```sql
(No foreign keys)
```

**Impact:** Production lacks referential integrity for KYC verifications.

---

## 2. TABLE COUNT DISCREPANCY

### Local Database (126 tables)
### Production Database (121 tables)

### Missing Tables in Production (5 tables):

1. **note_exports** - Note export tracking
2. **note_media** - Note media attachments
3. **notes** - Advanced notes system
4. **campaign_invoices** - Campaign billing invoices
5. **whiteboard_sessions_legacy_backup_20260110_101940** - Legacy backup table

**Impact:**
- Notes system completely unavailable in production
- Campaign invoice tracking missing
- These features were likely added recently and not deployed

---

## 3. DATA VERIFICATION DISCREPANCY

### Local Database (3 users):
```
ALL users:     is_verified=True,  kyc_verified=True
Verified at:   2026-01-15 to 2026-01-16
Status:        All fully verified
```

Sample:
```
ID 1: jediael.s.abebe@gmail.com
  is_verified=True, kyc_verified=True
  verified_at=2026-01-15 22:41:05.872762
  kyc_verified_at=2026-01-15 22:41:05.872793

ID 2: kushstudios16@gmail.com
  is_verified=True, kyc_verified=True
  verified_at=2026-01-16 00:11:15.792024
  kyc_verified_at=2026-01-16 00:11:15.792062

ID 3: contact@astegni.com
  is_verified=True, kyc_verified=True
  verified_at=2026-01-16 00:15:14.105328
  kyc_verified_at=2026-01-16 00:15:14.105354
```

### Production Database (6 users):
```
ALL users:     is_verified=False, kyc_verified=False
Verified at:   NULL for all users
Status:        NO verified users
```

Sample:
```
ID 2: kushstudios16@gmail.com
  is_verified=False, kyc_verified=False
  verified_at=NULL, kyc_verified_at=NULL

ID 3: contact@astegni.com
  is_verified=False, kyc_verified=False
  verified_at=NULL, kyc_verified_at=NULL

ID 4: b.farrer@sasktel.net
  is_verified=False, kyc_verified=False
  verified_at=NULL, kyc_verified_at=NULL
```

**CRITICAL FINDING:** Same users (`kushstudios16@gmail.com`, `contact@astegni.com`) are verified in local but NOT in production!

---

## 4. ALL TABLES COMPARISON

### Tables in LOCAL but NOT in PRODUCTION (5 tables):
- campaign_invoices
- note_exports
- note_media
- notes
- whiteboard_sessions_legacy_backup_20260110_101940

### Common Tables (121 tables):
Both databases share 121 tables including:
- All core user tables (users, student_profiles, tutor_profiles, parent_profiles, advertiser_profiles)
- All authentication tables (refresh_tokens, login_history, otps)
- All chat tables (conversations, chat_messages, message_reactions, etc.)
- All whiteboard tables (whiteboard_sessions, whiteboard_pages, whiteboard_canvas_data, etc.)
- All course/educational tables
- All community tables (clubs, events, polls)
- All job posting tables
- All affiliate/earnings tables
- All KYC tables (kyc_verifications, kyc_verification_attempts)

---

## 5. ADMIN DATABASE COMPARISON

### Both environments have IDENTICAL admin databases:
- **47 tables** in both local and production
- All admin tables match perfectly
- No schema differences detected

Admin tables include:
- Admin management (admin_credentials, admin_profile, manage_*_profile tables)
- System settings (system_general_settings, system_api_settings, etc.)
- Payment configuration (payment_gateways, subscription_plans)
- Affiliate management (affiliate_program, affiliate_tiers)
- Email/SMS configuration
- Media management
- Analytics and statistics

---

## 6. VERIFICATION FIELDS DEEP DIVE

The users table has **TWO separate verification systems**:

### System 1: KYC Verification (Legacy)
```sql
kyc_verified                BOOLEAN         NULL      DEFAULT false
kyc_verified_at             TIMESTAMP       NULL
kyc_verification_id         INTEGER         NULL      (FK in local only)
```

### System 2: General Verification (New - from recent migration)
```sql
is_verified                 BOOLEAN         NOT NULL  DEFAULT false
verified_at                 TIMESTAMP       NULL
verification_method         VARCHAR(20)     NULL      -- e.g., 'kyc', 'manual', 'auto'
verification_status         VARCHAR(20)     NULL      -- e.g., 'pending', 'approved', 'rejected'
rejected_at                 TIMESTAMP       NULL
```

**Important Notes:**
- `is_verified` is **NOT NULL** (must have value)
- `kyc_verified` is **NULL** (can be null)
- Both exist simultaneously for backward compatibility
- Recent migration (commit: fd9c486) consolidated verification to users table

---

## 7. MIGRATION HISTORY ANALYSIS

Based on git commits, recent database changes:

1. **2abf090** - "Consolidate verification to users table and fix CORS for production"
   - Added `is_verified`, `verified_at`, `verification_method`, `verification_status`
   - Migration should have run in production but data wasn't updated

2. **fd9c486** - "Fix verification column references after database migration"
   - Updated code to use new verification fields
   - Fixed references throughout codebase

3. **1227287** - "Implement production-ready KYC verification with face recognition"
   - Enhanced KYC system
   - Added new verification fields

**CONCLUSION:** Production database has the new schema but the data migration/update didn't run properly!

---

## 8. RECOMMENDATIONS

### Immediate Actions:

1. **Deploy Missing Tables to Production**
   ```bash
   # On production server
   cd /var/www/astegni/astegni-backend
   source venv/bin/activate

   # Run migrations for notes system
   python migrate_create_notes_tables.py

   # Run campaign invoices migration (if exists)
   # python migrate_campaign_invoices.py
   ```

2. **Add Missing Index to Production**
   ```sql
   CREATE INDEX idx_users_account_status ON users(account_status);
   ```

3. **Add Missing Foreign Key to Production**
   ```sql
   ALTER TABLE users
   ADD CONSTRAINT fk_users_kyc_verification
   FOREIGN KEY (kyc_verification_id)
   REFERENCES kyc_verifications(id);
   ```

4. **Fix Verification Data in Production**
   - Users who completed KYC should have `is_verified=True`
   - Need to run data migration script to sync `kyc_verified` → `is_verified`

5. **Sync Verification Data**
   ```sql
   -- Update is_verified based on kyc_verified for existing verified users
   UPDATE users
   SET is_verified = TRUE,
       verified_at = kyc_verified_at,
       verification_method = 'kyc'
   WHERE kyc_verified = TRUE;
   ```

### Long-term Actions:

1. **Database Migration Process**
   - Create checklist for production deployments
   - Require migration verification before marking deployment complete
   - Add migration status tracking

2. **Schema Validation**
   - Add automated schema comparison tests
   - Alert on schema drift between environments

3. **Data Validation**
   - Add automated data integrity checks
   - Verify critical fields after migrations

---

## 9. RISK ASSESSMENT

### HIGH RISK:
- **Production users cannot verify accounts** - Missing notes tables
- **Verification data lost** - All users show unverified despite KYC completion
- **Missing index** - Performance degradation on account status queries

### MEDIUM RISK:
- **Missing foreign key** - Data integrity not enforced
- **Campaign invoices missing** - Billing tracking incomplete

### LOW RISK:
- **Legacy backup table** - Can be recreated if needed
- **Admin DB in sync** - No admin functionality affected

---

## 10. SUMMARY TABLE

| Aspect | Local | Production | Status |
|--------|-------|------------|--------|
| **Total User DB Tables** | 126 | 121 | ❌ 5 missing |
| **Total Admin DB Tables** | 47 | 47 | ✅ Identical |
| **Users Table Schema** | 38 fields | 38 fields | ✅ Identical |
| **Users Table Indexes** | 2 | 1 | ❌ 1 missing |
| **Users Table FKs** | 1 | 0 | ❌ 1 missing |
| **Total Users** | 3 | 6 | ℹ️ Different |
| **Verified Users** | 3 (100%) | 0 (0%) | ❌ Critical |
| **Notes System** | ✅ Available | ❌ Missing | ❌ Critical |
| **Campaign Invoices** | ✅ Available | ❌ Missing | ⚠️ Warning |

---

## Appendix A: Full Table Lists

### Local User Database (126 tables):
account_deletion_requests, advertisement_earnings, advertiser_profiles, advertiser_team_members, advertiser_transactions, affiliate_commissions, affiliate_referrals, affiliates, audios, blocked_chat_contacts, blogs, board_equations, board_participants, board_recordings, board_snapshots, board_templates, brand_profile, call_logs, campaign_impressions, **campaign_invoices**, campaign_profile, chat_active_sessions, chat_messages, chat_privacy_reports, chat_settings, child_invitations, club_members, clubs, connection_commission_earnings, connections, conversation_participants, conversations, course_notifications, courses, coursework_answers, coursework_questions, coursework_submissions, courseworks, credentials, deletion_reason_stats, deletion_reasons, direct_affiliate_earnings, documents, email_queue, enrolled_courses, enrolled_students, event_attendees, event_registrations, events, favorite_tutors, featured_reviews, images, indirect_affiliate_earnings, job_alert_matches, job_alerts, job_analytics, job_applications, job_categories, job_custom_questions, job_notifications, job_post_categories, job_posts, job_saved, job_views, kyc_verification_attempts, kyc_verifications, login_history, message_reactions, message_read_receipts, monthly_affiliate_summary, monthly_earnings_summary, **note_exports**, **note_media**, **notes**, otps, parent_invitations, parent_profiles, parent_reviews, partner_requests, payment_methods, platform_reviews, playlist_videos, playlists, poll_options, poll_votes, polls, refresh_tokens, requested_sessions, schedules, schools, sessions, shared_boards, student_courses, student_details, student_guardian, student_overall_progress, student_profiles, student_reviews, subscription_affiliate_earnings, truevoice_audio_cache, truevoice_profiles, tutor_activities, tutor_analysis, tutor_investments, tutor_packages, tutor_profiles, tutor_reviews, tutor_videos, tutoring_earnings, user_notification_preferences, user_sessions, user_settings, users, video_chapters, video_comments, video_engagements, video_reels, videos, whiteboard, whiteboard_call_history, whiteboard_canvas_data, whiteboard_chat_messages, whiteboard_pages, whiteboard_session_recordings, whiteboard_sessions, **whiteboard_sessions_legacy_backup_20260110_101940**

**(Bold = missing in production)**

### Production User Database (121 tables):
Same as local except missing the 5 tables highlighted above.

### Both Admin Databases (47 tables - Identical):
admin_credentials, admin_invitations, admin_leave_requests, admin_portfolio, admin_profile, admin_resignations, admin_reviews, affiliate_program, affiliate_tiers, astegni_reviews, brand_packages, cpi_settings, manage_admins_profile, manage_advertisers_profile, manage_contents_profile, manage_courses_profile, manage_credentials_profile, manage_customers_profile, manage_schools_profile, manage_system_settings_profile, manage_uploads, otps, payment_gateways, subscription_plans, system_affiliate_settings, system_api_keys, system_api_settings, system_backup_config, system_backup_history, system_email_config, system_email_templates, system_general_settings, system_impression_stats, system_impressions, system_integrations, system_logs, system_maintenance, system_media, system_media_settings, system_payment_gateways, system_performance_metrics, system_security_settings, system_sms_config, system_sms_log, system_statistics, system_subscription_tiers, verification_fee
