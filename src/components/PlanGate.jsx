import React, { useEffect, useState } from "react";
import { gateText, openPlans, usePlan, setPreview } from "../lib/myPlan.js";
import { useDialog } from "../lib/a11y.js";

// v2.22.0 (ADR 0017): the gating prompt. "[Feature] is part of Silver." + See plans (opens Settings → My Plan).
// A Platinum family member can't buy: "Ask [owner] about your family plan." and no button.
var box = { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 12, fontSize: 13, color: "#0f172a", lineHeight: 1.45 };   // v2.22.3: calm info style, not an error
var seeBtn = { marginTop: 8, padding: "10px 16px", minHeight: 44, borderRadius: 8, border: "none", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" };

/** Inline prompt, shown where a feature the plan doesn't include would be. */
export function GatePrompt(props) {
  var plan = usePlan();
  return (<div data-testid={"plan-gate-" + props.feature} role="note" style={Object.assign({}, box, props.style)}>
    <div><span aria-hidden="true">ℹ️ </span>{gateText(props.feature)}</div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {plan.role !== "member" && <button type="button" data-testid="see-plans" style={seeBtn} onClick={function() { if (props.onSee) props.onSee(); openPlans(); }}>See plans</button>}
      {props.actions}
    </div>
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
  // v2.22.3: an information card at the bottom (light backdrop), not an alarm; See plans and Not now side by side
  return (<div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 }}>
    <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.15)" }} />
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Part of another plan" data-testid="plan-gate-dialog" style={{ position: "relative", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 14, maxWidth: 420, width: "100%", boxShadow: "0 6px 20px rgba(15,23,42,0.15)", marginBottom: 72 }}>
      <GatePrompt feature={feature} onSee={close} style={{ border: "none", padding: 0 }} actions={<button type="button" onClick={close} style={{ marginTop: 8, padding: "10px 16px", minHeight: 44, borderRadius: 8, border: "1px solid #94a3b8", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0f172a" }}>Not now</button>} />
    </div>
  </div>);
}

export default GatePrompt;

/** v2.22.2: while the shared account previews another plan (build only), a slim bar on every screen with Stop — so a
 *  preview can't trap you (e.g. "Platinum member" hides My Plan, where the preview box is). */
export function PreviewBar() {
  var plan = usePlan();
  if (!plan.preview) return null;
  var name = { bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum Family" }[plan.tier] + (plan.role === "member" ? " (member)" : "");
  return (<div data-testid="preview-bar" role="status" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 2500, display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "4px 10px", background: "#fef3c7", borderBottom: "1px solid #f59e0b", fontSize: 12, color: "#0f172a" }}>
    <span>Previewing <b>{name}</b> (testing only)</span>
    <button type="button" data-testid="preview-stop" onClick={function() { setPreview(null); }} style={{ padding: "4px 12px", minHeight: 32, borderRadius: 6, border: "1px solid #92400e", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Stop preview</button>
  </div>);
}
