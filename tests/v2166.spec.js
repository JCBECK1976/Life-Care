import { test, expect } from "@playwright/test";
import { householdTabs } from "../src/lib/platform.js";

// v2.16.6 Step C (ADR 0012): household & privacy model. Server rules/functions are emulator-tested in functions/test
// (run by tests/v2163.spec.js); this checks the client tab logic (behind the useAccounts flag, off).
test("tabs: own first; Hidden members greyed with '[Name] keeps this private'; log-for-me only when Visible + toggle", () => {
  const t = householdTabs("u2", { u1: true, u2: true, u3: true },
    { u1: { name: "Becks" }, u2: { name: "JC" }, u3: { name: "Alex" } },
    { u1: { visible: true, logForMe: true }, u3: { visible: false, logForMe: true } });
  expect(t.map((x) => x.name)).toEqual(["JC", "Alex", "Becks"]);
  expect(t[0]).toMatchObject({ self: true, hidden: false, canLog: false });
  expect(t[1]).toMatchObject({ hidden: true, canLog: false, note: "Alex keeps this private" });
  expect(t[2]).toMatchObject({ hidden: false, canLog: true, note: "" });
  expect(householdTabs("u9", {}, {}, {})).toEqual([{ uid: "u9", name: "Member", self: true, hidden: false, canLog: false, note: "" }]);
});
