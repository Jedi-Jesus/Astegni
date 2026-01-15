/**
 * Package Manager for Tutor Profile
 * Handles package creation, editing, and fee calculations
 * Now integrated with backend API for persistent storage
 */

class PackageManager {
    constructor() {
        this.packages = [];
        this.packageCounter = 1;
        this.isLoading = false;
        this.loadPackagesFromBackend();
    }

    /**
     * Load packages from backend API (with localStorage fallback)
     */
    async loadPackagesFromBackend() {
        this.isLoading = true;
        try {
            console.log('📦 Loading packages from backend...');

            // Try to load from backend first
            const backendPackages = await TutorProfileAPI.getPackages();

            if (backendPackages && backendPackages.length > 0) {
                console.log('✅ Loaded', backendPackages.length, 'packages from backend');
                this.packages = backendPackages;
                // Sync to localStorage as cache
                this.savePackagesToStorage();
            } else {
                console.log('📭 No packages found in backend, checking localStorage...');
                // Fallback to localStorage
                this.loadPackagesFromStorage();
            }

            this.packageCounter = this.packages.length + 1;
        } catch (error) {
            console.error('❌ Error loading packages from backend:', error);
            console.log('📦 Falling back to localStorage...');
            // Fallback to localStorage on error
            this.loadPackagesFromStorage();
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load packages from localStorage (fallback/cache)
     */
    loadPackagesFromStorage() {
        const stored = localStorage.getItem('tutorPackages');
        if (stored) {
            try {
                this.packages = JSON.parse(stored);
                this.packageCounter = this.packages.length + 1;
                console.log('📦 Loaded', this.packages.length, 'packages from localStorage');
            } catch (e) {
                console.error('Error loading packages from localStorage:', e);
                this.packages = [];
            }
        } else {
            console.log('📭 No packages in localStorage');
        }
    }

    /**
     * Save packages to localStorage (cache only)
     */
    savePackagesToStorage() {
        try {
            localStorage.setItem('tutorPackages', JSON.stringify(this.packages));
        } catch (e) {
            console.error('Error saving packages to localStorage:', e);
        }
    }

    /**
     * Get all packages
     */
    getPackages() {
        return this.packages;
    }

    /**
     * Add a new package (saves to backend)
     */
    async addPackage(packageData) {
        try {
            console.log('💾 Saving package to backend...', packageData);

            // Save to backend
            const savedPackage = await TutorProfileAPI.createPackage(packageData);

            console.log('✅ Package saved to backend:', savedPackage);

            // Add to local array
            this.packages.push(savedPackage);

            // Cache to localStorage
            this.savePackagesToStorage();

            return savedPackage;
        } catch (error) {
            console.error('❌ Error saving package to backend:', error);

            // Fallback: Save to localStorage only
            console.log('📦 Saving to localStorage as fallback...');
            const fallbackPackage = {
                id: Date.now(),
                ...packageData,
                createdAt: new Date().toISOString(),
                _localOnly: true // Mark as not synced
            };
            this.packages.push(fallbackPackage);
            this.savePackagesToStorage();

            throw error; // Re-throw to notify caller
        }
    }

    /**
     * Update an existing package (saves to backend)
     */
    async updatePackage(packageId, packageData) {
        try {
            console.log('💾 Updating package in backend...', packageId, packageData);

            // Update in backend
            const updatedPackage = await TutorProfileAPI.updatePackage(packageId, packageData);

            console.log('✅ Package updated in backend:', updatedPackage);

            // Update local array
            const index = this.packages.findIndex(p => p.id === packageId);
            if (index !== -1) {
                this.packages[index] = updatedPackage;
            }

            // Cache to localStorage
            this.savePackagesToStorage();

            return updatedPackage;
        } catch (error) {
            console.error('❌ Error updating package in backend:', error);

            // Fallback: Update localStorage only
            console.log('📦 Updating localStorage as fallback...');
            const index = this.packages.findIndex(p => p.id === packageId);
            if (index !== -1) {
                this.packages[index] = {
                    ...this.packages[index],
                    ...packageData,
                    updatedAt: new Date().toISOString()
                };
                this.savePackagesToStorage();
                return this.packages[index];
            }

            throw error;
        }
    }

    /**
     * Delete a package (deletes from backend)
     */
    async deletePackage(packageId) {
        try {
            console.log('🗑️ Deleting package from backend...', packageId);

            // Delete from backend
            await TutorProfileAPI.deletePackage(packageId);

            console.log('✅ Package deleted from backend');

            // Remove from local array
            this.packages = this.packages.filter(p => p.id !== packageId);

            // Update localStorage cache
            this.savePackagesToStorage();

            return true;
        } catch (error) {
            console.error('❌ Error deleting package from backend:', error);

            // Fallback: Delete from localStorage only
            console.log('📦 Deleting from localStorage as fallback...');
            this.packages = this.packages.filter(p => p.id !== packageId);
            this.savePackagesToStorage();

            throw error;
        }
    }

    /**
     * Calculate fees for a package
     */
    calculateFees(hourlyRate, daysPerWeek, hoursPerDay, paymentFrequency, discounts) {
        const hoursPerWeek = daysPerWeek * hoursPerDay;

        // Calculate base fees based on payment frequency
        let weeksInPeriod;
        switch (paymentFrequency) {
            case '2-weeks':
                weeksInPeriod = 2;
                break;
            case 'monthly':
                weeksInPeriod = 4;
                break;
            default:
                weeksInPeriod = 4;
        }

        const baseFee = hourlyRate * hoursPerWeek * weeksInPeriod;

        // Calculate fees with discounts
        const fees = {
            basePayment: baseFee,
            threeMonths: baseFee * 3 * (1 - (discounts.threeMonths || 0) / 100),
            sixMonths: baseFee * 6 * (1 - (discounts.sixMonths || 0) / 100),
            yearly: baseFee * 12 * (1 - (discounts.yearly || 0) / 100)
        };

        return {
            hourlyRate,
            hoursPerWeek,
            hoursPerDay,
            daysPerWeek,
            paymentFrequency,
            weeksInPeriod,
            ...fees
        };
    }
}

// Create global instance
window.packageManager = new PackageManager();

/**
 * Open Package Modal
 */
window.openPackageModal = function() {
    console.log('Opening package modal...');
    const modal = document.getElementById('package-management-modal');
    console.log('Modal element:', modal);
    if (modal) {
        // Remove hidden class
        modal.classList.remove('hidden');

        // Force display with inline style to override any existing inline styles
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';

        document.body.style.overflow = 'hidden';
        console.log('Modal opened successfully');

        // Load existing packages into the view
        loadPackagesIntoView();
    } else {
        console.error('Modal element not found!');
    }
}

/**
 * Close Package Modal
 */
window.closePackageModal = function() {
    const modal = document.getElementById('package-management-modal');
    if (modal) {
        // Add hidden class
        modal.classList.add('hidden');

        // Force hide with inline styles
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';

        document.body.style.overflow = '';
    }
}

/**
 * Switch between package tabs (deprecated - now using split view)
 * Kept for backward compatibility
 */
window.switchPackageTab = function() {
    // No longer needed with split view, but kept for compatibility
    console.log('Tab switching deprecated - now using split view');
}

/**
 * Add a new package entry to the form
 */
window.addNewPackageEntry = function() {
    console.log('🎯 Adding new package entry...');
    const container = document.getElementById('coursesContainer');
    if (!container) {
        console.error('❌ coursesContainer not found!');
        return;
    }

    const packageCount = container.querySelectorAll('.course-entry').length + 1;
    console.log(`📦 Creating package #${packageCount}`);

    const newEntry = document.createElement('div');
    newEntry.className = 'course-entry';
    newEntry.innerHTML = `
        <div class="course-header">
            <h4 class="course-title"><i class="fas fa-box mr-2"></i>Package ${packageCount}</h4>
            <button type="button" class="remove-course-btn" onclick="removePackageEntry(this)">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="course-grid">
            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-plus-circle mr-1"></i>Course Names (Add multiple courses)
                </label>
                <div class="courses-list-container">
                    <div class="course-name-group">
                        <input type="text" class="course-name form-input" placeholder="Enter course name">
                        <button type="button" class="add-course-to-package btn-icon" onclick="addCourseToPackage(this)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div class="added-courses-list"></div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Payment Frequency</label>
                <select class="payment-frequency form-select" required>
                    <option value="2-weeks">2 Weeks</option>
                    <option value="monthly">Monthly</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Hourly Rate (ETB)</label>
                <input type="number" class="hourly-rate form-input" placeholder="Enter hourly rate" min="0" required>
            </div>
            <div class="form-group">
                <label class="form-label">Discounts (%)</label>
                <div class="discount-grid">
                    <input type="number" class="discount-3months form-input" placeholder="3 Months" min="0" max="100" value="0">
                    <input type="number" class="discount-6months form-input" placeholder="6 Months" min="0" max="100" value="0">
                    <input type="number" class="discount-yearly form-input" placeholder="Yearly" min="0" max="100" value="0">
                </div>
            </div>
        </div>
    `;

    container.appendChild(newEntry);
    console.log('✅ Package entry added successfully');
}

/**
 * Remove a package entry from the form
 */
window.removePackageEntry = function(button) {
    const entry = button.closest('.course-entry');
    if (entry) {
        // Check if this is the only package entry
        const container = document.getElementById('coursesContainer');
        const entries = container.querySelectorAll('.course-entry');

        if (entries.length > 1) {
            entry.remove();
            // Renumber remaining packages
            renumberPackages();
        } else {
            alert('You must have at least one package entry.');
        }
    }
}

/**
 * Renumber packages after deletion
 */
function renumberPackages() {
    const entries = document.querySelectorAll('.course-entry');
    entries.forEach((entry, index) => {
        const title = entry.querySelector('.course-title');
        if (title) {
            title.innerHTML = `<i class="fas fa-box mr-2"></i>Package ${index + 1}`;
        }
    });
}

/**
 * Add a course to a package
 */
window.addCourseToPackage = function(button) {
    console.log('➕ Adding course to package...');
    const container = button.closest('.courses-list-container');
    const input = container.querySelector('.course-name');
    const courseName = input.value.trim();

    console.log('Course name:', courseName);

    if (courseName) {
        const coursesList = container.querySelector('.added-courses-list');

        // Create course tag
        const tag = document.createElement('div');
        tag.className = 'course-tag';
        tag.innerHTML = `
            ${courseName}
            <button type="button" class="course-tag-remove" onclick="removeCourseTag(this)">
                <i class="fas fa-times"></i>
            </button>
        `;

        coursesList.appendChild(tag);
        input.value = '';
        console.log('✅ Course added:', courseName);
    } else {
        console.warn('⚠️ No course name entered');
        alert('Please enter a course name');
    }
}

/**
 * Remove a course tag
 */
window.removeCourseTag = function(button) {
    const tag = button.closest('.course-tag');
    if (tag) {
        tag.remove();
    }
}

/**
 * Extract package data from form
 * ENHANCEMENT: Auto-saves course names from input fields even if not clicked "add"
 */
function extractPackagesFromForm() {
    const entries = document.querySelectorAll('.course-entry');
    const packages = [];

    entries.forEach((entry, index) => {
        // Get already added course tags
        const courseTags = entry.querySelectorAll('.course-tag');
        const courses = Array.from(courseTags).map(tag =>
            tag.textContent.trim().replace('×', '').trim()
        );

        // ENHANCEMENT: Auto-add any course name typed in input but not yet added
        const courseNameInput = entry.querySelector('.course-name');
        if (courseNameInput && courseNameInput.value.trim()) {
            const unaddedCourse = courseNameInput.value.trim();
            if (!courses.includes(unaddedCourse)) {
                courses.push(unaddedCourse);
                console.log(`✅ Auto-saved unadded course: "${unaddedCourse}"`);
            }
        }

        if (courses.length === 0) {
            return; // Skip packages without courses
        }

        const paymentFrequency = entry.querySelector('.payment-frequency').value;
        const hourlyRate = parseFloat(entry.querySelector('.hourly-rate').value) || 0;
        const discount3months = parseFloat(entry.querySelector('.discount-3months').value) || 0;
        const discount6months = parseFloat(entry.querySelector('.discount-6months').value) || 0;
        const discountYearly = parseFloat(entry.querySelector('.discount-yearly').value) || 0;

        packages.push({
            name: `Package ${index + 1}`,
            courses,
            paymentFrequency,
            hourlyRate,
            discounts: {
                threeMonths: discount3months,
                sixMonths: discount6months,
                yearly: discountYearly
            }
        });
    });

    return packages;
}

/**
 * Save packages to backend (async)
 */
window.savePackages = async function() {
    console.log('💾 Saving packages...');
    const packagesData = extractPackagesFromForm();

    console.log('Extracted packages:', packagesData);

    if (packagesData.length === 0) {
        console.warn('⚠️ No packages to save');
        alert('Please add at least one package with courses');
        return;
    }

    // Show loading state
    const saveButton = document.querySelector('.save-packages-btn');
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
    }

    try {
        // Clear existing packages in memory
        window.packageManager.packages = [];

        // Add all packages to backend (async)
        const savePromises = packagesData.map(async (pkg) => {
            console.log('Adding package:', pkg);

            // Transform frontend data to backend format
            const backendPackageData = {
                name: pkg.name,
                courses: pkg.courses.join(', '), // Convert array to comma-separated string
                hourly_rate: pkg.hourlyRate,
                payment_frequency: pkg.paymentFrequency,
                discount_1_month: pkg.discounts.threeMonths || 0,
                discount_3_month: pkg.discounts.threeMonths || 0,
                discount_6_month: pkg.discounts.sixMonths || 0,
                schedule_type: 'recurring',
                is_active: true
            };

            return await window.packageManager.addPackage(backendPackageData);
        });

        // Wait for all packages to save
        await Promise.all(savePromises);

        console.log('✅ All packages saved:', window.packageManager.packages);

        // Show success message
        showNotification(`${packagesData.length} package(s) saved successfully to database!`, 'success');

        // Refresh the preview on the right side
        loadPackagesIntoView();
    } catch (error) {
        console.error('❌ Error saving packages:', error);
        showNotification('Error saving some packages. Please try again.', 'error');
    } finally {
        // Reset button state
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = '<i class="fas fa-save mr-2"></i>Save Packages';
        }
    }
}

