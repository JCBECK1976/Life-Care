import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { mockAnthropic } from "./mock-ai.js";
import { gotoSignedIn } from "./helpers.js";

// v2.5.0: header title = selected person; scrollable person tabs; every way of switching person.
// People are staged in the LOCAL emulator only: copies of Becks's entry with long names.
const FILE = process.env.SEED_FILE || "/home/user/firebase-backup/lifecare_firebase_backup_2026-11-03.json";
const DB = "http://127.0.0.1:9000/data.json?ns=life-care-app-64d04-default-rtdb";
const EXTRA = ["Alexandra", "Christopher-James", "Maximilian", "Anastasia-Josephine", "Bartholomew", "Wilhelmina-Rose"];

async function seedPeople(n) {
  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  if (data.anthropic_api_key) data.anthropic_api_key = "dev-placeholder-not-a-real-key";
  const blob = JSON.parse(data["dashboard:data"]);
  if (n === 1) delete blob.becks;
  for (let i = 2; i < n; i++) {
    const k = "p" + (i + 1);
    blob[k] = JSON.parse(JSON.stringify(blob.becks));
    blob[k].profile = { ...blob.becks.profile, name: EXTRA[i - 2] };
  }
  data["dashboard:data"] = JSON.stringify(blob);
  const res = await fetch(DB, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("seed failed " + res.status);
  return Object.keys(blob).filter((k) => k !== "config").map((k) => blob[k].profile.name);
}

async function open(page, n, width) {
  await page.setViewportSize({ width, height: 900 });
  const names = await seedPeople(n);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mockAnthropic(page);
  await gotoSignedIn(page);
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  return { names, errors };
}

const label = (name) => (name.length > 12 ? name.slice(0, 11) + "…" : name);
const headerTabs = (page) => page.getByTestId("person-tabs").getByRole("button");
const title = (page) => page.getByTestId("header-title");

async function checkLayout(page, n, width) {
  // no horizontal page overflow; title on one line; tabs labelled ≤12 chars, not clipped, not overlapping; no "+" (v2.5.2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const t = await title(page).evaluate((e) => ({ h: e.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(e).lineHeight) || 29 }));
  expect(t.h).toBeLessThanOrEqual(t.lh + 1);
  const boxes = await headerTabs(page).evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return { l: r.left, r: r.right, text: b.textContent, clipped: b.scrollWidth > b.clientWidth + 1 }; }));
  expect(boxes.length).toBe(n);
  for (const b of boxes) { expect([...b.text].length).toBeLessThanOrEqual(12); expect(b.clipped).toBe(false); }
  for (let i = 1; i < boxes.length; i++) expect(boxes[i].l).toBeGreaterThanOrEqual(boxes[i - 1].r - 0.5);
  await expect(page.getByRole("button", { name: "+", exact: true })).toHaveCount(0); // v2.5.2: adding a person is hidden
}

async function expectSelectedVisible(page, name) {
  const v = await page.getByTestId("person-tabs").evaluate((row) => {
    const el = row.querySelector('[data-active="true"]'); const r = row.getBoundingClientRect(), e = el.getBoundingClientRect();
    return { name: el.title, inView: e.left >= r.left - 1 && e.right <= r.right + 1 };
  });
  expect(v.name).toBe(name);
  expect(v.inView).toBe(true);
}

for (const n of [1, 2, 5, 8]) for (const width of [360, 412]) {
  test(`${n} people at ${width}px: layout, title and top tabs`, async ({ page }) => {
    const { names, errors } = await open(page, n, width);
    await checkLayout(page, n, width);
    await expect(title(page)).toHaveText(names[0]);
    for (const name of [...names].reverse().concat(names[0])) {  // last → first, back again
      await page.getByTestId("person-tabs").getByRole("button", { name: label(name), exact: true }).click();
      await expect(title(page)).toHaveText(name);
      await expectSelectedVisible(page, name);
      await checkLayout(page, n, width);
    }
    expect(errors).toEqual([]);
  });

  test(`${n} people at ${width}px: exercise-log person switch (incl. after saving a log)`, async ({ page }) => {
    const { names, errors } = await open(page, n, width);
    await page.getByRole("button", { name: "My Exercise", exact: true }).first().click();
    await page.getByRole("button", { name: "Sun", exact: true }).click();
    await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
    const logTabs = page.getByTestId("log-person-tabs").getByRole("button");
    await expect(logTabs).toHaveCount(n);
    for (const b of await logTabs.evaluateAll((bs) => bs.map((x) => ({ text: x.textContent, clipped: x.scrollWidth > x.clientWidth + 1 })))) {
      expect([...b.text].length).toBeLessThanOrEqual(12); expect(b.clipped).toBe(false);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const last = names[names.length - 1];
    await page.getByTestId("log-person-tabs").getByRole("button", { name: label(last), exact: true }).click();
    await expect(title(page)).toHaveText(last);            // the header follows the log switch
    await expectSelectedVisible(page, last);               // and the header tab row scrolled to it
    if (n > 1) {
      // save a log for this person, then switch back from the log
      const reps = page.getByPlaceholder("Reps").first();
      await expect(reps).toBeVisible();
      await reps.fill("8");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByTestId("log-person-tabs")).toHaveCount(0);   // the log was saved and the form closed
      await expect(title(page)).toHaveText(last);
      await expectSelectedVisible(page, last);
    }
    expect(errors).toEqual([]);
  });
}

test("switching person (top tab or exercise log) changes the colour theme", async ({ page }) => {
  const { names } = await open(page, 5, 412);
  const home = page.getByRole("button", { name: "Home", exact: true }).first();
  const colour = () => home.evaluate((b) => getComputedStyle(b).color);
  const c1 = await colour();
  await page.getByTestId("person-tabs").getByRole("button", { name: label(names[2]), exact: true }).click();
  await expect.poll(colour).not.toBe(c1);
  const c3 = await colour();
  // now switch from the exercise log
  await page.getByRole("button", { name: "My Exercise", exact: true }).first().click();
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
  await page.getByTestId("log-person-tabs").getByRole("button", { name: label(names[4]), exact: true }).click();
  await expect(title(page)).toHaveText(names[4]);
  await expect.poll(colour).not.toBe(c3);
});
