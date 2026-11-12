import React from "react";

// v2.11.0 F8 "Share to Lifecare Companion" (Android). The service worker keeps images shared from another app in
// Cache Storage ("lc-share"). This picker appears once the user is signed in (so nothing is lost while signing in),
// asks "What is this?" and hands the image(s) to the EXISTING upload for that kind, by setting the files on that
// upload's file input. The images are deleted from the device as soon as an upload has taken them.
export var SHARE_CACHE = "lc-share";

export async function readSharedFiles() {
  if (typeof caches === "undefined") return [];
  var cache = await caches.open(SHARE_CACHE); var keys = await cache.keys(); var out = [];
  for (var i = 0; i < keys.length; i++) {
    var r = await cache.match(keys[i]); if (!r) continue;
    var b = await r.blob();
    out.push(new File([b], decodeURIComponent(r.headers.get("X-Name") || "shared.jpg"), { type: b.type || r.headers.get("Content-Type") || "image/jpeg" }));
  }
  return out;
}
export async function clearShared() { if (typeof caches !== "undefined") await caches.delete(SHARE_CACHE); }

async function handTo(kind, files) {
  for (var i = 0; i < 50; i++) {
    var el = document.querySelector('input[type="file"][data-share="' + kind + '"]');
    if (el) {
      var dt = new DataTransfer();
      (el.multiple ? files : files.slice(0, 1)).forEach(function(f) { dt.items.add(f); });
      el.files = dt.files;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    await new Promise(function(res) { setTimeout(res, 100); });
  }
  return false;
}

var KINDS = [
  { k: "body", label: "📏 Body measurements", hint: "a screenshot from your scales or measurement app" },
  { k: "progress", label: "📸 Progress photo", hint: "body balance check (analysed, never stored)" },
  { k: "food", label: "🍽 Food", hint: "checked in the Food Checker" },
];

export default function SharePicker(props) {
  var _f = React.useState(null); var files = _f[0]; var setFiles = _f[1];
  var _m = React.useState(""); var msg = _m[0]; var setMsg = _m[1];
  React.useEffect(function() { readSharedFiles().then(function(f) { if (f.length) setFiles(f); }).catch(function() {}); }, [setFiles]);
  if (!files) return null;
  var tidyUrl = function() { if (/[?&]share=1/.test(window.location.search)) window.history.replaceState(null, "", window.location.pathname); };
  var choose = async function(kind) {
    props.go(kind);
    var ok = await handTo(kind, files);
    if (ok) { await clearShared(); setFiles(null); tidyUrl(); }
    else setMsg("Couldn't open that upload. The image is still kept on this phone; try again.");
  };
  var btn = { display: "block", width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 6, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#0f172a", cursor: "pointer" };
  return (<div role="dialog" aria-modal="true" aria-label="What is this?" data-testid="share-picker" style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
    <div style={{ background: "#fff", width: "100%", maxWidth: 480, borderRadius: "16px 16px 0 0", padding: 16, boxSizing: "border-box" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>What is this?</div>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>{files.length === 1 ? "1 image" : files.length + " images"} shared with Lifecare Companion. It stays on this phone until you choose.</div>
      {KINDS.map(function(o) { return <button key={o.k} onClick={function() { choose(o.k); }} style={btn}>{o.label}<div style={{ fontSize: 10, fontWeight: 400, color: "#64748b" }}>{o.hint}</div></button>; })}
      {msg && <div role="alert" style={{ fontSize: 11, color: "#991b1b", fontWeight: 600, margin: "4px 0 8px" }}>{msg}</div>}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <button onClick={function() { setFiles(null); tidyUrl(); }} style={{ flex: 1, padding: 10, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Later (keep it)</button>
        <button onClick={async function() { await clearShared(); setFiles(null); tidyUrl(); }} style={{ flex: 1, padding: 10, background: "#fff", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer" }}>Discard</button>
      </div>
    </div>
  </div>);
}
