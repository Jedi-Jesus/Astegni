/**
 * Manage Payments — admin verification of advertiser advance-payment receipts.
 * Talks to /api/manage-payments/* (department-gated to manage-payments).
 */
const ManagePayments = {
    apiBase: (typeof window !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : 'http://localhost:8000',
    status: 'pending',

    getAdminId() {
        try {
            const adminUser = localStorage.getItem('adminUser');
            if (adminUser) {
                const u = JSON.parse(adminUser);
                if (u && u.id) return u.id;
            }
            const a = localStorage.getItem('admin_id') || sessionStorage.getItem('admin_id');
            return a ? parseInt(a, 10) : null;
        } catch (_) { return null; }
    },

    _adminParam() {
        const id = this.getAdminId();
        return id ? `admin_id=${encodeURIComponent(id)}` : '';
    },

    async init() {
        await this.loadCounts();
        await this.loadPayments();
    },

    switchTab(status) {
        this.status = status;
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.toggle('active', t.dataset.status === status);
        });
        this.loadPayments();
    },

    async loadCounts() {
        try {
            const q = this._adminParam();
            const resp = await fetch(`${this.apiBase}/api/manage-payments/counts${q ? '?' + q : ''}`);
            if (resp.status === 403) { this.showAccessDenied(); return; }
            const data = await resp.json();
            const c = (data && data.counts) || {};
            this.setText('stat-pending', c.pending || 0);
            this.setText('stat-verified', c.verified || 0);
            this.setText('stat-rejected', c.rejected || 0);
            this.setText('stat-total', c.total || 0);
        } catch (e) {
            console.error('[ManagePayments] counts error:', e);
        }
    },

    async loadPayments() {
        const body = document.getElementById('payments-body');
        if (body) body.innerHTML = '<tr><td colspan="7" class="loading"><i class="fas fa-spinner fa-spin"></i> Loading…</td></tr>';
        try {
            const params = [];
            if (this.status && this.status !== 'all') params.push(`status=${encodeURIComponent(this.status)}`);
            const ap = this._adminParam();
            if (ap) params.push(ap);
            const resp = await fetch(`${this.apiBase}/api/manage-payments/payments${params.length ? '?' + params.join('&') : ''}`);
            if (resp.status === 403) { this.showAccessDenied(); return; }
            const data = await resp.json();
            this.renderRows((data && data.payments) || []);
        } catch (e) {
            console.error('[ManagePayments] list error:', e);
            if (body) body.innerHTML = '<tr><td colspan="7" class="empty">Failed to load payments.</td></tr>';
        }
    },

    renderRows(payments) {
        const body = document.getElementById('payments-body');
        if (!body) return;
        if (!payments.length) {
            body.innerHTML = '<tr><td colspan="7" class="empty">No payments in this view.</td></tr>';
            return;
        }
        body.innerHTML = payments.map(p => {
            const amount = (p.amount != null) ? `${Number(p.amount).toLocaleString()} ETB` : '—';
            const updated = p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '—';
            const isPending = p.status === 'pending';
            const receiptBtn = p.receipt_url
                ? `<a class="btn btn-view" href="${p.receipt_url}" target="_blank" rel="noopener"><i class="fas fa-file-invoice"></i> Receipt</a>`
                : `<span class="muted">no receipt</span>`;
            return `
                <tr>
                    <td>${this.esc(p.campaign_name) || 'CMP-' + p.campaign_id}<div class="muted">CMP-${p.campaign_id}</div></td>
                    <td>${this.esc(p.brand_name) || '—'}</td>
                    <td>${this.esc(p.advertiser_name) || '—'}<div class="muted">${this.esc(p.advertiser_email) || ''}</div></td>
                    <td>${amount}</td>
                    <td><span class="badge ${p.status}">${p.status}</span></td>
                    <td>${updated}</td>
                    <td><div class="actions">
                        ${receiptBtn}
                        <button class="btn btn-verify" onclick="ManagePayments.verify(${p.campaign_id})" ${isPending ? '' : 'disabled'}><i class="fas fa-check"></i> Verify</button>
                        <button class="btn btn-reject" onclick="ManagePayments.reject(${p.campaign_id})" ${isPending ? '' : 'disabled'}><i class="fas fa-times"></i> Reject</button>
                    </div></td>
                </tr>`;
        }).join('');
    },

    async _update(campaignId, newStatus, reason) {
        try {
            const resp = await fetch(`${this.apiBase}/api/manage-payments/payments/${campaignId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_status: newStatus, reason: reason || null, admin_id: this.getAdminId() }),
            });
            if (resp.ok) {
                await this.loadCounts();
                await this.loadPayments();
            } else {
                const e = await resp.json().catch(() => ({}));
                alert(`Failed: ${e.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('[ManagePayments] update error:', err);
            alert('An error occurred while updating the payment.');
        }
    },

    verify(campaignId) {
        if (!confirm('Verify this advance payment? The advertiser will then be able to upload their ad.')) return;
        this._update(campaignId, 'verified', null);
    },

    reject(campaignId) {
        const reason = prompt('Reason for rejecting this payment:');
        if (!reason) return;
        this._update(campaignId, 'rejected', reason);
    },

    showAccessDenied() {
        const denied = document.getElementById('access-denied');
        const main = document.getElementById('main');
        if (denied) denied.style.display = 'block';
        if (main) main.style.display = 'none';
    },

    setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; },
    esc(s) { return s == null ? '' : String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },
};

document.addEventListener('DOMContentLoaded', () => ManagePayments.init());
window.ManagePayments = ManagePayments;
