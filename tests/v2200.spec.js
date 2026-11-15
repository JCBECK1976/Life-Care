import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { mealName, namesLine, UNNAMED } from "../src/lib/mealNames.js";

// v2.20.0 overnight batch (JC, 15/16 Nov). One test group per item.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const thisSunday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return ymd(d); };

/* ---------- 1. Home food codes ---------- */
test("1 mealName / namesLine: names from children, lists or ad hoc; never a raw key", () => {
  const doc = { children: { c_2026_11_15_b: { snapshot: { name: "Porridge" } } } };
  expect(mealName("c_2026_11_15_b", { children: doc })).toBe("Porridge");
  expect(mealName("spag", { items: [{ id: "spag", name: "Spaghetti Bolognese" }] })).toBe("Spaghetti Bolognese");
  expect(mealName("__adhoc__:Soup", {})).toBe("Soup");
  expect(mealName("c_2026-11-15_d", {})).toBe(UNNAMED);
  expect(mealName("__empty__", {})).toBe(null);
  expect(namesLine(["Apple", "Pear", "Crisps"])).toBe("Apple +2 more");
  expect(namesLine(["Apple"])).toBe("Apple");
  expect(namesLine([])).toBe(null);
});

test("1 Home → My Day → My Eating shows meal names for child-record selections (no 'C 20…' codes)", async ({ page }) => {
  const { errors } = await openApp(page);
  const td = new Date(), tds = ymd(td), wd = DAYS[td.getDay()];
  const ch = (slot, name, parentId) => ({ id: "c_" + tds + "_" + slot, parentId: parentId || null, date: tds, weekday: wd, slot, snapshot: { name, kcal: 300 }, portion: { factor: 1 }, variations: { text: "", subs: [] }, nutrition: { kcal: 300 }, rating: "GOOD", band: "GOOD", tracked: "", source: "manual" });
  const kids = {}; [ch("b", "Test Porridge Bowl"), ch("l", "Test Chicken Wrap", "custom_gone"), ch("d", "Test Fish Pie"), ch("o1", "Test Apple"), ch("o2", "Test Pear"), ch("o3", "Test Crisps"), ch("dr", "Test Tea")].forEach((c) => { kids[c.id] = c; });
  await put("eat_children:jc:" + thisSunday(), { v: 1, empty: [], notes: {}, children: kids });
  await page.reload();
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "Home");
  const eat = page.getByTestId("myday-eating");
  await expect(eat).toContainText("Test Porridge Bowl");
  await expect(eat).toContainText("Test Chicken Wrap");
  await expect(eat).toContainText("Test Fish Pie");
  await expect(eat).toContainText("Test Apple +2 more");
  await expect(eat).toContainText("Test Tea");
  await expect(page.getByText(/\bC 20\d\d-\d\d-\d\d/)).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/\bc_20\d\d-\d\d-\d\d/);
  expect(errors).toEqual([]);
});
