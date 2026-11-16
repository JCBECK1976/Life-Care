import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { mockReplyFor } from "./mock-ai.js";

// v2.16.4: JC's test fixes — Form/Range only in the Open card; F11b Companion feedback visible in Open; share picker person.
const DB = "http://127.0.0.1:9000/data/dashboard:data.json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const readData = async () => JSON.parse(await (await fetch(DB, { headers: H })).json());

async function mockSessionFeedback(page) {
  await page.route("https://api.anthropic.com/**", async (route) => {
    let b = null; try { b = route.request().postDataJSON(); } catch {}
    const prompt = JSON.stringify(b || {});
    const r = mockReplyFor(b);
    if (/reviewing sunday's session/.test(prompt)) {
      const d = await readData();
      r.content[0].text = JSON.stringify({ exercises: d.jc.exercises.sunday.map((e) => ({ name: e.name, verdict: "Verdict for " + e.name, icon: "check", newStatus: "building", recommendation: "Add one rep" })), summary: "Good session.", nextSession: "Same again." });
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(r) });
  });
}

test("F11b: generate session feedback → Open the latest week → Companion feedback + decision visible; Edit changes it", async ({ page }) => {
  const { errors } = await openApp(page);
  await mockSessionFeedback(page);
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  await page.getByRole("button", { name: /My Companion Session Feedback/ }).click();
  const first = (await readData()).jc.exercises.sunday[0];
  await expect.poll(async () => { const e = (await readData()).jc.exercises.sunday[0]; return e.prog.some((x) => x.companion); }, { timeout: 15000 }).toBe(true);
  const wk = Math.max(...first.prog.map((x) => parseInt(x.wk)));
  await page.getByRole("button", { name: "👁 Progress" }).first().click();
  await page.getByRole("button", { name: "Open week " + wk }).click();
  const form = page.getByTestId("prog-open-form");
  await expect(form.getByTestId("entry-companion-verdict")).toHaveText("Verdict for " + first.name);
  await expect(form.getByTestId("entry-companion-decision")).toContainText("No decision yet");
  await form.getByRole("button", { name: "Edit" }).click();
  await form.getByRole("button", { name: "✓ Accept" }).click();
  await form.getByLabel("Note on the feedback").fill("ok for me");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form.getByTestId("entry-companion-decision")).toContainText("✓ Accepted — ok for me");
  expect(errors).toEqual([]);
});

test("share picker: a person toggle (defaults to the current person); choosing Becks switches to her before the upload opens", async ({ page }) => {
  const { errors } = await openApp(page);
  const BASE = "/Life-Care/", PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  await page.evaluate(async (base) => { await navigator.serviceWorker.register(base + "sw.js", { scope: base }); await navigator.serviceWorker.ready; }, BASE);
  await page.reload(); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.evaluate(async ([base, b64]) => { const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append("images", new File([bytes], "scale.png", { type: "image/png" })); await fetch(base + "share-target", { method: "POST", body: fd }); }, [BASE, PNG]);
  await page.reload();
  const picker = page.getByTestId("share-picker");
  await expect(picker).toBeVisible();
  const tabs = picker.getByTestId("share-person-tabs").getByRole("button");
  await expect(tabs.first()).toHaveText("JC");
  await expect(tabs.first()).toHaveAttribute("aria-pressed", "true");
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-pressed", "true");
  await picker.getByRole("button", { name: /Body measurements/ }).click();
  await expect(page.getByTestId("share-picker")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__lcPerson && window.__lcPerson.activeTab)).toBe("becks");
  expect(errors).toEqual([]);
});

test("F11b fallback: feedback stored before v2.16.0 (session feedback for that week) still shows; names matched tolerantly", async () => {
  const { companionFromSession, sameExercise, setCompanionDecision } = await import("../src/lib/exercise.js");
  expect(sameExercise("Face Pull (cable)", "face pull")).toBe(true);
  expect(sameExercise("Leg Press", "Leg Curl")).toBe(false);
  const sf = { jc_sunday: { _feedbackWeek: "16", _generatedAt: "Sat", exercises: [{ name: "face pull", verdict: "V", newStatus: "building", _decision: "declined", _userNote: "sore" }] } };
  expect(companionFromSession(sf, "jc", "sunday", "Face Pull", 16)).toEqual({ verdict: "V", recommendation: "Recommendation: building", at: "Sat", decision: "rejected", decisionNote: "sore" });
  expect(companionFromSession(sf, "jc", "sunday", "Face Pull", 15)).toBe(null);
  const ex = { prog: [{ wk: 16 }] };
  setCompanionDecision(ex, "accepted", "fine", { verdict: "V2" });
  expect(ex.prog[0].companion).toMatchObject({ verdict: "V2", decision: "accepted", decisionNote: "fine" });
});
