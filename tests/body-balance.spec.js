import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { REGIONS, buildPrompt, parseAnalysis, makeRecord } from "../src/lib/bodyBalance.js";

// v2.12.0 F2 Body balance — analyse-and-discard: photos go to the AI only; just the structured scores are saved.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const rawRoot = async () => (await fetch("http://127.0.0.1:9000/.json" + NS, { headers: { Authorization: "Bearer owner" } })).text();
const getDash = async () => JSON.parse(await (await fetch("http://127.0.0.1:9000/data/dashboard:data.json" + NS, { headers: { Authorization: "Bearer owner" } })).json());
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const IMG = (name) => ({ name, mimeType: "image/png", buffer: Buffer.from(PNG_B64, "base64") });
const IMAGE_LIKE = /iVBORw0KGgo|\/9j\/4|data:image|R0lGOD|UklGR/;          // PNG, JPEG, data URLs, GIF, WEBP
const scoresWith = (over) => Object.fromEntries(REGIONS.map((r) => [r.k, { score: over[r.k] || 3, note: r.l + " ok" }]));
const ai = (obj) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: JSON.stringify(obj) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }) });

test("pure: every checklist region must be scored 1–5; the record holds text and numbers only", () => {
  expect(() => parseAnalysis(JSON.stringify({ scores: { upperChest: { score: 3 } } }))).toThrow(/missed Lower chest/);
  const an = parseAnalysis(JSON.stringify({ poses: ["front", "side", "back", "selfie"], scores: scoresWith({ lowerChest: 2 }), flags: [{ region: "lowerChest", issue: "behind upper", suggestion: "add decline press" }, { region: "nope" }], summary: "Balanced overall." }));
  expect(an.poses).toEqual(["front", "side", "back"]);
  expect(an.flags).toEqual([{ region: "lowerChest", issue: "behind upper", suggestion: "add decline press", accepted: false }]);
  const rec = makeRecord(an, 16, new Date(2026, 10, 11));
  expect(Object.keys(rec).sort()).toEqual(["analysis", "changes", "date", "flags", "notes", "pose", "scores", "summary", "week"]);
  expect(rec).toMatchObject({ date: "2026-11-11", week: 16, pose: "front+side+back", scores: { lowerChest: 2, upperChest: 3 } });
  expect(buildPrompt({ prev: null, trends: [] })).toContain("This is the FIRST check");
  expect(buildPrompt({ prev: rec, trends: ["chest: 98 → 101 (wk 3 → wk 15)"] })).toContain('PREVIOUS CHECK (2026-11-11, week 16): scores {"upperChest":3,"lowerChest":2');
});

test("opt-in, no photos yet, first check: scores saved, nothing image-like stored anywhere; second check compares against the first", async ({ page }) => {
  const { errors } = await openApp(page);
  const bodies = [];
  let replyObj = { poses: ["front", "side", "back"], scores: scoresWith({ lowerChest: 2, armsLR: 3 }), changes: [], flags: [{ region: "lowerChest", issue: "lagging upper chest", suggestion: "Swap one incline set for a decline press" }], summary: "Upper body ahead of lower chest." };
  await page.route("https://api.anthropic.com/**", (r) => { const t = r.request().postData() || ""; if (!/assessing body BALANCE/.test(t)) return r.fallback(); bodies.push(JSON.parse(t)); return r.fulfill(ai(replyObj)); });
  await tab(page, "My Body");
  const card = page.getByTestId("body-balance");
  await card.getByRole("button", { name: /Turn on body balance checks/ }).click();
  await expect(card.getByTestId("bb-status")).toHaveText(/^No progress photos yet\./);
  await card.locator('input[type="file"]').setInputFiles([IMG("front.png"), IMG("side.png"), IMG("back.png")]);
  await expect(card.getByTestId("bb-msg")).toHaveText("✓ Checked front, side, back. Photos were not saved.");
  // request: 3 images, temperature 0, first-check prompt
  expect(bodies[0].temperature).toBe(0);
  expect(bodies[0].messages[0].content.filter((c) => c.type === "image").length).toBe(3);
  expect(bodies[0].messages[0].content.at(-1).text).toContain("This is the FIRST check");
  // saved: structured only — and NOTHING image-like anywhere in the database
  let p = (await getDash()).jc;
  expect(p.bodyBalance).toEqual({ optIn: true });
  expect(p.progressPhotos.length).toBe(1);
  expect(p.progressPhotos[0]).toMatchObject({ pose: "front+side+back", scores: { lowerChest: 2, upperChest: 3 }, summary: "Upper body ahead of lower chest." });
  expect(await rawRoot()).not.toMatch(IMAGE_LIKE);
  await expect(card.getByTestId("bb-lowerChest")).toContainText("2/5");
  await card.getByRole("button", { name: "Accept suggestion" }).click();
  await expect(card.getByText("✓ Accepted — your companion will keep this in mind")).toBeVisible();
  // second check: the AI gets the previous structured analysis; changes are shown per region
  replyObj = { poses: ["front", "side", "back"], scores: scoresWith({ lowerChest: 4, armsLR: 2 }), changes: [{ region: "lowerChest", from: 2, to: 4, note: "caught up" }], flags: [{ region: "armsLR", issue: "left arm smaller", suggestion: "Lead with the left arm on single-arm curls" }], summary: "Lower chest caught up; left arm now behind." };
  await card.locator('input[type="file"]').setInputFiles([IMG("front2.png"), IMG("side2.png"), IMG("back2.png")]);
  await expect.poll(() => bodies.length).toBe(2);
  const prompt2 = bodies[1].messages[0].content.at(-1).text;
  expect(prompt2).toContain('PREVIOUS CHECK (');
  expect(prompt2).toContain('"lowerChest":2');
  await expect(card.getByTestId("bb-change-lowerChest")).toHaveText("▲ 2→4");
  await expect(card.getByTestId("bb-change-armsLR")).toHaveText("▼ 3→2");
  p = (await getDash()).jc;
  expect(p.progressPhotos.length).toBe(2);
  expect(p.progressPhotos[0].flags[0].accepted).toBe(true);
  expect(await rawRoot()).not.toMatch(IMAGE_LIKE);
  expect(errors).toEqual([]);
});
