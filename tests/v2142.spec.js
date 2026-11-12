import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { photoIssues } from "../src/lib/bodyPhotoCheck.js";
import { parseReading, wrongPartMsg } from "../src/lib/measureReading.js";
import { REGIONS } from "../src/lib/bodyBalance.js";

// v2.14.2: body photos must be recognised (a person, full body / the expected body area, the requested pose) and the
// measurement Snap must show the right body part. Otherwise: a message per photo, no scores/analysis, Save/Confirm
// disabled, nothing saved.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const dashUrl = "http://127.0.0.1:9000/data/dashboard:data.json" + NS;
const getDash = async () => JSON.parse(await (await fetch(dashUrl, { headers: { Authorization: "Bearer owner" } })).json());
const putDash = (d) => fetch(dashUrl, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(d)) });
const PNG = (n) => ({ name: n, mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") });
const ai = (obj) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: JSON.stringify(obj) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }) });
const ok = (photo, pose) => ({ photo, isPerson: true, isFullBody: true, pose, matchesPose: true });
const scores = Object.fromEntries(REGIONS.map((r) => [r.k, { score: 3, note: "ok" }]));

test("v2.14.2 pure: photo checks and wrong body part", () => {
  expect(photoIssues({ photos: [ok(1, "front"), { photo: 2, isPerson: false }, { photo: 3, isPerson: true, isFullBody: true, pose: "front", matchesPose: false }] }, 3, "balance"))
    .toEqual([{ photo: 2, msg: "This doesn't look like a full-body side photo — please retake it" }, { photo: 3, msg: "This doesn't look like a full-body back photo — please retake it" }]);
  expect(photoIssues({ photos: [{ photo: 1, isPerson: true, isFullBody: false, pose: "front", matchesPose: true }] }, 1, "balance")[0].msg).toBe("This doesn't look like a full-body front photo — please retake it");
  expect(photoIssues({ scores: {} }, 3, "balance")).toEqual([]);                        // older replies without a photos list
  expect(photoIssues({ photos: [{ photo: 1, isPerson: true, pose: "bicep flex", matchesPose: true }] }, 1, "bodytype")).toEqual([]);
  const r = parseReading('{"readable":true,"matchesPart":false,"seenPart":"calf","value":38}');
  expect(r).toMatchObject({ value: null, wrongPart: true, seenPart: "calf" });
  expect(wrongPartMsg("calf", "Bicep")).toBe("This photo looks like a calf, not Bicep — please retake it");
});

test("v2.14.2: Body balance — not a person / wrong pose / not full body: a message per photo, no scores, Save disabled, Retake + Cancel, nothing saved", async ({ page }) => {
  const { errors } = await openApp(page);
  const d = await getDash(); d.jc.bodyBalance = { optIn: true }; delete d.jc.progressPhotos; await putDash(d); await page.reload();
  const bodies = []; let reply;
  await page.route("https://api.anthropic.com/**", (r) => { const t = r.request().postData() || ""; if (!/assessing body BALANCE/.test(t)) return r.fallback(); bodies.push(t); return r.fulfill(ai(reply)); });
  await tab(page, "My Body");
  const card = page.getByTestId("body-balance");
  for (const [label, photos] of [
    ["not a person", [{ photo: 1, isPerson: false, isFullBody: false, pose: "other", matchesPose: false }, ok(2, "side"), ok(3, "back")]],
    ["wrong pose", [ok(1, "front"), { photo: 2, isPerson: true, isFullBody: true, pose: "front", matchesPose: false }, ok(3, "back")]],
    ["not full body", [ok(1, "front"), ok(2, "side"), { photo: 3, isPerson: true, isFullBody: false, pose: "back", matchesPose: true }]],
  ]) {
    reply = { photos, poses: ["front", "side", "back"], scores, changes: [], flags: [], summary: "should not be shown" };
    await card.locator('input[type="file"]').setInputFiles([PNG("1.png"), PNG("2.png"), PNG("3.png")]);
    const box = card.getByTestId("bb-issues");
    await expect(box.getByTestId("bb-issue")).toHaveCount(1);
    const want = label === "not a person" ? "Photo 1: This doesn't look like a full-body front photo — please retake it" : label === "wrong pose" ? "Photo 2: This doesn't look like a full-body side photo — please retake it" : "Photo 3: This doesn't look like a full-body back photo — please retake it";
    await expect(box.getByTestId("bb-issue")).toHaveText(want);
    await expect(box.getByRole("button")).toHaveText(["Save", "Retake", "Cancel"]);
    await expect(box.getByRole("button", { name: "Save" })).toBeDisabled();
    await expect(card.getByTestId("bb-scores")).toHaveCount(0);                                          // no scores shown
    await expect(card.getByText("should not be shown")).toHaveCount(0);
    expect((await getDash()).jc.progressPhotos).toBeUndefined();                                          // nothing saved
    await box.getByRole("button", { name: "Cancel" }).click();
    await expect(card.getByTestId("bb-issues")).toHaveCount(0);
  }
  expect(bodies[0]).toContain("photo 1 = FRONT, photo 2 = SIDE, photo 3 = BACK");
  // a valid set is analysed and saved as before
  reply = { photos: [ok(1, "front"), ok(2, "side"), ok(3, "back")], poses: ["front", "side", "back"], scores, changes: [], flags: [], summary: "Balanced." };
  await card.locator('input[type="file"]').setInputFiles([PNG("1.png"), PNG("2.png"), PNG("3.png")]);
  await expect(card.getByTestId("bb-msg")).toHaveText("✓ Checked front, side, back. Photos were not saved.");
  await expect.poll(async () => ((await getDash()).jc.progressPhotos || []).length).toBe(1);
  expect(errors).toEqual([]);
});

