# ZXScript Agent Workflows & Maintenance Procedures
> **Project:** ZXScript - Autonomous Roblox Studio AI Agent Bridge  
> **Author & Maintainer:** [zxd44](https://github.com/zxd44) (ZirconX) <gonhackergamer0@gmail.com>  
> **Version:** `0.0.3` | **License:** GPL-3.0

This document defines standard development workflows, test commands, and maintenance procedures for ZXScript.

---

## 1. Testing & Verification Workflow

Run these commands before any commit or release:

```powershell
# 1. Verify Python backend compilation across all modules
python -c "import glob, py_compile; [py_compile.compile(f, doraise=True) for f in glob.glob('bridge/*.py')]; print('All Python files compile cleanly!')"

# 2. Test command parser
node zxscript-extension/test-parser.js

# 3. Test ChatGPT provider adapter
node zxscript-extension/test-chatgpt.js

# 4. Test Claude provider adapter
node zxscript-extension/test-claude.js
```

---

## 2. File Length Audit Workflow

Ensure that all files comply with the 500-600 line limit:

```powershell
node -e "const fs = require('fs'); const path = require('path');
function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules' || f === '.git' || f === 'skills') continue;
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) res = res.concat(walk(p));
    else if (p.endsWith('.js') || p.endsWith('.py') || p.endsWith('.css') || p.endsWith('.html')) {
      const lines = fs.readFileSync(p, 'utf8').split('\n').length;
      if (lines > 600) res.push({ file: p, lines });
    }
  }
  return res;
}
const over = walk('.');
if (over.length) { console.error('Files exceeding 600 lines:', over); process.exit(1); }
else { console.log('All modular code files are strictly within line limits!'); }"
```

---

## 3. Release & Packaging Workflow

1. Update version tags across:
   - `bridge/constants.py`
   - `zxscript-extension/manifest.json`
   - `zxscript-extension/core/constants.js`
   - `README.md` and `docs/CHANGELOG.md`
2. Build standalone Windows binary:
   ```powershell
   python scripts/build_exe.py
   ```
3. Tag commit and create GitHub Release under `zxd44/ZXScript`.
