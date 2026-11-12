// v2.6.2 D6: each meal selection keeps a snapshot of the item as it was chosen, so a past
// selection never depends on the list item still existing (or being unchanged).
// Stored in the week's meal plan under "_snap": { "<day>:<slot>": { id, name, kcal, ..., rating } }.
// Older plans have no "_snap"; they read exactly as before.
var NUTRIENTS = ["protein", "fat", "satFat", "carbs", "sugar", "fibre", "salt"];

export function makeSnap(item, isJC) {
  var s = { id: item.id, name: item.name, kcal: (isJC ? item.jcKcal : item.beckKcal) || item.kcal || 0, rating: item.rating || "" };
  if (item.portion) s.portion = item.portion;
  NUTRIENTS.forEach(function(k) { if (item[k] != null) s[k] = item[k]; });
  return s;
}

// Adds or refreshes snapshots in place (so the state object and the saved object match).
// A slot's snapshot is (re)taken when it has none, when the slot now holds a different item,
// or when the day is today or later. Days before today keep the snapshot they had.
export function addSnapshots(meals, lookup, isJC, dayDates, today) {
  if (!meals) return meals;
  var t = today || new Date(); var t0 = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  var snaps = meals._snap || {};
  Object.keys(meals).forEach(function(day) {
    if (day.charAt(0) === "_") return;
    var dm = meals[day]; if (!dm || typeof dm !== "object") return;
    var d = dayDates && dayDates[day]; var past = d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() < t0 : false;
    Object.keys(dm).forEach(function(slot) {
      var id = dm[slot]; if (!id || typeof id !== "string" || id === "__empty__") return;
      var item = lookup[id]; var k = day + ":" + slot; var cur = snaps[k];
      if (!item) return;                                   // deleted item: keep whatever snapshot exists
      if (!cur || cur.id !== id || !past) snaps[k] = makeSnap(item, isJC);
    });
  });
  if (Object.keys(snaps).length) meals._snap = snaps;
  return meals;
}

// Items that only exist as snapshots (deleted from the lists), shaped like list items so the
// existing totals and lookups keep working. Marked _deleted.
export function snapshotItems(meals, lookup) {
  var out = {}; var snaps = (meals && meals._snap) || {};
  Object.keys(snaps).forEach(function(k) {
    var s = snaps[k]; if (!s || !s.id || lookup[s.id] || out[s.id]) return;
    out[s.id] = Object.assign({}, s, { jcKcal: s.kcal, beckKcal: s.kcal, _deleted: true, _isCustom: true });
  });
  return Object.keys(out).map(function(id) { return out[id]; });
}

// Name to show for a selection: snapshot, else current list item, else "Deleted item". Never the raw id.
export function selectionName(value, snap, item) {
  if (!value || value === "__empty__") return "";
  if (snap && snap.id === value && snap.name) return snap.name;
  if (item && item.name) return item.name;
  return "Deleted item";
}

// v2.6.2 D9: week generator order for each day and slot —
// 1) keep what is already selected, 2) else the person's default, 3) else generated, only from that slot's list.
var GEN_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
var SLOT_NAMES = { b: "Breakfast", l: "Lunch", d: "Dinner" };
var isSet = function(v) { return !!v && v !== "__placeholder__"; };

export function applyDefaultsTo(meals, defs) {
  var n = JSON.parse(JSON.stringify(meals || {})); var src = {};
  defs = defs || {};
  GEN_DAYS.forEach(function(d) {
    if (!n[d] || typeof n[d] !== "object") n[d] = {};
    ["b", "l", "d"].forEach(function(s) {
      if (isSet(n[d][s])) src[d + ":" + s] = "kept";
      else if (isSet(defs[s])) { n[d][s] = defs[s]; src[d + ":" + s] = "default"; }
    });
    for (var i = 1; i <= 7; i++) { if (isSet(defs["o" + i]) && !n[d]["o" + i]) n[d]["o" + i] = defs["o" + i]; }
  });
  return { meals: n, src: src };
}

// gen: the AI's {day:{b,l,d}}; allowed: {b:[ids], l:[ids], d:[ids]}. Only empty slots, only listed ids.
export function mergeGenerated(planned, gen, allowed) {
  var n = planned.meals; var src = Object.assign({}, planned.src);
  GEN_DAYS.forEach(function(d) {
    ["b", "l", "d"].forEach(function(s) {
      var k = d + ":" + s; if (src[k]) return;
      var id = gen && gen[d] && gen[d][s];
      if (id && (allowed[s] || []).indexOf(id) >= 0) { n[d][s] = id; src[k] = "generated"; }
      else src[k] = (allowed[s] || []).length ? "unfilled" : "nolist";
    });
  });
  return { meals: n, src: src };
}

export function generatorSummary(src, allowed) {
  var parts = []; var empty = 0;
  ["b", "l", "d"].forEach(function(s) {
    var c = { kept: 0, default: 0, generated: 0 };
    GEN_DAYS.forEach(function(d) { var v = src[d + ":" + s]; if (c[v] != null) c[v]++; else empty++; });
    var bits = [];
    if (c.kept) bits.push(c.kept === 7 ? "kept your choices" : c.kept + " kept");
    if (c.default) bits.push(c.default === 7 ? "your default" : c.default + " default");
    if (c.generated) bits.push(c.generated === 7 ? "generated" : c.generated + " generated");
    parts.push(SLOT_NAMES[s] + ": " + (bits.join(", ") || "left empty"));
  });
  var noList = ["b", "l", "d"].filter(function(s) { return !((allowed || {})[s] || []).length && GEN_DAYS.some(function(d) { return src[d + ":" + s] === "nolist"; }); }).map(function(s) { return SLOT_NAMES[s].toLowerCase(); });
  return parts.join(" · ") + (empty ? " · " + empty + " slot" + (empty === 1 ? "" : "s") + " left empty" + (noList.length ? " (no items in the " + noList.join("/") + " list)" : "") : "");
}

// v2.15.1: "Clear old eating history" (planClearHistory, currentWeekSunday; v2.6.5) removed: its one-off job is done.
// Recovery = Download backup + Restore. The code is in git history (e.g. commit 6853af4).
