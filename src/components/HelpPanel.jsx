import { useDialog } from "../lib/a11y.js";
import { btnClose } from "../constants/styles.js";
import LoadingDots from "./LoadingDots.jsx";
import ChatThread from "./ChatThread.jsx";
import { qaToMessages } from "../lib/memory.js";
import { planAllows, usePlan } from "../lib/myPlan.js";
import HelpFaq from "./HelpFaq.jsx";
import HowItWorks from "./HowItWorks.jsx";
import { GatePrompt } from "./PlanGate.jsx";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function HelpPanel({ ctx }) {
  const {
    accentBorder, accentChatUser, activeTab, askHelp, helpHistory, helpLoading, helpMsg, helpOpen,
    setHelpOpen, setShowHelpHistory, showHelpHistory
  } = ctx;
  usePlan();   /* v2.22.0: re-render when the plan changes */
  const dlgRef = useDialog(!!(helpOpen), () => setHelpOpen(false));   /* v2.20.0: Esc closes, focus kept inside */

  return (<>
{helpOpen && <div style={{ position: "fixed", bottom: 0, right: 0, left: 0, top: 0, zIndex: 1001 }}>
        <div onClick={() => setHelpOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
        <div ref={dlgRef} role="dialog" aria-modal="true" aria-label="Help — using the app" style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "75vh", background: "#fff", borderRadius: "16px 16px 0 0", boxShadow: "0 -4px 24px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Help — using the app</div>
            <button aria-label="Close help" onClick={() => setHelpOpen(false)} style={{...btnClose, fontSize: 14, padding: "4px 8px"}}>✕</button>
          </div>
          {/* v2.38.0 (brief P5a): one scrolling list — How Lifecare works (all plans, no AI), then the guide's FAQ (all plans;
              the whole of Help on Bronze), then Ask the Companion (AI Help, Silver and up). */}
          <div data-testid="help-scroll" style={{ padding: "8px 16px 12px", overflowY: "auto", flex: 1 }}>
            <details data-testid="help-how" style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
              <summary style={{ fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}>How Lifecare works</summary>
              <HowItWorks style={{ marginTop: 8 }} />
            </details>
            <HelpFaq embedded />
            <section data-testid="help-ask" aria-labelledby="help-ask-title" style={{ marginTop: 12, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
              <h3 id="help-ask-title" style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Ask the Companion</h3>
              {planAllows("aiHelp") ? (<>
          <div style={{ padding: "0 0 8px" }}>   {/* v2.20.0: input at the top, above the newest message */}
            {helpMsg && <div role="status" aria-live="polite" style={{ marginBottom: 6, padding: 8, borderRadius: 6, background: "#fee2e2", color: "#991b1b", fontSize: 11, fontWeight: 600 }}>{helpMsg}</div>}
            <div style={{ display: "flex", gap: 6 }}>
              <textarea id={"help-input-" + activeTab} disabled={helpLoading} placeholder={helpHistory[activeTab] && helpHistory[activeTab].length > 0 ? "Ask another question..." : "e.g. How do I add a food to my lists? What does AMBER mean? Where do I log my session?"} style={{ flex: 1, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, resize: "vertical", minHeight: 40, boxSizing: "border-box", fontFamily: "inherit", opacity: helpLoading ? 0.6 : 1 }} />
              <button onClick={askHelp} disabled={helpLoading} style={{ padding: "8px 14px", background: helpLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: helpLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>{helpLoading ? <LoadingDots /> : "Send"}</button>
            </div>
          </div>
          <div style={{ padding: "0 0 10px" }}>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 10 }}>Ask anything about using Lifecare Companion™ — where things are, what they mean, how to do something, or why it works the way it does.</div>
            {helpHistory[activeTab] && helpHistory[activeTab].length > 0 && (<div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Conversation</div>
              <ChatThread messages={qaToMessages(showHelpHistory ? helpHistory[activeTab] : helpHistory[activeTab].slice(-3))} userBg={accentChatUser} userBorder={accentBorder} testid="help-thread" />   {/* v2.20.0: newest message first */}
              {helpHistory[activeTab].length > 3 && <button onClick={() => setShowHelpHistory(!showHelpHistory)} style={{ fontSize: 11, color: "#475569", background: "none", border: "none", cursor: "pointer", padding: "0 0 8px" }}>{showHelpHistory ? "Hide" : "Show"} older messages ({helpHistory[activeTab].length - 3})</button>}
            </div>)}
          </div>
              </>) : <GatePrompt feature="aiHelp" />}
            </section>
          </div>
        </div>
      </div>}
  </>);
}
