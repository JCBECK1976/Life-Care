// v2.60.0 (Architect, 26 Nov "Show steps in the day"): read-only views of the steps already stored on the person
// (p.dailyActivity[YYYY-MM-DD] = { steps, activeKcal?, source }, from Health Connect / HealthKit). No new permissions.
import { dayCredit, isoDay, weekDates } from "./calories.js";

var n = function(x) { return Math.round(x).toLocaleString("en-GB"); };
/** Has this person ever had steps synced (so "—" means "none that day", not "not set up")? */
export function stepsSetUp(p) { return !!(p && p.dailyActivity && Object.keys(p.dailyActivity).length); }
/** One day: { steps, kcal (the steps' share of the exercise credit), active (active calories, if that toggle is on) } or null. */
export function stepsDay(p, date) {
  var a = p && p.dailyActivity && p.dailyActivity[date]; if (!a || a.steps == null || !isFinite(parseFloat(a.steps))) return null;
  var c = dayCredit(p, date);
  return { steps: parseFloat(a.steps), kcal: c.mode === "parts" ? c.steps : null, active: a.activeKcal != null && isFinite(parseFloat(a.activeKcal)) ? Math.round(parseFloat(a.activeKcal)) : null, source: a.source || "" };
}
/** "6,240 steps · +180 kcal" (· "active 320 kcal" when active calories are on). */
export function stepsText(d) {
  if (!d) return "";
  var parts = [n(d.steps) + " steps"];
  if (d.kcal != null) parts.push("+" + n(d.kcal) + " kcal");
  if (d.active != null) parts.push("active " + n(d.active) + " kcal");
  return parts.join(" · ");
}
/** The week (Sun–Sat) containing `now`: each day's steps (null when none/future), the total and the daily average over
 *  the days up to today that have steps. */
export function stepsWeek(p, now) {
  now = now || new Date(); var today = isoDay(now);
  var days = weekDates(now).map(function(d) { var v = d <= today ? stepsDay(p, d) : null; return { date: d, steps: v ? v.steps : null, future: d > today }; });
  var had = days.filter(function(d) { return d.steps != null; });
  var total = had.reduce(function(s, d) { return s + d.steps; }, 0);
  return { days: days, total: total, avg: had.length ? Math.round(total / had.length) : null, count: had.length };
}
/** A short line for every Companion (null when steps were never set up). */
export function stepsCtx(p, now) {
  if (!stepsSetUp(p)) return null;
  now = now || new Date();
  var t = stepsDay(p, isoDay(now)), w = stepsWeek(p, now);
  var y = new Date(now); y.setDate(y.getDate() - 1); var yd = stepsDay(p, isoDay(y));
  return "STEPS (from the phone's health app, read-only): today " + (t ? n(t.steps) + (t.kcal != null ? " (≈ +" + n(t.kcal) + " kcal credit)" : "") : "none yet")
    + (yd ? "; yesterday " + n(yd.steps) : "") + (w.avg != null ? "; this week " + n(w.total) + " over " + w.count + " day" + (w.count === 1 ? "" : "s") + " (average " + n(w.avg) + "/day)" : "")
    + ". You may mention steps when they help (e.g. a walk to add some movement), briefly.";
}
