import { calcWeek } from "../lib/utils.js";
import { btnAction, btnActionLg, btnClose, btnDelete, btnEdit, btnP, btnS, inputStyle, labelStyle } from "../constants/styles.js";
import { handleApiError } from "../lib/api.js";
import { BodyCard, FullChart } from "../components/charts.jsx";
import { TONE_RULES } from "../constants/tone.js";
import { getMoodContext } from "../lib/aiContext.js";
import { sSet } from "../lib/storage.js";
import React from "react";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function BodySection({ ctx }) {
  const {
    accent, accentBorder, accentLight, accentMid, activeTab, addMeasName, addMeasOpen, bodyFbAll,
    bodyFbExpanded, bodyFbLoading, bodyFeedback, bodyInputs, bodyMetricOpen, bodyMetricShowAll, bodyView, btnST,
    data, editMeasKey, editMeasName, getCrossSectionCtx, getOnboardingCtx, idealSt, isJC, measFbAll,
    measFbExpanded2, measFbLoading, measFeedback, measLogInputs, measLogKey, measMetricOpen, measMetricShowAll, p,
    renderThread, saveBodyComp, saveData, setAddMeasName, setAddMeasOpen, setBodyFbExpanded, setBodyFbLoading, setBodyFeedback,
    setBodyInputs, setBodyMetricOpen, setBodyMetricShowAll, setBodyView, setEditMeasKey, setEditMeasName, setFormMsg, setMeasFbExpanded2,
    setMeasFbLoading, setMeasFeedback, setMeasLogInputs, setMeasLogKey, setMeasMetricOpen, setMeasMetricShowAll, setShowBodyForm, showBodyForm,
    updateBodyFb, updateMeasFb, userMood, weekLabel, wt, wtDelta, wtSign, wtStr
  } = ctx;

  return (
<div>
          {/* BODY COMPOSITION CARD */}
          <div style={{ marginBottom: 16 }}>
            {/* Week header — centred like Eating */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ width: 36 }}></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800 }}>Week {calcWeek(data.config.trainingStart)}</div><div style={{ fontSize: 10, color: "#64748b" }}>{weekLabel}</div></div>
              <div style={{ width: 36 }}></div>
            </div>
            <div style={{ display: "flex", gap: 0, background: accentMid, borderRadius: "8px 8px 0 0", padding: 2 }}>
              {[{ k: "data", l: "Weigh In" }, { k: "measurements", l: "Measurements" }].map(function(tab) {
                return (<button key={tab.k} onClick={function() { setBodyView(tab.k); setShowBodyForm(false); setBodyMetricOpen(null); setMeasMetricOpen(null); setMeasLogKey(null); setEditMeasKey(null); setAddMeasOpen(false); }} style={{ flex: 1, padding: "6px 0", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: bodyView === tab.k ? "#fff" : "transparent", color: bodyView === tab.k ? "#0f172a" : "rgba(255,255,255,0.7)" }}>{tab.l}</button>);
              })}
            </div>
            <div style={{ background: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #e2e8f0", borderTop: "none", padding: 12 }}>
              {bodyView === "data" && (<div>
          {showBodyForm && (<div style={{ background: "#fff", borderRadius: 12, border: "2px solid " + accent, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Body Composition</div>
            <div style={{ marginBottom: 10 }}><label style={labelStyle}>Week</label><input type="number" value={bodyInputs.week} onChange={e => setBodyInputs(q => ({ ...q, week: e.target.value }))} style={{ ...inputStyle, width: 80 }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["weight","Weight (stone)"],["bodyFat","Body Fat %"],["muscleMass","Muscle Mass"],["muscleRate","Muscle Rate %"],["skeletalMuscle","Skeletal Muscle %"],["visceralFat","Visceral Fat"],["subcutFat","Subcut Fat %"],["bmr","BMR (kcal)"],["bodyWater","Body Water %"],["boneMass","Bone Mass"],["bodyAge","Body Age"],["bmi","BMI"]].map(([k,l]) => (<div key={k}><label style={labelStyle}>{l}</label><input value={bodyInputs[k]} onChange={e => setBodyInputs(q => ({ ...q, [k]: e.target.value }))} style={inputStyle} /></div>))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={saveBodyComp} style={{ ...btnP(!!bodyInputs.week), flex: 1 }}>Save</button><button onClick={() => setShowBodyForm(false)} style={btnS}>Cancel</button></div>
          </div>)}
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>My Body Stats</span><div style={{ display: "flex", gap: 4 }}><button onClick={() => { setShowBodyForm(true); setBodyInputs({ weight: "", bodyFat: "", muscleMass: "", muscleRate: "", skeletalMuscle: "", visceralFat: "", subcutFat: "", bmr: "", bodyWater: "", boneMass: "", bodyAge: "", bmi: "", week: String(calcWeek(data.config.trainingStart)) }); }} style={btnAction}>📋 Record</button><label style={{...btnAction, display: "inline-flex"}}>📷 Upload<input type="file" data-share="body" accept="image/*" onChange={async function(e) {
                var file = e.target.files ? e.target.files[0] : null;
                if (!file) return;
                setFormMsg("Reading image...");
                try {
                  var rawB64 = await new Promise(function(res, rej) { var r = new FileReader(); r.onload = function() { res(r.result); }; r.onerror = function() { rej("fail"); }; r.readAsDataURL(file); });
                  var b64 = await new Promise(function(resolve) {
                    var img = new Image();
                    img.onload = function() {
                      var maxD = 800, w = img.width, h = img.height;
                      if (w > maxD || h > maxD) { if (w > h) { h = Math.round(h * maxD / w); w = maxD; } else { w = Math.round(w * maxD / h); h = maxD; } }
                      var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
                      cv.getContext("2d").drawImage(img, 0, 0, w, h);
                      resolve(cv.toDataURL("image/jpeg", 0.7).split(",")[1]);
                    };
                    img.src = rawB64;
                  });
                  var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }, { type: "text", text: 'Extract body comp values from this Fitdays screenshot. Return ONLY JSON. WEIGHT: The Fitdays screen shows weight as stones and pounds like 14 6.8 meaning 14st 6.8lb. Return the EXACT raw value as shown combining stones and pounds with a dot: 14st 6.8lb becomes 14.68, 14st 4.9lb becomes 14.49, 15st 0.3lb becomes 15.03. Do NOT convert or calculate - just read the digits and combine them. All other values as numbers exactly as shown on screen: {"weight":"14.579","bodyFat":"25.8","muscleMass":"","muscleRate":"","skeletalMuscle":"","visceralFat":"","subcutFat":"","bmr":"","bodyWater":"","boneMass":"","bodyAge":"","bmi":""}' }] }] }) });
                  var result = await resp.json();
                  var apiErr = handleApiError(result);
                  if (apiErr) { setFormMsg("API: " + apiErr); setTimeout(function() { setFormMsg(""); }, 8000); return; }
                  var txt = "";
                  if (result.content) { for (var ci = 0; ci < result.content.length; ci++) { if (result.content[ci].text) txt = txt + result.content[ci].text; } }
                  if (txt) {
                    try {
                      var parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
                      parsed.week = String(calcWeek(data.config.trainingStart));
                      setBodyInputs(function(prev) { return Object.assign({}, prev, parsed); });
                      setShowBodyForm(true);
                      setFormMsg("✓ Values extracted — review and save");
                    } catch(pe) { setFormMsg("Parse error: " + txt.substring(0, 80)); setTimeout(function() { setFormMsg(""); }, 8000); }
                  } else { setFormMsg("No data in response: " + JSON.stringify(result).substring(0, 100)); setTimeout(function() { setFormMsg(""); }, 8000); }
                } catch(err) { setFormMsg(window.aiErrorMsg(err)); setTimeout(function() { setFormMsg(""); }, 8000); }
                setTimeout(function() { setFormMsg(""); }, 5000);
                e.target.value = "";
              }} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 }} /></label></div></div>
          <div style={{ background: accentLight, borderRadius: 8, padding: 12, border: "1px solid " + accentBorder }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <BodyCard label="Weight" value={wtStr} rating="High" trend={wtDelta ? (wtSign === "-" ? "-" : "+") + wtDelta.split("lb")[0] + "lb" : ""} onEye={() => { setBodyMetricShowAll(false); setBodyMetricOpen(bodyMetricOpen === "weight" ? null : "weight"); }} eyeOpen={bodyMetricOpen === "weight"} />
            <BodyCard label="Body Fat %" value={p.body.bodyFat?.[p.body.bodyFat.length-1]?.v} rating={isJC ? "Acceptable" : "Too High"} onEye={() => { setBodyMetricShowAll(false); setBodyMetricOpen(bodyMetricOpen === "bodyFat" ? null : "bodyFat"); }} eyeOpen={bodyMetricOpen === "bodyFat"} />
            <BodyCard label="Muscle Mass" value={p.body.muscleMass?.[p.body.muscleMass.length-1]?.v} rating="Excellent" onEye={() => { setBodyMetricShowAll(false); setBodyMetricOpen(bodyMetricOpen === "muscleMass" ? null : "muscleMass"); }} eyeOpen={bodyMetricOpen === "muscleMass"} />
            <BodyCard label="Muscle Rate %" value={p.body.muscleRate?.[p.body.muscleRate.length-1]?.v} rating="Excellent" onEye={() => { setBodyMetricShowAll(false); setBodyMetricOpen(bodyMetricOpen === "muscleRate" ? null : "muscleRate"); }} eyeOpen={bodyMetricOpen === "muscleRate"} />
            <BodyCard label="Visceral Fat" value={p.body.visceralFat?.[p.body.visceralFat.length-1]?.v} rating={isJC ? "Standard" : "High"} onEye={() => { setBodyMetricShowAll(false); setBodyMetricOpen(bodyMetricOpen === "visceralFat" ? null : "visceralFat"); }} eyeOpen={bodyMetricOpen === "visceralFat"} />
            <BodyCard label="Subcut Fat %" value={p.body.subcutFat?.[p.body.subcutFat.length-1]?.v} rating="High" onEye={() => { setBodyMetricShowAll(false); setBodyMetricOpen(bodyMetricOpen === "subcutFat" ? null : "subcutFat"); }} eyeOpen={bodyMetricOpen === "subcutFat"} />
            <BodyCard label="Body Water %" value={p.body.bodyWater?.[p.body.bodyWater.length-1]?.v} rating={isJC ? "Standard" : "Excellent"} onEye={() => { setBodyMetricShowAll(false); setBodyMetricOpen(bodyMetricOpen === "bodyWater" ? null : "bodyWater"); }} eyeOpen={bodyMetricOpen === "bodyWater"} />
            <BodyCard label="Bone Mass" value={p.body.boneMass?.[p.body.boneMass.length-1]?.v} rating={isJC ? "Standard" : "Excellent"} onEye={() => { setBodyMetricShowAll(false); setBodyMetricOpen(bodyMetricOpen === "boneMass" ? null : "boneMass"); }} eyeOpen={bodyMetricOpen === "boneMass"} />
            <BodyCard label="BMR (kcal)" value={p.body.bmr?.[p.body.bmr.length-1]?.v} rating={isJC ? "Excellent" : ""} onEye={() => { setBodyMetricShowAll(false); setBodyMetricOpen(bodyMetricOpen === "bmr" ? null : "bmr"); }} eyeOpen={bodyMetricOpen === "bmr"} />
            <BodyCard label="Body Age" value={p.body.bodyAge?.[p.body.bodyAge.length-1]?.v} rating="High" trend={isJC ? "Actual: 49" : "Actual: 48"} onEye={() => { setBodyMetricShowAll(false); setBodyMetricOpen(bodyMetricOpen === "bodyAge" ? null : "bodyAge"); }} eyeOpen={bodyMetricOpen === "bodyAge"} />
          </div>
          {bodyMetricOpen && (function() { var metricLabels = { weight: "Weight (st)", bodyFat: "Body Fat %", muscleMass: "Muscle Mass", muscleRate: "Muscle Rate %", visceralFat: "Visceral Fat", subcutFat: "Subcut Fat %", bodyWater: "Body Water %", boneMass: "Bone Mass", bmr: "BMR (kcal)", bodyAge: "Body Age", skeletalMuscle: "Skeletal Muscle %" }; var mArr = p.body[bodyMetricOpen] || []; return (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>👁 {metricLabels[bodyMetricOpen] || bodyMetricOpen} Progress</div>
              <button onClick={() => setBodyMetricOpen(null)} style={{...btnClose, fontSize: 14, padding: "4px 8px"}}>✕</button>
            </div>
            {mArr.length === 0 && <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: 16 }}>No progress data yet</div>}
            {mArr.length > 0 && (<div>
              <div style={{ display: "flex", gap: 6, padding: "2px 0", fontSize: 9, color: "#94a3b8", fontWeight: 600 }}><span style={{ width: 40 }}>WK</span><span style={{ width: 60 }}>VALUE</span><span style={{ flex: 1 }}>NOTES</span><span style={{ width: 20 }}></span></div>
              {mArr.slice().reverse().slice(0, bodyMetricShowAll ? 999 : 4).map(function(entry, pi) { var ei = mArr.length - 1 - pi; return (<div key={pi} style={{ display: "flex", gap: 4, alignItems: "center", padding: "3px 0", borderBottom: "1px solid #f8fafc", fontSize: 11, overflow: "hidden" }}>
                <input defaultValue={entry.wk} onBlur={async function(e) { var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].body[bodyMetricOpen][ei].wk = parseInt(e.target.value) || entry.wk; await saveData(nd); }} style={{ width: 40, padding: "2px 4px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 11, textAlign: "center" }} />
                <input defaultValue={entry.v} onBlur={async function(e) { var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].body[bodyMetricOpen][ei].v = parseFloat(e.target.value) || entry.v; await saveData(nd); }} style={{ width: 60, padding: "2px 4px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 11 }} />
                <input defaultValue={entry.note || ""} onBlur={async function(e) { var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].body[bodyMetricOpen][ei].note = e.target.value; await saveData(nd); }} placeholder="..." style={{ flex: 1, minWidth: 0, padding: "2px 4px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 10, color: "#64748b" }} />
                <button onClick={async function() { if (!confirm("Delete this entry? This cannot be undone.")) return; var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].body[bodyMetricOpen].splice(ei, 1); await saveData(nd); setFormMsg("Removed"); setTimeout(function() { setFormMsg(""); }, 2000); }} style={{...btnDelete, fontSize: 11, minWidth: 24, flexShrink: 0}}>🗑 Del</button>
              </div>); })}
              {mArr.length > 4 && <button onClick={function() { setBodyMetricShowAll(!bodyMetricShowAll); }} style={{ width: "100%", padding: 6, background: "none", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, color: accent, cursor: "pointer", marginTop: 6 }}>{bodyMetricShowAll ? "▲ Show less" : "▼ View more (" + (mArr.length - 4) + " entries)"}</button>}
            </div>)}
            {(function() { var chartData = (bodyMetricOpen === "weight" ? wt : mArr).map(function(d) { return { wk: d.wk, v: typeof d.v === "number" ? d.v : parseFloat(d.v), note: d.note }; }).filter(function(d) { return !isNaN(d.v); }); var chartColors = { weight: accent, bodyFat: "#ef4444", muscleMass: "#22c55e", muscleRate: "#22c55e", visceralFat: "#f97316", subcutFat: "#f97316", bodyWater: "#3b82f6", boneMass: "#8b5cf6", bmr: "#3b82f6", bodyAge: "#d97706", skeletalMuscle: "#22c55e" }; var chartRefs = { weight: idealSt, bodyFat: isJC ? 18 : 28 }; if (chartData.length >= 2) return <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}><FullChart title={metricLabels[bodyMetricOpen] || bodyMetricOpen} series={[{ label: metricLabels[bodyMetricOpen] || bodyMetricOpen, color: chartColors[bodyMetricOpen] || accent, data: chartData }]} refLine={chartRefs[bodyMetricOpen]} height={120} /></div>; if (mArr.length > 0 && chartData.length < 2) return <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: 12 }}>Need 2+ entries for chart</div></div>; return null; })()}
          </div>); })()}
          </div>{/* end grey sub-container */}

          {/* Weigh-In Companion Feedback */}
          <div style={{ marginTop: 14 }}>
            <button onClick={async function() {
              setBodyFbLoading(true);
              try {
                var prof = p.profile || {};
                var bodySum = "Weight: " + (wt.length > 0 ? wt[wt.length-1].v + "st" : "none") + ", Body Fat: " + ((p.body.bodyFat||[]).length > 0 ? p.body.bodyFat[p.body.bodyFat.length-1].v + "pct" : "none") + ", Muscle Mass: " + ((p.body.muscleMass||[]).length > 0 ? p.body.muscleMass[p.body.muscleMass.length-1].v : "none") + ", Muscle Rate: " + ((p.body.muscleRate||[]).length > 0 ? p.body.muscleRate[p.body.muscleRate.length-1].v + "pct" : "none") + ", Visceral: " + ((p.body.visceralFat||[]).length > 0 ? p.body.visceralFat[p.body.visceralFat.length-1].v : "none") + ", Subcut Fat: " + ((p.body.subcutFat||[]).length > 0 ? p.body.subcutFat[p.body.subcutFat.length-1].v + "pct" : "none") + ", BMR: " + ((p.body.bmr||[]).length > 0 ? p.body.bmr[p.body.bmr.length-1].v : "none") + ", Body Water: " + ((p.body.bodyWater||[]).length > 0 ? p.body.bodyWater[p.body.bodyWater.length-1].v + "pct" : "none") + ", Bone Mass: " + ((p.body.boneMass||[]).length > 0 ? p.body.boneMass[p.body.boneMass.length-1].v : "none") + ", Body Age: " + ((p.body.bodyAge||[]).length > 0 ? p.body.bodyAge[p.body.bodyAge.length-1].v : "none") + ", Ideal: " + (prof.idealWeight || "unknown");
                var prevEntries = wt.length > 1 ? "Previous weights: " + wt.slice(-4).map(function(w) { return w.v + "st (Wk" + w.wk + ")"; }).join(", ") : "";
                var allBodyTrends = "";
                ["bodyFat","muscleRate","visceralFat","subcutFat","bmr","bodyWater","boneMass","bodyAge","skeletalMuscle","muscleMass"].forEach(function(mk) {
                  var arr = p.body[mk] || [];
                  if (arr.length >= 2) { allBodyTrends += mk + " trend: " + arr.slice(-4).map(function(e) { return e.v + " (Wk" + e.wk + ")"; }).join(" → ") + ". "; }
                });
                var measSum = Object.entries(p.measurements).map(function(pair) { var latest = pair[1].length > 0 ? pair[1][pair[1].length-1] : null; return latest ? pair[0] + ": " + latest.v + "cm Wk" + latest.wk : ""; }).filter(Boolean).join(", ");
                var prevBodyFb = bodyFeedback;
                var prevBodyCtx = "";
                if (prevBodyFb && prevBodyFb._at) {
                  prevBodyCtx = "\nPrevious body comp feedback (" + prevBodyFb._at + "): Wins: " + (prevBodyFb.wins || prevBodyFb.good || []).join("; ") + ". Tweaks: " + (prevBodyFb.tweaks || prevBodyFb.watch || []).join("; ") + ". Outlook: " + (prevBodyFb.outlook || "") + ".";
                  if (prevBodyFb._thread && prevBodyFb._thread.length > 0) {
                    prevBodyCtx += "\nConversation on that feedback:\n" + prevBodyFb._thread.map(function(m) { return (m.role === "user" ? "User" : "Companion") + ": " + m.text; }).join("\n") + "\nRespect what they pushed back on, build on what they agreed with.";
                  }
                  prevBodyCtx += "\nBuild on what changed since.";
                }
                var prompt = "You are the user's Lifecare Companion — a trusted, knowledgeable friend reviewing the FULL body composition AND measurement data for " + (prof.name || "user") + " (" + (prof.bodyType || "") + "). Week " + calcWeek(data.config.trainingStart) + " of their programme.\n\n" +
                  "COMMUNICATION STYLE: Imagine you're on a video call with your friend, specifically about their latest body data. You're a knowledgeable mate who knows a lot about body composition — not a clinician reading out results. Be pragmatic, warm, non-judgemental and direct. Give your honest opinions based on experience. NEVER be preachy. If a metric went the wrong way, assume there may be a good reason. Instead of criticising, show how small changes would accumulate over weeks to meaningful health outcomes. Frame every improvement as a choice they can make, not a standard they failed.\n\n" +
                  "DUAL FOCUS: Cover BOTH (1) weigh-in data — weight trends, body fat, muscle mass, visceral fat, BMR, body water, bone mass, body age AND (2) tape measurements — chest, waist, hips, arms, thighs, calves. Analyse changes vs previous readings and trajectory over time for both.\n\n" +
                  TONE_RULES + getMoodContext(userMood) + "\n\n" +
                  "CURRENT BODY COMP: " + bodySum + "\n" +
                  (prevEntries ? prevEntries + "\n" : "") +
                  (allBodyTrends ? "BODY TRENDS: " + allBodyTrends + "\n" : "") +
                  (measSum ? "MEASUREMENTS: " + measSum + "\n" : "") +
                  (function(){ var hp = p.healthProfile; var mn = ""; if (p.meds && p.meds.length > 0) mn = "Meds: " + p.meds.filter(function(m){return m.active;}).map(function(m){return m.name+" "+(m.dose||m.dosage||"");}).join(", ") + ". "; var bl = ""; if (p.bloods && p.bloods.length > 0) { var lb = p.bloods[p.bloods.length-1]; bl = "Latest bloods(" + lb.date + "): " + Object.entries(lb.tests).map(function(e){return e[0]+"="+e[1];}).join(", ") + ". "; } return (hp ? "Health: " + hp + ". " : "") + mn + bl; })() +
                  (function(){ var ec = ""; if (p.exercises) { var exDays = Object.keys(p.exercises); ec = "Exercise programme: " + exDays.map(function(d) { return d + ": " + p.exercises[d].map(function(e){ var lat = e.prog && e.prog.length > 0 ? e.prog[e.prog.length-1] : null; var ql = ""; if (lat) { var et = e.exType || "weights"; var fl = ["weights","bodyweight","timed_hold","stretching"].indexOf(et) >= 0 ? "FR" : "CIO"; ql = " [" + fl + ":" + (lat.fullRange === "good" ? "Good" : "WT") + ",GF:" + (lat.goodForm === "good" ? "Good" : "WT") + "]"; } return e.name + " " + e.current + " " + e.reps + " (" + e.status + ")" + ql;}).join(", "); }).join("; ") + ". "; } return ec; })() +
                  (function(){ var ac = ""; if (p.activity && p.activity.length > 0) { ac = "Recent activity: " + p.activity.slice(-5).map(function(a){return a.date+": "+(a.steps||"")+"steps "+(a.activity||"");}).join(", ") + ". "; } return ac; })() +
                  getOnboardingCtx(activeTab) + prevBodyCtx + getCrossSectionCtx(activeTab, "bodycomp") + "\n\n" +
                  "RULES FOR RESPONSE:\n" +
                  "1. 'wins': 2-3 things going well — cover BOTH body comp AND measurements. Reference actual numbers and week-on-week changes.\n" +
                  "2. 'tweaks': 1-2 constructive suggestions. NEVER say 'you need to fix this'. Instead: 'If you [specific action] over the next 4 weeks, expect to see [specific outcome]'. Translate into a real-world outcome they care about.\n" +
                  "3. 'outlook': One sentence — the honest but encouraging big picture trajectory.\n" +
                  "Keep it tight — similar length to the home page companion feedback. Quality over quantity.\n\n" +
                  "Return ONLY valid JSON: {\"wins\":[\"point\",\"point\"],\"tweaks\":[\"point\",\"point\"],\"outlook\":\"one sentence\"}";
                var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1200, messages: [{ role: "user", content: prompt }] }) });
                var result = await resp.json(); var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
                var txt = ""; if (result.content) { for (var ci = 0; ci < result.content.length; ci++) { if (result.content[ci].text) txt += result.content[ci].text; } }
                if (txt) { var bfParsed = JSON.parse(txt.replace(/```json|```/g, "").trim()); bfParsed._at = new Date().toLocaleString("en-GB"); bfParsed._when = new Date().toLocaleString("en-GB"); setBodyFeedback(bfParsed); sSet("body_feedback", JSON.stringify(Object.assign({}, bodyFbAll || {}, { [activeTab]: bfParsed }))); }
              } catch(e) { setBodyFeedback({ wins: [], tweaks: [window.isEnergyEmpty(e) ? window.energyEmptyMsg : "Error: " + String(e).substring(0, 80)], outlook: "" }); }
              setBodyFbLoading(false);
            }} disabled={bodyFbLoading} style={{ width: "100%", padding: 12, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: bodyFbLoading ? "not-allowed" : "pointer", background: bodyFbLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", marginBottom: 6 }}>{bodyFbLoading ? React.createElement("span", null, "Generating, please wait ", React.createElement("span", { className: "loading-dots", dangerouslySetInnerHTML: { __html: "<span>.</span><span>.</span><span>.</span>" } })) : "My Companion Body Feedback"}</button>
            <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>Reviews body comp and measurements — weight trends, body fat, muscle mass, tape measurements and more — cross-referenced with your eating, activity and health data.</div>
            {bodyFeedback && bodyFeedback._at && <button onClick={function(){ setBodyFbExpanded(!bodyFbExpanded); }} style={{ width: "100%", padding: 6, background: "none", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, color: "#64748b", cursor: "pointer", marginBottom: 6 }}>{bodyFbExpanded ? "▲ Hide Feedback" : "▼ Show Feedback"}</button>}
            {bodyFbExpanded && bodyFeedback && bodyFeedback._at && (function() { var bfb = bodyFeedback; return React.createElement("div", { style: { marginBottom: 10 } },
              React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" } },
                bfb._when && React.createElement("div", { style: { padding: "6px 14px", background: "#f8fafc", fontSize: 10, color: "#94a3b8", borderBottom: "1px solid #e2e8f0" } }, "Generated ", bfb._when, " for ", isJC ? "JC" : "Becks"),
                React.createElement("div", { style: { padding: "8px 14px", borderBottom: "1px solid #e2e8f0" } }, React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, React.createElement("span", { style: { fontSize: 14 } }, "⚖️"), React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: "#1e3a5f" } }, "Body Companion Check-in"))),
                React.createElement("div", { style: { padding: "12px 14px", borderBottom: "1px solid #e2e8f0" } },
                  React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#0c4a6e" } }, "What’s going well"),
                  (bfb.wins || bfb.good || []).map(function(w, i) { return React.createElement("div", { key: i, style: { fontSize: 12, color: "#334155", marginTop: 4 } }, "✓ ", w); })
                ),
                React.createElement("div", { style: { padding: "12px 14px", borderBottom: "1px solid #e2e8f0" } },
                  React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#92400e" } }, "Tweaks for next period"),
                  (bfb.tweaks || bfb.watch || []).map(function(t, i) { return React.createElement("div", { key: i, style: { fontSize: 12, color: "#334155", marginTop: 4 } }, "→ ", t); })
                ),
                React.createElement("div", { style: { padding: "12px 14px" } },
                  React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#1e40af" } }, "Body comp outlook"),
                  React.createElement("div", { style: { fontSize: 12, color: "#334155", marginTop: 4 } }, "★ ", bfb.outlook)
                )
              ),
              renderThread(bfb, "bodycomp", activeTab, updateBodyFb, activeTab)
            ); })()}
          </div>
              </div>)}
              {bodyView === "measurements" && (<div>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: "#0f172a" }}>My Body Measurements</div>
          <div style={{ background: accentLight, borderRadius: 8, padding: "4px 12px 12px", border: "1px solid " + accentBorder }}>
            {Object.entries(p.measurements).map(function(pair, mi) { var k = pair[0]; var d = pair[1]; var latest = d.length > 0 ? d[d.length - 1] : null; var prev = d.length > 1 ? d[d.length - 2] : null; var delta = (latest && prev && typeof latest.v === "number" && typeof prev.v === "number") ? (latest.v - prev.v).toFixed(1) : null; var measColors = ["#2563eb","#7c3aed","#059669","#d97706","#dc2626","#0891b2","#ec4899"]; return (<div key={k} style={{ padding: "10px 3px", borderBottom: mi < Object.entries(p.measurements).length - 1 ? "1px solid #e2e8f0" : "none", position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>{k.replace(/([A-Z])/g, " $1").replace(/^./, function(s){return s.toUpperCase();})} <span onClick={function(e) { e.stopPropagation(); setMeasMetricOpen(k); setEditMeasKey(k); setEditMeasName(k.replace(/([A-Z])/g, " $1").replace(/^./, function(s){return s.toUpperCase();})); }} style={{ fontSize: 9, color: "#94a3b8", cursor: "pointer" }}>✎</span>{d.some(function(e){ return !!e.img; }) && <span onClick={function(){ setMeasMetricOpen(k); setMeasMetricShowAll(true); }} style={{ fontSize: 9, color: "#16a34a", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 2 }} title="View photos">📷 {d.filter(function(e){ return !!e.img; }).length}</span>}</div>
                  <div style={{ color: "#0f172a", fontSize: 12, fontWeight: 500 }}>
                    {latest ? <><span>{latest.v}{typeof latest.v === "number" ? "cm" : ""}</span>{delta && <span style={{ fontSize: 10, color: parseFloat(delta) > 0 ? "#16a34a" : parseFloat(delta) < 0 ? "#dc2626" : "#64748b", marginLeft: 6 }}>{parseFloat(delta) > 0 ? "+" : ""}{delta}cm</span>}{latest.wk && <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 6 }}>Wk {latest.wk}</span>}</> : <span style={{ fontSize: 11, color: "#94a3b8" }}>No data yet</span>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, alignItems: "flex-end" }}>
                  <button onClick={function(){ if (measMetricOpen === k) { setMeasMetricOpen(null); setMeasLogKey(null); } else { setMeasMetricOpen(k); setMeasMetricShowAll(false); setMeasLogKey(null); } }} style={{ padding: "4px 8px", background: measMetricOpen === k ? "#1e3a5f" : "#f1f5f9", border: "1px solid " + (measMetricOpen === k ? "#1e3a5f" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", color: measMetricOpen === k ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", gap: 2, whiteSpace: "nowrap" }}>{measMetricOpen === k ? "✕ Progress" : "👁 Progress"}</button>
                  <button onClick={function(){ if (measLogKey === k) { setMeasLogKey(null); } else { setMeasMetricOpen(k); setMeasLogKey(k); setMeasLogInputs({ week: calcWeek(data.config.trainingStart), value: "", note: "", image: null }); } }} style={{ padding: "4px 8px", background: measLogKey === k ? "#1e3a5f" : "#f1f5f9", border: "1px solid " + (measLogKey === k ? "#1e3a5f" : "#e2e8f0"), borderRadius: 6, fontSize: 10, cursor: "pointer", fontWeight: 600, color: measLogKey === k ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", gap: 2, whiteSpace: "nowrap" }}>📋 Log</button>
                </div>
              </div>
              {measMetricOpen === k && (<div style={{ marginTop: 10, padding: 12, background: accentLight, borderRadius: 8, border: "1px solid " + accentBorder, width: "100%" }}>
                <button onClick={function(){ if (measLogKey === k) { setMeasLogKey(null); } else { setMeasLogKey(k); setMeasLogInputs({ week: calcWeek(data.config.trainingStart), value: "", note: "", image: null }); } }} style={btnActionLg}>📋 Log {k.replace(/([A-Z])/g, " $1").replace(/^./, function(s){return s.toUpperCase();})}</button>
                {measLogKey === k && (<div style={{ background: "#fff", borderRadius: 12, border: "2px solid " + accent, padding: 14, marginTop: 10, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 2 }}>{(p.profile && p.profile.name) || activeTab}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Log: {k.replace(/([A-Z])/g, " $1").replace(/^./, function(s){return s.toUpperCase();})}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Previous: {latest ? latest.v + "cm (Wk " + latest.wk + ")" : "No data"}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 2 }}>Week</label><input type="number" value={measLogInputs.week} onChange={function(e){ setMeasLogInputs(Object.assign({}, measLogInputs, { week: e.target.value })); }} style={{ width: 50, padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} /></div>
                    <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 2 }}>cm</label><input type="number" step="0.5" value={measLogInputs.value} onChange={function(e){ setMeasLogInputs(Object.assign({}, measLogInputs, { value: e.target.value })); }} style={{ width: 60, padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} placeholder={latest ? "was " + latest.v : "cm"} /></div>
                    <label style={{ padding: "4px 8px", background: measLogInputs.image ? "#dcfce7" : "#f1f5f9", border: "1px solid " + (measLogInputs.image ? "#86efac" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", color: measLogInputs.image ? "#16a34a" : "#94a3b8", display: "flex", alignItems: "center", gap: 2, alignSelf: "flex-end" }}>{measLogInputs.image ? "✓ Photo" : "📷"}<input type="file" accept="image/*" onChange={function(e) { var file = e.target.files[0]; if (!file) return; var reader = new FileReader(); reader.onload = function(ev) { setMeasLogInputs(Object.assign({}, measLogInputs, { image: ev.target.result })); }; reader.readAsDataURL(file); e.target.value = ""; }} style={{ display: "none" }} /></label>
                  </div>
                  {measLogInputs.image && (<div style={{ marginTop: 8, position: "relative", display: "inline-block" }}><img src={measLogInputs.image} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} /><button onClick={function() { setMeasLogInputs(Object.assign({}, measLogInputs, { image: null })); }} style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#dc2626", color: "#fff", border: "none", fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button></div>)}
                  <div style={{ marginTop: 8 }}><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 2 }}>Note</label><input type="text" value={measLogInputs.note} onChange={function(e){ setMeasLogInputs(Object.assign({}, measLogInputs, { note: e.target.value })); }} style={{ width: "100%", padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, boxSizing: "border-box" }} placeholder="optional" /></div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={async function(){ var wk = parseInt(measLogInputs.week); var v = parseFloat(measLogInputs.value); if (!wk || isNaN(v)) return; var nd = JSON.parse(JSON.stringify(data)); if (!nd[activeTab].measurements[k]) nd[activeTab].measurements[k] = []; var ei = nd[activeTab].measurements[k].findIndex(function(e){ return e.wk === wk; }); if (ei >= 0) { nd[activeTab].measurements[k][ei].v = v; if (measLogInputs.note) nd[activeTab].measurements[k][ei].note = measLogInputs.note; if (measLogInputs.image) nd[activeTab].measurements[k][ei].img = measLogInputs.image; } else { var newEntry = { wk: wk, v: v, note: measLogInputs.note || "" }; if (measLogInputs.image) newEntry.img = measLogInputs.image; nd[activeTab].measurements[k].push(newEntry); } nd[activeTab].measurements[k].sort(function(a,b){ return a.wk - b.wk; }); nd.config.week = calcWeek(nd.config.trainingStart); nd.config.lastUpdate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); await saveData(nd); setMeasLogKey(null); setFormMsg("✓ " + k.replace(/([A-Z])/g, " $1").replace(/^./, function(s){return s.toUpperCase();}) + " saved"); setTimeout(function(){ setFormMsg(""); }, 3000); }} style={{ ...btnP(!!measLogInputs.value), flex: 1 }}>Save</button>
                    <button onClick={function(){ setMeasLogKey(null); }} style={btnS}>Cancel</button>
                  </div>
                  <p style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", margin: "8px 0 0", fontStyle: "italic", lineHeight: 1.3 }}>Track accurate measurements for your companion to give you the most appropriate feedback</p>
                </div>)}
                <div style={{ marginTop: 16, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{k.replace(/([A-Z])/g, " $1").replace(/^./, function(s){return s.toUpperCase();})}</div>
                  </div>
                  {d.length === 0 && <div style={{ fontSize: 10, color: "#94a3b8" }}>No progression data yet</div>}
                  {d.length > 0 && (<div>
                    <div style={{ display: "flex", gap: 6, padding: "3px 0", marginBottom: 2, fontSize: 9, color: "#94a3b8", fontWeight: 600 }}><span style={{ width: 40 }}>WEEK</span><span style={{ width: 60 }}>CM</span><span style={{ flex: 1 }}>NOTES</span><span style={{ width: 20 }}></span></div>
                    {d.slice().reverse().slice(0, measMetricShowAll ? 999 : 4).map(function(entry, pi) { var ei = d.length - 1 - pi; return (<div key={pi}>
                      <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "3px 0", borderBottom: entry.img ? "none" : "1px solid #f8fafc", fontSize: 11, overflow: "hidden" }}>
                        <input defaultValue={entry.wk} onBlur={async function(e) { var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].measurements[k][ei].wk = parseInt(e.target.value) || entry.wk; await saveData(nd); }} style={{ width: 40, padding: "2px 4px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 11, textAlign: "center" }} />
                        <input defaultValue={entry.v} onBlur={async function(e) { var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].measurements[k][ei].v = parseFloat(e.target.value) || entry.v; await saveData(nd); }} style={{ width: 60, padding: "2px 4px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 11 }} />
                        <input defaultValue={entry.note || ""} onBlur={async function(e) { var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].measurements[k][ei].note = e.target.value; await saveData(nd); }} placeholder="..." style={{ flex: 1, minWidth: 0, padding: "2px 4px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 10, color: "#64748b" }} />
                        {entry.img && <span style={{ fontSize: 9, color: "#16a34a", flexShrink: 0 }}>📷</span>}
                        <button onClick={async function() { if (!confirm("Delete this measurement entry? This cannot be undone.")) return; var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].measurements[k].splice(ei, 1); await saveData(nd); setFormMsg("Removed"); setTimeout(function() { setFormMsg(""); }, 2000); }} style={{...btnDelete, fontSize: 11, minWidth: 24, flexShrink: 0}}>🗑 Del</button>
                      </div>
                      {entry.img && (<div style={{ padding: "4px 0 6px 44px", borderBottom: "1px solid #f8fafc" }}><img src={entry.img} onClick={function() { window.open(entry.img, "_blank"); }} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer" }} title="Click to view full size" /></div>)}
                    </div>); })}
                    {d.length > 4 && <button onClick={function() { setMeasMetricShowAll(!measMetricShowAll); }} style={{ width: "100%", padding: 6, background: "none", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, color: accent, cursor: "pointer", marginTop: 6 }}>{measMetricShowAll ? "▲ Show less" : "▼ View more (" + (d.length - 4) + " entries)"}</button>}
                  </div>)}
                  {(function() { var chartData = d.map(function(e) { return { wk: e.wk, v: typeof e.v === "number" ? e.v : parseFloat(e.v), note: e.note }; }).filter(function(e) { return !isNaN(e.v); }); if (chartData.length >= 2) return <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}><FullChart title={k.replace(/([A-Z])/g, " $1").replace(/^./, function(s){return s.toUpperCase();}) + " (cm)"} series={[{ label: k, color: measColors[mi % 7], data: chartData }]} height={120} /></div>; if (d.length > 0 && chartData.length < 2) return <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: 12 }}>Need 2+ entries for chart</div></div>; return null; })()}
                </div>
                <div style={{marginTop:12,paddingTop:8,borderTop:"1px solid #e2e8f0"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#0f172a",marginBottom:6}}>Measurement Settings</div>
                  {editMeasKey === k ? (<div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0", padding: 10, marginBottom: 6 }}>
                    <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 2 }}>Rename measurement</label>
                    <input type="text" value={editMeasName} onChange={function(e) { setEditMeasName(e.target.value); }} style={{ width: "100%", padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, boxSizing: "border-box", marginBottom: 6 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={async function() { var newKey = editMeasName.trim().toLowerCase().replace(/\s+(.)/g, function(m, c) { return c.toUpperCase(); }); if (!newKey || newKey === k) { setEditMeasKey(null); return; } var nd = JSON.parse(JSON.stringify(data)); if (nd[activeTab].measurements[newKey]) { setFormMsg("⚠️ Name already exists"); setTimeout(function() { setFormMsg(""); }, 3000); return; } nd[activeTab].measurements[newKey] = nd[activeTab].measurements[k]; delete nd[activeTab].measurements[k]; await saveData(nd); setEditMeasKey(null); setMeasMetricOpen(newKey); setFormMsg("✓ Renamed to " + editMeasName.trim()); setTimeout(function() { setFormMsg(""); }, 3000); }} style={{ ...btnP(!!editMeasName.trim()), flex: 1, fontSize: 11 }}>Save</button>
                      <button onClick={function() { setEditMeasKey(null); }} style={{...btnST, fontSize: 11}}>Cancel</button>
                    </div>
                  </div>) : (<div style={{display:"flex",gap:6}}>
                    <button onClick={function(){ setEditMeasKey(k); setEditMeasName(k.replace(/([A-Z])/g, " $1").replace(/^./, function(s){return s.toUpperCase();})); }} style={{...btnEdit,flex:1}}>✎ Edit</button>
                    <button onClick={async function(){ if (!confirm("Delete " + k.replace(/([A-Z])/g, " $1").replace(/^./, function(s){return s.toUpperCase();}) + " and all its data?")) return; var nd = JSON.parse(JSON.stringify(data)); delete nd[activeTab].measurements[k]; await saveData(nd); setMeasMetricOpen(null); setFormMsg("✓ Deleted"); setTimeout(function(){ setFormMsg(""); }, 2000); }} style={{...btnDelete,flex:1}}>🗑 Delete</button>
                  </div>)}
                </div>
              </div>)}
            </div>); })}
          </div>
                <div style={{ background: accentLight, borderRadius: 10, padding: 12, marginTop: 12, fontSize: 12, color: "#334155", lineHeight: 1.5, border: "1px solid #cbd5e1" }}>Re-check measurements every 4 weeks. Chest at nipple level. Waist at midpoint between lowest rib and hip bone.</div>

                <div style={{ marginTop: 12 }}>
                  {!addMeasOpen ? (<button onClick={function() { setAddMeasOpen(true); setAddMeasName(""); }} style={{...btnActionLg, width: "100%", justifyContent: "center"}}>+ Add Body Measurement</button>)
                  : (<div style={{ background: "#fff", borderRadius: 12, border: "2px solid " + accent, padding: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Add Body Measurement</div>
                    <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 2 }}>Measurement name</label><input type="text" value={addMeasName} onChange={function(e) { setAddMeasName(e.target.value); }} placeholder="e.g. Hips, Neck, Thigh" style={{ width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} /></div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={async function() { var name = addMeasName.trim().toLowerCase().replace(/\s+(.)/g, function(m, c) { return c.toUpperCase(); }); if (!name) return; var nd = JSON.parse(JSON.stringify(data)); if (!nd[activeTab].measurements) nd[activeTab].measurements = {}; if (nd[activeTab].measurements[name]) { setFormMsg("⚠️ " + addMeasName + " already exists"); setTimeout(function() { setFormMsg(""); }, 3000); return; } nd[activeTab].measurements[name] = []; await saveData(nd); setAddMeasOpen(false); setAddMeasName(""); setFormMsg("✓ " + addMeasName + " added"); setTimeout(function() { setFormMsg(""); }, 3000); }} style={{ ...btnP(!!addMeasName.trim()), flex: 1 }}>Add</button>
                      <button onClick={function() { setAddMeasOpen(false); setAddMeasName(""); }} style={btnS}>Cancel</button>
                    </div>
                    <p style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", margin: "8px 0 0", fontStyle: "italic" }}>Add any body part you'd like to track over time</p>
                  </div>)}
                </div>

          {/* Measurement Companion Feedback */}
          <div style={{ marginTop: 14 }}>
            <button onClick={async function() {
              setMeasFbLoading(true);
              try {
                var prof = p.profile || {};
                var measSum = Object.entries(p.measurements).map(function(pair) { var latest = pair[1].length > 0 ? pair[1][pair[1].length-1] : null; return latest ? pair[0] + ": " + latest.v + "cm Wk" + latest.wk : ""; }).filter(Boolean).join(", ");
                var measTrends = "";
                Object.entries(p.measurements).forEach(function(pair) {
                  if (pair[1].length >= 2) { measTrends += pair[0] + " trend: " + pair[1].slice(-4).map(function(e) { return e.v + "cm (Wk" + e.wk + ")"; }).join(" → ") + ". "; }
                });
                var bodySum = "Weight: " + (wt.length > 0 ? wt[wt.length-1].v + "st" : "none") + ", Body Fat: " + ((p.body.bodyFat||[]).length > 0 ? p.body.bodyFat[p.body.bodyFat.length-1].v + "pct" : "none") + ", Muscle Rate: " + ((p.body.muscleRate||[]).length > 0 ? p.body.muscleRate[p.body.muscleRate.length-1].v + "pct" : "none") + ", Visceral: " + ((p.body.visceralFat||[]).length > 0 ? p.body.visceralFat[p.body.visceralFat.length-1].v : "none");
                var prevMeasFb = measFeedback;
                var prevMeasCtx = "";
                if (prevMeasFb && prevMeasFb._at) {
                  prevMeasCtx = "\nPrevious measurement feedback (" + prevMeasFb._at + "): Wins: " + (prevMeasFb.wins || prevMeasFb.good || []).join("; ") + ". Tweaks: " + (prevMeasFb.tweaks || prevMeasFb.watch || []).join("; ") + ". Outlook: " + (prevMeasFb.outlook || "") + ".";
                  if (prevMeasFb._thread && prevMeasFb._thread.length > 0) {
                    prevMeasCtx += "\nConversation on that feedback:\n" + prevMeasFb._thread.map(function(m) { return (m.role === "user" ? "User" : "Companion") + ": " + m.text; }).join("\n") + "\nRespect what they pushed back on, build on what they agreed with.";
                  }
                  prevMeasCtx += "\nBuild on what changed since.";
                }
                var prompt = "You are the user's Lifecare Companion — a trusted, knowledgeable friend reviewing tape measurements for " + (prof.name || "user") + " (" + (prof.bodyType || "") + "). Week " + calcWeek(data.config.trainingStart) + " of their programme.\n\n" +
                  "COMMUNICATION STYLE: Imagine you're on a video call with your friend, specifically about their tape measurements. You're a knowledgeable mate who knows a lot about body recomposition — not someone reading out numbers from a clipboard. Be pragmatic, warm, non-judgemental and direct. Give your honest opinions based on experience. NEVER be preachy. If a measurement went the wrong way, assume there may be a good reason. Instead of criticising, show how the measurements connect to the bigger picture. Frame every change as information they can use, not a pass/fail.\n\n" +
                  "PRIMARY FOCUS: Tape measurements — bicep, forearm, calf, quad, chest, waist, shoulders. Analyse changes vs previous readings and trajectory over time. Consider what measurement changes tell us about body recomposition.\n\n" +
                  TONE_RULES + getMoodContext(userMood) + "\n\n" +
                  "CURRENT MEASUREMENTS: " + measSum + "\n" +
                  (measTrends ? "MEASUREMENT TRENDS: " + measTrends + "\n" : "") +
                  (bodySum ? "BODY COMP CONTEXT: " + bodySum + "\n" : "") +
                  (function(){ var hp = p.healthProfile; var mn = ""; if (p.meds && p.meds.length > 0) mn = "Meds: " + p.meds.filter(function(m){return m.active;}).map(function(m){return m.name+" "+(m.dose||m.dosage||"");}).join(", ") + ". "; var bl = ""; if (p.bloods && p.bloods.length > 0) { var lb = p.bloods[p.bloods.length-1]; bl = "Latest bloods(" + lb.date + "): " + Object.entries(lb.tests).map(function(e){return e[0]+"="+e[1];}).join(", ") + ". "; } return (hp ? "Health: " + hp + ". " : "") + mn + bl; })() +
                  (function(){ var ec = ""; if (p.exercises) { var exDays = Object.keys(p.exercises); ec = "Exercise programme: " + exDays.map(function(d) { return d + ": " + p.exercises[d].map(function(e){ var lat = e.prog && e.prog.length > 0 ? e.prog[e.prog.length-1] : null; var ql = ""; if (lat) { var et = e.exType || "weights"; var fl = ["weights","bodyweight","timed_hold","stretching"].indexOf(et) >= 0 ? "FR" : "CIO"; ql = " [" + fl + ":" + (lat.fullRange === "good" ? "Good" : "WT") + ",GF:" + (lat.goodForm === "good" ? "Good" : "WT") + "]"; } return e.name + " " + e.current + " " + e.reps + " (" + e.status + ")" + ql;}).join(", "); }).join("; ") + ". "; } return ec; })() +
                  (function(){ var ac = ""; if (p.activity && p.activity.length > 0) { ac = "Recent activity: " + p.activity.slice(-5).map(function(a){return a.date+": "+(a.steps||"")+"steps "+(a.activity||"");}).join(", ") + ". "; } return ac; })() +
                  getOnboardingCtx(activeTab) + prevMeasCtx + getCrossSectionCtx(activeTab, "meas") + "\n\n" +
                  "RULES FOR RESPONSE:\n" +
                  "1. ‘wins’: 2-3 things the measurements show going well — positive size changes, body recomposition evidence, meaningful trends. Reference actual numbers and changes.\n" +
                  "2. ‘tweaks’: 1-2 constructive suggestions. NEVER say ‘you need to fix this’. Instead: ‘If you [specific action] over the next 4 weeks, expect to see [specific measurement outcome]’. Always connect measurement changes to training, nutrition or lifestyle factors.\n" +
                  "3. ‘outlook’: One sentence — the honest but encouraging trajectory shown by the tape. Frame it as a mate who can read the measurements and see the recomposition story.\n" +
                  "Keep it tight — similar length to the home page companion feedback. Quality over quantity.\n\n" +
                  "Return ONLY valid JSON: {\"wins\":[\"point\",\"point\"],\"tweaks\":[\"point\",\"point\"],\"outlook\":\"one sentence\"}";
                var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1200, messages: [{ role: "user", content: prompt }] }) });
                var result = await resp.json(); var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
                var txt = ""; if (result.content) { for (var ci = 0; ci < result.content.length; ci++) { if (result.content[ci].text) txt += result.content[ci].text; } }
                if (txt) { var mfParsed = JSON.parse(txt.replace(/```json|```/g, "").trim()); mfParsed._at = new Date().toLocaleString("en-GB"); mfParsed._when = new Date().toLocaleString("en-GB"); setMeasFeedback(mfParsed); sSet("meas_feedback", JSON.stringify(Object.assign({}, measFbAll || {}, { [activeTab]: mfParsed }))); }
              } catch(e) { setMeasFeedback({ wins: [], tweaks: [window.isEnergyEmpty(e) ? window.energyEmptyMsg : "Error: " + String(e).substring(0, 80)], outlook: "" }); }
              setMeasFbLoading(false);
            }} disabled={measFbLoading} style={{ width: "100%", padding: 12, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: measFbLoading ? "not-allowed" : "pointer", background: measFbLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", marginBottom: 6 }}>{measFbLoading ? React.createElement("span", null, "Generating, please wait ", React.createElement("span", { className: "loading-dots", dangerouslySetInnerHTML: { __html: "<span>.</span><span>.</span><span>.</span>" } })) : "My Companion Measurement Feedback"}</button>
            <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>Reviews tape measurements — size trends, recomposition evidence — cross-referenced with your body comp, eating, activity and health data.</div>
            {measFeedback && measFeedback._at && <button onClick={function(){ setMeasFbExpanded2(!measFbExpanded2); }} style={{ width: "100%", padding: 6, background: "none", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, color: "#64748b", cursor: "pointer", marginBottom: 6 }}>{measFbExpanded2 ? "▲ Hide Feedback" : "▼ Show Feedback"}</button>}
            {measFbExpanded2 && measFeedback && measFeedback._at && (function() { var mfb = measFeedback; return React.createElement("div", { style: { marginBottom: 10 } },
              React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" } },
                mfb._when && React.createElement("div", { style: { padding: "6px 14px", background: "#f8fafc", fontSize: 10, color: "#94a3b8", borderBottom: "1px solid #e2e8f0" } }, "Generated ", mfb._when, " for ", isJC ? "JC" : "Becks"),
                React.createElement("div", { style: { padding: "8px 14px", borderBottom: "1px solid #e2e8f0" } }, React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, React.createElement("span", { style: { fontSize: 14 } }, "📏"), React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: "#1e3a5f" } }, "Measurement Companion Check-in"))),
                React.createElement("div", { style: { padding: "12px 14px", borderBottom: "1px solid #e2e8f0" } },
                  React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#0c4a6e" } }, "What’s going well"),
                  (mfb.wins || mfb.good || []).map(function(w, i) { return React.createElement("div", { key: i, style: { fontSize: 12, color: "#334155", marginTop: 4 } }, "✓ ", w); })
                ),
                React.createElement("div", { style: { padding: "12px 14px", borderBottom: "1px solid #e2e8f0" } },
                  React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#92400e" } }, "Tweaks for next period"),
                  (mfb.tweaks || mfb.watch || []).map(function(t, i) { return React.createElement("div", { key: i, style: { fontSize: 12, color: "#334155", marginTop: 4 } }, "→ ", t); })
                ),
                React.createElement("div", { style: { padding: "12px 14px" } },
                  React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#1e40af" } }, "Measurement outlook"),
                  React.createElement("div", { style: { fontSize: 12, color: "#334155", marginTop: 4 } }, "★ ", mfb.outlook)
                )
              ),
              renderThread(mfb, "meas", activeTab, updateMeasFb, activeTab)
            ); })()}
          </div>
              </div>)}
            </div>
          </div>

        </div>
  );
}
