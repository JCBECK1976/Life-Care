// The local emulator uses the REAL rules (database.rules.json) with the allowed UID swapped for a
// test UID, so the tests prove the rules. Works before (__UID__) and after JC's real UID is filled in.
// v2.21.1: a second test account (test-uid-member) is also allowed, so tests can prove that an ordinary account can
// delete itself while the locked one (test-uid-jc, standing in for the joint/admin account) can't. Emulator only —
// the live rules are not changed.
// Writes emulator.rules.json (generated, not committed).
import fs from "node:fs";
const rules = JSON.parse(fs.readFileSync("database.rules.json", "utf8").replace(/auth\.uid === '[^']*'/g, "(auth.uid === 'test-uid-jc' || auth.uid === 'test-uid-member')"));
// v2.22.0: the platform paths (apps/*, platform/*) come from database.rules.next.json — the rules that ship WITH the
// server functions — so the app's plan reading (entitlements, family, energy) is tested against them. Emulator only.
const next = JSON.parse(fs.readFileSync("database.rules.next.json", "utf8")).rules;
rules.rules.apps = next.apps; rules.rules.platform = next.platform;
fs.writeFileSync("emulator.rules.json", JSON.stringify(rules, null, 2));
console.log("emulator.rules.json written (allowed UIDs: test-uid-jc, test-uid-member)");
