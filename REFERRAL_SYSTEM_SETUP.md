# Referral & Share System - Complete Setup Guide

## Overview
A comprehensive referral tracking system that allows users to share their profiles and track who registered using their unique referral links.

## Features
✅ Unique referral codes per user/profile
✅ Share modal with multiple sharing options (WhatsApp, Facebook, Twitter, Telegram, Email)
✅ Referral dashboard with analytics and statistics
✅ Track clicks, registrations, and conversion rates
✅ Automatic referral attribution during registration
✅ Referral link buttons on all profile pages

---

## Setup Instructions

### 1. Run Database Migration

```bash
cd astegni-backend
python migrate_add_referral_system.py
```

This creates 3 tables:
- `user_referral_codes` - Stores unique referral codes
- `referral_registrations` - Tracks referred users
- `referral_clicks` - Analytics for link clicks

### 2. Restart Backend Server

```bash
# Stop backend if running (Ctrl+C)
python app.py
```

The new referral endpoints are now available at:
- `GET /api/referrals/my-code`
- `POST /api/referrals/track-click`
- `POST /api/referrals/register-referral`
- `GET /api/referrals/my-referrals`
- `GET /api/referrals/stats`
- `DELETE /api/referrals/referral/{id}`

### 3. Load Share Scripts in Profile Pages

The share system scripts need to be loaded in each profile page HTML file.

**Add these scripts BEFORE closing `</body>` tag in:**

- `profile-pages/tutor-profile.html`
- `profile-pages/student-profile.html`
- `profile-pages/parent-profile.html`
- `profile-pages/advertiser-profile.html`
- `profile-pages/user-profile.html`

```html
<!-- Share Profile Manager -->
<script src="../js/common-modals/share-profile-manager.js"></script>

<!-- Referral Dashboard Manager -->
<script src="../js/common-modals/referral-dashboard-manager.js"></script>
```

---

## How It Works

### For Sharers (Referrers)

1. **Click Share Button** on their profile page
   → Opens share modal with unique referral link

2. **Share via:**
   - Copy link
   - WhatsApp
   - Facebook
   - Twitter
   - Telegram
   - Email
   - Native share (mobile)

3. **View Analytics** in Referral Dashboard
   - Total clicks on referral link
   - Total registrations
   - Active referrals
   - Conversion rate
   - List of referred users with details

### For New Users (Referred)

1. **Click referral link** (e.g., `https://astegni.com?ref=T1234XYZ`)
2. **Register account** - referral code automatically captured
3. **Referrer gets credit** - registration tracked in their dashboard

---

## Database Schema

### `user_referral_codes`
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY → users.id)
- referral_code (UNIQUE) - Format: {ProfilePrefix}{UserID}{Random6}
- profile_type (tutor/student/parent/advertiser)
- total_referrals (count of all registrations)
- active_referrals (count of active users)
- created_at
- updated_at
```

**Example Codes:**
- `T1234ABC123` - Tutor user_id=1234
- `S5678XYZ789` - Student user_id=5678
- `P9012DEF456` - Parent user_id=9012

### `referral_registrations`
```sql
- id (PRIMARY KEY)
- referrer_user_id (FOREIGN KEY → users.id)
- referrer_profile_type
- referral_code
- referred_user_id (UNIQUE, FOREIGN KEY → users.id)
- referred_user_email
- referred_user_name
- registration_date
- is_active (true/false)
- last_activity
- notes
```

### `referral_clicks`
```sql
- id (PRIMARY KEY)
- referral_code
- clicked_at
- ip_address
- user_agent
- converted (true/false)
- converted_user_id (FOREIGN KEY → users.id)
```

---

## API Endpoints

### Get My Referral Code
```
GET /api/referrals/my-code?profile_type=tutor
Authorization: Bearer {token}

Response:
{
  "referral_code": "T1234ABC123",
  "profile_type": "tutor",
  "total_referrals": 15,
  "active_referrals": 12,
  "share_url": "http://localhost:8081?ref=T1234ABC123",
  "created_at": "2025-01-15T10:30:00"
}
```

### Track Referral Click
```
POST /api/referrals/track-click
{
  "referral_code": "T1234ABC123"
}

Response:
{
  "message": "Click tracked successfully",
  "referral_code": "T1234ABC123"
}
```

### Get My Referrals
```
GET /api/referrals/my-referrals?profile_type=tutor
Authorization: Bearer {token}

