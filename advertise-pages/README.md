# advertise.astegni.com

Subdomain surface for advertiser onboarding and dashboard access. Same repo,
same backend, separate folder — mirrors the `admin-pages/` pattern used by
`admin.astegni.com`.

See the top-level [DESIGN_advertise_subdomain.md](../DESIGN_advertise_subdomain.md)
for the full design rationale.

## Layout

```
advertise-pages/
  index.html               Marketing home + entry point for login/signup modals
  advertiser-profile.html  Authenticated dashboard (moved from profile-pages/)
  README.md                This file

  js/
    config.js              API_BASE_URL detection + SURFACE='advertise'
    advertise-home.js      Modal loader + signup/login form handlers

  css/
    advertise-home.css     Marketing page + auth modal styles

  modals/
    login-modal.html       Email/password login
    signup-modal.html      Email/password signup (no OTP — /api/register returns JWT directly)
```

Shared assets (CSS/JS/modals used by the dashboard) live at the repo root and
are referenced via `../css/...`, `../js/...`, `../modals/...` from inside this
folder. **Do not duplicate** those files here — both `profile-pages/` and
`advertise-pages/` are siblings of the repo root, so the relative paths
resolve to the same files.

## Local development

The dev server (`python dev-server.py`) hosts the whole repo from port 8081.
Visit:

- Marketing home: `http://localhost:8081/advertise-pages/index.html`
- Dashboard:      `http://localhost:8081/advertise-pages/advertiser-profile.html`

The backend (`python astegni-backend/app.py`) stays the same — both surfaces
hit `http://localhost:8000` in dev and `https://api.astegni.com` in production
(detected automatically in [js/config.js](js/config.js)).

The old `profile-pages/advertiser-profile.html` is now a redirect stub that
sends visitors to `advertise.astegni.com/advertiser-profile.html` in production
and to `/advertise-pages/advertiser-profile.html` in development.

## Production deployment (Phase 1)

### DNS

Add an A record:

```
advertise.astegni.com.   A   128.140.122.215
```

### Nginx

Add a new server block on the production server. **The docroot is the repo
root**, not `advertise-pages/`, so that the relative `../css/...` and
`../js/...` references inside `advertiser-profile.html` resolve correctly
(nginx would otherwise refuse to serve files outside the docroot).

```nginx
server {
    listen 80;
    server_name advertise.astegni.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name advertise.astegni.com;

    ssl_certificate     /etc/letsencrypt/live/advertise.astegni.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/advertise.astegni.com/privkey.pem;

    root /var/www/astegni;

    # `/` → marketing home
    location = / {
        rewrite ^ /advertise-pages/index.html last;
    }

    # `/advertiser-profile.html` (or any top-level file the advertise surface owns)
    # is served from advertise-pages/
    location = /advertiser-profile.html {
        rewrite ^ /advertise-pages/advertiser-profile.html last;
    }

    # Static asset fallthrough
    location / {
        try_files $uri $uri/ =404;
    }
}
```

### SSL

```bash
ssh root@128.140.122.215
certbot --nginx -d advertise.astegni.com
systemctl reload nginx
```

### Smoke test after deploy

```bash
curl -I https://advertise.astegni.com/                         # should 200
curl -I https://advertise.astegni.com/advertiser-profile.html  # should 200
curl -I https://astegni.com/profile-pages/advertiser-profile.html  # should serve redirect stub
```

## Phase 2 (separate commit)

Backend changes:
- Accept `surface` field on `/api/register` and `/api/login`
- When `surface='advertise'`:
  - Signup must request `role='advertiser'`
  - Login must require `"advertiser" ∈ user.roles`
- Reject `role='advertiser'` from `surface='platform'` signups

The frontend already passes `surface='advertise'` in Phase 1 — extra fields
are ignored by the existing `UserRegister` model until the backend starts
honoring them in Phase 2.

## Phase 3 (separate commit)

Main astegni.com cleanup: remove "advertiser" from the multi-role picker, add
a "Advertise on Astegni" footer link pointing to this subdomain.
