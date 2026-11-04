import firebase, { DATA_ROOT } from "../lib/firebase.js";
import { btnMuted } from "../constants/styles.js";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function DataSection({ ctx }) {
  const {
    accent, accentBorder, accentLight, data, dataExpandEx, saveData, setDataExpandEx, setFormMsg, setSection
  } = ctx;

  return (
<div>
  <button onClick={function() { setSection("admin"); }} style={{ ...btnMuted, marginBottom: 12 }}>← Back to Settings</button>
  <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Firebase Data Viewer</div>
  {(() => {
    if (!data) return (<div style={{fontSize:11,color:"#94a3b8"}}>No data loaded</div>);
    var people = Object.keys(data).filter(function(k) { return data[k] && data[k].exercises; });
    return (<div>
      {people.map(function(person) {
        var exercises = data[person].exercises;
        var days = Object.keys(exercises);
        return (<div key={person} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: accent, marginBottom: 8, textTransform: "capitalize" }}>{person}</div>
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
      <div style={{ marginTop: 10, padding: 10, background: "#ecfdf5", borderRadius: 8, border: "1px solid #86efac" }}>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: "#0c4a6e" }}>Restore from Firebase Export</div>
        <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>Paste your Firebase JSON export below and press Restore. This will merge missing weeks into current data without overwriting existing entries.</div>
        <textarea id="restore-json" placeholder="Paste the full JSON here..." style={{ width: "100%", padding: 8, border: "1px solid #86efac", borderRadius: 6, fontSize: 10, minHeight: 80, resize: "vertical", boxSizing: "border-box", marginBottom: 6, fontFamily: "monospace" }}></textarea>
        <button onClick={async function() {
          var raw = document.getElementById("restore-json").value.trim();
          if (!raw) { setFormMsg("Paste the JSON first"); return; }
          try {
            var backup = JSON.parse(raw);
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
            await saveData(nd);
            setFormMsg("Restored " + restored + " missing progression entries. Reload the app to see all data.");
          } catch(e) { setFormMsg(window.aiErrorMsg(e)); }
          setTimeout(function(){setFormMsg("");}, 15000);
        }} style={{ width: "100%", padding: 10, background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Restore Data</button>
      </div>
    </div>
      );
  })()}
</div>
  );
}
