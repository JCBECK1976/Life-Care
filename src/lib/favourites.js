// v2.50.0 (Architect night batch 24 Nov, PART 2f): Favourites — per person, a list of list-item ids
// (stored at "favourites:<person>"). The picker shows a red ♥ before a favourite and can filter to favourites only.
import React from "react";
import { sGet, sSet } from "./storage.js";

var cache = {};            // person → { id: true }
var listeners = [];
var current = "";
function emit() { listeners.forEach(function(f) { f(); }); }

export function setFavPerson(person) { current = person || ""; if (current && !cache[current]) loadFavs(current); }
export async function loadFavs(person) {
  if (!person) return {};
  try { var raw = await sGet("favourites:" + person); var arr = raw ? JSON.parse(raw) : []; cache[person] = {}; (Array.isArray(arr) ? arr : []).forEach(function(id) { cache[person][id] = true; }); }
  catch (e) { cache[person] = cache[person] || {}; }
  emit(); return cache[person];
}
export function isFav(id, person) { var p = person || current; return !!(id && cache[p] && cache[p][id]); }
export async function setFav(id, on, person) {
  var p = person || current; if (!p || !id) return;
  var m = Object.assign({}, cache[p] || {}); if (on) m[id] = true; else delete m[id];
  cache[p] = m; emit();
  await sSet("favourites:" + p, JSON.stringify(Object.keys(m)));
}
/** Re-render when favourites change. */
export function useFavs() {
  var _s = React.useState(0); var bump = _s[1];
  React.useEffect(function() { var f = function() { bump(function(n) { return n + 1; }); }; listeners.push(f); return function() { listeners = listeners.filter(function(x) { return x !== f; }); }; }, [bump]);
}
