import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { openApp, tab } from "./helpers.js";
import { mealName, namesLine, UNNAMED } from "../src/lib/mealNames.js";

// v2.20.0 overnight batch (JC, 15/16 Nov). One test group per item.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const thisSunday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return ymd(d); };

/* ---------- 1. Home food codes ---------- */
test("1 mealName / namesLine: names from children, lists or ad hoc; never a raw key", () => {
  const doc = { children: { c_2026_11_15_b: { snapshot: { name: "Porridge" } } } };
  expect(mealName("c_2026_11_15_b", { children: doc })).toBe("Porridge");
  expect(mealName("spag", { items: [{ id: "spag", name: "Spaghetti Bolognese" }] })).toBe("Spaghetti Bolognese");
  expect(mealName("__adhoc__:Soup", {})).toBe("Soup");
  expect(mealName("c_2026-11-15_d", {})).toBe(UNNAMED);
  expect(mealName("__empty__", {})).toBe(null);
  expect(namesLine(["Apple", "Pear", "Crisps"])).toBe("Apple +2 more");
  expect(namesLine(["Apple"])).toBe("Apple");
  expect(namesLine([])).toBe(null);
});

test("1 Home → My Day → My Eating shows meal names for child-record selections (no 'C 20…' codes)", async ({ page }) => {
  const { errors } = await openApp(page);
  const td = new Date(), tds = ymd(td), wd = DAYS[td.getDay()];
  const ch = (slot, name, parentId) => ({ id: "c_" + tds + "_" + slot, parentId: parentId || null, date: tds, weekday: wd, slot, snapshot: { name, kcal: 300 }, portion: { factor: 1 }, variations: { text: "", subs: [] }, nutrition: { kcal: 300 }, rating: "GOOD", band: "GOOD", tracked: "", source: "manual" });
  const kids = {}; [ch("b", "Test Porridge Bowl"), ch("l", "Test Chicken Wrap", "custom_gone"), ch("d", "Test Fish Pie"), ch("o1", "Test Apple"), ch("o2", "Test Pear"), ch("o3", "Test Crisps"), ch("dr", "Test Tea")].forEach((c) => { kids[c.id] = c; });
  await put("eat_children:jc:" + thisSunday(), { v: 1, empty: [], notes: {}, children: kids });
  await page.reload();
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "Home");
  const eat = page.getByTestId("myday-eating");
  await expect(eat).toContainText("Test Porridge Bowl");
  await expect(eat).toContainText("Test Chicken Wrap");
  await expect(eat).toContainText("Test Fish Pie");
  await expect(eat).toContainText("Test Apple +2 more");
  await expect(eat).toContainText("Test Tea");
  await expect(page.getByText(/\bC 20\d\d-\d\d-\d\d/)).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/\bc_20\d\d-\d\d-\d\d/);
  expect(errors).toEqual([]);
});

/* ---------- 2. Companion memory + one Companion ---------- */
import { historyBlock, apiTurns, splitHistory, sharedContext, qaToMessages, withinRetention } from "../src/lib/memory.js";
const NOW = Date.UTC(2026, 10, 16, 2, 0, 0);
const msgsN = (n, t0) => Array.from({ length: n }, (_, i) => ({ role: i % 2 ? "companion" : "user", text: (i % 2 ? "answer " : "question ") + i, ts: (t0 || NOW) - (n - i) * 6e4 }));

