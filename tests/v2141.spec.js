import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { openApp, tab } from "./helpers.js";
import { noFood } from "../src/lib/snap.js";
import { parseReading } from "../src/lib/measureReading.js";

// v2.14.1: feedback email as an admin setting (not in the source); "no food" / "unreadable" photo results.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k + ".json" + NS;
const getRaw = async (k) => (await fetch(url(k), { headers: { Authorization: "Bearer owner" } })).json();
const del = (k) => fetch(url(k), { method: "DELETE", headers: { Authorization: "Bearer owner" } });
const PNG = { name: "x.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") };
const ai = (obj) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: JSON.stringify(obj) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }) });
const NO_FOOD = "No food found in this photo — try another photo, or add a description and Re-check";
// every photo request answers "no food" (other AI calls fall back to the default mock)
async function mockNoFood(page) { const bodies = []; await page.route("https://api.anthropic.com/**", (r) => { const t = r.request().postData() || ""; if (!/"type":"image"/.test(t)) return r.fallback(); bodies.push(t); return r.fulfill(ai({ isFood: false, name: "a person standing in a room", kcal: 0, protein: 0, satFat: 0, addedSugar: 0 })); }); return bodies; }

test("v2.14.1 pure: noFood / readable flags", () => {
  expect(noFood({ isFood: false })).toBe(true); expect(noFood({ isFood: "false" })).toBe(true); expect(noFood(null)).toBe(true);
  expect(noFood({ isFood: true, kcal: 100 })).toBe(false); expect(noFood({ kcal: 100 })).toBe(false);          // older replies without the flag = food
  expect(parseReading('{"readable":false,"value":98}').value).toBe(null);
  expect(parseReading('{"readable":true,"value":98}').value).toBe(98);
});

test("v2.14.1: the feedback email address is not in the source code", () => {
  const files = []; const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(jsx?|mjs|html|json|md)$/.test(e.name)) files.push(p); });
  walk("src"); files.push("index.html");
  const hits = files.filter((f) => /[A-Za-z0-9._%+-]+@gmail\.com/.test(fs.readFileSync(f, "utf8")));
  expect(hits).toEqual([]);
});

