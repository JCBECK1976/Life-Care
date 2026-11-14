import React from "react";
import { btnP, btnS } from "../constants/styles.js";
import { APP_VERSION } from "../constants/version.js";
import { currentEmail, feedbackEntry, saveEntry } from "../lib/tracker.js";
import { loadContactEmail } from "../lib/contact.js";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function FeedbackForm({ ctx }) {
  const {
    activeTab, feedbackOpen, feedbackSending, feedbackSent, feedbackText, feedbackType, setFeedbackOpen, setFeedbackSending,
    setFeedbackSent, setFeedbackText, setFeedbackType
  } = ctx;
  /* v2.14.3: say plainly what Send Feedback does: always saved to the Tracker; with an address set, the email app opens
     pre-filled and the person must press Send there (the app cannot send email itself). */
  var _c = React.useState(""); var toAddr = _c[0]; var setToAddr = _c[1];
  var _d = React.useState(""); var doneMsg = _d[0]; var setDoneMsg = _d[1];
  React.useEffect(function() { if (feedbackOpen) loadContactEmail().then(setToAddr).catch(function() {}); }, [feedbackOpen, setToAddr]);

  return (<>
<div style={{ padding: "8px 16px", textAlign: "center" }}>
        {!feedbackOpen && !feedbackSent && <button onClick={function(){ setFeedbackOpen(true); setFeedbackType("bug"); setFeedbackText(""); }} style={{ padding: "6px 16px", background: "none", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 10, fontWeight: 600, color: "#475569", cursor: "pointer" }}>💬 Send Feedback</button>}
        {feedbackSent && <div data-testid="feedback-done" role="status" style={{ fontSize: 11, color: "#15803d", fontWeight: 600, padding: 8, lineHeight: 1.5 }}>{doneMsg || "✓ Saved to the Tracker for the app owner — thank you!"}</div>}
        {feedbackOpen && (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, textAlign: "left", marginTop: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Send Feedback</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button onClick={function(){ setFeedbackType("bug"); }} style={{ flex: 1, padding: "6px 10px", background: feedbackType === "bug" ? "#fef2f2" : "#f8fafc", border: "1px solid " + (feedbackType === "bug" ? "#fca5a5" : "#e2e8f0"), borderRadius: 6, fontSize: 11, fontWeight: 600, color: feedbackType === "bug" ? "#b91c1c" : "#475569", cursor: "pointer" }}>🐛 Bug</button>
            <button onClick={function(){ setFeedbackType("feature"); }} style={{ flex: 1, padding: "6px 10px", background: feedbackType === "feature" ? "#f0fdf4" : "#f8fafc", border: "1px solid " + (feedbackType === "feature" ? "#86efac" : "#e2e8f0"), borderRadius: 6, fontSize: 11, fontWeight: 600, color: feedbackType === "feature" ? "#15803d" : "#475569", cursor: "pointer" }}>✨ Feature</button>
          </div>
          <textarea value={feedbackText} onChange={function(e){ setFeedbackText(e.target.value); }} placeholder={feedbackType === "bug" ? "What were you trying to do when the issue occurred?" : "Describe the feature you'd like to see..."} style={{ width: "100%", minHeight: 80, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, resize: "vertical", boxSizing: "border-box", lineHeight: 1.4 }} />
          <div data-testid="feedback-how" style={{ fontSize: 10, color: "#475569", lineHeight: 1.5, marginTop: 6 }}>{toAddr ? "It's saved to the Tracker for the app owner, then your email app opens with it filled in. Press Send there to email it too: the app can't send email itself." : "It's saved to the Tracker for the app owner to read in the app."}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={async function(){
              if (!feedbackText.trim()) return;
              setFeedbackSending(true);
              /* v2.14.0 item 10: also save it to the tracker (Category Feedback, Status New); the email still opens as before */
              try { await saveEntry(feedbackEntry({ email: currentEmail(), person: activeTab, kind: feedbackType, text: feedbackText.trim() })); } catch (te) {}
              try {
                var deviceInfo = "";
                try { deviceInfo = navigator.userAgent; } catch(e) { deviceInfo = "Unknown"; }
                var screenInfo = window.screen ? window.screen.width + "x" + window.screen.height : "Unknown";
                var emailBody = "Type: " + (feedbackType === "bug" ? "Bug Report" : "Feature Request") + "%0A%0A" + (feedbackType === "bug" ? "What I was trying to do:%0A" : "Feature description:%0A") + encodeURIComponent(feedbackText.trim()) + "%0A%0A--- Device Info ---%0AUser: " + (activeTab || "Unknown") + "%0ADevice: " + encodeURIComponent(deviceInfo) + "%0AScreen: " + screenInfo + "%0AApp Version: " + APP_VERSION;
                var emailSubject = encodeURIComponent("[Life Care " + (feedbackType === "bug" ? "Bug" : "Feature") + "] " + feedbackText.trim().substring(0, 50));
                var toEmail = await loadContactEmail();   /* v2.14.1: an admin setting (Settings → 📧 Feedback email); empty = Tracker only */
                if (toEmail) window.open("mailto:" + toEmail + "?subject=" + emailSubject + "&body=" + emailBody, "_self");
                setDoneMsg(toEmail ? "✓ Saved to the Tracker for the app owner. Your email app should now be open: press Send there to email it too." : "✓ Saved to the Tracker for the app owner — thank you!");
                setFeedbackOpen(false);
                setFeedbackSent(true);
                setTimeout(function(){ setFeedbackSent(false); }, toEmail ? 8000 : 4000);
              } catch(e) { alert("Could not open the email app. Your feedback was saved for the app owner."); }
              setFeedbackSending(false);
            }} disabled={feedbackSending || !feedbackText.trim()} style={{ ...btnP(!!feedbackText.trim()), flex: 1 }}>{feedbackSending ? "Saving..." : "Send Feedback"}</button>
            <button onClick={function(){ setFeedbackOpen(false); }} style={btnS}>Cancel</button>
          </div>
        </div>)}
      </div>
  </>);
}
