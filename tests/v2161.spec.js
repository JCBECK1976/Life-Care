import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { mockReplyFor } from "./mock-ai.js";
import { buildCsp } from "../vite.config.js";

// v2.16.1 SAD-A2: no raw HTML from data, and a Content-Security-Policy on every page.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const getKey = async (k) => { const v = await (await fetch(KEY(k), { headers: { Authorization: "Bearer owner" } })).json(); return v == null ? null : JSON.parse(v); };
const setKey = (k, obj) => fetch(KEY(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(obj)) });
const PAYLOAD = '<img src=x onerror="window.__pwned=1"><script>window.__pwned=2</script><svg onload="window.__pwned=3">';

async function watchCsp(page) {
  await page.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective + " " + e.blockedURI)); });
}

test("CSP: the page carries a strict policy (no unsafe-inline/eval for scripts) and the app runs with no violations", async ({ page }) => {
  await watchCsp(page);
  const { errors } = await openApp(page);
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  const script = csp.split(";").find((d) => d.trim().startsWith("script-src"));
  expect(script).not.toContain("unsafe-inline"); expect(script).not.toContain("unsafe-eval");
  for (const h of ["https://api.anthropic.com", "https://world.openfoodfacts.org", "https://health.googleapis.com", "wss://*.firebasedatabase.app"]) expect(csp).toContain(h);
  expect(csp).toContain("object-src 'none'");
  for (const t of ["My Exercise", "My Eating", "Home"]) { await tab(page, t); await page.waitForTimeout(300); }
  expect(await page.evaluate(() => window.__csp)).toEqual([]);
  expect(errors).toEqual([]);
});

test("CSP builder: production policy has no local hosts; inline scripts allowed only by hash", () => {
  const html = "<head><script>console.log(1)</script><script src=\"/a.js\"></script></head>";
  const prod = buildCsp(html, false);
  expect(prod).not.toContain("127.0.0.1");
  expect(prod).toMatch(/script-src 'self' 'sha256-[A-Za-z0-9+/=]+' https:\/\/accounts\.google\.com/);
  expect(prod.match(/sha256-/g)).toHaveLength(1);
});

test("Injection: script/onerror in an AI reply and in a food name and description do not execute", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.route("https://api.anthropic.com/**", async (route) => {
    let body = null; try { body = route.request().postDataJSON(); } catch {}
    const r = mockReplyFor(body);
    if (r.content[0].text === "Mocked companion reply.") r.content[0].text = "Hello " + PAYLOAD;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(r) });
  });
  // AI reply text (Help)
  await page.getByRole("button", { name: /Help/ }).first().click();
  const box = page.locator("textarea:visible, input[type=text]:visible").last();
  await box.fill("hi"); await box.press("Enter");
  if (!(await page.getByText(/Hello <img/).count())) await page.getByRole("button", { name: /Send|Ask/ }).last().click();
  await expect(page.getByText(/Hello <img src=x onerror/).first()).toBeVisible();   // shown as text
  await page.keyboard.press("Escape").catch(() => {});
  // Food name + description
  const item = { id: "t_xss", name: "Bar " + PAYLOAD, description: "Desc " + PAYLOAD, suitability: PAYLOAD, jcKcal: 200, beckKcal: 200, satFat: 1, addedSugar: 6, rating: "GOOD", ragReason: PAYLOAD };
  await setKey("custom_breakfasts", [item, ...((await getKey("custom_breakfasts")) || [])]); await page.reload();
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await expect(page.getByText(/Bar <img src=x/).first()).toBeVisible();
  await page.getByRole("button", { name: /^Open Bar / }).first().click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  expect(await page.locator("img[src=x], svg[onload]").count()).toBe(0);
  expect(errors).toEqual([]);
});

test("SAD-A6: rules drift compare (comments ignored; differing paths found; nothing printed)", async () => {
  const { parseRules, diffPaths } = await import("../scripts/automation/rules-drift.mjs");
  const a = parseRules('{ /* c */ "rules": { ".read": false, "data": { ".read": "auth != null" } } // x\n}');
  expect(diffPaths(a, JSON.parse(JSON.stringify(a)))).toEqual([]);
  const b = JSON.parse(JSON.stringify(a)); b.rules.data[".read"] = true; b.rules.extra = 1;
  expect(diffPaths(a, b)).toEqual(["/rules/data/.read", "/rules/extra"]);
});

test("SAD-A9: the default seed is synthetic (no real key, made-up people, same shapes)", async () => {
  const { makeFixture, currentWeek } = await import("../scripts/make-fixture.mjs");
  const f = makeFixture(new Date(2026, 10, 14));
  const d = JSON.parse(f["dashboard:data"]);
  expect(f.anthropic_api_key).toBe("dev-placeholder-not-a-real-key");
  expect(Object.keys(d)).toEqual(["config", "jc", "becks"]);
  expect(d.jc.profile.notes).toBe("Synthetic test person.");
  expect(Object.keys(d.jc.exercises)).toEqual(["sunday", "monday", "friday"]);
  expect(Math.max(...d.jc.exercises.sunday[0].prog.map((e) => e.wk))).toBeLessThan(currentWeek(new Date(2026, 10, 14)));
  expect(JSON.parse(f.custom_breakfasts)[0]).toMatchObject({ id: expect.any(String), jcKcal: expect.any(Number), rating: expect.any(String) });
  expect(JSON.stringify(makeFixture(new Date(2026, 10, 14)))).toBe(JSON.stringify(f)); // deterministic
});