test("v2.14.1: Settings → Feedback email (admin); empty = Tracker only, no email; set = email to that address; Privacy Policy shows it", async ({ page }) => {
  const { errors } = await openApp(page); await del("feedback_email"); await del("tracker");
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => { window._mailto = []; window.open = (u) => { window._mailto.push(String(u)); return null; }; });
  const send = async (text) => { await page.getByRole("button", { name: "💬 Send Feedback" }).click(); await page.getByPlaceholder(/What were you trying to do/).fill(text); await page.getByRole("button", { name: "Send Feedback", exact: true }).click(); await expect(page.getByTestId("feedback-done")).toBeVisible(); };
  await send("no email set");
  expect(await page.evaluate(() => window._mailto.length)).toBe(0);                                  // empty = no email
  await expect.poll(async () => Object.keys((await getRaw("tracker")) || {}).length).toBe(1);        // still saved to the Tracker
  await page.locator("button").nth(1).click();
  const card = page.getByTestId("contact-email");
  await card.getByRole("button", { name: "Edit" }).click();
  await card.getByLabel("Feedback email").fill("not-an-email"); await card.getByRole("button", { name: "Save" }).click();
  await expect(card.getByRole("status")).toHaveText("⚠️ That doesn't look like an email address");
  await card.getByLabel("Feedback email").fill("owner@example.com"); await card.getByRole("button", { name: "Save" }).click();
  await expect(card.getByRole("status")).toHaveText("✓ Saved");
  expect(await getRaw("feedback_email")).toBe("owner@example.com");
  await page.waitForTimeout(4500);
  await send("email set");
  expect(await page.evaluate(() => window._mailto)).toEqual([expect.stringMatching(/^mailto:owner@example\.com\?subject=/)]);
  await page.getByRole("button", { name: "Privacy Policy" }).first().click();
  await expect(page.getByText("Contact: owner@example.com", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("v2.14.1: Settings → Feedback email is admin only", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.getByRole("button", { name: "Becks", exact: true }).first().click();
  await page.locator("button").nth(1).click();
  await expect(page.getByText("🎨 My Colour Theme")).toBeVisible();
  await expect(page.getByTestId("contact-email")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("v2.14.1: no food in a 📷 Snap photo (empty and filled slots) — message, no rating or nutrition, Confirm disabled, nothing saved", async ({ page }) => {
  const { errors } = await openApp(page);
  const bodies = await mockNoFood(page);
  await tab(page, "My Eating"); await page.waitForTimeout(500);
  const before = JSON.stringify(await getRaw("eat_children:jc:" + await page.evaluate(() => { const b = new Date(2026, 6, 19), n = new Date(); const w = new Date(b); w.setDate(w.getDate() + Math.floor((n - b) / (7 * 864e5)) * 7); return w.getFullYear() + "-" + String(w.getMonth() + 1).padStart(2, "0") + "-" + String(w.getDate()).padStart(2, "0"); })));
  for (const slotIdx of [0, 2]) {                                                                 // breakfast (empty), dinner
    await page.getByRole("button", { name: "Snap a photo of your food" }).nth(slotIdx).click();
    await page.getByTestId("snap-pre").locator('input[type="file"]').setInputFiles(PNG);
    await expect(page.getByTestId("snap-no-food")).toHaveText(NO_FOOD);
    await expect(page.getByTestId("snap-rating")).toHaveCount(0);
    await expect(page.getByTestId("snap-values")).toHaveCount(0);
    await expect(page.getByTestId("portion-assumed")).toHaveCount(0);
    const actions = page.getByTestId("snap-actions");
    await expect(actions.getByRole("button", { name: "Confirm" })).toBeDisabled();
    await expect(actions.getByRole("button", { name: "↻ Re-check" })).toBeEnabled();
    await actions.getByRole("button", { name: "↻ Re-check" }).click();                            // Re-check still available
    await expect(page.getByTestId("snap-no-food")).toBeVisible();
    await actions.getByRole("button", { name: "Cancel" }).click();
  }
  expect(bodies.length).toBe(4);
  expect(bodies[0]).toContain("isFood");
  const after = JSON.stringify(await getRaw("eat_children:jc:" + await page.evaluate(() => { const b = new Date(2026, 6, 19), n = new Date(); const w = new Date(b); w.setDate(w.getDate() + Math.floor((n - b) / (7 * 864e5)) * 7); return w.getFullYear() + "-" + String(w.getMonth() + 1).padStart(2, "0") + "-" + String(w.getDate()).padStart(2, "0"); })));
  expect(after).toBe(before);                                                                     // nothing saved
  expect(errors).toEqual([]);
});

test("v2.14.1: no food in Food Checker, add-food photo and Help Me Eat — message, Confirm disabled, Re-check and Cancel only, nothing added", async ({ page }) => {
  const { errors } = await openApp(page);
  const bodies = await mockNoFood(page);
  const lists = async () => JSON.stringify(await Promise.all(["custom_breakfasts", "custom_lunches", "custom_meals", "custom_snacks", "custom_drinks", "custom_desserts"].map(getRaw)));
  const before = await lists();
  // Shop Food Checker
  await tab(page, "My Shop"); await page.locator('input[data-share="food"]').setInputFiles(PNG);
  let box = page.getByTestId("checker-no-food");
  await expect(box.getByRole("alert")).toHaveText(NO_FOOD);
  await expect(box.getByRole("button")).toHaveText(["Confirm", "Re-check", "Cancel"]);
  await expect(box.getByRole("button", { name: "Confirm" })).toBeDisabled();
  await expect(page.getByText("Add to which list?")).toHaveCount(0);
  await box.getByRole("button", { name: "Re-check" }).click(); await expect.poll(() => bodies.length).toBe(2);
  await box.getByRole("button", { name: "Cancel" }).click(); await expect(box).toHaveCount(0);
  // add food by photo (Update Eating Lists → + Add New Item to Lists → 📷)
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByRole("button", { name: "+ Add New Item to Lists" }).click();
  await page.locator('#add-item-form-manage input[type="file"]').setInputFiles(PNG);
  box = page.getByTestId("review-no-food");
  await expect(box.getByRole("alert")).toHaveText(NO_FOOD);
  await expect(box.getByRole("button", { name: "Confirm" })).toBeDisabled();
  await expect(page.getByText(/kcal/).filter({ has: box })).toHaveCount(0);
  await box.getByLabel("Photo description").fill("protein bar");
  await box.getByRole("button", { name: "Re-check" }).click(); await expect.poll(() => bodies.length).toBe(4);
  expect(bodies[3]).toContain("protein bar");                                                       // Re-check sends the description
  await page.getByTestId("review-no-food").getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: /Close/ }).first().click().catch(() => {});
  // Help Me with What to Eat
  const help = page.locator("div").filter({ hasText: /^🍽 Help Me with What to Eat/ }).last().locator("xpath=..");
  await page.getByRole("button", { name: /^dinner$/i }).last().click();
  await page.getByPlaceholder("e.g. M&S services, hotel buffet, Pizza Express...").locator("xpath=following-sibling::label//input").setInputFiles(PNG);
  box = page.getByTestId("help-eat-no-food");
  await expect(box.getByRole("alert")).toHaveText(NO_FOOD);
  await expect(box.getByRole("button")).toHaveText(["Confirm", "Re-check", "Cancel"]);
  await expect(box.getByRole("button", { name: "Confirm" })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Confirm & Add/ })).toHaveCount(0);
  await box.getByRole("button", { name: "Cancel" }).click();
  expect(await lists()).toBe(before);                                                               // nothing added anywhere
  void help;
  expect(errors).toEqual([]);
});

test("v2.14.1: measurement 📷 Snap with no readable value — message, Confirm disabled, nothing filled or saved", async ({ page }) => {
  const { errors } = await openApp(page);
  const d = JSON.parse(await getRaw("dashboard:data")); d.jc.measurements = { chest: [{ wk: 1, v: 100 }] };
  await fetch(url("dashboard:data"), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(d)) }); await page.reload();
  await page.route("https://api.anthropic.com/**", (r) => /body measurement for/.test(r.request().postData() || "") ? r.fulfill(ai({ readable: false, value: null, reading: "no tape visible" })) : r.fallback());
  await tab(page, "My Body"); await page.getByRole("button", { name: "Measurements", exact: true }).click();
  await page.getByRole("button", { name: "📋 Log", exact: true }).nth(1).click();
  await page.getByTestId("meas-snap").click(); await page.getByTestId("meas-snap-file").setInputFiles(PNG);
  await expect(page.getByTestId("meas-snap-value")).toHaveText("No readable measurement in this photo — try another photo, or add a description and Re-check");
  await expect(page.getByTestId("meas-snap-actions").getByRole("button", { name: "Confirm" })).toBeDisabled();
  await expect(page.getByTestId("meas-snap-actions").getByRole("button", { name: "Re-check" })).toBeEnabled();
  await page.getByTestId("meas-snap-actions").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByPlaceholder("was 100")).toHaveValue("");
  expect(JSON.parse(await getRaw("dashboard:data")).jc.measurements.chest.length).toBe(1);
  expect(errors).toEqual([]);
});
