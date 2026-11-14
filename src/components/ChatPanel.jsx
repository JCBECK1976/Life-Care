import { btnClose } from "../constants/styles.js";
import LoadingDots from "./LoadingDots.jsx";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function ChatPanel({ ctx }) {
  const {
    accentBorder, accentChatUser, activeTab, askQuestion, qaHistory, qaLoading, qaMsg, qaOpen,
    setQaOpen, setShowQaHistory, showQaHistory
  } = ctx;

  return (<>
{qaOpen && <div style={{ position: "fixed", bottom: 0, right: 0, left: 0, top: 0, zIndex: 1001 }}>
        <div onClick={() => setQaOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "75vh", background: "#fff", borderRadius: "16px 16px 0 0", boxShadow: "0 -4px 24px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Chat with your Companion</div>
            <button aria-label="Close chat" onClick={() => setQaOpen(false)} style={{...btnClose, fontSize: 14, padding: "4px 8px"}}>✕</button>
          </div>
          <div style={{ padding: "8px 16px 10px", overflowY: "auto", flex: 1 }}>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 10 }}>Ask anything about your health, training, nutrition, or progress. Your full data history is used to answer.</div>
            {qaHistory[activeTab] && qaHistory[activeTab].length > 0 && (<div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Conversation</div>
              {(showQaHistory ? qaHistory[activeTab] : qaHistory[activeTab].slice(-3)).slice().reverse().map(( /* v2.6.4 D8: latest exchange first */qa, i) => (<div key={i}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginBottom: 6 }}>
                  <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: "12px 12px 2px 12px", background: accentChatUser, border: "1px solid " + accentBorder, color: "#334155", fontSize: 12, lineHeight: 1.5 }}>{qa.q}</div>
                  <div style={{ fontSize: 9, color: "#475569", marginTop: 2, paddingLeft: 4, paddingRight: 4 }}>You{qa.when ? " · " + qa.when : ""}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: "12px 12px 12px 2px", background: "#334155", color: "#fff", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{qa.a}</div>
                  <div style={{ fontSize: 9, color: "#475569", marginTop: 2, paddingLeft: 4, paddingRight: 4 }}>Companion</div>
                </div>
              </div>))}
              {qaHistory[activeTab].length > 3 && <button onClick={() => setShowQaHistory(!showQaHistory)} style={{ fontSize: 11, color: "#475569", background: "none", border: "none", cursor: "pointer", padding: "0 0 8px" }}>{showQaHistory ? "Hide" : "Show"} older messages ({qaHistory[activeTab].length - 3})</button>}
            </div>)}
          </div>
          <div style={{ padding: "8px 16px 16px", borderTop: "1px solid #f1f5f9" }}>
            {qaMsg && <div style={{ marginBottom: 6, padding: 8, borderRadius: 6, background: qaMsg.startsWith("Error") ? "#fee2e2" : "#dbeafe", color: qaMsg.startsWith("Error") ? "#991b1b" : "#1e40af", fontSize: 11, fontWeight: 600 }}>{qaMsg}</div>}
            <div style={{ display: "flex", gap: 6 }}>
              <textarea id={"qa-input-" + activeTab} disabled={qaLoading} placeholder={qaHistory[activeTab] && qaHistory[activeTab].length > 0 ? "Continue the conversation..." : "e.g. Am I eating enough protein? What should I focus on next?"} style={{ flex: 1, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, resize: "vertical", minHeight: 40, boxSizing: "border-box", fontFamily: "inherit", opacity: qaLoading ? 0.6 : 1 }} />
              <button onClick={askQuestion} disabled={qaLoading} style={{ padding: "8px 14px", background: qaLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: qaLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>{qaLoading ? <LoadingDots /> : "Send"}</button>
            </div>
          </div>
        </div>
      </div>}
  </>);
}
