import { expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { mockAnthropic } from "./mock-ai.js";

export { mockAnthropic };

export function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

// Re-seed the emulator, then open the app with AI and Open Food Facts mocked; wait until data has loaded.
// v2.6.0: fake Google accounts in the Auth emulator. test-uid-jc is the UID the emulator's rules allow.
const AUTH = "http://127.0.0.1:9099";
export const USERS = {
  jc: { uid: "test-uid-jc", email: "jc-test@example.com", password: "test-password" },
  other: { uid: "test-uid-other", email: "other-test@example.com", password: "test-password" },
  // v2.21.1: an ordinary (non-admin) account the emulator rules allow — used to test Delete my account
  member: { uid: "test-uid-member", email: "member-test@example.com", password: "test-password" },
};
export async function ensureUser(who) {
  const u = USERS[who];
  await fetch(AUTH + "/identitytoolkit.googleapis.com/v1/projects/life-care-app-64d04/accounts", {
    method: "POST", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ localId: u.uid, email: u.email, password: u.password }),
  }); // already existing is fine
}
export async function idToken(who) {
  await ensureUser(who);
  const u = USERS[who];
  const r = await fetch(AUTH + "/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, password: u.password, returnSecureToken: true }),
  });
  return (await r.json()).idToken;
}
// Open the app and sign in (as JC's account by default).
export async function gotoSignedIn(page, who = "jc") {
  await ensureUser(who);
  await page.goto("./");
  await page.waitForFunction(() => typeof window.__lcTestSignIn === "function");
  await page.getByTestId("sign-in").waitFor({ timeout: 20000 });
  const u = USERS[who];
  await page.evaluate(([e, pw]) => window.__lcTestSignIn(e, pw), [u.email, u.password]);
}

export async function openApp(page, who = "jc") {
  execSync("node scripts/seed-emulator.mjs", { stdio: "ignore" }); // fresh data for every test
  const errors = collectErrors(page);
  const aiCalls = await mockAnthropic(page);
  await page.route(/\/plan\.json(\?|$)/, (r) => r.fulfill({ status: 404, body: "" }));   // v2.15.0: tests that need a plan mock it
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"products":[]}' }));
  await gotoSignedIn(page, who);
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.waitForFunction(() => window._lcLinkedFeedback !== undefined, null, { timeout: 5000 }).catch(() => {});   // v2.37.0: the one-time feedback link has been saved
  return { errors, aiCalls };
}

export const tab = (page, name) => page.getByRole("button", { name, exact: true }).first().click();
export const person = (page, name) => page.getByRole("button", { name, exact: true }).first().click();
/* v2.34.0: Progress buttons are announced with what they open ("Weight progress", "Close Weight progress"). */
export const PROGRESS = /^(?!Close ).+ progress$/;
export const CLOSE_PROGRESS = /^Close .+ progress$/;

/* v2.36.0: WCAG 2.2 AA 2.5.8 Target Size (Minimum) — returns the targets that fail (tests/v2360.spec.js). */
export async function targetSize258(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=option]")]
      .filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && !e.closest("[inert]"); })
      .filter((e) => !(e.tagName === "A" && e.closest("p, li, span") && !e.closest("button")))   // inline links in a sentence are exempt
      .filter((e) => getComputedStyle(e).position !== "fixed");   // the floating Chat button sits over the page; where depends on scrolling (WCAG 2.4.11: the page has room under it)
    const t = els.map((e) => { const r = e.getBoundingClientRect(); return { e, r, cx: r.left + r.width / 2, cy: r.top + r.height / 2, small: r.width < 24 || r.height < 24 }; });
    const hitsRect = (c, r) => { const dx = Math.max(r.left - c.cx, 0, c.cx - r.right), dy = Math.max(r.top - c.cy, 0, c.cy - r.bottom); return dx * dx + dy * dy < 144; };
    const bad = [];
    t.forEach((a, i) => { if (!a.small) return;
      const clash = t.find((b, j) => j !== i && !a.e.contains(b.e) && !b.e.contains(a.e) && (hitsRect(a, b.r) || (b.small && Math.hypot(a.cx - b.cx, a.cy - b.cy) < 24)));
      if (clash) bad.push((a.e.getAttribute("aria-label") || a.e.innerText || a.e.tagName).trim().slice(0, 24) + " " + Math.round(a.r.width) + "×" + Math.round(a.r.height) + " ↔ " + (clash.e.getAttribute("aria-label") || clash.e.innerText || clash.e.tagName).trim().slice(0, 24)); });
    return bad;
  });
}

/* v2.37.2: measurement photos, the Full Body row and Body Balance are hidden unless the device switch useBodyPhotos is on;
   tests of those features turn it on (merged into any other switches set before it). */
export async function withBodyPhotos(page) {
  await page.addInitScript(() => { try { const f = JSON.parse(localStorage.getItem("lc_flags") || "{}"); f.useBodyPhotos = true; localStorage.setItem("lc_flags", JSON.stringify(f)); } catch (e) { /* private mode */ } });
}
