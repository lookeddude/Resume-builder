/* =============================================
   IMAGE.JS – Profile photo upload, drag, zoom
              (Template 3 only)
   ============================================= */

'use strict';

window.ImageManager = {

  // ─── State ───
  _dragging: false,
  _dragStart: { x: 0, y: 0 },
  _imgNaturalSize: { w: 0, h: 0 },

  init() {
    this._bindDropZone();
    this._bindPhotoInput();
    this._bindZoomControls();
    this._bindDragControls();
    this._bindResetRemove();
  },

  // ─── Drop Zone ───
  _bindDropZone() {
    const dropZone = document.getElementById('photoDropZone');
    if (!dropZone) return;

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this._loadFile(file);
      } else {
        window.ResumeApp.showToast('Please drop an image file', 'error');
      }
    });

    // Also make the entire area clickable
    dropZone.addEventListener('click', (e) => {
      if (!e.target.closest('label')) {
        document.getElementById('photoInput').click();
      }
    });
  },

  // ─── File Input ───
  _bindPhotoInput() {
    const input = document.getElementById('photoInput');
    if (!input) return;
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (file) this._loadFile(file);
    });
  },

  _loadFile(file) {
    if (file.size > 5 * 1024 * 1024) {
      window.ResumeApp.showToast('Image too large. Max 5MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      this._setPhoto(src);
    };
    reader.readAsDataURL(file);
  },

  _setPhoto(src) {
    const photo = window.ResumeApp.state.photo;
    photo.src = src;
    photo.x = 0;
    photo.y = 0;
    photo.scale = 1.0;

    // Show editor UI
    document.getElementById('photoDropZone').style.display = 'none';
    document.getElementById('photoEditor').style.display = 'flex';

    const img = document.getElementById('photoImg');
    img.src = src;
    img.onload = () => {
      this._imgNaturalSize = { w: img.naturalWidth, h: img.naturalHeight };
      // Auto-fit: scale image so it fills the 120x120 frame
      const frameSize = 120;
      const fitScale = Math.max(frameSize / img.naturalWidth, frameSize / img.naturalHeight);
      // Center it
      const scaledW = img.naturalWidth * fitScale;
      const scaledH = img.naturalHeight * fitScale;
      photo.scale = fitScale;
      photo.x = (frameSize - scaledW) / 2;
      photo.y = (frameSize - scaledH) / 2;

      document.getElementById('zoomSlider').value = Math.round(fitScale * 100);
      document.getElementById('zoomValue').textContent = Math.round(fitScale * 100) + '%';

      this._applyTransform();
      window.ResumeApp.schedulePreview();
    };
  },

  // ─── Apply CSS Transform to preview frame ───
  _applyTransform() {
    const photo = window.ResumeApp.state.photo;
    const img = document.getElementById('photoImg');
    if (!img) return;
    img.style.transform = `translate(${photo.x}px, ${photo.y}px) scale(${photo.scale})`;
    img.style.transformOrigin = 'top left';
    img.style.maxWidth = 'none';
    img.style.maxHeight = 'none';
    // Pre-crop for WYSIWYG in templates + PDF
    this._updateCroppedSrc(photo, img);
  },

  // ─── Pre-crop photo to canvas so templates render pixel-perfect ───
  //   Stored as photo.croppedSrc; used by templates instead of CSS transforms.
  _updateCroppedSrc(photo, img) {
    const FRAME = 120;   /* must match .photo-frame size in form.css */
    if (!img || !img.complete || img.naturalWidth === 0) {
      photo.croppedSrc = null;
      return;
    }
    try {
      const { x, y, scale } = photo;
      const canvas = document.createElement('canvas');
      canvas.width  = FRAME;
      canvas.height = FRAME;
      const ctx = canvas.getContext('2d');
      // Container pixel (cx,cy) = image pixel ((cx-x)/scale, (cy-y)/scale)
      // So for container top-left (0,0): source is (-x/scale, -y/scale)
      ctx.drawImage(
        img,
        -x / scale, -y / scale,   /* source x, y  */
        FRAME / scale, FRAME / scale, /* source w, h */
        0, 0, FRAME, FRAME         /* dest         */
      );
      photo.croppedSrc = canvas.toDataURL('image/jpeg', 0.92);
    } catch (e) {
      photo.croppedSrc = null; /* cross-origin or other error – fall back */
    }
  },

  // ─── Zoom Controls ───
  _bindZoomControls() {
    const slider = document.getElementById('zoomSlider');
    const btnIn = document.getElementById('btnZoomIn');
    const btnOut = document.getElementById('btnZoomOut');
    const zoomLabel = document.getElementById('zoomValue');

    if (!slider) return;

    const updateZoom = (val) => {
      const photo = window.ResumeApp.state.photo;
      const newScale = val / 100;
      // Zoom from center of frame (120x120)
      const frameSize = 120;
      const centerX = frameSize / 2;
      const centerY = frameSize / 2;
      const oldScale = photo.scale;
      const scaleFactor = newScale / oldScale;
      photo.x = centerX + (photo.x - centerX) * scaleFactor;
      photo.y = centerY + (photo.y - centerY) * scaleFactor;
      photo.scale = newScale;
      zoomLabel.textContent = Math.round(val) + '%';
      this._applyTransform();
      window.ResumeApp.schedulePreview();
    };

    slider.addEventListener('input', () => updateZoom(parseFloat(slider.value)));

    btnIn.addEventListener('click', () => {
      const newVal = Math.min(300, parseFloat(slider.value) + 10);
      slider.value = newVal;
      updateZoom(newVal);
    });

    btnOut.addEventListener('click', () => {
      const newVal = Math.max(10, parseFloat(slider.value) - 10);
      slider.value = newVal;
      updateZoom(newVal);
    });

    // Scroll to zoom on frame
    const frame = document.getElementById('photoFrame');
    if (frame) {
      frame.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -5 : 5;
        const newVal = Math.min(300, Math.max(10, parseFloat(slider.value) + delta));
        slider.value = newVal;
        updateZoom(newVal);
      }, { passive: false });
    }
  },

  // ─── Drag Controls ───
  _bindDragControls() {
    const frame = document.getElementById('photoFrame');
    if (!frame) return;

    // Mouse events
    frame.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this._dragging = true;
      this._dragStart = {
        x: e.clientX - window.ResumeApp.state.photo.x,
        y: e.clientY - window.ResumeApp.state.photo.y
      };
      frame.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this._dragging) return;
      const photo = window.ResumeApp.state.photo;
      photo.x = e.clientX - this._dragStart.x;
      photo.y = e.clientY - this._dragStart.y;
      this._applyTransform();
      window.ResumeApp.schedulePreview();
    });

    document.addEventListener('mouseup', () => {
      if (this._dragging) {
        this._dragging = false;
        frame.style.cursor = 'grab';
      }
    });

    // Touch events
    frame.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this._dragging = true;
      this._dragStart = {
        x: touch.clientX - window.ResumeApp.state.photo.x,
        y: touch.clientY - window.ResumeApp.state.photo.y
      };
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!this._dragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      const photo = window.ResumeApp.state.photo;
      photo.x = touch.clientX - this._dragStart.x;
      photo.y = touch.clientY - this._dragStart.y;
      this._applyTransform();
      window.ResumeApp.schedulePreview();
    }, { passive: false });

    document.addEventListener('touchend', () => { this._dragging = false; });
  },

  // ─── Reset & Remove ───
  _bindResetRemove() {
    const btnReset = document.getElementById('btnResetPhoto');
    const btnRemove = document.getElementById('btnRemovePhoto');
    if (!btnReset || !btnRemove) return;

    btnReset.addEventListener('click', () => {
      const photo = window.ResumeApp.state.photo;
      if (!photo.src) return;
      const img = document.getElementById('photoImg');
      const frameSize = 120;
      const fitScale = Math.max(frameSize / this._imgNaturalSize.w, frameSize / this._imgNaturalSize.h);
      const scaledW = this._imgNaturalSize.w * fitScale;
      const scaledH = this._imgNaturalSize.h * fitScale;
      photo.scale = fitScale;
      photo.x = (frameSize - scaledW) / 2;
      photo.y = (frameSize - scaledH) / 2;
      document.getElementById('zoomSlider').value = Math.round(fitScale * 100);
      document.getElementById('zoomValue').textContent = Math.round(fitScale * 100) + '%';
      this._applyTransform();
      window.ResumeApp.schedulePreview();
      window.ResumeApp.showToast('Position reset', 'success');
    });

    btnRemove.addEventListener('click', () => {
      this.reset();
      window.ResumeApp.showToast('Photo removed');
    });
  },

  reset() {
    const photo = window.ResumeApp.state.photo;
    photo.src = null;
    photo.x = 0;
    photo.y = 0;
    photo.scale = 1.0;
    photo.croppedSrc = null;
    this._imgNaturalSize = { w: 0, h: 0 };

    const photoImg = document.getElementById('photoImg');
    if (photoImg) photoImg.src = '';
    document.getElementById('photoDropZone').style.display = 'flex';
    document.getElementById('photoEditor').style.display = 'none';
    document.getElementById('photoInput').value = '';
    document.getElementById('zoomSlider').value = 100;
    document.getElementById('zoomValue').textContent = '100%';
    window.ResumeApp.schedulePreview();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.ImageManager.init();
});
