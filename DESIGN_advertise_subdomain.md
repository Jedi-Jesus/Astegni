# Design: `advertise.astegni.com` subdomain + advertiser-only signup surface

**Status:** Proposal for review. No code written yet.
**Originating ask:** "Create a subdomain advertise.astegni.com with a home page, login, and signup. After signup, the user lands on advertiser-profile.html. Advertiser stops being a 'type of role' on the main domain."

---

## 1. Goal

Move advertiser onboarding off `astegni.com` and onto its own subdomain `advertise.astegni.com`. The advertiser role disappears from the main domain's role-picker. The two surfaces share one user database and one auth system, but each surface keeps its own login session (no cross-domain SSO).

This is positioned as a separate product surface targeting high-level brands (Coca-Cola tier), not a relabel of the existing role.

---

## 2. Decisions (all confirmed before this doc was written)

1. **Same `users` table.** One row per person. The advertiser presence is expressed by `"advertiser" ∈ users.roles`, same as today.
2. **No new `account_type` column.** Boundary is enforced at the auth endpoint level via a `surface` parameter, not by schema.
3. **Same repo, separate folder.** Mirrors the existing `admin-pages/` pattern. New folder: `advertise-pages/`.
4. **Login/signup are modals in `advertise-pages/index.html`**, not standalone pages.
5. **Same credentials, separate sessions.** Email + password are identical across surfaces. JWTs stay in per-origin `localStorage`. Logging in at one surface does NOT log you in at the other. (Rejected true-SSO via cookies for scope reasons.)
6. **Existing dual-role users keep both surfaces.** The 2 production advertisers already have `"advertiser"` in their `roles` array — they automatically work on both surfaces with their existing password. No migration needed.
7. **Signup at advertise.astegni.com with an existing email + matching password:** add `"advertiser"` to the existing user's roles, create their `advertiser_profile`, log them in. (Mirrors existing `/api/register` reactivation behavior at routes.py:220–254.)
8. **Signup at advertise.astegni.com with an existing email + non-matching password:** reject with "email exists with different password; log in instead."
9. **Existing `profile-pages/advertiser-profile.html` is deleted** after the move; a stub HTML file in its place 302-redirects to `https://advertise.astegni.com/advertiser-profile.html` for any stale bookmarks.
10. **Marketing copy tone:** high-level brands (Coca-Cola tier), not SMBs.

---

## 3. Architecture

### Surfaces

| Surface | Hostname | Folder | Audience |
|---|---|---|---|
| Platform | `astegni.com` | repo root | Students, tutors, parents |
| Admin | `admin.astegni.com` | `admin-pages/` | Internal staff |
| Advertise (NEW) | `advertise.astegni.com` | `advertise-pages/` | Brand advertisers |

All three are served from this same repo, deployed via the existing git webhook, and call the same FastAPI at `api.astegni.com`.

### Auth boundary (no DB change)

A new `surface` parameter on `/api/register` and `/api/login`:

```
surface = 'platform'   # request originated from astegni.com
surface = 'advertise'  # request originated from advertise.astegni.com
```

Enforcement:

| Endpoint | `surface='advertise'` behavior |
|---|---|
| `POST /api/register` | Forces `role='advertiser'`. If user exists + password matches, adds advertiser role + creates advertiser_profile. If user exists + password doesn't match, reject. |
| `POST /api/login`    | Requires `"advertiser" ∈ user.roles`. If not, return 403 with "no advertiser access on this account — sign up at advertise.astegni.com." Also sets `active_role='advertiser'` for the returned JWT regardless of the user's previous active role. |
| `POST /api/register` with `surface='platform'` and `role='advertiser'` | Reject with "advertiser signup is only available at advertise.astegni.com." |

The frontend passes the `surface` field; the backend never trusts it blindly for authorization (the role check is the actual gate), it's just routing/validation metadata.

### Why no `account_type` column

