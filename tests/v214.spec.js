import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { addToLedger, energyFromLedger, featureOf, costOf, summarise } from "../src/lib/aiUsage.js";

// v2.14.0 Step 1b + tracker.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const dashUrl = "http://127.0.0.1:9000/data/dashboard:data.json" + NS;
const getDash = async () => JSON.parse(await (await fetch(dashUrl, { headers: { Authorization: "Bearer owner" } })).json());
const putDash = (d) => fetch(dashUrl, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(d)) });

// A phone-sized photo: 4032×3024, smooth gradients plus strong sensor-like grain, JPEG 0.95 (several MB).
async function bigPhoto(page) {
  const b64 = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 4032; c.height = 3024; const x = c.getContext("2d"); const d = x.createImageData(c.width, c.height);
    for (let y = 0, i = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++, i += 4) { const g = (Math.random() - 0.5) * 60; d.data[i] = (xx / 16 + g) & 255; d.data[i + 1] = (y / 12 + g) & 255; d.data[i + 2] = ((xx + y) / 28 + g) & 255; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); return c.toDataURL("image/jpeg", 0.95).split(",")[1]; });
  return { name: "phone.jpg", mimeType: "image/jpeg", buffer: Buffer.from(b64, "base64") };
}

test("item 1: every photo feature sends a shrunk photo (request < 1 MB, long edge ≤ 1568)", async ({ page }) => {
  test.setTimeout(120000);
  const { errors } = await openApp(page);
  const sizes = [];
  page.on("request", (r) => { if (!/api\.anthropic\.com/.test(r.url())) return; const body = r.postData() || ""; if (!/"type":"image"/.test(body)) return; const dims = (JSON.parse(body).messages[0].content.filter((c) => c.type === "image")).map((c) => c.source.data.length); sizes.push({ bytes: body.length, images: dims }); });
  const photo = await bigPhoto(page);
  expect(photo.buffer.length).toBeGreaterThan(3 * 1024 * 1024);                        // the original is a real phone-size photo
  const expectSent = async (n) => { await expect.poll(() => sizes.length, { timeout: 10000 }).toBe(n); };
  // 📷 Snap (My Eating)
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Snap a photo of your food" }).first().click();
  await page.getByTestId("snap-pre").locator('input[type="file"]').setInputFiles(photo); await expectSent(1);
  // Food Checker (My Shop)
  await tab(page, "My Shop"); await page.locator('input[data-share="food"]').setInputFiles(photo); await expectSent(2);
  // Body balance (My Body)
  const d = await getDash(); d.jc.bodyBalance = { optIn: true }; d.jc.measurements = { chest: [{ wk: 1, v: 100 }] }; await putDash(d); await page.reload();
  await tab(page, "My Body"); await page.getByTestId("body-balance").locator('input[type="file"]').setInputFiles([photo, photo]); await expectSent(3);
  // measurement 📷 Snap
  await page.getByRole("button", { name: "Measurements", exact: true }).click();
  await page.getByRole("button", { name: "📋 Log", exact: true }).nth(1).click();
  await page.getByTestId("meas-snap").click(); await page.getByTestId("meas-snap-file").setInputFiles(photo); await expectSent(4);
  // Body Type Photos (Home → My Profile → My Details)
  await tab(page, "Home"); await page.getByRole("button", { name: "▼ My Profile" }).click(); await page.getByRole("button", { name: "My Details" }).click();
  await page.locator('input[data-share="bodytype"]').setInputFiles(photo); await expectSent(5);
  for (const s of sizes) { expect(s.bytes).toBeLessThan(1024 * 1024 * (s.images.length > 1 ? s.images.length : 1)); for (const n of s.images) expect(n).toBeLessThan(1024 * 1024); }
  console.log("ORIGINAL " + photo.buffer.length + " bytes; SENT per request: " + sizes.map((s) => s.bytes).join(", "));
  expect(errors).toEqual([]);
});

