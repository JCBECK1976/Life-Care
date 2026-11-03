import { MOOD_LABELS } from "../constants/mood.js";
import { WELLBEING_RULES } from "../constants/tone.js";

export function getMoodContext(mood) {
  if (mood === null || mood === undefined) return "";
  var level = MOOD_LABELS[mood] || "unknown";
  if (mood === 0) return "\n\nMOOD AWARENESS: They are really struggling right now. Be the friend who sits with them, not the one who tries to fix everything. Lead with genuine warmth — 'I can see things are tough.' Gently highlight what IS going well without minimising how they feel. Do NOT celebrate, joke, or use exclamation marks. Frame any suggestions as 'when you're ready' not 'you should'. Keep it short and supportive — less is more when someone is struggling.";
  if (mood === 1) return "\n\nMOOD AWARENESS: They're not feeling great. Be empathetic and encouraging — the friend who says 'I get it, but look at this...' Acknowledge the difficulty briefly, then steer towards genuine positives in their data. Light encouragement, no pressure. Gentle practical suggestions. No heavy celebration or humour — keep warmth steady.";
  if (mood === 2) return "\n\nMOOD AWARENESS: They're feeling OK — neutral. Be warm, steady and practical. A balanced friend having a straightforward catch-up. Neither overly cautious nor overly enthusiastic. Mix genuine positives with constructive nudges naturally.";
  if (mood === 3) return "\n\nMOOD AWARENESS: They're feeling good! Match their positive energy. Be the friend who's genuinely pleased for them — 'That's brilliant, look at what you've done.' Build on their momentum with constructive next steps. Light humour is welcome. Be forward-looking and energising.";
  return "\n\nMOOD AWARENESS: They're feeling great! Be celebratory — this is the coffee catch-up where you're both buzzing. Celebrate wins enthusiastically, add humour where natural, be playful about what's next. 'You're smashing it' energy. This is the moment to set exciting stretch goals because they're in the headspace for it.";
}

export function buildExProfileInfo(prof) {
  var parts = [];
  if (prof.sex) parts.push(prof.sex);
  if (prof.age || prof.dob) parts.push((prof.dob ? String(new Date().getFullYear() - parseInt(prof.dob.split("-")[0])) : String(prof.age)));
  if (prof.height) parts.push(prof.height);
  if (prof.bodyType) parts.push(prof.bodyType);
  if (prof.fibreType) parts.push(prof.fibreType);
  if (prof.notes) parts.push(prof.notes);
  if (prof.equipment) parts.push("Equipment: " + prof.equipment);
  return parts.join(", ") || "No profile data available";
}

export function getJournalWellbeingCtx(entries, wellbeingFlags) {
  if (!entries || entries.length === 0) return "";
  var ctx = "\n\n" + WELLBEING_RULES;
  /* Analyse mood trend */
  var last7 = entries.filter(function(e) { var d = new Date(e.date); var now = new Date(); var diff = (now - d) / (1000*60*60*24); return diff <= 7; });
  var last30 = entries.filter(function(e) { var d = new Date(e.date); var now = new Date(); var diff = (now - d) / (1000*60*60*24); return diff <= 30; });
  if (last7.length > 0) {
    var lowMoods7 = last7.filter(function(e) { return e.mood !== null && e.mood !== undefined && e.mood <= 1; }).length;
    var totalMoods7 = last7.filter(function(e) { return e.mood !== null && e.mood !== undefined; }).length;
    if (totalMoods7 > 0 && lowMoods7 / totalMoods7 > 0.5) {
      ctx += "\n\nWELLBEING ALERT: Over half of the last 7 days' journal entries have low mood (Really struggling or Not great). This is a Tier 2-3 pattern. Check in on how they're doing — not just their data, but THEM.";
    }
  }
  /* Check for keyword patterns using time-windowed analysis */
  var now = new Date();
  var last14 = entries.filter(function(e) { var d = new Date(e.date); return (now - d) / (1000*60*60*24) <= 14; });
  var patterns = [];
  var tier3Patterns = [];
  var keywords = {
    headache: /headache|migraine|head\s*pain/g,
    back_pain: /back\s*pain|backache|my back/g,
    stomach: /stomach|tummy|nausea|sick|digestive|bloat/g,
    sleep: /can'?t sleep|insomnia|sleep|tired|exhausted|fatigue/g,
    anxiety: /anxi|worried|worry|nervous|panic|overwhelm/g,
    low_mood: /depress|sad|hopeless|crying|cry|worthless|empty|numb/g,
    stress: /stress|burnout|burnt out|pressure|overwork/g,
    pain: /pain|ache|sore|hurt/g
  };
  /* Tier 2: count per-entry matches in 14-day window (2-3 entries mentioning = pattern) */
  for (var kw in keywords) {
    var count14 = 0;
    last14.forEach(function(e) { var t = (e.text || "").toLowerCase(); var m = t.match(keywords[kw]); if (m && m.length > 0) count14++; });
    if (count14 >= 2 && count14 <= 3) {
      patterns.push(kw.replace(/_/g, " ") + " (" + count14 + " entries in last 14 days — Tier 2)");
    }
    /* Tier 3: count in 30-day window (4+ entries mentioning = concerned check-in) */
    if (count14 >= 4) {
      tier3Patterns.push(kw.replace(/_/g, " ") + " (" + count14 + " entries in last 14 days — Tier 3)");
    } else {
      var count30 = 0;
      last30.forEach(function(e) { var t = (e.text || "").toLowerCase(); var m = t.match(keywords[kw]); if (m && m.length > 0) count30++; });
      if (count30 >= 4) {
        tier3Patterns.push(kw.replace(/_/g, " ") + " (" + count30 + " entries in last 30 days — Tier 3)");
      }
    }
  }
  if (tier3Patterns.length > 0) {
    ctx += "\n\nTIER 3 PATTERNS DETECTED: " + tier3Patterns.join("; ") + ". This requires a concerned check-in with signposting. See WELLBEING INTELLIGENCE Tier 3.";
  }
  if (patterns.length > 0) {
    ctx += "\n\nTIER 2 PATTERNS DETECTED: " + patterns.join("; ") + ". Name the pattern gently. See WELLBEING INTELLIGENCE Tier 2.";
  }
  /* Include previous wellbeing flags for follow-up — with 90-day expiry */
  if (wellbeingFlags && Object.keys(wellbeingFlags).length > 0) {
    var flagLines = [];
    var expiredFlags = [];
    for (var fk in wellbeingFlags) {
      var fl = wellbeingFlags[fk];
      var flagAge = fl.date ? (now - new Date(fl.date)) / (1000*60*60*24) : 999;
      if (flagAge > 90) {
        expiredFlags.push(fk);
      } else {
        flagLines.push(fk + ": flagged " + (fl.date || "recently") + " (" + Math.round(flagAge) + " days ago)" + (fl.signposted ? " (signposted to " + fl.signposted + ")" : "") + (fl.followedUp ? " — followed up" : " — NOT YET followed up, please check in"));
      }
    }
    if (flagLines.length > 0) {
      ctx += "\n\nACTIVE WELLBEING FLAGS (follow up on these):\n" + flagLines.join("\n");
    }
    if (expiredFlags.length > 0) {
      ctx += "\n\nEXPIRED FLAGS (90+ days, do NOT follow up): " + expiredFlags.join(", ");
    }
  }
  return ctx;
}
