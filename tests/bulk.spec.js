import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.6.3 bulk upload: D4 category must be chosen, D3 batches + retry, D5 Cancel really cancels, F4 OK message + "Check me".
const NS = "?ns=life-care-app-64d04-default-rtdb";
const getKey = async (k) => { const v = await (await fetch("http://127.0.0.1:9000/data/" + k + ".json" + NS, { headers: { Authorization: "Bearer owner" } })).json(); return v == null ? null : JSON.parse(v); };
const reply = (text, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(status === 200
  ? { id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }
  : { type: "error", error: { type: "api_error", message: "Overloaded" } }) });
const linesOf = (prompt) => (prompt.split("Items to look up:\n")[1] || "").split("\n\nReturn")[0].split("\n").filter(Boolean);
const itemsFor = (lines) => JSON.stringify(lines.map((n) => ({ name: n, kcal: 100, protein: 2, fat: 1, satFat: 0.5, carbs: 10, fibre: 1, salt: 0.1, rating: "GREAT", itemType: "packaged", ingredients: [] })));

async function openBulk(page) {
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByRole("button", { name: "+ Add New Item to Lists" }).click();
  await page.getByRole("button", { name: "📋 Bulk" }).click();
  return page.locator("div", { has: page.locator("#bulk-paste-textarea") }).filter({ has: page.getByRole("button", { name: "Cancel" }) }).last();
}

test("D4 + F4: no category is pre-selected; confirm names the category; OK message; Check me until opened and saved", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.route("https://api.anthropic.com/**", (r) => /Items to look up/.test(r.request().postData() || "") ? r.fulfill(reply(itemsFor(linesOf(r.request().postDataJSON().messages[0].content)))) : r.fallback());
  const dialogs = []; page.on("dialog", (d) => { dialogs.push(d.message()); d.accept(); });
  let bulk = await openBulk(page);
  await bulk.getByRole("button", { name: /^snack$/i }).click();               // pick one, then close and reopen
  await bulk.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "📋 Bulk" }).click();
  bulk = page.locator("div", { has: page.locator("#bulk-paste-textarea") }).filter({ has: page.getByRole("button", { name: "Cancel" }) }).last();
  await page.locator("#bulk-paste-textarea").fill("Test Cola\nTest Juice");
  await expect(bulk.getByRole("button", { name: "Choose a category first" })).toBeDisabled();
  await bulk.getByRole("button", { name: /^drink$/i }).click();
  await bulk.getByRole("button", { name: "Upload Items" }).click();
  await expect(page.getByTestId("bulk-done")).toHaveText(/2 items added to Drinks\. Ratings are AI estimates\. Open each item and check the weight, portion and ingredients/);
  expect(dialogs).toEqual(["Add 2 items to Drinks?"]);
  await page.getByRole("button", { name: "OK", exact: true }).click();
  const drinks = await getKey("custom_drinks");
  expect(drinks.filter((x) => /^Test (Cola|Juice)$/.test(x.name)).map((x) => x.checkMe)).toEqual([true, true]);
  const row = page.locator("div", { hasText: /^Test Cola/ }).filter({ has: page.getByRole("button", { name: "✎ Update" }) }).last();
  await expect(row.getByTestId("check-me")).toBeVisible();
  await expect(row.locator("span").first()).toHaveCSS("color", "rgb(21, 128, 61)");     // RAG colour kept (GREAT)
  await row.getByRole("button", { name: "✎ Update" }).click();
  await page.getByRole("button", { name: "✓ Confirm" }).click();
  await expect.poll(async () => (await getKey("custom_drinks")).find((x) => x.name === "Test Cola").checkMe).toBeUndefined();
  expect(errors).toEqual([]);
});

