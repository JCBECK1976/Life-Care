import { WeekSummary, DaySummary } from "../components/EatSummary.jsx";
import { useFavs, isFav, setFav, setFavPerson } from "../lib/favourites.js";
import { companionProfileCtx } from "../lib/profileCtx.js";
import { readImageForAI } from "../lib/image.js";
import RagCue from "../components/RagCue.jsx";
import { ratingsShown, ratingColor, ratingBg, ratingBorder, ratingDot, ratingLabel } from "../lib/rating.js";
import { RatingsHint } from "../components/Rating.jsx";

import PlanActual, { WeekPlanActual } from "../components/PlanActual.jsx";
import { goalKcal, kcalTargetText, personalLimits } from "../lib/goals.js";
import UpdateLists, { MealBuilder, ClarifyChat } from "../components/UpdateLists.jsx";
import { portionLabel, itemNutrition, withPortionValues, itemFromReply, parseJsonReply } from "../lib/portion.js";
import LoadingDots from "../components/LoadingDots.jsx";
import NoFoodPanel from "../components/NoFoodPanel.jsx";
import { BREAKFASTS, DEFAULT_BREAKFASTS, DEFAULT_DINNERS_GB, DEFAULT_LUNCHES, DINNERS, LUNCHES, POTATO_SIDES, SNACKS, VEG_SIDES } from "../constants/food.js";
import { calcWeek, fmtDate, getWeekDates, mealKey } from "../lib/utils.js";
import { handleApiError } from "../lib/api.js";
import { sGet, sSet } from "../lib/storage.js";
import React from "react";
import { withRuleRating, rateByPortion, frequencyWarning, FREQ_LABEL, bandOf } from "../lib/rag.js";
import { btnAction, btnActionLg, btnClear, btnClose, btnDelete, btnEdit, btnFilledOn, btnMuted, btnOpen, btnP, btnPortion, btnProgress, btnS, btnSnap } from "../constants/styles.js";
import { accentVariant } from "../lib/colour.js";
import { personName } from "../components/PersonTabs.jsx";
import OpenForm, { Field, inputStyle as openInput } from "../components/OpenForm.jsx";
import { stripKcal as stripKcalName } from "../lib/nutrition.js";
import { planAllows } from "../lib/myPlan.js";
import { GatePrompt } from "../components/PlanGate.jsx";
import { askItem, askItemsBatch, recheckBatch, recheckFlag, CLARIFY_SYSTEM, clarifyMealChange, mealChangeRequest } from "../lib/clarify.js";
import { applyDefaultsTo, generatorSummary, mergeGenerated, selectionName } from "../lib/meals.js";
import { fuzzyFind } from "../lib/foodSearch.js";
import { NO_FOOD_MSG, NO_FOOD_RULE, compareLine, gramsLine, noFood, requestBody } from "../lib/snap.js";
import { PHASE_LABEL } from "../lib/eatPhase.js";
import { dateOf, foodKey, loadWeekDoc, makeChild, occurrences, ragNote, reconcile, saveWeekDoc, viewFromDoc } from "../lib/children.js";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function EatingSection({ ctx }) {
  const {
    accent, accentBorder, accentBtnBorder, accentBtnLight, accentLight, accentMid, activeTab, addingCategory,
    addingNew, addingSlotDay, addingSlotKey, addingSource, baseStart, bulkReviewItems, calcRAG, cameraPreview,
    copyDayOpen, copyDayTargets, copyWeekOpen, copyWeekTargets, customBreakfasts, customDesserts, customDrinks, customLunches,
    customMeals, customSnacks, data, defScopes, eatDay, eatDayEyeOpen, eatFbExpanded, eatFbLoading,
    eatFbResults, eatWeekEyeOpen, editDraft, editingItem, formMsg, generateEatFeedback, generateWeekEatFeedback, generating,
    helpEatCat, helpEatLoading, helpEatResult, helpEatText, isJC, manageListsOpen, mealDefaults, mealTracking,
    meals, newItemLoading, newItemName, offLoading, offResults, openAddForm, p, pastWeeksMeals,
    portionLoading, portionOverrides, portionPlanned, portionResult, portionSlot, quickPrepMins, ragRecalcLoading, ragRecalcMsg,
    recalculateAllRag, renderThread, reviewCategories, reviewSideType, saveMeals: saveMealsCtx, setChildAt, weekChildren, childItemsList, searchOFF, setAddingCategory, setAddingNew,
    setAddingSlotDay, setAddingSlotKey, setBulkReviewItems, setCameraPreview, setCopyDayOpen, setCopyDayTargets, setCopyWeekOpen, setCopyWeekTargets,
    setCustomBreakfasts, setCustomDesserts, setCustomDrinks, setCustomLunches, setCustomMeals, setCustomSnacks, setDefScopes, setEatDay,
    setEatDayChartOpen, setEatDayEyeOpen, setEatFbExpanded, setEatWeekEyeOpen, setEditDraft, setEditingItem, setFormMsg, setGenerating,
    setHelpEatCat, setHelpEatLoading, setHelpEatResult, setHelpEatText, setManageListsOpen, setMealDefaults, setMealTracking, setMeals,
    setNewItemLoading, setNewItemName, setOffResults, setOffSearchTerm, setPortionLoading, setPortionOverrides, setPortionPlanned, setPortionResult,
    setPortionSlot, setQuickPrepMins, setRagRecalcMsg, setReviewCategories, setReviewSideType, setSaving, setWeekOff, updateEatDayFb,
    updateEatWeekFb, weekLabel, weekOff, weekStart, saveData, mealLoading, setFactorNow
  } = ctx;
  /* v2.6.2 D10/F7: Undo for a replaced item, and the optional photo description */
  const [portionUndo, setPortionUndo] = React.useState(null);
  const [pickToast, setPickToast] = React.useState(null);
  const [picker, setPicker] = React.useState(null);
  const [weekSumOpen, setWeekSumOpen] = React.useState(false);   // v2.53.0: the Week Summary days (hidden until shown or Full Breakdown)   // v2.50.0: the open picker (row key, search, ♥ filter, item to confirm, quantity)
  React.useEffect(function() { setFavPerson(activeTab); }, [activeTab]);   // v2.50.0: favourites are per person
  useFavs();   // re-render when a favourite changes (the ♥ boxes and the picker)   // v2.20.0: { name, undo } — "Added: …" with Undo for ~5 s
  const [pickFlash, setPickFlash] = React.useState(null);   // the picked item's id, highlighted briefly
  React.useEffect(function() { if (!pickToast) return; var t = setTimeout(function() { setPickToast(null); }, 5000); return function() { clearTimeout(t); }; }, [pickToast]);
  React.useEffect(function() { if (!pickFlash) return; var s1 = setTimeout(function() { var el = document.querySelector('[data-testid="picker-trigger"][data-flash="true"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: "center" }); }, 250); var t = setTimeout(function() { setPickFlash(null); }, 4000); return function() { clearTimeout(s1); clearTimeout(t); }; }, [pickFlash]);
  const [portionDesc, setPortionDesc] = React.useState("");
  /* v2.6.3 bulk upload: own category (D4), batch progress/retry (D3), real cancel (D5), OK message (F4) */
  const [bulkCat, setBulkCat] = React.useState("");
  const [bulkRun, setBulkRun] = React.useState(null);   // { done, total, failed: [lines], cat }
  const [bulkDone, setBulkDone] = React.useState(null); // message that needs OK
  const [bulkUndo, setBulkUndo] = React.useState(null); // { cat, ids } kept before a cancel
  const bulkToken = React.useRef(null);
  const [listJob, setListJob] = React.useState("");
  const [itemOpen, setItemOpen] = React.useState(null);  // v2.8.0 F5: list item open read-only (id)
  /* v2.19.0 Update Lists tabs; "+ Not in my list?" remembers where to return { cat, day, slot, kind, label } */
  const [ulTab, setUlTab] = React.useState("single");
  const [returnTo, setReturnTo] = React.useState(null);
  const [mealEdit, setMealEdit] = React.useState(null);   // id of a meal item being edited
  const [editClarify, setEditClarify] = React.useState(null);   // seed text for recalculating an edited item
  /* v2.19.1 F27: hand-offs to "Create my own item" (typed text, edited Review ingredients, unclear photos, bulk lines) */
  const [ownSeed, setOwnSeed] = React.useState(null);   // { text, turns }
  const [bulkHelp, setBulkHelp] = React.useState([]);   // [{ line, question }] bulk lines that need the person
  const [slotOpen, setSlotOpen] = React.useState(null);  // v2.8.0 F5: meal selection open { day, slot, editing, draft, msg }
  const [snapPre, setSnapPre] = React.useState("");
  const [portionFirst, setPortionFirst] = React.useState(null); // D15: the first check, for the deep-dive comparison     // v2.6.5 Snap: slot whose description bar is open (before the photo)     // v2.6.5: "rerate" | "recheck" while running
 try {
          var allBfast = [].concat(BREAKFASTS, customBreakfasts, DEFAULT_BREAKFASTS);
          var allLunch = [].concat(LUNCHES, customLunches, DEFAULT_LUNCHES);
          var allDinners = [].concat(DINNERS, customMeals, DEFAULT_DINNERS_GB);
          var allOther = [].concat(SNACKS, customSnacks);
          var allDrinks = [].concat(customDrinks);
          var allDesserts = [].concat(customDesserts);
          var allItems = [].concat(allBfast, allLunch, allDinners, allOther);
          // Display lists for MealSelect dropdowns — custom items (RAG colored) + defaults (uncolored, not yet added)
          var markCustom = function(items) { return items.map(function(it) { return Object.assign({}, it, { _isCustom: true }); }); };
          var markDefault = function(items) { return items.map(function(it) { return Object.assign({}, it, { _isCustom: false }); }); };
          var dedupe = function(customs, defaults) { var cNames = customs.map(function(c){return c.name.toLowerCase().trim();}); return [].concat(markCustom(customs), markDefault(defaults.filter(function(d){return cNames.indexOf(d.name.toLowerCase().trim()) < 0;}))); };
          /* v2.19.0: drop-downs show ONLY items already in that list (no greyed catalogue items); "+ Not in my list?" adds more */
          void dedupe;
          var dispBfast = markCustom(customBreakfasts);
          var dispLunch = markCustom(customLunches);
          var dispDinners = markCustom(customMeals);
          var dispOther = [...customSnacks];
          var dispDrinks = [...customDrinks];
          var dispDesserts = [...customDesserts];
          /* v2.19.0: the lists Update Lists saves into, the available catalogue (built-in foods not yet in a list), and own items */
          var CATS = [{k:"breakfast",label:"Breakfasts",customs:customBreakfasts,setCustoms:setCustomBreakfasts,storageKey:"custom_breakfasts"},
            {k:"lunch",label:"Lunches",customs:customLunches,setCustoms:setCustomLunches,storageKey:"custom_lunches"},
            {k:"dinner",label:"Dinners",customs:customMeals,setCustoms:setCustomMeals,storageKey:"custom_meals"},
            {k:"snack",label:"Snacks",customs:customSnacks,setCustoms:setCustomSnacks,storageKey:"custom_snacks"},
            {k:"dessert",label:"Desserts",customs:customDesserts,setCustoms:setCustomDesserts,storageKey:"custom_desserts"},
            {k:"drink",label:"Drinks",customs:customDrinks,setCustoms:setCustomDrinks,storageKey:"custom_drinks"}];
          var OWN_ITEMS = [].concat(customBreakfasts, customLunches, customMeals, customSnacks, customDesserts, customDrinks);
          var _ownNames = OWN_ITEMS.map(function(x) { return String(x.name || "").toLowerCase().trim(); });
          var CATALOGUE = [].concat(DEFAULT_BREAKFASTS, BREAKFASTS, DEFAULT_LUNCHES, LUNCHES, DEFAULT_DINNERS_GB, DINNERS, SNACKS).filter(function(x, i, a) { var nm = String(x.name || "").toLowerCase().trim(); return x.id !== "none" && _ownNames.indexOf(nm) < 0 && a.findIndex(function(y) { return String(y.name || "").toLowerCase().trim() === nm; }) === i; });
          /* ── RAG frequency checking ── */
          /* Build lookup of all items by id for rating check */
          var allItemsLookup = {};
          [].concat(dispBfast, dispLunch, dispDinners, dispOther, dispDrinks, dispDesserts).forEach(function(it) { allItemsLookup[it.id] = it; });
          /* v2.6.5: the week's CHILDREN (selections) stand in for their ids, so every lookup and total reads the child */
          var _listLookup = {};
          [].concat(allItems, allDrinks, allDesserts, POTATO_SIDES || [], VEG_SIDES || []).forEach(function(it) { if (it && it.id && !_listLookup[it.id]) _listLookup[it.id] = it; });
          Object.keys(allItemsLookup).forEach(function(id) { if (!_listLookup[id]) _listLookup[id] = allItemsLookup[id]; });
          (childItemsList || []).forEach(function(it) { [allBfast, allLunch, allDinners, allOther, allDrinks, allDesserts, allItems].forEach(function(arr) { arr.push(it); }); allItemsLookup[it.id] = it; });
          var saveMeals = function(n, source) { return saveMealsCtx(n, source, _listLookup); };
          /* ═══ v2.19.0 "+ Not in my list?" → Update Lists on the right tab, remembering the day/slot to come back to ═══ */
          var CAT_NAME = { breakfast: "breakfast", lunch: "lunch", dinner: "dinner", snack: "snack", dessert: "dessert", drink: "drink" };
          var DAY_NAME = { sunday: "Sunday", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday" };
          var notInList = function(cat, src, text, slotKey, day) {
            void src;
            setReturnTo({ cat: cat, day: day || null, slot: slotKey, kind: day ? "day" : "default", text: text || "", label: day ? DAY_NAME[day] + " " + CAT_NAME[cat] : "your default " + CAT_NAME[cat] });
            setUlTab("single"); setManageListsOpen(true);
            setTimeout(function() { var el = document.getElementById("update-lists"); if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" }); }, 80);
          };
          var backToSlot = function() {
            var rt = returnTo; setReturnTo(null); setManageListsOpen(false);
            if (rt && rt.day) setEatDay(rt.day);
          };
          var toOwnItem = function(text, turns) {
            setOwnSeed({ text: text || "", turns: turns || [], k: Date.now() }); setUlTab("own"); setManageListsOpen(true);
            setAddingNew(false); setCameraPreview(null);
            setTimeout(function() { var el = document.getElementById("update-lists"); if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" }); }, 80);
          };
          /* v2.20.1: the slot a new item goes into on a day (first empty one of that meal) */
          var SLOT_KEYS = { breakfast: ["b", "b2", "b3"], lunch: ["l", "l2", "l3"], dinner: ["d", "d2", "d3"], snack: ["o1","o2","o3","o4","o5","o6","o7","o8","o9","o10"], dessert: ["ds1","ds2","ds3","ds4","ds5"], drink: ["dr","dr2","dr3","dr4","dr5"] };
          var slotFor = function(cat, day) {
            var keys = SLOT_KEYS[cat] || ["d"]; var free = keys.find(function(k) { var v = getMeal(day, k); return !v || v === "__empty__"; });
            return { cat: cat, day: day, slot: free || keys[0], kind: "day", text: "", label: DAY_NAME[day] + " " + CAT_NAME[cat] };
          };
          var addNowToSlot = async function(added, rt) {
            var before = JSON.parse(JSON.stringify(meals || {}));   /* v2.20.1: for Undo */
            if (rt.kind === "day") {
              var n = JSON.parse(JSON.stringify(meals || {})); if (!n[rt.day]) n[rt.day] = {}; n[rt.day][rt.slot] = added.id;
              var extra = Object.assign({}, _listLookup); extra[added.id] = added.item;
              setMeals(n); await saveMealsCtx(n, "manual", extra);
            } else { await saveDef(rt.slot, added.id, "individual"); }
            backToSlot();
            /* v2.20.1 (JC): back on that day, scrolled to the meal, the item highlighted, "Added to Sunday dinner" + Undo */
            setPickFlash(added.id);
            setPickToast({ text: "Added to " + rt.label, undo: rt.kind === "day" ? async function() { setMeals(before); await saveMealsCtx(before, "manual", _listLookup); } : null });
          };
          var getSnap = function() { return null; };
          /* ═══ v2.8.0 F5: a meal selection (the CHILD) opens in the shared form: portion + variations → the AI
             recalculates the child's nutrition → its RAG is recalculated (D11 bands). The list item is never changed.
             "Remove from this meal" is the only destructive action; deleting from the list happens only in Update Lists. ═══ */
          var slotButtons = function(slotKey, idx) {
            var v = getMeal(eatDay, slotKey); var filled = !!v && v !== "__empty__";
            var first = idx === 1 && /^[bld]$/.test(slotKey);
            return (<>
              <button aria-label={filled ? "Open this meal" : "Add to this meal"} onClick={function() {
                if (filled) { setSlotOpen(slotOpen && slotOpen.slot === slotKey && slotOpen.day === eatDay ? null : { day: eatDay, slot: slotKey, first: first, editing: false, msg: "" }); }
                else { setSlotOpen(null); notInList(slotCategory(slotKey), "defaults", "", slotKey, eatDay); }
              }} style={btnOpen}>Open</button>
              {!filled && !first && v !== undefined && v !== "" && <button aria-label="Remove this empty row" onClick={function() { setMeal(eatDay, slotKey, ""); }} style={{...btnDelete, fontSize: 10, flexShrink: 0}}>✕</button>}
            </>);
          };
          var renderSlotForm = function() {
            var o = slotOpen; var c = childAt(o.day, o.slot); if (!c) return null;
            var parent = c.parentId ? _listLookup[c.parentId] : null; var n = c.nutrition || {};
            var d = o.draft || { factor: String((c.portion && c.portion.factor) || 1), text: (c.variations && c.variations.text) || "" };
            var setD = function(patch) { setSlotOpen(Object.assign({}, o, { draft: Object.assign({}, d, patch), chat: null, msg: "" })); };   // a change starts the conversation again
            var portionText = c.portion && c.portion.values ? (c.portion.source === "variations" ? "×" + (c.portion.factor || 1) + " with changes" : "checked by photo" + (c.portion.factor && c.portion.factor !== 1 ? " ×" + c.portion.factor : "") + (c.portion.assumed ? " — " + c.portion.assumed : "")) : "×" + ((c.portion && c.portion.factor) || 1) + " of the list portion";
            var note = ragNote(c, parent, personalLimits(data && data[activeTab]));   // v2.18.2: the selection against this person's goal
            var runTurn = async function(turns) {
              setSlotOpen(Object.assign({}, o, { draft: d, chat: { turns: turns }, msg: "⏳ Working out the changes…" }));
              try {
                var rr = await clarifyMealChange(turns);
                if (rr.type === "question") setSlotOpen(Object.assign({}, o, { editing: true, draft: d, chat: { turns: turns.concat([{ role: "assistant", text: rr.question }]), question: rr.question }, msg: "" }));
                else setSlotOpen(Object.assign({}, o, { editing: true, draft: d, chat: { turns: turns, reply: rr.reply }, msg: "" }));
              } catch (e) { setSlotOpen(Object.assign({}, o, { editing: true, draft: d, chat: null, msg: "⚠️ Couldn't reach your Companion: " + String(e.message || e).substring(0, 90) + ". Nothing was changed." })); }
            };
            var save = async function() {
              var factor = parseFloat(d.factor) || 1; var text = (d.text || "").trim();
              var next = Object.assign({}, c, { variations: { text: text, subs: (c.variations && c.variations.subs) || [] } });
              try {
                if (text) {
                  /* v2.37.1 (brief P3a): a conversation, as "My own" — a question instead of a rejection; the person reviews the
                     values, then Save (here, or "Save these values") stores them. Nothing is saved before the review. */
                  if (!(o.chat && o.chat.reply)) { await runTurn([{ role: "user", text: mealChangeRequest(c.snapshot, factor, text) }]); return; }
                  var r = o.chat.reply.perPortion || {};
                  next.portion = { factor: factor, source: "variations", values: { kcal: Math.round(parseFloat(r.kcal)), protein: parseFloat(r.protein) || 0, fat: parseFloat(r.fat) || 0, satFat: parseFloat(r.satFat) || 0, addedSugar: parseFloat(r.addedSugar) || 0, carbs: parseFloat(r.carbs) || 0, fibre: parseFloat(r.fibre) || 0, salt: parseFloat(r.salt) || 0 }, change: o.chat.reply.change || o.chat.reply.assumptions || "" };
                } else if (c.portion && c.portion.values && c.portion.source !== "variations") {
                  /* v2.11.1: a photo-checked portion is scaled from the PHOTO values (kept as photoValues), never reset to the list */
                  var pv = c.portion.photoValues || c.portion.values; var sc = {};
                  Object.keys(pv).forEach(function(k) { var v = parseFloat(pv[k]) || 0; sc[k] = k === "kcal" ? Math.round(v * factor) : Math.round(v * factor * 10) / 10; });
                  next.portion = Object.assign({}, c.portion, { factor: factor, photoValues: pv, values: sc });
                } else if (factor !== ((c.portion && c.portion.factor) || 1) || (c.portion && c.portion.source === "variations")) {
                  next.portion = { factor: factor };
                }
                await setChildAt(o.day, o.slot, next);
                setSlotOpen({ day: o.day, slot: o.slot, first: o.first, editing: false, msg: "✓ Saved for this meal only. To update the list item permanently, please go to 'Update Eating Lists'." });
              } catch (e) { setSlotOpen(Object.assign({}, o, { draft: d, msg: "⚠️ Couldn't recalculate: " + String(e.message || e).substring(0, 90) + ". Nothing was changed." })); }
            };
            var srcLabel = { manual: "picked", default: "your default", generator: "generated", snap: "📷 snap", adhoc: "📷 snap", copy: "copied", migrated: "earlier" }[c.source] || c.source;
            return (<OpenForm testid="slot-open-form" title={c.snapshot.name} subtitle={(parent ? "From your list" : "This meal only (not in your lists)") + " · " + srcLabel} editing={o.editing} message={o.msg}
              onEdit={function() { setSlotOpen(Object.assign({}, o, { editing: true, draft: d, msg: "" })); }}
              onCancelEdit={function() { setSlotOpen(Object.assign({}, o, { editing: false, draft: null, msg: "" })); }}
              onSave={save}
              dangerKind="remove" onDanger={function() { if (!confirm("Remove " + c.snapshot.name + " from this meal? Your list is not changed.")) return; setSlotOpen(null); setMeal(o.day, o.slot, o.first ? "__empty__" : ""); }}
              onClose={function() { setSlotOpen(null); }}>
              <Field label="Portion" testid="slot-portion">{o.editing ? <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                  {["0.5", "1", "1.5", "2"].map(function(f) { return <button key={f} type="button" onClick={function() { setD({ factor: f }); }} style={{ ...btnMuted, color: String(d.factor) === f ? "#1e3a5f" : "#475569", borderColor: String(d.factor) === f ? "#1e3a5f" : "#e2e8f0" }}>{f === "0.5" ? "½" : f === "1.5" ? "1½" : f}×</button>; })}
                  <input aria-label="Portion factor" value={d.factor} onChange={function(e) { setD({ factor: e.target.value }); }} style={Object.assign({}, openInput, { width: 60 })} />
                </div> : portionText}</Field>
              <Field label="Changes" testid="slot-variations">{o.editing ? <textarea aria-label="Changes to this meal" value={d.text} onChange={function(e) { setD({ text: e.target.value }); }} placeholder="e.g. chips instead of potato, peas instead of beans, no sauce" style={Object.assign({}, openInput, { minHeight: 44 })} /> : ((c.variations && c.variations.text) || <span style={{ color: "#475569" }}>none</span>)}</Field>
              {o.editing && o.chat && o.chat.question && <div data-testid="slot-clarify" role="status" style={{ margin: "6px 0", padding: 8, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 12, color: "#0f172a" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>💬 {o.chat.question}</div>
                <textarea aria-label="Your answer" data-testid="slot-clarify-answer" id="slot-clarify-answer" style={Object.assign({}, openInput, { minHeight: 36 })} />
                <button type="button" data-testid="slot-clarify-send" onClick={function() { var el = document.getElementById("slot-clarify-answer"); var a = el ? el.value.trim() : ""; if (!a) return; runTurn(o.chat.turns.concat([{ role: "user", text: a }])); }} style={{ ...btnMuted, marginTop: 4 }}>Answer</button>
              </div>}
              {o.editing && o.chat && o.chat.reply && (function() { var pp = o.chat.reply.perPortion || {}; return (<div data-testid="slot-review" role="status" style={{ margin: "6px 0", padding: 8, borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 12, color: "#0f172a" }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Check these, then Save</div>
                {o.chat.reply.change && <div style={{ marginBottom: 2 }}>{o.chat.reply.change}</div>}
                <div data-testid="slot-review-values">{Math.round(parseFloat(pp.kcal) || 0)} kcal · protein {pp.protein} g · fat {pp.fat} g (sat {pp.satFat} g) · carbs {pp.carbs} g · added sugar {pp.addedSugar} g · fibre {pp.fibre} g · salt {pp.salt} g</div>
                {o.chat.reply.assumptions && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Assumed: {o.chat.reply.assumptions}</div>}
                <button type="button" data-testid="slot-review-save" onClick={save} style={{ ...btnMuted, marginTop: 4 }}>Save these values</button>
              </div>); })()}
              {c.portion && c.portion.change && !o.editing && <Field label="What changed">{c.portion.change}</Field>}
              {nutritionRows(n, n.kcal)}
              {ratingsShown() && <Field label="Rating today" testid="slot-rating"><span style={{ fontWeight: 700, color: ratingColor(c.rating) }}>{ragText(c)}</span>{c.ragReason ? <div style={{ fontSize: 10, color: "#475569" }}>{c.ragReason}</div> : null}</Field>}
              {parent && <Field label="Your list item" testid="slot-parent-rating">{ragText(parent)}{note ? <div data-testid="slot-rag-diff" style={{ fontSize: 10, color: "#475569" }}>Differs today: {note}</div> : null}</Field>}
            </OpenForm>);
          };
          var childAt = function(dayKey, slot) { var v = getMeal(dayKey, slot); var it = v ? allItemsLookup[v] : null; return it && it._child ? it._child : null; };
          /* Frequency rules count CHILDREN (their own RAG), by food: the parent, or the name when ad hoc */
          var foodOf = function(id) { var it = allItemsLookup[id]; return it && it._child ? foodKey(it._child) : id; };
          var thisWeekIds = function() { return occurrences(weekChildren).map(function(o) { return o.food; }); };
          var pastMonthIds = function() { var ids = []; (pastWeeksMeals || []).forEach(function(doc) { occurrences(doc).forEach(function(o) { ids.push(o.food); }); }); return ids; };
          var weekOcc = function() { return occurrences(weekChildren, personalLimits(data && data[activeTab])); };   /* v2.18.3: the live personal rating the screen shows */
          var pastOcc = function() { var out = []; (pastWeeksMeals || []).forEach(function(doc) { out = out.concat(occurrences(doc)); }); return out; };
          /* Check if selecting itemId in a slot would breach RAG rules.
             excludeDay/excludeSlot: the slot being set (exclude its current value from count).
             Returns null if OK, or a warning string if breached. */
          var checkRagFrequency = function(itemId, excludeDay, excludeSlot) {
            if (!itemId || itemId === "__empty__") return null;
            var item = allItemsLookup[itemId];
            if (!item || !item.rating || !item._isCustom || !ratingsShown()) return null;   /* v2.22.1: no rating warnings without food ratings */
            /* v2.18.3: judge by the SAME personal rating the screen shows — a selection is already live-rated; a list item is rated as it would be for this person */
            if (!item._child) { var _pl = personalLimits(data && data[activeTab]); if (_pl) { var _rr = rateByPortion(Object.assign({}, item, { jcKcal: activeTab === "jc" ? item.jcKcal : item.beckKcal, beckKcal: activeTab === "jc" ? item.jcKcal : item.beckKcal }), _pl); item = Object.assign({}, item, { rating: _rr.rating, ragFreq: _rr.ragFreq }); } }
            if (item.rating === "GREAT" || item.rating === "GOOD") return null;
            /* v2.6.5: AMBER up to 3 a week · RED weekly treat once a week · RED monthly treat once a month — counted on children */
            var food = foodOf(itemId);
            var occ = weekOcc().filter(function(o) { return o.food === food && !(o.weekday === excludeDay && o.slot === excludeSlot); });
            var cWeek = occ.length;
            var cMonth = cWeek + pastOcc().filter(function(o) { return o.food === food; }).length;
            return frequencyWarning(item, cWeek, cMonth);
          };
          var currentWeek = calcWeek(data.config.trainingStart);
          var DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"]; /* v2.6.4 C1: the week (stored Sunday-start) is shown Sunday first */
          var DAY_LABELS = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
          // States moved to component top level
          var sk = mealKey(weekStart) + ":" + activeTab;

          /* ═══ v2.6.5 📷 Snap (replaces Portion): every slot, optional description first, nothing saved before Confirm ═══ */
          var listForSlot = function(slotKey) { var c = slotCategory(slotKey); return c === "breakfast" ? allBfast : c === "lunch" ? allLunch : c === "dessert" ? allDesserts : c === "drink" ? allDrinks : c === "snack" ? allOther : allDinners; };
          /* one row, equal size: Confirm (deep blue) · Re-check (as Re-rate) · Cancel (grey) */
          var snapBtn = { flex: 1, minWidth: 0, height: 38, padding: "0 4px", whiteSpace: "nowrap", fontSize: 12, fontWeight: 600, justifyContent: "center", display: "inline-flex", alignItems: "center", boxSizing: "border-box" };
          var openSnap = function(slotKey) { setPortionResult(null); setPortionPlanned(null); setPortionDesc(""); setPortionUndo(null); setPortionSlot(slotKey); setSnapPre(slotKey); };
          var snapButton = function(slotKey) {
            var busy = portionLoading && portionSlot === slotKey; var on = portionSlot === slotKey;
            return (<button type="button" aria-label="Snap a photo of your food" title="Snap a photo of your food" onClick={function() { if (!busy) openSnap(slotKey); }} style={Object.assign({}, on ? btnFilledOn : btnSnap, { cursor: busy ? "wait" : "pointer" })}>{busy ? "⏳..." : "📷 Snap"}</button>);
          };
          var portionAnalyze = async function(slotKey, file, itemsList, descArg, deep) {
            var desc = (descArg || "").trim();
            window._lcPortionLast = { slotKey: slotKey, file: file, itemsList: itemsList };
            setPortionUndo(null);
            setPortionSlot(slotKey);
            setPortionLoading(true);
            setPortionResult(null);
            var val = getMeal(eatDay, slotKey);
            var planned = (val && val !== "__empty__") ? itemsList.find(function(it) { return it.id === val; }) : null;
            setSnapPre("");
            if (!planned) setPortionPlanned(null);
            if (planned) {
              var isJC2 = activeTab === "jc";
              setPortionPlanned({ name: planned.name, kcal: isJC2 ? (planned.jcKcal || planned.kcal || 0) : (planned.beckKcal || planned.kcal || 0), protein: planned.protein || 0, fat: planned.fat || 0, satFat: planned.satFat || 0, addedSugar: planned.addedSugar || 0, carbs: planned.carbs || 0, fibre: planned.fibre || 0, salt: planned.salt || 0 });
            }
            try {
              var _img = await readImageForAI(file);   /* v2.14.0: shrunk before sending */
              var base64 = _img.data; var mediaType = _img.mediaType;
              var apiKey = await window.ensureApiKey();
              var isJC3 = activeTab === "jc";
              var plannedName = planned ? planned.name : "unknown food";
              var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-lc-feature": "snap", "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify(requestBody({ plannedName: planned ? plannedName : "", desc: desc, deep: !!deep }, { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } })) });
              var result = await resp.json();
              var apiErr = handleApiError(result);
              if (apiErr) throw new Error(apiErr);
              var txt = "";
              if (result.content) { for (var ri = 0; ri < result.content.length; ri++) { if (result.content[ri].text) txt += result.content[ri].text; } }
              var jsonStr = txt.replace(/```json|```/g, "").trim();
              var jm = jsonStr.match(/{[\s\S]*}/);
              if (!jm) throw new Error("No JSON");
              var info = JSON.parse(jm[0]);
              if (deep) info._deep = true; else setPortionFirst(info);
              setPortionResult(info);
            } catch(ce) { setFormMsg(window.aiErrorMsg(ce)); setTimeout(function(){setFormMsg("");},10000); setPortionSlot(""); }
            setPortionLoading(false);
          };

          var slotCategory = function(slotKey) { return /^ds/.test(slotKey) ? "dessert" : /^dr/.test(slotKey) ? "drink" : /^b/.test(slotKey) ? "breakfast" : /^l/.test(slotKey) ? "lunch" : /^o/.test(slotKey) ? "snack" : "dinner"; };
          /* v2.6.5 Snap Confirm writes the CHILD directly (parents are never changed here). The only question asked is
             "Save … to your … list?", and only when the food is not already in the list. */
          var confirmPortion = async function() {
            if (!portionResult || !portionSlot || noFood(portionResult)) return;   // v2.14.1: nothing is saved when there's no food
            var pr = portionResult; var slot = portionSlot; var day = eatDay; var cat = slotCategory(slot);
            var vals = { kcal: pr.kcal || 0, protein: pr.protein || 0, fat: pr.fat || 0, satFat: pr.satFat || 0, addedSugar: pr.addedSugar || 0, carbs: pr.carbs || 0, fibre: pr.fibre || 0, salt: pr.salt || 0 };
            var portion = { source: "photo", values: vals, assumed: gramsLine(pr) || pr.assumed || "", grams: parseFloat(pr.totalGrams) || null, check: pr._deep ? "deep dive" : "first check" };
            var cur = childAt(day, slot);
            var sameFood = !!(cur && portionPlanned && pr.matchesPlanned !== false);
            var child, msg;
            if (sameFood) {
              child = Object.assign({}, cur, { portion: portion, notes: portionDesc || cur.notes || "" });
              msg = "✓ Portion logged for " + cur.snapshot.name;
            } else {
              var nm = function(x) { return stripKcalName(x || "").toLowerCase().trim(); };
              var match = bulkListFor(cat).find(function(x) { return nm(x.name) === nm(pr.name); });
              var parent = match || null;
              if (!match && confirm("Save \u201c" + (pr.name || "this food") + "\u201d to your " + catLabel(cat) + " list for future selection?")) {
                var cpS = { name: pr.name || "Photo item", kcal: vals.kcal, protein: vals.protein, fat: vals.fat, satFat: vals.satFat, addedSugar: vals.addedSugar, carbs: vals.carbs, fibre: vals.fibre, salt: vals.salt, rating: pr.rating || "AMBER", itemType: "packaged", ingredients: [], source: "photo", servingSize: pr.assumed || "" };
                var resS = await addReviewedItem(cpS, [cat], null, null, cat, "");
                parent = resS.itemId ? (_listLookup[resS.itemId] || null) : null;
              }
              child = makeChild(parent || Object.assign({ name: pr.name || "Food", jcKcal: vals.kcal, beckKcal: vals.kcal }, vals), { date: "", weekday: day, slot: slot, source: parent ? "snap" : "adhoc", isJC: isJC, parentId: parent ? parent.id : null, portion: portion, notes: portionDesc || "" });
              msg = parent ? "✓ " + child.snapshot.name + (match ? " (from your list)" : " saved to your list") + " logged" : "✓ " + child.snapshot.name + " logged for this meal only";
            }
            var prev = await setChildAt(day, slot, child);
            if (cur && !sameFood) setPortionUndo({ day: day, slot: slot, prev: prev, name: child.snapshot.name, original: cur.snapshot.name });
            else { setFormMsg(msg); setTimeout(function(){ setFormMsg(""); }, 3000); }
            setPortionSlot(""); setPortionResult(null); setPortionPlanned(null); setSnapPre("");
          };

          var undoPortionReplace = async function() {
            var u0 = portionUndo; if (!u0) return;
            await setChildAt(u0.day, u0.slot, u0.prev);
            setPortionUndo(null); setFormMsg("Restored " + u0.original); setTimeout(function(){ setFormMsg(""); }, 3000);
          };
          var recheckPortion = function() { var l0 = window._lcPortionLast; if (l0) portionAnalyze(l0.slotKey, l0.file, l0.itemsList, portionDesc, true); /* D15: independent deep dive */ };
          var cancelPortion = function() {
            setSnapPre("");
            setPortionSlot("");
            setPortionResult(null);
            setPortionPlanned(null);
          };

          var getEffective = function(dayKey, slotKey, item) {
            var c0 = childAt(dayKey, slotKey); if (c0 && c0.portion && c0.portion.values) return c0.portion.values;
            return null;
          };

          var getMeal = function(dayKey, slot) { var m = meals[dayKey]; if (!m) return ""; return m[slot] || ""; };
          var isPackagedDinner = function(dinnerId) { var allD = [].concat(DINNERS, customMeals); var found = allD.find(function(x){ return x.id === dinnerId; }); return found && found.itemType === "packaged"; };
          var setMeal = function(dayKey, slot, val) {
            var n = Object.assign({}, meals); if (!n[dayKey]) n[dayKey] = {};
            n[dayKey][slot] = val;
            // Auto-apply sides for packaged dinners
            if (slot.match(/^d\d*$/) && !slot.match(/^d[pvsrc]/)) {
              var sIdx = slot === "d" ? "" : slot.replace("d", "");
              if (val && isPackagedDinner(val)) {
                // Set default sides if not already set
                if (!n[dayKey]["dp" + sIdx]) n[dayKey]["dp" + sIdx] = "baby_potatoes";
                if (!n[dayKey]["dv" + sIdx]) n[dayKey]["dv" + sIdx] = "garden_salad";
              } else {
                // Clear sides when switching to non-packaged or clearing
                delete n[dayKey]["dp" + sIdx];
                delete n[dayKey]["dv" + sIdx];
              }
            }
            setMeals(n); saveMeals(n);
          };
          
          var getTrack = function(dayKey, slot) { var k = dayKey + ":" + slot; return (mealTracking || {})[k] || ""; };
          var setTrack = async function(dayKey, slot, status) { var n = Object.assign({}, mealTracking); var k = dayKey + ":" + slot; n[k] = status; setMealTracking(n); await sSet("meal_tracking:" + activeTab, JSON.stringify(n)); };

var getOtherCount = function(dayKey) { var m = meals[dayKey]; if (!m) return 0; var count = 0; for (var i = 1; i <= 20; i++) { if (m["o" + i] && m["o" + i] !== "__empty__") count = i; } return count; };
          var addOtherSlot = function(dayKey) { var m = meals[dayKey] || {}; var next = 1; while (m["o" + next]) next++; setMeal(dayKey, "o" + next, "__empty__"); };
          /* v2.44.0 (night batch P6b): a photo shared into "today's eating" — once the person's meals are loaded, go to today,
             add a NEW row in the chosen category and run the normal Snap flow on it */
          (function() {
            var sh = window._lcEatShare; if (!sh || sh.who !== activeTab || sh.queued) return;
            if (sh.switched && !sh.sawLoading) { if (mealLoading) sh.sawLoading = true; return; }   // wait for THIS person's meals
            if (mealLoading) return;
            var later = function(f) { sh.queued = true; setTimeout(function() { sh.queued = false; f(); }, 0); };   // never set state while rendering
            var today = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
            var curOff = Math.floor((new Date() - new Date(2026, 6, 19)) / (7 * 24 * 60 * 60 * 1000));   // this week (as App's weekOff starts)
            if (weekOff !== curOff) { later(function() { setWeekOff(curOff); }); return; }
            if (eatDay !== today) { later(function() { setEatDay(today); }); return; }
            window._lcEatShare = null;
            var m = meals[today] || {}, c = sh.cat, k, n = 1;
            if (c === "b" || c === "l" || c === "d") { if (!m[c]) k = c; else { n = 2; while (m[c + n]) n++; k = c + n; } }
            else { while (m[c + n]) n++; k = c + n; }
            setTimeout(function() { setMeal(today, k, "__empty__"); portionAnalyze(k, sh.file, listForSlot(k), ""); }, 0);
          })();
          var removeOtherSlot = function(dayKey, idx) { var n = Object.assign({}, meals); if (n[dayKey]) { delete n[dayKey]["o" + idx]; } setMeals(n); saveMeals(n); };
          /* v2.51.0 (P3): the day's total counts EVERY row (extra breakfast rows, sides, desserts, drinks, snacks), not just the first of each */
          var getDayKcal = function(dayKey) { var m = meals[dayKey]; if (!m) return 0; var total = 0; var kf = isJC ? "jcKcal" : "beckKcal"; Object.keys(m).forEach(function(k) { var v = m[k]; if (!/^(b|l|d|dp|dv|ds|dr|o)\d*$/.test(k) || !v || v === "__empty__") return; var it = _listLookup[v] || allItemsLookup[v] || allItems.find(function(x) { return x.id === v; }); if (it) total += Number(it[kf] != null ? it[kf] : it.kcal) || 0; }); return Math.round(total); };

          var clearWeek = function() { if (!confirm("Clear ALL meals for this week? This cannot be undone.")) return; var n = {}; setMeals(n); saveMeals(n); setFormMsg("Week cleared"); setTimeout(function() { setFormMsg(""); }, 3000); };

          
          var addFromCamera = async function(file, descArg) {
            if (!file) return;
            window._lcAddPhoto = file;   /* v2.14.1: kept in memory only, for Re-check when no food was found */
            setNewItemLoading(true);
            setFormMsg("📷 Analysing image...");
            try {
              var _img = await readImageForAI(file);   /* v2.14.0: shrunk before sending */
              var base64 = _img.data; var mediaType = _img.mediaType;
              var descText = (descArg != null ? String(descArg) : newItemName).trim();
              var descHint = descText ? " The user describes this as: " + descText + "." : "";
              /* v2.19.1 F27: the photo asks for ONE PORTION with the shared schema, strict validation and retries; unclear → the conversation */
              var photoText = "CLARIFY_ITEM PHOTO. Identify the food or product in this photo and give its nutrition for ONE PORTION (a label's per-serving values, or a sensible portion of what is shown; never per 100 g, never a whole pack or recipe)." + descHint + NO_FOOD_RULE + " Reply with ONLY the item JSON from the instructions (add \"isFood\": true), or {\"isFood\": false, \"name\": \"…\"} if there is no food, or a question JSON if you can't tell the portion.";
              var pr = await askItem([{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: photoText }]);
              if (pr.type === "noFood") { setCameraPreview({ noFood: true, name: pr.reply.name || "", desc: descText }); setFormMsg(""); setNewItemLoading(false); return; }   // v2.14.1: no food → no values, no rating, Confirm disabled
              if (pr.type === "question") { setNewItemLoading(false); setFormMsg(""); toOwnItem("", [{ role: "user", text: "A photo of a food" + (descText ? ": " + descText : "") + "." }, { role: "assistant", text: pr.question }]); return; }
              var pit = itemFromReply(pr.reply);
              var info = pit;   /* for the suitability line below (per portion) */
              setCameraPreview(withRuleRating(Object.assign({}, pit, { kcal: pit.kcal, itemType: pit.servings > 1 ? "ingredient" : (pr.reply.itemType === "ingredient" ? "ingredient" : "packaged"), originalIngredients: (pit.ingredients || []).join(", "), source: "photo", category: addingCategory })));
              setReviewCategories([addingCategory]);
              setReviewSideType("");
              setFormMsg("");
              setAddingNew(false);
              // Now generate suitability line
              try {
                var p = data[activeTab] || {};
                var profile = p.profile || {};
                var suitPrompt = "Food: " + (info.name||"") + " (" + (info.kcal||0) + " kcal, " + (info.protein||0) + "g protein, " + (info.fat||0) + "g fat, " + (info.satFat||0) + "g sat fat, rating: " + (info.rating||"") + "). Person: " + (profile.name||activeTab) + ", targets: " + (isJC ? "" + kcalTargetText(data && data[activeTab]) + ", 110-130g protein, <20g sat fat" : "" + kcalTargetText(data && data[activeTab]) + ", 90-110g protein, <20g sat fat, LDL 7.2 high cholesterol") + ". Give ONE sentence on suitability for this person. Be specific to their health profile.";
                var sResp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-lc-feature": "foodRatings", "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 100, messages: [{ role: "user", content: suitPrompt }] }) });
                var sResult = await sResp.json();
                var sTxt = ""; if (sResult.content) { for (var si=0;si<sResult.content.length;si++) { if(sResult.content[si].text) sTxt+=sResult.content[si].text; } }
                setCameraPreview(function(prev) { return Object.assign({}, prev, { suitability: sTxt.trim() }); });
              } catch(se) {}
            } catch(ce) { setFormMsg(window.aiErrorMsg(ce)); }
            setNewItemLoading(false);
            setTimeout(function() { setFormMsg(""); }, 4000);
          };

          /* v2.14.1: Help Me Eat photo analysis as a function, so a "no food" result can be re-checked with the same photo
             (kept in memory only) and the description. */
          window._lcHelpEatPhoto = async function(file) {
            window._lcHelpEatFile = file;
            setHelpEatLoading(true);
                        try {
                          var _img = await readImageForAI(file);   /* v2.14.0: shrunk before sending */
                          var base64 = _img.data; var mediaType = _img.mediaType;
                          var isJC2 = activeTab === "jc";
                          var personCtx = isJC2 ? "JC, male 49, " + kcalTargetText(data && data[activeTab]) + ", 110-130g protein, under 20g sat fat, under 25g added sugar, 30-35g fibre. Thyroid issues (TSH 14.2), statin 20mg, HbA1c 43." : "Becks, female 48, " + kcalTargetText(data && data[activeTab]) + ", 90-110g protein, under 20g sat fat (critical — LDL 7.2, Total Cholesterol 9.6, suspected FH), under 25g added sugar, 25-30g fibre. Perimenopausal, citalopram, atorvastatin.";
                          var locationHint = helpEatText.trim() ? " The user is at or considering: " + helpEatText.trim() + "." : "";
                          var catLabel = helpEatCat;
                          var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-lc-feature": "snap", "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 800, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: "This person needs help choosing a " + catLabel + " option." + locationHint + " Person profile: " + personCtx + " Analyse the image (menu, buffet, shelf, food options). FIRST decide whether the photo shows any food, drink, menu or food options at all. If it does NOT (for example a person, a room, a blank, dark or blurred photo), set \"isFood\": false, every value 0, and say briefly what you see in \"name\"; otherwise set \"isFood\": true. Recommend the BEST suitable option and explain why. Include portion advice if relevant (e.g. 'have half portion', 'skip the side'). Return ONLY JSON: {\"isFood\":true/false,\"name\":\"recommended food/meal name\",\"kcal\":estimated_calories,\"protein\":grams,\"fat\":total_fat_grams,\"satFat\":saturated_fat_grams,\"addedSugar\":added_sugar_grams_only_not_natural_sugars,\"carbs\":carbs_grams,\"fibre\":fibre_grams,\"salt\":salt_grams,\"rating\":\"GREAT or AMBER or RED\",\"recommendation\":\"2-3 sentences explaining why this is the best choice and any portion/modification advice\",\"alternatives\":\"1 sentence naming one alternative if available\"}" }] }] }) });
                          var result = await resp.json();
                          var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
                          var txt = ""; if (result.content) { for (var ri = 0; ri < result.content.length; ri++) { if (result.content[ri].text) txt += result.content[ri].text; } }
                          var jsonStr = txt.replace(/```json|```/g, "").trim(); var jsonMatch = jsonStr.match(/\{[\s\S]*\}/); if (!jsonMatch) throw new Error("No JSON found"); var info = JSON.parse(jsonMatch[0]);
                          if (noFood(info)) { setHelpEatResult({ noFood: true, name: info.name || "" }); setHelpEatLoading(false); return; }   // v2.14.1
                          setHelpEatResult(withRuleRating({ name: info.name || "Unknown", kcal: info.kcal || 0, protein: info.protein || 0, fat: info.fat || 0, satFat: info.satFat || 0, addedSugar: info.addedSugar || 0, carbs: info.carbs || 0, fibre: info.fibre || 0, salt: info.salt || 0, rating: info.rating || "AMBER", recommendation: info.recommendation || "", alternatives: info.alternatives || "", category: helpEatCat }));
                        } catch(ce) { setFormMsg(window.aiErrorMsg(ce)); setTimeout(function(){setFormMsg("");},10000); }
            setHelpEatLoading(false);
          };
          window._lcRecheckAddPhoto = function(desc) { if (window._lcAddPhoto) { setCameraPreview(null); addFromCamera(window._lcAddPhoto, desc); } };
          var addNewItem = async function() {   /* v2.19.1 F27: a typed description goes to the clarifying conversation (per portion; asks, doesn't fail) */
            if (!newItemName.trim()) return;
            var t = newItemName.trim(); setNewItemName(""); toOwnItem(t);
          };

          /* ═══ Shared confirm handler for Review Item (inline + overlay) ═══ */
          /* Shared add-item step (list insertion, duplicate check, assign to slot). Used by confirmReviewItem and
             by the portion photo when it shows a different food (v2.6.2 D10). */
          var addReviewedItem = async function(cp, cats, slotDay, slotKey, slotCategory, sideType) {
              var addedTo = []; var dupeFound = [];
              for (var ci = 0; ci < cats.length; ci++) {
                var cat = cats[ci];
                var listItems = cat === "breakfast" ? customBreakfasts : cat === "lunch" ? customLunches : cat === "dinner" ? customMeals : cat === "drink" ? customDrinks : cat === "dessert" ? customDesserts : customSnacks;
                var dupeName = cp.name.toLowerCase().trim();
                if (listItems.some(function(x) { return x.name.toLowerCase().trim() === dupeName; })) { dupeFound.push(cat); continue; }
                var newItem = withRuleRating({ id: "custom_" + Date.now() + "_" + ci, name: cp.name, jcKcal: cp.kcal, beckKcal: cp.kcal, protein: cp.protein || 0, fat: cp.fat || 0, satFat: cp.satFat || 0, addedSugar: cp.addedSugar || 0, carbs: cp.carbs || 0, fibre: cp.fibre || 0, salt: cp.salt || 0, rating: cp.rating, itemType: cp.itemType || "packaged", ingredients: cp.ingredients || [], freq: "Daily", isCustom: true, source: cp.source || "manual", barcode: cp.barcode || "", servingSize: cp.servingSize || "", suitability: cp.suitability || "" }); /* D11: rule rating */
                if (cat === "dinner" && !sideType) { newItem.jcProt = cp.protein; newItem.beckProt = cp.protein; newItem.jcFat = cp.fat; newItem.beckFat = cp.fat; newItem.time = 30; newItem.shop = cp.itemType === "ingredient" ? (cp.ingredients || []) : [cp.name]; }
                if (cat === "dinner" && sideType) { newItem.sideType = sideType; }
                var setList = cat === "breakfast" ? setCustomBreakfasts : cat === "lunch" ? setCustomLunches : cat === "dinner" ? setCustomMeals : cat === "drink" ? setCustomDrinks : cat === "dessert" ? setCustomDesserts : setCustomSnacks;
                var storageKey = cat === "breakfast" ? "custom_breakfasts" : cat === "lunch" ? "custom_lunches" : cat === "dinner" ? "custom_meals" : cat === "drink" ? "custom_drinks" : cat === "dessert" ? "custom_desserts" : "custom_snacks";
                var u = [].concat(listItems, [newItem]); setList(u); await sSet(storageKey, JSON.stringify(u));
                _listLookup[newItem.id] = newItem; /* D6: so the slot gets its snapshot straight away */
                addedTo.push(cat); listItems = u;
              }
              if (slotKey) {
                var assignId = null;
                if (addedTo.length > 0 && newItem) { assignId = newItem.id; }
                else if (dupeFound.length > 0) {
                  var dupeList = slotCategory === "breakfast" ? customBreakfasts : slotCategory === "lunch" ? customLunches : slotCategory === "dinner" ? customMeals : slotCategory === "drink" ? customDrinks : slotCategory === "dessert" ? customDesserts : customSnacks;
                  var dupeMatch = dupeList.find(function(x) { return x.name.toLowerCase().trim() === cp.name.toLowerCase().trim(); });
                  if (dupeMatch) assignId = dupeMatch.id;
                }
                if (assignId) {
                  if (slotDay) { setMeal(slotDay, slotKey, assignId); }
                  else { saveDef(slotKey, assignId, "individual"); }
                }
              }
            var itemId = (addedTo.length > 0 && newItem) ? newItem.id : null;
            if (!itemId && dupeFound.length > 0) { var dl = bulkListFor(cats[0]); var dm0 = dl.find(function(x) { return x.name.toLowerCase().trim() === cp.name.toLowerCase().trim(); }); if (dm0) itemId = dm0.id; }
            return { addedTo: addedTo, dupeFound: dupeFound, assignId: slotKey ? assignId : null, itemId: itemId };
          };
          var confirmReviewItem = async function(isOverlay) {
            var nameId = isOverlay ? "review-item-name-overlay" : "review-item-name";
            var ingId = isOverlay ? "review-item-ingredients-overlay" : "review-item-ingredients";
            var nameEl = document.getElementById(nameId);
            var ingEl = document.getElementById(ingId);
            var editedName = nameEl ? nameEl.value.trim() : cameraPreview.name;
            var editedIngredients = ingEl ? ingEl.value.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length > 0;}) : (cameraPreview.ingredients || []);
            var cp = Object.assign({}, cameraPreview, { name: editedName, ingredients: editedIngredients });
            var cats = reviewCategories;
            if (cats.length === 0) return;

            /* Step 1 (v2.19.1 F27): changed ingredients are worked out PER PORTION in the clarifying conversation */
            if (cp.itemType === "ingredient" && cp.originalIngredients !== undefined && editedIngredients.join(", ") !== cp.originalIngredients) {
              toOwnItem(editedName + ". Ingredients: " + editedIngredients.join(", ") + "." + (cp.servings ? " It makes " + cp.servings + " portions." : ""));
              return;
            }

            /* Step 2: Add item to selected categories (shared step) */
            var _added = await addReviewedItem(cp, cats, addingSlotDay, addingSlotKey, addingCategory, reviewSideType);
            var addedTo = _added.addedTo; var dupeFound = _added.dupeFound;
            if (dupeFound.length > 0 && addedTo.length === 0) { setFormMsg("⚠️ " + cp.name + " already exists in " + dupeFound.join(", ")); }
            else if (dupeFound.length > 0) { setFormMsg("✅ Added to " + addedTo.join(", ") + " (already in " + dupeFound.join(", ") + ")"); }
            else { setFormMsg("✅ Added " + cp.name + " to " + addedTo.join(", ")); }
            setCameraPreview(null); setReviewCategories([]); setReviewSideType(""); setAddingSlotKey(null); setAddingSlotDay(null); setNewItemName(""); setOffResults([]);
            if (addingSource !== "manage") setAddingNew(false); /* close the add box when added from a selection list */
            setTimeout(function(){setFormMsg("");}, 4000);
          };
          /* Overlay panel renders outside this section's scope — expose current closure */
          window._confirmReviewItem = confirmReviewItem;

          /* ═══ Update an existing list item — same confirm / recalc / continue flow ═══ */
          var saveEditItem = async function(cat) {
            var d = editDraft; if (!d) return;
            var nameEl = document.getElementById("edit-item-name-" + d.id);
            var ingEl = document.getElementById("edit-item-ingredients-" + d.id);
            var editedName = (nameEl && nameEl.value.trim()) || d.name;
            var editedIng = ingEl ? ingEl.value.split(",").map(function(x){return x.trim();}).filter(function(x){return x.length > 0;}) : (d.ingredients || []);
            var dd = Object.assign({}, d, { name: editedName, ingredients: editedIng });
            if (dd.itemType === "ingredient" && editedIng.length > 0 && (editedIng.join(", ") !== dd.originalIngredients || ((/^Nutrition looks off|^Check me — confirm portions/.test(dd.checkReason || "") || dd.portionCheck) && !dd.recalculated))) { /* D7: a doubtful item recalculates on Confirm */
              /* v2.19.0: recalculated PER PORTION through the clarifying conversation (replaces the whole-recipe D7 call) */
              setEditDraft(dd);
              setEditClarify("Recalculate per portion — " + editedName.replace(/\s*\(\d+\s*kcal\)\s*$/i, "") + ". Ingredients: " + editedIng.join(", ") + "." + (dd.servings ? " It makes " + dd.servings + " portions." : ""));
              setFormMsg("");
              return;
            }
            var saved = withRuleRating(Object.assign({}, dd)); delete saved.originalIngredients; delete saved.recalculated; delete saved.checkMe; delete saved.checkReason; delete saved._ragChanged; /* F4: checked */
            var u = cat.customs.map(function(x) { return x.id === d.id ? saved : x; });
            cat.setCustoms(u); await sSet(cat.storageKey, JSON.stringify(u));
            setEditingItem(null); setEditDraft(null);
            setFormMsg("✅ Updated " + saved.name);
            setTimeout(function(){ setFormMsg(""); }, 3000);
          };

          /* ═══ Bulk paste add — auto-adds items without per-item review (v2.6.3: batches, cancel, Check me) ═══ */
          var BULK_BATCH = 10;
          var bulkListFor = function(c) { return c === "breakfast" ? customBreakfasts : c === "lunch" ? customLunches : c === "dinner" ? customMeals : c === "drink" ? customDrinks : c === "dessert" ? customDesserts : customSnacks; };
          var bulkSetterFor = function(c) { return c === "breakfast" ? setCustomBreakfasts : c === "lunch" ? setCustomLunches : c === "dinner" ? setCustomMeals : c === "drink" ? setCustomDrinks : c === "dessert" ? setCustomDesserts : setCustomSnacks; };
          var bulkKeyFor = function(c) { return c === "breakfast" ? "custom_breakfasts" : c === "lunch" ? "custom_lunches" : c === "dinner" ? "custom_meals" : c === "drink" ? "custom_drinks" : c === "dessert" ? "custom_desserts" : "custom_snacks"; };
          var catLabel = function(c) { return c === "snack" ? "Snacks" : c === "drink" ? "Drinks" : c === "dessert" ? "Desserts" : c.charAt(0).toUpperCase() + c.slice(1); };
          var bulkPasteAdd = async function(bulkCatArg, retryLines) {
            if (!bulkCatArg) { setFormMsg("Choose a category first"); return; }
            var pasteEl = document.getElementById("bulk-paste-textarea");
            var lines = retryLines || (pasteEl ? pasteEl.value : "").split(/[\n\r,]+/).map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
            if (lines.length === 0) { setFormMsg(retryLines ? "Nothing to retry" : "Paste your items first"); return; }
            if (!retryLines && !confirm("Add " + lines.length + " item" + (lines.length === 1 ? "" : "s") + " to " + catLabel(bulkCatArg) + "?")) return;
            var token = { cancelled: false, ctrl: typeof AbortController !== "undefined" ? new AbortController() : null, addedIds: [], cat: bulkCatArg };
            bulkToken.current = token;
            setBulkUndo(null); setBulkDone(null);
            setNewItemLoading(true);
            var batches = []; for (var bs = 0; bs < lines.length; bs += BULK_BATCH) batches.push(lines.slice(bs, bs + BULK_BATCH));
            var isJC2 = activeTab === "jc";
            var targetsStr = isJC2 ? "Daily targets: " + kcalTargetText(data && data[activeTab]) + ", 110-130g protein, <20g sat fat, <25g added sugar, 30-35g fibre, <6g salt" : "Daily targets: " + kcalTargetText(data && data[activeTab]) + ", 90-110g protein, <20g sat fat (critical - LDL 7.2 high cholesterol/suspected FH), <25g added sugar, 25-30g fibre, <6g salt";
            var listItems = bulkListFor(bulkCatArg); var setList = bulkSetterFor(bulkCatArg); var storageKey2 = bulkKeyFor(bulkCatArg);
            var addedCount = 0; var skippedCount = 0; var failed = []; var lastErr = ""; var helpLines = [];   /* v2.19.1: lines that need the person */
            setBulkHelp([]);
            for (var bn = 0; bn < batches.length; bn++) {
              var batch = batches[bn];
              setBulkRun({ done: bn * BULK_BATCH, total: lines.length, failed: failed, cat: bulkCatArg });
              setFormMsg("🔍 Rating " + (bn * BULK_BATCH + 1) + "–" + (bn * BULK_BATCH + batch.length) + " of " + lines.length + "…");
              try {
                /* v2.19.1 F27: per-portion items with the shared schema; each line validated (retried), unclear lines → the person */
                var callBulk = async function(msgs) {
                  var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", signal: token.ctrl ? token.ctrl.signal : undefined, headers: { "x-lc-feature": "myOwnItem", "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4000, temperature: 0, system: CLARIFY_SYSTEM, messages: msgs }) });
                  var result = await resp.json();
                  if (token.cancelled) throw new Error("cancelled");
                  var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
                  var txt = ""; (result.content || []).forEach(function(c0) { if (c0.text) txt += c0.text; }); return txt;
                };
                void targetsStr; void isJC2;
                var got = await askItemsBatch(batch, { call: callBulk });
                if (token.cancelled) break;
                got.help.forEach(function(h) { helpLines.push(h); });
                var batchNew = [];
                for (var bi = 0; bi < got.items.length; bi++) {
                  var it = itemFromReply(got.items[bi].reply);
                  var dupeName2 = (it.name || "").toLowerCase().trim();
                  if (listItems.concat(batchNew).some(function(x) { return x.name.toLowerCase().trim() === dupeName2; })) { skippedCount++; continue; }
                  var newItem = withRuleRating(Object.assign({}, it, { id: "custom_" + Date.now() + "_" + bn + "_" + bi, source: "bulk", checkMe: true, checkReason: "Added by bulk upload: check the portion (" + portionLabel(it) + "), weight and ingredients match what you have, then save." }));
                  if (bulkCatArg === "dinner") { newItem.time = 30; newItem.shop = (it.ingredients || []).length ? it.ingredients : [it.name]; }
                  batchNew.push(newItem);
                }
                if (token.cancelled) break;
                if (batchNew.length) {
                  listItems = [].concat(listItems, batchNew);                     /* each batch is saved as it succeeds */
                  setList(listItems); await sSet(storageKey2, JSON.stringify(listItems));
                  batchNew.forEach(function(x) { token.addedIds.push(x.id); });
                  addedCount += batchNew.length;
                }
              } catch(e) {
                if (token.cancelled) break;
                if (window.isEnergyEmpty(e)) { lastErr = window.energyEmptyMsg; failed = failed.concat(batches.slice(bn).reduce(function(a, b) { return a.concat(b); }, [])); break; }
                lastErr = String(e.message || e).substring(0, 100);
                failed = failed.concat(batch);                                     /* D3: keep going; this batch can be retried */
              }
            }
            setNewItemLoading(false);
            if (token.cancelled) return;                                           /* cancelBulk has already reported */
            setBulkHelp(helpLines);
            bulkToken.current = null;
            setBulkRun(failed.length ? { done: lines.length - failed.length, total: lines.length, failed: failed, cat: bulkCatArg } : null);
            if (failed.length) {
              setFormMsg("⚠️ " + addedCount + " added to " + catLabel(bulkCatArg) + "; " + failed.length + " item" + (failed.length === 1 ? "" : "s") + " could not be rated (" + lastErr + "). Press Retry to try them again.");
            } else {
              setFormMsg(skippedCount > 0 ? skippedCount + " skipped — duplicates or unrecognised" : "");
              if (pasteEl) pasteEl.value = "";
              setBulkReviewItems(null); setBulkCat("");
            }
            if (addedCount > 0 && !failed.length) setBulkDone(addedCount + " item" + (addedCount === 1 ? "" : "s") + " added to " + catLabel(bulkCatArg) + ". Ratings are AI estimates. Open each item and check the weight, portion and ingredients match what you actually have, then update where needed.");
          };
          /* D5: Cancel stops the requests and discards anything that arrives afterwards */
          var cancelBulk = function() {
            var t = bulkToken.current;
            if (t) {
              t.cancelled = true; if (t.ctrl) { try { t.ctrl.abort(); } catch(e) {} }
              bulkToken.current = null;
              setNewItemLoading(false); setBulkRun(null);
              if (t.addedIds.length) { setBulkUndo({ cat: t.cat, ids: t.addedIds.slice() }); setFormMsg("Cancelled — " + t.addedIds.length + " item" + (t.addedIds.length === 1 ? "" : "s") + " from earlier batches were already added to " + catLabel(t.cat) + "."); }
              else setFormMsg("Cancelled — nothing was added");
            }
            setBulkReviewItems(null); setBulkCat("");
          };
          /* ═══ v2.6.5 list-wide actions: D11 re-rate (rules) and D7 re-check nutrition (flags only) ═══ */
          var LIST_CATS = ["breakfast", "lunch", "dinner", "snack", "dessert", "drink"];
          var askJsonArray = async function(prompt) {
            var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-lc-feature": "foodRatings", "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }) });
            var result = await resp.json(); var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
            var txt = ""; (result.content || []).forEach(function(c) { if (c.text) txt += c.text; });
            var m = txt.replace(/```json|```/g, "").trim().match(/\[[\s\S]*\]/); if (!m) throw new Error("No JSON array found");
            return JSON.parse(m[0]);
          };
          var inBatches = async function(items, size, fn) { for (var i = 0; i < items.length; i += size) await fn(items.slice(i, i + size), i); };
          var reRateAll = async function() {
            if (listJob) return;
            setListJob("rerate"); setRagRecalcMsg("Re-rating all lists by portion…");
            try {
              var total = 0, changed = 0;
              for (var ci = 0; ci < LIST_CATS.length; ci++) {
                var c = LIST_CATS[ci]; var list = bulkListFor(c).slice(); if (!list.length) continue;
                var need = list.filter(function(x) { return x.addedSugar == null; });
                var est = {};
                await inBatches(need, 20, async function(batch, off) {
                  setRagRecalcMsg("Estimating added sugar for " + catLabel(c) + " (" + (off + 1) + "–" + (off + batch.length) + " of " + need.length + ")…");
                  var arr = await askJsonArray("For each food item below, estimate the ADDED sugar in grams (sugars added in processing or cooking, syrups, honey; NOT sugar naturally in fruit, vegetables or plain milk) for the portion its values describe. Items: " + batch.map(function(x) { return x.id + ": " + x.name + " (" + (x.jcKcal || x.kcal || 0) + " kcal, carbs " + (x.carbs || 0) + "g)"; }).join("; ") + ". Return ONLY a JSON array: [{\"id\":\"item_id\",\"addedSugar\":grams}]");
                  arr.forEach(function(r) { if (r && r.id != null) est[r.id] = parseFloat(r.addedSugar) || 0; });
                });
                var out = list.map(function(x) {
                  var y = Object.assign({}, x); if (y.addedSugar == null && est[y.id] != null) y.addedSugar = est[y.id];
                  var r = rateByPortion(y); total++;
                  var was = bandOf(x);
                  y.rating = r.rating; y.ragFreq = r.ragFreq; y.ragReason = r.reason;
                  if (was !== r.band) { changed++; y.prevRating = was; y._ragChanged = true; y._ragChangedSeen = false; y.checkMe = true; y.checkReason = "Rating changed from " + was + " to " + r.band + ": " + r.reason; }
                  return y;
                });
                bulkSetterFor(c)(out); await sSet(bulkKeyFor(c), JSON.stringify(out));
              }
              setRagRecalcMsg("✅ Re-rated " + total + " items by portion: " + changed + " changed (marked Check me).");
            } catch(e) { setRagRecalcMsg("Error: " + (window.isEnergyEmpty(e) ? window.energyEmptyMsg : String(e.message || e).substring(0, 100)) + " — lists already finished were saved."); }
            setListJob("");
          };
          var recheckNutrition = async function() {   /* v2.19.1 F27: per portion — flags whole-recipe / per-100 g values; never changes them */
            if (listJob) return;
            if (!confirm("Re-check nutrition per portion? Values are NOT changed; anything that looks like a whole recipe or a per-100 g value is marked \"Check me — confirm portions\" for you to open and review.")) return;
            setListJob("recheck"); setRagRecalcMsg("Re-checking nutrition…");
            try {
              var checked = 0, flagged = 0, unchecked = 0;
              for (var ci = 0; ci < LIST_CATS.length; ci++) {
                var c = LIST_CATS[ci]; var list = bulkListFor(c).slice();
                var cands = list.filter(function(x) { return (parseFloat(x.jcKcal || x.kcal) || 0) > 0 && !x.meal; }); if (!cands.length) continue;
                var verdict = {};
                await inBatches(cands, 10, async function(batch, off) {
                  setRagRecalcMsg("Re-checking " + catLabel(c) + " (" + (off + 1) + "–" + (off + batch.length) + " of " + cands.length + ")…");
                  var res = await recheckBatch(batch.map(function(x) { return { id: x.id, name: stripKcalName(x.name), portion: portionLabel(x), kcal: x.jcKcal || x.kcal || 0, ingredients: (x.ingredients || []).join(", ") }; }));
                  Object.keys(res.byId).forEach(function(k) { verdict[k] = res.byId[k]; }); unchecked += res.unchecked.length;
                });
                var touched = false;
                var out = list.map(function(x) {
                  var v = verdict[x.id]; if (!v) return x; checked++;
                  var why = recheckFlag(parseFloat(x.jcKcal || x.kcal) || 0, v);
                  if (why) { flagged++; touched = true; return Object.assign({}, x, { checkMe: true, portionCheck: true, checkReason: why }); }
                  return x;
                });
                if (touched) { bulkSetterFor(c)(out); await sSet(bulkKeyFor(c), JSON.stringify(out)); }
              }
              setRagRecalcMsg("✅ Re-checked " + checked + " items per portion: " + flagged + " marked \"Check me — confirm portions\". Nothing else was changed." + (unchecked ? " " + unchecked + " couldn't be checked this time — run it again later." : ""));
            } catch(e) { setRagRecalcMsg(window.isEnergyEmpty(e) ? window.energyEmptyMsg : "The Companion isn't reachable right now — nothing was changed. Try again later."); }
            setListJob("");
          };

          var undoBulk = async function() {
            var u = bulkUndo; if (!u) return;
            var keep = bulkListFor(u.cat).filter(function(x) { return u.ids.indexOf(x.id) < 0; });
            bulkSetterFor(u.cat)(keep); await sSet(bulkKeyFor(u.cat), JSON.stringify(keep));
            setBulkUndo(null); setFormMsg("Removed " + u.ids.length + " item" + (u.ids.length === 1 ? "" : "s") + " from " + catLabel(u.cat));
          };

          var deleteCustomItem = async function(itemId) {
            var cb = customBreakfasts.filter(function(x){return x.id !== itemId;}); setCustomBreakfasts(cb); await sSet("custom_breakfasts", JSON.stringify(cb));
            var cl = customLunches.filter(function(x){return x.id !== itemId;}); setCustomLunches(cl); await sSet("custom_lunches", JSON.stringify(cl));
            var cm = customMeals.filter(function(x){return x.id !== itemId;}); setCustomMeals(cm); await sSet("custom_meals", JSON.stringify(cm));
            var cs = customSnacks.filter(function(x){return x.id !== itemId;}); setCustomSnacks(cs); await sSet("custom_snacks", JSON.stringify(cs));
            setFormMsg("Item deleted"); setTimeout(function(){setFormMsg("");}, 2000);
          };

          /* v2.6.5: write another person's or another week's selections as CHILDREN (never the old plan keys) */
          var editWeekChildren = async function(person, ws, editView, source, otherChildren) {
            var doc = await loadWeekDoc(person, ws, { write: true, lookup: _listLookup });
            var view = viewFromDoc(doc); editView(view);
            var nd = reconcile(doc, view, _listLookup, { weekStart: ws, isJC: person === "jc", source: source, otherChildren: otherChildren, limitsFor: function() { return personalLimits(data && data[person]); } });
            await saveWeekDoc(person, ws, nd);
          };
          var applyDefaults = async function() {
            var planned = applyDefaultsTo(meals, mealDefaults[activeTab]); /* D9: keep selections, then defaults */
            var n = planned.meals;
            setMeals(n); saveMeals(n, "default");
            var otherPeople = Object.keys(data).filter(function(k) { return k !== "config" && k !== activeTab; });
            for (var opi = 0; opi < otherPeople.length; opi++) {
              var op = otherPeople[opi];
              var opDefs = mealDefaults[op] || {};
              if (Object.keys(opDefs).length === 0) continue;
              await editWeekChildren(op, weekStart, function(opM) {
                DAYS.forEach(function(d) {
                  if (!opM[d]) opM[d] = {};
                  if (opDefs.b && !opM[d].b) opM[d].b = opDefs.b;
                  if (opDefs.l && !opM[d].l) opM[d].l = opDefs.l;
                  if (opDefs.d && !opM[d].d) opM[d].d = opDefs.d;
                  for (var i = 1; i <= 7; i++) { if (opDefs["o" + i] && !opM[d]["o" + i]) opM[d]["o" + i] = opDefs["o" + i]; }
                });
              }, "default");
            }
            setFormMsg("Defaults applied (all people)"); setTimeout(function() { setFormMsg(""); }, 2000);
            return planned;
          };

          var saveDef = function(key, val, scope) {
            var nd = Object.assign({}, mealDefaults);
            if (scope === "all") {
              Object.keys(data).forEach(function(tab) { if (tab !== "config") { if (!nd[tab]) nd[tab] = {}; nd[tab][key] = val; } });
            } else {
              if (!nd[activeTab]) nd[activeTab] = {};
              nd[activeTab][key] = val;
            }
            setMealDefaults(nd); sSet("meal_defaults", JSON.stringify(nd));
            var ns = Object.assign({}, defScopes); ns[key] = scope; setDefScopes(ns);
          };

          var defs = mealDefaults[activeTab] || {};
          var dayMeals = meals[eatDay] || {};
          var otherSlots = [];
          for (var oi = 1; oi <= 20; oi++) { if (dayMeals["o" + oi] || oi <= Math.max(getOtherCount(eatDay), 1) || dayMeals["o" + oi] === "__empty__") otherSlots.push(oi); }

          /* v2.8.0 F5: a list item opened read-only. Edit = the Update Item editor; Delete from list lives ONLY here. */
          var nutritionRows = function(n, kcal) { return (<>
            <Field label="Calories" testid="view-kcal">{kcal} kcal per portion</Field>
            <Field label="Nutrition (per portion)">{(n.protein || 0) + "g protein · " + (n.fat || 0) + "g fat · " + (n.satFat || 0) + "g sat fat · " + (n.addedSugar || 0) + "g added sugar · " + (n.carbs || 0) + "g carbs · " + (n.fibre || 0) + "g fibre · " + (n.salt || 0) + "g salt"}</Field>
          </>); };
          var ragText = function(it) { var b = bandOf(it); return b ? (b.indexOf("RED") === 0 ? "RED" : b) + (FREQ_LABEL[b] ? " · " + FREQ_LABEL[b] : "") : "—"; };
          var renderItemView = function(item, cat) {
            var kcal = isJC ? item.jcKcal : item.beckKcal;
            return (<OpenForm testid="item-view" title={item.name} subtitle={"In your " + cat.label + " list"} editing={false}
              onEdit={function() { setItemOpen(null); setEditingItem(item.id); setEditDraft(Object.assign({}, item, { originalIngredients: (item.ingredients || []).join(", "), recalculated: false })); setFormMsg(""); }}
              dangerKind="delete" onDanger={async function() { if (!confirm("Delete " + item.name + " from your " + cat.label + " list? Meals you already logged keep their own copy.")) return; var u = cat.customs.filter(function(x){return x.id !== item.id;}); cat.setCustoms(u); await sSet(cat.storageKey, JSON.stringify(u)); setItemOpen(null); setFormMsg("Deleted " + item.name); setTimeout(function(){setFormMsg("");},2000); }}
              onClose={function() { setItemOpen(null); }}>
              <Field label="Portion" testid="view-portion">{portionLabel(item)}</Field>
              {nutritionRows(item, kcal)}
              {item.meal && (<Field label="Meal" testid="view-meal">{"Serves " + item.meal.serves + " · " + item.meal.components.map(function(c) { return c.name + " " + c.amount + (c.unit === "g" ? " g" : " portion" + (Number(c.amount) === 1 ? "" : "s")); }).join(", ")}<div><button type="button" onClick={function() { setItemOpen(null); setMealEdit(item.id); }} style={btnOpen}>Edit meal</button></div></Field>)}
              {ratingsShown() && <Field label="Rating" testid="view-rating"><span style={{ fontWeight: 700, color: ratingColor(item.rating) }}>{ragText(item)}</span>{item.ragReason ? <div style={{ fontSize: 10, color: "#475569" }}>{item.ragReason}</div> : null}</Field>}
              <Field label="Type">{item.itemType === "ingredient" ? "🍳 Ingredient prepared" : "📦 Packaged"}{item.servingSize ? " · " + item.servingSize : ""}</Field>
              {(item.ingredients || []).length > 0 && <Field label="Ingredients">{item.ingredients.join(", ")}</Field>}
              {item.checkMe && <Field label="Check me">{item.checkReason || "Added by bulk upload: check it, then Edit and Save."}</Field>}
              {item.suitability && <Field label="About">{item.suitability}</Field>}
            </OpenForm>);
          };
          /* v2.52.0 (night batch 25 Nov P1a): the Snap panel, once — under its category, or inside the picker when Snap was started there */
          var renderSnapPanel = function() { return (<div style={{ background: "#faf5ff", borderRadius: 8, padding: 10, marginBottom: 8, border: "1px solid #ddd6fe" }}>
                {portionLoading && <div style={{ fontSize: 11, color: "#1e3a5f", fontWeight: 600 }}>⏳ Looking at your photo...</div>}
                {snapPre === portionSlot && !portionLoading && !portionResult && (<div data-testid="snap-pre">
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>📷 Snap a photo of your food</div>
                  <input aria-label="Photo description" value={portionDesc} onChange={function(e){ setPortionDesc(e.target.value); }} placeholder="Optional: size and detail, e.g. 'large plate', '2 sausages', '28g bar', 'half eaten'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #ddd6fe", borderRadius: 8, fontSize: 11, marginBottom: 6 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <label style={{ flex: 1, padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>📷 Take photo<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) portionAnalyze(portionSlot, e.target.files[0], listForSlot(portionSlot), portionDesc); e.target.value=""; }} style={{ display: "none" }} /></label>
                    <button onClick={function() { cancelPortion(); if (picker && picker.snap) setPicker(Object.assign({}, picker, { snap: false })); }} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>)}
                {portionResult && (<div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{noFood(portionResult) ? "📷 No food found" : portionResult._deep ? "🔎 Re-check deep dive — re-assessed outcome" : !portionPlanned ? "📷 " + (portionResult.name || "Food") : portionResult.matchesPlanned === false ? "⚠️ Looks like " + (portionResult.name || "a different food") + ", not " + portionPlanned.name : "📷 Portion Analysis"}</div>
                  {noFood(portionResult) ? <div data-testid="snap-no-food" role="alert" style={{ fontSize: 11, fontWeight: 600, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: 8, marginBottom: 6 }}>{NO_FOOD_MSG}</div> : portionPlanned ? (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 10, marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, color: "#475569" }}></div><div style={{ fontWeight: 600, color: "#475569", textAlign: "center" }}>Planned</div><div style={{ fontWeight: 600, color: "#475569", textAlign: "center" }}>Actual</div>
                    <div style={{ color: "#475569" }}>kcal</div><div style={{ textAlign: "center" }}>{portionPlanned.kcal}</div><div style={{ textAlign: "center", color: portionResult.kcal > portionPlanned.kcal * 1.1 ? "#b91c1c" : portionResult.kcal < portionPlanned.kcal * 0.9 ? "#1d4ed8" : "#0c4a6e", fontWeight: 600 }}>{portionResult.kcal}</div>
                    <div style={{ color: "#475569" }}>Protein</div><div style={{ textAlign: "center" }}>{portionPlanned.protein}g</div><div style={{ textAlign: "center", fontWeight: 600 }}>{portionResult.protein}g</div>
                    <div style={{ color: "#475569" }}>Sat fat</div><div style={{ textAlign: "center" }}>{portionPlanned.satFat}g</div><div style={{ textAlign: "center", color: portionResult.satFat > portionPlanned.satFat * 1.1 ? "#b91c1c" : "#0c4a6e", fontWeight: 600 }}>{portionResult.satFat}g</div>
                  </div>) : (<div data-testid="snap-values" style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10, marginBottom: 6 }}><span><b>{portionResult.kcal}</b> kcal</span><span><b>{portionResult.protein || 0}g</b> prot</span><span><b>{portionResult.satFat || 0}g</b> s/fat</span><span><b>{portionResult.addedSugar || 0}g</b> added sugar</span></div>)}
                  {!noFood(portionResult) && portionResult.portionNote && <div style={{ fontSize: 10, color: "#6b21a8", fontStyle: "italic", marginBottom: 6 }}>{portionResult.portionNote}</div>}
                  {!noFood(portionResult) && (function() { var rr = rateByPortion(portionResult, personalLimits(data && data[activeTab]));   /* v2.18.2: a selection → this person's limits */ return <div data-testid="snap-rating" style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, color: ratingColor(rr.rating) }}>{ratingLabel(rr.rating + " · " + rr.freqLabel)}</div>; })()}
                  {!noFood(portionResult) && portionResult._deep && portionFirst && <div data-testid="deep-compare" style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{compareLine(portionFirst, portionResult)}</div>}
                  {portionResult._deep && <div style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{portionResult.name}</div>}
                  {!noFood(portionResult) && gramsLine(portionResult) && <div data-testid="portion-assumed" style={{ fontSize: 10, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Assumed: {gramsLine(portionResult)} — {portionResult.kcal} kcal</div>}
                  <div data-testid="snap-recheck-hint" style={{ marginBottom: 8, padding: 6, border: "2px solid #f59e0b", background: "#fffbeb", borderRadius: 8 }}><div style={{ fontSize: 10, color: "#78350f", fontWeight: 600, marginBottom: 4 }}>{portionResult && portionResult._deep ? "💡 Re-check – for improved accuracy, you may provide any known weight, calories or portion sizes to help your companion analysis" : "💡 Additional Information – for improved accuracy, you may provide any known weight, calories or portion sizes to help your companion analysis"}</div><input aria-label="Photo description" value={portionDesc} onChange={function(e){ setPortionDesc(e.target.value); }} placeholder="Optional: add detail, e.g. '28g bar', 'small bowl', 'half eaten', 'brand'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #f59e0b", borderRadius: 8, fontSize: 10 }} /></div>
                  {!noFood(portionResult) && portionResult.matchesPlanned === false && portionPlanned && <div data-testid="snap-update-to" style={{ fontSize: 11, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Update to {portionResult.name || "this food"}</div>}
                  <div data-testid="snap-actions" style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                    <button onClick={async function() { await confirmPortion(); if (picker && picker.snap) setPicker(null); }} disabled={noFood(portionResult)} style={Object.assign({}, btnActionLg, snapBtn, noFood(portionResult) ? { opacity: 0.45, cursor: "not-allowed" } : {})}>Confirm</button>
                    <button onClick={recheckPortion} style={Object.assign({}, btnMuted, snapBtn)}>↻ Re-check</button>
                    <button onClick={function() { cancelPortion(); if (picker && picker.snap) setPicker(Object.assign({}, picker, { snap: false })); }} style={Object.assign({ background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, cursor: "pointer" }, snapBtn)}>Cancel</button>
                  </div>
                </div>)}
              </div>); };
          /* ═══ v2.50.0 (Architect night batch 24 Nov, PART 2): ONE wide box per row (✎ filled / + empty) that opens the picker;
             the picker has a sticky action bar — Snap · ♥ Favourites · Add New · Edit Item · Remove; picking an item asks to
             confirm it (with the quantity on a day); Confirm fills the row and, on a category's last row, adds ONE blank row. ═══ */
          var ROW_LABEL = { b: "breakfast", l: "lunch", d: "dinner", ds: "dessert", dr: "drink", o: "snack" };
          var rowPrefix = function(slot) { var m = /^(ds|dr|dp|dv|o|b|l|d)/.exec(slot || ""); return m ? m[1] : ""; };
          /* the slot keys of a category, in order (as the rows are laid out): day ds/dr are ds1–ds5, snacks o1–o20; defaults use "ds", "ds2"… */
          var rowKeys = function(prefix, mode) {
            var out = [], numbered = prefix === "o" || (mode === "day" && (prefix === "ds" || prefix === "dr"));
            var max = prefix === "o" ? 20 : mode === "day" && (prefix === "ds" || prefix === "dr") ? 5 : 10;
            for (var i = 1; i <= max; i++) out.push(numbered ? prefix + i : (i === 1 ? prefix : prefix + i));
            return out;
          };
          var rowVal = function(row, k) { return row.mode === "defaults" ? (defs[k] || "") : getMeal(row.day, k); };
          var isFilled = function(v) { return !!v && v !== "__empty__" && v !== "__placeholder__"; };
          var blankVal = function(row) { return row.mode === "defaults" ? "__placeholder__" : "__empty__"; };
          /* Several slots at once (one save, so nothing races); a packaged dinner gets its default sides, as setMeal does. */
          var putMeals = function(dayKey, patch) {
            var n = Object.assign({}, meals); n[dayKey] = Object.assign({}, n[dayKey] || {});
            Object.keys(patch).forEach(function(slot) {
              var val = patch[slot]; if (val === "") delete n[dayKey][slot]; else n[dayKey][slot] = val;
              if (/^d\d*$/.test(slot) && !/^d[pvsrc]/.test(slot)) {
                var sIdx = slot === "d" ? "" : slot.replace("d", "");
                if (val && isPackagedDinner(val)) { if (!n[dayKey]["dp" + sIdx]) n[dayKey]["dp" + sIdx] = "baby_potatoes"; if (!n[dayKey]["dv" + sIdx]) n[dayKey]["dv" + sIdx] = "garden_salad"; }
              }
            });
            setMeals(n); return saveMeals(n);
          };
          var putDefs = function(patch) {
            var nd = Object.assign({}, mealDefaults); nd[activeTab] = Object.assign({}, nd[activeTab] || {});
            Object.keys(patch).forEach(function(k) { if (patch[k] === "") delete nd[activeTab][k]; else nd[activeTab][k] = patch[k]; });
            setMealDefaults(nd); sSet("meal_defaults", JSON.stringify(nd));
          };
          /* Confirm a pick: it fills (or replaces) the row; on the category's last row ONE blank row follows. */
          var confirmPick = async function(row, item, qty) {
            var keys = rowKeys(rowPrefix(row.slot), row.mode), i = keys.indexOf(row.slot), patch = {};
            patch[row.slot] = item.id;
            var later = keys.slice(i + 1).some(function(k) { return !!rowVal(row, k); });
            if (!later && i >= 0 && i + 1 < keys.length) patch[keys[i + 1]] = blankVal(row);
            var undo = {}; Object.keys(patch).forEach(function(k) { undo[k] = rowVal(row, k) || ""; });   // for Undo
            if (row.mode === "defaults") { putDefs(patch); return undo; }
            await putMeals(row.day, patch);
            var q = parseFloat(qty); if (q && q !== 1 && setFactorNow) await setFactorNow(row.day, row.slot, q);
            return undo;
          };
          /* Remove: a filled row loses its item AND its row (the rows below move up); the category's only row is cleared. */
          var removeRow = function(row) {
            if (!isFilled(rowVal(row, row.slot))) return;
            var prefix = rowPrefix(row.slot), keys = rowKeys(prefix, row.mode), patch = {};
            var keep = keys.filter(function(k) { return k !== row.slot && !!rowVal(row, k); });
            var side = function(k, s) { return s + (k === "d" ? "" : k.replace("d", "")); };   // dinner sides move with their dinner
            keys.forEach(function(k, j) {
              var from = keep[j], v = from ? rowVal(row, from) : "";
              var want = v || (j === 0 && /^[bld]$/.test(prefix) && row.mode !== "defaults" ? "__empty__" : "");   // the only row: back to "Add …"
              if (rowVal(row, k) !== want) patch[k] = want;
              if (prefix === "d" && row.mode !== "defaults") { ["dp", "dv"].forEach(function(s) { var fv = from ? (getMeal(row.day, side(from, s)) || "") : ""; if ((getMeal(row.day, side(k, s)) || "") !== fv) patch[side(k, s)] = fv; }); }
            });
            if (row.mode === "defaults") putDefs(patch); else putMeals(row.day, patch);
          };
          var editRow = function(row) {
            var v = rowVal(row, row.slot); if (!isFilled(v)) return;
            if (row.mode === "defaults") {
              var it = allItemsLookup[v]; if (!it || it._isCustom === false) return;
              setManageListsOpen(true); setItemOpen(null); setEditingItem(it.id); setEditDraft(Object.assign({}, it, { originalIngredients: (it.ingredients || []).join(", "), recalculated: false })); setFormMsg("");
              setTimeout(function() { var el = document.querySelector('[data-item-id="' + it.id + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: "center" }); }, 120);
              return;
            }
            setSlotOpen({ day: row.day, slot: row.slot, first: /^[bld]$/.test(row.slot), editing: false, msg: "" });   // as Open did: the meal's form, Edit from there
          };
          /* v2.51.0 (night batch P3a): totals, recommended and +/- values — one decimal (whole kcal); no float artefacts */
          var f1 = function(v) { var n = Number(v); return isFinite(n) ? Math.round(n * 10) / 10 : 0; };
          var fk = function(v) { var n = Number(v); return isFinite(n) ? Math.round(n) : 0; };
          var sgn = function(v, dp) { var r = dp ? f1(v) : fk(v); return (r > 0 ? "+" : "") + r; };
          var MealSelect = function(props) {
            useFavs();
            var items = props.items; var value = props.value; var onChange = props.onChange; var row = props.row || null;
            var placeholder = props.placeholder || "Select...";
            /* the open picker's state lives in the section (this component is re-created on every render) */
            var pk = row ? row.mode + ":" + (row.day || "") + ":" + row.slot : (props.pickerKey || "x:" + placeholder);
            var ps = picker && picker.key === pk ? picker : null, open = !!ps;
            var upd = function(patch) { setPicker(function(cur) { return cur && cur.key === pk ? Object.assign({}, cur, patch) : cur; }); };
            var search = ps ? ps.search : "", favOnly = !!(ps && ps.favOnly), pending = ps ? ps.pending : null, qty = ps ? ps.qty : "1";
            var setSearch = function(v) { upd({ search: v }); }, setFavOnly = function(v) { upd({ favOnly: v }); }, setPending = function(v) { upd({ pending: v }); }, setQty = function(v) { upd({ qty: v }); };
            var setOpen = function(on) { setPicker(on ? { key: pk, search: "", favOnly: false, pending: null, qty: "1" } : null); };
            var sorted = items.slice().sort(function(a,b) { return a.name.localeCompare(b.name); });
            var pool = favOnly ? sorted.filter(function(it) { return isFav(it.id); }) : sorted;
            var filtered = search ? fuzzyFind(search, pool, function(it) { return it.name || ""; }, 200) : pool;   /* v2.20.0: forgiving search, as in Update Lists */
            var flash = !!value && !!pickFlash && (pickFlash === value || !!(allItemsLookup[value] && allItemsLookup[value].parentId === pickFlash));
            var close = function() { setOpen(false); };
            var choose = function(item) {
              if (row) { upd({ pending: item, qty: "1" }); return; }   // v2.50.0: confirm first
              var prev = value; onChange({ target: { value: item.id } }); close(); setPickFlash(item.id); setPickToast({ text: "Added: " + item.name, undo: function() { onChange({ target: { value: prev || "" } }); } }); try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) { /* no haptics */ }
            };
            var confirm = async function() {
              var item = pending; close();
              var u = await confirmPick(row, item, row.mode === "defaults" ? 1 : qty);
              setPickFlash(item.id); setPickToast({ text: "Added: " + item.name, undo: function() { if (row.mode === "defaults") putDefs(u); else putMeals(row.day, u); } }); try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) { /* no haptics */ }
            };
            var selected = value ? items.find(function(it) { return it.id === value; }) : null;
            var filled = !!value && value !== "__empty__" && value !== "__placeholder__";
            var displayName = filled ? selectionName(value, props.snap, selected || allItemsLookup[value] || allItemsLookup["gb_" + value]) : null; // D6: never the raw id
            var inputRef = React.useRef(null);
            var readVV = function() { var v = typeof window !== "undefined" && window.visualViewport; return v ? { top: v.offsetTop, height: v.height } : { top: 0, height: typeof window !== "undefined" ? window.innerHeight : 600 }; };
            var _vv = React.useState(readVV); var vv = _vv[0]; var setVV = _vv[1];
            React.useEffect(function() {
              if (!open || !window.visualViewport) return;
              var onVV = function() { setVV(readVV()); };
              onVV(); window.visualViewport.addEventListener("resize", onVV); window.visualViewport.addEventListener("scroll", onVV);
              return function() { window.visualViewport.removeEventListener("resize", onVV); window.visualViewport.removeEventListener("scroll", onVV); };
            }, [open, setVV]);
            var it0 = filled ? (selected || allItemsLookup[value]) : null;
            var ragWarn = row && row.mode !== "defaults" && filled ? checkRagFrequency(value, row.day, row.slot) : null;
            var ragChg = it0 && it0._ragChanged && !it0._ragChangedSeen && ratingsShown();
            if (!open) {
              var rc = !displayName ? "#475569" : !it0 || !it0.rating ? "#0f172a" : ratingColor(it0.rating);   /* D14 */
              return (<button type="button" data-testid="picker-trigger" data-flash={flash ? "true" : "false"} aria-label={(displayName || placeholder) + (filled ? " — tap to change" : " — tap to add")}
                onClick={function(){ setOpen(true); }}
                style={{width:"100%",minHeight:36,padding:"8px 10px",border:"1px solid #cbd5e1",borderRadius:8,fontSize:11,background:flash ? "#dcfce7" : "#fff",transition:"background 0.3s",cursor:"pointer",boxSizing:"border-box",display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,textAlign:"left",color:"#0f172a",margin:0}}>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{isFav(value) || (it0 && it0.parentId && isFav(it0.parentId)) ? <span aria-hidden="true" style={{ color: "#dc2626" }}>♥ </span> : null}<span data-testid="selected-item" data-rag={it0 && it0.rating && ratingsShown() ? it0.rating : ""} title={it0 && it0.ragReason ? it0.ragReason : ""} style={{ color: rc, fontWeight: it0 && it0._child ? 600 : 400 }}>{displayName || placeholder}</span>{it0 && it0.rating && displayName ? <RagCue rating={it0.rating} reason={it0.ragReason} /> : null}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  {ragChg && <span title={"Rating changed: " + (it0.prevRating || "?") + " → " + it0.rating} style={{ fontSize: 12 }}>🔄</span>}
                  {ragWarn && <span title={ragWarn} style={{ fontSize: 12 }}>⚠️</span>}
                  <span data-testid="row-icon" aria-hidden="true" style={{ display: "inline-flex", width: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: 11, background: filled ? "#eff6ff" : "#f1f5f9", color: "#1e3a5f", fontSize: 12, fontWeight: 700 }}>{filled ? "✎" : "+"}</span>
                </span>
              </button>);
            }
            var act = function(icon, label, testid, onClick, opts) { opts = opts || {}; return <button type="button" data-testid={testid} aria-label={label} aria-pressed={opts.pressed} disabled={opts.disabled} title={opts.title} onClick={onClick}
              style={{ flex: "1 1 0", minWidth: 0, minHeight: 44, padding: "4px 2px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, border: "1px solid " + (opts.pressed ? "#dc2626" : "#cbd5e1"), borderRadius: 8, background: opts.pressed ? "#fee2e2" : "#fff", color: opts.disabled ? "#94a3b8" : opts.danger ? "#b91c1c" : "#1e3a5f", cursor: opts.disabled ? "not-allowed" : "pointer" }}>
                <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1, color: opts.heart ? "#dc2626" : undefined }}>{icon}</span><span style={{ fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span></button>; };
            var catName = row ? ROW_LABEL[rowPrefix(row.slot)] || "item" : "item";
            var bar = row ? (<div data-testid="picker-actions" style={{ display: "flex", gap: 4, padding: "8px 12px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              {row.mode !== "defaults" && act("📷", "Snap", "act-snap", function() { setPicker(Object.assign({}, ps, { snap: true, pending: null })); openSnap(row.slot); })}
              {act(favOnly ? "♥" : "♡", "Favourites", "act-fav", function() { setFavOnly(!favOnly); }, { pressed: favOnly, heart: true })}
              {act("+", "Add New", "act-add", function() { close(); onChange({ target: { value: "__add_new__", searchText: search } }); })}
              {act("✎", "Edit Item", "act-edit", function() { close(); editRow(row); }, { disabled: !filled || (row.mode === "defaults" && !(it0 && it0._isCustom !== false)), title: !filled ? "Nothing to edit yet" : "" })}
              {act("🗑", "Remove", "act-remove", function() { close(); removeRow(row); }, { danger: true })}
            </div>) : null;
            var rowsEl = (<>
                {filtered.map(function(item) { var kcal = isJC ? item.jcKcal : item.beckKcal; var isAdded = item._isCustom !== false; var color = isAdded ? (ratingColor(item.rating)) : "#94a3b8"; var hasRagChange = item._ragChanged && !item._ragChangedSeen && ratingsShown(); var _cur = value && allItemsLookup[value]; var isCur = item.id === value || !!(_cur && _cur.parentId && _cur.parentId === item.id); return (<div key={item.id} data-testid="picker-row" aria-selected={isCur} role="option" onMouseDown={function(e){e.preventDefault();choose(item);}} style={{boxSizing:"border-box",padding:"6px 14px",minHeight:44,fontSize:14,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #f1f5f9",background:isCur ? "#eff6ff" : undefined,borderLeft:isCur ? "4px solid #2563eb" : undefined,color:color}}>
                  <span>{isFav(item.id) && <span data-testid="fav-heart" aria-label="Favourite" style={{ color: "#dc2626" }}>♥ </span>}{hasRagChange ? "🔄 " : ""}{item.name} ({kcal} kcal){!isAdded ? " — not added" : ""}{item.checkMe && <span data-testid="check-me" title={item.checkReason || "Added by bulk upload: open and save it once you have checked it"} style={{ marginLeft: 4, fontSize: 9, fontWeight: 600, color: "#475569", border: "1px solid #cbd5e1", borderRadius: 4, padding: "0 4px", whiteSpace: "nowrap" }}>Check me</span>}{hasRagChange ? " (was " + item.prevRating + ")" : ""}</span>
                </div>); })}
                {favOnly && !filtered.length && <div data-testid="fav-none" style={{ padding: "10px 14px", fontSize: 13, color: "#475569" }}>No favourites here yet. Tick ♥ Favourite when you save or edit an item in Update Eating Lists.</div>}
                <div onMouseDown={function(e){e.preventDefault();close();onChange({target:{value:"__add_new__", searchText: search}});}} style={{padding:"6px 14px",minHeight:44,display:"flex",alignItems:"center",boxSizing:"border-box",fontSize:14,fontWeight:600,color:accent,cursor:"pointer",borderTop:"1px solid #e2e8f0"}}>+ Not in my list?</div>
            </>);
            var kcalOf = function(it) { return Number((isJC ? it.jcKcal : it.beckKcal) || it.kcal || 0); };
            var confirmEl = pending ? (<div data-testid="pick-confirm-form" style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{pending.name}</div>
              <div style={{ fontSize: 12, color: "#475569", margin: "2px 0 10px" }}>{kcalOf(pending)} kcal per portion{pending.servingDesc ? " · " + pending.servingDesc : ""}</div>
              {row.mode !== "defaults" && (<div>
                <label htmlFor="pick-qty" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>How many portions? (e.g. 3 biscuits = 3)</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <input id="pick-qty" type="number" inputMode="decimal" min="0.25" step="0.25" value={qty} onChange={function(e) { setQty(e.target.value); }} style={{ width: 80, padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 16 }} />
                  {["0.5", "1", "1.5", "2", "3"].map(function(f) { return <button key={f} type="button" aria-pressed={qty === f} onClick={function() { setQty(f); }} style={{ minWidth: 40, minHeight: 36, borderRadius: 8, border: "1px solid " + (qty === f ? "#1e3a5f" : "#cbd5e1"), background: qty === f ? "#eff6ff" : "#fff", fontSize: 13, fontWeight: 600, color: "#1e3a5f", cursor: "pointer" }}>{f === "0.5" ? "½" : f === "1.5" ? "1½" : f}</button>; })}
                </div>
                <div data-testid="pick-total" style={{ fontSize: 12, color: "#0f172a", marginTop: 6 }}>Total: {Math.round(kcalOf(pending) * (parseFloat(qty) || 0))} kcal</div>
              </div>)}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="button" data-testid="pick-confirm" onClick={confirm} style={Object.assign({}, btnP(true), { flex: 1 })}>Confirm</button>
                <button type="button" onClick={function() { setPending(null); }} style={Object.assign({}, btnS, { flex: 1 })}>Back to the list</button>
              </div>
            </div>) : null;
            /* D16 + v2.50.0: a sheet sized to the VISIBLE viewport (the keyboard never covers the list), on every screen size */
            return (<div role="dialog" aria-label={row ? "Choose a " + catName : "Choose an item"} data-testid="picker-sheet" style={{position:"fixed",left:0,right:0,top:vv.top,height:vv.height,zIndex:95,background:"rgba(15,23,42,0.35)",display:"flex",justifyContent:"center"}}>
              <div style={{ width: "100%", maxWidth: 560, background: "#fff", display: "flex", flexDirection: "column", boxShadow: "0 -4px 24px rgba(0,0,0,0.2)" }}>
                <div style={{position:"sticky",top:0,zIndex:1,background:"#fff"}}>
                  <div style={{display:"flex",gap:6,padding:"10px 12px 6px",alignItems:"center"}}>
                    <b style={{ flex: 1, fontSize: 14, color: "#0f172a" }}>{row ? (filled ? "Change " : "Add ") + catName : "Choose an item"}</b>
                    <button aria-label="Close the list" onClick={close} style={{minWidth:44,minHeight:40,padding:"8px 12px",background:"#fff",border:"1px solid #2563eb",borderRadius:8,fontSize:13,fontWeight:700,color:"#1e3a8a",cursor:"pointer"}}>✕ Close</button>
                  </div>
                  {bar}
                  {!pending && !(ps && ps.snap) && <div style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}><input ref={inputRef} autoFocus={!(window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches)} value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="Type to search..." aria-label="Search items" style={{width:"100%",padding:"10px 12px",border:"1px solid "+accent,borderRadius:8,fontSize:16,background:"#fff",boxSizing:"border-box"}} /></div>}
                </div>
                {ps && ps.snap && portionSlot === row.slot ? <div data-testid="picker-snap" style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>{renderSnapPanel()}</div> : pending ? confirmEl : <div data-testid="picker-results" role="listbox" aria-label="Items" style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>{rowsEl}</div>}
              </div>
            </div>);
          };

          return (<div>
          {/* Week header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button onClick={function() { setWeekOff(function(o) { return o - 1; }); }} style={{ background: "#e2e8f0", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>&lsaquo;</button>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800 }}>Week {Math.floor((weekStart - new Date(2026, 6, 19)) / (7*24*60*60*1000)) + 1}</div><div style={{ fontSize: 10, color: "#475569" }}>{weekLabel}</div></div>
            <button onClick={function() { setWeekOff(function(o) { return o + 1; }); }} style={{ background: "#e2e8f0", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>&rsaquo;</button>
          </div>

          {/* Update My List + Recalculate RAG + Clear Week */}
          <div style={{ display: "flex", gap: 8, marginBottom: 0, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={function(){ setManageListsOpen(!manageListsOpen); }} style={Object.assign({}, manageListsOpen ? btnClose : btnAction)}>{manageListsOpen ? "✕ Close" : "Update Eating Lists"}</button>
            <button onClick={reRateAll} disabled={!!listJob} style={Object.assign({}, btnMuted, { fontSize: 10, padding: "4px 10px", opacity: listJob ? 0.6 : 1 })}>{listJob === "rerate" ? "⏳ Re-rating…" : "🔄 Re-rate all lists"}</button>
            <button onClick={recheckNutrition} disabled={!!listJob} style={Object.assign({}, btnMuted, { fontSize: 10, padding: "4px 10px", opacity: listJob ? 0.6 : 1 })}>{listJob === "recheck" ? "⏳ Re-checking…" : "🔎 Re-check nutrition"}</button>
            <button onClick={clearWeek} style={Object.assign({}, btnClear, { marginLeft: "auto" })}>Clear Week</button>
          </div>

          {/* RAG recalculation notification banner */}
          {ragRecalcMsg && (<div role="status" aria-live="polite" style={{ background: ragRecalcMsg.startsWith("✅") ? "#f0fdf4" : ragRecalcMsg.startsWith("Error") ? "#fef2f2" : "#eff6ff", border: "1px solid " + (ragRecalcMsg.startsWith("✅") ? "#86efac" : ragRecalcMsg.startsWith("Error") ? "#fecaca" : "#93c5fd"), borderRadius: 8, padding: "8px 12px", marginTop: 8, fontSize: 11, color: ragRecalcMsg.startsWith("✅") ? "#166534" : ragRecalcMsg.startsWith("Error") ? "#b91c1c" : "#1e40af", display: "flex", alignItems: "center", gap: 8 }}>
            {ragRecalcLoading && <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #93c5fd", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />}
            <span>{ragRecalcMsg}</span>
            {!ragRecalcLoading && <button aria-label="Dismiss" onClick={function(){ setRagRecalcMsg(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#475569", marginLeft: "auto", padding: 0 }}>✕</button>}
          </div>)}

          {/* My Eating Lists — collapsible */}
          {manageListsOpen && (<div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: 14, marginTop: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>🍽️ My Eating Lists<RatingsHint /></div>
            <UpdateLists key={ownSeed ? ownSeed.k : 0} seed={ownSeed ? ownSeed.text : ""} initialTurns={ownSeed ? ownSeed.turns : null} tab={ulTab} setTab={setUlTab} cats={CATS} catalogue={CATALOGUE} available={CATALOGUE} ownItems={OWN_ITEMS} lookup={_listLookup} isJC={isJC} returnTo={returnTo} onAddNow={addNowToSlot} onBackToSlot={backToSlot} slotFor={slotFor} accentLight={accentLight} accentBorder={accentBorder} />
            {bulkHelp.length > 0 && (<div data-testid="bulk-help" style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: 8, marginBottom: 8, fontSize: 12, color: "#0f172a" }}>
              <b>{bulkHelp.length} {bulkHelp.length === 1 ? "line needs" : "lines need"} a little more from you</b> — your Companion couldn't tell what or how much:
              {bulkHelp.map(function(h, i) { return (<div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}><span style={{ flex: 1 }}>“{h.line}”</span>
                <button type="button" style={btnOpen} onClick={function() { setBulkHelp(bulkHelp.filter(function(x, j) { return j !== i; })); toOwnItem("", [{ role: "user", text: h.line }, { role: "assistant", text: h.question }]); }}>Finish with my Companion</button></div>); })}
            </div>)}
              {[{k:"breakfast",label:"Breakfasts",items:allBfast,customs:customBreakfasts,setCustoms:setCustomBreakfasts,storageKey:"custom_breakfasts"},
                {k:"lunch",label:"Lunches",items:allLunch,customs:customLunches,setCustoms:setCustomLunches,storageKey:"custom_lunches"},
                {k:"dinner",label:"Dinners",items:allDinners,customs:customMeals,setCustoms:setCustomMeals,storageKey:"custom_meals"},
                {k:"snack",label:"Snacks",items:allOther,customs:customSnacks,setCustoms:setCustomSnacks,storageKey:"custom_snacks"},
                {k:"dessert",label:"Desserts",items:allDesserts,customs:customDesserts,setCustoms:setCustomDesserts,storageKey:"custom_desserts"},
                {k:"drink",label:"Drinks",items:allDrinks,customs:customDrinks,setCustoms:setCustomDrinks,storageKey:"custom_drinks"}
              ].map(function(cat) {
                return (<div key={cat.k} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>{cat.label} ({cat.customs.length} item{cat.customs.length !== 1 ? "s" : ""})</div>
                  {cat.customs.slice().sort(function(a,b) { return a.name.localeCompare(b.name); }).map(function(item) {
                    var kcal = isJC ? item.jcKcal : item.beckKcal;
                    var color = ratingColor(item.rating);
                    var hasRagChange = item._ragChanged && !item._ragChangedSeen && ratingsShown();
                    return (<div key={item.id}><div data-testid="list-row" data-item-id={item.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid #f1f5f9", fontSize: 11 }}>
                      <span style={{ flex: 1, color: color }}>{hasRagChange && <span onClick={function(){alert("Rating changed from " + (item.prevRating || "?") + " to " + item.rating + (item.ragReason ? ".\n\nReason: " + item.ragReason : "") + "\n\nBased on your current health profile and dietary guidelines.");var u=cat.customs.map(function(x){return x.id===item.id?Object.assign({},x,{_ragChangedSeen:true}):x;});cat.setCustoms(u);sSet(cat.storageKey,JSON.stringify(u));}} style={{cursor:"pointer"}} title={"Changed from " + (item.prevRating || "?")}>🔄 </span>}{item.name} ({kcal} kcal){item.checkMe && <span data-testid="check-me" title={item.checkReason || "Added by bulk upload: open and save it once you have checked it"} style={{ marginLeft: 4, fontSize: 9, fontWeight: 600, color: "#475569", border: "1px solid #cbd5e1", borderRadius: 4, padding: "0 4px", whiteSpace: "nowrap" }}>Check me</span>}</span>
                      <button aria-label={"Open " + item.name} onClick={function() { setEditingItem(null); setEditDraft(null); setItemOpen(itemOpen === item.id ? null : item.id); setFormMsg(""); }} style={btnOpen}>Open</button>
                    </div>
                    {itemOpen === item.id && renderItemView(item, cat)}
                    {mealEdit === item.id && (<MealBuilder initial={item} available={CATALOGUE} ownItems={OWN_ITEMS.filter(function(x) { return x.id !== item.id; })} lookup={_listLookup} isJC={isJC} cats={CATS}
                      onCancel={function() { setMealEdit(null); }}
                      onSaveEdit={async function(updated) { var rated = withRuleRating(Object.assign({}, updated, { id: item.id })); var u = cat.customs.map(function(x) { return x.id === item.id ? rated : x; }); cat.setCustoms(u); await sSet(cat.storageKey, JSON.stringify(u)); setMealEdit(null); setFormMsg("✅ Updated " + rated.name); setTimeout(function(){ setFormMsg(""); }, 3000); }} />)}
                    {editingItem === item.id && editDraft && editDraft.id === item.id && (<OpenForm testid="item-open-form" title={item.name} subtitle="Editing the list item. Past meals keep their own copy." editing={true} hideActions={true}>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: "#475569", marginBottom: 2 }}>Name</div>
                        <input id={"edit-item-name-" + item.id} defaultValue={editDraft.name} style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11, boxSizing: "border-box" }} />
                      </div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 10, flexWrap: "wrap" }}>
                        <span><b>{isJC ? editDraft.jcKcal : editDraft.beckKcal}</b> kcal</span>
                        <span><b>{editDraft.protein || 0}g</b> prot</span>
                        <span><b>{editDraft.fat || 0}g</b> fat</span>
                        {editDraft.satFat > 0 && <span><b>{editDraft.satFat}g</b> s/fat</span>}
                        {editDraft.carbs > 0 && <span><b>{editDraft.carbs}g</b> carbs</span>}
                        {editDraft.fibre > 0 && <span><b>{editDraft.fibre}g</b> fibre</span>}
                      </div>
                      <div style={{ marginBottom: 8 }}><div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: ratingBg(editDraft.rating), color: ratingColor(editDraft.rating), border: "1px solid " + (ratingBorder(editDraft.rating)) }}>{ratingLabel(editDraft.rating)}</div></div>
                      {editDraft.suitability && <div style={{ fontSize: 10, color: "#475569", fontStyle: "italic", lineHeight: 1.4, marginBottom: 8 }}>{editDraft.suitability}</div>}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Type</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {[{k:"packaged",l:"📦 Packaged"},{k:"ingredient",l:"🍳 Ingredient Prepared"}].map(function(t) { var on = (editDraft.itemType || "packaged") === t.k; return (<button key={t.k} onClick={function() { setEditDraft(function(prev) { return Object.assign({}, prev, { itemType: t.k }); }); }} style={{ flex: 1, padding: "6px 8px", border: "1px solid " + (on ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: on ? "#eff6ff" : "#fff", color: on ? "#1e3a5f" : "#475569" }}>{t.l}</button>); })}
                        </div>
                      </div>
                      {editDraft.itemType === "ingredient" && (<div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: "#475569", marginBottom: 4 }}>🧾 Ingredients <span style={{ fontWeight: 400 }}>(edit to match your recipe)</span></div>
                        <textarea id={"edit-item-ingredients-" + item.id} readOnly={!planAllows("editNutrition")} aria-readonly={!planAllows("editNutrition")} defaultValue={(editDraft.ingredients || []).join(", ")} style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 10, minHeight: 50, resize: "vertical", boxSizing: "border-box", lineHeight: 1.4 }} placeholder="e.g. oats (85g), almond milk (300ml)..." />
                        {planAllows("editNutrition") ? <div style={{ fontSize: 8, color: "#475569", marginTop: 3, fontStyle: "italic" }}>Any changes to ingredients or portions will update nutritional values when confirmed</div> : <GatePrompt feature="editNutrition" style={{ marginTop: 6 }} />}   {/* v2.22.0 Bronze: values come from stored data only */}
                      </div>)}
                      {editClarify && (<div data-testid="edit-clarify"><div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>Your ingredients changed — your Companion will work out the values per portion. Check the text, then Send.</div>
                        <ClarifyChat seed={editClarify} onResult={function(it) { var cur = editDraft; var ing = (cur.ingredients || []).join(", "); var upd = withRuleRating(withPortionValues(Object.assign({}, cur, { servings: it.servings, portion: it.portion, originalIngredients: ing, recalculated: true, portionCheck: false }), itemNutrition(it))); setEditDraft(upd); setEditClarify(null); setFormMsg("✅ Nutritional values updated per portion: " + upd.kcal + " kcal (" + portionLabel(upd) + "). Press Save to keep them."); }} /></div>)}
                      <label data-testid="edit-fav" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, margin: "0 0 8px", color: "#0f172a" }}><input type="checkbox" checked={isFav(item.id)} onChange={function(e) { setFav(item.id, e.target.checked); }} /><span><span aria-hidden="true" style={{ color: "#dc2626" }}>♥</span> Favourite</span></label>   {/* v2.50.0 (P2f) */}
                      {formMsg && <div role="status" aria-live="polite" style={{ padding: 8, borderRadius: 6, marginBottom: 8, fontSize: 11, fontWeight: 600, lineHeight: 1.4, background: formMsg.indexOf("✅") === 0 ? "#dcfce7" : formMsg.indexOf("🔄") === 0 ? "#e0f2fe" : "#fee2e2", color: formMsg.indexOf("✅") === 0 ? "#166534" : formMsg.indexOf("🔄") === 0 ? "#0c4a6e" : "#991b1b" }}>{formMsg}</div>}
                      <div style={{ display: "flex", gap: 6 }}>
                        <button disabled={formMsg.indexOf("🔄") === 0} onClick={function() { saveEditItem(cat); }} style={{...btnActionLg, flex: 1, borderRadius: 6, opacity: formMsg.indexOf("🔄") === 0 ? 0.5 : 1}}>{formMsg.indexOf("🔄") === 0 ? "Recalculating…" : editDraft.recalculated ? "✓ Continue — Save" : "✓ Confirm"}</button>
                        <button onClick={function() { if (editDraft.recalculated) { setEditDraft(function(prev) { return Object.assign({}, prev, { recalculated: false }); }); } else { setEditingItem(null); setEditDraft(null); setItemOpen(editDraft.id); } setFormMsg(""); }} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, cursor: "pointer" }}>{editDraft.recalculated ? "Edit Again" : "Cancel"}</button>
                      </div>
                    </OpenForm>)}
                    </div>);
                  })}
                  {cat.customs.length === 0 && <div style={{ fontSize: 10, color: "#475569", padding: 4 }}>No custom items yet</div>}
                </div>);
              })}

              {/* Single add item section for manage lists */}
              <button onClick={function(){ openAddForm("", "manage"); }} style={{...btnMuted, marginTop: 4}}>📷 Photo or bulk paste</button>
              {addingNew && (addingSource === "top" || addingSource === "manage") && (<div id="add-item-form-manage" style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 6, marginBottom: 8, border: "1px solid #bfdbfe", overflow: "hidden" }}>
                <div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Item</span></div>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. Costa Rocky Road, Protein shake..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11, boxSizing: "border-box" }} />
                  <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>
                    📷
                    <input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} />
                  </label>
                  <button onClick={function() { if (bulkReviewItems) { cancelBulk(); } else { setBulkCat(""); setBulkRun(null); setBulkReviewItems("paste"); } }} style={{ padding: "6px 8px", background: bulkReviewItems === "paste" ? "#dbeafe" : "#f0f9ff", border: "1px solid " + (bulkReviewItems === "paste" ? "#2563eb" : "#bae6fd"), borderRadius: 6, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, color: "#1e3a5f", fontWeight: 600 }} title="Paste multiple items to bulk add">📋 Bulk</button>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={function() { setOffResults([]); addNewItem(); }} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? <span>Adding <LoadingDots /></span> : "Add"}</button>
                  <button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button>
                </div>
                <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish. Select a result below or click Add for AI lookup.</div>
                {(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                  {offLoading && <div style={{ padding: "8px 10px", fontSize: 10, color: "#475569" }}>🔍 Searching Open Food Facts...</div>}
                  {offResults.map(function(prod, pi) {
                    var ragColor = ratingColor(calcRAG(prod));
                    return (<div key={pi} onClick={function() {
                      var rating = calcRAG(prod);
                      var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : [];
                      setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "From Open Food Facts (UK) · " + (prod.servingSize || "per portion"), category: addingCategory, per100: prod.per100, portion: prod.portion, addedSugar: prod.addedSugar || 0 });   /* v2.19.0: values per portion */
                      setReviewCategories(addingCategory ? [addingCategory] : []);
                      setOffResults([]); setOffSearchTerm(""); setNewItemName("");
                    }} style={{ padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }} onMouseOver={function(e){e.currentTarget.style.background="#f0f9ff";}} onMouseOut={function(e){e.currentTarget.style.background="#fff";}}>
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span>
                      <span style={{ display: "flex", gap: 6, flexShrink: 0, color: "#475569" }}>
                        <span><b>{prod.kcal}</b>kcal</span>
                        <span><b>{prod.protein}g</b>prot</span>
                        {ratingsShown() && <span style={{ color: ragColor, fontWeight: 700 }}>{calcRAG(prod)}</span>}
                      </span>
                    </div>);
                  })}
                  {offResults.length > 0 && <div style={{ padding: "4px 10px", fontSize: 8, color: "#475569", textAlign: "center" }}>Data from Open Food Facts · Open Database License</div>}
                </div>)}
              </div>)}

              {/* Single review form — shown once after add */}
              {cameraPreview && cameraPreview.noFood && (<div style={{ background: "#fff", borderRadius: 8, padding: 10, marginTop: 6, border: "1px solid #fde68a" }}><NoFoodPanel testid="review-no-food" desc={cameraPreview.desc} busy={newItemLoading} onRecheck={function(d) { window._lcRecheckAddPhoto(d); }} onCancel={function() { setCameraPreview(null); setReviewCategories([]); setReviewSideType(""); }} /></div>)}
              {cameraPreview && !cameraPreview.noFood && (<div style={{ background: "#f0fdf4", borderRadius: 8, padding: 10, marginTop: 6, border: "1px solid #86efac" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Review Item</div>
                  <button aria-label="Close photo review" onClick={function() { setCameraPreview(null); setReviewCategories([]); setReviewSideType(""); }} style={{...btnClose, fontSize: 14, padding: "4px 8px"}}>✕</button>
                </div>
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "#475569", marginBottom: 2 }}>Name</div>
                  <input id="review-item-name" defaultValue={cameraPreview.name} style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11, boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 10, flexWrap: "wrap" }}>
                  <span data-testid="review-portion" style={{ flexBasis: "100%", color: "#475569" }}>{portionLabel(cameraPreview)} · values per portion</span>
                  <span><b>{cameraPreview.kcal}</b> kcal</span>
                  <span><b>{cameraPreview.protein}g</b> prot</span>
                  <span><b>{cameraPreview.fat}g</b> fat</span>
                  {cameraPreview.satFat > 0 && <span><b>{cameraPreview.satFat}g</b> s/fat</span>}
                  {cameraPreview.carbs > 0 && <span><b>{cameraPreview.carbs}g</b> carbs</span>}
                  {cameraPreview.fibre > 0 && <span><b>{cameraPreview.fibre}g</b> fibre</span>}
                </div>
                <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: ratingBg(cameraPreview.rating), color: ratingColor(cameraPreview.rating), border: "1px solid " + (ratingBorder(cameraPreview.rating)) }}>{ratingLabel(cameraPreview.rating)}</div>
                </div>
                {cameraPreview.suitability && <div style={{ fontSize: 10, color: "#475569", fontStyle: "italic", lineHeight: 1.4, marginBottom: 8 }}>{cameraPreview.suitability}</div>}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Type</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={function() { setCameraPreview(function(prev) { return Object.assign({}, prev, { itemType: "packaged" }); }); }} style={{ flex: 1, padding: "6px 8px", border: "1px solid " + (cameraPreview.itemType === "packaged" ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: cameraPreview.itemType === "packaged" ? "#eff6ff" : "#fff", color: cameraPreview.itemType === "packaged" ? "#1e3a5f" : "#475569" }}>📦 Packaged</button>
                    <button onClick={function() { setCameraPreview(function(prev) { return Object.assign({}, prev, { itemType: "ingredient" }); }); }} style={{ flex: 1, padding: "6px 8px", border: "1px solid " + (cameraPreview.itemType === "ingredient" ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: cameraPreview.itemType === "ingredient" ? "#eff6ff" : "#fff", color: cameraPreview.itemType === "ingredient" ? "#1e3a5f" : "#475569" }}>🍳 Ingredient Prepared</button>
                  </div>
                </div>
                {cameraPreview.itemType === "ingredient" && (<div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "#475569", marginBottom: 4 }}>🧾 Ingredients <span style={{ fontWeight: 400 }}>(edit to match your recipe)</span></div>
                  <textarea id="review-item-ingredients" defaultValue={(cameraPreview.ingredients || []).join(", ")} style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 10, minHeight: 50, resize: "vertical", boxSizing: "border-box", lineHeight: 1.4 }} placeholder="e.g. oats, milk, chia seeds, honey..." />
                  <div style={{ fontSize: 8, color: "#475569", marginTop: 3, fontStyle: "italic" }}>Any changes to ingredients or portions will update nutritional values when confirmed</div>
                </div>)}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Add to categories</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {["breakfast","lunch","dinner","snack","dessert","drink"].map(function(c) {
                      var sel = reviewCategories.indexOf(c) >= 0;
                      return (<button key={c} onClick={function() { setReviewCategories(function(prev) { return sel ? prev.filter(function(x){return x!==c;}) : prev.concat([c]); }); }} style={{ padding: "5px 10px", border: "1px solid " + (sel ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: sel ? "#eff6ff" : "#fff", color: sel ? "#1e3a5f" : "#475569", textTransform: "capitalize" }}>{sel ? "✓ " : ""}{c}</button>);
                    })}
                  </div>
                </div>
                {reviewCategories.indexOf("dinner") >= 0 && (<div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Is this a dinner side dish?</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {[{k:"",label:"No — main dish"},{k:"potato",label:"🥔 Potato side"},{k:"veg",label:"🥦 Veg side"},{k:"salad",label:"🥗 Salad side"}].map(function(st) {
                      var sel = reviewSideType === st.k;
                      return (<button key={st.k} onClick={function() { setReviewSideType(st.k); }} style={{ padding: "5px 8px", border: "1px solid " + (sel ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: sel ? "#eff6ff" : "#fff", color: sel ? "#1e3a5f" : "#475569" }}>{st.label}</button>);
                    })}
                  </div>
                </div>)}
                {formMsg && <div role="status" aria-live="polite" style={{ padding: 8, borderRadius: 6, marginBottom: 8, fontSize: 11, fontWeight: 600, lineHeight: 1.4, background: formMsg.indexOf("✅") === 0 ? "#dcfce7" : formMsg.indexOf("🔄") === 0 ? "#e0f2fe" : "#fee2e2", color: formMsg.indexOf("✅") === 0 ? "#166534" : formMsg.indexOf("🔄") === 0 ? "#0c4a6e" : "#991b1b" }}>{formMsg}</div>}
                <div style={{ display: "flex", gap: 6 }}>
                  <button disabled={reviewCategories.length === 0 || formMsg.indexOf("🔄") === 0} onClick={function() { window._confirmReviewItem(false); }} style={{...btnActionLg, flex: 1, borderRadius: 6, opacity: (reviewCategories.length === 0 || formMsg.indexOf("🔄") === 0) ? 0.5 : 1}}>{formMsg.indexOf("🔄") === 0 ? "Recalculating…" : cameraPreview.recalculated ? "✓ Continue — Add" : "✓ Confirm" + (reviewCategories.length > 1 ? " (" + reviewCategories.length + " lists)" : "")}</button>
                  <button onClick={function() { if (cameraPreview.recalculated) { setCameraPreview(function(prev) { return Object.assign({}, prev, { recalculated: false }); }); setFormMsg(""); } else { setCameraPreview(null); setReviewCategories([]); setReviewSideType(""); setAddingSlotKey(null); setAddingSlotDay(null); setFormMsg(""); } }} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, cursor: "pointer" }}>{cameraPreview.recalculated ? "Edit Again" : "Cancel"}</button>
                </div>
              </div>)}

              {/* Bulk paste add */}
              {bulkReviewItems === "paste" && (<div style={{ background: "#fffbeb", borderRadius: 8, padding: 12, marginTop: 10, border: "1px solid #fcd34d" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>📋 Bulk Add Items</div>
                  <button aria-label="Close bulk add" onClick={cancelBulk} style={{...btnClose, fontSize: 14, padding: "4px 8px"}}>✕</button>
                </div>
                <div style={{ fontSize: 10, color: "#92400e", background: "#fef3c7", padding: 8, borderRadius: 6, marginBottom: 8, lineHeight: 1.4 }}>Paste your list of items below (one per line or comma-separated). Items will be added automatically with AI-calculated nutrition. You can edit any item afterwards for accuracy.</div>
                <div style={{ fontSize: 10, color: "#92400e", marginBottom: 6 }}>Long lists are rated {BULK_BATCH} at a time; each finished batch is saved straight away.</div>
                {bulkRun && newItemLoading && <div role="progressbar" aria-valuemin={0} aria-valuemax={bulkRun.total} aria-valuenow={bulkRun.done} data-testid="bulk-progress" style={{ height: 6, background: "#fde68a", borderRadius: 3, marginBottom: 8, overflow: "hidden" }}><div style={{ width: Math.round(100 * bulkRun.done / Math.max(1, bulkRun.total)) + "%", height: "100%", background: "#d97706" }} /></div>}
                <textarea id="bulk-paste-textarea" placeholder={"e.g.\nOvernight oats\nGreek yogurt\nChicken wrap\nProtein shake"} style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11, minHeight: 80, resize: "vertical", boxSizing: "border-box", lineHeight: 1.5, marginBottom: 8 }} />
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Add to category</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {["breakfast","lunch","dinner","snack","dessert","drink"].map(function(c) {
                      var sel = bulkCat === c;
                      return (<button key={c} disabled={newItemLoading} onClick={function() { setBulkCat(c); }} style={{ padding: "5px 10px", border: "1px solid " + (sel ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: sel ? "#eff6ff" : "#fff", color: sel ? "#1e3a5f" : "#475569", textTransform: "capitalize" }}>{sel ? "✓ " : ""}{c}</button>);
                    })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button disabled={!bulkCat || newItemLoading} onClick={function() { bulkPasteAdd(bulkCat); }} style={{...btnActionLg, flex: 1, borderRadius: 6, opacity: !bulkCat ? 0.5 : 1}}>{newItemLoading ? <span>Uploading <LoadingDots /></span> : !bulkCat ? "Choose a category first" : "Upload Items"}</button>
                  {bulkRun && bulkRun.failed && bulkRun.failed.length > 0 && !newItemLoading && <button onClick={function() { bulkPasteAdd(bulkRun.cat, bulkRun.failed); }} style={{...btnActionLg, borderRadius: 6}}>Retry {bulkRun.failed.length}</button>}
                  <button onClick={cancelBulk} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>)}
          </div>)}

          {!manageListsOpen && <div style={{ height: 10 }} />}

          {/* Defaults panel */}
          

          {/* Day tabs */}
          <div style={{ display: "flex", gap: 0, background: accentMid, borderRadius: "8px 8px 0 0", padding: 2, marginBottom: 0 }}>
            <button key="week" onClick={function(){setEatDay("week"); setEatDayEyeOpen(false); setEatDayChartOpen(false); setEatWeekEyeOpen(false); setCopyDayOpen(false); setCopyWeekOpen(false);}} style={{flex:1,padding:"6px 2px",border:"none",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer",background:eatDay==="week"?"#fff":"transparent",color:eatDay==="week"?"#0f172a":"rgba(255,255,255,0.9)",lineHeight:1.2}}>Week</button>
            {DAYS.map(function(d) {
              var dk = getDayKcal(d);
              return (<button key={d} onClick={function() { setEatDay(d); setEatDayEyeOpen(false); setEatDayChartOpen(false); setEatWeekEyeOpen(false); setCopyDayOpen(false); setCopyWeekOpen(false); }} style={{ flex: 1, padding: "6px 2px", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: eatDay === d ? "#fff" : "transparent", color: eatDay === d ? "#0f172a" : "rgba(255,255,255,0.9)", lineHeight: 1.2 }}><div>{DAY_LABELS[d]}</div>{dk > 0 && <div style={{ fontSize: 8, color: dk > (isJC ? 2200 : 1900) ? "#b91c1c" : "#15803d" }}>{dk}</div>}</button>);
            })}
          </div>

                    
          

          <style>{".lc-head-title{flex:1 1 auto;min-width:0}@media (max-width:480px){.lc-head-title{flex-basis:100%}}"}</style>   {/* v2.51.0 (P3b): on a phone the buttons get their own line */}
          {eatDay === "week" && (<div style={{ background: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #e2e8f0", borderTop: "none", padding: 12 }}>
            <div data-testid="week-head" className="lc-head" style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}><span role="heading" aria-level={2} className="lc-head-title" style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", minWidth: 0, flexShrink: 1 }}>My Week</span><div style={{ display: "flex", gap: 4, flexShrink: 0 }}><button onClick={function(){ setCopyWeekOpen(!copyWeekOpen); setCopyWeekTargets({}); }} style={Object.assign({}, copyWeekOpen ? btnClose : btnAction)}>{copyWeekOpen ? "✕" : <span>📋 Copy Week</span>}</button><button onClick={function(){ if (!eatWeekEyeOpen) setWeekSumOpen(true); setEatWeekEyeOpen(!eatWeekEyeOpen); }} aria-label={(eatWeekEyeOpen ? "Close " : "") + "Week full breakdown"} aria-expanded={!!eatWeekEyeOpen} style={eatWeekEyeOpen ? btnFilledOn : btnProgress}>{eatWeekEyeOpen ? "✕ Full Breakdown" : "👁 Full Breakdown"}</button></div></div>

            {/* v2.18.0: the same Planned | Actual figures for the week, one row per day */}
            <WeekSummary data={data} who={activeTab} dates={DAYS.map(function(d) { return dateOf(weekStart, d); })} doc={weekChildren} open={weekSumOpen} setOpen={setWeekSumOpen} />   {/* v2.53.0 (night batch 25 Nov P2) */}
            {copyWeekOpen && (<div style={{ background: accentLight, borderRadius: 8, padding: 10, marginBottom: 10, border: "1px solid " + accentBorder }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Copy this week's day selections to:</div>
              <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 8 }}>
                {(function() {
                  var weeks = [];
                  var todayNow = new Date(); todayNow.setHours(0,0,0,0);
                  var currentWeekOff = Math.floor((todayNow - baseStart) / (7*24*60*60*1000));
                  var startOff = currentWeekOff + 1;
                  for (var wi = startOff; wi <= startOff + 12; wi++) {
                    if (wi === weekOff) continue;
                    var ws = new Date(baseStart); ws.setDate(ws.getDate() + (wi * 7));
                    var wd = getWeekDates(ws);
                    var label = fmtDate(wd[0]) + " – " + fmtDate(wd[6]);
                    weeks.push({ off: wi, label: label });
                  }
                  return weeks.map(function(w) {
                    return (<label key={w.off} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer", padding: "6px 8px", background: copyWeekTargets[w.off] ? "#dbeafe" : (w.off % 2 === 0 ? "#fff" : "#f8fafc"), border: "1px solid " + (copyWeekTargets[w.off] ? "#1e3a5f" : "transparent"), borderRadius: 4, marginBottom: 2 }}>
                      <input type="checkbox" checked={!!copyWeekTargets[w.off]} onChange={function(){ var o = w.off; setCopyWeekTargets(function(prev){ var n = Object.assign({}, prev); n[o] = !n[o]; return n; }); }} style={{ margin: 0 }} />
                      <span style={{ color: "#0f172a" }}>{w.label}</span>
                    </label>);
                  });
                })()}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={async function() {
                  var targets = Object.keys(copyWeekTargets).filter(function(k){ return copyWeekTargets[k]; }).map(Number);
                  if (targets.length === 0) { setFormMsg("Select at least one week to copy to"); setTimeout(function(){setFormMsg("");},3000); return; }
                  var dayData = {};
                  DAYS.forEach(function(d) { if (meals[d]) dayData[d] = JSON.parse(JSON.stringify(meals[d])); });
                  if (Object.keys(dayData).length === 0) { setFormMsg("Nothing to copy — no day selections this week"); setTimeout(function(){setFormMsg("");},3000); return; }
                  setSaving(true);
                  for (var ti = 0; ti < targets.length; ti++) {
                    var tws = new Date(baseStart); tws.setDate(tws.getDate() + (targets[ti] * 7));
                    await editWeekChildren(activeTab, tws, function(existMeals) { DAYS.forEach(function(d) { if (dayData[d]) existMeals[d] = JSON.parse(JSON.stringify(dayData[d])); }); }, "copy", weekChildren.children);
                  }
                  setSaving(false);
                  setCopyWeekOpen(false); setCopyWeekTargets({});
                  setFormMsg("✓ Copied week to " + targets.length + " week" + (targets.length > 1 ? "s" : ""));
                  setTimeout(function(){setFormMsg("");},3000);
                }} style={{ flex: 1, padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Apply</button>
                <button onClick={function(){ setCopyWeekOpen(false); setCopyWeekTargets({}); }} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>)}

            {eatWeekEyeOpen && (<div style={{ background: accentLight, borderRadius: 8, padding: 12, marginBottom: 10, border: "1px solid " + accentBorder }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>Week — Nutrition Overview (g)</span>
                <button aria-label="Close week view" onClick={function(){setEatWeekEyeOpen(false);}} style={{ padding: "2px 8px", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", border: "none", borderRadius: 4, fontSize: 12, color: "#fff", cursor: "pointer", lineHeight: 1 }}>✕</button>
              </div>
              {(function() {
                var isJC = activeTab === "jc";
                var kf = isJC ? "jcKcal" : "beckKcal";
                var pf = isJC ? "jcProt" : "beckProt";
                var ff = isJC ? "jcFat" : "beckFat";
                var _wg2 = DAYS.map(function(d) { return goalKcal(data && data[activeTab], dateOf(weekStart, d), weekChildren); }).filter(function(x) { return x != null; }); var limKcal = _wg2.length ? Math.round(_wg2.reduce(function(a, b) { return a + b; }, 0) / _wg2.length) : Infinity; // v2.18.0: the person's goal (average day)
                var limProt = isJC ? 130 : 110;
                var limSfat = 20;
                var limCarbs = isJC ? 300 : 260;
                var limFib = isJC ? 35 : 30;
                var limSalt = 6;
                var cats = [
                  { label: "Breakfast", prefix: "b", items: allBfast, multi: true },
                  { label: "Lunch", prefix: "l", items: allLunch, multi: true },
                  { label: "Dinner", prefix: "d", items: allDinners, multi: true },
                  { label: "🥔 Sides", prefix: "dp", items: POTATO_SIDES, multi: true },
                  { label: "🥗 Sides", prefix: "dv", items: VEG_SIDES, multi: true },
                  { label: "Desserts", prefix: "ds", items: allDesserts, multi: false },
                  { label: "Drinks", prefix: "dr", items: allDrinks, multi: false },
                  { label: "Snacks", prefix: "o", items: allOther, multi: false }
                ];
                var weekTotalConsumed = 0;
                var weekProtConsumed = 0;
                var weekSfatConsumed = 0;
                var weekCarbsConsumed = 0;
                var weekFibConsumed = 0;
                var weekSaltConsumed = 0;
                var catSections = cats.map(function(cat) {
                  var catWeekKcal = 0; var catWeekProt = 0; var catWeekSfat = 0; var catWeekCarbs = 0; var catWeekFib = 0; var catWeekSalt = 0;
                  var dayRows = DAYS.map(function(day) {
                    var dayKcal = 0; var dayProt = 0; var daySfat = 0; var dayCarbs = 0; var dayFib = 0; var daySalt = 0;
                    for (var si = 1; si <= 10; si++) {
                      var sk = cat.multi ? (si === 1 ? cat.prefix : cat.prefix + si) : cat.prefix + si;
                      var val = getMeal(day, sk);
                      if (!val || val === "__empty__") continue;
                      var found = cat.items.find(function(it) { return it.id === val; });
                      if (!found) continue;
                      var kcal = found[kf] || 0;
                      var prot = found[pf] || found.protein || 0;
                      var sfat = found.satFat || 0;
                      var carbs = found.carbs || 0;
                      var fibre = found.fibre || 0;
                      var salt = found.salt || 0;
                      dayKcal += kcal; dayProt += prot; daySfat += sfat; dayCarbs += carbs; dayFib += fibre; daySalt += salt;
                    }
                    catWeekKcal += dayKcal; catWeekProt += dayProt; catWeekSfat += daySfat; catWeekCarbs += dayCarbs; catWeekFib += dayFib; catWeekSalt += daySalt;
                    return { day: day, kcal: dayKcal, prot: dayProt, sfat: daySfat, carbs: dayCarbs, fib: dayFib, salt: daySalt };
                  });
                  return { label: cat.label, dayRows: dayRows, weekKcal: catWeekKcal, weekProt: catWeekProt, weekSfat: catWeekSfat, weekCarbs: catWeekCarbs, weekFib: catWeekFib, weekSalt: catWeekSalt };
                });
                var dayGrandTotals = DAYS.map(function(day, di) {
                  var tKcal = 0; var tProt = 0; var tSfat = 0; var tCarbs = 0; var tFib = 0; var tSalt = 0;
                  catSections.forEach(function(cs) {
                    var dr = cs.dayRows[di];
                    tKcal += dr.kcal; tProt += dr.prot; tSfat += dr.sfat; tCarbs += dr.carbs; tFib += dr.fib; tSalt += dr.salt;
                  });
                  weekTotalConsumed += tKcal; weekProtConsumed += tProt; weekSfatConsumed += tSfat; weekCarbsConsumed += tCarbs; weekFibConsumed += tFib; weekSaltConsumed += tSalt;
                  var inRange = 0;
                  if (tKcal <= limKcal) inRange++;
                  if (tProt >= (isJC ? 110 : 90)) inRange++;
                  if (tSfat <= 20) inRange++;
                  if (tCarbs <= limCarbs) inRange++;
                  if (tFib >= (isJC ? 30 : 25)) inRange++;
                  if (tSalt <= 6) inRange++;
                  var ragColor = inRange >= 5 ? "#15803d" : inRange >= 3 ? "#b45309" : "#b91c1c";
                  return { day: day, kcal: tKcal, prot: tProt, sfat: tSfat, carbs: tCarbs, fib: tFib, salt: tSalt, conKcal: tKcal, conProt: tProt, conSfat: tSfat, conCarbs: tCarbs, conFib: tFib, conSalt: tSalt, ragColor: ragColor, inRange: inRange };
                });
                return (<div>
                  <div style={{ overflowX: "auto", width: "100%", boxSizing: "border-box" }}><table data-testid="nutrition-table" style={{ width: "100%", fontSize: 10, borderCollapse: "collapse", tableLayout: "auto", whiteSpace: "nowrap" }}>
                    <colgroup><col style={{ width: "30%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "8%" }} /><col style={{ width: "8%" }} /><col style={{ width: "14%" }} /></colgroup>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                        <th style={{ padding: "4px 2px", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Day</th>
                        <th style={{ padding: "4px 2px", color: "#475569", textAlign: "right" }}>kcal</th>
                        <th style={{ padding: "4px 2px", color: "#475569", textAlign: "right" }}>prot</th>
                        <th style={{ padding: "4px 2px", color: "#475569", textAlign: "right" }}>s/fat</th>
                        <th style={{ padding: "4px 2px", color: "#475569", textAlign: "right" }}>carbs</th>
                        <th style={{ padding: "4px 2px", color: "#475569", textAlign: "right" }}>fib</th>
                        <th style={{ padding: "4px 2px", color: "#475569", textAlign: "right" }}>salt</th>
                        <th style={{ padding: "4px 2px", color: "#475569", textAlign: "center" }}>Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catSections.map(function(cs) {
                        var hasData = cs.dayRows.some(function(dr) { return dr.kcal > 0; });
                        if (!hasData) return null;
                        return (<React.Fragment key={cs.label}>
                          <tr><td colSpan={8} style={{ padding: "6px 2px 2px", fontWeight: 700, color: "#0f172a", fontSize: 11 }}>{cs.label}</td></tr>
                          {cs.dayRows.map(function(dr) {
                            if (dr.kcal === 0 && dr.prot === 0) return null;
                            return (<tr key={dr.day} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "3px 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dr.day.charAt(0).toUpperCase() + dr.day.slice(1, 3)}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{fk(dr.kcal)}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(dr.prot) || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(dr.sfat) || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(dr.carbs) || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(dr.fib) || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(dr.salt) || "-"}</td>
                              <td></td>
                            </tr>);
                          })}
                          <tr style={{ borderBottom: "1px solid #cbd5e1" }}><td style={{ padding: "3px 2px", fontWeight: 600, fontSize: 9, color: "#475569" }}>{cs.label} total</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{fk(cs.weekKcal)}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{f1(cs.weekProt) || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{f1(cs.weekSfat) || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{f1(cs.weekCarbs) || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{f1(cs.weekFib) || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{f1(cs.weekSalt) || "-"}</td><td></td></tr>
                        </React.Fragment>);
                      })}
                      <tr><td colSpan={8} style={{ padding: "8px 2px 2px", fontWeight: 700, color: "#0f172a", fontSize: 11 }}>Daily Totals</td></tr>
                      {dayGrandTotals.map(function(dg) {
                        if (dg.kcal === 0 && dg.conKcal === 0) return null;
                        return (<tr key={dg.day} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "3px 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", marginRight: 4, background: ratingsShown() ? dg.ragColor : "#cbd5e1", verticalAlign: "middle" }}></span>{dg.day.charAt(0).toUpperCase() + dg.day.slice(1, 3)}</td>
                          <td style={{ padding: "3px 2px", textAlign: "right" }}>{fk(dg.kcal)}</td>
                          <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(dg.prot) || "-"}</td>
                          <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(dg.sfat) || "-"}</td>
                          <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(dg.carbs) || "-"}</td>
                          <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(dg.fib) || "-"}</td>
                          <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(dg.salt) || "-"}</td>
                          <td style={{ padding: "3px 2px", textAlign: "center", fontSize: 9 }}>{dg.inRange}/6</td>
                        </tr>);
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#e0f2fe", borderTop: "2px solid #0f172a" }}>
                        <td style={{ padding: "4px 2px", fontWeight: 700, fontSize: 11, color: "#0c4a6e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Total</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: weekTotalConsumed > limKcal * 7 ? "#b91c1c" : "#0c4a6e" }}>{fk(weekTotalConsumed)}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: weekProtConsumed < (isJC ? 110 : 90) * 7 ? "#b91c1c" : "#0c4a6e" }}>{f1(weekProtConsumed) || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: weekSfatConsumed > 20 * 7 ? "#b91c1c" : "#0c4a6e" }}>{f1(weekSfatConsumed) || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: weekCarbsConsumed > limCarbs * 7 ? "#b91c1c" : "#0c4a6e" }}>{f1(weekCarbsConsumed) || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: weekFibConsumed < (isJC ? 30 : 25) * 7 ? "#b91c1c" : "#0c4a6e" }}>{f1(weekFibConsumed) || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: weekSaltConsumed > 6 * 7 ? "#b91c1c" : "#0c4a6e" }}>{f1(weekSaltConsumed) || "-"}</td>
                        <td></td>
                      </tr>
                      <tr style={{ background: "#f1f5f9" }}>
                        <td style={{ padding: "4px 2px", fontWeight: 700, fontSize: 10, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Recommended</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{fk(limKcal * 7)}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{f1(limProt * 7)}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{f1(limSfat * 7)}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{f1(limCarbs * 7)}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{f1(limFib * 7)}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{f1(limSalt * 7)}</td>
                        <td></td>
                      </tr>
                      {(function() {
                        var wLimKcal = limKcal * 7; var wLimProt = limProt * 7; var wLimSfat = limSfat * 7; var wLimCarbs = limCarbs * 7; var wLimFib = limFib * 7; var wLimSalt = limSalt * 7;
                        var dKcal = weekTotalConsumed - wLimKcal;
                        var dProt = weekProtConsumed - wLimProt;
                        var dSfat = weekSfatConsumed - wLimSfat;
                        var dCarbs = weekCarbsConsumed - wLimCarbs;
                        var dFib = weekFibConsumed - wLimFib;
                        var dSalt = weekSaltConsumed - wLimSalt;
                        return (<tr style={{ background: "#fafafa" }}>
                          <td style={{ padding: "4px 2px", fontWeight: 700, fontSize: 10, color: "#475569" }}>+/−</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: dKcal > 0 ? "#b91c1c" : "#0c4a6e" }}>{sgn(dKcal, 0)}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: dProt < 0 ? "#b91c1c" : "#0c4a6e" }}>{sgn(dProt, 1)}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: dSfat > 0 ? "#b91c1c" : "#0c4a6e" }}>{sgn(dSfat, 1)}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: dCarbs > 0 ? "#b91c1c" : "#0c4a6e" }}>{sgn(dCarbs, 1)}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: dFib < 0 ? "#b91c1c" : "#0c4a6e" }}>{sgn(dFib, 1)}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: dSalt > 0 ? "#b91c1c" : "#0c4a6e" }}>{sgn(dSalt, 1)}</td>
                          <td></td>
                        </tr>);
                      })()}
                    </tfoot>
                  </table></div>

                  {/* Weekly diverging bar chart */}
                  <div style={{ marginTop: 24, background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "10px 8px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8, paddingLeft: 4 }}>Weekly Percentage of Recommendations</div>
                    {(function() {
                      var wLimKcal = limKcal * 7; var wLimProt = limProt * 7; var wLimSfat = limSfat * 7; var wLimCarbs = limCarbs * 7; var wLimFib = limFib * 7; var wLimSalt = limSalt * 7;
                      var bars = [
                        { label: "Kcal", consumed: weekTotalConsumed, limit: wLimKcal, overIsBad: true },
                        { label: "Prot", consumed: weekProtConsumed, limit: wLimProt, overIsBad: false },
                        { label: "S/Fat", consumed: weekSfatConsumed, limit: wLimSfat, overIsBad: true },
                        { label: "Carbs", consumed: weekCarbsConsumed, limit: wLimCarbs, overIsBad: true },
                        { label: "Fibre", consumed: weekFibConsumed, limit: wLimFib, overIsBad: false },
                        { label: "Salt", consumed: weekSaltConsumed, limit: wLimSalt, overIsBad: true }
                      ];
                      var maxDev = 100;
                      return React.createElement("div", null,
                        React.createElement("div", { style: { position: "relative", marginBottom: 2, height: 12, marginLeft: 38, marginRight: 42 } },
                          React.createElement("span", { style: { position: "absolute", left: 0, fontSize: 8, color: "#475569" } }, "-" + maxDev + "%"),
                          React.createElement("span", { style: { position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: 8, color: "#475569", fontWeight: 600 } }, "Target"),
                          React.createElement("span", { style: { position: "absolute", right: 0, fontSize: 8, color: "#475569" } }, "+" + maxDev + "%")
                        ),
                        bars.map(function(b) {
                          var pct = b.limit > 0 ? Math.round((b.consumed / b.limit) * 100) : 0;
                          var dev = pct - 100;
                          var clampedDev = Math.max(-maxDev, Math.min(maxDev, dev));
                          var isBad = b.overIsBad ? dev > 0 : dev < 0;
                          var barColor = isBad ? "#dc2626" : "#16a34a";
                          var barWidthPct = (Math.abs(clampedDev) / maxDev) * 50;
                          var barStyle = {};
                          if (clampedDev < 0) {
                            barStyle = { position: "absolute", right: "50%", top: 0, bottom: 0, width: barWidthPct + "%", background: barColor, borderRadius: "4px 0 0 4px", transition: "width 0.3s, background 0.3s" };
                          } else if (clampedDev > 0) {
                            barStyle = { position: "absolute", left: "50%", top: 0, bottom: 0, width: barWidthPct + "%", background: barColor, borderRadius: "0 4px 4px 0", transition: "width 0.3s, background 0.3s" };
                          }
                          return React.createElement("div", { key: b.label, style: { display: "flex", alignItems: "center", marginBottom: 4 } },
                            React.createElement("span", { style: { fontSize: 9, fontWeight: 600, color: "#475569", width: 32, textAlign: "right", marginRight: 6 } }, b.label),
                            React.createElement("div", { style: { flex: 1, background: "#f1f5f9", borderRadius: 4, height: 14, position: "relative", overflow: "hidden" } },
                              clampedDev !== 0 && React.createElement("div", { style: barStyle }),
                              React.createElement("div", { style: { position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "#334155", zIndex: 1, transform: "translateX(-1px)" } })
                            ),
                            React.createElement("span", { style: { fontSize: 9, fontWeight: 600, color: dev === 0 ? "#15803d" : barColor, width: 42, textAlign: "right", marginLeft: 4 } }, (dev > 0 ? "+" : "") + dev + "%")
                          );
                        })
                      );
                    })()}
                  </div>
                </div>);
              })()}
            </div>)}

            <div style={{ marginBottom: 10, padding: 10, background: accentVariant(accent, 88), borderRadius: 8, border: "1px solid " + accentBorder }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>⏱ Quick Prep Days</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="number" value={quickPrepMins} onChange={function(e) { setQuickPrepMins(parseInt(e.target.value) || 20); }} style={{ width: 40, padding: "3px 6px", border: "1px solid " + accentBorder, borderRadius: 8, fontSize: 11, textAlign: "center", background: "#fff" }} />
                  <span style={{ fontSize: 10, color: "#475569" }}>mins</span>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(function(d2) {
                  return (<label key={d2} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#475569", cursor: "pointer" }}>
                    <input type="checkbox" id={"qp-" + d2 + "-" + activeTab} style={{ width: 14, height: 14 }} />
                    {d2}
                  </label>);
                })}
              </div>
              <div style={{ fontSize: 9, color: "#475569" }}>Ticked days will only get dinners within the {quickPrepMins} min prep limit when generating</div>
            </div>

            <div style={{ background: accentLight, borderRadius: 8, padding: 12, marginBottom: 10, border: "1px solid " + accentBorder }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Set Defaults</div>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 8 }}>Set default meals. Use "All" to apply to all people or "Individual" for just {personName(data, activeTab)}.</div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Breakfast</span>
                <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 4, padding: 1 }}>
                  <button onClick={function() { saveDef("b", defs["b"], "individual"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["b"] || "individual") === "individual" ? "#fff" : "transparent", color: (defScopes["b"] || "individual") === "individual" ? "#0f172a" : "#475569" }}>Individual</button>
                  <button onClick={function() { saveDef("b", defs["b"], "all"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["b"] || "individual") === "all" ? "#fff" : "transparent", color: (defScopes["b"] || "individual") === "all" ? "#0f172a" : "#475569" }}>All</button>
                </div>
              </div>
              {(function() { var slots = []; for (var si = 1; si <= 10; si++) { var sk = si === 1 ? "b" : "b" + si; if (defs[sk] || si <= 1) slots.push(si); } return slots; })().map(function(n) {
                var slotKey = n === 1 ? "b" : "b" + n;
                return (<div key={n} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <MealSelect row={{ mode: "defaults", slot: slotKey }} items={dispBfast} value={defs[slotKey] === "__placeholder__" ? "" : (defs[slotKey] || "")} onChange={function(e) { if (e.target.value === "__add_new__") { notInList("breakfast", "defaults", e.target.searchText, slotKey); } else { saveDef(slotKey, e.target.value, "individual"); } }} placeholder="Add breakfast…" />
                  </div>
                </div>);
              })}
              {addingNew && addingSource === "defaults" && addingCategory === "breakfast" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 4, border: "1px solid #bfdbfe" }}><div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Breakfast Item</span></div><div style={{ display: "flex", gap: 6, marginBottom: 6 }}><input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11 }} /><label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label></div><div style={{ display: "flex", gap: 6 }}><button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button><button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button></div><div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#475569" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = ratingColor(calcRAG(prod), "bright"); return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "Open Food Facts · " + (prod.servingSize || "per portion"), category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#475569", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P {ratingsShown() && <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span>}</span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#475569", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}</div>)}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Lunch</span>
                <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 4, padding: 1 }}>
                  <button onClick={function() { saveDef("l", defs["l"], "individual"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["l"] || "individual") === "individual" ? "#fff" : "transparent", color: (defScopes["l"] || "individual") === "individual" ? "#0f172a" : "#475569" }}>Individual</button>
                  <button onClick={function() { saveDef("l", defs["l"], "all"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["l"] || "individual") === "all" ? "#fff" : "transparent", color: (defScopes["l"] || "individual") === "all" ? "#0f172a" : "#475569" }}>All</button>
                </div>
              </div>
              {(function() { var slots = []; for (var si = 1; si <= 10; si++) { var sk = si === 1 ? "l" : "l" + si; if (defs[sk] || si <= 1) slots.push(si); } return slots; })().map(function(n) {
                var slotKey = n === 1 ? "l" : "l" + n;
                return (<div key={n} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <MealSelect row={{ mode: "defaults", slot: slotKey }} items={dispLunch} value={defs[slotKey] === "__placeholder__" ? "" : (defs[slotKey] || "")} onChange={function(e) { if (e.target.value === "__add_new__") { notInList("lunch", "defaults", e.target.searchText, slotKey); } else { saveDef(slotKey, e.target.value, "individual"); } }} placeholder="Add lunch…" />
                  </div>
                </div>);
              })}
              {addingNew && addingSource === "defaults" && addingCategory === "lunch" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 4, border: "1px solid #bfdbfe" }}><div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Lunch Item</span></div><div style={{ display: "flex", gap: 6, marginBottom: 6 }}><input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11 }} /><label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label></div><div style={{ display: "flex", gap: 6 }}><button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button><button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button></div><div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#475569" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = ratingColor(calcRAG(prod), "bright"); return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "Open Food Facts · " + (prod.servingSize || "per portion"), category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#475569", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P {ratingsShown() && <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span>}</span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#475569", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}</div>)}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Dinner</span>
                <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 4, padding: 1 }}>
                  <button onClick={function() { saveDef("d", defs["d"], "individual"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["d"] || "individual") === "individual" ? "#fff" : "transparent", color: (defScopes["d"] || "individual") === "individual" ? "#0f172a" : "#475569" }}>Individual</button>
                  <button onClick={function() { saveDef("d", defs["d"], "all"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["d"] || "individual") === "all" ? "#fff" : "transparent", color: (defScopes["d"] || "individual") === "all" ? "#0f172a" : "#475569" }}>All</button>
                </div>
              </div>
              {(function() { var slots = []; for (var si = 1; si <= 10; si++) { var sk = si === 1 ? "d" : "d" + si; if (defs[sk] || si <= 1) slots.push(si); } return slots; })().map(function(n) {
                var slotKey = n === 1 ? "d" : "d" + n;
                return (<div key={n} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <MealSelect row={{ mode: "defaults", slot: slotKey }} items={dispDinners} value={defs[slotKey] === "__placeholder__" ? "" : (defs[slotKey] || "")} onChange={function(e) { if (e.target.value === "__add_new__") { notInList("dinner", "defaults", e.target.searchText, slotKey); } else { saveDef(slotKey, e.target.value, "individual"); } }} placeholder="Add dinner…" />
                  </div>
                </div>);
              })}
              {addingNew && addingSource === "defaults" && addingCategory === "dinner" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 4, border: "1px solid #bfdbfe" }}><div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Dinner Item</span></div><div style={{ display: "flex", gap: 6, marginBottom: 6 }}><input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11 }} /><label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label></div><div style={{ display: "flex", gap: 6 }}><button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button><button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button></div><div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#475569" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = ratingColor(calcRAG(prod), "bright"); return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "Open Food Facts · " + (prod.servingSize || "per portion"), category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#475569", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P {ratingsShown() && <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span>}</span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#475569", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}</div>)}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Dessert</span>
                <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 4, padding: 1 }}>
                  <button onClick={function() { saveDef("ds", defs["ds"], "individual"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["ds"] || "individual") === "individual" ? "#fff" : "transparent", color: (defScopes["ds"] || "individual") === "individual" ? "#0f172a" : "#475569" }}>Individual</button>
                  <button onClick={function() { saveDef("ds", defs["ds"], "all"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["ds"] || "individual") === "all" ? "#fff" : "transparent", color: (defScopes["ds"] || "individual") === "all" ? "#0f172a" : "#475569" }}>All</button>
                </div>
              </div>
              {(function() { var slots = []; for (var si = 1; si <= 10; si++) { var sk = si === 1 ? "ds" : "ds" + si; if (defs[sk] || si <= 1) slots.push(si); } return slots; })().map(function(n) {
                var slotKey = n === 1 ? "ds" : "ds" + n;
                return (<div key={n} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <MealSelect row={{ mode: "defaults", slot: slotKey }} items={dispDesserts} value={defs[slotKey] === "__placeholder__" ? "" : (defs[slotKey] || "")} onChange={function(e) { if (e.target.value === "__add_new__") { notInList("dessert", "defaults", e.target.searchText, slotKey); } else { saveDef(slotKey, e.target.value, "individual"); } }} placeholder="Add dessert…" />
                  </div>
                </div>);
              })}
              {addingNew && addingSource === "defaults" && addingCategory === "dessert" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 4, border: "1px solid #bfdbfe" }}><div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Dessert Item</span></div><div style={{ display: "flex", gap: 6, marginBottom: 6 }}><input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11 }} /><label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label></div><div style={{ display: "flex", gap: 6 }}><button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button><button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button></div><div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#475569" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = ratingColor(calcRAG(prod), "bright"); return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "Open Food Facts · " + (prod.servingSize || "per portion"), category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#475569", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P {ratingsShown() && <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span>}</span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#475569", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}</div>)}
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Drink</span>
                <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 4, padding: 1 }}>
                  <button onClick={function() { saveDef("dr", defs["dr"], "individual"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["dr"] || "individual") === "individual" ? "#fff" : "transparent", color: (defScopes["dr"] || "individual") === "individual" ? "#0f172a" : "#475569" }}>Individual</button>
                  <button onClick={function() { saveDef("dr", defs["dr"], "all"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["dr"] || "individual") === "all" ? "#fff" : "transparent", color: (defScopes["dr"] || "individual") === "all" ? "#0f172a" : "#475569" }}>All</button>
                </div>
              </div>
              {(function() { var slots = []; for (var si = 1; si <= 10; si++) { var sk = si === 1 ? "dr" : "dr" + si; if (defs[sk] || si <= 1) slots.push(si); } return slots; })().map(function(n) {
                var slotKey = n === 1 ? "dr" : "dr" + n;
                return (<div key={n} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <MealSelect row={{ mode: "defaults", slot: slotKey }} items={dispDrinks} value={defs[slotKey] === "__placeholder__" ? "" : (defs[slotKey] || "")} onChange={function(e) { if (e.target.value === "__add_new__") { notInList("drink", "defaults", e.target.searchText, slotKey); } else { saveDef(slotKey, e.target.value, "individual"); } }} placeholder="Add drink…" />
                  </div>
                </div>);
              })}
              {addingNew && addingSource === "defaults" && addingCategory === "drink" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 4, border: "1px solid #bfdbfe" }}><div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Drink Item</span></div><div style={{ display: "flex", gap: 6, marginBottom: 6 }}><input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11 }} /><label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label></div><div style={{ display: "flex", gap: 6 }}><button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button><button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button></div><div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#475569" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = ratingColor(calcRAG(prod), "bright"); return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "Open Food Facts · " + (prod.servingSize || "per portion"), category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#475569", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P {ratingsShown() && <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span>}</span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#475569", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}</div>)}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Snacks</span>
                <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 4, padding: 1 }}>
                  <button onClick={function() { saveDef("o1", defs["o1"], "individual"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["o1"] || "individual") === "individual" ? "#fff" : "transparent", color: (defScopes["o1"] || "individual") === "individual" ? "#0f172a" : "#475569" }}>Individual</button>
                  <button onClick={function() { saveDef("o1", defs["o1"], "all"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["o1"] || "individual") === "all" ? "#fff" : "transparent", color: (defScopes["o1"] || "individual") === "all" ? "#0f172a" : "#475569" }}>All</button>
                </div>
              </div>
              {(function() { var slots = []; for (var si = 1; si <= 20; si++) { if (defs["o" + si] || si <= 1) slots.push(si); } return slots; })().map(function(n) {
                var slotKey = "o" + n;
                return (<div key={n} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <MealSelect row={{ mode: "defaults", slot: slotKey }} items={dispOther} value={defs[slotKey] === "__placeholder__" ? "" : (defs[slotKey] || "")} onChange={function(e) { if (e.target.value === "__add_new__") { notInList("snack", "defaults", e.target.searchText, slotKey); } else { saveDef(slotKey, e.target.value, "individual"); } }} placeholder="Add snack…" />
                  </div>
                </div>);
              })}
              {addingNew && addingSource === "defaults" && addingCategory === "snack" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 4, border: "1px solid #bfdbfe" }}><div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Snack Item</span></div><div style={{ display: "flex", gap: 6, marginBottom: 6 }}><input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11 }} /><label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label></div><div style={{ display: "flex", gap: 6 }}><button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button><button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button></div><div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#475569" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = ratingColor(calcRAG(prod), "bright"); return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "Open Food Facts · " + (prod.servingSize || "per portion"), category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#475569", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P {ratingsShown() && <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span>}</span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#475569", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}</div>)}
            </div>

            <button onClick={async function() {
            /* Only use custom items (user-added with RAG status) for meal generation */
            var genBf = customBreakfasts.filter(function(it) { return it.rating; });
            var genLu = customLunches.filter(function(it) { return it.rating; });
            var genDin = customMeals.filter(function(it) { return it.rating; });
            /* D9: a short list no longer stops the whole generator; an empty one leaves its slots empty (said in the summary) */
            /* Check items can logically fill 7 days following RAG rules:
               GREEN = every day, AMBER = max 1/week, RED = max 1/month.
               Need enough GREEN items to cover days not filled by AMBER/RED */
            var checkCanFill = function(items, label) {
              var greens = items.filter(function(it) { return it.rating === "GREAT" || it.rating === "GREEN"; }).length;
              var ambers = items.filter(function(it) { return it.rating === "AMBER"; }).length;
              var reds = items.filter(function(it) { return it.rating === "RED"; }).length;
              /* Worst case: 1 amber + 1 red = 2 non-green slots, need greens to cover remaining 5 */
              /* But greens can repeat, so even 1 green is enough if user is OK with repetition */
              /* Real constraint: if ALL items are amber/red, can't fill 7 days */
              var maxNonGreen = Math.min(ambers, 1) + Math.min(reds, 1); /* max usable non-green per week */
              var greenDays = 7 - maxNonGreen;
              if (greens === 0 && greenDays > 0) return label;
              return null;
            };
            /* D9: a slot whose list can't fill the week is left empty (and said so); only stop if none can */
            var _can = { b: genBf.length > 0 && !checkCanFill(genBf, "b"), l: genLu.length > 0 && !checkCanFill(genLu, "l"), d: genDin.length > 0 && !checkCanFill(genDin, "d") };
            if (!_can.b && !_can.l && !_can.d) {
              setFormMsg("Please use 'Update Eating Lists' to add your choice of food items. Once added, the food items will be colour coded for use by the meal generator and yourself.");
              setTimeout(function() { setFormMsg(""); }, 8000);
              return;
            }
            var planned = await applyDefaults(); /* D9: work from the plan WITH defaults, not the stale state */
            var _allowed = { b: _can.b ? genBf.map(function(x){return x.id;}) : [], l: _can.l ? genLu.map(function(x){return x.id;}) : [], d: _can.d ? genDin.filter(function(x){return x.id !== "none";}).map(function(x){return x.id;}) : [] };
            setGenerating(true); setFormMsg("Applying defaults and generating meals...");
            try {
              var prof = p.profile || {};
              var dinnerList = genDin.filter(function(d2) { return d2.id !== "none"; }).map(function(d2) { return d2.id + ":" + d2.name + "[" + (bandOf(d2)||"GREAT") + "](" + (isJC ? d2.jcKcal : d2.beckKcal) + "kcal," + (d2.time||30) + "min)"; }).join(";");
              var bfastList = genBf.map(function(b) { return b.id + ":" + b.name + "[" + (bandOf(b)||"GREAT") + "]"; }).join(";");
              var lunchList = genLu.map(function(l) { return l.id + ":" + l.name + "[" + (bandOf(l)||"GREAT") + "]"; }).join(";");
              /* Build past weeks history for RED monthly limit checking */
              var pastHistory = "";
              /* AMBER: already used this week — do not reuse */
              var weekIds = thisWeekIds();
              var uniq = function(arr) { return arr.filter(function(v, i, a) { return a.indexOf(v) === i; }); };
              var _wo = weekOcc(); /* v2.6.5: children's own RAG */
              var amberFull = uniq(_wo.filter(function(o) { return o.band === "AMBER"; }).map(function(o) { return o.food; })).filter(function(f) { return _wo.filter(function(o) { return o.food === f; }).length >= 3 && f.indexOf("adhoc:") !== 0; });
              if (amberFull.length > 0) { pastHistory += " AMBER items already used 3 times this week (DO NOT reuse — a few times a week): " + amberFull.join(",") + "."; }
              var redWeekUsed = uniq(_wo.filter(function(o) { return o.band === "RED-weekly" && o.food.indexOf("adhoc:") !== 0; }).map(function(o) { return o.food; }));
              if (redWeekUsed.length > 0) { pastHistory += " RED weekly-treat items already used this week (DO NOT reuse — weekly treat): " + redWeekUsed.join(",") + "."; }
              /* RED: used in past 4 weeks — do not reuse */
              if (pastWeeksMeals.length > 0) {
                var pastIds = pastMonthIds();
                var allRedIds = weekIds.concat(pastIds);
                var pastRedUsed = _wo.concat(pastOcc()).filter(function(o) { return o.band === "RED-monthly" && o.food.indexOf("adhoc:") !== 0; }).map(function(o) { return o.food; });
                if (pastRedUsed.length > 0) { pastHistory += " RED monthly-treat items used in past 4 weeks (DO NOT reuse — monthly treat): " + pastRedUsed.filter(function(v, i, a) { return a.indexOf(v) === i; }).join(",") + "."; }
              }
              var fmt = '{"monday":{"b":"id","l":"id","d":"id"},"tuesday":{"b":"id","l":"id","d":"id"},"wednesday":{"b":"id","l":"id","d":"id"},"thursday":{"b":"id","l":"id","d":"id"},"friday":{"b":"id","l":"id","d":"id"},"saturday":{"b":"id","l":"id","d":"id"},"sunday":{"b":"id","l":"id","d":"id"}}';
              var prompt = "Generate a week of meals for " + (prof.name || "user") + " (" + kcalTargetText(data && data[activeTab]) + "). Only fill EMPTY slots - keep existing selections. CRITICAL: You MUST ONLY use item IDs from the lists below - never invent new IDs. FREQUENCY RULES based on the rating in [brackets]: GREAT = any day, GOOD = daily, AMBER = a few times a week (max 3), RED-weekly = weekly treat (max once a week), RED-monthly = monthly treat (max once a month). Respect these limits strictly." + pastHistory + " Current: " + JSON.stringify(planned.meals, function(k, v) { if (k === "_snap" || k === "_notes") return undefined; var it = typeof v === "string" ? allItemsLookup[v] : null; return it && it._child ? (it.parentId || it.name) : v; }) + ". Breakfasts: " + (_can.b ? bfastList : "(none — leave breakfast slots empty)") + ". Lunches: " + (_can.l ? lunchList : "(none — leave lunch slots empty)") + ". Dinners: " + (_can.d ? dinnerList : "(none — leave dinner slots empty)") + ". Vary daily. Return ONLY JSON: " + fmt;
              prompt += "\n\n" + companionProfileCtx(data && data[activeTab]);   /* v2.48.0 (brief 24 Nov P3): goal + training style */
              var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-lc-feature": "mealGenerator", "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }) });
              var result = await resp.json(); var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
              var txt = ""; if (result.content) { for (var ci = 0; ci < result.content.length; ci++) { if (result.content[ci].text) txt += result.content[ci].text; } }
              if (txt) {
                var gen = JSON.parse(txt.replace(/```json|```/g, "").trim());
                var merged = mergeGenerated(planned, gen, _allowed); /* D9: only empty slots, only ids from that slot's list */
                var n = merged.meals;
                setMeals(n); saveMeals(n, "generator");
                var otherPeople2 = Object.keys(data).filter(function(k) { return k !== "config" && k !== activeTab; });
                for (var opi2 = 0; opi2 < otherPeople2.length; opi2++) {
                  var op2 = otherPeople2[opi2];
                  await editWeekChildren(op2, weekStart, function(opM2) { DAYS.forEach(function(d2) { if (gen[d2]) { if (!opM2[d2]) opM2[d2] = {}; if (gen[d2].d && !opM2[d2].d && _allowed.d.indexOf(gen[d2].d) >= 0) opM2[d2].d = gen[d2].d; } }); }, "generator");
                }
                setFormMsg("Week meals generated — " + generatorSummary(merged.src, _allowed));
              }
            } catch(e) { setFormMsg(window.aiErrorMsg(e)); }
            setTimeout(function() { setFormMsg(""); }, 10000); setGenerating(false);
          }} disabled={generating} style={{ width: "100%", padding: 12, marginTop: 12, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer", background: generating ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" }}>{generating ? <span>Generating, please wait <LoadingDots /></span> : "My Companion Meals Generator"}</button>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>Applies your default choices where stated and generates recommended breakfast, lunch, and dinner slots where left empty. These can be updated on individual days if required.</div>
            </div>

            {/* Weekly Eating Feedback */}
            <div style={{ marginTop: 14 }}>
              <button onClick={function(){ generateWeekEatFeedback(); }} disabled={eatFbLoading} style={{ width: "100%", padding: 12, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: eatFbLoading ? "not-allowed" : "pointer", opacity: eatFbLoading ? 0.7 : 1, background: eatFbLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", marginBottom: 6 }}>{eatFbLoading ? React.createElement("span", null, "Generating, please wait ", React.createElement(LoadingDots)) : "My Companion Week's Feedback"}</button>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>Reviews all planned and consumed meals across the week for patterns colour coded recommendations and nutritional trends.</div>
              {(eatFbResults[activeTab] || {})["week"] && <button onClick={function(){ setEatFbExpanded(!eatFbExpanded); }} style={{ width: "100%", padding: 6, background: "none", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, color: "#475569", cursor: "pointer", marginBottom: 6 }}>{eatFbExpanded ? "▲ Hide Feedback" : "▼ Show Feedback"}</button>}
              {eatFbExpanded && (eatFbResults[activeTab] || {})["week"] && (function() { var efb = eatFbResults[activeTab]["week"]; return React.createElement("div", { style: { marginBottom: 10 } },
                React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" } },
                  efb._when && React.createElement("div", { style: { padding: "6px 14px", background: "#f8fafc", fontSize: 10, color: "#475569", borderBottom: "1px solid #e2e8f0" } }, "Generated ", efb._when, " for ", isJC ? "JC" : "Becks", efb._phase ? React.createElement("span", { "data-testid": "eat-fb-phase", style: { marginLeft: 6, fontWeight: 700, color: "#1e3a5f" } }, "· " + (PHASE_LABEL[efb._phase] || efb._phase)) : null),
                  React.createElement("div", { style: { padding: "8px 14px", borderBottom: "1px solid #e2e8f0" } }, React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, React.createElement("span", { style: { fontSize: 14 } }, "🍽️"), React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: "#1e3a5f" } }, "Eating Companion Check-in — Weekly"))),
                  React.createElement("div", { style: { padding: "12px 14px", borderBottom: "1px solid #e2e8f0" } },
                    React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#0c4a6e" } }, "What went well this week"),
                    (efb.wins || []).map(function(w, i) { return React.createElement("div", { key: i, style: { fontSize: 12, color: "#334155", marginTop: 4 } }, "✓ ", w); })
                  ),
                  React.createElement("div", { style: { padding: "12px 14px", borderBottom: "1px solid #e2e8f0" } },
                    React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#92400e" } }, "Tweaks for next week"),
                    (efb.tweaks || []).map(function(t, i) { return React.createElement("div", { key: i, style: { fontSize: 12, color: "#334155", marginTop: 4 } }, "→ ", t); })
                  ),
                  React.createElement("div", { style: { padding: "12px 14px" } },
                    React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#1e40af" } }, "Weekly outlook"),
                    React.createElement("div", { style: { fontSize: 12, color: "#334155", marginTop: 4 } }, "★ ", efb.outlook)
                  ),
                ),
                renderThread(efb, "eatweek", activeTab, updateEatWeekFb, "week")
              ); })()}
            </div>

            {/* Shopping instruction */}
            <div style={{ textAlign: "center", padding: "10px 0 6px", fontSize: 11, color: "#475569", lineHeight: 1.4 }}>Go to <b>My Shop</b> once your week is planned to generate your shopping list.</div>

          </div>)}

          {/* Day content */}
          {eatDay !== "week" && <div style={{ background: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #e2e8f0", borderTop: "none", padding: 12 }}>
            <div data-testid="day-head" className="lc-head" style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 8, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 6 }}><span role="heading" aria-level={3} className="lc-head-title">{eatDay.charAt(0).toUpperCase() + eatDay.slice(1)}</span><div style={{ display: "flex", gap: 4 }}><button onClick={function(){ setCopyDayOpen(!copyDayOpen); setCopyDayTargets({}); }} style={Object.assign({},copyDayOpen?btnClose:btnAction)}>{copyDayOpen ? "✕ Close" : "📋 Copy Day"}</button><button onClick={function(){setEatDayEyeOpen(!eatDayEyeOpen);}} aria-label={(eatDayEyeOpen ? "Close " : "") + "Day full breakdown"} aria-expanded={!!eatDayEyeOpen} style={eatDayEyeOpen ? btnFilledOn : btnProgress}>{eatDayEyeOpen ? "✕ Full Breakdown" : "👁 Full Breakdown"}</button></div></div>
            <DaySummary data={data} who={activeTab} date={dateOf(weekStart, eatDay)} dates={DAYS.map(function(d) { return dateOf(weekStart, d); })} doc={weekChildren} dayKcal={getDayKcal(eatDay)} />   {/* v2.54.0 (night batch 25 Nov P3) */}

            {copyDayOpen && (<div style={{ background: accentLight, borderRadius: 8, padding: 10, marginBottom: 10, border: "1px solid " + accentBorder }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Copy {eatDay.charAt(0).toUpperCase() + eatDay.slice(1)}'s selections to:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {DAYS.filter(function(d){ return d !== eatDay; }).map(function(d) {
                  return (<label key={d} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer", padding: "4px 8px", background: copyDayTargets[d] ? "#dbeafe" : accentBtnLight, border: "1px solid " + (copyDayTargets[d] ? "#1e3a5f" : accentBtnBorder), borderRadius: 6 }}>
                    <input type="checkbox" checked={!!copyDayTargets[d]} onChange={function(){ setCopyDayTargets(function(prev){ var n = Object.assign({}, prev); n[d] = !n[d]; return n; }); }} style={{ margin: 0 }} />
                    {DAY_LABELS[d]}
                  </label>);
                })}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={function() {
                  var src = meals[eatDay];
                  if (!src) { setFormMsg("Nothing to copy — no selections on " + eatDay); setTimeout(function(){setFormMsg("");},3000); return; }
                  var targets = Object.keys(copyDayTargets).filter(function(d){ return copyDayTargets[d]; });
                  if (targets.length === 0) { setFormMsg("Select at least one day to copy to"); setTimeout(function(){setFormMsg("");},3000); return; }
                  var n = Object.assign({}, meals);
                  for (var ti = 0; ti < targets.length; ti++) {
                    n[targets[ti]] = JSON.parse(JSON.stringify(src));
                  }
                  setMeals(n); saveMeals(n);
                  setCopyDayOpen(false); setCopyDayTargets({});
                  setFormMsg("✓ Copied " + eatDay.charAt(0).toUpperCase() + eatDay.slice(1) + " to " + targets.map(function(d){ return DAY_LABELS[d]; }).join(", "));
                  setTimeout(function(){setFormMsg("");},3000);
                }} style={{ flex: 1, padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Apply</button>
                <button onClick={function(){ setCopyDayOpen(false); setCopyDayTargets({}); }} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>)}

            
            {eatDayEyeOpen && (<div style={{ background: accentLight, borderRadius: 8, padding: 12, marginBottom: 10, border: "1px solid " + accentBorder }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>{eatDay.charAt(0).toUpperCase() + eatDay.slice(1)} — Nutrition Overview (g)</span>
                <button aria-label="Close day view" onClick={function(){setEatDayEyeOpen(false);}} style={{ padding: "2px 8px", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", border: "none", borderRadius: 4, fontSize: 12, color: "#fff", cursor: "pointer", lineHeight: 1 }}>✕</button>
              </div>
              {(function() {
                var isJC = activeTab === "jc";
                var kf = isJC ? "jcKcal" : "beckKcal";
                var pf = isJC ? "jcProt" : "beckProt";
                var ff = isJC ? "jcFat" : "beckFat";
                var cats = [
                  { label: "Breakfast", prefix: "b", items: allBfast, multi: true },
                  { label: "Lunch", prefix: "l", items: allLunch, multi: true },
                  { label: "Dinner", prefix: "d", items: allDinners, multi: true },
                  { label: "🥔 Sides", prefix: "dp", items: POTATO_SIDES, multi: true },
                  { label: "🥗 Sides", prefix: "dv", items: VEG_SIDES, multi: true },
                  { label: "Desserts", prefix: "ds", items: allDesserts, multi: false },
                  { label: "Drinks", prefix: "dr", items: allDrinks, multi: false },
                  { label: "Snacks", prefix: "o", items: allOther, multi: false }
                ];
                var dayTotalConsumed = 0;
                var dayGoalK = goalKcal(data && data[activeTab], dateOf(weekStart, eatDay), weekChildren); if (dayGoalK == null) dayGoalK = Infinity; /* v2.18.0: the person's goal */
                var dayProtConsumed = 0;
                var dayFatConsumed = 0;
                var daySfatConsumed = 0;
                var dayCarbsConsumed = 0;
                var dayFibConsumed = 0;
                var daySaltConsumed = 0;
                var rows = cats.map(function(cat) {
                  var catItems = [];
                  for (var si = 1; si <= 10; si++) {
                    var sk = cat.multi ? (si === 1 ? cat.prefix : cat.prefix + si) : cat.prefix + si;
                    var val = getMeal(eatDay, sk);
                    if (!val || val === "__empty__") continue;
                    var found = cat.items.find(function(it) { return it.id === val; });
                    if (!found) continue;
                    var kcal = found[kf] || 0;
                    var prot = found[pf] || found.protein || 0;
                    var fat = found[ff] || found.fat || 0;
                    var sfat = found.satFat || 0;
                    var carbs = found.carbs || 0;
                    var fibre = found.fibre || 0;
                    var salt = found.salt || 0;
                    dayTotalConsumed += kcal; dayProtConsumed += prot; daySfatConsumed += sfat; dayCarbsConsumed += carbs; dayFibConsumed += fibre; daySaltConsumed += salt;
                    catItems.push({ name: found.name, kcal: kcal, prot: prot, fat: fat, sfat: sfat, carbs: carbs, fibre: fibre, salt: salt, rating: found.rating || '' });
                  }
                  return { label: cat.label, items: catItems };
                });
                return (<div>
                  <div style={{ overflowX: "auto", width: "100%", boxSizing: "border-box" }}><table data-testid="nutrition-table" data-day="1" style={{ width: "100%", fontSize: 10, borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup><col style={{ width: "28%" }} /><col style={{ width: "13%" }} /><col style={{ width: "12%" }} /><col style={{ width: "12%" }} /><col style={{ width: "13%" }} /><col style={{ width: "11%" }} /><col style={{ width: "11%" }} /></colgroup>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                        <th style={{ padding: "4px 2px", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Item</th>
                        <th style={{ padding: "4px 2px", color: "#475569", textAlign: "right" }}>kcal</th>
                        <th style={{ padding: "4px 2px", color: "#475569", textAlign: "right" }}>prot</th>
                        <th style={{ padding: "4px 2px", color: "#475569", textAlign: "right" }}>s/fat</th>
                        <th style={{ padding: "4px 2px", color: "#475569", textAlign: "right" }}>carbs</th>
                        <th style={{ padding: "4px 2px", color: "#475569", textAlign: "right" }}>fib</th>
                        <th style={{ padding: "4px 2px", color: "#475569", textAlign: "right" }}>salt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(function(cat) {
                        if (cat.items.length === 0) return null;
                        var catKcal = 0; var catProt = 0; var catFat = 0; var catSfat = 0; var catCarbs = 0; var catFib = 0; var catSalt = 0;
                        cat.items.forEach(function(it) { catKcal += it.kcal; catProt += it.prot; catFat += it.fat; catSfat += it.sfat; catCarbs += it.carbs; catFib += it.fibre; catSalt += it.salt; });
                        return (<React.Fragment key={cat.label}>
                          {cat.items.map(function(it, ii) {
                            return (<tr key={ii} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "3px 2px", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", marginRight: 4, background: ratingDot(it.rating), verticalAlign: "middle" }}></span>{it.name}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{fk(it.kcal)}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(it.prot) || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(it.sfat) || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(it.carbs) || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(it.fibre) || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{f1(it.salt) || "-"}</td>
                            </tr>);
                          })}
                          <tr style={{ borderBottom: "1px solid #cbd5e1" }}><td style={{ padding: "3px 2px", fontWeight: 600, fontSize: 9, color: "#475569" }}>{cat.label} total</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{fk(catKcal)}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{f1(catProt) || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{f1(catSfat) || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{f1(catCarbs) || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{f1(catFib) || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{f1(catSalt) || "-"}</td></tr>
                        </React.Fragment>);
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#e0f2fe", borderTop: "2px solid #0f172a" }}>
                        <td style={{ padding: "4px 2px", fontWeight: 700, fontSize: 11, color: "#0c4a6e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Total</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: dayTotalConsumed > dayGoalK ? "#b91c1c" : "#0c4a6e" }}>{fk(dayTotalConsumed)}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: dayProtConsumed < (isJC ? 110 : 90) ? "#b91c1c" : "#0c4a6e" }}>{f1(dayProtConsumed) || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: daySfatConsumed > 20 ? "#b91c1c" : "#0c4a6e" }}>{f1(daySfatConsumed) || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: dayCarbsConsumed > (isJC ? 300 : 260) ? "#b91c1c" : "#0c4a6e" }}>{f1(dayCarbsConsumed) || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: dayFibConsumed < (isJC ? 30 : 25) ? "#b91c1c" : "#0c4a6e" }}>{f1(dayFibConsumed) || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: daySaltConsumed > 6 ? "#b91c1c" : "#0c4a6e" }}>{f1(daySaltConsumed) || "-"}</td>
                      </tr>
                    <tr style={{ background: "#f1f5f9" }}>
                        <td style={{ padding: "4px 2px", fontWeight: 700, fontSize: 10, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Recommended</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{dayGoalK === Infinity ? "—" : fk(dayGoalK)}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{isJC ? "130" : "110"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>20</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{isJC ? "300" : "260"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{isJC ? "35" : "30"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>6</td>
                      </tr>
                      {(function() {
                        var limKcal = dayGoalK === Infinity ? dayTotalConsumed : dayGoalK;
                        var limProt = isJC ? 130 : 110;
                        var limSfat = 20;
                        var limCarbs = isJC ? 300 : 260;
                        var limFib = isJC ? 35 : 30;
                        var limSalt = 6;
                        var dKcal = dayTotalConsumed - limKcal;
                        var dProt = dayProtConsumed - limProt;
                        var dSfat = daySfatConsumed - limSfat;
                        var dCarbs = dayCarbsConsumed - limCarbs;
                        var dFib = dayFibConsumed - limFib;
                        var dSalt = daySaltConsumed - limSalt;
                        var kcalColor = dKcal > 0 ? "#dc2626" : "#0c4a6e";
                        var protColor = dProt < 0 ? "#dc2626" : "#0c4a6e";
                        var sfatColor = dSfat > 0 ? "#dc2626" : "#0c4a6e";
                        var carbsColor = dCarbs > 0 ? "#dc2626" : "#0c4a6e";
                        var fibColor = dFib < 0 ? "#dc2626" : "#0c4a6e";
                        var saltColor = dSalt > 0 ? "#dc2626" : "#0c4a6e";
                        return (<tr style={{ background: "#fafafa" }}>
                          <td style={{ padding: "4px 2px", fontWeight: 700, fontSize: 10, color: "#475569" }}>+/−</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: kcalColor }}>{sgn(dKcal, 0)}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: protColor }}>{sgn(dProt, 1)}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: sfatColor }}>{sgn(dSfat, 1)}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: carbsColor }}>{sgn(dCarbs, 1)}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: fibColor }}>{sgn(dFib, 1)}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: saltColor }}>{sgn(dSalt, 1)}</td>
                        </tr>);
                      })()}
                    </tfoot>
                  </table></div>

                  {/* Nutrition diverging bar chart */}
                  <div style={{ marginTop: 24, background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "10px 8px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8, paddingLeft: 4 }}>Daily Percentage of Recommendations</div>
                    {(function() {
                      var cLimKcal = dayGoalK === Infinity ? 0 : dayGoalK;
                      var cLimProt = isJC ? 130 : 110;
                      var cLimSfat = 20;
                      var cLimCarbs = isJC ? 300 : 260;
                      var cLimFib = isJC ? 35 : 30;
                      var cLimSalt = 6;
                      var bars = [
                        { label: "Kcal", consumed: dayTotalConsumed, limit: cLimKcal, overIsBad: true },
                        { label: "Prot", consumed: dayProtConsumed, limit: cLimProt, overIsBad: false },
                        { label: "S/Fat", consumed: daySfatConsumed, limit: cLimSfat, overIsBad: true },
                        { label: "Carbs", consumed: dayCarbsConsumed, limit: cLimCarbs, overIsBad: true },
                        { label: "Fibre", consumed: dayFibConsumed, limit: cLimFib, overIsBad: false },
                        { label: "Salt", consumed: daySaltConsumed, limit: cLimSalt, overIsBad: true }
                      ];
                      var maxDev = 100;
                      return React.createElement("div", null,
                        React.createElement("div", { style: { position: "relative", marginBottom: 2, height: 12, marginLeft: 38, marginRight: 42 } },
                          React.createElement("span", { style: { position: "absolute", left: 0, fontSize: 8, color: "#475569" } }, "-" + maxDev + "%"),
                          React.createElement("span", { style: { position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: 8, color: "#475569", fontWeight: 600 } }, "Target"),
                          React.createElement("span", { style: { position: "absolute", right: 0, fontSize: 8, color: "#475569" } }, "+" + maxDev + "%")
                        ),
                        bars.map(function(b) {
                          var pct = b.limit > 0 ? Math.round((b.consumed / b.limit) * 100) : 0;
                          var dev = pct - 100;
                          var clampedDev = Math.max(-maxDev, Math.min(maxDev, dev));
                          var isBad = b.overIsBad ? dev > 0 : dev < 0;
                          var barColor = isBad ? "#dc2626" : "#16a34a";
                          var barWidthPct = (Math.abs(clampedDev) / maxDev) * 50;
                          var barStyle = {};
                          if (clampedDev < 0) {
                            barStyle = { position: "absolute", right: "50%", top: 0, bottom: 0, width: barWidthPct + "%", background: barColor, borderRadius: "4px 0 0 4px", transition: "width 0.3s, background 0.3s" };
                          } else if (clampedDev > 0) {
                            barStyle = { position: "absolute", left: "50%", top: 0, bottom: 0, width: barWidthPct + "%", background: barColor, borderRadius: "0 4px 4px 0", transition: "width 0.3s, background 0.3s" };
                          }
                          return React.createElement("div", { key: b.label, style: { display: "flex", alignItems: "center", marginBottom: 4 } },
                            React.createElement("span", { style: { fontSize: 9, fontWeight: 600, color: "#475569", width: 32, textAlign: "right", marginRight: 6 } }, b.label),
                            React.createElement("div", { style: { flex: 1, background: "#f1f5f9", borderRadius: 4, height: 14, position: "relative", overflow: "hidden" } },
                              clampedDev !== 0 && React.createElement("div", { style: barStyle }),
                              React.createElement("div", { style: { position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "#334155", zIndex: 1, transform: "translateX(-1px)" } })
                            ),
                            React.createElement("span", { style: { fontSize: 9, fontWeight: 600, color: dev === 0 ? "#15803d" : barColor, width: 42, textAlign: "right", marginLeft: 4 } }, (dev > 0 ? "+" : "") + dev + "%")
                          );
                        })
                      );
                    })()}
                  </div>

                </div>);
              })()}
            </div>)}

            <div style={{ background: accentLight, borderRadius: 8, padding: 12, marginBottom: 10, border: "1px solid " + accentBorder }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 10 }}>Daily Eating Tracker</div>

            {/* Breakfast */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Breakfast</span>
              {(function() {
                var slots = []; for (var si = 1; si <= 10; si++) { var sk = si === 1 ? "b" : "b" + si; if (getMeal(eatDay, sk) || si <= 1) slots.push(si); }
                return slots.map(function(idx) {
                  var slotKey = idx === 1 ? "b" : "b" + idx;
                  var _hasItem = allBfast.some(function(it){ return it.id === getMeal(eatDay, slotKey); });
                  var _ragWarn = checkRagFrequency(getMeal(eatDay, slotKey), eatDay, slotKey);
                  var _slotItem = allItemsLookup[getMeal(eatDay, slotKey)];
                  var _ragChg = _slotItem && _slotItem._ragChanged && !_slotItem._ragChangedSeen && ratingsShown();
                  return (<div key={"b"+idx} style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4, alignItems: "center" }}>
                    <div style={{ flex: "1 1 5em", minWidth: 0 }}>
                      <MealSelect row={{ mode: "day", day: eatDay, slot: slotKey }} snap={getSnap(eatDay, slotKey)} items={dispBfast} value={getMeal(eatDay, slotKey) === "__empty__" ? "" : getMeal(eatDay, slotKey)} onChange={function(e) { if (e.target.value === "__add_new__") { notInList("breakfast", "defaults", e.target.searchText, slotKey, eatDay); } else { setMeal(eatDay, slotKey, e.target.value); } }} placeholder="Add breakfast…" onDelete={deleteCustomItem} />
                    </div>
                  </div>);
                });
              })()}
              {slotOpen && slotOpen.day === eatDay && /^b\d*$/.test(slotOpen.slot) && renderSlotForm()}
              {portionSlot && portionSlot.match(/^b\d*$/) && (portionLoading || portionResult || snapPre === portionSlot) && !(picker && picker.snap) && renderSnapPanel()}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            </div>
            </div>

            
            {addingNew && addingSource === "defaults" && addingCategory === "breakfast" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 8, border: "1px solid #bfdbfe" }}>
              <div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Breakfast Item</span></div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11 }} />
                <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button>
                <button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button>
              </div>
              <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#475569" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = ratingColor(calcRAG(prod), "bright"); return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "Open Food Facts · " + (prod.servingSize || "per portion"), category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#475569", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P {ratingsShown() && <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span>}</span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#475569", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}
            </div>)}

            {/* Lunch */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Lunch</span>
              {(function() {
                var slots = []; for (var si = 1; si <= 10; si++) { var sk = si === 1 ? "l" : "l" + si; if (getMeal(eatDay, sk) || si <= 1) slots.push(si); }
                return slots.map(function(idx) {
                  var slotKey = idx === 1 ? "l" : "l" + idx;
                  var _hasItem = allLunch.some(function(it){ return it.id === getMeal(eatDay, slotKey); });
                  var _ragWarn = checkRagFrequency(getMeal(eatDay, slotKey), eatDay, slotKey);
                  var _slotItem2 = allItemsLookup[getMeal(eatDay, slotKey)];
                  var _ragChg2 = _slotItem2 && _slotItem2._ragChanged && !_slotItem2._ragChangedSeen && ratingsShown();
                  return (<div key={"l"+idx} style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4, alignItems: "center" }}>
                    <div style={{ flex: "1 1 5em", minWidth: 0 }}>
                      <MealSelect row={{ mode: "day", day: eatDay, slot: slotKey }} snap={getSnap(eatDay, slotKey)} items={dispLunch} value={getMeal(eatDay, slotKey) === "__empty__" ? "" : getMeal(eatDay, slotKey)} onChange={function(e) { if (e.target.value === "__add_new__") { notInList("lunch", "defaults", e.target.searchText, slotKey, eatDay); } else { setMeal(eatDay, slotKey, e.target.value); } }} placeholder="Add lunch…" onDelete={deleteCustomItem} />
                    </div>
                  </div>);
                });
              })()}
              {slotOpen && slotOpen.day === eatDay && /^l\d*$/.test(slotOpen.slot) && renderSlotForm()}
              {portionSlot && portionSlot.match(/^l\d*$/) && (portionLoading || portionResult || snapPre === portionSlot) && !(picker && picker.snap) && renderSnapPanel()}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            </div>
            </div>

            
            {addingNew && addingSource === "defaults" && addingCategory === "lunch" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 8, border: "1px solid #bfdbfe" }}>
              <div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Lunch Item</span></div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11 }} />
                <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button>
                <button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button>
              </div>
              <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#475569" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = ratingColor(calcRAG(prod), "bright"); return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "Open Food Facts · " + (prod.servingSize || "per portion"), category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#475569", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P {ratingsShown() && <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span>}</span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#475569", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}
            </div>)}

            {/* Dinner */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Dinner</span>
              {(function() {
                var slots = []; for (var si = 1; si <= 10; si++) { var sk = si === 1 ? "d" : "d" + si; if (getMeal(eatDay, sk) || si <= 1) slots.push(si); }
                return slots.map(function(idx) {
                  var slotKey = idx === 1 ? "d" : "d" + idx;
                  var sIdx = slotKey === "d" ? "" : slotKey.replace("d", "");
                  var _hasItem = allDinners.some(function(it){ return it.id === getMeal(eatDay, slotKey); });
                  var _isPackaged = isPackagedDinner(getMeal(eatDay, slotKey));
                  var _ragWarn = checkRagFrequency(getMeal(eatDay, slotKey), eatDay, slotKey);
                  var _slotItem3 = allItemsLookup[getMeal(eatDay, slotKey)];
                  var _ragChg3 = _slotItem3 && _slotItem3._ragChanged && !_slotItem3._ragChangedSeen && ratingsShown();
                  var dpKey = "dp" + sIdx;
                  var dvKey = "dv" + sIdx;
                  return (<div key={"d"+idx}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: _isPackaged ? 2 : 4, alignItems: "center" }}>
                    <div style={{ flex: "1 1 5em", minWidth: 0 }}>
                      <MealSelect row={{ mode: "day", day: eatDay, slot: slotKey }} snap={getSnap(eatDay, slotKey)} items={dispDinners} value={getMeal(eatDay, slotKey) === "__empty__" ? "" : getMeal(eatDay, slotKey)} onChange={function(e) { if (e.target.value === "__add_new__") { notInList("dinner", "defaults", e.target.searchText, slotKey, eatDay); } else { setMeal(eatDay, slotKey, e.target.value); } }} placeholder="Add dinner…" onDelete={deleteCustomItem} />
                    </div>
                    </div>
                    {_isPackaged && (<div style={{ marginLeft: 12, marginBottom: 6, paddingLeft: 8, borderLeft: "2px solid #bfdbfe" }}>
                      <div style={{ fontSize: 9, color: "#475569", marginBottom: 2, fontWeight: 600 }}>📦 Sides for packaged product</div>
                      <div style={{ display: "flex", gap: 4, marginBottom: 3, alignItems: "center" }}>
                        <span style={{ fontSize: 9, color: "#475569", width: 44, flexShrink: 0 }}>🥔 Potato</span>
                        <select value={getMeal(eatDay, dpKey) || ""} onChange={function(e){ setMeal(eatDay, dpKey, e.target.value); }} style={{ flex: 1, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 10, background: "#fff" }}>
                          <option value="">Select potato side...</option>
                          {POTATO_SIDES.map(function(ps){ var kcal = isJC ? ps.jcKcal : ps.beckKcal; return <option key={ps.id} value={ps.id}>{ps.name} ({kcal} kcal)</option>; })}
                        </select>
                      </div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 9, color: "#475569", width: 44, flexShrink: 0 }}>🥗 Veg</span>
                        <select value={getMeal(eatDay, dvKey) || ""} onChange={function(e){ setMeal(eatDay, dvKey, e.target.value); }} style={{ flex: 1, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 10, background: "#fff" }}>
                          <option value="">Select veg/salad side...</option>
                          {VEG_SIDES.map(function(vs){ var kcal = isJC ? vs.jcKcal : vs.beckKcal; return <option key={vs.id} value={vs.id}>{vs.name} ({kcal} kcal)</option>; })}
                        </select>
                      </div>
                    </div>)}
                  </div>);
                });
              })()}
              {slotOpen && slotOpen.day === eatDay && /^d\d*$/.test(slotOpen.slot) && renderSlotForm()}
              {portionSlot && portionSlot.match(/^d\d*$/) && !portionSlot.match(/^d[sr]/) && (portionLoading || portionResult || snapPre === portionSlot) && !(picker && picker.snap) && renderSnapPanel()}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            </div>
            </div>

            
            {addingNew && addingSource === "defaults" && addingCategory === "dinner" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 8, border: "1px solid #bfdbfe" }}>
              <div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Dinner Item</span></div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11 }} />
                <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button>
                <button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button>
              </div>
              <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#475569" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = ratingColor(calcRAG(prod), "bright"); return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "Open Food Facts · " + (prod.servingSize || "per portion"), category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#475569", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P {ratingsShown() && <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span>}</span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#475569", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}
            </div>)}

            {/* Desserts */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Desserts</span>
              {(function() {
                var slots = []; for (var di = 1; di <= 5; di++) { if (getMeal(eatDay, "ds" + di) || di <= 1) slots.push(di); }
                return slots.map(function(idx) {
                  return (<div key={"ds"+idx} style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4, alignItems: "center" }}>
                    <div style={{ flex: "1 1 5em", minWidth: 0 }}>
                      <MealSelect row={{ mode: "day", day: eatDay, slot: "ds" + idx }} snap={getSnap(eatDay, "ds" + idx)} items={dispDesserts} value={getMeal(eatDay, "ds" + idx) === "__empty__" ? "" : getMeal(eatDay, "ds" + idx)} onChange={function(e) { if (e.target.value === "__add_new__") { notInList("dessert", "defaults", e.target.searchText, "ds" + idx, eatDay); } else { setMeal(eatDay, "ds" + idx, e.target.value); } }} placeholder="Add dessert…" />
                    </div>
                  </div>);
                });
              })()}
              {slotOpen && slotOpen.day === eatDay && /^ds/.test(slotOpen.slot) && renderSlotForm()}
              {portionSlot && portionSlot.match(/^ds/) && (portionLoading || portionResult || snapPre === portionSlot) && !(picker && picker.snap) && renderSnapPanel()}
            </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            </div>

            
            {addingNew && addingSource === "defaults" && addingCategory === "dessert" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 8, border: "1px solid #bfdbfe" }}>
              <div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Dessert Item</span></div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11 }} />
                <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button>
                <button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button>
              </div>
              <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#475569" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = ratingColor(calcRAG(prod), "bright"); return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "Open Food Facts · " + (prod.servingSize || "per portion"), category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#475569", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P {ratingsShown() && <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span>}</span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#475569", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}
            </div>)}

            {/* Drinks */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Drinks</span>
              {(function() {
                var slots = []; for (var di = 1; di <= 5; di++) { if (getMeal(eatDay, "dr" + di) || di <= 1) slots.push(di); }
                return slots.map(function(idx) {
                  return (<div key={"dr"+idx} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <MealSelect row={{ mode: "day", day: eatDay, slot: "dr" + idx }} snap={getSnap(eatDay, "dr" + idx)} items={dispDrinks} value={getMeal(eatDay, "dr" + idx) === "__empty__" ? "" : getMeal(eatDay, "dr" + idx)} onChange={function(e) { if (e.target.value === "__add_new__") { notInList("drink", "defaults", e.target.searchText, "dr" + idx, eatDay); } else { setMeal(eatDay, "dr" + idx, e.target.value); } }} placeholder="Add drink…" />
                    </div>
                  </div>);
                });
              })()}
              {slotOpen && slotOpen.day === eatDay && /^dr/.test(slotOpen.slot) && renderSlotForm()}
              {portionSlot && portionSlot.match(/^dr/) && (portionLoading || portionResult || snapPre === portionSlot) && !(picker && picker.snap) && renderSnapPanel()}
            </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            </div>

            
            {addingNew && addingSource === "defaults" && addingCategory === "drink" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 8, border: "1px solid #bfdbfe" }}>
              <div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Drink Item</span></div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11 }} />
                <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button>
                <button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button>
              </div>
              <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#475569" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = ratingColor(calcRAG(prod), "bright"); return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "Open Food Facts · " + (prod.servingSize || "per portion"), category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#475569", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P {ratingsShown() && <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span>}</span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#475569", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}
            </div>)}

            {/* Snacks */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Snacks</span>
            {otherSlots.map(function(idx) {
              return (<div key={idx} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <MealSelect row={{ mode: "day", day: eatDay, slot: "o" + idx }} snap={getSnap(eatDay, "o" + idx)} items={dispOther} value={getMeal(eatDay, "o" + idx) === "__empty__" ? "" : getMeal(eatDay, "o" + idx)} onChange={function(e) { if (e.target.value === "__add_new__") { notInList("snack", "defaults", e.target.searchText, "o" + idx, eatDay); } else { setMeal(eatDay, "o" + idx, e.target.value); } }} placeholder="Add snack…" />
                </div>
              </div>);
            })}
            {slotOpen && slotOpen.day === eatDay && /^o/.test(slotOpen.slot) && renderSlotForm()}
              {portionSlot && portionSlot.match(/^o/) && (portionLoading || portionResult || snapPre === portionSlot) && !(picker && picker.snap) && renderSnapPanel()}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            </div>
            </div>

            {/* Add new snack item */}
            {addingNew && addingSource === "defaults" && addingCategory === "snack" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 8, border: "1px solid #bfdbfe" }}>
              <div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Snack Item</span></div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); }} placeholder="e.g. Grenade bar, fruit pot..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11 }} />
                <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button>
                <button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button>
              </div>
              <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#475569" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = ratingColor(calcRAG(prod), "bright"); return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "Open Food Facts · " + (prod.servingSize || "per portion"), category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#475569", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P {ratingsShown() && <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span>}</span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#475569", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}
            </div>)}

            
            <p style={{ fontSize: 9, color: "#475569", textAlign: "center", margin: "8px 0 0", fontStyle: "italic", lineHeight: 1.3 }}>It's important to track accurate and honest information for your companion to give you the most appropriate feedback. Use 'Update Eating Lists' to update eating selection list items.</p>

            {/* Help Me with What to Eat */}
            <div style={{ background: accentVariant(accent, 88), borderRadius: 8, padding: 10, marginTop: 10, marginBottom: 10, border: "1px solid " + accentBorder }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>🍽 Help Me with What to Eat</div>
              <div style={{ fontSize: 9, color: "#334155", marginBottom: 8, lineHeight: 1.4 }}>State or describe where you are including brand named place if available and if possible, provide an image upload of your options (i.e menu, buffet, supermarket shelves)</div>
              {!helpEatResult ? (<div>
                {!helpEatCat ? (<div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#475569", marginBottom: 4 }}>What are you looking for?</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {["breakfast","lunch","dinner","snack","drink","dessert"].map(function(cat) { return (<button key={cat} onClick={function(){setHelpEatCat(cat);}} style={{ padding: "6px 12px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 11, cursor: "pointer", textTransform: "capitalize" }}>{cat}</button>); })}
                  </div>
                </div>) : (<div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Looking for: <span style={{ textTransform: "capitalize", color: "#1e3a5f" }}>{helpEatCat}</span></span>
                    <button onClick={function(){ setHelpEatCat(""); setHelpEatText(""); }} style={{ padding: "2px 8px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 4, fontSize: 10, color: "#475569", cursor: "pointer" }}>Change</button>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input value={helpEatText} onChange={function(e) { setHelpEatText(e.target.value); }} placeholder="e.g. M&S services, hotel buffet, Pizza Express..." style={{ flex: 1, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11 }} />
                    <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: helpEatLoading ? "wait" : "pointer", display: "flex", alignItems: "center" }}>
                      📷
                      <input type="file" accept="image/*" capture="environment" onChange={async function(e) {
                        if (!e.target.files || !e.target.files[0]) return;
                        await window._lcHelpEatPhoto(e.target.files[0]);
                        e.target.value = "";
                      }} style={{ display: "none" }} />
                    </label>
                  </div>
                  <button onClick={async function() {
                      if (!helpEatText.trim()) return;
                      setHelpEatLoading(true);
                      try {
                        var isJC2 = activeTab === "jc";
                        var personCtx = isJC2 ? "JC, male 49, " + kcalTargetText(data && data[activeTab]) + ", 110-130g protein, under 20g sat fat, under 25g added sugar, 30-35g fibre. Thyroid issues (TSH 14.2), statin 20mg, HbA1c 43." : "Becks, female 48, " + kcalTargetText(data && data[activeTab]) + ", 90-110g protein, under 20g sat fat (critical — LDL 7.2, Total Cholesterol 9.6, suspected FH), under 25g added sugar, 25-30g fibre. Perimenopausal, citalopram, atorvastatin.";
                        var catLabel = helpEatCat;
                        var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-lc-feature": "snap", "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 800, messages: [{ role: "user", content: "This person needs help choosing a " + catLabel + " option. They are at or considering: " + helpEatText.trim() + ". Person profile: " + personCtx + " Research what food options this place/situation typically offers and recommend the BEST suitable " + catLabel + " option. Include portion advice if relevant (e.g. 'have half portion', 'skip the side'). Classify as 'packaged' if it is a pre-made supermarket product or 'ingredient' if it is home-made/cooked from scratch. If 'ingredient', list individual ingredients needed. Return ONLY JSON: {\"name\":\"recommended food/meal name\",\"kcal\":estimated_calories,\"protein\":grams,\"fat\":total_fat_grams,\"satFat\":saturated_fat_grams,\"addedSugar\":added_sugar_grams_only_not_natural_sugars,\"carbs\":carbs_grams,\"fibre\":fibre_grams,\"salt\":salt_grams,\"rating\":\"GREAT or AMBER or RED\",\"itemType\":\"packaged or ingredient\",\"ingredients\":[\"item1\",\"item2\"] (empty array if packaged),\"recommendation\":\"2-3 sentences explaining why this is the best choice and any portion/modification advice\",\"alternatives\":\"1 sentence naming one alternative if available\"}" }] }) });
                        var result = await resp.json();
                        var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
                        var txt = ""; if (result.content) { for (var ri = 0; ri < result.content.length; ri++) { if (result.content[ri].text) txt += result.content[ri].text; } }
                        var jsonStr = txt.replace(/```json|```/g, "").trim(); var jsonMatch = jsonStr.match(/\{[\s\S]*\}/); if (!jsonMatch) throw new Error("No JSON found"); var info = JSON.parse(jsonMatch[0]);
                        setHelpEatResult(withRuleRating({ name: info.name || helpEatText, kcal: info.kcal || 0, protein: info.protein || 0, fat: info.fat || 0, satFat: info.satFat || 0, addedSugar: info.addedSugar || 0, carbs: info.carbs || 0, fibre: info.fibre || 0, salt: info.salt || 0, rating: info.rating || "AMBER", itemType: info.itemType || "packaged", ingredients: info.ingredients || [], recommendation: info.recommendation || "", alternatives: info.alternatives || "", category: helpEatCat }));
                      } catch(ce) { setFormMsg(window.aiErrorMsg(ce)); setTimeout(function(){setFormMsg("");},10000); }
                      setHelpEatLoading(false);
                    }} disabled={helpEatLoading || !helpEatText.trim()} style={{ width: "100%", padding: "8px 12px", background: helpEatLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{helpEatLoading ? <span>Finding best options <LoadingDots /></span> : "Find Best Option"}</button>
                </div>)}
              </div>) : helpEatResult.noFood ? (<div data-testid="help-eat-no-food">
                <div role="alert" style={{ fontSize: 11, fontWeight: 600, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: 8, marginBottom: 6 }}>{NO_FOOD_MSG}</div>
                <input aria-label="Help me eat description" value={helpEatText} onChange={function(e) { setHelpEatText(e.target.value); }} placeholder="e.g. M&S services, hotel buffet, Pizza Express..." style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11, marginBottom: 6 }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button disabled style={{ flex: 1, padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, opacity: 0.45, cursor: "not-allowed" }}>Confirm</button>
                  <button disabled={helpEatLoading} onClick={function() { if (window._lcHelpEatFile) window._lcHelpEatPhoto(window._lcHelpEatFile); }} style={{ flex: 1, padding: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" }}>{helpEatLoading ? "⏳…" : "Re-check"}</button>
                  <button onClick={function() { setHelpEatResult(null); setHelpEatCat(""); setHelpEatText(""); }} style={{ flex: 1, padding: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>) : (<div>
                <div style={{ background: "#f0fdf4", borderRadius: 8, padding: 10, border: "1px solid #86efac", marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>🍽 {helpEatResult.name}</div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 11, flexWrap: "wrap" }}>
                    <span><b>{helpEatResult.kcal}</b> kcal</span>
                    <span><b>{helpEatResult.protein}g</b> prot</span>
                    <span><b>{helpEatResult.fat}g</b> fat</span>
                    {helpEatResult.satFat > 0 && <span><b>{helpEatResult.satFat}g</b> s/fat</span>}
                    {helpEatResult.carbs > 0 && <span><b>{helpEatResult.carbs}g</b> carbs</span>}
                    {helpEatResult.fibre > 0 && <span><b>{helpEatResult.fibre}g</b> fib</span>}
                    {helpEatResult.salt > 0 && <span><b>{helpEatResult.salt}g</b> salt</span>}
                  </div>
                  <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, marginBottom: 6, background: ratingBg(helpEatResult.rating), color: ratingColor(helpEatResult.rating), border: "1px solid " + (ratingBorder(helpEatResult.rating)) }}>{ratingLabel(helpEatResult.rating)}</div>
                  {helpEatResult.recommendation && <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.4, marginBottom: 4 }}>{helpEatResult.recommendation}</div>}
                  {helpEatResult.alternatives && <div style={{ fontSize: 10, color: "#475569", fontStyle: "italic", lineHeight: 1.4 }}>Also consider: {helpEatResult.alternatives}</div>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={async function() {
                    var hr = helpEatResult; var cat = hr.category;
                    var newItem = withRuleRating({ id: "custom_" + Date.now(), name: hr.name, jcKcal: hr.kcal, beckKcal: hr.kcal, protein: hr.protein || 0, fat: hr.fat || 0, satFat: hr.satFat || 0, addedSugar: hr.addedSugar || 0, carbs: hr.carbs || 0, fibre: hr.fibre || 0, salt: hr.salt || 0, rating: hr.rating, itemType: hr.itemType || "packaged", ingredients: hr.ingredients || [], freq: "Daily", isCustom: true }); /* D11: rule rating */
                    var slotKey = "";
                    var exists = null;
                    if (cat === "breakfast") {
                      exists = allBfast.find(function(x){ return x.name.toLowerCase() === hr.name.toLowerCase(); });
                      if (!exists) { var u = [].concat(customBreakfasts, [newItem]); setCustomBreakfasts(u); await sSet("custom_breakfasts", JSON.stringify(u)); }
                      slotKey = "b";
                    } else if (cat === "lunch") {
                      exists = allLunch.find(function(x){ return x.name.toLowerCase() === hr.name.toLowerCase(); });
                      if (!exists) { var u = [].concat(customLunches, [newItem]); setCustomLunches(u); await sSet("custom_lunches", JSON.stringify(u)); }
                      slotKey = "l";
                    } else if (cat === "dinner") {
                      exists = allDinners.find(function(x){ return x.name.toLowerCase() === hr.name.toLowerCase(); });
                      newItem.jcProt = hr.protein; newItem.beckProt = hr.protein; newItem.jcFat = hr.fat; newItem.beckFat = hr.fat; newItem.time = 30; newItem.shop = (hr.itemType === "ingredient" && hr.ingredients && hr.ingredients.length > 0) ? hr.ingredients : [hr.name];
                      if (!exists) { var u = [].concat(customMeals, [newItem]); setCustomMeals(u); await sSet("custom_meals", JSON.stringify(u)); }
                      slotKey = "d";
                    } else if (cat === "dessert") {
                      exists = allDesserts.find(function(x){ return x.name.toLowerCase() === hr.name.toLowerCase(); });
                      if (!exists) { var u = [].concat(customDesserts, [newItem]); setCustomDesserts(u); await sSet("custom_desserts", JSON.stringify(u)); }
                      slotKey = "ds1";
                    } else if (cat === "drink") {
                      exists = allDrinks.find(function(x){ return x.name.toLowerCase() === hr.name.toLowerCase(); });
                      if (!exists) { var u = [].concat(customDrinks, [newItem]); setCustomDrinks(u); await sSet("custom_drinks", JSON.stringify(u)); }
                      slotKey = "dr1";
                    } else {
                      exists = allOther.find(function(x){ return x.name.toLowerCase() === hr.name.toLowerCase(); });
                      if (!exists) { var u = [].concat(customSnacks, [newItem]); setCustomSnacks(u); await sSet("custom_snacks", JSON.stringify(u)); }
                      var dm = meals[eatDay] || {}; var sn = 1; while (dm["o" + sn] && dm["o" + sn] !== "__empty__" && dm["o" + sn] !== "__placeholder__") sn++; slotKey = "o" + sn;
                    }
                    var itemId = exists ? exists.id : newItem.id;
                    setMeal(eatDay, slotKey, itemId);
                    setFormMsg("✓ Added " + hr.name + " to today's " + cat);
                    setHelpEatResult(null); setHelpEatCat(""); setHelpEatText("");
                    setTimeout(function(){setFormMsg("");}, 3000);
                  }} style={{ flex: 1, padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✓ Confirm & Add</button>
                  <button onClick={function() { setHelpEatResult(null); setHelpEatCat(""); setHelpEatText(""); }} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>)}
            </div>

            {/* v2.17.1: the day's calorie line (goal · food · activity · left) */}
            {/* v2.54.0: the day's Summary (top) replaces the Planned vs Actual table that was here */}

            {/* Day notes */}

              <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 10, color: "#475569" }}>My Notes</span>
              <textarea defaultValue={dayMeals._note || ""} onBlur={function(e) { setMeal(eatDay, "_note", e.target.value); }} placeholder="e.g. Ate out, exam stress, birthday..." style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11, minHeight: 30, resize: "vertical", boxSizing: "border-box" }} />
            </div>
            </div>

            {/* Eating Day Feedback */}
            <div style={{ marginTop: 12 }}>
              <button onClick={function(){ generateEatFeedback(eatDay); }} disabled={eatFbLoading} style={{ width: "100%", padding: 12, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: eatFbLoading ? "not-allowed" : "pointer", opacity: eatFbLoading ? 0.7 : 1, background: eatFbLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", marginBottom: 6 }}>{eatFbLoading ? React.createElement("span", null, "Generating, please wait ", React.createElement(LoadingDots)) : "My Companion Eating Feedback"}</button>
              {(eatFbResults[activeTab] || {})[eatDay] && <button onClick={function(){ setEatFbExpanded(!eatFbExpanded); }} style={{ width: "100%", padding: 6, background: "none", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, color: "#475569", cursor: "pointer", marginBottom: 6 }}>{eatFbExpanded ? "▲ Hide Feedback" : "▼ Show Feedback"}</button>}
              {eatFbExpanded && (eatFbResults[activeTab] || {})[eatDay] && (function() { var efb = eatFbResults[activeTab][eatDay]; return React.createElement("div", { style: { marginBottom: 10 } },
                React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" } },
                  efb._when && React.createElement("div", { style: { padding: "6px 14px", background: "#f8fafc", fontSize: 10, color: "#475569", borderBottom: "1px solid #e2e8f0" } }, "Generated ", efb._when, " for ", isJC ? "JC" : "Becks", efb._phase ? React.createElement("span", { "data-testid": "eat-fb-phase", style: { marginLeft: 6, fontWeight: 700, color: "#1e3a5f" } }, "· " + (PHASE_LABEL[efb._phase] || efb._phase)) : null),
                  React.createElement("div", { style: { padding: "8px 14px", borderBottom: "1px solid #e2e8f0" } }, React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, React.createElement("span", { style: { fontSize: 14 } }, "🍽️"), React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: "#1e3a5f" } }, "Eating Companion Check-in — Daily"))),
                  React.createElement("div", { style: { padding: "12px 14px", borderBottom: "1px solid #e2e8f0" } },
                    React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#0c4a6e" } }, "What went well"),
                    (efb.wins || []).map(function(w, i) { return React.createElement("div", { key: i, style: { fontSize: 12, color: "#334155", marginTop: 4 } }, "✓ ", w); })
                  ),
                  React.createElement("div", { style: { padding: "12px 14px", borderBottom: "1px solid #e2e8f0" } },
                    React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#92400e" } }, "Could be even better"),
                    (efb.tweaks || []).map(function(t, i) { return React.createElement("div", { key: i, style: { fontSize: 12, color: "#334155", marginTop: 4 } }, "→ ", t); })
                  ),
                  React.createElement("div", { style: { padding: "12px 14px" } },
                    React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#1e40af" } }, "Outlook"),
                    React.createElement("div", { style: { fontSize: 12, color: "#334155", marginTop: 4 } }, "★ ", efb.outlook)
                  ),
                ),
                renderThread(efb, "eatday", activeTab + "-" + eatDay, function(updatedFb) { updateEatDayFb(updatedFb, eatDay); }, eatDay)
              ); })()}
            </div>

            {/* Quick text input */}
            
          </div>}

        

          {bulkDone && (<div role="dialog" aria-modal="true" aria-label="Bulk upload finished" style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, maxWidth: 380, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
              <div data-testid="bulk-done" style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.5, marginBottom: 12 }}>✅ {bulkDone}</div>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 12 }}>New items show a <b>Check me</b> badge until you open and save them.</div>
              <button onClick={function(){ setBulkDone(null); }} style={{ ...btnActionLg, width: "100%", borderRadius: 8 }}>OK</button>
            </div>
          </div>)}
          {pickToast && <div role="status" aria-live="polite" data-testid="pick-toast" style={{position:"fixed",left:12,right:12,bottom:"calc(84px + env(safe-area-inset-bottom))",zIndex:1200,maxWidth:456,margin:"0 auto",display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:"#1e3a5f",color:"#fff",fontSize:13,boxShadow:"0 6px 20px rgba(0,0,0,0.25)"}}>
            <span style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pickToast.text}</span>
            {pickToast.undo && <button type="button" onClick={function(){ var u = pickToast.undo; setPickToast(null); setPickFlash(null); if (u) u(); }} style={{padding:"6px 12px",borderRadius:8,border:"1px solid #fff",background:"transparent",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Undo</button>}
          </div>}
          {bulkUndo && (<div role="status" data-testid="bulk-cancelled" style={{ position: "fixed", left: 12, right: 12, bottom: 76, zIndex: 60, background: "#0f172a", color: "#fff", borderRadius: 8, padding: "10px 12px", fontSize: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ flex: 1 }}>Cancelled — {bulkUndo.ids.length} item{bulkUndo.ids.length === 1 ? "" : "s"} from earlier batches were kept in {catLabel(bulkUndo.cat)}.</span>
            <button onClick={undoBulk} style={{ background: "#fff", color: "#0f172a", border: "none", borderRadius: 6, padding: "4px 10px", fontWeight: 700, cursor: "pointer" }}>Undo</button>
            <button aria-label="Dismiss" onClick={function(){ setBulkUndo(null); }} style={{ background: "none", color: "#fff", border: "none", cursor: "pointer" }}>✕</button>
          </div>)}
          {portionUndo && (<div role="status" data-testid="portion-replaced" style={{ position: "fixed", left: 12, right: 12, bottom: 76, zIndex: 60, background: "#0f172a", color: "#fff", borderRadius: 8, padding: "10px 12px", fontSize: 12, display: "flex", gap: 8, alignItems: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
            <span style={{ flex: 1 }}>Looks like <b>{portionUndo.name}</b>, not {portionUndo.original} — updated</span>
            <button onClick={undoPortionReplace} style={{ background: "#fff", color: "#0f172a", border: "none", borderRadius: 6, padding: "4px 10px", fontWeight: 700, cursor: "pointer" }}>Undo</button>
            <button aria-label="Dismiss" onClick={function(){ setPortionUndo(null); }} style={{ background: "none", color: "#fff", border: "none", cursor: "pointer" }}>✕</button>
          </div>)}
          {/* Generate meals */}
          
        </div>); } catch(eatErr) { return (<div style={{ padding: 20, color: "#b91c1c" }}>Eating section error: {String(eatErr)}</div>); } }
