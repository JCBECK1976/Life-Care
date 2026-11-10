// v2.7.0 Restore: accept the Download-backup file, a Firebase console export (of the root or of "data"), or the
// bare exercise data that Restore took before. Nothing here writes; it only reads the pasted text.
export function parseBackupInput(text) {
  var obj = JSON.parse(text);
  if (!obj || typeof obj !== "object") throw new Error("Not a backup file");
  var dataRoot = null, buildRoot = null, kind = "";
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) { dataRoot = obj.data; buildRoot = obj.data_build || null; kind = "backup file (data" + (buildRoot ? " + data_build" : "") + ")"; }
  else if (obj["dashboard:data"] !== undefined) { dataRoot = obj; kind = "export of data"; }
  var dash = null;
  if (dataRoot && dataRoot["dashboard:data"] !== undefined) { var d = dataRoot["dashboard:data"]; dash = typeof d === "string" ? JSON.parse(d) : d; }
  else if (obj.jc || obj.becks) { dash = obj; kind = "exercise data only"; }
  if (!dataRoot && !dash) throw new Error("This doesn't look like a Lifecare backup");
  return { kind: kind, dataRoot: dataRoot, buildRoot: buildRoot, dash: dash };
}

export function backupCounts(p) {
  var c = { keys: p.dataRoot ? Object.keys(p.dataRoot).length : 0, mealWeeks: 0, people: [], exerciseWeeks: 0 };
  if (p.dataRoot) c.mealWeeks = Object.keys(p.dataRoot).filter(function(k) { return /^(mealplan|eat_children):/.test(k); }).length;
  if (p.dash) Object.keys(p.dash).forEach(function(k) {
    var ex = p.dash[k] && p.dash[k].exercises; if (!ex) return; c.people.push(k);
    Object.keys(ex).forEach(function(day) { (ex[day] || []).forEach(function(e) { c.exerciseWeeks += (e.prog || []).length; }); });
  });
  return c;
}

// Full restore writes the REAL data on Beta/Prod; on Build it writes the build copy.
export function restoreTarget(env) { return env === "build" ? "data_build" : "data"; }
