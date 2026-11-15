// v2.20.0: ONE way to turn a selected meal/food id into a name, so a raw key ("c_2026-11-15_b") is never shown.
// Sources, in order: the week's children (selections), any list items, an ad-hoc "__adhoc__:<name>" id. A name that
// can't be resolved shows "Unnamed item" and is logged (console, once per id) — never the key itself.
export var UNNAMED = "Unnamed item";
var logged = {};
function logUnresolved(id) { if (logged[id]) return; logged[id] = 1; try { console.warn("[mealNames] unresolved meal id", id); } catch (e) { /* ignore */ } }

/** opts: { children: weekChildren doc, items: [list items or child stand-ins] }. Returns a name, or null for empty slots. */
export function mealName(id, opts) {
  if (!id || id === "__empty__" || id === "__placeholder__") return null;
  var s = String(id);
  if (s.indexOf("__adhoc__:") === 0) return s.slice(10) || UNNAMED;
  var kids = opts && opts.children && opts.children.children;
  if (kids && kids[s] && kids[s].snapshot && kids[s].snapshot.name) return kids[s].snapshot.name;
  var items = (opts && opts.items) || [];
  for (var i = 0; i < items.length; i++) { if (items[i] && items[i].id === s && items[i].name) return items[i].name; }
  logUnresolved(s);
  return UNNAMED;
}
/** "Porridge +2 more" (one line; the caller sets ellipsis). */
export function namesLine(names) {
  var n = (names || []).filter(Boolean);
  if (!n.length) return null;
  return n[0] + (n.length > 1 ? " +" + (n.length - 1) + " more" : "");
}
