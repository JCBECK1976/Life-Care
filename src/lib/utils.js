// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
export function getWeekDates(s) { const d = []; for (let i = 0; i < 7; i++) { const x = new Date(s); x.setDate(x.getDate() + i); d.push(x); } return d; }

export function fmtDate(d) { return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }

export function mealKey(ws) { const d = new Date(ws); return "mealplan:" + d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }

export function countStatus(ex) {
  const seen = new Set();
  const all = [...(ex.sunday||[]), ...(ex.monday||[]), ...(ex.friday||[])];
  const unique = all.filter(e => { if (seen.has(e.name)) return false; seen.add(e.name); return true; });
  return { movedUp: unique.filter(e => e.status === "moved up").length, ready: unique.filter(e => e.status === "ready to move").length, building: unique.filter(e => e.status === "building").length, consolidating: unique.filter(e => e.status === "consolidating").length, maintaining: unique.filter(e => e.status === "maintaining").length, reduce: unique.filter(e => e.status === "reduce").length, total: unique.length };
}

export const sColor = s => s === "moved up" ? "#166534" : s === "ready to move" ? "#1d4ed8" : s === "building" ? "#6d28d9" : s === "consolidating" ? "#be185d" : s === "maintaining" ? "#0e7490" : s === "reduce" ? "#b91c1c" : "#475569";

export const sBg = s => s === "moved up" ? "#e0f2fe" : s === "ready to move" ? "#dbeafe" : s === "building" ? "#ede9fe" : s === "consolidating" ? "#fce7f3" : s === "maintaining" ? "#cffafe" : s === "reduce" ? "#fee2e2" : "#f1f5f9";

export const sLabel = s => s === "moved up" ? "Moved Up" : s === "ready to move" ? "Ready to Move" : s === "building" ? "Building" : s === "consolidating" ? "Consolidating" : s === "maintaining" ? "Maintaining" : s === "reduce" ? "Reduce" : s;

// Calculate current training week from start date

// Convert st:lb format to decimal stone
export function parseStLb(raw) {
  if (!raw) return NaN;
  var s = String(raw).trim();
  if (s.indexOf(":") >= 0) { var p = s.split(":"); return parseInt(p[0]) + parseFloat(p[1]) / 14; }
  if (s.indexOf("st") >= 0) { var p2 = s.replace(/[a-z]/gi, " ").trim().split(/\s+/); return parseInt(p2[0]) + (parseFloat(p2[1] || 0) / 14); }
  return parseFloat(s);
}

export function fbIcon(icon) {
  if (!icon) return "●";
  var i = String(icon).toLowerCase().trim();
  if (i === "check" || i.indexOf("check") >= 0 || i === "good" || i === "✓") return "✅";
  if (i === "arrow" || i.indexOf("arrow") >= 0 || i.indexOf("build") >= 0 || i === "→") return "⬆️";
  if (i === "triangle" || i.indexOf("triangle") >= 0 || i.indexOf("moved") >= 0 || i === "▲") return "🔺";
  if (i === "warning" || i.indexOf("warning") >= 0 || i.indexOf("watch") >= 0 || i === "⚠") return "⚠️";
  if (i === "circle" || i.indexOf("circle") >= 0 || i.indexOf("hold") >= 0 || i.indexOf("maintain") >= 0) return "⏸️";
  if (i === "star" || i.indexOf("star") >= 0 || i.indexOf("ready") >= 0) return "⭐";
  return icon;
}

export function calcWeek(startDate) {
  var start = new Date(2026, 6, 19);
  var now = new Date();
  return Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

/* v2.16.1 SAD-A2: replace an element's content with plain text in a styled div — never HTML,
   so AI-returned names or statuses can't inject markup or script. */
export function setPlainNote(el, text, css) {
  if (!el) return;
  var div = document.createElement("div");
  Object.assign(div.style, css || {});
  div.textContent = String(text == null ? "" : text);
  el.replaceChildren(div);
}
