// v2.22.0 (ADR 0017): Bronze Help = a searchable FAQ built from APP_GUIDE.md (the same guide the AI Help reads), no AI.
// Each "##" / "###" section becomes one entry; search matches words in the heading (weighted) and the text.
export function faqEntries(md) {
  var out = []; var cur = null; var parent = "";
  String(md || "").split("\n").forEach(function(line) {
    var h = /^(#{2,3})\s+(.*)$/.exec(line);
    if (h) {
      if (cur && cur.body.trim()) out.push(cur);
      var title = h[2].replace(/^\d+[a-z]?\.\s*/, "").replace(/\*\*/g, "").trim();
      if (h[1] === "##") parent = title;
      cur = { title: title, section: h[1] === "###" ? parent : "", body: "" };
    } else if (cur && !/^---\s*$/.test(line) && !/^>/.test(line)) cur.body += line + "\n";
  });
  if (cur && cur.body.trim()) out.push(cur);
  return out;
}
var STOP = { a: 1, an: 1, the: 1, how: 1, do: 1, i: 1, to: 1, my: 1, is: 1, what: 1, where: 1, can: 1, of: 1, in: 1, on: 1, it: 1, for: 1, and: 1, does: 1, me: 1, with: 1 };
export function searchFaq(entries, q, max) {
  var words = String(q || "").toLowerCase().split(/[^a-z0-9£%]+/).filter(function(w) { return w.length > 1 && !STOP[w]; });
  if (!words.length) return [];
  return entries.map(function(e) {
    var t = (e.section + " " + e.title).toLowerCase(), b = e.body.toLowerCase(), s = 0;
    words.forEach(function(w) { var stem = w.length > 4 ? w.replace(/(ing|es|s)$/, "") : w; if (t.indexOf(stem) >= 0) s += 3; if (b.indexOf(stem) >= 0) s += 1; });
    return { e: e, s: s };
  }).filter(function(x) { return x.s > 0; }).sort(function(a, b) { return b.s - a.s; }).slice(0, max || 5).map(function(x) { return x.e; });
}

/* v2.32.2 (Architect, 18 Nov — HELP COST): Help sends only the RELEVANT parts of the guide — the best-matching
   sections by words in the question (the same search as the FAQ; no AI, no embeddings), up to 5 and about 3,000
   tokens (≈ 12,000 characters; a long section is cut to fit), plus a short index of every section title so the
   Companion can say "see Help → X". If nothing matches, the sections for the tab the person is on are used. */
export var HELP_MAX_SECTIONS = 5, HELP_MAX_CHARS = 12000;
export function helpIndex(entries) {
  return entries.map(function(e) { return e.section ? e.section + " → " + e.title : e.title; }).join("; ");
}
// The app's main things → the guide section that explains them (heading match, kept short; checked by tests/v2322).
var TOPICS = [
  [/\bweight\b|weigh|record my body|body stats/, "my body stats"], [/measure|tape|waist|chest/, "my body measurements"],
  [/energy/, "companion energy"], [/\bplan\b|subscri|bronze|silver|gold|platinum|top.?up/, "my plan"],
  [/scale|fitdays|renpho|withings|health connect|apple health|\bsteps?\b/, "connecting smart scales"],
  [/calorie|\bgoal|bmr|deficit/, "your goal and your calorie goal"], [/breakfast|lunch|dinner|snack|food|\blist/, "update eating lists"],
  [/session|\breps?\b|\bsets?\b|exercise/, "logging a session"], [/delete my account|download my data|sign.?in|sign out/, "signing in"],
];
var SYN = { weigh: "weight", weighin: "weight", scales: "scale", kilos: "kg", stones: "stone", calories: "calorie", kcal: "calorie" };
var stemOf = function(w) { w = SYN[w] || w; return w.length > 4 ? w.replace(/(ing|es|s)$/, "") : w; };
/** Help's own scorer (the FAQ search is unchanged): words in the title count 4, in the text up to 3 by how often they
 *  appear, a phrase from the question found as written adds 5, the section of the tab the person is on adds 2. */
export function helpScore(e, question, tabName) {
  var q = String(question || "").toLowerCase().replace(/weigh[- ]?ins?/g, "weight");
  var words = q.split(/[^a-z0-9£%]+/).filter(function(w) { return w.length > 1 && !STOP[w]; });
  var t = (e.section + " " + e.title).toLowerCase(), b = e.body.toLowerCase(), s = 0, hit = 0;
  words.forEach(function(w) {
    var st = stemOf(w), inT = t.indexOf(st) >= 0, n = b.split(st).length - 1;
    if (inT) s += 4; s += Math.min(3, n); if (inT || n) hit++;
  });
  var raw = q.replace(/[^a-z0-9£% ]+/g, " ").split(/\s+/).filter(Boolean);
  for (var i = 0; i + 1 < raw.length; i++) { var ph = raw[i] + " " + raw[i + 1] + (raw[i + 2] ? " " + raw[i + 2] : ""); if (!STOP[raw[i]] || !STOP[raw[i + 1]]) { if (ph.split(" ").length === 3 && b.indexOf(ph) >= 0) s += 5; else if (b.indexOf(raw[i] + " " + raw[i + 1]) >= 0 && !(STOP[raw[i]] && STOP[raw[i + 1]])) s += 2; } }
  if (tabName && (e.section + " " + e.title).toLowerCase().indexOf(String(tabName).toLowerCase()) >= 0) s += 2;
  var full = (e.section + " → " + e.title).toLowerCase();
  TOPICS.forEach(function(tp) { if (tp[0].test(q) && full.indexOf(tp[1]) >= 0) s += 8; });   // the section that answers this kind of question
  return hit ? s : 0;
}
export function helpSections(entries, question, tabName) {
  var hits = entries.map(function(e) { return { e: e, s: helpScore(e, question, tabName) }; }).filter(function(x) { return x.s > 0; })
    .sort(function(a, b) { return b.s - a.s; }).slice(0, HELP_MAX_SECTIONS).map(function(x) { return x.e; });
  if (!hits.length && tabName) hits = searchFaq(entries, tabName, 3);
  var out = [], used = 0;
  for (var i = 0; i < hits.length && used < HELP_MAX_CHARS; i++) {
    var e = hits[i], head = "### " + (e.section ? e.section + " → " : "") + e.title + "\n", room = HELP_MAX_CHARS - used - head.length;
    if (room < 400) break;
    var body = e.body.trim(); if (body.length > room) body = body.slice(0, room).replace(/\s+\S*$/, "") + " …";
    out.push(head + body); used += head.length + body.length;
  }
  return out;
}