test("2 memory: last 20 messages in full + a rolling summary of older; 12-month retention; multi-turn alternates", () => {
  const m = msgsN(26);
  const h = splitHistory(m, NOW); expect(h.recent).toHaveLength(20); expect(h.older).toHaveLength(6);
  const b = historyBlock(m, NOW);
  expect(b).toContain("question 6"); expect(b).toContain("answer 25"); expect(b).toMatch(/Earlier in this conversation \(6 older messages/);
  expect(b).toContain("They said: question 0");
  expect(withinRetention([{ role: "user", text: "old", ts: NOW - 400 * 864e5 }, { role: "user", text: "new", ts: NOW }, { role: "user", text: "legacy" }], NOW).map((x) => x.text)).toEqual(["new", "legacy"]);
  const t = apiTurns(qaToMessages([{ q: "What can replace squat rows?", a: "Try a chest-supported row or a seal row." }]), "Those 2 alternatives need clarification", NOW);
  expect(t).toEqual([{ role: "user", content: "What can replace squat rows?" }, { role: "assistant", content: "Try a chest-supported row or a seal row." }, { role: "user", content: "Those 2 alternatives need clarification" }]);
  expect(apiTurns([], "hi", NOW)).toEqual([{ role: "user", content: "hi" }]);
});

test("2 sharedContext: same person's last 14 days, small budget", () => {
  const recent = [{ role: "user", text: "knee hurts on lunges", ts: NOW - 2 * 864e5 }, { role: "companion", text: "swap to split squats", ts: NOW - 2 * 864e5 }];
  const old = [{ role: "user", text: "ancient topic", ts: NOW - 30 * 864e5 }];
  const s = sharedContext([{ label: "Exercise", msgs: recent.concat(old) }, { label: "Body", msgs: old }, { label: "Chat", msgs: [{ role: "user", text: "legacy no ts" }] }], NOW);
  expect(s).toContain("Exercise: They: knee hurts on lunges | You: swap to split squats");
  expect(s).not.toContain("ancient topic"); expect(s).not.toContain("Body:");
  expect(s).toContain("Chat: They: legacy no ts");
  const big = sharedContext(Array.from({ length: 20 }, (_, i) => ({ label: "A" + i, msgs: [{ role: "user", text: "x".repeat(400), ts: NOW }] })), NOW);
  expect(big.length).toBeLessThanOrEqual(1500);
});

const SECRET = "BECKS_PRIVATE_TOKEN_42";
async function seedBecksPrivate() {
  const t = Date.now();
  await put("qa_history", { becks: [{ q: "Becks asks " + SECRET, a: "Reply about " + SECRET, ts: t }], jc: [] });
  await put("feedback_results", { becks: { summary: "B", good: [], opportunities: [], focus: [], _thread: [{ role: "user", text: SECRET + " home", ts: t }, { role: "companion", text: "ok", ts: t }] } });
  await put("session_feedback_all", { ["becks_" + DAYS[new Date().getDay()]]: { summary: "S", exercises: [], _thread: [{ role: "user", text: SECRET + " exercise", ts: t }] } });
}
const openChat = async (page) => page.getByTitle("Chat with your Companion").or(page.getByRole("button", { name: "Chat with your Companion" })).first().click();

test("2 Chat: a follow-up gets the previous answer in the request; the other person's data is never sent (privacy)", async ({ page }) => {
  const { errors, aiCalls } = await openApp(page);
  await seedBecksPrivate();
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.route("https://api.anthropic.com/**", (r) => {
    const b = r.request().postDataJSON(); aiCalls.push(b);
    const txt = /Those 2 alternatives/.test(JSON.stringify(b)) ? "Sure — more on those two." : "Try a chest-supported row or a seal row.";
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: txt }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }) });
  });
  await openChat(page);
  const box = page.locator("#qa-input-jc"), send = box.locator("xpath=following-sibling::button[1]");
  await box.fill("What can replace squat rows?"); await send.click();
  await expect(page.getByText("Try a chest-supported row or a seal row.").first()).toBeVisible();
  await expect(box).toBeEnabled();
  await box.fill("Those 2 alternatives need further clarification"); await send.click();
  await expect(page.getByText("Sure — more on those two.").first()).toBeVisible();
  const last = aiCalls[aiCalls.length - 1];
  expect(last.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  expect(last.messages[0].content).toContain("What can replace squat rows?");
  expect(last.messages[1].content).toBe("Try a chest-supported row or a seal row.");
  expect(JSON.stringify(aiCalls)).not.toContain(SECRET);
  expect(errors).toEqual([]);
});

