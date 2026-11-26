// v2.32.2 (Architect, 18 Nov — WEIGHT FORMAT): ONE reader for every stored weigh-in, used everywhere (My Body, charts,
// BMR / Katch-McArdle, goals, feedback and AI context, the GP summary, progress). Stored values are never rewritten
// (ADR 0002); from v2.32.2 every new weigh-in (typed, photo, imported) ALSO stores `kg` — the canonical value.
//
// The legacy format ("stones.pounds-digits"), as written by the app:
//   - typed "14.68" and the Fitdays photo ("14st 6.8lb becomes 14.68"): stones, then the pounds with ONE decimal and
//     the dot removed — 6.8 lb → "68", 11.2 lb → "112". Saved with parseFloat, so trailing zeros are lost:
//     11.0 lb → "110" → 14.11, the same number as 1.1 lb; 10.0 lb → "100" → 14.1, the same as 1.0 lb.
//   - typed "14st 6lb" or "14:6": decimal stones (14 + 6/14 = 14.428…, four or more digits).
//   - an edit in the history (HistoryRows) stores the typed STRING, which keeps its zeros ("14.110").
// So, by the number of digits after the dot (numbers):
//   0 → whole stones · 1 → pounds 0–9 (but "1" = 1.0 or 10.0 lb: ambiguous) · 2 → pounds 0.0–9.9 (but 11, 12, 13 =
//   1.1–1.3 or 11.0–13.0 lb: ambiguous) · 3 → 10.0–13.9 lb when the first two digits are 10–13, otherwise decimal
//   stones · 4+ → decimal stones · 40 or more → kilograms. Ambiguous values are shown as the old screen did (pounds
//   below 10) with a "check this weigh-in" badge — never silently guessed.
export var STONE_KG = 6.35029;
var r1 = function(x) { return Math.round(x * 10) / 10; };

/** One weigh-in → { kg, st (decimal stones), label "14st 6.8lb", ambiguous, kind } or null. Accepts an entry or a value. */
export function readWeight(e) {
  if (e == null) return null;
  var entry = typeof e === "object" ? e : { v: e };
  if (typeof entry.kg === "number" && entry.kg > 0) return out(entry.kg, false, "kg");
  var raw = entry.v; var n = parseFloat(raw);
  if (!isFinite(n) || n <= 0) return null;
  if (n >= 40) return out(n, false, "kg");
  var s = typeof raw === "string" ? raw.trim() : String(n);
  var frac = (s.split(".")[1] || "").replace(/[^0-9]/g, ""); var st = Math.floor(n); var exact = typeof raw === "string";
  if (frac.length >= 4) return out(n * STONE_KG, false, "stone-decimal");
  var lb, amb = false;
  if (frac.length === 3) {
    var a = parseInt(frac.slice(0, 2), 10);
    if (a < 10 || a > 13) return out(n * STONE_KG, false, "stone-decimal");
    lb = a + parseInt(frac[2], 10) / 10;
  } else if (frac.length === 2) {
    lb = parseInt(frac[0], 10) + parseInt(frac[1], 10) / 10;
    if (!exact && /^1[123]$/.test(frac)) amb = true;          // 1.1–1.3 lb, or 11.0–13.0 lb with the zero lost
  } else if (frac.length === 1) {
    lb = parseInt(frac, 10);
    if (!exact && frac === "1") amb = true;                   // 1.0 lb, or 10.0 lb with the zero lost
  } else lb = 0;
  return out((st + lb / 14) * STONE_KG, amb, "stone-code");
}
function out(kg, ambiguous, kind) {
  var st = kg / STONE_KG;
  return { kg: Math.round(kg * 100) / 100, st: st, label: stLabel(kg), ambiguous: !!ambiguous, kind: kind };
}
/** kg → "14st 6.8lb" (13.95 lb rounds to the next stone). */
export function stLabel(kg) {
  var f = kg / STONE_KG, st = Math.floor(f), lb = r1((f - st) * 14);
  if (lb >= 14) { st += 1; lb = r1(lb - 14); }
  return st + "st " + lb.toFixed(1) + "lb";
}
/** kg of an entry (null if unreadable). */
export function entryKg(e) { var w = readWeight(e); return w ? w.kg : null; }

/** WRITERS (typed, photo, history edit, import): the entry with its canonical kg added when the value is unambiguous.
 *  `typed` is the text exactly as entered (keeps "14.110"); `v` stays as the app has always stored it. */
