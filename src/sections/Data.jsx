import firebase, { DATA_ROOT } from "../lib/firebase.js";
import { auditLog } from "../lib/audit.js";
import { btnMuted } from "../constants/styles.js";
import { personName } from "../components/PersonTabs.jsx";
import { useEffect, useState } from "react";
import { APP_ENV } from "../constants/version.js";
import { backupCounts, parseBackupInput, restoreTarget } from "../lib/backup.js";

/* v2.6.5 Download backup: the REAL data ("data", whatever environment this is) plus "data_build", in the same shape
   as a Firebase console export of the database root: { "data": {...}, "data_build": {...} }. */
export function backupFileName(env, now) {
  var d = now || new Date(); var p = function(n) { return String(n).padStart(2, "0"); };
  return "lifecare_backup_" + env + "_" + d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + ".json";
}
async function readBackup() {
  var real = await firebase.database().ref("data").once("value");
  var out = { data: real.val() || {} };
  // v2.7.1: only the Build app has a second section, its own copy. DATA_ROOT is written in at build time ("data" on
  // Beta/Prod), so Beta/Prod bundles contain no code or name for the build copy.
  if (DATA_ROOT !== "data") { var own = await firebase.database().ref(DATA_ROOT).once("value"); out[DATA_ROOT] = own.val() || {}; }
  return out;
}

