import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";
import { attachCompanion, findWeekIdx, previousEntry, setCompanionDecision } from "../src/lib/exercise.js";

// v2.16.0: D23 (Log week defaults), D24 (Progress chips), F11 (Companion feedback per week), F12 (My Notes), Documentation index.
const DB = "http://127.0.0.1:9000/data/dashboard:data.json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
export const readData = async () => JSON.parse(await (await fetch(DB, { headers: H })).json());
export const writeData = async (d) => fetch(DB, { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(d)) });
const headerWeek = async (page) => parseInt((await page.getByText(/^Week \d+$/).first().textContent()).replace(/\D/g, ""), 10);

test("D23 helpers: weeks as numbers or strings, unsorted prog", () => {
  const prog = [{ wk: "16" }, { wk: 15 }, { wk: 17 }];
  expect(findWeekIdx(prog, 16)).toBe(0);
  expect(findWeekIdx(prog, "17")).toBe(2);
  expect(findWeekIdx(prog, 18)).toBe(-1);
  expect(previousEntry(prog, 17).wk).toBe("16");
  expect(previousEntry([{ wk: 17 }], 17)).toBe(null);
});

test("D23: Week 17 with 15 and 16 logged → Week defaults to 17 and Previous is Wk 16 (both people)", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.getByRole("button", { name: "My Exercise", exact: true }).first().click();
  const cw = await headerWeek(page);
  const d = await readData();
  for (const who of ["jc", "becks"]) {
    const ex = d[who].exercises.sunday[0];
    // stored out of order and with a string week, as seen in real data
    ex.prog = [{ wk: String(cw - 1), w: "20kg", r: "10×3" }, { wk: cw - 2, w: "18kg", r: "10×3" }];
  }
  d.becks.exercises.sunday[0].name = d.jc.exercises.sunday[0].name;
  await writeData(d);
  await page.reload();
  await page.getByRole("button", { name: "My Exercise", exact: true }).first().click();
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
  await expect(page.getByTestId("log-previous")).toContainText("(Wk " + (cw - 1) + ")");
  await expect(page.getByRole("spinbutton").first()).toHaveValue(String(cw));
  // switch to Becks inside the form: same rule for her
  await page.getByTestId("log-person-tabs").getByRole("button").nth(1).click();
  await expect(page.getByRole("spinbutton").first()).toHaveValue(String(cw));
  expect(errors).toEqual([]);
});

async function progWithCompanion(page) {
  const d = await readData();
  const ex = d.jc.exercises.sunday[0];
  ex.prog = [
    { wk: 1, w: "60kg", r: "10×3", goodForm: "good", fullRange: "working", note: "my own note" },
    { wk: 2, w: "62kg", r: "10×3", goodForm: "good", fullRange: "good", note: "", companion: { verdict: "Solid week, hold the weight.", recommendation: "Recommendation: consolidating", at: "Thu 13 Nov" } },
  ];
  await writeData(d);
  await page.reload();
  await page.getByRole("button", { name: "My Exercise", exact: true }).first().click();
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  await page.getByRole("button", { name: "👁 Progress" }).first().click();
}

test("D24: Form/Range chips sit under the row and never overlap Open at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await progWithCompanion(page);
  const chips = page.getByTestId("prog-chips");
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(1)).toContainText("Form ✓ Good");
  await expect(chips.nth(1)).toContainText("Range … Working towards");
  for (let i = 0; i < 2; i++) {
    const open = await page.getByRole("button", { name: /^Open week/ }).nth(i).boundingBox();
    const chip = await chips.nth(i).boundingBox();
    expect(chip.y).toBeGreaterThanOrEqual(open.y + open.height - 1); // below the Open button, not beside it
    expect(open.x + open.width).toBeLessThanOrEqual(360);
  }
  expect(errors).toEqual([]);
});

test("F11 + F12: Companion feedback shown in the Open form between My Notes and the buttons; decision editable", async ({ page }) => {
  const { errors } = await openApp(page);
  await progWithCompanion(page);
  await page.getByRole("button", { name: "Open week 2" }).click();
  const form = page.getByTestId("prog-open-form");
  await expect(form.getByText("My Notes")).toBeVisible();
  await expect(form.getByTestId("entry-companion-verdict")).toHaveText("Solid week, hold the weight.");
  await expect(form.getByTestId("entry-companion-decision")).toContainText("No decision yet");
  const note = await form.getByTestId("entry-note").boundingBox(), comp = await form.getByTestId("entry-companion").boundingBox(), edit = await form.getByRole("button", { name: "Edit" }).boundingBox();
  expect(comp.y).toBeGreaterThan(note.y); expect(edit.y).toBeGreaterThan(comp.y);
  await form.getByRole("button", { name: "Edit" }).click();
  await form.getByRole("button", { name: "✕ Reject" }).click();
  await form.getByLabel("Note on the feedback").fill("knee is sore, holding");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form.getByTestId("entry-companion-decision")).toContainText("✕ Rejected — knee is sore, holding");
  const saved = (await readData()).jc.exercises.sunday[0].prog.find((e) => e.wk === 2);
  expect(saved.companion).toMatchObject({ decision: "rejected", decisionNote: "knee is sore, holding", verdict: "Solid week, hold the weight." });
  // an older week with no Companion feedback shows no block (backward compatible)
  await form.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Open week 1" }).click();
  await expect(page.getByTestId("entry-companion")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Settings → Documentation: grouped from the docs index, legal drafts labelled, vault docs named only", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.locator("button").nth(1).click(); // ⚙ Settings
  const docs = page.getByTestId("docs-links");
  await docs.scrollIntoViewIfNeeded();
  for (const n of ["Low-level design (LLD)", "Decisions (ADRs)", "Plan (plan.json)", "Privacy Notice", "Terms of Use"]) await expect(docs.getByRole("link", { name: n })).toBeVisible();
  await expect(docs.getByText("Legal (Draft — for legal review)")).toBeVisible();
  for (const v of ["01 SAD", "02 DPIA", "03 Service design + runbooks", "04 Risk register", "05 Supplier register + ROPA"]) await expect(page.getByTestId("vault-docs")).toContainText(v);
  await expect(page.getByTestId("vault-docs").getByRole("link")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("F11 helpers: feedback attaches to the latest logged week and keeps an earlier decision on re-run", () => {
  const ex = { prog: [{ wk: 3 }, { wk: "4" }, { wk: 2 }] };
  attachCompanion(ex, { verdict: "Good", newStatus: "building" }, "now");
  expect(ex.prog[1].companion).toEqual({ verdict: "Good", recommendation: "Recommendation: building", at: "now" });
  setCompanionDecision(ex, "accepted", " fine ");
  attachCompanion(ex, { verdict: "Better", recommendation: "Add 2kg" }, "later");
  expect(ex.prog[1].companion).toEqual({ verdict: "Better", recommendation: "Add 2kg", at: "later", decision: "accepted", decisionNote: "fine" });
  expect(ex.prog[0].companion).toBeUndefined();
});
