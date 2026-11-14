// v2.17.1 Home "Week so far: Plan vs Actual". Week to date = Sunday → yesterday (complete days only);
// today is shown separately as "in progress"; future days never count.
import { WEEKDAY, dayBudget, dayFoodKcal, exerciseOn, isoDay, weekDates } from "./calories.js";

export function ragOf(devPct) { return devPct <= 10 ? "green" : devPct <= 20 ? "amber" : "red"; }
export function ragOfPct(pct) { return pct >= 90 ? "green" : pct >= 80 ? "amber" : "red"; }

export function weekSoFar(p, doc, now) {
  now = new Date(now || Date.now());
  var dates = weekDates(now); var ti = now.getDay();
  var days = dates.slice(0, ti).map(function(d) {
    var food = dayFoodKcal(doc, d); var b = dayBudget(p, d, food); var ex = exerciseOn(p, d);
    var dev = food > 0 ? Math.abs(food - b.target) / b.target * 100 : 100;          // nothing logged = off track
    return { date: d, weekday: WEEKDAY[new Date(d + "T12:00:00").getDay()], food: food, target: b.target, devPct: Math.round(dev), eatRag: food > 0 ? ragOf(dev) : "none",
      exPlanned: ex.planned > 0, exDone: ex.done.length > 0 };
  });
  var eatPct = days.length ? Math.round(days.reduce(function(s, d) { return s + Math.max(0, 100 - d.devPct); }, 0) / days.length) : null;
  var planned = days.filter(function(d) { return d.exPlanned; });
  var exPct = planned.length ? Math.round(planned.filter(function(d) { return d.exDone; }).length / planned.length * 100) : null;
  var parts = [eatPct, exPct].filter(function(x) { return x != null; });
  var overall = parts.length ? Math.round(parts.reduce(function(a, b) { return a + b; }, 0) / parts.length) : null;
  var todayDate = isoDay(now); var tf = dayFoodKcal(doc, todayDate); var tb = dayBudget(p, todayDate, tf); var tex = exerciseOn(p, todayDate);
  var explain = overall == null ? "Your week starts today — the on-track view begins tomorrow."
    : "Eating " + (eatPct == null ? "—" : eatPct + "% on track") + (exPct == null ? "" : " · exercise " + planned.filter(function(d) { return d.exDone; }).length + " of " + planned.length + " sessions") + " (Sunday to yesterday).";
  return { days: days, eatPct: eatPct, exPct: exPct, overall: overall, rag: overall == null ? "none" : ragOfPct(overall), explain: explain,
    today: { date: todayDate, food: tf, target: tb.target, exPlanned: tex.planned > 0, exDone: tex.done.length } };
}
