# Advertiser Profile Backend Implementation - Complete Guide

## Overview

This document details the complete backend implementation for the **Advertiser Profile** system in the Astegni platform. The implementation includes database models, API endpoints, migrations, and seed data for managing advertisers and their advertising campaigns.

## Architecture Summary

The advertiser backend follows the same modular architecture as the rest of the platform:

- **Database Models**: `AdvertiserProfile` and `AdCampaign` in `models.py`
- **API Endpoints**: Full CRUD operations in `routes.py`
- **Migration Script**: `migrate_advertiser_tables.py`
- **Seed Data**: `seed_advertiser_data.py`
- **Frontend**: `advertiser-profile.html` with `advertiser-profile.js`

## Database Schema

### 1. AdvertiserProfile Table

Stores advertiser company information and aggregated statistics.

**Key Fields:**
- **Basic Info**: `company_name`, `bio`, `quote`, `location`, `website`, `industry`, `company_size`
- **Media**: `profile_picture`, `cover_image`, `logo`
- **Analytics**: `total_campaigns`, `active_campaigns`, `total_impressions`, `total_clicks`, `total_conversions`, `total_likes`, `total_followers`, `total_spent`
- **Performance**: `average_ctr`, `average_conversion_rate`, `success_rate`
- **Budget**: `total_budget`, `available_budget`, `currency`
- **Status**: `is_verified`, `is_premium`, `is_active`

### 2. AdCampaign Table

Stores individual advertising campaign details and performance metrics.

**Key Fields:**
- **Campaign Details**: `name`, `description`, `objective`, `status`
- **Budget**: `budget`, `spent`, `daily_budget`, `currency`
- **Dates**: `start_date`, `end_date`
- **Targeting**: `target_audience`, `age_range`, `locations`
- **Performance Metrics**: `impressions`, `clicks`, `conversions`, `likes`, `shares`, `comments`, `followers`
- **Calculated Metrics**: `ctr`, `conversion_rate`, `cost_per_click`, `cost_per_conversion`, `engagement_rate`
- **Creative**: `ad_type`, `creative_urls`, `ad_copy`, `call_to_action`, `landing_page_url`
- **Performance Grade**: `performance` (excellent, good, average, poor, pending)

**Campaign Statuses:**
- `draft` - Campaign being created
- `scheduled` - Approved, waiting for start date
- `active` - Currently running
- `paused` - Temporarily stopped
- `completed` - Finished successfully
- `rejected` - Not approved
- `approved` - Ready to schedule
- `under-review` - Pending approval

## API Endpoints

### Advertiser Profile Endpoints

#### 1. Get Current Advertiser Profile
```
GET /api/advertiser/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "user_id": 15,
  "username": "eduads",
  "company_name": "EduAds Ethiopia",
  "bio": "Leading educational advertising agency...",
  "location": "Addis Ababa, Ethiopia",
  "total_campaigns": 5,
  "active_campaigns": 2,
  "total_impressions": 1500000,
  "total_clicks": 95000,
  "total_conversions": 4500,
  "average_ctr": 6.33,
  "average_conversion_rate": 4.74,
  "success_rate": 80.0,
  "is_verified": true,
  "is_premium": true
}
```

#### 2. Update Advertiser Profile
```
PUT /api/advertiser/profile
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "company_name": "EduAds Ethiopia Inc.",
  "bio": "Updated bio...",
  "location": "Addis Ababa, Ethiopia",
  "website": "https://eduads.et",
  "industry": "Education",
  "company_size": "Medium"
}
```

#### 3. Get Public Advertiser Profile
```
GET /api/advertiser/{advertiser_id}
```

### Campaign Management Endpoints

#### 1. Create Campaign
```
POST /api/advertiser/campaigns
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Summer Learning Campaign",
  "description": "Comprehensive summer education program",
  "objective": "lead_generation",
  "budget": 50000,
  "daily_budget": 2000,
  "start_date": "2025-06-01",
  "end_date": "2025-08-31",
  "target_audience": {
    "interests": ["education", "tutoring"],
    "demographics": ["students", "parents"]
  },
  "age_range": {"min": 13, "max": 65},
  "locations": ["Addis Ababa", "Bahir Dar", "Mekelle"],
  "ad_type": "video",
  "ad_copy": "Transform your summer into a learning adventure!",
  "call_to_action": "Enroll Now",
  "platforms": ["web", "mobile", "social_media"]
}
```

**Response:**
```json
{
  "message": "Campaign created successfully",
  "campaign": {
    "id": 12,
    "name": "Summer Learning Campaign",
    "status": "draft",
    ...
  }
}
```

