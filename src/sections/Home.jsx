import { readImageForAI } from "../lib/image.js";
import PrivacyNote from "../components/PrivacyNote.jsx";
import { btnDelete, btnMuted, btnP, inputStyle, labelStyle } from "../constants/styles.js";
import { latestFirst } from "../lib/chat.js";
import { accentVariant } from "../lib/colour.js";
import { TONE_RULES } from "../constants/tone.js";
import { getMoodContext } from "../lib/aiContext.js";
import { MOOD_COLORS, MOOD_EMOJIS, MOOD_LABELS } from "../constants/mood.js";
import { sSet } from "../lib/storage.js";
import { BREAKFASTS, DEFAULT_BREAKFASTS, DEFAULT_DINNERS_GB, DEFAULT_LUNCHES, DINNERS, LUNCHES, SNACKS } from "../constants/food.js";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function HomeSection({ ctx }) {
  const {
    accent, accentBorder, accentBtnBorder, accentBtnLight, accentLight, accentMid, activeTab, assessment,
    assessmentExpanded, btnMT, calcAge, checkCompanionEnergy, companionEnergy, customBreakfasts, customDesserts, customDrinks,
    customLunches, customMeals, customSnacks, dailyMood, data, energyLoading, feedbackHistory, feedbackLoading,
    feedbackResults, genPlanLoading, generateFeedback, generatedTargets, getCrossSectionCtx, homeFbExpanded, isJC, journalEntries,
    journalText, meals, onboardInputs, p, profileInputs, renderThread, saveData, setAssessment,
    setAssessmentExpanded, setDailyMood, setEatDay, setExerciseDay, setFormMsg, setGenPlanLoading, setGeneratedTargets, setHomeFbExpanded,
    setJournalEntries, setJournalText, setOnboardInputs, setProfileInputs, setSection, setSetupDirty, setSetupTab, setShowFbHistory,
    setShowFullJournal, setShowMyDay, setShowOnboarding, setShowProfile, setShowRecentJournal, setUserMood, setupDirty, setupTab,
    showFbHistory, showFullJournal, showMyDay, showOnboarding, showProfile, showRecentJournal, updateHomeFb, userMood
  } = ctx;

  return (
<div>
          {/* ── COMPANION ENERGY ── */}
          {(() => {
            var rawPct = companionEnergy ? companionEnergy.pct : 0;
            var pct = rawPct <= 0 ? 0 : rawPct;
            var hasEnergy = companionEnergy !== null;
            var keyStatus = companionEnergy ? companionEnergy.keyStatus : null;
            var segCount = 20;
            var filledSegs = hasEnergy ? Math.round(pct / 5) : 0;
            var emptySegs = segCount - filledSegs;

            var statusLabel = !hasEnergy ? "—" : keyStatus === "no_key" ? "No API key" : keyStatus === "invalid_key" ? "Invalid key" : keyStatus === "rate_limited" ? "Rate limited" : keyStatus === "error" ? "Connection error" : companionEnergy.depleted ? "Empty — recharge needed" : companionEnergy.needsCalibration ? "Recharged — level resets in Settings" : pct > 50 ? "Good energy" : pct > 20 ? "Getting low" : "Running low";
            var statusEmoji = !hasEnergy ? "" : keyStatus === "active" ? "✓ " : keyStatus === "no_key" || keyStatus === "invalid_key" ? "✗ " : "";
            var pctColor = pct > 20 ? "#22c55e" : pct > 0 ? "#f59e0b" : "#ef4444";

            return (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "9px 16px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 13 }}>⚡</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>Companion Energy</span>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: hasEnergy ? pctColor : "#94a3b8" }}>{energyLoading ? "Checking..." : hasEnergy ? Math.round(pct) + "%" : "—"}</div>
              </div>
              <div style={{ display: "flex", gap: 1, marginBottom: 4 }}>
                {Array.from({ length: segCount }).map(function(_, i) {
                  var isGreen = i < filledSegs && pct > 20;
                  var isAmber = i < filledSegs && pct <= 20 && pct > 0;
                  var isEmpty = i >= filledSegs;
                  var segColor = isEmpty ? "#ef4444" : isAmber ? "#f59e0b" : "#22c55e";
                  return (<div key={i} style={{ flex: 1, height: 6, borderRadius: i === 0 ? "3px 0 0 3px" : i === segCount - 1 ? "0 3px 3px 0" : 0, background: hasEnergy ? segColor : "#f1f5f9", transition: "background 0.3s ease" }} />);
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 9, color: "#94a3b8" }}>{statusEmoji}{statusLabel}</div>
                  <button onClick={checkCompanionEnergy} disabled={energyLoading} style={{ background: "none", border: "none", fontSize: 9, color: "#2563eb", cursor: energyLoading ? "not-allowed" : "pointer", padding: "2px 6px" }}>↻ Refresh</button>
              </div>
            </div>);
          })()}

          {/* Profile */}
          {(() => { const prof = p.profile || {}; const hasBaseline = p.body && p.body.weight && p.body.weight.length > 0; var welcomeMsgs = ["Ready to make today count?", "Let's keep the momentum going!", "Small steps, big results — let's go!", "Your future self will thank you for today.", "Consistency beats perfection — you've got this!", "Every healthy choice adds up. What's first today?", "Welcome back — let's pick up where you left off!", "Progress isn't always visible, but it's always happening.", "You're building something great here — one day at a time.", "Let's check in and keep things moving forward."]; var welcomeIdx = Math.floor((new Date().getHours() * 60 + new Date().getMinutes()) / 144) % welcomeMsgs.length; var firstName = (prof.name || "").split(" ")[0]; var greetHour = new Date().getHours(); var greetWord = greetHour < 12 ? "Good morning" : greetHour < 17 ? "Good afternoon" : "Good evening"; return (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", marginTop: 14, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ padding: "18px 16px", borderBottom: showOnboarding ? "1px solid #e2e8f0" : "none" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>{firstName ? greetWord + ", " + firstName : "New User"}</div>
              {!showOnboarding && <div style={{ fontSize: 13, color: accent, marginTop: 6, lineHeight: 1.4, fontStyle: "italic" }}>{welcomeMsgs[welcomeIdx]}</div>}
            </div>

            {/* ONBOARDING QUESTIONNAIRE — TABBED */}
            {showOnboarding && (() => {
              var ob = onboardInputs;
              var setOB = function(k, v) { setSetupDirty(true); setOnboardInputs(function(q) { var n = Object.assign({}, q); n[k] = v; return n; }); };
              var personAge = calcAge(ob.dob || prof.dob) || prof.age;

              var SETUP_TABS = [
                { id: "profile", l: "My Profile" },
                { id: "details", l: "My Details" },
                { id: "family", l: "My Family" },
                { id: "personality", l: "Personality" },
                { id: "lifestyle", l: "Lifestyle" },
                { id: "eating", l: "Food & Drink" },
                { id: "wellbeing", l: "Wellbeing" },
                { id: "health", l: "My Health" }
              ];

              /* field renderer: [key, label, type, placeholder, ...selectOptions] */
              var rf = function(fields) {
                return fields.map(function(f) {
                  var key = f[0], label = f[1], type = f[2] || "text", ph = f[3] || "";
                  if (type === "select") {
                    var opts = f.slice(4);
                    return (<div key={key} style={{ marginTop: 6 }}>
                      <label style={labelStyle}>{label}</label>
                      <select value={ob[key] || ""} onChange={function(e) { setOB(key, e.target.value); }} style={{ ...inputStyle, appearance: "auto" }}>
                        <option value="">Select...</option>
                        {opts.map(function(o) { return <option key={o} value={o}>{o}</option>; })}
                      </select>
                    </div>);
                  }
                  if (type === "ta") {
                    return (<div key={key} style={{ marginTop: 6 }}>
                      <label style={labelStyle}>{label}</label>
                      <textarea value={ob[key] || ""} onChange={function(e) { setOB(key, e.target.value); }} style={{ ...inputStyle, minHeight: 40, resize: "vertical" }} placeholder={ph} />
                    </div>);
                  }
                  if (type === "date") {
                    return (<div key={key} style={{ marginTop: 6 }}>
                      <label style={labelStyle}>{label}</label>
                      <input type="date" value={ob[key] || ""} onChange={function(e) { setOB(key, e.target.value); }} style={inputStyle} />
                      {key === "dob" && ob.dob && calcAge(ob.dob) !== null && <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Age: {calcAge(ob.dob)}</div>}
                    </div>);
                  }
                  return (<div key={key} style={{ marginTop: 6 }}>
                    <label style={labelStyle}>{label}</label>
                    <input value={ob[key] || ""} onChange={function(e) { setOB(key, e.target.value); }} style={inputStyle} placeholder={ph} />
                  </div>);
                });
              };

              /* save handler — saves all setup data + syncs key fields to profile */
              var saveSetup = async function() {
                var nd = JSON.parse(JSON.stringify(data));
                nd[activeTab].onboarding = onboardInputs;
                if (!nd[activeTab].profile) nd[activeTab].profile = {};
                if (ob.name) nd[activeTab].profile.name = ob.name;
                if (ob.dob) { nd[activeTab].profile.dob = ob.dob; nd[activeTab].profile.age = calcAge(ob.dob); }
                if (ob.sex) nd[activeTab].profile.sex = ob.sex;
                if (ob.height) nd[activeTab].profile.height = ob.height;
                await saveData(nd);
                setFormMsg("✓ Setup saved"); setTimeout(function() { setFormMsg(""); }, 3000);
              };

              return (<div style={{ marginTop: 0, padding: "0 14px 14px" }}>
                {/* Grey sub-container for My Profile content */}
                <div style={{ background: accentLight, borderRadius: 8, padding: 12, border: "1px solid " + accentBorder }}>
                {/* Tab bar — double row grey pills */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 0, background: accentMid, borderRadius: 8, padding: 2, marginBottom: 2 }}>
                    {SETUP_TABS.slice(0, 4).map(function(tab) {
                      var active = setupTab === tab.id;
                      return (<button key={tab.id} onClick={function() { setSetupTab(tab.id); }} style={{ flex: 1, padding: "6px 0", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: active ? "#fff" : "transparent", color: active ? "#0f172a" : "rgba(255,255,255,0.7)" }}>{tab.l}</button>);
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 0, background: accentMid, borderRadius: 8, padding: 2 }}>
                    {SETUP_TABS.slice(4).map(function(tab) {
                      var active = setupTab === tab.id;
                      return (<button key={tab.id} onClick={function() { setSetupTab(tab.id); }} style={{ flex: 1, padding: "6px 0", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: active ? "#fff" : "transparent", color: active ? "#0f172a" : "rgba(255,255,255,0.7)" }}>{tab.l}</button>);
                    })}
                  </div>
                </div>

                {/* ═══ MY PROFILE (read-only generated) ═══ */}
                {setupTab === "profile" && (<div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>My Profile</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10 }}>Auto-generated from your setup information. Complete the other tabs then generate your profile below.</div>

                  {/* Read-only profile summary */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, color: "#475569", padding: 10, background: accentVariant(accent, 88), borderRadius: 8, border: "1px solid " + accentBorder }}>
                    <div>Name: <strong>{prof.name || ob.name || "—"}</strong></div>
                    <div>Age: <strong>{personAge || "—"}</strong></div>
                    <div>Sex: <strong>{prof.sex || ob.sex || "—"}</strong></div>
                    <div>Height: <strong>{prof.height || ob.height || "—"}</strong></div>
                    <div>Ideal: <strong>{prof.idealWeight || "—"}</strong></div>
                    <div>DOB: <strong>{(ob.dob || prof.dob) ? new Date(ob.dob || prof.dob).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</strong></div>
                    <div style={{ gridColumn: "1 / -1" }}>Type: <strong>{prof.bodyType || "—"}</strong></div>
                    <div style={{ gridColumn: "1 / -1" }}>Fibre: <strong>{prof.fibreType || "—"}</strong></div>
                    {prof.notes && <div style={{ gridColumn: "1 / -1", color: "#94a3b8", fontSize: 10, marginTop: 4 }}>{prof.notes}</div>}
                  </div>

                  {/* My Companion Recommendations button */}
                  <button onClick={async function() {
                    setGenPlanLoading(true); setFormMsg("Generating recommendations...");
                    try {
                      var obd = p.onboarding || onboardInputs;
                      var prompt = "You are " + (obd.name || "the user") + "'s Lifecare Companion — a trusted, knowledgeable friend generating personalised recommendations. Imagine you're on a video call walking them through your honest assessment of where they are and what to focus on. Speak directly to them using 'you' and 'your' — NEVER use their name in the third person.\n\n" + TONE_RULES + getMoodContext(userMood) + "\n\nYour profile: " + (obd.name || "") + ", age " + (calcAge(obd.dob || prof.dob) || obd.age || prof.age || "") + ", " + (obd.sex || prof.sex || "") + ", " + (obd.height || prof.height || "") + ". Conditions: " + (obd.conditions || "none stated") + ". Medications: " + (obd.medications || "none") + ". Neurodiversity: " + (obd.neurodiversity || "none") + ". Activity: " + (obd.activity || "unknown") + ". Goals: " + (obd.goals || "general health") + ". Living: " + (obd.livingSituation || "not stated") + ". Work: " + (obd.occupation || "") + " " + (obd.workPattern || "") + ". Sleep: " + (obd.sleepHours || "") + "hrs, quality " + (obd.sleepQuality || "?") + "/5. Stress: " + (obd.stressLevel || "?") + "/5. Personality: " + (obd.personalityType || "not stated") + ". Motivation: " + (obd.motivationStyle || "not stated") + ". What derails: " + (obd.whatDerails || "not stated") + ". Cooking confidence: " + (obd.cookingConfidence || "not stated") + ". Emotional eating: " + (obd.emotionalEating || "not stated") + ". " + (p.bodyAnalysis ? "Photo analysis: " + JSON.stringify(p.bodyAnalysis) : "") +
                      (function(){ var bc = ""; if (p.body) { var bk = Object.keys(p.body); bk.forEach(function(k) { var arr = p.body[k]; if (arr && arr.length > 0) bc += k + ":" + arr[arr.length-1].v + " "; }); if (bc) bc = ". Body comp: " + bc; } return bc; })() +
                      (function(){ var ec = ""; if (p.exercises) { var exDays = Object.keys(p.exercises); ec = ". Exercise programme: " + exDays.map(function(d) { return d + ": " + p.exercises[d].map(function(e){ var lat = e.prog && e.prog.length > 0 ? e.prog[e.prog.length-1] : null; var ql = ""; if (lat) { var et = e.exType || "weights"; var fl = ["weights","bodyweight","timed_hold","stretching"].indexOf(et) >= 0 ? "FR" : "CIO"; ql = " [" + fl + ":" + (lat.fullRange === "good" ? "Good" : "WT") + ",GF:" + (lat.goodForm === "good" ? "Good" : "WT") + "]"; } return e.name + " " + e.current + " " + e.reps + " (" + e.status + ")" + ql;}).join(", "); }).join("; "); } return ec; })() +
                      (function(){ var mc = ""; if (p.measurements && p.measurements.length > 0) { var lm = p.measurements[p.measurements.length-1]; mc = ". Measurements: " + Object.entries(lm).filter(function(e){return e[0]!=="date"&&e[0]!=="week";}).map(function(e){return e[0]+"="+e[1];}).join(", "); } return mc; })() +
                      (function(){ var bl = ""; if (p.bloods && p.bloods.length > 0) { var lb = p.bloods[p.bloods.length-1]; bl = ". Latest bloods(" + lb.date + "): " + Object.entries(lb.tests).map(function(e){return e[0]+"="+e[1];}).join(", "); } return bl; })() +
                      (function(){ var mn = ""; if (p.meds && p.meds.length > 0) mn = ". Current meds: " + p.meds.filter(function(m){return m.active;}).map(function(m){return m.name+" "+(m.dose||m.dosage||"");}).join(", "); return mn; })() +
                      (function(){ var ac = ""; if (p.activity && p.activity.length > 0) { ac = ". Recent activity: " + p.activity.slice(-5).map(function(a){return a.date+": "+(a.steps||"")+"steps "+(a.activity||"");}).join(", "); } return ac; })() +
                      getCrossSectionCtx(activeTab, "recommendations") +
                      ". Return ONLY JSON: {\"bodyType\":\"e.g. Compact meso-endomorph\",\"fibreType\":\"e.g. Fast-twitch dominant\",\"idealWeight\":\"e.g. 13st 6lb\",\"notes\":\"key notes — use 'you/your' not third person\",\"assessment\":\"3-4 sentence assessment speaking directly to the user with 'you' — current position and realistic expectations over 6-12 months\",\"priorities\":[\"priority 1\",\"priority 2\",\"priority 3\"],\"targets\":{\"calories\":\"e.g. 2000-2200\",\"protein\":\"e.g. 110-130g\",\"satFat\":\"e.g. under 20g\",\"sugar\":\"e.g. under 25g\",\"fibre\":\"e.g. 30-35g\",\"targetWeight\":\"e.g. 82kg\",\"targetBodyFat\":\"e.g. 18-22%\",\"targetWaist\":\"e.g. under 94cm\"}}";
                      var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }) });
                      var result = await resp.json(); var txt = ""; if (result.content) { for (var ci = 0; ci < result.content.length; ci++) { if (result.content[ci].text) txt += result.content[ci].text; } }
                      if (txt) {
                        var gen = JSON.parse(txt.replace(/```json|```/g, "").trim());
                        var nd = JSON.parse(JSON.stringify(data));
                        if (!nd[activeTab].profile) nd[activeTab].profile = {};
                        if (gen.bodyType) nd[activeTab].profile.bodyType = gen.bodyType;
                        if (gen.fibreType) nd[activeTab].profile.fibreType = gen.fibreType;
                        if (gen.idealWeight) nd[activeTab].profile.idealWeight = gen.idealWeight;
                        if (gen.notes) nd[activeTab].profile.notes = gen.notes;
                        nd[activeTab].profileAssessment = gen;
                        if (gen.targets) nd[activeTab].generatedTargets = gen.targets;
                        await saveData(nd); setAssessment(gen);
                        if (gen.targets) setGeneratedTargets(gen.targets);
                        setFormMsg("✓ Recommendations generated"); setTimeout(function() { setFormMsg(""); }, 3000);
                      }
                    } catch(e) { setFormMsg(window.isEnergyEmpty(e) ? window.energyEmptyMsg : "✗ Could not generate — check API key in Admin"); setTimeout(function() { setFormMsg(""); }, 4000); }
                    setGenPlanLoading(false);
                  }} disabled={genPlanLoading} style={{ width: "100%", marginTop: 12, padding: 10, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: genPlanLoading ? "not-allowed" : "pointer", background: genPlanLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" }}>{genPlanLoading ? <span>Generating, please wait <span className="loading-dots" dangerouslySetInnerHTML={{ __html: "<span>.</span><span>.</span><span>.</span>" }} /></span> : "My Companion Recommendations"}</button>

                  {/* Assessment toggle */}
                  {(assessment || p.profileAssessment) && <button onClick={function(){ setAssessmentExpanded(!assessmentExpanded); }} style={{ width: "100%", padding: 6, background: "none", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, color: "#64748b", cursor: "pointer", marginTop: 8, marginBottom: 6 }}>{assessmentExpanded ? "▲ Hide Recommendations" : "▼ Show Recommendations"}</button>}
                  {assessmentExpanded && (assessment || p.profileAssessment) && (() => { var a = assessment || p.profileAssessment; return (<div style={{ marginTop: 4, background: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)", borderRadius: 12, padding: 14, color: "#fff" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7, marginBottom: 8 }}>My Companion Recommendations</div>
                    {a.assessment && <div style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>{a.assessment}</div>}
                    {a.priorities && a.priorities.length > 0 && (<div>
                      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginTop: 8, marginBottom: 4 }}>🏋️ Activities</div>
                      {a.priorities.filter(function(pr) { return pr; }).slice(0, 1).map(function(pr, i) { return <div key={"a"+i} style={{ fontSize: 12, marginBottom: 3, paddingLeft: 8, borderLeft: "2px solid rgba(255,255,255,0.3)" }}>{pr}</div>; })}
                      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginTop: 8, marginBottom: 4 }}>🥗 Dietary</div>
                      {a.priorities.filter(function(pr) { return pr; }).slice(1, 2).map(function(pr, i) { return <div key={"d"+i} style={{ fontSize: 12, marginBottom: 3, paddingLeft: 8, borderLeft: "2px solid rgba(255,255,255,0.3)" }}>{pr}</div>; })}
                      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginTop: 8, marginBottom: 4 }}>🏥 Medical</div>
                      {a.priorities.filter(function(pr) { return pr; }).slice(2).map(function(pr, i) { return <div key={"m"+i} style={{ fontSize: 12, marginBottom: 3, paddingLeft: 8, borderLeft: "2px solid rgba(255,255,255,0.3)" }}>{pr}</div>; })}
                    </div>)}
                  </div>); })()}

                  {/* Recommendations section */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{(p.profile && p.profile.name) || (onboardInputs && onboardInputs.name) || "Your"} Recommendations</div>
                    <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10 }}>Personalised daily targets and body composition goals based on your profile, health data, and lifestyle.</div>

                    {/* Daily Nutrition Targets */}
                    <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 12, border: "1px solid #bae6fd", marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0c4a6e", marginBottom: 8 }}>Daily Nutrition</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
                        <div style={{ background: "#fff", borderRadius: 6, padding: 8, textAlign: "center" }}>
                          <div style={{ color: "#94a3b8", fontSize: 9 }}>Calories</div>
                          <div style={{ fontWeight: 700, color: "#0c4a6e" }}>{(p.targets && p.targets.calories) || (generatedTargets && generatedTargets.calories) || (p.generatedTargets && p.generatedTargets.calories) || "—"}</div>
                        </div>
                        <div style={{ background: "#fff", borderRadius: 6, padding: 8, textAlign: "center" }}>
                          <div style={{ color: "#94a3b8", fontSize: 9 }}>Protein</div>
                          <div style={{ fontWeight: 700, color: "#0c4a6e" }}>{(p.targets && p.targets.protein) || (generatedTargets && generatedTargets.protein) || (p.generatedTargets && p.generatedTargets.protein) || "—"}</div>
                        </div>
                        <div style={{ background: "#fff", borderRadius: 6, padding: 8, textAlign: "center" }}>
                          <div style={{ color: "#94a3b8", fontSize: 9 }}>Sat Fat</div>
                          <div style={{ fontWeight: 700, color: "#0c4a6e" }}>{(p.targets && p.targets.satFat) || (generatedTargets && generatedTargets.satFat) || (p.generatedTargets && p.generatedTargets.satFat) || "—"}</div>
                        </div>
                        <div style={{ background: "#fff", borderRadius: 6, padding: 8, textAlign: "center" }}>
                          <div style={{ color: "#94a3b8", fontSize: 9 }}>Added Sugar</div>
                          <div style={{ fontWeight: 700, color: "#0c4a6e" }}>{(p.targets && p.targets.sugar) || (generatedTargets && generatedTargets.sugar) || (p.generatedTargets && p.generatedTargets.sugar) || "—"}</div>
                        </div>
                        <div style={{ background: "#fff", borderRadius: 6, padding: 8, textAlign: "center", gridColumn: "1 / -1" }}>
                          <div style={{ color: "#94a3b8", fontSize: 9 }}>Fibre</div>
                          <div style={{ fontWeight: 700, color: "#0c4a6e" }}>{(p.targets && p.targets.fibre) || (generatedTargets && generatedTargets.fibre) || (p.generatedTargets && p.generatedTargets.fibre) || "—"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Body Composition Targets */}
                    <div style={{ background: "#eff6ff", borderRadius: 10, padding: 12, border: "1px solid #bfdbfe", marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>Body Composition</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
                        <div style={{ background: "#fff", borderRadius: 6, padding: 8, textAlign: "center" }}>
                          <div style={{ color: "#94a3b8", fontSize: 9 }}>Target Weight</div>
                          <div style={{ fontWeight: 700, color: "#1e40af" }}>{(p.targets && p.targets.targetWeight) || (generatedTargets && generatedTargets.targetWeight) || (p.generatedTargets && p.generatedTargets.targetWeight) || (p.profile && p.profile.idealWeight) || "—"}</div>
                        </div>
                        <div style={{ background: "#fff", borderRadius: 6, padding: 8, textAlign: "center" }}>
                          <div style={{ color: "#94a3b8", fontSize: 9 }}>Body Fat</div>
                          <div style={{ fontWeight: 700, color: "#1e40af" }}>{(p.targets && p.targets.targetBodyFat) || (generatedTargets && generatedTargets.targetBodyFat) || (p.generatedTargets && p.generatedTargets.targetBodyFat) || "—"}</div>
                        </div>
                        <div style={{ background: "#fff", borderRadius: 6, padding: 8, textAlign: "center" }}>
                          <div style={{ color: "#94a3b8", fontSize: 9 }}>Waist</div>
                          <div style={{ fontWeight: 700, color: "#1e40af" }}>{(p.targets && p.targets.targetWaist) || (generatedTargets && generatedTargets.targetWaist) || (p.generatedTargets && p.generatedTargets.targetWaist) || "—"}</div>
                        </div>
                        <div style={{ background: "#fff", borderRadius: 6, padding: 8, textAlign: "center" }}>
                          <div style={{ color: "#94a3b8", fontSize: 9 }}>Visceral Fat</div>
                          <div style={{ fontWeight: 700, color: "#1e40af" }}>{(p.targets && p.targets.visceralFat) || (generatedTargets && generatedTargets.visceralFat) || (p.generatedTargets && p.generatedTargets.visceralFat) || "—"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>)}

                {/* ═══ MY DETAILS ═══ */}
                {setupTab === "details" && (<div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>My Details</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10 }}>Your basic personal information.</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {rf([["name", "Name"], ["dob", "Date of Birth", "date"]])}
                  </div>
                  {rf([["sex", "Sex", "select", "", "Male", "Female"], ["height", "Height (e.g. 5ft 11)"]])}

                  {/* Body Type Photo Upload */}
                  <div style={{ marginTop: 12, padding: 12, background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a5f", marginBottom: 6 }}>📸 Body Type Photos</div>
                    <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.5, marginBottom: 8 }}>Upload photos for AI body type analysis. Best results from:<br/>• Front relaxed (full body, arms at sides)<br/>• Bicep flex (single arm, side on)<br/>• Side profile (relaxed)<br/>• Back relaxed or flexed<br/>• Legs: quad flex and calf raise</div>
                    <label style={{ display: "block", padding: 10, background: "#fff", border: "2px dashed #93c5fd", borderRadius: 8, textAlign: "center", cursor: "pointer", fontSize: 11, color: "#1e3a5f" }}>
                      📷 Upload Body Type Photos
                      <input type="file" data-share="bodytype" accept="image/*" multiple onChange={async function(e) { var files = e.target.files; if (!files || files.length === 0) return; setFormMsg("Generating from photos..."); var nd = JSON.parse(JSON.stringify(data)); if (!nd[activeTab].bodyPhotos) nd[activeTab].bodyPhotos = []; var imageContents = []; for (var fi = 0; fi < Math.min(files.length, 5); fi++) { try { var _img = await readImageForAI(files[fi]); var b64 = _img.data;   /* v2.14.0: shrunk before sending */ nd[activeTab].bodyPhotos.push({ date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), name: files[fi].name, type: "baseline" /* v2.12.1: no image data is kept */ }); imageContents.push({ type: "image", source: { type: "base64", media_type: _img.mediaType, data: b64 } }); } catch(re) {} } if (imageContents.length > 0) { try { var content = imageContents.concat([{ type: "text", text: "Analyse this person's physique. Determine: 1) Somatotype, 2) Upper or lower body dominant, 3) Fast-twitch or slow-twitch dominant, 4) Notable strengths. Return ONLY JSON: {\"bodyType\":\"...\",\"dominance\":\"...\",\"fibreType\":\"...\",\"strengths\":\"...\",\"notes\":\"...\"}" }]); var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: content }] }) }); var result = await resp.json(); var txt = ""; if (result.content) { for (var ci = 0; ci < result.content.length; ci++) { if (result.content[ci].text) txt = txt + result.content[ci].text; } } if (txt) { var parsed = JSON.parse(txt.replace(/```json|```/g, "").trim()); if (!nd[activeTab].profile) nd[activeTab].profile = {}; if (parsed.bodyType) nd[activeTab].profile.bodyType = parsed.bodyType + (parsed.dominance ? ", " + parsed.dominance : ""); if (parsed.fibreType) nd[activeTab].profile.fibreType = parsed.fibreType; nd[activeTab].bodyAnalysis = parsed; } } catch(ae) {} } if (nd[activeTab].bodyPhotos.length > 20) nd[activeTab].bodyPhotos = nd[activeTab].bodyPhotos.slice(-20); await saveData(nd); setFormMsg("✓ Photos analysed"); setTimeout(function() { setFormMsg(""); }, 4000); e.target.value = ""; }} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 }} />
                    </label>
                    <PrivacyNote />
                  </div>

                  {/* My Companion Body Type Check */}
                  <div style={{ marginTop: 10, padding: 12, background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a5f", marginBottom: 6 }}>🔍 My Companion Body Type Check</div>
                    <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.5, marginBottom: 8 }}>Uses your answers, photos, and body comp data to determine body type, fibre dominance, ideal weight, and personalised assessment.</div>
                    <button onClick={async function() {
                      setGenPlanLoading(true); setFormMsg("Analysing body type...");
                      try {
                        var obd = p.onboarding || onboardInputs;
                        var prompt = "You are " + (obd.name || "the user") + "'s Lifecare Companion — a trusted, knowledgeable friend analysing their body type. Imagine you're on a video call explaining what the data tells you about their physique. Speak directly using 'you' and 'your' — NEVER use their name in the third person.\n\n" + TONE_RULES + getMoodContext(userMood) + "\n\nYour profile: " + (obd.name || "") + ", age " + (calcAge(obd.dob || prof.dob) || obd.age || prof.age || "") + ", " + (obd.sex || prof.sex || "") + ", " + (obd.height || prof.height || "") + ". Conditions: " + (obd.conditions || "none stated") + ". Medications: " + (obd.medications || "none") + ". Neurodiversity: " + (obd.neurodiversity || "none") + ". Activity: " + (obd.activity || "unknown") + ". Goals: " + (obd.goals || "general health") + ". Living: " + (obd.livingSituation || "not stated") + ". Work: " + (obd.occupation || "") + " " + (obd.workPattern || "") + ". Sleep: " + (obd.sleepHours || "") + "hrs, quality " + (obd.sleepQuality || "?") + "/5. Stress: " + (obd.stressLevel || "?") + "/5. Personality: " + (obd.personalityType || "not stated") + ". " + (p.bodyAnalysis ? "Photo analysis: " + JSON.stringify(p.bodyAnalysis) : "") +
                      (function(){ var bc = ""; if (p.body) { var bk = Object.keys(p.body); bk.forEach(function(k) { var arr = p.body[k]; if (arr && arr.length > 0) bc += k + ":" + arr[arr.length-1].v + " "; }); if (bc) bc = ". Body comp: " + bc; } return bc; })() +
                      (function(){ var ec = ""; if (p.exercises) { var exDays = Object.keys(p.exercises); ec = ". Exercise programme: " + exDays.map(function(d) { return d + ": " + p.exercises[d].map(function(e){ var lat = e.prog && e.prog.length > 0 ? e.prog[e.prog.length-1] : null; var ql = ""; if (lat) { var et = e.exType || "weights"; var fl = ["weights","bodyweight","timed_hold","stretching"].indexOf(et) >= 0 ? "FR" : "CIO"; ql = " [" + fl + ":" + (lat.fullRange === "good" ? "Good" : "WT") + ",GF:" + (lat.goodForm === "good" ? "Good" : "WT") + "]"; } return e.name + " " + e.current + " " + e.reps + " (" + e.status + ")" + ql;}).join(", "); }).join("; "); } return ec; })() +
                      (function(){ var mc = ""; if (p.measurements && p.measurements.length > 0) { var lm = p.measurements[p.measurements.length-1]; mc = ". Measurements: " + Object.entries(lm).filter(function(e){return e[0]!=="date"&&e[0]!=="week";}).map(function(e){return e[0]+"="+e[1];}).join(", "); } return mc; })() +
                      (function(){ var bl = ""; if (p.bloods && p.bloods.length > 0) { var lb = p.bloods[p.bloods.length-1]; bl = ". Latest bloods(" + lb.date + "): " + Object.entries(lb.tests).map(function(e){return e[0]+"="+e[1];}).join(", "); } return bl; })() +
                      (function(){ var mn = ""; if (p.meds && p.meds.length > 0) mn = ". Current meds: " + p.meds.filter(function(m){return m.active;}).map(function(m){return m.name+" "+(m.dose||m.dosage||"");}).join(", "); return mn; })() +
                      (function(){ var ac = ""; if (p.activity && p.activity.length > 0) { ac = ". Recent activity: " + p.activity.slice(-5).map(function(a){return a.date+": "+(a.steps||"")+"steps "+(a.activity||"");}).join(", "); } return ac; })() +
                      getCrossSectionCtx(activeTab, "bodytype") +
                      ". Return ONLY JSON: {\"bodyType\":\"e.g. Compact meso-endomorph\",\"fibreType\":\"e.g. Fast-twitch dominant\",\"idealWeight\":\"e.g. 13st 6lb\",\"notes\":\"key notes — use 'you/your' not third person\",\"assessment\":\"3-4 sentence assessment speaking directly to the user with 'you' — current position and realistic expectations over 6-12 months\",\"priorities\":[\"priority 1\",\"priority 2\",\"priority 3\"]}";
                        var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 800, messages: [{ role: "user", content: prompt }] }) });
                        var result = await resp.json(); var txt = ""; if (result.content) { for (var ci = 0; ci < result.content.length; ci++) { if (result.content[ci].text) txt += result.content[ci].text; } }
                        if (txt) {
                          var gen = JSON.parse(txt.replace(/```json|```/g, "").trim());
                          var nd = JSON.parse(JSON.stringify(data));
                          if (!nd[activeTab].profile) nd[activeTab].profile = {};
                          if (gen.bodyType) nd[activeTab].profile.bodyType = gen.bodyType;
                          if (gen.fibreType) nd[activeTab].profile.fibreType = gen.fibreType;
                          if (gen.idealWeight) nd[activeTab].profile.idealWeight = gen.idealWeight;
                          if (gen.notes) nd[activeTab].profile.notes = gen.notes;
                          nd[activeTab].profileAssessment = gen;
                          await saveData(nd); setAssessment(gen);
                          setFormMsg("\u2713 Body type check complete"); setTimeout(function() { setFormMsg(""); }, 3000);
                        }
                      } catch(e) { setFormMsg(window.isEnergyEmpty(e) ? window.energyEmptyMsg : "\u2717 Could not generate \u2014 check API key in Admin"); setTimeout(function() { setFormMsg(""); }, 4000); }
                      setGenPlanLoading(false);
                    }} disabled={genPlanLoading} style={{ width: "100%", padding: 10, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: genPlanLoading ? "not-allowed" : "pointer", background: genPlanLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" }}>{genPlanLoading ? <span>Analysing, please wait <span className="loading-dots" dangerouslySetInnerHTML={{ __html: "<span>.</span><span>.</span><span>.</span>" }} /></span> : "\ud83d\udd0d My Companion Body Type Check"}</button>
                  </div>

                  {/* Baseline Body Comp Upload */}
                  {(() => { var hasBaseline = p.body && p.body.weight && p.body.weight.length > 0; return (
                    <div style={{ marginTop: 10, padding: 10, background: hasBaseline ? "#f1f5f9" : "#fef3c7", borderRadius: 8, border: "1px solid " + (hasBaseline ? "#e2e8f0" : "#fcd34d"), opacity: hasBaseline ? 0.6 : 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: hasBaseline ? "#64748b" : "#92400e" }}>{hasBaseline ? "✓ Baseline body composition recorded" : "📊 Upload baseline body composition from your scales app (weight, body fat %, muscle mass etc)"}</div>
                    </div>
                  ); })()}

                  {/* Editable body profile fields */}
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[["bodyType","Body Type"],["fibreType","Fibre Type"],["idealWeight","Ideal Weight"]].map(function(pair) { return (<div key={pair[0]} style={pair[0] === "bodyType" ? { gridColumn: "1 / -1" } : {}}><label style={labelStyle}>{pair[1]}</label><input value={profileInputs[pair[0]] || prof[pair[0]] || ""} onChange={function(e) { setProfileInputs(function(q) { var n = Object.assign({}, q); n[pair[0]] = e.target.value; return n; }); }} style={inputStyle} /></div>); })}
                  </div>
                  <div style={{ marginTop: 8 }}><label style={labelStyle}>Notes</label><textarea value={profileInputs.notes || prof.notes || ""} onChange={function(e) { setProfileInputs(function(q) { return Object.assign({}, q, { notes: e.target.value }); }); }} style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} /></div>
                </div>)}

                {/* ═══ MY FAMILY ═══ */}
                {setupTab === "family" && (<div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>My Family</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10 }}>Who you live with and relevant family health history.</div>
                  {rf([
                    ["livingSituation", "Living situation", "ta", "e.g. Live with partner and 2 children, dog..."],
                    ["familyHistory", "Family health history", "ta", "e.g. Father — Type 2 diabetes, Mother — high cholesterol, Familial Hypercholesterolaemia suspected..."]
                  ])}
                </div>)}

                {/* ═══ MY PERSONALITY ═══ */}
                {setupTab === "personality" && (<div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>My Personality</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10 }}>Understanding your personality helps tailor motivation strategies and habit formation approaches.</div>
                  {rf([
                    ["personalityType", "Personality type or profile", "ta", "e.g. Yellow/Red Insights, INTJ, Type A, introvert..."],
                    ["motivationStyle", "What motivates you?", "ta", "e.g. Visible progress, training with partner, routine, competition, self-improvement..."],
                    ["whatDerails", "What typically derails your plans?", "ta", "e.g. Routine disruption, travel, stress, boredom, perfectionism..."],
                    ["accountabilityPref", "Accountability preference", "select", "", "Self-motivated", "Partner/friend", "Coach/app", "Group/class", "Mix of approaches"]
                  ])}
                </div>)}

                {/* ═══ MY LIFESTYLE ═══ */}
                {setupTab === "lifestyle" && (<div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>My Lifestyle</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10 }}>Your daily routines, work pattern, and current activity level.</div>
                  {rf([
                    ["occupation", "Occupation", "text", "e.g. Software engineer, nurse, teacher, retired..."],
                    ["workPattern", "Work pattern", "select", "", "Office full-time", "Office part-time", "Hybrid", "Work from home", "Shift work", "Retired", "Other"],
                    ["workHours", "Typical work hours", "text", "e.g. 9-5, shifts, flexible..."],
                    ["commute", "Commute", "text", "e.g. 30 min drive, 1hr train, walk, WFH..."],
                    ["activity", "Current activity level and exercise experience", "ta", "e.g. Sedentary, walk daily, gym 2x/week, swimming..."],
                    ["equipment", "Equipment available", "ta", "e.g. Marcy HG5000 home gym, dumbbells, resistance bands, gym membership..."],
                    ["goals", "Goals — what do you want to achieve?", "ta", "e.g. Lose weight, build muscle, improve cholesterol, get fitter..."]
                  ])}
                </div>)}

                {/* ═══ MY SLEEP ═══ */}


                {/* ═══ MY EATING & DRINKING ═══ */}
                {setupTab === "eating" && (<div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>My Eating & Drinking</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10 }}>Your current eating habits and relationship with food help us build a sustainable plan.</div>
                  {rf([
                    ["dietary", "Dietary preferences, restrictions, or allergies", "ta", "e.g. Vegetarian, gluten-free, nut allergy, low sodium..."],
                    ["cookingConfidence", "Cooking confidence (1-5)", "select", "", "1 — Can't cook", "2 — Very basic", "3 — Can follow recipes", "4 — Confident cook", "5 — Skilled/enthusiastic"],
                    ["eatingOutFreq", "How often do you eat out or get takeaway?", "select", "", "Rarely", "1-2 times/month", "Weekly", "2-3 times/week", "Most days"],
                    ["whoCooks", "Who mainly cooks at home?", "text", "e.g. Me, partner, shared, ready meals..."],
                    ["mealRegularity", "Meal regularity", "select", "", "Regular 3 meals", "Skip breakfast", "Skip lunch", "Irregular/grazing", "Intermittent fasting"],
                    ["emotionalEating", "Emotional or stress eating?", "ta", "e.g. Snack when stressed, comfort eating, binge episodes, no issues..."],
                    ["waterIntake", "Daily water intake", "select", "", "Less than 1 litre", "1-2 litres", "2-3 litres", "3+ litres", "Don't track"],
                    ["caffeineDaily", "Daily caffeine", "text", "e.g. 3 coffees, 2 teas, energy drinks..."],
                    ["alcoholFrequency", "Alcohol frequency", "select", "", "Never", "Rarely (special occasions)", "1-2 times/week", "3-4 times/week", "Most days", "Daily"]
                  ])}
                </div>)}

                {/* ═══ MY WELLBEING ═══ */}
                {setupTab === "wellbeing" && (<div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>My Wellbeing</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10 }}>Sleep, mental health and neurodiversity inform how we approach habit formation and support.</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4, marginTop: 8 }}>Sleep</div>
                  {rf([
                    ["sleepHours", "Average hours of sleep per night", "text", "e.g. 6-7 hours"],
                    ["sleepQuality", "Sleep quality (1-5)", "select", "", "1 \u2014 Very poor", "2 \u2014 Poor", "3 \u2014 Average", "4 \u2014 Good", "5 \u2014 Excellent"],
                    ["sleepIssues", "Sleep issues", "ta", "e.g. Trouble falling asleep, wake during night, snoring, sleep apnoea..."],
                    ["screensBed", "Screen use before bed", "select", "", "Phone/tablet in bed", "TV only", "No screens 30min before", "No screens 1hr+ before"],
                    ["caffeineCutoff", "Last caffeine of the day", "text", "e.g. 2pm, 4pm, after dinner, none..."]
                  ])}
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4, marginTop: 12 }}>Mental Health & Wellbeing</div>
                  {rf([
                    ["stressLevel", "Current stress level (1-5)", "select", "", "1 \u2014 Very low", "2 \u2014 Low", "3 \u2014 Moderate", "4 \u2014 High", "5 \u2014 Very high"],
                    ["mainStressors", "Main sources of stress", "ta", "e.g. Work deadlines, finances, family, health concerns..."],
                    ["copingStrategies", "Current coping strategies", "ta", "e.g. Exercise, meditation, talking to friends, nothing specific..."],
                    ["neurodiversity", "Neurodiversity", "ta", "e.g. ADHD, autism, dyslexia \u2014 any diagnoses or suspected conditions..."],
                    ["mentalHealth", "Mental health", "ta", "e.g. Anxiety, depression, on medication, seeing therapist, no concerns..."],
                    ["currentSupport", "Current support", "ta", "e.g. GP, therapist, counsellor, medication, none currently..."]
                  ])}
                </div>)}

                {/* ═══ MY HEALTH ═══ */}
                {setupTab === "health" && (<div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>My Health</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10 }}>Medical history and current health status. This helps your Companion understand your starting point.</div>
                  {rf([
                    ["conditions", "Medical conditions", "ta", "e.g. Thyroid, high cholesterol, diabetes, PCOS, heart conditions..."],
                    ["medications", "Current medications and supplements", "ta", "e.g. Atorvastatin 20mg, Levothyroxine 200mcg, Vitamin D..."],
                    ["bloods", "Recent blood results (if known)", "ta", "e.g. LDL 3.4, TSH 14.2, HbA1c 43..."],
                    ["injuries", "Previous health issues or past injuries", "ta", "e.g. RSI in wrists, bad knee, lower back pain..."],
                    ["painAreas", "Current health or injuries", "ta", "e.g. Lower back pain, recovering from cold, current niggles..."],
                    ["weightHighest", "Highest adult weight", "text", "e.g. 15st 2lb, 96kg..."],
                    ["weightLowest", "Lowest adult weight", "text", "e.g. 11st, 70kg..."],
                    ["previousDiets", "Previous diets or weight loss attempts", "ta", "e.g. Calorie counting, keto, Slimming World, none..."]
                  ])}
                </div>)}

                {/* Save Setup button - below form */}
                <button onClick={async function() { var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].onboarding = onboardInputs; if (!nd[activeTab].profile) nd[activeTab].profile = {}; var ob = onboardInputs; if (ob.name) nd[activeTab].profile.name = ob.name; if (ob.dob) { nd[activeTab].profile.dob = ob.dob; nd[activeTab].profile.age = calcAge(ob.dob); } if (ob.sex) nd[activeTab].profile.sex = ob.sex; if (ob.height) nd[activeTab].profile.height = ob.height; if (ob.conditions) { nd[activeTab].healthProfile = ob.conditions; } if (ob.painAreas) { nd[activeTab].healthNotes = ob.painAreas; } if (ob.medications) { if (!Array.isArray(nd[activeTab].meds)) nd[activeTab].meds = []; var newMeds = ob.medications.split(",").map(function(m){return m.trim();}).filter(function(m){return m && !nd[activeTab].meds.some(function(em){return (em.name||em).toLowerCase() === m.toLowerCase();});}); newMeds.forEach(function(m){ nd[activeTab].meds.push({name:m,dose:"",freq:"",time:"",notes:"",started:new Date().toISOString().slice(0,10),active:true}); }); } if (ob.bloods) { var bl = nd[activeTab].bloods || []; bl.push({date:new Date().toISOString().slice(0,10),notes:ob.bloods,source:"setup"}); nd[activeTab].bloods = bl; } await saveData(nd); setSetupDirty(false); setFormMsg("✓ Setup saved"); setTimeout(function() { setFormMsg(""); }, 3000); }} disabled={!setupDirty} style={{ width: "100%", marginTop: 12, marginBottom: 10, padding: 10, color: setupDirty ? "#fff" : "#94a3b8", border: setupDirty ? "none" : "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: setupDirty ? "pointer" : "default", background: setupDirty ? "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" : "#f1f5f9" }}>{setupDirty ? "Save Setup" : "✓ Saved"}</button>

                {/* Privacy notice */}
                <div style={{ padding: 10, background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)", borderRadius: 8, border: "1px solid #bfdbfe", marginBottom: 10, fontSize: 10, color: "#475569", lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, fontSize: 11, color: "#1e40af", marginBottom: 4 }}>🔒 Your information is private</div>
                  Your data is used solely by your Lifecare Companion™ to tailor recommendations, feedback and support to work best with you and achieve the best possible outcome. No information is shared with third parties. Any AI-generated content is processed without linking it to any identifiable individual. You choose what information to share — more detail helps your Lifecare Companion™ provide better, more personalised guidance, but every field is optional.
                </div>
                </div>{/* end grey sub-container */}
              </div>);
            })()}

            {/* EDIT PROFILE (simple mode) */}
            {showProfile && !showOnboarding && (<div style={{ marginTop: 8, padding: "0 14px 14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["name","Name"],["age","Age"],["sex","Sex"],["height","Height"],["bodyType","Body Type"],["fibreType","Fibre Type"],["idealWeight","Ideal Weight"]].map(function(pair) { return (<div key={pair[0]}><label style={labelStyle}>{pair[1]}</label><input value={profileInputs[pair[0]] || ""} onChange={function(e) { setProfileInputs(function(q) { var n = Object.assign({}, q); n[pair[0]] = e.target.value; return n; }); }} style={inputStyle} /></div>); })}
              </div>
              <div style={{ marginTop: 8 }}><label style={labelStyle}>Notes</label><textarea value={profileInputs.notes || ""} onChange={function(e) { setProfileInputs(function(q) { return Object.assign({}, q, { notes: e.target.value }); }); }} style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} /></div>
              <button onClick={async function() { var nd = JSON.parse(JSON.stringify(data)); nd[activeTab].profile = profileInputs; await saveData(nd); setShowProfile(false); setFormMsg("✓ Profile updated"); setTimeout(function() { setFormMsg(""); }, 3000); }} style={{ ...btnP(), marginTop: 8 }}>Save Profile</button>
            </div>)}

            <div style={{ textAlign: "center", padding: showOnboarding ? "8px 14px 10px" : "0 14px 10px", borderTop: showOnboarding ? "1px solid #e2e8f0" : "none" }}>
              <button onClick={() => { if (!showOnboarding) { var ob2 = p.onboarding || {}; setOnboardInputs(Object.assign({ conditions: "", medications: "", neurodiversity: "", bloods: "", goals: "", activity: "", equipment: "", dietary: "", allergies: "", livingSituation: "", familyHistory: "", personalityType: "", motivationStyle: "", whatDerails: "", accountabilityPref: "", occupation: "", workPattern: "", workHours: "", commute: "", sleepHours: "", sleepQuality: "", sleepIssues: "", screensBed: "", caffeineCutoff: "", cookingConfidence: "", eatingOutFreq: "", whoCooks: "", mealRegularity: "", emotionalEating: "", waterIntake: "", caffeineDaily: "", alcoholFrequency: "", stressLevel: "", mainStressors: "", copingStrategies: "", mentalHealth: "", currentSupport: "", injuries: "", painAreas: "", weightHighest: "", weightLowest: "", previousDiets: "" }, ob2, { name: ob2.name || prof.name || "", dob: ob2.dob || prof.dob || "", sex: ob2.sex || prof.sex || "", height: ob2.height || prof.height || "" })); setSetupTab("profile"); } setShowOnboarding(!showOnboarding); }} style={{ background: "none", border: "none", fontSize: 11, color: "#94a3b8", cursor: "pointer", padding: "4px 12px" }}>{showOnboarding ? "▲ Hide Profile" : "▼ My Profile"}</button>
            </div>
          </div>); })()}

          {/* ── MY MOOD ── */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "10px 16px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>My Mood</div>
              {userMood !== null && <div style={{ fontSize: 10, color: MOOD_COLORS[userMood], fontWeight: 600 }}>{MOOD_LABELS[userMood]}</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginTop: 6 }}>
              {MOOD_EMOJIS.map(function(emoji, idx) {
                var currentMood = dailyMood ? dailyMood.mood : null;
                var isSelected = currentMood === idx;
                return (<button key={idx} onClick={async function() {
                  var todayStr = new Date().toISOString().split("T")[0];
                  var newMood = currentMood === idx ? null : idx;
                  var newDailyMood = newMood !== null ? { date: todayStr, mood: newMood } : null;
                  setDailyMood(newDailyMood);
                  setUserMood(newMood);
                  await sSet("daily_mood_" + activeTab, JSON.stringify(newDailyMood));
                  await sSet("user_mood_" + activeTab, JSON.stringify(newMood));
                }} title={MOOD_LABELS[idx]} style={{ flex: 1, padding: "6px 0", border: isSelected ? "2px solid " + MOOD_COLORS[idx] : "1px solid " + accentBorder, borderRadius: 8, background: isSelected ? MOOD_COLORS[idx] + "18" : accentLight, fontSize: 16, cursor: "pointer", transition: "all 0.2s ease", transform: isSelected ? "scale(1.08)" : "scale(1)", filter: (currentMood !== null && !isSelected) ? "grayscale(0.5) opacity(0.5)" : "none" }}>{emoji}</button>);
              })}
            </div>
          </div>

          {/* ── MY DAY ── */}
          {(() => {
            var todayIdx = new Date().getDay();
            var dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
            var dayFullKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
            var todayKey = dayKeys[todayIdx];
            var todayFull = dayFullKeys[todayIdx];
            var todayLabel = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][todayIdx];

            /* ── Eating data — check both abbreviated (sun) and full (sunday) keys ── */
            var rawAbbr = meals[todayKey]; var rawFull = meals[todayFull];
            var abbrObj = (typeof rawAbbr === "object" && rawAbbr !== null) ? rawAbbr : (rawAbbr ? { d: rawAbbr } : {});
            var fullObj = (typeof rawFull === "object" && rawFull !== null) ? rawFull : (rawFull ? { d: rawFull } : {});
            var dayMealsObj = Object.assign({}, abbrObj, fullObj);
            var allBfHome = [].concat(BREAKFASTS, customBreakfasts, DEFAULT_BREAKFASTS);
            var allLuHome = [].concat(LUNCHES, customLunches, DEFAULT_LUNCHES);
            var allDinHome = [].concat(DINNERS, customMeals, DEFAULT_DINNERS_GB);
            var allSnHome = [].concat(SNACKS, customSnacks);
            var allDrHome = [].concat(customDrinks);
            var allDeHome = [].concat(customDesserts);
            var allFoodHome = [].concat(allBfHome, allLuHome, allDinHome, allSnHome, allDrHome, allDeHome);
            var findFood = function(id) { if (!id || id === "__empty__") return null; var f = allFoodHome.find(function(x) { return x.id === id; }); if (f) return f.name; /* Format raw IDs: replace underscores, title case */ return id.replace(/_/g, " ").replace(/\b\w/g, function(c) { return c.toUpperCase(); }); };

            var bfName = findFood(dayMealsObj.b);
            var luName = findFood(dayMealsObj.l);
            var dinName = findFood(dayMealsObj.d);
            var snackNames = [];
            for (var oi = 1; oi <= 20; oi++) { var sn = findFood(dayMealsObj["o" + oi]); if (sn) snackNames.push(sn); }
            var drinkNames = [];
            var drId = findFood(dayMealsObj.dr);
            if (drId) drinkNames.push(drId);
            for (var dri = 2; dri <= 5; dri++) { var drn = findFood(dayMealsObj["dr" + dri]); if (drn) drinkNames.push(drn); }

            var eatSlots = [
              { label: "Breakfast", value: bfName },
              { label: "Lunch", value: luName },
              { label: "Dinner", value: dinName },
              { label: "Snacks", value: snackNames.length > 0 ? snackNames.join(", ") : null },
              { label: "Drinks", value: drinkNames.length > 0 ? drinkNames.join(", ") : null }
            ];

            /* ── Exercise data ── */
            var todayExercises = p.exercises && p.exercises[todayFull] ? p.exercises[todayFull] : [];
            var sessionNum = todayFull === "sunday" ? "1" : todayFull === "monday" ? "2" : todayFull === "friday" ? "3" : null;

            /* ── Render My Eating sub-panel ── */
            var renderEating = function() {
              return (<div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", padding: "8px 10px", background: "transparent", borderBottom: "1px solid #cbd5e1", borderRadius: "8px 8px 0 0" }}>My Eating</div>
                <div style={{ padding: "6px 10px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ flex: 1 }}>
                  {eatSlots.map(function(slot) {
                    return (<div key={slot.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #f8fafc" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", width: 55 }}>{slot.label}</div>
                      <div style={{ fontSize: 11, color: slot.value ? "#334155" : "#cbd5e1", fontStyle: slot.value ? "normal" : "italic", flex: 1, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slot.value || "—"}</div>
                    </div>);
                  })}
                  </div>
                  <button onClick={function() { setSection("meals"); setEatDay(todayFull); }} style={{ ...btnMT, width: "100%", justifyContent: "center", marginTop: 6, gap: 4, fontSize: 11, background: accentVariant(accent, 85) }}><span style={{ fontSize: 11 }}>🍽️</span> Open</button>
                </div>
              </div>);
            };

            /* ── Render My Exercises sub-panel ── */
            var renderExercises = function() {
              return (<div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", padding: "8px 10px", background: "transparent", borderBottom: "1px solid #cbd5e1", borderRadius: "8px 8px 0 0" }}>My Exercises</div>
                <div style={{ padding: "6px 10px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ flex: 1 }}>
                  {todayExercises.length === 0 && <div style={{ fontSize: 11, color: "#cbd5e1", fontStyle: "italic", padding: "4px 0" }}>No exercises planned</div>}
                  {sessionNum && todayExercises.length > 0 && <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", padding: "2px 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Session {sessionNum}</div>}
                  {todayExercises.slice(0, 5).map(function(ex, i) {
                    return (<div key={i} style={{ fontSize: 11, color: "#334155", padding: "3px 0", borderBottom: "1px solid #f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name || ex}</div>);
                  })}
                  {todayExercises.length > 5 && <div style={{ fontSize: 10, color: "#94a3b8", padding: "2px 0" }}>+{todayExercises.length - 5} more</div>}
                  </div>
                  <button onClick={function() { setSection("weights"); setExerciseDay(todayFull); }} style={{ ...btnMT, width: "100%", justifyContent: "center", marginTop: 6, gap: 4, fontSize: 11, background: accentVariant(accent, 85) }}><span style={{ fontSize: 11 }}>🏋️</span> Open</button>
                </div>
              </div>);
            };

            return (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 14, overflow: "hidden" }}>
              <button onClick={function() { setShowMyDay(!showMyDay); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "none", border: "none", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>My Day</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{todayLabel}</span>
                </div>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{showMyDay ? "▲" : "▼"}</span>
              </button>
              {showMyDay && (<div style={{ padding: "0 12px 12px" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                  <div style={{ flex: 1, background: accentLight, borderRadius: 8, border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", overflow: "hidden" }}>{renderEating()}</div>
                  <div style={{ flex: 1, background: accentLight, borderRadius: 8, border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", overflow: "hidden" }}>{renderExercises()}</div>
                </div>
              </div>)}
            </div>);
          })()}

          {/* ── MY JOURNAL ── */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 14, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>My Journal</span>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>{(() => { var todayEntries = journalEntries.filter(function(e) { return e.date === new Date().toISOString().split("T")[0]; }); return todayEntries.length > 0 ? todayEntries.length + " today" : ""; })()}</span>
              </div>
            </div>
            <div style={{ margin: "0 12px 12px", background: accentLight, borderRadius: 8, border: "1px solid " + accentBorder, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Journal Entry</div>
              <textarea value={journalText} onChange={function(e) { setJournalText(e.target.value); }} placeholder="How are you feeling? What's on your mind today..." style={{ width: "100%", minHeight: 60, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, lineHeight: 1.5, color: "#334155", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", background: "#fff" }} />
              <button onClick={async function() {
                if (!journalText.trim()) return;
                var todayStr = new Date().toISOString().split("T")[0];
                var newEntry = { id: Date.now().toString(), date: todayStr, text: journalText.trim(), mood: dailyMood ? dailyMood.mood : null, ts: new Date().toISOString() };
                var updated = [newEntry].concat(journalEntries);
                setJournalEntries(updated);
                setJournalText("");
                await sSet("journal_" + activeTab, JSON.stringify(updated));
                /* Mood face persists — NOT consumed on journal add. Resets only on new day or user tap. */
                setFormMsg("✓ Journal entry added");
                setTimeout(function() { setFormMsg(""); }, 3000);
              }} disabled={!journalText.trim()} style={{ ...btnMuted, width: "100%", justifyContent: "center", marginTop: 8, padding: "6px 8px", cursor: journalText.trim() ? "pointer" : "not-allowed", opacity: journalText.trim() ? 1 : 0.5 }}>+ Add Journal Entry</button>

            {/* Recent entries (last 4) */}
            {journalEntries.length > 0 && (<div style={{ borderTop: "1px solid #e2e8f0", marginTop: 10 }}>
              <button onClick={function() { setShowRecentJournal(!showRecentJournal); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", background: "none", border: "none", cursor: "pointer" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Recent Entries</span>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>{showRecentJournal ? "▲" : "▼"}</span>
              </button>
              {showRecentJournal && (<div>
                {journalEntries.slice(0, 4).map(function(entry) {
                  var entryDate = new Date(entry.ts || entry.date);
                  var dateLabel = entryDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                  var timeLabel = entry.ts ? new Date(entry.ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
                  return (<div key={entry.id} style={{ padding: "8px 10px", marginBottom: 6, background: "#f1f5f9", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {entry.mood !== null && entry.mood !== undefined && <span style={{ fontSize: 13 }}>{MOOD_EMOJIS[entry.mood]}</span>}
                        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{dateLabel}{timeLabel ? " · " + timeLabel : ""}</span>
                      </div>
                      <button onClick={async function() {
                        if (!window.confirm("Delete this journal entry? This can't be undone.")) return;
                        var updated = journalEntries.filter(function(e) { return e.id !== entry.id; });
                        setJournalEntries(updated);
                        await sSet("journal_" + activeTab, JSON.stringify(updated));
                      }} style={btnDelete} title="Delete entry">🗑 Del</button>
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: "#334155", whiteSpace: "pre-wrap" }}>{entry.text}</div>
                  </div>);
                })}
              </div>)}
            </div>)}

            {/* Full history */}
            {journalEntries.length > 4 && (<div style={{ borderTop: "1px solid #e2e8f0" }}>
              <button onClick={function() { setShowFullJournal(!showFullJournal); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", background: "none", border: "none", cursor: "pointer" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Full History ({journalEntries.length} entries)</span>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>{showFullJournal ? "▲" : "▼"}</span>
              </button>
              {showFullJournal && (<div style={{ maxHeight: 400, overflowY: "auto" }}>
                {journalEntries.slice(4).map(function(entry) {
                  var entryDate = new Date(entry.ts || entry.date);
                  var dateLabel = entryDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                  var timeLabel = entry.ts ? new Date(entry.ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
                  return (<div key={entry.id} style={{ padding: "8px 10px", marginBottom: 6, background: "#f1f5f9", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      {entry.mood !== null && entry.mood !== undefined && <span style={{ fontSize: 13 }}>{MOOD_EMOJIS[entry.mood]}</span>}
                      <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>{dateLabel}{timeLabel ? " · " + timeLabel : ""}</span>
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.5, color: "#64748b", whiteSpace: "pre-wrap" }}>{entry.text}</div>
                  </div>);
                })}
              </div>)}
            </div>)}
            </div>
          </div>

          <button onClick={generateFeedback} disabled={feedbackLoading} style={{ width: "100%", padding: 12, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: feedbackLoading ? "not-allowed" : "pointer", opacity: feedbackLoading ? 0.7 : 1, background: feedbackLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", marginBottom: 14 }}>{feedbackLoading ? <span>Generating, please wait <span className="loading-dots" dangerouslySetInnerHTML={{ __html: "<span>.</span><span>.</span><span>.</span>" }} /></span> : "My Companion Feedback"}</button>
          <button onClick={function(){setHomeFbExpanded(!homeFbExpanded);}} style={{width:"100%",padding:6,background:"none",border:"1px solid #e2e8f0",borderRadius:6,fontSize:11,color:"#64748b",cursor:"pointer",marginTop:4}}>{homeFbExpanded ? "▲ Hide Feedback" : "▼ Show Feedback"}</button>
          {homeFbExpanded && feedbackResults[activeTab] && (() => { const fb = feedbackResults[activeTab]; return (<div style={{ marginBottom: 14 }}><div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            {fb._when && <div style={{ padding: "6px 14px", background: "#f8fafc", fontSize: 10, color: "#94a3b8", borderBottom: "1px solid #e2e8f0" }}>Generated {fb._when} for {isJC ? "JC" : "Becks"}</div>}
            <div style={{ padding: "8px 14px", borderBottom: "1px solid #e2e8f0" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 14 }}>☕</span><span style={{ fontSize: 11, fontWeight: 700, color: "#1e3a5f" }}>Companion Check-in</span></div></div>
            {fb.chat ? (<div style={{ padding: "14px 16px" }}>{fb.chat.split("\n\n").map(function(para, pi) { return <p key={pi} style={{ fontSize: 12, lineHeight: 1.6, color: "#334155", margin: pi === 0 ? 0 : "10px 0 0 0" }}>{para}</p>; })}</div>) : (<div>
            <div style={{ padding: "12px 14px", background: "#e0f2fe", borderBottom: "1px solid #bae6fd" }}><div style={{ fontSize: 12, fontWeight: 700, color: "#0c4a6e" }}>What's going well</div>{fb.good?.map((g, i) => <div key={i} style={{ fontSize: 12, color: "#0c4a6e", marginTop: 4 }}>✓ {g}</div>)}</div>
            <div style={{ padding: "12px 14px", background: "#fef3c7", borderBottom: "1px solid #fcd34d" }}><div style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>Opportunities</div>{fb.opportunities?.map((o, i) => <div key={i} style={{ fontSize: 12, color: "#92400e", marginTop: 4 }}>→ {o}</div>)}</div>
            <div style={{ padding: "12px 14px", background: "#dbeafe" }}><div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af" }}>Focus next 2 weeks</div>{(Array.isArray(fb.focus) ? fb.focus : [fb.focus]).map((f, i) => <div key={i} style={{ fontSize: 12, color: "#1e40af", marginTop: 4 }}>★ {f}</div>)}</div>
            </div>)}
          </div>
          {renderThread(fb, "home", activeTab, updateHomeFb, activeTab)}
          </div>); })()}
          {feedbackHistory[activeTab] && feedbackHistory[activeTab].length > 0 && (<div style={{ marginBottom: 14, marginTop: 10, textAlign: "center" }}>
            <button onClick={() => setShowFbHistory(!showFbHistory)} style={{ fontSize: 11, color: "#64748b", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, padding: "6px 12px", cursor: "pointer", marginBottom: 8 }}>{showFbHistory ? "Hide" : "Show"} Feedback History ({feedbackHistory[activeTab].length})</button>
            {showFbHistory && feedbackHistory[activeTab].map((hb, hi) => (
              <div key={hi} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 8, overflow: "hidden", opacity: 0.8 }}>
                <div style={{ padding: "6px 12px", background: "#f8fafc", fontSize: 10, color: "#94a3b8", borderBottom: "1px solid #e2e8f0" }}>Generated {hb._when}</div>
                <div style={{ padding: "8px 12px", fontSize: 11 }}>
                  {hb.chat ? (<div style={{ color: "#334155", lineHeight: 1.5 }}>{hb.chat.split("\n\n").map(function(para, pi) { return <p key={pi} style={{ margin: pi === 0 ? 0 : "6px 0 0 0" }}>{para}</p>; })}</div>) : (<div>
                  <div style={{ color: "#0c4a6e", marginBottom: 4 }}>{(hb.good || []).map((g, gi) => <span key={gi}>✓ {g} </span>)}</div>
                  <div style={{ color: "#92400e", marginBottom: 4 }}>{(hb.opportunities || []).map((o, oi) => <span key={oi}>→ {o} </span>)}</div>
                  <div style={{ color: "#1e40af" }}>★ {Array.isArray(hb.focus) ? hb.focus.join("; ") : hb.focus}</div>
                  </div>)}
                </div>
                {hb._thread && hb._thread.length > 0 && <div style={{ padding: "6px 12px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>{latestFirst(hb._thread).map(function(m, mi) { return <div key={mi} style={{ fontSize: 11, color: m.role === "user" ? "#1e3a5f" : "#475569", marginBottom: 2 }}><span style={{ fontWeight: 600 }}>{m.role === "user" ? "You" : "Companion"}:</span> {m.text} {m.when ? <span style={{ fontSize: 9, color: "#94a3b8" }}>· {m.when}</span> : null}</div>; })}</div>}
                {!hb._thread && hb._comment && <div style={{ padding: "6px 12px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: 11, color: "#334155" }}>Response: {hb._comment} {hb._commentWhen ? "· " + hb._commentWhen : ""}</div>}
              </div>
            ))}
          </div>)}

        </div>
  );
}
