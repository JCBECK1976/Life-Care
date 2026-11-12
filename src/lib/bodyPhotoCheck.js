// v2.14.2: body photos must be recognised before anything is analysed or saved (same idea as "no food" in v2.14.1).
// The AI returns one entry per photo: isPerson, isFullBody (Body balance) / the expected body area (Body Type), pose and
// matchesPose. Any photo that fails gets its own message, NO scores or analysis are shown for the set, Save is disabled
// (Retake and Cancel only) and nothing is saved. Replies without a "photos" list are treated as before (older replies).
export var BALANCE_POSES = ["front", "side", "back"];
export var BODY_TYPE_POSES = ["front relaxed", "bicep flex", "side profile", "back", "quad flex", "calf raise"];

export function balanceCheckRule(n) {
  var order = BALANCE_POSES.slice(0, Math.max(1, Math.min(n || 3, 3))).map(function(p, i) { return "photo " + (i + 1) + " = " + p.toUpperCase(); }).join(", ");
  return "FIRST check every photo, in the order sent (" + order + "): isPerson (a real person's body is shown), isFullBody (head to feet visible), pose (front, side, back or other) and matchesPose (true only if it is the requested pose). " +
    "Add \"photos\":[{\"photo\":1,\"isPerson\":true,\"isFullBody\":true,\"pose\":\"front\",\"matchesPose\":true}, …one per photo] to the JSON. If ANY photo fails a check, return the photos list and leave scores empty. ";
}
export function bodyTypeCheckRule() {
  return "FIRST check every photo: isPerson (a real person's body is shown), pose (which of these it is: " + BODY_TYPE_POSES.join(", ") + ", or other) and matchesPose (true only if it is one of those poses with the needed body part clearly visible). " +
    "Add \"photos\":[{\"photo\":1,\"isPerson\":true,\"pose\":\"front relaxed\",\"matchesPose\":true}, …one per photo] to the JSON. If ANY photo fails a check, return the photos list and leave the other fields empty. ";
}

var bad = function(v) { return v === false || v === "false"; };
// [{ photo: 1, msg }] for every photo that failed; [] when all passed (or the reply has no photos list).
export function photoIssues(a, n, kind) {
  var list = a && Array.isArray(a.photos) ? a.photos : null; if (!list) return [];
  var out = [];
  for (var i = 0; i < (n || list.length); i++) {
    var p = list.find(function(x) { return x && Number(x.photo) === i + 1; }) || list[i];
    var expect = kind === "balance" ? BALANCE_POSES[i] || "full-body" : null;
    var failed = !p || bad(p.isPerson) || bad(p.matchesPose) || (kind === "balance" && bad(p.isFullBody));
    if (failed) out.push({ photo: i + 1, msg: kind === "balance" ? "This doesn't look like a full-body " + expect + " photo — please retake it" : "This doesn't look like one of the requested body photos (" + BODY_TYPE_POSES.join(", ") + ") — please retake it" });
  }
  return out;
}
export function looseJson(text) {
  var m = String(text || "").replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
  if (!m) return null; try { return JSON.parse(m[0]); } catch (e) { return null; }
}