We considered adding `users.account_type ∈ {'platform', 'advertiser'}` to enforce the boundary in the DB. Dropped because:
- Existing dual-role users (decision #6) need to belong to both surfaces simultaneously — a single-value column can't express that
- The `roles` array already encodes which surfaces a user can access
- One less column to migrate and maintain

---

## 4. File layout

### New folder structure

```
advertise-pages/
  index.html                         Marketing home + login/signup modals
  advertiser-profile.html            MOVED from profile-pages/
  js/
    config.js                        API_BASE_URL detection (mirrors root js/config.js)
    advertise-home.js                Modal wiring, signup/login submit handlers
    advertiser-profile/              MOVED from js/advertiser-profile/
      advertiser-profile.js
  css/
    advertise-home.css               Marketing home styling
    advertiser-profile/              MOVED from css/advertiser-profile/
  modals/
    login-modal.html                 NEW (advertiser-scoped login)
    signup-modal.html                NEW (advertiser-scoped signup)
    otp-verification-modal.html      Copy or reference from modals/common-modals/
    advertiser-profile/              MOVED from modals/advertiser-profile/
```

### Files moved (not copied)

- `profile-pages/advertiser-profile.html` → `advertise-pages/advertiser-profile.html`
- `css/advertiser-profile/*` → `advertise-pages/css/advertiser-profile/*`
- `js/advertiser-profile/*` → `advertise-pages/js/advertiser-profile/*`
- `modals/advertiser-profile/*` → `advertise-pages/modals/advertiser-profile/*`

### Stub left behind

`profile-pages/advertiser-profile.html` becomes a 4-line redirect:

```html
<!DOCTYPE html>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=https://advertise.astegni.com/advertiser-profile.html">
<title>Redirecting to advertise.astegni.com</title>
<p>This page has moved. <a href="https://advertise.astegni.com/advertiser-profile.html">Click here</a> if you're not redirected.</p>
```

### Shared assets

Files like `css/root.css`, `css/root/theme.css`, `js/root/app.js`, `modals/common-modals/*` are referenced from the new subdomain via absolute URLs to the main repo (e.g. `https://astegni.com/css/root.css`) OR via relative paths that work after the nginx vhost is configured. Decision deferred until Phase 1 implementation — depends on what `advertiser-profile.html` actually imports.

---

## 5. Backend changes

### Modified files

**`app.py modules/routes.py`**

- `/api/register` (line 220-ish): accept optional `surface` field on the request body. If `surface='advertise'`:
  - Force `role='advertiser'`
  - Existing reactivation/add-role logic at lines 222–254 already handles "user exists" — reuse it
- `/api/login`: accept optional `surface` field. If `surface='advertise'`, require `"advertiser" ∈ user.roles`; return 403 otherwise. Set returned JWT's `role` claim to `"advertiser"`.
- `/api/switch-role`, `/api/my-roles`: no changes (still works the same for users who have multiple roles)
- Add-role endpoint at line ~4912: remove the advertiser branch (signup at advertise.astegni.com replaces it)

**Pydantic models in `app.py modules/models.py`**

- Add `surface: Optional[Literal['platform', 'advertise']] = 'platform'` to `UserCreate` and the login request model

### No new endpoints

We considered `/api/advertiser/auth/register` and `/api/advertiser/auth/login` as dedicated routes. Dropped — they'd duplicate 90% of `/api/register` and `/api/login` for no gain. The `surface` parameter is enough.

### No DB migration

No schema changes. The 2 existing advertiser users already have `"advertiser"` in their roles and work as-is.

---

## 6. Frontend changes

### New: `advertise-pages/index.html`

High-level brand marketing page. Sections:

- **Hero**: "Reach Ethiopia's next generation. Advertise on Astegni." CTA: "Get started" → opens signup modal.
- **Audience stats**: students, tutors, parents reached, engagement metrics (use placeholder numbers, marked TODO)
- **Why Astegni for brands**: 3 cards — targeted demographics, verified accounts, transparent CPM
- **How it works**: signup → KYC → create campaign → publish — 4-step illustration
- **Login**: top-right nav button → opens login modal
- **Footer**: link to astegni.com main site

### New modals

- `advertise-pages/modals/login-modal.html` — email + password. On submit: `POST /api/login` with `surface='advertise'`. On success: store token, redirect to `advertiser-profile.html`. On 403 "no advertiser access": show inline error with "Sign up instead" link.
- `advertise-pages/modals/signup-modal.html` — email, password, password-confirm, first name, optional company name. On submit: `POST /api/register` with `surface='advertise'`, `role='advertiser'`. Triggers OTP email. Then OTP modal. Then redirect to `advertiser-profile.html`.

### Modified: main `astegni.com`

- **Role-picker UI** (in `modals/index/social-login-modal.html` or wherever role choice happens during signup): remove "Advertiser" option
- **Add-role modal** (`modals/common-modals/manage-role-modal.html` or similar): remove advertiser from selectable roles
- **`js/root/auth.js`**: remove advertiser-specific signup branches
- **`js/root/app.js`**: remove advertiser from role-switcher dropdown
- **`js/root/active-role-guard.js`**: keep the advertiser branch (still needed for users with the role; just no longer reachable via main-domain signup)
- **`js/root/profile-system.js`**: if a user with `active_role='advertiser'` lands on astegni.com, redirect them to `advertise.astegni.com/advertiser-profile.html` instead of `profile-pages/advertiser-profile.html`
- **`js/root/google-oauth.js`**: remove advertiser from OAuth signup role options
- **Footer**: add "Advertise on Astegni" link → `https://advertise.astegni.com`

---

## 7. Nginx + deployment

### New server block on production

```nginx
server {
    listen 443 ssl http2;
    server_name advertise.astegni.com;

    ssl_certificate     /etc/letsencrypt/live/advertise.astegni.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/advertise.astegni.com/privkey.pem;

    root /var/www/astegni/advertise-pages;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name advertise.astegni.com;
    return 301 https://$host$request_uri;
}
```

### DNS

A new DNS A record: `advertise.astegni.com` → `128.140.122.215` (existing Hetzner server).

### SSL

`certbot --nginx -d advertise.astegni.com` after the DNS record propagates.

### Deploy

Existing git webhook deploys the whole repo to `/var/www/astegni/`. The new `advertise-pages/` folder is picked up automatically; nginx config addition is a one-time manual step on the server.

### Frontend environment detection

`advertise-pages/js/config.js` needs to know which API URL to use:

```js
const productionDomains = ['advertise.astegni.com'];
const isProduction = productionDomains.includes(window.location.hostname);
const API_BASE_URL = isProduction ? 'https://api.astegni.com' : 'http://localhost:8000';
```

For local dev: `python dev-server.py` from `advertise-pages/` runs on a different port (e.g. 8082) so both surfaces can run simultaneously. Backend is shared.

---

## 8. Deployment phases

### Phase 1: Subdomain content + file moves + nginx
1. Create `advertise-pages/` folder + new `index.html` + login/signup modals
2. Move `advertiser-profile.html` + advertiser-specific assets into the new folder
3. Fix relative paths inside moved files (`../css/...` → `css/...` or absolute URLs)
4. Drop stub redirect at old `profile-pages/advertiser-profile.html` location
5. DNS A record + nginx vhost + SSL on production
6. Manual smoke test: visit `advertise.astegni.com`, see marketing home

**Rollback:** point nginx to a maintenance page; the new folder is dead code. Main astegni.com is unaffected.

### Phase 2: Backend `surface` parameter
1. Add `surface` to register/login Pydantic models
2. Guard advertise-surface signup: forces `role='advertiser'`, reuses existing add-role logic for existing emails
3. Guard advertise-surface login: requires `"advertiser"` in roles
4. Reject `role='advertiser'` from `surface='platform'` signups
5. Wire the advertise.astegni.com signup/login modals to pass `surface='advertise'`

**Rollback:** revert the routes.py changes; surface parameter is optional so old clients keep working.

### Phase 3: Main astegni.com cleanup
1. Remove "Advertiser" from main-domain role-picker UI
2. Remove advertiser branch from add-role modal
3. Add "Advertise on Astegni" footer link
4. Update profile-system.js to redirect advertiser-active users to the new subdomain
5. Bump cache-buster across affected files

**Rollback:** revert; advertiser reappears in role picker but signup goes nowhere clean — minor cosmetic break, no functional damage.

---

## 9. Risks and open issues

- **Local dev: two frontends, one backend.** Need a second `dev-server.py` invocation on a different port. Easy.
- **Shared CSS/JS during the move:** the existing `advertiser-profile.html` has ~50 stylesheet imports and shared common-modals. Some paths will need to become absolute URLs to `astegni.com` after the move, OR we duplicate the shared files into the subdomain. Decision deferred to Phase 1 implementation when I can see exactly what's used.
- **Existing in-app links to `/profile-pages/advertiser-profile.html`:** there's a meta-refresh stub left behind, but the in-app navigation should be updated to point at the new subdomain URL directly. Need to grep for hardcoded paths.
- **Production user impact:** the 2 existing advertiser users won't notice anything until Phase 3 — when their `profile-pages/advertiser-profile.html` bookmarks redirect to the subdomain. Both surfaces accept their existing password, so login is unaffected.
- **`advertise.astegni.com` doesn't have its own admin panel.** Admins still moderate advertiser content via `admin.astegni.com`. No change there.

---

## 10. What I'm asking you to decide before code is written

This doc reflects the decisions you've already given. Confirm:

1. **Approve the 3-phase split.** Phase 1 ships before any backend changes; Phase 3 ships last.
2. **Approve no DB migration.** The boundary is enforced via `surface` + role check, not a new column.
3. **Approve deleting `profile-pages/advertiser-profile.html` and replacing it with a redirect stub.** (Confirmed in decision #9 but worth reconfirming.)
4. **Approve the marketing home content direction.** I'll draft Coca-Cola–tier copy in Phase 1; you can rewrite it.

Once confirmed, I start Phase 1.1: create the folder structure + draft `advertise-pages/index.html` for review.