#### 2. Get All Campaigns
```
GET /api/advertiser/campaigns?status=active&page=1&limit=10
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by campaign status
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page

**Response:**
```json
{
  "campaigns": [...],
  "total": 25,
  "page": 1,
  "limit": 10,
  "pages": 3
}
```

#### 3. Get Campaign Details
```
GET /api/advertiser/campaigns/{campaign_id}
Authorization: Bearer <token>
```

#### 4. Update Campaign
```
PUT /api/advertiser/campaigns/{campaign_id}
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Campaign Name",
  "description": "Updated description",
  "status": "active"
}
```

**Note:** Cannot edit active campaigns unless pausing them first.

#### 5. Delete Campaign
```
DELETE /api/advertiser/campaigns/{campaign_id}
Authorization: Bearer <token>
```

**Note:** Cannot delete active campaigns. Unspent budget is refunded for draft/scheduled campaigns.

#### 6. Update Campaign Metrics
```
PUT /api/advertiser/campaigns/{campaign_id}/metrics
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "impressions": 50000,
  "clicks": 3200,
  "conversions": 150,
  "likes": 1800,
  "shares": 320,
  "followers": 450,
  "spent": 12000
}
```

**Auto-Calculated Fields:**
- CTR (Click-Through Rate)
- Conversion Rate
- Cost Per Click
- Cost Per Conversion
- Engagement Rate
- Performance Grade

### Analytics Endpoint

#### Get Advertiser Analytics
```
GET /api/advertiser/analytics
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_campaigns": 25,
  "active_campaigns": 5,
  "total_impressions": 2500000,
  "total_clicks": 180000,
  "total_conversions": 8500,
  "total_likes": 95000,
  "total_followers": 12500,
  "total_spent": 450000,
  "average_ctr": 7.2,
  "average_conversion_rate": 4.72,
  "success_rate": 76.0,
  "campaigns_by_status": {
    "active": 5,
    "scheduled": 3,
    "completed": 12,
    "draft": 4,
    "paused": 1
  },
  "top_performing_campaigns": [...]
}
```

## Installation & Setup

### Step 1: Run Migration

Create the database tables:

```bash
cd astegni-backend
python migrate_advertiser_tables.py
```

**Expected Output:**
```
Starting advertiser tables migration...
Creating advertiser_profiles table...
✓ advertiser_profiles table created successfully
Creating ad_campaigns table...
✓ ad_campaigns table created successfully
Creating indexes...
✓ Indexes created successfully

✅ Migration completed successfully!
```

### Step 2: Seed Sample Data

Populate with sample advertisers and campaigns:

```bash
python seed_advertiser_data.py
```

**Expected Output:**
```
Starting advertiser data seeding...
============================================================
[1/5] Creating advertiser: EduAds Ethiopia
  ✓ Created advertiser profile (ID: 1)
    ✓ Created campaign: Summer Education Drive (active)
    ✓ Created campaign: Back to School Campaign (scheduled)
    ✓ Created campaign: Math Tutoring Promo (active)
  ✓ Updated advertiser statistics
...
✅ Seeding completed successfully!
   Advertisers created: 5
   Campaigns created: 15

Sample Login Credentials:
   Email: contact@eduads.et
   Password: advertiser123
============================================================
```

### Step 3: Test the Backend

Start the backend server:

```bash
python app.py
```

Access the API documentation at: `http://localhost:8000/docs`

## Frontend Integration

### Current State

The `advertiser-profile.html` currently uses hardcoded sample data in `advertiser-profile.js`.

### Integration Steps

1. **Update API Base URL** (if different):
```javascript
// In js/advertiser-profile/advertiser-profile.js
const API_BASE_URL = 'http://localhost:8000';
```

2. **Replace Sample Data with API Calls**:

