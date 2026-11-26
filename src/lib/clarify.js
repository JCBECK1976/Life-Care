// v2.19.0 "Create my own item" — a CLARIFYING conversation with the Companion instead of a one-shot estimate that can fail.
// One AI call per turn. The reply must be JSON: a question, or a per-portion item. Malformed or implausible replies are
// retried (up to 2 times) with the specific problem; if they still fail the person gets a friendly question, never
// "could not be read". docs/design/EATING_LISTS.md §3c.
import { handleApiError } from "./api.js";
import { parseJsonReply, validateItemReply } from "./portion.js";

export var MAX_RETRIES = 2;
export var MAX_QUESTIONS = 3;
export var FRIENDLY = "I couldn't quite work that out yet — could you tell me roughly how much of each ingredient you use (weights, or jars/packs with sizes), and how many portions it makes?";

export var CLARIFY_SYSTEM = "CLARIFY_ITEM. You help a UK user add ONE food item to their eating list, with nutrition PER PORTION.\n" +
  "Reply with ONLY a JSON object, no other text. Either:\n" +
  '{"type":"question","question":"<one short, friendly question>"}\n' +
  "when something needed is missing or ambiguous: raw vs cooked weights, amounts of each ingredient, the brand/product, or HOW MANY PORTIONS the recipe makes. Ask one thing at a time; at most " + MAX_QUESTIONS + " questions in total. Or:\n" +
  '{"type":"item","name":"<short name>","portionDesc":"<what one portion is, e.g. \\"1 of 4 servings (about 350 g)\\">","portionGrams":<number or null>,"servings":<portions the recipe makes, 1 for a single item>,"ingredients":["<ingredient with amount>"],"assumptions":"<any assumptions, one sentence>","perPortion":{"kcal":0,"protein":0,"fat":0,"satFat":0,"carbs":0,"sugar":0,"addedSugar":0,"fibre":0,"salt":0}}\n' +
  "Rules: perPortion is for ONE portion (the whole recipe divided by servings), never per 100 g and never the whole recipe. Use UK supermarket values. Grams for macros, salt in g. " +
  "After " + MAX_QUESTIONS + " questions, give the item with reasonable stated assumptions.";

function textOf(result) { var t = ""; (result.content || []).forEach(function(c) { if (c.text) t += c.text; }); return t; }

async function callAI(messages, system, feature) {
  var headers = { "x-lc-feature": "myOwnItem", "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" };
  if (feature === "autoInfo") headers["x-lc-feature"] = "autoInfo";   // v2.37.1: a meal change is plan feature autoInfo (as before), "My own" is myOwnItem
  var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
    headers: headers,
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 900, temperature: 0, system: system || CLARIFY_SYSTEM, messages: messages }) });
  var result = await resp.json();
  var err = handleApiError(result); if (err) throw new Error(err);
  return textOf(result);
}

/**
 * One turn. turns = [{ role: "user" | "assistant", text }] (the person's description and answers, the Companion's questions).
 * Returns { type: "question", question, friendly? } or { type: "item", reply } (reply = the validated JSON). API errors throw.
 */
export async function clarifyTurn(turns, opts) {
  var call = (opts && opts.call) || function(m) { return callAI(m, opts && opts.system, opts && opts.feature); };
  var asked = turns.filter(function(t) { return t.role === "assistant"; }).length;
  var msgs = turns.map(function(t) { return { role: t.role, content: t.role === "assistant" ? JSON.stringify({ type: "question", question: t.text }) : t.text }; });
  if (asked >= MAX_QUESTIONS) msgs[msgs.length - 1] = { role: "user", content: msgs[msgs.length - 1].content + "\n\n(You have asked enough questions: reply with the item now, stating assumptions.)" };
  for (var attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    var text = await call(msgs);
    var o = parseJsonReply(text), v = validateItemReply(o);
    if (v.ok) {
      if (o.type === "question" && asked >= MAX_QUESTIONS) v = { ok: false, problem: "no more questions — reply with the item" };
      else return o.type === "question" ? { type: "question", question: o.question.trim() } : { type: "item", reply: o };
    }
    msgs = msgs.concat([{ role: "assistant", content: String(text || "").slice(0, 2000) || "(empty)" },
      { role: "user", content: "That reply can't be used: " + v.problem + ". Reply again with ONLY the JSON object described in the instructions." }]);
  }
  return { type: "question", question: FRIENDLY, friendly: true };
}

/* ---------- v2.37.1 (Architect brief 23 Nov, PART 3a): changing a meal in My Eating (Open → Edit → Changes) uses the same
   conversation: a clarifying question instead of a rejection, strict JSON, retries, values for what was actually eaten,
   and the person reviews them before anything is saved. ---------- */
