// v2.21.0 (N1): the native build guard. Checks the web files bundled into the Android app before Gradle packages them.
// release: prod web build, data root "data", no data_build, no service worker registration, no build/beta labels.
// debug:   build web build, data root "data_build".
// Usage: node scripts/check-native.mjs release|debug <bundled web dir>
import fs from "node:fs";
import path from "node:path";
const [variant, dir] = process.argv.slice(2);
const fail = (m) => { console.error("FAIL: native " + variant + ": " + m); console.log("::error title=native " + variant + " check failed::" + m); process.exitCode = 1; };
const ok = (m) => console.log("ok:   native " + variant + " " + m);
if (!fs.existsSync(path.join(dir, "index.html"))) { fail("index.html missing in " + dir); process.exit(1); }
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const assets = path.join(dir, "assets");
const js = fs.existsSync(assets) ? fs.readdirSync(assets).filter((f) => f.endsWith(".js")).map((f) => fs.readFileSync(path.join(assets, f), "utf8")).join("\n") : "";
if (!js) fail("no bundled JavaScript");
if (/\/src\/main\.jsx/.test(html)) fail("index.html is unbuilt source");
/src="\.\/assets\//.test(html) ? ok("uses relative asset paths") : fail("asset paths are not relative (built without --base ./)");
const usesBuild = /data_build/.test(js);
if (variant === "release") {
  usesBuild ? fail("bundle refers to data_build — a release must use the real data (data)") : ok("data root is data");
  /BUILD|BETA/.test(html.match(/<title>[^<]*<\/title>/)?.[0] || "") ? fail("title has a BUILD/BETA label") : ok("prod title");
  /noindex/.test(html) ? fail("prod page has noindex (built as beta/build)") : ok("prod web build");
  /\d+-[a-z0-9]+\.apps\.googleusercontent\.com/.test(js) ? ok("Google sign-in client ID set") : fail("no Google sign-in client ID (set VITE_GOOGLE_WEB_CLIENT_ID; JC step: repository variable GOOGLE_WEB_CLIENT_ID)");
} else if (variant === "debug") {
  usesBuild ? ok("data root is data_build") : fail("debug bundle doesn't use data_build — debug builds must never touch the real data");
} else fail("unknown variant");
if (!fs.existsSync(path.join(dir, "APP_GUIDE.md"))) fail("APP_GUIDE.md missing (Help reads it)"); else ok("APP_GUIDE.md");
if (process.exitCode) process.exit(1);
