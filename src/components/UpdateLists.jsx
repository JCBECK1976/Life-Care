import React from "react";
import { sSet } from "../lib/storage.js";
import { withRuleRating, bandOf, FREQ_LABEL } from "../lib/rag.js";
import { itemNutrition, portionLabel, offToItem, setPortionGrams, componentFrom, componentNutrition, canUseGrams, mealNutrition, mealItem, relinkComponents, itemFromReply, withPortionValues } from "../lib/portion.js";
import { clarifyTurn, identifyFood } from "../lib/clarify.js";
import { fuzzyFind, searchGeneric, correctedQuery, words } from "../lib/foodSearch.js";
import { searchOff, productType, needsPortionCheck, packSize } from "../lib/off.js";
import { GENERIC_LABEL } from "../constants/genericFoods.js";

// v2.19.0 Update Lists (docs/design/EATING_LISTS.md §3): Single item · Build a meal · My own.
// Everything is per portion; all three end with Save → D11 rating (per portion) → the chosen category lists, optionally
// "Add to <day/slot> now". v2.19.2: search forgives spelling and shows results as you type (own lists → built-in UK
// generic foods → UK products); "Describe it instead" when nothing matches; a portion check for per-100 g / sauce
// products; the earlier light-blue panel and deep-blue buttons (JC).
var BLUE = "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)";
var box = { background: "#fff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 10, marginBottom: 8 };
var inp = { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, background: "#fff" };
var btn = { padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid #2563eb", background: "#fff", color: "#1e3a8a", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 };
var btnP = Object.assign({}, btn, { background: BLUE, color: "#fff", border: "1px solid #1e3a5f" });
var opt = { display: "block", width: "100%", textAlign: "left", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid #bfdbfe", background: "#fff", color: "#0f172a", fontSize: 12, cursor: "pointer" };
var small = { fontSize: 11, color: "#475569" };
var head = { fontSize: 11, fontWeight: 700, color: "#1e3a5f", marginTop: 8 };
var tag = { display: "inline-block", fontSize: 10, fontWeight: 700, color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10, padding: "0 6px", marginRight: 4 };
var RAGC = { RED: "#b91c1c", AMBER: "#b45309", GOOD: "#15803d", GREAT: "#15803d" };
var num = function(v) { var x = parseFloat(v); return isFinite(x) ? x : 0; };
var NUTR_KEYS = ["kcal", "protein", "fat", "satFat", "carbs", "sugar", "fibre", "salt"];
var n0 = function(x) { return Math.round(x || 0); };
var n1 = function(x) { return Math.round((x || 0) * 10) / 10; };

/** Per-portion values line. */
export function PortionValues(props) {
  var n = props.n;
  return (<div data-testid={props.testid || "per-portion"} style={{ fontSize: 11, color: "#0f172a", lineHeight: 1.6 }}>
    <b>Per portion:</b> {n0(n.kcal)} kcal · protein {n1(n.protein)} g · fat {n1(n.fat)} g · sat fat {n1(n.satFat)} g · carbs {n1(n.carbs)} g{n.addedSugar ? " · added sugar " + n1(n.addedSugar) + " g" : ""} · fibre {n1(n.fibre)} g · salt {n1(n.salt)} g
  </div>);
}

/** Search as you type (2+ letters): own lists, then common foods (the app's catalogue + the UK generic list), then
 *  UK products (Open Food Facts, debounced, spelling-corrected, retried). Local results never wait for the network. */
function useSearch(props, catalogue) {
  var [q, setQ] = React.useState("");
  var [off, setOff] = React.useState([]);
  var [offState, setOffState] = React.useState("");   // "" | "loading" | "none" | "down"
  var [retry, setRetry] = React.useState(0);
  var term = q.trim();
  var own = React.useMemo(function() { return term.length < 2 ? [] : fuzzyFind(term, props.ownItems || [], function(it) { return it.name || ""; }, 8); }, [term, props.ownItems]);
  var cat = React.useMemo(function() { return term.length < 2 ? [] : fuzzyFind(term, catalogue || [], function(it) { return it.name || ""; }, 6); }, [term, catalogue]);
  var gen = React.useMemo(function() { return term.length < 2 ? [] : searchGeneric(term, 8); }, [term]);
  React.useEffect(function() {
    setOff([]);
    if (term.length < 3 || !words(term).length) { setOffState(""); return; }
    var live = true; setOffState("loading");
    var t = setTimeout(async function() {
      try { var list = await searchOff(correctedQuery(term) || term); if (live) { setOff(list.slice(0, 8)); setOffState(list.length ? "" : "none"); } }
      catch (e) { if (live) setOffState("down"); }
    }, 700);
    return function() { live = false; clearTimeout(t); };
  }, [term, retry]);
  return { q: q, setQ: setQ, term: term, own: own, cat: cat, gen: gen, off: off, offState: offState, retry: function() { setRetry(retry + 1); } };
}

/** The search box and grouped results. onPick(kind, item, o) with kind own | catalogue | generic | off | described. */
function FoodSearch(props) {
  var s = props.s, isJC = props.isJC, ids = props.testids || {};
  var [describe, setDescribe] = React.useState(false);
  var local = s.own.length + s.cat.length + s.gen.length;
  var nothing = s.term.length >= 2 && !local && !s.off.length && s.offState !== "loading";
  if (describe) return <DescribeIt text={s.term} onPick={function(it) { setDescribe(false); props.onPick("described", it); }} onCancel={function() { setDescribe(false); }} />;
  return (<div>
    <label style={small} htmlFor={props.inputId}>{props.label}</label>
    <input id={props.inputId} aria-label={props.ariaLabel} style={inp} value={s.q} autoComplete="off" onChange={function(e) { s.setQ(e.target.value); }} placeholder={props.placeholder} />
    {s.term.length > 0 && s.term.length < 2 && <div style={Object.assign({}, small, { marginTop: 4 })}>Keep typing…</div>}
    {s.own.length > 0 && <div style={head}>In your lists</div>}
    {s.own.map(function(it) { return <button key={"m" + it.id} type="button" data-testid={ids.own || "own-option"} onClick={function() { props.onPick("own", it); }} style={opt}>{props.prefix}{it.name} <span style={small}>· {n0(itemNutrition(it, isJC).kcal)} kcal per portion</span></button>; })}
    {(s.cat.length > 0 || s.gen.length > 0) && <div style={head}>Common foods</div>}
    {s.cat.map(function(it) { return <button key={"c" + it.id} type="button" data-testid={ids.cat || "catalogue-option"} onClick={function() { props.onPick("catalogue", it); }} style={opt}>{props.prefix}{it.name} <span style={small}>· {n0(isJC ? it.jcKcal : it.beckKcal)} kcal per portion</span></button>; })}
    {s.gen.map(function(it) { return <button key={"g" + it.genericId} type="button" data-testid={ids.gen || "generic-option"} onClick={function() { props.onPick("generic", it); }} style={opt}>{props.prefix}{it.name} <span style={small}>· {n0(it.kcal)} kcal · {portionLabel(it)} · {GENERIC_LABEL}</span></button>; })}
    {(s.off.length > 0 || s.offState) && <div style={head}>UK products</div>}
    {s.offState === "loading" && <div style={small}>Searching UK products…</div>}
    {s.offState === "none" && <div style={small}>No UK products found for “{s.term}”.</div>}
    {s.offState === "down" && <div data-testid="off-down" style={small}>UK product search isn't responding right now — your lists and common foods above still work. <button type="button" style={Object.assign({}, btn, { padding: "2px 8px", fontSize: 11 })} onClick={s.retry}>Try again</button></div>}
    {s.off.map(function(o, i) { var it = offToItem(o), type = productType(o), check = needsPortionCheck(o), pack = packSize(o);
      return <button key={"o" + i} type="button" data-testid={ids.off || "off-option"} onClick={function() { props.onPick("off", it, o); }} style={opt}>{props.prefix}{o.name}
        <span style={{ display: "block", marginTop: 2 }}>{type && <span data-testid="off-type" style={tag}>{type}</span>}
          <span style={small}>{check ? "per 100 g: " + n0(o.per100.kcal) + " kcal" + (pack ? " · pack " + pack : "") + " · check the portion" : n0(it.kcal) + " kcal per portion of " + it.portion.grams + " g"}</span></span></button>; })}
    {s.term.length >= 2 && (nothing
      ? <div data-testid="no-match" style={Object.assign({}, box, { marginTop: 8, background: "#eff6ff" })}><div style={{ fontSize: 12, marginBottom: 6 }}>Nothing matches “{s.term}”.</div>
          <button type="button" data-testid="describe-instead" style={btnP} onClick={function() { setDescribe(true); }}>Describe it instead</button></div>
      : <div style={{ marginTop: 8 }}><button type="button" data-testid="describe-instead" style={Object.assign({}, btn, { padding: "4px 10px", fontSize: 11 })} onClick={function() { setDescribe(true); }}>Can't see it? Describe it instead</button></div>)}
  </div>);
}

/** "Describe it instead": the Companion identifies the food and offers 1–3 choices; if it can't tell, it asks (never fails silently). */
function DescribeIt(props) {
  var [text, setText] = React.useState(props.text || "");
  var [busy, setBusy] = React.useState(false);
  var [choices, setChoices] = React.useState(null);
  var [question, setQuestion] = React.useState(null);
  var [err, setErr] = React.useState("");
  var find = async function() {
    if (!text.trim() || busy) return; setBusy(true); setErr("");
    try { var r = await identifyFood(text); if (r.type === "choices") setChoices(r.choices.map(itemFromReply)); else setQuestion(r.question); }
    catch (e) { setErr(window.isEnergyEmpty && window.isEnergyEmpty(e) ? window.energyEmptyMsg : "Your Companion isn't reachable right now — your text is kept, try again."); }
    setBusy(false);
  };
  if (question) return <ClarifyChat initialTurns={[{ role: "user", text: text }, { role: "assistant", text: question }]} onResult={props.onPick} />;
  return (<div data-testid="describe-it" style={box}>
    <label style={small} htmlFor="describe-text">Describe it in your own words (e.g. “bag of dried pasta spirals”)</label>
    <textarea id="describe-text" style={Object.assign({}, inp, { minHeight: 44 })} value={text} onChange={function(e) { setText(e.target.value); setChoices(null); }} />
    {choices && <div style={head}>Is it one of these? Tap to choose</div>}
    {choices && choices.map(function(it, i) { return <button key={i} type="button" data-testid="describe-choice" style={opt} onClick={function() { props.onPick(it); }}>{it.name} <span style={small}>· {n0(it.kcal)} kcal · {portionLabel(it)}</span></button>; })}
    {busy && <div style={small}>Your Companion is working it out…</div>}
    {err && <div role="alert" style={{ fontSize: 12, color: "#991b1b", marginTop: 4 }}>{err}</div>}
    <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
      <button type="button" style={btnP} onClick={find} disabled={busy}>{choices ? "Look again" : "Find it"}</button>
      <button type="button" style={btn} onClick={props.onCancel}>Back to search</button>
    </div>
  </div>);
}

/** Save step shared by the three tabs: categories + optional "Add to <slot> now". */
function SaveStep(props) {
  var rt = props.returnTo;
  var [cats, setCats] = React.useState(function() { var o = {}; o[(rt && rt.cat) || props.defaultCat || props.cats[0].k] = true; return o; });
  var [addNow, setAddNow] = React.useState(!!rt);
  var [msg, setMsg] = React.useState("");
  var [clash, setClash] = React.useState(null);   // v2.20.1: [{ label, kcal }] — a different item with the same name is already there
  var item = withRuleRating(props.item);   // D11 per portion, against the UK reference (list item)
  var b = bandOf(item) || "";
  var key = function(x) { return String((x && x.name) || "").trim().toLowerCase(); };
  /* v2.20.1 (JC: the preview said 373 kcal, the saved card 628): an older list item with the same name was silently kept.
     Now an identical one is reused (no duplicate); a different one is never kept silently — Replace it, or Keep both. */
  var differs = function(a) { var na = itemNutrition(a), nb = itemNutrition(item); return NUTR_KEYS.some(function(k) { return Math.abs(num(na[k]) - num(nb[k])) > (k === "kcal" ? 0.5 : 0.05); }); };
  var save = async function(mode) {
    var chosen = props.cats.filter(function(c) { return cats[c.k]; });
    if (!chosen.length) { setMsg("Choose at least one list."); return; }
    var clashes = chosen.map(function(c) { var same = c.customs.find(function(x) { return x && key(x) === key(item); }); return same && differs(same) ? { label: c.label, kcal: n0(itemNutrition(same).kcal) } : null; }).filter(Boolean);
    if (clashes.length && !mode) { setClash(clashes); return; }
    setClash(null);
    var ts = Date.now(), firstId = null, forSlot = null, name = item.name;
    if (mode === "both") { var all = [].concat.apply([], chosen.map(function(c) { return c.customs; })); var k2 = 2; while (all.some(function(x) { return key(x) === (item.name + " (" + k2 + ")").toLowerCase(); })) k2++; name = item.name + " (" + k2 + ")"; }
    for (var i = 0; i < chosen.length; i++) {
      var c = chosen[i]; var id = "custom_" + ts + "_" + i;
      var same = mode === "both" ? null : c.customs.find(function(x) { return x && key(x) === key(item); });
      var it, u;
      if (same && !differs(same)) { it = same; id = same.id; }                                              // identical: no duplicate
      else if (same) { it = Object.assign({}, item, { id: same.id }); delete it._isCustom; id = same.id; u = c.customs.map(function(x) { return x.id === same.id ? it : x; }); }   // Replace
      else { it = Object.assign({}, item, { id: id, name: name }); delete it._isCustom; u = c.customs.concat([it]); }
      if (u) { c.setCustoms(u); await sSet(c.storageKey, JSON.stringify(u)); }
      if (!firstId) firstId = id; if (rt && c.k === rt.cat) forSlot = { id: id, item: it };
    }
    if (addNow && rt && props.onAddNow) await props.onAddNow(forSlot || { id: firstId, item: Object.assign({}, item, { id: firstId }) }, rt);
    setMsg("✅ Added " + item.name + " to " + chosen.map(function(c) { return c.label; }).join(", ") + (addNow && rt ? " and to " + rt.label : ""));
    if (props.onSaved) props.onSaved();
  };
  return (<div data-testid="save-step" style={box}>
    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.name}</div>
    <div data-testid="portion-label" style={small}>{portionLabel(item)}</div>
    <PortionValues n={itemNutrition(item)} />
    <div data-testid="save-rating" style={{ fontSize: 11, fontWeight: 700, color: RAGC[item.rating] || "#334155", marginTop: 2 }}>{b ? (b.indexOf("RED") === 0 ? "RED" : b) + " · " + FREQ_LABEL[b] : ""} <span style={{ fontWeight: 400, color: "#475569" }}>(per portion, against the UK reference)</span></div>
    <fieldset style={{ border: "none", padding: 0, margin: "8px 0 0" }}><legend style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>Add to my lists</legend>
      {props.cats.map(function(c) { return (<label key={c.k} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 10, fontSize: 12 }}><input type="checkbox" checked={!!cats[c.k]} onChange={function(e) { var o = Object.assign({}, cats); o[c.k] = e.target.checked; setCats(o); }} />{c.label}</label>); })}
    </fieldset>
    {rt && <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 6 }}><input type="checkbox" checked={addNow} onChange={function(e) { setAddNow(e.target.checked); }} />Add to {rt.label} now</label>}
    {msg && <div role="status" style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: msg.charAt(0) === "✅" ? "#166534" : "#991b1b" }}>{msg}</div>}
    {clash && (<div role="alertdialog" aria-label="Same name already in your list" data-testid="name-clash" style={{ marginTop: 8, padding: 10, borderRadius: 8, background: "#fffbeb", border: "1px solid #fcd34d", fontSize: 12, color: "#0f172a" }}>
      You already have <b>{item.name}</b> in {clash.map(function(x) { return x.label + " (" + x.kcal + " kcal per portion)"; }).join(", ")}. This one is <b>{n0(itemNutrition(item).kcal)} kcal</b> per portion.
      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}><button type="button" style={btnP} onClick={function() { save("replace"); }}>Replace it with this one</button><button type="button" style={btn} onClick={function() { save("both"); }}>Keep both</button></div>
    </div>)}
    <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
      <button type="button" style={btnP} onClick={function() { save(); }}>Save</button>
      {props.onBack && <button type="button" style={btn} onClick={props.onBack}>Back</button>}
    </div>
  </div>);
}

