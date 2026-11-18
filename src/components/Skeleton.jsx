import React from "react";

// v2.30.1 (FINAL DROP Part 6): loading skeletons — grey shapes where the content will appear, so the screen doesn't
// jump. A gentle shimmer, off when the phone asks for reduced motion. Screen readers hear "Loading…".
var CSS = "@keyframes lcSk{0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}}" +
  ".lc-sk{background:#e2e8f0 linear-gradient(90deg,#e2e8f0 0,#f1f5f9 40px,#e2e8f0 80px) no-repeat;background-size:200px 100%;animation:lcSk 1.4s ease-in-out infinite;border-radius:8px}" +
  "@media (prefers-reduced-motion: reduce){.lc-sk{animation:none}}";
export function Bone({ w, h, r, style }) { return <div className="lc-sk" style={Object.assign({ width: w || "100%", height: h || 12, borderRadius: r == null ? 8 : r }, style)} />; }
export function SkeletonLines({ lines = 4, label = "Loading…", testId }) {
  return (<div role="status" aria-busy="true" data-testid={testId || "skeleton"} style={{ padding: "6px 0" }}>
    <style>{CSS}</style><span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{label}</span>
    {Array.from({ length: lines }).map(function(_, i) { return <Bone key={i} h={12} w={i === lines - 1 ? "60%" : (90 - (i % 3) * 8) + "%"} style={{ marginBottom: 10 }} />; })}
  </div>);
}
/** The whole app while the person's data loads (after sign-in). */
export default function AppSkeleton() {
  var card = { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginBottom: 12 };
  return (<div role="status" aria-busy="true" data-testid="app-skeleton" style={{ minHeight: "100vh", background: "#f1f5f9" }}>
    <style>{CSS}</style><span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Loading your data…</span>
    <div style={{ background: "#0f172a", padding: "16px 16px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 48, height: 48, borderRadius: "50%", background: "#334155" }} /><div style={{ flex: 1 }}><div style={{ width: 160, height: 10, borderRadius: 6, background: "#334155", marginBottom: 8 }} /><div style={{ width: 70, height: 18, borderRadius: 6, background: "#334155" }} /></div></div>
      <div style={{ height: 40, borderRadius: 10, background: "#1e293b", marginTop: 14 }} />
    </div>
    <div style={{ display: "flex", gap: 10, padding: "10px 16px", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>{[48, 64, 80, 70, 56].map(function(w, i) { return <Bone key={i} w={w} h={14} />; })}</div>
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      {[0, 1, 2].map(function(i) { return (<div key={i} style={card}><Bone w="40%" h={14} style={{ marginBottom: 12 }} /><Bone h={10} style={{ marginBottom: 8 }} /><Bone w="85%" h={10} style={{ marginBottom: 8 }} /><Bone w="70%" h={10} /></div>); })}
    </div>
  </div>);
}
