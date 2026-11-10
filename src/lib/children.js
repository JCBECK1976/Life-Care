// v2.6.5 eating data model (JC design decision, HANDOVER 10 Nov 14:35):
//   PARENT = a list item (the food lists), changed only through Update Lists.
//   CHILD  = one selection: person + date + slot. It keeps its own snapshot, portion, variations, nutrition and RAG,
//            so editing or deleting a parent never changes a child, and nothing leaks from one week to the next.
// Storage: one key per person per week, "eat_children:<person>:<Sunday YYYY-MM-DD>" =
//   { v: 1, children: { "<childId>": child }, empty: ["<weekday>:<slot>"], notes: {...} }
// The screens still work on a weekday view ({ monday: { b: "<childId>" } }); viewFromDoc / reconcile convert.
import { sGet, sSet } from "./storage.js";
import { rateByPortion, bandOf } from "./rag.js";
import { BREAKFASTS, DEFAULT_BREAKFASTS, DEFAULT_DINNERS_GB, DEFAULT_LUNCHES, DINNERS, LUNCHES, POTATO_SIDES, SNACKS, VEG_SIDES } from "../constants/food.js";

export var WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
var NUTRIENTS = ["protein", "fat", "satFat", "addedSugar", "carbs", "fibre", "salt"];
var LIST_KEYS = ["custom_breakfasts", "custom_lunches", "custom_meals", "custom_snacks", "custom_drinks", "custom_desserts"];

export function ymd(d) { var x = new Date(d); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); }
export function weekKey(person, weekStart) { return "eat_children:" + person + ":" + ymd(weekStart); }
export function dateOf(weekStart, weekday) { var d = new Date(weekStart); d.setDate(d.getDate() + WEEKDAYS.indexOf(weekday)); return ymd(d); }
export function childId(date, slot) { return "c_" + date + "_" + slot; }
export function emptyDoc() { return { v: 1, children: {}, empty: [], notes: {} }; }

// Nutrition the totals use: the photo's values when the portion was checked, else the snapshot × portion factor.
export function childNutrition(c) {
  var src = c.portion && c.portion.values ? c.portion.values : c.snapshot || {};
  var f = c.portion && !c.portion.values && c.portion.factor ? c.portion.factor : 1;
  var n = { kcal: Math.round((parseFloat(src.kcal) || 0) * f) };
  NUTRIENTS.forEach(function(k) { n[k] = Math.round((parseFloat(src[k]) || 0) * f * 10) / 10; });
  return n;
}

// Recalculate a child's nutrition and its OWN RAG (D11 bands on the adjusted nutrition). Call on any change.
export function recalcChild(c) {
  var n = childNutrition(c);
  var r = rateByPortion({ jcKcal: n.kcal, beckKcal: n.kcal, satFat: n.satFat, addedSugar: n.addedSugar, fibre: n.fibre, protein: n.protein });
  return Object.assign({}, c, { nutrition: n, rating: r.rating, ragFreq: r.ragFreq, ragReason: r.reason, band: r.band });
}

export function snapshotOf(item, isJC) {
  var s = { name: item.name, kcal: (isJC ? item.jcKcal : item.beckKcal) || item.kcal || 0, rating: item.rating || "", ragFreq: item.ragFreq || "" };
  NUTRIENTS.forEach(function(k) { if (item[k] != null) s[k] = item[k]; });
  return s;
}

export function makeChild(item, o) {
  var c = { id: childId(o.date, o.slot), parentId: o.parentId === undefined ? (item && item.id) || null : o.parentId, date: o.date, weekday: o.weekday, slot: o.slot,
    snapshot: snapshotOf(item || { name: "Food" }, o.isJC), portion: o.portion || { factor: 1 }, variations: o.variations || { text: "", subs: [] },
    tracked: o.tracked || "", source: o.source || "manual", notes: o.notes || "" };
  if (item && item.id && o.parentId !== null) c.parentBand = bandOf(item) || "";
  return recalcChild(c);
}