export var CLARIFY_CHANGE = "CLARIFY_MEAL_CHANGE. A UK user ate a meal item with some changes. Work out the nutrition of WHAT THEY ACTUALLY ATE (the stated number of portions, with the changes).\n" +
  "Reply with ONLY a JSON object, no other text. Either:\n" +
  '{"type":"question","question":"<one short, friendly question>"}\n' +
  "when a change is unclear (what replaced what, roughly how much, a brand). Ask one thing at a time; at most " + MAX_QUESTIONS + " questions. Or:\n" +
  '{"type":"item","name":"<the meal with the changes, short>","servings":1,"portionDesc":"<what was eaten>","change":"<one short sentence on what changed>","assumptions":"<any assumptions, one sentence>","perPortion":{"kcal":0,"protein":0,"fat":0,"satFat":0,"carbs":0,"sugar":0,"addedSugar":0,"fibre":0,"salt":0}}\n' +
  "perPortion is for everything they ate (servings is 1). Use UK supermarket values; grams for macros, salt in g. After " + MAX_QUESTIONS + " questions, give the item with reasonable stated assumptions.";
/** The first message for a meal change: the item's standard portion, how many portions, and the change in their words. */
export function mealChangeRequest(base, factor, text) {
  var b = base || {};
  return "The meal item is \"" + (b.name || "a meal") + "\". One standard portion has: " + (b.kcal || 0) + " kcal, " + (b.protein || 0) + " g protein, " + (b.fat || 0) + " g fat, " + (b.satFat || 0) + " g saturated fat, " + (b.carbs || 0) + " g carbs, " + (b.addedSugar || 0) + " g added sugar, " + (b.fibre || 0) + " g fibre, " + (b.salt || 0) + " g salt. They ate " + factor + " × that portion, with these changes: \"" + text + "\".";
}
export function clarifyMealChange(turns, opts) { return clarifyTurn(turns, Object.assign({ system: CLARIFY_CHANGE, feature: "autoInfo" }, opts || {})); }

/* ---------- v2.19.1 (F27): the other add paths use the same per-portion schema, validation and retries ---------- */
function msgText(content) { return typeof content === "string" ? content : content; }

/**
 * One item from a photo (or any single request): content = the user content (text or [image, text]).
 * Returns { type: "item", reply } | { type: "noFood", reply } | { type: "question", question, friendly? }. API errors throw.
 */
export async function askItem(content, opts) {
  var call = (opts && opts.call) || callAI;
  var msgs = [{ role: "user", content: msgText(content) }];
  for (var attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    var text = await call(msgs);
    var o = parseJsonReply(text);
    if (o && (o.isFood === false || o.isFood === "false" || o.type === "noFood")) return { type: "noFood", reply: o };
    var v = validateItemReply(o);
    if (v.ok) return o.type === "question" ? { type: "question", question: o.question.trim() } : { type: "item", reply: o };
    msgs = msgs.concat([{ role: "assistant", content: String(text || "").slice(0, 2000) || "(empty)" },
      { role: "user", content: "That reply can't be used: " + v.problem + ". Reply again with ONLY the JSON object described in the instructions." }]);
  }
  return { type: "question", question: FRIENDLY, friendly: true };
}

/** Bulk paste: one request per batch; each line becomes a validated per-portion item or a question for the person.
 *  Lines whose element is malformed or implausible are re-asked (up to MAX_RETRIES rounds). Returns { items: [{ line, reply }], help: [{ line, question }] }. */
export var BULK_PROMPT_HEAD = "CLARIFY_ITEM BULK. For EACH line below, give ONE portion of that food, PER PORTION (never per 100 g, never a whole recipe). " +
  "Return a JSON array with one object per line, in order: either the item object described in the instructions plus \"line\" (the line exactly as given), " +
  "or {\"line\":\"…\",\"type\":\"question\",\"question\":\"…\"} if you genuinely can't tell what or how much it is.\n\nItems to look up:\n";
export async function askItemsBatch(lines, opts) {
  var call = (opts && opts.call) || callAI;
  var todo = lines.slice(), items = [], help = [], last = {};
  for (var round = 0; round <= MAX_RETRIES && todo.length; round++) {
    var text = await call([{ role: "user", content: BULK_PROMPT_HEAD + todo.join("\n") + "\n\nReturn ONLY the JSON array." + (round ? " (Previous answers for these lines were invalid: " + todo.map(function(l) { return l + " — " + (last[l] || "missing"); }).join("; ") + ".)" : "") }]);
    var arr = null; var t = String(text || "").replace(/```json|```/g, ""); var a = t.indexOf("["), b = t.lastIndexOf("]");
    if (a >= 0 && b > a) { try { arr = JSON.parse(t.slice(a, b + 1)); } catch (e) { arr = null; } }
    var byLine = {}; (Array.isArray(arr) ? arr : []).forEach(function(o, i) { if (o && typeof o === "object") byLine[o.line != null ? String(o.line) : todo[i]] = o; });
    var next = [];
    todo.forEach(function(l) {
      var o = byLine[l]; if (o && !o.type) o.type = "item";
      var v = validateItemReply(o);
      if (v.ok && o.type === "item") items.push({ line: l, reply: o });
      else if (v.ok && o.type === "question") help.push({ line: l, question: o.question });
      else { last[l] = v.problem; next.push(l); }
    });
    todo = next;
  }
  todo.forEach(function(l) { help.push({ line: l, question: FRIENDLY }); });
  return { items: items, help: help };
}

