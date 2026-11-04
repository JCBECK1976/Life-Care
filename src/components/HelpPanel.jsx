import { btnClose } from "../constants/styles.js";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function HelpPanel({ ctx }) {
  const {
    accentBorder, accentChatUser, activeTab, askHelp, helpHistory, helpLoading, helpMsg, helpOpen,
    setHelpOpen, setShowHelpHistory, showHelpHistory
  } = ctx;

  return (<>
{helpOpen && <div style={{ position: "fixed", bottom: 0, right: 0, left: 0, top: 0, zIndex: 1001 }}>
        <div onClick={() => setHelpOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "75vh", background: "#fff", borderRadius: "16px 16px 0 0", boxShadow: "0 -4px 24px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Help — using the app</div>
            <button onClick={() => setHelpOpen(false)} style={{...btnClose, fontSize: 14, padding: "4px 8px"}}>✕</button>
          </div>
          <div style={{ padding: "8px 16px 10px", overflowY: "auto", flex: 1 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>Ask anything about using Lifecare Companion™ — where things are, what they mean, how to do something, or why it works the way it does.</div>
            {helpHistory[activeTab] && helpHistory[activeTab].length > 0 && (<div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Conversation</div>
              {helpHistory[activeTab].length > 3 && <button onClick={() => setShowHelpHistory(!showHelpHistory)} style={{ fontSize: 11, color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: "0 0 8px" }}>{showHelpHistory ? "Hide" : "Show"} older messages ({helpHistory[activeTab].length - 3})</button>}
              {(showHelpHistory ? helpHistory[activeTab] : helpHistory[activeTab].slice(-3)).map((h, i) => (<div key={i}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginBottom: 6 }}>
                  <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: "12px 12px 2px 12px", background: accentChatUser, border: "1px solid " + accentBorder, color: "#334155", fontSize: 12, lineHeight: 1.5 }}>{h.q}</div>
                  <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2, paddingLeft: 4, paddingRight: 4 }}>You{h.when ? " · " + h.when : ""}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: "12px 12px 12px 2px", background: "#334155", color: "#fff", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{h.a}</div>
                  <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2, paddingLeft: 4, paddingRight: 4 }}>Companion</div>
                </div>
              </div>))}
            </div>)}
          </div>
          <div style={{ padding: "8px 16px 16px", borderTop: "1px solid #f1f5f9" }}>
            {helpMsg && <div style={{ marginBottom: 6, padding: 8, borderRadius: 6, background: "#fee2e2", color: "#991b1b", fontSize: 11, fontWeight: 600 }}>{helpMsg}</div>}
            <div style={{ display: "flex", gap: 6 }}>
              <textarea id={"help-input-" + activeTab} disabled={helpLoading} placeholder={helpHistory[activeTab] && helpHistory[activeTab].length > 0 ? "Ask another question..." : "e.g. How do I add a food to my lists? What does AMBER mean? Where do I log my session?"} style={{ flex: 1, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, resize: "vertical", minHeight: 40, boxSizing: "border-box", fontFamily: "inherit", opacity: helpLoading ? 0.6 : 1 }} />
              <button onClick={askHelp} disabled={helpLoading} style={{ padding: "8px 14px", background: helpLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: helpLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>{helpLoading ? <span className="loading-dots" dangerouslySetInnerHTML={{ __html: "<span>.</span><span>.</span><span>.</span>" }} /> : "Send"}</button>
            </div>
          </div>
        </div>
      </div>}
  </>);
}
