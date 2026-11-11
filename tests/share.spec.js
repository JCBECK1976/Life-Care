import { test, expect } from "@playwright/test";
import { openApp, gotoSignedIn, tab } from "./helpers.js";

// v2.11.0 F8: "Share to Lifecare Companion" (Android Web Share Target). A real-device check is left for JC.
const BASE = "/Life-Care/";
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const aiJson = (obj) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: JSON.stringify(obj) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }) });

// Share an image the way Android does: a multipart POST to the share-target URL, answered by the service worker.
async function shareImage(page) {
  await page.evaluate(async (base) => { await navigator.serviceWorker.register(base + "sw.js", { scope: base }); await navigator.serviceWorker.ready; }, BASE);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  return page.evaluate(async ([base, b64]) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const fd = new FormData(); fd.append("images", new File([bytes], "scale.png", { type: "image/png" }));
    const r = await fetch(base + "share-target", { method: "POST", body: fd });
    const keys = await (await caches.open("lc-share")).keys();
    return { url: r.url, redirected: r.redirected, stored: keys.length };
  }, [BASE, PNG_B64]);
}

test("manifest: share_target for images, POSTed to this environment's own share-target URL", async ({ request }) => {
  const m = await (await request.get("manifest.webmanifest")).json();
  expect(m.share_target).toEqual({ action: BASE + "share-target", method: "POST", enctype: "multipart/form-data", params: { title: "title", text: "text", files: [{ name: "images", accept: ["image/*"] }] } });
});

test("service worker: the share POST is stored on the device and redirects to the app", async ({ page }) => {
  const { errors } = await openApp(page);
  const res = await shareImage(page);
  expect(res.stored).toBe(1);
  expect(res.url).toMatch(/\/Life-Care\/\?share=1$/);
  expect(errors).toEqual([]);
});

test("picker: 'What is this?' → Food hands the image to the Food Checker, then the stored copy is deleted", async ({ page }) => {
  const { errors } = await openApp(page);
  const sent = [];
  await page.route("https://api.anthropic.com/**", (r) => { const t = r.request().postData() || ""; if (!/Identify this food or product/.test(t)) return r.fallback(); sent.push(JSON.parse(t)); return r.fulfill(aiJson({ name: "Shared Snack Bar", assumed: "40g bar", kcal: 180, protein: 4, fat: 8, satFat: 3, rating: "AMBER", itemType: "packaged" })); });
  await shareImage(page);
  await page.goto("./?share=1");
  await expect(page.getByTestId("share-picker")).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("share-picker")).toContainText("1 image shared with Lifecare Companion");
  await page.getByRole("button", { name: /🍽 Food/ }).click();
  await expect(page.getByTestId("checker-assumed")).toHaveText("Assumed: 40g bar — 180 kcal");
  expect(sent[0].messages[0].content[0]).toMatchObject({ type: "image", source: { media_type: "image/png" } });
  await expect(page.getByTestId("share-picker")).toHaveCount(0);
  expect(await page.evaluate(async () => (await (await caches.open("lc-share")).keys()).length)).toBe(0);
  expect(new URL(page.url()).search).toBe("");
  expect(errors).toEqual([]);
});

test("the shared image is kept until signed in; Later keeps it; Progress photo goes to the Body balance check; Discard deletes", async ({ page }) => {
  const { errors } = await openApp(page);
  await shareImage(page);
  await expect(page.getByTestId("share-picker")).toBeVisible({ timeout: 20000 });  // a pending share shows on any signed-in load
  await page.getByRole("button", { name: "Later (keep it)" }).click();
  await page.locator("button").nth(1).click();                                     // Settings → Sign out
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await expect(page.getByTestId("sign-in")).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("share-picker")).toHaveCount(0);                     // not shown before sign-in
  await gotoSignedIn(page);                                                          // signs in from the sign-in screen
  await expect(page.getByTestId("share-picker")).toBeVisible({ timeout: 20000 });  // nothing lost while signed out
  await page.getByRole("button", { name: "Later (keep it)" }).click();
  await expect(page.getByTestId("share-picker")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("share-picker")).toBeVisible({ timeout: 20000 });  // still there next time
  // v2.12.0: Progress photo is back and routes into the Body balance check (opted in here)
  const NSX = "?ns=life-care-app-64d04-default-rtdb"; const dk = "http://127.0.0.1:9000/data/dashboard:data.json" + NSX;
  const dash = JSON.parse(await (await fetch(dk, { headers: { Authorization: "Bearer owner" } })).json()); dash.jc.bodyBalance = { optIn: true };
  await fetch(dk, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(dash)) });
  await page.reload();
  await expect(page.getByTestId("share-picker")).toBeVisible({ timeout: 20000 });
  const calls = [];
  const REG = ["upperChest","lowerChest","shoulders","shoulderWaist","armsLR","back","core","glutes","quads","calves"];
  await page.route("https://api.anthropic.com/**", (r) => { const t = r.request().postData() || ""; if (!/assessing body BALANCE/.test(t)) return r.fallback(); calls.push(t); return r.fulfill(aiJson({ poses: ["front"], scores: Object.fromEntries(REG.map((k) => [k, { score: 3, note: "ok" }])), changes: [], flags: [], summary: "Even." })); });
  await page.getByRole("button", { name: /📸 Progress photo/ }).click();
  await expect(page.getByTestId("bb-msg")).toHaveText("✓ Checked front. Photos were not saved.");
  expect(calls.length).toBe(1);
  await expect(page.getByTestId("share-picker")).toHaveCount(0);
  expect(await page.evaluate(async () => (await (await caches.open("lc-share")).keys()).length)).toBe(0);
  await shareImage(page);
  await page.goto("./?share=1");
  await page.getByRole("button", { name: "Discard" }).click();
  expect(await page.evaluate(async () => (await (await caches.open("lc-share")).keys()).length)).toBe(0);
  expect(errors.filter((e) => !/body|JSON/i.test(e))).toEqual([]);
});
