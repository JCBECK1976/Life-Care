# Eating lists redesign — per portion, Update Lists tabs, clarifying AI (v2.19.0)

> **Status:** design (JC, 15 Nov 2026) for v2.19.0 on `build`. Decision: [ADR 0015](../adr/0015-eating-lists-per-portion.md). Keeps the parent/child model ([ADR 0005/HLD §5](../HLD.md)) and personal ratings ([CALORIES.md §7.7](CALORIES.md)).

## 0. Why (diagnosis, 3rd week the eating flow failed)
- Open Food Facts (OFF) items are **per 100 g**; the app stored those numbers as if they were one portion and the screen still said "per 100g".
- The D7 recalculation asked the AI for the **whole recipe**; nothing knew **"serves N"**. A jar of sauce + pasta + cheese + chicken came back as one portion → absurd values (e.g. 1,247 kcal).
- AI replies that weren't clean JSON ended the flow with "could not be read" / "did not return values".

## 1. Per portion everywhere
- Every list item and meal stores its nutrition **per portion** in the existing top-level fields (`kcal`, `jcKcal`, `beckKcal`, `protein`, `fat`, `satFat`, `carbs`, `sugar`, `addedSugar`, `fibre`, `salt`), so totals, selections (children), ratings and prompts keep working unchanged.
- New field `portion = { desc, grams }`, shown as **"1 portion = ¼ jar (88 g)"**. `grams` may be null when unknown.
- **Packaged / OFF items** keep their source data in `per100 = { kcal, protein, … }` plus a default `portion.grams` (OFF `serving_quantity`, else 100 g), **editable**. Per-portion values are derived in code: `per100 × grams ÷ 100`.
- **Ratings** use one portion: list items against the UK reference, selections against the person's limits × the selection's portion factor (unchanged rules, D11 / F23).
- **Labels** say "per portion" everywhere; "per 100g" is never shown as the item's value.

## 2. Selection drop-downs
- Show **only items already in that category's list** (the greyed "— not added" catalogue items are gone from the drop-downs).
- Each drop-down ends with **"+ Not in my list?"** → opens **Update Lists** on the right tab and category, remembering the **day/slot** (or default slot). After saving with **"Add to <day/slot> now"**, the app returns to that slot with the new item selected.

## 3. Update Lists — three tabs
All three end with **Save → per-portion rating (D11) → added to the chosen category lists** (always kept for future use), optionally **"Add to <day/slot> now"**.

### 3a. Add single item
- Pick from the **available catalogue** (the app's built-in foods not yet in your lists) or an **OFF search**.
- Confirm: name, **portion** ("1 portion = …", grams for OFF/packaged, editable → values update live), per-portion values.
- Choose categories (default: the one you came from) → Save.

### 3b. Build a meal
- Left: all available items (own lists + catalogue + OFF search). Tap to move to the right with an **amount** per component: **portions** (e.g. 0.5) or **grams** (when the component's grams are known).
- Name the meal, **Serves: N** (default 1).
- Nutrition per portion = **Σ components ÷ serves**, computed **in code** (no AI).
  - Component in portions: `amount × component per-portion`.
  - Component in grams: `per100 × g ÷ 100`, else `per-portion × g ÷ portion.grams`.
- Stored: `meal = { serves, components: [{ ref, name, amount, unit, n (per-portion snapshot), per100?, portionGrams? }] }`, `source: "meal"`. Components that are list items are linked by `ref` and recomputed from the current list item when the meal is edited or saved.
- **Editing a meal** = add/remove components, change amounts and serves only. Note on the form: *"To change an ingredient's own nutrition, edit that item in your list."*

### 3c. Create my own item (clarifying conversation)
- Describe it (ingredients, amounts, brand). The Companion runs a **clarifying conversation** instead of failing: it asks about anything ambiguous (raw vs cooked weights, amounts, brand, **how many portions it makes**); the person answers.
- Protocol (one AI call per turn, `claude-sonnet-4-6`, temperature 0): reply is JSON, either `{"type":"question","question":"…"}` or `{"type":"item","name","portionDesc","portionGrams","servings","ingredients":[…],"perPortion":{kcal,protein,fat,satFat,carbs,sugar,addedSugar,fibre,salt}}`. At most 3 questions, then it must estimate with stated assumptions.
- **Validation in code:** valid JSON per schema; numbers finite and ≥ 0; kcal 5–2,500 per portion; servings 1–50; sat fat ≤ fat; added sugar ≤ carbs + 1; salt ≤ 15 g; **plausibility**: |4·protein + 4·carbs + 9·fat − kcal| ≤ max(35% of kcal, 60).
- **Retries:** a malformed or implausible reply is retried up to **2 times** with the specific problem. If it still fails, the person sees a **friendly question** ("I couldn't quite work that out — could you tell me roughly how much of each ingredient you use, and how many portions it makes?"), never "could not be read".
- Confirm → categories → Save. Created items can be used as components in Build a meal.

### 3d. Photo, bulk paste, typed text and Re-check (v2.19.1, F27)
Same portion model, same schema, validation and retries (`askItem`, `askItemsBatch`, `recheckBatch` in `clarify.js`):
- **📷 Photo:** asks for ONE portion (label per serving, or a sensible portion of what's shown) with a portion description; malformed/implausible replies retried; no food → the existing "No food found" message; can't tell the portion → **Create my own item** with its question.
- **Typed description** in the old form → **Create my own item** (seeded). **Edited ingredients on Review Item** → **Create my own item** (seeded with the new ingredients).
- **📋 Bulk paste:** each line returns a per-portion item (with `line`) or a question; invalid lines re-asked (≤ 2 rounds); unclear lines are listed as "needs a little more from you" with **Finish with my Companion** (the conversation, seeded with the question). Batches of 10, Retry and Cancel unchanged.
- **🔎 Re-check nutrition:** per portion — the AI estimates one portion's kcal for the portion description and says whether the saved value looks like one portion, the **whole recipe** or **per 100 g**; those (or > 35% off) are marked **Check me — confirm portions** (`portionCheck`). Values are never changed.
- The D7 whole-recipe prompt and parser (`recalcPrompt`, `parseRecalc`) were removed; no prompt asks for whole-recipe totals.

## 4. Editing
- **Single items:** as now (name, ingredients, portion). If ingredients change, the per-portion values are recalculated through the **clarifying conversation** (3c), not the old whole-recipe D7 call.
- **Meals:** components, amounts and serves only (3b).

## 5. Migration (on load, backward compatible, idempotent; nothing deleted)
For each item in the six custom lists without `portion`:
- OFF/packaged with a barcode → `per100` = the stored values (they were per 100 g), `portion = { grams: 100, desc: "100 g (default — change if your portion differs)" }`; values unchanged.
- "Ingredient prepared" without servings → `portion = { desc: "1 portion (to confirm)" }`, **Check me — confirm portions** (`checkMe`, `portionCheck`).
- Others → `portion = { desc: servingSize or "1 portion (as entered)" }`.
- An item that already has `portion` is never touched again.

## 6. Tests (v2.19.0)
Aldi pasta bake (sauce jar + pasta + mozzarella + chicken, serves 4 → a few hundred kcal per portion, labelled per portion, never per 100g); drop-downs exclude catalogue items; "+ Not in my list?" round trip back to the slot; Build a meal maths; clarifying flow with a mocked AI (question → valid JSON); malformed reply → retry → friendly question; migration flags.
