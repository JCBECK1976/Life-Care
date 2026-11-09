import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";
import { entrySets, fmtEntry, logSetsFrom, setsToSave } from "../src/lib/exercise.js";

// v2.6.1: D1 (form belongs to its person), D2 (weight and reps per set), D12 (Form and Range must be chosen).
const DB = "http://127.0.0.1:9000/data/dashboard:data.json?ns=life-care-app-64d04-default-rtdb";
const readData = async () => JSON.parse(await (await fetch(DB, { headers: { Authorization: "Bearer owner" } })).json());
const sundayProg = async () => (await readData()).jc.exercises.sunday.map((e) => (e.prog || []).length);

async function openLog(page) {
  await page.getByRole("button", { name: "My Exercise", exact: true }).first().click();
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
  await expect(page.getByTestId("log-for")).toHaveText("Logging for JC");
}
const qualityGood = async (page) => { for (const b of await page.getByRole("button", { name: "Good", exact: true }).all()) await b.click(); };

test("D12: Form and Range start unselected; Save is blocked with an inline prompt until both are chosen", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  await openLog(page);
  const before = await sundayProg();
  await page.getByPlaceholder("Reps").first().fill("9");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("log-need-choice")).toHaveText("Choose Form and Range");
  await expect(page.getByText("· choose one")).toHaveCount(2);
  expect(await sundayProg()).toEqual(before); // nothing saved
  await qualityGood(page);
  await expect(page.getByTestId("log-need-choice")).toHaveCount(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("log-for")).toHaveCount(0); // saved, form closed
  const ex = (await readData()).jc.exercises.sunday.find((e) => e.prog && e.prog.some((p) => p.sets));
  const saved = ex.prog.find((p) => p.sets);
  expect([saved.goodForm, saved.fullRange]).toEqual(["good", "good"]);
  expect(errors).toEqual([]);
});

test("D2: different weights per set are saved and shown per set; Edit Previous Entry prefills them", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  await openLog(page);
  const w = page.getByPlaceholder("Weight"), r = page.getByPlaceholder("Reps");
  for (const [i, wv, rv] of [[0, "16", "10"], [1, "22", "8"], [2, "22", "8"]]) { await w.nth(i).fill(wv); await r.nth(i).fill(rv); }
  await qualityGood(page);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("log-for")).toHaveCount(0);
  const ex = (await readData()).jc.exercises.sunday.find((e) => e.prog && e.prog.some((p) => p.sets));
  const saved = ex.prog.find((p) => p.sets);
  expect(saved.sets).toEqual([{ w: "16", r: "10" }, { w: "22", r: "8" }, { w: "22", r: "8" }]);
  expect(saved.w).toBe("16kg"); // old field kept for older readers (set 1)
  await page.getByRole("button", { name: "👁 Progress" }).first().click();
  await expect(page.getByTestId("prog-sets").first()).toHaveText("Sets: 16kg×10, 22kg×8, 22kg×8");
  await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
  await expect(page.getByText(/Previous: 16kg×10, 22kg×8, 22kg×8/)).toBeVisible();
  expect(await w.evaluateAll((els) => els.slice(0, 3).map((e) => e.value))).toEqual(["16", "22", "22"]);
  expect(errors).toEqual([]);
});

test("D2: older single-weight entries still read correctly", () => {
  const old = { wk: 3, w: "20kg", r: "10×3" };           // stored before v2.6.1: one weight, reps "10×3" or "10/8/8"
  expect(logSetsFrom(old, 3)).toEqual([{ w: "20", r: "10" }, { w: "20", r: "10" }, { w: "20", r: "10" }]);
  expect(logSetsFrom({ w: "20kg", r: "10/8/8" }, 3)).toEqual([{ w: "20", r: "10" }, { w: "20", r: "8" }, { w: "20", r: "8" }]);
  expect(entrySets(old)[0]).toEqual({ w: "20", r: "10" });
  expect(fmtEntry(old)).toBe("20kg 10×3");
  expect(fmtEntry({ w: "20kg", r: "10x3", sets: [{ w: "20", r: "10" }, { w: "20", r: "10" }, { w: "20", r: "10" }] })).toBe("20kg 10x3");
  expect(setsToSave([{ w: "16", r: "10" }, { w: "", r: "8" }])).toEqual([{ w: "16", r: "10" }, { w: "16", r: "8" }]);
});

test("D1: switching person in the header with a log open asks first; never a mixed state", async ({ page }) => {
  const { errors } = await openApp(page);
  await openLog(page);
  await page.getByPlaceholder("Reps").first().fill("7");
  let msg = "";
  page.once("dialog", (d) => { msg = d.message(); d.dismiss(); });
  await page.getByTestId("person-tabs").getByRole("button", { name: "Becks", exact: true }).click();
  expect(msg).toBe("Discard JC's unsaved log entries and switch to Becks?");
  await expect(page.getByTestId("header-title")).toHaveText("JC");          // stayed on JC
  await expect(page.getByTestId("log-for")).toHaveText("Logging for JC");   // form untouched
  await expect(page.getByPlaceholder("Reps").first()).toHaveValue("7");
  page.once("dialog", (d) => d.accept());
  await page.getByTestId("person-tabs").getByRole("button", { name: "Becks", exact: true }).click();
  await expect(page.getByTestId("header-title")).toHaveText("Becks");
  await expect(page.getByTestId("log-for")).toHaveCount(0);                 // form closed, nothing carried over
  expect(await page.evaluate(() => window.__lcPerson.activeTab)).toBe("becks");
  expect(errors).toEqual([]);
});