test("2 Help: a follow-up gets the previous answer in the request", async ({ page }) => {
  const { errors, aiCalls } = await openApp(page);
  await page.getByRole("button", { name: /Help/ }).first().click();
  const box = page.locator("#help-input-jc"), send = box.locator("xpath=following::button[1]");
  await box.fill("How do I log a measurement?"); await send.click(); await expect(box).toBeEnabled(); await expect(page.getByText("How do I log a measurement?").first()).toBeVisible();
  await box.fill("And where is that button exactly?"); await send.click(); await expect(page.getByText("And where is that button exactly?").first()).toBeVisible();
  const last = aiCalls.filter((c) => c && c.messages).pop();
  const tail = last.messages.slice(-3);
  expect(tail.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  expect(tail[0].content).toContain("How do I log a measurement?");
  expect(tail[1].content.length).toBeGreaterThan(0);
  expect(tail[2].content).toContain("And where is that button exactly?");
  expect(errors).toEqual([]);
});

for (const where of ["Home", "My Exercise"]) {
  test(`2 ${where} feedback thread: a follow-up gets the previous answer; nothing of the other person`, async ({ page }) => {
    const { errors, aiCalls } = await openApp(page);
    await seedBecksPrivate();
    const t = Date.now(), th = [{ role: "user", text: "What can replace squat rows?", ts: t - 6e4 }, { role: "companion", text: "Try a chest-supported row or a seal row.", ts: t - 5e4 }];
    if (where === "Home") { const fr = await get("feedback_results"); fr.jc = { summary: "Good week", good: ["a"], opportunities: ["b"], focus: ["c"], _thread: th }; await put("feedback_results", fr); }
    else { const sf = await get("session_feedback_all"); sf["jc_" + DAYS[new Date().getDay()]] = { summary: "Solid session", exercises: [], nextSession: "", _thread: th }; await put("session_feedback_all", sf); }
    await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
    await tab(page, where);
    await page.getByRole("button", { name: "▼ Show Feedback" }).first().click();
    const input = page.locator(where === "Home" ? "#thread-input-home-jc" : "#thread-input-session-jc-" + DAYS[new Date().getDay()]);
    await input.fill("Those 2 alternatives need further clarification");
    await input.locator("xpath=following-sibling::button[1]").click();
    await expect.poll(() => aiCalls.filter((c) => /continuing a conversation about feedback/.test(JSON.stringify(c))).length).toBe(1);
    const req = JSON.stringify(aiCalls.find((c) => /continuing a conversation about feedback/.test(JSON.stringify(c))));
    expect(req).toContain("Try a chest-supported row or a seal row.");
    expect(req).toContain("Those 2 alternatives need further clarification");
    expect(req).not.toContain(SECRET);
    expect(errors).toEqual([]);
  });
}

/* ---------- 3. Chat order: newest message first ---------- */
import { newestFirst } from "../src/lib/chat.js";
test("3 newestFirst: strictly by time at message level; legacy messages keep their order", () => {
  expect(newestFirst([{ text: "q1", ts: 1 }, { text: "a1", ts: 2 }, { text: "q2", ts: 3 }, { text: "a2", ts: 4 }]).map((m) => m.text)).toEqual(["a2", "q2", "a1", "q1"]);
  expect(newestFirst([{ text: "late", ts: 9 }, { text: "early", ts: 1 }]).map((m) => m.text)).toEqual(["late", "early"]);
  expect(newestFirst([{ text: "x" }, { text: "y" }]).map((m) => m.text)).toEqual(["y", "x"]);
});

for (const kind of ["Chat", "Help", "Home feedback"]) {
  test(`3 ${kind}: the Companion's reply sits above the question; input above the newest message`, async ({ page }) => {
    const { errors } = await openApp(page);
    if (kind === "Home feedback") {
      const fr = (await get("feedback_results")) || {}; fr.jc = { summary: "Good week", good: ["a"], opportunities: ["b"], focus: ["c"] }; await put("feedback_results", fr);
      await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
      await tab(page, "Home"); await page.getByRole("button", { name: "▼ Show Feedback" }).first().click();
    } else if (kind === "Help") await page.getByRole("button", { name: /Help/ }).first().click();
    else await openChat(page);
    const box = page.locator(kind === "Help" ? "#help-input-jc" : kind === "Chat" ? "#qa-input-jc" : "#thread-input-home-jc");
    const send = box.locator("xpath=following-sibling::button[1]");
    for (const q of ["First question", "Second question"]) { await box.fill(q); await send.click(); await expect(page.getByText(q).first()).toBeVisible(); await expect(box).toBeEnabled(); }
    const thread = page.getByTestId(kind === "Help" ? "help-thread" : kind === "Chat" ? "qa-thread" : "thread-home");
    await expect(thread.getByTestId("chat-msg").nth(3)).toBeVisible();
    const roles = await thread.getByTestId("chat-msg").evaluateAll((els) => els.slice(0, 4).map((e) => e.dataset.role + ":" + e.innerText.split("\n")[0]));
    expect(roles[0]).toMatch(/^companion:/); expect(roles[1]).toBe("user:Second question");
    expect(roles[2]).toMatch(/^companion:/); expect(roles[3]).toBe("user:First question");
    const ib = await box.boundingBox(), tb = await thread.getByTestId("chat-msg").first().boundingBox();
    expect(ib.y).toBeLessThan(tb.y);                                                                    // input above the newest message
    expect(errors).toEqual([]);
  });
}

/* ---------- 4. "Your Companion" label + the thread input layout ---------- */
test("4 Exercise feedback thread at 360 px: full-width textarea (never a narrow column); replies labelled 'Your Companion'", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  const d = DAYS[new Date().getDay()];
  await put("session_feedback_all", { ["jc_" + d]: { summary: "Solid session", exercises: [], nextSession: "", _thread: [{ role: "user", text: "What can replace squat rows?", ts: 1 }, { role: "companion", text: "Try a chest-supported row or a seal row.", ts: 2 }] } });
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "▼ Show Feedback" }).first().click();
  const box = page.getByTestId("thread-session-box");
  const input = page.locator("#thread-input-session-jc-" + d);
  await input.scrollIntoViewIfNeeded();
  const ib = await input.boundingBox(), bb = await box.boundingBox();
  expect(ib.width).toBeGreaterThan(bb.width * 0.7);
  expect(ib.height).toBeLessThan(120);
  const send = input.locator("xpath=following-sibling::button[1]"); const sb = await send.boundingBox();
  expect(sb.x + sb.width).toBeLessThanOrEqual(bb.x + bb.width + 1);
  const companion = page.getByTestId("thread-session").getByTestId("chat-msg").filter({ hasText: "seal row" });
  await expect(companion).toContainText("Your Companion");
  await expect(page.getByTestId("thread-session")).not.toContainText(/(^|[^r] )Companion ·/);
  expect(errors).toEqual([]);
});

