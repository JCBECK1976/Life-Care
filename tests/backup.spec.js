import { test, expect } from "@playwright/test";
import fs from "fs";
import { openApp, person } from "./helpers.js";

// v2.6.5: Settings → Data tools → "⬇️ Download backup" (admin only): real "data" + "data_build", console-export shape.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const raw = async (path) => (await fetch("http://127.0.0.1:9000/" + path + ".json" + NS, { headers: { Authorization: "Bearer owner" } })).json();
const openSettings = (page) => page.locator("button").nth(1).click();

test("Download backup: one dated file with data + data_build, confirmation shows size and counts only", async ({ page }) => {
  const { errors } = await openApp(page);
  await fetch("http://127.0.0.1:9000/data_build.json" + NS, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify({ "dashboard:data": "{\"jc\":{}}", "custom_snacks": "[]" }) });
  await person(page, "JC");
  await openSettings(page);
  await page.getByRole("button", { name: "Open Data tools" }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "⬇️ Download backup" }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^lifecare_backup_prod_\d{4}-\d{2}-\d{2}-\d{4}\.json$/);   // dev server runs as "prod"
  const file = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  expect(Object.keys(file)).toEqual(["data", "data_build"]);
  expect(file.data).toEqual(await raw("data"));                                     // the REAL path, exactly as stored
  expect(file.data_build).toEqual(await raw("data_build"));
  const msg = page.getByTestId("backup-msg");
  await expect(msg).toHaveText(new RegExp("^✓ Downloaded " + dl.suggestedFilename().replace(/\./g, "\\.") + " \\(\\d+ (KB|MB)\\): data " + Object.keys(file.data).length + " items \\(\\d+ meal weeks\\), data_build 2 items\\.$"));
  expect(await msg.innerText()).not.toContain("jc");                                 // counts only, no contents
  // What "Restore from Firebase Export" accepts: the exercise data, i.e. the value of data["dashboard:data"]
  page.on("dialog", (d) => d.accept());
  await page.locator("#restore-json").fill(file.data["dashboard:data"]);
  await page.getByRole("button", { name: "Restore Data" }).click();
  await expect(page.getByText(/^Restored \d+ missing progression entries/).first()).toBeVisible();
  expect(errors).toEqual([]);
});
