import React from "react";
// v2.17.0 P6 (WCAG 1.4.1): a rating is never shown by colour alone — a small shape + word goes with it.
var CUE = { GREAT: ["✓", "Great", "#15803d"], GOOD: ["✓", "Good", "#15803d"], AMBER: ["!", "Amber", "#b45309"], RED: ["✕", "Red", "#b91c1c"] };
export default function RagCue(props) {
  var c = CUE[String(props.rating || "").toUpperCase()]; if (!c) return null;
  return <span data-testid="rag-cue" title={props.reason || ("Rating: " + c[1])} style={{ display: "inline-block", marginLeft: 4, fontSize: 9, fontWeight: 700, lineHeight: "14px", color: c[2], border: "1px solid " + c[2], borderRadius: 4, padding: "0 3px", whiteSpace: "nowrap" }}><span aria-hidden="true">{c[0]} </span>{c[1]}</span>;
}
