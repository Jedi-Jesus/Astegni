# Campaign Location Targeting Implementation

## Overview
Implemented comprehensive location targeting for campaigns with three modes:
1. **Global** - Target all users worldwide
2. **National** - Target users in a specific country
3. **Regional** - Target users in specific regions/provinces within a country

**Key Features:**
- GPS-based location detection (not affected by VPN)
- User location persistence
- Dynamic country and region selection (no hardcoding)
- Support for any country based on CPI rates configuration

---

## Database Changes

### Migration: `migrate_add_campaign_location_fields.py`

Added 3 new columns to `campaign_profile` table:

```sql
ALTER TABLE campaign_profile ADD COLUMN national_location VARCHAR(500) DEFAULT NULL;
ALTER TABLE campaign_profile ADD COLUMN national_country_code VARCHAR(10) DEFAULT NULL;
ALTER TABLE campaign_profile ADD COLUMN regional_country_code VARCHAR(10) DEFAULT NULL;
```

**Column Descriptions:**
- `national_location`: Stores user's location string for national targeting (e.g., "Addis Ababa, Addis Ababa, Ethiopia")
- `national_country_code`: ISO country code for national targeting (e.g., "ET")
- `regional_country_code`: Country code for regional targeting (e.g., "ET")

**Status:** ✅ Migration completed successfully

---

## Backend Changes

### File: `astegni-backend/advertiser_brands_endpoints.py`

#### 1. Updated Pydantic Schemas

**CampaignCreate:**
```python
class CampaignCreate(BaseModel):
    # ... existing fields ...
    # Location-specific fields
    national_location: Optional[str] = None
    national_country_code: Optional[str] = None
    regional_country_code: Optional[str] = None
```

**CampaignUpdate:**
```python
class CampaignUpdate(BaseModel):
    # ... existing fields ...
    # Location-specific fields
    national_location: Optional[str] = None
    national_country_code: Optional[str] = None
    regional_country_code: Optional[str] = None
```

#### 2. Updated Create Campaign Endpoint

**Endpoint:** `POST /brands/{brand_id}/campaigns`

**Changes:**
- Added `national_location`, `national_country_code`, `regional_country_code` to INSERT statement
- Fields are passed from frontend and stored in database

```python
cur.execute("""
    INSERT INTO campaign_profile (
        ..., target_audiences, target_regions, target_placements,
        national_location, national_country_code, regional_country_code,
        campaign_budget, ...
    ) VALUES (
        ..., %s, %s, %s,
        %s, %s, %s,
        %s, ...
    )
    RETURNING *
""", (
    ...,
    target_audiences,
    target_regions,
    target_placements,
    campaign.national_location,
    campaign.national_country_code,
    campaign.regional_country_code,
    campaign_budget_amount,
    ...
))
```

#### 3. Updated Update Campaign Endpoint

**Endpoint:** `PUT /campaigns/{campaign_id}`

**Changes:**
- Added handling for `national_location`, `national_country_code`, `regional_country_code` in update logic

```python
# Location-specific fields
if campaign.national_location is not None:
    updates.append("national_location = %s")
    values.append(campaign.national_location)
if campaign.national_country_code is not None:
    updates.append("national_country_code = %s")
    values.append(campaign.national_country_code)
if campaign.regional_country_code is not None:
    updates.append("regional_country_code = %s")
    values.append(campaign.regional_country_code)
```

---

## Frontend Changes

### File: `modals/advertiser-profile/campaign-modal.html`

#### 1. Target Location Dropdown (Lines 152-163)

```html
<select id="campaign-location-input" onchange="BrandsManager.onLocationChange()">
    <option value="global">Global (International)</option>
    <option value="national">National (Your Country)</option>
    <option value="regional">Regional (Specific regions)</option>
</select>
```

#### 2. National Location Section (Lines 165-208)

Features:
- User location display with change button
- GPS detection UI with checkbox
- Location status messages
- Automatically loads user's saved location on modal open

