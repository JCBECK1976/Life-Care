import { DEFAULT_EXERCISES, EXERCISE_DATABASE, EXERCISE_TYPES } from "../constants/exercise.js";
import LoadingDots from "../components/LoadingDots.jsx";
import { calcWeek, fbIcon, sBg, sColor, sLabel, setPlainNote } from "../lib/utils.js";
import { buildExProfileInfo, getMoodContext } from "../lib/aiContext.js";
import { sSet } from "../lib/storage.js";
import { scrollOnMount } from "../lib/scrollIntoView.js";
import { attachCompanion, companionFromSession, sameExercise, setCompanionDecision, entrySets, findWeekIdx, previousEntry, fmtEntry, fmtReps, getExerciseType, getExerciseTypeConfig, logSetsFrom, parseReps, setsDiffer, setsToSave, syncAfterProgChange, weightLabel } from "../lib/exercise.js";
import React from "react";
import OpenForm, { Field, inputStyle as openInput } from "../components/OpenForm.jsx";
import { btnAction, btnActionLg, btnDelete, btnEdit, btnFilledOn, btnLog, btnMuted, btnOpen, btnP, btnProgress, btnS, inputStyle, labelStyle } from "../constants/styles.js";
import { FullChart } from "../components/charts.jsx";
import { TONE_RULES } from "../constants/tone.js";
import { handleApiError } from "../lib/api.js";
import PersonTabs, { peopleOf, personName } from "../components/PersonTabs.jsx";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function ExerciseSection({ ctx }) {
  const {
    accent, accentBorder, accentLight, accentMid, activeTab, addExConfirm, addExLoading, addExOpen,
    addExSearch, btnST, coolDownOpen, customExercises, data, dayView, decisionsExpanded, editExercise,
    editPrev, exInfoOpen, exerciseDay, fbExpanded, getCrossSectionCtx, getOnboardingCtx, isJC, loadUserSettings,
    logComment, logEx, logFormRef, logFullRange, logGoodForm, logOverride, logSets, logWeek,
    newExName, openLogForm, p, prevComment, renderThread, saveData, saveLog, selectedEx,
    sessionFbLoading, sessionFeedback, sessionGuideLoading, setActiveTab, setAddExConfirm, setAddExLoading, setAddExOpen, setAddExSearch,
    setCoolDownOpen, setCustomExercises, setDayView, setDecisionsExpanded, setEditExercise, setEditPrev, setExInfoOpen, setExerciseDay,
    setFbExpanded, setFormMsg, setLogComment, setLogEx, setLogFullRange, setLogGoodForm, setLogOverride, setLogSets, logNeedChoice, setLogNeedChoice,
    setLogWeek, setNewExName, setNewSectionName, setSelectedEx, setSessionFbLoading, setSessionFeedback, setSessionGuideLoading, setShowNewExForm,
    setShowNewSection, setStoppedExOpen, setWarmUpOpen, stoppedExOpen, updateSessionFb, userMood, warmUpOpen, weekLabel
  } = ctx;
  /* v2.8.0 F1: a Progress week opens in the shared "Open" form (read-only → Edit → Save, or Delete inside the form) */
  const [openProg, setOpenProg] = React.useState(null); // { day, exIdx, progIdx, editing, draft, msg }

          const allExNames = [...DEFAULT_EXERCISES, ...customExercises].sort();
          const days = Object.keys(p.exercises);
          const dayLabels = { sunday: "Sunday", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday" };
          const currentWeek = calcWeek(data.config.trainingStart);
          const addExerciseToDay = async (day, name) => {
            const nd = JSON.parse(JSON.stringify(data));
            if (!nd[activeTab].exercises) nd[activeTab].exercises = {}; if (!nd[activeTab].exercises[day]) nd[activeTab].exercises[day] = []; nd[activeTab].exercises[day].push({ name, current: "0kg", reps: "0×3", status: "building", prog: [] });
            await saveData(nd); setFormMsg("✓ " + name + " added"); setTimeout(() => setFormMsg(""), 3000);
          };
          const regenerateSessionGuides = async (targetTab, targetDay, updatedData) => {
            try {
              var pd = updatedData[targetTab];
              var dayExList = pd.exercises[targetDay] || [];
              if (dayExList.length === 0) {
                // No exercises left — clear guides
                if (pd.sessionGuides && pd.sessionGuides[targetDay]) {
                  var nd2 = JSON.parse(JSON.stringify(updatedData));
                  delete nd2[targetTab].sessionGuides[targetDay];
                  await saveData(nd2);
                }
                return;
              }
              // Only regenerate if guides already exist for this day
              if (!pd.sessionGuides || !pd.sessionGuides[targetDay]) return;
              setSessionGuideLoading(true);
              var prof = pd.profile || {};
              var profileInfo = buildExProfileInfo(prof);
              var healthCtx = "";
              if (pd.bloods && pd.bloods.length > 0) { var lb = pd.bloods[pd.bloods.length - 1]; healthCtx += " Bloods (" + lb.date + "): " + Object.keys(lb.tests).map(function(k){ return k + "=" + lb.tests[k]; }).join(", ") + "."; }
              if (pd.meds) { var activeMeds = pd.meds.filter(function(m){ return m.active; }); if (activeMeds.length > 0) healthCtx += " Medications: " + activeMeds.map(function(m){ return m.name + " " + m.dosage; }).join(", ") + "."; }
              if (pd.body) { ["weight","bodyFat","muscleMass"].forEach(function(bk){ if (pd.body[bk] && pd.body[bk].length > 0) { healthCtx += " " + bk + ": " + pd.body[bk][pd.body[bk].length - 1].v + "."; } }); }
              if (pd.measurements) { var measParts = []; Object.keys(pd.measurements).forEach(function(mk){ if (pd.measurements[mk] && pd.measurements[mk].length > 0) { measParts.push(mk + ": " + pd.measurements[mk][pd.measurements[mk].length - 1].v + "cm"); } }); if (measParts.length > 0) healthCtx += " Measurements: " + measParts.join(", ") + "."; }
              var exerciseList = dayExList.map(function(ex) { return ex.name + " (" + (ex.exType || "weights") + ", " + ex.current + " " + ex.reps + ")"; }).join(", ");
              var guidePrompt = "Generate a warm-up and cool-down for this training session.\n\nPerson: " + profileInfo + "." + healthCtx + "\n\nSession exercises: " + exerciseList + "\n\nRules:\n- Warm-up: 3 minutes max. 3-4 activities. Tailored to the specific exercises in this session and this person's health profile.\n- Cool-down: 3 minutes max. 3-4 stretches. Target the muscle groups worked in this session. Consider any injuries, conditions, or medications.\n- Each line should be one activity with brief instruction (e.g. '1. Arm circles — 20 seconds each direction, loosen shoulders').\n- Number each line. Keep each to one short sentence.\n- Write in direct 2nd person.\n- Do NOT include any JSON formatting or labels — just the plain text.\n\nReturn ONLY JSON: {\"warmup\":\"numbered lines for warm-up\",\"cooldown\":\"numbered lines for cool-down\"}";
              var guideResp = await fetch("https://api.anthropic.com/v1/messages", {method:"POST",headers:{"Content-Type":"application/json","x-api-key":await window.ensureApiKey(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:500,messages:[{role:"user",content:guidePrompt}]})});
              var guideResult = await guideResp.json();
              var guideTxt = ""; if(guideResult.content){for(var gi=0;gi<guideResult.content.length;gi++){if(guideResult.content[gi].text)guideTxt+=guideResult.content[gi].text;}}
              var guideData = JSON.parse(guideTxt.replace(/```json|```/g,"").trim());
              var nd3 = JSON.parse(JSON.stringify(updatedData));
              if (!nd3[targetTab].sessionGuides) nd3[targetTab].sessionGuides = {};
              nd3[targetTab].sessionGuides[targetDay] = { warmup: guideData.warmup || "", cooldown: guideData.cooldown || "" };
              await saveData(nd3);
            } catch(rge) { console.error("Auto-regenerate guides failed:", rge); setFormMsg(window.isEnergyEmpty(rge) ? window.energyEmptyMsg : "✗ Could not regenerate warm-up — check API key"); setTimeout(function() { setFormMsg(""); }, 4000); }
            setSessionGuideLoading(false);
          };
          const renameExercise = async (day, idx, newName) => {
            const nd = JSON.parse(JSON.stringify(data));
            nd[activeTab].exercises[day][idx].name = newName;
            await saveData(nd); setEditExercise(null); setFormMsg("✓ Renamed"); setTimeout(() => setFormMsg(""), 3000);
            regenerateSessionGuides(activeTab, day, nd);
          };
          const removeExercise = async (day, idx) => {
            var exName = data[activeTab].exercises[day][idx] ? data[activeTab].exercises[day][idx].name : "this exercise";
            if (!confirm("Remove " + exName + " from " + day + "? This cannot be undone.")) return;
            const nd = JSON.parse(JSON.stringify(data));
            nd[activeTab].exercises[day].splice(idx, 1);
            await saveData(nd); setFormMsg("✓ Removed"); setTimeout(() => setFormMsg(""), 3000);
            regenerateSessionGuides(activeTab, day, nd);
          };
          const addSection = async (name) => {
            const key = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
            const nd = JSON.parse(JSON.stringify(data));
            if (!nd[activeTab].exercises[key]) { nd[activeTab].exercises[key] = []; await saveData(nd); }
            setShowNewSection(false); setNewSectionName(""); setFormMsg("✓ Section added"); setTimeout(() => setFormMsg(""), 3000);
          };
          const addCustomEx = async () => {
            if (!newExName.trim()) return;
            const updated = [...customExercises, newExName.trim()];
            setCustomExercises(updated); await sSet("custom_exercises", JSON.stringify(updated));
            setShowNewExForm(false); setNewExName(""); setFormMsg("✓ Added to database"); setTimeout(() => setFormMsg(""), 3000);
          };
          const updateProg = async (day, exIdx, progIdx, field, value) => {
            var nd = JSON.parse(JSON.stringify(data));
            nd[activeTab].exercises[day][exIdx].prog[progIdx][field] = value;
            if (field === "w" || field === "r") delete nd[activeTab].exercises[day][exIdx].prog[progIdx].sets; // D2: keep one source of truth
            // Sync Activity from latest prog entry
            var prog = nd[activeTab].exercises[day][exIdx].prog;
            if (prog.length > 0) {
              var latest = prog[prog.length - 1];
              nd[activeTab].exercises[day][exIdx].current = latest.w;
              nd[activeTab].exercises[day][exIdx].reps = latest.r;
            }
            await saveData(nd);
          };
          const openEntry = (day, exIdx, progIdx) => {
            var e = data[activeTab].exercises[day][exIdx].prog[progIdx];
            setOpenProg({ day: day, exIdx: exIdx, progIdx: progIdx, editing: false, msg: "", draft: { wk: String(e.wk), sets: logSetsFrom(e, Math.max(1, (e.sets || []).length || parseReps(e.r).length || 3)), fullRange: e.fullRange || "", goodForm: e.goodForm || "", note: e.note || "", companion: e.companion ? Object.assign({}, e.companion) : companionFromSession(sessionFeedback, activeTab, day, data[activeTab].exercises[day][exIdx].name, e.wk) /* F11b: older feedback */ } });
          };
          const setDraft = (patch) => setOpenProg(function(o) { return Object.assign({}, o, { draft: Object.assign({}, o.draft, patch), msg: "" }); });
          const saveEntry = async () => {
            var o = openProg; var d = o.draft;
            if (!d.fullRange || !d.goodForm) { setOpenProg(Object.assign({}, o, { msg: "Choose Form and Range to save" })); return; }
            var sets = setsToSave(d.sets.filter(function(x) { return String(x.w).trim() || String(x.r).trim(); }));
            if (!sets.length) { setOpenProg(Object.assign({}, o, { msg: "Enter at least one set" })); return; }
            var nd = JSON.parse(JSON.stringify(data));
            var ex2 = nd[activeTab].exercises[o.day][o.exIdx]; var e = ex2.prog[o.progIdx];
            var before = ex2.prog.slice().sort(function(a, b) { return (a.wk || 0) - (b.wk || 0); }).pop(); before = Object.assign({}, before);
            e.wk = parseInt(d.wk) || e.wk; e.sets = sets; e.w = String(sets[0].w).replace(/kg$/, "") + "kg"; e.r = fmtReps(sets.map(function(x) { return parseInt(x.r) || 0; }));
            e.fullRange = d.fullRange; e.goodForm = d.goodForm; e.note = d.note.trim();
            if (d.companion && !e.companion) e.companion = { verdict: d.companion.verdict, recommendation: d.companion.recommendation, at: d.companion.at }; /* F11b: keep it once edited */
            if (d.companion && e.companion) { if (d.companion.decision) e.companion.decision = d.companion.decision; else delete e.companion.decision; e.companion.decisionNote = (d.companion.decisionNote || "").trim(); } // F11
            ex2.prog.sort(function(a, b) { return (a.wk || 0) - (b.wk || 0); });
            syncAfterProgChange(ex2, before);   // D20
            await saveData(nd);
            setOpenProg(Object.assign({}, o, { progIdx: ex2.prog.indexOf(e), editing: false, msg: "✓ Week " + e.wk + " saved" }));
          };
          const renderEntryForm = (ex) => {
            var o = openProg; var d = o.draft; var ed = o.editing; var cfg = getExerciseTypeConfig(ex.exType || getExerciseType(ex.name));
            var l1 = cfg.metric1 !== "none" ? cfg.metric1Label : "Weight"; var l2 = cfg.metric2 !== "none" ? cfg.metric2Label : "Reps";
            var seg = function(field, val, label) { var on = d[field] === val; return <button key={val} type="button" aria-pressed={on} disabled={!ed} onClick={function() { setDraft({ [field]: val }); }} style={{ flex: 1, padding: "6px 4px", fontSize: 11, fontWeight: 600, border: "none", cursor: ed ? "pointer" : "default", background: on ? (val === "good" ? "#166534" : "#b45309") : "#fff", color: on ? "#fff" : "#475569" }}>{label}</button>; };
            var group = function(field, label) { if (!ed) { var v = d[field]; /* D21: viewing shows the chosen value as one chip */ return <Field label={label} testid={"entry-" + field}>{v ? <span data-testid={"entry-" + field + "-chip"} style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, color: "#fff", background: v === "good" ? "#166534" : "#b45309" }}>{v === "good" ? "Good" : "Working towards"}</span> : <span style={{ color: "#475569" }}>not recorded</span>}</Field>; }
              return <Field label={label} testid={"entry-" + field}><div style={{ display: "flex", border: "1px solid " + (ed && !d[field] && o.msg ? "#dc2626" : "#cbd5e1"), borderRadius: 6, overflow: "hidden" }}>{seg(field, "working", "Working towards")}{seg(field, "good", "Good")}</div></Field>; };
            return (<OpenForm testid="prog-open-form" title={ex.name + " — week " + d.wk} subtitle={ed ? "Change anything, then Save." : "As logged. Edit to change it."} editing={ed} message={o.msg} busy={false}
              onEdit={function() { setOpenProg(Object.assign({}, o, { editing: true, msg: "" })); }}
              onCancelEdit={function() { openEntry(o.day, o.exIdx, o.progIdx); }}
              onClose={function() { setOpenProg(null); }}
              onSave={saveEntry}
              dangerKind="remove" onDanger={function() { deleteProg(o.day, o.exIdx, o.progIdx); }}>
              <Field label="Week">{ed ? <input aria-label="Week" value={d.wk} onChange={function(e) { setDraft({ wk: e.target.value }); }} style={Object.assign({}, openInput, { width: 70 })} /> : d.wk}</Field>
              {d.sets.map(function(st, si) { return (<Field key={si} label={"Set " + (si + 1)} testid={"entry-set-" + (si + 1)}>{ed ? <div style={{ display: "flex", gap: 6 }}>
                  <input aria-label={"Set " + (si + 1) + " " + l1} placeholder={l1} value={st.w} onChange={function(e) { var ns = d.sets.slice(); ns[si] = Object.assign({}, st, { w: e.target.value }); setDraft({ sets: ns }); }} style={openInput} />
                  <input aria-label={"Set " + (si + 1) + " " + l2} placeholder={l2} value={st.r} onChange={function(e) { var ns = d.sets.slice(); ns[si] = Object.assign({}, st, { r: e.target.value }); setDraft({ sets: ns }); }} style={openInput} />
                </div> : <span>{st.w}{/^[\d.]+$/.test(String(st.w)) ? "kg" : ""} × {st.r}</span>}</Field>); })}
              {ed && <button type="button" onClick={function() { setDraft({ sets: d.sets.concat([{ w: (d.sets[d.sets.length - 1] || {}).w || "", r: "" }]) }); }} style={{...btnMuted, marginBottom: 6}}>+ Add set</button>}
              {group("fullRange", "Range")}
              {group("goodForm", "Form")}
              <Field label="My Notes" testid="entry-note">{ed ? <textarea aria-label="My Notes" value={d.note} onChange={function(e) { setDraft({ note: e.target.value }); }} style={Object.assign({}, openInput, { minHeight: 44 })} /> : (d.note || <span style={{ color: "#475569" }}>—</span>)}</Field>
              {d.companion && (function() { var c = d.companion; var setC = function(patch) { setDraft({ companion: Object.assign({}, c, patch) }); };
                var decLabel = c.decision === "accepted" ? "✓ Accepted" : c.decision === "rejected" ? "✕ Rejected" : "No decision yet";
                return (<div data-testid="entry-companion" style={{ margin: "8px 0 4px", padding: 8, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Companion Feedback{c.at ? <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#475569" }}> · {c.at}</span> : null}</div>
                  {c.verdict && <div data-testid="entry-companion-verdict" style={{ fontSize: 11, color: "#1e293b", lineHeight: 1.5 }}>{c.verdict}</div>}
                  {c.recommendation && <div style={{ fontSize: 11, color: "#9a3412", fontWeight: 600, marginTop: 3 }}>{c.recommendation}</div>}
                  {ed ? (<div style={{ marginTop: 6 }}>
                    <div role="group" aria-label="Your decision" style={{ display: "flex", border: "1px solid #cbd5e1", borderRadius: 6, overflow: "hidden" }}>
                      {[["accepted", "✓ Accept"], ["rejected", "✕ Reject"]].map(function(o) { var on = c.decision === o[0]; return <button key={o[0]} type="button" aria-pressed={on} onClick={function() { setC({ decision: on ? "" : o[0] }); }} style={{ flex: 1, padding: "6px 4px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: on ? (o[0] === "accepted" ? "#166534" : "#475569") : "#fff", color: on ? "#fff" : "#334155" }}>{o[1]}</button>; })}
                    </div>
                    <textarea aria-label="Note on the feedback" placeholder="Note on the feedback (optional)" value={c.decisionNote || ""} onChange={function(e) { setC({ decisionNote: e.target.value }); }} style={Object.assign({}, openInput, { minHeight: 36, marginTop: 6 })} />
                  </div>) : (<div data-testid="entry-companion-decision" style={{ fontSize: 11, marginTop: 4, color: "#334155" }}><b>Your decision:</b> {decLabel}{c.decisionNote ? " — " + c.decisionNote : ""}</div>)}
                </div>); })()}
            </OpenForm>);
          };
          const deleteProg = async (day, exIdx, progIdx) => {
            var ex2 = data[activeTab].exercises[day][exIdx];
            var entry = ex2.prog[progIdx];
            if (!confirm("Remove week " + (entry ? entry.wk : progIdx+1) + " from " + ex2.name + "?")) return;
            var nd = JSON.parse(JSON.stringify(data));
            var exN = nd[activeTab].exercises[day][exIdx];
            var before = exN.prog.slice().sort(function(a, b) { return (a.wk || 0) - (b.wk || 0); }).pop();
            exN.prog.splice(progIdx, 1);
            syncAfterProgChange(exN, before);   // D20: only a change to the LATEST week touches the card / status pill
            await saveData(nd); setOpenProg(null);
            setFormMsg("✓ Week " + (entry ? entry.wk : "") + " entry removed");
            setTimeout(function() { setFormMsg(""); }, 3000);
            setSelectedEx(null);
          };
          return (<div key={"ex-"+activeTab}>
          {/* Week header — centred like Eating */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ width: 36 }}></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800 }}>Week {currentWeek}</div><div style={{ fontSize: 10, color: "#475569" }}>{weekLabel}</div></div>
            <div style={{ width: 36 }}></div>
          </div>
          
          
          
          {/* Day Cards */}
          

          <div style={{ display: "flex", gap: 0, background: accentMid, borderRadius: "8px 8px 0 0", padding: 2, marginBottom: 0 }}>
            {["sunday","monday","tuesday","wednesday","thursday","friday","saturday"].map(function(d) { var dl = {sunday:"Sun",monday:"Mon",tuesday:"Tue",wednesday:"Wed",thursday:"Thu",friday:"Fri",saturday:"Sat"}; return (<button key={d} onClick={function(){setExerciseDay(d);setSelectedEx(null);setFbExpanded(false);setLogEx(null);}} style={{flex:1,padding:"6px 2px",border:"none",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer",background:exerciseDay===d?"#fff":"transparent",color:exerciseDay===d?"#0f172a":"#e2e8f0",lineHeight:1.2}}>{dl[d]}</button>);})}
          </div>
          {[exerciseDay].map(function(day) {
            var label = dayLabels[day] || day.charAt(0).toUpperCase() + day.slice(1);
            var exList = p.exercises[day] || [];
            var dv = dayView[day] || "activity";
            var setDv = function(v) { setDayView(function(prev) { var n = Object.assign({}, prev); n[day] = v; return n; }); };
            return (<div key={day} style={{ marginBottom: 16 }}>
                                          <div style={{ background: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #e2e8f0", borderTop: "none", overflow: "hidden" }}>
                <div style={{ padding: "8px 12px 0", fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{label}</div>
                {/* ACTIVITY TAB */}
                {dv === "activity" && (<div>
                <div style={{ background: accentLight, borderRadius: 8, padding: "4px 12px 12px", margin: 8, border: "1px solid " + accentBorder }}>
                  {/* Session Warm-Up */}
                  {p.sessionGuides && p.sessionGuides[day] && p.sessionGuides[day].warmup && (
                    <div style={{ padding: "8px 6px 10px", borderBottom: "1px solid #e2e8f0", marginBottom: 2 }}>
                      <div onClick={() => setWarmUpOpen(!warmUpOpen)} style={{ fontSize: 10, fontWeight: 700, color: "#9a3412", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", userSelect: "none" }}>🔥 Warm-Up <span style={{ fontSize: 9, fontWeight: 400, color: "#475569", textTransform: "none", letterSpacing: 0 }}>~3 min</span> <span style={{ marginLeft: "auto", fontSize: 10, color: "#475569", transform: warmUpOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span></div>
                      {warmUpOpen && <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap", marginTop: 6 }}>{p.sessionGuides[day].warmup}</div>}
                    </div>
                  )}
                  {(function() { var _renderEx = function(ex, i) { return (<div key={i} id={"ex-" + day + "-" + i} style={{ padding: "10px 3px", borderBottom: i < exList.length - 1 ? "1px solid #cbd5e1" : "none", position: "relative" }}>
                    {editExercise && editExercise.day === day && editExercise.idx === i ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <select value={ex.name} onChange={function(e) { renameExercise(day, i, e.target.value); }} style={{ ...inputStyle, flex: 1 }}>
                          {allExNames.map(function(n) { return <option key={n} value={n}>{n}</option>; })}
                        </select>
                        <button onClick={function() { removeExercise(day, i); }} style={btnDelete}>🗑 Remove</button>
                        <button onClick={function() { setEditExercise(null); }} style={btnS}>Cancel</button>
                      </div>
                    ) : (<>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 3, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }} onClick={function() { var curType=ex.exType||getExerciseType(ex.name);var tc=getExerciseTypeConfig(curType);var curM2=(ex.reps||tc.defaultM2).replace(/x\d+$/,"");setSelectedEx({day:day,idx:i});setAddExConfirm({name:ex.name,type:curType,sets:ex.sets||3,m1:ex.current||tc.defaultM1,m2:curM2,progression:ex.progressionNotes||"Double progression: build reps to target then increase weight.",notes:ex.notes||"",exerciseGuide:ex.exerciseGuide||"",prePostGuide:ex.prePostGuide||"",isCustom:false,_editMode:true,_editDay:day,_editIdx:i});setAddExOpen(false); }}>{ex.name} <span style={{ fontSize: 9, color: "#475569" }}>✎</span></div>
                          <div style={{ color: "#475569", fontSize: 11, fontWeight: 500 }}>{(ex.prog && ex.prog.length && setsDiffer(ex.prog[ex.prog.length - 1])) ? weightLabel(ex.prog[ex.prog.length - 1]) : ex.current} · {ex.reps}{ex.exType && ex.exType !== "weights" && <span style={{fontSize:9,color:"#475569",marginLeft:6}}>{EXERCISE_TYPES[ex.exType] ? EXERCISE_TYPES[ex.exType].label : ""}</span>}</div>
                          {ex.status && <div style={{ marginTop: 3 }}><span style={{ fontSize: 9, fontWeight: 600, color: sColor(ex.status), background: sBg(ex.status), padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap", border: "1px solid " + sColor(ex.status) + "40" }}>{sLabel(ex.status)}</span></div>}
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0,alignItems:"flex-end"}}>
                        <button onClick={function(){if(selectedEx&&selectedEx.day===day&&selectedEx.idx===i){setSelectedEx(null);setLogEx(null);}else{setSelectedEx({day:day,idx:i});setLogEx(null);}}} style={selectedEx&&selectedEx.day===day&&selectedEx.idx===i?btnFilledOn:btnProgress}>{selectedEx&&selectedEx.day===day&&selectedEx.idx===i?"✕ Progress":"👁 Progress"}</button>
                        {!ex.stopped && <button onClick={function(){setSelectedEx({day:day,idx:i});openLogForm(day,i);}} style={btnLog}>📋 Log</button>}
                        </div>
                      </div>
                      {ex.notes && <div style={{ fontSize: 10, color: "#92400e", background: "#fef3c7", padding: "3px 6px", borderRadius: 4, marginTop: 6 }}>📋 {ex.notes}</div>}
                    
                    {selectedEx&&selectedEx.day===day&&selectedEx.idx===i&&(<div ref={scrollOnMount} data-testid="ex-progress-panel" style={{marginTop:10,padding:12,background:accentLight,borderRadius:8,border:"1px solid "+accentBorder,width:"100%"}}>
                      {ex.stopped ? <div style={{fontSize:11,color:"#475569",background:"#f1f5f9",padding:"8px 10px",borderRadius:6,textAlign:"center"}}>⏸ Stopped — view only. Restart in Exercise Settings to log again.</div> : <button onClick={function() { openLogForm(day, i); }} style={btnActionLg}>📋 Log {ex.name}</button>}
                      {logEx && logEx.day === day && logEx.idx === i && (() => {
            const ex = p.exercises[logEx.day] && p.exercises[logEx.day][logEx.idx]; if (!ex) return null;
            const prev = previousEntry(ex.prog, currentWeek); // D23: latest logged week before the current week
            return (<div ref={logFormRef} style={{ background: "#fff", borderRadius: 12, border: "2px solid " + accent, padding: 14, marginTop: 10, marginBottom: 14 }}>
              <div data-testid="log-for" style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 2 }}>Logging for {personName(data, activeTab)}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Log: {ex.name}</div>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}><span data-testid="log-previous">Previous: {prev ? fmtEntry(prev) + " (Wk " + prev.wk + ")" : "No data"}</span></div>
              {prevComment && (<div style={{ padding: 8, background: "#fef3c7", borderRadius: 8, marginBottom: 8, border: "1px solid #fcd34d" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", marginBottom: 3 }}>📋 NOTES FROM LAST SESSION</div>
                <div style={{ fontSize: 11, color: "#92400e", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{prevComment}</div>
              </div>)}
              {prev && <button onClick={() => { setEditPrev(!editPrev); if (!editPrev) { window._lcEditWk = prev.wk; setLogSets(logSetsFrom(prev, 3)); setLogWeek(String(prev.wk)); setLogFullRange(prev.fullRange || ""); setLogGoodForm(prev.goodForm || ""); setLogComment(prev.note || ""); } else { setLogSets(logSetsFrom(prev, 3).map(function(x) { return { w: x.w, r: "" }; })); window._lcEditWk = null; setLogWeek(String(currentWeek)); setLogFullRange(""); setLogGoodForm(""); setLogComment(""); } }} style={{ ...btnST, marginBottom: 8, fontSize: 11, background: editPrev ? "#fef3c7" : "#f1f5f9" }}>{editPrev ? "Cancel Edit — Log New Instead" : "Edit Previous Entry"}</button>}
              <div style={{ marginBottom: 8 }}><label style={labelStyle}>Week</label><input type="number" value={logWeek} onChange={e => setLogWeek(e.target.value)} style={{ ...inputStyle, width: 80 }} /></div>
              {(() => { var exTypeName = ex.exType || getExerciseType(ex.name); var etc = getExerciseTypeConfig(exTypeName); var numSets = ex.sets || 3; var showM1 = etc.metric1 !== "none"; var m1ph = etc.metric1Label ? etc.metric1Label.replace(/\s*\(.*\)/,"") : "value"; var m2ph = etc.metric2Label ? etc.metric2Label.replace(/\s*\(.*\)/,"") : "value"; var showM2 = etc.metric2 !== "none"; var setsLabel = etc.hasSets ? "Sets" : "Log"; return (<div><div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 6 }}>{etc.hasSets ? setsLabel + " (" + (showM1 ? m1ph : "") + (showM1 && showM2 ? " × " : "") + (showM2 ? m2ph : "") + ")" : "Log (" + (showM1 ? m1ph : "") + (showM1 && showM2 ? " / " : "") + (showM2 ? m2ph : "") + ")"}</div>
              {logSets.slice(0, etc.hasSets ? numSets : 1).map((s, i) => (<div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>{etc.hasSets && <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", width: 20 }}>S{i + 1}</span>}{showM1 && <input type="number" placeholder={m1ph} value={s.w} onChange={e => { const n = [...logSets]; n[i] = { ...n[i], w: e.target.value }; setLogSets(n); }} style={{ ...inputStyle, width: 80 }} />}{showM1 && showM2 && <span style={{ color: "#475569" }}>×</span>}{showM2 && <input type="number" placeholder={m2ph} value={s.r} onChange={e => { const n = [...logSets]; n[i] = { ...n[i], r: e.target.value }; setLogSets(n); }} style={{ ...inputStyle, width: 80 }} />}</div>))}</div>); })()}

              {/* Quality toggles — Full Range / Completed in One + Good Form */}
              {(() => { var exTypeName2 = ex.exType || getExerciseType(ex.name); var isWeightType = ["weights","bodyweight","timed_hold","stretching"].indexOf(exTypeName2) >= 0; var toggle1Label = isWeightType ? "Full Range of Motion" : "Completed in One"; var toggle1Tip = isWeightType ? "Full controlled movement through the complete range" : "Completed without stopping and restarting";
              return (<>
              <div data-testid="session-quality" style={{ marginTop: 10, padding: 10, background: accentLight, borderRadius: 8, border: "1px solid " + accentBorder }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Session Quality</div>
                {[["range", toggle1Label, logFullRange, setLogFullRange], ["form", "Good Form", logGoodForm, setLogGoodForm]].map(function(q) { var missing = !!logNeedChoice && !q[2]; return (
                  <div key={q[0]} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#334155", marginBottom: 4 }}>{q[1]}</div>
                    <div data-testid={"quality-" + q[0]} data-missing={missing ? "true" : "false"} style={{ display: "flex", borderRadius: 8, overflow: "hidden", background: "#fff", border: missing ? "2px solid #dc2626" : "1px solid #cbd5e1" }}>
                      {[["working", "Working towards"], ["good", "Good"]].map(function(o, oi) { var sel = q[2] === o[0]; return (
                        <button key={o[0]} aria-pressed={sel} onClick={function() { q[3](o[0]); }} style={{ flex: 1, padding: "9px 4px", border: "none", borderLeft: oi ? "1px solid #cbd5e1" : "none", fontSize: 12, fontWeight: sel ? 700 : 500, cursor: "pointer", background: sel ? (o[0] === "good" ? "#166534" : "#b45309") : "#fff", color: sel ? "#fff" : "#475569" }}>{o[1]}</button>
                      ); })}
                    </div>
                  </div>
                ); })}
                <div style={{ fontSize: 9, color: "#475569", marginTop: 2, fontStyle: "italic" }}>{toggle1Tip}</div>
              </div>
              {logNeedChoice && (!logFullRange || !logGoodForm) && <div role="alert" data-testid="log-need-choice" style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>{logNeedChoice}</div>}
              </>); })()}

              <div style={{ marginTop: 8 }}>
                <label style={labelStyle}>Progression</label>
                <select value={logOverride} onChange={function(e) { setLogOverride(e.target.value); }} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, marginBottom: 8, background: logOverride === "move_up" ? "#e0f2fe" : logOverride === "hold" ? "#fef3c7" : logOverride === "reduce" ? "#fee2e2" : "#fff" }}>
                  <option value="standard">Standard (follow progression rules)</option>
                  <option value="move_up">Move Up (override — ready to increase weight)</option>
                  <option value="hold">Hold (override — maintain current weight)</option>
                  <option value="reduce">Reduce (override — drop weight)</option>
                </select>
              </div>
              <div style={{ marginTop: 4 }}><label style={labelStyle}>My Notes (carried to next session)</label><textarea value={logComment} onChange={e => setLogComment(e.target.value)} placeholder="Notes for next session..." style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} /></div>
              <div style={{ marginTop: 8, marginBottom: 4 }}>
                <div style={{ display: "flex", background: accentMid, borderRadius: 6, padding: 2, marginBottom: 6 }}>
                  <PersonTabs testId="log-person-tabs" people={peopleOf(data)} activeKey={activeTab} rowStyle={{ gap: 0 }}
                    tabStyle={{ padding: "5px 10px", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                    activeStyle={{ background: "#fff", color: "#0f172a" }} inactiveStyle={{ background: "transparent", color: "rgba(255,255,255,0.9)" }}
                    onSelect={function(tab) {
                      // Save current form state before switching
                      if (!window._dualLogState) window._dualLogState = {};
                      // Save current form state — check if user actually changed values from what was loaded
                      var _origState = window._dualLogState[activeTab] && window._dualLogState[activeTab]._orig ? window._dualLogState[activeTab]._orig : null;
                      var _curSets = logSets.map(function(s) { return s.w + "x" + s.r; }).join(",");
                      var _wasEdited = true;
                      if (_origState) { _wasEdited = _origState.sets !== _curSets || _origState.comment !== logComment; }
                      window._dualLogState[activeTab] = { sets: logSets.map(function(s) { return { w: s.w, r: s.r }; }), comment: logComment, override: logOverride, week: logWeek, fullRange: logFullRange, goodForm: logGoodForm, _edited: _wasEdited };
                      // Switch tab
                      setActiveTab(tab);
                      loadUserSettings(tab); /* the person being logged becomes the fully active person */
                      // Restore other tab state if exists
                      if (window._dualLogState[tab]) {
                        var st = window._dualLogState[tab];
                        setLogSets(st.sets.map(function(s) { return { w: s.w, r: s.r }; }));
                        setLogComment(st.comment || "");
                        setLogOverride(st.override || "standard");
                        setLogWeek(st.week || "");
                        setLogFullRange(st.fullRange || "");
                        setLogGoodForm(st.goodForm || "");
                      } else {
                        // Load from other person's exercise data — check current week first
                        var otherEx = data[tab] && data[tab].exercises && data[tab].exercises[logEx.day] ? data[tab].exercises[logEx.day][logEx.idx] : null;
                        if (otherEx) {
                          var otherCurWk = calcWeek(data.config.trainingStart);
                          var otherCurEntry = null;
                          var _oci = findWeekIdx(otherEx.prog, otherCurWk); if (_oci >= 0) otherCurEntry = otherEx.prog[_oci]; // D23
                          if (otherCurEntry) {
                            // Current week data exists — pre-fill from it
                            var ocReps = otherCurEntry.r ? parseReps(otherCurEntry.r) : [];
                            var ocSets = logSetsFrom(otherCurEntry, 3);
                            setLogSets(ocSets);
                            var ocComment = otherCurEntry.note || "";
                            setLogComment(ocComment);
                            setLogWeek(String(otherCurWk));
                            setLogOverride("standard");
                            var ocFR = otherCurEntry.fullRange || ""; var ocGF = otherCurEntry.goodForm || "";
                            setLogFullRange(ocFR); setLogGoodForm(ocGF);
                            // Record original state for edit detection
                            if (!window._dualLogState) window._dualLogState = {};
                            window._dualLogState[tab] = { sets: ocSets, comment: ocComment, override: "standard", week: String(otherCurWk), fullRange: ocFR, goodForm: ocGF, _edited: false, _orig: { sets: ocSets.map(function(s){return s.w+"x"+s.r;}).join(","), comment: ocComment } };
                          } else {
                            // No current week data — load from last entry as before
                            var otherLast = previousEntry(otherEx.prog, otherCurWk); // D23
                            var oReps = otherLast && otherLast.r ? parseReps(otherLast.r) : [];
                            var oSets = otherLast ? logSetsFrom(otherLast, 3) : [{ w: "", r: "" }, { w: "", r: "" }, { w: "", r: "" }];
                            setLogSets(oSets);
                            setLogComment("");
                            setLogOverride("standard"); setLogWeek(String(otherCurWk)); // D23: never inherit the other person's week
                            var olFR = ""; var olGF = ""; // D12: a new entry starts unselected
                            setLogFullRange(olFR); setLogGoodForm(olGF);
                            // Record original state for edit detection
                            if (!window._dualLogState) window._dualLogState = {};
                            window._dualLogState[tab] = { sets: oSets, comment: "", override: "standard", week: String(otherCurWk), fullRange: olFR, goodForm: olGF, _edited: false, _orig: { sets: oSets.map(function(s){return s.w+"x"+s.r;}).join(","), comment: "" } };
                          }
                        }
                      }
                    }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}><button onClick={saveLog} disabled={!logSets[0].r} style={{ ...btnP(!!logSets[0].r), flex: 1 }}>{editPrev ? "Update" : "Save"}</button><button onClick={() => setLogEx(null)} style={btnS}>Cancel</button></div>
              <p style={{ fontSize: 9, color: "#475569", textAlign: "center", margin: "8px 0 0", fontStyle: "italic", lineHeight: 1.3 }}>It's important to track accurate and honest information for your companion to give you the most appropriate feedback</p>
            </div>);
          })()}
                    
                      <div style={{marginTop:16}}>
                      <div style={{ padding: 12 }}>
                  {exList.filter(function(x,xi){return xi===i;}).map(function(ex) { var exIdx = i; return (<div key={exIdx} style={{ marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{ex.name}</div>
                      {ex.status && <span style={{ fontSize: 10, fontWeight: 600, color: sColor(ex.status), background: sBg(ex.status), padding: "2px 8px", borderRadius: 20, border: "1px solid " + sColor(ex.status) + "40" }}>{sLabel(ex.status)}</span>}
                    </div>
                    {ex.notes && <div style={{ fontSize: 10, color: "#92400e", background: "#fef3c7", padding: "4px 8px", borderRadius: 4, marginBottom: 6 }}>{ex.notes}</div>}
                    {(() => { var _etc = getExerciseTypeConfig(ex.exType || getExerciseType(ex.name)); var _h1 = _etc.metric1 !== "none" ? _etc.metric1Label.replace(/\s*\(.*\)/,"").toUpperCase() : ""; var _h2 = _etc.metric2 !== "none" ? _etc.metric2Label.replace(/\s*\(.*\)/,"").toUpperCase() : ""; return (<div style={{ display: "flex", gap: 6, padding: "3px 0", marginBottom: 2, fontSize: 9, color: "#475569", fontWeight: 600 }}>
                      <span style={{ width: 40 }}>WEEK</span>{_h1 && <span style={{ width: 55 }}>{_h1}</span>}{_h2 && <span style={{ width: 65 }}>{_h2}</span>}<span style={{ flex: 1 }}></span>
                    </div>); })()}
                    {ex.prog && ex.prog.slice().reverse().slice(0, selectedEx && selectedEx.showAll ? 999 : 4).map(function(pr, pi) { var realPi = ex.prog.length - 1 - pi; return (<div key={pi}><div style={{ display: "flex", gap: 4, alignItems: "center", padding: "3px 0", borderBottom: "1px solid #f8fafc", fontSize: 11, overflow: "hidden" }}>
                      <span data-testid="prog-wk" style={{ width: 40, textAlign: "center", fontWeight: 600, color: "#334155" }}>{pr.wk}</span>
                      <span data-testid="prog-weight" style={{ width: 70, fontSize: 11 }}>{weightLabel(pr) || pr.w}</span>
                      <span style={{ width: 65, fontSize: 11 }}>{pr.r}</span>
                      <span style={{ flex: 1, minWidth: 0 }}></span>
                      <button aria-label={"Open week " + pr.wk} onClick={function() { openEntry(day, exIdx, realPi); }} style={Object.assign({}, btnOpen, { flexShrink: 0 })}>Open</button>
                    </div>{setsDiffer(pr) && <div data-testid="prog-sets" style={{ fontSize: 10, color: "#475569", padding: "0 0 4px 44px" }}>Sets: {fmtEntry(pr)}</div>}{/* v2.16.4: Form/Range shown only inside the Open card (JC: pills under rows looked cluttered) */}{openProg && openProg.day === day && openProg.exIdx === exIdx && openProg.progIdx === realPi && renderEntryForm(ex)}</div>); })}
                    {(!ex.prog || ex.prog.length === 0) && <div style={{ fontSize: 10, color: "#475569" }}>No progression data yet</div>}
                    {ex.prog && ex.prog.length > 4 && <button onClick={function(){setSelectedEx(Object.assign({},selectedEx,{showAll:!selectedEx.showAll}));}} style={{width:"100%",padding:6,background:"none",border:"1px solid #e2e8f0",borderRadius:6,fontSize:11,color:accent,cursor:"pointer",marginBottom:6}}>{selectedEx && selectedEx.showAll ? "▲ Show less" : "▼ View more (" + (ex.prog.length - 4) + " entries)"}</button>}
                    <button onClick={async function() { var nd = JSON.parse(JSON.stringify(data)); var wk = calcWeek(nd.config.trainingStart); var existWk = -1; for (var awi = 0; awi < nd[activeTab].exercises[day][exIdx].prog.length; awi++) { if (nd[activeTab].exercises[day][exIdx].prog[awi].wk === wk) { existWk = awi; break; } }
                      if (existWk >= 0) { if (!confirm("Week " + wk + " already exists. OK = Update, Cancel = Go back")) return; nd[activeTab].exercises[day][exIdx].prog[existWk].w = ex.current || "0kg"; nd[activeTab].exercises[day][exIdx].prog[existWk].r = ex.reps || "0"; } else { nd[activeTab].exercises[day][exIdx].prog.push({ wk: wk, w: ex.current || "0kg", r: ex.reps || "0", note: "" }); } var latestNote = nd[activeTab].exercises[day][exIdx].prog[nd[activeTab].exercises[day][exIdx].prog.length-1].note || ""; nd[activeTab].exercises[day][exIdx].notes = latestNote; await saveData(nd); setFormMsg("✓ Week " + wk + " added"); setTimeout(function() { setFormMsg(""); }, 2000); }} style={{...btnAction, marginTop: 4}}>+ Add Week</button>

                    
                    {ex.prog && ex.prog.length >= 2 && (() => {
                      var _chartTC = getExerciseTypeConfig(ex.exType || getExerciseType(ex.name));
                      var _numSets = ex.sets || 3;
                      var repData = ex.prog.map(function(pr) { var w = parseFloat(pr.w) || 0; return { wk: pr.wk, v: w }; });
                      var chartSeries = [];
                      if (_chartTC.metric1 !== "none") {
                        chartSeries.push({ label: _chartTC.chartLabel1, color: accent, data: repData });
                        if (_chartTC.hasSets && _numSets > 1) {
                          var setData = ex.prog.map(function(pr) { var w = parseFloat(pr.w) || 0; return { wk: pr.wk, v: w * _numSets }; });
                          chartSeries.push({ label: _chartTC.chartLabel2, color: "#b45309", data: setData });
                        }
                      }
                      if (_chartTC.metric2 !== "none" && _chartTC.metric1 === "none") {
                        var m2Data = ex.prog.map(function(pr) { var r = parseFloat(pr.r) || 0; return { wk: pr.wk, v: r }; });
                        chartSeries.push({ label: _chartTC.chartLabel1, color: accent, data: m2Data });
                        if (_chartTC.hasSets && _numSets > 1) {
                          var totalData = ex.prog.map(function(pr) { var r = parseFloat(pr.r) || 0; return { wk: pr.wk, v: r * _numSets }; });
                          chartSeries.push({ label: _chartTC.chartLabel2, color: "#b45309", data: totalData });
                        }
                      }
                      if (_chartTC.chartLabel2 && _chartTC.metric1 !== "none" && _chartTC.metric2 !== "none" && !_chartTC.hasSets) {
                        var m2Data2 = ex.prog.map(function(pr) { var r = parseFloat(pr.r) || 0; return { wk: pr.wk, v: r }; });
                        chartSeries.push({ label: _chartTC.chartLabel2, color: "#b45309", data: m2Data2 });
                      }
                      if (chartSeries.length === 0) return null;
                      return (<div style={{ marginTop: 12 }}>
                        <FullChart title={ex.name + " Progress"} series={chartSeries} height={140} />
                      </div>);
                    })()}
                    {ex.prog && ex.prog.length < 2 && <div style={{ fontSize: 11, color: "#475569", textAlign: "center", padding: 12, marginTop: 8 }}>Need 2+ weeks of data to show chart</div>}
                    <div style={{marginTop:12}}>
                      <button onClick={function(){setExInfoOpen(!exInfoOpen);}} style={{background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:600,color:"#475569",cursor:"pointer",width:"100%",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span>ℹ️ Exercise Information</span>
                        <span style={{fontSize:9,color:"#475569"}}>{exInfoOpen ? "▲" : "▼"}</span>
                      </button>
                    </div>
                    {exInfoOpen && (<div>
                    {ex.exerciseGuide && (
                    <div style={{marginTop:12,padding:10,background:"#f0fdf4",borderRadius:8,border:"1px solid #bbf7d0"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#166534",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>📖 Exercise Guide</div>
                      <div style={{fontSize:11,color:"#15803d",lineHeight:1.5,whiteSpace:"pre-wrap"}}>{ex.exerciseGuide}</div>
                    </div>
                    )}
                    {ex.prePostGuide && (
                    <div style={{marginTop:12,padding:10,background:"#eff6ff",borderRadius:8,border:"1px solid #bfdbfe"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#1e40af",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>🧘 Pre & Post Exercise</div>
                      <div style={{fontSize:11,color:"#1d4ed8",lineHeight:1.5,whiteSpace:"pre-wrap"}}>{ex.prePostGuide}</div>
                    </div>
                    )}
<div style={{marginTop:12}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#0f172a",marginBottom:4}}>Progression Rules</div>
                      <textarea value={ex.progressionNotes || "Progression: build reps to target then increase weight. User defines increment method and ranges."} onChange={async function(e) { var nd=JSON.parse(JSON.stringify(data)); var exs=nd[activeTab].exercises[day]; if(exs&&exs[i]) { exs[i].progressionNotes=e.target.value; await saveData(nd); }}} style={{width:"100%",padding:8,border:"1px solid #e2e8f0",borderRadius:6,fontSize:11,color:"#475569",background:"#fff",minHeight:60,resize:"vertical",lineHeight:1.4,boxSizing:"border-box"}} />
                    </div>
                    </div>)}
                    <div style={{marginTop:12,paddingTop:8,borderTop:"1px solid #e2e8f0"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#0f172a",marginBottom:6}}>Exercise Settings</div>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={function(){
                          var curType = ex.exType || getExerciseType(ex.name);
                          var tc = getExerciseTypeConfig(curType);
                          var curM1 = ex.current || tc.defaultM1;
                          var curM2 = (ex.reps || tc.defaultM2).replace(/x\d+$/,"");
                          setSelectedEx({day:day,idx:i});
                          setAddExConfirm({name:ex.name,type:curType,sets:ex.sets||3,m1:curM1,m2:curM2,progression:ex.progressionNotes||"Double progression: build reps to target then increase weight.",notes:ex.notes||"",exerciseGuide:ex.exerciseGuide||"",prePostGuide:ex.prePostGuide||"",isCustom:false,_editMode:true,_editDay:day,_editIdx:i});
                          setAddExOpen(false);
                        }} style={{...btnEdit,flex:1}}>✎ Edit</button>
                        <button onClick={async function(){if(confirm("Delete "+ex.name+"?\n\nThis will permanently remove this exercise and all its progress history. This cannot be undone.")){var nd=JSON.parse(JSON.stringify(data));var exs=nd[activeTab].exercises[day];if(exs){exs.splice(i,1);await saveData(nd);setSelectedEx(null);setLogEx(null);}}}} style={{...btnDelete,flex:1}}>🗑 Delete</button>
                      </div>
                      <button onClick={async function(){
                        var stopping = !ex.stopped;
                        if (stopping && !confirm("Stop " + ex.name + "?\n\nIt will move to Stopped Exercises with all its progress kept. You can restart it any time from Exercise Settings.")) return;
                        var nd = JSON.parse(JSON.stringify(data)); var t = nd[activeTab].exercises[day][i];
                        if (stopping) { t.stopped = true; t.stoppedAt = new Date().toISOString(); } else { delete t.stopped; delete t.stoppedAt; }
                        await saveData(nd); setSelectedEx(null); setLogEx(null);
                        setFormMsg(stopping ? "⏸ Stopped " + ex.name : "▶ Restarted " + ex.name); setTimeout(function(){ setFormMsg(""); }, 3000);
                      }} style={{...(ex.stopped ? btnAction : btnMuted), width:"100%", marginTop:6, padding:"8px 10px", fontSize:11, fontWeight:600}}>{ex.stopped ? "▶ Restart Exercise" : "⏸ Stop Exercise"}</button>
                    </div>
                    {/* Inline edit form when editing this exercise */}
                    {addExConfirm && addExConfirm._editMode && addExConfirm._editDay===day && addExConfirm._editIdx===i && (
                    <div style={{marginTop:12,padding:10,background:"#fff",borderRadius:10,border:"2px solid "+accent}}>
                      <div style={{fontSize:11,fontWeight:700,color:accent,marginBottom:2}}>{(p.profile && p.profile.name) || activeTab}</div>
                      <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Edit: {addExConfirm.name}</div>
                      {addExLoading && <div style={{fontSize:11,color:"#475569",marginBottom:8,display:"flex",alignItems:"center",gap:6}}><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> Getting AI recommendations...</div>}
                      <div style={{display:"flex",gap:8,marginBottom:8}}>
                        <div style={{flex:1}}>
                          <label style={labelStyle}>Type</label>
                          <select value={addExConfirm.type} onChange={function(e){var tc=getExerciseTypeConfig(e.target.value);setAddExConfirm(Object.assign({},addExConfirm,{type:e.target.value,sets:tc.defaultSets,m1:tc.defaultM1,m2:tc.defaultM2}));}} style={{...inputStyle,width:"100%"}}>
                            {Object.keys(EXERCISE_TYPES).map(function(t){return <option key={t} value={t}>{EXERCISE_TYPES[t].label}</option>;})}
                          </select>
                        </div>
                        <div style={{width:70}}>
                          <label style={labelStyle}>{EXERCISE_TYPES[addExConfirm.type].hasSets ? "Sets" : "Sessions"}</label>
                          <input type="number" value={addExConfirm.sets} onChange={function(e){setAddExConfirm(Object.assign({},addExConfirm,{sets:parseInt(e.target.value)||1}));}} style={{...inputStyle,width:"100%"}} min="1" max="10" />
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,marginBottom:8}}>
                        {EXERCISE_TYPES[addExConfirm.type].metric1 !== "none" && (
                          <div style={{flex:1}}>
                            <label style={labelStyle}>{EXERCISE_TYPES[addExConfirm.type].metric1Label}</label>
                            <input value={addExConfirm.m1} onChange={function(e){setAddExConfirm(Object.assign({},addExConfirm,{m1:e.target.value}));}} style={{...inputStyle,width:"100%"}} />
                          </div>
                        )}
                        {EXERCISE_TYPES[addExConfirm.type].metric2 !== "none" && (
                          <div style={{flex:1}}>
                            <label style={labelStyle}>{EXERCISE_TYPES[addExConfirm.type].metric2Label}</label>
                            <input value={addExConfirm.m2} onChange={function(e){setAddExConfirm(Object.assign({},addExConfirm,{m2:e.target.value}));}} style={{...inputStyle,width:"100%"}} />
                          </div>
                        )}
                      </div>
                      <div style={{marginBottom:8}}>
                        <label style={labelStyle}>Progression Rules</label>
                        <textarea value={addExConfirm.progression} onChange={function(e){setAddExConfirm(Object.assign({},addExConfirm,{progression:e.target.value}));}} style={{...inputStyle,width:"100%",minHeight:60,resize:"vertical",boxSizing:"border-box"}} />
                      </div>
                      <div style={{marginBottom:10}}>
                        <label style={labelStyle}>My Notes (equipment / form)</label>
                        <textarea value={addExConfirm.notes||""} onChange={function(e){setAddExConfirm(Object.assign({},addExConfirm,{notes:e.target.value}));}} placeholder="Optional notes..." style={{...inputStyle,width:"100%",minHeight:40,resize:"vertical",boxSizing:"border-box"}} />
                      </div>
                      <div style={{marginBottom:10}}>
                        <button onClick={async function(){
                          setAddExLoading(true);
                          try {
                            var prof3 = (activeTab === "jc" ? data.jc : data.becks).profile || {};
                            var profileInfo3 = buildExProfileInfo(prof3);
                            var typeCfg3 = getExerciseTypeConfig(addExConfirm.type);
                            var prompt3 = "Exercise: " + addExConfirm.name + " (type: " + typeCfg3.label + "). Person: " + profileInfo3 + ".\nReturn ONLY JSON: {\"exerciseGuide\":\"A concise how-to guide for performing this exercise correctly. Cover: starting position, movement execution with emphasis on full range of motion, breathing pattern, tempo recommendation (e.g. 3-second eccentric), and the most common mistakes to avoid. Write in direct 2nd person. 3-5 short sentences.\",\"prePostGuide\":\"Recommended warm-up stretches and preparation BEFORE this specific exercise, and cool-down stretches AFTER it. Customise to the muscle groups this exercise targets and this person's profile. Format as: PRE: 2-3 specific stretches/movements with brief instruction. POST: 2-3 specific stretches with brief instruction. Write in direct 2nd person. Keep each stretch to one sentence.\"}";
                            var resp3 = await fetch("https://api.anthropic.com/v1/messages", {method:"POST",headers:{"Content-Type":"application/json","x-api-key":await window.ensureApiKey(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:600,messages:[{role:"user",content:prompt3}]})});
                            var result3 = await resp3.json();
                            var txt3 = ""; if(result3.content){for(var ri3=0;ri3<result3.content.length;ri3++){if(result3.content[ri3].text)txt3+=result3.content[ri3].text;}}
                            var info3 = JSON.parse(txt3.replace(/```json|```/g,"").trim());
                            setAddExConfirm(function(prev){if(!prev)return prev;return Object.assign({},prev,{exerciseGuide:info3.exerciseGuide||prev.exerciseGuide||"",prePostGuide:info3.prePostGuide||prev.prePostGuide||""});});
                          } catch(ae3) { console.error("Guide update failed:", ae3); }
                          setAddExLoading(false);
                        }} disabled={addExLoading} style={{width:"100%",fontSize:11,padding:"8px 0",color:"#fff",border:"none",borderRadius:6,fontWeight:600,cursor:addExLoading?"not-allowed":"pointer",opacity:addExLoading?0.7:1,background:addExLoading?"#94a3b8":"linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",textAlign:"center",display:"flex",justifyContent:"center",alignItems:"center",gap:4}}>
                          {addExLoading ? <span>Generating <LoadingDots /></span> : "🔄 Generate / Update Guides"}
                        </button>
                        {!addExConfirm.exerciseGuide && !addExConfirm.prePostGuide && <div style={{fontSize:9,color:"#475569",textAlign:"center",marginTop:4,fontStyle:"italic"}}>This exercise was added before guides were available — tap above to generate them</div>}
                      </div>
                      {addExConfirm.exerciseGuide && (
                      <div style={{marginBottom:10,padding:10,background:"#f0fdf4",borderRadius:8,border:"1px solid #bbf7d0"}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#166534",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>📖 Exercise Guide</div>
                        <div style={{fontSize:11,color:"#15803d",lineHeight:1.5,whiteSpace:"pre-wrap"}}>{addExConfirm.exerciseGuide}</div>
                        <div style={{fontSize:9,color:"#86efac",marginTop:4,fontStyle:"italic"}}>AI-generated — review for accuracy</div>
                      </div>
                      )}
                      {addExConfirm.prePostGuide && (
                      <div style={{marginBottom:10,padding:10,background:"#eff6ff",borderRadius:8,border:"1px solid #bfdbfe"}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#1e40af",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>🧘 Pre & Post Exercise</div>
                        <div style={{fontSize:11,color:"#1d4ed8",lineHeight:1.5,whiteSpace:"pre-wrap"}}>{addExConfirm.prePostGuide}</div>
                        <div style={{fontSize:9,color:"#93c5fd",marginTop:4,fontStyle:"italic"}}>AI-generated — review for accuracy</div>
                      </div>
                      )}
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={async function(){
                          var c = addExConfirm; var tc = getExerciseTypeConfig(c.type);
                          var nd = JSON.parse(JSON.stringify(data));
                          var m1Val = tc.metric1 === "none" ? (tc.label === "Bodyweight" || tc.label === "Timed Hold" || tc.label === "Stretching/Mobility" ? "BW" : "") : c.m1;
                          var repsStr = c.sets > 1 ? c.m2 + "x" + c.sets : c.m2;
                          var editDay = c._editDay; var editIdx = c._editIdx;
                          var existingEx = nd[activeTab].exercises[editDay][editIdx];
                          existingEx.name = c.name; existingEx.exType = c.type; existingEx.current = m1Val; existingEx.reps = repsStr; existingEx.progressionNotes = c.progression; existingEx.notes = c.notes || ""; existingEx.sets = c.sets; if (c.exerciseGuide) existingEx.exerciseGuide = c.exerciseGuide; if (c.prePostGuide) existingEx.prePostGuide = c.prePostGuide;
                          await saveData(nd);
                          setFormMsg("✓ " + c.name + " updated"); setTimeout(function(){setFormMsg("");},3000);
                          setAddExConfirm(null); setAddExOpen(false); setAddExSearch("");
                        }} style={{...btnP(true),flex:1}}>Save Changes</button>
                        <button onClick={function(){setAddExConfirm(null);setAddExOpen(false);setAddExSearch("");}} style={btnS}>Cancel</button>
                      </div>
                    </div>
                    )}
                  </div>); })}
                </div>
                      </div>
                    </div>)}
                    </>)}
                  </div>); };
                  var _nStopped = exList.filter(function(e) { return e.stopped; }).length;
                  var _out = exList.map(function(ex, i) { return ex.stopped ? null : _renderEx(ex, i); });
                  if (_nStopped > 0) {
                    _out.push(<button key="stopped-toggle" onClick={function(){ setStoppedExOpen(!stoppedExOpen); }} style={{width:"100%",padding:6,background:"none",border:"1px solid #e2e8f0",borderRadius:6,fontSize:11,color:"#475569",cursor:"pointer",marginTop:8}}>{stoppedExOpen ? "▲ Hide Stopped Exercises (" + _nStopped + ")" : "▼ Stopped Exercises (" + _nStopped + ")"}</button>);
                    if (stoppedExOpen) { exList.forEach(function(ex, i) { if (ex.stopped) _out.push(<div key={"stopped-" + i} style={{ opacity: 0.8, background: "#f8fafc", borderRadius: 6, marginTop: 6 }}><div style={{ fontSize: 9, fontWeight: 700, color: "#475569", padding: "6px 6px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>⏸ Stopped</div>{_renderEx(ex, i)}</div>); }); }
                  }
                  return _out; })()}
                  

                
                {/* Session Cool-Down */}
                  {p.sessionGuides && p.sessionGuides[day] && p.sessionGuides[day].cooldown && (
                    <div style={{ padding: "10px 6px 8px", borderTop: "1px solid #e2e8f0", marginTop: 2 }}>
                      <div onClick={() => setCoolDownOpen(!coolDownOpen)} style={{ fontSize: 10, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", userSelect: "none" }}>🧊 Cool-Down <span style={{ fontSize: 9, fontWeight: 400, color: "#475569", textTransform: "none", letterSpacing: 0 }}>~3 min</span> <span style={{ marginLeft: "auto", fontSize: 10, color: "#475569", transform: coolDownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span></div>
                      {coolDownOpen && <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap", marginTop: 6 }}>{p.sessionGuides[day].cooldown}</div>}
                    </div>
                  )}
                <div style={{padding:"8px 0",borderTop:"1px solid #e2e8f0"}}>
                  {!addExOpen && (!addExConfirm || addExConfirm._editMode) ? (
                    <button onClick={function(){setAddExOpen(true);setAddExSearch("");setAddExConfirm(null);}} style={{...btnMuted,width:"100%",justifyContent:"center",padding:"6px 0"}}>+ Add Exercise</button>
                  ) : addExConfirm && !addExConfirm._editMode ? (
                    /* ---- CONFIRMATION FORM ---- */
                    <div style={{padding:10,background:"#fff",borderRadius:10,border:"2px solid "+accent}}>
                      <div style={{fontSize:11,fontWeight:700,color:accent,marginBottom:2}}>{(p.profile && p.profile.name) || activeTab}</div>
                      <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Confirm: {addExConfirm.name}</div>
                      {addExLoading && <div style={{fontSize:11,color:"#475569",marginBottom:8,display:"flex",alignItems:"center",gap:6}}><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> Getting AI recommendations...</div>}
                      <div style={{display:"flex",gap:8,marginBottom:8}}>
                        <div style={{flex:1}}>
                          <label style={labelStyle}>Type</label>
                          <select value={addExConfirm.type} onChange={function(e){var tc=getExerciseTypeConfig(e.target.value);setAddExConfirm(Object.assign({},addExConfirm,{type:e.target.value,sets:tc.defaultSets,m1:tc.defaultM1,m2:tc.defaultM2}));}} style={{...inputStyle,width:"100%"}}>
                            {Object.keys(EXERCISE_TYPES).map(function(t){return <option key={t} value={t}>{EXERCISE_TYPES[t].label}</option>;})}
                          </select>
                        </div>
                        <div style={{width:70}}>
                          <label style={labelStyle}>{EXERCISE_TYPES[addExConfirm.type].hasSets ? "Sets" : "Sessions"}</label>
                          <input type="number" value={addExConfirm.sets} onChange={function(e){setAddExConfirm(Object.assign({},addExConfirm,{sets:parseInt(e.target.value)||1}));}} style={{...inputStyle,width:"100%"}} min="1" max="10" />
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,marginBottom:8}}>
                        {EXERCISE_TYPES[addExConfirm.type].metric1 !== "none" && (
                          <div style={{flex:1}}>
                            <label style={labelStyle}>{EXERCISE_TYPES[addExConfirm.type].metric1Label}</label>
                            <input value={addExConfirm.m1} onChange={function(e){setAddExConfirm(Object.assign({},addExConfirm,{m1:e.target.value}));}} style={{...inputStyle,width:"100%"}} />
                          </div>
                        )}
                        {EXERCISE_TYPES[addExConfirm.type].metric2 !== "none" && (
                          <div style={{flex:1}}>
                            <label style={labelStyle}>{EXERCISE_TYPES[addExConfirm.type].metric2Label}</label>
                            <input value={addExConfirm.m2} onChange={function(e){setAddExConfirm(Object.assign({},addExConfirm,{m2:e.target.value}));}} style={{...inputStyle,width:"100%"}} />
                          </div>
                        )}
                      </div>
                      <div style={{marginBottom:8}}>
                        <label style={labelStyle}>Progression Rules</label>
                        <textarea value={addExConfirm.progression} onChange={function(e){setAddExConfirm(Object.assign({},addExConfirm,{progression:e.target.value}));}} style={{...inputStyle,width:"100%",minHeight:60,resize:"vertical",boxSizing:"border-box"}} />
                      </div>
                      <div style={{marginBottom:10}}>
                        <label style={labelStyle}>My Notes (equipment / form)</label>
                        <textarea value={addExConfirm.notes||""} onChange={function(e){setAddExConfirm(Object.assign({},addExConfirm,{notes:e.target.value}));}} placeholder="Optional notes..." style={{...inputStyle,width:"100%",minHeight:40,resize:"vertical",boxSizing:"border-box"}} />
                      </div>
                      {/* Update Guides button — regenerate AI guides */}
                      {addExConfirm._editMode && (
                      <div style={{marginBottom:10}}>
                        <button onClick={async function(){
                          setAddExLoading(true);
                          try {
                            var prof3 = (activeTab === "jc" ? data.jc : data.becks).profile || {};
                            var profileInfo3 = buildExProfileInfo(prof3);
                            var typeCfg3 = getExerciseTypeConfig(addExConfirm.type);
                            var prompt3 = "Exercise: " + addExConfirm.name + " (type: " + typeCfg3.label + "). Person: " + profileInfo3 + ".\nReturn ONLY JSON: {\"exerciseGuide\":\"A concise how-to guide for performing this exercise correctly. Cover: starting position, movement execution with emphasis on full range of motion, breathing pattern, tempo recommendation (e.g. 3-second eccentric), and the most common mistakes to avoid. Write in direct 2nd person. 3-5 short sentences.\",\"prePostGuide\":\"Recommended warm-up stretches and preparation BEFORE this specific exercise, and cool-down stretches AFTER it. Customise to the muscle groups this exercise targets and this person's profile. Format as: PRE: 2-3 specific stretches/movements with brief instruction. POST: 2-3 specific stretches with brief instruction. Write in direct 2nd person. Keep each stretch to one sentence.\"}";
                            var resp3 = await fetch("https://api.anthropic.com/v1/messages", {method:"POST",headers:{"Content-Type":"application/json","x-api-key":await window.ensureApiKey(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:600,messages:[{role:"user",content:prompt3}]})});
                            var result3 = await resp3.json();
                            var txt3 = ""; if(result3.content){for(var ri3=0;ri3<result3.content.length;ri3++){if(result3.content[ri3].text)txt3+=result3.content[ri3].text;}}
                            var info3 = JSON.parse(txt3.replace(/```json|```/g,"").trim());
                            setAddExConfirm(function(prev){if(!prev)return prev;return Object.assign({},prev,{exerciseGuide:info3.exerciseGuide||prev.exerciseGuide||"",prePostGuide:info3.prePostGuide||prev.prePostGuide||""});});
                          } catch(ae3) { console.error("Guide update failed:", ae3); }
                          setAddExLoading(false);
                        }} disabled={addExLoading} style={{width:"100%",fontSize:11,padding:"8px 0",color:"#fff",border:"none",borderRadius:6,fontWeight:600,cursor:addExLoading?"not-allowed":"pointer",opacity:addExLoading?0.7:1,background:addExLoading?"#94a3b8":"linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",textAlign:"center",display:"flex",justifyContent:"center",alignItems:"center",gap:4}}>
                          {addExLoading ? <span>Generating <LoadingDots /></span> : "🔄 Generate / Update Guides"}
                        </button>
                        {!addExConfirm.exerciseGuide && !addExConfirm.prePostGuide && <div style={{fontSize:9,color:"#475569",textAlign:"center",marginTop:4,fontStyle:"italic"}}>This exercise was added before guides were available — tap above to generate them</div>}
                      </div>
                      )}
                      {addExConfirm.exerciseGuide && (
                      <div style={{marginBottom:10,padding:10,background:"#f0fdf4",borderRadius:8,border:"1px solid #bbf7d0"}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#166534",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>📖 Exercise Guide</div>
                        <div style={{fontSize:11,color:"#15803d",lineHeight:1.5,whiteSpace:"pre-wrap"}}>{addExConfirm.exerciseGuide}</div>
                        <div style={{fontSize:9,color:"#86efac",marginTop:4,fontStyle:"italic"}}>AI-generated — review for accuracy</div>
                      </div>
                      )}
                      {addExConfirm.prePostGuide && (
                      <div style={{marginBottom:10,padding:10,background:"#eff6ff",borderRadius:8,border:"1px solid #bfdbfe"}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#1e40af",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>🧘 Pre & Post Exercise</div>
                        <div style={{fontSize:11,color:"#1d4ed8",lineHeight:1.5,whiteSpace:"pre-wrap"}}>{addExConfirm.prePostGuide}</div>
                        <div style={{fontSize:9,color:"#93c5fd",marginTop:4,fontStyle:"italic"}}>AI-generated — review for accuracy</div>
                      </div>
                      )}
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={async function(){
                          var c = addExConfirm; var tc = getExerciseTypeConfig(c.type);
                          var nd = JSON.parse(JSON.stringify(data));
                          var m1Val = tc.metric1 === "none" ? (tc.label === "Bodyweight" || tc.label === "Timed Hold" || tc.label === "Stretching/Mobility" ? "BW" : "") : c.m1;
                          var repsStr = c.sets > 1 ? c.m2 + "x" + c.sets : c.m2;
                          if (c._editMode) {
                            // Edit existing exercise — preserve prog data
                            var editDay = c._editDay; var editIdx = c._editIdx;
                            var existingEx = nd[activeTab].exercises[editDay][editIdx];
                            existingEx.name = c.name; existingEx.exType = c.type; existingEx.current = m1Val; existingEx.reps = repsStr; existingEx.progressionNotes = c.progression; existingEx.notes = c.notes || ""; existingEx.sets = c.sets; if (c.exerciseGuide) existingEx.exerciseGuide = c.exerciseGuide; if (c.prePostGuide) existingEx.prePostGuide = c.prePostGuide;
                            await saveData(nd);
                            setFormMsg("✓ " + c.name + " updated"); setTimeout(function(){setFormMsg("");},3000);
                          } else {
                            // Add new exercise
                            if(!nd[activeTab].exercises) nd[activeTab].exercises={};
                            if(!nd[activeTab].exercises[day]) nd[activeTab].exercises[day]=[];
                            nd[activeTab].exercises[day].push({name:c.name, exType:c.type, current:m1Val, reps:repsStr, status:"building", prog:[], progressionNotes:c.progression, notes:c.notes||"", sets:c.sets, exerciseGuide:c.exerciseGuide||"", prePostGuide:c.prePostGuide||""});
                            if(c.isCustom){var updated=[].concat(customExercises,[c.name]);setCustomExercises(updated);await sSet("custom_exercises",JSON.stringify(updated));}
                            await saveData(nd);
                            var newIdx = nd[activeTab].exercises[day].length - 1;
                            setSelectedEx({day:day,idx:newIdx});
                            setFormMsg("✓ " + c.name + " added"); setTimeout(function(){setFormMsg("");},3000);
                          }
                          var triggerDay = c._editMode ? c._editDay : day;
                          regenerateSessionGuides(activeTab, triggerDay, nd);
                          setAddExConfirm(null); setAddExOpen(false); setAddExSearch("");
                        }} style={{...btnP(true),flex:1}}>{addExConfirm && addExConfirm._editMode ? "Save Changes" : "Add Exercise"}</button>
                        {!addExConfirm._editMode && <button onClick={function(){setAddExConfirm(null);setAddExOpen(true);}} style={btnS}>Back</button>}
                        <button onClick={function(){setAddExConfirm(null);setAddExOpen(false);setAddExSearch("");}} style={btnS}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    /* ---- SEARCH/SELECT LIST ---- */
                    <div style={{padding:8,background:accentLight,borderRadius:8,border:"1px solid "+accentBorder}}>
                      <div style={{fontSize:11,fontWeight:700,marginBottom:6}}>Add Exercise</div>
                      <input value={addExSearch} onChange={function(e){setAddExSearch(e.target.value);}} placeholder="Search exercises or type new name..." style={{width:"100%",padding:"6px 8px",border:"1px solid #e2e8f0",borderRadius:6,fontSize:11,marginBottom:6,boxSizing:"border-box"}} autoFocus />
                      {addExSearch && (() => {
                        var term = addExSearch.toLowerCase();
                        var dbMatches = EXERCISE_DATABASE.filter(function(e){return e.name.toLowerCase().indexOf(term)>=0;});
                        var customMatches = customExercises.filter(function(n){return n.toLowerCase().indexOf(term)>=0 && !dbMatches.find(function(d){return d.name===n;});});
                        var allMatches = dbMatches.map(function(e){return {name:e.name,type:e.type,cat:e.category,isCustom:false};}).concat(customMatches.map(function(n){return {name:n,type:"weights",cat:"Custom",isCustom:true};}));
                        var openConfirmForm = function(match) {
                          var tc = getExerciseTypeConfig(match.type);
                          setAddExConfirm({name:match.name,type:match.type,sets:tc.defaultSets,m1:tc.defaultM1,m2:tc.defaultM2,progression:"Loading AI recommendation...",notes:"",exerciseGuide:"",prePostGuide:"",isCustom:match.isCustom});
                          setAddExOpen(false);
                          // Call AI for personalised defaults
                          setAddExLoading(true);
                          (async function(){
                            try {
                              var prof2 = (activeTab === "jc" ? data.jc : data.becks).profile || {};
                              var profileInfo = buildExProfileInfo(prof2);
                              var typeCfg = getExerciseTypeConfig(match.type);
                              var prompt2 = "Exercise: " + match.name + " (type: " + typeCfg.label + "). Person: " + profileInfo + ".\nReturn ONLY JSON: {\"sets\":" + tc.defaultSets + ",\"metric1\":\"recommended starting " + (typeCfg.metric1Label||"value") + " e.g. " + tc.defaultM1 + "\",\"metric2\":\"recommended starting " + (typeCfg.metric2Label||"value") + " e.g. " + tc.defaultM2 + "\",\"progressionNotes\":\"specific progression rules for this exercise for this person\",\"equipmentNotes\":\"any equipment or form notes specific to this person\",\"exerciseGuide\":\"A concise how-to guide for performing this exercise correctly. Cover: starting position, movement execution with emphasis on full range of motion, breathing pattern, tempo recommendation (e.g. 3-second eccentric), and the most common mistakes to avoid. Write in direct 2nd person. 3-5 short sentences.\",\"prePostGuide\":\"Recommended warm-up stretches and preparation BEFORE this specific exercise, and cool-down stretches AFTER it. Customise to the muscle groups this exercise targets and this person's profile. Format as: PRE: 2-3 specific stretches/movements with brief instruction. POST: 2-3 specific stretches with brief instruction. Write in direct 2nd person. Keep each stretch to one sentence.\"}";
                              var resp2 = await fetch("https://api.anthropic.com/v1/messages", {method:"POST",headers:{"Content-Type":"application/json","x-api-key":await window.ensureApiKey(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:900,messages:[{role:"user",content:prompt2}]})});
                              var result2 = await resp2.json();
                              var txt2 = ""; if(result2.content){for(var ri=0;ri<result2.content.length;ri++){if(result2.content[ri].text)txt2+=result2.content[ri].text;}}
                              var info2 = JSON.parse(txt2.replace(/```json|```/g,"").trim());
                              setAddExConfirm(function(prev){if(!prev||prev.name!==match.name)return prev;return Object.assign({},prev,{sets:info2.sets||prev.sets,m1:info2.metric1||prev.m1,m2:info2.metric2||prev.m2,progression:info2.progressionNotes||"Double progression: build reps to target then increase weight.",notes:info2.equipmentNotes||"",exerciseGuide:info2.exerciseGuide||"",prePostGuide:info2.prePostGuide||""});});
                            } catch(ae) {
                              setAddExConfirm(function(prev){if(!prev||prev.name!==match.name)return prev;return Object.assign({},prev,{progression:"Double progression: build reps to target then increase weight. User defines increment method and ranges.",exerciseGuide:"",prePostGuide:""});});
                            }
                            setAddExLoading(false);
                          })();
                        };
                        return (<div style={{maxHeight:200,overflowY:"auto"}}>
                          {allMatches.slice(0,8).map(function(m){return (<div key={m.name} onClick={function(){openConfirmForm(m);}} style={{padding:"6px 8px",fontSize:11,cursor:"pointer",borderBottom:"1px solid #f1f5f9",color:"#0f172a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span>{m.name}</span>
                            <span style={{fontSize:9,color:"#475569",background:"#f1f5f9",padding:"1px 6px",borderRadius:10}}>{EXERCISE_TYPES[m.type] ? EXERCISE_TYPES[m.type].label : m.type}{m.cat ? " · " + m.cat : ""}</span>
                          </div>);})}
                          {allMatches.length === 0 && addExSearch.trim() && (
                            <div style={{padding:"8px",fontSize:11,color:"#475569",textAlign:"center"}}>No matches found</div>
                          )}
                        </div>);
                      })()}
                      {addExSearch.trim() && (<button onClick={function(){
                        var name = addExSearch.trim();
                        var tc = getExerciseTypeConfig("weights");
                        setAddExConfirm({name:name,type:"weights",sets:tc.defaultSets,m1:tc.defaultM1,m2:tc.defaultM2,progression:"Loading AI recommendation...",notes:"",isCustom:true});
                        setAddExOpen(false);
                        setAddExLoading(true);
                        (async function(){
                          try {
                            var prof2 = (activeTab === "jc" ? data.jc : data.becks).profile || {};
                            var profileInfo = buildExProfileInfo(prof2);
                            var prompt2 = "New exercise: " + name + ". Person: " + profileInfo + ".\nDetermine the exercise type from: weights, bodyweight, timed_hold, cardio, walking, sports, stretching.\nReturn ONLY JSON: {\"exerciseType\":\"one of weights|bodyweight|timed_hold|cardio|walking|sports|stretching\",\"sets\":3,\"metric1\":\"recommended starting value\",\"metric2\":\"recommended starting value\",\"progressionNotes\":\"specific progression rules\",\"equipmentNotes\":\"any equipment or form notes\"}";
                            var resp2 = await fetch("https://api.anthropic.com/v1/messages", {method:"POST",headers:{"Content-Type":"application/json","x-api-key":await window.ensureApiKey(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:400,messages:[{role:"user",content:prompt2}]})});
                            var result2 = await resp2.json();
                            var txt2 = ""; if(result2.content){for(var ri=0;ri<result2.content.length;ri++){if(result2.content[ri].text)txt2+=result2.content[ri].text;}}
                            var info2 = JSON.parse(txt2.replace(/```json|```/g,"").trim());
                            var detectedType = info2.exerciseType && EXERCISE_TYPES[info2.exerciseType] ? info2.exerciseType : "weights";
                            setAddExConfirm(function(prev){if(!prev||prev.name!==name)return prev;return Object.assign({},prev,{type:detectedType,sets:info2.sets||prev.sets,m1:info2.metric1||prev.m1,m2:info2.metric2||prev.m2,progression:info2.progressionNotes||"Double progression: build reps to target then increase weight.",notes:info2.equipmentNotes||""});});
                          } catch(ae) {
                            setAddExConfirm(function(prev){if(!prev)return prev;return Object.assign({},prev,{progression:"Double progression: build reps to target then increase weight."});});
                          }
                          setAddExLoading(false);
                        })();
                      }} style={{width:"100%",padding:8,background:"linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",color:"#fff",border:"none",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",marginTop:4}}>Add Custom: {addExSearch}</button>)}
                      <button onClick={function(){setAddExOpen(false);setAddExSearch("");}} style={{width:"100%",padding:6,background:"none",border:"1px solid #e2e8f0",borderRadius:6,fontSize:10,color:"#475569",cursor:"pointer",marginTop:4}}>Cancel</button>
                    </div>
                  )}
                  {/* Generate / Regenerate Warm-Up & Cool-Down */}
                  {exList.length > 0 && (
                    <div style={{ padding: "8px 6px 4px", borderTop: p.sessionGuides && p.sessionGuides[day] ? "none" : "1px solid #e2e8f0" }}>
                      <button onClick={async function() {
                        setSessionGuideLoading(true);
                        try {
                          var prof = p.profile || {};
                          var profileInfo = buildExProfileInfo(prof);
                          var healthCtx = "";
                          if (p.bloods && p.bloods.length > 0) { var lb = p.bloods[p.bloods.length - 1]; healthCtx += " Bloods (" + lb.date + "): " + Object.keys(lb.tests).map(function(k){ return k + "=" + lb.tests[k]; }).join(", ") + "."; }
                          if (p.meds) { var activeMeds = p.meds.filter(function(m){ return m.active; }); if (activeMeds.length > 0) healthCtx += " Medications: " + activeMeds.map(function(m){ return m.name + " " + m.dosage; }).join(", ") + "."; }
                          if (p.body) { var bodyKeys = ["weight","bodyFat","muscleMass"]; bodyKeys.forEach(function(bk){ if (p.body[bk] && p.body[bk].length > 0) { var latest = p.body[bk][p.body[bk].length - 1]; healthCtx += " " + bk + ": " + latest.v + "."; } }); }
                          if (p.measurements) { var measParts = []; Object.keys(p.measurements).forEach(function(mk){ if (p.measurements[mk] && p.measurements[mk].length > 0) { measParts.push(mk + ": " + p.measurements[mk][p.measurements[mk].length - 1].v + "cm"); } }); if (measParts.length > 0) healthCtx += " Measurements: " + measParts.join(", ") + "."; }
                          var exerciseList = exList.map(function(ex) { return ex.name + " (" + (ex.exType || "weights") + ", " + ex.current + " " + ex.reps + ")"; }).join(", ");
                          var guidePrompt = "Generate a warm-up and cool-down for this training session.\n\nPerson: " + profileInfo + "." + healthCtx + "\n\nSession exercises: " + exerciseList + "\n\nRules:\n- Warm-up: 3 minutes max. 3-4 activities. Tailored to the specific exercises in this session and this person's health profile.\n- Cool-down: 3 minutes max. 3-4 stretches. Target the muscle groups worked in this session. Consider any injuries, conditions, or medications.\n- Each line should be one activity with brief instruction (e.g. '1. Arm circles — 20 seconds each direction, loosen shoulders').\n- Number each line. Keep each to one short sentence.\n- Write in direct 2nd person.\n- Do NOT include any JSON formatting or labels — just the plain text.\n\nReturn ONLY JSON: {\"warmup\":\"numbered lines for warm-up\",\"cooldown\":\"numbered lines for cool-down\"}";
                          var guideResp = await fetch("https://api.anthropic.com/v1/messages", {method:"POST",headers:{"Content-Type":"application/json","x-api-key":await window.ensureApiKey(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:500,messages:[{role:"user",content:guidePrompt}]})});
                          var guideResult = await guideResp.json();
                          var guideTxt = ""; if(guideResult.content){for(var gi=0;gi<guideResult.content.length;gi++){if(guideResult.content[gi].text)guideTxt+=guideResult.content[gi].text;}}
                          var guideData = JSON.parse(guideTxt.replace(/```json|```/g,"").trim());
                          var nd = JSON.parse(JSON.stringify(data));
                          if (!nd[activeTab].sessionGuides) nd[activeTab].sessionGuides = {};
                          nd[activeTab].sessionGuides[day] = { warmup: guideData.warmup || "", cooldown: guideData.cooldown || "" };
                          await saveData(nd);
                        } catch(ge) { console.error("Session guide generation failed:", ge); setFormMsg(window.isEnergyEmpty(ge) ? window.energyEmptyMsg : "✗ Could not generate — check API key in Admin"); setTimeout(function() { setFormMsg(""); }, 4000); }
                        setSessionGuideLoading(false);
                      }} disabled={sessionGuideLoading} style={{ width: "100%", padding: "6px 0", background: sessionGuideLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, color: "#fff", cursor: sessionGuideLoading ? "not-allowed" : "pointer", opacity: sessionGuideLoading ? 0.7 : 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 4 }}>
                        {sessionGuideLoading ? <span>Analysing, please wait <LoadingDots /></span> : (p.sessionGuides && p.sessionGuides[day] ? "🔄 Regenerate Warm-Up & Cool-Down" : "🔥 Generate Warm-Up & Cool-Down")}
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ padding: 12 }}>
                  <button onClick={async function() {
                    setSessionFbLoading(true); setFbExpanded(true); var clearKey = activeTab + "_" + day; var clearFb = Object.assign({}, sessionFeedback); delete clearFb[clearKey]; setSessionFeedback(clearFb);
                    try {
                      var prof = p.profile || {};
                      var daySummary = exList.filter(function(ex) { return !ex.stopped; }).map(function(ex) { var latest = ex.prog && ex.prog.length > 0 ? ex.prog[ex.prog.length - 1] : null; var prev = ex.prog && ex.prog.length > 1 ? ex.prog[ex.prog.length - 2] : null; var progNote = latest && latest.note ? latest.note : ""; var allNotes = [ex.notes, progNote].filter(Boolean).join("; "); var progRules = ex.progressionNotes || "Progression: build reps to target then increase weight. User defines increment method and ranges."; var eqInfo = ex.equipment ? " [EQUIPMENT: " + (ex.equipment.type || "") + ", increments: " + (ex.equipment.increments || "standard") + (ex.equipment.formNotes ? ", form: " + ex.equipment.formNotes : "") + "]" : ""; var histLines = ex.prog ? ex.prog.slice(-4).map(function(p){var ql=""; if(p.fullRange||p.goodForm){ql=" [FR:"+(p.fullRange==="good"?"Good":"WT")+",GF:"+(p.goodForm==="good"?"Good":"WT")+"]";} return "Wk"+p.wk+": "+fmtEntry(p)+ql+(p.note?" ("+p.note+")":"");}).join(", ") : "no data";
                        // Cross-day context: pull data from other sessions of the same exercise (parent/child model)
                        var crossDayCtx = "";
                        var otherDays = ["sunday", "monday", "friday"].filter(function(cd) { return cd !== day; });
                        var crossDayLines = [];
                        otherDays.forEach(function(cd) { var cdExList = p.exercises[cd] || []; for (var cdi = 0; cdi < cdExList.length; cdi++) { if (cdExList[cdi].name === ex.name && cdExList[cdi].prog && cdExList[cdi].prog.length > 0) { crossDayLines.push(cd + ": " + cdExList[cdi].prog.slice(-3).map(function(cp) { return "Wk" + cp.wk + ": " + cp.w + " " + cp.r + (cp.note ? " (" + cp.note + ")" : ""); }).join(", ")); } } });
                        if (crossDayLines.length > 0) { crossDayCtx = " [OTHER SESSIONS: " + crossDayLines.join("; ") + "]"; }
                        var qualityCtx = ""; if (latest) { var frLabel = (function(){ var et = ex.exType || "weights"; return ["weights","bodyweight","timed_hold","stretching"].indexOf(et) >= 0 ? "Full Range" : "Completed in One"; })(); qualityCtx = " [QUALITY: " + frLabel + "=" + (latest.fullRange === "good" ? "Good" : "Working Towards") + ", Good Form=" + (latest.goodForm === "good" ? "Good" : "Working Towards") + "]"; } var guideCtx = ex.exerciseGuide ? " [EXERCISE GUIDE: " + ex.exerciseGuide.substring(0, 200) + "]" : ""; return ex.name + ": LATEST LOGGED=" + (latest ? latest.w + " " + latest.r : "none") + " (" + ex.status + ")" + qualityCtx + " HISTORY=[" + histLines + "]" + (ex.target ? " TARGET: " + ex.target : "") + (allNotes ? " [NOTES: " + allNotes + "]" : "") + " [PROGRESSION RULES: " + progRules + "]" + eqInfo + guideCtx + crossDayCtx; }).join("; ");
                      var jsonFormat = '{"exercises":[{"name":"...","verdict":"max 25 words honest assessment","icon":"check|triangle|arrow|warning|circle|star","newStatus":"building|moved up|consolidating|ready to move|maintaining|reduce","recommendation":"optional progression suggestion","targetWeight":"recommended weight for next session e.g. 49kg or BW","targetReps":"recommended reps for next session e.g. 12x3 or 15x3"}],"summary":"2-3 sentences honest overall assessment — speak like a mate who trains with them","nextSession":"one sentence — specific focus for next session, warm and direct"}';
                      // Build previous session feedback context including accept/decline decisions
                      var prevSfbKey = activeTab + "_" + day;
                      var prevSfb = sessionFeedback ? sessionFeedback[prevSfbKey] : null;
                      var prevSfbCtx = "";
                      if (prevSfb && prevSfb._generatedAt && prevSfb.exercises) {
                        // Check if this is a re-run on same week (data was corrected)
                        var isReRun = false;
                        if (prevSfb.exercises && prevSfb.exercises.length > 0) {
                          for (var rri = 0; rri < prevSfb.exercises.length; rri++) {
                            var pfbEx = prevSfb.exercises[rri];
                            var matchEx = exList.find(function(e) { return e.name === pfbEx.name; });
                            if (matchEx) {
                              var matchLatest = matchEx.prog && matchEx.prog.length > 0 ? matchEx.prog[matchEx.prog.length - 1] : null;
                              // Compare current data vs what feedback was based on — if different, data was corrected
                              if (matchLatest && pfbEx.verdict) {
                                var curDataStr = matchLatest.w + " " + matchLatest.r;
                                // Check if the previous feedback's verdict references different numbers
                                if (pfbEx._prevData && pfbEx._prevData !== curDataStr) { isReRun = true; break; }
                              }
                            }
                          }
                        }
                        // Also detect re-run by comparing previous week data — if the last feedback was generated this same week
                        var prevFbWeek = null;
                        if (exList[0] && exList[0].prog && exList[0].prog.length > 0) {
                          var latestProg = exList[0].prog[exList[0].prog.length - 1];
                          prevFbWeek = latestProg.wk;
                        }
                        if (prevSfb._feedbackWeek && prevSfb._feedbackWeek === prevFbWeek) { isReRun = true; }

                        if (isReRun) {
                          // Data was corrected — tell the AI to ignore previous feedback and use current data only
                          prevSfbCtx = "\nIMPORTANT: This is a RE-RUN of feedback because the user corrected their logged data. Previous feedback was based on INCORRECT data and should be IGNORED. Base your feedback ONLY on the current exercise data shown above. Compare the current week's data against the PREVIOUS WEEK only (the second-to-last entry in each exercise history). Do not reference or repeat anything from the previous feedback.";
                          // Still include user decisions that may still be relevant
                          var decisionLines = prevSfb.exercises.filter(function(pex) { return pex._decision; }).map(function(pex) {
                            return pex.name + ": " + pex._decision + (pex._userNote ? " — reason: " + pex._userNote : "");
                          });
                          if (decisionLines.length > 0) {
                            prevSfbCtx += "\nHowever, these user decisions on progression preferences are still valid: " + decisionLines.join("; ");
                          }
                        } else {
                          var decisionLines = prevSfb.exercises.filter(function(pex) { return pex._decision; }).map(function(pex) {
                            return pex.name + ": " + pex._decision + (pex._userNote ? " — reason: " + pex._userNote : "") + (pex.recommendation ? " (recommendation was: " + pex.recommendation + ")" : "");
                          });
                          var prevSfbThread = "";
                          if (prevSfb._thread && prevSfb._thread.length > 0) {
                            prevSfbThread = "\nConversation on that feedback:\n" + prevSfb._thread.map(function(m) { return (m.role === "user" ? "User" : "Companion") + ": " + m.text; }).join("\n") + "\nRespect what they pushed back on, build on what they agreed with.";
                          } else if (prevSfb._comment) {
                            prevSfbThread = "\nUser responded: \"" + prevSfb._comment + "\"";
                          }
                          prevSfbCtx = "\nPrevious session feedback (" + prevSfb._generatedAt + "): Summary: " + (prevSfb.summary || "") + ". Next session focus: " + (prevSfb.nextSession || "") + "." + (decisionLines.length > 0 ? "\nUser decisions on recommendations: " + decisionLines.join("; ") + ".\nRESPECT DECLINED DECISIONS: If the user declined a recommendation, do NOT repeat the same suggestion. Consider their reason and adapt your advice accordingly. If they declined a weight increase, they may have a good reason — acknowledge it." : "") + prevSfbThread + "\nBuild on what changed since.";
                        }
                      }
                      var prompt = "You are the user's Lifecare Companion — a trusted, knowledgeable friend reviewing " + day + "'s session for " + (prof.name || "user") + " (" + (prof.bodyType || "") + "). Week " + currentWeek + " of their programme.\nIMPORTANT: This feedback is ONLY for " + (prof.name || activeTab.toUpperCase()) + ". Do NOT reference or include data, notes, or exercises from any other user. Address ONLY " + (prof.name || activeTab.toUpperCase()) + " throughout.\n\n" +
                        "COMMUNICATION STYLE: Imagine you're on a video call with your friend, specifically about this training session. You're a knowledgeable mate who knows a lot about strength training — not a PT writing a session report. Be pragmatic, warm, non-judgemental and direct. Give your honest opinions based on experience. NEVER be preachy or lecture them about consistency. If they had a rough session, assume there was a good reason. Instead of criticising, show how a small adjustment would help next time. Frame every improvement as a choice they can make, not a standard they failed. If someone is holding weight deliberately, respect that — they know their body.\n\n" +
                        TONE_RULES + getMoodContext(userMood) + "\n\n" +
                        "Exercises: " + daySummary + "\n" +
                        (function(){ var hp = p.healthProfile; var mn = ""; if (p.meds && p.meds.length > 0) mn = "Meds: " + p.meds.filter(function(m){return m.active;}).map(function(m){return m.name+" "+(m.dose||m.dosage||"");}).join(", ") + ". "; var bl = ""; if (p.bloods && p.bloods.length > 0) { var lb = p.bloods[p.bloods.length-1]; bl = "Latest bloods(" + lb.date + "): " + Object.entries(lb.tests).map(function(e){return e[0]+"="+e[1];}).join(", ") + ". "; } return (hp ? "Health: " + hp + ". " : "") + mn + bl; })() +
                        (function(){ var bc = ""; if (p.body) { var bk = Object.keys(p.body); bk.forEach(function(k) { var arr = p.body[k]; if (arr && arr.length > 0) bc += k + ":" + arr[arr.length-1].v + " "; }); if (bc) bc = "Body comp: " + bc + ". "; } return bc; })() +
                        (function(){ var mc = ""; if (p.measurements && p.measurements.length > 0) { var lm = p.measurements[p.measurements.length-1]; mc = "Measurements: " + Object.entries(lm).filter(function(e){return e[0]!=="date"&&e[0]!=="week";}).map(function(e){return e[0]+"="+e[1];}).join(", ") + ". "; } return mc; })() +
                        (function(){ var ac = ""; if (p.activity && p.activity.length > 0) { ac = "Recent activity: " + p.activity.slice(-3).map(function(a){return a.date+": "+(a.steps||"")+"steps "+(a.activity||"");}).join(", ") + ". "; } return ac; })() +
                        getOnboardingCtx(activeTab) + prevSfbCtx + getCrossSectionCtx(activeTab, "session") + "\n\n" +
                        "DATA & PROGRESSION RULES:\n" +
                        "1) USE THE LATEST LOGGED DATA AND HISTORY for each exercise — this is the actual recorded data. Do NOT use card display values which may reflect targets, not actuals. If notes mention holding, injury, pain, protection, concern, or any reason for caution, respect that decision and do NOT recommend increasing weight. A deliberate hold means MAINTAINING status, not building. If a hold has lasted several weeks and notes suggest recovery, you MAY gently suggest a cautious attempt, but acknowledge the concern.\n" +
                        "2) If current autoStatus seems wrong based on data and notes, set newStatus to what it SHOULD be and explain why in the verdict.\n" +
                        "3) Be genuinely honest — if someone is sandbagging, say so warmly. If they should push harder, encourage it like a mate would.\n" +
                        "4) PROGRESSION: Each exercise has [PROGRESSION RULES]. Follow them exactly. If rules say build to 15 reps before increasing weight, do NOT recommend weight increase at 12 reps — that is BUILDING status. Only recommend weight increase when the rep target is met for two consecutive sessions.\n" +
                        "5) STATUS RULES: Default target is 15x3 unless rules state otherwise. Two consecutive sessions hitting target = ready to move (star). First time hitting target = consolidating (arrow). Below target = building (arrow). Weight increase = moved up (triangle). Holding deliberately = maintaining (circle). Dropped = reduce (warning).\n" +
                        "6) Max 25 words per verdict. Be specific not generic.\n" +
                        "7) QUALITY TRACKING: Each exercise has [QUALITY] data — Full Range (or Completed in One for cardio) and Good Form toggles. 'Working Towards' means they are still developing that aspect. CRITICAL: If Full Range is 'Working Towards', do NOT recommend increasing weight — prioritise full range of motion with controlled 3-second eccentric tempo first. If Good Form is 'Working Towards', acknowledge their honesty and encourage form focus. Only recommend weight increases when BOTH quality indicators are 'Good' AND rep targets are met. Praise honesty when someone marks Working Towards — it shows self-awareness.\n\n" +
                        "Return ONLY valid JSON: " + jsonFormat;
                      var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2500, messages: [{ role: "user", content: prompt }] }) });
                      var result = await resp.json(); var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
                      if (result.stop_reason === "max_tokens") throw new Error("Feedback was cut off before it finished — please press the button again");
                      var txt = ""; if (result.content) { for (var ci = 0; ci < result.content.length; ci++) { if (result.content[ci].text) txt += result.content[ci].text; } }
                      if (!txt) throw new Error("No feedback came back — please press the button again");
                      if (txt) { var fb = JSON.parse(txt.replace(/```json|```/g, "").trim()); fb._generatedAt = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
                        // Store current week and data snapshot for re-run detection
                        var fbWeekNum = exList[0] && exList[0].prog && exList[0].prog.length > 0 ? exList[0].prog[exList[0].prog.length - 1].wk : null;
                        fb._feedbackWeek = fbWeekNum;
                        fb._feedbackFor = activeTab;
                        if (fb.exercises) { fb.exercises.forEach(function(fbEx) { var srcEx = exList.find(function(e) { return e.name === fbEx.name; }); if (srcEx) { var srcLatest = srcEx.prog && srcEx.prog.length > 0 ? srcEx.prog[srcEx.prog.length - 1] : null; if (srcLatest) fbEx._prevData = srcLatest.w + " " + srcLatest.r; } }); }
                        if (fb.exercises && fb.exercises.length) { var ndF = JSON.parse(JSON.stringify(data)); var nF = 0; fb.exercises.forEach(function(fbEx) { var tgt = (ndF[activeTab].exercises[day] || []).find(function(e) { return sameExercise(e.name, fbEx.name); }); if (attachCompanion(tgt, fbEx, fb._generatedAt)) nF++; }); if (nF) await saveData(ndF); } // F11: keep it with the logged week
                        setSessionFeedback(Object.assign({}, sessionFeedback || {}, { [activeTab + "_" + day]: fb })); var sfUpdate = Object.assign({}, sessionFeedback || {}, { [activeTab + "_" + day]: fb }); await sSet("session_feedback_all", JSON.stringify(sfUpdate));
                        // Recommendations shown to user - they accept/decline individually
                        }
                    } catch(e) { setSessionFeedback(Object.assign({}, sessionFeedback || {}, { [activeTab + "_" + day]: { exercises: [], summary: window.isEnergyEmpty(e) ? window.energyEmptyMsg : "Error: " + String(e).substring(0, 100), nextSession: "" } })); }
                    setSessionFbLoading(false);
                  }} disabled={sessionFbLoading} style={{ width: "100%", padding: 12, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: sessionFbLoading ? "not-allowed" : "pointer", opacity: sessionFbLoading ? 0.7 : 1, background: sessionFbLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" }}>{sessionFbLoading ? <span>Generating <LoadingDots /></span> : "My Companion Session Feedback"}</button>
                  <button onClick={function(){setFbExpanded(!fbExpanded);}} style={{width:"100%",padding:6,background:"none",border:"1px solid #e2e8f0",borderRadius:6,fontSize:11,color:"#475569",cursor:"pointer",marginTop:4}}>{fbExpanded ? "▲ Hide Feedback" : "▼ Show Feedback"}</button>
                  {fbExpanded && sessionFeedback && sessionFeedback[activeTab + "_" + day] && (<div style={{ marginTop: 10 }}>
                    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 8 }}>
                    {sessionFeedback[activeTab + "_" + day]._generatedAt && <div style={{ padding: "6px 14px", background: "#f8fafc", fontSize: 10, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Generated {sessionFeedback[activeTab + "_" + day]._generatedAt} for {isJC ? "JC" : "Becks"}</div>}
                    <div style={{ padding: "8px 14px", borderBottom: "1px solid #e2e8f0" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 14 }}>🏋️</span><span style={{ fontSize: 11, fontWeight: 700, color: "#1e3a5f" }}>Session Companion Check-in</span></div></div>
                    {sessionFeedback[activeTab + "_" + day].summary && (<div style={{ padding: "12px 14px", borderBottom: sessionFeedback[activeTab + "_" + day].nextSession ? "1px solid #e2e8f0" : "none" }}><div style={{ fontSize: 12, color: "#334155", lineHeight: 1.5 }}>{sessionFeedback[activeTab + "_" + day].summary}</div></div>)}
                    {sessionFeedback[activeTab + "_" + day].nextSession && <div style={{ padding: "12px 14px" }}><div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af" }}>Next session</div><div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>★ {sessionFeedback[activeTab + "_" + day].nextSession}</div></div>}
                    </div>
                    {sessionFeedback[activeTab + "_" + day].exercises && (function() { var decKey2 = activeTab + "_" + day; var totalRecs2 = sessionFeedback[decKey2].exercises.filter(function(ex){return ex.newStatus||ex.recommendation;}).length; var decidedCount2 = sessionFeedback[decKey2].exercises.filter(function(ex){return ex._decision;}).length; var pendingCount2 = totalRecs2 - decidedCount2; return (<div><button onClick={function(){setDecisionsExpanded(function(prev){return Object.assign({},prev,{[decKey2]:!prev[decKey2]});});}} style={{width:"100%",padding:"8px 12px",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,fontSize:11,fontWeight:600,color:"#475569",cursor:"pointer",marginTop:8,marginBottom:decisionsExpanded[decKey2]?6:0,textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>{decisionsExpanded[decKey2]?"▲":"▼"} Exercise Feedback{totalRecs2>0?" & Recommendations":""}</span>{totalRecs2>0&&pendingCount2>0?<span style={{fontSize:9,background:"#fff7ed",color:"#9a3412",padding:"2px 8px",borderRadius:10,fontWeight:700}}>{pendingCount2} pending</span>:decidedCount2>0?<span style={{fontSize:9,background:"#e0f2fe",color:"#0c4a6e",padding:"2px 8px",borderRadius:10,fontWeight:700}}>All reviewed</span>:null}</button></div>); })()}
                    {decisionsExpanded[activeTab + "_" + day] && sessionFeedback[activeTab + "_" + day].exercises && sessionFeedback[activeTab + "_" + day].exercises.map(function(ex, ei) { return (<div key={ei} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid #f8fafc", alignItems: "center" }}><span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{fbIcon(ex.icon)}</span><div><div style={{ fontSize: 12, fontWeight: 700 }}>{ex.name}</div><div style={{ fontSize: 11, color: "#475569" }}>{ex.verdict}</div>{(ex.newStatus || ex.recommendation) && (<div id={"rec-" + ei + "-" + day} style={{ marginTop: 4, padding: 8, background: ex._decision === "accepted" ? "#e0f2fe" : ex._decision === "declined" ? "#f1f5f9" : "#fff7ed", borderRadius: 6, border: "1px solid " + (ex._decision === "accepted" ? "#86efac" : ex._decision === "declined" ? "#e2e8f0" : "#fed7aa") }}>
                      {ex._decision ? (<div style={{ fontSize: 11, fontWeight: 600, color: ex._decision === "accepted" ? "#0c4a6e" : "#475569", padding: 4 }}>{ex._decision === "accepted" ? "Accepted — " + ex.name + " updated" + (ex._userNote ? " — " + ex._userNote : "") : "Declined — no changes made" + (ex._userNote ? " — " + ex._userNote : "")}</div>) : (<div><div style={{ fontSize: 10, color: "#9a3412", fontWeight: 600, marginBottom: 4 }}>{ex.recommendation || ("Recommendation: " + ex.newStatus)}</div>
                      <div style={{marginTop:6,marginBottom:6}}><input id={"user-note-"+ei+"-"+day} placeholder="Add a note (optional)..." style={{width:"100%",padding:6,border:"1px solid #e2e8f0",borderRadius:4,fontSize:10,boxSizing:"border-box"}} /></div><div style={{ display: "flex", gap: 6 }}>
                        <button onClick={async function() {
                          var nd3 = JSON.parse(JSON.stringify(data));
                          var dayExs3 = nd3[activeTab].exercises[day] || [];
                          for (var di3 = 0; di3 < dayExs3.length; di3++) {
                            if (dayExs3[di3].name === ex.name) {
                              var latestProg3 = dayExs3[di3].prog && dayExs3[di3].prog.length > 0 ? dayExs3[di3].prog[dayExs3[di3].prog.length - 1] : null;
                              var origW = latestProg3 ? latestProg3.w : (dayExs3[di3].current || "");
                              var origR = latestProg3 ? latestProg3.r : (dayExs3[di3].reps || "");
                              dayExs3[di3]._from = origW + " " + origR;
                              dayExs3[di3].status = ex.newStatus;
                              var newW = ex.targetWeight || origW;
                              var newR = ex.targetReps || origR;
                              var isUserOverride = false;
                              if (userNote) {
                                var wM = userNote.match(/(\d+)\s*kg/i);
                                var rM = userNote.match(/(\d+)\s*(?:reps|x)/i);
                                if (wM || rM) {
                                  newW = wM ? wM[1] + "kg" : newW;
                                  newR = rM ? rM[1] + "x3" : newR;
                                  isUserOverride = true;
                                }
                                dayExs3[di3].notes = (dayExs3[di3].notes ? dayExs3[di3].notes + "; " : "") + "Wk" + currentWeek + " accepted: " + userNote;
                              }
                              dayExs3[di3].target = newW + " x " + newR;
                              dayExs3[di3].current = newW;
                              dayExs3[di3].reps = newR;
                              dayExs3[di3]._userOverride = isUserOverride;
                              break;
                            }
                          }
                          (function() { var ne = document.getElementById("user-note-"+ei+"-"+day); setCompanionDecision(dayExs3.find(function(e) { return sameExercise(e.name, ex.name); }), "accepted", ne ? ne.value : "", ex); })(); // F11
                          await saveData(nd3);
                          var el = document.getElementById("rec-" + ei + "-" + day);
                          var noteEl = document.getElementById("user-note-"+ei+"-"+day); var userNote = noteEl ? noteEl.value.trim() : ""; ex._decision = "accepted"; ex._userNote = userNote;  if (userNote) { var exRef = nd3[activeTab].exercises[day]; if (exRef && exRef[di3]) { exRef[di3].notes = (exRef[di3].notes ? exRef[di3].notes + "; " : "") + "Wk" + currentWeek + " accepted: " + userNote; } } var sfbKey = activeTab + "_" + day; var curFb = sessionFeedback[sfbKey]; if (curFb && curFb.exercises) { curFb.exercises[ei]._decision = "accepted"; setSessionFeedback(Object.assign({}, sessionFeedback)); sSet("session_feedback_all", JSON.stringify(Object.assign({}, sessionFeedback))); } if (el) { el.style.background = "#e0f2fe"; el.style.borderColor = "#86efac"; setPlainNote(el, "\u2705 Accepted — " + ex.name + " updated to " + ex.newStatus + ". Activity updated.", { fontSize: "11px", color: "#0c4a6e", fontWeight: "600", padding: "4px" }); }
                        }} style={{ padding: "5px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Accept</button>
                        <button onClick={function() {
                          var el = document.getElementById("rec-" + ei + "-" + day);
                          var noteEl2 = document.getElementById("user-note-"+ei+"-"+day); var userNote2 = noteEl2 ? noteEl2.value.trim() : ""; ex._decision = "declined"; ex._userNote = userNote2;
                          var nd4 = JSON.parse(JSON.stringify(data));
                          var dayExs4 = nd4[activeTab].exercises[day] || [];
                          for (var di4 = 0; di4 < dayExs4.length; di4++) {
                            if (dayExs4[di4].name === ex.name) {
                              var latestProg4 = dayExs4[di4].prog && dayExs4[di4].prog.length > 0 ? dayExs4[di4].prog[dayExs4[di4].prog.length - 1] : null;
                              var origW4 = latestProg4 ? latestProg4.w : (dayExs4[di4].current || "");
                              var origR4 = latestProg4 ? latestProg4.r : (dayExs4[di4].reps || "");
                              dayExs4[di4]._from = origW4 + " " + origR4;
                              var isUserOverride4 = false;
                              if (userNote2) {
                                var wM2 = userNote2.match(/(\d+)\s*kg/i);
                                var rM2 = userNote2.match(/(\d+)\s*(?:reps|x)/i);
                                if (wM2 || rM2) {
                                  var nW2 = wM2 ? wM2[1] + "kg" : origW4;
                                  var nR2 = rM2 ? rM2[1] + "x3" : origR4;
                                  dayExs4[di4].target = nW2 + " x " + nR2;
                                  dayExs4[di4].current = nW2;
                                  dayExs4[di4].reps = nR2;
                                  isUserOverride4 = true;
                                }
                                dayExs4[di4].notes = (dayExs4[di4].notes ? dayExs4[di4].notes + "; " : "") + "Wk" + currentWeek + " declined: " + userNote2;
                              } else {
                                dayExs4[di4].current = origW4;
                                dayExs4[di4].reps = origR4;
                                delete dayExs4[di4].target;
                              }
                              dayExs4[di4]._userOverride = isUserOverride4;
                              break;
                            }
                          }
                          setCompanionDecision(dayExs4.find(function(e) { return sameExercise(e.name, ex.name); }), "rejected", userNote2, ex); // F11
                          saveData(nd4);
                          var sfbKey2 = activeTab + "_" + day; var curFb2 = sessionFeedback[sfbKey2]; if (curFb2 && curFb2.exercises) { curFb2.exercises[ei]._decision = "declined"; setSessionFeedback(Object.assign({}, sessionFeedback)); sSet("session_feedback_all", JSON.stringify(Object.assign({}, sessionFeedback))); } if (el) { el.style.background = "#f1f5f9"; el.style.borderColor = "#e2e8f0"; setPlainNote(el, "\u21a9 Declined — no changes made to Activity.", { fontSize: "11px", color: "#475569", padding: "4px" }); }
                        }} style={{ padding: "5px 14px", background: "#e2e8f0", color: "#475569", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Decline</button>
                      </div></div>)}
                    </div>)}
                    <div style={{textAlign:"right",marginTop:4}}><button onClick={async function(){if(!confirm("Remove "+ex.name+" from "+day+"?"))return;var nd=JSON.parse(JSON.stringify(data));var _rmIdx=nd[activeTab].exercises[day].findIndex(function(e){return e.name===ex.name;});if(_rmIdx<0){setFormMsg("Could not find "+ex.name+" on "+day);setTimeout(function(){setFormMsg("");},3000);return;}nd[activeTab].exercises[day].splice(_rmIdx,1);await saveData(nd);regenerateSessionGuides(activeTab,day,nd);}} style={{...btnDelete,fontSize:9,background:"#fee2e2",color:"#b91c1c",border:"none"}}>🗑 remove</button></div></div></div>); })}
                    {renderThread(sessionFeedback[activeTab + "_" + day], "session", activeTab + "-" + day, function(updatedFb) { updateSessionFb(updatedFb, activeTab + "_" + day); }, activeTab + "_" + day)}
                  </div>)}
                </div>
                </div>

                </div>)}
                {/* FEEDBACK TAB */}
                
                
                
                {/* SETTINGS TAB */}
                
              </div>
            </div>);
          })}
          
          
        </div>); }
