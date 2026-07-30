/* =============================================
   FORM.JS – Live form binding, validation,
             dynamic entries, skills tags
   ============================================= */

'use strict';

window.FormManager = {

  // ─── Counters for unique entry IDs ───
  _counters: { education: 0, experience: 0, projects: 0, custom: 0 },

  // ─── Initialize all form bindings ───
  init() {
    this._bindPersonalFields();
    this._bindSkillsInput();
    this._bindAddButtons();
    this._bindSummaryCounter();
    this._initSectionReorder();
    this._initEditableTitles();
  },

  // ─── Personal Info Fields ───
  _bindPersonalFields() {
    const fields = ['fullName','jobTitle','email','phone','address','linkedin','summary'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        window.ResumeApp.state.personal[id] = el.value.trim();
        this._clearError(id);
        window.ResumeApp.schedulePreview();
      });
    });

    // Phone country code selector
    const codeEl = document.getElementById('phoneCode');
    if (codeEl) {
      codeEl.addEventListener('change', () => {
        window.ResumeApp.state.personal.phoneCode = codeEl.value;
        window.ResumeApp.schedulePreview();
      });
    }
  },

  // ─── Summary character counter ───
  _bindSummaryCounter() {
    const ta = document.getElementById('summary');
    const counter = document.getElementById('charSummary');
    if (!ta || !counter) return;
    ta.addEventListener('input', () => {
      counter.textContent = `${ta.value.length} / 600`;
      if (ta.value.length > 500) {
        counter.style.color = '#F59E0B';
      } else {
        counter.style.color = '';
      }
    });
  },

  // ─── Skills Tag Input ───
  _bindSkillsInput() {
    const input = document.getElementById('skillInput');
    const wrapper = document.getElementById('tagsWrapper');
    if (!input || !wrapper) return;

    wrapper.addEventListener('click', () => input.focus());

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        this._addSkill(input.value);
        input.value = '';
      } else if (e.key === 'Backspace' && input.value === '') {
        const skills = window.ResumeApp.state.skills;
        if (skills.length > 0) {
          skills.pop();
          this._renderSkillTags();
          window.ResumeApp.schedulePreview();
        }
      }
    });

    input.addEventListener('blur', () => {
      if (input.value.trim()) {
        this._addSkill(input.value);
        input.value = '';
      }
    });
  },

  _addSkill(raw) {
    const skills = raw.split(',').map(s => s.trim()).filter(s => s.length > 0);
    skills.forEach(skill => {
      if (skill && !window.ResumeApp.state.skills.includes(skill)) {
        window.ResumeApp.state.skills.push(skill);
      }
    });
    this._renderSkillTags();
    window.ResumeApp.schedulePreview();
  },

  _renderSkillTags() {
    const container = document.getElementById('tagsContainer');
    if (!container) return;
    container.innerHTML = '';
    window.ResumeApp.state.skills.forEach((skill, i) => {
      const tag = document.createElement('div');
      tag.className = 'skill-tag';
      tag.innerHTML = `
        <span>${this._escHtml(skill)}</span>
        <span class="skill-tag-remove" data-idx="${i}" title="Remove skill" role="button" tabindex="0">×</span>
      `;
      tag.querySelector('.skill-tag-remove').addEventListener('click', () => {
        window.ResumeApp.state.skills.splice(i, 1);
        this._renderSkillTags();
        window.ResumeApp.schedulePreview();
      });
      container.appendChild(tag);
    });
  },

  // ─── Add/Remove Buttons ───
  _bindAddButtons() {
    document.getElementById('btnAddEducation').addEventListener('click', () => this.addEntry('education'));
    document.getElementById('btnAddExperience').addEventListener('click', () => this.addEntry('experience'));
    document.getElementById('btnAddProject').addEventListener('click', () => this.addEntry('projects'));
    document.getElementById('btnAddCustomSection').addEventListener('click', () => this.addCustomSection());
  },

  // ─── Dynamic Entry Addition ───
  addEntry(type) {
    const id = ++this._counters[type];
    const entry = this._createEntryData(type, id);
    window.ResumeApp.state[type].push(entry);
    const listEl = document.getElementById(
      type === 'education' ? 'educationList' :
      type === 'experience' ? 'experienceList' :
      'projectsList'
    );
    const el = this._buildEntryElement(type, entry, id);
    listEl.appendChild(el);
    // Auto-focus first input
    const firstInput = el.querySelector('input, textarea');
    if (firstInput) firstInput.focus();
    window.ResumeApp.schedulePreview();
  },

  _createEntryData(type, id) {
    const base = { _id: id };
    if (type === 'education') {
      return { ...base, degree: '', school: '', field: '', period: '', gpaType: '', gpa: '', description: '' };
    } else if (type === 'experience') {
      return { ...base, position: '', company: '', period: '', location: '', description: '' };
    } else {
      return { ...base, name: '', link: '', tech: '', period: '', description: '' };
    }
  },

  _buildEntryElement(type, entry, id) {
    const div = document.createElement('div');
    div.className = 'dynamic-entry';
    div.dataset.id = id;
    div.dataset.type = type;

    const labels = {
      education: { title: 'Degree / Certificate', sub: 'Institution', second: 'Field of Study', period: true, desc: true },
      experience: { title: 'Job Title / Position', sub: 'Company / Organization', second: 'Location', third: null, period: true, desc: true },
      projects: { title: 'Project Name', sub: 'Technologies Used', second: 'Project Link', third: null, period: true, desc: true }
    };
    const lbl = labels[type];
    const titleKey = type === 'education' ? 'degree' : type === 'experience' ? 'position' : 'name';
    const subKey = type === 'education' ? 'school' : type === 'experience' ? 'company' : 'tech';

    div.innerHTML = `
      <div class="entry-header">
        <div class="entry-header-left">
          <span class="entry-drag-handle">⠿</span>
          <div>
            <div class="entry-title" data-header-title>
              ${this._getEntryDisplayTitle(type, entry)}
            </div>
          </div>
        </div>
        <div class="entry-actions">
          <button class="entry-collapse-btn" title="Collapse" aria-expanded="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button class="entry-remove-btn" title="Remove">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="entry-body">
        <div class="form-grid-2">
          <div class="field-group">
            <label class="field-label">${lbl.title}</label>
            <input class="field-input" type="text" data-field="${titleKey}" placeholder="${lbl.title}" value="${this._escHtml(entry[titleKey] || '')}" />
          </div>
          <div class="field-group">
            <label class="field-label">${lbl.sub}</label>
            <input class="field-input" type="text" data-field="${subKey}" placeholder="${lbl.sub}" value="${this._escHtml(entry[subKey] || '')}" />
          </div>
        </div>
        <div class="form-grid-2">
          ${lbl.second ? `
          <div class="field-group">
            <label class="field-label">${lbl.second}</label>
            <input class="field-input" type="text" data-field="${type === 'education' ? 'field' : type === 'experience' ? 'location' : 'link'}" placeholder="${lbl.second}" value="" />
          </div>` : '<div></div>'}
          ${lbl.period ? `
          <div class="field-group">
            <label class="field-label">Period / Date</label>
            <input class="field-input" type="text" data-field="period" placeholder="e.g. 2020 – 2024 or Present" value="" />
          </div>` : ''}
        </div>
        ${type === 'education' ? `
        <div class="form-grid-2">
          <div class="field-group">
            <label class="field-label">Grade Type <span style="font-weight:400;font-size:0.75rem;color:var(--gray-400);">(optional)</span></label>
            <select class="field-input" data-field="gpaType" data-select="true">
              <option value="">— None / Not applicable —</option>
              <option value="GPA">GPA (e.g. 3.8 / 4.0)</option>
              <option value="CGPA">CGPA (e.g. 8.9 / 10)</option>
              <option value="Percentage">Percentage (e.g. 85%)</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Grade Value <span style="font-weight:400;font-size:0.75rem;color:var(--gray-400);">(optional)</span></label>
            <input class="field-input" type="text" data-field="gpa" placeholder="e.g. 3.8/4.0 · 8.9/10 · 85%" value="${this._escHtml(entry.gpa || '')}" />
          </div>
        </div>` : ''}
        <div class="field-group">
          <label class="field-label">Description / Details</label>
          <textarea class="field-input field-textarea" data-field="description" rows="3" placeholder="• Describe your responsibilities, achievements, or project details...">${this._escHtml(entry.description || '')}</textarea>
        </div>
      </div>
    `;

    // Collapse / expand
    const collapseBtn = div.querySelector('.entry-collapse-btn');
    const body = div.querySelector('.entry-body');
    const header = div.querySelector('.entry-header');
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const collapsed = body.classList.toggle('collapsed');
      collapseBtn.classList.toggle('collapsed', collapsed);
      collapseBtn.setAttribute('aria-expanded', String(!collapsed));
    });
    header.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        const collapsed = body.classList.toggle('collapsed');
        collapseBtn.classList.toggle('collapsed', collapsed);
      }
    });

    // Remove
    div.querySelector('.entry-remove-btn').addEventListener('click', () => {
      div.style.opacity = '0';
      div.style.transform = 'translateY(-8px)';
      div.style.transition = 'all 0.2s';
      setTimeout(() => {
        div.remove();
        const arr = window.ResumeApp.state[type];
        const idx = arr.findIndex(e => e._id === id);
        if (idx > -1) arr.splice(idx, 1);
        window.ResumeApp.schedulePreview();
      }, 200);
    });

    // Live input binding (inputs + selects)
    div.querySelectorAll('[data-field]').forEach(input => {
      const evt = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(evt, () => {
        const field = input.dataset.field;
        const arr = window.ResumeApp.state[type];
        const obj = arr.find(e => e._id === id);
        if (obj) obj[field] = input.value;
        // Update header title
        const headerTitle = div.querySelector('[data-header-title]');
        if (headerTitle) headerTitle.textContent = this._getEntryDisplayTitle(type, obj || entry);
        window.ResumeApp.schedulePreview();
      });
    });

    return div;
  },

  _getEntryDisplayTitle(type, entry) {
    if (type === 'education') return entry.degree || 'New Education';
    if (type === 'experience') return entry.position || 'New Experience';
    return entry.name || 'New Project';
  },

  // ─── Custom Sections ───
  addCustomSection() {
    const id = ++this._counters.custom;
    const entry = { _id: id, title: 'Custom Section', content: '' };
    window.ResumeApp.state.customSections.push(entry);

    const list = document.getElementById('customSectionsList');
    const div = document.createElement('div');
    div.className = 'custom-section-entry';
    div.dataset.id = id;
    div.innerHTML = `
      <div class="custom-section-header">
        <input class="custom-section-title-input" type="text" value="${this._escHtml(entry.title)}" placeholder="Section Title" data-field="title" />
        <button class="custom-remove-btn" title="Remove section">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="custom-section-body">
        <textarea class="custom-section-content" rows="4" placeholder="Enter content for this section..." data-field="content"></textarea>
      </div>
    `;

    div.querySelector('.custom-remove-btn').addEventListener('click', () => {
      div.remove();
      const arr = window.ResumeApp.state.customSections;
      const idx = arr.findIndex(e => e._id === id);
      if (idx > -1) arr.splice(idx, 1);
      window.ResumeApp.schedulePreview();
    });

    div.querySelectorAll('[data-field]').forEach(input => {
      input.addEventListener('input', () => {
        const field = input.dataset.field;
        const obj = window.ResumeApp.state.customSections.find(e => e._id === id);
        if (obj) obj[field] = input.value;
        window.ResumeApp.schedulePreview();
      });
    });

    list.appendChild(div);
    div.querySelector('.custom-section-title-input').focus();
    window.ResumeApp.schedulePreview();
  },

  // ─── Section Reordering ───
  _initSectionReorder() {
    const container = document.getElementById('reorderableSections');
    if (!container) return;

    // Apply saved order from state to DOM on init
    this._applyDomOrder();

    // Bind Up/Down buttons via event delegation
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.section-order-btn');
      if (!btn) return;
      const section = btn.closest('.reorderable-section');
      if (!section) return;
      const dir = btn.dataset.dir;
      this._moveSectionInDom(section, dir);
      this._syncOrderFromDom();
      window.ResumeApp.schedulePreview();
    });
  },

  /* Re-sort DOM sections to match state.sectionOrder */
  _applyDomOrder() {
    const order = window.ResumeApp?.state?.sectionOrder;
    if (!order || !order.length) return;
    const container = document.getElementById('reorderableSections');
    if (!container) return;

    // Map key → element
    const map = {};
    container.querySelectorAll('.reorderable-section[data-section-key]').forEach(el => {
      map[el.dataset.sectionKey] = el;
    });

    // Append in saved order (unknown keys go to end)
    order.forEach(key => {
      if (map[key]) container.appendChild(map[key]);
    });

    this._updateOrderBtns();
  },

  /* Move a section up or down in the DOM */
  _moveSectionInDom(section, dir) {
    if (dir === 'up') {
      const prev = this._adjacentSection(section, 'prev');
      if (prev) {
        /* Animate swap */
        section.style.transition = 'transform 0.18s ease';
        prev.style.transition    = 'transform 0.18s ease';
        section.parentNode.insertBefore(section, prev);
        setTimeout(() => {
          section.style.transition = '';
          prev.style.transition    = '';
        }, 180);
      }
    } else {
      const next = this._adjacentSection(section, 'next');
      if (next) {
        section.style.transition = 'transform 0.18s ease';
        next.style.transition    = 'transform 0.18s ease';
        section.parentNode.insertBefore(next, section);
        setTimeout(() => {
          section.style.transition = '';
          next.style.transition    = '';
        }, 180);
      }
    }
    this._updateOrderBtns();
  },

  /* Get the previous or next reorderable sibling */
  _adjacentSection(el, dir) {
    let cur = dir === 'prev' ? el.previousElementSibling : el.nextElementSibling;
    while (cur) {
      if (cur.classList.contains('reorderable-section')) return cur;
      cur = dir === 'prev' ? cur.previousElementSibling : cur.nextElementSibling;
    }
    return null;
  },

  /* Read current DOM order → state.sectionOrder */
  _syncOrderFromDom() {
    const container = document.getElementById('reorderableSections');
    if (!container) return;
    const order = [];
    container.querySelectorAll('.reorderable-section[data-section-key]').forEach(el => {
      order.push(el.dataset.sectionKey);
    });
    window.ResumeApp.state.sectionOrder = order;
  },

  /* Disable Up on first / Down on last visible reorderable section */
  _updateOrderBtns() {
    const container = document.getElementById('reorderableSections');
    if (!container) return;
    const sections = [...container.querySelectorAll('.reorderable-section[data-section-key]')];
    sections.forEach((sec, i) => {
      const upBtn   = sec.querySelector('.section-order-btn[data-dir="up"]');
      const downBtn = sec.querySelector('.section-order-btn[data-dir="down"]');
      if (upBtn)   upBtn.disabled   = (i === 0);
      if (downBtn) downBtn.disabled = (i === sections.length - 1);
    });
  },

  // ─── Validation ───
  validate() {
    let valid = true;
    const { personal } = window.ResumeApp.state;

    // Name
    if (!personal.fullName) {
      this._setError('fullName', 'Full name is required');
      document.getElementById('fullName').classList.add('error');
      valid = false;
    }

    // Email
    if (!personal.email) {
      this._setError('email', 'Email is required');
      document.getElementById('email').classList.add('error');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email)) {
      this._setError('email', 'Please enter a valid email address');
      document.getElementById('email').classList.add('error');
      valid = false;
    }

    if (!valid) {
      // Scroll to first error
      const firstError = document.querySelector('.field-input.error');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.ResumeApp.showToast('⚠️ Please fix the errors first', 'error');
    }

    return valid;
  },

  _setError(id, message) {
    const errEl = document.getElementById(`err-${id}`);
    if (errEl) errEl.textContent = message;
  },

  _clearError(id) {
    const errEl = document.getElementById(`err-${id}`);
    if (errEl) errEl.textContent = '';
    const input = document.getElementById(id);
    if (input) input.classList.remove('error');
  },

  // ─── HTML escape ───
  _escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // ─── Populate entire form from state ───
  populateForm() {
    const state = window.ResumeApp.state;

    // Restore section order in the editor panel
    this._applyDomOrder();

    // Restore editable section titles
    const titles = state.sectionTitles || {};
    document.querySelectorAll('.section-title-text[data-title-key]').forEach(span => {
      const key = span.dataset.titleKey;
      if (titles[key]) span.textContent = titles[key];
    });

    // Personal fields
    const personalFields = ['fullName','jobTitle','email','phone','address','linkedin','summary'];
    personalFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = state.personal[id] || '';
    });

    // Phone country code
    const codeEl = document.getElementById('phoneCode');
    if (codeEl) {
      const code = state.personal.phoneCode || '+91';
      const opt = codeEl.querySelector(`option[value="${CSS.escape(code)}"]`);
      if (opt) opt.selected = true;
      else codeEl.options[0].selected = true; // fallback to +91
    }

    // Summary char counter
    const summary = document.getElementById('summary');
    const charCounter = document.getElementById('charSummary');
    if (summary && charCounter) charCounter.textContent = `${summary.value.length} / 600`;

    // Skills tags
    this._renderSkillTags();

    // Education
    const eduList = document.getElementById('educationList');
    eduList.innerHTML = '';
    state.education.forEach(entry => {
      const el = this._buildEntryElement('education', entry, entry._id);
      // Populate all inputs from entry data
      this._populateEntryInputs(el, entry);
      eduList.appendChild(el);
    });

    // Experience
    const expList = document.getElementById('experienceList');
    expList.innerHTML = '';
    state.experience.forEach(entry => {
      const el = this._buildEntryElement('experience', entry, entry._id);
      this._populateEntryInputs(el, entry);
      expList.appendChild(el);
    });

    // Projects
    const projList = document.getElementById('projectsList');
    projList.innerHTML = '';
    state.projects.forEach(entry => {
      const el = this._buildEntryElement('projects', entry, entry._id);
      this._populateEntryInputs(el, entry);
      projList.appendChild(el);
    });

    // Custom sections
    const customList = document.getElementById('customSectionsList');
    customList.innerHTML = '';
    state.customSections.forEach(cs => {
      const id = cs._id;
      const div = document.createElement('div');
      div.className = 'custom-section-entry';
      div.dataset.id = id;
      div.innerHTML = `
        <div class="custom-section-header">
          <input class="custom-section-title-input" type="text" value="${this._escHtml(cs.title)}" placeholder="Section Title" data-field="title" />
          <button class="custom-remove-btn" title="Remove section">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="custom-section-body">
          <textarea class="custom-section-content" rows="4" placeholder="Enter content for this section..." data-field="content">${this._escHtml(cs.content)}</textarea>
        </div>
      `;
      div.querySelector('.custom-remove-btn').addEventListener('click', () => {
        div.remove();
        const arr = window.ResumeApp.state.customSections;
        const idx = arr.findIndex(e => e._id === id);
        if (idx > -1) arr.splice(idx, 1);
        window.ResumeApp.schedulePreview();
      });
      div.querySelectorAll('[data-field]').forEach(input => {
        input.addEventListener('input', () => {
          const field = input.dataset.field;
          const obj = window.ResumeApp.state.customSections.find(e => e._id === id);
          if (obj) obj[field] = input.value;
          window.ResumeApp.schedulePreview();
        });
      });
      customList.appendChild(div);
    });
  },

  // Fill input values into a built entry element from a data object
  _populateEntryInputs(el, data) {
    el.querySelectorAll('[data-field]').forEach(input => {
      const field = input.dataset.field;
      if (data[field] !== undefined) {
        if (input.tagName === 'SELECT') {
          input.value = data[field] || '';
        } else {
          input.value = data[field];
        }
      }
    });
    // Update the displayed header title
    const headerTitle = el.querySelector('[data-header-title]');
    if (headerTitle) {
      const type = el.dataset.type;
      headerTitle.textContent = this._getEntryDisplayTitle(type, data);
    }
  },

  // ─── Editable Section Titles ───
  _initEditableTitles() {
    const container = document.getElementById('reorderableSections');
    if (!container) return;

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.section-edit-title-btn');
      if (!btn) return;

      const key = btn.dataset.titleKey;
      const titleSpan = container.querySelector(`.section-title-text[data-title-key="${key}"]`);
      if (!titleSpan || titleSpan.querySelector('input')) return; // already editing

      const current = titleSpan.textContent.trim();
      titleSpan.dataset.prevText = current;

      // Create inline input
      const input = document.createElement('input');
      input.type = 'text';
      input.value = current;
      input.className = 'section-title-input';
      input.setAttribute('aria-label', 'Rename section');
      titleSpan.textContent = '';
      titleSpan.appendChild(input);
      input.focus();
      input.select();

      const commit = () => {
        const val = input.value.trim() || titleSpan.dataset.prevText;
        titleSpan.textContent = val;
        // Save to state
        if (!window.ResumeApp.state.sectionTitles) window.ResumeApp.state.sectionTitles = {};
        window.ResumeApp.state.sectionTitles[key] = val;
        window.ResumeApp.saveStateDraft();
        window.ResumeApp.schedulePreview();
      };

      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
        if (ev.key === 'Escape') { input.value = titleSpan.dataset.prevText; input.blur(); }
      });
    });
  },

  // ─── Init on DOM ready ───
};

document.addEventListener('DOMContentLoaded', () => {
  window.FormManager.init();
});