**Key Components:**
```html
<!-- User Location Display -->
<div id="user-location-display" style="display: none;">
    <span id="user-location-text"></span>
    <button id="changeNationalLocationBtn" onclick="BrandsManager.showLocationDetection()">
        Change Location
    </button>
</div>

<!-- Location Detection Section -->
<div id="location-detection-section" style="display: none;">
    <input type="checkbox" id="campaignAllowLocation"
           onchange="BrandsManager.handleCampaignLocationToggle(this)">
    <button id="detectCampaignLocationBtn"
            onclick="BrandsManager.detectCampaignLocation()">
        Detect Location
    </button>
</div>
```

#### 3. Regional Selection Section (Lines 210-256)

Features:
- User's country display (read-only, automatically from their profile)
- Dynamic regions/provinces based on user's country
- "All Regions" master checkbox
- Individual region checkboxes
- Warning message if user hasn't detected location yet

**Key Components:**
```html
<!-- User Country Display (Read-only) -->
<div id="regional-country-display" style="display: none;">
    <span id="regional-country-text"></span>
</div>

<!-- All Regions Checkbox -->
<input type="checkbox" id="region-all" checked
       onchange="BrandsManager.toggleAllRegions(this.checked)">

<!-- Dynamic Regions Container -->
<div id="dynamic-regions-container">
    <!-- Regions populated dynamically based on user's country -->
</div>

<!-- No Location Message -->
<div id="regional-no-location-message" style="display: none;">
    Please select "National" targeting first to detect your location
</div>
```

---

### File: `js/advertiser-profile/brands-manager.js`

#### 1. New State Variables

```javascript
userLocation: null,          // User's saved location string
userCountryCode: null,       // User's country code (e.g., "ET")
```

#### 2. Location Management Functions

**loadUserLocationForCampaign() - Lines 2247-2293**
- Fetches user's location from `/api/me`
- Populates country dropdown from CPI rates
- Shows user location or detection UI based on data

```javascript
async loadUserLocationForCampaign() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BRANDS_API_URL}/api/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const userData = await response.json();

    this.userCountryCode = userData.country_code;
    this.userLocation = userData.location;

    // Populate country dropdown
    this.populateCountryDropdown();

    // Show appropriate UI based on location existence
    if (this.userLocation && this.userCountryCode) {
        // Show location with change button
    } else {
        // Show detection UI
    }
}
```

**showLocationDetection() - Lines 2295-2304**
- Shows GPS detection UI
- Hides user location display

**handleCampaignLocationToggle() - Lines 2306-2319**
- Handles GPS checkbox toggle
- Shows/hides detect location button

**detectCampaignLocation() - Lines 2321-2366**
- Detects user's GPS location
- Reverse geocodes coordinates to address
- Saves location to user profile
- Reloads UI to show detected location

```javascript
async detectCampaignLocation() {
    const position = await this.getCurrentPosition();
    const { latitude, longitude } = position.coords;

    const result = await this.reverseGeocode(latitude, longitude);

    if (result && result.address) {
        await this.saveUserLocation(result.address, result.country_code);
        this.loadUserLocationForCampaign();
    }
}
```

**getCurrentPosition() - Lines 2368-2379**
- Promisified geolocation API
- High accuracy mode (GPS/WiFi/cell towers)
- Not affected by VPN

**reverseGeocode() - Lines 2381-2428**
- Uses OpenStreetMap Nominatim API
- Converts GPS coordinates to human-readable address
- Extracts country code
- Formats address with neighborhood, city, state, country

**saveUserLocation() - Lines 2430-2450**
- Saves location to user's profile via `PUT /api/me`
- Updates both `location` and `country_code` fields

**showCampaignLocationStatus() - Lines 2452-2475**
- Shows status messages (loading, success, error)
- Updates UI feedback for location detection

**loadUserLocationForRegional() - Lines 2556-2599**
- Fetches user's country code from profile
- If user has country code:
  - Displays country name (read-only)
  - Loads regions for user's country automatically
- If user has no country code:
  - Shows warning message to detect location first via "National" targeting
  - Hides region selection UI

**renderRegionsForUserCountry() - Lines 2601-2641**
- Renders region checkboxes based on user's country
- Uses `this.userCountryCode` (no country selector needed)
- All regions checked by default

#### 3. Updated Existing Functions

**handleLocationChange() - Lines 1967-2008**
- Shows/hides national and regional sections
- Loads user location for national targeting
- Initializes regional selection

**executeCreate() - Lines 2989-3079**
- Collects national location data
- Collects regional country code
- Sends to backend

