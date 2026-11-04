"""Verbatim lift (MIGRATION_BRIEF 3.3 stage 1).
Copies the <script type="text/babel"> body of public/legacy.html into src/App.jsx
and the page shell into index.html, without anyone reading the file.
Run once: python3 scripts/lift-legacy.py
"""
import re, sys
src = open("public/legacy.html", encoding="utf-8").read()

OPEN = '<script type="text/babel">\n'
CLOSE = '\n  </script>\n</body>'
RENDER = '\n    ReactDOM.createRoot(document.getElementById("root")).render(<Dashboard />);'
assert src.count(OPEN) == 1 and src.count(CLOSE) == 1, "markers not unique"
body = src[src.index(OPEN) + len(OPEN): src.index(CLOSE)]
assert body.endswith(RENDER), "render line not where expected"
body = body[: -len(RENDER)].rstrip("\n") + "\n"

header = (
    "// Lifted verbatim from the legacy single-file index.html (v1.374.2).\n"
    "// Only changes: these imports replace CDN globals, and `export default`\n"
    "// replaces the ReactDOM render call (now in main.jsx).\n"
    'import React from "react";\n'
    'import firebase from "./lib/firebase.js";\n\n'
)
open("src/App.jsx", "w", encoding="utf-8").write(header + body + "\nexport default Dashboard;\n")

# Page shell: everything up to and including <div id="root"></div>, unchanged.
ROOT = '<div id="root"></div>\n'
assert src.count(ROOT) == 1
shell = src[: src.index(ROOT) + len(ROOT)]
shell += (
    '\n  <!-- Google Identity Services -->\n'
    '  <script src="https://accounts.google.com/gsi/client" async defer></script>\n'
    '\n  <script type="module" src="/src/main.jsx"></script>\n'
    '</body>\n</html>\n'
)
open("index.html", "w", encoding="utf-8").write(shell)
print("App.jsx lines:", (header + body).count("\n") + 2, "| index.html lines:", shell.count("\n"))
