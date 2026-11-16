// v2.18.3 (JC, 14 Nov): one-off, idempotent refresh of STORED selection ratings for the CURRENT and FUTURE weeks only,
// against each person's goal and personal limits. Past weeks keep their history as recorded. Runs once per person
// (after their goal setup is complete); a second run changes nothing.
import firebase, { DATA_ROOT } from "./firebase.js";
import { sGet, sSet } from "./storage.js";
import { refreshDocRatings, ymd } from "./children.js";
import { personalLimits } from "./goals.js";

export var FLAG_KEY = "ratings_refresh_v2183";
export function currentSunday(now) { var d = new Date(now || Date.now()); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return ymd(d); }

/** Re-rate one person's current and future weeks. Returns { weeks, changed }. */
export async function refreshPersonWeeks(person, p, now) {
  var limits = personalLimits(p); if (!limits) return { weeks: 0, changed: 0, skipped: true };
  var prefix = "eat_children:" + person + ":";
  var snap = await firebase.database().ref(DATA_ROOT).orderByKey().startAt(prefix + currentSunday(now)).endAt(prefix + "").once("value");
  var weeks = 0, changed = 0, writes = [];
  snap.forEach(function(ch) {
    var raw = ch.val(); var doc; try { doc = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (e) { return; }
    weeks++;
    var n = refreshDocRatings(doc, limits);
    if (n) { changed += n; writes.push(sSet(ch.key, JSON.stringify(doc))); }
  });
  await Promise.all(writes);
  return { weeks: weeks, changed: changed };
}

/** On load: each person not yet refreshed (and with a complete goal setup) is refreshed once. */
export async function refreshRatingsOnce(data, now) {
  var done = {}; try { var raw = await sGet(FLAG_KEY); done = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {}; } catch (e) { done = {}; }
  var people = Object.keys(data || {}).filter(function(k) { return k !== "config" && data[k] && !done[k] && personalLimits(data[k]); });
  if (!people.length) return { people: 0 };
  for (var i = 0; i < people.length; i++) { await refreshPersonWeeks(people[i], data[people[i]], now); done[people[i]] = ymd(new Date(now || Date.now())); }
  await sSet(FLAG_KEY, JSON.stringify(done));
  return { people: people.length };
}
