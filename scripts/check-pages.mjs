// Checks the assembled Pages artifact before it is deployed.
// Prod is strict: any prod problem exits 1, so nothing is deployed.
// Beta/build: a problem removes that environment's folder (it is not deployed), is reported
// loudly (log, GitHub annotation, job summary), and prod still deploys.
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2];
const summary = process.env.GITHUB_STEP_SUMMARY;
const note = (line) => { if (summary) fs.appendFileSync(summary, line + "\n"); };
const ok = (m) => console.log("ok:   " + m);
const read = (p) => fs.readFileSync(path.join(out, p), "utf8");
const exists = (p) => fs.existsSync(path.join(out, p));
const jsOf = (dir) => {
  const a = path.join(out, dir, "assets");
  return fs.existsSync(a) ? fs.readdirSync(a).filter((f) => f.endsWith(".js")).map((f) => fs.readFileSync(path.join(a, f), "utf8")).join("\n") : "";
};

// Installable app (v2.4.0+): if an environment has a manifest, it must be complete and correct.
// Not required, so a rollback to the legacy single file still deploys.
const NAMES = { prod: "Lifecare Companion", beta: "Lifecare BETA", build: "Lifecare BUILD" };
function checkPwa(env, dir, base) {
  const p = [];
  if (!exists(path.join(dir, "manifest.webmanifest"))) return p;
  let m;
  try { m = JSON.parse(read(path.join(dir, "manifest.webmanifest"))); } catch { return [env + " manifest is not valid JSON"]; }
  if (m.name !== NAMES[env]) p.push(env + " manifest name is " + JSON.stringify(m.name));
  for (const k of ["id", "start_url", "scope"]) if (m[k] !== base) p.push(env + " manifest " + k + " is " + JSON.stringify(m[k]) + ", expected " + base);
  if (m.display !== "standalone") p.push(env + " manifest display is not standalone");
  const icons = m.icons || [];
  if (!icons.some((i) => i.sizes === "192x192") || !icons.some((i) => i.sizes === "512x512") || !icons.some((i) => i.purpose === "maskable")) p.push(env + " manifest icons incomplete");
  for (const i of icons) if (!i.src.startsWith(base) || !exists(path.join(dir, i.src.slice(base.length)))) p.push(env + " icon missing: " + i.src);
  if (!exists(path.join(dir, "sw.js"))) p.push(env + " sw.js missing");
  else if (!read(path.join(dir, "sw.js")).includes("const SCOPE = " + JSON.stringify(base))) p.push(env + " sw.js scope is wrong");
  if (p.length === 0) ok(env + " installable app (manifest, icons, sw.js)");
  return p;
}

// ---- prod (root): strict
const prodProblems = [];
for (const f of ["index.html", "APP_GUIDE.md", "legacy.html"]) exists(f) ? ok("prod " + f) : prodProblems.push("prod " + f + " missing");
if (exists("index.html")) {
  const html = read("index.html");
  /noindex/.test(html) ? prodProblems.push("prod has noindex") : ok("prod is indexable");
  if (/\/src\/main\.jsx/.test(html)) prodProblems.push("prod index.html is unbuilt source");
  if (/data_build/.test(jsOf("."))) prodProblems.push("prod bundle refers to data_build");
}
prodProblems.push(...checkPwa("prod", ".", "/Life-Care/"));
if (prodProblems.length) {
  for (const p of prodProblems) { console.error("FAIL: " + p); console.log("::error title=prod check failed::" + p + ". Nothing was deployed."); }
  note("- ❌ **prod checks failed**: " + prodProblems.join("; ") + ". Nothing was deployed.");
  process.exit(1);
}
note("- ✅ prod checks passed");

// ---- beta and build: skip on failure, never block prod
for (const env of ["beta", "build"]) {
  if (!exists(env)) { console.log("note: " + env + " not in the artifact (no branch, or skipped earlier)"); continue; }
  const problems = [];
  for (const f of ["index.html", "APP_GUIDE.md"]) exists(env + "/" + f) ? ok(env + " " + f) : problems.push(env + " " + f + " missing");
  if (exists(env + "/legacy.html")) problems.push(env + " has legacy.html (root only)");
  const html = exists(env + "/index.html") ? read(env + "/index.html") : "", js = jsOf(env);
  // Branches made before v2.1.0 have no environment support yet: report, don't skip.
  const envAware = /VITE_APP_ENV|env-badge/.test(js) || /noindex/.test(html);
  if (!envAware) {
    console.log("note: " + env + " code predates v2.1.0 (no badge/noindex yet)");
  } else {
    /noindex/.test(html) ? ok(env + " noindex") : problems.push(env + " missing noindex");
    html.includes("<title>" + env.toUpperCase() + " · ") ? ok(env + " tab title prefix") : problems.push(env + " tab title prefix missing");
    const usesBuildData = /data_build/.test(js);
    if (env === "build") usesBuildData ? ok("build uses data_build") : problems.push("build does not use data_build");
    else usesBuildData ? problems.push("beta refers to data_build") : ok("beta uses data");
  }
  problems.push(...checkPwa(env, env, "/Life-Care/" + env + "/"));
  if (problems.length) {
    fs.rmSync(path.join(out, env), { recursive: true, force: true });
    console.log("\n##################################################################");
    console.log("### " + env + " NOT DEPLOYED: " + problems.join("; "));
    console.log("### Prod is unaffected and still deploys.");
    console.log("##################################################################");
    console.log("::error title=" + env + " environment skipped::" + problems.join("; ") + ". Prod still deploys.");
    note("- ❌ **" + env + " skipped** (checks failed): " + problems.join("; ") + ". Prod still deployed.");
  } else {
    note("- ✅ " + env + " checks passed");
  }
}
process.exit(0);