export default function DataSection({ ctx }) {
  const {
    accent, accentBorder, accentLight, data, dataExpandEx, saveData, setDataExpandEx, setFormMsg, setSection
  } = ctx;
  /* v2.15.0: Settings → Data & backups opens this page at the chosen tool */
  useEffect(function() { var t = window._lcDataFocus; window._lcDataFocus = null; if (!t) return; var el = document.querySelector('[data-testid="' + t + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" }); }, []);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");
  var downloadBackup = async function() {
    setBackupBusy(true); setBackupMsg("");
    try {
      var exp = await readBackup();
      var text = JSON.stringify(exp, null, 2);
      var name = backupFileName(APP_ENV);
      var blob = new Blob([text], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(a.href); }, 5000);
      var kb = blob.size / 1024; var size = kb >= 1024 ? (kb / 1024).toFixed(1) + " MB" : Math.max(1, Math.round(kb)) + " KB";
      var count = function(o) { return Object.keys(o || {}).length; };
      var meals = Object.keys(exp.data).filter(function(k) { return /^(mealplan|eat_children):/.test(k); }).length;
      setBackupMsg("✓ Downloaded " + name + " (" + size + "): data " + count(exp.data) + " items (" + meals + " meal weeks)" + (DATA_ROOT !== "data" ? ", " + DATA_ROOT + " " + count(exp[DATA_ROOT]) + " items" : "") + ".");
    } catch (e) { setBackupMsg("Backup failed: " + String(e.message || e).substring(0, 120) + ". Nothing was downloaded."); }
    setBackupBusy(false);
  };
  const [restoreParsed, setRestoreParsed] = useState(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState("");
  /* The original safe merge (unchanged logic): adds missing exercise weeks from the backup's exercise data */
  var mergeExerciseWeeks = function(backup) {
            var nd = JSON.parse(JSON.stringify(data));
            var restored = 0;
            var people = ["jc", "becks"];
            people.forEach(function(person) {
              if (!backup[person] || !backup[person].exercises) return;
              if (!nd[person]) return;
              if (!nd[person].exercises) nd[person].exercises = {};
              var bDays = Object.keys(backup[person].exercises);
              bDays.forEach(function(day) {
                if (!nd[person].exercises[day]) nd[person].exercises[day] = [];
                var bExList = backup[person].exercises[day];
                bExList.forEach(function(bEx) {
                  var found = false;
                  for (var ei = 0; ei < nd[person].exercises[day].length; ei++) {
                    if (nd[person].exercises[day][ei].name === bEx.name) {
                      found = true;
                      var existing = nd[person].exercises[day][ei];
                      if (!existing.prog) existing.prog = [];
                      var bProg = bEx.prog || [];
                      bProg.forEach(function(bp) {
                        var has = false;
                        for (var pi = 0; pi < existing.prog.length; pi++) {
                          if (existing.prog[pi].wk === bp.wk) { has = true; break; }
                        }
                        if (!has) {
                          existing.prog.push({ wk: bp.wk, w: bp.w, r: bp.r, note: bp.note || "" });
                          restored++;
                        }
                      });
                      existing.prog.sort(function(a, b) { return (a.wk || 0) - (b.wk || 0); });
                      existing.current = bEx.current || existing.current;
                      existing.reps = bEx.reps || existing.reps;
                      existing.status = bEx.status || existing.status;
                      if (bEx.notes) existing.notes = bEx.notes;
                      if (bEx.target) existing.target = bEx.target;
                      break;
                    }
                  }
                  if (!found) {
                    nd[person].exercises[day].push(bEx);
                    restored += (bEx.prog || []).length;
                  }
                });
              });
              if (backup[person].body) nd[person].body = backup[person].body;
              if (backup[person].measurements) nd[person].measurements = backup[person].measurements;
              if (backup[person].bloods) nd[person].bloods = backup[person].bloods;
              if (backup[person].profile) nd[person].profile = backup[person].profile;
              if (backup[person].meds) nd[person].meds = backup[person].meds;
            });
            if (backup.config) {
              nd.config = nd.config || {};
              if (backup.config.trainingStart) nd.config.trainingStart = backup.config.trainingStart;
            }
            return { nd: nd, restored: restored };
  };

  return (
<div>
  <button onClick={function() { setSection("admin"); }} style={{ ...btnMuted, marginBottom: 12 }}>← Back to Settings</button>
  <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Firebase Data Viewer</div>
  <div data-testid="backup" style={{ padding: 10, background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe", marginBottom: 12 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a5f", marginBottom: 4 }}>Backup</div>
    <div style={{ fontSize: 10, color: "#475569", marginBottom: 6, lineHeight: 1.4 }}>Downloads all real data ("data", shared by the app and beta) {DATA_ROOT !== "data" ? <> and this test app's own copy ({DATA_ROOT})</> : null} as one dated file, in the same layout as a Firebase console export. Keep it somewhere safe; it contains health data.</div>
    <button onClick={downloadBackup} disabled={backupBusy} style={{ width: "100%", padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{backupBusy ? "Preparing…" : "⬇️ Download backup"}</button>
    {backupMsg && <div data-testid="backup-msg" style={{ fontSize: 11, fontWeight: 600, color: backupMsg.charAt(0) === "✓" ? "#166534" : "#991b1b", marginTop: 6 }}>{backupMsg}</div>}
  </div>
  <div data-testid="data-viewer" style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Data viewer</div>
  {(() => {
    if (!data) return (<div style={{fontSize:11,color:"#94a3b8"}}>No data loaded</div>);
    var people = Object.keys(data).filter(function(k) { return data[k] && data[k].exercises; });
    return (<div>
      {people.map(function(person) {
        var exercises = data[person].exercises;
        var days = Object.keys(exercises);
        return (<div key={person} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: accent, marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{personName(data, person)}</div>
          {days.map(function(day) {
            var exList = exercises[day] || [];
            return (<div key={day} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4, textTransform: "capitalize" }}>{day} ({exList.length} exercises)</div>
              {exList.map(function(ex, i) {
                var pc = (ex.prog || []).length;
                var lp = ex.prog && ex.prog.length > 0 ? ex.prog[ex.prog.length - 1] : null;
                return (<div key={i} style={{ padding: "6px 8px", marginBottom: 3, background: pc > 0 ? "#f0fdf4" : "#fef2f2", borderRadius: 6, border: "1px solid " + (pc > 0 ? "#86efac" : "#fecaca"), fontSize: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={function(){setDataExpandEx(dataExpandEx === person+"-"+day+"-"+i ? null : person+"-"+day+"-"+i);}}>
                    <span style={{ fontWeight: 600 }}>{ex.name}</span>
                    <span style={{ color: pc > 0 ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{pc} logs {dataExpandEx === person+"-"+day+"-"+i ? "\u25B2" : "\u25BC"}</span>
                  </div>
                  <div style={{ color: "#64748b", fontSize: 10 }}>Current: {ex.current || "?"} / {ex.reps || "?"}</div>
                  {dataExpandEx === person+"-"+day+"-"+i && (<div style={{ marginTop: 6, borderTop: "1px solid #e2e8f0", paddingTop: 6 }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4, fontSize: 9, fontWeight: 700, color: "#64748b" }}>
                      <span style={{width:35}}>WEEK</span><span style={{flex:1}}>WEIGHT</span><span style={{flex:1}}>REPS</span><span style={{flex:2}}>NOTES</span>
                    </div>
                    {(ex.prog || []).map(function(p, pi) {
                      var wk = p.wk || p.week || pi+1;
                      var wt = p.w || p.weight || "?";
                      var rp = p.r || p.reps || "?";
                      var nt = p.note || p.notes || "";
                      return (<div key={pi} style={{ display: "flex", gap: 4, marginBottom: 2, fontSize: 10, padding: "3px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{width:35,fontWeight:600}}>{wk}</span>
                        <span style={{flex:1}}>{wt}</span>
                        <span style={{flex:1}}>{rp}</span>
                        <span style={{flex:2,color:"#64748b"}}>{nt}</span>
                      </div>);
                    })}
                    {pc === 0 && <div style={{fontSize:10,color:"#94a3b8",fontStyle:"italic"}}>No logged weeks</div>}
                  </div>)}
                </div>);
              })}
            </div>);
          })}
        </div>);
      })}
      <div style={{ marginTop: 16, padding: 10, background: accentLight, borderRadius: 8, border: "1px solid " + accentBorder }}>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Raw Firebase Keys</div>
        <button onClick={async function() {
          setFormMsg("Reading Firebase...");
          try {
            var snap = await firebase.database().ref(DATA_ROOT).once("value");
            var all = snap.val();
            var keys = Object.keys(all || {});
            var summary = keys.map(function(k) {
              var v = all[k];
              return k + " (" + typeof v + ")";
            });
            setFormMsg(summary.join("\n"));
          } catch(e) { setFormMsg(window.aiErrorMsg(e)); }
          setTimeout(function(){setFormMsg("");}, 30000);
        }} style={{ width: "100%", padding: 8, background: accent, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Show All Firebase Keys</button>
      </div>
      <div style={{ marginTop: 10, padding: 10, background: "#fef3c7", borderRadius: 8, border: "1px solid #fcd34d" }}>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Recovery: Read Comment Keys</div>
        <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>Comments are saved separately at log time. Missing weeks may be recoverable.</div>
        <button onClick={async function() {
          setFormMsg("Reading all comment keys...");
          try {
            var snap = await firebase.database().ref(DATA_ROOT).once("value");
            var all = snap.val();
            if (!all) { setFormMsg("No data"); return; }
            var keys = Object.keys(all);
            var comments = {};
            keys.forEach(function(k) {
              if (k.indexOf("comment:") === 0) {
                var parts = k.split(":");
                var person = parts[1];
                var exercise = parts[2];
                var week = parts[3];
                if (!comments[person]) comments[person] = {};
                if (!comments[person][exercise]) comments[person][exercise] = {};
                comments[person][exercise]["w" + week] = all[k];
              }
            });
            var summary = [];
            Object.keys(comments).forEach(function(person) {
              summary.push("=== " + person.toUpperCase() + " ===");
              Object.keys(comments[person]).sort().forEach(function(ex) {
                var weeks = Object.keys(comments[person][ex]).sort();
                summary.push(ex + ": " + weeks.join(", "));
                weeks.forEach(function(w) {
                  var val = comments[person][ex][w];
                  if (typeof val === "string" && val.length < 200) {
                    summary.push("  " + w + ": " + val);
                  }
                });
              });
            });
            setFormMsg(summary.join("\n"));
          } catch(e) { setFormMsg(window.aiErrorMsg(e)); }
          setTimeout(function(){setFormMsg("");}, 60000);
        }} style={{ width: "100%", padding: 8, background: "#d97706", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", marginBottom: 6 }}>Show Comment Data</button>
        <button onClick={async function() {
          setFormMsg("Rebuilding from comments...");
          try {
            var snap = await firebase.database().ref(DATA_ROOT).once("value");
            var all = snap.val();
            if (!all) { setFormMsg("No data"); return; }
            var keys = Object.keys(all);
            var nd = JSON.parse(JSON.stringify(data));
            var restored = 0;
            keys.forEach(function(k) {
              if (k.indexOf("comment:") === 0) {
                var parts = k.split(":");
                var person = parts[1];
                var exercise = parts[2];
                var weekNum = parseInt(parts[3]);
                if (!nd[person] || !nd[person].exercises) return;
                var days = Object.keys(nd[person].exercises);
                for (var di = 0; di < days.length; di++) {
                  var exList = nd[person].exercises[days[di]];
                  for (var ei = 0; ei < exList.length; ei++) {
                    if (exList[ei].name === exercise) {
                      var prog = exList[ei].prog || [];
                      var hasWeek = false;
                      for (var pi = 0; pi < prog.length; pi++) {
                        if (prog[pi].wk === weekNum) { hasWeek = true; break; }
                      }
                      if (!hasWeek && weekNum > 0) {
                        prog.push({ wk: weekNum, w: exList[ei].current || "?", r: exList[ei].reps || "?", note: String(all[k]).substring(0, 100) });
                        exList[ei].prog = prog.sort(function(a, b) { return (a.wk || 0) - (b.wk || 0); });
                        restored++;
                      }
                    }
                  }
                }
              }
            });
            if (restored > 0) {
              await saveData(nd);
              setFormMsg("Restored " + restored + " missing week entries from comments. Reload to see changes.");
            } else {
              setFormMsg("No missing weeks found to restore.");
            }
          } catch(e) { setFormMsg(window.aiErrorMsg(e)); }
          setTimeout(function(){setFormMsg("");}, 30000);
        }} style={{ width: "100%", padding: 8, background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Restore Missing Weeks from Comments</button>
      </div>
      <div data-testid="restore-export" style={{ marginTop: 10, padding: 10, background: "#ecfdf5", borderRadius: 8, border: "1px solid #86efac" }}>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: "#0c4a6e" }}>Restore from Firebase Export</div>
        <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>Paste a Download-backup file or a Firebase JSON export and press Preview. Merge adds missing exercise weeks only; Full restore replaces everything in data (on Build: the build copy) and asks you to type RESTORE first.</div>
        <textarea id="restore-json" placeholder="Paste the full JSON here..." style={{ width: "100%", padding: 8, border: "1px solid #86efac", borderRadius: 6, fontSize: 10, minHeight: 80, resize: "vertical", boxSizing: "border-box", marginBottom: 6, fontFamily: "monospace" }}></textarea>
        {/* v2.7.0: preview first (counts only), then Merge (safe) or Full restore (double confirm) */}
        <button onClick={function() {
          var raw = document.getElementById("restore-json").value.trim();
          setRestoreMsg(""); setRestoreParsed(null);
          if (!raw) { setRestoreMsg("Paste the JSON first"); return; }
          try { var p = parseBackupInput(raw); setRestoreParsed(p); }
          catch (e) { setRestoreMsg("Can't read this: " + String(e.message || e).substring(0, 100)); }
        }} style={{ width: "100%", padding: 10, background: "#fff", color: "#166534", border: "1px solid #16a34a", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 6 }}>Preview</button>
        {restoreParsed && (function() { var c = backupCounts(restoreParsed); return (<div data-testid="restore-preview" style={{ fontSize: 11, color: "#0f172a", lineHeight: 1.5, marginBottom: 6 }}>Found: {restoreParsed.kind}{restoreParsed.dataRoot ? " · " + c.keys + " items in data (" + c.mealWeeks + " meal weeks)" : ""}{c.people.length ? " · exercise data for " + c.people.length + " people, " + c.exerciseWeeks + " logged weeks" : ""}</div>); })()}
        {restoreParsed && (<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button disabled={!restoreParsed.dash || restoreBusy} onClick={async function() {
            var backup = restoreParsed.dash; if (!backup) return;
            setRestoreBusy(true);
            try {
              var r = mergeExerciseWeeks(backup);
              await saveData(r.nd);
              auditLog("restore", "", "merge " + r.restored + " weeks");
              setRestoreMsg("✓ Merged: " + r.restored + " missing exercise weeks added. Nothing else was changed. Reload the app to see all data.");
              setRestoreParsed(null);
            } catch(e) { setRestoreMsg(window.aiErrorMsg(e)); }
            setRestoreBusy(false);
          }} style={{ width: "100%", padding: 10, background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: restoreParsed.dash ? 1 : 0.5 }}>Merge missing exercise weeks</button>
          <button disabled={!restoreParsed.dataRoot || restoreBusy} onClick={async function() {
            var target = restoreTarget(DATA_ROOT); var src = restoreParsed.dataRoot; if (!src) return;
            var n = Object.keys(src).length;
            if (!confirm("Full restore: overwrite EVERYTHING in \"" + target + "\" with the " + n + " items from this file? Anything added since the backup will be lost.")) return;
            var typed = prompt("To confirm the full restore of \"" + target + "\", type RESTORE");
            if (typed !== "RESTORE") { setRestoreMsg("Full restore cancelled — nothing was changed."); return; }
            setRestoreBusy(true);
            try {
              var keepAudit = (await firebase.database().ref(target + "/audit").once("value")).val(); /* v2.16.7: the audit trail survives a restore */
              await firebase.database().ref(target).set(keepAudit ? Object.assign({}, src, { audit: Object.assign({}, src.audit || {}, keepAudit) }) : src);
              await auditLog("restore", "", "full " + n + " items");
              setRestoreMsg("✓ Full restore done: " + n + " items written to " + target + ". Close and reopen the app.");
              setRestoreParsed(null);
            } catch(e) { setRestoreMsg("Full restore failed: " + String(e.message || e).substring(0, 120) + ". Nothing was changed."); }
            setRestoreBusy(false);
          }} style={{ width: "100%", padding: 10, background: restoreParsed.dataRoot ? "#dc2626" : "#e2e8f0", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Full restore of {DATA_ROOT === "data" ? "data" : DATA_ROOT + " (this test app)"}</button>
        </div>)}
        {restoreMsg && <div data-testid="restore-msg" style={{ fontSize: 11, fontWeight: 600, color: restoreMsg.charAt(0) === "✓" ? "#166534" : "#991b1b", marginTop: 6 }}>{restoreMsg}</div>}
      </div>
    </div>
      );
  })()}
</div>
  );
}
