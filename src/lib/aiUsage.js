// v2.14.0 Step 1b item 9: an AI usage ledger. Every AI reply's token COUNTS (never any content) are added, per day and
// per feature, to one record under DATA_ROOT/ai_usage, in a Firebase transaction so calls finishing together never lose
// a count. Companion Energy uses its running cost total: spent since the last "Set as 100%" = total now − total then.
// Shape: { total: {n, in, out, cw, cr, cost}, days: { "YYYY-MM-DD": { "<feature>": {n, in, out, cw, cr, cost} } } }
// (cw = cache-write tokens, cr = cache-read tokens, cost in USD). Days older than KEEP_DAYS are dropped.
export var KEEP_DAYS = 120;
/* USD per million tokens: [input, 5-min cache write, cache read, output] — Anthropic list prices */
export var PRICES = { "claude-sonnet-4-6": [3, 3.75, 0.30, 15] };

export function costOf(usage, model) {
  var u = usage || {}; var pr = PRICES[model] || PRICES["claude-sonnet-4-6"];
  return ((u.input_tokens || 0) * pr[0] + (u.cache_creation_input_tokens || 0) * pr[1] + (u.cache_read_input_tokens || 0) * pr[2] + (u.output_tokens || 0) * pr[3]) / 1000000;
}

var SECTION = { overview: "Home", body: "My Body", weights: "My Exercise", meals: "My Eating", shop: "My Shop", bloods: "My Health", admin: "Settings", data: "Settings" };
// Which feature a request came from, from the request alone (Help = the app guide in the system prompt), else what is
// open (Chat panel) or the current tab; "(photo)" when it carries an image.
export function featureOf(bodyText, ctx) {
  var b = String(bodyText || ""); var c = ctx || {};
  var f = b.indexOf("=== APP GUIDE ===") >= 0 ? "Help" : c.chatOpen ? "Chat" : (SECTION[c.section] || "Other");
  return f + (b.indexOf('"type":"image"') >= 0 ? " (photo)" : "");
}

function add(a, u, cost) {
  a = a || { n: 0, in: 0, out: 0, cw: 0, cr: 0, cost: 0 };
  return { n: a.n + 1, in: a.in + (u.input_tokens || 0), out: a.out + (u.output_tokens || 0), cw: a.cw + (u.cache_creation_input_tokens || 0), cr: a.cr + (u.cache_read_input_tokens || 0), cost: Math.round((a.cost + cost) * 1e6) / 1e6 };
}
export function ymdLocal(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

// Pure: the ledger after one more call.
export function addToLedger(ledger, usage, model, feature, now) {
  var L = ledger && typeof ledger === "object" ? JSON.parse(JSON.stringify(ledger)) : {};
  var day = ymdLocal(now); var cost = costOf(usage, model); var u = usage || {};
  L.total = add(L.total, u, cost);
  L.days = L.days || {}; L.days[day] = L.days[day] || {}; L.days[day][feature] = add(L.days[day][feature], u, cost);
  var cut = new Date(now || new Date()); cut.setDate(cut.getDate() - KEEP_DAYS); var cutYmd = ymdLocal(cut);
  Object.keys(L.days).forEach(function(k) { if (k < cutYmd) delete L.days[k]; });
  return L;
}

// Pure: Companion Energy from the ledger total. Records from before v2.14.0 have no ledgerAtCalibration: the first time,
// it is set from the total BEFORE this call (prevTotal) so the spend shown so far is kept and this call is counted;
// from then on spent = ledger total − ledgerAtCalibration.
export function energyFromLedger(energy, total, prevTotal) {
  var e = Object.assign({}, energy || {});
  if (!(e.initial > 0)) e.initial = 5;
  if (e.ledgerAtCalibration == null) e.ledgerAtCalibration = Math.max(0, (prevTotal != null ? prevTotal : total) - (e.spent || 0));
  e.spent = Math.max(0, Math.round((total - e.ledgerAtCalibration) * 1e6) / 1e6);
  e.balance = Math.max(0, e.initial - e.spent);
  e.pct = Math.round((e.balance / e.initial) * 100);
  return e;
}

// Per-day and per-feature summaries for the admin view.
export function summarise(ledger, days) {
  var D = (ledger && ledger.days) || {}; var keys = Object.keys(D).sort().reverse().slice(0, days || 14);
  var byDay = keys.map(function(k) { var t = { n: 0, in: 0, out: 0, cw: 0, cr: 0, cost: 0 }; Object.keys(D[k]).forEach(function(f) { var a = D[k][f]; t.n += a.n; t.in += a.in; t.out += a.out; t.cw += a.cw; t.cr += a.cr; t.cost += a.cost; }); return Object.assign({ day: k }, t); });
  var byFeature = {}; keys.forEach(function(k) { Object.keys(D[k]).forEach(function(f) { var a = D[k][f]; var b = byFeature[f] || { n: 0, in: 0, out: 0, cost: 0 }; byFeature[f] = { n: b.n + a.n, in: b.in + a.in, out: b.out + a.out, cost: b.cost + a.cost }; }); });
  return { byDay: byDay, byFeature: Object.keys(byFeature).map(function(f) { return Object.assign({ feature: f }, byFeature[f]); }).sort(function(a, b) { return b.cost - a.cost; }) };
}
