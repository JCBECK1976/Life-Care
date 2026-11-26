// SYNTHETIC test data (no real person's data). The generator lives in functions/src/fixture.js (v2.31.2) so the server
// can use it for the store-review demo account; this file keeps the old import path and the command line.
// Usage: node scripts/make-fixture.mjs [out.json]
import fs from "node:fs";
import { makeFixture } from "../functions/src/fixture.js";
export { makeFixture, currentWeek, makeDemoFlat } from "../functions/src/fixture.js";
if (process.argv[1] && process.argv[1].endsWith("make-fixture.mjs")) {
  const f = makeFixture();
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(f, null, 1));
  console.log("Synthetic fixture: " + Object.keys(f).length + " keys (no real data).");
}
