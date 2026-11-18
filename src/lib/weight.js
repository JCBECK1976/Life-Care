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
