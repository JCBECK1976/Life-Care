import { test, expect } from "@playwright/test";
import { openApp, tab, PROGRESS } from "./helpers.js";
import { currentWeek } from "../scripts/make-fixture.mjs";
import { repRange, rangeLabel, displayStatus, whyLine, skipStreak, skipCheckIn, skipEntry, weekNote, weekFeedback, linkSessionFeedback } from "../src/lib/exerciseWhy.js";
import { autoStatus, latestEntry, previousEntry, nextLogPrefill } from "../src/lib/exercise.js";

// v2.37.0 (Architect brief 23 Nov, PART 2): reasons, a status for every exercise, last week's Companion feedback, the
// week history's "Your Companion said", and Skip. The progression rules are unchanged (revisited at the week reset).
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const CW = currentWeek();
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const PRESS = (o = {}) => ({ name: "Chest Press", exType: "weights", status: "", current: "29kg", reps: "8/8/6", sets: 3, prog: [{ wk: CW - 2, w: "27kg", r: "15x3" }, { wk: CW - 1, w: "29kg", r: "8/8/6" }], ...o });

test("rules: range, a status for every exercise ('Building back up' below range), the why line, skip streaks and notes", () => {
  expect([repRange({}), repRange({ progressionNotes: "Build 10–15 reps then add weight" })]).toEqual([{ lo: 12, hi: 15 }, { lo: 10, hi: 15 }]);
  expect([rangeLabel(PRESS()), rangeLabel({ name: "Plank", exType: "timed_hold" }), rangeLabel({ name: "Walk", exType: "cardio" })]).toEqual(["Range 12–15", "Hold time: builds 5–10 s at a time", "Duration: builds 2–5 min at a time"]);
  const below = PRESS();
  expect(displayStatus(below, autoStatus)).toBe("building back up");
  expect(whyLine(below, "building back up")).toBe("Below range (8/8/6): stay at 29 kg, aim for 12/12/12; drop one step if form slips.");
  const moved = PRESS({ status: "moved up", reps: "12x3", prog: [{ wk: CW - 2, w: "27kg", r: "15x3" }, { wk: CW - 1, w: "29kg", r: "12x3" }] });
  expect(whyLine(moved, displayStatus(moved, autoStatus))).toBe("Moved up to 29 kg: reps restart at the bottom of your range (12) and build to 15.");
  const ready = PRESS({ status: "ready to move", prog: [{ wk: CW - 2, w: "29kg", r: "15x3" }, { wk: CW - 1, w: "29kg", r: "15x3" }] });
  expect(whyLine(ready, "ready to move")).toMatch(/^15\/15\/15 twice at 29 kg: time to move up \(next \d+(\.\d+)? kg\)\.$/);
  expect(displayStatus(PRESS({ prog: [] }), autoStatus)).toBe("building");                       // a pill even before the first log
  expect(displayStatus(PRESS({ prog: [{ wk: CW - 1, w: "29kg", r: "13/13/12" }] }), autoStatus)).toBe("building");   // derived when the stored one was cleared
  // skips: zeros marked skipped, never the latest/previous entry, never the pre-fill
  const sk = skipEntry({ sets: 3 }, CW, " ill ");
  expect(sk).toEqual({ wk: CW, w: "0kg", r: "0×3", sets: [], skipped: true, note: "ill" });
  const withSkip = PRESS({ status: "ready to move", prog: [{ wk: CW - 2, w: "29kg", r: "15x3" }, { wk: CW - 1, w: "29kg", r: "15x3" }, sk] });
  expect([latestEntry(withSkip.prog).wk, previousEntry(withSkip.prog, CW + 1).wk]).toEqual([CW - 1, CW - 1]);
  expect(nextLogPrefill(withSkip, latestEntry(withSkip.prog)).w).not.toBe("0");
  expect(displayStatus(withSkip, autoStatus)).toBe("ready to move");                            // status unchanged by a skip
  const three = { name: "Leg Curl", prog: [{ wk: 1, w: "20kg", r: "12x3" }, skipEntry({}, 2), skipEntry({}, 3), skipEntry({}, 4)] };
  expect([skipStreak(three.prog), skipCheckIn(three)]).toEqual([3, expect.stringMatching(/skipped Leg Curl three weeks running — that's fine/)]);
  expect(skipCheckIn({ name: "x", prog: [skipEntry({}, 1), { wk: 2, w: "1kg", r: "1" }, skipEntry({}, 3)] })).toBe("");
  expect(weekNote({ notes: "keep the back flat; Wk17: next weight 65 kg (set by you)" }, 17)).toBe("Wk17: next weight 65 kg (set by you)");
});

test("last week's feedback + linking unlinked recommendations to their week and exercise (counts only)", () => {
  const list = [PRESS({ prog: [{ wk: 5, w: "29kg", r: "12x3", companion: { recommendation: "Stay at 29 kg", decision: "accepted" } }] }), { name: "Leg Press", prog: [{ wk: 5, w: "60kg", r: "15x3" }] }];
  const sfb = { _feedbackWeek: 5, exercises: [{ name: "Leg Press (machine)", recommendation: "Move up to 64 kg", _decision: "declined" }] };
  expect(weekFeedback(list, 5, sfb)).toEqual([{ name: "Chest Press", recommendation: "Stay at 29 kg", decision: "accepted" }, { name: "Leg Press", recommendation: "Move up to 64 kg", decision: "rejected" }]);
  expect(weekFeedback(list, 4, sfb)).toEqual([]);
  const data = { jc: { exercises: { sunday: list } } };
  expect(linkSessionFeedback(data, { jc_sunday: { ...sfb, _generatedAt: "Sun" } })).toEqual({ jc: 1 });
  expect(list[1].prog[0].companion).toMatchObject({ recommendation: "Move up to 64 kg", decision: "rejected" });
  expect(list[0].prog[0].companion.recommendation).toBe("Stay at 29 kg");                       // never overwritten
  expect(linkSessionFeedback(data, { jc_sunday: sfb })).toEqual({});                             // already linked
});

test("My Exercise: every card has a status pill and its range + why; Skipped saves zeros (status, weight and target unchanged), a note, Undo; Progress shows it greyed; logging the week replaces it", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  page.on("dialog", (d) => d.accept());
  await openApp(page);
  const d = DAYS[new Date().getDay()];
  const dash = await get("dashboard:data");
  dash.jc.exercises[d] = [PRESS(), { name: "Leg Curl", exType: "weights", status: "ready to move", current: "33kg", reps: "15x3", sets: 3, target: "36kg", prog: [{ wk: CW - 2, w: "33kg", r: "15x3" }, { wk: CW - 1, w: "33kg", r: "15x3" }] }];
  await put("dashboard:data", dash); await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Exercise");
  await expect(page.getByTestId("ex-status")).toHaveText(["Building back up", "Ready to Move"]);
  await expect(page.getByTestId("ex-why").first()).toContainText("Range 12–15 · Below range (8/8/6): stay at 29 kg, aim for 12/12/12");
  // Skip Leg Curl (one tap)
  await page.getByRole("button", { name: "Skipped Leg Curl this week" }).click();
  await expect.poll(async () => (await get("dashboard:data")).jc.exercises[d][1].prog.find((e) => e.wk === CW)).toMatchObject({ skipped: true, w: "0kg", r: "0×3" });
  const after = (await get("dashboard:data")).jc.exercises[d][1];
  expect([after.status, after.current, after.target]).toEqual(["ready to move", "33kg", "36kg"]);   // not counted
  await expect(page.getByTestId("ex-skipped")).toContainText("Skipped this week");
  await expect(page.getByTestId("ex-status").nth(1)).toHaveText("Ready to Move");
  await page.getByTestId("skip-note").fill("knee sore"); await page.getByTestId("skip-note").blur();
  await expect.poll(async () => (await get("dashboard:data")).jc.exercises[d][1].prog.find((e) => e.wk === CW).note).toBe("knee sore");
  await page.getByRole("button", { name: PROGRESS }).nth(1).click();
  await expect(page.getByTestId("prog-skipped").first()).toHaveText("Skipped — knee sore");
  await page.screenshot({ path: "test-results/v2370-shots/exercise-skip-360.png", fullPage: true });
  // Log the week instead → the skip is replaced
  await page.getByRole("button", { name: "📋 Log", exact: true }).nth(1).click();
  await expect(page.getByRole("button", { name: "Good", exact: true }).first()).toBeVisible();
  for (const b of await page.getByRole("button", { name: "Good", exact: true }).all()) await b.click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await get("dashboard:data")).jc.exercises[d][1].prog.filter((e) => e.wk === CW).map((e) => !!e.skipped)).toEqual([false]);
});

