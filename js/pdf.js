/* =============================================
   PDF.JS – Text-Based PDF Export (ATS-Friendly)
   ─────────────────────────────────────────────
   Pipeline (Primary – text-based, ATS-friendly):
   1. Render staging HTML from current state
   2. Fetch templates.css to inline it
   3. Build a self-contained print HTML document
   4. Open it in a new tab → auto-trigger window.print()
   5. Browser's "Save as PDF" produces real text PDF

   Secondary (Background – Supabase cloud upload):
   6. html2canvas → jsPDF image blob → Supabase Storage
   7. Runs silently without blocking the user
   ============================================= */

'use strict';

window.PDFManager = {

  A4_W_MM: 210,
  A4_H_MM: 297,
  A4_W_PX: 794,
  A4_H_PX: 1123,
  PX_TO_MM: 0.264583,
  SCALE: 2,
  _isExporting: false,

  init() {
    /* The download button click is intercepted by AuthManager.
       PDFManager.exportPDF() is called by AuthManager after auth check. */
  },

  /* ════════════════════════════════════════════
     PUBLIC – called by AuthManager after auth
  ════════════════════════════════════════════ */
  async exportPDF() {
    if (this._isExporting) {
      console.warn('[PDFManager] Export already in progress — ignoring duplicate call');
      return;
    }
    this._isExporting = true;

    const downloadBtn = document.getElementById('btnDownloadPDF');
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn._origText = downloadBtn.innerHTML;
      downloadBtn.innerHTML = '⏳ Preparing…';
    }

    /* 1. Re-render staging to ensure it's fresh */
    window.PreviewManager.render();
    await this._nextFrame();
    await this._nextFrame();

    const stagingHtml = window.PreviewManager.getStagingHTML();
    if (!stagingHtml || stagingHtml.trim() === '') {
      window.ResumeApp.showToast('⚠️ Please fill in your details first', 'error');
      this._isExporting = false;
      this._restoreDownloadBtn();
      return;
    }

    try {
      const { personal } = window.ResumeApp.state;
      const safeName = (personal?.fullName || 'Resume')
        .replace(/[^a-zA-Z0-9\s\-_]/g, '')
        .trim()
        .replace(/\s+/g, '_') || 'Resume';

      /* 2. Open text-based print window (primary export) */
      const opened = await this._openPrintWindow(stagingHtml, safeName);

      if (opened) {
        window.ResumeApp.showToast('📄 Print dialog opened — select "Save as PDF" as destination', 'success');
      }

      /* 3. Background: upload image-PDF to Supabase (does NOT block user) */
      if (window.AuthManager?.isAuthenticated()) {
        this._uploadToSupabaseBackground(stagingHtml, safeName);
      }

    } catch (err) {
      console.error('[PDFManager] Export error:', err);
      window.ResumeApp.showToast('❌ PDF export failed. Please try again.', 'error');
    } finally {
      this._isExporting = false;
      this._restoreDownloadBtn();
    }
  },

  _restoreDownloadBtn() {
    const btn = document.getElementById('btnDownloadPDF');
    if (btn) {
      btn.disabled = false;
      if (btn._origText) { btn.innerHTML = btn._origText; btn._origText = null; }
    }
  },

  /* ════════════════════════════════════════════
     PRIMARY: TEXT-BASED PRINT WINDOW
     Opens a styled HTML page → browser print → real text PDF
  ════════════════════════════════════════════ */
  async _openPrintWindow(html, filename) {
    /* Fetch templates.css to inline inside the print document */
    let templatesCss = '';
    try {
      const resp = await fetch('/css/templates.css');
      if (resp.ok) templatesCss = await resp.text();
    } catch (e) {
      console.warn('[PDFManager] Could not fetch templates.css, continuing without it');
    }

    const printDoc = this._buildPrintDocument(html, templatesCss, filename);
    const blob = new Blob([printDoc], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    /* Open in new tab */
    const win = window.open(blobUrl, '_blank', 'noopener');

    /* Revoke blob URL after 60 seconds */
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

    if (!win) {
      window.ResumeApp.showToast('⚠️ Popups are blocked. Please allow popups for this site and try again.', 'error');
      return false;
    }

    return true;
  },

  /* Build a complete, self-contained HTML document for printing */
  _buildPrintDocument(resumeHtml, templatesCss, filename) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${filename} – Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,400;1,700&family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet"/>
  <style>
    /* ── Page Setup ── */
    @page {
      size: A4 portrait;
      margin: 0mm;
    }

    *, *::before, *::after { box-sizing: border-box; }

    html {
      font-size: 16px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      margin: 0;
      padding: 0;
      background: #e5e7eb;
      font-family: 'Inter', -apple-system, sans-serif;
      min-height: 100vh;
    }

    /* ── Save Guide Bar (screen only) ── */
    .pdf-guide-bar {
      position: sticky;
      top: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 28px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #ec4899 100%);
      color: #fff;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 2px 20px rgba(0,0,0,0.25);
    }
    .pdf-guide-left h3 {
      font-size: 15px;
      font-weight: 700;
      margin: 0 0 3px;
    }
    .pdf-guide-steps {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      opacity: 0.88;
      flex-wrap: wrap;
    }
    .pdf-step {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .pdf-step-num {
      width: 18px; height: 18px;
      background: rgba(255,255,255,0.25);
      border-radius: 50%;
      font-size: 10px;
      font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .pdf-step-sep { opacity: 0.4; margin: 0 2px; }
    .pdf-guide-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 11px 24px;
      background: #fff;
      color: #4f46e5;
      border: none;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 2px 16px rgba(0,0,0,0.2);
      transition: all 0.2s;
      font-family: 'Inter', sans-serif;
    }
    .pdf-guide-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(0,0,0,0.25);
    }
    .pdf-guide-btn svg { flex-shrink: 0; }

    /* ── Resume Container (screen) ── */
    .resume-container {
      display: flex;
      justify-content: center;
      padding: 32px 24px 48px;
    }

    /* ── A4 Page Wrapper (screen shadow) ── */
    .resume-page-wrap {
      width: 794px;
      background: #fff;
      box-shadow:
        0 0 0 1px rgba(0,0,0,0.06),
        0 8px 40px rgba(0,0,0,0.18),
        0 2px 8px rgba(0,0,0,0.1);
      border-radius: 2px;
    }

    /* ── Resumeoutput wrapper for CSS scoping ── */
    #resumeOutput {
      font-family: 'Inter', sans-serif;
      width: 794px;
    }
    #resumeOutput * { box-sizing: border-box; }

    /* ── PRINT MODE: Hide guide, show pure resume ── */
    @media print {
      body {
        background: #fff;
        margin: 0;
        padding: 0;
      }
      .pdf-guide-bar  { display: none !important; }
      .resume-container { padding: 0 !important; }
      .resume-page-wrap {
        width: 210mm;
        box-shadow: none;
        border-radius: 0;
      }
      #resumeOutput {
        width: 210mm;
      }
    }

    /* ── Template Styles (inlined from templates.css) ── */
    ${templatesCss}
  </style>
