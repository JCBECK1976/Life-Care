import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.13.2: Open forms / Progress panels scroll into view at 360px; tappable Open buttons; privacy notes.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k + ".json" + NS;
const getKey = async (k) => { const v = await (await fetch(url(k), { headers: { Authorization: "Bearer owner" } })).json(); return v == null ? null : JSON.parse(v); };
const setKey = (k, obj) => fetch(url(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(obj)) });
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
function thisWeek() { const base = new Date(2026, 6, 19), now = new Date(); const ws = new Date(base); ws.setDate(ws.getDate() + Math.floor((now - base) / (7 * 864e5)) * 7); return { key: "mealplan:" + ymd(ws) + ":jc", today: DAYS[now.getDay()], childKey: "eat_children:jc:" + ymd(ws) }; }
const W = (wk, kg) => ({ wk, w: kg + "kg", r: "12×3", goodForm: "good", fullRange: "good", sets: [{ w: String(kg), r: "12" }, { w: String(kg), r: "12" }, { w: String(kg), r: "12" }] });
const PHONE = { width: 360, height: 640 };

// Put the button right at the bottom edge of the screen (so what it opens starts off-screen), click it, and check
// the opened panel's top ends up on screen.
async function opensIntoView(page, button, panel) {
  await button.scrollIntoViewIfNeeded();
  await button.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().bottom - window.innerHeight + 2));
  await page.waitForTimeout(100);
  await button.click();
  await expect(panel).toBeVisible();
  await expect.poll(async () => { const b = await panel.boundingBox(); return b && b.y >= 0 && b.y < PHONE.height - 60; }, { timeout: 4000 }).toBe(true);
}

test("My Body: Weigh In panel, Measurements panel and history Open forms scroll into view at 360px; Open buttons look tappable; privacy note on the Log form and Body balance card", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.setViewportSize(PHONE);
  const d = await getKey("dashboard:data");
  d.jc.body.weight = [{ wk: 1, v: 15.5 }, { wk: 2, v: 15.3 }];
  d.jc.measurements = { chest: [{ wk: 1, v: 100 }, { wk: 2, v: 101 }], waist: [{ wk: 1, v: 90 }], calf: [{ wk: 1, v: 38 }], quad: [{ wk: 1, v: 58 }] };
  d.jc.bodyBalance = { optIn: true };
  await setKey("dashboard:data", d); await page.reload();
  await tab(page, "My Body");
  await opensIntoView(page, page.getByTitle("View Weight detail"), page.getByTestId("body-metric-panel"));
  const open2 = page.getByRole("button", { name: "Open week 2" });
  await expect(open2).toHaveCSS("color", "rgb(37, 99, 235)");                          // blue text, like Snap
  await expect(open2).toHaveCSS("border-top-color", "rgb(147, 197, 253)");              // light-blue outline
  await opensIntoView(page, open2, page.getByTestId("body-hist-open-form"));
  await page.getByRole("button", { name: "Measurements", exact: true }).click();
  await opensIntoView(page, page.getByRole("button", { name: "👁 Progress" }).last(), page.getByTestId("meas-panel"));
  await opensIntoView(page, page.getByTestId("meas-panel").getByRole("button", { name: "Open week 1" }), page.getByTestId("meas-hist-open-form"));
  await page.getByTestId("meas-panel").getByRole("button", { name: /^📋 Log / }).click();
  await expect(page.getByTestId("privacy-note").first()).toHaveText("Images are analysed and then discarded — they're never stored.");
  await expect(page.getByTestId("body-balance").getByTestId("privacy-note")).toHaveText("Images are analysed and then discarded — they're never stored.");
  expect(errors).toEqual([]);
});

test("Exercise: Progress panel and week Open form scroll into view at 360px", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.setViewportSize(PHONE);
  const d = await getKey("dashboard:data"); const list = d.jc.exercises.sunday; const i = list.map((e, k) => (e.stopped ? -1 : k)).filter((k) => k >= 0).pop();
  list[i].prog = [W(1, 60), W(2, 62), W(3, 64)];
  await setKey("dashboard:data", d); await page.reload();
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  const n = await page.getByRole("button", { name: "👁 Progress" }).count();
  await opensIntoView(page, page.getByRole("button", { name: "👁 Progress" }).nth(n - 1), page.getByTestId("ex-progress-panel"));
  await opensIntoView(page, page.getByRole("button", { name: "Open week 1" }), page.getByTestId("prog-open-form"));
  expect(errors).toEqual([]);
});

test("Eating: meal-slot Open and Update Lists Open scroll into view at 360px; new 'saved for this meal only' text", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.setViewportSize(PHONE);
  const { key, today, childKey } = thisWeek();
  const dinner = { id: "t_fish", name: "Test Fish & Potato", jcKcal: 500, beckKcal: 450, protein: 30, satFat: 4, addedSugar: 0, rating: "GOOD" };
  await setKey("custom_meals", [dinner, ...((await getKey("custom_meals")) || [])]);
  await setKey(key, { [today]: { d: dinner.id } });
  await fetch(url(childKey), { method: "DELETE", headers: { Authorization: "Bearer owner" } });
  await page.reload(); await tab(page, "My Eating");
  await opensIntoView(page, page.getByRole("button", { name: "Open this meal" }).first(), page.getByTestId("slot-open-form"));
  const form = page.getByTestId("slot-open-form");
  await form.getByRole("button", { name: "Edit", exact: true }).click();
  await form.getByRole("button", { name: "2×", exact: true }).click();
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(form.getByTestId("open-form-msg")).toHaveText("✓ Saved for this meal only. To update the list item permanently, please go to 'Update Eating Lists'.");
  await form.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await opensIntoView(page, page.getByRole("button", { name: "Open Test Fish & Potato" }), page.getByTestId("item-view"));
  expect(errors).toEqual([]);
});

test("Home: privacy note under the Body Type Photos button", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.getByRole("button", { name: "▼ My Profile" }).click();
  await page.getByRole("button", { name: "My Details" }).click();
  const label = page.locator('input[data-share="bodytype"]').locator("xpath=..");
  await expect(label.locator("xpath=following-sibling::*[1]")).toHaveText("Images are analysed and then discarded — they're never stored.");
  expect(errors).toEqual([]);
});
