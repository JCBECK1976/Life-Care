import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import crypto from "node:crypto";

// APP_GUIDE.md lives once, at the repo root (docs are edited on main).
// This plugin serves it in dev and emits it next to index.html in builds,
// because the Help companion fetches it with a relative URL.
function appGuide() {
  return {
    name: "app-guide",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.split("?")[0].endsWith("/APP_GUIDE.md")) {
          res.setHeader("Content-Type", "text/markdown; charset=utf-8");
          res.end(fs.readFileSync("APP_GUIDE.md"));
          return;
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "APP_GUIDE.md", source: fs.readFileSync("APP_GUIDE.md") });
    },
  };
}

// v2.15.0: the plan (docs/plan.json, edited on main) is published next to index.html, so prod serves it as
// /Life-Care/plan.json after every main deploy (doc-only commits included). Every environment reads the prod copy.
// An invalid plan.json fails the build (prod then doesn't deploy, live stays as it was). No file = nothing emitted.
function planJson() {
  const file = "docs/plan.json";
  const read = () => { const src = fs.readFileSync(file, "utf8"); const j = JSON.parse(src); if (!Array.isArray(j.items)) throw new Error(file + ": no items array"); return src; };
  return {
    name: "plan-json",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.split("?")[0].endsWith("/plan.json")) return next();
        if (!fs.existsSync(file)) { res.statusCode = 404; res.end("no plan"); return; }
        res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(read());
      });
    },
    generateBundle() {
      if (fs.existsSync(file)) this.emitFile({ type: "asset", fileName: "plan.json", source: read() });
    },
  };
}

// v2.16.1 SAD-A2: Content-Security-Policy meta tag. Only the app itself, Firebase/Google sign-in and database,
// the Claude API, Open Food Facts and the Google Health API are allowed. Inline scripts are allowed only by
// their exact hash (computed here from the final HTML), so injected script can't run. Dev adds the local emulators.
export const CSP_HOSTS = {
  script: ["https://accounts.google.com", "https://apis.google.com", "https://*.firebasedatabase.app"],
  connect: ["https://api.anthropic.com", "https://world.openfoodfacts.org", "https://health.googleapis.com", "https://www.googleapis.com", "https://oauth2.googleapis.com",
    "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://*.firebasedatabase.app", "wss://*.firebasedatabase.app",
    "https://raw.githubusercontent.com", "https://jcbeck1976.github.io", "https://accounts.google.com",
    "https://europe-west1-life-care-app-64d04.cloudfunctions.net"], // v2.16.3: server AI proxy (flag, off by default)
  img: ["data:", "blob:", "https://images.openfoodfacts.org", "https://static.openfoodfacts.org", "https://lh3.googleusercontent.com"],
  frame: ["https://accounts.google.com", "https://life-care-app-64d04.firebaseapp.com"],
  style: ["https://accounts.google.com"],
};
const DEV_HOSTS = ["http://127.0.0.1:9000", "ws://127.0.0.1:9000", "http://127.0.0.1:9099", "ws://127.0.0.1:5173", "ws://127.0.0.1:5175", "http://127.0.0.1:5001"];
export function buildCsp(html, dev) {
  const hashes = [];
  html.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g, (m, body) => { if (body.trim()) hashes.push("'sha256-" + crypto.createHash("sha256").update(body).digest("base64") + "'"); return m; });
  const h = CSP_HOSTS, d = dev ? DEV_HOSTS : [];
  return ["default-src 'self'",
    "script-src 'self' " + hashes.concat(h.script, dev ? ["http://127.0.0.1:9000"] : []).join(" "),
    "connect-src 'self' " + h.connect.concat(d).join(" "),
    "img-src 'self' " + h.img.join(" "),
    "style-src 'self' 'unsafe-inline' " + h.style.join(" "),
    "font-src 'self' data:",
    "frame-src " + h.frame.concat(dev ? ["http://127.0.0.1:9099"] : []).join(" "),
    "worker-src 'self'", "manifest-src 'self' data:", "object-src 'none'", "base-uri 'self'", "form-action 'self'"].join("; ");
}
function csp() {
  let dev = false;
  return {
    name: "csp",
    configResolved(c) { dev = c.command === "serve"; },
    transformIndexHtml: { order: "post", handler(html) {
      return html.replace("<head>", '<head>\n  <meta http-equiv="Content-Security-Policy" content="' + buildCsp(html, dev) + '">');
    } },
  };
}

// Build and beta pages: no search-engine indexing, and the environment name in the tab title.
function envHtml(appEnv) {
  return {
    name: "env-html",
    transformIndexHtml(html) {
      if (appEnv !== "build" && appEnv !== "beta") return html;
      const label = appEnv.toUpperCase();
      return html
        .replace("<head>", '<head>\n  <meta name="robots" content="noindex, nofollow">')
        .replace("<title>Lifecare Companion™</title>", "<title>" + label + " · Lifecare Companion™</title>");
    },
  };
}

