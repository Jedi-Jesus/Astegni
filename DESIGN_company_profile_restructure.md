# Design: Advertiser → Company → Brand → Campaign restructure

**Status:** Proposal for review. No code written yet.
**Originating ask:** "Make the sidebar 'Companies' instead of 'Brands'. One user can have multiple companies; each company has its own brands; each brand has its own campaigns."

---

## 1. Why this is bigger than it looks

You asked for a UI restructure with a new data layer. Tracing through the codebase, that pulls in:

- 1 new DB table (`company_profile`)
- ~15 columns moved off `advertiser_profiles` (company identity, KYC docs, billing wallet, verification status)
- 2 FK re-keys (`campaign_profile.advertiser_id → company_id`, `advertiser_transactions.advertiser_id → company_id`)
- 1 new FK column on `brand_profile` (`company_id`)
- ~30 endpoints across 11 backend files need updates
- 5+ frontend JS files (~4400-line `advertiser-profile.html`, brand modal, verification modal, finance plugin)
- The B2 path restructure we were already planning

Total scope: roughly **2–3 days of focused work**, billing flows touched, 4 deployable phases.

This doc exists so you can sign off (or reshape) before any of that ships.

---

## 2. The new model

### Current
```
User (with "advertiser" role)
  └── advertiser_profile      (1 per user; carries company identity, wallet, KYC)
        └── brand_profile     (advertiser.brand_ids[] array)
              └── campaign_profile  (campaign.advertiser_id FK)
```

### Proposed
```
User (with "advertiser" role)
  └── advertiser_profile      (1 per user; user-level marketing presence only)
        └── company_profile   (1+ per advertiser; each is a separate legal entity)
              ├── balance / wallet              (per-company billing)
              ├── KYC + verification status     (per-company)
              ├── company logo, license, TIN    (per-company identity)
              └── brand_profile                 (brand.company_id FK)
                    └── campaign_profile        (campaign.company_id FK)
```

Key consequence: every campaign-related action (create brand, launch campaign, view balance, submit verification) is scoped to a specific company. Users select "which company am I acting as" before doing anything.

---

## 3. Field split

### Stays on `advertiser_profiles` (user-level marketing presence)
```
id, user_id, username, bio, quote, cover_image, is_active,
hero_title, hero_subtitle, joined_in,
is_online, last_seen, created_at, updated_at, scheduled_deletion_at,
brand_ids                        (DROPPED — brands now linked via brand.company_id)
two_factor_*                     (kept; TFA is per-user-per-role)
two_factor_protected_panels      (kept; UI prefs)
```

### Moves to `company_profile` (per-company business + billing)
```
-- Identity
company_name, industry, company_size, business_reg_no, tin_number
website, address, city, company_description
company_email (jsonb), company_phone (jsonb)

-- Verification
company_logo, business_license_url, tin_certificate_url, additional_docs_urls (jsonb)
verification_submitted_at, verification_reviewed_at, verification_notes
+ NEW: is_verified, verification_status, verification_method, verified_at, rejected_at
  (currently on users; need their own row per company)

-- Billing
balance, currency
total_deposits, total_spent, last_transaction_at
default_cancellation_fee_percent
```

### New on `company_profile`
```
id           SERIAL PRIMARY KEY
advertiser_id INTEGER NOT NULL REFERENCES advertiser_profiles(id) ON DELETE CASCADE
created_at, updated_at
+ all of the above
```

### Re-keyed FKs
```
brand_profile:
  + ADD COLUMN company_id INTEGER NOT NULL REFERENCES company_profile(id) ON DELETE CASCADE
  (advertiser_profiles.brand_ids[] array is dropped after backfill)

campaign_profile:
  - DROP CONSTRAINT fk_campaign_advertiser
  - RENAME COLUMN advertiser_id TO company_id
  + ADD CONSTRAINT fk_campaign_company FOREIGN KEY (company_id) REFERENCES company_profile(id) ON DELETE CASCADE

advertiser_transactions:
  - DROP CONSTRAINT advertiser_transactions_advertiser_id_fkey
  - RENAME COLUMN advertiser_id TO company_id
  + ADD CONSTRAINT advertiser_transactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES company_profile(id) ON DELETE CASCADE
```

`job_posts.advertiser_id` is left alone — job posts are a user-level concept (recruiting), not company-level. Confirm if you disagree.

---

## 4. Migration of existing data (production: 2 advertisers, 4 brands, 10 campaigns)

