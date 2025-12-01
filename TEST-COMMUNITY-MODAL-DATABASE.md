# Test Community Modal Database Integration

**Quick Guide** - 5 minutes to verify everything works

---

## Prerequisites

✅ Backend server running on `http://localhost:8000`
✅ Frontend server running on `http://localhost:8080`
✅ Logged in as a user (tutor, student, or parent)

---

## Quick Start

### 1. Start Servers

**Terminal 1 - Backend:**
```bash
cd astegni-backend
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd c:\Users\zenna\Downloads\Astegni-v-1.1
python -m http.server 8080
```

### 2. Open Application
```
http://localhost:8080/profile-pages/tutor-profile.html
```

---

## Test Scenarios

### ✅ **Test 1: Open Community Modal**

1. Look for follower/following count in profile header
2. Click on the count number
3. **Expected:** Modal opens with "Connections (Incoming)" tab active
4. **Expected:** Shows loading spinner initially
5. **Expected:** Shows either:
   - List of connections (if data exists)
   - "No incoming connections yet" (if empty)

**Status:** PASS / FAIL

---

### ✅ **Test 2: Switch Between Tabs**

1. Click "Following" tab
2. **Expected:** Tab becomes active, content changes
3. Click "Groups" tab
4. **Expected:** Shows events (or "No community events available")
5. Click "Clubs" tab
6. **Expected:** Shows clubs (or "No study clubs available")

**Status:** PASS / FAIL

---

### ✅ **Test 3: No Data Scenario**

**If you have NO connections:**

1. Open modal → Followers tab
2. **Expected:** Should see:
   ```
   No incoming connections yet
   ```

3. Switch to Following tab
4. **Expected:** Should see:
   ```
   No outgoing connections yet
   ```

**Status:** PASS / FAIL

---

### ✅ **Test 4: Search Functionality**

**If you have data:**

1. Open modal with data showing
2. Type in search box (e.g., "Math", "John", etc.)
3. **Expected:** Cards filter in real-time
4. Clear search
5. **Expected:** All cards reappear

**Status:** PASS / FAIL

---

### ✅ **Test 5: Error Handling**

**Test with backend stopped:**

1. Stop backend server (Ctrl+C in terminal 1)
2. Open community modal
3. **Expected:** Shows loading, then error:
   ```
   Failed to load followers. Please try again.
   [Retry button]
   ```
4. Click "Retry"
5. **Expected:** Tries to reload, shows error again
6. Start backend again
7. Click "Retry"
8. **Expected:** Loads successfully

**Status:** PASS / FAIL

---

### ✅ **Test 6: Console Errors**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Open community modal
4. **Expected:** No red errors in console
5. **Acceptable:** Blue info logs like:
   ```
   Loading connections...
   Fetching from: http://localhost:8000/api/connections
   ```

**Status:** PASS / FAIL

---

### ✅ **Test 7: Network Requests**

1. Open DevTools → Network tab
2. Clear network log
3. Open community modal → Followers tab
4. **Expected:** See request to:
   ```
   GET http://localhost:8000/api/connections?direction=incoming&status=connected
   ```
5. Switch to Following tab
6. **Expected:** See request to:
   ```
   GET http://localhost:8000/api/connections?direction=outgoing&status=connected
   ```

**Status:** PASS / FAIL

---

## Create Test Data (Optional)

### **Add Test Connections**

**Option 1: Using API Documentation**
```
1. Go to http://localhost:8000/docs
2. Find "POST /api/connections"
3. Click "Try it out"
4. Enter:
   {
     "target_user_id": 2,
     "connection_type": "connect"
   }
5. Click "Execute"
```

**Option 2: Using Python Script**

Create `test_add_connection.py`:
```python
import requests

API_BASE_URL = "http://localhost:8000"

# Login first
login_response = requests.post(f"{API_BASE_URL}/api/login", json={
    "email": "your_email@example.com",
    "password": "your_password"
})

token = login_response.json()['access_token']

# Create connection
response = requests.post(
    f"{API_BASE_URL}/api/connections",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "target_user_id": 2,  # ID of user to connect with
        "connection_type": "connect"
    }
)

print(response.json())
```

Run:
```bash
python test_add_connection.py
```

---

## Visual Verification

