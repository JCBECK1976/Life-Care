import { sBg, sColor, sLabel } from "../lib/utils.js";

export function ExTable({ exercises, day, showHistory, onLog }) {
  return (<div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, paddingLeft: 2 }}>{day}</div>
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
      {exercises.map((ex, i) => (<div key={i} style={{ padding: "10px 12px", borderBottom: i < exercises.length - 1 ? "1px solid #f1f5f9" : "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{ex.name}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => onLog(i)} style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>📋 Log</button>
          </div>
        </div>
        <div style={{ color: "#64748b", fontSize: 11, fontWeight: 500 }}>{ex.current} · {ex.reps}</div>
        {ex.status && <div style={{ marginTop: 3 }}><span style={{ fontSize: 10, fontWeight: 600, color: sColor(ex.status), background: sBg(ex.status), padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", border: "1px solid " + sColor(ex.status) + "40" }}>{sLabel(ex.status)}</span></div>}
                    {ex._userNote && <div style={{ fontSize: 10, color: "#92400e", background: "#fef3c7", padding: "2px 6px", borderRadius: 4, marginTop: 2 }}>{ex._userNote}</div>}
        {ex.status === "reduce" && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>Back protection — reduced load</div>}
        {showHistory && ex.prog && ex.prog.length > 0 && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>PROGRESSION</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{ex.prog.map((p, j) => (<span key={j} style={{ fontSize: 10, color: "#64748b", background: "#f8fafc", padding: "2px 6px", borderRadius: 4 }}>Wk{p.wk}: {p.w} {p.r}</span>))}</div>
          </div>
        )}
      </div>))}
    </div>
  </div>);
}

export function StrengthBanner({ exercises, isJC }) {
  const all = [...(exercises.sunday||[]), ...(exercises.monday||[]), ...(exercises.friday||[])];
  const active = all.filter(e => e.status !== "reduce");
  const weights = active.map(e => parseInt(e.current) || 0);
  const avgWeight = weights.length > 0 ? Math.round(weights.reduce((a, b) => a + b, 0) / weights.length) : 0;
  const maxWeight = Math.max(...weights, 0);
  const movedUp = all.filter(e => e.status === "moved up" || e.status === "ready to move").length;
  const ratio = movedUp / all.length;
  let uLo, uHi, aLo, aHi;
  if (isJC) { uLo = 70 + Math.min(ratio * 15, 15); uHi = Math.min(uLo + 8, 95); aLo = uLo - 10; aHi = Math.min(uHi - 8, 95); }
  else { uLo = 88 + Math.min(ratio * 5, 7); uHi = Math.min(uLo + 5, 98); aLo = uLo - 8; aHi = Math.min(uHi - 6, 98); }
  const grad = isJC ? "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" : "linear-gradient(135deg, #5b21b6 0%, #a855f7 100%)";
  return (<div style={{ background: grad, borderRadius: 10, padding: "12px 14px", marginBottom: 14, color: "#fff" }}>
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.8, marginBottom: 6 }}>Strength vs {isJC ? "Male" : "Female"} Population (age {isJC ? "49" : "48"})</div>
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ flex: 1 }}><div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>Top {Math.round(100 - uHi)}–{Math.round(100 - uLo)}%</div><div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>untrained</div></div>
      <div style={{ width: 1, background: "rgba(255,255,255,0.2)" }} />
      <div style={{ flex: 1 }}><div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>Top {Math.round(100 - aHi)}–{Math.round(100 - aLo)}%</div><div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>inc. trained</div></div>
    </div>
    <div style={{ fontSize: 9, opacity: 0.5, marginTop: 6 }}>Estimated from cable machine performance · avg {avgWeight}kg · max {maxWeight}kg</div>
  </div>);
}
