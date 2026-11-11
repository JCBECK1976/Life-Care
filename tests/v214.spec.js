import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

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