export function viewFromDoc(doc, opts) {
  var v = {}; doc = doc || emptyDoc();
  Object.keys(doc.children || {}).forEach(function(id) {
    var c = doc.children[id]; if (!v[c.weekday]) v[c.weekday] = {};
    v[c.weekday][c.slot] = opts && opts.parentIds ? (c.parentId || "__adhoc__:" + c.snapshot.name) : id;
  });
  (doc.empty || []).forEach(function(k) { var p = k.split(":"); if (!v[p[0]]) v[p[0]] = {}; if (!v[p[0]][p[1]]) v[p[0]][p[1]] = "__empty__"; });
  if (doc.notes && Object.keys(doc.notes).length) v._notes = doc.notes;
  return v;
}

// View (as edited by the screens) → children. Values may be child ids (kept or copied), parent ids (new child from the
// parent) or "__empty__" (an empty row kept on screen). otherChildren: children of another week, for copying.
export function reconcile(doc, view, lookup, o) {
  doc = doc || emptyDoc(); var out = { v: 1, children: {}, empty: [], notes: (view && view._notes) || doc.notes || {} };
  var pool = Object.assign({}, o.otherChildren || {}, doc.children || {});
  Object.keys(view || {}).forEach(function(weekday) {
    if (weekday.charAt(0) === "_" || WEEKDAYS.indexOf(weekday) < 0) return;
    var dm = view[weekday]; if (!dm || typeof dm !== "object") return;
    var date = dateOf(o.weekStart, weekday);
    Object.keys(dm).forEach(function(slot) {
      var val = dm[slot]; if (!val) return;
      if (val === "__empty__" || val === "__placeholder__") { out.empty.push(weekday + ":" + slot); return; }
      var id = childId(date, slot); var existing = (doc.children || {})[id];
      if (pool[val]) {
        var c = pool[val];
        if (val === id) out.children[id] = c;
        else if (c.parentId && lookup[c.parentId]) out.children[id] = makeChild(lookup[c.parentId], { date: date, weekday: weekday, slot: slot, source: o.source || "copy", isJC: o.isJC });
        else out.children[id] = recalcChild(Object.assign({}, c, { id: id, date: date, weekday: weekday, slot: slot, portion: { factor: 1 }, tracked: "", source: o.source || "copy" }));  // a copy starts fresh: no portion or tick carried over
      } else if (lookup[val]) {
        out.children[id] = existing && existing.parentId === val ? existing : makeChild(lookup[val], { date: date, weekday: weekday, slot: slot, source: o.source, isJC: o.isJC });
      } else if (existing) { out.children[id] = existing; }
    });
  });
  return out;
}

// List-item-shaped stand-ins for children, so every existing lookup (totals, warnings, feedback) reads the CHILD.
export function childItems(doc, lookup) {
  return Object.keys((doc && doc.children) || {}).map(function(id) {
    var c = doc.children[id]; var p = c.parentId && lookup ? lookup[c.parentId] : null; var n = c.nutrition || childNutrition(c);
    var it = Object.assign({}, p || {}, { id: id, name: c.snapshot.name, kcal: n.kcal, jcKcal: n.kcal, beckKcal: n.kcal, jcProt: n.protein, beckProt: n.protein, jcFat: n.fat, beckFat: n.fat,
      rating: c.rating, ragFreq: c.ragFreq, ragReason: c.ragReason, parentId: c.parentId, parentBand: c.parentBand || "", _child: c, _status: c.tracked || "", _isCustom: true });
    NUTRIENTS.forEach(function(k) { it[k] = n[k]; });
    delete it.checkMe; delete it._ragChanged;
    return it;
  });
}

// The food a child is (for frequency rules): its parent, or its name when ad hoc.
export function foodKey(c) { return c.parentId || "adhoc:" + (c.snapshot && c.snapshot.name || "").toLowerCase(); }
export function occurrences(doc) { return Object.keys((doc && doc.children) || {}).map(function(id) { var c = doc.children[id]; return { food: foodKey(c), band: c.band || bandOf(c), weekday: c.weekday, slot: c.slot }; }); }