/* ---------- a) Single item ---------- */
function SingleItem(props) {
  var s = useSearch(props, props.catalogue);
  var [pick, setPick] = React.useState(null);   // the item being confirmed
  var [grams, setGrams] = React.useState("");
  var [guard, setGuard] = React.useState(null); // v2.19.2 wrong-match guard: { type, pack, ok }
  var [ready, setReady] = React.useState(false);
  if (ready && pick) return <SaveStep {...props} item={pick} onBack={function() { setReady(false); }} onSaved={props.onSaved} />;
  var choose = function(kind, it, o) {
    var p = it, g = null;
    if (kind === "own" || kind === "catalogue") p = Object.assign({}, it, { portion: it.portion || { desc: "1 portion (standard)", grams: null }, source: it.source || "catalogue" });
    if (kind === "off" && needsPortionCheck(o)) {
      var type = productType(o);
      if (type === "sauce / jar" && o.packG && !o.servingG) p = setPortionGrams(it, Math.round(o.packG / 4), "¼ of the pack (" + Math.round(o.packG / 4) + " g)");
      g = { type: type, pack: packSize(o), ok: false };
    }
    setPick(p); setGuard(g); setGrams(p.per100 && p.portion ? String(p.portion.grams) : "");
  };
  if (pick) {
    var blocked = guard && !guard.ok;
    return (<div data-testid="single-confirm" style={box}>
      <label style={small} htmlFor="single-name">Name</label>
      <input id="single-name" style={inp} value={pick.name} onChange={function(e) { setPick(Object.assign({}, pick, { name: e.target.value })); }} />
      {pick.sourceLabel && <div style={Object.assign({}, small, { marginTop: 4 })}>Source: {pick.sourceLabel}</div>}
      {guard && (<div data-testid="portion-guard" style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: 8, marginTop: 8, fontSize: 12, color: "#0f172a" }}>
        {guard.type && <span data-testid="off-type" style={tag}>{guard.type}</span>}
        <b>Check the portion before adding.</b> These values are per 100 g{guard.type ? " of a " + guard.type.replace(" / jar", "") : ""}, not a portion of a meal.
        {guard.pack && <div>Pack size: <b data-testid="pack-size">{guard.pack}</b></div>}
        {guard.ok && <div style={{ color: "#166534", fontWeight: 600, marginTop: 4 }}>✓ Portion confirmed</div>}
      </div>)}
      <div data-testid="portion-label" style={Object.assign({}, small, { marginTop: 6 })}>{portionLabel(pick)}</div>
      {pick.per100 && (<div style={{ marginTop: 4 }}><label style={small} htmlFor="single-grams">My portion size (g)</label>
        <input id="single-grams" type="number" inputMode="decimal" style={inp} value={grams} onChange={function(e) { setGrams(e.target.value); var g = parseFloat(e.target.value); if (g > 0) setPick(setPortionGrams(pick, g)); }} /></div>)}
      <PortionValues n={itemNutrition(pick)} />
      <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
        {blocked && <button type="button" data-testid="confirm-portion" style={btnP} onClick={function() { setGuard(Object.assign({}, guard, { ok: true })); }}>Yes, {portionLabel(pick).toLowerCase()}</button>}
        <button type="button" style={Object.assign({}, btnP, blocked ? { opacity: 0.45, cursor: "not-allowed" } : {})} disabled={blocked} onClick={function() { setReady(true); }}>Confirm</button>
        <button type="button" style={btn} onClick={function() { setPick(null); setGuard(null); }}>Back</button>
      </div>
    </div>);
  }
  return (<div style={box}>
    <FoodSearch s={s} isJC={props.isJC} inputId="single-search" label="Search your lists, common foods and UK products" placeholder="e.g. fusilli, porridge, Aldi pasta bake" onPick={choose} />
  </div>);
}

