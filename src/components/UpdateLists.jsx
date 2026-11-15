import React from "react";
import { sSet } from "../lib/storage.js";
import { withRuleRating, bandOf, FREQ_LABEL } from "../lib/rag.js";
import { itemNutrition, portionLabel, offProduct, offToItem, setPortionGrams, componentFrom, componentNutrition, canUseGrams, mealNutrition, mealItem, relinkComponents, itemFromReply, withPortionValues } from "../lib/portion.js";
import { clarifyTurn } from "../lib/clarify.js";

// v2.19.0 Update Lists (docs/design/EATING_LISTS.md §3): Add single item · Build a meal · Create my own item.
// Everything is per portion; all three end with Save → D11 rating (per portion) → the chosen category lists, optionally
// "Add to <day/slot> now".
var box = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, marginBottom: 8 };
var inp = { width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 };
var btn = { padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid #cbd5e1", background: "#fff", color: "#334155" };
var btnP = Object.assign({}, btn, { background: "#1e3a8a", color: "#fff", border: "none" });
var small = { fontSize: 11, color: "#475569" };
var RAGC = { RED: "#b91c1c", AMBER: "#b45309", GOOD: "#15803d", GREAT: "#15803d" };
var n0 = function(x) { return Math.round(x || 0); };
var n1 = function(x) { return Math.round((x || 0) * 10) / 10; };
var OFF_URL = function(term) { return "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" + encodeURIComponent(term) + "&search_simple=1&action=process&json=1&page_size=8&fields=product_name,brands,code,nutriments,serving_size,serving_quantity,ingredients_text"; };

/** Per-portion values line. */
export function PortionValues(props) {
  var n = props.n;
  return (<div data-testid={props.testid || "per-portion"} style={{ fontSize: 11, color: "#0f172a", lineHeight: 1.6 }}>
    <b>Per portion:</b> {n0(n.kcal)} kcal · protein {n1(n.protein)} g · fat {n1(n.fat)} g · sat fat {n1(n.satFat)} g · carbs {n1(n.carbs)} g{n.addedSugar ? " · added sugar " + n1(n.addedSugar) + " g" : ""} · fibre {n1(n.fibre)} g · salt {n1(n.salt)} g
  </div>);
}

/** Search the catalogue (available, not yet in the lists) and Open Food Facts. */
function useSearch(catalogue) {
  var [q, setQ] = React.useState("");
  var [off, setOff] = React.useState([]);
  var [offState, setOffState] = React.useState("");
  var cat = q.trim().length < 2 ? [] : catalogue.filter(function(it) { return it.name.toLowerCase().indexOf(q.trim().toLowerCase()) >= 0; }).slice(0, 12);
  var searchOff = async function() {
    if (q.trim().length < 2) return; setOffState("Searching UK products…");
    try { var r = await fetch(OFF_URL(q.trim())); var d = await r.json(); var list = (d.products || []).filter(function(p) { return p.product_name && p.nutriments && p.nutriments["energy-kcal_100g"] != null; }).map(offProduct); setOff(list); setOffState(list.length ? "" : "No UK products found — try another name, or Create my own item."); }
    catch (e) { setOff([]); setOffState("Product search isn't available right now — try again, or Create my own item."); }
  };
  return { q: q, setQ: setQ, cat: cat, off: off, offState: offState, searchOff: searchOff };
}

/** Save step shared by the three tabs: categories + optional "Add to <slot> now". */
function SaveStep(props) {
  var rt = props.returnTo;
  var [cats, setCats] = React.useState(function() { var o = {}; o[(rt && rt.cat) || props.defaultCat || props.cats[0].k] = true; return o; });
  var [addNow, setAddNow] = React.useState(!!rt);
  var [msg, setMsg] = React.useState("");
  var item = withRuleRating(props.item);   // D11 per portion, against the UK reference (list item)
  var b = bandOf(item) || "";
  var save = async function() {
    var chosen = props.cats.filter(function(c) { return cats[c.k]; });
    if (!chosen.length) { setMsg("Choose at least one list."); return; }
    var ts = Date.now(), firstId = null, forSlot = null;
    for (var i = 0; i < chosen.length; i++) {
      var c = chosen[i]; var id = "custom_" + ts + "_" + i;
      var it = Object.assign({}, item, { id: id }); delete it._isCustom;
      var u = c.customs.concat([it]); c.setCustoms(u); await sSet(c.storageKey, JSON.stringify(u));
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
    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
      <button type="button" style={btnP} onClick={save}>Save</button>
      {props.onBack && <button type="button" style={btn} onClick={props.onBack}>Back</button>}
    </div>
  </div>);
}

/* ---------- a) Add single item ---------- */
function SingleItem(props) {
  var s = useSearch(props.catalogue);
  var [pick, setPick] = React.useState(null);   // the item being confirmed
  var [grams, setGrams] = React.useState("");
  var [ready, setReady] = React.useState(false);
  if (ready && pick) return <SaveStep {...props} item={pick} onBack={function() { setReady(false); }} onSaved={props.onSaved} />;
  if (pick) {
    return (<div data-testid="single-confirm" style={box}>
      <label style={small} htmlFor="single-name">Name</label>
      <input id="single-name" style={inp} value={pick.name} onChange={function(e) { setPick(Object.assign({}, pick, { name: e.target.value })); }} />
      <div data-testid="portion-label" style={Object.assign({}, small, { marginTop: 6 })}>{portionLabel(pick)}</div>
      {pick.per100 && (<div style={{ marginTop: 4 }}><label style={small} htmlFor="single-grams">My portion size (g)</label>
        <input id="single-grams" type="number" inputMode="decimal" style={inp} value={grams} onChange={function(e) { setGrams(e.target.value); var g = parseFloat(e.target.value); if (g > 0) setPick(setPortionGrams(pick, g)); }} /></div>)}
      <PortionValues n={itemNutrition(pick)} />
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button type="button" style={btnP} onClick={function() { setReady(true); }}>Confirm</button>
        <button type="button" style={btn} onClick={function() { setPick(null); }}>Back</button>
      </div>
    </div>);
  }
  return (<div style={box}>
    <label style={small} htmlFor="single-search">Search the app's foods or UK products</label>
    <div style={{ display: "flex", gap: 6 }}><input id="single-search" style={inp} value={s.q} onChange={function(e) { s.setQ(e.target.value); }} placeholder="e.g. porridge, Aldi pasta bake sauce" />
      <button type="button" style={btn} onClick={s.searchOff}>Search UK products</button></div>
    {s.cat.length > 0 && <div style={Object.assign({}, small, { marginTop: 6, fontWeight: 700 })}>Available foods</div>}
    {s.cat.map(function(it) { return <button key={"c" + it.id} type="button" data-testid="catalogue-option" onClick={function() { setPick(Object.assign({}, it, { portion: it.portion || { desc: "1 portion (standard)", grams: null }, source: "catalogue" })); setGrams(""); }} style={Object.assign({}, btn, { display: "block", width: "100%", textAlign: "left", marginTop: 4, color: "#475569" })}>{it.name} <span style={small}>({n0(props.isJC ? it.jcKcal : it.beckKcal)} kcal per portion)</span></button>; })}
    {s.offState && <div style={Object.assign({}, small, { marginTop: 6 })}>{s.offState}</div>}
    {s.off.length > 0 && <div style={Object.assign({}, small, { marginTop: 6, fontWeight: 700 })}>UK products</div>}
    {s.off.map(function(o, i) { var it = offToItem(o); return <button key={"o" + i} type="button" data-testid="off-option" onClick={function() { setPick(it); setGrams(String(it.portion.grams)); }} style={Object.assign({}, btn, { display: "block", width: "100%", textAlign: "left", marginTop: 4 })}>{o.name} <span style={small}>({n0(it.kcal)} kcal per portion of {it.portion.grams} g)</span></button>; })}
  </div>);
}

/* ---------- b) Build a meal ---------- */
export function MealBuilder(props) {
  var s = useSearch(props.available);
  var init = props.initial;
  var [comps, setComps] = React.useState(function() { return init && init.meal ? relinkComponents(init.meal.components, props.lookup, props.isJC) : []; });
  var [name, setName] = React.useState(init ? init.name : "");
  var [serves, setServes] = React.useState(init && init.meal ? String(init.meal.serves) : "1");
  var [ready, setReady] = React.useState(false);
  var [msg, setMsg] = React.useState("");
  var addComp = function(it, ref) { setComps(comps.concat([componentFrom(it, props.isJC, ref)])); };
  var upd = function(i, patch) { setComps(comps.map(function(c, j) { return j === i ? Object.assign({}, c, patch) : c; })); };
  var per = mealNutrition(comps, serves);
  var build = function() { return mealItem(Object.assign({}, init || {}, { name: name.trim() }), comps, serves, props.isJC); };
  if (ready) return <SaveStep {...props} item={build()} onBack={function() { setReady(false); }} onSaved={props.onSaved} />;
  var next = async function() {
    if (!name.trim()) { setMsg("Give the meal a name."); return; }
    if (!comps.length) { setMsg("Add at least one item."); return; }
    if (comps.some(function(c) { return !componentNutrition(c); })) { setMsg("An item in grams has no gram size — use portions for it."); return; }
    if (init && props.onSaveEdit) { await props.onSaveEdit(build()); return; }
    setReady(true);
  };
  var own = s.q.trim().length < 2 ? [] : props.ownItems.filter(function(it) { return it.name.toLowerCase().indexOf(s.q.trim().toLowerCase()) >= 0; }).slice(0, 12);
  return (<div data-testid="meal-builder" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    <div style={Object.assign({}, box, { flex: "1 1 240px", minWidth: 0 })}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Available items</div>
      <div style={{ display: "flex", gap: 6 }}><input aria-label="Search available items" style={inp} value={s.q} onChange={function(e) { s.setQ(e.target.value); }} placeholder="Search my lists, foods, UK products" />
        <button type="button" style={btn} onClick={s.searchOff}>UK products</button></div>
      {own.map(function(it) { return <button key={"m" + it.id} type="button" data-testid="avail-own" onClick={function() { addComp(it, it.id); }} style={Object.assign({}, btn, { display: "block", width: "100%", textAlign: "left", marginTop: 4 })}>+ {it.name} <span style={small}>({n0(itemNutrition(it).kcal)} kcal per portion)</span></button>; })}
      {s.cat.map(function(it) { return <button key={"c" + it.id} type="button" data-testid="avail-catalogue" onClick={function() { addComp(it, null); }} style={Object.assign({}, btn, { display: "block", width: "100%", textAlign: "left", marginTop: 4, color: "#475569" })}>+ {it.name} <span style={small}>({n0(props.isJC ? it.jcKcal : it.beckKcal)} kcal per portion)</span></button>; })}
      {s.offState && <div style={Object.assign({}, small, { marginTop: 6 })}>{s.offState}</div>}
      {s.off.map(function(o, i) { var it = offToItem(o); return <button key={"o" + i} type="button" data-testid="avail-off" onClick={function() { addComp(it, null); }} style={Object.assign({}, btn, { display: "block", width: "100%", textAlign: "left", marginTop: 4 })}>+ {o.name} <span style={small}>({n0(it.per100.kcal)} kcal per 100 g source)</span></button>; })}
    </div>
    <div style={Object.assign({}, box, { flex: "1 1 260px", minWidth: 0 })}>
      <label style={small} htmlFor="meal-name">Meal name</label>
      <input id="meal-name" style={inp} value={name} onChange={function(e) { setName(e.target.value); }} placeholder="e.g. Chicken pasta bake" />
      {comps.length === 0 && <div style={Object.assign({}, small, { marginTop: 6 })}>Tap items on the left to add them.</div>}
      {comps.map(function(c, i) { var n = componentNutrition(c); return (<div key={i} data-testid="meal-comp" style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
        <span style={{ flex: "1 1 120px", fontSize: 12 }}>{c.name}</span>
        <input aria-label={"Amount of " + c.name} type="number" inputMode="decimal" value={c.amount} onChange={function(e) { upd(i, { amount: e.target.value }); }} style={Object.assign({}, inp, { width: 70 })} />
        <select aria-label={"Unit for " + c.name} value={c.unit} onChange={function(e) { upd(i, { unit: e.target.value }); }} style={Object.assign({}, inp, { width: 100 })}>
          <option value="portion">portion(s)</option>{canUseGrams(c) && <option value="g">grams</option>}
        </select>
        <span style={small}>{n ? n0(n.kcal) + " kcal" : "—"}</span>
        <button type="button" aria-label={"Remove " + c.name} style={btn} onClick={function() { setComps(comps.filter(function(x, j) { return j !== i; })); }}>✕</button>
      </div>); })}
      <label style={Object.assign({}, small, { display: "block", marginTop: 8 })} htmlFor="meal-serves">Serves</label>
      <input id="meal-serves" type="number" inputMode="numeric" min="1" style={Object.assign({}, inp, { width: 80 })} value={serves} onChange={function(e) { setServes(e.target.value); }} />
      <div style={{ marginTop: 6 }}><PortionValues n={per} testid="meal-per-portion" /></div>
      {init && <div style={Object.assign({}, small, { marginTop: 4, fontStyle: "italic" })}>To change an ingredient's own nutrition, edit that item in your list.</div>}
      {msg && <div role="alert" style={{ fontSize: 12, color: "#991b1b", marginTop: 4 }}>{msg}</div>}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button type="button" style={btnP} onClick={next}>{init ? "Save meal" : "Next"}</button>
        {props.onCancel && <button type="button" style={btn} onClick={props.onCancel}>Cancel</button>}
      </div>
    </div>
  </div>);
}

/* ---------- c) Create my own item: the clarifying conversation ---------- */
export function ClarifyChat(props) {
  var [turns, setTurns] = React.useState([]);
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
    {!result && (<div style={{ display: "flex", gap: 6, marginTop: 6 }}>
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
    {!item && <ClarifyChat seed={props.seed} onResult={setItem} />}
    {item && (<div data-testid="own-confirm" style={box}>
      <label style={small} htmlFor="own-name">Name</label>
      <input id="own-name" style={inp} value={item.name} onChange={function(e) { setItem(Object.assign({}, item, { name: e.target.value })); }} />
      <div data-testid="portion-label" style={Object.assign({}, small, { marginTop: 6 })}>{portionLabel(item)}{item.servings > 1 ? " · the recipe makes " + item.servings : ""}</div>
      <PortionValues n={itemNutrition(item)} />
      {item.assumptions && <div style={Object.assign({}, small, { fontStyle: "italic" })}>Assumed: {item.assumptions}</div>}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button type="button" style={btnP} onClick={function() { setReady(true); }}>Confirm</button>
        <button type="button" style={btn} onClick={function() { setItem(null); }}>Start again</button>
      </div>
    </div>)}
  </div>);
}

/** The three tabs. tab / setTab are owned by My Eating so "+ Not in my list?" can open the right tab. */
export default function UpdateLists(props) {
  var tab = props.tab || "single";
  var [k, setK] = React.useState(0);   // remount after a save
  var tabs = [["single", "Add single item"], ["meal", "Build a meal"], ["own", "Create my own item"]];
  var common = Object.assign({}, props, { onSaved: function() { if (props.onSaved) props.onSaved(); } });
  return (<div id="update-lists" data-testid="update-lists" style={{ marginBottom: 10 }}>
    {props.returnTo && <div data-testid="return-to" style={{ fontSize: 12, color: "#1e3a8a", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: 6, marginBottom: 6 }}>
      Adding for <b>{props.returnTo.label}</b>. <button type="button" style={Object.assign({}, btn, { padding: "2px 8px", fontSize: 11 })} onClick={props.onBackToSlot}>Back to {props.returnTo.label}</button></div>}
    <div role="tablist" aria-label="Update Lists" style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
      {tabs.map(function(t) { var on = tab === t[0]; return <button key={t[0]} role="tab" aria-selected={on} type="button" onClick={function() { props.setTab(t[0]); setK(k + 1); }} style={Object.assign({}, btn, on ? { background: "#1e3a8a", color: "#fff", border: "1px solid #1e3a8a" } : {})}>{t[1]}</button>; })}
    </div>
    {tab === "single" && <SingleItem key={"s" + k} {...common} />}
    {tab === "meal" && <MealBuilder key={"m" + k} {...common} />}
    {tab === "own" && <OwnItem key={"o" + k} {...common} />}
  </div>);
}
export { withPortionValues };
