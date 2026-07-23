/* =============================================
   TEMPLATES.JS – HTML generators for 3 templates
   Uses inline styles for WYSIWYG PDF fidelity
   ============================================= */

'use strict';

window.TemplateEngine = {

  // ─── Entry point ───
  render(state) {
    switch (state.template) {
      case 2: return this.template2(state);
      case 3: return this.template3(state);
      case 4: return this.template4(state);
      default: return this.template1(state);
    }
  },

  // ─── Shared helpers ───
  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  _nl2bullets(text) {
    if (!text) return '';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return '';
    if (lines.length === 1) return `<p style="margin:0;font-size:9.5pt;color:#475569;">${this._esc(lines[0])}</p>`;
    return `<ul style="margin:0;padding-left:16px;font-size:9.5pt;color:#475569;line-height:1.7;">${lines.map(l => `<li>${this._esc(l.replace(/^[•\-\*]\s*/,''))}</li>`).join('')}</ul>`;
  },

  _contactItems(p) {
    const items = [];
    if (p.email) items.push(`<span>✉ ${this._esc(p.email)}</span>`);
    if (p.phone) items.push(`<span>📞 ${this._esc(p.phone)}</span>`);
    if (p.address) items.push(`<span>📍 ${this._esc(p.address)}</span>`);
    if (p.linkedin) {
      const url = p.linkedin.replace(/^https?:\/\/(www\.)?/, '');
      items.push(`<span>🔗 ${this._esc(url)}</span>`);
    }
    return items;
  },

  // ===================================================
  // TEMPLATE 1 – SIMPLE
  // ===================================================
  template1(state) {
    const p = state.personal;
    const contactItems = this._contactItems(p);

    const sections = [];

    // Summary
    if (p.summary) {
      sections.push(`
        <div class="tpl1-section">
          <div class="tpl1-section-title">Professional Summary</div>
          <p class="tpl1-summary">${this._esc(p.summary)}</p>
        </div>
      `);
    }

    // Skills
    if (state.skills.length > 0) {
      const skillItems = state.skills.map(s => `<span class="tpl1-skill">${this._esc(s)}</span>`).join('');
      sections.push(`
        <div class="tpl1-section">
          <div class="tpl1-section-title">Skills</div>
          <div class="tpl1-skills-wrap">${skillItems}</div>
        </div>
      `);
    }

    // Experience
    if (state.experience.length > 0) {
      const entries = state.experience.map(e => `
        <div class="tpl1-entry">
          <div class="tpl1-entry-header">
            <span class="tpl1-entry-title">${this._esc(e.position || '')}</span>
            ${e.period ? `<span class="tpl1-entry-period">${this._esc(e.period)}</span>` : ''}
          </div>
          ${e.company ? `<div class="tpl1-entry-sub">${this._esc(e.company)}${e.location ? ` · ${this._esc(e.location)}` : ''}</div>` : ''}
          ${e.description ? `<div class="tpl1-entry-desc">${this._nl2bullets(e.description)}</div>` : ''}
        </div>
      `).join('');
      sections.push(`<div class="tpl1-section"><div class="tpl1-section-title">Work Experience</div>${entries}</div>`);
    }

    // Education
    if (state.education.length > 0) {
      const entries = state.education.map(e => `
        <div class="tpl1-entry">
          <div class="tpl1-entry-header">
            <span class="tpl1-entry-title">${this._esc(e.degree || '')}</span>
            ${e.period ? `<span class="tpl1-entry-period">${this._esc(e.period)}</span>` : ''}
          </div>
          ${e.school ? `<div class="tpl1-entry-sub">${this._esc(e.school)}${e.field ? ` · ${this._esc(e.field)}` : ''}${e.gpa ? ` · GPA: ${this._esc(e.gpa)}` : ''}</div>` : ''}
          ${e.description ? `<div class="tpl1-entry-desc">${this._nl2bullets(e.description)}</div>` : ''}
        </div>
      `).join('');
      sections.push(`<div class="tpl1-section"><div class="tpl1-section-title">Education</div>${entries}</div>`);
    }

    // Projects
    if (state.projects.length > 0) {
      const entries = state.projects.map(e => `
        <div class="tpl1-entry">
          <div class="tpl1-entry-header">
            <span class="tpl1-entry-title">${this._esc(e.name || '')}</span>
            ${e.period ? `<span class="tpl1-entry-period">${this._esc(e.period)}</span>` : ''}
          </div>
          ${e.tech ? `<div class="tpl1-entry-sub">${this._esc(e.tech)}${e.link ? ` · <a href="${this._esc(e.link)}" style="color:#444;">${this._esc(e.link.replace(/^https?:\/\//,''))}</a>` : ''}</div>` : ''}
          ${e.description ? `<div class="tpl1-entry-desc">${this._nl2bullets(e.description)}</div>` : ''}
        </div>
      `).join('');
      sections.push(`<div class="tpl1-section"><div class="tpl1-section-title">Projects</div>${entries}</div>`);
    }

    return `
      <div class="tpl1-root">
        <div class="tpl1-header">
          <div class="tpl1-name">${this._esc(p.fullName || 'Your Name')}</div>
          ${p.jobTitle ? `<div class="tpl1-title">${this._esc(p.jobTitle)}</div>` : ''}
          ${contactItems.length > 0 ? `<div class="tpl1-contact">${contactItems.join('')}</div>` : ''}
        </div>
        ${sections.join('')}
      </div>
    `;
  },

  // ===================================================
  // TEMPLATE 2 – MODERN (Blue header, two columns)
  // ===================================================
  template2(state) {
    const p = state.personal;
    const contactItems = this._contactItems(p);

    // LEFT COLUMN
    const leftParts = [];

    // Skills in left sidebar
    if (state.skills.length > 0) {
      const skillItems = state.skills.map(s => `
        <span class="tpl2-skill">${this._esc(s)}</span>
      `).join('');
      leftParts.push(`
        <div class="tpl2-section">
          <div class="tpl2-section-title">Skills</div>
          ${skillItems}
        </div>
      `);
    }

    // Education in left
    if (state.education.length > 0) {
      const entries = state.education.map(e => `
        <div class="tpl2-entry">
          <div class="tpl2-entry-title">${this._esc(e.degree || '')}</div>
          ${e.period ? `<div class="tpl2-entry-period">${this._esc(e.period)}</div>` : ''}
          ${e.school ? `<div class="tpl2-entry-sub">${this._esc(e.school)}</div>` : ''}
          ${e.field ? `<div style="font-size:8.5pt;color:#64748B;">${this._esc(e.field)}</div>` : ''}
          ${e.gpa ? `<div style="font-size:8.5pt;color:#64748B;">GPA: ${this._esc(e.gpa)}</div>` : ''}
        </div>
      `).join('');
      leftParts.push(`<div class="tpl2-section"><div class="tpl2-section-title">Education</div>${entries}</div>`);
    }

    // RIGHT COLUMN
    const rightParts = [];

    if (p.summary) {
      rightParts.push(`
        <div class="tpl2-section">
          <div class="tpl2-section-title">About Me</div>
          <p class="tpl2-summary">${this._esc(p.summary)}</p>
        </div>
      `);
    }

    if (state.experience.length > 0) {
      const entries = state.experience.map(e => `
        <div class="tpl2-entry">
          <div class="tpl2-entry-header">
            <span class="tpl2-entry-title">${this._esc(e.position || '')}</span>
            ${e.period ? `<span class="tpl2-entry-period">${this._esc(e.period)}</span>` : ''}
          </div>
          ${e.company ? `<div class="tpl2-entry-sub">${this._esc(e.company)}${e.location ? ` · ${this._esc(e.location)}` : ''}</div>` : ''}
          ${e.description ? `<div class="tpl2-entry-desc">${this._nl2bullets(e.description)}</div>` : ''}
        </div>
      `).join('');
      rightParts.push(`<div class="tpl2-section"><div class="tpl2-section-title">Work Experience</div>${entries}</div>`);
    }

    if (state.projects.length > 0) {
      const entries = state.projects.map(e => `
        <div class="tpl2-entry">
          <div class="tpl2-entry-header">
            <span class="tpl2-entry-title">${this._esc(e.name || '')}</span>
            ${e.period ? `<span class="tpl2-entry-period">${this._esc(e.period)}</span>` : ''}
          </div>
          ${e.tech ? `<div class="tpl2-entry-sub">${this._esc(e.tech)}</div>` : ''}
          ${e.description ? `<div class="tpl2-entry-desc">${this._nl2bullets(e.description)}</div>` : ''}
        </div>
      `).join('');
      rightParts.push(`<div class="tpl2-section"><div class="tpl2-section-title">Projects</div>${entries}</div>`);
    }

    return `
      <div class="tpl2-root">
        <div class="tpl2-header">
          <div class="tpl2-name">${this._esc(p.fullName || 'Your Name')}</div>
          ${p.jobTitle ? `<div class="tpl2-title">${this._esc(p.jobTitle)}</div>` : ''}
          ${contactItems.length > 0 ? `<div class="tpl2-contact">${contactItems.join('')}</div>` : ''}
        </div>
        <div class="tpl2-body">
          <div class="tpl2-grid">
            <div class="tpl2-left">${leftParts.join('') || '<p style="color:#94A3B8;font-size:9pt;">Add skills and education...</p>'}</div>
            <div class="tpl2-right">${rightParts.join('') || '<p style="color:#94A3B8;font-size:9pt;">Fill in your experience and summary...</p>'}</div>
          </div>
        </div>
      </div>
    `;
  },

  // ===================================================
  // TEMPLATE 3 – PROFESSIONAL (Photo + custom sections)
  // ===================================================
  template3(state) {
    const p = state.personal;
    const photo = state.photo;
    const contactItems = this._contactItems(p);

    // Build photo HTML – use pre-cropped image when available (WYSIWYG)
    let photoHtml;
    if (photo.croppedSrc) {
      /* croppedSrc is a 120px canvas crop – no CSS transforms needed */
      photoHtml = `
        <div class="tpl3-photo-container" style="width:110px;height:110px;border-radius:50%;overflow:hidden;position:relative;background:#334155;border:3px solid rgba(255,255,255,0.3);box-shadow:0 0 0 6px rgba(255,255,255,0.08);flex-shrink:0;">
          <img src="${photo.croppedSrc}" alt="Profile" style="width:110px;height:110px;object-fit:cover;display:block;" />
        </div>`;
    } else if (photo.src) {
      /* Fallback: CSS-transform approach (before first adjustment) */
      const tx = photo.x || 0, ty = photo.y || 0, sc = photo.scale || 1;
      photoHtml = `
        <div class="tpl3-photo-container" style="width:110px;height:110px;border-radius:50%;overflow:hidden;position:relative;background:#334155;border:3px solid rgba(255,255,255,0.3);box-shadow:0 0 0 6px rgba(255,255,255,0.08);flex-shrink:0;">
          <img src="${photo.src}" style="position:absolute;top:0;left:0;transform:translate(${tx}px,${ty}px) scale(${sc});transform-origin:top left;pointer-events:none;user-select:none;max-width:none;max-height:none;" alt="Profile photo" />
        </div>`;
    } else {
      photoHtml = `
        <div class="tpl3-photo-container tpl3-photo-placeholder" style="width:110px;height:110px;border-radius:50%;overflow:hidden;background:#334155;border:3px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:2.5rem;color:rgba(255,255,255,0.3);flex-shrink:0;">
          👤
        </div>`;
    }

    // SIDEBAR
    const sidebarParts = [];

    if (state.skills.length > 0) {
      const skillItems = state.skills.map(s => `
        <div class="tpl3-skill">
          <span style="display:flex;align-items:center;gap:8px;">
            <span class="tpl3-skill-dot" style="width:6px;height:6px;border-radius:50%;background:#7C3AED;flex-shrink:0;display:inline-block;"></span>
            ${this._esc(s)}
          </span>
        </div>
      `).join('');
      sidebarParts.push(`
        <div class="tpl3-section">
          <div class="tpl3-section-title" style="font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#7C3AED;border-bottom:2px solid #EDE9FE;margin-bottom:10px;padding-bottom:5px;">Skills</div>
          ${skillItems}
        </div>
      `);
    }

    if (state.education.length > 0) {
      const entries = state.education.map(e => `
        <div style="margin-bottom:12px;">
          <div style="font-weight:700;font-size:9.5pt;color:#0f172a;">${this._esc(e.degree || '')}</div>
          ${e.school ? `<div style="font-size:9pt;color:#7C3AED;font-weight:500;">${this._esc(e.school)}</div>` : ''}
          ${e.field ? `<div style="font-size:8.5pt;color:#64748B;">${this._esc(e.field)}</div>` : ''}
          ${e.period ? `<div style="font-size:8.5pt;color:#94A3B8;">${this._esc(e.period)}</div>` : ''}
          ${e.gpa ? `<div style="font-size:8.5pt;color:#64748B;">GPA: ${this._esc(e.gpa)}</div>` : ''}
        </div>
      `).join('');
      sidebarParts.push(`
        <div class="tpl3-section">
          <div class="tpl3-section-title" style="font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#7C3AED;border-bottom:2px solid #EDE9FE;margin-bottom:10px;padding-bottom:5px;">Education</div>
          ${entries}
        </div>
      `);
    }

    // Custom sections in sidebar
    if (state.customSections.length > 0) {
      state.customSections.forEach(cs => {
        sidebarParts.push(`
          <div class="tpl3-section">
            <div class="tpl3-section-title" style="font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#059669;border-bottom:2px solid #D1FAE5;margin-bottom:10px;padding-bottom:5px;">${this._esc(cs.title)}</div>
            <div style="font-size:9.5pt;color:#475569;line-height:1.7;">${this._esc(cs.content).replace(/\n/g,'<br>')}</div>
          </div>
        `);
      });
    }

    // MAIN CONTENT
    const mainParts = [];

    if (p.summary) {
      mainParts.push(`
        <div class="tpl3-section">
          <div class="tpl3-section-title" style="font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#1D4ED8;border-bottom:2px solid #BFDBFE;margin-bottom:10px;padding-bottom:5px;">Professional Summary</div>
          <p class="tpl3-summary" style="font-size:9.5pt;color:#475569;line-height:1.7;margin:0;">${this._esc(p.summary)}</p>
        </div>
      `);
    }

    if (state.experience.length > 0) {
      const entries = state.experience.map(e => `
        <div class="tpl3-entry" style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:3px;">
            <span style="font-weight:700;font-size:10.5pt;color:#0f172a;">${this._esc(e.position || '')}</span>
            ${e.period ? `<span style="font-size:8.5pt;white-space:nowrap;background:#EFF6FF;padding:2px 8px;border-radius:100px;color:#1D4ED8;">${this._esc(e.period)}</span>` : ''}
          </div>
          ${e.company ? `<div style="font-size:9.5pt;color:#7C3AED;font-weight:500;margin-bottom:5px;">${this._esc(e.company)}${e.location ? ` · ${this._esc(e.location)}` : ''}</div>` : ''}
          ${e.description ? `<div>${this._nl2bullets(e.description)}</div>` : ''}
        </div>
      `).join('');
      mainParts.push(`
        <div class="tpl3-section">
          <div class="tpl3-section-title" style="font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#1D4ED8;border-bottom:2px solid #BFDBFE;margin-bottom:10px;padding-bottom:5px;">Work Experience</div>
          ${entries}
        </div>
      `);
    }

    if (state.projects.length > 0) {
      const entries = state.projects.map(e => `
        <div class="tpl3-entry" style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:3px;">
            <span style="font-weight:700;font-size:10.5pt;color:#0f172a;">${this._esc(e.name || '')}</span>
            ${e.period ? `<span style="font-size:8.5pt;white-space:nowrap;background:#EFF6FF;padding:2px 8px;border-radius:100px;color:#1D4ED8;">${this._esc(e.period)}</span>` : ''}
          </div>
          ${e.tech ? `<div style="font-size:9.5pt;color:#7C3AED;font-weight:500;margin-bottom:5px;">${this._esc(e.tech)}${e.link ? ` · <a href="${this._esc(e.link)}" style="color:#1D4ED8;">${this._esc(e.link.replace(/^https?:\/\//,''))}</a>` : ''}</div>` : ''}
          ${e.description ? `<div>${this._nl2bullets(e.description)}</div>` : ''}
        </div>
      `).join('');
      mainParts.push(`
        <div class="tpl3-section">
          <div class="tpl3-section-title" style="font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#1D4ED8;border-bottom:2px solid #BFDBFE;margin-bottom:10px;padding-bottom:5px;">Projects</div>
          ${entries}
        </div>
      `);
    }

    return `
      <div class="tpl3-root">
        <div class="tpl3-header" style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 60%,#1D4ED8 100%);padding:40px 52px;display:flex;align-items:center;gap:32px;">
          ${photoHtml}
          <div class="tpl3-header-info" style="flex:1;">
            <div class="tpl3-name" style="font-size:27pt;font-weight:800;color:#ffffff;letter-spacing:-0.5px;margin-bottom:4px;">${this._esc(p.fullName || 'Your Name')}</div>
            ${p.jobTitle ? `<div class="tpl3-title" style="font-size:11pt;color:rgba(255,255,255,0.75);margin-bottom:14px;font-weight:400;">${this._esc(p.jobTitle)}</div>` : ''}
            ${contactItems.length > 0 ? `<div class="tpl3-contact" style="display:flex;flex-wrap:wrap;gap:5px 16px;font-size:8.5pt;color:rgba(255,255,255,0.7);">${contactItems.join('')}</div>` : ''}
          </div>
        </div>
        <div class="tpl3-body" style="display:grid;grid-template-columns:220px 1fr;">
          <div class="tpl3-sidebar" style="background:#F8FAFC;border-right:1px solid #E2E8F0;padding:32px 24px;">
            ${sidebarParts.join('') || '<p style="color:#94A3B8;font-size:9pt;">Add skills and education...</p>'}
          </div>
          <div class="tpl3-main" style="padding:32px 40px;">
            ${mainParts.join('') || '<p style="color:#94A3B8;font-size:9pt;">Fill in your experience and summary...</p>'}
          </div>
        </div>
      </div>
    `;
  },

  // ===================================================
  // TEMPLATE 4 – PREMIUM (Dark sidebar + rich main)
  // ===================================================
  template4(state) {
    const p     = state.personal;
    const photo = state.photo;

    /* ── Photo ── */
    let photoHtml;
    if (photo.croppedSrc) {
      /* Pre-cropped at 120px – renders identically in preview and PDF */
      photoHtml = `
        <div style="width:110px;height:110px;border-radius:50%;overflow:hidden;position:relative;
                    border:3px solid #3B82F6;box-shadow:0 0 0 5px rgba(59,130,246,0.2);margin:0 auto 20px;">
          <img src="${photo.croppedSrc}" alt="Profile" style="width:110px;height:110px;object-fit:cover;display:block;" />
        </div>`;
    } else if (photo.src) {
      const tx = photo.x || 0, ty = photo.y || 0, sc = photo.scale || 1;
      photoHtml = `
        <div style="width:100px;height:100px;border-radius:50%;overflow:hidden;position:relative;
                    border:3px solid #3B82F6;box-shadow:0 0 0 5px rgba(59,130,246,0.2);margin:0 auto 20px;">
          <img src="${photo.src}"
               style="position:absolute;top:0;left:0;transform:translate(${tx}px,${ty}px) scale(${sc});
                      transform-origin:top left;pointer-events:none;user-select:none;max-width:none;max-height:none;"
               alt="Profile photo" />
        </div>`;
    } else {
      photoHtml = `
        <div style="width:100px;height:100px;border-radius:50%;overflow:hidden;background:#2D3748;
                    border:3px solid #3B82F6;box-shadow:0 0 0 5px rgba(59,130,246,0.2);
                    margin:0 auto 20px;display:flex;align-items:center;justify-content:center;
                    font-size:2.8rem;color:rgba(255,255,255,0.25);">👤</div>`;
    }

    /* ── Sidebar ── */
    const sidebarParts = [photoHtml];

    /* Contact */
    const contactRows = [];
    if (p.email)    contactRows.push(`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;"><span style="font-size:10pt;min-width:16px;">✉</span><span style="word-break:break-all;font-size:8.5pt;">${this._esc(p.email)}</span></div>`);
    if (p.phone)    contactRows.push(`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;"><span style="font-size:10pt;min-width:16px;">📞</span><span style="font-size:8.5pt;">${this._esc(p.phone)}</span></div>`);
    if (p.address)  contactRows.push(`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;"><span style="font-size:10pt;min-width:16px;">📍</span><span style="font-size:8.5pt;">${this._esc(p.address)}</span></div>`);
    if (p.linkedin) { const url = p.linkedin.replace(/^https?:\/\/(www\.)?/,''); contactRows.push(`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;"><span style="font-size:10pt;min-width:16px;">🔗</span><span style="word-break:break-all;font-size:8.5pt;">${this._esc(url)}</span></div>`); }

    if (contactRows.length > 0) {
      sidebarParts.push(`
        <div style="margin-bottom:20px;">
          <div style="font-size:7.5pt;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#60A5FA;
                      border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:6px;margin-bottom:10px;">Contact</div>
          <div style="color:rgba(255,255,255,0.75);">${contactRows.join('')}</div>
        </div>`);
    }

    /* Skills */
    if (state.skills.length > 0) {
      const pills = state.skills.map(s =>
        `<span style="display:inline-block;text-align:center;vertical-align:middle;
                background:rgba(59,130,246,0.18);color:#93C5FD;
                font-size:7.5pt;height:20px;line-height:20px;padding:0 10px;
                border-radius:100px;margin:3px 3px;
                border:1px solid rgba(59,130,246,0.3);
                white-space:nowrap;box-sizing:border-box;">${this._esc(s)}</span>`
      ).join('');
      sidebarParts.push(`
        <div style="margin-bottom:20px;">
          <div style="font-size:7.5pt;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#60A5FA;
                      border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:6px;margin-bottom:10px;">Skills</div>
          <div style="width:180px;max-width:100%;text-align:left;line-height:2.4;">${pills}</div>
        </div>`);
    }

    /* Education in sidebar */
    if (state.education.length > 0) {
      const eduRows = state.education.map(e => `
        <div style="margin-bottom:12px;">
          <div style="font-size:8.5pt;font-weight:700;color:rgba(255,255,255,0.9);">${this._esc(e.degree || '')}</div>
          ${e.school ? `<div style="font-size:8pt;color:#93C5FD;">${this._esc(e.school)}</div>` : ''}
          ${e.field  ? `<div style="font-size:7.5pt;color:rgba(255,255,255,0.5);">${this._esc(e.field)}</div>` : ''}
          ${e.period ? `<div style="font-size:7.5pt;color:rgba(255,255,255,0.45);">${this._esc(e.period)}</div>` : ''}
          ${e.gpa    ? `<div style="font-size:7.5pt;color:rgba(255,255,255,0.5);">CGPA: ${this._esc(e.gpa)}</div>` : ''}
        </div>`).join('');
      sidebarParts.push(`
        <div style="margin-bottom:20px;">
          <div style="font-size:7.5pt;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#60A5FA;
                      border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:6px;margin-bottom:10px;">Education</div>
          ${eduRows}
        </div>`);
    }

    /* ── Main content ── */
    const mainParts = [];

    /* Summary → Executive Profile */
    if (p.summary) {
      mainParts.push(`
        <div style="margin-bottom:22px;">
          <div style="font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#0f172a;
                      border-bottom:2px solid #E2E8F0;padding-bottom:6px;margin-bottom:10px;">Executive Profile</div>
          <p style="font-size:9.5pt;color:#475569;line-height:1.75;margin:0;">${this._esc(p.summary)}</p>
        </div>`);
    }

    /* Work Experience */
    if (state.experience.length > 0) {
      const entries = state.experience.map(e => `
        <div style="margin-bottom:18px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <span style="font-weight:700;font-size:10pt;color:#0f172a;">${this._esc(e.company || '')}</span>
            <span style="font-size:8pt;color:#64748B;white-space:nowrap;">${this._esc(e.period || '')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            ${e.position ? `<span style="font-size:9pt;color:#1D4ED8;font-weight:500;">${this._esc(e.position)}</span>` : '<span></span>'}
            ${e.location ? `<span style="font-size:8pt;color:#7C3AED;">${this._esc(e.location)}</span>` : ''}
          </div>
          ${e.description ? `<div>${this._nl2bullets(e.description)}</div>` : ''}
        </div>`).join('');
      mainParts.push(`
        <div style="margin-bottom:22px;">
          <div style="font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#0f172a;
                      border-bottom:2px solid #E2E8F0;padding-bottom:6px;margin-bottom:12px;">Work Experience</div>
          ${entries}
        </div>`);
    }

    /* Projects */
    if (state.projects.length > 0) {
      const entries = state.projects.map(e => `
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <span style="font-weight:700;font-size:10pt;color:#0f172a;">${this._esc(e.name || '')}</span>
            ${e.tech ? `<span style="font-size:8pt;color:#64748B;font-style:italic;">${this._esc(e.tech)}</span>` : ''}
          </div>
          ${e.description ? `<div style="margin-top:4px;">${this._nl2bullets(e.description)}</div>` : ''}
        </div>`).join('');
      mainParts.push(`
        <div style="margin-bottom:22px;">
          <div style="font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#0f172a;
                      border-bottom:2px solid #E2E8F0;padding-bottom:6px;margin-bottom:12px;">Projects</div>
          ${entries}
        </div>`);
    }

    /* Custom sections (Certifications, Languages, etc.) */
    state.customSections.forEach(cs => {
      const lines = (cs.content || '').split('\n').filter(l => l.trim());
      const listHtml = lines.map(l => `<div style="font-size:9.5pt;color:#475569;padding:2px 0;">- ${this._esc(l.replace(/^[\-\u2022]\s*/,''))}</div>`).join('');
      mainParts.push(`
        <div style="margin-bottom:22px;">
          <div style="font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#0f172a;
                      border-bottom:2px solid #E2E8F0;padding-bottom:6px;margin-bottom:10px;">${this._esc(cs.title)}</div>
          ${listHtml || `<p style="font-size:9.5pt;color:#94A3B8;">Add content...</p>`}
        </div>`);
    });

    return `
      <div style="display:flex;min-height:100%;font-family:'Inter','Segoe UI',sans-serif;">
        <!-- Sidebar -->
        <div style="width:220px;flex-shrink:0;background:#1A2332;padding:30px 20px;color:rgba(255,255,255,0.8);">
          ${sidebarParts.join('')}
        </div>
        <!-- Main -->
        <div style="flex:1;padding:36px 40px;background:#fff;">
          <div style="margin-bottom:18px;">
            <div style="font-size:24pt;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.1;">${this._esc(p.fullName || 'Your Name')}</div>
            ${p.jobTitle ? `<div style="font-size:11pt;color:#1D4ED8;font-weight:500;margin-top:4px;">${this._esc(p.jobTitle)}</div>` : ''}
          </div>
          ${mainParts.join('') || '<p style="color:#94A3B8;font-size:9pt;">Fill in your details...</p>'}
        </div>
      </div>`;
  }
};
