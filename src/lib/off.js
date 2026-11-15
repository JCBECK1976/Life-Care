// v2.19.2: UK product search (Open Food Facts). Cause of "Product search isn't available right now" (v2.19.1):
// OFF's search endpoint intermittently answers 503 "Page temporarily unavailable" — an HTML page without a CORS header,
// so the browser reports a network failure. (search.openfoodfacts.org sends no Access-Control-Allow-Origin, so a
// browser can't use it.) So: retries with backoff, a timeout, a per-term cache, and the caller always shows its own
// list and generic results first. Hosts here must be in the CSP connect-src (vite.config.js CSP_HOSTS; test v2192).
import { offProduct } from "./portion.js";

export var OFF_HOST = "https://world.openfoodfacts.org";
export var OFF_FIELDS = "product_name,brands,code,nutriments,serving_size,serving_quantity,product_quantity,quantity,categories_tags,ingredients_text,image_front_small_url";
export function offSearchUrl(term, pageSize) {
  return OFF_HOST + "/cgi/search.pl?search_terms=" + encodeURIComponent(term) + "&search_simple=1&action=process&json=1&page_size=" + (pageSize || 10) + "&fields=" + OFF_FIELDS;
}
var DELAYS = [0, 800, 2000];   // 3 attempts
var cache = {};
var wait = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };

/** Raw OFF products for a term (with nutrition per 100 g). Throws Error("unavailable") after 3 failed attempts. */
export async function searchOffRaw(term, opts) {
  var key = String(term || "").trim().toLowerCase(); if (key.length < 2) return [];
  if (cache[key]) return cache[key];
  var last = null;
  for (var i = 0; i < DELAYS.length; i++) {
    if (opts && opts.signal && opts.signal.aborted) throw new Error("aborted");
    if (DELAYS[i]) await wait(DELAYS[i]);
    var ctl = new AbortController(), timer = setTimeout(function() { ctl.abort(); }, 9000);
    try {
      var r = await fetch(offSearchUrl(key, opts && opts.pageSize), { signal: ctl.signal });
      clearTimeout(timer);
      if (!r.ok) { last = new Error("HTTP " + r.status); continue; }
      var d = await r.json();
      var list = (d.products || []).filter(function(p) { return p.product_name && p.nutriments && p.nutriments["energy-kcal_100g"] != null; });
      cache[key] = list; return list;
    } catch (e) { clearTimeout(timer); last = e; }
  }
  var err = new Error("unavailable"); err.cause = last; throw err;
}
/** OFF products as offProduct() objects. */
export async function searchOff(term, opts) { return (await searchOffRaw(term, opts)).map(offProduct); }

/** A short product-type hint from the name and OFF categories ("sauce / jar", "condiment", …), or "". */
export function productType(o) {
  var t = (String(o.name || "") + " " + (o.categories || []).join(" ")).toLowerCase();
  if (/sauce|pesto|passata|ragu|bolognese|carbonara|curry-paste|cooking|en:pasta-sauces/.test(t) || /\bjar\b/.test(String(o.packText || "").toLowerCase())) return "sauce / jar";
  if (/ketchup|mayonnaise|mustard|dressing|condiment|vinegar|relish|chutney|gravy/.test(t)) return "condiment";
  if (/spread|\bjam\b|marmalade|honey|peanut-butter|chocolate-spread/.test(t)) return "spread";
  if (/beverage|drinks|juice|soda|cola|squash/.test(t)) return "drink";
  if (/ready-meal|meals|microwave-meal/.test(t)) return "ready meal";
  if (/dried-pasta|pastas\b|en:pasta\b/.test(t)) return "dried pasta";
  return "";
}
/** The wrong-match guard: true when the values are only per 100 g (no serving size) or the product is a sauce, condiment or spread. */
export function needsPortionCheck(o) {
  var type = productType(o);
  return !o.servingG || type === "sauce / jar" || type === "condiment" || type === "spread";
}
/** Pack size text, e.g. "500 g", or "". */
export function packSize(o) { return o.packText || (o.packG ? Math.round(o.packG) + " g" : ""); }
