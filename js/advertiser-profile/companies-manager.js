// ============================================
// COMPANIES MANAGER
// One advertiser can own multiple companies. Each company has its own brands,
// campaigns, billing wallet, and KYC verification.
//
// Click flow (branches on verification status):
//   verified   -> opens brands panel filtered to that company
//   unverified -> opens edit modal prefilled (must add TIN + business license)
//   pending    -> "Verification in progress" modal (+ notify-admins after 2 business days)
//   rejected   -> reason modal with "Edit & resubmit"
//   suspended  -> reason modal (contact support)
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

    personVerified: false,

    async initialize() {
        console.log('🏢 CompaniesManager.initialize()');
        await this.loadModals();
        await this.refreshPersonVerified();
        await this.loadCompanies();
        // When the owner finishes person-KYC, unlock the companies UI live.
        if (!this._kycListenerAttached) {
            this._kycListenerAttached = true;
            document.addEventListener('kycVerificationComplete', async () => {
                this.personVerified = true;
                this.renderList();
            });
        }
    },

    // The account owner must be person-KYC verified before creating OR accessing
    // any company. Cache the flag so rendering can lock the cards.
    async refreshPersonVerified() {
        try {
            const res = await fetch(`${COMPANIES_API_BASE}/api/advertiser/kyc/check`, {
                headers: this._authHeaders()
            });
            if (res.ok) {
                const d = await res.json();
                this.personVerified = !!d.person_verified;
            }
        } catch (e) { /* default false → locked */ }
    },

    // Beautiful modal shown when an unverified owner tries to create/open a company.
    showKycRequiredModal() {
        let overlay = document.getElementById('kyc-required-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'kyc-required-overlay';
            overlay.innerHTML = `
              <div class="kyc-req-backdrop" onclick="CompaniesManager.closeKycRequiredModal()"></div>
              <div class="kyc-req-card" role="dialog" aria-modal="true">
                <button class="kyc-req-close" onclick="CompaniesManager.closeKycRequiredModal()" aria-label="Close">&times;</button>
                <div class="kyc-req-icon">🪪</div>
                <h2 class="kyc-req-title">Verify your identity first</h2>
                <p class="kyc-req-text">
                  As the account owner, you must complete a one-time identity
                  verification (ID&nbsp;+&nbsp;selfie) before you can create or manage
                  a company. This keeps the platform trusted and your campaigns safe.
                </p>
                <ul class="kyc-req-steps">
                  <li><span>1</span> Confirm your personal details</li>
                  <li><span>2</span> Scan your ID document</li>
                  <li><span>3</span> Take a quick selfie</li>
                </ul>
                <div class="kyc-req-actions">
                  <button class="kyc-req-btn-secondary" onclick="CompaniesManager.closeKycRequiredModal()">Not now</button>
                  <button class="kyc-req-btn-primary" onclick="CompaniesManager.closeKycRequiredModal(); if (typeof openVerifyPersonalInfoModal==='function') openVerifyPersonalInfoModal();">
                    Verify identity →
                  </button>
                </div>
              </div>`;
            document.body.appendChild(overlay);
            if (!document.getElementById('kyc-required-styles')) {
                const st = document.createElement('style');
                st.id = 'kyc-required-styles';
                st.textContent = `
                  #kyc-required-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;}
                  #kyc-required-overlay .kyc-req-backdrop{position:absolute;inset:0;background:rgba(17,24,39,.55);backdrop-filter:blur(3px);}
                  #kyc-required-overlay .kyc-req-card{position:relative;width:100%;max-width:440px;background:#fff;border-radius:20px;padding:2rem 1.75rem 1.5rem;box-shadow:0 24px 60px rgba(0,0,0,.28);text-align:center;animation:kycReqIn .22s ease;}
                  @keyframes kycReqIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
                  #kyc-required-overlay .kyc-req-close{position:absolute;top:.85rem;right:1rem;background:none;border:none;font-size:1.6rem;line-height:1;color:#9ca3af;cursor:pointer;}
                  #kyc-required-overlay .kyc-req-close:hover{color:#4b5563;}
                  #kyc-required-overlay .kyc-req-icon{font-size:3rem;margin-bottom:.5rem;}
                  #kyc-required-overlay .kyc-req-title{font-size:1.4rem;font-weight:800;color:#111827;margin:0 0 .5rem;}
                  #kyc-required-overlay .kyc-req-text{font-size:.95rem;color:#4b5563;line-height:1.55;margin:0 auto 1.25rem;max-width:360px;}
                  #kyc-required-overlay .kyc-req-steps{list-style:none;padding:0;margin:0 0 1.5rem;text-align:left;display:inline-block;}
                  #kyc-required-overlay .kyc-req-steps li{display:flex;align-items:center;gap:.6rem;color:#374151;font-size:.92rem;font-weight:600;padding:.3rem 0;}
                  #kyc-required-overlay .kyc-req-steps li span{flex:none;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:800;}
                  #kyc-required-overlay .kyc-req-actions{display:flex;gap:.6rem;}
                  #kyc-required-overlay .kyc-req-btn-secondary{flex:1;padding:.75rem;border-radius:12px;border:1px solid #e5e7eb;background:#f9fafb;color:#374151;font-weight:700;cursor:pointer;}
                  #kyc-required-overlay .kyc-req-btn-secondary:hover{background:#f3f4f6;}
                  #kyc-required-overlay .kyc-req-btn-primary{flex:2;padding:.75rem;border-radius:12px;border:none;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-weight:800;cursor:pointer;box-shadow:0 6px 16px rgba(79,70,229,.35);}
                  #kyc-required-overlay .kyc-req-btn-primary:hover{filter:brightness(1.05);}
                  [data-theme="dark"] #kyc-required-overlay .kyc-req-card{background:#1f2937;}
                  [data-theme="dark"] #kyc-required-overlay .kyc-req-title{color:#f9fafb;}
                  [data-theme="dark"] #kyc-required-overlay .kyc-req-text{color:#d1d5db;}
                  [data-theme="dark"] #kyc-required-overlay .kyc-req-steps li{color:#e5e7eb;}
                  [data-theme="dark"] #kyc-required-overlay .kyc-req-btn-secondary{background:#374151;border-color:#4b5563;color:#e5e7eb;}
                `;
                document.head.appendChild(st);
            }
        }
        overlay.style.display = 'flex';
    },

    closeKycRequiredModal() {
        const o = document.getElementById('kyc-required-overlay');
        if (o) o.style.display = 'none';
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

        const locked = !this.personVerified;
        const cards = filtered.map(c => this.createCompanyCard(c, locked)).join('');
        // Add an "add new company" tile at the end (also locked until verified).
        const addTile = `
            <div class="company-card company-card-add${locked ? ' company-card-locked' : ''}" onclick="CompaniesManager.openCreateCompanyModal()">
                <div class="company-card-add-inner">
                    <i class="fas ${locked ? 'fa-lock' : 'fa-plus'}"></i>
                    <span>${locked ? 'Verify to add' : 'Add Company'}</span>
                </div>
            </div>
        `;
        // When locked, show a banner explaining why the companies aren't clickable.
        const lockNotice = locked ? `
            <div class="companies-lock-notice" onclick="CompaniesManager.showKycRequiredModal()">
                <i class="fas fa-lock"></i>
                <span>Verify your identity to access your companies and create new ones.</span>
                <button onclick="event.stopPropagation(); CompaniesManager.showKycRequiredModal()">Verify now</button>
            </div>` : '';
        grid.innerHTML = lockNotice + cards + addTile;
        this._ensureLockStyles();
    },

    _ensureLockStyles() {
        if (document.getElementById('companies-lock-styles')) return;
        const st = document.createElement('style');
        st.id = 'companies-lock-styles';
        st.textContent = `
          .companies-lock-notice{grid-column:1/-1;display:flex;align-items:center;gap:.75rem;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:12px;padding:.85rem 1.1rem;color:#92400e;font-weight:600;cursor:pointer;margin-bottom:.25rem;}
          .companies-lock-notice button{margin-left:auto;background:#d97706;color:#fff;border:none;border-radius:8px;padding:.45rem .9rem;font-weight:700;cursor:pointer;white-space:nowrap;}
          .company-card-locked{position:relative;opacity:.6;filter:grayscale(.4);cursor:not-allowed;}
          .company-card-locked::after{content:"\\f023";font-family:"Font Awesome 5 Free";font-weight:900;position:absolute;top:.6rem;right:.7rem;color:#6b7280;font-size:1rem;}
        `;
        document.head.appendChild(st);
    },

    createCompanyCard(c, locked = false) {
        const status = this._statusOf(c);
        const badgeMap = {
            verified:  '<span class="company-badge verified"><i class="fas fa-check-circle"></i> Verified</span>',
            pending:   '<span class="company-badge pending"><i class="fas fa-clock"></i> Pending</span>',
            rejected:  '<span class="company-badge rejected"><i class="fas fa-times-circle"></i> Rejected</span>',
            suspended: '<span class="company-badge suspended"><i class="fas fa-pause-circle"></i> Suspended</span>',
            unverified:'<span class="company-badge unverified"><i class="fas fa-exclamation-circle"></i> Unverified</span>',
        };
        const verifiedBadge = badgeMap[status] || badgeMap.unverified;

        const logo = c.company_logo
            ? `<img src="${c.company_logo}" alt="${this._escape(c.company_name)}">`
            : `<i class="fas fa-building"></i>`;

        const balance = (c.balance || 0).toLocaleString();

        return `
            <div class="company-card${locked ? ' company-card-locked' : ''}" onclick="CompaniesManager.openCompany(${c.id})">
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

    // Normalize a company row to one of: verified | pending | rejected | suspended | unverified
    _statusOf(c) {
        if (c.is_verified) return 'verified';
        const s = c.verification_status;
        if (s === 'pending' || s === 'rejected' || s === 'suspended') return s;
        return 'unverified';
    },

    openCompany(companyId) {
        // Existing companies are inaccessible until the owner is identity-verified.
        if (!this.personVerified) {
            this.showKycRequiredModal();
            return;
        }
        const company = this.companies.find(c => c.id === companyId);
        if (!company) {
            console.error('[CompaniesManager] Company not found:', companyId);
            return;
        }

        // Branch on verification status. Only verified companies open the brands panel.
        const status = this._statusOf(company);
        if (status === 'unverified') {
            // Needs full data first -> open edit form prefilled so they can add TIN + license.
            if (window.Utils && Utils.showToast) {
                Utils.showToast('Please complete your company details (TIN + business license) first.', 'info');
            }
            this.openEditCompanyModal(companyId);
            return;
        }
        if (status === 'pending') {
            this.openVerificationStatusModal(company, 'pending');
            return;
        }
        if (status === 'rejected') {
            this.openVerificationStatusModal(company, 'rejected');
            return;
        }
        if (status === 'suspended') {
            this.openVerificationStatusModal(company, 'suspended');
            return;
        }

        // status === 'verified' -> open brands panel.
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

        // Update brands-panel header text. The back button + building icon
        // are in the HTML permanently (so they survive hard reloads); we
        // only swap the title text span.
        const titleText = document.querySelector('#brands-panel .brands-panel-title-text');
        if (titleText) {
            titleText.textContent = `${company.company_name}'s Brands`;
        }
        const headerSubtitle = document.querySelector('#brands-panel .brands-panel-subtitle');
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
        // Restore default brands-panel header text (back button + icon
        // are in the static HTML — only the text span needs resetting).
        const titleText = document.querySelector('#brands-panel .brands-panel-title-text');
        if (titleText) {
            titleText.textContent = 'My Brands';
        }
        const headerSubtitle = document.querySelector('#brands-panel .brands-panel-subtitle');
        if (headerSubtitle) {
            headerSubtitle.textContent = 'Manage your brands and their campaigns';
        }
        if (typeof switchPanel === 'function') {
            switchPanel('companies');
        }
    },

    // ---------- Create / edit company modal ----------

    editingCompanyId: null,  // set => modal is in "edit" mode

    openCreateCompanyModal() {
        // Owner must be identity-verified before creating a company.
        if (!this.personVerified) {
            this.showKycRequiredModal();
            return;
        }
        const overlay = document.getElementById('create-company-modal-overlay');
        if (!overlay) {
            alert('Create-company modal not loaded yet. Please refresh and try again.');
            return;
        }
        this.editingCompanyId = null;
        const form = document.getElementById('create-company-form');
        if (form) form.reset();
        this._setModalChrome('create');
        this._setText('company-logo-current', '');
        this._setText('company-license-current', '');
        const lc = document.getElementById('company-logo-current');
        const cc = document.getElementById('company-license-current');
        if (lc) lc.style.display = 'none';
        if (cc) cc.style.display = 'none';
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    openEditCompanyModal(companyId) {
        const company = this.companies.find(c => c.id === companyId);
        if (!company) { console.error('[CompaniesManager] Edit: company not found', companyId); return; }
        const overlay = document.getElementById('create-company-modal-overlay');
        if (!overlay) { alert('Company modal not loaded. Please refresh.'); return; }

        this.editingCompanyId = companyId;
        const form = document.getElementById('create-company-form');
        if (form) form.reset();

        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        set('company-name-input', company.company_name);
        set('company-industry-input', company.industry);
        set('company-website-input', company.website);
        set('company-description-input', company.company_description);
        set('company-address-input', company.address);
        set('company-city-input', company.city);
        set('company-bin-input', company.business_reg_no);
        set('company-tin-input', company.tin_number);
        // company_email is a JSON array; prefill the first entry.
        const email = Array.isArray(company.company_email) ? company.company_email[0] : company.company_email;
        set('company-email-input', email);

        // Show existing uploaded files (so the user knows they don't need to re-upload).
        this._showCurrentFile('company-logo-current', company.company_logo, 'Current logo');
        this._showCurrentFile('company-license-current', company.business_license_url, 'Current business license');

        this._setModalChrome('edit', this._statusOf(company));
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    _showCurrentFile(elId, url, label) {
        const el = document.getElementById(elId);
        if (!el) return;
        if (url) {
            el.innerHTML = `<i class="fas fa-paperclip"></i> ${label} on file — <a href="${this._escape(url)}" target="_blank" rel="noopener">view</a>. Upload a new file to replace it.`;
            el.style.display = '';
        } else {
            el.textContent = '';
            el.style.display = 'none';
        }
    },

    _setModalChrome(mode, status) {
        const title = document.getElementById('company-modal-title');
        const subtitle = document.getElementById('company-modal-subtitle');
        const label = document.getElementById('create-company-submit-label');
        if (mode === 'edit') {
            if (title) title.textContent = 'Edit Company';
            if (subtitle) {
                subtitle.textContent = status === 'verified'
                    ? 'Editing a verified company will send it back for re-verification.'
                    : (status === 'rejected'
                        ? 'Update your details and re-submit for verification.'
                        : 'Update your company information.');
            }
            if (label) label.textContent = 'Save Changes';
        } else {
            if (title) title.textContent = 'Create New Company';
            if (subtitle) subtitle.textContent = 'A company groups your brands and has its own KYC, billing, and team.';
            if (label) label.textContent = 'Create Company';
        }
    },

    closeCreateCompanyModal() {
        const overlay = document.getElementById('create-company-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
        this.editingCompanyId = null;
    },

    async submitCreateCompany(event) {
        if (event && event.preventDefault) event.preventDefault();
        const name = document.getElementById('company-name-input')?.value.trim();
        if (!name) {
            alert('Company name is required.');
            return;
        }

        const email = document.getElementById('company-email-input')?.value.trim();
        const payload = {
            company_name: name,
            industry: document.getElementById('company-industry-input')?.value || null,
            website: document.getElementById('company-website-input')?.value.trim() || null,
            company_description: document.getElementById('company-description-input')?.value.trim() || null,
            address: document.getElementById('company-address-input')?.value.trim() || null,
            city: document.getElementById('company-city-input')?.value.trim() || null,
            business_reg_no: document.getElementById('company-bin-input')?.value.trim() || null,
            tin_number: document.getElementById('company-tin-input')?.value.trim() || null,
            company_email: email ? [email] : [],
        };

        const logoFile = document.getElementById('company-logo-input')?.files?.[0] || null;
        const licenseFile = document.getElementById('company-license-input')?.files?.[0] || null;
        const isEdit = !!this.editingCompanyId;

        const submitBtn = document.getElementById('create-company-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        try {
            // 1) Create or update the company core fields.
            let companyId = this.editingCompanyId;
            if (isEdit) {
                const res = await fetch(`${COMPANIES_API_BASE}/api/advertiser/companies/${companyId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...this._authHeaders() },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
            } else {
                const res = await fetch(`${COMPANIES_API_BASE}/api/advertiser/companies`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...this._authHeaders() },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
                companyId = data.company.id;
            }

            // 2) Upload files (if any). These set company_logo / business_license_url.
            if (logoFile) await this._uploadCompanyDocument(companyId, 'logo', logoFile);
            if (licenseFile) await this._uploadCompanyDocument(companyId, 'business_license', licenseFile);

            // 3) If a license was just uploaded, the company core fields were saved
            //    BEFORE the license existed, so the auto-pending rule didn't fire.
            //    Re-PUT a no-op-ish update so the backend re-evaluates verification
            //    now that both TIN + license are present.
            if (licenseFile && payload.tin_number) {
                await fetch(`${COMPANIES_API_BASE}/api/advertiser/companies/${companyId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...this._authHeaders() },
                    body: JSON.stringify({ tin_number: payload.tin_number }),
                });
            }

            this.closeCreateCompanyModal();
            await this.loadCompanies();
            if (window.Utils && Utils.showToast) {
                Utils.showToast(isEdit ? `Company "${name}" updated.` : `Company "${name}" created.`, 'success');
            }
        } catch (e) {
            console.error('[CompaniesManager] Save failed:', e);
            // If the backend rejected because the owner isn't identity-verified,
            // surface the friendly KYC modal instead of a raw alert.
            if (/identity|KYC/i.test(e.message || '')) {
                this.closeCreateCompanyModal();
                this.showKycRequiredModal();
            } else {
                alert(`Failed to save company: ${e.message}`);
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fas fa-plus"></i> <span id="create-company-submit-label">${isEdit ? 'Save Changes' : 'Create Company'}</span>`;
            }
        }
    },

    async _uploadCompanyDocument(companyId, docType, file) {
        const fd = new FormData();
        fd.append('doc_type', docType);
        fd.append('file', file);
        const res = await fetch(`${COMPANIES_API_BASE}/api/advertiser/companies/${companyId}/upload-document`, {
            method: 'POST',
            headers: { ...this._authHeaders() },  // no Content-Type; browser sets multipart boundary
            body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || `Upload failed (HTTP ${res.status})`);
        return data;
    },

    // ---------- Verification status modal (pending / rejected / suspended) ----------

    _businessDaysCopy: 'Verification usually takes up to 2 business days (weekends excluded).',

    async openVerificationStatusModal(company, status) {
        // Fetch fresh verification status (reason, escalation eligibility, business days).
        let vs = null;
        try {
            const res = await fetch(`${COMPANIES_API_BASE}/api/advertiser/companies/${company.id}/verification-status`, {
                headers: this._authHeaders(),
            });
            if (res.ok) vs = await res.json();
        } catch (e) { /* fall back to card data */ }

        const reason = (vs && vs.verification_notes) || company.verification_notes || '';
        const canEscalate = !!(vs && vs.can_escalate);
        const alreadyEscalated = !!(vs && vs.verification_escalated);
        const bizDays = vs ? vs.business_days_pending : 0;

        let title, body, footer;
        if (status === 'pending') {
            title = '<i class="fas fa-clock"></i> Verification in progress';
            body = `
                <p>Your company <strong>${this._escape(company.company_name)}</strong> is being reviewed by our team.</p>
                <p style="margin-top:0.5rem;">${this._businessDaysCopy}</p>
                ${alreadyEscalated
                    ? '<p style="margin-top:0.75rem;color:var(--accent,#b45309);"><i class="fas fa-bell"></i> Admins have been notified and your review is escalated.</p>'
                    : (canEscalate
                        ? '<p style="margin-top:0.75rem;">Your verification has been pending longer than expected. You can notify our admins to prioritize it.</p>'
                        : `<p style="margin-top:0.75rem;color:var(--text-secondary,#777);">If verification takes longer than 2 business days you'll be able to notify admins from here.</p>`)}
            `;
            const notifyDisabled = !canEscalate || alreadyEscalated;
            footer = `
                <button type="button" class="create-brand-cancel-btn" onclick="CompaniesManager.closeVerificationStatusModal()">Close</button>
                <button type="button" class="create-brand-submit-btn" id="company-notify-admins-btn"
                        ${notifyDisabled ? 'disabled title="Available after 2 business days"' : ''}
                        onclick="CompaniesManager.notifyAdmins(${company.id})">
                    <i class="fas fa-bell"></i> ${alreadyEscalated ? 'Admins notified' : 'Notify admins'}
                </button>
            `;
        } else if (status === 'rejected') {
            title = '<i class="fas fa-times-circle"></i> Verification rejected';
            body = `
                <p>Your company <strong>${this._escape(company.company_name)}</strong> was not verified.</p>
                ${reason ? `<div class="company-reason-box"><strong>Reason:</strong> ${this._escape(reason)}</div>` : ''}
                <p style="margin-top:0.75rem;">Update your details and resubmit for verification.</p>
            `;
            footer = `
                <button type="button" class="create-brand-cancel-btn" onclick="CompaniesManager.closeVerificationStatusModal()">Close</button>
                <button type="button" class="create-brand-submit-btn" onclick="CompaniesManager.closeVerificationStatusModal(); CompaniesManager.openEditCompanyModal(${company.id});">
                    <i class="fas fa-edit"></i> Edit &amp; resubmit
                </button>
            `;
        } else { // suspended
            title = '<i class="fas fa-pause-circle"></i> Company suspended';
            body = `
                <p>Your company <strong>${this._escape(company.company_name)}</strong> has been suspended.</p>
                ${reason ? `<div class="company-reason-box"><strong>Reason:</strong> ${this._escape(reason)}</div>` : ''}
                <p style="margin-top:0.75rem;">Please contact support to resolve this.</p>
            `;
            footer = `<button type="button" class="create-brand-cancel-btn" onclick="CompaniesManager.closeVerificationStatusModal()">Close</button>`;
        }

        this._renderStatusModal(title, body, footer);
    },

    _renderStatusModal(titleHtml, bodyHtml, footerHtml) {
        let overlay = document.getElementById('company-status-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'company-status-modal-overlay';
            overlay.className = 'create-brand-modal-overlay';
            overlay.innerHTML = `
                <div class="create-brand-modal-container" style="max-width:480px;">
                    <div class="create-brand-modal-header">
                        <div class="create-brand-header-info">
                            <h2 class="create-brand-modal-title" id="company-status-modal-title"></h2>
                        </div>
                        <button class="create-brand-close-btn" type="button" onclick="CompaniesManager.closeVerificationStatusModal()"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="create-brand-modal-body" id="company-status-modal-body"></div>
                    <div class="create-brand-modal-footer" id="company-status-modal-footer"></div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeVerificationStatusModal(); });
        }
        document.getElementById('company-status-modal-title').innerHTML = titleHtml;
        document.getElementById('company-status-modal-body').innerHTML = bodyHtml;
        document.getElementById('company-status-modal-footer').innerHTML = footerHtml;
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeVerificationStatusModal() {
        const overlay = document.getElementById('company-status-modal-overlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    },

    async notifyAdmins(companyId) {
        const btn = document.getElementById('company-notify-admins-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Notifying...'; }
        try {
            const res = await fetch(`${COMPANIES_API_BASE}/api/advertiser/companies/${companyId}/notify-admins`, {
                method: 'POST',
                headers: this._authHeaders(),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
            if (window.Utils && Utils.showToast) Utils.showToast('Admins notified — your verification is escalated.', 'success');
            if (btn) { btn.innerHTML = '<i class="fas fa-bell"></i> Admins notified'; btn.disabled = true; }
            await this.loadCompanies();
        } catch (e) {
            alert(`Could not notify admins: ${e.message}`);
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-bell"></i> Notify admins'; }
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
