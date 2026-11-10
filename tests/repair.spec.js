import { test, expect } from "@playwright/test";
import { openApp, person } from "./helpers.js";
import { planSnapRepair, lookupFromExport } from "../src/lib/meals.js";

// v2.6.5 D6 one-off repair: dry run (counts only) → write; adds _snap only; idempotent.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k + ".json" + NS;
const getRaw = async (k) => (await fetch(url(k), { headers: { Authorization: "Bearer owner" } })).json();
const setKey = (k, obj) => fetch(url(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(obj)) });
const openSettings = (page) => page.locator("button").nth(1).click();

test("D6 repair (pure): adds only missing snapshots, from the list or an export; second run adds nothing", () => {
  const plans = { "mealplan:2026-09-06:jc": { monday: { b: "a", l: "gone", d: "lost", o1: "__empty__", o2: "spag" }, _snap: { "monday:l": { id: "old", name: "Old" } }, _notes: { x: 1 } }, "mealplan:2026-08-23": { sun: "spag_bol" } };
  const lookup = { a: { id: "a", name: "A", jcKcal: 100, rating: "GOOD" }, gb_spag: { id: "gb_spag", name: "Spaghetti Bolognese", jcKcal: 550 } };
  const backup = lookupFromExport({ data: { custom_snacks: JSON.stringify([{ id: "gone", name: "Gone Bar", jcKcal: 120 }]) } });
  const r = planSnapRepair(plans, lookup, backup);
  expect(r).toMatchObject({ weeks: 2, slots: 4, alreadyOk: 0, fromList: 1, fromOldId: 1, fromBackup: 1, unresolved: 1, weeksToWrite: 1 });
  expect(r.adds["mealplan:2026-09-06:jc"]["monday:o2"]).toMatchObject({ id: "spag", name: "Spaghetti Bolognese", repaired: "oldId" });
  expect(r.adds["mealplan:2026-09-06:jc"]["monday:b"]).toMatchObject({ id: "a", name: "A", kcal: 100, approx: true, repaired: "list" });
  expect(r.adds["mealplan:2026-09-06:jc"]["monday:l"]).toMatchObject({ id: "gone", name: "Gone Bar", repaired: "backup" });
  // after writing, nothing more to add
  const written = JSON.parse(JSON.stringify(plans)); Object.assign(written["mealplan:2026-09-06:jc"]._snap, r.adds["mealplan:2026-09-06:jc"]);
  expect(planSnapRepair(written, lookup, backup)).toMatchObject({ fromList: 0, fromOldId: 0, fromBackup: 0, weeksToWrite: 0, alreadyOk: 3, unresolved: 1 });
});

test("D6 repair rehearsal on the emulator copy of the backup: dry run → write → dry run finds nothing; slots unchanged", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  const before = await getRaw("");                                    // whole emulator root (seeded from the backup)
  const planKeys = Object.keys(before).filter((k) => k.startsWith("mealplan:"));
  await person(page, "JC");
  await openSettings(page);
  await page.getByRole("button", { name: "Open Data tools" }).click();
  await page.getByRole("button", { name: "Dry run (counts only)" }).click();
  const res = page.getByTestId("snap-repair-result");
  await expect(res).toBeVisible({ timeout: 20000 });
  const first = await res.innerText();
  console.log("REHEARSAL dry run 1: " + first);
  expect(JSON.stringify(await getRaw(""))).toBe(JSON.stringify(before));              // dry run wrote nothing
  await page.getByRole("button", { name: "Write snapshots" }).click();
  await expect(page.getByTestId("snap-repair-msg")).toContainText("✓ Wrote", { timeout: 20000 });
  console.log("REHEARSAL write: " + await page.getByTestId("snap-repair-msg").innerText());
  await page.getByRole("button", { name: "Dry run (counts only)" }).click();
  await expect(res).toContainText(" 0 from current lists · 0 from renamed built-in items · 0 from the export");
  console.log("REHEARSAL dry run 2: " + await res.innerText());
  await expect(res).toContainText("0 weeks to write");
  const after = await getRaw("");
  for (const k of planKeys) {                                                         // only _snap was added
    const a = JSON.parse(before[k]), b = JSON.parse(after[k]); delete b._snap; delete a._snap;
    expect(b).toEqual(a);
  }
  for (const k of Object.keys(before).filter((k) => !k.startsWith("mealplan:"))) expect(after[k]).toEqual(before[k]);
  expect(errors).toEqual([]);
});
