import React from "react";
import { loadContactEmail } from "../lib/contact.js";
// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function PrivacyPolicy({ ctx }) {
  const {
    accent, setShowPrivacy, showPrivacy
  } = ctx;
  /* v2.14.1: the contact address is an admin setting (not in the source); without one, people use Send Feedback */
  var _c = React.useState(""); var email = _c[0]; var setEmail = _c[1];
  React.useEffect(function() { if (showPrivacy) loadContactEmail().then(setEmail).catch(function() {}); }, [showPrivacy, setEmail]);
  var contact = email || "the app owner, using 💬 Send Feedback at the bottom of the app";

  return (<>
{showPrivacy && (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 16, maxWidth: 500, width: "100%", maxHeight: "85vh", overflow: "auto", padding: "24px 20px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Privacy Policy</div>
            <button aria-label="Close privacy policy" onClick={function(){ setShowPrivacy(false); }} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: "pointer", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 16 }}>Last updated: 28 October 2026</div>

          <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>1. Who We Are</div>
            <p style={{ marginBottom: 14 }}>Lifecare Companion™ is a personal health and wellbeing tracking application created by Jan-Christian Zaluski, operating as Companion Apps Studio™. This policy explains how we handle your data when you use the app.</p>

            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>2. What Data We Collect</div>
            <p style={{ marginBottom: 8 }}>The app collects only data you voluntarily enter, including:</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Profile information (name, age, height, health conditions)</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Body measurements and weight tracking data</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Exercise plans and workout logs</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Meal plans and dietary information</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Health records (medications, blood results)</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Journal entries and mood tracking</p>
            <p style={{ marginBottom: 14, paddingLeft: 12 }}>• Shopping lists and food preferences</p>

            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>3. How Your Data Is Stored</div>
            <p style={{ marginBottom: 8 }}>Your data is stored in Google Firebase Realtime Database, a cloud service provided by Google LLC. Data is:</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Protected by Google's enterprise-grade security infrastructure</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Encrypted in transit using HTTPS/TLS</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Accessible only through your authenticated session</p>
            <p style={{ marginBottom: 14, paddingLeft: 12 }}>• Hosted in Google's EU (europe-west1) data centre region</p>

            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>4. Authentication</div>
            <p style={{ marginBottom: 14 }}>The app uses Google Sign-In for authentication. When you sign in, we receive your Google account email address and display name to identify your session. We do not access any other Google account data.</p>

            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>5. AI Companion Features</div>
            <p style={{ marginBottom: 8 }}>The app includes AI-powered companion features that use the Anthropic Claude API. When you use these features:</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Relevant health and activity data from your profile is sent to Anthropic's servers to generate personalised feedback</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Anthropic processes this data under their <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener" style={{ color: accent }}>Privacy Policy</a> and does not use API inputs for model training</p>
            <p style={{ marginBottom: 14, paddingLeft: 12 }}>• Conversation threads are stored in your Firebase account, not by Anthropic</p>

            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>6. Third-Party Services</div>
            <p style={{ marginBottom: 8 }}>The app uses the following third-party services:</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• <strong>Google Firebase</strong> — data storage and authentication (Google LLC)</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• <strong>Anthropic Claude API</strong> — AI companion feedback features (Anthropic PBC)</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• <strong>GitHub Pages</strong> — app hosting (GitHub Inc / Microsoft)</p>
            <p style={{ marginBottom: 14, paddingLeft: 12 }}>No data is sold, shared with advertisers, or used for marketing purposes.</p>

            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>7. Data Sharing</div>
            <p style={{ marginBottom: 14 }}>We do not sell, rent, or share your personal data with any third parties beyond the service providers listed above, which are essential for the app to function. Your health data is never used for advertising or profiling.</p>

            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>8. Your Rights</div>
            <p style={{ marginBottom: 8 }}>Under UK GDPR and the Data Protection Act 2018, you have the right to:</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Access all data we hold about you</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Request correction of inaccurate data</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Request deletion of your data</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>• Export your data in a portable format</p>
            <p style={{ marginBottom: 14, paddingLeft: 12 }}>To exercise any of these rights, contact {contact}</p>

            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>9. Data Retention</div>
            <p style={{ marginBottom: 14 }}>Your data is retained for as long as you use the app. If you request deletion, all data associated with your account will be permanently removed from Firebase within 30 days.</p>

            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>10. Children</div>
            <p style={{ marginBottom: 14 }}>This app is not intended for use by anyone under the age of 16. We do not knowingly collect data from children.</p>

            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>11. Changes to This Policy</div>
            <p style={{ marginBottom: 14 }}>We may update this policy from time to time. Changes will be reflected in the "Last updated" date above. Continued use of the app after changes constitutes acceptance of the updated policy.</p>

            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>12. Contact</div>
            <p style={{ marginBottom: 8 }}>For any questions about this privacy policy or your data:</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>Jan-Christian Zaluski</p>
            <p style={{ marginBottom: 4, paddingLeft: 12 }}>Companion Apps Studio™</p>
            <p style={{ marginBottom: 14, paddingLeft: 12 }}>Contact: {contact}</p>
          </div>

          <button onClick={function(){ setShowPrivacy(false); }} style={{ width: "100%", padding: "10px 0", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", marginTop: 8 }}>Close</button>
        </div>
      </div>)}
  </>);
}
