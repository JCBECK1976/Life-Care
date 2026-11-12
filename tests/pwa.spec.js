import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { openApp } from "./helpers.js";

const BASE = "/Life-Care/";

test("prod manifest: name, start/scope/id, standalone, icons that load", async ({ request }) => {
  const m = await (await request.get("manifest.webmanifest")).json();
  expect(m).toMatchObject({ name: "Lifecare Companion", short_name: "Lifecare", id: BASE, start_url: BASE, scope: BASE, display: "standalone", theme_color: "#0f172a", background_color: "#ffffff" });
  expect(m.icons.map((i) => i.purpose)).toEqual(["any", "any", "maskable"]);
  for (const i of m.icons) {
    expect(i.src.startsWith(BASE + "brand/")).toBe(true);
    expect((await request.get(i.src.slice(BASE.length))).status()).toBe(200);
  }
});

test("page links the manifest, apple-touch-icon and favicon", async ({ request }) => {
  const html = await (await request.get("./")).text();
  for (const s of ['rel="manifest" href="/Life-Care/manifest.webmanifest"', 'rel="apple-touch-icon" href="/Life-Care/brand/apple-touch-icon.png"', 'href="/Life-Care/brand/favicon.ico"']) expect(html).toContain(s);
  expect(html).not.toContain("data:application/json");
  for (const p of ["brand/apple-touch-icon.png", "brand/favicon.ico", "brand/favicon-48.png", "sw.js"]) expect((await request.get(p)).status()).toBe(200);
});

test("Chromium says the app is installable, and it still works under the service worker", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.evaluate(async (base) => { await navigator.serviceWorker.register(base + "sw.js", { scope: base }); await navigator.serviceWorker.ready; }, BASE);
  await page.reload();
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  expect(installabilityErrors.map((e) => e.errorId)).toEqual([]);
  expect(errors).toEqual([]);
});

test("service worker is network-only and leaves other origins and environments alone", async () => {
  const src = fs.readFileSync("vite.config.js", "utf8");
  expect(src).toContain("NETWORK-ONLY");
  // Run the generated worker for prod with a fake service-worker global.
  const body = `const SCOPE = "/Life-Care/";\nconst SKIP = ["/Life-Care/beta/","/Life-Care/build/"];\n` +
    src.slice(src.indexOf('const SHARE = SCOPE'), src.indexOf("`;\n}"));     // v2.11.0: includes the share-target handler
  const handlers = {};
  const self = { location: { origin: "https://jcbeck1976.github.io" }, addEventListener: (t, f) => (handlers[t] = f), skipWaiting() {}, clients: { claim() {} } };
  const fetchCalls = [];
  const caches = { open: async () => ({ keys: async () => [], delete: async () => true, put: async () => {} }) };
  const Response = { redirect: (u, c) => ({ redirect: u, status: c }) };
  new Function("self", "fetch", "caches", "Response", body)(self, (r) => { fetchCalls.push(r.url); return Promise.resolve("net"); }, caches, Response);
  const handled = (url, method = "GET") => { let used = false; handlers.fetch({ request: { url, method, formData: async () => ({ getAll: () => [] }) }, respondWith: (p) => { used = true; Promise.resolve(p).catch(() => {}); } }); return used; };
  expect(handled("https://jcbeck1976.github.io/Life-Care/")).toBe(true);
  expect(handled("https://jcbeck1976.github.io/Life-Care/assets/index.js")).toBe(true);
  expect(handled("https://jcbeck1976.github.io/Life-Care/beta/")).toBe(false);
  expect(handled("https://jcbeck1976.github.io/Life-Care/build/")).toBe(false);
  expect(handled("https://life-care-app-64d04-default-rtdb.europe-west1.firebasedatabase.app/.json")).toBe(false);
  expect(handled("https://api.anthropic.com/v1/messages", "POST")).toBe(false);
  expect(handled("https://api.anthropic.com/v1/models")).toBe(false);
  expect(handled("https://jcbeck1976.github.io/Life-Care/x", "POST")).toBe(false);
  expect(handled("https://jcbeck1976.github.io/Life-Care/share-target", "POST")).toBe(true);     // v2.11.0 F8: only the share POST
  expect(handled("https://jcbeck1976.github.io/Life-Care/share-target")).toBe(true);             // (a GET there is just passed to the network)
  // The only cache use is the shared-image store inside receiveShare; no app file is ever cached.
  const swSrc = src.slice(src.indexOf("function swSource"), src.indexOf("function pwa("));
  const outside = swSrc.slice(0, swSrc.indexOf("async function receiveShare")) + swSrc.slice(swSrc.indexOf('self.addEventListener("install"'));
  expect(outside).not.toMatch(/caches\.|CacheStorage/);
});