// Installable app (PWA), one per environment: manifest.webmanifest + a network-only
// service worker (sw.js), generated for the environment and base being built.
const PWA = {
  prod:  { name: "Lifecare Companion", short_name: "Lifecare", icons: "brand/" },
  beta:  { name: "Lifecare BETA",      short_name: "LC Beta",  icons: "brand/beta/" },
  build: { name: "Lifecare BUILD",     short_name: "LC Build", icons: "brand/build/" },
};

function swSource(scope, skip) {
  return `// Lifecare Companion service worker: NETWORK-ONLY. It exists so the app can be installed.
// It caches no app files. It only passes this app's own GET requests straight to the network and
// leaves everything else alone (Firebase, Anthropic, Google, fonts, other environments).
// v2.11.0 F8: the ONE exception is the Android share target: a POST to SCOPE + "share-target" (images shared
// from another app). The images are kept on this device (Cache Storage "lc-share") until the signed-in app
// hands them to an upload, then the app deletes them.
const SCOPE = ${JSON.stringify(scope)};
const SKIP = ${JSON.stringify(skip)};
const SHARE = SCOPE + "share-target";
async function receiveShare(req) {
  try {
    const form = await req.formData();
    const files = form.getAll("images").filter((f) => f && typeof f === "object" && f.size);
    const cache = await caches.open("lc-share");
    for (const k of await cache.keys()) await cache.delete(k);
    let i = 0;
    for (const f of files) await cache.put(new Request(SCOPE + "__share/" + (i++)), new Response(f, { headers: { "Content-Type": f.type || "image/jpeg", "X-Name": encodeURIComponent(f.name || "shared.jpg") } }));
  } catch (e) {}
  return Response.redirect(new URL(SCOPE + "?share=1", self.location.origin).href, 303);
}
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method === "POST" && new URL(req.url).origin === self.location.origin && new URL(req.url).pathname === SHARE) { event.respondWith(receiveShare(req)); return; }
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE) || SKIP.some((p) => url.pathname.startsWith(p))) return;
  event.respondWith(fetch(req));
});
`;
}

function pwa(appEnv) {
  const env = PWA[appEnv] ? appEnv : "prod";
  let base = "/";
  const manifest = () => JSON.stringify({
    id: base, name: PWA[env].name, short_name: PWA[env].short_name,
    start_url: base, scope: base, display: "standalone",
    // v2.11.0 F8: appear in Android's share sheet for images (handled by sw.js, then the in-app "What is this?" picker)
    share_target: { action: base + "share-target", method: "POST", enctype: "multipart/form-data", params: { title: "title", text: "text", files: [{ name: "images", accept: ["image/*"] }] } },
    theme_color: "#0f172a", background_color: "#ffffff",
    icons: [
      { src: base + PWA[env].icons + "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: base + PWA[env].icons + "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: base + PWA[env].icons + "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }, null, 2);
  // prod's scope contains /beta/ and /build/: leave those to their own service workers
  const sw = () => swSource(base, env === "prod" ? [base + "beta/", base + "build/"] : []);
  return {
    name: "pwa",
    configResolved(config) { base = config.base; },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || "").split("?")[0];
        if (path === base + "manifest.webmanifest") { res.setHeader("Content-Type", "application/manifest+json"); res.end(manifest()); return; }
        if (path === base + "sw.js") { res.setHeader("Content-Type", "text/javascript"); res.end(sw()); return; }
        next();
      });
    },
    transformIndexHtml(html) {
      return html.replace(/<link rel="manifest" href="data:[^"]*">/,
        '<link rel="manifest" href="' + base + 'manifest.webmanifest">\n' +
        '  <link rel="apple-touch-icon" href="' + base + PWA[env].icons + 'apple-touch-icon.png">\n' +
        '  <link rel="icon" href="' + base + 'brand/favicon.ico" sizes="any">\n' +
        '  <link rel="icon" type="image/png" sizes="48x48" href="' + base + 'brand/favicon-48.png">\n' +
        '  <meta name="apple-mobile-web-app-title" content="' + PWA[env].short_name + '">');
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "manifest.webmanifest", source: manifest() });
      this.emitFile({ type: "asset", fileName: "sw.js", source: sw() });
    },
  };
}

export default defineConfig(({ mode }) => ({
  // "next" mode = preview build served from /Life-Care/next/ ; otherwise production /Life-Care/
  base: mode === "next" ? "/Life-Care/next/" : "/Life-Care/",
  plugins: [react(), appGuide(), planJson(), envHtml(loadEnv(mode, process.cwd(), "VITE_").VITE_APP_ENV), pwa(loadEnv(mode, process.cwd(), "VITE_").VITE_APP_ENV), csp()],
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 3000 },
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
}));
