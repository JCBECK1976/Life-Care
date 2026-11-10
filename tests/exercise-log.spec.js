import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";
import { entrySets, fmtEntry, logSetsFrom, setsDiffer, setsToSave, weightLabel } from "../src/lib/exercise.js";

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
  await expect(page.getByTestId("log-need-choice")).toHaveText("Choose Form and Range to save");
  await expect(page.getByText("choose one")).toHaveCount(0);                 // no per-label text
  for (const g of ["quality-range", "quality-form"]) await expect(page.getByTestId(g)).toHaveAttribute("data-missing", "true");
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

// JC's rule for logging two people from one form (v2.6.1 addendum)
const firstSun = (d, who) => d[who].exercises.sunday.findIndex((e) => !e.stopped);
const progOf = (d, who, i) => JSON.stringify(d[who].exercises.sunday[i].prog || []);
const switchInLog = (page, name) => page.getByTestId("log-person-tabs").getByRole("button", { name, exact: true }).click();

test("two people: the other person with blank Form/Range is NOT saved, and the confirmation says so", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  const before = await readData(); const i = firstSun(before, "jc");
  await openLog(page);
  await page.getByPlaceholder("Reps").first().fill("6");          // JC edited, but Form/Range left blank
  await switchInLog(page, "Becks");
  await expect(page.getByTestId("log-for")).toHaveText("Logging for Becks");
  await page.getByPlaceholder("Reps").first().fill("9");
  await qualityGood(page);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/saved for Becks · JC not saved \(Form and Range not chosen\)/)).toBeVisible();
  const after = await readData();
  expect(progOf(after, "jc", i)).toBe(progOf(before, "jc", i));    // JC untouched
  expect(after.becks.exercises.sunday[i].prog.some((p) => p.goodForm === "good" && p.sets)).toBe(true);
  // rule 7: JC's log later opens with the usual pre-fill, Form/Range unselected
  await page.getByTestId("person-tabs").getByRole("button", { name: "JC", exact: true }).click();
  await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
  await expect(page.getByTestId("log-for")).toHaveText("Logging for JC");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("log-need-choice")).toHaveText("Choose Form and Range to save");
  expect(errors).toEqual([]);
});

test("two people: the other person with Form/Range chosen IS saved", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  const i = firstSun(await readData(), "jc");
  await openLog(page);
  await page.getByPlaceholder("Reps").first().fill("6");
  await qualityGood(page);                                           // JC complete
  await switchInLog(page, "Becks");
  await page.getByPlaceholder("Reps").first().fill("9");
  await qualityGood(page);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/saved for Becks and JC$/)).toBeVisible();
  const after = await readData();
  for (const who of ["jc", "becks"]) expect(after[who].exercises.sunday[i].prog.some((p) => p.goodForm === "good" && p.fullRange === "good" && p.sets)).toBe(true);
  expect(errors).toEqual([]);
});

test("two people: the person shown on the form with blank Form/Range blocks Save", async ({ page }) => {
  await openApp(page);
  page.on("dialog", (d) => d.accept());
  const before = await readData(); const i = firstSun(before, "jc");
  await openLog(page);
  await qualityGood(page);                                           // JC complete
  await switchInLog(page, "Becks");                                  // Becks shown, blank
  await page.getByPlaceholder("Reps").first().fill("9");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("log-need-choice")).toHaveText("Choose Form and Range to save");
  await expect(page.getByTestId("log-for")).toHaveText("Logging for Becks");
  const after = await readData();
  for (const who of ["jc", "becks"]) expect(progOf(after, who, i)).toBe(progOf(before, who, i)); // nothing saved
});

// JC phone test (v2.6.1): range display, "Sets:" line only when sets differ, per-set pre-fill for a new week.
const writeData = async (d) => fetch(DB, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(d)) });

test("sets that differ show a weight range and a Sets line; uniform and old entries do not", () => {
  const mixed = { w: "63kg", r: "10/8/8", sets: [{ w: "63", r: "10" }, { w: "56", r: "8" }, { w: "63", r: "8" }] };
  expect(setsDiffer(mixed)).toBe(true);
  expect(weightLabel(mixed)).toBe("56–63kg");
  expect(fmtEntry(mixed)).toBe("63kg×10, 56kg×8, 63kg×8");
  const uniform = { w: "20kg", r: "10×3", sets: [{ w: "20", r: "10" }, { w: "20", r: "10" }, { w: "20", r: "10" }] };
  expect(setsDiffer(uniform)).toBe(false);
  expect(weightLabel(uniform)).toBe("20kg");
  expect(setsDiffer({ w: "20kg", r: "10×3" })).toBe(false);
  expect(weightLabel({ w: "20kg", r: "10×3" })).toBe("20kg");
});

test("a new week's log pre-fills each set from the previous entry; Progress and header show the range", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  const d = await readData(); const i = firstSun(d, "jc"); const ex = d.jc.exercises.sunday[i];
  ex.prog = [{ wk: 1, w: "63kg", r: "10/8/8", sets: [{ w: "63", r: "10" }, { w: "56", r: "8" }, { w: "63", r: "8" }], goodForm: "good", fullRange: "good" },
             { wk: 0, w: "20kg", r: "10×3" }].reverse();          // old uniform entry first, mixed entry last
  await writeData(d);
  await page.reload();                                                             // reload with the new data (still signed in)
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "My Exercise", exact: true }).first().click();
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  await expect(page.getByText(/56–63kg · /).first()).toBeVisible();                    // header shows range
  await page.getByRole("button", { name: "👁 Progress" }).nth(i).click();
  await expect(page.getByTestId("prog-weight").filter({ hasText: "56–63kg" })).toHaveCount(1);
  await expect(page.getByTestId("prog-sets")).toHaveCount(1);                          // only the mixed entry
  await expect(page.getByTestId("prog-sets")).toHaveText("Sets: 63kg×10, 56kg×8, 63kg×8");
  await page.getByRole("button", { name: "📋 Log", exact: true }).nth(i).click();
  await expect(page.getByText(/Previous: 63kg×10, 56kg×8, 63kg×8/)).toBeVisible();
  const w = page.getByPlaceholder("Weight"), r = page.getByPlaceholder("Reps");
  expect(await w.evaluateAll((els) => els.slice(0, 3).map((e) => e.value))).toEqual(["63", "56", "63"]);
  expect(await r.evaluateAll((els) => els.slice(0, 3).map((e) => e.value))).toEqual(["10", "8", "8"]);
  expect(errors).toEqual([]);
});
