import { btnClose } from "../constants/styles.js";
import LoadingDots from "./LoadingDots.jsx";
import ChatThread from "./ChatThread.jsx";
import { qaToMessages } from "../lib/memory.js";

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
          <div style={{ padding: "8px 16px 8px", borderBottom: "1px solid #f1f5f9" }}>   {/* v2.20.0: input at the top, above the newest message */}
            {qaMsg && <div style={{ marginBottom: 6, padding: 8, borderRadius: 6, background: qaMsg.startsWith("Error") ? "#fee2e2" : "#dbeafe", color: qaMsg.startsWith("Error") ? "#991b1b" : "#1e40af", fontSize: 11, fontWeight: 600 }}>{qaMsg}</div>}
            <div style={{ display: "flex", gap: 6 }}>
              <textarea id={"qa-input-" + activeTab} disabled={qaLoading} placeholder={qaHistory[activeTab] && qaHistory[activeTab].length > 0 ? "Continue the conversation..." : "e.g. Am I eating enough protein? What should I focus on next?"} style={{ flex: 1, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, resize: "vertical", minHeight: 40, boxSizing: "border-box", fontFamily: "inherit", opacity: qaLoading ? 0.6 : 1 }} />
              <button onClick={askQuestion} disabled={qaLoading} style={{ padding: "8px 14px", background: qaLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: qaLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>{qaLoading ? <LoadingDots /> : "Send"}</button>
            </div>
          </div>
          <div style={{ padding: "8px 16px 10px", overflowY: "auto", flex: 1 }}>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 10 }}>Ask anything about your health, training, nutrition, or progress. Your full data history is used to answer.</div>
            {qaHistory[activeTab] && qaHistory[activeTab].length > 0 && (<div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Conversation</div>
              <ChatThread messages={qaToMessages(showQaHistory ? qaHistory[activeTab] : qaHistory[activeTab].slice(-3))} userBg={accentChatUser} userBorder={accentBorder} testid="qa-thread" />   {/* v2.20.0: newest message first */}
              {qaHistory[activeTab].length > 3 && <button onClick={() => setShowQaHistory(!showQaHistory)} style={{ fontSize: 11, color: "#475569", background: "none", border: "none", cursor: "pointer", padding: "0 0 8px" }}>{showQaHistory ? "Hide" : "Show"} older messages ({qaHistory[activeTab].length - 3})</button>}
            </div>)}
          </div>
        </div>
      </div>}
  </>);
}
