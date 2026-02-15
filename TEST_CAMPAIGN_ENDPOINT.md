# Testing Campaign Detail Endpoint

## Quick Debugging Steps

### 1. **Check if Backend is Running**
```bash
# Make sure the backend server is running
cd astegni-backend
python app.py
```

Expected output: Server running on `http://localhost:8000`

---

### 2. **Test the Endpoint Directly**

Open your browser console or use curl to test:

**Browser Console (F12):**
```javascript
// Replace {campaign_id} with actual campaign ID (e.g., 1, 2, 3...)
fetch('http://localhost:8000/api/admin-advertisers/campaigns/1')
  .then(res => res.json())
  .then(data => console.log('Success:', data))
  .catch(err => console.error('Error:', err));
```

**Or using curl:**
```bash
curl http://localhost:8000/api/admin-advertisers/campaigns/1
```

---

### 3. **Check Browser Console for Errors**

When you click to view a campaign, open Browser DevTools (F12) and check:

**Console Tab:**
Look for these logs:
```
[ViewModal] Fetching campaign details for ID: X
[ViewModal] API URL: http://localhost:8000/api/admin-advertisers/campaigns/X
[ViewModal] API Response: {...}
[ViewModal] Final campaign data: {...}
```

**Network Tab:**
- Find the request to `/api/admin-advertisers/campaigns/{id}`
- Check Status Code (should be 200)
- Check Response (should contain campaign data)
- Check any CORS errors

---

### 4. **Common Issues & Solutions**

#### **Issue 1: 404 Not Found**
**Cause:** Endpoint not registered or backend not running

**Solution:**
```bash
# Restart backend
cd astegni-backend
python app.py
```

Check that you see: `INFO:     Application startup complete.`

---

#### **Issue 2: 500 Internal Server Error**
**Cause:** Database connection issue or SQL error

**Solution:**
Check backend terminal for error messages. Common fixes:

```bash
# Verify database is running
psql -U astegni_user -d astegni_user_db -c "SELECT COUNT(*) FROM campaign_profile;"

# If no campaigns exist, the endpoint will return 404 with message "Campaign not found"
```

---

#### **Issue 3: Network Error / CORS**
**Cause:** CORS not configured or wrong API URL

**Solution:**

Check `astegni-backend/app.py` has CORS configured:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

#### **Issue 4: Empty/Missing Data**
**Cause:** Campaign exists but brand data is missing

**Solution:**

```sql
-- Check if campaign has valid brand_id
SELECT cp.id, cp.name, cp.brand_id, bp.name as brand_name
FROM campaign_profile cp
LEFT JOIN brand_profile bp ON cp.brand_id = bp.id
WHERE cp.id = 1;

-- If brand_name is NULL, the campaign's brand doesn't exist
-- You may need to fix the data:
UPDATE campaign_profile SET brand_id = {valid_brand_id} WHERE id = 1;
```

---

### 5. **Verify Database Tables Exist**

```bash
# Connect to database
psql -U astegni_user -d astegni_user_db

# Check tables
\dt campaign_profile
\dt campaign_media
\dt campaign_engagement
\dt brand_profile

# Check sample data
SELECT id, name, brand_id, verification_status FROM campaign_profile LIMIT 5;
SELECT id, campaign_id, media_type, placement FROM campaign_media LIMIT 5;
```

---

### 6. **Enhanced Frontend Debugging**

I've already added enhanced logging to the `viewCampaign` function. When you click a campaign, check the console for:

```javascript
[ViewModal] Fetching campaign details for ID: X
[ViewModal] API URL: http://localhost:8000/api/admin-advertisers/campaigns/X
```

If you see an error:
```javascript
[ViewModal] API request failed: 404 Not Found
[ViewModal] Error response: {"detail":"Campaign not found"}
```

This means the campaign ID doesn't exist in the database.

---

### 7. **Test with a Known Campaign**

First, get a valid campaign ID:

```sql
SELECT id, name FROM campaign_profile ORDER BY id LIMIT 1;
```

Then test with that ID:
```javascript
// Replace 1 with the actual ID from the query above
fetch('http://localhost:8000/api/admin-advertisers/campaigns/1')
  .then(res => res.json())
  .then(data => console.log(data))
```

---

### 8. **Check API Documentation**

Visit: `http://localhost:8000/docs`

- Find: `GET /api/admin-advertisers/campaigns/{campaign_id}`
- Click "Try it out"
- Enter a campaign ID
- Click "Execute"
- Check the response

---

## Expected Response Format

```json
{
  "campaign": {
    "id": 1,
    "campaign_name": "Summer Sale 2024",
    "description": "Promotional campaign for summer",
    "objective": "Brand Awareness, Website Traffic",
    "start_date": "2024-06-01",
    "end_date": null,
    "budget": 50000.00,
    "campaign_type": "Standard",
    "ad_type": "Campaign",
    "target_audience": ["student", "tutor"],
    "target_placements": ["leaderboard-banner", "logo"],
    "target_location": "national",
    "target_regions": [],
    "verification_status": "pending",
    "is_verified": false,
    "rejection_reason": null,
    "suspension_reason": null,
    "submit_for_verification": false,
    "cpi_rate": 2.50,
    "created_at": "2024-01-15T10:30:00",
    "updated_at": "2024-01-15T10:30:00",
    "brand_name": "Coca Cola",
    "brand_description": "Leading beverage company",
    "brand_logo": "https://...",
    "brand_category": "Food & Beverage",
    "brand_website": "https://coca-cola.com",
    "brand_id": 5,
    "impressions": 125000,
    "clicks": 3500,
    "conversions": 450,
    "ctr": 2.8,
    "spent": 15000.00,
    "likes": 1250,
    "shares": 340,
    "comments": 89
  }
}
```

---

## If Media Works but Details Don't

This suggests:
1. ✅ Backend is running
2. ✅ API URL is correct
3. ❌ Campaign details endpoint has an issue

**Check:**
- Is the endpoint path correct? `/api/admin-advertisers/campaigns/{id}` (NOT `/media`)
- Does the campaign exist in `campaign_profile` table?
- Is the `brand_id` valid and exists in `brand_profile`?

**SQL Check:**
```sql
-- Verify the exact query the endpoint runs
SELECT
    cp.id,
    cp.name,
    cp.description,
    bp.name as brand_name,
    bp.thumbnail as brand_logo
FROM campaign_profile cp
LEFT JOIN brand_profile bp ON cp.brand_id = bp.id
WHERE cp.id = 1;  -- Replace 1 with your campaign ID

-- If this returns data, the endpoint should work
-- If brand_name is NULL, fix the brand_id relationship
```

---

## Next Steps

1. **Check the browser console** for the new debug logs
2. **Check the Network tab** for the API request status
3. **Test the endpoint directly** using browser console or curl
4. **Verify campaign exists** in the database
5. **Check backend terminal** for any error messages

Let me know what errors you see and I can help fix them! 🔍
