// v2.15.2 P7 (JC, 13 Nov): an explicit medication rule on every AI request (pure, no imports, testable).
// Added once, centrally, by the fetch wrapper in api.js, so no prompt that sees health data can miss it (a superset:
// every request to the Messages API). In a block-list system prompt it goes FIRST: it is a fixed text, so Help's cached
// prefix (rule + app guide, breakpoint on the guide) is still identical on every call. The daily energy ping uses the original fetch and is not changed.
export var MEDICATION_RULE = "MEDICATION SAFETY (always applies): Never suggest starting, stopping or changing any medication or dose, including supplements taken as medicine. If medication comes up, say it is a question for their GP or pharmacist.";

// Returns the request body (a JSON string) with the rule added to the system prompt, or the body unchanged when it
// can't be parsed or already has the rule.
export function withMedicationRule(body) {
  if (typeof body !== "string" || body.indexOf("MEDICATION SAFETY (always applies)") >= 0) return body;
  var j; try { j = JSON.parse(body); } catch (e) { return body; }
  if (!j || typeof j !== "object" || !Array.isArray(j.messages)) return body;
  if (Array.isArray(j.system)) j.system = [{ type: "text", text: MEDICATION_RULE }].concat(j.system);
  else if (typeof j.system === "string" && j.system) j.system = j.system + "\n\n" + MEDICATION_RULE;
  else j.system = MEDICATION_RULE;
  return JSON.stringify(j);
}
