// v2.30.0 (FINAL DROP Part 5, flag usePilotFeatures): pilot features for 40+ / perimenopause, under My Health.
// a) daily symptom check-in (0–3 + notes) with trends; b) an HRT log — a RECORD ONLY (never sent to the AI);
// c) a GP prep summary (Silver+, uses Energy): a factual summary of the person's own records, reviewed before saving;
// d) its own consent ("symptoms"). Pure helpers here (tested); the screens are in components/Symptom*, HrtLog, GpSummary.
import { buildFlag } from "./platform.js";
import { consentBlocks } from "./accountConsent.js";

import { readWeight } from "./weight.js";
export function pilotOn() { return buildFlag("usePilotFeatures"); }
/** Symptom + HRT tracking allowed (the joint account has no consent screen: allowed, as for the other opt-ins). */
export function symptomsAllowed() { return !consentBlocks("symptoms"); }

export var SYMPTOMS = [
  { k: "hot_flushes", l: "Hot flushes" }, { k: "night_sweats", l: "Night sweats" }, { k: "sleep", l: "Sleep problems" },
  { k: "low_mood", l: "Low mood" }, { k: "anxiety", l: "Anxiety or irritability" }, { k: "brain_fog", l: "Brain fog or memory" },
  { k: "tiredness", l: "Tiredness" }, { k: "aches", l: "Joint or muscle aches" }, { k: "headaches", l: "Headaches" },
  { k: "palpitations", l: "Palpitations" }, { k: "libido", l: "Low libido" }, { k: "dryness", l: "Vaginal dryness" },
];
export var SCALE = ["None", "Mild", "Moderate", "Severe"];
export var HRT_TYPES = ["Oestrogen", "Progestogen", "Combined", "Testosterone", "Vaginal oestrogen", "Other"];
export var HRT_ROUTES = ["Patch", "Gel", "Spray", "Tablet", "Coil (IUS)", "Cream or pessary", "Implant", "Other"];
export var HRT_ACTIONS = { started: "Started", changed: "Changed", stopped: "Stopped", note: "Note" };

