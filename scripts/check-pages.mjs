// Checks the assembled Pages artifact before it is deployed. Fails the deploy on any problem.
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2];
let failed = false;
const fail = (m) => { console.error("FAIL: " + m); failed = true; };
const ok = (m) => console.log("ok:   " + m);
const read = (p) => fs.readFileSync(path.join(out, p), "utf8");
const exists = (p) => fs.existsSync(path.join(out, p));
const jsOf = (dir) => {
  const a = path.join(out, dir, "assets");
  return fs.existsSync(a) ? fs.readdirSync(a).filter((f) => f.endsWith(".js")).map((f) => fs.readFileSync(path.join(a, f), "utf8")).join("\n") : "";
};

// Prod (root) must always be there, with Help's guide and the rollback page.
for (const f of ["index.html", "APP_GUIDE.md", "legacy.html"]) exists(f) ? ok("prod " + f) : fail("prod " + f + " missing");
if (exists("index.html")) {
  const html = read("index.html");
  /noindex/.test(html) ? fail("prod has noindex") : ok("prod is indexable");
  if (/\/src\/main\.jsx/.test(html)) fail("prod index.html is unbuilt source");
  const js = jsOf(".");
  if (js && /data_build/.test(js)) fail("prod bundle refers to data_build");
}

for (const env of ["beta", "build"]) {
  if (!exists(env)) { console.log("note: " + env + " not built (branch missing)"); continue; }
  for (const f of ["index.html", "APP_GUIDE.md"]) exists(env + "/" + f) ? ok(env + " " + f) : fail(env + " " + f + " missing");
  if (exists(env + "/legacy.html")) fail(env + " has legacy.html (root only)");
  const html = read(env + "/index.html"), js = jsOf(env);
  // Branches made before v2.1.0 have no environment support yet: report, don't block prod.
  const envAware = /VITE_APP_ENV|env-badge/.test(js) || /noindex/.test(html);
  if (!envAware) { console.log("note: " + env + " code predates v2.1.0 (no badge/noindex yet)"); continue; }
  /noindex/.test(html) ? ok(env + " noindex") : fail(env + " missing noindex");
  html.includes("<title>" + env.toUpperCase() + " · ") ? ok(env + " tab title prefix") : fail(env + " tab title prefix missing");
  const usesBuildData = /data_build/.test(js);
  if (env === "build") usesBuildData ? ok("build uses data_build") : fail("build does not use data_build");
  else usesBuildData ? fail("beta refers to data_build") : ok("beta uses data");
}
process.exit(failed ? 1 : 0);
