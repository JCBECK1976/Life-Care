import { NO_FOOD_MSG, NO_FOOD_RULE, noFood } from "../lib/snap.js";
import { readImageForAI } from "../lib/image.js";
import { calcWeek, mealKey } from "../lib/utils.js";
import { sGet, sSet } from "../lib/storage.js";
import { withRuleRating } from "../lib/rag.js";
import { loadWeekDoc, viewFromDoc } from "../lib/children.js";
import { handleApiError } from "../lib/api.js";
import { btnActionLg, btnClear, btnDelete, btnEdit, btnMuted, btnP } from "../constants/styles.js";
import { BREAKFASTS, DAY_MAP, DEFAULT_BREAKFASTS, DEFAULT_DINNERS_GB, DEFAULT_LUNCHES, DINNERS, LUNCHES, MEAL_DAYS, POTATO_SIDES, SNACKS, VEG_SIDES } from "../constants/food.js";

// Moved verbatim from Dashboard in App.jsx. It receives the Dashboard values it uses
// (state, setters, handlers) as one `ctx` prop; state management is unchanged.
export default function ShopSection({ ctx }) {
  const {
    accentBorder, accentBtnBorder, accentBtnLight, accentLight, activeTab, customBreakfasts, customDesserts, customDrinks,
    customLunches, customMeals, customSnacks, data, editHealthText, editingHealthLog, foodCheckerCategory, foodCheckerLoading,
    foodCheckerPreview, foodCheckerText, generatedShop, planned, setCustomBreakfasts, setCustomLunches, setCustomMeals, setCustomSnacks,
    setEditHealthText, setEditingHealthLog, setFoodCheckerCategory, setFoodCheckerLoading, setFoodCheckerPreview, setFoodCheckerText, setFormMsg, setGeneratedShop,
    setShopDefaults, setShopLoading, setSupermarket, setWeekOff, shopDefaults, shopList, shopLoading, supermarket,
    weekLabel, weekStart
  } = ctx;

  /* v2.14.1: the Food Checker photo analysis as a function, so a "no food" result can be re-checked with the same photo
     (kept in memory only) and the description. */
  var runFoodPhoto = async function(file) {
    window._lcFoodPhoto = file;
    setFoodCheckerLoading(true);
                      try {
                        var _img = await readImageForAI(file);   /* v2.14.0: shrunk before sending */
                        var base64 = _img.data; var mediaType = _img.mediaType;
                        var isJC2 = activeTab === "jc";
                        var fcDescHint = foodCheckerText.trim() ? " The user describes this as: \"" + foodCheckerText.trim() + "\". PREFER the user's description over your own size or product guess." : "";
                        var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: "Identify this food or product." + fcDescHint + NO_FOOD_RULE + " Read any nutrition label if visible. Classify as 'packaged' if it is a pre-made supermarket product or 'ingredient' if it is a home-made recipe cooked from scratch. If 'ingredient', list the individual ingredients needed. Return ONLY JSON: {\"isFood\":true/false,\"assumed\":\"the size or weight these values are for, e.g. 28g bar\",\"name\":\"product or food name\",\"kcal\":calories_per_serving,\"protein\":grams,\"fat\":total_fat_grams,\"satFat\":saturated_fat_grams,\"addedSugar\":added_sugar_grams_only_not_natural_sugars,\"carbs\":carbs_grams,\"fibre\":fibre_grams,\"salt\":salt_grams,\"rating\":\"GREAT or AMBER or RED based on healthiness\",\"itemType\":\"packaged or ingredient\",\"ingredients\":[\"item1\",\"item2\"] (empty array if packaged),\"suitability\":\"ONE sentence suitability for " + (isJC2 ? "JC, male 49, 2000-2200 kcal target, <20g sat fat, thyroid issues" : "Becks, female 48, 1700-1900 kcal target, <20g sat fat, LDL 7.2") + "\"}" }] }] }) });
                        var result = await resp.json();
                        var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
                        var txt = ""; if (result.content) { for (var ri = 0; ri < result.content.length; ri++) { if (result.content[ri].text) txt += result.content[ri].text; } }
                        var jsonStr = txt.replace(/```json|```/g, "").trim(); var jsonMatch = jsonStr.match(/\{[\s\S]*\}/); if (!jsonMatch) throw new Error("No JSON found"); var info = JSON.parse(jsonMatch[0]);
                        if (noFood(info)) { setFoodCheckerPreview({ noFood: true, name: info.name || "" }); setFoodCheckerLoading(false); return; }   // v2.14.1
                        setFoodCheckerPreview(withRuleRating({ assumed: info.assumed || "", name: info.name || foodCheckerText.trim() || "Unknown", kcal: info.kcal || 0, protein: info.protein || 0, fat: info.fat || 0, satFat: info.satFat || 0, addedSugar: info.addedSugar || 0, rating: info.rating || "AMBER", itemType: info.itemType || "packaged", ingredients: info.ingredients || [], suitability: info.suitability || "" }));
                      } catch(ce) { setFormMsg(window.aiErrorMsg(ce)); setTimeout(function(){setFormMsg("");},10000); }
    setFoodCheckerLoading(false);
  };

  return (
<div>
          {/* Week header — centred like Eating */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button onClick={function() { setWeekOff(function(o) { return o - 1; }); }} style={{ background: "#e2e8f0", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>&lsaquo;</button>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800 }}>Week {calcWeek(data.config.trainingStart)}</div><div style={{ fontSize: 10, color: "#64748b" }}>{weekLabel}</div><div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{planned}/7 dinners · {shopList.length} items</div></div>
            <button onClick={function() { setWeekOff(function(o) { return o + 1; }); }} style={{ background: "#e2e8f0", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>&rsaquo;</button>
          </div>

          {/* White container wrapping all Shop content */}
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>My Shop</div>

          {/* Choose my Supermarket */}
            <div style={{ background: accentLight, borderRadius: 8, padding: 10, border: "1px solid #cbd5e1", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>🛒 Choose My Supermarket</div>
              <select value={supermarket} onChange={async (e) => { setSupermarket(e.target.value); await sSet("supermarket_pref", e.target.value); }} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, background: "#fff" }}>
                {["Aldi", "Tesco", "Asda", "Sainsbury's", "Morrisons", "Lidl", "Waitrose", "M&S", "Co-op", "Iceland", "Any"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>Shopping list suggestions will be tailored to your chosen supermarket</div>
            </div>

          {/* Food Checker */}
          <div style={{ background: accentLight, borderRadius: 8, padding: 10, border: "1px solid #cbd5e1", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>📷 Food Checker</div>
              {!foodCheckerPreview ? (<div>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input value={foodCheckerText} onChange={function(e) { setFoodCheckerText(e.target.value); }} aria-label="Food description" placeholder="Optional: add detail, e.g. '28g bar', 'small bowl', 'half eaten', 'brand'" style={{ flex: 1, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} />
                  <label style={{ padding: "6px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center" }}>
                    📷
                    <input type="file" data-share="food" accept="image/*" capture="environment" onChange={async function(e) {
                      if (!e.target.files || !e.target.files[0]) return;
                      await runFoodPhoto(e.target.files[0]);
                      e.target.value = "";
                    }} style={{ display: "none" }} />
                  </label>
                </div>
                <button onClick={async function() {
                    if (!foodCheckerText.trim()) return;
                    setFoodCheckerLoading(true);
                    try {
                      var isJC2 = activeTab === "jc";
                      var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, messages: [{ role: "user", content: "Identify this food or product: " + foodCheckerText + ". Classify as 'packaged' if pre-made supermarket product or 'ingredient' if home-made recipe. If 'ingredient', list individual ingredients needed. Return ONLY JSON: {\"assumed\":\"the size or weight these values are for, e.g. 28g bar\",\"name\":\"product name\",\"kcal\":calories_per_serving,\"protein\":grams,\"fat\":total_fat_grams,\"satFat\":saturated_fat_grams,\"addedSugar\":added_sugar_grams_only_not_natural_sugars,\"rating\":\"GREAT or AMBER or RED based on healthiness\",\"itemType\":\"packaged or ingredient\",\"ingredients\":[\"item1\",\"item2\"] (empty array if packaged),\"suitability\":\"ONE sentence suitability for " + (isJC2 ? "JC, male 49, 2000-2200 kcal target, <20g sat fat, thyroid issues" : "Becks, female 48, 1700-1900 kcal target, <20g sat fat, LDL 7.2") + "\"}" }] }) });
                      var result = await resp.json();
                      var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
                      var txt = ""; if (result.content) { for (var ri = 0; ri < result.content.length; ri++) { if (result.content[ri].text) txt += result.content[ri].text; } }
                      var jsonStr = txt.replace(/```json|```/g, "").trim(); var jsonMatch = jsonStr.match(/\{[\s\S]*\}/); if (!jsonMatch) throw new Error("No JSON found"); var info = JSON.parse(jsonMatch[0]);
                      setFoodCheckerPreview(withRuleRating({ assumed: info.assumed || "", name: info.name || foodCheckerText, kcal: info.kcal || 0, protein: info.protein || 0, fat: info.fat || 0, satFat: info.satFat || 0, addedSugar: info.addedSugar || 0, rating: info.rating || "AMBER", itemType: info.itemType || "packaged", ingredients: info.ingredients || [], suitability: info.suitability || "" }));
                    } catch(ce) { setFormMsg(window.aiErrorMsg(ce)); setTimeout(function(){setFormMsg("");},10000); }
                    setFoodCheckerLoading(false);
                  }} disabled={foodCheckerLoading || !foodCheckerText.trim()} style={{ width: "100%", padding: "8px 12px", background: foodCheckerLoading ? "#94a3b8" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{foodCheckerLoading ? <span>Checking <span className="loading-dots" dangerouslySetInnerHTML={{ __html: "<span>.</span><span>.</span><span>.</span>" }} /></span> : "Check"}</button>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>Type a food name or scan a product, with or without a short description, to check nutritional information</div>
              </div>) : foodCheckerPreview.noFood ? (<div data-testid="checker-no-food">
                <div role="alert" style={{ fontSize: 11, fontWeight: 600, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: 8, marginBottom: 6 }}>{NO_FOOD_MSG}</div>
                <input aria-label="Food description" value={foodCheckerText} onChange={function(e) { setFoodCheckerText(e.target.value); }} placeholder="Optional: add detail, e.g. '28g bar', 'brand'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, marginBottom: 6 }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button disabled style={{ flex: 1, padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, opacity: 0.45, cursor: "not-allowed" }}>Confirm</button>
                  <button disabled={foodCheckerLoading} onClick={function() { if (window._lcFoodPhoto) runFoodPhoto(window._lcFoodPhoto); }} style={{ flex: 1, padding: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" }}>{foodCheckerLoading ? "⏳…" : "Re-check"}</button>
                  <button onClick={function() { setFoodCheckerPreview(null); setFoodCheckerText(""); }} style={{ flex: 1, padding: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>) : (<div>
                <div style={{ background: "#f0fdf4", borderRadius: 8, padding: 10, border: "1px solid #86efac", marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>📷 {foodCheckerPreview.name}</div>
                  {foodCheckerPreview.assumed && <div data-testid="checker-assumed" style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>Assumed: {foodCheckerPreview.assumed} — {foodCheckerPreview.kcal} kcal</div>}
                  <div style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 11 }}>
                    <span><b>{foodCheckerPreview.kcal}</b> kcal</span>
                    <span><b>{foodCheckerPreview.protein}g</b> prot</span>
                    <span><b>{foodCheckerPreview.fat}g</b> fat</span>
                    {foodCheckerPreview.satFat > 0 && <span><b>{foodCheckerPreview.satFat}g</b> s/fat</span>}
                    {foodCheckerPreview.carbs > 0 && <span><b>{foodCheckerPreview.carbs}g</b> carbs</span>}
                    {foodCheckerPreview.fibre > 0 && <span><b>{foodCheckerPreview.fibre}g</b> fib</span>}
                    {foodCheckerPreview.salt > 0 && <span><b>{foodCheckerPreview.salt}g</b> salt</span>}
                  </div>
                  <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, marginBottom: 6, background: foodCheckerPreview.rating === "RED" ? "#fef2f2" : foodCheckerPreview.rating === "AMBER" ? "#fffbeb" : "#f0fdf4", color: foodCheckerPreview.rating === "RED" ? "#dc2626" : foodCheckerPreview.rating === "AMBER" ? "#d97706" : "#15803d", border: "1px solid " + (foodCheckerPreview.rating === "RED" ? "#fecaca" : foodCheckerPreview.rating === "AMBER" ? "#fcd34d" : "#86efac") }}>{foodCheckerPreview.rating}</div>
                  {foodCheckerPreview.suitability && <div style={{ fontSize: 11, color: "#475569", fontStyle: "italic", lineHeight: 1.4 }}>{foodCheckerPreview.suitability}</div>}
                </div>
                {!foodCheckerCategory ? (<div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Add to which list?</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                    {["breakfast","lunch","dinner","snack","drink","dessert"].map(function(cat) { return (<button key={cat} onClick={function(){setFoodCheckerCategory(cat);}} style={{ padding: "6px 12px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 11, cursor: "pointer", textTransform: "capitalize" }}>{cat}</button>); })}
                    <button onClick={async function() {
                      var cp = foodCheckerPreview;
                      var itemText = cp.name + " (" + cp.kcal + " kcal)";
                      if (generatedShop && Array.isArray(generatedShop)) {
                        var isZoned = generatedShop.length > 0 && typeof generatedShop[0] === "object" && generatedShop[0].zone;
                        if (isZoned) {
                          var bestZone = "Health & Free From";
                          setGeneratedShop(function(prev) { var found = false; var nz = prev.map(function(z) { if (z.zone === bestZone) { found = true; return { zone: z.zone, items: [].concat(z.items, [itemText]).sort() }; } return z; }); if (!found) nz.push({ zone: bestZone, items: [itemText] }); return nz; });
                        } else {
                          setGeneratedShop(function(prev) { return [].concat(prev, [itemText]).sort(); });
                        }
                      } else {
                        setGeneratedShop([{ zone: "Health & Free From", items: [itemText] }]);
                      }
                      setFormMsg("Added " + cp.name + " to shopping list");
                      setFoodCheckerPreview(null); setFoodCheckerCategory(""); setFoodCheckerText("");
                      setTimeout(function(){setFormMsg("");}, 3000);
                    }} style={{ padding: "6px 12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, fontSize: 11, cursor: "pointer", color: "#15803d", fontWeight: 600 }}>🛒 Shopping List</button>
                  </div>
                  <button onClick={function() { setFoodCheckerPreview(null); setFoodCheckerText(""); }} style={{ width: "100%", padding: 8, background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 8, fontSize: 12, color: "#475569", cursor: "pointer" }}>Cancel</button>
                </div>) : (<div style={{ display: "flex", gap: 6 }}>
                  <button onClick={async function() {
                    var cp = foodCheckerPreview; var cat = foodCheckerCategory;
                    var newItem = withRuleRating({ id: "custom_" + Date.now(), name: cp.name, jcKcal: cp.kcal, beckKcal: cp.kcal, protein: cp.protein || 0, fat: cp.fat || 0, satFat: cp.satFat || 0, addedSugar: cp.addedSugar || 0, carbs: cp.carbs || 0, fibre: cp.fibre || 0, salt: cp.salt || 0, rating: cp.rating, itemType: cp.itemType || "packaged", ingredients: cp.ingredients || [], freq: "Daily", isCustom: true }); /* D11: rule rating */
                    if (cat === "breakfast") { var u = [].concat(customBreakfasts, [newItem]); setCustomBreakfasts(u); await sSet("custom_breakfasts", JSON.stringify(u)); }
                    else if (cat === "lunch") { var u = [].concat(customLunches, [newItem]); setCustomLunches(u); await sSet("custom_lunches", JSON.stringify(u)); }
                    else if (cat === "dinner") { newItem.jcProt = cp.protein; newItem.beckProt = cp.protein; newItem.jcFat = cp.fat; newItem.beckFat = cp.fat; newItem.time = 30; newItem.shop = (cp.itemType === "ingredient" && cp.ingredients && cp.ingredients.length > 0) ? cp.ingredients : [cp.name]; var u = [].concat(customMeals, [newItem]); setCustomMeals(u); await sSet("custom_meals", JSON.stringify(u)); }
                    else { var u = [].concat(customSnacks, [newItem]); setCustomSnacks(u); await sSet("custom_snacks", JSON.stringify(u)); }
                    setFormMsg("Added " + cp.name + " to " + cat + " list");
                    setFoodCheckerPreview(null); setFoodCheckerCategory(""); setFoodCheckerText("");
                    setTimeout(function(){setFormMsg("");}, 3000);
                  }} style={{...btnActionLg, flex: 1, borderRadius: 6}}>+ Add to {foodCheckerCategory}</button>
                  <button onClick={function() { setFoodCheckerPreview(null); setFoodCheckerCategory(""); setFoodCheckerText(""); }} style={{ padding: "8px 16px", background: accentBtnLight, color: "#475569", border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                </div>)}
              </div>)}
          </div>{/* end Food Checker */}

          {/* My Companion Shopping Generator */}
          <button onClick={async () => {
            if (planned === 0) { setFormMsg("Plan your week food choices in 'My Eating' to get your shopping list suggestions"); setTimeout(() => setFormMsg(""), 10000); return; }
            setShopLoading(true);
            try {
              var allItems = [].concat(BREAKFASTS, DEFAULT_BREAKFASTS, customBreakfasts, LUNCHES, DEFAULT_LUNCHES, customLunches, DINNERS, DEFAULT_DINNERS_GB, customMeals, SNACKS, customSnacks, customDrinks, customDesserts, POTATO_SIDES, VEG_SIDES);
              var lookupName = function(id) { if (String(id).indexOf("__adhoc__:") === 0) return id.slice(10); var found = allItems.find(function(x) { return x.id === id; }); return found ? found.name : id; };
              var lookupShop = function(id) { var found = allItems.find(function(x) { return x.id === id; }); return found && found.shop ? found.shop : []; };
              var mealNames = "";
              var allPeople = Object.keys(data).filter(function(k) { return k !== "config"; });
              for (var pi = 0; pi < allPeople.length; pi++) {
                var pn = allPeople[pi];
                var pName = (data[pn].profile && data[pn].profile.name) || pn;
                var pMeals = viewFromDoc(await loadWeekDoc(pn, weekStart, { write: false }), { parentIds: true }); /* v2.6.5: children */
                var pDays = MEAL_DAYS.map(function(d) { var dk = DAY_MAP[d.key] || d.key; var entry = pMeals[dk]; if (!entry || typeof entry !== "object") return null; var parts = []; if (entry.b) parts.push("B:" + lookupName(entry.b)); if (entry.l) parts.push("L:" + lookupName(entry.l)); if (entry.d) parts.push("D:" + lookupName(entry.d)); for (var di2 = 2; di2 <= 5; di2++) { if (entry["d" + di2]) parts.push("D:" + lookupName(entry["d" + di2])); } for (var sideKey of ["dp","dv","dp2","dv2","dp3","dv3","dp4","dv4"]) { if (entry[sideKey] && entry[sideKey] !== "__empty__") { var sShop = lookupShop(entry[sideKey]); if (sShop.length > 0) parts.push("Side:" + sShop.join(", ")); else parts.push("Side:" + lookupName(entry[sideKey])); } } for (var oi = 1; oi <= 7; oi++) { if (entry["o" + oi] && entry["o" + oi] !== "__placeholder__" && entry["o" + oi] !== "__empty__") parts.push("S:" + lookupName(entry["o" + oi])); } return parts.length > 0 ? d.label + ": " + parts.join(", ") : null; }).filter(Boolean).join("; ");
                if (pDays) mealNames += pName + ": " + pDays + ". ";
              }
              var defaultItems = shopDefaults.length > 0 ? " Always include these default items: " + shopDefaults.join(", ") + "." : "";
              const prompt = "Generate a shopping list containing ONLY the ingredients needed to make these specific meals at " + supermarket + " (UK). Meals: " + mealNames + "." + defaultItems + " ONLY include ingredients required for the meals listed above. Do NOT add weekly staples, household items, or anything not directly needed for these meals. Group items by supermarket aisle zone. Return ONLY a JSON array of objects: [{\"zone\":\"Fruit & Veg\",\"items\":[\"2x bananas\",\"1x broccoli\"]},{\"zone\":\"Meat & Poultry\",\"items\":[\"2x chicken breast\"]}]. Use these zones in order: Fruit & Veg, Bakery & Bread, Meat & Poultry, Fish, Dairy & Eggs, Chilled, Frozen, Tinned & Packets, Rice Pasta & Noodles, Cooking Oils & Sauces, Cereals & Porridge, Snacks & Bars, Drinks, Health & Free From, Household. Only include zones that have items.";
              const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2000, messages: [{ role: "user", content: prompt }] }) });
              if (!response.ok) throw new Error("HTTP " + response.status);
              const result = await response.json();
              if (result.error) throw new Error(result.error.message || "API error");
              var text = (result.content || []).map(function(blk) { return blk.text || ""; }).join("");
              var cleanShop = text.replace(/```json|```/g, "").trim().replace(/\n/g, " ").replace(/[\x00-\x1F]/g, " ");
              if (!cleanShop) throw new Error("Empty AI response");
              var shopData;
              try { shopData = JSON.parse(cleanShop); } catch(je) {
                var fixed = cleanShop;
                if (!fixed.endsWith("}")) { fixed = fixed.replace(/,?\s*"[^"]*$/, ""); fixed = fixed.replace(/,?\s*$/, ""); var ob = (fixed.match(/\[/g)||[]).length - (fixed.match(/\]/g)||[]).length; for(var xi=0;xi<ob;xi++) fixed+="]"; var cb = (fixed.match(/\{/g)||[]).length - (fixed.match(/\}/g)||[]).length; for(var xj=0;xj<cb;xj++) fixed+="}"; }
                shopData = JSON.parse(fixed);
              }
              setGeneratedShop(shopData);
            } catch(shopErr) { setFormMsg("Error: " + String(shopErr).substring(0, 100)); setTimeout(() => setFormMsg(""), 10000); }
            setShopLoading(false);
          }} disabled={shopLoading} style={{ ...btnP(!shopLoading), marginBottom: 6, background: shopLoading ? "linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", opacity: shopLoading ? 0.85 : 1 }}>{shopLoading ? <span>Generating<span className="loading-dots" dangerouslySetInnerHTML={{ __html: "<span>.</span><span>.</span><span>.</span>" }} /></span> : "My Companion Shopping Generator"}</button>
          <div style={{ textAlign: "center", fontSize: 10, color: "#94a3b8", marginBottom: 14, lineHeight: 1.4 }}>Plan your week food choices in <b>'My Eating'</b> to get your shopping list suggestions</div>
          {/* Shopping List — grey sub-container */}
          <div style={{ background: accentLight, borderRadius: 8, padding: 12, border: "1px solid " + accentBorder, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8 }}>My Shopping List</div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10 }}>Select 'Default' to automatically apply to each week.</div>
          {generatedShop && Array.isArray(generatedShop) && (() => {
            /* Render zone-grouped format: [{zone, items}] or flat strings */
            var isZoned = generatedShop.length > 0 && typeof generatedShop[0] === "object" && generatedShop[0].zone;
            var zones = isZoned ? generatedShop : [{ zone: "All Items", items: generatedShop.map(function(x) { return typeof x === "string" ? x : (x.item || x.name || JSON.stringify(x)); }) }];
            var toggleDefault = async function(itemText) { var cur = [].concat(shopDefaults); var idx = cur.indexOf(itemText); if (idx >= 0) { cur.splice(idx, 1); } else { cur.push(itemText); } setShopDefaults(cur); await sSet("shop_defaults", JSON.stringify(cur)); };
            var removeItem = function(zi, ii) { if (!confirm("Remove this item from the shopping list?")) return; setGeneratedShop(function(prev) { if (!isZoned) return prev.filter(function(_, idx) { return idx !== ii; }); var nz = prev.map(function(z, zIdx) { if (zIdx !== zi) return z; return { zone: z.zone, items: z.items.filter(function(_, idx) { return idx !== ii; }) }; }).filter(function(z) { return z.items.length > 0; }); return nz; }); };
            var editItem = function(zi, ii, newText) { setGeneratedShop(function(prev) { if (!isZoned) return prev.map(function(x, idx) { return idx === ii ? newText : x; }); return prev.map(function(z, zIdx) { if (zIdx !== zi) return z; return { zone: z.zone, items: z.items.map(function(x, idx) { return idx === ii ? newText : x; }) }; }); }); };
            return (<div style={{ marginBottom: 10 }}>
              {zones.map(function(zone, zi) { return (<div key={zi} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 8, overflow: "hidden" }}>
                <div style={{ padding: "8px 12px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", fontSize: 11, fontWeight: 700, color: "#475569" }}>{zone.zone}</div>
                {(zone.items || []).map(function(item, ii) { var itemText = typeof item === "string" ? item : (item.item || item.name || JSON.stringify(item)); var isDef = shopDefaults.indexOf(itemText) >= 0; var editKey2 = "shop_" + zi + "_" + ii; var isEditing2 = editingHealthLog === editKey2; return (<div key={ii} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: ii < zone.items.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  {isEditing2 ? (<div style={{ flex: 1, display: "flex", gap: 4, marginRight: 4 }}><input value={editHealthText} onChange={function(e) { setEditHealthText(e.target.value); }} style={{ flex: 1, padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} onKeyDown={function(e) { if (e.key === "Enter") { editItem(zi, ii, editHealthText.trim()); setEditingHealthLog(null); setFormMsg("Updated ✓"); setTimeout(function(){setFormMsg("");}, 2000); } }} /><button onClick={function() { editItem(zi, ii, editHealthText.trim()); setEditingHealthLog(null); setFormMsg("Updated ✓"); setTimeout(function(){setFormMsg("");}, 2000); }} style={{ padding: "4px 10px", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Save</button><button onClick={function() { setEditingHealthLog(null); }} style={{ padding: "4px 10px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 10, color: "#475569", cursor: "pointer" }}>Cancel</button></div>) : (<span style={{ fontSize: 12, flex: 1 }}>{itemText}</span>)}
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={function() { toggleDefault(itemText); }} style={{ padding: "4px 8px", background: isDef ? "#dbeafe" : accentBtnLight, border: "1px solid " + (isDef ? "#93c5fd" : accentBtnBorder), borderRadius: 6, fontSize: 10, color: isDef ? "#1d4ed8" : "#475569", cursor: "pointer", fontWeight: isDef ? 700 : 400 }}>{isDef ? "✓ Default" : "Default"}</button>
                    {!isEditing2 && <button onClick={function() { setEditingHealthLog(editKey2); setEditHealthText(itemText); }} style={btnEdit}>✎ Edit</button>}
                    <button onClick={function() { removeItem(zi, ii); }} style={btnDelete}>🗑 Del</button>
                  </div>
                </div>); })}
              </div>); })}
            </div>);
          })()}
          {(() => { if (shopDefaults.length > 0 && !generatedShop) return (<div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 8 }}><div style={{ padding: "8px 12px", background: "#dbeafe", borderBottom: "1px solid #bfdbfe", fontSize: 11, fontWeight: 700, color: "#1e40af" }}>Weekly Defaults</div>{shopDefaults.map(function(df, di) { return (<div key={di} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: di < shopDefaults.length - 1 ? "1px solid #f1f5f9" : "none", fontSize: 12 }}><span>{df}</span><button onClick={async function() { var cur = shopDefaults.filter(function(x) { return x !== df; }); setShopDefaults(cur); await sSet("shop_defaults", JSON.stringify(cur)); }} style={btnMuted}>✕ Remove</button></div>); })}</div>); return null; })()}
          {!generatedShop && shopList.length > 0 && (<div style={{ marginBottom: 10 }}>{(() => {
            var toggleDefault2 = async function(itemText) { var cur = [].concat(shopDefaults); var idx = cur.indexOf(itemText); if (idx >= 0) { cur.splice(idx, 1); } else { cur.push(itemText); } setShopDefaults(cur); await sSet("shop_defaults", JSON.stringify(cur)); };
            return (<div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>{shopList.map(([it, ct], i) => { var isDef = shopDefaults.indexOf(it) >= 0; var editKey3 = "shopAuto_" + i; var isEditing3 = editingHealthLog === editKey3; return (<div key={it} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: i < shopList.length - 1 ? "1px solid #f1f5f9" : "none" }}>{isEditing3 ? (<div style={{ flex: 1, display: "flex", gap: 4, marginRight: 4 }}><input value={editHealthText} onChange={function(e) { setEditHealthText(e.target.value); }} style={{ flex: 1, padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11 }} onKeyDown={function(e) { if (e.key === "Enter") { setEditingHealthLog(null); setFormMsg("Updated ✓"); setTimeout(function(){setFormMsg("");}, 2000); } }} /><button onClick={function() { setEditingHealthLog(null); setFormMsg("Updated ✓"); setTimeout(function(){setFormMsg("");}, 2000); }} style={{ padding: "4px 10px", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Save</button><button onClick={function() { setEditingHealthLog(null); }} style={{ padding: "4px 10px", background: accentBtnLight, border: "1px solid " + accentBtnBorder, borderRadius: 6, fontSize: 10, color: "#475569", cursor: "pointer" }}>Cancel</button></div>) : (<span style={{ fontSize: 12, flex: 1 }}>{it}</span>)}<div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>{ct > 1 && <span style={{ fontSize: 10, fontWeight: 600, color: "#3b82f6", background: "#eff6ff", padding: "2px 6px", borderRadius: 10 }}>×{ct}</span>}<button onClick={function() { toggleDefault2(it); }} style={{ padding: "4px 8px", background: isDef ? "#dbeafe" : accentBtnLight, border: "1px solid " + (isDef ? "#93c5fd" : accentBtnBorder), borderRadius: 6, fontSize: 10, color: isDef ? "#1d4ed8" : "#475569", cursor: "pointer", fontWeight: isDef ? 700 : 400 }}>{isDef ? "✓ Default" : "Default"}</button>{!isEditing3 && <button onClick={function() { setEditingHealthLog(editKey3); setEditHealthText(it); }} style={btnEdit}>✎ Edit</button>}<button onClick={function() { setFormMsg("This item is auto-generated from your eating plan"); setTimeout(function(){setFormMsg("");}, 3000); }} style={btnDelete}>🗑 Del</button></div></div>); })}</div>);
          })()}</div>)}
          {/* Action buttons — show for generated list OR non-generated shopList */}
          {(generatedShop && Array.isArray(generatedShop) || (!generatedShop && shopList.length > 0)) && (<div style={{ display: "flex", gap: 6, marginTop: 8, marginBottom: 4 }}>
            <button onClick={async function() {
              setShopLoading(true);
              try {
                var allItems = [];
                if (generatedShop && Array.isArray(generatedShop)) {
                  generatedShop.forEach(function(z) { (z.items || []).forEach(function(it) { allItems.push(typeof it === "string" ? it : (it.item || it.name || JSON.stringify(it))); }); });
                } else if (shopList.length > 0) {
                  shopList.forEach(function(pair) { allItems.push(pair[0] + (pair[1] > 1 ? " x" + pair[1] : "")); });
                }
                var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2000, messages: [{ role: "user", content: "Sort ONLY these exact items into UK supermarket aisle zones. Do NOT add, remove, expand or generate any new items — just categorise what is given. Items: " + allItems.join(", ") + ". Return ONLY a JSON array: [{\"zone\":\"Fruit & Veg\",\"items\":[...]},{\"zone\":\"Bakery & Bread\",\"items\":[...]}]. Use zones in order: Fruit & Veg, Bakery & Bread, Meat & Poultry, Fish, Dairy & Eggs, Chilled, Frozen, Tinned & Packets, Rice Pasta & Noodles, Cooking Oils & Sauces, Cereals & Porridge, Snacks & Bars, Drinks, Health & Free From, Household. Only include zones that have items. Keep item names exactly as given. Output must contain the same number of items as input — no additions." }] }) });
                var result = await resp.json();
                var text = (result.content || []).map(function(blk) { return blk.text || ""; }).join("");
                var clean = text.replace(/```json|```/g, "").trim();
                var grouped = JSON.parse(clean);
                setGeneratedShop(grouped);
                setFormMsg("Grouped by category ✓");
              } catch(err) { setFormMsg(window.aiErrorMsg(err)); }
              setShopLoading(false);
              setTimeout(function(){setFormMsg("");}, 3000);
            }} disabled={shopLoading} style={{...btnActionLg, flex: 1, justifyContent: "center", fontSize: 11, opacity: shopLoading ? 0.85 : 1}}>{shopLoading ? <span>Grouping<span className="loading-dots" dangerouslySetInnerHTML={{ __html: "<span>.</span><span>.</span><span>.</span>" }} /></span> : "Group by Aisle"}</button>
            {generatedShop && <button onClick={function() { setGeneratedShop(null); setFormMsg("Shopping list cleared"); setTimeout(function(){setFormMsg("");}, 2000); }} style={{...btnClear, padding: "8px 16px", fontSize: 11, borderRadius: 8}}>Clear List</button>}
          </div>)}
          {/* Add item input */}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input id="shopAddInput" placeholder="Add item to shopping list..." style={{ flex: 1, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, background: "#fff" }} onKeyDown={function(e) { if (e.key === "Enter") { document.getElementById("shopAddBtn").click(); } }} />
            <button id="shopAddBtn" onClick={function() { var input = document.getElementById("shopAddInput"); var item = input.value.trim(); if (!item) return; if (generatedShop && Array.isArray(generatedShop)) { var isZoned = generatedShop.length > 0 && typeof generatedShop[0] === "object" && generatedShop[0].zone; if (isZoned) { var bestZone = "Added Items"; setGeneratedShop(function(prev) { var found = false; var nz = prev.map(function(z) { if (z.zone === bestZone) { found = true; return { zone: z.zone, items: [].concat(z.items, [item]) }; } return z; }); if (!found) nz.push({ zone: bestZone, items: [item] }); return nz; }); } else { setGeneratedShop(function(prev) { return [].concat(prev, [item]); }); } } else { var baseItems = shopList.map(function(pair) { return pair[0] + (pair[1] > 1 ? " ×" + pair[1] : ""); }); setGeneratedShop([{ zone: "From Meal Plan", items: baseItems }, { zone: "Added Items", items: [item] }]); } input.value = ""; setFormMsg("Added ✓"); setTimeout(function(){setFormMsg("");}, 2000); }} style={{...btnMuted, fontSize: 11}}>+ Add</button>
          </div>
          </div>{/* end Shopping List grey sub-container */}
          </div>{/* end white container wrapper */}

        </div>
  );
}
