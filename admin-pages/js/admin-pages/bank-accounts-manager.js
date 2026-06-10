/**
 * Bank Accounts Manager — admin system settings.
 * Renders every Ethiopian bank with an account-number input and persists them
 * via /api/admin/banks. Mirrors the other system-settings managers.
 */
const BankAccountsManager = {
    apiBase: (typeof window !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : 'http://localhost:8000',

    // All banks operating in Ethiopia (NBE-licensed commercial banks).
    BANKS: [
        { code: 'cbe',          name: 'Commercial Bank of Ethiopia (CBE)' },
        { code: 'awash',        name: 'Awash Bank' },
        { code: 'dashen',       name: 'Dashen Bank' },
        { code: 'abyssinia',    name: 'Bank of Abyssinia' },
        { code: 'wegagen',      name: 'Wegagen Bank' },
        { code: 'united',       name: 'United Bank (Hibret Bank)' },
        { code: 'nib',          name: 'Nib International Bank' },
        { code: 'coop',         name: 'Cooperative Bank of Oromia (Coopbank)' },
        { code: 'lion',         name: 'Lion International Bank (Anbessa)' },
        { code: 'zemen',        name: 'Zemen Bank' },
        { code: 'oromia',       name: 'Oromia Bank' },
        { code: 'berhan',       name: 'Berhan Bank' },
        { code: 'bunna',        name: 'Bunna Bank' },
        { code: 'abay',         name: 'Abay Bank' },
        { code: 'addis',        name: 'Addis International Bank' },
        { code: 'debub_global', name: 'Debub Global Bank' },
        { code: 'enat',         name: 'Enat Bank' },
        { code: 'zamzam',       name: 'ZamZam Bank' },
        { code: 'hijra',        name: 'Hijra Bank' },
        { code: 'siinqee',      name: 'Siinqee Bank' },
        { code: 'shabelle',     name: 'Shabelle Bank' },
        { code: 'tsehay',       name: 'Tsehay Bank' },
        { code: 'amhara',       name: 'Amhara Bank' },
        { code: 'ahadu',        name: 'Ahadu Bank' },
        { code: 'gadaa',        name: 'Gadaa Bank' },
        { code: 'goh',          name: 'Goh Betoch Bank' },
        { code: 'hibret',       name: 'Hibret Bank' },
        { code: 'rammis',       name: 'Rammis Bank' },
        { code: 'sidama',       name: 'Sidama Bank' },
        { code: 'development',  name: 'Development Bank of Ethiopia (DBE)' },
    ],

    saved: {},   // bank_code -> { account_number, account_name, enabled }
    initialized: false,

    _token() {
        return localStorage.getItem('adminToken') || localStorage.getItem('admin_access_token')
            || localStorage.getItem('access_token') || localStorage.getItem('token');
    },
    _headers(json = true) {
        const h = {};
        const t = this._token();
        if (t) h['Authorization'] = `Bearer ${t}`;
        if (json) h['Content-Type'] = 'application/json';
        return h;
    },

    async init() {
        if (this.initialized) return;
        this.initialized = true;
        await this.load();
    },

    async load() {
        try {
            const res = await fetch(`${this.apiBase}/api/admin/banks`, { headers: this._headers(false) });
            if (res.ok) {
                const data = await res.json();
                this.saved = {};
                (data.accounts || []).forEach(a => { this.saved[a.bank_code] = a; });
            }
        } catch (e) {
            console.error('[BankAccounts] load failed:', e);
        }
        this.render();
    },

    render() {
        const list = document.getElementById('banks-list');
        if (!list) return;
        list.innerHTML = this.BANKS.map(b => {
            const s = this.saved[b.code] || {};
            const acct = s.account_number || '';
            const acctName = s.account_name || '';
            const hasAcct = !!acct;
            return `
                <div class="bank-row" data-bank="${b.code}" data-name="${b.name.toLowerCase()}"
                     style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;
                            padding:.9rem 1rem; border:1px solid ${hasAcct ? '#bbf7d0' : '#e5e7eb'};
                            border-radius:12px; background:${hasAcct ? 'rgba(34,197,94,.05)' : '#fff'};">
                    <div style="flex:1; min-width:180px; font-weight:600; display:flex; align-items:center; gap:.6rem;">
                        <span style="width:34px;height:34px;border-radius:8px;background:#eff6ff;color:#2563eb;
                                     display:flex;align-items:center;justify-content:center;flex:none;">
                            <i class="fas fa-university"></i>
                        </span>
                        ${b.name}
                        ${hasAcct ? '<i class="fas fa-check-circle" style="color:#16a34a;" title="Configured"></i>' : ''}
                    </div>
                    <input type="text" placeholder="Account number"
                           value="${acct}" data-field="account_number"
                           style="flex:1; min-width:160px; padding:.55rem .8rem; border:1px solid #d1d5db; border-radius:8px;">
                    <input type="text" placeholder="Account holder name (optional)"
                           value="${acctName.replace(/"/g, '&quot;')}" data-field="account_name"
                           style="flex:1; min-width:160px; padding:.55rem .8rem; border:1px solid #d1d5db; border-radius:8px;">
                    <button onclick="BankAccountsManager.saveOne('${b.code}')"
                            style="padding:.5rem .9rem; background:#2563eb; color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer; white-space:nowrap;">
                        <i class="fas fa-save"></i> Save
                    </button>
                </div>`;
        }).join('');
        this._updateCounts();
    },

    _rowValues(code) {
        const row = document.querySelector(`.bank-row[data-bank="${code}"]`);
        if (!row) return null;
        const bank = this.BANKS.find(b => b.code === code);
        return {
            bank_code: code,
            bank_name: bank ? bank.name : code,
            account_number: row.querySelector('[data-field="account_number"]').value.trim(),
            account_name: row.querySelector('[data-field="account_name"]').value.trim(),
            enabled: true,
        };
    },

    async saveOne(code) {
        const payload = this._rowValues(code);
        if (!payload) return;
        try {
            const res = await fetch(`${this.apiBase}/api/admin/banks`, {
                method: 'POST', headers: this._headers(), body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
            this.saved[code] = payload;
            this._toast(`${payload.bank_name} saved.`, 'success');
            this.render();
        } catch (e) {
            this._toast(`Failed to save: ${e.message}`, 'error');
        }
    },

    async saveAll() {
        const toSave = this.BANKS
            .map(b => this._rowValues(b.code))
            .filter(p => p && (p.account_number || this.saved[p.bank_code]));
        let ok = 0;
        for (const payload of toSave) {
            try {
                const res = await fetch(`${this.apiBase}/api/admin/banks`, {
                    method: 'POST', headers: this._headers(), body: JSON.stringify(payload),
                });
                if (res.ok) { this.saved[payload.bank_code] = payload; ok++; }
            } catch (e) { /* continue */ }
        }
        this._toast(`Saved ${ok} bank account(s).`, ok ? 'success' : 'error');
        this.render();
    },

    filter(q) {
        q = (q || '').toLowerCase().trim();
        document.querySelectorAll('#banks-list .bank-row').forEach(row => {
            row.style.display = (!q || row.dataset.name.includes(q)) ? '' : 'none';
        });
    },

    _updateCounts() {
        const total = this.BANKS.length;
        const configured = Object.values(this.saved).filter(a => a.account_number).length;
        const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setText('bank-total-count', total);
        setText('bank-configured-count', configured);
    },

    _toast(msg, type) {
        if (typeof showToast === 'function') showToast(msg, type);
        else if (typeof showNotification === 'function') showNotification(msg, type);
        else console.log(`[BankAccounts] ${type}: ${msg}`);
    },
};

window.BankAccountsManager = BankAccountsManager;
