import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { aimOf, goalCtx, goalSuggestion, recommendedTarget, isOwnTarget } from "../src/lib/goals.js";

// v2.18.1: the target weight is recommended by the app (body-fat method, BMI fallback); the person accepts or changes it.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const readData = async () => JSON.parse(await (await fetch(KEY("dashboard:data"), { headers: H })).json());
const writeData = (d) => fetch(KEY("dashboard:data"), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(d)) });
const three = (v) => [1, 2, 3].map((wk) => ({ wk, v }));
const JC = { profile: { sex: "Male", age: 50, height: "178cm", activityLevel: "sitting" }, body: { weight: three(91.9), bodyFat: three(25.5) } };
const BECKS = { profile: { sex: "Female", age: 47, height: "165cm", activityLevel: "sitting" }, body: { weight: three(10.4), bodyFat: three(30) } };   // stone

test("body-fat method (known inputs): lean mass ÷ (1 − mid-point of the healthy body-fat range for sex and age)", () => {
  expect(recommendedTarget(JC)).toMatchObject({ kg: 85.6, minKg: 83.5, maxKg: 87.8, method: "body-fat", estimate: false, bodyFatTarget: [18, 22] });   // 68.5 kg lean ÷ 0.80
  expect(recommendedTarget(JC).why).toContain("lean mass (68.5 kg)");
  expect(recommendedTarget(BECKS)).toMatchObject({ kg: 64.2, minKg: 61.6, maxKg: 67, bodyFatTarget: [25, 31] });                                 // 46.2 kg lean ÷ 0.72
  expect(recommendedTarget({ ...JC, profile: { ...JC.profile, age: 30 } })).toMatchObject({ kg: 82.5, bodyFatTarget: [15, 19] });                // younger: slightly lower
  // the aim uses the recommendation when the person hasn't chosen their own target
  const a = aimOf({ ...JC, goal: { id: "healthy_weight", months: 7 } });
  expect(a.targetKg).toBe(85.6); expect(a.pace.kgPerWeek).toBe(Math.round((91.9 - 85.6) / (7 * 52 / 12) * 100) / 100);
});

test("BMI fallback without body fat: top half of the healthy range, labelled an estimate; never below BMI 18.5", () => {
  const r = recommendedTarget({ profile: JC.profile, body: { weight: three(91.9) } });
  expect(r).toMatchObject({ kg: 74.3, minKg: 69.7, maxKg: 78.9, method: "bmi", estimate: true });
  expect(r.why).toContain("add body composition");
  const thin = recommendedTarget({ profile: { sex: "Female", age: 45, height: "165cm" }, body: { weight: three(45), bodyFat: three(25) } });
  expect(thin.kg).toBe(50.4);                                                                 // 46.9 → lifted to BMI 18.5 for 165 cm
});

test("accept vs own target: note when different; both stored; the companion may refer to the recommendation; material change → suggestion", () => {
  const rec = recommendedTarget(JC);
  expect(isOwnTarget({ targetSource: "recommended", targetKg: 85.6 }, rec)).toBe(false);
  expect(isOwnTarget({ targetSource: "own", targetKg: 80 }, rec)).toBe(true);
  const own = { ...JC, goal: { id: "healthy_weight", months: 7, targetKg: 80, recommendedKg: 85.6, targetSource: "own" } };
  expect(aimOf(own).targetKg).toBe(80);
  expect(goalCtx(own)).toContain("They chose their own target of 80 kg instead");
  expect(goalCtx(own)).toContain("Recommended target weight (from their profile): 85.6 kg");
  // the recommendation moved materially since it was accepted → suggest updating (suggestion only)
  const moved = { ...JC, goal: { id: "healthy_weight", months: 7, targetKg: 90, recommendedKg: 90, targetSource: "recommended" } };
  expect(goalSuggestion(moved)).toMatchObject({ key: "target-85.6", to: { targetKg: 85.6, recommendedKg: 85.6, targetSource: "recommended" } });
  expect(goalSuggestion({ ...moved, goal: { ...moved.goal, recommendedKg: 86.5, targetKg: 86.5 } })).toBe(null);   // < 2 kg: no suggestion
});

test("UI: setup shows the recommendation; Change shows the amber note; both values stored; BMI 18.5 still blocked", async ({ page }) => {
  const { errors } = await openApp(page);
  const d = await readData(); delete d.jc.goal; await writeData(d); await page.reload();
  const dlg = page.getByTestId("goal-setup");
  await expect(dlg).toBeVisible({ timeout: 20000 });
  await dlg.getByLabel(/Work towards a healthy body weight/).check();
  await expect(dlg.getByTestId("goal-recommend")).toContainText(/Your Companion recommends: [\d.]+ kg \(range [\d.]+–[\d.]+ kg\)/);
  await expect(dlg.getByTestId("goal-target-accepted")).toBeVisible();
  await expect(dlg.getByLabel(/My target weight/)).toHaveCount(0);                            // no free entry first
  const recKg = parseFloat(await dlg.getByTestId("goal-recommend-kg").innerText());
  await dlg.getByRole("button", { name: "Change", exact: true }).click();
  await dlg.getByLabel("My target weight (kg)").fill("40");
  await expect(dlg.getByTestId("goal-bmi-block")).toBeVisible();
  await dlg.getByLabel("My target weight (kg)").fill(String(Math.round(recKg - 3)));
  await expect(dlg.getByTestId("goal-own-note")).toHaveText("This isn't your Companion's recommendation based on your profile.");
  await dlg.getByRole("button", { name: "Save my goal" }).click();
  await expect(dlg).toHaveCount(0);
  const g = (await readData()).jc.goal;
  expect(g).toMatchObject({ id: "healthy_weight", targetKg: Math.round(recKg - 3), recommendedKg: recKg, targetSource: "own" });
  // My Profile shows the recommendation and the note
  await page.getByText("▼ My Profile").first().click();
  await expect(page.getByTestId("my-target")).toContainText("Your Companion recommends: " + recKg + " kg");
  await expect(page.getByTestId("my-target-own")).toBeVisible();
  expect(errors).toEqual([]);
});