/* ---------- 5. Exercise progression chain ---------- */
const ROW = { name: "Seated Cable Row", exType: "weights", status: "ready to move", current: "Next increment up from 42kg", reps: "12x3", target: "Next increment up from 42kg x 12x3", sets: 3,
  prog: [{ wk: 1, w: "42kg", r: "15x3" }, { wk: 2, w: "42kg", r: "15x3" }] };
/* v2.41.0 (night batch P4): ONE next target; "next increment" text is never turned into an exact stack weight; app-worked
   targets are ignored and the card says "Set my next session". (These replace the v2.20.0 stack-step tests.) */
test("5 helpers: no stack weights from 'next increment'; explicit weights stay; the person's value pre-fills", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(async (ROW) => {
    const e = await import("/Life-Care/src/lib/exercise.js"); const t = await import("/Life-Care/src/lib/nextTarget.js");
    const last = ROW.prog[1];
    return [e.resolveTargetWeight("Next increment up from 42kg", 42, ROW), e.resolveTargetWeight("45–47kg", 42, ROW), e.resolveTargetWeight("49kg", 42, ROW),
      t.prefillFrom(ROW, last), t.autoDerivedTarget(ROW), t.prefillFrom({ ...ROW, progressionValue: 47, progressionSetWk: 3 }, last),
      t.prefillFrom({ ...ROW, next: t.makeTarget("", "9", "set by you") }, { w: "22kg", r: "8x3" }), t.targetHeadline({ ...ROW, next: t.makeTarget("", "9", "set by you"), current: "22kg" }),
      e.displayCurrent(ROW), e.parseProgressionValue("I'll use 47kg")];
  }, ROW);
  expect(r[0]).toBe(null);                                                                   // never a stack step
  expect(r.slice(1, 3)).toEqual([45, 49]);
  expect(r[3]).toBe(null); expect(r[4]).toBe(true);                                          // app-worked target ignored
  expect(r[5]).toMatchObject({ w: "47", r: "12", source: "set by you" });
  expect(r[6]).toMatchObject({ w: "22", r: "9" });                                           // Butterfly: reps-only target pre-fills (was 8)
  expect(r[7]).toBe("9×3");
  expect(r[8]).toBe("42kg"); expect(r[9]).toBe(47);
});

