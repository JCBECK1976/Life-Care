// The local emulator uses the REAL rules (database.rules.json) with the allowed UID swapped for a
// test UID, so the tests prove the rules. Works before (__UID__) and after JC's real UID is filled in.
// Writes emulator.rules.json (generated, not committed).
import fs from "node:fs";
const rules = fs.readFileSync("database.rules.json", "utf8").replace(/auth\.uid === '[^']*'/g, "auth.uid === 'test-uid-jc'");
fs.writeFileSync("emulator.rules.json", rules);
console.log("emulator.rules.json written (allowed UID: test-uid-jc)");
