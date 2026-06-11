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

    payments: [],

    async loadPayments() {
        const body = document.getElementById('payments-body');
        if (body) body.innerHTML = '<tr><td colspan="6" class="mp-loading"><i class="fas fa-spinner fa-spin"></i> Loading…</td></tr>';
        try {
            const params = [];
            if (this.status && this.status !== 'all') params.push(`status=${encodeURIComponent(this.status)}`);
            const ap = this._adminParam();
            if (ap) params.push(ap);
            const resp = await fetch(`${this.apiBase}/api/manage-payments/payments${params.length ? '?' + params.join('&') : ''}`);
            if (resp.status === 403) { this.showAccessDenied(); return; }
            const data = await resp.json();
            this.payments = (data && data.payments) || [];
            this.renderRows(this.payments);
        } catch (e) {
            console.error('[ManagePayments] list error:', e);
            if (body) body.innerHTML = '<tr><td colspan="6" class="mp-empty"><i class="fas fa-triangle-exclamation"></i> Failed to load payments.</td></tr>';
        }
    },

    renderRows(payments) {
        const body = document.getElementById('payments-body');
        if (!body) return;
        if (!payments.length) {
            body.innerHTML = '<tr><td colspan="6" class="mp-empty"><i class="fas fa-inbox"></i> No payments in this view.</td></tr>';
            return;
        }
        const statusIcon = { pending: 'fa-clock', verified: 'fa-check', rejected: 'fa-times' };
        body.innerHTML = payments.map(p => {
            return `
                <tr>
                    <td><span class="mp-primary">${this.esc(p.campaign_name) || 'CMP-' + p.campaign_id}</span><div class="mp-muted">CMP-${p.campaign_id}</div></td>
                    <td>${this.esc(p.company_name) || '<span class="mp-muted">—</span>'}</td>
                    <td>${this.esc(p.brand_name) || '<span class="mp-muted">—</span>'}</td>
                    <td>${this.esc(p.advertiser_name) || '—'}<div class="mp-muted">${this.esc(p.advertiser_email) || ''}</div></td>
                    <td><span class="mp-badge ${p.status}"><i class="fas ${statusIcon[p.status] || 'fa-circle'}"></i> ${p.status}</span></td>
                    <td><div class="mp-actions">
                        <button class="mp-btn mp-btn-view" onclick="ManagePayments.openDetail(${p.campaign_id})"><i class="fas fa-eye"></i> View</button>
                    </div></td>
                </tr>`;
        }).join('');
    },

    // ---------- Detail modal ----------

    async fetchPayment(campaignId) {
        try {
            const ap = this._adminParam();
            const resp = await fetch(`${this.apiBase}/api/manage-payments/payments${ap ? '?' + ap : ''}`);
            if (!resp.ok) return null;
            const data = await resp.json();
            return ((data && data.payments) || []).find(x => x.campaign_id === campaignId) || null;
        } catch (_) { return null; }
    },

    async openDetail(campaignId) {
        let p = this.payments.find(x => x.campaign_id === campaignId);
        // After a verify/reject the payment may have left the current tab's list,
        // so it's no longer cached. Fetch it directly (status-agnostic) as a fallback.
        if (!p) p = await this.fetchPayment(campaignId);
        if (!p) return;
        const money = (v) => (v != null) ? `${Number(v).toLocaleString()} ETB` : '—';
        const isPending = p.status === 'pending';
        const statusBadge = `<span class="mp-badge ${p.status}">${p.status}</span>`;

        const row = (label, value) => `
            <div style="display:flex; gap:1rem; padding:.55rem 0; border-bottom:1px solid var(--border-color,#f1f3f5);">
                <div style="flex:0 0 42%; color:var(--text-muted,#6b7280); font-weight:600; font-size:.85rem;">${label}</div>
                <div style="flex:1; font-weight:600;">${value}</div>
            </div>`;

        // Booked package summary (views @ CPI = budget)
        let pkg = '—';
        if (p.planned_views != null || p.cpi_rate != null) {
            const views = p.planned_views != null ? Number(p.planned_views).toLocaleString() : '—';
            const cpi = p.cpi_rate != null ? `${Number(p.cpi_rate).toLocaleString()} ETB` : '—';
            pkg = `${views} views @ ${cpi} CPI${p.campaign_budget != null ? ` = ${money(p.campaign_budget)}` : ''}`;
        }

        const receiptBlock = p.receipt_url
            ? `<a href="${p.receipt_url}" target="_blank" rel="noopener" class="mp-btn mp-btn-view" style="display:inline-flex;"><i class="fas fa-file-invoice"></i> Open Receipt</a>`
            : `<span class="mp-muted">No receipt uploaded</span>`;

        // Advertiser invoice: admins upload it ONCE the payment is verified.
        const verified = p.status === 'verified';
        const existingInvoice = p.admin_invoice_url
            ? `<a href="${p.admin_invoice_url}" target="_blank" rel="noopener" class="mp-btn mp-btn-view" style="display:inline-flex; margin-right:.5rem;"><i class="fas fa-file-pdf"></i> View Invoice</a>`
            : '';
        let invoiceBlock;
        if (!verified) {
            invoiceBlock = `<span class="mp-muted">Available after the payment is verified.</span>`;
        } else {
            invoiceBlock = `
                <div style="display:flex; align-items:center; gap:.5rem; flex-wrap:wrap;">
                    ${existingInvoice}
                    <input type="file" id="mp-invoice-file" accept="image/*,application/pdf" style="font-size:.8rem; max-width:230px;">
                    <button class="mp-btn mp-btn-verify" onclick="ManagePayments.uploadInvoice(${p.campaign_id})">
                        <i class="fas fa-upload"></i> ${p.admin_invoice_url ? 'Replace' : 'Upload'} Invoice
                    </button>
                    <span id="mp-invoice-status" class="mp-muted"></span>
                </div>`;
        }

        // Remaining-balance settlement invoice (the second payment). Auto-issued
        // when the advance is verified. The manual button only appears as a
        // fallback for payments verified before auto-issue existed.
        let settlementBlock;
        if (!verified) {
            settlementBlock = `<span class="mp-muted">Auto-issued when the advance is verified.</span>`;
        } else if (p.settlement_invoice_id) {
            settlementBlock = `
                <div style="display:flex; align-items:center; gap:.5rem; flex-wrap:wrap;">
                    <span class="mp-badge ${p.settlement_status === 'verified' || p.settlement_status === 'paid' ? 'verified' : 'pending'}">${p.settlement_status || 'pending'}</span>
                    <span>${money(p.settlement_amount)}</span>
                    <span class="mp-muted">${this.esc(p.settlement_invoice_number || '')}</span>
                </div>`;
        } else {
            const remaining = (p.campaign_budget != null && p.amount != null) ? (p.campaign_budget - p.amount) : null;
            settlementBlock = `
                <div style="display:flex; align-items:center; gap:.5rem; flex-wrap:wrap;">
                    <button class="mp-btn mp-btn-verify" onclick="ManagePayments.issueSettlement(${p.campaign_id})">
                        <i class="fas fa-file-invoice-dollar"></i> Issue settlement invoice${remaining != null ? ` (${money(remaining)})` : ''}
                    </button>
                    <span id="mp-settlement-status" class="mp-muted"></span>
                </div>`;
        }

        document.getElementById('payment-detail-body').innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; flex-wrap:wrap; gap:.5rem;">
                <div>
                    <div style="font-size:1.15rem; font-weight:800;">${this.esc(p.campaign_name) || ('CMP-' + p.campaign_id)}</div>
                    <div class="mp-muted">CMP-${p.campaign_id} · Invoice ${this.esc(p.invoice_number || '')}</div>
                </div>
                ${statusBadge}
            </div>

            ${row('Company', this.esc(p.company_name) || '—')}
            ${row('Brand', this.esc(p.brand_name) || '—')}
            ${row('Advertiser', (this.esc(p.advertiser_name) || '—') + (p.advertiser_email ? `<div class="mp-muted">${this.esc(p.advertiser_email)}</div>` : ''))}
            ${row('Objective', this.esc(p.objective) || '—')}
            ${row('Description', this.esc(p.description) || '<span class="mp-muted">—</span>')}
            ${row('Target location', this.esc(p.target_location) || '—')}
            ${row('Call to action', this.esc(p.call_to_action) || '—')}
            ${row('Start date', p.start_date ? new Date(p.start_date).toLocaleDateString() : '—')}
            ${row('📦 Booked package', pkg)}
            ${row('Advance due', money(p.amount) + (p.deposit_percent != null ? ` (${p.deposit_percent}%)` : ''))}
            ${row('🏦 Paid to', this.esc(p.paid_to_bank) || '<span class="mp-muted">not specified</span>')}
            ${row('Receipt', receiptBlock)}
            ${row('🧾 Advertiser invoice', invoiceBlock)}
            ${row('💵 Settlement (remaining)', settlementBlock)}
            ${row('Updated', p.updated_at ? new Date(p.updated_at).toLocaleString() : '—')}

            <div style="display:flex; gap:.6rem; margin-top:1.5rem;">
                <button class="mp-btn mp-btn-verify" style="flex:1; justify-content:center; padding:.7rem;"
                        onclick="ManagePayments.verify(${p.campaign_id})" ${isPending ? '' : 'disabled'}>
                    <i class="fas fa-check"></i> Verify Payment
                </button>
                <button class="mp-btn mp-btn-reject" style="flex:1; justify-content:center; padding:.7rem;"
                        onclick="ManagePayments.reject(${p.campaign_id})" ${isPending ? '' : 'disabled'}>
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
            ${!isPending ? `<p class="mp-muted" style="text-align:center; margin-top:.75rem;">This payment is already ${p.status}.</p>` : ''}
        `;
        document.getElementById('payment-detail-overlay').style.display = 'flex';
    },

    closeDetail() {
        const o = document.getElementById('payment-detail-overlay');
        if (o) o.style.display = 'none';
    },

    async uploadInvoice(campaignId) {
        const input = document.getElementById('mp-invoice-file');
        const statusEl = document.getElementById('mp-invoice-status');
        const file = input && input.files && input.files[0];
        if (!file) { if (statusEl) statusEl.textContent = 'Choose a file first.'; return; }
        if (statusEl) statusEl.textContent = 'Uploading…';
        try {
            const fd = new FormData();
            fd.append('file', file);
            const adminId = this.getAdminId();
            if (adminId) fd.append('admin_id', adminId);
            const resp = await fetch(`${this.apiBase}/api/manage-payments/payments/${campaignId}/invoice`, {
                method: 'POST', body: fd,
            });
            const data = await resp.json().catch(() => ({}));
            if (resp.ok) {
                if (statusEl) statusEl.textContent = 'Uploaded ✓';
                await this.loadPayments();
                await this.openDetail(campaignId);   // re-render with the new invoice link
            } else {
                if (statusEl) statusEl.textContent = '';
                alert(`Failed: ${data.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('[ManagePayments] invoice upload error:', err);
            if (statusEl) statusEl.textContent = '';
            alert('An error occurred while uploading the invoice.');
        }
    },

    async issueSettlement(campaignId) {
        if (!confirm('Issue the remaining-balance settlement invoice for this campaign?')) return;
        const statusEl = document.getElementById('mp-settlement-status');
        if (statusEl) statusEl.textContent = 'Issuing…';
        try {
            const resp = await fetch(`${this.apiBase}/api/manage-payments/payments/${campaignId}/settlement-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_id: this.getAdminId() }),
            });
            const data = await resp.json().catch(() => ({}));
            if (resp.ok) {
                await this.loadPayments();
                await this.openDetail(campaignId);
            } else {
                if (statusEl) statusEl.textContent = '';
                alert(`Failed: ${data.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('[ManagePayments] settlement error:', err);
            if (statusEl) statusEl.textContent = '';
            alert('An error occurred while issuing the settlement invoice.');
        }
    },

    async _update(campaignId, newStatus, reason, keepOpen) {
        try {
            const resp = await fetch(`${this.apiBase}/api/manage-payments/payments/${campaignId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_status: newStatus, reason: reason || null, admin_id: this.getAdminId() }),
            });
            if (resp.ok) {
                await this.loadCounts();
                await this.loadPayments();
                // On verify, keep the modal open and re-render so the invoice-upload
                // control (only shown for verified payments) appears immediately.
                if (keepOpen && document.getElementById('payment-detail-overlay')?.style.display !== 'none') {
                    await this.openDetail(campaignId);
                } else {
                    this.closeDetail();
                }
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
        if (!confirm('Verify this advance payment? You can then upload the advertiser invoice, and the advertiser can upload their ad.')) return;
        this._update(campaignId, 'verified', null, true);
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
