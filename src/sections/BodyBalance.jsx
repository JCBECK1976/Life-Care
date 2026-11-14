import { readImageForAI } from "../lib/image.js";
import React from "react";
import PrivacyNote from "../components/PrivacyNote.jsx";
import { handleApiError } from "../lib/api.js";
import { looseJson, photoIssues } from "../lib/bodyPhotoCheck.js";
import { REGIONS, buildPrompt, latestStructured, makeRecord, measurementTrends, nextDue, parseAnalysis } from "../lib/bodyBalance.js";

// v2.12.0 F2 Body balance check (My Body). Opt-in per person. Photos are analysed and discarded: they live only in
// this function's memory for the one AI request. Only the structured result is saved (see src/lib/bodyBalance.js).
export default function BodyBalance(props) {
  var p = props.p || {}; var data = props.data; var who = props.activeTab;
  var name = (p.profile && p.profile.name) || who;
  var _b = React.useState(false); var busy = _b[0]; var setBusy = _b[1];
  var _m = React.useState(""); var msg = _m[0]; var setMsg = _m[1];
  var _i = React.useState(null); var issues = _i[0]; var setIssues = _i[1];   // v2.14.2: photos not recognised → [{ photo, msg }]
  var optIn = !!(p.bodyBalance && p.bodyBalance.optIn);
  var records = (p.progressPhotos || []).filter(function(r) { return r && r.scores; });
  var last = latestStructured(records); var prev = records.length > 1 ? records[records.length - 2] : null;
  var due = nextDue(last);

  var save = async function(mut) { var nd = JSON.parse(JSON.stringify(data)); mut(nd[who]); await props.saveData(nd); };
  var setOptIn = function(v) { return save(function(pp) { pp.bodyBalance = Object.assign({}, pp.bodyBalance || {}, { optIn: v }); }); };

  var run = async function(fileList) {
    var files = Array.prototype.slice.call(fileList || [], 0, 3);
    if (!files.length) return;
    setBusy(true); setIssues(null); setMsg("⏳ Looking at your photos… they are not saved.");
    try {
      var images = [];
      for (var i = 0; i < files.length; i++) {
        var _img = await readImageForAI(files[i]); var b64 = _img.data;   /* v2.14.0: shrunk before sending */
        images.push({ type: "image", source: { type: "base64", media_type: _img.mediaType, data: b64 } });
      }
      var prompt = buildPrompt({ name: name, count: files.length, prev: latestStructured(p.progressPhotos), trends: measurementTrends(p.measurements) });
      var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, temperature: 0, messages: [{ role: "user", content: images.concat([{ type: "text", text: prompt }]) }] }) });
      images = null;                                                     // the photos go no further than this request
      var result = await resp.json(); var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
      if (result.stop_reason === "max_tokens") throw new Error("The analysis was cut off — please try again");
      var txt = ""; (result.content || []).forEach(function(c) { if (c.text) txt += c.text; });
      var bad = photoIssues(looseJson(txt), files.length, "balance");
      if (bad.length) { setIssues(bad); setMsg(""); setBusy(false); return; }   // v2.14.2: nothing is analysed or saved from an invalid set
      var rec = makeRecord(parseAnalysis(txt), (data.config && data.config.week) || null);
      await save(function(pp) { pp.progressPhotos = (pp.progressPhotos || []).concat([rec]); });
      setMsg("✓ Checked " + rec.pose.replace(/\+/g, ", ") + ". Photos were not saved.");
    } catch (e) { setMsg("⚠️ " + (window.isEnergyEmpty && window.isEnergyEmpty(e) ? window.energyEmptyMsg : String(e.message || e).substring(0, 140))); }
    setBusy(false);
  };

  var acceptFlag = function(i) { return save(function(pp) { var r = pp.progressPhotos[pp.progressPhotos.length - 1]; r.flags[i].accepted = true; }); };
  var regionLabel = function(k) { var r = REGIONS.find(function(x) { return x.k === k; }); return r ? r.l : k; };
  var card = { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14 };

  return (<div data-testid="body-balance" style={card}>
    <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>📸 Body balance check</div>
    <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.5, marginBottom: 8 }}>Front, side and back photos, about every 4 weeks. The Companion scores the same checklist each time and compares it with your last check and your tape measurements. <b>Photos are analysed and never stored</b> — only the scores and notes are kept. Suggestions only: nothing in your plan changes unless you choose.</div>
    {!optIn ? (<button onClick={function() { setOptIn(true); }} style={{ width: "100%", padding: 10, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Turn on body balance checks for {name}</button>) : (<div>
      <div data-testid="bb-status" style={{ fontSize: 11, color: "#0f172a", marginBottom: 8 }}>{last ? "Last check " + last.date + " (" + last.pose.replace(/\+/g, ", ") + ")" + (due ? " · next suggested " + due.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "") : "No progress photos yet. Take front, side and back photos (same light, same distance, relaxed) to start."}</div>
      <label style={{ display: "block", padding: 10, background: "#f8fafc", border: "2px dashed #93c5fd", borderRadius: 8, textAlign: "center", cursor: busy ? "wait" : "pointer", fontSize: 12, fontWeight: 600, color: "#1e3a5f" }}>
        {busy ? "⏳ Checking…" : "📸 Choose photos (front, side, back)"}
        <input id="bb-photos" type="file" data-share="progress" accept="image/*" multiple disabled={busy} onChange={function(e) { run(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
      </label>
      {issues && (<div data-testid="bb-issues" style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a" }}>
        {issues.map(function(x) { return <div key={x.photo} role="alert" data-testid="bb-issue" style={{ fontSize: 11, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>Photo {x.photo}: {x.msg}</div>; })}
        <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>No scores were worked out and nothing was saved.</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button disabled style={{ flex: 1, padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, opacity: 0.45, cursor: "not-allowed" }}>Save</button>
          <button onClick={function() { var el = document.getElementById("bb-photos"); if (el) el.click(); }} style={{ flex: 1, padding: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Retake</button>
          <button onClick={function() { setIssues(null); }} style={{ flex: 1, padding: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>)}
      {msg && <div data-testid="bb-msg" role="status" style={{ fontSize: 11, fontWeight: 600, marginTop: 6, color: msg.charAt(0) === "✓" ? "#166534" : msg.charAt(0) === "⏳" ? "#0c4a6e" : "#991b1b" }}>{msg}</div>}
      {last && (<div style={{ marginTop: 10 }}>
        <table data-testid="bb-scores" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}><tbody>
          {REGIONS.map(function(r) { var s = last.scores[r.k]; var ps = prev && prev.scores ? prev.scores[r.k] : null; var ch = ps == null ? "" : s > ps ? "▲" : s < ps ? "▼" : "="; return (<tr key={r.k} data-testid={"bb-" + r.k} style={{ borderBottom: "1px solid #f1f5f9" }}>
            <td style={{ padding: "4px 2px", color: "#334155" }}>{r.l}</td>
            <td style={{ padding: "4px 2px", whiteSpace: "nowrap", fontWeight: 700, color: s <= 2 ? "#b45309" : "#15803d" }}>{"●".repeat(s)}<span style={{ color: "#e2e8f0" }}>{"●".repeat(5 - s)}</span> {s}/5</td>
            <td data-testid={"bb-change-" + r.k} style={{ padding: "4px 2px", color: ch === "▲" ? "#15803d" : ch === "▼" ? "#b91c1c" : "#475569", fontWeight: 700 }}>{ch}{ps != null && ch !== "=" ? " " + ps + "→" + s : ""}</td>
            <td style={{ padding: "4px 2px", fontSize: 10, color: "#475569" }}>{last.notes[r.k]}</td>
          </tr>); })}
        </tbody></table>
        {last.summary && <div style={{ fontSize: 11, color: "#334155", marginTop: 8 }}>{last.summary}</div>}
        {(last.flags || []).map(function(f, i) { return (<div key={i} data-testid="bb-flag" style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 11 }}>
          <div style={{ fontWeight: 700, color: "#92400e" }}>{regionLabel(f.region)}: {f.issue}</div>
          <div style={{ color: "#334155", margin: "2px 0 6px" }}>Suggestion: {f.suggestion}</div>
          {f.accepted ? <div style={{ fontWeight: 700, color: "#166534" }}>✓ Accepted — your companion will keep this in mind</div> : <button onClick={function() { acceptFlag(i); }} style={{ padding: "6px 12px", background: "#fff", border: "1px solid #d97706", color: "#92400e", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Accept suggestion</button>}
        </div>); })}
      </div>)}
      <PrivacyNote />
      <button onClick={function() { setOptIn(false); }} style={{ marginTop: 10, background: "none", border: "none", color: "#475569", fontSize: 10, cursor: "pointer", textDecoration: "underline" }}>Turn off body balance checks</button>
    </div>)}
  </div>);
}