export function withKg(entry, typed) {
  var w = readWeight(typed != null && typed !== "" ? { v: String(typed) } : entry);
  var o = Object.assign({}, entry);
  if (w && !w.ambiguous) o.kg = w.kg; else delete o.kg;
  return o;
}

/** For prompts: a body record whose weigh-ins say what they mean (stones and kg), not the raw code. */
export function aiBody(body) {
  if (!body || typeof body !== "object") return body;
  var b = Object.assign({}, body);
  if (Array.isArray(body.weight)) b.weight = body.weight.map(function(e) { var w = readWeight(e); return w ? { wk: e.wk, weight: w.label + " (" + r1(w.kg).toFixed(1) + " kg)" + (w.ambiguous ? " — unclear, ask them to check this weigh-in" : "") } : { wk: e.wk }; });
  return b;
}
/** "14st 6.8lb (92.0 kg)" for the latest weigh-in, or "" */
export function latestLabel(arr) { var a = Array.isArray(arr) ? arr : []; var w = a.length ? readWeight(a[a.length - 1]) : null; return w ? w.label + " (" + r1(w.kg).toFixed(1) + " kg)" : ""; }

/* v2.32.3 (Architect, 18 Nov — WEIGH-IN ENTRY): unit-aware entry. */
export var LIMITS = { st: [4, 40], lb: [0, 13.9], kg: [25, 250] };
/** The person's unit: "st" (stones and pounds, the default) or "kg". */
export function unitOf(p) { return p && p.profile && p.profile.weightUnit === "kg" ? "kg" : "st"; }
/** WRITER: the legacy string older versions read — stones, then the pounds with one decimal and the dot removed,
 *  zeros KEPT as text (14st 11.0lb → "14.110"), so the new reader never finds it ambiguous. */
export function legacyCode(kg) {
  var f = kg / STONE_KG, st = Math.floor(f), lb = Math.round((f - st) * 14 * 10) / 10;
  if (lb >= 14) { st += 1; lb = Math.round((lb - 14) * 10) / 10; }
  return st + "." + lb.toFixed(1).replace(".", "");
}
/** A new weigh-in entry: canonical kg + the legacy string (ADR 0002 / 0019). */
export function weighInEntry(wk, kg, extra) { return Object.assign({ wk: wk, v: legacyCode(kg), kg: Math.round(kg * 100) / 100 }, extra || {}); }
/** st + lb → kg (null if out of range); kg text → kg. */
export function fromStLb(st, lb) {
  var s = Number(st), l = lb === "" || lb == null ? 0 : Number(lb);
  if (!isFinite(s) || !isFinite(l) || s !== Math.floor(s) || s < LIMITS.st[0] || s > LIMITS.st[1] || l < 0 || l > LIMITS.lb[1] || Math.round(l * 10) !== l * 10) return null;
  return Math.round((s + l / 14) * STONE_KG * 100) / 100;
}
export function fromKgText(t) { var k = Number(t); return isFinite(k) && k >= LIMITS.kg[0] && k <= LIMITS.kg[1] && Math.round(k * 10) === Math.round(k * 10 * 1000) / 1000 ? Math.round(k * 10) / 10 : null; }
/** kg → { st, lb } for pre-filling the boxes. */
export function toStLb(kg) { var f = kg / STONE_KG, st = Math.floor(f), lb = Math.round((f - st) * 14 * 10) / 10; if (lb >= 14) { st += 1; lb = Math.round((lb - 14) * 10) / 10; } return { st: st, lb: lb }; }
/** How a weight is written in the person's unit. */
export function fmtWeight(kg, unit) { return unit === "kg" ? (Math.round(kg * 10) / 10).toFixed(1) + " kg" : stLabel(kg); }
/** For an ambiguous stored value: the possible readings to choose from (e.g. 14.11 → 14st 1.1lb or 14st 11.0lb). */
export function readings(e) {
  var w = readWeight(e); if (!w) return [];
  if (!w.ambiguous) return [{ kg: w.kg, label: w.label }];
  var n = parseFloat(typeof e === "object" ? e.v : e), st = Math.floor(n), frac = (String(n).split(".")[1] || "");
  var a = frac.length === 1 ? [Number(frac), Number(frac) * 10] : [Number(frac[0] + "." + frac[1]), Number(frac) ];   // "1" → 1.0 / 10.0 · "11" → 1.1 / 11.0
  return a.map(function(lb) { var kg = Math.round((st + lb / 14) * STONE_KG * 100) / 100; return { kg: kg, label: stLabel(kg) }; });
}