test("Undo a skip; three skips in a row → a gentle check-in; the Companion is told about skips", async ({ page }) => {
  const { aiCalls } = await openApp(page);
  const d = DAYS[new Date().getDay()];
  const dash = await get("dashboard:data");
  dash.jc.exercises[d] = [{ name: "Leg Curl", exType: "weights", status: "building", current: "33kg", reps: "12x3", sets: 3, prog: [{ wk: CW - 4, w: "33kg", r: "12x3" }, skipEntry({}, CW - 3, "away"), skipEntry({}, CW - 2), skipEntry({}, CW - 1, "tired")] }];
  await put("dashboard:data", dash); await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Exercise");
  await expect(page.getByTestId("ex-skip-checkin")).toContainText("three weeks running — that's fine");
  await page.getByRole("button", { name: "Skipped Leg Curl this week" }).click();
  await expect.poll(async () => (await get("dashboard:data")).jc.exercises[d][0].prog.length).toBe(5);
  await page.getByTestId("ex-toast").getByRole("button", { name: "Undo" }).click();
  await expect.poll(async () => (await get("dashboard:data")).jc.exercises[d][0].prog.length).toBe(4);
  const n0 = aiCalls.length;
  await page.getByRole("button", { name: "My Companion Session Feedback" }).click();
  await expect.poll(() => aiCalls.length).toBeGreaterThan(n0);
  const sent = JSON.stringify(aiCalls.slice(n0));
  expect(sent).toContain("SKIPPED (why: tired)");
  expect(sent).toContain("If an exercise was skipped 3 weeks in a row, gently check in or suggest an easier alternative — never criticise.");
});

