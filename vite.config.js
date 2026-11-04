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

export default defineConfig(({ mode }) => ({
  // "next" mode = preview build served from /Life-Care/next/ ; otherwise production /Life-Care/
  base: mode === "next" ? "/Life-Care/next/" : "/Life-Care/",
  plugins: [react(), appGuide(), envHtml(loadEnv(mode, process.cwd(), "VITE_").VITE_APP_ENV)],
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 3000 },
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
}));