/**
 * Show notification (simple alert for now, can be enhanced)
 */
function showNotification(message, type = 'info') {
    alert(message);
}

/**
 * Load packages into view (right side preview) - handles backend format
 */
async function loadPackagesIntoView() {
    const display = document.getElementById('coursesDisplay');

    if (!display) return;

    // Show loading state
    display.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>Loading packages...</p>
        </div>
    `;

    try {
        // Reload from backend to get latest data
        await window.packageManager.loadPackagesFromBackend();

        const packages = window.packageManager.getPackages();

        if (packages.length === 0) {
            display.innerHTML = `
                <p class="no-packages-message">
                    <i class="fas fa-box-open" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                    <span>No packages created yet</span>
                    <small>Create your first package on the left!</small>
                </p>
            `;
            return;
        }

        display.innerHTML = '';

        packages.forEach((pkg, index) => {
            const packageCard = createPackageDisplayCard(pkg, index + 1);
            display.appendChild(packageCard);
        });
    } catch (error) {
        console.error('Error loading packages:', error);
        display.innerHTML = `
            <p class="no-packages-message" style="color: var(--error-color);">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <span>Error loading packages</span>
                <small>Please try again later</small>
            </p>
        `;
    }
}

/**
 * Create package display card with click-to-expand calculator
 * Handles both frontend and backend data formats
 */
function createPackageDisplayCard(pkg, index) {
    const card = document.createElement('div');
    card.className = 'package-display-card';
    card.dataset.packageId = pkg.id;

    // Handle courses - can be array (frontend) or string (backend)
    let coursesArray = [];
    if (Array.isArray(pkg.courses)) {
        coursesArray = pkg.courses;
    } else if (typeof pkg.courses === 'string' && pkg.courses) {
        coursesArray = pkg.courses.split(',').map(c => c.trim()).filter(c => c);
    }

    const coursesHtml = coursesArray.length > 0
        ? coursesArray.map(course => `<span class="course-tag">${course}</span>`).join('')
        : '<span class="no-courses">No courses specified</span>';

    // Handle payment frequency - backend uses snake_case
    const paymentFreq = pkg.payment_frequency || pkg.paymentFrequency || 'monthly';
    const paymentDisplay = paymentFreq === '2-weeks' ? '2 Weeks' : 'Monthly';

    // Handle hourly rate - backend uses snake_case
    const hourlyRate = pkg.hourly_rate || pkg.hourlyRate || 0;

    // Handle discounts - support both formats
    const discount3m = pkg.discount_3_month || (pkg.discounts && pkg.discounts.threeMonths) || 0;
    const discount6m = pkg.discount_6_month || (pkg.discounts && pkg.discounts.sixMonths) || 0;
    const discount1m = pkg.discount_1_month || 0;

    card.innerHTML = `
        <div class="package-display-header">
            <h4 class="package-display-title">
                <i class="fas fa-box mr-2"></i>${pkg.name || `Package ${index}`}
            </h4>
            <i class="fas fa-chevron-down package-expand-icon"></i>
        </div>
        <div class="package-courses">
            <div class="package-courses-title">Courses:</div>
            <div class="package-courses-list">${coursesHtml}</div>
        </div>
        <div class="package-info-grid">
            <div class="package-info-item">
                <div class="package-info-label">Payment Frequency</div>
                <div class="package-info-value">${paymentDisplay}</div>
            </div>
            <div class="package-info-item">
                <div class="package-info-label">Hourly Rate</div>
                <div class="package-info-value">${hourlyRate} ETB</div>
            </div>
            <div class="package-info-item">
                <div class="package-info-label">1 Month Discount</div>
                <div class="package-info-value">${discount1m}%</div>
            </div>
            <div class="package-info-item">
                <div class="package-info-label">3 Months Discount</div>
                <div class="package-info-value">${discount3m}%</div>
            </div>
            <div class="package-info-item">
                <div class="package-info-label">6 Months Discount</div>
                <div class="package-info-value">${discount6m}%</div>
            </div>
        </div>
        <div id="calculations-${pkg.id}" class="package-calculations">
            <div class="package-calc-header">
                <i class="fas fa-calculator mr-2"></i>
                <span>Fee Calculator</span>
            </div>
            <div id="calc-content-${pkg.id}"></div>
        </div>
    `;

    // Add click handler to toggle calculator
    card.addEventListener('click', function(e) {
        // Prevent toggling when clicking on course tags
        if (e.target.closest('.course-tag')) return;

        togglePackageCalculator(card, pkg);
    });

    return card;
}

/**
 * Toggle package calculator visibility and calculate fees
 */
function togglePackageCalculator(card, pkg) {
    const isExpanded = card.classList.contains('expanded');

    // Collapse all other cards first
    document.querySelectorAll('.package-display-card.expanded').forEach(otherCard => {
        if (otherCard !== card) {
            otherCard.classList.remove('expanded');
        }
    });

    // Toggle current card
    card.classList.toggle('expanded');

    // If expanding, calculate and display fees
    if (!isExpanded) {
        calculateAndDisplayFeesForPackage(pkg);
    }
}

/**
 * Calculate and display fees for a specific package
 * Handles both frontend and backend data formats
 */
function calculateAndDisplayFeesForPackage(pkg) {
    const daysPerWeek = parseInt(document.getElementById('days-per-week').value) || 3;
    const hoursPerDay = parseInt(document.getElementById('hours-per-day').value) || 1;

    // Handle both frontend and backend format
    const hourlyRate = pkg.hourly_rate || pkg.hourlyRate || 0;
    const paymentFreq = pkg.payment_frequency || pkg.paymentFrequency || 'monthly';

    // Create discounts object in frontend format
    const discounts = {
        threeMonths: pkg.discount_3_month || (pkg.discounts && pkg.discounts.threeMonths) || 0,
        sixMonths: pkg.discount_6_month || (pkg.discounts && pkg.discounts.sixMonths) || 0,
        yearly: pkg.discount_6_month || (pkg.discounts && pkg.discounts.yearly) || 0 // Use 6-month discount for yearly
    };

    const fees = window.packageManager.calculateFees(
        hourlyRate,
        daysPerWeek,
        hoursPerDay,
        paymentFreq,
        discounts
    );

    const calcContent = document.getElementById(`calc-content-${pkg.id}`);
    if (calcContent) {
        calcContent.innerHTML = `
            <div class="package-calc-row">
                <span class="package-calc-label">Hours per Week</span>
                <span class="package-calc-value">${fees.hoursPerWeek} hours</span>
            </div>
            <div class="package-calc-row">
                <span class="package-calc-label">Base ${fees.paymentFrequency === '2-weeks' ? '2-Week' : 'Monthly'} Fee</span>
                <span class="package-calc-value">${fees.basePayment.toFixed(2)} ETB</span>
            </div>
            <div class="package-calc-row">
                <span class="package-calc-label">3 Months Total (${discounts.threeMonths}% off)</span>
                <span class="package-calc-value">${fees.threeMonths.toFixed(2)} ETB</span>
            </div>
            <div class="package-calc-row">
                <span class="package-calc-label">6 Months Total (${discounts.sixMonths}% off)</span>
                <span class="package-calc-value">${fees.sixMonths.toFixed(2)} ETB</span>
            </div>
            <div class="package-calc-row total">
                <span class="package-calc-label">Yearly Total (${discounts.yearly}% off)</span>
                <span class="package-calc-value">${fees.yearly.toFixed(2)} ETB</span>
            </div>
        `;
    }
}

/**
 * Update calculator for all expanded packages when inputs change
 */
window.calculatePackageFees = function() {
    const packages = window.packageManager.getPackages();

    // Recalculate for all expanded packages
    packages.forEach(pkg => {
        const card = document.querySelector(`[data-package-id="${pkg.id}"]`);
        if (card && card.classList.contains('expanded')) {
            calculateAndDisplayFeesForPackage(pkg);
        }
    });
}

/**
 * Initialize calculator input listeners
 */
function initializeCalculatorListeners() {
    const daysInput = document.getElementById('days-per-week');
    const hoursInput = document.getElementById('hours-per-day');

    if (daysInput) {
        daysInput.addEventListener('input', function() {
            calculatePackageFees();
        });
    }

    if (hoursInput) {
        hoursInput.addEventListener('input', function() {
            calculatePackageFees();
        });
    }
}

// Initialize calculator listeners when modal opens
const originalOpenModal = window.openPackageModal;
window.openPackageModal = function() {
    originalOpenModal();
    setTimeout(() => {
        initializeCalculatorListeners();
        loadPackagesIntoView();
    }, 100);
}

// Handle ESC key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('package-management-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closePackageModal();
        }
    }
});

// Handle Enter key in course name input
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('course-name')) {
        e.preventDefault();
        const button = e.target.nextElementSibling;
        if (button) {
            addCourseToPackage(button);
        }
    }
});

/**
 * Toggle Package Sidebar
 * Shows/hides the left sidebar with package list
 */
window.togglePackageSidebar = function() {
    const sidebar = document.getElementById('packageSidebar');
    const layout = document.querySelector('#package-management-modal .package-layout');
    const toggleBtn = document.querySelector('#package-management-modal .modal-header .package-sidebar-toggle');

    if (sidebar && layout) {
        sidebar.classList.toggle('collapsed');
        layout.classList.toggle('sidebar-collapsed');

        // Update toggle button active state
        if (toggleBtn) {
            toggleBtn.classList.toggle('active');
        }
    }
};

/**
 * Toggle Calculator Widget
 * Shows/hides the fee calculator widget with responsive behavior
 */
window.toggleCalculatorWidget = function() {
    const calculator = document.querySelector('#package-management-modal .calculator-widget');
    const toggleBtn = document.querySelector('#package-management-modal .calculator-toggle-btn');
    const backdrop = document.querySelector('#package-management-modal .calculator-widget-backdrop');

    if (!calculator) {
        console.warn('Calculator widget not found');
        return;
    }

    // Toggle visibility
    const isHidden = calculator.classList.contains('hidden');

    if (isHidden) {
        // Show calculator
        calculator.classList.remove('hidden');
        if (toggleBtn) {
            toggleBtn.classList.add('active');
        }

        // Show backdrop on mobile/tablet
        if (window.innerWidth <= 1024 && backdrop) {
            backdrop.classList.add('active');
        }
    } else {
        // Hide calculator
        calculator.classList.add('hidden');
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
        }

        // Hide backdrop
        if (backdrop) {
            backdrop.classList.remove('active');
        }
    }
}

/**
 * Close Calculator Widget (for mobile close button)
 */
window.closeCalculatorWidget = function() {
    const calculator = document.querySelector('#package-management-modal .calculator-widget');
    const toggleBtn = document.querySelector('#package-management-modal .calculator-toggle-btn');
    const backdrop = document.querySelector('#package-management-modal .calculator-widget-backdrop');

    if (calculator) {
        calculator.classList.add('hidden');
    }
    if (toggleBtn) {
        toggleBtn.classList.remove('active');
    }
    if (backdrop) {
        backdrop.classList.remove('active');
    }
}

// Add click handler for calculator close button on mobile (using event delegation)
document.addEventListener('click', (e) => {
    // Check if clicked element is the close button in calculator header
    const calculatorHeader = e.target.closest('#package-management-modal .calculator-widget-header');
    if (calculatorHeader && window.innerWidth <= 768) {
        const rect = calculatorHeader.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Check if click is in the top-right area (where ::after close button is)
        const headerWidth = rect.width;
        const headerHeight = rect.height;

        if (clickX > headerWidth - 60 && clickY < headerHeight && clickY > 0) {
            closeCalculatorWidget();
        }
    }

    // Close calculator when clicking backdrop
    if (e.target.classList.contains('calculator-widget-backdrop')) {
        closeCalculatorWidget();
    }
});

// Handle window resize to adjust calculator behavior
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const calculator = document.querySelector('#package-management-modal .calculator-widget');
        const backdrop = document.querySelector('#package-management-modal .calculator-widget-backdrop');

        // On desktop, ensure calculator is visible and backdrop is hidden
        if (window.innerWidth > 1024) {
            if (calculator && calculator.classList.contains('hidden')) {
                // Keep it hidden if user explicitly hid it
                // but remove backdrop if it exists
                if (backdrop) {
                    backdrop.classList.remove('active');
                }
            }
        }
    }, 250);
});
