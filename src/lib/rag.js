// v2.6.5 D11 (approved by JC 10 Nov): portion-based RAG, calculated by fixed rules in code.
// The AI only identifies the food and its nutrition (including addedSugar); the rating comes from here.
// Score = the higher of satFat ÷ 20g and addedSugar ÷ 25g for ONE portion (both people's daily limits).
export var LIMITS = { satFat: 20, addedSugar: 25 };
export var KCAL_TARGET = { jc: 2100, becks: 1800 };   // mid-points of 2000–2200 and 1700–1900
export var FREQ_LABEL = { GREAT: "any day", GOOD: "daily", AMBER: "a few times a week", "RED-weekly": "weekly treat", "RED-monthly": "monthly treat" };
var ORDER = ["GREAT", "GOOD", "AMBER", "RED-weekly", "RED-monthly"];

var num = function(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; };

// Returns { rating, ragFreq, band, freqLabel, score, reason }. rating stays GREAT/GOOD/AMBER/RED for existing screens;
// ragFreq ("weekly" | "monthly") tells the two RED bands apart.
export function rateByPortion(item) {
  var sf = num(item.satFat), su = num(item.addedSugar);
  var score = Math.max(sf / LIMITS.satFat, su / LIMITS.addedSugar);
  var kcalShare = Math.max(num(item.jcKcal || item.kcal) / KCAL_TARGET.jc, num(item.beckKcal || item.kcal) / KCAL_TARGET.becks);
  var idx = score <= 0.10 ? 0 : score <= 0.25 ? 1 : score <= 0.50 ? 2 : score <= 0.80 ? 3 : 4;
  if (kcalShare > 0.40) idx = 4;                                          // one portion > 40% of the day's kcal
  var credit = num(item.fibre) >= 5 || num(item.protein) >= 20;
  if (credit && idx > 0 && kcalShare <= 0.40) idx = score > 0.50 ? Math.max(idx - 1, 2) : idx - 1;  // never above AMBER when score > 50%
  var band = ORDER[idx];
  var driver = sf / LIMITS.satFat >= su / LIMITS.addedSugar ? Math.round(sf * 10) / 10 + "g sat fat = " + Math.round(100 * sf / LIMITS.satFat) + "% of the 20g daily limit" : Math.round(su * 10) / 10 + "g added sugar = " + Math.round(100 * su / LIMITS.addedSugar) + "% of the 25g daily limit";
  var reason = (band.indexOf("RED") === 0 ? "RED" : band) + " (" + FREQ_LABEL[band] + "): one portion is " + driver + (kcalShare > 0.40 ? "; over 40% of the day's calories" : "") + (credit && idx < 4 ? "; fibre/protein credit applied" : "");
  return { rating: band.indexOf("RED") === 0 ? "RED" : band, ragFreq: band === "RED-weekly" ? "weekly" : band === "RED-monthly" ? "monthly" : "", band: band, freqLabel: FREQ_LABEL[band], score: score, reason: reason };
}

// Apply the rule rating to an item that has nutrition values. Items without numbers keep what they have.
export function withRuleRating(item) {
  if (!item || (item.satFat == null && item.addedSugar == null && item.jcKcal == null && item.kcal == null)) return item;
  var r = rateByPortion(item);
  return Object.assign({}, item, { rating: r.rating, ragFreq: r.ragFreq, ragReason: r.reason });
}

export function bandOf(item) { return item.rating === "RED" ? (item.ragFreq === "weekly" ? "RED-weekly" : "RED-monthly") : item.rating; }

// Frequency guidance used by the slot warnings and the generator.
// GREAT/GOOD: no limit · AMBER: up to 3 a week · RED weekly treat: once a week · RED monthly treat: once a month.
export function frequencyWarning(item, countThisWeek, countPastMonth) {
  var b = bandOf(item);
  if (b === "AMBER" && countThisWeek >= 3) return "Not recommended — already 3 times this week (AMBER: a few times a week)";
  if (b === "RED-weekly" && countThisWeek >= 1) return "Not recommended — already selected this week (RED: weekly treat)";
  if (b === "RED-monthly" && countPastMonth >= 1) return "Not recommended — already selected within the past month (RED: monthly treat)";
  return null;
}