For each existing `advertiser_profiles` row:

1. INSERT one `company_profile` row, copying all the moving fields. Resolve `company_name` via:
   - existing `advertiser_profiles.company_name` if non-empty
   - else `users.first_name + last_name` (international)
   - else `users.first_name + father_name + grandfather_name` (Ethiopian)
   - else abort migration with explicit error for that advertiser

2. For each `brand_id` in `advertiser_profiles.brand_ids`:
   - `UPDATE brand_profile SET company_id = <new_company_id> WHERE id = <brand_id>`

3. For each campaign where `campaign_profile.advertiser_id = <advertiser_id>`:
   - `UPDATE campaign_profile SET company_id = <new_company_id> WHERE advertiser_id = <advertiser_id>` (before the column rename)

4. Similarly for `advertiser_transactions`.

5. Carry KYC: if `users.is_verified = true` for the user owning this advertiser, set the new company's `is_verified = true` (verified user = verified initial company).

After migration:
- 2 companies (named "Jediael Seyoum Abebe" and "Contact account one" from the personal-name fallback)
- 4 brands re-linked to those companies
- 10 campaigns re-keyed
- Existing transaction history preserved under the new company_id

The migration is idempotent (re-runnable) by checking whether `advertiser_profiles.brand_ids` is non-empty before copying — if empty, migration already ran.

---

## 5. Backend changes (every file that needs an update)

Audit findings, organized by what each file does after the change.

### Files that change because billing fields moved
- **advertiser_balance_endpoints.py** — `GET /api/advertiser/balance`, `POST .../deposit`, `POST .../withdraw`. Endpoints become company-scoped: `GET /api/advertiser/companies/{id}/balance`, etc. Wallet operations now target the specified company.
- **campaign_launch_endpoints.py** — currently deducts from `advertiser.balance`. Now deducts from `company.balance` (looked up via `campaign.company_id`).
- **campaign_deposit_endpoints.py** — same shift.
- **campaign_cancellation_endpoints.py** + `_enhanced.py` — refund logic now credits the company wallet.
- **campaign_impression_endpoints.py** — CPM billing deducts from the campaign's company.
- **advertiser_brands_endpoints.py** (budget transfer logic at lines 676–796) — moves from advertiser to company wallet.

### Files that change because verification fields moved
- **app.py modules/routes.py**:
  - `POST /api/advertiser/submit-verification` (line ~7965) → becomes `POST /api/advertiser/companies/{id}/submit-verification`
  - `GET /api/advertiser/verification-status` → `GET /api/advertiser/companies/{id}/verification-status`
  - `POST /api/upload/company-document` (line ~7882) → now requires `company_id` form field, writes to `company_profile` not `advertiser_profiles`
- **admin_advertisers_endpoints.py** — admin verification endpoints work per-company (or per-advertiser, listing all their companies — TBD)

### Files that change because brand-FK changed
- **advertiser_brands_endpoints.py** — `POST /api/advertiser/brands` now takes `company_id`. Ownership checks look at `brand.company_id` not `advertiser.brand_ids`.
- **All campaign endpoints** that JOIN to advertiser_profiles via brand → join via company instead.

### Files that change for verification guards
- **advertiser_brands_endpoints.py:212** (create_brand guard) — was reading `users.is_verified`. Now reads `company_profile.is_verified` for the specified company.
- Same guard pattern in any other "must be verified" checks.

### New endpoints
```
POST   /api/advertiser/companies                  Create a company under current advertiser
GET    /api/advertiser/companies                  List my companies
GET    /api/advertiser/companies/{id}             Get one company
PUT    /api/advertiser/companies/{id}             Update company fields
DELETE /api/advertiser/companies/{id}             Delete (if no brands/campaigns under it)
POST   /api/advertiser/companies/{id}/submit-verification
GET    /api/advertiser/companies/{id}/verification-status
GET    /api/advertiser/companies/{id}/brands       Brands belonging to this company
GET    /api/advertiser/companies/{id}/balance      Balance + recent transactions
POST   /api/advertiser/companies/{id}/deposit
POST   /api/advertiser/companies/{id}/withdraw
```

### Endpoints that get removed/redirected (URL stable, behavior changes)
- `GET /api/advertiser/profile` returns only user-level fields; company-level fields appear under `companies[]` array (or via separate endpoint).
- `POST /api/upload/company-document` requires a `company_id`.

---

## 6. Frontend changes

