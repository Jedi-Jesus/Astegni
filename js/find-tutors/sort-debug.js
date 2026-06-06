// ============================================
// SORT DEBUG CONSOLE
// Prints the resulting tutor order + the sort-relevant values for the
// active sort, plus an automatic "ORDER OK / WRONG" verdict, so the sort
// behaviour can be eyeballed/pasted for verification.
//
// Activated automatically on every load (logs to console). It is read-only:
// it never changes the order, it only reports what was rendered.
// ============================================

const SortDebug = {
    // For each sort value: the field(s) to display and how the list SHOULD be ordered.
    // direction: 'desc' = higher first, 'asc' = lower first, null = not strictly orderable
    //            client-side (e.g. smart ranking is scored server-side).
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
        credentials:      { label: 'Most Credentials',  fields: ['credentials_count'],      key: 'credentials_count', direction: 'desc', note: 'credentials_count may be absent from the payload (sorted server-side) - verify via backend log if blank.' },
        credentials_desc: { label: 'Most Credentials',  fields: ['credentials_count'],      key: 'credentials_count', direction: 'desc', note: 'credentials_count may be absent from the payload (sorted server-side) - verify via backend log if blank.' },
        credentials_asc:  { label: 'Least Credentials', fields: ['credentials_count'],      key: 'credentials_count', direction: 'asc',  note: 'credentials_count may be absent from the payload (sorted server-side) - verify via backend log if blank.' },
        newest:           { label: 'Newest First',      fields: ['created_at', 'id'],       key: 'created_at',    direction: 'desc' },
        oldest:           { label: 'Oldest First',      fields: ['created_at', 'id'],       key: 'oldest',        direction: 'asc'  },
        name:             { label: 'Name (A-Z)',        fields: ['_name'],                  key: '_name',         direction: 'asc'  },
        name_asc:         { label: 'Name (A-Z)',        fields: ['_name'],                  key: '_name',         direction: 'asc'  },
        name_desc:        { label: 'Name (Z-A)',        fields: ['_name'],                  key: '_name',         direction: 'desc' },
    },

    fullName(t) {
        return `${t.first_name || ''} ${t.father_name || ''}`.trim() || `(unnamed #${t.id})`;
    },

    // Normalise a tutor's value for the sort key into something comparable
    sortValue(t, key) {
        switch (key) {
            case 'rating':            return parseFloat(t.rating || 0);
            case 'price':             return parseFloat(t.price || 0);
            case 'experience':        return parseInt(t.experience || 0);
            case 'credentials_count': return t.credentials_count == null ? null : parseInt(t.credentials_count);
            case 'created_at':
            case 'oldest':            return t.created_at ? new Date(t.created_at).getTime() : (t.id || 0);
            case '_name':             return this.fullName(t).toLowerCase();
            default:                  return t[key];
        }
    },

    // Is `a` correctly ordered before `b` for the given direction?
    inOrder(a, b, direction) {
        if (a == null || b == null) return null; // can't judge
        if (typeof a === 'string') {
            const cmp = a.localeCompare(b);
            return direction === 'asc' ? cmp <= 0 : cmp >= 0;
        }
        return direction === 'asc' ? a <= b : a >= b;
    },

    /**
     * Print the debug report.
     * @param {string} sortBy  - current sort value
     * @param {Array}  tutors  - tutors in the order they were rendered
     * @param {object} meta    - { page, total }
     */
    report(sortBy, tutors, meta = {}) {
        const cfg = this.sortConfig[sortBy] || this.sortConfig.smart;
        const tag = `🔎 SORT DEBUG [${sortBy}] → "${cfg.label}"`;

        console.groupCollapsed(`${tag}  (${tutors.length} shown${meta.total != null ? ' / ' + meta.total + ' total' : ''}, page ${meta.page || 1})`);

        if (cfg.note) console.log('ℹ️ ', cfg.note);
        if (cfg.direction) {
            console.log(`Expected order: ${cfg.direction === 'desc' ? 'HIGHER first ⬇' : 'LOWER first ⬆'} by "${cfg.key}"`);
        } else {
            console.log('Expected order: server-scored — no single client field to check (informational only).');
        }

        // Build a printable table
        const rows = tutors.map((t, i) => {
            const row = { '#': i + 1, name: this.fullName(t), id: t.id };
            cfg.fields.forEach(f => {
                if (f === '_name') return; // name shown already
                row[f] = (t[f] === undefined ? '—(missing)' : t[f]);
            });
            return row;
        });
        console.table(rows);

        // Verdict: walk consecutive pairs and check ordering for the sort key
        if (cfg.direction && cfg.key) {
            let ok = true, undecidable = false, firstViolation = null;
            for (let i = 0; i < tutors.length - 1; i++) {
                const a = this.sortValue(tutors[i], cfg.key);
                const b = this.sortValue(tutors[i + 1], cfg.key);
                const verdict = this.inOrder(a, b, cfg.direction);
                if (verdict === null) { undecidable = true; continue; }
                if (!verdict) {
                    ok = false;
                    if (!firstViolation) {
                        firstViolation = `#${i + 1} ${this.fullName(tutors[i])} (${a}) then #${i + 2} ${this.fullName(tutors[i + 1])} (${b}) — out of ${cfg.direction} order`;
                    }
                }
            }
            if (undecidable && firstViolation === null && !ok) {
                // mixed
            }
            if (tutors.length < 2) {
                console.log('🟡 Only %d tutor — nothing to compare.', tutors.length);
            } else if (undecidable && ok) {
                console.log('🟡 ORDER UNVERIFIABLE — sort field not present in payload for some/all tutors.');
            } else if (ok) {
                console.log('%c✅ ORDER OK — sequence respects the expected ' + cfg.direction + ' order.', 'color:#16a34a;font-weight:bold');
            } else {
                console.log('%c❌ ORDER WRONG — ' + firstViolation, 'color:#dc2626;font-weight:bold');
            }
        }

        // One-line paste-friendly summary
        const summary = tutors.map((t, i) => {
            const v = cfg.key ? this.sortValue(t, cfg.key) : null;
            return `${i + 1}.${this.fullName(t)}${v != null ? '(' + (typeof v === 'number' && cfg.key !== 'created_at' && cfg.key !== 'oldest' ? v : (cfg.key === 'created_at' || cfg.key === 'oldest' ? (t.created_at || t.id) : v)) + ')' : ''}`;
        }).join('  ');
        console.log('📋 Paste-me:', `[${sortBy}] ` + summary);

        console.groupEnd();
    }
};

// Expose globally for the controller to call
window.SortDebug = SortDebug;
