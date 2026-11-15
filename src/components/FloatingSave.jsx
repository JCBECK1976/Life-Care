import React from "react";
// v2.20.0 polish (JC): on long forms the Save button stays reachable. While the form's own action row (targetId) is off
// screen, a copy of its main button floats at the bottom, above the chat button and the phone's safe area.
export default function FloatingSave(props) {
  var [show, setShow] = React.useState(false);
  var id = props.targetId;
  React.useEffect(function() {
    var el = document.getElementById(id); if (!el || typeof IntersectionObserver === "undefined") return;
    var io = new IntersectionObserver(function(entries) { setShow(!entries[0].isIntersecting); }, { rootMargin: "0px 0px -72px 0px" });
    io.observe(el); return function() { io.disconnect(); };
  }, [id]);
  if (!show) return null;
  return (<div data-testid="floating-save" style={{ position: "fixed", left: 12, right: 76, bottom: "calc(12px + env(safe-area-inset-bottom))", zIndex: 900, maxWidth: 420, margin: "0 auto", display: "flex" }}>
    <button type="button" aria-label={props.label + " this log"} onClick={props.onClick} disabled={props.disabled} style={{ flex: 1, minHeight: 48, padding: "12px 16px", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#fff", cursor: props.disabled ? "not-allowed" : "pointer", background: props.disabled ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", boxShadow: "0 6px 18px rgba(15,23,42,0.3)" }}>{props.label}</button>
  </div>);
}
