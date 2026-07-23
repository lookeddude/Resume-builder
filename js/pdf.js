/* =============================================
   PDF.JS – WYSIWYG PDF Export + Supabase Upload
   ─────────────────────────────────────────────
   Pipeline:
   1. Render staging HTML into a fixed capture div
   2. html2canvas → retina-scale canvas
   3. Slice into A4 pages → jsPDF
   4. Save locally (download)
   5. If logged in → upload PDF blob to Supabase
      Storage and save URL + form data to DB
   ============================================= */

'use strict';

window.PDFManager = {

  A4_W_MM : 210,
  A4_H_MM : 297,
  A4_W_PX : 794,
  A4_H_PX : 1123,
  PX_TO_MM: 0.264583,
  SCALE   : 2,
  _isExporting: false,  /* guard against double-clicks / duplicate triggers */

  init() {
    /* The download button click is intercepted by AuthManager.
       PDFManager.exportPDF() is called by AuthManager after auth check. */
  },

  /* ════════════════════════════════════════════
     PUBLIC – called by AuthManager after auth
  ════════════════════════════════════════════ */
  async exportPDF() {
    /* Prevent multiple simultaneous exports (double-click, duplicate listener) */
    if (this._isExporting) {
      console.warn('[PDFManager] Export already in progress — ignoring duplicate call');
      return;
    }
    this._isExporting = true;

    /* Disable the button visually during export */
    const downloadBtn = document.getElementById('btnDownloadPDF');
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn._origText = downloadBtn.innerHTML;
      downloadBtn.innerHTML = '⏳ Generating…';
    }

    /* 1. Ensure staging is up to date */
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

    /* 2. Show overlay */
    const overlay = document.getElementById('pdfOverlay');
    overlay.style.display = 'flex';
    this._setOverlayStatus('Generating PDF…');

    try {
      const { personal } = window.ResumeApp.state;
      const safeName = (personal?.fullName || 'Resume')
        .replace(/[^a-zA-Z0-9\s\-_]/g, '')
        .trim()
        .replace(/\s+/g, '_') || 'Resume';

      /* 3. Build the PDF doc + get blob */
      const { pdf, blob } = await this._buildPDF(stagingHtml);

      /* 4. Trigger browser download */
      pdf.save(`${safeName}_Resume.pdf`);
      window.ResumeApp.showToast('✅ PDF downloaded!', 'success');

      /* 5. If user is logged in → save everything to Supabase */
      if (window.AuthManager?.isAuthenticated()) {
        this._setOverlayStatus('Saving to cloud…');
        await this._saveToSupabase(blob, safeName);
      }

    } catch (err) {
      console.error('[PDFManager] Export error:', err);
      window.ResumeApp.showToast('❌ PDF generation failed. Please try again.', 'error');
    } finally {
      overlay.style.display = 'none';
      this._isExporting = false;      /* always release the lock */
      this._restoreDownloadBtn();
    }
  },

  /* ——— Re-enable the download button ——— */
  _restoreDownloadBtn() {
    const btn = document.getElementById('btnDownloadPDF');
    if (btn) {
      btn.disabled = false;
      if (btn._origText) {
        btn.innerHTML  = btn._origText;
        btn._origText  = null;
      }
    }
  },

  /* ════════════════════════════════════════════
     BUILD PDF → returns { pdf, blob }
  ════════════════════════════════════════════ */
  async _buildPDF(html) {
    const { jsPDF } = window.jspdf;
    const { A4_W_MM, A4_H_MM, A4_W_PX, A4_H_PX, PX_TO_MM, SCALE } = this;

    /* Capture div: fixed, behind overlay, fully visible to html2canvas */
    const captureEl = document.createElement('div');
    captureEl.id = 'pdfCaptureEl';
    captureEl.style.cssText = [
      'position:fixed', 'top:0', 'left:0',
      `width:${A4_W_PX}px`,
      'overflow:hidden',       /* prevent flex/inline-block children from overflowing */
      'background:#ffffff', 'z-index:-1',
      'pointer-events:none', 'margin:0', 'padding:0',
    ].join(';');
    captureEl.innerHTML = html;
    document.body.appendChild(captureEl);

    await this._nextFrame();
    await this._nextFrame();
    await new Promise(r => setTimeout(r, 200)); /* extra settle time for complex layouts */

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

    /* Slice canvas into A4 pages */
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

      const sliceH        = Math.min(pageH_canvas, canvasH - yOffset);
      const pageCanvas    = document.createElement('canvas');
      pageCanvas.width    = canvasW;
      pageCanvas.height   = sliceH;
      const ctx           = pageCanvas.getContext('2d');
      ctx.fillStyle       = '#ffffff';
      ctx.fillRect(0, 0, canvasW, sliceH);
      ctx.drawImage(canvas, 0, yOffset, canvasW, sliceH, 0, 0, canvasW, sliceH);

      const imgData   = pageCanvas.toDataURL('image/jpeg', 0.97);
      const sliceH_mm = (sliceH / SCALE) * PX_TO_MM;
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_W_MM, sliceH_mm);

      yOffset += sliceH;
      pageNum++;
    }

    /* Get as Blob for Supabase upload */
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
      /* ── 1. Upsert form data (resume record) ── */
      const currentId   = window.MyResumesPanel?.getCurrentId() || null;
      const { data: resumeRecord, error: dbError } = await window.ResumeDB.save(currentId);
      if (dbError) {
        console.error('[PDFManager] DB save error:', dbError);
      }

      const resumeId = resumeRecord?.id || currentId;
      if (resumeId) window.MyResumesPanel?.setCurrentId(resumeId);

      /* ── 2. Upload PDF to Supabase Storage ── */
      const filePath = `${user.id}/${resumeId || Date.now()}_${safeName}.pdf`;

      /* Delete old PDF if resume already existed */
      if (currentId) {
        await client.storage
          .from('resume-pdfs')
          .remove([`${user.id}/${currentId}_${safeName}.pdf`])
          .catch(() => {}); /* Ignore if not found */
      }

      const { data: uploadData, error: uploadError } = await client.storage
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

      /* ── 3. Get signed URL (valid for 1 year) ── */
      const { data: urlData } = await client.storage
        .from('resume-pdfs')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      const pdfUrl = urlData?.signedUrl || null;

      /* ── 4. Save PDF URL back to resume record ── */
      if (resumeId && pdfUrl) {
        await client
          .from('resumes')
          .update({ pdf_url: pdfUrl, pdf_uploaded_at: new Date().toISOString() })
          .eq('id', resumeId)
          .eq('user_id', user.id);
      }

      /* ── 5. Update badge ── */
      window.ResumeApp?._updateResumeCountBadge?.();
      window.ResumeApp.showToast('☁️ Resume & PDF saved to your account!', 'success');

    } catch (err) {
      console.error('[PDFManager] Supabase save error:', err);
      window.ResumeApp.showToast('⚠️ Download complete but cloud save failed.', 'error');
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
