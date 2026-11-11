import { test, expect } from "@playwright/test";
import fs from "fs";
import { openApp, person } from "./helpers.js";
import { parseBackupInput, backupCounts, restoreTarget } from "../src/lib/backup.js";

// v2.6.5: Settings → Data tools → "⬇️ Download backup" (admin only): real "data" + "data_build", console-export shape.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const raw = async (path) => (await fetch("http://127.0.0.1:9000/" + path + ".json" + NS, { headers: { Authorization: "Bearer owner" } })).json();
const openSettings = (page) => page.locator("button").nth(1).click();

test("Download backup (Beta/Prod build): one dated file with data only, confirmation shows size and counts only", async ({ page }) => {
  const { errors } = await openApp(page);
  const buildBefore = await raw("data_build");                                     // restored at the end (other tests use it)
  await fetch("http://127.0.0.1:9000/data_build/backup_test_a.json" + NS, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify("x") });
  await fetch("http://127.0.0.1:9000/data_build/backup_test_b.json" + NS, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify("[]") });
  await person(page, "JC");
  await openSettings(page);
  await page.getByRole("button", { name: "Open Data tools" }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "⬇️ Download backup" }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^lifecare_backup_prod_\d{4}-\d{2}-\d{2}-\d{4}\.json$/);   // dev server runs as "prod"
  const file = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  expect(Object.keys(file)).toEqual(["data"]);                                      // v2.7.1: Beta/Prod know nothing of the build copy
  expect(file.data).toEqual(await raw("data"));                                     // the REAL path, exactly as stored
  const msg = page.getByTestId("backup-msg");
  await expect(msg).toHaveText(new RegExp("^✓ Downloaded " + dl.suggestedFilename().replace(/\./g, "\\.") + " \\(\\d+ (KB|MB)\\): data " + Object.keys(file.data).length + " items \\(\\d+ meal weeks\\)\\.$"));
  expect(await msg.innerText()).not.toContain("jc");                                 // counts only, no contents
  // Restore accepts the whole file: preview (counts only) → Merge missing exercise weeks (safe)
  page.on("dialog", (d) => d.accept());
  await page.locator("#restore-json").fill(JSON.stringify(file));
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByTestId("restore-preview")).toContainText("Found: backup file (data) · " + Object.keys(file.data).length + " items in data");
  await page.getByRole("button", { name: "Merge missing exercise weeks" }).click();
  await expect(page.getByTestId("restore-msg")).toHaveText(/^✓ Merged: \d+ missing exercise weeks added\. Nothing else was changed\./);
  expect(errors).toEqual([]);
  await fetch("http://127.0.0.1:9000/data_build.json" + NS, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(buildBefore) });
});

const put = (path, v) => fetch("http://127.0.0.1:9000/" + path + ".json" + NS, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(v) });
async function downloadFile(page) {
  await person(page, "JC"); await openSettings(page);
  await page.getByRole("button", { name: "Open Data tools" }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "⬇️ Download backup" }).click()]);
  return JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
}

test("Restore input (pure): backup file, console export of data, bare exercise data; restore targets the environment's own root", () => {
  const dash = { jc: { exercises: { sunday: [{ name: "Row", prog: [{ wk: 1 }, { wk: 2 }] }] } } };
  const f = parseBackupInput(JSON.stringify({ data: { "dashboard:data": JSON.stringify(dash), "mealplan:2026-09-06:jc": "{}", "eat_children:jc:2026-11-08": "{}" }, other: {} }));
  expect(f.kind).toBe("backup file (data + 1 more section)");
  expect(backupCounts(f)).toEqual({ keys: 3, mealWeeks: 2, people: ["jc"], exerciseWeeks: 2 });
  expect(parseBackupInput(JSON.stringify({ "dashboard:data": JSON.stringify(dash) })).kind).toBe("export of data");
  const bare = parseBackupInput(JSON.stringify(dash)); expect([bare.kind, bare.dataRoot]).toEqual(["exercise data only", null]);
  expect(() => parseBackupInput('{"hello":1}')).toThrow(/doesn't look like a Lifecare backup/);
  expect([restoreTarget("data"), restoreTarget("data_build")]).toEqual(["data", "data_build"]);  // the environment's own DATA_ROOT
});

test("Full restore of data: double confirm (type RESTORE) → every key in data replaced from the file", async ({ page }) => {
  const { errors } = await openApp(page);
  const file = await downloadFile(page);
  await put("data/custom_snacks", "[\"changed after the backup\"]");
  await put("data/zz_added_after_backup", "\"x\"");
  const dialogs = [];
  page.on("dialog", (d) => { dialogs.push(d.type() + ": " + d.message()); d.type() === "prompt" ? d.accept("RESTORE") : d.accept(); });
  await page.locator("#restore-json").fill(JSON.stringify(file));
  await page.getByRole("button", { name: "Preview" }).click();
  await page.getByRole("button", { name: "Full restore of data" }).click();
  await expect(page.getByTestId("restore-msg")).toHaveText(`✓ Full restore done: ${Object.keys(file.data).length} items written to data. Close and reopen the app.`);
  expect(dialogs[0]).toMatch(/^confirm: Full restore: overwrite EVERYTHING in "data"/);
  expect(dialogs[1]).toBe('prompt: To confirm the full restore of "data", type RESTORE');
  expect(await raw("data")).toEqual(file.data);                                       // exactly the backup again
  expect(errors).toEqual([]);
});

test("Full restore: anything but RESTORE typed cancels and changes nothing", async ({ page }) => {
  const { errors } = await openApp(page);
  const file = await downloadFile(page);
  await put("data/zz_added_after_backup", "\"x\"");
  const before = await raw("data");
  page.on("dialog", (d) => (d.type() === "prompt" ? d.accept("restore") : d.accept()));
  await page.locator("#restore-json").fill(JSON.stringify(file));
  await page.getByRole("button", { name: "Preview" }).click();
  await page.getByRole("button", { name: "Full restore of data" }).click();
  await expect(page.getByTestId("restore-msg")).toHaveText("Full restore cancelled — nothing was changed.");
  expect(await raw("data")).toEqual(before);
  expect(errors).toEqual([]);
});
