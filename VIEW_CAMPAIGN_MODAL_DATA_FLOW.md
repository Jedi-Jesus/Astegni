# View Campaign Modal - Data Flow Documentation

## Overview
The `view-campaign-modal` in the admin dashboard now properly fetches campaign details and media from the database tables.

## Data Flow Architecture

### 1. **Campaign Creation Flow**
When an advertiser creates a campaign in [campaign-modal.html](modals/advertiser-profile/campaign-modal.html):

```
User fills form → submitCreateCampaign() → POST /api/advertiser/campaigns/create-with-deposit
                                          ↓
                                   Saves to campaign_profile table
                                          ↓
                                   Returns campaign ID
```

**Database Table: `campaign_profile`**
- Location: `astegni_user_db`
- Stores: name, description, objective, budget, targeting, dates, verification status
- Backend: [campaign_deposit_endpoints.py:153-194](astegni-backend/campaign_deposit_endpoints.py#L153-L194)

---

### 2. **Campaign Media Upload Flow**
When advertisers upload images/videos:

```
User uploads file → submitMediaUpload() → POST /api/upload/campaign-media
                                        ↓
                           Uploads to Backblaze B2 Cloud Storage
                                        ↓
                           Saves metadata to campaign_media table
```

**Storage Locations:**

#### a) **Backblaze B2 (Actual Files)**
- Path: `images/profile_{advertiser_id}/{brand_name}/{campaign_name}/{placement}/`
- Example: `images/profile_42/Coca_Cola/Summer_Campaign/leaderboard-banner/banner.jpg`
- Backend: [app.py modules/routes.py:7506](astegni-backend/app.py modules/routes.py#L7506)

#### b) **Database Table: `campaign_media`**
- Location: `astegni_user_db`
- Stores: campaign_id, brand_id, media_type, file_url, file_name, file_size, placement
- Backend: [app.py modules/routes.py:7527-7545](astegni-backend/app.py modules/routes.py#L7527-L7545)

---

### 3. **Admin View Campaign Modal Flow**
When admin clicks to view a campaign in [manage-campaign.html](admin-pages/manage-campaign.html):

```
Admin clicks campaign → viewCampaign(campaignDataStr, status)
                              ↓
                  Fetches from TWO endpoints:
                              ↓
        ┌─────────────────────┴─────────────────────┐
        ↓                                           ↓
GET /api/admin-advertisers/campaigns/{id}   GET /api/admin-advertisers/campaigns/{id}/media
        ↓                                           ↓
Fetches from:                              Fetches from:
- campaign_profile                         - campaign_media
- brand_profile
- campaign_engagement
        ↓                                           ↓
Returns campaign details                   Returns array of images/videos
```

---

## API Endpoints (Backend)

### **1. Get Campaign Details**
**Endpoint:** `GET /api/admin-advertisers/campaigns/{campaign_id}`

**File:** [admin_advertisers_endpoints.py:1163](astegni-backend/admin_advertisers_endpoints.py#L1163)

**Fetches From:**
- `campaign_profile` - Basic campaign info
- `brand_profile` - Brand details (JOIN on brand_id)
- `campaign_engagement` - Performance metrics (impressions, clicks, conversions)

**Response:**
```json
{
  "campaign": {
    "id": 1,
    "campaign_name": "Summer Sale 2024",
    "description": "...",
    "budget": 50000,
    "brand_name": "Coca Cola",
    "brand_logo": "https://...",
    "impressions": 125000,
    "clicks": 3500,
    "ctr": 2.8,
    "spent": 15000,
    "verification_status": "verified",
    "target_audience": ["student", "tutor"],
    "target_placements": ["leaderboard-banner", "logo"]
  }
}
```

---

### **2. Get Campaign Media**
**Endpoint:** `GET /api/admin-advertisers/campaigns/{campaign_id}/media`

**File:** [admin_advertisers_endpoints.py:1278](astegni-backend/admin_advertisers_endpoints.py#L1278)

**Fetches From:**
- `campaign_media` table

**Response:**
```json
{
  "media": [
    {
      "id": 1,
      "campaign_id": 1,
      "media_type": "image",
      "file_url": "https://backblaze-url.com/images/profile_42/...",
      "file_name": "banner_001.jpg",
      "file_size": 245678,
      "placement": "leaderboard-banner"
    },
    {
      "id": 2,
      "media_type": "video",
      "file_url": "https://backblaze-url.com/videos/profile_42/...",
      "placement": "in-session-skyscrapper-banner"
    }
  ],
  "total": 2,
  "images": 1,
  "videos": 1
}
```

---

## Frontend Implementation

### **Location:** [manage-advertisers-standalone.js:1080](admin-pages/js/admin-pages/manage-advertisers-standalone.js#L1080)

### **Function: `viewCampaign(campaignDataStr, status)`**

**Flow:**
1. Parse campaign data from list
2. Fetch full details: `GET /api/admin-advertisers/campaigns/{id}`
3. Populate modal fields (brand, campaign info, stats)
4. Call `loadCampaignMedia(campaignId)`
5. Fetch media: `GET /api/admin-advertisers/campaigns/{id}/media`
6. Render images and videos in separate tabs

### **Function: `loadCampaignMedia(campaignId)`**

**Location:** [manage-advertisers-standalone.js:1212](admin-pages/js/admin-pages/manage-advertisers-standalone.js#L1212)

**Flow:**
1. Fetch media from API
2. Separate into images and videos arrays
3. Render in grids with lightbox support

---

## Database Schema

### **campaign_profile Table**
```sql
CREATE TABLE campaign_profile (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    objective VARCHAR(100),
    brand_id INTEGER REFERENCES brand_profile(id),
    advertiser_id INTEGER,
    campaign_budget NUMERIC(10,2),
    amount_used NUMERIC(10,2),
    remaining_balance NUMERIC(10,2),
    target_audiences TEXT[],
    target_placements TEXT[],
    target_location VARCHAR(50),
    target_regions TEXT[],
    verification_status VARCHAR(50),
    is_verified BOOLEAN,
    status_reason TEXT,
    cpi_rate NUMERIC(10,4),
    start_date DATE,
    ended_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### **campaign_media Table**
```sql
CREATE TABLE campaign_media (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaign_profile(id),
    brand_id INTEGER REFERENCES brand_profile(id),
    advertiser_id INTEGER,
    media_type VARCHAR(10), -- 'image' or 'video'
    file_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    placement VARCHAR(100), -- 'leaderboard-banner', 'logo', etc.
    content_type VARCHAR(50),
    folder_path TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### **campaign_engagement Table**
```sql
CREATE TABLE campaign_engagement (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaign_profile(id),
    impression_count INTEGER,
    click_count INTEGER,
    conversion_count INTEGER,
    like_count INTEGER,
    share_count INTEGER,
    comment_count INTEGER,
    engagement_date DATE,
    created_at TIMESTAMP
);
```

---

## Complete Request Flow Example

### **When Admin Views Campaign #42:**

1. **Initial Click:**
   ```javascript
   viewCampaign('{"id":42,"name":"Summer Sale"}', 'verified')
   ```

2. **Fetch Campaign Details:**
   ```
   GET /api/admin-advertisers/campaigns/42

   → Queries:
     - campaign_profile WHERE id = 42
     - JOIN brand_profile ON brand_id
     - SUM campaign_engagement WHERE campaign_id = 42

   → Returns: Campaign object with all details
   ```

3. **Fetch Campaign Media:**
   ```
   GET /api/admin-advertisers/campaigns/42/media

   → Queries:
     - campaign_media WHERE campaign_id = 42

   → Returns: Array of media objects with Backblaze URLs
   ```

4. **Modal Renders:**
   - Brand section: Shows brand_name, brand_logo, brand_description
   - Campaign section: Shows campaign_name, budget, dates, description
   - Stats section: Shows impressions, clicks, CTR, spent (if verified)
   - Media tabs: Shows images and videos with placements

---

## Key Points

1. **Dual Storage:**
   - Actual files: Backblaze B2 cloud storage
   - Metadata: PostgreSQL `campaign_media` table

2. **Organized Folder Structure:**
   - `images/profile_{id}/{brand}/{campaign}/{placement}/`
   - Makes it easy to find files by advertiser, brand, campaign, and placement

3. **Performance Metrics:**
   - Aggregated from `campaign_engagement` table
   - Calculated on-the-fly (SUM of impression_count, click_count, etc.)

4. **Verification Workflow:**
   - Campaign created → verification_status = 'pending'
   - Admin reviews → Can verify/reject/suspend
   - Status stored in `campaign_profile.verification_status`

---

## Testing the Integration

### **1. Create a Campaign:**
```bash
# Advertiser creates campaign
POST /api/advertiser/campaigns/create-with-deposit
{
  "brand_id": 5,
  "name": "Test Campaign",
  "description": "Test",
  "planned_budget": 10000,
  "cpi_rate": 2.5,
  ...
}
```

### **2. Upload Media:**
```bash
# Advertiser uploads image
POST /api/upload/campaign-media
FormData:
  - file: banner.jpg
  - campaign_id: 42
  - brand_id: 5
  - ad_placement: "leaderboard-banner"
```

### **3. Admin Views:**
```bash
# Admin fetches campaign
GET /api/admin-advertisers/campaigns/42

# Admin fetches media
GET /api/admin-advertisers/campaigns/42/media
```

---

## Files Modified/Created

### **Backend:**
- ✅ [admin_advertisers_endpoints.py](astegni-backend/admin_advertisers_endpoints.py) - Added 2 new endpoints

### **Frontend:**
- ✅ [manage-advertisers-standalone.js](admin-pages/js/admin-pages/manage-advertisers-standalone.js) - Uses new endpoints
- ✅ [manage-campaign.html](admin-pages/manage-campaign.html) - View modal structure

### **Database:**
- ✅ `campaign_profile` - Campaign details
- ✅ `campaign_media` - Media metadata
- ✅ `campaign_engagement` - Performance metrics
- ✅ `brand_profile` - Brand information

---

## Summary

The `view-campaign-modal` now fetches data from:

| Data Type | Table | Endpoint |
|-----------|-------|----------|
| Campaign Details | `campaign_profile` + `brand_profile` | `GET /campaigns/{id}` |
| Performance Stats | `campaign_engagement` | `GET /campaigns/{id}` (aggregated) |
| Images/Videos | `campaign_media` | `GET /campaigns/{id}/media` |
| Actual Files | Backblaze B2 | URLs in `campaign_media.file_url` |

All endpoints are now implemented and ready to use! 🎉
