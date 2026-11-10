import { BREAKFASTS, DEFAULT_BREAKFASTS, DEFAULT_DINNERS_GB, DEFAULT_LUNCHES, DINNERS, LUNCHES, POTATO_SIDES, SNACKS, VEG_SIDES } from "../constants/food.js";
import { calcWeek, fmtDate, getWeekDates, mealKey } from "../lib/utils.js";
import { handleApiError } from "../lib/api.js";
import { sGet, sSet } from "../lib/storage.js";
import React from "react";
import { withRuleRating, rateByPortion, frequencyWarning, FREQ_LABEL, bandOf } from "../lib/rag.js";
import { btnAction, btnActionLg, btnClear, btnClose, btnDelete, btnEdit, btnMuted, btnPortion } from "../constants/styles.js";
import { accentVariant } from "../lib/colour.js";
import { personName } from "../components/PersonTabs.jsx";
import { parseRecalc, recalcPrompt, renameKcal, stripKcal as stripKcalName } from "../lib/nutrition.js";
import { applyDefaultsTo, generatorSummary, mergeGenerated, selectionName } from "../lib/meals.js";
import { compareLine, gramsLine, requestBody } from "../lib/snap.js";
import { foodKey, loadWeekDoc, makeChild, occurrences, ragNote, reconcile, saveWeekDoc, viewFromDoc } from "../lib/children.js";

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
    updateEatWeekFb, weekLabel, weekOff, weekStart
  } = ctx;
  /* v2.6.2 D10/F7: Undo for a replaced item, and the optional photo description */
  const [portionUndo, setPortionUndo] = React.useState(null);
  const [portionDesc, setPortionDesc] = React.useState("");
  /* v2.6.3 bulk upload: own category (D4), batch progress/retry (D3), real cancel (D5), OK message (F4) */
  const [bulkCat, setBulkCat] = React.useState("");
  const [bulkRun, setBulkRun] = React.useState(null);   // { done, total, failed: [lines], cat }
  const [bulkDone, setBulkDone] = React.useState(null); // message that needs OK
  const [bulkUndo, setBulkUndo] = React.useState(null); // { cat, ids } kept before a cancel
  const bulkToken = React.useRef(null);
  const [listJob, setListJob] = React.useState("");
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
          var dispBfast = dedupe(customBreakfasts, DEFAULT_BREAKFASTS);
          var dispLunch = dedupe(customLunches, DEFAULT_LUNCHES);
          var dispDinners = dedupe(customMeals, DEFAULT_DINNERS_GB);
          var dispOther = [...customSnacks];
          var dispDrinks = [...customDrinks];
          var dispDesserts = [...customDesserts];
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
          var getSnap = function() { return null; };
          var childAt = function(dayKey, slot) { var v = getMeal(dayKey, slot); var it = v ? allItemsLookup[v] : null; return it && it._child ? it._child : null; };
          /* Frequency rules count CHILDREN (their own RAG), by food: the parent, or the name when ad hoc */
          var foodOf = function(id) { var it = allItemsLookup[id]; return it && it._child ? foodKey(it._child) : id; };
          var thisWeekIds = function() { return occurrences(weekChildren).map(function(o) { return o.food; }); };
          var pastMonthIds = function() { var ids = []; (pastWeeksMeals || []).forEach(function(doc) { occurrences(doc).forEach(function(o) { ids.push(o.food); }); }); return ids; };
          var weekOcc = function() { return occurrences(weekChildren); };
          var pastOcc = function() { var out = []; (pastWeeksMeals || []).forEach(function(doc) { out = out.concat(occurrences(doc)); }); return out; };
          /* Check if selecting itemId in a slot would breach RAG rules.
             excludeDay/excludeSlot: the slot being set (exclude its current value from count).
             Returns null if OK, or a warning string if breached. */
          var checkRagFrequency = function(itemId, excludeDay, excludeSlot) {
            if (!itemId || itemId === "__empty__") return null;
            var item = allItemsLookup[itemId];
            if (!item || !item.rating || !item._isCustom) return null;
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
            return (<button type="button" aria-label="Snap a photo of your food" title="Snap a photo of your food" onClick={function() { if (!busy) openSnap(slotKey); }} style={{ ...btnPortion, background: on ? "#dbeafe" : btnPortion.background, border: on ? "1px solid #1e3a5f" : btnPortion.border, cursor: busy ? "wait" : "pointer", display: "flex" }}>{busy ? "⏳..." : "📷 Snap"}</button>);
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
              var reader = new FileReader();
              var base64 = await new Promise(function(res, rej) { reader.onload = function() { res(reader.result.split(",")[1]); }; reader.onerror = function() { rej(new Error("Read failed")); }; reader.readAsDataURL(file); });
              var mediaType = file.type || "image/jpeg";
              var apiKey = await window.ensureApiKey();
              var isJC3 = activeTab === "jc";
              var plannedName = planned ? planned.name : "unknown food";
              var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify(requestBody({ plannedName: planned ? plannedName : "", desc: desc, deep: !!deep }, { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } })) });
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
            if (!portionResult || !portionSlot) return;
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
          var removeOtherSlot = function(dayKey, idx) { var n = Object.assign({}, meals); if (n[dayKey]) { delete n[dayKey]["o" + idx]; } setMeals(n); saveMeals(n); };
          var getDayKcal = function(dayKey) { var m = meals[dayKey]; if (!m) return 0; var total = 0; var kf = isJC ? "jcKcal" : "beckKcal"; ["b","l","d"].forEach(function(s) { if (m[s]) { var item = allItems.find(function(x) { return x.id === m[s]; }); if (item) total += item[kf] || 0; } }); for (var i = 1; i <= 20; i++) { if (m["o" + i]) { var oi = allOther.find(function(x) { return x.id === m["o" + i]; }); if (oi) total += oi[kf] || 0; } } return total; };

          var clearWeek = function() { if (!confirm("Clear ALL meals for this week? This cannot be undone.")) return; var n = {}; setMeals(n); saveMeals(n); setFormMsg("Week cleared"); setTimeout(function() { setFormMsg(""); }, 3000); };

          
          var addFromCamera = async function(file) {
            if (!file) return;
            setNewItemLoading(true);
            setFormMsg("📷 Analysing image...");
            try {
              var reader = new FileReader();
              var base64 = await new Promise(function(res, rej) { reader.onload = function() { res(reader.result.split(",")[1]); }; reader.onerror = function() { rej(new Error("Read failed")); }; reader.readAsDataURL(file); });
              var mediaType = file.type || "image/jpeg";
              var descHint = newItemName.trim() ? " The user describes this as: " + newItemName.trim() + "." : "";
              var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: "Identify this food or product." + descHint + " Read any nutrition label if visible. Classify as 'packaged' if it is a pre-made supermarket product (e.g. Aldi chicken sizzler, protein bar, ready meal) or 'ingredient' if it is a home-made recipe or meal cooked from scratch (e.g. spag bol, curry, stir fry). If 'ingredient', also list the individual ingredients needed to make it. Return ONLY JSON: {\"name\":\"product or food name\",\"kcal\":calories_per_serving,\"protein\":grams,\"fat\":total_fat_grams,\"satFat\":saturated_fat_grams,\"addedSugar\":added_sugar_grams_only_not_natural_sugars,\"rating\":\"GREAT or AMBER or RED based on healthiness\",\"itemType\":\"packaged or ingredient\",\"ingredients\":[\"ingredient1\",\"ingredient2\"] (empty array if packaged)}" }] }] }) });
              var result = await resp.json();
              var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
              var txt = ""; if (result.content) { for (var ri = 0; ri < result.content.length; ri++) { if (result.content[ri].text) txt += result.content[ri].text; } }
              var jsonStr = txt.replace(/```json|```/g, "").trim(); var jsonMatch = jsonStr.match(/\{[\s\S]*\}/); if (!jsonMatch) throw new Error("No JSON found"); var info = JSON.parse(jsonMatch[0]);
              setCameraPreview(withRuleRating({ name: info.name || newItemName.trim() || "Unknown item", kcal: info.kcal || 0, protein: info.protein || 0, fat: info.fat || 0, satFat: info.satFat || 0, addedSugar: info.addedSugar || 0, carbs: info.carbs || 0, fibre: info.fibre || 0, salt: info.salt || 0, rating: info.rating || "AMBER", itemType: info.itemType || "packaged", ingredients: info.ingredients || [], originalIngredients: (info.ingredients || []).join(", "), category: addingCategory }));
              setReviewCategories([addingCategory]);
              setReviewSideType("");
              setFormMsg("");
              setAddingNew(false);
              // Now generate suitability line
              try {
                var p = data[activeTab] || {};
                var profile = p.profile || {};
                var suitPrompt = "Food: " + (info.name||"") + " (" + (info.kcal||0) + " kcal, " + (info.protein||0) + "g protein, " + (info.fat||0) + "g fat, " + (info.satFat||0) + "g sat fat, rating: " + (info.rating||"") + "). Person: " + (profile.name||activeTab) + ", targets: " + (isJC ? "2000-2200 kcal, 110-130g protein, <20g sat fat" : "1700-1900 kcal, 90-110g protein, <20g sat fat, LDL 7.2 high cholesterol") + ". Give ONE sentence on suitability for this person. Be specific to their health profile.";
                var sResp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 100, messages: [{ role: "user", content: suitPrompt }] }) });
                var sResult = await sResp.json();
                var sTxt = ""; if (sResult.content) { for (var si=0;si<sResult.content.length;si++) { if(sResult.content[si].text) sTxt+=sResult.content[si].text; } }
                setCameraPreview(function(prev) { return Object.assign({}, prev, { suitability: sTxt.trim() }); });
              } catch(se) {}
            } catch(ce) { setFormMsg(window.aiErrorMsg(ce)); }
            setNewItemLoading(false);
            setTimeout(function() { setFormMsg(""); }, 4000);
          };

          var addNewItem = async function() {
            if (!newItemName.trim()) return;
            setNewItemLoading(true);
            try {
              var isJC2 = activeTab === "jc";
              // Use Claude for nutritional lookup with full detail
              var prompt = "Find nutritional info for: " + newItemName + ". Classify as 'packaged' if it is a pre-made supermarket product (e.g. Aldi chicken sizzler, protein bar, ready meal) or 'ingredient' if it is a home-made recipe cooked from scratch (e.g. spag bol, curry, stir fry). If 'ingredient', list the individual ingredients needed. Return ONLY JSON: {\"name\":\"product or food name\",\"kcal\":calories_per_serving,\"protein\":grams,\"fat\":total_fat_grams,\"satFat\":saturated_fat_grams,\"addedSugar\":added_sugar_grams_only_not_natural_sugars,\"carbs\":carbs_grams,\"fibre\":fibre_grams,\"salt\":salt_grams,\"rating\":\"GREAT or AMBER or RED based on healthiness\",\"itemType\":\"packaged or ingredient\",\"ingredients\":[\"item1\",\"item2\"] (empty array if packaged),\"suitability\":\"ONE sentence suitability for " + (isJC2 ? "JC, male 49, 2000-2200 kcal target, <20g sat fat, thyroid issues" : "Becks, female 48, 1700-1900 kcal target, <20g sat fat, LDL 7.2") + "\"}";
              var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, messages: [{ role: "user", content: prompt }] }) });
              var result = await resp.json(); var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
              var txt = ""; if (result.content) { for (var ci = 0; ci < result.content.length; ci++) { if (result.content[ci].text) txt += result.content[ci].text; } }
              if (txt) {
                var jsonStr = txt.replace(/```json|```/g, "").trim(); var jsonMatch = jsonStr.match(/\{[\s\S]*\}/); if (!jsonMatch) throw new Error("No JSON found"); var info = JSON.parse(jsonMatch[0]);
                setCameraPreview(withRuleRating({ name: info.name || newItemName, kcal: info.kcal || 0, protein: info.protein || 0, fat: info.fat || 0, satFat: info.satFat || 0, addedSugar: info.addedSugar || 0, carbs: info.carbs || 0, fibre: info.fibre || 0, salt: info.salt || 0, rating: info.rating || "AMBER", itemType: info.itemType || "packaged", ingredients: info.ingredients || [], originalIngredients: (info.ingredients || []).join(", "), suitability: info.suitability || "", category: addingCategory }));
                setReviewCategories(addingCategory ? [addingCategory] : []);
                setReviewSideType("");
              }
            } catch(e) { setFormMsg(window.aiErrorMsg(e)); setTimeout(function() { setFormMsg(""); }, 5000); }
            setNewItemName(""); setNewItemLoading(false);
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

            /* Step 1: If ingredients changed, recalculate and show updated values */
            if (cp.itemType === "ingredient" && cp.originalIngredients !== undefined && editedIngredients.join(", ") !== cp.originalIngredients) {
              setFormMsg("🔄 Recalculating nutritional values...");
              try {
                /* v2.6.5 D7 on the Review path: same whole-recipe prompt, plausibility retry, apply only real values */
                var askRec = async function(note) {
                  var recResp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 600, messages: [{ role: "user", content: recalcPrompt(cp.name, editedIngredients, note) }] }) });
                  var recResult = await recResp.json();
                  var recErr = handleApiError(recResult); if (recErr) throw new Error(recErr);
                  var recTxt = ""; if (recResult.content) { for (var ri3=0; ri3<recResult.content.length; ri3++) { if(recResult.content[ri3].text) recTxt += recResult.content[ri3].text; } }
                  return parseRecalc(recTxt);
                };
                var prr = await askRec("");
                if (prr.implausible) prr = await askRec("A previous answer was implausible: " + prr.problem + ". Recheck every ingredient amount.");
                if (!prr.values) throw new Error(prr.problem + " — nothing was changed");
                var rv = prr.values;
                setCameraPreview(withRuleRating(Object.assign({}, cp, { kcal: rv.kcal, jcKcal: rv.kcal, beckKcal: rv.kcal, protein: rv.protein, fat: rv.fat, satFat: rv.satFat, addedSugar: rv.addedSugar, carbs: rv.carbs, fibre: rv.fibre, salt: rv.salt, name: renameKcal(cp.name, rv.kcal), assumed: prr.assumed, originalIngredients: editedIngredients.join(", "), recalculated: true })));
                if (nameEl) nameEl.value = renameKcal(cp.name, rv.kcal);
                setFormMsg("✅ Nutritional values updated: " + (cp.kcal || 0) + " → " + rv.kcal + " kcal, protein " + (cp.protein || 0) + " → " + rv.protein + "g, sat fat " + (cp.satFat || 0) + " → " + rv.satFat + "g" + (prr.assumed.length ? ". Assumed: " + prr.assumed.join(", ") : "") + ". Press Continue to add, or Edit Again to change the ingredients.");
                return;
              } catch(re) {
                if (window.isEnergyEmpty(re)) { setFormMsg(window.energyEmptyMsg); }
                else { setFormMsg("⚠️ Recalculation failed: " + String(re.message || re).substring(0, 80) + ". Press Confirm to retry or Cancel."); }
                return;
              }
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
            if (dd.itemType === "ingredient" && editedIng.length > 0 && (editedIng.join(", ") !== dd.originalIngredients || (/^Nutrition looks off/.test(dd.checkReason || "") && !dd.recalculated))) { /* D7: a doubtful item recalculates on Confirm */
              setFormMsg("🔄 Recalculating nutritional values...");
              try {
                /* v2.6.2 D7: whole recipe, no anchoring on the name, plausibility check (one retry), apply only real values */
                var askRecalc = async function(note) {
                  var recResp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 600, messages: [{ role: "user", content: recalcPrompt(dd.name, editedIng, note) }] }) });
                  var recResult = await recResp.json();
                  var recErr = handleApiError(recResult); if (recErr) throw new Error(recErr);
                  var recTxt = ""; if (recResult.content) { for (var re4 = 0; re4 < recResult.content.length; re4++) { if (recResult.content[re4].text) recTxt += recResult.content[re4].text; } }
                  return parseRecalc(recTxt);
                };
                var pr = await askRecalc("");
                if (pr.implausible) pr = await askRecalc("A previous answer was implausible: " + pr.problem + ". Recheck every ingredient amount.");
                if (!pr.values) throw new Error(pr.problem + " — nothing was changed");
                var ri = pr.values;
                var oldK = isJC ? dd.jcKcal : dd.beckKcal;
                var upd = { jcKcal: ri.kcal, beckKcal: ri.kcal, protein: ri.protein, fat: ri.fat, satFat: ri.satFat, addedSugar: ri.addedSugar, carbs: ri.carbs, fibre: ri.fibre, salt: ri.salt, rating: ri.rating || dd.rating, originalIngredients: editedIng.join(", "), recalculated: true, name: renameKcal(dd.name, ri.kcal), assumed: pr.assumed };
                if (dd.jcProt !== undefined) { upd.jcProt = upd.protein; upd.beckProt = upd.protein; upd.jcFat = upd.fat; upd.beckFat = upd.fat; }
                if (dd.shop !== undefined) { upd.shop = editedIng; }
                setEditDraft(withRuleRating(Object.assign({}, dd, upd))); /* D11: rule rating */
                var nameEl2 = document.getElementById("edit-item-name-" + d.id); if (nameEl2) nameEl2.value = upd.name;
                setFormMsg("✅ Nutritional values updated: " + (oldK || 0) + " → " + ri.kcal + " kcal, protein " + (dd.protein || 0) + " → " + ri.protein + "g, sat fat " + (dd.satFat || 0) + " → " + ri.satFat + "g" + (pr.assumed.length ? ". Assumed: " + pr.assumed.join(", ") : "") + ". Press Continue to save, or Edit Again to change the ingredients.");
              } catch(re) {
                setFormMsg(window.isEnergyEmpty(re) ? window.energyEmptyMsg : "⚠️ Recalculation failed: " + String(re.message || re).substring(0, 80) + ". Press Confirm to retry or Cancel.");
              }
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
            var targetsStr = isJC2 ? "Daily targets: 2000-2200 kcal, 110-130g protein, <20g sat fat, <25g added sugar, 30-35g fibre, <6g salt" : "Daily targets: 1700-1900 kcal, 90-110g protein, <20g sat fat (critical - LDL 7.2 high cholesterol/suspected FH), <25g added sugar, 25-30g fibre, <6g salt";
            var listItems = bulkListFor(bulkCatArg); var setList = bulkSetterFor(bulkCatArg); var storageKey2 = bulkKeyFor(bulkCatArg);
            var addedCount = 0; var skippedCount = 0; var failed = []; var lastErr = "";
            for (var bn = 0; bn < batches.length; bn++) {
              var batch = batches[bn];
              setBulkRun({ done: bn * BULK_BATCH, total: lines.length, failed: failed, cat: bulkCatArg });
              setFormMsg("🔍 Rating " + (bn * BULK_BATCH + 1) + "–" + (bn * BULK_BATCH + batch.length) + " of " + lines.length + "…");
              try {
                var prompt = "I have a list of food items to add to a meal planning app. For each item, find the closest nutritional match and assign a RAG colour rating.\n\nRating rules:\n- GREAT (green): Fits well within daily targets, healthy choice\n- AMBER: Acceptable but has some nutritional concerns\n- RED: Should be limited — high in sat fat, sugar, or calories\n\nClassification: 'packaged' if pre-made supermarket product, 'ingredient' if home-made recipe. If 'ingredient', list individual ingredients needed.\n\nPerson's profile: " + targetsStr + "\n\nItems to look up:\n" + batch.join("\n") + "\n\nReturn ONLY a JSON array. For each item: {\"name\":\"item name (corrected spelling)\",\"kcal\":number,\"protein\":number,\"fat\":number,\"satFat\":number,\"addedSugar\":added_sugar_grams_only_not_natural_sugars,\"carbs\":number,\"fibre\":number,\"salt\":number,\"rating\":\"GREAT or AMBER or RED\",\"itemType\":\"packaged or ingredient\",\"ingredients\":[],\"suitability\":\"ONE sentence\",\"matched\":true}. If cannot identify: {\"name\":\"original name\",\"matched\":false}. Per typical serving. ONLY JSON array.";
                var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", signal: token.ctrl ? token.ctrl.signal : undefined, headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }) });
                var result = await resp.json();
                if (token.cancelled) break;                                     /* D5: late results are discarded */
                var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
                var txt = ""; if (result.content) { for (var ri = 0; ri < result.content.length; ri++) { if (result.content[ri].text) txt += result.content[ri].text; } }
                var arrMatch = txt.replace(/```json|```/g, "").trim().match(/\[[\s\S]*\]/); if (!arrMatch) throw new Error("No JSON array found");
                var items = JSON.parse(arrMatch[0]);
                var batchNew = [];
                for (var bi = 0; bi < items.length; bi++) {
                  var it = items[bi];
                  if (!it.matched && it.matched !== undefined) { skippedCount++; continue; }
                  var dupeName2 = (it.name || "").toLowerCase().trim();
                  if (listItems.concat(batchNew).some(function(x) { return x.name.toLowerCase().trim() === dupeName2; })) { skippedCount++; continue; }
                  var newItem = withRuleRating({ id: "custom_" + Date.now() + "_" + bn + "_" + bi, name: it.name || "Unknown", jcKcal: it.kcal || 0, beckKcal: it.kcal || 0, protein: it.protein || 0, fat: it.fat || 0, satFat: it.satFat || 0, addedSugar: it.addedSugar || 0, carbs: it.carbs || 0, fibre: it.fibre || 0, salt: it.salt || 0, rating: it.rating || "AMBER", itemType: it.itemType || "packaged", ingredients: it.ingredients || [], freq: "Daily", isCustom: true, suitability: it.suitability || "", checkMe: true }); /* D11: rule rating */
                  if (bulkCatArg === "dinner") { newItem.jcProt = it.protein; newItem.beckProt = it.protein; newItem.jcFat = it.fat; newItem.beckFat = it.fat; newItem.time = 30; newItem.shop = it.itemType === "ingredient" ? (it.ingredients || []) : [it.name]; }
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
            var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }) });
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
          var recheckNutrition = async function() {
            if (listJob) return;
            if (!confirm("Re-check nutrition for recipe items? Values are NOT changed; doubtful items are marked \"Check me\" for you to open and review.")) return;
            setListJob("recheck"); setRagRecalcMsg("Re-checking nutrition…");
            try {
              var checked = 0, flagged = 0;
              for (var ci = 0; ci < LIST_CATS.length; ci++) {
                var c = LIST_CATS[ci]; var list = bulkListFor(c).slice();
                var recipes = list.filter(function(x) { return (x.ingredients || []).length > 0; }); if (!recipes.length) continue;
                var verdict = {};
                await inBatches(recipes, 10, async function(batch, off) {
                  setRagRecalcMsg("Re-checking " + catLabel(c) + " (" + (off + 1) + "–" + (off + batch.length) + " of " + recipes.length + ")…");
                  var arr = await askJsonArray("For each recipe below, add up the calories of the WHOLE recipe exactly as listed (do not divide into servings; assume typical amounts where none are given). Recipes: " + batch.map(function(x) { return x.id + ": " + stripKcalName(x.name) + " = " + x.ingredients.join(", "); }).join(" | ") + ". Return ONLY a JSON array: [{\"id\":\"item_id\",\"kcal\":total,\"breakdownSum\":sum_of_ingredient_kcal}]");
                  arr.forEach(function(r) { if (r && r.id != null) verdict[r.id] = r; });
                });
                var touched = false;
                var out = list.map(function(x) {
                  var v = verdict[x.id]; if (!v) return x; checked++;
                  var stored = x.jcKcal || x.kcal || 0; var ref = Math.max(parseFloat(v.kcal) || 0, parseFloat(v.breakdownSum) || 0);
                  if (ref > 0 && (stored < ref * 0.8 || stored > ref * 1.25)) { flagged++; touched = true; return Object.assign({}, x, { checkMe: true, checkReason: "Nutrition looks off: saved " + stored + " kcal, ingredients add up to about " + Math.round(ref) + " kcal. Open it and Confirm to recalculate." }); }
                  return x;
                });
                if (touched) { bulkSetterFor(c)(out); await sSet(bulkKeyFor(c), JSON.stringify(out)); }
              }
              setRagRecalcMsg("✅ Re-checked " + checked + " recipe items: " + flagged + " look doubtful (marked Check me). Nothing else was changed.");
            } catch(e) { setRagRecalcMsg("Error: " + (window.isEnergyEmpty(e) ? window.energyEmptyMsg : String(e.message || e).substring(0, 100))); }
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
            var nd = reconcile(doc, view, _listLookup, { weekStart: ws, isJC: person === "jc", source: source, otherChildren: otherChildren });
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

          var MealSelect = function(props) {
            var items = props.items; var value = props.value; var onChange = props.onChange; var placeholder = props.placeholder || "Select...";
            var _s = React.useState(""); var search = _s[0]; var setSearch = _s[1];
            var _o = React.useState(false); var open = _o[0]; var setOpen = _o[1];
            var sorted = items.slice().sort(function(a,b) { return a.name.localeCompare(b.name); });
            var filtered = search ? sorted.filter(function(it) { return it.name.toLowerCase().indexOf(search.toLowerCase()) >= 0; }) : sorted;
            var selected = value ? items.find(function(it) { return it.id === value; }) : null;
            var displayName = value && value !== "__empty__" ? selectionName(value, props.snap, selected || allItemsLookup[value] || allItemsLookup["gb_" + value]) : null; // D6: never the raw id
            var inputRef = React.useRef(null);
            var pickerPhone = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(max-width: 600px)").matches;
            var readVV = function() { var v = typeof window !== "undefined" && window.visualViewport; return v ? { top: v.offsetTop, height: v.height } : { top: 0, height: typeof window !== "undefined" ? window.innerHeight : 600 }; };
            var _vv = React.useState(readVV); var vv = _vv[0]; var setVV = _vv[1];
            React.useEffect(function() {
              if (!open || !pickerPhone || !window.visualViewport) return;
              var onVV = function() { setVV(readVV()); };
              onVV(); window.visualViewport.addEventListener("resize", onVV); window.visualViewport.addEventListener("scroll", onVV);
              return function() { window.visualViewport.removeEventListener("resize", onVV); window.visualViewport.removeEventListener("scroll", onVV); };
            }, [open, pickerPhone, setVV]);
            if (!open) {
              return (<div style={{position:"relative"}}>
                <div onClick={function(){setOpen(true);setSearch("");setTimeout(function(){if(inputRef.current)inputRef.current.focus();},50);}} style={{width:"100%",padding:"8px 10px",border:"1px solid #e2e8f0",borderRadius:6,fontSize:11,background:"#fff",cursor:"pointer",boxSizing:"border-box",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  {(function() { var it = value && value !== "__empty__" ? (selected || allItemsLookup[value]) : null; var rc = !displayName ? "#94a3b8" : !it || !it.rating ? "#0f172a" : it.rating === "RED" ? "#dc2626" : it.rating === "AMBER" ? "#d97706" : "#15803d"; /* D14: the selection's own (child) RAG colour, as in the lists */ return <span data-testid="selected-item" data-rag={it && it.rating ? it.rating : ""} title={it && it.ragReason ? it.ragReason : ""} style={{ color: rc, fontWeight: it && it._child ? 600 : 400 }}>{displayName || placeholder}</span>; })()}
                  <span style={{fontSize:8,color:"#94a3b8"}}>▼</span>
                </div>
              </div>);
            }
            var rowsEl = (<>
                {filtered.map(function(item) { var kcal = isJC ? item.jcKcal : item.beckKcal; var isAdded = item._isCustom !== false; var color = isAdded ? (item.rating === "RED" ? "#dc2626" : item.rating === "AMBER" ? "#d97706" : "#15803d") : "#94a3b8"; var hasRagChange = item._ragChanged && !item._ragChangedSeen; return (<div key={item.id} onMouseDown={function(e){e.preventDefault();onChange({target:{value:item.id}});setOpen(false);setSearch("");}} style={{padding:"6px 10px",fontSize:11,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #f8fafc",color:color}}>
                  <span>{hasRagChange ? "🔄 " : ""}{item.name} ({kcal} kcal){!isAdded ? " — not added" : ""}{item.checkMe && <span data-testid="check-me" title={item.checkReason || "Added by bulk upload: open and save it once you have checked it"} style={{ marginLeft: 4, fontSize: 9, fontWeight: 600, color: "#64748b", border: "1px solid #cbd5e1", borderRadius: 4, padding: "0 4px", whiteSpace: "nowrap" }}>Check me</span>}{hasRagChange ? " (was " + item.prevRating + ")" : ""}</span>

                </div>); })}
                <div onMouseDown={function(e){e.preventDefault();onChange({target:{value:"__add_new__", searchText: search}});setOpen(false);setSearch("");}} style={{padding:"8px 10px",fontSize:11,fontWeight:600,color:accent,cursor:"pointer",borderTop:"1px solid #e2e8f0"}}>+ Add new item...</div>
            </>);
            /* D16: on phones the picker is a full-height sheet sized to the VISIBLE viewport (visualViewport), search at the
               top and results straight under it, so the keyboard can never cover the list. */
            if (pickerPhone) {
              return (<div role="dialog" aria-label="Choose an item" data-testid="picker-sheet" style={{position:"fixed",left:0,right:0,top:vv.top,height:vv.height,zIndex:95,background:"#fff",display:"flex",flexDirection:"column",boxShadow:"0 -4px 24px rgba(0,0,0,0.2)"}}>
                <div style={{display:"flex",gap:6,padding:"10px 12px",borderBottom:"1px solid #e2e8f0",alignItems:"center"}}>
                  <input ref={inputRef} value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="Type to search..." aria-label="Search items" style={{flex:1,minWidth:0,padding:"10px 12px",border:"1px solid "+accent,borderRadius:8,fontSize:16,background:"#fff",boxSizing:"border-box"}} />
                  <button onClick={function(){setOpen(false);setSearch("");}} style={{padding:"10px 12px",background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:8,fontSize:12,fontWeight:600,color:"#475569",cursor:"pointer"}}>Close</button>
                </div>
                <div data-testid="picker-results" style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>{rowsEl}</div>
              </div>);
            }
            return (<div style={{position:"relative"}}>
              <input ref={inputRef} value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="Type to search..." style={{width:"100%",padding:"8px 10px",border:"1px solid "+accent,borderRadius:6,fontSize:11,background:"#fff",boxSizing:"border-box"}} onBlur={function(){setTimeout(function(){setOpen(false);},200);}} />
              <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:50,background:"#fff",border:"1px solid #e2e8f0",borderRadius:6,maxHeight:200,overflowY:"auto",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
                {rowsEl}
              </div>
            </div>);
          };

          return (<div>
          {/* Week header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button onClick={function() { setWeekOff(function(o) { return o - 1; }); }} style={{ background: "#e2e8f0", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>&lsaquo;</button>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800 }}>Week {Math.floor((weekStart - new Date(2026, 6, 19)) / (7*24*60*60*1000)) + 1}</div><div style={{ fontSize: 10, color: "#64748b" }}>{weekLabel}</div></div>
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
          {ragRecalcMsg && (<div style={{ background: ragRecalcMsg.startsWith("✅") ? "#f0fdf4" : ragRecalcMsg.startsWith("Error") ? "#fef2f2" : "#eff6ff", border: "1px solid " + (ragRecalcMsg.startsWith("✅") ? "#86efac" : ragRecalcMsg.startsWith("Error") ? "#fecaca" : "#93c5fd"), borderRadius: 8, padding: "8px 12px", marginTop: 8, fontSize: 11, color: ragRecalcMsg.startsWith("✅") ? "#166534" : ragRecalcMsg.startsWith("Error") ? "#dc2626" : "#1e40af", display: "flex", alignItems: "center", gap: 8 }}>
            {ragRecalcLoading && <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #93c5fd", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />}
            <span>{ragRecalcMsg}</span>
            {!ragRecalcLoading && <button onClick={function(){ setRagRecalcMsg(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#94a3b8", marginLeft: "auto", padding: 0 }}>✕</button>}
          </div>)}

          {/* My Eating Lists — collapsible */}
          {manageListsOpen && (<div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: 14, marginTop: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>🍽️ My Eating Lists</div>
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
                    var color = item.rating === "RED" ? "#dc2626" : item.rating === "AMBER" ? "#d97706" : "#15803d";
                    var hasRagChange = item._ragChanged && !item._ragChangedSeen;
                    return (<div key={item.id}><div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid #f1f5f9", fontSize: 11 }}>
                      <span style={{ flex: 1, color: color }}>{hasRagChange && <span onClick={function(){alert("Rating changed from " + (item.prevRating || "?") + " to " + item.rating + (item.ragReason ? ".\n\nReason: " + item.ragReason : "") + "\n\nBased on your current health profile and dietary guidelines.");var u=cat.customs.map(function(x){return x.id===item.id?Object.assign({},x,{_ragChangedSeen:true}):x;});cat.setCustoms(u);sSet(cat.storageKey,JSON.stringify(u));}} style={{cursor:"pointer"}} title={"Changed from " + (item.prevRating || "?")}>🔄 </span>}{item.name} ({kcal} kcal){item.checkMe && <span data-testid="check-me" title={item.checkReason || "Added by bulk upload: open and save it once you have checked it"} style={{ marginLeft: 4, fontSize: 9, fontWeight: 600, color: "#64748b", border: "1px solid #cbd5e1", borderRadius: 4, padding: "0 4px", whiteSpace: "nowrap" }}>Check me</span>}</span>
                      <button onClick={function() { if (editingItem === item.id) { setEditingItem(null); setEditDraft(null); } else { setEditingItem(item.id); setEditDraft(Object.assign({}, item, { originalIngredients: (item.ingredients || []).join(", "), recalculated: false })); } setFormMsg(""); }} style={{...btnEdit, fontSize: 9, marginRight: 4}}>{editingItem === item.id ? "Cancel" : "✎ Update"}</button><button onClick={async function() { if(confirm("Delete " + item.name + "?")) { var u = cat.customs.filter(function(x){return x.id !== item.id;}); cat.setCustoms(u); await sSet(cat.storageKey, JSON.stringify(u)); setFormMsg("Deleted " + item.name); setTimeout(function(){setFormMsg("");},2000); }}} style={{...btnDelete, fontSize: 9}}>🗑 Del</button>
                    </div>
                    {editingItem === item.id && editDraft && editDraft.id === item.id && (<div style={{ background: "#f0fdf4", borderRadius: 8, padding: 10, margin: "4px 0 8px", border: "1px solid #86efac" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Update Item</div>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginBottom: 2 }}>Name</div>
                        <input id={"edit-item-name-" + item.id} defaultValue={editDraft.name} style={{ width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, boxSizing: "border-box" }} />
                      </div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 10, flexWrap: "wrap" }}>
                        <span><b>{isJC ? editDraft.jcKcal : editDraft.beckKcal}</b> kcal</span>
                        <span><b>{editDraft.protein || 0}g</b> prot</span>
                        <span><b>{editDraft.fat || 0}g</b> fat</span>
                        {editDraft.satFat > 0 && <span><b>{editDraft.satFat}g</b> s/fat</span>}
                        {editDraft.carbs > 0 && <span><b>{editDraft.carbs}g</b> carbs</span>}
                        {editDraft.fibre > 0 && <span><b>{editDraft.fibre}g</b> fibre</span>}
                      </div>
                      <div style={{ marginBottom: 8 }}><div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: editDraft.rating === "RED" ? "#fef2f2" : editDraft.rating === "AMBER" ? "#fffbeb" : "#f0fdf4", color: editDraft.rating === "RED" ? "#dc2626" : editDraft.rating === "AMBER" ? "#d97706" : "#15803d", border: "1px solid " + (editDraft.rating === "RED" ? "#fecaca" : editDraft.rating === "AMBER" ? "#fcd34d" : "#86efac") }}>{editDraft.rating}</div></div>
                      {editDraft.suitability && <div style={{ fontSize: 10, color: "#475569", fontStyle: "italic", lineHeight: 1.4, marginBottom: 8 }}>{editDraft.suitability}</div>}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Type</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {[{k:"packaged",l:"📦 Packaged"},{k:"ingredient",l:"🍳 Ingredient Prepared"}].map(function(t) { var on = (editDraft.itemType || "packaged") === t.k; return (<button key={t.k} onClick={function() { setEditDraft(function(prev) { return Object.assign({}, prev, { itemType: t.k }); }); }} style={{ flex: 1, padding: "6px 8px", border: "1px solid " + (on ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: on ? "#eff6ff" : "#fff", color: on ? "#1e3a5f" : "#94a3b8" }}>{t.l}</button>); })}
                        </div>
                      </div>
                      {editDraft.itemType === "ingredient" && (<div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>🧾 Ingredients <span style={{ fontWeight: 400 }}>(edit to match your recipe)</span></div>
                        <textarea id={"edit-item-ingredients-" + item.id} defaultValue={(editDraft.ingredients || []).join(", ")} style={{ width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 10, minHeight: 50, resize: "vertical", boxSizing: "border-box", lineHeight: 1.4 }} placeholder="e.g. oats (85g), almond milk (300ml)..." />
                        <div style={{ fontSize: 8, color: "#64748b", marginTop: 3, fontStyle: "italic" }}>Any changes to ingredients or portions will update nutritional values when confirmed</div>
                      </div>)}
                      {formMsg && <div style={{ padding: 8, borderRadius: 6, marginBottom: 8, fontSize: 11, fontWeight: 600, lineHeight: 1.4, background: formMsg.indexOf("✅") === 0 ? "#dcfce7" : formMsg.indexOf("🔄") === 0 ? "#e0f2fe" : "#fee2e2", color: formMsg.indexOf("✅") === 0 ? "#166534" : formMsg.indexOf("🔄") === 0 ? "#0c4a6e" : "#991b1b" }}>{formMsg}</div>}
                      <div style={{ display: "flex", gap: 6 }}>
                        <button disabled={formMsg.indexOf("🔄") === 0} onClick={function() { saveEditItem(cat); }} style={{...btnActionLg, flex: 1, borderRadius: 6, opacity: formMsg.indexOf("🔄") === 0 ? 0.5 : 1}}>{formMsg.indexOf("🔄") === 0 ? "Recalculating…" : editDraft.recalculated ? "✓ Continue — Save" : "✓ Confirm"}</button>
                        <button onClick={function() { if (editDraft.recalculated) { setEditDraft(function(prev) { return Object.assign({}, prev, { recalculated: false }); }); } else { setEditingItem(null); setEditDraft(null); } setFormMsg(""); }} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, cursor: "pointer" }}>{editDraft.recalculated ? "Edit Again" : "Cancel"}</button>
                      </div>
                    </div>)}
                    </div>);
                  })}
                  {cat.customs.length === 0 && <div style={{ fontSize: 10, color: "#94a3b8", padding: 4 }}>No custom items yet</div>}
                </div>);
              })}

              {/* Single add item section for manage lists */}
              <button onClick={function(){ openAddForm("", "manage"); }} style={{...btnMuted, marginTop: 4}}>+ Add New Item to Lists</button>
              {addingNew && (addingSource === "top" || addingSource === "manage") && (<div id="add-item-form-manage" style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 6, marginBottom: 8, border: "1px solid #bfdbfe", overflow: "hidden" }}>
                <div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Item</span></div>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. Costa Rocky Road, Protein shake..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, boxSizing: "border-box" }} />
                  <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>
                    📷
                    <input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} />
                  </label>
                  <button onClick={function() { if (bulkReviewItems) { cancelBulk(); } else { setBulkCat(""); setBulkRun(null); setBulkReviewItems("paste"); } }} style={{ padding: "6px 8px", background: bulkReviewItems === "paste" ? "#dbeafe" : "#f0f9ff", border: "1px solid " + (bulkReviewItems === "paste" ? "#2563eb" : "#bae6fd"), borderRadius: 6, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, color: "#1e3a5f", fontWeight: 600 }} title="Paste multiple items to bulk add">📋 Bulk</button>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={function() { setOffResults([]); addNewItem(); }} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? <span>Adding <span className="loading-dots" dangerouslySetInnerHTML={{ __html: "<span>.</span><span>.</span><span>.</span>" }} /></span> : "Add"}</button>
                  <button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button>
                </div>
                <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish. Select a result below or click Add for AI lookup.</div>
                {(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                  {offLoading && <div style={{ padding: "8px 10px", fontSize: 10, color: "#94a3b8" }}>🔍 Searching Open Food Facts...</div>}
                  {offResults.map(function(prod, pi) {
                    var ragColor = calcRAG(prod) === "RED" ? "#dc2626" : calcRAG(prod) === "AMBER" ? "#d97706" : "#16a34a";
                    return (<div key={pi} onClick={function() {
                      var rating = calcRAG(prod);
                      var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : [];
                      setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "per 100g · from Open Food Facts (UK)", category: addingCategory });
                      setReviewCategories(addingCategory ? [addingCategory] : []);
                      setOffResults([]); setOffSearchTerm(""); setNewItemName("");
                    }} style={{ padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }} onMouseOver={function(e){e.currentTarget.style.background="#f0f9ff";}} onMouseOut={function(e){e.currentTarget.style.background="#fff";}}>
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span>
                      <span style={{ display: "flex", gap: 6, flexShrink: 0, color: "#64748b" }}>
                        <span><b>{prod.kcal}</b>kcal</span>
                        <span><b>{prod.protein}g</b>prot</span>
                        <span style={{ color: ragColor, fontWeight: 700 }}>{calcRAG(prod)}</span>
                      </span>
                    </div>);
                  })}
                  {offResults.length > 0 && <div style={{ padding: "4px 10px", fontSize: 8, color: "#94a3b8", textAlign: "center" }}>Data from Open Food Facts · Open Database License</div>}
                </div>)}
              </div>)}

              {/* Single review form — shown once after add */}
              {cameraPreview && (<div style={{ background: "#f0fdf4", borderRadius: 8, padding: 10, marginTop: 6, border: "1px solid #86efac" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Review Item</div>
                  <button onClick={function() { setCameraPreview(null); setReviewCategories([]); setReviewSideType(""); }} style={{...btnClose, fontSize: 14, padding: "4px 8px"}}>✕</button>
                </div>
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginBottom: 2 }}>Name</div>
                  <input id="review-item-name" defaultValue={cameraPreview.name} style={{ width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 10, flexWrap: "wrap" }}>
                  <span><b>{cameraPreview.kcal}</b> kcal</span>
                  <span><b>{cameraPreview.protein}g</b> prot</span>
                  <span><b>{cameraPreview.fat}g</b> fat</span>
                  {cameraPreview.satFat > 0 && <span><b>{cameraPreview.satFat}g</b> s/fat</span>}
                  {cameraPreview.carbs > 0 && <span><b>{cameraPreview.carbs}g</b> carbs</span>}
                  {cameraPreview.fibre > 0 && <span><b>{cameraPreview.fibre}g</b> fibre</span>}
                </div>
                <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: cameraPreview.rating === "RED" ? "#fef2f2" : cameraPreview.rating === "AMBER" ? "#fffbeb" : "#f0fdf4", color: cameraPreview.rating === "RED" ? "#dc2626" : cameraPreview.rating === "AMBER" ? "#d97706" : "#15803d", border: "1px solid " + (cameraPreview.rating === "RED" ? "#fecaca" : cameraPreview.rating === "AMBER" ? "#fcd34d" : "#86efac") }}>{cameraPreview.rating}</div>
                </div>
                {cameraPreview.suitability && <div style={{ fontSize: 10, color: "#475569", fontStyle: "italic", lineHeight: 1.4, marginBottom: 8 }}>{cameraPreview.suitability}</div>}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Type</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={function() { setCameraPreview(function(prev) { return Object.assign({}, prev, { itemType: "packaged" }); }); }} style={{ flex: 1, padding: "6px 8px", border: "1px solid " + (cameraPreview.itemType === "packaged" ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: cameraPreview.itemType === "packaged" ? "#eff6ff" : "#fff", color: cameraPreview.itemType === "packaged" ? "#1e3a5f" : "#94a3b8" }}>📦 Packaged</button>
                    <button onClick={function() { setCameraPreview(function(prev) { return Object.assign({}, prev, { itemType: "ingredient" }); }); }} style={{ flex: 1, padding: "6px 8px", border: "1px solid " + (cameraPreview.itemType === "ingredient" ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: cameraPreview.itemType === "ingredient" ? "#eff6ff" : "#fff", color: cameraPreview.itemType === "ingredient" ? "#1e3a5f" : "#94a3b8" }}>🍳 Ingredient Prepared</button>
                  </div>
                </div>
                {cameraPreview.itemType === "ingredient" && (<div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>🧾 Ingredients <span style={{ fontWeight: 400 }}>(edit to match your recipe)</span></div>
                  <textarea id="review-item-ingredients" defaultValue={(cameraPreview.ingredients || []).join(", ")} style={{ width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 10, minHeight: 50, resize: "vertical", boxSizing: "border-box", lineHeight: 1.4 }} placeholder="e.g. oats, milk, chia seeds, honey..." />
                  <div style={{ fontSize: 8, color: "#64748b", marginTop: 3, fontStyle: "italic" }}>Any changes to ingredients or portions will update nutritional values when confirmed</div>
                </div>)}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Add to categories</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {["breakfast","lunch","dinner","snack","dessert","drink"].map(function(c) {
                      var sel = reviewCategories.indexOf(c) >= 0;
                      return (<button key={c} onClick={function() { setReviewCategories(function(prev) { return sel ? prev.filter(function(x){return x!==c;}) : prev.concat([c]); }); }} style={{ padding: "5px 10px", border: "1px solid " + (sel ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: sel ? "#eff6ff" : "#fff", color: sel ? "#1e3a5f" : "#94a3b8", textTransform: "capitalize" }}>{sel ? "✓ " : ""}{c}</button>);
                    })}
                  </div>
                </div>
                {reviewCategories.indexOf("dinner") >= 0 && (<div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Is this a dinner side dish?</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {[{k:"",label:"No — main dish"},{k:"potato",label:"🥔 Potato side"},{k:"veg",label:"🥦 Veg side"},{k:"salad",label:"🥗 Salad side"}].map(function(st) {
                      var sel = reviewSideType === st.k;
                      return (<button key={st.k} onClick={function() { setReviewSideType(st.k); }} style={{ padding: "5px 8px", border: "1px solid " + (sel ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: sel ? "#eff6ff" : "#fff", color: sel ? "#1e3a5f" : "#94a3b8" }}>{st.label}</button>);
                    })}
                  </div>
                </div>)}
                {formMsg && <div style={{ padding: 8, borderRadius: 6, marginBottom: 8, fontSize: 11, fontWeight: 600, lineHeight: 1.4, background: formMsg.indexOf("✅") === 0 ? "#dcfce7" : formMsg.indexOf("🔄") === 0 ? "#e0f2fe" : "#fee2e2", color: formMsg.indexOf("✅") === 0 ? "#166534" : formMsg.indexOf("🔄") === 0 ? "#0c4a6e" : "#991b1b" }}>{formMsg}</div>}
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
                <textarea id="bulk-paste-textarea" placeholder={"e.g.\nOvernight oats\nGreek yogurt\nChicken wrap\nProtein shake"} style={{ width: "100%", padding: "8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, minHeight: 80, resize: "vertical", boxSizing: "border-box", lineHeight: 1.5, marginBottom: 8 }} />
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Add to category</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {["breakfast","lunch","dinner","snack","dessert","drink"].map(function(c) {
                      var sel = bulkCat === c;
                      return (<button key={c} disabled={newItemLoading} onClick={function() { setBulkCat(c); }} style={{ padding: "5px 10px", border: "1px solid " + (sel ? "#2563eb" : "#e2e8f0"), borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: sel ? "#eff6ff" : "#fff", color: sel ? "#1e3a5f" : "#94a3b8", textTransform: "capitalize" }}>{sel ? "✓ " : ""}{c}</button>);
                    })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button disabled={!bulkCat || newItemLoading} onClick={function() { bulkPasteAdd(bulkCat); }} style={{...btnActionLg, flex: 1, borderRadius: 6, opacity: !bulkCat ? 0.5 : 1}}>{newItemLoading ? <span>Uploading <span className="loading-dots" dangerouslySetInnerHTML={{ __html: "<span>.</span><span>.</span><span>.</span>" }} /></span> : !bulkCat ? "Choose a category first" : "Upload Items"}</button>
                  {bulkRun && bulkRun.failed && bulkRun.failed.length > 0 && !newItemLoading && <button onClick={function() { bulkPasteAdd(bulkRun.cat, bulkRun.failed); }} style={{...btnActionLg, borderRadius: 6}}>Retry {bulkRun.failed.length}</button>}
                  <button onClick={cancelBulk} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>)}
          </div>)}

          {!manageListsOpen && <div style={{ height: 10 }} />}

          {/* Defaults panel */}
          

          {/* Day tabs */}
          <div style={{ display: "flex", gap: 0, background: accentMid, borderRadius: "8px 8px 0 0", padding: 2, marginBottom: 0 }}>
            <button key="week" onClick={function(){setEatDay("week"); setEatDayEyeOpen(false); setEatDayChartOpen(false); setEatWeekEyeOpen(false); setCopyDayOpen(false); setCopyWeekOpen(false);}} style={{flex:1,padding:"6px 2px",border:"none",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer",background:eatDay==="week"?"#fff":"transparent",color:eatDay==="week"?"#0f172a":"rgba(255,255,255,0.7)",lineHeight:1.2}}>Week</button>
            {DAYS.map(function(d) {
              var dk = getDayKcal(d);
              return (<button key={d} onClick={function() { setEatDay(d); setEatDayEyeOpen(false); setEatDayChartOpen(false); setEatWeekEyeOpen(false); setCopyDayOpen(false); setCopyWeekOpen(false); }} style={{ flex: 1, padding: "6px 2px", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: eatDay === d ? "#fff" : "transparent", color: eatDay === d ? "#0f172a" : "rgba(255,255,255,0.7)", lineHeight: 1.2 }}><div>{DAY_LABELS[d]}</div>{dk > 0 && <div style={{ fontSize: 8, color: dk > (isJC ? 2200 : 1900) ? "#dc2626" : "#16a34a" }}>{dk}</div>}</button>);
            })}
          </div>

                    
          

          {eatDay === "week" && (<div style={{ background: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #e2e8f0", borderTop: "none", padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "nowrap", gap: 6 }}><span style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", minWidth: 0, flexShrink: 1 }}>My Week{(() => {
              var totalKcal2 = 0; var dayCount2 = 0;
              DAYS.forEach(function(d) { var dk = getDayKcal(d); if (dk > 0) { totalKcal2 += dk; dayCount2++; } });
              var avg2 = dayCount2 > 0 ? Math.round(totalKcal2 / dayCount2) : 0;
              var limit2 = isJC ? 2200 : 1900;
              var color2 = avg2 === 0 ? "#94a3b8" : avg2 > limit2 ? "#dc2626" : "#16a34a";
              return avg2 > 0 ? (<span style={{ fontSize: 11, fontWeight: 600, color: color2 }}> — Avg {avg2} kcal/day</span>) : null;
            })()}</span><div style={{ display: "flex", gap: 4, flexShrink: 0 }}><button onClick={function(){ setCopyWeekOpen(!copyWeekOpen); setCopyWeekTargets({}); }} style={Object.assign({}, copyWeekOpen ? btnClose : btnAction)}>{copyWeekOpen ? "✕" : <span>📋 Copy Week</span>}</button><button onClick={function(){setEatWeekEyeOpen(!eatWeekEyeOpen);}} style={Object.assign({}, eatWeekEyeOpen ? btnClose : btnAction)}>{eatWeekEyeOpen ? "✕" : "👁 Progress"}</button></div></div>

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
                <button onClick={function(){setEatWeekEyeOpen(false);}} style={{ padding: "2px 8px", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", border: "none", borderRadius: 4, fontSize: 12, color: "#fff", cursor: "pointer", lineHeight: 1 }}>✕</button>
              </div>
              {(function() {
                var isJC = activeTab === "jc";
                var kf = isJC ? "jcKcal" : "beckKcal";
                var pf = isJC ? "jcProt" : "beckProt";
                var ff = isJC ? "jcFat" : "beckFat";
                var limKcal = isJC ? 2200 : 1900;
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
                  var ragColor = inRange >= 5 ? "#16a34a" : inRange >= 3 ? "#f59e0b" : "#dc2626";
                  return { day: day, kcal: tKcal, prot: tProt, sfat: tSfat, carbs: tCarbs, fib: tFib, salt: tSalt, conKcal: tKcal, conProt: tProt, conSfat: tSfat, conCarbs: tCarbs, conFib: tFib, conSalt: tSalt, ragColor: ragColor, inRange: inRange };
                });
                return (<div>
                  <div style={{ overflowX: "auto", width: "100%", boxSizing: "border-box" }}><table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup><col style={{ width: "30%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "8%" }} /><col style={{ width: "8%" }} /><col style={{ width: "14%" }} /></colgroup>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                        <th style={{ padding: "4px 2px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Day</th>
                        <th style={{ padding: "4px 2px", color: "#64748b", textAlign: "right" }}>kcal</th>
                        <th style={{ padding: "4px 2px", color: "#64748b", textAlign: "right" }}>prot</th>
                        <th style={{ padding: "4px 2px", color: "#64748b", textAlign: "right" }}>s/fat</th>
                        <th style={{ padding: "4px 2px", color: "#64748b", textAlign: "right" }}>carbs</th>
                        <th style={{ padding: "4px 2px", color: "#64748b", textAlign: "right" }}>fib</th>
                        <th style={{ padding: "4px 2px", color: "#64748b", textAlign: "right" }}>salt</th>
                        <th style={{ padding: "4px 2px", color: "#64748b", textAlign: "center" }}>Rating</th>
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
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{dr.kcal}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{dr.prot || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{Math.round(dr.sfat * 10) / 10 || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{dr.carbs || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{dr.fib || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{Math.round(dr.salt * 10) / 10 || "-"}</td>
                              <td></td>
                            </tr>);
                          })}
                          <tr style={{ borderBottom: "1px solid #cbd5e1" }}><td style={{ padding: "3px 2px", fontWeight: 600, fontSize: 9, color: "#475569" }}>{cs.label} total</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{cs.weekKcal}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{cs.weekProt || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{Math.round(cs.weekSfat * 10) / 10 || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{cs.weekCarbs || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{cs.weekFib || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{Math.round(cs.weekSalt * 10) / 10 || "-"}</td><td></td></tr>
                        </React.Fragment>);
                      })}
                      <tr><td colSpan={8} style={{ padding: "8px 2px 2px", fontWeight: 700, color: "#0f172a", fontSize: 11 }}>Daily Totals</td></tr>
                      {dayGrandTotals.map(function(dg) {
                        if (dg.kcal === 0 && dg.conKcal === 0) return null;
                        return (<tr key={dg.day} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "3px 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", marginRight: 4, background: dg.ragColor, verticalAlign: "middle" }}></span>{dg.day.charAt(0).toUpperCase() + dg.day.slice(1, 3)}</td>
                          <td style={{ padding: "3px 2px", textAlign: "right" }}>{dg.kcal}</td>
                          <td style={{ padding: "3px 2px", textAlign: "right" }}>{dg.prot || "-"}</td>
                          <td style={{ padding: "3px 2px", textAlign: "right" }}>{Math.round(dg.sfat * 10) / 10 || "-"}</td>
                          <td style={{ padding: "3px 2px", textAlign: "right" }}>{dg.carbs || "-"}</td>
                          <td style={{ padding: "3px 2px", textAlign: "right" }}>{dg.fib || "-"}</td>
                          <td style={{ padding: "3px 2px", textAlign: "right" }}>{Math.round(dg.salt * 10) / 10 || "-"}</td>
                          <td style={{ padding: "3px 2px", textAlign: "center", fontSize: 9 }}>{dg.inRange}/6</td>
                        </tr>);
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#e0f2fe", borderTop: "2px solid #0f172a" }}>
                        <td style={{ padding: "4px 2px", fontWeight: 700, fontSize: 11, color: "#0c4a6e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Total</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: weekTotalConsumed > limKcal * 7 ? "#dc2626" : "#0c4a6e" }}>{weekTotalConsumed}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: weekProtConsumed < (isJC ? 110 : 90) * 7 ? "#dc2626" : "#0c4a6e" }}>{weekProtConsumed || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: weekSfatConsumed > 20 * 7 ? "#dc2626" : "#0c4a6e" }}>{Math.round(weekSfatConsumed * 10) / 10 || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: weekCarbsConsumed > limCarbs * 7 ? "#dc2626" : "#0c4a6e" }}>{weekCarbsConsumed || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: weekFibConsumed < (isJC ? 30 : 25) * 7 ? "#dc2626" : "#0c4a6e" }}>{weekFibConsumed || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: weekSaltConsumed > 6 * 7 ? "#dc2626" : "#0c4a6e" }}>{Math.round(weekSaltConsumed * 10) / 10 || "-"}</td>
                        <td></td>
                      </tr>
                      <tr style={{ background: "#f1f5f9" }}>
                        <td style={{ padding: "4px 2px", fontWeight: 700, fontSize: 10, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Recommended</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{limKcal * 7}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{limProt * 7}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{limSfat * 7}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{limCarbs * 7}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{limFib * 7}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{limSalt * 7}</td>
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
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: dKcal > 0 ? "#dc2626" : "#0c4a6e" }}>{(dKcal > 0 ? "+" : "") + dKcal}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: dProt < 0 ? "#dc2626" : "#0c4a6e" }}>{(dProt > 0 ? "+" : "") + dProt}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: dSfat > 0 ? "#dc2626" : "#0c4a6e" }}>{(dSfat > 0 ? "+" : "") + Math.round(dSfat * 10) / 10}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: dCarbs > 0 ? "#dc2626" : "#0c4a6e" }}>{(dCarbs > 0 ? "+" : "") + dCarbs}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: dFib < 0 ? "#dc2626" : "#0c4a6e" }}>{(dFib > 0 ? "+" : "") + dFib}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: dSalt > 0 ? "#dc2626" : "#0c4a6e" }}>{(dSalt > 0 ? "+" : "") + Math.round(dSalt * 10) / 10}</td>
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
                          React.createElement("span", { style: { position: "absolute", left: 0, fontSize: 8, color: "#94a3b8" } }, "-" + maxDev + "%"),
                          React.createElement("span", { style: { position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: 8, color: "#64748b", fontWeight: 600 } }, "Target"),
                          React.createElement("span", { style: { position: "absolute", right: 0, fontSize: 8, color: "#94a3b8" } }, "+" + maxDev + "%")
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
                            React.createElement("span", { style: { fontSize: 9, fontWeight: 600, color: dev === 0 ? "#16a34a" : barColor, width: 42, textAlign: "right", marginLeft: 4 } }, (dev > 0 ? "+" : "") + dev + "%")
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
                  <input type="number" value={quickPrepMins} onChange={function(e) { setQuickPrepMins(parseInt(e.target.value) || 20); }} style={{ width: 40, padding: "3px 6px", border: "1px solid " + accentBorder, borderRadius: 4, fontSize: 11, textAlign: "center", background: "#fff" }} />
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
              <div style={{ fontSize: 9, color: "#64748b" }}>Ticked days will only get dinners within the {quickPrepMins} min prep limit when generating</div>
            </div>

            <div style={{ background: accentLight, borderRadius: 8, padding: 12, marginBottom: 10, border: "1px solid " + accentBorder }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Set Defaults</div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>Set default meals. Use "All" to apply to all people or "Individual" for just {personName(data, activeTab)}.</div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Breakfast</span>
                <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 4, padding: 1 }}>
                  <button onClick={function() { saveDef("b", defs["b"], "individual"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["b"] || "individual") === "individual" ? "#fff" : "transparent", color: (defScopes["b"] || "individual") === "individual" ? "#0f172a" : "#94a3b8" }}>Individual</button>
                  <button onClick={function() { saveDef("b", defs["b"], "all"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["b"] || "individual") === "all" ? "#fff" : "transparent", color: (defScopes["b"] || "individual") === "all" ? "#0f172a" : "#94a3b8" }}>All</button>
                </div>
              </div>
              {(function() { var slots = []; for (var si = 1; si <= 10; si++) { var sk = si === 1 ? "b" : "b" + si; if (defs[sk] || si <= 1) slots.push(si); } return slots; })().map(function(n) {
                var slotKey = n === 1 ? "b" : "b" + n;
                return (<div key={n} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <MealSelect items={dispBfast} value={defs[slotKey] === "__placeholder__" ? "" : (defs[slotKey] || "")} onChange={function(e) { if (e.target.value === "__add_new__") { openAddForm("breakfast", "defaults", e.target.searchText, slotKey); } else { saveDef(slotKey, e.target.value, "individual"); } }} placeholder="Select breakfast..." />
                  </div>
                  {defs[slotKey] && defs[slotKey] !== "__placeholder__" && (
                    <button onClick={function(){ if (!confirm("Remove this default? This cannot be undone.")) return; saveDef(slotKey, "", "individual"); }} style={btnDelete}>🗑 Del</button>
                  )}
                </div>);
              })}
              <button onClick={function() { var next = 1; var pk = "b"; while (defs[next === 1 ? pk : pk + next]) next++; saveDef(next === 1 ? pk : pk + next, "__placeholder__", "individual"); }} style={{...btnMuted, marginTop: 4}}>+ Add New</button>
              {addingNew && addingSource === "defaults" && addingCategory === "breakfast" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 4, border: "1px solid #bfdbfe" }}><div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Breakfast Item</span></div><div style={{ display: "flex", gap: 6, marginBottom: 6 }}><input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} /><label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label></div><div style={{ display: "flex", gap: 6 }}><button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button><button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button></div><div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#94a3b8" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = calcRAG(prod) === "RED" ? "#dc2626" : calcRAG(prod) === "AMBER" ? "#d97706" : "#16a34a"; return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "per 100g · Open Food Facts", category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#64748b", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span></span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#94a3b8", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}</div>)}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Lunch</span>
                <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 4, padding: 1 }}>
                  <button onClick={function() { saveDef("l", defs["l"], "individual"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["l"] || "individual") === "individual" ? "#fff" : "transparent", color: (defScopes["l"] || "individual") === "individual" ? "#0f172a" : "#94a3b8" }}>Individual</button>
                  <button onClick={function() { saveDef("l", defs["l"], "all"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["l"] || "individual") === "all" ? "#fff" : "transparent", color: (defScopes["l"] || "individual") === "all" ? "#0f172a" : "#94a3b8" }}>All</button>
                </div>
              </div>
              {(function() { var slots = []; for (var si = 1; si <= 10; si++) { var sk = si === 1 ? "l" : "l" + si; if (defs[sk] || si <= 1) slots.push(si); } return slots; })().map(function(n) {
                var slotKey = n === 1 ? "l" : "l" + n;
                return (<div key={n} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <MealSelect items={dispLunch} value={defs[slotKey] === "__placeholder__" ? "" : (defs[slotKey] || "")} onChange={function(e) { if (e.target.value === "__add_new__") { openAddForm("lunch", "defaults", e.target.searchText, slotKey); } else { saveDef(slotKey, e.target.value, "individual"); } }} placeholder="Select lunch..." />
                  </div>
                  {defs[slotKey] && defs[slotKey] !== "__placeholder__" && (
                    <button onClick={function(){ if (!confirm("Remove this default? This cannot be undone.")) return; saveDef(slotKey, "", "individual"); }} style={btnDelete}>🗑 Del</button>
                  )}
                </div>);
              })}
              <button onClick={function() { var next = 1; var pk = "l"; while (defs[next === 1 ? pk : pk + next]) next++; saveDef(next === 1 ? pk : pk + next, "__placeholder__", "individual"); }} style={{...btnMuted, marginTop: 4}}>+ Add New</button>
              {addingNew && addingSource === "defaults" && addingCategory === "lunch" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 4, border: "1px solid #bfdbfe" }}><div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Lunch Item</span></div><div style={{ display: "flex", gap: 6, marginBottom: 6 }}><input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} /><label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label></div><div style={{ display: "flex", gap: 6 }}><button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button><button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button></div><div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#94a3b8" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = calcRAG(prod) === "RED" ? "#dc2626" : calcRAG(prod) === "AMBER" ? "#d97706" : "#16a34a"; return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "per 100g · Open Food Facts", category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#64748b", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span></span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#94a3b8", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}</div>)}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Dinner</span>
                <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 4, padding: 1 }}>
                  <button onClick={function() { saveDef("d", defs["d"], "individual"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["d"] || "individual") === "individual" ? "#fff" : "transparent", color: (defScopes["d"] || "individual") === "individual" ? "#0f172a" : "#94a3b8" }}>Individual</button>
                  <button onClick={function() { saveDef("d", defs["d"], "all"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["d"] || "individual") === "all" ? "#fff" : "transparent", color: (defScopes["d"] || "individual") === "all" ? "#0f172a" : "#94a3b8" }}>All</button>
                </div>
              </div>
              {(function() { var slots = []; for (var si = 1; si <= 10; si++) { var sk = si === 1 ? "d" : "d" + si; if (defs[sk] || si <= 1) slots.push(si); } return slots; })().map(function(n) {
                var slotKey = n === 1 ? "d" : "d" + n;
                return (<div key={n} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <MealSelect items={dispDinners} value={defs[slotKey] === "__placeholder__" ? "" : (defs[slotKey] || "")} onChange={function(e) { if (e.target.value === "__add_new__") { openAddForm("dinner", "defaults", e.target.searchText, slotKey); } else { saveDef(slotKey, e.target.value, "individual"); } }} placeholder="Select dinner..." />
                  </div>
                  {defs[slotKey] && defs[slotKey] !== "__placeholder__" && (
                    <button onClick={function(){ if (!confirm("Remove this default? This cannot be undone.")) return; saveDef(slotKey, "", "individual"); }} style={btnDelete}>🗑 Del</button>
                  )}
                </div>);
              })}
              <button onClick={function() { var next = 1; var pk = "d"; while (defs[next === 1 ? pk : pk + next]) next++; saveDef(next === 1 ? pk : pk + next, "__placeholder__", "individual"); }} style={{...btnMuted, marginTop: 4}}>+ Add New</button>
              {addingNew && addingSource === "defaults" && addingCategory === "dinner" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 4, border: "1px solid #bfdbfe" }}><div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Dinner Item</span></div><div style={{ display: "flex", gap: 6, marginBottom: 6 }}><input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} /><label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label></div><div style={{ display: "flex", gap: 6 }}><button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button><button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button></div><div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#94a3b8" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = calcRAG(prod) === "RED" ? "#dc2626" : calcRAG(prod) === "AMBER" ? "#d97706" : "#16a34a"; return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "per 100g · Open Food Facts", category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#64748b", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span></span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#94a3b8", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}</div>)}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Dessert</span>
                <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 4, padding: 1 }}>
                  <button onClick={function() { saveDef("ds", defs["ds"], "individual"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["ds"] || "individual") === "individual" ? "#fff" : "transparent", color: (defScopes["ds"] || "individual") === "individual" ? "#0f172a" : "#94a3b8" }}>Individual</button>
                  <button onClick={function() { saveDef("ds", defs["ds"], "all"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["ds"] || "individual") === "all" ? "#fff" : "transparent", color: (defScopes["ds"] || "individual") === "all" ? "#0f172a" : "#94a3b8" }}>All</button>
                </div>
              </div>
              {(function() { var slots = []; for (var si = 1; si <= 10; si++) { var sk = si === 1 ? "ds" : "ds" + si; if (defs[sk] || si <= 1) slots.push(si); } return slots; })().map(function(n) {
                var slotKey = n === 1 ? "ds" : "ds" + n;
                return (<div key={n} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <MealSelect items={dispDesserts} value={defs[slotKey] === "__placeholder__" ? "" : (defs[slotKey] || "")} onChange={function(e) { if (e.target.value === "__add_new__") { openAddForm("dessert", "defaults", e.target.searchText, slotKey); } else { saveDef(slotKey, e.target.value, "individual"); } }} placeholder="Select dessert..." />
                  </div>
                  {defs[slotKey] && defs[slotKey] !== "__placeholder__" && (
                    <button onClick={function(){ if (!confirm("Remove this default? This cannot be undone.")) return; saveDef(slotKey, "", "individual"); }} style={btnDelete}>🗑 Del</button>
                  )}
                </div>);
              })}
              <button onClick={function() { var next = 1; var pk = "ds"; while (defs[next === 1 ? pk : pk + next]) next++; saveDef(next === 1 ? pk : pk + next, "__placeholder__", "individual"); }} style={{...btnMuted, marginTop: 4}}>+ Add New</button>
              {addingNew && addingSource === "defaults" && addingCategory === "dessert" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 4, border: "1px solid #bfdbfe" }}><div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Dessert Item</span></div><div style={{ display: "flex", gap: 6, marginBottom: 6 }}><input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} /><label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label></div><div style={{ display: "flex", gap: 6 }}><button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button><button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button></div><div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#94a3b8" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = calcRAG(prod) === "RED" ? "#dc2626" : calcRAG(prod) === "AMBER" ? "#d97706" : "#16a34a"; return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "per 100g · Open Food Facts", category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#64748b", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span></span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#94a3b8", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}</div>)}
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Drink</span>
                <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 4, padding: 1 }}>
                  <button onClick={function() { saveDef("dr", defs["dr"], "individual"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["dr"] || "individual") === "individual" ? "#fff" : "transparent", color: (defScopes["dr"] || "individual") === "individual" ? "#0f172a" : "#94a3b8" }}>Individual</button>
                  <button onClick={function() { saveDef("dr", defs["dr"], "all"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["dr"] || "individual") === "all" ? "#fff" : "transparent", color: (defScopes["dr"] || "individual") === "all" ? "#0f172a" : "#94a3b8" }}>All</button>
                </div>
              </div>
              {(function() { var slots = []; for (var si = 1; si <= 10; si++) { var sk = si === 1 ? "dr" : "dr" + si; if (defs[sk] || si <= 1) slots.push(si); } return slots; })().map(function(n) {
                var slotKey = n === 1 ? "dr" : "dr" + n;
                return (<div key={n} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <MealSelect items={dispDrinks} value={defs[slotKey] === "__placeholder__" ? "" : (defs[slotKey] || "")} onChange={function(e) { if (e.target.value === "__add_new__") { openAddForm("drink", "defaults", e.target.searchText, slotKey); } else { saveDef(slotKey, e.target.value, "individual"); } }} placeholder="Select drink..." />
                  </div>
                  {defs[slotKey] && defs[slotKey] !== "__placeholder__" && (
                    <button onClick={function(){ if (!confirm("Remove this default? This cannot be undone.")) return; saveDef(slotKey, "", "individual"); }} style={btnDelete}>🗑 Del</button>
                  )}
                </div>);
              })}
              <button onClick={function() { var next = 1; var pk = "dr"; while (defs[next === 1 ? pk : pk + next]) next++; saveDef(next === 1 ? pk : pk + next, "__placeholder__", "individual"); }} style={{...btnMuted, marginTop: 4}}>+ Add New</button>
              {addingNew && addingSource === "defaults" && addingCategory === "drink" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 4, border: "1px solid #bfdbfe" }}><div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Drink Item</span></div><div style={{ display: "flex", gap: 6, marginBottom: 6 }}><input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} /><label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label></div><div style={{ display: "flex", gap: 6 }}><button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button><button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button></div><div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#94a3b8" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = calcRAG(prod) === "RED" ? "#dc2626" : calcRAG(prod) === "AMBER" ? "#d97706" : "#16a34a"; return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "per 100g · Open Food Facts", category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#64748b", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span></span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#94a3b8", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}</div>)}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Snacks</span>
                <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 4, padding: 1 }}>
                  <button onClick={function() { saveDef("o1", defs["o1"], "individual"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["o1"] || "individual") === "individual" ? "#fff" : "transparent", color: (defScopes["o1"] || "individual") === "individual" ? "#0f172a" : "#94a3b8" }}>Individual</button>
                  <button onClick={function() { saveDef("o1", defs["o1"], "all"); }} style={{ padding: "2px 8px", border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer", background: (defScopes["o1"] || "individual") === "all" ? "#fff" : "transparent", color: (defScopes["o1"] || "individual") === "all" ? "#0f172a" : "#94a3b8" }}>All</button>
                </div>
              </div>
              {(function() { var slots = []; for (var si = 1; si <= 20; si++) { if (defs["o" + si] || si <= 1) slots.push(si); } return slots; })().map(function(n) {
                var slotKey = "o" + n;
                return (<div key={n} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <MealSelect items={dispOther} value={defs[slotKey] === "__placeholder__" ? "" : (defs[slotKey] || "")} onChange={function(e) { if (e.target.value === "__add_new__") { openAddForm("snack", "defaults", e.target.searchText, slotKey); } else { saveDef(slotKey, e.target.value, "individual"); } }} placeholder="Select snack..." />
                  </div>
                  {defs[slotKey] && defs[slotKey] !== "__placeholder__" && (
                    <button onClick={function(){ if (!confirm("Remove this default? This cannot be undone.")) return; saveDef(slotKey, "", "individual"); }} style={btnDelete}>🗑 Del</button>
                  )}
                </div>);
              })}
              <button onClick={function() { var next = 1; while (defs["o" + next]) next++; saveDef("o" + next, "__placeholder__", "individual"); }} style={{...btnMuted, marginTop: 4}}>+ Add New</button>
              {addingNew && addingSource === "defaults" && addingCategory === "snack" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 4, border: "1px solid #bfdbfe" }}><div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Snack Item</span></div><div style={{ display: "flex", gap: 6, marginBottom: 6 }}><input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} /><label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label></div><div style={{ display: "flex", gap: 6 }}><button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button><button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button></div><div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#94a3b8" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = calcRAG(prod) === "RED" ? "#dc2626" : calcRAG(prod) === "AMBER" ? "#d97706" : "#16a34a"; return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "per 100g · Open Food Facts", category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#64748b", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span></span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#94a3b8", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}</div>)}
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
              var prompt = "Generate a week of meals for " + (prof.name || "user") + " (" + (isJC ? "2000-2200 kcal" : "1700-1900 kcal") + " target). Only fill EMPTY slots - keep existing selections. CRITICAL: You MUST ONLY use item IDs from the lists below - never invent new IDs. FREQUENCY RULES based on the rating in [brackets]: GREAT = any day, GOOD = daily, AMBER = a few times a week (max 3), RED-weekly = weekly treat (max once a week), RED-monthly = monthly treat (max once a month). Respect these limits strictly." + pastHistory + " Current: " + JSON.stringify(planned.meals, function(k, v) { if (k === "_snap" || k === "_notes") return undefined; var it = typeof v === "string" ? allItemsLookup[v] : null; return it && it._child ? (it.parentId || it.name) : v; }) + ". Breakfasts: " + (_can.b ? bfastList : "(none — leave breakfast slots empty)") + ". Lunches: " + (_can.l ? lunchList : "(none — leave lunch slots empty)") + ". Dinners: " + (_can.d ? dinnerList : "(none — leave dinner slots empty)") + ". Vary daily. Return ONLY JSON: " + fmt;
              var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }) });
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
          }} disabled={generating} style={{ width: "100%", padding: 12, marginTop: 12, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer", background: generating ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" }}>{generating ? <span>Generating, please wait <span className="loading-dots" dangerouslySetInnerHTML={{ __html: "<span>.</span><span>.</span><span>.</span>" }} /></span> : "My Companion Meals Generator"}</button>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>Applies your default choices where stated and generates recommended breakfast, lunch, and dinner slots where left empty. These can be updated on individual days if required.</div>
            </div>

            {/* Weekly Eating Feedback */}
            <div style={{ marginTop: 14 }}>
              <button onClick={function(){ generateWeekEatFeedback(); }} disabled={eatFbLoading} style={{ width: "100%", padding: 12, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: eatFbLoading ? "not-allowed" : "pointer", opacity: eatFbLoading ? 0.7 : 1, background: eatFbLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", marginBottom: 6 }}>{eatFbLoading ? React.createElement("span", null, "Generating, please wait ", React.createElement("span", { className: "loading-dots", dangerouslySetInnerHTML: { __html: "<span>.</span><span>.</span><span>.</span>" } })) : "My Companion Week's Feedback"}</button>
              <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>Reviews all planned and consumed meals across the week for patterns colour coded recommendations and nutritional trends.</div>
              {(eatFbResults[activeTab] || {})["week"] && <button onClick={function(){ setEatFbExpanded(!eatFbExpanded); }} style={{ width: "100%", padding: 6, background: "none", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, color: "#64748b", cursor: "pointer", marginBottom: 6 }}>{eatFbExpanded ? "▲ Hide Feedback" : "▼ Show Feedback"}</button>}
              {eatFbExpanded && (eatFbResults[activeTab] || {})["week"] && (function() { var efb = eatFbResults[activeTab]["week"]; return React.createElement("div", { style: { marginBottom: 10 } },
                React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" } },
                  efb._when && React.createElement("div", { style: { padding: "6px 14px", background: "#f8fafc", fontSize: 10, color: "#94a3b8", borderBottom: "1px solid #e2e8f0" } }, "Generated ", efb._when, " for ", isJC ? "JC" : "Becks"),
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
            <div style={{ textAlign: "center", padding: "10px 0 6px", fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>Go to <b>My Shop</b> once your week is planned to generate your shopping list.</div>

          </div>)}

          {/* Day content */}
          {eatDay !== "week" && <div style={{ background: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #e2e8f0", borderTop: "none", padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>{eatDay.charAt(0).toUpperCase() + eatDay.slice(1)} — {getDayKcal(eatDay)} kcal</span><div style={{ display: "flex", gap: 4 }}><button onClick={function(){ setCopyDayOpen(!copyDayOpen); setCopyDayTargets({}); }} style={Object.assign({},copyDayOpen?btnClose:btnAction)}>{copyDayOpen ? "✕ Close" : "📋 Copy Day"}</button><button onClick={function(){setEatDayEyeOpen(!eatDayEyeOpen);}} style={Object.assign({},eatDayEyeOpen?btnClose:btnAction)}>{eatDayEyeOpen ? "✕ Close" : "👁 Progress"}</button></div></div>

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
                <button onClick={function(){setEatDayEyeOpen(false);}} style={{ padding: "2px 8px", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", border: "none", borderRadius: 4, fontSize: 12, color: "#fff", cursor: "pointer", lineHeight: 1 }}>✕</button>
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
                  <div style={{ overflowX: "auto", width: "100%", boxSizing: "border-box" }}><table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup><col style={{ width: "40%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /></colgroup>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                        <th style={{ padding: "4px 2px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Item</th>
                        <th style={{ padding: "4px 2px", color: "#64748b", textAlign: "right" }}>kcal</th>
                        <th style={{ padding: "4px 2px", color: "#64748b", textAlign: "right" }}>prot</th>
                        <th style={{ padding: "4px 2px", color: "#64748b", textAlign: "right" }}>s/fat</th>
                        <th style={{ padding: "4px 2px", color: "#64748b", textAlign: "right" }}>carbs</th>
                        <th style={{ padding: "4px 2px", color: "#64748b", textAlign: "right" }}>fib</th>
                        <th style={{ padding: "4px 2px", color: "#64748b", textAlign: "right" }}>salt</th>
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
                              <td style={{ padding: "3px 2px", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", marginRight: 4, background: it.rating === "RED" ? "#dc2626" : it.rating === "AMBER" ? "#f59e0b" : it.rating === "GREAT" ? "#16a34a" : "#cbd5e1", verticalAlign: "middle" }}></span>{it.name}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{it.kcal}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{it.prot || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{it.sfat || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{it.carbs || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{it.fibre || "-"}</td>
                              <td style={{ padding: "3px 2px", textAlign: "right" }}>{it.salt || "-"}</td>
                            </tr>);
                          })}
                          <tr style={{ borderBottom: "1px solid #cbd5e1" }}><td style={{ padding: "3px 2px", fontWeight: 600, fontSize: 9, color: "#475569" }}>{cat.label} total</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{catKcal}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{catProt || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{catSfat || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{catCarbs || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{catFib || "-"}</td><td style={{ padding: "3px 2px", textAlign: "right", fontWeight: 600, fontSize: 9 }}>{catSalt || "-"}</td></tr>
                        </React.Fragment>);
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#e0f2fe", borderTop: "2px solid #0f172a" }}>
                        <td style={{ padding: "4px 2px", fontWeight: 700, fontSize: 11, color: "#0c4a6e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Total</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: dayTotalConsumed > (isJC ? 2200 : 1900) ? "#dc2626" : "#0c4a6e" }}>{dayTotalConsumed}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: dayProtConsumed < (isJC ? 110 : 90) ? "#dc2626" : "#0c4a6e" }}>{dayProtConsumed || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: daySfatConsumed > 20 ? "#dc2626" : "#0c4a6e" }}>{daySfatConsumed || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: dayCarbsConsumed > (isJC ? 300 : 260) ? "#dc2626" : "#0c4a6e" }}>{dayCarbsConsumed || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: dayFibConsumed < (isJC ? 30 : 25) ? "#dc2626" : "#0c4a6e" }}>{dayFibConsumed || "-"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 11, color: daySaltConsumed > 6 ? "#dc2626" : "#0c4a6e" }}>{daySaltConsumed || "-"}</td>
                      </tr>
                    <tr style={{ background: "#f1f5f9" }}>
                        <td style={{ padding: "4px 2px", fontWeight: 700, fontSize: 10, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Recommended</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{isJC ? "2200" : "1900"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{isJC ? "130" : "110"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>20</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{isJC ? "300" : "260"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>{isJC ? "35" : "30"}</td>
                        <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600, fontSize: 10, color: "#475569" }}>6</td>
                      </tr>
                      {(function() {
                        var limKcal = isJC ? 2200 : 1900;
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
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: kcalColor }}>{(dKcal > 0 ? "+" : "") + dKcal}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: protColor }}>{(dProt > 0 ? "+" : "") + dProt}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: sfatColor }}>{(dSfat > 0 ? "+" : "") + Math.round(dSfat*10)/10}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: carbsColor }}>{(dCarbs > 0 ? "+" : "") + dCarbs}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: fibColor }}>{(dFib > 0 ? "+" : "") + dFib}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, fontSize: 10, color: saltColor }}>{(dSalt > 0 ? "+" : "") + Math.round(dSalt*10)/10}</td>
                        </tr>);
                      })()}
                    </tfoot>
                  </table></div>

                  {/* Nutrition diverging bar chart */}
                  <div style={{ marginTop: 24, background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "10px 8px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8, paddingLeft: 4 }}>Daily Percentage of Recommendations</div>
                    {(function() {
                      var cLimKcal = isJC ? 2200 : 1900;
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
                          React.createElement("span", { style: { position: "absolute", left: 0, fontSize: 8, color: "#94a3b8" } }, "-" + maxDev + "%"),
                          React.createElement("span", { style: { position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: 8, color: "#64748b", fontWeight: 600 } }, "Target"),
                          React.createElement("span", { style: { position: "absolute", right: 0, fontSize: 8, color: "#94a3b8" } }, "+" + maxDev + "%")
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
                            React.createElement("span", { style: { fontSize: 9, fontWeight: 600, color: dev === 0 ? "#16a34a" : barColor, width: 42, textAlign: "right", marginLeft: 4 } }, (dev > 0 ? "+" : "") + dev + "%")
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
                  var _ragChg = _slotItem && _slotItem._ragChanged && !_slotItem._ragChangedSeen;
                  return (<div key={"b"+idx} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <MealSelect snap={getSnap(eatDay, slotKey)} items={dispBfast} value={getMeal(eatDay, slotKey) === "__empty__" ? "" : getMeal(eatDay, slotKey)} onChange={function(e) { if (e.target.value === "__add_new__") { openAddForm("breakfast", "defaults", e.target.searchText, slotKey, eatDay); } else { setMeal(eatDay, slotKey, e.target.value); } }} placeholder="Select breakfast..." onDelete={deleteCustomItem} />
                    </div>
                    {_ragChg && <span onClick={function(){alert("Rating changed from " + (_slotItem.prevRating || "?") + " to " + _slotItem.rating + (_slotItem.ragReason ? ".\n\nReason: " + _slotItem.ragReason : "") + "\n\nBased on your current health profile.");}} style={{cursor:"pointer",fontSize:14}} title={"Rating changed: " + (_slotItem.prevRating||"?") + " → " + _slotItem.rating}>🔄</span>}
                    {_ragWarn && <span onClick={function(){alert(_ragWarn);}} style={{cursor:"pointer",fontSize:14}} title={_ragWarn}>⚠️</span>}
                    {snapButton(slotKey)}
                    {_hasItem && <button onClick={function() { if (!confirm("Remove this meal? This cannot be undone.")) return; setMeal(eatDay, slotKey, idx === 1 ? "__empty__" : ""); }} style={btnDelete}>🗑 Del</button>}
                    {(function(){ var _c = childAt(eatDay, slotKey); return !!(_c && _c.portion && _c.portion.values); })() && (<span style={{ fontSize: 9, color: "#1e3a5f", fontWeight: 600 }} title="Portion verified">✓</span>)}
                  </div>);
                });
              })()}
              {portionSlot && portionSlot.match(/^b\d*$/) && (portionLoading || portionResult || snapPre === portionSlot) && (<div style={{ background: "#faf5ff", borderRadius: 8, padding: 10, marginBottom: 8, border: "1px solid #ddd6fe" }}>
                {portionLoading && <div style={{ fontSize: 11, color: "#1e3a5f", fontWeight: 600 }}>⏳ Looking at your photo...</div>}
                {snapPre === portionSlot && !portionLoading && !portionResult && (<div data-testid="snap-pre">
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>📷 Snap a photo of your food</div>
                  <input aria-label="Photo description" value={portionDesc} onChange={function(e){ setPortionDesc(e.target.value); }} placeholder="Optional: size and detail, e.g. 'large plate', '2 sausages', '28g bar', 'half eaten'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #ddd6fe", borderRadius: 6, fontSize: 11, marginBottom: 6 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <label style={{ flex: 1, padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>📷 Take photo<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) portionAnalyze(portionSlot, e.target.files[0], listForSlot(portionSlot), portionDesc); e.target.value=""; }} style={{ display: "none" }} /></label>
                    <button onClick={cancelPortion} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>)}
                {portionResult && (<div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{portionResult._deep ? "🔎 Re-check deep dive — re-assessed outcome" : !portionPlanned ? "📷 " + (portionResult.name || "Food") : portionResult.matchesPlanned === false ? "⚠️ Looks like " + (portionResult.name || "a different food") + ", not " + portionPlanned.name : "📷 Portion Analysis"}</div>
                  {portionPlanned ? (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 10, marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, color: "#475569" }}></div><div style={{ fontWeight: 600, color: "#475569", textAlign: "center" }}>Planned</div><div style={{ fontWeight: 600, color: "#475569", textAlign: "center" }}>Actual</div>
                    <div style={{ color: "#475569" }}>kcal</div><div style={{ textAlign: "center" }}>{portionPlanned.kcal}</div><div style={{ textAlign: "center", color: portionResult.kcal > portionPlanned.kcal * 1.1 ? "#dc2626" : portionResult.kcal < portionPlanned.kcal * 0.9 ? "#2563eb" : "#0c4a6e", fontWeight: 600 }}>{portionResult.kcal}</div>
                    <div style={{ color: "#475569" }}>Protein</div><div style={{ textAlign: "center" }}>{portionPlanned.protein}g</div><div style={{ textAlign: "center", fontWeight: 600 }}>{portionResult.protein}g</div>
                    <div style={{ color: "#475569" }}>Sat fat</div><div style={{ textAlign: "center" }}>{portionPlanned.satFat}g</div><div style={{ textAlign: "center", color: portionResult.satFat > portionPlanned.satFat * 1.1 ? "#dc2626" : "#0c4a6e", fontWeight: 600 }}>{portionResult.satFat}g</div>
                  </div>) : (<div data-testid="snap-values" style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10, marginBottom: 6 }}><span><b>{portionResult.kcal}</b> kcal</span><span><b>{portionResult.protein || 0}g</b> prot</span><span><b>{portionResult.satFat || 0}g</b> s/fat</span><span><b>{portionResult.addedSugar || 0}g</b> added sugar</span></div>)}
                  {portionResult.portionNote && <div style={{ fontSize: 10, color: "#6b21a8", fontStyle: "italic", marginBottom: 6 }}>{portionResult.portionNote}</div>}
                  {(function() { var rr = rateByPortion(portionResult); return <div data-testid="snap-rating" style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, color: rr.rating === "RED" ? "#dc2626" : rr.rating === "AMBER" ? "#d97706" : "#15803d" }}>{rr.rating} · {rr.freqLabel}</div>; })()}
                  {portionResult._deep && portionFirst && <div data-testid="deep-compare" style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{compareLine(portionFirst, portionResult)}</div>}
                  {portionResult._deep && <div style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{portionResult.name}</div>}
                  {gramsLine(portionResult) && <div data-testid="portion-assumed" style={{ fontSize: 10, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Assumed: {gramsLine(portionResult)} — {portionResult.kcal} kcal</div>}
                  <div style={{ marginBottom: 8 }}><input aria-label="Photo description" value={portionDesc} onChange={function(e){ setPortionDesc(e.target.value); }} placeholder="Optional: add detail, e.g. '28g bar', 'small bowl', 'half eaten', 'brand'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #ddd6fe", borderRadius: 6, fontSize: 10 }} /></div>
                  {portionResult.matchesPlanned === false && portionPlanned && <div data-testid="snap-update-to" style={{ fontSize: 11, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Update to {portionResult.name || "this food"}</div>}
                  <div data-testid="snap-actions" style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                    <button onClick={confirmPortion} style={Object.assign({}, btnActionLg, snapBtn)}>Confirm</button>
                    <button onClick={recheckPortion} style={Object.assign({}, btnMuted, snapBtn)}>↻ Re-check</button>
                    <button onClick={cancelPortion} style={Object.assign({ background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, cursor: "pointer" }, snapBtn)}>Cancel</button>
                  </div>
                </div>)}
              </div>)}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <button onClick={function() { var nk = 2; while (getMeal(eatDay, "b" + nk)) nk++; setMeal(eatDay, "b" + nk, "__empty__"); }} style={btnMuted}>+ Add New</button>
            </div>
            </div>

            
            {addingNew && addingSource === "defaults" && addingCategory === "breakfast" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 8, border: "1px solid #bfdbfe" }}>
              <div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Breakfast Item</span></div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} />
                <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button>
                <button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button>
              </div>
              <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#94a3b8" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = calcRAG(prod) === "RED" ? "#dc2626" : calcRAG(prod) === "AMBER" ? "#d97706" : "#16a34a"; return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "per 100g · Open Food Facts", category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#64748b", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span></span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#94a3b8", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}
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
                  var _ragChg2 = _slotItem2 && _slotItem2._ragChanged && !_slotItem2._ragChangedSeen;
                  return (<div key={"l"+idx} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <MealSelect snap={getSnap(eatDay, slotKey)} items={dispLunch} value={getMeal(eatDay, slotKey) === "__empty__" ? "" : getMeal(eatDay, slotKey)} onChange={function(e) { if (e.target.value === "__add_new__") { openAddForm("lunch", "defaults", e.target.searchText, slotKey, eatDay); } else { setMeal(eatDay, slotKey, e.target.value); } }} placeholder="Select lunch..." onDelete={deleteCustomItem} />
                    </div>
                    {_ragChg2 && <span onClick={function(){alert("Rating changed from " + (_slotItem2.prevRating || "?") + " to " + _slotItem2.rating + (_slotItem2.ragReason ? ".\n\nReason: " + _slotItem2.ragReason : "") + "\n\nBased on your current health profile.");}} style={{cursor:"pointer",fontSize:14}} title={"Rating changed: " + (_slotItem2.prevRating||"?") + " → " + _slotItem2.rating}>🔄</span>}
                    {_ragWarn && <span onClick={function(){alert(_ragWarn);}} style={{cursor:"pointer",fontSize:14}} title={_ragWarn}>⚠️</span>}
                    {snapButton(slotKey)}
                    {_hasItem && <button onClick={function() { if (!confirm("Remove this meal? This cannot be undone.")) return; setMeal(eatDay, slotKey, idx === 1 ? "__empty__" : ""); }} style={btnDelete}>🗑 Del</button>}
                    {(function(){ var _c = childAt(eatDay, slotKey); return !!(_c && _c.portion && _c.portion.values); })() && (<span style={{ fontSize: 9, color: "#1e3a5f", fontWeight: 600 }} title="Portion verified">✓</span>)}
                  </div>);
                });
              })()}
              {portionSlot && portionSlot.match(/^l\d*$/) && (portionLoading || portionResult || snapPre === portionSlot) && (<div style={{ background: "#faf5ff", borderRadius: 8, padding: 10, marginBottom: 8, border: "1px solid #ddd6fe" }}>
                {portionLoading && <div style={{ fontSize: 11, color: "#1e3a5f", fontWeight: 600 }}>⏳ Looking at your photo...</div>}
                {snapPre === portionSlot && !portionLoading && !portionResult && (<div data-testid="snap-pre">
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>📷 Snap a photo of your food</div>
                  <input aria-label="Photo description" value={portionDesc} onChange={function(e){ setPortionDesc(e.target.value); }} placeholder="Optional: size and detail, e.g. 'large plate', '2 sausages', '28g bar', 'half eaten'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #ddd6fe", borderRadius: 6, fontSize: 11, marginBottom: 6 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <label style={{ flex: 1, padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>📷 Take photo<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) portionAnalyze(portionSlot, e.target.files[0], listForSlot(portionSlot), portionDesc); e.target.value=""; }} style={{ display: "none" }} /></label>
                    <button onClick={cancelPortion} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>)}
                {portionResult && (<div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{portionResult._deep ? "🔎 Re-check deep dive — re-assessed outcome" : !portionPlanned ? "📷 " + (portionResult.name || "Food") : portionResult.matchesPlanned === false ? "⚠️ Looks like " + (portionResult.name || "a different food") + ", not " + portionPlanned.name : "📷 Portion Analysis"}</div>
                  {portionPlanned ? (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 10, marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, color: "#475569" }}></div><div style={{ fontWeight: 600, color: "#475569", textAlign: "center" }}>Planned</div><div style={{ fontWeight: 600, color: "#475569", textAlign: "center" }}>Actual</div>
                    <div style={{ color: "#475569" }}>kcal</div><div style={{ textAlign: "center" }}>{portionPlanned.kcal}</div><div style={{ textAlign: "center", color: portionResult.kcal > portionPlanned.kcal * 1.1 ? "#dc2626" : portionResult.kcal < portionPlanned.kcal * 0.9 ? "#2563eb" : "#0c4a6e", fontWeight: 600 }}>{portionResult.kcal}</div>
                    <div style={{ color: "#475569" }}>Protein</div><div style={{ textAlign: "center" }}>{portionPlanned.protein}g</div><div style={{ textAlign: "center", fontWeight: 600 }}>{portionResult.protein}g</div>
                    <div style={{ color: "#475569" }}>Sat fat</div><div style={{ textAlign: "center" }}>{portionPlanned.satFat}g</div><div style={{ textAlign: "center", color: portionResult.satFat > portionPlanned.satFat * 1.1 ? "#dc2626" : "#0c4a6e", fontWeight: 600 }}>{portionResult.satFat}g</div>
                  </div>) : (<div data-testid="snap-values" style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10, marginBottom: 6 }}><span><b>{portionResult.kcal}</b> kcal</span><span><b>{portionResult.protein || 0}g</b> prot</span><span><b>{portionResult.satFat || 0}g</b> s/fat</span><span><b>{portionResult.addedSugar || 0}g</b> added sugar</span></div>)}
                  {portionResult.portionNote && <div style={{ fontSize: 10, color: "#6b21a8", fontStyle: "italic", marginBottom: 6 }}>{portionResult.portionNote}</div>}
                  {(function() { var rr = rateByPortion(portionResult); return <div data-testid="snap-rating" style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, color: rr.rating === "RED" ? "#dc2626" : rr.rating === "AMBER" ? "#d97706" : "#15803d" }}>{rr.rating} · {rr.freqLabel}</div>; })()}
                  {portionResult._deep && portionFirst && <div data-testid="deep-compare" style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{compareLine(portionFirst, portionResult)}</div>}
                  {portionResult._deep && <div style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{portionResult.name}</div>}
                  {gramsLine(portionResult) && <div data-testid="portion-assumed" style={{ fontSize: 10, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Assumed: {gramsLine(portionResult)} — {portionResult.kcal} kcal</div>}
                  <div style={{ marginBottom: 8 }}><input aria-label="Photo description" value={portionDesc} onChange={function(e){ setPortionDesc(e.target.value); }} placeholder="Optional: add detail, e.g. '28g bar', 'small bowl', 'half eaten', 'brand'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #ddd6fe", borderRadius: 6, fontSize: 10 }} /></div>
                  {portionResult.matchesPlanned === false && portionPlanned && <div data-testid="snap-update-to" style={{ fontSize: 11, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Update to {portionResult.name || "this food"}</div>}
                  <div data-testid="snap-actions" style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                    <button onClick={confirmPortion} style={Object.assign({}, btnActionLg, snapBtn)}>Confirm</button>
                    <button onClick={recheckPortion} style={Object.assign({}, btnMuted, snapBtn)}>↻ Re-check</button>
                    <button onClick={cancelPortion} style={Object.assign({ background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, cursor: "pointer" }, snapBtn)}>Cancel</button>
                  </div>
                </div>)}
              </div>)}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <button onClick={function() { var nk = 2; while (getMeal(eatDay, "l" + nk)) nk++; setMeal(eatDay, "l" + nk, "__empty__"); }} style={btnMuted}>+ Add New</button>
            </div>
            </div>

            
            {addingNew && addingSource === "defaults" && addingCategory === "lunch" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 8, border: "1px solid #bfdbfe" }}>
              <div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Lunch Item</span></div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} />
                <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button>
                <button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button>
              </div>
              <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#94a3b8" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = calcRAG(prod) === "RED" ? "#dc2626" : calcRAG(prod) === "AMBER" ? "#d97706" : "#16a34a"; return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "per 100g · Open Food Facts", category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#64748b", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span></span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#94a3b8", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}
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
                  var _ragChg3 = _slotItem3 && _slotItem3._ragChanged && !_slotItem3._ragChangedSeen;
                  var dpKey = "dp" + sIdx;
                  var dvKey = "dv" + sIdx;
                  return (<div key={"d"+idx}>
                    <div style={{ display: "flex", gap: 4, marginBottom: _isPackaged ? 2 : 4, alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <MealSelect snap={getSnap(eatDay, slotKey)} items={dispDinners} value={getMeal(eatDay, slotKey) === "__empty__" ? "" : getMeal(eatDay, slotKey)} onChange={function(e) { if (e.target.value === "__add_new__") { openAddForm("dinner", "defaults", e.target.searchText, slotKey, eatDay); } else { setMeal(eatDay, slotKey, e.target.value); } }} placeholder="Select dinner..." onDelete={deleteCustomItem} />
                    </div>
                    {_ragChg3 && <span onClick={function(){alert("Rating changed from " + (_slotItem3.prevRating || "?") + " to " + _slotItem3.rating + (_slotItem3.ragReason ? ".\n\nReason: " + _slotItem3.ragReason : "") + "\n\nBased on your current health profile.");}} style={{cursor:"pointer",fontSize:14}} title={"Rating changed: " + (_slotItem3.prevRating||"?") + " → " + _slotItem3.rating}>🔄</span>}
                    {_ragWarn && <span onClick={function(){alert(_ragWarn);}} style={{cursor:"pointer",fontSize:14}} title={_ragWarn}>⚠️</span>}
                    {snapButton(slotKey)}
                    {_hasItem && <button onClick={function() { if (!confirm("Remove this meal? This cannot be undone.")) return; setMeal(eatDay, slotKey, idx === 1 ? "__empty__" : ""); }} style={btnDelete}>🗑 Del</button>}
                    {(function(){ var _c = childAt(eatDay, slotKey); return !!(_c && _c.portion && _c.portion.values); })() && (<span style={{ fontSize: 9, color: "#1e3a5f", fontWeight: 600 }} title="Portion verified">✓</span>)}
                    </div>
                    {_isPackaged && (<div style={{ marginLeft: 12, marginBottom: 6, paddingLeft: 8, borderLeft: "2px solid #bfdbfe" }}>
                      <div style={{ fontSize: 9, color: "#64748b", marginBottom: 2, fontWeight: 600 }}>📦 Sides for packaged product</div>
                      <div style={{ display: "flex", gap: 4, marginBottom: 3, alignItems: "center" }}>
                        <span style={{ fontSize: 9, color: "#475569", width: 44, flexShrink: 0 }}>🥔 Potato</span>
                        <select value={getMeal(eatDay, dpKey) || ""} onChange={function(e){ setMeal(eatDay, dpKey, e.target.value); }} style={{ flex: 1, padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 10, background: "#fff" }}>
                          <option value="">Select potato side...</option>
                          {POTATO_SIDES.map(function(ps){ var kcal = isJC ? ps.jcKcal : ps.beckKcal; return <option key={ps.id} value={ps.id}>{ps.name} ({kcal} kcal)</option>; })}
                        </select>
                      </div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 9, color: "#475569", width: 44, flexShrink: 0 }}>🥗 Veg</span>
                        <select value={getMeal(eatDay, dvKey) || ""} onChange={function(e){ setMeal(eatDay, dvKey, e.target.value); }} style={{ flex: 1, padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 10, background: "#fff" }}>
                          <option value="">Select veg/salad side...</option>
                          {VEG_SIDES.map(function(vs){ var kcal = isJC ? vs.jcKcal : vs.beckKcal; return <option key={vs.id} value={vs.id}>{vs.name} ({kcal} kcal)</option>; })}
                        </select>
                      </div>
                    </div>)}
                  </div>);
                });
              })()}
              {portionSlot && portionSlot.match(/^d\d*$/) && !portionSlot.match(/^d[sr]/) && (portionLoading || portionResult || snapPre === portionSlot) && (<div style={{ background: "#faf5ff", borderRadius: 8, padding: 10, marginBottom: 8, border: "1px solid #ddd6fe" }}>
                {portionLoading && <div style={{ fontSize: 11, color: "#1e3a5f", fontWeight: 600 }}>⏳ Looking at your photo...</div>}
                {snapPre === portionSlot && !portionLoading && !portionResult && (<div data-testid="snap-pre">
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>📷 Snap a photo of your food</div>
                  <input aria-label="Photo description" value={portionDesc} onChange={function(e){ setPortionDesc(e.target.value); }} placeholder="Optional: size and detail, e.g. 'large plate', '2 sausages', '28g bar', 'half eaten'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #ddd6fe", borderRadius: 6, fontSize: 11, marginBottom: 6 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <label style={{ flex: 1, padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>📷 Take photo<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) portionAnalyze(portionSlot, e.target.files[0], listForSlot(portionSlot), portionDesc); e.target.value=""; }} style={{ display: "none" }} /></label>
                    <button onClick={cancelPortion} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>)}
                {portionResult && (<div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{portionResult._deep ? "🔎 Re-check deep dive — re-assessed outcome" : !portionPlanned ? "📷 " + (portionResult.name || "Food") : portionResult.matchesPlanned === false ? "⚠️ Looks like " + (portionResult.name || "a different food") + ", not " + portionPlanned.name : "📷 Portion Analysis"}</div>
                  {portionPlanned ? (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 10, marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, color: "#475569" }}></div><div style={{ fontWeight: 600, color: "#475569", textAlign: "center" }}>Planned</div><div style={{ fontWeight: 600, color: "#475569", textAlign: "center" }}>Actual</div>
                    <div style={{ color: "#475569" }}>kcal</div><div style={{ textAlign: "center" }}>{portionPlanned.kcal}</div><div style={{ textAlign: "center", color: portionResult.kcal > portionPlanned.kcal * 1.1 ? "#dc2626" : portionResult.kcal < portionPlanned.kcal * 0.9 ? "#2563eb" : "#0c4a6e", fontWeight: 600 }}>{portionResult.kcal}</div>
                    <div style={{ color: "#475569" }}>Protein</div><div style={{ textAlign: "center" }}>{portionPlanned.protein}g</div><div style={{ textAlign: "center", fontWeight: 600 }}>{portionResult.protein}g</div>
                    <div style={{ color: "#475569" }}>Sat fat</div><div style={{ textAlign: "center" }}>{portionPlanned.satFat}g</div><div style={{ textAlign: "center", color: portionResult.satFat > portionPlanned.satFat * 1.1 ? "#dc2626" : "#0c4a6e", fontWeight: 600 }}>{portionResult.satFat}g</div>
                  </div>) : (<div data-testid="snap-values" style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10, marginBottom: 6 }}><span><b>{portionResult.kcal}</b> kcal</span><span><b>{portionResult.protein || 0}g</b> prot</span><span><b>{portionResult.satFat || 0}g</b> s/fat</span><span><b>{portionResult.addedSugar || 0}g</b> added sugar</span></div>)}
                  {portionResult.portionNote && <div style={{ fontSize: 10, color: "#6b21a8", fontStyle: "italic", marginBottom: 6 }}>{portionResult.portionNote}</div>}
                  {(function() { var rr = rateByPortion(portionResult); return <div data-testid="snap-rating" style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, color: rr.rating === "RED" ? "#dc2626" : rr.rating === "AMBER" ? "#d97706" : "#15803d" }}>{rr.rating} · {rr.freqLabel}</div>; })()}
                  {portionResult._deep && portionFirst && <div data-testid="deep-compare" style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{compareLine(portionFirst, portionResult)}</div>}
                  {portionResult._deep && <div style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{portionResult.name}</div>}
                  {gramsLine(portionResult) && <div data-testid="portion-assumed" style={{ fontSize: 10, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Assumed: {gramsLine(portionResult)} — {portionResult.kcal} kcal</div>}
                  <div style={{ marginBottom: 8 }}><input aria-label="Photo description" value={portionDesc} onChange={function(e){ setPortionDesc(e.target.value); }} placeholder="Optional: add detail, e.g. '28g bar', 'small bowl', 'half eaten', 'brand'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #ddd6fe", borderRadius: 6, fontSize: 10 }} /></div>
                  {portionResult.matchesPlanned === false && portionPlanned && <div data-testid="snap-update-to" style={{ fontSize: 11, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Update to {portionResult.name || "this food"}</div>}
                  <div data-testid="snap-actions" style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                    <button onClick={confirmPortion} style={Object.assign({}, btnActionLg, snapBtn)}>Confirm</button>
                    <button onClick={recheckPortion} style={Object.assign({}, btnMuted, snapBtn)}>↻ Re-check</button>
                    <button onClick={cancelPortion} style={Object.assign({ background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, cursor: "pointer" }, snapBtn)}>Cancel</button>
                  </div>
                </div>)}
              </div>)}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <button onClick={function() { var nk = 2; while (getMeal(eatDay, "d" + nk)) nk++; setMeal(eatDay, "d" + nk, "__empty__"); }} style={btnMuted}>+ Add New</button>
            </div>
            </div>

            
            {addingNew && addingSource === "defaults" && addingCategory === "dinner" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 8, border: "1px solid #bfdbfe" }}>
              <div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Dinner Item</span></div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} />
                <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button>
                <button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button>
              </div>
              <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#94a3b8" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = calcRAG(prod) === "RED" ? "#dc2626" : calcRAG(prod) === "AMBER" ? "#d97706" : "#16a34a"; return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "per 100g · Open Food Facts", category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#64748b", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span></span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#94a3b8", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}
            </div>)}

            {/* Desserts */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Desserts</span>
              {(function() {
                var slots = []; for (var di = 1; di <= 5; di++) { if (getMeal(eatDay, "ds" + di) || di <= 1) slots.push(di); }
                return slots.map(function(idx) {
                  return (<div key={"ds"+idx} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <MealSelect snap={getSnap(eatDay, "ds" + idx)} items={dispDesserts} value={getMeal(eatDay, "ds" + idx) === "__empty__" ? "" : getMeal(eatDay, "ds" + idx)} onChange={function(e) { if (e.target.value === "__add_new__") { openAddForm("dessert", "defaults", e.target.searchText, "ds" + idx, eatDay); } else { setMeal(eatDay, "ds" + idx, e.target.value); } }} placeholder="Select dessert..." />
                    </div>
                    {snapButton("ds" + idx)}
                    {getMeal(eatDay, "ds" + idx) && <button onClick={function() { if (!confirm("Remove this snack? This cannot be undone.")) return; setMeal(eatDay, "ds" + idx, ""); }} style={btnDelete}>🗑 Del</button>}
                    {(function(){ var _c = childAt(eatDay, "ds" + idx); return !!(_c && _c.portion && _c.portion.values); })() && (<span style={{ fontSize: 9, color: "#1e3a5f", fontWeight: 600 }} title="Portion verified">✓</span>)}
                  </div>);
                });
              })()}
              {portionSlot && portionSlot.match(/^ds/) && (portionLoading || portionResult || snapPre === portionSlot) && (<div style={{ background: "#faf5ff", borderRadius: 8, padding: 10, marginBottom: 8, border: "1px solid #ddd6fe" }}>
                {portionLoading && <div style={{ fontSize: 11, color: "#1e3a5f", fontWeight: 600 }}>⏳ Looking at your photo...</div>}
                {snapPre === portionSlot && !portionLoading && !portionResult && (<div data-testid="snap-pre">
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>📷 Snap a photo of your food</div>
                  <input aria-label="Photo description" value={portionDesc} onChange={function(e){ setPortionDesc(e.target.value); }} placeholder="Optional: size and detail, e.g. 'large plate', '2 sausages', '28g bar', 'half eaten'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #ddd6fe", borderRadius: 6, fontSize: 11, marginBottom: 6 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <label style={{ flex: 1, padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>📷 Take photo<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) portionAnalyze(portionSlot, e.target.files[0], listForSlot(portionSlot), portionDesc); e.target.value=""; }} style={{ display: "none" }} /></label>
                    <button onClick={cancelPortion} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>)}
                {portionResult && (<div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{portionResult._deep ? "🔎 Re-check deep dive — re-assessed outcome" : !portionPlanned ? "📷 " + (portionResult.name || "Food") : portionResult.matchesPlanned === false ? "⚠️ Looks like " + (portionResult.name || "a different food") + ", not " + portionPlanned.name : "📷 Portion Analysis"}</div>
                  {portionPlanned ? (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 10, marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, color: "#475569" }}></div><div style={{ fontWeight: 600, color: "#475569", textAlign: "center" }}>Planned</div><div style={{ fontWeight: 600, color: "#475569", textAlign: "center" }}>Actual</div>
                    <div style={{ color: "#475569" }}>kcal</div><div style={{ textAlign: "center" }}>{portionPlanned.kcal}</div><div style={{ textAlign: "center", color: portionResult.kcal > portionPlanned.kcal * 1.1 ? "#dc2626" : portionResult.kcal < portionPlanned.kcal * 0.9 ? "#2563eb" : "#0c4a6e", fontWeight: 600 }}>{portionResult.kcal}</div>
                    <div style={{ color: "#475569" }}>Protein</div><div style={{ textAlign: "center" }}>{portionPlanned.protein}g</div><div style={{ textAlign: "center", fontWeight: 600 }}>{portionResult.protein}g</div>
                    <div style={{ color: "#475569" }}>Sat fat</div><div style={{ textAlign: "center" }}>{portionPlanned.satFat}g</div><div style={{ textAlign: "center", color: portionResult.satFat > portionPlanned.satFat * 1.1 ? "#dc2626" : "#0c4a6e", fontWeight: 600 }}>{portionResult.satFat}g</div>
                  </div>) : (<div data-testid="snap-values" style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10, marginBottom: 6 }}><span><b>{portionResult.kcal}</b> kcal</span><span><b>{portionResult.protein || 0}g</b> prot</span><span><b>{portionResult.satFat || 0}g</b> s/fat</span><span><b>{portionResult.addedSugar || 0}g</b> added sugar</span></div>)}
                  {portionResult.portionNote && <div style={{ fontSize: 10, color: "#6b21a8", fontStyle: "italic", marginBottom: 6 }}>{portionResult.portionNote}</div>}
                  {(function() { var rr = rateByPortion(portionResult); return <div data-testid="snap-rating" style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, color: rr.rating === "RED" ? "#dc2626" : rr.rating === "AMBER" ? "#d97706" : "#15803d" }}>{rr.rating} · {rr.freqLabel}</div>; })()}
                  {portionResult._deep && portionFirst && <div data-testid="deep-compare" style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{compareLine(portionFirst, portionResult)}</div>}
                  {portionResult._deep && <div style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{portionResult.name}</div>}
                  {gramsLine(portionResult) && <div data-testid="portion-assumed" style={{ fontSize: 10, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Assumed: {gramsLine(portionResult)} — {portionResult.kcal} kcal</div>}
                  <div style={{ marginBottom: 8 }}><input aria-label="Photo description" value={portionDesc} onChange={function(e){ setPortionDesc(e.target.value); }} placeholder="Optional: add detail, e.g. '28g bar', 'small bowl', 'half eaten', 'brand'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #ddd6fe", borderRadius: 6, fontSize: 10 }} /></div>
                  {portionResult.matchesPlanned === false && portionPlanned && <div data-testid="snap-update-to" style={{ fontSize: 11, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Update to {portionResult.name || "this food"}</div>}
                  <div data-testid="snap-actions" style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                    <button onClick={confirmPortion} style={Object.assign({}, btnActionLg, snapBtn)}>Confirm</button>
                    <button onClick={recheckPortion} style={Object.assign({}, btnMuted, snapBtn)}>↻ Re-check</button>
                    <button onClick={cancelPortion} style={Object.assign({ background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, cursor: "pointer" }, snapBtn)}>Cancel</button>
                  </div>
                </div>)}
              </div>)}
            </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <button onClick={function() { var nk = 1; while (getMeal(eatDay, "ds" + nk)) nk++; setMeal(eatDay, "ds" + nk, "__empty__"); }} style={btnMuted}>+ Add New</button>
            </div>

            
            {addingNew && addingSource === "defaults" && addingCategory === "dessert" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 8, border: "1px solid #bfdbfe" }}>
              <div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Dessert Item</span></div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} />
                <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button>
                <button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button>
              </div>
              <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#94a3b8" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = calcRAG(prod) === "RED" ? "#dc2626" : calcRAG(prod) === "AMBER" ? "#d97706" : "#16a34a"; return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "per 100g · Open Food Facts", category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#64748b", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span></span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#94a3b8", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}
            </div>)}

            {/* Drinks */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Drinks</span>
              {(function() {
                var slots = []; for (var di = 1; di <= 5; di++) { if (getMeal(eatDay, "dr" + di) || di <= 1) slots.push(di); }
                return slots.map(function(idx) {
                  return (<div key={"dr"+idx} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <MealSelect snap={getSnap(eatDay, "dr" + idx)} items={dispDrinks} value={getMeal(eatDay, "dr" + idx) === "__empty__" ? "" : getMeal(eatDay, "dr" + idx)} onChange={function(e) { if (e.target.value === "__add_new__") { openAddForm("drink", "defaults", e.target.searchText, "dr" + idx, eatDay); } else { setMeal(eatDay, "dr" + idx, e.target.value); } }} placeholder="Select drink..." />
                    </div>
                    {snapButton("dr" + idx)}
                    {getMeal(eatDay, "dr" + idx) && <button onClick={function() { if (!confirm("Remove this drink? This cannot be undone.")) return; setMeal(eatDay, "dr" + idx, ""); }} style={btnDelete}>🗑 Del</button>}
                    {(function(){ var _c = childAt(eatDay, "dr" + idx); return !!(_c && _c.portion && _c.portion.values); })() && (<span style={{ fontSize: 9, color: "#1e3a5f", fontWeight: 600 }} title="Portion verified">✓</span>)}
                  </div>);
                });
              })()}
              {portionSlot && portionSlot.match(/^dr/) && (portionLoading || portionResult || snapPre === portionSlot) && (<div style={{ background: "#faf5ff", borderRadius: 8, padding: 10, marginBottom: 8, border: "1px solid #ddd6fe" }}>
                {portionLoading && <div style={{ fontSize: 11, color: "#1e3a5f", fontWeight: 600 }}>⏳ Looking at your photo...</div>}
                {snapPre === portionSlot && !portionLoading && !portionResult && (<div data-testid="snap-pre">
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>📷 Snap a photo of your food</div>
                  <input aria-label="Photo description" value={portionDesc} onChange={function(e){ setPortionDesc(e.target.value); }} placeholder="Optional: size and detail, e.g. 'large plate', '2 sausages', '28g bar', 'half eaten'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #ddd6fe", borderRadius: 6, fontSize: 11, marginBottom: 6 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <label style={{ flex: 1, padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>📷 Take photo<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) portionAnalyze(portionSlot, e.target.files[0], listForSlot(portionSlot), portionDesc); e.target.value=""; }} style={{ display: "none" }} /></label>
                    <button onClick={cancelPortion} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>)}
                {portionResult && (<div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{portionResult._deep ? "🔎 Re-check deep dive — re-assessed outcome" : !portionPlanned ? "📷 " + (portionResult.name || "Food") : portionResult.matchesPlanned === false ? "⚠️ Looks like " + (portionResult.name || "a different food") + ", not " + portionPlanned.name : "📷 Portion Analysis"}</div>
                  {portionPlanned ? (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 10, marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, color: "#475569" }}></div><div style={{ fontWeight: 600, color: "#475569", textAlign: "center" }}>Planned</div><div style={{ fontWeight: 600, color: "#475569", textAlign: "center" }}>Actual</div>
                    <div style={{ color: "#475569" }}>kcal</div><div style={{ textAlign: "center" }}>{portionPlanned.kcal}</div><div style={{ textAlign: "center", color: portionResult.kcal > portionPlanned.kcal * 1.1 ? "#dc2626" : portionResult.kcal < portionPlanned.kcal * 0.9 ? "#2563eb" : "#0c4a6e", fontWeight: 600 }}>{portionResult.kcal}</div>
                    <div style={{ color: "#475569" }}>Protein</div><div style={{ textAlign: "center" }}>{portionPlanned.protein}g</div><div style={{ textAlign: "center", fontWeight: 600 }}>{portionResult.protein}g</div>
                    <div style={{ color: "#475569" }}>Sat fat</div><div style={{ textAlign: "center" }}>{portionPlanned.satFat}g</div><div style={{ textAlign: "center", color: portionResult.satFat > portionPlanned.satFat * 1.1 ? "#dc2626" : "#0c4a6e", fontWeight: 600 }}>{portionResult.satFat}g</div>
                  </div>) : (<div data-testid="snap-values" style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10, marginBottom: 6 }}><span><b>{portionResult.kcal}</b> kcal</span><span><b>{portionResult.protein || 0}g</b> prot</span><span><b>{portionResult.satFat || 0}g</b> s/fat</span><span><b>{portionResult.addedSugar || 0}g</b> added sugar</span></div>)}
                  {portionResult.portionNote && <div style={{ fontSize: 10, color: "#6b21a8", fontStyle: "italic", marginBottom: 6 }}>{portionResult.portionNote}</div>}
                  {(function() { var rr = rateByPortion(portionResult); return <div data-testid="snap-rating" style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, color: rr.rating === "RED" ? "#dc2626" : rr.rating === "AMBER" ? "#d97706" : "#15803d" }}>{rr.rating} · {rr.freqLabel}</div>; })()}
                  {portionResult._deep && portionFirst && <div data-testid="deep-compare" style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{compareLine(portionFirst, portionResult)}</div>}
                  {portionResult._deep && <div style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{portionResult.name}</div>}
                  {gramsLine(portionResult) && <div data-testid="portion-assumed" style={{ fontSize: 10, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Assumed: {gramsLine(portionResult)} — {portionResult.kcal} kcal</div>}
                  <div style={{ marginBottom: 8 }}><input aria-label="Photo description" value={portionDesc} onChange={function(e){ setPortionDesc(e.target.value); }} placeholder="Optional: add detail, e.g. '28g bar', 'small bowl', 'half eaten', 'brand'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #ddd6fe", borderRadius: 6, fontSize: 10 }} /></div>
                  {portionResult.matchesPlanned === false && portionPlanned && <div data-testid="snap-update-to" style={{ fontSize: 11, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Update to {portionResult.name || "this food"}</div>}
                  <div data-testid="snap-actions" style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                    <button onClick={confirmPortion} style={Object.assign({}, btnActionLg, snapBtn)}>Confirm</button>
                    <button onClick={recheckPortion} style={Object.assign({}, btnMuted, snapBtn)}>↻ Re-check</button>
                    <button onClick={cancelPortion} style={Object.assign({ background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, cursor: "pointer" }, snapBtn)}>Cancel</button>
                  </div>
                </div>)}
              </div>)}
            </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <button onClick={function() { var nk = 1; while (getMeal(eatDay, "dr" + nk)) nk++; setMeal(eatDay, "dr" + nk, "__empty__"); }} style={btnMuted}>+ Add New</button>
            </div>

            
            {addingNew && addingSource === "defaults" && addingCategory === "drink" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 8, border: "1px solid #bfdbfe" }}>
              <div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Drink Item</span></div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); searchOFF(e.target.value); }} placeholder="e.g. item name..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} />
                <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button>
                <button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button>
              </div>
              <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#94a3b8" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = calcRAG(prod) === "RED" ? "#dc2626" : calcRAG(prod) === "AMBER" ? "#d97706" : "#16a34a"; return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "per 100g · Open Food Facts", category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#64748b", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span></span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#94a3b8", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}
            </div>)}

            {/* Snacks */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>Snacks</span>
            {otherSlots.map(function(idx) {
              return (<div key={idx} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <MealSelect snap={getSnap(eatDay, "o" + idx)} items={dispOther} value={getMeal(eatDay, "o" + idx) === "__empty__" ? "" : getMeal(eatDay, "o" + idx)} onChange={function(e) { if (e.target.value === "__add_new__") { openAddForm("snack", "defaults", e.target.searchText, "o" + idx, eatDay); } else { setMeal(eatDay, "o" + idx, e.target.value); } }} placeholder="Select snack..." />
                </div>
                {snapButton("o" + idx)}
                {getMeal(eatDay, "o" + idx) && <button onClick={function() { if (!confirm("Remove this item? This cannot be undone.")) return; setMeal(eatDay, "o" + idx, ""); }} style={btnDelete}>🗑 Del</button>}
                {(function(){ var _c = childAt(eatDay, "o" + idx); return !!(_c && _c.portion && _c.portion.values); })() && (<span style={{ fontSize: 9, color: "#1e3a5f", fontWeight: 600 }} title="Portion verified">✓</span>)}
              </div>);
            })}
            {portionSlot && portionSlot.match(/^o/) && (portionLoading || portionResult || snapPre === portionSlot) && (<div style={{ background: "#faf5ff", borderRadius: 8, padding: 10, marginBottom: 8, border: "1px solid #ddd6fe" }}>
                {portionLoading && <div style={{ fontSize: 11, color: "#1e3a5f", fontWeight: 600 }}>⏳ Looking at your photo...</div>}
                {snapPre === portionSlot && !portionLoading && !portionResult && (<div data-testid="snap-pre">
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>📷 Snap a photo of your food</div>
                  <input aria-label="Photo description" value={portionDesc} onChange={function(e){ setPortionDesc(e.target.value); }} placeholder="Optional: size and detail, e.g. 'large plate', '2 sausages', '28g bar', 'half eaten'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #ddd6fe", borderRadius: 6, fontSize: 11, marginBottom: 6 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <label style={{ flex: 1, padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>📷 Take photo<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) portionAnalyze(portionSlot, e.target.files[0], listForSlot(portionSlot), portionDesc); e.target.value=""; }} style={{ display: "none" }} /></label>
                    <button onClick={cancelPortion} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>)}
                {portionResult && (<div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{portionResult._deep ? "🔎 Re-check deep dive — re-assessed outcome" : !portionPlanned ? "📷 " + (portionResult.name || "Food") : portionResult.matchesPlanned === false ? "⚠️ Looks like " + (portionResult.name || "a different food") + ", not " + portionPlanned.name : "📷 Portion Analysis"}</div>
                  {portionPlanned ? (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 10, marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, color: "#475569" }}></div><div style={{ fontWeight: 600, color: "#475569", textAlign: "center" }}>Planned</div><div style={{ fontWeight: 600, color: "#475569", textAlign: "center" }}>Actual</div>
                    <div style={{ color: "#475569" }}>kcal</div><div style={{ textAlign: "center" }}>{portionPlanned.kcal}</div><div style={{ textAlign: "center", color: portionResult.kcal > portionPlanned.kcal * 1.1 ? "#dc2626" : portionResult.kcal < portionPlanned.kcal * 0.9 ? "#2563eb" : "#0c4a6e", fontWeight: 600 }}>{portionResult.kcal}</div>
                    <div style={{ color: "#475569" }}>Protein</div><div style={{ textAlign: "center" }}>{portionPlanned.protein}g</div><div style={{ textAlign: "center", fontWeight: 600 }}>{portionResult.protein}g</div>
                    <div style={{ color: "#475569" }}>Sat fat</div><div style={{ textAlign: "center" }}>{portionPlanned.satFat}g</div><div style={{ textAlign: "center", color: portionResult.satFat > portionPlanned.satFat * 1.1 ? "#dc2626" : "#0c4a6e", fontWeight: 600 }}>{portionResult.satFat}g</div>
                  </div>) : (<div data-testid="snap-values" style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10, marginBottom: 6 }}><span><b>{portionResult.kcal}</b> kcal</span><span><b>{portionResult.protein || 0}g</b> prot</span><span><b>{portionResult.satFat || 0}g</b> s/fat</span><span><b>{portionResult.addedSugar || 0}g</b> added sugar</span></div>)}
                  {portionResult.portionNote && <div style={{ fontSize: 10, color: "#6b21a8", fontStyle: "italic", marginBottom: 6 }}>{portionResult.portionNote}</div>}
                  {(function() { var rr = rateByPortion(portionResult); return <div data-testid="snap-rating" style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, color: rr.rating === "RED" ? "#dc2626" : rr.rating === "AMBER" ? "#d97706" : "#15803d" }}>{rr.rating} · {rr.freqLabel}</div>; })()}
                  {portionResult._deep && portionFirst && <div data-testid="deep-compare" style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{compareLine(portionFirst, portionResult)}</div>}
                  {portionResult._deep && <div style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{portionResult.name}</div>}
                  {gramsLine(portionResult) && <div data-testid="portion-assumed" style={{ fontSize: 10, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Assumed: {gramsLine(portionResult)} — {portionResult.kcal} kcal</div>}
                  <div style={{ marginBottom: 8 }}><input aria-label="Photo description" value={portionDesc} onChange={function(e){ setPortionDesc(e.target.value); }} placeholder="Optional: add detail, e.g. '28g bar', 'small bowl', 'half eaten', 'brand'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #ddd6fe", borderRadius: 6, fontSize: 10 }} /></div>
                  {portionResult.matchesPlanned === false && portionPlanned && <div data-testid="snap-update-to" style={{ fontSize: 11, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Update to {portionResult.name || "this food"}</div>}
                  <div data-testid="snap-actions" style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                    <button onClick={confirmPortion} style={Object.assign({}, btnActionLg, snapBtn)}>Confirm</button>
                    <button onClick={recheckPortion} style={Object.assign({}, btnMuted, snapBtn)}>↻ Re-check</button>
                    <button onClick={cancelPortion} style={Object.assign({ background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, cursor: "pointer" }, snapBtn)}>Cancel</button>
                  </div>
                </div>)}
              </div>)}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <button onClick={function() { addOtherSlot(eatDay); }} style={btnMuted}>+ Add New</button>
            </div>
            </div>

            {/* Add new snack item */}
            {addingNew && addingSource === "defaults" && addingCategory === "snack" && (<div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 8, border: "1px solid #bfdbfe" }}>
              <div style={{ marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>Add New Snack Item</span></div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={newItemName} onChange={function(e) { setNewItemName(e.target.value); }} placeholder="e.g. Grenade bar, fruit pot..." style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} />
                <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>📷<input type="file" accept="image/*" capture="environment" onChange={function(e) { if (e.target.files && e.target.files[0]) addFromCamera(e.target.files[0]); e.target.value=""; }} style={{ display: "none" }} /></label>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addNewItem} disabled={newItemLoading || !newItemName.trim()} style={{ flex: 1, padding: "8px 12px", background: newItemLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{newItemLoading ? "..." : "Add"}</button>
                <button onClick={function() { setAddingNew(false); setNewItemName(""); setOffResults([]); setAddingSlotKey(null); setAddingSlotDay(null); }} style={{ padding: "8px 16px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, color: "#475569", cursor: "pointer", flexShrink: 0 }}>Cancel</button>
              </div>
              <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 4 }}>Type to search UK food products or describe a homemade dish.</div>{(offResults.length > 0 || offLoading) && newItemName.length >= 2 && !cameraPreview && (<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{offLoading && <div style={{ padding: "6px 8px", fontSize: 10, color: "#94a3b8" }}>🔍 Searching...</div>}{offResults.map(function(prod, pi) { var ragC = calcRAG(prod) === "RED" ? "#dc2626" : calcRAG(prod) === "AMBER" ? "#d97706" : "#16a34a"; return (<div key={pi} onClick={function() { var rating = calcRAG(prod); var ingArr = prod.ingredients ? prod.ingredients.split(",").map(function(s){return s.trim();}).filter(function(s){return s.length>0;}) : []; setCameraPreview({ name: prod.name, kcal: prod.kcal, protein: prod.protein, fat: prod.fat, satFat: prod.satFat, carbs: prod.carbs, fibre: prod.fibre, salt: prod.salt, sugar: prod.sugar, rating: rating, itemType: "packaged", ingredients: ingArr, originalIngredients: ingArr.join(", "), barcode: prod.barcode, servingSize: prod.servingSize, source: "openfoodfacts", suitability: "per 100g · Open Food Facts", category: addingCategory }); setReviewCategories(addingCategory ? [addingCategory] : []); setOffResults([]); }} style={{ padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span><span style={{ display: "flex", gap: 4, flexShrink: 0, color: "#64748b", fontSize: 9 }}><b>{prod.kcal}</b>kcal <b>{prod.protein}g</b>P <span style={{ color: ragC, fontWeight: 700 }}>{calcRAG(prod)}</span></span></div>); })}{offResults.length > 0 && <div style={{ padding: "3px 8px", fontSize: 7, color: "#94a3b8", textAlign: "center" }}>Open Food Facts · ODbL</div>}</div>)}
            </div>)}

            
            <p style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", margin: "8px 0 0", fontStyle: "italic", lineHeight: 1.3 }}>It's important to track accurate and honest information for your companion to give you the most appropriate feedback. Use 'Update Eating Lists' to update eating selection list items.</p>

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
                    <input value={helpEatText} onChange={function(e) { setHelpEatText(e.target.value); }} placeholder="e.g. M&S services, hotel buffet, Pizza Express..." style={{ flex: 1, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} />
                    <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: helpEatLoading ? "wait" : "pointer", display: "flex", alignItems: "center" }}>
                      📷
                      <input type="file" accept="image/*" capture="environment" onChange={async function(e) {
                        if (!e.target.files || !e.target.files[0]) return;
                        var file = e.target.files[0];
                        setHelpEatLoading(true);
                        try {
                          var reader = new FileReader();
                          var base64 = await new Promise(function(res, rej) { reader.onload = function() { res(reader.result.split(",")[1]); }; reader.onerror = function() { rej(new Error("Read failed")); }; reader.readAsDataURL(file); });
                          var mediaType = file.type || "image/jpeg";
                          var isJC2 = activeTab === "jc";
                          var personCtx = isJC2 ? "JC, male 49, 2000-2200 kcal/day target, 110-130g protein, under 20g sat fat, under 25g added sugar, 30-35g fibre. Thyroid issues (TSH 14.2), statin 20mg, HbA1c 43." : "Becks, female 48, 1700-1900 kcal/day target, 90-110g protein, under 20g sat fat (critical — LDL 7.2, Total Cholesterol 9.6, suspected FH), under 25g added sugar, 25-30g fibre. Perimenopausal, citalopram, atorvastatin.";
                          var locationHint = helpEatText.trim() ? " The user is at or considering: " + helpEatText.trim() + "." : "";
                          var catLabel = helpEatCat;
                          var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 800, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: "This person needs help choosing a " + catLabel + " option." + locationHint + " Person profile: " + personCtx + " Analyse the image (menu, buffet, shelf, food options). Recommend the BEST suitable option and explain why. Include portion advice if relevant (e.g. 'have half portion', 'skip the side'). Return ONLY JSON: {\"name\":\"recommended food/meal name\",\"kcal\":estimated_calories,\"protein\":grams,\"fat\":total_fat_grams,\"satFat\":saturated_fat_grams,\"addedSugar\":added_sugar_grams_only_not_natural_sugars,\"carbs\":carbs_grams,\"fibre\":fibre_grams,\"salt\":salt_grams,\"rating\":\"GREAT or AMBER or RED\",\"recommendation\":\"2-3 sentences explaining why this is the best choice and any portion/modification advice\",\"alternatives\":\"1 sentence naming one alternative if available\"}" }] }] }) });
                          var result = await resp.json();
                          var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
                          var txt = ""; if (result.content) { for (var ri = 0; ri < result.content.length; ri++) { if (result.content[ri].text) txt += result.content[ri].text; } }
                          var jsonStr = txt.replace(/```json|```/g, "").trim(); var jsonMatch = jsonStr.match(/\{[\s\S]*\}/); if (!jsonMatch) throw new Error("No JSON found"); var info = JSON.parse(jsonMatch[0]);
                          setHelpEatResult(withRuleRating({ name: info.name || "Unknown", kcal: info.kcal || 0, protein: info.protein || 0, fat: info.fat || 0, satFat: info.satFat || 0, addedSugar: info.addedSugar || 0, carbs: info.carbs || 0, fibre: info.fibre || 0, salt: info.salt || 0, rating: info.rating || "AMBER", recommendation: info.recommendation || "", alternatives: info.alternatives || "", category: helpEatCat }));
                        } catch(ce) { setFormMsg(window.aiErrorMsg(ce)); setTimeout(function(){setFormMsg("");},10000); }
                        setHelpEatLoading(false);
                        e.target.value = "";
                      }} style={{ display: "none" }} />
                    </label>
                  </div>
                  <button onClick={async function() {
                      if (!helpEatText.trim()) return;
                      setHelpEatLoading(true);
                      try {
                        var isJC2 = activeTab === "jc";
                        var personCtx = isJC2 ? "JC, male 49, 2000-2200 kcal/day target, 110-130g protein, under 20g sat fat, under 25g added sugar, 30-35g fibre. Thyroid issues (TSH 14.2), statin 20mg, HbA1c 43." : "Becks, female 48, 1700-1900 kcal/day target, 90-110g protein, under 20g sat fat (critical — LDL 7.2, Total Cholesterol 9.6, suspected FH), under 25g added sugar, 25-30g fibre. Perimenopausal, citalopram, atorvastatin.";
                        var catLabel = helpEatCat;
                        var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 800, messages: [{ role: "user", content: "This person needs help choosing a " + catLabel + " option. They are at or considering: " + helpEatText.trim() + ". Person profile: " + personCtx + " Research what food options this place/situation typically offers and recommend the BEST suitable " + catLabel + " option. Include portion advice if relevant (e.g. 'have half portion', 'skip the side'). Classify as 'packaged' if it is a pre-made supermarket product or 'ingredient' if it is home-made/cooked from scratch. If 'ingredient', list individual ingredients needed. Return ONLY JSON: {\"name\":\"recommended food/meal name\",\"kcal\":estimated_calories,\"protein\":grams,\"fat\":total_fat_grams,\"satFat\":saturated_fat_grams,\"addedSugar\":added_sugar_grams_only_not_natural_sugars,\"carbs\":carbs_grams,\"fibre\":fibre_grams,\"salt\":salt_grams,\"rating\":\"GREAT or AMBER or RED\",\"itemType\":\"packaged or ingredient\",\"ingredients\":[\"item1\",\"item2\"] (empty array if packaged),\"recommendation\":\"2-3 sentences explaining why this is the best choice and any portion/modification advice\",\"alternatives\":\"1 sentence naming one alternative if available\"}" }] }) });
                        var result = await resp.json();
                        var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
                        var txt = ""; if (result.content) { for (var ri = 0; ri < result.content.length; ri++) { if (result.content[ri].text) txt += result.content[ri].text; } }
                        var jsonStr = txt.replace(/```json|```/g, "").trim(); var jsonMatch = jsonStr.match(/\{[\s\S]*\}/); if (!jsonMatch) throw new Error("No JSON found"); var info = JSON.parse(jsonMatch[0]);
                        setHelpEatResult(withRuleRating({ name: info.name || helpEatText, kcal: info.kcal || 0, protein: info.protein || 0, fat: info.fat || 0, satFat: info.satFat || 0, addedSugar: info.addedSugar || 0, carbs: info.carbs || 0, fibre: info.fibre || 0, salt: info.salt || 0, rating: info.rating || "AMBER", itemType: info.itemType || "packaged", ingredients: info.ingredients || [], recommendation: info.recommendation || "", alternatives: info.alternatives || "", category: helpEatCat }));
                      } catch(ce) { setFormMsg(window.aiErrorMsg(ce)); setTimeout(function(){setFormMsg("");},10000); }
                      setHelpEatLoading(false);
                    }} disabled={helpEatLoading || !helpEatText.trim()} style={{ width: "100%", padding: "8px 12px", background: helpEatLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{helpEatLoading ? <span>Finding best options <span className="loading-dots" dangerouslySetInnerHTML={{ __html: "<span>.</span><span>.</span><span>.</span>" }} /></span> : "Find Best Option"}</button>
                </div>)}
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
                  <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, marginBottom: 6, background: helpEatResult.rating === "RED" ? "#fef2f2" : helpEatResult.rating === "AMBER" ? "#fffbeb" : "#f0fdf4", color: helpEatResult.rating === "RED" ? "#dc2626" : helpEatResult.rating === "AMBER" ? "#d97706" : "#15803d", border: "1px solid " + (helpEatResult.rating === "RED" ? "#fecaca" : helpEatResult.rating === "AMBER" ? "#fcd34d" : "#86efac") }}>{helpEatResult.rating}</div>
                  {helpEatResult.recommendation && <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.4, marginBottom: 4 }}>{helpEatResult.recommendation}</div>}
                  {helpEatResult.alternatives && <div style={{ fontSize: 10, color: "#64748b", fontStyle: "italic", lineHeight: 1.4 }}>Also consider: {helpEatResult.alternatives}</div>}
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

            {/* Day notes */}

              <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Day notes</span>
              <textarea defaultValue={dayMeals._note || ""} onBlur={function(e) { setMeal(eatDay, "_note", e.target.value); }} placeholder="e.g. Ate out, exam stress, birthday..." style={{ width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, minHeight: 30, resize: "vertical", boxSizing: "border-box" }} />
            </div>
            </div>

            {/* Eating Day Feedback */}
            <div style={{ marginTop: 12 }}>
              <button onClick={function(){ generateEatFeedback(eatDay); }} disabled={eatFbLoading} style={{ width: "100%", padding: 12, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: eatFbLoading ? "not-allowed" : "pointer", opacity: eatFbLoading ? 0.7 : 1, background: eatFbLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", marginBottom: 6 }}>{eatFbLoading ? React.createElement("span", null, "Generating, please wait ", React.createElement("span", { className: "loading-dots", dangerouslySetInnerHTML: { __html: "<span>.</span><span>.</span><span>.</span>" } })) : "My Companion Eating Feedback"}</button>
              {(eatFbResults[activeTab] || {})[eatDay] && <button onClick={function(){ setEatFbExpanded(!eatFbExpanded); }} style={{ width: "100%", padding: 6, background: "none", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, color: "#64748b", cursor: "pointer", marginBottom: 6 }}>{eatFbExpanded ? "▲ Hide Feedback" : "▼ Show Feedback"}</button>}
              {eatFbExpanded && (eatFbResults[activeTab] || {})[eatDay] && (function() { var efb = eatFbResults[activeTab][eatDay]; return React.createElement("div", { style: { marginBottom: 10 } },
                React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" } },
                  efb._when && React.createElement("div", { style: { padding: "6px 14px", background: "#f8fafc", fontSize: 10, color: "#94a3b8", borderBottom: "1px solid #e2e8f0" } }, "Generated ", efb._when, " for ", isJC ? "JC" : "Becks"),
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
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>New items show a <b>Check me</b> badge until you open and save them.</div>
              <button onClick={function(){ setBulkDone(null); }} style={{ ...btnActionLg, width: "100%", borderRadius: 8 }}>OK</button>
            </div>
          </div>)}
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
          
        </div>); } catch(eatErr) { return (<div style={{ padding: 20, color: "#dc2626" }}>Eating section error: {String(eatErr)}</div>); } }
