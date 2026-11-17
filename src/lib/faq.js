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
