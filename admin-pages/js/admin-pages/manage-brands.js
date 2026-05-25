// ============================================
// MANAGE BRANDS (admin page)
// Uses the /api/admin-advertisers/brands/* endpoints.
// Post-restructure: response carries company_name + advertiser_email
// from the brand_profile -> company_profile -> advertiser_profiles ->
// users JOIN chain.
// ============================================

const BRANDS_API_URL = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:8000';

const BrandsAdmin = {
    brands: [],
    counts: { total: 0, verified: 0, pending: 0, rejected: 0, suspended: 0 },
    filterStatus: 'all',
    searchTerm: '',
    page: 1,
    limit: 20,
    totalPages: 1,
    reasonAction: null,

    async init() {
        await this.loadCounts();
        await this.loadBrands();
    },

    async loadCounts() {
        try {
            const res = await fetch(`${BRANDS_API_URL}/api/admin-advertisers/brands/counts`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this.counts = await res.json();
            this.renderCounts();
        } catch (e) {
            console.error('[BrandsAdmin] loadCounts failed:', e);
        }
    },

    renderCounts() {
        const map = {
            'stat-total': this.counts.total,
            'stat-verified': this.counts.verified,
            'stat-pending': this.counts.pending,
            'stat-rejected': this.counts.rejected,
            'stat-suspended': this.counts.suspended,
        };
        for (const [id, val] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.textContent = val ?? 0;
        }
        const sidebarCount = document.getElementById('brands-sidebar-count');
        if (sidebarCount) sidebarCount.textContent = this.counts.total ?? 0;
    },

    async loadBrands() {
        const list = document.getElementById('brands-list');
        if (list) list.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading brands...</div>';

        try {
            const qs = new URLSearchParams({
                page: String(this.page),
                limit: String(this.limit),
            });
            if (this.filterStatus !== 'all') qs.set('status', this.filterStatus);
            if (this.searchTerm) qs.set('search', this.searchTerm);

            const res = await fetch(`${BRANDS_API_URL}/api/admin-advertisers/brands?${qs.toString()}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${res.status}`);
            }
            const data = await res.json();
            this.brands = data.brands || [];
            this.totalPages = data.pages || 1;
            this.renderList();
            this.renderPagination();
        } catch (e) {
            console.error('[BrandsAdmin] loadBrands failed:', e);
            if (list) list.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><div>Failed to load brands: ${this._escape(e.message)}</div></div>`;
        }
    },

    renderList() {
        const list = document.getElementById('brands-list');
        if (!list) return;
        if (this.brands.length === 0) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-palette"></i><div>No brands match this filter.</div></div>';
            return;
        }
        list.innerHTML = this.brands.map(b => this.renderRow(b)).join('');
    },

    renderRow(b) {
        const logo = b.brand_logo
            ? `<img src="${this._escape(b.brand_logo)}" alt="${this._escape(b.brand_name)}">`
            : `<i class="fas fa-palette"></i>`;

        const status = b.verification_status || 'pending';
        const badge = this.renderBadge(status);

        const companyLine = b.company_name
            ? `<div class="company-owner"><i class="fas fa-building"></i> ${this._escape(b.company_name)}</div>`
            : '';
        const ownerLine = b.advertiser_name || b.advertiser_email
            ? `<div class="company-owner"><i class="fas fa-user"></i> ${this._escape(b.advertiser_name || b.advertiser_email)}</div>`
            : '';

        const pkgLine = b.package_name
            ? `<div class="company-owner"><i class="fas fa-box"></i> ${this._escape(b.package_name)}${b.package_price ? ` &middot; ${b.package_price.toLocaleString()} ETB` : ''}</div>`
            : '';

        const actions = this.renderRowActions(b, status);

        return `
            <div class="company-row" data-id="${b.id}">
                <div class="company-logo">${logo}</div>
                <div class="company-main">
                    <h3>${this._escape(b.brand_name)}</h3>
                    ${companyLine}
                    ${ownerLine}
                    ${pkgLine}
                    ${badge}
                </div>
                <div class="company-balance">
                    <div class="amt">${b.is_active ? 'Active' : 'Inactive'}</div>
                    <div class="label">${b.location ? this._escape(b.location) : '—'}</div>
                </div>
                <div class="company-actions">
                    <button class="btn-primary" onclick="BrandsAdmin.openDetail(${b.id})">
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
        };
        const s = map[status] || map.pending;
        return `<span class="company-badge ${s.cls}"><i class="fas fa-${s.icon}"></i> ${s.text}</span>`;
    },

    renderRowActions(b, status) {
        const buttons = [];
        if (status === 'pending') {
            buttons.push(`<button class="btn-success" onclick="BrandsAdmin.verifyBrand(${b.id})"><i class="fas fa-check"></i> Verify</button>`);
            buttons.push(`<button class="btn-danger" onclick="BrandsAdmin.askReason('reject', ${b.id})"><i class="fas fa-times"></i> Reject</button>`);
        } else if (status === 'verified') {
            buttons.push(`<button class="btn-warning" onclick="BrandsAdmin.askReason('suspend', ${b.id})"><i class="fas fa-pause"></i> Suspend</button>`);
        } else if (status === 'rejected') {
            buttons.push(`<button class="btn-secondary" onclick="BrandsAdmin.restoreBrand(${b.id})"><i class="fas fa-undo"></i> Restore to Pending</button>`);
        } else if (status === 'suspended') {
            buttons.push(`<button class="btn-success" onclick="BrandsAdmin.reinstateBrand(${b.id})"><i class="fas fa-redo"></i> Reinstate</button>`);
            buttons.push(`<button class="btn-secondary" onclick="BrandsAdmin.restoreBrand(${b.id})"><i class="fas fa-undo"></i> To Pending</button>`);
        }
        return buttons.join('');
    },

    renderPagination() {
        const pag = document.getElementById('pagination');
        if (!pag) return;
        if (this.totalPages <= 1) { pag.innerHTML = ''; return; }
        const btns = [];
        btns.push(`<button onclick="BrandsAdmin.goToPage(${this.page - 1})" ${this.page <= 1 ? 'disabled' : ''}>&laquo; Prev</button>`);
        for (let i = 1; i <= this.totalPages; i++) {
            btns.push(`<button class="${i === this.page ? 'active' : ''}" onclick="BrandsAdmin.goToPage(${i})">${i}</button>`);
        }
        btns.push(`<button onclick="BrandsAdmin.goToPage(${this.page + 1})" ${this.page >= this.totalPages ? 'disabled' : ''}>Next &raquo;</button>`);
        pag.innerHTML = btns.join('');
    },

    goToPage(p) {
        if (p < 1 || p > this.totalPages) return;
        this.page = p;
        this.loadBrands();
    },

    setFilter(status) {
        this.filterStatus = status;
        this.page = 1;
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.status === status);
        });
        this.loadBrands();
    },

    onSearchInput(event) {
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
            this.searchTerm = event.target.value.trim();
            this.page = 1;
            this.loadBrands();
        }, 300);
    },

    async refresh() {
        await this.loadCounts();
        await this.loadBrands();
    },

    // ---------- Detail Modal ----------

    async openDetail(brandId) {
        const overlay = document.getElementById('brand-modal');
        const body = document.getElementById('modal-body');
        const footer = document.getElementById('modal-footer');
        const title = document.getElementById('modal-title');
        if (!overlay || !body) return;

        overlay.classList.remove('hidden');
        body.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading details...</div>';
        footer.innerHTML = '';

        try {
            const res = await fetch(`${BRANDS_API_URL}/api/admin-advertisers/brands/${brandId}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${res.status}`);
            }
            const b = await res.json();
            title.textContent = b.brand_name;
            body.innerHTML = this.renderDetail(b);
            footer.innerHTML = this.renderDetailActions(b);
        } catch (e) {
            body.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><div>${this._escape(e.message)}</div></div>`;
        }
    },

    renderDetail(b) {
        const status = b.verification_status || 'pending';
        const badge = this.renderBadge(status);

        const socials = b.social_links && typeof b.social_links === 'object'
            ? Object.entries(b.social_links).filter(([_, v]) => v).map(([k, v]) => `<dt>${this._escape(k)}</dt><dd>${this._escape(v)}</dd>`).join('')
            : '';

        const notesBanner = b.status_reason
            ? `<div class="notes-banner"><i class="fas fa-info-circle"></i><strong>Admin notes:</strong> ${this._escape(b.status_reason)}</div>`
            : '';

        return `
            ${notesBanner}

            <div class="detail-section">
                <h3>Status</h3>
                <div>${badge} <span class="ml-2 text-sm text-gray-500">${b.is_active ? 'Active' : 'Inactive'}</span></div>
                ${b.status_at ? `<div class="text-sm text-gray-500 mt-1">Status changed: ${this._formatDate(b.status_at)}</div>` : ''}
            </div>

            <div class="detail-section">
                <h3>Brand Info</h3>
                <dl class="detail-grid">
                    <dt>Name</dt><dd>${this._escape(b.brand_name)}</dd>
                    <dt>Hero Title</dt><dd>${this._escape(b.hero_title) || '—'}</dd>
                    <dt>Hero Subtitle</dt><dd>${this._escape(b.hero_subtitle) || '—'}</dd>
                    <dt>Badge</dt><dd>${this._escape(b.badge) || '—'}</dd>
                    <dt>Description</dt><dd>${this._escape(b.description) || '—'}</dd>
                    <dt>Quote</dt><dd>${this._escape(b.quote) || '—'}</dd>
                    <dt>Location</dt><dd>${this._escape(b.location) || '—'}</dd>
                </dl>
            </div>

            <div class="detail-section">
                <h3>Contact</h3>
                <dl class="detail-grid">
                    <dt>Email</dt><dd>${this._escape(b.email) || '—'}</dd>
                    <dt>Phone</dt><dd>${this._escape(b.phone) || '—'}</dd>
                    ${socials}
                </dl>
            </div>

            <div class="detail-section">
                <h3>Company &amp; Advertiser</h3>
                <dl class="detail-grid">
                    <dt>Company</dt><dd>${this._escape(b.company_name) || '—'}${b.company_id ? ` <a href="manage-companies.html?company=${b.company_id}" class="text-sm text-indigo-600 ml-2">(view)</a>` : ''}</dd>
                    <dt>Company KYC</dt><dd>${b.company_is_verified ? '<span class="company-badge verified"><i class="fas fa-check-circle"></i> Verified</span>' : '<span class="company-badge unverified"><i class="fas fa-circle"></i> Not verified</span>'}</dd>
                    <dt>Owner</dt><dd>${this._escape(b.advertiser_name) || '—'}</dd>
                    <dt>Owner Email</dt><dd>${this._escape(b.advertiser_email) || '—'}</dd>
                    <dt>Advertiser ID</dt><dd>${b.advertiser_id ? `#${b.advertiser_id}` : '—'}</dd>
                </dl>
            </div>

            <div class="detail-section">
                <h3>Brand Asset</h3>
                ${b.brand_logo
                    ? `<div class="doc-tile"><i class="fas fa-image"></i><div class="doc-meta"><div class="doc-name">Brand Logo</div><div class="doc-status">Uploaded</div></div><a href="${this._escape(b.brand_logo)}" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> Open</a></div>`
                    : `<div class="doc-tile missing"><i class="fas fa-exclamation-triangle"></i><div class="doc-meta"><div class="doc-name">Brand Logo</div><div class="doc-status">Not uploaded</div></div></div>`
                }
            </div>

            <div class="detail-section">
                <h3>IDs</h3>
                <dl class="detail-grid">
                    <dt>Brand ID</dt><dd>#${b.id}</dd>
                    <dt>Created</dt><dd>${this._formatDate(b.created_at)}</dd>
                </dl>
            </div>
        `;
    },

    renderDetailActions(b) {
        const status = b.verification_status || 'pending';
        const buttons = [`<button class="btn-secondary" onclick="BrandsAdmin.closeModal()">Close</button>`];
        if (status === 'pending') {
            buttons.push(`<button class="btn-danger" onclick="BrandsAdmin.askReason('reject', ${b.id})"><i class="fas fa-times"></i> Reject</button>`);
            buttons.push(`<button class="btn-success" onclick="BrandsAdmin.verifyBrand(${b.id})"><i class="fas fa-check"></i> Verify</button>`);
        } else if (status === 'verified') {
            buttons.push(`<button class="btn-warning" onclick="BrandsAdmin.askReason('suspend', ${b.id})"><i class="fas fa-pause"></i> Suspend</button>`);
        } else if (status === 'rejected') {
            buttons.push(`<button class="btn-secondary" onclick="BrandsAdmin.restoreBrand(${b.id})"><i class="fas fa-undo"></i> Restore to Pending</button>`);
        } else if (status === 'suspended') {
            buttons.push(`<button class="btn-secondary" onclick="BrandsAdmin.restoreBrand(${b.id})"><i class="fas fa-undo"></i> To Pending</button>`);
            buttons.push(`<button class="btn-success" onclick="BrandsAdmin.reinstateBrand(${b.id})"><i class="fas fa-redo"></i> Reinstate</button>`);
        }
        return buttons.join('');
    },

    closeModal() {
        document.getElementById('brand-modal')?.classList.add('hidden');
    },

    // ---------- Reason Modal ----------

    askReason(action, brandId) {
        this.reasonAction = { action, brandId };
        document.getElementById('reason-input').value = '';
        document.getElementById('reason-title').textContent =
            action === 'reject' ? `Reject brand #${brandId}` : `Suspend brand #${brandId}`;
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
        const { action, brandId } = this.reasonAction;
        this.closeReasonModal();
        if (action === 'reject') return this.rejectBrand(brandId, reason);
        if (action === 'suspend') return this.suspendBrand(brandId, reason);
    },

    // ---------- Actions ----------

    async _postAction(brandId, path, body = null) {
        const opts = { method: 'POST' };
        if (body) {
            opts.headers = { 'Content-Type': 'application/json' };
            opts.body = JSON.stringify(body);
        }
        const res = await fetch(`${BRANDS_API_URL}/api/admin-advertisers/brands/${brandId}/${path}`, opts);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        return res.json();
    },

    async verifyBrand(brandId) {
        if (!confirm(`Verify brand #${brandId}?`)) return;
        try {
            await this._postAction(brandId, 'verify');
            this.closeModal();
            await this.refresh();
            alert('Brand verified.');
        } catch (e) {
            alert('Verify failed: ' + e.message);
        }
    },

    async rejectBrand(brandId, reason) {
        try {
            await this._postAction(brandId, 'reject', { reason });
            this.closeModal();
            await this.refresh();
            alert('Brand rejected.');
        } catch (e) {
            alert('Reject failed: ' + e.message);
        }
    },

    async suspendBrand(brandId, reason) {
        try {
            await this._postAction(brandId, 'suspend', { reason });
            this.closeModal();
            await this.refresh();
            alert('Brand suspended.');
        } catch (e) {
            alert('Suspend failed: ' + e.message);
        }
    },

    async restoreBrand(brandId) {
        if (!confirm(`Restore brand #${brandId} to pending?`)) return;
        try {
            await this._postAction(brandId, 'restore');
            this.closeModal();
            await this.refresh();
            alert('Brand restored to pending.');
        } catch (e) {
            alert('Restore failed: ' + e.message);
        }
    },

    async reinstateBrand(brandId) {
        if (!confirm(`Reinstate brand #${brandId} to verified?`)) return;
        try {
            await this._postAction(brandId, 'reinstate');
            this.closeModal();
            await this.refresh();
            alert('Brand reinstated.');
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

window.BrandsAdmin = BrandsAdmin;

document.addEventListener('DOMContentLoaded', () => {
    BrandsAdmin.init();
});
