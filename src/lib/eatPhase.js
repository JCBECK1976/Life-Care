// v2.9.0 F6: Eating Feedback knows what was EATEN and what is still a PLAN.
// Days before today = eaten (what the person logged); today onwards = planned. A week entirely in the future is a
// plan review. Also the shared checks for an AI feedback reply: cut off, empty or unreadable → a clear error.
export function dayPhase(date, today) { return date < today ? "eaten" : "planned"; }
export function weekPhase(dates, today) {
  var past = dates.filter(function(d) { return d < today; }).length;
  return past === dates.length ? "eaten" : past === 0 ? "plan review" : "mixed";
}
export var PHASE_LABEL = { eaten: "What you ate", planned: "Your plan", "plan review": "Plan review", mixed: "So far this week + the rest of your plan" };

export function readFeedback(result) {
  if (result && result.stop_reason === "max_tokens") throw new Error("Feedback was cut off before it finished — please press the button again");
  var text = ((result && result.content) || []).map(function(b) { return b.text || ""; }).join("");
  if (!text) throw new Error((result && result.error && result.error.message) || "No feedback came back — please press the button again");
  var m = text.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
  try { return JSON.parse(m ? m[0] : text); } catch (e) { throw new Error("The feedback came back in a form I couldn't read — please press the button again"); }
}
