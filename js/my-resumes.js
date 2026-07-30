/* =============================================
   MY-RESUMES.JS – "My Resumes" slide panel
   ─────────────────────────────────────────────
   Tab 1 – My Resumes  (is_deleted = false)
   Tab 2 – Trash       (is_deleted = true)
   Restore, Permanent Delete, Empty Trash,
   30-day auto-purge via ResumeDB.
   ============================================= */
'use strict';

window.MyResumesPanel = {

  _currentResumeId : null,
  _panel           : null,
  _isOpen          : false,
  _activeTab       : 'main',   /* 'main' | 'trash' */

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

        <!-- Tabs -->
        <div class="mr-tabs">
          <button class="mr-tab active" id="mrTabMain">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            My Resumes
          </button>
          <button class="mr-tab" id="mrTabTrash">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Trash
            <span class="mr-trash-count" id="mrTrashCount" style="display:none;"></span>
          </button>
        </div>

        <!-- ══ MAIN TAB ══ -->
        <div id="mrMainContent">
          <!-- Save bar -->
          <div class="mr-save-bar">
            <button class="mr-save-btn" id="mrSaveCurrent">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
              </svg>
              Save Current Resume
            </button>
            <button class="mr-delete-all-btn" id="mrDeleteAll" title="Move all to trash">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Delete All
            </button>
            <span class="mr-save-status" id="mrSaveStatus"></span>
          </div>

          <!-- List area -->
          <div class="mr-list-wrap">
            <div class="mr-loading" id="mrLoading" style="display:none;">
              <div class="mr-spinner"></div><span>Loading…</span>
            </div>
            <div class="mr-error-box" id="mrError" style="display:none;">
              <span id="mrErrorText"></span>
            </div>
            <div class="mr-empty" id="mrEmpty" style="display:none;">
              <div class="mr-empty-icon">📄</div>
              <h3>No saved resumes yet</h3>
              <p>Fill in your resume details and click <strong>"Save Current Resume"</strong> above, or click <strong>"Generate Resume"</strong> — it auto-saves when you're logged in.</p>
            </div>
            <ul class="mr-list" id="mrList" style="display:none;"></ul>
          </div>
        </div>

        <!-- ══ TRASH TAB ══ -->
        <div id="mrTrashContent" style="display:none;">
          <!-- Trash bar -->
          <div class="mr-trash-bar">
            <span class="mr-trash-info">
              🕐 Items auto-delete after <strong>30 days</strong>
            </span>
            <button class="mr-empty-trash-btn" id="mrEmptyTrash">Empty Trash</button>
          </div>

          <!-- Trash list area -->
          <div class="mr-list-wrap">
            <div class="mr-loading" id="mrTrashLoading" style="display:none;">
              <div class="mr-spinner"></div><span>Loading…</span>
            </div>
            <div class="mr-error-box" id="mrTrashError" style="display:none;">
              <span id="mrTrashErrorText"></span>
            </div>
            <div class="mr-empty" id="mrTrashEmpty" style="display:none;">
              <div class="mr-empty-icon">🗑️</div>
              <h3>Trash is empty</h3>
              <p>Deleted resumes appear here for <strong>30 days</strong> before being permanently removed.</p>
            </div>
            <ul class="mr-list" id="mrTrashList" style="display:none;"></ul>
          </div>
        </div>

      </aside>
    `);

    this._panel = document.getElementById('myResumesPanel');
  },

  /* ══════════════════════════════════
     BIND EVENTS
  ══════════════════════════════════ */
  _bindEvents() {
    document.getElementById('mrCloseBtn')    .addEventListener('click', () => this.close());
    document.getElementById('mrOverlay')     .addEventListener('click', () => this.close());
    document.getElementById('mrSaveCurrent') .addEventListener('click', () => this._saveCurrentResume());
    document.getElementById('mrDeleteAll')   .addEventListener('click', () => this._deleteAllResumes());
    document.getElementById('mrTabMain')     .addEventListener('click', () => this._switchTab('main'));
    document.getElementById('mrTabTrash')    .addEventListener('click', () => this._switchTab('trash'));
    document.getElementById('mrEmptyTrash')  .addEventListener('click', () => this._emptyTrash());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this._isOpen) this.close();
    });
  },

  /* ══════════════════════════════════
     TAB SWITCHING
  ══════════════════════════════════ */
  _switchTab(tab) {
    this._activeTab = tab;
    const isMain = tab === 'main';

    document.getElementById('mrTabMain').classList.toggle('active', isMain);
    document.getElementById('mrTabTrash').classList.toggle('active', !isMain);
    document.getElementById('mrMainContent').style.display  = isMain ? 'flex' : 'none';
    document.getElementById('mrTrashContent').style.display = isMain ? 'none' : 'flex';

    if (isMain) {
      this._loadList();
    } else {
      this._loadTrash();
    }
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

    /* Always open on Main tab */
    this._switchTab('main');
  },

  close() {
    this._isOpen = false;
    document.getElementById('mrOverlay').classList.remove('active');
    this._panel.classList.remove('open');
    document.body.style.overflow = '';
  },

  /* ══════════════════════════════════
     LOAD MAIN LIST
  ══════════════════════════════════ */
  async _loadList() {
    const loading  = document.getElementById('mrLoading');
    const errorBox = document.getElementById('mrError');
    const empty    = document.getElementById('mrEmpty');
    const list     = document.getElementById('mrList');
    const subtitle = document.getElementById('mrSubtitle');

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

      subtitle.textContent = `${data.length} saved resume${data.length !== 1 ? 's' : ''}`;
      list.innerHTML = '';
      data.forEach(r => list.appendChild(this._buildCard(r)));
      list.style.display = 'flex';

      window.ResumeApp?._updateResumeCountBadge?.();

    } catch (err) {
      loading.style.display  = 'none';
      errorBox.style.display = 'block';
      document.getElementById('mrErrorText').textContent = '⚠️ Unexpected error: ' + err.message;
    }
  },

  /* ══════════════════════════════════
     LOAD TRASH LIST
  ══════════════════════════════════ */
  async _loadTrash() {
    const loading  = document.getElementById('mrTrashLoading');
    const errorBox = document.getElementById('mrTrashError');
    const empty    = document.getElementById('mrTrashEmpty');
    const list     = document.getElementById('mrTrashList');
    const badge    = document.getElementById('mrTrashCount');

    loading.style.display  = 'flex';
    errorBox.style.display = 'none';
    empty.style.display    = 'none';
    list.style.display     = 'none';
    badge.style.display    = 'none';

    try {
      const { data, error } = await window.ResumeDB.fetchDeleted();
      loading.style.display = 'none';

      if (error) {
        errorBox.style.display = 'block';
        document.getElementById('mrTrashErrorText').textContent = '⚠️ ' + error;
        return;
      }

      if (!data || data.length === 0) {
        empty.style.display = 'flex';
        return;
      }

      /* Show count badge on tab */
      badge.textContent    = data.length;
      badge.style.display  = 'inline-flex';

      list.innerHTML = '';
      data.forEach(r => list.appendChild(this._buildTrashCard(r)));
      list.style.display = 'flex';

    } catch (err) {
      loading.style.display  = 'none';
      errorBox.style.display = 'block';
      document.getElementById('mrTrashErrorText').textContent = '⚠️ Unexpected error: ' + err.message;
    }
  },

  /* ══════════════════════════════════
     BUILD MAIN CARD
  ══════════════════════════════════ */
  _buildCard(resume) {
    const li      = document.createElement('li');
    li.className  = 'mr-card';
    li.dataset.id = resume.id;

    const isActive = resume.id === this._currentResumeId;
    if (isActive) li.classList.add('active');

    const date = new Date(resume.updated_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

    const TPL_LABELS = { 1: 'Simple', 2: 'Modern', 3: 'Professional', 4: 'Premium' };
    const TPL_COLORS = { 1: '#6B7280', 2: '#2563EB', 3: '#7C3AED', 4: '#1A2332' };
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
        <button class="mr-btn mr-btn-load" title="Load into editor">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </button>
        <button class="mr-btn mr-btn-download" data-pdf-url="${hasPDF ? this._esc(resume.pdf_url) : ''}" title="${hasPDF ? 'Download saved PDF' : 'Re-generate PDF'}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          ${hasPDF ? 'Download PDF' : 'Download'}
        </button>
        <button class="mr-btn mr-btn-delete" title="Move to trash">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
        </button>
      </div>
    `;

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
    li.querySelector('.mr-btn-delete').addEventListener('click', () => this._deleteResume(resume.id, li));

    return li;
  },

  /* ══════════════════════════════════
     BUILD TRASH CARD
  ══════════════════════════════════ */
  _buildTrashCard(resume) {
    const li      = document.createElement('li');
    li.className  = 'mr-card mr-trash-card';
    li.dataset.id = resume.id;

    const deletedDate = new Date(resume.deleted_at);
    const daysLeft    = Math.max(0, 30 - Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24)));
    const dateStr     = deletedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const TPL_LABELS = { 1: 'Simple', 2: 'Modern', 3: 'Professional', 4: 'Premium' };
    const tpl   = resume.template_id || 1;
    const label = TPL_LABELS[tpl] || 'Simple';

    li.innerHTML = `
      <div class="mr-card-main">
        <div class="mr-card-icon" style="background:rgba(148,163,184,0.1);color:#64748b;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </div>
        <div class="mr-card-info">
          <div class="mr-card-title mr-trash-title">${this._esc(resume.title)}</div>
          <div class="mr-card-meta">
            <span class="mr-tpl-badge" style="color:#64748b;background:rgba(148,163,184,0.15)">${label}</span>
            <span class="mr-card-date">Deleted ${dateStr}</span>
            <span class="mr-days-left ${daysLeft <= 5 ? 'urgent' : ''}">🕐 ${daysLeft}d left</span>
          </div>
        </div>
      </div>
      <div class="mr-card-actions">
        <button class="mr-btn mr-btn-restore" title="Restore resume">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/>
          </svg>
          Restore
        </button>
        <button class="mr-btn mr-btn-perm-delete" title="Delete permanently">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
          Delete Forever
        </button>
      </div>
    `;

    li.querySelector('.mr-btn-restore').addEventListener('click',      () => this._restoreResume(resume.id, li));
    li.querySelector('.mr-btn-perm-delete').addEventListener('click',  () => this._permanentDeleteResume(resume.id, li));

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

    const saved = JSON.stringify(window.ResumeApp.state);
    window.ResumeDB.loadIntoApp(data);
    await new Promise(r => setTimeout(r, 300));
    await window.PDFManager.exportPDF();

    const prev = JSON.parse(saved);
    window.ResumeDB.loadIntoApp({ resume_data: prev, template_id: prev.template });
    this.close();
  },

  /* ══════════════════════════════════
     SOFT DELETE (move to trash)
  ══════════════════════════════════ */
  async _deleteResume(id, cardEl) {
    if (!confirm('Move this resume to Trash?\n\nYou can restore it within 30 days.')) return;

    const { error } = await window.ResumeDB.softDelete(id);
    if (error) { window.ResumeApp?.showToast('❌ Failed: ' + error, 'error'); return; }

    if (this._currentResumeId === id) this._currentResumeId = null;

    /* Animate out */
    cardEl.style.cssText += ';transition:all 0.25s ease;opacity:0;transform:translateX(20px);';
    setTimeout(async () => {
      cardEl.remove();
      await this._loadList();
      window.ResumeApp?.showToast('🗑️ Moved to Trash — restore within 30 days', 'success');
      window.ResumeApp?._updateResumeCountBadge?.();
    }, 250);
  },

  /* ══════════════════════════════════
     SOFT DELETE ALL (move all to trash)
  ══════════════════════════════════ */
  async _deleteAllResumes() {
    const confirmed = await this._confirmModal({
      icon    : '🗑️',
      title   : 'Move All Resumes to Trash?',
      message : 'All your saved resumes will be moved to <strong>Trash</strong>.<br>You can restore them within <strong>30 days</strong>.',
      confirmText : 'Move to Trash',
      confirmColor: 'linear-gradient(135deg,#dc2626,#b91c1c)',
    });
    if (!confirmed) return;

    window.ResumeApp?.showToast('⏳ Moving to Trash…');
    const { error } = await window.ResumeDB.softDeleteAll();
    if (error) {
      window.ResumeApp?.showToast('❌ Failed: ' + error, 'error');
      return;
    }

    this._currentResumeId = null;
    window.ResumeApp?._updateResumeCountBadge?.();
    window.ResumeApp?.showToast('🗑️ All resumes moved to Trash', 'success');
    await this._loadList();
  },

  /* ══════════════════════════════════
     RESTORE
  ══════════════════════════════════ */
  async _restoreResume(id, cardEl) {
    const { error } = await window.ResumeDB.restore(id);
    if (error) { window.ResumeApp?.showToast('❌ Restore failed: ' + error, 'error'); return; }

    cardEl.style.cssText += ';transition:all 0.25s ease;opacity:0;transform:translateX(-20px);';
    setTimeout(async () => {
      cardEl.remove();
      await this._loadTrash();
      window.ResumeApp?.showToast('✅ Resume restored to My Resumes!', 'success');
      window.ResumeApp?._updateResumeCountBadge?.();
    }, 250);
  },

  /* ══════════════════════════════════
     PERMANENT DELETE (from trash)
  ══════════════════════════════════ */
  async _permanentDeleteResume(id, cardEl) {
    const confirmed = await this._confirmModal({
      icon    : '⚠️',
      title   : 'Delete Permanently?',
      message : 'This resume will be <strong>permanently deleted</strong> and cannot be recovered.',
      confirmText : 'Delete Forever',
      confirmColor: 'linear-gradient(135deg,#dc2626,#991b1b)',
    });
    if (!confirmed) return;

    const { error } = await window.ResumeDB.permanentDelete(id);
    if (error) { window.ResumeApp?.showToast('❌ Failed: ' + error, 'error'); return; }

    cardEl.style.cssText += ';transition:all 0.25s ease;opacity:0;transform:translateX(20px);';
    setTimeout(async () => {
      cardEl.remove();
      await this._loadTrash();
      window.ResumeApp?.showToast('🗑️ Permanently deleted', 'success');
    }, 250);
  },

  /* ══════════════════════════════════
     EMPTY TRASH
  ══════════════════════════════════ */
  async _emptyTrash() {
    const confirmed = await this._confirmModal({
      icon    : '🗑️',
      title   : 'Empty Trash?',
      message : 'All items in Trash will be <strong>permanently deleted</strong>.<br><span style="color:#dc2626;font-weight:600;">This cannot be undone.</span>',
      confirmText : 'Empty Trash',
      confirmColor: 'linear-gradient(135deg,#dc2626,#b91c1c)',
    });
    if (!confirmed) return;

    window.ResumeApp?.showToast('⏳ Emptying Trash…');
    const { error } = await window.ResumeDB.emptyTrash();
    if (error) {
      window.ResumeApp?.showToast('❌ Failed: ' + error, 'error');
      return;
    }

    window.ResumeApp?.showToast('✅ Trash emptied', 'success');
    await this._loadTrash();
  },

  /* ══════════════════════════════════
     SHARED CONFIRMATION MODAL
  ══════════════════════════════════ */
  _confirmModal({ icon, title, message, confirmText, confirmColor }) {
    return new Promise(resolve => {
      const backdrop = document.createElement('div');
      backdrop.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;';
      backdrop.innerHTML = `
        <div style="background:#fff;border-radius:20px;padding:32px 28px;max-width:400px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,0.22);text-align:center;">
          <div style="font-size:2.8rem;margin-bottom:12px;">${icon}</div>
          <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:8px;">${title}</div>
          <div style="font-size:13px;color:#64748b;line-height:1.7;margin-bottom:24px;">${message}</div>
          <div style="display:flex;gap:10px;">
            <button id="mrConfCancel" style="flex:1;padding:11px;border:1.5px solid #e2e8f0;border-radius:12px;background:#f8fafc;color:#374151;font-size:14px;font-weight:600;cursor:pointer;">Cancel</button>
            <button id="mrConfOk" style="flex:1;padding:11px;border:none;border-radius:12px;background:${confirmColor};color:#fff;font-size:14px;font-weight:700;cursor:pointer;">${confirmText}</button>
          </div>
        </div>`;
      document.body.appendChild(backdrop);
      backdrop.querySelector('#mrConfCancel').onclick = () => { backdrop.remove(); resolve(false); };
      backdrop.querySelector('#mrConfOk').onclick     = () => { backdrop.remove(); resolve(true); };
      backdrop.addEventListener('click', e => { if (e.target === backdrop) { backdrop.remove(); resolve(false); } });
    });
  },

  _esc: str => String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
};

document.addEventListener('DOMContentLoaded', () => {
  window.MyResumesPanel.init();
});
