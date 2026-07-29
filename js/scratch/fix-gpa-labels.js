/**
 * fix-gpa-labels.js
 * Replaces hardcoded GPA/CGPA labels in templates.js with dynamic e.gpaType
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'templates.js');
let src = fs.readFileSync(filePath, 'utf8');

// ── T1 (line 107): GPA inside tpl1-entry-sub ──────────────────────────────
// Old: ${e.gpa ? ` · GPA: ${this._esc(e.gpa)}` : ''}
// New: ${(e.gpaType || e.gpa) && e.gpa ? ` · ${this._esc(e.gpaType || 'GPA')}: ${this._esc(e.gpa)}` : ''}
src = src.replace(
  /\$\{e\.gpa \? ` · GPA: \$\{this\._esc\(e\.gpa\)\}` : ''\}/g,
  "${(e.gpaType || e.gpa) && e.gpa ? ` \u00b7 ${this._esc(e.gpaType || 'GPA')}: ${this._esc(e.gpa)}` : ''}"
);

// ── T2 + T3 (lines 176 & 296): standalone GPA div ────────────────────────
// Old: ${e.gpa ? `<div style="font-size:8.5pt;color:#64748B;">GPA: ${this._esc(e.gpa)}</div>` : ''}
// New: ${(e.gpaType || e.gpa) && e.gpa ? `<div ...>${e.gpaType || 'GPA'}: ...</div>` : ''}
src = src.replace(
  /\$\{e\.gpa \? `<div style="font-size:8\.5pt;color:#64748B;">GPA: \$\{this\._esc\(e\.gpa\)\}<\/div>` : ''\}/g,
  "${(e.gpaType || e.gpa) && e.gpa ? `<div style=\"font-size:8.5pt;color:#64748B;\">${this._esc(e.gpaType || 'GPA')}: ${this._esc(e.gpa)}</div>` : ''}"
);

// ── T4 (line 469): CGPA in dark sidebar ──────────────────────────────────
// Old: ${e.gpa    ? `<div style="font-size:7.5pt;color:rgba(255,255,255,0.5);">CGPA: ${this._esc(e.gpa)}</div>` : ''}
// New: dynamic
src = src.replace(
  /\$\{e\.gpa\s+\? `<div style="font-size:7\.5pt;color:rgba\(255,255,255,0\.5\);">CGPA: \$\{this\._esc\(e\.gpa\)\}<\/div>` : ''\}/g,
  "${(e.gpaType || e.gpa) && e.gpa ? `<div style=\"font-size:7.5pt;color:rgba(255,255,255,0.5);\">${this._esc(e.gpaType || 'GPA')}: ${this._esc(e.gpa)}</div>` : ''}"
);

fs.writeFileSync(filePath, src, 'utf8');
console.log('Done. Verifying replacements...');

// Verify no hardcoded GPA/CGPA labels remain
const lines = src.split('\n');
lines.forEach((l, i) => {
  if (/`GPA:\s/.test(l) || /`CGPA:\s/.test(l)) {
    console.warn(`  WARNING – hardcoded label still on line ${i + 1}: ${l.trim()}`);
  }
});
const dynamicCount = (src.match(/e\.gpaType \|\| 'GPA'/g) || []).length;
console.log(`  Dynamic gpaType replacements applied: ${dynamicCount}`);
