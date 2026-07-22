/* =============================================
   RESUME-DB.JS – Supabase resume CRUD
   ─────────────────────────────────────────────
   Robust save / fetch / delete for resumes table.
   All errors are logged to console with details.
   ============================================= */
'use strict';

window.ResumeDB = {

  _autoSaveTimer : null,
  _autoSaveDelay : 20000, /* 20s debounce */

  /* ════════════════════════════════════════════
     SAVE  (insert new OR update existing)
  ════════════════════════════════════════════ */
  async save(resumeId = null) {
    const client = window.AuthManager?._client;
    const user   = window.AuthManager?._user;

    if (!client) { console.error('[ResumeDB] No Supabase client'); return { error: 'No client' }; }
    if (!user)   { console.error('[ResumeDB] No user logged in'); return { error: 'Not logged in' }; }

    /* Collect state safely */
    const state = window.ResumeApp?.state || {};
    const name  = (state.personal?.fullName || '').trim();
    const title = name ? `${name} — Resume` : 'Untitled Resume';

    /* Strip huge photo blobs */
    let photo = state.photo || { src: null, x: 0, y: 0, scale: 1 };
    if (photo.src && photo.src.length > 150000) photo = { ...photo, src: null };

    const resumeData = {
      personal      : state.personal       || {},
      skills        : state.skills         || [],
      education     : state.education      || [],
      experience    : state.experience     || [],
      projects      : state.projects       || [],
      customSections: state.customSections || [],
      photo,
    };

    const payload = {
      user_id     : user.id,
      title       : title.slice(0, 120),
      template_id : Number(state.template) || 1,
      resume_data : resumeData,
      updated_at  : new Date().toISOString(),
    };

    console.log('[ResumeDB] Saving…', { resumeId, userId: user.id, title });

    let result;
    if (resumeId) {
      /* UPDATE existing */
      result = await client
        .from('resumes')
        .update(payload)
        .eq('id', resumeId)
        .eq('user_id', user.id)
        .select('id, title, updated_at')
        .single();
    } else {
      /* INSERT new */
      result = await client
        .from('resumes')
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select('id, title, updated_at')
        .single();
    }

    if (result.error) {
      console.error('[ResumeDB] Save FAILED:', result.error);
      window.ResumeApp?.showToast('❌ Save failed: ' + result.error.message, 'error');
      return { error: result.error.message };
    }

    console.log('[ResumeDB] Saved OK:', result.data);
    return { data: result.data };
  },

  /* ════════════════════════════════════════════
     FETCH ALL  (list panel — no resume_data)
  ════════════════════════════════════════════ */
  async fetchAll() {
    const client = window.AuthManager?._client;
    const user   = window.AuthManager?._user;

    if (!client || !user) {
      console.warn('[ResumeDB] fetchAll: not logged in');
      return { data: [] };
    }

    console.log('[ResumeDB] Fetching all resumes for', user.id);

    const { data, error } = await client
      .from('resumes')
      .select('id, title, template_id, pdf_url, pdf_uploaded_at, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[ResumeDB] fetchAll FAILED:', error);
      return { error: error.message, data: [] };
    }

    console.log('[ResumeDB] fetchAll returned', data?.length, 'records');
    return { data: data || [] };
  },

  /* ════════════════════════════════════════════
     FETCH ONE  (full resume_data for editor)
  ════════════════════════════════════════════ */
  async fetchOne(id) {
    const client = window.AuthManager?._client;
    const user   = window.AuthManager?._user;
    if (!client || !user) return { error: 'Not logged in' };

    const { data, error } = await client
      .from('resumes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('[ResumeDB] fetchOne FAILED:', error);
      return { error: error.message };
    }
    return { data };
  },

  /* ════════════════════════════════════════════
     DELETE  (DB row + Storage PDF)
  ════════════════════════════════════════════ */
  async delete(id) {
    const client = window.AuthManager?._client;
    const user   = window.AuthManager?._user;
    if (!client || !user) return { error: 'Not logged in' };

    /* Try removing any stored PDFs first */
    try {
      const { data: files } = await client.storage
        .from('resume-pdfs')
        .list(user.id, { search: id });
      if (files?.length) {
        await client.storage
          .from('resume-pdfs')
          .remove(files.map(f => `${user.id}/${f.name}`));
      }
    } catch (e) { console.warn('[ResumeDB] Storage cleanup failed:', e); }

    const { error } = await client
      .from('resumes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) { console.error('[ResumeDB] Delete FAILED:', error); return { error: error.message }; }
    return { success: true };
  },

  /* ════════════════════════════════════════════
     LOAD INTO APP  (restore state + rebuild UI)
  ════════════════════════════════════════════ */
  loadIntoApp(resumeRecord) {
    const s = window.ResumeApp.state;
    const d = resumeRecord.resume_data || resumeRecord;

    s.personal       = d.personal       || {};
    s.skills         = d.skills         || [];
    s.education      = d.education      || [];
    s.experience     = d.experience     || [];
    s.projects       = d.projects       || [];
    s.customSections = d.customSections || [];
    s.template       = Number(resumeRecord.template_id) || Number(d.template) || 1;
    s.photo          = d.photo          || { src: null, x: 0, y: 0, scale: 1 };

    /* Rebuild form fields */
    window.FormManager?.populateForm?.();

    /* Switch template radio */
    const radio = document.querySelector(`input[name="template"][value="${s.template}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }

    window.ResumeApp?.schedulePreview?.();
  },

  /* ════════════════════════════════════════════
     AUTO-SAVE  (debounced on any form input)
  ════════════════════════════════════════════ */
  initAutoSave() {
    const panel = document.getElementById('panelForm') || document.body;

    const trigger = () => {
      if (!window.AuthManager?.isAuthenticated()) return;
      clearTimeout(this._autoSaveTimer);
      this._autoSaveTimer = setTimeout(() => this._doAutoSave(), this._autoSaveDelay);
    };

    panel.addEventListener('input',  trigger, { passive: true });
    panel.addEventListener('change', trigger, { passive: true });
    console.log('[ResumeDB] Auto-save watcher ready (20s debounce)');
  },

  async _doAutoSave() {
    const currentId = window.MyResumesPanel?.getCurrentId() || null;
    console.log('[ResumeDB] Auto-saving…', currentId);
    const { data, error } = await this.save(currentId);
    if (!error && data?.id) {
      window.MyResumesPanel?.setCurrentId(data.id);
      this._showSavedPill();
      window.ResumeApp?._updateResumeCountBadge?.();
    }
  },

  _showSavedPill() {
    let pill = document.getElementById('autoSavePill');
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'autoSavePill';
      pill.style.cssText = 'position:fixed;bottom:80px;right:24px;background:#059669;color:#fff;font-size:0.78rem;font-weight:700;padding:7px 16px;border-radius:20px;box-shadow:0 2px 12px rgba(0,0,0,0.18);z-index:9999;pointer-events:none;transition:opacity 0.5s ease;';
      document.body.appendChild(pill);
    }
    pill.textContent = '☁️ Auto-saved';
    pill.style.opacity = '1';
    clearTimeout(pill._t);
    pill._t = setTimeout(() => { pill.style.opacity = '0'; }, 2500);
  },
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => window.ResumeDB.initAutoSave(), 2000);
});
