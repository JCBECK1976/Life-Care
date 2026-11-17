import React, { useEffect, useState } from "react";
import { gateText, openPlans, usePlan } from "../lib/myPlan.js";
import { useDialog } from "../lib/a11y.js";

// v2.22.0 (ADR 0017): the gating prompt. "[Feature] is part of Silver." + See plans (opens Settings → My Plan).
// A Platinum family member can't buy: "Ask [owner] about your family plan." and no button.
var box = { background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, fontSize: 13, color: "#0f172a", lineHeight: 1.45 };
var seeBtn = { marginTop: 8, padding: "10px 16px", minHeight: 44, borderRadius: 8, border: "none", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" };

/** Inline prompt, shown where a feature the plan doesn't include would be. */
export function GatePrompt(props) {
  var plan = usePlan();
  return (<div data-testid={"plan-gate-" + props.feature} role="note" style={Object.assign({}, box, props.style)}>
    <div>🔒 {gateText(props.feature)}</div>
    {plan.role !== "member" && <button type="button" data-testid="see-plans" style={seeBtn} onClick={function() { if (props.onSee) props.onSee(); openPlans(); }}>See plans</button>}
  </div>);
}

/** The app-wide prompt: shown when a gated AI request is stopped (lib/api.js → "lc-plan-gate"). */
export function PlanGateHost() {
  var [feature, setFeature] = useState(null);
  useEffect(function() {
    var on = function(e) { setFeature((e.detail && e.detail.feature) || "aiFeedback"); };
    window.addEventListener("lc-plan-gate", on);
    return function() { window.removeEventListener("lc-plan-gate", on); };
  }, []);
  var close = function() { setFeature(null); };
  var ref = useDialog(!!feature, close);
  if (!feature) return null;
  return (<div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)" }} />
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Not in your plan" data-testid="plan-gate-dialog" style={{ position: "relative", background: "#fff", borderRadius: 12, padding: 16, maxWidth: 360, width: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}>
      <GatePrompt feature={feature} onSee={close} style={{ background: "#fff", border: "none", padding: 0 }} />
      <button type="button" onClick={close} style={{ marginTop: 10, padding: "8px 14px", minHeight: 44, borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13, cursor: "pointer" }}>Not now</button>
    </div>
  </div>);
}

export default GatePrompt;
