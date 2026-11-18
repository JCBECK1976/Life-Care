import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { legacyCode, fromStLb, fromKgText, readings, readWeight, weighInEntry } from "../src/lib/weight.js";

// v2.32.3 (Architect, 18 Nov — WEIGH-IN ENTRY): st + lb or kg boxes everywhere weight is typed; saved as kg (canonical)
// + the legacy string older versions read (ADR 0002 / 0019); the "check this weigh-in" picker.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const dash = async () => JSON.parse(await (await fetch("http://127.0.0.1:9000/data/dashboard:data.json" + NS, { headers: H })).json());
const putDash = (d) => fetch("http://127.0.0.1:9000/data/dashboard:data.json" + NS, { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(d)) });
const ready = (page) => expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
const record = async (page) => { await page.getByRole("button", { name: /Record/ }).first().click(); return page.getByText("Body Composition").locator("xpath=.."); };

test("writer: kg + the legacy string with its zeros (14st 11.0lb → '14.110', never ambiguous); validation limits", () => {
  expect(weighInEntry(7, fromStLb(14, 11))).toEqual({ wk: 7, v: "14.110", kg: 93.89 });
  expect(legacyCode(80.4)).toBe("12.93"); expect(readWeight({ v: "12.93" }).label).toBe("12st 9.3lb");
  expect(readWeight({ v: legacyCode(93.89) }).ambiguous).toBe(false);
  expect([fromStLb(3, 0), fromStLb(41, 0), fromStLb(14, 14), fromStLb(14, 6.85), fromStLb(14.5, 0)]).toEqual([null, null, null, null, null]);
  expect([fromStLb(4, 0) > 0, fromStLb(40, 13.9) > 0]).toEqual([true, true]);
  expect([fromKgText("24.9"), fromKgText("250.1"), fromKgText("80.45"), fromKgText("80.4")]).toEqual([null, null, null, 80.4]);
  expect(readings({ v: 14.11 }).map((r) => r.label)).toEqual(["14st 1.1lb", "14st 11.0lb"]);
  expect(readings({ v: 14.1 }).map((r) => r.label)).toEqual(["14st 1.0lb", "14st 10.0lb"]);
});

test("stones user: My Body → Record shows st + lb boxes (numeric keypads); 14 st 11 lb saves kg + '14.110'; out-of-range is refused", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Body");
  const form = await record(page);
  await expect(form.getByTestId("bw-st")).toHaveAttribute("inputmode", "numeric");
  await expect(form.getByTestId("bw-lb")).toHaveAttribute("inputmode", "decimal");
  await expect(form.getByTestId("bw-kg")).toHaveCount(0);
  await form.getByTestId("bw-st").fill("3");
  await expect(form.getByTestId("bw-err")).toContainText("Stones 4–40");
  await form.getByTestId("bw-st").fill("14"); await form.getByTestId("bw-lb").fill("14");
  await expect(form.getByTestId("bw-err")).toContainText("pounds 0–13.9");
  await form.getByTestId("bw-lb").fill("11");
  await expect(form.getByTestId("bw-err")).toHaveCount(0);
  const wk = (await dash()).config.week;
  await form.getByText("Week", { exact: true }).locator("xpath=following::input[1]").fill(String(wk));
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await dash()).jc.body.weight.find((e) => e.wk === wk)).toMatchObject({ v: "14.110", kg: 93.89 });
  await expect(page.getByText("14st 11.0lb").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("kg user: the switch saves the person's unit; one kg box; 80.4 kg saves kg + the legacy string; the card shows kg", async ({ page }) => {
  await openApp(page);
  await tab(page, "My Body");
  let form = await record(page);
  await form.getByTestId("bw-unit-kg").click();
  await expect.poll(async () => (await dash()).jc.profile.weightUnit).toBe("kg");
  form = page.getByText("Body Composition").locator("xpath=..");
  await expect(form.getByTestId("bw-st")).toHaveCount(0);
  await expect(form.getByTestId("bw-kg")).toHaveAttribute("inputmode", "decimal");
  await form.getByTestId("bw-kg").fill("300");
  await expect(form.getByTestId("bw-err")).toContainText("Between 25 and 250 kg");
  await form.getByTestId("bw-kg").fill("80.4");
  const wk = (await dash()).config.week;
  await form.getByText("Week", { exact: true }).locator("xpath=following::input[1]").fill(String(wk));
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await dash()).jc.body.weight.find((e) => e.wk === wk)).toMatchObject({ v: "12.93", kg: 80.4 });
  await expect(page.getByText("80.4 kg").first()).toBeVisible();
});

