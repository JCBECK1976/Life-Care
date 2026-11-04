import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";

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
// It caches nothing. It only passes this app's own GET requests straight to the network and
// leaves everything else alone (Firebase, Anthropic, Google, fonts, other environments).
const SCOPE = ${JSON.stringify(scope)};
const SKIP = ${JSON.stringify(skip)};
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const req = event.request;
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
  plugins: [react(), appGuide(), envHtml(loadEnv(mode, process.cwd(), "VITE_").VITE_APP_ENV), pwa(loadEnv(mode, process.cwd(), "VITE_").VITE_APP_ENV)],
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 3000 },
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
}));
