import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { syncAfterProgChange } from "../src/lib/exercise.js";
import { parseReading, readingPrompt } from "../src/lib/measureReading.js";

// v2.13.0: button standard, D20 (status pill after changing an older week), F9 (My Body history Open), F10 (measurement Snap).
const NS = "?ns=life-care-app-64d04-default-rtdb";
const dashUrl = "http://127.0.0.1:9000/data/dashboard:data.json" + NS;
const getDash = async () => JSON.parse(await (await fetch(dashUrl, { headers: { Authorization: "Bearer owner" } })).json());
const putDash = (d) => fetch(dashUrl, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(d)) });
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const IMG = { name: "tape.png", mimeType: "image/png", buffer: Buffer.from(PNG_B64, "base64") };
const IMAGE_LIKE = /iVBORw0KGgo|\/9j\/4|data:image|R0lGOD|UklGR/;
const ai = (obj) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: JSON.stringify(obj) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }) });
const W = (wk, kg, extra) => Object.assign({ wk, w: kg + "kg", r: "12×3", note: "", goodForm: "good", fullRange: "good", sets: [{ w: String(kg), r: "12" }, { w: String(kg), r: "12" }, { w: String(kg), r: "12" }] }, extra || {});

// Every button row inside an Open form fits at 360px: no button is cut off.
async function noTruncatedButtons(form) {
  const bad = await form.locator("button").evaluateAll((bs) => bs.filter((b) => b.offsetParent && b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent));
  expect(bad).toEqual([]);
}

test("D20 pure: only a change to the LATEST week touches the card and the status pill", () => {
  const ex = { status: "building", target: "15×3", current: "60kg", reps: "12×3", notes: "", prog: [W(1, 60), W(2, 65), W(3, 60)] };
  const before = ex.prog[2];
  ex.prog.splice(0, 1);                                   // remove an OLDER week
  expect(syncAfterProgChange(ex, before)).toBe(false);
  expect(ex).toMatchObject({ status: "building", target: "15×3", current: "60kg" });
  ex.prog.pop();                                          // remove the latest week
  expect(syncAfterProgChange(ex, before)).toBe(true);
  expect(ex.status).toBe(""); expect(ex.target).toBeUndefined(); expect(ex.current).toBe("65kg");
});

test("D20 + D17 + D21: removing or editing an OLDER week never puts a Reduce pill on the day card", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (dg) => dg.accept());
  await page.setViewportSize({ width: 360, height: 800 });
  const d = await getDash(); const i = d.jc.exercises.sunday.findIndex((e) => !e.stopped); const ex = d.jc.exercises.sunday[i];
  ex.prog = [W(1, 60), W(2, 65), W(3, 60)]; ex.current = "60kg"; ex.reps = "12×3"; ex.status = "building";   // latest 60 < week 2's 65
  await putDash(d); await page.reload();
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  await expect(page.getByText("Reduce", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "👁 Progress" }).nth(i).click();
  // edit week 2 (an older week)
  await page.getByRole("button", { name: "Open week 2" }).click();
  let form = page.getByTestId("prog-open-form");
  await expect(form.getByTestId("entry-goodForm-chip")).toHaveText("Good");          // D21
  await noTruncatedButtons(form);
  await form.getByRole("button", { name: "Edit", exact: true }).click();
  await form.getByLabel("Set 1 Weight").fill("70");
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(form.getByTestId("open-form-msg")).toHaveText("✓ Week 2 saved");
  expect((await getDash()).jc.exercises.sunday[i]).toMatchObject({ status: "building", current: "60kg" });
  await form.getByRole("button", { name: "Close", exact: true }).click();
  // remove week 1 (an older week) — the old code recomputed the status here and showed "Reduce"
  await page.getByRole("button", { name: "Open week 1" }).click();
  form = page.getByTestId("prog-open-form");
  await expect(form.getByRole("button", { name: "Remove", exact: true })).toHaveCSS("background-color", "rgb(194, 65, 12)");   // deep orange
  await form.getByRole("button", { name: "Remove", exact: true }).click();
  await expect.poll(async () => (await getDash()).jc.exercises.sunday[i].prog.length).toBe(2);
  expect((await getDash()).jc.exercises.sunday[i]).toMatchObject({ status: "building", current: "60kg" });
  await expect(page.getByText("Reduce", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Building", { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("D18 + D19 at 360px: Remove (deep orange) and Delete (red), never truncated", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.setViewportSize({ width: 360, height: 800 });
  const item = { id: "t_bar", name: "Test Bar With A Rather Long Name", jcKcal: 200, beckKcal: 200, satFat: 1, addedSugar: 6, rating: "GOOD" };
  const k = "custom_breakfasts"; const u = "http://127.0.0.1:9000/data/" + k + ".json" + NS;
  const cur = JSON.parse((await (await fetch(u, { headers: { Authorization: "Bearer owner" } })).json()) || "[]");
  await fetch(u, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify([item, ...cur])) });
  await page.reload();
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByRole("button", { name: "Open " + item.name }).click();
  const view = page.getByTestId("item-view");
  await expect(view.getByRole("button")).toHaveText(["Edit", "Delete", "Close"]);
  await expect(view.getByRole("button", { name: "Delete", exact: true })).toHaveCSS("background-color", "rgb(220, 38, 38)");
  await noTruncatedButtons(view);
  expect(errors).toEqual([]);
});