test("the picker: an ambiguous weigh-in's 'Fix it' (card) and badge (history) open the st/lb editor with both readings; choosing one saves it", async ({ page }) => {
  await openApp(page);
  const d = await dash(); const wk = d.config.week;
  d.jc.body.weight = [{ wk: wk - 3, v: 14.12 }, { wk: wk - 1, v: 14.11 }];
  await putDash(d); await page.reload(); await ready(page);
  await tab(page, "My Body");
  await page.getByTestId("weight-check-fix").click();
  const sheet = page.getByTestId("weight-fix");
  await expect(sheet).toContainText("14st 1.1lb"); await expect(sheet).toContainText("14st 11.0lb");
  await expect(sheet.getByTestId("wfix-st")).toBeVisible();                                   // the same st/lb editor
  await sheet.getByTestId("weight-fix-opt-1").check();                                       // 14 st 11.0 lb
  await expect(sheet.getByTestId("wfix-lb")).toHaveValue("11");                              // pre-filled from the choice
  await sheet.getByTestId("weight-fix-save").click();
  await expect.poll(async () => (await dash()).jc.body.weight.find((e) => e.wk === wk - 1)).toMatchObject({ v: "14.110", kg: 93.89 });
  await expect(page.getByTestId("weight-check")).toHaveCount(0);
  // the older one, from the history badge
  await page.getByTitle("View Weight detail").click();
  await page.getByTestId("body-hist-badge").first().click();
  await expect(page.getByTestId("weight-fix")).toContainText("12.0lb");
  await page.getByTestId("weight-fix").getByTestId("weight-fix-opt-0").check();               // 14 st 1.2 lb
  await page.getByTestId("weight-fix-save").click();
  await expect.poll(async () => (await dash()).jc.body.weight.find((e) => e.wk === wk - 3)).toMatchObject({ v: "14.12", kg: readings({ v: 14.12 })[0].kg });
});

test("history edit uses the same boxes: change the pounds → saved as kg + legacy string", async ({ page }) => {
  await openApp(page);
  const d = await dash(); const wk = d.config.week;
  d.jc.body.weight = [{ wk: wk - 1, v: 14.68 }];
  await putDash(d); await page.reload(); await ready(page);
  await tab(page, "My Body");
  await page.getByTitle("View Weight detail").click();
  await page.getByRole("button", { name: "Open week " + (wk - 1) }).click();
  const f = page.getByTestId("body-hist-open-form");
  await f.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(f.getByTestId("body-hist-wt-st")).toHaveValue("14");
  await expect(f.getByTestId("body-hist-wt-lb")).toHaveValue("6.8");
  await f.getByTestId("body-hist-wt-lb").fill("12.4");
  await f.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await dash()).jc.body.weight[0]).toMatchObject({ v: "14.124", kg: fromStLb(14, 12.4) });
});

test("the photo (Upload) fills the st/lb boxes from what the scales showed — 14st 11.2lb", async ({ page }) => {
  await openApp(page);
  await page.route("https://api.anthropic.com/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify({ weight: "14.112", bodyFat: "25.8" }) }], usage: { input_tokens: 1, output_tokens: 1 } }) }));
  await tab(page, "My Body");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await page.locator('input[type="file"][data-share="body"]').setInputFiles({ name: "scales.png", mimeType: "image/png", buffer: png });
  const form = page.getByText("Body Composition").locator("xpath=..");
  await expect(form.getByTestId("bw-st")).toHaveValue("14");
  await expect(form.getByTestId("bw-lb")).toHaveValue("11.2");
});
