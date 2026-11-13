// v2.16.2 R4: Google Health API — daily TOTAL calories burned for the Sun–Sat week. Rebuilt from the v1 code:
// - the access token stays ON THIS DEVICE only (memory + localStorage, per person), never in the database;
// - honest status: every HTTP error is reported (401/403 = "expired — reconnect"), "✓ Synced" only when data came back;
// - only daily totals are stored (per person: googleDaily["YYYY-MM-DD"] = { kcal, at }), kept 12 months.
// The data type name and response fields are NOT yet verified against the live API (J10: Google Cloud setup).
// They are kept in one place (GH) so the check after J10 is a one-line change.
import { isoDay, weekDates } from "./calories.js";

export var GH = {
  base: "https://health.googleapis.com/v4/users/me/dataTypes/",
  totalCalories: "total-calories",                       // TO VERIFY at J10
  scope: "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
};
var KEY = function(person) { return "lc_gh_token_" + person; };

export function saveToken(person, token, expiresInSec) {
  try { localStorage.setItem(KEY(person), JSON.stringify({ token: token, exp: Date.now() + (expiresInSec || 3600) * 1000 })); } catch (e) { /* private mode: memory only */ }
}
export function loadToken(person) {
  try { var t = JSON.parse(localStorage.getItem(KEY(person)) || "null"); return t && t.exp > Date.now() + 60000 ? t : null; } catch (e) { return null; }
}
export function forgetToken(person) { try { localStorage.removeItem(KEY(person)); } catch (e) { /* ignore */ } }

/** Status shown in Settings, from the token on this device and the last sync stored for the person. */
export function ghStatus(person, p) {
  var t = loadToken(person); var last = p && p.googleSync;
  var s = { connected: !!t, minutesLeft: t ? Math.round((t.exp - Date.now()) / 60000) : 0, lastSync: last || null };
  s.text = t ? "Connected on this device (about " + s.minutesLeft + " min left)" : "Not connected on this device";
  if (last && last.error) s.text += " · Last sync failed: " + last.error;
  else if (last && last.at) s.text += " · Last sync " + last.at + ": " + last.days + " day(s) read";
  return s;
}

function num(v) {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object") { for (var k of ["kcal", "kilocalories", "floatValue", "doubleValue", "intValue", "value"]) { if (typeof v[k] === "number") return v[k]; } for (var k2 in v) { var n = num(v[k2]); if (n != null) return n; } }
  return null;
}
/** Sum data points into daily totals by local date. Accepts `dataPoints` or `dataPoint` arrays. */
export function dailyTotals(json) {
  var pts = (json && (json.dataPoints || json.dataPoint)) || [];
  var out = {};
  pts.forEach(function(pt) {
    var start = pt.startTime || (pt.interval && pt.interval.startTime) || pt.time;
    var kcal = num(pt.value != null ? pt.value : pt);
    if (!start || kcal == null) return;
    var d = isoDay(new Date(start)); out[d] = (out[d] || 0) + kcal;
  });
  return out;
}

/** Fetch this week's daily totals. Throws Error with a plain message on any failure. */
export async function fetchWeekCalories(token, date, fetchImpl) {
  var days = weekDates(date);
  var from = days[0] + "T00:00:00Z", to = days[6] + "T23:59:59Z";
  var url = GH.base + GH.totalCalories + "/dataPoints?pageSize=500&filter=" + encodeURIComponent('interval.start_time >= "' + from + '" AND interval.start_time <= "' + to + '"');
  var resp = await (fetchImpl || fetch)(url, { headers: { Authorization: "Bearer " + token } });
  if (resp.status === 401 || resp.status === 403) { var e = new Error("Google session expired or not allowed — reconnect"); e.expired = true; throw e; }
  if (!resp.ok) throw new Error("Google Health returned HTTP " + resp.status);
  var totals = dailyTotals(await resp.json());
  Object.keys(totals).forEach(function(d) { if (days.indexOf(d) < 0) delete totals[d]; });
  return totals;
}

/** Merge daily totals into the person's record; drop days older than 12 months (retention). */
export function mergeDaily(p, totals, now) {
  if (!p.googleDaily) p.googleDaily = {};
  var at = new Date(now || Date.now()).toISOString();
  Object.keys(totals).forEach(function(d) { p.googleDaily[d] = { kcal: Math.round(totals[d]), at: at }; });
  var cutoff = isoDay(new Date((now || Date.now()) - 365 * 86400000));
  Object.keys(p.googleDaily).forEach(function(d) { if (d < cutoff) delete p.googleDaily[d]; });
  return p.googleDaily;
}