async function seedExercises(page, list) {
  const dash = await get("dashboard:data"); const d = DAYS[new Date().getDay()];
  dash.jc.exercises[d] = list; await put("dashboard:data", dash);
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Exercise");
}
test("5 chain (UI): an app-worked target is ignored — the card says 'Set my next session', the log pre-fills from the last entry", async ({ page }) => {
  const { errors } = await openApp(page);
  await seedExercises(page, [ROW]);
  await expect(page.getByText("Seated Cable Row").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Next increment up from");
  await expect(page.getByTestId("ex-set-next")).toContainText("Set my next session");
  await page.getByRole("button", { name: "📋 Log", exact: true }).nth(0).click();
  await expect(page.getByTestId("log-previous")).toContainText("Previous: 42kg");
  await expect(page.getByTestId("log-progression")).toHaveCount(0);
  await expect(page.locator('input[placeholder="Weight"]').first()).toHaveValue("42");
  expect(errors).toEqual([]);
});

test("5 chain (UI): accepting 'Next increment up from 42kg' stores no invented weight; accepting with your own numbers sets the one target (card = log pre-fill)", async ({ page }) => {
  const { errors } = await openApp(page);
  const d = DAYS[new Date().getDay()];
  const fb = (rec) => ({ ["jc_" + d]: { summary: "Good", nextSession: "", exercises: [{ name: "Seated Cable Row", verdict: "Two clean 15×3s.", icon: "star", newStatus: "ready to move", recommendation: rec, targetWeight: "Next increment up from 42kg", targetReps: "12x3" }], _feedbackWeek: 0, _generatedAt: "now" } });
  await put("session_feedback_all", fb("Move up a small step"));
  await seedExercises(page, [{ ...ROW, status: "consolidating", current: "42kg", target: "" }]);
  await page.getByRole("button", { name: "▼ Show Feedback" }).first().click();
  await page.getByRole("button", { name: /Exercise Feedback & Recommendations/ }).click();
  await page.locator('[id^="user-note-"]').first().fill("I'll do 45kg x 12");
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect.poll(async () => (await get("dashboard:data")).jc.exercises[d][0].next).toMatchObject({ m1: "45", m2: "12", source: "set by you" });
  await expect(page.getByTestId("ex-headline").first()).toHaveText("45kg · 12×3");
  await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
  await expect(page.locator('input[placeholder="Weight"]').first()).toHaveValue("45");
  await expect(page.locator('input[placeholder="Reps"]').first()).toHaveValue("12");
  expect(errors).toEqual([]);
});

/* ---------- 6. Home "Today" table ---------- */
test("6 Today table at 360 px: 'Your goal deficit' on one line; Body burn bold; On track in BOTH columns = eating − goal, coloured, with %", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await tab(page, "Home");
  const card = page.getByTestId("today-card");
  const aim = card.getByTestId("pa-aim").locator("th");
  await expect(aim).toHaveText(/^Your goal (deficit|surplus)$/);
  const lh = await aim.evaluate((e) => { const cs = getComputedStyle(e); return { h: e.getBoundingClientRect().height, lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3 }; });
  expect(lh.h).toBeLessThan(lh.lh * 1.8 + 8);                                                             // one line
  await expect(card.getByTestId("pa-goalname")).toContainText("Goal: ");
  await expect(card.getByTestId("pa-burn").locator("th")).toHaveCSS("font-weight", "800");
  const num = (s) => { const m = /([+−-]?)\s*([\d,]+)/.exec(s.replace("±", "")); return m ? (m[1] === "−" || m[1] === "-" ? -1 : 1) * parseInt(m[2].replace(/,/g, ""), 10) : NaN; };
  const cells = async (id) => (await card.getByTestId(id).locator("td").allInnerTexts()).map(num);
  const [gP, gA] = await cells("pa-goal"), [eP, eA] = await cells("pa-eating");
  const p = await card.getByTestId("pa-ontrack-planned").innerText(), a = await card.getByTestId("pa-ontrack-actual").innerText();
  expect(num(p)).toBe(eP - gP); expect(num(a)).toBe(eA - gA);
  expect(p).toMatch(/%/); expect(a).toMatch(/%/);
  const color = async (id) => card.getByTestId(id).evaluate((e) => getComputedStyle(e).color);
  expect(await color("pa-ontrack-planned")).toBe(eP - gP <= 0 ? "rgb(21, 128, 61)" : "rgb(185, 28, 28)");
  const xs = async (id) => (await card.getByTestId(id).locator("td").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().right))));
  expect(await xs("pa-ontrack")).toEqual(await xs("pa-goal"));                                             // aligned with the rows above
  await card.screenshot({ path: "test-results/v2200-shots/360-today.png" });
  expect(errors).toEqual([]);
});

