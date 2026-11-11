// v2.12.0 F2 Body balance — ANALYSE-AND-DISCARD (JC, 11 Nov; supersedes the Storage decision of 06:25).
// Photos are read in memory, sent to the AI, and never stored anywhere (not the database, not Storage, not backups).
// Only a STRUCTURED analysis is kept, under progressPhotos: { date, week, pose, scores, notes, flags, summary }.
// The next check gets the previous structured analysis + measurement trends and scores the same checklist.
export var REGIONS = [
  { k: "upperChest", l: "Upper chest" }, { k: "lowerChest", l: "Lower chest" }, { k: "shoulders", l: "Shoulders" },
  { k: "shoulderWaist", l: "Shoulder : waist ratio" }, { k: "armsLR", l: "Left / right arm symmetry" },
  { k: "back", l: "Back (lats, upper back)" }, { k: "core", l: "Core / waist" }, { k: "glutes", l: "Glutes" },
  { k: "quads", l: "Quads" }, { k: "calves", l: "Calves" },
];
export var CHECK_EVERY_DAYS = 28;

// v2.12.1 one-off cleanup (idempotent): older Body Type Photos entries kept the first 500 characters of the image's
// base64 as "thumbnail". Remove that field only; date, name, type and everything else stay. Returns true if changed.
export function stripPhotoFragments(d) {
  var changed = false;
  Object.keys(d || {}).forEach(function(k) {
    var arr = d[k] && Array.isArray(d[k].bodyPhotos) ? d[k].bodyPhotos : null; if (!arr) return;
    arr.forEach(function(ph) { if (ph && Object.prototype.hasOwnProperty.call(ph, "thumbnail")) { delete ph.thumbnail; changed = true; } });
  });
  return changed;
}

// "chest: 98 → 101 (wk 3 → wk 15)" per measurement type, oldest vs latest
export function measurementTrends(measurements) {
  var out = [];
  Object.keys(measurements || {}).forEach(function(k) {
    var arr = (measurements[k] || []).filter(function(e) { return e && e.value != null && e.value !== ""; });
    if (!arr.length) return;
    var a = arr[0], b = arr[arr.length - 1];
    out.push(k + ": " + a.value + (arr.length > 1 ? " → " + b.value + " (wk " + (a.week || "?") + " → wk " + (b.week || "?") + ")" : " (wk " + (a.week || "?") + ")"));
  });
  return out;
}

export function buildPrompt(o) {
  var list = REGIONS.map(function(r) { return r.k + " (" + r.l + ")"; }).join(", ");
  var prev = o.prev ? "PREVIOUS CHECK (" + o.prev.date + ", week " + o.prev.week + "): scores " + JSON.stringify(o.prev.scores) + "; notes " + JSON.stringify(o.prev.notes || {}) + "." : "This is the FIRST check: there is nothing to compare with yet, so leave \"changes\" empty.";
  return "You are a strength coach assessing body BALANCE from progress photos of " + (o.name || "the user") + " (front, side and back poses; identify which pose each photo is). " +
    "Score EVERY item of this fixed checklist from 1 (clearly under-developed relative to the rest of the body) to 5 (clearly well developed), with a short note each: " + list + ". " +
    "For armsLR score symmetry (5 = symmetrical) and say which side is behind if not. For shoulderWaist score the V-taper ratio. " +
    prev + " " +
    (o.trends && o.trends.length ? "MEASUREMENT TRENDS (tape): " + o.trends.join("; ") + ". Use them alongside the photos; tape measurements cannot separate upper and lower chest. " : "No tape measurements yet. ") +
    "Then flag any region developing disproportionately fast or slow, or a left/right imbalance, with ONE suggested training adjustment each (exercise swap, emphasis or volume). Suggestions only: never tell them to change their plan automatically. " +
    "Return ONLY JSON: {\"poses\":[\"front\",\"side\",\"back\"],\"scores\":{\"upperChest\":{\"score\":1-5,\"note\":\"short\"},...every checklist key...},\"changes\":[{\"region\":\"key\",\"from\":n,\"to\":n,\"note\":\"short\"}],\"flags\":[{\"region\":\"key\",\"issue\":\"short\",\"suggestion\":\"one training adjustment\"}],\"summary\":\"two sentences\"}";
}

// Validate the AI's answer: every checklist key must have a 1–5 score. Returns a clean analysis or throws.
export function parseAnalysis(text) {
  var m = String(text || "").replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
  if (!m) throw new Error("The analysis came back in a form I couldn't read — please try again");
  var a; try { a = JSON.parse(m[0]); } catch (e) { throw new Error("The analysis came back in a form I couldn't read — please try again"); }
  var scores = {}, notes = {};
  REGIONS.forEach(function(r) {
    var s = a.scores && a.scores[r.k]; var n = Math.round(parseFloat(s && (s.score != null ? s.score : s)));
    if (!(n >= 1 && n <= 5)) throw new Error("The analysis missed " + r.l + " — please try again");
    scores[r.k] = n; notes[r.k] = String((s && s.note) || "").slice(0, 160);
  });
  var keyOk = function(x) { return REGIONS.some(function(r) { return r.k === x; }); };
  return {
    poses: (Array.isArray(a.poses) ? a.poses : []).map(String).filter(function(p) { return /^(front|side|back)$/.test(p); }),
    scores: scores, notes: notes,
    changes: (Array.isArray(a.changes) ? a.changes : []).filter(function(c) { return c && keyOk(c.region); }).map(function(c) { return { region: c.region, from: parseFloat(c.from) || null, to: parseFloat(c.to) || null, note: String(c.note || "").slice(0, 160) }; }),
    flags: (Array.isArray(a.flags) ? a.flags : []).filter(function(f) { return f && keyOk(f.region); }).map(function(f) { return { region: f.region, issue: String(f.issue || "").slice(0, 160), suggestion: String(f.suggestion || "").slice(0, 200), accepted: false }; }),
    summary: String(a.summary || "").slice(0, 400),
  };
}

// The ONLY thing saved: text and numbers. `analysis` keeps the existing prompts (Home check-in) working.
export function makeRecord(an, week, now) {
  var d = now || new Date();
  return { date: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"), week: week,
    pose: (an.poses.length ? an.poses : ["unspecified"]).join("+"), scores: an.scores, notes: an.notes, changes: an.changes, flags: an.flags, summary: an.summary, analysis: an.summary };
}

export function latestStructured(records) { var r = (records || []).filter(function(x) { return x && x.scores; }); return r.length ? r[r.length - 1] : null; }
export function nextDue(rec) { if (!rec) return null; var d = new Date(rec.date + "T12:00:00"); d.setDate(d.getDate() + CHECK_EVERY_DAYS); return d; }