</head>
<body>

  <!-- Guide Bar (hidden during print) -->
  <div class="pdf-guide-bar">
    <div class="pdf-guide-left">
      <h3>💼 Save Your Resume as PDF</h3>
      <div class="pdf-guide-steps">
        <span class="pdf-step"><span class="pdf-step-num">1</span> Click "Save as PDF" →</span>
        <span class="pdf-step"><span class="pdf-step-num">2</span> Destination: "Save as PDF" →</span>
        <span class="pdf-step"><span class="pdf-step-num">3</span> Paper: A4 →</span>
        <span class="pdf-step"><span class="pdf-step-num">4</span> Margins: None → Save</span>
      </div>
    </div>
    <button class="pdf-guide-btn" onclick="window.print()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8"/>
      </svg>
      Save as PDF
    </button>
  </div>

  <!-- Resume Content -->
  <div class="resume-container">
    <div class="resume-page-wrap">
      <div id="resumeOutput">${resumeHtml}</div>
    </div>
  </div>

  <script>
    /* Auto-trigger print dialog after fonts are ready */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function() {
        setTimeout(function() { window.print(); }, 700);
      });
    } else {
      window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 700);
      });
    }
  </script>

</body>
</html>`;
  },

  /* ════════════════════════════════════════════
     SECONDARY: BACKGROUND SUPABASE UPLOAD
     Runs html2canvas silently to get a PDF blob
     for cloud storage — does NOT block the user
  ════════════════════════════════════════════ */
  async _uploadToSupabaseBackground(html, safeName) {
    const overlay = document.getElementById('pdfOverlay');
    try {
      /* Run capture silently */
      const { blob } = await this._buildImagePDF(html);
      /* Show subtle status */
      this._setOverlayStatus('Saving to cloud…');
      if (overlay) overlay.style.display = 'flex';
      await this._saveToSupabase(blob, safeName);
    } catch (err) {
      console.error('[PDFManager] Background Supabase upload failed:', err);
      window.ResumeApp.showToast('⚠️ Cloud save failed — PDF was still downloaded.', 'error');
    } finally {
      if (overlay) overlay.style.display = 'none';
    }
  },

  /* ════════════════════════════════════════════
     IMAGE PDF BUILD (for Supabase upload only)
     html2canvas → jsPDF image → blob
  ════════════════════════════════════════════ */
  async _buildImagePDF(html) {
    const { jsPDF } = window.jspdf;
    const { A4_W_MM, A4_H_MM, A4_W_PX, A4_H_PX, PX_TO_MM, SCALE } = this;

    const captureEl = document.createElement('div');
    captureEl.id = 'pdfCaptureEl';
    captureEl.style.cssText = [
      'position:fixed', 'top:0', 'left:0',
      `width:${A4_W_PX}px`,
      'overflow:hidden',
      'background:#ffffff', 'z-index:-1',
      'pointer-events:none', 'margin:0', 'padding:0',
    ].join(';');
    captureEl.innerHTML = html;
    document.body.appendChild(captureEl);

    await this._nextFrame();
    await this._nextFrame();
    await new Promise(r => setTimeout(r, 200));

    let canvas;
    try {
      canvas = await html2canvas(captureEl, {
        scale          : SCALE,
        useCORS        : true,
        allowTaint     : true,
        backgroundColor: '#ffffff',
        logging        : false,
        imageTimeout   : 20000,
        width          : A4_W_PX,
        scrollX        : 0,
        scrollY        : 0,
        windowWidth    : A4_W_PX,
        onclone(clonedDoc) {
          const el = clonedDoc.getElementById('pdfCaptureEl');
          if (el) {
            el.style.position  = 'static';
            el.style.width     = `${A4_W_PX}px`;
            el.style.overflow  = 'hidden';
            el.style.zIndex    = '1';
            el.style.opacity   = '1';
            el.style.boxShadow = 'none';
          }
        },
      });
    } finally {
      if (captureEl.parentNode) document.body.removeChild(captureEl);
    }

    const canvasW      = canvas.width;
    const canvasH      = canvas.height;
    const pageH_canvas = Math.round(A4_H_PX * SCALE);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit       : 'mm',
      format     : 'a4',
      compress   : true,
    });

    let yOffset = 0;
    let pageNum = 0;

    while (yOffset < canvasH) {
      if (pageNum > 0) pdf.addPage();
      const sliceH     = Math.min(pageH_canvas, canvasH - yOffset);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width  = canvasW;
      pageCanvas.height = sliceH;
      const ctx = pageCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, sliceH);
      ctx.drawImage(canvas, 0, yOffset, canvasW, sliceH, 0, 0, canvasW, sliceH);
      const imgData  = pageCanvas.toDataURL('image/jpeg', 0.95);
      const sliceH_mm = (sliceH / SCALE) * PX_TO_MM;
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_W_MM, sliceH_mm);
      yOffset += sliceH;
      pageNum++;
    }

    const blob = pdf.output('blob');
    return { pdf, blob };
  },

  /* ════════════════════════════════════════════
     SAVE TO SUPABASE: form data + PDF file
  ════════════════════════════════════════════ */
  async _saveToSupabase(pdfBlob, safeName) {
    const client = window.AuthManager._client;
    const user   = window.AuthManager._user;
    if (!client || !user) return;

    try {
      /* 1. Upsert form data */
      const currentId = window.MyResumesPanel?.getCurrentId() || null;
      const { data: resumeRecord, error: dbError } = await window.ResumeDB.save(currentId);
      if (dbError) console.error('[PDFManager] DB save error:', dbError);

      const resumeId = resumeRecord?.id || currentId;
      if (resumeId) window.MyResumesPanel?.setCurrentId(resumeId);

      /* 2. Upload PDF to Supabase Storage */
      const filePath = `${user.id}/${resumeId || Date.now()}_${safeName}.pdf`;

      if (currentId) {
        await client.storage
          .from('resume-pdfs')
          .remove([`${user.id}/${currentId}_${safeName}.pdf`])
          .catch(() => {});
      }

      const { error: uploadError } = await client.storage
        .from('resume-pdfs')
        .upload(filePath, pdfBlob, {
          contentType : 'application/pdf',
          cacheControl: '3600',
          upsert      : true,
        });

      if (uploadError) {
        console.error('[PDFManager] Storage upload error:', uploadError);
        window.ResumeApp.showToast('⚠️ Form data saved. PDF upload failed.', 'error');
        return;
      }

      /* 3. Get signed URL */
      const { data: urlData } = await client.storage
        .from('resume-pdfs')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      const pdfUrl = urlData?.signedUrl || null;

      /* 4. Save PDF URL to resume record */
      if (resumeId && pdfUrl) {
        await client
          .from('resumes')
          .update({ pdf_url: pdfUrl, pdf_uploaded_at: new Date().toISOString() })
          .eq('id', resumeId)
          .eq('user_id', user.id);
      }

      window.ResumeApp?._updateResumeCountBadge?.();
      window.ResumeApp.showToast('☁️ Resume saved to your account!', 'success');

    } catch (err) {
      console.error('[PDFManager] Supabase save error:', err);
      window.ResumeApp.showToast('⚠️ Cloud save failed — PDF was downloaded locally.', 'error');
    }
  },

  _setOverlayStatus(msg) {
    const el = document.querySelector('#pdfOverlay p');
    if (el) el.textContent = msg;
  },

  _nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  },
};

document.addEventListener('DOMContentLoaded', () => {
  window.PDFManager.init();
});
