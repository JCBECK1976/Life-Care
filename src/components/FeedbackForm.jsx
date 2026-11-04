import { btnP, btnS } from "../constants/styles.js";
import { APP_VERSION } from "../constants/version.js";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function FeedbackForm({ ctx }) {
  const {
    activeTab, feedbackOpen, feedbackSending, feedbackSent, feedbackText, feedbackType, setFeedbackOpen, setFeedbackSending,
    setFeedbackSent, setFeedbackText, setFeedbackType
  } = ctx;

  return (<>
<div style={{ padding: "8px 16px", textAlign: "center" }}>
        {!feedbackOpen && !feedbackSent && <button onClick={function(){ setFeedbackOpen(true); setFeedbackType("bug"); setFeedbackText(""); }} style={{ padding: "6px 16px", background: "none", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 10, fontWeight: 600, color: "#94a3b8", cursor: "pointer" }}>💬 Send Feedback</button>}
        {feedbackSent && <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, padding: 8 }}>✓ Feedback sent — thank you!</div>}
        {feedbackOpen && (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, textAlign: "left", marginTop: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Send Feedback</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button onClick={function(){ setFeedbackType("bug"); }} style={{ flex: 1, padding: "6px 10px", background: feedbackType === "bug" ? "#fef2f2" : "#f8fafc", border: "1px solid " + (feedbackType === "bug" ? "#fca5a5" : "#e2e8f0"), borderRadius: 6, fontSize: 11, fontWeight: 600, color: feedbackType === "bug" ? "#dc2626" : "#64748b", cursor: "pointer" }}>🐛 Bug</button>
            <button onClick={function(){ setFeedbackType("feature"); }} style={{ flex: 1, padding: "6px 10px", background: feedbackType === "feature" ? "#f0fdf4" : "#f8fafc", border: "1px solid " + (feedbackType === "feature" ? "#86efac" : "#e2e8f0"), borderRadius: 6, fontSize: 11, fontWeight: 600, color: feedbackType === "feature" ? "#16a34a" : "#64748b", cursor: "pointer" }}>✨ Feature</button>
          </div>
          <textarea value={feedbackText} onChange={function(e){ setFeedbackText(e.target.value); }} placeholder={feedbackType === "bug" ? "What were you trying to do when the issue occurred?" : "Describe the feature you'd like to see..."} style={{ width: "100%", minHeight: 80, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, resize: "vertical", boxSizing: "border-box", lineHeight: 1.4 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={async function(){
              if (!feedbackText.trim()) return;
              setFeedbackSending(true);
              try {
                var deviceInfo = "";
                try { deviceInfo = navigator.userAgent; } catch(e) { deviceInfo = "Unknown"; }
                var screenInfo = window.screen ? window.screen.width + "x" + window.screen.height : "Unknown";
                var emailBody = "Type: " + (feedbackType === "bug" ? "Bug Report" : "Feature Request") + "%0A%0A" + (feedbackType === "bug" ? "What I was trying to do:%0A" : "Feature description:%0A") + encodeURIComponent(feedbackText.trim()) + "%0A%0A--- Device Info ---%0AUser: " + (activeTab || "Unknown") + "%0ADevice: " + encodeURIComponent(deviceInfo) + "%0AScreen: " + screenInfo + "%0AApp Version: " + APP_VERSION;
                var emailSubject = encodeURIComponent("[Life Care " + (feedbackType === "bug" ? "Bug" : "Feature") + "] " + feedbackText.trim().substring(0, 50));
                window.open("mailto:jc.zaluski@gmail.com?subject=" + emailSubject + "&body=" + emailBody, "_self");
                setFeedbackOpen(false);
                setFeedbackSent(true);
                setTimeout(function(){ setFeedbackSent(false); }, 4000);
              } catch(e) { alert("Could not open email client. Please email jc.zaluski@gmail.com directly."); }
              setFeedbackSending(false);
            }} disabled={feedbackSending || !feedbackText.trim()} style={{ ...btnP(!!feedbackText.trim()), flex: 1 }}>{feedbackSending ? "Sending..." : "Send Feedback"}</button>
            <button onClick={function(){ setFeedbackOpen(false); }} style={btnS}>Cancel</button>
          </div>
        </div>)}
      </div>
  </>);
}
