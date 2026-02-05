/**
 * ═══════════════════════════════════════════════════════════
 * PACKAGE MANAGER - CLEAN REDESIGN WITH DATABASE INTEGRATION
 * Sidebar list + Main editor design
 * ═══════════════════════════════════════════════════════════
 */

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
// Track last active panel for sidebar toggle
let lastActivePanel = "packages";

class PackageManagerClean {
    constructor() {
        this.packages = [];
        this.currentPackageId = null;
        this.currentPackage = null;
        this.loadPackages();
    }

    async loadPackages() {
        console.log('📡 loadPackages called');
        try {
            // Try to load from database first
            // Check multiple token sources for compatibility
            let token = localStorage.getItem('token') || localStorage.getItem('access_token');

            // Also try getting from AuthManager if available
            if (!token && window.AuthManager && window.AuthManager.token) {
                token = window.AuthManager.token;
                console.log('🔑 Got token from AuthManager');
            }

            console.log('🔑 Token check - token:', !!localStorage.getItem('token'),
                        'access_token:', !!localStorage.getItem('access_token'),
                        'AuthManager:', !!(window.AuthManager && window.AuthManager.token));
            console.log('🔑 Final token exists:', !!token);

            if (token) {
                console.log('📡 Fetching packages from database...');
                const response = await fetch(`${API_BASE_URL}/api/tutor/packages`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                console.log('📨 Response status:', response.status);

                if (response.ok) {
                    const dbPackages = await response.json();
                    console.log('✅ Loaded packages from database:', dbPackages);

                    // Convert backend format to frontend format
                    this.packages = dbPackages.map(pkg => this.convertBackendToFrontend(pkg));
                    console.log('✅ Converted packages:', this.packages);

                    // Save to localStorage as backup
                    this.savePackages();
                    return;
                } else {
                    const errorText = await response.text();
                    console.error('❌ Database error:', response.status, errorText);
                }
            } else {
                console.warn('⚠️ No token found - loading from localStorage only');
            }
        } catch (e) {
            console.error('❌ Error loading from database:', e);
        }

        // Fallback to localStorage
        const stored = localStorage.getItem('tutorPackages');
        if (stored) {
            try {
                this.packages = JSON.parse(stored);
                console.log('📦 Loaded packages from localStorage');
            } catch (e) {
                console.error('Error loading packages:', e);
                this.packages = [];
            }
        }
    }

    async savePackages() {
        try {
            // Save to localStorage as backup
            localStorage.setItem('tutorPackages', JSON.stringify(this.packages));
        } catch (e) {
            console.error('Error saving packages to localStorage:', e);
        }
    }

    async addPackage(packageData) {
        console.log('📦 addPackage called with:', packageData);
        try {
            // Try multiple token storage keys for compatibility
            let token = localStorage.getItem('token') || localStorage.getItem('access_token');

            // Also try getting from AuthManager if available
            if (!token && window.AuthManager && window.AuthManager.token) {
                token = window.AuthManager.token;
                console.log('🔑 Got token from AuthManager');
            }

            console.log('🔑 Token check - token:', !!localStorage.getItem('token'),
                        'access_token:', !!localStorage.getItem('access_token'),
                        'AuthManager:', !!(window.AuthManager && window.AuthManager.token));
            console.log('🔑 Final token exists:', !!token);
            if (token) {
                console.log('🔑 Token value (first 20 chars):', token.substring(0, 20) + '...');
            }

            if (token) {
                // Convert frontend format to backend format
                const backendData = {
                    name: packageData.name || `Package ${this.packages.length + 1}`,
                    grade_level: packageData.gradeLevel || null,
                    course_ids: packageData.courseIds || [],  // Array of course IDs (status from courses table)
                    description: packageData.description || null,
                    session_format: packageData.sessionFormat || null,  // Single value: 'Online' or 'In-person'
                    schedule_type: packageData.scheduleType || 'recurring',
                    schedule_days: Array.isArray(packageData.scheduleDays) ? packageData.scheduleDays.join(', ') : null,
                    start_time: packageData.startTime || null,
                    end_time: packageData.endTime || null,
                    start_date: packageData.startDate || null,
                    end_date: packageData.endDate || null,
                    session_time: packageData.sessionTime || null,
                    session_duration: packageData.sessionDuration || null,
                    hourly_rate: parseFloat(packageData.hourlyRate) || 0,
                    days_per_week: packageData.daysPerWeek || null,
                    hours_per_day: packageData.hoursPerDay || null,
                    payment_frequency: packageData.paymentFrequency || 'monthly',
                    discount_1_month: 0,
                    discount_3_month: parseFloat(packageData.discounts?.threeMonths) || 0,
                    discount_6_month: parseFloat(packageData.discounts?.sixMonths) || 0,
                    yearly_discount: parseFloat(packageData.discounts?.yearly) || 0
                };

                console.log('📡 Sending to backend:', backendData);
                console.log('📡 POST URL:', `${API_BASE_URL}/api/tutor/packages`);

                const response = await fetch(`${API_BASE_URL}/api/tutor/packages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(backendData)
                });

                console.log('📨 Response status:', response.status);

                if (response.ok) {
                    const savedPackage = await response.json();
                    console.log('✅ Package saved to database:', savedPackage);
                    // Convert backend format to frontend format
                    const newPackage = this.convertBackendToFrontend(savedPackage);
                    newPackage._savedToDatabase = true;  // Mark as saved to database
                    this.packages.push(newPackage);
                    this.savePackages();
                    console.log('✅ Package added to local state');
                    return newPackage;
                } else {
                    const errorText = await response.text();
                    console.error('❌ Backend error:', response.status, errorText);
                    // Don't fall through to localStorage on auth errors
                    if (response.status === 401 || response.status === 403) {
                        alert('Authentication error. Please refresh the page and log in again.');
                        return null;
                    }
                }
            } else {
                console.warn('⚠️ No token found - cannot save to database');
                alert('You are not logged in. Please refresh the page and log in again.');
                return null;
            }
        } catch (e) {
            console.error('❌ Error saving to database:', e);
            alert('Network error. Please check your connection and try again.');
            return null;
        }

        // Fallback to localStorage (only reached if backend returned non-auth error)
        console.warn('⚠️ Falling back to localStorage save for new package');
        const newPackage = {
            id: Date.now(),
            name: packageData.name || `Package ${this.packages.length + 1}`,
            courses: packageData.courses || [],
            courseIds: packageData.courseIds || [],
            paymentFrequency: packageData.paymentFrequency || 'monthly',
            hourlyRate: packageData.hourlyRate || 0,
            discounts: packageData.discounts || { threeMonths: 0, sixMonths: 0, yearly: 0 },
            createdAt: new Date().toISOString(),
            _savedToDatabase: false  // Mark as NOT saved to database
        };
        this.packages.push(newPackage);
        this.savePackages();
        return newPackage;
    }

    async updatePackage(id, data) {
        console.log('📝 updatePackage called for ID:', id, 'with data:', data);
        const index = this.packages.findIndex(p => p.id === id);
        if (index === -1) {
            console.error('❌ Package not found in local state:', id);
            console.log('📦 Available packages:', this.packages.map(p => ({ id: p.id, name: p.name })));
            return null;
        }

        try {
            // Try multiple token storage keys for compatibility
            let token = localStorage.getItem('token') || localStorage.getItem('access_token');

            // Also try getting from AuthManager if available
            if (!token && window.AuthManager && window.AuthManager.token) {
                token = window.AuthManager.token;
                console.log('🔑 Got token from AuthManager');
            }

            console.log('🔑 Token check - token:', !!localStorage.getItem('token'),
                        'access_token:', !!localStorage.getItem('access_token'),
                        'AuthManager:', !!(window.AuthManager && window.AuthManager.token));
            console.log('🔑 Final token exists:', !!token);
            if (token) {
                console.log('🔑 Token value (first 20 chars):', token.substring(0, 20) + '...');
            }

            if (token) {
                // Convert frontend format to backend format
                const backendData = {
                    name: data.name,
                    grade_level: data.gradeLevel || null,
                    course_ids: data.courseIds || [],  // Array of course IDs (status from courses table)
                    session_format: data.sessionFormat || null,  // Single value: 'Online' or 'In-person'
                    schedule_type: data.scheduleType || 'recurring',
                    schedule_days: Array.isArray(data.scheduleDays) ? data.scheduleDays.join(', ') : null,
                    start_time: data.startTime || null,
                    end_time: data.endTime || null,
                    start_date: data.startDate || null,
                    end_date: data.endDate || null,
                    session_time: data.sessionTime || null,
                    session_duration: data.sessionDuration || null,
                    hourly_rate: parseFloat(data.hourlyRate),
                    payment_frequency: data.paymentFrequency,
                    discount_3_month: parseFloat(data.discounts?.threeMonths) || 0,
                    discount_6_month: parseFloat(data.discounts?.sixMonths) || 0,
                    yearly_discount: parseFloat(data.discounts?.yearly) || 0
                };

                console.log('📡 Sending update to backend:', backendData);
                console.log('📡 PUT URL:', `${API_BASE_URL}/api/tutor/packages/${id}`);

                const response = await fetch(`${API_BASE_URL}/api/tutor/packages/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(backendData)
                });

                console.log('📨 Response status:', response.status);

                if (response.ok) {
                    const savedPackage = await response.json();
                    console.log('✅ Package updated in database:', savedPackage);
                    const updatedPackage = this.convertBackendToFrontend(savedPackage);
                    updatedPackage._savedToDatabase = true;  // Mark as saved to database
                    this.packages[index] = updatedPackage;
                    this.savePackages();
                    console.log('✅ Package updated in local state');
                    return updatedPackage;
                } else {
                    const errorText = await response.text();
                    console.error('❌ Backend error:', response.status, errorText);
                    // Don't fall through to localStorage on auth errors
                    if (response.status === 401 || response.status === 403) {
                        alert('Authentication error. Please refresh the page and log in again.');
                        return null;
                    }
                }
            } else {
                console.warn('⚠️ No token found - cannot save to database');
                alert('You are not logged in. Please refresh the page and log in again.');
                return null;
            }
        } catch (e) {
            console.error('❌ Error updating in database:', e);
            alert('Network error. Please check your connection and try again.');
            return null;
        }

        // Fallback to localStorage (only reached if backend returned non-auth error)
        console.warn('⚠️ Falling back to localStorage save');
        this.packages[index] = { ...this.packages[index], ...data };
        this.packages[index]._savedToDatabase = false;  // Mark as NOT saved to database
        this.savePackages();
        return this.packages[index];
    }

