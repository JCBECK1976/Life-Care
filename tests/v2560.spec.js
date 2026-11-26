import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.56.0 (Architect night batch 25 Nov, PART 5): no "AI" in user-facing words. Allowed (marked data-ai-ok): onboarding
// consent, Settings → Privacy & your data, the Privacy Policy / Terms / Intended Use, Help's data & privacy section, and
// admin-only screens.
const scan = (page) => page.evaluate(() => {
  const hits = [];
  const walk = (n) => {
    if (n.nodeType === 1) { if (n.closest && n.closest("[data-ai-ok]")) return; const st = getComputedStyle(n); if (st.display === "none" || st.visibility === "hidden") return; }
    if (n.nodeType === 3 && /\bAI\b/.test(n.nodeValue)) hits.push(n.nodeValue.trim().slice(0, 120));
    for (const c of n.childNodes) walk(c);
  };
  walk(document.body);
  for (const el of document.querySelectorAll("input[placeholder], textarea[placeholder], [aria-label], [title]")) {
    if (el.closest("[data-ai-ok]")) continue;
    for (const a of ["placeholder", "aria-label", "title"]) { const v = el.getAttribute(a); if (v && /\bAI\b/.test(v)) hits.push(a + ": " + v.slice(0, 120)); }
  }
  return hits;
});

test("no 'AI' on user screens (Home, Body, Exercise + Log, Eating day/week/Update Lists, Shop, Health, Settings, Help)", async ({ page }) => {
  test.setTimeout(120000);
  await openApp(page);
  const found = [];
  const look = async (where) => { for (const h of await scan(page)) found.push(where + " → " + h); };
  for (const t of ["Home", "My Body", "My Exercise", "My Eating", "My Shop", "My Health"]) {
    await tab(page, t); await page.waitForTimeout(300); await look(t);
  }
  await tab(page, "Home"); await page.getByRole("button", { name: "▼ My Profile" }).click(); await look("My Profile");
  for (const st of ["My Details", "My Health"]) { const b = page.getByRole("button", { name: st, exact: true }); if (await b.count()) { await b.first().click(); await look("My Profile → " + st); } }
  await tab(page, "My Exercise"); await page.getByRole("button", { name: /^Sun( \d+)?$/ }).first().click(); await look("Exercise Sunday");
  const lg = page.getByRole("button", { name: "📋 Log", exact: true }); if (await lg.count()) { await lg.first().click(); await look("Exercise Log"); }
  await tab(page, "My Eating"); await page.getByRole("button", { name: "Update Eating Lists" }).click(); await look("Update Eating Lists");
  await page.getByRole("button", { name: "Week", exact: true }).first().click(); await look("Eating week");
  await page.evaluate(() => window._lcGo("admin")); await page.waitForTimeout(300); await look("Settings");
  await page.getByRole("button", { name: /help/i }).first().click();
  await page.getByTestId("help-how").locator(":scope > summary").click();
  for (const s of await page.getByTestId("hiw-section").all()) await s.locator("summary").click();
  await look("Help guide");
  for (const q of ["energy", "companion", "feedback", "photo", "rating", "plan"]) { await page.locator("#help-faq-search").fill(q); await page.waitForTimeout(150); await look("Help FAQ '" + q + "'"); }
  expect(found).toEqual([]);
});
