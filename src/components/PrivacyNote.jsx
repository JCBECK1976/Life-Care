import React from "react";

// v2.13.2: one wording everywhere a photo is sent to the AI (Body Type Photos, measurement Log, Body balance check).
export var PRIVACY_TEXT = "Images are analysed and then discarded — they're never stored.";
export default function PrivacyNote(props) {
  return <div data-testid="privacy-note" style={Object.assign({ fontSize: 9, color: "#94a3b8", lineHeight: 1.4, marginTop: 6, textAlign: "center" }, props.style || {})}>{PRIVACY_TEXT}</div>;
}