### advertiser-profile.html (4400 lines)
- **Sidebar:** "Brands" link + count → "Companies" link + count
- **Brands panel** (lines ~2044–2129) → **Companies panel.** Stats cards become "Total Companies / Total Brands / Total Campaigns / Total Revenue."
- **Brand cards** in grid → **Company cards** (showing logo, name, verification badge, brand count, campaign count)
- **Create Brand modal** → **Create Company modal** (collects company_name, industry, website, optional logo)

### New: Company detail view (when a company card is clicked)
- Shows company verification status + KYC submit button
- "Brands" section — the OLD brands panel/grid moves here
- Existing create-brand modal stays, but now sends `company_id` automatically
- Existing brand cards / campaign list / campaign creation flow all work unchanged inside this nested view

### Modal stack
```
Companies panel
  └── Company card click → Company detail modal
        └── "Add Brand" button → Create Brand modal (existing, with company_id added)
              └── Brand card click → Campaign list (existing)
                    └── "Create Campaign" → Campaign modal (existing)
```

### Verify-company-info modal (js/common-modals/verify-company-info-modal.js)
- Currently submits a single verification for the advertiser. Now scoped: "Verify [Company Name]". Triggered from the company detail view, not the global settings.

### Finance plugin
- Per-company balance views replace the single advertiser balance.

---

## 7. Deployment phases (4 commits, each deployable independently)

### Phase 1: backend + DB (1 commit, behind a feature flag if possible)
1. Take production DB backup
2. Run migration script (creates table, backfills, re-keys FKs)
3. Deploy new SQLAlchemy models
4. Deploy new endpoints alongside old ones (old `/api/advertiser/brands` still works via a thin shim that reads from the user's first/only company)
5. Smoke-test new endpoints with curl

**Rollback:** revert the commit; the new table stays but unused. Re-keyed FK columns are renamed back. Migration script has a `--rollback` flag.

### Phase 2: frontend
1. Rewire sidebar + panel to use new endpoints
2. Add company create/list/detail UI
3. Nest existing brand UI inside company detail view
4. Bump cache-buster

**Rollback:** revert; users see old UI; backend still serves both.

### Phase 3: B2 path scheme (separate from the above)
1. Update 4 upload endpoints to use `{type}/advertisements/{company}/{brand}/{campaign}/{placement}/{file}`
2. Migrate 20 existing campaign files
3. Delete 9 orphan files from deleted entities
4. Update cleanup-script regex

### Phase 4: rename-triggers-remigrate (deferred polish)
1. Patch company/brand/campaign rename endpoints to also re-copy B2 files to new paths

---

## 8. Risks and unknowns

- **Billing wallets**: existing 2 advertisers have `balance > 0` (need to check). If so, that balance moves to their auto-created company. If they later create a SECOND company, it starts at zero. Is this acceptable, or should the migration split the balance somehow? **Default: move to first company.**
- **Per-company KYC**: existing 2 advertisers are KYC-verified at the user level. The migration carries `is_verified = true` to their auto-created company. New companies they create start unverified and must re-submit KYC. **Confirm acceptable.**
- **In-flight campaigns**: any active campaigns at migration time continue running; their FK gets updated mid-flight (transaction). No downtime expected.
- **Frontend out-of-sync window**: between Phase 1 deploy and Phase 2 deploy, the old frontend still calls old endpoints (we'll keep shim handlers temporarily). Users see no change. Risk if a user reloads after Phase 1 but before Phase 2 — they get old UI calling new-compat endpoints. Tested to work.
- **What about teams?** `advertiser_team_endpoints.py` exists — team members invited to "this advertiser". After restructure, do team invites become per-company or stay per-advertiser? **Default: per-company** (a team member is invited to manage a specific company). Out of audit scope; need answer.

---

## 9. What I'm asking you to decide before I write code

1. **Approve the field split** in §3 (company vs advertiser).
2. **Approve the FK re-key** of `campaign_profile.advertiser_id → company_id` (renaming an existing column with cascade FKs — irreversible without rollback script).
3. **Approve the billing decision**: existing balance moves to the auto-created company; new companies start at zero.
4. **Approve the KYC decision**: existing user-level verification becomes the auto-created company's verification; new companies start unverified.
5. **Decide team-membership scope**: per-company or per-advertiser?
6. **Approve the 4-phase deployment plan** (or request a different splitting).
7. **Decide whether `job_posts.advertiser_id` should also re-key** (recruiting concept — I'd leave it).

Once these are answered I can start Phase 1.1 (migration script) with confidence.