/* ---------- 7. Subtle border on every data box ---------- */
test("7 every input/select/textarea (and the meal picker) has the subtle 1px border and radius on every main screen", async ({ page }) => {
  const { errors } = await openApp(page);
  const sweep = async () => page.evaluate(() => [...document.querySelectorAll("input, select, textarea")].filter((e) => {
    if (/^(checkbox|radio|range|file|color|hidden)$/.test(e.type) || e.offsetParent === null) return false;
    const cs = getComputedStyle(e); return cs.borderTopStyle === "none" || parseFloat(cs.borderTopWidth) === 0 || parseFloat(cs.borderTopLeftRadius) < 4;
  }).map((e) => (e.id || e.name || e.placeholder || e.getAttribute("aria-label") || e.outerHTML.slice(0, 80))));
  const bad = [];
  for (const t of ["Home", "My Eating", "My Exercise", "My Body", "My Health", "My Shop"]) {
    await tab(page, t); await page.waitForTimeout(300);
    if (t === "My Eating") { await page.getByRole("button", { name: "Update Eating Lists" }).click(); await page.waitForTimeout(200); }
    if (t === "My Exercise") { const lb = page.getByRole("button", { name: "📋 Log", exact: true }); if (await lb.count()) { await lb.first().click(); await page.waitForTimeout(200); } }
    bad.push(...(await sweep()).map((x) => t + ": " + x));
  }
  expect(bad).toEqual([]);
  await tab(page, "My Eating");
  const picker = page.getByTestId("selected-item").first().locator("xpath=ancestor::button[1]");   // v2.50.0: the row box is a button
  if (await page.getByTestId("selected-item").count()) {
    await expect(picker).toHaveCSS("border-top-color", "rgb(203, 213, 225)");
    await expect(picker).toHaveCSS("border-top-left-radius", "8px");
  }
  expect(errors).toEqual([]);
});

