/**
 * Bank Accounts Manager — admin system settings.
 * "Add account" flow: pick a bank from a dropdown + enter the account number.
 * Only added accounts are listed; persists via /api/admin/banks.
 */
const BankAccountsManager = {
    apiBase: (typeof window !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : 'http://localhost:8000',

    // All NBE-licensed Ethiopian banks (for the dropdown).
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

    accounts: [],        // saved accounts from the backend
    editingCode: null,   // bank_code being edited (null = adding)
    initialized: false,

    _bankName(code) {
        const b = this.BANKS.find(x => x.code === code);
        return b ? b.name : code;
    },
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
    _esc(s) { return (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },

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
                this.accounts = (data.accounts || []).filter(a => a.account_number);
            }
        } catch (e) {
            console.error('[BankAccounts] load failed:', e);
        }
        this.renderList();
    },

    // ---------- Add / edit form ----------

    _populateDropdown(selectedCode) {
        const sel = document.getElementById('bank-select');
        if (!sel) return;
        // When adding, exclude banks that already have an account.
        const used = new Set(this.accounts.map(a => a.bank_code));
        const opts = ['<option value="">Select a bank…</option>'];
        this.BANKS.forEach(b => {
            if (!this.editingCode && used.has(b.code)) return; // hide already-added when adding
            const sel2 = b.code === selectedCode ? ' selected' : '';
            opts.push(`<option value="${b.code}"${sel2}>${this._esc(b.name)}</option>`);
        });
        sel.innerHTML = opts.join('');
    },

    openAddForm() {
        this.editingCode = null;
        const form = document.getElementById('bank-add-form');
        document.getElementById('bank-form-title').textContent = 'Add Bank Account';
        document.getElementById('bank-form-submit-label').textContent = 'Add Account';
        this._populateDropdown(null);
        const sel = document.getElementById('bank-select');
        if (sel) sel.disabled = false;
        document.getElementById('bank-account-number').value = '';
        document.getElementById('bank-account-name').value = '';
        if (form) form.style.display = 'block';
        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    openEditForm(code) {
        const a = this.accounts.find(x => x.bank_code === code);
        if (!a) return;
        this.editingCode = code;
        document.getElementById('bank-form-title').textContent = `Edit — ${this._bankName(code)}`;
        document.getElementById('bank-form-submit-label').textContent = 'Save Changes';
        this._populateDropdown(code);
        const sel = document.getElementById('bank-select');
        if (sel) sel.disabled = true; // can't change the bank when editing
        document.getElementById('bank-account-number').value = a.account_number || '';
        document.getElementById('bank-account-name').value = a.account_name || '';
        const form = document.getElementById('bank-add-form');
        if (form) { form.style.display = 'block'; form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    },

    closeAddForm() {
        const form = document.getElementById('bank-add-form');
        if (form) form.style.display = 'none';
        this.editingCode = null;
    },

    async submitForm() {
        const code = this.editingCode || (document.getElementById('bank-select') || {}).value;
        const accountNumber = (document.getElementById('bank-account-number') || {}).value.trim();
        const accountName = (document.getElementById('bank-account-name') || {}).value.trim();

        if (!code) { this._toast('Please select a bank.', 'error'); return; }
        if (!accountNumber) { this._toast('Please enter an account number.', 'error'); return; }

        const payload = { bank_code: code, bank_name: this._bankName(code), account_number: accountNumber, account_name: accountName, enabled: true };
        try {
            const res = await fetch(`${this.apiBase}/api/admin/banks`, {
                method: 'POST', headers: this._headers(), body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
            this._toast(`${payload.bank_name} saved.`, 'success');
            this.closeAddForm();
            await this.load();
        } catch (e) {
            this._toast(`Failed to save: ${e.message}`, 'error');
        }
    },

    async deleteAccount(code) {
        if (!confirm(`Remove the ${this._bankName(code)} account?`)) return;
        try {
            const res = await fetch(`${this.apiBase}/api/admin/banks/${encodeURIComponent(code)}`, {
                method: 'DELETE', headers: this._headers(false),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this._toast('Account removed.', 'success');
            await this.load();
        } catch (e) {
            this._toast(`Failed to remove: ${e.message}`, 'error');
        }
    },

    // ---------- List ----------

    renderList() {
        const list = document.getElementById('banks-list');
        if (!list) return;
        if (!this.accounts.length) {
            list.innerHTML = `
                <div class="text-center text-gray-400 py-10">
                    <i class="fas fa-university" style="font-size:2.2rem; opacity:.4;"></i>
                    <p class="mt-3">No bank accounts added yet.</p>
                    <button onclick="BankAccountsManager.openAddForm()"
                        class="mt-3 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                        <i class="fas fa-plus mr-2"></i>Add your first account
                    </button>
                </div>`;
            return;
        }
        list.innerHTML = this.accounts.map(a => `
            <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;
                        padding:.9rem 1rem; border:1px solid #bbf7d0; border-radius:12px; background:rgba(34,197,94,.05);">
                <span style="width:38px;height:38px;border-radius:9px;background:#eff6ff;color:#2563eb;
                             display:flex;align-items:center;justify-content:center;flex:none;">
                    <i class="fas fa-university"></i>
                </span>
                <div style="flex:1; min-width:180px;">
                    <div style="font-weight:700;">${this._esc(a.bank_name || this._bankName(a.bank_code))}</div>
                    ${a.account_name ? `<div style="font-size:.82rem;color:#6b7280;">${this._esc(a.account_name)}</div>` : ''}
                </div>
                <div style="font-family:monospace; font-size:1rem; font-weight:600; letter-spacing:.04em;">
                    ${this._esc(a.account_number)}
                </div>
                <div style="display:flex; gap:.4rem;">
                    <button onclick="BankAccountsManager.openEditForm('${a.bank_code}')"
                        style="padding:.45rem .8rem; background:#2563eb; color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer;">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button onclick="BankAccountsManager.deleteAccount('${a.bank_code}')"
                        style="padding:.45rem .8rem; background:#dc2626; color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`).join('');
    },

    _toast(msg, type) {
        if (typeof showToast === 'function') showToast(msg, type);
        else if (typeof showNotification === 'function') showNotification(msg, type);
        else console.log(`[BankAccounts] ${type}: ${msg}`);
    },
};

window.BankAccountsManager = BankAccountsManager;