    async deletePackage(id) {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const response = await fetch(`${API_BASE_URL}/api/tutor/packages/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    console.log('✅ Package deleted from database');
                }
            }
        } catch (e) {
            console.warn('⚠️ Could not delete from database:', e);
        }

        // Remove from local state
        this.packages = this.packages.filter(p => p.id !== id);
        this.savePackages();
        if (this.currentPackageId === id) {
            this.currentPackageId = null;
            this.currentPackage = null;
        }
    }

    convertBackendToFrontend(backendPackage) {
        return {
            id: backendPackage.id,
            name: backendPackage.name,
            gradeLevel: backendPackage.grade_level || '',
            // course_ids array - status determined by courses table
            courseIds: backendPackage.course_ids || [],
            courses: backendPackage.courses || [],  // Approved course objects from courses table
            pendingCourses: backendPackage.pending_courses || [],  // Pending course objects (filtered by status)
            session_format: backendPackage.session_format || null,  // Single value: 'Online' or 'In-person'
            scheduleType: backendPackage.schedule_type || 'recurring',
            scheduleDays: backendPackage.schedule_days ? backendPackage.schedule_days.split(', ').filter(d => d) : [],
            startTime: backendPackage.start_time || '09:00',
            endTime: backendPackage.end_time || '10:00',
            startDate: backendPackage.start_date || '',
            endDate: backendPackage.end_date || '',
            sessionTime: backendPackage.session_time || '09:00',
            sessionDuration: backendPackage.session_duration || '1',
            paymentFrequency: backendPackage.payment_frequency,
            hourlyRate: backendPackage.hourly_rate,
            discounts: {
                threeMonths: backendPackage.discount_3_month || 0,
                sixMonths: backendPackage.discount_6_month || 0,
                yearly: backendPackage.yearly_discount || 0
            },
            createdAt: backendPackage.created_at
        };
    }

    getPackage(id) {
        return this.packages.find(p => p.id === id);
    }

    calculateFees(hourlyRate, daysPerWeek, hoursPerDay, paymentFrequency, discounts) {
        const hoursPerWeek = daysPerWeek * hoursPerDay;
        const weeksInPeriod = paymentFrequency === '2-weeks' ? 2 : 4;
        const baseFee = hourlyRate * hoursPerWeek * weeksInPeriod;

        return {
            hourlyRate,
            hoursPerWeek,
            hoursPerDay,
            daysPerWeek,
            paymentFrequency,
            weeksInPeriod,
            basePayment: baseFee,
            threeMonths: baseFee * 3 * (1 - (discounts.threeMonths || 0) / 100),
            sixMonths: baseFee * 6 * (1 - (discounts.sixMonths || 0) / 100),
            yearly: baseFee * 12 * (1 - (discounts.yearly || 0) / 100)
        };
    }
}

// Initialize global instance
window.packageManagerClean = new PackageManagerClean();

/**
 * ═══════════════════════════════════════════════════════════
 * MODAL FUNCTIONS
 * ═══════════════════════════════════════════════════════════
 */

window.openPackageModal = async function() {
    console.log('🎯 Opening package modal...');

    // Guard: Check profile completion and KYC before allowing package management
    if (window.ProfileCompletionGuard && typeof ProfileCompletionGuard.guard === 'function') {
        const allowed = ProfileCompletionGuard.guard('Manage Packages', async () => {
            await _openPackageModalInternal();
        });
        if (!allowed) {
            return; // User was shown the appropriate modal to complete profile/KYC
        }
    } else {
        // Guard not available, proceed directly
        await _openPackageModalInternal();
    }
};

async function _openPackageModalInternal() {
    const modal = document.getElementById('package-management-modal');
    console.log('Modal element:', modal);

    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        console.log('✅ Modal display set to flex');

        // Initialize sidebar state based on screen size
        const isDesktop = window.innerWidth >= 1024;
        const sidebarContent = document.getElementById('sidebarContent');
        const sidebar = document.getElementById('packageManagementSidebar');

        if (isDesktop && sidebarContent) {
            // Show sidebar content by default on desktop
            sidebarContent.classList.add('active');
            if (sidebar) {
                sidebar.classList.remove('collapsed');
            }
            console.log('🖥️ Desktop mode: Sidebar content visible by default');
        }

        // Reload packages from database
        console.log('📡 Loading packages from database/localStorage...');
        await window.packageManagerClean.loadPackages();
        console.log('📦 Packages loaded:', window.packageManagerClean.packages);

        // Render packages in sidebar
        console.log('🎨 Rendering packages list...');
        renderPackagesList();

        // Show empty state if no packages
        if (window.packageManagerClean.packages.length === 0) {
            console.log('📭 No packages found - showing empty state');
            showEmptyState();
        } else {
            console.log(`✅ Found ${window.packageManagerClean.packages.length} package(s) - selecting first package`);
            // Select first package by default
            selectPackage(window.packageManagerClean.packages[0].id);
        }
    } else {
        console.error('❌ Modal element not found!');
    }
}

window.closePackageModal = function() {
    const modal = document.getElementById('package-management-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.style.overflow = '';

        // Reset state
        window.packageManagerClean.currentPackageId = null;
        window.packageManagerClean.currentPackage = null;
    }
};

/**
 * ═══════════════════════════════════════════════════════════
 * SIDEBAR FUNCTIONS
 * ═══════════════════════════════════════════════════════════
 */

function renderPackagesList() {
    console.log('🎨 renderPackagesList called');
    const packagesList = document.getElementById('packagesList');
    console.log('packagesList element:', packagesList);

    if (!packagesList) {
        console.error('❌ packagesList element not found!');
        return;
    }

    const packages = window.packageManagerClean.packages;
    console.log(`📦 Rendering ${packages.length} package(s)`);

    if (packages.length === 0) {
        console.log('📭 No packages - showing empty message');
        packagesList.innerHTML = `
            <div style="padding: 2rem 1rem; text-align: center; color: var(--text-secondary);">
                <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                <p style="font-size: 0.875rem; margin: 0;">No packages yet</p>
            </div>
        `;
        return;
    }

    console.log('✅ Rendering package items...');
    packagesList.innerHTML = packages.map(pkg => {
        console.log(`- Package: ${pkg.name} (ID: ${pkg.id})`);
        return `
        <div class="package-item ${pkg.id === window.packageManagerClean.currentPackageId ? 'active' : ''}"
             onclick="selectPackage(${pkg.id})"
             style="display: flex; gap: 1rem; padding: 1rem; margin-bottom: 0.75rem; background: var(--card-bg); border: 2px solid ${pkg.id === window.packageManagerClean.currentPackageId ? 'var(--primary-color)' : 'transparent'}; border-radius: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">

            <!-- Pricing Box (Left Side) -->
            <div style="width: 85px; flex-shrink: 0; background: var(--primary-color); border-radius: 10px; padding: 0.75rem; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.15), transparent); animation: shimmerContainer 3s infinite; pointer-events: none;"></div>
                <div style="position: relative; z-index: 1; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: white; line-height: 1;">${pkg.hourlyRate}</div>
                    <div style="font-size: 0.7rem; color: rgba(255,255,255,0.9); text-transform: uppercase; margin-top: 0.25rem; font-weight: 500;">${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}/hr</div>
                </div>
            </div>

            <!-- Package Info (Right Side) -->
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.375rem;">
                        <span style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${pkg.name}</span>
                        <button onclick="event.stopPropagation(); deletePackageConfirm(${pkg.id})"
                                style="width: 28px; height: 28px; border-radius: 6px; background: transparent; border: none; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; margin-left: 0.5rem;"
                                title="Delete">
                            <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
                        </button>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${pkg.courses && pkg.courses.length > 0 ? pkg.courses.slice(0, 2).join(', ') + (pkg.courses.length > 2 ? '...' : '') : 'No courses'}
                    </div>
                </div>
                <div style="display: flex; gap: 0.375rem; flex-wrap: wrap;">
                    ${(() => {
                        // Get unique course levels from courses
                        const allCourses = [...(pkg.courses || []), ...(pkg.pendingCourses || [])];
                        const levels = [...new Set(allCourses.map(c => c.course_level).filter(Boolean))];
                        return levels.length > 0
                            ? levels.slice(0, 2).map(level => `<span style="background: var(--badge-bg); color: var(--primary-color); border: 1px solid var(--badge-border); padding: 0.25rem 0.5rem; border-radius: 5px; font-size: 0.7rem; font-weight: 500;">${level}</span>`).join('') + (levels.length > 2 ? '<span style="background: var(--badge-bg); color: var(--text-secondary); padding: 0.25rem 0.5rem; border-radius: 5px; font-size: 0.7rem;">+' + (levels.length - 2) + '</span>' : '')
                            : '';
                    })()}
                    ${pkg.paymentFrequency ? `<span style="background: var(--badge-bg); color: var(--primary-color); border: 1px solid var(--badge-border); padding: 0.25rem 0.5rem; border-radius: 5px; font-size: 0.7rem; font-weight: 500;">${pkg.paymentFrequency === '2-weeks' ? 'Bi-weekly' : 'Monthly'}</span>` : ''}
                </div>
            </div>
        </div>
    `;
    }).join('');
    console.log('✅ Package list rendered successfully');
}

window.createNewPackage = async function() {
    console.log('📦 createNewPackage called');
    const newPackage = await window.packageManagerClean.addPackage({
        name: `Package ${window.packageManagerClean.packages.length + 1}`,
        courses: [],
        courseIds: [],
        paymentFrequency: 'monthly',
        hourlyRate: 0,
        discounts: { threeMonths: 0, sixMonths: 0, yearly: 0 }
    });

    if (newPackage) {
        console.log('✅ New package created:', newPackage);
        renderPackagesList();
        renderPackagesGrid();  // Update the package cards on the main page
        selectPackage(newPackage.id);

        if (newPackage._savedToDatabase) {
            console.log('✅ Package saved to database');
        } else {
            console.warn('⚠️ Package only saved locally');
        }
    } else {
        console.error('❌ Failed to create package');
        // Alert already shown by addPackage
    }
};

/**
 * ═══════════════════════════════════════════════════════════
 * TOGGLE PACKAGE SIDEBAR (CLEAN REBUILD)
 * ═══════════════════════════════════════════════════════════
 *
 * DESKTOP (>1024px):
 * - Collapses sidebar (icon bar + content)
 * - Both packageEditorContainer and marketTrendView transition smoothly
 * - Transitions handled by CSS
 *
 * MOBILE/TABLET (≤1024px):
 * - Shows sidebar as overlay with packages panel visible
 * - Sidebar appears on top of everything (z-index: 1003)
 * - Backdrop dims background (z-index: 1002)
 * - Main content doesn't shift (overlay behavior)
 */

window.togglePackageSidebar = function() {
    const sidebar = document.getElementById('packageManagementSidebar');
    const layout = document.querySelector('.package-layout');
    const backdrop = document.getElementById('sidebarBackdrop');
    const sidebarContent = document.getElementById('sidebarContent');
    const isMobile = window.innerWidth <= 1024;

    if (!sidebar || !layout) {
        console.warn('⚠️ Sidebar or layout not found');
        return;
    }

    if (isMobile) {
        // ═══════════════════════════════════════════════════════════
        // MOBILE/TABLET (≤1024px): Overlay behavior
        // ═══════════════════════════════════════════════════════════

        const isVisible = sidebar.classList.toggle('visible');

        // Toggle backdrop
        if (backdrop) {
            backdrop.classList.toggle('active', isVisible);
        }

        // Always show sidebar content when sidebar is visible
        if (sidebarContent) {
            if (isVisible) {
                sidebarContent.classList.add('active');
                sidebarContent.style.display = ''; // Reset display

                // Restore last active panel instead of forcing packages
                const packagesPanel = document.getElementById('packagesPanel');
                const marketTrendPanel = document.getElementById('marketTrendPanel');

                if (lastActivePanel === 'market-trend') {
                    if (packagesPanel) packagesPanel.classList.remove('active');
                    if (marketTrendPanel) marketTrendPanel.classList.add('active');
                } else {
                    if (packagesPanel) packagesPanel.classList.add('active');
                    if (marketTrendPanel) marketTrendPanel.classList.remove('active');
                }

                // Set corresponding icon button as active
                const iconButtons = document.querySelectorAll('.sidebar-icon-btn');
                iconButtons.forEach(btn => {
                    if (btn.getAttribute('data-panel') === lastActivePanel) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });

                // Restore corresponding main view
                const packageEditorContainer = document.getElementById('packageEditorContainer');
                const marketTrendView = document.getElementById('marketTrendView');

                if (lastActivePanel === 'market-trend') {
                    if (packageEditorContainer) packageEditorContainer.classList.add('hidden');
                    if (marketTrendView) {
                        marketTrendView.classList.add('active');
                        marketTrendView.style.display = 'flex';
                    }
                } else {
                    if (packageEditorContainer) packageEditorContainer.classList.remove('hidden');
                    if (marketTrendView) {
                        marketTrendView.classList.remove('active');
                        marketTrendView.style.display = 'none';
                    }
                }
            } else {
                sidebarContent.classList.remove('active');
            }
        }

        console.log(`📱 Mobile: Sidebar ${isVisible ? 'opened' : 'closed'} (overlay)`);
    } else {
        // ═══════════════════════════════════════════════════════════
        // DESKTOP (>1024px): Collapse/expand behavior
        // ═══════════════════════════════════════════════════════════

        const isCollapsed = sidebar.classList.toggle('collapsed');
        layout.classList.toggle('sidebar-collapsed');

        // FIX A: Toggle sidebar content on desktop (not just close)
        if (sidebarContent) {
            if (isCollapsed) {
                sidebarContent.classList.remove('active');
            } else {
                sidebarContent.classList.add('active');
                sidebarContent.style.display = ''; // Reset display

                // Restore last active panel instead of forcing packages
                const packagesPanel = document.getElementById('packagesPanel');
                const marketTrendPanel = document.getElementById('marketTrendPanel');

                if (lastActivePanel === 'market-trend') {
                    if (packagesPanel) packagesPanel.classList.remove('active');
                    if (marketTrendPanel) marketTrendPanel.classList.add('active');
                } else {
                    if (packagesPanel) packagesPanel.classList.add('active');
                    if (marketTrendPanel) marketTrendPanel.classList.remove('active');
                }

                // Set corresponding icon button as active
                const iconButtons = document.querySelectorAll('.sidebar-icon-btn');
                iconButtons.forEach(btn => {
                    if (btn.getAttribute('data-panel') === lastActivePanel) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });

                // Restore corresponding main view
                const packageEditorContainer = document.getElementById('packageEditorContainer');
                const marketTrendView = document.getElementById('marketTrendView');

                if (lastActivePanel === 'market-trend') {
                    if (packageEditorContainer) packageEditorContainer.classList.add('hidden');
                    if (marketTrendView) {
                        marketTrendView.classList.add('active');
                        marketTrendView.style.display = 'flex';
                    }
                } else {
                    if (packageEditorContainer) packageEditorContainer.classList.remove('hidden');
                    if (marketTrendView) {
                        marketTrendView.classList.remove('active');
                        marketTrendView.style.display = 'none';
                    }
                }
            }
        }

        // Resize chart if it exists (after sidebar toggle animation)
        setTimeout(() => {
            if (window.marketChartInstance && typeof window.marketChartInstance.resize === 'function') {
                window.marketChartInstance.resize();
                console.log('📊 Chart resized after sidebar toggle');
            }
        }, 450); // Wait for CSS transition to complete (0.4s + buffer)

        console.log(`🖥️ Desktop: Sidebar ${isCollapsed ? 'collapsed' : 'expanded'} (content + packages panel)`);
    }
};

/**
 * ═══════════════════════════════════════════════════════════
 * CALCULATOR TOGGLE FUNCTION
 * ═══════════════════════════════════════════════════════════
 */

window.toggleCalculatorWidget = function() {
    const calculator = document.getElementById('feeCalculatorWidget');
    const toggleBtn = document.querySelector('.calculator-toggle-btn');
    const backdrop = document.querySelector('.calculator-widget-backdrop');
    const isMobile = window.innerWidth <= 1024;

    if (calculator) {
        const isHidden = calculator.classList.contains('hidden');

        if (isHidden) {
            // Show calculator
            calculator.classList.remove('hidden');
            if (toggleBtn) toggleBtn.classList.add('active');
            // FIX C: Never show backdrop - calculator should not blur the page
            // Backdrop removed completely
            console.log('✅ Calculator widget opened (no backdrop)');
        } else {
            // Hide calculator
            calculator.classList.add('hidden');
            if (toggleBtn) toggleBtn.classList.remove('active');
            // Ensure backdrop is removed (if it exists)
            if (backdrop) backdrop.classList.remove('active');
            console.log('✅ Calculator widget closed');
        }
    }
};

// FIX C: Calculator backdrop removed - no longer needed
// Calculator no longer blurs/blocks the page

window.switchPackagePanel = function(panelName) {
    console.log('🔄 Switching to panel:', panelName);
    // Store the last active panel for sidebar toggle
    lastActivePanel = panelName;

    // Update icon button states
    const iconButtons = document.querySelectorAll('#package-management-modal .sidebar-icon-btn');
    iconButtons.forEach(btn => {
        if (btn.getAttribute('data-panel') === panelName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Get main area containers (new structure)
    const packageEditorContainer = document.getElementById('packageEditorContainer');
    const marketTrendView = document.getElementById('marketTrendView');
    const sidebarContent = document.getElementById('sidebarContent');

    // Get sidebar panels
    const packagesPanel = document.getElementById('packagesPanel');
    const marketTrendPanel = document.getElementById('marketTrendPanel');

    // Get modal header elements
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');

    // Get sidebar elements
    const sidebar = document.getElementById('packageManagementSidebar');
    const packageLayout = document.querySelector('#package-management-modal .package-layout');
    const backdrop = document.getElementById('sidebarBackdrop');

    if (panelName === 'market-trend') {
        // Hide package editor container, show market trend view (full width)
        if (packageEditorContainer) {
            packageEditorContainer.classList.add('hidden');
        }
        if (marketTrendView) {
            marketTrendView.classList.add('active');
            marketTrendView.style.display = 'flex';
        }

        // Show sidebar with market trend panel
        if (sidebarContent) {
            sidebarContent.classList.add('active');
            sidebarContent.style.display = '';
        }

        // Switch sidebar panels - hide packages, show market trend
        if (packagesPanel) {
            packagesPanel.classList.remove('active');
        }
        if (marketTrendPanel) {
            marketTrendPanel.classList.add('active');
        }

        // Ensure sidebar is not collapsed
        if (sidebar) {
            sidebar.classList.remove('collapsed');
        }
        if (packageLayout) {
            packageLayout.classList.remove('sidebar-collapsed');
        }
        if (backdrop) {
            backdrop.classList.remove('active');
        }

        // Hide Save Package button (not relevant for market trends)
        const savePackageBtn = document.getElementById('savePackageBtn');
        if (savePackageBtn) savePackageBtn.style.display = 'none';

        // Update modal header with Market Insights
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-lightbulb"></i> Market Insights for Tutors';
        }
        if (modalSubtitle) {
            modalSubtitle.textContent = 'Building a consistent track record with high ratings is key to commanding higher prices.';
            modalSubtitle.style.display = 'block';
        }

        // Initialize the default view (Line Graph) - container is visible by default
        setTimeout(() => {
            // Ensure graph container is visible and table/price containers are hidden
            const graphContainer = document.getElementById('marketGraphContainer');
            const tableContainer = document.getElementById('marketTableContainer');
            const priceContainer = document.getElementById('marketPriceContainer');

            if (graphContainer) graphContainer.classList.remove('hidden');
            if (tableContainer) tableContainer.classList.add('hidden');
            if (priceContainer) priceContainer.classList.add('hidden');

            // Auto-load graph if not already loaded
            if (!marketChartInstance && typeof updateMarketGraph === 'function') {
                updateMarketGraph();
            }
        }, 100);

        console.log('✅ Market trend view displayed with sidebar panel');
    } else {
        // Show package editor container (editor + calculator), hide market trend view
        if (packageEditorContainer) {
            packageEditorContainer.classList.remove('hidden');
        }
        if (marketTrendView) {
            marketTrendView.classList.remove('active');
            marketTrendView.style.display = 'none';
        }

        // Show sidebar content with packages panel
        if (sidebarContent) {
            sidebarContent.classList.add('active');
            sidebarContent.style.display = ''; // Reset display property
        }

        // Switch sidebar panels - show packages, hide market trend
        if (packagesPanel) {
            packagesPanel.classList.add('active');
        }
        if (marketTrendPanel) {
            marketTrendPanel.classList.remove('active');
        }

        // Ensure sidebar is not collapsed
        if (sidebar) {
            sidebar.classList.remove('collapsed');
        }
        if (packageLayout) {
            packageLayout.classList.remove('sidebar-collapsed');
        }

        // IMPORTANT: Populate packages list when switching to packages panel
        console.log('📦 Rendering packages list...');
        renderPackagesList();

        // If packages exist and none is currently selected, select the first one
        if (window.packageManagerClean.packages.length > 0 && !window.packageManagerClean.currentPackageId) {
            selectPackage(window.packageManagerClean.packages[0].id);
        }

        // Reset modal header
        if (modalTitle) {
            modalTitle.textContent = '📦 Package Management';
        }
        if (modalSubtitle) {
            modalSubtitle.style.display = 'none';
        }

        console.log('✅ Package editor container displayed (editor + calculator), sidebar expanded with packages panel');
    }
};

window.selectPackage = function(packageId) {
    // If in market trend view, switch back to packages view first
    const marketTrendView = document.getElementById('marketTrendView');
    if (marketTrendView && (marketTrendView.classList.contains('active') || marketTrendView.style.display === 'flex')) {
        switchPackagePanel('packages');
    }

    window.packageManagerClean.currentPackageId = packageId;
    window.packageManagerClean.currentPackage = window.packageManagerClean.getPackage(packageId);

    renderPackagesList(); // Update active state
    renderPackageEditor();

    // Show save button
    const saveBtn = document.getElementById('savePackageBtn');
    if (saveBtn) saveBtn.style.display = 'inline-flex';
};

window.deletePackageConfirm = async function(packageId) {
    if (confirm('Are you sure you want to delete this package?')) {
        await window.packageManagerClean.deletePackage(packageId);
        renderPackagesList();
        renderPackagesGrid();  // Update the package cards on the main page

        if (window.packageManagerClean.packages.length === 0) {
            showEmptyState();
            const saveBtn = document.getElementById('savePackageBtn');
            if (saveBtn) saveBtn.style.display = 'none';
        } else {
            selectPackage(window.packageManagerClean.packages[0].id);
        }
    }
};

/**
 * ═══════════════════════════════════════════════════════════
 * EDITOR FUNCTIONS
 * ═══════════════════════════════════════════════════════════
 */

function showEmptyState() {
    console.log('📭 showEmptyState called');
    const editor = document.getElementById('packageEditor');
    console.log('packageEditor element:', editor);

    if (!editor) {
        console.error('❌ packageEditor element not found!');
        return;
    }

    editor.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-box-open"></i>
            <h3>No Package Selected</h3>
            <p>Select a package from the sidebar or create a new one</p>
            <button class="btn-create-first" onclick="createNewPackage()">
                <i class="fas fa-plus mr-2"></i>Create Your First Package
            </button>
        </div>
    `;
    console.log('✅ Empty state rendered');
}

function renderPackageEditor() {
    const editor = document.getElementById('packageEditor');
    if (!editor) return;

    const pkg = window.packageManagerClean.currentPackage;
    if (!pkg) {
        showEmptyState();
        return;
    }

    editor.innerHTML = `
        <div class="package-editor-layout">
            <!-- LEFT: Package Form -->
            <div class="package-form">
                <div class="package-form-header">
                    <h3>📦 ${pkg.name}</h3>
                    <p>Configure package details and pricing</p>
                </div>

                <!-- Package Name -->
                <div class="form-section">
                    <div class="form-field">
                        <label><i class="fas fa-tag"></i> Package Name</label>
                        <input type="text" id="packageName" value="${pkg.name}" placeholder="e.g., Mathematics Package">
                    </div>
                </div>

                <!-- Courses Section - Expanded -->
                <div class="form-section courses-section-expanded">
                    <div class="form-section-title">
                        <i class="fas fa-book"></i> Courses Included
                    </div>

                    <!-- Live Course Search Bar -->
                    <div class="course-search-section" style="margin-bottom: 1rem;">
                        <div class="course-search-wrapper" style="position: relative;">
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <div style="flex: 1; position: relative;">
                                    <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af;"></i>
                                    <input type="text"
                                           id="courseSearchInput"
                                           placeholder="Search verified courses..."
                                           oninput="handleCourseSearch(this.value)"
                                           onfocus="showCourseSearchResults()"
                                           autocomplete="off"
                                           style="width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem; border: 2px solid var(--border-color); border-radius: 8px; font-size: 0.95rem; transition: all 0.2s;">
                                </div>
                                <button class="btn-request-course" onclick="openCourseRequestModal()" title="Request new course"
                                        style="padding: 0.75rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: 600; white-space: nowrap;">
                                    <i class="fas fa-plus"></i> Request New
                                </button>
                            </div>
                            <!-- Search Results Dropdown -->
                            <div id="courseSearchResults" class="course-search-results" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--card-bg); border: 2px solid var(--border-color); border-radius: 8px; margin-top: 4px; max-height: 300px; overflow-y: auto; z-index: 100; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                                <!-- Search results will be inserted here -->
                            </div>
                        </div>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.8rem; color: #6b7280;">
                            <i class="fas fa-info-circle"></i> Search for verified courses or request a new one
                        </p>
                    </div>

                    <!-- Add/Edit Course Form (hidden by default) - KEPT FOR LEGACY -->
                    <div id="courseFormContainer" class="course-form-container" style="display: none;">
                        <div class="course-form-card">
                            <div class="course-form-header">
                                <h4 id="courseFormTitle"><i class="fas fa-plus-circle"></i> Add New Course</h4>
                                <button class="btn-close-course-form" onclick="closeCourseForm()">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="course-form-body">
                                <!-- Thumbnail Upload Section -->
                                <div class="course-thumbnail-upload-section">
                                    <label><i class="fas fa-image"></i> Course Thumbnail</label>
                                    <div class="course-thumbnail-uploader" id="courseThumbnailUploader" onclick="triggerCourseThumbnailUpload()">
                                        <input type="file" id="courseThumbnailInput" accept="image/*" style="display: none;" onchange="handleCourseThumbnailUpload(event)">
                                        <input type="hidden" id="courseThumbnail" value="">
                                        <div class="thumbnail-preview" id="thumbnailPreview">
                                            <i class="fas fa-cloud-upload-alt"></i>
                                            <span class="upload-text">Click to upload thumbnail</span>
                                            <span class="upload-hint">PNG, JPG, GIF up to 5MB</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="form-row">
                                    <div class="form-field">
                                        <label><i class="fas fa-heading"></i> Course Name *</label>
                                        <input type="text" id="courseName" placeholder="e.g., Mathematics Grade 10">
                                    </div>
                                    <div class="form-field">
                                        <label><i class="fas fa-folder"></i> Category *</label>
                                        <select id="courseCategory" onchange="toggleCustomCategory()">
                                            <option value="">Select Category</option>
                                            <option value="Academic">Academic</option>
                                            <option value="Business">Business</option>
                                            <option value="Technology">Technology</option>
                                            <option value="Art & Design">Art & Design</option>
                                            <option value="Music">Music</option>
                                            <option value="Language">Language</option>
                                            <option value="Health & Fitness">Health & Fitness</option>
                                            <option value="Lifestyle">Lifestyle</option>
                                            <option value="Test Prep">Test Prep</option>
                                            <option value="Professional">Professional</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <input type="text" id="customCategoryInput" class="custom-category-input" placeholder="Enter custom category" style="display: none; margin-top: 0.5rem;">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-field">
                                        <label><i class="fas fa-graduation-cap"></i> Grade Level *</label>
                                        <select id="courseLevel">
                                            <option value="">Select Grade Level</option>
                                            <option value="KG">Kindergarten (KG)</option>
                                            <option value="Elementary">Elementary (Grade 1-6)</option>
                                            <option value="Grade 7-8">Grade 7-8</option>
                                            <option value="Grade 9-10">Grade 9-10</option>
                                            <option value="Grade 11-12">Grade 11-12</option>
                                            <option value="University Level">University Level</option>
                                            <option value="Professional">Professional/Adult Education</option>
                                            <option value="All Levels">All Levels</option>
                                        </select>
                                    </div>
                                    <div class="form-field">
                                        <label><i class="fas fa-align-left"></i> Description</label>
                                        <textarea id="courseDescription" rows="2" placeholder="Brief description of what this course covers..."></textarea>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-field">
                                        <label><i class="fas fa-clock"></i> Duration (hours)</label>
                                        <input type="number" id="courseDuration" min="1" placeholder="e.g., 20">
                                    </div>
                                    <div class="form-field">
                                        <label><i class="fas fa-list-ol"></i> Number of Lessons</label>
                                        <input type="number" id="courseLessons" min="1" placeholder="e.g., 12" oninput="updateLessonTitleInputs()">
                                    </div>
                                </div>

                                <!-- Languages Section -->
                                <div class="form-field languages-section">
                                    <label><i class="fas fa-language"></i> Languages Taught</label>
                                    <div class="language-input-wrapper">
                                        <input type="text" id="languageInput" placeholder="Type a language and press Enter or click +" onkeypress="handleLanguageKeypress(event)">
                                        <button type="button" class="btn-add-language" onclick="addLanguageTag()">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    </div>
                                    <div class="language-suggestions">
                                        <span class="suggestion-label">Suggestions:</span>
                                        <button type="button" onclick="addLanguageSuggestion('English')">English</button>
                                        <button type="button" onclick="addLanguageSuggestion('Amharic')">Amharic</button>
                                        <button type="button" onclick="addLanguageSuggestion('Oromo')">Oromo</button>
                                        <button type="button" onclick="addLanguageSuggestion('Tigrinya')">Tigrinya</button>
                                        <button type="button" onclick="addLanguageSuggestion('French')">French</button>
                                        <button type="button" onclick="addLanguageSuggestion('Arabic')">Arabic</button>
                                    </div>
                                    <div class="language-tags" id="languageTagsContainer">
                                        <!-- Language tags will be added here -->
                                    </div>
                                </div>

                                <!-- Lesson Titles Section -->
                                <div class="form-field lesson-titles-section">
                                    <label><i class="fas fa-list"></i> Lesson Titles</label>
                                    <div id="lessonTitlesContainer" class="lesson-titles-container">
                                        <p class="lesson-titles-hint">Enter number of lessons above to add lesson titles</p>
                                    </div>
                                </div>
                            </div>
                            <div class="course-form-footer">
                                <button class="btn-secondary" onclick="closeCourseForm()">Cancel</button>
                                <button class="btn-primary" onclick="saveCourseToPackage()">
                                    <i class="fas fa-save"></i> <span id="saveCourseBtn">Add Course</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Courses List -->
                    <div id="coursesListContainer" class="courses-list-container">
                        ${renderCoursesCards(pkg)}
                    </div>
                </div>

                <!-- Session Format -->
                <div class="form-section">
                    <div class="form-section-title">
                        <i class="fas fa-video"></i> Session Format
                    </div>
                    <div class="checkbox-group" style="display: flex; gap: 24px; flex-wrap: wrap;">
                        <label class="checkbox-label">
                            <input type="radio" name="sessionFormat" id="formatOnline" value="Online" ${pkg.session_format?.toLowerCase() === 'online' ? 'checked' : ''}>
                            <span><i class="fas fa-laptop"></i> Online</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="radio" name="sessionFormat" id="formatInPerson" value="In-person" ${pkg.session_format?.toLowerCase() === 'in-person' ? 'checked' : ''}>
                            <span><i class="fas fa-users"></i> In-Person</span>
                        </label>
                    </div>
                </div>

                <!-- Session Schedule -->
                <div class="form-section">
                    <div class="form-section-title">
                        <i class="fas fa-calendar-alt"></i> Session Schedule
                    </div>

                    <!-- Schedule Type Selection -->
                    <div class="form-field" style="margin-bottom: 16px;">
                        <label>Schedule Type</label>
                        <div style="display: flex; gap: 16px;">
                            <label class="inline-flex items-center">
                                <input type="radio" name="pkg-schedule-type" value="recurring"
                                    ${!pkg.scheduleType || pkg.scheduleType === 'recurring' ? 'checked' : ''}
                                    class="mr-2" onchange="togglePackageScheduleType()">
                                <span>Recurring</span>
                            </label>
                            <label class="inline-flex items-center">
                                <input type="radio" name="pkg-schedule-type" value="specific"
                                    ${pkg.scheduleType === 'specific' ? 'checked' : ''}
                                    class="mr-2" onchange="togglePackageScheduleType()">
                                <span>Specific Dates</span>
                            </label>
                        </div>
                    </div>

                    <!-- Recurring Schedule -->
                    <div id="pkg-recurring-schedule" style="display: ${!pkg.scheduleType || pkg.scheduleType === 'recurring' ? 'block' : 'none'};">
                        <!-- Days of the Week -->
                        <div class="form-field">
                            <label>Days of the Week</label>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                                ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => `
                                    <label class="day-checkbox" style="display: flex; align-items: center; gap: 6px; padding: 8px; background: var(--card-bg); border-radius: 6px; cursor: pointer;">
                                        <input type="checkbox" name="pkg-schedule-day" value="${day}"
                                            ${pkg.scheduleDays?.includes(day) ? 'checked' : ''}>
                                        <span style="font-size: 0.875rem;">${day.slice(0, 3)}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Time Selection -->
                        <div class="form-row" style="margin-top: 12px;">
                            <div class="form-field">
                                <label><i class="fas fa-clock"></i> Start Time</label>
                                <input type="time" id="pkg-start-time" value="${pkg.startTime || '09:00'}">
                            </div>
                            <div class="form-field">
                                <label><i class="fas fa-clock"></i> End Time</label>
                                <input type="time" id="pkg-end-time" value="${pkg.endTime || '10:00'}">
                            </div>
                        </div>
                    </div>

                    <!-- Specific Dates -->
                    <div id="pkg-specific-schedule" style="display: ${pkg.scheduleType === 'specific' ? 'block' : 'none'};">
                        <div class="form-row">
                            <div class="form-field">
                                <label><i class="fas fa-calendar"></i> Start Date</label>
                                <input type="date" id="pkg-start-date" value="${pkg.startDate || ''}">
                            </div>
                            <div class="form-field">
                                <label><i class="fas fa-calendar"></i> End Date</label>
                                <input type="date" id="pkg-end-date" value="${pkg.endDate || ''}">
                            </div>
                        </div>
                        <div class="form-row" style="margin-top: 12px;">
                            <div class="form-field">
                                <label><i class="fas fa-clock"></i> Session Time</label>
                                <input type="time" id="pkg-session-time" value="${pkg.sessionTime || '09:00'}">
                            </div>
                            <div class="form-field">
                                <label><i class="fas fa-hourglass-half"></i> Duration (hours)</label>
                                <input type="number" id="pkg-session-duration" value="${pkg.sessionDuration || '1'}" min="0.5" step="0.5">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pricing Details -->
                <div class="form-section">
                    <div class="form-section-title">
                        <i class="fas fa-money-bill"></i> Pricing
                    </div>

                    <!-- Make Estimate Checkbox - Full Width Above Fields -->
                    <div style="margin-bottom: 1rem; padding: 0.875rem 1rem; background: var(--hover-bg); border-radius: 8px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 0.75rem;">
                        <input type="checkbox" id="makeEstimate" ${pkg.makeEstimate ? 'checked' : ''}
                               style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary-color); flex-shrink: 0;">
                        <label for="makeEstimate" style="margin: 0; cursor: pointer; font-weight: 500; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem; flex: 1;">
                            <i class="fas fa-calculator"></i> Make an estimate
                            <span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 400;">(Calculate fees based on days/hours)</span>
                        </label>
                    </div>

                    <div class="form-row">
                        <div class="form-field">
                            <label><i class="fas fa-calendar"></i> Payment Frequency</label>
                            <select id="paymentFrequency" oninput="updateCalculator()">
                                <option value="2-weeks" ${pkg.paymentFrequency === '2-weeks' ? 'selected' : ''}>2 Weeks</option>
                                <option value="monthly" ${pkg.paymentFrequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label><i class="fas fa-dollar-sign"></i> Hourly Rate (${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'})</label>
                            <input type="number" id="hourlyRate" value="${pkg.hourlyRate}" min="0" placeholder="200" oninput="updateCalculator()">
                        </div>
                    </div>
                </div>

                <!-- Discounts -->
                <div class="form-section">
                    <div class="form-section-title">
                        <i class="fas fa-percent"></i> Discounts
                    </div>
                    <div class="discount-fields">
                        <div class="form-field">
                            <label>3 Months (%)</label>
                            <input type="number" id="discount3" value="${pkg.discounts.threeMonths}" min="0" max="100" oninput="updateCalculator()">
                        </div>
                        <div class="form-field">
                            <label>6 Months (%)</label>
                            <input type="number" id="discount6" value="${pkg.discounts.sixMonths}" min="0" max="100" oninput="updateCalculator()">
                        </div>
                        <div class="form-field">
                            <label>Yearly (%)</label>
                            <input type="number" id="discountYear" value="${pkg.discounts.yearly}" min="0" max="100" oninput="updateCalculator()">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Calculator Widget is now in the HTML, not generated by JS -->
        </div>
    `;

    // Local function to add course (specific to package modal)
    const addCourseToPackage = () => {
        console.log('➕ addCourseToPackage called');
        const input = document.getElementById('courseInput');
        console.log('📝 Course input element:', input);
        console.log('📝 Input value:', input?.value);

        if (!input || !input.value.trim()) {
            console.warn('⚠️ No input or empty value');
            return;
        }

        const courseName = input.value.trim();
        const pkg = window.packageManagerClean.currentPackage;

        console.log('📦 Current package:', pkg);
        console.log('📚 Course name to add:', courseName);
        console.log('📚 Existing courses:', pkg?.courses);

        if (!pkg) {
            console.error('❌ No current package selected!');
            alert('Please create or select a package first');
            return;
        }

        if (!pkg.courses.includes(courseName)) {
            pkg.courses.push(courseName);
            input.value = '';
            console.log('✅ Course added! New courses:', pkg.courses);
            renderPackageEditor();
        } else {
            console.warn('⚠️ Course already exists');
            alert('This course is already added');
        }
    };

    // Setup enter key for course input
    const courseInput = document.getElementById('courseInput');
    if (courseInput) {
        courseInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCourseToPackage();
            }
        });
    }

    // Setup click handler for add course button
    const addCourseBtn = document.querySelector('.btn-add-course');
    if (addCourseBtn) {
        addCourseBtn.onclick = (e) => {
            e.preventDefault();
            console.log('🖱️ Add course button clicked!');
            addCourseToPackage();
        };
    } else {
        console.warn('⚠️ Add course button not found in DOM!');
    }

    // Add event listener for "Make an Estimate" checkbox
    const makeEstimateCheckbox = document.getElementById('makeEstimate');
    if (makeEstimateCheckbox) {
        makeEstimateCheckbox.addEventListener('change', async function(e) {
            if (e.target.checked) {
                console.log('💰 Make an Estimate checked - fetching suggested market price...');
                await fetchAndApplyMarketPrice();
            } else {
                console.log('ℹ️ Make an Estimate unchecked');
            }
        });
    }

    // Initial calculator update
    updateCalculator();
}

window.addCourse = function() {
    console.log('➕ addCourse called');
    const input = document.getElementById('courseInput');
    console.log('📝 Course input element:', input);
    console.log('📝 Input value:', input?.value);

    if (!input || !input.value.trim()) {
        console.warn('⚠️ No input or empty value');
        return;
    }

    const courseName = input.value.trim();
    const pkg = window.packageManagerClean.currentPackage;

    console.log('📦 Current package:', pkg);
    console.log('📚 Course name to add:', courseName);
    console.log('📚 Existing courses:', pkg?.courses);

    if (!pkg) {
        console.error('❌ No current package selected!');
        alert('Please create or select a package first');
        return;
    }

    if (!pkg.courses.includes(courseName)) {
        pkg.courses.push(courseName);
        input.value = '';
        console.log('✅ Course added! New courses:', pkg.courses);
        renderPackageEditor();
    } else {
        console.warn('⚠️ Course already exists');
        alert('This course is already added');
    }
};

window.removeCourse = function(courseIndex) {
    const pkg = window.packageManagerClean.currentPackage;
    if (typeof courseIndex === 'number') {
        pkg.courses.splice(courseIndex, 1);
    } else {
        // Legacy support for string-based removal
        pkg.courses = pkg.courses.filter(c => {
            if (typeof c === 'string') return c !== courseIndex;
            return c.name !== courseIndex;
        });
    }
    renderPackageEditor();
};

/**
 * ═══════════════════════════════════════════════════════════
 * EXPANDED COURSE FORM FUNCTIONS
 * ═══════════════════════════════════════════════════════════
 */

// Track which course is being edited (-1 = new course)
window.editingCourseIndex = -1;

// Render course cards - now handles both approved and pending courses
function renderCoursesCards(pkg) {
    const approvedCourses = pkg.courses || [];
    const pendingCourses = pkg.pendingCourses || [];

    if (approvedCourses.length === 0 && pendingCourses.length === 0) {
        return `
            <div class="empty-courses-state">
                <i class="fas fa-book-open"></i>
                <p>No courses added yet</p>
                <span>Click "Add Course" to include courses in this package</span>
            </div>
        `;
    }

    let html = '';

    // Render approved courses
    if (approvedCourses.length > 0) {
        html += `<div class="courses-section approved-courses">
            <h6 class="courses-section-title"><i class="fas fa-check-circle" style="color: #10b981;"></i> Approved Courses (${approvedCourses.length})</h6>
        `;
        html += approvedCourses.map((course, index) => renderCourseCard(course, index, 'approved')).join('');
        html += '</div>';
    }

    // Render pending courses
    if (pendingCourses.length > 0) {
        html += `<div class="courses-section pending-courses" style="margin-top: 1rem;">
            <h6 class="courses-section-title"><i class="fas fa-hourglass-half" style="color: #f59e0b;"></i> Pending Approval (${pendingCourses.length})</h6>
        `;
        html += pendingCourses.map((course, index) => renderCourseCard(course, index, 'pending')).join('');
        html += '</div>';
    }

    return html;
}

function renderCourseCard(course, index, status) {
    // Handle backend format (course_name) and frontend format (name)
    const courseName = course.course_name || course.name || 'Unnamed Course';
    const category = course.course_category || course.category || 'General';
    const description = course.course_description || course.description || '';
    const thumbnail = course.thumbnail || '';
    const duration = course.duration || 0;
    const lessonsCount = course.lessons || 0;

    // Handle language array
    let languagesText = 'English';
    if (course.language && Array.isArray(course.language)) {
        languagesText = course.language.join(', ');
    } else if (course.languages && Array.isArray(course.languages)) {
        languagesText = course.languages.join(', ');
    }

    // Handle lesson titles
    const lessonTitles = course.lesson_title || course.lessonTitles || [];

    const statusBadge = status === 'pending'
        ? `<span class="course-status-badge pending" style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;"><i class="fas fa-hourglass-half"></i> Pending</span>`
        : `<span class="course-status-badge approved" style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;"><i class="fas fa-check"></i> Approved</span>`;

    return `
        <div class="course-card-expanded ${status === 'pending' ? 'course-pending' : 'course-approved'}" style="${status === 'pending' ? 'border-left: 3px solid #f59e0b;' : 'border-left: 3px solid #10b981;'}">
            <div class="course-card-thumbnail">
                ${thumbnail
                    ? `<img src="${thumbnail}" alt="${courseName}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-book\\'></i>'">`
                    : `<i class="fas fa-book"></i>`
                }
            </div>
            <div class="course-card-details">
                <div class="course-card-header">
                    <h5>${courseName}</h5>
                    <div class="course-badges" style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <span class="course-category-badge">${category}</span>
                        ${statusBadge}
                    </div>
                </div>
                ${description ? `<p class="course-description">${description}</p>` : ''}
                <div class="course-meta">
                    <span><i class="fas fa-clock"></i> ${duration}h</span>
                    <span><i class="fas fa-list-ol"></i> ${lessonsCount} lessons</span>
                    <span><i class="fas fa-language"></i> ${languagesText}</span>
                </div>
                ${lessonTitles.length > 0 ? `
                    <div class="course-lessons-preview">
                        <span class="lessons-label">Lessons:</span>
                        <span class="lessons-list">${lessonTitles.slice(0, 3).join(', ')}${lessonTitles.length > 3 ? '...' : ''}</span>
                    </div>
                ` : ''}
            </div>
            <div class="course-card-actions">
                ${status === 'pending' ? `
                    <button onclick="deletePendingCourse(${course.id})" class="btn-remove-course" title="Cancel Request">
                        <i class="fas fa-times"></i>
                    </button>
                ` : `
                    <button onclick="removeVerifiedCourse(${course.id})" class="btn-remove-course" title="Remove from package" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                        <i class="fas fa-times"></i>
                    </button>
                `}
            </div>
        </div>
    `;
}

// Function to delete a pending course request
window.deletePendingCourse = async function(courseId) {
    if (!confirm('Are you sure you want to cancel this course request?')) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to manage courses');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/tutor/packages/course-request/${courseId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            console.log('✅ Course request deleted');

            // Remove from local state
            const pkg = window.packageManagerClean.currentPackage;
            if (pkg) {
                pkg.pendingCourseIds = (pkg.pendingCourseIds || []).filter(id => id !== courseId);
                pkg.pendingCourses = (pkg.pendingCourses || []).filter(c => c.id !== courseId);
            }

            // Re-render
            renderPackageEditor();
            alert('Course request cancelled successfully');
        } else {
            const errorText = await response.text();
            alert(`Failed to cancel course request: ${errorText}`);
        }
    } catch (error) {
        console.error('Error deleting course request:', error);
        alert('Failed to cancel course request. Please try again.');
    }
};

// Store current course languages
window.courseLanguages = [];

window.openAddCourseForm = function() {
    window.editingCourseIndex = -1;
    window.courseLanguages = ['English']; // Default language
    const formContainer = document.getElementById('courseFormContainer');
    const formTitle = document.getElementById('courseFormTitle');
    const saveBtn = document.getElementById('saveCourseBtn');

    if (formContainer) {
        // Reset form
        document.getElementById('courseName').value = '';
        document.getElementById('courseCategory').value = '';
        document.getElementById('customCategoryInput').value = '';
        document.getElementById('customCategoryInput').style.display = 'none';
        document.getElementById('courseDescription').value = '';
        document.getElementById('courseThumbnail').value = '';
        document.getElementById('courseDuration').value = '';
        document.getElementById('courseLessons').value = '';

        // Reset thumbnail preview
        resetThumbnailPreview();

        // Reset languages
        renderLanguageTags();

        // Reset lesson titles
        document.getElementById('lessonTitlesContainer').innerHTML =
            '<p class="lesson-titles-hint">Enter number of lessons above to add lesson titles</p>';

        formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Course';
        saveBtn.textContent = 'Add Course';
        formContainer.style.display = 'block';
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.closeCourseForm = function() {
    const formContainer = document.getElementById('courseFormContainer');
    if (formContainer) {
        formContainer.style.display = 'none';
    }
    window.editingCourseIndex = -1;
};

window.editCourse = function(index) {
    const pkg = window.packageManagerClean.currentPackage;
    if (!pkg || !pkg.courses || index >= pkg.courses.length) return;

    const course = pkg.courses[index];
    window.editingCourseIndex = index;

    const formContainer = document.getElementById('courseFormContainer');
    const formTitle = document.getElementById('courseFormTitle');
    const saveBtn = document.getElementById('saveCourseBtn');

    if (formContainer) {
        // Handle legacy string format
        if (typeof course === 'string') {
            document.getElementById('courseName').value = course;
            document.getElementById('courseCategory').value = '';
            document.getElementById('customCategoryInput').value = '';
            document.getElementById('customCategoryInput').style.display = 'none';
            document.getElementById('courseDescription').value = '';
            document.getElementById('courseThumbnail').value = '';
            document.getElementById('courseDuration').value = '';
            document.getElementById('courseLessons').value = '';

            // Reset thumbnail preview
            resetThumbnailPreview();

            // Set default language
            window.courseLanguages = ['English'];
            renderLanguageTags();

            document.getElementById('lessonTitlesContainer').innerHTML =
                '<p class="lesson-titles-hint">Enter number of lessons above to add lesson titles</p>';
        } else {
            // Full course object
            document.getElementById('courseName').value = course.name || '';

            // Handle category - check if it's a predefined category or custom
            const categorySelect = document.getElementById('courseCategory');
            const customCategoryInput = document.getElementById('customCategoryInput');
            const predefinedCategories = ['Academic', 'Business', 'Technology', 'Art & Design', 'Music', 'Language', 'Health & Fitness', 'Lifestyle', 'Test Prep', 'Professional', 'Other'];

            if (predefinedCategories.includes(course.category)) {
                categorySelect.value = course.category;
                customCategoryInput.style.display = 'none';
                customCategoryInput.value = '';
            } else if (course.category) {
                categorySelect.value = 'Other';
                customCategoryInput.style.display = 'block';
                customCategoryInput.value = course.category;
            } else {
                categorySelect.value = '';
                customCategoryInput.style.display = 'none';
            }

            document.getElementById('courseDescription').value = course.description || '';
            document.getElementById('courseThumbnail').value = course.thumbnail || '';
            document.getElementById('courseDuration').value = course.duration || '';
            document.getElementById('courseLessons').value = course.lessons || '';

            // Set thumbnail preview if exists
            if (course.thumbnail) {
                setThumbnailPreview(course.thumbnail);
            } else {
                resetThumbnailPreview();
            }

            // Set languages
            window.courseLanguages = course.languages || ['English'];
            renderLanguageTags();

            // Generate lesson title inputs
            if (course.lessons && course.lessons > 0) {
                updateLessonTitleInputs(course.lessonTitles || []);
            } else {
                document.getElementById('lessonTitlesContainer').innerHTML =
                    '<p class="lesson-titles-hint">Enter number of lessons above to add lesson titles</p>';
            }
        }

        formTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Course';
        saveBtn.textContent = 'Update Course';
        formContainer.style.display = 'block';
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.updateLessonTitleInputs = function(existingTitles = []) {
    const lessonsInput = document.getElementById('courseLessons');
    const container = document.getElementById('lessonTitlesContainer');

    const numLessons = parseInt(lessonsInput?.value) || 0;

    if (numLessons <= 0) {
        container.innerHTML = '<p class="lesson-titles-hint">Enter number of lessons above to add lesson titles</p>';
        return;
    }

    if (numLessons > 50) {
        container.innerHTML = '<p class="lesson-titles-hint" style="color: var(--error);">Maximum 50 lessons allowed</p>';
        return;
    }

    let html = '<div class="lesson-titles-grid">';
    for (let i = 0; i < numLessons; i++) {
        const existingTitle = existingTitles[i] || '';
        html += `
            <div class="lesson-title-input-group">
                <span class="lesson-number">${i + 1}</span>
                <input type="text"
                       class="lesson-title-input"
                       id="lessonTitle_${i}"
                       placeholder="Lesson ${i + 1} title"
                       value="${existingTitle}">
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
};

window.saveCourseToPackage = async function() {
    const pkg = window.packageManagerClean.currentPackage;
    if (!pkg) {
        alert('Please select a package first');
        return;
    }

    // Get form values
    const name = document.getElementById('courseName')?.value?.trim();
    let category = document.getElementById('courseCategory')?.value;

    // Handle custom category
    if (category === 'Other') {
        const customCategory = document.getElementById('customCategoryInput')?.value?.trim();
        if (customCategory) {
            category = customCategory;
        }
    }

    const description = document.getElementById('courseDescription')?.value?.trim();
    const thumbnail = document.getElementById('courseThumbnail')?.value?.trim();
    const duration = parseInt(document.getElementById('courseDuration')?.value) || 0;
    const lessons = parseInt(document.getElementById('courseLessons')?.value) || 0;

    // Get languages from the tags array
    const languages = [...window.courseLanguages];

    // Get lesson titles
    const lessonTitles = [];
    for (let i = 0; i < lessons; i++) {
        const titleInput = document.getElementById(`lessonTitle_${i}`);
        if (titleInput) {
            lessonTitles.push(titleInput.value.trim() || `Lesson ${i + 1}`);
        }
    }

    // Get grade level
    const courseLevel = document.getElementById('courseLevel')?.value;

    // Validation
    if (!name) {
        alert('Please enter a course name');
        document.getElementById('courseName')?.focus();
        return;
    }

    if (!category) {
        alert('Please select a category');
        document.getElementById('courseCategory')?.focus();
        return;
    }

    if (!courseLevel) {
        alert('Please select a grade level');
        document.getElementById('courseLevel')?.focus();
        return;
    }

    if (languages.length === 0) {
        languages.push('English'); // Default to English
    }

    // Submit course request to API
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to add courses');
        return;
    }

    // Show loading state
    const saveBtn = document.getElementById('saveCourseBtn');
    const originalText = saveBtn?.textContent || 'Add Course';
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
    }

    try {
        // Create course request payload for backend
        const courseRequestData = {
            course_name: name,
            course_category: category,
            course_level: courseLevel,
            course_description: description,
            thumbnail: thumbnail,
            duration: duration,
            lessons: lessons,
            lesson_title: lessonTitles,
            language: languages,
            package_id: pkg.id  // Link to current package
        };

        console.log('📡 Submitting course request:', courseRequestData);

        const response = await fetch(`${API_BASE_URL}/api/tutor/packages/course-request`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(courseRequestData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Course request created:', result);

            // Add to pending courses locally
            if (!pkg.pendingCourses) {
                pkg.pendingCourses = [];
            }
            if (!pkg.pendingCourseIds) {
                pkg.pendingCourseIds = [];
            }

            // Add the pending course to local state
            pkg.pendingCourseIds.push(result.id);
            pkg.pendingCourses.push({
                id: result.id,
                course_name: result.course_name,
                course_category: result.course_category,
                course_level: result.course_level,
                course_description: result.course_description,
                thumbnail: result.thumbnail,
                duration: result.duration,
                lessons: result.lessons,
                lesson_title: result.lesson_title,
                language: result.language,
                status: 'pending'
            });

            // Close form and re-render
            closeCourseForm();
            renderPackageEditor();

            // Show success message
            alert(`Course "${name}" submitted for approval!\nRequest ID: ${result.request_id}`);
        } else {
            const errorText = await response.text();
            console.error('❌ Error creating course request:', response.status, errorText);
            alert(`Failed to submit course: ${errorText}`);
        }
    } catch (error) {
        console.error('❌ Error submitting course:', error);
        alert('Failed to submit course. Please try again.');
    } finally {
        // Reset button state
        if (saveBtn) {
            saveBtn.innerHTML = `<i class="fas fa-save"></i> ${originalText}`;
            saveBtn.disabled = false;
        }
    }
};

/**
 * ═══════════════════════════════════════════════════════════
 * THUMBNAIL UPLOAD FUNCTIONS
 * ═══════════════════════════════════════════════════════════
 */

window.triggerCourseThumbnailUpload = function() {
    const fileInput = document.getElementById('courseThumbnailInput');
    if (fileInput) {
        fileInput.click();
    }
};

window.handleCourseThumbnailUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (PNG, JPG, GIF, or WebP)');
        return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('Image size must be less than 5MB');
        return;
    }

    // Create preview using FileReader
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageUrl = e.target.result;
        setThumbnailPreview(imageUrl);

        // Store the data URL in the hidden input (for now, can be replaced with actual upload)
        document.getElementById('courseThumbnail').value = imageUrl;
    };
    reader.readAsDataURL(file);
};

window.setThumbnailPreview = function(imageUrl) {
    const preview = document.getElementById('thumbnailPreview');
    if (preview) {
        preview.innerHTML = `
            <img src="${imageUrl}" alt="Course thumbnail" class="thumbnail-image">
            <div class="thumbnail-overlay">
                <i class="fas fa-camera"></i>
                <span>Change thumbnail</span>
            </div>
            <button type="button" class="btn-remove-thumbnail" onclick="event.stopPropagation(); removeThumbnail();">
                <i class="fas fa-times"></i>
            </button>
        `;
        preview.classList.add('has-image');
    }
};

window.resetThumbnailPreview = function() {
    const preview = document.getElementById('thumbnailPreview');
    if (preview) {
        preview.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <span class="upload-text">Click to upload thumbnail</span>
            <span class="upload-hint">PNG, JPG, GIF up to 5MB</span>
        `;
        preview.classList.remove('has-image');
    }
    document.getElementById('courseThumbnail').value = '';
};

window.removeThumbnail = function() {
    resetThumbnailPreview();
    // Clear the file input
    const fileInput = document.getElementById('courseThumbnailInput');
    if (fileInput) fileInput.value = '';
};

/**
 * ═══════════════════════════════════════════════════════════
 * CUSTOM CATEGORY FUNCTIONS
 * ═══════════════════════════════════════════════════════════
 */

window.toggleCustomCategory = function() {
    const categorySelect = document.getElementById('courseCategory');
    const customInput = document.getElementById('customCategoryInput');

    if (categorySelect.value === 'Other') {
        customInput.style.display = 'block';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
        customInput.value = '';
    }
};

/**
 * ═══════════════════════════════════════════════════════════
 * LANGUAGE TAG FUNCTIONS
 * ═══════════════════════════════════════════════════════════
 */

window.renderLanguageTags = function() {
    const container = document.getElementById('languageTagsContainer');
    if (!container) return;

    if (window.courseLanguages.length === 0) {
        container.innerHTML = '<p class="no-languages-hint">No languages added yet</p>';
        return;
    }

    container.innerHTML = window.courseLanguages.map((lang, index) => `
        <span class="language-tag">
            <i class="fas fa-globe"></i>
            ${lang}
            <button type="button" onclick="removeLanguageTag(${index})" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        </span>
    `).join('');
};

window.addLanguageTag = function() {
    const input = document.getElementById('languageInput');
    const language = input?.value?.trim();

    if (!language) {
        return;
    }

    // Check for duplicates (case-insensitive)
    const exists = window.courseLanguages.some(
        lang => lang.toLowerCase() === language.toLowerCase()
    );

    if (exists) {
        alert('This language is already added');
        return;
    }

    // Capitalize first letter
    const formattedLang = language.charAt(0).toUpperCase() + language.slice(1).toLowerCase();
    window.courseLanguages.push(formattedLang);
    renderLanguageTags();

    // Clear input
    input.value = '';
    input.focus();
};

window.addLanguageSuggestion = function(language) {
    // Check for duplicates
    const exists = window.courseLanguages.some(
        lang => lang.toLowerCase() === language.toLowerCase()
    );

    if (exists) {
        return; // Silently ignore if already exists
    }

    window.courseLanguages.push(language);
    renderLanguageTags();
};

window.removeLanguageTag = function(index) {
    if (index >= 0 && index < window.courseLanguages.length) {
        window.courseLanguages.splice(index, 1);
        renderLanguageTags();
    }
};

window.handleLanguageKeypress = function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addLanguageTag();
    }
};

window.togglePackageScheduleType = function() {
    const scheduleType = document.querySelector('input[name="pkg-schedule-type"]:checked')?.value;
    const recurringSection = document.getElementById('pkg-recurring-schedule');
    const specificSection = document.getElementById('pkg-specific-schedule');

    if (recurringSection && specificSection) {
        if (scheduleType === 'recurring') {
            recurringSection.style.display = 'block';
            specificSection.style.display = 'none';
        } else {
            recurringSection.style.display = 'none';
            specificSection.style.display = 'block';
        }
    }
};

window.updateCalculator = function() {
    const pkg = window.packageManagerClean.currentPackage;
    if (!pkg) return;

    const daysInput = document.getElementById('calcDays');
    const hoursInput = document.getElementById('calcHours');
    const hourlyRateInput = document.getElementById('hourlyRate');
    const discount3Input = document.getElementById('discount3');
    const discount6Input = document.getElementById('discount6');
    const discountYearInput = document.getElementById('discountYear');
    const paymentFreqSelect = document.getElementById('paymentFrequency');

    const days = parseInt(daysInput?.value || 3);
    const hours = parseInt(hoursInput?.value || 1);
    const hourlyRate = parseFloat(hourlyRateInput?.value || 0);
    const discount3 = parseFloat(discount3Input?.value || 0);
    const discount6 = parseFloat(discount6Input?.value || 0);
    const discountYear = parseFloat(discountYearInput?.value || 0);
    const paymentFreq = paymentFreqSelect?.value || 'monthly';

    const fees = window.packageManagerClean.calculateFees(
        hourlyRate,
        days,
        hours,
        paymentFreq,
        { threeMonths: discount3, sixMonths: discount6, yearly: discountYear }
    );

    const resultsDiv = document.getElementById('calculatorResults');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = `
        <div class="calc-result-row">
            <span class="calc-result-label">Hours per Week</span>
            <span class="calc-result-value">${fees.hoursPerWeek} hours</span>
        </div>
        <div class="calc-result-row">
            <span class="calc-result-label">Base ${paymentFreq === '2-weeks' ? '2-Week' : 'Monthly'} Fee</span>
            <span class="calc-result-value">${fees.basePayment.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}</span>
        </div>
        <div class="calc-result-row">
            <span class="calc-result-label">3 Months Total (${discount3}% off)</span>
            <span class="calc-result-value">${fees.threeMonths.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}</span>
        </div>
        <div class="calc-result-row">
            <span class="calc-result-label">6 Months Total (${discount6}% off)</span>
            <span class="calc-result-value">${fees.sixMonths.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}</span>
        </div>
        <div class="calc-result-row total">
            <span class="calc-result-label">Yearly Total (${discountYear}% off)</span>
            <span class="calc-result-value">${fees.yearly.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}</span>
        </div>
    `;
};

/**
 * ═══════════════════════════════════════════════════════════
 * SAVE FUNCTION
 * ═══════════════════════════════════════════════════════════
 */

window.saveCurrentPackage = async function() {
    const pkg = window.packageManagerClean.currentPackage;
    if (!pkg) {
        console.error('❌ saveCurrentPackage: No current package selected');
        return;
    }

    console.log('💾 saveCurrentPackage called for package:', pkg.id, pkg.name);

    // Get values from form
    const nameInput = document.getElementById('packageName');
    const hourlyRateInput = document.getElementById('hourlyRate');
    const paymentFreqSelect = document.getElementById('paymentFrequency');
    const discount3Input = document.getElementById('discount3');
    const discount6Input = document.getElementById('discount6');
    const discountYearInput = document.getElementById('discountYear');

    // Get course input value (auto-save feature)
    const courseInput = document.getElementById('courseInput');
    if (courseInput && courseInput.value.trim()) {
        const unaddedCourse = courseInput.value.trim();
        if (!pkg.courses.includes(unaddedCourse)) {
            pkg.courses.push(unaddedCourse);
        }
    }

    // Get session format from radio button (only one can be selected)
    const sessionFormatRadio = document.querySelector('input[name="sessionFormat"]:checked');
    const sessionFormat = sessionFormatRadio ? sessionFormatRadio.value : null;

    // Get schedule type
    const scheduleType = document.querySelector('input[name="pkg-schedule-type"]:checked')?.value || 'recurring';

    // Get schedule data based on type
    let scheduleData = { scheduleType };

    if (scheduleType === 'recurring') {
        // Get selected days
        const scheduleDays = Array.from(document.querySelectorAll('input[name="pkg-schedule-day"]:checked'))
            .map(cb => cb.value);

        scheduleData.scheduleDays = scheduleDays;
        scheduleData.startTime = document.getElementById('pkg-start-time')?.value || '09:00';
        scheduleData.endTime = document.getElementById('pkg-end-time')?.value || '10:00';
    } else {
        // Specific dates
        scheduleData.startDate = document.getElementById('pkg-start-date')?.value || '';
        scheduleData.endDate = document.getElementById('pkg-end-date')?.value || '';
        scheduleData.sessionTime = document.getElementById('pkg-session-time')?.value || '09:00';
        scheduleData.sessionDuration = document.getElementById('pkg-session-duration')?.value || '1';
    }

    // Update package (grade level is now per-course, not per-package)
    // Extract course IDs from both approved and pending courses for database storage
    // Also check pkg.courseIds which is populated when courses are added via live search
    const existingCourseIds = (pkg.courseIds || []).filter(id => typeof id === 'number');
    const approvedIds = (pkg.courses || []).map(c => typeof c === 'object' ? c.id : c).filter(id => typeof id === 'number');
    const pendingIds = (pkg.pendingCourses || []).map(c => typeof c === 'object' ? c.id : c).filter(id => typeof id === 'number');
    const allCourseIds = [...new Set([...existingCourseIds, ...approvedIds, ...pendingIds])];  // Combine and deduplicate

    console.log('📦 Course IDs being saved:', {
        existingCourseIds,
        approvedIds,
        pendingIds,
        allCourseIds
    });

    const updateData = {
        name: nameInput?.value || pkg.name,
        courseIds: allCourseIds,
        sessionFormat: sessionFormat,
        hourlyRate: parseFloat(hourlyRateInput?.value || 0),
        paymentFrequency: paymentFreqSelect?.value || 'monthly',
        discounts: {
            threeMonths: parseFloat(discount3Input?.value || 0),
            sixMonths: parseFloat(discount6Input?.value || 0),
            yearly: parseFloat(discountYearInput?.value || 0)
        },
        ...scheduleData
    };

    console.log('📡 Update data being sent:', updateData);

    const result = await window.packageManagerClean.updatePackage(pkg.id, updateData);

    // Update currentPackage reference with the result so UI reflects changes immediately
    if (result) {
        window.packageManagerClean.currentPackage = result;
    }

    // Update UI - both modal and main page cards
    renderPackagesList();
    renderPackageEditor();
    renderPackagesGrid();  // Update the package cards on the main page

    // Show success message only if we got a valid result saved to database
    if (result && result._savedToDatabase) {
        console.log('✅ Package saved to database successfully:', result);
        alert('Package saved successfully!');
    } else if (result) {
        console.warn('⚠️ Package saved to localStorage only');
        // Don't show alert here - updatePackage already showed one
    } else {
        console.error('❌ Package save failed completely');
        // Don't show alert here - updatePackage already showed one
    }
};

/**
 * ═══════════════════════════════════════════════════════════
 * ESC KEY HANDLER
 * ═══════════════════════════════════════════════════════════
 */

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('package-management-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closePackageModal();
        }
        const viewModal = document.getElementById('viewPackageModal');
        if (viewModal && !viewModal.classList.contains('hidden')) {
            closeViewPackageModal();
        }
    }
});

/**
 * ═══════════════════════════════════════════════════════════
 * PACKAGES PANEL FUNCTIONS (For packages-panel in tutor-profile.html)
 * ═══════════════════════════════════════════════════════════
 */

window.loadPackagesPanel = async function() {
    console.log('📦 Loading packages panel...');

    // Reload packages from database
    await window.packageManagerClean.loadPackages();

    // Render packages in the grid
    renderPackagesGrid();
};

function renderPackagesGrid() {
    const packagesGrid = document.getElementById('packages-grid');
    if (!packagesGrid) {
        console.warn('⚠️ packages-grid element not found');
        return;
    }

    const packages = window.packageManagerClean.packages;
    console.log(`📦 Rendering ${packages.length} package(s) in grid`);

    if (packages.length === 0) {
        packagesGrid.innerHTML = `
            <div class="col-span-3 card p-12 text-center">
                <div style="font-size: 4rem; margin-bottom: 1rem;">📦</div>
                <h3 class="text-xl font-bold mb-2">No Packages Yet</h3>
                <p class="text-gray-600 mb-4">Create your first teaching package to get started</p>
                <button class="btn-primary" onclick="openPackageModal()">
                    <i class="fas fa-plus mr-2"></i>Create Package
                </button>
            </div>
        `;
        return;
    }

    packagesGrid.innerHTML = packages.map(pkg => {
        const scheduleType = pkg.scheduleType || 'recurring';
        const scheduleInfo = scheduleType === 'recurring'
            ? `${pkg.scheduleDays?.join(', ') || 'Not set'} • ${pkg.startTime || '09:00'}-${pkg.endTime || '10:00'}`
            : `${pkg.startDate || 'Not set'} to ${pkg.endDate || 'Not set'}`;

        // Count active discounts to determine grid columns
        const activeDiscounts = [
            pkg.discounts?.threeMonths > 0,
            pkg.discounts?.sixMonths > 0,
            pkg.discounts?.yearly > 0
        ].filter(Boolean).length;

        // Get unique course levels from all courses
        const allCourses = [...(pkg.courses || []), ...(pkg.pendingCourses || [])];
        const courseLevels = [...new Set(allCourses.map(c => c.course_level).filter(Boolean))];
        const levelsDisplay = courseLevels.length > 0 ? courseLevels.join(', ') : 'All Levels';

        return `
        <div class="card" style="padding: 0; overflow: hidden; border-radius: 12px; transition: all 0.3s; border: 2px solid var(--border-color);">
            <!-- Package Header -->
            <div style="background: var(--primary-color); padding: 1.5rem; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0; color: white;">${pkg.name}</h3>
                    <span style="background: rgba(255,255,255,0.25); backdrop-filter: blur(10px); color: white; font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 20px;">
                        ${levelsDisplay}
                    </span>
                </div>
                <p style="font-size: 0.875rem; opacity: 0.95; margin: 0; color: white;">
                    <i class="fas fa-calendar-alt"></i> ${pkg.paymentFrequency === '2-weeks' ? 'Bi-weekly' : 'Monthly'} Package
                </p>
            </div>

            <!-- Package Body -->
            <div style="padding: 1.5rem; background: var(--card-bg); color: var(--text-primary);">
                <!-- Courses -->
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                        <i class="fas fa-book" style="color: var(--primary-color); margin-right: 0.5rem;"></i>
                        <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">Courses</span>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${pkg.courses && pkg.courses.length > 0
                            ? pkg.courses.map(course =>
                                `<span style="background: var(--badge-bg); color: var(--primary-color); border: 1px solid var(--badge-border); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 500;">${course.course_name || course}</span>`
                              ).join('')
                            : `<span style="color: var(--text-secondary); font-size: 0.875rem;">No courses</span>`
                        }
                    </div>
                </div>

                <!-- Session Format -->
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                        <i class="fas fa-video" style="color: var(--primary-color); margin-right: 0.5rem;"></i>
                        <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">Format</span>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${pkg.session_format
                            ? `<span style="background: var(--badge-bg); color: var(--primary-color); border: 1px solid var(--badge-border); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 500;">${pkg.session_format}</span>`
                            : `<span style="color: var(--text-secondary); font-size: 0.875rem;">Not specified</span>`
                        }
                    </div>
                </div>

                <!-- Schedule -->
                <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--hover-bg); border-radius: 8px; border-left: 3px solid var(--primary-color);">
                    <div style="display: flex; align-items: center; margin-bottom: 0.25rem;">
                        <i class="fas fa-clock" style="color: var(--primary-color); margin-right: 0.5rem; font-size: 0.875rem;"></i>
                        <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-primary); text-transform: uppercase;">Schedule</span>
                    </div>
                    <p style="margin: 0; font-size: 0.875rem; color: var(--text-primary);">${scheduleInfo}</p>
                </div>

                <!-- Pricing -->
                <div class="pricing-box" style="background: var(--primary-color); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.15), transparent); animation: shimmerContainer 3s infinite; pointer-events: none;"></div>
                    <div style="display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1;">
                        <div>
                            <p style="margin: 0; font-size: 0.75rem; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 0.5px;">Hourly Rate</p>
                            <p style="margin: 0; font-size: 2rem; font-weight: 700; color: white;">${pkg.hourlyRate} <span style="font-size: 1rem; font-weight: 500;">ETB</span></p>
                        </div>
                        <div style="text-align: right;">
                            <i class="fas fa-money-bill-wave" style="font-size: 2.5rem; color: rgba(255,255,255,0.3); animation: float 3s ease-in-out infinite;"></i>
                        </div>
                    </div>
                </div>

                <!-- Discounts -->
                ${pkg.discounts && (pkg.discounts.threeMonths > 0 || pkg.discounts.sixMonths > 0 || pkg.discounts.yearly > 0) ? `
                    <div style="margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                            <i class="fas fa-percent" style="color: var(--success); margin-right: 0.5rem;"></i>
                            <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">Discounts</span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(${activeDiscounts}, 1fr); gap: 0.5rem;">
                            ${pkg.discounts.threeMonths > 0 ? `
                                <div style="background: var(--hover-bg); border: 1px solid var(--border-color); padding: 0.5rem 0.75rem; border-radius: 6px;">
                                    <p style="margin: 0; font-size: 0.75rem; color: var(--text-secondary);">3 Months</p>
                                    <p style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--success);">-${pkg.discounts.threeMonths}%</p>
                                </div>
                            ` : ''}
                            ${pkg.discounts.sixMonths > 0 ? `
                                <div style="background: var(--hover-bg); border: 1px solid var(--border-color); padding: 0.5rem 0.75rem; border-radius: 6px;">
                                    <p style="margin: 0; font-size: 0.75rem; color: var(--text-secondary);">6 Months</p>
                                    <p style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--success);">-${pkg.discounts.sixMonths}%</p>
                                </div>
                            ` : ''}
                            ${pkg.discounts.yearly > 0 ? `
                                <div style="background: var(--hover-bg); border: 1px solid var(--border-color); padding: 0.5rem 0.75rem; border-radius: 6px;">
                                    <p style="margin: 0; font-size: 0.75rem; color: var(--text-secondary);">Yearly</p>
                                    <p style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--success);">-${pkg.discounts.yearly}%</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                <!-- Action Buttons -->
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); display: flex; gap: 0.5rem;">
                    <button onclick="openPackageModal(); setTimeout(() => selectPackage(${pkg.id}), 100);" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; flex: 1; background: var(--primary-color); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 0.875rem;">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deletePackageFromGrid(${pkg.id})" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; width: 48px; background: var(--hover-bg); color: var(--error); border: 2px solid var(--error); border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 0.875rem;" title="Delete Package">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

/**
 * Delete package from the packages-grid panel
 * Called when clicking the delete button on package cards in packages-panel
 */
window.deletePackageFromGrid = async function(packageId) {
    const pkg = window.packageManagerClean.getPackage(packageId);
    const packageName = pkg ? pkg.name : 'this package';

    if (confirm(`Are you sure you want to delete "${packageName}"? This action cannot be undone.`)) {
        try {
            await window.packageManagerClean.deletePackage(packageId);
            renderPackagesGrid();  // Refresh the packages grid
            console.log('✅ Package deleted from grid:', packageId);
        } catch (error) {
            console.error('❌ Error deleting package:', error);
            alert('Failed to delete package. Please try again.');
        }
    }
};

/**
 * ═══════════════════════════════════════════════════════════
 * VIEW PACKAGE MODAL FUNCTIONS
 * ═══════════════════════════════════════════════════════════
 */

window.viewPackage = function(packageId) {
    const pkg = window.packageManagerClean.getPackage(packageId);
    if (!pkg) {
        console.error('❌ Package not found:', packageId);
        return;
    }

    console.log('👁️ Viewing package:', pkg);

    // Store current package ID for edit function
    window.currentViewingPackageId = packageId;

    // Get unique course levels from all courses
    const allCourses = [...(pkg.courses || []), ...(pkg.pendingCourses || [])];
    const courseLevels = [...new Set(allCourses.map(c => c.course_level).filter(Boolean))];
    const levelsDisplay = courseLevels.length > 0 ? courseLevels.join(', ') : 'All Levels';

    // Populate modal fields
    document.getElementById('view-pkg-name').textContent = pkg.name;
    document.getElementById('view-pkg-grade').textContent = levelsDisplay;

    // Courses
    const coursesContainer = document.getElementById('view-pkg-courses');
    if (pkg.courses && pkg.courses.length > 0) {
        coursesContainer.innerHTML = pkg.courses.map(course =>
            `<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">${course}</span>`
        ).join('');
    } else {
        coursesContainer.innerHTML = '<p class="text-gray-500">No courses specified</p>';
    }

    // Session Format
    const formatContainer = document.getElementById('view-pkg-format');
    if (pkg.session_format) {
        formatContainer.innerHTML = `<span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">${pkg.session_format}</span>`;
    } else {
        formatContainer.innerHTML = '<p class="text-gray-500">Not specified</p>';
    }

    // Schedule Type
    const scheduleType = pkg.scheduleType || 'recurring';
    document.getElementById('view-pkg-schedule-type').textContent =
        scheduleType === 'recurring' ? 'Recurring Schedule' : 'Specific Dates';

    // Schedule Details
    const scheduleDetails = document.getElementById('view-pkg-schedule-details');
    if (scheduleType === 'recurring') {
        scheduleDetails.innerHTML = `
            <h4 class="font-semibold mb-2">Recurring Schedule</h4>
            <div class="space-y-2">
                <p><strong>Days:</strong> ${pkg.scheduleDays && pkg.scheduleDays.length > 0 ? pkg.scheduleDays.join(', ') : 'Not specified'}</p>
                <p><strong>Time:</strong> ${pkg.startTime || '09:00'} - ${pkg.endTime || '10:00'}</p>
            </div>
        `;
    } else {
        scheduleDetails.innerHTML = `
            <h4 class="font-semibold mb-2">Specific Dates</h4>
            <div class="space-y-2">
                <p><strong>Start Date:</strong> ${pkg.startDate || 'Not specified'}</p>
                <p><strong>End Date:</strong> ${pkg.endDate || 'Not specified'}</p>
                <p><strong>Session Time:</strong> ${pkg.sessionTime || '09:00'}</p>
                <p><strong>Duration:</strong> ${pkg.sessionDuration || '1'} hour(s)</p>
            </div>
        `;
    }

    // Pricing
    document.getElementById('view-pkg-hourly-rate').textContent = `${pkg.hourlyRate} ETB`;
    document.getElementById('view-pkg-payment-freq').textContent =
        pkg.paymentFrequency === '2-weeks' ? 'Bi-weekly' : 'Monthly';

    // Discounts
    document.getElementById('view-pkg-discount-3').textContent = `${pkg.discounts.threeMonths || 0}%`;
    document.getElementById('view-pkg-discount-6').textContent = `${pkg.discounts.sixMonths || 0}%`;
    document.getElementById('view-pkg-discount-year').textContent = `${pkg.discounts.yearly || 0}%`;

    // Created Date
    const createdDate = pkg.createdAt ? new Date(pkg.createdAt).toLocaleDateString() : 'Unknown';
    document.getElementById('view-pkg-created').textContent = createdDate;

    // Show modal
    const modal = document.getElementById('viewPackageModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

window.closeViewPackageModal = function() {
    const modal = document.getElementById('viewPackageModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        window.currentViewingPackageId = null;
    }
};

window.editPackageFromView = function() {
    if (!window.currentViewingPackageId) {
        console.error('❌ No package ID to edit');
        return;
    }

    // Close view modal
    closeViewPackageModal();

    // Open package management modal
    openPackageModal();

    // Wait for modal to open, then select the package
    setTimeout(() => {
        selectPackage(window.currentViewingPackageId);
    }, 100);
};

/**
 * ═══════════════════════════════════════════════════════════
 * COURSE SEARCH FUNCTIONS (Live search for verified courses)
 * ═══════════════════════════════════════════════════════════
 */

// Debounce timer for search
let courseSearchTimeout = null;

// Cache for search results
let courseSearchCache = {};

window.handleCourseSearch = function(query) {
    // Debounce the search
    if (courseSearchTimeout) {
        clearTimeout(courseSearchTimeout);
    }

    courseSearchTimeout = setTimeout(() => {
        performCourseSearch(query);
    }, 300);
};

async function performCourseSearch(query) {
    const resultsContainer = document.getElementById('courseSearchResults');
    if (!resultsContainer) return;

    // Show loading state
    resultsContainer.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: #6b7280;">
            <i class="fas fa-spinner fa-spin" style="margin-right: 0.5rem;"></i> Searching...
        </div>
    `;
    resultsContainer.style.display = 'block';

    // If query is empty, show popular courses
    if (!query.trim()) {
        // Check cache first
        if (courseSearchCache['popular']) {
            renderCourseSearchResults(courseSearchCache['popular']);
            return;
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/course-management/search?q=${encodeURIComponent(query)}&limit=10`);

        if (response.ok) {
            const data = await response.json();
            const courses = data.courses || [];

            // Cache results
            if (!query.trim()) {
                courseSearchCache['popular'] = courses;
            }

            renderCourseSearchResults(courses);
        } else {
            resultsContainer.innerHTML = `
                <div style="padding: 1rem; text-align: center; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i> Failed to search courses
                </div>
            `;
        }
    } catch (error) {
        console.error('Error searching courses:', error);
        resultsContainer.innerHTML = `
            <div style="padding: 1rem; text-align: center; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i> Error searching courses
            </div>
        `;
    }
}

function renderCourseSearchResults(courses) {
    const resultsContainer = document.getElementById('courseSearchResults');
    if (!resultsContainer) return;

    const pkg = window.packageManagerClean.currentPackage;
    const existingCourseIds = pkg ? (pkg.courseIds || []).map(id => id) : [];

    if (courses.length === 0) {
        resultsContainer.innerHTML = `
            <div style="padding: 1.5rem; text-align: center;">
                <i class="fas fa-search" style="font-size: 2rem; color: #9ca3af; margin-bottom: 0.5rem; display: block;"></i>
                <p style="margin: 0 0 0.5rem 0; color: #6b7280; font-weight: 500;">No courses found</p>
                <p style="margin: 0; font-size: 0.875rem; color: #9ca3af;">Try a different search or request a new course</p>
                <button onclick="openCourseRequestModal()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    <i class="fas fa-plus"></i> Request New Course
                </button>
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = courses.map(course => {
        const isAdded = existingCourseIds.includes(course.id);
        const languages = course.language || ['English'];
        const languagesText = Array.isArray(languages) ? languages.slice(0, 2).join(', ') : languages;

        return `
            <div class="course-search-result" onclick="${isAdded ? '' : `addVerifiedCourseToPackage(${course.id})`}"
                 style="display: flex; gap: 0.75rem; padding: 0.75rem 1rem; cursor: ${isAdded ? 'default' : 'pointer'}; border-bottom: 1px solid var(--border-color); transition: background 0.2s; ${isAdded ? 'opacity: 0.6; background: var(--hover-bg);' : ''}"
                 ${isAdded ? '' : 'onmouseover="this.style.background=\'var(--hover-bg)\'" onmouseout="this.style.background=\'transparent\'"'}>
                <!-- Thumbnail -->
                <div style="width: 50px; height: 50px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: #f3f4f6; display: flex; align-items: center; justify-content: center;">
                    ${course.thumbnail
                        ? `<img src="${course.thumbnail}" style="width: 100%; height: 100%; object-fit: cover;">`
                        : `<i class="fas fa-book" style="color: #9ca3af; font-size: 1.25rem;"></i>`
                    }
                </div>
                <!-- Course Info -->
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 0.5rem;">
                        <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${course.course_name}</h4>
                        ${isAdded
                            ? `<span style="padding: 2px 8px; background: #d1fae5; color: #065f46; border-radius: 4px; font-size: 0.7rem; white-space: nowrap;"><i class="fas fa-check"></i> Added</span>`
                            : `<span style="padding: 2px 8px; background: var(--primary-color); color: white; border-radius: 4px; font-size: 0.7rem; white-space: nowrap;"><i class="fas fa-plus"></i> Add</span>`
                        }
                    </div>
                    <div style="display: flex; gap: 0.75rem; margin-top: 0.25rem; font-size: 0.8rem; color: #6b7280;">
                        <span><i class="fas fa-folder" style="margin-right: 4px;"></i>${course.course_category || 'General'}</span>
                        <span><i class="fas fa-graduation-cap" style="margin-right: 4px;"></i>${course.course_level || 'All Levels'}</span>
                        <span><i class="fas fa-language" style="margin-right: 4px;"></i>${languagesText}</span>
                    </div>
                    ${course.rating > 0 ? `
                        <div style="margin-top: 0.25rem; font-size: 0.8rem;">
                            <span style="color: #f59e0b;"><i class="fas fa-star"></i> ${course.rating.toFixed(1)}</span>
                            <span style="color: #9ca3af; margin-left: 0.25rem;">(${course.rating_count} reviews)</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

window.showCourseSearchResults = function() {
    const resultsContainer = document.getElementById('courseSearchResults');
    const input = document.getElementById('courseSearchInput');

    if (resultsContainer && input) {
        // Trigger search with current value
        performCourseSearch(input.value);
    }
};

window.hideCourseSearchResults = function() {
    const resultsContainer = document.getElementById('courseSearchResults');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
};

// Add verified course to package
window.addVerifiedCourseToPackage = async function(courseId) {
    const pkg = window.packageManagerClean.currentPackage;
    if (!pkg) {
        alert('Please select a package first');
        return;
    }

    // Check if already added
    if (pkg.courseIds && pkg.courseIds.includes(courseId)) {
        return;
    }

    // Add to package
    if (!pkg.courseIds) pkg.courseIds = [];
    pkg.courseIds.push(courseId);

    // Fetch course details to add to courses array
    try {
        const response = await fetch(`${API_BASE_URL}/api/course-management/search?q=&limit=50`);
        if (response.ok) {
            const data = await response.json();
            const course = data.courses.find(c => c.id === courseId);
            if (course) {
                if (!pkg.courses) pkg.courses = [];
                pkg.courses.push(course);
            }
        }
    } catch (error) {
        console.error('Error fetching course details:', error);
    }

    // Clear search
    const input = document.getElementById('courseSearchInput');
    if (input) input.value = '';

    // Hide results
    hideCourseSearchResults();

    // Re-render editor
    renderPackageEditor();

    console.log('✅ Course added to package:', courseId);
};

// Remove verified course from package
window.removeVerifiedCourse = function(courseId) {
    const pkg = window.packageManagerClean.currentPackage;
    if (!pkg) return;

    // Remove from courseIds
    if (pkg.courseIds) {
        pkg.courseIds = pkg.courseIds.filter(id => id !== courseId);
    }

    // Remove from courses array
    if (pkg.courses) {
        pkg.courses = pkg.courses.filter(c => c.id !== courseId);
    }

    // Re-render editor
    renderPackageEditor();
    console.log('✅ Course removed from package:', courseId);
};

// Close search results when clicking outside
document.addEventListener('click', function(event) {
    const searchWrapper = document.querySelector('.course-search-wrapper');
    const resultsContainer = document.getElementById('courseSearchResults');

    if (searchWrapper && resultsContainer && !searchWrapper.contains(event.target)) {
        resultsContainer.style.display = 'none';
    }
});

/**
 * Fetch suggested market price and apply it to hourly rate
 * Called when "Make an Estimate" checkbox is checked
 */
async function fetchAndApplyMarketPrice() {
    const hourlyRateInput = document.getElementById('hourlyRate');
    if (!hourlyRateInput) {
        console.error('❌ Hourly rate input not found');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to get market pricing');
        return;
    }

    // Show loading state in hourly rate input
    const originalValue = hourlyRateInput.value;
    hourlyRateInput.value = 'Loading...';
    hourlyRateInput.disabled = true;

    // Get session format from universal session format radio button (same as Market Trend)
    const sessionFormatRadio = document.querySelector('input[name="universalSessionFormat"]:checked');
    const sessionFormat = sessionFormatRadio ? sessionFormatRadio.value : 'Online';  // Default to Online

    try {
        // Fetch suggested market price from API
        const response = await fetch(`${API_BASE_URL}/api/market-pricing/suggest-price`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                time_period_months: 3,  // Default to 3 months (consistent with Price Suggestion)
                session_format: sessionFormat  // Include session format for accurate pricing
            })
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        const suggestedPrice = data.suggested_price;

        console.log('✅ Suggested market price fetched:', suggestedPrice, 'ETB', `(${sessionFormat || 'any format'})`);

        // Apply suggested price to hourly rate
        hourlyRateInput.value = suggestedPrice;
        hourlyRateInput.disabled = false;

        // Trigger calculator update
        const event = new Event('input', { bubbles: true });
        hourlyRateInput.dispatchEvent(event);

        // Show success notification
        const notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #16a34a; color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; animation: slideInRight 0.3s ease-out;';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <strong>Market Price Applied!</strong> ${suggestedPrice} ETB based on market data
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);

    } catch (error) {
        console.error('❌ Failed to fetch market price:', error);

        // Restore original value
        hourlyRateInput.value = originalValue;
        hourlyRateInput.disabled = false;

        // Show error notification
        const notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc2626; color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000;';
        notification.innerHTML = `
            <i class="fas fa-times-circle"></i>
            <strong>Error!</strong> Could not fetch market price. Please enter manually.
        `;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 4000);
    }
}