/* ---------- 8. Accessibility (WCAG 2.2 AA) ---------- */
import AxeBuilder from "@axe-core/playwright";
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const axe = async (page) => (await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations.map((v) => v.id + " ×" + v.nodes.length + " " + v.nodes[0].html.slice(0, 100));
test("8 axe at 360 px: Update Lists (search results, Build a meal, My own), the exercise log form, Chat and Help have no A/AA violations", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"products":[]}' }));
  await tab(page, "My Eating"); await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByLabel("Search your lists, common foods and UK products").fill("pasta"); await page.waitForTimeout(900);
  expect(await axe(page)).toEqual([]);
  await page.getByRole("tab", { name: "Build a meal" }).click(); expect(await axe(page)).toEqual([]);
  await page.getByRole("tab", { name: "My own" }).click(); expect(await axe(page)).toEqual([]);
  await tab(page, "My Exercise"); await page.getByRole("button", { name: "Sun", exact: true }).click(); await page.getByRole("button", { name: "📋 Log", exact: true }).first().click(); expect(await axe(page)).toEqual([]);
  await openChat(page); expect(await axe(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Help/ }).first().click(); expect(await axe(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test("8 Chat and Help are dialogs: focus moves into the box, Tab stays inside, Esc closes and gives focus back", async ({ page }) => {
  const { errors } = await openApp(page);
  const opener = page.getByTitle("Chat with your Companion").or(page.getByRole("button", { name: "Chat with your Companion" })).first();
  await opener.focus(); await opener.click();
  const dlg = page.getByRole("dialog", { name: "Chat with your Companion" });
  await expect(dlg).toBeVisible();
  await expect(page.locator("#qa-input-jc")).toBeFocused();
  for (let i = 0; i < 8; i++) { await page.keyboard.press("Tab"); expect(await dlg.evaluate((d) => d.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press("Escape");
  await expect(dlg).toHaveCount(0);
  await page.getByRole("button", { name: /Help/ }).first().click();
  const h = page.getByRole("dialog", { name: "Help — using the app" });
  await expect(page.locator("#help-faq-search")).toBeFocused();   // v2.38.0: Help starts with the guide and its search box (Ask the Companion is below)
  expect(await h.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape"); await expect(h).toHaveCount(0);
  expect(errors).toEqual([]);
});

// v2.36.0 (Architect, 23 Nov): the 44 px touch minimum was WCAG 2.5.5 (AAA, not required) and is removed; the AA
// target-size check (2.5.8: 24 px or spacing) is tests/v2360.spec.js.

/* ---------- 9. Polish ---------- */
test("9a/b phone picker: forgiving search, ~44 px rows (v2.50.0), current item highlighted, ✕ Close; picking shows 'Added: …' with Undo", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  const list = (await get("custom_breakfasts")) || [];
  await put("custom_breakfasts", [{ id: "t_porr", name: "Test Porridge Oats", jcKcal: 300, beckKcal: 280, rating: "GOOD" }].concat(list));
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Eating");
  const trig = page.getByTestId("picker-trigger").first();
  const before = await trig.innerText();
  await trig.click();
  const sheet = page.getByTestId("picker-sheet");
  await expect(sheet).toBeVisible();
  await expect(page.getByRole("button", { name: "Close the list" })).toBeVisible();
  await page.getByLabel("Search items").fill("porrige");                                             // misspelt
  const row = sheet.getByTestId("picker-row").filter({ hasText: "Test Porridge Oats" });
  await expect(row).toBeVisible();
  expect((await row.boundingBox()).height).toBeGreaterThanOrEqual(43);
  await row.dispatchEvent("mousedown");
  await page.getByTestId("pick-confirm").click();                                                   // v2.50.0: confirm the pick
  await expect(sheet).toHaveCount(0);
  const toast = page.getByTestId("pick-toast");
  await expect(toast).toContainText("Added: Test Porridge Oats");
  await expect(trig).toContainText("Test Porridge Oats");
  await trig.click();
  await expect(page.getByTestId("picker-sheet").locator('[data-testid="picker-row"][aria-selected="true"]')).toContainText("Test Porridge Oats");   // current highlighted
  await page.getByRole("button", { name: "Close the list" }).click();
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(trig).toContainText(before.split("\n")[0]); await expect(trig).not.toContainText("Test Porridge Oats");
  expect(errors).toEqual([]);
});

test("9c/d number fields: numeric keypad, typing replaces the value; the log's Save stays visible; room under the chat button", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const { errors } = await openApp(page);
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "Sun", exact: true }).click();                               // a day the test data has exercises on
  await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
  const w = page.locator('input[placeholder="Weight"]').first();
  await expect(w).toHaveAttribute("inputmode", "decimal");
  await w.click(); await page.keyboard.type("7");
  await expect(w).toHaveValue("7");                                                                    // replaced, not appended
  await page.locator("#log-week").scrollIntoViewIfNeeded();
  const act = page.getByTestId("floating-save"); await expect(act).toBeVisible();
  await expect(act.getByRole("button")).toHaveText(/^(Save|Update)$/); await expect(act.getByRole("button", { name: /^(Save|Update) this log$/ })).toBeVisible();
  const vb = await act.boundingBox();
  expect(vb.y + vb.height).toBeLessThanOrEqual(640);                                                    // Save visible while the top of the form is shown
  const chat = await page.getByTitle("Chat with your Companion").or(page.getByRole("button", { name: "Chat with your Companion" })).first().boundingBox();
  expect(vb.x + vb.width).toBeLessThanOrEqual(chat.x);                                                  // never under the chat button
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById("root")).paddingBottom))).toBeGreaterThanOrEqual(80);
  expect(errors).toEqual([]);
});