/* ---------- b) Build a meal ---------- */
export function MealBuilder(props) {
  var s = useSearch(props, props.available);
  var init = props.initial;
  var [comps, setComps] = React.useState(function() { return init && init.meal ? relinkComponents(init.meal.components, props.lookup, props.isJC) : []; });
  var [name, setName] = React.useState(init ? init.name : "");
  var [serves, setServes] = React.useState(init && init.meal ? String(init.meal.serves) : "1");
  var [ready, setReady] = React.useState(false);
  var [msg, setMsg] = React.useState("");
  /* v2.20.1 (JC): adding must be obvious and never duplicate a row — clear the search, "Added: …" (live), highlight and
     scroll to the new card; the same item again asks "Add another portion?" (Yes = more on the existing row). */
  var [added, setAdded] = React.useState(null);     // { i, text } — the card just added / topped up
  var [dup, setDup] = React.useState(null);         // { i, name } — waiting for Yes / No
  React.useEffect(function() { if (!added) return; var el = document.querySelector('[data-testid="meal-comp"][data-idx="' + added.i + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" }); var t = setTimeout(function() { setAdded(null); }, 3000); return function() { clearTimeout(t); }; }, [added]);
  var sameAs = function(c, it, ref) { return (ref && c.ref === ref) || (!c.ref && !ref && String(c.name).trim().toLowerCase() === String(it.name).trim().toLowerCase()); };
  var addComp = function(it, ref, patch) {
    s.setQ("");                                    // clear the search (closes the results list)
    var at = comps.findIndex(function(c) { return sameAs(c, it, ref); });
    if (at >= 0) { setDup({ i: at, name: it.name }); return; }
    setComps(comps.concat([Object.assign(componentFrom(it, props.isJC, ref), patch || {})]));
    setAdded({ i: comps.length, text: "Added: " + it.name });
  };
  var morePortion = function() {
    var c = comps[dup.i], step = c.unit === "g" ? (num(c.portionGrams) || (c.per100 ? 100 : 0) || 100) : 1;
    upd(dup.i, { amount: String(Math.round((num(c.amount) + step) * 100) / 100) });
    setAdded({ i: dup.i, text: "Added another portion: " + c.name }); setDup(null);
  };
  var pickComp = function(kind, it, o) {
    if (kind === "own") return addComp(it, it.id);
    if (kind === "off" && needsPortionCheck(o)) return addComp(it, null, { unit: "g", amount: o.packG ? Math.round(o.packG) : 100, check: productType(o) || "per 100 g" });   // v2.19.2: amount in grams, to check
    addComp(it, null);
  };
  var upd = function(i, patch) { setComps(comps.map(function(c, j) { return j === i ? Object.assign({}, c, patch) : c; })); };
  var per = mealNutrition(comps, serves);
  var build = function() { return mealItem(Object.assign({}, init || {}, { name: name.trim() }), comps.map(function(c) { var x = Object.assign({}, c); delete x.check; return x; }), serves, props.isJC); };
  if (ready) return <SaveStep {...props} item={build()} onBack={function() { setReady(false); }} onSaved={props.onSaved} />;
  var next = async function() {
    if (!name.trim()) { setMsg("Give the meal a name."); return; }
    if (!comps.length) { setMsg("Add at least one item."); return; }
    if (comps.some(function(c) { return !componentNutrition(c); })) { setMsg("An item in grams has no gram size — use portions for it."); return; }
    if (init && props.onSaveEdit) { await props.onSaveEdit(build()); return; }
    setReady(true);
  };
  return (<div data-testid="meal-builder" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    <div style={Object.assign({}, box, { flex: "1 1 240px", minWidth: 0 })}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a5f", marginBottom: 4 }}>Available items</div>
      <FoodSearch s={s} isJC={props.isJC} inputId="meal-search" ariaLabel="Search available items" label="" placeholder="Search my lists, common foods, UK products" prefix="+ " onPick={pickComp}
        testids={{ own: "avail-own", cat: "avail-catalogue", gen: "avail-generic", off: "avail-off" }} />
    </div>
    <div style={Object.assign({}, box, { flex: "1 1 260px", minWidth: 0 })}>
      <label style={small} htmlFor="meal-name">Meal name</label>
      <input id="meal-name" style={inp} value={name} onChange={function(e) { setName(e.target.value); }} placeholder="e.g. Chicken pasta bake" />
      {comps.length === 0 && <div style={Object.assign({}, small, { marginTop: 6 })}>Tap items on the left to add them.</div>}
      {added && <div role="status" aria-live="polite" data-testid="meal-added" style={{ position: "fixed", left: 12, right: 12, bottom: "calc(84px + env(safe-area-inset-bottom))", zIndex: 1200, maxWidth: 456, margin: "0 auto", padding: "10px 14px", borderRadius: 10, background: "#166534", color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "0 6px 20px rgba(0,0,0,0.25)" }}>✓ {added.text}</div>}
      {dup && (<div role="alertdialog" aria-label="Already in this meal" data-testid="dup-prompt" style={{ marginTop: 8, padding: 10, borderRadius: 8, background: "#fffbeb", border: "1px solid #fcd34d", fontSize: 12, color: "#0f172a" }}>
        <div><b>{dup.name}</b> is already in this meal. Add another portion?</div>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}><button type="button" style={btnP} onClick={morePortion}>Yes</button><button type="button" style={btn} onClick={function() { setDup(null); }}>No</button></div>
      </div>)}
      {comps.map(function(c, i) { var n = componentNutrition(c); var hi = added && added.i === i; return (<div key={i} data-testid="meal-comp" data-idx={i} data-new={hi ? "true" : "false"} style={{ border: hi ? "2px solid #16a34a" : "1px solid #bfdbfe", borderRadius: 8, padding: hi ? 7 : 8, marginTop: 8, background: hi ? "#f0fdf4" : "#f8fafc", transition: "background 0.3s" }}>
        <div data-testid="meal-comp-name" style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", overflowWrap: "anywhere" }}>{c.name}</div>
        {c.check && <div style={Object.assign({}, small, { marginTop: 2 })}><span style={tag}>{c.check}</span>check the amount — values are per 100 g</div>}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(40px, 52px) minmax(80px, 110px) auto minmax(30px, 1fr)", alignItems: "center", columnGap: 12, marginTop: 6 }}>
          <input aria-label={"Amount of " + c.name} type="number" inputMode="decimal" value={c.amount} onChange={function(e) { upd(i, { amount: e.target.value }); }} style={Object.assign({}, inp, { width: "100%", minWidth: 0, padding: "6px 6px", fontSize: 12 })} />
          <select aria-label={"Unit for " + c.name} value={c.unit} onChange={function(e) { upd(i, { unit: e.target.value }); }} style={Object.assign({}, inp, { width: "100%", minWidth: 0, padding: "6px 2px", fontSize: 12 })}>
            <option value="portion">portions</option>{canUseGrams(c) && <option value="g">grams</option>}
          </select>
          <span data-testid="meal-comp-kcal" style={{ fontSize: 12, color: "#334155", whiteSpace: "nowrap" }}>{n ? n0(n.kcal) + " kcal" : "—"}</span>
          <button type="button" aria-label={"Remove " + c.name} style={Object.assign({}, btn, { padding: "4px 8px", justifySelf: "end" })} onClick={function() { setComps(comps.filter(function(x, j) { return j !== i; })); }}>✕</button>
        </div>
      </div>); })}
      <label style={Object.assign({}, small, { display: "block", marginTop: 10 })} htmlFor="meal-serves">Serves</label>
      <input id="meal-serves" type="number" inputMode="numeric" min="1" style={Object.assign({}, inp, { width: 80 })} value={serves} onChange={function(e) { setServes(e.target.value); }} />
      <div data-testid="meal-summary" style={{ marginTop: 10, marginBottom: 12, padding: 8, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe" }}><PortionValues n={per} testid="meal-per-portion" /></div>
      {init && <div style={Object.assign({}, small, { marginBottom: 8, fontStyle: "italic" })}>To change an ingredient's own nutrition, edit that item in your list.</div>}
      {msg && <div role="alert" style={{ fontSize: 12, color: "#991b1b", marginBottom: 8 }}>{msg}</div>}
      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" style={btnP} onClick={next}>{init ? "Save meal" : "Next"}</button>
        {props.onCancel && <button type="button" style={btn} onClick={props.onCancel}>Cancel</button>}
      </div>
    </div>
  </div>);
}

/* ---------- c) Create my own item: the clarifying conversation ---------- */
export function ClarifyChat(props) {
  var [turns, setTurns] = React.useState(props.initialTurns || []);
  var [text, setText] = React.useState(props.seed || "");
  var [busy, setBusy] = React.useState(false);
  var [err, setErr] = React.useState("");
  var [result, setResult] = React.useState(null);
  var send = async function() {
    var t = text.trim(); if (!t || busy) return;
    var next = turns.concat([{ role: "user", text: t }]); setTurns(next); setText(""); setBusy(true); setErr("");
    try {
      var r = await clarifyTurn(next);
      if (r.type === "question") setTurns(next.concat([{ role: "assistant", text: r.question }]));
      else { var it = itemFromReply(r.reply); setResult(it); if (props.onResult) props.onResult(it); }
    } catch (e) { setTurns(turns); setText(t); setErr(window.isEnergyEmpty && window.isEnergyEmpty(e) ? window.energyEmptyMsg : "The Companion isn't reachable right now (" + String(e.message || e).slice(0, 60) + "). Your text is kept — try Send again."); }
    setBusy(false);
  };
  return (<div data-testid="clarify-chat" style={box}>
    {turns.length === 0 && <div style={small}>Describe it: the ingredients and amounts, brand, and how many portions it makes if you know. Your Companion will ask about anything it needs.</div>}
    {turns.map(function(t, i) { return <div key={i} data-testid={t.role === "assistant" ? "clarify-question" : "clarify-answer"} style={{ margin: "6px 0", padding: 8, borderRadius: 8, fontSize: 12, background: t.role === "assistant" ? "#f1f5f9" : "#eff6ff", textAlign: t.role === "assistant" ? "left" : "right" }}>{t.text}</div>; })}
    {!result && (<div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "flex-end" }}>
      <textarea aria-label={turns.length ? "Your answer" : "Describe your item"} value={text} onChange={function(e) { setText(e.target.value); }} style={Object.assign({}, inp, { minHeight: 44 })} />
      <button type="button" style={btnP} onClick={send} disabled={busy}>{busy ? "…" : "Send"}</button>
    </div>)}
    {busy && <div style={small}>Your Companion is working it out…</div>}
    {err && <div role="alert" style={{ fontSize: 12, color: "#991b1b", marginTop: 4 }}>{err}</div>}
  </div>);
}
function OwnItem(props) {
  var [item, setItem] = React.useState(null);
  var [ready, setReady] = React.useState(false);
  if (ready && item) return <SaveStep {...props} item={item} onBack={function() { setReady(false); }} onSaved={props.onSaved} />;
  return (<div>
    {!item && <ClarifyChat seed={props.seed} initialTurns={props.initialTurns} onResult={setItem} />}
    {item && (<div data-testid="own-confirm" style={box}>
      <label style={small} htmlFor="own-name">Name</label>
      <input id="own-name" style={inp} value={item.name} onChange={function(e) { setItem(Object.assign({}, item, { name: e.target.value })); }} />
      <div data-testid="portion-label" style={Object.assign({}, small, { marginTop: 6 })}>{portionLabel(item)}{item.servings > 1 ? " · the recipe makes " + item.servings : ""}</div>
      <PortionValues n={itemNutrition(item)} />
      {item.assumptions && <div style={Object.assign({}, small, { fontStyle: "italic" })}>Assumed: {item.assumptions}</div>}
      <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
        <button type="button" style={btnP} onClick={function() { setReady(true); }}>Confirm</button>
        <button type="button" style={btn} onClick={function() { setItem(null); }}>Start again</button>
      </div>
    </div>)}
  </div>);
}

/** The three tabs. tab / setTab are owned by My Eating so "+ Not in my list?" can open the right tab.
 *  v2.19.2: one line of three equal segments (selected deep blue, others white with a blue border) on the light-blue panel. */
export default function UpdateLists(props) {
  var tab = props.tab || "single";
  var [k, setK] = React.useState(0);   // remount after a save
  var tabs = [["single", "Single item"], ["meal", "Build a meal"], ["own", "My own"]];
  var common = Object.assign({}, props, { onSaved: function() { if (props.onSaved) props.onSaved(); } });
  return (<div id="update-lists" data-testid="update-lists" style={{ marginBottom: 10, background: props.accentLight || "#dbeafe", border: "1px solid " + (props.accentBorder || "#93c5fd"), borderRadius: 8, padding: 10 }}>
    {props.returnTo && <div data-testid="return-to" style={{ fontSize: 12, color: "#1e3a8a", background: "#fff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 8, marginBottom: 8 }}>
      Adding for <b>{props.returnTo.label}</b>. <button type="button" style={Object.assign({}, btn, { padding: "2px 8px", fontSize: 11 })} onClick={props.onBackToSlot}>Back to {props.returnTo.label}</button></div>}
    <div role="tablist" aria-label="Update Lists" data-testid="ul-tabs" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginBottom: 10 }}>
      {tabs.map(function(t) { var on = tab === t[0]; return <button key={t[0]} role="tab" aria-selected={on} type="button" onClick={function() { props.setTab(t[0]); setK(k + 1); }}
        style={Object.assign({}, btn, { padding: "8px 4px", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, on ? { background: BLUE, color: "#fff", border: "1px solid #1e3a5f" } : {})}>{t[1]}</button>; })}
    </div>
    {tab === "single" && <SingleItem key={"s" + k} {...common} />}
    {tab === "meal" && <MealBuilder key={"m" + k} {...common} />}
    {tab === "own" && <OwnItem key={"o" + k} {...common} />}
  </div>);
}
export { withPortionValues };
