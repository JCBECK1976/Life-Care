import { COLOUR_THEMES } from "../constants/themes.js";
import { sSet } from "../lib/storage.js";
import { btnAction, btnClear, btnDelete, btnMuted, btnP, btnStop, inputStyle, labelStyle } from "../constants/styles.js";
import { DEFAULT_DATA } from "../constants/defaultData.js";
import AccountCard from "../components/AccountCard.jsx";
import AiUsageCard from "../components/AiUsageCard.jsx";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function SettingsSection({ ctx }) {
  const {
    accentBtnLight, activeTab, companionEnergy, connectGoogle, customMeasTypes, debugLog, debugMode, googleConnected,
    isAdmin, isJC, measInputs, setCustomMeasTypes, setSection, setDebugLog, setDebugMode, setFormMsg, setGoogleConnected,
    setGoogleToken, setMeasInputs, setUserColour, syncGoogleHealth, syncLoading, userColour
  } = ctx;

  return (
<div>
          
          

          {/* Colour Theme Picker */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>🎨 My Colour Theme</div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10, lineHeight: 1.4 }}>Personalise your app with your chosen colour. This changes your highlighted tabs, info boxes, and accent colours throughout.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(COLOUR_THEMES).map(function(pair) { var key = pair[0]; var theme = pair[1]; var isActive = userColour === key || (!userColour && ((isJC && key === "blue") || (!isJC && key === "purple"))); return (<button key={key} onClick={async function() { setUserColour(key); await sSet("user_colour_" + activeTab, key); }} style={{ width: 60, padding: "8px 0", borderRadius: 8, border: isActive ? "2px solid " + theme.accent : "2px solid #e2e8f0", background: theme.light, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "all 0.2s ease" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: theme.accent }} />
                <div style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, color: isActive ? theme.accent : "#64748b" }}>{theme.label}</div>
              </button>); })}
            </div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Data Admin</div>

          {/* Google Health Connect */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid " + (googleConnected ? "#86efac" : "#e2e8f0"), padding: 14, marginTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>📱 Google Health Connect</div>
            <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, marginBottom: 8 }}>
              <strong>Android Only</strong> — Syncs body composition and activity data from your phone via Google Health Connect.<br/>
              <strong>Setup:</strong> 1) Download <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata" target="_blank" style={{ color: "#2563eb" }}>Google Health Connect</a> from Play Store. 2) Open it and connect your Fitdays / health apps. 3) Tap Connect below.
            </div>
            {googleConnected ? (
              <div>
                <div style={{ padding: 8, background: "#e0f2fe", borderRadius: 6, fontSize: 11, color: "#0c4a6e", fontWeight: 600, marginBottom: 8 }}>✓ Connected to Google Health</div>
                <button onClick={syncGoogleHealth} disabled={syncLoading} style={{ width: "100%", padding: 10, background: syncLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: syncLoading ? "not-allowed" : "pointer" }}>{syncLoading ? <span>Syncing, please wait <span className="loading-dots" dangerouslySetInnerHTML={{ __html: "<span>.</span><span>.</span><span>.</span>" }} /></span> : "🔄 Sync Google Health Data"}</button>
                <button onClick={function() { setGoogleConnected(false); setGoogleToken(null); sSet("google_token_" + activeTab, ""); }} style={{...btnStop, width: "100%", marginTop: 4}}>⏹ Disconnect</button>
              </div>
            ) : (
              <button onClick={connectGoogle} style={{ width: "100%", padding: 10, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>🔗 Connect Google Health</button>
            )}
          </div>

          {/* Apple Health Integration */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14, opacity: 0.7 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>🍎 Apple Health</div>
            <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, marginBottom: 8 }}>
              <strong>iOS Only</strong> — Syncs body composition, activity, and health data from Apple Health on your iPhone.<br/>
              <strong>Status:</strong> Integration coming soon. Apple Health will sync steps, weight, body measurements, heart rate, and workout data.
            </div>
            <button disabled style={{ width: "100%", padding: 10, background: "#e2e8f0", color: "#94a3b8", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>🔗 Connect Apple Health — Coming Soon</button>
          </div>

          {/* v2.14.0 item 9: AI usage ledger — Admin only */}
          {isAdmin && <AiUsageCard />}

          {/* API Key — Admin only */}
          {isAdmin && (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>🔑 API Keys</div>
            <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.5, marginBottom: 8 }}>Required for AI features. Get your Claude key from <strong>console.anthropic.com</strong> → API Keys.</div>
            <label style={labelStyle}>Claude API Key</label>
            <input type="password" id="api-key-input" defaultValue="" placeholder="sk-ant-api03-..." style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, fontFamily: "monospace", boxSizing: "border-box", marginBottom: 6 }} />
            <button onClick={async function() { var key = document.getElementById("api-key-input").value.trim(); if (!key) return; await sSet("anthropic_api_key", key); window._anthropicKey = key; setFormMsg("✓ Claude API key saved"); setTimeout(function() { setFormMsg(""); }, 3000); }} style={{ ...btnP(), width: "100%", marginBottom: 10 }}>Save Claude Key</button>
            <label style={labelStyle}>Google OAuth Client ID (for Health Connect)</label>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>From Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID</div>
            <input type="text" id="google-client-id-input" defaultValue="" placeholder="xxxx.apps.googleusercontent.com" style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, fontFamily: "monospace", boxSizing: "border-box", marginBottom: 6 }} />
            <button onClick={async function() { var gid = document.getElementById("google-client-id-input").value.trim(); if (!gid) return; await sSet("google_client_id", gid); setFormMsg("✓ Google Client ID saved"); setTimeout(function() { setFormMsg(""); }, 3000); }} style={{ ...btnP(), width: "100%" }}>Save Google Client ID</button>
          </div>)}

          {/* Reset to Defaults — Admin only */}
          {isAdmin && (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>⚡ Companion Energy Level</div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8, lineHeight: 1.4 }}>After topping up credit at console.anthropic.com, enter the new balance in US dollars. That amount becomes 100% and $0 is 0%. Users only ever see the percentage.{companionEnergy && companionEnergy.initial ? " Current 100% level: $" + Number(companionEnergy.initial).toFixed(2) + (companionEnergy.calibratedAt ? " (set " + new Date(companionEnergy.calibratedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ")" : "") + "." : ""}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input id="energy-topup-input" type="number" step="0.01" min="0" placeholder="e.g. 10.00" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={async function() {
                var el = document.getElementById("energy-topup-input"); var amt = el ? parseFloat(el.value) : NaN;
                if (!(amt > 0)) { setFormMsg("Enter the balance after top-up, e.g. 10.00"); setTimeout(function(){ setFormMsg(""); }, 3000); return; }
                var en = Object.assign({}, companionEnergy || {}, { initial: amt, balance: amt, spent: 0, pct: 100, depleted: false, needsCalibration: false, calibratedAt: new Date().toISOString(), ledgerAtCalibration: await window.aiUsageTotal() /* v2.14.0 item 9 */, keyStatus: (companionEnergy && companionEnergy.keyStatus) || "active" });
                window._setCompanionEnergy(en); await sSet("companion_energy", JSON.stringify(en)); if (el) el.value = "";
                setFormMsg("✓ Companion Energy set to 100%"); setTimeout(function(){ setFormMsg(""); }, 3000);
              }} style={{ ...btnAction, padding: "8px 12px", fontSize: 12 }}>Set as 100%</button>
            </div>
          </div>)}
          {isAdmin && (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>⚠ Reset Data</div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>Overwrites Firebase with the clean default data. Use if data has become corrupted from bugs. This cannot be undone.</div>
            <button onClick={async function() { if (!confirm("This will reset ALL data to defaults. Are you sure?")) return; await sSet("life_care_data", JSON.stringify(DEFAULT_DATA)); setFormMsg("✓ Data reset to defaults — reload the app"); setTimeout(function() { setFormMsg(""); }, 5000); }} style={{...btnDelete, width: "100%", padding: 10, borderRadius: 8, fontSize: 12, fontWeight: 700}}>⚠ Reset to Default Data</button>
          </div>)}

          {/* Debug Mode — Admin only */}
          {isAdmin && (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>🔧 Debug Mode</div>
              <button onClick={function() { setDebugMode(!debugMode); if (!debugMode) setDebugLog([]); }} style={{ padding: "6px 14px", background: debugMode ? "#dc2626" : accentBtnLight, color: debugMode ? "#fff" : "#475569", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{debugMode ? "ON — Turn Off" : "Turn On"}</button>
            </div>
            {debugMode && (<div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 600, marginBottom: 6 }}>API calls will log raw responses here. Try My Companion Feedback or Ask a Question.</div>
              {debugLog.length === 0 && <div style={{ fontSize: 11, color: "#94a3b8", padding: 8 }}>No API calls yet.</div>}
              {debugLog.map(function(log, li) { return (<div key={li} style={{ padding: 8, background: li === 0 ? "#fef3c7" : "#f8fafc", borderRadius: 6, marginBottom: 4, fontSize: 10, fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{log.time} — {log.action}</div>
                {log.status !== undefined && <div>HTTP: <strong>{log.status} {log.statusText}</strong></div>}
                {log.data && <div style={{ color: "#475569", marginTop: 2 }}>{log.data}</div>}
              </div>); })}
              {customMeasTypes.map(function(mt) { return (
                <div key={mt} style={{ marginBottom: 6 }}><label style={labelStyle}>{mt} (cm)</label><input type="number" step="0.1" value={measInputs[mt] || ""} onChange={function(e) { setMeasInputs(function(q) { var n = Object.assign({}, q); n[mt] = e.target.value; return n; }); }} style={inputStyle} /></div>
              ); })}
              <button onClick={function() { var name = prompt("New measurement name (e.g. Forearm, Neck, Shoulders):"); if (name && name.trim()) { var updated = [].concat(customMeasTypes, [name.trim()]); setCustomMeasTypes(updated); sSet("custom_meas_types", JSON.stringify(updated)); } }} type="button" style={{ padding: "6px 12px", background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: 6, fontSize: 10, color: "#1e40af", cursor: "pointer", marginBottom: 8 }}>+ Add Measurement Type</button>

              {debugLog.length > 0 && <div style={{ marginTop: 8 }}><button onClick={function() { setDebugLog([]); }} style={{...btnClear, fontSize: 10, marginTop: 4}}>🗑 Clear Log</button></div>}
            </div>)}
          </div>)}

          {/* Data tools — Admin only (v2.2.0): opens the Firebase Data Viewer and recovery tools */}
          {isAdmin && (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>🗂 Data tools</div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>View the data stored in Firebase and use the recovery tools (restore missing weeks, restore from a Firebase export).</div>
            <button onClick={function() { setSection("data"); window.scrollTo(0, 0); }} style={{ ...btnMuted, width: "100%" }}>Open Data tools</button>
          </div>)}

          <AccountCard />
        </div>
  );
}