test("last week's Companion feedback at the top of the day; Open a week: 'Your Companion said (week N)' or 'No Companion feedback recorded this week'", async ({ page }) => {
  await openApp(page);
  const d = DAYS[new Date().getDay()];
  const dash = await get("dashboard:data");
  dash.jc.exercises[d] = [PRESS({ notes: "Wk" + (CW - 1) + ": next weight 29 kg (set by you)", prog: [{ wk: CW - 2, w: "27kg", r: "15x3" }, { wk: CW - 1, w: "29kg", r: "8/8/6", goodForm: "good", fullRange: "good", companion: { verdict: "Good effort.", recommendation: "Stay at 29 kg and build to 12", decision: "accepted" } }] })];
  await put("dashboard:data", dash); await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Exercise");
  const fb = page.getByTestId("last-week-fb");
  await fb.locator("summary").click();
  await expect(fb.getByTestId("last-week-fb-item")).toHaveText(["Chest Press: Stay at 29 kg and build to 12 (accepted)"]);
  await page.getByRole("button", { name: PROGRESS }).first().click();
  await page.getByRole("button", { name: "Open week " + (CW - 1) }).click();
  const f = page.getByTestId("prog-open-form");
  await expect(f.getByTestId("entry-companion")).toContainText("Your Companion said (week " + (CW - 1) + ")");
  await expect(f.getByTestId("entry-companion-decision")).toContainText("✓ Accepted");
  await expect(f.getByTestId("entry-progression-note")).toContainText("next weight 29 kg (set by you)");
  await f.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Open week " + (CW - 2) }).click();
  await expect(page.getByTestId("prog-open-form").getByTestId("entry-companion-none")).toContainText("No Companion feedback recorded this week.");
});