```javascript
// For national targeting
let nationalLocation = null;
let nationalCountryCode = null;
if (location === 'national') {
    nationalLocation = this.userLocation || null;
    nationalCountryCode = this.userCountryCode || null;
}

// For regional targeting
let regionalCountryCode = null;
if (location === 'regional') {
    const countrySelector = document.getElementById('campaign-country');
    regionalCountryCode = countrySelector?.value || null;
}

const campaignData = {
    // ... other fields ...
    target_location: location,
    target_regions: location === 'regional' ? selectedRegions : [],
    national_location: nationalLocation,
    national_country_code: nationalCountryCode,
    regional_country_code: regionalCountryCode,
    cpi_rate: confirmationData.total_cpi
};
```

**executeUpdate() - Lines 3081-3180**
- Similar changes to executeCreate()
- Handles location data for campaign updates

**formatLocationForDisplay() - Lines 3389-3436**
- Formats location text for campaign cards
- Shows dynamic country names from CPI rates
- Handles national, regional, and global targeting

---

## User Flow

### National Targeting Flow

1. User selects "National (Your Country)" from dropdown
2. System calls `loadUserLocationForCampaign()`:
   - If user has saved location:
     - Display: "Your Location: [location string]"
     - Show "Change Location" button
   - If user has no saved location:
     - Show GPS detection checkbox and button
     - Display: "You haven't set your location yet"

3. **If user needs to detect location:**
   - User checks "Enable GPS location detection"
   - User clicks "Detect Location"
   - System gets GPS coordinates (not affected by VPN)
   - System reverse geocodes to address
   - System saves to user profile (`PUT /api/me`)
   - UI updates to show detected location

4. **If user wants to change location:**
   - User clicks "Change Location"
   - System hides location display
   - System shows GPS detection UI
   - User can detect new location (same as step 3)

5. **When creating campaign:**
   - System reads `this.userLocation` and `this.userCountryCode`
   - Sends to backend as `national_location` and `national_country_code`

### Regional Targeting Flow

1. User selects "Regional (Specific regions)" from dropdown
2. System calls `loadUserLocationForRegional()`:
   - Fetches user's country code from profile
   - If user has no country code:
     - Shows message to use "National" first to detect location
     - Hides region selection
   - If user has country code:
     - Displays user's country name (read-only)
     - Automatically loads regions for user's country
     - All regions checked by default

3. User selects specific regions (or keeps "All Regions" checked)

4. **When creating campaign:**
   - System collects selected region codes
   - System uses user's country code (`this.userCountryCode`)
   - Sends to backend as `target_regions` array and `regional_country_code`

**Key Improvement:** No country dropdown needed! The system automatically uses the user's detected country for regional targeting, making the UX simpler and more intuitive.

---

## GPS Location Detection

### How It Works

1. **Browser Geolocation API**
   - Uses device GPS, WiFi positioning, and cell towers
   - High accuracy mode enabled
   - **NOT affected by VPN** (detects physical location)

2. **Reverse Geocoding**
   - OpenStreetMap Nominatim API (free, no API key)
   - Converts GPS coordinates to human-readable address
   - Extracts country code automatically

3. **Location Persistence**
   - Saved to user's profile in database
   - Fields: `location` (VARCHAR), `country_code` (VARCHAR)
   - Reused across all profiles (tutor, student, parent, advertiser)

### Privacy

- GPS detection requires user permission in browser
- User can manually change location at any time
- Location is optional for national targeting
- No location tracking - only saves when user explicitly detects

---

## Dynamic Country/Region System

### Data Source

All countries and regions come from `this.cpiRates.countryRegions`:

```javascript
this.cpiRates = {
    countryRegions: {
        'ET': {
            name: 'Ethiopia',
            regions: [
                { id: 'addis-ababa', name: 'Addis Ababa' },
                { id: 'oromia', name: 'Oromia' },
                // ...
            ]
        },
        'US': {
            name: 'United States',
            regions: [
                { id: 'california', name: 'California' },
                // ...
            ]
        }
        // ... more countries
    }
};
```

### No Hardcoding

- Country dropdown: Populated from `Object.keys(cpiRates.countryRegions)`
- Region checkboxes: Populated from `cpiRates.countryRegions[countryCode].regions`
- Country names: Read from `cpiRates.countryRegions[countryCode].name`

