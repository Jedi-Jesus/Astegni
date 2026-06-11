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

    // Lifecycle stage + sub-filter state.
    //   stage: 'pending' | 'advance' (advance verified) | 'full' (fully verified) | 'rejected' | 'all'
    //   settleFilter (only within 'advance'): 'all' | 'submitted' | 'unsubmitted'
    stage: 'pending',
    settleFilter: 'all',

    async init() {
        await this.loadPayments();   // loads all rows, then renders the active stage
    },

    // Derive a payment's lifecycle stage from the advance + settlement statuses.
    stageOf(p) {
        if (p.status === 'rejected') return 'rejected';
        if (p.status !== 'verified') return 'pending';
        // Advance is verified. Fully verified once the settlement is verified/paid.
        if (p.settlement_status === 'verified' || p.settlement_status === 'paid') return 'full';
        return 'advance';
    },

    // Has the advertiser submitted a settlement receipt yet? (only within 'advance')
    settlementSubmitted(p) {
        return !!p.settlement_receipt_url;
    },

    switchTab(stage) {
        this.stage = stage;
        if (stage !== 'advance') this.settleFilter = 'all';
        document.querySelectorAll('.mp-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.status === stage);
        });
        this.render();
    },

    switchSettleFilter(f) {
        this.settleFilter = f;
        document.querySelectorAll('.mp-subtab').forEach(t => {
            t.classList.toggle('active', t.dataset.sub === f);
        });
        this.render();
    },

    updateCounts() {
        const all = this.payments || [];
        const c = { pending: 0, advance: 0, full: 0, rejected: 0 };
        all.forEach(p => { const s = this.stageOf(p); if (c[s] != null) c[s]++; });
        this.setText('stat-pending', c.pending);
        this.setText('stat-advance', c.advance);
        this.setText('stat-full', c.full);
        this.setText('stat-rejected', c.rejected);
        this.setText('stat-total', all.length);
        // Sub-filter counts within the advance-verified stage.
        const adv = all.filter(p => this.stageOf(p) === 'advance');
        const sub = adv.filter(p => this.settlementSubmitted(p)).length;
        this.setText('sub-submitted-count', sub);
        this.setText('sub-unsubmitted-count', adv.length - sub);
    },

    payments: [],

    // Always fetch every row; staging/filtering is derived client-side.
    async loadPayments() {
        const body = document.getElementById('payments-body');
        if (body) body.innerHTML = '<tr><td colspan="7" class="mp-loading"><i class="fas fa-spinner fa-spin"></i> Loading…</td></tr>';
        try {
            const ap = this._adminParam();
            const resp = await fetch(`${this.apiBase}/api/manage-payments/payments?limit=500${ap ? '&' + ap : ''}`);
            if (resp.status === 403) { this.showAccessDenied(); return; }
            const data = await resp.json();
            this.payments = (data && data.payments) || [];
            this.updateCounts();
            this.render();
        } catch (e) {
            console.error('[ManagePayments] list error:', e);
            if (body) body.innerHTML = '<tr><td colspan="7" class="mp-empty"><i class="fas fa-triangle-exclamation"></i> Failed to load payments.</td></tr>';
        }
    },

    // Apply the active stage + settlement sub-filter, then render rows.
    render() {
        let rows = this.payments.filter(p => this.stage === 'all' || this.stageOf(p) === this.stage);
        if (this.stage === 'advance' && this.settleFilter !== 'all') {
            const wantSubmitted = this.settleFilter === 'submitted';
            rows = rows.filter(p => this.settlementSubmitted(p) === wantSubmitted);
        }
        // The Submitted/Unsubmitted sub-tabs only make sense in the advance stage.
        const subBar = document.getElementById('mp-subtabs');
        if (subBar) subBar.style.display = (this.stage === 'advance') ? 'flex' : 'none';
        this.renderRows(rows);
    },

    renderRows(payments) {
        const body = document.getElementById('payments-body');
        if (!body) return;
        if (!payments.length) {
            body.innerHTML = '<tr><td colspan="7" class="mp-empty"><i class="fas fa-inbox"></i> No payments in this view.</td></tr>';
            return;
        }
        // Stage badge (lifecycle): pending → advance verified → fully verified / rejected.
        const stageBadge = {
            pending:  '<span class="mp-badge pending"><i class="fas fa-clock"></i> Pending</span>',
            advance:  '<span class="mp-badge advance"><i class="fas fa-check"></i> Advance verified</span>',
            full:     '<span class="mp-badge verified"><i class="fas fa-check-double"></i> Fully verified</span>',
            rejected: '<span class="mp-badge rejected"><i class="fas fa-times"></i> Rejected</span>',
        };
        body.innerHTML = payments.map(p => {
            const stage = this.stageOf(p);
            // Settlement column: surfaces the second-payment state once the advance
            // is verified — Unsubmitted / Submitted (awaiting verify) / Verified.
            let settleCell;
            if (stage === 'pending' || stage === 'rejected') {
                settleCell = '<span class="mp-muted">—</span>';
            } else if (stage === 'full') {
                settleCell = '<span class="mp-badge verified"><i class="fas fa-check"></i> Verified</span>';
            } else if (this.settlementSubmitted(p)) {
                settleCell = '<span class="mp-badge pending"><i class="fas fa-inbox"></i> Submitted</span>';
            } else {
                settleCell = '<span class="mp-badge unsubmitted"><i class="fas fa-hourglass-half"></i> Unsubmitted</span>';
            }
            return `
                <tr>
                    <td><span class="mp-primary">${this.esc(p.campaign_name) || 'CMP-' + p.campaign_id}</span><div class="mp-muted">CMP-${p.campaign_id}</div></td>
                    <td>${this.esc(p.company_name) || '<span class="mp-muted">—</span>'}</td>
                    <td>${this.esc(p.brand_name) || '<span class="mp-muted">—</span>'}</td>
                    <td>${this.esc(p.advertiser_name) || '—'}<div class="mp-muted">${this.esc(p.advertiser_email) || ''}</div></td>
                    <td>${stageBadge[stage] || ''}</td>
                    <td>${settleCell}</td>
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
            const resp = await fetch(`${this.apiBase}/api/manage-payments/payments?limit=500${ap ? '&' + ap : ''}`);
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
                    <button id="mp-invoice-upload-btn" class="mp-btn mp-btn-verify" onclick="ManagePayments.uploadInvoice(${p.campaign_id})">
                        <i class="fas fa-upload"></i> ${p.admin_invoice_url ? 'Replace' : 'Upload'} Invoice
                    </button>
                    <button id="mp-invoice-cancel-btn" class="mp-btn mp-btn-reject" style="display:none;" onclick="ManagePayments.cancelInvoiceUpload()">
                        <i class="fas fa-times"></i> Cancel
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
            const sStatus = p.settlement_status || 'pending';
            const sBadgeClass = (sStatus === 'verified' || sStatus === 'paid') ? 'verified' : (sStatus === 'rejected' ? 'rejected' : 'pending');
            // Advertiser has uploaded a settlement receipt that's awaiting review?
            const sHasReceipt = !!p.settlement_receipt_url;
            const sPending = sStatus === 'pending' && sHasReceipt;
            const sReceiptLink = sHasReceipt
                ? `<a href="${p.settlement_receipt_url}" target="_blank" rel="noopener" class="mp-btn mp-btn-view" style="display:inline-flex;"><i class="fas fa-file-invoice"></i> Receipt</a>` : '';
            const sPaidTo = p.settlement_paid_to_bank ? `<span class="mp-muted">🏦 ${this.esc(p.settlement_paid_to_bank)}</span>` : '';
            const sActions = sPending
                ? `<button class="mp-btn mp-btn-verify" onclick="ManagePayments.verifySettlement(${p.campaign_id})"><i class="fas fa-check"></i> Verify</button>
                   <button class="mp-btn mp-btn-reject" onclick="ManagePayments.rejectSettlement(${p.campaign_id})"><i class="fas fa-times"></i> Reject</button>` : '';
            settlementBlock = `
                <div style="display:flex; align-items:center; gap:.5rem; flex-wrap:wrap;">
                    <span class="mp-badge ${sBadgeClass}">${sStatus}</span>
                    <span>${money(p.settlement_amount)}</span>
                    <span class="mp-muted">${this.esc(p.settlement_invoice_number || '')}</span>
                    ${sReceiptLink} ${sPaidTo} ${sActions}
                    ${!sHasReceipt ? '<span class="mp-muted">awaiting advertiser payment</span>' : ''}
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

    _invoiceUploadController: null,

    async uploadInvoice(campaignId) {
        const input = document.getElementById('mp-invoice-file');
        const statusEl = document.getElementById('mp-invoice-status');
        const uploadBtn = document.getElementById('mp-invoice-upload-btn');
        const cancelBtn = document.getElementById('mp-invoice-cancel-btn');
        const file = input && input.files && input.files[0];
        if (!file) { if (statusEl) statusEl.textContent = 'Choose a file first.'; return; }

        // Allow aborting the in-flight upload via the Cancel button.
        this._invoiceUploadController = new AbortController();
        if (statusEl) statusEl.textContent = 'Uploading…';
        if (uploadBtn) uploadBtn.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'inline-flex';

        try {
            const fd = new FormData();
            fd.append('file', file);
            const adminId = this.getAdminId();
            if (adminId) fd.append('admin_id', adminId);
            const resp = await fetch(`${this.apiBase}/api/manage-payments/payments/${campaignId}/invoice`, {
                method: 'POST', body: fd, signal: this._invoiceUploadController.signal,
            });
            const data = await resp.json().catch(() => ({}));
            if (resp.ok) {
                if (statusEl) statusEl.textContent = 'Uploaded ✓';
                await this.loadPayments();
                await this.openDetail(campaignId);   // re-render with the new invoice link
            } else {
                if (statusEl) statusEl.textContent = '';
                if (uploadBtn) uploadBtn.style.display = 'inline-flex';
                if (cancelBtn) cancelBtn.style.display = 'none';
                alert(`Failed: ${data.detail || 'Unknown error'}`);
            }
        } catch (err) {
            if (err && err.name === 'AbortError') {
                if (statusEl) statusEl.textContent = 'Upload cancelled.';
            } else {
                console.error('[ManagePayments] invoice upload error:', err);
                if (statusEl) statusEl.textContent = '';
                alert('An error occurred while uploading the invoice.');
            }
            if (uploadBtn) uploadBtn.style.display = 'inline-flex';
            if (cancelBtn) cancelBtn.style.display = 'none';
        } finally {
            this._invoiceUploadController = null;
        }
    },

    cancelInvoiceUpload() {
        if (this._invoiceUploadController) this._invoiceUploadController.abort();
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

    async _update(campaignId, newStatus, reason, keepOpen, invoiceType) {
        try {
            const resp = await fetch(`${this.apiBase}/api/manage-payments/payments/${campaignId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_status: newStatus, reason: reason || null, admin_id: this.getAdminId(), invoice_type: invoiceType || 'advance' }),
            });
            if (resp.ok) {
                await this.loadPayments();   // re-derives stages + counts
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

    verifySettlement(campaignId) {
        if (!confirm('Verify this settlement (remaining-balance) payment?')) return;
        this._update(campaignId, 'verified', null, true, 'final_settlement');
    },

    rejectSettlement(campaignId) {
        const reason = prompt('Reason for rejecting this settlement payment:');
        if (!reason) return;
        this._update(campaignId, 'rejected', reason, true, 'final_settlement');
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