// "RED today — large portion" when the child's RAG differs from its parent's.
export function ragNote(c, parent) {
  if (!c || !c.parentId || !parent) return "";
  var cb = c.band || bandOf(c); var pb = bandOf(parent); if (!cb || !pb || cb === pb) return "";
  var pk = parseFloat(parent.jcKcal || parent.kcal) || 0; var ck = (c.nutrition && c.nutrition.kcal) || 0;
  var why = c.portion && c.portion.source === "variations" ? "with changes" : c.portion && c.portion.values ? (ck > pk ? "large portion" : ck < pk ? "small portion" : "this portion") : (c.variations && c.variations.text ? "with changes" : "this portion");
  return (cb.indexOf("RED") === 0 ? "RED" : cb) + " today — " + why;
}

// ── migration from the old weekday plan (+ day-name portions and ticks for the current week) ──
export async function loadParentLookup() {
  var lookup = {};
  [].concat(BREAKFASTS, DEFAULT_BREAKFASTS, DEFAULT_DINNERS_GB, DEFAULT_LUNCHES, DINNERS, LUNCHES, POTATO_SIDES, SNACKS, VEG_SIDES).forEach(function(it) { if (it && it.id) lookup[it.id] = it; });
  for (var i = 0; i < LIST_KEYS.length; i++) {
    var raw = await sGet(LIST_KEYS[i]); var arr = []; try { arr = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : []; } catch (e) {}
    (arr || []).forEach(function(it) { if (it && it.id) lookup[it.id] = it; });
  }
  return lookup;
}

export function legacyToDoc(plan, weekStart, isJC, lookup, portions, ticks) {
  var doc = emptyDoc(); var skipped = 0; if (!plan || typeof plan !== "object") return { doc: doc, skipped: 0 };
  if (plan._notes) doc.notes = plan._notes;
  WEEKDAYS.forEach(function(weekday) {
    var dm = plan[weekday]; if (!dm || typeof dm !== "object") return;
    var date = dateOf(weekStart, weekday);
    Object.keys(dm).forEach(function(slot) {
      var val = dm[slot]; if (!val || typeof val !== "string") return;
      if (val === "__empty__" || val === "__placeholder__") { doc.empty.push(weekday + ":" + slot); return; }
      var parent = lookup[val] || lookup["gb_" + val]; var snap = plan._snap && plan._snap[weekday + ":" + slot];
      if (!parent && !(snap && snap.id === val)) { skipped++; return; }
      var pv = portions && portions[weekday] && portions[weekday][slot];
      var c = makeChild(parent || snap, { date: date, weekday: weekday, slot: slot, source: "migrated", isJC: isJC, parentId: parent ? parent.id : null,
        portion: pv ? { source: "photo", values: pv } : undefined, tracked: ticks ? ticks[weekday + ":" + slot] || "" : "" });
      doc.children[c.id] = c;
    });
  });
  return { doc: doc, skipped: skipped };
}

// Load a week's children. With no children yet but an old plan: convert it (and, for the CURRENT week only, the
// day-name portions and eaten/skipped ticks). write=true saves the result and, for the current week, deletes the old
// day-name portion/tick keys (they are now inside dated children). Idempotent: once children exist they are used as-is.
export async function loadWeekDoc(person, weekStart, o) {
  var raw = await sGet(weekKey(person, weekStart));
  if (raw) { try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch (e) { return emptyDoc(); } }
  var legacy = await sGet("mealplan:" + ymd(weekStart) + ":" + person);
  if (!legacy) return emptyDoc();
  var plan; try { plan = typeof legacy === "string" ? JSON.parse(legacy) : legacy; } catch (e) { return emptyDoc(); }
  var lookup = (o && o.lookup) || await loadParentLookup();
  var portions = null, ticks = null;
  if (o && o.current) {
    var po = await sGet("portion_overrides:" + person); var mt = await sGet("meal_tracking:" + person);
    try { portions = po ? JSON.parse(po) : null; } catch (e) {} try { ticks = mt ? JSON.parse(mt) : null; } catch (e) {}
  }
  var res = legacyToDoc(plan, weekStart, person === "jc", lookup, portions, ticks);
  if (o && o.write) {
    await sSet(weekKey(person, weekStart), JSON.stringify(res.doc));
    if (o.current) { await sSet("portion_overrides:" + person, null); await sSet("meal_tracking:" + person, null); }
  }
  return res.doc;
}

export async function saveWeekDoc(person, weekStart, doc) { await sSet(weekKey(person, weekStart), JSON.stringify(doc)); }