test("item 3: Help sends the guide as a cached system prompt (cache_control), the question after it", async ({ page }) => {
  const { errors } = await openApp(page);
  const bodies = [];
  page.on("request", (r) => { if (/api\.anthropic\.com/.test(r.url())) { try { const b = r.postDataJSON(); if (b && b.system) bodies.push(b); } catch {} } });
  await page.getByRole("button", { name: /^Help/ }).first().click();
  await page.locator("#help-input-jc").fill("How do I log a measurement?");
  await page.locator("#help-input-jc").locator("xpath=following::button[1]").click();
  await expect.poll(() => bodies.length).toBe(1);
  const sys = bodies[0].system;
  expect(sys.at(-1).cache_control).toEqual({ type: "ephemeral" });                    // breakpoint on the guide
  expect(sys.at(-1).text).toContain("=== APP GUIDE ===");
  expect(sys.at(-1).text.length).toBeGreaterThan(4 * 1024 * 4);                        // well over the 1,024-token minimum
  expect(JSON.stringify(sys)).not.toContain("How do I log a measurement?");             // the question is after the cached prefix
  expect(bodies[0].messages.at(-1).content).toContain("How do I log a measurement?");
  expect(errors).toEqual([]);
});

test("item 4: the boot/sign-in logo is the small WebP file, same 640px resolution, shown at 220px", async ({ page, request }) => {
  const res = await request.get("brand/app-logo-640.webp");
  expect(res.ok()).toBe(true);
  expect((await res.body()).length).toBeLessThan(60 * 1024);                            // was a 186 KB PNG
  await page.goto("./");
  const img = page.locator('img[alt="Lifecare Companion"]').first();
  await expect(img).toBeVisible();
  const r = await img.evaluate((i) => ({ src: i.currentSrc, nw: i.naturalWidth, w: i.getBoundingClientRect().width }));
  expect(r.src).toMatch(/app-logo-640\.webp$/); expect(r.nw).toBe(640); expect(r.w).toBe(220);
});

test("item 8: the energy ping runs once a day on open; ↻ Refresh still pings", async ({ page }) => {
  const { errors } = await openApp(page);
  const pings = []; page.on("request", (r) => { if (/api\.anthropic\.com/.test(r.url()) && (r.postData() || "").includes('"max_tokens":1,')) pings.push(1); });
  await page.waitForTimeout(1500);
  const NSx = "?ns=life-care-app-64d04-default-rtdb";
  const ce = JSON.parse(await (await fetch("http://127.0.0.1:9000/data/companion_energy.json" + NSx, { headers: { Authorization: "Bearer owner" } })).json());
  expect(ce.lastCheck).toBe(new Date().toISOString().split("T")[0]);                     // the first open today pinged and stamped the day
  pings.length = 0;                                                                      // (the first open's ping may land after openApp returns)
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 }); await page.waitForTimeout(1500);
  expect(pings.length).toBe(0);                                                          // second open today: no ping
  await page.getByRole("button", { name: /Refresh/ }).first().click();
  await expect.poll(() => pings.length).toBe(1);                                         // manual refresh always pings
  expect(errors).toEqual([]);
});

test("item 9 pure: ledger counts per day/feature, energy from the ledger total, feature names", () => {
  const u = { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 5000, cache_creation_input_tokens: 0 };
  expect(costOf(u, "claude-sonnet-4-6")).toBeCloseTo((1000 * 3 + 5000 * 0.3 + 200 * 15) / 1e6, 9);
  let L = addToLedger(null, u, "claude-sonnet-4-6", "Help", new Date(2026, 10, 12));
  L = addToLedger(L, u, "claude-sonnet-4-6", "Help", new Date(2026, 10, 12));
  L = addToLedger(L, { input_tokens: 10, output_tokens: 5 }, "claude-sonnet-4-6", "My Eating (photo)", new Date(2026, 10, 12));
  expect(L.days["2026-11-12"].Help).toMatchObject({ n: 2, in: 2000, out: 400, cr: 10000 });
  expect(L.total.n).toBe(3);
  const old = addToLedger(L, u, "claude-sonnet-4-6", "Help", new Date(2027, 3, 1));        // >120 days later: old days dropped
  expect(Object.keys(old.days)).toEqual(["2027-04-01"]);
  // energy: an old record (spent 1.00 of 5) keeps its spend AND counts this call (0.25), then follows the ledger
  let e = energyFromLedger({ initial: 5, spent: 1 }, 3, 2.75);
  expect(e).toMatchObject({ ledgerAtCalibration: 1.75, spent: 1.25, pct: 75 });
  e = energyFromLedger(e, 3.5, 3); expect(e).toMatchObject({ spent: 1.75, pct: 65 });
  expect(featureOf('{"system":[{"text":"=== APP GUIDE ==="}]}', { section: "meals" })).toBe("Help");
  expect(featureOf('{"messages":[{"content":[{"type":"image"}]}]}', { section: "meals" })).toBe("My Eating (photo)");
  expect(featureOf("{}", { section: "weights", chatOpen: true })).toBe("Chat");
  expect(summarise(L, 14).byFeature[0].feature).toBe("Help");
});

