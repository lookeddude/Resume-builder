/* =============================================
   MY-RESUMES.JS – "My Resumes" slide panel
   ─────────────────────────────────────────────
   Shows all saved resumes for the logged-in user.
   Each card: Edit (load into form), Download PDF,
   Delete. Save Current Resume button at top.
   ============================================= */
'use strict';

window.MyResumesPanel = {

  _currentResumeId : null,
  _panel           : null,
  _isOpen          : false,

  /* ── Init ── */
  init() {
    this._injectPanel();
    this._bindEvents();
  },

  setCurrentId(id) { this._currentResumeId = id; },
  getCurrentId()   { return this._currentResumeId; },

  /* ══════════════════════════════════
     INJECT PANEL HTML
  ══════════════════════════════════ */
  _injectPanel() {
    if (document.getElementById('myResumesPanel')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div class="mr-overlay" id="mrOverlay"></div>
      <aside class="mr-panel" id="myResumesPanel" role="dialog" aria-label="My Resumes">

        <!-- Header -->
        <div class="mr-header">
          <div class="mr-header-left">
            <span class="mr-icon">📂</span>
            <div>
              <h2 class="mr-title">My Resumes</h2>
              <p class="mr-subtitle" id="mrSubtitle">Your saved resumes</p>
            </div>
          </div>
          <button class="mr-close-btn" id="mrCloseBtn" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Save bar -->
        <div class="mr-save-bar">
          <button class="mr-save-btn" id="mrSaveCurrent">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Save Current Resume
          </button>
          <span class="mr-save-status" id="mrSaveStatus"></span>
        </div>

        <!-- List area -->
        <div class="mr-list-wrap">
          <!-- Loading -->
          <div class="mr-loading" id="mrLoading" style="display:none;">
            <div class="mr-spinner"></div><span>Loading…</span>
          </div>

          <!-- Error -->
          <div class="mr-error-box" id="mrError" style="display:none;">
            <span id="mrErrorText"></span>
          </div>

          <!-- Empty -->
          <div class="mr-empty" id="mrEmpty" style="display:none;">
            <div class="mr-empty-icon">📄</div>
            <h3>No saved resumes yet</h3>
            <p>Fill in your resume details and click <strong>"Save Current Resume"</strong> above, or click <strong>"Generate Resume"</strong> — it auto-saves when you're logged in.</p>
          </div>

          <!-- Cards -->
          <ul class="mr-list" id="mrList" style="display:none;"></ul>
        </div>

      </aside>
    `);

    this._panel = document.getElementById('myResumesPanel');
  },

  /* ══════════════════════════════════
     BIND EVENTS
  ══════════════════════════════════ */
  _bindEvents() {
    document.getElementById('mrCloseBtn') .addEventListener('click', () => this.close());
    document.getElementById('mrOverlay')  .addEventListener('click', () => this.close());
    document.getElementById('mrSaveCurrent').addEventListener('click', () => this._saveCurrentResume());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this._isOpen) this.close();
    });
  },

  /* ══════════════════════════════════
     OPEN / CLOSE
  ══════════════════════════════════ */
  async open() {
    if (!window.AuthManager?.isAuthenticated()) {
      window.AuthManager?._showModal('login', () => this.open());
      return;
    }
    this._isOpen = true;
    document.getElementById('mrOverlay').classList.add('active');
    this._panel.classList.add('open');
    document.body.style.overflow = 'hidden';
    await this._loadList();
  },

  close() {
    this._isOpen = false;
    document.getElementById('mrOverlay').classList.remove('active');
    this._panel.classList.remove('open');
    document.body.style.overflow = '';
  },

  /* ══════════════════════════════════
     LOAD LIST
  ══════════════════════════════════ */
  async _loadList() {
    const loading  = document.getElementById('mrLoading');
    const errorBox = document.getElementById('mrError');
    const empty    = document.getElementById('mrEmpty');
    const list     = document.getElementById('mrList');
    const subtitle = document.getElementById('mrSubtitle');

    /* Show loading state */
    loading.style.display  = 'flex';
    errorBox.style.display = 'none';
    empty.style.display    = 'none';
    list.style.display     = 'none';

    try {
      const { data, error } = await window.ResumeDB.fetchAll();

      loading.style.display = 'none';

      if (error) {
        errorBox.style.display = 'block';
        document.getElementById('mrErrorText').textContent = '⚠️ Could not load resumes: ' + error;
        subtitle.textContent = 'Error loading';
        return;
      }

      if (!data || data.length === 0) {
        empty.style.display  = 'flex';
        subtitle.textContent = 'No resumes saved yet';
        return;
      }

      /* Render cards */
      subtitle.textContent = `${data.length} saved resume${data.length !== 1 ? 's' : ''}`;
      list.innerHTML = '';
      data.forEach(r => list.appendChild(this._buildCard(r)));
      list.style.display = 'flex';

      /* Update header badge */
      window.ResumeApp?._updateResumeCountBadge?.();

    } catch (err) {
      loading.style.display  = 'none';
      errorBox.style.display = 'block';
      document.getElementById('mrErrorText').textContent = '⚠️ Unexpected error: ' + err.message;
    }
  },

  /* ══════════════════════════════════
     BUILD CARD
  ══════════════════════════════════ */
  _buildCard(resume) {
    const li       = document.createElement('li');
    li.className   = 'mr-card';
    li.dataset.id  = resume.id;

    const isActive = resume.id === this._currentResumeId;
    if (isActive) li.classList.add('active');

    const date = new Date(resume.updated_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

    const TPL_LABELS = { 1: 'Simple', 2: 'Modern', 3: 'Professional' };
    const TPL_COLORS = { 1: '#6B7280', 2: '#2563EB', 3: '#7C3AED' };
    const tpl   = resume.template_id || 1;
    const label = TPL_LABELS[tpl] || 'Simple';
    const color = TPL_COLORS[tpl] || '#6B7280';
    const hasPDF = !!resume.pdf_url;

    li.innerHTML = `
      <div class="mr-card-main">
        <div class="mr-card-icon" style="background:${color}18;color:${color}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div class="mr-card-info">
          <div class="mr-card-title">${this._esc(resume.title)}</div>
          <div class="mr-card-meta">
            <span class="mr-tpl-badge" style="color:${color};background:${color}18">${label}</span>
            ${hasPDF ? '<span class="mr-pdf-badge">☁️ PDF saved</span>' : ''}
            <span class="mr-card-date">Saved ${date}</span>
          </div>
        </div>
        ${isActive ? '<span class="mr-active-dot" title="Currently editing"></span>' : ''}
      </div>
      <div class="mr-card-actions">
        <button class="mr-btn mr-btn-load"     title="Load into editor">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </button>
        <button class="mr-btn mr-btn-download" data-pdf-url="${hasPDF ? this._esc(resume.pdf_url) : ''}" title="${hasPDF ? 'Download saved PDF' : 'Re-generate PDF'}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          ${hasPDF ? 'Download PDF' : 'Download'}
        </button>
        <button class="mr-btn mr-btn-delete" title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
        </button>
      </div>
    `;

    /* Wire buttons */
    li.querySelector('.mr-btn-load').addEventListener('click',     () => this._loadResume(resume.id));
    li.querySelector('.mr-btn-download').addEventListener('click', (e) => {
      const url = e.currentTarget.dataset.pdfUrl;
      if (url) {
        const a = Object.assign(document.createElement('a'), { href: url, target: '_blank', download: resume.title + '.pdf' });
        a.click();
        window.ResumeApp?.showToast('☁️ Downloading from cloud…', 'success');
      } else {
        this._reDownload(resume.id);
      }
    });
    li.querySelector('.mr-btn-delete').addEventListener('click',   () => this._deleteResume(resume.id, li));

    return li;
  },

  /* ══════════════════════════════════
     SAVE CURRENT
  ══════════════════════════════════ */
  async _saveCurrentResume() {
    const btn    = document.getElementById('mrSaveCurrent');
    const status = document.getElementById('mrSaveStatus');

    btn.disabled  = true;
    btn.innerHTML = '<div class="mr-btn-spinner"></div> Saving…';
    status.textContent = '';
    status.className   = 'mr-save-status';

    const { data, error } = await window.ResumeDB.save(this._currentResumeId);

    btn.disabled  = false;
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
      </svg>
      Save Current Resume`;

    if (error) {
      status.textContent = '❌ ' + error;
      status.className   = 'mr-save-status error';
    } else {
      this._currentResumeId = data.id;
      status.textContent    = '✅ Saved!';
      status.className      = 'mr-save-status success';
      setTimeout(() => { status.textContent = ''; }, 3000);
      await this._loadList();
    }
  },

  /* ══════════════════════════════════
     LOAD RESUME INTO EDITOR
  ══════════════════════════════════ */
  async _loadResume(id) {
    window.ResumeApp?.showToast('⏳ Loading resume…');
    const { data, error } = await window.ResumeDB.fetchOne(id);
    if (error) {
      window.ResumeApp?.showToast('❌ Failed to load: ' + error, 'error');
      return;
    }
    this._currentResumeId = id;
    window.ResumeDB.loadIntoApp(data);
    window.ResumeApp?.showToast('✅ Resume loaded — ready to edit!', 'success');
    this.close();
  },

  /* ══════════════════════════════════
     RE-GENERATE PDF (no stored URL)
  ══════════════════════════════════ */
  async _reDownload(id) {
    const { data, error } = await window.ResumeDB.fetchOne(id);
    if (error) { window.ResumeApp?.showToast('❌ ' + error, 'error'); return; }

    /* Stash current state */
    const saved = JSON.stringify(window.ResumeApp.state);
    window.ResumeDB.loadIntoApp(data);
    await new Promise(r => setTimeout(r, 300));
    await window.PDFManager.exportPDF();

    /* Restore */
    const prev = JSON.parse(saved);
    window.ResumeDB.loadIntoApp({ resume_data: prev, template_id: prev.template });
    this.close();
  },

  /* ══════════════════════════════════
     DELETE
  ══════════════════════════════════ */
  async _deleteResume(id, cardEl) {
    if (!confirm('Delete this resume permanently?\n\nThis cannot be undone.')) return;

    const { error } = await window.ResumeDB.delete(id);
    if (error) { window.ResumeApp?.showToast('❌ Delete failed: ' + error, 'error'); return; }

    if (this._currentResumeId === id) this._currentResumeId = null;

    /* Animate out */
    cardEl.style.cssText += ';transition:all 0.25s ease;opacity:0;transform:translateX(20px);';
    setTimeout(async () => {
      cardEl.remove();
      await this._loadList();
      window.ResumeApp?.showToast('🗑️ Resume deleted', 'success');
    }, 250);
  },

  _esc: str => String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
};

document.addEventListener('DOMContentLoaded', () => {
  window.MyResumesPanel.init();
});
