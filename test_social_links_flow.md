# Testing Social Links Data Flow

## Quick Test in Browser Console

Open any profile page and run these commands in the browser console:

### 1. Check if HTML Container Exists
```javascript
// Should return the div element
const container = document.getElementById('social-links-container');
console.log('Container found:', container);
console.log('Current HTML:', container.innerHTML);
```

### 2. Check if Profile Data Has Social Links
```javascript
// For student-profile.html
console.log('Profile data:', StudentProfileDataLoader.profileData);
console.log('Social links:', StudentProfileDataLoader.profileData?.social_links);

// For tutor-profile.html
console.log('Profile data:', TutorProfileDataLoader.profileData);
console.log('Social links:', TutorProfileDataLoader.profileData?.social_links);

// For parent-profile.html
console.log('Current profile:', currentProfile);
console.log('Social links:', currentProfile?.social_links);
```

### 3. Manually Test the populateSocialLinks Function
```javascript
// Test with sample data
const testSocialLinks = {
    facebook: 'https://facebook.com/test',
    twitter: 'https://twitter.com/test',
    linkedin: 'https://linkedin.com/in/test'
};

// Call the function (adjust based on page)
StudentProfileDataLoader.populateSocialLinks(testSocialLinks);
// OR
TutorProfileDataLoader.populateSocialLinks(testSocialLinks);
// OR
populateSocialLinks(testSocialLinks);  // For parent-profile
```

### 4. Check API Response Directly
```javascript
// Fetch profile data and check what's returned
const token = localStorage.getItem('token') || localStorage.getItem('access_token');

fetch('http://localhost:8000/api/student/profile/123', {
    headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
    console.log('API Response:', data);
    console.log('Social Links from API:', data.social_links);
});
```

## Backend Database Check

Run this to see what's actually stored:

```bash
cd astegni-backend
python -c "
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

with psycopg.connect(DATABASE_URL) as conn:
    with conn.cursor() as cur:
        # Check social_links in users table
        cur.execute('''
            SELECT id, first_name, social_links
            FROM users
            WHERE social_links IS NOT NULL
            AND social_links::text != '{}'
            LIMIT 5
        ''')

        print('Users with social links:')
        for row in cur.fetchall():
            print(f'  User {row[0]} ({row[1]}): {row[2]}')
"
```

## Adding Social Links via Edit Profile

### 1. Open Edit Profile Modal
- Click "Edit Profile" button on any profile page

### 2. Add Social Links
The edit modal should have fields like:
- Facebook URL: `https://facebook.com/your-username`
- Twitter URL: `https://twitter.com/your-username`
- LinkedIn URL: `https://linkedin.com/in/your-username`
- Instagram URL: `https://instagram.com/your-username`

### 3. Save and Verify
- Click "Save Changes"
- The page should refresh
- Social media icons should appear in the profile header

## Troubleshooting

### Social Links Not Appearing?

#### Check 1: Is the HTML container present?
```javascript
document.getElementById('social-links-container') !== null
// Should return: true
```

#### Check 2: Is the JavaScript function defined?
```javascript
// For student-profile
typeof StudentProfileDataLoader.populateSocialLinks === 'function'
// Should return: true

// For tutor-profile
typeof TutorProfileDataLoader.populateSocialLinks === 'function'
// Should return: true
```

#### Check 3: Is FontAwesome loaded?
```javascript
// Check if FontAwesome CSS is loaded
document.querySelector('link[href*="font-awesome"]') !== null
// Should return: true
```

#### Check 4: Is the data being passed?
```javascript
// Add console.log in populateSocialLinks function
// Check browser console for these logs:
// 📱 Populating social links. Raw data: {...}
// 📱 Parsed entries: [...]
// ✅ X social link(s) populated successfully
```

#### Check 5: Does the API return social_links?
```bash
# Test API endpoint directly
curl http://localhost:8000/api/student/profile/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.social_links'
```

### Common Issues

1. **"No social links added" message shows**
   - Means the function is working but data is empty
   - Check database: user may not have added social links yet
   - Add social links via edit profile modal

2. **Nothing shows at all**
   - Container might be missing from HTML
   - JavaScript might not be loaded
   - Check browser console for errors

3. **Icons don't appear (just text)**
   - FontAwesome CSS not loaded
   - Check `<head>` for FontAwesome link

4. **Links show but don't work**
   - Check browser console for click errors
   - Verify `onclick` handler is present
   - Test with `event.preventDefault()` removed

## Expected Behavior

### With Social Links
```
🔵 🐦 💼 📸
(clickable icons in a row)
```

### Without Social Links
```
No social links added
(gray text message)
```

### In Console (with links)
```
📱 Populating social links. Raw data: {facebook: "...", twitter: "..."}
📱 Type: object IsObject: true
📱 Parsed entries: [["facebook", "..."], ["twitter", "..."]]
  ✓ Adding facebook: https://facebook.com/...
  ✓ Adding twitter: https://twitter.com/...
✅ 2 social link(s) populated successfully
```

### In Console (without links)
```
📱 Populating social links. Raw data: {}
📱 Type: object IsObject: true
📱 Parsed entries: []
ℹ️ No social links to display
```