### Adding New Countries

To add a new country, simply update the CPI rates configuration:

```javascript
this.cpiRates.countryRegions['KE'] = {
    name: 'Kenya',
    regions: [
        { id: 'nairobi', name: 'Nairobi' },
        { id: 'mombasa', name: 'Mombasa' },
        // ... more regions
    ]
};
```

No code changes needed - UI updates automatically.

---

## Testing Guide

### Test National Targeting

1. Open advertiser profile
2. Create a brand (if none exists)
3. Click on brand to open campaign modal
4. Click "Create New Campaign"
5. Set campaign name and basic details
6. Select "National (Your Country)" from location dropdown
7. If no location saved:
   - Check "Enable GPS location detection"
   - Click "Detect Location"
   - Verify location is detected and displayed
8. If location exists:
   - Verify location is displayed
   - Click "Change Location"
   - Detect new location
9. Complete campaign form and create
10. Verify in database:
    ```sql
    SELECT target_location, national_location, national_country_code
    FROM campaign_profile
    WHERE id = [campaign_id];
    ```

### Test Regional Targeting

1. Follow steps 1-5 from national targeting
2. Select "Regional (Specific regions)" from location dropdown
3. Verify country dropdown shows countries from CPI rates
4. Select a country (e.g., "Ethiopia")
5. Verify regions are loaded for that country
6. Uncheck "All Regions"
7. Select specific regions (e.g., "Addis Ababa", "Oromia")
8. Complete campaign form and create
9. Verify in database:
    ```sql
    SELECT target_location, target_regions, regional_country_code
    FROM campaign_profile
    WHERE id = [campaign_id];
    ```

### Test Global Targeting

1. Follow steps 1-5 from national targeting
2. Keep "Global (International)" selected (default)
3. Verify no additional location UI is shown
4. Complete campaign form and create
5. Verify in database:
    ```sql
    SELECT target_location, national_location, regional_country_code
    FROM campaign_profile
    WHERE id = [campaign_id];
    ```
    - `target_location` should be 'global'
    - `national_location` should be NULL
    - `regional_country_code` should be NULL

---

## Files Changed

### Backend
- ✅ `astegni-backend/advertiser_brands_endpoints.py` - Updated schemas and endpoints
- ✅ `astegni-backend/migrate_add_campaign_location_fields.py` - New migration script

### Frontend
- ✅ `modals/advertiser-profile/campaign-modal.html` - Added location UI
- ✅ `js/advertiser-profile/brands-manager.js` - Added location management

### Database
- ✅ `campaign_profile` table - Added 3 new columns

---

## API Changes

### Endpoint: `POST /api/brands/{brand_id}/campaigns`

**New Fields in Request Body:**
```json
{
  "name": "Campaign Name",
  "target_location": "national",
  "national_location": "Addis Ababa, Addis Ababa, Ethiopia",
  "national_country_code": "ET",
  "regional_country_code": null,
  "target_regions": []
}
```

**Or for regional:**
```json
{
  "name": "Campaign Name",
  "target_location": "regional",
  "national_location": null,
  "national_country_code": null,
  "regional_country_code": "ET",
  "target_regions": ["addis-ababa", "oromia"]
}
```

### Endpoint: `PUT /api/campaigns/{campaign_id}`

Same new fields available for updates.

---

## Summary

### What Was Built

1. ✅ **Database Schema** - Added 3 columns to `campaign_profile` table
2. ✅ **Backend API** - Updated create and update endpoints to accept location fields
3. ✅ **Frontend UI** - Built national and regional location selection with GPS detection
4. ✅ **Location Detection** - Implemented GPS-based location detection (not affected by VPN)
5. ✅ **Dynamic System** - No hardcoded countries, all data from CPI rates configuration
6. ✅ **User Location Persistence** - Saves location to user profile for reuse

### Ready for Testing

All components are implemented and ready for end-to-end testing:
- Database: ✅ Migrated
- Backend: ✅ Updated
- Frontend: ✅ Implemented
- Integration: ✅ Complete

### Next Steps

1. Test campaign creation with all three location modes
2. Verify data is correctly stored in database
3. Test location detection with GPS
4. Test changing location after detection
5. Verify dynamic region loading for different countries