/** Local date as YYYY-MM-DD. */
export function ymd(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
export function addDays(s, n) { var d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return ymd(d); }
export function niceDate(s) { try { return new Date(s + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return s; } }

/** One check-in per day: replaces that day's entry. Scores 0–3 only; empty scores dropped. Returns a new sorted list. */
export function upsertCheckIn(list, entry) {
  var s = {}; Object.keys(entry.s || {}).forEach(function(k) { var v = Number(entry.s[k]); if (v >= 0 && v <= 3 && Math.round(v) === v) s[k] = v; });
  var e = { d: entry.d, s: s }; if (entry.n && String(entry.n).trim()) e.n = String(entry.n).trim().slice(0, 1000);
  return (Array.isArray(list) ? list : []).filter(function(x) { return x && x.d !== entry.d; }).concat([e]).sort(function(a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
}
export function inRange(list, from, to) { return (Array.isArray(list) ? list : []).filter(function(x) { return x && x.d >= from && x.d <= to; }); }

/** Per symptom over a range: days logged, average, highest, days at moderate+; plus the daily total score. */
export function trendStats(list, from, to) {
  var days = inRange(list, from, to);
  var per = SYMPTOMS.map(function(sym) {
    var vals = days.filter(function(x) { return x.s && x.s[sym.k] != null; }).map(function(x) { return x.s[sym.k]; });
    var sum = vals.reduce(function(a, b) { return a + b; }, 0);
    return { k: sym.k, l: sym.l, n: vals.length, avg: vals.length ? Math.round(sum / vals.length * 10) / 10 : null, max: vals.length ? Math.max.apply(null, vals) : null, modPlus: vals.filter(function(v) { return v >= 2; }).length };
  });
  var totals = days.map(function(x) { var ks = Object.keys(x.s || {}); return { d: x.d, t: ks.reduce(function(a, k) { return a + (x.s[k] || 0); }, 0), n: ks.length }; });
  return { days: days.length, per: per, totals: totals };
}

/** A plain-English text alternative for the trend chart (screen readers + the "as text" view). */
export function trendText(st, from, to) {
  if (!st.days) return "No check-ins between " + niceDate(from) + " and " + niceDate(to) + ".";
  var top = st.per.filter(function(p) { return p.n && p.avg > 0; }).sort(function(a, b) { return b.avg - a.avg; }).slice(0, 3);
  var line = st.days + " check-in" + (st.days === 1 ? "" : "s") + " between " + niceDate(from) + " and " + niceDate(to) + ".";
  if (!top.length) return line + " No symptoms scored above none.";
  return line + " Highest on average: " + top.map(function(p) { return p.l.toLowerCase() + " " + p.avg + " of 3 (" + p.modPlus + " day" + (p.modPlus === 1 ? "" : "s") + " moderate or severe)"; }).join("; ") + ".";
}

/** HRT events → what is current (by product): the last event per product, unless it was "stopped". */
export function hrtCurrent(events) {
  var last = {};
  (Array.isArray(events) ? events : []).slice().sort(function(a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; }).forEach(function(e) { if (e && e.product && e.action !== "note") last[e.product.toLowerCase()] = e; });
  return Object.keys(last).map(function(k) { return last[k]; }).filter(function(e) { return e.action !== "stopped"; });
}
export function hrtLine(e) { return [e.product, e.type, e.route, e.dose].filter(Boolean).join(" · "); }

/* ---------- GP prep summary ---------- */
export var GP_AREAS = [
  { k: "symptoms", l: "Symptoms", needs: "symptoms" }, { k: "hrt", l: "HRT record", needs: "symptoms" },
  { k: "meds", l: "Medications" }, { k: "vitals", l: "Blood pressure and other readings" }, { k: "weight", l: "Weight" },
  { k: "notes", l: "My health notes" },
];
/** Weight is kept per training week (utils.calcWeek: week 1 starts 19 Jul 2026) → the date that week starts. */
export function weekStart(wk) { return addDays("2026-07-19", (Number(wk) - 1) * 7); }
var vitalText = function(v) {
  var b = [];
  if (v.systolic) b.push("BP " + v.systolic + (v.diastolic ? "/" + v.diastolic : "") + " mmHg");
  if (v.hr) b.push("heart rate " + v.hr + " bpm"); if (v.spo2) b.push("oxygen " + v.spo2 + "%");
  Object.keys(v).forEach(function(k) { if (["date", "time", "systolic", "diastolic", "hr", "spo2"].indexOf(k) < 0 && v[k] !== "" && v[k] != null && typeof v[k] !== "object") b.push(k + " " + v[k]); });
  return b.join(", ");
};
export var GP_NOTE = "For discussion with your GP. Prepared by you from your own records in Lifecare Companion; it is not a diagnosis or medical advice.";
var dmy = function(s) { var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(s || "")); return m ? m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0") : String(s || "").slice(0, 10); };

/** The facts for the chosen range and areas, from the person's own records. HRT and medications are listed as they were
 *  recorded (never sent to the AI); the rest is condensed for the AI to describe. */
export function gpFacts(p, from, to, areas) {
  p = p || {}; var on = function(k) { return areas.indexOf(k) >= 0; }; var f = { from: from, to: to, areas: areas.slice() };
  if (on("symptoms")) { var st = trendStats(p.symptoms, from, to); f.symptoms = { days: st.days, per: st.per.filter(function(x) { return x.n; }), notes: inRange(p.symptoms, from, to).filter(function(x) { return x.n; }).map(function(x) { return x.d + ": " + x.n; }) }; }
  if (on("hrt")) f.hrt = { current: hrtCurrent((p.hrt || []).filter(function(e) { return e.d <= to; })), events: inRange(p.hrt, from, to) };
  if (on("meds")) f.meds = (p.meds || []).filter(function(m) { return m.active !== false; }).map(function(m) { return [m.name, m.dose, m.freq, m.time].filter(Boolean).join(" · "); });
  if (on("vitals")) f.vitals = (Array.isArray(p.vitals) ? p.vitals : []).filter(function(v) { var d = dmy(v.date); return d >= from && d <= to; }).map(function(v) { return dmy(v.date) + (v.time ? " " + v.time : "") + ": " + vitalText(v); });
  if (on("weight")) f.weight = ((p.body && p.body.weight) || []).map(function(w) { var rw = readWeight(w); return { d: w.wk ? weekStart(w.wk) : dmy(w.d || w.date), v: rw ? Math.round(rw.kg * 10) / 10 : null }; })   /* v2.32.2: the shared reader (kg) */.filter(function(w) { return w.d >= addDays(from, -6) && w.d <= to && w.v !== "" && w.v != null; }).map(function(w) { return "week of " + w.d + ": " + w.v + " kg"; });
  if (on("notes")) f.notes = (Array.isArray(p.healthLog) ? p.healthLog : []).filter(function(h) { var d = dmy(h.date); return d >= from && d <= to; }).map(function(h) { return dmy(h.date) + ": " + h.note; });
  return f;
}

/** The AI request: factual description only. HRT and medication details are NOT included (record only). */
export function gpPrompt(f) {
  var data = {}; ["symptoms", "vitals", "weight", "notes"].forEach(function(k) { if (f[k]) data[k] = f[k]; });
  var system = "You write a short factual summary of a person's OWN self-recorded health entries, for them to take to a GP appointment. " +
    "Rules: describe only what was recorded (how often, ranges, highest and lowest, changes over the period). Do NOT diagnose, name or suggest any condition, " +
    "interpret causes, give advice, or suggest tests or treatment. Do NOT mention medication or HRT at all. UK English, plain words, second person is not needed. " +
    "Output plain text: one short heading line per area that has data (Symptoms, Readings, Weight, Notes), each followed by 1–4 bullet lines starting with '- '. At most 220 words. No preamble.";
  return { system: system, user: "Period: " + f.from + " to " + f.to + ".\nRecords (JSON):\n" + JSON.stringify(data) };
}

/** The document (title, sections of lines) for the review screen, the PDF and saving. */
export function gpDocument(name, f, aiText) {
  var sec = [];
  sec.push({ h: "Summary of my records", lines: String(aiText || "").split("\n").map(function(l) { return l.trim(); }).filter(Boolean) });
  if (f.symptoms) sec.push({ h: "Symptom scores (0 none – 3 severe; " + f.symptoms.days + " check-ins)", lines: f.symptoms.per.length ? f.symptoms.per.map(function(x) { return x.l + ": average " + x.avg + ", highest " + x.max + ", moderate or severe on " + x.modPlus + " of " + x.n + " days"; }) : ["No check-ins in this period."] });
  if (f.hrt) sec.push({ h: "HRT (as I recorded it)", lines: (f.hrt.current.length ? f.hrt.current.map(function(e) { return "Current: " + hrtLine(e) + " (since " + niceDate(e.d) + ")"; }) : ["No current HRT recorded."]).concat(f.hrt.events.map(function(e) { return niceDate(e.d) + " — " + HRT_ACTIONS[e.action] + ": " + hrtLine(e) + (e.notes ? " (" + e.notes + ")" : ""); })) });
  if (f.meds) sec.push({ h: "Medications (as I recorded them)", lines: f.meds.length ? f.meds : ["None recorded."] });
  return { title: "GP appointment summary — " + name, period: niceDate(f.from) + " to " + niceDate(f.to), sections: sec, note: GP_NOTE };
}

/** Plain text of the document (sharing, saving). */
export function gpText(doc) {
  return [doc.title, doc.period, ""].concat(doc.sections.reduce(function(a, s) { return a.concat([s.h].concat(s.lines.map(function(l) { return /^[-•]/.test(l) ? l : "  " + l; })), [""]); }, [])).concat([doc.note]).join("\n");
}