test("D3: a long list goes in batches of 10; a failed batch can be retried without losing the others", async ({ page }) => {
  const { errors } = await openApp(page);
  const sizes = []; let failOnce = true;
  await page.route("https://api.anthropic.com/**", (r) => {
    const body = r.request().postData() || "";
    if (!/Items to look up/.test(body)) return r.fallback();
    const lines = linesOf(r.request().postDataJSON().messages[0].content); sizes.push(lines.length);
    if (lines[0] === "Item 11" && failOnce) { failOnce = false; return r.fulfill(reply("", 529)); }
    return r.fulfill(reply(itemsFor(lines)));
  });
  page.on("dialog", (d) => d.accept());
  const bulk = await openBulk(page);
  await page.locator("#bulk-paste-textarea").fill(Array.from({ length: 25 }, (_, i) => "Item " + (i + 1)).join("\n"));
  await bulk.getByRole("button", { name: /^snack$/i }).click();
  await bulk.getByRole("button", { name: "Upload Items" }).click();
  await expect(page.getByText(/15 added to Snacks; 10 items could not be rated/).first()).toBeVisible();
  expect(sizes).toEqual([10, 10, 5]);
  expect((await getKey("custom_snacks")).filter((x) => /^Item \d+$/.test(x.name)).length).toBe(15);
  await bulk.getByRole("button", { name: "Retry 10" }).click();
  await expect(page.getByTestId("bulk-done")).toHaveText(/10 items added to Snacks/);
  expect((await getKey("custom_snacks")).filter((x) => /^Item \d+$/.test(x.name)).length).toBe(25);
  expect(errors).toEqual([]);
});

test("D5: Cancel stops the upload and discards late results; earlier batches can be undone", async ({ page }) => {
  const { errors } = await openApp(page);
  let release; const held = new Promise((res) => { release = res; });
  await page.route("https://api.anthropic.com/**", async (r) => {
    if (!/Items to look up/.test(r.request().postData() || "")) return r.fallback();
    const lines = linesOf(r.request().postDataJSON().messages[0].content);
    if (lines[0] === "Late 11") await held;                                     // batch 2 arrives after Cancel
    return r.fulfill(reply(itemsFor(lines))).catch(() => {});
  });
  page.on("dialog", (d) => d.accept());
  const before = ((await getKey("custom_snacks")) || []).length;
  const bulk = await openBulk(page);
  await page.locator("#bulk-paste-textarea").fill(Array.from({ length: 15 }, (_, i) => "Late " + (i + 1)).join("\n"));
  await bulk.getByRole("button", { name: /^snack$/i }).click();
  await bulk.getByRole("button", { name: "Upload Items" }).click();
  await expect(page.getByText(/Rating 11–15 of 15/).first()).toBeVisible();
  await bulk.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("bulk-cancelled")).toContainText("10 items from earlier batches were kept in Snacks");
  release(); await page.waitForTimeout(500);
  expect((await getKey("custom_snacks")).filter((x) => /^Late /.test(x.name)).length).toBe(10);   // batch 2 discarded
  await page.getByRole("button", { name: "Undo" }).click();
  await expect.poll(async () => (await getKey("custom_snacks")).length).toBe(before);
  await expect(page.getByTestId("bulk-done")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("D5: Cancel during the first batch saves nothing and says so", async ({ page }) => {
  const { errors } = await openApp(page);
  let release; const held = new Promise((res) => { release = res; });
  await page.route("https://api.anthropic.com/**", async (r) => {
    if (!/Items to look up/.test(r.request().postData() || "")) return r.fallback();
    await held; return r.fulfill(reply(itemsFor(linesOf(r.request().postDataJSON().messages[0].content)))).catch(() => {});
  });
  page.on("dialog", (d) => d.accept());
  const before = JSON.stringify(await getKey("custom_snacks"));
  const bulk = await openBulk(page);
  await page.locator("#bulk-paste-textarea").fill("Never 1\nNever 2");
  await bulk.getByRole("button", { name: /^snack$/i }).click();
  await bulk.getByRole("button", { name: "Upload Items" }).click();
  await bulk.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Cancelled — nothing was added").first()).toBeVisible();
  release(); await page.waitForTimeout(500);
  expect(JSON.stringify(await getKey("custom_snacks"))).toBe(before);
  expect(errors).toEqual([]);
});
