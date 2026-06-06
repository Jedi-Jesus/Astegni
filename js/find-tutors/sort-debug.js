// ============================================
// SORT DEBUG PANEL
// A floating on-page panel for find-tutors that records the result of EVERY
// sort (each click/change appends an entry), shows the order + sort-key values
// + an automatic ORDER OK/WRONG verdict, and has a Copy button so the whole
// log can be pasted for verification — no DevTools console needed.
//
// Read-only: it never reorders tutors, it only reports what was rendered.
// ============================================

const SortDebug = {
    log: [],          // accumulated text entries (one per sort run)
    panelEl: null,
    bodyEl: null,

    sortConfig: {
        smart:            { label: 'Smart Ranking',     fields: ['rating', 'rating_count', 'subscription_tier'], direction: null,   note: 'Server-scored (rating-primary + trending + activity), band-shuffled. No single client field to verify against.' },
        rating:           { label: 'Highest Rating',    fields: ['rating', 'rating_count'], key: 'rating',        direction: 'desc' },
        rating_desc:      { label: 'Highest Rating',    fields: ['rating', 'rating_count'], key: 'rating',        direction: 'desc' },
        rating_asc:       { label: 'Lowest Rating',     fields: ['rating', 'rating_count'], key: 'rating',        direction: 'asc'  },
        price:            { label: 'Lowest Price',      fields: ['price', 'price_max'],     key: 'price',         direction: 'asc'  },
        price_asc:        { label: 'Lowest Price',      fields: ['price', 'price_max'],     key: 'price',         direction: 'asc'  },
        price_desc:       { label: 'Highest Price',     fields: ['price', 'price_max'],     key: 'price',         direction: 'desc' },
        experience:       { label: 'Most Experience',   fields: ['experience'],             key: 'experience',    direction: 'desc' },
        experience_desc:  { label: 'Most Experience',   fields: ['experience'],             key: 'experience',    direction: 'desc' },
        experience_asc:   { label: 'Least Experience',  fields: ['experience'],             key: 'experience',    direction: 'asc'  },
        credentials:      { label: 'Most Credentials',  fields: ['credentials_count'],      key: 'credentials_count', direction: 'desc', note: 'credentials_count may be absent from the payload — verify via backend if blank.' },
        credentials_desc: { label: 'Most Credentials',  fields: ['credentials_count'],      key: 'credentials_count', direction: 'desc', note: 'credentials_count may be absent from the payload — verify via backend if blank.' },
        credentials_asc:  { label: 'Least Credentials', fields: ['credentials_count'],      key: 'credentials_count', direction: 'asc',  note: 'credentials_count may be absent from the payload — verify via backend if blank.' },
        newest:           { label: 'Newest First',      fields: ['created_at', 'id'],       key: 'created_at',    direction: 'desc' },
        oldest:           { label: 'Oldest First',      fields: ['created_at', 'id'],       key: 'oldest',        direction: 'asc'  },
        name:             { label: 'Name (A-Z)',        fields: ['_name'],                  key: '_name',         direction: 'asc'  },
        name_asc:         { label: 'Name (A-Z)',        fields: ['_name'],                  key: '_name',         direction: 'asc'  },
        name_desc:        { label: 'Name (Z-A)',        fields: ['_name'],                  key: '_name',         direction: 'desc' },
        popularity:       { label: 'Most Popular',      fields: ['trending_score', 'search_count'], key: 'trending_score', direction: 'desc' },
        popular:          { label: 'Most Popular',      fields: ['trending_score', 'search_count'], key: 'trending_score', direction: 'desc' },
        students:         { label: 'Most Students',     fields: ['students_count'],         key: 'students_count', direction: 'desc' },
        response_time:    { label: 'Fastest Response',  fields: ['response_time_hours'],    key: 'response_time_hours', direction: 'asc', note: 'null response_time_hours = no data (sorts last).' },
    },

    fullName(t) {
        return `${t.first_name || ''} ${t.father_name || ''}`.trim() || `(unnamed #${t.id})`;
    },

    sortValue(t, key) {
        switch (key) {
            case 'rating':              return parseFloat(t.rating || 0);
            case 'price':               return parseFloat(t.price || 0);
            case 'experience':          return t.experience == null ? null : parseFloat(t.experience);
            case 'credentials_count':   return t.credentials_count == null ? null : parseInt(t.credentials_count);
            case 'students_count':      return t.students_count == null ? null : parseInt(t.students_count);
            case 'trending_score':      return parseFloat(t.trending_score || 0);
            case 'response_time_hours': return t.response_time_hours == null ? null : parseFloat(t.response_time_hours);
            case 'created_at':
            case 'oldest':              return t.created_at ? new Date(t.created_at).getTime() : (t.id || 0);
            case '_name':               return this.fullName(t).toLowerCase();
            default:                    return t[key];
        }
    },

    inOrder(a, b, direction) {
        if (a == null || b == null) return null;
        if (typeof a === 'string') {
            const cmp = a.localeCompare(b);
            return direction === 'asc' ? cmp <= 0 : cmp >= 0;
        }
        return direction === 'asc' ? a <= b : a >= b;
    },

    // Build the verdict + readable text block for one sort run
    buildEntry(sortBy, tutors, meta) {
        const known = Object.prototype.hasOwnProperty.call(this.sortConfig, sortBy);
        const cfg = known ? this.sortConfig[sortBy]
                          : { label: '⚠️ UNKNOWN SORT (not in debug config)', fields: ['rating', 'price'], direction: null };
        const time = new Date().toLocaleTimeString();
        const lines = [];
        lines.push(`[${time}] SORT "${sortBy}" → ${cfg.label}  (${tutors.length} shown${meta.total != null ? '/' + meta.total : ''}, page ${meta.page || 1})`);

        if (!known) {
            lines.push(`  ⚠️ This sort value has no debug config — order shown as returned, not verified.`);
        } else if (cfg.direction && cfg.key) {
            lines.push(`  expected: ${cfg.direction === 'desc' ? 'HIGHER first' : 'LOWER first'} by ${cfg.key}`);
        } else {
            lines.push(`  expected: server-scored (informational only)`);
        }

        // Order list with sort-key value
        tutors.forEach((t, i) => {
            const parts = cfg.fields.map(f => {
                if (f === '_name') return null;
                const v = (t[f] === undefined ? 'missing' : t[f]);
                return `${f}=${v}`;
            }).filter(Boolean);
            lines.push(`  ${i + 1}. ${this.fullName(t)} [id ${t.id}]${parts.length ? ' — ' + parts.join(', ') : ''}`);
        });

        // Verdict
        let verdict = 'INFO';
        if (cfg.direction && cfg.key && tutors.length >= 2) {
            let ok = true, undecidable = false, firstViolation = null;
            for (let i = 0; i < tutors.length - 1; i++) {
                const a = this.sortValue(tutors[i], cfg.key);
                const b = this.sortValue(tutors[i + 1], cfg.key);
                const r = this.inOrder(a, b, cfg.direction);
                if (r === null) { undecidable = true; continue; }
                if (!r && !firstViolation) {
                    ok = false;
                    firstViolation = `#${i + 1} (${a}) then #${i + 2} (${b})`;
                }
            }
            if (!ok) verdict = `❌ WRONG — ${firstViolation} out of ${cfg.direction} order`;
            else if (undecidable) verdict = '🟡 UNVERIFIABLE — sort field missing from payload';
            else verdict = `✅ OK — respects ${cfg.direction} order`;
        } else if (tutors.length < 2) {
            verdict = '🟡 only ' + tutors.length + ' tutor — nothing to compare';
        }
        lines.push(`  VERDICT: ${verdict}`);
        if (cfg.note) lines.push(`  note: ${cfg.note}`);
        lines.push('');

        return { text: lines.join('\n'), verdict };
    },

    ensurePanel() {
        if (this.panelEl) return;
        const panel = document.createElement('div');
        panel.id = 'sort-debug-panel';
        panel.style.cssText = [
            'position:fixed', 'bottom:16px', 'right:16px', 'width:380px', 'max-height:60vh',
            'background:#0f172a', 'color:#e2e8f0', 'font:12px/1.45 ui-monospace,Menlo,Consolas,monospace',
            'border:1px solid #334155', 'border-radius:10px', 'box-shadow:0 8px 30px rgba(0,0,0,.45)',
            'z-index:99999', 'display:flex', 'flex-direction:column', 'overflow:hidden'
        ].join(';');

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 10px;background:#1e293b;cursor:move;flex:0 0 auto';
        header.innerHTML = `
            <span style="font-weight:700;color:#38bdf8">🔎 Sort Debug</span>
            <span id="sd-count" style="color:#94a3b8;font-size:11px">0 entries</span>
            <span style="flex:1"></span>
            <button id="sd-copy" title="Copy full log" style="background:#16a34a;color:#fff;border:0;border-radius:6px;padding:4px 10px;font-weight:600;cursor:pointer">Copy</button>
            <button id="sd-clear" title="Clear log" style="background:#475569;color:#fff;border:0;border-radius:6px;padding:4px 8px;cursor:pointer">Clear</button>
            <button id="sd-min" title="Minimize" style="background:transparent;color:#94a3b8;border:0;font-size:16px;cursor:pointer;line-height:1">–</button>
        `;

        const body = document.createElement('pre');
        body.id = 'sd-body';
        body.style.cssText = 'margin:0;padding:10px;overflow:auto;white-space:pre-wrap;word-break:break-word;flex:1 1 auto';
        body.textContent = '(no sorts yet — click a sort button or change the dropdown)';

        panel.appendChild(header);
        panel.appendChild(body);
        document.body.appendChild(panel);
        this.panelEl = panel;
        this.bodyEl = body;

        // Copy
        header.querySelector('#sd-copy').addEventListener('click', () => this.copy());
        // Clear
        header.querySelector('#sd-clear').addEventListener('click', () => {
            this.log = [];
            this.render();
        });
        // Minimize / restore
        let minimized = false;
        header.querySelector('#sd-min').addEventListener('click', (e) => {
            minimized = !minimized;
            body.style.display = minimized ? 'none' : 'block';
            e.target.textContent = minimized ? '+' : '–';
        });

        // Drag
        let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            dragging = true;
            const r = panel.getBoundingClientRect();
            sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
            panel.style.right = 'auto'; panel.style.bottom = 'auto';
            panel.style.left = ox + 'px'; panel.style.top = oy + 'px';
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            panel.style.left = (ox + e.clientX - sx) + 'px';
            panel.style.top = (oy + e.clientY - sy) + 'px';
        });
        document.addEventListener('mouseup', () => { dragging = false; });
    },

    render() {
        if (!this.bodyEl) return;
        const countEl = document.getElementById('sd-count');
        if (countEl) countEl.textContent = `${this.log.length} ${this.log.length === 1 ? 'entry' : 'entries'}`;
        this.bodyEl.textContent = this.log.length
            ? this.log.map(e => e.text).join('\n')
            : '(no sorts yet — click a sort button or change the dropdown)';
        // Auto-scroll to newest
        this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
    },

    copy() {
        const text = this.log.map(e => e.text).join('\n') || '(empty)';
        const btn = document.getElementById('sd-copy');
        const done = () => { if (btn) { const o = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = o, 1200); } };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(() => this.fallbackCopy(text, done));
        } else {
            this.fallbackCopy(text, done);
        }
    },

    fallbackCopy(text, done) {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* noop */ }
        document.body.removeChild(ta);
    },

    /**
     * Record one sort run (called by the controller after each load).
     */
    report(sortBy, tutors, meta = {}) {
        try {
            this.ensurePanel();
            const entry = this.buildEntry(sortBy, tutors || [], meta);
            this.log.push(entry);
            this.render();
            // Also mirror to console for convenience
            console.log('🔎 [SortDebug]', entry.text);
        } catch (e) {
            console.warn('[SortDebug] failed:', e);
        }
    }
};

window.SortDebug = SortDebug;