test("F9: Weigh In and Measurements history rows = key data + Open; Edit/Save and Remove (confirm) inside the form; type settings keep Delete", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (dg) => dg.accept());
  await page.setViewportSize({ width: 360, height: 800 });
  const d = await getDash();
  d.jc.body.weight = [{ wk: 1, v: 15.5 }, { wk: 2, v: 15.3, note: "after holiday" }];
  d.jc.measurements = { chest: [{ wk: 1, v: 100 }, { wk: 2, v: 101, note: "tape at nipple" }] };
  await putDash(d); await page.reload();
  await tab(page, "My Body");
  // Weigh In: Weight history
  await page.getByTitle("View Weight detail").click();
  const rows = page.getByTestId("body-hist-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.first().locator("input")).toHaveCount(0);                          // no inline-editable fields
  await expect(rows.first().getByRole("button")).toHaveText(["Open"]);                 // no Del
  await expect(page.getByText("after holiday")).toHaveCount(0);
  await page.getByRole("button", { name: "Open week 2" }).click();
  let form = page.getByTestId("body-hist-open-form");
  await expect(form.getByTestId("open-form-mode")).toHaveText("Viewing");
  await expect(form.getByTestId("body-hist-f-note")).toHaveText("after holiday");
  await expect(form.getByRole("button")).toHaveText(["Edit", "Remove", "Close"]);
  await noTruncatedButtons(form);
  await form.getByRole("button", { name: "Edit", exact: true }).click();
  await form.getByLabel("Value").fill("15.2");
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await getDash()).jc.body.weight[1].v).toBe(15.2);
  await page.getByRole("button", { name: "Open week 1" }).click();
  await page.getByTestId("body-hist-open-form").getByRole("button", { name: "Remove", exact: true }).click();
  await expect.poll(async () => (await getDash()).jc.body.weight.map((e) => e.wk)).toEqual([2]);
  await expect(rows).toHaveCount(1);
  // Measurements: chest history
  await page.getByRole("button", { name: "Measurements", exact: true }).click();
  await page.getByRole("button", { name: "👁 Progress" }).nth(1).click();          // fullBody (added on load) is first; chest second
  const mrows = page.getByTestId("meas-hist-row");
  await expect(mrows).toHaveCount(2);
  await expect(mrows.first().getByRole("button")).toHaveText(["Open"]);
  await page.getByRole("button", { name: "Open week 1" }).click();
  form = page.getByTestId("meas-hist-open-form");
  await expect(form.getByTestId("meas-hist-f-v")).toHaveText("100 cm");
  await form.getByRole("button", { name: "Remove", exact: true }).click();
  await expect.poll(async () => (await getDash()).jc.measurements.chest.map((e) => e.wk)).toEqual([2]);
  // the measurement type's own settings keep Edit / Delete (red)
  await expect(page.getByRole("button", { name: "🗑 Delete" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("F10 pure: the reading prompt and parser", () => {
  expect(readingPrompt({ label: "Chest", unit: "cm", desc: "inches tape", previous: 101, deep: true })).toMatch(/DEEP DIVE.*Read the value in cm/s);
  expect(parseReading('```json {"value":"98.46","reading":"at the 98.5 mark","confidence":"high"} ```')).toEqual({ value: 98.5, reading: "at the 98.5 mark", confidence: "high" });
  expect(parseReading('{"value":null,"reading":"blurred"}').value).toBe(null);
});

test("F10: measurement Log 📷 Snap — description, AI reads the value, Confirm / Re-check / Cancel, nothing saved before Confirm, no photo stored", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.setViewportSize({ width: 360, height: 800 });
  const d = await getDash(); d.jc.measurements = { chest: [{ wk: 1, v: 100 }] }; await putDash(d); await page.reload();
  const bodies = []; let reply = { value: 98.5, reading: "tape at the 98.5 mark", confidence: "high" };
  await page.route("https://api.anthropic.com/**", (r) => { const t = r.request().postData() || ""; if (!/body measurement for/.test(t)) return r.fallback(); bodies.push(JSON.parse(t)); return r.fulfill(ai(reply)); });
  await tab(page, "My Body");
  await page.getByRole("button", { name: "Measurements", exact: true }).click();
  await page.getByRole("button", { name: "📋 Log", exact: true }).nth(1).click();
  const before = JSON.stringify(await getDash());
  await page.getByTestId("meas-snap").click();
  const panel = page.getByTestId("meas-snap-panel");
  await panel.getByLabel("Measurement photo description").fill("tape at nipple level");
  await panel.getByTestId("meas-snap-file").setInputFiles(IMG);
  await expect(panel.getByTestId("meas-snap-value")).toHaveText("98.5 cm");
  expect(bodies[0].messages[0].content[0].type).toBe("image");
  expect(bodies[0].messages[0].content[1].text).toContain('The person says: "tape at nipple level"');
  await expect(panel.getByTestId("meas-snap-actions").getByRole("button")).toHaveText(["Confirm", "Re-check", "Cancel"]);
  await noTruncatedButtons(panel);
  // Re-check = independent deep dive with the (edited) description
  reply = { value: 98, reading: "closer look: 98.0", confidence: "high" };
  await panel.getByLabel("Measurement photo description").fill("tape at nipple level, relaxed");
  await panel.getByRole("button", { name: "Re-check" }).click();
  await expect(panel.getByTestId("meas-snap-value")).toHaveText("98 cm");
  await expect(panel.getByTestId("meas-snap-compare")).toHaveText("First check: 98.5 cm");
  expect(bodies[1].messages[0].content[1].text).toMatch(/relaxed[\s\S]*DEEP DIVE/);
  expect(JSON.stringify(await getDash())).toBe(before);                                // nothing saved before Confirm
  await panel.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByTestId("meas-snap-panel")).toHaveCount(0);
  await expect(page.getByPlaceholder("was 100")).toHaveValue("98");                    // Confirm fills the value
  expect(JSON.stringify(await getDash())).toBe(before);                                // ...still not saved
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await getDash()).jc.measurements.chest.length).toBe(2);
  const raw = JSON.stringify(await getDash());
  expect(raw).not.toMatch(IMAGE_LIKE);                                                 // the photo was never stored
  // Cancel leaves everything as it was
  await page.getByRole("button", { name: "📋 Log", exact: true }).nth(1).click();
  await page.getByTestId("meas-snap").click();
  await page.getByTestId("meas-snap-panel").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("meas-snap-panel")).toHaveCount(0);
  expect(errors).toEqual([]);
});
