import { COLOUR_THEMES } from "../constants/themes.js";
import { forgetToken, ghStatus } from "../lib/googleHealth.js";
import LoadingDots from "../components/LoadingDots.jsx";
import { sSet } from "../lib/storage.js";
import { btnAction, btnClear, btnOpen, btnP, btnStop, inputStyle, labelStyle } from "../constants/styles.js";
import firebase, { DATA_ROOT } from "../lib/firebase.js";
import { APP_ENV, APP_VERSION } from "../constants/version.js";
import { saveDebugMode } from "../lib/debugLog.js";
import AccountCard from "../components/AccountCard.jsx";
import PrivacyDataCard from "../components/PrivacyDataCard.jsx";
import { auditLog } from "../lib/audit.js";
import AiUsageCard from "../components/AiUsageCard.jsx";
import Tracker from "../components/Tracker.jsx";
import ContactEmailCard from "../components/ContactEmailCard.jsx";
import { DOCS_INDEX, VAULT_DOCS } from "../constants/docsIndex.js";

// v2.15.0 C: admin sections. "Reset to Default Data" was removed (recovery = Download backup + Restore).
var REPO = "https://github.com/JCBECK1976/Life-Care";
var DOC = REPO + "/blob/main/";
var PAGES = "https://jcbeck1976.github.io/Life-Care/";
var PROJECT = (function() { try { return firebase.app().options.projectId; } catch (e) { return ""; } })();
var card = { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 8, marginBottom: 14 };
function AdminSection(props) {
  return (<div data-testid={"admin-section-" + props.id} style={{ marginTop: 22, paddingTop: 10, borderTop: "2px solid #e2e8f0" }}>
    <div role="heading" aria-level={3} style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{props.title}</div>
    <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.5, marginTop: 2 }}>{props.help}</div>
  </div>);
}
function InfoRow(props) { return <div style={{ display: "flex", gap: 8, fontSize: 11, padding: "2px 0" }}><span style={{ color: "#475569", width: 96, flexShrink: 0 }}>{props.k}</span><span style={{ color: "#0f172a", fontWeight: 600, minWidth: 0, overflowWrap: "anywhere" }}>{props.v}</span></div>; }
function Links(props) { return <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>{props.items.map(function(l) { return <a key={l[0]} href={l[1]} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 600, border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 6, padding: "4px 8px", textDecoration: "none" }}>{l[0]}</a>; })}</div>; }

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function SettingsSection({ ctx }) {
  const {
    data, saveData, accentBtnLight, activeTab, companionEnergy, connectGoogle, customMeasTypes, debugLog, debugMode, googleConnected,
    isAdmin, isJC, measInputs, setCustomMeasTypes, setSection, setDebugLog, setDebugMode, setFormMsg, setGoogleConnected,
    setGoogleToken, setMeasInputs, setUserColour, syncGoogleHealth, syncLoading, userColour
  } = ctx;

  return (
<div>
          
          

          {/* Colour Theme Picker */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>🎨 My Colour Theme</div>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 10, lineHeight: 1.4 }}>Personalise your app with your chosen colour. This changes your highlighted tabs, info boxes, and accent colours throughout.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(COLOUR_THEMES).map(function(pair) { var key = pair[0]; var theme = pair[1]; var isActive = userColour === key || (!userColour && ((isJC && key === "blue") || (!isJC && key === "purple"))); return (<button key={key} onClick={async function() { setUserColour(key); await sSet("user_colour_" + activeTab, key); }} style={{ width: 60, padding: "8px 0", borderRadius: 8, border: isActive ? "2px solid " + theme.accent : "2px solid #e2e8f0", background: theme.light, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "all 0.2s ease" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: theme.accent }} />
                <div style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, color: isActive ? "#0f172a" : "#475569" }}>{theme.label}</div>
              </button>); })}
            </div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Data Admin</div>

          {/* v2.16.2 R4: Google Health (cloud API), rebuilt — token on this device only, honest status */}
          {(function() { var gp = data && data[activeTab]; var st = ghStatus(activeTab, gp); return (
          <div data-testid="gh-card" style={{ background: "#fff", borderRadius: 12, border: "1px solid " + (googleConnected ? "#86efac" : "#e2e8f0"), padding: 14, marginTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>📱 Google Health — calories burned</div>
            <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5, marginBottom: 8 }}>
              Reads your <b>daily total calories burned</b> for this week (Sunday–Saturday) from your Google account, so your calorie target can follow what you actually burn. Only the daily totals are saved; the Google sign-in stays on this device.
            </div>
            <div data-testid="gh-status" role="status" style={{ padding: 8, background: st.lastSync && st.lastSync.error ? "#fee2e2" : googleConnected ? "#e0f2fe" : "#f1f5f9", borderRadius: 6, fontSize: 11, color: st.lastSync && st.lastSync.error ? "#991b1b" : "#0c4a6e", fontWeight: 600, marginBottom: 8 }}>{st.text}</div>
            {googleConnected ? (
              <div>
                <button onClick={syncGoogleHealth} disabled={syncLoading} style={{ width: "100%", padding: 10, background: syncLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: syncLoading ? "not-allowed" : "pointer" }}>{syncLoading ? <span>Syncing, please wait <LoadingDots /></span> : "🔄 Sync this week's calories"}</button>
                <button onClick={function() { forgetToken(activeTab); setGoogleConnected(false); setGoogleToken(null); }} style={{...btnStop, width: "100%", marginTop: 4}}>⏹ Disconnect on this device</button>
              </div>
            ) : (
              <button onClick={connectGoogle} style={{ width: "100%", padding: 10, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>🔗 Connect Google Health</button>
            )}
          </div>); })()}

          {/* Apple Health Integration */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>🍎 Apple Health</div>
            <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5, marginBottom: 8 }}>
              <strong>iOS Only</strong> — Syncs body composition, activity, and health data from Apple Health on your iPhone.<br/>
              <strong>Status:</strong> Integration coming soon. Apple Health will sync steps, weight, body measurements, heart rate, and workout data.
            </div>
            <button disabled style={{ width: "100%", padding: 10, background: "#e2e8f0", color: "#475569", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>🔗 Connect Apple Health — Coming Soon</button>
          </div>

          {/* v2.15.0 C: admin Settings in clear sections, each with short helper text */}
          {isAdmin && <AdminSection id="app-ai" title="App & AI" help="The Claude key, Companion Energy, what the AI has used, where feedback emails go, and Debug Mode." />}
          {/* API Key — Admin only */}
          {isAdmin && (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>🔑 API Keys</div>
            <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.5, marginBottom: 8 }}>Required for AI features. Get your Claude key from <strong>console.anthropic.com</strong> → API Keys.</div>
            <label style={labelStyle}>Claude API Key</label>
            <input type="password" id="api-key-input" defaultValue="" placeholder="sk-ant-api03-..." style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, fontFamily: "monospace", boxSizing: "border-box", marginBottom: 6 }} />
            <button onClick={async function() { var key = document.getElementById("api-key-input").value.trim(); if (!key) return; await sSet("anthropic_api_key", key); window._anthropicKey = key; setFormMsg("✓ Claude API key saved"); setTimeout(function() { setFormMsg(""); }, 3000); }} style={{ ...btnP(), width: "100%", marginBottom: 10 }}>Save Claude Key</button>
          </div>)}
          {isAdmin && (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>⚡ Companion Energy Level</div>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 8, lineHeight: 1.4 }}>After topping up credit at console.anthropic.com, enter the new balance in US dollars. That amount becomes 100% and $0 is 0%. Users only ever see the percentage.{companionEnergy && companionEnergy.initial ? " Current 100% level: $" + Number(companionEnergy.initial).toFixed(2) + (companionEnergy.calibratedAt ? " (set " + new Date(companionEnergy.calibratedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ")" : "") + "." : ""}</div>
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
          {/* v2.14.0 item 9: AI usage ledger — Admin only */}
          {isAdmin && <AiUsageCard />}
          {isAdmin && <ContactEmailCard />}
          {/* Debug Mode — Admin only */}
          {isAdmin && (<div data-testid="debug-mode" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>🔧 Debug Mode</div>
              <button onClick={function() { var on = !debugMode; setDebugMode(on); saveDebugMode(on); if (on) setDebugLog([]); }} style={{ padding: "6px 14px", background: debugMode ? "#dc2626" : accentBtnLight, color: debugMode ? "#fff" : "#475569", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{debugMode ? "ON — Turn Off" : "Turn On"}</button>
            </div>
            <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.5, marginTop: 4 }}>Logs a safe summary of Home check-in feedback, eating feedback and Ask a Question calls on this device: HTTP status, stop reason and token counts. Never the question, the reply or keys. Stays on (red 🔧 DEBUG ON badge in the header) until you turn it off; the log clears on reload.</div>
            {debugMode && (<div data-testid="debug-panel" style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: "#b91c1c", fontWeight: 600, marginBottom: 6 }}>Debug Mode is ON. Try My Companion Feedback or Ask a Question.</div>
              {debugLog.length === 0 && <div style={{ fontSize: 11, color: "#475569", padding: 8 }}>No API calls yet.</div>}
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


          {isAdmin && <AdminSection id="data" title="Data & backups" help="Each opens the Data tools page at that tool. Recovery is Download backup, then Restore." />}
          {isAdmin && (<div data-testid="data-links" style={card}>
            {[["backup", "⬇️ Download backup", "Saves all data to a file on this device."], ["restore-export", "♻️ Restore", "Paste a backup file: preview, then Merge (safe) or Full restore."], ["data-viewer", "🗂 Data viewer", "Read-only view of the stored data and raw keys."]].map(function(r) { return (<div key={r[0]} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{r[1]}</div><div style={{ fontSize: 10, color: "#475569" }}>{r[2]}</div></div>
              <button aria-label={"Open " + r[1].replace(/^\S+\s/, "")} onClick={function() { window._lcDataFocus = r[0]; setSection("data"); window.scrollTo(0, 0); }} style={btnOpen}>Open</button>
            </div>); })}
          </div>)}

          {isAdmin && <AdminSection id="firebase" title="Firebase" help="Where the data and sign-in live. Rules and data are changed only in the Firebase console, never from here." />}
          {isAdmin && (<div data-testid="firebase-info" style={card}>
            <InfoRow k="Project" v={PROJECT} />
            <InfoRow k="This app's data" v={DATA_ROOT + (DATA_ROOT === "data" ? " (real data, shared by the app and beta)" : " (Build's own copy)")} />
            <InfoRow k="Sign-in" v="Google, allowed accounts only (database rules)" />
            <Links items={[["Database", "https://console.firebase.google.com/project/" + PROJECT + "/database"], ["Rules", "https://console.firebase.google.com/project/" + PROJECT + "/database/" + PROJECT + "-default-rtdb/rules"], ["Sign-in users", "https://console.firebase.google.com/project/" + PROJECT + "/authentication/users"]]} />
            <div style={{ fontSize: 10, color: "#475569", marginTop: 6, lineHeight: 1.5 }}>Emergency: if sign-in breaks, the rules can be reopened in the console (runbook in the vault).</div>
          </div>)}

          {isAdmin && <AdminSection id="github" title="GitHub & releases" help="Changes go build → beta → main. Build is checked by the Architect, beta is tested by JC, then released to the app." />}
          {isAdmin && (<div data-testid="github-info" style={card}>
            <InfoRow k="This version" v={APP_VERSION + " (" + APP_ENV + ")"} />
            <Links items={[["Repository", REPO], ["Deploys (Actions)", REPO + "/actions"], ["Releases / tags", REPO + "/tags"], ["Changelog", DOC + "docs/CHANGELOG.md"]]} />
            <Links items={[["App", PAGES], ["Beta", PAGES + "beta/"], ["Build", PAGES + "build/"]]} />
          </div>)}

          {isAdmin && <AdminSection id="integrations" title="Integrations" help="Settings for outside services. Each person connects Google Health themselves in the card above." />}
          {isAdmin && (<div data-testid="integrations" style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>🔗 Google</div>
            <label style={labelStyle}>Google OAuth Client ID (for Health Connect)</label>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>From Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID</div>
            <input type="text" id="google-client-id-input" defaultValue="" placeholder="xxxx.apps.googleusercontent.com" style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, fontFamily: "monospace", boxSizing: "border-box", marginBottom: 6 }} />
            <button onClick={async function() { var gid = document.getElementById("google-client-id-input").value.trim(); if (!gid) return; await sSet("google_client_id", gid); setFormMsg("✓ Google Client ID saved"); setTimeout(function() { setFormMsg(""); }, 3000); }} style={{ ...btnP(), width: "100%" }}>Save Google Client ID</button>
          </div>)}

          {isAdmin && <AdminSection id="tracker" title="Tracker" help="Feedback, defects, features and the plan in one list." />}
          {/* v2.14.0 item 10: Feedback, Defect & Feature tracker — Admin only */}
          {isAdmin && <Tracker person={activeTab} />}

          {isAdmin && <AdminSection id="docs" title="Documentation" help="Public documents are in the repository. Private ones are in the vault and are not linked here." />}
          {isAdmin && (<div data-testid="docs-links" style={card}>
            {DOCS_INDEX.map(function(g) { return (<div key={g.group} data-testid={"docs-group"} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: g.draft ? "#9a3412" : "#334155" }}>{g.group}</div>
              <Links items={g.docs.map(function(d) { return [d[0], d[1].indexOf("@pages:") === 0 ? PAGES + d[1].slice(7) : DOC + d[1]]; })} />
            </div>); })}
            <div data-testid="vault-docs" style={{ fontSize: 10, color: "#475569", marginTop: 6, lineHeight: 1.5 }}><b>Private, in the vault (not linked):</b><ul style={{ margin: "2px 0 0", paddingLeft: 16 }}>{VAULT_DOCS.map(function(v) { return <li key={v}>{v}</li>; })}</ul></div>
          </div>)}

          <PrivacyDataCard person={activeTab} name={(data && data[activeTab] && data[activeTab].profile && data[activeTab].profile.name) || activeTab} isAdmin={isAdmin} />
          <AccountCard />
        </div>
  );
}
