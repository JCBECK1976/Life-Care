import { test, expect } from "@playwright/test";
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
import { nextLogPrefill, progressionRange, resolveTargetWeight, displayCurrent, parseProgressionValue } from "../src/lib/exercise.js";
const ROW = { name: "Seated Cable Row", exType: "weights", status: "ready to move", current: "Next increment up from 42kg", reps: "12x3", target: "Next increment up from 42kg x 12x3", sets: 3,
  prog: [{ wk: 1, w: "42kg", r: "15x3" }, { wk: 2, w: "42kg", r: "15x3" }] };
test("5 progression helpers: Ready to Move pre-fills the NEXT weight (never the previous), a concrete range, the person's own value", () => {
  const last = ROW.prog[1];
  expect(resolveTargetWeight("Next increment up from 42kg", 42, ROW)).toBe(49);          // pin stack 42 → 49
  expect(resolveTargetWeight("45–47kg", 42, ROW)).toBe(45);
  expect(resolveTargetWeight("49kg", 42, ROW)).toBe(49);
  expect(nextLogPrefill(ROW, last)).toMatchObject({ w: "49", r: "12" });
  expect(nextLogPrefill({ ...ROW, target: "", progressionNotes: "increments: 45, 47, 49" }, last)).toMatchObject({ w: "45", r: "12", source: "next step up" });
  expect(progressionRange({ ...ROW, progressionNotes: "increments: 45, 47, 49" }, last).text).toBe("Next: try 45–47 kg (the next 1–2 steps on your stack)");
  expect(nextLogPrefill({ ...ROW, progressionValue: 47 }, last)).toMatchObject({ w: "47", source: "your next weight" });
  expect(nextLogPrefill({ ...ROW, progressionValue: 40, status: "building", target: "" }, last)).toBe(null);           // stale value ignored
  expect(nextLogPrefill({ name: "Single-leg Calf Raise", exType: "weights", status: "moved up", progressionValue: 8 }, { w: "5kg", r: "15x3" })).toMatchObject({ w: "8" });   // Becks 5 → 8 kg
  expect(nextLogPrefill({ ...ROW, status: "building", target: "" }, last)).toBe(null);                                // not ready: previous stays
  expect(displayCurrent(ROW)).toBe("42kg");
  expect(parseProgressionValue("I'll use 47kg")).toBe(47); expect(parseProgressionValue("plate 8")).toBe(8);
});

async function seedExercises(page, list) {
  const dash = await get("dashboard:data"); const d = DAYS[new Date().getDay()];
  dash.jc.exercises[d] = list; await put("dashboard:data", dash);
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Exercise");
}
test("5 chain (UI): card shows the real weight + a concrete next range; the log pre-fills 49 kg × 12, Previous stays 42 kg; a user-set weight wins", async ({ page }) => {
  const { errors } = await openApp(page);
  const CALF = { name: "Single-leg Calf Raise", exType: "weights", status: "ready to move", current: "5kg", reps: "15x3", sets: 3, prog: [{ wk: 1, w: "5kg", r: "15x3" }, { wk: 2, w: "5kg", r: "15x3" }] };
  await seedExercises(page, [ROW, CALF]);
  await expect(page.getByText("Seated Cable Row").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Next increment up from");
  await expect(page.getByText(/^42kg · 12x3/).first()).toBeVisible();
  await expect(page.getByTestId("ex-next").nth(0)).toContainText("Next: try 49–55 kg (the next 1–2 steps on your stack)");
  await page.getByRole("button", { name: "📋 Log", exact: true }).nth(0).click();
  await expect(page.getByTestId("log-previous")).toContainText("Previous: 42kg");
  await expect(page.getByTestId("log-progression")).toHaveText("Progression: 49 kg × 12 (accepted progression) — pre-filled below");
  const w1 = page.locator('input[placeholder="Weight"]').first();
  await expect(w1).toHaveValue("49");
  // Becks-style: the person sets their own next weight (5 → 8 kg) and it is recorded and pre-filled
  const calfNext = page.getByTestId("ex-next").nth(1);
  await calfNext.getByTestId("next-value-input").fill("8");
  await calfNext.getByTestId("next-value-save").click();
  await expect(calfNext).toContainText("Next: 8 kg (your choice)");
  await expect(page.getByText(/Progression: 8 kg \(set by you/).first()).toBeVisible();
  await page.getByRole("button", { name: "📋 Log", exact: true }).nth(1).click();
  await expect(page.getByTestId("log-progression")).toContainText("Progression: 8 kg × 12 (your next weight)");
  await expect(page.locator('input[placeholder="Weight"]').first()).toHaveValue("8");
  const saved = (await get("dashboard:data")).jc.exercises[DAYS[new Date().getDay()]].find((e) => e.name === "Single-leg Calf Raise");
  expect(saved.progressionValue).toBe(8);
  expect(errors).toEqual([]);
});

test("5 chain (UI): accepting 'Next increment up from 42kg' stores 49kg (a number, not the sentence) and the next log pre-fills it", async ({ page }) => {
  const { errors } = await openApp(page);
  const d = DAYS[new Date().getDay()];
  await put("session_feedback_all", { ["jc_" + d]: { summary: "Good", nextSession: "", exercises: [{ name: "Seated Cable Row", verdict: "Two clean 15×3s.", icon: "star", newStatus: "ready to move", recommendation: "Move up — tell me the exact weight you'll use.", targetWeight: "Next increment up from 42kg", targetReps: "12x3" }] } });
  await seedExercises(page, [{ ...ROW, status: "consolidating", current: "42kg", target: "" }]);
  await page.getByRole("button", { name: "▼ Show Feedback" }).first().click();
  await page.getByRole("button", { name: /Exercise Feedback & Recommendations/ }).click();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect.poll(async () => (await get("dashboard:data")).jc.exercises[d][0].current).toBe("49kg");
  await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
  await expect(page.locator('input[placeholder="Weight"]').first()).toHaveValue("49");
  await expect(page.getByTestId("log-previous")).toContainText("42kg");
  expect(errors).toEqual([]);
});
