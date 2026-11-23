import { test, expect } from "@playwright/test";
import { currentWeek } from "../scripts/make-fixture.mjs";
import fs from "node:fs";
import { openApp, tab } from "./helpers.js";
import { applyNextValue, tidyNotes, setWeekNote, nextLogPrefill } from "../src/lib/exercise.js";

// v2.20.2 (JC, beta): "My next weight" + Set applies the value (headline, Moved Up, the Set row closes, toast + Undo);
// one progression note per exercise per week; old duplicated notes shown once.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const SHOTS = "test-results/v2202-shots";
// The UI test uses the CURRENT training week (it was written in week 18 and failed once the week moved on).
const W = "Wk" + currentWeek();
const DUPW = W + " accepted: 70kg; Progression: 70 kg (set by you, " + W + "); Progression: 70 kg (set by you, " + W + "); Progression: 70 kg (set by you, " + W + ")";
const DUP = "Wk18 accepted: 70kg; Progression: 70 kg (set by you, Wk18); Progression: 70 kg (set by you, Wk18); Progression: 70 kg (set by you, Wk18)";
const PRESS = { name: "Chest Press", exType: "weights", status: "ready to move", current: "65kg", reps: "15x3", sets: 3, prog: [{ wk: 1, w: "65kg", r: "15x3" }, { wk: 2, w: "65kg", r: "15x3" }] };

test("notes: one progression line per week (Set ×3, Set then Accept); legacy duplicates shown once", () => {
  let e = PRESS; for (let i = 0; i < 3; i++) e = applyNextValue(e, 70, 18);
  expect(e.notes).toBe("Wk18: next weight 70 kg (set by you)");
  expect(setWeekNote(e.notes, 18, "Wk18: next weight 70 kg (set by you)")).toBe("Wk18: next weight 70 kg (set by you)");   // Accept with "70kg" after Set
  expect(setWeekNote(DUP, 18, "Wk18: next weight 70 kg (set by you)")).toBe("Wk18: next weight 70 kg (set by you)");      // stored rewrite on the next save
  expect(setWeekNote("keep the back flat; Wk17: next weight 65 kg (set by you)", 18, "Wk18: next weight 70 kg (set by you)")).toBe("keep the back flat; Wk17: next weight 65 kg (set by you); Wk18: next weight 70 kg (set by you)");
  expect(tidyNotes(DUP)).toBe("Wk18 accepted: 70kg; Progression: 70 kg (set by you, Wk18)");
  expect(tidyNotes("a; b; a; ; b")).toBe("a; b");
});

test("every measure type: kg, plate number, reps, seconds — the target, Moved Up and the next log", () => {
  const kg = applyNextValue(PRESS, 70, 18);
  expect([kg.current, kg.reps, kg.status]).toEqual(["70kg", "12x3", "moved up"]);
  expect(nextLogPrefill(kg, PRESS.prog[1])).toMatchObject({ w: "70", r: "12" });
  const plate = applyNextValue({ name: "Seated Row", exType: "weights", status: "ready to move", current: "Plate 7", reps: "15x3", sets: 3 }, 8, 18);
  expect([plate.current, plate.status, plate.notes]).toEqual(["Plate 8", "moved up", "Wk18: next plate 8 (set by you)"]);
  expect(nextLogPrefill(plate, { w: "Plate 7", r: "15x3" })).toMatchObject({ w: "8" });
  const reps = applyNextValue({ name: "Press Up", exType: "bodyweight", status: "ready to move", current: "BW", reps: "15x3", sets: 3 }, 18, 18);
  expect([reps.current, reps.reps, reps.notes]).toEqual(["BW", "18x3", "Wk18: next reps 18 reps (set by you)"]);
  const secs = applyNextValue({ name: "Plank", exType: "timed_hold", status: "ready to move", current: "BW", reps: "45x3", sets: 3 }, 60, 18);
  expect([secs.reps, secs.notes]).toEqual(["60x3", "Wk18: next hold time 60 seconds (set by you)"]);
});

// v2.39.0 (night batch P1): the card's "My next weight / Set" row is gone (the card is the beta layout); setting the next
// session moves into the Companion feedback (P5). The note helpers above are still tested.
test("the card has no Set row any more", async ({ page }) => {
  await openApp(page);
  const d = DAYS[new Date().getDay()];
  const dash = await get("dashboard:data"); dash.jc.exercises[d] = [{ ...PRESS }]; await put("dashboard:data", dash);
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Exercise");
  await expect(page.getByText("Chest Press").first()).toBeVisible();
  await expect(page.getByTestId("ex-next")).toHaveCount(0);
  await expect(page.getByTestId("next-value-input")).toHaveCount(0);
});
