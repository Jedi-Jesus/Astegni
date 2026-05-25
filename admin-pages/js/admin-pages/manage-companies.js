// ============================================
// MANAGE COMPANIES (admin page)
// Calls /api/admin-advertisers/companies/* added in commits eb9fbbc + 4870d5b.
// ============================================

const COMPANIES_API_URL = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:8000';

const CompaniesAdmin = {
    companies: [],
    counts: { total: 0, verified: 0, pending: 0, rejected: 0, suspended: 0, unverified: 0 },
    filterStatus: 'all',
    searchTerm: '',
    page: 1,
    limit: 20,
    totalPages: 1,
    currentDetailCompany: null,
    reasonAction: null, // 'reject' | 'suspend' — tracks which action awaits a reason

    async init() {
        await this.loadCounts();
        await this.loadCompanies();
    },

    async loadCounts() {
        try {
            const res = await fetch(`${COMPANIES_API_URL}/api/admin-advertisers/companies/counts`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this.counts = await res.json();
            this.renderCounts();
        } catch (e) {
            console.error('[CompaniesAdmin] loadCounts failed:', e);
        }
    },

    renderCounts() {
        const map = {
            'stat-total': this.counts.total,
            'stat-verified': this.counts.verified,
            'stat-pending': this.counts.pending,
            'stat-rejected': this.counts.rejected,
            'stat-suspended': this.counts.suspended,
            'stat-unverified': this.counts.unverified,
        };
        for (const [id, val] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.textContent = val ?? 0;
        }
        const sidebarCount = document.getElementById('companies-sidebar-count');
        if (sidebarCount) sidebarCount.textContent = this.counts.total ?? 0;
    },

    async loadCompanies() {
        const list = document.getElementById('companies-list');
        if (list) list.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading companies...</div>';

        try {
            const qs = new URLSearchParams({
                page: String(this.page),
                limit: String(this.limit),
            });
            if (this.filterStatus !== 'all') qs.set('status', this.filterStatus);
            if (this.searchTerm) qs.set('search', this.searchTerm);

            const res = await fetch(`${COMPANIES_API_URL}/api/admin-advertisers/companies?${qs.toString()}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${res.status}`);
            }
            const data = await res.json();
            this.companies = data.companies || [];
            this.totalPages = data.pages || 1;
            this.renderList();
            this.renderPagination();
        } catch (e) {
            console.error('[CompaniesAdmin] loadCompanies failed:', e);
            if (list) list.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><div>Failed to load companies: ${this._escape(e.message)}</div></div>`;
        }
    },

    renderList() {
        const list = document.getElementById('companies-list');
        if (!list) return;
        if (this.companies.length === 0) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-building"></i><div>No companies match this filter.</div></div>';
            return;
        }
        list.innerHTML = this.companies.map(c => this.renderRow(c)).join('');
    },

    renderRow(c) {
        const logo = c.company_logo
            ? `<img src="${this._escape(c.company_logo)}" alt="${this._escape(c.company_name)}">`
            : `<i class="fas fa-building"></i>`;

        const status = c.verification_status || (c.is_verified ? 'verified' : 'unverified');
        const badge = this.renderBadge(status);

        const ownerLine = c.advertiser_email
            ? `<div class="company-owner"><i class="fas fa-user"></i> ${this._escape(c.advertiser_name || '')} &middot; ${this._escape(c.advertiser_email)}</div>`
            : '';

        const balance = (c.balance ?? 0).toLocaleString();
        const currency = c.currency || 'ETB';

        const actions = this.renderRowActions(c, status);

        return `
            <div class="company-row" data-id="${c.id}">
                <div class="company-logo">${logo}</div>
                <div class="company-main">
                    <h3>${this._escape(c.company_name)}</h3>
                    ${ownerLine}
                    ${badge}
                </div>
                <div class="company-balance">
                    <div class="amt">${balance} ${currency}</div>
                    <div class="label">Wallet</div>
                </div>
                <div class="company-actions">
                    <button class="btn-primary" onclick="CompaniesAdmin.openDetail(${c.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
                <div class="company-actions" style="grid-column:1/-1; justify-self:end;">${actions}</div>
            </div>
        `;
    },

    renderBadge(status) {
        const map = {
            verified:   { cls: 'verified',   icon: 'check-circle',  text: 'Verified' },
            pending:    { cls: 'pending',    icon: 'clock',         text: 'Pending Review' },
            rejected:   { cls: 'rejected',   icon: 'times-circle',  text: 'Rejected' },
            suspended:  { cls: 'suspended',  icon: 'pause-circle',  text: 'Suspended' },
            unverified: { cls: 'unverified', icon: 'circle',        text: 'Unverified' },
        };
        const s = map[status] || map.unverified;
        return `<span class="company-badge ${s.cls}"><i class="fas fa-${s.icon}"></i> ${s.text}</span>`;
    },

    renderRowActions(c, status) {
        const buttons = [];
        if (status === 'pending') {
            buttons.push(`<button class="btn-success" onclick="CompaniesAdmin.verifyCompany(${c.id})"><i class="fas fa-check"></i> Verify</button>`);
            buttons.push(`<button class="btn-danger" onclick="CompaniesAdmin.askReason('reject', ${c.id})"><i class="fas fa-times"></i> Reject</button>`);
        } else if (status === 'verified') {
            buttons.push(`<button class="btn-warning" onclick="CompaniesAdmin.askReason('suspend', ${c.id})"><i class="fas fa-pause"></i> Suspend</button>`);
        } else if (status === 'rejected') {
            buttons.push(`<button class="btn-secondary" onclick="CompaniesAdmin.restoreCompany(${c.id})"><i class="fas fa-undo"></i> Restore to Pending</button>`);
        } else if (status === 'suspended') {
            buttons.push(`<button class="btn-success" onclick="CompaniesAdmin.reinstateCompany(${c.id})"><i class="fas fa-redo"></i> Reinstate</button>`);
            buttons.push(`<button class="btn-secondary" onclick="CompaniesAdmin.restoreCompany(${c.id})"><i class="fas fa-undo"></i> To Pending</button>`);
        }
        return buttons.join('');
    },

    renderPagination() {
        const pag = document.getElementById('pagination');
        if (!pag) return;
        if (this.totalPages <= 1) { pag.innerHTML = ''; return; }
        const btns = [];
        btns.push(`<button onclick="CompaniesAdmin.goToPage(${this.page - 1})" ${this.page <= 1 ? 'disabled' : ''}>&laquo; Prev</button>`);
        for (let i = 1; i <= this.totalPages; i++) {
            btns.push(`<button class="${i === this.page ? 'active' : ''}" onclick="CompaniesAdmin.goToPage(${i})">${i}</button>`);
        }
        btns.push(`<button onclick="CompaniesAdmin.goToPage(${this.page + 1})" ${this.page >= this.totalPages ? 'disabled' : ''}>Next &raquo;</button>`);
        pag.innerHTML = btns.join('');
    },

    goToPage(p) {
        if (p < 1 || p > this.totalPages) return;
        this.page = p;
        this.loadCompanies();
    },

    setFilter(status) {
        this.filterStatus = status;
        this.page = 1;
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.status === status);
        });
        this.loadCompanies();
    },

    onSearchInput(event) {
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
            this.searchTerm = event.target.value.trim();
            this.page = 1;
            this.loadCompanies();
        }, 300);
    },

    async refresh() {
        await this.loadCounts();
        await this.loadCompanies();
    },

    // ---------- Detail Modal ----------

    async openDetail(companyId) {
        const overlay = document.getElementById('company-modal');
        const body = document.getElementById('modal-body');
        const footer = document.getElementById('modal-footer');
        const title = document.getElementById('modal-title');
        if (!overlay || !body) return;

        overlay.classList.remove('hidden');
        body.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading details...</div>';
        footer.innerHTML = '';

        try {
            const res = await fetch(`${COMPANIES_API_URL}/api/admin-advertisers/companies/${companyId}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${res.status}`);
            }
            const c = await res.json();
            this.currentDetailCompany = c;
            title.textContent = c.company_name;
            body.innerHTML = this.renderDetail(c);
            footer.innerHTML = this.renderDetailActions(c);
        } catch (e) {
            body.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><div>${this._escape(e.message)}</div></div>`;
        }
    },

    renderDetail(c) {
        const status = c.verification_status || (c.is_verified ? 'verified' : 'unverified');
        const badge = this.renderBadge(status);

        const emails = Array.isArray(c.company_email) ? c.company_email : [];
        const phones = Array.isArray(c.company_phone) ? c.company_phone : [];
        const extraDocs = Array.isArray(c.additional_docs_urls) ? c.additional_docs_urls : [];

        const notesBanner = c.verification_notes
            ? `<div class="notes-banner"><i class="fas fa-info-circle"></i><strong>Admin notes:</strong> ${this._escape(c.verification_notes)}</div>`
            : '';

        return `
            ${notesBanner}

            <div class="detail-section">
                <h3>Status</h3>
                <div>${badge}</div>
                ${c.verification_submitted_at ? `<div class="text-sm text-gray-500 mt-1">Submitted: ${this._formatDate(c.verification_submitted_at)}</div>` : ''}
                ${c.verification_reviewed_at ? `<div class="text-sm text-gray-500">Reviewed: ${this._formatDate(c.verification_reviewed_at)}</div>` : ''}
            </div>

            <div class="detail-section">
                <h3>Company Info</h3>
                <dl class="detail-grid">
                    <dt>Name</dt><dd>${this._escape(c.company_name)}</dd>
                    <dt>Industry</dt><dd>${this._escape(c.industry) || '—'}</dd>
                    <dt>Size</dt><dd>${this._escape(c.company_size) || '—'}</dd>
                    <dt>Website</dt><dd>${c.website ? `<a href="${this._escape(c.website)}" target="_blank" rel="noopener">${this._escape(c.website)}</a>` : '—'}</dd>
                    <dt>Address</dt><dd>${this._escape(c.address) || '—'}</dd>
                    <dt>City</dt><dd>${this._escape(c.city) || '—'}</dd>
                    <dt>Description</dt><dd>${this._escape(c.company_description) || '—'}</dd>
                </dl>
            </div>

            <div class="detail-section">
                <h3>Owner</h3>
                <dl class="detail-grid">
                    <dt>Advertiser</dt><dd>${this._escape(c.advertiser_name) || '—'}</dd>
                    <dt>Email</dt><dd>${this._escape(c.advertiser_email) || '—'}</dd>
                    <dt>Advertiser ID</dt><dd>#${c.advertiser_id}</dd>
                </dl>
            </div>

            <div class="detail-section">
                <h3>Wallet</h3>
                <dl class="detail-grid">
                    <dt>Balance</dt><dd><strong>${(c.balance ?? 0).toLocaleString()} ${this._escape(c.currency || 'ETB')}</strong></dd>
                    <dt>Total Deposits</dt><dd>${(c.total_deposits ?? 0).toLocaleString()} ${this._escape(c.currency || 'ETB')}</dd>
                    <dt>Total Spent</dt><dd>${(c.total_spent ?? 0).toLocaleString()} ${this._escape(c.currency || 'ETB')}</dd>
                </dl>
            </div>

            <div class="detail-section">
                <h3>Brands &amp; Campaigns</h3>
                <dl class="detail-grid">
                    <dt>Brands</dt><dd>${c.brand_count ?? 0}</dd>
                    <dt>Campaigns</dt><dd>${c.campaign_count ?? 0}</dd>
                </dl>
            </div>

            <div class="detail-section">
                <h3>KYC Documents</h3>
                ${this.renderDocTile('Business License', c.business_license_url, 'file-contract')}
                ${this.renderDocTile('TIN Certificate', c.tin_certificate_url, 'receipt')}
                ${this.renderDocTile('Company Logo', c.company_logo, 'image')}
                ${extraDocs.map((url, idx) => this.renderDocTile(`Additional Doc #${idx + 1}`, url, 'file')).join('')}
                ${(emails.length || phones.length) ? `
                    <dl class="detail-grid mt-3">
                        ${emails.length ? `<dt>Emails</dt><dd>${emails.map(e => this._escape(e)).join(', ')}</dd>` : ''}
                        ${phones.length ? `<dt>Phones</dt><dd>${phones.map(p => this._escape(p)).join(', ')}</dd>` : ''}
                    </dl>
                ` : ''}
            </div>

            <div class="detail-section">
                <h3>IDs</h3>
                <dl class="detail-grid">
                    <dt>Company ID</dt><dd>#${c.id}</dd>
                    <dt>Business Reg #</dt><dd>${this._escape(c.business_reg_no) || '—'}</dd>
                    <dt>TIN #</dt><dd>${this._escape(c.tin_number) || '—'}</dd>
                    <dt>Created</dt><dd>${this._formatDate(c.created_at)}</dd>
                </dl>
            </div>
        `;
    },

    renderDocTile(label, url, icon) {
        if (!url) {
            return `
                <div class="doc-tile missing">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="doc-meta">
                        <div class="doc-name">${label}</div>
                        <div class="doc-status">Not uploaded</div>
                    </div>
                </div>`;
        }
        return `
            <div class="doc-tile">
                <i class="fas fa-${icon}"></i>
                <div class="doc-meta">
                    <div class="doc-name">${label}</div>
                    <div class="doc-status">Uploaded</div>
                </div>
                <a href="${this._escape(url)}" target="_blank" rel="noopener">
                    <i class="fas fa-external-link-alt"></i> Open
                </a>
            </div>`;
    },

    renderDetailActions(c) {
        const status = c.verification_status || (c.is_verified ? 'verified' : 'unverified');
        const buttons = [`<button class="btn-secondary" onclick="CompaniesAdmin.closeModal()">Close</button>`];
        if (status === 'pending') {
            buttons.push(`<button class="btn-danger" onclick="CompaniesAdmin.askReason('reject', ${c.id})"><i class="fas fa-times"></i> Reject</button>`);
            buttons.push(`<button class="btn-success" onclick="CompaniesAdmin.verifyCompany(${c.id})"><i class="fas fa-check"></i> Verify</button>`);
        } else if (status === 'verified') {
            buttons.push(`<button class="btn-warning" onclick="CompaniesAdmin.askReason('suspend', ${c.id})"><i class="fas fa-pause"></i> Suspend</button>`);
        } else if (status === 'rejected') {
            buttons.push(`<button class="btn-secondary" onclick="CompaniesAdmin.restoreCompany(${c.id})"><i class="fas fa-undo"></i> Restore to Pending</button>`);
        } else if (status === 'suspended') {
            buttons.push(`<button class="btn-secondary" onclick="CompaniesAdmin.restoreCompany(${c.id})"><i class="fas fa-undo"></i> To Pending</button>`);
            buttons.push(`<button class="btn-success" onclick="CompaniesAdmin.reinstateCompany(${c.id})"><i class="fas fa-redo"></i> Reinstate</button>`);
        }
        return buttons.join('');
    },

    closeModal() {
        document.getElementById('company-modal')?.classList.add('hidden');
        this.currentDetailCompany = null;
    },

    // ---------- Reason Modal ----------

    askReason(action, companyId) {
        this.reasonAction = { action, companyId };
        document.getElementById('reason-input').value = '';
        document.getElementById('reason-title').textContent =
            action === 'reject' ? `Reject company #${companyId}` : `Suspend company #${companyId}`;
        const btn = document.getElementById('reason-confirm-btn');
        btn.textContent = action === 'reject' ? 'Reject' : 'Suspend';
        btn.className = action === 'reject' ? 'btn-danger' : 'btn-warning';
        document.getElementById('reason-modal')?.classList.remove('hidden');
    },

    closeReasonModal() {
        document.getElementById('reason-modal')?.classList.add('hidden');
        this.reasonAction = null;
    },

    async confirmReason() {
        const reason = document.getElementById('reason-input').value.trim();
        if (!reason) { alert('Reason is required.'); return; }
        if (!this.reasonAction) return;
        const { action, companyId } = this.reasonAction;
        this.closeReasonModal();
        if (action === 'reject') return this.rejectCompany(companyId, reason);
        if (action === 'suspend') return this.suspendCompany(companyId, reason);
    },

    // ---------- Actions ----------

    async _postAction(companyId, path, body = null) {
        const opts = { method: 'POST' };
        if (body) {
            opts.headers = { 'Content-Type': 'application/json' };
            opts.body = JSON.stringify(body);
        }
        const res = await fetch(`${COMPANIES_API_URL}/api/admin-advertisers/companies/${companyId}/${path}`, opts);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        return res.json();
    },

    async verifyCompany(companyId) {
        if (!confirm(`Verify company #${companyId}? This approves their KYC.`)) return;
        try {
            await this._postAction(companyId, 'verify');
            this.closeModal();
            await this.refresh();
            alert('Company verified.');
        } catch (e) {
            alert('Verify failed: ' + e.message);
        }
    },

    async rejectCompany(companyId, reason) {
        try {
            await this._postAction(companyId, 'reject', { reason });
            this.closeModal();
            await this.refresh();
            alert('Company rejected.');
        } catch (e) {
            alert('Reject failed: ' + e.message);
        }
    },

    async suspendCompany(companyId, reason) {
        try {
            await this._postAction(companyId, 'suspend', { reason });
            this.closeModal();
            await this.refresh();
            alert('Company suspended.');
        } catch (e) {
            alert('Suspend failed: ' + e.message);
        }
    },

    async restoreCompany(companyId) {
        if (!confirm(`Restore company #${companyId} to pending? It will be re-reviewed.`)) return;
        try {
            await this._postAction(companyId, 'restore');
            this.closeModal();
            await this.refresh();
            alert('Company restored to pending.');
        } catch (e) {
            alert('Restore failed: ' + e.message);
        }
    },

    async reinstateCompany(companyId) {
        if (!confirm(`Reinstate company #${companyId} to verified?`)) return;
        try {
            await this._postAction(companyId, 'reinstate');
            this.closeModal();
            await this.refresh();
            alert('Company reinstated.');
        } catch (e) {
            alert('Reinstate failed: ' + e.message);
        }
    },

    // ---------- Helpers ----------

    _escape(s) {
        if (s === null || s === undefined) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    _formatDate(s) {
        if (!s) return '—';
        try { return new Date(s).toLocaleString(); } catch { return s; }
    },
};

window.CompaniesAdmin = CompaniesAdmin;

document.addEventListener('DOMContentLoaded', () => {
    CompaniesAdmin.init();
});
