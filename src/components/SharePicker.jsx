import React from "react";
import PersonTabs from "./PersonTabs.jsx";
import { bodyPhotosOn } from "../lib/platform.js";
import { planAllows } from "../lib/myPlan.js";

import { EAT_CATEGORIES, eatCategoryFor } from "../lib/eatShare.js";

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
  { k: "progress", label: "📸 Progress photo", hint: "body balance check (analysed, never stored)", bodyPhotos: true },   // v2.37.2: hidden with Body Balance
  { k: "food", label: "🍽 Food", hint: "checked in the Food Checker" },
];

export default function SharePicker(props) {
  var _f = React.useState(null); var files = _f[0]; var setFiles = _f[1];
  var _m = React.useState(""); var msg = _m[0]; var setMsg = _m[1];
  // v2.16.4: whose upload is it? Defaults to the current person (same toggle style as the Log form).
  var _p = React.useState(null); var who = _p[0] || props.activeKey; var setWho = _p[1];
  var _e = React.useState(false); var eatOpen = _e[0]; var setEatOpen = _e[1];
  var _c = React.useState(function() { return eatCategoryFor(new Date()); }); var eatCat = _c[0]; var setEatCat = _c[1];
  React.useEffect(function() {
    var read = function() { readSharedFiles().then(function(f) { if (f.length) setFiles(f); }).catch(function() {}); };
    read(); window.addEventListener("lc-shared", read);   // v2.44.0: Android hands an image over (lib/nativeShare.js)
    return function() { window.removeEventListener("lc-shared", read); };
  }, [setFiles]);
  if (!files) return null;
  var tidyUrl = function() { if (/[?&]share=1/.test(window.location.search)) window.history.replaceState(null, "", window.location.pathname); };
  var choose = async function(kind) {
    if (props.setPerson && who && who !== props.activeKey) props.setPerson(who);
    props.go(kind);
    var ok = await handTo(kind, files);
    if (ok) { await clearShared(); setFiles(null); tidyUrl(); }
    else setMsg("Couldn't open that upload. The image is still kept on this phone; try again.");
  };
  var addToEating = async function() {
    var switched = !!(props.setPerson && who && who !== props.activeKey);
    window._lcEatShare = { who: who, cat: eatCat, file: files[0], switched: switched };
    if (switched) props.setPerson(who);
    props.go("eat");
    await clearShared(); setFiles(null); tidyUrl();
  };
  var btn = { display: "block", width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 6, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#0f172a", cursor: "pointer" };
  return (<div role="dialog" aria-modal="true" aria-label="What is this?" data-testid="share-picker" style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
    <div style={{ background: "#fff", width: "100%", maxWidth: 480, borderRadius: "16px 16px 0 0", padding: 16, boxSizing: "border-box" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>What is this?</div>
      <div style={{ fontSize: 11, color: "#475569", marginBottom: 12 }}>{files.length === 1 ? "1 image" : files.length + " images"} shared with Lifecare Companion. It stays on this phone until you choose.</div>
      {props.people && props.people.length > 1 && (<div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>For</div>
        <div style={{ display: "flex", background: props.accentMid || "#1e3a5f", borderRadius: 6, padding: 2 }}>
          <PersonTabs testId="share-person-tabs" people={props.people} activeKey={who} rowStyle={{ gap: 0 }}
            tabStyle={{ padding: "5px 10px", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
            activeStyle={{ background: "#fff", color: "#0f172a" }} inactiveStyle={{ background: "transparent", color: "rgba(255,255,255,0.8)" }}
            onSelect={function(k) { setWho(k); }} />
        </div>
      </div>)}
      {KINDS.filter(function(o) { return !o.bodyPhotos || bodyPhotosOn(); }).map(function(o) { return <button key={o.k} onClick={function() { choose(o.k); }} style={btn}>{o.label}<div style={{ fontSize: 10, fontWeight: 400, color: "#475569" }}>{o.hint}</div></button>; })}
      {planAllows("snap") && (!eatOpen ? <button data-testid="share-eat" onClick={function() { setEatOpen(true); }} style={btn}>🍴 Add to today's eating<div style={{ fontSize: 10, fontWeight: 400, color: "#475569" }}>a new row today, checked with Snap</div></button>
        : <div data-testid="share-eat-form" style={Object.assign({}, btn, { cursor: "default" })}>
          <label htmlFor="share-eat-cat" style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Add to today's</label>
          <select id="share-eat-cat" value={eatCat} onChange={function(e) { setEatCat(e.target.value); }} style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, marginBottom: 8, background: "#fff" }}>
            {EAT_CATEGORIES.map(function(o) { return <option key={o[0]} value={o[0]}>{o[1]}</option>; })}
          </select>
          <button onClick={addToEating} style={{ width: "100%", padding: 10, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add and check with Snap</button>
        </div>)}
      {msg && <div role="alert" style={{ fontSize: 11, color: "#991b1b", fontWeight: 600, margin: "4px 0 8px" }}>{msg}</div>}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <button onClick={function() { setFiles(null); tidyUrl(); }} style={{ flex: 1, padding: 10, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Later (keep it)</button>
        <button onClick={async function() { await clearShared(); setFiles(null); tidyUrl(); }} style={{ flex: 1, padding: 10, background: "#fff", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#b91c1c", cursor: "pointer" }}>Discard</button>
      </div>
    </div>
  </div>);
}
