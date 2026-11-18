import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openApp, tab } from "./helpers.js";

// v2.34.0 (Architect, cyber review 18 Nov — native accessibility). The Android app's WebView gives TalkBack the same
// accessibility tree Chromium builds, so this reads that tree (as TalkBack would) on the main flows at 360 px.
// VoiceOver (WebKit) is checked by hand on an iPhone — docs/legal/ACCESSIBILITY.md has the script.
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const EMO = /^[\p{Extended_Pictographic}☀-➿⬀-⯿️‍\s]+/u;
const CONTROLS = ["button", "link", "checkbox", "radio", "textbox", "combobox", "switch", "tab", "spinbutton", "slider"];

async function spoken(page, cdp) {
  await page.waitForTimeout(400);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  const vis = nodes.filter((n) => !n.ignored && n.role);
  const nm = (n) => ((n.name && n.name.value) || "").trim();
  const ctl = vis.filter((n) => CONTROLS.includes(n.role.value));
  return {
    unnamed: ctl.filter((n) => !nm(n)).map((n) => n.role.value),
    emojiOnly: ctl.filter((n) => nm(n) && !nm(n).replace(EMO, "").trim()).map((n) => nm(n)),
    unnamedImages: vis.filter((n) => n.role.value === "image" && !nm(n)).length,
    headings: vis.filter((n) => n.role.value === "heading").map(nm),
    axe: (await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations.map((v) => v.id + " ×" + v.nodes.length),
  };
}

test("what TalkBack hears on the main flows (360 px): every control has a name, no emoji-only names or unnamed images, each tab has headings, axe clean", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useAppLock: true, useWeighIns: true })));
  await page.setViewportSize({ width: 360, height: 780 });
  const { errors } = await openApp(page);
  const cdp = await page.context().newCDPSession(page);
  const screens = [["Home"], ["My Body"], ["My Exercise"], ["My Eating"], ["My Shop"], ["My Health"],
    ["My Body → Record", async () => { await tab(page, "My Body"); await page.getByRole("button", { name: /Record/ }).first().click(); }],
    ["Settings", async () => { await page.getByRole("button", { name: /Settings/ }).first().click(); }]];
  for (const [name, go] of screens) {
    if (go) await go(); else await tab(page, name);
    const r = await spoken(page, cdp);
    expect({ name, ...r, headings: r.headings.length > 0 }).toEqual({ name, unnamed: [], emojiOnly: [], unnamedImages: 0, headings: true, axe: [] });
  }
  expect(errors).toEqual([]);
});

test("the Record form's boxes are announced with their labels (Week, Body Fat %, …); mood buttons say the mood and whether it's chosen", async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole("button", { name: "Mood: Good" })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Mood: Good" }).click();
  await expect(page.getByRole("button", { name: "Mood: Good" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "My Mood" })).toBeVisible();
  await tab(page, "My Body");
  await page.getByRole("button", { name: /Record/ }).first().click();
  await page.getByRole("textbox", { name: "Body Fat %" }).fill("25.1");                      // found by its label
  await expect(page.getByRole("textbox", { name: "Body Fat %" })).toHaveValue("25.1");
  await expect(page.getByRole("spinbutton", { name: "Week" })).toBeVisible();
  const r = await page.evaluate(async () => {                                                // the helper itself
    const m = await import("/Life-Care/src/lib/a11yLabels.js"); const d = document.createElement("div");
    d.innerHTML = '<label>A</label><input id="t1"><label>B</label><input aria-label="kept"><label>C <input></label><label for="x">D</label><input id="x">';
    document.body.appendChild(d); const n = m.linkOrphanLabels(d); const i = d.querySelectorAll("input");
    const out = [n, i[0].getAttribute("aria-labelledby") === d.querySelector("label").id, i[1].getAttribute("aria-labelledby"), i[2].getAttribute("aria-labelledby"), i[3].getAttribute("aria-labelledby")];
    d.remove(); return out;
  });
  expect(r).toEqual([1, true, null, null, null]);                                           // only the unlinked one
});

test("My Body and measurement Progress buttons say which one they open", async ({ page }) => {
  await openApp(page);
  await tab(page, "My Body");
  const w = page.getByRole("button", { name: "Weight progress", exact: true });
  await expect(w).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Body Fat % progress", exact: true })).toBeVisible();
  await w.click();
  await expect(page.getByRole("button", { name: "Close Weight progress" })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Measurements", exact: true }).click();
  const m = page.getByRole("button", { name: / progress$/ }).first();
  expect(await m.getAttribute("aria-label")).toMatch(/^[a-z ]+ progress$/);
});

test("the phone's text size is read again when the app comes back to the front (Android Font size / iPhone Larger Text)", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(async () => {
    const n = await import("/Life-Care/src/lib/native.js"); const set = []; let pref = 1.3;
    const deps = { native: true, plugin: { getPreferred: async () => ({ value: pref }), set: async (o) => { set.push(o.value); } } };
    await n.followPhoneTextSize(deps);
    const stop = n.watchPhoneTextSize(deps);
    pref = 1.8; document.dispatchEvent(new Event("resume")); await new Promise((r) => setTimeout(r, 50));
    pref = 3.1; document.dispatchEvent(new Event("visibilitychange")); await new Promise((r) => setTimeout(r, 50));
    stop(); pref = 1; document.dispatchEvent(new Event("resume")); await new Promise((r) => setTimeout(r, 50));
    return { set, web: typeof n.watchPhoneTextSize()  };
  });
  expect(r).toEqual({ set: [1.3, 1.8, 2], web: "function" });                               // up to 200%; stops when asked
});
