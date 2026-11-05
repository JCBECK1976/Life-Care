import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { mockAnthropic } from "./mock-ai.js";

// v2.5.1: switching person right after the app opens must never leave (or later apply) the
// previous person's state. The local emulator is slowed down so the start-up loader is still
// running when we switch. JC gets marker values; Becks has none, so any JC value on Becks is stale.
const FILE = process.env.SEED_FILE || "/home/user/firebase-backup/lifecare_firebase_backup_2026-11-03.json";
const DB = "http://127.0.0.1:9000/data.json?ns=life-care-app-64d04-default-rtdb";
const today = new Date().toISOString().split("T")[0];

async function seed() {
  const d = JSON.parse(fs.readFileSync(FILE, "utf8"));
  d.anthropic_api_key = "dev-placeholder-not-a-real-key";
  d.user_colour_jc = "blue"; d.user_colour_becks = "purple";
  d.daily_mood_jc = JSON.stringify({ date: today, mood: 4 });
  d.journal_jc = JSON.stringify([{ id: "1", date: today, text: "JC-ONLY-JOURNAL", mood: 4, ts: today + "T08:00:00Z" }]);
  d["meal_tracking:jc"] = JSON.stringify({ JC_ONLY_MEAL_TRACKING: true });
  d["portion_overrides:jc"] = JSON.stringify({ JC_ONLY_PORTION: 2 });
  for (const k of ["daily_mood_becks", "journal_becks", "meal_tracking:becks", "portion_overrides:becks", "user_mood_becks", "google_token_becks"]) delete d[k];
  const res = await fetch(DB, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(d) });
  if (!res.ok) throw new Error("seed failed");
}

async function slowEmulator(page, ms) {
  await page.routeWebSocket(/127\.0\.0\.1:9000/, (ws) => {
    const server = ws.connectToServer();
    ws.onMessage((m) => setTimeout(() => server.send(m), ms));
    server.onMessage((m) => setTimeout(() => ws.send(m), ms));
  });
}

const state = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__lcPerson || {})));

test("switch to Becks immediately after load (slow database): only Becks's state, never JC's", async ({ page }) => {
  await seed();
  await slowEmulator(page, 120);
  await mockAnthropic(page);
  await page.goto("./");
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 60000 });
  await page.getByTestId("person-tabs").getByRole("button", { name: "Becks", exact: true }).click();
  // Wait until the start-up loader has certainly finished (it is sequential and slowed down).
  await page.waitForTimeout(12000);
  const s = await state(page);
  expect(s.activeTab).toBe("becks");
  expect(s.userColour).toBe("purple");                                      // theme
  expect(s.dailyMood).toBeNull();                                           // mood
  expect(JSON.stringify(s.journalEntries)).not.toContain("JC-ONLY-JOURNAL"); // journal
  expect(JSON.stringify(s.mealTracking)).not.toContain("JC_ONLY");          // meal tracking
  expect(JSON.stringify(s.portionOverrides)).not.toContain("JC_ONLY");      // portion overrides
  // and the colour on screen is Becks's purple, not JC's blue
  const c = await page.getByRole("button", { name: "Home", exact: true }).first().evaluate((b) => getComputedStyle(b).color);
  expect(c).not.toBe("rgb(37, 99, 235)");
  // switching back to JC brings JC's own state back
  await page.getByTestId("person-tabs").getByRole("button", { name: "JC", exact: true }).click();
  await expect.poll(async () => (await state(page)).userColour, { timeout: 10000 }).toBe("blue");
  await expect.poll(async () => JSON.stringify((await state(page)).journalEntries), { timeout: 10000 }).toContain("JC-ONLY-JOURNAL");
});

test("rapid back-and-forth switching (slow database): the last selected person wins", async ({ page }) => {
  await seed();
  await slowEmulator(page, 120);
  await mockAnthropic(page);
  await page.goto("./");
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 60000 });
  await page.waitForTimeout(12000); // let the start-up loader finish, so only switch loads are in flight
  const tabs = page.getByTestId("person-tabs");
  for (const who of ["Becks", "JC", "Becks"]) await tabs.getByRole("button", { name: who, exact: true }).click();
  await page.waitForTimeout(3000);
  const s = await state(page);
  expect(s.activeTab).toBe("becks");
  expect(s.userColour).toBe("purple");
  expect(s.dailyMood).toBeNull();
  expect(JSON.stringify(s.journalEntries)).not.toContain("JC-ONLY-JOURNAL");
  expect(JSON.stringify(s.mealTracking)).not.toContain("JC_ONLY");
  expect(JSON.stringify(s.portionOverrides)).not.toContain("JC_ONLY");
});
