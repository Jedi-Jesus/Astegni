// ============================================
// MANAGE ASTEGNI (admin page)
// Curates front-of-site content via manage_astegni_endpoints.py:
//   - Partners          -> /api/partners, /api/admin/partners
//   - Featured videos   -> /api/featured-videos, /api/admin/featured-videos
//   - Testimonials      -> /api/admin/testimonials (+ public /api/reviews)
// ============================================

const MA_API = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:8000';

const ManageAstegni = {
    partners: [],
    applications: [],
    videos: [],
    reviews: [],
    userReviews: [],
    currentUserReview: null,
    activeTab: 'partners',

    // ---- auth ----
    _token() {
        return localStorage.getItem('adminToken')
            || localStorage.getItem('token')
            || localStorage.getItem('access_token')
            || '';
    },
    _authHeaders() {
        return { 'Authorization': `Bearer ${this._token()}` };
    },

    _escape(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));
    },

    async _send(method, url, formData) {
        const res = await fetch(`${MA_API}${url}`, {
            method,
            headers: this._authHeaders(),  // do NOT set Content-Type; browser sets multipart boundary
            body: formData,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        return res.json();
    },

    // ---- init / tabs ----
    init() {
        this.loadPartners();
        this.loadApplications();
        this.loadVideos();
        this.loadReviews();
        this.loadUserReviews();
    },

    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('.ma-tab').forEach(b =>
            b.classList.toggle('active', b.dataset.tab === tab));
        ['partners', 'applications', 'videos', 'reviews', 'testimonials'].forEach(t => {
            const panel = document.getElementById(`panel-${t}`);
            if (panel) panel.style.display = (t === tab) ? '' : 'none';
        });
    },

    // Centralized 401/403 handling: returns true if the response was an auth
    // failure (and renders a re-login prompt into the given container).
    _handleAuth(res, containerId) {
        if (res.status === 401 || res.status === 403) {
            const el = document.getElementById(containerId);
            if (el) el.innerHTML = `<div class="error-state"><i class="fas fa-lock"></i>
                <div>Your admin session has expired or lacks access.</div>
                <button class="btn-primary" style="margin-top:0.75rem" onclick="window.location.href='index.html'">Log in again</button>
            </div>`;
            return true;
        }
        return false;
    },

    // ============================================================
    // PARTNERS
    // ============================================================
    async loadPartners() {
        const list = document.getElementById('partners-list');
        try {
            const res = await fetch(`${MA_API}/api/partners?include_inactive=true`);
            const data = await res.json();
            this.partners = data.partners || [];
            this.renderPartners();
        } catch (e) {
            if (list) list.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i> ${this._escape(e.message)}</div>`;
        }
    },

    renderPartners() {
        const list = document.getElementById('partners-list');
        if (!list) return;
        if (!this.partners.length) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-handshake"></i><div>No partners yet. Add one above.</div></div>';
            return;
        }
        list.innerHTML = this.partners.map(p => {
            const logo = p.logo
                ? `<img src="${this._escape(p.logo)}" alt="${this._escape(p.name)}" class="ma-logo">`
                : `<div class="ma-logo ma-logo-placeholder"><i class="fas fa-handshake"></i></div>`;
            const inactive = p.is_active ? '' : '<span class="ma-badge inactive">Inactive</span>';
            const featured = p.is_featured ? '<span class="ma-badge featured">Featured</span>' : '';
            return `
            <div class="ma-card">
                ${logo}
                <div class="ma-card-body">
                    <h3>${this._escape(p.name)} ${inactive} ${featured}</h3>
                    <p class="ma-muted">${this._escape(p.description || '')}</p>
                    ${p.website ? `<a href="${this._escape(p.website)}" target="_blank" rel="noopener" class="ma-link"><i class="fas fa-external-link-alt"></i> ${this._escape(p.website)}</a>` : ''}
                    <label class="ma-toggle" style="margin-top:0.5rem;">
                        <input type="checkbox" ${p.is_featured ? 'checked' : ''}
                               onchange="ManageAstegni.togglePartnerFeatured(${p.id}, this.checked, this)">
                        <span>Feature on home page</span>
                    </label>
                </div>
                <div class="ma-card-actions">
                    <button class="ma-icon-btn" title="View" onclick="ManageAstegni.viewPartner(${p.id})"><i class="fas fa-eye"></i></button>
                    <button class="ma-icon-btn danger" title="Reject partnership" onclick="ManageAstegni.rejectPartnership(${p.id})"><i class="fas fa-ban"></i></button>
                    <button class="ma-icon-btn danger" title="Delete" onclick="ManageAstegni.deletePartner(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    },

    async togglePartnerFeatured(id, desired, el) {
        if (el) el.disabled = true;
        const fd = new FormData();
        fd.append('is_featured', desired);
        try {
            await this._send('POST', `/api/admin/partners/${id}/feature`, fd);
            const p = this.partners.find(x => x.id === id);
            if (p) p.is_featured = desired;
            this.renderPartners();
        } catch (err) {
            if (el) el.checked = !desired;
            alert('Failed to update: ' + err.message);
        } finally {
            if (el) el.disabled = false;
        }
    },

    viewPartner(id) {
        const p = this.partners.find(x => x.id === id);
        if (!p) return;
        const body = document.getElementById('detail-body');
        document.querySelector('#detail-modal .modal-header h2').textContent = 'Partner Details';
        const logo = p.logo
            ? `<img src="${this._escape(p.logo)}" alt="" class="ma-avatar-lg" style="border-radius:10px;">`
            : `<div class="ma-avatar-lg ma-logo-placeholder" style="border-radius:10px;"><i class="fas fa-handshake"></i></div>`;
        body.innerHTML = `
            <div class="ma-review-head">
                ${logo}
                <div>
                    <h3 style="margin:0;">${this._escape(p.name)}</h3>
                    <p class="ma-muted" style="margin:0;">
                        ${p.is_featured ? 'Featured' : 'Not featured'} · ${p.is_active ? 'Active' : 'Inactive'}
                    </p>
                </div>
            </div>
            ${p.description ? `<blockquote class="ma-quote" style="margin:1rem 0;">${this._escape(p.description)}</blockquote>` : ''}
            ${p.website ? `<p class="ma-muted"><i class="fas fa-globe"></i> <a href="${this._escape(p.website)}" target="_blank" rel="noopener" class="ma-link">${this._escape(p.website)}</a></p>` : ''}
        `;
        this._show('detail-modal');
    },

    async rejectPartnership(id) {
        const reason = prompt('Reason for ending this partnership (emailed to the partner):', '');
        if (reason === null) return;
        const fd = new FormData();
        fd.append('reason', reason || '');
        try {
            const r = await this._send('POST', `/api/admin/partners/${id}/reject-partnership`, fd);
            await this.loadPartners();
            alert(r.emailed ? `Partnership ended; the partner was emailed at ${r.email}.`
                            : 'Partnership ended. (No email on file or email not configured.)');
        } catch (err) {
            alert('Failed: ' + err.message);
        }
    },

    openPartnerModal(id = null) {
        const f = document.getElementById('partner-form');
        f.reset();
        document.getElementById('partner-id').value = '';
        document.getElementById('partner-active-wrap').style.display = id ? '' : 'none';
        document.getElementById('partner-modal-title').textContent = id ? 'Edit Partner' : 'Add Partner';
        if (id) {
            const p = this.partners.find(x => x.id === id);
            if (p) {
                document.getElementById('partner-id').value = p.id;
                document.getElementById('partner-name').value = p.name || '';
                document.getElementById('partner-website').value = p.website || '';
                document.getElementById('partner-description').value = p.description || '';
                document.getElementById('partner-logo-url').value = '';
                document.getElementById('partner-sort').value = p.sort_order ?? 0;
                document.getElementById('partner-active').checked = !!p.is_active;
            }
        }
        this._show('partner-modal');
    },

    async savePartner(e) {
        e.preventDefault();
        const btn = document.getElementById('partner-save-btn');
        const id = document.getElementById('partner-id').value;
        const fd = new FormData();
        fd.append('name', document.getElementById('partner-name').value);
        fd.append('website', document.getElementById('partner-website').value);
        fd.append('description', document.getElementById('partner-description').value);
        fd.append('sort_order', document.getElementById('partner-sort').value || '0');
        fd.append('logo_url', document.getElementById('partner-logo-url').value);
        const file = document.getElementById('partner-logo-file').files[0];
        if (file) fd.append('logo', file);
        if (id) fd.append('is_active', document.getElementById('partner-active').checked);

        btn.disabled = true; btn.textContent = 'Saving...';
        try {
            if (id) await this._send('PUT', `/api/admin/partners/${id}`, fd);
            else await this._send('POST', '/api/admin/partners', fd);
            this.closeModal('partner-modal');
            await this.loadPartners();
        } catch (err) {
            alert('Failed to save partner: ' + err.message);
        } finally {
            btn.disabled = false; btn.textContent = 'Save Partner';
        }
    },

    async deletePartner(id) {
        if (!confirm('Delete this partner?')) return;
        try {
            await this._send('DELETE', `/api/admin/partners/${id}`);
            await this.loadPartners();
        } catch (err) {
            alert('Failed to delete: ' + err.message);
        }
    },

    // ============================================================
    // FEATURED VIDEOS
    // ============================================================
    async loadVideos() {
        const list = document.getElementById('videos-list');
        try {
            const res = await fetch(`${MA_API}/api/featured-videos?include_inactive=true`);
            const data = await res.json();
            this.videos = data.videos || [];
            this.renderVideos();
        } catch (e) {
            if (list) list.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i> ${this._escape(e.message)}</div>`;
        }
    },

    renderVideos() {
        const list = document.getElementById('videos-list');
        if (!list) return;
        if (!this.videos.length) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-video"></i><div>No featured videos yet. Upload one above.</div></div>';
            return;
        }
        list.innerHTML = this.videos.map(v => {
            const thumb = v.thumbnail_url
                ? `<img src="${this._escape(v.thumbnail_url)}" alt="" class="ma-thumb">`
                : `<div class="ma-thumb ma-logo-placeholder"><i class="fas fa-play-circle"></i></div>`;
            const inactive = v.is_active ? '' : '<span class="ma-badge inactive">Inactive</span>';
            return `
            <div class="ma-card">
                ${thumb}
                <div class="ma-card-body">
                    <h3>${this._escape(v.title)} ${inactive}</h3>
                    <p class="ma-muted">${this._escape(v.description || '')}</p>
                    <span class="ma-badge">${this._escape(v.category || 'all')}</span>
                    ${v.duration ? `<span class="ma-badge">${this._escape(v.duration)}</span>` : ''}
                    <a href="${this._escape(v.video_url)}" target="_blank" rel="noopener" class="ma-link"><i class="fas fa-external-link-alt"></i> Open video</a>
                </div>
                <div class="ma-card-actions">
                    <button class="ma-icon-btn" title="Edit" onclick="ManageAstegni.openVideoModal(${v.id})"><i class="fas fa-edit"></i></button>
                    <button class="ma-icon-btn danger" title="Delete" onclick="ManageAstegni.deleteVideo(${v.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    },

    openVideoModal(id = null) {
        const f = document.getElementById('video-form');
        f.reset();
        document.getElementById('video-id').value = '';
        const editing = !!id;
        document.getElementById('video-active-wrap').style.display = editing ? '' : 'none';
        document.getElementById('video-modal-title').textContent = editing ? 'Edit Featured Video' : 'Upload Featured Video';
        // The video file is immutable on edit; only required when creating.
        const fileInput = document.getElementById('video-file');
        const fileLabel = document.getElementById('video-file-label');
        const thumbInput = document.getElementById('video-thumb');
        fileInput.style.display = editing ? 'none' : '';
        fileLabel.style.display = editing ? 'none' : '';
        thumbInput.parentElement; // no-op for clarity
        document.getElementById('video-thumb').style.display = editing ? 'none' : '';
        if (editing) {
            const v = this.videos.find(x => x.id === id);
            if (v) {
                document.getElementById('video-id').value = v.id;
                document.getElementById('video-title').value = v.title || '';
                document.getElementById('video-description').value = v.description || '';
                document.getElementById('video-category').value = v.category || 'all';
                document.getElementById('video-duration').value = v.duration || '';
                document.getElementById('video-sort').value = v.sort_order ?? 0;
                document.getElementById('video-active').checked = !!v.is_active;
            }
        }
        this._show('video-modal');
    },

    async saveVideo(e) {
        e.preventDefault();
        const btn = document.getElementById('video-save-btn');
        const id = document.getElementById('video-id').value;
        const fd = new FormData();
        fd.append('title', document.getElementById('video-title').value);
        fd.append('description', document.getElementById('video-description').value);
        fd.append('category', document.getElementById('video-category').value);
        fd.append('duration', document.getElementById('video-duration').value);
        fd.append('sort_order', document.getElementById('video-sort').value || '0');

        if (id) {
            fd.append('is_active', document.getElementById('video-active').checked);
        } else {
            const file = document.getElementById('video-file').files[0];
            if (!file) { alert('Please choose a video file to upload.'); return; }
            fd.append('video', file);
            const thumb = document.getElementById('video-thumb').files[0];
            if (thumb) fd.append('thumbnail', thumb);
        }

        btn.disabled = true; btn.textContent = id ? 'Saving...' : 'Uploading...';
        try {
            if (id) await this._send('PUT', `/api/admin/featured-videos/${id}`, fd);
            else await this._send('POST', '/api/admin/featured-videos', fd);
            this.closeModal('video-modal');
            await this.loadVideos();
        } catch (err) {
            alert('Failed to save video: ' + err.message);
        } finally {
            btn.disabled = false; btn.textContent = 'Save Video';
        }
    },

    async deleteVideo(id) {
        if (!confirm('Delete this featured video?')) return;
        try {
            await this._send('DELETE', `/api/admin/featured-videos/${id}`);
            await this.loadVideos();
        } catch (err) {
            alert('Failed to delete: ' + err.message);
        }
    },

    // ============================================================
    // PROFESSIONAL REVIEWS (testimonials)
    // ============================================================
    async loadReviews() {
        const list = document.getElementById('reviews-list');
        try {
            const res = await fetch(`${MA_API}/api/admin/testimonials`, { headers: this._authHeaders() });
            if (res.status === 401 || res.status === 403) {
                if (list) list.innerHTML = `<div class="error-state"><i class="fas fa-lock"></i>
                    <div>Your admin session has expired or lacks access.</div>
                    <button class="btn-primary" style="margin-top:0.75rem" onclick="window.location.href='index.html'">Log in again</button>
                </div>`;
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.reviews = data.testimonials || [];
            this.renderReviews();
        } catch (e) {
            if (list) list.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i> ${this._escape(e.message)}</div>`;
        }
    },

    renderReviews() {
        const list = document.getElementById('reviews-list');
        if (!list) return;
        if (!this.reviews.length) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><div>No reviews yet. Add one above.</div></div>';
            return;
        }
        list.innerHTML = this.reviews.map(r => {
            const avatar = r.avatar_url
                ? `<img src="${this._escape(r.avatar_url)}" alt="" class="ma-avatar">`
                : `<div class="ma-avatar ma-logo-placeholder"><i class="fas fa-user"></i></div>`;
            const stars = '★'.repeat(r.rating || 0);
            const badges = [
                r.is_active ? '' : '<span class="ma-badge inactive">Inactive</span>',
                r.is_verified ? '<span class="ma-badge verified">Verified</span>' : '',
            ].join(' ');
            return `
            <div class="ma-card">
                ${avatar}
                <div class="ma-card-body">
                    <h3>${this._escape(r.reviewer_name)} <span class="ma-stars">${stars}</span></h3>
                    <p class="ma-muted">${this._escape(r.title || '')}${r.organization ? ' · ' + this._escape(r.organization) : ''}</p>
                    <blockquote class="ma-quote">"${this._escape(r.review)}"</blockquote>
                    <div>${badges}</div>
                    <label class="ma-toggle" style="margin-top:0.5rem;">
                        <input type="checkbox" ${r.is_featured ? 'checked' : ''}
                               onchange="ManageAstegni.toggleReviewFeatured(${r.id}, this.checked, this)">
                        <span>Feature on home page</span>
                    </label>
                </div>
                <div class="ma-card-actions">
                    <button class="ma-icon-btn" title="Edit" onclick="ManageAstegni.openReviewModal(${r.id})"><i class="fas fa-edit"></i></button>
                    <button class="ma-icon-btn danger" title="Delete" onclick="ManageAstegni.deleteReview(${r.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    },

    async toggleReviewFeatured(id, desired, el) {
        if (el) el.disabled = true;
        const fd = new FormData();
        fd.append('is_featured', desired);
        try {
            await this._send('POST', `/api/admin/testimonials/${id}/feature`, fd);
            const r = this.reviews.find(x => x.id === id);
            if (r) r.is_featured = desired;
        } catch (err) {
            if (el) el.checked = !desired;  // revert on failure
            alert('Failed to update: ' + err.message);
        } finally {
            if (el) el.disabled = false;
        }
    },

    openReviewModal(id = null) {
        const f = document.getElementById('review-form');
        f.reset();
        document.getElementById('review-id').value = '';
        document.getElementById('review-active-wrap').style.display = id ? '' : 'none';
        document.getElementById('review-modal-title').textContent = id ? 'Edit Professional Review' : 'Add Professional Review';
        if (id) {
            const r = this.reviews.find(x => x.id === id);
            if (r) {
                document.getElementById('review-id').value = r.id;
                document.getElementById('review-name').value = r.reviewer_name || '';
                document.getElementById('review-title').value = r.title || '';
                document.getElementById('review-org').value = r.organization || '';
                document.getElementById('review-expertise').value = r.expertise || '';
                document.getElementById('review-rating').value = String(r.rating || 5);
                document.getElementById('review-text').value = r.review || '';
                document.getElementById('review-avatar-url').value = '';
                document.getElementById('review-verified').checked = !!r.is_verified;
                document.getElementById('review-featured').checked = !!r.is_featured;
                document.getElementById('review-active').checked = !!r.is_active;
                document.getElementById('review-sort').value = r.sort_order ?? 0;
            }
        }
        this._show('review-modal');
    },

    async saveReview(e) {
        e.preventDefault();
        const btn = document.getElementById('review-save-btn');
        const id = document.getElementById('review-id').value;
        const fd = new FormData();
        fd.append('reviewer_name', document.getElementById('review-name').value);
        fd.append('title', document.getElementById('review-title').value);
        fd.append('organization', document.getElementById('review-org').value);
        fd.append('expertise', document.getElementById('review-expertise').value);
        fd.append('review', document.getElementById('review-text').value);
        fd.append('rating', document.getElementById('review-rating').value);
        fd.append('is_verified', document.getElementById('review-verified').checked);
        fd.append('is_featured', document.getElementById('review-featured').checked);
        fd.append('sort_order', document.getElementById('review-sort').value || '0');
        fd.append('avatar_url', document.getElementById('review-avatar-url').value);
        const file = document.getElementById('review-avatar-file').files[0];
        if (file) fd.append('avatar', file);
        if (id) fd.append('is_active', document.getElementById('review-active').checked);

        btn.disabled = true; btn.textContent = 'Saving...';
        try {
            if (id) await this._send('PUT', `/api/admin/testimonials/${id}`, fd);
            else await this._send('POST', '/api/admin/testimonials', fd);
            this.closeModal('review-modal');
            await this.loadReviews();
        } catch (err) {
            alert('Failed to save review: ' + err.message);
        } finally {
            btn.disabled = false; btn.textContent = 'Save Review';
        }
    },

    async deleteReview(id) {
        if (!confirm('Delete this review?')) return;
        try {
            await this._send('DELETE', `/api/admin/testimonials/${id}`);
            await this.loadReviews();
        } catch (err) {
            alert('Failed to delete: ' + err.message);
        }
    },

    // ============================================================
    // PARTNER APPLICATIONS (partner_requests submitted on index.html)
    // ============================================================
    async loadApplications() {
        const list = document.getElementById('applications-list');
        const status = document.getElementById('applications-filter')?.value || 'pending';
        try {
            const res = await fetch(`${MA_API}/api/admin/partner-applications?status=${encodeURIComponent(status)}`,
                { headers: this._authHeaders() });
            if (this._handleAuth(res, 'applications-list')) return;
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.applications = data.applications || [];
            this.renderApplications();
        } catch (e) {
            if (list) list.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i> ${this._escape(e.message)}</div>`;
        }
    },

    renderApplications() {
        const list = document.getElementById('applications-list');
        if (!list) return;
        if (!this.applications.length) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><div>No applications for this filter.</div></div>';
            return;
        }
        list.innerHTML = this.applications.map(a => {
            const emails = (a.emails || []).map(e => this._escape(e)).join(', ');
            const phones = (a.phones || []).map(p => this._escape(p)).join(', ');
            const statusBadge = `<span class="ma-badge ${a.status === 'approved' ? 'verified' : a.status === 'rejected' ? 'inactive' : ''}">${this._escape(a.status)}</span>`;
            const kyc = a.kyc_verification_status || a.kyc_status || 'pending';
            const kycPassed = (kyc === 'passed');
            const kycBadge = `<span class="ma-badge ${kycPassed ? 'verified' : 'inactive'}" title="Identity KYC">KYC: ${this._escape(kyc)}</span>`;
            const isPending = a.status === 'pending';
            const logo = a.logo_url
                ? `<img src="${this._escape(a.logo_url)}" alt="" class="ma-logo">`
                : `<div class="ma-logo ma-logo-placeholder"><i class="fas fa-handshake"></i></div>`;
            // Approve/Reject are only available once identity KYC has passed.
            const reviewActions = !isPending ? '' : (kycPassed ? `
                    <button class="ma-icon-btn" title="Approve &amp; publish as partner" onclick="ManageAstegni.approveApplication(${a.id})"><i class="fas fa-check"></i></button>
                    <button class="ma-icon-btn danger" title="Reject" onclick="ManageAstegni.rejectApplication(${a.id})"><i class="fas fa-times"></i></button>
                ` : `
                    <button class="ma-icon-btn" disabled title="Locked until identity KYC passes" style="opacity:.4;cursor:not-allowed;"><i class="fas fa-check"></i></button>
                    <button class="ma-icon-btn danger" disabled title="Locked until identity KYC passes" style="opacity:.4;cursor:not-allowed;"><i class="fas fa-times"></i></button>
                `);
            return `
            <div class="ma-card">
                ${logo}
                <div class="ma-card-body">
                    <h3>${this._escape(a.company_name || 'Unnamed')} ${statusBadge} ${kycBadge}</h3>
                    <p class="ma-muted"><i class="fas fa-user"></i> ${this._escape(a.applicant_name || a.contact_person || '')}</p>
                    <p class="ma-muted">${this._escape(a.partnership_type || '')}${a.partnership_type_category ? ' · ' + this._escape(a.partnership_type_category) : ''}</p>
                    ${emails ? `<p class="ma-muted"><i class="fas fa-envelope"></i> ${emails}</p>` : ''}
                    ${isPending && !kycPassed ? `<p class="ma-muted" style="color:#b45309;"><i class="fas fa-lock"></i> Awaiting identity verification — can't approve or reject yet.</p>` : ''}
                    ${a.admin_notes ? `<p class="ma-muted"><em>Note: ${this._escape(a.admin_notes)}</em></p>` : ''}
                </div>
                <div class="ma-card-actions">
                    <button class="ma-icon-btn" title="View details" onclick="ManageAstegni.viewApplication(${a.id})"><i class="fas fa-eye"></i></button>
                    ${reviewActions}
                </div>
            </div>`;
        }).join('');
    },

    viewApplication(id) {
        const a = this.applications.find(x => x.id === id);
        if (!a) return;
        const body = document.getElementById('detail-body');
        document.querySelector('#detail-modal .modal-header h2').textContent = 'Application Details';
        const link = (label, url) => url
            ? `<p class="ma-muted"><i class="fas fa-paperclip"></i> <a href="${this._escape(url)}" target="_blank" rel="noopener" class="ma-link">${label}</a></p>` : '';
        const kyc = a.kyc_verification_status || a.kyc_status || 'pending';
        const logo = a.logo_url
            ? `<img src="${this._escape(a.logo_url)}" alt="" class="ma-avatar-lg" style="border-radius:10px;">`
            : `<div class="ma-avatar-lg ma-logo-placeholder" style="border-radius:10px;"><i class="fas fa-handshake"></i></div>`;
        body.innerHTML = `
            <div class="ma-review-head">
                ${logo}
                <div>
                    <h3 style="margin:0;">${this._escape(a.company_name || 'Unnamed')}</h3>
                    <p class="ma-muted" style="margin:0;">${this._escape(a.partnership_type || '')} · Status: ${this._escape(a.status)}</p>
                </div>
            </div>
            <div class="ma-subratings" style="grid-template-columns:1fr;">
                <div class="ma-subrating"><span>Applicant</span><b>${this._escape(a.applicant_name || a.contact_person || '—')}</b></div>
                <div class="ma-subrating"><span>Date of birth</span><b>${this._escape(a.date_of_birth || '—')}</b></div>
                <div class="ma-subrating"><span>Personal email</span><b>${this._escape(a.personal_email || '—')}</b></div>
                <div class="ma-subrating"><span>Identity KYC</span><b>${this._escape(kyc)}</b></div>
                ${a.face_match_passed != null ? `<div class="ma-subrating"><span>Face match</span><b>${a.face_match_passed ? 'Passed' : 'Failed'}</b></div>` : ''}
            </div>
            <p class="ma-muted"><i class="fas fa-envelope"></i> ${(a.emails || []).map(e => this._escape(e)).join(', ')}</p>
            <p class="ma-muted"><i class="fas fa-phone"></i> ${(a.phones || []).map(p => this._escape(p)).join(', ')}</p>
            ${a.website ? `<p class="ma-muted"><i class="fas fa-globe"></i> <a href="${this._escape(a.website)}" target="_blank" rel="noopener" class="ma-link">${this._escape(a.website)}</a></p>` : ''}
            ${a.social_link ? `<p class="ma-muted"><i class="fas fa-hashtag"></i> <a href="${this._escape(a.social_link)}" target="_blank" rel="noopener" class="ma-link">${this._escape(a.social_link)}</a></p>` : ''}
            ${a.description ? `<blockquote class="ma-quote" style="margin:0.75rem 0;">${this._escape(a.description)}</blockquote>` : ''}
            ${link('Proposal document', a.proposal_file_path)}
            ${link('Business ownership proof', a.ownership_proof_url)}
            ${link('ID document image', a.document_image_url)}
            ${link('Selfie image', a.selfie_image_url)}
        `;
        this._show('detail-modal');
    },

    async approveApplication(id) {
        if (!confirm('Approve this application and publish it as a partner? The applicant will be emailed.')) return;
        try {
            const r = await this._send('POST', `/api/admin/partner-applications/${id}/approve`, new FormData());
            await this.loadApplications();
            await this.loadPartners();
            alert(r.emailed ? `Approved and added to Partners. Applicant emailed at ${r.email}.`
                            : 'Approved and added to Partners. (Email not sent — none on file or email not configured.)');
        } catch (err) {
            alert('Failed to approve: ' + err.message);
        }
    },

    async rejectApplication(id) {
        const reason = prompt('Reason for rejecting (emailed to the applicant):', '');
        if (reason === null) return;
        const fd = new FormData();
        fd.append('admin_notes', reason || '');
        try {
            const r = await this._send('POST', `/api/admin/partner-applications/${id}/reject`, fd);
            await this.loadApplications();
            alert(r.emailed ? `Rejected; the applicant was emailed at ${r.email}.`
                            : 'Rejected. (Email not sent — none on file or email not configured.)');
        } catch (err) {
            alert('Failed to reject: ' + err.message);
        }
    },

    // ============================================================
    // TESTIMONIALS — real user reviews of Astegni (astegni_reviews)
    // ============================================================
    async loadUserReviews() {
        const list = document.getElementById('user-reviews-list');
        const featuredOnly = (document.getElementById('testimonials-filter')?.value === 'featured');
        try {
            const res = await fetch(`${MA_API}/api/admin/user-reviews?featured_only=${featuredOnly}`,
                { headers: this._authHeaders() });
            if (this._handleAuth(res, 'user-reviews-list')) return;
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.userReviews = data.reviews || [];
            this.renderUserReviews();
        } catch (e) {
            if (list) list.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i> ${this._escape(e.message)}</div>`;
        }
    },

    renderUserReviews() {
        const list = document.getElementById('user-reviews-list');
        if (!list) return;
        if (!this.userReviews.length) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-comment-dots"></i><div>No user reviews yet.</div></div>';
            return;
        }
        list.innerHTML = this.userReviews.map(r => {
            const stars = '★'.repeat(Math.round(r.rating || 0));
            const featured = r.is_featured ? '<span class="ma-badge featured">Featured</span>' : '';
            const text = r.review_text ? this._escape(r.review_text) : '<em class="ma-muted">No written review</em>';
            return `
            <div class="ma-card">
                <img src="${this._escape(r.profile_picture)}" alt="" class="ma-avatar">
                <div class="ma-card-body">
                    <h3>${this._escape(r.name)} <span class="ma-stars">${stars}</span> ${featured}</h3>
                    <p class="ma-muted">${this._escape(r.role || 'User')}</p>
                    <blockquote class="ma-quote">${text}</blockquote>
                </div>
                <div class="ma-card-actions">
                    <button class="ma-icon-btn" title="View" onclick="ManageAstegni.openUserReview(${r.id})"><i class="fas fa-eye"></i></button>
                </div>
            </div>`;
        }).join('');
    },

    openUserReview(id) {
        const r = (this.userReviews || []).find(x => x.id === id);
        if (!r) return;
        this.currentUserReview = r;
        const body = document.getElementById('user-review-body');
        const stars = '★'.repeat(Math.round(r.rating || 0)) + '☆'.repeat(5 - Math.round(r.rating || 0));
        const sub = (label, val) => val == null ? '' :
            `<div class="ma-subrating"><span>${label}</span><b>${val}/5</b></div>`;
        body.innerHTML = `
            <div class="ma-review-head">
                <img src="${this._escape(r.profile_picture)}" alt="" class="ma-avatar-lg">
                <div>
                    <h3 style="margin:0;">${this._escape(r.name)}</h3>
                    <p class="ma-muted" style="margin:0;">${this._escape(r.role || 'User')}</p>
                    <div class="ma-stars" style="font-size:1.1rem;">${stars} <span class="ma-muted">(${r.rating ?? '—'})</span></div>
                </div>
            </div>
            <blockquote class="ma-quote" style="margin:1rem 0;">${r.review_text ? this._escape(r.review_text) : '<em>No written review.</em>'}</blockquote>
            <div class="ma-subratings">
                ${sub('Ease of use', r.ease_of_use)}
                ${sub('Features', r.features_quality)}
                ${sub('Support', r.support_quality)}
                ${sub('Pricing', r.pricing)}
            </div>
            ${r.would_recommend != null ? `<p class="ma-muted">Would recommend: <b>${r.would_recommend ? 'Yes' : 'No'}</b></p>` : ''}
        `;
        const toggle = document.getElementById('user-review-featured-toggle');
        if (toggle) { toggle.checked = !!r.is_featured; toggle.disabled = false; }
        this._show('user-review-modal');
    },

    async toggleUserReviewFeatured() {
        const r = this.currentUserReview;
        const toggle = document.getElementById('user-review-featured-toggle');
        if (!r || !toggle) return;
        const desired = toggle.checked;
        toggle.disabled = true;
        const fd = new FormData();
        fd.append('is_featured', desired);
        try {
            await this._send('POST', `/api/admin/user-reviews/${r.id}/feature`, fd);
            r.is_featured = desired;
            this.renderUserReviews();
        } catch (err) {
            toggle.checked = !desired;  // revert on failure
            alert('Failed to update: ' + err.message);
        } finally {
            toggle.disabled = false;
        }
    },

    // ---- modal helpers ----
    _show(id) { document.getElementById(id)?.classList.remove('hidden'); },
    closeModal(id) { document.getElementById(id)?.classList.add('hidden'); },
};

window.ManageAstegni = ManageAstegni;
document.addEventListener('DOMContentLoaded', () => ManageAstegni.init());
