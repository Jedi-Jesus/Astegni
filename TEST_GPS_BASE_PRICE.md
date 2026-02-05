# Quick Test Guide - GPS Auto-Detection for Base Price

## Quick Start Testing

### 1. Start Servers

```bash
# Terminal 1: Backend
cd astegni-backend
python app.py

# Terminal 2: Frontend
python dev-server.py
```

### 2. Access Admin Panel

1. Open browser: http://localhost:8081/admin-pages/manage-system-settings.html
2. Login with admin credentials
3. Navigate to "Base Price Rules" section

### 3. Test GPS Auto-Detection

#### Test 1: Successful Detection (Ethiopia)

**Steps:**
1. Click "Add Price Rule" button
2. Modal opens instantly
3. Watch the country field

**Expected:**
- Status shows: "🔵 Detecting location..." (blue spinner)
- Browser asks for location permission (first time)
- Within 1-2 seconds: Status changes to "✓ Detected: Ethiopia" (green)
- Country field auto-selects "Ethiopia (ET)"
- You can still change it manually if needed

**Console logs:**
```
[GPS] Coordinates: 9.0320, 38.7469
[GPS] Geocoding data: { address: { country: "Ethiopia", ... } }
[GPS] Country detected: Ethiopia
[GPS] Country set to: Ethiopia (ET)
```

#### Test 2: Country Not in Pricing Regions

**Simulate:** Use VPN to USA or manually deny location

**Expected:**
- Status: "⚠ United States not in pricing regions. Set to Global." (yellow)
- Country field: "Global (All Countries)"
- Still works, just uses global pricing

#### Test 3: Permission Denied

**Steps:**
1. Click "Add Price Rule"
2. When browser asks for location, click "Block" or "Deny"

**Expected:**
- Status: "❌ Location permission denied. Please select manually." (red)
- Country field: "Global (All Countries)"
- You can manually select country

**Console:**
```
[GPS] Error detecting country: GeolocationPositionError: User denied Geolocation
```

#### Test 4: Edit Existing Rule

**Steps:**
1. Create a rule with country "ET"
2. Click "Edit" on the rule card

**Expected:**
- Modal opens with country = "ET" (preserved)
- GPS detection NOT triggered
- Status shows default message
- Country stays as "ET" unless manually changed

### 4. Test Complete Rule Creation

**Steps:**
1. Click "Add Price Rule"
2. Wait for GPS detection to complete
3. Fill in:
   - Rule Name: "Test Ethiopia Math Online"
   - Country: (should be auto-detected to "ET")
   - Subject: "Mathematics"
   - Format: "Online"
   - Min Grade: "9"
   - Max Grade: "12"
   - Base Price: "50"
   - Credential Bonus: "10"
   - Experience Bonus: "5"
4. Click "Save"

**Expected:**
- Rule created successfully
- Card displays:
  - 🌍 Country: Ethiopia
  - 🎓 Subject: Mathematics
  - 💻 Format: Online
  - 📚 Grade Level: Grade 9 - Grade 12
  - Price: 50 ETB/hr
  - Bonuses: +10 ETB/credential, +5 ETB/year

### 5. Test Different Education Levels

#### University Only
- Min Grade: 13
- Max Grade: 13
- Display: "University"

#### Certification Only
- Min Grade: 14
- Max Grade: 14
- Display: "Certification"

#### All Levels
- Min Grade: 1
- Max Grade: 14
- Display: "All Levels (K-12, University, Certification)"

#### Mixed Range
- Min Grade: 10
- Max Grade: 13
- Display: "Grade 10 - University"

## Browser Compatibility Testing

### Chrome/Edge (Recommended)
- GPS works best
- Fast detection (1-2 seconds)
- Accurate coordinates

### Firefox
- GPS works well
- Slightly slower (2-3 seconds)
- Permission prompt different UI

### Safari (macOS/iOS)
- Requires HTTPS in production
- HTTP allowed on localhost
- May ask twice for permission

### Mobile Browsers
- More accurate (built-in GPS)
- Faster detection
- Better battery optimization

## Troubleshooting

### Issue: "GPS not available"
**Cause:** Browser doesn't support Geolocation API
**Fix:** Use modern browser (Chrome, Firefox, Safari, Edge)

### Issue: "Location permission denied"
**Cause:** User blocked location access
**Fix:**
1. Click site settings (lock icon in address bar)
2. Allow location access
3. Refresh page

### Issue: "Location timeout"
**Cause:** GPS taking too long (>10 seconds)
**Fix:**
1. Check internet connection
2. Move to area with better signal
3. Manually select country

### Issue: Country detected but wrong
**Cause:** VPN or IP-based fallback
**Fix:**
1. Disable VPN
2. Manually change to correct country
3. Browser uses physical GPS, not IP

