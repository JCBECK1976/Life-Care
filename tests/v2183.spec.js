import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.18.3: frequency warnings and week counts use the SAME live personal rating the screen shows; one-off, idempotent
// refresh of stored ratings for the current and future weeks only.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const del = (k) => fetch(KEY(k), { method: "DELETE", headers: H });
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const WD = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const sundayOf = (off) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - d.getDay() + 7 * off); return d; };
// 800 kcal: GREAT against the 2,000 kcal reference (40%), RED monthly for JC's fixture goal (≈ 1,966 kcal → 41%)
const child = (date, weekday) => ({ id: "c_" + date + "_b", parentId: null, date, weekday, slot: "b", snapshot: { name: "Test Big Porridge", kcal: 800, satFat: 1, addedSugar: 0 },
  portion: { factor: 1 }, variations: { text: "", subs: [] }, tracked: "", source: "manual", notes: "",
  nutrition: { kcal: 800, protein: 0, fat: 0, satFat: 1, addedSugar: 0, carbs: 0, fibre: 0, salt: 0 }, rating: "GREAT", ragFreq: "", band: "GREAT" });
const weekDoc = (sun, days) => { const children = {}; days.forEach((i) => { const d = new Date(sun); d.setDate(d.getDate() + i); const c = child(ymd(d), WD[i]); children[c.id] = c; }); return { v: 1, children, empty: [], notes: {} }; };

test("the frequency warning matches the displayed (personal) rating, not the stored one", async ({ page }) => {
  const { errors } = await openApp(page);
  const sun = sundayOf(0), today = new Date().getDay(), other = today === 6 ? 5 : today + 1;
  await put("eat_children:jc:" + ymd(sun), weekDoc(sun, [today, other]));                 // stored GREAT on two days
  await put("ratings_refresh_v2183", { jc: "done", becks: "done" });                      // keep the stored GREAT for this test
  await page.reload();
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Eating");
  await page.getByRole("button", { name: new RegExp("^" + ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][today] + "( |$)") }).first().click();
  const sel = page.getByTestId("selected-item").filter({ hasText: "Test Big Porridge" }).first();
  await expect(sel).toHaveAttribute("data-rag", "RED");                                  // shown: RED for JC's goal
  await expect(page.locator('span[title^="Not recommended"]').first()).toHaveAttribute("title", "Not recommended — already selected within the past month (RED: monthly treat)");
  expect(errors).toEqual([]);
});

test("one-off refresh: stored ratings of the current and future weeks only; past weeks keep their history; a second run changes nothing", async ({ page }) => {
  const { errors } = await openApp(page);
  const past = sundayOf(-1), cur = sundayOf(0), fut = sundayOf(1);
  await put("eat_children:jc:" + ymd(past), weekDoc(past, [1, 2]));
  await put("eat_children:jc:" + ymd(cur), weekDoc(cur, [0, 3]));
  await put("eat_children:jc:" + ymd(fut), weekDoc(fut, [2]));
  await del("ratings_refresh_v2183");
  await page.reload();                                                                     // runs once on load
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await expect.poll(async () => { const f = await get("ratings_refresh_v2183"); return f && !!f.jc; }, { timeout: 20000 }).toBe(true);
  const bandsOf = async (sun) => Object.values((await get("eat_children:jc:" + ymd(sun))).children).map((c) => c.band);
  expect(await bandsOf(past)).toEqual(["GREAT", "GREAT"]);                                // history as recorded
  expect(await bandsOf(cur)).toEqual(["RED-monthly", "RED-monthly"]);
  expect(await bandsOf(fut)).toEqual(["RED-monthly"]);
  const before = JSON.stringify(await get("eat_children:jc:" + ymd(cur)));
  // a second run (explicit, ignoring the flag) changes nothing; the on-load run is skipped by the flag
  const again = await page.evaluate(async () => {
    const { refreshPersonWeeks, refreshRatingsOnce } = await import("/Life-Care/src/lib/refreshRatings.js");
    const { sGet } = await import("/Life-Care/src/lib/storage.js");
    const d = JSON.parse(await sGet("dashboard:data"));
    return { person: await refreshPersonWeeks("jc", d.jc), once: await refreshRatingsOnce(d) };
  });
  expect(again.person).toMatchObject({ weeks: 2, changed: 0 });
  expect(again.once).toEqual({ people: 0 });
  expect(JSON.stringify(await get("eat_children:jc:" + ymd(cur)))).toBe(before);
  expect(await bandsOf(past)).toEqual(["GREAT", "GREAT"]);
  expect(errors).toEqual([]);
});

test("occurrences use the live personal band; refreshDocRatings is idempotent", async ({ page }) => {
  const { errors } = await openApp(page);
  const r = await page.evaluate(async () => {
    const { occurrences, refreshDocRatings } = await import("/Life-Care/src/lib/children.js");
    const L = { kcal: 1966, satFat: 19.7, addedSugar: 24.6 };
    const c = { id: "c1", parentId: null, date: "2026-11-11", weekday: "wednesday", slot: "b", snapshot: { name: "P", kcal: 800 }, portion: { factor: 1 }, nutrition: { kcal: 800, satFat: 1, addedSugar: 0 }, rating: "GREAT", ragFreq: "", band: "GREAT" };
    const doc = { children: { c1: c } };
    const stored = occurrences(doc)[0].band, live = occurrences(doc, L)[0].band;
    const n1 = refreshDocRatings(doc, L), n2 = refreshDocRatings(doc, L);
    return { stored, live, n1, n2, after: doc.children.c1.band };
  });
  expect(r).toEqual({ stored: "GREAT", live: "RED-monthly", n1: 1, n2: 0, after: "RED-monthly" });
  expect(errors).toEqual([]);
});
