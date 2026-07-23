/* =============================================
   PREVIEW.JS – Paginated, A4-accurate live preview
   ─────────────────────────────────────────────
   Pipeline
   ────────
   1. Template HTML generated from state
   2. Injected into a hidden STAGING DIV (position:fixed, off-screen left)
      → real browser layout with scrollHeight measurement
   3. N page frames built, each 794×1123 px with overflow:hidden
      → inner clone shifted by -(i × 1123)px so each frame shows
        only its A4 slice
   4. Pages scaled to fit the preview panel via ResizeObserver
   ============================================= */

'use strict';

window.PreviewManager = {

  /* A4 at 96 dpi: 210mm × 297mm */
  A4_W: 794,
  A4_H: 1123,

  _rafId: null,
  _resizeObs: null,

  /* ─── Public API ─── */
  render() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = requestAnimationFrame(() => this._doRender());
  },

  /* ─── Staging element (off-screen, but rendered by browser) ─── */
  _getStaging() {
    let el = document.getElementById('resumeStaging');
    if (!el) {
      el = document.createElement('div');
      el.id = 'resumeStaging';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    /*  position:fixed + left way off-screen keeps the element in the
        layout engine (so scrollHeight is accurate) but out of sight.
        Do NOT use visibility:hidden / display:none – those collapse height. */
    el.style.cssText = [
      'position:fixed',
      'top:0',
      `left:-${this.A4_W + 200}px`,
      `width:${this.A4_W}px`,
      'overflow:visible',
      'background:#fff',
      'z-index:-9999',
      'pointer-events:none',
      'opacity:1',       /* must be opaque for layout + html2canvas */
    ].join(';');
    return el;
  },

  /* ─── Main render ─── */
  _doRender() {
    const state = window.ResumeApp.state;
    const output = document.getElementById('resumeOutput');
    const wrapper = document.getElementById('resumePreviewWrapper');
    const emptyState = document.getElementById('previewEmpty');
    if (!output) return;

    const { A4_W, A4_H } = this;

    /* 1. Generate HTML */
    let html;
    try {
      html = window.TemplateEngine.render(state);
    } catch (err) {
      html = `<div style="padding:40px;font-family:sans-serif;color:#DC2626;">
        <h3>⚠️ Template render error</h3>
        <p style="font-size:12px;color:#6B7280;">${err.message}</p>
      </div>`;
    }

    /* 2. Measure real rendered height via staging */
    const staging = this._getStaging();
    staging.innerHTML = html;
    void staging.offsetHeight;                          /* force reflow */
    const totalH  = Math.max(staging.scrollHeight, A4_H);
    const numPages = Math.ceil(totalH / A4_H);

    /* 3. Build page frames */
    output.innerHTML = '';
    output.style.cssText = [
      'background:transparent',
      'box-shadow:none',
      'border-radius:0',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'width:100%',
    ].join(';');

    for (let i = 0; i < numPages; i++) {
      /* Page frame – fixed A4 size, clips content to its slice */
      const page = document.createElement('div');
      page.className = 'preview-page';
      page.dataset.pageIndex = i;
      page.style.cssText = [
        `width:${A4_W}px`,
        `height:${A4_H}px`,
        'overflow:hidden',
        'position:relative',
        'background:#ffffff',
        'flex-shrink:0',
        'border-radius:3px',
        'box-shadow:0 4px 24px rgba(0,0,0,0.13),0 1px 4px rgba(0,0,0,0.06)',
      ].join(';');

      /* Content clone offset so only this page's slice is visible */
      const inner = document.createElement('div');
      inner.className = 'preview-page-inner';
      inner.style.cssText = [
        'position:absolute',
        `top:${-(i * A4_H)}px`,
        'left:0',
        `width:${A4_W}px`,
        'overflow:visible',
      ].join(';');
      inner.innerHTML = html;

      page.appendChild(inner);
      output.appendChild(page);

      /* Visual separator between pages */
      if (i < numPages - 1) {
        const gap = document.createElement('div');
        gap.className = 'preview-page-gap';
        output.appendChild(gap);
      }
    }

    /* 4. Add page count badge to wrapper */
    this._updatePageBadge(numPages);

    /* 5. Scale pages to fit the panel */
    this._applyScale();

    /* 6. Show preview */
    wrapper.style.display = 'block';
    emptyState.style.display = 'none';

    /* 7. Attach resize observer (once) so scale updates on panel resize */
    this._attachResizeObserver();
  },

  /* ─── Dynamic scaling to fit preview panel ─── */
  _applyScale() {
    const previewArea = document.getElementById('previewArea');
    const pages = document.querySelectorAll('.preview-page');
    const gaps  = document.querySelectorAll('.preview-page-gap');
    if (!previewArea || !pages.length) return;

    const { A4_W, A4_H } = this;
    /* Available width = panel width minus horizontal padding (48px = 2×space-6) */
    const availW  = previewArea.clientWidth - 48;
    const scale   = Math.min(1, availW / A4_W);   /* never enlarge above 1 */
    const scaledH = Math.round(A4_H * scale);
    /* Negative margin collapses the unused space below each scaled page */
    const marginB = scaledH - A4_H;               /* negative when scale < 1 */

    pages.forEach(p => {
      p.style.transform       = `scale(${scale})`;
      p.style.transformOrigin = 'top center';
      p.style.marginBottom    = `${marginB}px`;
    });

    /* Gaps also need to scale their visual width */
    gaps.forEach(g => {
      g.style.transform       = `scale(${scale})`;
      g.style.transformOrigin = 'top center';
      g.style.marginBottom    = `${Math.round(20 * scale) - 20}px`;
    });
  },

  _attachResizeObserver() {
    if (this._resizeObs) return;               /* already watching */
    const previewArea = document.getElementById('previewArea');
    if (!previewArea || typeof ResizeObserver === 'undefined') return;
    this._resizeObs = new ResizeObserver(() => this._applyScale());
    this._resizeObs.observe(previewArea);
  },

  /* ─── Page count badge in toolbar ─── */
  _updatePageBadge(n) {
    let badge = document.getElementById('pageCountBadge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'pageCountBadge';
      badge.style.cssText = [
        'font-size:0.75rem',
        'font-weight:600',
        'color:var(--gray-500)',
        'background:var(--gray-100)',
        'border:1px solid var(--gray-200)',
        'border-radius:var(--radius-full)',
        'padding:2px 10px',
        'white-space:nowrap',
      ].join(';');
      const toolbarLeft = document.querySelector('.preview-toolbar-left');
      if (toolbarLeft) toolbarLeft.appendChild(badge);
    }
    badge.textContent = n === 1 ? '1 page' : `${n} pages`;
  },

  /* ─── Expose staging HTML for PDF capture ─── */
  getStagingElement() {
    return document.getElementById('resumeStaging');
  },

  getStagingHTML() {
    const el = this.getStagingElement();
    return el ? el.innerHTML : '';
  },
};
