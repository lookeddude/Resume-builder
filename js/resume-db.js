/* =============================================
   RESUME-DB.JS – Supabase resume CRUD
   ─────────────────────────────────────────────
   Supports soft-delete (Trash) with 30-day
   auto-purge, restore, and permanent delete.
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

    const state = window.ResumeApp?.state || {};
    const name  = (state.personal?.fullName || '').trim();
    const title = name ? `${name} — Resume` : 'Untitled Resume';

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
      is_deleted  : false,
    };

    console.log('[ResumeDB] Saving…', { resumeId, userId: user.id, title });

    let result;
    if (resumeId) {
      result = await client
        .from('resumes')
        .update(payload)
        .eq('id', resumeId)
        .eq('user_id', user.id)
        .select('id, title, updated_at')
        .single();
    } else {
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
     FETCH ALL  (active resumes only — is_deleted = false)
  ════════════════════════════════════════════ */
  async fetchAll() {
    const client = window.AuthManager?._client;
    const user   = window.AuthManager?._user;

    if (!client || !user) {
      console.warn('[ResumeDB] fetchAll: not logged in');
      return { data: [] };
    }

    const { data, error } = await client
      .from('resumes')
      .select('id, title, template_id, pdf_url, pdf_uploaded_at, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[ResumeDB] fetchAll FAILED:', error);
      return { error: error.message, data: [] };
    }

    return { data: data || [] };
  },

  /* ════════════════════════════════════════════
     FETCH DELETED  (trash — is_deleted = true)
     Also auto-purges items older than 30 days.
  ════════════════════════════════════════════ */
  async fetchDeleted() {
    const client = window.AuthManager?._client;
    const user   = window.AuthManager?._user;
    if (!client || !user) return { data: [] };

    /* Auto-purge items deleted > 30 days ago */
    await this._autoPurgeOldDeleted(client, user.id);

    const { data, error } = await client
      .from('resumes')
      .select('id, title, template_id, deleted_at, updated_at')
      .eq('user_id', user.id)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('[ResumeDB] fetchDeleted FAILED:', error);
      return { error: error.message, data: [] };
    }

    return { data: data || [] };
  },

  /* Auto-purge resumes deleted more than 30 days ago */
  async _autoPurgeOldDeleted(client, userId) {
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      /* Get IDs of expired resumes */
      const { data: expired } = await client
        .from('resumes')
        .select('id')
        .eq('user_id', userId)
        .eq('is_deleted', true)
        .lt('deleted_at', cutoff);

      if (!expired?.length) return;

      /* Try removing any stored PDFs */
      try {
        const { data: files } = await client.storage.from('resume-pdfs').list(userId);
        if (files?.length) {
          const expiredIds = new Set(expired.map(r => r.id));
          const toRemove = files
            .filter(f => expiredIds.has(f.name.split('.')[0]))
            .map(f => `${userId}/${f.name}`);
          if (toRemove.length) await client.storage.from('resume-pdfs').remove(toRemove);
        }
      } catch (e) { console.warn('[ResumeDB] Storage purge failed:', e); }

      /* Permanently delete expired rows */
      await client
        .from('resumes')
        .delete()
        .eq('user_id', userId)
        .eq('is_deleted', true)
        .lt('deleted_at', cutoff);

      console.log(`[ResumeDB] Auto-purged ${expired.length} expired trash item(s)`);
    } catch (e) {
      console.warn('[ResumeDB] Auto-purge failed:', e);
    }
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
     SOFT DELETE  (move to trash)
  ════════════════════════════════════════════ */
  async softDelete(id) {
    const client = window.AuthManager?._client;
    const user   = window.AuthManager?._user;
    if (!client || !user) return { error: 'Not logged in' };

    const { error } = await client
      .from('resumes')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) { console.error('[ResumeDB] SoftDelete FAILED:', error); return { error: error.message }; }
    console.log('[ResumeDB] Soft-deleted resume:', id);
    return { success: true };
  },

  /* Alias — existing delete() calls now soft-delete */
  async delete(id) { return this.softDelete(id); },

  /* ════════════════════════════════════════════
     SOFT DELETE ALL  (move all to trash)
  ════════════════════════════════════════════ */
  async softDeleteAll() {
    const client = window.AuthManager?._client;
    const user   = window.AuthManager?._user;
    if (!client || !user) return { error: 'Not logged in' };

    const { error } = await client
      .from('resumes')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_deleted', false);

    if (error) { console.error('[ResumeDB] SoftDeleteAll FAILED:', error); return { error: error.message }; }
    console.log('[ResumeDB] All resumes moved to trash for', user.id);
    return { success: true };
  },

  /* Alias — existing deleteAll() calls now soft-delete */
  async deleteAll() { return this.softDeleteAll(); },

  /* ════════════════════════════════════════════
     RESTORE  (move back from trash)
  ════════════════════════════════════════════ */
  async restore(id) {
    const client = window.AuthManager?._client;
    const user   = window.AuthManager?._user;
    if (!client || !user) return { error: 'Not logged in' };

    const { error } = await client
      .from('resumes')
      .update({ is_deleted: false, deleted_at: null })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) { console.error('[ResumeDB] Restore FAILED:', error); return { error: error.message }; }
    console.log('[ResumeDB] Restored resume:', id);
    return { success: true };
  },

  /* ════════════════════════════════════════════
     PERMANENT DELETE  (remove row + storage)
  ════════════════════════════════════════════ */
  async permanentDelete(id) {
    const client = window.AuthManager?._client;
    const user   = window.AuthManager?._user;
    if (!client || !user) return { error: 'Not logged in' };

    /* Clean up any stored PDFs first */
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

    if (error) { console.error('[ResumeDB] PermanentDelete FAILED:', error); return { error: error.message }; }
    console.log('[ResumeDB] Permanently deleted resume:', id);
    return { success: true };
  },

  /* ════════════════════════════════════════════
     EMPTY TRASH  (permanently delete all trash items)
  ════════════════════════════════════════════ */
  async emptyTrash() {
    const client = window.AuthManager?._client;
    const user   = window.AuthManager?._user;
    if (!client || !user) return { error: 'Not logged in' };

    /* Try removing stored PDFs for all trash items */
    try {
      const { data: files } = await client.storage.from('resume-pdfs').list(user.id);
      if (files?.length) {
        await client.storage.from('resume-pdfs').remove(files.map(f => `${user.id}/${f.name}`));
      }
    } catch (e) { console.warn('[ResumeDB] Storage emptyTrash cleanup failed:', e); }

    const { error } = await client
      .from('resumes')
      .delete()
      .eq('user_id', user.id)
      .eq('is_deleted', true);

    if (error) { console.error('[ResumeDB] EmptyTrash FAILED:', error); return { error: error.message }; }
    console.log('[ResumeDB] Trash emptied for', user.id);
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

    window.FormManager?.populateForm?.();

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