test("item 9: a mocked AI reply's token counts are recorded (counts only) and drive Companion Energy; admin sees AI usage, Becks doesn't", async ({ page }) => {
  const { errors } = await openApp(page);
  const NSx = "?ns=life-care-app-64d04-default-rtdb"; const get = async (k) => { const v = await (await fetch("http://127.0.0.1:9000/data/" + k + ".json" + NSx, { headers: { Authorization: "Bearer owner" } })).json(); return v == null ? null : JSON.parse(v); };
  await page.waitForTimeout(1500);
  const before = await get("companion_energy");
  await page.route("https://api.anthropic.com/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: "Go to My Body → Measurements." }], stop_reason: "end_turn", usage: { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 12000, cache_creation_input_tokens: 0 } }) }));
  await page.getByRole("button", { name: /^Help/ }).first().click();
  await page.locator("#help-input-jc").fill("Where is my secret question text?");
  await page.locator("#help-input-jc").locator("xpath=following::button[1]").click();
  await expect.poll(async () => { const L = await get("ai_usage"); return L && L.total && L.total.n; }).toBe(1);
  const L = await get("ai_usage"); const day = Object.keys(L.days)[0];
  expect(L.days[day].Help).toEqual({ n: 1, in: 1000, out: 200, cw: 0, cr: 12000, cost: 0.0096 });
  expect(JSON.stringify(L)).not.toContain("secret question");                              // counts only, no content
  const after = await get("companion_energy");
  expect(after.spent - (before.spent || 0)).toBeCloseTo(0.0096, 6);
  expect(after.ledgerAtCalibration).toBeDefined();
  await page.keyboard.press("Escape").catch(() => {});
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.locator("button").nth(1).click();                                           // Settings gear
  const card = page.getByTestId("ai-usage"); await card.getByRole("button", { name: /AI usage/ }).click();
  await expect(card.getByTestId("ai-usage-total")).toHaveText("All recorded: 1 calls · $0.010");
  await expect(card.getByTestId("ai-usage-features")).toContainText("Help");
  await page.getByRole("button", { name: "Becks", exact: true }).first().click();
  await expect(page.getByTestId("ai-usage")).toHaveCount(0);
  expect(errors).toEqual([]);
});

// ── item 10: tracker ──
const trackerAll = async () => (await (await fetch("http://127.0.0.1:9000/data/tracker.json?ns=life-care-app-64d04-default-rtdb", { headers: { Authorization: "Bearer owner" } })).json()) || {};
const clearTracker = () => fetch("http://127.0.0.1:9000/data/tracker.json?ns=life-care-app-64d04-default-rtdb", { method: "DELETE", headers: { Authorization: "Bearer owner" } });
const openTracker = async (page) => { await page.locator("button").nth(1).click(); const t = page.getByTestId("tracker"); await t.getByRole("button", { name: /📝 Tracker/ }).click(); return t; };

test("item 10: Send Feedback also saves a Feedback/New tracker entry (masked account, no images); the email still opens", async ({ page }) => {
  const { errors } = await openApp(page); await clearTracker();
  await page.evaluate(() => { window._mailto = []; window.open = (u) => { window._mailto.push(String(u)); return null; }; });
  await page.getByRole("button", { name: "💬 Send Feedback" }).click();
  await page.getByRole("button", { name: "✨ Feature" }).click();
  await page.getByPlaceholder(/Describe the feature/).fill("Please add a water tracker");
  await page.getByRole("button", { name: "Send Feedback", exact: true }).click();
  await expect.poll(async () => Object.keys(await trackerAll()).length).toBe(1);
  const e = Object.values(await trackerAll())[0];
  expect(e).toMatchObject({ category: "Feedback", status: "New", kind: "feature", person: "jc", text: "Please add a water tracker", env: "prod", source: "feedback" });
  expect(e.version).toMatch(/^v2\.14\.0/); expect(e.created).toMatch(/^\d{4}-\d\d-\d\dT/);
  expect(e.account).toMatch(/^.\*\*\*@.\*\*\*\..+$/);                                    // masked, never the address
  expect(await page.evaluate(() => window._mailto.length)).toBe(1);                       // existing email behaviour kept
  expect(errors).toEqual([]);
});

test("item 10: admin re-categorises Feedback → Defect with status, priority, note and ref; adds a Feature directly; filters; New badge", async ({ page }) => {
  const { errors } = await openApp(page); await clearTracker();
  page.on("dialog", (d) => d.accept());
  await fetch("http://127.0.0.1:9000/data/tracker/t1.json?ns=life-care-app-64d04-default-rtdb", { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify({ id: "t1", created: "2026-11-11T20:00:00.000Z", updated: "2026-11-11T20:00:00.000Z", version: "v2.13.4", env: "beta", account: "j***@g***.com", person: "becks", kind: "bug", text: "Reduce pill appears after editing an old week", category: "Feedback", status: "New", priority: "", note: "", ref: "", source: "feedback" }) });
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.setViewportSize({ width: 360, height: 800 });
  const t = await openTracker(page);
  await expect(t.getByTestId("tracker-new-badge")).toHaveText("1 new");
  await t.getByRole("button", { name: "Open Feedback t1" }).click();
  const form = t.getByTestId("tracker-open-form");
  await expect(form.getByTestId("open-form-mode")).toHaveText("Viewing");
  await expect(form.getByRole("button")).toHaveText(["Edit", "Remove", "Close"]);
  await form.getByRole("button", { name: "Edit", exact: true }).click();
  await form.getByLabel("Category").selectOption("Defect");
  await form.getByLabel("Status").selectOption("In progress");
  await form.getByLabel("Priority").selectOption("High");
  await form.getByLabel("Admin note").fill("Recalculated status on delete");
  await form.getByLabel("Link or ref").fill("D20");
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(form.getByTestId("open-form-msg")).toHaveText("✓ Saved");
  expect((await trackerAll()).t1).toMatchObject({ category: "Defect", status: "In progress", priority: "High", note: "Recalculated status on delete", ref: "D20", text: "Reduce pill appears after editing an old week" });
  await expect(t.getByTestId("tracker-new-badge")).toHaveCount(0);
  await form.getByRole("button", { name: "Close", exact: true }).click();
  // add a Feature directly
  await t.getByRole("button", { name: "+ Add" }).click();
  const add = t.getByTestId("tracker-add-form");
  await add.getByLabel("Category").selectOption("Feature");
  await add.getByLabel("Text").fill("Weekly email summary");
  await add.getByLabel("Priority").selectOption("Low");
  await add.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => Object.values(await trackerAll()).filter((e) => e.category === "Feature").length).toBe(1);
  expect(Object.values(await trackerAll()).find((e) => e.category === "Feature")).toMatchObject({ text: "Weekly email summary", status: "New", priority: "Low", source: "admin" });
  await expect(t.getByTestId("tracker-row")).toHaveCount(2);
  await t.getByLabel("Filter category").selectOption("Defect");
  await expect(t.getByTestId("tracker-row")).toHaveCount(1);
  await t.getByLabel("Filter category").selectOption("All"); await t.getByLabel("Filter status").selectOption("New");
  await expect(t.getByTestId("tracker-row")).toHaveText([/Feature.*New.*Weekly email summary/]);
  // Remove (deep orange, confirm)
  await t.getByLabel("Filter status").selectOption("All");
  await t.getByRole("button", { name: "Open Defect t1" }).click();
  await expect(t.getByTestId("tracker-open-form").getByRole("button", { name: "Remove" })).toHaveAttribute("data-kind", "remove");
  await t.getByTestId("tracker-open-form").getByRole("button", { name: "Remove" }).click();
  await expect.poll(async () => Object.keys(await trackerAll()).length).toBe(1);
  expect(errors).toEqual([]);
});

test("item 10: a non-admin (Becks selected) can't see the tracker", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.getByRole("button", { name: "Becks", exact: true }).first().click();
  await page.locator("button").nth(1).click();
  await expect(page.getByText("🎨 My Colour Theme")).toBeVisible();
  await expect(page.getByTestId("tracker")).toHaveCount(0);
  expect(errors).toEqual([]);
});