Example for loading profile:
```javascript
async function loadAdvertiserProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/advertiser/profile`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) throw new Error('Failed to load profile');

        const profile = await response.json();
        updateProfileUI(profile);
    } catch (error) {
        console.error('Error loading profile:', error);
        showErrorNotification('Failed to load profile data');
    }
}
```

Example for loading campaigns:
```javascript
async function loadCampaigns(status = 'all') {
    try {
        let url = `${API_BASE_URL}/api/advertiser/campaigns?page=1&limit=20`;
        if (status !== 'all') {
            url += `&status=${status}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) throw new Error('Failed to load campaigns');

        const data = await response.json();
        AppState.campaigns = data.campaigns;
        renderCampaigns();
    } catch (error) {
        console.error('Error loading campaigns:', error);
        showErrorNotification('Failed to load campaigns');
    }
}
```

3. **Implement Create Campaign**:
```javascript
async function createCampaign(campaignData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/advertiser/campaigns`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(campaignData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create campaign');
        }

        const data = await response.json();
        showSuccessNotification('Campaign created successfully!');
        loadCampaigns(); // Reload campaigns
        closeModal('create-campaign-modal');
    } catch (error) {
        console.error('Error creating campaign:', error);
        showErrorNotification(error.message);
    }
}
```

## Performance Metrics Calculation

The system automatically calculates performance metrics when campaign metrics are updated:

**CTR (Click-Through Rate):**
```
CTR = (clicks / impressions) × 100
```

**Conversion Rate:**
```
Conversion Rate = (conversions / clicks) × 100
```

**Cost Per Click:**
```
CPC = spent / clicks
```

**Cost Per Conversion:**
```
Cost Per Conversion = spent / conversions
```

**Engagement Rate:**
```
Engagement Rate = (likes / impressions) × 100
```

**Performance Grade:**
- **Excellent**: CTR ≥ 5% AND Conversion Rate ≥ 10%
- **Good**: CTR ≥ 3% AND Conversion Rate ≥ 5%
- **Average**: CTR ≥ 1%
- **Poor**: CTR < 1%
- **Pending**: Draft, Scheduled, or Under Review status

## Sample Data Details

### 5 Sample Advertisers Created:
1. **EduAds Ethiopia** - Medium, Premium, Verified
2. **Smart Learning Solutions** - Small
3. **Ethiopian Education Network** - Large, Premium, Verified
4. **Habesha Tutors Marketing** - Small
5. **Addis Learning Center** - Medium, Premium, Verified

### 15+ Sample Campaigns with Various Statuses:
- Active campaigns with realistic performance data
- Scheduled campaigns for future dates
- Completed campaigns with full metrics
- Draft campaigns in preparation
- Under-review campaigns pending approval

## Testing the API

### 1. Login as Advertiser
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contact@eduads.et",
    "password": "advertiser123"
  }'
```

Save the `access_token` from the response.

### 2. Get Profile
```bash
curl http://localhost:8000/api/advertiser/profile \
  -H "Authorization: Bearer <your_token>"
```

### 3. Get Campaigns
```bash
curl "http://localhost:8000/api/advertiser/campaigns?status=active" \
  -H "Authorization: Bearer <your_token>"
```

### 4. Get Analytics
```bash
curl http://localhost:8000/api/advertiser/analytics \
  -H "Authorization: Bearer <your_token>"
```

## Security & Validation

- **Role-Based Access**: All endpoints check for "advertiser" role
- **Budget Validation**: Cannot create campaigns exceeding available budget
- **Edit Protection**: Cannot edit/delete active campaigns without pausing first
- **Ownership Verification**: Users can only access their own campaigns
- **Input Validation**: Pydantic schemas validate all request data

## Error Handling

Common error responses:

```json
{
  "detail": "User does not have advertiser role"
}
```

```json
{
  "detail": "Insufficient budget"
}
```

```json
{
  "detail": "Cannot edit active campaign. Pause it first."
}
```

```json
{
  "detail": "Campaign not found"
}
```

## Next Steps

1. ✅ Database models created
2. ✅ API endpoints implemented
3. ✅ Migration script ready
4. ✅ Seed data available
5. ⏳ Frontend integration (update JS to use real APIs)
6. ⏳ File upload integration for campaign creatives
7. ⏳ Real-time analytics dashboard
8. ⏳ Campaign approval workflow
9. ⏳ Payment integration for budget management

## Files Modified/Created

### Created Files:
- `astegni-backend/migrate_advertiser_tables.py` - Migration script
- `astegni-backend/seed_advertiser_data.py` - Sample data seeder
- `ADVERTISER-PROFILE-BACKEND-IMPLEMENTATION.md` - This documentation

### Modified Files:
- `astegni-backend/app.py modules/models.py` - Added `AdvertiserProfile` and `AdCampaign` models + Pydantic schemas
- `astegni-backend/app.py modules/routes.py` - Added 9 new advertiser endpoints + helper function

## Support & Troubleshooting

**Issue**: Migration fails with "table already exists"
**Solution**: Tables are created with `IF NOT EXISTS`, so this is safe to ignore.

**Issue**: Seeding fails with "user already exists"
**Solution**: Script checks for existing data and prompts for confirmation.

**Issue**: 403 Forbidden when accessing endpoints
**Solution**: Ensure user has "advertiser" role in their JWT token.

**Issue**: Budget validation error
**Solution**: Update `available_budget` in advertiser profile or allocate more budget.

## Ethiopian Context

All sample data includes Ethiopian-specific details:
- Ethiopian company names
- Ethiopian cities (Addis Ababa, Bahir Dar, Mekelle, Hawassa)
- Ethiopian phone number format (+251...)
- Ethiopian Birr (ETB) currency
- Education-focused campaigns
- Realistic Ethiopian market budgets

---

**Implementation Status**: ✅ **COMPLETE**
**Backend Ready**: ✅ **YES**
**Tested**: ⏳ **Awaiting Integration Testing**
**Production Ready**: ⏳ **After Frontend Integration**

For questions or issues, refer to the main CLAUDE.md documentation or the Astegni platform README.
