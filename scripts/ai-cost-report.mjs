#!/usr/bin/env node
// v2.31.0 (HELP/AI COST): cost per AI answer, before and after a change date, from the usage ledger — counts only.
//   node scripts/ai-cost-report.mjs <exported.json> [--change 2026-11-19] [--feature aiHelp]
// The JSON is an export (Firebase console → Realtime Database → ⋮ Export JSON) of EITHER the joint account's
// `<root>/ai_usage` ({ days: { date: { feature: { n, in, out, cw, cr } } } }) OR the server ledger `apps/lifecare/usage`
// ({ uid: { date: { n, in, out, cw, cr, f: { feature: {...} } } } }). It never contains content. Prices: Sonnet,
// USD_GBP 0.79 (as functions/src/config.js). Energy = AI cost in pence × 2.
import fs from "node:fs";
import { answerPence } from "../src/lib/caching.js";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--change" && args[args.indexOf(a) - 1] !== "--feature");
if (!file) { console.error("usage: node scripts/ai-cost-report.mjs <exported.json> [--change YYYY-MM-DD] [--feature aiHelp]"); process.exit(2); }
const change = opt("--change", "9999-12-31"), only = opt("--feature", null);
let j = JSON.parse(fs.readFileSync(file, "utf8")); if (typeof j === "string") j = JSON.parse(j);

/** → rows of { date, feature, n, in, out, cw, cr } from either ledger shape. */
export function rowsOf(j) {
  const rows = [];
  const push = (date, feature, x) => x && x.n && rows.push({ date, feature, n: x.n, in: x.in || 0, out: x.out || 0, cw: x.cw || 0, cr: x.cr || 0 });
  if (j && j.days) { for (const [date, fs_] of Object.entries(j.days)) for (const [f, x] of Object.entries(fs_ || {})) push(date, f, x); return rows; }
  for (const days of Object.values(j || {})) for (const [date, x] of Object.entries(days || {})) {
    if (x && x.f) for (const [f, y] of Object.entries(x.f)) push(date, f, y); else push(date, "(all)", x);
  }
  return rows;
}
const sum = {};
for (const r of rowsOf(j)) {
  if (only && r.feature !== only) continue;
  const k = r.feature + (r.date < change ? " before" : " after");
  const s = sum[k] = sum[k] || { n: 0, in: 0, out: 0, cw: 0, cr: 0 };
  for (const f of ["n", "in", "out", "cw", "cr"]) s[f] += r[f];
}
console.log("feature            period  answers  pence/answer  Energy/answer  cached share of input");
for (const [k, s] of Object.entries(sum).sort()) {
  const p = answerPence({ input_tokens: s.in, output_tokens: s.out, cache_creation_input_tokens: s.cw, cache_read_input_tokens: s.cr }) / s.n;
  const share = (s.cr / Math.max(1, s.in + s.cw + s.cr) * 100).toFixed(0) + "%";
  const [f, per] = k.split(" ");
  console.log(f.padEnd(18), per.padEnd(7), String(s.n).padStart(7), p.toFixed(2).padStart(13), (p * 2).toFixed(1).padStart(14), share.padStart(22));
}
