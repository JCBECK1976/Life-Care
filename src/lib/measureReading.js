// v2.13.0 F10: prompt and parser for reading a body measurement from a photo (pure, no imports, testable).
export function readingPrompt(o) {
  return "This photo shows a body measurement for \"" + o.label + "\" (unit: " + o.unit + "), e.g. a tape measure around the body or a scale/app screen. " +
    (o.desc ? "The person says: \"" + o.desc + "\". " : "") +
    (o.previous != null ? "Their previous " + o.label + " was " + o.previous + " " + o.unit + " (for context only; do NOT copy it). " : "") +
    (o.deep ? "DEEP DIVE: this is an independent second look. Ignore any earlier answer, look closely at the markings or digits, and say exactly where you read the value. " : "") +
    "Read the value in " + o.unit + " (convert from inches if the tape shows inches). If the photo shows no measurement you can read (no tape or scale, blurred, cut off), set \"readable\": false and value to null and say why; otherwise set \"readable\": true. " +
    "Also check the photo shows the right body part for \"" + o.label + "\" (or a scale/app screen showing it): set \"matchesPart\": false and \"seenPart\" to the body part you see if it shows a different body part (e.g. a calf when the measurement is bicep), otherwise \"matchesPart\": true. " +
    "Return ONLY JSON: {\"readable\":true/false,\"matchesPart\":true/false,\"seenPart\":\"body part seen\",\"value\":number|null,\"unit\":\"" + o.unit + "\",\"reading\":\"one short sentence on where you read it\",\"confidence\":\"high|medium|low\"}";
}
export function parseReading(text) {
  var m = String(text || "").replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
  if (!m) throw new Error("The reading came back in a form I couldn't read — try again");
  var r; try { r = JSON.parse(m[0]); } catch (e) { throw new Error("The reading came back in a form I couldn't read — try again"); }
  var wrongPart = r.matchesPart === false || r.matchesPart === "false";   // v2.14.2: a different body part
  var v = r.value == null || wrongPart || r.readable === false || r.readable === "false" ? null : parseFloat(r.value);   // v2.14.1: explicit readable flag
  return { wrongPart: wrongPart, seenPart: wrongPart ? String(r.seenPart || "a different body part").slice(0, 40) : "", value: v != null && !isNaN(v) && v > 0 ? Math.round(v * 10) / 10 : null, reading: String(r.reading || "").slice(0, 200), confidence: String(r.confidence || "") };
}

export var UNREADABLE_MSG = "No readable measurement in this photo — try another photo, or add a description and Re-check";
// v2.14.2: "This photo looks like a calf, not Bicep — please retake it"
export function wrongPartMsg(seen, label) { return "This photo looks like " + (/^(a|an|the) /i.test(seen) ? seen : (/^[aeiou]/i.test(seen) ? "an " : "a ") + seen) + ", not " + label + " — please retake it"; }