/** Re-check nutrition: per portion. For each item the AI estimates ONE portion's kcal for its portion description and says
 *  whether the stored value looks like one portion, the whole recipe, or per 100 g. Returns { byId, unchecked: [ids] }. */
export async function recheckBatch(items, opts) {
  var call = (opts && opts.call) || callAI;
  var prompt = "CLARIFY_ITEM RECHECK. For each food item below, estimate the kcal of ONE PORTION as described, and say whether the SAVED kcal looks like one portion (\"portion\"), the WHOLE recipe / several portions (\"wholeRecipe\") or a per-100 g value (\"per100g\"). " +
    "Return ONLY a JSON array: [{\"id\":\"…\",\"perPortionKcal\":<number>,\"looksLike\":\"portion|wholeRecipe|per100g\",\"servingsGuess\":<number or null>}].\nItems:\n" +
    items.map(function(x) { return x.id + ": " + x.name + " — " + x.portion + " — saved " + x.kcal + " kcal — " + (x.ingredients || "no ingredients listed"); }).join("\n");
  for (var attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    var text = await call([{ role: "user", content: prompt }]);
    var t = String(text || "").replace(/```json|```/g, ""); var a = t.indexOf("["), b = t.lastIndexOf("]"), arr = null;
    if (a >= 0 && b > a) { try { arr = JSON.parse(t.slice(a, b + 1)); } catch (e) { arr = null; } }
    if (Array.isArray(arr)) {
      var byId = {};
      arr.forEach(function(r) { var k = parseFloat(r && r.perPortionKcal); if (r && r.id != null && isFinite(k) && k > 0 && ["portion", "wholeRecipe", "per100g"].indexOf(r.looksLike) >= 0) byId[r.id] = { perPortionKcal: k, looksLike: r.looksLike, servingsGuess: parseFloat(r.servingsGuess) || null }; });
      if (Object.keys(byId).length) return { byId: byId, unchecked: items.filter(function(x) { return !byId[x.id]; }).map(function(x) { return x.id; }) };
    }
    prompt += "\n\n(Your previous reply wasn't a usable JSON array — reply with ONLY the array.)";
  }
  return { byId: {}, unchecked: items.map(function(x) { return x.id; }) };
}
export { recheckFlag } from "./portion.js";

/* ---------- v2.19.2: "Describe it instead" — identify a food from a plain description and offer 1–3 choices ---------- */
export var IDENTIFY_HEAD = "CLARIFY_ITEM IDENTIFY. The person couldn't find this food by searching and described it as:\n";
/** Returns { type: "choices", choices: [reply…] (1–3 validated per-portion items) } or { type: "question", question, friendly? }. API errors throw. */
export async function identifyFood(text, opts) {
  var call = (opts && opts.call) || callAI;
  var msgs = [{ role: "user", content: IDENTIFY_HEAD + "\"" + String(text || "").trim() + "\"\n\nWork out what it most likely is and reply with ONLY a JSON object: " +
    "{\"choices\":[<1 to 3 likely matches, each the item object described in the instructions, per ONE typical UK portion, most likely first>]} " +
    "— or the question object if you genuinely can't tell what it is." }];
  for (var attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    var t = await call(msgs);
    var o = parseJsonReply(t), problem = "no choices";
    if (o && o.type === "question") { var vq = validateItemReply(o); if (vq.ok) return { type: "question", question: o.question.trim() }; problem = vq.problem; }
    else if (o && Array.isArray(o.choices)) {
      var good = []; o.choices.slice(0, 3).forEach(function(c) { if (c && typeof c === "object") { if (!c.type) c.type = "item"; var v = validateItemReply(c); if (v.ok && c.type === "item") good.push(c); else problem = v.problem; } });
      if (good.length) return { type: "choices", choices: good };
    }
    msgs = msgs.concat([{ role: "assistant", content: String(t || "").slice(0, 2000) || "(empty)" },
      { role: "user", content: "That reply can't be used: " + problem + ". Reply again with ONLY the JSON object {\"choices\":[…]}." }]);
  }
  return { type: "question", question: FRIENDLY, friendly: true };
}