### Issue: "United States not in pricing regions"
**Cause:** GPS detected a country not in our 10-country list
**Fix:**
1. This is expected behavior
2. System defaults to "Global (All Countries)"
3. Manually select a supported country if needed

## Console Debugging

### Success Log Example
```javascript
[GPS] Coordinates: 9.0320, 38.7469
[GPS] Geocoding data: {
  address: {
    country: "Ethiopia",
    city: "Addis Ababa",
    state: "Addis Ababa"
  }
}
[GPS] Country detected: Ethiopia
[GPS] Country set to: Ethiopia (ET)
```

### Error Log Example
```javascript
[GPS] Geolocation not supported, defaulting to Global
// OR
[GPS] Error detecting country: GeolocationPositionError {code: 1, message: "User denied Geolocation"}
// OR
[GPS] Country detected (United States) but not in pricing regions. Defaulting to Global.
```

## Production Testing

### Before Production
1. All migrations run on production database
2. Backend restarted
3. Frontend cache cleared
4. HTTPS enabled (required for GPS on production)

### Production Test Steps
1. Access: https://astegni.com/admin-pages/manage-system-settings.html
2. Test GPS detection works over HTTPS
3. Verify certificate valid (lock icon)
4. Test from different countries (if possible)
5. Monitor console for errors

## API Testing

### Direct API Test (Postman/curl)

```bash
# Get admin token first
TOKEN="your_admin_token_here"

# Create rule with GPS-detected country
curl -X POST http://localhost:8000/api/admin/base-price-rules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rule_name": "Test GPS Auto-Detection",
    "country": "ET",
    "subject_category": "mathematics",
    "session_format": "Online",
    "min_grade_level": 1,
    "max_grade_level": 14,
    "base_price_per_hour": 50.0,
    "credential_bonus": 10.0,
    "experience_bonus_per_year": 5.0,
    "priority": 1,
    "is_active": true
  }'
```

### Expected Response
```json
{
  "id": 7,
  "rule_name": "Test GPS Auto-Detection",
  "country": "ET",
  "subject_category": "mathematics",
  "session_format": "Online",
  "min_grade_level": 1,
  "max_grade_level": 14,
  "base_price_per_hour": 50.0,
  "credential_bonus": 10.0,
  "experience_bonus_per_year": 5.0,
  "priority": 1,
  "is_active": true,
  "created_at": "2026-01-22T12:00:00Z",
  "updated_at": null
}
```

## Common Test Scenarios

### Scenario 1: First-Time User (Ethiopia)
1. Open admin panel
2. Click "Add Price Rule"
3. Browser asks: "Allow astegni.com to access your location?"
4. Click "Allow"
5. Within 2 seconds: Country = "Ethiopia (ET)"
6. Fill other fields and save
7. Success!

### Scenario 2: Returning User (Permission Already Granted)
1. Click "Add Price Rule"
2. No permission prompt (already granted)
3. Instant GPS detection
4. Country auto-filled within 1 second
5. Faster than first time

### Scenario 3: Creating Multiple Rules
1. Create Rule 1: GPS detects "ET"
2. Save successfully
3. Create Rule 2: GPS still cached, instant detection
4. Create Rule 3: Same country, no repeated GPS calls (5-min cache)

### Scenario 4: Different Countries (Admin Traveling)
1. Admin in Ethiopia: Detects "ET"
2. Admin travels to Kenya: Detects "KE"
3. Admin travels to USA: Detects "all" (not in list)
4. System adapts to location automatically

## Success Criteria

✅ GPS detection triggers on modal open
✅ Status updates show real-time progress
✅ Country field auto-populated within 2 seconds
✅ Manual override still works
✅ Edit mode doesn't trigger GPS
✅ Fallbacks work on errors
✅ No page freeze or hang
✅ Console logs helpful debug info
✅ All education levels display correctly
✅ Rules save with correct country

## Performance Benchmarks

| Metric | Target | Typical |
|--------|--------|---------|
| Modal Open | <100ms | 50ms |
| GPS Detection | <2s | 1-2s |
| Status Update | <50ms | 20ms |
| Form Validation | <100ms | 30ms |
| API Save | <500ms | 200-300ms |
| Total (click to save) | <5s | 2-4s |

## Next Steps After Testing

1. ✅ Verify GPS works in your location
2. ✅ Test all error scenarios
3. ✅ Create a few real pricing rules
4. ✅ Test rule matching logic
5. ✅ Monitor console for warnings
6. ✅ Check database has correct data
7. 🚀 Deploy to production

---

**Ready to Test?** Just start the servers and click "Add Price Rule"! The GPS will do the rest.
