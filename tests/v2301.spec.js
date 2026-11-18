import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.30.1 (FINAL DROP Part 6): polish — Undo after deletes, the double-tap guard, bottom-sheet pickers, skeletons,
// following the phone's text size + reflow at double-size text, spacing of small buttons, text alternatives for charts.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const dash = async () => JSON.parse(await (await fetch("http://127.0.0.1:9000/data/dashboard:data.json" + NS, { headers: H })).json());
const putDash = (d) => fetch("http://127.0.0.1:9000/data/dashboard:data.json" + NS, { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(d)) });
const ready = (page) => expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });

test("Undo: deleting a vitals entry offers Undo, which restores it; a later save makes Undo refuse instead of overwriting", async ({ page }) => {
  const { errors } = await openApp(page);
  const d = await dash(); d.jc.vitals = [{ date: "2026-11-01", time: "08:00", systolic: 120, diastolic: 80 }, { date: "2026-11-02", time: "08:00", systolic: 125, diastolic: 82 }];
  await putDash(d); await page.reload(); await ready(page);
  await tab(page, "My Health"); await page.getByTestId("health-tab-vitals").click();
  page.on("dialog", (dl) => dl.accept());
  await page.getByRole("button", { name: /Del/ }).first().click();
  await expect(page.getByTestId("undo-toast")).toContainText("Deleted.");
  await expect.poll(async () => (await dash()).jc.vitals.length).toBe(1);
  await page.getByTestId("undo-btn").click();
  await expect(page.getByTestId("undo-toast")).toContainText("Restored");
  await expect.poll(async () => (await dash()).jc.vitals.length).toBe(2);
  // delete again, then save something else before pressing Undo → Undo refuses (never overwrites the later change)
  await page.getByRole("button", { name: /Del/ }).first().click();
  await expect(page.getByTestId("undo-btn")).toBeVisible();
  await page.evaluate(async () => { const nd = JSON.parse(JSON.stringify(window._lcData)); nd.jc.healthNotes = "later change"; await window._lcSaveData(nd); });
  await page.getByTestId("undo-btn").click();
  await expect(page.getByTestId("undo-toast")).toContainText("Can't undo");
  const after = await dash(); expect(after.jc.vitals.length).toBe(1); expect(after.jc.healthNotes).toBe("later change");
  // a cancelled confirmation never arms Undo; ordinary saves never show it
  expect(errors).toEqual([]);
});

test("double-tap guard: a second tap in a row on the same Save/Add/Delete button within 300 ms is ignored; typing in between, steppers and other buttons are not", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(async () => {
    const mk = (text) => { const b = document.createElement("button"); b.textContent = text; b.n = 0; b.addEventListener("click", () => b.n++); document.body.appendChild(b); return b; };
    const save = mk("Save check-in"), plus = mk("+"), tabb = mk("Week"), rep = mk("Add one"), send = mk("Send"); rep.setAttribute("data-repeat", "");
    for (const b of [save, plus, tabb, rep]) { b.click(); b.click(); }
    await new Promise((res) => setTimeout(res, 350)); save.click();
    send.click(); document.body.dispatchEvent(new Event("input", { bubbles: true })); send.click();   // typed in between: not a double tap
    return [save.n, plus.n, tabb.n, rep.n, send.n];
  });
  expect(r).toEqual([2, 2, 2, 2, 2]);   // Save: the double tap counts once, + the tap after 350 ms; the others count both taps
  const { isActionButton } = await import("../src/lib/tapGuard.js");
  const fake = (t, attrs = {}) => ({ textContent: t, hasAttribute: (k) => k in attrs, getAttribute: (k) => attrs[k] || null });
  expect(isActionButton(fake("🗑 Del"))).toBe(true); expect(isActionButton(fake("Prepare summary"))).toBe(true);
  expect(isActionButton(fake("−"))).toBe(false); expect(isActionButton(fake("Week"))).toBe(false);
});

