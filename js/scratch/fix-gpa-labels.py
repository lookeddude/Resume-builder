import re, os

fp = os.path.join(os.path.dirname(__file__), '..', 'templates.js')
with open(fp, 'r', encoding='utf-8') as f:
    src = f.read()

original = src

# T1: GPA inside tpl1-entry-sub string (backtick template literal)
src = re.sub(
    r"\$\{e\.gpa \? ` · GPA: \$\{this\._esc\(e\.gpa\)\}` : ''\}",
    "${(e.gpaType || e.gpa) && e.gpa ? ` \u00b7 ${this._esc(e.gpaType || 'GPA')}: ${this._esc(e.gpa)}` : ''}",
    src
)

# T2 + T3: standalone div with GPA (8.5pt)
src = re.sub(
    r"\$\{e\.gpa \? `<div style=\"font-size:8\.5pt;color:#64748B;\">GPA: \$\{this\._esc\(e\.gpa\)\}</div>` : ''\}",
    '${(e.gpaType || e.gpa) && e.gpa ? `<div style="font-size:8.5pt;color:#64748B;">${this._esc(e.gpaType || \'GPA\')}: ${this._esc(e.gpa)}</div>` : \'\'}',
    src
)

# T4: CGPA in dark sidebar (7.5pt)
src = re.sub(
    r"\$\{e\.gpa\s+\? `<div style=\"font-size:7\.5pt;color:rgba\(255,255,255,0\.5\);\">CGPA: \$\{this\._esc\(e\.gpa\)\}</div>` : ''\}",
    '${(e.gpaType || e.gpa) && e.gpa ? `<div style="font-size:7.5pt;color:rgba(255,255,255,0.5);">${this._esc(e.gpaType || \'GPA\')}: ${this._esc(e.gpa)}</div>` : \'\'}',
    src
)

# Count changes
dynamic_count = src.count("e.gpaType || 'GPA'")
print(f"Dynamic replacements applied: {dynamic_count}")

# Check for remaining hardcoded labels
for i, line in enumerate(src.splitlines(), 1):
    if ('`GPA: ' in line or '`CGPA: ' in line) and 'e.gpaType' not in line:
        print(f"WARNING - hardcoded still on line {i}: {line.strip()}")

if src != original:
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(src)
    print("File written successfully.")
else:
    print("ERROR: No replacements made - patterns did not match.")
