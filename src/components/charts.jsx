import { btnFilledOn, btnProgress } from "../constants/styles.js";
// ═══════════════════════════════════════════════════
// CHART COMPONENTS
// ═══════════════════════════════════════════════════
export function MiniChart({ data, color, height = 48, width = 140 }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.v).filter(v => typeof v === "number");
  if (vals.length < 2) return null;
  const mn = Math.min(...vals), mx = Math.max(...vals), sp = (mx - mn) * 0.3;
  const lo = mn - sp, hi = mx + sp, rng = hi - lo || 1;
  const pts = vals.map((v, i) => ((i / (vals.length - 1)) * width) + "," + (height - ((v - lo) / rng) * height)).join(" ");
  return (<svg width={width} height={height} style={{ display: "block" }}><polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{vals.map((v, i) => <circle key={i} cx={(i / (vals.length - 1)) * width} cy={height - ((v - lo) / rng) * height} r="3.5" fill={color} />)}</svg>);
}

export function FullChart({ series, height = 160, title, refLine }) {
  const W = 320, PAD = 36, PR = 16, PB = 20, PT = 8;
  const cW = W - PAD - PR, cH = height - PB - PT;
  let allVals = [], allWks = [];
  series.forEach(s => s.data.forEach(d => { if (typeof d.v === "number") { allVals.push(d.v); allWks.push(d.wk); } }));
  if (refLine) allVals.push(refLine);
  if (allVals.length === 0) return <div style={{ fontSize: 11, color: "#94a3b8", padding: 12 }}>No data yet</div>;
  const mn = Math.min(...allVals), mx = Math.max(...allVals), sp = (mx - mn) * 0.15 || 1;
  const lo = mn - sp, hi = mx + sp, rng = hi - lo || 1;
  const wks = [...new Set(allWks)].sort((a, b) => a - b);
  const x = wk => PAD + ((wks.indexOf(wk)) / Math.max(wks.length - 1, 1)) * cW;
  const y = v => PT + cH - ((v - lo) / rng) * cH;
  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "10px 8px", marginBottom: 10 }}>
      {title && <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6, paddingLeft: 4 }}>{title}</div>}
      <svg viewBox={"0 0 " + W + " " + height} style={{ width: "100%", height: "auto" }}>
        {wks.map(wk => (<text key={wk} x={x(wk)} y={height - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">W{wk}</text>))}
        {refLine && <line x1={PAD} x2={W - PR} y1={y(refLine)} y2={y(refLine)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />}
        {refLine && <text x={PAD - 2} y={y(refLine) + 3} textAnchor="end" fontSize="8" fill="#ef4444">{refLine}</text>}
        {series.map((s, si) => {
          const pts = s.data.filter(d => typeof d.v === "number");
          if (pts.length < 1) return null;
          const line = pts.map(d => x(d.wk) + "," + y(d.v)).join(" ");
          return (<g key={si}>
            {pts.length > 1 && <polyline points={line} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={series.length > 3 ? 0.8 : 1} />}
            {pts.map((d, i) => <circle key={i} cx={x(d.wk)} cy={y(d.v)} r={series.length > 5 ? 2.5 : 3} fill={s.color} />)}
            {series.length <= 3 && pts.map((d, i) => <text key={"t"+i} x={x(d.wk)} y={y(d.v) - 6} textAnchor="middle" fontSize="8" fill={s.color} fontWeight="600">{typeof d.v === "number" ? (d.v % 1 === 0 ? d.v : d.v.toFixed(1)) : d.v}</text>)}
          </g>);
        })}
      </svg>
      {series.length > 1 && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingLeft: 4, marginTop: 4 }}>
        {series.map((s, i) => <div key={i} style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />{s.label}</div>)}
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════
export function BodyCard({ label, value, rating, trend, onEye, eyeOpen }) {
  const rc = rating === "Excellent" || rating === "Acceptable" ? "#16a34a" : rating === "Standard" ? "#2563eb" : rating === "High" || rating === "Too High" ? "#dc2626" : rating === "Low" ? "#d97706" : "#64748b";
  return (<div style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 3, position: "relative" }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{label}</div><div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>{value != null ? value : "—"}</div>{rating && <div style={{ fontSize: 10, fontWeight: 600, color: rc, textTransform: "uppercase" }}>{rating}</div>}{trend && <div style={{ fontSize: 10, color: String(trend).startsWith("-") ? "#16a34a" : String(trend).startsWith("+") ? "#dc2626" : "#64748b" }}>{trend}</div>}{onEye && <button onClick={onEye} style={Object.assign({}, eyeOpen ? btnFilledOn : btnProgress, { alignSelf: "flex-end", marginTop: 4 })}   /* v2.13.3: in the card's flow, under the rating, so it never covers text at 360px */ title={"View " + label + " detail"}>{eyeOpen ? "✕ Progress" : "👁 Progress"}</button>}</div>);
}