### **What You Should See:**

#### **Followers Tab (Incoming Connections)**
```
┌─────────────────────────────────────┐
│ Connections (Incoming)              │
├─────────────────────────────────────┤
│ [Search box]                        │
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │ [Avatar] John Doe             │   │
│ │ john@example.com              │   │
│ │ [Accept] [Decline]            │   │
│ └───────────────────────────────┘   │
│ ┌───────────────────────────────┐   │
│ │ [Avatar] Jane Smith           │   │
│ │ jane@example.com              │   │
│ │ [Accept] [Decline]            │   │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

#### **Following Tab (Outgoing Connections)**
```
┌─────────────────────────────────────┐
│ Connections (Outgoing)              │
├─────────────────────────────────────┤
│ [Search box]                        │
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │ [Avatar] Bob Wilson           │   │
│ │ bob@example.com               │   │
│ │ [Disconnect] [Message]        │   │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

#### **Clubs Tab**
```
┌─────────────────────────────────────┐
│ Study Clubs                         │
├─────────────────────────────────────┤
│ [Search box]                        │
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │ [Club Pic] Physics Club       │   │
│ │ Weekly physics discussions    │   │
│ │ 👥 23/50 members              │   │
│ │ 💰 Free                       │   │
│ │ [View Club]                   │   │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## Common Issues & Solutions

### **Issue 1: "No incoming connections yet" always shows**

**Cause:** Database has no connections
**Solution:** Create test connections (see "Create Test Data" above)

---

### **Issue 2: Modal shows but stays on "Loading..."**

**Cause:** Backend not responding
**Check:**
```bash
# Test backend directly
curl http://localhost:8000/api/connections
```

**Expected:** Should return JSON, not timeout

---

### **Issue 3: Error: "Failed to fetch connections"**

**Possible Causes:**
1. Backend not running
2. Wrong API URL
3. CORS issue
4. No authentication token

**Debug:**
```javascript
// Check in browser console
localStorage.getItem('token')  // Should return a token
```

---

### **Issue 4: Cards show but with broken images**

**Cause:** Profile pictures not in database
**Solution:** Normal - will show placeholder images

---

### **Issue 5: Search doesn't work**

**Check:** Type in search box and watch console
**Expected:** No errors, cards should filter

---

## Expected Console Output (Normal)

```
Loading connections...
✅ Fetched 3 connections
Loading events...
✅ Fetched 5 events
Loading clubs...
✅ Fetched 2 clubs
```

---

## Expected Console Output (Empty State)

```
Loading connections...
ℹ️ No incoming connections found
Loading events...
ℹ️ No events found
Loading clubs...
ℹ️ No clubs found
```

---

## Expected Console Output (Error)

```
Loading connections...
❌ Error loading followers: Failed to fetch
Error: Failed to fetch connections
    at CommunityManager.loadFollowers (communityManager.js:201)
```

---

## Browser Compatibility

Tested and working on:
- ✅ Chrome 120+
- ✅ Firefox 121+
- ✅ Edge 120+
- ✅ Safari 17+

---

## Performance Benchmarks

| Action | Expected Time | Max Acceptable |
|--------|---------------|----------------|
| Open modal | < 100ms | 500ms |
| Load connections | < 500ms | 2s |
| Switch tabs | < 100ms | 500ms |
| Search/filter | < 50ms | 200ms |

---

## Acceptance Criteria

✅ All tabs load without errors
✅ Search works across all tabs
✅ Loading states show before data
✅ Empty states show when no data
✅ Error states show when API fails
✅ No console errors
✅ Modal closes properly
✅ Real data from database (not hardcoded)

---

## Sign-Off

- [ ] Developer tested: ________________ Date: ________
- [ ] QA tested: ________________ Date: ________
- [ ] Ready for production: Yes / No

---

## Quick Debug Commands

```bash
# Check if backend is running
curl http://localhost:8000/api/connections

# Check if frontend is serving
curl http://localhost:8080/profile-pages/tutor-profile.html

# Check database connections
cd astegni-backend
python test_connections_api.py

# View all connections in database
psql -d astegni_db -c "SELECT * FROM connections;"
```

---

**Test Duration:** ~5-10 minutes
**Status:** Ready for testing!