Response:
[
  {
    "id": 1,
    "referred_user_id": 5678,
    "referred_user_email": "user@example.com",
    "referred_user_name": "John Doe",
    "registration_date": "2025-01-20T14:20:00",
    "is_active": true,
    "last_activity": "2025-01-25T09:15:00"
  }
]
```

### Get Referral Stats
```
GET /api/referrals/stats?profile_type=tutor
Authorization: Bearer {token}

Response:
{
  "total_clicks": 150,
  "total_registrations": 15,
  "active_referrals": 12,
  "conversion_rate": 10.0,
  "recent_referrals": [...]
}
```

---

## File Structure

```
astegni-backend/
├── migrate_add_referral_system.py          # Database migration
├── referral_endpoints.py                   # API endpoints
├── app.py modules/
│   ├── models.py                           # Database & Pydantic models
│   └── routes.py                           # Updated registration flow
└── app.py                                  # Include referral router

modals/common-modals/
├── share-profile-modal.html                # Share modal UI
└── referral-dashboard-modal.html           # Dashboard UI

js/common-modals/
├── share-profile-manager.js                # Share functionality
└── referral-dashboard-manager.js           # Dashboard functionality

js/parent-profile/
└── global-functions.js                     # Added shareProfile()

view-profiles/
├── view-student.html                       # Added share button & function
├── view-parent.html                        # Added share button & function
└── view-advertiser.html                    # Added share button & function

profile-pages/
└── parent-profile.html                     # Fixed share button
```

---

## Testing Guide

### 1. Test Share Button

1. Login to any profile (tutor/student/parent/advertiser)
2. Click **Share** button (🔗 icon)
3. Verify modal opens with:
   - Profile info
   - Referral code
   - Share link
   - Social share buttons
   - Statistics

### 2. Test Referral Link

1. Copy referral link from share modal
2. Open in incognito/private window
3. Verify URL contains `?ref=XXXXX` parameter
4. Register a new account
5. Check referrer's dashboard - new referral should appear

### 3. Test Dashboard

1. Click "View Detailed Analytics" in share modal
   OR click referral dashboard menu item
2. Verify dashboard shows:
   - Stats cards (clicks, registrations, conversion rate)
   - Table of referred users
   - Share link with copy button

### 4. Test All Share Options

- **Copy Link** → Copies to clipboard
- **WhatsApp** → Opens WhatsApp with pre-filled message
- **Facebook** → Opens Facebook share dialog
- **Twitter** → Opens Twitter compose
- **Telegram** → Opens Telegram share
- **Email** → Opens email client with pre-filled body

### 5. Test View Profile Pages

1. Visit `/view-profiles/view-student.html?id=123`
2. Verify **Share** button appears
3. Click share → link should be copied to clipboard
4. Repeat for view-parent, view-advertiser, view-tutor

---

## Configuration

### Production URL

Update `API_BASE_URL` in share manager files for production:

**js/common-modals/share-profile-manager.js:**
```javascript
const API_BASE_URL = window.location.hostname === 'astegni.com'
    ? 'https://api.astegni.com'
    : 'http://localhost:8000';
```

**js/common-modals/referral-dashboard-manager.js:**
```javascript
const API_BASE_URL = window.location.hostname === 'astegni.com'
    ? 'https://api.astegni.com'
    : 'http://localhost:8000';
```

---

## Troubleshooting

### Share button doesn't work
- Check browser console for errors
- Verify scripts are loaded: `share-profile-manager.js`, `referral-dashboard-manager.js`
- Check if user is logged in

### Referral code not generated
- Verify migration ran successfully
- Check backend logs for errors
- Ensure user has active role selected

### Registration doesn't track referral
- Check URL contains `?ref=` parameter
- Verify referral code exists in database
- Check backend logs for `[REFERRAL]` messages

### Share modal doesn't load
- Check modal HTML file exists at `/modals/common-modals/share-profile-modal.html`
- Verify no JavaScript errors in console
- Check if modal loader function is defined

---

## Future Enhancements

- **Rewards System**: Give points/credits for successful referrals
- **Referral Tiers**: Bronze/Silver/Gold based on referral count
- **Custom Referral Codes**: Let users choose their own codes
- **QR Code Generation**: Generate QR codes for easy sharing
- **Email Notifications**: Notify referrers when someone registers
- **Leaderboard**: Show top referrers
- **Referral Campaigns**: Time-limited referral bonuses

---

## Support

For issues or questions:
- Check console logs
- Review backend error logs
- Verify database migration completed
- Ensure all files are in correct locations

## Summary

The referral system is now fully integrated into Astegni. Users can:
1. Share their profiles with unique referral links
2. Track registrations in real-time
3. View analytics and statistics
4. Share via multiple platforms

All profile pages now have working share buttons, and the registration flow automatically captures and attributes referrals.
