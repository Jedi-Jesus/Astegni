// ============================================
// MANAGE EXAMS (admin page)
// --------------------------------------------
// Frontend-only for now. There is NO backend yet, so this module keeps
// exams in an in-memory store seeded with sample data. Every operation
// (search, filter, upload, view, edit, delete, reports, CSV export)
// works against that store so the UI is fully demonstrable.
//
// When the backend is ready, replace the bodies marked `// TODO(api)`
// with fetch() calls to /api/admin/exams/* — the surrounding render
// logic does not need to change. The intended endpoints are:
//   GET    /api/admin/exams?status=&search=&page=&limit=   -> { exams, total, pages }
//   GET    /api/admin/exams/counts                          -> { total, published, draft, archived, attempts }
//   GET    /api/admin/exams/{id}                            -> exam
//   POST   /api/admin/exams            (multipart: file + fields)
//   PUT    /api/admin/exams/{id}
//   DELETE /api/admin/exams/{id}
//   GET    /api/admin/exams/reports                         -> report payload
// ============================================

const EXAMS_API_URL = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:8000';

const ExamsAdmin = {
    // ---- in-memory store (stands in for the DB) ----
    _store: [],
    _nextId: 1,

    // ---- view state ----
    exams: [],            // current page slice (post filter/search)
    filterStatus: 'all',
    searchTerm: '',
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0,

    // ---- transient ----
    pendingFiles: [],     // files staged in the upload dropzone
    deleteId: null,

    // ============================================
    // Init + seed
    // ============================================
    async init() {
        this._seed();
        this._wireDropzone();
        this.loadCounts();
        this.loadExams();
    },

    _seed() {
        // Sample exams so the page is not empty before the backend exists.
        const samples = [
            { title: 'Grade 12 Physics Final Exam', subject: 'Physics', grade: 'Grade 12', type: 'Final', status: 'published', questions: 50, duration: 180, total_marks: 100, pass_mark: 50, author: 'MoE Ethiopia', year: 2024, description: 'National final exam covering mechanics, electricity, and modern physics.', file_name: 'physics-g12-final-2024.pdf', attempts: 1284, avg_score: 67.4, pass_rate: 71 },
            { title: 'Grade 10 Mathematics Midterm', subject: 'Mathematics', grade: 'Grade 10', type: 'Midterm', status: 'published', questions: 30, duration: 90, total_marks: 60, pass_mark: 30, author: 'Astegni Curriculum Team', year: 2025, description: 'Algebra and geometry midterm assessment.', file_name: 'math-g10-midterm-2025.pdf', attempts: 642, avg_score: 41.2, pass_rate: 63 },
            { title: 'University Entrance Mock - Biology', subject: 'Biology', grade: 'Grade 12', type: 'Mock', status: 'published', questions: 80, duration: 150, total_marks: 80, pass_mark: 40, author: 'Astegni Curriculum Team', year: 2025, description: 'Full-length entrance practice exam.', file_name: 'biology-entrance-mock.pdf', attempts: 2110, avg_score: 52.9, pass_rate: 58 },
            { title: 'Grade 8 English Quiz - Unit 3', subject: 'English', grade: 'Grade 8', type: 'Quiz', status: 'draft', questions: 15, duration: 30, total_marks: 15, pass_mark: 8, author: 'A. Bekele', year: 2025, description: 'Short reading-comprehension quiz, not yet released.', file_name: '', attempts: 0, avg_score: 0, pass_rate: 0 },
            { title: 'Grade 11 Chemistry Final (2023)', subject: 'Chemistry', grade: 'Grade 11', type: 'Final', status: 'archived', questions: 45, duration: 150, total_marks: 90, pass_mark: 45, author: 'MoE Ethiopia', year: 2023, description: 'Archived prior-year final exam kept for reference.', file_name: 'chemistry-g11-final-2023.pdf', attempts: 980, avg_score: 60.1, pass_rate: 66 },
            { title: 'Grade 9 Geography Quiz', subject: 'Geography', grade: 'Grade 9', type: 'Quiz', status: 'published', questions: 20, duration: 40, total_marks: 20, pass_mark: 10, author: 'S. Tadesse', year: 2025, description: 'Physical geography of Ethiopia and the Horn.', file_name: 'geography-g9-quiz.pdf', attempts: 415, avg_score: 13.8, pass_rate: 74 },
            { title: 'Grade 12 Mathematics Final', subject: 'Mathematics', grade: 'Grade 12', type: 'Final', status: 'published', questions: 55, duration: 180, total_marks: 100, pass_mark: 50, author: 'MoE Ethiopia', year: 2024, description: 'National mathematics final exam.', file_name: 'math-g12-final-2024.pdf', attempts: 1670, avg_score: 58.3, pass_rate: 61 },
            { title: 'Grade 7 Amharic Midterm', subject: 'Amharic', grade: 'Grade 7', type: 'Midterm', status: 'draft', questions: 25, duration: 60, total_marks: 50, pass_mark: 25, author: 'Astegni Curriculum Team', year: 2025, description: 'Draft midterm pending review.', file_name: '', attempts: 0, avg_score: 0, pass_rate: 0 },
            { title: 'Entrance Mock - Civics', subject: 'Civics', grade: 'Grade 12', type: 'Entrance', status: 'published', questions: 60, duration: 120, total_marks: 60, pass_mark: 30, author: 'Astegni Curriculum Team', year: 2025, description: 'Civics and ethical education entrance practice.', file_name: 'civics-entrance.pdf', attempts: 1340, avg_score: 39.5, pass_rate: 65 },
            { title: 'Grade 6 Science Final (2023)', subject: 'Science', grade: 'Grade 6', type: 'Final', status: 'archived', questions: 30, duration: 60, total_marks: 50, pass_mark: 25, author: 'MoE Ethiopia', year: 2023, description: 'Archived primary science final.', file_name: 'science-g6-final-2023.pdf', attempts: 720, avg_score: 33.0, pass_rate: 69 },
            { title: 'Grade 11 Physics Quiz - Optics', subject: 'Physics', grade: 'Grade 11', type: 'Quiz', status: 'published', questions: 12, duration: 25, total_marks: 12, pass_mark: 6, author: 'D. Hailu', year: 2025, description: 'Optics-focused short quiz.', file_name: 'physics-g11-optics-quiz.pdf', attempts: 233, avg_score: 8.1, pass_rate: 78 },
            { title: 'Grade 10 Biology Midterm', subject: 'Biology', grade: 'Grade 10', type: 'Midterm', status: 'published', questions: 35, duration: 90, total_marks: 70, pass_mark: 35, author: 'Astegni Curriculum Team', year: 2025, description: 'Cell biology and genetics midterm.', file_name: 'biology-g10-midterm.pdf', attempts: 558, avg_score: 44.6, pass_rate: 64 },
        ];
        const now = Date.now();
        this._store = samples.map((s, i) => ({
            id: this._nextId++,
            ...s,
            created_at: new Date(now - (samples.length - i) * 86400000).toISOString(),
            updated_at: new Date(now - (samples.length - i) * 43200000).toISOString(),
        }));
    },

    // ============================================
    // Data access (swap these for fetch() later)
    // ============================================
    _query() {
        // TODO(api): replace with GET /api/admin/exams?status=&search=&page=&limit=
        let rows = this._store.slice();
        if (this.filterStatus !== 'all') {
            rows = rows.filter(e => e.status === this.filterStatus);
        }
        if (this.searchTerm) {
            const q = this.searchTerm.toLowerCase();
            rows = rows.filter(e =>
                [e.title, e.subject, e.grade, e.type, e.author, e.year]
                    .filter(Boolean)
                    .some(v => String(v).toLowerCase().includes(q))
            );
        }
        rows.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        this.total = rows.length;
        this.totalPages = Math.max(1, Math.ceil(rows.length / this.limit));
        if (this.page > this.totalPages) this.page = this.totalPages;
        const start = (this.page - 1) * this.limit;
        return rows.slice(start, start + this.limit);
    },

    _counts() {
        // TODO(api): replace with GET /api/admin/exams/counts
        const c = { total: this._store.length, published: 0, draft: 0, archived: 0, attempts: 0 };
        for (const e of this._store) {
            if (e.status === 'published') c.published++;
            else if (e.status === 'draft') c.draft++;
            else if (e.status === 'archived') c.archived++;
            c.attempts += (e.attempts || 0);
        }
        return c;
    },

    loadCounts() {
        const c = this._counts();
        const map = {
            'stat-total': c.total,
            'stat-published': c.published,
            'stat-draft': c.draft,
            'stat-archived': c.archived,
            'stat-attempts': c.attempts,
        };
        for (const [id, val] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.textContent = (val ?? 0).toLocaleString();
        }
        const sb = document.getElementById('exams-sidebar-count');
        if (sb) sb.textContent = c.total ?? 0;
    },

    loadExams() {
        const list = document.getElementById('exams-list');
        if (list) list.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading exams...</div>';
        // Brief async-feel so swapping in fetch() later is seamless.
        this.exams = this._query();
        this.renderList();
        this.renderPagination();
    },

    // ============================================
    // Rendering: list
    // ============================================
    renderList() {
        const list = document.getElementById('exams-list');
        if (!list) return;
        if (this.exams.length === 0) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><div>No exams match this filter.</div></div>';
            return;
        }
        list.innerHTML = this.exams.map(e => this.renderRow(e)).join('');
    },

    renderRow(e) {
        const badge = this.renderBadge(e.status);
        const chips = [
            e.subject ? `<span class="exam-chip subject"><i class="fas fa-book"></i> ${this._escape(e.subject)}</span>` : '',
            e.grade ? `<span class="exam-chip grade"><i class="fas fa-layer-group"></i> ${this._escape(e.grade)}</span>` : '',
            e.type ? `<span class="exam-chip type"><i class="fas fa-tag"></i> ${this._escape(e.type)}</span>` : '',
            (e.questions ? `<span class="exam-chip questions"><i class="fas fa-list-ol"></i> ${e.questions} Q</span>` : ''),
            (e.duration ? `<span class="exam-chip duration"><i class="fas fa-clock"></i> ${e.duration} min</span>` : ''),
        ].filter(Boolean).join('');

        return `
            <div class="company-row" data-id="${e.id}">
                <div class="company-logo"><i class="fas fa-file-alt"></i></div>
                <div class="company-main">
                    <h3>${this._escape(e.title)}</h3>
                    <div class="company-owner"><i class="fas fa-user-edit"></i> ${this._escape(e.author) || 'Unknown author'}${e.year ? ` &middot; ${e.year}` : ''}</div>
                    <div class="exam-meta">${chips}</div>
                    ${badge}
                </div>
                <div class="company-balance">
                    <div class="amt">${(e.attempts || 0).toLocaleString()}</div>
                    <div class="label">attempts</div>
                </div>
                <div class="company-actions">
                    <button class="btn-primary" onclick="ExamsAdmin.openDetail(${e.id})"><i class="fas fa-eye"></i> View</button>
                </div>
                <div class="company-actions" style="grid-column:1/-1; justify-self:end;">
                    <button class="btn-secondary" onclick="ExamsAdmin.openEdit(${e.id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-danger" onclick="ExamsAdmin.askDelete(${e.id})"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `;
    },

    renderBadge(status) {
        const map = {
            published: { cls: 'published', icon: 'check-circle', text: 'Published' },
            draft:     { cls: 'draft',     icon: 'pencil-alt',   text: 'Draft' },
            archived:  { cls: 'archived',  icon: 'archive',      text: 'Archived' },
        };
        const s = map[status] || map.draft;
        return `<span class="company-badge ${s.cls}"><i class="fas fa-${s.icon}"></i> ${s.text}</span>`;
    },

    renderPagination() {
        const pag = document.getElementById('pagination');
        if (!pag) return;
        if (this.totalPages <= 1) { pag.innerHTML = ''; return; }
        const btns = [];
        btns.push(`<button onclick="ExamsAdmin.goToPage(${this.page - 1})" ${this.page <= 1 ? 'disabled' : ''}>&laquo; Prev</button>`);
        for (let i = 1; i <= this.totalPages; i++) {
            btns.push(`<button class="${i === this.page ? 'active' : ''}" onclick="ExamsAdmin.goToPage(${i})">${i}</button>`);
        }
        btns.push(`<button onclick="ExamsAdmin.goToPage(${this.page + 1})" ${this.page >= this.totalPages ? 'disabled' : ''}>Next &raquo;</button>`);
        pag.innerHTML = btns.join('');
    },

    goToPage(p) {
        if (p < 1 || p > this.totalPages) return;
        this.page = p;
        this.loadExams();
    },

    setFilter(status) {
        this.filterStatus = status;
        this.page = 1;
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.status === status);
        });
        this.loadExams();
    },

    onSearchInput(event) {
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
            this.searchTerm = event.target.value.trim();
            this.page = 1;
            this.loadExams();
        }, 250);
    },

    refresh() {
        this.loadCounts();
        this.loadExams();
    },

    _byId(id) { return this._store.find(e => e.id === id); },

    // ============================================
    // Detail / View Modal
    // ============================================
    openDetail(id) {
        const e = this._byId(id);
        if (!e) return;
        const body = document.getElementById('modal-body');
        const footer = document.getElementById('modal-footer');
        const title = document.getElementById('modal-title');
        document.getElementById('exam-modal')?.classList.remove('hidden');
        title.textContent = e.title;
        body.innerHTML = this.renderDetail(e);
        footer.innerHTML = `
            <button class="btn-secondary" onclick="ExamsAdmin.closeModal()">Close</button>
            <button class="btn-danger" onclick="ExamsAdmin.askDelete(${e.id})"><i class="fas fa-trash"></i> Delete</button>
            <button class="btn-primary" onclick="ExamsAdmin.openEdit(${e.id})"><i class="fas fa-edit"></i> Edit</button>
        `;
    },

    renderDetail(e) {
        const badge = this.renderBadge(e.status);
        const fileTile = e.file_name
            ? `<div class="doc-tile"><i class="fas fa-file-pdf"></i><div class="doc-meta"><div class="doc-name">${this._escape(e.file_name)}</div><div class="doc-status">Uploaded</div></div><a href="#" onclick="event.preventDefault(); alert('File preview will open once the backend serves exam files.');"><i class="fas fa-external-link-alt"></i> Open</a></div>`
            : `<div class="doc-tile missing"><i class="fas fa-exclamation-triangle"></i><div class="doc-meta"><div class="doc-name">No file attached</div><div class="doc-status">Not uploaded</div></div></div>`;

        return `
            <div class="detail-section">
                <h3>Status</h3>
                <div>${badge}</div>
            </div>

            <div class="detail-section">
                <h3>Exam Info</h3>
                <dl class="detail-grid">
                    <dt>Title</dt><dd>${this._escape(e.title)}</dd>
                    <dt>Subject</dt><dd>${this._escape(e.subject) || '—'}</dd>
                    <dt>Grade</dt><dd>${this._escape(e.grade) || '—'}</dd>
                    <dt>Type</dt><dd>${this._escape(e.type) || '—'}</dd>
                    <dt>Author</dt><dd>${this._escape(e.author) || '—'}</dd>
                    <dt>Year</dt><dd>${e.year || '—'}</dd>
                    <dt>Description</dt><dd>${this._escape(e.description) || '—'}</dd>
                </dl>
            </div>

            <div class="detail-section">
                <h3>Structure</h3>
                <dl class="detail-grid">
                    <dt>Questions</dt><dd>${e.questions || '—'}</dd>
                    <dt>Duration</dt><dd>${e.duration ? e.duration + ' min' : '—'}</dd>
                    <dt>Total Marks</dt><dd>${e.total_marks || '—'}</dd>
                    <dt>Pass Mark</dt><dd>${e.pass_mark || '—'}</dd>
                </dl>
            </div>

            <div class="detail-section">
                <h3>Performance</h3>
                <dl class="detail-grid">
                    <dt>Attempts</dt><dd>${(e.attempts || 0).toLocaleString()}</dd>
                    <dt>Average Score</dt><dd>${e.avg_score ? e.avg_score + (e.total_marks ? ' / ' + e.total_marks : '') : '—'}</dd>
                    <dt>Pass Rate</dt><dd>${e.pass_rate ? e.pass_rate + '%' : '—'}</dd>
                </dl>
            </div>

            <div class="detail-section">
                <h3>File</h3>
                ${fileTile}
            </div>

            <div class="detail-section">
                <h3>IDs</h3>
                <dl class="detail-grid">
                    <dt>Exam ID</dt><dd>#${e.id}</dd>
                    <dt>Created</dt><dd>${this._formatDate(e.created_at)}</dd>
                    <dt>Updated</dt><dd>${this._formatDate(e.updated_at)}</dd>
                </dl>
            </div>
        `;
    },

    closeModal() { document.getElementById('exam-modal')?.classList.add('hidden'); },

    // ============================================
    // Upload / Edit form
    // ============================================
    openUpload() {
        this._fillForm(null);
        document.getElementById('form-title').textContent = 'Upload Exam';
        document.getElementById('form-submit-btn').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload';
        document.getElementById('form-dropzone-wrap').style.display = '';
        document.getElementById('form-modal')?.classList.remove('hidden');
    },

    openEdit(id) {
        const e = this._byId(id);
        if (!e) return;
        this.closeModal();
        this._fillForm(e);
        document.getElementById('form-title').textContent = 'Edit Exam';
        document.getElementById('form-submit-btn').innerHTML = '<i class="fas fa-save"></i> Save Changes';
        // Hide the dropzone on edit — replacing the file is a separate concern.
        document.getElementById('form-dropzone-wrap').style.display = 'none';
        document.getElementById('form-modal')?.classList.remove('hidden');
    },

    _fillForm(e) {
        this.pendingFiles = [];
        this._renderFileList();
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
        set('form-exam-id', e ? e.id : '');
        set('f-title', e?.title);
        set('f-subject', e?.subject);
        set('f-grade', e?.grade);
        set('f-type', e?.type || 'Final');
        set('f-status', e?.status || 'draft');
        set('f-questions', e?.questions);
        set('f-duration', e?.duration);
        set('f-total-marks', e?.total_marks);
        set('f-pass-mark', e?.pass_mark);
        set('f-author', e?.author);
        set('f-year', e?.year);
        set('f-description', e?.description);
    },

    closeForm() {
        document.getElementById('form-modal')?.classList.add('hidden');
        this.pendingFiles = [];
    },

    submitForm() {
        const idVal = document.getElementById('form-exam-id').value;
        const title = document.getElementById('f-title').value.trim();
        if (!title) { alert('Title is required.'); return; }

        const num = (id) => {
            const v = document.getElementById(id).value;
            return v === '' ? null : Number(v);
        };
        const payload = {
            title,
            subject: document.getElementById('f-subject').value.trim(),
            grade: document.getElementById('f-grade').value.trim(),
            type: document.getElementById('f-type').value,
            status: document.getElementById('f-status').value,
            questions: num('f-questions'),
            duration: num('f-duration'),
            total_marks: num('f-total-marks'),
            pass_mark: num('f-pass-mark'),
            author: document.getElementById('f-author').value.trim(),
            year: num('f-year'),
            description: document.getElementById('f-description').value.trim(),
        };

        if (idVal) {
            // ---- EDIT ----
            // TODO(api): PUT /api/admin/exams/{id} with payload
            const e = this._byId(Number(idVal));
            if (e) {
                Object.assign(e, payload);
                e.updated_at = new Date().toISOString();
            }
        } else {
            // ---- UPLOAD / CREATE ----
            // TODO(api): POST /api/admin/exams (multipart: pendingFiles[0] + payload)
            const file = this.pendingFiles[0];
            const now = new Date().toISOString();
            this._store.unshift({
                id: this._nextId++,
                ...payload,
                file_name: file ? file.name : '',
                attempts: 0, avg_score: 0, pass_rate: 0,
                created_at: now, updated_at: now,
            });
        }

        this.closeForm();
        this.refresh();
    },

    // ---- Dropzone wiring ----
    _wireDropzone() {
        const dz = document.getElementById('dropzone');
        const input = document.getElementById('file-input');
        if (!dz || !input) return;

        dz.addEventListener('click', () => input.click());
        input.addEventListener('change', () => this._addFiles(input.files));

        ['dragenter', 'dragover'].forEach(evt =>
            dz.addEventListener(evt, ev => { ev.preventDefault(); dz.classList.add('dragover'); }));
        ['dragleave', 'drop'].forEach(evt =>
            dz.addEventListener(evt, ev => { ev.preventDefault(); dz.classList.remove('dragover'); }));
        dz.addEventListener('drop', ev => {
            if (ev.dataTransfer?.files) this._addFiles(ev.dataTransfer.files);
        });
    },

    _addFiles(fileList) {
        for (const f of fileList) this.pendingFiles.push(f);
        this._renderFileList();
    },

    removeFile(idx) {
        this.pendingFiles.splice(idx, 1);
        this._renderFileList();
    },

    _renderFileList() {
        const wrap = document.getElementById('dz-filelist');
        if (!wrap) return;
        if (!this.pendingFiles.length) { wrap.innerHTML = ''; return; }
        wrap.innerHTML = this.pendingFiles.map((f, i) => `
            <div class="dz-file">
                <i class="fas fa-file file-icon"></i>
                <span class="dz-file-name">${this._escape(f.name)}</span>
                <span class="dz-file-size">${this._fmtSize(f.size)}</span>
                <button class="dz-remove" type="button" onclick="ExamsAdmin.removeFile(${i})"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
        // Convenience: prefill the title from the first file name if empty.
        const t = document.getElementById('f-title');
        if (t && !t.value && this.pendingFiles[0]) {
            t.value = this.pendingFiles[0].name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        }
    },

    // ============================================
    // Delete
    // ============================================
    askDelete(id) {
        const e = this._byId(id);
        if (!e) return;
        this.deleteId = id;
        document.getElementById('delete-exam-name').textContent = `"${e.title}"`;
        document.getElementById('delete-modal')?.classList.remove('hidden');
    },

    closeDelete() {
        document.getElementById('delete-modal')?.classList.add('hidden');
        this.deleteId = null;
    },

    confirmDelete() {
        if (this.deleteId == null) return;
        // TODO(api): DELETE /api/admin/exams/{id}
        this._store = this._store.filter(e => e.id !== this.deleteId);
        this.closeDelete();
        this.closeModal();
        this.refresh();
    },

    // ============================================
    // Reports
    // ============================================
    openReports() {
        document.getElementById('reports-modal')?.classList.remove('hidden');
        document.getElementById('reports-body').innerHTML = this.renderReports();
    },

    closeReports() { document.getElementById('reports-modal')?.classList.add('hidden'); },

    _report() {
        // TODO(api): GET /api/admin/exams/reports
        const s = this._store;
        const totalAttempts = s.reduce((a, e) => a + (e.attempts || 0), 0);
        const scored = s.filter(e => e.attempts > 0);
        const avgPass = scored.length
            ? Math.round(scored.reduce((a, e) => a + (e.pass_rate || 0), 0) / scored.length)
            : 0;

        // by subject
        const bySubject = {};
        for (const e of s) {
            const k = e.subject || 'Other';
            bySubject[k] = (bySubject[k] || 0) + 1;
        }
        // by status
        const byStatus = { published: 0, draft: 0, archived: 0 };
        for (const e of s) byStatus[e.status] = (byStatus[e.status] || 0) + 1;

        // most attempted (top 5)
        const top = s.slice().sort((a, b) => (b.attempts || 0) - (a.attempts || 0)).slice(0, 5);

        return { count: s.length, totalAttempts, avgPass, bySubject, byStatus, top };
    },

    renderReports() {
        const r = this._report();
        const maxSubject = Math.max(1, ...Object.values(r.bySubject));

        const subjectBars = Object.entries(r.bySubject)
            .sort((a, b) => b[1] - a[1])
            .map(([name, n]) => `
                <div class="report-bar-row">
                    <div>${this._escape(name)}</div>
                    <div class="report-bar-track"><div class="report-bar-fill" style="width:${(n / maxSubject) * 100}%"></div></div>
                    <div style="text-align:right">${n}</div>
                </div>`).join('');

        const topRows = r.top.map(e => `
            <tr>
                <td>${this._escape(e.title)}</td>
                <td>${this._escape(e.subject) || '—'}</td>
                <td class="num">${(e.attempts || 0).toLocaleString()}</td>
                <td class="num">${e.pass_rate ? e.pass_rate + '%' : '—'}</td>
            </tr>`).join('');

        return `
            <div class="report-cards">
                <div class="report-card"><div class="rc-label">Total Exams</div><div class="rc-value">${r.count}</div></div>
                <div class="report-card"><div class="rc-label">Total Attempts</div><div class="rc-value">${r.totalAttempts.toLocaleString()}</div></div>
                <div class="report-card"><div class="rc-label">Avg Pass Rate</div><div class="rc-value">${r.avgPass}%</div><div class="rc-sub">across exams with attempts</div></div>
                <div class="report-card"><div class="rc-label">Published</div><div class="rc-value">${r.byStatus.published || 0}</div><div class="rc-sub">${r.byStatus.draft || 0} draft &middot; ${r.byStatus.archived || 0} archived</div></div>
            </div>

            <div class="detail-section">
                <h3>Exams by Subject</h3>
                ${subjectBars || '<div class="text-gray-500 text-sm">No data.</div>'}
            </div>

            <div class="detail-section">
                <h3>Most Attempted Exams</h3>
                <table class="report-table">
                    <thead><tr><th>Title</th><th>Subject</th><th class="num">Attempts</th><th class="num">Pass Rate</th></tr></thead>
                    <tbody>${topRows || '<tr><td colspan="4" class="text-gray-500">No attempts recorded.</td></tr>'}</tbody>
                </table>
            </div>
        `;
    },

    exportReportCsv() {
        // Build a CSV from the full store so the export is useful, not just the view slice.
        const cols = ['id', 'title', 'subject', 'grade', 'type', 'status', 'questions', 'duration', 'total_marks', 'pass_mark', 'author', 'year', 'attempts', 'avg_score', 'pass_rate'];
        const esc = (v) => {
            const s = v == null ? '' : String(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = [cols.join(',')];
        for (const e of this._store) lines.push(cols.map(c => esc(e[c])).join(','));
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'exam-report.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // ============================================
    // Helpers
    // ============================================
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

    _fmtSize(bytes) {
        if (!bytes && bytes !== 0) return '';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0, n = bytes;
        while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
        return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
    },
};

window.ExamsAdmin = ExamsAdmin;

document.addEventListener('DOMContentLoaded', () => {
    ExamsAdmin.init();
});
