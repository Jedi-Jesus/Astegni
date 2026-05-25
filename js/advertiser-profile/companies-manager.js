// ============================================
// COMPANIES MANAGER
// One advertiser can own multiple companies. Each company has its own brands,
// campaigns, billing wallet, and KYC verification.
//
// Click flow:
//   companies panel -> company card -> opens brands panel filtered to that company
//   "Add Brand" inside brands panel still uses BrandsManager + create-brand modal
//   (modal will be patched to send company_id when CompaniesManager.currentCompany set)
// ============================================

var COMPANIES_API_BASE = window.API_BASE_URL || 'http://localhost:8000';
console.log('🏢 Companies Manager loaded');

const CompaniesManager = {
    companies: [],
    currentCompany: null,  // Set when user clicks into a company; BrandsManager scopes off this
    currentFilter: 'all',  // 'all' | 'verified' | 'unverified'
    isLoading: false,

    // ---------- Lifecycle ----------

    async initialize() {
        console.log('🏢 CompaniesManager.initialize()');
        await this.loadModals();
        await this.loadCompanies();
    },

    async loadModals() {
        try {
            const res = await fetch('../modals/advertiser-profile/create-company-modal.html');
            if (!res.ok) {
                console.error('[CompaniesManager] Failed to fetch create-company-modal.html:', res.status);
                return;
            }
            const html = await res.text();
            if (!document.getElementById('create-company-modal-overlay')) {
                const container = document.createElement('div');
                container.innerHTML = html;
                while (container.firstElementChild) {
                    document.body.appendChild(container.firstElementChild);
                }
            }
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.closeCreateCompanyModal();
            });
        } catch (e) {
            console.error('[CompaniesManager] Error loading modals:', e);
        }
    },

    // ---------- API ----------

    _authHeaders() {
        const token = localStorage.getItem('token');
        return { 'Authorization': `Bearer ${token}` };
    },

    async loadCompanies() {
        this.isLoading = true;
        this.renderLoading();
        try {
            const res = await fetch(`${COMPANIES_API_BASE}/api/advertiser/companies`, {
                headers: this._authHeaders()
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.companies = data.companies || [];
            this.renderList();
            this.updateStats();
            this.updateSidebarCount();
        } catch (e) {
            console.error('[CompaniesManager] loadCompanies failed:', e);
            this.renderError('Failed to load companies. Please refresh.');
        } finally {
            this.isLoading = false;
        }
    },

    // ---------- Rendering ----------

    renderLoading() {
        const grid = document.getElementById('companiesGrid');
        if (grid) grid.innerHTML = '<div class="companies-loading"><i class="fas fa-spinner fa-spin"></i> Loading companies...</div>';
    },

    renderError(msg) {
        const grid = document.getElementById('companiesGrid');
        if (grid) grid.innerHTML = `<div class="companies-empty"><i class="fas fa-exclamation-triangle"></i><p>${msg}</p></div>`;
    },

    renderList() {
        const grid = document.getElementById('companiesGrid');
        if (!grid) return;

        const filtered = this.companies.filter(c => {
            if (this.currentFilter === 'all') return true;
            if (this.currentFilter === 'verified') return !!c.is_verified;
            if (this.currentFilter === 'unverified') return !c.is_verified;
            return true;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="companies-empty">
                    <i class="fas fa-building"></i>
                    <p>No companies yet.</p>
                    <button class="companies-cta-btn" onclick="CompaniesManager.openCreateCompanyModal()">
                        <i class="fas fa-plus"></i> Create your first company
                    </button>
                </div>
            `;
            return;
        }

        const cards = filtered.map(c => this.createCompanyCard(c)).join('');
        // Add an "add new company" tile at the end
        const addTile = `
            <div class="company-card company-card-add" onclick="CompaniesManager.openCreateCompanyModal()">
                <div class="company-card-add-inner">
                    <i class="fas fa-plus"></i>
                    <span>Add Company</span>
                </div>
            </div>
        `;
        grid.innerHTML = cards + addTile;
    },

    createCompanyCard(c) {
        const verifiedBadge = c.is_verified
            ? '<span class="company-badge verified"><i class="fas fa-check-circle"></i> Verified</span>'
            : (c.verification_status === 'pending'
                ? '<span class="company-badge pending"><i class="fas fa-clock"></i> Pending</span>'
                : '<span class="company-badge unverified"><i class="fas fa-exclamation-circle"></i> Unverified</span>');

        const logo = c.company_logo
            ? `<img src="${c.company_logo}" alt="${this._escape(c.company_name)}">`
            : `<i class="fas fa-building"></i>`;

        const balance = (c.balance || 0).toLocaleString();

        return `
            <div class="company-card" onclick="CompaniesManager.openCompany(${c.id})">
                <div class="company-card-header">
                    <div class="company-logo">${logo}</div>
                    <div class="company-info">
                        <h3 class="company-name">${this._escape(c.company_name)}</h3>
                        <div class="company-meta">
                            ${verifiedBadge}
                            ${c.industry ? `<span class="company-industry"><i class="fas fa-industry"></i> ${this._escape(c.industry)}</span>` : ''}
                        </div>
                    </div>
                </div>
                ${c.company_description ? `<p class="company-description">${this._escape(c.company_description)}</p>` : ''}
                <div class="company-stats-row">
                    <div class="company-stat">
                        <div class="company-stat-value">${balance}</div>
                        <div class="company-stat-label">${c.currency || 'ETB'} balance</div>
                    </div>
                </div>
            </div>
        `;
    },

    updateStats() {
        const total = this.companies.length;
        const verified = this.companies.filter(c => c.is_verified).length;
        const totalBalance = this.companies.reduce((s, c) => s + (parseFloat(c.balance) || 0), 0);

        this._setText('stat-total-companies', total);
        this._setText('stat-verified-companies', verified);
        this._setText('stat-companies-balance', totalBalance.toLocaleString());
    },

    updateSidebarCount() {
        this._setText('companies-count', String(this.companies.length));
    },

    // ---------- Filters ----------

    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.companies-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderList();
    },

    // ---------- Open company (switch to brands panel filtered by this company) ----------

    openCompany(companyId) {
        const company = this.companies.find(c => c.id === companyId);
        if (!company) {
            console.error('[CompaniesManager] Company not found:', companyId);
            return;
        }
        this.currentCompany = company;
        console.log('[CompaniesManager] Opening company:', company.company_name);

        // Tell BrandsManager which company is active (so create-brand sends company_id)
        if (typeof BrandsManager !== 'undefined') {
            BrandsManager.currentCompanyId = company.id;
            BrandsManager.currentCompanyName = company.company_name;
            BrandsManager.currentCompanyVerified = !!company.is_verified;
            // Reload brands scoped to this company
            if (typeof BrandsManager.loadBrands === 'function') {
                BrandsManager.loadBrands();
            }
        }

        // Update brands-panel header to show "Brands for <company>"
        const headerTitle = document.querySelector('.brands-panel-title');
        if (headerTitle) {
            headerTitle.innerHTML = `
                <button type="button" onclick="CompaniesManager.backToCompanies()" class="brands-back-btn" title="Back to companies">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <i class="fas fa-building"></i>
                ${this._escape(company.company_name)}'s Brands
            `;
        }
        const headerSubtitle = document.querySelector('.brands-panel-subtitle');
        if (headerSubtitle) {
            headerSubtitle.textContent = company.is_verified
                ? 'Manage this company\'s brands and their campaigns.'
                : 'This company must be verified before you can create brands.';
        }

        // Switch panel
        if (typeof switchPanel === 'function') {
            switchPanel('brands');
        }
    },

    backToCompanies() {
        this.currentCompany = null;
        if (typeof BrandsManager !== 'undefined') {
            BrandsManager.currentCompanyId = null;
            BrandsManager.currentCompanyName = null;
            BrandsManager.currentCompanyVerified = null;
        }
        // Restore default brands-panel header
        const headerTitle = document.querySelector('.brands-panel-title');
        if (headerTitle) {
            headerTitle.innerHTML = `<i class="fas fa-building"></i> My Brands`;
        }
        const headerSubtitle = document.querySelector('.brands-panel-subtitle');
        if (headerSubtitle) {
            headerSubtitle.textContent = 'Manage your brands and their campaigns';
        }
        if (typeof switchPanel === 'function') {
            switchPanel('companies');
        }
    },

    // ---------- Create company modal ----------

    openCreateCompanyModal() {
        const overlay = document.getElementById('create-company-modal-overlay');
        if (!overlay) {
            alert('Create-company modal not loaded yet. Please refresh and try again.');
            return;
        }
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        const form = document.getElementById('create-company-form');
        if (form) form.reset();
    },

    closeCreateCompanyModal() {
        const overlay = document.getElementById('create-company-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    async submitCreateCompany(event) {
        if (event && event.preventDefault) event.preventDefault();
        const name = document.getElementById('company-name-input')?.value.trim();
        if (!name) {
            alert('Company name is required.');
            return;
        }

        const payload = {
            company_name: name,
            industry: document.getElementById('company-industry-input')?.value || null,
            website: document.getElementById('company-website-input')?.value.trim() || null,
            company_description: document.getElementById('company-description-input')?.value.trim() || null,
            address: document.getElementById('company-address-input')?.value.trim() || null,
            city: document.getElementById('company-city-input')?.value.trim() || null,
        };

        const submitBtn = document.getElementById('create-company-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        }

        try {
            const res = await fetch(`${COMPANIES_API_BASE}/api/advertiser/companies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...this._authHeaders() },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || `HTTP ${res.status}`);
            }
            console.log('[CompaniesManager] Created company:', data.company);
            this.closeCreateCompanyModal();
            await this.loadCompanies();
            if (window.Utils && Utils.showToast) {
                Utils.showToast(`Company "${name}" created.`, 'success');
            } else {
                alert(`Company "${name}" created.`);
            }
        } catch (e) {
            console.error('[CompaniesManager] Create failed:', e);
            alert(`Failed to create company: ${e.message}`);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-plus"></i> Create Company';
            }
        }
    },

    // ---------- Helpers ----------

    _setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    },

    _escape(s) {
        if (s === null || s === undefined) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },
};

// Make globally accessible (for onclick handlers in HTML)
window.CompaniesManager = CompaniesManager;