test("v2.14.2: Body Type Photos — a photo that isn't a person or a requested pose: message, no analysis, Save disabled, nothing saved", async ({ page }) => {
  const { errors } = await openApp(page);
  const before = await getDash(); delete before.jc.bodyAnalysis; before.jc.bodyPhotos = []; await putDash(before); await page.reload();
  let reply;
  await page.route("https://api.anthropic.com/**", (r) => { const t = r.request().postData() || ""; if (!/Analyse this person's physique/.test(t)) return r.fallback(); return r.fulfill(ai(reply)); });
  await page.getByRole("button", { name: "▼ My Profile" }).click(); await page.getByRole("button", { name: "My Details" }).click();
  reply = { photos: [{ photo: 1, isPerson: true, pose: "front relaxed", matchesPose: true }, { photo: 2, isPerson: false, pose: "other", matchesPose: false }], bodyType: "Mesomorph", dominance: "upper", fibreType: "fast", strengths: "x", notes: "should not be saved" };
  await page.locator('input[data-share="bodytype"]').setInputFiles([PNG("front.png"), PNG("dog.png")]);
  const box = page.getByTestId("bodytype-issues");
  await expect(box.getByTestId("bodytype-issue")).toHaveText(["Photo 2: This doesn't look like one of the requested body photos (front relaxed, bicep flex, side profile, back, quad flex, calf raise) — please retake it"]);
  await expect(box.getByRole("button", { name: "Save" })).toBeDisabled();
  await expect(box.getByRole("button")).toHaveText(["Save", "Retake", "Cancel"]);
  await page.waitForTimeout(500);
  const after = await getDash();
  expect(after.jc.bodyPhotos).toEqual([]); expect(after.jc.bodyAnalysis).toBeUndefined();              // nothing saved
  await box.getByRole("button", { name: "Cancel" }).click(); await expect(box).toHaveCount(0);
  // valid set: saved as before (date, name, type only) with the analysis
  reply = { photos: [{ photo: 1, isPerson: true, pose: "front relaxed", matchesPose: true }], bodyType: "Mesomorph", dominance: "upper", fibreType: "fast", strengths: "x", notes: "ok" };
  await page.locator('input[data-share="bodytype"]').setInputFiles([PNG("front.png")]);
  await expect.poll(async () => ((await getDash()).jc.bodyPhotos || []).length).toBe(1);
  const v = await getDash(); expect(Object.keys(v.jc.bodyPhotos[0]).sort()).toEqual(["date", "name", "type"]); expect(v.jc.bodyAnalysis.photos).toBeUndefined();
  expect(errors).toEqual([]);
});

test("v2.14.2: measurement Snap of a different body part (calf photo on Bicep): message, Confirm disabled, nothing filled or saved", async ({ page }) => {
  const { errors } = await openApp(page);
  const d = await getDash(); d.jc.measurements = { bicep: [{ wk: 1, v: 38 }] }; await putDash(d); await page.reload();
  await page.route("https://api.anthropic.com/**", (r) => /body measurement for/.test(r.request().postData() || "") ? r.fulfill(ai({ readable: true, matchesPart: false, seenPart: "calf", value: 39 })) : r.fallback());
  await tab(page, "My Body"); await page.getByRole("button", { name: "Measurements", exact: true }).click();
  await page.getByRole("button", { name: "📋 Log", exact: true }).nth(1).click();
  await page.getByTestId("meas-snap").click(); await page.getByTestId("meas-snap-file").setInputFiles(PNG("calf.png"));
  await expect(page.getByTestId("meas-snap-value")).toHaveText("This photo looks like a calf, not Bicep — please retake it");
  await expect(page.getByTestId("meas-snap-actions").getByRole("button", { name: "Confirm" })).toBeDisabled();
  await page.getByTestId("meas-snap-actions").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByPlaceholder("was 38")).toHaveValue("");
  expect((await getDash()).jc.measurements.bicep.length).toBe(1);
  expect(errors).toEqual([]);
});
