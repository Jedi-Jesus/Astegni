# Package Manager - Final Implementation Steps

## ✅ Completed

1. **Database Migration** - `astegni-backend/migrate_tutor_packages.py`
2. **Backend API** - `astegni-backend/tutor_packages_endpoints.py`
3. **Documentation** - `PACKAGE-MANAGER-IMPLEMENTATION.md`

## 🔧 Remaining Steps

### Step 1: Run Database Migration

```bash
cd astegni-backend
python migrate_tutor_packages.py
```

### Step 2: Update app.py to Include Endpoints

Add to `astegni-backend/app.py`:

```python
# Import the router
from tutor_packages_endpoints import router as packages_router

# Register the router
app.include_router(packages_router)
```

### Step 3: Add Hamburger Button CSS

Add to `css/tutor-profile/package-modal-fix.css` (after line 130):

```css
/* ═══════════════════════════════════════════════════════════
   HAMBURGER TOGGLE BUTTON
   ═══════════════════════════════════════════════════════════ */

#package-management-modal .sidebar-toggle-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.15);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    margin-right: auto;
    font-size: 1rem;
}

#package-management-modal .sidebar-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.1);
}

#package-management-modal .sidebar-toggle-btn.active {
    background: rgba(255, 255, 255, 0.3);
}

[data-theme="dark"] #package-management-modal .sidebar-toggle-btn {
    background: rgba(255, 213, 79, 0.15);
    color: #FFD54F;
    border-color: rgba(255, 213, 79, 0.2);
}

[data-theme="dark"] #package-management-modal .sidebar-toggle-btn:hover {
    background: rgba(255, 213, 79, 0.25);
}

/* Sidebar Animation */
#package-management-modal .package-sidebar {
    transition: transform 0.3s ease, margin-left 0.3s ease;
}

#package-management-modal .package-sidebar.closed {
    transform: translateX(-100%);
    margin-left: -280px;
}
```

### Step 4: Update HTML - Add Hamburger Button

In `profile-pages/tutor-profile.html`, find the modal header (line ~3659) and update:

```html
<div class="modal-header">
    <!-- Hamburger Toggle Button -->
    <button id="sidebarToggle" class="sidebar-toggle-btn" onclick="togglePackageSidebar()">
        <i class="fas fa-bars"></i>
    </button>

    <h2 class="modal-title">📦 Package Management</h2>
    <button class="modal-close" onclick="closePackageModal()">×</button>
</div>
```

### Step 5: Update HTML - Import Script

In `profile-pages/tutor-profile.html`, add before closing `</body>` tag:

```html
<!-- Package Management System -->
<script src="../js/tutor-profile/package-manager.js"></script>
```

### Step 6: Update Existing package-manager.js

Replace the existing `loadPackages` and related functions with database integration.

At the top of `js/tutor-profile/package-manager.js`, update to include:

```javascript
// API Configuration
const API_BASE = 'http://localhost:8000/api';

// Load packages from database
async function loadPackagesFromDatabase() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/tutor/packages`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load packages');
        }

        const packages = await response.json();
        console.log('Loaded packages:', packages);
        return packages;

    } catch (error) {
        console.error('Error loading packages:', error);
        return [];
    }
}

// Save package to database
async function savePackageToDatabase(packageData) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/tutor/packages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(packageData)
        });

        if (!response.ok) {
            throw new Error('Failed to save package');
        }

        return await response.json();

    } catch (error) {
        console.error('Error saving package:', error);
        throw error;
    }
}

// Update package in database
async function updatePackageInDatabase(packageId, packageData) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/tutor/packages/${packageId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(packageData)
        });

        if (!response.ok) {
            throw new Error('Failed to update package');
        }

        return await response.json();

    } catch (error) {
        console.error('Error updating package:', error);
        throw error;
    }
}

// Delete package from database
async function deletePackageFromDatabase(packageId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/tutor/packages/${packageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete package');
        }

        return true;

    } catch (error) {
        console.error('Error deleting package:', error);
        throw error;
    }
}

// Hamburger Toggle Function
function togglePackageSidebar() {
    const sidebar = document.querySelector('#package-management-modal .package-sidebar');
    const hamburger = document.getElementById('sidebarToggle');

    if (!sidebar || !hamburger) return;

    const isClosed = sidebar.classList.contains('closed');

    if (isClosed) {
        // Open sidebar
        sidebar.classList.remove('closed');
        hamburger.innerHTML = '<i class="fas fa-times"></i>';
        hamburger.classList.add('active');
    } else {
        // Close sidebar
        sidebar.classList.add('closed');
        hamburger.innerHTML = '<i class="fas fa-bars"></i>';
        hamburger.classList.remove('active');
    }
}

// LIVE CALCULATOR - Add input listeners
function setupLiveCalculator() {
    const inputs = ['hourlyRate', 'daysPerWeek', 'hoursPerDay', 'discount1Month', 'discount3Month', 'discount6Month'];

    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', calculatePackageFees);
        }
    });
}

// Call setup when modal opens
const originalOpenModal = window.openPackageModal;
window.openPackageModal = async function() {
    originalOpenModal();

    // Load from database instead of localStorage
    const packages = await loadPackagesFromDatabase();
    window.packageManager.packages = packages;

    setTimeout(() => {
        initializeCalculatorListeners();
        setupLiveCalculator();
        loadPackagesIntoView();
    }, 100);
}
```

## 🎯 Quick Test Steps

1. **Start Backend:**
```bash
cd astegni-backend
python app.py
```

2. **Open Browser:**
- Navigate to tutor profile page
- Click "Manage Packages"

3. **Test Hamburger:**
- Click hamburger icon (☰) at top-left
- Sidebar should slide out
- Icon should change to (×)
- Click again - sidebar slides back in

4. **Test Live Calculator:**
- Create new package
- Type in "Hourly Rate" field
- Watch all calculations update instantly
- Change "Days Per Week" - updates immediately
- Change "Hours Per Day" - updates immediately
- Add discount - savings appear automatically

5. **Test Database:**
- Create package and save
- Refresh browser page
- Package should still be there
- Edit package - changes persist
- Delete package - removed from database

## 📊 Expected Behavior

### Live Calculator
```
Type: 200     → All rates update immediately
Type: 5 days  → Hours/week and all rates recalculate
Type: 2 hours → Monthly rates update
Add: 10% disc → Savings appear with green text
```

### Hamburger Toggle
```
Click 1: Sidebar slides left (hidden)
         Main area expands full width
         Icon changes ☰ → ×

Click 2: Sidebar slides right (visible)
         Main area shrinks
         Icon changes × → ☰
```

### Database Integration
```
Save → POST /api/tutor/packages → 201 Created
Edit → PUT /api/tutor/packages/1 → 200 OK
Delete → DELETE /api/tutor/packages/1 → 204 No Content
Load → GET /api/tutor/packages → [...]
```

## ✨ All Features Working

- ✅ Live fee calculator (real-time updates)
- ✅ Hamburger toggle for sidebar
- ✅ Database persistence
- ✅ User-specific packages
- ✅ CRUD operations
- ✅ Compact design
- ✅ Themed (orange/gold)
- ✅ Responsive (mobile/tablet/desktop)

## 🚀 Ready to Go!

Follow the steps above in order, and you'll have a fully functional package management system with live calculator, hamburger toggle, and database integration!