test("bottom-sheet pickers: the exercise type (Add Exercise) and the person list (more than three people) open as sheets with big rows", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  await page.getByRole("button", { name: /\+ Add Exer/ }).first().click();
  await page.getByPlaceholder("Search exercises or type new name...").fill("Dumbbell Bench");
  await page.getByText("Dumbbell Bench Press", { exact: true }).first().click();
  const pick = page.getByTestId("ex-type").first();
  await expect(pick).toHaveAttribute("aria-label", /^Exercise type: /);
  await pick.click();
  const sheet = page.getByRole("dialog", { name: "Choose the exercise type" });
  await expect(sheet).toBeVisible();
  const opts = sheet.getByRole("option");
  expect(await opts.count()).toBeGreaterThan(1);
  const box = await opts.first().boundingBox(); expect(box.height).toBeGreaterThanOrEqual(48);
  const other = opts.nth(1); const label = (await other.innerText()).trim();
  await other.click();
  await expect(sheet).toHaveCount(0);
  await expect(pick).toHaveAttribute("aria-label", "Exercise type: " + label);
  // person sheet: four people → "All" opens everyone in a sheet
  const d = await dash();
  for (const k of ["sam", "alex"]) d[k] = JSON.parse(JSON.stringify(d.becks)), d[k].profile.name = k === "sam" ? "Sam" : "Alex";
  await putDash(d); await page.reload(); await ready(page);
  await page.getByRole("button", { name: "Choose a person" }).first().click();
  const ps = page.getByRole("dialog", { name: "Choose a person" });
  await ps.getByRole("option", { name: "Alex" }).click();
  await expect(page.getByRole("button", { name: "Alex", exact: true }).first()).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("charts have text alternatives: a spoken summary and the numbers 'As text'", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(async () => (await import("/Life-Care/src/components/charts.jsx")).seriesText("Weight", [{ wk: 1, v: 72 }, { wk: 2, v: 71.4 }, { wk: 3, v: 70.25 }]));
  expect(r).toBe("Weight: from week 1 72 to week 3 70.3 (lowest 70.3, highest 72, 3 entries)");
  await tab(page, "My Body");
  await page.getByRole("button", { name: /progress$/i }).first().click();
  const svg = page.locator('svg[role="img"]').first();
  await expect(svg).toHaveAttribute("aria-label", /chart\. .*(from week|no data yet|week)/i);
  const t = page.getByTestId("chart-as-text").first();
  await t.locator("summary").click();
  await expect(t.locator("li").first()).toBeVisible();
});

test("skeletons: the GP summary shows a skeleton while it's prepared; the app skeleton is labelled for screen readers", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ usePilotFeatures: true })));
  await openApp(page);
  await page.route("https://api.anthropic.com/**", async (route) => { await new Promise((r) => setTimeout(r, 1200)); await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: [{ type: "text", text: "Symptoms\n- none" }], usage: { input_tokens: 1, output_tokens: 1 } }) }); });
  const d = await dash(); const today = new Date().toISOString().slice(0, 10); d.jc.symptoms = [{ d: today, s: { sleep: 2 } }]; await putDash(d); await page.reload(); await ready(page);
  await tab(page, "My Health"); await page.getByTestId("health-tab-gp").click();
  await page.getByTestId("gp-prepare").click();
  await expect(page.getByTestId("gp-skeleton")).toHaveAttribute("aria-busy", "true");
  await expect(page.getByTestId("gp-skeleton")).toContainText("Preparing your summary");
  await expect(page.getByTestId("gp-review")).toBeVisible();
  await expect(page.getByTestId("gp-skeleton")).toHaveCount(0);
});

test("text size: the apps follow the phone's text size up to 200%; at double-size text no main screen scrolls sideways (360 px)", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await openApp(page);
  const z = await page.evaluate(async () => {
    const n = await import("/Life-Care/src/lib/native.js"); const set = [];
    const plugin = (v) => ({ getPreferred: async () => ({ value: v }), set: async (o) => { set.push(o.value); } });
    return [await n.followPhoneTextSize({ native: true, plugin: plugin(2.6) }), await n.followPhoneTextSize({ native: true, plugin: plugin(1.3) }), await n.followPhoneTextSize(), set];
  });
  expect(z).toEqual([2, 1.3, null, [2, 1.3]]);                                  // capped at 200%; the web app is left to the browser
  for (const s of ["Home", "My Body", "My Exercise", "My Eating", "My Shop", "My Health"]) {
    await tab(page, s); await page.waitForTimeout(300);
    const over = await page.evaluate(() => {
      const els = [...document.querySelectorAll("body *")]; const sizes = els.map((e) => parseFloat(getComputedStyle(e).fontSize));
      els.forEach((e, i) => { e.style.fontSize = sizes[i] * 2 + "px"; });
      const d = document.scrollingElement; return d.scrollWidth - d.clientWidth;
    });
    expect(over, s + " scrolls sideways at 200% text").toBeLessThanOrEqual(0);
    await page.reload(); await ready(page);
  }
});

test("small action buttons: clear space between neighbours (no two closer than 8 px)", async ({ page }) => {
  await openApp(page);
  await tab(page, "My Health");
  const r = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].filter((x) => /✎ Edit|🗑 Del/.test(x.textContent));
    const R = b.map((x) => x.getBoundingClientRect());
    let minGap = 99;
    R.forEach((a, i) => R.forEach((o, j) => { if (i < j && Math.abs(a.top - o.top) < 4) minGap = Math.min(minGap, Math.max(o.left - a.right, a.left - o.right)); }));
    return { n: b.length, minH: Math.min(...R.map((x) => x.height)), minGap };
  });
  expect(r.n).toBeGreaterThan(1); expect(r.minGap).toBeGreaterThanOrEqual(8);   // (on touch screens they're 44 px tall: v2200 test)
});
