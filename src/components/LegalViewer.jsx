import React from "react";
import MarkdownText from "./MarkdownText.jsx";
import { LEGAL_DOCS } from "../lib/consent.js";
// v2.16.7 P8: the pilot Privacy Notice / Terms, read in the app (replaces the old in-app Privacy Policy while pilotConsent is on).
export default function LegalViewer(props) {
  var doc = LEGAL_DOCS[props.which];
  var [text, setText] = React.useState("");
  React.useEffect(function() { var live = true; fetch(doc.file).then(function(r) { return r.ok ? r.text() : "Couldn't load " + doc.title + "."; }).then(function(t) { if (live) setText(t); }).catch(function() { if (live) setText("Couldn't load " + doc.title + "."); }); return function() { live = false; }; }, [doc.file, doc.title]);
  return (<div role="dialog" aria-modal="true" aria-label={doc.title} data-testid={"legal-" + props.which} style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(15,23,42,0.5)", display: "flex", justifyContent: "center" }}>
    <div style={{ background: "#fff", width: "100%", maxWidth: 480, margin: "24px 8px", borderRadius: 12, padding: 16, overflowY: "auto", boxSizing: "border-box" }}>
      <MarkdownText text={text} testid={"legal-text-" + props.which} />
      <button onClick={props.onClose} style={{ width: "100%", marginTop: 12, padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", background: "#f1f5f9", fontWeight: 600, cursor: "pointer" }}>Close</button>
    </div>
  </div>);
}
