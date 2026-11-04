import { BLOOD_TESTS, DEFAULT_MEDS, DEFAULT_SUPPS } from "../constants/health.js";
import { calcWeek } from "../lib/utils.js";
import { btnAction, btnClose, btnDelete, btnEdit, btnMuted, btnP, btnStop, inputStyle, labelStyle } from "../constants/styles.js";
import { sSet } from "../lib/storage.js";
import { TONE_RULES } from "../constants/tone.js";
import { getMoodContext } from "../lib/aiContext.js";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function HealthSection({ ctx }) {
  const {
    accent, accentBorder, accentBtnBorder, accentBtnLight, accentLight, accentMid, activeTab, bloodInputs,
    customBloodTests, customMedNames, data, editHealthText, editMedIdx, editingHealthLog, getCrossSectionCtx, getOnboardingCtx,
    healthComment, healthFb, healthFbAll, healthFbExpanded, healthFbLoading, healthView, isJC, medInputs,
    p, saveData, setBloodInputs, setCustomMedNames, setEditHealthText, setEditMedIdx, setEditingHealthLog, setFormMsg,
    setHealthComment, setHealthFb, setHealthFbExpanded, setHealthFbLoading, setHealthView, setMedInputs, setShowBloodForm, setShowBloodResults,
    setShowMedForm, setVitalsInput, setWeekOff, showBloodForm, showBloodResults, showMedForm, userMood, vitalsInput,
    weekLabel
  } = ctx;

          var allMedNames = [...DEFAULT_MEDS, ...DEFAULT_SUPPS, ...customMedNames].sort();
          var medsList = p.meds || [];
          var activeMeds = medsList.filter(function(m) { return m.active; });
          var stoppedMeds = medsList.filter(function(m) { return m.active === false; });
          var allTests = BLOOD_TESTS.flatMap(function(g) { return g.tests; }).concat(customBloodTests);
          var tabs = [{ id: "general", l: "General" }, { id: "vitals", l: "Vitals" }, { id: "meds", l: "Medications" }, { id: "bloods", l: "Bloods" }];
          return (<div key={"hl-"+activeTab}>          {/* Week header — centred like Eating */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button onClick={function() { setWeekOff(function(o) { return o - 1; }); }} style={{ background: "#e2e8f0", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>&lsaquo;</button>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800 }}>Week {calcWeek(data.config.trainingStart)}</div><div style={{ fontSize: 10, color: "#64748b" }}>{weekLabel}</div></div>
            <button onClick={function() { setWeekOff(function(o) { return o + 1; }); }} style={{ background: "#e2e8f0", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>&rsaquo;</button>
          </div>
          <div style={{ display: "flex", gap: 0, background: accentMid, borderRadius: "8px 8px 0 0", padding: 2, marginBottom: 0 }}>
            {tabs.map(function(t) { return (<button key={t.id} onClick={function() { setHealthView(t.id); }} style={{ flex: 1, padding: "6px 0", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: healthView === t.id ? "#fff" : "transparent", color: healthView === t.id ? "#0f172a" : "rgba(255,255,255,0.7)" }}>{t.l}</button>); })}
          </div>

          {healthView === "general" && (<div style={{ background: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #e2e8f0", borderTop: "none", padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>My Health</div>
            <div style={{ background: accentLight, borderRadius: 8, padding: 12, border: "1px solid " + accentBorder }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Personal Health Profile</div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>Lasting information — smoker/non-smoker, alcohol intake, allergies, neurodiversities, disabilities, family health history, menopause status</div>
              <textarea value={p.healthProfile || ""} onChange={async function(e) { var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].healthProfile = e.target.value; await saveData(nd); }} placeholder={"e.g. Non-smoker. Social drinker 4-6 units/week. ADHD diagnosed. Hay fever. Family history of high cholesterol."} rows={4} style={Object.assign({}, inputStyle, { minHeight: 80, resize: "vertical", fontFamily: "inherit", marginBottom: 12 })} />
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>General Health Notes</div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>Current or temporary health matters — recovering from a cold, injury, fatigue, stress, sleep issues, pain, symptoms to track</div>
              <textarea value={p.healthNotes || ""} onChange={async function(e) { var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].healthNotes = e.target.value; await saveData(nd); }} placeholder={"e.g. Pulled hip flexor last Sunday. Sleeping poorly this week. Energy levels low Wed/Thu."} rows={6} style={Object.assign({}, inputStyle, { minHeight: 120, resize: "vertical", fontFamily: "inherit", marginBottom: 12 })} />
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Health Log</div>
              <textarea value={healthComment} onChange={function(e) { setHealthComment(e.target.value); }} placeholder="Log a health note — symptoms, observations, changes, appointments..." rows={3} style={Object.assign({}, inputStyle, { minHeight: 70, resize: "vertical", fontFamily: "inherit", width: "100%", boxSizing: "border-box", marginBottom: 8 })} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button onClick={async function() { if (!healthComment.trim()) return; var nd = JSON.parse(JSON.stringify(data)); if (!Array.isArray(nd[activeTab].healthLog)) nd[activeTab].healthLog = []; nd[activeTab].healthLog.push({ date: new Date().toISOString().split("T")[0], note: healthComment.trim() }); await saveData(nd); setHealthComment(""); setFormMsg("Logged ✓"); setTimeout(function(){setFormMsg("");}, 2000); }} style={btnMuted}>+ Add</button>
              </div>
              {(Array.isArray(p.healthLog) ? p.healthLog : []).slice().reverse().map(function(h, i) { var editKey = "healthLog_" + i; var isEditing = editingHealthLog === editKey; return (<div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>{isEditing ? (<div style={{ flex: 1, marginRight: 6 }}><textarea value={editHealthText} onChange={function(e) { setEditHealthText(e.target.value); }} rows={2} style={Object.assign({}, inputStyle, { minHeight: 50, resize: "vertical", fontFamily: "inherit", width: "100%", boxSizing: "border-box", marginBottom: 4 })} /><div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}><button onClick={async function() { var nd = JSON.parse(JSON.stringify(data)); var realIdx = nd[activeTab].healthLog.length - 1 - i; nd[activeTab].healthLog[realIdx].note = editHealthText.trim(); await saveData(nd); setEditingHealthLog(null); setFormMsg("Updated ✓"); setTimeout(function(){setFormMsg("");}, 2000); }} style={{ padding: "4px 10px", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Save</button><button onClick={function() { setEditingHealthLog(null); }} style={{ padding: "4px 10px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 10, color: "#475569", cursor: "pointer" }}>Cancel</button></div></div>) : (<span style={{ flex: 1 }}><span style={{ fontWeight: 600, color: "#475569" }}>{h.date}</span> <span style={{ color: "#334155" }}>{h.note}</span></span>)}<div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 4 }}>{!isEditing && <button onClick={function() { setEditingHealthLog(editKey); setEditHealthText(h.note); }} style={btnEdit}>✎ Edit</button>}<button onClick={async function() { if (!confirm("Delete this health log entry? This cannot be undone.")) return; var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].healthLog.splice(nd[activeTab].healthLog.length - 1 - i, 1); await saveData(nd); }} style={btnDelete}>🗑 Del</button></div></div>); })}
              {(Array.isArray(p.healthLog) ? p.healthLog : []).length === 0 && <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: 12 }}>No health log entries yet</div>}
          </div>
          </div>)}

          {healthView === "vitals" && (<div style={{ background: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #e2e8f0", borderTop: "none", padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: "#0f172a" }}>My Vital Observations</div>
            <div style={{ background: accentLight, borderRadius: 8, padding: 12, border: "1px solid " + accentBorder }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 10 }}>Record Vitals</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div><label style={labelStyle}>Date</label><input type="date" value={vitalsInput.date} onChange={function(e) { setVitalsInput(Object.assign({}, vitalsInput, { date: e.target.value })); }} style={inputStyle} /></div>
                <div><label style={labelStyle}>Time</label><input type="time" value={vitalsInput.time} onChange={function(e) { setVitalsInput(Object.assign({}, vitalsInput, { time: e.target.value })); }} style={inputStyle} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div><label style={labelStyle}>Systolic</label><input type="number" placeholder="120" value={vitalsInput.systolic} onChange={function(e) { setVitalsInput(Object.assign({}, vitalsInput, { systolic: e.target.value })); }} style={inputStyle} /></div>
                <div><label style={labelStyle}>Diastolic</label><input type="number" placeholder="80" value={vitalsInput.diastolic} onChange={function(e) { setVitalsInput(Object.assign({}, vitalsInput, { diastolic: e.target.value })); }} style={inputStyle} /></div>
                <div><label style={labelStyle}>Heart Rate</label><input type="number" placeholder="72" value={vitalsInput.hr} onChange={function(e) { setVitalsInput(Object.assign({}, vitalsInput, { hr: e.target.value })); }} style={inputStyle} /></div>
                <div><label style={labelStyle}>SpO2 %</label><input type="number" placeholder="98" value={vitalsInput.spo2} onChange={function(e) { setVitalsInput(Object.assign({}, vitalsInput, { spo2: e.target.value })); }} style={inputStyle} /></div>
              </div>
              <button onClick={async function() { if (!vitalsInput.systolic && !vitalsInput.hr && !vitalsInput.spo2) return; var nd = JSON.parse(JSON.stringify(data)); if (!nd[activeTab].vitals) nd[activeTab].vitals = []; var entry = { date: vitalsInput.date || new Date().toISOString().split("T")[0], time: vitalsInput.time || new Date().toTimeString().slice(0,5) }; if (vitalsInput.systolic) entry.bp = vitalsInput.systolic + "/" + vitalsInput.diastolic; if (vitalsInput.hr) entry.hr = parseInt(vitalsInput.hr); if (vitalsInput.spo2) entry.spo2 = parseInt(vitalsInput.spo2); nd[activeTab].vitals.push(entry); await saveData(nd); setVitalsInput({ date: "", time: "", systolic: "", diastolic: "", hr: "", spo2: "" }); setFormMsg("Vitals saved"); setTimeout(function() { setFormMsg(""); }, 2000); }} style={{ ...btnP(), width: "100%", marginBottom: 12 }}>Save Vitals</button>

            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8, marginTop: 12 }}>History</div>
              {(p.vitals || []).length === 0 && <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: 12 }}>No vitals recorded yet</div>}
              {(p.vitals || []).slice().reverse().map(function(v, vi) {
                var bpColor = "#16a34a";
                if (v.bp) { var parts = v.bp.split("/"); var sys = parseInt(parts[0]); if (sys >= 140) bpColor = "#dc2626"; else if (sys >= 130) bpColor = "#d97706"; }
                var hrColor = "#16a34a";
                if (v.hr) { if (v.hr > 100 || v.hr < 50) hrColor = "#dc2626"; else if (v.hr > 90 || v.hr < 55) hrColor = "#d97706"; }
                var spo2Color = "#16a34a";
                if (v.spo2) { if (v.spo2 < 92) spo2Color = "#dc2626"; else if (v.spo2 < 95) spo2Color = "#d97706"; }
                return (<div key={vi} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div><div style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{v.date} {v.time}</div>
                    <div style={{ fontSize: 12, display: "flex", gap: 12, marginTop: 2 }}>
                      {v.bp && <span>BP: <span style={{ fontWeight: 700, color: bpColor }}>{v.bp}</span></span>}
                      {v.hr && <span>HR: <span style={{ fontWeight: 700, color: hrColor }}>{v.hr}</span></span>}
                      {v.spo2 && <span>SpO2: <span style={{ fontWeight: 700, color: spo2Color }}>{v.spo2}%</span></span>}
                    </div>
                  </div>
                  <button onClick={async function() { if (!confirm("Delete this vitals entry? This cannot be undone.")) return; var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].vitals.splice(nd[activeTab].vitals.length - 1 - vi, 1); await saveData(nd); }} style={{...btnDelete, fontSize: 11, minWidth: 24, flexShrink: 0}}>🗑 Del</button>
                </div>);
              })}
          </div>
          </div>)}

{healthView === "meds" && (<div style={{ background: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #e2e8f0", borderTop: "none", padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>My Medications</div>
              <div style={{ display: "flex", gap: 6 }}>
                <label style={{...btnAction, display: "inline-flex"}}>📄 Upload<input type="file" accept="image/*,.pdf" multiple style={{ display: "none" }} onChange={async function(e) { var files = Array.from(e.target.files); if (files.length === 0) return; setFormMsg("Reading files..."); var imgs = []; for (var fi = 0; fi < files.length; fi++) { var b64 = await new Promise(function(res) { var r = new FileReader(); r.onload = function() { res(r.result.split(",")[1]); }; r.readAsDataURL(files[fi]); }); imgs.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }); } setFormMsg("Extracting medications..."); try { var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: imgs.concat([{ type: "text", text: "Extract medications from these images. Return ONLY a JSON array of objects with name, dose, freq, time, notes fields." }]) }] }) }); var result = await resp.json(); var text = result.content.map(function(x) { return x.text || ""; }).join(""); var ext = JSON.parse(text.replace(/```json|```/g, "").trim()); if (Array.isArray(ext) && ext.length > 0) { var nd = JSON.parse(JSON.stringify(data)); for (var mi2 = 0; mi2 < ext.length; mi2++) { var med = ext[mi2]; nd[activeTab].meds.push({ name: med.name || "", dose: med.dose || "", freq: med.freq || "", time: med.time || "", notes: med.notes || "", active: true, started: new Date().toLocaleDateString("en-GB") }); } if (!nd[activeTab].medsHistory) { nd[activeTab].medsHistory = []; } nd[activeTab].medsHistory.push({ date: new Date().toLocaleDateString("en-GB"), snapshot: "Uploaded " + ext.length + " med(s)" }); await saveData(nd); setFormMsg("Added " + ext.length + " medication(s)"); } else { setFormMsg("No medications found"); } } catch(err) { setFormMsg(window.aiErrorMsg(err)); } setTimeout(function() { setFormMsg(""); }, 4000); e.target.value = ""; }} /></label>
                <button onClick={function() { setShowMedForm(!showMedForm); }} style={showMedForm ? btnClose : btnAction}>{showMedForm ? "✕ Close" : "+ Add"}</button>
              </div>
            </div>
            <div style={{ background: accentLight, borderRadius: 8, padding: 12, border: "1px solid " + accentBorder }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Active Medications</div>
              {activeMeds.length === 0 && <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: 12 }}>No active medications</div>}
              {activeMeds.map(function(med, mi) { var realIdx = medsList.indexOf(med); var isEditing = editMedIdx === realIdx; return (<div key={mi} style={{ padding: "10px 3px", borderBottom: mi < activeMeds.length - 1 ? "1px solid #cbd5e1" : "none" }}>{isEditing ? (<div style={{ background: accentLight, borderRadius: 8, padding: 10 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}><div><label style={labelStyle}>Name</label><input value={medInputs.name || ""} onChange={function(e){ setMedInputs(Object.assign({}, medInputs, {name: e.target.value})); }} style={inputStyle} /></div><div><label style={labelStyle}>Dose</label><input value={medInputs.dose || ""} onChange={function(e){ setMedInputs(Object.assign({}, medInputs, {dose: e.target.value})); }} placeholder="e.g. 200mcg" style={inputStyle} /></div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}><div><label style={labelStyle}>Frequency</label><input value={medInputs.freq || ""} onChange={function(e){ setMedInputs(Object.assign({}, medInputs, {freq: e.target.value})); }} placeholder="e.g. Daily" style={inputStyle} /></div><div><label style={labelStyle}>Time</label><input value={medInputs.time || ""} onChange={function(e){ setMedInputs(Object.assign({}, medInputs, {time: e.target.value})); }} placeholder="e.g. Evening" style={inputStyle} /></div></div><div style={{ marginBottom: 6 }}><label style={labelStyle}>Notes</label><input value={medInputs.notes || ""} onChange={function(e){ setMedInputs(Object.assign({}, medInputs, {notes: e.target.value})); }} placeholder="optional" style={inputStyle} /></div><div style={{ display: "flex", gap: 6 }}><button onClick={async function(){ var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].meds[realIdx] = Object.assign({}, nd[activeTab].meds[realIdx], { name: medInputs.name, dose: medInputs.dose, freq: medInputs.freq, time: medInputs.time, notes: medInputs.notes }); if (!nd[activeTab].medsHistory) nd[activeTab].medsHistory = []; nd[activeTab].medsHistory.push({ date: new Date().toLocaleDateString("en-GB"), snapshot: "Updated " + medInputs.name }); await saveData(nd); setEditMedIdx(null); }} style={{ ...btnP(), flex: 1, fontSize: 11 }}>Save</button><button onClick={function(){ setEditMedIdx(null); }} style={{ padding: "6px 12px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 11, color: "#475569", cursor: "pointer" }}>Cancel</button></div></div>) : (<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ flex: 1 }}><span style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{med.name}</span>{(med.dose || med.freq || med.time) && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{[med.dose, med.freq, med.time].filter(Boolean).join(" · ")}</div>}{med.notes && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{med.notes}</div>}</div><div style={{ display: "flex", gap: 4, flexShrink: 0 }}><button onClick={function(){ setEditMedIdx(realIdx); setMedInputs({ name: med.name || "", dose: med.dose || "", freq: med.freq || "", time: med.time || "", notes: med.notes || "" }); }} style={btnEdit}>✎ Edit</button><button onClick={async function() { var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].meds[realIdx].active = false; if (!nd[activeTab].medsHistory) nd[activeTab].medsHistory = []; nd[activeTab].medsHistory.push({ date: new Date().toLocaleDateString("en-GB"), snapshot: "Stopped " + med.name }); await saveData(nd); }} style={btnStop}>⏹ Stop</button></div></div>)}</div>); })}
            {stoppedMeds.length > 0 && (<div style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #e2e8f0", marginBottom: 12, opacity: 0.7 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Stopped Medications</div>
              {stoppedMeds.map(function(med, si) { var realIdx = medsList.indexOf(med); return (<div key={si} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}><div style={{ flex: 1 }}><span style={{ fontWeight: 600, fontSize: 13, color: "#64748b" }}>{med.name}</span>{(med.dose || med.freq || med.time) && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{[med.dose, med.freq, med.time].filter(Boolean).join(" · ")}</div>}{med.notes && <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 2 }}>{med.notes}</div>}</div><button onClick={async function() { var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].meds[realIdx].active = true; if (!nd[activeTab].medsHistory) nd[activeTab].medsHistory = []; nd[activeTab].medsHistory.push({ date: new Date().toLocaleDateString("en-GB"), snapshot: "Restarted " + med.name }); await saveData(nd); }} style={{ padding: "4px 10px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 6, fontSize: 10, color: "#16a34a", cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>Restart</button></div>); })}
            </div>)}
            {showMedForm && (<div style={{ background: "#fff", borderRadius: 12, border: "2px solid " + accent, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Add Medication</div>
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Medication</label>
                <select value={medInputs.name || ""} onChange={function(e) { setMedInputs(Object.assign({}, medInputs, { name: e.target.value })); }} style={inputStyle}><option value="">Select medication...</option>{allMedNames.map(function(n) { return (<option key={n} value={n}>{n}</option>); })}<option value="__custom__">+ Add custom...</option></select>
              </div>
              {medInputs.name === "__custom__" && <div style={{ marginBottom: 8 }}><label style={labelStyle}>Custom Name</label><input value={medInputs.customName || ""} onChange={function(e) { setMedInputs(Object.assign({}, medInputs, { customName: e.target.value })); }} placeholder="Medication name" style={inputStyle} /></div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div><label style={labelStyle}>Dose</label><input value={medInputs.dose || ""} onChange={function(e) { setMedInputs(Object.assign({}, medInputs, { dose: e.target.value })); }} placeholder="e.g. 200mcg" style={inputStyle} /></div>
                <div><label style={labelStyle}>Frequency</label><input value={medInputs.freq || ""} onChange={function(e) { setMedInputs(Object.assign({}, medInputs, { freq: e.target.value })); }} placeholder="e.g. Daily" style={inputStyle} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div><label style={labelStyle}>Time</label><input value={medInputs.time || ""} onChange={function(e) { setMedInputs(Object.assign({}, medInputs, { time: e.target.value })); }} placeholder="e.g. Evening" style={inputStyle} /></div>
                <div><label style={labelStyle}>Notes</label><input value={medInputs.notes || ""} onChange={function(e) { setMedInputs(Object.assign({}, medInputs, { notes: e.target.value })); }} placeholder="optional" style={inputStyle} /></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={async function() { var name = medInputs.name === "__custom__" ? medInputs.customName : medInputs.name; if (!name) return; var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].meds.push({ name: name, dose: medInputs.dose || "", freq: medInputs.freq || "", time: medInputs.time || "", notes: medInputs.notes || "", active: true, started: new Date().toLocaleDateString("en-GB") }); if (!nd[activeTab].medsHistory) nd[activeTab].medsHistory = []; nd[activeTab].medsHistory.push({ date: new Date().toLocaleDateString("en-GB"), snapshot: "Started " + name + " " + (medInputs.dose || "") }); if (medInputs.name === "__custom__" && medInputs.customName) { var cn = [...customMedNames, medInputs.customName]; setCustomMedNames(cn); await sSet("custom_med_names", JSON.stringify(cn)); } await saveData(nd); setMedInputs({}); setShowMedForm(false); }} style={{ ...btnP(), flex: 1 }}>Save Medication</button>
                <button onClick={function(){ setShowMedForm(false); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 8, fontSize: 12, color: "#475569", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>)}
          </div>
          </div>)}

          {healthView === "bloods" && (<div style={{ background: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #e2e8f0", borderTop: "none", padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>My Bloods</div>
              <div style={{ display: "flex", gap: 6 }}>
                <label style={{...btnAction, display: "inline-flex"}}>📄 Upload<input type="file" accept="image/*,.pdf" multiple style={{ display: "none" }} onChange={async function(e) { var files = Array.from(e.target.files); if (files.length === 0) return; setFormMsg("Reading files..."); var imgs = []; for (var fi = 0; fi < files.length; fi++) { var b64 = await new Promise(function(res) { var r = new FileReader(); r.onload = function() { res(r.result.split(",")[1]); }; r.readAsDataURL(files[fi]); }); imgs.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }); } setFormMsg("Extracting results..."); try { var tks = allTests.map(function(t) { return t.key + " " + t.name + " " + t.unit; }).join(", "); var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: imgs.concat([{ type: "text", text: "Extract blood test results from these images. Match to these test keys: " + tks + ". Return ONLY JSON object with date and tests fields." }]) }] }) }); var result = await resp.json(); var text = result.content.map(function(x) { return x.text || ""; }).join(""); var ext = JSON.parse(text.replace(/```json|```/g, "").trim()); var nb = Object.assign({}, bloodInputs); if (ext.date) { nb.date = ext.date; } if (ext.tests) { Object.keys(ext.tests).forEach(function(k) { nb[k] = String(ext.tests[k]); }); } setBloodInputs(nb); setShowBloodForm(true); setFormMsg("Extracted " + Object.keys(ext.tests || {}).length + " results - review and save"); } catch(err) { setFormMsg(window.aiErrorMsg(err)); } setTimeout(function() { setFormMsg(""); }, 4000); e.target.value = ""; }} /></label>
                <button onClick={function() { setShowBloodForm(!showBloodForm); }} style={showBloodForm ? btnClose : btnAction}>{showBloodForm ? "✕ Close" : "+ Add"}</button>
              </div>
            </div>
            <div style={{ background: accentLight, borderRadius: 8, padding: 12, border: "1px solid " + accentBorder }}>
            {showBloodForm && (<div style={{ background: "#fff", borderRadius: 12, border: "2px solid " + accent, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Add Blood Results</div>
              <div style={{ marginBottom: 10 }}><label style={labelStyle}>Date</label><input type="month" value={bloodInputs.date || ""} onChange={function(e) { setBloodInputs(Object.assign({}, bloodInputs, { date: e.target.value })); }} style={inputStyle} /></div>
              {BLOOD_TESTS.map(function(group) { return (<div key={group.group} style={{ marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>{group.group}</div>{group.tests.map(function(t) { return (<div key={t.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 11, width: 120, color: "#334155", fontWeight: 500 }}>{t.name}</span><input type="number" step="0.01" value={bloodInputs[t.key] || ""} onChange={function(e) { var nb = Object.assign({}, bloodInputs); nb[t.key] = e.target.value; setBloodInputs(nb); }} placeholder={t.unit} style={{ width: 80, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} /><span style={{ fontSize: 10, color: "#94a3b8" }}>{t.unit}{t.lo !== undefined ? " (" + t.lo + "-" + t.hi + ")" : ""}</span></div>); })}</div>); })}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={async function() { if (!bloodInputs.date) return; var tests = {}; allTests.forEach(function(t) { if (bloodInputs[t.key]) tests[t.key] = parseFloat(bloodInputs[t.key]); }); if (Object.keys(tests).length === 0) return; var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].bloods.push({ date: bloodInputs.date, tests: tests }); nd[activeTab].bloods.sort(function(a, b) { return a.date.localeCompare(b.date); }); await saveData(nd); setBloodInputs({ date: "" }); setShowBloodForm(false); }} style={{ ...btnP(), flex: 1 }}>Save Blood Results</button>
                <button onClick={function(){ setShowBloodForm(false); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 8, fontSize: 12, color: "#475569", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>)}
            {(p.bloods || []).length > 0 && (function() { var reversed = (p.bloods || []).slice().reverse(); var latest = reversed[0]; var older = reversed.slice(1); var renderEntry = function(b, bi) { return (<div key={bi} style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #e2e8f0", marginBottom: 8 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{b.date}</div>{Object.entries(b.tests).map(function(entry) { var k = entry[0]; var v = entry[1]; var def = allTests.find(function(t) { return t.key === k; }); var name = def ? def.name : k; var unit = def ? def.unit : ""; var flag = ""; var flagColor = "#16a34a"; if (def && def.lo !== undefined) { if (v < def.lo) { flag = " Low"; flagColor = "#dc2626"; } else if (v > def.hi) { flag = " High"; flagColor = "#dc2626"; } else { flag = " OK"; } } return (<div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}><span style={{ color: "#334155", fontWeight: 500 }}>{name}</span><span><span style={{ fontWeight: 600 }}>{v}</span> <span style={{ color: "#94a3b8" }}>{unit}</span><span style={{ color: flagColor, fontWeight: 600 }}>{flag}</span></span></div>); })}</div>); }; return (<div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Latest Results</div>
              {renderEntry(latest, 0)}
              {older.length > 0 && (<div>
                <button onClick={function() { setShowBloodResults(!showBloodResults); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", background: "none", border: "none", cursor: "pointer" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Older Results ({older.length} record{older.length !== 1 ? "s" : ""})</span>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>{showBloodResults ? "▲" : "▼"}</span>
                </button>
                {showBloodResults && older.map(function(b, bi) { return renderEntry(b, bi + 1); })}
              </div>)}
            </div>); })()}
            {(p.bloods || []).length === 0 && <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #e2e8f0", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>No blood results recorded yet</div>}
          </div>
          </div>)}



          {/* GENERATE HEALTH FEEDBACK */}
          <button onClick={async function() {
            setHealthFbExpanded(true); setHealthFbLoading(true);
            var who = (p.profile && p.profile.name) || activeTab;
            var hp = p.healthProfile || "Not recorded";
            var hn = p.healthNotes || "None";
            var hl = (Array.isArray(p.healthLog) ? p.healthLog : []).slice(-10).map(function(h) { return h.date + ": " + h.note; }).join("; ") || "None";
            var mi = activeMeds.map(function(m) { return m.name + " " + (m.dose || "") + " " + (m.freq || "") + (m.notes ? " (" + m.notes + ")" : ""); }).join(", ") || "None";
            var bi = "";
            if (p.bloods && p.bloods.length > 0) { var lat = p.bloods[p.bloods.length - 1]; bi = "Latest (" + lat.date + "): " + Object.entries(lat.tests).map(function(e) { var def = allTests.find(function(t) { return t.key === e[0]; }); return (def ? def.name : e[0]) + "=" + e[1] + (def ? def.unit : ""); }).join(", "); }
            var bdi = ""; if (p.body && p.body.weight && p.body.weight.length > 0) { bdi = "Weight: " + p.body.weight[p.body.weight.length-1].v + (p.body.bodyFat && p.body.bodyFat.length > 0 ? ", BF: " + p.body.bodyFat[p.body.bodyFat.length-1].v + "%" : "") + (p.body.visceralFat && p.body.visceralFat.length > 0 ? ", Visceral: " + p.body.visceralFat[p.body.visceralFat.length-1].v : ""); }
            var prompt = "You are " + who + "'s Lifecare Companion — a trusted, knowledgeable friend reviewing your health data together. Speak directly to " + who + " using 'you' and 'your' throughout — NEVER use their name in the third person. You are their trusted friend, not an assessor writing a report.\n\nCOMMUNICATION STYLE: Be pragmatic, warm, non-judgemental and direct like a mate who happens to have clinical knowledge. NEVER be preachy. Frame concerns as information they can act on, not alarms. " + TONE_RULES + getMoodContext(userMood) + " Reference actual numbers.\n\nHealth profile: " + hp + "\nCurrent health: " + hn + "\nRecent log: " + hl + "\nMedications: " + mi + "\nBloods: " + bi + "\nBody: " + bdi + getOnboardingCtx(activeTab) + getCrossSectionCtx(activeTab, "health") + "\n\nRules: Keep each item under 20 words. Address the user as 'you' throughout — never third person. Check drug interactions. Label sources [OFFICIAL] or [ANECDOTAL]. Never recommend stopping meds.\nReturn ONLY compact JSON: {\"summary\":\"1-2 sentences\",\"concerns\":[\"short item\"],\"positives\":[\"short item\"],\"actions\":[\"short item\"],\"meds\":\"brief interaction notes\"}";
            try {
              var bodyStr = JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] });
              var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: bodyStr });
              if (!resp.ok) throw new Error("HTTP " + resp.status + ": " + (await resp.text()).substring(0, 100));
              var result = await resp.json();
              if (result.error) throw new Error(result.error.message || "API error");
              var text = (result.content || []).map(function(blk) { return blk.text || ""; }).join("");
              if (!text) throw new Error("Empty response");
              var cleanJson = text.replace(/```json|```/g, "").trim(); cleanJson = cleanJson.replace(/\n/g, " ").replace(/\r/g, " ").replace(/\t/g, " ").replace(/[\x00-\x1F]/g, " "); var fb; try { fb = JSON.parse(cleanJson); } catch(je) { var fixed = cleanJson; if (!fixed.endsWith("}")) { fixed = fixed.replace(/,?\s*"[^"]*$/, ""); fixed = fixed.replace(/,?\s*$/, ""); var opens = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length; for (var bi = 0; bi < opens; bi++) fixed += "]"; var braces = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length; for (var bj = 0; bj < braces; bj++) fixed += "}"; } fb = JSON.parse(fixed); }
              fb._generatedAt = new Date().toLocaleString("en-GB");
              setHealthFb(fb); sSet("health_feedback", JSON.stringify(Object.assign({}, healthFbAll || {}, { [activeTab]: fb })));
              try { await sSet("health_fb_" + activeTab, JSON.stringify(fb)); } catch(se) {}
            } catch(e) { setFormMsg(window.aiErrorMsg(e)); setTimeout(function() { setFormMsg(""); }, 10000); }
            setHealthFbLoading(false);
          }} disabled={healthFbLoading} style={{ width: "100%", padding: 12, marginTop: 14, background: healthFbLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: healthFbLoading ? "default" : "pointer" }}>{healthFbLoading ? <span>Generating<span className="loading-dots" dangerouslySetInnerHTML={{ __html: "<span>.</span><span>.</span><span>.</span>" }} /></span> : "My Companion Health Feedback"}</button>
                  <button onClick={function(){setHealthFbExpanded(!healthFbExpanded);}} style={{width:"100%",padding:6,background:"none",border:"1px solid #e2e8f0",borderRadius:6,fontSize:11,color:"#64748b",cursor:"pointer",marginTop:4}}>{healthFbExpanded ? "▲ Hide Feedback" : "▼ Show Feedback"}</button>

          {healthFbExpanded && healthFb && (<div style={{ marginTop: 10, marginBottom: 10 }}>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "6px 14px", background: "#f8fafc", fontSize: 10, color: "#94a3b8", borderBottom: "1px solid #e2e8f0" }}>Generated {healthFb._generatedAt} for {isJC ? "JC" : "Becks"}</div>
              <div style={{ padding: "8px 14px", borderBottom: "1px solid #e2e8f0" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 14 }}>🩺</span><span style={{ fontSize: 11, fontWeight: 700, color: "#1e3a5f" }}>Health Companion Check-in</span></div></div>
              {healthFb.summary && <div style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0" }}><div style={{ fontSize: 12, color: "#334155", lineHeight: 1.5 }}>{healthFb.summary}</div></div>}
              {healthFb.positives && healthFb.positives.length > 0 && <div style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0" }}><div style={{ fontSize: 12, fontWeight: 700, color: "#0c4a6e", marginBottom: 4 }}>What's going well</div>{healthFb.positives.map(function(x, i) { return (<div key={i} style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>✓ {x}</div>); })}</div>}
              {healthFb.concerns && healthFb.concerns.length > 0 && <div style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0" }}><div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>Concerns</div>{healthFb.concerns.map(function(x, i) { return (<div key={i} style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>→ {x}</div>); })}</div>}
              {healthFb.actions && healthFb.actions.length > 0 && <div style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0" }}><div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 4 }}>Actions</div>{healthFb.actions.map(function(x, i) { return (<div key={i} style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>★ {x}</div>); })}</div>}
              {(healthFb.meds || healthFb.medication_notes) && <div style={{ padding: "12px 14px" }}><div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a5f", marginBottom: 4 }}>Medication Notes</div><div style={{ fontSize: 12, color: "#334155", lineHeight: 1.5 }}>{healthFb.meds || healthFb.medication_notes}</div></div>}
            </div>
          </div>)}
</div>); }