/* ---------- Report screenshots (360 px) ---------- */
test("shots: Home (My Day + Today), an Exercise feedback thread, the picker sheet and Update Lists at 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const { errors } = await openApp(page);
  const td = new Date(), tds = ymd(td), wd = DAYS[td.getDay()];
  const ch = (slot, name) => ({ id: "c_" + tds + "_" + slot, parentId: null, date: tds, weekday: wd, slot, snapshot: { name, kcal: 350 }, portion: { factor: 1 }, variations: { text: "", subs: [] }, nutrition: { kcal: 350 }, rating: "GOOD", band: "GOOD", tracked: "", source: "manual" });
  const kids = {}; [ch("b", "Porridge with berries"), ch("l", "Chicken salad wrap"), ch("d", "Salmon, rice and greens"), ch("o1", "Apple"), ch("o2", "Greek yoghurt"), ch("dr", "Tea")].forEach((c) => { kids[c.id] = c; });
  await put("eat_children:jc:" + thisSunday(), { v: 1, empty: [], notes: {}, children: kids });
  const t = Date.now();
  await put("session_feedback_all", { ["jc_" + wd]: { summary: "Solid session — your rows are moving well.", exercises: [], nextSession: "", _thread: [{ role: "user", text: "What can replace squat rows?", ts: t - 9e4 }, { role: "companion", text: "Try a chest-supported row or a seal row — both keep your lower back out of it.", ts: t - 8e4 }, { role: "user", text: "Those 2 alternatives need further clarification", ts: t - 7e4 }, { role: "companion", text: "Chest-supported row: lie face down on an incline bench and row the dumbbells up. Seal row: lie flat on a high bench and pull the bar to the bench.", ts: t - 6e4 }] } });
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  const dir = "test-results/v2200-shots"; fs.mkdirSync(dir, { recursive: true });
  await tab(page, "Home");
  await page.getByTestId("myday-eating").scrollIntoViewIfNeeded();
  await page.screenshot({ path: dir + "/360-home-myday.png" });
  await page.getByTestId("today-card").screenshot({ path: dir + "/360-home-today.png" });
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "▼ Show Feedback" }).first().click();
  await page.getByTestId("thread-session-box").scrollIntoViewIfNeeded();
  await page.getByTestId("thread-session-box").screenshot({ path: dir + "/360-exercise-thread.png" });
  await tab(page, "My Eating");
  await page.getByTestId("picker-trigger").first().click();
  await page.getByLabel("Search items").fill("porrige");
  await page.waitForTimeout(200);
  await page.screenshot({ path: dir + "/360-picker-sheet.png" });
  await page.getByRole("button", { name: "Close the list" }).click();
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"products":[]}' }));
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByLabel("Search your lists, common foods and UK products").fill("fusilli"); await page.waitForTimeout(900);
  await page.getByTestId("update-lists").screenshot({ path: dir + "/360-update-lists.png" });
  expect(errors).toEqual([]);
});
