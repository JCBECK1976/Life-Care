// v2.19.2: food search that forgives spelling. Pure functions, no network, no AI.
// Matching per word: exact, prefix (while typing), typo distance (missing / extra / swapped / wrong letters) and a
// sound-alike skeleton; plain words map to the right food through SYNONYMS ("spirals" → fusilli). Filler words
// ("bag of dried …") are ignored. Sources in order: your own lists, the built-in UK generic list, then UK products.
import { GENERIC_FOODS, GENERIC_LABEL } from "../constants/genericFoods.js";
import { packagedItem } from "./portion.js";

export var SYNONYMS = {
  spirals: ["fusilli"], spiral: ["fusilli"], twists: ["fusilli"], twirls: ["fusilli"], corkscrews: ["fusilli"],
  shells: ["conchiglie"], shell: ["conchiglie"], tubes: ["penne", "rigatoni"], tube: ["penne"], quills: ["penne"],
  bows: ["farfalle"], bowties: ["farfalle"], butterflies: ["farfalle"], ribbons: ["tagliatelle"], nests: ["tagliatelle"],
  elbows: ["macaroni"], mac: ["macaroni"], spag: ["spaghetti"], lasagna: ["lasagne"],
  spuds: ["potatoes"], tatties: ["potatoes"], jacket: ["baking"], mash: ["potatoes"], fries: ["chips"],
  yogurt: ["yoghurt"], yoghurt: ["yogurt"], hummus: ["houmous"], houmous: ["hummus"], shrimp: ["prawns"],
  zucchini: ["courgette"], eggplant: ["aubergine"], capsicum: ["peppers"], bangers: ["sausages"], rashers: ["bacon"],
  porridge: ["oats"], oatmeal: ["oats"], mince: ["mince"], minced: ["mince"], spaghetti: ["spaghetti"], wholemeal: ["wholewheat"],
};
var STOP = ("a an the of and with in for on my some bag bags packet packets pack packs box boxes tin tins can cans jar jars pot pots " +
  "dried dry raw fresh uncooked cooked plain frozen tinned canned bottle carton portion portions serving piece pieces slice slices " +
  "x g kg ml l gram grams").split(" ");

/** Lower case, no accents, words only; filler words and amounts dropped. */
export function words(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(" ")
    .filter(function(w) { return w && STOP.indexOf(w) < 0 && !/^\d+(g|kg|ml|l)?$/.test(w); });
}

/** Optimal string alignment distance (insert, delete, substitute, swap adjacent letters). */
export function distance(a, b) {
  var m = a.length, n = b.length, d = [], i, j;
  for (i = 0; i <= m; i++) { d[i] = [i]; }
  for (j = 0; j <= n; j++) d[0][j] = j;
  for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) {
    var c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}

/** Sound-alike skeleton: ph→f, soft c→s, hard c/k/q→k, gh→g, z→s; vowels after the first letter dropped; doubles collapsed. */
export function skeleton(w) {
  var s = w.replace(/ph/g, "f").replace(/gh/g, "g").replace(/c(?=[eiy])/g, "s").replace(/ck|c|q/g, "k").replace(/z/g, "s").replace(/(.)h/g, "$1");
  s = s[0] + s.slice(1).replace(/[aeiouy]/g, "");
  return s.replace(/(.)\1+/g, "$1");
}

/** How well one typed word matches one food word (0–1). last = the word still being typed (prefix allowed). */
export function wordScore(q, w, last) {
  if (q === w) return 1;
  if (w.indexOf(q) === 0 && q.length >= (last ? 2 : 3)) return 0.9;
  if (q.indexOf(w) === 0 && w.length >= 4 && q.length - w.length <= 2) return 0.9;     // potatoes / potato
  var allowed = q.length >= 7 ? 2 : q.length >= 5 ? 1 : 0;
  if (allowed) { var d = distance(q, w); if (d <= allowed) return 0.85 - 0.1 * d; }
  if (q.length >= 4 && w.length >= 4) {
    var sq = skeleton(q), sw = skeleton(w);
    if (sq.length >= 2 && sq === sw && Math.abs(q.length - w.length) <= 1) return 0.6;
  }
  return 0;
}

function alternatives(q) {
  var out = [q];
  Object.keys(SYNONYMS).forEach(function(k) { if (k === q || (q.length >= 5 && distance(q, k) <= 1)) out = out.concat(SYNONYMS[k]); });
  return out;
}

/** Score (0–1) of a food for the typed query; 0 = not a match. */
export function matchScore(query, text) {
  var qs = words(query); if (!qs.length) return 0;
  var ws = words(text); if (!ws.length) return 0;
  var total = 0, missed = 0;
  qs.forEach(function(q, i) {
    var last = i === qs.length - 1, best = 0;
    alternatives(q).forEach(function(a, k) { ws.forEach(function(w) { var s = wordScore(a, w, last); if (k) s = s >= 0.9 ? s * 0.95 : 0; if (s > best) best = s; }); });
    if (!best) missed++; total += best;
  });
  if (missed && (qs.length < 3 || missed > 1)) return 0;
  return total / qs.length - missed * 0.15;
}

/** Items matching the query, best first. textOf(item) gives the words to search (name + aliases). */
export function fuzzyFind(query, items, textOf, limit) {
  textOf = textOf || function(it) { return (it.name || "") + " " + (it.aliases || ""); };
  return (items || []).map(function(it, i) { var s = matchScore(query, textOf(it)), sn = matchScore(query, it.name || ""); return { it: it, i: i, s: sn ? Math.max(s, sn + 0.05) : s }; })
    .filter(function(x) { return x.s >= 0.5; })
    .sort(function(a, b) { return b.s - a.s || a.i - b.i; })
    .slice(0, limit || 12).map(function(x) { return x.it; });
}

/** A generic food as a list item (per portion, editable grams; source "Typical values"). */
export function genericItem(g) {
  return packagedItem({ name: g.name, source: "generic", sourceLabel: GENERIC_LABEL, genericId: g.id, ingredients: [] }, g.per100, g.grams, g.desc);
}
export function searchGeneric(query, limit) { return fuzzyFind(query, GENERIC_FOODS, null, limit || 10).map(genericItem); }

/** The query with each word corrected to the nearest known food word (for UK product search, which needs spelling). */
export function correctedQuery(query) {
  var vocab = {};
  GENERIC_FOODS.forEach(function(g) { words(g.name + " " + g.aliases).forEach(function(w) { if (w.length >= 3) vocab[w] = 1; }); });
  Object.keys(SYNONYMS).forEach(function(k) { SYNONYMS[k].forEach(function(w) { vocab[w] = 1; }); });
  var all = Object.keys(vocab);
  return words(query).map(function(q) {
    if (SYNONYMS[q]) return SYNONYMS[q][0];
    if (vocab[q] || q.length < 5) return q;
    var best = q, bd = 9; all.forEach(function(w) { var d = distance(q, w); if (d < bd) { bd = d; best = w; } });
    return bd <= (q.length >= 7 ? 2 : 1) ? best : q;
  }).join(" ");
}
